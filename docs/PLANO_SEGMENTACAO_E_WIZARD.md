# Plano: Segmentação por quebra + sugestão no wizard + Pixel obrigatório com CRM

Status: **proposta aprovada em direção (opção A), aguardando validação dos pontos marcados como "A VALIDAR"**. Nenhum código alterado.

## 1. Decisões já tomadas

- Exibição: **nova aba "Segmentação"** no dashboard `/admin/campanhas/dashboard`, ao lado de Visão Executiva, Análise, Criativos, Inteligência Profunda e Google Ads.
- Quebras: **idade, gênero, região e horário**.
- IA: **somente recomendação**. Nenhum ajuste automático de público ou orçamento.
- Wizard: **step opcional de sugestão de segmentação**, que o usuário pode aceitar ou recusar campo a campo.
- Wizard: tornar obrigatório o **Meta Pixel ID** quando houver interação com o CRM.

## 2. Camada de dados

### 2.1 Coleta (`src/lib/marketing/networks/meta/metaAdsAdapter.ts`)
- Acrescentar um método `fetchBreakdownInsights(externalCampaignId, { breakdown, dateRange })` que chama `/insights` com `breakdowns` e `time_increment=1`.
- Quebras previstas: `age`, `gender`, `region`, e horário (`hourly_stats_aggregated_by_advertiser_time_zone`).
- **Resultado da checagem na documentação (fontes secundárias, confirmar no site oficial):**
  - Horário **não combina** com idade nem gênero (erro `(#100) ... combination ... is invalid`). Portanto, são **três chamadas separadas**: (1) idade + gênero juntos; (2) região; (3) horário, com `hourly_stats_aggregated_by_advertiser_time_zone`.
  - Região e horário aparecem como restritas para métricas de ação fora da Meta.
  - Horário pode não estar disponível em algumas contas a partir de 6/8/2026, segundo a página oficial de quebras. O job deve tratar isso como "dado indisponível para a conta", sem interromper as outras quebras.
  - Retenção de 13 meses para quebras: citada apenas em artigos de terceiros, **não confirmada**.
- **Antes de implementar:** testar cada combinação com uma chamada real numa conta de teste, para confirmar o erro de combinação e a disponibilidade do horário.
- A coleta roda **separada** do sync diário, em um job próprio (cron diário, horário de baixo tráfego), para não consumir o limite de requisições da Meta.

### 2.2 Armazenamento (`prisma/migration-2026-XX-insight-breakdown.sql`)
Tabela nova, sem alterar `Insight`:

```
campanhasmarketingdigital."InsightBreakdown"
  id              uuid pk
  tenant_id       uuid not null
  campaign_id     text not null  -> Campaign.id
  date            date not null
  breakdown_type  varchar(20) not null   -- 'age' | 'gender' | 'region' | 'hour'
  breakdown_key   varchar(100) not null  -- ex.: '25-34', 'female', 'Pernambuco', '14'
  impressions     int, clicks int, spend numeric(12,2), reach int
  leads           int                     -- via leadEvents.ts (fonte única de lead)
  created_at      timestamp default now()
  unique (campaign_id, date, breakdown_type, breakdown_key)
```

- **Leads por quebra** devem vir de `leadEvents.ts`, nunca de uma contagem nova (regra já adotada no projeto para não divergir entre telas).
- Índice em `(tenant_id, breakdown_type, date)`.

### 2.3 Registro no catálogo de segurança
- Cada tabela nova com `tenant_id` precisa de filtro por tenant em toda query.

## 3. Aba "Segmentação" no dashboard

Arquivo novo: `src/components/marketing/dashboard/SegmentationView.tsx`, plugado em `dashboard/page.tsx` como mais uma aba, seguindo o padrão de `GoogleAdsView`.

Conteúdo sugerido (validar com o usuário):
- **Mapa de calor idade × gênero** (CPL por célula, cor pelo benchmark do segmento).
- **Barras de CPL por região** (top 10).
- **Heatmap dia da semana × hora** (CPL e leads).
- **Cartão "melhor faixa"**: a faixa etária/região de menor CPL com volume mínimo de leads.
- Respeita os filtros já existentes (cliente, segmento, período, campanha).
- Estado vazio honesto: se não houver dado de quebra, mostrar a mensagem e a data da última coleta, nunca zeros.

