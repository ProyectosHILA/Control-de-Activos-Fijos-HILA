import React from 'react';
import { AlertTriangle, Trash2, X, Check, Boxes } from 'lucide-react';
import { Activo } from '../types';
import { formatCOP } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activo?: Activo | null;
  count?: number; // for bulk deletion
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activo,
  count = 1,
}) => {
  if (!isOpen) return null;

  const isBulk = count > 1 || !activo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Alert Bar */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-rose-900">
              {isBulk
                ? `¿Está seguro de eliminar estos ${count} activos?`
                : '¿Está seguro de eliminar este activo?'}
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Esta acción no se puede deshacer y se sincronizará con Firebase Firestore.
            </p>
          </div>
        </div>

        {/* Content detail */}
        <div className="p-5 space-y-4">
          {!isBulk && activo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Código:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {activo.codigo}
                </span>
              </div>
              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-slate-500 font-medium block">Descripción:</span>
                <span className="font-semibold text-slate-800 block text-xs mt-0.5">
                  {activo.descripcion}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Centro Costos:</span>
                  <span className="font-medium text-slate-700 truncate block">
                    {activo.centro_costos || '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Valor Histórico:</span>
                  <span className="font-bold text-slate-900 block">
                    {formatCOP(activo.valor_historico)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isBulk && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-700 font-semibold">
                Se eliminarán permanentemente {count} registros del inventario.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Confirme si desea continuar con la eliminación del registro de la base de datos.
          </p>

          {/* Action Buttons: SÍ, ELIMINAR / NO, CANCELAR */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>No, Cancelar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
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
  );
};
