# PLANO MESTRE — Módulo Mensageria (Chatwoot-inspired, nativo)

> **Status:** proposta para avaliação · **Data:** 2026-07-05
> **Decisões travadas:** (1) Build **nativo** no stack atual (Next.js 14 + Postgres), replicando o
> modelo de dados/UX do Chatwoot — sem subir a stack Rails do Chatwoot. (2) MVP cobre **todos os
> canais** (WhatsApp + formulários da aplicação + input manual + chatbot).
> **Princípio de integração:** o Mensageria é **desacoplado** do CRM — conversam por fronteira HTTP
> e por chave de identidade compartilhada (`lead_uuid` / telefone / email), nunca por tabelas ou
> regras de negócio compartilhadas.

---

## 1. Visão e princípios

O Mensageria é uma **caixa de entrada omnichannel** que concentra toda mensagem recebida e trocada,
independentemente da origem (WhatsApp via Evolution, formulários da aplicação/CTA, input manual de um
atendente, e o chatbot). Equipes de pessoas atendem essas conversas em tempo real, com atribuição,
respostas rápidas, etiquetas e SLA. Um camada de **analytics** sintetiza tudo por filtros e
agrupamentos.

**Princípios de projeto (herdados do que já existe na plataforma):**

1. **Multi-tenant + multi-segmento em tudo** — toda tabela nova carrega `tenant_id` e `client_id`
   (nullable = "próprio do tenant"), exatamente como `leads_staging`, `CtaSubmission`, campanhas.
2. **Zero hardcode de configuração** — canais, times, respostas rápidas e fluxos do bot vivem no
   banco, configuráveis por tenant.
3. **Reuso máximo da infra existente** — a ingestão WhatsApp (Evolution), o envio outbound
   (`notifyWhatsApp`), o CTA (`CtaSubmission`), o LLM multi-provider e o controle de acesso
   (`system_features` + sidebar dinâmica) **já existem** e serão reaproveitados, não reescritos.
4. **Desacoplamento do CRM** — o Mensageria não sabe o que é um "corretor", "kanban" ou "score". Ele
   conhece **contatos** e **conversas**. A ponte com o CRM é uma fronteira HTTP fina + a chave
   `lead_uuid`.
5. **Tempo real de verdade** — atendimento colaborativo exige entrega instantânea (Redis Pub/Sub → SSE).

---

## 2. O que já existe e será reaproveitado

| Capacidade | Onde está hoje | Reuso no Mensageria |
|---|---|---|
| Ingestão WhatsApp inbound | `/api/public/evolution/webhook` (por tenant via `evolution_webhook_secret`) | **Refatorado** para escrever em `conversations`/`messages` em vez de só criar lead |
| Envio WhatsApp outbound | `notifyWhatsApp()` → `POST {apiUrl}/message/sendText/{instance}` | Extraído para um **adapter de canal** reutilizável (envio a partir da inbox) |
| Config Evolution por tenant | `public.tenants` (`evolution_api_url/key/instance`, `numero_whatsapp`) | Mesma fonte — vira 1 registro em `mensageria.inboxes` |
| Formulários / CTA | `CtaSubmission` (schema `campanhasmarketingdigital`) | Emite evento → cria conversa no canal `webform` |
| Identidade de lead | `leads_staging.lead_uuid`, dedupe por email/telefone | Chave de ligação Contato ↔ Lead (soft link) |
| LLM multi-provider | `getLlmClientForCampaigns()` + `system_prompt_templates` | Motor do chatbot e do auto-resumo/sugestão de resposta |
| Controle de acesso + sidebar | `system_features`, `permissions`, `tenant_feature_overrides`, `get_sidebar_menu_for_user` | Novo módulo `mensageria` provisionável por tenant |
| Notificações Slack/WhatsApp de sistema | `agentNotificador.ts` | Alertas de SLA estourado / nova conversa não atribuída |

**A lacuna que este módulo fecha:** hoje **cada mensagem WhatsApp vira um lead solto** e o texto fica
enterrado em `mensagem_inicial`/`payload_extra`. Não existe **thread de conversa**, caixa unificada,
times, tempo real, chatbot alimentando o painel, nem analytics de mensagens.

---

## 3. Arquitetura desacoplada — como Mensageria e CRM conversam

```
                         ┌─────────────────────────────────────────────┐
   WhatsApp (Evolution) ─┤                                             │
   Formulários / CTA    ─┤          MÓDULO MENSAGERIA (novo)           │
   Input manual         ─┤   schema: mensageria                        │
   Chatbot              ─┤   contacts · conversations · messages       │
                         │   inboxes · teams · labels · bot_flows      │
                         └───────────────┬─────────────────────────────┘
                                         │  fronteira HTTP fina + chave lead_uuid
                                         │  (NUNCA tabela/lógica compartilhada)
                         ┌───────────────┴─────────────────────────────┐
                         │              MÓDULO CRM (existente)          │
                         │   leads_staging · leads_kanban · Distribution│
                         └─────────────────────────────────────────────┘
```

**Contrato de desacoplamento (as duas únicas pontes permitidas):**

1. **Chave de identidade compartilhada** — `mensageria.contacts.lead_uuid` é um *soft link* nullable
   para `leads_staging.lead_uuid`. Nenhum FK físico cross-schema (evita acoplamento de deploy/DDL).
2. **Fronteira HTTP** — quando uma conversa gera um contato qualificável, o Mensageria chama o
   endpoint **que já existe** `POST /api/crm/leads` (idêntico ao que o webhook Evolution faz hoje). O
   CRM devolve `lead_uuid`, que o Mensageria grava no contato. No sentido inverso, o CRM apenas
   *deep-linka* para `/mensageria/conversas/{id}`.

Resultado: pode-se desligar o CRM e o Mensageria continua funcionando como inbox pura; pode-se
desligar o Mensageria e o CRM continua recebendo leads pelo endpoint atual. **Acoplamento = 1 chave +
1 chamada HTTP.**

---

## 4. Modelo de dados — novo schema `mensageria`

Segue a convenção do projeto: **DDL via SQL direto** (`docker exec ... psql < migration.sql`),
**nunca `prisma db push`**. Schema próprio `mensageria` para isolamento (como
`campanhasmarketingdigital`).

### 4.1 Tabelas núcleo

```sql
CREATE SCHEMA IF NOT EXISTS mensageria;

-- Canal de entrada/saída (1 por WhatsApp/tenant, 1 webform, 1 manual, 1 chatbot…)
CREATE TABLE mensageria.inboxes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  client_id    uuid,                       -- null = próprio do tenant
  name         text NOT NULL,
  channel_type text NOT NULL,              -- 'whatsapp' | 'webform' | 'manual' | 'chatbot' | 'webchat'
  config       jsonb NOT NULL DEFAULT '{}',-- credenciais/endpoints por canal
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Contato: identidade unificada de quem escreve (dedupe por telefone/email no tenant)
CREATE TABLE mensageria.contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  client_id   uuid,
  name        text,
  phone       text,                        -- normalizado (E.164 sem símbolos)
  email       text,
  avatar_url  text,
  lead_uuid   uuid,                         -- SOFT LINK p/ leads_staging (desacoplado)
  attributes  jsonb NOT NULL DEFAULT '{}', -- campos livres (pushName, cidade…)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contacts_tenant_phone ON mensageria.contacts (tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX contacts_tenant_email ON mensageria.contacts (tenant_id, email) WHERE email IS NOT NULL;

-- Conversa: uma thread por contato × inbox
CREATE TABLE mensageria.conversations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  client_id      uuid,
  inbox_id       uuid NOT NULL REFERENCES mensageria.inboxes(id),
  contact_id     uuid NOT NULL REFERENCES mensageria.contacts(id),
  status         text NOT NULL DEFAULT 'open',  -- open | pending | snoozed | resolved
  priority       text,                          -- low | medium | high | urgent
  assignee_id    uuid,                          -- users.id (atendente responsável)
  team_id        uuid REFERENCES mensageria.teams(id),
  handled_by_bot boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  first_response_at timestamptz,               -- p/ SLA (tempo de 1ª resposta)
  resolved_at    timestamptz,
  unread_count   int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conv_inbox_status ON mensageria.conversations (tenant_id, inbox_id, status, last_message_at DESC);
CREATE INDEX conv_assignee ON mensageria.conversations (assignee_id, status);

-- Mensagem: cada bolha da thread
CREATE TABLE mensageria.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  direction       text NOT NULL,             -- inbound | outbound
  sender_type     text NOT NULL,             -- contact | agent | bot | system
  sender_id       uuid,                      -- users.id quando agent
  content         text,
  content_type    text NOT NULL DEFAULT 'text', -- text | image | file | audio | template | note
  attachments     jsonb NOT NULL DEFAULT '[]',
  external_id     text,                      -- id da mensagem na Evolution (idempotência)
  delivery_status text NOT NULL DEFAULT 'sent', -- sent | delivered | read | failed
  is_private      boolean NOT NULL DEFAULT false, -- nota interna (não vai ao contato)
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX messages_external ON mensageria.messages (tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX messages_conv ON mensageria.messages (conversation_id, created_at);
```

### 4.2 Times, colaboração e produtividade

