# 📊 ANÁLISE DE RISCO: Opção 2 - Melhorar Trigger de Slugs

**Data:** 30/10/2025  
**Objetivo:** Remover artigos automaticamente dos slugs  
**Impacto:** **MÉDIO** com mitigações adequadas

---

## 🚨 RISCOS IDENTIFICADOS

### **RISCO 1: Quebra de Referências no Código Frontend** ⚠️ MÉDIO

**Problema:**
Componentes podem usar slugs antigos hardcoded:
```typescript
// Se existe no código:
<PermissionGuard resource="tipos-de-documentos" action="READ">
// E mudamos para: tipos-documentos
// Componente para de funcionar ❌
```

**Impacto:**
- Páginas podem ficar em branco
- Botões podem desaparecer
- Guards podem bloquear conteúdo

**Probabilidade:** 🟡 BAIXA (só encontrei em backups)

**Verificação:**
```bash
grep "tipos-de-|finalidades-de-|status-de-|categorias-de-" src/
# Resultado: 2 ocorrências apenas em backups ✅
```

---

### **RISCO 2: Quebra de Sidebar** ⚠️ ALTO

**Problema:**
`sidebar_menu_items` tem `feature_id` (FK para `system_features`):
```sql
SELECT smi.name, sf.slug 
FROM sidebar_menu_items smi
JOIN system_features sf ON smi.feature_id = sf.id
-- Se slug muda, JOIN continua funcionando ✅
-- MAS se código usa slug antigo, não encontra ❌
```

**Impacto:**
- Menus podem desaparecer
- Navegação quebra

**Probabilidade:** 🟢 ZERO (usa `feature_id`, não slug)

**Mitigação:** Nenhuma necessária (seguro)

---

### **RISCO 3: Quebra de Permissões** 🔴 CRÍTICO

**Problema:**
`permissions` tem `feature_id`:
```sql
SELECT p.id, p.action, sf.slug
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
-- Se slug muda, permissões continuam vinculadas ✅
```

**Impacto:**
- **NENHUM** - Vínculo é por `feature_id`, não slug

**Probabilidade:** 🟢 ZERO (FK segura)

---

### **RISCO 4: Quebra de Rotas** ⚠️ MÉDIO

**Problema:**
`route_permissions_config` tem `feature_id`:
```sql
SELECT rpc.route_pattern, sf.slug
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
-- Se slug muda, rotas continuam funcionando ✅
```

**Impacto:**
- **NENHUM** - Middleware busca por `feature_id`

**Probabilidade:** 🟢 ZERO (FK segura)

---

### **RISCO 5: Quebra de Token JWT** 🔴 CRÍTICO

**Problema:**
Tokens antigos têm permissões com slugs antigos:
```javascript
// Token antigo
permissoes: {
  'tipos-de-documentos': 'ADMIN'  // Slug antigo
}

// Código busca
permissoes?.['tipos-documentos']  // Slug novo
// Resultado: undefined ❌
```

**Impacto:**
- Usuários logados perdem acesso
- Páginas ficam em branco
- Guards bloqueiam tudo

**Probabilidade:** 🔴 ALTA (100% se tokens não forem renovados)

**Mitigação:** ✅ Forçar logout de todos os usuários

---

### **RISCO 6: Hardcoding não Detectado** ⚠️ BAIXO

**Problema:**
Pode haver slugs hardcoded que não encontramos:
```typescript
// Escondido em algum lugar
if (feature === 'tipos-de-documentos') { ... }
```

**Impacto:**
- Lógicas específicas param de funcionar
- Difícil de diagnosticar

**Probabilidade:** 🟡 BAIXA (pesquisa não encontrou)

**Mitigação:** ✅ Teste exaustivo pós-migração

---

## 📋 CHECKLIST DE DEPENDÊNCIAS

### **Tabelas que usam `feature_id` (Seguras ✅)**
- ✅ `permissions` - FK para `system_features.id`
- ✅ `route_permissions_config` - FK para `system_features.id`
- ✅ `sidebar_menu_items` - FK para `system_features.id`
- ✅ `role_permissions` - FK para `permissions.id` → `feature_id`

**Conclusão:** Todas as FKs apontam para **ID**, não slug! ✅

### **Código que usa `slug` (Precisa verificar ⚠️)**
- ⚠️ Frontend: `PermissionGuard resource="..."`
- ⚠️ Backend: `checkUserPermission(userId, 'slug', action)`
- ⚠️ Token JWT: `permissoes: { 'slug': 'LEVEL' }`

---

## 🛡️ MEDIDAS DE PROTEÇÃO

### **PROTEÇÃO 1: Backup Completo** 🔴 OBRIGATÓRIO
```sql
-- Backup da tabela antes de alterar
CREATE TABLE system_features_backup_20251030 AS 
SELECT * FROM system_features;
```

### **PROTEÇÃO 2: Script de Rollback** 🔴 OBRIGATÓRIO
```sql
-- Reverter mudanças se necessário
UPDATE system_features sf
SET slug = sfb.slug
FROM system_features_backup_20251030 sfb
WHERE sf.id = sfb.id;
```

### **PROTEÇÃO 3: Invalidar Todos os Tokens** 🔴 OBRIGATÓRIO
```sql
-- Forçar logout de todos
UPDATE user_sessions SET expires_at = NOW();
DELETE FROM user_sessions;
```

