export function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `Campo requerido: ${field}`;
    }
  }
  return null;
}

export function validateIdParam(id: any): boolean {
  const parsed = Number.parseInt(id);
  return !isNaN(parsed) && parsed > 0;
}

export function validateIsString(value: any, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${fieldName} debe ser una cadena no vacía`;
  }
  return null;
}

export function validateIsNumber(value: any, fieldName: string): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return `${fieldName} debe ser un número válido`;
  }
  return null;
}
