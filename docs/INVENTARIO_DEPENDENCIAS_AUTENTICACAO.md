# Inventário de Dependências – Autenticação (Admin e Pública)

**Versão:** 0.2  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** autenticação administrativa (JWT, RBAC, sessões, 2FA) e autenticação pública (clientes/proprietários), incluindo fluxos de login, logout, renovação de sessão, perfil e proteção por middleware.
- **Objetivo:** garantir acesso seguro e auditável para todos os perfis, com 2FA unificado, rate limiting e logs centralizados.
- **Componentes-chave:** rotas `/api/admin/auth/*`, `/api/public/auth/*`, serviços de 2FA (`twoFactorAuthService`, `unifiedTwoFactorAuthService`), middleware unificado de permissões, hooks `useAuth`, `usePublicAuth`, e monitoramento de segurança.

## 2. Banco de Dados e Migrações
- **Tabelas primárias:** `users`, `user_role_assignments`, `user_roles`, `login_logs`, `audit_logs`, `user_2fa_codes`, `user_2fa_config`, `sessions` (admin) e dados públicos (`clientes`, `proprietarios` com campo `two_fa_enabled`).
- **Scripts relevantes:**
   - `database/add_2fa_fields_clientes_proprietarios.sql` (habilita 2FA para público).
   - `database/fase1_centralizacao_2fa_migration_CORRIGIDO.sql` e `database/fase1_cleanup_tabelas_temporarias.sql` (centralização 2FA admin/público).
   - `database/fix_admin_permissions.sql`, `database/permissions-schema.sql` (garantem RBAC e permissões granulares).
   - `scripts/sql/fase3_prepare_audit_logs.sql` (preenche `public_user_uuid`).
- **Indices críticos:** `idx_login_logs_user_id`, `idx_user_2fa_codes_user_id`, `idx_user_role_assignments_user_id`, `idx_clients_email`, `idx_proprietarios_email` (performance e integridade).
- **Observações:** qualquer alteração em autenticação exige revisar constraints, triggers e colunas `two_fa_enabled` em todas as entidades.

### Status Dual Key / Pendências UUID
- ✅ (08/11/25) Rotas de login públicas e `unifiedTwoFactorAuthService` operam exclusivamente com `userUuid`; tokens públicos (`JWT`) carregam `userUuid` e descartam o `id` legado.
- ✅ Hooks (`useAuth`, `usePublicAuth`) e middleware (`UnifiedPermissionMiddleware`, `publicAuthMiddleware`) validam `userUuid` sem conversão para número; tokens antigos são invalidados e exigem novo login.
- ✅ `login_logs.user_id` confirmado como `uuid` (consulta `\d+ login_logs` em 07/11/25). `audit_logs.user_id` reservado para admins; coluna `user_id_int` removida em 08/11/25 (`fase3_audit_logs_uuid_only`). Eventos públicos utilizam `public_user_uuid`.
- ✅ Scripts `scripts/sql/fase3_prepare_audit_logs.sql` e `scripts/sql/fase3_user_2fa_uuid_only.sql` aplicados (constraints `chk_user_2fa_*` agora aceitam UUID exclusivo); dados existentes revisados (`COUNT(*) user_id IS NULL = 0`).
- ✅ Rotas públicas de autenticação registram logs/auditorias (falhas e sucesso) com `public_user_uuid` + `securityMonitor`.
- ⚠️ Verificar utilitários/scripts antigos que ainda fazem `parseInt` de identificadores públicos (especialmente rotinas de manutenção e eventuais scripts de sessão) e atualizar para UUID.
- ⚠️ Revisar a tabela/serviço de `sessions` (ausente/legado) e alinhar com UUID antes da fase estrutural.
- 📌 Pendências controladas no plano de migração (`PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md`).

## 3. APIs e Middleware
- **Rotas administrativas:**
  - `POST /api/admin/auth/login` → valida credenciais com bcrypt, executa 2FA via `twoFactorAuthService`, registra logs e gera JWT com mapa de permissões.
  - `POST /api/admin/auth/logout` → invalida sessão/token (limpeza em `sessions`).
  - `GET /api/admin/auth/me`, `POST /api/admin/auth/renew-session` → leitura e renovação segura de sessão.
