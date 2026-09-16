# PLANO — Vigilância de Pendência de Atendimento ("de quem é a bola")

> **Status:** aprovado em 2026-08-08, não iniciado.
> **Origem:** pergunta do usuário sobre o alcance real do F1 (`speed_to_lead`) — "e se o 3º ou
> 4º contato ficar sem resposta? E se o atendente adoecer ou ganhar na loteria?".
> **Missão declarada que molda o desenho:** a plataforma automatiza call centers com grande
> número de atendentes. **Não pode haver espera por decisão manual em nenhum degrau interno.**
> O 1º contato precisa ser célere; do 2º em diante o atendimento a lead parado tem que ser
> **totalmente sistemático** — seja a parada causada pelo cliente ou, principalmente, pelo
> atendente.

---

## 1. O problema real (investigado, não suposto)

A auditoria de 2026-08-08 encontrou **três buracos independentes**, todos com a mesma raiz:
*todo prazo que existe na plataforma é prazo de PRIMEIRO toque.* Nenhum mecanismo pergunta
"a bola está do nosso lado agora?".

### Buraco A — o lead que nunca foi atribuído a ninguém

`DistributionEngine.findBestCandidate()` pode não achar candidato elegível. Nesse caso
`leads_staging.corretor_atribuido_id` fica `NULL` — e o transbordo
(`src/app/api/cron/transbordo/route.ts`, BLOCO 2) exige exatamente o contrário:

```sql
WHERE atribuicao_expira_em < NOW() AND corretor_atribuido_id IS NOT NULL
```

Lead sem dono **nunca é reprocessado**. E o F1 alerta uma única vez e nunca mais
(`NOT EXISTS crm_agent_actions ... agent_key='speed_to_lead'`). Ninguém no sistema inteiro
volta a olhar pra esse lead.

**Evidência no banco de dev (2026-08-08):** 5 leads com telefone válido, sem dono, sem nenhuma
atividade — o mais antigo parado há **107 dias**. (Ressalva honesta: é banco de desenvolvimento
e parte desses registros é resíduo de sessões antigas de teste; o que importa aqui é que
**nenhum mecanismo da plataforma teria levantado a mão** sobre eles, independente de serem
clientes genuínos ou não.)

### Buraco B — o lead atribuído que nasce isento de prazo

`src/app/api/crm/leads/route.ts:272`:

```ts
routed.motivo_atribuicao === 'dono_ativo' || routed.is_plantonista ? null : routed.expira_em
```

Atribuição para o **dono do ativo** ou para um **plantonista** grava
`atribuicao_expira_em = NULL` → o lead fica **permanentemente fora da rede de transbordo**.

No segmento Imobiliário, `owner_of_asset` é a estratégia de **prioridade 1** — ou seja, o
caminho de atribuição mais comum de todos é justamente o que sai da rede de segurança. É
literalmente o cenário "o corretor dono da carteira adoeceu": todo lead dos imóveis dele
apodrece em silêncio, para sempre.

### Buraco C — os três relógios existentes são todos de primeiro toque

| mecanismo | condição de disparo | para de olhar quando |
|---|---|---|
| F1 `speed_to_lead` | `NOT EXISTS atividades_lead` | existe a 1ª atividade — **pra sempre** |
| Mensageria `scanAndAlertBreaches()` | `c.first_response_at IS NULL` | existe a 1ª resposta — **pra sempre** |
| Transbordo BLOCO 2 | `atribuicao_expira_em < NOW()` | é one-shot: **nenhum endpoint renova** |

### Buraco D — o F4 despacha a ação errada (achado pela lente nova)

`reactivationAgent.findCandidates()` mede `MAX(atividades_lead.created_at)` **sem nenhuma
noção de direção**. Consequência real: um lead em que **o cliente escreveu e nós nunca
respondemos** vira candidato a "mensagem de reativação" — a plataforma mandaria um
"sentimos sua falta" para alguém que está esperando resposta nossa. A ação certa nesse caso é
escalar internamente, nunca cutucar o cliente.

---

## 2. O conceito unificador: de quem é a bola

Em vez de um 6º agente ao lado dos outros, **um único relógio por lead** que absorve os três
mecanismos e desambigua o F4.

Três estados mutuamente exclusivos:

| estado | significado | ação |
|---|---|---|
| **bola com a gente** | o cliente falou (ou o lead chegou) e ninguém devolveu | escada de escalonamento (§4) |
| **bola com o cliente** | nós respondemos, aguardando ele | F4 — reativação |
| **encerrado** | etapa terminal (`is_ganho` / `is_perda`) | nenhuma |

O terceiro estado **já existe** desde 2026-08-07 (hardening Ganho/Perda) e compõe
naturalmente: um lead ganho ou perdido sai de qualquer vigilância, sem hardcode de nome.

