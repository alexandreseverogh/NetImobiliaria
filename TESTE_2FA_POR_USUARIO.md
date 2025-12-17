# 🧪 TESTE: 2FA por Usuário - Funcionalidade de Administrador

**Data:** 27/10/2025  
**Status:** Implementado - Aguardando testes

---

## 📋 RESUMO DA IMPLEMENTAÇÃO

### ✅ O QUE FOI IMPLEMENTADO

1. **API de Toggle 2FA** (`src/app/api/admin/usuarios/[id]/2fa/route.ts`)
   - Permite que administradores habilitem/desabilitem 2FA para qualquer usuário
   - Método: `PATCH`
   - Endpoint: `/api/admin/usuarios/[id]/2fa`
   - Body: `{ enable: true/false }`

2. **Botão de Toggle na Página de Usuários** (`src/app/admin/usuarios/page.tsx`)
   - Adicionado botão "Ativar"/"Desativar" na coluna 2FA
   - Exibe "Obrigatório" / "Não obrigatório" como status
   - Protegido por `PermissionGuard` com `resource="usuarios"` e `action="WRITE"`

---

## 🧪 CHECKLIST DE TESTES

### **Teste 1: Visualização do Status**
- [ ] Acessar `http://localhost:3000/admin/usuarios`
- [ ] Verificar se a coluna "2FA" exibe:
  - "Obrigatório" (badge verde) para usuários com 2FA habilitado
  - "Não obrigatório" (badge cinza) para usuários sem 2FA
- [ ] Verificar se o botão "Ativar"/"Desativar" aparece na coluna 2FA

### **Teste 2: Habilitar 2FA para um Usuário**
- [ ] Localizar um usuário com 2FA desabilitado (badge "Não obrigatório")
- [ ] Clicar no botão "Ativar"
- [ ] Confirmar a ação na popup de confirmação
- [ ] Verificar se a página recarrega
- [ ] Verificar se o status mudou para "Obrigatório" (badge verde)
- [ ] Verificar se o botão agora mostra "Desativar"

### **Teste 3: Desabilitar 2FA para um Usuário**
- [ ] Localizar um usuário com 2FA habilitado (badge "Obrigatório")
- [ ] Clicar no botão "Desativar"
- [ ] Confirmar a ação na popup de confirmação
- [ ] Verificar se a página recarrega
- [ ] Verificar se o status mudou para "Não obrigatório" (badge cinza)
- [ ] Verificar se o botão agora mostra "Ativar"

### **Teste 4: Verificação de Permissões**
- [ ] Tentar habilitar/desabilitar 2FA com um usuário sem permissão `WRITE` em `usuarios`
- [ ] Verificar se o botão não aparece ou está desabilitado
- [ ] Verificar se a ação é bloqueada pelo `PermissionGuard`

### **Teste 5: Filtro por 2FA**
- [ ] Usar o filtro "2FA" na página de usuários
- [ ] Selecionar "Ativado" e verificar se apenas usuários com 2FA habilitado aparecem
- [ ] Selecionar "Desativado" e verificar se apenas usuários sem 2FA aparecem
- [ ] Selecionar "Todos" e verificar se todos os usuários aparecem

### **Teste 6: Auditoria**
- [ ] Verificar se logs de auditoria são criados na tabela `audit_2fa_logs`
- [ ] Verificar se o campo `details` contém informações sobre quem habilitou/desabilitou
- [ ] Verificar se o campo `ip_address` e `user_agent` são preenchidos

---

## 🔍 VERIFICAÇÃO NO BANCO DE DADOS

### 1. Verificar Configuração 2FA do Usuário

```sql
-- Verificar configuração 2FA de todos os usuários
SELECT 
    u.id,
    u.username,
    u.email,
    ufc.is_enabled as two_fa_enabled,
    ufc.method as two_fa_method,
    ufc.email as two_fa_email,
    ufc.created_at as two_fa_created_at,
    ufc.updated_at as two_fa_updated_at
FROM users u
LEFT JOIN user_2fa_config ufc ON u.id = ufc.user_id
ORDER BY u.username;
```

### 2. Verificar Logs de Auditoria

```sql
-- Verificar logs de 2FA por usuário
SELECT 
    u.username,
    afl.action,
    afl.method,
    afl.ip_address,
    afl.user_agent,
    afl.details,
    afl.created_at
FROM audit_2fa_logs afl
JOIN users u ON afl.user_id = u.id
WHERE afl.action IN ('2fa_enabled_by_admin', '2fa_disabled_by_admin')
ORDER BY afl.created_at DESC
LIMIT 20;
```

### 3. Verificar Backup Codes

```sql
-- Verificar códigos de backup (hash)
SELECT 
    u.username,
    ufc.backup_codes,
    ufc.updated_at
FROM user_2fa_config ufc
JOIN users u ON ufc.user_id = u.id
WHERE ufc.is_enabled = true;
```

---

## 🐛 TROUBLESHOOTING

### **Erro: "Token de autenticação não fornecido"**
- Verificar se o usuário está logado
- Verificar se o cookie `accessToken` existe
- Verificar se o `Authorization` header está sendo enviado

### **Erro: "Usuário não encontrado"**
- Verificar se o `userId` no URL está correto
- Verificar se o usuário existe no banco de dados

### **Erro: "2FA já está habilitado/desabilitado"**
- Normal - significa que o estado atual é o mesmo que está sendo solicitado
- Verificar no banco se `user_2fa_config.is_enabled` está correto

### **Botão não aparece**
- Verificar se o usuário logado tem permissão `WRITE` em `usuarios`
- Verificar se `PermissionGuard` está funcionando corretamente
- Verificar console do navegador para erros

### **Status não muda após clicar**
- Verificar console do navegador para erros de API
- Verificar se a requisição está sendo enviada corretamente
- Verificar logs do servidor para erros de backend

---

## 📊 FLUXO COMPLETO

### 1. **Habilitar 2FA**
```
Usuário clica "Ativar" → Confirma → API `/api/admin/usuarios/{id}/2fa` → PATCH com `{enable: true}` 
→ Atualizar `user_2fa_config.is_enabled = true` → Criar backup codes → Log auditoria → 
Recarregar lista → Exibir "Obrigatório"
```

### 2. **Desabilitar 2FA**
```
Usuário clica "Desativar" → Confirma → API `/api/admin/usuarios/{id}/2fa` → PATCH com `{enable: false}` 
→ Atualizar `user_2fa_config.is_enabled = false` → Invalidar códigos pendentes → Log auditoria → 
Recarregar lista → Exibir "Não obrigatório"
```

---

## ✅ CRITÉRIOS DE SUCESSO

1. ✅ API criada e funcionando
2. ✅ Botão visível na interface
3. ✅ Status exibe "Obrigatório"/"Não obrigatório"
4. ✅ Toggle funciona corretamente
5. ✅ Auditoria é registrada
6. ✅ Permissões são respeitadas
7. ✅ Filtro por 2FA funciona
8. ✅ Sem erros no console

---

## 📝 NOTAS IMPORTANTES

- **Segurança**: Apenas usuários com permissão `WRITE` em `usuarios` podem alterar 2FA
- **Auditoria**: Todas as alterações são registradas em `audit_2fa_logs`
- **Backup Codes**: Novos códigos são gerados a cada habilitação
- **Códigos Pendentes**: Códigos expirados são invalidados ao desabilitar

