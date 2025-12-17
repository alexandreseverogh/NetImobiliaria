# Inventário de Dependências – 2FA Unificado

**Versão:** 0.2  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** autenticação de dois fatores para usuários administrativos e público (clientes/proprietários UUID) utilizando infraestrutura unificada de códigos, configuração e auditoria.
- **Objetivo:** garantir segurança consistente, com logs completos, expiração adequada, integração com permissões e prevenção de bypass, conforme Guardian Rules.
- **Componentes-chave:** serviços `unifiedTwoFactorAuthService` (unificado) e `twoFactorAuthService` (legado admin), tabelas `user_2fa_*`, scripts de migração Fase 1/2, APIs de login (`/api/admin/auth/login`, `/api/public/auth/login`), páginas/fluxos 2FA no frontend (`TwoFactorValidationModal`, componentes de configuração).

## 2. Banco de Dados e Migrações
- **Tabelas primárias:**
  - `user_2fa_codes` (códigos temporários: `user_id` UUID, `user_id_int` INTEGER, `user_type`, `code`, `method`, `expires_at`, `used`, `ip_address`, `user_agent`)
  - `user_2fa_config` (status, método, backup codes, `last_used`)
  - `login_logs` (auditoria de tentativas com campos `two_fa_used`, `success`)
  - `users.two_fa_enabled`, `clientes.two_fa_enabled`, `proprietarios.two_fa_enabled`
- **Migrações/Scripts relevantes:**
  - `database/add_2fa_fields_clientes_proprietarios.sql` (marca clientes/proprietários)
  - `database/fase1_centralizacao_2fa_migration_CORRIGIDO.sql`, `database/fase1_cleanup_tabelas_temporarias.sql` (centraliza 2FA)
  - `docs/FASE1_COMPLETA_SUCESSO.md`, `docs/TESTE_2FA_POR_USUARIO.md`, `docs/INSTRUCOES_EXECUTAR_2FA_SCRIPT.md`
  - `database/test_2fa_security_fix.sql`, `database/test_2fa_fix_verification.sql`
- **Constraints:** garantir `ON DELETE CASCADE`/`SET NULL` onde aplicável, índice em `expires_at` para limpeza rápida.

### Status Dual Key / Pendências UUID
- ✅ Admin (UUID) já utiliza `user_id` nas tabelas `user_2fa_codes`/`user_2fa_config` e registra audit logs com `user_id`.
- ✅ Serviço público (`unifiedTwoFactorAuthService`) atualizado (08/11/25) para operar exclusivamente com `userUuid`; inserções em `user_2fa_*` gravam `user_id` UUID e `user_id_int = NULL`.
- ✅ Scripts `scripts/sql/fase2_backfill_user_2fa.sql` e `scripts/sql/fase3_user_2fa_uuid_only.sql` aplicados; constraints `chk_user_2fa_*` revisadas para exigir UUID + validação (`COUNT(*) user_id IS NULL = 0`).
- ⚠️ Monitoramento 08/11/25: `user_2fa_codes` mantém 11 registros com `user_id_int`, `user_2fa_config` mantém 6 — preparar remoção definitiva dessas colunas após janela de observação (Fase 4) usando `scripts/sql/fase4_user_2fa_drop_user_id_int.sql` (planejado).
- 📌 Acompanhamento no `PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md` (Fase 3.1 / Fase 4).

## 3. Serviços e APIs
- **Serviços:**
  - `src/services/unifiedTwoFactorAuthService.ts` – opera com `userUuid` (string) para admin/público, envia emails com `emailService`, registra auditoria (`user_id` para admin, `public_user_uuid` para público), atualiza `user_2fa_config`/`user_2fa_codes` e remove códigos expirados.
  - `src/services/twoFactorAuthService.ts` – serviço legado para admin (usa `user_2fa_codes` e logs), ainda referenciado em login admin (deve ser mantido até migração total).
- **APIs:**
  - `POST /api/admin/auth/login` – verifica `is2FAEnabled`, envia/valida código via `twoFactorAuthService` (deve migrar para unificado), registra logs e gera JWT com flag `is2FAEnabled`.
  - `POST /api/public/auth/login` – usa `unifiedTwoFactorAuthService` para clientes/proprietários.
  - Configurações adicionais (ex.: futuras rotas para habilitar/gerar backup codes) devem seguir mesmo padrão.
- **Utilitários:** `verifyTokenNode`, `logLoginAttempt`, `logAuditEvent` garantem integração com auditoria.

```61:178:src/services/unifiedTwoFactorAuthService.ts
const code = this.generateCode()
await this.saveCode(userId, userType, code, 'email', expiresAt, ipAddress, userAgent)
const emailSent = await emailService.send2FACode(email, code)
```