Uma pergunta só — *há quanto tempo a bola está parada de um dos lados?* — cobre o 1º contato
(F1 vira o caso particular de ordinal 1), o 3º, o 40º, **e** o lead que nunca teve dono.

### 2.1 A mudança arquitetural central: idempotência por episódio, não por lead

É aqui que o novo motor difere de tudo que existe hoje:

- **F1** é idempotente **por lead, para sempre** (`NOT EXISTS crm_agent_actions`).
- **F2** já é melhor: idempotente **por ciclo de etapa**.
- **Motor novo:** idempotente **por degrau, por episódio de pendência**.

Um *episódio* começa quando a bola vem pra nós e termina quando devolvemos. E o mais elegante:
**a chave do episódio é o próprio timestamp** — nenhuma tabela nova é necessária.

```
degrau N já disparou neste episódio  ⟺  EXISTS crm_agent_actions
    WHERE lead_uuid = X
      AND agent_key = 'pendencia_atendimento'
      AND (payload->>'degrau')::int = N
      AND created_at >= bola_desde
```

Quando a bola é devolvida e volta depois, `bola_desde` avança → todos os degraus rearmam
sozinhos. É o que torna o comportamento "totalmente sistemático do 2º toque em diante".

---

## 3. Fontes de sinal por módulo contratado

Mesmo padrão de adapter já consagrado no projeto (`LEAD_SOURCE_BY_NETWORK` em
`src/lib/marketing/services/networkLeadSource.ts`): o motor é um só; cada fonte se registra
conforme o módulo estiver contratado. **Nenhum tenant é obrigado a comprar módulo para ter
cobertura**, e ninguém fica com cobertura zero.

| Fonte | Exige módulo | "bola veio pra nós" | "bola devolvida" |
|---|---|---|---|
| Captação | **nenhum** (base) | `leads_staging.created_at` | 1ª atividade de saída ou msg outbound |
| Mensageria | Mensageria | última `mensageria.messages` é `direction='inbound'` | qualquer `outbound` posterior |
| Atividades CRM | CRM | atividade com `tipos_atividade.is_entrada = true` | atividade com `is_entrada = false` |

Elo Mensageria↔CRM confirmado: `mensageria.contacts.lead_uuid` existe e é indexado
(`idx_contacts_lead_uuid`).

- **Só Campanhas:** sem conversa e sem funil — fora de escopo por natureza (não há atendimento
  a vigiar, só clique).
- **Só CRM:** sinal mais grosso, mas real (depende do tenant marcar as atividades de entrada).
- **Só Mensageria:** sinal rico e automático (`direction` já existe no schema desde M0).
- **Combinados:** união das fontes, o evento mais recente vence.

### 3.1 `tipos_atividade.is_entrada` — o mesmo remédio do `is_ganho`

`tipos_atividade` hoje tem só `nome, icone, cor, ordem, ativo` — nenhuma noção de direção. É
**exatamente a mesma doença** do `kanban_colunas.nome` curada em 2026-08-07: semântica
implícita, impossível de acionar com segurança. Mesmo remédio: um booleano explícito no
catálogo, editável pelo tenant na tela que já existe (`/crm/config/atividades`), com backfill
conservador (tudo `false` = saída, o comportamento atual) e sem inferir nada do nome.

---

## 4. A escada de escalonamento — 100% automática

Decisão do usuário (2026-08-08), sem ambiguidade: **nenhum degrau interno passa por fila de
aprovação.** A missão é operar call centers grandes; esperar decisão humana para religar o
atendimento derrota o propósito.

| Degrau | Quando | Ação | Taxonomia |
|---|---|---|---|
| 1 | `N₁` sem devolver a bola | cutuca o responsável | `DEFENSIVE`, automático |
| 2 | `N₂` | escala pro gestor / líder do time | `DEFENSIVE`, automático |
| 3 | `N₃` | **reatribui** via `DistributionEngine`, excluindo o ausente | `DEFENSIVE`, automático |
| 4 | sem candidato elegível | entra na **fila de resgate** (visível) + retentativa a cada scan | `DEFENSIVE`, automático |

Todos os `N` são parâmetros por segmento com override por tenant — mesmo mecanismo
(`crm_agentes_config_segmento` / `_tenant` + `paramHints`) já usado pelos 5 agentes.

O degrau 3 **já está construído** (`DistributionEngine` + catálogo de estratégias por segmento);
o que falta é ser disparado por este gatilho em vez de só pelo prazo de aceite inicial.

O degrau 4 é a correção do Buraco A: hoje o lead sem candidato simplesmente some. Passa a ser
uma fila explícita, retentada a cada varredura — nunca silêncio.

### 4.1 Indisponibilidade: adoeceu ≠ relaxou

Decisão do usuário: sim, precisa existir. `users` hoje tem `ativo` (conta) e `is_plantonista`,
mas **nenhum estado de ausência temporária** — então a reatribuição de hoje entregaria o lead
alegremente a outra pessoa ausente, e a gamificação puniria quem está de atestado.

