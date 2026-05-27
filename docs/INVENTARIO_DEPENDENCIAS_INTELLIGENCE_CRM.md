# 📋 INVENTÁRIO DE DEPENDÊNCIAS: CRM INTELLIGENCE (v2.0)

**Módulo:** Real Estate CRM Intelligence & Governance Harness  
**Data:** 31/03/2026 | **Versão:** 2.0  
**Status:** 🚨 **OBRIGATÓRIO / ATIVO**

---

## 1. 🗄️ Camada de Dados (Tabelas)

| Tabela | Dependência Direta | Impacto em Produção | Observações |
|--------|-------------------|---------------------|-------------|
| `leads_staging` | Ingestão Web/Social | Médio (Novos Registros) | Armazena o lead bruto. Não afeta `imoveis` ou `users`. |
| `leads_kanban` | Fluxo de Vendas | Baixo | Referencia o `lead_uuid` da staging. |
| `corretor_scores` | Gamificação / Meritocracia | Médio | Referencia `users.id` (corretores). Fundamental para Round Robin. |
| `colunas_kanban` | UI / Workflow | Baixo | Configuração das etapas de venda. |
| `users` (FK) | Auth / Identidade | **ALTO (CRÍTICO)** | O CRM lê esta tabela para rotear leads. **PROIBIDO** alterar schema de `users`. |

---

## 2. 🔌 Camada de API (Endpoints)

| Rota | Consumidor | Autenticação | Risco de Quebra |
|------|-----------|--------------|-----------------|
| `/api/crm/leads` | Staging UI | JWT (Admin) | Baixo (Leitura/Escrita) |
| `/api/crm/kanban` | Kanban UI | JWT (Admin) | Baixo |
| `/api/crm/stats/leaderboard` | Dashboard | JWT (Admin) | Baixo |
| `/api/public/leads/capture` | Landing Page | **NENHUMA (PÚBLICA)** | **ALTO (Exposição/Rate Limit)** |

---

## 3. 🧠 Camada de Serviços (Core Intelligence)

| Serviço | Arquivo | Responsabilidade | Dependência |
|---------|---------|------------------|-------------|
| `ConciergeService` | `src/lib/ai/conciergeService.ts` | Qualificação IA | OpenAI API (Opt) / Regex (Current) |
| `DistributionEngine` | `src/lib/routing/distributionEngine.ts` | Round Robin / SLA | `corretor_scores` table |
| `GamificationService` | `src/lib/gamification/gamificationService.ts` | XP / Níveis | `corretor_scores` table |
| `SLA Worker` | `scripts/lead-router-sla-worker.js` | Transbordo (5 min) | Node.js Runtime / DB Pool |

---

## 🔒 4. Protocolo de Segurança (Harness)

1.  **Rate Limiting Agresso (Ingestão):** Obrigatório na rota pública de captura para evitar "lead flooding".
2.  **Sanitização Inviolável:** Todos os dados vindo via Webhook (FB/CAPI) devem passar pelo `HarnessSanitization` para evitar SQL Injection no motor de IA.
3.  **Isolation Guard:** A morte do worker de SLA não pode impedir o funcionamento da Landing Page (Fluxo Principal).

---

**Este inventário deve ser consultado antes de qualquer alteração que toque na comunicação entre o Landpaging e o CRM.** 🛰️
