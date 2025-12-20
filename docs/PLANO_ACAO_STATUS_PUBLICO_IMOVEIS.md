# 📋 PLANO DE AÇÃO: STATUS_FK = 99 PARA CADASTRO PÚBLICO
## Implementação Incremental Seguindo GUARDIAN_RULES

**Data:** 2025-01-24  
**Status:** 📘 Plano de Ação - Aguardando Aprovação  
**Baseado em:** `docs/ANALISE_IMPACTO_STATUS_PUBLICO_IMOVEIS.md`

---

## 📋 SUMÁRIO

1. [Pré-requisitos](#1-pré-requisitos)
2. [Fase 1: Preparação do Banco de Dados](#2-fase-1-preparação-do-banco-de-dados)
3. [Fase 2: Alteração do Código](#3-fase-2-alteração-do-código)
4. [Fase 3: Testes e Validação](#4-fase-3-testes-e-validação)
5. [Fase 4: Deploy e Monitoramento](#5-fase-4-deploy-e-monitoramento)
6. [Rollback (Se Necessário)](#6-rollback-se-necessário)

---

## 1. **PRÉ-REQUISITOS**

### 1.1. Checklist Pré-Implementação

- [ ] ✅ Análise de Impacto criada e revisada
- [ ] ✅ Inventário de Dependências consultado
- [ ] ✅ Backup do banco de dados realizado
- [ ] ✅ Ambiente de teste configurado
- [ ] ✅ **AUTORIZAÇÃO EXPRESSA** do usuário recebida

### 1.2. Validações Iniciais

```sql
-- Verificar se status 99 já existe
SELECT id, nome, ativo FROM status_imovel WHERE id = 99;

-- Verificar estrutura da tabela status_imovel
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'status_imovel';

-- Verificar foreign key constraint
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

---

## 2. **FASE 1: PREPARAÇÃO DO BANCO DE DADOS**

### 2.1. Criar Script SQL

**Arquivo:** `database/migrations/add_status_99_cadastro_publico.sql`

```sql
-- ========================================
-- MIGRAÇÃO: Adicionar Status 99 para Cadastro Público
-- Data: 2025-01-24
-- Descrição: Status para imóveis cadastrados via acesso público
-- ========================================

-- Inserir status 99 (Aguardando Aprovação)
INSERT INTO status_imovel (id, nome, cor, descricao, ativo, consulta_imovel_internauta, created_at, updated_at)
VALUES (
  99,
  'Aguardando Aprovação',
  '#F59E0B',
  'Imóvel cadastrado via acesso público, aguardando aprovação interna para publicação',
  true,
  false, -- Não deve aparecer em consultas públicas (consulta_imovel_internauta = false)
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
SELECT id, nome, cor, ativo, consulta_imovel_internauta 
FROM status_imovel 
WHERE id = 99;

-- Validar que não há conflitos
SELECT COUNT(*) as total_status_99 
FROM status_imovel 
WHERE id = 99 AND ativo = true;
```

### 2.2. Executar Script

```bash
# Executar script SQL
psql -U postgres -d net_imobiliaria -f database/migrations/add_status_99_cadastro_publico.sql

# Verificar resultado
psql -U postgres -d net_imobiliaria -c "SELECT id, nome, ativo FROM status_imovel WHERE id = 99;"
```

### 2.3. Validação Pós-Criação

- [ ] Status 99 criado com sucesso
- [ ] Nome: "Aguardando Aprovação"
- [ ] Cor: "#F59E0B" (laranja/amarelo)
- [ ] Ativo: `true`
- [ ] `consulta_imovel_internauta`: `false` (não aparece em consultas públicas)

---

## 3. **FASE 2: ALTERAÇÃO DO CÓDIGO**

### 3.1. Alteração na API `POST /api/admin/imoveis`

**Arquivo:** `src/app/api/admin/imoveis/route.ts`

#### 3.1.1. Primeira Alteração (Linha ~300)

**Localização:** Após detecção de `isPublicAccess` e antes da validação do código

**ANTES:**
```typescript
// Sempre usar status_fk = 1 (Ativo)
body.status_fk = 1
```

**DEPOIS:**
```typescript
// Definir status baseado na origem do cadastro
// Status 99 = Aguardando Aprovação (cadastro público)
// Status 1 = Ativo (cadastro admin)
if (isPublicAccess) {
  body.status_fk = 99
  console.log('🔍 Status definido para cadastro público: status_fk = 99')
} else {
  body.status_fk = 1
  console.log('🔍 Status definido para cadastro admin: status_fk = 1')
}
```

#### 3.1.2. Segunda Alteração (Linha ~384)

**Localização:** Após conversão de IDs

**ANTES:**
```typescript
dadosImovel.status_fk = 1 // Sempre status_id = 1
```

**DEPOIS:**
```typescript
// Status já foi definido acima baseado em isPublicAccess
// Manter consistência (não sobrescrever)
if (!dadosImovel.status_fk) {
  dadosImovel.status_fk = isPublicAccess ? 99 : 1
}
console.log('🔍 Status final para inserção:', dadosImovel.status_fk, 'Origem:', origemCadastro)
```

### 3.2. Adicionar Validação na Função `createImovel`

**Arquivo:** `src/lib/database/imoveis.ts`

#### 3.2.1. Adicionar Validação de Status

**Localização:** Após validação de proprietário (após linha ~396)

**CÓDIGO A ADICIONAR:**
```typescript
// Validar se status_fk existe e está ativo
if (imovel.status_fk) {
  const statusCheck = await pool.query(
    'SELECT id, nome, ativo FROM status_imovel WHERE id = $1',
    [imovel.status_fk]
  )
  
  if (statusCheck.rows.length === 0) {
    throw new Error(`Status ${imovel.status_fk} não encontrado na tabela status_imovel`)
  }
  
  if (!statusCheck.rows[0].ativo) {
    throw new Error(`Status ${imovel.status_fk} (${statusCheck.rows[0].nome}) está inativo`)
  }
  
  console.log('✅ Status validado:', {
    id: statusCheck.rows[0].id,
    nome: statusCheck.rows[0].nome,
    ativo: statusCheck.rows[0].ativo
  })
}
```

### 3.3. Validação de Código

- [ ] Código compila sem erros TypeScript
- [ ] Linter não reporta erros
- [ ] Logs de debug adicionados corretamente
- [ ] Comentários explicativos adicionados

---

## 4. **FASE 3: TESTES E VALIDAÇÃO**

### 4.1. Testes Funcionais

#### Teste 1: Criação via Admin

**Cenário:**
1. Acessar `/admin/imoveis/novo` (sem `noSidebar=true`)
2. Preencher formulário completo
3. Salvar imóvel

**Validação Esperada:**
```sql
SELECT id, codigo, status_fk, origem_cadastro 
FROM imoveis 
WHERE codigo = '<codigo_teste>';

-- Resultado esperado:
-- status_fk = 1
-- origem_cadastro = 'Admin'
```

**Checklist:**
- [ ] Imóvel criado com sucesso
- [ ] `status_fk = 1`
- [ ] `origem_cadastro = 'Admin'`
- [ ] Logs mostram "Status definido para cadastro admin"

#### Teste 2: Criação via Landing (Proprietário Logado)

**Cenário:**
1. Fazer login como proprietário na landing page
2. Clicar em "Cadastrar Imóvel" (redireciona para `/admin/imoveis/novo?noSidebar=true`)
3. Preencher formulário completo
4. Salvar imóvel

**Validação Esperada:**
```sql
SELECT id, codigo, status_fk, origem_cadastro 
FROM imoveis 
WHERE codigo = '<codigo_teste>';

-- Resultado esperado:
-- status_fk = 99
-- origem_cadastro = 'Publico'
```

**Checklist:**
- [ ] Imóvel criado com sucesso
- [ ] `status_fk = 99`
- [ ] `origem_cadastro = 'Publico'`
- [ ] Logs mostram "Status definido para cadastro público"
- [ ] Proprietário pré-preenchido corretamente

#### Teste 3: Criação via Landing (Acesso Direto)

**Cenário:**
1. Acessar `/admin/imoveis/novo` com referer `/landpaging`
2. Preencher formulário completo
3. Salvar imóvel

**Validação Esperada:**
```sql
SELECT id, codigo, status_fk, origem_cadastro 
FROM imoveis 
WHERE codigo = '<codigo_teste>';

-- Resultado esperado:
-- status_fk = 99
-- origem_cadastro = 'Publico'
```

**Checklist:**
- [ ] Imóvel criado com sucesso
- [ ] `status_fk = 99`
- [ ] `origem_cadastro = 'Publico'`
- [ ] Detecção via referer funcionando

#### Teste 4: Edição de Imóvel Existente

**Cenário:**
1. Editar imóvel existente (qualquer status)
2. Alterar outros campos (não status)
3. Salvar alterações

**Validação Esperada:**
```sql
-- Antes da edição
SELECT id, codigo, status_fk FROM imoveis WHERE id = <id_teste>;

-- Após edição (mesmo status)
SELECT id, codigo, status_fk FROM imoveis WHERE id = <id_teste>;

-- Resultado esperado:
-- status_fk não foi alterado automaticamente
```

**Checklist:**
- [ ] Imóvel editado com sucesso
- [ ] `status_fk` permanece o mesmo
- [ ] Outros campos foram atualizados

### 4.2. Testes de Integridade

#### Teste 5: Validação de FK Inválida

**Cenário:**
1. Tentar criar imóvel com `status_fk` inexistente (ex: 999)
2. Verificar tratamento de erro

**Validação Esperada:**
- Erro lançado: "Status 999 não encontrado na tabela status_imovel"
- Imóvel não é criado
- Logs mostram erro de validação

**Checklist:**
- [ ] Erro é lançado corretamente
- [ ] Mensagem de erro é clara
- [ ] Imóvel não é criado
- [ ] Transação é revertida

#### Teste 6: Listagens e Filtros

**Cenário:**
1. Acessar `/admin/imoveis`
2. Filtrar por status 99
3. Filtrar por status 1
4. Verificar contagens

**Validação Esperada:**
- Filtro por status 99 mostra apenas imóveis com `status_fk = 99`
- Filtro por status 1 mostra apenas imóveis com `status_fk = 1`
- Contagens estão corretas

**Checklist:**
- [ ] Filtros funcionam corretamente
- [ ] Contagens estão corretas
- [ ] Status 99 aparece na lista de filtros

#### Teste 7: Dashboards e Relatórios

**Cenário:**
1. Acessar dashboards que agrupam por status
2. Verificar contagem de status 99
3. Verificar gráficos e estatísticas

**Validação Esperada:**
- Status 99 é contabilizado corretamente
- Gráficos mostram status 99
- Estatísticas estão corretas

**Checklist:**
- [ ] Dashboards funcionam corretamente
- [ ] Status 99 aparece nas estatísticas
- [ ] Gráficos estão corretos

### 4.3. Testes de Regressão

#### Teste 8: Fluxo Completo Admin

**Cenário:**
1. Criar imóvel via admin
2. Editar imóvel
3. Adicionar imagens
4. Adicionar amenidades
5. Adicionar proximidades
6. Adicionar documentos
7. Verificar status final

**Checklist:**
- [ ] Todos os passos funcionam
- [ ] Status permanece 1
- [ ] Nenhuma funcionalidade quebrada

#### Teste 9: Fluxo Completo Público

**Cenário:**
1. Login como proprietário
2. Criar imóvel via landing
3. Completar todos os passos
4. Verificar status final

**Checklist:**
- [ ] Todos os passos funcionam
- [ ] Status permanece 99
- [ ] Nenhuma funcionalidade quebrada

---

## 5. **FASE 4: DEPLOY E MONITORAMENTO**

### 5.1. Checklist de Deploy

- [ ] ✅ Script SQL executado em produção
- [ ] ✅ Código alterado e testado
- [ ] ✅ Todos os testes passaram
- [ ] ✅ Backup realizado antes do deploy
- [ ] ✅ Deploy realizado em horário de baixo tráfego

### 5.2. Monitoramento Pós-Deploy

#### 5.2.1. Verificações Imediatas (Primeiras 24h)

```sql
-- Verificar imóveis criados via público após deploy
SELECT 
  id,
  codigo,
  status_fk,
  origem_cadastro,
  created_at
FROM imoveis
WHERE origem_cadastro = 'Publico'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Verificar se algum imóvel público tem status incorreto
SELECT 
  id,
  codigo,
  status_fk,
  origem_cadastro
FROM imoveis
WHERE origem_cadastro = 'Publico'
  AND status_fk != 99;

-- Verificar se algum imóvel admin tem status incorreto
SELECT 
  id,
  codigo,
  status_fk,
  origem_cadastro
FROM imoveis
WHERE origem_cadastro = 'Admin'
  AND status_fk != 1
  AND created_at >= NOW() - INTERVAL '24 hours';
```

#### 5.2.2. Logs e Alertas

- [ ] Monitorar logs da aplicação para erros
- [ ] Verificar logs de auditoria
- [ ] Alertar se houver FK inválida
- [ ] Alertar se houver status incorreto

### 5.3. Validação Contínua

**Primeira Semana:**
- [ ] Verificar diariamente imóveis criados
- [ ] Validar que status está correto
- [ ] Monitorar erros de validação

**Primeiro Mês:**
- [ ] Revisar estatísticas semanais
- [ ] Validar que não há regressões
- [ ] Documentar casos especiais

---

## 6. **ROLLBACK (SE NECESSÁRIO)**

### 6.1. Script de Rollback SQL

**Arquivo:** `database/migrations/rollback_status_99_cadastro_publico.sql`

```sql
-- ========================================
-- ROLLBACK: Reverter Status 99 para Status 1
-- Data: 2025-01-24
-- Descrição: Reverter imóveis criados via público para status 1
-- ========================================

-- Reverter status 99 para 1 em imóveis criados via público
UPDATE imoveis 
SET status_fk = 1,
    updated_at = NOW()
WHERE status_fk = 99 
  AND origem_cadastro = 'Publico'
  AND created_at >= '2025-01-24 00:00:00'; -- Data da implementação

-- Verificar reversão
SELECT 
  COUNT(*) as total_revertidos,
  MIN(created_at) as primeiro_imovel,
  MAX(created_at) as ultimo_imovel
FROM imoveis
WHERE origem_cadastro = 'Publico'
  AND status_fk = 1
  AND created_at >= '2025-01-24 00:00:00';

-- Opcional: Desativar status 99 (não remover para manter histórico)
UPDATE status_imovel 
SET ativo = false,
    updated_at = NOW()
WHERE id = 99;
```

### 6.2. Reversão de Código

**Arquivo:** `src/app/api/admin/imoveis/route.ts`

**Reverter para:**
```typescript
// Sempre usar status_fk = 1 (Ativo)
body.status_fk = 1
dadosImovel.status_fk = 1 // Sempre status_id = 1
```

**Arquivo:** `src/lib/database/imoveis.ts`

**Remover validação de status** (opcional, pode manter)

### 6.3. Checklist de Rollback

- [ ] ✅ Script SQL de rollback executado
- [ ] ✅ Código revertido para versão anterior
- [ ] ✅ Imóveis com status 99 revertidos para 1
- [ ] ✅ Funcionalidade admin testada e funcionando
- [ ] ✅ Documentação atualizada

---

## 📊 RESUMO DAS ALTERAÇÕES

### Arquivos Modificados

1. **`database/migrations/add_status_99_cadastro_publico.sql`** (NOVO)
   - Cria status 99 no banco de dados

2. **`src/app/api/admin/imoveis/route.ts`** (MODIFICADO)
   - Linha ~300: Alterar lógica de `status_fk` baseada em `isPublicAccess`
   - Linha ~384: Ajustar atribuição de `status_fk`

3. **`src/lib/database/imoveis.ts`** (MODIFICADO)
   - Adicionar validação de `status_fk` antes do INSERT

### Arquivos NÃO Modificados

- ✅ Nenhum arquivo de frontend
- ✅ Nenhum arquivo de edição
- ✅ Nenhum arquivo de listagem
- ✅ Nenhum arquivo de filtros

---

## ✅ CHECKLIST FINAL

### Antes de Implementar
- [ ] ✅ Análise de Impacto criada
- [ ] ✅ Inventário de Dependências consultado
- [ ] ✅ **AUTORIZAÇÃO EXPRESSA** recebida
- [ ] ✅ Backup do banco realizado
- [ ] ✅ Ambiente de teste configurado

### Durante Implementação
- [ ] ✅ Script SQL criado e executado
- [ ] ✅ Status 99 criado no banco
- [ ] ✅ Código alterado conforme plano
- [ ] ✅ Validações adicionadas
- [ ] ✅ Logs de debug adicionados

### Após Implementação
- [ ] ✅ Todos os testes executados
- [ ] ✅ Validações funcionando
- [ ] ✅ Nenhuma regressão identificada
- [ ] ✅ Documentação atualizada
- [ ] ✅ Monitoramento ativo

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Plano de Ação - Aguardando Aprovação**  
**Próximo passo:** Aprovação e início da Fase 1









