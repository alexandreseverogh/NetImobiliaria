# 🧪 INSTRUÇÕES DE TESTE: Usuário Paulo

**Data:** 30/10/2025  
**Problema:** Sidebar não mostra "Usuários" para Paulo apesar de ter permissões  
**Causa:** Cache do navegador ou token antigo

---

## 📋 TESTE PASSO A PASSO

### **Passo 1: Fazer Logout Completo**
1. No navegador logado como Paulo
2. Clicar em **Logout**
3. Aguardar redirecionamento para `/login`

### **Passo 2: Limpar Cache do Navegador**
**Opção A - Limpar todo o cache (Chrome/Edge):**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione:
   - ✅ Cookies e dados do site
   - ✅ Imagens e arquivos em cache
   - ✅ Dados armazenados (localStorage)
3. Período: **"Último dia"**
4. Clique em **"Limpar dados"**

**Opção B - DevTools (F12):**
1. Pressione `F12` para abrir DevTools
2. Vá em **Application** (ou Aplicativo)
3. Lado esquerdo: **Storage** → **Clear site data**
4. Marque **tudo**
5. Clique em **"Clear site data"**

### **Passo 3: Recarregar Página**
1. Pressione `Ctrl + Shift + R` (recarregar sem cache)
2. Aguarde a página carregar completamente

### **Passo 4: Fazer Login Novamente**
1. Login: `Paulo`
2. Senha: `Paulo@123`
3. Clicar em **Entrar**

### **Passo 5: Verificar Sidebar**
Após o login, a sidebar DEVE mostrar:
- ✅ Menu **"Usuários"** visível
- ✅ Ao clicar, abre `/admin/usuarios`
- ✅ Página carrega com lista de usuários

---

## 🔍 SE AINDA NÃO APARECER

### **Verificar Console do Navegador (F12)**
1. Pressione `F12`
2. Vá na aba **Console**
3. Procure por erros vermelhos
4. Copie e envie para análise

### **Verificar Network (F12)**
1. Pressione `F12`
2. Vá na aba **Network**
3. Recarregue a página (`Ctrl + Shift + R`)
4. Procure por `/api/admin/sidebar/menu`
5. Clique nessa requisição
6. Vá em **Response**
7. Verifique se há um item com:
   ```json
   {
     "name": "Usuários",
     "url": "/admin/usuarios",
     "has_permission": true
   }
   ```

### **Verificar localStorage**
1. Pressione `F12`
2. Vá na aba **Application**
3. Lado esquerdo: **Local Storage** → `http://localhost:3000`
4. Procure por `auth-token`
5. Copie o valor
6. Cole em https://jwt.io
7. Verifique se as permissões estão lá

---

## 📊 DIAGNÓSTICO DO BANCO (JÁ EXECUTADO)

### ✅ Permissões do Perfil "Usuário"
```sql
   slug   | action
----------+--------
 usuarios | create  ✅
 usuarios | delete  ✅
 usuarios | read    ✅
 usuarios | update  ✅
```

### ✅ Função de Sidebar
```sql
SELECT * FROM get_sidebar_menu_for_user('ae3d62b3-6791-464e-8af0-b3f690467bbb')
WHERE url = '/admin/usuarios';

has_permission | TRUE ✅
```

---

## 🎯 CONCLUSÃO

**Backend está 100% correto!**

O problema é no **frontend** (cache, token antigo, ou localStorage).

**Solução:** Limpar cache + logout + login novamente.

---

## 📝 CHECKLIST

- [ ] Fazer logout
- [ ] Limpar cache do navegador
- [ ] Limpar localStorage (DevTools)
- [ ] Recarregar página (Ctrl+Shift+R)
- [ ] Fazer login novamente
- [ ] Verificar sidebar (deve mostrar "Usuários")
- [ ] Clicar em "Usuários"
- [ ] Verificar se a página carrega

Se após isso ainda não aparecer, **tirar print do Console (F12) e Network**.

---

**Instrutor:** Sistema de Diagnóstico  
**Para:** Usuário Paulo  
**Prioridade:** Alta