```sql
CREATE TABLE mensageria.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, name text NOT NULL,
  auto_assign boolean NOT NULL DEFAULT true,      -- round-robin de atribuição
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mensageria.team_members (
  team_id uuid NOT NULL REFERENCES mensageria.teams(id),
  user_id uuid NOT NULL,                            -- public.users.id
  role    text NOT NULL DEFAULT 'agent',            -- agent | lead
  PRIMARY KEY (team_id, user_id)
);
CREATE TABLE mensageria.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, name text NOT NULL, color text NOT NULL DEFAULT '#c5a028'
);
CREATE TABLE mensageria.conversation_labels (
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES mensageria.labels(id),
  PRIMARY KEY (conversation_id, label_id)
);
CREATE TABLE mensageria.canned_responses (           -- respostas rápidas /atalho
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, shortcut text NOT NULL, content text NOT NULL
);
-- Trilha de auditoria da conversa (atribuições, mudança de status, etc.)
CREATE TABLE mensageria.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  event_type text NOT NULL,   -- assigned | status_changed | labeled | bot_handoff | note_added
  actor_id uuid, payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.3 Chatbot

```sql
CREATE TABLE mensageria.bot_flows (                  -- fluxo por tenant/segmento
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, client_id uuid,
  name text NOT NULL, mode text NOT NULL DEFAULT 'llm', -- 'llm' | 'rules'
  system_prompt text,                                 -- persona/base de conhecimento
  handoff_rules jsonb NOT NULL DEFAULT '{}',          -- quando transferir p/ humano
  is_active boolean NOT NULL DEFAULT false
);
CREATE TABLE mensageria.bot_sessions (               -- estado da conversa com o bot
  conversation_id uuid PRIMARY KEY REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES mensageria.bot_flows(id),
  state jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

> **Nota:** todas as migrações rodam **localmente primeiro** e ficam pendentes na VPS para um batch
> único (padrão do projeto, ver CHECKPOINT.md).

---

## 5. Ingestão multi-canal — padrão *adapter*

Um único ponto de entrada normaliza qualquer canal para o par `{contact, message}`:

```
src/lib/mensageria/
  ingest.ts              → ingestMessage({ inbox, external_id, from, text, attachments, direction })
                           · dedupe de contato (telefone/email)
                           · encontra/cria conversation aberta (mesma inbox+contato)
                           · insere message (idempotente por external_id)
                           · dispara realtime + regras de bot/atribuição
  channels/
    whatsappAdapter.ts   → parse do payload Evolution (reaproveita a lógica atual do webhook)
                           + send() extraído de notifyWhatsApp()
    webformAdapter.ts    → consome CtaSubmission (hook no insertSubmission)
    manualAdapter.ts     → atendente inicia conversa (outbound-first)
    botAdapter.ts        → mensagens do chatbot (sender_type='bot')
```

**Mudança cirúrgica nos pontos existentes:**

- `/api/public/evolution/webhook` — em vez de criar lead direto, chama `ingestMessage()`. A criação
  de lead no CRM passa a ser **consequência de regra** (ex.: contato novo sem `lead_uuid` → chama
  `POST /api/crm/leads`), preservando 100% do comportamento atual de captação.
- `insertSubmission()` (CTA) — emite para `ingestMessage()` no canal `webform`, criando conversa.

---

## 6. Envio outbound + tempo real

**Envio:** a partir da inbox, `POST /api/mensageria/conversations/{id}/messages` grava a mensagem
(`direction=outbound`) e chama `whatsappAdapter.send()` (o mesmo `sendText` da Evolution já usado).
Status de entrega (`delivered/read`) volta por eventos da Evolution → atualiza `delivery_status`.

**Tempo real (colaboração):** já temos **Redis** na infra (`netimobiliaria-redis`).

```
ingestMessage()/send() → publica em canal Redis  mensageria:{tenantId}
Front assina via SSE:  GET /api/mensageria/stream (route handler, text/event-stream)
                       → filtra por inbox/assignee → atualiza lista e thread ao vivo
```

SSE (não WebSocket) por simplicidade no App Router e por já bastar para inbox. Indicadores de
"digitando" e presença de agente entram como eventos leves no mesmo canal.

---

## 7. Chatbot integrado (alimenta o painel)

O bot é **só mais um `sender_type`** — cada resposta dele é uma `message` normal, então **aparece no
painel e no analytics automaticamente**. Fluxo:

1. Mensagem inbound chega → `ingestMessage()` verifica se a inbox/segmento tem `bot_flow` ativo e a
   conversa não está atribuída a humano.
2. `botAdapter` monta o contexto (histórico + `system_prompt` do fluxo) e chama `getLlmClientForCampaigns()`
   (LLM multi-provider já existente, config por tenant).
3. Resposta vira `message (sender_type='bot')` → enviada pelo canal + publicada no realtime.
4. **Handoff:** por regra (`handoff_rules`: intenção de compra, pedido explícito de humano, N
   interações) o bot marca `handled_by_bot=false`, cria evento `bot_handoff` e a conversa entra na
   fila do time — tudo visível na timeline.

Persona e base de conhecimento ficam em `bot_flows.system_prompt` (zero hardcode), versionável como os
demais `system_prompt_templates`.

---

## 8. Interfaces premium (telas)

Design 100% aderente ao **DESIGN.md** (navy `#0a192f`/`#112240` + âmbar `#c5a028` como único acento,
Inter, dark-primário, elevação tonal). Layout dedicado `src/app/mensageria/` com sidebar dinâmica
(mesmo padrão do CRM).

### 8.1 Caixa de Entrada (`/mensageria`) — layout 3 colunas
- **Coluna 1 — Filtros/Pastas:** Todas, Não atribuídas, Minhas, Menções, por Inbox, por Time,
  por Status. Contadores ao vivo. Chips de canal (WhatsApp/Form/Manual/Bot) com ícone.
- **Coluna 2 — Lista de conversas:** avatar do contato, prévia da última mensagem, canal, tempo
  relativo, badge de não-lidas (âmbar), etiquetas. Ordenação por `last_message_at`. Busca.
- **Coluna 3 — Thread:** bolhas inbound (navy-surface) × outbound (âmbar suave) × nota interna
  (tracejado), status de entrega (✓✓), composer com respostas rápidas (`/atalho`), anexos, botão
  "nota interna", e ações de topo: **Atribuir**, **Resolver**, **Etiquetar**, **Prioridade**,
  **Transferir para humano** (se bot).
- **Painel lateral do contato (colapsável):** dados do contato, atributos, **link para o lead no
  CRM** (`lead_uuid`) — a ponte de desacoplamento visível ao atendente.

### 8.2 Configurações (`/mensageria/config`)
Inboxes (conectar WhatsApp/Evolution, status de conexão — reusa `getEvolutionStatus`), Times &
membros, Etiquetas, Respostas rápidas, Fluxos do bot (persona + regras de handoff).

### 8.3 Estados premium
Skeletons de lista/thread, empty states ("Nenhuma conversa nesta pasta"), erro com retry, indicador
de digitando, toast de nova conversa não atribuída.

### 8.4 Widget de chat público — o chatbot nas landings por vertical

O chatbot **não é uma tela isolada**: é um remetente de mensagem que aparece em **duas superfícies
sobre a mesma conversa**. A superfície voltada ao internauta é um **widget embutível**.

**Superfície A — Widget público (internauta):** botão flutuante no canto inferior direito que
expande num painel de conversa (padrão do widget do próprio Chatwoot em sites — não é um modal do
admin). É onde o internauta fala com o bot. Fica embutido em **cada landing de vertical**:

```
artemis4 / landing imobiliária →  <ChatWidget segment="imobiliario" tenantId=… clientId=… />
saudedigital (futura)          →  <ChatWidget segment="saude"       tenantId=… clientId=… />
```

**É o MESMO componente**, parametrizado por `segment`/`tenant`/`client`. Uma landing nova só o monta
com outro `segment` e, pela flexibilidade já projetada, ele automaticamente usa: a **persona** daquele
segmento (`resolvePromptTemplate('mensageria_bot_persona', segmentId)`), as **ferramentas de dados**
do segmento (`segment_data_entities`) e o **RAG** do markdown daquele tenant/cliente. **Zero código
novo por vertical** — mesmo princípio de "tabela nova sem deploy".

**Superfície B — Caixa de entrada (atendente):** como toda mensagem do widget vira `message` na
`conversation`, a **mesma conversa aparece na inbox interna em tempo real** (SSE). O atendente vê o
bot conversando e pode **assumir** (handoff) a qualquer momento. O bot não tem UI separada para o
atendente — são bolhas `sender_type='bot'` na thread que ele já usa.

**Fluxo:**
```
Internauta na landing (ChatWidget, canal 'webchat')
        │ POST /api/public/mensageria/chat  → ingestMessage() → runBot() [loop de tool-use]
        ▼
  ┌──────────────────────────┬─────────────────────────────┬──────────────────────────┐
  ▼                          ▼                             ▼
Resposta volta ao widget   Mesma conversa na inbox        Se handoff → fila do time
(tempo real)               do atendente (SSE)             do segmento
```

**Detalhes técnicos:**
- Novo `channel_type = 'webchat'` na `mensageria.inboxes` (junto de `whatsapp`/`webform`/`manual`/`chatbot`).
- API pública `POST /api/public/mensageria/chat` — recebe `{ inboxId, sessionToken, text }`,
  identifica tenant/segmento pela inbox, roda `ingestMessage()` + `runBot()`. Rate-limit + token de
  sessão anônima (o internauta não é autenticado).
- Componente reutilizável `src/components/mensageria/ChatWidget.tsx` (client), carregado nas landings
  via `<script>`/import. Streaming da resposta do bot (SSE) para efeito "digitando".
- O **mesmo `botAdapter`/`runBot()` atende também o WhatsApp** — o bot é agnóstico de canal: no
  WhatsApp não há widget, a mensagem chega pelo webhook e responde pelo canal. Widget e WhatsApp
  compartilham o mesmo cérebro.

---

## 9. Analytics de mensagens (`/mensageria/analytics`)

Dashboards que sintetizam por **filtros** (período, inbox, time, atendente, canal, etiqueta,
segmento/cliente) e **agrupamentos**. Reusa a linguagem visual dos gráficos que já temos
(Recharts, eixos escurecidos, âmbar).

**KPIs (com contexto, nunca número nu — regra do DESIGN.md):**
- Volume de conversas (novas / resolvidas / abertas) + delta vs período anterior
- **Tempo de 1ª resposta** (mediana) e **tempo de resolução** — via `first_response_at`/`resolved_at`
- Taxa de resolução pelo bot vs humano (deflection rate)
- Conversas por canal (WhatsApp/Form/Manual/Bot) — % de contribuição
- Backlog não atribuído / SLA estourado

**Visualizações:**
- Tendência diária de conversas (linha) · Distribuição por canal (donut) · Heatmap dia×hora de
  entrada (reaproveita o componente já feito no CTA Analytics) · Ranking de atendentes (volume +
  tempo médio) · Funil bot→humano→resolvido · Leaderboard de times · **Demanda por faixa
  horária** — soma de todos os dias do período por hora-do-dia (0-23h), reaproveitando também o
  componente `LeadsPerHour` do CTA Analytics (extraído para `HourlyVolumeBar.tsx`). Adicionada a
  pedido do usuário em 2026-07-08: é a visualização que mostra o pico de demanda do dia típico,
  usada pra dimensionar capacidade de resposta do bot/atendentes humanos por horário.
  **Escopo (refinado em 2026-07-08):** conta mensagens **inbound** em qualquer canal digital
  (WhatsApp/formulário/chatbot) **+ só a 1ª mensagem de cada conversa do canal manual** — nesse
  canal a mensagem é sempre outbound (o atendente registrando um contato que já aconteceu por
  telefone/presencial), então ela é o evento de demanda; mensagens seguintes na mesma conversa
  (notas do atendente) não contam de novo, senão atualizar uma conversa várias vezes infla o
  pico artificialmente. Filtra pela data da própria mensagem, não da conversa.

> **✅ M5 implementado e testado em 2026-07-08.** `GET /api/admin/mensageria/analytics`
> (`src/app/api/admin/mensageria/analytics/route.ts`) — todos os KPIs e visualizações acima,
> sempre passando por `resolveMensageriaScope()` (seção 16.5, mesmo resolver do Painel do
> Gestor). Heatmap **de fato reaproveitado**, não copiado — extraído para
> `src/components/marketing/charts/DayHourHeatmap.tsx` e a página original do CTA Analytics
> foi atualizada para importar do mesmo lugar. Filtros: período (`<DateInputPtBR>`), time,
> atendente, canal. Segmento/cliente listado no texto original não foi filtrado nesta entrega
> (não há um seletor de cliente equivalente ao das campanhas ainda no Mensageria) — client_id
> aceito pela API via query param, só falta o combobox na UI se vier a ser necessário.
> Deflection bot×humano existe na estrutura (`taxaResolucaoBotPct`, funil) mas fica em 0% até
> o M4 (Chatbot) popular `handled_by_bot`/mensagens `sender_type='bot'`.
>
> **Default de período: dia do sistema, não últimos 30 dias.** Sem filtro de data explícito,
> `dateFrom`/`dateTo` = hoje/hoje — só amplia quando o usuário preenche os filtros. Ajustado
> em 2026-07-08 a pedido do usuário (o default original de 30 dias era o mais comum em outros
> dashboards do projeto, mas não o esperado aqui).
>
> **Bugs de implementação corrigidos durante o desenvolvimento:**
> 1. Reusar um único array de parâmetros SQL entre 7 queries paralelas, cada uma referenciando
>    só um subconjunto dos índices, quebra com `could not determine data type of parameter $N`
>    — Postgres exige que todo parâmetro passado seja referenciado no texto daquela query
>    específica. Corrigido dando a cada query seu próprio array de parâmetros (`withPeriod()`).
> 2. Data inicial depois da final (fácil de digitar por engano) fazia a API responder `200`
>    com tudo zerado, sem nenhum aviso — parecia "nada é exibido". Corrigido com banner de
>    aviso explícito na UI quando o intervalo é inválido, mais uma guarda de sequência
>    (`requestSeqRef`) para respostas de rede fora de ordem não sobrescreverem dado correto.

---

## 10. Controle de acesso e sidebar

Segue **exatamente** o fluxo do `ACCESS_CONTROL.md`:

1. `system_modules` — novo módulo `mensageria` ("Central de Mensagens").
2. `system_features` — `mensageria-inbox`, `mensageria-analytics`, `mensageria-config` (nova
   `category_id`), com `permissions` (`read`/`execute`) e `role_permissions` para Master/Admin.
3. `system_feature_modules` — vincula as features ao módulo (senão caem em "orphan").
4. Provisionamento **deliberado** por tenant via `/admin/master/provisioning`
   (`tenant_feature_overrides`) — nunca por migration automática.
5. **Papéis de atendimento** (agent/lead do time) vivem em `mensageria.team_members` — ortogonais aos
   roles de plataforma, para não inflar `user_roles`.

---

## 11. Fases de entrega

> MVP = todos os canais, porém fatiado para reduzir risco de integração. Cada fase: migração local +
> commit + push + checkpoint (regra do CLAUDE.md).

| Fase | Entrega | Núcleo | Status |
|---|---|---|---|
| **M0 — Fundação** | Schema `mensageria` + `ingestMessage()` + adapters WhatsApp/webform | DB + ingestão idempotente; webhook Evolution refatorado sem perder captação de lead | ✅ |
| **M1 — Inbox WhatsApp** | Caixa 3 colunas + envio outbound + tempo real (Redis→SSE) | Atender e responder WhatsApp em thread, com atribuição manual | ✅ |
| **M2 — Multicanal** | Formulários (CTA) + input manual unificados na mesma inbox | `webformAdapter` + `manualAdapter`; painel do contato com link CRM | ✅ |
| **M3 — Times & produtividade** | Times, auto-atribuição round-robin, etiquetas, respostas rápidas, notas internas, SLA | Colaboração real de equipe | ✅ |
| **M4 — Chatbot** | `bot_flows` + `botAdapter` (LLM) + handoff para humano | Bot alimentando o painel + deflection | ⚠️ Parcial — M4.1+M4.2 ✅ (ver 18.1); M4.3 (RAG)/M4.4 (widget) não iniciadas |
| **M5 — Analytics** | Dashboards com filtros/agrupamentos + KPIs de SLA | Camada de inteligência | ✅ |
| **M6 — Acesso & rollout** | `system_features` + provisionamento + sidebar + hardening | Go-live por tenant | ⚠️ Parcial — `system_features` registrado/testado; provisionamento real via UI e deploy VPS pendentes |

**Sugestão de ordem de valor:** M0→M1 entrega a dor mais aguda (WhatsApp em thread de verdade) já
utilizável; M2–M5 incrementam sem retrabalho porque tudo já nasce sobre `ingestMessage()`.

---

## 12. Riscos e decisões em aberto (para a avaliação)

1. **Idempotência Evolution** — a Evolution pode reenviar `MESSAGES_UPSERT`; resolvido por
   `messages.external_id UNIQUE`. Precisamos confirmar que o payload traz `key.id` estável.
2. **Normalização de telefone BR** — já há lógica (`normalizePhone` remove o 9º dígito p/ Evolution).
   O dedupe de contato precisa normalizar **na entrada e na saída** para não duplicar contatos.
3. **Janela de 24h do WhatsApp** — envio fora da janela exige *template* aprovado. Modelar
   `content_type='template'` e sinalizar na UI quando a janela fechou. (Depende do canal Evolution/Meta.)
4. **Migração do histórico atual** — os leads que hoje têm `mensagem_inicial`/`payload_extra` podem
   ser *backfilled* como 1ª mensagem de conversas retroativas (opcional, script idempotente).
5. **Volume/retention** — `messages` cresce rápido; definir política de índice/particionamento por
   `created_at` se o volume justificar (fase futura).
6. **Presença/typing em múltiplas instâncias** — se a app rodar com N réplicas, o SSE precisa do
   Redis Pub/Sub como *fan-out* (já previsto) — validar no ambiente VPS.

---

## 13. Resumo executivo

Construímos uma **caixa omnichannel nativa** sobre o stack atual, reaproveitando a ingestão/envio
WhatsApp, o CTA, o LLM e o controle de acesso que **já existem**. O CRM permanece **desacoplado**:
ligado por uma chave (`lead_uuid`) e uma chamada HTTP (`/api/crm/leads`), sem tabela ou regra
compartilhada. O chatbot é apenas mais um remetente de mensagem, então alimenta painel e analytics de
graça. Entregamos em 7 fases, com a dor mais aguda (WhatsApp em thread) utilizável já em M1.

---

## 14. Refinamentos — rodada 2 (7 questionamentos)

### 14.1 Abstração de provider de WhatsApp (desacoplar da Evolution)

**Problema:** hoje as credenciais são colunas Evolution-específicas em `public.tenants`
(`evolution_api_url/key/instance`, `numero_whatsapp`, `evolution_webhook_secret`). Trocar de API
(Meta Cloud API, Z-API, etc.) exigiria mexer em schema e em código espalhado.

**Solução — provider como discriminador na inbox + interface de código.** As credenciais de canal
saem de `tenants` e passam a viver na `mensageria.inboxes` (que já tem `config jsonb`). Acrescenta-se
um discriminador `provider`:

```sql
ALTER TABLE mensageria.inboxes
  ADD COLUMN provider text NOT NULL DEFAULT 'evolution';  -- 'evolution' | 'meta_cloud' | 'zapi' | ...
-- config jsonb guarda as chaves específicas do provider (sem coluna nova por provider):
--   evolution → { api_url, api_key, instance, number }
--   meta_cloud → { phone_number_id, waba_id, access_token, verify_token }
```

No código, um **registro de providers** com interface única:

```
src/lib/mensageria/channels/
  types.ts            → interface WhatsAppProvider {
                          send(inbox, to, message): Promise<{externalId}>
                          parseWebhook(payload): NormalizedMessage[]
                          getStatus(inbox): Promise<ConnectionStatus>
                        }
  providers/
    evolutionProvider.ts   (extrai a lógica atual do webhook + notifyWhatsApp)
    metaCloudProvider.ts   (futuro — só adicionar o arquivo)
  registry.ts         → getProvider(inbox.provider) → instância
```

**Adicionar uma nova API de WhatsApp = 1 arquivo novo + 1 valor em `provider` + chaves no `config`
jsonb. Zero mudança de schema, zero mudança na UI da inbox** (a UI renderiza o formulário de
credenciais a partir de um *field schema* declarado pelo provider). Um webhook único
`/api/public/whatsapp/webhook?inbox={id}` roteia para `provider.parseWebhook()`.

**Back-compat:** migração de seed cria 1 `inbox` por tenant a partir das colunas `evolution_*`
existentes (as colunas antigas podem ser mantidas por um ciclo e depois removidas).

### 14.2 Etiquetas — papel e importância

Sim, há tabela: `mensageria.labels` + `mensageria.conversation_labels` (seção 4.2). São
**per-tenant**, selecionáveis em UI (chips multi-seleção na conversa; CRUD em `/mensageria/config`).

**Papel — a dimensão transversal de classificação.** Uma etiqueta marca *assunto/estágio/intenção*
de uma conversa (ex.: `interesse-compra`, `2ª-via-boleto`, `reclamação`, `agendou-visita`,
`plano-saúde`). Importância concreta:
1. **Filtro** na caixa de entrada (pasta por etiqueta).
2. **Agrupamento no analytics** (volume/tempo de resposta por etiqueta — o principal eixo de corte).
3. **Automação** — gatilho de roteamento/SLA por etiqueta (ex.: `urgente` → time X, SLA menor).
4. **Handoff bot→humano com contexto** — o bot aplica etiqueta por intenção detectada, e o humano já
   recebe a conversa classificada.

Aplicação **manual** (atendente) ou **automática** (bot/regra). É o que torna o analytics acionável.

### 14.3 SLA — onde as regras moram

**Regra de decisão: SLA de *mensagem* pertence ao Mensageria; SLA de *trabalho do lead* já existe e
permanece no CRM.** Os dois coexistem, desacoplados, porque medem coisas diferentes:

| Tipo de SLA | Mede | Onde | Status |
|---|---|---|---|
| Responsividade de atendimento | tempo até 1ª resposta, tempo até resolução | **Mensageria** | novo |
| Trabalho do lead / transbordo | lead precisa ser trabalhado em X min senão redistribui | **CRM** | **já existe** (`leads_staging.atribuicao_expira_em` + cron de transbordo) |

As regras de SLA de mensagem são **inputadas via UI** (`/mensageria/config`) e escopáveis por
inbox/time/etiqueta/segmento:

```sql
CREATE TABLE mensageria.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, client_id uuid, name text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}',        -- { inbox_id?, team_id?, label_id?, segment_id? }
  first_response_target_min int,            -- meta de 1ª resposta
  resolution_target_min int,                -- meta de resolução
  business_hours jsonb,                     -- janela de expediente (pausa o relógio fora dela)
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE mensageria.conversation_sla (  -- estado do SLA por conversa
  conversation_id uuid PRIMARY KEY REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES mensageria.sla_policies(id),
  first_response_due timestamptz, first_response_breached boolean DEFAULT false,
  resolution_due timestamptz, resolution_breached boolean DEFAULT false
);
```

O relógio usa os timestamps que a conversa já grava (`first_response_at`, `resolved_at`). Estouro
dispara alerta via `agentNotificador.ts` (WhatsApp/Slack, já existente). **Não há acoplamento com o
CRM** — cada módulo mede seu próprio SLA sobre seus próprios timestamps.

### 14.4 Respostas rápidas e Fluxos do Bot — tabelas

Sim, ambas já previstas e inputáveis via UI (`/mensageria/config`):
- **Respostas rápidas:** `mensageria.canned_responses` (`shortcut`, `content`) — o atendente digita
  `/atalho` no composer e expande. (seção 4.2)
- **Fluxos do bot:** `mensageria.bot_flows` (persona, modo, regras de handoff) + `bot_sessions`
  (estado por conversa). (seção 4.3) — refinado abaixo em 14.5/14.6/14.7.

### 14.5 ChatBot — prompt por segmento (via tabela de prompt/UI)

**Reuso direto do mecanismo que já existe.** O prompt do bot **não** é hardcoded nem exclusivo do
`bot_flows`: ele resolve por `system_prompt_templates` usando `resolvePromptTemplate()`
([promptResolver.ts](src/lib/intelligence/promptResolver.ts)), que já faz
**segment-specific → global fallback** e é gerenciado pela UI `/admin/master/prompts`.

```
Persona do bot = resolvePromptTemplate('mensageria_bot_persona', segmentId)
                 (segmento tem precedência; fallback global)
                 + override opcional por tenant/inbox em bot_flows.system_prompt
```

Assim, cadastrar/editar a persona de cada segmento é **a mesma operação já existente** de gerenciar
prompts — nenhum mecanismo novo. O `segmentId` da conversa vem do `client_id` do contato (o segmento
do cliente), exatamente como o resto da plataforma resolve segmento.

### 14.6 ChatBot — dados por segmento (imóveis × clínicas…) + RAG

Este é o ponto mais rico. A resposta é **recuperação híbrida**, com o segmento decidindo *o quê* o bot
pode consultar. Duas mecânicas complementares:

**(A) Dados estruturados — camada semântica dirigida por metadados (flexibilidade total).**

Requisito: quando **novas tabelas forem acrescentadas a um segmento**, o bot deve passar a consultá-las
**sem reescrever código nem dar deploy**. Por isso NÃO usamos um resolver hand-written por query.
Usamos um **registro de metadados no banco** + **um único resolver genérico**. É o mesmo padrão que a
plataforma já adota em `system_segments.creative_taxonomy` e `segment_angle_terms` (config no banco,
não em código).

**Por que existe um passo de "significado":** introspecção (`information_schema`) entrega nome e tipo
das colunas de graça, mas não o *significado de negócio* (ex.: `imovel_proximidades.distancia = 500` —
metros? perto?). Esse significado é registrado como **dado** (uma linha de metadata), não como código.
Adicionar tabela = adicionar/confirmar metadata, sem deploy.

```sql
-- Registro semântico: descreve as entidades consultáveis de cada segmento
CREATE TABLE mensageria.segment_data_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL,             -- system_segments.id (null = global)
  tenant_id  uuid,                      -- null = vale p/ todos os tenants do segmento
  entity_name text NOT NULL,            -- 'imovel'  (nome lógico que o LLM vê)
  table_name  text NOT NULL,            -- 'imoveis' (tabela física)
  description text,                     -- "Imóveis à venda/locação" (o SIGNIFICADO, p/ o LLM)
  columns  jsonb NOT NULL,              -- [{name,type,description,filterable,selectable}]
  relations jsonb NOT NULL DEFAULT '[]',-- [{join_table:'imovel_imagens', on:'imovel_fk=id', select:'url', description:'fotos'}]
  tenant_column  text NOT NULL DEFAULT 'tenant_id',
  default_filter text DEFAULT 'ativo = true',
  max_rows int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true
);
```

**Como a tabela nova entra "sozinha" (fluxo sem deploy):**

```
1. Tabela nova criada no banco (trabalho normal do segmento)
2. Job de introspecção lê information_schema → detecta → insere linha ESQUELETO
   em segment_data_entities (colunas/tipos preenchidos, description vazia)
3. O LLM PROPÕE description + relations da tabela nova
   (mesmo padrão da FASE 18.3 "Sugerir ângulos com IA" que vocês já têm)
4. Master confirma/edita na UI (/admin/master/segmentos → aba "Dados do Bot") — ~1 min
5. Bot já consulta a tabela nova. Zero deploy, zero código.
```

O passo 4 (confirmação de ~1 min) garante **qualidade** e **segurança** (marca o que é `selectable`/
`filterable`, esconde colunas sensíveis). Para *zero-touch absoluto* dá para pular o passo 4 e servir
a introspecção pura — ao custo de qualidade da resposta. **Recomendado: com confirmação.**

**O resolver genérico** (um só, serve todos os segmentos) monta a query a partir da metadata:

```ts
// src/lib/mensageria/tools/genericResolver.ts
import pool from '@/lib/database/connection'

export async function resolveEntity(
  entity: SegmentDataEntity,               // linha de segment_data_entities
  params: Record<string, any>,             // filtros escolhidos pelo LLM (validados)
  ctx: { tenantId: string; clientId: string | null },
) {
  // 1. Só colunas marcadas selectable entram no SELECT (whitelist)
  const cols = entity.columns.filter(c => c.selectable).map(c => `e.${c.name}`)
  // 2. JOINs vêm da metadata (as "várias tabelas" do domínio)
  const joins = entity.relations.map((r, i) =>
    `LEFT JOIN LATERAL (SELECT ${r.select} FROM ${r.join_table} WHERE ${r.on} LIMIT 1) rel${i} ON true`)

  // 3. tenant SEMPRE forçado pelo servidor + filtro default do segmento
  const where: string[] = [`e.${entity.tenant_column} = $1`]
  const args: any[] = [ctx.tenantId]
  if (entity.default_filter) where.push(entity.default_filter)

  // 4. Filtros do LLM: só colunas filterable, sempre parametrizado ($n)
  for (const [key, val] of Object.entries(params)) {
    const col = entity.columns.find(c => c.name === key && c.filterable)
    if (!col || val == null) continue
    args.push(col.type === 'text' ? `%${val}%` : val)
    where.push(col.type === 'text' ? `e.${col.name} ILIKE $${args.length}`
                                   : `e.${col.name} = $${args.length}`)
  }

  const sql = `SELECT ${[...cols, ...entity.relations.map((_,i)=>`rel${i}.*`)].join(', ')}
               FROM ${entity.table_name} e ${joins.join(' ')}
               WHERE ${where.join(' AND ')} LIMIT ${entity.max_rows}`
  const { rows } = await pool.query(sql, args)
  return rows
}
```

**A lista de ferramentas do LLM é gerada a partir do registro** — entidade nova em
`segment_data_entities` → ferramenta nova aparece automaticamente, sem tocar em código:

```ts
// getToolsForSegment: 1 entidade → 1 tool, params = colunas filterable
async function getToolsForSegment(segmentId, tenantId) {
  const entities = await loadEntities(segmentId, tenantId)   // SELECT em segment_data_entities
  return entities.map(e => ({
    name: `buscar_${e.entity_name}`,
    description: e.description,
    params_schema: buildSchemaFromColumns(e.columns.filter(c => c.filterable)),
    run: (params, ctx) => resolveEntity(e, params, ctx),
  }))
}
```

> Segurança inegociável (inalterada): **read-only**, `tenant_id` forçado no servidor, **queries
> parametrizadas** (`$n`), apenas colunas `selectable`/`filterable`, `LIMIT` obrigatório. O LLM nunca
> escreve SQL — só escolhe entidade e preenche filtros validados contra o schema.

**Níveis de automação (trade-off):**

| Nível | Tabela nova exige | Segurança | Qualidade |
|---|---|---|---|
| Resolver hardcoded (por query) | escrever código + deploy | máxima | máxima |
| **Metadados + confirmação (adotado)** | **1 linha de config + confirmar descrição (UI, sem deploy)** | **alta** | **alta** |
| Introspecção pura / text-to-SQL | nada (100% automático) | menor | menor |

**(B) Conhecimento não-estruturado — RAG sobre markdown por tenant/cliente.**
Para regras, FAQ, condições comerciais, textos livres — RAG com **pgvector** (extensão a habilitar no
Postgres). Ingestão: upload de markdown → *chunking* → *embedding* → armazenamento; na conversa,
embeda a pergunta → busca top-K *chunks* escopados por `tenant_id`/`client_id`/`segment_id` → injeta
no prompt.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE mensageria.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, client_id uuid, segment_id uuid,
  title text NOT NULL, source_type text NOT NULL DEFAULT 'markdown',
  raw_content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mensageria.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES mensageria.knowledge_documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL, client_id uuid,
  chunk_text text NOT NULL, embedding vector(1536)
);
CREATE INDEX kchunks_vec ON mensageria.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops);
```

**Híbrido na prática:** ferramentas (A) para dados *vivos/exatos* (preço, disponibilidade, horário);
RAG (B) para conhecimento *descritivo/políticas*. O bot pode usar os dois na mesma resposta. Ambos
selecionados pelo **segmento**, com escopo de tenant/cliente forçado no servidor.

> **Decisão travada:** embeddings reusam o **LLM multi-provider já configurado**
> (`getLlmClientForCampaigns`). A factory (hoje só expõe `complete()`) ganha **duas extensões**:
> `embed(text): number[]` (RAG) e `completeWithTools(messages, tools)` (loop de tool-use do bot —
> encapsula o function-calling nativo de Anthropic/OpenAI). pgvector exige habilitar a extensão na
> imagem `postgres:17-alpine` — validar na VPS.

### 14.7 ChatBot — memória na conversa

Sim, em três camadas com custo de token controlado:

1. **Memória de curto prazo (turno a turno):** o próprio histórico da thread em `mensageria.messages`
   — o bot carrega as últimas N mensagens como contexto. Já está armazenado, custo zero.
2. **Estado estruturado (slot-filling):** `bot_sessions.state` (jsonb) guarda entidades coletadas ao
   longo da conversa (ex.: `cidade_desejada`, `orçamento`, `especialidade`), para o bot não
   re-perguntar. Persistente entre turnos.
3. **Memória de longo prazo (entre conversas):** `contacts.attributes` + o `lead_uuid` vinculado — o
   bot reconhece um contato recorrente e recupera fatos conhecidos (nome, interesse anterior).

**Economia de token:** quando a thread cresce, um **resumo rolante** é gravado em
`bot_sessions.state.summary` e substitui as mensagens antigas no contexto (mesmo padrão de
*context management* que a própria plataforma usa) — mantém a memória sem inflar cada chamada ao LLM.

### 14.8 Impacto no schema (resumo das adições da rodada 2)

- `mensageria.inboxes` + coluna `provider` (14.1)
- `mensageria.sla_policies` + `mensageria.conversation_sla` (14.3)
- `mensageria.segment_data_entities` (14.6-A) — camada semântica dirigida por metadados; + job de
  introspecção `information_schema` + aba "Dados do Bot" em `/admin/master/segmentos`
- `mensageria.knowledge_documents` + `mensageria.knowledge_chunks` + extensão `vector` (14.6-B)
- Webhook unificado `/api/public/whatsapp/webhook?inbox={id}` substitui o Evolution-específico
  (mantido por compatibilidade durante a transição)
- Canal `webchat` na `inboxes` + API pública `POST /api/public/mensageria/chat` + componente
  `ChatWidget.tsx` embutível nas landings por vertical (8.4)
- Factory LLM ganha `embed()` (RAG) e `completeWithTools()` (loop de tool-use do bot)
```

