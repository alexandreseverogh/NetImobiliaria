# 🗄️ ARQUITETURA DE BANCO SEPARADO E GERENCIAMENTO DE MIGRAÇÕES
## Net Imobiliária - Estratégia para Evolução do Schema

**Data:** 2025-01-24  
**Status:** 📋 Arquitetura e Estratégia  
**Conformidade:** ✅ GUARDIAN RULES COMPLIANT

---

## 📋 **ÍNDICE**

1. [Arquitetura Atual](#arquitetura-atual)
2. [Vantagens do Banco Separado](#vantagens-do-banco-separado)
3. [Sistema de Migrações](#sistema-de-migrações)
4. [Versionamento de Schema](#versionamento-de-schema)
5. [Estratégia de Rollback](#estratégia-de-rollback)
6. [Boas Práticas](#boas-práticas)

---

## 🏗️ **ARQUITETURA ATUAL**

### **✅ Banco JÁ está em Container Separado!**

**Estrutura Atual (docker-compose.yml):**
```yaml
services:
  # Container SEPARADO para Banco de Dados
  postgres:
    image: postgres:15-alpine
    container_name: net-imobiliaria-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-net_imobiliaria}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Volume persistente
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

  # Container SEPARADO para Aplicação
  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy  # Aguarda banco estar pronto
    environment:
      DB_HOST: postgres  # Conecta via nome do serviço
      DB_PORT: 5432
```

**✅ Vantagens Já Implementadas:**
- ✅ Banco isolado em container próprio
- ✅ Volume persistente (dados não se perdem)
- ✅ Health check (aplicação aguarda banco)
- ✅ Rede isolada (segurança)
- ✅ Backup facilitado (volume Docker)

---

## 🎯 **VANTAGENS DO BANCO SEPARADO**

### **1. Independência de Ciclo de Vida**

**Benefícios:**
- ✅ **Reiniciar aplicação** sem afetar banco
- ✅ **Atualizar aplicação** sem tocar no banco
- ✅ **Manter banco rodando** durante deploy da app
- ✅ **Escalar aplicação** independentemente do banco

**Exemplo Prático:**
```bash
# Reiniciar apenas a aplicação (banco continua rodando)
docker-compose restart app

# Atualizar aplicação (banco não é afetado)
docker-compose up -d --build app

# Banco continua servindo requisições durante deploy
```

### **2. Gerenciamento de Migrações**

**Benefícios:**
- ✅ **Executar migrações** sem rebuild da aplicação
- ✅ **Versionar schema** independentemente do código
- ✅ **Rollback de migrações** sem afetar aplicação
- ✅ **Testar migrações** em ambiente isolado

**Exemplo Prático:**
```bash
# Executar migração sem rebuild
docker-compose exec postgres psql -U postgres -d net_imobiliaria -f /backups/migration_001.sql

# Verificar versão do schema
docker-compose exec postgres psql -U postgres -d net_imobiliaria -c "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"
```

### **3. Backup e Restore Independentes**

**Benefícios:**
- ✅ **Backup do banco** sem parar aplicação
- ✅ **Restore seletivo** (apenas banco)
- ✅ **Snapshots** do banco independentes
- ✅ **Migração entre ambientes** facilitada

**Exemplo Prático:**
```bash
# Backup sem afetar aplicação
docker-compose exec postgres pg_dump -U postgres net_imobiliaria > backup.sql

# Restore sem rebuild
docker-compose exec -T postgres psql -U postgres net_imobiliaria < backup.sql
```

### **4. Escalabilidade Futura**

**Benefícios:**
- ✅ **Mover banco** para servidor dedicado
- ✅ **Replicação** (master/slave)
- ✅ **Read replicas** para leitura
- ✅ **Connection pooling** otimizado

**Cenário Futuro:**
```
Atual:
App Container → Postgres Container (mesmo servidor)

Futuro:
App Container (Servidor 1) → Postgres Container (Servidor 2)
                           → Postgres Replica (Servidor 3)
```

---

## 🔄 **SISTEMA DE MIGRAÇÕES**

### **Estrutura de Diretórios Recomendada**

```
database/
├── schema.sql                    # Schema inicial/base
├── migrations/                   # Migrações versionadas
│   ├── 001_add_imovel_imagens_urls.sql
│   ├── 002_add_cache_table.sql
│   ├── 003_add_indexes_performance.sql
│   └── ...
├── seeds/                        # Dados iniciais/teste
│   ├── seed_initial_data.sql
│   └── seed_test_data.sql
├── backups/                      # Backups
│   └── backup_20250124.sql
└── init-scripts/                 # Scripts de inicialização
    └── init.sql
```

### **Tabela de Controle de Migrações**

**Criar tabela para rastrear migrações:**

```sql
-- database/migrations/000_create_migrations_table.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100),
    execution_time_ms INTEGER,
    checksum VARCHAR(64),  -- Hash do arquivo para validação
    rollback_script TEXT   -- Script de rollback (opcional)
);

CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);

COMMENT ON TABLE schema_migrations IS 'Registro de todas as migrações aplicadas ao banco';
```

### **Template de Migração**

**Estrutura Padrão:**

```sql
-- database/migrations/001_add_imovel_imagens_urls.sql
-- Versão: 001
-- Descrição: Adicionar colunas de URLs para Object Storage em imovel_imagens
-- Data: 2025-01-24
-- Autor: Sistema
-- Rollback: 001_add_imovel_imagens_urls_rollback.sql

BEGIN;

-- =====================================================
-- MIGRAÇÃO: Adicionar colunas de URLs
-- =====================================================

-- Adicionar colunas novas (não remover antigas - Guardian Rules)
ALTER TABLE imovel_imagens 
  ADD COLUMN IF NOT EXISTS url_s3 VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_cdn VARCHAR(500),
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'database';

-- Criar índice para busca por storage_type
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_storage_type 
ON imovel_imagens(storage_type) 
WHERE storage_type = 's3';

-- Registrar migração
INSERT INTO schema_migrations (version, description, checksum)
VALUES (
  '001',
  'Adicionar colunas de URLs para Object Storage',
  'sha256_hash_do_arquivo'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### **Script de Rollback**

**Estrutura Padrão:**

```sql
-- database/migrations/rollbacks/001_add_imovel_imagens_urls_rollback.sql
-- Versão: 001
-- Descrição: Rollback da migração 001
-- Data: 2025-01-24

BEGIN;

-- =====================================================
-- ROLLBACK: Remover colunas de URLs
-- =====================================================

-- Remover índices criados
DROP INDEX IF EXISTS idx_imovel_imagens_storage_type;

-- Remover colunas (apenas se não houver dados importantes)
-- ATENÇÃO: Verificar se colunas estão vazias antes de remover
DO $$
BEGIN
  -- Verificar se há dados em url_s3
  IF NOT EXISTS (SELECT 1 FROM imovel_imagens WHERE url_s3 IS NOT NULL LIMIT 1) THEN
    ALTER TABLE imovel_imagens DROP COLUMN IF EXISTS url_s3;
  END IF;
  
  -- Verificar se há dados em url_cdn
  IF NOT EXISTS (SELECT 1 FROM imovel_imagens WHERE url_cdn IS NOT NULL LIMIT 1) THEN
    ALTER TABLE imovel_imagens DROP COLUMN IF EXISTS url_cdn;
  END IF;
  
  -- Verificar se há dados em thumbnail_url
  IF NOT EXISTS (SELECT 1 FROM imovel_imagens WHERE thumbnail_url IS NOT NULL LIMIT 1) THEN
    ALTER TABLE imovel_imagens DROP COLUMN IF EXISTS thumbnail_url;
  END IF;
  
  -- Remover storage_type apenas se não houver dados
  IF NOT EXISTS (SELECT 1 FROM imovel_imagens WHERE storage_type = 's3' LIMIT 1) THEN
    ALTER TABLE imovel_imagens DROP COLUMN IF EXISTS storage_type;
  END IF;
END $$;

-- Remover registro de migração
DELETE FROM schema_migrations WHERE version = '001';

COMMIT;
```

---

## 📊 **VERSIONAMENTO DE SCHEMA**

### **Sistema de Numeração**

**Padrão Recomendado:**
```
001_<descricao_curta>.sql
002_<descricao_curta>.sql
003_<descricao_curta>.sql
...
```

**Exemplos:**
```
001_add_imovel_imagens_urls.sql
002_add_cache_table.sql
003_add_indexes_performance.sql
004_migrate_images_to_s3.sql
005_add_audit_columns.sql
```

### **Script de Aplicação de Migrações**

**Criar script automatizado:**

```bash
#!/bin/bash
# scripts/apply-migrations.sh

set -e

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-net_imobiliaria}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}

MIGRATIONS_DIR="database/migrations"
APPLIED_MIGRATIONS=$(docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT version FROM schema_migrations ORDER BY version;" | tr -d ' ')

echo "🔍 Migrações já aplicadas:"
echo "$APPLIED_MIGRATIONS"
echo ""

# Encontrar migrações pendentes
for migration_file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    version=$(basename $migration_file | cut -d'_' -f1)
    
    if echo "$APPLIED_MIGRATIONS" | grep -q "^$version$"; then
        echo "⏭️  Migração $version já aplicada, pulando..."
    else
        echo "🚀 Aplicando migração $version..."
        
        # Aplicar migração
        docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME < $migration_file
        
        if [ $? -eq 0 ]; then
            echo "✅ Migração $version aplicada com sucesso!"
        else
            echo "❌ Erro ao aplicar migração $version!"
            exit 1
        fi
    fi
done

echo "✅ Todas as migrações foram aplicadas!"
```

### **Script de Verificação**

**Verificar estado atual:**

```bash
#!/bin/bash
# scripts/check-migrations.sh

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-net_imobiliaria}
DB_USER=${DB_USER:-postgres}

echo "📊 Estado das Migrações:"
echo ""

docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME <<EOF
SELECT 
    version,
    description,
    applied_at,
    execution_time_ms,
    CASE 
        WHEN checksum IS NOT NULL THEN '✅ Validado'
        ELSE '⚠️ Sem checksum'
    END as status
FROM schema_migrations
ORDER BY version DESC;
EOF

echo ""
echo "📁 Migrações disponíveis:"
ls -1 database/migrations/*.sql | xargs -n1 basename
```

---

## 🔙 **ESTRATÉGIA DE ROLLBACK**

### **Níveis de Rollback**

#### **1. Rollback de Migração Específica**

**Quando usar:** Migração causou problema

**Processo:**
```bash
# 1. Identificar migração problemática
scripts/check-migrations.sh

# 2. Executar rollback
docker-compose exec -T postgres psql -U postgres -d net_imobiliaria \
  < database/migrations/rollbacks/001_add_imovel_imagens_urls_rollback.sql

# 3. Verificar estado
scripts/check-migrations.sh
```

#### **2. Rollback para Versão Específica**

**Quando usar:** Múltiplas migrações causaram problemas

**Processo:**
```bash
# 1. Fazer backup completo
docker-compose exec postgres pg_dump -U postgres net_imobiliaria > backup_before_rollback.sql

# 2. Aplicar rollbacks em ordem reversa
for rollback in $(ls database/migrations/rollbacks/*.sql | sort -r); do
    echo "Aplicando rollback: $rollback"
    docker-compose exec -T postgres psql -U postgres -d net_imobiliaria < $rollback
done

# 3. Verificar estado
scripts/check-migrations.sh
```

#### **3. Restore Completo**

**Quando usar:** Problema crítico, restaurar backup

**Processo:**
```bash
# 1. Parar aplicação (opcional, mas recomendado)
docker-compose stop app

# 2. Restaurar backup
docker-compose exec -T postgres psql -U postgres -d net_imobiliaria < backup.sql

# 3. Reiniciar aplicação
docker-compose start app

# 4. Verificar estado
scripts/check-migrations.sh
```

---

## ✅ **BOAS PRÁTICAS**

### **1. Migrações Idempotentes**

**✅ SEMPRE usar `IF NOT EXISTS` / `IF EXISTS`:**

```sql
-- ✅ BOM: Idempotente
ALTER TABLE imovel_imagens 
  ADD COLUMN IF NOT EXISTS url_s3 VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_imovel_imagens_storage_type 
ON imovel_imagens(storage_type);

-- ❌ RUIM: Não idempotente
ALTER TABLE imovel_imagens 
  ADD COLUMN url_s3 VARCHAR(500);  -- Falha se já existir
```

### **2. Migrações Incrementais (Guardian Rules)**

**✅ SEMPRE adicionar, NUNCA remover durante migração:**

```sql
-- ✅ BOM: Adicionar coluna nova
ALTER TABLE imovel_imagens 
  ADD COLUMN IF NOT EXISTS url_s3 VARCHAR(500);

-- ❌ RUIM: Remover coluna antiga (fazer em migração separada após validação)
-- ALTER TABLE imovel_imagens DROP COLUMN imagem;
```

### **3. Validação Antes de Aplicar**

**✅ SEMPRE validar antes de aplicar:**

```sql
-- Verificar se migração já foi aplicada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001') THEN
    RAISE EXCEPTION 'Migração 001 já foi aplicada!';
  END IF;
END $$;
```

### **4. Transações para Migrações Críticas**

**✅ Usar transações para operações críticas:**

```sql
BEGIN;

-- Operações críticas
ALTER TABLE imovel_imagens ADD COLUMN ...;
UPDATE imovel_imagens SET ...;

-- Registrar migração
INSERT INTO schema_migrations ...;

COMMIT;
```

**⚠️ ATENÇÃO:** Algumas operações não podem estar em transação:
- `CREATE INDEX CONCURRENTLY`
- `ALTER TABLE ... SET LOGGED`
- `VACUUM`

### **5. Backup Antes de Migrações**

**✅ SEMPRE fazer backup antes de migrações importantes:**

```bash
# Backup automático antes de migração
docker-compose exec postgres pg_dump -U postgres net_imobiliaria > \
  database/backups/backup_before_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📋 **CHECKLIST DE MIGRAÇÃO**

### **Antes de Criar Migração**

- [ ] ✅ Analisar impacto (Guardian Rules)
- [ ] ✅ Criar documento de análise de impacto
- [ ] ✅ Obter autorização se necessário
- [ ] ✅ Fazer backup do banco

### **Ao Criar Migração**

- [ ] ✅ Usar numeração sequencial
- [ ] ✅ Nome descritivo e claro
- [ ] ✅ Comentários explicativos
- [ ] ✅ Idempotente (IF NOT EXISTS)
- [ ] ✅ Incremental (adicionar, não remover)
- [ ] ✅ Criar script de rollback
- [ ] ✅ Testar localmente primeiro

### **Ao Aplicar Migração**

- [ ] ✅ Backup completo feito
- [ ] ✅ Testado em ambiente de desenvolvimento
- [ ] ✅ Verificado estado atual (check-migrations.sh)
- [ ] ✅ Aplicado em horário de baixo tráfego (se produção)
- [ ] ✅ Monitorado logs durante aplicação
- [ ] ✅ Validado após aplicação
- [ ] ✅ Documentado resultado

### **Após Migração**

- [ ] ✅ Verificado funcionamento da aplicação
- [ ] ✅ Testes de regressão executados
- [ ] ✅ Performance validada
- [ ] ✅ Documentação atualizada
- [ ] ✅ Backup de sucesso mantido

---

## 🎯 **CONCLUSÃO**

### **✅ Arquitetura Atual é Ideal!**

**Banco separado em container oferece:**
- ✅ Independência de ciclo de vida
- ✅ Gerenciamento de migrações facilitado
- ✅ Backup e restore independentes
- ✅ Escalabilidade futura

### **Próximos Passos Recomendados:**

1. ✅ **Criar sistema de migrações** (tabela + scripts)
2. ✅ **Documentar migrações existentes**
3. ✅ **Criar scripts de aplicação/rollback**
4. ✅ **Estabelecer processo de versionamento**

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Arquitetura de banco separado e gerenciamento de migrações**  
**Status:** ✅ Arquitetura Atual Validada  
**Próximo passo:** Implementar sistema de migrações versionadas




