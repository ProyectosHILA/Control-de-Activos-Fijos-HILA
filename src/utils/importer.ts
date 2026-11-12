import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Activo, ImportSummary } from '../types';
import { cleanNum, cleanStr } from './formatters';

interface ParseResult {
  activos: Activo[];
  summary: ImportSummary;
  rawRowsCount: number;
}

/**
 * Normalizes header string to find matching field
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps arbitrary row object to Activo structure with exact HILA columns support
 */
function mapRowToActivo(row: Record<string, any>, index: number): Activo | null {
  const normMap: Record<string, any> = {};
  const rawEntries = Object.entries(row);

  for (const [k, v] of rawEntries) {
    const key = normalizeKey(k);
    if (key) normMap[key] = v;
  }

  // Find code (ACTIVO)
  const codigoRaw =
    normMap['activo'] ||
    normMap['codigo'] ||
    normMap['cod'] ||
    normMap['code'] ||
    normMap['id'] ||
    normMap['placa'] ||
    normMap['serial'] ||
    row['Unnamed: 0'] ||
    row['0'];

  const codigo = cleanStr(codigoRaw);
  if (!codigo || codigo.toUpperCase() === 'ACTIVO' || codigo.toUpperCase() === 'CODIGO') {
    return null;
  }

  // DESCRIPSION or DESCRIPCION
  const descripcion = cleanStr(
    normMap['descripsion'] ||
    normMap['descripcion'] ||
    normMap['nombre'] ||
    normMap['detalle'] ||
    row['1']
  );

  // ESTADO
  const estadoRaw = cleanStr(
    normMap['estado'] ||
    normMap['status'] ||
    row['2']
  ) || 'Activo';

  let estado: Activo['estado'] = 'Activo';
  if (/depre/i.test(estadoRaw)) estado = 'Depreciado';
  else if (/repara|mant/i.test(estadoRaw)) estado = 'En Reparación';
  else if (/baja|retirado/i.test(estadoRaw)) estado = 'Dado de Baja';

  // F.COMPRA
  const fechaCompra = cleanStr(
    normMap['fcompra'] ||
    normMap['fechacompra'] ||
    normMap['fechaadquisicion'] ||
    normMap['fecha'] ||
    row['3']
  );

  // VALOR COMPRA
  const valorCompra = cleanNum(
    normMap['valorcompra'] ||
    normMap['costocompra'] ||
    normMap['preciocompra'] ||
    row['4']
  );

  // VALOR HIST.
  const valorHistorico = cleanNum(
    normMap['valorhist'] ||
    normMap['valorhistorico'] ||
    normMap['costohistorico'] ||
    normMap['valortotal'] ||
    normMap['valor'] ||
    valorCompra ||
    row['5']
  );

  // FUNCIONARIO
  const funcionario = cleanStr(
    normMap['funcionario'] ||
    normMap['responsable'] ||
    normMap['custodio'] ||
    normMap['usuario'] ||
    row['6']
  );

  // GRUPO
  const grupo = cleanStr(
    normMap['grupo'] ||
    normMap['categoria'] ||
    normMap['clase'] ||
    row['7']
  );

  // SUBGRUPO
  const subgrupo = cleanStr(
    normMap['subgrupo'] ||
    normMap['subcategoria'] ||
    row['8']
  );

  // MARCA
  const marca = cleanStr(
    normMap['marca'] ||
    normMap['fabricante'] ||
    row['9']
  );

  // CENTRO COSTO
  const centroCostos = cleanStr(
    normMap['centrocosto'] ||
    normMap['centrocostos'] ||
    normMap['centrodecosto'] ||
    normMap['centrodecostos'] ||
    normMap['departamento'] ||
    normMap['area'] ||
    row['10']
  );

  // UBICACIÓN (handles possible code and name split in adjacent columns)
  let ubicacionRaw = cleanStr(
    normMap['ubicacion'] ||
    normMap['servicio'] ||
    normMap['piso'] ||
    normMap['sala'] ||
    row['11']
  );

  // Extra second ubicacion column if present (like '153 and AUDITORIA DE CUENTAS)
  let extraUbicacion = cleanStr(
    normMap['ubicacion1'] ||
    normMap['nombreubicacion'] ||
    normMap['detalleubicacion'] ||
    row['12']
  );

  let ubicacionFinal = ubicacionRaw;
  let codigoUbicacion = '';

  if (ubicacionRaw && extraUbicacion && ubicacionRaw !== extraUbicacion) {
    if (/^\d+$/.test(ubicacionRaw) || ubicacionRaw.length <= 5) {
      codigoUbicacion = ubicacionRaw;
      ubicacionFinal = `${ubicacionRaw} - ${extraUbicacion}`;
    } else {
      ubicacionFinal = `${ubicacionRaw} / ${extraUbicacion}`;
    }
  } else if (!ubicacionFinal && extraUbicacion) {
    ubicacionFinal = extraUbicacion;
  }

  // F.ULTIMA DEPRECIACION
  const fechaUltimaDepre = cleanStr(
    normMap['fultimadepreciacion'] ||
    normMap['fultimadepre'] ||
    normMap['fechaultimadepre'] ||
    normMap['fechaultimadepreciacion'] ||
    row['13']
  );

  // DEPRECIACION ACUMULADA
  const depreciacionAcumulada = cleanNum(
    normMap['depreciacionacumulada'] ||
    normMap['depreacum'] ||
    normMap['depreciacion'] ||
    row['14']
  );

  // SALDO X DEPRECIAR
  let saldoPorDepreciar = cleanNum(
    normMap['saldoxdepreciar'] ||
    normMap['saldopordepreciar'] ||
    normMap['saldodepreciar'] ||
    normMap['saldopendiente'] ||
    row['15']
  );

  // Fallback calculation if saldo was omitted or 0 but valor > 0
  if (saldoPorDepreciar === 0 && valorHistorico > 0 && depreciacionAcumulada > 0) {
    saldoPorDepreciar = Math.max(0, valorHistorico - depreciacionAcumulada);
  } else if (saldoPorDepreciar === 0 && valorHistorico > 0 && depreciacionAcumulada === 0) {
    saldoPorDepreciar = valorHistorico;
  }

  // POL & MAN (Póliza y Mantenimiento)
  const pol = cleanStr(normMap['pol'] || row['16']);
  const man = cleanStr(normMap['man'] || row['17']);

  // Placa, Modelo, Serie from official template or extra columns
  const placa = cleanStr(normMap['placaactivo'] || normMap['placa'] || pol || '');
  const modelo = cleanStr(normMap['modelo'] || normMap['model'] || subgrupo || '');
  const serie = cleanStr(normMap['serie'] || normMap['serial'] || normMap['numerodeserie'] || man || '');

  const activoBool = estado !== 'Depreciado' && estado !== 'Dado de Baja';

  return {
    id: codigo,
    codigo,
    descripcion: descripcion || `Activo ${codigo}`,
    estado,
    fecha_compra: fechaCompra,
    valor_compra: valorCompra || valorHistorico,
    valor_historico: valorHistorico,
    funcionario: funcionario || 'Sin Asignar',
    grupo: grupo || 'GENERAL',
    subgrupo: subgrupo || 'GENERAL',
    marca: marca || 'Sin Marca',
    centro_costos: centroCostos || 'GENERAL',
    ubicacion: ubicacionFinal || 'Hospital HILA',
    codigo_ubicacion: codigoUbicacion || undefined,
    fecha_ultima_depre: fechaUltimaDepre,
    depreciacion_acumulada: depreciacionAcumulada,
    saldo_por_depreciar: saldoPorDepreciar,
    pol: pol || undefined,
    man: man || undefined,
    placa: placa || undefined,
    modelo: modelo || undefined,
    serie: serie || undefined,
    activo: activoBool,
  };
}

