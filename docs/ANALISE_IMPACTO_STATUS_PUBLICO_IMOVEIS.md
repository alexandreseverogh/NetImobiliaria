# 🔍 ANÁLISE DE IMPACTO: STATUS_FK = 99 PARA CADASTRO PÚBLICO
## Alteração no Fluxo de Criação de Imóveis via Landing Page

**Data:** 2025-01-24  
**Status:** 📊 Análise de Impacto - Aguardando Aprovação  
**Prioridade:** 🟡 MÉDIA  
**Seguindo:** GUARDIAN_RULES.md

---

## 📋 SUMÁRIO EXECUTIVO

### **OBJETIVO**

Alterar o comportamento de criação de imóveis quando o acesso é via Landing Page pública, para que o campo `status_fk` seja gravado com o valor **99** ao invés do valor padrão **1 (Ativo)**.

### **ESCOPO DA ALTERAÇÃO**

- **Arquivo Principal:** `src/app/api/admin/imoveis/route.ts` (função POST)
- **Arquivo Secundário:** `src/lib/database/imoveis.ts` (função createImovel)
- **Impacto:** Apenas criação de novos imóveis via acesso público
- **Não Impacta:** Criação via admin, edição de imóveis existentes, listagens, filtros

---

## 🔍 ANÁLISE HOLÍSTICA DE IMPACTO

### 1. **SITUAÇÃO ATUAL**

#### 1.1. Fluxo de Criação Atual

```typescript
// src/app/api/admin/imoveis/route.ts:300-301, 384
// Sempre força status_fk = 1 (Ativo)
body.status_fk = 1
dadosImovel.status_fk = 1 // Sempre status_id = 1
```

#### 1.2. Detecção de Acesso Público (Já Implementada)

```typescript
// src/app/api/admin/imoveis/route.ts:234-243
const referer = request.headers.get('referer') || ''
const origin = request.headers.get('origin') || ''
const isPublicAccess = 
  body.origemPublica === true || 
  referer.includes('/landpaging') || 
  origin.includes('/landpaging') ||
  referer.includes('noSidebar=true')
const origemCadastro = isPublicAccess ? 'Publico' : 'Admin'
```

#### 1.3. Status Existentes no Banco

```
Status ID | Nome
----------|------------------
1         | Ativo
7         | Disponível
8         | Vendido
9         | Alugado
11        | Em Negociação
12        | Indisponível
37        | Reservado para Venda
38        | Reserva para aprovação de cadastro
39        | Reservado para aluguel
47        | Validação de Cadastro
```

**⚠️ OBSERVAÇÃO CRÍTICA:** O status **99 não existe** no banco de dados. Será necessário criar este status antes da implementação.

---

### 2. **ANÁLISE DE DEPENDÊNCIAS**

#### 2.1. Dependências Diretas Identificadas

**A. Tabela `status_imovel`**
- **Impacto:** Necessário criar registro com `id = 99`
- **Risco:** Baixo (apenas inserção de novo registro)
- **Validação:** Verificar se ID 99 já existe ou está em uso

**B. Função `createImovel` (`src/lib/database/imoveis.ts`)**
- **Impacto:** Recebe `status_fk` do objeto `imovel` e insere diretamente
- **Risco:** Baixo (apenas passa o valor recebido)
- **Validação:** Verificar se há validação de FK antes do INSERT

**C. API `POST /api/admin/imoveis` (`src/app/api/admin/imoveis/route.ts`)**
- **Impacto:** Atualmente força `status_fk = 1` sempre
- **Risco:** Médio (mudança de lógica condicional)
- **Validação:** Garantir que detecção de acesso público funcione corretamente

#### 2.2. Dependências Indiretas

**A. Listagens e Filtros**
- **Impacto:** Nenhum (apenas criação)
- **Risco:** Nenhum
- **Validação:** Confirmar que filtros por status continuam funcionando

**B. Dashboards e Relatórios**
- **Impacto:** Possível (se houver agregações por status)
- **Risco:** Baixo (novo status será contabilizado)
- **Validação:** Verificar queries de dashboards que filtram por status

**C. Validações de Status**
- **Impacto:** Possível (se houver validações hardcoded)
- **Risco:** Baixo
- **Validação:** Buscar por referências ao status 1 ou validações de status

---

### 3. **ANÁLISE DE RISCOS**

#### 3.1. Riscos Identificados

