import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../notification-channels/notification-secret';
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
 * Alurnya:
 *   1. POST /auth/login dengan password yang benar tidak langsung memberi sesi.
 *      Server menjawab `twoFactor: 'verify'` (sudah terdaftar) atau
 *      `twoFactor: 'setup'` (belum; ikut QR code untuk discan), plus
 *      `challenge` yang berlaku 5 menit.
 *   2. POST /auth/login/verify atau /auth/login/setup dengan challenge dan
 *      kode 6 digit. Baru di sini cookie sesi dipasang.
 *
 * Kode yang salah dihitung sebagai login gagal (10 kali = akun terkunci 15
 * menit, ada alert), dan kode yang sudah dipakai tidak bisa dipakai lagi.
 *
 * Kunci rahasianya disimpan terenkripsi dengan NOTIFICATION_SECRET_KEY, kunci
 * yang sama dengan kredensial channel notifikasi.
 *
 * TWO_FACTOR_REQUIRED=0 mematikan kewajiban mendaftar (dev lokal, tes e2e);
 * akun yang sudah mendaftar tetap diminta kodenya.
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
    this.required = !['0', 'false', 'off'].includes(String(config.get('TWO_FACTOR_REQUIRED', '1')).toLowerCase());
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
    const { secret } = decryptSecret<{ secret: string }>(user.twoFactorSecret);
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
        twoFactorSecret: encryptSecret({ secret }),
        twoFactorEnabledAt: new Date(),
        twoFactorLastStep: step,
      },
    });
    return true;
  }

  /** Admin menghapus pendaftaran (HP hilang/ganti): login berikutnya diminta mendaftar ulang. */
  async reset(userId: bigint) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null },
    });
  }
}