- `users.indisponivel_ate timestamptz` + `users.indisponivel_motivo varchar` (novo).
- Efeito 1: quem está indisponível **sai da fila de novos leads** (todas as estratégias de
  distribuição passam a filtrar).
- Efeito 2: a reatribuição por pendência **não chama `GamificationService.penalizeSLA()`**
  quando a origem está indisponível — perde o lead, não leva a punição.
- Efeito 3: pendência em lead de pessoa indisponível **pula direto para o degrau 3** (não faz
  sentido cutucar quem está de licença).

### 4.2 Anti-flood: digest por responsável, não 1:1

Pendência já registrada no `CHECKPOINT.md` para F1/F2 ("notificam 1:1, um WhatsApp por lead").
Em escala de call center isso é inutilizável. Este motor **nasce com digest**: uma mensagem por
responsável por rodada, agrupando os leads pendentes dele, com o degrau de cada um. O
`crm_agent_actions` continua sendo gravado por lead (auditoria granular); só a notificação é
agrupada.

---

## 5. Materialização — decisão de escala

Calcular "de quem é a bola" do zero a cada varredura (join sobre `messages` + `atividades_lead`
para toda a base) não escala para call center. Estratégia adotada:

1. **Caminho rápido (materializado na escrita):** `leads_staging.bola_com` + `bola_desde`,
   atualizados por um helper único chamado dos pontos de escrita conhecidos
   (`ingest.ts`, `POST /api/crm/atividades`, `POST /api/crm/leads`, `POST /api/crm/kanban/move`).
2. **Rede de segurança (reconciliação):** job noturno que recomputa a partir das fontes reais e
   corrige divergências. Correção nunca depende de eu ter lembrado de todo call site — o mesmo
   princípio que fez o `leadEvents.ts` virar fonte única.

Com isso a varredura de 5 em 5 minutos vira uma query indexada trivial
(`WHERE bola_desde < now() - interval ...`), que escala a milhões de linhas.

**Deliberadamente NÃO por trigger de banco:** o projeto já teve dois incidentes reais com
triggers (`trg_log_kanban_ciclos` não preenchendo `tenant_id`; crash com `coluna_id NULL`).
Helper de aplicação + reconciliação é mais depurável e igualmente robusto.

---

## 6. Faseamento

| Fase | Escopo | Depende de |
|---|---|---|
| **G0** ✅ | Fundação: `bola_com`/`bola_desde` em `leads_staging` (mutuamente exclusivos por CHECK), `tipos_atividade.is_entrada`, `users.indisponivel_ate`, helper de escrita + reconciliação | — |
| **G1** ✅ | Motor: agente `pendencia_atendimento` (degraus 1-2), idempotência por episódio, digest | G0 |
| **G2** ✅ | Degrau 3: reatribuição automática + respeito à indisponibilidade + não punir ausente | G1 |
| **G3** ✅ | Degrau 4: fila de resgate + retentativa de atribuição (fecha Buraco A). **Buraco B já fechado por G1/G2 — ver §6.5** | G2 |
| **G4** ✅ | UI: config dos degraus (Master + tenant), toggle de indisponibilidade, fila de resgate | G1-G3 |
| **G5** ✅ | Absorção: F1 (`speed_to_lead`) vira o ordinal 1 deste motor e é aposentado (feito em G1); F4 passa a ler `bola_com='cliente'` (fecha Buraco D) | G1 |

### 6.1 Por que absorver o F1 em vez de coexistir

Dois agentes onde um é subconjunto estrito do outro geram alerta duplicado e configuração
confusa. O motor novo mantém **dois limiares no mesmo agente** — 1º contato em minutos
(velocidade de resposta é de fato um número diferente e mais agressivo), continuidade em horas.

**Janela que fecha:** nenhum dos 5 agentes está ativado em produção hoje (registrado no
`CHECKPOINT.md`). Reestruturar agora não migra configuração de nenhum cliente; depois de ligado,
vira migração de dado de tenant.

---

### 6.2 G0 — concluída e testada em 2026-08-08

**Entregue:** `prisma/migration-2026-08-08-pendencia-atendimento-g0.sql` (aplicada, idempotente)
· `src/lib/crm/pendencia/pendencyState.ts` (regra canônica em SQL, `touchPendency` /
`touchPendencyByContact` / `touchPendencyByConversation` / `reconcilePendency`) ·
`POST /api/cron/crm/pendencia-reconciliar` (03:30, registrado no scheduler) · ganchos de escrita
em `ingest.ts`, `POST/PATCH/DELETE /api/crm/atividades`, `POST /api/crm/leads`,
`POST /api/crm/kanban/move`, `POST /api/admin/mensageria/conversations/[id]/messages` ·
`is_entrada` no CRUD do catálogo (API + checkbox + badge em `/crm/config/atividades`).

