# ⚡ GUIA RÁPIDO - SISTEMA DE SEGURANÇA

**Para desenvolvedores que precisam de referência rápida**

---

## 🎯 RESUMO EM 30 SEGUNDOS

**O que é:** Sistema completo de autenticação, autorização (RBAC) e 2FA por email.

**Tabelas principais:**
- `users` - Usuários do sistema
- `user_roles` - Perfis (Super Admin, Admin, Corretor)
- `permissions` - Permissões disponíveis
- `system_features` - Funcionalidades do sistema

**Como funciona:**
1. Usuário faz login → recebe JWT
2. JWT contém permissões do usuário
3. Cada requisição verifica permissões
4. Se necessário, pede código 2FA por email

---

## 📋 QUERIES MAIS USADAS

### Ver todos os usuários e seus perfis

```sql
SELECT 
  u.username,
  u.email,
  u.ativo,
  ur.name as perfil,
  ur.level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
ORDER BY u.username;
```

### Ver todas as permissões de um usuário

```sql
SELECT 
  sf.category as recurso,
  p.action as acao
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'joao.silva';
```

### Ver permissões de um perfil

```sql
SELECT 
  sf.category as recurso,
  p.action as acao,
  p.description
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Admin'
ORDER BY sf.category, p.action;
```

### Tentativas de login recentes

```sql
SELECT 
  username,
  ip_address,
  success,
  attempted_at
FROM login_attempts
WHERE attempted_at >= NOW() - INTERVAL '24 hours'
ORDER BY attempted_at DESC
LIMIT 50;
```

### Emails enviados hoje

```sql
SELECT 
  to_email,
  template_name,
  success,
  sent_at
FROM email_logs
WHERE DATE(sent_at) = CURRENT_DATE
ORDER BY sent_at DESC;
```

---

## 🔧 OPERAÇÕES COMUNS

### Criar novo usuário

```sql
-- 1. Inserir usuário
INSERT INTO users (username, email, password, nome, ativo)
VALUES ('joao', 'joao@example.com', '$2b$10$hash...', 'João Silva', true)
RETURNING id;

-- 2. Atribuir perfil (use o UUID retornado acima)
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES ('uuid-do-joao', 3, 'uuid-do-admin');
```

### Ativar 2FA para usuário

```sql
UPDATE users 
SET two_fa_enabled = true 
WHERE username = 'joao';
```

### Tornar 2FA obrigatório para um perfil

```sql
UPDATE user_roles 
SET two_fa_required = true 
WHERE name = 'Admin';
```

### Dar permissão temporária

```sql
INSERT INTO user_permissions (
  user_id, 
  permission_id, 
  granted_by, 
  expires_at, 
  reason
)
VALUES (
  'uuid-do-usuario',
  45, -- ID da permissão
  'uuid-do-admin',
  NOW() + INTERVAL '7 days',
  'Projeto especial X'
);
```

### Remover permissão temporária

```sql
DELETE FROM user_permissions 
WHERE user_id = 'uuid-do-usuario' 
  AND permission_id = 45;
```

### Desativar usuário

```sql
UPDATE users 
SET ativo = false 
WHERE username = 'joao';

-- Também invalida todas as sessões
DELETE FROM user_sessions 
WHERE user_id = (SELECT id FROM users WHERE username = 'joao');
```

### Criar novo perfil

```sql
-- 1. Criar perfil
INSERT INTO user_roles (name, description, level, two_fa_required)
VALUES ('Vendedor', 'Vendedor de imóveis', 15, false)
RETURNING id;

-- 2. Atribuir permissões (use o ID retornado)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  7, -- ID do perfil criado
  p.id,
  'uuid-do-super-admin'
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category IN ('imoveis', 'clientes')
  AND p.action IN ('list', 'create', 'update');
```

---

## 🔑 MAPEAMENTO DE PERMISSÕES

### Ações → Níveis

| Ação no DB | Nível Frontend | Descrição |
|------------|----------------|-----------|
| `list` | `READ` | Listar/visualizar |
| `create` | `WRITE` | Criar novos |
| `update` | `WRITE` | Editar existentes |
| `delete` | `DELETE` | Excluir |
| `export` | `READ` | Exportar dados |
| `admin` | `ADMIN` | Acesso total |

### Categorias (system_features)

| Category | Descrição |
|----------|-----------|
| `imoveis` | Gestão de Imóveis |
| `amenidades` | Gestão de Amenidades |
| `proximidades` | Gestão de Proximidades |
| `clientes` | Gestão de Clientes |
| `proprietarios` | Gestão de Proprietários |
| `usuarios` | Gestão de Usuários |
| `relatorios` | Relatórios |
| `sistema` | Configurações |
| `roles` | Gestão de Perfis |
| `permissions` | Gestão de Permissões |

