import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'finance-report.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = 'PL per Project';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  console.error(`Sheet "${sheetName}" not found!`);
  process.exit(1);
}

const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`--- ANALYSIS OF SHEET: ${sheetName} ---`);
console.log(`Total Rows: ${rows.length}`);

console.log('\n--- DATA 1 (Rows 5 - 10) ---');
for (let i = 4; i < Math.min(10, rows.length); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
}

console.log('\n--- DATA 1 (Rows 45 - 50) ---');
for (let i = 44; i < Math.min(50, rows.length); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
}

console.log('\n--- GAP / DATA 2 START (Rows 51 - 60) ---');
for (let i = 50; i < Math.min(60, rows.length); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
}

console.log('\n--- DATA 2 (Rows 475 - 485) ---');
for (let i = 474; i < Math.min(485, rows.length); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
}
