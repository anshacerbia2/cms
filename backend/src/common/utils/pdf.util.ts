
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
       * Lebar kolom dihitung dari isi terpanjangnya, lalu kertasnya dibuat
       * selebar tabel. Sebelumnya kolom angka memakai lebar 'auto' di atas
       * kertas A3: begitu jumlah kolom bertambah, tabelnya lebih lebar dari
       * kertas dan kolom paling kanan terpotong.
       *
       * Kolom teks dibatasi supaya deskripsi yang panjang membungkus ke bawah,
       * bukan melebarkan kertas tanpa henti; kolom angka tidak dibatasi keras
       * supaya nominalnya tidak pernah terpotong.
       */
      const FONT_SIZE = 7;
      const CHAR_WIDTH = FONT_SIZE * 0.55;   // rata-rata lebar karakter Helvetica
      const CELL_PADDING = 12;
      const MARGIN_X = 20;

      const columnWidths = keys.map((k, index) => {
        const mappingVal = columnMapping[k];
        const isNumeric = mappingVal.endsWith('|accounting') || mappingVal.endsWith('|num');
        let longest = 0;
        for (const row of body) {
          const cell: any = row[index];
          const text = String((cell && typeof cell === 'object' ? cell.text : cell) ?? '');
          if (text.length > longest) longest = text.length;
        }
        const needed = longest * CHAR_WIDTH + CELL_PADDING;
        const max = isNumeric ? 140 : 190;
        return Math.min(Math.max(needed, 34), max);
      });

      const tableWidth = columnWidths.reduce((total, w) => total + w, 0) + keys.length + 2;
      // Minimal seukuran A4 mendatar; lebih lebar kalau tabelnya memang lebar.
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
