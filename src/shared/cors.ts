// Allowlist de CORS: la lista de origenes permitidos sale de la variable
// dedicada CORS_ALLOWED_ORIGINS (varios separados por coma, admite patrones
// con `*`). URL_FRONTEND no se usa aca: sigue siendo la URL canonica de
// redirect (pagos y mails) y no admite comas. Sin configuracion la lista
// queda vacia: ningun navegador recibe Access-Control-Allow-Origin y el
// middleware nunca cae en el comodin `*` (fail-closed). Los requests sin
// Origin (webhooks de MP / server-to-server) siguen pasando.
export function allowedOriginsFrom(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convierte un patron de origen en una regex anclada: `*` es comodin, el resto
// de los caracteres especiales de regex se tratan como literales.
function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('*')
    .map((part) => escapeRegExp(part))
    .join('.*');
  return new RegExp(`^${body}$`);
}

export function isOriginAllowed(
  origin: string | undefined,
  patterns: string[],
): boolean {
  if (origin === undefined) {
    return true;
  }
  return patterns.some((pattern) => patternToRegExp(pattern).test(origin));
}

type OriginCallback = (err: Error | null, allow?: boolean) => void;

export function corsOriginOption(
  patterns: string[],
): (origin: string | undefined, callback: OriginCallback) => void {
  return (origin, callback) => {
    callback(null, isOriginAllowed(origin, patterns));
  };
}
