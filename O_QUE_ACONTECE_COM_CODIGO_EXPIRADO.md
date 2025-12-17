# ⏰ O QUE ACONTECE QUANDO O CÓDIGO 2FA EXPIRA

**Data:** 27/10/2025  
**Situação:** Usuário não informou código dentro de 10 minutos  

---

## 📋 RESPOSTA DIRETA

### **Se o usuário NÃO informar o código em 10 minutos:**

1. ✅ **Código permanece no banco** (`user_2fa_codes`)
2. ❌ **Código NÃO funciona mais** (query verifica `expires_at > NOW()`)
3. 🔄 **Usuário precisa pedir NOVO código**
4. 🗑️ **Código antigo** pode ser **deletado automaticamente** (limpeza)

---

## 🔍 ANÁLISE DO CÓDIGO

### **Linha 204:** `AND expires_at > NOW()`

**Arquivo:** `src/services/twoFactorAuthService.ts`

```typescript
async validateCode(userId: string, code: string, method: string = 'email') {
  const codeQuery = `
    SELECT id, expires_at, created_at, ip_address, user_agent
    FROM user_2fa_codes 
    WHERE user_id = $1 
    AND code = $2 
    AND method = $3 
    AND used = false                // ← Não pode estar usado
    AND expires_at > NOW()         // ← EXPIROU? NÃO é aceito!
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  
  const codeResult = await pool.query(codeQuery, [userId, code, method]);
  
  if (codeResult.rows.length === 0) {  // ← Código não encontrado
    return {
      valid: false,
      message: 'Código inválido ou expirado'  // ← Mensagem de erro
    };
  }
}
```

---

## 🎯 O QUE ACONTECE EXATAMENTE

### **Cenário:** Código gerado às 15:30:00, expira às 15:40:00

**Momento: 15:35:00 (5 minutos depois)**
- ✅ `expires_at = 15:40:00 > NOW() = 15:35:00` → **VÁLIDO**
- ✅ Código funciona normalmente

**Momento: 15:40:01 (10 minutos e 1 segundo depois)**
- ❌ `expires_at = 15:40:00 < NOW() = 15:40:01` → **EXPIRADO**
- ❌ Query **NÃO encontra** código (linha 204 falha)
- ❌ Retorna `valid: false, message: 'Código inválido ou expirado'`

---

## 🔄 FLUXO QUANDO CÓDIGO EXPIRA

### **Passo 1:** Usuário tenta digitar código expirado

```
Usuário digita: "456789" (mas código expirou)
   ↓
Sistema busca no banco
   ↓
Query: expires_at > NOW()
   ↓
Resultado: 0 linhas (não encontrou)
   ↓
Retorno: { valid: false, message: 'Código inválido ou expirado' }
```

### **Passo 2:** Sistema registra tentativa inválida

```typescript
// Log tentativa inválida
await this.log2FAActivity(userId, 'code_validation_failed', method, { 
  code, 
  reason: 'invalid_or_expired'  // ← Marca como expirado
});

// Log de login para 2FA
await this.log2FAAttempt(userId, username, '2fa_failed', ...);
```

### **Passo 3:** Usuário precisa pedir NOVO código

```
Opção 1: Clicar em "Reenviar código"
   ↓
Sistema envia novo email com NOVO código
   ↓
Novo código tem +10 minutos de validade
   ↓
Usuário digita novo código
   ↓
Funciona normalmente ✅
```

**Opção 2:** Tentar novamente o código antigo
```
Mesmo código expirado
   ↓
Sistema rejeita: 'Código inválido ou expirado'
   ↓
Usuário precisa pedir novo código
```

---

## 🗑️ LIMPEZA AUTOMÁTICA DE CÓDIGOS EXPIRADOS

### **Método:** `cleanupExpiredCodes()` (linha 404-416)

```typescript
async cleanupExpiredCodes(): Promise<void> {
  try {
    const result = await pool.query(
      'DELETE FROM user_2fa_codes WHERE expires_at < NOW()'
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`🧹 Limpeza: ${result.rowCount} códigos 2FA expirados removidos`);
    }
  } catch (error) {
    console.error('❌ Erro na limpeza de códigos expirados:', error);
  }
}
```

**O que faz:**
- **Busca:** Códigos com `expires_at < NOW()` (já expiraram)
- **Ação:** DELETE (remove do banco)
- **Quando:** Executado periodicamente ou manualmente

**Exemplo:**
```sql
-- Antes da limpeza:
SELECT * FROM user_2fa_codes;
id | user_id | code   | expires_at          | used
1  | abc-123 | 456789 | 2025-10-27 15:40:00 | false

-- Após limpeza (se expires_at < NOW()):
DELETE FROM user_2fa_codes WHERE expires_at < NOW();
-- Registro ID=1 é REMOVIDO
```

---

## 📊 RESUMO COMPLETO

### **Dentro dos 10 minutos:**
- ✅ Código funciona normalmente
- ✅ Usuário pode digitar e fazer login
- ✅ Código é marcado como `used = true` após uso

### **Após 10 minutos (expirado):**
- ❌ Código **NÃO funciona** mais
- ❌ Query **NÃO encontra** código (expires_at > NOW() falha)
- ❌ Mensagem de erro: **"Código inválido ou expirado"**
- 🗑️ Código permanece no banco até limpeza
- 🔄 Usuário precisa **solicitar novo código**

### **Limpeza automática:**
- 🧹 Códigos expirados são **deletados** periodicamente
- 🔄 Libera espaço no banco
- ⏰ Executado por cron job ou manualmente

---

## ✅ AÇÃO NECESSÁRIA

**Usuário precisa:**
1. Solicitar **novo código** (botão "Reenviar código")
2. Digitar o **novo código recebido**
3. Fazer login com **novo código válido**

**Código antigo:**
- ❌ Não funciona mais
- 🗑️ Será deletado na limpeza
- 🔄 Não pode ser reutilizado

