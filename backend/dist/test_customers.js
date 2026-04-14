"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
        console.log('Sample Data (JSON):', JSON.stringify(customers, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    }
    catch (error) {
        console.error('--- ERROR DETECTED ---');
        console.error(error);
        console.error('----------------------');
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
test();
//# sourceMappingURL=test_customers.js.map