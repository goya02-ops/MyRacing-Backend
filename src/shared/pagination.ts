// BE-13: estandar de paginacion de listados admin.
// Los listados devuelven `{ data, total, limit, offset }` y aceptan
// `?limit=&offset=`. El limite se clampea a un maximo para evitar respuestas
// gigantes (auditoria Cloudflare) y se cae a un default ante valores invalidos.
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

export interface Pagination {
  limit: number;
  offset: number;
}

// Normaliza un limite: entero >= 1 acotado a MAX_LIMIT. Valores invalidos
// (NaN, vacio, < 1) caen al `fallback`.
export function clampLimit(
  value: unknown,
  fallback: number = DEFAULT_LIMIT,
): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export function parsePagination(query: {
  limit?: unknown;
  offset?: unknown;
}): Pagination {
  const offset = Number.parseInt(String(query.offset), 10);
  return {
    limit: clampLimit(query.limit, DEFAULT_LIMIT),
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  };
}
