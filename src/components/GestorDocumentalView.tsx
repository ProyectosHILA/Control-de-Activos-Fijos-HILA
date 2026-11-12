import React, { useState } from 'react';
import {
  FolderArchive,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Download,
  AlertTriangle,
  X,
  Plus,
  Layers,
  Database,
  Calendar,
  Check
} from 'lucide-react';
import { DocumentoSubido, Activo, TabType } from '../types';
import { formatCOP, formatNumber, exportToOfficialExcel } from '../utils/formatters';

interface GestorDocumentalViewProps {
  documentos: DocumentoSubido[];
  activos: Activo[];
  onToggleDocumento: (docId: string) => void;
  onDeleteDocumento: (docId: string) => void;
  onRenameDocumento: (docId: string, nuevoNombre: string) => void;
  onNavigate: (tab: TabType) => void;
  onSelectActivo: (activo: Activo) => void;
}

export const GestorDocumentalView: React.FC<GestorDocumentalViewProps> = ({
  documentos,
  activos,
  onToggleDocumento,
  onDeleteDocumento,
  onRenameDocumento,
  onNavigate,
  onSelectActivo,
}) => {
  const [docToDelete, setDocToDelete] = useState<DocumentoSubido | null>(null);
  const [docToInspect, setDocToInspect] = useState<DocumentoSubido | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // Stats
  const totalDocs = documentos.length;
  const activeDocs = documentos.filter((d) => d.activoVisible).length;
  const totalActivosInDB = activos.length;

  const activeDocIds = new Set(
    documentos.filter((d) => d.activoVisible).map((d) => d.id)
  );

  const visibleActivosCount = activos.filter((a) => {
    if (!a.documentId) return activeDocIds.has('doc_base');
    return activeDocIds.has(a.documentId);
  }).length;

  const handleStartRename = (doc: DocumentoSubido) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.nombrePersonalizado || doc.nombreArchivo);
  };

  const handleSaveRename = (docId: string) => {
    if (editTitle.trim()) {
      onRenameDocumento(docId, editTitle.trim());
    }
    setEditingDocId(null);
  };

  const handleToggleAll = (enable: boolean) => {
    documentos.forEach((d) => {
      if (d.activoVisible !== enable) {
        onToggleDocumento(d.id);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-blue-600" />
              Gestor Documental y Control de Lotes
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {totalDocs} Archivos Registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Activa o desactiva los documentos para controlar qué datos son visibles en el inventario, reportes y gráficos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleAll(true)}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Habilitar todos los archivos"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Habilitar Todos</span>
          </button>

          <button
            onClick={() => handleToggleAll(false)}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Ocultar todos los archivos"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Deshabilitar Todos</span>
          </button>

          <button
            onClick={() => onNavigate('importacion')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Nuevo Archivo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Documentos Cargados
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{totalDocs}</span>
            <span className="text-xs font-semibold text-slate-500">archivos guardados</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Documentos Activos
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{activeDocs}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              de {totalDocs} visibles
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Activos Visibles Ahora
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600">{formatNumber(visibleActivosCount)}</span>
            <span className="text-xs font-semibold text-slate-500">en pantalla</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Activos en Base
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-700">{formatNumber(totalActivosInDB)}</span>
            <span className="text-xs text-slate-400">almacenados</span>
          </div>
        </div>
      </div>

      {/* Main Document List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Listado de Documentos y Lotes Cargados
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Usa el interruptor para mostrar u ocultar los registros de cada archivo
          </span>
        </div>

        {documentos.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-1" />
            <p className="text-sm font-semibold text-slate-600">No hay documentos registrados</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Sube tus archivos de inventario en Excel (.xlsx) o CSV para gestionarlos y activarlos aquí.
            </p>
            <button
              onClick={() => onNavigate('importacion')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Cargar mi primer archivo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documentos.map((doc) => {
              const isVisible = doc.activoVisible;
              const isEditing = editingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isVisible ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50/70 opacity-75'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isVisible
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-slate-200 text-slate-500 border-slate-300'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(doc.id);
                              if (e.key === 'Escape') setEditingDocId(null);
                            }}
                            className="flex-1 px-2.5 py-1 text-xs font-bold bg-white border border-blue-400 rounded-md focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(doc.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Guardar nombre"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingDocId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800 truncate">
                            {doc.nombrePersonalizado || doc.nombreArchivo}
                          </h4>
                          <button
                            onClick={() => handleStartRename(doc)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Renombrar etiqueta del documento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {doc.nombreArchivo}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {doc.fechaCarga}
                        </span>
                        {doc.tamano && (
                          <span className="text-[11px] text-slate-400">· {doc.tamano}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                        <span className="font-semibold text-slate-700">
                          {formatNumber(doc.totalActivos)} activos
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">
                          Valor: <strong className="text-slate-900">{formatCOP(doc.valorTotal)}</strong>
                        </span>
                        {doc.depreciacionTotal > 0 && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-rose-600">
                              Deprec: {formatCOP(doc.depreciacionTotal)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Toggle Switch and Actions */}
                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleDocumento(doc.id)}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isVisible ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={isVisible}
                      title={isVisible ? 'Desactivar para ocultar datos' : 'Activar para mostrar datos'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isVisible ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isVisible
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isVisible ? 'Visible' : 'Oculto'}
                    </span>

                    {/* View assets of this doc */}
                    <button
                      onClick={() => setDocToInspect(doc)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Ver activos incluidos en este archivo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Export official report for this file */}
                    <button
                      onClick={() => {
                        const fileActivos = activos.filter(
                          (a) => (a.documentId || 'doc_base') === doc.id
                        );
                        exportToOfficialExcel(fileActivos, {
                          filename: `HILA_FO03_PR13_RF_V2_${doc.nombrePersonalizado.replace(/\s+/g, '_')}`,
                        });
                      }}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Descargar este archivo en formato oficial FO03_PR13_RF V2 (.xlsx)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete file and assets button */}
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar este archivo y sus activos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal for Document */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-rose-900">
                  ¿Está seguro de eliminar este documento?
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Esta acción eliminará el archivo y todos sus {docToDelete.totalActivos} activos asociados de forma permanente.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Documento:</span>
                  <span className="font-bold text-slate-800">
                    {docToDelete.nombrePersonalizado || docToDelete.nombreArchivo}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-medium">Archivo original:</span>
                  <span className="font-mono text-slate-700">{docToDelete.nombreArchivo}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-medium">Activos a eliminar:</span>
                  <span className="font-bold text-rose-600">{formatNumber(docToDelete.totalActivos)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDocToDelete(null)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>No, Cancelar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDeleteDocumento(docToDelete.id);
                    setDocToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sí, Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Document Assets Modal */}
      {docToInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Activos del Archivo: {docToInspect.nombrePersonalizado || docToInspect.nombreArchivo}
                </h3>
                <p className="text-xs text-slate-500">
                  {docToInspect.totalActivos} registros &middot; Valor {formatCOP(docToInspect.valorTotal)}
                </p>
              </div>
              <button
                onClick={() => setDocToInspect(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="divide-y divide-slate-100">
                {activos
                  .filter((a) => (a.documentId || 'doc_base') === docToInspect.id)
                  .slice(0, 100)
                  .map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setDocToInspect(null);
                        onSelectActivo(a);
                      }}
                      className="py-2.5 px-2 hover:bg-blue-50/50 rounded-lg flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-700 w-24 truncate">
                          {a.codigo}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800 block truncate max-w-sm">
                            {a.descripcion}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {a.centro_costos} &middot; {a.grupo}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCOP(a.valor_historico)}
                        </span>
                        <span className="text-[10px] text-slate-500">{a.estado}</span>
                      </div>
                    </div>
                  ))}
              </div>
              {docToInspect.totalActivos > 100 && (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  Mostrando los primeros 100 de {docToInspect.totalActivos} activos.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDocToInspect(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
