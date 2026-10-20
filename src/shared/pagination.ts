// BE-13 / BE-59: estandar de paginacion y clamp de limites.
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

export interface Pagination {
  limit: number;
  offset: number;
}

// Normaliza un limite: entero >= 1 acotado a MAX_LIMIT (50).
// Valores invalidos (NaN, vacio, < 1) caen al `fallback`.
export function clampLimit(
  value: unknown,
  fallback: number = DEFAULT_LIMIT,
): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.min(fallback, MAX_LIMIT);
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
