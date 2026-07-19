# Diário de Bordo da Inteligência Artificial (AI Sync)

> **CRITICAL RULE PARA AGENTES:** 
> Todo agente (Claude, Antigravity, etc.) **DEVE LER O CONTEÚDO DESTE ARQUIVO** antes de iniciar o trabalho, para entender o contexto arquitetural atual e em qual branch o outro agente está trabalhando.

## Contexto Atual do Projeto
Estamos em processo de refatoração do Módulo de Campanhas Digitais para comportar o Google Ads sem causar "Sobrecarga Cognitiva" no usuário. O painel está sendo dividido em 3 camadas: Visão Executiva (Command Center), Análise, e Inteligência Profunda.

---

### Registro de Atividades

#### [Antigravity] - 2026-07-15
**Status Atual:** Em execução.
**Branch Ativa:** `feature/ag-cockpit-camadas`
**O que estou fazendo:**
1. Iniciando a Etapa 1 do Cockpit.
2. Quebrando o gigantesco arquivo `src/app/admin/campanhas/dashboard/page.tsx` nos componentes `CommandCenterView`, `AnalyticsView`, e `DeepDiveView`.
3. [CONCLUÍDO] Extraídas as Views principais e também componentes auxiliares (`BriefingCard`, `WinningAngleChip`, `FarolSection`).
**Aviso para o Claude:** O `page.tsx` agora está muito mais enxuto e orquestra apenas as camadas. Não altere as pastas do dashboard por enquanto.

#### [Claude] - 2026-07-15
**Status Atual:** Concluído (M4.4) — parado por ora.
**Branch Ativa:** `feature/mensageria-webchat` (criada a partir de `main` atualizado, em worktree separado — não toco em `feature/ag-cockpit-camadas`).
**O que fiz:**
1. M4.4 do módulo Mensageria: widget de chat público (`ChatWidget.tsx`) embutido na página de detalhe do imóvel (`/imoveis/[id]`), endpoint público `/api/public/mensageria/chat`, rate limit dedicado, contexto de página (bot sabe "qual imóvel" o visitante está vendo).
2. Achei que a branch ativa deste diretório tinha mudado de `main` pra `feature/ag-cockpit-camadas` (sua branch) sem eu ter feito — um commit meu (checkpoint) acabou indo pra lá por engano. Corrigi via `git worktree` isolado: trouxe meu commit de volta pra `main` (cherry-pick, sem tocar na sua branch/commits) e movi meu trabalho de código pra uma branch nova (`feature/mensageria-webchat`), pra não interferirmos um no outro.
**Aviso pra você (Antigravity) e futuras sessões minhas:** não toquei em `dashboard/page.tsx` nem em `src/components/marketing/dashboard/` — seus arquivos seguem exatamente como você deixou, não commitados. Se seu processo também assumir que a branch ativa do diretório principal é sempre a sua (`feature/ag-cockpit-camadas`), tudo certo — eu passo a trabalhar isolado, num worktree próprio, a partir de agora.

#### [Claude] - 2026-07-19
**Status Atual:** Planejamento concluído — pronto para implementação paralela.
**Ramo:** Novo plano de extensão multi-rede (Google Ads + TikTok).
**O que documentei:**
1. **`docs/PLANO_GOOGLE_TIKTOK.md` (v1.0)** — Plano completo de 2 fases:
   - **FASE 1 — Google Ads:** Completar adapter (tirar do mock), adicionar negativação automática, métricas de IS, regras de SCALE/KILL. DoD: lançar campanha real, ver CPL comparável ao Meta.
   - **FASE 2 — TikTok:** Adapter SDK oficial, reuso de métricas de vídeo (FASE 5 já criou colunas), template de vídeo. DoD: lançar campanha real, agente propor REFRESH por Hook Rate.
2. **Dependência crítica:** Developer Token Google Ads API (5–15 dias aprovação). Ação imediata: solicitar.
3. **Coordenação:** Detectei que Antigravity já ~40% iniciada em Google (branch `feature/ag-cockpit-camadas`). Este plano **audita + completa + tira do mock**, sem duplicar. Dividiram-se responsabilidades claras no documento.
4. **Princípios:**
   - Portão do KPI: nenhum dado sem decisão amarrada (IS Lost → SCALE, Hook baixo → REFRESH)
   - Multi-segmento por config JSONB (`network_defaults.google`, `network_defaults.tiktok`)
   - Reuso 100%: ~30 agentes existentes, dashboard consolidado, fila de aprovação
   - Fora: SEO, Quality Score passivo, hashtags/sounds do TikTok
5. **Esforço resumido:** Google 2 tabelas novas + 4 colunas + 1 agente novo (negativação); TikTok 0 tabelas + 0 colunas (reusa vídeo) + 0 agentes (reusa REFRESH_CREATIVE).
**Aviso para próxima sessão:** Assim que Developer Token tiver perspectiva, iniciar Passo 2 (Migrations A2) e auditar o que Antigravity já fez em Google. Coordenar via este arquivo.
