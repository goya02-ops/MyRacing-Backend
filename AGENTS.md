# AGENTS.md - MyRacing Backend

API REST Express 5 + TypeScript, MikroORM 6 + MySQL 8, auth JWT, pagos Mercado Pago. ESM (`"type": "module"`), pnpm 12, Node 22.

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | `tsx watch src/server.ts` |
| `pnpm build` | `tsc` a `dist/` (gate de CI) |
| `pnpm lint` | `eslint . --max-warnings 0` (gate de CI) |
| `pnpm start` | `node dist/server.js` |
| `pnpm test` | `vitest run` (requiere MySQL viva) |
| `pnpm test:coverage` | Thresholds 80 (solo gate de `main`) |

Verificación antes de commitear: `pnpm lint && pnpm build`.

## Quirks

* Imports ESM con extensión `.js` (`../user/user.entity.js` aunque el archivo sea `.ts`).
* Entidades `*.entity.ts` con alta explícita en `src/shared/orm.ts` (sin globs): si no se agrega, no se registra.
* `src/shared/orm.ts` conecta con top-level await: importarlo exige MySQL alcanzable; usa `dbName: DB_NAME`.
* `src/server.ts` llama a `syncSchema()` (sin migraciones). Nunca `dev`/`start` contra DB productiva.
* `src/app.ts` solo exporta `app` (sin `listen` ni `syncSchema`) para supertest; `reflect-metadata` va primero.
* Todo request corre en `RequestContext.create(orm.em)`: usar `orm.em` del contexto y `em.flush()`.
* `src/shared/config.ts` trae fallbacks JWT inseguros: usar `.env` real. `BREVO_API_KEY`/`FROM_EMAIL` son opcionales.
* `BaseEntity` da id `number` autoincremental (sin UUID ni timestamps).

## Entorno

Ver `.env.example`: `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `URL_FRONTEND/BACKEND/WEBHOOK_MP`.
* Dev: `docker compose -f ../compose.dev.yaml up -d` → puerto **3307**, user `admin`.
* CI: MySQL efímera con `docker run` → puerto **3306** (sin `services:`; secrets solo vía `env:` del step, nunca en `run:`).

## Estructura

* `src/<feature>/`: `*.entity` / `*.routes` / `*.controller` (+ `*.service/logic/utils` opcional), montado en `/api/<feature>`. Compartido en `src/shared/` y `src/utils/`. Prueba manual en `*.http` por módulo.
* Errores → `error-handler.middleware.ts` (antes del 404 `{ message: 'Not Found' }`).

## Referencias

Metodología, gates, multi-chat y E2E: única fuente en el `AGENTS.md` raíz de DevOps. Skills vendoreadas en `.agents/skills/` (cargar solo si aplica); tests solo con Vitest + supertest.
