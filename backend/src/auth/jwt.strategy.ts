import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService, type SessionPayload } from './session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private session: SessionService,
  ) {
    super({
      // Token hanya dari cookie sesi HttpOnly (lihat SessionService); header
      // Authorization tidak lagi diterima.
      jwtFromRequest: (req: Request) => session.readToken(req),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Role and permissions are read from the database on every request rather than
   * trusted from the token. A token stays valid for its full lifetime, so taking
   * the claims at face value meant a revoked permission — or a deactivated
   * account — kept working until the token expired.
   */
  async validate(req: Request, payload: SessionPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is no longer active.');
    }
    // Logout dan ganti password menaikkan token_version: token yang dibuat
    // sebelumnya - termasuk yang tertinggal di browser lain atau dicuri - mati
    // di sini.
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }
    if (this.session.isPastMaxAge(payload)) {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }

    // Masih dipakai: geser umur sesinya.
    this.session.renewIfDue(req, req.res, payload, user);

    return {
      userId: user.id.toString(),
      email: user.email,
      role: user.role?.slug,
      permissions: (user.role?.permissions ?? []).map((rp) => rp.permission.route),
    };
  }
}
