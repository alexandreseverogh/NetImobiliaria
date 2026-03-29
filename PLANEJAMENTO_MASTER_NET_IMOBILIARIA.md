# 🚀 **PLANEJAMENTO MASTER - SISTEMA ROBUSTO NET IMOBILIÁRIA**

## **📊 VISÃO GERAL DO PROJETO**

### **Objetivo Principal**
Desenvolver uma **plataforma administrativa completa** em ambiente local (sem SSL) e posteriormente migrar para produção (com SSL), incluindo:
- ✅ **Sistema completo de 2FA por email**
- ✅ **Sidebar dinâmica**
- ✅ **Gestão de usuários**
- ✅ **Gestão de perfis**
- ✅ **Gestão de permissões**
- ✅ **Sistema de auditoria**
- ✅ **Migração segura para produção**

---

## **🏗️ ARQUITETURA DO SISTEMA**

### **1. FASE DE DESENVOLVIMENTO (Local - Sem SSL)**
```
📁 Development Environment
├── 🏠 localhost:3000
├── 📧 Email SMTP (Gmail/Outlook)
├── 🍪 Cookies não seguros
├── 🔐 2FA funcional
├── 🗄️ Banco local PostgreSQL
└── 🛠️ Hot reload ativo
```

### **2. FASE DE PRODUÇÃO (VPS - Com SSL)**
```
📁 Production Environment
├── 🌐 domínio.com.br
├── 📧 Email SMTP profissional
├── 🍪 Cookies seguros
├── 🔐 2FA com SSL
├── 🗄️ Banco PostgreSQL VPS
└── 🚀 Performance otimizada
```

---

## **🗄️ ESQUEMA DE BANCO DE DADOS**

### **1. TABELAS DE AUTENTICAÇÃO E 2FA**
```sql
-- Usuários do sistema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100),
    telefone VARCHAR(20),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Configurações 2FA por usuário
CREATE TABLE user_2fa_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    email VARCHAR(100),
    phone_number VARCHAR(20),
    secret_key VARCHAR(32),
    is_enabled BOOLEAN DEFAULT false,
    backup_codes TEXT[],
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, method)
);

-- Códigos 2FA temporários
CREATE TABLE user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações globais de 2FA
CREATE TABLE system_2fa_settings (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    required_for_roles INTEGER[],
    optional_for_roles INTEGER[],
    code_length INTEGER DEFAULT 6,
    code_expiry_minutes INTEGER DEFAULT 10,
    max_attempts INTEGER DEFAULT 3,
    email_template TEXT,
    email_from VARCHAR(100) DEFAULT 'noreply@localhost',
    email_subject VARCHAR(200) DEFAULT 'Código de Verificação - Net Imobiliária',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessões ativas
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_2fa_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de tentativas de login
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. TABELAS DE PERFIS E PERMISSÕES**
```sql
-- Perfis de usuário
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,
    is_system_role BOOLEAN DEFAULT false,
    requires_2fa BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Associação usuário-perfil
CREATE TABLE user_role_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Funcionalidades do sistema
CREATE TABLE system_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    url VARCHAR(255),
    icon VARCHAR(50),
    category VARCHAR(50),
    parent_id INTEGER REFERENCES system_features(id),
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    requires_permission BOOLEAN DEFAULT true,
    requires_2fa BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Permissões específicas
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    feature_id INTEGER REFERENCES system_features(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    description TEXT,
    is_system_permission BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feature_id, action)
);

-- Associação perfil-permissão
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);
```

### **3. SISTEMA DE AUDITORIA**
```sql
-- Logs de auditoria
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs específicos de 2FA
CREATE TABLE audit_2fa_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    method VARCHAR(20),
    success BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **4. CONFIGURAÇÕES DE EMAIL**
