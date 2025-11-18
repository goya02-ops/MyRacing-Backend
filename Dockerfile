# MyRacing-Backend/Dockerfile
FROM node:24-alpine 

# Definimos la versión de PNPM (para consistencia)
ARG PNPM_VERSION=10 

# 1. PASO CRÍTICO: Instalar pnpm globalmente usando npm
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /usr/src/app

ENV NODE_ENV development 

# Copiamos solo los archivos de configuración
COPY package.json pnpm-lock.yaml ./

# Instalamos todas las dependencias (incluyendo tsc-watch)
RUN pnpm install --frozen-lockfile

# Copiamos el resto del código 
COPY . .

# Comando que inicia tsc-watch para la recarga en caliente
CMD ["pnpm", "run", "start:dev"]