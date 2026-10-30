# Plano — Código de rastreio manual pra campanha importada (não lançada pelo wizard)

> Status: **só planejamento, nada implementado.** Investigação feita lendo o código real
> (`resolveCtaRef`, `processInboundWhatsAppMessage`, `campaigns/import/route.ts`, migração de
> `CtaDestination`), não por memória — ver seção 2 pra onde cada achado veio.

## 1. O problema, reconfirmado

Campanha lançada **direto no Gerenciador de Anúncios da Meta** (ou importada depois via
"Importar Campanhas") nunca gera lead nem conversa no CRM/Mensageria — nem retroativamente,
nem daqui pra frente — porque o mecanismo de atribuição desta plataforma depende de um código
(`[ref:xxx]`) embutido na mensagem de WhatsApp que o lead manda, e esse código só existe quando
**nós** controlamos o link/mensagem do CTA do anúncio (o que só acontece quando a campanha é
lançada pelo nosso wizard). `POST /api/admin/campanhas/campaigns/import/route.ts` (confirmado
lendo o código agora) só cria uma linha local de `Campaign` pra sincronizar métrica — nenhum
`Ad`, nenhum `AdSet`, nenhum código de rastreio.

Este plano cobre o recurso já citado como pendência em
`docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md` §9.6: gerar um código, o admin cola manualmente no
próprio anúncio (dentro da Meta), e a partir daí leads/conversas passam a ser atribuídos
normalmente — só pra frente, nunca retroativo (limitação física: o código precisa estar na
mensagem no momento em que o lead manda, não dá pra "retaggear" uma conversa que já aconteceu).

## 2. Mecanismo técnico — 3 sistemas de ref, por que um novo e não reaproveitar os 2 existentes

Investigação em `src/lib/cta/service.ts` (`resolveCtaRef`) confirma que a plataforma já tem
**2 sistemas de atribuição**, ambos lidos pelo mesmo ponto único de resolução
(`processInboundWhatsAppMessage` → `resolveCtaRef(ref, tenantId)`, chamado sempre que uma
mensagem de WhatsApp recebida contém `[ref:xxx]`):

| Sistema | Como resolve | Granularidade | Serve pro nosso caso? |
|---|---|---|---|
| **A — `Ad.trackingId`** | JOIN `Ad`→`AdSet`→`Campaign` (schema Prisma, `prisma/schema.marketing.prisma`) | Campanha **e** anúncio individual | Não — exige `Ad`/`AdSet` reais no banco, e `Ad.adSetId` é relação obrigatória (`NOT NULL`, `onDelete: Cascade`). Criar um `AdSet`/`Ad` falso só pra carregar um `trackingId` poluiria o modelo (apareceria em seletores de AdSet, dashboards, etc., sem nenhum gasto/métrica real por trás). |
| **B — `CtaDestination.slug`** | Tabela `campanhasmarketingdigital."CtaDestination"` (migração `2026-06-28`, raw SQL) — pensada pra "Mecanismo B": uma URL nossa (`/l/{slug}`) que o anúncio aponta, e nossa própria página monta o link de WhatsApp com o ref embutido | **Nenhuma** — confirmado no código: o branch de `CtaDestination` em `resolveCtaRef` sempre retorna `campaignId: null`. Esse sistema nunca foi desenhado pra apontar pra uma campanha específica. | Não diretamente — daria pra estender (`ALTER TABLE CtaDestination ADD COLUMN campaign_id`), mas o mecanismo inteiro (`/l/{slug}`, `type`, `config.phoneNumber`) existe pra um cenário diferente: quando é **nossa página** que monta o link do WhatsApp. No caso que estamos resolvendo, o admin vai colar o código **direto na mensagem pré-preenchida configurada dentro do próprio anúncio da Meta** — não existe nenhuma página nossa no meio, o lead nunca visita `/l/{slug}`. Carregar toda a semântica de "destino redirecionável" pra um caso que nunca redireciona é confuso. |
| **C — novo, proposto aqui** | Ref gravado **direto na linha de `Campaign`** | Só campanha (não por anúncio individual — ver limitação na seção 5) | **Sim** — é exatamente o que falta: um código curto, sem overhead de tabela nova nem de modelo de "destino", que `resolveCtaRef` resolve numa 3ª tentativa. |

