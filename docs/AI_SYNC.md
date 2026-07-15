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
**Aviso para o Claude:** Por favor, NÃO edite o `dashboard/page.tsx` ou adicione componentes na pasta de dashboard enquanto eu estiver operando nesta branch.