### 14.9 Gap identificado em produção — inbox de WhatsApp é por tenant, não por cliente

> **Status: ✅ Resolvido em 2026-07-08.** Gap confirmado no código em uso (não era hipótese) —
> encontrado ao rastrear o fluxo real de "campanha lança CTA WhatsApp → mensagem cai no
> Mensageria" em `src/app/api/public/evolution/webhook/route.ts`.

**O que já funciona:** o webhook Evolution já chama `ingestMessage()` em paralelo à captação de lead
existente (não é mais plano, está implementado). Quando a mensagem carrega `[ref:slug]` de uma
campanha, o `client_id` do `CtaDestination` é propagado para `contacts`/`conversations` — a
**atribuição lógica ao cliente certo dentro do Mensageria funciona**. A ponte com o CRM também:
`lead_uuid` é gravado de volta em `mensageria.contacts` assim que o lead é criado.

**O gap:** `resolveWhatsAppInbox(tenantId)` (seção 14.1, `src/lib/mensageria/inboxes.ts`) resolve
**uma única inbox de WhatsApp por tenant**, ignorando `client_id` — mesmo a coluna existindo na
tabela `inboxes`. Isso é correto quando todos os clientes de um tenant recebem WhatsApp pelo mesmo
número (o cenário mais comum hoje). **Quebra** se algum cliente tiver **número de WhatsApp Business
próprio**, separado do número principal do tenant: fisicamente essa mensagem chegaria pelo
`evolution_instance` do número do CLIENTE (uma instância Evolution distinta), mas o webhook atual só
sabe resolver pelo `evolution_webhook_secret`/`evolution_instance` gravados em `public.tenants`
— não existe hoje um `evolution_webhook_secret` por cliente, nem uma tabela de credenciais
Evolution por cliente para o webhook consultar.

