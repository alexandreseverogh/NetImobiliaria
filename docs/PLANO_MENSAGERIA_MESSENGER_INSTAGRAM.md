# PLANO — Canal Messenger / Instagram Direct no módulo Mensageria

> **Status:** documentado para implementação futura · **Data:** 2026-10-07
> **Gatilho de ativação:** só implementar quando houver motivo concreto de negócio (cliente
> pedindo campanha com CTA "Enviar mensagem" no Instagram, ou estratégia de automação
> comentário→DM). Ver seção 1 — não é urgente hoje porque a lacuna ainda **não existe** em
> produção (seção 1.3).
> **Risco de quebra do que já existe:** próximo de zero, se seguido o desenho abaixo —
> 100% aditivo, nenhum ponto de código hoje em produção precisa ser alterado ou substituído.

---

## 1. Por que isso existe (recapitulação da análise de viabilidade, 2026-10-07)

### 1.1 Não é redundante com WhatsApp

Não é o mesmo lead escolhendo entre dois canais — é o **CTA do anúncio/post que decide**
onde a conversa nasce. Quem clica em "Enviar mensagem" direto no Instagram nunca teve a
opção de WhatsApp naquele clique específico: fica na própria rede, sem trocar de app, sem
precisar salvar um número. Isso importa pra público mais nativo de Instagram (Stories/Reels)
e pra automação de comentário→DM, que só existe dentro da própria rede — não tem
equivalente em WhatsApp.

### 1.2 Não é prioridade hoje

No Brasil, WhatsApp tem ~98% de penetração e 80% dos usuários já conversam com empresa por
lá (Panorama Mobile Time/Opinion Box, já citado em `docs/CHECKPOINT.md`). Instagram Direct
tende a servir melhor **topo de funil** (primeiro contato, curiosidade, engajamento de
conteúdo) do que a conversa de venda em si, que no Brasil quase sempre migra pra WhatsApp de
qualquer forma. Não há motivo pra tratar isso como prioridade de roadmap sem demanda real.

### 1.3 Confirmado em código: hoje não há vazamento de lead

`src/lib/marketing-utils.ts`, `CTA_TYPES`, só oferece:

```
WHATSAPP_MESSAGE, LEARN_MORE, SHOP_NOW, SIGN_UP, CONTACT_US, BOOK_TRAVEL, GET_OFFER
```

Nenhuma opção de Messenger/Instagram Direct existe no wizard hoje. **Nenhuma campanha
lançada por esta plataforma pode, hoje, gerar um lead que caia num Direct invisível ao CRM**
— essa porta de entrada simplesmente não é oferecida ainda. Por isso este documento é pra
"quando o motivo aparecer", não uma correção de bug.

### 1.4 Decisão de escopo

