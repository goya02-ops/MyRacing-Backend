// Error de regla de negocio/validacion: los services lo lanzan y
// `handleControllerError` lo mapea a 400 con el mismo mensaje que antes devolvia
// el controller directamente (BE-22).
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