**Achado-chave que destrava tudo sem tocar no resto do pipeline:** `resolveCtaRef` é o
**único** ponto de resolução, chamado de um único lugar (`inboundProcessor.ts`). Tudo depois
dele (log de `CtaInteraction`/`CtaSubmission`, criação do lead via `POST /api/crm/leads` com
`campaign_id`/`utm_campaign`/`origem:'campanha_plataforma'`, vínculo do contato da Mensageria)
já consome só o objeto `ResolvedCtaRef` de volta — nunca sabe nem se importa de qual dos 3
sistemas o ref veio. **Zero mudança necessária em `inboundProcessor.ts`, `ingest.ts`,
`leadEvents.ts`, dashboards ou qualquer tela do CRM/Mensageria.**

## 3. Desenho técnico proposto

### 3.1 Schema — aditivo, 1 coluna

```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS manual_ref VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_manual_ref
  ON campanhasmarketingdigital."Campaign" (manual_ref)
  WHERE manual_ref IS NOT NULL;
```

`NULL` por padrão — só ganha valor quando o admin clica em "Gerar código de rastreio" pela
primeira vez. Índice único parcial (mesmo padrão já usado em `idx_cta_destination_slug`) evita
2 campanhas com o mesmo código por acidente.

**Decisão de escopo, explícita:** 1 ref por campanha (não por anúncio/AdSet dentro dela) —
alinhado com o fato de que o import também não rastreia Ad/AdSet individualmente. Se a
campanha importada tiver vários anúncios com mensagens diferentes, todos compartilham o mesmo
ref — a atribuição fica no nível de campanha, nunca de anúncio. Ver seção 5.

### 3.2 `resolveCtaRef` — 3º branch

```ts
// tentativa 3: ref gerado manualmente, direto numa Campaign (sem Ad/AdSet reais)
const campRows = await pool.query(
  `SELECT id, name, client_id FROM ${SCHEMA}."Campaign"
    WHERE manual_ref = $1 AND tenant_id = $2::uuid LIMIT 1`,
  [ref, tenantId],
)
if (campRows.rows[0]) {
  const r = campRows.rows[0]
  return {
    clientId: r.client_id ?? null,
    campaignId: r.id,
    adId: null,               // nunca há anúncio individual rastreado neste sistema
    destinationId: null,
    ctaType: 'WHATSAPP_MESSAGE',
    campaignName: r.name,
  }
}
```

Ordem de tentativa (A → B → C) é irrelevante pra correção (os 3 espaços de código nunca
colidem — `Ad.trackingId` é UUID, `CtaDestination.slug` segue o padrão de slug já usado em
`/admin/campanhas/mecanismos`, o novo `manual_ref` tem prefixo próprio, ver 3.3) — mantida A→B→C
por consistência com a ordem já existente.

### 3.3 Geração do código

Novo endpoint `POST /api/admin/campanhas/campaigns/[id]/manual-ref`:
- Idempotente — se a campanha já tem `manual_ref`, devolve o mesmo (nunca gera um novo sem
  pedido explícito).
- Formato: `camp-{6 chars alfanuméricos aleatórios}` (ex.: `camp-7f3a2c`) — curto o bastante
  pra colar numa mensagem de WhatsApp sem poluir visualmente, prefixo `camp-` deixa óbvio que é
  um código técnico nosso (reduz chance de um lead reproduzir isso digitando por acaso).
- `GET` (mesma rota) retorna o código atual (ou `null` se nunca gerado).
- `DELETE`/`POST ?regenerate=true` — invalida o código atual e gera um novo (mesmo padrão de
  confirmação dupla já usado em `WhatsAppWebhookSection.tsx` pro "Regenerar" do webhook secret
  — o código antigo simplesmente para de resolver, nenhuma mensagem já recebida é afetada).

### 3.4 UI — onde mora

Dentro de `/admin/campanhas/importar` (`src/app/admin/campanhas/importar/page.tsx`) — já é a
tela onde o admin vê as campanhas candidatas/já importadas, lugar natural pra essa ação
seguinte. Por linha de campanha já importada, novo botão/ícone "Código de rastreio":
- Se nunca gerado: botão "Gerar código de rastreio".
- Se já gerado: mostra o código (`[ref:camp-7f3a2c]`, já formatado pronto pra copiar) + botão
  copiar + botão "Regenerar" (com confirmação, mesma disciplina do resto do projeto).

Painel de instrução (expansível, sempre visível a 1 clique) explicando os 2 cenários reais de
onde colar, pra não presumir que o admin sabe onde fica esse campo dentro da Meta:
1. **Anúncio "Clique para o WhatsApp" nativo** (o mais comum) — dentro da Meta, ao criar/
   editar o anúncio, existe um campo de "mensagem pré-preenchida" que abre junto com o
   WhatsApp quando alguém clica. O admin cola o código **dentro desse texto** (em qualquer
   posição — início, fim, meio — o sistema reconhece de qualquer jeito).
