import { Activo } from '../types';
import * as XLSX from 'xlsx';

/**
 * Format Colombian Pesos (COP)
 */
export function formatCOP(val: number | string | undefined | null): string {
  const num = typeof val === 'number' ? val : Number(val) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Short currency format (e.g. $1.2M, $450K)
 */
export function formatShortCurrency(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}K`;
  }
  return formatCOP(val);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(val: number | string | undefined | null): string {
  const num = typeof val === 'number' ? val : Number(val) || 0;
  return new Intl.NumberFormat('es-CO').format(num);
}

/**
 * Clean string representation removing unwanted quote prefix and whitespace
 */
export function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .replace(/^['"]+/, '')
    .replace(/['"]+$/, '')
    .trim();
}

/**
 * Clean numeric string into float, handling Colombian/Latin currency formats
 * e.g. "595.000" -> 595000, "1.615.110" -> 1615110, "595000" -> 595000, "0" -> 0
 */
export function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let s = String(val).trim().replace(/['"$ ]/g, '');
  if (!s || s === '-' || s === 'N/A') return 0;

  // Check if it has multiple dots like "1.615.110"
  if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  } else if (/^\d+\.\d{3}$/.test(s)) {
    // Single dot followed by exactly 3 digits like "595.000" in Colombian accounting
    s = s.replace('.', '');
  } else if (/^\d+\.\d{3},\d+$/.test(s)) {
    // "595.000,50" -> 595000.50
    s = s.replace('.', '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Generate and download Excel (.xlsx) workbook with multiple sheets as in the Python HILA script:
 * Sheet 1: Listado de Activos
 * Sheet 2: Resumen por Centro de Costos
 * Sheet 3: Resumen por Funcionario
 * Sheet 4: Activos Depreciados
 */
export function exportToExcel(activos: Activo[], filenamePrefix: string = 'HILA_Reporte'): void {
  const wb = XLSX.utils.book_new();

  // 1. General sheet
  const dataGeneral = activos.map((a) => ({
    'Código': a.codigo,
    'Descripción': a.descripcion,
    'Estado': a.estado,
    'Centro de Costos': a.centro_costos,
    'Funcionario': a.funcionario,
    'Grupo': a.grupo,
    'Subgrupo': a.subgrupo,
    'Marca': a.marca,
    'Ubicación': a.ubicacion,
    'Fecha Compra': a.fecha_compra || '',
    'Valor Compra': a.valor_compra,
    'Valor Histórico': a.valor_historico,
    'Fecha Última Deprec.': a.fecha_ultima_depre || '',
    'Deprec. Acumulada': a.depreciacion_acumulada,
    'Saldo por Depreciar': a.saldo_por_depreciar,
    'Activo Operativo': a.activo ? 'Sí' : 'No',
  }));
  const wsGeneral = XLSX.utils.json_to_sheet(dataGeneral);
  XLSX.utils.book_append_sheet(wb, wsGeneral, 'Activos');

  // 2. Summary by Centro de Costos
  const centroMap: Record<string, { count: number; vh: number; da: number; saldo: number }> = {};
  activos.forEach((a) => {
    const c = a.centro_costos || 'Sin Centro';
    if (!centroMap[c]) {
      centroMap[c] = { count: 0, vh: 0, da: 0, saldo: 0 };
    }
    centroMap[c].count += 1;
    centroMap[c].vh += a.valor_historico;
    centroMap[c].da += a.depreciacion_acumulada;
    centroMap[c].saldo += a.saldo_por_depreciar;
  });

  const dataCentros = Object.entries(centroMap).map(([centro, s]) => {
    const pct = s.vh > 0 ? ((s.da / s.vh) * 100).toFixed(1) + '%' : '0%';
    return {
      'Centro de Costos': centro,
      'Total Activos': s.count,
      'Valor Histórico': s.vh,
      'Deprec. Acumulada': s.da,
      'Saldo por Depreciar': s.saldo,
      '% Depreciado': pct,
    };
  });
  const wsCentros = XLSX.utils.json_to_sheet(dataCentros);
  XLSX.utils.book_append_sheet(wb, wsCentros, 'Por Centro de Costos');

  // 3. Summary by Funcionario
  const funcMap: Record<string, { count: number; vh: number; da: number; saldo: number }> = {};
  activos.forEach((a) => {
    const f = a.funcionario || 'Sin Asignar';
    if (!funcMap[f]) {
      funcMap[f] = { count: 0, vh: 0, da: 0, saldo: 0 };
    }
    funcMap[f].count += 1;
    funcMap[f].vh += a.valor_historico;
    funcMap[f].da += a.depreciacion_acumulada;
    funcMap[f].saldo += a.saldo_por_depreciar;
  });

  const dataFunc = Object.entries(funcMap).map(([func, s]) => ({
    'Funcionario': func,
    'Total Activos': s.count,
    'Valor Histórico': s.vh,
    'Deprec. Acumulada': s.da,
    'Saldo por Depreciar': s.saldo,
  }));
  const wsFunc = XLSX.utils.json_to_sheet(dataFunc);
  XLSX.utils.book_append_sheet(wb, wsFunc, 'Por Funcionario');

  // 4. Depreciated sheet
  const dataDepreciados = activos
    .filter((a) => a.estado === 'Depreciado' || a.saldo_por_depreciar <= 0)
    .map((a) => ({
      'Código': a.codigo,
      'Descripción': a.descripcion,
      'Centro de Costos': a.centro_costos,
      'Funcionario': a.funcionario,
      'Valor Histórico': a.valor_historico,
      'Deprec. Acumulada': a.depreciacion_acumulada,
      'Saldo': a.saldo_por_depreciar,
      'Tipo': a.estado === 'Depreciado' ? 'Tipo 1 (Obsoleto)' : 'Tipo 2 (Sin Saldo)',
    }));
  const wsDeprec = XLSX.utils.json_to_sheet(dataDepreciados);
  XLSX.utils.book_append_sheet(wb, wsDeprec, 'Depreciados');

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Generate and download CSV file
 */
export function exportToCSV(activos: Activo[], filename: string = 'HILA_Activos.csv'): void {
  const headers = [
    'Codigo',
    'Descripcion',
    'Estado',
    'Fecha Compra',
    'Valor Compra',
    'Valor Historico',
    'Funcionario',
    'Grupo',
    'Subgrupo',
    'Marca',
    'Centro Costos',
    'Ubicacion',
    'Fecha Ultima Depre',
    'Depreciacion Acumulada',
    'Saldo Por Depreciar',
    'Activo'
  ];

  const escapeCSV = (str: string | number | undefined | null) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = activos.map((a) => [
    escapeCSV(a.codigo),
    escapeCSV(a.descripcion),
    escapeCSV(a.estado),
    escapeCSV(a.fecha_compra || ''),
    a.valor_compra,
    a.valor_historico,
    escapeCSV(a.funcionario),
    escapeCSV(a.grupo),
    escapeCSV(a.subgrupo),
    escapeCSV(a.marca),
    escapeCSV(a.centro_costos),
    escapeCSV(a.ubicacion),
    escapeCSV(a.fecha_ultima_depre || ''),
    a.depreciacion_acumulada,
    a.saldo_por_depreciar,
    a.activo ? 'Si' : 'No',
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export official Hospital Infantil Los Ángeles asset report
 * Format: FO03_PR13_RF V2 - INVENTARIO DE ACTIVOS FIJOS
 * Exactly matching the Google Sheet and user attachment layout
 */
export function exportToOfficialExcel(
  activos: Activo[],
  options?: {
    centroCosto?: string;
    fecha?: string;
    responsable?: string;
    codigoFormato?: string;
    filename?: string;
  }
): void {
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];

  const codFormato = options?.codigoFormato || 'Codigo: FO03_PR13_RF       V2';
  const fechaStr = options?.fecha || 'Fecha: Enero 02 de 2025';
  const respStr = options?.responsable || 'Responsable: Jefe de\nactivos fijos';
  const centroStr = options?.centroCosto ? options.centroCosto.toUpperCase() : 'TODOS LOS CENTROS DE COSTO';
  const dateToday = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Row 0
  aoa.push(['', '', 'HOSPITAL INFANTIL LOS ANGELES', '', '', '', codFormato]);
  // Row 1
  aoa.push(['', '', '', '', '', '', fechaStr]);
  // Row 2
  aoa.push(['', '', 'INVENTARIO DE ACTIVOS FIJOS ', '', '', '', respStr]);
  // Row 3
  aoa.push([]);
  // Row 4
  aoa.push([]);
  // Row 5
  aoa.push([`CENTRO DE COSTO: ${centroStr}`, '', '', '', '', 'PAGINA: 1']);
  // Row 6
  aoa.push([]);
  // Row 7
  aoa.push(['', '', '', '', '', `FECHA: ${dateToday}`]);
  // Row 8
  aoa.push([]);
  // Row 9 (Table Headers)
  aoa.push(['No', 'CODIGO ACTIVO', 'PLACA ACTIVO', 'DESCRIPSION', 'GRUPO', 'MARCA', 'MODELO', 'SERIE']);

  // Data rows
  activos.forEach((a, idx) => {
    aoa.push([
      idx + 1,
      a.codigo || '',
      a.placa || a.pol || a.codigo || '',
      a.descripcion || '',
      a.grupo || '',
      a.marca || '',
      a.modelo || a.subgrupo || '—',
      a.serie || a.man || '—'
    ]);
  });

  // Footer rows matching Google Sheet
  aoa.push([]);
  aoa.push(['Firma e identificación de entrega  ', '', '', '', 'Firma e identificación de quien recibe', '', '', '']);
  aoa.push(['Nombre de quien firma: ____________________', '', '', '', 'Nombre de quien firma: ____________________', '', '', '']);
  aoa.push([]);
  aoa.push(['Observacion:  __________________________________________________________________________________']);
  aoa.push([]);
  aoa.push([]);
  aoa.push(['', '', '', '', '', '', 'Vigencia: 02/01/2027']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // CODIGO ACTIVO
    { wch: 18 }, // PLACA ACTIVO
    { wch: 45 }, // DESCRIPSION
    { wch: 16 }, // GRUPO
    { wch: 20 }, // MARCA
    { wch: 18 }, // MODELO
    { wch: 20 }, // SERIE
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'INVENTARIO ACTIVOS');

  // Secondary detailed accounting sheet for full value and depreciation visibility
  const dataDetallada = activos.map((a, idx) => ({
    'No': idx + 1,
    'Código': a.codigo,
    'Placa': a.placa || a.pol || a.codigo,
    'Descripción': a.descripcion,
    'Estado': a.estado,
    'Centro de Costo': a.centro_costos,
    'Funcionario': a.funcionario,
    'Grupo': a.grupo,
    'Marca': a.marca,
    'Modelo': a.modelo || a.subgrupo || '—',
    'Serie': a.serie || a.man || '—',
    'Valor Histórico': a.valor_historico,
    'Deprec. Acumulada': a.depreciacion_acumulada,
    'Saldo por Depreciar': a.saldo_por_depreciar,
  }));
  const wsDetallada = XLSX.utils.json_to_sheet(dataDetallada);
  XLSX.utils.book_append_sheet(wb, wsDetallada, 'Detalle Financiero');

  const name = options?.filename || `HILA_Inventario_FO03_PR13_RF_V2_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(wb, `${name}.xlsx`);
}

