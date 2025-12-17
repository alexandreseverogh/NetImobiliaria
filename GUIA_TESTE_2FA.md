# 🔐 GUIA COMPLETO PARA TESTAR 2FA (Two-Factor Authentication)

## 📋 **PRÉ-REQUISITOS**

Antes de testar o 2FA, certifique-se de que:

### ✅ **1. Sistema de Email Configurado**
```bash
# Verificar se as variáveis de ambiente estão configuradas
# Abra o arquivo .env.local e verifique:

GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-senha-de-app-do-gmail
```

> ⚠️ **IMPORTANTE**: Você precisa de uma **Senha de App do Gmail**, não sua senha normal!
> 
> **Como obter:**
> 1. Acesse: https://myaccount.google.com/security
> 2. Ative "Verificação em duas etapas"
> 3. Vá em "Senhas de app"
> 4. Gere uma nova senha para "Outro (nome personalizado)"
> 5. Use essa senha no `GMAIL_APP_PASSWORD`

---

## 🧪 **TESTE 1: VERIFICAR CONFIGURAÇÃO DE EMAIL**

### **Passo 1: Testar Envio de Email**

Execute o script de teste:

```bash
node test-email-service.js
```

**Resultado esperado:**
```
✅ Email de teste enviado com sucesso!
📧 Verifique sua caixa de entrada
```

Se falhar, verifique:
- GMAIL_USER está correto?
- GMAIL_APP_PASSWORD está correto (senha de app, não senha normal)?
- Gmail está permitindo "Apps menos seguros"?

---

## 🧪 **TESTE 2: CRIAR PERFIL COM 2FA OBRIGATÓRIO**

### **Passo 1: Acessar Gestão de Perfis**

1. Faça login: http://localhost:3000/login
   - Usuário: `admin`
   - Senha: `admin123`

2. Acesse: http://localhost:3000/admin/roles

### **Passo 2: Criar Perfil com 2FA**

1. Clique em **"Novo Perfil"**

2. Preencha os campos:
   ```
   Nome: Gerente 2FA Teste
   Descrição: Perfil de teste com 2FA obrigatório
   Nível de Acesso: 3 - Avançado
   ```

3. Na seção **"Configurações de Segurança"**:
   - ✅ **ATIVE** o toggle "2FA Obrigatório" (deve ficar azul)
   - ✅ Mantenha "Perfil Ativo" ativado

4. **Observação**: Deve aparecer um aviso amarelo:
   ```
   ⚠️ Aviso Importante
   Usuários com este perfil precisarão configurar 2FA no primeiro login.
   Certifique-se de que o sistema de email está configurado corretamente.
   ```

5. Clique em **"Criar Perfil"**

### **Resultado Esperado:**
- ✅ Perfil criado com sucesso
- ✅ Na listagem, o perfil mostra "2FA" com badge azul

---

## 🧪 **TESTE 3: CRIAR USUÁRIO COM PERFIL 2FA**

### **Passo 1: Acessar Gestão de Usuários**

1. Acesse: http://localhost:3000/admin/usuarios

### **Passo 2: Criar Novo Usuário**

1. Clique em **"Novo Usuário"**

2. Preencha os dados:
   ```
   Nome: Gerente Teste 2FA
   Email: seu-email-teste@gmail.com  ← Use um email real que você controla
   Telefone: (11) 99999-9999
   Username: gerente.teste
   Senha: Teste@123
   Perfil: Gerente 2FA Teste  ← Selecione o perfil criado anteriormente
   Status: Ativo
   ```

3. Clique em **"Cadastrar"**

### **Resultado Esperado:**
- ✅ Usuário criado com sucesso
- ✅ Usuário está associado ao perfil com 2FA obrigatório

---

## 🧪 **TESTE 4: FAZER LOGIN COM 2FA**

### **Passo 1: Fazer Logout**

1. Clique no botão de logout (canto superior direito)
2. Confirme o logout

### **Passo 2: Tentar Login com Usuário 2FA**

1. Na página de login: http://localhost:3000/login

2. Digite as credenciais:
   ```
   Usuário: gerente.teste
   Senha: Teste@123
   ```