**3 achados reais que só apareceram testando o caminho de verdade** (nenhum deles teria sido
pego por leitura de código — os três são registrados aqui porque a mesma classe de erro pode
voltar em G1-G5):

1. **`ingest.ts` NÃO é o "ponto único de ingestão" que seu próprio docblock declara.**
   `POST /api/admin/mensageria/conversations/[id]/messages` — o endpoint que o atendente usa
   para responder, ou seja, o evento "bola devolvida" mais importante do sistema inteiro —
   grava direto em `mensageria.messages` com SQL próprio, sem passar por `ingestMessage()`.
   Sem o gancho dedicado (`touchPendencyByConversation`), o motor escalaria um lead que o
   atendente acabou de responder: o pior falso positivo possível em escala de call center.

2. **Nota interna não pode devolver a bola.** A 1ª versão da regra contava qualquer `outbound`.
   Um atendente escrevendo uma anotação para si mesmo silenciaria o alarme sem ter atendido
   ninguém. Corrigido com `is_private = false`, espelhando a distinção que o próprio endpoint
   já fazia para `first_response_at`.

3. **Re-manifestação de lead existente não movia nada.** Quando um lead JÁ existente escreve de
   novo (formulário/CTA/webhook), o Match Engine só enriquece a linha antiga — `leads_staging`
   não ganha linha nova nem move `created_at`. A regra original classificaria como "bola com o
   cliente" alguém que acabou de escrever. Resolvido usando `marketing_eventos` como fonte
   (grava 1 linha por TOQUE — verificado: 24 eventos para 21 leads), sem coluna nova.

**Testado ao vivo, ponta a ponta, via APIs reais** (tenant Marketing Digital): captação sem
módulo nenhum → `nos` · mensagem inbound → `nos` com `bola_desde` avançando da captação para a
mensagem · resposta real do atendente pela API real, **sem reconciliação** → `cliente` (prova o
gancho de escrita) · nota interna → **não** devolve · cliente escreve de novo → volta pra `nos`
(o 2º-toque-em-diante que nenhum dos três relógios antigos cobria) · atividade de saída →
`cliente` · atividade marcada como entrada → `nos` · mover para etapa `is_ganho` → pendência
zerada · voltar da etapa terminal → volta a ser vigiado · backfill de 23 leads reais, 2ª
execução `corrigidos: 0` (idempotente) · round-trip de `is_entrada` pela API + badge conferido
no DOM real (aparece nos 2 tipos marcados, em nenhum dos outros 8). Todo dado de teste removido,
`count(*)=0` confirmado em 7 tabelas, marcação em tipo real revertida. `npx tsc --noEmit`: 0 erros.

**Bug de sintaxe cometido e corrigido no processo, registrado como lição:** usei crases dentro
de um comentário SQL que vive dentro de um template literal — a crase fechou a string e o módulo
parou de compilar. Como todos os ganchos são best-effort (`.catch()`), o erro foi engolido em
silêncio e dois testes passaram "verdes" sem ter executado nada. Só apareceu quando um endpoint
devolveu o HTML de erro do Next em vez de JSON. Lição: `.catch()` em gancho best-effort esconde
falha de import — ao testar, exigir a mudança de ESTADO observável, nunca só a ausência de erro.

### 6.3 G1 — concluída e testada em 2026-08-08

**Entregue:** `prisma/migration-2026-08-08-pendencia-atendimento-g1.sql` (aplicada) —
`crm_agent_actions.payload jsonb` (guarda o degrau, chave da idempotência por episódio) +
índice `(lead_uuid, agent_key, created_at DESC)` + remoção da config órfã de `speed_to_lead` ·
`src/lib/crm/agents/pendenciaAtendimentoAgent.ts` (degraus 1-2, limiar distinto entre 1º
contato e continuidade, pulo direto pro escalonamento quando o responsável está indisponível) ·
`runner.ts` refatorado: `recordAction()` separado de `notifyForResult()`, novo `sendDigests()` ·
`CrmAgent.digest` / `CrmAgentResult.payload|responsavelNome|leadNome` em `types.ts` ·
`speedToLeadAgent.ts` **removido do disco e do catálogo** · bloco de Ajuda do
`SegmentAgentesModal` reescrito para o agente novo (e escrito pela 1ª vez para
`score_recalibration`, que caía no fallback genérico desde F5).

**Mudança na página de Segmentos:** nenhuma na mecânica — o modal é genérico desde F0 e deriva
de `CRM_AGENT_CATALOG`, então o agente novo aparece sozinho com seus `paramHints` e o antigo
some sozinho. A única edição foi no painel de Ajuda, que tem um bloco `if (agent.key === …)`
por agente.

