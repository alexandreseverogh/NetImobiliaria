# 📊 DIAGRAMAS VISUAIS DO SISTEMA DE SEGURANÇA

**Versão:** 1.0  
**Data:** 2025-10-08

---

## 📑 ÍNDICE

1. [Diagrama Entidade-Relacionamento (ER)](#diagrama-er)
2. [Diagrama de Fluxo de Autenticação](#fluxo-autenticação)
3. [Diagrama de Fluxo de Autorização](#fluxo-autorização)
4. [Diagrama de Estados](#diagrama-estados)
5. [Diagrama de Componentes](#diagrama-componentes)
6. [Diagrama de Sequência](#diagrama-sequência)

---

## 🔄 DIAGRAMA ER (Entidade-Relacionamento)

### Modelo Completo

```mermaid
erDiagram
    USERS ||--o{ USER_ROLE_ASSIGNMENTS : has
    USERS ||--o{ USER_PERMISSIONS : has
    USERS ||--o{ USER_SESSIONS : has
    USERS ||--o{ LOGIN_ATTEMPTS : creates
    
    USER_ROLES ||--o{ USER_ROLE_ASSIGNMENTS : assigned_to
    USER_ROLES ||--o{ ROLE_PERMISSIONS : has
    
    SYSTEM_FEATURES ||--o{ PERMISSIONS : defines
    SYSTEM_FEATURES ||--o{ SYSTEM_FEATURES : parent_of
    
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : granted_to
    PERMISSIONS ||--o{ USER_PERMISSIONS : granted_to
    
    EMAIL_SETTINGS ||--o{ EMAIL_LOGS : uses
    EMAIL_TEMPLATES ||--o{ EMAIL_LOGS : uses
    
    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password
        varchar nome
        boolean two_fa_enabled
        boolean ativo
        timestamp created_at
    }
    
    USER_ROLES {
        int id PK
        varchar name UK
        int level
        boolean two_fa_required
        boolean is_active
    }
    
    USER_ROLE_ASSIGNMENTS {
        int id PK
        uuid user_id FK
        int role_id FK
        uuid assigned_by FK
        boolean is_primary
    }
    
    SYSTEM_FEATURES {
        int id PK
        varchar name
        varchar category
        int parent_id FK
        boolean is_active
    }
    
    PERMISSIONS {
        int id PK
        int feature_id FK
        varchar action
        text description
    }
    
    ROLE_PERMISSIONS {
        int id PK
        int role_id FK
        int permission_id FK
        uuid granted_by FK
    }
    
    USER_PERMISSIONS {
        int id PK
        uuid user_id FK
        int permission_id FK
        uuid granted_by FK
        timestamp expires_at
    }
    
    USER_SESSIONS {
        int id PK
        uuid user_id FK
        text token
        timestamp expires_at
    }
    
    LOGIN_ATTEMPTS {
        int id PK
        varchar username
        varchar ip_address
        boolean success
        timestamp attempted_at
    }
    
    EMAIL_SETTINGS {
        int id PK
        varchar smtp_host
        int smtp_port
        varchar from_email
        boolean is_active
    }
    
    EMAIL_TEMPLATES {
        int id PK
        varchar name UK
        text html_content
        jsonb variables
    }
    
    EMAIL_LOGS {
        int id PK
        varchar to_email
        varchar template_name
        boolean success
        timestamp sent_at
    }
```

---

## 🔐 FLUXO DE AUTENTICAÇÃO

### Login com 2FA

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant A as API Auth
    participant D as Database
    participant E as Email Service
    
    U->>F: Digita username/password
    F->>A: POST /api/auth/login
    A->>D: SELECT user WHERE username=?
    D-->>A: user {password_hash, two_fa_enabled}
    
    A->>A: bcrypt.compare(password, hash)
    alt Senha inválida
        A-->>F: 401 Unauthorized
        F-->>U: "Credenciais inválidas"
    end
    
    alt 2FA não habilitado
        A->>A: jwt.sign(payload)
        A->>D: INSERT INTO user_sessions
        A-->>F: {token, user}
        F-->>U: Redireciona para /admin
    end
    
    alt 2FA habilitado
        A->>A: Gera código 6 dígitos
        A->>D: Salva código + expiração
        A->>D: GET email_template('2fa-code')
        D-->>A: Template HTML
        A->>E: sendEmail(user.email, code)
        E-->>A: {sent: true}
        A-->>F: {requires2fa: true}
        F-->>U: Mostra tela de código 2FA
        
        U->>F: Digita código
        F->>A: POST /api/auth/2fa/verify {code}
        A->>D: SELECT código WHERE user_id=?
        D-->>A: {code, expires_at, attempts}
        
        alt Código inválido ou expirado
            A->>D: UPDATE attempts++
            A-->>F: 401 Código inválido
            F-->>U: "Código incorreto"
        end
        
        alt Código válido
            A->>A: jwt.sign(payload)
            A->>D: INSERT INTO user_sessions
            A->>D: DELETE código usado
            A-->>F: {token, user}
            F-->>U: Redireciona para /admin
        end
    end
```

### Logout

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant A as API Auth
    participant D as Database
    
    U->>F: Clica em "Sair"
    F->>A: POST /api/auth/logout (Bearer token)
    A->>A: jwt.verify(token)
    A->>D: DELETE FROM user_sessions WHERE token=?
    A->>D: DELETE códigos 2FA do usuário
    A-->>F: {success: true}
    F->>F: localStorage.clear()
    F-->>U: Redireciona para /login
```

---

## ⚖️ FLUXO DE AUTORIZAÇÃO

### Verificação de Permissão

```mermaid
flowchart TD
    A[Requisição com JWT] --> B{Token válido?}
    B -->|Não| C[401 Unauthorized]
    B -->|Sim| D[Extrair userId do token]
    
    D --> E[Buscar perfis do usuário]
    E --> F[Buscar permissões dos perfis]
    F --> G[Buscar permissões diretas]
    
    G --> H[Mesclar permissões]
    H --> I{Tem permissão<br/>para ação?}
    
    I -->|Não| J[403 Forbidden]
    I -->|Sim| K{Verifica<br/>hierarquia?}
    
    K -->|Não precisa| M[Permitir acesso]
    K -->|Sim| L{Level solicitante ><br/>Level alvo?}
    
    L -->|Menor ou igual| J
    L -->|Maior| M
    
    M --> N[Executar ação]
    N --> O[Retornar resposta]
```

### Hierarquia de Perfis

```mermaid
graph TD
    A[Super Admin<br/>Level 100] --> B[Admin<br/>Level 50]
    A --> C[Gerente<br/>Level 40]
    B --> D[Supervisor<br/>Level 30]
    C --> D
    D --> E[Vendedor<br/>Level 20]
    D --> F[Corretor<br/>Level 10]
    
    style A fill:#ff6b6b
    style B fill:#f9ca24
    style C fill:#f9ca24
    style D fill:#6ab04c
    style E fill:#4834d4
    style F fill:#4834d4
```

---

## 🔄 DIAGRAMA DE ESTADOS

### Estados do Usuário

```mermaid
stateDiagram-v2
    [*] --> Criado: Cadastro
    Criado --> Ativo: Ativar conta
    Ativo --> Bloqueado: 5 tentativas falhas
    Bloqueado --> Ativo: Timeout 15min
    Ativo --> Inativo: Desativar
    Inativo --> Ativo: Reativar
    Ativo --> [*]: Deletar
    Inativo --> [*]: Deletar
```

### Estados da Sessão

```mermaid
stateDiagram-v2
    [*] --> Criada: Login bem-sucedido
    Criada --> Ativa: Token válido
    Ativa --> Ativa: Requisições autenticadas
    Ativa --> Expirada: Timeout (1h)
    Ativa --> Revogada: Logout
    Expirada --> [*]
    Revogada --> [*]
```

### Estados do Código 2FA

```mermaid
stateDiagram-v2
    [*] --> Gerado: Solicitar código
    Gerado --> Enviado: Email enviado
    Enviado --> Verificado: Código correto
    Enviado --> Tentativa: Código incorreto
    Tentativa --> Verificado: Código correto
    Tentativa --> Bloqueado: 3 tentativas falhas
    Enviado --> Expirado: Timeout 10min
    Verificado --> [*]
    Expirado --> [*]
    Bloqueado --> [*]
```

---

## 🏗️ DIAGRAMA DE COMPONENTES

### Arquitetura do Sistema

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        F1[Pages<br/>/login, /admin]
        F2[Components<br/>Auth, RBAC]
        F3[Hooks<br/>useAuth, usePermission]
        F1 --> F2
        F2 --> F3
    end
    
    subgraph "Backend - API Routes"
        B1[/api/auth/*<br/>Login, Logout, 2FA]
        B2[/api/admin/*<br/>CRUD Admin]
        B3[/api/public/*<br/>Public APIs]
    end
    
    subgraph "Services"
        S1[emailService.ts<br/>Nodemailer]
        S2[twoFactorAuthService.ts<br/>2FA Logic]
        S3[authService.ts<br/>JWT, bcrypt]
    end
    
    subgraph "Middleware"
        M1[authMiddleware<br/>Verifica JWT]
        M2[permissionMiddleware<br/>Checa RBAC]
        M3[rateLimitMiddleware<br/>Limita requests]
    end
    
    subgraph "Database - PostgreSQL"
        D1[(users<br/>user_roles<br/>permissions)]
        D2[(email_settings<br/>email_templates<br/>email_logs)]
        D3[(user_sessions<br/>login_attempts<br/>2fa_codes)]
    end
    
    F1 --> B1
    F1 --> B2
    F1 --> B3
    
    B1 --> M1
    B2 --> M1
    B1 --> M3
    B2 --> M3
    
    M1 --> M2
    M2 --> S3
    
    B1 --> S2
    S2 --> S1
    
    S1 --> D2
    S2 --> D3
    S3 --> D1
    M2 --> D1
```

---

## 📋 DIAGRAMA DE SEQUÊNCIA - CASOS DE USO

### Criar Novo Usuário

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant UI as Interface
    participant API as API
    participant Auth as Auth Middleware
    participant DB as Database
    
    Admin->>UI: Abre modal "Criar Usuário"
    UI->>Admin: Formulário {username, email, password, role}
    Admin->>UI: Preenche e envia
    
    UI->>API: POST /api/admin/usuarios (Bearer token)
    API->>Auth: Verificar token + permissão
    Auth->>DB: SELECT permissões do admin
    DB-->>Auth: {permissions: [...]}
    Auth->>Auth: Verifica permissão 'create' em 'usuarios'
    
    alt Sem permissão
        Auth-->>UI: 403 Forbidden
        UI-->>Admin: "Sem permissão"
    end
    
    Auth-->>API: Autorizado
    API->>API: bcrypt.hash(password)
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT INTO users
    DB-->>API: user_id
    API->>DB: INSERT INTO user_role_assignments
    DB-->>API: assignment_id
    API->>DB: COMMIT
    
    API-->>UI: 201 Created {user}
    UI-->>Admin: "Usuário criado com sucesso"
    UI->>UI: Atualiza lista
```

### Editar Permissões de Perfil

```mermaid
sequenceDiagram
    participant Admin as Super Admin
    participant UI as Interface
    participant API as API
    participant DB as Database
    
    Admin->>UI: Seleciona perfil "Corretor"
    UI->>API: GET /api/admin/roles/3/permissions
    API->>DB: SELECT role_permissions WHERE role_id=3
    DB-->>API: [{permission_id: 1}, {permission_id: 5}...]
    API-->>UI: {permissions: [...]}
    
    UI-->>Admin: Mostra permissões atuais
    Admin->>UI: Marca novas permissões
    Admin->>UI: Clica "Salvar"
    
    UI->>API: PUT /api/admin/roles/3/permissions<br/>{permission_ids: [1,2,3,5,7]}
    
    alt Requer 2FA
        API-->>UI: {requires2fa: true}
        UI-->>Admin: Modal de código 2FA
        Admin->>UI: Insere código
        UI->>API: PUT com código 2FA
    end
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: DELETE FROM role_permissions WHERE role_id=3
    API->>DB: INSERT INTO role_permissions (bulk)
    API->>DB: COMMIT
    
    API-->>UI: 200 OK {updated: true}
    UI-->>Admin: "Permissões atualizadas"
```

---

## 📊 DIAGRAMA DE FLUXO DE DADOS

### Fluxo Completo de Autenticação

```mermaid
graph LR
    A[Usuário] -->|1. Credenciais| B[Frontend]
    B -->|2. POST login| C[API Auth]
    C -->|3. Busca user| D[(Database)]
    D -->|4. User data| C
    C -->|5. Valida senha| C
    C -->|6. Busca config 2FA| D
    D -->|7. Config| C
    C -->|8. Gera código| C
    C -->|9. Salva código| D
    C -->|10. Busca template| D
    D -->|11. Template| C
    C -->|12. Envia email| E[SMTP]
    E -->|13. Email enviado| F[Email do Usuário]
    C -->|14. requires2fa=true| B
    B -->|15. Mostra tela código| A
    A -->|16. Digita código| B
    B -->|17. POST verify| C
    C -->|18. Valida código| D
    D -->|19. Código válido| C
    C -->|20. Gera JWT| C
    C -->|21. Salva sessão| D
    C -->|22. Token + User| B
    B -->|23. Redireciona /admin| A
```

### Fluxo de Autorização

```mermaid
graph TD
    A[Requisição API] --> B{Token no header?}
    B -->|Não| C[401 Unauthorized]
    B -->|Sim| D[Verificar JWT]
    D -->|Inválido| C
    D -->|Válido| E[Extrair userId]
    
    E --> F[Cache: Permissões<br/>já carregadas?]
    F -->|Sim| G[Usar cache]
    F -->|Não| H[Buscar no DB]
    
    H --> I[Perfis do usuário]
    I --> J[Permissões dos perfis]
    J --> K[Permissões diretas]
    K --> L[Mesclar tudo]
    L --> M[Salvar em cache<br/>5 minutos]
    
    G --> N{Tem permissão<br/>para recurso?}
    M --> N
    
    N -->|Não| O[403 Forbidden]
    N -->|Sim| P[Executar ação]
    P --> Q[Retornar resposta]
```

---

## 🔄 CICLO DE VIDA DE DADOS

### Sessão de Usuário

```mermaid
graph TD
    A[Login bem-sucedido] --> B[Criar sessão]
    B --> C[Gerar JWT]
    C --> D[Salvar em user_sessions]
    D --> E[Retornar token para cliente]
    E --> F[Cliente armazena em localStorage]
    
    F --> G{Requisição<br/>autenticada}
    G --> H[Envia token no header]
    H --> I{Token válido<br/>e não expirado?}
    
    I -->|Sim| J[Processar requisição]
    J --> G
    
    I -->|Não| K[Remover do localStorage]
    K --> L[Redirecionar para /login]
    
    M[Logout] --> N[DELETE user_sessions]
    N --> K
    
    O[Timeout 1h] --> N
```

### Código 2FA

```mermaid
graph TD
    A[Login com 2FA ativado] --> B[Gerar código aleatório]
    B --> C[Salvar em DB com TTL=10min]
    C --> D[Enviar por email]
    D --> E[Aguardar usuário]
    
    E --> F{Usuário digita código}
    F --> G{Código correto?}
    
    G -->|Sim| H[Deletar código do DB]
    H --> I[Criar sessão]
    
    G -->|Não| J{Tentativas < 3?}
    J -->|Sim| K[Incrementar attempts]
    K --> E
    
    J -->|Não| L[Marcar como bloqueado]
    L --> M[Timeout 15min]
    
    N[TTL expirado] --> O[Auto-delete do código]
```

---

## 📈 MÉTRICAS E MONITORAMENTO

### Pontos de Medição

```mermaid
mindmap
  root((Sistema de<br/>Segurança))
    Autenticação
      Login success rate
      Login failures
      2FA usage
      Session duration
    Autorização
      Permission checks
      Access denied count
      Role assignments
    Email
      Emails sent
      Email failures
      Template usage
    Performance
      API response time
      DB query time
      Cache hit rate
```

---

**Documento gerado em:** 2025-10-08  
**Ferramenta:** Mermaid.js  
**Visualização:** GitHub, VS Code, Markdown viewers