### **PROTEÇÃO 4: Migração Gradual** 🟡 RECOMENDADO
```sql
-- Primeiro: Testar em 1 slug
UPDATE system_features SET slug = 'tipos-documentos' WHERE id = 11;
-- Testar tudo!
-- Depois: Aplicar em todos
```

### **PROTEÇÃO 5: Scan de Código** 🟡 RECOMENDADO
```bash
# Procurar slugs antigos hardcoded
grep -r "tipos-de-documentos" src/
grep -r "finalidades-de-imoveis" src/
# ... todos os 17 slugs
```

### **PROTEÇÃO 6: Testes Automatizados** 🟢 OPCIONAL
```sql
-- Testar que cada slug tem permissões
SELECT sf.slug, COUNT(p.id) as qtd_permissions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.slug
HAVING COUNT(p.id) = 0;
-- Resultado esperado: 0 linhas
```

---

## 📊 PLANO DE EXECUÇÃO SEGURO

### **FASE 1: PREPARAÇÃO** (5 min)
1. ✅ Criar backup completo de `system_features`
2. ✅ Scan de código procurando slugs antigos
3. ✅ Listar TODOS os slugs que serão alterados

### **FASE 2: TESTE PILOTO** (10 min)
1. ✅ Alterar **apenas 1 slug** (tipos-de-documentos)
2. ✅ Invalidar tokens (forçar re-login)
3. ✅ Testar página `/admin/tipos-documentos`
4. ✅ Verificar sidebar
5. ✅ Verificar permissões
6. ⚠️ **SE FALHAR:** Rollback imediato

### **FASE 3: MIGRAÇÃO COMPLETA** (15 min)
1. ✅ Melhorar função `normalize_to_slug()`
2. ✅ Re-gerar TODOS os slugs
3. ✅ Invalidar TODOS os tokens
4. ✅ Criar script de rollback

### **FASE 4: VALIDAÇÃO** (20 min)
1. ✅ Testar com 3 usuários (admin, Nunes, Paulo)
2. ✅ Verificar TODAS as 30 funcionalidades
3. ✅ Verificar sidebar completa
4. ✅ Verificar guards em páginas
5. ✅ Verificar APIs

---

## ⚖️ ANÁLISE RISCO vs BENEFÍCIO

### **RISCOS (Médios, controláveis)**
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Código hardcoded | 🟡 Baixa (2 em backups) | 🟡 Médio | Scan + testes ✅ |
| Tokens antigos | 🔴 Alta (100%) | 🔴 Crítico | Invalidar todos ✅ |
| FK quebradas | 🟢 Zero (usa ID) | 🟢 Nenhum | N/A ✅ |
| Hardcoding não detectado | 🟡 Baixa | 🟠 Alto | Teste exaustivo ✅ |

### **BENEFÍCIOS (Altos, permanentes)**
- ✅ **Padronização automática** - Futuras funcionalidades corretas
- ✅ **Zero manutenção** - Trigger faz tudo
- ✅ **Elimina inconsistências** - Código e banco alinhados
- ✅ **Alinhado com GUARDIAN_RULES** - Zero hardcoding [[memory:7738614]]

---

## 🎯 ALTERNATIVA CONSERVADORA (Risco ZERO)

**Opção 1B: Corrigir Apenas Slugs Problemáticos (Manual)**

```sql
-- Corrigir apenas os 17 slugs inconsistentes
UPDATE system_features SET slug = 'tipos-documentos' WHERE slug = 'tipos-de-documentos';
UPDATE system_features SET slug = 'finalidades-imoveis' WHERE slug = 'finalidades-de-imoveis';
-- ... (lista completa dos 17)

-- NÃO mexer no trigger
-- Próximas funcionalidades continuam com artigos
```

✅ **Vantagem:** Risco **ZERO** de quebra  
❌ **Desvantagem:** Problema persiste para futuras funcionalidades

---

## 💡 MINHA RECOMENDAÇÃO FINAL

### **Plano Híbrido (Melhor dos 2 mundos):**

**AGORA:**
1. Corrigir manualmente os 17 slugs problemáticos (Opção 1B)
2. Invalidar tokens (forçar re-login)
3. Testar tudo funciona ✅

**DEPOIS (quando estiver 100% testado):**
4. Melhorar trigger para futuras funcionalidades (Opção 2)
5. Não re-gerar slugs existentes
6. Manter padronização manual

**Risco:** 🟢 **ZERO** (só corrige conhecidos, não mexe em desconhecidos)  
**Benefício:** 🟡 **MÉDIO** (resolve problema atual, futuro protegido)

---

## 🤔 DECISÃO

**Qual você prefere?**

1. **Opção 2 COMPLETA** (arriscada, mas definitiva)
   - Melhora trigger + re-gera tudo
   - Risco médio, teste exaustivo obrigatório
   
2. **Plano Híbrido** (conservadora, segura)
   - Corrige 17 manualmente + melhora trigger
   - Risco ZERO, implementação imediata

3. **Opção 1B** (mínima, temporária)
   - Só corrige 17 manualmente
   - Risco ZERO, problema persiste no futuro

**Aguardo sua decisão!** 🎯


