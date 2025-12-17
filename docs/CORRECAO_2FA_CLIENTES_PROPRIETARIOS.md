# 🔧 Correção: Sistema 2FA para Clientes e Proprietários

## 📋 Problema Identificado

**Sintoma:** Erro ao enviar código de verificação 2FA no login público.

**Erro no servidor:**
```
❌ Erro ao enviar código 2FA por email: error: sintaxe de entrada é inválida para tipo uuid: "37"
    at TwoFactorAuthService.saveCode
```

---

## 🔍 Causa Raiz

### **Incompatibilidade de Tipos de ID:**

1. **Admin (`users`):** Usa `UUID` como tipo de ID
   ```sql
   CREATE TABLE users (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   );
   ```

2. **Clientes e Proprietários:** Usam `INTEGER` como tipo de ID
   ```sql
   CREATE TABLE clientes (
       id SERIAL PRIMARY KEY  -- INTEGER
   );
   ```

3. **Tabelas 2FA existentes:** Criadas para `users` com `UUID`
   ```sql
   CREATE TABLE user_2fa_codes (
       id UUID PRIMARY KEY,
       user_id UUID NOT NULL  -- ❌ Incompatível com INTEGER
   );
   ```

**Resultado:** Ao tentar salvar código 2FA para cliente ID 37 (INTEGER), o PostgreSQL rejeitava por esperar UUID.

---

## ✅ Solução Implementada

### **1. Criadas Tabelas Específicas para Clientes e Proprietários**

**Arquivo:** `database/create_2fa_tables_clientes_proprietarios.sql`

#### **Tabelas criadas:**

1. **`clientes_2fa_codes`** - Códigos 2FA temporários para clientes
   - `user_id INTEGER` (referencia `clientes.id`)
   - Armazena códigos de 6 dígitos
   - Controla expiração e uso

2. **`clientes_2fa_config`** - Configurações 2FA para clientes
   - `user_id INTEGER UNIQUE` (referencia `clientes.id`)
   - Armazena preferências e histórico

3. **`proprietarios_2fa_codes`** - Códigos 2FA temporários para proprietários
   - `user_id INTEGER` (referencia `proprietarios.id`)
   - Mesma estrutura de clientes

4. **`proprietarios_2fa_config`** - Configurações 2FA para proprietários
   - `user_id INTEGER UNIQUE` (referencia `proprietarios.id`)
   - Mesma estrutura de clientes

5. **`audit_2fa_logs_public`** - Logs de auditoria para ambos
   - Diferencia por `user_type` ('cliente' ou 'proprietario')

---

### **2. Criado Serviço 2FA Específico para Público**

**Arquivo:** `src/services/twoFactorAuthServicePublic.ts`

#### **Diferenças do serviço admin:**

| Aspecto | Admin (`twoFactorAuthService`) | Público (`twoFactorAuthServicePublic`) |
|---------|-------------------------------|----------------------------------------|
| **Tipo de ID** | `UUID` (string) | `INTEGER` (number) |
| **Tabela de códigos** | `user_2fa_codes` | `clientes_2fa_codes` / `proprietarios_2fa_codes` |
| **Tabela de config** | `user_2fa_config` | `clientes_2fa_config` / `proprietarios_2fa_config` |
| **Parâmetro userType** | Não tem | `'cliente'` ou `'proprietario'` |
| **Tabela de usuários** | `users` | `clientes` / `proprietarios` |

#### **Métodos principais:**

```typescript
// Verificar se 2FA está habilitado
await twoFactorAuthServicePublic.is2FAEnabled(userId: number, userType: 'cliente' | 'proprietario'): Promise<boolean>

// Enviar código por email
await twoFactorAuthServicePublic.sendCodeByEmail(
  userId: number,
  userType: 'cliente' | 'proprietario',
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<boolean>

// Validar código
await twoFactorAuthServicePublic.validateCode(
  userId: number,
  userType: 'cliente' | 'proprietario',
  code: string,
  method: string
): Promise<{ valid: boolean; message: string }>
```

---

### **3. Atualizada Rota de Login Público**

**Arquivo:** `src/app/api/public/auth/login/route.ts`

#### **ANTES:**
```typescript
// ❌ Usava serviço do admin (incompatível)
import twoFactorAuthService from '@/services/twoFactorAuthService'

// ❌ Convertia INTEGER para string (errado)
await twoFactorAuthService.sendCodeByEmail(
  user.id.toString(),  // "37" como string
  user.email,
  ipAddress,
  userAgent
)
```

#### **DEPOIS:**
```typescript
// ✅ Usa serviço público específico
import twoFactorAuthServicePublic from '@/services/twoFactorAuthServicePublic'

// ✅ Passa INTEGER diretamente + userType
await twoFactorAuthServicePublic.sendCodeByEmail(
  user.id,      // 37 como número
  userType,     // 'cliente' ou 'proprietario'
  user.email,
  ipAddress,
  userAgent
)
```