- **Rotas públicas:**
  - `POST /api/public/auth/login` → autentica clientes/proprietários usando `unifiedTwoFactorAuthService`, gera JWT público.
  - `POST /api/public/auth/register` e `PUT /api/public/auth/profile` → dependem das funções de clientes/proprietários (dual key) e aplicam o mesmo fluxo de auditoria.
- **Middleware:**
  - `unifiedPermissionMiddleware` governa todas as rotas admin com configuração dinâmica via banco (`route_permissions_config`), valida token JWT, verifica permissão granular e força 2FA conforme necessidade.
  - `publicAuthMiddleware` (middleware dedicado para área pública) valida JWT dos cadastros públicos e redireciona para login em caso de falha.
- **Logs e monitoramento:** o login admin aciona `securityMonitor` para logs de tentativas suspeitas e auditoria centralizada.

```1:120:src/app/api/admin/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../services/twoFactorAuthService';
...
```

```91:193:src/lib/middleware/UnifiedPermissionMiddleware.ts
export async function unifiedPermissionMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const method = request.method
  ...
  const decoded = await verifyToken(token)
  ...
  const hasPermission = await checkUserPermission(
    decoded.userId,
    routeConfig.feature_slug,
    routeConfig.default_action
  )
  ...
}
```

```1:64:src/app/api/public/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import unifiedTwoFactorAuthService from '@/services/unifiedTwoFactorAuthService'
...
```

## 4. Frontend / UX
- **Admin:**
  - `src/hooks/useAuth.tsx` controla ciclo completo (login, storage de token, refresh, logout), exige `AuthProvider` global e guarda erros para feedback.
  - Páginas `src/app/admin/login/page.tsx` e menu superior usam `useAuth` para redirecionamentos e expiração de sessão.
  - Componentes sensíveis (sidebar, modal de 2FA, dashboards) dependem do contexto de usuário carregado via `AuthProvider`.
- **Público:**
  - `src/hooks/usePublicAuth.ts` cuida de token público (`public-auth-token`), persistência de usuário e logout com redirect para landing page.
  - Páginas em `src/app/(public)` condicionam UI conforme `isAuthenticated`, inclusive fluxo “Meu Perfil”.
- **Guards / PermissionGuard:** o frontend admin utiliza `PermissionGuard` com slugs para esconder ações sem permissão, dependente das permissões vindas do token JWT.

```1:90:src/hooks/useAuth.tsx
'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AdminUser } from '@/lib/types/admin'
...
```

```1:56:src/hooks/usePublicAuth.ts
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
...
```

## 5. Segurança (2FA, Tokens, Rate Limiting)
- **2FA Unificado:**
  - Admin: `twoFactorAuthService` (legado) + `user_2fa_*` tables; requer 2FA automaticamente para perfis com `requires_2fa`.
  - Público: `unifiedTwoFactorAuthService` (dual key support) para clientes/proprietários, reutilizando a mesma infraestrutura e logs.
- **Tokens:**
  - Admin: JWT inclui permissões consolidadas por slug/action; armazenado em `localStorage` (front) e cookie/Authorization (API).
  - Público: JWT com payload mínimo (`userUuid`, tipo, dados básicos) e expiração de 24h; validado pelas rotas e middleware público. Tokens anteriores com `userId` legado foram invalidados após a refatoração (Fase 3.1).
- **Rate Limiting & Monitoramento:** `securityMonitor` registra tentativas suspeitas; Guardian Rules exigem rate limiting de login (<5 tentativas/15min) — ver scripts `database/login_logs` e configurações adicionais (a documentar).
- **Sessões:** serviço `AuthService` (legacy) usa `Map` em memória; rotas modernas utilizam tokens JWT + `sessions` table (verificar ao migrar para produção).

```1:120:src/services/unifiedTwoFactorAuthService.ts
import { Pool } from 'pg';
import crypto from 'crypto';
import emailService from './emailService';
...
```