3. Clique em **"Entrar"**

### **Resultado Esperado:**

#### **Se o perfil tem 2FA obrigatório:**

1. **Não faz login imediatamente**
2. Aparece uma tela/modal pedindo o **código 2FA**
3. Você recebe um **email** no endereço cadastrado

---

## 🧪 **TESTE 5: VERIFICAR EMAIL E CÓDIGO 2FA**

### **Passo 1: Verificar Email**

1. Abra seu email (o cadastrado no usuário)

2. Procure por email com assunto:
   ```
   🔐 Código de Verificação 2FA - Net Imobiliária
   ```

3. No corpo do email, você verá:
   ```
   Seu código de verificação é:

   ┌─────────────┐
   │   123456    │  ← Código de 6 dígitos
   └─────────────┘

   Este código expira em 10 minutos.
   ```

### **Passo 2: Inserir Código**

1. Volte para a página de login

2. Digite o código de 6 dígitos recebido no email

3. Clique em **"Verificar"**

### **Resultado Esperado:**
- ✅ Código validado com sucesso
- ✅ Login completado
- ✅ Redirecionado para dashboard admin

---

## 🧪 **TESTE 6: VERIFICAR STATUS 2FA DE PERFIL**

### **Teste via API:**

```bash
node test-2fa-status.js
```

**Ou teste manual:**

1. Acesse: http://localhost:3000/admin/roles

2. Na listagem de perfis, verifique:
   - Perfis com 2FA têm **badge azul "2FA"**
   - Toggle de 2FA está **ativado** (azul)

3. Clique no toggle de 2FA de qualquer perfil:
   - Deve alternar entre ativado/desativado
   - Mostra notificação de sucesso

---

## 🧪 **TESTE 7: ATIVAR/DESATIVAR 2FA DE UM PERFIL**

### **Passo 1: Ativar 2FA**

1. Na página de perfis: http://localhost:3000/admin/roles

2. Encontre um perfil **sem 2FA**

3. Clique no **toggle "2FA"** (deve estar cinza/desativado)

4. Confirme a ação (se houver modal de confirmação)

### **Resultado Esperado:**
- ✅ Toggle muda para azul (ativado)
- ✅ Badge "2FA" aparece no perfil
- ✅ Notificação: "2FA ativado com sucesso"

### **Passo 2: Desativar 2FA**

1. Clique novamente no toggle (agora azul)

2. Confirme a desativação

### **Resultado Esperado:**
- ✅ Toggle volta para cinza (desativado)
- ✅ Badge "2FA" desaparece
- ✅ Notificação: "2FA desativado com sucesso"

---

## 🧪 **TESTE 8: CÓDIGO 2FA EXPIRADO**

### **Cenário: Testar expiração de código**

1. Faça login com usuário que tem 2FA

2. Receba o código por email

3. **AGUARDE 11 MINUTOS** (código expira em 10 minutos)

4. Tente usar o código expirado

### **Resultado Esperado:**
- ❌ Código não aceito
- ❌ Mensagem: "Código expirado. Solicite um novo código."
- ✅ Botão para "Reenviar Código"

---

## 🧪 **TESTE 9: CÓDIGO 2FA INCORRETO**

### **Cenário: Testar código errado**

1. Faça login com usuário que tem 2FA

2. Receba o código por email

3. Digite um código **diferente** do recebido (ex: 000000)

4. Clique em "Verificar"

### **Resultado Esperado:**
- ❌ Código não aceito
- ❌ Mensagem: "Código inválido"
- ✅ Pode tentar novamente (até 3 tentativas)

---

## 🧪 **TESTE 10: REENVIAR CÓDIGO 2FA**

### **Cenário: Solicitar novo código**

1. Faça login com usuário que tem 2FA

2. Na tela de código 2FA, clique em **"Reenviar Código"**

3. Verifique seu email novamente

### **Resultado Esperado:**
- ✅ Novo código enviado por email
- ✅ Código anterior é invalidado
- ✅ Notificação: "Novo código enviado para seu email"

---

## 📊 **CHECKLIST DE VALIDAÇÃO COMPLETA**

