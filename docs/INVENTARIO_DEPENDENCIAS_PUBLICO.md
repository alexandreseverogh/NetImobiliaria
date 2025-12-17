# Inventário de Dependências – Plataforma Pública & Landing Pages

**Versão:** 0.2  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** experiência pública da Net Imobiliária (landing page, busca, autenticação de clientes/proprietários, área “Meu Perfil”), incluindo hooks, middleware e APIs públicas.
- **Objetivo:** oferecer fluxo público seguro e performático, com reutilização de catálogos internos, integração com 2FA unificado e logs de auditoria, alinhado às Guardian Rules (validação completa, sem hardcoding de dados sensíveis).
- **Componentes-chave:** `src/app/landpaging`, `src/app/(public)/meu-perfil`, hooks `usePublicAuth`, `useEstadosCidadesPublic`, middleware `publicAuthMiddleware`, APIs `src/app/api/public/*`.

## 2. Estrutura de Páginas
- **Landing Page (`src/app/landpaging/page.tsx`):**
  - Seções principais (Hero, busca avançada, cards de imóveis em destaque).
  - `AuthButtons` para login/registro público.
  - Integração com `/api/public/imoveis/destaque` (tipos DV/DA) e catálogos de estados (`useEstadosCidades`).
  - Paginação local, fallback com dados mockados quando não há imóveis.
- **Layout (`src/app/landpaging/layout.tsx`):** define estrutura base (metatags, fontes).
- **Área logada (`src/app/(public)/meu-perfil/page.tsx`):**
  - Consome `useEstadosCidadesPublic`, `buscarEnderecoPorCep`, formatações (CPF, telefone, CEP).
  - Carrega dados via `/api/public/auth/profile`, permite edição com validação (debounce de email, auto-preenchimento de CEP), salva via `PUT /api/public/auth/profile` (admin API).
- **Outros componentes públicos:** `LandingPropertyCard`, `HeroSection`, `SearchForm` (em `src/components`).

### Status Dual Key / Pendências UUID
- ✅ Fluxo de login/registro público utiliza `unifiedTwoFactorAuthService` UUID-only; tokens carregam `userUuid` e `localStorage`/APIs não dependem mais de `id` inteiro.
- ✅ Página “Meu Perfil” busca e salva dados via APIs que aceitam `uuid`; validações (`check-email`, `check-cpf`) utilizam `excludeUuid` quando disponível.
- ✅ Scripts `fase3_prepare_audit_logs.sql` e `fase3_user_2fa_uuid_only.sql` garantiram `public_user_uuid` preenchido nos logs e constraints ajustadas para UUID.
- ✅ Testes manuais 08/11/25: criação + login/logout de novo cliente e novo proprietário executados sem erros na landing (confirmação fluxo UUID/2FA).
- ⚠️ Validar se exportações ou relatórios públicos (quando existirem) já utilizam UUID ou dependem de IDs inteiros.
- ⚠️ Confirmar que caches locais (`public-user-data`) e integrações externas respeitam o novo payload antes da remoção definitiva de colunas legadas.
- 📌 Pendências sincronizadas com o plano de migração (`PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md`).

## 3. Hooks e Middleware
- **usePublicAuth (`src/hooks/usePublicAuth.ts`):**
  - Gerencia token `public-auth-token`, estado `isAuthenticated`, logout (remove token e redireciona para landing).
  - Expõe `checkAuth` para páginas públicas.
- **useEstadosCidadesPublic (`src/hooks/useEstadosCidadesPublic.ts`):** carrega JSON de estados/cidades para formulários (mesmo dataset usado no admin).
- **Middleware (`src/middleware/publicAuth.ts`):**
  - Verifica token JWT em rotas protegidas públicas, redireciona para landing com query (`login=required/expired`).
  - Exposto para componentes que queiram ler dados locais (`getUserFromLocalStorage`).

## 4. APIs Públicas (`src/app/api/public`)
- **Autenticação:**
  - `POST /auth/login` – valida credenciais (`userType` cliente/proprietário), usa `unifiedTwoFactorAuthService` para 2FA, retorna JWT (payload `userUuid`, `userType`, `nome`, etc.).
  - `POST /auth/register` – cria registro (consome `createCliente` ou equivalente), aplica validações e auditoria.
  - `GET/PUT /auth/profile` – leitura e atualização de perfil logado (utiliza token Bearer, atualiza endereços, valida email/CPF).
