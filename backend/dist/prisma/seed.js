"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding started...');
    const adminRole = await prisma.role.upsert({
        where: { slug: 'admin' },
        update: {},
        create: {
            name: 'Administrator',
            slug: 'admin',
            description: 'System Administrator with full access',
        },
    });
    console.log('✅ Admin role created/synced.');
    const permissions = [
        { name: 'Dashboard View', route: 'dashboard.view' },
        { name: 'User Management', route: 'users.index' },
        { name: 'View Customers', route: 'customers.index' },
        { name: 'Create Customer', route: 'customers.create' },
        { name: 'Show Customer Details', route: 'customers.show' },
        { name: 'Update Customer', route: 'customers.update' },
        { name: 'Delete Customer', route: 'customers.delete' },
        { name: 'View Suppliers', route: 'suppliers.index' },
        { name: 'Create Supplier', route: 'suppliers.create' },
        { name: 'Show Supplier Details', route: 'suppliers.show' },
        { name: 'Update Supplier', route: 'suppliers.update' },
        { name: 'Delete Supplier', route: 'suppliers.delete' },
        { name: 'View Products', route: 'products.index' },
        { name: 'Create Product', route: 'products.create' },
        { name: 'Show Product Details', route: 'products.show' },
        { name: 'Update Product', route: 'products.update' },
        { name: 'Delete Product', route: 'products.delete' },
        { name: 'View Product Categories', route: 'product-categories.index' },
        { name: 'Create Product Category', route: 'product-categories.create' },
        { name: 'View Banks', route: 'banks.index' },
        { name: 'Create Bank Reference', route: 'banks.create' },
        { name: 'View Internal Accounts', route: 'internal-accounts.index' },
        { name: 'Create Internal Account', route: 'internal-accounts.create' },
        { name: 'Update Internal Account', route: 'internal-accounts.update' },
        { name: 'Delete Internal Account', route: 'internal-accounts.delete' },
    ];
    for (const p of permissions) {
        const perm = await prisma.permission.upsert({
            where: { route: p.route },
            update: {},
            create: {
                route: p.route,
                description: p.name,
            },
        });
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: perm.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: perm.id,
            },
        });
    }
    console.log('✅ Permissions assigned to Admin role.');
    const password = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@pcmi.com' },
        update: {
            password: password,
        },
        create: {
            name: 'Super Admin',
            email: 'admin@pcmi.com',
            password: password,
            roleId: adminRole.id,
            status: 'Active',
        },
    });
    console.log('✅ Super Admin user created/synced.');
    const customers = [
        {
            code: 'CST-20260413-SOLUS',
            name: 'PT. Solusi Maju Utama',
            bankName: 'BCA',
            bankAccountNumber: '1234567890',
            bankAccountName: 'PT SOLUSI MAJU UTAMA',
            status: 'Active',
            notes: 'High priority client for project delta.',
        },
        {
            code: 'CST-20260413-KARYA',
            name: 'CV. Karya Mandiri Sejahtera',
            bankName: 'Mandiri',
            bankAccountNumber: '0987654321',
            bankAccountName: 'KARYA MANDIRI SEJAHTERA',
            status: 'Active',
            notes: 'Regular maintenance client.',
        },
    ];
    for (const c of customers) {
        await prisma.customer.upsert({
            where: { code: c.code },
            update: {},
            create: c,
        });
    }
    console.log('✅ Sample customers seeded.');
    const legacySuppliers = [
        { name: 'PT Maju Teknologi', address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan, DKI Jakarta 12930', contactPerson: 'Budi Santoso', phone: '021-5550123', email: 'budi@majuteknologi.com', taxNumber: '01.234.567.8-123.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '1234567890', bankAccountName: 'PT Maju Teknologi', notes: 'Supplier utama untuk perangkat IT dan software' },
        { name: 'CV Sukses Mandiri', address: 'Jl. Sudirman No. 456, Jakarta Pusat, DKI Jakarta 12190', contactPerson: 'Siti Aminah', phone: '021-5550456', email: 'siti@suksesmandiri.co.id', taxNumber: '02.345.678.9-234.000', bankName: 'Bank Mandiri', bankAccountNumber: '0987654321', bankAccountName: 'CV Sukses Mandiri', notes: 'Supplier untuk jasa konsultasi dan training' },
        { name: 'PT Global Solutions', address: 'Jl. Thamrin No. 789, Jakarta Pusat, DKI Jakarta 10350', contactPerson: 'Ahmad Rizki', phone: '021-5550789', email: 'ahmad@globalsolutions.com', taxNumber: '03.456.789.0-345.000', bankName: 'Bank Negara Indonesia (BNI)', bankAccountNumber: '1122334455', bankAccountName: 'PT Global Solutions', notes: 'Supplier untuk solusi enterprise dan cloud services' },
        { name: 'UD Makmur Jaya', address: 'Jl. Hayam Wuruk No. 321, Jakarta Barat, DKI Jakarta 11160', contactPerson: 'Dewi Sartika', phone: '021-5550112', email: 'dewi@makmurjaya.com', taxNumber: '04.567.890.1-456.000', bankName: 'Bank Rakyat Indonesia (BRI)', bankAccountNumber: '5544332211', bankAccountName: 'UD Makmur Jaya', notes: 'Supplier untuk perangkat keras dan komponen elektronik' },
        { name: 'PT Sejahtera Abadi', address: 'Jl. Asia Afrika No. 654, Bandung, Jawa Barat 40262', contactPerson: 'Rudi Hermawan', phone: '022-5550234', email: 'rudi@sejahteraabadi.co.id', taxNumber: '05.678.901.2-567.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '6677889900', bankAccountName: 'PT Sejahtera Abadi', notes: 'Supplier untuk furniture dan peralatan kantor' },
        { name: 'PT Dinamis Kreatif', address: 'Jl. Pemuda No. 147, Semarang, Jawa Tengah 50132', contactPerson: 'Eko Prasetyo', phone: '024-5550178', email: 'eko@dinamiskreatif.com', taxNumber: '07.890.123.4-789.000', bankName: 'Bank Negara Indonesia (BNI)', bankAccountNumber: '8899001122', bankAccountName: 'PT Dinamis Kreatif', notes: 'Supplier untuk jasa kreatif dan digital marketing' },
        { name: 'PT Inovasi Digital', address: 'Jl. Sudirman No. 258, Medan, Sumatera Utara 20112', contactPerson: 'Maya Sari', phone: '061-5550258', email: 'maya@inovasidigital.com', taxNumber: '08.901.234.5-890.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '9900112233', bankAccountName: 'PT Inovasi Digital', notes: 'Supplier untuk layanan digital dan e-commerce' },
    ];
    for (const s of legacySuppliers) {
        const code = `SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${s.name.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        await prisma.supplier.upsert({
            where: { code },
            update: {},
            create: {
                ...s,
                code,
                status: 'Active'
            },
        });
    }
    console.log('✅ Legacy suppliers seeded.');
    const legacyCategories = [
        { name: 'Electronics', description: 'Devices and gadgets including phones, computers, and accessories.' },
        { name: 'Clothing & Apparel', description: 'Fashion items such as shirts, pants, shoes, and accessories.' },
        { name: 'Home & Garden', description: 'Furniture, décor, tools, and other household essentials.' },
        { name: 'Sports & Outdoors', description: 'Equipment and gear for sports, fitness, and outdoor activities.' },
        { name: 'Books & Media', description: 'Printed and digital books, magazines, and entertainment media.' },
        { name: 'Health & Beauty', description: 'Cosmetics, personal care, and wellness-related products.' },
        { name: 'Automotive', description: 'Car parts, accessories, and maintenance tools.' },
        { name: 'Food & Beverages', description: 'Groceries, snacks, and drinks including specialty foods.' },
        { name: 'Toys & Games', description: 'Products for kids and adults including puzzles, toys, and board games.' },
        { name: 'Office Supplies', description: 'Stationery, paper, and general office equipment.' },
    ];
    for (const cat of legacyCategories) {
        const category = await prisma.productCategory.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
        if (cat.name === 'Electronics') {
            const electronicProducts = [
                { code: 'PRD-S24', name: 'Samsung Galaxy S24', unit: 'Pcs', description: 'Latest flagship smartphone' },
                { code: 'PRD-MBP14', name: 'MacBook Pro 14"', unit: 'Pcs', description: 'Professional laptop M3' },
            ];
            for (const p of electronicProducts) {
                await prisma.product.upsert({
                    where: { code: p.code },
                    update: {},
                    create: { ...p, categoryId: category.id },
                });
            }
        }
    }
    console.log('✅ Legacy categories and products seeded.');
    const banksCsvPath = path.join(__dirname, 'seed-data', 'banks.csv');
    const bankIds = {};
    if (fs.existsSync(banksCsvPath)) {
        const csvContent = fs.readFileSync(banksCsvPath, 'utf8');
        const lines = csvContent.split('\n');
        const header = lines[0].split(';');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const columns = line.split(';');
            if (columns.length !== header.length)
                continue;
            const data = {};
            header.forEach((h, index) => {
                data[h.trim()] = columns[index].trim();
            });
            let bankCode = (data.bank_code || '').replace(/\D/g, '');
            if (!bankCode)
                continue;
            bankCode = bankCode.padStart(3, '0');
            const bank = await prisma.bank.upsert({
                where: { bankCode },
                update: {
                    bankName: data.bank_name || null,
                    bankAddress: data.bank_address || null,
                    bankBrand: data.bank_brand || null,
                },
                create: {
                    bankCode,
                    bankName: data.bank_name || null,
                    bankAddress: data.bank_address || null,
                    bankBrand: data.bank_brand || null,
                },
            });
            if (data.bank_brand) {
                bankIds[data.bank_brand] = bank.id;
            }
        }
        console.log(`✅ ${lines.length - 1} banks from CSV seeded.`);
    }
    else {
        console.warn('⚠️ Banks CSV not found, skipping bank master seeding.');
    }
    const legacyAccounts = [
        { bankId: bankIds['BCA'], accountNo: '5750 489 666', branch: 'Sahardjo', holderName: 'RD Hidianitje', type: 'Bank' },
        { bankId: bankIds['MANDIRI'], accountNo: '122 000 487 5566', branch: 'Mid Plaza', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
        { bankId: bankIds['BCA'], accountNo: '5350 285 999', branch: 'Juanda', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
        { bankId: bankIds['BRI'], accountNo: '1125 0100 0255 301', branch: 'Sahardjo', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
        { bankId: bankIds['BTN'], accountNo: '0000 1013 0001 2935', branch: 'Kuningan', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
        { bankId: bankIds['NEO COMM'], accountNo: '0010 0100 1907 409', branch: 'GatSu', holderName: 'PT Pan Convince Mitra International', type: 'Bank' },
    ];
    for (const acc of legacyAccounts) {
        if (!acc.bankId)
            continue;
        await prisma.internalAccount.upsert({
            where: { id: BigInt(legacyAccounts.indexOf(acc) + 1) },
            update: {
                ...acc,
                bankId: acc.bankId
            },
            create: acc,
        });
    }
    console.log('✅ Legacy internal accounts seeded.');
    console.log('🚀 Seeding completed successfully.');
}
main()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map