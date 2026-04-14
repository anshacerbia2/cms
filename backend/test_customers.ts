import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    console.log('Testing CustomersService.findAll logic...');
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            billingOptions: true,
            pics: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Success! Found:', customers.length, 'customers');
    console.log('Sample Data (JSON):', JSON.stringify(customers, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (error) {
    console.error('--- ERROR DETECTED ---');
    console.error(error);
    console.error('----------------------');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
