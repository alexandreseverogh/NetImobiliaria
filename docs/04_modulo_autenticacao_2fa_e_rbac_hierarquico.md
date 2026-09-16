# 04 Autenticação, 2FA e RBAC Hierárquico (Níveis 1-6)

> **Mecanismos de Segurança, Níveis de Acesso, Autenticação de Dois Fatores e Middlewares**

## 1. Hierarquia de Níveis de Acesso (RBAC 1 a 6)

O sistema possui uma estrutura de controle de acesso hierárquica e granular dividida em **6 Níveis Primários**:

```mermaid
graph TD
    L6[Nível 6 — Super Admin / Master Platform] --> L5[Nível 5 — Tenant Master / Diretor]
    L5 --> L4[Nível 4 — Gerente de Unidade / Operações]
    L4 --> L3[Nível 3 — Corretor / Atendente Sênior]
    L3 --> L2[Nível 2 — Assistente / Estagiário]
    L2 --> L1[Nível 1 — Usuário de Leitura / Auditor]
```

* **Nível 6 (Super Admin / Master)**: Acesso ilimitado a todas as rotas, configurações multi-tenant, auditorias e gestão de planos.
* **Nível 5 (Tenant Admin / Diretor)**: Gestão completa do tenant, criação de usuários (Níveis 1 a 5), acesso financeiro e de marketing.
* **Nível 4 (Gerente / Coordenador)**: Acesso a relatórios de equipe, aprovação de leads, gestão de imobiliárias e anúncios.
* **Nível 3 (Corretor / Operador de CRM)**: Gestão de seus próprios imóveis, carteira de clientes, mensageria e atendimento.
* **Nível 2 (Assistente)**: Atualização de cadastros e inserção de mídias sob supervisão.
* **Nível 1 (Leitura)**: Consulta restrita a relatórios de leitura sem permissão de modificação (`write`).

---

## 2. Autenticação de Dois Fatores (2FA)

Para garantir segurança reforçada, a plataforma suporta **2FA Obrigatório ou Opcional** via dois canais:

1. **TOTP (Aplicativos Autenticadores)**: Compatível com Google Authenticator, Authy e Microsoft Authenticator via QrCode gerado em `qrcode.react`.
2. **Email OTP**: Envio de código temporário de 6 dígitos via SMTP Gmail (`nodemailer`) com expiração de 10 minutos.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant DB/Redis

    User->>Frontend: Informa Usuário e Senha
    Frontend->>API: POST /api/admin/auth/login
    API->>DB/Redis: Valida credenciais e verifica 2FA
    alt 2FA Ativo
        API-->>Frontend: Retorna status 2FA_REQUIRED + challenge_token
        User->>Frontend: Digita código de 6 dígitos
        Frontend->>API: POST /api/admin/auth/verify-2fa
        API->>DB/Redis: Valida TOTP / Email OTP
    end
    API-->>Frontend: Retorna JWT Token (HttpOnly Cookie / Bearer Header)
```

---

## 3. Protection Guards & Middlewares

Todas as rotas de API em `src/app/api/admin/` são protegidas por middlewares que realizam a validação em 3 etapas:
1. Validação de formato e assinatura do token JWT.
2. Verificação de sessão 2FA válida.
3. Checagem da tabela `RolePermission` (`hasPermission(user, resource, action)`).