/**
 * Parse CSV / TSV text or File with auto-detect delimiters
 */
export async function parseCSVFile(
  fileOrText: File | string,
  existingActivos: Activo[] = []
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText as any, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: ['\t', ';', ',', '|'],
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        const { activos, summary } = processRows(rows, existingActivos);
        resolve({ activos, summary, rawRowsCount: rows.length });
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Parse Excel file (.xls or .xlsx)
 */
export async function parseExcelFile(
  file: File,
  existingActivos: Activo[] = []
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // Find header row
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
    const row = rawMatrix[r] || [];
    const rowStr = row.map((c) => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('activo') || rowStr.includes('codigo') || rowStr.includes('descrip')) {
      headerRowIndex = r;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    range: headerRowIndex,
    defval: '',
  }) as Record<string, any>[];

  const { activos, summary } = processRows(rows, existingActivos);
  return { activos, summary, rawRowsCount: rows.length };
}

/**
 * Process parsed row records into Activos and Summary
 */
function processRows(
  rows: Record<string, any>[],
  existingActivos: Activo[]
): { activos: Activo[]; summary: ImportSummary } {
  const resultMap = new Map<string, Activo>();
  existingActivos.forEach((a) => resultMap.set(a.codigo.toLowerCase(), { ...a }));

  let nuevos = 0;
  let actualizados = 0;
  let errores = 0;
  const detallesErrores: string[] = [];

  rows.forEach((row, idx) => {
    try {
      const activo = mapRowToActivo(row, resultMap.size + idx);
      if (!activo) {
        return; // empty or header repeat row
      }

      const key = activo.codigo.toLowerCase();
      if (resultMap.has(key)) {
        actualizados++;
        resultMap.set(key, { ...resultMap.get(key)!, ...activo });
      } else {
        nuevos++;
        resultMap.set(key, activo);
      }
    } catch (e: any) {
      errores++;
      if (detallesErrores.length < 10) {
        detallesErrores.push(`Fila ${idx + 1}: ${e?.message || 'Error de formato'}`);
      }
    }
  });

  const finalActivos = Array.from(resultMap.values());

  return {
    activos: finalActivos,
    summary: {
      total: finalActivos.length,
      nuevos,
      actualizados,
      errores,
      detallesErrores,
    },
  };
}
