# MyRacing - Backend API

Este repositorio contiene el servicio de API REST desarrollado en Node.js y TypeScript para la plataforma MyRacing. Gestiona la lógica de negocio, la persistencia de datos y la autenticación.

## Integrantes

- Chiesa, Máximo
- Goya, Santiago
- Marini, Luciano
- Teglia, Lisandro

---

## 🛠️ Tecnologías Clave

- **Lenguaje:** Node.js / TypeScript
- **Framework:** Express.js
- **ORM:** MikroORM
- **Base de Datos:** MySQL
- **Autenticación:** JWT (JSON Web Tokens)
- **Gestor de Paquetes:** pnpm

---

## 🚀 Instalación y Ejecución

### 1. Requisitos Previos

- **Node.js:** v20 o superior.
- **pnpm:** Instalar globalmente si es necesario.
- **MySQL:** Un servidor MySQL en ejecución.
  - La configuración del ORM espera una base de datos llamada `myracing` en `localhost:3306`.

### 2. Obtener el Código e Instalar Dependencias

1.  **Clonar y Acceder:**
    ```bash
    git clone [URL_DEL_REPOSITORIO_BACKEND]
    cd myracing-backend
    ```
2.  **Instalar Dependencias:**
    ```bash
    pnpm install
    ```

### 3. Configuración del Entorno (`.env`)

La API requiere la configuración de claves secretas para la autenticación JWT.

1.  **Crear** un archivo llamado **`.env`** en la **raíz del proyecto** (al mismo nivel que `package.json`).
2.  Copiar la siguiente plantilla y reemplazar los valores de ejemplo por claves seguras:

    ```ini
    # Archivo .env
    # --- JWT Secrets (Requeridos para el correcto funcionamiento de la autenticación) ---
    JWT_SECRET=[CLAVE_SECRETA_FUERTE_PARA_ACCESO]
    JWT_REFRESH_SECRET=[CLAVE_SECRETA_FUERTE_PARA_REFRESH]
    ```

### 4. Preparar la Base de Datos

El proyecto utiliza **MikroORM** para la gestión del esquema.

1.  **Crear la Base de Datos:** Asegurase de que la base de datos `myracing` (o la configurada en `src/shared/orm.ts`) exista en tu servidor MySQL.
2.  **Sincronizar el Esquema (Crear/Actualizar Tablas):**
    El script principal (`app.ts`) llama a `await syncSchema()` al inicio, que automáticamente crea o actualiza las tablas necesarias en la base de datos.

### 5. Ejecutar el Proyecto (Modo Desarrollo)

Utilizar el script de desarrollo, que compila (TypeScript a JavaScript) y ejecuta el servidor, observando los cambios:

```bash
pnpm start:dev
```
