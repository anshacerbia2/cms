import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquityPropertyService {
  constructor(private prisma: PrismaService) {}

  async getProperties(year: number) {
    const props = await this.prisma.equityProperty.findMany({
      where: { year }
    });

    // Convert to a convenient object mapping
    return props.reduce((acc, p) => {
      acc[p.key] = p.value !== null ? p.value.toString() : null;
      return acc;
    }, {} as Record<string, string | null>);
  }

  async setProperties(year: number, properties: Record<string, string | null>) {
    const updates = Object.entries(properties).map(([key, value]) => {
      const val = value === null ? null : new Prisma.Decimal(value);
      return this.prisma.equityProperty.upsert({
        where: {
          year_key: { year, key }
        },
        update: { value: val },
        create: {
          year,
          key,
          value: val
        }
      });
    });

    await Promise.all(updates);
    return { success: true };
  }
}
