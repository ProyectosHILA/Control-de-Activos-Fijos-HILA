import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  FileSpreadsheet,
  ClipboardCheck,
  ScanLine,
  TrendingDown,
  Archive,
  FileText,
  FolderArchive,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { TabType } from '../types';
import { HospitalLogo } from './HospitalLogo';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  totalActivos: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  totalActivos,
}) => {
  const navSections = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'graficos' as TabType, label: 'Gráficos en Tiempo Real', icon: BarChart3, badge: 'Live' },
        { id: 'activos' as TabType, label: 'Activos', icon: Boxes, badgeCount: totalActivos },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { id: 'inventario' as TabType, label: 'Inventario Físico', icon: ClipboardCheck },
        { id: 'escaner' as TabType, label: 'Escáner Móvil', icon: ScanLine },
        { id: 'depreciacion' as TabType, label: 'Depreciación', icon: TrendingDown },
        { id: 'bajas' as TabType, label: 'Bajas de Activos', icon: Archive },
      ],
    },
    {
      title: 'Datos & Reportes',
      items: [
        { id: 'documentos' as TabType, label: 'Gestor Documental', icon: FolderArchive, badge: 'Lotes' },
        { id: 'importacion' as TabType, label: 'Importar CSV / Excel', icon: FileSpreadsheet, badge: 'CSV' },
        { id: 'reportes' as TabType, label: 'Reportes FO03_PR13_RF', icon: FileText },
      ],
    },
  ];

  const handleNavClick = (tab: TabType) => {
    onSelectTab(tab);
    if (mobileOpen) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#162e4a] text-slate-200 border-r border-[#22446d] transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#244872] bg-[#12253d]">
          <div className="flex items-center gap-3 overflow-hidden">
            <HospitalLogo size="md" className="shrink-0" />
            {!collapsed && (
              <div className="leading-tight truncate">
                <span className="block font-bold text-white tracking-wide text-base">HILA</span>
                <span className="block text-[11px] text-blue-300 uppercase tracking-wider font-medium">
                  Activos Fijos
                </span>
              </div>
            )}
          </div>

          {/* Close for mobile, toggle for desktop */}
          <div className="flex items-center">
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1f3f66] transition-colors"
              title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {!collapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-[#1e3b5e] hover:text-white'
                      } ${collapsed ? 'justify-center' : 'justify-start'}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'}`} />
                      
                      {!collapsed && (
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      )}

                      {!collapsed && item.badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      {!collapsed && item.badgeCount !== undefined && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-[#22446d] text-slate-300'
                        }`}>
                          {item.badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-[#244872] bg-[#12253d] text-xs text-slate-400">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-300 block">Hospital HILA</span>
                <span className="text-[11px] text-slate-400">v1.0.0 &middot; 2026</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Sistema Operativo" />
            </div>
          ) : (
            <div className="flex justify-center" title="Sistema Operativo">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
