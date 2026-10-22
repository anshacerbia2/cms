import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, MissingSecretKeyError } from '../notification-channels/notification-secret';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';

/** Nama yang tampil di aplikasi authenticator. */
const ISSUER = 'PCMI Admin';
/** Waktu untuk memasukkan kode sesudah password diterima. */
const CHALLENGE_SECONDS = 5 * 60;

export type ChallengePurpose = 'verify' | 'setup';

/** Token antara langkah password dan langkah kode. Bukan sesi: tidak membuka API apa pun. */
export type LoginChallenge = {
  sub: string;
  email: string;
  /** Versi token akun saat password diterima; logout/ganti password di tengah jalan membatalkannya. */
  tv: number;
  purpose: ChallengePurpose;
  /** Kunci rahasia yang sedang didaftarkan (hanya untuk 'setup'). Sudah ditampilkan ke user lewat QR. */
  secret?: string;
};

type ChallengeUser = { id: bigint | string; email: string; tokenVersion?: number | null };

/**
 * Verifikasi dua langkah dengan Google Authenticator (TOTP) - insiden 19 Okt
 * 2026: password finance@ bocor dan dipakai dari luar.
 *
 * Pilihan tiap user: diaktifkan sendiri dari menu profil (Two-Factor
 * Sign-In), lewat /auth/two-factor/*. Untuk akun yang mengaktifkannya:
 *   1. POST /auth/login dengan password yang benar tidak langsung memberi sesi.
 *      Server menjawab `twoFactor: 'verify'` plus `challenge` yang berlaku
 *      5 menit.
 *   2. POST /auth/login/verify dengan challenge dan kode 6 digit. Baru di sini
 *      cookie sesi dipasang.
 *
 * Kode yang salah dihitung sebagai login gagal (10 kali = akun terkunci 15
 * menit, ada alert), dan kode yang sudah dipakai tidak bisa dipakai lagi.
 *
 * Kunci rahasianya disimpan terenkripsi dengan TWO_FACTOR_SECRET_KEY di .env -
 * kunci sendiri, terpisah dari kunci channel notifikasi. Tanpa kunci itu 2FA
 * tidak bisa dinyalakan, dan akun yang sudah menyalakannya tidak bisa login.
 *
 * TWO_FACTOR_REQUIRED=1 mewajibkannya untuk semua akun: yang belum mendaftar
 * dijawab `twoFactor: 'setup'` (ikut QR code) dan mendaftar lewat
 * /auth/login/setup sebelum mendapat sesi. Bawaannya tidak wajib.
 */
@Injectable()
export class TwoFactorService {
  private readonly challengeSecret: string;
  readonly required: boolean;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    config: ConfigService,
  ) {
    // Kunci terpisah dari token sesi: challenge tidak akan pernah lolos sebagai sesi.
    this.challengeSecret = `${config.getOrThrow<string>('JWT_SECRET')}:login-challenge`;
    this.required = ['1', 'true', 'on'].includes(String(config.get('TWO_FACTOR_REQUIRED', '0')).toLowerCase());
  }

  isEnabled(user: { twoFactorEnabledAt?: Date | null; twoFactorSecret?: string | null }) {
    return !!(user.twoFactorEnabledAt && user.twoFactorSecret);
  }

  issueChallenge(user: ChallengeUser, purpose: ChallengePurpose, secret?: string): string {
    const payload: LoginChallenge = {
      sub: user.id.toString(),
      email: user.email,
      tv: user.tokenVersion ?? 0,
      purpose,
      ...(secret ? { secret } : {}),
    };
    return this.jwt.sign(payload, { secret: this.challengeSecret, expiresIn: CHALLENGE_SECONDS });
  }

  readChallenge(token: string, purpose: ChallengePurpose): LoginChallenge {
    try {
      const payload = this.jwt.verify<LoginChallenge>(token, { secret: this.challengeSecret });
      if (payload.purpose === purpose) return payload;
    } catch {
      // Kedaluwarsa atau rusak - jawabannya sama.
    }
    throw new UnauthorizedException('This sign-in step has expired. Please sign in again.');
  }

  /** Kunci baru untuk didaftarkan, lengkap dengan QR code-nya (SVG data URL). */
  async newEnrollment(email: string) {
    // Gagal di sini, sebelum user menscan QR yang tidak akan bisa disimpan.
    this.seal('check');
    const secret = generateTotpSecret();
    const url = otpauthUrl(ISSUER, email, secret);
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    return {
      secret,
      qrCode: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    };
  }

  /** Kode login untuk akun yang sudah mendaftar. Kode yang diterima dicatat supaya tidak bisa dipakai ulang. */
  async verifyLogin(userId: bigint, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorLastStep: true },
    });
    if (!user?.twoFactorSecret) return false;
    const { secret } = this.unseal(user.twoFactorSecret);
    const step = verifyTotp(secret, code, user.twoFactorLastStep);
    if (step == null) return false;
    // Atomik: dua request dengan kode yang sama pada saat bersamaan - hanya satu yang lolos.
    // Lewat SQL supaya updated_at tidak ikut berubah di setiap login.
    const updated = await this.prisma.$executeRaw`
      UPDATE "users" SET "two_factor_last_step" = ${step}
       WHERE "id" = ${userId}
         AND ("two_factor_last_step" IS NULL OR "two_factor_last_step" < ${step})`;
    return updated === 1;
  }

  /** Mendaftarkan kunci dari langkah 'setup' kalau kodenya cocok. */
  async enable(userId: bigint, secret: string, code: string): Promise<boolean> {
    const step = verifyTotp(secret, code);
    if (step == null) return false;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.seal(secret),
        twoFactorEnabledAt: new Date(),
        twoFactorLastStep: step,
      },
    });
    return true;
  }

  /** Mematikan 2FA: oleh user sendiri, atau oleh admin kalau HP-nya hilang/ganti. */
  async reset(userId: bigint) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null },
    });
  }

  private seal(secret: string): string {
    try {
      return encryptSecret({ secret }, 'TWO_FACTOR_SECRET_KEY');
    } catch (err) {
      throw this.unavailable(err);
    }
  }

  private unseal(stored: string): { secret: string } {
    try {
      return decryptSecret<{ secret: string }>(stored, 'TWO_FACTOR_SECRET_KEY');
    } catch (err) {
      throw this.unavailable(err);
    }
  }

  /** Kunci di .env hilang/salah: jelaskan ke user, catat penyebabnya di log lewat filter. */
  private unavailable(err: unknown) {
    if (err instanceof MissingSecretKeyError) {
      return new ServiceUnavailableException('Two-factor sign-in is not available right now. Contact your administrator.', {
        cause: err,
      });
    }
    return err;
  }
}
