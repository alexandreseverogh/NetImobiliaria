# 🔍 ANÁLISE COMPLETA: ESTRUTURA DE 2FA

**Data:** 27/10/2025  
**Status:** Análise detalhada  

---

## 📊 RESUMO EXECUTIVO

O sistema possui **duas configurações de 2FA** que atuam em **níveis diferentes**:

### **1. POR PERFIL (Role)** 🎭
- **Tabela:** `user_roles.requires_2fa`
- **Quando é aplicado:** Ao usuário quando ele TEM esse perfil
- **Exemplo:** Se perfil "Super Admin" tem `requires_2fa = true`, TODOS os usuários com esse perfil precisam de 2FA

### **2. POR USUÁRIO INDIVIDUAL** 👤
- **Tabela:** `user_2fa_config.is_enabled`
- **Quando é aplicado:** Configuração específica do usuário
- **Exemplo:** Um usuário individual pode habilitar 2FA mesmo que seu perfil não exija

---

## 📋 TABELAS E CAMPOS DE 2FA

### **1. `user_roles` - 2FA POR PERFIL** 🎭

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `requires_2fa` | BOOLEAN | Se este PERFIL obriga 2FA | `true` = todos com este perfil precisam 2FA |

**Exemplo:**
```sql
-- Perfil "Super Admin" OBRIGA 2FA
UPDATE user_roles 
SET requires_2fa = true 
WHERE name = 'Super Admin';
-- → TODOS os usuários com perfil "Super Admin" precisam 2FA
```

**Lógica:**
- Se `requires_2fa = true` → Obrigatório para TODOS os usuários do perfil
- Se `requires_2fa = false` → Opcional para TODOS os usuários do perfil

---

### **2. `users` - CONFIGURAÇÃO INDIVIDUAL DO USUÁRIO** 👤

| Campo | Tipo | Descrição | Estado |
|-------|------|-----------|--------|
| `two_fa_enabled` | BOOLEAN | Se o usuário TEM 2FA habilitado | Existe no schema, usado em runtime |
| `two_fa_secret` | VARCHAR | Chave secreta (para TOTP) | Existe no schema |

**Lógica:**
- Se `two_fa_enabled = true` → Usuário ATIVOU 2FA individualmente
- Se `two_fa_enabled = false` → Usuário NÃO tem 2FA habilitado

---

### **3. `user_2fa_config` - CONFIGURAÇÃO DETALHADA DO USUÁRIO** ⚙️

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `user_id` | UUID | ID do usuário |
| `method` | VARCHAR | Método 2FA ('email', 'sms', 'totp') |
| `is_enabled` | BOOLEAN | Se está habilitado para ESTE usuário |
| `backup_codes` | TEXT[] | Códigos de backup |
| `last_used` | TIMESTAMP | Última vez que foi usado |

**Exemplo:**
```sql
-- Usuário "admin" habilita 2FA via email
INSERT INTO user_2fa_config (user_id, method, is_enabled)
VALUES ('cc8220f7-...', 'email', true);
```

**Lógica:**
- Armazena configuração específica do usuário
- Permite múltiplos métodos (email, SMS, TOTP)
- Independente do perfil

---

### **4. `user_2fa_codes` - CÓDIGOS TEMPORÁRIOS** 🔢

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `user_id` | UUID | ID do usuário |
| `code` | VARCHAR | Código de 6 dígitos |
| `expires_at` | TIMESTAMP | Quando expira |
| `used` | BOOLEAN | Se foi usado |

**Lógica:**
- Armazena códigos de verificação temporários
- Expira em 10 minutos
- Após usar, marca `used = true`

---

### **5. `user_sessions` - VERIFICAÇÃO NA SESSÃO** 🔐

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `is_2fa_verified` | BOOLEAN | Se 2FA foi verificado nesta sessão |

**Lógica:**
- Grava se usuário verificou 2FA na sessão atual
- Previne bypass de 2FA

---

### **6. `system_2fa_settings` - CONFIGURAÇÃO GLOBAL** 🌐

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `required_for_roles` | INTEGER[] | IDs de perfis que OBRIGAM 2FA |
| `optional_for_roles` | INTEGER[] | IDs de perfis que TÊM 2FA opcional |
| `code_length` | INTEGER | Comprimento do código (6) |
| `code_expiry_minutes` | INTEGER | Tempo de expiração (10 min) |

**Lógica:**
- Configuração global do sistema
- Define regras por perfil (IDs)
- Controla comportamento global de 2FA

---

## 🔄 COMO FUNCIONA NA PRÁTICA

### **Cenário 1: 2FA OBRIGATÓRIO POR PERFIL** 🎭

