# Memória de Contexto do Claude — Snapshot Portável

> Snapshot da auto-memory do Claude Code, versionado no repositório para portabilidade entre
> máquinas (independe de username/cwd). Atualizado em 2026-06-16.
> Importado pelo `CLAUDE.md`. Cada item abaixo aponta para um arquivo nesta mesma pasta
> (`docs/claude-memory/`) com o detalhe — leia sob demanda.
>
> Observação: no computador onde o Claude roda nativamente, a auto-memory "viva" continua em
> `~/.claude/projects/<cwd>/memory/`. Este snapshot é a fonte de verdade compartilhada via git;
> ao evoluir a memória, reflita as mudanças relevantes aqui também.

---

- [User Profile](user_profile.md) — Desenvolvedor imobiliario, foco em trafego pago e automacao Meta Ads
- [Projeto Trafegopago](project_trafegopago.md) — SaaS multi-tenant multi-segmento Meta Ads em C:\NetImobiliária\Trafegopago
- [Arquitetura Core](project_arquitetura_core.md) — Stack, schemas, relações entre tabelas, auth, psql path
- [Regras Multi-Segmento](project_multisegmento_regras.md) — NUNCA misturar segmentos no dashboard; client_id isola segmento
- [Gaps Técnicos](project_gaps_tecnicos.md) — Dashboard principal (net-imobiliaria) OK no modo own/cliente; gaps no modo "Todas" (KPIs blended, tabela sem segmento)
- [Feedback Token Economy](feedback_token_economy.md) — Usuario quer economia de tokens, respostas concisas
- [Integrações Planejadas](project_integracoes.md) — Google Ads, Google Calendar, Slack para alertas de leads
- [FASE 0 Implementada](project_fase0.md) — Multi-segmento + prompt management implementados em 2026-05-26
- [Centralização LLM Campanhas](project_llm_centralizacao.md) — Decisão 2026-05-28: modelo LLM único global (linha global da Settings)
- [Deploy VPS](project_deploy_vps.md) — Script deploy.sh automatizado: 3 comandos, .env gerado com openssl, CDN_URL via Caddy/MinIO, --update para redeploys
- [Storage MinIO](project_storage_minio.md) — Cliente único s3-client.ts; prefixos: tenants/ imoveis/, criativos/, organic/; ensureBucket automático
- [FASE 16 Orgânico](project_fase16_organico.md) — Postagem orgânica FB+IG concluída; upload MinIO; agendamento cron 5min; migrações pendentes na VPS
