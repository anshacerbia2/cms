import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'prisma', 'seed-data', 'account-payable.xlsx');
const workbook = XLSX.readFile(filePath);

const apSheet = workbook.Sheets['AP'];
const apRows = XLSX.utils.sheet_to_json(apSheet, { header: 1 });

const wapuSheet = workbook.Sheets['AP PPN WAPU'];
const wapuRows = XLSX.utils.sheet_to_json(wapuSheet, { header: 1 });

const nonWapuSheet = workbook.Sheets['AP PPN Non WAPU'];
const nonWapuRows = XLSX.utils.sheet_to_json(nonWapuSheet, { header: 1 });

// Count rows in AP that actually have a PPN value
let apWithPpnCount = 0;
let apPpnTotal = 0;
for (let i = 3; i < apRows.length; i++) {
  const row: any = apRows[i];
  if (!row || row.length === 0 || !row[0]) break; // Empty row check
  
  const ppnValStr = row[16]; // Col Q (AP PPN)
  const ppnVal = parseFloat(String(ppnValStr).replace(/,/g, ''));
  
  if (ppnVal && ppnVal !== 0 && !isNaN(ppnVal)) {
    apWithPpnCount++;
    apPpnTotal += ppnVal;
  }
}

// Count rows in PPN sheets
let wapuCount = 0;
let wapuPpnTotal = 0;
for (let i = 3; i < wapuRows.length; i++) {
  const row: any = wapuRows[i];
  if (!row || row.length === 0 || !row[3]) continue;
  
  const ppnValStr = row[7]; // PPN column
  const ppnVal = parseFloat(String(ppnValStr).replace(/,/g, ''));
  if (ppnVal && !isNaN(ppnVal)) {
    wapuCount++;
    wapuPpnTotal += ppnVal;
  }
}

let nonWapuCount = 0;
let nonWapuPpnTotal = 0;
for (let i = 3; i < nonWapuRows.length; i++) {
  const row: any = nonWapuRows[i];
  if (!row || row.length === 0 || !row[3]) continue;
  
  const ppnValStr = row[7]; // PPN column
  const ppnVal = parseFloat(String(ppnValStr).replace(/,/g, ''));
  if (ppnVal && !isNaN(ppnVal)) {
    nonWapuCount++;
    nonWapuPpnTotal += ppnVal;
  }
}

console.log(`--- ANALYSIS ---`);
console.log(`AP Rows with PPN > 0: ${apWithPpnCount} rows (Total PPN: ${apPpnTotal})`);
console.log(`WAPU Rows         : ${wapuCount} rows (Total PPN: ${wapuPpnTotal})`);
console.log(`Non WAPU Rows     : ${nonWapuCount} rows (Total PPN: ${nonWapuPpnTotal})`);
console.log(`Total PPN Sheets  : ${wapuCount + nonWapuCount} rows (Total PPN: ${wapuPpnTotal + nonWapuPpnTotal})`);
