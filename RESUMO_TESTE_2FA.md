# ⚡ RESUMO RÁPIDO: COMO TESTAR 2FA

## ✅ **PREPARAÇÃO (5 minutos)**

### **1. Configurar Email (SE AINDA NÃO FEZ)**
```bash
# Edite .env.local e adicione:
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-senha-de-app-gmail
```

> 🔑 **Senha de App Gmail**: https://myaccount.google.com/security → "Senhas de app"

### **2. Testar Email**
```bash
node test-email-service.js
```

Deve mostrar: ✅ Email enviado com sucesso

---

## 🎯 **TESTE COMPLETO (10 minutos)**

### **PASSO 1: Executar Script de Preparação**
```bash
node test-2fa-complete.js
```

Este script:
- ✅ Cria um perfil com 2FA obrigatório
- ✅ Verifica configuração de email
- ✅ Mostra instruções para próximos passos

---

### **PASSO 2: Criar Usuário com 2FA** 👤

1. **Acesse**: http://localhost:3000/admin/usuarios
2. **Clique**: "Novo Usuário"
3. **Preencha**:
   ```
   Nome: Teste 2FA
   Email: SEU-EMAIL-REAL@gmail.com  ← IMPORTANTE!
   Telefone: (11) 99999-9999
   Username: teste.2fa
   Senha: Teste@123
   Perfil: Gerente 2FA Teste  ← Selecione este
   Status: Ativo
   ```
4. **Clique**: "Cadastrar"

---

### **PASSO 3: Fazer Logout** 🚪

1. Clique no botão de logout (canto superior direito)
2. Confirme o logout

---

### **PASSO 4: Testar Login com 2FA** 🔐

1. **Acesse**: http://localhost:3000/login
2. **Digite**:
   ```
   Usuário: teste.2fa
   Senha: Teste@123
   ```
3. **Clique**: "Entrar"
4. **Aguarde**: Sistema deve solicitar código 2FA

---

### **PASSO 5: Verificar Email e Código** 📧

1. **Abra seu email** (o cadastrado no usuário)
2. **Procure por**: "🔐 Código de Verificação 2FA"
3. **No email**, você verá algo assim:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Net Imobiliária
Código de Verificação 2FA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Olá, Teste 2FA!

Seu código de verificação é:

┌─────────────┐
│   123456    │  ← Este é o código
└─────────────┘

Este código expira em 10 minutos.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

4. **Copie o código** (6 dígitos)
5. **Cole** na tela de verificação do sistema
6. **Clique**: "Verificar"

---

### **PASSO 6: Verificar Sucesso** ✅

**Resultado Esperado:**
- ✅ Código aceito
- ✅ Login completado
- ✅ Redirecionado para: http://localhost:3000/admin
- ✅ Você está logado como "Teste 2FA"

---

## 🧪 **TESTES ADICIONAIS**

### **Teste 1: Código Incorreto** ❌
1. Faça login com `teste.2fa`
2. Digite código errado (ex: `000000`)
3. **Esperado**: Erro "Código inválido"

### **Teste 2: Reenviar Código** 🔄
1. Faça login com `teste.2fa`
2. Clique em "Reenviar Código"
3. **Esperado**: Novo email com novo código

### **Teste 3: Código Expirado** ⏰
1. Faça login com `teste.2fa`
2. Aguarde 11 minutos
3. Tente usar código antigo
4. **Esperado**: Erro "Código expirado"

### **Teste 4: Toggle 2FA** 🔄
1. Acesse: http://localhost:3000/admin/roles
2. Encontre "Gerente 2FA Teste"
3. Clique no toggle "2FA" (deve estar azul)
4. **Esperado**: Toggle desativa (fica cinza)
5. Clique novamente
6. **Esperado**: Toggle ativa (fica azul)

---

## 🎨 **ELEMENTOS VISUAIS ESPERADOS**

### **Na Listagem de Perfis:**
```
┌──────────────────────────────────────────────┐
│ Gerente 2FA Teste                    [🔵 2FA]│
│ Nível: 3 | Ativo                             │
│ [Editar] [Permissões] [Clonar]               │
└──────────────────────────────────────────────┘
```

### **No Modal de Login com 2FA:**
```
┌─────────────────────────────────────┐
│   🔐 Verificação em Duas Etapas     │
├─────────────────────────────────────┤
│                                     │
│  Enviamos um código para seu email │
│  alexandreseverog@gmail.com         │
│                                     │
│  Digite o código:                   │
│  ┌───────────────────────────────┐ │
│  │ [ ] [ ] [ ] [ ] [ ] [ ]       │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Verificar]  [Reenviar Código]    │
└─────────────────────────────────────┘
```

---

## ❓ **PROBLEMAS COMUNS**

### **❌ Email não chega**
- Verifique **spam/lixo eletrônico**
- Confirme `GMAIL_APP_PASSWORD` (não é senha normal!)
- Execute: `node test-email-service.js`

### **❌ "Código inválido" sempre**
- Use o código **mais recente**
- **Copie e cole** (não digite manualmente)
- Verifique se não **expirou** (10 min)

### **❌ Sistema não pede 2FA**
- Confirme que perfil tem `two_fa_required = true`
- Verifique na listagem se badge "2FA" aparece
- Tente recriar o usuário

---

## 📊 **STATUS ATUAL**

Após executar `node test-2fa-complete.js`:

```
✅ Perfil com 2FA criado: "Gerente 2FA Teste"
✅ Email configurado: alexandreseverog@gmail.com
✅ Total de perfis: 7
✅ Perfis com 2FA: 1
```

---

## 🎯 **CHECKLIST RÁPIDO**

- [ ] Script `test-2fa-complete.js` executado
- [ ] Perfil "Gerente 2FA Teste" criado
- [ ] Usuário "teste.2fa" criado com perfil 2FA
- [ ] Login solicita código 2FA
- [ ] Email com código recebido
- [ ] Código validado com sucesso
- [ ] Login completado

---

## 📚 **DOCUMENTAÇÃO COMPLETA**

Para detalhes completos, consulte:
- **GUIA_TESTE_2FA.md** - Guia completo de testes
- **CONFIGURACAO_GMAIL.md** - Configuração de email

---

**Tempo total estimado**: 10-15 minutos  
**Dificuldade**: ⭐⭐☆☆☆ (Fácil)