---

## 🚨 TROUBLESHOOTING RÁPIDO

### Problema: Usuário não consegue fazer login

```sql
-- Verificar se está ativo
SELECT username, ativo FROM users WHERE username = 'joao';

-- Se ativo = false:
UPDATE users SET ativo = true WHERE username = 'joao';

-- Verificar tentativas recentes
SELECT * FROM login_attempts 
WHERE username = 'joao' 
ORDER BY attempted_at DESC 
LIMIT 5;
```

### Problema: Usuário não tem permissão

```sql
-- Ver perfis do usuário
SELECT ur.name, ur.level 
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'joao';

-- Ver permissões do perfil
SELECT sf.category, p.action 
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Corretor';
```

### Problema: Email não está sendo enviado

```sql
-- Verificar configurações
SELECT * FROM email_settings WHERE is_active = true;

-- Verificar logs de erro
SELECT * FROM email_logs 
WHERE success = false 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar templates
SELECT name, is_active FROM email_templates;
```

### Problema: 2FA não funciona

```sql
-- Verificar se usuário tem 2FA ativado
SELECT username, two_fa_enabled FROM users WHERE username = 'joao';

-- Verificar configurações 2FA
SELECT * FROM system_2fa_settings WHERE environment = 'development';

-- Ver tentativas de código
SELECT * FROM login_attempts 
WHERE username = 'joao' 
  AND attempted_at >= NOW() - INTERVAL '1 hour'
ORDER BY attempted_at DESC;
```

---

## 📞 REFERÊNCIAS RÁPIDAS

### Estrutura de JWT

```json
{
  "userId": "uuid-do-usuario",
  "username": "joao.silva",
  "email": "joao@example.com",
  "role_name": "Admin",
  "role_level": 50,
  "is2FAEnabled": true,
  "permissoes": {
    "imoveis": "WRITE",
    "clientes": "WRITE",
    "usuarios": "ADMIN"
  },
  "iat": 1696800000,
  "exp": 1696803600
}
```

### Hierarquia de Perfis

```
Level 100: Super Admin (tudo)
Level 50:  Admin (gerenciamento)
Level 40:  Gerente (supervisão)
Level 30:  Supervisor (coordenação)
Level 20:  Vendedor (vendas)
Level 10:  Corretor (operação)
```

### Variáveis de Ambiente Necessárias

```bash
# JWT
JWT_SECRET=seu-secret-aqui
JWT_EXPIRES_IN=1h

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=sua-senha

# Email (Gmail)
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=senha-de-app-gmail

# Ambiente
NODE_ENV=development
```

### Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/2fa/send-code` | POST | Enviar código 2FA |
| `/api/auth/2fa/verify-code` | POST | Verificar código 2FA |
| `/api/admin/usuarios` | GET/POST | Listar/Criar usuários |
| `/api/admin/roles` | GET/POST | Listar/Criar perfis |
| `/api/admin/roles/:id/permissions` | GET/PUT | Gerenciar permissões |

---

## 💡 DICAS PRO

### Cache de Permissões

Permissões são cacheadas no JWT por 1 hora. Se mudar permissões:
1. Usuário precisa fazer logout e login novamente
2. OU esperar token expirar (1h)

### Rate Limiting

- **Login:** 5 tentativas / 15 min (por username)
- **Login:** 10 tentativas / 15 min (por IP)
- **2FA:** 3 tentativas / código
- **Bloqueio:** 15 minutos

### Segurança de Senha

```javascript
// Frontend - validação mínima
- Mínimo 8 caracteres
- Pelo menos 1 maiúscula
- Pelo menos 1 número

// Backend - hash
bcrypt.hash(password, 10) // 10 rounds
```

### Auditoria

Sempre preencher `granted_by` / `assigned_by`:
```sql
INSERT INTO role_permissions (role_id, permission_id, granted_by)
VALUES (1, 5, current_user_id); -- NÃO deixar NULL
```

---

## 🔒 CHECKLIST DE SEGURANÇA

- [ ] Senha hasheada com bcrypt (min 10 rounds)
- [ ] JWT com secret forte (min 32 caracteres)
- [ ] 2FA obrigatório para admins em produção
- [ ] Rate limiting ativado
- [ ] HTTPS em produção
- [ ] Cookies HttpOnly + Secure
- [ ] CORS configurado corretamente
- [ ] SQL injection protegido (prepared statements)
- [ ] XSS protegido (sanitização)
- [ ] CSRF tokens em formulários

---

**Última atualização:** 2025-10-08  
**Versão:** 1.0


