import React from 'react';
import { Menu, Search, UploadCloud, RefreshCw, BarChart2, LogOut, Database } from 'lucide-react';
import { TabType, UserSession } from '../types';
import { HospitalLogo } from './HospitalLogo';

interface TopbarProps {
  currentTab: TabType;
  onOpenMobileMenu: () => void;
  onGoToImport: () => void;
  onGoToCharts: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalActivos: number;
  userSession?: UserSession | null;
  onLogout?: () => void;
  isFirebaseConnected?: boolean;
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard General', subtitle: 'Resumen ejecutivo e indicadores en tiempo real' },
  graficos: { title: 'Gráficos Interactivos en Tiempo Real', subtitle: 'Explorador multidimensional de datos del archivo CSV/Excel' },
  activos: { title: 'Inventario de Activos', subtitle: 'Catálogo completo, búsqueda, filtrado y eliminación de equipos' },
  importacion: { title: 'Importar Archivos CSV / Excel', subtitle: 'Carga masiva, procesamiento y sincronización con Firebase' },
  inventario: { title: 'Inventario Físico', subtitle: 'Toma física y verificación de activos por código o escáner' },
  escaner: { title: 'Escáner Móvil', subtitle: 'Lectura de código de barras con cámara o entrada manual' },
  depreciacion: { title: 'Depreciación de Activos', subtitle: 'Control de depreciación acumulada, saldos y porcentajes' },
  bajas: { title: 'Bajas de Activos', subtitle: 'Control de obsolescencia Tipo 1 (Depreciados) y Tipo 2 (Sin Saldo)' },
  reportes: { title: 'Reportes Oficiales FO03_PR13_RF V2', subtitle: 'Generación y exportación de inventario en formato institucional Excel y CSV' },
  documentos: { title: 'Gestor Documental y Control de Lotes', subtitle: 'Activa o desactiva archivos cargados para filtrar la visibilidad del inventario' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onGoToImport,
  onGoToCharts,
  searchQuery,
  onSearchChange,
  totalActivos,
  userSession,
  onLogout,
  isFirebaseConnected = true,
}) => {
  const info = TAB_TITLES[currentTab] || { title: 'HILA Activos Fijos', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
            {info.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">
            {info.subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Firebase Cloud Status */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs"
          title="Sincronizado con Firebase Firestore"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Database className="w-3 h-3 text-emerald-600" />
          <span className="font-medium text-[11px]">Firebase Activo</span>
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block w-44 lg:w-56">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en inventario..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick chart button */}
        {currentTab !== 'graficos' && (
          <button
            onClick={onGoToCharts}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Ver gráficos interactivos"
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Gráficos</span>
          </button>
        )}

        {/* Quick Import Button */}
        {currentTab !== 'importacion' && (
          <button
            onClick={onGoToImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>
        )}

        {/* Hospital Badge with Logo */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
          <HospitalLogo size="sm" />
          <span className="text-xs font-bold text-slate-700">HILA</span>
        </div>

        {/* Discrete Logout Button without showing user personal info */}
        {userSession && onLogout && (
          <div className="pl-1">
            <button
              onClick={onLogout}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
