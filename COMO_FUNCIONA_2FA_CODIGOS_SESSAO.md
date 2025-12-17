# 📋 COMO FUNCIONAM CÓDIGOS TEMPORÁRIOS E SESSÃO VERIFICADA

**Data:** 27/10/2025  
**Status:** Documentação completa do fluxo 2FA  

---

## 🔄 FLUXO COMPLETO DE 2FA

### **FASE 1: USUÁRIO FAZ LOGIN** 🔐

```typescript
// Usuário digita: username + password
POST /api/admin/auth/login
{
  "username": "admin",
  "password": "admin@123"
}
```

### **FASE 2: SISTEMA GERA CÓDIGO TEMPORÁRIO** 🔢

**Arquivo:** `src/services/twoFactorAuthService.ts` (linha 103-106)

```typescript
generateCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;  // Ex: "456789"
}
```

**O que acontece:**
1. Sistema detecta que 2FA está habilitado (`user.two_fa_enabled = true`)
2. Gera código aleatório de 6 dígitos
3. Calcula expiração: `agora + 10 minutos`

---

### **FASE 3: SALVAR CÓDIGO NA `user_2fa_codes`** 💾

**Arquivo:** `src/services/twoFactorAuthService.ts` (linha 171-185)

```typescript
await saveCode(userId, code, 'email', expiresAt, ipAddress, userAgent);

// SQL executado:
INSERT INTO user_2fa_codes (
    user_id,          // ID do usuário
    code,             // Código gerado (ex: "456789")
    method,           // 'email' ou 'sms' ou 'totp'
    expires_at,       // NOW() + 10 minutos
    ip_address,       // IP do cliente
    user_agent,       // Navegador
    created_at        // Momento da criação
) VALUES ($1, $2, $3, $4, $5, $6, NOW());
```

**Exemplo no banco:**
```sql
SELECT * FROM user_2fa_codes;

id | user_id | code   | method | expires_at          | used | ip_address | user_agent
---|---------|--------|--------|---------------------|------|------------|------------
1  | abc-123 | 456789 | email  | 2025-10-27 15:40:00 | false| 127.0.0.1  | Chrome/120
```

---

### **FASE 4: ENVIAR CÓDIGO POR EMAIL** 📧

**Arquivo:** `src/services/twoFactorAuthService.ts` (linha 123-166)

```typescript
// Envia email usando template '2fa-code'
await emailService.sendTemplateEmail('2fa-code', email, { code });

// O email contém:
// "Seu código de verificação é: 456789"
// "Este código expira em 10 minutos"
```

**Resultado:**
- Usuário recebe email com código
- Código está salvo no banco (`user_2fa_codes`)
- Código expira em 10 minutos

---

### **FASE 5: USUÁRIO DIGITA CÓDIGO** ⌨️

```typescript
POST /api/admin/auth/login
{
  "username": "admin",
  "password": "admin@123",
  "twoFactorCode": "456789"  // ← Código recebido por email
}
```

---

### **FASE 6: VALIDAR CÓDIGO** ✅

**Arquivo:** `src/services/twoFactorAuthService.ts` (linha 190-233)

```typescript
async validateCode(userId: string, code: string, method: string) {
  // 1. Buscar código no banco
  const codeQuery = `
    SELECT id, expires_at, used
    FROM user_2fa_codes 
    WHERE user_id = $1
      AND code = $2
      AND method = $3
      AND used = false        -- ← Não pode estar usado
      AND expires_at > NOW()   -- ← Não pode estar expirado
  `;
  
  // 2. Verificar se existe
  if (result.rows.length === 0) {
    return { valid: false, message: 'Código inválido ou expirado' };
  }
  
  // 3. Marcar como USADO
  await pool.query(`
    UPDATE user_2fa_codes 
    SET used = true 
    WHERE id = $1
  `, [codeId]);
  
  return { valid: true };
}
```

**O que acontece:**
1. ✅ Busca código em `user_2fa_codes`
2. ✅ Verifica se `used = false` (não usado)
3. ✅ Verifica se `expires_at > NOW()` (não expirado)
4. ✅ Se válido: marca `used = true` (não pode reutilizar)

---

### **FASE 7: CRIAR SESSÃO COM 2FA VERIFICADO** 🔓

**Arquivo:** `src/app/api/admin/auth/login/route.ts` (linha 472-484)

```typescript
async function createUserSession(userId: string, ipAddress: string, userAgent: string) {
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  
  const query = `
    INSERT INTO user_sessions (
      user_id, 
      refresh_token, 
      expires_at, 
      is_2fa_verified,  // ← MARCADO COMO TRUE!
      ip_address,
      created_at,
      last_used_at
    ) VALUES ($1, $2, $3, TRUE, $4, NOW(), NOW())
  `;
  
  await pool.query(query, [userId, refreshToken, expiresAt, ipAddress]);
  return refreshToken;
}
```

