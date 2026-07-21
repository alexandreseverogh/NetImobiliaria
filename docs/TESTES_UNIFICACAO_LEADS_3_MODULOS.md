# PLANO DE TESTES — Unificação de Leads entre Campanhas, CRM e Mensageria

> **Status:** plano elaborado, execução pendente.
> **Referência:** `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §7 (matriz T1-T9, DG1-DG4, I1-I4, A1-A3).
> **Objetivo:** validar de ponta a ponta, com dado real (não mockado), os 4 blocos de teste do
> plano estratégico, cobrindo as 7 combinações reais de contratação dos 3 módulos vendidos
> separadamente. Cada teste tem: setup, passos, resultado esperado, verificação e limpeza.
> Bugs encontrados são corrigidos e commitados antes de seguir pro próximo teste.

---

## 0. Metodologia

### 0.1. Tenants usados

Levantamento real (2026-07-21): nenhum tenant existente tem as combinações C-only, R-only,
M-only, C+M ou R+M — só C+R (Imobiliaria XYZ, Imovitec) e C+R+M (Marketing Digital).

| Combo | Tenant | Estratégia |
|-------|--------|------------|
| C+R (T4, T5) | Imobiliaria XYZ (`c828d003-...`) | tenant real, sem alteração |
| C+R+M (T8, T9) | Marketing Digital (`efbf62cf-...`) | tenant real, sem alteração |
| C / R / M / C+M / R+M (T1, T2, T3, T6, T7) | **Teste RAG — Multi-Segmento** (`11111111-2222-3333-4444-555555555555`) | tenant bancada — hoje com **zero módulos**; ligo/desligo `tenant_modules` por cenário via SQL direto, testo, **sempre devolvo pro estado original (zero módulos) ao final de cada cenário** |

IDs de módulo: `trafego-pago=437c2d73-...`, `crm=a5e8f2df-...`, `mensageria=d202a643-...`.

### 0.2. Disciplina de execução

- Cada teste roda contra API real (curl) ou SQL direto — nunca simulado/mockado.
- Dado de teste é sempre prefixado (`TESTE UNIF-<código>`) e removido logo após a verificação,
  cascata confirmada — mesmo padrão usado em todas as fases anteriores desta sessão.
- Bug encontrado → registrado na seção 5 (Log de Execução) com causa raiz, corrigido, `npx tsc
  --noEmit` limpo, testado de novo, só então marcado ✅.
- Reconfiguração de `tenant_modules` do tenant-bancada é sempre feita e revertida via SQL
  direto (nunca via UI de provisionamento, pra não arriscar o incidente já registrado no
  CLAUDE.md de payload parcial apagando módulos de um tenant real).

---

## 1. Matriz de Cenários de Contratação (T1-T9)

### T1 — Só Campanhas (C)
**Setup:** tenant-bancada com `trafego-pago` apenas.
**Fluxo:** clique real em `/api/r/{trackingId}` (CTA WhatsApp) + clique em `/api/r/{trackingId}`
(CTA formulário, `ad.ctaType != WHATSAPP_MESSAGE`) numa campanha/Ad de teste deste tenant.
**Esperado:** `CtaInteraction` gravada nos 2 casos (cliques/interesses contados). Sidebar do
tenant mostra "Leads de Campanhas" (`/admin/campanhas/leads`) mas **não** mostra Kanban/Gestão
de Leads (features do módulo `crm`, ausente). Página de leads de Campanhas continua funcionando
(lê `leads_staging`/`marketing_eventos`, que são infraestrutura interna, não gated por módulo).

### T2 — Só CRM (R)
**Setup:** tenant-bancada com `crm` apenas.
**Fluxo:** `POST /api/crm/leads` simulando (a) formulário do site (`/api/public/imoveis/
prospects`-style) e (b) entrada manual (`utm_source: 'CRM Manual'`).
**Esperado:** `leads_staging` criado, qualificado (Concierge IA), roteado (`DistributionEngine`
— usa o segmento do tenant, não precisa de Campanhas). Sidebar mostra Kanban/Gestão de Leads,
não mostra nada de Campanhas. Zero dependência de `marketing_eventos.campaign_id`.

### T3 — Só Mensageria (M)
**Setup:** tenant-bancada com `mensageria` apenas.
**Fluxo:** simular webhook Evolution de mensagem WhatsApp entrante, sem nenhum `[ref:...]` na
mensagem (orgânico puro).
**Esperado:** `mensageria.contacts`/`conversations` criados. **Nenhum** lead em `leads_staging`
é exigido — `inboundProcessor.ts` tenta criar via `/api/crm/leads`, que hoje SEMPRE roda
independente de módulo (é infraestrutura compartilhada) — então tecnicamente um lead SERÁ
criado mesmo aqui. **Ponto a verificar/decidir**: isso é o comportamento correto? O plano original
diz "SEM pipeline de vendas" mas não é explícito se `leads_staging` deveria ou não receber a
linha quando só M está contratado. Registrar como achado, não assumir.

### T4 — Campanhas + CRM, sem Mensageria (o cenário crítico do plano)
**Setup:** Imobiliaria XYZ (real, C+R, sem M).
**Fluxo:** `POST /api/crm/leads` com `campaign_id` real (simulando Lead Ads/formulário).
**Esperado:** lead em `leads_staging` + `marketing_eventos` com atribuição real — **funciona sem
Mensageria** (D1/D3 já provou isso nesta sessão; aqui é reteste formal).

### T5 — Campanhas + CRM, sem Mensageria — caminho WhatsApp
**Setup:** Imobiliaria XYZ (mesmo tenant do T4).
**Fluxo:** clique em `/api/r/{trackingId}` (CTA WhatsApp) — **sem** simular resposta via
Mensageria (já que o tenant não tem o módulo).
**Esperado:** `CtaInteraction` (clique) registrada. Identidade **não** é resolvida
automaticamente (não há Mensageria pra processar a resposta) — nenhum lead criado a partir
desse clique isolado. Nada quebra.

### T6 — Campanhas + Mensageria, sem CRM
**Setup:** tenant-bancada com `trafego-pago` + `mensageria`.
**Fluxo:** clique real `/api/r/{trackingId}` (WhatsApp) → resposta simulada via
`processInboundWhatsAppMessage` com `[ref:trackingId]`.
**Esperado:** conversa capturada na Mensageria, ligada ao clique (`CtaInteraction` com
`campaign_id`/`ad_id` reais via `resolveCtaRef`). **Sem pipeline** (sidebar não mostra
Kanban/Gestão de Leads — módulo `crm` ausente).

### T7 — CRM + Mensageria, sem Campanhas
**Setup:** tenant-bancada com `crm` + `mensageria`.
**Fluxo:** resposta simulada via `processInboundWhatsAppMessage`, **sem** nenhum `[ref:...]`
(mensagem orgânica, sem campanha nenhuma envolvida).
**Esperado:** conversa vira lead no pipeline do CRM. `marketing_eventos` vazio pra esse lead
(sem campanha) — sem erro, sem tentativa de atribuição falsa.

### T8 — Os 3 módulos, caminho WhatsApp completo
**Setup:** Marketing Digital (real, C+R+M).
**Fluxo:** clique real `/api/r/{trackingId}` → resposta simulada com `[ref:...]` →
`processInboundWhatsAppMessage` → `/api/crm/leads`.
**Esperado:** lead identificado com atribuição de campanha real, no pipeline, e — se movido pra
`fechamento` com `valor_venda` — aparece na Visão 4 (F6, CPA/ROAS real).

### T9 — Os 3 módulos, dois caminhos convergindo (Match Engine)
**Setup:** Marketing Digital (mesmo do T8).
**Fluxo:** o MESMO lead (telefone/email) chega primeiro via formulário (`campaign_id=A`), depois
via WhatsApp de uma campanha diferente (`campaign_id=B`).
**Esperado:** **UM** registro em `leads_staging` (Match Engine, F4), com **dois** eventos em
`marketing_eventos` (um por campanha) — nenhuma duplicação, atribuição de ambos os toques
preservada.

---

## 2. Degradação Graciosa (DG1-DG4)

### DG1 — Tenant sem CRM tenta ver "pipeline"
Confirmado por inspeção de `system_feature_modules`: `/admin/campanhas/leads` está sob
`trafego-pago` (sempre visível a quem tem Campanhas); Kanban/Gestão de Leads estão sob `crm`
(só visível com o módulo). **Teste:** gerar sidebar real (`get_sidebar_menu_for_user`) pro
tenant-bancada com só `trafego-pago` e confirmar ausência das features de `crm`.

### DG2 — Tenant sem Mensageria usa CTA de WhatsApp
Mesmo cenário do T5. **Esperado adicional:** a UI do dashboard de Campanhas não deveria
prometer "lead identificado" pra esses cliques — verificar se existe (ou falta) esse aviso
explícito hoje.

### DG3 — Tenant sem Campanhas no CRM
**Setup:** tenant-bancada com só `crm` (T2, reaproveitado). **Esperado:** funil comercial e
leads funcionam plenamente; seções de atribuição de campanha aparecem vazias, sem quebrar
nenhuma query (`marketing_eventos` sem linha nenhuma pra esses leads).

### DG4 — Desprovisionar módulo no meio do ciclo de um lead
**Setup:** criar um lead completo no tenant-bancada com C+R+M, depois **remover** o módulo
`crm` via SQL (`tenant_modules.is_enabled=false`) sem tocar no lead já criado.
**Esperado:** o lead continua íntegro em `leads_staging` (não é deletado nem corrompido); só a
visibilidade da UI de pipeline some.

---

## 3. Integridade da Fonte Única (I1-I4)

### I1 — Mesmo lead, dois canais → um registro
É o T9 executado com foco na contagem: `SELECT COUNT(*) FROM leads_staging WHERE telefone=...`
tem que dar exatamente 1.

### I2 — Mesmo número em Campanhas e CRM
Comparar `GET /admin/campanhas/leads` (contagem) com a contagem real de `leads_staging` no
mesmo escopo (tenant/cliente/período) — têm que bater exatamente.

### I3 — "Cliques" ≠ "Leads identificados"
Inspeção de UI/API: confirmar que os dois números aparecem rotulados de forma distinta em
qualquer tela que mostre ambos (não é mais a mesma palavra "Leads" pros dois, como era antes
do D1).

### I4 — Reprovisionar não duplica
Reativar o módulo `crm` no tenant do DG4 e confirmar que o lead não duplicou nem sumiu.

---

## 4. Atribuição (A1-A3)

### A1 — Lead de WhatsApp via token tem atribuição real
Já testado formalmente no D3 e no F2/F3 desta sessão (campanha real "Alto Padrão — Alphaville").
Reteste rápido de confirmação, não descoberta nova.

### A2 — Negócio fechado propaga pra Visão 4
Já testado formalmente no F6 (CPA=R$11.927,02, ROAS=71,27x). Reteste rápido de confirmação.

### A3 — Lead sem origem de campanha não recebe atribuição falsa
**Teste novo:** lead via formulário do site (`/api/public/imoveis/prospects`, sem nenhum
`campaign_id`/`ref`) — confirmar `marketing_eventos.campaign_id IS NULL` (nunca inventado).

---

## 5. Log de Execução

_Preenchido conforme cada teste roda. Formato: resultado, achados, correções._

| # | Resultado | Achados / bugs | Commit |
|---|-----------|-----------------|--------|
| T1 | ✅ passou | CtaInteraction gravada nos 2 casos (WHATSAPP_CLICK + REDIRECT) via `/api/r/{trackingId}` real. Sidebar real (`get_sidebar_menu_for_user`) só mostra "Campanhas de Marketing Digital" (6 features), sem nenhuma feature de CRM/Mensageria. `GET /api/admin/campanhas/leads` funciona (200) mesmo sem módulo CRM — confirma que é infra compartilhada, não gated. Clique WhatsApp caiu no fallback de home por falta de `WhatsAppConfig` no tenant-bancada (comportamento correto, não bug — CtaInteraction já tinha sido gravada antes do fallback). Criado usuário-bancada `teste.unif.bench` (reutilizado nos próximos testes deste tenant, removido só ao final da bateria). | — |
| T2 | ✅ passou | 2 leads reais (formulário + manual) via `POST /api/crm/leads` no tenant-bancada (só `crm`). `leads_staging` criado nos 2 casos, Concierge IA qualificou (tag_sonho/resumo_ia/score_prontidao), `DistributionEngine` rodou pelo segmento "Geral" do tenant (sem depender de imóvel) — `corretor_atribuido_id` ficou NULL nos 2 (esperado: bench tenant não tem nenhum corretor/plantonista real, achado consistente com o gap real do Imobiliário já registrado, não um bug). Sidebar real mostra Kanban/Gestão de Leads/Configurações CRM, zero menção a Campanhas. `marketing_eventos` gravado com `campaign_id NULL` sem erro (zero dependência confirmada). Criadas `kanban_colunas` reais (réplica das 7 colunas do Marketing Digital) pra tornar o teste fiel a um tenant CRM real. | — |
| T3 | ✅ passou (+1 bug real corrigido) | Webhook real da Evolution simulado (token real do tenant-bancada, só `mensageria`). `mensageria.contacts`/`conversations` criados corretamente. **Achado confirmado (não assumido):** `processInboundWhatsAppMessage` chama `/api/crm/leads` incondicionalmente — um lead FOI criado em `leads_staging` mesmo com só Mensageria contratada (infra compartilhada, por design do D1, mas vale decisão de produto se isso é desejável expor sem UI de pipeline). **Bug real encontrado e corrigido:** `POST /api/crm/leads` lançava 500 pra qualquer tenant sem nenhum `kanban_colunas` ativo — o trigger `trg_log_kanban_ciclos` tentava gravar `coluna_id NULL` numa coluna NOT NULL de `leads_kanban_ciclos`. `leads_staging` já tinha commitado antes (não perdia dado), mas o caller via erro. Corrigido via `prisma/migration-2026-07-21-fix-kanban-ciclos-null-coluna.sql` (trigger pula o registro de auditoria quando `coluna_id IS NULL`; zero mudança de comportamento pra tenants com kanban configurado). Retestado limpo pós-fix: `mensageria.contacts.lead_uuid` linkado corretamente ao lead real. Sidebar mostra só "Central de Mensagens" (5 itens), sem Campanhas/CRM. | `migration-2026-07-21-fix-kanban-ciclos-null-coluna.sql` |
| T4 | ✅ passou | Imobiliaria XYZ (real, C+R, sem M) — confirmado zero campanhas reais nesse tenant (as testadas em sessões anteriores eram do Marketing Digital), então criada 1 campanha real prefixada de teste. `POST /api/crm/leads` com `campaign_id` real → `leads_staging` + `marketing_eventos` com atribuição real (`utm_campaign`/`campaign_id` corretos), funciona sem módulo Mensageria. **Bônus:** `corretor_atribuido_id` populado (Juliana Carvalho, via `round_robin` — a mesma correção de "lead morto" que o usuário aplicou antes de começar a bateria), confirmando o safety net funcionando ponta a ponta num tenant real. | — |
| T5 | ✅ passou | Imobiliaria XYZ, Ad WhatsApp de teste, clique real em `/api/r/{trackingId}` sem nenhuma resposta simulada via Mensageria. `CtaInteraction` (WHATSAPP_CLICK) gravada corretamente; `leads_staging` continua em 0 pra esse tenant — nenhum lead criado a partir do clique isolado, como esperado (sem Mensageria pra processar a resposta, não há identidade pra resolver). Redirect caiu no fallback de home por falta de `WhatsAppConfig` no tenant (mesmo comportamento gracioso do T1, não é falha). | — |
| T6 | ✅ passou | Tenant-bancada (trafego-pago+mensageria, sem crm). Clique real `/api/r/{trackingId}` (Ad WhatsApp de teste) → resposta simulada via webhook Evolution com `[ref:teste-unif-t6-track]`. `CtaInteraction` gravada 2x (WHATSAPP_CLICK + SUBMIT), ambas com `campaign_id`/`ad_id` reais via `resolveCtaRef`. Conversa capturada na Mensageria com `lead_uuid` linkado. Sidebar real mostra "Campanhas de Marketing Digital" + "Central de Mensagens", zero menção a CRM/Kanban. | — |
| T7 | ✅ passou | Tenant-bancada (crm+mensageria, sem trafego-pago). Webhook Evolution simulado sem `[ref:...]` (mensagem orgânica). Conversa virou lead real no pipeline (`leads_kanban`, coluna `lead_captado`). **Nuance no enunciado do plano:** `marketing_eventos` não fica literalmente vazio — existe 1 linha honesta (`utm_source='whatsapp', utm_medium='organico'`), mas `campaign_id`/`utm_campaign` são `NULL` (zero atribuição falsa, que é o que realmente importava no enunciado). Sidebar real mostra CRM+Mensageria, zero menção a Campanhas. | — |
| T8 | ✅ passou | Marketing Digital (real, C+R+M), fixture real já existente `Ad "Alto Padrão — Principal"` (`trackingId=demo-track-001`) + campanha real "Alto Padrão — Alphaville". Clique real `/api/r/demo-track-001` → redirect pro wa.me com `[ref:demo-track-001]` embutido → webhook Evolution real simulado com essa tag → lead criado com `utm_campaign`/`campaign_id` reais → movido pra `fechamento` com `valor_venda=900000` → `GET /dashboard/revenue-attribution` reflete `dealsWon:1, revenue:900000, cpaReal:35, roasReal:25714` pra essa campanha. Ponta a ponta com dado real, sem nenhum mock. Serve também como reteste formal de A1 e A2. | — |
| T9 | ✅ passou | Marketing Digital (real). Mesmo telefone chegou via formulário direto (`campaign_id`=Alphaville real) e depois via WhatsApp com `[ref:...]` de uma campanha B de teste diferente. Resultado: **exatamente 1** linha em `leads_staging` (`match_method='telefone'`, Match Engine funcionou), **exatamente 2** linhas em `marketing_eventos`, uma por campanha, sem duplicação nem perda de atribuição. (Nota operacional: usei acento direto num payload curl pra `utm_campaign` e corrompeu o encoding daquela linha de teste — lição já registrada no projeto, sem impacto real pois a linha foi removida na limpeza.) | — |
| DG1 | pendente | | |
| DG2 | pendente | | |
| DG3 | pendente | | |
| DG4 | pendente | | |
| I1 | ✅ passou | Confirmado como parte do T9 — `COUNT(*)` real via SQL deu exatamente 1 pro telefone/email do mesmo lead entrando por 2 canais diferentes. | — |
| I2 | pendente | | |
| I3 | pendente | | |
| I4 | pendente | | |
| A1 | ✅ passou | Confirmado como parte do T8 (mesmo clique `/api/r/demo-track-001` → `[ref:...]` → lead com `campaign_id`/`utm_campaign` reais). | — |
| A2 | ✅ passou | Confirmado como parte do T8 (mesmo lead movido pra `fechamento` com `valor_venda=900000` → `GET /dashboard/revenue-attribution` retornou `cpaReal`/`roasReal` reais e corretos). | — |
| A3 | pendente | | |
