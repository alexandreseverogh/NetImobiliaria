# 🧪 TESTE: Página Tipos Documentos

**URL:** `http://localhost:3000/admin/tipos-documentos`  
**Problema:** Página não exibe nada  
**Dados:** Há 9 registros na tabela `tipo_documento_imovel`

---

## 🔍 DIAGNÓSTICO

Execute com **admin/admin@123** logado:

### **1. Abra o Console (F12)**

### **2. Recarregue a Página (Ctrl+Shift+R)**

### **3. Procure por estas mensagens:**

```javascript
🔄 FRONTEND: Buscando tipos de documentos...
🔄 FRONTEND: URL da requisição: /api/admin/tipos-documentos?page=1&limit=10
🔄 FRONTEND: Resposta da API: [status] [statusText]
```

**Possíveis resultados:**

#### **Se for 403 Forbidden:**
```
❌ Problema de permissão
```

#### **Se for 500 Internal Server Error:**
```
❌ Erro na API backend
```

#### **Se for 200 OK:**
```javascript
✅ FRONTEND: Dados recebidos: {...}
✅ FRONTEND: Tipos de documentos carregados: [número]
```

---

## 📤 **ME ENVIE:**

1. **Status da resposta:** (200, 403, 500?)
2. **Mensagens do console** (prints ou copiar/colar)
3. **Mensagens de erro** (se houver em vermelho)

---

## 🔧 **VERIFICAÇÕES ADICIONAIS**

### No console, execute:

```javascript
// Verificar permissões do admin
const token = localStorage.getItem('auth-token')
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('Permissão em tipos-documentos:', payload.permissoes?.['tipos-documentos'])
}

// Testar API diretamente
fetch('/api/admin/tipos-documentos?page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Resposta da API:', data))
```

---

**Execute e me envie os resultados!** 🔍



