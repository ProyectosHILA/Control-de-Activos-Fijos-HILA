import React, { useState, useMemo } from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Wallet,
  Percent,
  UploadCloud,
  ClipboardCheck,
  ScanLine,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Activo, KPIStats, TabType } from '../types';
import { formatCOP, formatShortCurrency, formatNumber } from '../utils/formatters';

interface DashboardViewProps {
  activos: Activo[];
  stats: KPIStats;
  onNavigate: (tab: TabType) => void;
  onSelectActivo: (activo: Activo) => void;
}

const COLORS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0284c7', // Sky
  '#db2777', // Pink
  '#eab308', // Amber
  '#16a34a', // Emerald
  '#64748b', // Slate
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  activos,
  stats,
  onNavigate,
  onSelectActivo,
}) => {
  // Centro chart metric toggle: 'count' or 'value'
  const [centroMetric, setCentroMetric] = useState<'count' | 'value'>('count');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string>('todos');

  // Filtered dataset for dashboard
  const filteredActivos = useMemo(() => {
    if (selectedEstadoFilter === 'todos') return activos;
    return activos.filter((a) => a.estado.toLowerCase() === selectedEstadoFilter.toLowerCase());
  }, [activos, selectedEstadoFilter]);

  // Aggregate by Centro de Costos
  const centrosData = useMemo(() => {
    const map: Record<string, { count: number; value: number; da: number; saldo: number }> = {};
    filteredActivos.forEach((a) => {
      const c = a.centro_costos || 'Sin Centro';
      if (!map[c]) map[c] = { count: 0, value: 0, da: 0, saldo: 0 };
      map[c].count += 1;
      map[c].value += a.valor_historico;
      map[c].da += a.depreciacion_acumulada;
      map[c].saldo += a.saldo_por_depreciar;
    });

    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        cantidad: val.count,
        valor: val.value,
        depreciacion: val.da,
        saldo: val.saldo,
      }))
      .sort((a, b) => (centroMetric === 'count' ? b.cantidad - a.cantidad : b.valor - a.valor))
      .slice(0, 8);
  }, [filteredActivos, centroMetric]);

  // Aggregate by Grupo
  const gruposData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredActivos.forEach((a) => {
      const g = a.grupo || 'GENERAL';
      if (!map[g]) map[g] = { count: 0, value: 0 };
      map[g].count += 1;
      map[g].value += a.valor_historico;
    });

    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        value: val.count,
        totalValor: val.value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredActivos]);

  // Purchases by Year (Trend timeline)
  const timelineData = useMemo(() => {
    const map: Record<string, { year: string; count: number; value: number }> = {};
    filteredActivos.forEach((a) => {
      if (a.fecha_compra && a.fecha_compra.length >= 4) {
        const yr = a.fecha_compra.substring(0, 4);
        if (!map[yr]) map[yr] = { year: yr, count: 0, value: 0 };
        map[yr].count += 1;
        map[yr].value += a.valor_historico;
      }
    });

    return Object.values(map).sort((a, b) => a.year.localeCompare(b.year));
  }, [filteredActivos]);

  // Recent high-value assets
  const highValueActivos = useMemo(() => {
    return [...filteredActivos]
      .sort((a, b) => b.valor_historico - a.valor_historico)
      .slice(0, 5);
  }, [filteredActivos]);

  return (
    <div className="space-y-6">
      {/* Top action banner if dataset is empty */}
      {activos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <UploadCloud className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-amber-900">No hay activos cargados</h3>
          <p className="text-sm text-amber-700 mt-1 max-w-md mx-auto">
            Importa un archivo CSV o Excel para comenzar a visualizar los gráficos en tiempo real.
          </p>
          <button
            onClick={() => onNavigate('importacion')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            Cargar Archivo CSV / Datos Demo
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Activos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-blue-600" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Activos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {formatNumber(stats.total_activos)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inventario general</div>
        </div>

        {/* Activos Vigentes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-emerald-500" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vigentes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatNumber(stats.activos_vigentes)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">En servicio activo</div>
        </div>

        {/* Depreciados */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-amber-500" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Depreciados</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {formatNumber(stats.activos_depreciados)}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Revisión o baja</div>
        </div>

        {/* Valor Histórico */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-blue-700" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valor Histórico</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate" title={formatCOP(stats.valor_total)}>
            {formatShortCurrency(stats.valor_total)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Costo de adquisición</div>
        </div>

        {/* Depreciación Acumulada */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-rose-500" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deprec. Acum.</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 tracking-tight truncate" title={formatCOP(stats.depreciacion_acum)}>
            {formatShortCurrency(stats.depreciacion_acum)}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">Desgaste contable</div>
        </div>

        {/* Saldo por Depreciar & % */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-indigo-600" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Saldo Activo</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-900 tracking-tight truncate" title={formatCOP(stats.saldo_por_depreciar)}>
            {formatShortCurrency(stats.saldo_por_depreciar)}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1 font-medium">
            <span>{stats.pct_depre}%</span>
            <span>depreciado</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Activos por Centro de Costos */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Activos por Centro de Costos
              </h2>
              <p className="text-xs text-slate-500">Distribución de activos y valor financiero</p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCentroMetric('count')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  centroMetric === 'count'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cantidad
              </button>
              <button
                onClick={() => setCentroMetric('value')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  centroMetric === 'value'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Valor ($ COP)
              </button>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="w-full h-72">
            {centrosData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={centrosData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => (centroMetric === 'value' ? formatShortCurrency(v) : formatNumber(v))}
                  />
                  <Tooltip
                    formatter={(val: any) => [
                      centroMetric === 'value' ? formatCOP(val) : `${val} activos`,
                      centroMetric === 'value' ? 'Valor Histórico' : 'Cantidad',
                    ]}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey={centroMetric === 'count' ? 'cantidad' : 'valor'}
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos disponibles
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Distribución por Grupo (Donut Chart) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Distribución por Grupo</h2>
              <p className="text-xs text-slate-500">Categorización según naturaleza del bien</p>
            </div>
            <button
              onClick={() => onNavigate('graficos')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Explorar <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full h-72">
            {gruposData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gruposData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {gruposData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} activos (${formatShortCurrency(item.payload.totalValor)})`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row: Timeline Purchases & Top Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline area chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Histórico de Inversión y Compras</h2>
              <p className="text-xs text-slate-500">Evolución de adquisición de activos por año</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {timelineData.length} años registrados
            </span>
          </div>

          <div className="w-full h-64">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => formatShortCurrency(v)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCOP(val), 'Valor Invertido']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin fechas de compra registradas
              </div>
            )}
          </div>
        </div>

        {/* Top 5 High-Value Assets */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Equipos de Mayor Valor</h2>
              <p className="text-xs text-slate-500">Principales activos biomédicos y tecnológicos</p>
            </div>
            <button
              onClick={() => onNavigate('activos')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Ver todos
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-64">
            {highValueActivos.map((a) => (
              <div
                key={a.id}
                onClick={() => onSelectActivo(a)}
                className="py-2.5 px-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {a.codigo}
                    </span>
                    <span className="text-xs text-slate-800 font-medium truncate block">
                      {a.descripcion}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{a.centro_costos}</span>
                    <span>&middot;</span>
                    <span>{a.marca || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    {formatShortCurrency(a.valor_historico)}
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    a.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {a.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access Modules Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('importacion')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Importar Archivos</h3>
          <p className="text-xs text-slate-500 mt-1">Cargar archivos CSV o Excel con datos de inventario</p>
        </button>

        <button
          onClick={() => onNavigate('inventario')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Inventario Físico</h3>
          <p className="text-xs text-slate-500 mt-1">Toma física, auditoría y verificación por código</p>
        </button>

        <button
          onClick={() => onNavigate('escaner')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <ScanLine className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Escáner Móvil</h3>
          <p className="text-xs text-slate-500 mt-1">Lector de código de barras con cámara y búsqueda</p>
        </button>

        <button
          onClick={() => onNavigate('reportes')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Reportes Excel</h3>
          <p className="text-xs text-slate-500 mt-1">Generar reportes con 4 hojas formateadas</p>
        </button>
      </div>
    </div>
  );
};
