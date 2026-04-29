import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-payable.xlsx');
const workbook = XLSX.readFile(filePath);

const wapuSheet = workbook.Sheets['AP PPN WAPU'];
const wapuRows = XLSX.utils.sheet_to_json(wapuSheet, { header: 1 });

const nonWapuSheet = workbook.Sheets['AP PPN Non WAPU'];
const nonWapuRows = XLSX.utils.sheet_to_json(nonWapuSheet, { header: 1 });

const wapuHeaders = wapuRows[2] as string[];
const nonWapuHeaders = nonWapuRows[2] as string[];

console.log("=== COLUMN ANALYSIS ===");
console.log("WAPU Headers:", wapuHeaders);
console.log("Non WAPU Headers:", nonWapuHeaders);
console.log("Headers Match?", JSON.stringify(wapuHeaders) === JSON.stringify(nonWapuHeaders));

// Sample data to check for keys
console.log("\n=== DATA LINK SAMPLE (AP Sheet) ===");
const apSheet = workbook.Sheets['AP'];
const apRows: any[][] = XLSX.utils.sheet_to_json(apSheet, { header: 1 });
// Column C is Vendor (row[2]), Column D is Keterangan (row[3])
console.log("AP Sample (Vendor, Keterangan):", apRows.slice(3, 6).map(r => ({ vendor: r[2], ket: r[3] })));

console.log("\n=== DATA LINK SAMPLE (PPN Sheet) ===");
// Column D is Client/Supplier (row[3]), Column E is Reference (row[4])
console.log("WAPU Sample (Client/Supplier, Reference):", wapuRows.slice(3, 6).map(r => ({ client: r[3], ref: r[4] })));
