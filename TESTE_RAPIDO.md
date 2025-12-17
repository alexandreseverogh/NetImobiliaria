# 🚀 TESTE RÁPIDO - Execute Isto Primeiro!

## 📋 Onde Executar?

**No Console do Navegador** após fazer login em `http://localhost:3000/admin/login`

---

## 🎯 Como Abrir o Console?

1. Abra o site: `http://localhost:3000/admin/login`
2. Faça login com `admin/admin@123`
3. Pressione **F12** (ou botão direito → Inspecionar)
4. Clique na aba **"Console"**
5. Digite: `allow pasting` e pressione Enter
6. Cole o código abaixo:

---

## ✅ Código para Testar (Cole Isto):

```javascript
const token = localStorage.getItem('auth-token')
console.log('Token encontrado:', token ? 'SIM' : 'NÃO')

fetch('/api/admin/sidebar/menu', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ RESULTADO:', data)
    if (data.success) {
      console.log('✅ SUCESSO! Total de itens:', data.count)
    } else {
      console.log('❌ ERRO:', data.message)
    }
  })
  .catch(err => console.error('❌ Erro:', err))
```

---

## 📸 O Que Deve Aparecer?

### ✅ **Se Funcionar:**
```
Token encontrado: SIM
✅ RESULTADO: {success: true, menuItems: [...], count: 29}
✅ SUCESSO! Total de itens: 29
```

### ❌ **Se Não Funcionar:**
```
Token encontrado: SIM
✅ RESULTADO: {success: false, message: "..."}
❌ ERRO: ...
```

---

## 📝 Informe o Resultado

Copie e cole aqui a mensagem que apareceu no console.
