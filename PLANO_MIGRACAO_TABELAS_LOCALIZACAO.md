# 📋 PLANO DE MIGRAÇÃO - TABELAS DE LOCALIZAÇÃO

## 🎯 Objetivo
Remover as tabelas `estados`, `cidades` e `municipios` do banco de dados, mantendo apenas o JSON de municípios como fonte de dados.

---

## 📊 ANÁLISE ATUAL

### ✅ Situação Positiva
- **Nenhum arquivo usa queries diretas** às tabelas de localização
- **14 de 17 arquivos** já usam o JSON de municípios
- **Hook `useEstadosCidades`** já está implementado e funcional
- **API `/api/admin/municipios`** já serve o JSON

### ⚠️ Situação que Requer Atenção
- **3 arquivos** fazem referência aos termos, mas **não acessam o banco diretamente**:
  1. `src/app/api/admin/dashboard/stats/route.ts` - Usa campos `estado` e `cidade` da tabela `imoveis`
  2. `src/app/api/admin/imoveis/route.ts` - Usa campos `estado_fk` e `cidade_fk` da tabela `imoveis`
  3. `src/lib/config/constants.ts` - Apenas define constante de API

### 🔗 Dependências no Banco
- Tabela `cidades` tem foreign key para `estados.id`
- Tabela `cidades` está **vazia** (0 registros)
- Tabela `municipios` tem apenas **14 registros** (incompleta)
- Tabela `estados` tem **27 registros** (completa)

---

## 🚨 PONTOS CRÍTICOS IDENTIFICADOS

### 1️⃣ Campos na Tabela `imoveis`
A tabela `imoveis` possui campos que armazenam dados de localização:
- `estado` (tipo: VARCHAR) - Armazena **sigla** do estado (ex: "SP", "RJ")
- `cidade` (tipo: VARCHAR) - Armazena **nome** da cidade
- `estado_fk` (tipo: INTEGER) - Armazena **ID** do estado (ex: 25 para SP)
- `cidade_fk` (tipo: INTEGER) - Armazena **ID** da cidade

**⚠️ IMPORTANTE:** Esses campos **NÃO são foreign keys** para as tabelas `estados`, `cidades` ou `municipios`. São apenas campos de texto/número que armazenam valores.

### 2️⃣ Inconsistência de Dados
- Alguns campos usam **sigla** (estado: "SP")
- Outros usam **ID** (estado_fk: 25)
- Outros usam **nome** (cidade: "São Paulo")

### 3️⃣ Conversão de IDs
O arquivo `src/app/api/admin/imoveis/route.ts` tem um mapeamento hardcoded:
```typescript
const siglasEstados: {[key: number]: string} = {
  0: 'RO', 1: 'AC', 2: 'AM', 3: 'RR', 4: 'PA', 5: 'AP', 6: 'TO', 7: 'MA',
  8: 'PI', 9: 'CE', 10: 'RN', 11: 'PB', 12: 'PE', 13: 'AL', 14: 'SE', 15: 'BA',
  16: 'MG', 17: 'ES', 18: 'RJ', 19: 'SP', 20: 'PR', 21: 'SC', 22: 'RS', 23: 'MS',
  24: 'MT', 25: 'GO', 26: 'DF'
}
```

---

## 📝 PLANO DE MIGRAÇÃO (5 FASES)

### ✅ FASE 1: VERIFICAÇÃO E BACKUP (CRÍTICO)
**Objetivo:** Garantir que não perderemos dados importantes

#### 1.1. Verificar Foreign Keys
```sql
-- Verificar se há foreign keys nas tabelas
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name IN ('estados', 'cidades', 'municipios')
       OR tc.table_name IN ('estados', 'cidades', 'municipios'));
```

#### 1.2. Verificar Dados na Tabela `imoveis`
```sql
-- Verificar se há imóveis com dados de localização
SELECT 
  COUNT(*) as total_imoveis,
  COUNT(estado) as com_estado,
  COUNT(cidade) as com_cidade,
  COUNT(estado_fk) as com_estado_fk,
  COUNT(cidade_fk) as com_cidade_fk
FROM imoveis;

-- Verificar valores únicos de estado
SELECT DISTINCT estado, COUNT(*) as quantidade
FROM imoveis
WHERE estado IS NOT NULL
GROUP BY estado
ORDER BY quantidade DESC;

-- Verificar valores únicos de cidade
SELECT DISTINCT cidade, COUNT(*) as quantidade
FROM imoveis
WHERE cidade IS NOT NULL
GROUP BY cidade
ORDER BY quantidade DESC
LIMIT 20;
```

#### 1.3. Backup das Tabelas
```sql
-- Criar backup das tabelas antes de remover
CREATE TABLE estados_backup AS SELECT * FROM estados;
CREATE TABLE cidades_backup AS SELECT * FROM cidades;
CREATE TABLE municipios_backup AS SELECT * FROM municipios;
```

**✅ Critério de Sucesso:**
- Backup criado com sucesso
- Dados da tabela `imoveis` verificados e documentados
- Nenhuma foreign key crítica encontrada

