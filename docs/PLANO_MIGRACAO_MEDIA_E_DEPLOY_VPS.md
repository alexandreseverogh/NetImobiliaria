# Plano Consolidado: Migração de Mídia + Deploy VPS Hostinger

**Data:** 2026-05-04  
**Status:** 📋 Planejamento (Não Implementar)  
**Prioridade:** 🚨 CRÍTICA  
**Conformidade:** ✅ GUARDIAN RULES COMPLIANT

---

## 1. Contexto: Estado Atual do Deploy

### 1.1. O que já existe

| Componente | Arquivo | Status |
|---|---|---|
| Compose de VPS (prod + staging) | `docker-compose.vps.yml` | ✅ Operacional |
| Dockerfile de produção | `Dockerfile.prod` | ✅ Operacional |
| Dockerfile de feed RSS | `Dockerfile.feed` | ✅ Operacional |
| Reverse Proxy (Caddy + HTTPS) | `ops/Caddyfile` | ✅ Operacional |
| Tradutor (LibreTranslate) | Serviço Docker | ✅ Operacional |
| Scripts de deploy VPS | `scripts/vps/*.sh` | ✅ Operacional |
| Variáveis de ambiente | `env.vps.example` | ✅ Template pronto |

### 1.2. O que **NÃO** existe ainda no `docker-compose.vps.yml`

| Componente | Status | Impacto |
|---|---|---|
| **MinIO (Object Storage)** | ❌ Ausente | Imagens ficam no BYTEA do Postgres |
| **Redis (Cache)** | ❌ Ausente | Sem cache centralizado |
| **Volumes para mídia** | ❌ Ausente | Sem persistência de arquivos fora do DB |

> **Nota:** O `GUIA_DEPLOY_DOCKER.md` já documenta MinIO e Redis como serviços opcionais e o `env.production.example` já prevê as variáveis `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_BUCKET`, `CDN_URL`, `REDIS_HOST` e `REDIS_PORT`. A infraestrutura Docker foi **projetada** para recebê-los, mas eles ainda não foram adicionados ao compose real da VPS.

---

## 2. Arquitetura Alvo

```
┌─────────────────────────────────────────────────────────────────┐
│                    VPS HOSTINGER (Ubuntu)                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Docker Network (bridge)                      │  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │  │
│  │  │ prod_app │  │ prod_db  │  │ redis  │  │   minio   │  │  │
│  │  │ Next.js  │  │ Postgres │  │ Cache  │  │  Storage  │  │  │
│  │  │ :3000    │  │ :5432    │  │ :6379  │  │ :9000     │  │  │
│  │  └──────────┘  └──────────┘  └────────┘  └───────────┘  │  │
│  │       │              │            │            │          │  │
│  │       └──────────────┴────────────┴────────────┘          │  │
│  │                        │                                  │  │
│  │  ┌──────────┐  ┌──────────────┐                          │  │
│  │  │  caddy   │  │ libretranslate│                          │  │
│  │  │ :80/:443 │  │    :5000     │                          │  │
│  │  └──────────┘  └──────────────┘                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Volumes:                                                       │
│  ├── db_data_prod      (Postgres)                               │
│  ├── db_data_staging   (Postgres staging)                       │
│  ├── redis_data        (Cache persistente)    ← NOVO            │
│  ├── minio_data        (Imagens/Documentos)   ← NOVO            │
│  ├── caddy_data        (Certificados SSL)                       │
│  └── caddy_config      (Config Caddy)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Alterações Necessárias no `docker-compose.vps.yml`

### 3.1. Novos Serviços a Adicionar

#### Redis (Cache Compartilhado - Prod + Staging)
```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

#### MinIO (Object Storage - Prod + Staging)
```yaml
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    expose:
      - "9000"
    ports:
      - "127.0.0.1:9001:9001"  # Console acessível via SSH tunnel
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3.2. Novos Volumes
```yaml
volumes:
  db_data_prod:
  db_data_staging:
  redis_data:       # ← NOVO
  minio_data:       # ← NOVO
  caddy_data:
  caddy_config:
