# Plano de Implementação — Entregas 1 a 4 (sem dependência de terceiros)

> Documento operacional. Cada entrega tem: objetivo, escopo, migração, backend, API, interface, testes
> (com passos para você executar na tela), critérios de aceitação, riscos e rollback.
> Referência de análise: `RELATORIO_IMPLEMENTACAO_CAMINHO_C_CTWA.md`.
>
> **Regra do projeto:** toda migração entra no lote `prisma/deploy-batch-vps-pendente.sql`, é
> idempotente e roda 2x no banco local com `ON_ERROR_STOP=1` antes de dar a entrega por concluída.
> Atualizar `docs/CHECKPOINT.md` antes e depois de cada entrega.

---

## 0. Ordem e dependências

| Ordem | Entrega | Depende de | Testável só com |
|---|---|---|---|
| 1 | **E1 — Controles de envio do bot** (configuração, pausa, teto, intervalo, fila, alertas) | Nada | Tenants "Artemis9" e "Net Imobiliária" |
| 2 | **E2 — Trava de escala por fit** (regra, amostra mínima, realocação) | Nada | Dados de campanha existentes |
| 3 | **E3 — Inbox por campanha: passo no wizard** (escolha e persistência) | Nada | Wizard + tenant com Mensageria |
| 4 | **E4 — Gatilho de Lookalike configurável** (sem chamada à Meta) | Nada | Tela Master + tenant |

**Fora deste plano (dependem de terceiros ou de dados reais):**
- Roteamento da mensagem por campanha (E3, parte 2): depende do item 4.1 (formato real do `externalAdReply`).
- Indicador de digitação: depende da rota de presença da Evolution (verificar antes).
- Takeover humano pelo celular (4.2): depende do comportamento real de eco da Evolution.
- CAPI (8.4) e criação de Lookalike na Meta (8.5): dependem da Meta e da restrição do Portfólio (4.4).

---

# ENTREGA 1 — Controles de envio do bot (Evolution)

## 1.1. Objetivo

Reduzir o risco de banimento do número na Evolution, limitando e espaçando os envios automáticos do bot,
com possibilidade de pausa imediata por tenant. Tudo editável pela própria empresa em **Dados da Empresa**.

## 1.2. Escopo

Entra:
- Campos editáveis: teto por minuto, por hora e por dia; intervalo entre envios; digitação (liga/desliga,
  sem efeito até a rota ser confirmada); pausa do bot.
- Contagem de envios do bot por tenant, a partir de `mensageria.messages`.
- Fila de envio do bot, com processamento por cron.
- Pausa do bot por tenant (vale para Evolution e API Oficial).
- Alertas em 80% e 100% dos tetos, e em falhas consecutivas, via `whatsapp_alerta`.

Não entra (fica para depois):
- Indicador de digitação real (depende da rota de presença da Evolution).
- Pausa automática por limite (a pausa é sempre manual nesta versão).

## 1.3. Migração

Arquivo: `prisma/migration-2026-11-20-bot-send-controls.sql`

```sql
-- Controles de envio do bot (Entrega 1). Idempotente.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bot_send_per_min      INT     NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS bot_send_per_hour     INT     NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS bot_send_per_day      INT     NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS bot_send_interval_ms  INT     NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS bot_typing_enabled    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bot_paused            BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT chk_bot_send_per_min
    CHECK (bot_send_per_min BETWEEN 1 AND 200);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT chk_bot_send_per_hour
    CHECK (bot_send_per_hour BETWEEN 1 AND 5000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT chk_bot_send_per_day
    CHECK (bot_send_per_day BETWEEN 1 AND 50000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT chk_bot_send_interval_ms
    CHECK (bot_send_interval_ms BETWEEN 0 AND 10000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índice para contar envios do bot por tenant e janela de tempo.
CREATE INDEX IF NOT EXISTS idx_messages_bot_outbound
  ON mensageria.messages (tenant_id, created_at)
  WHERE direction = 'outbound' AND sender_type = 'bot';

-- Fila de envio do bot. Mensagem já gravada em messages; aqui só a ordem e o horário de envio.
CREATE TABLE IF NOT EXISTS mensageria.bot_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  message_id      UUID NOT NULL REFERENCES mensageria.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  kind            VARCHAR(10) NOT NULL CHECK (kind IN ('text','image')),
  priority        SMALLINT NOT NULL DEFAULT 5,       -- 1 = handoff/erro (urgente); 5 = resposta normal
  status          VARCHAR(12) NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','failed','cancelled')),
  not_before      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts        SMALLINT NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bot_outbox_drain
  ON mensageria.bot_outbox (tenant_id, status, priority, not_before)
  WHERE status = 'queued';
```

Verificação: rodar o arquivo 2x com `psql -v ON_ERROR_STOP=1`. A segunda execução não pode dar erro.

Lote de deploy: incluir o conteúdo acima em `prisma/deploy-batch-vps-pendente.sql`, dentro de
`BEGIN; ... COMMIT;`, na ordem de dependência (depois de `mensageria.messages`).

## 1.4. Backend

### 1.4.1. Leitura e escrita da configuração
Arquivo: `src/app/api/admin/dados-empresa/perfil/route.ts`

Adicionar à `EDITABLE_FIELDS`:
```ts
botSendPerMinute:  'bot_send_per_min',
botSendPerHour:    'bot_send_per_hour',
botSendPerDay:     'bot_send_per_day',
botSendIntervalMs: 'bot_send_interval_ms',
botTypingEnabled:  'bot_typing_enabled',
botPaused:         'bot_paused',
```