---

## 🎯 Funcionamento Agora

### **Fluxo de Login Público com 2FA:**

```
1. Usuário informa email e senha
   ↓
2. Sistema valida credenciais (tabela: clientes ou proprietarios)
   ↓
3. Se 2FA habilitado (two_fa_enabled = true):
   ├─ Gera código de 6 dígitos
   ├─ Salva em clientes_2fa_codes ou proprietarios_2fa_codes
   ├─ Define expiração (10 minutos)
   └─ Envia por email
   ↓
4. ✅ Retorna: { requires2FA: true }
   ↓
5. Usuário digita código de 6 dígitos
   ↓
6. Sistema valida código:
   ├─ Verifica se existe
   ├─ Verifica se não expirou
   ├─ Verifica se não foi usado
   └─ Marca como usado
   ↓
7. ✅ Login bem-sucedido
   ↓
8. Redireciona para /meu-perfil
```

---

## 📊 Comparação: Admin vs Público

| Característica | Admin | Público (Clientes/Proprietários) |
|----------------|-------|-----------------------------------|
| **Tipo de ID** | UUID | INTEGER |
| **Tabela de usuários** | `users` | `clientes` / `proprietarios` |
| **Tabela de códigos 2FA** | `user_2fa_codes` | `clientes_2fa_codes` / `proprietarios_2fa_codes` |
| **Tabela de config 2FA** | `user_2fa_config` | `clientes_2fa_config` / `proprietarios_2fa_config` |
| **Serviço** | `twoFactorAuthService` | `twoFactorAuthServicePublic` |
| **Logs de auditoria** | `audit_2fa_logs` (users) | `audit_2fa_logs_public` (clientes/proprietarios) |

---

## 🧪 Como Testar

### **Teste Completo de 2FA:**

```bash
1. Acesse: http://localhost:3000/landpaging
2. Clique em "Login" → Cliente
3. Informe email e senha de um cliente cadastrado
4. ✅ Deve enviar código 2FA (sem erro 500!)
5. Verifique o terminal do Next.js:
   - ✅ "📧 Enviando código 2FA para cliente ID: 37"
   - ✅ "✅ Código 2FA enviado com sucesso para cliente ID: 37"
6. Verifique seu email e copie o código de 6 dígitos
7. Digite o código no modal
8. ✅ Login bem-sucedido
9. ✅ Redireciona para /meu-perfil
```

### **Verificar no Banco de Dados:**

```sql
-- Ver código gerado para cliente
SELECT * FROM clientes_2fa_codes 
WHERE user_id = 37 
ORDER BY created_at DESC 
LIMIT 1;

-- Ver configuração 2FA do cliente
SELECT * FROM clientes_2fa_config 
WHERE user_id = 37;
```

---

## 📂 Arquivos Criados/Modificados

### **Novos Arquivos:**
- ✅ `database/create_2fa_tables_clientes_proprietarios.sql` - Script SQL
- ✅ `src/services/twoFactorAuthServicePublic.ts` - Serviço 2FA público
- ✅ `docs/CORRECAO_2FA_CLIENTES_PROPRIETARIOS.md` - Esta documentação

### **Arquivos Modificados:**
- ✅ `src/app/api/public/auth/login/route.ts` - Usa serviço público

---

## 🔒 Segurança Mantida

- ✅ Códigos expiram em 10 minutos
- ✅ Código só pode ser usado uma vez
- ✅ Logs de auditoria registram todas as ações
- ✅ Separação clara entre admin e público
- ✅ Validação de integridade referencial (Foreign Keys)
- ✅ Índices para performance

---

## 🎓 Lições Aprendidas

### **1. Incompatibilidade de Tipos:**
- Sistemas legados podem ter tabelas com tipos diferentes de ID
- Sempre verificar estrutura antes de reutilizar serviços

### **2. Separação de Responsabilidades:**
- Admin e público devem ter tabelas separadas
- Facilita auditoria e segurança
- Evita mistura de dados

### **3. Reutilização com Adaptação:**
- Criamos serviço similar ao admin
- Adaptado para INTEGER ao invés de UUID
- Mantém mesma lógica de negócio

---

## ✅ Conclusão

A correção foi implementada com **máximo cuidado**:

- ✅ **Tabelas específicas** criadas para clientes e proprietários
- ✅ **Serviço 2FA público** criado (compatível com INTEGER)
- ✅ **Login público** agora funciona com 2FA
- ✅ **Nenhuma funcionalidade admin quebrada**
- ✅ **Separação clara** entre admin e público
- ✅ **Segurança mantida** (códigos expiram, logs de auditoria)
- ✅ **Performance otimizada** (índices criados)

O sistema 2FA está **completamente funcional** para clientes e proprietários! 🎉


