# AGENTS.md - MyRacing Backend

## Descripción del Proyecto

API REST desarrollada en Express.js + TypeScript usando MikroORM con MySQL. Utiliza pnpm como gestor de paquetes y módulos ESM.

## Estructura del Proyecto

```
MyRacing/
├── MyRacing-Backend/    # Este proyecto (API)
└── MyRacing-Frontend/   # Frontend (mismo nivel)
```

## Comandos

```bash
# Compilar TypeScript a JavaScript
pnpm build

# Ejecutar en modo desarrollo (watch + auto-restart)
pnpm start:dev

# Instalar dependencias
pnpm install

# Testing (si está configurado con vitest)
pnpm test              # ejecutar todos los tests
pnpm test -- run       # ejecutar un solo test
```

**No hay scripts de test o lint configurados.** Si agregas tests, usa `vitest` o `jest`.

## Guías de Estilo de Código

### Imports

- Usar extensión `.js` en los imports incluso para archivos `.ts` (requerido para ESM):
  ```typescript
  import { User } from '../user/user.entity.js';
  import { orm } from '../shared/orm.js';
  ```
- Agrupar imports: libs externas → shared → módulos locales
- Usar imports absolutos desde `src/` cuando sea posible

### TypeScript

- Habilitar `strict: true` en tsconfig
- Siempre tipar parámetros de funciones y valores de retorno
- Evitar `any`, usar `unknown` cuando el tipo no sea seguro
- Usar interfaces para formas de objetos, types para uniones/alias

### Convenciones de Nombres

- **Archivos**: kebab-case (`user.entity.ts`, `auth.routes.ts`)
- **Clases/Entidades**: PascalCase (`User`, `RaceUser`)
- **Funciones/Variables**: camelCase (`generateTokens`, `refreshTokenStore`)
- **Enums**: PascalCase con miembros PascalCase (`UserType.ADMIN`)
- **Constantes**: UPPER_SNAKE_CASE para valores de configuración

### Manejo de Errores

- Usar try/catch en controladores, devolver códigos HTTP apropiados:
  - `400` para bad requests / errores de validación
  - `401` para no autorizado
  - `403` para prohibido
  - `404` para no encontrado
  - `500` para errores del servidor
- Siempre hacer `return` después de enviar respuesta en Express
- El bloque catch debe manejar `error: any` y extraer `error.message`

### Patrón de Estructura

```
src/
├── app.ts              # Punto de entrada, middleware, mounting de rutas
├── shared/            # Config, ORM, entidades base
├── auth/              # Rutas y controlador de auth
├── user/              # Entidad, rutas, controlador
├── race/              # Entidad, rutas, controlador, lógica
├── [feature]/
│   ├── [feature].entity.ts
│   ├── [feature].routes.ts
│   └── [feature].controller.ts
```

### Convenciones de Entidades (MikroORM)

- Extender `BaseEntity` que provee `id` (string UUID) y timestamps
- Usar decorador `@Entity()`
- Usar `@Property()` para columnas, `@Enum()` para enums
- Usar `@OneToMany` / `@ManyToOne` para relaciones con `Cascade.ALL` cuando sea necesario
- Exportar clase de entidad y enum juntos

### Patrones de Controlador

- Exportar funciones nombradas, no default
- Primer parámetro es `Request`, segundo es `Response`
- Obtener entity manager vía `orm.em`
- Siempre llamar `em.flush()` después de crear/actualizar
- Devolver respuestas JSON con estructura consistente:
  ```typescript
  res.status(200).json({ message: '...', data: ... })
  res.status(201).json({ message: '...', data: ... })
  res.status(400).json({ message: '...' })
  ```

### Autenticación

- Tokens JWT almacenados en memoria (producción: usar Redis)
- Dos tokens: access token + refresh token
- Secretos desde `src/shared/config.ts` vía variables de entorno
- Middleware de auth en `src/auth/auth.middleware.ts`

### General

- Usar `async/await` para todas las operaciones async
- Usar `Set` para colecciones simples en memoria
- Variables de entorno en archivo `.env` (no commitear)
- Importar `reflect-metadata` al inicio de `app.ts` para decoradores de MikroORM
- Orden de middleware: cors → json → RequestContext → rutas → handler 404

## Variables de Entorno Requeridas