No `GET`: incluir as colunas no `SELECT`. Booleanos retornam `rows[0][col] === true`.

No `PUT`, validar:
- Inteiros: `Number.isInteger(n)` e intervalo do 1.3. Fora do intervalo → `400` com mensagem
  "Máximo por minuto deve estar entre 1 e 200", etc.
- Booleanos: `typeof raw === 'boolean'`, senão `400`.
- Coerência: `bot_send_per_min * 60 <= bot_send_per_hour` e `bot_send_per_hour <= bot_send_per_day`.
  Se violar → `400` "O limite por hora não pode ser menor que o limite por minuto multiplicado por 60".

Permissão: a mesma rota já usa `requireAnyApiPermission(request, ['dados-empresa'], 'READ'|'UPDATE')`.

### 1.4.2. Contagem de uso (somente leitura)
Arquivo novo: `src/app/api/admin/dados-empresa/envio-bot/uso/route.ts`

`GET` retorna:
```json
{
  "minuto": { "usado": 3, "limite": 20 },
  "hora":   { "usado": 41, "limite": 200 },
  "dia":    { "usado": 310, "limite": 1000 },
  "fila":   { "pendentes": 0 },
  "pausado": false,
  "falhasSeguidas": 0
}
```

Consultas (todas filtradas por `tenant_id` do token):
```sql
-- minuto
SELECT count(*) FROM mensageria.messages
 WHERE tenant_id=$1 AND direction='outbound' AND sender_type='bot'
   AND created_at >= now() - interval '1 minute';
-- hora: mesma query com interval '1 hour'
-- dia (fuso de São Paulo):
SELECT count(*) FROM mensageria.messages
 WHERE tenant_id=$1 AND direction='outbound' AND sender_type='bot'
   AND created_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
-- falhas seguidas: últimas 3 mensagens do bot do tenant, todas com delivery_status='failed'
-- fila: SELECT count(*) FROM mensageria.bot_outbox WHERE tenant_id=$1 AND status='queued';
```

### 1.4.3. Governador de envio (núcleo)
Arquivo novo: `src/lib/mensageria/sendGovernor.ts`

Funções exportadas:

```ts
type GateResult = { ok: true } | { ok: false; reason: 'paused' | 'minute' | 'hour' | 'day' | 'interval'; waitMs: number };

// Lê a configuração do tenant (cache de 30 s por tenant) e os contadores.
export async function checkBotSendGate(tenantId: string): Promise<GateResult>;

// Enfileira a mensagem já gravada em messages. Retorna o id da linha da fila.
export async function enqueueBotSend(input: {
  tenantId: string; messageId: string; conversationId: string;
  kind: 'text' | 'image'; priority?: 1 | 5;
}): Promise<string>;

// Processa a fila de um tenant respeitando o gate. Chamada pelo cron.
export async function drainBotOutbox(tenantId?: string, maxItems = 50): Promise<DrainReport>;
```

Regras de `checkBotSendGate`, na ordem:
1. `bot_paused = true` → `{ok:false, reason:'paused', waitMs: 0}`.
2. Contadores de minuto, hora e dia: se `usado >= limite` → `{ok:false, reason, waitMs}`.
   - `waitMs` para minuto: até o envio mais antigo da janela sair dela (cálculo a partir de `created_at` do
     envio mais antigo do minuto).
   - Para hora e dia: `waitMs` aproximado até o próximo ciclo (hora cheia / meia-noite de São Paulo).
3. Intervalo: último envio do bot do tenant (`max(created_at)`); se `now - último < bot_send_interval_ms`
   → `{ok:false, reason:'interval', waitMs: restante}`.
4. Senão `{ok:true}`.

Regras de `drainBotOutbox`:
- Seleciona itens `status='queued' AND not_before <= now()` do tenant, ordenados por `priority ASC, created_at ASC`.
- Para cada item: chama `checkBotSendGate`. Se não ok, atualiza `not_before = now() + waitMs` e para o
  processamento do tenant (preserva a ordem).
- Se ok: envia (ver 1.4.4), marca `sent` ou `failed`, incrementa `attempts`.
- Falha de envio: se `attempts < 3`, volta para `queued` com `not_before = now() + 2^attempts min`;
  senão `failed` e registra `bot_send_failures` (ver 1.4.5).

### 1.4.4. Envio real
Reaproveitar `sendWhatsAppMessage` / `sendWhatsAppMedia` de
`src/lib/mensageria/channels/dispatch.ts`, sem mudança de assinatura. O drain chama o mesmo caminho que o
`deliverIfWhatsApp` já usa, e atualiza `messages.delivery_status` e `messages.external_id`.

### 1.4.5. Alertas e eventos
Dentro de `sendWhatsAppMessage` / `drainBotOutbox`, após cada envio do bot:
- Se algum contador passou de 80% do teto e não há evento `bot_limit_warning` do mesmo tipo e janela
  nos últimos 10 minutos (para minuto) ou na hora/dia corrente → inserir em
  `mensageria.conversation_events` (`event_type='bot_limit_warning'`, `payload={window, usado, limite}`) e
  chamar `notifyWhatsApp(mensagem, tenantId)` de `src/lib/marketing/services/agentNotificador.ts`
  (usa `tenants.whatsapp_alerta`).
