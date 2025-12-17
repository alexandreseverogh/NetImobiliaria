# 🧪 TESTE: Console do Paulo Logado

**Execute estes comandos no console do navegador (F12) com Paulo logado:**

---

## **Comando 1: Verificar Token e Permissões**

```javascript
// 1. Verificar token
const token = localStorage.getItem('auth-token')
console.log('✅ Token existe?', token !== null)

// 2. Decodificar e verificar permissões
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('✅ Username:', payload.username)'
  console.log('✅ Role:', payload.role)'
  console.log('✅ TODAS as Permissões:', payload.permissoes)
  console.log('✅ Permissão em usuarios:', payload.permissoes?.usuarios)
  console.log('✅ Permissão em funcionalidades-do-sistema:', payload.permissoes?.['funcionalidades-do-sistema'])
}
```

---

## **Comando 2: Verificar API de Sidebar**

```javascript
// Buscar menu da sidebar
const token = localStorage.getItem('auth-token')
fetch('/api/admin/sidebar/menu', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Menu completo retornado:', data)
  console.log('✅ Total de itens:', data.menuItems?.length)
  
  // Procurar item "Usuários"
  const usuarios = data.menuItems?.find(m => 
    m.url === '/admin/usuarios' || 
    m.name?.toLowerCase().includes('usuário')
  )
  console.log('✅ Item Usuários encontrado?:', usuarios !== undefined)
  console.log('✅ Dados do item:', usuarios)
  
  // Listar TODOS os menus visíveis
  console.log('✅ TODOS os menus visíveis:')
  data.menuItems?.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.name} - ${item.url} - has_permission: ${item.has_permission}`)
  })
})
.catch(err => console.error('❌ Erro:', err))
```

---

## **Comando 3: Verificar Estado do React**

```javascript
// Verificar se o componente de sidebar está renderizando
const sidebarElement = document.querySelector('[class*="sidebar"]') || document.querySelector('nav')
console.log('✅ Sidebar encontrada no DOM?', sidebarElement !== null)
console.log('✅ HTML da sidebar:', sidebarElement?.innerHTML?.substring(0, 500))
```

---

## 📋 O QUE ME ENVIAR

Depois de executar os 3 comandos acima, me envie:

1. ✅ Resultado de **"Permissão em usuarios:"** (deve ser 'DELETE' ou 'ADMIN')
2. ✅ Resultado de **"Item Usuários encontrado?:"** (deve ser TRUE)
3. ✅ Resultado de **"Dados do item:"** (objeto completo)
4. ✅ Lista de **"TODOS os menus visíveis"** (quantos aparecem?)

---

**Execute e me envie os resultados!** 🔍