**Exemplo no banco:**
```sql
SELECT * FROM user_sessions;

id | user_id | refresh_token     | expires_at          | is_2fa_verified | ip_address
---|---------|-------------------|---------------------|-----------------|------------
1  | abc-123 | xyz-789-uvw...    | 2025-10-28 15:30:00  | true            | 127.0.0.1
```

---

## 📊 RESUMO DAS ATRIBUIÇÕES

### **1. COMO `user_2fa_codes` É ATRIBUÍDA** 🔢

**QUANDO:**
- Usuário faz login com 2FA habilitado
- Sistema GERA código aleatório
- Sistema ENVIA código por email
- Sistema SALVA código em `user_2fa_codes`

**COMO:**
```typescript
// Em sendCodeByEmail():
const code = this.generateCode();              // Gera: "456789"
const expiresAt = new Date(Date.now() + 600000); // Expira em 10 min

await this.saveCode(userId, code, 'email', expiresAt, ip, agent);
// ↓ Salva no banco
INSERT INTO user_2fa_codes VALUES ($1, $2, $3, $4, $5, $6, NOW());
```

**CAMPOS PREENCHIDOS:**
- ✅ `user_id` → ID do usuário
- ✅ `code` → "456789" (gerado aleatoriamente)
- ✅ `method` → "email"
- ✅ `expires_at` → NOW() + 10 minutos
- ✅ `used` → `false` (ainda não foi usado)
- ✅ `ip_address` → IP do cliente
- ✅ `user_agent` → Navegador
- ✅ `created_at` → Momento da criação

---

### **2. COMO `user_sessions.is_2fa_verified` É ATRIBUÍDA** 🔐

**QUANDO:**
- Usuário digita código correto
- Sistema VALIDA código (linha 291-310)
- Sistema CRIA sessão (linha 405)
- Campo `is_2fa_verified = true` é SETADO

**COMO:**
```typescript
// Em validateCode():
if (validationResult.valid) {  // ← Código correto!
  // Criar sessão com 2FA verificado
  const sessionId = await createUserSession(user.id, ipAddress, userAgent);
  // ↓
  INSERT INTO user_sessions (..., is_2fa_verified)
  VALUES (..., TRUE);  // ← MARCADO COMO TRUE!
}

// Também marca código como USADO
UPDATE user_2fa_codes SET used = true WHERE id = $1;
```

**CAMPOS PREENCHIDOS:**
- ✅ `user_id` → ID do usuário
- ✅ `refresh_token` → UUID aleatório
- ✅ `expires_at` → NOW() + 24 horas
- ✅ `is_2fa_verified` → **TRUE** (2FA verificado com sucesso!)
- ✅ `ip_address` → IP do cliente
- ✅ `created_at` → Momento da criação
- ✅ `last_used_at` → NOW()

---

## 🔄 FLUXO VISUAL COMPLETO

```
1. Login (username + password)
   ↓
2. Sistema detecta 2FA habilitado
   ↓
3. Gera código aleatório "456789"
   ↓
4. Salva em user_2fa_codes
   ↓
5. Envia por email
   ↓
6. Usuário digita "456789"
   ↓
7. Sistema valida código
   ↓
8. Marca código como USADO (used = true)
   ↓
9. Cria sessão com is_2fa_verified = TRUE
   ↓
10. Login completo ✅
```

---

## 🎯 RESPOSTA DIRETA

### **"Como são atribuídos Códigos temporários?"**

**Automaticamente pelo sistema:**
1. Durante login com 2FA habilitado
2. Método `generateCode()` gera 6 dígitos aleatórios
3. Método `saveCode()` salva em `user_2fa_codes`
4. Código expira em 10 minutos
5. Código é enviado por email ao usuário

---

### **"Como são atribuídos Sessão verificada?"**

**Automaticamente pelo sistema:**
1. Após usuário digitar código correto
2. Sistema valida código em `user_2fa_codes`
3. Se válido: marca `used = true` (não pode reutilizar)
4. Cria sessão em `user_sessions`
5. Campo `is_2fa_verified = true` é SETADO automaticamente
6. Sessão permite acesso ao sistema

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Códigos temporários** são GERADOS pelo servidor, não pelo usuário
2. **Códigos expiram** em 10 minutos automaticamente
3. **Códigos são únicos:** Após uso (`used = true`), não podem ser reutilizados
4. **Sessão verificada** é SETADA automaticamente quando código é válido
5. **Não há ação manual** do administrador - tudo é automático