**Testado ao vivo, com dado real** (tenant Marketing Digital, agente ativado só por override de
tenant, canais Evolution/Slack reais temporariamente nulados antes de qualquer varredura e
restaurados ao valor exato depois — mesmo cuidado já documentado em F2/F4):

| Cenário | Esperado | Resultado |
|---|---|---|
| 1º contato parado 45min (limiar 30) | degrau 1 | ✅ |
| 1º contato parado 5h (≥ 30×3) | degrau 2 direto | ✅ |
| Captado há 2min | nada | ✅ não disparou |
| Responsável indisponível, 45min | pula pro degrau 2 | ✅ |
| 2ª varredura imediata | nenhum alerta repetido | ✅ `fired: 0` |
| Lead do degrau 1 cruza o limiar de escalonamento | degrau 2, sem repetir o 1 | ✅ |
| Bola devolvida (atividade de saída) | sai da vigilância | ✅ |
| Cliente volta e passam 45min | **não** dispara (limiar agora é continuidade, 240min) | ✅ |
| Cliente volta e passam 5h | **degrau 1 de novo**, `ehPrimeiroContato: false` | ✅ rearme |
| 23 disparos numa rodada | 1 notificação agrupada | ✅ `digests: 1` |

**O que a 1ª varredura revelou, e que valida a frente inteira:** além dos 4 leads de teste, o
motor capturou **19 leads reais/residuais parados entre 231h e 839h** — leads sobre os quais
*nenhum mecanismo da plataforma jamais teria levantado a mão*. São exatamente os Buracos A e C
do §1, agora visíveis.

**Armadilha de teste registrada (2ª vez que aparece nesta base — a 1ª foi em F2):** ao backdatar
`bola_desde` para o passado sem mover também as ações do episódio anterior, cria-se uma linha do
tempo impossível — a ação antiga cai dentro da janela do episódio novo (`created_at >=
bola_desde`) e a idempotência parece quebrada. Em produção isso não acontece: o episódio novo
sempre começa em `now()`, necessariamente depois de qualquer ação anterior. Ao testar rearme,
backdatar SEMPRE o conjunto inteiro de forma coerente.

**Limpeza:** todos os leads e ações de teste removidos, indisponibilidade revertida, config do
agente removida, canais de notificação restaurados ao valor exato (confirmado por SQL),
reconciliação final `corrigidos: 0`. Aproveitado para remover também os 15 leads
`TESTE PAGINACAO` — resíduo antigo registrado como pendência minha desde 2026-07-29.
`npx tsc --noEmit`: 0 erros.

### 6.4 G2 — concluída e testada em 2026-08-08

O degrau que transforma o motor de *alarme* em *correção*. Sem migração nova — reaproveita
integralmente o `DistributionEngine` e o catálogo de estratégias por segmento que já existiam.

**Entregue:** filtro de indisponibilidade nas **4 estratégias de distribuição**
(`ownerOfAsset`, `geoArea`, `roundRobin`, `plantonistaFallback`) — cobre de uma vez a captação
inicial, o transbordo e a reatribuição nova, não só o caminho deste agente ·
`CrmAgent.execute?()` (contrato novo: o agente declara seu efeito colateral real, o runner
chama sem saber o que é) · `src/lib/crm/pendencia/reassignExecutor.ts` · degrau 3 no agente com
`fator_reatribuicao` (default 6) · digest mostra o que a máquina corrigiu sozinha (`↳ …`).

**Guarda-corpo deliberado:** `limiarReatribuicao = max(limiarBase × fator, limiarEscalonamento + 1)`
— reatribuir antes de ter avisado alguém seria tirar o lead pelas costas do responsável, então
o degrau 3 nunca acontece antes do 2, mesmo que o Master configure um fator menor por engano.

**Testado ao vivo, com dado real** (canais Evolution/Slack reais nulados antes e restaurados
depois):

| Cenário | Resultado |
|---|---|
| Lead parado 200min com responsável **de atestado** | ✅ reatribuído: Fernanda → Roberto |
| Penalidade de SLA na pessoa ausente | ✅ **nunca chamada** — ela não tem sequer linha em `corretor_scores` |
| Indisponível recebe lead novo? | ✅ não — Fernanda não recebeu nenhum dos 6 reatribuídos |
| Histórico de atribuição | ✅ 2 linhas (original + nova) |
| **Todos** os atendentes indisponíveis | ✅ não crasha; relata "sem atendente disponível" e o lead segue pendente |

**O que o teste revelou sobre a base real, e que explica o Buraco A concretamente:** os 2
usuários do tenant não têm linha em `user_role_assignments`, e as 4 estratégias filtram por ele
— por isso o `DistributionEngine` nunca achou candidato e 21 leads ficaram órfãos. Não é bug do
motor, é configuração de acesso incompleta daquele tenant; mas mostra que o degrau 4 (fila de
resgate visível, G3) é indispensável, porque hoje esse estado é silencioso.