- Ao atingir 100%: mesmo fluxo, com `event_type='bot_limit_reached'`.
- Falhas seguidas: 3 últimas mensagens do bot com `failed` → `bot_send_failures` + alerta, uma vez por
  sequência.

### 1.4.6. Pausa e ponto de entrada
Arquivo: `src/lib/mensageria/botAdapter.ts`, função `maybeRunBot`.

Logo após carregar `conv` e antes de gerar a resposta:
- Se `tenants.bot_paused = true` do tenant: não gera resposta. Registra
  `conversation_events` com `event_type='bot_skipped_paused'`. A conversa continua com a equipe (não
  altera `handled_by_bot` nem `assignee_id`).

No envio do bot (`sendBotText`, `deliverIfWhatsApp` para texto e imagem):
- Em vez de enviar direto, chama `enqueueBotSend(...)` com `priority=5`.
- Exceção: mensagens de handoff e de erro (`FALLBACK`) usam `priority=1`.
- Se `checkBotSendGate` retornar ok agora, o envio pode ser imediato (`drainBotOutbox` para o tenant logo
  após o enfileiramento), para não criar atraso desnecessário.

### 1.4.7. Cron
Arquivo novo: `src/app/api/cron/mensageria/bot-outbox-drain/route.ts`
- `POST`, protegido por `x-cron-secret` (mesmo padrão dos demais crons).
- Chama `drainBotOutbox()` sem tenant (todos os tenants com itens `queued` vencidos).
- Registrar em `scripts/feed-cron-scheduler.js`: `* * * * *` (a cada minuto), grupo `business`.

Latência aceita: uma resposta enfileirada pode esperar até 1 minuto. Quando o gate está aberto, o envio é
imediato (1.4.6).

### 1.4.8. Interação com a API Oficial
- A fila e os controles valem para as duas vias (pausa e tetos), mas o gate de janela de 24h continua
  sendo aplicado por `whatsappCloudSend` (não muda).
- Para tenant na API Oficial, `bot_typing_enabled` não tem efeito.

## 1.5. Interface

### 1.5.1. Nova aba
Arquivo: `src/app/admin/dados-empresa/page.tsx`
- Adicionar em `TabKey` a chave `'envio'`.
- Em `TABS`: `{ key: 'envio', label: 'Envio do Bot', hint: 'Limites de envio e pausa do bot', icon: PaperAirplaneIcon }`
  (ícone de `@heroicons/react/24/outline`).
- Em `visibleTabs`: visível quando `modulos?.comunicacao` for verdadeiro (mesmo critério da aba Comunicação).
- Em `tab === 'envio'`: renderizar `<BotEnvioSection />`.

### 1.5.2. Componente
Arquivo novo: `src/components/admin/dados-empresa/BotEnvioSection.tsx`

Estrutura da tela, de cima para baixo:
1. **Card de situação** (somente leitura, da rota `uso`):
   - Três barras de progresso: minuto, hora, dia (`usado / limite`), com cor: verde até 79%, âmbar de 80% a 99%,
     vermelho em 100%.
   - Indicador "Pausado" ou "Ativo" e a quantidade de itens na fila.
   - Atualização a cada 30 s, enquanto a aba estiver aberta.
2. **Interruptor "Pausar o bot"** com o texto de ajuda:
   "Enquanto pausado, o bot não responde a nenhum contato. As conversas continuam com a equipe."
   Ao ligar, exibir confirmação: "Ligar a pausa interrompe o bot em todas as conversas. Confirmar?".
3. **Limites de envio** (três campos numéricos, com rótulo e dica):
   - "Máximo de mensagens por minuto" (1 a 200). Dica: "Recomendado: 20."
   - "Máximo de mensagens por hora" (1 a 5000). Dica: "Recomendado: 200."
   - "Máximo de mensagens por dia" (1 a 50000). Dica: "Recomendado: 1000."
4. **Intervalo entre mensagens** (ms, 0 a 10000). Dica: "Recomendado: 1500 ms. Espaça as fotos e as respostas."
5. **Interruptor "Mostrar 'digitando...' antes de responder"**. Dica: "Disponível quando o provedor confirmar o recurso."
   Enquanto a rota de presença não for confirmada, o interruptor fica desativado, com aviso "Em breve".
6. Botão **Salvar** no rodapé. Mostra "Salvo" por 2 s. Mesmo padrão das outras seções.

Validação no cliente, antes de salvar:
- Campos vazios ou fora do intervalo: mensagem abaixo do campo, botão desabilitado.
- Coerência por minuto × 60 ≤ hora ≤ dia: mensagem abaixo do campo de hora.

Persistência: `GET /api/admin/dados-empresa/perfil` para carregar; `PUT` com os seis campos para salvar.
Uso: `GET /api/admin/dados-empresa/envio-bot/uso`.

## 1.6. Testes na tela (você executa)

Pré-condição: tenant "Artemis9" logado com usuário que tenha permissão em "dados-empresa" e Mensageria
contratada. Repetir para "Net Imobiliária" no teste 1.6.7.