```

### 3.3. Novas Variáveis de Ambiente nos Apps (prod_app e staging_app)
```yaml
    environment:
      # ... (existentes) ...
      # Cache
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      # Object Storage
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET: ${S3_BUCKET_PROD:-netimobiliaria-prod}
      S3_REGION: us-east-1
      S3_FORCE_PATH_STYLE: "true"  # Necessário para MinIO
```

### 3.4. Dependências Atualizadas
```yaml
  prod_app:
    depends_on:
      prod_db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy  # ← NOVO
```

---

## 4. Novas Variáveis no `env.vps.example`

```env
# ============================================
# REDIS (Cache Compartilhado)
# ============================================
REDIS_PASSWORD=gerar_senha_forte_aqui

# ============================================
# MINIO (Object Storage Self-Hosted)
# ============================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=gerar_senha_forte_aqui
S3_BUCKET_PROD=netimobiliaria-prod
S3_BUCKET_STAGING=netimobiliaria-staging
```

---

## 5. Fluxo de Migração das Imagens (BYTEA → MinIO)

### Fase 1: Preparação do Esquema (SQL Idempotente)
```sql
-- Adicionar colunas de suporte sem remover as atuais
ALTER TABLE imovel_imagens
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_cdn VARCHAR(500),
  ADD COLUMN IF NOT EXISTS processada BOOLEAN DEFAULT false;

-- Índice para busca rápida por tipo de storage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imovel_imagens_storage_type
ON imovel_imagens(storage_type) WHERE storage_type = 's3';
```

### Fase 2: API de Streaming com Fallback Inteligente
A rota `/api/public/imagens/[id]` será atualizada para:
1. Se `storage_type = 's3'` → **Redirect 302** para URL do MinIO/CDN (zero CPU no servidor).
2. Se `storage_type = 'database'` → Entrega o BYTEA como hoje (fallback).

### Fase 3: Dual-Writer no Upload
Novos uploads salvam simultaneamente no MinIO **e** no BYTEA (segurança). Após 30 dias de estabilidade, o salvamento BYTEA é desligado.

### Fase 4: Robô de Migração em Background
Script que roda via cron dentro do container `prod_app`:
1. Seleciona 500 imagens com `storage_type = 'database'`.
2. Upload para MinIO.
3. Atualiza `storage_type = 's3'` e `s3_key`.
4. Limpa a coluna BYTEA (`SET imagem = NULL`).
5. Log de progresso: `migrated: X/Y (Z%)`.

---

## 6. Scripts de Deploy Atualizados

### 6.1. `scripts/vps/deploy.sh` — Nova Etapa: Inicializar Buckets
Após o `docker compose up`, adicionar:
```bash
# Criar buckets no MinIO (idempotente)
echo "📦 Inicializando buckets MinIO..."
docker compose -f docker-compose.vps.yml exec -T minio \
  mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD 2>/dev/null || true
docker compose -f docker-compose.vps.yml exec -T minio \
  mc mb local/$S3_BUCKET_PROD --ignore-existing 2>/dev/null || true
docker compose -f docker-compose.vps.yml exec -T minio \
  mc mb local/$S3_BUCKET_STAGING --ignore-existing 2>/dev/null || true
echo "✅ Buckets prontos."
```

### 6.2. Novo Script: `scripts/vps/migrate-images.sh`
```bash
#!/bin/bash
# Executa migração de imagens BYTEA → MinIO em background
set -e
ENV=${1:-prod}
echo "🖼️ Iniciando migração de imagens ($ENV)..."
docker compose -f docker-compose.vps.yml exec -T ${ENV}_app \
  node scripts/migrate-images-to-s3.js --batch-size=500 --env=$ENV
