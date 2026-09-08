import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Role and permissions are read from the database on every request rather than
   * trusted from the token. A token stays valid for its full lifetime, so taking
   * the claims at face value meant a revoked permission — or a deactivated
   * account — kept working until the token expired.
   */
  async validate(payload: any) {
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

    return {
      userId: user.id.toString(),
      email: user.email,
      role: user.role?.slug,
      permissions: (user.role?.permissions ?? []).map((rp) => rp.permission.route),
    };
  }
}
