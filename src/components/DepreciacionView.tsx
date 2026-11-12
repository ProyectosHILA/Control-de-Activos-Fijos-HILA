import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  DollarSign,
  Wallet,
  Percent,
  Download,
  Filter,
  ArrowUpDown,
  Boxes
} from 'lucide-react';
import { Activo } from '../types';
import { formatCOP, formatShortCurrency, formatNumber, exportToExcel } from '../utils/formatters';

interface DepreciacionViewProps {
  activos: Activo[];
  onSelectActivo: (activo: Activo) => void;
}

export const DepreciacionView: React.FC<DepreciacionViewProps> = ({ activos, onSelectActivo }) => {
  const [filtro, setFiltro] = useState<'todos' | 'depreciados' | 'vigentes' | 'sin_saldo'>('todos');
  const [sortAsc, setSortAsc] = useState(false);

  // Financial Stats
  const totalHistorico = useMemo(() => activos.reduce((sum, a) => sum + a.valor_historico, 0), [activos]);
  const totalDepre = useMemo(() => activos.reduce((sum, a) => sum + a.depreciacion_acumulada, 0), [activos]);
  const totalSaldo = useMemo(() => activos.reduce((sum, a) => sum + a.saldo_por_depreciar, 0), [activos]);
  const pctDepre = totalHistorico > 0 ? ((totalDepre / totalHistorico) * 100).toFixed(1) : '0';

  // Filtered Assets
  const filteredActivos = useMemo(() => {
    let result = activos.filter((a) => {
      if (filtro === 'depreciados') return a.estado === 'Depreciado';
      if (filtro === 'vigentes') return a.estado === 'Activo';
      if (filtro === 'sin_saldo') return a.saldo_por_depreciar <= 0;
      return true;
    });

    result.sort((a, b) => {
      return sortAsc
        ? a.depreciacion_acumulada - b.depreciacion_acumulada
        : b.depreciacion_acumulada - a.depreciacion_acumulada;
    });

    return result;
  }, [activos, filtro, sortAsc]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Control de Depreciación de Activos Fijos
          </h2>
          <p className="text-xs text-slate-500">
            Seguimiento de valor histórico, desgaste acumulado y saldo remanente según normas contables
          </p>
        </div>

        <button
          onClick={() => exportToExcel(filteredActivos, 'HILA_Depreciacion')}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a Excel (.xlsx)</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Valor Histórico */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valor Histórico</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 truncate" title={formatCOP(totalHistorico)}>
            {formatShortCurrency(totalHistorico)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Costo total de entrada</div>
        </div>

        {/* Depreciación Acumulada */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-rose-500" />
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Deprec. Acumulada</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 truncate" title={formatCOP(totalDepre)}>
            {formatShortCurrency(totalDepre)}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">Amortizado</div>
        </div>

        {/* Saldo por Depreciar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-emerald-500" />
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Saldo por Depreciar</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 truncate" title={formatCOP(totalSaldo)}>
            {formatShortCurrency(totalSaldo)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Valor neto en libros</div>
        </div>

        {/* % Depreciado */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">% Depreciado</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{pctDepre}%</div>
          <div className="text-[11px] text-amber-600 mt-1">Nivel de desgaste global</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === 'todos' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({activos.length})
          </button>
          <button
            onClick={() => setFiltro('depreciados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === 'depreciados' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Depreciados
          </button>
          <button
            onClick={() => setFiltro('vigentes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === 'vigentes' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vigentes
          </button>
          <button
            onClick={() => setFiltro('sin_saldo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === 'sin_saldo' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sin Saldo (Saldo = 0)
          </button>
        </div>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg flex items-center gap-1.5"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Ordenar por depreciación ({sortAsc ? 'Menor a mayor' : 'Mayor a menor'})</span>
        </button>
      </div>

      {/* Depreciation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Centro Costos</th>
                <th className="py-3 px-4 text-right">Valor Histórico</th>
                <th className="py-3 px-3 text-right">Deprec. Acum.</th>
                <th className="py-3 px-4 text-right">Saldo Remanente</th>
                <th className="py-3 px-4 text-center min-w-[140px]">% Depreciación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivos.length > 0 ? (
                filteredActivos.map((a) => {
                  const pct = a.valor_historico > 0
                    ? Math.min(100, Math.round((a.depreciacion_acumulada / a.valor_historico) * 100))
                    : 0;

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
                        <div className="truncate max-w-xs">{a.descripcion}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.marca && `${a.marca} · `}
                          Última deprec: {a.fecha_ultima_depre || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {a.centro_costos}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                        {formatCOP(a.valor_historico)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-semibold whitespace-nowrap">
                        {formatCOP(a.depreciacion_acumulada)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold whitespace-nowrap">
                        {formatCOP(a.saldo_por_depreciar)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 100
                                  ? 'bg-rose-500'
                                  : pct >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-600 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No hay activos en este filtro de depreciación.
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