echo "✅ Migração concluída."
```

---

## 7. Impacto em Recursos da VPS

### 7.1. Consumo Adicional de RAM
| Serviço | RAM Estimada |
|---|---|
| Redis | ~50-100MB (limite de 256MB configurado) |
| MinIO | ~100-200MB |
| **Total adicional** | **~150-300MB** |

### 7.2. Consumo de Disco
| Componente | Antes | Depois |
|---|---|---|
| Postgres (prod) | Cresce ~1GB/dia com imagens | Cresce apenas KBs/dia |
| MinIO (prod) | N/A | Cresce ~1GB/dia (arquivos brutos, comprimíveis) |
| **Backup** | Horas (inclui binários) | Minutos (apenas metadados) |

### 7.3. Requisitos Mínimos da VPS
| Recurso | Atual (sem MinIO/Redis) | Recomendado (com MinIO/Redis) |
|---|---|---|
| CPU | 4 cores | 4 cores (sem mudança) |
| RAM | 4GB | **6-8GB** |
| Disco | 100GB SSD | **200GB SSD** (imagens fora do DB) |

---

## 8. Checklist de Execução (Ordem Obrigatória)

### Pré-Deploy (Local/Staging)
- [x] Atualizar `docker-compose.vps.yml` com Redis e MinIO
- [x] Atualizar `env.vps.example` com novas variáveis
- [x] Criar `src/lib/storage/s3-client.ts` (SDK MinIO)
- [x] Atualizar API `/api/public/imagens/[id]` com fallback
- [x] Atualizar API de upload para Dual-Writer
- [x] Atualizar `deleteImovelImagemPermanente` para limpar S3
- [x] Criar script `scripts/migrate-images-to-s3.js`
- [x] Criar script `scripts/vps/migrate-images.sh`
- [ ] **PENDENTE** — Executar migration SQL no banco local (requer `psql`)
- [ ] **PENDENTE** — Testar ciclo completo em staging

### Deploy na VPS
- [ ] `git pull` na VPS
- [ ] `docker compose up -d --build` (sobe Redis + MinIO)
- [ ] Inicializar buckets (`mc mb`)
- [ ] Executar migration SQL no prod_db
- [ ] Validar health checks de todos os serviços
- [ ] Testar upload de nova imagem (vai para MinIO)
- [ ] Executar migração em background (`migrate-images.sh prod`)

### Pós-Deploy (Validação)
- [ ] Verificar que imagens novas vêm do MinIO (redirect 302)
- [ ] Verificar que imagens antigas ainda funcionam (fallback BYTEA)
- [ ] Monitorar progresso da migração (`migrated: X/Y`)
- [ ] Após 100% migrado + 30 dias: desligar Dual-Writer

---

## 9. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| MinIO fica indisponível | 🟢 Baixa | 🟡 Médio | Fallback para BYTEA permanece ativo |
| Disco da VPS enche | 🟡 Média | 🔴 Alto | Monitorar com `df -h`; alertas via cron |
| RAM insuficiente | 🟡 Média | 🟡 Médio | Redis limitado a 256MB; MinIO é leve |
| Migração corrompe imagem | 🟢 Baixa | 🔴 Alto | Validação de hash MD5 antes/depois; BYTEA só é limpo após confirmação |
| Perda de dados no MinIO | 🟢 Baixa | 🔴 Alto | Volume Docker persistente + backup periódico do volume |

---

## 10. Custo Total

| Item | Custo |
|---|---|
| Redis 7 (Alpine) | **R$ 0,00** (Open Source, self-hosted) |
| MinIO (Latest) | **R$ 0,00** (Open Source, self-hosted) |
| Cloudflare CDN (Free) | **R$ 0,00** (Plano gratuito) |
| Upgrade de VPS (RAM/Disco) | **~R$ 30-50/mês** (se necessário) |
| **Total** | **R$ 0 a R$ 50/mês** |

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Última atualização:** 2026-05-04
