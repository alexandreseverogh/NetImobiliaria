# 📄 SSD: PILLAR 2 - IDENTIDADE E MULTI-TENANCY (IAM)

Este documento descreve a refatoração do sistema de identidades para suportar múltiplos Tenants (Empresas) e Segamentos, garantindo o isolamento de dados e o controle de acesso por empresa.

---

## 📝 1. VISÃO GERAL
Atualmente, o sistema assume um único contexto (Imobiliária). Com esta refatoração, a **Identidade** (Usuário/Login) será separada do **Vínculo** (Membro da Empresa). Isso permite que um consultor trabalhe para duas imobiliárias ou que um vendedor seja desativado em uma empresa sem afetar sua conta global.

## 📐 2. ARQUITETURA TÉCNICA

### Camada de Dados (Novas Tabelas)
1.  **`tenants`**: 
    - `id` (UUID, PK)
    - `name` (VARCHAR) - Razão Social
    - `slug` (VARCHAR, UNIQUE) - Identificador para URL (Ex: `empresa-a`)
    - `cnpj_cpf` (VARCHAR, UNIQUE)
    - `segment` (VARCHAR) - `imoveis`, `saude`, `educacao`, etc.
    - `status` (VARCHAR) - `active`, `suspended`, `inactive`.
    - `settings` (JSONB) - Logotipos, cores, módulos contratados.
    - `created_at`, `updated_at`

2.  **`user_tenant_membership`**: (O Vínculo)
    - `id` (UUID, PK)
    - `user_id` (UUID, FK -> `users`)
    - `tenant_id` (UUID, FK -> `tenants`)
    - `role_id` (INTEGER, FK -> `user_roles`)
    - `is_active` (BOOLEAN) - O "Botão de Pânico" para demissão.
    - `is_owner` (BOOLEAN) - Define quem é o dono/pagador do tenant.
    - `joined_at`, `last_access`

### Camada de Lógica (SSO & Contexto)
- **Token JWT**: O Payload do JWT passará a incluir o `current_tenant_id`.
- **Tenant Picker**: Nova tela após o login para usuários com mais de um vínculo ativo.
- **Middleware**: Validará se o usuário tem um `membership` ATIVO para o `tenant_id` solicitado na rota.

---

## ✅ 4. CRITÉRIOS DE ACEITE
- [ ] Um usuário pode ser cadastrado em dois Tenants diferentes com Roles diferentes.
- [ ] Ao marcar `is_active = false` no membership, o usuário perde o acesso imediato àquela empresa.
- [ ] O sistema identifica o segmento (`imoveis`, `saude`) baseado no Tenant selecionado.

## 🧪 5. PROTOCOLO DE TESTES (TDF)
1.  **Criação de Tenant**: Validar se o Slug é gerado corretamente.
2.  **Múltiplos Acessos**: Logar com Usuário X e verificar se ele enxerga o seletor de empresas.
3.  **Segurança de Isolamento**: Tentar injetar um `tenant_id` via API que não pertença ao usuário logado (Deve retornar 403).

## 🛡️ 6. PROCEDIMENTO DE ROLLBACK
- **Passo 1**: Manter `role_id` na tabela `users` como fallback temporário.
- **Passo 2**: Dropar as novas tabelas e reverter o Middleware de Auth.
