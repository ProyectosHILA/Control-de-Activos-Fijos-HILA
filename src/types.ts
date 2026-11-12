export interface DocumentoSubido {
  id: string;
  nombreArchivo: string;
  nombrePersonalizado: string;
  fechaCarga: string;
  totalActivos: number;
  activoVisible: boolean;
  tamano?: string;
  valorTotal: number;
  depreciacionTotal: number;
  creadoPor?: string;
}

export interface Activo {
  id: string | number;
  codigo: string;
  descripcion: string;
  estado: 'Activo' | 'Depreciado' | 'En Reparación' | 'Dado de Baja';
  fecha_compra?: string;
  valor_compra: number;
  valor_historico: number;
  funcionario: string;
  grupo: string;
  subgrupo: string;
  marca: string;
  centro_costos: string;
  ubicacion: string;
  codigo_ubicacion?: string;
  fecha_ultima_depre?: string;
  depreciacion_acumulada: number;
  saldo_por_depreciar: number;
  pol?: string;
  man?: string;
  activo: boolean;
  observaciones?: string;
  updatedAt?: string;
  documentId?: string; // ID of uploaded DocumentoSubido batch
  placa?: string; // PLACA ACTIVO from official template
  modelo?: string; // MODELO from official template
  serie?: string; // SERIE from official template
}

export interface UserSession {
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
  canDelete: boolean;
}

export type TabType = 
  | 'dashboard'
  | 'graficos'
  | 'activos'
  | 'importacion'
  | 'inventario'
  | 'escaner'
  | 'depreciacion'
  | 'bajas'
  | 'reportes'
  | 'documentos';

export interface KPIStats {
  total_activos: number;
  activos_vigentes: number;
  activos_depreciados: number;
  valor_total: number;
  depreciacion_acum: number;
  saldo_por_depreciar: number;
  pct_depre: number;
  activos_faltantes: number;
  activos_encontrados: number;
  tipo1_bajas: number;
  tipo2_bajas: number;
}

export interface ImportSummary {
  total: number;
  nuevos: number;
  actualizados: number;
  errores: number;
  detallesErrores: string[];
}
