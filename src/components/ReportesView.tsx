import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  FileCheck,
  TrendingDown,
  Printer,
  Sparkles,
  Building,
  Calendar,
  Layers,
  FileText,
  Upload,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';
import { Activo, DocumentoSubido } from '../types';
import {
  exportToOfficialExcel,
  exportToOfficialCSV,
  exportToExcel,
  fillAndExportCustomTemplate,
  formatNumber
} from '../utils/formatters';
import { HospitalLogo } from './HospitalLogo';

interface ReportesViewProps {
  activos: Activo[];
  documentos?: DocumentoSubido[];
}

export const ReportesView: React.FC<ReportesViewProps> = ({ activos, documentos = [] }) => {
  const [filterCentro, setFilterCentro] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterGrupo, setFilterGrupo] = useState<string>('');
  const [filterDocumento, setFilterDocumento] = useState<string>('');
  const [codigoFormato, setCodigoFormato] = useState<string>('Codigo: FO03_PR13_RF       V2');
  const [fechaDocumento, setFechaDocumento] = useState<string>('Fecha: Enero 02 de 2025');
  const [responsable, setResponsable] = useState<string>('Responsable: Jefe de\nactivos fijos');

  // Custom template state
  const [customTemplate, setCustomTemplate] = useState<{
    hasTemplate: boolean;
    filename?: string;
    base64?: string;
    updatedAt?: string;
  }>({ hasTemplate: false });
  const [templateLoading, setTemplateLoading] = useState<boolean>(false);
  const [templateStatusMessage, setTemplateStatusMessage] = useState<string | null>(null);
  const fileTemplateInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom template from server or localStorage on mount
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch('/api/template');
        if (res.ok) {
          const data = await res.json();
          if (data.hasTemplate && data.base64) {
            setCustomTemplate(data);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not fetch template from server, checking local storage:', e);
      }

      // Local storage fallback
      try {
        const local = localStorage.getItem('hila_custom_template');
        if (local) {
          const parsed = JSON.parse(local);
          setCustomTemplate({ hasTemplate: true, ...parsed });
        }
      } catch {}
    };

    fetchTemplate();
  }, []);

  // Handle uploading user template (.xlsx)
  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setTemplateStatusMessage('Por favor selecciona un archivo de plantilla Excel válido (.xlsx)');
      return;
    }

    setTemplateLoading(true);
    setTemplateStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        // Save to server
        const res = await fetch('/api/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64,
          }),
        });

        // Also save to localStorage
        localStorage.setItem(
          'hila_custom_template',
          JSON.stringify({ filename: file.name, base64, updatedAt: new Date().toISOString() })
        );

        setCustomTemplate({
          hasTemplate: true,
          filename: file.name,
          base64,
          updatedAt: new Date().toISOString(),
        });
        setTemplateStatusMessage(`Plantilla "${file.name}" cargada y guardada con éxito para futuros reportes.`);
      } catch (err: any) {
        setTemplateStatusMessage('Error al guardar la plantilla: ' + err.message);
      } finally {
        setTemplateLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Remove custom template and restore default
  const handleResetTemplate = async () => {
    try {
      await fetch('/api/template', { method: 'DELETE' });
    } catch {}
    localStorage.removeItem('hila_custom_template');
    setCustomTemplate({ hasTemplate: false });
    setTemplateStatusMessage('Se ha restablecido la plantilla predeterminada FO03_PR13_RF V2.');
  };

  // Centros de costo list
  const centros = useMemo(() => {
    const set = new Set<string>();
    activos.forEach((a) => a.centro_costos && set.add(a.centro_costos.trim()));
    return Array.from(set).sort();
  }, [activos]);

  // Grupos list
  const grupos = useMemo(() => {
    const set = new Set<string>();
    activos.forEach((a) => a.grupo && set.add(a.grupo.trim()));
    return Array.from(set).sort();
  }, [activos]);

  // Filtered activos for the report
  const reportActivos = useMemo(() => {
    return activos.filter((a) => {
      if (filterCentro && a.centro_costos !== filterCentro) return false;
      if (filterEstado && a.estado !== filterEstado) return false;
      if (filterGrupo && a.grupo !== filterGrupo) return false;
      if (filterDocumento && (a.documentId || 'doc_base') !== filterDocumento) return false;
      return true;
    });
  }, [activos, filterCentro, filterEstado, filterGrupo, filterDocumento]);

  // OPCIÓN 1: EXPORTAR REPORTE COMPLETO (Conserva todos los campos y la lógica exacta previa)
  const handleExportReporteCompleto = () => {
    const centroName = filterCentro || 'TODOS_LOS_CENTROS';
    const cleanCentro = centroName.replace(/[^a-zA-Z0-9]/g, '_');
    exportToExcel(reportActivos, `HILA_Reporte_Completo_${cleanCentro}`);
  };

  // OPCIÓN 2: EXPORTAR FORMATO INSTITUCIONAL HILA (Exactamente 8 columnas)
  const handleExportFormatoInstitucionalHILA = () => {
    const centroName = filterCentro || 'TODOS_LOS_CENTROS';
    const cleanCentro = centroName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `HILA_Formato_Institucional_${cleanCentro}`;

    // If custom template uploaded by user exists, fill into it
    if (customTemplate.hasTemplate && customTemplate.base64) {
      const success = fillAndExportCustomTemplate(customTemplate.base64, reportActivos, {
        centroCosto: filterCentro || 'TODOS LOS CENTROS DE COSTO',
        filename,
      });
      if (success) return;
    }

    // Default institutional format FO03_PR13_RF V2 with exact 8 columns
    exportToOfficialExcel(reportActivos, {
      centroCosto: filterCentro || 'TODOS LOS CENTROS DE COSTO',
      fecha: fechaDocumento,
      responsable,
      codigoFormato,
      filename,
    });
  };

  const handleDownloadCSVOficial = () => {
    const centroName = filterCentro || 'TODOS_LOS_CENTROS';
    const cleanCentro = centroName.replace(/[^a-zA-Z0-9]/g, '_');
    exportToOfficialCSV(reportActivos, {
      centroCosto: filterCentro || 'TODOS LOS CENTROS DE COSTO',
      filename: `HILA_FO03_PR13_RF_V2_${cleanCentro}`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Módulo de Exportación y Reportes Institucionales
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Hospital Infantil Los Ángeles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Elige entre el reporte contable completo o el formato institucional reglamentario de 8 columnas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Imprimir o guardar en PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>

          <button
            onClick={handleDownloadCSVOficial}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Descargar en formato CSV oficial"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">CSV Oficial</span>
          </button>
        </div>
      </div>

      {/* Two Export Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opción 1: Reporte Completo */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-white border-2 border-emerald-300/80 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Opción 1: Integral
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                16 columnas + Resúmenes
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exportar reporte completo
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Conserva <strong>todos los campos disponibles</strong> de la base de datos (valores de compra, valor histórico, depreciaciones, saldos, ubicación, funcionario) con hojas de resumen contable por Centro de Costos y Funcionarios.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExportReporteCompleto}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar reporte completo (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Opción 2: Formato Institucional HILA (8 columnas) */}
        <div className="bg-gradient-to-br from-blue-50/80 to-white border-2 border-blue-400 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 bg-blue-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Opción 2: Institucional
              </span>
              <span className="text-[11px] font-semibold text-blue-600">
                Exactamente 8 columnas HILA
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Exportar formato institucional HILA
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Genera el archivo con únicamente las <strong>8 columnas oficiales reglamentarias</strong>: No, CODIGO ACTIVO, PLACA ACTIVO, DESCRIPSION, GRUPO, MARCA, MODELO, SERIE. Si cargaste tu plantilla personalizada, inyecta los datos directamente en ella.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExportFormatoInstitucionalHILA}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar formato institucional HILA (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Template Management Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Plantilla Institucional Excel del Hospital (.xlsx)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileTemplateInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUploadTemplate}
              className="hidden"
            />
            <button
              type="button"
              disabled={templateLoading}
              onClick={() => fileTemplateInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{customTemplate.hasTemplate ? 'Cambiar plantilla (.xlsx)' : 'Cargar plantilla desde mi PC'}</span>
            </button>

            {customTemplate.hasTemplate && (
              <button
                type="button"
                onClick={handleResetTemplate}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Volver a la plantilla predeterminada"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>
            )}
          </div>
        </div>

        {/* Template Status Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                customTemplate.hasTemplate ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
              }`}
            />
            <span className="text-slate-700">
              {customTemplate.hasTemplate ? (
                <>
                  <strong>Plantilla personalizada activa:</strong>{' '}
                  <span className="text-blue-700 font-mono font-bold">
                    {customTemplate.filename}
                  </span>{' '}
                  (guardada permanentemente en el sistema para todos tus reportes)
                </>
              ) : (
                <>
                  <strong>Plantilla en uso:</strong> Plantilla institucional predeterminada{' '}
                  <span className="font-mono text-slate-900 font-bold">FO03_PR13_RF V2</span> (8 columnas exactas con membrete y firmas). Puedes subir la tuya propia en cualquier momento con el botón superior.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="bg-slate-200/80 px-2 py-0.5 rounded font-mono font-medium">
              8 Columnas Reglamentarias
            </span>
          </div>
        </div>

        {templateStatusMessage && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{templateStatusMessage}</span>
          </div>
        )}

        {/* 8 Columns chips display */}
        <div className="pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Estructura de las 8 columnas institucionales garantizada:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              '1. No',
              '2. CODIGO ACTIVO',
              '3. PLACA ACTIVO',
              '4. DESCRIPSION',
              '5. GRUPO',
              '6. MARCA',
              '7. MODELO',
              '8. SERIE'
            ].map((col, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-mono font-semibold"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Criteria Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            Filtros para el Reporte
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {formatNumber(reportActivos.length)} activos incluidos en este reporte
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Centro de Costo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Centro de Costo
            </label>
            <select
              value={filterCentro}
              onChange={(e) => setFilterCentro(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
            >
              <option value="">TODOS LOS CENTROS DE COSTO</option>
              {centros.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Estado del Activo
            </label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todos los Estados</option>
              <option value="Activo">Solo Activos (Vigentes)</option>
              <option value="Depreciado">Solo Depreciados</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Dado de Baja">Dado de Baja</option>
            </select>
          </div>

          {/* Grupo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Grupo / Categoría
            </label>
            <select
              value={filterGrupo}
              onChange={(e) => setFilterGrupo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
            >
              <option value="">Todos los Grupos</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Documento / Lote */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Lote / Archivo Origen
            </label>
            <select
              value={filterDocumento}
              onChange={(e) => setFilterDocumento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
            >
              <option value="">Todos los Documentos Habilitados</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombrePersonalizado || d.nombreArchivo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filterCentro || filterEstado || filterGrupo || filterDocumento) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setFilterCentro('');
                setFilterEstado('');
                setFilterGrupo('');
                setFilterDocumento('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Official Form Sheet Preview Card */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-md overflow-hidden print:border-none print:shadow-none">
        {/* Printable/Exportable Official Header */}
        <div className="p-6 sm:p-8 bg-white border-b border-slate-200 space-y-4">
          {/* Institutional Top Grid */}
          <div className="grid grid-cols-12 gap-4 items-center border border-slate-300 p-4 rounded-xl bg-slate-50/50">
            {/* Logo and Institution */}
            <div className="col-span-12 sm:col-span-3 flex items-center gap-3">
              <HospitalLogo size="md" />
              <div className="leading-tight">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Institución
                </span>
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  HOSPITAL INFANTIL
                </span>
                <span className="text-xs font-black text-blue-700 block tracking-tight">
                  LOS ÁNGELES
                </span>
              </div>
            </div>

            {/* Document Title Center */}
            <div className="col-span-12 sm:col-span-6 text-center border-y sm:border-y-0 sm:border-x border-slate-300 py-2 sm:py-0 px-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-wide uppercase">
                INVENTARIO DE ACTIVOS FIJOS
              </h3>
              <span className="text-xs text-slate-600 block mt-0.5 font-medium">
                Hospital Infantil Los Ángeles - Pasto, Nariño
              </span>
            </div>

            {/* Quality Code Box */}
            <div className="col-span-12 sm:col-span-3 text-right sm:text-right space-y-0.5 text-xs text-slate-700">
              <div className="font-mono font-bold text-slate-900 text-[11px] bg-slate-200/70 px-2 py-0.5 rounded inline-block">
                FO03_PR13_RF V2
              </div>
              <div className="text-[11px] text-slate-600">
                Fecha: Enero 02 de 2025
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                Responsable: Jefe de activos fijos
              </div>
            </div>
          </div>

          {/* Subheader: Centro de Costo, Pagina, Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                CENTRO DE COSTO:
              </span>
              <span className="font-bold text-slate-800 text-sm">
                {filterCentro ? filterCentro.toUpperCase() : 'TODOS LOS CENTROS DE COSTO'}
              </span>
            </div>

            <div className="sm:text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                PÁGINA:
              </span>
              <span className="font-bold text-slate-800 text-sm">
                1 de 1
              </span>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                FECHA DE EMISIÓN:
              </span>
              <span className="font-bold text-slate-800 text-sm">
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">No</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">CÓDIGO ACTIVO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">PLACA ACTIVO</th>
                <th className="py-2.5 px-4 border-r border-slate-200 min-w-[240px]">DESCRIPCIÓN</th>
                <th className="py-2.5 px-3 border-r border-slate-200">GRUPO</th>
                <th className="py-2.5 px-3 border-r border-slate-200">MARCA</th>
                <th className="py-2.5 px-3 border-r border-slate-200">MODELO</th>
                <th className="py-2.5 px-3">SERIE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {reportActivos.length > 0 ? (
                reportActivos.slice(0, 150).map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500 font-sans">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-700 whitespace-nowrap">
                      {a.codigo}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                      {a.placa || a.pol || a.codigo}
                    </td>
                    <td className="py-2 px-4 border-r border-slate-200 font-sans text-slate-800 font-medium">
                      {a.descripcion}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600 font-sans whitespace-nowrap">
                      {a.grupo}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600 font-sans whitespace-nowrap">
                      {a.marca || 'Sin Marca'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600 font-sans whitespace-nowrap">
                      {a.modelo || a.subgrupo || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {a.serie || a.man || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    No hay activos para los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {reportActivos.length > 150 && (
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-center text-xs text-amber-800 font-semibold print:hidden">
            Vista previa en pantalla mostrando los primeros 150 registros. Al descargar en Excel (.xlsx) se descargarán todos los {formatNumber(reportActivos.length)} activos completos.
          </div>
        )}

        {/* Official Footer with Signatures matching Google Sheet */}
        <div className="p-6 sm:p-8 bg-slate-50/60 border-t border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Delivery signature */}
            <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3">
              <span className="text-xs font-bold text-slate-700 block uppercase">
                Firma e identificación de entrega
              </span>
              <div className="pt-8 border-b border-slate-400" />
              <div className="text-xs text-slate-600">
                <strong className="block text-[11px] uppercase text-slate-500">Nombre de quien firma:</strong>
                <span className="font-medium text-slate-800">Jefe de Activos Fijos / Responsable de Entrega</span>
              </div>
            </div>

            {/* Receiving signature */}
            <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3">
              <span className="text-xs font-bold text-slate-700 block uppercase">
                Firma e identificación de quien recibe
              </span>
              <div className="pt-8 border-b border-slate-400" />
              <div className="text-xs text-slate-600">
                <strong className="block text-[11px] uppercase text-slate-500">Nombre de quien firma:</strong>
                <span className="font-medium text-slate-800">
                  {filterCentro ? `Custodio de ${filterCentro}` : 'Custodio / Funcionario Responsable'}
                </span>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="border border-slate-300 rounded-xl p-4 bg-white">
            <span className="text-xs font-bold text-slate-700 block uppercase mb-1">
              Observación:
            </span>
            <p className="text-xs text-slate-500 italic">
              Activos verificados físicamente y confrontados contra el maestro contable del Hospital Infantil Los Ángeles.
            </p>
          </div>

          {/* Official Validity Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
            <span>Sistema Institucional de Activos Fijos - Hospital Infantil Los Ángeles</span>
            <span className="font-bold text-slate-700">Vigencia: 02/01/2027</span>
          </div>
        </div>
      </div>
    </div>
  );
};
