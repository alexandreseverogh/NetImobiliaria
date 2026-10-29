# Plano — Suporte a WhatsApp Cloud API oficial (Achado #4)

> Status: **W0-W3 implementados e testados (seção 8), mas a seção 9 (2026-10-28, rodada 2)
> pivota a forma de obter a credencial Cloud API — de "colar 5 valores manualmente, 1 App por
> tenant/cliente" para Embedded Signup com 1 App único da plataforma, escalável. Planejamento
> em revisão a pedido do usuário ("vamos refinar todo o planejamento antes de implementar") —
> nada da seção 9 foi codado ainda.

## 1. O problema

Hoje TODO canal de WhatsApp da Mensageria (`mensageria.inboxes` com `channel_type='whatsapp'`)
usa Evolution API — cliente não-oficial (Baileys/multi-device) que exige pareamento por QR code
com um celular rodando o app de consumidor/WhatsApp Business. Isso é **estruturalmente
incompatível** com um número que já foi migrado para a WhatsApp Business Platform oficial da
Meta (Cloud API) — a Meta não permite as duas coisas ao mesmo tempo no mesmo número. Tenant ou
cliente cujo número já está na plataforma oficial **não consegue usar a Mensageria hoje**, em
nenhuma funcionalidade (bot, atendimento manual, reativação automática) — nem existe um caminho
alternativo na UI pra esse caso.

## 2. Pesquisa real feita (nunca por memória — fontes oficiais consultadas agora)

