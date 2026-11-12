import React, { useState, useMemo } from 'react';
import {
  Archive,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Activo } from '../types';
import { formatCOP, formatNumber, exportToExcel } from '../utils/formatters';

interface BajasViewProps {
  activos: Activo[];
  onSelectActivo: (activo: Activo) => void;
}

export const BajasView: React.FC<BajasViewProps> = ({ activos, onSelectActivo }) => {
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'tipo1' | 'tipo2'>('todos');

  // Tipo 1: Depreciado (obsoleto o retirado)
  const tipo1List = useMemo(() => activos.filter((a) => a.estado === 'Depreciado'), [activos]);

  // Tipo 2: Saldo <= 0 pero sigue Activo (100% depreciado pero en servicio)
  const tipo2List = useMemo(
    () => activos.filter((a) => a.saldo_por_depreciar <= 0 && a.estado === 'Activo'),
    [activos]
  );

  const displayedActivos = useMemo(() => {
    if (tipoFiltro === 'tipo1') return tipo1List;
    if (tipoFiltro === 'tipo2') return tipo2List;
    return [...tipo1List, ...tipo2List];
  }, [tipoFiltro, tipo1List, tipo2List]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            Control de Bajas y Activos Totalmente Depreciados
          </h2>
          <p className="text-xs text-slate-500">
            Clasificación de equipos retirados por obsolescencia (Tipo 1) y equipos sin saldo aún en servicio (Tipo 2)
          </p>
        </div>

        <button
          onClick={() => exportToExcel(displayedActivos, 'HILA_Bajas_Activos')}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Bajas a Excel</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tipo 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-rose-500" />
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Baja Tipo 1 — Depreciados
            </span>
            <Archive className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{formatNumber(tipo1List.length)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Activo obsoleto retirado del servicio hospitalario
          </div>
        </div>

        {/* Tipo 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-amber-500" />
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Baja Tipo 2 — Sin Saldo
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{formatNumber(tipo2List.length)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Totalmente depreciado pero aún operativo
          </div>
        </div>

        {/* Total Bajas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Total Casos de Baja
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatNumber(tipo1List.length + tipo2List.length)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Sujetos a revisión de comité de activos
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setTipoFiltro('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            tipoFiltro === 'todos' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todos ({tipo1List.length + tipo2List.length})
        </button>
        <button
          onClick={() => setTipoFiltro('tipo1')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            tipoFiltro === 'tipo1' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tipo 1 — Depreciados ({tipo1List.length})
        </button>
        <button
          onClick={() => setTipoFiltro('tipo2')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            tipoFiltro === 'tipo2' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tipo 2 — Sin Saldo ({tipo2List.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-3 text-center">Clasificación Baja</th>
                <th className="py-3 px-3">Centro Costos</th>
                <th className="py-3 px-3">Funcionario / Custodio</th>
                <th className="py-3 px-4 text-right">Valor Histórico</th>
                <th className="py-3 px-4 text-right">Deprec. Acumulada</th>
                <th className="py-3 px-4 text-right">Saldo Remanente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedActivos.length > 0 ? (
                displayedActivos.map((a) => {
                  const isTipo1 = a.estado === 'Depreciado';
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onSelectActivo(a)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {a.codigo}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="truncate max-w-sm">{a.descripcion}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.marca && `${a.marca} · `}
                          {a.ubicacion}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isTipo1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Tipo 1 — Depreciado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Tipo 2 — Sin Saldo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{a.centro_costos}</td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]">{a.funcionario}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                        {formatCOP(a.valor_historico)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-semibold whitespace-nowrap">
                        {formatCOP(a.depreciacion_acumulada)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCOP(a.saldo_por_depreciar)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron activos para esta clasificación de baja.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