| # | Passo | Resultado esperado |
|---|---|---|
| T1 | Abrir **Dados da Empresa**. | Aparece a aba "Envio do Bot", ao lado de Comunicação. |
| T2 | Abrir a aba. | Limites com os padrões: 20 / 200 / 1000, intervalo 1500 ms, digitação ligada, pausa desligada. Barras de uso visíveis. |
| T3 | Digitar `0` em "Máximo por minuto" e tentar salvar. | Botão desabilitado e mensagem "Mínimo 1". Nada gravado. |
| T4 | Digitar `300` em "Máximo por minuto". | Mensagem "Máximo 200". |
| T5 | Digitar 5 por minuto, 100 por hora, 1000 por dia. Salvar. | Aparece "Salvo". Recarregar a página: valores mantidos. |
| T6 | Digitar 5 por minuto e 10 por hora. | Mensagem de coerência (5 × 60 = 300 > 10). Não salva. |
| T7 | Ligar "Pausar o bot" e confirmar. Salvar. | Barra de status mostra "Pausado". |
| T8 | Em **Caixa de Entrada**, enviar mensagem de um contato de teste. | O bot não responde. A conversa fica com a equipe. Evento `bot_skipped_paused` na linha do tempo. |
| T9 | Voltar a pausa para desligada. Salvar. Enviar mensagem de teste. | O bot responde normalmente. |
| T10 | Com o limite por minuto em 3, enviar 5 mensagens em sequência de contatos de teste. | As três primeiras são respondidas. As demais ficam na fila e saem no minuto seguinte. Nenhuma se perde. |
| T11 | Com o limite por dia em 5, enviar até esgotar. | Barra do dia em 100%. Alerta chega no número de alerta (`whatsapp_alerta`). |
| T12 | Abrir a aba com o uso em 85%. | Barra em âmbar. |
| T13 | Com o intervalo em 3000 ms, enviar duas mensagens quase juntas. | Espaçamento de cerca de 3 s entre as respostas. |
| T14 | Repetir T5 em "Net Imobiliária" e verificar que "Artemis9" não mudou. | Configurações independentes. |
| T15 | Campo "Mostrar digitando" aparece desativado com aviso "Em breve". | Confirmado. |

Registro dos resultados: anotar, para cada T, OK ou falha com o que apareceu.

## 1.7. Critérios de aceitação

- Nenhuma resposta do bot é perdida: toda mensagem enfileirada é enviada, falha ou fica registrada.
- O limite nunca é ultrapassado em nenhuma janela (minuto, hora, dia).
- A pausa interrompe o bot em todas as conversas do tenant, sem alterar a equipe.
- Configurações de um tenant não afetam o outro (T14).
- Alertas chegam uma vez por janela, não em rajada.
- Nenhum erro no console nem na aba de rede durante os testes da seção 1.6.

## 1.8. Riscos e rollback

| Risco | Mitigação |
|---|---|
| Fila atrasa respostas em horário de pico | Latência de até 1 minuto, aceita. Ajustar os tetos com o uso real. |
| Cron parado deixa mensagens sem envio | Alerta de fila parada (itens `queued` com `not_before` vencido há mais de 5 minutos). |
| Contagem de dia errada por fuso | Fuso fixo de São Paulo, testado em T11. |
| Tenant mal configurado zera o envio | Validação de coerência e intervalos (T3 a T6). |

**Rollback:** desligar a pausa (`bot_paused=false`) restaura o comportamento anterior. Remover o cron
`bot-outbox-drain` faz a fila parar sem apagar nada. A migração não remove colunas existentes; para
desfazer, `ALTER TABLE ... DROP COLUMN` das seis colunas e `DROP TABLE mensageria.bot_outbox`.

## 1.9. Itens de documentação (regra do projeto)

- `docs/CHECKPOINT.md`: entrada da Entrega 1 e aviso "DEPLOY VPS — banco pendente" atualizado.
- `docs/PLANO_MENSAGERIA.md`: nova seção descrevendo os controles de envio.
- `CLAUDE.md`: incluir na seção de cron o novo job `bot-outbox-drain` (a cada minuto).

---

# ENTREGA 2 — Trava de escala por fit (com amostra mínima e realocação)

## 2.1. Objetivo

Impedir que o orçamento aumente em campanhas sem dado de qualidade de lead, e exigir amostra mínima antes
de liberar a escala. A regra vale para `SCALE` e para `REALLOCATE_BUDGET`.

## 2.2. Decisões (já aprovadas)

1. Sem fit (`avgFit` nulo), não escala.
2. Amostra mínima de **10 leads qualificados** no período. Parâmetro configurável por segmento, tenant e cliente.
3. Com fit suficiente, aplica o limiar do segmento (`avg_fit_scale_min`: 40 em Imobiliário, 45 em Gestão).
4. Realocação segue a mesma regra.
5. O bloqueio não pausa nem reduz campanhas em andamento.

## 2.3. Migração

Arquivo: `prisma/migration-2026-11-20-fit-sample-benchmark.sql`

O benchmark novo entra na tabela `public.system_benchmarks` (escopo de segmento, sem coluna de tenant).
Os parâmetros de tenant e cliente já são resolvidos pela cascata existente (`tenant_benchmark_overrides` e
`client_benchmark_overrides`).

```sql
-- Amostra mínima de leads qualificados para liberar a escala. Idempotente.
INSERT INTO public.system_benchmarks (segment_id, metric_key, value, network_id, label, unit)
SELECT s.id, 'fit_min_leads_scale', 10, NULL, 'Amostra mínima de leads qualificados para escalar', 'leads'
  FROM public.system_segments s
ON CONFLICT DO NOTHING;
```

