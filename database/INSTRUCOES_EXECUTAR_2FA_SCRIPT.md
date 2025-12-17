# 📋 INSTRUÇÕES: Como Executar o Script de 2FA

## 🎯 Objetivo
Adicionar campos necessários para autenticação 2FA nas tabelas `clientes` e `proprietarios`.

---

## ⚠️ ANTES DE EXECUTAR

### 1. **Verificar Conexão com o Banco**
Certifique-se de estar conectado ao banco de dados correto:
- **Banco**: `net_imobiliaria`
- **Usuário**: `postgres` (ou seu usuário com permissões de ALTER TABLE)

### 2. **Fazer Backup Completo** (RECOMENDADO)
Embora o script crie backup da estrutura, é recomendado fazer backup completo:

```bash
# Windows (PowerShell)
pg_dump -U postgres -d net_imobiliaria -f "backup_antes_2fa_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Linux/Mac
pg_dump -U postgres -d net_imobiliaria -f "backup_antes_2fa_$(date +%Y%m%d_%H%M%S).sql"
```

---

## 🚀 EXECUTAR O SCRIPT

### Opção 1: Via pgAdmin4 (Recomendado)

1. Abra o **pgAdmin4**
2. Conecte ao servidor PostgreSQL
3. Navegue até o banco `net_imobiliaria`
4. Clique com botão direito → **Query Tool**
5. Abra o arquivo: `database/add_2fa_fields_clientes_proprietarios.sql`
6. Clique em **Execute** (F5)
7. Verifique os logs no painel inferior

### Opção 2: Via Terminal (psql)

```bash
# Windows (PowerShell)
psql -U postgres -d net_imobiliaria -f database/add_2fa_fields_clientes_proprietarios.sql

# Linux/Mac
psql -U postgres -d net_imobiliaria -f database/add_2fa_fields_clientes_proprietarios.sql
```

---

## ✅ VERIFICAR SE DEU CERTO

### 1. **Verificar Campos Criados**

Execute esta query no pgAdmin ou psql:

```sql
-- Verificar clientes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clientes' 
  AND column_name IN ('email', 'password', 'two_fa_enabled');

-- Verificar proprietarios
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'proprietarios' 
  AND column_name IN ('email', 'password', 'two_fa_enabled');
```

**Resultado Esperado**:
```
column_name      | data_type        | column_default
-----------------+------------------+------------------
email            | character varying| NULL
password         | character varying| NULL
two_fa_enabled   | boolean          | true
```

### 2. **Verificar Índices Criados**

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('clientes', 'proprietarios')
  AND indexname IN ('idx_clientes_email', 'idx_proprietarios_email');
```

**Resultado Esperado**:
```
tablename      | indexname              | indexdef
---------------+------------------------+----------------------------------------
clientes       | idx_clientes_email     | CREATE INDEX idx_clientes_email...
proprietarios  | idx_proprietarios_email| CREATE INDEX idx_proprietarios_email...
```

### 3. **Verificar Registros Não Foram Alterados**

```sql
-- Contar registros
SELECT 
    'clientes' as tabela,
    COUNT(*) as total_registros
FROM clientes
UNION ALL
SELECT 
    'proprietarios' as tabela,
    COUNT(*) as total_registros
FROM proprietarios;
```

Compare com a contagem antes do script. **Deve ser igual** (apenas estrutura foi alterada).

---

## 📊 LOGS ESPERADOS

Durante a execução, você verá:

```
✅ Tabelas clientes e proprietarios existem
✅ Campos password e email existem em ambas as tabelas
✅ Backup de estrutura criado: clientes_backup_estrutura_20251105
✅ Backup de estrutura criado: proprietarios_backup_estrutura_20251105
✅ Campo two_fa_enabled adicionado na tabela clientes
✅ Índice idx_clientes_email criado
✅ Campo two_fa_enabled adicionado na tabela proprietarios
✅ Índice idx_proprietarios_email criado
================================================
✅ ALTERAÇÕES CONCLUÍDAS COM SUCESSO!
================================================
```

---

## 🔄 ROLLBACK (Se Necessário)

Se algo der errado ou precisar reverter:

### 1. **Executar Script de Rollback**

No pgAdmin ou psql, execute:

```sql
-- Remover campos two_fa_enabled
ALTER TABLE clientes DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS two_fa_enabled;

-- Remover índices criados
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_proprietarios_email;

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clientes' AND column_name = 'two_fa_enabled';
-- Resultado esperado: 0 linhas (campo removido)
```

### 2. **Restaurar do Backup (Se Necessário)**

```bash
# Se fez backup completo
psql -U postgres -d net_imobiliaria -f backup_antes_2fa_YYYYMMDD_HHMMSS.sql
```

---

## ⚠️ PROBLEMAS COMUNS

### Erro: "Tabela clientes não existe"
**Solução**: Verifique se está conectado ao banco correto (`net_imobiliaria`)

### Erro: "Campo password não existe"
**Solução**: Verifique se as tabelas `clientes` e `proprietarios` têm os campos `email` e `password`

### Aviso: "Campo two_fa_enabled já existe"
**Solução**: Tudo bem! O script detectou e pulou. Não é erro.

### Erro: "Permissão negada"
**Solução**: Conecte com usuário que tenha permissão de ALTER TABLE (geralmente `postgres`)

---

## 📝 CHECKLIST PÓS-EXECUÇÃO

- [ ] Script executado sem erros
- [ ] Campo `two_fa_enabled` existe em `clientes`
- [ ] Campo `two_fa_enabled` existe em `proprietarios`
- [ ] Índice `idx_clientes_email` criado
- [ ] Índice `idx_proprietarios_email` criado
- [ ] Número de registros permanece igual
- [ ] Nenhum dado foi perdido

---

## ✅ PRÓXIMOS PASSOS

Após execução bem-sucedida:

1. ✅ **FASE 1 CONCLUÍDA** - Banco de dados preparado
2. ⏭️ **FASE 2** - Criar APIs de autenticação pública
3. ⏭️ **FASE 3** - Criar componentes de interface
4. ⏭️ **FASE 4** - Criar área restrita

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs de erro do PostgreSQL
2. Revise os requisitos (campos `email` e `password` devem existir)
3. Execute o rollback se necessário
4. Restaure do backup se algo crítico acontecer

---

## 🔒 SEGURANÇA

✅ Script é idempotente (pode ser executado múltiplas vezes)  
✅ Cria backup da estrutura antes de alterar  
✅ Não modifica ou deleta dados existentes  
✅ Inclui seção de rollback completo  
✅ Verifica pré-requisitos antes de executar  
✅ Logs detalhados de todas as operações  

---

**Data**: 05/11/2025  
**Versão**: 1.0  
**Sistema**: Net Imobiliária - Autenticação Pública


