// BE-25: whitelist de CORS. La lista de origenes permitidos sale de
// URL_FRONTEND (admite varios separados por coma). Sin configuracion la lista
// queda vacia: ningun navegador recibe Access-Control-Allow-Origin y el
// middleware nunca cae en el comodin `*` (fail-closed).
export function allowedOriginsFrom(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
