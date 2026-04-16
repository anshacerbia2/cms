import { PrismaClient } from '@prisma/client';

export async function seedProducts(prisma: PrismaClient) {
  console.log('📦 Seeding categories & products...');
  
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
  
  console.log('✅ Products seeding completed.');
}