Marque cada teste conforme for completando:

### **Configuração:**
- [ ] Email configurado (GMAIL_USER e GMAIL_APP_PASSWORD)
- [ ] Teste de envio de email funcionando
- [ ] Servidor rodando (npm run dev)

### **Criação:**
- [ ] Perfil com 2FA criado com sucesso
- [ ] Usuário com perfil 2FA criado
- [ ] Badge "2FA" aparece na listagem

### **Login e Verificação:**
- [ ] Login solicita código 2FA
- [ ] Email com código recebido
- [ ] Código correto aceito
- [ ] Login completado após 2FA

### **Validações:**
- [ ] Código incorreto rejeitado
- [ ] Código expirado rejeitado
- [ ] Reenvio de código funciona
- [ ] Toggle 2FA ativa/desativa perfil

### **Segurança:**
- [ ] Código expira em 10 minutos
- [ ] Apenas 1 código válido por vez
- [ ] Código de 6 dígitos aleatório
- [ ] Email enviado rapidamente

---

## 🐛 **PROBLEMAS COMUNS E SOLUÇÕES**

### **❌ Problema: Email não chega**

**Soluções:**
1. Verifique spam/lixo eletrônico
2. Confirme GMAIL_APP_PASSWORD (não é senha normal!)
3. Teste: `node test-email-service.js`
4. Verifique logs do servidor para erros

### **❌ Problema: "Código inválido" sempre**

**Soluções:**
1. Verifique se está usando o código mais recente
2. Copie/cole o código (evite digitar manualmente)
3. Verifique se código não expirou (10 min)
4. Teste API: `GET /api/admin/auth/2fa/status`

### **❌ Problema: Toggle 2FA não funciona**

**Soluções:**
1. Verifique permissões do usuário logado
2. Abra console do navegador (F12) e veja erros
3. Confirme que API está respondendo: `POST /api/admin/roles/[id]/toggle-2fa`

### **❌ Problema: Login completa sem pedir 2FA**

**Soluções:**
1. Confirme que perfil tem `two_fa_required = true`
2. Verifique banco de dados: `SELECT * FROM user_roles WHERE id = ...`
3. Teste API: `GET /api/admin/auth/2fa/status?userId=...`

---

## 🔧 **SCRIPTS DE TESTE DISPONÍVEIS**

### **Teste rápido de email:**
```bash
node test-email-service.js
```

### **Teste completo de 2FA:**
```bash
node test-2fa-service.js
```

### **Teste de APIs de autenticação:**
```bash
node test-auth-apis.js
```

---

## 📝 **LOGS E MONITORAMENTO**

### **Logs do Servidor:**
Monitore o terminal onde `npm run dev` está rodando:

```
✅ Código 2FA gerado para usuário: gerente.teste
📧 Email enviado para: seu-email@gmail.com
✅ Código verificado com sucesso
```

### **Logs no Banco de Dados:**

```sql
-- Verificar tentativas de 2FA
SELECT * FROM two_factor_codes 
WHERE user_id = 'ID_DO_USUARIO' 
ORDER BY created_at DESC;

-- Verificar logs de autenticação
SELECT * FROM auth_logs 
WHERE user_id = 'ID_DO_USUARIO' 
ORDER BY timestamp DESC;
```

---

## 🎯 **RESULTADO FINAL ESPERADO**

Após completar todos os testes, você deve ter:

✅ **Sistema de Email funcionando**
✅ **Perfis com 2FA configurados**
✅ **Usuários com 2FA obrigatório**
✅ **Login com 2FA funcionando**
✅ **Códigos sendo enviados e validados**
✅ **Toggle de 2FA ativando/desativando**
✅ **Validações de expiração e erros**

---

## 📞 **SUPORTE**

Se encontrar problemas:

1. Verifique os logs do servidor
2. Consulte `CONFIGURACAO_GMAIL.md`
3. Revise `STATUS_IMPLEMENTACAO.md`
4. Execute scripts de teste individuais

---

**Sistema:** Net Imobiliária  
**Data:** 08/10/2025  
**Versão:** 1.0



