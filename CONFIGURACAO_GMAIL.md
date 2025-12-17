# 📧 Configuração do Gmail SMTP - Net Imobiliária

## ✅ Status Atual
- ✅ EmailService criado (`src/services/emailService.ts`)
- ✅ Templates de email criados no banco de dados
- ✅ Configurações de email configuradas
- ⚠️ **PENDENTE**: Configurar suas credenciais do Gmail

## 🔧 Como Configurar o Gmail

### Passo 1: Criar Arquivo de Configuração
1. Copie o arquivo `env.local.example` para `.env.local`:
   ```bash
   copy env.local.example .env.local
   ```

### Passo 2: Configurar Credenciais do Gmail
1. Abra o arquivo `.env.local`
2. Substitua os valores abaixo:

```env
# Substitua 'seu_email@gmail.com' pelo seu email Gmail
GMAIL_USER=seu_email@gmail.com

# Substitua 'sua_senha_de_app_aqui' pela senha de app do Gmail
GMAIL_APP_PASSWORD=sua_senha_de_app_aqui

# Configurações de Email (opcional)
EMAIL_FROM_NAME="Net Imobiliária"
EMAIL_FROM_ADDRESS=seu_email@gmail.com
```

### Passo 3: Gerar Senha de App do Gmail
1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login na sua conta Google
3. Clique em "Aplicativo" e selecione "Outro (nome personalizado)"
4. Digite "Net Imobiliária" como nome
5. Clique em "Gerar"
6. **COPIE A SENHA GERADA** (16 caracteres)
7. Cole no arquivo `.env.local` no campo `GMAIL_APP_PASSWORD`

### Passo 4: Atualizar Banco de Dados
Execute o script para atualizar as configurações no banco:

```bash
cd database
.\03_configure_email.bat
```

## 🧪 Testando a Configuração

### Teste 1: Verificar Conexão SMTP
```bash
# No diretório raiz do projeto
npm run dev
```

### Teste 2: Enviar Email de Teste
Crie um arquivo de teste `test-email.js`:

```javascript
const emailService = require('./src/services/emailService');

async function testEmail() {
  await emailService.initialize();
  
  const success = await emailService.sendTemplateEmail(
    '2fa_verification',
    'seu_email@gmail.com',
    {
      code: '123456',
      expiration_minutes: '10'
    }
  );
  
  console.log('Email enviado:', success);
}

testEmail();
```

## 📋 Templates Disponíveis

### 1. 2FA Verification (`2fa_verification`)
- **Variáveis**: `code`, `expiration_minutes`
- **Uso**: Envio de códigos de verificação

### 2. Password Reset (`password_reset`)
- **Variáveis**: `reset_link`, `expiration_hours`
- **Uso**: Redefinição de senha

## 🔒 Segurança

### ✅ Implementado
- Senha de app específica (não senha principal)
- Logs de envio de email
- Rate limiting configurado
- Templates seguros

### ⚠️ Importante
- **NUNCA** commite o arquivo `.env.local`
- Use sempre senhas de app para Gmail
- Monitore os logs de email regularmente

## 🚨 Solução de Problemas

### Erro: "Authentication failed"
- Verifique se a senha de app está correta
- Confirme se a verificação em 2 etapas está ativada no Gmail

### Erro: "Connection timeout"
- Verifique sua conexão com a internet
- Confirme se o firewall não está bloqueando a porta 587

### Erro: "Template not found"
- Verifique se os templates foram inseridos no banco
- Execute: `psql -h localhost -U postgres -d net_imobiliaria -c "SELECT name FROM email_templates;"`

## 📞 Próximos Passos

1. **Configurar suas credenciais** no `.env.local`
2. **Testar o envio de email**
3. **Implementar sistema de 2FA** completo
4. **Criar APIs de autenticação** robustas

---

**Status**: ✅ Gmail SMTP configurado e pronto para uso!