- **Verificação do webhook (handshake GET)**: a Meta chama `GET` na URL configurada com
  `hub.mode=subscribe`, `hub.verify_token=<token configurado no painel>`, `hub.challenge=<int>`.
  O endpoint deve confirmar o token e devolver `hub.challenge` no corpo da resposta.
  [Fonte](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- **Assinatura de cada POST**: header `X-Hub-Signature-256: sha256=<hex>` — HMAC-SHA256 do corpo
  bruto da requisição usando o **App Secret** como chave; comparar em tempo constante.
  [Fonte](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- **Payload de mensagem recebida (POST)**: `entry[].changes[].value` com `metadata.phone_number_id`
  (identifica QUAL número nosso recebeu), `contacts[].wa_id`, `messages[].{from, id, timestamp,
  type, text.body}`. [Fonte](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- **Envio de mensagem**: `POST https://graph.facebook.com/{version}/{phone_number_id}/messages`,
  `Authorization: Bearer <token>`, body `{messaging_product:"whatsapp", to, type:"text",
  text:{body, preview_url:false}}`; resposta com `messages[0].id` (id externo pra dedupe).
  [Fonte](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- **Janela de atendimento de 24h**: mensagem do usuário ou ligação abre/renova um timer de 24h.
  Fora da janela, **texto livre é rejeitado pela API** — só é permitido mensagem de **Template**
  pré-aprovado pela Meta (categorias marketing/utility/authentication). Dentro da janela, texto
  livre funciona normalmente, sem aprovação prévia.
  [Fonte](https://developers.facebook.com/docs/whatsapp/conversation-types)
- **Autenticação/token de produção**: token de "system user" (permanente, via Business Settings),
  não o token temporário de ~24h da tela de setup.
- **App Review**: segundo a doc oficial, um desenvolvedor que só acessa dados do próprio negócio
  **não precisa** de App Review. App Review é necessário quando se acessa WABA (conta WhatsApp
  Business) que **não é dona** do app — exatamente o nosso caso (cada tenant/cliente tem a
  própria WABA, gerenciada por nós como parceiro). O caminho correto pra isso é o fluxo de
  **Embedded Signup** da Meta (o próprio tenant autoriza nosso app a gerenciar a WABA dele) —
  mesmo princípio já usado nesta plataforma pro OAuth de Meta Ads (`tenant_network_credentials`).

## 2.1 Custos reais (pesquisa complementar, pedida pelo usuário — 2026-10-28)

Pesquisado direto na página oficial de preços da Meta
([developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing)),
não por memória — e confrontado com fontes secundárias só pra achar número aproximado de mercado,
nunca como fonte de verdade.

**Modelo de cobrança (desde 1º/jul/2025 — mudou de "por conversa" pra "por mensagem"):**
- Só é cobrada mensagem **enviada pela empresa e entregue com sucesso**. Mensagem do usuário pra
  empresa nunca é cobrada, em nenhum cenário.
- A tarifa depende da **categoria** da mensagem e do **país do destinatário** (não há 1 preço
  único global).

**3 categorias de Template (só valem quando a mensagem é enviada FORA da janela de 24h —
exatamente o caso de uma reativação de lead inativo):**
| Categoria | O que é | Tem desconto por volume mensal? | Tem janela/franquia gratuita? |
|---|---|---|---|
| **Marketing** | Promocional/persuasiva (inclui reengajamento proativo) | **Não** | **Não — sempre cobrada** |
| **Utility** | Transacional/informativa, solicitada pelo cliente | Sim | Sim, até 30/09/2026 (ver abaixo) |
| **Authentication** | Verificação de identidade (OTP) | Sim | Sim, até 30/09/2026 (ver abaixo) |

**Mensagem de serviço (texto livre, dentro da janela de 24h, sem Template — o que o bot e a
resposta manual do atendente usam hoje):**
- **Grátis hoje**, com franquia de **1.000 mensagens de serviço por número de telefone por mês**
  (não acumula pro mês seguinte), vigente desde 01/11/2024.
- **A partir de 01/10/2026**: essa franquia deixa de existir — a 1.001ª mensagem de serviço do mês
  passa a ser cobrada (na tarifa de utility/authentication). Sem forma de pagamento cadastrada até
  30/09/2026, as mensagens de serviço podem parar de ser entregues. Utility dentro da janela de
  24h também deixa de ser grátis nessa mesma data.
- [Fonte](https://developers.facebook.com/docs/whatsapp/pricing)

**Valor exato em BRL — não consegui confirmar com certeza.** A Meta publica a tabela de tarifas
reais por país só dentro do WhatsApp Manager da conta de negócio (exige acesso à conta real, que
eu não tenho) — a página pública cita só um exemplo solto de utility/authentication no Brasil em
torno de **US$ 0,0068 por mensagem** (fonte secundária, trate como estimativa, não como tarifa
contratada). Recomendo conferir o valor exato direto no WhatsApp Manager quando formos cadastrar
o número de teste (fase W1), antes de decidir orçamento.

**Resposta direta à sua pergunta — template de reativação incide custo? Sim, sempre, e na
categoria mais cara.** Confirmado na própria documentação de categorização da Meta
([developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines)):
Utility exige a mensagem ser "non-promotional" e **solicitada pelo próprio cliente** (ou crítica/
de segurança); retargeting/reengajamento de quem a empresa iniciou por conta própria é
explicitamente listado como **Marketing, mesmo quando parece útil** ("These are marketing even if
requested by users"). Uma reativação de lead inativo (a feature G6 existe exatamente pra leads que
SUMIRAM, nunca pediram nada) cai sempre em Marketing — a categoria que **nunca** tem desconto de
volume e **nunca** tem janela/franquia gratuita, nem hoje nem depois de outubro de 2026. Ou seja:
diferente da mensagem de serviço do bot/atendimento manual (que é gratuita até o limite mensal),
**toda reativação automática via Template, se implementada, gera custo real por mensagem entregue,
desde o primeiro envio** — isso é um dado concreto a considerar na decisão do item 3 da seção 6.

## 2.2 Diretrizes de negócio (usuário, 2026-10-28) + achado que resolve quase tudo sozinho

**As 3 diretrizes dadas:**
1. A plataforma **nunca** absorve custo de uso da Cloud API — todo custo é repassado ao tenant
   e/ou ao cliente dele que optou por usar.
2. Isso tem que ser **parametrizável por tenant E por cliente do tenant**, independentemente —
   um tenant pode nunca querer pagar, mas um cliente específico dele pode querer, e vice-versa.
3. O mais importante: pra quem **não** opta por pagar, quanto do módulo de Mensageria continua
   funcionando? Avaliar viabilidade de restringir bot/volumetria em vez de interromper toda a
   comunicação — o objetivo do módulo é melhorar o ciclo de vendas, não travá-lo.

**Achado que resolve a diretriz 1 quase por completo, sem eu precisar construir nenhum sistema de
billing/medição interno** (pesquisado agora, não por memória — confirmado na documentação de
parceiros da Meta
[developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview/)):
existem 2 modelos de parceria radicalmente diferentes quanto a QUEM a Meta cobra:

| Modelo | Quem paga a Meta | Serve pra nós? |
|---|---|---|
| **Tech Provider** (o que escolhemos) | O **próprio tenant/cliente** cadastra cartão/forma de pagamento **na própria WABA dele**, via Embedded Signup. Meta cobra ELE direto. | ✅ Sim — bate 100% com a diretriz 1, de graça, sem nenhum código nosso de cobrança. |
| **Solution Partner** | **Nós** ficamos como "Bill To Party" — Meta cobra a NOSSA linha de crédito por TODO o gasto de TODOS os clientes compartilhando ela; exige aprovação formal da Meta como parceiro. | ❌ Não — é literalmente o oposto da diretriz 1 (a plataforma absorve o custo primeiro, depois teria que cobrar o tenant por fora). Descartado. |

**Conclusão prática:** com Tech Provider + Embedded Signup (já era o caminho recomendado na seção
2, agora confirmado como a única opção compatível com a diretriz 1), **a Meta cobra o cartão do
próprio tenant/cliente, nunca o nosso** — não precisamos construir medidor de uso + fatura + cobrança
nenhuma pra fazer valer a diretriz 1. O "opt-in" de pagar não é um flag que a gente decide e cobra —
é o próprio tenant/cliente indo até o Business Manager dele na Meta e cadastrando um cartão lá. O que
a nossa aplicação precisa fazer é: (a) deixar claro pra ele que precisa fazer isso se quiser usar sem
limite, (b) refletir esse estado na UI, (c) nunca travar o que a própria Meta já deixa passar de graça
(ver 2.3), (d) lidar graciosamente com a rejeição da Meta quando ele excede o que pode usar sem pagar.

## 2.3 A realidade de 2 níveis que responde à diretriz 3 (sem interromper tudo)

Combinando a franquia gratuita (seção 2.1) com o comportamento real sem cartão cadastrado — também
confirmado agora, direto na página de preços: **"Meta vai entregar mensagens de serviço dentro da
franquia gratuita, mas não vai entregá-las depois que a franquia se esgotar"** — a resposta à
pergunta central da diretriz 3 é mais favorável do que parecia:

- **Funciona de graça, sem cartão, sem opt-in nenhum, até 1.000 mensagens/mês por número**
  (hoje — regra muda em 01/10/2026, ver seção 2.1): bot respondendo o lead, atendente humano
  respondendo manualmente — tudo que é resposta **dentro da janela de 24h aberta pelo próprio
  contato**. Isso cobre a imensa maioria do uso real de atendimento normal.
- **Nunca funciona de graça, com ou sem opt-in de volume baixo**: qualquer mensagem que a EMPRESA
  inicia **fora** da janela (reativação automática G6, ou qualquer "primeiro contato" iniciado por
  nós) — exige Template, e Template é sempre pago (categoria Marketing, seção 2.1). Não tem como
  contornar isso com limite de volume — é uma restrição de tipo de mensagem, não de quantidade.
- **Ou seja: "interromper toda a comunicação" não é o cenário real pra quem não paga.** Bot e
  atendimento humano continuam 100% funcionais sem custo nenhum, até o teto mensal. Só a
  **reativação proativa de lead inativo** (G6) fica condicionada a quem decidiu pagar — o que já é
  exatamente o comportamento que a seção 5.6 original deste plano propunha (G6 cai pra rascunho
  manual quando não há Template disponível), só que agora com a razão de negócio explícita por
  trás, não só a limitação técnica da janela de 24h.

**Degradação graciosa proposta pro teto de 1.000/mês** (pra não ser pego de surpresa no meio de uma
venda): contador próprio por `phone_number_id`/mês (nova tabela leve,
`mensageria.whatsapp_cloud_usage_monthly`), incrementado a cada envio bem-sucedido via Cloud API —
avisa o admin do tenant/cliente quando estiver chegando perto do teto (ex.: 80%/95%), **nunca
bloqueia preventivamente antes da própria Meta bloquear** (bloquear antes do limite real
restringiria mais do que o necessário, prejudicando o ciclo de vendas sem motivo real).

**Pergunta técnica ainda em aberto, não confirmada nesta pesquisa** (verificar na fase W1, testando
contra uma WABA real): não encontrei um campo simples "tem cartão cadastrado: sim/não" na API da
Meta — o nó da WABA expõe `health_status` (diagnóstico geral de capacidade de enviar mensagem) e
`marketing_messages_lite_api_status` (um enum ligado a ter pagamento configurado, mas específico de
um produto diferente, "MM Lite API"). Pode ser que não exista jeito automático de sabermos se o
tenant/cliente já cadastrou cartão — nesse caso a UI dependeria de o próprio usuário confirmar
("já cadastrei") e nós só saberíamos de verdade quando a Meta aceitasse ou rejeitasse um envio real
fora da franquia.

## 2.4 Contador/alerta — onde exibir, critério, e o tom da mensagem (resposta ao pedido do usuário)

**Onde exibir (2 lugares, públicos diferentes):**
1. **`/mensageria/config` → aba Inboxes**, card de uso por inbox Cloud API (visível sempre, não só
   em alerta) — "847 / 1.000 mensagens este mês". É onde o admin do tenant/cliente já gerencia o
   canal; lugar natural pra ver o número frio, mesmo sem nenhum alerta disparado.
2. **Painel do Gestor (`/mensageria/gestao`)** — já é a tela de KPI gerencial que este projeto já
   construiu (fundação M5.1, ver `docs/PLANO_MENSAGERIA.md` seção 17); o card de uso entra como
   mais um KPI ali, pro gestor ver isso junto do resto do desempenho, sem precisar ir numa tela de
   configuração técnica pra entender "estamos perto de travar?".

**Critério de alerta (3 faixas, idempotente — 1 notificação por faixa por número por mês, nunca
repetida a cada mensagem):**
| Faixa | % do teto | Visual | Notificação proativa? |
|---|---|---|---|
| Normal | 0–79% | neutro | Não |
| Atenção | 80–99% | âmbar | Sim, 1x ao cruzar 80% |
| Esgotado | ≥100% | vermelho | Sim, 1x ao cruzar 100% |

Reaproveita o mesmo canal de notificação já usado pelos Agentes de Campanhas/CRM
(`notifyWhatsApp`/`notifySlack`, `agentNotificador.ts`) — sem inventar um canal novo, mesma
infraestrutura de alerta que o tenant já recebe hoje pra outras coisas.

**O tom da mensagem, exatamente como você apontou — isso é bom sinal, não alarme:** atingir o
teto normalmente significa que estão gerando conversa/negócio real (é tráfego de lead de verdade,
não spam). O texto da notificação de 100% deve refletir isso explicitamente, nunca como "erro" ou
"bloqueio técnico":
> "🎉 Vocês atingiram o volume gratuito da Meta este mês (1.000 mensagens) — isso normalmente é
> sinal de que o atendimento está gerando movimento real. Pra continuar sem interrupção, é só
> cadastrar um cartão na conta da Meta (ver instruções abaixo)."

A faixa de 80% já avisa com antecedência suficiente pra decidir sem pressa, antes de qualquer
mensagem de verdade parar de ser entregue.

## 2.5 Como funciona de verdade o "elo" entre tenant/cliente e o pagamento na Meta

A sua preocupação é legítima — mas a boa notícia é que **o dinheiro nunca passa pela nossa
aplicação, em nenhum momento, de nenhuma forma.** Passo a passo real:

1. **Conectar o número (Embedded Signup)** — tela nossa (`/mensageria/config`), botão "Conectar
   WhatsApp Oficial". Ao clicar, abre um **popup da própria Meta** (SDK oficial do Facebook,
   `FB.login` com o fluxo específico de WhatsApp Embedded Signup) — é a Meta quem desenha e
   conduz esse popup, não nós. Dentro dele, o usuário loga com a conta PESSOAL dele do Facebook e
   a própria Meta guia ele por: escolher/criar Business Manager → escolher/criar WABA → verificar
   o número por SMS/ligação → nome e categoria do negócio. Ao final, o popup fecha e devolve pra
   nós só um código de autorização, que trocamos por um token — nenhum dado financeiro passa por
   aqui, é só identidade/permissão de gerenciar aquele número.
2. **Cadastrar cartão (fora da nossa aplicação, por completo)** — isso acontece só dentro do
   **Business Manager da Meta** deles (business.facebook.com → Configurações do Negócio →
   Faturamento → Métodos de Pagamento). É literalmente a MESMA tela, do MESMO lugar, onde eles já
   cadastram cartão hoje pra pagar os anúncios que rodam através da nossa própria plataforma de
   Campanhas. **Ponto importante**: como todo tenant/cliente que já usa o módulo de Campanhas
   desta plataforma já passou por esse OAuth de Meta Ads (`tenant_network_credentials`) e já gasta
   dinheiro real em anúncio, uma fração relevante deles **já tem cartão cadastrado na Meta hoje**,
   só que pra outra finalidade (Ads) — pra esses, não existe "elo novo" nenhum, é o mesmo cartão já
   configurado servindo pra uma 2ª coisa.
3. **O que a nossa aplicação de fato faz**: guarda só o resultado TÉCNICO do passo 1
   (`phone_number_id`, `waba_id`, token) em `whatsapp_cloud_credentials` — nunca vemos número de
   cartão, nunca vemos valor cobrado, nunca processamos pagamento, nunca recebemos fatura. A Meta
   cobra o tenant/cliente direto, fora do nosso sistema, com o próprio extrato/fatura deles da
   Meta. Nosso papel se limita a: abrir o popup de conexão, guardar a credencial técnica, mostrar o
   contador de uso (2.4), e dar instrução de onde ir cadastrar o cartão quando perguntarem.

**Resumindo a complexidade real pro tenant/cliente**: é o mesmo tipo de ação que ele já faz pra
rodar anúncio pago (login com Facebook + às vezes cadastrar/confirmar cartão no Business Manager)
— não é um conceito nem uma habilidade nova pra quem já é cliente de tráfego pago desta
plataforma. Pra quem nunca rodou anúncio, é a 1ª vez fazendo esse tipo de coisa, mas ainda assim é
um fluxo guiado pela própria Meta, não algo que exigimos que ele resolva sozinho sem ajuda.

## 3. Achado de impacto funcional crítico — não é só troca de provider de envio

`src/lib/crm/agents/reactivationExecutor.ts` (`autoSendReactivation`, G6) manda **texto livre
gerado dinamicamente pelo LLM** pra lead que ficou `dias_inatividade` sem responder — exatamente
o cenário de estar **fora** da janela de 24h na maioria dos casos reais. Com Evolution isso
sempre funciona (sem restrição de janela — é o próprio motivo de ser não-oficial). Com Cloud API
oficial, essa chamada **falharia** pra um lead fora da janela: a Meta exige Template pré-aprovado
(texto fixo, nunca gerado on-the-fly) pra iniciar contato fora da janela. Ou seja: **a feature de
reativação automática (F4/G6) não pode simplesmente trocar de provider sem mudança de
comportamento** — ou vira "manda template fixo" pra leads de Cloud API, ou fica desabilitada
pra esse provider, dependendo do que o usuário decidir (seção 6).

O bot (`botAdapter.ts`) e o atendimento manual (`conversations/[id]/messages/route.ts`) são menos
afetados na prática — ambos respondem a uma mensagem que o contato **acabou de mandar**, o que
por definição está dentro da janela de 24h recém-aberta.

## 4. Decisão de arquitetura — o seam já existe, é só completar

A base já foi desenhada com isso em mente, sem eu precisar introduzir nenhum conceito novo:

- `mensageria.inboxes` **já tem uma coluna `provider`** — hoje sempre grava o literal
  `'evolution'` (whatsapp) ou `'internal'` (webform/webchat/manual). Nunca lido como enum
  real em nenhum lugar — é a única mudança estrutural necessária (fazer o código de fato
  ramificar por esse valor).
- `src/lib/mensageria/channels/evolutionSend.ts` já é um módulo de "provider de envio" isolado
  (`sendEvolutionMessage`/`sendEvolutionMedia`), com exatamente **3 call sites reais** em todo o
  projeto: `botAdapter.ts` (`deliverIfWhatsApp`), `conversations/[id]/messages/route.ts` (resposta
  manual do atendente), `reactivationExecutor.ts` (`deliverReactivation`). Um 2º módulo irmão
  (`whatsappCloudApiSend.ts`) com a mesma assinatura de função cobriria os 3 pontos.
- `src/lib/whatsapp/inboundProcessor.ts` já é **100% agnóstico de provider** por desenho — o
  próprio comentário do arquivo já antecipa isso: _"Um adaptador de provider (Evolution hoje;
  Meta WhatsApp Cloud API oficial, ou qualquer outro, no futuro) só precisa: autenticar a
  requisição, normalizar o payload bruto pra NormalizedWhatsAppInbound, e chamar
  processInboundWhatsAppMessage"_. Zero mudança necessária aqui — só um novo adaptador fino,
  espelhando `src/app/api/public/evolution/webhook/route.ts`.
- `src/lib/mensageria/inboxes.ts` (`resolveWhatsAppInbox`) lê as credenciais Evolution de colunas
  dedicadas em `public.tenants`/`public.clientes` (`evolution_api_url`, `evolution_api_key`,
  `evolution_instance`, `numero_whatsapp`, `evolution_webhook_secret`). Credenciais de Cloud API
  são de natureza diferente (`phone_number_id`, `waba_id`, `access_token` de system user, `app
  secret` pra assinatura) — não cabem nas mesmas colunas sem forçar nomes errados.

**Conclusão**: a extensão mais eficiente não exige reescrever nada do pipeline de ingestão/
threading/UI da Mensageria — só (a) decidir onde guardar a credencial Cloud API, (b) fazer
`resolveWhatsAppInbox` resolver `provider` de verdade em vez de hardcoded, (c) escrever o
adaptador de envio e o adaptador de webhook novos, (d) um dispatcher nos 3 call sites que escolhe
a função de envio certa pelo `inbox.provider`.

## 5. Desenho técnico proposto

### 5.1 Onde guardar a credencial Cloud API

Seguir o mesmo precedente já usado pra Meta Ads: `tenant_network_credentials`
(`public.tenant_network_credentials`, genérica, já desacoplada de rede-de-anúncio-específica)
**não é reaproveitável de verdade aqui** — ela é escopada por `(tenant_id, network_id)` com
`ad_networks.code IN ('meta','google',...)`, conceito de rede de ANÚNCIO, não de canal de
mensageria. Proposta: nova tabela dedicada, no mesmo espírito de granularidade de
`tenant_network_credentials` mas pro domínio de mensageria:

```sql
CREATE TABLE mensageria.whatsapp_cloud_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NULL REFERENCES public.clientes(uuid),  -- NULL = credencial do tenant
  phone_number_id VARCHAR(50) NOT NULL,   -- id do número na Meta (não é o telefone em si)
  waba_id VARCHAR(50) NOT NULL,            -- WhatsApp Business Account ID
  access_token TEXT NOT NULL,              -- system user token (permanente)
  app_secret TEXT NOT NULL,                -- pra validar assinatura do webhook
  webhook_verify_token TEXT NOT NULL,      -- pro handshake GET
  display_phone_number VARCHAR(20) NULL,   -- só informativo, pra UI
  -- auto-reportado pelo próprio tenant/cliente ("já cadastrei cartão no Business Manager da
  -- Meta") — NUNCA gate programático de verdade (ver 2.3, não achei endpoint confiável pra
  -- confirmar isso via API); só controla o texto de aviso mostrado na UI.
  payment_method_confirmed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)))
);

-- Contador mensal por número — alimenta o aviso de "chegando perto do teto gratuito" (seção 2.3).
-- Nunca é o que decide se a Meta entrega ou não (isso é só a Meta mesmo) — é só visibilidade.
CREATE TABLE mensageria.whatsapp_cloud_usage_monthly (
  phone_number_id VARCHAR(50) NOT NULL,
  year_month VARCHAR(7) NOT NULL,          -- 'YYYY-MM'
  service_messages_sent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (phone_number_id, year_month)
);
```
(mesmo padrão de índice único composto já usado em `labels`/`canned_responses`/`WhatsAppConfig`
nesta mesma frente de trabalho — exatamente 1 linha tenant-wide + N linhas por cliente — pra
`whatsapp_cloud_credentials`).

### 5.2 `resolveWhatsAppInbox` passa a resolver provider de verdade

Cascata igual à já existente (`client_id` específico > tenant-wide), mas checando primeiro se
existe linha ativa em `whatsapp_cloud_credentials` pro escopo; se sim, `provider='whatsapp_cloud'`
e `config` guarda `{phone_number_id, waba_id, access_token}` (nunca o `app_secret`/
`webhook_verify_token`, que só o adaptador de webhook precisa, resolvidos à parte). Se não,
cai no comportamento Evolution atual, inalterado.

### 5.3 Dispatcher de envio

Novo `src/lib/mensageria/channels/dispatch.ts` (ou renomear o conceito de módulo) com
`sendWhatsAppMessage(inbox, toPhone, text)` que olha `inbox.provider` e chama
`sendEvolutionMessage` ou a nova `sendWhatsAppCloudApiMessage` — os 3 call sites passam a chamar
o dispatcher único em vez de importar `sendEvolutionMessage` direto. Isso é a única mudança nos
3 arquivos (`botAdapter.ts`, `conversations/[id]/messages/route.ts`, `reactivationExecutor.ts`).

### 5.4 Novo webhook de entrada

`src/app/api/public/whatsapp-cloud/webhook/route.ts` — adaptador fino espelhando o do Evolution:
- `GET` — handshake de verificação (`hub.verify_token` contra a linha de credencial certa).
- `POST` — valida `X-Hub-Signature-256` com o `app_secret`; identifica tenant/cliente pelo
  `metadata.phone_number_id` recebido (equivalente ao papel que `instance`/token fazem hoje no
  webhook Evolution); normaliza e chama `processInboundWhatsAppMessage` — zero mudança ali.

### 5.4b Excludente por decisão — não é inferência implícita, é 1 campo explícito

Decisão do usuário (2026-10-28): **as 2 opções (Evolution / Cloud API) são excludentes por
escopo** (tenant, e independentemente por cliente — cascata da diretriz 2), e como **nada está em
produção ainda**, não precisamos nos preocupar agora com a reversibilidade/perda de histórico do
lado da Meta (pesquisada na rodada anterior — fica só como nota de atenção pra quando houver
tenant real em produção decidindo migrar um número já em uso, não um bloqueio de design hoje).

Isso simplifica o desenho de 5.1/5.2 — troca a inferência implícita ("qual credencial existe") por
**1 campo explícito de escolha**, mais simples de implementar e de entender na UI:

```sql
-- Aditivo, em public.tenants E public.clientes (mesmo padrão das colunas Evolution já existentes
-- nessas 2 tabelas) — client_id NULL/ausente no campo = herda o valor do tenant, mesma cascata
-- já usada em todo o resto da plataforma.
ALTER TABLE public.tenants  ADD COLUMN whatsapp_provider VARCHAR(20) NOT NULL DEFAULT 'evolution'
  CHECK (whatsapp_provider IN ('evolution', 'whatsapp_cloud'));
ALTER TABLE public.clientes ADD COLUMN whatsapp_provider VARCHAR(20) NULL
  CHECK (whatsapp_provider IS NULL OR whatsapp_provider IN ('evolution', 'whatsapp_cloud'));
```

`resolveWhatsAppInbox` fica mais simples do que o desenho anterior: resolve
`cliente.whatsapp_provider ?? tenant.whatsapp_provider` primeiro, e só então busca a credencial
do provider escolhido (colunas Evolution de sempre, ou a nova `whatsapp_cloud_credentials`) — sem
precisar inferir nada por "o que existe configurado". A UI vira um seletor simples (2 opções,
mutuamente excludentes) por escopo, em vez de 2 blocos independentes — exatamente o pedido do
usuário. `whatsapp_cloud_credentials` não precisa mais do flag `payment_method_confirmed` fazer
parte da decisão de qual provider está ativo (ele continua existindo, mas só pra UX de aviso —
seção 2.3/2.4 — nunca pra decidir o roteamento).

### 5.5 UI

Nova seção em `/mensageria/config` (aba Inboxes, ou uma sub-aba própria) pra cadastrar a
credencial Cloud API por tenant/cliente, no mesmo padrão visual já usado pra Evolution — com
aviso explícito da janela de 24h/templates (ponto 3) perto do campo de teste de mensagem, pra
não criar falsa expectativa de que "funciona igual ao WhatsApp normal" o tempo todo.

### 5.6 Reativação automática (G6) — comportamento por provider

Opção mais simples e honesta: `autoSendReactivation` passa a checar `inbox.provider`; se
`whatsapp_cloud` **e** a janela de 24h está fechada (sem registro de mensagem inbound do lead nas
últimas 24h), não tenta enviar texto livre — grava como `APPROVED_MANUAL` com uma nota explícita
("fora da janela — requer template aprovado, não implementado"), preservando o rascunho pra cópia
manual (mesmo fallback que já existe hoje pra lead sem telefone). Suporte real a Template fica
fora de escopo desta 1ª rodada (ver seção 7).

## 6. Decisões de negócio que precisam da sua confirmação antes de eu implementar

**Resolvidas pelas diretrizes de 2026-10-28 (seção 2.2/2.3), registradas aqui só por rastreabilidade:**
- ~~Convivência ou substituição?~~ → **Convivência por escolha explícita**, confirmado pela
  diretriz 2 ("parametrizável por tenant e por cliente") — Evolution nunca é desligado globalmente.
- ~~Quem absorve o custo?~~ → **Nunca a plataforma** (diretriz 1), resolvido de forma quase
  automática pelo modelo Tech Provider (seção 2.2) — Meta cobra o cartão do próprio tenant/cliente.
- ~~Template de reativação sempre custa?~~ → Sim, confirmado (seção 2.1) — e pela diretriz 3, G6
  fica condicionado a quem **optou por pagar** (tem Cloud API conectada); quem não optou mantém
  bot/atendimento manual funcionando normalmente até o teto de 1.000/mês (seção 2.3) — G6 cai pra
  rascunho manual nesse caso, mesmo comportamento já desenhado na seção 5.6.

**Ainda em aberto, pontos novos surgidos desta rodada:**
1. **Template de reativação (G6) via Cloud API — ainda vale a pena nesta 1ª rodada?** Com o custo
   real confirmado (categoria Marketing, sempre pago, sem desconto de volume — seção 2.1) e sabendo
   que só quem **optou por pagar** teria acesso a essa automação, mantenho a recomendação de
   **W4 opcional/separado**: construir primeiro W0-W3 (bot + atendimento manual funcionando via
   Cloud API, de graça até o teto — já cobre a maior parte do uso real) e decidir sobre Template de
   reativação depois, com dado real de quantos tenants/clientes de fato optam por pagar.
2. **UI de "declaração de opt-in"**: como não há como confirmar via API se o tenant/cliente já
   cadastrou cartão na própria Meta (seção 2.3, pergunta técnica em aberto), a UI vai depender de
   autodeclaração ("marquei que já cadastrei") — confirma que isso é aceitável como ponto de
   partida (com o aviso claro de que quem mentir simplesmente vai ver a Meta parar de entregar
   mensagem acima do teto, sem nenhuma consequência pra nós)?

## 7. Fases propostas (cada uma testável e revisável isoladamente, mesmo padrão de todo o resto
desta base — nunca a seguinte sem a anterior confirmada)

| Fase | Entrega | Depende de |
|---|---|---|
| **W0** | Migração: tabela `whatsapp_cloud_credentials` + UI de cadastro (sem lógica de envio ainda) | — |
| **W1** | Webhook de entrada (`GET` handshake + `POST` com assinatura validada) + `resolveWhatsAppInbox` resolvendo `provider='whatsapp_cloud'` de verdade | W0 |
| **W2** | Dispatcher de envio (`sendWhatsAppCloudApiMessage`) plugado nos 3 call sites (bot, resposta manual, reativação) — só dentro da janela de 24h | W1 |
| **W3** | G6 checando janela de 24h antes de tentar enviar reativação automática pra provider Cloud API (ponto 3/5.6) | W2 |
| **W4** *(opcional, decisão pendente — item 3 da seção 6)* | Suporte a Template de mensagem (categoria + variáveis), pra reativação funcionar de verdade fora da janela | W3 + confirmação do usuário |

### O que cada fase destrava, em termos de negócio (não só técnico)

Pergunta direta do usuário: com W0-W3 prontos e testados (W4/Template postergado), uma campanha
NOVA lançada no Meta já chega automaticamente no CRM e na Mensageria pra quem usa Cloud API?
**Sim — e nenhuma mudança é necessária no wizard de lançamento de campanha nem no anúncio em si.**

O mecanismo que atribui lead a campanha (`[ref:{trackingId}]` embutido no link `wa.me?text=...`
que o anúncio clica-pra-WhatsApp já usa, sessão 4) acontece **antes** de qualquer mensagem ser
entregue — é parte do próprio link do anúncio, nunca sabe nem se importa com qual provider recebe
a mensagem do outro lado. E `processInboundWhatsAppMessage` (o pipeline que cria o lead no CRM e
a conversa na Mensageria) já é 100% agnóstico de provider por desenho, confirmado na seção 4 — zero
mudança nele. Em outras palavras: **o mesmo pipeline que já funciona hoje com Evolution passa a
funcionar idêntico com Cloud API**, só muda quem entrega a mensagem pra gente por trás.

Detalhando por fase, pra ficar preciso sobre o que cada uma destrava:
- **Só com W0+W1** (webhook + resolução de provider): a **captura** já funciona — lead chega,
  CRM cria o registro, Mensageria cria a conversa, atribuição de campanha correta. O que falta
  ainda é responder.
- **Com W2 também** (dispatcher de envio): o **bot responde automaticamente** e o **atendente
  consegue responder manualmente** — aí sim o ciclo de atendimento fica completo, igual ao que já
  acontece hoje com Evolution. E como é a 1ª mensagem de um lead novo (sempre abre uma janela de
  24h fresca), a resposta sai **de graça**, dentro da franquia — não depende de pagamento nenhum
  pra esse fluxo normal de captação+1º atendimento, só a reativação futura (W4) depende.
- **W3** só adiciona a checagem de janela pra reativação (G6) não tentar enviar texto livre pra
  quem está fora da janela quando não há Template — não afeta a captação/1º atendimento em nada.

Então a resposta curta: **sim, assim que W0-W2 estiverem prontos (W3 é só uma rede de segurança
pra G6), uma campanha nova já entrega lead automaticamente no CRM e na Mensageria, com atendimento
de 1ª resposta funcionando normalmente e de graça** — exatamente o mesmo comportamento de hoje,
só que num número que já migrou pra plataforma oficial da Meta.

### Esforço real de W4 — medido, não estimado de leve (pedido do usuário)

Confirmado agora na documentação oficial
([developers.facebook.com/docs/whatsapp/business-management-api/message-templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)):
**template é um ativo PRÓPRIO de cada WABA — não existe compartilhar/reaproveitar entre WABAs
diferentes.** Isso muda o perfil de esforço de W4 de forma estrutural, não é só "mais uma tela":

1. **Criação + submissão + acompanhamento de status** (médio-alto esforço, maior peça de W4): UI
   pra definir o texto/categoria/variáveis do template; chamada à API por WABA (1 submissão por
   tenant/cliente que tiver conectado Cloud API, nunca uma vez só pra todo mundo); webhook novo pra
   receber o evento `message_template_status_update` da Meta (aprovado/rejeitado — revisão leva
   até 24h, às vezes rejeita e precisa reenviar); tela de status por WABA (pendente/aprovado/
   rejeitado). Comparável ou maior que o esforço de W1 inteiro.
2. **Envio via Template** (esforço pequeno, contido): payload diferente (`type:"template"` com
   `components[].parameters`) no `whatsappCloudApiSend.ts` já desenhado — reaproveita o dispatcher
   de W2, não precisa de arquitetura nova.
3. **G6 abandona texto livre gerado por LLM pra esse provider** (mudança real de produto, não só
   plumbing): hoje a reativação manda texto dinâmico; com Template, passa a escolher entre
   templates fixos pré-aprovados e preencher variáveis (`{{1}}`=nome do lead, `{{2}}`=assunto,
   etc.) — menos personalizado, decisão de produto própria sobre quantos templates oferecer.
4. **Custo operacional contínuo, não só de construção**: qualquer mudança futura de texto do
   template exige reaprovação em CADA WABA que o usa — nunca é "editar 1 vez, vale pra todo
   mundo".

**Conclusão honesta**: W4 completo (itens 1+3) é comparável em tamanho a W0+W1+W2+W3 juntos — não
é um complemento pequeno, é uma 2ª frente de trabalho real, principalmente pelo laço de aprovação
por-WABA que é estrutural da Meta, não algo que a gente consegue simplificar/centralizar do nosso
lado. Combinando com a sua diretriz de atrelar isso a quem de fato demonstrou interesse em pagar
(seção 2.4): recomendo manter W4 **fora do escopo da 1ª rodada**, e usar o próprio alerta de teto
(seção 2.4) como o gatilho real pra decidir — quando o 1º tenant/cliente bater no limite e
perguntar sobre pagar, aí sim avaliamos se vale construir W4 pra ele especificamente.

Todas exigem conta real de WhatsApp Business Platform pra teste ponta a ponta — diferente de
Meta Ads (onde o projeto já usa o marcador `__SIMULATED__` pra testar sem API real), não há como
simular o lado de fora (Meta não tem um "modo sandbox" equivalente pra Cloud API de forma
trivial) — W0 é testável sem conta real (só schema/UI); W1 em diante exige credencial real de
pelo menos 1 número de teste (a Meta oferece um "test number" gratuito no App Dashboard pra isso,
sem custo e sem precisar de Business Verification completa pra começar a testar).

## 8. Status — W0, W1, W2, W3 implementados e testados (2026-10-28)

**Implementado:**
- `prisma/migration-2026-10-28-whatsapp-cloud-api-w0.sql` — `tenants.whatsapp_provider`/
  `clientes.whatsapp_provider` (escolha excludente, seção 5.4b), `mensageria.
  whatsapp_cloud_credentials`, `mensageria.whatsapp_cloud_usage_monthly`. Aplicada localmente.
- `src/lib/mensageria/channels/whatsappCloudSend.ts` — envio real via Graph API v21.0 +
  incremento do contador mensal (seção 2.3/2.4) só em envio bem-sucedido.
- `src/lib/mensageria/channels/dispatch.ts` — dispatcher único usado pelos 3 call sites reais
  (`botAdapter.ts`, `conversations/[id]/messages/route.ts`, `reactivationExecutor.ts`).
- `src/lib/mensageria/inboxes.ts` — `resolveWhatsAppInbox`/`resolveWhatsAppProvider` (exportada)
  resolvem a escolha explícita antes de qualquer credencial; fallback pro Evolution se Cloud
  API foi escolhido mas a credencial ainda não foi cadastrada.
- `src/app/api/public/whatsapp-cloud/webhook/route.ts` — handshake GET + POST com validação de
  assinatura HMAC em tempo constante, delega pro `processInboundWhatsAppMessage` já existente.
- `src/app/api/admin/mensageria/whatsapp-cloud/route.ts` (novo) + seção "Provider de WhatsApp"
  na aba Inboxes de `/mensageria/config` — escolha de provider por tenant/cliente, cadastro da
  credencial, autodeclaração de cartão, contador de uso do mês com cor por faixa (seção 2.4).
- `reactivationExecutor.ts` — W3: checa janela de 24h antes de reativar via Cloud API; fora da
  janela, cai pra `APPROVED_MANUAL` com nota explícita (Template fica pra W4, ainda postergado).

**Testado ao vivo, ponta a ponta, contra o dev server real e o banco real** (tenant-sandbox
"Teste RAG — Multi-Segmento", dado de teste removido depois, `tsc --noEmit`: 0 erros em todo o
projeto):
- Escolha de provider: tenant → `whatsapp_cloud`, resolução correta via API e via
  `resolveWhatsAppInbox` (inbox criada com `provider='whatsapp_cloud'` e config certo).
- Cascata por cliente: cliente sem override herda do tenant; override pra `evolution` isola
  sem afetar o tenant; `resetToTenant` volta a herdar — os 3 confirmados via API real.
- Dispatcher: `sendWhatsAppMessage('whatsapp_cloud', ...)` chamou de fato a Graph API real
  (confirmado pelo erro genuíno `"Invalid OAuth access token"` — token fake, mas a chamada
  é real) — nunca lança exceção, sempre `{ok:false, error}`.
- Webhook: handshake GET aceita o verify_token certo (devolve o challenge) e rejeita o errado
  (403). POST com assinatura válida criou lead real (`leads_staging`) + contato/conversa real
  na Mensageria com `provider='whatsapp_cloud'` + disparou o bot de verdade (que tentou
  responder via Cloud API e falhou graciosamente, `delivery_status='failed'`, sem crash).
  POST com assinatura inválida foi ignorado silenciosamente — zero lead/contato criado.
- Bug real encontrado e corrigido no processo: `paymentMethodConfirmed` sozinho (sem nenhum
  campo de credencial no mesmo PUT) não disparava o upsert e nunca persistia — corrigido
  incluindo o campo na condição `hasCredFields`.

**Pendências reais, registradas com honestidade:**
- A proposta de alerta proativo (Slack/WhatsApp ao cruzar 80%/100%, seção 2.4) ainda não está
  implementada — o contador em si funciona e é exibido na UI, mas o disparo de notificação via
  `agentNotificador.ts` exigiria passar contexto de tenant/cliente através do dispatcher (que
  hoje só conhece `config`/`provider`, não `tenantId`) — fora de escopo desta rodada, registrado
  como próximo incremento, não esquecido.
- W4 (Template de reativação) continua fora de escopo, por decisão do usuário.
- Nenhum teste foi feito contra uma WABA/número real da Meta (nenhuma conta disponível) — toda
  a validação foi contra o comportamento real da Graph API (erro de auth genuíno) e contra o
  pipeline interno; o caminho de SUCESSO de envio real (`ok:true`) nunca foi exercitado.
- Nada foi commitado — arquivos novos/editados estão no working tree, aguardando revisão do
  usuário antes de qualquer commit.

---

## 9. Refinamento do plano — arquitetura escalável + UX guiada (2026-10-28, rodada 2)

> **Só planejamento — nada desta seção foi implementado.** Pesquisa real feita agora na
> documentação oficial da Meta (Embedded Signup, Tech Provider), nunca por memória. Responde
> aos 6 pontos levantados pelo usuário nesta rodada.

### 9.1 Mudança central: de "colar 5 valores" pra Embedded Signup (resolve o item 2/6 — escala)

**Achado decisivo, que muda a arquitetura de W0 por completo:** o desenho que implementei em
W0-W3 (seção 5.1, "cada tenant/cliente cola phone_number_id/waba_id/access_token/app_secret/
webhook_verify_token num formulário") **exige 1 App da Meta por tenant/cliente** — inviável
pra "dezenas, centenas ou milhares de clientes" (pedido do usuário). A solução real da Meta pra
esse exato problema é o **Embedded Signup como Tech Provider**: **1 único App nosso**, e cada
cliente só clica "Conectar WhatsApp" → popup da própria Meta → loga com o Facebook dele → a
Meta guia ele por verificar o número → fecha o popup. Zero criação de App pelo cliente.

**Fluxo técnico real** (pesquisado agora, fonte oficial):
1. Frontend carrega o SDK JS da Meta e chama `FB.login(callback, { config_id: <nosso config>,
   response_type: 'code', override_default_response_type: true, extras: { setup: {} } })`.
   `config_id` é criado 1 vez por nós, no Dashboard do nosso App (Facebook Login for Business
   → variação "WhatsApp Embedded Signup"), escolhendo exatamente as permissões/ativos que
   vamos precisar (`whatsapp_business_messaging`, `whatsapp_business_management`).
2. Dois canais de retorno simultâneos: (a) o callback do `FB.login` recebe `response.
   authResponse.code` — um código trocável, **válido só por 30 segundos**; (b) um evento
   `message` da janela (`type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH'`) com `data.waba_id` e
   `data.phone_number_id` do número que o cliente acabou de conectar.
3. **No mesmo instante** (por causa do TTL de 30s), nosso backend troca o `code` pela "Access
   Token API" por um **token de usuário de sistema de integração de negócios** ("business
   token") — já escopado pra aquela WABA específica do cliente, sem passo adicional.
4. **Passo que eu nunca implementei em W0-W3 e que é obrigatório**: `POST /{waba_id}/
   subscribed_apps` — inscreve nosso App nos webhooks DAQUELA WABA. Sem essa chamada, mesmo
   com webhook verificado e token válido, a Meta nunca manda nenhum evento daquele número pra
   gente. Isso precisa entrar como passo backend logo depois do passo 3.

**O que isso simplifica no nosso schema** (`whatsapp_cloud_credentials`, seção 5.1 original):
`app_secret` e `webhook_verify_token` deixam de ser por-linha — passam a ser **1 valor só,
plataforma inteira** (o App é nosso, único) — mais simples de guardar (ex.: variável de
ambiente, ou 1 linha de config global, não uma coluna repetida por tenant). Só `phone_number_id`,
`waba_id` e `access_token` continuam por tenant/cliente — só que agora preenchidos
automaticamente pelo fluxo acima, nunca copiados manualmente pelo cliente.

### 9.2 O preço real da escala: App Review + Verificação de Negócio (nossa, 1 vez — não do cliente)

Pesquisado agora, fonte oficial + guias de parceiros confirmando o mesmo ponto: pra esse fluxo
funcionar com clientes REAIS (fora de "admin/desenvolvedor/testador do nosso próprio App"), a
Meta exige:
- **App Review**, solicitando **Advanced Access** pras 2 permissões (`whatsapp_business_
  messaging`, `whatsapp_business_management`) — sem isso, o popup de Embedded Signup só
  funciona pra contas cadastradas como admin/dev/tester do NOSSO App (ótimo pra testar
  internamente, mas nenhum cliente real conseguiria passar por ele).
- Evidência exigida na revisão: vídeo mostrando uma mensagem real sendo enviada pelo nosso App
  e recebida no WhatsApp, + vídeo criando um Template de mensagem (ou seja, pra passar a
  revisão da Meta, precisamos ter ALGUMA capacidade mínima de Template funcionando — mesmo que
  o W4 completo continue fora de escopo do uso real em produção, um recorte minúsculo dele
  pode acabar sendo pré-requisito só pra gravar esse vídeo de evidência).
- Prazo típico: alguns dias úteis (não é instantâneo).
- **Verificação de Negócio** (Business Verification) é um processo separado, da NOSSA empresa
  (documentos, confirmação de domínio, etc.) — também pré-requisito, feito 1 vez.
- Depois de aprovado: o limite de clientes NOVOS conectando por semana é de 200 (não é um teto
  total — é velocidade; 200/semana ≈ 800/mês, tranquilo pra "centenas/milhares" ao longo do
  tempo, só não instantâneo no dia 1).

**Isso é trabalho real do lado do USUÁRIO (dono da plataforma), não algo que eu implemento em
código** — abrir o processo de App Review/Verificação de Negócio no Meta Business Manager,
preencher as evidências, esperar a aprovação. Enquanto isso não sai, podemos testar o fluxo
inteiro com contas de teste nossas (admin/dev/tester do App), mas nenhum cliente real entra.

### 9.3 Ajuda guiada ao administrador — simplificada pela própria mudança de arquitetura (item 5)

A boa notícia: a pivotagem pra Embedded Signup **já resolve a maior parte do problema de UX**
que motivou o pedido de "guiar passo a passo" — não existe mais "vá em developers.facebook.com,
crie um App, ache o App Secret, crie um Usuário de Sistema..." pro cliente fazer. A parte
tecnicamente pesada (criar App, permissões, config_id) é feita **1 vez, por nós**, não por cada
cliente. O que sobra pro administrador da empresa é: clicar 1 botão, fazer login com o Facebook
dele, confirmar o número. Ainda vale ter, na nossa UI:
- Um texto curto explicando o que vai acontecer antes de clicar (por que pedimos login do
  Facebook, o que vamos poder fazer com o WhatsApp dele).
- Uma tela de status clara depois (conectado/erro), já que o popup pode falhar/ser cancelado
  (`event: 'CANCEL'`/`ERROR'`, a Meta já nos avisa qual tela ele abandonou).
- Pro cenário raro de alguém preferir não passar pelo popup (ex.: já tem WABA configurada de
  outro jeito), manter o formulário manual (W0-W3 atual) como caminho alternativo avançado,
  não removê-lo — só deixar de ser o caminho PADRÃO.

### 9.4 `whatsappNumbersMatch` passa a reconhecer Cloud API também (item 4)

`resolveEvolutionPairedNumber` (de outra frente, não commitada) ganha um 2º caminho: se
`whatsapp_provider = 'whatsapp_cloud'`, buscar o número em `whatsapp_cloud_credentials.
display_phone_number` em vez das colunas Evolution — mesmo formato de retorno (`string | null`),
`whatsappNumbersMatch` não muda nada, só passa a receber um número real nos dois cenários.
Mudança pequena e isolada, encaixa bem como parte da mesma rodada.

### 9.5 Consolidação de UI — "Integração Meta" única, com sub-seções (item novo)

Hoje: `/admin/campanhas/configuracoes` (Identidade Meta — Ads), `/admin/clientes/{id}`
(Configurações Meta — Ads por cliente), `/mensageria/config` (Provider WhatsApp). Proposta:
uma área única "Integração Meta" (ainda a decidir ONDE ela mora — candidato natural é dentro de
`/admin/campanhas/configuracoes`, já que é onde o conceito de "tenant conectado à Meta" já
existe, com uma aba/sub-seção nova "WhatsApp"), com sub-seções: Ads (o que já existe) e
WhatsApp (botão de conectar + status + número conectado) — mesmo padrão de tabs já usado em
`/mensageria/config`. `/admin/clientes/{id}` continua sendo o lugar de override POR CLIENTE,
intocado — a consolidação é só juntar os CONCEITOS relacionados a Meta numa área, não remover a
cascata tenant→cliente que já existe.

### 9.6 Ref manual pra campanha lançada fora do wizard (item 1)

Novo recurso pequeno, independente do resto desta seção: uma tela (provavelmente dentro de
`/admin/campanhas/importar`, que já existe pra campanha manual, ou uma nova aba ali) onde o
admin gera um `trackingId`/ref pra uma campanha/anúncio que ele vai cadastrar ele mesmo direto
no Gerenciador de Anúncios da Meta — sem exigir Ad/AdSet completo no nosso banco (o import
atual, confirmado lendo o código, não cria `Ad` nem `trackingId` nenhum, só `Campaign` pra
sincronizar métrica). O admin copia o ref gerado e cola manualmente no campo de mensagem do CTA
de WhatsApp daquele anúncio específico, na própria Meta. `resolveCtaRef` já reconhece `[ref:...]`
no texto recebido — zero mudança no lado de recebimento, só a geração/exibição do ref é nova.

### 9.7 Fases revisadas (substituem W0-W3 na parte de credencial; o resto — webhook, dispatcher,
checagem de janela 24h — já está pronto e não muda)

| Fase | Entrega | Depende de |
|---|---|---|
| **M0** *(ação do usuário, fora de código)* | Abrir processo de App Review + Verificação de Negócio no Meta Business Manager (seção 9.2) — pré-requisito pra qualquer cliente real se conectar | — |
| **M1** | Criar o App único + config de Facebook Login for Business (`config_id`) — feito 1 vez, testável com conta própria (admin/dev/tester) mesmo antes de M0 aprovar | — |
| **M2** | Backend: endpoint de troca de código (`code` → business token) + `POST /{waba_id}/subscribed_apps` + ajuste do schema (app_secret/verify_token virando platform-level) | M1 |
| **M3** | Frontend: botão "Conectar WhatsApp" com o popup real + tela de status — substitui o formulário manual como caminho padrão (formulário continua disponível como avançado) | M2 |
| **M4** | `whatsappNumbersMatch` reconhece Cloud API (seção 9.4) | — (independente) |
| **M5** | Consolidação de UI "Integração Meta" (seção 9.5) | M3 |
| **M6** | Ref manual pra campanha importada/manual (seção 9.6) | — (independente) |
| **M7, ainda sem decisão do usuário** | Template mínimo só pra evidência de App Review (seção 9.2) — recorte pequeno do W4 original, não o W4 completo | M0 em andamento |

**M1-M6 são código real, posso implementar.** M0 é 100% ação do usuário fora desta sessão —
sem ela, M2-M3 podem ser construídos e testados com contas de teste nossas, mas clientes reais
não conseguem se conectar até M0 ser aprovada pela Meta.

## 10. Correção de arquitetura (2026-10-28, rodada 3) — App é por TENANT, não global da plataforma

**Achado real do usuário, que corrige a seção 9.1:** o tenant "Artemis9" já tem um App real
na Meta (`tenants.meta_app_id`/`meta_app_secret`/`meta_token`/`meta_page_id` já populados,
confirmado no banco) — reaproveitado do fluxo de Meta Ads, que já segue esse padrão por tenant
nesta base (confirmado em `metaAdsAdapter.ts`). Ou seja: **cada TENANT já tem (ou pode ter) o
próprio App** — não existe (nem precisa existir) 1 App único da plataforma inteira.

Isso é melhor do que a seção 9.1 original, não pior — resolve o problema de escala exatamente
no nível certo: o admin da Artemis9 **não cria 1 App por CLIENTE** (o problema real que o
usuário levantou) — ele reaproveita o App que a Artemis9 (o tenant, a empresa) já tem, e
**cada cliente da Artemis9** conecta o próprio WhatsApp via Embedded Signup contra ESSE App,
sem nunca precisar criar nada. Escala corretamente: 1 App por tenant (que o tenant já teria
que ter de qualquer forma, pra rodar Ads), N clientes conectando sem esforço técnico nenhum.

**Mudança de schema decorrente** (W0, seção 5.1, revisado):
- `app_secret` e `webhook_verify_token` **saem** de `mensageria.whatsapp_cloud_credentials`
  (nunca deveriam ser por tenant+cliente — são por App, e o App é por TENANT).
- `app_secret` **reaproveita** a coluna já existente `tenants.meta_app_secret` (mesmo App,
  mesmo secret, usado tanto pra Ads quanto agora pra WhatsApp — é literalmente o mesmo valor).
- 2 colunas novas em `tenants`: `whatsapp_embedded_signup_config_id` (o Config ID do passo 3
  da seção 9.1, criado 1 vez por tenant dentro do App dele) e `whatsapp_webhook_verify_token`
  (escolhido 1 vez pelo tenant, usado pra verificar o webhook daquele App específico).
- `whatsapp_cloud_credentials` continua escopada por (tenant, cliente opcional) só pros campos
  que de fato variam por CLIENTE: `phone_number_id`, `waba_id`, `access_token` (o business
  token resultante da troca de código — esse sim é por WABA/cliente, nunca compartilhado).

**Próximo passo imediato pro usuário** (dentro do App Artemis9 já existente, nada novo a
criar): adicionar os produtos **WhatsApp** e **Facebook Login for Business** ao App (se ainda
não tiverem); dentro de Facebook Login for Business, criar 1 Configuração na variação
**WhatsApp Embedded Signup**, selecionando as permissões `whatsapp_business_messaging` e
`whatsapp_business_management` — isso gera o **Config ID** que falta pra mim seguir com M2/M3.

## 11. Próximo passo

**Correção da seção 10 concluída e testada de ponta a ponta** (migração `w0b` aplicada,
3 arquivos ajustados):
- `prisma/migration-2026-10-28-whatsapp-cloud-api-w0b-tenant-app.sql` — aplicada; remove
  `app_secret`/`webhook_verify_token` de `whatsapp_cloud_credentials`, adiciona
  `tenants.whatsapp_embedded_signup_config_id`/`whatsapp_webhook_verify_token`.
- `src/app/api/public/whatsapp-cloud/webhook/route.ts` — GET (handshake) e POST (validação de
  assinatura) reescritos pra usar as colunas novas de `tenants`.
- `src/app/api/admin/mensageria/whatsapp-cloud/route.ts` — reescrito por completo: GET expõe
  `tenantApp` (status do App do tenant — `hasMetaApp`/`embeddedSignupConfigId`/
  `hasWebhookVerifyToken`) separado da `credential` por escopo (tenant ou cliente); PUT separa
  os 2 conjuntos de campo — `embeddedSignupConfigId`/`webhookVerifyToken` só no escopo tenant
  (rejeita com 400 se vier com `?clientId=`), `phoneNumberId`/`wabaId`/`accessToken`/
  `displayPhoneNumber`/`paymentMethodConfirmed` em qualquer escopo (credencial por cliente).

**Testado ao vivo, ponta a ponta, contra o tenant real Artemis9** (servidor dev real, porta
3000, JWT gerado com `userId` real): GET inicial confirma `hasMetaApp:true` (App Ads real já
existe) + `embeddedSignupConfigId:null`/`hasWebhookVerifyToken:false` (ainda não configurado) ·
PUT dos campos de App do tenant persiste corretamente, confirmado no GET seguinte · PUT dos
mesmos campos COM `?clientId=` é rejeitado (400) · credencial por cliente (criado 1 cliente de
teste real) — PUT cria, GET reflete `ownProvider`/`effectiveProvider` corretos (override por
cliente ganhando do tenant) · `paymentMethodConfirmed` enviado sozinho persiste sem apagar o
resto da credencial (`COALESCE`) · `resetToTenant` limpa o override, credencial permanece
intacta · `resolveEvolutionPairedNumber` (`whatsappConfigResolver.ts`) resolvido corretamente
contra a credencial Cloud API real criada (`display_phone_number`), `whatsappNumbersMatch`
comparando certo nos 2 sentidos · webhook GET (handshake) aceita o verify token real do tenant e
rejeita um errado (403) · webhook POST com assinatura HMAC real (computada com
`tenants.meta_app_secret` real, nunca exposto nem lido por mim — só o hash resultante) processa
a mensagem (contato+conversa+mensagem reais criados); com assinatura inválida, é silenciosamente
ignorado (confirmado por contagem: só 1 mensagem persistida, não 2). Todo dado de teste (cliente,
credencial, inbox, contato, conversa, mensagem, os 2 campos de App do tenant) removido depois —
`count(*)=0` confirmado em cada tabela tocada, GET final idêntico ao inicial. `npx tsc --noEmit`:
zero erros em qualquer arquivo tocado nesta rodada.

**Pendência real, achada no processo, fora de escopo desta correção:** `mensageria.inboxes.
tenant_id` é `NOT NULL`, mas a FK de `clientes`→`inboxes.client_id` (e talvez `tenant_id`) usa
`ON DELETE SET NULL` — apagar um cliente com inbox vinculado falha com violação de NOT NULL em
vez de cascatear ou impedir a exclusão com uma mensagem clara. Não corrigido aqui (não é do
escopo do WhatsApp Cloud API), registrado pra uma sessão futura se o usuário quiser arrumar.

**Próximo passo real, do lado do usuário (M1):** dentro do App Artemis9 já existente, adicionar
os produtos WhatsApp + Facebook Login for Business (se ainda não tiverem), criar 1 Configuração
na variação WhatsApp Embedded Signup com as permissões `whatsapp_business_messaging` +
`whatsapp_business_management`, e me passar o Config ID resultante — é o que falta pra eu
implementar e testar M2 (troca do código por token) e M3 (botão + popup no frontend) de verdade.
