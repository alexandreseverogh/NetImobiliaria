# 🚀 FASE 2 - INÍCIO: REFATORAÇÃO DO AdminSidebar.tsx

**Data:** 26/10/2025  
**Status:** 🟡 EM ANDAMENTO  
**Objetivo:** Substituir hardcoding por dados dinâmicos do banco  

---

## 🎯 OBJETIVO

Refatorar `AdminSidebar.tsx` para:
1. ✅ Usar dados do banco via hook `useSidebarMenu`
2. ✅ Renderizar ícones dinamicamente com `DynamicIcon`
3. ✅ Aplicar permissões via `PermissionGuard`
4. ✅ Manter compatibilidade total com a versão atual

---

## 📊 ANÁLISE DO CÓDIGO ATUAL

### **Estrutura Atual:**
- **Total de linhas:** 566
- **Função principal:** `getMenuStructure()` retorna array hardcoded
- **Ícones:** Importados estáticos do Heroicons
- **Permissões:** Verificadas via `user.role_name` e `user.permissoes`
- **Renderização:** Função `renderMenuItem()` recursiva

### **Menu Atual:**
- 9 itens principais (pais)
- ~20 subitens (filhos)
- Estrutura hierárquica de 2 níveis

---

## 🔄 PLANO DE REFATORAÇÃO

### **Passo 1: Backup**
- ✅ Commit atual salvo
- ✅ Hash: `6439d6a`

### **Passo 2: Substituir fonte de dados**
- Remover função `getMenuStructure()`
- Adicionar hook `useSidebarMenu()`
- Mapear dados do banco para interface `MenuItem`

### **Passo 3: Ícones dinâmicos**
- Remover imports estáticos do Heroicons
- Usar componente `DynamicIcon` com prop `iconName`

### **Passo 4: Permissões**
- Manter `PermissionGuard` para filhos
- Verificar permissões via `item.permission_required`

### **Passo 5: Renderização hierárquica**
- Manter função `renderMenuItem()` recursiva
- Adaptar para usar `children` do banco
- Manter `expandedMenus` state

### **Passo 6: Testes**
- Verificar renderização correta
- Testar expansão/colapso de menus
- Validar permissões
- Testar mobile e desktop

---

## 📝 ARQUIVOS A MODIFICAR

1. `src/components/admin/AdminSidebar.tsx` - Refatoração principal

---

## 🔍 MUDANÇAS ESPERADAS

### **Antes:**
```typescript
const getMenuStructure = (): MenuItem[] => {
  return [
    {
      name: 'Painel do Sistema',
      icon: WrenchScrewdriverIcon,  // ❌ Import estático
      resource: 'system-panel',
      children: [...]
    }
  ]
}
```

### **Depois:**
```typescript
const { menuItems, loading, error } = useSidebarMenu()

// Renderizar dinamicamente
{menuItems.map(item => (
  <DynamicIcon name={item.icon_name} />  // ✅ Ícone dinâmico
))}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Menu carrega do banco
- [ ] Ícones renderizam corretamente
- [ ] Estrutura hierárquica preservada
- [ ] Permissões funcionam
- [ ] Mobile funciona
- [ ] Desktop funciona
- [ ] Expansão/colapso funciona
- [ ] Estado `expandedMenus` funciona
- [ ] Sem regressões visuais

---

## 🚨 ROLLBACK

Se necessário, reverter com:
```bash
git reset --hard 6439d6a
```

---

**Iniciando refatoração agora...** 🚀