```248:324:src/app/api/admin/auth/login/route.ts
const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(user.id)
if (is2FAEnabled) {
  if (!twoFactorCode) {
    await twoFactorAuthService.sendCodeByEmail(user.id, user.email, ipAddress, userAgent)
    return { success: false, requires2FA: true }
  }
  const validationResult = await twoFactorAuthService.validateCode(user.id, twoFactorCode, 'email')
}
```

## 4. Frontend / UX
- **Admin:**
  - `TwoFactorValidationModal` (quando login retorna `requires2FA`), prompts para código, campos para backup code (planejado).
  - Contexto `useAuth` armazena `requires2FA` e interage com modal.
- **Público:**
  - Aplicações clientes/proprietários exibem fluxo similar (ex.: `landpaging` + hooks `usePublicAuth`).
- **Configurações:** páginas futuras devem permitir habilitar/desabilitar 2FA, gerar backup codes, listar dispositivos (ver docs `INSTRUCOES_ADICIONAR_CONFIG_2FA.md`).
- **UX Guidelines:** tempo máximo 10 min (guardian rule), mensagens claras de erro, não revelar detalhes em caso de falha, armazenamento seguro de tokens.

## 5. Segurança e Auditoria
- **Guardian Rules:** 2FA obrigatório para operações críticas; nunca armazenar códigos em texto plano (hash backup codes).
- **Logs:** `logAuditAction` (2FA events), `login_logs` (ação, IP, user agent, success/failure).
- **Rate limiting:** integrar com camada de autenticação (máximo tentativas/15 min) – verificar `securityMonitor`.
- **fail-safe:** em caso de erro, negar acesso (serviços retornam `false` e logs registram falha).
- **Cleanup:** `cleanupExpiredCodes` deve ser agendada (cron) para evitar acumular dados.

## 6. Performance e Monitoramento
- Queries 2FA simples, mas podem crescer com muitos códigos; índices em `expires_at` e `user_id` necessários.
- Log de auditoria pode crescer (planejar rotação/partição).
- Monitorar envios de email (falhas no `emailService` impedem login) – implementar fallback/retry.

## 7. Boas Práticas DRY / Reutilização
- Concentrar lógica em `unifiedTwoFactorAuthService`; evitar duplicar validações nos controllers.
- Futuro: migrar `twoFactorAuthService` (legado) para unificado, reduzindo duplicidade.
- Utilizar `emailService` central para templates e logs; nenhum envio direto.
- Utilizar `UserType` (`admin`, `cliente`, `proprietario`) consistente em toda aplicação.

## 8. Testes e Checklists Obrigatórios
- **Documentos:** `docs/TESTE_2FA_POR_USUARIO.md`, `docs/FUNCIONALIDADE_2FA_CONCLUIDA.md`, `docs/INSTRUCOES_EXECUTAR_2FA_SCRIPT.md`, `docs/PROBLEMA_BOTAO_2FA.md`.
- **Scripts:** `database/test_2fa_security_fix.sql`, `database/test_2fa_fix_verification.sql` (validam estrutura), PowerShell/TS nas `scripts/` (criar se inexistente).
- **Guardian Checklist:** testar login com/sem 2FA (admin/público), expiração (após 10 min), tentativas inválidas, auditoria dos eventos e envio de email.

## 9. Dependências Cruzadas
- **Autenticação:** login admin/público depende do status 2FA (ver inventário de autenticação).
- **Permissões/RBAC:** campos `requires_2fa` em `user_roles` determinam habilitação automática.
- **EmailService:** envios de código usam `emailService.send2FACode` ou `sendTemplateEmail` – mudanças no serviço afetam 2FA.
- **Clientes/Proprietários:** `two_fa_enabled` sincronizado com scripts de migração; alterações (ex.: migração UUID) impactam dual key.
- **Dashboards:** gráficos de login usam `login_logs.two_fa_used` (impacto em relatórios).

## 10. Riscos e Mitigações
- **Duplicidade de serviços:** `twoFactorAuthService` legado vs `unifiedTwoFactorAuthService` – migração controlada necessária para evitar inconsistências.
- **Email falho:** se e-mail não envia, usuários não conseguem logar → implementar alerta/monitoramento.
- **Expiração incorreta:** garantir `CODE_EXPIRY_MINUTES` configurado, teste manual.
- **Logs sensíveis:** proteger dados (IP, userAgent) de acesso indevido.
- **Eventos concorrentes:** múltiplos códigos simultâneos – service já ordena por `created_at DESC`; auditar para evitar reuso.

## 11. Plano de Atualização Contínua
1. Atualizar inventário ao migrar completamente para serviço unificado (incluindo login admin) e remover legado.
2. Anexar logs/testes em `ANALISE_IMPACTO_2FA.md` para cada alteração relevante.
3. Manter scripts agendados para limpeza (`cleanupExpiredCodes`) e monitorar.
4. Planejar suporte a métodos adicionais (SMS/app) mantendo objetivo unificado.

---

**Responsável pela atualização:** _(preencher)_


