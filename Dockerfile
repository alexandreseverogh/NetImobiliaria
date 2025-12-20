FROM node:20-bookworm-slim AS base

WORKDIR /app

# Evita prompts e melhora logs
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

# Dependências (inclui workaround para peer deps do repo)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Código
COPY . .

# Next dev server
EXPOSE 3000

# Em compose nós sobrescrevemos command, mas isso ajuda para rodar isolado
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]



