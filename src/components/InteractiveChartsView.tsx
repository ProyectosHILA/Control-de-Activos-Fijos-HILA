import React, { useState, useMemo } from 'react';
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
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import {
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  ScatterChart as ScatterIcon,
  Filter,
  Download,
  Layers,
  Sliders,
  DollarSign,
  Hash,
  ArrowUpDown,
  RefreshCw,
  Table as TableIcon
} from 'lucide-react';
import { Activo } from '../types';
import { formatCOP, formatShortCurrency, formatNumber, exportToCSV } from '../utils/formatters';

interface InteractiveChartsViewProps {
  activos: Activo[];
}

type DimensionKey = 'centro_costos' | 'grupo' | 'subgrupo' | 'funcionario' | 'marca' | 'estado' | 'ano';
type MetricKey = 'count' | 'valor_historico' | 'depreciacion' | 'saldo' | 'promedio';
type ChartType = 'bar-v' | 'bar-h' | 'pie' | 'area' | 'scatter';

const PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0284c7', // Sky
  '#db2777', // Pink
  '#eab308', // Amber
  '#16a34a', // Emerald
  '#64748b', // Slate
  '#4f46e5', // Indigo
  '#059669', // Green
  '#d97706', // Yellow
];

export const InteractiveChartsView: React.FC<InteractiveChartsViewProps> = ({ activos }) => {
  // Chart controls state
  const [dimension, setDimension] = useState<DimensionKey>('centro_costos');
  const [metric, setMetric] = useState<MetricKey>('valor_historico');
  const [chartType, setChartType] = useState<ChartType>('bar-v');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [showTable, setShowTable] = useState<boolean>(true);

  // Filtered assets by state
  const filteredActivos = useMemo(() => {
    if (estadoFilter === 'todos') return activos;
    return activos.filter((a) => a.estado.toLowerCase() === estadoFilter.toLowerCase());
  }, [activos, estadoFilter]);

  // Aggregate data according to dimension and metric
  const aggregatedData = useMemo(() => {
    const map: Record<string, {
      count: number;
      valor_historico: number;
      depreciacion: number;
      saldo: number;
      items: Activo[];
    }> = {};

    filteredActivos.forEach((a) => {
      let key = 'Sin clasificar';
      if (dimension === 'ano') {
        key = a.fecha_compra ? a.fecha_compra.substring(0, 4) : 'Sin fecha';
      } else {
        key = a[dimension] || 'Sin especificar';
      }

      if (!map[key]) {
        map[key] = {
          count: 0,
          valor_historico: 0,
          depreciacion: 0,
          saldo: 0,
          items: [],
        };
      }

      map[key].count += 1;
      map[key].valor_historico += a.valor_historico;
      map[key].depreciacion += a.depreciacion_acumulada;
      map[key].saldo += a.saldo_por_depreciar;
      map[key].items.push(a);
    });

    let list = Object.entries(map).map(([name, stats]) => {
      const promedio = stats.count > 0 ? stats.valor_historico / stats.count : 0;
      let primaryValue = 0;

      switch (metric) {
        case 'count':
          primaryValue = stats.count;
          break;
        case 'valor_historico':
          primaryValue = stats.valor_historico;
          break;
        case 'depreciacion':
          primaryValue = stats.depreciacion;
          break;
        case 'saldo':
          primaryValue = stats.saldo;
          break;
        case 'promedio':
          primaryValue = promedio;
          break;
      }

      return {
        name,
        value: primaryValue,
        count: stats.count,
        valor_historico: stats.valor_historico,
        depreciacion: stats.depreciacion,
        saldo: stats.saldo,
        promedio,
      };
    });

    // Sort list
    if (sortOrder === 'desc') {
      list.sort((a, b) => b.value - a.value);
    } else if (sortOrder === 'asc') {
      list.sort((a, b) => a.value - b.value);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply Top N limit
    if (topLimit > 0) {
      list = list.slice(0, topLimit);
    }

    return list;
  }, [filteredActivos, dimension, metric, sortOrder, topLimit]);

  // Scatter chart data: Each asset as a point (X = Valor Histórico, Y = Depreciación Acumulada)
  const scatterData = useMemo(() => {
    return filteredActivos.map((a) => ({
      x: a.valor_historico,
      y: a.depreciacion_acumulada,
      z: a.saldo_por_depreciar,
      name: a.descripcion,
      codigo: a.codigo,
      centro: a.centro_costos,
      estado: a.estado,
    }));
  }, [filteredActivos]);

  // Total summary of current view
  const currentTotal = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => acc + curr.value, 0);
  }, [aggregatedData]);

  const metricLabel = useMemo(() => {
    switch (metric) {
      case 'count': return 'Cantidad de Activos';
      case 'valor_historico': return 'Valor Histórico ($)';
      case 'depreciacion': return 'Depreciación Acumulada ($)';
      case 'saldo': return 'Saldo por Depreciar ($)';
      case 'promedio': return 'Valor Promedio ($)';
    }
  }, [metric]);

  const isCurrencyMetric = metric !== 'count';

  return (
    <div className="space-y-6">
      {/* Control Studio Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Configurador del Gráfico en Tiempo Real
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart type selector buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setChartType('bar-v')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'bar-v' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Barras Verticales"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar-h')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors rotate-90 ${
                  chartType === 'bar-h' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Barras Horizontales"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'pie' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Donut / Torta"
              >
                <PieIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'area' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Área Continua"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('scatter')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartType === 'scatter' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dispersión (Valor vs Depreciación)"
              >
                <ScatterIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Table */}
            <button
              onClick={() => setShowTable(!showTable)}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showTable
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla Desglose</span>
            </button>
          </div>
        </div>

        {/* Filters and axis selectors grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Dimension (X-Axis) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Dimensión (Eje X)
            </label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as DimensionKey)}
              disabled={chartType === 'scatter'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="centro_costos">Centro de Costos</option>
              <option value="grupo">Grupo / Categoría</option>
              <option value="subgrupo">Subgrupo</option>
              <option value="funcionario">Funcionario Custodio</option>
              <option value="marca">Marca / Fabricante</option>
              <option value="estado">Estado del Activo</option>
              <option value="ano">Año de Compra</option>
            </select>
          </div>

          {/* Metric (Y-Axis) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Métrica (Eje Y)
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              disabled={chartType === 'scatter'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="valor_historico">Valor Histórico Total ($)</option>
              <option value="count">Cantidad de Activos (Conteo)</option>
              <option value="depreciacion">Depreciación Acumulada ($)</option>
              <option value="saldo">Saldo por Depreciar ($)</option>
              <option value="promedio">Valor Promedio por Activo ($)</option>
            </select>
          </div>

          {/* Top Limit */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Límite de Grupos
            </label>
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              disabled={chartType === 'scatter'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={0}>Todos los elementos</option>
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ordenación
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              disabled={chartType === 'scatter'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="desc">Mayor a Menor</option>
              <option value="asc">Menor a Mayor</option>
              <option value="alpha">Alfabético (A - Z)</option>
            </select>
          </div>

          {/* Estado filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filtrar por Estado
            </label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Solo Activos Vigentes</option>
              <option value="depreciado">Solo Depreciados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Display Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {chartType === 'scatter'
                ? 'Dispersión: Valor Histórico vs Depreciación Acumulada'
                : `${metricLabel} por ${dimension.replace('_', ' ').toUpperCase()}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {chartType === 'scatter'
                ? `Mostrando ${scatterData.length} activos individuales mapeados en tiempo real`
                : `Total acumulado en vista: ${isCurrencyMetric ? formatCOP(currentTotal) : formatNumber(currentTotal)} (${aggregatedData.length} categorías)`}
            </p>
          </div>

          {/* Quick indicator badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium">
              Filtro: {estadoFilter.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Dynamic Chart Container */}
        <div className="w-full h-96">
          {chartType === 'bar-v' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedData} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => (isCurrencyMetric ? formatShortCurrency(v) : formatNumber(v))}
                />
                <Tooltip
                  formatter={(val: any) => [
                    isCurrencyMetric ? formatCOP(val) : `${formatNumber(val)} activos`,
                    metricLabel,
                  ]}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]}>
                  {aggregatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'bar-h' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregatedData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 70, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => (isCurrencyMetric ? formatShortCurrency(v) : formatNumber(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  width={90}
                />
                <Tooltip
                  formatter={(val: any) => [
                    isCurrencyMetric ? formatCOP(val) : `${formatNumber(val)} activos`,
                    metricLabel,
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]}>
                  {aggregatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'pie' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregatedData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {aggregatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    isCurrencyMetric ? formatCOP(val) : `${formatNumber(val)} activos`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {chartType === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedData} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => (isCurrencyMetric ? formatShortCurrency(v) : formatNumber(v))}
                />
                <Tooltip
                  formatter={(val: any) => [
                    isCurrencyMetric ? formatCOP(val) : `${formatNumber(val)} activos`,
                    metricLabel,
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'scatter' && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Valor Histórico"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => formatShortCurrency(v)}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Depreciación"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => formatShortCurrency(v)}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1">
                        <div className="font-bold text-slate-800">{data.name}</div>
                        <div className="font-mono text-blue-600">{data.codigo}</div>
                        <div className="text-slate-500">Centro: {data.centro}</div>
                        <div className="text-slate-700">Valor: <strong>{formatCOP(data.x)}</strong></div>
                        <div className="text-rose-600">Deprec.: <strong>{formatCOP(data.y)}</strong></div>
                        <div className="text-emerald-700">Saldo: <strong>{formatCOP(data.z)}</strong></div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Activos" data={scatterData} fill="#2563eb" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Aggregate Breakdown Table */}
      {showTable && chartType !== 'scatter' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Tabla de Datos Agrupados ({dimension.replace('_', ' ').toUpperCase()})
              </h4>
              <p className="text-xs text-slate-500">Valores consolidados de la vista actual</p>
            </div>

            <button
              onClick={() => exportToCSV(filteredActivos, `HILA_${dimension}_resumen.csv`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Categoría / Elemento</th>
                  <th className="py-3 px-4 text-center">Total Activos</th>
                  <th className="py-3 px-4 text-right">Valor Histórico</th>
                  <th className="py-3 px-4 text-right">Deprec. Acumulada</th>
                  <th className="py-3 px-4 text-right">Saldo por Depreciar</th>
                  <th className="py-3 px-4 text-right">Promedio / Activo</th>
                  <th className="py-3 px-4 text-center">% Deprec.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggregatedData.map((row, idx) => {
                  const pct = row.valor_historico > 0
                    ? Math.round((row.depreciacion / row.valor_historico) * 100)
                    : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-800 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <span className="truncate max-w-xs">{row.name}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                        {formatNumber(row.count)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                        {formatCOP(row.valor_historico)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-600 font-medium">
                        {formatCOP(row.depreciacion)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-medium">
                        {formatCOP(row.saldo)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatCOP(row.promedio)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pct >= 90 ? 'bg-rose-50 text-rose-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
