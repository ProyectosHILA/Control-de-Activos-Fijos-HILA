import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Plus,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Boxes,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2
} from 'lucide-react';
import { Activo, TabType } from '../types';
import { formatCOP, formatNumber, exportToCSV } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ActivosViewProps {
  activos: Activo[];
  onSelectActivo: (activo: Activo) => void;
  onOpenNewActivo: () => void;
  onNavigate: (tab: TabType) => void;
  onDeleteActivo?: (id: string | number) => void;
  onBulkDeleteActivos?: (ids: (string | number)[]) => void;
  canDelete?: boolean;
  initialQuery?: string;
}

export const ActivosView: React.FC<ActivosViewProps> = ({
  activos,
  onSelectActivo,
  onOpenNewActivo,
  onNavigate,
  onDeleteActivo,
  onBulkDeleteActivos,
  canDelete = true,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedCentro, setSelectedCentro] = useState<string>('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Activo>('codigo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const pageSize = 25;

  // In-app Delete Confirmation Dialog State (never use window.confirm in iframe)
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [activoToDelete, setActivoToDelete] = useState<Activo | null>(null);
  const [isBulkDeleteModal, setIsBulkDeleteModal] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Extract unique filter choices
  const centrosList = useMemo(() => {
    const set = new Set<string>();
    activos.forEach((a) => {
      if (a.centro_costos) set.add(a.centro_costos.trim());
    });
    return Array.from(set).sort();
  }, [activos]);

  const gruposList = useMemo(() => {
    const set = new Set<string>();
    activos.forEach((a) => {
      if (a.grupo) set.add(a.grupo.trim());
    });
    return Array.from(set).sort();
  }, [activos]);

  // Filter and sort items
  const filteredActivos = useMemo(() => {
    let result = activos.filter((a) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (a.codigo || '').toLowerCase().includes(q);
        const matchesDesc = (a.descripcion || '').toLowerCase().includes(q);
        const matchesFunc = (a.funcionario || '').toLowerCase().includes(q);
        const matchesCentro = (a.centro_costos || '').toLowerCase().includes(q);
        const matchesUbic = (a.ubicacion || '').toLowerCase().includes(q);
        const matchesMarca = (a.marca || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesDesc && !matchesFunc && !matchesCentro && !matchesUbic && !matchesMarca) {
          return false;
        }
      }

      // Estado filter
      if (selectedEstado && (a.estado || '').toLowerCase() !== selectedEstado.toLowerCase()) {
        return false;
      }

      // Centro filter
      if (selectedCentro && (a.centro_costos || '').toLowerCase() !== selectedCentro.toLowerCase()) {
        return false;
      }

      // Grupo filter
      if (selectedGrupo && (a.grupo || '').toLowerCase() !== selectedGrupo.toLowerCase()) {
        return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const res = (valA as string).localeCompare((valB as string) || '');
        return sortAsc ? res : -res;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      return 0;
    });

    return result;
  }, [activos, searchQuery, selectedEstado, selectedCentro, selectedGrupo, sortField, sortAsc]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredActivos.length / pageSize) || 1;
  const paginatedActivos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivos.slice(start, start + pageSize);
  }, [filteredActivos, currentPage, pageSize]);

  const handleSort = (field: keyof Activo) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEstado('');
    setSelectedCentro('');
    setSelectedGrupo('');
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedActivos.length && paginatedActivos.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(paginatedActivos.map((a) => a.id));
      setSelectedIds(allIds);
    }
  };

  // Open single delete confirmation modal
  const handleOpenDeleteSingle = (a: Activo, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivoToDelete(a);
    setIsBulkDeleteModal(false);
    setConfirmModalOpen(true);
  };

  // Open bulk delete confirmation modal
  const handleOpenBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setActivoToDelete(null);
    setIsBulkDeleteModal(true);
    setConfirmModalOpen(true);
  };

  // Execute deletion when user confirms in modal
  const handleConfirmDelete = () => {
    if (isBulkDeleteModal) {
      const ids = Array.from(selectedIds);
      onBulkDeleteActivos?.(ids);
      setSelectedIds(new Set());
      setNotificationMsg(`Se eliminaron ${ids.length} activos exitosamente.`);
    } else if (activoToDelete) {
      onDeleteActivo?.(activoToDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(activoToDelete.id);
        return next;
      });
      setNotificationMsg(`Activo ${activoToDelete.codigo} eliminado exitosamente.`);
    }

    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Inventario Maestro de Activos Fijos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {formatNumber(filteredActivos.length)} Registros
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Explora, busca, filtra y gestiona la base completa de activos hospitalarios con sincronización en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canDelete && selectedIds.size > 0 && (
            <button
              onClick={handleOpenBulkDelete}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm animate-in fade-in cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar {selectedIds.size} Seleccionados</span>
            </button>
          )}

          <button
            onClick={() => exportToCSV(filteredActivos, 'HILA_Activos_Filtrados.csv')}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar registros filtrados a CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => onNavigate('importacion')}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Importar archivo"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onOpenNewActivo}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Activo</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Main search input */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por código, descripción, funcionario, marca..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Filter: Estado */}
          <div className="lg:col-span-2">
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todos los Estados</option>
              <option value="Activo">Activo</option>
              <option value="Depreciado">Depreciado</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Dado de Baja">Dado de Baja</option>
            </select>
          </div>

          {/* Filter: Centro de Costos */}
          <div className="lg:col-span-3">
            <select
              value={selectedCentro}
              onChange={(e) => {
                setSelectedCentro(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
            >
              <option value="">Todos los Centros de Costo</option>
              {centrosList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Grupo */}
          <div className="lg:col-span-2">
            <select
              value={selectedGrupo}
              onChange={(e) => {
                setSelectedGrupo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 truncate"
            >
              <option value="">Todos los Grupos</option>
              {gruposList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear filters indicator if any active */}
        {(searchQuery || selectedEstado || selectedCentro || selectedGrupo) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtros aplicados ({filteredActivos.length} resultados)</span>
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 select-none">
              <tr>
                {canDelete && (
                  <th className="py-3 px-3 text-center w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-blue-600 cursor-pointer"
                      title="Seleccionar todos de esta página"
                    >
                      {selectedIds.size > 0 && selectedIds.size === paginatedActivos.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th
                  onClick={() => handleSort('codigo')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('descripcion')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Descripción</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2.5 text-center">Estado</th>
                <th
                  onClick={() => handleSort('centro_costos')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Centro Costos</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Funcionario</th>
                <th
                  onClick={() => handleSort('valor_historico')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Valor Histórico</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('depreciacion_acumulada')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Deprec. Acum.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('saldo_por_depreciar')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Saldo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedActivos.length > 0 ? (
                paginatedActivos.map((a) => {
                  const isSelected = selectedIds.has(a.id);
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onSelectActivo(a)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      {canDelete && (
                        <td
                          className="py-3 px-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(a.id);
                          }}
                        >
                          <button
                            type="button"
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {a.codigo}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="truncate max-w-sm" title={a.descripcion}>
                          {a.descripcion}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {a.marca && <span>{a.marca} &middot; </span>}
                          <span>{a.grupo}</span>
                          {a.pol && <span className="ml-1 text-slate-500">· POL: {a.pol}</span>}
                          {a.man && <span className="ml-1 text-slate-500">· MAN: {a.man}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.estado === 'Activo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                          }`}
                        >
                          {a.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {a.centro_costos || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]" title={a.funcionario}>
                        {a.funcionario || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCOP(a.valor_historico)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-medium whitespace-nowrap">
                        {formatCOP(a.depreciacion_acumulada)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-medium whitespace-nowrap">
                        {formatCOP(a.saldo_por_depreciar)}
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectActivo(a)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Ver Ficha Técnica"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={(e) => handleOpenDeleteSingle(a, e)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar activo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canDelete ? 10 : 9} className="py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No se encontraron activos con los filtros especificados</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50">
            <div>
              Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> &middot;{' '}
              {formatNumber(filteredActivos.length)} activos totales
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="px-2 text-xs font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-app Delete Confirmation Modal: asks "esta seguro de eliminar, si no" */}
      <DeleteConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setActivoToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        activo={activoToDelete}
        count={isBulkDeleteModal ? selectedIds.size : 1}
      />
    </div>
  );
};
