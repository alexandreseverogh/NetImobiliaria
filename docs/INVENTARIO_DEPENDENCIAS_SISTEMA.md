# Inventário de Dependências do Sistema – Net Imobiliária

**Versão:** 0.2 (estrutura atualizada)  
**Data:** 08/11/25

## Objetivo Geral
- Consolidar, em um único documento vivo, todas as dependências funcionais, técnicas e operacionais da aplicação.
- Garantir que **todas** as implementações presentes e futuras sigam padrões unificados de banco de dados, APIs, middleware, segurança, UX, DRY, performance e auditoria.
- Servir como referência obrigatória para análises de impacto, desenhos de arquitetura, checklists Guardian e revisões de segurança.

## Estrutura do Inventário
1. [Fundação e Princípios Globais](#fundação-e-princípios-globais)
2. [Módulos de Domínio](#módulos-de-domínio)
3. [Padrões Transversais](#padrões-transversais)
4. [Processo de Atualização](#processo-de-atualização)
5. [Histórico de Revisões](#histórico-de-revisões)

### Fundação e Princípios Globais
- **Guardian Rules** (versão atual 1.1) – regras invioláveis.
- **Checklists críticos:** `docs/CHECKLIST_FASE4_PK_UUID.md` (pré-requisito para conversão definitiva das PKs de clientes/proprietários).
- **Camadas obrigatórias:** Banco de dados, API, Middleware/Segurança, Aplicação (frontend/backoffice), Observabilidade, Scripts/Testes.
- **DRY e reutilização:** funções utilitárias centralizadas (`src/lib/utils/*`), módulos parametrizáveis, proibição de duplicação de lógica.
- **Segurança como padrão:** autenticação, 2FA, RBAC granular, rate limiting, logging/auditoria, proteção contra injection.
- **Performance:** índices planejados, cache quando aplicável, prevenção de N+1, monitoramento.

### Módulos de Domínio
- **Clientes & Proprietários** – ver `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` (capítulo com dependências completas).
- **Autenticação (Admin & Pública)** – ver `docs/INVENTARIO_DEPENDENCIAS_AUTENTICACAO.md` (JWT, 2FA, middleware, fluxos de login/logout).
- **Permissões / RBAC** – ver `docs/INVENTARIO_DEPENDENCIAS_PERMISSOES.md` (hierarquia CRUD/EXECUTE/ADMIN, system_features, guards, auditoria). Versão 0.2 reflete diagnóstico UUID (08/11/25).
- **Imóveis & Wizards** – ver `docs/INVENTARIO_DEPENDENCIAS_IMOVEIS.md` (cadastro completo, amenidades, proximidades, mídia; proprietários via UUID).
- **Dashboards & Relatórios** – ver `docs/INVENTARIO_DEPENDENCIAS_DASHBOARDS.md` (auditoria, logins, distribuição de imóveis, filtros analíticos).
- **Sidebar Dinâmica & Configuração** – ver `docs/INVENTARIO_DEPENDENCIAS_SIDEBAR.md` (menu dinâmico, permissões, gerenciamento visual, ícones).
- **2FA Unificado** – ver `docs/INVENTARIO_DEPENDENCIAS_2FA.md` (códigos, configuração, serviços unificados admin/público).
- **Logs & Auditoria** – ver `docs/INVENTARIO_DEPENDENCIAS_LOGS_AUDITORIA.md` (login_logs, audit_logs, segurança, dashboards analíticos).
- **Configurações Avançadas** – ver `docs/INVENTARIO_DEPENDENCIAS_CONFIG_AVANCADAS.md` (status/tipos/finalidades, perfis/roles, clones, catálogos auxiliares).
- **Eventos & Middleware Unificado** – ver `docs/INVENTARIO_DEPENDENCIAS_EVENTOS_MIDDLEWARE.md` (controle de acesso centralizado, eventos reativos, monitoramento de segurança).
- **Serviços de E-mail & Notificações** – ver `docs/INVENTARIO_DEPENDENCIAS_EMAIL.md` (SMTP, templates, logs, integrações 2FA).
- **Plataforma Pública & Landing** – ver `docs/INVENTARIO_DEPENDENCIAS_PUBLICO.md` (landing page, autenticação pública, hooks, middleware). Versão 0.2 com cobertura de logs públicos (08/11/25).
- **Autenticação Admin e Pública** – (a preencher).
- **Permissões e RBAC** – (a preencher).
- **Imóveis & Wizards** – (a preencher).
- **Amenidades, Proximidades e Categorias** – (a preencher).
- **Dashboards & Relatórios** – (a preencher).
- **Logs e Auditoria** – (a preencher).
- **Sistema de 2FA Unificado** – (a preencher).
- **Configurações Gerais / Sidebar Dinâmica** – (a preencher).
- **Módulos Públicos / Landing Pages** – (a preencher).
- (Adicionar novos domínios conforme evolução do produto.)

Cada módulo deve conter, no mínimo:
1. **Visão Geral do Domínio**.
2. **Banco de Dados** (tabelas, colunas críticas, FKs, índices, scripts de migração/rollback).
3. **APIs e Middleware** (rotas, validações, autenticação, flows de auditoria).
4. **Frontend/UX** (páginas, componentes, hooks, guards, responsividade, acessibilidade).
5. **Segurança** (requisitos de autenticação, 2FA, rate limiting, tokens, logs).
6. **Performance & Observabilidade** (caches, batching, scripts de monitoramento).
7. **Boas Práticas DRY e Reutilização** (funções utilitárias, módulos parametrizáveis, padrões de código).
8. **Testes e Checklists** (scripts `.ps1`, `.sql`, cenários manuais obrigatórios, ligação com planos de teste em `docs/`).
9. **Dependências Cruzadas** (impacto em outros domínios, requisitos sequenciais, integrações).
10. **Riscos e Planos de Mitigação**.

### Padrões Transversais
- **Autorização centralizada:** `src/lib/middleware/permissionMiddleware.ts`, `system_features`, `user_roles`, `permissions`.
- **Tokens e Sessões:** `src/lib/admin/auth.ts`, `src/services/twoFactorAuthService.ts`, unificação em `src/services/unifiedTwoFactorAuthService.ts`.
- **Eventos e Logging:** `src/lib/events/*`, auditoria (`logAuditEvent`), login logs.
- **Variáveis de ambiente e configuração:** arquivos `.env`, scripts PowerShell de setup, políticas de secrets.
- **Scripts de manutenção:** diretórios `scripts/`, `database/`, `docs/` com instruções e checklists obrigatórios.

### Processo de Atualização
1. Toda nova funcionalidade deve ter seu domínio mapeado aqui **antes do deploy**.
2. Atualizações no módulo correspondente são obrigatórias quando surgirem novas dependências ou alterações.
3. Cada alteração deve registrar o nome do responsável, data e referência ao ticket/solicitação.
4. Revisões periódicas (pelo menos trimestrais) para garantir aderência às Guardian Rules e status dos módulos.

### Histórico de Revisões
- **08/11/25** – Atualização de capítulos (Clientes/Proprietários, Imóveis, Logs/Auditoria, Permissões) com diagnósticos da Fase 2; registro de execução da Fase 3 (remoção `proprietario_fk`).
- **07/11/25** – Criação da estrutura inicial. Conteúdo detalhado disponível para Clientes & Proprietários.

---

> **Próximos passos:**
> 1. Incorporar o conteúdo atual de Clientes & Proprietários como capítulo específico deste inventário.
> 2. Preencher os demais módulos críticos (Autenticação, Permissões, Imóveis etc.) seguindo a estrutura padrão.
> 3. Vincular este inventário diretamente ao checklist Guardian e aos templates de análise de impacto.