**Dimensão ortogonal ao 14.1:** a abstração de provider (14.1) resolve "múltiplas APIs de WhatsApp
diferentes" (Evolution × Meta Cloud × Z-API). Este gap é sobre "múltiplos **números** da mesma API,
um por cliente" — os dois podem coexistir na mesma correção, mas são problemas distintos.

**Decisão de onde vive a credencial (confirmada com o usuário):** não em `tenant_network_credentials`
(estruturalmente só suporta 1 linha por tenant, `UNIQUE(tenant_id, network_id)`, sem `client_id`).
As colunas Evolution do cliente vivem em `public.clientes`, espelhando as que já existem em
`public.tenants` — o mesmo padrão já usado para `page_id`/`pixel_id`/`instagram_actor_id`/`website`
(cascata Tenant → Cliente, ver `CLAUDE.md` "Arquitetura de 3 camadas").

**Implementado** (`prisma/migration-2026-07-08-mensageria-whatsapp-per-client.sql`):

```sql
ALTER TABLE public.clientes
  ADD COLUMN evolution_api_url TEXT, ADD COLUMN evolution_api_key TEXT,
  ADD COLUMN evolution_instance TEXT, ADD COLUMN numero_whatsapp TEXT,
  ADD COLUMN evolution_webhook_secret TEXT;
CREATE UNIQUE INDEX idx_clientes_evolution_webhook_secret
  ON public.clientes (evolution_webhook_secret) WHERE evolution_webhook_secret IS NOT NULL;
CREATE UNIQUE INDEX idx_inboxes_tenant_client_channel
  ON mensageria.inboxes (tenant_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'), channel_type)
  WHERE channel_type = 'whatsapp';
```

