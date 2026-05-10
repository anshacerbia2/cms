const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.financialTransaction.findMany({ 
  where: { colF: { contains: 'retained', mode: 'insensitive' } } 
}).then(res => console.log(JSON.stringify(res, null, 2)))
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
