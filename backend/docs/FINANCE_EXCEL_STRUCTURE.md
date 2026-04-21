# Finance Excel Data Structure

Dokumentasi ini menjelaskan struktur internal objek `workbook` hasil pembacaan library `xlsx` terhadap file `financial-report.xlsx`.

## Overview
Objek `workbook` adalah root object yang dihasilkan oleh `XLSX.readFile()`. Objek ini berisi metadata file, daftar sheet, dan isi sel dari setiap sheet.

## Root Object Structure
```json
{
  "Directory": {
    "workbooks": [ "/xl/workbook.xml" ],
    "sheets": [ "/xl/worksheets/sheet1.xml", ... ],
    "sst": "/xl/sharedStrings.xml",
    "style": "/xl/styles.xml"
  },
  "Workbook": {
    "AppVersion": { "appName": "xl", "lastEdited": "7" },
    "Sheets": [ /* Meta info per sheet */ ],
    "CalcPr": { "calcMode": "auto" }
  },
  "Props": {
    "Author": "David Harsamto",
    "CreatedDate": "2021-01-16T06:54:35.000Z",
    "ModifiedDate": "2026-04-13T02:53:53.000Z",
    "Application": "Microsoft Macintosh Excel",
    "Worksheets": 13,
    "SheetNames": [
      "BCA", "Mandiri", "BRI", "BTN", "Cash IDR", "Non CB",
      "Sales", "AR", "AP ", "Deprec 2021", "PL", 
      "Balance Sheet 2021", "Inter Accounts"
    ]
  },
  "Sheets": {
    "BCA": {
      "!ref": "A1:L1693",
      "A1": { "v": "BCA", "t": "s" },
      "B1": { "v": "5750-489-666", "t": "s" },
      ...
    },
    "AR": { ... },
    "AP ": { ... }
  }
}
```

## Key Components

### 1. `Props.SheetNames`
Berisi array nama-nama tab yang ada di Excel. Ini kita gunakan sebagai referensi untuk melakukan looping atau memilih sheet spesifik.

### 2. `Sheets[SheetName]`
Berisi data sel untuk sheet tertentu.
- `!ref`: Range alamat sel yang berisi data (misal: `A1:L1693`).
- `A1, B1, ...`: Alamat sel sebagai key, dengan value berupa objek `{ v: value, t: type }`.

### 3. Data Conversion Logic
Karena struktur `Sheets` di atas sulit dibaca secara sekuensial, kita menggunakan:
`XLSX.utils.sheet_to_json(sheet, { header: 1 })`

Hasilnya adalah **Array 2D** yang kita gunakan di seeder:
```javascript
[
  ["BCA", "5750-489-666"], // Row 1
  ["RD HIDIANITJE", null], // Row 2
  [],                      // Row 3
  ...
]
```

## Seeding Rules
- **Termination**: Seeder berhenti jika menemukan baris yang benar-benar kosong (`isRowEmpty`).

## Column Mapping & Merged Cells (PENTING)

Bagian ini menjelaskan bagaimana library `xlsx` menangani kolom kosong dan sel yang di-merge saat dikonversi menjadi Array 2D.

### 1. Patokan Kolom Terakhir
Sistem menggunakan kolom paling kanan yang berisi data sebagai batas akhir array (`!ref`).
- Selama masih ada data di sebelah kanan, kolom kosong di tengah **wajib diisi `null`** sebagai pengganjal posisi (index).
- Jika sudah tidak ada lagi data di sebelah kanan, array akan langsung dipotong (**tidak ada mapping** untuk kolom tersebut / `undefined`).

### 2. Merged Cells Behavior
Jika Kolom A dan B di-merge secara horizontal:
- **Value** hanya tersimpan di sel pertama (kiri-atas), yaitu Kolom A (`index 0`).
- **Kolom B** (`index 1`) akan terbaca sebagai **`null`**.
- Kolom C tetap berada di `index 2`.

### 3. Handling di Kode (Safe Access)
Karena sebuah kolom bisa bernilai `null` (karena merge/kosong di tengah) atau `undefined` (karena kosong di ujung kanan), kita menggunakan pola *Safe Access* di seeder:

```typescript
// Menggunakan cleanString helper untuk proteksi
description: cleanString(row[1])

// Atau manual fallback
const val = String(row[1] || '')
```
Ini memastikan program tidak akan error (crash) saat mencoba memproses kolom yang secara fisik tidak ada di objek Excel.

## Kesimpulan Transformasi Data

Secara sederhana, proses pembacaan file Excel ini adalah mengubah struktur data:

1.  **Awal (Raw)**: **Object dalam Object**
    - Struktur: `Workbook` -> `Sheets` -> `Sheet` -> `Cell Address (A1, B1)`.
    - Sifat: *Sparse* (sel kosong tidak disimpan).
2.  **Akhir (Processed)**: **Array dalam Array (Array 2D)**
    - Struktur: `Data Array` -> `Row Array` -> `Column Value`.
    - Sifat: *Sequential* (sel kosong dipaksa jadi `null` untuk menjaga urutan).

Transformasi inilah yang memungkinkan kita melakukan looping data secara teratur per baris.
