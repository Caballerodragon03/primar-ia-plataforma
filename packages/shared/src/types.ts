export type UserRole = 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
export type UserEstado =
  | 'EMAIL_NO_VERIFICADO'
  | 'EMAIL_VERIFICADO'
  | 'PENDIENTE_VERIFICACION'
  | 'VERIFICADO_ACTIVO'
  | 'RECHAZADO'
  | 'PENDIENTE_ACLARACION'
  | 'SUSPENDIDO';

export interface JWTPayload {
  sub: string;
  role: UserRole;
  estado: UserEstado;
  empresa_id: string | null;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CalibreItem {
  calibre: string;
  cantidad_kg: number;
  precio_kg: number;
}