- **Verificações:**
  - `POST /check-email`, `POST /check-cpf` – valida duplicidade considerando userType, usados em formulários com debounce.
- **Imóveis:**
  - `GET /imoveis/destaque` – lista imóveis destacados (DV/DA) para landing.
- **Autenticação compartilhada:** rotas reutilizam camada de banco e utilitários (ex.: `formatters`, `geocoding`).

## 5. Segurança e Boas Práticas
- **JWT:** token público assinado com `JWT_SECRET` (mesmo admin), guardado em `localStorage` + header Authorization, carregando `userUuid` como chave primária.
- **Redirecionamentos seguros:** middleware controla devolução para landing; páginas logadas limpam storage ao detectar token inválido.
- **Validação forte:** formulários aplicam máscaras (CPF/telefone/CEP) + verificações no backend (duplicidade, formato).
- **2FA opcional:** suporte via serviço unificado; `is2FAEnabled` indica se código é exigido (ver inventário de 2FA).
- **Logs/Auditoria:** tentativas de login registradas em `login_logs`; updates de perfil devem chamar `logAuditEvent`.
- **Rate limiting:** implementado via `securityMonitor`/permissões; considerar aplicar rate limit específico para APIs públicas.

## 6. Performance e Observabilidade
- **Landing:** requisições para imóveis destacados com `fetch` (client-side) – monitorar latência e implementar caching/CDN se necessário.
- **Busca avançada:** heavy filtering planejado via APIs dedicadas (garantir índices em `imoveis`).
- **Lazy loading:** componentes carregam dados conforme necessário (ex.: estados apenas uma vez).
- **Logs:** desde 07/11/25 as rotas públicas de cadastro/login registram eventos em `login_logs`, `audit_logs` e `securityMonitor` (falhas e sucessos); monitorar métricas e dashboards correspondentes.

## 7. Boas Práticas DRY / Reutilização
- Reutilizar hooks/formatadores em público/admin (`formatCPF`, `useEstadosCidades`).
- Centralizar chamados a `/api/public/*` via clientes reusáveis quando expandir features.
- Evitar replicar lógica de validação; usar utilitários comuns (`geocoding`, `formatters`).
- Manter consistência visual com design system (Heroicons/Lucide, tailwind).

## 8. Testes e Checklists Obrigatórios
- **Documentos:** `docs/IMPLEMENTACAO_AUTENTICACAO_PUBLICA_COMPLETA.md`, `docs/PLANO_ACAO_LOGIN_CADASTRO_PUBLICO.md`, `docs/RESUMO_CORRECOES_LOGIN_PUBLICO.md`, `docs/RESUMO_SESSAO_CORRECOES.md`.
- **Scripts:** `scripts/test-validacoes-cadastro.ts`, `database/TESTE_INTERFACE_ATUALIZADA.sql` (valida dados públicos), `docs/TESTES_DUAL_KEY_PROPRIETARIOS.md` (impacto na área pública).
- **Guardian Checklist:** verificar fluxos de login/registro (incluindo 2FA), validação de e-mail/CPF, atualização de perfil, redirecionamentos, carregamento de imóveis destacados e segurança do token.

## 9. Dependências Cruzadas
- **Clientes/Proprietários:** APIs públicas manipulam dados dessas tabelas (respeitar dual key e validações do inventário Clientes/Proprietários).
- **Imóveis:** landing consome `imoveis` (inventário Imóveis & Wizards).
- **Email/2FA:** login público usa serviço de e-mail/2FA (inventários correspondentes).
- **Logs & Auditoria:** tentativas registradas em `login_logs`/`audit_logs` (inventário Logs).
- **Sidebar/Admin:** perfis públicos não usam sidebar, mas configuram permissões de API via `system_features`.

## 10. Plano de Atualização Contínua
1. Atualizar inventário ao adicionar novas páginas públicas (ex.: listagem detalhada, contato, blog) ou novos endpoints.
2. Testar regularmente fluxos públicos em staging (credenciais, 2FA, filtros de imóveis).
3. Planejar SEO/performance (SSR/SSG) conforme evolução da landing.
4. Monitorar métricas de acesso (analytics) e ajustar caching/segurança conforme uso real.

---

**Responsável pela atualização:** _(preencher)_