Endpoint: `GET /api/admin/campanhas/dashboard/segmentation` (tenant escopado, mesmo padrão de `dashboard/funnel`).

## 4. Recomendação pela IA (`src/lib/marketing/services/aiInsights.ts`)

- Nova regra `SEGMENT_RECOMMENDATION`, tipo `OPTIMIZE`, **nunca** tipo que dispara ação automática.
- Compara o CPL de cada faixa/região com o benchmark do segmento (`benchmarkResolver`, cascata já existente).
- Exige volume mínimo de leads por célula (usar `min_leads_scale` do segmento) para não recomendar com amostra pequena.
- Texto de recomendação cita o valor real: "a faixa 35-44 tem CPL R$ X, 38% abaixo da média da campanha".
- Entra no `textSummary` consumido pelo briefing estratégico, no mesmo formato de `angleInsightsService`.

## 5. Sugestão no wizard (`src/components/marketing/CampaignWizard.tsx`)

### 5.1 Novo step opcional "Sugestão de segmentação"
- Posição: logo após o step de Público (step 3) e antes do Orçamento (step 4).
- Só aparece quando existe dado de quebra suficiente para o segmento/cliente (endpoint `GET /api/admin/campanhas/segment-suggestion`). Sem dado, o step é pulado sem bloquear o fluxo.
- Mostra, por campo, uma sugestão com a justificativa e o dado de origem:
  - Faixa etária: sugerida X–Y, com o CPL que a sustenta.
  - Gênero: sugerido, se houver diferença real.
  - Regiões: lista sugerida.
  - Horário: dias e faixas sugeridos.
- Cada campo tem **Aceitar** ou **Manter o meu**. Aceitar preenche o `form` (`ageMin`, `ageMax`, `genders`, `geoLocations`, `scheduleDays`, `scheduleStartHour`, `scheduleEndHour`) e marca o campo com `AutoChip` ("sugerido"). Manter não altera nada.
- Recusar ou ignorar a sugestão nunca bloqueia o avanço.

### 5.2 Meta Pixel ID obrigatório quando há interação com o CRM (**A VALIDAR**)
- **Premissa:** "interação com o CRM" = o tenant tem o módulo de CRM contratado (`temaOptions.crmContracted`) **ou** o destino escolhido é um destino hospedado (`DEST:`), cujos leads entram no CRM.
- Quando a premissa valer, o Pixel ID passa a ser erro de validação (`validationErrors`, step 3), com a mensagem: "Sem Pixel, as conversões não voltam para o CRM e a atribuição de receita fica incompleta."
- Quando não valer, mantém o aviso amarelo atual.
- **Pergunta para você:** é esse o critério de "interação com o CRM", ou você quis dizer outra coisa? Por exemplo, obrigar o Pixel só quando o destino for um formulário hospedado, e não para WhatsApp.

## 6. Ordem de execução sugerida

1. Validar a documentação da Meta sobre quebras (item 2.1 "A VALIDAR") antes de qualquer código de coleta.
2. Migração + adapter de coleta + job, com teste em campanha de teste (verba mínima).
3. Endpoint e aba "Segmentação".
4. Regra de recomendação na IA.
5. Step de sugestão no wizard.
6. Validação obrigatória do Pixel (depois de confirmar o critério do item 5.2).

Cada etapa é testável sozinha e não quebra as anteriores.

## 7. Riscos

- **Limite de requisições da Meta:** quebras multiplicam chamadas. Mitigação: job separado, janela de baixo tráfego, paginação e retentativa com backoff.
- **Amostra pequena:** recomendações erradas com pouco dado. Mitigação: volume mínimo por célula, e estado vazio honesto.
- **Migração com dados históricos:** a coleta só começa a partir da data de implantação. Dados passados de quebra não existem e não serão recuperados sem nova leva de chamadas, o que precisa ser decidido separadamente.
- **Pixel obrigatório** pode bloquear lançamentos de clientes que ainda não configuraram o Pixel. Mitigação: critério do item 5.2 bem definido e mensagem que aponta onde configurar.