Verificação: confirmar a chave única de `system_benchmarks` antes de rodar (`\d public.system_benchmarks`).
A chave real é `(segment_id, metric_key, COALESCE(network_id, '00000000-...'))`. O `ON CONFLICT` deve bater
com esse predicado, senão dá erro 42P10 (já ocorreu neste projeto). Ajustar o `ON CONFLICT` conforme a
constraint real antes de executar.

Lote de deploy: incluir em `prisma/deploy-batch-vps-pendente.sql`.

## 2.4. Backend

### 2.4.1. Contagem de leads qualificados por campanha
Arquivo: `src/lib/marketing/services/aiInsights.ts`, função `mapCampaignAvgFit`.

Hoje retorna só a média. Passar a retornar também a contagem:
```sql
SELECT me.campaign_id,
       AVG(ls.score_fit)::float AS avg_fit,
       COUNT(*)::int            AS leads_com_fit
  FROM public.marketing_eventos me
  JOIN public.leads_staging ls ON ls.lead_uuid = me.lead_uuid
 WHERE me.campaign_id = ANY($1::text[])
   AND me.tenant_id   = $2::uuid
   AND ls.score_fit IS NOT NULL
   AND me.created_at >= $3::timestamptz
   AND me.created_at <= $4::timestamptz
 GROUP BY me.campaign_id;
```

Ajustar o tipo de retorno para `Map<string, { avgFit: number | null; leadsComFit: number }>` e propagar para
`CampaignData` (novo campo `leadsComFit: number`).

### 2.4.2. Função de decisão
Substituir `hasAcceptableLeadQuality` por uma função que retorna motivo:

```ts
type FitGate = { allowed: boolean; reason: 'ok' | 'sem_fit' | 'amostra_insuficiente' | 'fit_abaixo' };

function evaluateFitGate(d: CampaignData, b: BenchmarkMap): FitGate {
  const minLeads = b.fit_min_leads_scale ?? 10;
  const minFit   = b.avg_fit_scale_min ?? 40;
  if (d.avgFit === null) return { allowed: false, reason: 'sem_fit' };
  if (d.leadsComFit < minLeads) return { allowed: false, reason: 'amostra_insuficiente' };
  if (d.avgFit < minFit) return { allowed: false, reason: 'fit_abaixo' };
  return { allowed: true, reason: 'ok' };
}
```

Na regra `SCALE` (linha ~300), usar `evaluateFitGate(d, b).allowed` como condição. A descrição do insight
passa a citar o motivo quando bloqueado (ver 2.5).

### 2.4.3. Realocação
Arquivo: `src/lib/marketing/services/reallocationEngine.ts`

Antes de propor `REALLOCATE_BUDGET`, avaliar o **destino** com `evaluateFitGate`. Se bloqueado, descartar o
candidato e registrar o motivo no log (`console.info`, sem poluir a tela). Cuidado: o motor já tem 11
critérios; esta checagem é um 12º, aplicado ao destino.

### 2.4.4. Benchmarks em cascata
Nenhuma mudança na função `resolveBenchmarks`. Os novos parâmetros entram na lista de chaves lidas pelos
insights de campanha. Garantir que `fit_min_leads_scale` esteja em `GLOBAL_FALLBACKS` (valor 10) para
segmentos sem registro.

## 2.5. Interface

### 2.5.1. Motivo visível no insight
Arquivo: `src/app/admin/campanhas/dashboard/...` (onde os insights são listados) e a Auditoria.

Quando `SCALE` for bloqueado por fit, **não gerar o insight**. Em vez disso, gerar um insight informativo do
tipo `OPTIMIZE` (já existente) com texto por motivo:
- `sem_fit`: "Esta campanha ainda não tem dado de qualidade de lead. Escala liberada após os primeiros leads qualificados."
- `amostra_insuficiente`: "A campanha tem {n} lead(s) qualificado(s). São necessários {min} para avaliar a escala."
- `fit_abaixo`: "O fit médio dos leads ({fit}/100) está abaixo do mínimo de {min}. A escala está bloqueada."

### 2.5.2. Parâmetros editáveis
Os parâmetros `fit_min_leads_scale` e `avg_fit_scale_min` já aparecem em "Parâmetros do Agente", da tela
de segmentos do Master. Confirmar que `fit_min_leads_scale` está na lista de chaves exibidas
(`AGENT_KEYS` / `SegmentBenchmarksModal.tsx`) e com rótulo claro.

## 2.6. Testes na tela (você executa)

Pré-condição: tenant "Artemis9" (ou o de teste), campanha de teste com gasto e leads.

| # | Passo | Resultado esperado |
|---|---|---|
| T1 | Campanha sem nenhum lead qualificado. Abrir Insights. | Sem insight de SCALE. Aparece o insight "ainda não tem dado de qualidade". |
| T2 | Inserir 5 leads qualificados com fit alto (acima do limiar). Abrir Insights. | Ainda sem SCALE. Motivo: "São necessários 10". |
| T3 | Completar 10 leads com fit alto. Abrir Insights. | SCALE aparece com a descrição "fit médio X/100". |
| T4 | Campanha com 10 leads e fit abaixo do limiar. | Sem SCALE. Motivo: fit abaixo do mínimo. |
| T5 | Em "Parâmetros do Agente" (Master), mudar `fit_min_leads_scale` para 3. Recarregar Insights. | Campanha com 5 leads de fit alto passa a liberar SCALE. |
| T6 | Mudar de volta para 10. | Volta a bloquear. |
| T7 | Campanha com fit alto e destino de realocação com fit baixo. | O destino não aparece como oportunidade de realocação. Confirmar na seção de realocação do dashboard. |
| T8 | Verificar que a campanha bloqueada continua rodando (não foi pausada). | Status inalterado. |