| Risco | Probabilidade | Impacto | Severidade | Mitigação |
|-------|--------------|---------|------------|-----------|
| **Status 99 não existe** | Alta | Alto | 🔴 CRÍTICO | Criar status antes da implementação |
| **FK inválida no INSERT** | Média | Alto | 🔴 CRÍTICO | Validar existência do status antes de inserir |
| **Quebra de lógica existente** | Baixa | Médio | 🟡 MÉDIO | Manter lógica atual para admin, apenas adicionar condicional |
| **Dashboards não contabilizam** | Baixa | Baixo | 🟢 BAIXO | Verificar queries de dashboards |
| **Filtros não funcionam** | Baixa | Baixo | 🟢 BAIXO | Testar filtros após implementação |

#### 3.2. Cenários de Teste Obrigatórios

1. ✅ Criar imóvel via admin → `status_fk` deve ser **1**
2. ✅ Criar imóvel via landing (proprietário logado) → `status_fk` deve ser **99**
3. ✅ Criar imóvel via landing (sem sidebar) → `status_fk` deve ser **99**
4. ✅ Editar imóvel existente → `status_fk` não deve ser alterado
5. ✅ Listar imóveis → filtros por status devem funcionar
6. ✅ Dashboards → devem contabilizar status 99 corretamente

---

### 4. **PLANO DE IMPLEMENTAÇÃO INCREMENTAL**

### Fase 1: Preparação (Sem Impacto)

#### 1.1. Criar Status 99 no Banco de Dados

```sql
-- Script: database/migrations/add_status_99_cadastro_publico.sql
INSERT INTO status_imovel (id, nome, cor, descricao, ativo, consulta_imovel_internauta, created_at, updated_at)
VALUES (
  99,
  'Aguardando Aprovação',
  '#F59E0B',
  'Imóvel cadastrado via acesso público, aguardando aprovação interna',
  true,
  false, -- Não deve aparecer em consultas públicas
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  cor = EXCLUDED.cor,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo,
  consulta_imovel_internauta = EXCLUDED.consulta_imovel_internauta,
  updated_at = EXCLUDED.updated_at;

-- Verificar criação
SELECT id, nome, ativo FROM status_imovel WHERE id = 99;
```

**Validação:**
- [ ] Status criado com sucesso
- [ ] ID 99 não conflita com outros registros
- [ ] Status está ativo (`ativo = true`)

#### 1.2. Verificar Integridade Referencial

```sql
-- Verificar se há foreign key constraint
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'imoveis'
  AND kcu.column_name = 'status_fk';
```

**Validação:**
- [ ] FK existe e referencia `status_imovel.id`
- [ ] FK permite inserção de status 99

---

### Fase 2: Implementação (Alteração Incremental)

#### 2.1. Alterar API `POST /api/admin/imoveis`

**Arquivo:** `src/app/api/admin/imoveis/route.ts`

**Alteração:**

```typescript
// ANTES (linha 300-301):
// Sempre usar status_fk = 1 (Ativo)
body.status_fk = 1

// DEPOIS:
// Definir status baseado na origem do cadastro
if (isPublicAccess) {
  body.status_fk = 99 // Status para cadastro público
} else {
  body.status_fk = 1 // Status padrão para admin
}
```

```typescript
// ANTES (linha 384):
dadosImovel.status_fk = 1 // Sempre status_id = 1

// DEPOIS:
// Manter lógica condicional já aplicada acima
// Remover esta linha duplicada ou ajustar para:
if (isPublicAccess) {
  dadosImovel.status_fk = 99
} else {
  dadosImovel.status_fk = 1
}
```

**Validação:**
- [ ] Código compila sem erros
- [ ] Lógica condicional funciona corretamente
- [ ] Logs mostram status correto sendo aplicado

#### 2.2. Adicionar Validação de Status na Função `createImovel`

**Arquivo:** `src/lib/database/imoveis.ts`

**Alteração:**

```typescript
// Adicionar validação antes do INSERT (após linha 396)
// Validar se status_fk existe
if (imovel.status_fk) {
  const statusExists = await pool.query(
    'SELECT id FROM status_imovel WHERE id = $1 AND ativo = true',
    [imovel.status_fk]
  )
  
  if (statusExists.rows.length === 0) {
    throw new Error(`Status ${imovel.status_fk} não encontrado ou inativo`)
  }
}
```

**Validação:**
- [ ] Validação funciona corretamente
- [ ] Erro é lançado se status não existir
- [ ] Não impacta performance (query rápida)

---

### Fase 3: Testes e Validação

#### 3.1. Testes Funcionais

**Teste 1: Criação via Admin**
```bash
# Cenário: Criar imóvel via /admin/imoveis/novo
# Esperado: status_fk = 1
# Validação: Verificar no banco após criação
```

**Teste 2: Criação via Landing (Proprietário Logado)**
```bash
# Cenário: Proprietário logado acessa /admin/imoveis/novo?noSidebar=true
# Esperado: status_fk = 99
# Validação: Verificar no banco após criação
```