```sql
-- Configurações de email do sistema
CREATE TABLE email_settings (
    id SERIAL PRIMARY KEY,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    smtp_secure BOOLEAN DEFAULT false, -- false para desenvolvimento
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    environment VARCHAR(20) DEFAULT 'development', -- development/production
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates de email
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255),
    html_content TEXT,
    text_content TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de emails enviados
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255),
    subject VARCHAR(255),
    template_name VARCHAR(100),
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP,
    environment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## **🔧 IMPLEMENTAÇÃO POR FASES**

### **FASE 1: FUNDAÇÃO E SEGURANÇA LOCAL (Semana 1-2)**

#### **1.1 Setup do Banco de Dados Local**
- [ ] **Dia 1-2**: Criar todas as tabelas do esquema
- [ ] **Dia 3**: Executar migrations e seed inicial
- [ ] **Dia 4**: Criar índices para performance
- [ ] **Dia 5**: Configurar triggers para auditoria

#### **1.2 Sistema de Email 2FA (Desenvolvimento)**
- [ ] **Dia 6**: Configurar Nodemailer com Gmail/Outlook
- [ ] **Dia 7**: Criar templates de email para 2FA
- [ ] **Dia 8**: Implementar geração e validação de códigos
- [ ] **Dia 9**: Sistema de códigos de backup
- [ ] **Dia 10**: Testes de envio de email local

#### **1.3 APIs de Autenticação com 2FA**
- [ ] **Dia 11**: `/api/admin/auth/login` - Login com 2FA
- [ ] **Dia 12**: `/api/admin/auth/2fa/*` - Endpoints de 2FA
- [ ] **Dia 13**: `/api/admin/auth/logout` - Logout seguro
- [ ] **Dia 14**: Middleware de validação 2FA

#### **1.4 Segurança e Configurações Locais**
- [ ] **Dia 15**: Rate limiting para tentativas de login
- [ ] **Dia 16**: Bloqueio de conta por tentativas falhadas
- [ ] **Dia 17**: Logs de segurança e auditoria
- [ ] **Dia 18**: Configurações de desenvolvimento (secure: false)

### **FASE 2: GESTÃO DE PERFIS (Semana 3-4)**

#### **2.1 Interface de Perfis**
- [ ] **Dia 19-20**: Página `/admin/roles` com configuração 2FA
- [ ] **Dia 21**: Modal de criação/edição com opções 2FA
- [ ] **Dia 22**: Configuração de permissões por perfil
- [ ] **Dia 23**: Clonagem de perfis com herança de 2FA

#### **2.2 Sistema de Permissões**
- [ ] **Dia 24**: Interface para configurar permissões
- [ ] **Dia 25**: Matriz de permissões com validação 2FA
- [ ] **Dia 26**: Validação de hierarquia de perfis
- [ ] **Dia 27**: Bulk operations para permissões

### **FASE 3: FUNCIONALIDADES DINÂMICAS (Semana 5-6)**

#### **3.1 Gestão de Funcionalidades**
- [ ] **Dia 28-29**: Página `/admin/features` com configuração 2FA
- [ ] **Dia 30**: Categorização de funcionalidades
- [ ] **Dia 31**: Ícones personalizados
- [ ] **Dia 32**: URLs dinâmicas com validação de segurança

#### **3.2 Sidebar Dinâmica**
- [ ] **Dia 33**: API `/api/admin/sidebar` com verificação 2FA
- [ ] **Dia 34**: Interface drag-and-drop para reordenação
- [ ] **Dia 35**: Configuração por perfil
- [ ] **Dia 36**: Preview em tempo real

### **FASE 4: GESTÃO DE USUÁRIOS (Semana 7-8)**

#### **4.1 Interface Avançada**
- [ ] **Dia 37-38**: Página `/admin/users` com status 2FA
- [ ] **Dia 39**: Filtros e busca avançada
- [ ] **Dia 40**: Bulk operations com validação 2FA
- [ ] **Dia 41**: Import/Export de usuários

#### **4.2 Gestão de Sessões e 2FA**
- [ ] **Dia 42**: Monitoramento de sessões ativas
- [ ] **Dia 43**: Revogação de sessões
- [ ] **Dia 44**: Logs de login/logout com 2FA
- [ ] **Dia 45**: Segurança avançada

### **FASE 5: SISTEMA DE AUDITORIA (Semana 9-10)**

#### **5.1 Logs de Auditoria**
- [ ] **Dia 46-47**: Página `/admin/audit` com filtros 2FA
- [ ] **Dia 48**: Filtros avançados por tipo de evento
- [ ] **Dia 49**: Export de relatórios
- [ ] **Dia 50**: Alertas de segurança

#### **5.2 Configurações de Auditoria**
- [ ] **Dia 51**: Configurar o que auditar
- [ ] **Dia 52**: Retenção de logs
- [ ] **Dia 53**: Notificações automáticas
- [ ] **Dia 54**: Dashboard de auditoria

### **FASE 6: CONFIGURAÇÕES E TESTES (Semana 11-12)**

#### **6.1 Configurações do Sistema**
- [ ] **Dia 55-56**: Página `/admin/settings` com configurações 2FA
- [ ] **Dia 57**: Configurações por módulo
- [ ] **Dia 58**: Backup/Restore de configurações
- [ ] **Dia 59**: Validação de configurações

#### **6.2 Testes Completos e Documentação**
- [ ] **Dia 60**: Testes de integração completos
- [ ] **Dia 61**: Testes de segurança
- [ ] **Dia 62**: Documentação completa
- [ ] **Dia 63**: Preparação para migração

### **FASE 7: MIGRAÇÃO PARA PRODUÇÃO (Semana 13-14)**

#### **7.1 Preparação da VPS**
- [ ] **Dia 64**: Configuração da VPS
- [ ] **Dia 65**: Instalação do PostgreSQL
- [ ] **Dia 66**: Configuração do Nginx
- [ ] **Dia 67**: Instalação do certificado SSL

#### **7.2 Migração do Sistema**
- [ ] **Dia 68**: Backup do banco local
- [ ] **Dia 69**: Restore na VPS
- [ ] **Dia 70**: Configuração de produção
- [ ] **Dia 71**: Testes de produção

#### **7.3 Configurações de Segurança**
- [ ] **Dia 72**: Ativação de SSL
- [ ] **Dia 73**: Configuração de cookies seguros
- [ ] **Dia 74**: Configuração de SMTP profissional
- [ ] **Dia 75**: Testes finais de segurança

#### **7.4 Go-Live e Monitoramento**
- [ ] **Dia 76**: Deploy em produção
- [ ] **Dia 77**: Monitoramento de logs
- [ ] **Dia 78**: Ajustes finais
- [ ] **Dia 79**: Documentação de produção
- [ ] **Dia 80**: Treinamento da equipe

### **FASE 8: COMUNICAÇÃO OMNICHANNEL (CHATWOOT) (Semana 15-16)**

#### **8.1 Configuração e Infraestrutura**
- [ ] **Dia 81**: Instalação do Chatwoot via Docker na VPS
- [ ] **Dia 82**: Configuração de Inboxes (WhatsApp e Instagram)
- [ ] **Dia 83**: Criação de Equipes por Área de Atuação

#### **8.2 Integração com Motor de IA**
- [ ] **Dia 84**: Conexão da Orquestração Concierge ao Agent Bot
- [ ] **Dia 85**: Implementação de Notas Privadas para Handover
- [ ] **Dia 86**: Sincronização de Atributos Customizados (Sonho/Preço)

#### **8.3 Dashboards e Automações**
- [ ] **Dia 87**: Desenvolvimento do Dashboard App (Net Widget na sidebar)
- [ ] **Dia 88**: Webhooks de Sincronia de Status Kanban
- [ ] **Dia 89**: Implementação de Módulo de Áudio (Whisper/TTS)
- [ ] **Dia 90**: Testes de ponta a ponta (Lead -> Áudio -> IA -> Chatwoot -> Humano)
- [ ] **Dia 91**: Go-Live Atendimento Omnichannel (+ Voz Nível 1)

#### 9.1 Fluxo Operacional de Campanhas (Proprietários ↔ Imóveis ↔ Compradores)

**Objetivo:** Disparar campanhas somente quando houver imóveis disponíveis para o público‑alvo, garantindo alta relevância e ROI.

**Etapas automatizadas:**
1. **Scheduler (cron, duas vezes ao dia)** verifica todas as campanhas ativas.
2. **Validação de Inventário** – consulta `imoveis` filtrados por cidade, bairro, faixa de preço etc. Se `count >= MIN_LEADS` a campanha continua; caso contrário, entra em estado *pendente*.
3. **Segmentação de Proprietários** – identifica usuários sem imóvel cadastrado (`last_property_created_at IS NULL OR >30d`) e gera lista de convite.
4. **Segmentação de Compradores** – gera lista de leads que atendem aos filtros da campanha e que têm imóveis correspondentes.
5. **Enfileiramento (BullMQ)** – cria jobs para disparo via Meta Ads API ou Chatwoot.
6. **Envio** – mensagens/ads são enviadas; webhook captura métricas (impressões, cliques, leads).
7. **Atualização de Métricas** – grava em `crm_campanha_metrics`; dashboard exibe CPL, CTR, ROI.
8. **Feedback Loop** – ajustes automáticos (expandir segmento, pausar campanha) baseados em CTR < 1 % ou leads < MIN_LEADS por 3 dias.

**Integrações:**
- **Kanban:** Leads criados a partir de campanha são inseridos na coluna *Leads – Campanha* com tag `campanha_id`.
- **Chatwoot:** Notas privadas contendo `campanha_id` permitem ao corretor rastrear a origem.
- **Segurança:** Role `marketing_manager` para criação/edição; auditoria em `crm_campanha_log`.

---

---

## **⚙️ CONFIGURAÇÕES POR AMBIENTE**

### **1. CONFIGURAÇÃO DE DESENVOLVIMENTO**
```typescript
// src/config/development.ts
export const developmentConfig = {
  // Banco de dados
  database: {
    host: 'localhost',
    port: 5432,
    database: 'net_imobiliaria_dev',
    username: 'postgres',
    password: 'Roberto@2007'
  },
  
  // Email (Gmail para desenvolvimento)
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  },
  
  // Cookies
  cookies: {
    secure: false,
    sameSite: 'lax',
    httpOnly: true
  },
  
  // 2FA
  twoFactor: {
    enabled: true,
    requiredForRoles: [1, 2], // Super Admin, Admin
    optionalForRoles: [3], // Corretor
    codeLength: 6,
    codeExpiryMinutes: 10,
    maxAttempts: 3
  },
  
  // URLs
  urls: {
    base: 'http://localhost:3000',
    admin: 'http://localhost:3000/admin',
    api: 'http://localhost:3000/api'
  }
}
```

### **2. CONFIGURAÇÃO DE PRODUÇÃO**
```typescript
// src/config/production.ts
export const productionConfig = {
  // Banco de dados
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  // Email (SMTP profissional)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  
  // Cookies
  cookies: {
    secure: true,
    sameSite: 'strict',
    httpOnly: true
  },
  
  // 2FA
  twoFactor: {
    enabled: true,
    requiredForRoles: [1, 2],
    optionalForRoles: [3],
    codeLength: 6,
    codeExpiryMinutes: 10,
    maxAttempts: 3
  },
  
  // URLs
  urls: {
    base: 'https://netimobiliaria.com.br',
    admin: 'https://netimobiliaria.com.br/admin',
    api: 'https://netimobiliaria.com.br/api'
  }
}
```

---

## **📧 SISTEMA DE EMAIL 2FA**

### **1. TEMPLATE DE EMAIL PARA DESENVOLVIMENTO**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Código de Verificação - Desenvolvimento</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f8fafc; }
        .code { font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; margin: 20px 0; padding: 20px; background: white; border: 2px solid #1e40af; border-radius: 8px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .dev-notice { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Código de Verificação</h1>
            <p>Net Imobiliária - Sistema Administrativo</p>
        </div>
        <div class="content">
            <div class="dev-notice">
                <strong>🧪 AMBIENTE DE DESENVOLVIMENTO</strong><br>
                Este é um email de teste do sistema de 2FA.
            </div>
            
            <h2>Olá, {{userName}}!</h2>
            <p>Você solicitou acesso ao sistema administrativo. Use o código abaixo para completar o login:</p>
            
            <div class="code">{{verificationCode}}</div>
            
            <p><strong>Este código expira em {{expiryMinutes}} minutos.</strong></p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                    <li>Nunca compartilhe este código com ninguém</li>
                    <li>Se você não solicitou este acesso, ignore este email</li>
                    <li>Em caso de dúvidas, entre em contato com o administrador</li>
                </ul>
            </div>
            
            <p>Atenciosamente,<br>Equipe Net Imobiliária</p>
        </div>
    </div>
</body>
</html>
```

---

## **🚀 CRONOGRAMA DETALHADO**

### **SEMANA 1-2: FUNDAÇÃO E SEGURANÇA LOCAL**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 1-2 | Banco de dados local | Schema completo | Local |
| 3 | Migrations e seed | Dados iniciais | Local |
| 4 | Índices e performance | Banco otimizado | Local |
| 5 | Triggers de auditoria | Logs automáticos | Local |
| 6 | Configurar Gmail SMTP | Email funcional | Local |
| 7 | Templates de email | Templates HTML | Local |
| 8 | Geração de códigos | Sistema de códigos | Local |
| 9 | Códigos de backup | Sistema de backup | Local |
| 10 | Testes de email | Email testado | Local |
| 11 | API de login | Login com 2FA | Local |
| 12 | Endpoints 2FA | APIs completas | Local |
| 13 | Logout seguro | Logout com limpeza | Local |
| 14 | Middleware 2FA | Validação automática | Local |
| 15 | Rate limiting | Proteção contra ataques | Local |
| 16 | Bloqueio de conta | Segurança avançada | Local |
| 17 | Logs de segurança | Auditoria completa | Local |
| 18 | Configurações dev | secure: false | Local |

### **SEMANA 3-4: GESTÃO DE PERFIS**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 19-20 | Interface de perfis | Página completa | Local |
| 21 | Modal com 2FA | Configuração 2FA | Local |
| 22 | Permissões por perfil | Matriz de permissões | Local |
| 23 | Clonagem de perfis | Herança de configurações | Local |
| 24 | Interface de permissões | Configuração visual | Local |
| 25 | Matriz com 2FA | Validação de segurança | Local |
| 26 | Hierarquia de perfis | Validação de níveis | Local |
| 27 | Bulk operations | Operações em massa | Local |

### **SEMANA 5-6: FUNCIONALIDADES DINÂMICAS**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 28-29 | Gestão de funcionalidades | CRUD completo | Local |
| 30 | Categorização | Organização por categoria | Local |
| 31 | Ícones personalizados | Sistema de ícones | Local |
| 32 | URLs dinâmicas | Rotas configuráveis | Local |
| 33 | API sidebar com 2FA | Menu dinâmico seguro | Local |
| 34 | Drag and drop | Reordenação visual | Local |
| 35 | Configuração por perfil | Personalização | Local |
| 36 | Preview em tempo real | Visualização instantânea | Local |

### **SEMANA 7-8: GESTÃO DE USUÁRIOS**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 37-38 | Interface avançada | Lista com status 2FA | Local |
| 39 | Filtros e busca | Busca avançada | Local |
| 40 | Bulk operations | Operações em massa | Local |
| 41 | Import/Export | Migração de dados | Local |
| 42 | Monitoramento de sessões | Sessões ativas | Local |
| 43 | Revogação de sessões | Controle de acesso | Local |
| 44 | Logs de login/logout | Histórico completo | Local |
| 45 | Segurança avançada | Proteções extras | Local |

### **SEMANA 9-10: AUDITORIA COMPLETA**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 46-47 | Logs de auditoria | Visualização completa | Local |
| 48 | Filtros avançados | Busca por eventos | Local |
| 49 | Export de relatórios | Relatórios em PDF/Excel | Local |
| 50 | Alertas de segurança | Notificações automáticas | Local |
| 51 | Configuração de auditoria | O que auditar | Local |
| 52 | Retenção de logs | Política de retenção | Local |



| 53 | Notificações automáticas | Alertas por email | Local |
| 54 | Dashboard de auditoria | Métricas visuais | Local |

### **SEMANA 11-12: CONFIGURAÇÕES E TESTES**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 55-56 | Configurações do sistema | Painel de configuração | Local |
| 57 | Configurações por módulo | Configuração granular | Local |
| 58 | Backup/Restore | Sistema de backup | Local |
| 59 | Validação de configurações | Validação automática | Local |
| 60 | Testes de integração | Testes completos | Local |
| 61 | Testes de segurança | Validação de segurança | Local |
| 62 | Documentação completa | Manual do sistema | Local |
| 63 | Preparação para migração | Checklist de migração | Local |

### **SEMANA 13-14: MIGRAÇÃO PARA PRODUÇÃO**
| Dia | Tarefa | Entregável | Ambiente |
|-----|--------|------------|----------|
| 64 | Configuração da VPS | Servidor preparado | VPS |
| 65 | Instalação PostgreSQL | Banco configurado | VPS |
| 66 | Configuração Nginx | Servidor web configurado | VPS |
| 67 | Instalação SSL | Certificado ativo | VPS |
| 68 | Backup banco local | Backup completo | Local |
| 69 | Restore na VPS | Dados migrados | VPS |
| 70 | Configuração produção | Configs de produção | VPS |
| 71 | Testes de produção | Sistema testado | VPS |
| 72 | Ativação SSL | HTTPS ativo | VPS |
| 73 | Cookies seguros | Cookies com SSL | VPS |
| 74 | SMTP profissional | Email profissional | VPS |
| 75 | Testes finais | Validação completa | VPS |
| 76 | Deploy produção | Sistema ativo | VPS |
| 77 | Monitoramento | Logs monitorados | VPS |
| 78 | Ajustes finais | Sistema otimizado | VPS |
| 79 | Documentação produção | Manual produção | VPS |
| 80 | Treinamento equipe | Equipe treinada | VPS |

---

## **💰 ANÁLISE DE CUSTOS**

### **CUSTOS DE DESENVOLVIMENTO**
```


🔧 Infraestrutura Local:
- Desenvolvimento: R$ 0 (localhost)
- Gmail SMTP: R$ 0 (gratuito)
- Total desenvolvimento: R$ 0
```

### **CUSTOS DE PRODUÇÃO**
```
🌐 VPS e Infraestrutura:
- VPS (4GB RAM): R$ 80/mês
- PostgreSQL: R$ 0 (incluído)
- Nginx: R$ 0 (incluído)
- SSL Let's Encrypt: R$ 0 (gratuito)
- Total mensal: R$ 80/mês

📧 Email Profissional:
- SMTP profissional: R$ 50/mês
- Domínio: R$ 40/ano
- Total mensal: R$ 54/mês

🔒 Segurança:
- Firewall: R$ 30/mês
- Monitoramento: R$ 50/mês
- Backup automático: R$ 20/mês
- Total mensal: R$ 100/mês

💰 Total mensal produção: R$ 234/mês

### **CUSTOS CHATWOOT (OPCIONAL PREMIUM)**
```
💬 Atendimento Omnichannel:
- Instância Chatwoot (Self-hosted na VPS): R$ 0 (incluso na VPS)
- API WhatsApp (Meta Cloud): Centavos por conversão (custo direto Meta)
- Notificações de IA (OpenAI API): Variável pelo volume
- Total adicional estimado: R$ 50 - R$ 100/mês (dependendo do volume)

### **CUSTOS INTELIGÊNCIA DE VOZ (NÍVEL 1)**
```
🎙️ Processamento de Áudio:
- Transcrição (Whisper API): $0.006 / minuto
- Geração de Voz (OpenAI TTS): $0.015 / 1k caracteres
- Total adicional estimado: R$ 20 - R$ 40/mês (uso moderado)
```
```
```


---

## **🎯 MÉTRICAS DE SUCESSO**

### **DESENVOLVIMENTO LOCAL**
- [ ] **Sistema 100% funcional** em localhost
- [ ] **2FA por email** funcionando perfeitamente
- [ ] **Todas as funcionalidades** implementadas
- [ ] **Testes completos** realizados

### **PRODUÇÃO**
- [ ] **Migração sem perda** de dados
- [ ] **SSL ativo** e funcionando
- [ ] **Performance otimizada** (< 2s carregamento)
- [ ] **Segurança validada** (zero vulnerabilidades)

### **COMPLIANCE**
- [ ] **LGPD compliance** 100%
- [ ] **Auditoria completa** de todas as ações
- [ ] **Backup automático** configurado
- [ ] **Monitoramento ativo** 24/7

---

## **🚀 PRÓXIMOS PASSOS IMEDIATOS**

### **1. PREPARAÇÃO DO AMBIENTE LOCAL**
- [ ] Configurar PostgreSQL local
- [ ] Configurar Gmail SMTP
- [ ] Criar repositório Git
- [ ] Configurar variáveis de ambiente

### **2. INÍCIO DA FASE 1**
- [ ] Criar esquema de banco de dados
- [ ] Implementar sistema de email 2FA
- [ ] Desenvolver APIs de autenticação
- [ ] Criar interfaces básicas

### **3. TESTES CONTÍNUOS**
- [ ] Testar 2FA em cada funcionalidade
- [ ] Validar segurança local
- [ ] Documentar cada etapa
- [ ] Preparar checklist de migração

---

## **📋 CHECKLIST DE MIGRAÇÃO**

### **Desenvolvimento → Produção**

#### **1. Configurações de Ambiente**
- [ ] Alterar `NODE_ENV=production`
- [ ] Configurar variáveis de produção
- [ ] Ativar SSL no servidor
- [ ] Configurar domínio

#### **2. Configurações de Segurança**
- [ ] `secure: true` nos cookies
- [ ] `sameSite: 'strict'`
- [ ] `rejectUnauthorized: true`
- [ ] Headers de segurança

#### **3. Configurações de Email**
- [ ] SMTP de produção
- [ ] Porta 465 (SSL)
- [ ] `secure: true`
- [ ] Templates finais

#### **4. Testes de Produção**
- [ ] Testar login com 2FA
- [ ] Testar envio de emails
- [ ] Testar cookies seguros
- [ ] Testar todas as funcionalidades

---

**🎯 Este planejamento garante desenvolvimento local completo e migração segura para produção. Sistema robusto, seguro e escalável desde o primeiro dia!**