```sql
-- 1. Configurar perfil para OBRIGAR 2FA
UPDATE user_roles 
SET requires_2fa = true 
WHERE name = 'Super Admin';

-- 2. Usuário faz login
-- → Sistema verifica: role.requires_2fa = true
-- → Sistema VERIFICA se user.is_2fa_enabled = true
-- → Se não: FORÇA ativação de 2FA
-- → Se sim: Solicita código 2FA
```

**Fluxo:**
1. Login detecta `role.requires_2fa = true`
2. Verifica se `user.two_fa_enabled = true`
3. Se não: **FORÇA usuário a habilitar 2FA**
4. Se sim: Solicita código
5. Usuário digita código
6. Sistema verifica em `user_2fa_codes`
7. Se correto: Cria sessão com `is_2fa_verified = true`

---

### **Cenário 2: 2FA OPCIONAL (USUÁRIO ESCOLHE)** 👤

```sql
-- 1. Perfil NÃO obriga 2FA
UPDATE user_roles 
SET requires_2fa = false 
WHERE name = 'Corretor';

-- 2. Usuário com esse perfil faz login
-- → Sistema verifica: role.requires_2fa = false
-- → Sistema verifica: user.two_fa_enabled = ?
-- → Se true: Solicita código 2FA
-- → Se false: Login sem 2FA
```

**Fluxo:**
1. Login detecta `role.requires_2fa = false`
2. Verifica se `user.two_fa_enabled = true` (opcional)
3. Se `true`: Solicita código 2FA
4. Se `false`: Login sem 2FA

---

## 🎯 RESPOSTA À SUA PERGUNTA

> **"Pela lógica da aplicação, essa associação é por perfil de usuário ou por usuário? Ou pode ser por ambas as situações?"**

**RESPOSTA:** ✅ **AMBAS AS SITUAÇÕES** funcionam:

### **1. POR PERFIL (OBRIGATÓRIO)** 🎭
- **Campo:** `user_roles.requires_2fa`
- **Objetivo:** Forçar TODOS os usuários do perfil a terem 2FA
- **Uso:** Perfis de alta segurança (Super Admin, Administrador)
- **Comportamento:** Sistema **FORÇA** o usuário a ativar se não tiver

### **2. POR USUÁRIO (OPCIONAL)** 👤
- **Campo:** `user_2fa_config.is_enabled` ou `users.two_fa_enabled`
- **Objetivo:** Usuário escolhe ativar 2FA individualmente
- **Uso:** Perfis normais, usuário quer mais segurança
- **Comportamento:** Usuário decide ativar ou não

---

## 🔐 LÓGICA DE PRIORIDADE

### **Regra de decisão no login:**

```typescript
// Pseudocódigo da lógica
function check2FARequired(user, role) {
  // 1. Verificar se PERFIL obriga 2FA
  if (role.requires_2fa === true) {
    // 2. Verificar se usuário JÁ tem 2FA habilitado
    if (user.two_fa_enabled === false) {
      // FORÇA ativação de 2FA
      return { required: true, action: 'FORCE_ENABLE' }
    }
    // 2FA habilitado, solicita código
    return { required: true, action: 'REQUEST_CODE' }
  }
  
  // 3. Perfil NÃO obriga, mas usuário pode ter ativado
  if (user.two_fa_enabled === true) {
    return { required: true, action: 'REQUEST_CODE' }
  }
  
  // 4. Nem perfil obriga nem usuário tem
  return { required: false, action: 'SKIP' }
}
```

---

## 📊 RESUMO DAS TABELAS

| Tabela | Campo 2FA | Nível | Propósito |
|--------|-----------|-------|-----------|
| `user_roles` | `requires_2fa` | Perfil | Obriga 2FA para TODOS do perfil |
| `users` | `two_fa_enabled` | Usuário | Usuário TEM 2FA habilitado |
| `user_2fa_config` | `is_enabled` | Usuário | Configuração detalhada do usuário |
| `user_2fa_codes` | - | Runtime | Códigos temporários |
| `user_sessions` | `is_2fa_verified` | Runtime | Sessão verificada? |
| `system_2fa_settings` | `required_for_roles` | Global | Configuração global por roles |

---

## ✅ CONCLUSÃO

**Sistema implementa 2FA de forma FLEXÍVEL:**
- ✅ **Por Perfil:** Obriga TODOS os usuários do perfil (segurança alta)
- ✅ **Por Usuário:** Usuário escolhe ativar individualmente (segurança opcional)
- ✅ **Ambos funcionam:** Sistema decide qual usar baseado nas configurações

**IMPORTANTE:** 
- `user_roles.requires_2fa` = Obrigatório para PERFIL
- `user_2fa_config.is_enabled` = Habilitado para USUÁRIO
- `user_sessions.is_2fa_verified` = Verificado na SESSÃO atual

