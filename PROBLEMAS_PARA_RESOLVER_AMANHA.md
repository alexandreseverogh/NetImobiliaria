# 🔧 PROBLEMAS IDENTIFICADOS PARA RESOLVER AMANHÃ

## ❌ **PRIORIDADE ALTA - DASHBOARDS:**

### **1. Erro 500 em 7 APIs de Imóveis:**
Todas as APIs de dashboards de imóveis retornam erro 500:
- `/api/admin/dashboards/imoveis-por-tipo`
- `/api/admin/dashboards/imoveis-por-finalidade`
- `/api/admin/dashboards/imoveis-por-status`
- `/api/admin/dashboards/imoveis-por-estado`
- `/api/admin/dashboards/imoveis-por-faixa-preco`
- `/api/admin/dashboards/imoveis-por-quartos`
- `/api/admin/dashboards/imoveis-por-area`

**Diagnóstico necessário:**
- Verificar logs do servidor (terminal onde roda `npm run dev`)
- Verificar se os nomes das tabelas/colunas estão corretos
- Testar queries SQL diretamente no pgAdmin4

---

### **2. API Finalidades - 404 (Não Existe):**
```
Failed to load resource: /api/admin/finalidades-imoveis (404)
```

**Solução:** Criar a API faltante ou corrigir o endpoint no frontend.

---

### **3. API Estados - 500:**
```
Failed to load resource: /api/estados (500)
```

**Solução:** Verificar erro no código de `src/app/api/estados/route.ts`

---

## ❌ **PRIORIDADE ALTA - SIDEBAR:**

### **4. Erro 401 - Unauthorized:**
```
Failed to load resource: /api/admin/sidebar/menu (401 Unauthorized)
```

**Causa provável:**
- API não está configurada em `route_permissions_config`
- OU está usando middleware sem bypass para funcionalidade pública

**Solução:** Adicionar rota à configuração ou remover autenticação se for pública.

---

### **5. Erro ao Excluir Item Filho:**
Usuário reportou erro ao tentar excluir um item filho na página `/admin/configuracoes/sidebar`.

**Diagnóstico necessário:**
- Verificar console (mensagem de erro específica)
- Verificar API de exclusão
- Verificar constraints de foreign key no banco

---

## ⚠️ **PRIORIDADE MÉDIA - AUDITORIA:**

### **6. Campos Inconsistentes em sidebar_menu_items:**
```
roles_required e permissions_required estão "esquisitos"
```

**Ação necessária:**
1. Executar query no pgAdmin4:
```sql
SELECT 
    id, 
    name, 
    roles_required, 
    permissions_required,
    pg_typeof(roles_required) as tipo_roles,
    pg_typeof(permissions_required) as tipo_permissions
FROM sidebar_menu_items
ORDER BY id;
```

2. Identificar padrões inconsistentes
3. Limpar/normalizar dados
4. Considerar deprecar esses campos (já temos `sidebar_item_roles` e `feature_id`)

---

## 📋 **CHECKLIST PARA AMANHÃ:**

### **Fase 1: Diagnóstico**
- [ ] Ver logs do servidor (erros 500 das APIs)
- [ ] Testar queries SQL diretamente no pgAdmin4
- [ ] Auditar tabela `sidebar_menu_items`
- [ ] Verificar erro específico ao excluir item filho

### **Fase 2: Correções**
- [ ] Corrigir 7 APIs de dashboards (erro 500)
- [ ] Criar API `/api/admin/finalidades-imoveis` ou corrigir endpoint
- [ ] Corrigir API `/api/estados`
- [ ] Corrigir API `/api/admin/sidebar/menu` (401)
- [ ] Corrigir exclusão de item filho

### **Fase 3: Auditoria e Limpeza**
- [ ] Limpar campos `roles_required` e `permissions_required`
- [ ] Validar migração para `sidebar_item_roles`
- [ ] Documentar padrão correto

### **Fase 4: Testes**
- [ ] Testar página `/admin/dashboards` completa
- [ ] Testar filtros
- [ ] Validar 9 gráficos
- [ ] Testar Material UI Icons
- [ ] Validação final com 3 usuários

---

## 🎯 **PROGRESSO HOJE:**

### ✅ **Concluído:**
- Correção de 17 slugs
- Melhoria da função `normalize_to_slug()`
- Integração Material UI Icons (otimizada)
- Página de Dashboards (estrutura completa)
- 9 APIs criadas
- Migration 025 executada
- Correções em permissions e system-features

### ⏳ **Pendente:**
- Resolver erros 500/404/401 das APIs
- Completar testes de Dashboards
- Auditoria da sidebar
- Testes finais

---

## 📊 **TOKENS:**
- Usados: ~182k (18%)
- Disponíveis: ~818k (82%)
- **Sem problemas para trabalhar o dia inteiro amanhã!** ✅

---

**Até amanhã! Descanse bem! 🌙**



