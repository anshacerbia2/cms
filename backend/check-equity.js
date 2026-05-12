const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const props = await prisma.equityProperty.findMany({
    where: { key: 'SHARED_CAPITAL' }
  });
  console.log('--- SHARED_CAPITAL VALUES ---');
  props.forEach(p => {
    console.log(`Year: ${p.year}, Value: ${p.value.toString()}`);
  });
  
  const re = await prisma.equityProperty.findMany({
    where: { key: 'RE_PREV_YEARS' }
  });
  console.log('\n--- RE_PREV_YEARS VALUES ---');
  re.forEach(p => {
    console.log(`Year: ${p.year}, Value: ${p.value.toString()}`);
  });
  
  await prisma.$disconnect();
}

check();
