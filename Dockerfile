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

# Client do Prisma (schema campanhasmarketingdigital, prisma.config.ts já aponta pra ele) —
# sem este passo o container sobe sem node_modules/.prisma/client e quebra em runtime
# (achado real: netimobiliaria-app ficava "unhealthy" indefinidamente, todo cron que
# importasse agentMonitor.ts/prisma.ts derrubava com "Module not found: .prisma/client/default").
RUN npx prisma generate

# Next dev server
EXPOSE 3000

# Em compose nós sobrescrevemos command, mas isso ajuda para rodar isolado
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]



