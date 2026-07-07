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
  tempo médio) · Funil bot→humano→resolvido · Leaderboard de times.

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

| Fase | Entrega | Núcleo |
|---|---|---|
| **M0 — Fundação** | Schema `mensageria` + `ingestMessage()` + adapters WhatsApp/webform | DB + ingestão idempotente; webhook Evolution refatorado sem perder captação de lead |
| **M1 — Inbox WhatsApp** | Caixa 3 colunas + envio outbound + tempo real (Redis→SSE) | Atender e responder WhatsApp em thread, com atribuição manual |
| **M2 — Multicanal** | Formulários (CTA) + input manual unificados na mesma inbox | `webformAdapter` + `manualAdapter`; painel do contato com link CRM |
| **M3 — Times & produtividade** | Times, auto-atribuição round-robin, etiquetas, respostas rápidas, notas internas, SLA | Colaboração real de equipe |
| **M4 — Chatbot** | `bot_flows` + `botAdapter` (LLM) + handoff para humano | Bot alimentando o painel + deflection |
| **M5 — Analytics** | Dashboards com filtros/agrupamentos + KPIs de SLA | Camada de inteligência |
| **M6 — Acesso & rollout** | `system_features` + provisionamento + sidebar + hardening | Go-live por tenant |

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
