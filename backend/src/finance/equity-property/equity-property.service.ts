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
      acc[p.key] = p.value.toString();
      return acc;
    }, {} as Record<string, string>);
  }

  async setProperties(year: number, properties: Record<string, string>) {
    const updates = Object.entries(properties).map(([key, value]) => {
      return this.prisma.equityProperty.upsert({
        where: {
          year_key: { year, key }
        },
        update: { value: new Prisma.Decimal(value) },
        create: {
          year,
          key,
          value: new Prisma.Decimal(value)
        }
      });
    });

    await Promise.all(updates);
    return { success: true };
  }
}