Implementar o CTA no wizard **sempre junto** com o canal/webhook/inbox correspondente, na
mesma entrega — nunca separado. É exatamente a lacuna já corrigida 2x neste projeto (CTA de
formulário sem atribuição real, ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` D3/F2/F3) —
não repetir o mesmo erro pela 3ª vez.

---

## 2. O que já existe e será 100% reaproveitado

Esta é a parte mais importante do documento: **quase toda a infraestrutura necessária já
existe**, construída para outros propósitos mas genuinamente reutilizável aqui, sem
modificação.

| Capacidade necessária | Onde já existe | Reuso |
|---|---|---|
| Pipeline de ingestão de mensagem (dedupe, thread, SLA, bot, tempo real) | `src/lib/mensageria/ingest.ts` → `ingestMessage()` | **Direto, sem nenhuma alteração.** Já é 100% agnóstico de canal — só recebe `inboxId` + `contact` + `content`. |
| Resolução de inbox por canal (lazy, 1 por tenant/cliente) | `src/lib/mensageria/inboxes.ts` (`resolveWhatsAppInbox`/`resolveWebformInbox`/`resolveManualInbox`/`resolveWebchatInbox`) | **Padrão replicado** — `resolveMessengerInbox()`/`resolveInstagramInbox()` novos, mesmo molde. |
| Adapter de envio outbound por canal | `src/lib/mensageria/channels/evolutionSend.ts` (`sendEvolutionMessage`) | **Padrão replicado** — novo `src/lib/mensageria/channels/metaMessagingSend.ts`. |
| Dispatch de envio por `channel_type` | `src/app/api/admin/mensageria/conversations/[id]/messages/route.ts`, linha 82 (`if (conv.channel_type === 'whatsapp') sendEvolutionMessage(...)`) | Novo `else if` — 1 ponto único de extensão, já existe o `if`. |
| Troca de User Token → Page Access Token | `MetaAdsAdapter.getPageAccessToken()` (`src/lib/marketing/networks/meta/metaAdsAdapter.ts:147-207`), já usado pela publicação orgânica (FASE 16) | **Mesmo token, mesmo mecanismo** — só precisa da permissão `pages_messaging` concedida a mais (ver seção 6). Não é preciso inventar um novo fluxo de credencial. |
| Bot (qualificação por IA, tool-use, handoff humano) | `src/lib/mensageria/botAdapter.ts` → `maybeRunBot()` | **Direto, sem alteração.** Já roda em cima de `conversationId`+`tenantId`, nunca sabe de qual canal veio. |
| SLA, atribuição automática, tempo real (SSE) | `src/lib/mensageria/sla.ts`, `autoAssign.ts`, `realtime.ts` | **Direto, sem alteração.** Todos operam sobre `conversationId`, canal-agnósticos. |
| UI da Caixa de Entrada, Analytics, Painel do Gestor | `src/app/mensageria/*` | **Direto na maior parte** — só precisa de 1 ícone/label novo por canal (ver seção 9). |
| Padrão de registro de acesso/sidebar por feature | `system_features` + `tenant_feature_overrides` (`docs/ACCESS_CONTROL.md`) | **Nenhuma feature nova necessária** — Messenger/Instagram entram como canal dentro da feature "Caixa de Entrada" já existente, não como tela nova. |

**A lacuna real que falta fechar** (não é um reuso, é a única peça genuinamente nova):
identidade de contato sem telefone/e-mail (seção 4) e os 2 adapters de entrada/saída pro
Graph API de mensageria (seção 5-6).

---

## 3. Arquitetura — onde o canal novo se encaixa

```
                    ┌──────────────────────────────────────────────┐
  Cliente clica     │                                                │
  "Enviar mensagem" │   Meta entrega a msg via webhook (Messenger    │
  no anúncio/post  ─┤   Platform API ou Instagram Messaging API)     │
                     │                                                │
                     └───────────────────┬────────────────────────────┘
                                          │ POST /api/public/messenger/webhook
                                          │ POST /api/public/instagram/webhook
                                          ▼
                     ┌──────────────────────────────────────────────┐
                     │  Adapter de canal (NOVO, só normalização)      │
                     │  - valida assinatura (X-Hub-Signature-256)     │
                     │  - resolve tenant pelo page_id/ig_business_id  │
                     │  - normaliza payload → IngestMessageInput      │
                     └───────────────────┬────────────────────────────┘
                                          │
                                          ▼
                     ┌──────────────────────────────────────────────┐
                     │   ingestMessage()  ◄── MESMO PONTO DE SEMPRE   │
                     │   (dedupe · thread · SLA · bot · realtime)     │
                     └──────────────────────────────────────────────┘
```

Isso é **exatamente** a mesma forma que `inboundProcessor.ts` (WhatsApp) e o webhook de
formulário já seguem hoje — nenhum conceito novo de arquitetura, só mais um adapter de
entrada.

---

## 4. O gap real: identidade de contato sem telefone/e-mail

### 4.1 O problema, confirmado no schema atual

```sql
-- mensageria.contacts, hoje:
phone text,
email text,
...
UNIQUE (tenant_id, phone) WHERE phone IS NOT NULL
UNIQUE (tenant_id, email) WHERE email IS NOT NULL
```

`ingest.ts` → `findOrCreateContact()` **exige** telefone OU e-mail pra deduplicar
(`if (!phone && !email) throw`). Messenger identifica o usuário por um **PSID**
(Page-Scoped ID) e Instagram por um **IGSID** (Instagram-Scoped ID) — IDs opacos,
específicos daquela Página/conta, **nunca** telefone nem e-mail por padrão. Meta só entrega
esse dado adicional se o usuário compartilhar explicitamente (raro) ou via uma extensão paga
("Business Discovery"/formulário dentro do fluxo, fora de escopo aqui).

### 4.2 Solução proposta — identidade de plataforma, aditiva

```sql
-- Migração nova (aditiva, zero impacto nas 2 colunas/índices já existentes)
ALTER TABLE mensageria.contacts
  ADD COLUMN platform            text,   -- 'messenger' | 'instagram' | NULL (demais canais)
  ADD COLUMN platform_user_id    text;   -- PSID ou IGSID, opaco

CREATE UNIQUE INDEX contacts_tenant_platform_user
  ON mensageria.contacts (tenant_id, platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;
```

`findOrCreateContact()` em `ingest.ts` ganha um 3º caminho de dedupe (além de phone/email):
se `platform_user_id` vier preenchido, busca por ele primeiro; só exige phone/email quando
`platform_user_id` também estiver ausente (preserva 100% o comportamento atual dos outros
canais, que nunca mandam esse campo).

### 4.3 Consequência pro CRM — "promoção" deliberada, não automática

`POST /api/crm/leads` continua exigindo e-mail ou telefone (`src/app/api/crm/leads/route.ts`,
linha 58) — **não deve ser relaxado**, essa regra protege o resto do CRM (distribuição,
dedupe por Match Engine) que depende de um desses dois campos existir.

**Decisão de desenho:** diferente do WhatsApp (onde o telefone já é a identidade natural e
`inboundProcessor.ts` sempre cria/atualiza o lead a cada mensagem), uma conversa de
Messenger/Instagram **nasce só no Mensageria** — visível na Caixa de Entrada, com SLA, bot,
atribuição — e só vira lead no CRM quando um telefone/e-mail for capturado:
- pelo bot, dentro do fluxo de qualificação (ex.: "pra eu te passar os detalhes, qual seu
  WhatsApp?" — padrão comum em bots de Direct, inclusive pela limitação da janela de 24h,
  seção 6.2);
- ou manualmente, por um atendente, via um botão **"Converter em Lead"** na ficha da
  conversa (reaproveita o mesmo `POST /api/crm/leads` que já existe, só que disparado sob
  demanda em vez de automático).

Isso é consciente, não uma limitação a esconder: **nem toda conversa de Direct vira lead
rastreável no CRM** — é uma característica inerente de mensageria baseada em ID de
plataforma, não falha de implementação. Documentar isso para o Master/tenant entender o
funil (conversas no Mensageria ≥ leads no CRM, para este canal especificamente).

---

## 5. Integração com a API da Meta

### 5.1 Duas APIs distintas, mesmo Business Manager

| | Messenger (Facebook) | Instagram Direct |
|---|---|---|
| API | Messenger Platform API | Instagram Messaging API (via Graph API) |
| Identidade do webhook | `object: "page"` | `object: "instagram"` |
| Identidade do usuário | PSID | IGSID |
| Token | Page Access Token (já obtido, seção 2) | **Mesmo** Page Access Token (a conta Instagram Business está sempre vinculada a uma Página do Facebook — confirmado já ser o caso aqui: Artemis9 usa `instagram_actor_id` + `page_id` juntos, `docs/CHECKPOINT.md` 2026-10-07) |
| Janela de resposta livre | 24h desde a última msg do usuário (com exceções via *message tags*) | Mesma regra de 24h |

**Achado importante:** como o Instagram Business já está sempre amarrado a uma Página
(exatamente a mesma relação já usada pela publicação orgânica), **não é preciso nenhuma
credencial nova por tenant** — é o mesmo `page_id`/Page Token já configurado em
`tenant_network_credentials`/`public.tenants` (Identidade Meta). Só a PERMISSÃO do token
precisa ser mais ampla (seção 6).

### 5.2 Webhooks necessários (2 rotas novas)

```
POST /api/public/messenger/webhook   — recebe eventos de Messenger (object: "page")
POST /api/public/instagram/webhook   — recebe eventos de Instagram Direct (object: "instagram")
GET  em ambas                        — verificação de subscrição do Meta (hub.challenge)
```

Mesmo padrão de segurança já usado em `/api/public/meta-leads/webhook` e
`/api/public/evolution/webhook`: validar `X-Hub-Signature-256` (HMAC com o App Secret —
Meta assina TODO webhook, diferente da Evolution que usa um secret simples por tenant) antes
de processar qualquer payload.

**Resolução de tenant:** o payload do webhook traz o `page_id`/`instagram_business_account_id`
que RECEBEU a mensagem — resolver o tenant via `SELECT tenant_id FROM
tenant_network_credentials WHERE credentials->>'page_id' = $1` (mesma tabela já usada pela
publicação orgânica, nenhuma tabela nova).

### 5.3 Fluxo completo, mensagem a mensagem

```
1. Meta entrega POST no webhook com o payload (PSID/IGSID, texto, timestamp, mid)
2. Adapter valida assinatura, resolve tenant pelo page_id
3. Normaliza: contact = { platformUserId: psid, platform: 'messenger' }
   (nome/foto do usuário exigem 1 chamada extra — GET /{psid}?fields=first_name,last_name,
   profile_pic — opcional, best-effort, não bloqueia a ingestão se falhar)
4. resolveMessengerInbox(tenantId) — cria/acha a inbox, lazy, igual aos outros canais
5. ingestMessage({ tenantId, inboxId, contact, direction:'inbound', senderType:'contact',
                    content, externalId: mid })
6. Dali em diante: 100% igual a qualquer outro canal — bot responde, SLA conta, atendente
   vê na Caixa de Entrada, pode assumir a conversa
7. Resposta do atendente/bot → POST /messages (humano) ou maybeRunBot (bot) →
   novo branch em metaMessagingSend.ts → Graph API /{page-id}/messages (Messenger) ou
   /{ig-user-id}/messages (Instagram)
```

---

## 6. Pré-requisitos externos (o risco real de cronograma, não de arquitetura)

### 6.1 App Review da Meta

A permissão usada hoje pela plataforma (Graph API para anúncios + publicação orgânica) é
**diferente** da necessária para mensageria:
- `pages_messaging` — enviar/receber mensagens via Página (Messenger).
- `instagram_manage_messages` — idem para Instagram Direct.

Essas permissões exigem **App Review** específico da Meta — um processo de submissão com
caso de uso documentado, possivelmente vídeo de demonstração, e **Verificação de Negócio**
(Business Verification) se ainda não tiver sido feita para o Business Manager usado. Este é
o maior risco de **prazo** (semanas, não dias; Meta pode pedir ajustes e resubmissão) — não
de arquitetura. Recomendado iniciar o processo de App Review ASSIM QUE houver decisão de
avançar, em paralelo à implementação do código (o review não depende do código estar pronto
primeiro, só do caso de uso estar bem descrito).

### 6.2 Janela de 24 horas + Message Tags

Diferente de WhatsApp (que já tem sua própria regra de 24h/template via Evolution, já
tratada hoje), Messenger/Instagram têm a MESMA classe de regra mas com nomenclatura e
exceções próprias (*Standard Messaging* dentro de 24h livre; fora disso, só com uma das
*Message Tags* aprovadas, ex. `CONFIRMED_EVENT_UPDATE`, `HUMAN_AGENT` — human agent tag dá
+7 dias mas exige handoff explícito registrado). **Isso precisa de lógica própria** — não dá
pra simplesmente reusar a janela de 24h+template que já existe pro WhatsApp Evolution sem
adaptar, porque os nomes/condições das tags são diferentes. Mapear isso em detalhe é tarefa
da fase de implementação, não deste documento — mas fica registrado que **não é
"copiar e colar" do WhatsApp**, é uma regra nova a implementar com cuidado (bloquear envio
fora da janela sem tag válida, nunca deixar o bot tentar mandar e falhar silenciosamente).

### 6.3 Webhook de teste sem conta real

Mesmo padrão de bloqueio já documentado neste projeto para TikTok (T2) e MCP do Google
(19.7): implementação e testes unitários do adapter dão pra fazer com payload sintético
reproduzindo o formato documentado da Meta, mas a confirmação ponta a ponta (webhook real
chegando, token real funcionando) só é possível com o App Review aprovado e uma conta de
teste de verdade conectada.

---

## 7. Modelo de dados — resumo de todas as mudanças de schema

**Nenhuma tabela nova.** Só extensões aditivas nas 2 já existentes:

```sql
-- 1. Identidade de contato sem telefone/e-mail (seção 4.2)
ALTER TABLE mensageria.contacts
  ADD COLUMN platform         text,
  ADD COLUMN platform_user_id text;

CREATE UNIQUE INDEX contacts_tenant_platform_user
  ON mensageria.contacts (tenant_id, platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;

-- 2. Novos valores de channel_type — ZERO migração necessária, a coluna já é `text` livre,
--    sem CHECK constraint nem enum (confirmado: \d mensageria.inboxes, 2026-10-07).
--    'messenger' e 'instagram' passam a existir só por uma linha ser inserida com esse valor.
```

Nenhuma coluna de `mensageria.inboxes`/`conversations`/`messages` precisa mudar — o `config
jsonb` da inbox já comporta `{ page_id, ig_business_id }` sem alteração de schema.

---

## 8. Arquivos a criar/tocar (mapeado 1:1 com os pontos de extensão já existentes)

### 8.1 Novos arquivos

| Arquivo | Papel | Espelha |
|---|---|---|
| `src/app/api/public/messenger/webhook/route.ts` | Recebe eventos do Messenger, valida assinatura, chama `ingestMessage` | `src/app/api/public/meta-leads/webhook/route.ts` |
| `src/app/api/public/instagram/webhook/route.ts` | Idem, pra Instagram Direct | mesmo acima |
| `src/lib/mensageria/channels/metaMessagingSend.ts` | Envio outbound via Graph API (`/{page-id}/messages`) | `src/lib/mensageria/channels/evolutionSend.ts` |
| `src/lib/mensageria/metaMessagingWebhookShared.ts` (opcional) | Lógica comum aos 2 webhooks (validação de assinatura, resolução de tenant por page_id) — evita duplicar entre os 2 arquivos acima | — |

### 8.2 Arquivos a estender (pontos de extensão já existentes, 1 branch novo cada)

| Arquivo | O que muda |
|---|---|
| `src/lib/mensageria/ingest.ts` | `findOrCreateContact()` ganha o 3º caminho de dedupe por `platform_user_id` (seção 4.2) |
| `src/lib/mensageria/inboxes.ts` | + `resolveMessengerInbox()`, `resolveInstagramInbox()` |
| `src/app/api/admin/mensageria/conversations/[id]/messages/route.ts` | + `else if (channel_type === 'messenger' \| 'instagram')` no dispatch de envio (linha 82) |
| UI: `src/app/mensageria/page.tsx`, `config/page.tsx`, `analytics/page.tsx`, `gestao/page.tsx` | + ícone/label pros 2 canais novos (mesmo padrão dos 4 já existentes) |
| `src/app/mensageria/config/page.tsx` | Nova seção/card pra configurar (ou só exibir, se herdado da Identidade Meta do tenant) o status da conexão Messenger/Instagram |
| Ficha da conversa (componente da thread) | Botão **"Converter em Lead"** quando `contact.lead_uuid IS NULL` e o canal é Messenger/Instagram (seção 4.3) |

### 8.3 Arquivo deliberadamente NÃO tocado

`src/lib/whatsapp/inboundProcessor.ts` — permanece exclusivo de WhatsApp. Não generalizar
pra "qualquer canal de rede social", porque o fluxo de criação automática de lead do CRM é
uma decisão de negócio específica do WhatsApp (telefone = identidade natural), não deve
"vazar" pros novos canais sem telefone (seção 4.3 explica o porquê).

---

## 9. CTA no wizard de campanhas pagas (o lado que efetivamente gera o lead)

Quando a decisão de avançar for tomada, a entrega **precisa incluir, na mesma fase**:

1. `CTA_TYPES` (`src/lib/marketing-utils.ts`) ganha `MESSENGER` / `INSTAGRAM_DIRECT`.
2. `CampaignWizard.tsx` — mesmo padrão já usado pro ramo `ctaType === 'WHATSAPP_MESSAGE'`
   (linha 916): novo ramo condicional, sem campo de "número" (não existe aqui), só info
   explicando que o lead vai aparecer na Caixa de Entrada em vez do CRM diretamente.
3. `campaigns/route.ts` precisa saber mapear esse `ctaType` pro `destination_type` correto
   do Graph API ao criar o Ad Creative (`MESSAGE` em vez de link) — isso é o único ponto
   realmente novo do lado de anúncios pago (criação de `call_to_action` do tipo `MESSAGE_PAGE`
   em vez de `WHATSAPP_MESSAGE` — payload exato a confirmar na doc oficial no momento da
   implementação, não suposto aqui).

**Sem o item 1-3, os passos 1-8 deste documento ficam "prontos mas inalcançáveis"** — nenhum
anúncio real geraria tráfego pro Direct, só testes manuais. Por isso a decisão de escopo da
seção 1.4: as duas metades (geração do lead + recebimento da mensagem) sempre juntas.

---

## 10. Riscos e decisões em aberto

| Risco/decisão | Mitigação/resposta |
|---|---|
| App Review pode demorar ou ser rejeitado | Não bloqueia o início do código — pode ser feito em paralelo; testar localmente com payload sintético até aprovação |
| Conversas sem telefone/e-mail nunca viram lead no CRM | Decisão consciente (seção 4.3), não bug — documentar no funil pro Master entender |
| Janela de 24h + message tags é regra nova, não copiável do WhatsApp | Implementar com cuidado próprio, nunca assumir paridade 1:1 com a lógica de template do WhatsApp |
| Rate limit da API de mensageria da Meta (diferente do rate limit de Ads já mapeado) | Verificar limites reais na doc oficial no momento da implementação |
| `ingest.ts` hoje lança erro se não tem phone nem email — 3º caminho precisa ser testado contra os OUTROS canais pra garantir que não regrediu nada | Teste de regressão obrigatório: criar conversa via WhatsApp/webform/manual depois da mudança, confirmar dedupe continua idêntico |
| Decidir se um 3º tipo de identidade (`platform_user_id`) deveria também existir pro WhatsApp oficial (caso a Evolution seja trocada pela API oficial da Meta algum dia) | Fora de escopo aqui — mas o desenho da coluna já é genérico o bastante (`platform` + `platform_user_id`) pra cobrir esse caso futuro sem nova migração |

---

## 11. Fases de entrega sugeridas (quando aprovado)

| Fase | Entrega | Depende de |
|---|---|---|
| **F0** | Solicitar App Review (`pages_messaging` + `instagram_manage_messages`) | Nada — pode começar imediatamente após decisão de negócio |
| **F1** | Migração de schema (seção 7) + `resolveMessengerInbox`/`resolveInstagramInbox` + extensão do `findOrCreateContact` | — |
| **F2** | Webhooks de recebimento (payload sintético, sem App Review aprovado ainda) | F1 |
| **F3** | `metaMessagingSend.ts` + dispatch no `messages/route.ts` + botão "Converter em Lead" | F1 |
| **F4** | UI: ícones/labels nos 4 pontos de tela (seção 8.2) | F1-F3 |
| **F5** | CTA no wizard (`CTA_TYPES` + `CampaignWizard` + `campaigns/route.ts`) | App Review aprovado (F0), senão o anúncio não teria como ser publicado de verdade |
| **F6** | Teste ponta a ponta com conta real, mensagem real, anúncio real | F0-F5 todos concluídos |

F1-F4 podem ser feitos e testados (com payload sintético) **antes** do App Review terminar —
só F5/F6 realmente dependem da aprovação da Meta.

---

## 12. Resumo executivo

- **Viável, baixo risco de arquitetura, risco de prazo concentrado no App Review da Meta.**
- **Zero tabela nova** — só 2 colunas aditivas em `mensageria.contacts` + novos valores de
  `channel_type` (coluna já é texto livre, sem migração).
- **Reaproveita ~90% da infraestrutura já construída** — pipeline de ingestão, bot, SLA,
  atribuição, tempo real, e até o Page Access Token (já obtido pra publicação orgânica)
  funcionam sem alteração.
- **A única peça genuinamente nova de domínio:** conversas sem telefone/e-mail — resolvido
  com identidade de plataforma (`platform_user_id`) e "promoção a lead" deliberada em vez de
  automática.
- **Não implementar sem decisão de negócio real** — hoje não há nenhum vazamento de lead
  (o wizard nem oferece essa opção de CTA ainda), então não há urgência técnica, só
  oportunidade a avaliar quando aparecer demanda concreta de cliente.
