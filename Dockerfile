# Doe por Eles — Dockerfile para produção
FROM node:18-alpine

WORKDIR /app

# Dependências
COPY package*.json ./
RUN npm ci --only=production

# Código
COPY server ./server
COPY public ./public
COPY knexfile.cjs ./

# Criar pasta data e rodar migrations
RUN mkdir -p data && npx knex --knexfile knexfile.cjs migrate:latest || true

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "server/node/index.js"]
