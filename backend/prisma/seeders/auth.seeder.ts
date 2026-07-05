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

  const financeRole = await prisma.role.upsert({
    where: { slug: 'finance_manager' },
    update: {},
    create: {
      name: 'Finance Manager',
      slug: 'finance_manager',
      description: 'Access to financial ledger and reports only',
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
    { name: 'Show Internal Account', route: 'internal-accounts.show' },
    // Finance Module Permissions
    { name: 'View Financial Reports', route: 'finance.reports' },
    { name: 'Create Financial Transactions', route: 'finance.create' },
    { name: 'View Anchor Balance', route: 'finance.anchor' },
    { name: 'Recalculate Balance', route: 'finance.recalculate' },
    { name: 'Close Fiscal Year', route: 'finance.year.close' },
    { name: 'View Account Payable', route: 'account-payable.index' },
    { name: 'Create Account Payable', route: 'account-payable.create' },
    { name: 'Update Account Payable', route: 'account-payable.update' },
    { name: 'Delete Account Payable', route: 'account-payable.delete' },
    { name: 'Bulk Create Account Payable', route: 'account-payable.bulk' },
    { name: 'View PPN In/out', route: 'ppn-in-out.index' },
    { name: 'View Inter Account', route: 'inter-account.index' },
    { name: 'View Account Receivable', route: 'account-receivable.index' },
    { name: 'Create Account Receivable', route: 'account-receivable.create' },
    { name: 'Update Account Receivable', route: 'account-receivable.update' },
    { name: 'Delete Account Receivable', route: 'account-receivable.delete' },
    { name: 'Bulk Create Account Receivable', route: 'account-receivable.bulk' },
    { name: 'View Depreciation', route: 'depreciation.index' },
    { name: 'Create Depreciation', route: 'depreciation.create' },
    { name: 'Bulk Create Depreciation', route: 'depreciation.bulk' },
    { name: 'View Bank Mutation', route: 'bank-mutation.index' },
    { name: 'Create Bank Mutation', route: 'bank-mutation.create' },
    { name: 'Edit Bank Mutation', route: 'bank-mutation.edit' },
    { name: 'Delete Bank Mutation', route: 'bank-mutation.delete' },
    { name: 'Bulk Create Bank Mutation', route: 'bank-mutation.bulk' },
    // Sales Module Permissions
    { name: 'View Sales', route: 'sales.index' },
    { name: 'Create Sales', route: 'sales.create' },
    { name: 'Update Sales', route: 'sales.update' },
    { name: 'Delete Sales', route: 'sales.delete' },
    { name: 'Update PPN In/out', route: 'ppn-in-out.update' },
    { name: 'Delete PPN In/out', route: 'ppn-in-out.delete' },
    { name: 'Update Inter Account', route: 'inter-account.update' },
    { name: 'Delete Inter Account', route: 'inter-account.delete' },
    { name: 'Update Depreciation', route: 'depreciation.update' },
    { name: 'Delete Depreciation', route: 'depreciation.delete' },
  ];

  // List of permissions for finance manager
  const financeManagerPermissions = [
    'dashboard.view',
    'banks.index',
    'internal-accounts.index',
    'internal-accounts.update',
    'internal-accounts.delete',
    'internal-accounts.show',
    'finance.reports',
    'finance.anchor',
    'finance.recalculate',
    'finance.year.close',
    'account-payable.index',
    'ppn-in-out.index',
    'inter-account.index',
    'account-receivable.index',
    'depreciation.index',
    'bank-mutation.index',
    'sales.index',
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

    // Assign to Admin
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

    // Assign to Finance Manager if in the list
    if (financeManagerPermissions.includes(p.route)) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: financeRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: financeRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 3. Create Menus (clean slate)
  console.log('📂 Seeding menus...');
  await prisma.roleMenu.deleteMany();
  await prisma.menu.deleteMany();

  const menuGroups = [
    { id: 100, name: 'Overview', icon: 'LayoutDashboard', order: 1, forFinance: true, items: [
      { id: 1001, name: 'Dashboard', icon: 'LayoutDashboard', route: 'dashboard.view', order: 1, forFinance: true },
    ]},
    { id: 200, name: 'Master Data', icon: 'Database', order: 2, forFinance: false, items: [
      { id: 2001, name: 'Customers', icon: 'Users', route: 'customers.index', order: 1, forFinance: false },
      { id: 2002, name: 'Suppliers', icon: 'Truck', route: 'suppliers.index', order: 2, forFinance: false },
      { id: 2003, name: 'Products', icon: 'Package', route: 'products.index', order: 3, forFinance: false },
      { id: 2004, name: 'Staff', icon: 'UserCog', route: 'users.index', order: 4, forFinance: false },
    ]},
    { id: 300, name: 'Transactions', icon: 'ClipboardList', order: 3, forFinance: false, items: [
      { id: 3001, name: 'Invoices', icon: 'FileText', route: 'finance.index', order: 1, forFinance: false },
      { id: 3002, name: 'Receive Vouchers', icon: 'CreditCard', route: 'finance.index', order: 2, forFinance: false },
      { id: 3003, name: 'Payment Vouchers', icon: 'Wallet', route: 'finance.index', order: 3, forFinance: false },
    ]},
    { id: 400, name: 'Finance', icon: 'Landmark', order: 4, forFinance: true, items: [
      { id: 4001, name: 'Accounts & Banks', icon: 'Landmark', route: 'internal-accounts.index', order: 1, forFinance: true },
      { id: 4002, name: 'Bank Mutation', icon: 'RefreshCw', route: 'bank-mutation.index', order: 2, forFinance: true },
      { id: 4003, name: 'Account Payable', icon: 'ArrowUpRight', route: 'account-payable.index', order: 3, forFinance: true },
      { id: 4004, name: 'Account Receivable', icon: 'ArrowDownRight', route: 'account-receivable.index', order: 4, forFinance: true },
      { id: 4005, name: 'PPN In/out', icon: 'ArrowDownUp', route: 'ppn-in-out.index', order: 5, forFinance: true },
      { id: 4006, name: 'Inter Account', icon: 'ArrowLeftRight', route: 'inter-account.index', order: 6, forFinance: true },
      { id: 4007, name: 'Depreciation', icon: 'Calculator', route: 'depreciation.index', order: 7, forFinance: true },
      { id: 4008, name: 'Sales', icon: 'DollarSign', route: 'sales.index', order: 8, forFinance: true },
      { id: 4009, name: 'Financial Reports', icon: 'FileText', route: 'finance.reports', order: 9, forFinance: true },
    ]},
    { id: 500, name: 'Operations', icon: 'Briefcase', order: 5, forFinance: false, items: [
      { id: 5001, name: 'Projects', icon: 'Briefcase', route: 'finance.index', order: 1, forFinance: false },
    ]},
  ];

  for (const group of menuGroups) {
    // Create parent menu
    const parentMenu = await prisma.menu.create({
      data: {
        id: BigInt(group.id),
        name: group.name,
        icon: group.icon,
        orderIndex: group.order,
        isVisible: true,
      }
    });

    // Assign parent to Admin
    await prisma.roleMenu.create({
      data: { roleId: adminRole.id, menuId: parentMenu.id }
    });

    // Assign parent to Finance Manager if applicable
    if (group.forFinance) {
      await prisma.roleMenu.create({
        data: { roleId: financeRole.id, menuId: parentMenu.id }
      });
    }

    for (const item of group.items) {
      const permission = await prisma.permission.findUnique({ where: { route: item.route } });
      
      const childMenu = await prisma.menu.create({
        data: {
          id: BigInt(item.id),
          name: item.name,
          icon: item.icon,
          orderIndex: item.order,
          parentId: parentMenu.id,
          permissionId: permission?.id,
          isVisible: true,
        }
      });

      // Assign child to Admin
      await prisma.roleMenu.create({
        data: { roleId: adminRole.id, menuId: childMenu.id }
      });

      // Assign child to Finance Manager if applicable
      if (item.forFinance) {
        await prisma.roleMenu.create({
          data: { roleId: financeRole.id, menuId: childMenu.id }
        });
      }
    }
  }

  // 4. Create Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Superadmin
  await prisma.user.upsert({
    where: { email: 'admin@pcmi.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Super Admin',
      email: 'admin@pcmi.com',
      password: hashedPassword,
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
  });

  // Director / Finance Manager
  await prisma.user.upsert({
    where: { email: 'dir@pcmi.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Director',
      email: 'dir@pcmi.com',
      password: hashedPassword,
      roleId: financeRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Auth seeding completed.');
  return { adminRole, financeRole };
}
