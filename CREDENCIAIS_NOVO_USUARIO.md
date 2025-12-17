# 🔐 Credenciais de Login para Novos Usuários

## 📋 Resumo

Quando um novo usuário é cadastrado através do **Modal de Criação de Usuários**, as seguintes credenciais são armazenadas na tabela `users` do banco de dados PostgreSQL e podem ser utilizadas para login:

---

## ✅ Credenciais Utilizadas para Login

### 1. **Username (Nome de Usuário)**
- **Campo no formulário:** "Username *"
- **Coluna no banco:** `users.username`
- **Uso no login:** ✅ **SIM - Pode ser usado para login**
- **Validações:**
  - Obrigatório
  - Mínimo de 3 caracteres
  - Apenas letras, números e underscore (`_`)
  - Deve ser único no sistema

### 2. **Email**
- **Campo no formulário:** "Email *"
- **Coluna no banco:** `users.email`
- **Uso no login:** ✅ **SIM - Pode ser usado para login**
- **Validações:**
  - Obrigatório
  - Formato de email válido
  - Deve ser único no sistema

### 3. **Senha (Password)**
- **Campo no formulário:** "Senha *" e "Confirmar Senha *"
- **Coluna no banco:** `users.password`
- **Armazenamento:** Criptografada com `bcrypt` (hash)
- **Validações:**
  - Obrigatória
  - Mínimo de 8 caracteres
  - As duas senhas devem coincidir

---

## 🔑 Como Fazer Login

O usuário recém-cadastrado pode fazer login usando **QUALQUER UMA** das seguintes combinações:

### **Opção 1: Username + Senha**
```
Username: joaosilva
Senha: SenhaSegura123
```

### **Opção 2: Email + Senha**
```
Email: joao.silva@example.com
Senha: SenhaSegura123
```

---

## 🗂️ Dados Armazenados na Tabela `users`

Quando um novo usuário é criado, os seguintes dados são inseridos na tabela `users`:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Gerado automaticamente pelo banco | `cc8220f7-a3fd-40ed-8dbd-a22539328083` |
| `username` | VARCHAR | Nome de usuário único | `joaosilva` |
| `email` | VARCHAR | Email único | `joao.silva@example.com` |
| `password` | VARCHAR | Senha criptografada com bcrypt | `$2a$10$N9qo8uLOickgx2...` |
| `nome` | VARCHAR | Nome completo | `João da Silva` |
| `telefone` | VARCHAR | Telefone formatado | `(81) 99999-9999` |
| `ativo` | BOOLEAN | Status do usuário | `true` |
| `ultimo_login` | TIMESTAMP | Data/hora do último login | `NULL` (até fazer o primeiro login) |
| `created_at` | TIMESTAMP | Data/hora de criação | `2025-10-08 10:30:00` |
| `updated_at` | TIMESTAMP | Data/hora da última atualização | `2025-10-08 10:30:00` |

---

## 🔗 Atribuição de Perfil

Além da criação do usuário na tabela `users`, também é feita uma atribuição de perfil na tabela `user_role_assignments`:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `user_id` | ID do usuário criado | `cc8220f7-a3fd-40ed-8dbd-a22539328083` |
| `role_id` | ID do perfil selecionado | `1` (Super Admin) |
| `assigned_by` | Quem atribuiu (por padrão, o próprio usuário criado) | `cc8220f7-a3fd-40ed-8dbd-a22539328083` |
| `assigned_at` | Data/hora da atribuição | `2025-10-08 10:30:00` |

---

## 🔐 Processo de Login (Backend)

### **Arquivo:** `src/app/api/admin/auth/login/route.ts`

O processo de login aceita tanto `username` quanto `email`:

```typescript
// Query que busca o usuário
const userQuery = `
  SELECT 
    u.id, u.username, u.email, u.password, u.nome, u.ativo as is_active,
    ur.name as role_name, ur.description as role_description, ur.level as role_level
  FROM users u
  LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
  LEFT JOIN user_roles ur ON ura.role_id = ur.id
  WHERE u.username = $1 OR u.email = $1  -- ✅ Aceita username OU email
`;
```

### **Validação da Senha**

A senha fornecida no login é comparada com o hash armazenado usando `bcrypt`:

```typescript
const passwordMatch = await bcrypt.compare(password, user.password)
```

---

## 📝 Exemplo Completo de Cadastro

### **Dados Preenchidos no Modal:**

| Campo | Valor |
|-------|-------|
| Username | `joaosilva` |
| Email | `joao.silva@example.com` |
| Nome Completo | `João da Silva` |
| Telefone | `(81) 99999-9999` |
| Perfil | `Corretor` (ID: 3) |
| Senha | `SenhaSegura123` |
| Confirmar Senha | `SenhaSegura123` |

### **Após o Cadastro, o Usuário Pode Logar Com:**

1. **Username + Senha:**
   - Username: `joaosilva`
   - Senha: `SenhaSegura123`

2. **Email + Senha:**
   - Email: `joao.silva@example.com`
   - Senha: `SenhaSegura123`

---

## 🛡️ Segurança

### **Criptografia da Senha**
- A senha **NUNCA** é armazenada em texto plano
- Utiliza `bcrypt` com salt de 10 rounds
- Exemplo de hash: `$2a$10$N9qo8uLOickgx2ZhlXfx.ePFnQweP.S/783ck6HqC5y0MbNJOQKzu`

### **Validações no Frontend**
- Username: mínimo 3 caracteres
- Email: formato válido
- Senha: mínimo 8 caracteres
- Telefone: formato brasileiro `(XX) XXXXX-XXXX`

### **Validações no Backend**
- Username: apenas alfanuméricos e underscore
- Email: formato válido
- Senha: mínimo 8 caracteres
- Verificação de duplicação (username/email únicos)
- Verificação de perfil válido e ativo

---

## ❓ FAQ - Perguntas Frequentes

### **1. Posso usar tanto username quanto email para logar?**
✅ **SIM!** O sistema aceita ambos.

### **2. A senha é case-sensitive?**
✅ **SIM!** `SenhaSegura123` é diferente de `senhasegura123`.

### **3. O que acontece se eu esquecer meu username?**
Você pode usar seu **email** para fazer login.

### **4. O que acontece se eu esquecer minha senha?**
Atualmente, você precisaria solicitar a um administrador para redefinir sua senha através do painel de usuários.

### **5. Preciso confirmar meu email após o cadastro?**
❌ **NÃO!** O sistema atual não requer confirmação de email. O usuário pode fazer login imediatamente após o cadastro.

### **6. O usuário é ativado automaticamente?**
✅ **SIM!** Por padrão, `ativo = true` ao criar o usuário.

---

## 📌 Arquivos Relacionados

### **Frontend:**
- `src/components/admin/CreateUserModal.tsx` - Modal de criação de usuários
- `src/app/login/page.tsx` - Página de login

### **Backend:**
- `src/app/api/admin/usuarios/route.ts` - API de criação de usuários
- `src/app/api/admin/auth/login/route.ts` - API de login
- `src/lib/database/users.ts` - Funções do banco de dados

### **Banco de Dados:**
- Tabela: `users` - Armazena dados dos usuários
- Tabela: `user_role_assignments` - Associa usuários a perfis
- Tabela: `user_roles` - Define os perfis disponíveis

---

**Data da Documentação:** 08/10/2025  
**Versão:** 1.0



