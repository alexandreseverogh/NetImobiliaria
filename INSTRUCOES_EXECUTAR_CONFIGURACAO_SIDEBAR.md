# 📝 INSTRUÇÕES: EXECUTAR CONFIGURAÇÃO DA SIDEBAR

**Data:** 27/10/2025  
**Status:** ⏳ **AGUARDANDO EXECUÇÃO**

---

## 🎯 OBJETIVO

Seguir o fluxo correto para adicionar a funcionalidade "Configuração da Sidebar" ao sistema:

1. **Criar funcionalidade em `system_features`**
2. **Criar permissões necessárias**
3. **Adicionar à `sidebar_menu_items`**

---

## 📋 PRÉ-REQUISITOS

1. ✅ Tabela `system_features` existe
2. ✅ Tabela `system_categorias` existe
3. ✅ Tabela `sidebar_menu_items` existe e foi populada
4. ✅ Tabela `permissions` existe
5. ✅ Usuário admin existe (username = 'admin' ou email = 'admin@123')

---

## 🚀 PASSO 1: EXECUTAR SCRIPT SQL

### **Via pgAdmin (RECOMENDADO)**

1. Abrir pgAdmin
2. Conectar ao servidor de banco de dados
3. Expandir: Servers → PostgreSQL → Databases → `seu_database`
4. Clicar com botão direito em `seu_database`
5. Selecionar "Query Tool"
6. Abrir arquivo: `database/create_sidebar_configuration_feature.sql`
7. Copiar todo o conteúdo (Ctrl+A, Ctrl+C)
8. Colar no Query Tool (Ctrl+V)
9. Clicar em "Execute" (F5)

### **Via DBeaver**

1. Abrir DBeaver
2. Conectar ao banco de dados
3. Ir em: Tools → Execute Script
4. Selecionar arquivo: `database/create_sidebar_configuration_feature.sql`
5. Clicar em "Start"

### **Via psql (Terminal)**

```bash
# Conectar ao banco
psql -U seu_usuario -d seu_database

# Executar script
\i database/create_sidebar_configuration_feature.sql
```

---

## ✅ VERIFICAÇÃO APÓS EXECUÇÃO

O script executa automaticamente as seguintes verificações:

### **1. Funcionalidade Criada**

Você verá algo como:

```
feature_id |        feature_name         |              url               | is_active | category_name | permissions_count
-----------+-----------------------------+----------------------------------+-----------+---------------+------------------
  123      | Configuração da Sidebar     | /admin/configuracoes/sidebar     | t         | Sistema       | 1
```

### **2. Item Adicionado à Sidebar**

Você verá:

```
 id  |         name          | icon_name |              url               | order_index | is_active |    parent_name    |  feature_name
-----+-----------------------+-----------+----------------------------------+-------------+-----------+-------------------+----------------
 123 | Configuração da Sidebar | cog    | /admin/configuracoes/sidebar     |       5     | t         | Painel do Sistema | Configuração da Sidebar
```

### **3. Permissões Atribuídas**

Você verá:

```
   role_name    |        feature_name         | action |          granted_at
----------------+-----------------------------+--------+-------------------------------
 Administrador  | Configuração da Sidebar     | ADMIN  | 2025-10-27 14:30:00
 Super Admin    | Configuração da Sidebar     | ADMIN  | 2025-10-27 14:30:00
```

---

## 🔍 O QUE O SCRIPT FAZ

### **1. Criar/Buscar Categoria**
- Busca categoria "Sistema" existente
- Se não existe, cria uma nova categoria padrão

### **2. Criar Funcionalidade**
- Insere em `system_features`:
  - **Nome:** "Configuração da Sidebar"
  - **URL:** "/admin/configuracoes/sidebar"
  - **Descrição:** "Interface para gerenciar dinamicamente a estrutura da sidebar administrativa"
  - **Categoria:** Sistema
  - **Criado por:** Usuário admin

### **3. Criar Permissão**
- Insere em `permissions`:
  - **Action:** "ADMIN"
  - **Feature ID:** ID da funcionalidade criada
  - **Descrição:** "Acesso administrativo a Configuração da Sidebar"

### **4. Adicionar à Sidebar**
- Insere em `sidebar_menu_items`:
  - **Parent:** "Painel do Sistema"
  - **Nome:** "Configuração da Sidebar"
  - **Ícone:** "cog"
  - **URL:** "/admin/configuracoes/sidebar"
  - **Roles:** ["Super Admin", "Administrador"]
  - **Order Index:** Próximo disponível (max + 1)

---

## ⚠️ TROUBLESHOOTING

### **Erro: "Menu Painel do Sistema não encontrado"**

**Causa:** A tabela `sidebar_menu_items` não foi populada ainda.

**Solução:**
1. Execute primeiro `database/populate_sidebar_menu.sql`
2. Depois execute `database/create_sidebar_configuration_feature.sql`

### **Erro: "Usuário admin não encontrado"**

**Causa:** Não existe usuário com username = 'admin' ou email = 'admin@123'

**Solução:**
1. Verificar se usuário admin existe: `SELECT * FROM users WHERE username = 'admin' OR email = 'admin@123'`
2. Se não existe, criar usuário admin primeiro
3. Depois executar o script novamente

### **Erro: "Funcionalidade já existe"**

**Causa:** A funcionalidade já foi criada anteriormente.

**Solução:**
- O script detecta isso automaticamente e não cria duplicatas
- Apenas continua com a adição à sidebar

---

## 📊 ESTRUTURA RESULTANTE

### **Painel do Sistema** (Menu Pai)
- Categorias
- Funcionalidades
- Sessões Ativas
- Logs do Sistema
- **Configuração da Sidebar** ← NOVO SUBITEM

### **Permissões Atribuídas**
- **Super Admin:** ADMIN ✅
- **Administrador:** ADMIN ✅
- **Corretor:** ❌
- **Usuário:** ❌

---

## 🎉 RESULTADO ESPERADO

Após executar o script:

1. ✅ Funcionalidade criada em `system_features`
2. ✅ Permissão "ADMIN" criada
3. ✅ Item adicionado à sidebar
4. ✅ Permissões atribuídas aos roles Super Admin e Administrador
5. ✅ Interface acessível em `/admin/configuracoes/sidebar`

---

## 🚀 PRÓXIMOS PASSOS

Após executar o script com sucesso:

1. Fazer login como Super Admin ou Administrador
2. Acessar o menu "Painel do Sistema" na sidebar
3. Verificar se aparece "Configuração da Sidebar"
4. Clicar e testar a interface de gerenciamento
5. Verificar se o preview da sidebar funciona corretamente

---

**Status:** ⏳ **AGUARDANDO EXECUÇÃO DO SCRIPT SQL**