2. **Anúncio com link de site/formulário** — fora do escopo deste código (esse caso já é
   coberto pelo mecanismo existente de Destino de CTA, `/admin/campanhas/mecanismos`).

**Aviso permanente, sempre visível junto do código** (reforça o que já foi esclarecido na
conversa que originou este plano): "Só funciona pra conversas **novas**, a partir do momento
em que você colar este código no anúncio. Conversas que já aconteceram antes de colar nunca
podem ser recuperadas."

### 3.5 Generalização de brinde (não é trabalho extra, é consequência do desenho)

O mecanismo não é específico de Meta — `[ref:xxx]` é lido de qualquer mensagem de WhatsApp
recebida, independente de qual rede de anúncio gerou o clique. Uma campanha importada do
Google Ads ou TikTok (quando os adapters reais desses existirem) se beneficia do mesmo recurso
sem nenhuma linha de código a mais — a tela de Importar já é multi-rede
(`?network=meta|google|tiktok`), só `fetchAccountCampaigns` ainda não está implementado pras
outras 2 (fora de escopo deste plano).

## 4. O que fica de fora, deliberadamente

- **Atribuição por anúncio/AdSet individual dentro da campanha importada** — todos os anúncios
  da mesma campanha compartilham 1 só código. Se o usuário precisar comparar performance de
  criativos diferentes dentro da mesma campanha importada, essa granularidade não existe nesta
  1ª versão (só existiria recriando o modelo completo Ad/AdSet, que é exatamente o que optamos
  por não fazer — ver seção 2, linha "Sistema A").
- **Qualquer automação do lado da Meta** — colar o código continua 100% manual, dentro da
  interface da própria Meta. Nenhuma API da Meta permite que terceiros editem o texto de um
  anúncio já publicado por outro canal.
- **Qualquer recuperação retroativa** — reconfirmado, não é uma limitação de implementação, é
  física: o código precisa estar na mensagem que o lead manda; mensagem já enviada antes do
  código existir nunca carrega a tag.
- **Mecanismo de CTA via link externo** (`CtaDestination`) continua intocado — este plano não
  mexe nele, só adiciona um 3º caminho de resolução paralelo.

## 5. Plano de testes (mesma disciplina do resto do projeto — real, não hipotético)

1. Campanha de teste importada (ou criada local só pra teste) → `POST .../manual-ref` → código
   gerado, formato confirmado, idempotência confirmada (2ª chamada devolve o mesmo).
2. `resolveCtaRef('camp-xxxxxx', tenantId)` chamado isoladamente → confirma `campaignId`/
   `campaignName` corretos, `adId: null`.
3. Simular webhook de entrada (Evolution ou Cloud API, mock) com mensagem real contendo
   `[ref:camp-xxxxxx]` em posição variada no texto (início/meio/fim) → confirmar via SQL:
   `CtaInteraction`/`CtaSubmission` com `campaign_id` certo, lead real criado em
   `leads_staging` com `campaign_id`/`utm_campaign`/`origem='campanha_plataforma'`, conversa
   real criada na Mensageria vinculada ao mesmo `lead_uuid`.
4. Mensagem SEM o ref (orgânica) → confirma que nada quebra, cai no caminho já existente
   (`whatsapp_organico`).
5. "Regenerar" → código antigo passa a não resolver mais (`resolveCtaRef` retorna `null` pra
   ele), novo código resolve normalmente.
6. 2 tenants diferentes nunca colidem no mesmo código (índice único é global, não por tenant —
   testar que o `WHERE tenant_id = $2` da query de resolução impede um tenant usar o ref de
   outro mesmo que adivinhasse o valor).
7. Todo dado de teste removido ao final, confirmado por `count(*)=0`.

## 6. Esforço estimado

Escopo pequeno e contido — 1 coluna + índice, 1 branch a mais numa função já existente, 1
endpoint novo (GET/POST/regenerate), 1 ação de UI numa tela que já existe. Não precisa de
fases separadas como o plano de WhatsApp Cloud API — dá pra implementar e testar numa única
rodada.

## 7. Decisões pendentes de confirmação do usuário, antes de implementar

1. **Formato do código** — `camp-{6 chars}` está bom, ou prefere outro padrão (mais curto, mais
   longo, sem prefixo)?
2. **Local da UI** — confirma `/admin/campanhas/importar` como o lugar certo, ou prefere em
   outro lugar (ex.: dentro da ficha de detalhe da campanha, se existir)?
3. **Regenerar exige confirmação dupla** (como o resto do projeto) — ok, ou prefere sem
   confirmação (já que o único efeito colateral é "código antigo para de funcionar", não perda
   de dado)?
