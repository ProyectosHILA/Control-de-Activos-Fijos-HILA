import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Database,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  ClipboardPaste,
  Sparkles
} from 'lucide-react';
import { Activo, ImportSummary, TabType } from '../types';
import { parseCSVFile, parseExcelFile } from '../utils/importer';
import { SAMPLE_ACTIVOS } from '../data/sampleData';
import { formatNumber, formatCOP } from '../utils/formatters';

interface ImportacionViewProps {
  currentActivos: Activo[];
  onImportComplete: (
    activos: Activo[],
    summary: ImportSummary,
    mode: 'add_batch' | 'replace' | 'merge',
    docMeta?: {
      nombreArchivo: string;
      nombrePersonalizado: string;
      tamano?: string;
    }
  ) => void;
  onNavigate: (tab: TabType) => void;
  isSyncingFirebase?: boolean;
}

const SAMPLE_PROMPT_CSV = `ACTIVO\tDESCRIPSION\tESTADO\tF.COMPRA\tVALOR COMPRA\tVALOR HIST.\tFUNCIONARIO\tGRUPO\tSUBGRUPO\tMARCA\tCENTRO COSTO\tUBICACIÓN\t\tF.ULTIMA DEPRECIACION\tDEPRECIACION ACUMULADA\tSALDO X DEPRECIAR\tPOL\tMAN
000321.\tPUESTO DE TRABAJO ENCHAPADO\tActivo\t24/07/2013\t595.000\t595.000\tNAILA LORENA MAYA GUERRERO\t'8315\t'91\tSin Marca\tAUDITORIA MEDICA\t'153\tAUDITORIA DE CUENTAS\t31/07/2018 10:25\t0\t595000\t'N\t'N
' 011753\tVAINA EXTERIOR METALICA\tActivo\t1/03/2023\t1.615.110\t1.615.110\tLUISA FERNANDA GUZMAN OCAÑA\t'1532\t'6\tKARL - STORZ\tSALA DE CIRUGIA\t'53\tSALA DE CIRUGIA\t30/04/2026 9:27\t622488\t992622\t'N\t'N`;

