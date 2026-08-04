import * as XLSX from 'xlsx-js-style';

export function generateExcelBuffer(data: any[], sheetName: string = 'Sheet1', columnMapping?: Record<string, string>): Buffer {
  const safeData = data && data.length > 0 ? data : [];
  
  if (safeData.length === 0 && !columnMapping) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ Message: 'No data available' }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  const parseValue = (val: any) => {
    if (typeof val === 'string' && val.trim() !== '') {
      const trimmed = val.trim();
      // Test if it's a valid float string (e.g. "1000.0000" or "1000")
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
    }
    return val;
  };

  let mappedData = safeData;
  let headers: string[] | undefined;
  const columnFormats: Record<string, string> = {};

  if (columnMapping) {
    const keys = Object.keys(columnMapping);
    headers = keys.map(k => {
      const mappingVal = columnMapping[k];
      const isAccounting = mappingVal.endsWith('|accounting');
      const isNum = mappingVal.endsWith('|num');
      const label = mappingVal.replace(/\|num|\|accounting/g, '');
      
      if (isAccounting) {
        columnFormats[label] = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';
      } else if (isNum) {
        columnFormats[label] = '0';
      }
      return label;
    });
    
    mappedData = safeData.map(row => {
      const newRow: any = {};
      for (const key of keys) {
        const mappingVal = columnMapping[key];
        const isAccounting = mappingVal.endsWith('|accounting');
        const isNum = mappingVal.endsWith('|num');
        const label = mappingVal.replace(/\|num|\|accounting/g, '');
        
        let val = row[key];
        if (isAccounting || isNum) {
          val = parseValue(val);
        }
        
        newRow[label] = val;
      }
      return newRow;
    });
  } else {
    mappedData = safeData.map(row => {
      const newRow: any = {};
      for (const key of Object.keys(row)) {
        newRow[key] = row[key];
      }
      return newRow;
    });
  }


  const worksheet = XLSX.utils.json_to_sheet(mappedData, { header: headers, cellDates: true });

  // Format numeric and date cells
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell) {
        if (R === 0) { // Header row
          if (typeof cell.v === 'string') {
            cell.v = cell.v.toUpperCase();
          }
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2F5597" } }, // Dark blue
            alignment: { horizontal: "center", vertical: "center" }
          };
        } else {
          const rowData = safeData[R - 1];
          if (rowData && rowData._style) {
            cell.s = cell.s || {};
            if (rowData._style.bold) {
              cell.s.font = cell.s.font || {};
              cell.s.font.bold = true;
            }
            if (rowData._style.fill) {
              cell.s.fill = cell.s.fill || {};
              cell.s.fill.fgColor = { rgb: rowData._style.fill };
            }
          }
        }

        
        if (cell.t === 'n') {
          const headerLabel = headers ? headers[C] : undefined;
          if (headerLabel && columnFormats[headerLabel]) {
            cell.z = columnFormats[headerLabel];
          } else {
            cell.z = Number.isInteger(cell.v) ? '#,##0' : '#,##0.00';
          }
        } else if (cell.t === 'd') {
          cell.z = 'dd/mm/yyyy';
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns based on header length and content length
  const colWidths = [];
  const keys = headers || Object.keys(mappedData[0]);
  for (let i = 0; i < keys.length; i++) {
    let max = keys[i].toString().length;
    for (let j = 0; j < mappedData.length; j++) {
      const val = mappedData[j][keys[i]];
      if (val !== null && val !== undefined) {
        const len = val.toString().length;
        if (len > max) {
          max = len;
        }
      }
    }
    colWidths.push({ wch: Math.min(max + 2, 50) }); // cap width at 50
  }
  worksheet['!cols'] = colWidths;

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