Ao rodar o teste com os papéis corrigidos, **os 5 leads órfãos reais (sem dono há 34–107 dias)
ganharam responsável automaticamente** — o Buraco A sendo corrigido de fato, não só alertado.
Todos foram revertidos ao estado original (`corretor_atribuido_id NULL`) na limpeza.

**Limpeza:** leads e ações de teste removidos; os 5 leads reais revertidos ao estado original;
histórico de atribuição, `user_role_assignments` e `corretor_scores` criados no teste removidos
(os três tinham 0 linhas antes, verificado); indisponibilidade revertida; canais restaurados ao
valor exato. Reconciliação final `corrigidos: 0`, `npx tsc --noEmit`: 0 erros.

### 6.5 G3 — concluída e testada em 2026-08-08

**Buraco B não precisou de conserto — e "consertá-lo" teria sido o erro.** O plano original
previa mexer em `atribuicao_expira_em = NULL` para dono do ativo/plantonista. Investigando antes
de agir: aquele campo significa *prazo de ACEITE*, e um lead auto-aceito corretamente não tem
prazo de aceite pendente — dar um valor a ele faria o transbordo reatribuir um lead que FOI
aceito. O motor de pendência não referencia esse campo em lugar nenhum (é dirigido só por
`bola_com`/`bola_desde`), então já cobre o caso por um mecanismo melhor. **Confirmado ao vivo:**
um lead criado com `atribuicao_expira_em` NULL atribuído a um "dono do ativo" disparou a escada
normalmente até a reatribuição.

**Entregue:** `src/lib/crm/pendencia/rescueQueue.ts` (`runRescueRetries()` + `getRescueQueue()`) ·
retentativa plugada em `POST /api/cron/crm/agentes-scan`, rodando **antes** da varredura (um lead
que acabou de ganhar dono já é avaliado com o dono certo) · degrau 4 no agente ·
`GET /api/crm/pendencia/resgate` (a UI é G4) · marca 🆘 no digest, distinta do 🟢 de
"a máquina corrigiu sozinha".

**Duas cadências, de propósito:** RETENTAR atribuição roda a cada varredura (o lead precisa sair
da fila no minuto em que alguém ficar disponível); ALERTAR sobre a fila é uma vez por episódio.
Por isso a retentativa é silenciosa e não grava `crm_agent_actions`.

**Dois achados reais que só apareceram testando, ambos corrigidos:**

1. **Escada esgotada era herdada pelo novo responsável.** Após uma reatribuição, todos os
   degraus daquele episódio já haviam disparado — o novo dono ficava sem relógio nenhum, e se
   ele também ignorasse o lead, nada mais aconteceria. Corrigido movendo o início da janela de
   idempotência para `GREATEST(bola_desde, última reatribuição)`: cada responsável recebe a
   escada inteira.
2. **O lead quicaria entre atendentes.** Com o fix acima, um lead reatribuído após 400min
   disparava o degrau 3 no instante seguinte (porque `minutosParado` seguia enorme) e seria
   repassado de novo, e de novo — cada pessoa perdendo o lead antes de ter tido qualquer chance
   real. Corrigido separando **dois relógios**: `minutosParado` (espera REAL do cliente, desde
   `bola_desde`) governa o que as mensagens mostram; `minutosNaJanela` (tempo sob o responsável
   atual) governa os degraus. `bola_desde` nunca é resetado — resetá-lo faria a plataforma
   subestimar quanto tempo a pessoa está esperando de fato.

**Testado ao vivo:** órfão sem ninguém → degrau 3 (reatribuição falha) → degrau 4 na varredura
seguinte · lead do Buraco B → escada normal, sem degrau 4 (tem dono) · fila via API real →
`total: 7, semResponsavel: 6` · **um atendente fica elegível → `resgate: {examinados: 8,
atribuidos: 6}`** e `semResponsavel` cai a 0 sozinho (Buraco A fechado) · leads recém-reatribuídos
**não disparam** na varredura seguinte (relógio do novo dono zerado, sem quicar).

**Limpeza:** leads e ações de teste removidos; os 5 leads reais revertidos a
`corretor_atribuido_id NULL`; histórico de atribuição, role assignment e scores criados no teste
removidos; canais restaurados ao valor exato. Reconciliação final `corrigidos: 0`,
`npx tsc --noEmit`: 0 erros.

### 6.6 G4 — concluída e testada em 2026-08-08

**Config dos degraus: nada novo foi preciso.** Os 4 parâmetros do agente já são editáveis pelo
editor genérico que existe desde F0 — `/admin/master/segments` → "Agentes de Aceleração"
(Master, padrão do segmento) e `/crm/config/agentes` (override do tenant), ambos derivando de
`paramHints`. A UI nova de G4 é só o que ainda não tinha superfície nenhuma.