- `resolveWhatsAppInbox(tenantId, clientId?)` (`src/lib/mensageria/inboxes.ts`) busca primeiro por
  `(tenant_id, client_id)`; se o cliente tiver `evolution_instance` configurado, cria a inbox
  dedicada lazy; senão cai para a inbox padrão do tenant (`client_id IS NULL`) — mesma cascata de
  `getNetworkServiceForTenant()` no módulo de campanhas.
- O webhook (`src/app/api/public/evolution/webhook/route.ts`) checa `clientes.evolution_webhook_secret`
  **antes** de `tenants.evolution_webhook_secret` — se bater no cliente, identifica tenant *e*
  cliente pelo mesmo token, sem precisar do `[ref:slug]` da campanha. Esse `ownerClientId`
  (dono do número físico) é usado só para roteamento no **Mensageria**; a atribuição de campanha
  pro CRM/CtaSubmission continua vindo do `[ref:slug]`, propositalmente não misturados.

**Testado ponta a ponta:** retrocompatibilidade (secret do tenant → mesma inbox de sempre, sem
`client_id`) · fluxo novo (secret do cliente → inbox dedicada criada com as credenciais certas,
`client_id` propagado a contato/conversa) · idempotência (2ª mensagem do mesmo cliente reusa a
inbox, não duplica) · segurança (instância divergente da configurada → 403).