/**
 * Export official CSV format matching the exact structure
 */
export function exportToOfficialCSV(
  activos: Activo[],
  options?: {
    centroCosto?: string;
    filename?: string;
  }
): void {
  const centroStr = options?.centroCosto ? options.centroCosto.toUpperCase() : 'TODOS LOS CENTROS DE COSTO';
  const dateToday = new Date().toLocaleDateString('es-CO');

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines: string[] = [
    ',,HOSPITAL INFANTIL LOS ANGELES,,,,Codigo: FO03_PR13_RF       V2',
    ',,,,,,Fecha: Enero 02 de 2025',
    ',,INVENTARIO DE ACTIVOS FIJOS ,,,,"Responsable: Jefe de\nactivos fijos"',
    ',,,,,,',
    ',,,,,,',
    `"CENTRO DE COSTO: ${centroStr}",,,,,PAGINA,`,
    ',,,,,,',
    `,,,,,FECHA: ${dateToday},`,
    ',,,,,,',
    'No,CODIGO ACTIVO,PLACA ACTIVO,DESCRIPSION,GRUPO,MARCA,MODELO,SERIE'
  ];

  activos.forEach((a, idx) => {
    lines.push([
      idx + 1,
      escapeCSV(a.codigo),
      escapeCSV(a.placa || a.pol || a.codigo),
      escapeCSV(a.descripcion),
      escapeCSV(a.grupo),
      escapeCSV(a.marca),
      escapeCSV(a.modelo || a.subgrupo || ''),
      escapeCSV(a.serie || a.man || '')
    ].join(','));
  });

  lines.push(',,,,,,');
  lines.push('Firma e identificación de entrega  ,,,,Firma e identificación de quien recibe,,,');
  lines.push('Nombre de quien firma:,,,,Nombre de quien firma:   ,,,');
  lines.push(',,,,,,');
  lines.push('Observacion:  ,,,,,,,');
  lines.push(',,,,,,');
  lines.push(',,,,,,');
  lines.push(',,,,,,Vigencia: 02/01/2027,');

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', (options?.filename || 'HILA_Inventario_FO03_PR13_RF_V2') + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fills a user-provided Excel template (.xlsx) with filtered activos matching the 8 institutional columns:
 * 1. No
 * 2. CODIGO ACTIVO
 * 3. PLACA ACTIVO
 * 4. DESCRIPSION
 * 5. GRUPO
 * 6. MARCA
 * 7. MODELO
 * 8. SERIE
 * Preserves the original template's merged cells, styling, header logos, and layout.
 */
export function fillAndExportCustomTemplate(
  templateData: ArrayBuffer | string, // ArrayBuffer or base64
  activos: Activo[],
  options?: {
    centroCosto?: string;
    filename?: string;
  }
): boolean {
  try {
    let wb: XLSX.WorkBook;
    if (typeof templateData === 'string') {
      const cleanBase64 = templateData.replace(/^data:application\/[a-zA-Z0-9.+_-]+;base64,/, '');
      wb = XLSX.read(cleanBase64, { type: 'base64', cellStyles: true });
    } else {
      wb = XLSX.read(templateData, { type: 'array', cellStyles: true });
    }

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('El archivo de plantilla no contiene hojas de cálculo válidas.');
    }

    // Pick first worksheet or one with "ACTIVO" in name
    const targetSheetName =
      wb.SheetNames.find((name) => /activo|inventario/i.test(name)) || wb.SheetNames[0];
    const ws = wb.Sheets[targetSheetName];

    if (!ws || !ws['!ref']) {
      throw new Error('La hoja seleccionada está vacía.');
    }

    const range = XLSX.utils.decode_range(ws['!ref']);

    // Find the header row containing the 8 institutional columns
    let headerRow = -1;
    let colMap: { [key: string]: number } = {};

    for (let R = range.s.r; R <= Math.min(range.e.r, 40); ++R) {
      let matchedCount = 0;
      const tempColMap: { [key: string]: number } = {};

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell || !cell.v) continue;

        const val = String(cell.v)
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

        if (val === 'NO' || val === '#' || val === 'ITEM' || val === 'CONSECUTIVO') {
          tempColMap['No'] = C;
          matchedCount++;
        } else if (val.includes('CODIGO') || val.includes('COD')) {
          tempColMap['CODIGO ACTIVO'] = C;
          matchedCount++;
        } else if (val.includes('PLACA')) {
          tempColMap['PLACA ACTIVO'] = C;
          matchedCount++;
        } else if (val.includes('DESCRIP')) {
          tempColMap['DESCRIPSION'] = C;
          matchedCount++;
        } else if (val.includes('GRUPO')) {
          tempColMap['GRUPO'] = C;
          matchedCount++;
        } else if (val.includes('MARCA')) {
          tempColMap['MARCA'] = C;
          matchedCount++;
        } else if (val.includes('MODELO')) {
          tempColMap['MODELO'] = C;
          matchedCount++;
        } else if (val.includes('SERIE')) {
          tempColMap['SERIE'] = C;
          matchedCount++;
        }
      }

      if (matchedCount >= 3) {
        headerRow = R;
        colMap = tempColMap;
        break;
      }
    }

    // If header row wasn't automatically found, create standard 8 column layout starting row 9
    if (headerRow === -1) {
      headerRow = 9;
      colMap = {
        'No': 0,
        'CODIGO ACTIVO': 1,
        'PLACA ACTIVO': 2,
        'DESCRIPSION': 3,
        'GRUPO': 4,
        'MARCA': 5,
        'MODELO': 6,
        'SERIE': 7,
      };
      // Write headers explicitly
      const headers = ['No', 'CODIGO ACTIVO', 'PLACA ACTIVO', 'DESCRIPSION', 'GRUPO', 'MARCA', 'MODELO', 'SERIE'];
      headers.forEach((h, cIdx) => {
        const addr = XLSX.utils.encode_cell({ r: headerRow, c: cIdx });
        ws[addr] = { t: 's', v: h };
      });
    }

    // Optional: Update Centro de Costo cell in the header if it exists
    if (options?.centroCosto) {
      for (let R = range.s.r; R < headerRow; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell && typeof cell.v === 'string' && /centro\s+de\s+costo/i.test(cell.v)) {
            ws[addr] = { t: 's', v: `CENTRO DE COSTO: ${options.centroCosto.toUpperCase()}` };
          }
        }
      }
    }

    // Insert activos starting from headerRow + 1
    const startDataRow = headerRow + 1;
    activos.forEach((activo, idx) => {
      const curRow = startDataRow + idx;

      const rowValues: { [key: string]: any } = {
        'No': idx + 1,
        'CODIGO ACTIVO': activo.codigo || '',
        'PLACA ACTIVO': activo.placa || activo.pol || activo.codigo || '',
        'DESCRIPSION': activo.descripcion || '',
        'GRUPO': activo.grupo || '',
        'MARCA': activo.marca || 'Sin Marca',
        'MODELO': activo.modelo || activo.subgrupo || '—',
        'SERIE': activo.serie || activo.man || '—',
      };

      Object.entries(colMap).forEach(([colName, colIdx]) => {
        const val = rowValues[colName];
        const addr = XLSX.utils.encode_cell({ r: curRow, c: colIdx });
        if (typeof val === 'number') {
          ws[addr] = { t: 'n', v: val };
        } else {
          ws[addr] = { t: 's', v: String(val) };
        }
      });
    });

    // Expand sheet range to encompass newly inserted rows
    const maxRow = Math.max(range.e.r, startDataRow + activos.length + 10);
    const maxCol = Math.max(range.e.c, 7);
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: maxRow, c: maxCol },
    });

    const exportName = options?.filename || `HILA_Formato_Institucional_${new Date().toISOString().slice(0, 10)}`;
    XLSX.writeFile(wb, `${exportName}.xlsx`);
    return true;
  } catch (err) {
    console.error('Error filling custom template:', err);
    return false;
  }
}


