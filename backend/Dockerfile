# Imagen de producción para la API TechService.
# better-sqlite3 es un módulo nativo: se compila/instala dentro de la imagen.
FROM node:22-bookworm AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    DB_PATH=/data/techservice.sqlite
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 4000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
