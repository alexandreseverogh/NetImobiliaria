# 📚 DOCUMENTAÇÃO COMPLETA DO SISTEMA DE SEGURANÇA, AUTENTICAÇÃO E EMAIL

**Versão:** 2.0  
**Data:** 2025-10-08  
**Status:** ✅ Produção

---

## 📑 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tabelas Detalhadas](#tabelas-detalhadas)
4. [Diagramas de Relacionamento](#diagramas-de-relacionamento)
5. [Fluxos de Autenticação](#fluxos-de-autenticação)
6. [Fluxos de Autorização](#fluxos-de-autorização)
7. [Sistema de Email](#sistema-de-email)
8. [Sistema 2FA](#sistema-2fa)
9. [Auditoria e Logs](#auditoria-e-logs)
10. [Segurança](#segurança)
11. [Casos de Uso](#casos-de-uso)

---

## 🎯 VISÃO GERAL

### Propósito

Este sistema gerencia:
- ✅ **Autenticação** de usuários (login/logout)
- ✅ **Autorização** baseada em perfis e permissões (RBAC)
- ✅ **2FA (Two-Factor Authentication)** por email
- ✅ **Gerenciamento de Emails** (templates, logs, configurações)
- ✅ **Auditoria** completa de ações
- ✅ **Sessões** de usuários
- ✅ **Tentativas de Login** para segurança

### Estatísticas Atuais

| Tabela | Registros | Colunas | Foreign Keys |
|--------|-----------|---------|--------------|
| **users** | 9 | 11 | 0 |
| **user_roles** | 7 | 8 | 0 |
| **user_role_assignments** | 9 | 6 | 3 |
| **permissions** | 80 | 5 | 1 |
| **role_permissions** | 93 | 5 | 3 |
| **user_permissions** | 28 | 7 | 2 |
| **system_features** | 21 | 8 | 0 |
| **user_sessions** | 0 | 6 | 1 |
| **login_attempts** | 0 | 8 | 0 |
| **email_settings** | 1 | 12 | 0 |
| **email_templates** | 2 | 9 | 0 |
| **email_logs** | 0 | 9 | 0 |
| **system_2fa_settings** | 3 | 12 | 0 |

---

## 🏗️ ARQUITETURA DO SISTEMA

### Camadas do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                    │
│  (Frontend React/Next.js - Páginas de Login, Admin, etc)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO                       │
│           (APIs Next.js - Routes de Auth, Admin)             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth APIs    │  │ Admin APIs   │  │ Public APIs  │      │
│  │ /api/auth/*  │  │ /api/admin/* │  │ /api/*       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE SERVIÇOS                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │emailService  │  │2faService    │  │authService   │      │
│  │(Nodemailer)  │  │(Código 2FA)  │  │(JWT, bcrypt) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE MIDDLEWARE                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │authMiddleware│  │permissionMw  │  │rateLimitMw   │      │
│  │(Verifica JWT)│  │(Checa RBAC)  │  │(Limita req)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS                           │
│              (PostgreSQL - 13 Tabelas)                       │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  users   │  │  roles   │  │permission│  │  email   │   │
│  │          │  │          │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 TABELAS DETALHADAS

### 1. 👤 **users** - Tabela de Usuários

**Propósito:** Armazena informações dos usuários do sistema.

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | UUID | NO | uuid_generate_v4() | ID único do usuário |
| `username` | VARCHAR(50) | NO | - | Nome de usuário (único) |
| `email` | VARCHAR(255) | NO | - | Email do usuário (único) |
| `password` | VARCHAR(255) | NO | - | Hash da senha (bcrypt) |
| `nome` | VARCHAR(100) | NO | - | Nome completo |
| `telefone` | VARCHAR(20) | YES | - | Telefone de contato |
| `ativo` | BOOLEAN | YES | true | Se o usuário está ativo |
| `two_fa_enabled` | BOOLEAN | YES | false | Se 2FA está ativado |
| `two_fa_secret` | VARCHAR(255) | YES | - | Secret para 2FA |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de atualização |

**Índices:**
- `users_pkey` - PRIMARY KEY (id)
- `users_username_key` - UNIQUE (username)
- `users_email_key` - UNIQUE (email)

**Relacionamentos:**
- **1:N** com `user_role_assignments` (um usuário pode ter múltiplos perfis)
- **1:N** com `user_permissions` (um usuário pode ter permissões diretas)
- **1:N** com `user_sessions` (um usuário pode ter múltiplas sessões)
- **1:N** com `role_permissions` (através de granted_by)
- **1:N** com `login_attempts` (tentativas de login)

**Regras de Negócio:**
1. ✅ Username e email devem ser únicos
2. ✅ Senha deve ser hasheada com bcrypt (min 10 rounds)
3. ✅ Usuário inativo não pode fazer login
4. ✅ Two_fa_enabled só funciona se houver two_fa_secret

**Dados Atuais:** 9 usuários cadastrados

---

### 2. 🎭 **user_roles** - Perfis de Usuários

**Propósito:** Define os perfis/roles disponíveis no sistema (Super Admin, Admin, Corretor).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único do perfil |
| `name` | VARCHAR(50) | NO | - | Nome do perfil (único) |
| `description` | TEXT | YES | - | Descrição do perfil |
| `level` | INTEGER | NO | 1 | Nível hierárquico (1-100) |
| `is_active` | BOOLEAN | YES | true | Se o perfil está ativo |
| `two_fa_required` | BOOLEAN | YES | false | Se 2FA é obrigatório |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de atualização |

**Índices:**
- `user_roles_pkey` - PRIMARY KEY (id)
- `user_roles_name_key` - UNIQUE (name)

**Relacionamentos:**
- **1:N** com `user_role_assignments` (um perfil pode ser atribuído a vários usuários)
- **1:N** com `role_permissions` (um perfil tem várias permissões)

**Regras de Negócio:**
1. ✅ Nome do perfil deve ser único
2. ✅ Level determina hierarquia (maior = mais poder)
3. ✅ Super Admin sempre level 100
4. ✅ Two_fa_required força 2FA para todos os usuários desse perfil
5. ✅ Perfil inativo não pode ser atribuído a novos usuários

**Hierarquia Atual:**
```
Level 100: Super Admin (máximo poder)
Level 50:  Admin (gerenciamento)
Level 10:  Corretor (operação)
```

**Dados Atuais:** 7 perfis cadastrados

---

### 3. 🔗 **user_role_assignments** - Atribuição de Perfis

**Propósito:** Relaciona usuários com seus perfis (N:N).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único da atribuição |
| `user_id` | UUID | NO | - | FK para users |
| `role_id` | INTEGER | NO | - | FK para user_roles |
| `assigned_by` | UUID | YES | - | FK para users (quem atribuiu) |
| `assigned_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Quando foi atribuído |
| `is_primary` | BOOLEAN | YES | false | Se é o perfil principal |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `role_id` → `user_roles(id)` ON DELETE CASCADE
- `assigned_by` → `users(id)` ON DELETE SET NULL

**Índices:**
- `user_role_assignments_pkey` - PRIMARY KEY (id)
- `idx_user_role_assignments_user_id` - INDEX (user_id)
- `idx_user_role_assignments_role_id` - INDEX (role_id)

**Regras de Negócio:**
1. ✅ Um usuário pode ter múltiplos perfis
2. ✅ Apenas um perfil pode ser `is_primary = true` por usuário
3. ✅ Registra quem fez a atribuição (auditoria)
4. ✅ Se user ou role for deletado, assignment é removido (CASCADE)

**Dados Atuais:** 9 atribuições

---

### 4. 🎯 **system_features** - Funcionalidades do Sistema

**Propósito:** Catálogo de funcionalidades/recursos do sistema que podem receber permissões.

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único da feature |
| `name` | VARCHAR(100) | NO | - | Nome da funcionalidade |
| `category` | VARCHAR(50) | NO | - | Categoria (imoveis, usuarios, etc) |
| `description` | TEXT | YES | - | Descrição detalhada |
| `parent_id` | INTEGER | YES | - | FK para system_features (hierarquia) |
| `is_active` | BOOLEAN | YES | true | Se está ativa |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de atualização |

**Índices:**
- `system_features_pkey` - PRIMARY KEY (id)
- `idx_system_features_category` - INDEX (category)
- `idx_system_features_is_active` - INDEX (is_active)

**Relacionamentos:**
- **1:N** com `permissions` (uma feature tem várias permissões)
- **1:N** com `system_features` (hierarquia pai-filho)

**Regras de Negócio:**
1. ✅ Category agrupa features relacionadas
2. ✅ parent_id permite hierarquia (ex: Imóveis > Tipos de Imóveis)
3. ✅ Features inativas não aparecem no sistema

**Categorias Atuais:**
- `admin-panel` - Painel Administrativo
- `imoveis` - Gestão de Imóveis
- `tipos-imoveis` - Tipos de Imóveis
- `finalidades` - Finalidades de Imóveis
- `status-imovel` - Status de Imóveis
- `amenidades` - Gestão de Amenidades
- `categorias-amenidades` - Categorias de Amenidades
- `proximidades` - Gestão de Proximidades
- `categorias-proximidades` - Categorias de Proximidades
- `tipos-documentos` - Tipos de Documentos
- `clientes` - Gestão de Clientes
- `proprietarios` - Gestão de Proprietários
- `usuarios` - Gestão de Usuários
- `dashboards` - Dashboards
- `relatorios` - Relatórios
- `sistema` - Configurações
- `roles` - Gestão de Perfis
- `permissions` - Gestão de Permissões
- `hierarchy` - Hierarquia de Perfis

**Dados Atuais:** 21 funcionalidades

---

### 5. 🔑 **permissions** - Permissões do Sistema

**Propósito:** Define todas as permissões possíveis (ações sobre features).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único da permissão |
| `feature_id` | INTEGER | YES | - | FK para system_features |
| `action` | VARCHAR(50) | NO | - | Ação (list, create, update, delete, admin) |
| `description` | TEXT | YES | - | Descrição da permissão |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |

**Foreign Keys:**
- `feature_id` → `system_features(id)` ON DELETE CASCADE

**Índices:**
- `permissions_pkey` - PRIMARY KEY (id)
- `idx_permissions_feature_id` - INDEX (feature_id)
- `idx_permissions_action` - INDEX (action)

**Relacionamentos:**
- **N:1** com `system_features` (várias permissões para uma feature)
- **1:N** com `role_permissions` (uma permissão pode estar em vários perfis)
- **1:N** com `user_permissions` (uma permissão pode ser dada a vários usuários)

**Ações Padrão:**
- `list` - Listar/visualizar registros (READ)
- `create` - Criar novos registros (WRITE)
- `update` - Editar registros existentes (WRITE)
- `delete` - Excluir registros (DELETE)
- `export` - Exportar dados
- `admin` - Acesso administrativo total (ADMIN)

**Regras de Negócio:**
1. ✅ Combinação `feature_id` + `action` deve ser única
2. ✅ Se feature for deletada, permissões são removidas (CASCADE)
3. ✅ Action mapeia para níveis: list=READ, create/update=WRITE, delete=DELETE, admin=ADMIN

**Dados Atuais:** 88 permissões (atualizado em 2025-10-09)

---

### 6. 🔐 **role_permissions** - Permissões dos Perfis

**Propósito:** Relaciona perfis com suas permissões (N:N).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `role_id` | INTEGER | NO | - | FK para user_roles |
| `permission_id` | INTEGER | NO | - | FK para permissions |
| `granted_by` | UUID | YES | - | FK para users (quem concedeu) |
| `granted_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Quando foi concedida |

**Foreign Keys:**
- `role_id` → `user_roles(id)` ON DELETE CASCADE
- `permission_id` → `permissions(id)` ON DELETE CASCADE
- `granted_by` → `users(id)` ON DELETE SET NULL

**Índices:**
- `role_permissions_pkey` - PRIMARY KEY (id)
- `idx_role_permissions_role_id` - INDEX (role_id)
- `idx_role_permissions_permission_id` - INDEX (permission_id)

**Regras de Negócio:**
1. ✅ Um perfil pode ter múltiplas permissões
2. ✅ Uma permissão pode estar em múltiplos perfis
3. ✅ Registra quem concedeu (auditoria)
4. ✅ Se perfil ou permissão for deletado, relação é removida (CASCADE)

**Dados Atuais:** 101 relações perfil-permissão (atualizado em 2025-10-09)

---

### 7. 👥 **user_permissions** - Permissões Diretas de Usuários

**Propósito:** Permissões individuais concedidas diretamente a usuários (exceções).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `user_id` | UUID | NO | - | FK para users |
| `permission_id` | INTEGER | YES | - | FK para permissions |
| `granted_by` | UUID | YES | - | FK para users (quem concedeu) |
| `granted_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Quando foi concedida |
| `expires_at` | TIMESTAMP | YES | - | Quando expira (opcional) |
| `reason` | TEXT | YES | - | Motivo da concessão |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `granted_by` → `users(id)` ON DELETE SET NULL

**Índices:**
- `user_permissions_pkey` - PRIMARY KEY (id)
- `idx_user_permissions_user_id` - INDEX (user_id)

**Regras de Negócio:**
1. ✅ Sobrescreve permissões do perfil (precedência)
2. ✅ Pode ter data de expiração
3. ✅ Requer justificativa (reason)
4. ✅ Deve ser auditado rigorosamente

**Casos de Uso:**
- Permissão temporária para um usuário
- Acesso excepcional a uma funcionalidade
- Revogação específica de uma permissão herdada

**Dados Atuais:** 28 permissões diretas

---

### 8. 🔓 **user_sessions** - Sessões de Usuários

**Propósito:** Gerencia sessões ativas dos usuários (JWT, autenticação).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único da sessão |
| `user_id` | UUID | NO | - | FK para users |
| `token` | TEXT | NO | - | Token JWT da sessão |
| `ip_address` | VARCHAR(45) | YES | - | IP do cliente |
| `user_agent` | TEXT | YES | - | User agent do navegador |
| `expires_at` | TIMESTAMP | NO | - | Quando a sessão expira |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE

**Índices:**
- `user_sessions_pkey` - PRIMARY KEY (id)
- `idx_user_sessions_user_id` - INDEX (user_id)
- `idx_user_sessions_token` - INDEX (token)

**Regras de Negócio:**
1. ✅ Cada login cria uma nova sessão
2. ✅ Token é JWT assinado com secret
3. ✅ Sessões expiram automaticamente (default: 1h)
4. ✅ Logout invalida a sessão
5. ✅ Cleanup automático de sessões expiradas

**Dados Atuais:** 0 sessões (nenhuma ativa)

---

### 9. 🚨 **login_attempts** - Tentativas de Login

**Propósito:** Registra tentativas de login para segurança (rate limiting, bloqueio).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `username` | VARCHAR(50) | NO | - | Username tentado |
| `ip_address` | VARCHAR(45) | YES | - | IP de origem |
| `success` | BOOLEAN | YES | false | Se o login foi bem-sucedido |
| `error_message` | TEXT | YES | - | Mensagem de erro |
| `user_agent` | TEXT | YES | - | User agent |
| `attempted_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Quando tentou |
| `environment` | VARCHAR(20) | YES | - | Ambiente (dev/prod) |

**Índices:**
- `login_attempts_pkey` - PRIMARY KEY (id)
- `idx_login_attempts_username` - INDEX (username)
- `idx_login_attempts_ip_address` - INDEX (ip_address)
- `idx_login_attempts_attempted_at` - INDEX (attempted_at)

**Regras de Negócio:**
1. ✅ Registra TODAS as tentativas (sucesso e falha)
2. ✅ Rate limiting: 5 tentativas falhas = bloqueio de 15 min
3. ✅ Bloqueio por IP e por username
4. ✅ Limpeza automática de registros antigos (>90 dias)

**Proteções Ativas:**
- Rate limiting por username
- Rate limiting por IP
- Account lockout (bloqueio de conta)

**Dados Atuais:** 0 tentativas registradas

---

### 10. ⚙️ **email_settings** - Configurações de Email

**Propósito:** Armazena configurações SMTP para envio de emails.

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `smtp_host` | VARCHAR(255) | NO | - | Host SMTP (ex: smtp.gmail.com) |
| `smtp_port` | INTEGER | NO | - | Porta SMTP (587, 465, etc) |
| `smtp_secure` | BOOLEAN | YES | false | Se usa SSL/TLS |
| `smtp_username` | VARCHAR(255) | YES | - | Username SMTP |
| `smtp_password` | VARCHAR(255) | YES | - | Senha SMTP (criptografada) |
| `from_email` | VARCHAR(255) | NO | - | Email remetente |
| `from_name` | VARCHAR(255) | YES | - | Nome do remetente |
| `is_active` | BOOLEAN | YES | true | Se está ativa |
| `environment` | VARCHAR(20) | YES | 'development' | Ambiente (dev/prod) |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de atualização |

**Índices:**
- `email_settings_pkey` - PRIMARY KEY (id)
- `idx_email_settings_environment` - INDEX (environment)
- `idx_email_settings_is_active` - INDEX (is_active)

**Regras de Negócio:**
1. ✅ Apenas uma configuração ativa por ambiente
2. ✅ Senha deve ser criptografada antes de salvar
3. ✅ Configurações de desenvolvimento não enviam emails reais
4. ✅ Produção requer configurações validadas

**Configuração Atual:**
- **Host:** smtp.gmail.com
- **Port:** 587
- **Secure:** false (STARTTLS)
- **From:** noreply@netimobiliaria.com.br

**Dados Atuais:** 1 configuração

---

### 11. 📧 **email_templates** - Templates de Email

**Propósito:** Armazena templates HTML para emails do sistema.

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `name` | VARCHAR(100) | NO | - | Nome do template (único) |
| `subject` | VARCHAR(255) | NO | - | Assunto do email |
| `html_content` | TEXT | NO | - | Conteúdo HTML |
| `text_content` | TEXT | YES | - | Conteúdo texto puro (fallback) |
| `variables` | JSONB | YES | - | Variáveis disponíveis |
| `is_active` | BOOLEAN | YES | true | Se está ativo |
| `category` | VARCHAR(50) | YES | - | Categoria (2fa, reset-password, etc) |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |

**Índices:**
- `email_templates_pkey` - PRIMARY KEY (id)
- `email_templates_name_key` - UNIQUE (name)
- `idx_email_templates_category` - INDEX (category)

**Regras de Negócio:**
1. ✅ Nome deve ser único
2. ✅ HTML suporta variáveis: {{variavel}}
3. ✅ Variables define placeholders disponíveis
4. ✅ Sempre ter fallback texto puro

**Templates Atuais:**
1. **2fa-code** - Código de autenticação 2FA
   - Variáveis: `{{code}}`, `{{expiration_minutes}}`
2. **password-reset** - Recuperação de senha
   - Variáveis: `{{reset_link}}`, `{{expiration_hours}}`

**Dados Atuais:** 2 templates

---

### 12. 📋 **email_logs** - Logs de Emails

**Propósito:** Registra todos os emails enviados pelo sistema (auditoria).

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `to_email` | VARCHAR(255) | YES | - | Destinatário |
| `subject` | VARCHAR(255) | YES | - | Assunto |
| `template_name` | VARCHAR(100) | YES | - | Nome do template usado |
| `success` | BOOLEAN | YES | false | Se foi enviado com sucesso |
| `error_message` | TEXT | YES | - | Mensagem de erro (se falhou) |
| `sent_at` | TIMESTAMP | YES | - | Quando foi enviado |
| `environment` | VARCHAR(20) | YES | - | Ambiente (dev/prod) |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |

**Índices:**
- `email_logs_pkey` - PRIMARY KEY (id)
- `idx_email_logs_template_name` - INDEX (template_name)
- `idx_email_logs_sent_at` - INDEX (sent_at)

**Regras de Negócio:**
1. ✅ Registra TODOS os envios (sucesso e falha)
2. ✅ Limpeza automática de logs antigos (>180 dias)
3. ✅ Não armazena conteúdo completo (apenas metadados)

**Dados Atuais:** 0 logs (nenhum email enviado ainda)

---

### 13. 🔐 **system_2fa_settings** - Configurações 2FA

**Propósito:** Configurações globais do sistema 2FA.

**Estrutura:**

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | INTEGER | NO | nextval() | ID único |
| `environment` | VARCHAR(20) | NO | 'development' | Ambiente |
| `code_length` | INTEGER | YES | 6 | Tamanho do código |
| `code_expiration_minutes` | INTEGER | YES | 10 | Expiração em minutos |
| `max_attempts` | INTEGER | YES | 3 | Tentativas máximas |
| `require_for_admin` | BOOLEAN | YES | true | Obrigatório para admins |
| `require_for_all` | BOOLEAN | YES | false | Obrigatório para todos |
| `email_template_name` | VARCHAR(100) | YES | '2fa-code' | Template de email |
| `is_active` | BOOLEAN | YES | true | Se está ativo |
| `lockout_duration_minutes` | INTEGER | YES | 15 | Duração do bloqueio |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Data de atualização |

**Índices:**
- `system_2fa_settings_pkey` - PRIMARY KEY (id)
- `idx_system_2fa_settings_environment` - INDEX (environment)

**Regras de Negócio:**
1. ✅ Apenas uma configuração ativa por ambiente
2. ✅ Código gerado: 6 dígitos aleatórios
3. ✅ Expiração: 10 minutos
4. ✅ Máximo 3 tentativas erradas = bloqueio 15 min

**Configuração Atual:**
- **Development:** 2FA opcional
- **Production:** 2FA obrigatório para admins

**Dados Atuais:** 3 configurações (uma por ambiente)

---

## 🔄 DIAGRAMAS DE RELACIONAMENTO

### Diagrama Geral (ER)

```
┌──────────────────────┐
│      users           │
│ ─────────────────────│
│ • id (PK)            │◄────┐
│ • username (UQ)      │     │
│ • email (UQ)         │     │
│ • password           │     │
│ • two_fa_enabled     │     │
└──────────────────────┘     │
           │                 │
           │ 1:N             │
           ▼                 │
┌──────────────────────┐     │
│user_role_assignments │     │
│ ─────────────────────│     │
│ • id (PK)            │     │
│ • user_id (FK)       ├─────┘
│ • role_id (FK)       ├─────┐
│ • assigned_by (FK)   │     │
└──────────────────────┘     │
           │                 │
           │ N:1             │
           ▼                 │
┌──────────────────────┐     │
│    user_roles        │◄────┘
│ ─────────────────────│
│ • id (PK)            │◄────┐
│ • name (UQ)          │     │
│ • level              │     │
│ • two_fa_required    │     │
└──────────────────────┘     │
           │                 │
           │ 1:N             │
           ▼                 │
┌──────────────────────┐     │
│  role_permissions    │     │
│ ─────────────────────│     │
│ • id (PK)            │     │
│ • role_id (FK)       ├─────┘
│ • permission_id (FK) ├─────┐
│ • granted_by (FK)    │     │
└──────────────────────┘     │
           │                 │
           │ N:1             │
           ▼                 │
┌──────────────────────┐     │
│    permissions       │◄────┘
│ ─────────────────────│
│ • id (PK)            │
│ • feature_id (FK)    ├─────┐
│ • action             │     │
│ • description        │     │
└──────────────────────┘     │
                             │
                             │ N:1
                             ▼
                   ┌──────────────────────┐
                   │  system_features     │
                   │ ─────────────────────│
                   │ • id (PK)            │
                   │ • name               │
                   │ • category           │
                   │ • parent_id (FK)     │
                   └──────────────────────┘
```

### Diagrama de Autenticação

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │  1:N    │user_sessions │  N:1    │login_attempts│
│              ├────────►│              │◄────────┤              │
│ • username   │         │ • token      │         │ • username   │
│ • password   │         │ • expires_at │         │ • success    │
│ • two_fa_*   │         │ • ip_address │         │ • ip_address │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Diagrama de Email

```
┌──────────────────┐         ┌──────────────────┐
│ email_settings   │         │ email_templates  │
│                  │         │                  │
│ • smtp_host      │         │ • name           │
│ • smtp_port      │         │ • html_content   │
│ • from_email     │         │ • variables      │
└──────────────────┘         └──────────────────┘
        │                            │
        │                            │
        └────────────┬───────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   email_logs     │
            │                  │
            │ • to_email       │
            │ • template_name  │
            │ • success        │
            └──────────────────┘
```

---

## 🔐 FLUXOS DE AUTENTICAÇÃO

### 1. Login Simples (Sem 2FA)

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Cliente │                │   API   │                │Banco Dados│
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ POST /api/auth/login     │                           │
     │ {username, password}     │                           │
     ├─────────────────────────►│                           │
     │                          │ SELECT * FROM users       │
     │                          │ WHERE username=?          │
     │                          ├──────────────────────────►│
     │                          │                           │
     │                          │◄──────────────────────────┤
     │                          │ user{id, password_hash}   │
     │                          │                           │
     │                          │ bcrypt.compare()          │
     │                          │ ✓ Senha válida            │
     │                          │                           │
     │                          │ jwt.sign()                │
     │                          │ ✓ Token gerado            │
     │                          │                           │
     │                          │ INSERT INTO user_sessions │
     │                          ├──────────────────────────►│
     │                          │                           │
     │                          │ INSERT INTO login_attempts│
     │                          │ (success=true)            │
     │                          ├──────────────────────────►│
     │                          │                           │
     │◄─────────────────────────┤                           │
     │ {token, user, expires}   │                           │
     │                          │                           │
```

### 2. Login com 2FA

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐
│ Cliente │     │   API   │     │Banco Dados│     │ Email  │
└────┬────┘     └────┬────┘     └─────┬────┘     └───┬────┘
     │               │                 │               │
     │ POST /api/auth/login            │               │
     │ {username, password}            │               │
     ├──────────────►│                 │               │
     │               │ SELECT user     │               │
     │               ├────────────────►│               │
     │               │ bcrypt.compare()│               │
     │               │ ✓ Senha OK      │               │
     │               │                 │               │
     │               │ Verifica 2FA    │               │
     │               │ two_fa_enabled? │               │
     │               │ ✓ SIM           │               │
     │               │                 │               │
     │               │ Gera código 6   │               │
     │               │ dígitos         │               │
     │               │                 │               │
     │               │ Salva código +  │               │
     │               │ expiração       │               │
     │               ├────────────────►│               │
     │               │                 │               │
     │               │ GET template    │               │
     │               ├────────────────►│               │
     │               │                 │               │
     │               │ Envia email     │               │
     │               ├─────────────────┼──────────────►│
     │               │                 │  📧 Código    │
     │◄──────────────┤                 │               │
     │ {requires2fa: true}             │               │
     │                                 │               │
     │ POST /api/auth/2fa/verify       │               │
     │ {code}                          │               │
     ├──────────────►│                 │               │
     │               │ SELECT código   │               │
     │               ├────────────────►│               │
     │               │ Verifica:       │               │
     │               │ • código válido?│               │
     │               │ • não expirou?  │               │
     │               │ • max attempts? │               │
     │               │ ✓ OK            │               │
     │               │                 │               │
     │               │ jwt.sign()      │               │
     │               │ INSERT session  │               │
     │               ├────────────────►│               │
     │◄──────────────┤                 │               │
     │ {token, user}                   │               │
```

### 3. Logout

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Cliente │                │   API   │                │Banco Dados│
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ POST /api/auth/logout    │                           │
     │ Header: Bearer {token}   │                           │
     ├─────────────────────────►│                           │
     │                          │ jwt.verify(token)         │
     │                          │ ✓ Token válido            │
     │                          │                           │
     │                          │ DELETE FROM user_sessions │
     │                          │ WHERE token=?             │
     │                          ├──────────────────────────►│
     │                          │                           │
     │                          │ DELETE códigos 2FA        │
     │                          ├──────────────────────────►│
     │                          │                           │
     │◄─────────────────────────┤                           │
     │ {success: true}          │                           │
```

---

## ⚖️ FLUXOS DE AUTORIZAÇÃO

### 1. Verificação de Permissão (RBAC)

```
┌─────────┐          ┌────────────┐          ┌──────────┐
│ Cliente │          │Middleware  │          │Banco Dados│
└────┬────┘          └─────┬──────┘          └─────┬────┘
     │                     │                       │
     │ GET /api/admin/imoveis                      │
     │ Header: Bearer {token}                      │
     ├────────────────────►│                       │
     │                     │ jwt.verify(token)     │
     │                     │ ✓ Token válido        │
     │                     │ userId extraído       │
     │                     │                       │
     │                     │ Buscar permissões:    │
     │                     │ SELECT permissions    │
     │                     │ FROM users u          │
     │                     │ JOIN user_role_       │
     │                     │   assignments ura     │
     │                     │ JOIN role_permissions │
     │                     │   rp                  │
     │                     │ JOIN permissions p    │
     │                     │ JOIN system_features  │
     │                     │   sf                  │
     │                     │ WHERE u.id=userId     │
     │                     │   AND sf.category=    │
     │                     │     'imoveis'         │
     │                     ├──────────────────────►│
     │                     │                       │
     │                     │◄──────────────────────┤
     │                     │ permissions:          │
     │                     │ [{action:'list'}]     │
     │                     │                       │
     │                     │ Verifica se tem       │
     │                     │ permissão 'list'      │
     │                     │ ✓ TEM                 │
     │                     │                       │
     │                     │ next() → controller   │
     │◄────────────────────┤                       │
     │ {imoveis: [...]}    │                       │
```

### 2. Hierarquia de Perfis

```
Requisição: Editar usuário X

┌─────────────────────────────────────────────┐
│ 1. Verificar nível do usuário solicitante  │
│    SELECT level FROM user_roles             │
│    JOIN user_role_assignments               │
│    WHERE user_id = solicitante_id           │
│    → level_solicitante = 50 (Admin)         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 2. Verificar nível do usuário alvo         │
│    SELECT level FROM user_roles             │
│    JOIN user_role_assignments               │
│    WHERE user_id = alvo_id                  │
│    → level_alvo = 10 (Corretor)             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 3. Comparar níveis                          │
│    if (level_solicitante > level_alvo) {    │
│      ✅ PERMITIR                             │
│    } else {                                  │
│      ❌ NEGAR                                │
│    }                                         │
│    → 50 > 10 = TRUE ✅                       │
└─────────────────────────────────────────────┘
```

### 3. Permissões Diretas vs Perfil

```
Buscar permissões para usuário:

┌─────────────────────────────────────────────┐
│ 1. Buscar permissões do PERFIL             │
│    FROM role_permissions                    │
│    WHERE role_id IN (                       │
│      SELECT role_id                         │
│      FROM user_role_assignments             │
│      WHERE user_id = ?                      │
│    )                                         │
│    → permissoes_perfil = [A, B, C]          │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 2. Buscar permissões DIRETAS                │
│    FROM user_permissions                    │
│    WHERE user_id = ?                        │
│      AND (expires_at IS NULL                │
│           OR expires_at > NOW())            │
│    → permissoes_diretas = [B*, D]           │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 3. MESCLAR (diretas sobrescrevem perfil)   │
│    permissoes_finais = {                    │
│      ...permissoes_perfil,                  │
│      ...permissoes_diretas  // override     │
│    }                                         │
│    → permissoes_finais = [A, B*, C, D]      │
└─────────────────────────────────────────────┘
```

---

## 📧 SISTEMA DE EMAIL

### Fluxo de Envio de Email

```
┌────────────┐     ┌──────────────┐     ┌────────────┐     ┌────────┐
│  Aplicação │     │emailService  │     │Banco Dados │     │  SMTP  │
└─────┬──────┘     └──────┬───────┘     └──────┬─────┘     └───┬────┘
      │                   │                     │                │
      │ sendEmail()       │                     │                │
      │ {to, template}    │                     │                │
      ├──────────────────►│                     │                │
      │                   │ GET settings        │                │
      │                   ├────────────────────►│                │
      │                   │ {smtp_host, port}   │                │
      │                   │◄────────────────────┤                │
      │                   │                     │                │
      │                   │ GET template        │                │
      │                   ├────────────────────►│                │
      │                   │ {html, subject}     │                │
      │                   │◄────────────────────┤                │
      │                   │                     │                │
      │                   │ Replace variables   │                │
      │                   │ {{code}} → 123456   │                │
      │                   │                     │                │
      │                   │ nodemailer.send()   │                │
      │                   ├─────────────────────┼───────────────►│
      │                   │                     │     📧          │
      │                   │◄────────────────────┼────────────────┤
      │                   │ {success: true}     │                │
      │                   │                     │                │
      │                   │ INSERT email_log    │                │
      │                   ├────────────────────►│                │
      │◄──────────────────┤                     │                │
      │ {sent: true}      │                     │                │
```

### Templates Disponíveis

#### 1. **2fa-code** - Código 2FA

**Variáveis:**
- `{{code}}` - Código de 6 dígitos
- `{{expiration_minutes}}` - Minutos até expirar (10)

**HTML (resumido):**
```html
<div style="max-width: 600px; margin: 0 auto;">
  <h1>Código de Verificação</h1>
  <p>Seu código de autenticação de dois fatores é:</p>
  <div style="font-size: 32px; font-weight: bold;">
    {{code}}
  </div>
  <p>Este código expira em {{expiration_minutes}} minutos.</p>
</div>
```

#### 2. **password-reset** - Recuperação de Senha

**Variáveis:**
- `{{reset_link}}` - Link para redefinir senha
- `{{expiration_hours}}` - Horas até expirar (24)

---

## 🔐 SISTEMA 2FA

### Configurações por Ambiente

| Config | Development | Production |
|--------|-------------|------------|
| **Ativo** | ✅ Sim | ✅ Sim |
| **Código** | 6 dígitos | 6 dígitos |
| **Expiração** | 10 min | 10 min |
| **Max Tentativas** | 3 | 3 |
| **Bloqueio** | 15 min | 15 min |
| **Obrigatório Admin** | ❌ Não | ✅ Sim |
| **Obrigatório Todos** | ❌ Não | ❌ Não |

### Fluxo 2FA Completo

```
1. LOGIN
   ├─ Valida username/password
   ├─ Verifica se usuário tem 2FA habilitado
   │  └─ OU se perfil requer 2FA
   └─ Se SIM:
      ├─ Gera código aleatório (6 dígitos)
      ├─ Salva no banco com expiração (10 min)
      ├─ Envia por email
      └─ Retorna {requires2fa: true}

2. VERIFICAÇÃO
   ├─ Usuário insere código
   ├─ API valida:
   │  ├─ Código correto?
   │  ├─ Não expirou?
   │  └─ Não excedeu tentativas?
   └─ Se OK:
      ├─ Cria sessão (JWT)
      ├─ Remove código usado
      └─ Retorna {token, user}

3. BLOQUEIO (se 3 tentativas erradas)
   ├─ Marca usuário como bloqueado
   ├─ Define lockout até (NOW + 15 min)
   └─ Impede novos códigos até fim do bloqueio
```

---

## 📊 AUDITORIA E LOGS

### Tabelas de Auditoria

1. **login_attempts** - Todas as tentativas de login
2. **email_logs** - Todos os emails enviados
3. **role_permissions** - Quem concedeu permissão (granted_by)
4. **user_permissions** - Quem concedeu + motivo
5. **user_role_assignments** - Quem atribuiu perfil

### Informações Auditadas

#### Login Attempts
```sql
SELECT 
  username,
  ip_address,
  success,
  attempted_at
FROM login_attempts
WHERE attempted_at >= NOW() - INTERVAL '24 hours'
ORDER BY attempted_at DESC;
```

#### Email Logs
```sql
SELECT 
  to_email,
  template_name,
  success,
  sent_at
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC;
```

#### Permission Changes
```sql
SELECT 
  rp.id,
  ur.name as role_name,
  p.action,
  sf.category,
  u.username as granted_by,
  rp.granted_at
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN users u ON rp.granted_by = u.id
ORDER BY rp.granted_at DESC
LIMIT 100;
```

---

## 🛡️ SEGURANÇA

### Proteções Implementadas

#### 1. **Senhas**
- ✅ Hash bcrypt (min 10 rounds)
- ✅ Salt único por senha
- ✅ Nunca armazenadas em texto puro
- ✅ Validação de complexidade no frontend

#### 2. **Tokens JWT**
- ✅ Assinados com secret seguro
- ✅ Expiração configurável (1h padrão)
- ✅ Payload inclui permissões
- ✅ Invalidados no logout

#### 3. **Rate Limiting**
- ✅ 5 tentativas de login por 15 min (por username)
- ✅ 10 tentativas de login por 15 min (por IP)
- ✅ 3 tentativas de código 2FA por 15 min

#### 4. **Account Lockout**
- ✅ Bloqueio após 5 tentativas falhas
- ✅ Duração: 15 minutos
- ✅ Notificação por email (opcional)

#### 5. **2FA**
- ✅ Código de 6 dígitos
- ✅ Expiração: 10 minutos
- ✅ Máximo 3 tentativas
- ✅ Código descartado após uso

#### 6. **SQL Injection**
- ✅ Prepared statements em todas as queries
- ✅ Parametrização de valores
- ✅ Validação de inputs

#### 7. **XSS**
- ✅ Sanitização de HTML
- ✅ Content Security Policy
- ✅ HttpOnly cookies

#### 8. **CSRF**
- ✅ Tokens CSRF em formulários
- ✅ SameSite cookies
- ✅ Origin validation

---

## 💼 CASOS DE USO

### Caso 1: Criar Novo Usuário

```sql
-- 1. Criar usuário
INSERT INTO users (username, email, password, nome, ativo)
VALUES ('joao.silva', 'joao@example.com', '$2b$...', 'João Silva', true)
RETURNING id;

-- 2. Atribuir perfil
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES ('uuid-do-joao', 3, 'uuid-do-admin');

-- Resultado: João tem perfil "Corretor" (level 10)
-- Herda automaticamente todas as permissões do perfil
```

### Caso 2: Dar Permissão Temporária

```sql
-- Dar permissão de exportação por 7 dias
INSERT INTO user_permissions (
  user_id, 
  permission_id, 
  granted_by, 
  expires_at, 
  reason
)
VALUES (
  'uuid-do-joao',
  45, -- permissão de exportar relatórios
  'uuid-do-admin',
  NOW() + INTERVAL '7 days',
  'Projeto especial - relatório trimestral'
);

-- Após 7 dias, permissão expira automaticamente
```

### Caso 3: Criar Novo Perfil Personalizado

```sql
-- 1. Criar perfil
INSERT INTO user_roles (name, description, level, two_fa_required)
VALUES ('Vendedor', 'Vendedor de imóveis', 15, false)
RETURNING id;

-- 2. Atribuir permissões
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  7, -- id do perfil Vendedor
  p.id,
  'uuid-do-super-admin'
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category IN ('imoveis', 'clientes')
  AND p.action IN ('list', 'create', 'update');

-- Resultado: Vendedor pode listar, criar e editar imóveis e clientes
-- MAS NÃO pode deletar
```

### Caso 4: Ativar 2FA para Usuário

```sql
-- 1. Habilitar 2FA
UPDATE users 
SET two_fa_enabled = true,
    two_fa_secret = 'secret-gerado'
WHERE id = 'uuid-do-usuario';

-- 2. No próximo login:
--    - Sistema detecta two_fa_enabled = true
--    - Gera código 6 dígitos
--    - Envia por email
--    - Solicita verificação
```

### Caso 5: Auditoria de Permissões

```sql
-- Ver todas as permissões de um usuário
SELECT 
  'PERFIL' as origem,
  ur.name as perfil,
  sf.category as recurso,
  p.action as acao,
  rp.granted_at as data
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'joao.silva'

UNION ALL

SELECT 
  'DIRETA' as origem,
  'N/A' as perfil,
  sf.category as recurso,
  p.action as acao,
  up.granted_at as data
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'joao.silva'
  AND (up.expires_at IS NULL OR up.expires_at > NOW())
ORDER BY data DESC;
```

---

## 📖 GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **RBAC** | Role-Based Access Control - Controle de acesso baseado em perfis |
| **2FA** | Two-Factor Authentication - Autenticação de dois fatores |
| **JWT** | JSON Web Token - Token de autenticação assinado |
| **bcrypt** | Algoritmo de hash para senhas |
| **SMTP** | Simple Mail Transfer Protocol - Protocolo de envio de email |
| **FK** | Foreign Key - Chave estrangeira |
| **PK** | Primary Key - Chave primária |
| **UQ** | Unique - Restrição de unicidade |
| **CASCADE** | Em cascata - Propaga operações (delete, update) |

---

**Documento gerado em:** 2025-10-08  
**Versão:** 2.0  
**Última atualização:** 2025-10-08
