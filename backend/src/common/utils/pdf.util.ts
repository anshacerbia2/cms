
const formatAccounting = (val: any) => {
  if (val == null || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          
          if (isAccounting) {
            return { text: formatAccounting(val), alignment: 'right' };
          } else if (isNum) {
            return { text: formatNum(val), alignment: 'right' };
          }
          
          if (val instanceof Date) {
            return { text: val.toLocaleDateString('en-GB') };
          }
          
          return { text: val != null ? String(val) : '' };
        });
      });

      // Put headers at the beginning
      body.unshift(headers as any[]);

      let customPageSize: any = 'A4';
      if (keys.length > 8 && keys.length <= 14) {
        customPageSize = 'A3';
      } else if (keys.length > 14) {
        // Very wide tables get a custom width to prevent column squishing
        customPageSize = { width: (keys.length * 90) + 100, height: 842 };
      }

      const docDefinition: any = {
        pageOrientation: 'landscape',
        pageSize: customPageSize,
        pageMargins: [20, 30, 20, 30],
        defaultStyle: {
          font: 'Helvetica',
          fontSize: 7, // Smaller font to fit many columns
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
              widths: keys.map(k => {
                const mappingVal = columnMapping[k];
                if (mappingVal.endsWith('|accounting') || mappingVal.endsWith('|num')) {
                  return 'auto';
                }
                // Jika kolom sedikit, '*' akan mengisi sisa kertas.
                // Jika kolom banyak, page size custom di atas memastikan '*' tidak terlalu sempit.
                return '*';
              }),
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