---

### ✅ FASE 2: PADRONIZAÇÃO DE DADOS (RECOMENDADO)
**Objetivo:** Garantir consistência nos dados de localização na tabela `imoveis`

#### 2.1. Criar Função de Conversão
```sql
-- Função para converter ID de estado para sigla
CREATE OR REPLACE FUNCTION get_estado_sigla(estado_id INTEGER) 
RETURNS VARCHAR AS $$
DECLARE
  siglas VARCHAR[] := ARRAY['RO', 'AC', 'AM', 'RR', 'PA', 'AP', 'TO', 'MA',
                            'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA',
                            'MG', 'ES', 'RJ', 'SP', 'PR', 'SC', 'RS', 'MS',
                            'MT', 'GO', 'DF'];
BEGIN
  IF estado_id >= 0 AND estado_id <= 26 THEN
    RETURN siglas[estado_id + 1];
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 2.2. Atualizar Dados Inconsistentes (OPCIONAL)
```sql
-- Atualizar campo 'estado' baseado em 'estado_fk' se estiver vazio
UPDATE imoveis
SET estado = get_estado_sigla(estado_fk)
WHERE estado IS NULL AND estado_fk IS NOT NULL;

-- Verificar resultado
SELECT 
  COUNT(*) as total,
  COUNT(estado) as com_estado,
  COUNT(estado_fk) as com_estado_fk
FROM imoveis;
```

**✅ Critério de Sucesso:**
- Função criada com sucesso
- Dados padronizados (opcional)
- Nenhum dado perdido

---

### ✅ FASE 3: ATUALIZAÇÃO DO CÓDIGO
**Objetivo:** Garantir que o código não depende das tabelas

#### 3.1. Verificar Arquivo `src/app/api/admin/dashboard/stats/route.ts`
**Status:** ✅ **JÁ CORRETO** - Usa campos da tabela `imoveis`, não das tabelas de localização

```typescript
// LINHA 65-76: Query usa campo 'estado' da tabela imoveis
const estadosQuery = `
  SELECT 
    COALESCE(estado, 'Não informado') as estado,
    COUNT(*) as quantidade
  FROM imoveis
  WHERE ativo = true
  GROUP BY estado
  ORDER BY quantidade DESC
  LIMIT 10
`

// LINHA 79-90: Query usa campo 'cidade' da tabela imoveis
const municipiosQuery = `
  SELECT 
    COALESCE(cidade, 'Não informado') as municipio,
    COUNT(*) as quantidade
  FROM imoveis
  WHERE ativo = true
  GROUP BY cidade
  ORDER BY quantidade DESC
  LIMIT 10
`
```

**✅ Ação:** Nenhuma alteração necessária

#### 3.2. Verificar Arquivo `src/app/api/admin/imoveis/route.ts`
**Status:** ✅ **JÁ CORRETO** - Usa campos da tabela `imoveis`, não das tabelas de localização

**Pontos de atenção:**
- **LINHA 103-115:** Conversão de ID para sigla (hardcoded) - Funciona independente das tabelas
- **LINHA 118-125:** Filtro por município - Usa nome diretamente
- **LINHA 167-169:** Filtro por cidade - Usa campo da tabela `imoveis`
- **LINHA 386-411:** Salva dados de localização - Usa campos `cidade_fk` e `estado_fk`

**✅ Ação:** Nenhuma alteração necessária

#### 3.3. Verificar Arquivo `src/lib/config/constants.ts`
**Status:** ✅ **JÁ CORRETO** - Apenas define constante de API

```typescript
// LINHA 383-385
MUNICIPALITIES: {
  LIST: '/api/admin/municipios'
}
```

**✅ Ação:** Nenhuma alteração necessária

#### 3.4. Criar Função Utilitária (RECOMENDADO)
Criar arquivo `src/lib/utils/locationHelpers.ts` para centralizar conversões:

```typescript
/**
 * Mapeamento de IDs de estados para siglas
 * Baseado no JSON de municípios
 */
const ESTADO_ID_TO_SIGLA: { [key: number]: string } = {
  0: 'RO', 1: 'AC', 2: 'AM', 3: 'RR', 4: 'PA', 5: 'AP', 6: 'TO', 7: 'MA',
  8: 'PI', 9: 'CE', 10: 'RN', 11: 'PB', 12: 'PE', 13: 'AL', 14: 'SE', 15: 'BA',
  16: 'MG', 17: 'ES', 18: 'RJ', 19: 'SP', 20: 'PR', 21: 'SC', 22: 'RS', 23: 'MS',
  24: 'MT', 25: 'GO', 26: 'DF'
}

/**
 * Converte ID do estado para sigla
 */
export function getEstadoSigla(estadoId: number): string | null {
  return ESTADO_ID_TO_SIGLA[estadoId] || null
}

/**
 * Converte sigla do estado para ID
 */