---

## 15. Registro de acesso — módulo, categoria, features e permissões (fase M6)

Segue **exatamente** o `ACCESS_CONTROL.md`. Todo o SQL é **idempotente** (guardas por `slug`) e roda
localmente primeiro (batch VPS depois). Estrutura de tabelas confirmada no schema real.

**Inventário a criar:** 1 módulo (`system_modules`) + 1 categoria (`system_categorias`) + **5 features**
(`system_features`) + suas `permissions` + vínculo `system_feature_modules` + `role_permissions` para
Master (41) e Administrador (42, 47, 48).

### 15.1 As 5 features de sidebar

| Nome | slug | url | Ações (permissions) |
|---|---|---|---|
| Caixa de Entrada | `mensageria-inbox` | `/mensageria` | read, execute |
| Analytics de Mensagens | `mensageria-analytics` | `/mensageria/analytics` | read |
| Configurações | `mensageria-config` | `/mensageria/config` | read, execute |
| Chatbot | `mensageria-chatbot` | `/mensageria/config/chatbot` | read, execute |
| Base de Conhecimento | `mensageria-conhecimento` | `/mensageria/config/conhecimento` | read, execute, create, delete |

> "Configurações" abriga em abas: Canais/Inboxes, Times & Atendentes, Etiquetas, Respostas Rápidas,
> SLA. Se precisar de permissão por sub-área no futuro, promover a aba a feature própria (aditivo).

### 15.2 Migração idempotente

```sql
-- migration-mensageria-access.sql
BEGIN;

-- 1) MÓDULO (system_modules)
INSERT INTO public.system_modules (name, slug, description, icon, is_active, theme_mode, primary_color)
VALUES ('Gestão de Mensageria', 'mensageria',
        'Central omnichannel: caixa de entrada unificada (WhatsApp, formulários, manual, webchat), chatbot por segmento e analytics de mensagens.',
        'ChatBubbleLeftRight', true, 'dark', '#c5a028')
ON CONFLICT (slug) DO NOTHING;

-- 2) CATEGORIA (system_categorias) — vinculada ao módulo
INSERT INTO public.system_categorias (name, slug, description, icon, color, sort_order, is_active, module_id)
SELECT 'Central de Mensagens', 'mensageria',
       'Caixa de entrada, chatbot e analytics de mensagens', 'ChatBubbleLeftRightIcon', '#c5a028', 40, true, m.id
FROM public.system_modules m
WHERE m.slug = 'mensageria'
  AND NOT EXISTS (SELECT 1 FROM public.system_categorias WHERE slug = 'mensageria');

-- 3) FEATURES + PERMISSIONS + FEATURE↔MODULE + ROLE_PERMISSIONS (Master 41, Admin 42/47/48)
DO $$
DECLARE
  v_mod_id uuid; v_cat_id int; v_feat_id int; v_perm_id int;
  r record; a text;
BEGIN
  SELECT id INTO v_mod_id FROM public.system_modules   WHERE slug = 'mensageria';
  SELECT id INTO v_cat_id FROM public.system_categorias WHERE slug = 'mensageria';

  FOR r IN SELECT * FROM (VALUES
      ('Caixa de Entrada',     'mensageria-inbox',        '/mensageria',                     1, ARRAY['read','execute']),
      ('Analytics de Mensagens','mensageria-analytics',   '/mensageria/analytics',           2, ARRAY['read']),
      ('Configurações',        'mensageria-config',       '/mensageria/config',              3, ARRAY['read','execute']),
      ('Chatbot',              'mensageria-chatbot',      '/mensageria/config/chatbot',      4, ARRAY['read','execute']),
      ('Base de Conhecimento', 'mensageria-conhecimento', '/mensageria/config/conhecimento', 5, ARRAY['read','execute','create','delete'])
    ) AS t(name, slug, url, sort_order, actions)
  LOOP
    -- feature (cria se não existir)
    SELECT id INTO v_feat_id FROM public.system_features WHERE slug = r.slug;
    IF v_feat_id IS NULL THEN
      INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active, icon)
      VALUES (r.name, r.slug, r.url, v_cat_id, r.sort_order, true, 'ChatBubbleLeftRightIcon')
      RETURNING id INTO v_feat_id;
    END IF;

    -- vínculo feature ↔ módulo (obrigatório p/ aparecer no provisionamento)
    INSERT INTO public.system_feature_modules (feature_id, module_id)
    VALUES (v_feat_id, v_mod_id) ON CONFLICT DO NOTHING;

    -- permissions + role_permissions
    FOREACH a IN ARRAY r.actions LOOP
      SELECT id INTO v_perm_id FROM public.permissions WHERE feature_id = v_feat_id AND action = a;
      IF v_perm_id IS NULL THEN
        INSERT INTO public.permissions (feature_id, action) VALUES (v_feat_id, a) RETURNING id INTO v_perm_id;
      END IF;
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT rid, v_perm_id FROM unnest(ARRAY[41,42,47,48]) AS rid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = rid AND rp.permission_id = v_perm_id
      );
    END LOOP;
  END LOOP;
END $$;

COMMIT;
```

### 15.3 Provisionamento por tenant (deliberado — NÃO no script)

Cada empresa recebe o módulo via `/admin/master/provisioning` (grava `tenant_feature_overrides`).
**Nunca** provisionar por migration automática — é ato de contrato, por plano de cada tenant
(`ACCESS_CONTROL.md`).

### 15.4 Extensões de features já existentes (não são features novas)

- **Persona do bot:** cadastrar `template_key = 'mensageria_bot_persona'` em `system_prompt_templates`
  (gerenciado pela UI existente `/admin/master/prompts`).
- **"Dados do Bot"** (`segment_data_entities`): nova **aba** na feature existente de segmentos
  (`/admin/master/segmentos`) — não gera item de sidebar.

### 15.5 Não entram em `system_features`

Widget público (`ChatWidget`), APIs públicas (`/api/public/mensageria/chat`,
`/api/public/whatsapp/webhook`) e jobs (introspecção, SSE, cron de SLA/handoff) são código/rotas —
não são funcionalidades de menu.

---

## 16. Modelo de Visibilidade Gerencial — atendente × líder de time × administrador (rodada 3)

> **Status:** proposta para avaliação · **Motivação:** além do uso operacional/transacional de cada
> atendente, a plataforma precisa de uma persona com visão gerencial — total e detalhada — sobre todos
> os atendimentos (qualquer canal) dos seus subordinados, com foco em produtividade e efetividade.
> Esta seção formaliza o modelo de acesso **dentro** do módulo (quem vê o quê), complementar ao
> `ACCESS_CONTROL.md` (que resolve apenas "quem entra no módulo", via sidebar/`system_features`).

### 16.1 Diagnóstico do estado atual

Duas coisas já existem e resolvem parte do problema **sem nenhum código novo**:

1. **O Administrador do tenant já é, hoje, a persona gerencial de visão total.** A pasta "Todas" da
   Caixa de Entrada (`GET /conversations` sem filtro de `assigneeId`) não impõe nenhuma restrição por
   atendente — retorna todas as conversas do tenant, de qualquer canal, atribuídas a qualquer pessoa.
   Como o Administrador já bypassa o Filtro A de permissões (`ACCESS_CONTROL.md` — `role.name ILIKE
   '%admin%'`), ele automaticamente enxerga tudo. **Zero lacuna aqui.**
2. **`mensageria.team_members.role` já reserva o valor `'lead'`** (contra `'agent'`), mas **nenhum
   código hoje lê esse campo para conceder visão diferenciada** — é um metadado morto.

O que **não existe** é o meio-termo: hoje, um atendente comum (`role='agent'`, não-admin) **também**
vê a pasta "Todas" sem restrição — o filtro "Minhas" é uma escolha de UI, não uma imposição do
backend. Ou seja, o modelo atual é binário demais: *ou você não entra no módulo, ou você vê tudo*.

### 16.2 Modelo proposto — 3 níveis de visibilidade

| Nível | Quem | Escopo de dados (conversas + futuro analytics de M5) | Custo de implementação |
|---|---|---|---|
| **Administrador** | Role do tenant `ILIKE '%admin%'` | Total — todos os times, todas as inboxes, todos os canais | Zero (já funciona) |
| **Líder de time** | `team_members.role = 'lead'` | Apenas conversas/métricas do(s) time(s) em que é `lead` (via `inboxes.team_id` e `conversations.team_id`) | Novo — filtro de escopo |
| **Atendente** | `team_members.role = 'agent'` (ou sem time) | Apenas conversas atribuídas a si + não atribuídas do(s) time(s) que participa | Novo — filtro de escopo |

Este é o mesmo padrão de 3 camadas já usado no resto da plataforma (Master → Tenant → Cliente, ver
`ACCESS_CONTROL.md`), aplicado agora *dentro* do módulo em vez de entre módulos.

### 16.3 Decisão a confirmar antes de implementar

**Restringir o atendente comum é uma mudança de comportamento**, não uma feature aditiva — hoje ele
vê tudo. Duas opções:

- **Opção A (recomendada) — aplicar o modelo de 3 níveis integralmente.** Atendente passa a ver só
  o que lhe cabe; líder de time vê seu time; admin vê tudo. Mais alinhado ao padrão de mercado
  (Chatwoot, Zendesk) e necessário para que o M5 (Analytics) não vaze dados de produtividade de um
  atendente para outro atendente do mesmo nível.
