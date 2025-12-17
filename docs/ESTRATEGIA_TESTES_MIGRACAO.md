# 🧪 ESTRATÉGIA DE TESTES E MIGRAÇÃO
## Net Imobiliária - Desenvolvimento Local → Produção VPS

**Data:** 2025-01-24  
**Status:** 📋 Estratégia de Implementação  
**Conformidade:** ✅ GUARDIAN RULES COMPLIANT

---

## 📋 **ÍNDICE**

1. [Visão Geral da Estratégia](#visão-geral-da-estratégia)
2. [Ambientes de Desenvolvimento](#ambientes-de-desenvolvimento)
3. [Estratégia de Testes Incremental](#estratégia-de-testes-incremental)
4. [Migração Local → VPS](#migração-local--vps)
5. [Checklist de Migração](#checklist-de-migração)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 **VISÃO GERAL DA ESTRATÉGIA**

### **✅ SIM: Configurar Localmente Primeiro!**

**Fluxo Recomendado:**
```
1. Desenvolvimento Local (Docker)
   ↓
2. Testes Locais (Validação)
   ↓
3. Deploy Incremental na VPS (Fase por Fase)
   ↓
4. Validação em Produção
   ↓
5. Migração Completa
```

**Vantagens desta Abordagem:**
- ✅ Testes sem risco em produção
- ✅ Desenvolvimento rápido (sem latência de rede)
- ✅ Rollback fácil (apenas parar containers locais)
- ✅ Validação completa antes de deploy
- ✅ Docker garante consistência entre ambientes

---

## 🏗️ **AMBIENTES DE DESENVOLVIMENTO**

### **Ambiente 1: Desenvolvimento Local**

**Objetivo:** Desenvolvimento e testes iniciais

**Configuração:**
```yaml
# docker-compose.local.yml
version: '3.8'

services:
  # PostgreSQL Local
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: net_imobiliaria_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  # Redis Local (Cache)
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

  # MinIO Local (Object Storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    volumes:
      - minio_dev_data:/data

volumes:
  postgres_dev_data:
  redis_dev_data:
  minio_dev_data:
```

**Variáveis de Ambiente Local:**
```env
# .env.local
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=net_imobiliaria_dev
DB_USER=postgres
DB_PASSWORD=dev_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=net-imobiliaria-dev
S3_USE_SSL=false

# CDN (apenas para testes - usar URL local)
CDN_URL=http://localhost:9000
```

**Comandos para Iniciar:**
```bash
# Iniciar serviços locais
docker-compose -f docker-compose.local.yml up -d

# Ver logs
docker-compose -f docker-compose.local.yml logs -f

# Parar serviços
docker-compose -f docker-compose.local.yml down

# Limpar volumes (cuidado - apaga dados!)
docker-compose -f docker-compose.local.yml down -v
```

---

### **Ambiente 2: Staging na VPS (Opcional mas Recomendado)**

**Objetivo:** Testes em ambiente similar à produção

**Configuração:**
- Mesma estrutura da produção
- Dados de teste (não dados reais)
- Acesso restrito (apenas desenvolvedores)

**Vantagens:**
- ✅ Testa configuração de rede real
- ✅ Valida performance com latência real
- ✅ Testa integração com Cloudflare
- ✅ Valida backup/restore

---

### **Ambiente 3: Produção na VPS**

**Objetivo:** Ambiente final com dados reais

**Configuração:**
- Mesma estrutura do local, mas com:
  - Senhas fortes
  - SSL/TLS configurado
  - Cloudflare CDN ativo
  - Monitoramento ativo
  - Backups automáticos

---

## 🧪 **ESTRATÉGIA DE TESTES INCREMENTAL**

### **Fase 1: Testes Locais (Sem Risco)**

#### **1.1. Testes de Infraestrutura**

**Objetivo:** Validar que todos os serviços funcionam localmente

**Checklist:**
```bash
# 1. Verificar PostgreSQL
docker-compose -f docker-compose.local.yml exec postgres psql -U postgres -d net_imobiliaria_dev -c "SELECT version();"

# 2. Verificar Redis
docker-compose -f docker-compose.local.yml exec redis redis-cli ping
# Deve retornar: PONG

# 3. Verificar MinIO
curl http://localhost:9000/minio/health/live
# Deve retornar: OK

# 4. Acessar Console MinIO
# Abrir: http://localhost:9001
# Login: minioadmin / minioadmin
```

#### **1.2. Testes de Integração**

**Objetivo:** Validar integração entre serviços

**Script de Teste:**
```typescript
// scripts/test-local-integration.ts
import { Pool } from 'pg';
import Redis from 'ioredis';
import { S3Client } from '@aws-sdk/client-s3';

async function testIntegration() {
  console.log('🧪 Testando integração local...');
  
  // 1. Testar PostgreSQL
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'net_imobiliaria_dev',
    user: 'postgres',
    password: 'dev_password'
  });
  
  const dbResult = await pool.query('SELECT NOW()');
  console.log('✅ PostgreSQL:', dbResult.rows[0].now);
  
  // 2. Testar Redis
  const redis = new Redis({
    host: 'localhost',
    port: 6379
  });
  
  await redis.set('test', 'ok');
  const redisValue = await redis.get('test');
  console.log('✅ Redis:', redisValue);
  
  // 3. Testar MinIO
  const s3Client = new S3Client({
    endpoint: 'http://localhost:9000',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin'
    },
    region: 'us-east-1',
    forcePathStyle: true
  });
  
  // Criar bucket de teste
  // ... código de teste S3
  
  console.log('✅ Todos os testes passaram!');
  
  await pool.end();
  await redis.quit();
}

testIntegration().catch(console.error);
```

#### **1.3. Testes de Funcionalidade**

**Objetivo:** Validar funcionalidades específicas

**Testes a Realizar:**
1. ✅ Upload de imagem → MinIO
2. ✅ Cache de listagem → Redis
3. ✅ Busca de imagens → MinIO + Cache
4. ✅ Performance de queries → PostgreSQL
5. ✅ Validação de integridade → Dados consistentes

---

### **Fase 2: Testes Incrementais na VPS**

#### **2.1. Deploy Incremental (Fase por Fase)**

**Estratégia:** Implementar uma funcionalidade por vez

**Ordem Recomendada:**
```
1. Redis (Cache) → Mais simples, menor risco
   ↓
2. MinIO (Storage) → Médio risco, dados importantes
   ↓
3. Integração com Cloudflare → Baixo risco, apenas DNS
   ↓
4. Migração de dados → Alto risco, requer cuidado
```

#### **2.2. Feature Flags**

**Objetivo:** Permitir alternar entre implementação antiga e nova

**Implementação:**
```typescript
// src/lib/config/features.ts
export const FEATURES = {
  USE_REDIS_CACHE: process.env.USE_REDIS_CACHE === 'true',
  USE_MINIO_STORAGE: process.env.USE_MINIO_STORAGE === 'true',
  USE_CDN_URLS: process.env.USE_CDN_URLS === 'true',
} as const;

// src/lib/cache/cache-service.ts
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Feature flag: usar Redis ou cache em memória
  if (FEATURES.USE_REDIS_CACHE) {
    return getCachedFromRedis(key, fetcher, ttl);
  } else {
    return getCachedFromMemory(key, fetcher, ttl);
  }
}
```

**Vantagens:**
- ✅ Rollback instantâneo (apenas mudar variável)
- ✅ Testes A/B (metade usuários com feature, metade sem)
- ✅ Deploy seguro (ativar gradualmente)

---

## 🚀 **MIGRAÇÃO LOCAL → VPS**

### **Passo 1: Preparar VPS**

**Checklist:**
```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Criar diretórios
sudo mkdir -p /opt/net-imobiliaria/{data,logs,backups}
sudo chown -R $USER:$USER /opt/net-imobiliaria

# 4. Configurar firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### **Passo 2: Copiar Configurações**

**Estrutura de Arquivos:**
```
VPS:
/opt/net-imobiliaria/
├── docker-compose.yml      # Configuração produção
├── .env.production         # Variáveis de ambiente
├── nginx/
│   └── nginx.conf          # Configuração Nginx
└── scripts/
    ├── backup.sh           # Scripts de backup
    └── deploy.sh           # Scripts de deploy
```

**Comandos:**
```bash
# 1. Copiar arquivos para VPS
scp docker-compose.yml user@vps:/opt/net-imobiliaria/
scp .env.production user@vps:/opt/net-imobiliaria/
scp -r nginx/ user@vps:/opt/net-imobiliaria/

# 2. Conectar na VPS
ssh user@vps

# 3. Ajustar permissões
cd /opt/net-imobiliaria
chmod +x scripts/*.sh
```

### **Passo 3: Deploy Incremental**

#### **3.1. Deploy Redis (Primeiro)**

**Objetivo:** Implementar cache sem risco

**Passos:**
```bash
# 1. Adicionar Redis ao docker-compose.yml na VPS
# (mesma configuração do local, mas com senhas fortes)

# 2. Iniciar Redis
docker-compose up -d redis

# 3. Verificar saúde
docker-compose exec redis redis-cli ping

# 4. Ativar feature flag gradualmente
# .env.production: USE_REDIS_CACHE=true

# 5. Monitorar logs
docker-compose logs -f redis
```

**Validação:**
- ✅ Redis respondendo
- ✅ Cache funcionando
- ✅ Performance melhorada
- ✅ Sem erros nos logs

#### **3.2. Deploy MinIO (Segundo)**

**Objetivo:** Implementar storage sem quebrar sistema atual

**Passos:**
```bash
# 1. Adicionar MinIO ao docker-compose.yml na VPS

# 2. Criar bucket
docker-compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb local/net-imobiliaria-images

# 3. Configurar políticas de acesso
docker-compose exec minio mc anonymous set download local/net-imobiliaria-images

# 4. Ativar feature flag gradualmente
# .env.production: USE_MINIO_STORAGE=true

# 5. Migrar novos uploads para MinIO (dual write)
```

**Validação:**
- ✅ MinIO respondendo
- ✅ Upload funcionando
- ✅ Download funcionando
- ✅ URLs corretas

#### **3.3. Configurar Cloudflare (Terceiro)**

**Objetivo:** Configurar CDN sem impacto

**Passos:**
1. Criar conta Cloudflare (gratuita)
2. Adicionar domínio
3. Configurar DNS:
   ```
   Tipo: A
   Nome: cdn
   Conteúdo: IP_DA_VPS
   Proxy: ✅ Ativado
   ```
4. Configurar Cache Rules
5. Ativar feature flag: `USE_CDN_URLS=true`

**Validação:**
- ✅ DNS propagado
- ✅ SSL funcionando
- ✅ Cache funcionando
- ✅ Performance melhorada

---

## ✅ **CHECKLIST DE MIGRAÇÃO**

### **Antes de Migrar para VPS**

**Preparação Local:**
- [ ] ✅ Todos os testes locais passando
- [ ] ✅ Documentação atualizada
- [ ] ✅ Scripts de deploy criados
- [ ] ✅ Feature flags implementadas
- [ ] ✅ Rollback plan documentado

**Preparação VPS:**
- [ ] ✅ Docker instalado
- [ ] ✅ Docker Compose instalado
- [ ] ✅ Diretórios criados
- [ ] ✅ Firewall configurado
- [ ] ✅ Backup do banco atual feito

### **Durante Migração**

**Fase 1: Redis**
- [ ] ✅ Redis deployado na VPS
- [ ] ✅ Testes de conexão passando
- [ ] ✅ Feature flag ativada gradualmente
- [ ] ✅ Monitoramento ativo
- [ ] ✅ Performance validada

**Fase 2: MinIO**
- [ ] ✅ MinIO deployado na VPS
- [ ] ✅ Buckets criados
- [ ] ✅ Políticas configuradas
- [ ] ✅ Feature flag ativada gradualmente
- [ ] ✅ Upload/download testados

**Fase 3: Cloudflare**
- [ ] ✅ Conta Cloudflare criada
- [ ] ✅ DNS configurado
- [ ] ✅ SSL funcionando
- [ ] ✅ Cache rules configuradas
- [ ] ✅ Performance validada

**Fase 4: Migração de Dados**
- [ ] ✅ Script de migração testado localmente
- [ ] ✅ Backup completo feito
- [ ] ✅ Migração em lotes pequenos
- [ ] ✅ Validação após cada lote
- [ ] ✅ Rollback testado

### **Após Migração**

**Validação Final:**
- [ ] ✅ Todos os serviços funcionando
- [ ] ✅ Performance melhorada
- [ ] ✅ Sem erros nos logs
- [ ] ✅ Monitoramento ativo
- [ ] ✅ Backups automáticos funcionando

---

## 🔧 **TROUBLESHOOTING**

### **Problema 1: Serviços não iniciam na VPS**

**Sintomas:**
- Containers não sobem
- Erros de permissão
- Portas já em uso

**Soluções:**
```bash
# Verificar logs
docker-compose logs

# Verificar portas em uso
sudo netstat -tulpn | grep :6379
sudo netstat -tulpn | grep :9000

# Verificar permissões
ls -la /opt/net-imobiliaria/data

# Reiniciar serviços
docker-compose restart
```

### **Problema 2: Redis não conecta**

**Sintomas:**
- Erro de conexão
- Timeout

**Soluções:**
```bash
# Verificar se Redis está rodando
docker-compose ps redis

# Testar conexão manual
docker-compose exec redis redis-cli ping

# Verificar variáveis de ambiente
docker-compose exec redis env | grep REDIS

# Verificar rede Docker
docker network ls
docker network inspect net-imobiliaria-network
```

### **Problema 3: MinIO não acessível**

**Sintomas:**
- Erro 403
- Erro de autenticação

**Soluções:**
```bash
# Verificar credenciais
docker-compose exec minio env | grep MINIO

# Testar acesso via console
# http://VPS_IP:9001

# Verificar políticas de bucket
docker-compose exec minio mc anonymous get local/net-imobiliaria-images
```

### **Problema 4: Cloudflare não funciona**

**Sintomas:**
- DNS não resolve
- SSL não funciona
- Cache não funciona

**Soluções:**
1. Verificar propagação DNS: `dig cdn.netimobiliaria.com.br`
2. Verificar SSL: `curl -I https://cdn.netimobiliaria.com.br`
3. Verificar cache no Cloudflare Dashboard
4. Limpar cache se necessário

---

## 📊 **COMPARAÇÃO: LOCAL VS VPS**

| Aspecto | Local | VPS |
|---------|-------|-----|
| **Latência** | < 1ms | 10-50ms |
| **Rede** | Localhost | Internet |
| **Recursos** | Limitado ao PC | Dedicado |
| **Acesso** | Apenas local | Global |
| **Custo** | R$ 0 | R$ 50-100/mês |
| **Uso** | Desenvolvimento | Produção |

**Recomendação:** 
- ✅ **Local:** Desenvolvimento e testes
- ✅ **VPS:** Produção e staging

---

## 🎯 **CONCLUSÃO**

### **✅ ESTRATÉGIA RECOMENDADA**

1. **Desenvolvimento Local:**
   - Configurar tudo localmente primeiro
   - Testar completamente
   - Validar funcionalidades

2. **Migração Incremental:**
   - Deploy fase por fase na VPS
   - Feature flags para rollback
   - Validação após cada fase

3. **Produção:**
   - Migração completa após validação
   - Monitoramento ativo
   - Backups automáticos

### **Vantagens desta Abordagem:**

- ✅ **Segurança:** Testes sem risco em produção
- ✅ **Rapidez:** Desenvolvimento local rápido
- ✅ **Confiabilidade:** Validação completa antes de deploy
- ✅ **Rollback:** Fácil reverter mudanças
- ✅ **Consistência:** Docker garante ambientes idênticos

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Estratégia de testes e migração**  
**Status:** ✅ Pronto para Implementação  
**Próximo passo:** Configurar ambiente local e iniciar testes