```ini
JWT_SECRET=tu_clave_secreta
JWT_REFRESH_SECRET=tu_clave_refresh
# Mercadopago
MERCADOPAGO_ACCESS_TOKEN=tu_token
URL_FRONTEND=http://localhost:5173
URL_BACKEND=http://localhost:3000
URL_WEBHOOK_MP=tu_url_webhook
```

## Endpoints de la API

```
/api/auth          - Autenticación (register, login, refresh, logout)
/api/users         - Gestión de usuarios
/api/categories    - Categorías
/api/circuits      - Circuitos
/api/simulators    - Simuladores
/api/combinations  - Combinaciones
/api/membership    - Membresías
/api/races         - Carreras
/api/race-users    - Inscripciones
/api/payment       - Pagos (Mercado Pago)
  POST /create-preference     - Crear preferencia de pago
  POST /process-payment       - Procesar pago
  GET  /check-payment-status  - Consultar estado
  POST /wh-mp                - Webhook de Mercado Pago
```

## Integraciones

### Mercado Pago
- **Ubicación**: `src/payment/`
- **Funcionalidad**: Pagos con tarjeta, webhook para confirmación async
- **Flujo**: 
  1. Usuario solicita membresía premium
  2. Backend crea preferencia en MP → devuelve preferenceId
  3. Frontend usa preferenceId para procesar pago
  4. Webhook actualiza usuario a PREMIUM

Conexión a base de datos configurada en `src/shared/orm.ts` (por defecto: `myracing` en localhost:3306).

## Skills del Proyecto

Skills específicas para este proyecto (almacenadas en `.agents/skills/`):

### docker-expert
- **Descripción**: Mejores prácticas y configuraciones de Docker
- **Cuándo usarlo**: Para crear Dockerfiles y docker-compose
- **Ubicación**: `.agents/skills/docker-expert/SKILL.md`

### multi-stage-dockerfile
- **Descripción**: Dockerfiles multi-stage para aplicaciones optimizadas
- **Cuándo usarlo**: Para crear Dockerfiles optimizados
- **Ubicación**: `.agents/skills/multi-stage-dockerfile/SKILL.md`

### typescript-advanced-types
- **Descripción**: Patrones avanzados de TypeScript
- **Cuándo usarlo**: Para tipos complejos, generics, utility types
- **Ubicación**: `.agents/skills/typescript-advanced-types/SKILL.md`

### mysql
- **Descripción**: Guías y mejores prácticas para MySQL
- **Cuándo usarlo**: Para integración y manejo de bases de datos MySQL
- **Ubicación**: `.agents/skills/mysql/SKILL.md`

## Skills Globales

Skills disponibles globalmente que pueden cargarse según necesidad:

### find-skills
- **Descripción**: Descubrir e instalar skills del ecosistema opencode
- **Cuándo usarlo**: Para buscar skills adicionales
- **Ubicación**: `file:///home/santi/.agents/skills/find-skills/SKILL.md`

### webapp-testing
- **Descripción**: Estrategias y patrones de testing para webapps
- **Cuándo usarlo**: Para tests E2E/integración de aplicaciones web
- **Ubicación**: `file:///home/santi/.agents/skills/webapp-testing/SKILL.md`

### neon-postgres
- **Descripción**: Configuración y mejores prácticas para Neon PostgreSQL
- **Cuándo usarlo**: Para integración con PostgreSQL
- **Ubicación**: `file:///home/santi/.agents/skills/neon-postgres/SKILL.md`

### frontend-design
- **Descripción**: Creación de interfaces frontend de alta calidad
- **Cuándo usarlo**: Para construir UI web
- **Ubicación**: `file:///home/santi/.agents/skills/frontend-design/SKILL.md`

## Guía de Uso de Skills por Tarea

Usa estas skills cuando trabajes en tareas específicas:

### Testing
- **Tests E2E/integración**: Usar skill `webapp-testing` (global) - usa Playwright

### Docker
- **Crear Dockerfile**: Usar skill `docker-expert` (del proyecto)
- **Dockerfile optimizado**: Usar skill `multi-stage-dockerfile` (del proyecto)

### TypeScript
- **Tipos complejos/generics**: Usar skill `typescript-advanced-types` (del proyecto)

### Base de Datos
- **MySQL**: Usar skill `mysql` (del proyecto)
- **PostgreSQL/Neon**: Usar skill `neon-postgres` (global)
- **Migaciones**: Buscar skill `database-migration`

### Refactoring
- **Buscar skill**: Usar skill `find-skills` (global)
