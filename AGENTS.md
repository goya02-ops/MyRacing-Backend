# AGENTS.md - MyRacing Backend

Express 5 + TypeScript REST API, MikroORM 6 + MySQL 8, JWT auth, Mercado Pago payments. ESM (`"type": "module"`), pnpm 10. Node 20+.

## Commands

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `pnpm dev`      | Dev server with tsx hot reload       |
| `pnpm build`    | Compile TS to `dist/` (CI build gate)|
| `pnpm start`    | Run `dist/app.js`                    |
| `pnpm install`  | Install (use `--frozen-lockfile` in CI) |
| `pnpm test`     | Vitest suite (`vitest run`, gate de CI) |
| `pnpm test:coverage` | Vitest + coverage total ≥80% (gate de `main`, hoy falla: 0 tests) |

- Vitest 4 + `@vitest/coverage-v8`, config en `vitest.config.ts`
  (thresholds 80 en lines/functions/branches/statements; solo se evalúan
  con `--coverage`, o sea en `pnpm test:coverage`).
- Verification step = `pnpm build` (strict TS). Run it before committing.

## Hard requirements / gotchas

- **ESM imports need `.js` extensions**: `import { User } from '../user/user.entity.js'` (even though files are `.ts`).
- **Entities must be named `*.entity.ts`** — `src/shared/orm.ts` globs `./src/**/*.entity.ts` / `./dist/**/*.entity.js`. Other filenames won't be registered.
- `src/shared/orm.ts` connects at import time (top-level await) and hardcodes dbName `myracing` — importing it requires a reachable MySQL.
- **`src/app.ts` calls `syncSchema()` on startup**: schema is auto-created/updated, there are no migrations. Never run `pnpm dev`/`start` against a production DB.
- All requests run inside `RequestContext.create(orm.em, next)` (middleware in `app.ts`). Controllers should use `orm.em` (the context fork), call `em.flush()`, and import `RequestContext`-scoped EM rather than creating new ones.
- `reflect-metadata` must be imported first in `app.ts` (MikroORM decorators).
- `src/shared/config.ts` falls back to insecure hardcoded JWT secrets and empty DB credentials — always set real values in `.env`.
- `tsconfig`: `strict`, decorators enabled, `moduleResolution: bundler`, incremental (leaves `tsconfig.tsbuildinfo`).

## Environment

Required in `.env` (see `.env.example`): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `URL_FRONTEND`, `URL_BACKEND`, `URL_WEBHOOK_MP`, plus `BREVO_API_KEY`/`FROM_EMAIL` for email.

- Local dev MySQL via `docker compose -f ../compose.dev.yaml up -d` (from parent `MyRacing-DevOps/`) exposes port **3307**; CI uses **3306** with service container. Don't mix them up.
- Dev DB user: `admin` / `MiR@cing_2025!` (from compose file / `.env.example`).

## Structure

`src/app.ts` is the entrypoint; each feature is a folder with `*.entity.ts`, `*.routes.ts`, `*.controller.ts` (+ optional `*.service.ts`/`*.logic.ts`/`*.utils.ts`), mounted under `/api/<feature>` in `app.ts`. Shared code in `src/shared/` (config, orm, baseEntity, error-handler, logger) and `src/utils/`.

- Routes mount order: `/api/categories`, `/api/circuits`, `/api/simulators`, `/api/users`, `/api/circuits-version`, `/api/categories-version`, `/api/combinations`, `/api/membership`, `/api/races`, `/api/race-users`, `/api/payment`, `/api/auth`.
- Controllers: named exports, return after `res.json(...)`, errors go through `src/shared/error-handler.middleware.ts` (registered before the 404 handler).
- `BaseEntity` (`src/shared/baseEntity.ts`) provides UUID id + timestamps; extend it for new entities.
- Manual endpoint testing: per-module `*.http` files (e.g. `src/user/user.http`).

## CI/CD

- `.github/workflows/ci.yml`: on push to `develop`/`main` and PRs — `pnpm build` + MySQL-backed test job. Job `Coverage` (solo PRs/pushes a `main`): `pnpm test:coverage` con thresholds ≥80.
- `.github/workflows/deploy.yml`: on successful CI on `main`, deploy via buildpack (Railway/Render, no Docker). Antes verifica el Quality Gate de SonarCloud vía API (aborta si no es OK) y requiere `RAILWAY_TOKEN`. Secrets: `SONAR_TOKEN`, `DB_*`, `JWT_*`, `MERCADOPAGO_ACCESS_TOKEN`, `URL_*`.
- **Branch protection**: merge a `develop` se bloquea si fallan los tests. Merge a `main` exige además cobertura ≥80% (vitest) y Quality Gate de SonarCloud verde.
- SonarCloud (`SonarQubeCloud` GitHub App) runs analysis on every push/PR; the Quality Gate must pass for merges into `main` (not blocking `develop`).
- Tests use Vitest + supertest; check `package.json` scripts (`test`) and `vitest.config` for coverage thresholds.
- TDD: integration tests against the real app (`app.ts` must be exported, see BE-1) before refactoring.

## Skills

- Skills instaladas en `.agents/skills/`: `mysql` (queries, índices, N+1),
  `docker-expert` / `multi-stage-dockerfile`. Cargar solo cuando aplique.
- Testing con **Vitest** (+ supertest desde BE-2); no usar Jest.
- Subagentes de referencia en `.opencode/agents/` (programador/tester/juez;
  flujo TDD en el `AGENTS.md` raíz de DevOps).
