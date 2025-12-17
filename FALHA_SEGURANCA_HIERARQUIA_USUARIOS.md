# 🚨 FALHA CRÍTICA DE SEGURANÇA - HIERARQUIA DE USUÁRIOS

**Data identificação:** 30/10/2024  
**Severidade:** 🔴 **CRÍTICA**  
**Tipo:** Violação do GUARDIAN_RULES  
**Status:** ⚠️ **AÇÃO IMEDIATA NECESSÁRIA**

---

## 🚨 PROBLEMA

### **Falha identificada:**

As APIs de **exclusão** e **edição** de usuários **NÃO verificam hierarquia de perfis**.

**Consequência:**
- ❌ Gerente (nível 3) pode excluir Super Admin (nível 4)
- ❌ Usuário pode se auto-excluir
- ❌ Qualquer um pode editar Super Admin
- ❌ Viola GUARDIAN_RULES linhas 80-82

### **Código vulnerável:**

**Arquivo:** `src/app/api/admin/usuarios/[id]/route.ts`

**DELETE (linha 228-230):**
```typescript
// Verificar se é o último administrador ativo
// TODO: Implementar verificação se é o último admin
// Por enquanto, permitir exclusão  // 🚨 PERIGOSO!
```

**PUT (linha 129-153):**
```typescript
// Nenhuma verificação de hierarquia! 🚨
const updatedUser = await updateUser(userId, updateData)
```

---

## 📊 HIERARQUIA DE PERFIS (BANCO DE DADOS)

```sql
Super Admin  (nível 4) ← Maior autoridade
Gerente      (nível 3)
Corretor     (nível 2)
Usuário      (nível 1) ← Menor autoridade
```

**Regra hierárquica:**
- Nível superior pode gerenciar níveis inferiores
- Nível inferior NÃO pode gerenciar níveis superiores
- Mesmo nível NÃO pode gerenciar entre si

---

## 🛡️ PROTEÇÕES NECESSÁRIAS

### **1. Verificação de hierarquia**

```typescript
// Buscar nível do usuário logado
const loggedUser = await getUserWithRole(loggedUserId)
const loggedUserLevel = loggedUser.role_level || 0

// Buscar nível do usuário alvo
const targetUser = await getUserWithRole(targetUserId)
const targetUserLevel = targetUser.role_level || 0

// REGRA 1: Não pode gerenciar nível igual ou superior
if (loggedUserLevel <= targetUserLevel) {
  return NextResponse.json(
    { error: 'Você não pode gerenciar usuários de nível igual ou superior ao seu' },
    { status: 403 }
  )
}
```

### **2. Proteção de auto-exclusão/edição**

```typescript
// REGRA 2: Não pode excluir/editar a si mesmo
if (loggedUserId === targetUserId) {
  return NextResponse.json(
    { error: 'Você não pode excluir ou editar sua própria conta' },
    { status: 403 }
  )
}
```

### **3. Proteção absoluta do Super Admin**

```typescript
// REGRA 3: Super Admin só pode ser gerenciado por outro Super Admin
if (targetUser.role_name === 'Super Admin' && loggedUser.role_name !== 'Super Admin') {
  return NextResponse.json(
    { error: 'Apenas Super Admins podem gerenciar outros Super Admins' },
    { status: 403 }
  )
}
```

### **4. Proteção do último admin**

```typescript
// REGRA 4: Não pode excluir o último admin ativo
const totalAdmins = await countActiveAdmins()
if (targetUser.role_name === 'Super Admin' && totalAdmins <= 1) {
  return NextResponse.json(
    { error: 'Não é possível excluir o último Super Admin ativo do sistema' },
    { status: 403 }
  )
}
```

---

## 📋 FUNÇÕES AUXILIARES NECESSÁRIAS

```typescript
// src/lib/database/users.ts

export async function getUserWithRole(userId: string) {
  const query = `
    SELECT 
      u.id, u.username, u.nome,
      ur.id as role_id, ur.name as role_name, ur.level as role_level
    FROM users u
    LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
    LEFT JOIN user_roles ur ON ura.role_id = ur.id
    WHERE u.id = $1
  `
  const result = await pool.query(query, [userId])
  return result.rows[0] || null
}

export async function countActiveAdmins(): Promise<number> {
  const query = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    JOIN user_role_assignments ura ON u.id = ura.user_id
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE u.ativo = true 
      AND ur.name = 'Super Admin'
  `
  const result = await pool.query(query)
  return parseInt(result.rows[0].total)
}
```

---

## 🚨 ARQUIVOS QUE PRECISAM CORREÇÃO

### **1. `src/app/api/admin/usuarios/[id]/route.ts`**
- **DELETE:** Adicionar 4 verificações de segurança
- **PUT:** Adicionar 3 verificações de segurança

### **2. `src/lib/database/users.ts`**
- Adicionar: `getUserWithRole()`
- Adicionar: `countActiveAdmins()`

### **3. APIs de atribuição de perfis:**
- `src/app/api/admin/usuarios/[id]/assign-role/route.ts`
- `src/app/api/admin/usuarios/[id]/remove-role/route.ts`

---

## ⚖️ IMPACTO vs RISCO

### **Se NÃO corrigir:**

| Risco | Probabilidade | Impacto | Severidade |
|-------|--------------|---------|------------|
| Gerente excluir Super Admin | Alta | Crítico | 🔴 10/10 |
| Auto-exclusão acidental | Média | Alto | 🟠 7/10 |
| Excluir último admin | Baixa | Crítico | 🔴 10/10 |
| Edição não autorizada | Alta | Alto | 🟠 8/10 |

### **Se corrigir:**

| Benefício | Impacto | Importância |
|-----------|---------|-------------|
| Segurança hierárquica | Crítico | 🟢 10/10 |
| Conformidade GUARDIAN_RULES | Alto | 🟢 9/10 |
| Proteção de dados | Crítico | 🟢 10/10 |
| Auditoria válida | Alto | 🟢 8/10 |

---

## 🎯 ESTIMATIVA DE IMPLEMENTAÇÃO

### **Tempo necessário:**
- Criar funções auxiliares: 10 min
- Adicionar verificações em DELETE: 15 min
- Adicionar verificações em PUT: 15 min
- Atualizar assign-role/remove-role: 10 min
- Testes: 20 min
- **TOTAL:** ~70 minutos

### **Complexidade:** 🟡 Média (5/10)

### **Risco de implementação:** 🟢 Baixo (3/10)
- ✅ Não modifica banco de dados
- ✅ Apenas adiciona validações
- ✅ Facilmente testável

### **Reversibilidade:** 🟢 Alta
- Apenas remover as verificações

---

## 🚀 RECOMENDAÇÃO

### ⚠️ **IMPLEMENTAR URGENTE!**

**Justificativa:**
1. 🚨 **Falha crítica de segurança**
2. 🚨 **Viola GUARDIAN_RULES**
3. 🚨 **Risco real de perda de acesso**
4. ✅ **Implementação relativamente simples**
5. ✅ **Não quebra funcionalidades existentes**

**Prioridade:** 🔴 **MÁXIMA**

---

## 📝 DECISÃO NECESSÁRIA

**Você quer que eu implemente as proteções hierárquicas AGORA?**

Isso **deveria** ter sido implementado desde o início, pois está no GUARDIAN_RULES!

**Opções:**

1. **✅ Implementar agora** (recomendado - 70 min)
2. **⏰ Implementar depois** (adiar, mas manter em alta prioridade)
3. **❌ Não implementar** (manter vulnerabilidade - NÃO RECOMENDADO)

**O que prefere?** 🤔



