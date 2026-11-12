import React, { useState } from 'react';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  Boxes,
  ScanLine,
  ArrowRight
} from 'lucide-react';
import { Activo, TabType } from '../types';
import { formatNumber, exportToCSV } from '../utils/formatters';

interface InventarioViewProps {
  activos: Activo[];
  onNavigate: (tab: TabType) => void;
  onSelectActivo: (activo: Activo) => void;
}

interface VerifiedItem {
  activo: Activo;
  verifiedAt: string;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  activos,
  onNavigate,
  onSelectActivo,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [lastFound, setLastFound] = useState<Activo | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [verifiedList, setVerifiedList] = useState<VerifiedItem[]>([]);

  const totalActivos = activos.length;
  const vigentes = activos.filter((a) => a.estado === 'Activo').length;
  const encontradosCount = verifiedList.length;
  const faltantesCount = Math.max(0, totalActivos - encontradosCount);

  const handleVerify = (codeToSearch?: string) => {
    const code = (codeToSearch || inputCode).trim();
    if (!code) return;

    setNotFoundMsg(null);
    setLastFound(null);

    // Search code case-insensitively
    const match = activos.find(
      (a) => a.codigo.toLowerCase() === code.toLowerCase() ||
             a.codigo.toLowerCase().includes(code.toLowerCase())
    );

    if (match) {
      setLastFound(match);
      // Check if already in verified list
      if (!verifiedList.some((item) => item.activo.codigo === match.codigo)) {
        const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setVerifiedList((prev) => [{ activo: match, verifiedAt: timeStr }, ...prev]);
      }
    } else {
      setNotFoundMsg(`Código "${code}" no encontrado en la base de datos.`);
    }

    setInputCode('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const handleClearSession = () => {
    setVerifiedList([]);
    setLastFound(null);
    setNotFoundMsg(null);
    setShowConfirmClear(false);
  };

  const handleExportAudit = () => {
    const listToExport = verifiedList.map((item) => item.activo);
    exportToCSV(listToExport, `HILA_Auditoria_Fisica_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Toma Física de Inventario Hospitalario
          </h2>
          <p className="text-xs text-slate-500">
            Escanea o ingresa códigos para realizar la auditoría y control de presencia física
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('escaner')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ScanLine className="w-4 h-4" />
            <span>Abrir Escáner Cámara</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Activos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total en Sistema
          </span>
          <div className="text-2xl font-black text-slate-800">{formatNumber(totalActivos)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Activos registrados</div>
        </div>

        {/* Vigentes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Vigentes
          </span>
          <div className="text-2xl font-black text-emerald-700">{formatNumber(vigentes)}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Estado activo</div>
        </div>

        {/* Encontrados en Sesión */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="w-1 absolute left-0 top-0 bottom-0 bg-blue-600" />
          <span className="block text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            Verificados Hoy
          </span>
          <div className="text-2xl font-black text-blue-800">{formatNumber(encontradosCount)}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">En esta sesión</div>
        </div>

        {/* Faltantes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
            Por Verificar
          </span>
          <div className="text-2xl font-black text-amber-700">{formatNumber(faltantesCount)}</div>
          <div className="text-[11px] text-amber-600 mt-1">Faltan por censar</div>
        </div>
      </div>

      {/* Main Layout: Search left, Verified list right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification box */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Verificar Activo por Código
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Escribe o pega el código de barras del activo y presiona Enter:
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej. HILA-001042..."
                autoFocus
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={() => handleVerify()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verificar</span>
              </button>
            </div>

            {/* Quick demo codes buttons */}
            <div className="text-[11px] text-slate-500 mb-2">
              Códigos de prueba rápida:
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {activos.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleVerify(a.codigo)}
                  className="px-2 py-0.5 font-mono text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded transition-colors"
                >
                  {a.codigo}
                </button>
              ))}
            </div>

            {/* Found Asset Result Box */}
            {lastFound && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-in fade-in space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>¡Activo Encontrado y Registrado en la Sesión!</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span className="text-slate-500">Código:</span>
                    <span className="font-mono font-bold text-emerald-900">{lastFound.codigo}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span className="text-slate-500">Descripción:</span>
                    <span className="font-semibold text-right max-w-[200px] truncate">{lastFound.descripcion}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span className="text-slate-500">Centro de Costos:</span>
                    <span>{lastFound.centro_costos}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span className="text-slate-500">Funcionario:</span>
                    <span>{lastFound.funcionario}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-500">Estado:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lastFound.estado === 'Activo' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {lastFound.estado}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectActivo(lastFound)}
                  className="w-full mt-2 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span>Ver Ficha Completa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Not Found Alert */}
            {notFoundMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">No encontrado</div>
                  <div>{notFoundMsg}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verified list right */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Activos Verificados en esta Sesión ({verifiedList.length})
              </h3>
              <p className="text-xs text-slate-500">Historial en tiempo real de la auditoría</p>
            </div>

            <div className="flex items-center gap-2">
              {verifiedList.length > 0 && (
                <>
                  <button
                    onClick={handleExportAudit}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                    title="Exportar auditoría"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  {showConfirmClear ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-800">¿Reiniciar?</span>
                      <button
                        onClick={handleClearSession}
                        className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setShowConfirmClear(false)}
                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmClear(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                      title="Reiniciar lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Centro Costos</th>
                  <th className="py-2.5 px-3 text-center">Hora</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedList.length > 0 ? (
                  verifiedList.map((item, idx) => (
                    <tr
                      key={item.activo.id}
                      onClick={() => onSelectActivo(item.activo)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{verifiedList.length - idx}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {item.activo.codigo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium truncate max-w-xs">
                        {item.activo.descripcion}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.activo.centro_costos}</td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {item.verifiedAt}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.activo.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {item.activo.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Aún no hay activos verificados en esta sesión</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ingresa un código en el panel de la izquierda para comenzar el conteo.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
