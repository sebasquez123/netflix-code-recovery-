FROM node:22.19.0-alpine AS builder

WORKDIR /opt/app

# Copiar archivos de dependencias primero
COPY package.json package-lock.json ./

# Instalar todas las dependencias
RUN npm ci --legacy-peer-deps

# Copiar archivos de configuración necesarios para build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Copiar código fuente y Prisma
COPY src ./src
COPY prisma ./prisma

# Generar cliente de Prisma y construir la aplicación
RUN npx prisma generate
RUN npm run build

# ========================================
# Imagen de producción
# ========================================
FROM node:22.19.0-alpine

ENV NODE_ENV=production

WORKDIR /opt/app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copiar Prisma schema, migraciones, config y generar cliente
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate --config prisma.config.ts

# Copiar la aplicación compilada desde builder
COPY --from=builder /opt/app/dist ./dist

# Copiar las vistas HTML y archivos necesarios
COPY view ./view
COPY .env.example ./

# Copiar script de entrada
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Crear carpeta data
RUN mkdir -p ./data

EXPOSE 3035

ENTRYPOINT ["./docker-entrypoint.sh"]