## 2.7. Critérios de aceitação

- Nenhum `SCALE` é gerado sem fit e sem a amostra mínima.
- Nenhum `REALLOCATE_BUDGET` tem destino sem fit suficiente.
- Campanhas bloqueadas não são pausadas nem reduzidas.
- O motivo do bloqueio aparece para o administrador.
- Mudança do parâmetro no Master reflete nos insights sem alterar código (T5 e T6).

## 2.8. Riscos e rollback

| Risco | Mitigação |
|---|---|
| Campanhas boas escalam mais devagar no início | Aceito como trade-off, documentado para o administrador. |
| Amostra de 10 é arbitrária | Parâmetro configurável (T5). Revisar com dados do piloto. |
| Realocação fica sem candidatos | O motor já trata a ausência de candidatos. Verificar em T7. |

**Rollback:** reverter `evaluateFitGate` para a função anterior (`hasAcceptableLeadQuality`) restaura o
comportamento antigo. Os benchmarks novos não atrapalham se ignorados.

## 2.9. Documentação

- `CHECKPOINT.md`, `CLAUDE.md` (seção "Agente Autônomo": descrever a trava e a amostra mínima),
  e a seção de benchmarks do Master.

---

# ENTREGA 3 — Inbox por campanha: passo "Atendimento" no wizard

## 3.1. Objetivo

Permitir que cada campanha seja lançada já com a **inbox** que vai receber seus leads. Nesta entrega, só a
escolha e a persistência. O direcionamento da mensagem recebida (roteamento) fica para depois do item 4.1.

## 3.2. Decisões (já aprovadas)

1. A escolha é feita no wizard de lançamento.
2. Uma campanha tem uma única inbox.
3. O time vem da própria inbox (`inboxes.team_id`).
4. A lista de inboxes mostra só as compatíveis com a via escolhida pelo tenant.
5. Sem escolha, vale o fluxo atual (inbox padrão do tenant ou do cliente).

## 3.3. Migração

Arquivo: `prisma/migration-2026-11-20-campaign-inbox.sql`

```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS inbox_id UUID NULL;

DO $$ BEGIN
  ALTER TABLE campanhasmarketingdigital."Campaign"
    ADD CONSTRAINT fk_campaign_inbox
    FOREIGN KEY (inbox_id) REFERENCES mensageria.inboxes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_campaign_inbox
  ON campanhasmarketingdigital."Campaign" (inbox_id)
  WHERE inbox_id IS NOT NULL;
```

Verificação: confirmar que `mensageria.inboxes` existe antes do lote. O `ON DELETE SET NULL` garante que
apagar uma inbox não quebra a campanha.

Atualizar `prisma/schema.marketing.prisma` (campo `inboxId String? @map("inbox_id") @db.Uuid`) e rodar
`npx prisma generate --schema=prisma/schema.marketing.prisma`. **Não rodar `prisma db push`.**

## 3.4. Backend

### 3.4.1. Lista de inboxes elegíveis
Nova rota: `GET /api/admin/campanhas/inboxes-disponiveis?clientId=`

- Filtra `mensageria.inboxes` por `tenant_id` do token e `channel_type='whatsapp'`.
- Filtra pela via do escopo: `resolveWhatsAppProvider(tenantId, clientId)` (função já existente). Só retorna
  inboxes com `provider` igual a essa via.
- Retorna `[{ id, name, channelType, provider, teamName, isActive }]`, somente as ativas.
- Se Mensageria não estiver contratada (`hasMensageriaModule` falso): retorna lista vazia e flag
  `mensageriaContratada: false`.

Permissão: `requireApiPermission` com `dashboard-campanhas` / `READ` (mesmo padrão das demais rotas do
módulo).

### 3.4.2. Persistência no lançamento
Arquivo: `src/app/api/admin/campanhas/campaigns/route.ts` (POST)

- Aceitar `inboxId` opcional no corpo.
- Validar: se presente, a inbox pertence ao `tenant_id` do token, está ativa, e tem a mesma via do escopo.
  Senão, `400` com mensagem clara.
- Gravar `inbox_id` no `prisma.campaign.create`. Se não informado, `null`.

Arquivo: `src/app/api/admin/campanhas/campaigns/[id]/route.ts` (PATCH)
- Permitir alterar `inboxId` com as mesmas validações. Campanha já lançada pode trocar de inbox (decisão a
  confirmar: ver 3.8).

### 3.4.3. Leitura
A listagem de campanhas (`GET /campaigns`) passa a retornar `inboxId` e `inboxName`.

## 3.5. Interface (wizard)

Arquivo: `src/components/marketing/CampaignWizard.tsx`

### 3.5.1. Novo passo
Inserir um passo "Atendimento" na lista `STEPS` (linha ~101), **depois de "Orçamento" e antes de "Revisão"**
(índice 5, empurrando Objetivo e Revisão). Ajustar as referências de índice (`step === 5`, `step === 6`) e
o `errorsByField` correspondente.

Componente novo: `StepAtendimento` (no mesmo arquivo, padrão dos outros steps).

