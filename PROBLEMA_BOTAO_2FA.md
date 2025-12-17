# 🐛 PROBLEMA: Botão de Toggle 2FA Não Aparece

**Data:** 27/10/2025  
**Status:** Diagnosticando

---

## 📋 ANÁLISE DO PROBLEMA

### **Situação Atual**
- A interface mostra todos os usuários com status "Não obrigatório" (badge cinza)
- O botão "Ativar"/"Desativar" **não está aparecendo** na coluna 2FA
- A coluna "AÇÕES" está **vazia** (não mostra botões Editar/Excluir)

### **Implementação Correta**
O código está correto. Os botões estão implementados nas linhas 498-513 de `src/app/admin/usuarios/page.tsx`:

```typescript
<PermissionGuard resource="usuarios" action="WRITE">
  <button
    onClick={() => handleToggle2FA(user.id, user.two_factor_enabled || false, user.nome)}
    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
      user.two_factor_enabled
        ? 'text-green-700 bg-green-50 hover:bg-green-100'
        : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
    }`}
    title={user.two_factor_enabled ? 'Desabilitar 2FA' : 'Habilitar 2FA'}
  >
    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
    {user.two_factor_enabled ? 'Desativar' : 'Ativar'}
  </button>
</PermissionGuard>
```

---

## 🔍 POSSÍVEIS CAUSAS

### **1. Problema de Permissões**
Se o `PermissionGuard` retorna `null` porque o usuário logado não tem permissão `WRITE` em `usuarios`, o botão não renderiza.

**Teste:**
- Verificar permissões do usuário logado (admin)
- Verificar console do navegador para erros de permissão

### **2. Problema de Renderização**
Se o React não está re-renderizando após carregar os dados.

**Teste:**
- Verificar se `filteredUsers` está populado
- Verificar se `user.two_factor_enabled` está sendo mapeado corretamente

### **3. Problema de Cache do Navegador**
O navegador pode estar servindo uma versão antiga do código JavaScript.

**Teste:**
- Fazer hard refresh (`Ctrl+Shift+R` ou `Cmd+Shift+R`)
- Limpar cache do navegador
- Verificar se `npm run dev` foi reiniciado após as mudanças

### **4. Problema de Compilação**
Erros de TypeScript ou compilação podem impedir a renderização.

**Teste:**
- Verificar console do navegador para erros de JavaScript
- Verificar se há erros de compilação no terminal onde `npm run dev` está rodando

---

## 🧪 TESTES PARA DIAGNÓSTICO

### **Teste 1: Verificar Permissões no Console**
1. Abra `http://localhost:3000/admin/usuarios`
2. Abra o Console do navegador (F12)
3. Execute o seguinte código:

```javascript
// Verificar se há erros de permissão
const permissions = JSON.parse(localStorage.getItem('user-data'))?.permissoes
console.log('Permissões do usuário logado:', permissions)
console.log('Permissão WRITE em usuarios:', permissions?.usuarios)
```

**Resultado esperado:**
```javascript
Permissões do usuário logado: { usuarios: { WRITE: true, READ: true, DELETE: true } }
Permissão WRITE em usuarios: { WRITE: true, READ: true, DELETE: true }
```

### **Teste 2: Verificar Dados dos Usuários**
Execute no console:

```javascript
// Verificar se os dados estão sendo carregados
fetch('/api/admin/usuarios', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
})
  .then(res => res.json())
  .then(data => {
    console.log('Dados retornados pela API:', data)
    console.log('Primeiro usuário:', data.users?.[0])
    console.log('two_factor_enabled do primeiro usuário:', data.users?.[0]?.two_factor_enabled)
  })
```

**Resultado esperado:**
- A API deve retornar `users` array com usuários
- Cada usuário deve ter o campo `two_factor_enabled` (boolean)

### **Teste 3: Verificar Renderização do Botão**
1. No console do navegador, execute:

```javascript
// Verificar se o botão está sendo renderizado
const buttons = document.querySelectorAll('button')
console.log('Total de botões na página:', buttons.length)
console.log('Botões com texto "Ativar" ou "Desativar":', [...buttons].filter(b => b.textContent.includes('Ativar') || b.textContent.includes('Desativar')))
```

### **Teste 4: Verificar DevTools (React)**
1. Instalar extensão React DevTools no navegador
2. Abrir `http://localhost:3000/admin/usuarios`
3. No React DevTools, verificar se `AdminSidebar` ou `UsuariosPage` está renderizando
4. Verificar se `PermissionGuard` está retornando `null` para alguns componentes

---

## 🔧 SOLUÇÕES PROPOSTAS

### **Solução 1: Verificar Permissões do Admin**
```sql
-- Verificar se o admin tem permissão WRITE em usuarios
SELECT 
    u.username,
    u.id,
    ur.name as role_name,
    p.action,
    sf.name as feature_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' AND sf.name = 'Usuários' AND p.action = 'write';
```

### **Solução 2: Adicionar Log Debug**
Adicionar console.log temporariamente em `src/app/admin/usuarios/page.tsx`:

```typescript
useEffect(() => {
  console.log('🔍 DEBUG - Usuários carregados:', users)
  console.log('🔍 DEBUG - Primeiro usuário:', users[0])
  console.log('🔍 DEBUG - two_factor_enabled:', users[0]?.two_factor_enabled)
}, [users])
```

### **Solução 3: Forçar Renderização**
Adicionar um botão de teste SEM `PermissionGuard` para verificar se o problema é de permissão:

```typescript
{/* Teste - botão sem PermissionGuard */}
<button
  onClick={() => handleToggle2FA(user.id, user.two_factor_enabled || false, user.nome)}
  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium"
>
  TESTE 2FA
</button>
```

---

## ✅ PRÓXIMOS PASSOS

1. **Atualizar a página** (`F5` ou `Ctrl+R`)
2. **Fazer hard refresh** (`Ctrl+Shift+R`)
3. **Verificar console** do navegador para erros
4. **Executar Teste 1** (verificar permissões)
5. **Executar Teste 2** (verificar dados da API)
6. **Reportar resultados**

---

## 📝 NOTAS

- O código está correto e compilando sem erros de TypeScript
- A API foi implementada corretamente
- O problema é provavelmente de **permissões** ou **cache do navegador**
- Se o problema persistir, será necessário adicionar logs de debug mais detalhados