```1:120:src/services/twoFactorAuthService.ts
import { Pool } from 'pg';
import crypto from 'crypto';
import emailService from './emailService';
...
```

## 6. Performance e Observabilidade
- **Consultas otimizadas:** login carrega permissões via joins com índices (`user_roles`, `role_permissions`, `system_features`).
- **Caching:** `RouteConfigCache` armazena configurações de rotas por 5 minutos para reduzir hits no banco.
- **Logs:** tabelas `login_logs` e `audit_logs` crescem rapidamente; necessário job de rotação/particionamento (planejar).
- **Monitoramento:** rotas críticas emitem logs de console e utilizam `securityMonitor` para correlação com dashboards.

## 7. Boas Práticas DRY / Reutilização
- Reutilizar hooks (`useAuth`, `usePublicAuth`) e serviços de 2FA; evitar duplicar lógica de validação nas páginas.
- Centralizar geração/validação de JWT em `src/lib/auth/jwt.ts` (verificar atualizações futuras).
- Middleware unificado deve ser o único ponto de validação de permissões; rotas não devem implementar lógicas redundantes.
- Scripts e constantes sensíveis (segredos, expirações) devem ser parametrizados via `.env` e `AUTH_CONFIG`.

## 8. Testes e Checklists Obrigatórios
- **Automatizados:**
  - `scripts/Test-ProprietariosUuidOnly.ps1` (fluxo UUID-only proprietários/publico).
  - `scripts/Test-ClientesUuidOnly.ps1` (fluxo UUID-only clientes/publico).
  - `scripts/test-validacoes-cadastro.ts` (garante validações front).  
  - Scripts específicos de login/2FA (a criar – seguir Guardian Rules).
- **Manuais:**
  - Cenários descritos em `docs/TESTE_2FA_POR_USUARIO.md`, `docs/FUNCIONALIDADE_2FA_CONCLUIDA.md`, `docs/IMPLEMENTACAO_AUTENTICACAO_PUBLICA_COMPLETA.md`.
- **Checklist Guardian:** antes de qualquer alteração, executar smoke tests de login admin, login público, fluxo de 2FA (envio + validação) e renovação de sessão.

## 9. Dependências Cruzadas
- **Permissões:** rely on `PermissionChecker`, `system_features`, `role_permissions`; qualquer mudança na autenticação impacta RBAC e vice-versa.
- **Clientes/Proprietários:** campos `two_fa_enabled` e `password` precisam estar sincronizados com os scripts de migração (ver inventário específico).
- **Imóveis / Wizards:** dependem de autenticação admin para edição; mudança de token ou permissão pode quebrar fluxo.
- **Dashboards de segurança:** alimentados por `login_logs` e `audit_logs`; qualquer alteração na estrutura precisa atualizar os relatórios em `src/app/admin/login-logs/*`.

## 10. Riscos e Mitigações
- **Quebra de segurança:** alteração em JWT ou middleware pode expor rotas; sempre validar tokens, permissões e 2FA em ambiente de testes isolado.
- **Inconsistência 2FA:** manter alinhamento entre serviços (legacy `twoFactorAuthService` e `unifiedTwoFactorAuthService`). Planejar unificação completa antes de fases futuras.
- **Desempenho:** consultas de login com múltiplos joins podem degradar; monitorar índices e cache.
- **Dependência de configs:** chaves JWT e credenciais DB não podem estar hardcoded; validar `.env` em cada ambiente.

## 11. Plano de Atualização Contínua
1. Toda alteração em autenticação deve atualizar este documento e registrar responsável/data.
2. Vincular o inventário nas análises de impacto (`ANALISE_IMPACTO_AUTENTICACAO.md`) com resumo das dependências afetadas.
3. Revisão trimestral obrigatória junto aos relatórios de segurança.
4. Planejar a migração definitiva para o serviço unificado de 2FA (eliminar duplicidade `twoFactorAuthService` vs `unifiedTwoFactorAuthService`).

---

**Responsável pela atualização:** _(preencher)_