- **Opção B — manter atendente com visão total, só formalizar o líder de time.** Menor risco de
  quebrar fluxo de uso já validado nos testes de M0–M3, mas não resolve o objetivo de "efetividade
  por atendente" com isolamento adequado (qualquer atendente veria o ranking de todos os colegas).

> **✅ Decisão confirmada pelo usuário (2026-07-07): Opção A.** Atendente passa a ver só suas
> conversas + não atribuídas do(s) time(s) que participa; líder de time vê seu time; administrador
> continua vendo tudo. `resolveMensageriaScope()` (seção 16.4) implementa isso e é pré-requisito
> tanto do retrofit de `GET /conversations` (M3) quanto do M5 e do Painel do Gestor (seção 17).

### 16.4 Implementação proposta (quando aprovada)

Um único resolver de escopo, reaproveitado tanto pela Caixa de Entrada quanto pelo futuro M5:

```ts
// src/lib/mensageria/visibilityScope.ts
export type MensageriaScope =
  | { level: 'full' }                          // Administrador — sem filtro
  | { level: 'team'; teamIds: string[] }        // Líder — restrito ao(s) time(s) que lidera
  | { level: 'own'; userId: string; teamIds: string[] } // Atendente — próprias + não atribuídas do time

export async function resolveMensageriaScope(
  tenantId: string, userId: string, isTenantAdmin: boolean,
): Promise<MensageriaScope> {
  if (isTenantAdmin) return { level: 'full' }

  const { rows } = await pool.query(
    `SELECT team_id, role FROM mensageria.team_members WHERE user_id = $1
       AND team_id IN (SELECT id FROM mensageria.teams WHERE tenant_id = $2)`,
    [userId, tenantId],
  )
  const leaderTeams = rows.filter(r => r.role === 'lead').map(r => r.team_id)
  if (leaderTeams.length > 0) return { level: 'team', teamIds: leaderTeams }

  return { level: 'own', userId, teamIds: rows.map(r => r.team_id) }
}
```

`GET /conversations` e as futuras rotas de `/mensageria/analytics` aplicam o mesmo `WHERE` conforme
o `scope.level`:

```sql
-- level='team'  → AND c.team_id = ANY($teamIds)
-- level='own'   → AND (c.assignee_id = $userId OR (c.assignee_id IS NULL AND c.team_id = ANY($teamIds)))
-- level='full'  → sem filtro adicional (comportamento atual)
```

`isTenantAdmin` é resolvido do mesmo jeito que a sidebar já faz (`role.name ILIKE '%admin%'` no
tenant) — reaproveita lógica existente, não inventa um novo conceito de "admin".

### 16.5 Impacto no M5 (Analytics) — visão já nasce corretamente escopada

Como o resolver de escopo é o mesmo, os dashboards de M5 (seção 9) herdam automaticamente a
visibilidade correta sem lógica duplicada:

| Widget de M5 | Administrador vê | Líder de time vê | Atendente vê |
|---|---|---|---|
| Ranking de atendentes | Todos os atendentes do tenant | Só os atendentes do(s) time(s) que lidera | Só a própria linha (autoavaliação) |
| Leaderboard de times | Todos os times | Só o(s) time(s) que lidera | Não exibido (ou só o próprio time, sem ranking interno) |
| Tempo de 1ª resposta / resolução | Agregado do tenant | Agregado do time liderado | Agregado próprio |
| Funil bot→humano→resolvido | Todos os canais | Canais das inboxes do time | — |

**Consequência prática:** a M5 deixa de ser "só um dashboard" e passa a ser, para o líder de time, a
ferramenta de gestão de produtividade/efetividade da equipe que motivou esta seção — sem precisar de
uma tela separada de "gestão de equipe", o próprio Analytics filtrado já cumpre esse papel.

### 16.6 Onde isso entra nas fases de entrega (seção 11)

Não é uma fase nova — é um **pré-requisito de hardening dentro de M3** (que já entrega times) e uma
**dependência de M5** (que já pressupõe agregação por atendente/time). Sequência recomendada:

1. Confirmar Opção A vs B (seção 16.3) com o usuário.
2. Implementar `resolveMensageriaScope()` + aplicar em `GET /conversations` (retrofit de M3).
3. M5 nasce já consumindo o mesmo resolver — nenhum retrabalho de escopo na fase de Analytics.

---

## 17. Painel do Gestor — fila operacional densa (`/mensageria/gestao`)

> **Status:** proposta para avaliação · **Motivação:** a Caixa de Entrada (seção 8.1) usa layout de
> lista/bolha de chat, ótimo para o atendente (1 conversa por vez), ruim para o gestor escanear
> centenas de atendimentos simultâneos de uma equipe grande. Ver mockup discutido em conversa — tira
> de KPIs + filtros + tabela densa ordenável, uma linha por conversa.

### 17.1 O que é (e o que não é)

**É** uma sala de controle **ao vivo**: estado atual de cada conversa em aberto/recente, para o
gestor identificar onde intervir agora (SLA estourando, atendente sobrecarregado, fila não
atribuída). **Não é** M5 (Analytics) — M5 é histórico/tendência (gráficos, ranking acumulado,
funil ao longo do tempo). Os dois são complementares e reaproveitam o mesmo
`resolveMensageriaScope()` (seção 16.4), mas atendem perguntas diferentes:

| | Painel do Gestor (17) | M5 Analytics (seção 9) |
|---|---|---|
| Pergunta que responde | "O que está acontecendo agora, onde eu ajo?" | "Como estamos indo no período?" |
| Unidade de exibição | 1 linha = 1 conversa | Agregado (gráfico, ranking) |
| Atualização | Tempo real (mesmo canal SSE da seção 6) | Sob demanda / período fechado |

### 17.2 Estrutura da tela

- **Tira de KPIs** (4 cards): conversas no período, em aberto, SLA estourado, tempo médio de 1ª
  resposta — mesmos números que alimentarão os cards de M5, só que recortados pro escopo do
  visualizador (`resolveMensageriaScope`).
- **Filtros:** Time, Atendente, Canal, Status, Prioridade, Etiqueta, Período (reaproveita
  `<DateInputPtBR>` dos itens 1-3 já implementados na Caixa de Entrada).
- **Tabela densa, ordenável por coluna:** Atendente (+ time, subtítulo) · Contato (+ ícone do
  canal) · Status · Prioridade (dot colorido) · SLA (badge verde/âmbar/vermelho) · Tempo de 1ª
  resposta · Última mensagem (relativo + `title=` com `formatFullDate`, mesmo padrão da inbox).
  Paginação **numerada** (não infinita) — o gestor quer "ver a página 3", não rolar sem fim.
- **Clique na linha → painel lateral (drawer/slide-over):** reaproveita 100% o componente de thread
  já existente (header/etiquetas/mensagens/composer) como overlay, sem navegar pra outra página —
  o gestor intervém sem perder o contexto da fila.

### 17.3 API

Estende `GET /api/admin/mensageria/conversations` em vez de criar endpoint paralelo (evita duas
fontes de verdade para "lista de conversas"):

- Novos parâmetros: `page`/`pageSize` (paginação numerada, alternativa ao `cursor` da seção 8.1 —
  mesma rota serve os dois modos) · `teamId` · `priority` · `labelId`
- Novos campos na resposta: `teamName` (via `conversations.team_id` → `teams.name`) ·
  `firstResponseDurationSec` (calculado: `first_response_at - created_at`, `null` se ainda não
  respondida) — nenhuma tabela nova, só mais colunas/joins na query existente.
- **Sempre passa pelo `resolveMensageriaScope()`** (seção 16.4) antes de aplicar os demais filtros —
  um atendente comum batendo nesse endpoint com `teamId` de outro time recebe resultado vazio, não erro.

### 17.4 Registro de acesso — o que muda em relação à seção 15

Isto é aditivo ao que já está registrado (módulo `mensageria` e categoria "Central de Mensagens" já
existem, id 31 — não recriar). Só falta **1 feature nova**:

| Nome | slug | url | Ações |
|---|---|---|---|
| Painel do Gestor | `mensageria-gestao` | `/mensageria/gestao` | read, execute |

Migração idempotente, mesmo padrão da seção 15.2 (INSERT em `system_features` + `permissions` +
`system_feature_modules` + `role_permissions` para roles 41/42/47/48 + `tenant_feature_overrides`
por tenant, sempre um ato deliberado via `/admin/master/provisioning`, nunca automático).

**⚠️ Nuance de acesso que esta feature introduz (não existia nas outras 5):** as 5 features da
seção 15 são visíveis a **qualquer Administrador do tenant** — resolve sozinho pelo bypass
`role.name ILIKE '%admin%'` já embutido em `get_sidebar_menu_for_user()`. O Painel do Gestor
também precisa ficar visível para **líder de time não-administrador**
(`mensageria.team_members.role = 'lead'`) — e esse conceito **não existe** no sistema de permissões
da plataforma (`user_roles`/`role_permissions` só conhece papéis de plataforma como Administrador/
Corretor, nada sobre liderança de time dentro do módulo Mensageria).

Duas formas de resolver, com trade-off de acoplamento:

| Opção | Como | Trade-off |
|---|---|---|
| **A — ensinar a função SQL global** | `get_sidebar_menu_for_user()` ganha um `EXISTS` checando `mensageria.team_members` | Resolve com 1 mudança, mas acopla o sidebar **de toda a plataforma** a uma tabela interna de um módulo — quebra o princípio de desacoplamento (seção 3) |
| **B — augmentação no client, só dentro do módulo (recomendada)** | `MensageriaLayoutContent` faz 1 fetch extra (`GET /api/admin/mensageria/my-scope`) e, se `level='team'`, injeta o item "Painel do Gestor" no array `menuItems` retornado por `useSidebarMenu` — só nesse layout, nada global | A sidebar SQL genérica nunca sabe que Mensageria existe; feature "aparece" via composição no React, não no banco |

