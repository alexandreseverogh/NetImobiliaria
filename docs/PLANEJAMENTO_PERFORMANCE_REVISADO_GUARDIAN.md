# 🚀 PLANEJAMENTO DE PERFORMANCE - REVISÃO GUARDIAN RULES
## Net Imobiliária - Otimização Incremental para Escalabilidade

**Data:** 2025-01-24  
**Status:** 📋 Planejamento Revisado - Não Implementação  
**Prioridade:** 🚨 CRÍTICA  
**Conformidade:** ✅ GUARDIAN RULES COMPLIANT

---

## 📋 **ÍNDICE**

1. [Contexto e Diagnóstico](#contexto-e-diagnóstico)
2. [Princípios Guardian Aplicados](#princípios-guardian-aplicados)
3. [Análise de Impacto Detalhada](#análise-de-impacto-detalhada)
4. [Ações Necessárias Detalhadas](#ações-necessárias-detalhadas)
5. [Roadmap Incremental](#roadmap-incremental)
6. [Riscos e Mitigações](#riscos-e-mitigações)
7. [Checklist de Conformidade Guardian](#checklist-de-conformidade-guardian)

---

## 🎯 **CONTEXTO E DIAGNÓSTICO**

### **Problema Identificado**

Com o aumento do volume de imóveis (projeção: 100.000+ imóveis) e acessos diários (dezenas de milhares), a aplicação **ENTRARÁ EM COLAPSO** devido a:

1. **🔴 CRÍTICO:** Transferência de imagens via Base64 em Data URLs
   - Overhead de 33% no tamanho das imagens
   - Processamento CPU intensivo no servidor
   - Transferência de ~323GB/dia em cenário de alta carga

2. **🔴 CRÍTICO:** Ausência de CDN para imagens estáticas
   - Sem cache distribuído
   - Sem otimização por dispositivo/rede
   - Sem compressão adaptativa

3. **🟡 ALTO:** Queries não otimizadas
   - Falta de índices adequados para consultas públicas
   - Queries N+1 potenciais
   - Sem cache em múltiplas camadas

4. **🟡 ALTO:** Processamento síncrono de imagens
   - Encoding Base64 bloqueante
   - Sem lazy loading
   - Sem processamento assíncrono

### **Estado Atual do Sistema**

**Estrutura Atual:**
- Tabela `imovel_imagens` com campo `url` (VARCHAR)
- Código tenta usar `encode(imagem, 'base64')` (sugere coluna `imagem BYTEA` não documentada)
- APIs retornam imagens como Data URLs Base64
- Sem sistema de cache implementado
- Sem CDN configurado

**Funcionalidades Afetadas:**
- Listagem pública de imóveis (`/api/public/imoveis`)
- Visualização de imóvel individual
- Galeria de imagens
- Upload de imagens (admin)

---

## 🛡️ **PRINCÍPIOS GUARDIAN APLICADOS**

### **✅ REGRA PRIMORDIAL: "INCREMENTAL SIM, DESTRUTIVO NUNCA!"**

**Todas as ações serão implementadas de forma INCREMENTAL:**

1. **✅ Preservação de Funcionalidades:** Nenhuma funcionalidade existente será quebrada
2. **✅ Compatibilidade Retroativa:** Sistema funcionará durante toda a transição
3. **✅ Rollback Garantido:** Cada fase pode ser revertida independentemente
4. **✅ Migração Gradual:** Dados antigos e novos coexistirão durante transição

### **✅ PROTOCOLO DE IMPACTO OBRIGATÓRIO**

**Antes de cada implementação:**
- ✅ Análise de impacto detalhada
- ✅ Inventário de dependências atualizado
- ✅ Plano de rollback testado
- ✅ Autorização expressa necessária

### **✅ REGRAS DE BANCO DE DADOS**

**NUNCA faremos:**
- ❌ DROP de tabelas sem backup completo
- ❌ Remoção de colunas sem migração adequada
- ❌ Alteração de tipos sem conversão de dados
- ❌ Operações destrutivas sem transação

**SEMPRE faremos:**
- ✅ Adicionar novas colunas (não remover antigas)
- ✅ Criar novas tabelas/índices (não remover existentes)
- ✅ Migração incremental de dados
- ✅ Manter compatibilidade durante transição

---

## 🔍 **ANÁLISE DE IMPACTO DETALHADA**

### **1. IMPACTO EM FUNCIONALIDADES EXISTENTES**

#### **1.1. APIs Públicas**

**Funcionalidades Afetadas:**
- `GET /api/public/imoveis` - Listagem de imóveis
- `GET /api/public/imoveis/[id]` - Detalhes do imóvel
- `GET /api/public/imoveis/[id]/imagens` - Galeria de imagens

**Risco:** 🟡 MÉDIO  
**Mitigação:** 
- Implementar fallback para formato antigo durante transição
- Manter compatibilidade de resposta durante migração
- Feature flags para alternar entre formatos

#### **1.2. APIs Administrativas**

**Funcionalidades Afetadas:**
- `GET /api/admin/imoveis/[id]/imagens` - Listagem de imagens
- `POST /api/admin/imoveis/[id]/imagens` - Upload de imagens
- `PUT /api/admin/imoveis/[id]/imagens/[imageId]` - Atualização de imagem

**Risco:** 🟡 MÉDIO  
**Mitigação:**
- Novo uploads já usam Object Storage
- Imagens antigas continuam funcionando via fallback
- Migração em background sem impacto no uso

#### **1.3. Frontend**

**Componentes Afetados:**
- `PropertyCard` - Cards de imóveis
- `ImageGallery` - Galeria de imagens
- `MediaStep` - Upload de imagens (admin)

**Risco:** 🟢 BAIXO  
**Mitigação:**
- Componentes adaptados para suportar URLs e Data URLs
- Lazy loading implementado gradualmente
- Sem breaking changes na interface

### **2. IMPACTO EM BANCO DE DADOS**

#### **2.1. Estrutura de Tabelas**

**Ações Necessárias:**
- ✅ Adicionar colunas novas (não remover antigas)
- ✅ Criar índices novos (não remover existentes)
- ✅ Criar tabelas auxiliares (não modificar existentes)

**Risco:** 🟢 BAIXO  
**Mitigação:**
- Todas as alterações são aditivas
- Rollback simples (remover colunas/tabelas novas)
- Sem impacto em dados existentes

#### **2.2. Migração de Dados**

**Ações Necessárias:**
- Migração incremental de imagens BYTEA → Object Storage
- Processamento em background (fila de jobs)
- Validação de integridade após migração

**Risco:** 🟡 MÉDIO  
**Mitigação:**
- Migração em lotes pequenos
- Validação após cada lote
- Rollback automático em caso de erro
- Manter dados originais até confirmação

### **3. IMPACTO EM INFRAESTRUTURA**

#### **3.1. Novos Serviços**

**Serviços Necessários:**
- Redis (cache)
- Object Storage (S3/MinIO)
- CDN (Cloudflare/AWS CloudFront)

**Risco:** 🟢 BAIXO  
**Mitigação:**
- Serviços opcionais durante transição
- Fallback para sistema atual se indisponível
- Configuração gradual

#### **3.2. Custos**

**Investimento Estimado:**
- Redis: R$ 50-100/mês
- Object Storage: R$ 30-80/mês
- CDN: R$ 50-150/mês
- **Total:** R$ 130-330/mês

**ROI Esperado:**
- Redução de 60% em custos de servidor
- Economia de R$ 300-600/mês
- **ROI Positivo em 1-2 meses**

---

## 📋 **AÇÕES NECESSÁRIAS DETALHADAS**

### **FASE 1: PREPARAÇÃO (SEM IMPACTO EM PRODUÇÃO)**

#### **Ação 1.1: Criar Índices Otimizados**

**Objetivo:** Melhorar performance de queries sem alterar estrutura

**Ações:**
```sql
-- Índice para busca de imagens principais
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imovel_imagens_principal 
ON imovel_imagens(imovel_id, principal) 
WHERE principal = true;

-- Índice composto para filtros públicos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_public_filters 
ON imoveis(ativo, estado_fk, cidade_fk, finalidade_fk, preco, created_at DESC)
WHERE ativo = true;

-- Índice para ordenação por destaque
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveis_destaque 
ON imoveis(destaque, created_at DESC)
WHERE ativo = true AND destaque = true;
```

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (índices são aditivos)  
**Rollback:** `DROP INDEX CONCURRENTLY`  
**Tempo:** 1-2 horas  
**Autorização:** ✅ Não necessária (sem impacto)

#### **Ação 1.2: Configurar Redis (Cache)**

**Objetivo:** Implementar sistema de cache sem alterar código existente

**Ações:**
1. Instalar/configurar Redis
2. Criar serviço de cache (`src/lib/cache/redis.ts`)
3. Implementar wrappers de cache (não alterar código existente)
4. Testar em ambiente de desenvolvimento

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (cache é opcional)  
**Rollback:** Desabilitar cache via feature flag  
**Tempo:** 4-6 horas  
**Autorização:** ✅ Não necessária (não afeta produção)

#### **Ação 1.3: Configurar Object Storage**

**Objetivo:** Preparar infraestrutura para armazenamento de imagens

**Ações:**
1. Configurar S3/MinIO
2. Criar buckets necessários
3. Configurar políticas de acesso
4. Criar serviço de upload (`src/lib/storage/s3.ts`)
5. Testar upload/download em ambiente de desenvolvimento

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (não usado ainda)  
**Rollback:** Desabilitar via feature flag  
**Tempo:** 4-6 horas  
**Autorização:** ✅ Não necessária (não afeta produção)

---

### **FASE 2: MIGRAÇÃO INCREMENTAL DE ESTRUTURA**

#### **Ação 2.1: Adicionar Colunas de Suporte**

**Objetivo:** Adicionar campos para URLs de Object Storage sem remover campos antigos

**Ações:**
```sql
-- Adicionar colunas novas (não remover antigas)
ALTER TABLE imovel_imagens 
  ADD COLUMN IF NOT EXISTS url_s3 VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_cdn VARCHAR(500),
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS tamanho_original INTEGER,
  ADD COLUMN IF NOT EXISTS formato VARCHAR(10),
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'database'; -- 'database' ou 's3'

-- Criar índice para busca por storage_type
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_storage_type 
ON imovel_imagens(storage_type) 
WHERE storage_type = 's3';
```

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (colunas são NULL por padrão)  
**Rollback:** `ALTER TABLE imovel_imagens DROP COLUMN ...`  
**Tempo:** 30 minutos  
**Autorização:** ✅ Necessária (alteração de schema em produção)

#### **Ação 2.2: Criar Tabela de Migração**

**Objetivo:** Rastrear progresso de migração de imagens

**Ações:**
```sql
-- Tabela para rastrear migração
CREATE TABLE IF NOT EXISTS imagem_migration_log (
    id SERIAL PRIMARY KEY,
    imagem_id INTEGER REFERENCES imovel_imagens(id),
    status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    storage_type VARCHAR(20) NOT NULL, -- 'database', 's3'
    s3_key VARCHAR(500),
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_imagem_migration_status 
ON imagem_migration_log(status) 
WHERE status IN ('pending', 'processing');
```

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (tabela nova)  
**Rollback:** `DROP TABLE imagem_migration_log`  
**Tempo:** 15 minutos  
**Autorização:** ✅ Não necessária (tabela auxiliar)

---

### **FASE 3: IMPLEMENTAÇÃO DE CÓDIGO COM FALLBACK**

#### **Ação 3.1: Criar Serviço de Imagens com Fallback**

**Objetivo:** Implementar lógica que suporta ambos os formatos (BYTEA e URL)

**Ações:**
1. Criar `src/lib/images/image-service.ts`:
   - Método `getImageUrl()` que verifica `storage_type`
   - Se `storage_type = 's3'` → retorna URL do CDN
   - Se `storage_type = 'database'` → retorna Data URL Base64 (compatibilidade)

2. Atualizar `findImovelImagens()`:
   - Verificar `storage_type` antes de fazer `encode()`
   - Retornar URL se disponível, senão Data URL

3. Atualizar `fetchImagensPrincipais()`:
   - Mesma lógica de fallback

**Risco:** 🟡 MÉDIO  
**Impacto:** Baixo (mantém compatibilidade)  
**Rollback:** Reverter commits  
**Tempo:** 6-8 horas  
**Autorização:** ✅ Necessária (alteração de código em produção)

#### **Ação 3.2: Implementar Upload com Dual Write**

**Objetivo:** Novos uploads salvam em ambos os lugares durante transição

**Ações:**
1. Atualizar endpoint de upload:
   - Upload para Object Storage
   - Salvar URL no banco (`url_s3`, `url_cdn`)
   - Manter `imagem BYTEA` durante transição (dual write)
   - Marcar `storage_type = 's3'`

2. Processar imagens em background:
   - Gerar thumbnails
   - Converter para WebP/AVIF
   - Upload versões otimizadas

**Risco:** 🟡 MÉDIO  
**Impacto:** Baixo (novos uploads apenas)  
**Rollback:** Desabilitar dual write via feature flag  
**Tempo:** 8-10 horas  
**Autorização:** ✅ Necessária (alteração de código em produção)

---

### **FASE 4: MIGRAÇÃO DE DADOS EXISTENTES**

#### **Ação 4.1: Criar Sistema de Fila de Migração**

**Objetivo:** Migrar imagens existentes em background sem impacto

**Ações:**
1. Criar fila de jobs (Bull/BullMQ):
   - Job: `migrate-image-to-s3`
   - Processar em lotes de 100 imagens
   - Rate limit: 10 imagens/minuto

2. Script de migração:
   - Buscar imagens com `storage_type = 'database'`
   - Upload para S3
   - Atualizar `url_s3`, `url_cdn`, `storage_type`
   - Registrar em `imagem_migration_log`
   - Validar integridade após cada lote

**Risco:** 🟡 MÉDIO  
**Impacto:** Baixo (processamento em background)  
**Rollback:** Reverter `storage_type` para 'database'  
**Tempo:** 12-16 horas (desenvolvimento) + dias/semanas (execução)  
**Autorização:** ✅ Necessária (migração de dados)

#### **Ação 4.2: Validação e Monitoramento**

**Objetivo:** Garantir integridade durante migração

**Ações:**
1. Script de validação:
   - Comparar tamanho original vs S3
   - Verificar acesso via CDN
   - Validar URLs retornadas

2. Dashboard de monitoramento:
   - Progresso da migração (%)
   - Taxa de erro
   - Tempo estimado de conclusão

**Risco:** 🟢 BAIXO  
**Impacto:** Nenhum (apenas monitoramento)  
**Rollback:** N/A  
**Tempo:** 4-6 horas  
**Autorização:** ✅ Não necessária (apenas monitoramento)

---

### **FASE 5: OTIMIZAÇÃO DE QUERIES E CACHE**

#### **Ação 5.1: Implementar Cache em Múltiplas Camadas**

**Objetivo:** Reduzir carga no banco de dados

**Ações:**
1. Cache de listagens públicas:
   - TTL: 5 minutos
   - Invalidação ao criar/atualizar imóvel

2. Cache de metadados de imagens:
   - TTL: 1 hora
   - Invalidação ao atualizar imagem

3. Cache de contadores:
   - TTL: 15 minutos
   - Invalidação ao alterar filtros

**Risco:** 🟢 BAIXO  
**Impacto:** Melhoria de performance  
**Rollback:** Desabilitar cache via feature flag  
**Tempo:** 8-10 horas  
**Autorização:** ✅ Necessária (alteração de código em produção)

#### **Ação 5.2: Otimizar Queries Públicas**

**Objetivo:** Reduzir tempo de resposta

**Ações:**
1. Usar view materializada para listagens:
   - Atualização incremental via triggers
   - Refresh automático a cada 5 minutos

2. Otimizar queries de imagens:
   - Buscar apenas URLs (não BYTEA)
   - Usar índices criados na Fase 1

**Risco:** 🟡 MÉDIO  
**Impacto:** Melhoria de performance  
**Rollback:** Reverter para queries antigas  
**Tempo:** 6-8 horas  
**Autorização:** ✅ Necessária (alteração de código em produção)

---

### **FASE 6: CONFIGURAÇÃO DE CDN**

#### **Ação 6.1: Configurar CDN (Cloudflare/AWS)**

**Objetivo:** Distribuir imagens globalmente

**Ações:**
1. Configurar CDN:
   - Apontar para Object Storage
   - Configurar cache headers
   - Configurar compressão

2. Atualizar código:
   - Usar URLs do CDN em vez de S3 direto
   - Configurar headers de cache

**Risco:** 🟢 BAIXO  
**Impacto:** Melhoria de performance  
**Rollback:** Usar URLs do S3 diretamente  
**Tempo:** 4-6 horas  
**Autorização:** ✅ Necessária (alteração de infraestrutura)

---

### **FASE 7: LIMPEZA (APÓS MIGRAÇÃO COMPLETA)**

#### **Ação 7.1: Remover Código Legacy**

**Objetivo:** Limpar código não utilizado

**Ações:**
1. Remover lógica de fallback para BYTEA
2. Remover código de dual write
3. Remover coluna `imagem BYTEA` (após validação completa)

**⚠️ ATENÇÃO:** Esta fase só deve ser executada após:
- ✅ 100% das imagens migradas
- ✅ Validação completa de integridade
- ✅ Período de observação (30 dias)
- ✅ Backup completo do banco

**Risco:** 🔴 ALTO (se feito prematuramente)  
**Impacto:** Nenhum (se feito corretamente)  
**Rollback:** Restaurar backup  
**Tempo:** 4-6 horas  
**Autorização:** ✅ OBRIGATÓRIA (operação destrutiva)

---

## 📅 **ROADMAP INCREMENTAL**

### **Semana 1-2: Preparação (Sem Impacto)**

```
✅ Fase 1.1: Criar índices otimizados
✅ Fase 1.2: Configurar Redis
✅ Fase 1.3: Configurar Object Storage
```

**Resultado:** Infraestrutura pronta, sem impacto em produção

### **Semana 3-4: Estrutura e Código com Fallback**

```
✅ Fase 2.1: Adicionar colunas de suporte
✅ Fase 2.2: Criar tabela de migração
✅ Fase 3.1: Criar serviço com fallback
✅ Fase 3.2: Implementar upload dual write
```

**Resultado:** Sistema suporta ambos os formatos, novos uploads vão para S3

### **Semana 5-8: Migração de Dados**

```
✅ Fase 4.1: Criar sistema de fila
✅ Fase 4.2: Validação e monitoramento
→ Executar migração em background (dias/semanas)
```

**Resultado:** Imagens sendo migradas gradualmente

### **Semana 9-10: Otimização**

```
✅ Fase 5.1: Implementar cache
✅ Fase 5.2: Otimizar queries
✅ Fase 6.1: Configurar CDN
```

**Resultado:** Performance melhorada significativamente

### **Semana 11+: Limpeza (Após Validação)**

```
✅ Fase 7.1: Remover código legacy
```

**Resultado:** Sistema limpo e otimizado

---

## ⚠️ **RISCOS E MITIGAÇÕES**

### **Risco 1: Migração de Dados Falhar**

**Probabilidade:** 🟡 MÉDIA  
**Impacto:** 🔴 ALTO  
**Mitigação:**
- Migração em lotes pequenos (100 imagens)
- Validação após cada lote
- Rollback automático em caso de erro
- Manter dados originais até confirmação
- Backup completo antes de iniciar

### **Risco 2: Performance Degradada Durante Transição**

**Probabilidade:** 🟡 MÉDIA  
**Impacto:** 🟡 MÉDIO  
**Mitigação:**
- Dual write apenas para novos uploads
- Migração em background (não bloqueia)
- Cache implementado antes da migração
- Monitoramento em tempo real

### **Risco 3: Incompatibilidade com Código Existente**

**Probabilidade:** 🟢 BAIXA  
**Impacto:** 🟡 MÉDIO  
**Mitigação:**
- Fallback implementado em todas as camadas
- Testes extensivos antes de deploy
- Feature flags para alternar formatos
- Período de observação

### **Risco 4: CDN/Object Storage Indisponível**

**Probabilidade:** 🟢 BAIXA  
**Impacto:** 🟡 MÉDIO  
**Mitigação:**
- Fallback para formato antigo
- Health checks automáticos
- Alertas em caso de falha
- Múltiplos provedores (redundância)

---

## ✅ **CHECKLIST DE CONFORMIDADE GUARDIAN**

### **Antes de Qualquer Implementação:**

- [ ] ✅ Análise de impacto criada e aprovada
- [ ] ✅ Inventário de dependências atualizado
- [ ] ✅ Plano de rollback testado
- [ ] ✅ Autorização expressa obtida
- [ ] ✅ Backup completo realizado
- [ ] ✅ Testes em ambiente de desenvolvimento

### **Durante Implementação:**

- [ ] ✅ Mudanças incrementais (não destrutivas)
- [ ] ✅ Compatibilidade retroativa mantida
- [ ] ✅ Fallback implementado
- [ ] ✅ Monitoramento ativo
- [ ] ✅ Logs de auditoria

### **Após Implementação:**

- [ ] ✅ Testes de regressão executados
- [ ] ✅ Validação de integridade
- [ ] ✅ Monitoramento de performance
- [ ] ✅ Documentação atualizada
- [ ] ✅ Período de observação (30 dias)

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Performance**

- ✅ Tempo de resposta: < 200ms (95% das requisições)
- ✅ Transferência diária: < 10GB (redução de 97%)
- ✅ Cache hit rate: > 80%
- ✅ Queries ao banco: Redução de 70%

### **Escalabilidade**

- ✅ Suporte a 10.000+ usuários simultâneos
- ✅ Suporte a 100.000+ imóveis
- ✅ Upload de 500+ imagens simultâneas

### **Confiabilidade**

- ✅ Uptime: 99.9%
- ✅ Taxa de erro: < 0.1%
- ✅ Migração: 100% de sucesso

---

## 🎯 **CONCLUSÃO**

Este planejamento foi revisado à luz dos **GUARDIAN RULES** e garante:

1. ✅ **Implementação Incremental:** Nenhuma funcionalidade será quebrada
2. ✅ **Compatibilidade Retroativa:** Sistema funciona durante toda transição
3. ✅ **Rollback Garantido:** Cada fase pode ser revertida
4. ✅ **Análise de Impacto:** Todos os riscos identificados e mitigados
5. ✅ **Autorização Necessária:** Operações críticas requerem aprovação

**Próximo Passo:** Aprovação deste planejamento e início da Fase 1 (Preparação).

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Revisão completa do planejamento de performance**  
**Status:** ✅ Conforme Guardian Rules  
**Próximo passo:** Aprovação e implementação incremental

