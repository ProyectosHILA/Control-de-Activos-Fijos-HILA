import React, { useState } from 'react';
import {
  X,
  Boxes,
  DollarSign,
  Calendar,
  Building,
  User,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2
} from 'lucide-react';
import { Activo } from '../types';
import { formatCOP } from '../utils/formatters';

interface ActivoModalProps {
  activo: Activo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Activo) => void;
  onDelete?: (id: string | number) => void;
  isNew?: boolean;
}

export const ActivoModal: React.FC<ActivoModalProps> = ({
  activo,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isNew = false,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Partial<Activo>>(
    activo || {
      codigo: '',
      descripcion: '',
      estado: 'Activo',
      fecha_compra: new Date().toISOString().slice(0, 10),
      valor_compra: 0,
      valor_historico: 0,
      funcionario: '',
      grupo: 'EQUIPO BIOMEDICO',
      subgrupo: 'MONITOREO',
      marca: '',
      centro_costos: 'UCI ADULTOS',
      ubicacion: '',
      fecha_ultima_depre: new Date().toISOString().slice(0, 10),
      depreciacion_acumulada: 0,
      saldo_por_depreciar: 0,
      activo: true,
    }
  );

  const [isEditing, setIsEditing] = useState<boolean>(isNew);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (field: keyof Activo, value: any) => {
    setValidationError(null);
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'valor_historico' || field === 'depreciacion_acumulada') {
        const vh = field === 'valor_historico' ? Number(value) : (next.valor_historico || 0);
        const da = field === 'depreciacion_acumulada' ? Number(value) : (next.depreciacion_acumulada || 0);
        next.saldo_por_depreciar = Math.max(0, vh - da);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo?.trim() || !formData.descripcion?.trim()) {
      setValidationError('Por favor completa al menos el Código y la Descripción.');
      return;
    }

    const payload: Activo = {
      id: activo?.id || Date.now(),
      codigo: formData.codigo!.trim(),
      descripcion: formData.descripcion!.trim(),
      estado: formData.estado as any || 'Activo',
      fecha_compra: formData.fecha_compra,
      valor_compra: Number(formData.valor_compra) || 0,
      valor_historico: Number(formData.valor_historico) || 0,
      funcionario: formData.funcionario || 'Sin Asignar',
      grupo: formData.grupo || 'GENERAL',
      subgrupo: formData.subgrupo || 'GENERAL',
      marca: formData.marca || 'N/A',
      centro_costos: formData.centro_costos || 'GENERAL',
      ubicacion: formData.ubicacion || 'Hospital HILA',
      fecha_ultima_depre: formData.fecha_ultima_depre,
      depreciacion_acumulada: Number(formData.depreciacion_acumulada) || 0,
      saldo_por_depreciar: Number(formData.saldo_por_depreciar) || 0,
      activo: formData.estado !== 'Depreciado',
    };

    onSave?.(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {formData.codigo || 'NUEVO ACTIVO'}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                formData.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {formData.estado}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-1">
              {formData.descripcion || 'Crear Nuevo Activo'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: General Information */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-blue-600" />
              Información General del Activo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Código / Placa</label>
                <input
                  type="text"
                  disabled={!isEditing && !isNew}
                  value={formData.codigo || ''}
                  onChange={(e) => handleChange('codigo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Estado</label>
                <select
                  disabled={!isEditing}
                  value={formData.estado || 'Activo'}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="Activo">Activo</option>
                  <option value="Depreciado">Depreciado</option>
                  <option value="En Reparación">En Reparación</option>
                  <option value="Dado de Baja">Dado de Baja</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-medium mb-1">Descripción del Equipo</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.descripcion || ''}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Grupo / Categoría</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.grupo || ''}
                  onChange={(e) => handleChange('grupo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Subgrupo</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.subgrupo || ''}
                  onChange={(e) => handleChange('subgrupo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Marca / Fabricante</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.marca || ''}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Centro de Costos</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.centro_costos || ''}
                  onChange={(e) => handleChange('centro_costos', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Custodio / Funcionario</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.funcionario || ''}
                  onChange={(e) => handleChange('funcionario', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Ubicación Física</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.ubicacion || ''}
                  onChange={(e) => handleChange('ubicacion', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Section: Financial & Depreciation Information */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Información Financiera y Contable
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Fecha de Compra</label>
                <input
                  type="date"
                  disabled={!isEditing}
                  value={formData.fecha_compra || ''}
                  onChange={(e) => handleChange('fecha_compra', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Última Depreciación</label>
                <input
                  type="date"
                  disabled={!isEditing}
                  value={formData.fecha_ultima_depre || ''}
                  onChange={(e) => handleChange('fecha_ultima_depre', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Valor Histórico ($ COP)</label>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.valor_historico ?? 0}
                  onChange={(e) => handleChange('valor_historico', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Depreciación Acumulada ($ COP)</label>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.depreciacion_acumulada ?? 0}
                  onChange={(e) => handleChange('depreciacion_acumulada', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                    Saldo por Depreciar Calculado
                  </span>
                  <span className="text-lg font-black text-emerald-900">
                    {formatCOP(formData.saldo_por_depreciar)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-emerald-700 font-medium">
                  {formData.valor_historico && formData.valor_historico > 0
                    ? `${Math.round(((formData.depreciacion_acumulada || 0) / formData.valor_historico) * 100)}% amortizado`
                    : '0% amortizado'}
                </div>
              </div>
            </div>
          </div>

          {/* Validation error notice if any */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {validationError}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {activo && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
                    <span className="text-xs font-bold text-rose-900 px-1">
                      ¿Está seguro de eliminar?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(activo.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Sí, Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      No, Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Activo</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>

              {isEditing ? (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  Editar Información
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