export function getEstadoId(sigla: string): number | null {
  const entry = Object.entries(ESTADO_ID_TO_SIGLA).find(([_, s]) => s === sigla)
  return entry ? parseInt(entry[0]) : null
}
```

**✅ Critério de Sucesso:**
- Todos os arquivos verificados
- Nenhuma dependência direta das tabelas encontrada
- Função utilitária criada (opcional)

---

### ✅ FASE 4: TESTES
**Objetivo:** Garantir que tudo funciona antes de remover as tabelas

#### 4.1. Testes Funcionais
- [ ] Cadastro de novo imóvel com endereço completo
- [ ] Edição de imóvel existente
- [ ] Filtro de imóveis por estado
- [ ] Filtro de imóveis por município
- [ ] Dashboard - Gráfico de distribuição por estado
- [ ] Dashboard - Gráfico de distribuição por município
- [ ] Cadastro de cliente com endereço
- [ ] Cadastro de proprietário com endereço

#### 4.2. Testes de API
```bash
# Testar API de municípios
curl http://localhost:3000/api/admin/municipios

# Testar listagem de imóveis
curl http://localhost:3000/api/admin/imoveis

# Testar filtro por estado
curl "http://localhost:3000/api/admin/imoveis?estado=19"

# Testar estatísticas do dashboard
curl http://localhost:3000/api/admin/dashboard/stats
```

#### 4.3. Verificar Logs
- [ ] Nenhum erro relacionado a `estados`, `cidades` ou `municipios` no console
- [ ] Nenhuma query SQL falhando
- [ ] Dados de localização sendo exibidos corretamente

**✅ Critério de Sucesso:**
- Todos os testes passando
- Nenhum erro nos logs
- Funcionalidades operando normalmente

---

### ✅ FASE 5: REMOÇÃO DAS TABELAS
**Objetivo:** Remover as tabelas legadas do banco de dados

#### 5.1. Remover Foreign Key Constraint
```sql
-- Verificar nome da constraint
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'cidades' 
  AND constraint_type = 'FOREIGN KEY';

-- Remover constraint (substitua 'nome_da_constraint' pelo nome real)
ALTER TABLE cidades DROP CONSTRAINT IF EXISTS cidades_estado_id_fkey;
```

#### 5.2. Dropar Tabelas
```sql
-- Dropar tabelas na ordem correta (das dependentes para as independentes)
DROP TABLE IF EXISTS cidades CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS estados CASCADE;
```

#### 5.3. Remover Função Temporária (se criada)
```sql
-- Remover função de conversão se foi criada
DROP FUNCTION IF EXISTS get_estado_sigla(INTEGER);
```

#### 5.4. Verificar Remoção
```sql
-- Verificar se as tabelas foram removidas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('estados', 'cidades', 'municipios');
```

**✅ Critério de Sucesso:**
- Tabelas removidas com sucesso
- Nenhuma tabela órfã restante
- Aplicação funcionando normalmente

---

## 🎯 RESUMO EXECUTIVO

### ✅ O que está CORRETO
1. **Nenhum arquivo usa queries diretas** às tabelas de localização
2. **14 de 17 arquivos** já usam o JSON de municípios
3. **Hook `useEstadosCidades`** já implementado e funcional
4. **API `/api/admin/municipios`** já serve o JSON
5. **Tabela `imoveis`** usa campos próprios, não foreign keys

### ⚠️ O que precisa de ATENÇÃO
1. **Campos `estado_fk` e `cidade_fk`** na tabela `imoveis` - Não são foreign keys, mas podem causar confusão
2. **Mapeamento hardcoded** de IDs para siglas em `imoveis/route.ts` - Funciona, mas pode ser centralizado

### 🚀 Próximos Passos RECOMENDADOS
1. ✅ **FASE 1:** Fazer backup das tabelas (CRÍTICO)
2. ✅ **FASE 2:** Padronizar dados na tabela `imoveis` (OPCIONAL)
3. ✅ **FASE 3:** Criar função utilitária para conversões (RECOMENDADO)
4. ✅ **FASE 4:** Executar testes completos (CRÍTICO)
5. ✅ **FASE 5:** Remover tabelas do banco (FINAL)

### ⏱️ Tempo Estimado
- **FASE 1:** 15 minutos
- **FASE 2:** 30 minutos (opcional)
- **FASE 3:** 15 minutos (recomendado)
- **FASE 4:** 30 minutos (crítico)
- **FASE 5:** 10 minutos (final)

**TOTAL:** ~1h40min (ou ~1h se pular FASE 2)

### 🎯 Risco
**BAIXO** - As tabelas não são usadas diretamente no código, apenas o JSON é utilizado.

---

## 📞 SUPORTE

Se encontrar qualquer problema durante a migração:
1. **NÃO PROSSIGA** para a próxima fase
2. Restaure o backup: `CREATE TABLE estados AS SELECT * FROM estados_backup;`
3. Documente o erro encontrado
4. Revise o plano antes de tentar novamente

---

**Documento criado em:** 2025-10-08  
**Versão:** 1.0  
**Status:** Pronto para execução