**Entregue:**
- `PATCH /api/admin/usuarios/[id]/disponibilidade` — endpoint dedicado, não um campo no
  formulário de edição: marcar alguém de atestado é ação operacional do dia a dia (2 cliques do
  supervisor), não edição de cadastro. Valida data futura e confirma que o usuário pertence ao
  tenant de quem pede (sem isso, um admin marcaria ausente um atendente de outra empresa).
- `/admin/usuarios` — badge "AUSENTE" + botão "Ausência"/"Liberar" por linha, e um modal que
  **exige data de retorno** em vez de um booleano: toggle sem prazo depende de alguém lembrar de
  desmarcar, e quem esquece deixa o atendente fora da fila indefinidamente. Com data, a pessoa
  volta sozinha.
- `/crm/resgate` + `migration-2026-08-08-pendencia-atendimento-g4-sidebar.sql` — a fila visível,
  na categoria **CRM** (operação), não "Configurações CRM". Deliberadamente somente-leitura: o
  sistema já retenta sozinho; o que a tela precisa entregar é o DIAGNÓSTICO, porque a saída
  costuma estar fora do CRM (liberar alguém, cadastrar atendente com o cargo de distribuição,
  revisar as estratégias do segmento) — daí o painel explicativo quando há leads sem responsável.

**Bug real encontrado testando a UI de verdade:** o badge "AUSENTE" não aparecia. Eu o havia
colocado dentro do bloco que só renderiza para `role_name === 'Corretor'`, e a atendente de teste
tem o cargo "Atendente". É exatamente a suposição por vertical que esta frente vem removendo — o
cargo usado pela distribuição é configurável por segmento
(`system_segments.distribution_role_name`). Movido para fora do bloco: vale para qualquer cargo.

**Testado ao vivo, pelas APIs e no navegador:** marcar ausência via endpoint real ✅ · data no
passado → 400 ✅ · usuário de outro tenant → 404 ✅ · **efeito real na distribuição**: com a
atendente ausente (e sendo a única com o cargo) `resgate: {examinados:3, atribuidos:0}`; liberada
pelo mesmo endpoint, `atribuidos:1` e o lead ganha dona ✅ · sidebar confirmada pela função real
`get_sidebar_menu_for_user` ("Fila de Resgate" na categoria CRM) ✅ · página renderizando KPIs
("NA FILA 6"), badges de situação e tempo de espera ✅ · badge e botões corretos por linha na
tela de usuários ✅.

**Limpeza:** leads e ações de teste removidos, leads reais revertidos, indisponibilidade e papéis
revertidos, canais restaurados. Reconciliação `corrigidos: 0`, `npx tsc --noEmit`: 0 erros.
(Os `user_role_assignments`/`corretor_scores` que restam pertencem a outra tenant — Imobiliaria
XYZ — e são pré-existentes, nunca tocados nestes testes.)

### 6.7 G5 — concluída e testada em 2026-08-08. **Plano formalmente completo.**

Fecha o Buraco D. `reactivationAgent` deixa de medir `MAX(atividades_lead.created_at)` — que não
tem noção de direção — e passa a ler o estado: candidato é lead com `bola_com = 'cliente'`, e o
tempo de silêncio conta desde `bola_desde` (o silêncio DELE), não desde "a última coisa que
aconteceu no lead" (que podia ser uma mensagem dele mesmo, ainda sem resposta nossa).

`evaluate()` revalida `bola_com` antes de propor: a bola pode ter voltado pra nós entre a
varredura e a avaliação, e propor reativação em cima de estado velho seria reintroduzir o bug.

**Duas simplificações de brinde:** o piso de 6h passa a ser sobre o silêncio do cliente; e a
exclusão de etapa terminal desaparece do agente — lead ganho/perdido já tem `bola_com` NULL pelo
motor canônico, então o JOIN com `leads_kanban`/`kanban_colunas` deixou de ser necessário.

**Testado ao vivo com dois leads de contraste, ambos parados há 10 dias:**

| Lead | Estado | Lógica ANTIGA | Lógica NOVA |
|---|---|---|---|
| "esperando NOSSA resposta" | `bola_com='nos'` | ❌ **viraria candidato** — mandaria "sentimos sua falta" para quem espera resposta nossa | ✅ não é candidato |
| "cliente sumiu" | `bola_com='cliente'` | ✅ candidato | ✅ candidato |

O contraste foi rodado sobre **os mesmos dados**, com a query antiga e a nova lado a lado — a
falha é demonstrada, não assumida.

**Domínios disjuntos, provados na mesma rodada:** com o motor de pendência ativo, o lead
"esperando NOSSA resposta" foi capturado por `pendencia_atendimento` (degrau 3, escalonamento) e
o lead "cliente sumiu" **não foi tocado por ele** — é domínio da reativação. Um relógio, duas
direções, ações opostas.

