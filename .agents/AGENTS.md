# AGENTS.md - MyRacing Backend

## Project

Express.js + TypeScript REST API using MikroORM with MySQL. ESM modules, pnpm.

## Commands (verified)

| Command        | Description                     |
| -------------- | ------------------------------- |
| `pnpm dev`     | Development with tsx hot reload |
| `pnpm build`   | Compile TypeScript to dist/     |
| `pnpm start`   | Run production from dist/       |
| `pnpm install` | Install dependencies            |

No test scripts configured. Add tests with `vitest` if needed.

## Code Style (repo-specific)

### Imports

- Use `.js` extension in imports for ESM: `import { User } from '../user/user.entity.js'`
- Group: external libs → shared → local modules
- Use `src/` paths when possible

### TypeScript

- `strict: true` enabled
- Always type params and return values
- Avoid `any`; use `unknown` if unsure

### Naming

- Files: kebab-case (`user.entity.ts`)
- Classes: PascalCase (`User`)
- Functions/variables: camelCase

### Error Handling

- Use try/catch in controllers
- Return appropriate HTTP codes: 400/401/403/404/500
- Always `return` after sending response in Express

## Architecture

### Directory Pattern

```
src/
├── app.ts              # Entry point
├── shared/            # Config, ORM, base entity, logger
├── auth/              # Auth: routes, controller, middleware, token/email services
├── user/              # User entity + CRUD
├── race/              # Race entity + logic + controller
├── [feature]/
│   ├── [feature].entity.ts
│   ├── [feature].routes.ts
│   └── [feature].controller.ts
```

### Entities (MikroORM)

- Extend `BaseEntity` (provides `id` UUID + timestamps)
- Use `@Entity()`, `@Property()`, `@Enum()`
- Use `@OneToMany` / `@ManyToOne` with `Cascade.ALL` when needed

### Controllers

- Named exports, not default
- `(req: Request, res: Response)` signature
- Use `orm.em` for entity manager
- Call `em.flush()` after create/update

### Middleware Order

`cors → json → RequestContext → routes → 404`

- Import `reflect-metadata` at top of `app.ts` for MikroORM decorators

### Auth

- JWT in memory (use Redis for prod)
- Two tokens: access + refresh
- Secrets from `src/shared/config.ts`

## Env Vars (`.env`)

```ini
JWT_SECRET=
JWT_REFRESH_SECRET=
URL_FRONTEND=http://localhost:5173
URL_BACKEND=http://localhost:3000
```

## API Routes

| Endpoint            | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `/api/auth`         | register, login, refresh, logout                                              |
| `/api/users`        | User CRUD                                                                     |
| `/api/categories`   | Category CRUD                                                                 |
| `/api/circuits`     | Circuit CRUD                                                                  |
| `/api/simulators`   | Simulator CRUD                                                                |
| `/api/combinations` | Combination CRUD                                                              |
| `/api/membership`   | Membership CRUD                                                               |
| `/api/races`        | Race CRUD                                                                     |
| `/api/race-users`   | Race registration                                                             |
| `/api/payment`      | Mercado Pago: create-preference, process-payment, check-payment-status, wh-mp |

DB: MikroORM connects to MySQL `myracing` database in `src/shared/orm.ts`.

## Skills

Load via `skill` tool when needed:

| Skill                       | Use For                         |
| --------------------------- | ------------------------------- |
| `docker-expert`             | Docker configurations           |
| `multi-stage-dockerfile`    | Optimized Dockerfiles           |
| `typescript-advanced-types` | Complex types/generics          |
| `mysql`                     | MySQL schema, queries, indexing |
| `webapp-testing` (global)   | E2E tests with Playwright       |
| `find-skills` (global)      | Discover more skills            |
