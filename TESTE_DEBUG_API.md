# 🔍 DEBUG: Problema de Autenticação na API da Sidebar

## 📋 Situação Atual

A API `/api/admin/sidebar/menu` está retornando `401 Unauthorized` mesmo com o usuário logado.

---

## 🎯 DIAGNÓSTICO

Por favor, execute os seguintes passos **NA ORDEM** e informe os resultados:

### **Passo 1: Verificar Cookies após Login**

Após fazer login em `http://localhost:3000/admin/login`, abra o **Console do Navegador** (F12) e execute:

```javascript
console.log('Cookies:', document.cookie)
```

**Me informe o que aparece.**

---

### **Passo 2: Verificar Token no localStorage**

No console, execute:

```javascript
console.log('Token no localStorage:', localStorage.getItem('auth-token'))
```

**Me informe o que aparece.**

---

### **Passo 3: Verificar Headers da Requisição**

No console, execute:

```javascript
fetch('/api/admin/sidebar/menu', { 
  credentials: 'include' 
})
  .then(res => {
    console.log('Status:', res.status)
    console.log('Headers:', [...res.headers.entries()])
    return res.json()
  })
  .then(data => console.log('Resposta:', data))
  .catch(err => console.error('Erro:', err))
```

**Me informe o que aparece.**

---

### **Passo 4: Testar com Token Manualmente**

Execute no console:

```javascript
const token = localStorage.getItem('auth-token')
console.log('Token:', token)

fetch('/api/admin/sidebar/menu', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Com Authorization header:', data))
  .catch(err => console.error('Erro:', err))
```

**Me informe o que aparece.**

---

## 🎯 ANÁLISE PRELIMINAR

Baseado no código encontrado, **o problema é que o login não está definindo cookies**, apenas salvando o token no `localStorage`.

A API `/api/admin/sidebar/menu` está procurando o token em:
1. **Cookies** (campo `accessToken`)
2. **Header Authorization** (se o cookie não existir)

Como o login não define cookies, e a API não está usando o `localStorage` do browser, o token não está sendo enviado.

---

## 🔧 POSSÍVEIS SOLUÇÕES

### **Opção 1: Modificar o Login para Definir Cookies**
Modificar a rota `/api/admin/auth/login` para definir cookies `accessToken` e `refreshToken`.

### **Opção 2: Modificar a API para Aceitar Token do localStorage**
Modificar a API `/api/admin/sidebar/menu` para aceitar token via `localStorage` ou header `Authorization` manual.

### **Opção 3: Usar Middleware de Autenticação**
Criar um middleware que lê o token do `localStorage` e adiciona ao header `Authorization` automaticamente.

---

## 📝 AGUARDO SEU FEEDBACK

Por favor, execute os 4 passos acima e me informe os resultados para que eu possa implementar a correção adequada.
