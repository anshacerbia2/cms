import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-payable.xlsx');
const workbook = XLSX.readFile(filePath);

console.log("Sheet Names:", workbook.SheetNames);

const wapu = workbook.Sheets['AP PPN WAPU'];
if (wapu) {
  console.log("=== AP PPN WAPU ===");
  const rows = XLSX.utils.sheet_to_json(wapu, { header: 1 });
  console.log("Headers/Rows:", rows.slice(0, 5));
}

const nonWapu = workbook.Sheets['AP PPN Non WAPU'];
if (nonWapu) {
  console.log("=== AP PPN Non WAPU ===");
  const rows = XLSX.utils.sheet_to_json(nonWapu, { header: 1 });
  console.log("Headers/Rows:", rows.slice(0, 5));
}
