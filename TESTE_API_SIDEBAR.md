# 🧪 TESTE DA API DA SIDEBAR

**Data:** 26/10/2025  
**Status:** 🧪 PRONTO PARA TESTE

---

## 🎯 OBJETIVO

Testar se a API `/api/admin/sidebar/menu` está retornando corretamente os itens do menu populados no banco de dados.

---

## 📋 PRÉ-REQUISITOS

1. ✅ Banco populado com 29 itens (9 pais + 20 filhos)
2. ✅ Servidor Next.js rodando (`npm run dev`)
3. ✅ Usuário logado como admin

---

## 🚀 MÉTODO 1: Via Navegador (Mais Simples)

### **Passo 1: Fazer Login**
1. Acesse `http://localhost:3000/login`
2. Faça login com credenciais de admin:
   - Email: `admin@admin.com` ou `admin`
   - Senha: `admin@123`

### **Passo 2: Acessar a API**
1. No navegador, digite a URL:
   ```
   http://localhost:3000/api/admin/sidebar/menu
   ```

### **Passo 3: Verificar Resposta**
Você deve ver um JSON com estrutura similar a:

```json
{
  "success": true,
  "menuItems": [
    {
      "id": 1,
      "parent_id": null,
      "name": "Painel do Sistema",
      "icon_name": "wrench",
      "url": null,
      "order_index": 1,
      "has_permission": true
    },
    {
      "id": 2,
      "parent_id": 1,
      "name": "Categorias",
      "icon_name": "squares",
      "url": "/admin/categorias",
      "order_index": 1,
      "has_permission": true
    },
    ...
  ],
  "count": 29
}
```

**✅ Resultado Esperado:**
- `success: true`
- `count: 29`
- `menuItems` com 29 objetos
- Estrutura hierárquica preservada

---

## 🚀 MÉTODO 2: Via Console do Navegador

### **Passo 1: Abrir DevTools**
1. Acesse `http://localhost:3000/admin` (ou qualquer página admin)
2. Pressione `F12` para abrir o DevTools
3. Vá para a aba **Console**

### **Passo 2: Executar Fetch**
Cole este código no console:

```javascript
fetch('/api/admin/sidebar/menu', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Sucesso:', data);
    console.log('📊 Total de itens:', data.count);
    console.log('📋 Itens:', data.menuItems);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });
```

### **Passo 3: Verificar Resultado**
Você verá no console:
- ✅ Mensagem de sucesso
- 📊 Total de itens (deve ser 29)
- 📋 Lista completa de itens

---

## 🚀 MÉTODO 3: Via curl (Terminal/PowerShell)

### **Windows (PowerShell)**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/sidebar/menu" -Method GET -SessionVariable session
```

### **Linux/Mac (curl)**
```bash
curl -X GET http://localhost:3000/api/admin/sidebar/menu \
  -H "Cookie: accessToken=seu_token" \
  --include
```

---

## 🚀 MÉTODO 4: Via Postman/Insomnia

### **Passo 1: Criar Requisição**
1. Abra o Postman ou Insomnia
2. Método: `GET`
3. URL: `http://localhost:3000/api/admin/sidebar/menu`

### **Passo 2: Adicionar Cookie**
1. Vá em **Cookies** ou **Headers**
2. Adicione o cookie `accessToken` (pegue do navegador após login)

### **Passo 3: Enviar Requisição**
1. Clique em "Send"
2. Verifique a resposta JSON

---

## ✅ VERIFICAÇÕES

### **1. Resposta de Sucesso**
```json
{
  "success": true,
  "count": 29,
  "menuItems": [...]
}
```

### **2. Estrutura dos Itens**
Cada item deve ter:
- `id` (número)
- `parent_id` (número ou null)
- `name` (string)
- `icon_name` (string)
- `url` (string ou null)
- `order_index` (número)
- `has_permission` (boolean)

### **3. Hierarquia**
- Itens com `parent_id: null` são menus pai
- Itens com `parent_id: X` são filhos do menu de ID X

### **4. Permissões**
- `has_permission: true` para todos (usuário admin)

---

## 🐛 TROUBLESHOOTING

### **❌ Erro 401: Unauthorized**
**Problema:** Usuário não está logado  
**Solução:**
1. Faça login primeiro
2. Verifique se o cookie `accessToken` está presente
3. Recarregue a página

### **❌ Erro 500: Internal Server Error**
**Problema:** Erro no servidor  
**Solução:**
1. Verifique o console do servidor Next.js
2. Verifique se o banco está populado
3. Verifique se as tabelas existem

### **❌ Resposta vazia (`count: 0`)**
**Problema:** Banco não populado  
**Solução:**
1. Execute o script SQL novamente
2. Verifique se os dados foram inseridos

### **❌ Permissões negadas (`has_permission: false`)**
**Problema:** Usuário sem permissão  
**Solução:**
1. Verifique se o usuário é admin
2. Verifique a tabela `roles` no banco
3. Verifique a tabela `user_role_assignments`

---

## 📊 VALIDAÇÕES AVANÇADAS

Execute estas queries no banco para validar:

### **1. Verificar Itens Retornados**
```sql
SELECT * FROM sidebar_menu_items ORDER BY order_index;
```

### **2. Verificar Função**
```sql
SELECT * FROM get_sidebar_menu_for_user('ID_DO_USUARIO');
```

### **3. Verificar Permissões**
```sql
SELECT * FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'Super Admin');
```

---

## 🎯 PRÓXIMOS PASSOS

Após validar que a API está funcionando:

1. ✅ Iniciar refatoração do `AdminSidebar.tsx`
2. ✅ Substituir hardcoding por dados da API
3. ✅ Testar renderização da sidebar dinâmica
4. ✅ Validar permissões por perfil

---

**Status:** 🧪 AGUARDANDO TESTE
