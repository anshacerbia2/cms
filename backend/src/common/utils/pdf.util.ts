
const formatAccounting = (val: any) => {
  if (val == null || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return val;
  return `IDR ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNum = (val: any) => {
  if (val == null || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return val;
  return String(num);
};

export function generatePdfBuffer(data: any[], title: string, columnMapping: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const fonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };
      
      const pdfmake = require('pdfmake');
      pdfmake.setFonts(fonts);

      const keys = Object.keys(columnMapping);
      const headers = keys.map(k => {
        const mappingVal = columnMapping[k];
        return { 
          text: mappingVal.replace(/\|num|\|accounting/g, '').toUpperCase(), 
          style: 'tableHeader' 
        };
      });

      // Data extraction
      const body = data.map(row => {
        return keys.map(k => {
          const mappingVal = columnMapping[k];
          const isAccounting = mappingVal.endsWith('|accounting');
          const isNum = mappingVal.endsWith('|num');
          let val = row[k];
          
          let cellObj: any = { text: val != null ? String(val) : '' };
          
          if (isAccounting) {
            cellObj = { text: formatAccounting(val), alignment: 'right', noWrap: true };
          } else if (isNum) {
            cellObj = { text: formatNum(val), alignment: 'right', noWrap: true };
          } else if (val instanceof Date) {
            cellObj = { text: val.toLocaleDateString('en-GB') };
          }
          
          if (row._style) {
            if (row._style.bold) cellObj.bold = true;
            if (row._style.fill) cellObj.fillColor = '#' + row._style.fill;
          }
          
          return cellObj;
        });
      });

      // Put headers at the beginning
      body.unshift(headers as any[]);

      /*
       * Lebar kolom diukur dari isinya dengan metrik font yang dipakai PDF ini,
       * lalu kertasnya dibuat selebar tabel.
       *
       * Dulu kolom angka memakai lebar 'auto' di atas kertas tetap, sehingga
       * tabel yang lebih lebar dari kertas terpotong di kanan. Menaksir lebar
       * dari jumlah karakter juga tidak cukup: pdfmake melebarkan sendiri kolom
       * yang isinya tidak muat, dan tabelnya kembali melewati tepi kertas.
       *
       * Lebar yang diberikan ke pdfmake adalah lebar ISI sel; padding dan garis
       * tabel ditambahkan pdfmake di luar itu, jadi keduanya dihitung terpisah
       * saat menentukan lebar kertas - kalau tidak, tabelnya melewati tepi
       * sebanyak satu padding per kolom.
       */
      const FONT_SIZE = 7;
      const CELL_PADDING = 8;         // paddingLeft + paddingRight bawaan pdfmake
      const BORDER = 1;               // garis vertikal antar kolom
      const MARGIN_X = 20;
      const TEXT_COLUMN_CAP = 190;    // kolom teks dibatasi supaya deskripsi panjang membungkus

      const PDFDocument = require('pdfkit');
      const ruler = new PDFDocument({ autoFirstPage: false });
      const widthOf = (text: string, bold = false) =>
        ruler.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT_SIZE).widthOfString(text);

      /** Beberapa teks terpanjang saja yang diukur - huruf terlebar belum tentu yang terbanyak karakternya. */
      const widest = (texts: string[], bold: boolean) =>
        texts
          .sort((a, b) => b.length - a.length)
          .slice(0, 5)
          .reduce((max, text) => Math.max(max, widthOf(text, bold)), 0);

      const columnWidths = keys.map((k, index) => {
        const mappingVal = columnMapping[k];
        const isNumeric = mappingVal.endsWith('|accounting') || mappingVal.endsWith('|num');
        const cells = body.slice(1).map((row: any[]) => {
          const cell: any = row[index];
          return String((cell && typeof cell === 'object' ? cell.text : cell) ?? '');
        });

        const headerWidth = widthOf(String(headers?.[index] ?? ''), true);
        const contentWidth = widest(cells, false);
        const needed = Math.max(headerWidth, contentWidth);
        if (isNumeric) return Math.max(needed, 26);

        // Kolom teks boleh dipangkas sampai batas, tapi tidak boleh lebih sempit
        // dari kata terpanjangnya: kata tidak bisa dipenggal, dan pdfmake akan
        // melebarkan kolomnya sendiri - itu yang membuat tabel melewati kertas.
        const longestWord = widest(cells.flatMap((text) => text.split(/\s+/)), false);
        return Math.max(Math.min(needed, Math.max(TEXT_COLUMN_CAP, longestWord)), 26);
      });

      const tableWidth =
        columnWidths.reduce((total, w) => total + w, 0) + keys.length * (CELL_PADDING + BORDER) + BORDER;
      // Tingginya tetap seperti sebelumnya (setara A3 mendatar) supaya jumlah
      // halamannya tidak membengkak; yang menyesuaikan isi hanya lebarnya.
      const customPageSize: any = { width: Math.max(842, Math.ceil(tableWidth + MARGIN_X * 2)), height: 841.89 };

      const docDefinition: any = {
        pageOrientation: 'landscape',
        pageSize: customPageSize,
        pageMargins: [MARGIN_X, 30, MARGIN_X, 30],
        defaultStyle: {
          font: 'Helvetica',
          fontSize: FONT_SIZE, // Smaller font to fit many columns
        },
        styles: {
          header: {
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          tableHeader: {
            bold: true,
            fontSize: 7,
            color: 'white',
            fillColor: '#2F5597',
            alignment: 'center',
            margin: [2, 4, 2, 4]
          }
        },
        content: [
          { text: title, style: 'header' },
          {
            table: {
              headerRows: 1,
              // 'auto' keeps numbers compact, '*' allows text to wrap and fill available space evenly
              widths: columnWidths,
              body: body
            },
            layout: {
              fillColor: function (rowIndex: number) {
                return (rowIndex > 0 && rowIndex % 2 === 0) ? '#f3f4f6' : null; // alternate row colors
              },
              hLineColor: function () { return '#e5e7eb'; },
              vLineColor: function () { return '#e5e7eb'; },
            }
          }
        ]
      };

      const pdfDoc = pdfmake.createPdf(docDefinition);
      
      pdfDoc.getBuffer()
        .then((buffer: Buffer) => {
          resolve(buffer);
        })
        .catch((err: any) => {
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}