Conteúdo:
1. Título: "Quem atende os leads desta campanha?"
2. Descrição: "Escolha a inbox que recebe as conversas geradas por este anúncio. A inbox define o time responsável."
3. Lista de inboxes (cards, seleção única), com nome, time e via. Carregada de
   `GET /api/admin/campanhas/inboxes-disponiveis`.
4. Opção "Usar a inbox padrão" (valor `null`), com texto: "As conversas seguem a inbox padrão da empresa ou do cliente."
5. Se não houver nenhuma inbox compatível: aviso "Nenhuma inbox compatível com a via escolhida. Configure em Mensageria → Caixas." com link.
6. Se Mensageria não estiver contratada: o passo fica oculto (não gera erro).

### 3.5.2. Estado e envio
- Campo novo no `form`: `inboxId: string | null` (default `null`).
- Enviado no payload do `POST /campaigns` como `inboxId`.
- Revisão (`StepReview`): linha "Atendimento: {nome da inbox} / padrão da empresa".

### 3.5.3. Validação
Obrigatória **apenas** se a Mensageria estiver contratada e houver ao menos uma inbox compatível. Caso contrário,
o passo é opcional. Mensagem: "Escolha a inbox que vai atender esta campanha."

## 3.6. Testes na tela (você executa)

Pré-condição: tenant com Mensageria contratada, pelo menos duas inboxes WhatsApp (uma por via, se possível).

| # | Passo | Resultado esperado |
|---|---|---|
| T1 | Abrir `/admin/campanhas/nova`, seguir até o passo "Atendimento". | O passo aparece após "Orçamento". Lista mostra só as inboxes da via do tenant. |
| T2 | Tentar avançar sem escolher. | Mensagem "Escolha a inbox..." (se houver inbox compatível). |
| T3 | Escolher uma inbox. Avançar até a revisão. | Revisão mostra o nome da inbox. |
| T4 | Lançar a campanha. Abrir a campanha no Consultar Campanhas. | Campanha aparece com a inbox escolhida. |
| T5 | Tenant sem Mensageria contratada. | O passo não aparece. Lançamento segue normalmente. |
| T6 | Tenant com via Evolution: a lista não pode mostrar inbox da API Oficial. | Confirmado. |
| T7 | Tentar escolher uma inbox de outro tenant (via API, com `curl`). | Resposta `400` ou `403`. Não grava. |
| T8 | Escolher "Usar a inbox padrão". Lançar. | Campanha sem inbox (`null`). Fluxo atual preservado. |

## 3.7. Critérios de aceitação

- Toda campanha lançada com Mensageria contratada tem inbox definida, ou usa explicitamente a padrão.
- Nunca aparece inbox de outra via nem de outro tenant.
- Campanhas sem Mensageria seguem o fluxo de hoje, sem regressão.

## 3.8. Decisão em aberto

**Pode trocar a inbox de uma campanha já lançada?** Recomendo permitir, porque a troca só afeta leads
novos. Confirmar antes de implementar a alteração no PATCH.

## 3.9. Riscos e rollback

| Risco | Mitigação |
|---|---|
| Inbox desativada depois do lançamento | `ON DELETE SET NULL` e verificação de `isActive` na leitura. |
| Passo novo quebra o wizard | Ajuste de índices testado em T1 e T8. |
| Usuário não entende a diferença entre inbox e time | Textos da seção 3.5.1. |

**Rollback:** ocultar o passo (`STEPS` sem o item) e ignorar `inboxId` no POST restaura o comportamento
anterior. A coluna pode permanecer.

## 3.10. Parte 2 (depois do item 4.1)

Direcionar a mensagem recebida para a inbox da campanha, usando a atribuição (`sourceId`). Não entra nesta
entrega.

---

# ENTREGA 4 — Gatilho de Lookalike configurável (sem chamada à Meta)

## 4.1. Objetivo

Tirar o número fixo de 100 do código e torná-lo um parâmetro do Master, com piso fixo da Meta. Esta entrega
não cria nenhuma audiência na Meta: só muda a decisão de quando tentar.

## 4.2. Decisões (já aprovadas)

1. **Piso técnico da Meta: 100 membros na semente, fixo.** Não pode ser configurado para baixo. Valor
   a confirmar na documentação da Meta antes de liberar (pendência do item 8.5).
2. **Gatilho de negócio configurável** por segmento, com sobrescrita por tenant e por cliente.
3. Parâmetros adicionais: janela de tempo dos negócios fechados e frequência de atualização.

## 4.3. Migração

Arquivo: `prisma/migration-2026-11-20-audience-benchmarks.sql`

```sql
-- Gatilho de negócio para criar audiência (configurável). Piso da Meta fica no código (100).
-- Idempotente. Ajustar o ON CONFLICT à constraint real de system_benchmarks antes de executar.
INSERT INTO public.system_benchmarks (segment_id, metric_key, value, network_id, label, unit)
SELECT s.id, 'audience_seed_trigger', 100, NULL, 'Negócios fechados para criar audiência', 'negócios'
  FROM public.system_segments s
ON CONFLICT DO NOTHING;

INSERT INTO public.system_benchmarks (segment_id, metric_key, value, network_id, label, unit)
SELECT s.id, 'audience_seed_window_days', 365, NULL, 'Janela de negócios fechados considerada', 'dias'
  FROM public.system_segments s
ON CONFLICT DO NOTHING;

INSERT INTO public.system_benchmarks (segment_id, metric_key, value, network_id, label, unit)
SELECT s.id, 'audience_refresh_days', 1, NULL, 'Frequência de atualização da audiência', 'dias'
  FROM public.system_segments s
ON CONFLICT DO NOTHING;
```

