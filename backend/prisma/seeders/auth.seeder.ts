import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedAuth(prisma: PrismaClient) {
  console.log('🔐 Seeding roles & permissions...');
  
  // 1. Create Roles
  const adminRole = await prisma.role.upsert({
    where: { slug: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      slug: 'admin',
      description: 'System Administrator with full access',
    },
  });

  // 2. Create Permissions
  const permissions = [
    { name: 'Dashboard View', route: 'dashboard.view' },
    { name: 'User Management', route: 'users.index' },
    // Customers Module Permissions
    { name: 'View Customers', route: 'customers.index' },
    { name: 'Create Customer', route: 'customers.create' },
    { name: 'Show Customer Details', route: 'customers.show' },
    { name: 'Update Customer', route: 'customers.update' },
    { name: 'Delete Customer', route: 'customers.delete' },
    // Suppliers Module Permissions
    { name: 'View Suppliers', route: 'suppliers.index' },
    { name: 'Create Supplier', route: 'suppliers.create' },
    { name: 'Show Supplier Details', route: 'suppliers.show' },
    { name: 'Update Supplier', route: 'suppliers.update' },
    { name: 'Delete Supplier', route: 'suppliers.delete' },
    // Products Module Permissions
    { name: 'View Products', route: 'products.index' },
    { name: 'Create Product', route: 'products.create' },
    { name: 'Show Product Details', route: 'products.show' },
    { name: 'Update Product', route: 'products.update' },
    { name: 'Delete Product', route: 'products.delete' },
    { name: 'View Product Categories', route: 'product-categories.index' },
    { name: 'Create Product Category', route: 'product-categories.create' },
    // Banks Module Permissions
    { name: 'View Banks', route: 'banks.index' },
    { name: 'Create Bank Reference', route: 'banks.create' },
    { name: 'View Internal Accounts', route: 'internal-accounts.index' },
    { name: 'Create Internal Account', route: 'internal-accounts.create' },
    { name: 'Update Internal Account', route: 'internal-accounts.update' },
    { name: 'Delete Internal Account', route: 'internal-accounts.delete' },
    // Finance Module Permissions
    { name: 'View Financial Reports', route: 'finance.index' },
    { name: 'Create Financial Transactions', route: 'finance.create' },
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

  // 3. Create Superadmin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@pcmi.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@pcmi.com',
      password: hashedPassword,
      roleId: adminRole.id,
      status: 'Active',
    },
  });

  console.log('✅ Auth seeding completed.');
  return { adminRole };
}