**Limpeza:** leads e ações de teste removidos, config do agente removida, canais restaurados,
reconciliação `corrigidos: 0`, `npx tsc --noEmit`: 0 erros.

---

## 6.8 Estado final da frente

Todas as fases G0-G5 estão implementadas e testadas ao vivo. Os quatro buracos do §1 estão
fechados:

| Buraco | Situação |
|---|---|
| **A** — lead sem dono nunca reprocessado | ✅ fechado (G3: retentativa a cada rodada + fila visível) |
| **B** — `atribuicao_expira_em` NULL para dono do ativo/plantonista | ✅ já coberto por G1/G2 — **não exigiu conserto**, e mexer no campo teria sido o erro (§6.5) |
| **C** — todo prazo é de 1º toque | ✅ fechado (G0/G1: relógio contínuo, idempotência por episódio) |
| **D** — F4 despachava a ação errada | ✅ fechado (G5) |

**Nada está ativado em produção.** Como todos os agentes, `pendencia_atendimento` nasce desligado
— ativar por segmento em `/admin/master/segments` → "Agentes de Aceleração", e escolher os 4
limiares reais, é decisão de negócio do usuário/Master.

## 7. Decisões travadas (usuário, 2026-08-08)

1. **Indisponibilidade existe**, suspende punição mas mantém (e acelera) a reatribuição. ✅
2. **Nenhuma fila de aprovação** em degrau interno — tudo automático. ✅
3. **`is_entrada` em `tipos_atividade`** (mesmo remédio do `is_ganho`). ✅
4. **F1 é absorvido**, não coexiste. ✅

---

## 8. G6 — Reativação automática ✅ (decisão tomada e implementada em 2026-08-08)

Esta seção registrava uma pendência de decisão: o F4 nasceu com aprovação humana obrigatória
(PIN+WhatsApp), o que está em tensão direta com "call center não espera decisão manual".
**Decisão do usuário: não espera decisão manual.** Implementado na mesma sessão.

**O que mudou:** o `type` do resultado deixou de ser fixo e passou a refletir o que de fato
acontece:

| `requer_revisao_extra` | tipo | comportamento |
|---|---|---|
| ausente / `false` (padrão) | `DEFENSIVE` | o `execute()` **envia sozinho**; o tenant é notificado depois, com o texto exato enviado |
| `true` | `OFFENSIVE` | `PENDING_APPROVAL` + PIN — nada sai sem um humano ler. Fluxo de F4 intocado |

O freio deixou de ser "aprovar edita e envia" e virou o que sempre deveria ter sido: a chave que
separa segmento comum de segmento regulado (Saúde foi o exemplo do próprio usuário em F4), onde
falar com o cliente sem revisão tem risco de outra natureza.

**Refactor que sustenta os dois caminhos:** o envio real foi extraído para
`deliverReactivation()` (privado em `reactivationExecutor.ts`), compartilhado por
`approveReactivation()` (humano) e `autoSendReactivation()` (automático) — "quem autorizou" fica
separado de "como se entrega", e os dois nunca divergem. `CrmAgent.execute()` passou a receber o
`actionId` (o efeito colateral de um agente costuma se referir à ação que ele acabou de gravar).

**Transparência obrigatória:** a notificação 1:1 agora inclui `🤖 Ação automática: …` e o texto
integral da mensagem enviada. Sem isso o tenant descobriria só depois que uma mensagem saiu para
o cliente dele — inaceitável para uma ação com efeito externo.

**Testado ao vivo, com LLM real e credenciais de envio deliberadamente neutralizadas:**

| Cenário | Resultado |
|---|---|
| Sem `requer_revisao_extra` | ✅ `DEFENSIVE` / `EXECUTED`, mensagem real rascunhada pela IA |
| A mensagem percorreu o pipeline de envio? | ✅ linha `outbound`/`system` em `mensageria.messages`, `delivery_status: failed` — falha esperada e **segura**: as credenciais Evolution foram nuladas antes do teste, então nada chegou a um telefone real |
| Com `requer_revisao_extra=true` | ✅ `OFFENSIVE` / `PENDING_APPROVAL` + PIN |
| No caminho travado, houve alguma tentativa de envio? | ✅ **zero** contatos criados em `mensageria.contacts` — nem a tentativa acontece |

Texto de Ajuda do Master reescrito: dizia "a mensagem nunca sai sozinha", o que passou a ser
falso por padrão.

**Limpeza:** leads, ações, contatos/conversas/mensagens de teste e config do agente removidos;
canais restaurados ao valor exato; reconciliação `corrigidos: 0`; `npx tsc --noEmit` 0 erros.

> ⚠️ **Nota para a ativação em produção:** este é o único agente que fala com o cliente sem
> passar por ninguém. Antes de ligar `reactivation` num segmento, decidir conscientemente se
> aquele segmento precisa de `requer_revisao_extra=true` — a decisão de negócio agora está toda
> nesse único parâmetro.
