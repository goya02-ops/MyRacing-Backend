export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `Campo requerido: ${field}`;
    }
  }
  return null;
}

export function validateIdParam(id: unknown): boolean {
  if (typeof id !== 'string' && typeof id !== 'number') {
    return false;
  }
  const parsed = Number.parseInt(String(id));
  return !isNaN(parsed) && parsed > 0;
}

export function validateIsString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${fieldName} debe ser una cadena no vacía`;
  }
  return null;
}

export function validateIsNumber(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return `${fieldName} debe ser un número válido`;
  }
  return null;
}