# 📝 INSTRUÇÕES PARA POPULAR O BANCO DE DADOS

**Data:** 26/10/2025  
**Status:** ⏳ AGUARDANDO EXECUÇÃO

---

## 🎯 OBJETIVO

Popular a tabela `sidebar_menu_items` com a estrutura atual da sidebar baseada no arquivo `AdminSidebar.tsx`.

---

## 📋 PRÉ-REQUISITOS

1. ✅ Tabelas criadas (FASE 0 concluída)
   - `sidebar_menu_items`
   - `sidebar_menu_versions`
   - Views e funções
   
2. ✅ Banco de dados acessível
   - pgAdmin, DBeaver, ou psql

---

## 🚀 MÉTODO 1: Via pgAdmin (RECOMENDADO)

### **Passo 1: Acessar pgAdmin**
1. Abrir pgAdmin
2. Conectar ao servidor de banco de dados
3. Expandir: Servers → PostgreSQL → Databases → `seu_database`

### **Passo 2: Abrir Query Tool**
1. Clicar com botão direito em `seu_database`
2. Selecionar "Query Tool"

### **Passo 3: Executar Script**
1. Abrir arquivo: `database/populate_sidebar_menu.sql`
2. Copiar todo o conteúdo (Ctrl+A, Ctrl+C)
3. Colar no Query Tool (Ctrl+V)
4. Clicar em "Execute" (F5)

### **Passo 4: Verificar Resultado**
Após executar, verá duas queries de verificação:

```
tipo                    | quantidade
------------------------+------------
Total de itens raiz:    | 9
Total de subitens:      | 20
```

E a estrutura completa com todos os menus.

---

## 🚀 MÉTODO 2: Via DBeaver

### **Passo 1: Abrir DBeaver**
1. Conectar ao banco de dados
2. Expandir até o banco

### **Passo 2: Executar SQL**
1. Ir em: Tools → Execute Script
2. Selecionar arquivo: `database/populate_sidebar_menu.sql`
3. Clicar em "Start"

### **Passo 3: Verificar**
Verificar tabela `sidebar_menu_items`:
```sql
SELECT COUNT(*) FROM sidebar_menu_items;
-- Deve retornar 29 (9 pais + 20 filhos)
```

---

## 🚀 MÉTODO 3: Via psql (Terminal)

```bash
# Conectar ao banco
psql -U seu_usuario -d seu_database

# Executar script
\i database/populate_sidebar_menu.sql

# Verificar
SELECT COUNT(*) FROM sidebar_menu_items;
```

---

## ✅ VERIFICAÇÃO APÓS EXECUÇÃO

Execute estas queries para verificar:

### **1. Contar Itens**
```sql
SELECT 
    'Total de itens raiz:' as tipo,
    COUNT(*) as quantidade
FROM sidebar_menu_items 
WHERE parent_id IS NULL
UNION ALL
SELECT 
    'Total de subitens:' as tipo,
    COUNT(*) as quantidade
FROM sidebar_menu_items 
WHERE parent_id IS NOT NULL;
```

**Resultado Esperado:**
```
tipo                  | quantidade
----------------------+------------
Total de itens raiz:  | 9
Total de subitens:    | 20
```

### **2. Ver Estrutura Completa**
```sql
SELECT 
    id,
    name,
    icon_name,
    url,
    order_index,
    parent_id,
    (SELECT name FROM sidebar_menu_items WHERE id = smi.parent_id) as parent_name
FROM sidebar_menu_items smi
ORDER BY 
    COALESCE(parent_id, id), 
    COALESCE(parent_id, id), 
    order_index;
```

### **3. Verificar Itens por Menu Pai**
```sql
-- Painel do Sistema
SELECT * FROM sidebar_menu_items 
WHERE parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel do Sistema');

-- Deve retornar 4 filhos:
-- - Categorias
-- - Funcionalidades
-- - Sessões Ativas
-- - Logs do Sistema
```

---

## 🔍 ITENS CRIADOS

### **Menus Pai (9 itens):**
1. Painel do Sistema
2. Painel Administrativo
3. Amenidades
4. Proximidades
5. Imóveis
6. Clientes
7. Proprietários
8. Dashboards
9. Relatórios

### **Subitens (20 itens):**
- **Painel do Sistema (4):** Categorias, Funcionalidades, Sessões Ativas, Logs do Sistema
- **Painel Administrativo (5):** Hierarquia de Perfis, Gestão de Perfis, Configurar Permissões, Usuários, Tipos de Documentos
- **Amenidades (2):** Categorias, Amenidades
- **Proximidades (2):** Categorias, Proximidades
- **Imóveis (5):** Tipos, Finalidades, Status, Mudança de Status, Cadastro
- **Clientes (1):** Cadastro
- **Proprietários (1):** Cadastro
- **Dashboards (0):** Sem filhos
- **Relatórios (0):** Sem filhos

---

## ⚠️ TROUBLESHOOTING

### **Erro: "relation sidebar_menu_items does not exist"**
**Solução:** Execute primeiro os scripts de criação de tabelas:
```sql
\i database/create_sidebar_tables.sql
\i database/alter_sidebar_fks.sql
```

### **Erro: "duplicate key value"**
**Solução:** Limpe a tabela primeiro:
```sql
TRUNCATE sidebar_menu_items CASCADE;
```
Depois execute o script novamente.

### **Erro: "invalid input syntax for type jsonb"**
**Solução:** Verifique se o PostgreSQL está na versão 9.4+ (suporta JSONB)

---

## 📊 PRÓXIMOS PASSOS

Após popular o banco:

1. ✅ Verificar se dados foram inseridos corretamente
2. ✅ Testar API `/api/admin/sidebar/menu`
3. ✅ Iniciar FASE 2: Refatoração do AdminSidebar.tsx

---

## 📝 NOTAS

- O script NÃO apaga dados existentes (comentado)
- Para limpar e recriar, descomente a linha:
  ```sql
  -- TRUNCATE sidebar_menu_items CASCADE;
  ```
- Todos os menus criados têm `is_active = true`
- Permissões configuradas em `roles_required` (JSONB)

---

**Status:** ⏳ AGUARDANDO EXECUÇÃO MANUAL  
**Responsável:** Executar via pgAdmin/DBeaver/psql