## 4.4. Backend

Arquivo: `src/lib/marketing/services/audienceService.ts`

- Remover `const MIN_SEED_MEMBERS = 100` como valor de decisão.
- Criar constante `META_SEED_FLOOR = 100` (piso técnico, com comentário apontando a fonte da Meta).
- Criar `resolveSeedTrigger(tenantId, clientId): Promise<{ trigger, windowDays, refreshDays }>`:
  - Usa `resolveBenchmarks` (cascata cliente → tenant → segmento).
  - `trigger = Math.max(configurado, META_SEED_FLOOR)`. Nunca abaixo do piso.
- Substituir `MIN_SEED_MEMBERS` pelo valor resolvido em:
  - `countEligibleClosedDeals` e o gate de criação (linhas ~121–133 e ~174–201 atuais).
  - `autoCreateCustomAudiencesForEligibleScopes` (linha ~294–305).
- A janela (`windowDays`) entra no filtro de negócios fechados (`lk.created_at >= now() - interval`).

Atenção: `refreshAllExistingCustomAudiences` e o cron `audiences-refresh` continuam sem chamada nova à Meta
nesta entrega, porque a criação só muda de gatilho. Não altera o comportamento de envio à Meta.

## 4.5. Interface

- Os três parâmetros aparecem em **"Parâmetros do Agente"** (tela de segmentos do Master), com rótulo e dica.
- Dica do campo de gatilho: "A Meta exige no mínimo 100 negócios para o público semelhante. O valor
  configurado não pode ser menor que esse piso."
- Validação no Master: valor abaixo de 100 é aceito, mas o efetivo é 100. Mostrar aviso: "Valor abaixo do
  piso da Meta. O sistema usará 100."

## 4.6. Testes na tela (você executa)

| # | Passo | Resultado esperado |
|---|---|---|
| T1 | Master: abrir "Parâmetros do Agente" de um segmento. | Os três parâmetros aparecem com os padrões. |
| T2 | Definir o gatilho em 50 e salvar. | Aviso de piso. Ao recarregar, mostra 50 com o aviso. |
| T3 | No painel de Campanhas, abrir a tela de Audiências de um tenant com 60 negócios fechados. | Antes do ajuste: não cria. Com gatilho 50 (efetivo 100): continua não criando. Confirmar que o efetivo é 100. |
| T4 | Definir o gatilho em 150. Confirmar no painel que faltam 90 negócios. | Mensagem com a contagem correta. |
| T5 | Tenant com cliente próprio: sobrescrever o gatilho do cliente. | O cliente usa o valor do cliente, o tenant o do segmento. |
| T6 | Alterar a janela para 30 dias. | Apenas negócios dos últimos 30 dias são contados. |

## 4.7. Critérios de aceitação

- Nenhuma audiência é criada abaixo de 100 membros, mesmo com gatilho configurado menor.
- Os três parâmetros são editáveis e respeitam a cascata.
- Nenhuma chamada nova à Meta é feita nesta entrega.

## 4.8. Riscos e rollback

| Risco | Mitigação |
|---|---|
| Piso da Meta mudar | Constante única, com comentário e data de verificação. |
| Gatilho alto demais atrasa a audiência | Parâmetro editável (T4). |

**Rollback:** voltar `MIN_SEED_MEMBERS = 100` restaura o comportamento. Os benchmarks novos podem ficar.

---

# 5. Lote de deploy (resumo das migrações desta leva)

Ordem de inclusão em `prisma/deploy-batch-vps-pendente.sql`:
1. `migration-2026-11-20-bot-send-controls.sql` (E1: colunas em `tenants`, índice, tabela `bot_outbox`).
2. `migration-2026-11-20-fit-sample-benchmark.sql` (E2: benchmark de amostra mínima).
3. `migration-2026-11-20-campaign-inbox.sql` (E3: `Campaign.inbox_id`).
4. `migration-2026-11-20-audience-benchmarks.sql` (E4: gatilho, janela e frequência).

Antes de cada uma: rodar 2x no banco local com `ON_ERROR_STOP=1`.
Atualizar o aviso "DEPLOY VPS — banco pendente" em `docs/CHECKPOINT.md`.

---

# 6. Plano de execução conjunta

Para cada entrega, na mesma ordem:

1. **Eu implemento** o bloco de backend e migração, e rodo `npx tsc --noEmit`.
2. **Eu aplico e valido** a migração no banco local (2x).
3. **Eu faço os testes de API** que não dependem de tela (via curl com token de teste).
4. **Você executa os testes de tela** da seção correspondente, na ordem T1 a Tn, e me informa o resultado de cada um.
5. **Se houver falha**, eu corrijo e você repete apenas o teste que falhou.
6. **Ao final de cada entrega**, atualizo `CHECKPOINT.md` e registro no relatório.

Não avançamos para a entrega seguinte antes dos testes de tela da atual estarem OK.

## Perguntas em aberto antes de começar

1. **E1 — latência da fila**: aceita até 1 minuto de espera quando o limite é atingido?
2. **E3 — troca de inbox em campanha já lançada**: permitir (recomendado) ou bloquear?
3. **E4 — piso da Meta**: confirmar o valor de 100 na documentação. Pode ser verificado por mim antes de implementar.
