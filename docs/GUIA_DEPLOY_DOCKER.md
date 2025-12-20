# 🐳 GUIA COMPLETO DE DEPLOY COM DOCKER
## Net Imobiliária - Arquitetura de Produção

**Data:** 2025-01-24  
**Status:** 📘 Guia de Deploy  
**Versão:** 1.0

---

## 📋 SUMÁRIO

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Arquivos Docker](#2-estrutura-de-arquivos-docker)
3. [Requisitos de Infraestrutura na VPN](#3-requisitos-de-infraestrutura-na-vpn)
4. [Configuração de Rede e Segurança](#4-configuração-de-rede-e-segurança)
5. [Scripts de Deploy](#5-scripts-de-deploy)
6. [Checklist de Instalação](#6-checklist-de-instalação)
7. [Comandos Úteis para Manutenção](#7-comandos-úteis-para-manutenção)

---

## 1. **VISÃO GERAL DA ARQUITETURA**

```
┌─────────────────────────────────────────────────────────┐
│                    VPN/SERVIDOR                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Docker Network (bridge)                  │  │
│  │                                                  │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   │  │
│  │  │  Container App   │    │  Container DB    │   │  │
│  │  │  (Next.js)       │◄───┤  (PostgreSQL)    │   │  │
│  │  │  Port: 3000      │    │  Port: 5432      │   │  │
│  │  └──────────────────┘    └──────────────────┘   │  │
│  │         │                         │              │  │
│  │         │                         │              │  │
│  │         ▼                         ▼              │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │      Volumes Persistentes                 │   │  │
│  │  │  - postgres_data (DB)                     │   │  │
│  │  │  - app_logs (Logs da aplicação)           │   │  │
│  │  │  - app_uploads (Uploads temporários)      │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Serviços Externos (Opcional)                │  │
│  │  - Redis (Cache)                                 │  │
│  │  - MinIO/S3 (Object Storage)                     │  │
│  │  - Nginx (Reverse Proxy)                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. **ESTRUTURA DE ARQUIVOS DOCKER**

### 2.1. Dockerfile da Aplicação

```dockerfile
# Dockerfile (raiz do projeto)
FROM node:18-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild do código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build da aplicação
RUN npm run build

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Criar diretórios para logs e uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2.2. Dockerfile do Banco de Dados (Opcional)

```dockerfile
# Dockerfile.db (opcional - recomendado usar imagem oficial)
FROM postgres:15-alpine

# Copiar scripts de inicialização
COPY database/init-scripts/ /docker-entrypoint-initdb.d/

# Configurações de performance
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=pt_BR.UTF-8"
ENV POSTGRES_SHARED_PRELOAD_LIBRARIES="pg_stat_statements"

# Criar diretório para backups
RUN mkdir -p /backups && chown postgres:postgres /backups
```

### 2.3. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Banco de Dados PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: net-imobiliaria-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-net_imobiliaria}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=pt_BR.UTF-8"
      # Configurações de performance
      POSTGRES_SHARED_PRELOAD_LIBRARIES: "pg_stat_statements"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init-scripts:/docker-entrypoint-initdb.d:ro
      - ./database/backups:/backups:ro
    ports:
      - "${DB_PORT:-5432}:5432"
    networks:
      - net-imobiliaria-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=128MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=4MB
      -c min_wal_size=1GB
      -c max_wal_size=4GB

  # Aplicação Next.js
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: net-imobiliaria-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-net_imobiliaria}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      # Redis (se configurado)
      REDIS_HOST: ${REDIS_HOST:-redis}
      REDIS_PORT: ${REDIS_PORT:-6379}
      # Object Storage (se configurado)
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      # CDN
      CDN_URL: ${CDN_URL}
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - app_logs:/app/logs
      - app_uploads:/app/uploads
    networks:
      - net-imobiliaria-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis (Cache) - Opcional mas recomendado
  redis:
    image: redis:7-alpine
    container_name: net-imobiliaria-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - net-imobiliaria-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "${REDIS_PORT:-6379}:6379"

  # MinIO (Object Storage) - Opcional mas recomendado
  minio:
    image: minio/minio:latest
    container_name: net-imobiliaria-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - net-imobiliaria-network
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Nginx (Reverse Proxy) - Opcional mas recomendado
  nginx:
    image: nginx:alpine
    container_name: net-imobiliaria-nginx
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - net-imobiliaria-network
    depends_on:
      - app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  app_logs:
    driver: local
  app_uploads:
    driver: local

networks:
  net-imobiliaria-network:
    driver: bridge
```

---

## 3. **REQUISITOS DE INFRAESTRUTURA NA VPN**

### 3.1. Software Base Necessário

```bash
# 1. Docker Engine (versão 20.10+)
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verificar instalação
docker --version
docker-compose --version

# 2. Docker Compose (versão 2.0+)
# Já incluído no Docker Desktop ou instalar separadamente:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Git (para clonar repositório)
sudo apt-get update
sudo apt-get install -y git

# 4. Certbot (para SSL/TLS - opcional mas recomendado)
sudo apt-get install -y certbot python3-certbot-nginx
```

### 3.2. Recursos de Hardware Recomendados

```
Mínimo para Produção:
- CPU: 4 cores
- RAM: 8GB (4GB para PostgreSQL, 2GB para App, 2GB sistema)
- Disco: 100GB SSD (50GB para dados, 50GB para backups/logs)
- Rede: 100Mbps

Recomendado para Alta Performance:
- CPU: 8 cores
- RAM: 16GB (8GB PostgreSQL, 4GB App, 2GB Redis, 2GB sistema)
- Disco: 500GB SSD (200GB dados, 200GB backups, 100GB logs)
- Rede: 1Gbps
```

### 3.3. Configurações do Sistema Operacional

```bash
# 1. Aumentar limites do sistema para PostgreSQL
sudo nano /etc/security/limits.conf
# Adicionar:
postgres soft nofile 65536
postgres hard nofile 65536

# 2. Configurar swap (se necessário)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Otimizar kernel para PostgreSQL
sudo nano /etc/sysctl.conf
# Adicionar:
vm.swappiness=10
vm.dirty_ratio=60
vm.dirty_background_ratio=2
kernel.shmmax=68719476736
kernel.shmall=4294967296

# Aplicar configurações
sudo sysctl -p

# 4. Configurar firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (apenas se necessário acesso externo)
sudo ufw enable
```

---

## 4. **CONFIGURAÇÃO DE REDE E SEGURANÇA**

### 4.1. Arquivo .env.production

```env
# .env.production (na VPN)
# ============================================
# BANCO DE DADOS
# ============================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=senha_super_segura_aqui_gerada_aleatoriamente

# ============================================
# APLICAÇÃO
# ============================================
NODE_ENV=production
APP_PORT=3000
HOSTNAME=0.0.0.0

# ============================================
# JWT
# ============================================
JWT_SECRET=jwt_secret_super_seguro_gerado_aleatoriamente_64_chars
JWT_REFRESH_SECRET=refresh_secret_super_seguro_gerado_aleatoriamente_64_chars
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# REDIS (Cache)
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=senha_redis_segura_aqui

# ============================================
# OBJECT STORAGE (MinIO/S3)
# ============================================
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_access_key_aqui
S3_SECRET_KEY=minio_secret_key_aqui
S3_BUCKET=net-imobiliaria-images
S3_REGION=us-east-1
S3_USE_SSL=false

# ============================================
# CDN
# ============================================
CDN_URL=https://cdn.netimobiliaria.com.br

# ============================================
# SEGURANÇA
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://netimobiliaria.com.br,https://www.netimobiliaria.com.br

# ============================================
# LOGS
# ============================================
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

### 4.2. Configuração Nginx (Reverse Proxy)

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    upstream app {
        server app:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name netimobiliaria.com.br www.netimobiliaria.com.br;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name netimobiliaria.com.br www.netimobiliaria.com.br;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints com rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Aplicação Next.js
        location / {
            limit_req zone=general_limit burst=50 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://app/api/health;
        }
    }
}
```

---

## 5. **SCRIPTS DE DEPLOY**

### 5.1. Script de Deploy Inicial

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Iniciando deploy da Net Imobiliária..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado. Instale primeiro.${NC}"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado. Instale primeiro.${NC}"
    exit 1
fi

# Verificar se arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️ Arquivo .env.production não encontrado.${NC}"
    echo "Criando a partir do template..."
    cp env.production.example .env.production
    echo -e "${YELLOW}⚠️ Configure o arquivo .env.production antes de continuar!${NC}"
    exit 1
fi

# Parar containers existentes
echo -e "${YELLOW}🛑 Parando containers existentes...${NC}"
docker-compose down

# Remover imagens antigas (opcional)
read -p "Deseja remover imagens antigas? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️ Removendo imagens antigas...${NC}"
    docker-compose down --rmi all
fi

# Build das imagens
echo -e "${GREEN}🔨 Construindo imagens Docker...${NC}"
docker-compose build --no-cache

# Iniciar serviços
echo -e "${GREEN}🚀 Iniciando serviços...${NC}"
docker-compose up -d

# Aguardar serviços ficarem prontos
echo -e "${YELLOW}⏳ Aguardando serviços ficarem prontos...${NC}"
sleep 10

# Verificar saúde dos serviços
echo -e "${GREEN}🏥 Verificando saúde dos serviços...${NC}"
docker-compose ps

# Executar migrações do banco (se necessário)
echo -e "${YELLOW}📊 Executando migrações do banco de dados...${NC}"
docker-compose exec -T postgres psql -U postgres -d net_imobiliaria -f /docker-entrypoint-initdb.d/migrate.sql || echo "Nenhuma migração pendente"

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}🌐 Aplicação disponível em: http://localhost:3000${NC}"
```

### 5.2. Script de Backup

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "📦 Criando backup do banco de dados..."

docker-compose exec -T postgres pg_dump -U postgres net_imobiliaria > $BACKUP_FILE

# Comprimir backup
gzip $BACKUP_FILE
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup criado: $BACKUP_FILE"

# Manter apenas últimos 7 backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +8 | xargs rm -f

echo "✅ Limpeza de backups antigos concluída"
```

### 5.3. Script de Restore

```bash
#!/bin/bash
# restore.sh

set -e

if [ -z "$1" ]; then
    echo "❌ Uso: ./restore.sh <arquivo_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️ ATENÇÃO: Esta operação irá substituir todos os dados atuais!"
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " -r
if [[ ! $REPLY == "SIM" ]]; then
    echo "Operação cancelada."
    exit 1
fi

echo "🔄 Restaurando backup: $BACKUP_FILE"

# Descomprimir se necessário
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U postgres -d net_imobiliaria
else
    docker-compose exec -T postgres psql -U postgres -d net_imobiliaria < $BACKUP_FILE
fi

echo "✅ Restauração concluída!"
```

---

## 6. **CHECKLIST DE INSTALAÇÃO NA VPN**

### 6.1. Pré-Deploy

- [ ] **Sistema Operacional:** Ubuntu Server 22.04 LTS ou similar
- [ ] **Docker Engine:** Versão 20.10+ instalada e configurada
- [ ] **Docker Compose:** Versão 2.0+ instalada
- [ ] **Git:** Instalado para clonar repositório
- [ ] **Firewall:** Configurado (portas 80, 443, 22)
- [ ] **SSL/TLS:** Certificados obtidos (Let's Encrypt ou comercial)
- [ ] **Domínio:** DNS configurado apontando para IP da VPN
- [ ] **Recursos:** CPU, RAM e disco conforme especificações

### 6.2. Deploy Inicial

- [ ] **Repositório:** Clonado na VPN
- [ ] **Variáveis de Ambiente:** `.env.production` configurado
- [ ] **Senhas:** Todas geradas aleatoriamente e seguras
- [ ] **Volumes:** Diretórios criados com permissões corretas
- [ ] **Build:** Imagens Docker construídas
- [ ] **Containers:** Iniciados e saudáveis
- [ ] **Banco de Dados:** Migrações executadas
- [ ] **Health Checks:** Todos os serviços respondendo

### 6.3. Pós-Deploy

- [ ] **Testes:** Aplicação acessível via domínio
- [ ] **SSL:** Certificado válido e renovação automática configurada
- [ ] **Backups:** Script de backup agendado (cron)
- [ ] **Monitoramento:** Logs sendo coletados
- [ ] **Performance:** Métricas sendo coletadas
- [ ] **Segurança:** Firewall e rate limiting ativos

---

## 7. **COMANDOS ÚTEIS PARA MANUTENÇÃO**

```bash
# Ver logs da aplicação
docker-compose logs -f app

# Ver logs do banco
docker-compose logs -f postgres

# Acessar shell do container da aplicação
docker-compose exec app sh

# Acessar PostgreSQL
docker-compose exec postgres psql -U postgres -d net_imobiliaria

# Reiniciar apenas a aplicação
docker-compose restart app

# Atualizar aplicação (após git pull)
docker-compose build app
docker-compose up -d app

# Ver uso de recursos
docker stats

# Limpar recursos não utilizados
docker system prune -a --volumes

# Backup manual
./backup.sh

# Restore manual
./restore.sh backups/backup_20250124_120000.sql.gz

# Ver status de todos os containers
docker-compose ps

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO!)
docker-compose down -v

# Ver logs de todos os serviços
docker-compose logs

# Executar comando no container
docker-compose exec app npm run migrate

# Escalar serviços (se necessário)
docker-compose up -d --scale app=3
```

---

## 📝 NOTAS IMPORTANTES

### Segurança

1. **Nunca commitar** arquivos `.env.production` no repositório
2. **Sempre usar** senhas fortes e aleatórias
3. **Configurar** firewall adequadamente
4. **Manter** certificados SSL atualizados
5. **Monitorar** logs regularmente

### Performance

1. **Ajustar** configurações do PostgreSQL conforme carga
2. **Monitorar** uso de recursos (CPU, RAM, disco)
3. **Configurar** backups automáticos
4. **Otimizar** queries do banco de dados
5. **Usar** CDN para assets estáticos

### Manutenção

1. **Atualizar** imagens Docker regularmente
2. **Aplicar** patches de segurança
3. **Revisar** logs de erro
4. **Testar** backups periodicamente
5. **Documentar** mudanças na configuração

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Guia de Deploy - Versão 1.0**  
**Última atualização:** 2025-01-24