**Teste 3: Criação via Landing (Sem Sidebar)**
```bash
# Cenário: Acesso via referer /landpaging
# Esperado: status_fk = 99
# Validação: Verificar no banco após criação
```

**Teste 4: Edição de Imóvel**
```bash
# Cenário: Editar imóvel existente (qualquer origem)
# Esperado: status_fk não é alterado automaticamente
# Validação: Verificar que status permanece o mesmo
```

#### 3.2. Testes de Integridade

**Teste 5: Validação de FK**
```bash
# Cenário: Tentar criar imóvel com status_fk inexistente
# Esperado: Erro de validação
# Validação: Verificar mensagem de erro
```

**Teste 6: Listagens e Filtros**
```bash
# Cenário: Listar imóveis e filtrar por status
# Esperado: Status 99 aparece nos filtros
# Validação: Verificar que filtros funcionam
```

**Teste 7: Dashboards**
```bash
# Cenário: Acessar dashboards que agrupam por status
# Esperado: Status 99 é contabilizado corretamente
# Validação: Verificar contagens e gráficos
```

---

### Fase 4: Rollback (Se Necessário)

#### 4.1. Script de Rollback

```sql
-- Rollback: Reverter status 99 para 1 em imóveis criados via público
UPDATE imoveis 
SET status_fk = 1 
WHERE status_fk = 99 
  AND origem_cadastro = 'Publico'
  AND created_at >= '2025-01-24'; -- Data da implementação

-- Opcional: Remover status 99 (se necessário)
-- DELETE FROM status_imovel WHERE id = 99;
```

#### 4.2. Reversão de Código

```typescript
// Reverter para lógica anterior
body.status_fk = 1
dadosImovel.status_fk = 1
```

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Pré-Implementação
- [ ] **Análise de Impacto:** Este documento criado e revisado
- [ ] **Inventário de Dependências:** Consultado e atualizado
- [ ] **Aprovação:** Autorização expressa do responsável
- [ ] **Backup:** Backup do banco de dados realizado
- [ ] **Ambiente de Teste:** Ambiente de teste configurado

### Implementação
- [ ] **Fase 1.1:** Status 99 criado no banco de dados
- [ ] **Fase 1.2:** Integridade referencial verificada
- [ ] **Fase 2.1:** API alterada com lógica condicional
- [ ] **Fase 2.2:** Validação de status adicionada
- [ ] **Fase 3.1:** Todos os testes funcionais executados
- [ ] **Fase 3.2:** Todos os testes de integridade executados

### Pós-Implementação
- [ ] **Validação:** Imóveis criados via público têm status_fk = 99
- [ ] **Validação:** Imóveis criados via admin têm status_fk = 1
- [ ] **Validação:** Edição de imóveis não altera status automaticamente
- [ ] **Validação:** Listagens e filtros funcionam corretamente
- [ ] **Validação:** Dashboards contabilizam status 99
- [ ] **Documentação:** Código documentado com comentários
- [ ] **Logs:** Logs de auditoria registram origem corretamente

---

## 🚨 BLOQUEIOS E VALIDAÇÕES

### Bloqueios Automáticos Identificados

**🔴 ALTO RISCO:**
- Modificação de lógica de negócio ativa (status de imóveis)
- Alteração em API ativa (`POST /api/admin/imoveis`)

**AÇÃO OBRIGATÓRIA:**
1. ✅ **PARAR** - Análise completa realizada
2. ⏳ **AGUARDAR** - Autorização expressa do usuário
3. ❌ **NÃO PROSSEGUIR** - Sem aprovação

---

## 📝 CONCLUSÃO

### **RESUMO DA ALTERAÇÃO**

A alteração proposta é **INCREMENTAL** e **NÃO DESTRUTIVA**:
- ✅ Adiciona lógica condicional baseada em origem do cadastro
- ✅ Mantém comportamento atual para acesso admin
- ✅ Não altera funcionalidades existentes
- ✅ Não remove código existente

### **PRÉ-REQUISITOS**

1. **Status 99 deve existir** no banco antes da implementação
2. **Validação de FK** deve ser adicionada para garantir integridade
3. **Testes completos** devem ser executados antes de produção

### **PRÓXIMOS PASSOS**

1. ⏳ **Aguardar aprovação** do usuário
2. 📝 Criar script SQL para status 99
3. 🔧 Implementar alterações no código
4. ✅ Executar testes completos
5. 📊 Validar em ambiente de teste
6. 🚀 Deploy em produção

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Análise de Impacto - Aguardando Aprovação**  
**Próximo passo:** Aprovação e criação do script SQL para status 99