export const ImportacionView: React.FC<ImportacionViewProps> = ({
  currentActivos,
  onImportComplete,
  onNavigate,
  isSyncingFirebase = false,
}) => {
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [previewActivos, setPreviewActivos] = useState<Activo[]>([]);
  const [parsedSummary, setParsedSummary] = useState<ImportSummary | null>(null);
  const [rawCount, setRawCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; mode: string; docName?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setDocumentTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    setErrorMsg(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let result;
      if (ext === 'xlsx' || ext === 'xls') {
        result = await parseExcelFile(file, currentActivos);
      } else {
        result = await parseCSVFile(file, currentActivos);
      }

      setPreviewActivos(result.activos);
      setParsedSummary(result.summary);
      setRawCount(result.rawRowsCount);
    } catch (err: any) {
      setErrorMsg(`Error al procesar el archivo: ${err?.message || 'Formato no compatible'}`);
      setPreviewActivos([]);
      setParsedSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessText = async (textToProcess: string) => {
    const text = textToProcess.trim();
    if (!text) {
      setErrorMsg('Por favor ingresa o pega el contenido CSV / TSV.');
      return;
    }
    setErrorMsg(null);
    setSuccessInfo(null);
    setDocumentTitle(`Lote Manual ${new Date().toLocaleDateString('es-CO')}`);
    setLoading(true);

    try {
      const result = await parseCSVFile(text, currentActivos);
      setPreviewActivos(result.activos);
      setParsedSummary(result.summary);
      setRawCount(result.rawRowsCount);
    } catch (err: any) {
      setErrorMsg(`Error al procesar el texto CSV: ${err?.message || 'Error de parseo'}`);
      setPreviewActivos([]);
      setParsedSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleApplyImport = (mode: 'add_batch' | 'replace' | 'merge') => {
    if (!previewActivos.length || !parsedSummary) return;
    const finalDocName = documentTitle.trim() || selectedFile?.name || `Lote ${new Date().toLocaleDateString('es-CO')}`;
    const fileSizeStr = selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : undefined;

    onImportComplete(previewActivos, parsedSummary, mode, {
      nombreArchivo: selectedFile?.name || 'Carga_Manual.csv',
      nombrePersonalizado: finalDocName,
      tamano: fileSizeStr,
    });
    setSuccessInfo({ count: previewActivos.length, mode, docName: finalDocName });
  };

  const handleLoadPromptSample = () => {
    setPastedText(SAMPLE_PROMPT_CSV);
    setImportTab('paste');
    handleProcessText(SAMPLE_PROMPT_CSV);
  };

  const handleLoadFullSample = () => {
    setLoading(true);
    setTimeout(() => {
      const summary: ImportSummary = {
        total: SAMPLE_ACTIVOS.length,
        nuevos: SAMPLE_ACTIVOS.length,
        actualizados: 0,
        errores: 0,
        detallesErrores: [],
      };
      onImportComplete(SAMPLE_ACTIVOS, summary, 'replace');
      setSuccessInfo({ count: SAMPLE_ACTIVOS.length, mode: 'replace' });
      setLoading(false);
    }, 300);
  };

  const handleDownloadTemplate = () => {
    const headerLine = 'ACTIVO\tDESCRIPSION\tESTADO\tF.COMPRA\tVALOR COMPRA\tVALOR HIST.\tFUNCIONARIO\tGRUPO\tSUBGRUPO\tMARCA\tCENTRO COSTO\tUBICACIÓN\t\tF.ULTIMA DEPRECIACION\tDEPRECIACION ACUMULADA\tSALDO X DEPRECIAR\tPOL\tMAN\n';
    const row1 = "000321.\tPUESTO DE TRABAJO ENCHAPADO\tActivo\t24/07/2013\t595.000\t595.000\tNAILA LORENA MAYA GUERRERO\t'8315\t'91\tSin Marca\tAUDITORIA MEDICA\t'153\tAUDITORIA DE CUENTAS\t31/07/2018 10:25\t0\t595000\t'N\t'N\n";
    const row2 = "' 011753\tVAINA EXTERIOR METALICA\tActivo\t1/03/2023\t1.615.110\t1.615.110\tLUISA FERNANDA GUZMAN OCAÑA\t'1532\t'6\tKARL - STORZ\tSALA DE CIRUGIA\t'53\tSALA DE CIRUGIA\t30/04/2026 9:27\t622488\t992622\t'N\t'N\n";
    
    const blob = new Blob(['\uFEFF' + headerLine + row1 + row2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_HILA_Activos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            Importación y Sincronización de Activos
          </h2>
          <p className="text-xs text-slate-500">
            Carga o pega tus archivos CSV, TSV o Excel. Los activos se sincronizan automáticamente con Firebase Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar Plantilla CSV</span>
          </button>

          <button
            onClick={handleLoadPromptSample}
            className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Cargar registros de ejemplo: 000321 y 011753"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Probar Ejemplo HILA</span>
          </button>
        </div>
      </div>

      {/* Tabs: Archivo vs Pegar Texto */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setImportTab('file')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            importTab === 'file'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Subir Archivo (.csv, .xlsx, .tsv)</span>
        </button>

        <button
          onClick={() => setImportTab('paste')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            importTab === 'paste'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardPaste className="w-4 h-4" />
          <span>Pegar Texto CSV / TSV</span>
        </button>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 block">
                ¡Archivo guardado y sincronizado con éxito!
              </span>
              <span className="text-emerald-700">
                Se procesaron {formatNumber(successInfo.count)} activos para el documento "{successInfo.docName || 'Lote'}".
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('documentos')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Ver en Gestor Documental</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('activos')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Ver en Inventario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Error al procesar los datos</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Upload Zone / Text Area */}
      {importTab === 'file' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
              : 'border-slate-300 hover:border-blue-400 bg-white shadow-2xs hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
            {selectedFile ? selectedFile.name : 'Arrastra tu archivo CSV o Excel aquí'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Soporta delimitadores por coma, punto y coma o tabulación (.csv, .tsv, .xlsx, .xls)
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Seleccionar Archivo Local</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardPaste className="w-4 h-4 text-blue-600" />
              Pegar Texto CSV / TSV con columnas exactas HILA
            </span>
            <button
              onClick={() => setPastedText(SAMPLE_PROMPT_CSV)}
              className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Pegar Ejemplo de la Solicitud
            </button>
          </div>

          <textarea
            rows={7}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Pega aquí los datos con encabezados:\nACTIVO\tDESCRIPSION\tESTADO\tF.COMPRA\tVALOR COMPRA\tVALOR HIST.\tFUNCIONARIO\t...`}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPastedText('')}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Limpiar
            </button>
            <button
              onClick={() => handleProcessText(pastedText)}
              disabled={loading || !pastedText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Analizar y Previsualizar'}
            </button>
          </div>
        </div>
      )}

      {/* Expected Headers Info */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="font-bold text-slate-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Columnas Reconocidas Automáticamente (Formato Oficial HILA):
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {[
            'ACTIVO',
            'DESCRIPSION',
            'ESTADO',
            'F.COMPRA',
            'VALOR COMPRA',
            'VALOR HIST.',
            'FUNCIONARIO',
            'GRUPO',
            'SUBGRUPO',
            'MARCA',
            'CENTRO COSTO',
            'UBICACIÓN',
            'F.ULTIMA DEPRECIACION',
            'DEPRECIACION ACUMULADA',
            'SALDO X DEPRECIAR',
            'POL',
            'MAN'
          ].map((col) => (
            <span key={col} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Data Preview & Confirmation Card */}
      {previewActivos.length > 0 && parsedSummary && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4 p-5 animate-in fade-in">
          {/* Header Summary Row */}
          <div className="border-b border-slate-200 pb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Previsualización de Datos ({formatNumber(previewActivos.length)} registros listos para guardar)
                </h3>
                <p className="text-xs text-slate-500">
                  Filas leídas: {formatNumber(rawCount)} &middot; Nuevos: {formatNumber(parsedSummary.nuevos)} &middot;
                  Actualizados: {formatNumber(parsedSummary.actualizados)}
                </p>
              </div>
            </div>

            {/* Document Batch Name & Action Choice */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Etiqueta del Documento en Gestor Documental:
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Ejemplo: Inventario Abril 2025"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Este archivo se guardará como un lote independiente. Podrás activar/desactivar sus {formatNumber(previewActivos.length)} activos en cualquier momento.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                  <button
                    onClick={() => handleApplyImport('add_batch')}
                    disabled={isSyncingFirebase}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" />
                    <span>Guardar como Nuevo Documento</span>
                  </button>

                  <button
                    onClick={() => handleApplyImport('replace')}
                    disabled={isSyncingFirebase}
                    className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Reemplaza todos los datos del inventario por este archivo"
                  >
                    <span>Reemplazar Todo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Table (First 10 rows) */}
          <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-2.5 text-center">Estado</th>
                  <th className="py-2.5 px-3">Centro Costos</th>
                  <th className="py-2.5 px-3">Funcionario</th>
                  <th className="py-2.5 px-3 text-right">Valor Histórico</th>
                  <th className="py-2.5 px-3 text-right">Saldo</th>
                  <th className="py-2.5 px-2 text-center">POL/MAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewActivos.slice(0, 10).map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {a.codigo}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-xs">
                      {a.descripcion}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{a.centro_costos}</td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">{a.funcionario}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatCOP(a.valor_historico)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-semibold whitespace-nowrap">
                      {formatCOP(a.saldo_por_depreciar)}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px]">
                      {a.pol || '-'}/{a.man || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewActivos.length > 10 && (
            <p className="text-[11px] text-slate-400 text-center">
              Mostrando las primeras 10 filas de {formatNumber(previewActivos.length)} registros procesados.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
