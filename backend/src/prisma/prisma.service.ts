import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AuditedPool } from '../common/audit/audited-pool';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // AuditedPool menitipkan user yang login ke setiap koneksi, untuk trigger
    // activity log. application_name membedakan tulisan aplikasi (source APP)
    // dari SQL yang dijalankan di luar aplikasi (source SQL).
    const pool = new AuditedPool({
      connectionString: process.env.DATABASE_URL,
      application_name: 'cms-backend',
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