**✅ Decisão confirmada pelo usuário (2026-07-07): Opção B.** Mantém a regra de ouro do módulo
("nunca por tabelas ou regras de negócio compartilhadas", seção 3) — o mesmo motivo pelo qual o CRM
e o Mensageria não compartilham tabela nenhuma vale aqui dentro, entre o sidebar genérico da
plataforma e a lógica interna do módulo. Administrador continua vendo o item pelo caminho normal
(banco); líder de time vê pelo caminho da Opção B (client, calculado a partir de
`mensageria.team_members`) — os dois convergem no mesmo item de menu, por rotas de dado diferentes.

### 17.5 Sequência de implementação

**✅ Fundação de visibilidade — implementada e validada em 2026-07-07** (ponta a ponta: API com
`curl` + usuário de teste não-admin real criado no tenant + confirmado na UI/sidebar de verdade):

1. ✅ `resolveMensageriaScope()` + `scopeToSql()` — [src/lib/mensageria/visibilityScope.ts](../src/lib/mensageria/visibilityScope.ts)
2. ✅ Escopo aplicado em `GET /conversations` (lista + `totalCount`) — atendente sem time viu 0,
   com time (não atribuída) viu 1, admin viu as 6 (inalterado)
3. ✅ Defesa em profundidade em `GET`/`PATCH /conversations/[id]` e `POST .../messages` — acesso
   fora do escopo retorna 404 nos três endpoints (não só oculto na lista, bloqueado na escrita
   também). Bug real encontrado e corrigido no processo: `UPDATE` sem alias `c.` quebrava com 500.
4. ✅ UI de Times (`/mensageria/config`) ganhou seletor Agente/Líder ao adicionar membro + botão
   de promover/rebaixar (⭐) em quem já está no time — sem isso `role='lead'` nunca seria alcançável.
5. ✅ `GET /api/admin/mensageria/my-scope` — suporte à Opção B de 17.4.
6. ✅ Augmentação client no `MensageriaLayoutContent` — líder de time vê "Painel do Gestor" injetado
   no menu sem o sidebar genérico da plataforma conhecer o conceito.

**✅ Painel do Gestor — implementado e validado em 2026-07-07:**

7. ✅ Migração de acesso — `prisma/migration-2026-07-08-mensageria-gestao-access.sql`: feature
   `mensageria-gestao` (id 115) em `system_features` + `permissions` + `system_feature_modules` +
   `role_permissions` (41/42/47/48) + `tenant_feature_overrides` (4 tenants). Confirmado via
   `get_sidebar_menu_for_user()` real — admin vê "Painel do Gestor" pelo caminho normal do banco.
8. ✅ `GET /conversations` estendido: `page`/`pageSize` (paginação numerada, coexiste com o
   `cursor` da Caixa de Entrada na mesma rota) · `teamId` · `priority` · `labelId` · `channelType`
   · `sortBy`/`sortDir` (`lastMessageAt` | `firstResponseDurationSec`) · `includeKpis=1` (em
   aberto, SLA estourado, tempo médio de 1ª resposta) · `teamName`/`firstResponseDurationSec` na
   resposta. Testado: filtro por time, canal, prioridade, ordenação, KPIs — todos batendo com os
   dados reais do banco.
9. ✅ `src/components/mensageria/ConversationThread.tsx` (thread reaproveitável, mesma UX da
   Caixa de Entrada) + `/mensageria/gestao` (17.2): KPIs, filtros, tabela densa ordenável,
   paginação numerada, drawer lateral abrindo a thread ao clicar na linha. Gate client-side:
   `scopeLevel==='own'` vê mensagem de acesso restrito em vez da tabela (a API já protege os
   dados por trás mesmo sem esse gate, via `resolveMensageriaScope`).

---

## 18. M4 — Chatbot: fatiamento confirmado (2026-07-08)

O M4 "cheio" descrito nas seções 4.3, 7, 8.4 e 14.5–14.7 é grande demais pra uma rodada só: núcleo
do bot, tool-use sobre dados estruturados, RAG (pgvector) e widget público são 4 entregas de porte
médio cada. A tabela de fases (seção 11) define o núcleo mínimo do M4 como só "bot_flows + botAdapter
(LLM) + handoff para humano" — tools/RAG/widget são refinamentos da rodada 2 (seção 14) que entram
como sub-fases separadas.

### 18.1 Sub-fases e decisão de escopo

| Sub-fase | Entrega | Depende de | Status |
|---|---|---|---|
| **M4.1** | Núcleo do bot: `bot_flows`/`bot_sessions`, `botAdapter`, resposta como `message(sender_type='bot')`, handoff por regra, aba "Bot" em `/mensageria/config` | M0 (ingestMessage) | ✅ |
| **M4.2** | Tool-use sobre dados do segmento: `segment_data_entities` + resolver genérico + `completeWithTools()` na factory LLM | M4.1 | ✅ |
| **M4.3** | RAG: pgvector + `knowledge_documents/chunks` + `embed()` — FAQ/políticas em markdown | M4.1 | Não iniciada |
| **M4.4** | Widget público: canal `webchat` + API pública + `ChatWidget.tsx` embutível nas landings | M4.1 | Não iniciada |

**Decisão confirmada com o usuário (2026-07-08):** M4.1 e M4.2 juntos nesta rodada — o bot já nasce
consultando dados reais do segmento (ex.: imóveis por bairro), não só respondendo texto solto.
M4.3 (RAG) e M4.4 (widget) ficam para rodadas futuras — não fazem parte do escopo atual.

**M4.1+M4.2 concluídas e testadas em 2026-07-08** — ver `docs/CHECKPOINT.md` para o detalhe completo
de arquivos criados/modificados e evidências de teste. Resumo: `completeWithTools()` adicionado à
factory LLM (Anthropic nativo + OpenAI-compatible), `genericResolver.ts` (camada semântica dirigida
por metadados), `botAdapter.ts` (gate por canal/assignee/sessão, handoff por keyword/maxTurns ANTES
do LLM, loop de tool-use), hook em `ingestMessage()`, seed de persona (global + Imobiliário) e da 1ª
entidade (`imovel` → `public.imoveis`), CRUD de config + endpoint de teste, aba "Bot" na UI. Testado
ponta a ponta com dados reais (isolamento por tenant confirmado; resposta com dados reais confirmada
com imóveis de teste temporários, removidos após validação). Bug real corrigido durante o teste: o
`ON CONFLICT` do upsert de `bot_sessions` reativava a sessão a cada mensagem, fazendo o bot voltar a
responder mesmo depois de um handoff — corrigido pra checar `active` antes de qualquer coisa.

**Simplificações desta rodada** (para reduzir risco de infra nova, sem fechar a porta pras versões
completas depois):
- Cadastro de `segment_data_entities` via SQL direto — o job de introspecção automática
  (`information_schema`) e a aba "Dados do Bot" no Master (14.6-A, passo 2-4) ficam para quando
  houver mais de 1-2 segmentos usando o bot.
- Handoff por regra simples (keyword + contador de N interações) — não é o motor de intenção mais
  sofisticado que a seção 14.6 sugere como possível evolução.
- Memória em 2 camadas (histórico da thread + `bot_sessions.state`) — o resumo rolante (14.7,
  3ª camada) só se justifica quando threads ficarem longas o bastante para estourar contexto.

### 18.2 Refinamento pós-revisão holística (2026-07-09) — motor de dados multi-tabela + persona

Revisão holística pedida pelo usuário apontou 3 pontos. Sequência confirmada: **motor primeiro, UI
depois**. Esta rodada fez o Ponto 1 e o Ponto 3a/3b (ver `docs/CHECKPOINT.md` para detalhe e testes).

- **Ponto 1 — persona no lugar certo:** a persona do bot NÃO mora mais na aba Bot de
  `/mensageria/config`. É 100% dirigida por segmento em `/admin/master/prompts` (template
  `mensageria_bot_persona`). Removido o campo/override da aba Bot, do endpoint `bot-flows` e do
  `botAdapter`. A aba Bot ficou só com o operacional do tenant (ativo + handoff + teste).
- **Ponto 3a/3b — motor multi-tabela:** `genericResolver.ts` reganhou `relations` (que eu havia
  descartado do rascunho 14.6-A), agora com agregação one-to-many (`array_agg`), `count`, `first` e
  **multi-hop** (imovel → tabela-ponte → lookup do nome). **Mais seguro que o rascunho do plano:** o
  resolver monta o SQL das relations a partir de campos "bare" validados por IDENT_RE — a config
  nunca fornece fragmento SQL cru (o rascunho 14.6-A interpolava `r.join_table`/`r.on`/`r.select`
  direto). Entidade `imovel` re-semeada com fotos/amenidades/proximidades reais e validada ponta a
  ponta. Bug de robustez de tool-use corrigido: schema de filtros exposto como `string` + coerção
  server-side (o provider global é OpenAI-compatible e rejeita número-como-string).

**Ainda pendente (próxima rodada — "UI depois"):**
- **Ponto 3c:** UI "Dados do Bot" no Master (modal por segmento, padrão dos modais de
  `/admin/master/segments`) — cadastro de entidades/colunas/relations sem SQL, por segmento
  (Imobiliário, Saúde, Carros, …). É o "total parametrização de quais tabelas cada segmento acessa".
- **Ponto 2:** UX multi-segmento em `/admin/master/prompts` — a capacidade existe (Duplicar
  p/ segmento; banco permite N variantes por `template_key`), falta torná-la first-class e proteger o
  footgun do Salvar (trocar o segmento e Salvar MOVE o Global).
