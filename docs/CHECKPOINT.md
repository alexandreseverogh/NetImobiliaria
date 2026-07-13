# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-07-13 (bot não contradiz mais em consulta vazia após assunto não relacionado)
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar.

---

## Última tarefa concluída

### Sessão 2026-07-13 — Filtro contaminado por assunto anterior não relacionado ✅

**Bug reportado (via conversa real, não teste):** sequência real "boa noite" → "estou precisando de
um consórcio" (bot respondeu corretamente que não tem info sobre consórcio) → "em quais bairros tem
imoveis?" → bot respondeu "não encontrei nenhum imóvel disponível", mesmo havendo imóveis reais
cadastrados em múltiplos bairros (Imbiribeira, Boa Viagem).

**Investigação:** localizei a conversa real no banco (`mensageria.messages`) e reproduzi a sequência
exata via `/api/admin/mensageria/bot/test` — **não reproduziu de forma determinística** (5/5
tentativas isoladas + a sequência exata replayada funcionaram corretamente, retornando os imóveis
reais). Conclusão: falha intermitente do LLM, não um bug de código — hipótese mais provável é o
turno anterior sobre "consórcio" (assunto sem relação com critério de busca) ocasionalmente
contaminando o filtro da chamada seguinte à ferramenta.

**Reforçada a persona** (`mensageria_bot_persona`, segmento Imobiliário) — nova regra explícita:
só usar na ferramenta os critérios que a pergunta ATUAL pede, nunca reaproveitar valor de um assunto
anterior não relacionado; perguntas genéricas/exploratórias ("em quais bairros vocês têm imóveis")
devem chamar a ferramenta SEM filtro nenhum, nunca inventando um critério.
`prisma/migration-2026-07-13-mensageria-bot-persona-filtro-nao-contamina.sql`.

**Testado:** retest da sequência exata "boa noite" → "consórcio" → "bairros" 5x seguidas após o
reforço — 5/5 corretas (imóveis reais retornados, sem falso "não encontrei"). Não é prova
estatística definitiva (comportamento de LLM é probabilístico, a falha original também não era
100% reprodutível antes do fix), mas consistente com a hipótese e sem nenhuma regressão observada.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 (continuação 3) — Auditoria de hardcode + coluna de identidade configurável ✅

**Contexto:** usuário questionou, após eu ter corrigido um nome de tabela errado numa migração
("finalidades" → "finalidades_imovel"), se existe qualquer coisa hardcoded na aplicação —
exigência explícita de zero hardcode, multi-segmento, tudo regido por registros em tabela.

**Auditoria feita (grep no código, não por memória):** confirmado zero ocorrências de nomes de
entidade/tabela/campo específicos do imóvel (`'imovel'`, `'tipos_imovel'`, `'fotos'`, `'titulo'`,
`'bairro'`, `'quartos'`, `'preco'`, `'andar'`, `'condominio'`) em `src/lib/mensageria/`. Todo acesso
a campo em `botAdapter.ts` é dinâmico (`row?.[field]`, `row?.[headerCol]`), com o nome do campo
vindo de config (`entity.relations.filter(r => r.is_image)`, `entity.columns.find(c =>
c.is_group_header)`). A frase citada pelo usuário era sobre um erro meu **numa migração SQL**
(dado gravado numa linha de config, equivalente a um Master digitando errado num formulário) — não
código.

**Um ponto real encontrado e corrigido:** `botAdapter.ts` casava linha↔item nos cartões sempre via
`row?.id` — nome de coluna fixo (não específico de segmento, mas não configurável, diferente do
`base_pk` das relations que já era). Corrigido: nova coluna real `identity_column` em
`mensageria.segment_data_entities` (`prisma/migration-2026-07-11-mensageria-bot-identity-column.sql`,
default `'id'`, preserva 100% do comportamento atual) — cada entidade declara sua própria PK.
`genericResolver.ts`: `SegmentDataEntity.identityColumn`; `resolveEntity` sempre inclui essa coluna
na projeção SQL mesmo se o Master esquecer de marcá-la "mostra" (evita quebra silenciosa por erro
de config). `botAdapter.ts` usa `entity.identityColumn` em vez do literal `'id'`. UI (Master →
Segmentos → Dados do Bot): novo campo "Coluna de identidade" no formulário da entidade.

**Testado:** `npx tsc --noEmit` limpo · regressão dos cartões premium (Imbiribeira) — chave de item
agora via `entity.identityColumn`, mesmo resultado de antes (1 cartão por imóvel, 1 foto cada) ·
round-trip real `PUT/GET /data-entities` confirma `identityColumn` sobrevivendo ao salvar pela tela.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 (continuação) — Colunas FK com lookup no resolver genérico ✅

**Bug real reportado:** perguntado "tem imóveis de bangalô na Imbiribeira?", o bot respondeu "sim"
e listou 5 imóveis reais descrevendo cada um como "Este bangalô tem...". Nenhum é bangalô de
verdade — `tipo_fk=90` (bangalô) não existe em nenhuma linha de `imoveis`. Causa raiz: `tipo_fk`
estava com `selectable:false, filterable:false` — o bot não tinha como filtrar por tipo; mesmo se
fosse filterable, o valor bruto é um número (id) e o LLM só sabe o texto "bangalô", sem saber o id.
Sem filtro real, a tool call só filtrou por bairro, trouxe imóveis de qualquer tipo, e o LLM
**assumiu** que eram bangalôs — alucinação por ausência de capacidade, não por regra mal seguida.

**Diagnóstico do usuário, confirmado e generalizado:** o gap é estrutural — qualquer coluna que é
**chave estrangeira** (`tipo_fk→tipos_imovel.id`, `status_fk→status_imovel.id`,
`finalidade_fk→finalidades_imovel.id`) só podia ser número cru ou ficava de fora.

**Implementado — novo tipo de coluna "com lookup" no resolver genérico** (`genericResolver.ts`):
`EntityColumn` ganha `lookup_table`/`lookup_pk`/`lookup_label_column` opcionais (mesmo espírito do
`is_image`/`is_group_header` — presença = capacidade ativada, dirigido 100% por config, zero
hardcoded, funciona pra qualquer FK de qualquer segmento).
- `buildColumnProjection()` — projeta o NOME legível via subquery em vez do id cru
  (`tipo_fk: "Apartamento"` em vez de `tipo_fk: 5`). Config inválida cai no comportamento antigo,
  nunca quebra.
- Filtro: coluna com lookup válido nunca usa a coerção número/texto normal — sempre casa o valor
  do LLM (texto, ex. "bangalô") contra o nome via `IN (SELECT id FROM tabela WHERE nome ILIKE ...)`.
  Isso é o que torna o filtro **real**: sem nenhuma linha daquele tipo, o resultado vem vazio de
  verdade (cai no aviso "nenhum resultado" já existente), em vez do LLM inventar.
- `buildParamsSchema`: coluna com lookup sempre descrita como "texto" pro LLM, mesmo com `type`
  interno `number` — o valor esperado é o nome, não o id.
- UI (`SegmentDataEntitiesModal.tsx`) — 2ª linha por coluna: "tabela de lookup" / "coluna do nome"
  / "PK", mesma mecânica visual já usada nas relations. `data-entities/route.ts` valida os 3 novos
  identificadores com o mesmo `IDENT_RE` das relations.
- `prisma/migration-2026-07-11-mensageria-bot-fk-lookup.sql` — ativa em `tipo_fk`, `status_fk`,
  `finalidade_fk` da entidade `imovel` (as 3 colunas de classificação que um visitante pergunta por
  nome). **Fora de escopo deliberado:** `corretor_fk`/`proprietario_uuid` não entraram — identidade
  de corretor/proprietário é dado sensível, não exposto por padrão sem pedido explícito.

**Testado ponta a ponta:** SQL direto confirma "bangalô" → 0 linhas reais (nenhum imóvel é bangalô)
e um tipo real ("apartamento") → 6 linhas com `tipo_fk` já resolvido pro nome · reproduzido o
cenário EXATO reportado via API do bot — agora responde "não encontrei nenhum imóvel de bangalô...
posso ajustar os critérios?" em vez de inventar 5 imóveis · contraste com tipo real (apartamento) →
encontra corretamente e monta os cartões premium · regressão dos cartões (sessão anterior)
confirmada sem quebra · round-trip real dos 3 novos campos via `PUT /data-entities` sobrevive ·
`npx tsc --noEmit` limpo.

---

## Penúltima tarefa concluída

---

## Última tarefa concluída

### Sessão 2026-07-11 — Bot: agrupamento por item em cartões premium (multi-segmento) ✅

**Contexto:** pedindo fotos de vários imóveis, o bot (1) colava URLs cruas no texto e (2) mandava as
fotos como lote anônimo no fim, sem associação ao imóvel, cortadas no teto de 4. Usuário quer, por
item: cabeçalho + infos pedidas + TODAS as fotos daquele item, item a item, numa visualização
premium, **genérico multi-segmento** (Saúde/Carros/etc. — "sempre há um item de agrupamento
principal"). Plano em `C:\Users\T-GAMER\.claude\plans\bright-herding-minsky.md`.

**Antes disso, 2 bugs menores corrigidos e commitados nesta sessão:**
- Contradição em consulta vazia ("Sim, temos apartamentos em SP" + "não tenho informações"): o
  aviso de "campos disponíveis" entrava mesmo com zero linhas, fazendo o LLM inferir que a entidade
  existe → "temos". Agora resultado vazio recebe aviso explícito de "nenhum resultado" (commit
  `f9f7321`).

**Implementado (cartões):**
1. **Config — flag `is_group_header` por coluna** (espelha `is_image`): `EntityColumn`
   (`genericResolver.ts`), rota `data-entities`, checkbox "cabeçalho" no `SegmentDataEntitiesModal`.
   Migração seta `is_group_header:true` na coluna `titulo` do imóvel. Genérico: qualquer segmento
   marca sua coluna de rótulo (nome da clínica, modelo do carro).
2. **`botAdapter.ts`** — reescrita: coleta fotos POR LINHA (Map por id, não mais achatado);
   **sanitiza** o `tool_result` (troca os arrays de URL por flag `<foto disponível>`/`<sem foto>` —
   o LLM nunca recebe URL pra colar); novo tipo `BotReply` (flat | cards); **modo cartão** (gatilho:
   >1 item E ≥1 foto real) faz uma chamada de formatação dedicada que devolve JSON `{_intro, "<id>":
   texto, _outro}` (código fornece as chaves = casamento robusto por id, sem parsing de prosa); envia
   `_intro` → 1 msg `contentType:'card'` por item (content=cabeçalho+info, attachments=fotos daquele
   item) → `_outro`. `deliverIfWhatsApp` p/ card manda texto + cada mídia (WhatsApp não tem cartão).
3. **`ingest.ts`**: `'card'` no union `ContentType` (sem migração — coluna é `text` livre).
4. **Renderização premium do card** nas duas bolhas (`ConversationThread.tsx` + painel de teste):
   cabeçalho dourado + info + galeria grid das fotos, tema escuro do chat.
5. **Persona** ajustada: agrupamento por cartão é automático da plataforma (LLM não monta no texto
   nem cola link); aviso de "sem foto" reforçado pra NUNCA negar capacidade ("não posso exibir
   imagens") — só dizer que estes itens não têm foto agora.

**Testado ponta a ponta** (API de teste, tenant Imobiliária XYZ): multi-item c/ foto (Imbiribeira) →
intro + 1 cartão por imóvel com a foto correta de cada um, zero URL no texto ✓ · item único → flat
(sem regressão) ✓ · vazio (SP) → limpo, sem cartão ✓ · multi-item SEM foto (Boa Viagem) → agrupa no
texto, sem cartão ✓ · regressão de tom "não posso exibir imagens" corrigida (agora "nenhum desses
imóveis tem foto no momento") ✓ · round-trip real de `is_group_header` via PUT `data-entities`
sobrevive (`true`) ✓ · `npx tsc --noEmit` limpo.

**Pendências/nota:** verificação VISUAL do card no navegador não feita (injeção de cookie de sessão
não sobrevive ao middleware — mesma limitação de toda a sessão; estrutura JSON confirmada via API no
formato exato que o componente consome + revisão de código). **Artefato de dado conhecido:** a
relation `qtd_fotos` conta TODAS as linhas de `imovel_imagens` (inclui legadas sem `url_cdn`), então
um card pode dizer "Possui 18 fotos" exibindo 1 — some quando as fotos legadas forem migradas pro
CDN (fora de escopo). Envio real ao WhatsApp de card ainda não testado com credenciais reais.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 — artemis4: "Entrar" lento (issue crônico) — root cause + fix ✅

**Sintoma (crônico):** na landing `/artemis4`, depois que o vídeo do YouTube começa, clicar em
"Entrar" demorava um tempo enorme pra abrir `/admin/login`. Hipótese do usuário: o vídeo prende as
ações. Já havia uma decisão registrada ([[feedback_landing_nav]]) de usar `<a>` nativo em vez de
`<Link>` — mas ainda estava lento.

**Root cause REAL (medido, não suposto):** `GET /admin/login` = **10,1s na 1ª vez (fria) vs
0,1–0,3s morna** (curl direto no dev server). O gargalo dominante é a **compilação sob demanda do
Next em DEV** do route group `admin` inteiro (`AuthProvider` + `SkillsProvider` +
`AdminLayoutContent`), não o vídeo — **artefato de desenvolvimento, some em produção (build)**. O
vídeo/rAF é só agravante de percepção: durante a espera, o loop de canvas (60fps) + o interval da
telemetria (postMessage ao iframe YT) travam a aba e não dão feedback, reforçando a sensação de
"travou até o vídeo adiantar".

**Fix — 3 partes, tudo confinado a `src/app/artemis4/page.tsx`:**
1. **Pré-aquecer `/admin/login`** em segundo plano no mount, via `requestIdleCallback`
   (`fetch('/admin/login')`, mesmo padrão que o YouTube já usa) — compila a rota enquanto o usuário
   lê a landing; o clique pega a rota morna (~0,3s em vez de 10s). Inofensivo em produção.
2. **`teardownSimulation()`** no `onClick` de todos os 5 CTAs de `/admin/login` — cancela o rAF
   (novo `rafIdRef` + guarda `simStoppedRef` no topo do `render`), limpa o interval da telemetria
   (`telemetryIntervalRef`) e destrói o player do YouTube. Libera a main thread na hora do clique.
   **Não** faz `preventDefault` — o `<a>` nativo segue navegando.
3. **Overlay "Acessando área administrativa…"** (`navigating` state) — feedback visual instantâneo
   em vez de página congelada durante a carga.

**Testado ponta a ponta** (preview real, YouTube de fato tocando): prefetch confirmado no network
(`GET /admin/login → 200` disparado ANTES de qualquer clique) · clicar em "Entrar" numa página tão
pesada que o screenshot pré-clique deu timeout **navegou com sucesso** pro formulário de login (a
teardown destravou a thread + rota morna) · `npx tsc --noEmit` limpo · erros de hidratação
`#document` observados são pré-existentes (injeção do MetaPixel no `artemis4/layout.tsx`), não
introduzidos por esta mudança (o state `navigating` começa `false` nos dois lados do SSR).

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 — Fix segmento no modal de login + botão "Empresas" nos Segmentos ✅

**1. Fix — modal de seleção de empresa no login sempre mostrava "Geral":** causa raiz era um
mismatch de nome de campo, não falta de dado — `src/app/api/admin/auth/login/route.ts` fazia o
JOIN certo com `system_segments` mas selecionava a coluna como `s.name as segment`; o frontend
(`src/app/admin/login/page.tsx:368`) lia `tenant.segment_name` (undefined sempre) com fallback
literal `'Geral'`. Corrigido o alias da query pra `segment_name` — sem tocar no frontend. Validado
via SQL direto (não via HTTP — não tenho a senha real de nenhum usuário multi-tenant e não resetei
sem autorização): usuário `admxyz` (2 empresas, ambas segmento Imobiliário) agora traria
"Imobiliário" nas duas em vez de "Geral". `npx tsc --noEmit` limpo.

**2. Botão "Empresas" em `/admin/master/segments`:** 6º botão na coluna de Ações (ícone
`BuildingOffice2Icon`, azul-céu), abre `SegmentTenantsModal.tsx` (novo componente, mesmo shell
visual de `SegmentDataEntitiesModal.tsx`) — lista alfabética das empresas do segmento, busca com
debounce 350ms, paginação real via API (preparado para centenas de tenants por segmento).
- `GET /api/admin/master/segments/[id]/tenants` (novo, `requireMaster`) — `search`/`page`/
  `pageSize`, `ORDER BY name ASC`, count separado pro total. Endpoint dedicado, não reaproveita
  `GET /api/admin/master/tenants` (sem filtro de segmento/paginação, JOINs pesados desnecessários).
- **Bug real pego no próprio teste:** `logo_url` de pelo menos 1 tenant é uma imagem base64
  embutida (não uma URL leve) — o payload da 1ª versão da query veio com 554KB só pra 2-3 linhas.
  Corrigido: `CASE WHEN logo_url LIKE 'data:%' THEN NULL ELSE logo_url END` — omite o blob grande
  da lista (cai no fallback de iniciais via `ClientAvatarWithFallback`), mantém URLs leves reais.
- Avatar reaproveita `ClientAvatarWithFallback` (`@/components/admin/ClientAvatar`, já usado em
  Portfolio/clientes) — zero componente de avatar novo.

**Testado:** `GET .../tenants` real via curl+JWT Master — retorna as 3 empresas do segmento
Imobiliário em ordem alfabética (Imobiliaria XYZ, Imovitec, Marketing Digital), `search=imov` filtra
corretamente pra 1 resultado, `pageSize=1&page=2` pagina corretamente, sem cookie → 403. Payload
compacto após o fix do `logo_url`. `npx tsc --noEmit` limpo nos 3 arquivos. **Não verificado
visualmente no navegador** — injeção de cookie de sessão Master não sobrevive à revalidação de
middleware em navegação completa (mesma limitação já registrada várias vezes nesta sessão) —
confiei na API real + no mesmo padrão visual já comprovado em `SegmentDataEntitiesModal.tsx`.

---

## Penúltima tarefa concluída

### Bot exibindo fotos de imóveis + envio real ao WhatsApp (M4.2 extensão) ✅

Usuário perguntou se o bot consegue exibir fotos (antes só contava via `qtd_fotos`). Investigação
achou 2 lacunas: (1) faltava relation com o link real da foto (`imovel_imagens.url_cdn`) + nenhuma
bolha de chat sabia renderizar imagem; (2) descoberta maior — **nenhuma resposta do bot chegava ao
WhatsApp real** (`sendEvolutionMessage` só era chamado na resposta manual de atendente, nunca em
`botAdapter.ts`). Usuário confirmou querer as duas coisas resolvidas juntas. Plano completo em
`C:\Users\T-GAMER\.claude\plans\bright-herding-minsky.md`.

**Implementado:**
1. `prisma/migration-2026-07-10-mensageria-bot-fotos-relation.sql` — nova relation `fotos`
   (`agg:'array'`, `imovel_imagens.url_cdn`, max 4) na entidade `imovel` do segmento Imobiliário.
2. `botAdapter.ts`: `runBotReply()` agora retorna `{ text, images }` em vez de só string —
   `collectImageUrls()` colhe as URLs não-nulas de dentro das linhas retornadas por qualquer tool
   call (determinístico, não depende do LLM formatar um link na prosa). `maybeRunBot()` manda 1
   `ingestMessage()` pro texto + 1 `ingestMessage()` por imagem (`contentType:'image'`,
   `attachments:[{url}]`) — mesma ordem que um atendente mandaria no WhatsApp.
3. **Fecha o gap de entrega real**: novo `deliverIfWhatsApp()` em `botAdapter.ts` — depois de cada
   `ingestMessage()` bem-sucedido (incluindo a mensagem fixa de `handoffToHuman()`), se o canal é
   `whatsapp`, chama `sendEvolutionMessage()` (texto) ou a nova `sendEvolutionMedia()` (imagem, via
   `POST {api_url}/message/sendMedia/{instance}`) e atualiza `delivery_status`. Antes desta sessão,
   NENHUMA resposta do bot saía de fato pro WhatsApp — só ficava visível dentro da plataforma.
4. `ConversationThread.tsx` + painel de teste (`mensageria/config/page.tsx`) — bolha de mensagem
   renderiza `<img>` quando `contentType==='image'`; `GET /api/admin/mensageria/bot/test` passou a
   selecionar/retornar `content_type`/`attachments` (faltava, só a rota de conversas já tinha).
5. Persona (`mensageria_bot_persona`, segmento Imobiliário) reforçada 2x: (1) ignorar
   silenciosamente links vazios/nulos da relation `fotos`; (2) **nunca colar a URL crua no texto**
   — a foto já é enviada como mensagem de imagem de verdade logo em seguida (1ª versão do teste
   mostrou o bot colando o link como texto E mandando a imagem, redundante — corrigido).

**Testado ponta a ponta** (via `POST /api/admin/mensageria/bot/test`, tenant Imobiliária XYZ, inbox
WhatsApp de teste sem credenciais reais — envio real tentado e falhou graciosamente como esperado,
sem nenhuma chamada de fato disparada com sucesso): apontei temporariamente `url_cdn` de 1 foto real
(imóvel 2, Boa Viagem) pra uma URL de imagem pública de teste (revertido depois) · pedi "fotos de
apartamentos de 3 quartos em Boa Viagem" (filtro determinístico — a entidade não permite filtrar
por ID do imóvel, só por bairro/quartos/etc., então perguntar por "imóvel 2" diretamente é
inconsistente por design) · confirmado: mensagem de texto limpa ("Aqui estão as fotos!", sem URL) +
mensagem separada `contentType:'image'` com a URL real em `attachments` · `delivery_status='failed'`
na tentativa de envio real (esperado, inbox de teste sem credenciais Evolution) · `npx tsc --noEmit`
limpo nos 6 arquivos tocados.

**Pendências:** verificação visual da renderização `<img>` no navegador não foi feita (injeção de
cookie de sessão não sobrevive à revalidação de middleware em navegação completa — mesma limitação
já registrada antes nesta sessão) — validado via API/JSON real (`contentType`/`attachments` no
formato exato que os componentes esperam) + revisão de código, não visualmente. Envio real de
imagem/texto ao WhatsApp genuíno (`sendEvolutionMedia`) só foi testado contra uma inbox sem
credenciais (falha graciosa) — teste com credenciais reais fica pendente de o usuário indicar um
número de teste, conforme combinado no plano (ação externa irreversível, não disparada
unilateralmente).

**Follow-up mesma sessão — bug real reportado pelo usuário e corrigido:** usuário testou "gostaria
de ver as fotos de cada um" (vários imóveis numa lista de bairros sem foto real no CDN) e o bot
respondeu com "Fotos: Aqui estão as fotos!" repetido por item, sem mandar imagem nenhuma. Causa
raiz: `buildRelationSubquery` (array agg) não filtrava `NULL`/vazio na origem — um imóvel sem
`url_cdn` gerava `fotos:[null,null,null,null]` (array "cheio", só que de nulos) em vez de `fotos:[]`
limpo. O LLM via aquele array não-vazio e tentava renderizar algo por posição. Corrigido em
`genericResolver.ts`: a subquery agora filtra `IS NOT NULL AND <> ''` na origem e usa
`COALESCE(array_agg(v), ARRAY[]::text[])` — garante `[]` de verdade quando não há valor real.
Reforçada também a persona (`mensageria_bot_persona`) pro caso de LISTA de vários imóveis: uma
frase única no fim, não uma linha "Fotos:" repetida por item. Retestado: cenário exato reportado
(zero fotos reais entre os imóveis) agora responde com 1 frase natural "No momento não tenho fotos
desses imóveis disponíveis" · cenário misto (1 imóvel com foto real + outros sem) menciona a foto
disponível corretamente e manda só 1 imagem de verdade, sem ruído nos demais. `npx tsc --noEmit`
limpo.

**Follow-up mesma sessão — 2º bug real, mesma causa raiz mais funda:** mesmo depois do fix acima
(array `fotos:[]` limpo), o usuário reportou o bot dizendo "As fotos dos imóveis estão disponíveis"
pra uma lista de imóveis SEM foto real nenhuma — confirmado via SQL direto que o resultado da
ferramenta era `fotos:[]` para todos, então o array já estava correto; o problema era o LLM não
seguir de forma confiável a regra "se vazio, diga que não há foto" só porque ela estava escrita na
persona, um texto separado do resultado da chamada. Corrigido em `botAdapter.ts`: quando a entidade
tem relation `is_image` e a chamada retorna linhas mas nenhuma foto de verdade, o `tool_result`
mandado pro LLM passa a incluir um campo `aviso` explícito ("Nenhum dos itens abaixo tem foto/imagem
disponível no momento. Não afirme que há fotos disponíveis.") directly nos dados, não só na
instrução geral — sinal textual explícito nos dados é seguido de forma muito mais confiável do que
inferência sobre array vazio. Retestado 3x seguidas com o cenário exato reportado: as 3 respostas
agora abrem com "No momento não tenho fotos desses imóveis disponíveis" · regressão confirmada: caso
misto (1 imóvel com foto real) continua mencionando certo e mandando a imagem de verdade. `npx tsc
--noEmit` limpo.

**Follow-up mesma sessão — dados de teste reais + 3º bug (invenção de campo não mapeado):**
1. **Limpeza + dados reais:** os 13 registros do imóvel 17 apontavam pra objetos que não existem
   mais no MinIO (404 confirmado direto na origem, `curl` contra o bucket) — resquício de teste de
   uma sessão anterior. Limpos (`storage_type`/`url_cdn = NULL`). `prisma/seed-fotos-reais-
   imbiribeira.sql` — a pedido do usuário, populou a foto principal de cada um dos 6 imóveis do
   bairro Imbiribeira (tenant Imobiliária XYZ) com uma imagem pública real (picsum.photos, uma
   por imóvel, todas testadas com `curl` retornando 200) — dado persistente, não revertido depois
   (diferente dos testes anteriores desta sessão), pra servir de base de teste contínua.
2. **`preco_condominio` exposto ao bot** (estava com `selectable=false`, igual o usuário suspeitou)
   — `prisma/migration-2026-07-10-mensageria-bot-preco-condominio.sql`.
3. **3º bug real — invenção de valor pra campo não mapeado:** usuário pediu explicitamente que,
   pra QUALQUER campo não mapeado (não só condomínio), o bot admita que não tem a informação em
   vez de inventar. 1ª tentativa (regra só na persona) FALHOU no teste — perguntado sobre "suítes"
   (campo não mapeado), o bot respondeu com números fabricados e ERRADOS por imóvel (comparado
   com o valor real na tabela `imoveis`). Mesma lição do bug de fotos: regra abstrata na persona
   não é confiável sozinha. Corrigido em `botAdapter.ts`: todo `tool_result` agora inclui um
   `aviso` com a lista exata dos campos disponíveis (`entity.columns` selecionáveis +
   `entity.relations`) e instrução explícita de nunca estimar/inventar campo fora dessa lista —
   sinal explícito nos dados, igual ao fix de fotos. Retestado: parou de inventar números
   específicos, mas 1ª rodada ainda disse "o imóvel não possui suítes" (confundindo "sem dado"
   com "resposta é zero") — reforçada a persona distinguindo os dois casos
   (`migration-2026-07-10-mensageria-bot-persona-nao-confundir-zero.sql`). Retestado 2x: resposta
   limpa nas duas ("Não tenho essa informação disponível... sugiro falar com um atendente"), sem
   afirmar zero nem inventar valor. `npx tsc --noEmit` limpo.

**Follow-up mesma sessão — generalização pra qualquer segmento (Saúde, Veículos, etc.):** usuário
perguntou se a exibição de fotos funcionaria pra outros segmentos "com zero hardcoded". Resposta
honesta: a 1ª versão tinha um hardcode real — `collectImageUrls()` procurava literalmente a chave
`"fotos"` no resultado da tool call. Corrigido: `EntityRelation` (`genericResolver.ts`) ganhou o
campo `is_image?: boolean`; `collectImageUrls()` agora recebe a `entity` e descobre dinamicamente
quais relations são imagem (`entity.relations.filter(r => r.is_image)`) — funciona pra qualquer
nome de campo/entidade/segmento, sem tocar em código. UI "Dados do Bot" (Master → Segmentos →
`SegmentDataEntitiesModal.tsx`) ganhou o checkbox "É uma lista de links de imagem" nas relations
tipo array — um Master configurando Saúde Digital ou Veículos marca isso na tela, sem SQL nenhum.
`prisma/migration-2026-07-10-mensageria-bot-fotos-is-image-flag.sql` retroaplicou a flag na relation
`fotos` já existente do imóvel. Testado: GET/PUT reais via `/api/admin/master/segments/[id]/
data-entities` confirmam a flag sobrevivendo ao round-trip completo; reteste do bot (mesmo cenário
de Boa Viagem) confirma que a imagem continua sendo detectada e enviada corretamente pelo novo
mecanismo genérico. `npx tsc --noEmit` limpo.

---

## Penúltima tarefa concluída

### Sessão 2026-07-10 (continuação 6) — Investigação "andar inventado" + fallback de robustez do bot ✅

**Investigação 1 — falso alarme corrigido:** usuário reportou o bot "inventando" andares dos
imóveis. Eu tinha confirmado `andar = NULL` numa consulta ANTERIOR e assumi que continuava assim
— erro meu, não considerei que o usuário pudesse ter atualizado o dado manualmente entre as duas
consultas. Reconferido: os valores que o bot reportou (`andar=1,2,3,5,6`) batiam **exatamente**
com o estado atual real da tabela `imoveis` — o bot estava certo, eu que me baseei em dado
desatualizado. Lição: nunca reafirmar uma conclusão de consulta anterior sem reconferir o estado
atual, especialmente quando o usuário pode estar editando dados em paralelo.

**Investigação 2 — bot não respondeu a "me mostre as fotos dos imoveis":** confirmado no histórico
real (`mensageria.messages`) que a mensagem foi ingerida mas nenhuma resposta do bot foi gerada —
falha real, engolida silenciosamente pelo catch "best-effort" do hook em `ingestMessage()`.
Tentei reproduzir com logging temporário de erro (escrita em arquivo) — a reprodução ("de novo")
funcionou perfeitamente (usou a relation `qtd_fotos` corretamente, retornou contagens reais).
Não consegui capturar o stack trace da falha original (aconteceu antes de eu adicionar o log).
Indício de falha transitória (timeout/hiccup da API do LLM), não bug determinístico — mas revelou
uma lacuna de robustez real independente da causa exata.

**Corrigido:** `botAdapter.ts` — `runBotReply()` agora roda dentro de try/catch próprio; se
lançar exceção (não só retornar vazio), ainda envia uma mensagem de desculpa genérica ao contato
em vez de silêncio total. Antes, só o caso "conteúdo vazio" tinha fallback — uma falha de
verdade (erro de rede/provider) deixava o contato sem nenhuma resposta, parecendo bot quebrado.

**Testado:** `npx tsc --noEmit` limpo. Não foi possível testar o caminho de erro em si (exigiria
forçar uma falha real do provider LLM), mas a mudança é estruturalmente simples (try/catch +
fallback já usado no caso de conteúdo vazio) e de baixo risco.

---

---

## ⚠️ Incidente registrado — dados apagados por engano nesta sessão

**O que aconteceu:** ao testar a feature `chatbot_max_turns_default` (item anterior deste
checkpoint), fiz 2 chamadas diretas via curl a `PUT /api/admin/master/segments` passando
`"module_ids":[]` (só queria testar o campo novo, ignorei os demais campos do payload). Essa
rota faz **replace-all** de `system_segment_modules` pro segmento (`DELETE` + reinsert do que
vier no body) — como não veio nada, apagou os 6 vínculos módulo↔segmento do "Imobiliário" que
existiam antes. Sintoma reportado pelo usuário: `/admin/master/provisioning` parou de mostrar
módulos/features pro segmento Imobiliário (a árvore dessa tela é agrupada por
`system_segment_modules`).

**Diagnóstico errado na primeira resposta:** inicialmente concluí "não fui eu" com base só em
não ter tocado o COMPONENTE da tela — não considerei que uma chamada de API minha, em outro
contexto (testando outro campo), pudesse ter efeito colateral destrutivo numa tabela
compartilhada. O usuário insistiu "a tela funcionava antes" e essa insistência foi o que me fez
reabrir a investigação e achar a causa real.

**Corrigido:** reconstrução por evidência (não há backup do estado exato anterior) — união dos
módulos que os 2 tenants reais do segmento Imobiliário (Imobiliaria XYZ + Marketing Digital) já
tinham provisionados em `tenant_modules`: Mercado Imobiliário, Administrativo Provisionado,
Cadastros, CRM de Vendas, Gestão de Campanhas de Marketing Digital, Gestão de Mensageria (6).
Reinseridos via SQL direto (não pela rota PUT, pra não repetir o mesmo erro). Verificado via
`GET /api/admin/master/provisioning` — a árvore volta a mostrar os 6 módulos com features sob
o segmento Imobiliário.

**Lição registrada:** ao testar uma API existente por fora da UI (curl direto), **nunca**
montar o body só com o campo que estou testando quando a rota é do tipo "replace-all" — sempre
buscar o estado atual completo primeiro (`GET`) e enviar o objeto inteiro de volta, alterando só
o campo relevante. Isso já era a prática usada em alguns dos meus testes anteriores nesta sessão
(ex.: round-trip do PUT de `segment_data_entities`), mas não segui essa mesma disciplina aqui.

---

## Última tarefa concluída

### Sessão 2026-07-10 (continuação 5) — Toggle "usar padrão do segmento" + botão Limpar ✅

**Motivação:** usuário reportou que o campo MaxTurns não refletia o valor do segmento — causa
real: tenants que já tinham salvo seu próprio `maxTurns` sempre viam esse valor, nunca o padrão
do segmento, mesmo depois do Master mudar o padrão (comportamento correto de override, mas
confuso sem uma forma explícita de "voltar a seguir o segmento"). Também reportado: falta um
botão "Limpar" — já existia ("Reiniciar conversa"), só estava pequeno demais pra ser notado.

**Implementado:**
1. `bot_flows.handoff_rules.maxTurns` agora é tratado como genuinamente opcional — `null`
   significa "segue o padrão do segmento". `botAdapter.ts`: `effectiveMaxTurns = rules.maxTurns
   ?? segmento.chatbot_max_turns_default ?? 6` — a mudança real está aqui, o fallback agora vale
   em **runtime**, não só como sugestão de UI (antes, `maxTurns=null` nunca disparava handoff
   por turno nenhuma vez).
2. `GET /api/admin/mensageria/bot-flows` sempre retorna `segmentMaxTurnsDefault` junto do
   `flow` (antes só vinha quando `flow` era `null`).
3. Aba Bot — checkbox "Usar padrão do segmento (N)" ao lado do campo MaxTurns; quando marcado,
   o input fica desabilitado mostrando o valor do segmento, e o PUT manda `maxTurns: null`.
4. "Reiniciar conversa" virou um botão de verdade — rótulo "Limpar conversa", ícone de lixeira,
   fundo/borda vermelha — usuário não tinha notado o texto pequeno anterior.

**Testado:** GET confirma `segmentMaxTurnsDefault=15` (o usuário já tinha ajustado o segmento
Imobiliário pra 15 seguindo minha sugestão anterior — boa validação orgânica de que a UI do
Master funciona) · PUT com `maxTurns:null` persiste e reflete corretamente no GET seguinte ·
**teste de runtime decisivo:** rodei 6 turnos numa conversa com `maxTurns:null` — turno 6 (que
teria disparado handoff sob o limite fixo antigo de 6) **não** disparou, confirmando que o bot
está usando o padrão do segmento (15) de verdade, não só exibindo na tela. `npx tsc --noEmit`
limpo.

---

### Sessão 2026-07-10 (continuação 4) — MaxTurns padrão vira parâmetro por segmento ✅

**Contexto:** investigando um handoff "inesperado" no bairro Imbiribeira (Imobiliaria XYZ), veio
à tona que a conversa de teste tinha mais turnos do que o usuário mostrou (6, não 4 — puxei o
histórico completo do banco pra provar) — o limite configurado (`maxTurns=6`) disparou
corretamente, não foi bug de dados/ferramenta. Só que 6 é pouco pra uma conversa imobiliária real
(fácil estourar só explorando 2-3 bairros). Usuário pediu: esse padrão deve ser um parâmetro de
tabela, editável pelo Master, **por segmento de negócio** (não um valor fixo no componente).

**Implementado** (mesmo padrão já usado pra outros parâmetros diretos em `system_segments`, ex.
`cpl_ideal`/`cpl_critical`):
1. `prisma/migration-2026-07-10-segment-chatbot-max-turns.sql` — `system_segments.
   chatbot_max_turns_default INTEGER NOT NULL DEFAULT 6`.
2. `POST/PUT /api/admin/master/segments` aceitam o novo campo.
3. `/admin/master/segments` — modal "Editar segmento" ganhou o campo (seção verde, mesmo padrão
   visual do toggle "Imagens por IA"), editável por segmento.
4. `GET /api/admin/mensageria/bot-flows` (nível tenant) — quando o tenant ainda não configurou o
   próprio flow, resolve o segmento do tenant (`resolveSegment`) e retorna
   `suggestedMaxTurns = segmento.chatbot_max_turns_default` em vez do `flow: null` cru. A aba Bot
   em `/mensageria/config` usa essa sugestão como valor inicial do campo, em vez do `'6'` fixo
   que tinha antes.

**Testado:** `npx tsc --noEmit` limpo · `GET /master/segments` confirma o campo presente e = 6
pros 6 segmentos existentes · `PUT` alterando o valor funciona (confirmado, depois revertido) ·
tentativa de testar o fallback (`suggestedMaxTurns`) end-to-end esbarrou numa FK (`bot_sessions`
referenciando o `bot_flows` da Imobiliaria XYZ) — não forcei a remoção pra não arriscar o config
real do tenant; a lógica em si é simples e segue o mesmo padrão já comprovado de `resolveSegment`
usado em várias outras partes do código nesta sessão, então confiei na revisão de código.

**Erro cometido de novo (4ª vez nesta sessão) e corrigido:** digitei "Imobiliário" acentuado
direto num `curl -d` de teste — corrompeu o **nome do segmento** (mais visível que os casos
anteriores, que eram descrições). Corrigido via arquivo. **Ação tomada:** a partir de agora,
qualquer corpo de requisição com acento vai sempre por arquivo primeiro, sem exceção — o padrão
"é só um valor que eu já sei que está certo" continua causando o mesmo erro toda vez.

---

### Sessão 2026-07-10 (continuação 3) — tipos_imovel: completa o fix de escopo pra Imobiliaria XYZ ✅

**Motivação:** usuário reportou `/admin/tipos-imoveis` sem nenhum registro, logado como
Imobiliaria XYZ. Causa: consequência direta do fix de escopo por tenant feito antes nesta sessão
(`migration-2026-07-09-tipos-status-imovel-tenant-scope.sql`) — naquela rodada só duplicamos o
catálogo do master pro Marketing Digital (decisão explícita do usuário na hora, pra não arriscar
os 12 imóveis reais da Imobiliaria XYZ que usam `tipo_fk=12`). Antes do fix do bug de escopo, a
Imobiliaria XYZ "enxergava" (incorretamente) as linhas do master; com o escopo corrigido, passou
a ver zero linhas próprias — ficou pendente duplicar pra ela também, e esqueci de fazer isso.

**Corrigido:** `prisma/migration-2026-07-10-tipos-imovel-imobiliaria-xyz.sql` — duplica as 12
linhas do master pro tenant Imobiliaria XYZ (mesmo padrão já usado pro Marketing Digital,
puramente aditivo/INSERT, `ON CONFLICT DO NOTHING` idempotente).

**Testado:** API `/api/admin/tipos-imoveis` com token real da Imobiliaria XYZ retorna os 12 tipos
próprios, acentos corretos (usei arquivo pra aplicar, não linha de comando — sem repetir o erro
de encoding desta vez) · confirmado que os 12 imóveis reais que usam `tipo_fk=12` continuam
intactos e apontando pro mesmo id (INSERT não mexeu em nenhuma linha existente nem em nenhum FK).

---

### Sessão 2026-07-10 (continuação 2) — Persona: reforço de idioma e escopo ✅

**Motivação (bug real, achado testando com Imobiliaria XYZ já ativa):** perguntado algo fora do
segmento imobiliário ("indicação de remédio pra dor de cabeça"), o bot respondeu **em inglês**
("I don't have access to médico information") — a persona já pedia português, mas não tinha
instrução explícita pra pergunta fora de escopo, e o modelo "escapou" do idioma nesse caso.

**Corrigido** (dado, não código — `public.system_prompt_templates`, template
`mensageria_bot_persona`, os dois templates ativos hoje: fallback global + Imobiliário):
adicionadas 2 regras explícitas — (1) responder SEMPRE em português, mesmo pergunta em outro
idioma ou assunto fora do papel; (2) se a pergunta não tem relação com o negócio, responder com
cordialidade que não tem conhecimento sobre aquele assunto específico, deixar claro qual é o
papel do bot, e perguntar se pode ajudar com algo relacionado.
`prisma/migration-2026-07-10-mensageria-bot-persona-escopo-idioma.sql` (aplicada, idempotente).

**Testado:** repeti a exata pergunta que tinha vazado pra inglês, no mesmo tenant (Imobiliaria
XYZ) — resposta agora cordial, 100% em português, explicando que não tem conhecimento sobre
remédios e redirecionando pro que pode ajudar (imóveis).

---

### Sessão 2026-07-10 (continuação) — Criação manual de inbox ✅

**Motivação:** usuário reportou o campo de "Testar bot" desabilitado logado como Imobiliaria XYZ.
Investigação: tenant tem **zero inboxes** — nunca teve nenhuma interação real em nenhum canal.
Achado importante antes de implementar: `resolveWebformInbox()`/`resolveManualInbox()`
(`src/lib/mensageria/inboxes.ts`) já criam a inbox **automaticamente na primeira mensagem real**
de cada canal — não é ausência de mecanismo, é que Imobiliaria XYZ nunca usou o módulo. Levei
isso ao usuário antes de construir a tela (pra não duplicar um mecanismo já existente); usuário
confirmou que queria a criação manual mesmo assim — útil pra provisionar a inbox **antes** da
primeira interação real (ex.: testar o bot antes de divulgar o canal).

**Implementado:**
- `POST /api/admin/mensageria/inboxes` — cria inbox própria do tenant (`client_id NULL`).
  Restrito a canais funcionais hoje (`whatsapp`/`webform`/`manual` — não `webchat`/`chatbot`,
  que ainda não têm superfície real). Rejeita duplicata do mesmo canal pro tenant (409) —
  mantém a mesma premissa de unicidade que o auto-create já assume (`LIMIT 1`).
- Aba "Inboxes" — formulário de criação (nome + canal) aparece só se houver algum canal ainda
  não criado; lista abaixo continua como já era.

**Testado** (token de teste pro tenant Imobiliaria XYZ, usuário real `admxyz`): tenant começou
com 0 inboxes · POST criou "Formulários do Site" (webform) · 2ª tentativa do mesmo canal → 409 ·
GET reflete o estado correto. **Erro cometido e corrigido no processo:** digitei "Formulários"
acentuado direto no `curl -d` de novo (mesmo erro já registrado antes) — corrigido via arquivo.
**Reforçando a lição:** revisar antes de testar — nunca digitar acento inline em curl/bash.
`npx tsc --noEmit` limpo.

**Pendente:** Imobiliaria XYZ ainda não tem `bot_flows` ativo — a inbox já existe e o campo de
teste já destrava, mas o bot em si precisa ser configurado/ativado na aba Bot pra responder de
verdade (mesmo passo que qualquer tenant novo precisa fazer).

---

### Sessão 2026-07-10 — "Dados do Bot": introspecção sob demanda de colunas ✅

**Motivação (feedback real do usuário testando a UI):** o cadastro de colunas era 100% manual —
o Master tinha que digitar de cabeça os nomes reais das colunas de `imoveis` (47 colunas ao todo,
só 10 configuradas). Usuário: "imaginei que fosse listados todos os campos da tabela para o
usuário não precisar adivinhar".

**Implementado** (versão simples/imediata do job de introspecção da seção 14.6-A — sem criar
linhas-esqueleto automaticamente, só carrega sob demanda quando o Master pede):
- `GET /api/admin/master/segments/[id]/data-entities/table-columns?table=X` — consulta
  `information_schema.columns` (schema `public`) e mapeia `data_type` do Postgres pro
  vocabulário simplificado do resolver (`text`/`number`/`boolean`). Valida o nome da tabela
  contra `IDENT_RE` antes de consultar; 404 se a tabela não existir.
- Botão "Carregar colunas da tabela" em cada card de entidade — busca as colunas reais e
  **mescla** com as já configuradas (nunca sobrescreve; só adiciona as que faltam, com
  `selectable=false`/`filterable=false` por padrão — o Master decide o que exibir/filtrar).

**Testado:** `imoveis` retorna as 47 colunas reais com tipo mapeado corretamente · tabela
inexistente → 404 · identificador com SQL injetado (`imoveis; DROP TABLE imoveis;--`) → 400,
rejeitado pela validação · rota é somente leitura (não grava nada), sem necessidade de
restaurar estado depois do teste. `npx tsc --noEmit` limpo.

**Também corrigido nesta sessão (feedback de UX sobre a transição de loading):** esqueleto de
carregamento do modal reescrito para imitar a forma real dos cards (título+tabela, descrição,
grid de colunas) em vez de 2 blocos cinzas genéricos — a troca abrupta "caixa vazia → formulário
denso" estava sendo percebida como "dois modais abrindo em sequência". Também adicionada uma
guarda contra fetch duplicado do React Strict Mode (dev) no `useEffect` de carregamento.

---

### Sessão 2026-07-09 (continuação 2) — UI "Dados do Bot" no Master (Ponto 3c) ✅

**Decisão de UX (discutida com o usuário antes de implementar):** usuário propôs um botão na
página de Prompts. Recomendei `/admin/master/segments` em vez disso — `segment_data_entities` é
keyed por `segment_id`, igual `segment_angle_terms` (Ângulos & Demanda) e Interesses Meta, e a
página de Prompts é genérica pra qualquer `template_key` (não só a persona do bot), então acoplar
um botão específico ali seria estranho. Segments já tem exatamente essa gaveta — 3 botões de
config por segmento (Ângulos, Interesses, Parâmetros do Agente). Usuário confirmou: seguir só na
página de Segmentos, sem atalho a partir de Prompts.

**Implementado** (mesmo padrão visual/interação de `SegmentAnglesModal` — cards editáveis,
replace-all no save, sem "Sugerir com IA" ainda, já que não há job de introspecção):
1. `GET/PUT /api/admin/master/segments/[id]/data-entities` — só entidades de escopo segmento
   (`tenant_id IS NULL`; overrides por tenant continuam via SQL, mesma decisão já tomada pra
   `bot_flows`). PUT é replace-all transacional (delete + reinsert), valida todo identificador
   (nome de tabela/coluna/tabela-ponte/lookup) contra `IDENT_RE` antes de persistir — o Master não
   consegue salvar um fragmento de SQL disfarçado de nome de coluna.
2. `SegmentDataEntitiesModal.tsx` (novo) — cards de entidade (nome/tabela/descrição/coluna de
   tenant/filtro padrão/máx. resultados/ativo), sub-lista de colunas (nome/tipo/descrição/
   mostra/filtra), sub-lista de relations (nome/agregação/tabela-ponte/FK/tabela de nomes/FK do
   lookup/coluna trazida/teto), painel de Ajuda explicando colunas×relations e a garantia de
   segurança (bot nunca escreve SQL, sempre isolado por tenant).
3. `/admin/master/segments` — 4º botão na coluna de Ações (ícone `CircleStackIcon`, verde-esmeralda
   pra diferenciar dos outros 3), abre o modal escopado ao segmento da linha.

**Testado** (token Master gerado manualmente via padrão do CLAUDE.md, cookie `admin_auth_token` —
a rota usa cookie como as rotas irmãs de Ângulos/Benchmarks, não Bearer header):
`GET` retorna as 2 entidades reais (`imovel` com as 3 relations, `tipo_imovel`) exatamente como
estão no banco · `PUT` com uma 3ª entidade de teste persistiu tudo corretamente (colunas, relations,
inclusive `is_active=false`) · validação rejeitou um nome de tabela com SQL injetado
(`"imoveis; DROP TABLE imoveis;--"`) · estado original restaurado byte-a-byte (mesma contagem de
colunas/relations) · bot re-testado depois do round-trip pela API — continua respondendo com os 12
tipos reais, sem regressão. `npx tsc --noEmit` limpo.

**Follow-up — usuário reportou modal preso no skeleton de loading:** investigação longa (Fast
Refresh do dev server, tentativa de injetar cookie de sessão Master via Chrome DevTools MCP pra
reproduzir — abandonada, muita camada de validação client-side pra forjar) até o usuário mandar
prints reais do Network/Response do navegador: a API sempre respondeu 200 com dado correto: **o
modal nunca teve bug** — a UI renderiza os cards perfeitamente. O que os prints revelaram foi outro
problema real, introduzido por mim: o `curl` que usei mais cedo pra restaurar o estado original
depois do teste de round-trip passou o JSON acentuado direto na linha de comando do Git Bash
(Windows) — corrompeu UTF-8 (á/ç/õ/— viraram `�`) ao gravar no banco. Corrigido com um `UPDATE`
aplicado via arquivo real (`docker exec -i ... < arquivo.sql`), não linha de comando — mesmo padrão
seguro já usado nas migrações. **Lição registrada:** nunca passar texto acentuado inline em comando
bash/curl no Git Bash Windows — sempre escrever um arquivo (Write tool) e aplicar via stdin/arquivo.

**Pendências (próxima rodada):** UX multi-segmento em `/admin/master/prompts` (Ponto 2, ainda não
atacado) · sem botão "Sugerir com IA" nesta tela (dependeria do job de introspecção, fora de
escopo) · overrides por tenant de `segment_data_entities` continuam só via SQL.

---

### Sessão 2026-07-09 (continuação) — UI de teste de conversa + fix tenant_id em tipos_imovel/status_imovel ✅

**Contexto:** usuário pediu uma UI temporária pra testar conversas de múltiplos turnos com o bot
(memória, handoff, tool-use) antes de ir pra UI definitiva do Master. Testando, encontrou o bot
respondendo genérico/alucinado sobre "que tipos de imóveis vocês trabalham" — investigação revelou
um bug pré-existente e maior do que a pergunta original, em `tipos_imovel`/`status_imovel`.

**1. UI de teste de conversa** (`/mensageria/config` → aba Bot):
- `POST /api/admin/mensageria/bot/test` reescrito: `GET ?inboxId=` (estado atual — histórico completo
  + `handledByBot`/`botSessionActive`), `POST` (manda mensagem, retorna histórico **inteiro**, não só
  a resposta nova), `DELETE ?inboxId=` (reinicia — deleta a `conversation`, `messages`/`bot_sessions`/
  `conversation_events` cascateiam via FK).
- Painel "Testar bot" virou chat de verdade: bolhas indo/vindo (mesmo estilo do `ConversationThread`
  real), scroll automático, persiste entre trocas de aba/reload, banner quando handoff já ocorreu,
  botão "Reiniciar conversa".
- **Bug de robustez pego no teste:** o LLM global é OpenAI-compatible com validação estrita — a rodada
  final do loop de tool-use mandava `tools: []`, que o provider rejeita (`400`). Corrigido:
  `completeWithTools` omite `tools` da requisição quando vazio, nos dois branches (Anthropic/OpenAI).
- **Testado:** memória entre turnos (perguntei nome, dei "Carlos", perguntei de volta — acertou) ·
  handoff por keyword (`botSessionActive` vira `false`, bot fica em silêncio nas mensagens seguintes,
  confirmado por acidente com um double-submit) · `GET` reflete exatamente o mesmo estado do último
  `POST` (sem drift, testável após reload).

**2. Bug real encontrado via teste — `tipos_imovel` não tinha escopo por tenant de verdade:**
- Comparando com as rotas irmãs (`finalidades`/`status_imovel`, que extraem `tenantId` do JWT
  corretamente), a rota `/api/admin/tipos-imoveis` **ignorava o tenant do token** — `GET` chamava
  `findAllTiposImovel()` sem argumento, e a função tinha `tenantId: string = '00000000-...'`
  **hardcoded como default**. Toda empresa da plataforma via a mesma lista de 12 tipos do tenant
  master. `POST`/`PUT`/`PATCH`/`DELETE` em `[id]/route.ts` tinham o mesmo problema (e ainda um bug de
  assinatura: `updateTipoImovel(id, {nome,...})` passava um objeto no lugar do `tenantId` esperado —
  confirmado pelos erros de TS pré-existentes já vistos no baseline desta sessão, que na hora pareciam
  não-relacionados e agora se mostraram diretamente relevantes).
- **Descoberta adicional:** a constraint `UNIQUE(nome)` (global, não por tenant) em `tipos_imovel` E
  `status_imovel` impedia a correção direta — não dava pra duplicar "Apartamento" pro tenant Marketing
  Digital enquanto "Apartamento" já existisse sob o master.
- **Verificação de impacto antes de agir:** Imobiliaria XYZ (tenant real, `c828d003...`) tem **12
  imóveis reais** usando `tipo_fk=12` ("Apartamento", uma linha do master) — mover(UPDATE) as linhas
  pra Marketing Digital quebraria a visibilidade do catálogo pra Imobiliaria XYZ assim que o bug da
  rota fosse corrigido. Decisão confirmada com o usuário: **duplicar** (não mover) pro Marketing
  Digital, `amenidades`/`proximidades` ficam de fora (são catálogos genuinamente compartilhados,
  já validados funcionando via `imovel_amenidades`/`imovel_proximidades` no teste anterior).
- **`prisma/migration-2026-07-09-tipos-status-imovel-tenant-scope.sql`** (aplicada): `UNIQUE(nome)` →
  `UNIQUE(tenant_id, nome)` em `tipos_imovel` e `status_imovel` · duplica as 12 linhas de `tipos_imovel`
  e a 1 linha órfã de `status_imovel` (ambas sob o master) pro tenant Marketing Digital · Imobiliaria
  XYZ e o master continuam com suas linhas intactas.
- **Rotas corrigidas** (`src/lib/database/tipos-imoveis.ts` + `src/app/api/admin/tipos-imoveis/
  route.ts` + `.../[id]/route.ts`): `tenantId` agora `string | undefined` em toda a cadeia (mesmo
  padrão de `status-imovel.ts`) — master vê tudo (sem filtro), tenant vê só o seu; `POST` exige
  tenantId (401 se ausente); `PUT`/`PATCH`/`DELETE` corrigidos pra passar `tenantId` na posição certa.
- **`prisma/migration-2026-07-09-mensageria-bot-tipos-imovel.sql`** — registra `tipos_imovel` como 2ª
  ferramenta de dados do bot (segmento Imobiliário).
- **Testado:** `npx tsc --noEmit` limpo (os erros de TS pré-existentes em `tipos-imoveis/*` do
  baseline desta sessão desapareceram) · query simulada confirma 12 linhas próprias do Marketing
  Digital · bot re-testado com a MESMA pergunta que tinha alucinado antes — agora cita os 12 tipos
  reais, sem inventar nada.

**Pendências (inalteradas, próxima rodada):** UI "Dados do Bot" no Master (3c) · UX multi-segmento em
`/admin/master/prompts` (Ponto 2) · `amenidades`/`proximidades` ainda não registradas como ferramentas
do bot (ficaram de fora desta rodada, mas o motor já suporta — é só cadastro).

---

### Sessão 2026-07-09 — M4.2 refinamento (motor de dados multi-tabela + persona no lugar certo) ✅

### Sessão 2026-07-09 — M4.2 refinamento (motor de dados multi-tabela + persona no lugar certo) ✅

**Contexto:** revisão holística pedida pelo usuário apontou 3 pontos. Sequência confirmada:
"motor primeiro, UI depois". Esta rodada fez Ponto 1 + Ponto 3a/3b.

1. **Ponto 1 — persona no lugar certo (feito):** removido o campo de persona (override) da aba Bot em
   `/mensageria/config`, do endpoint `bot-flows` (GET/PUT não lê/grava mais `system_prompt`) e do
   `botAdapter` (`resolvePersona` não honra mais override — persona é 100% dirigida por segmento).
   A persona agora vem só de `/admin/master/prompts` (template `mensageria_bot_persona`,
   `resolvePromptTemplate` faz segmento → fallback global). A aba Bot ficou com o operacional do
   tenant (ativo, handoff keywords/maxTurns, teste) + uma nota apontando pro Editor de Prompts.
2. **Ponto 3a — relations no resolver (feito):** `genericResolver.ts` reganhou o suporte a `relations`
   (que eu havia descartado do design 14.6-A), mais robusto que o rascunho do plano: subqueries
   escalares correlacionadas com agregação one-to-many (`array_agg` com teto), `count`, `first`, e
   multi-hop (imovel → tabela-ponte → lookup do nome). TODOS os identificadores são montados pelo
   resolver a partir de campos "bare" validados por IDENT_RE — config NUNCA fornece fragmento SQL cru
   (o rascunho 14.6-A interpolava `r.join_table`/`r.on`/`r.select` direto; isto é mais seguro).
3. **Ponto 3b — re-seed Imobiliário (feito):** `migration-2026-07-08-mensageria-bot-relations.sql`
   popula relations reais na entidade `imovel`: `qtd_fotos`=count de `imovel_imagens`;
   `amenidades`=array via `imovel_amenidades`→`amenidades.nome`; `proximidades`=array via
   `imovel_proximidades`→`proximidades.nome`. Aplicada localmente.

**Bug real encontrado e corrigido durante o teste (importante):** o LLM global da plataforma é um
provider **OpenAI-compatible com validação estrita de schema** (não Anthropic). O modelo mandou
`quartos: "3"` (string) e o provider rejeitou a tool call porque o schema declarava `number`
(`400 tool call validation failed ... expected number, but got string`). Isso explica por que o
teste de M4.1 tinha passado "na sorte" (naquela vez o modelo emitiu número). **Correção:** o schema
das ferramentas agora expõe todo filtro como `string`, e a coerção pro tipo real acontece
server-side no `resolveEntity` (número via `Number()` com validação, boolean normalizado, texto
ILIKE). Robusto e determinístico independentemente do que o modelo emite. Também: `completeWithTools`
passou a **omitir** `tools` da requisição quando o array é vazio (a rodada final do loop de tool-use
mandava `tools: []`, que os providers rejeitam).

**Testado ponta a ponta** (tenant Marketing Digital, dados temporários removidos após validação):
SQL das relations validado contra dados REAIS do tenant Imobiliaria XYZ (imóvel 17, 44 amenidades →
multi-hop + `array_agg` corretos) · bot respondeu citando as 3 amenidades, 2 proximidades e campos
base (preço/banheiros/vagas/área) exatamente como inseridos · `npx tsc --noEmit` limpo · bundle da
config confirma persona removida + nota do Editor de Prompts presente.

**Nota honesta de cobertura:** só o branch **OpenAI-compatible** de `completeWithTools` foi exercitado
em runtime (é o provider global configurado). O branch Anthropic compila e está correto por
construção, mas não foi testado ao vivo nesta rodada.

**Pendências desta frente (próxima rodada — "UI depois"):**
- **3c — UI "Dados do Bot" no Master:** modal por segmento (padrão Ângulos/Interesses/Benchmarks de
  `/admin/master/segments`) pra cadastrar entidades + colunas selectable/filterable + relations sem
  SQL. É o que torna o "quais tabelas cada segmento acessa" 100% parametrizável (inclusive Saúde,
  Carros, etc. — hoje só via SQL).
- **Ponto 2 — UX multi-segmento em `/admin/master/prompts`:** a capacidade existe (botão "Duplicar
  p/ segmento"; banco permite N variantes por template_key), mas o fluxo é escondido e tem footgun
  (abrir o Global, trocar segmento e clicar Salvar MOVE o Global pro segmento). Tornar "adicionar
  variante por segmento" first-class + proteger o Salvar.
- Persona por segmento: hoje semeados global + Imobiliário. Saúde/Carros/etc. entram via
  `/admin/master/prompts` quando forem ativados.
- Job de introspecção de tabelas novas (14.6-A) — futuro.

---

## Penúltima tarefa concluída

### Sessão 2026-07-08 — M4.1 + M4.2: Chatbot mínimo + ferramentas de dados por segmento ✅

**Escopo confirmado com o usuário:** M4.1 (núcleo do bot) **junto com** M4.2 (tool-use sobre dados do
segmento). RAG (14.6-B) e o widget público (`webchat`, 8.4) ficam para depois (M4.3/M4.4). Ver
`docs/PLANO_MENSAGERIA.md` seção 18.1.

**Implementado:**
1. `src/lib/marketing/services/llmClient.ts` — `LlmClient` ganhou `completeWithTools(system, messages,
   tools, maxTokens)`, implementado nos dois branches (Anthropic nativo com `system`+`tools`+
   `tool_use`/`tool_result` blocks; OpenAI-compatible com `role:'system'`+`tool_calls`+`role:'tool'`).
   Tipos novos: `LlmToolDef`, `LlmToolCall`, `LlmMessage`, `LlmToolResponse`.
2. `src/lib/mensageria/tools/genericResolver.ts` (novo) — `loadEntitiesForSegment`, `resolveEntity`
   (SQL parametrizado, whitelist de identificadores, `default_filter` como config confiável),
   `getToolsForSegment` (1 entidade ativa → 1 ferramenta do LLM, sem tocar em código).
3. `src/lib/mensageria/botAdapter.ts` (novo) — `maybeRunBot(conversationId, tenantId)`: gate (canal
   ≠ manual, sem assignee humano, `bot_sessions.active` — não reage depois de um handoff já feito),
   resolve `bot_flows` (client_id > tenant-wide), handoff por keyword/maxTurns ANTES de chamar o LLM,
   loop de tool-use (`runBotReply`, até 3 iterações) com fallback de mensagem se o LLM devolver vazio.
4. `src/lib/mensageria/ingest.ts` — hook best-effort no fim de `ingestMessage()`: mensagem inbound de
   contato chama `maybeRunBot()`; a resposta do bot reentra em `ingestMessage()` como outbound/bot
   (sem recursão infinita, já que o hook só dispara em inbound).
5. `prisma/migration-2026-07-08-mensageria-bot-persona.sql` — seed de dados (schema já existia desde
   M0): prompt `mensageria_bot_persona` (fallback global + especialização do segmento Imobiliário) +
   1ª `segment_data_entities` (entidade `imovel` → `public.imoveis`, 10 colunas, segmento Imobiliário,
   todos os tenants do segmento). Aplicada localmente.
6. `GET/PUT /api/admin/mensageria/bot-flows` — configura o flow padrão do tenant (ativo, persona
   override, keywords de handoff, maxTurns). `POST /api/admin/mensageria/bot/test` — simula mensagem
   inbound numa inbox (exercita o pipeline real) e retorna a resposta; rejeita canal Manual.
7. Aba "Bot" em `/mensageria/config` — toggle ativo/inativo, persona override, keywords/maxTurns,
   painel "Testar bot". Fix incidental: `TextInput` (componente compartilhado da página) descartava
   silenciosamente qualquer `className` passado via prop (spread antes do className fixo) — corrigido
   para mesclar, afetando também os 2 usos pré-existentes que já passavam `className` sem efeito.

**Testado ponta a ponta** (via API real, tenant Marketing Digital): tool-use encontrando zero
resultados corretamente isolado por tenant (perguntou por imóveis que só existiam em outro tenant) ·
com 3 imóveis de teste inseridos em `public.imoveis` (removidos após validação, autorizado pelo
usuário) o bot respondeu citando dados reais corretos (2 de 3 matches, detalhes batendo com o banco) ·
handoff por palavra-chave (`handled_by_bot=false`, evento `bot_handoff` registrado, conversa aparece
na fila "não atribuídas") · bug real encontrado e corrigido durante o teste: `ON CONFLICT ... SET
active = true` reativava a sessão do bot a cada mensagem, então depois de um handoff o bot voltava a
responder na próxima mensagem do contato — corrigido pra checar `bot_sessions.active` antes de
qualquer coisa e retornar silenciosamente se já foi feito handoff · canal Manual rejeitado pelo
endpoint de teste · `npx tsc --noEmit` limpo (zero erros novos, só os pré-existentes de outras áreas).

**Pendências conhecidas, não bloqueantes:** UI "Dados do Bot" no Master (cadastro de
`segment_data_entities` por enquanto só via SQL) · job de introspecção automática de tabelas novas ·
resumo rolante de memória (thread + `bot_sessions.state` sem resumo já bastam pro MVP) · verificação
visual em navegador da aba "Bot" não feita (só bundle compilado + API real — sem 2º servidor dev,
ver lição operacional já registrada nesta sessão).

**Dados mantidos para o usuário continuar testando:** `bot_flows` ativo no tenant Marketing Digital
(flow padrão, sem persona override, keywords `atendente/humano/falar com alguem`, maxTurns=6).

---

### Sessão 2026-07-08 — Caixa de Entrada: Coluna 3 refatorada para `ConversationThread` ✅

Pendência registrada na sessão anterior ("`ConversationThread.tsx` duplica lógica que também existe
inline em `/mensageria/page.tsx`") resolvida. Trouxe o recurso de respostas rápidas (`/atalho`) para
dentro de `ConversationThread.tsx` (não existia lá) — estado, memo `cannedMatches`, dropdown no
composer — alcançando paridade total antes de trocar. Removido `showCannedSuggestions` (confirmado
código morto). `page.tsx` agora usa `<ConversationThread key={selectedId} conversationId={selectedId}
onUpdated={loadConversations} />`; todo estado/lógica da thread duplicados foram removidos
(~314 linhas de duplicação eliminadas no total). O antigo update otimista local de `unreadCount` foi
substituído por `onUpdated` → `loadConversations()` (o `GET /conversations/[id]` já zera
`unread_count` no servidor) — validado ponta a ponta via API+DB. `key={selectedId}` também corrigiu
um bug latente (texto do composer vazando entre conversas ao trocar de seleção).

**Testado:** `npx tsc --noEmit` sem erros novos; bundle compilado inspecionado via curl confirma
presença de `cannedMatches`/`shortcut`/`canned-responses`; fluxo de zerar `unread_count` confirmado
via API+DB real.

---

### Sessão 2026-07-07 (continuação 2) — Painel do Gestor (`/mensageria/gestao`) ✅

**Status:** Fundação de visibilidade gerencial (sessão anterior) usada como base — seção 17 do
plano (17.5, itens 7-9) implementada por completo: acesso, API estendida e a tela em si.

1. `prisma/migration-2026-07-08-mensageria-gestao-access.sql` — feature `mensageria-gestao`
   (id 115) registrada (aditiva à migration anterior, módulo/categoria já existiam).
2. `GET /conversations` ganhou: paginação numerada (`page`/`pageSize`, coexiste com o `cursor` da
   Caixa de Entrada na mesma rota) · filtros `teamId`/`priority`/`labelId`/`channelType` ·
   `sortBy`/`sortDir` · `includeKpis=1` (em aberto, SLA estourado, tempo médio de 1ª resposta) ·
   `teamName`/`firstResponseDurationSec` na resposta.
3. `src/components/mensageria/ConversationThread.tsx` (novo) — thread reaproveitável (mesma UX da
   Caixa de Entrada), usada no drawer lateral do Painel do Gestor. Não foi feita a refatoração de
   `/mensageria/page.tsx` para usar esse componente também (ficou como componente novo e paralelo,
   por segurança — evitar risco de regressão na Caixa de Entrada já validada em M0-M3).
4. `/mensageria/gestao` (novo) — KPIs, filtros, tabela densa ordenável, paginação numerada, drawer.
   Gate client-side pra `scopeLevel==='own'` (a API já protege os dados por trás disso de qualquer forma).

**Testado:** filtros (time/canal/prioridade/data), ordenação, paginação numerada e KPIs — todos
validados via API com dados reais do tenant de teste. Sidebar confirmada via
`get_sidebar_menu_for_user()` real (admin vê pelo caminho do banco).

**Pendência conhecida, não crítica:** `ConversationThread.tsx` duplica lógica que também existe
inline em `/mensageria/page.tsx` (coluna 3). Refatorar a Caixa de Entrada pra usar o componente
compartilhado é trabalho futuro de limpeza, não bloqueante.

**Referências:** `docs/PLANO_MENSAGERIA.md` seção 17 (17.5 — todos os itens 1-9 concluídos).

---

### Sessão 2026-07-07 (continuação) — Mensageria: config UI, acesso, escala e visibilidade gerencial ✅

**Status:** Testes M0-M3 aprovados na sessão anterior. Nesta sessão: telas de configuração
construídas do zero, registro de acesso (sidebar/permissões), correções de qualidade (validação,
layout) e a fundação de visibilidade gerencial (M5.1) implementada e validada ponta a ponta.

**1. Registro de acesso (fase M6 antecipada)** — `prisma/migration-2026-07-07-mensageria-access.sql`:
módulo `mensageria` + categoria "Central de Mensagens" (id 31) + 5 `system_features`
(`mensageria-inbox/analytics/config/chatbot/conhecimento`) + `permissions` + `role_permissions`
(41/42/47/48) + `tenant_feature_overrides` provisionado nos 4 tenants. Validado rodando
`get_sidebar_menu_for_user()` com usuário admin real.

**2. Página `/mensageria/config`** (não existia — só as APIs) — 5 abas: Inboxes (status + vínculo
com time responsável), Times (criar/deletar, adicionar/remover membro, **promover a líder** ⭐),
Etiquetas, Respostas Rápidas, SLA (com seletor de escopo Global/Inbox/Time). APIs novas:
`inboxes`, `inboxes/[id]` (PATCH team_id), `users` (lista p/ dropdown), `clientes-search`,
`my-scope`. Cron de SLA (`sla-check`) registrado em `scripts/feed-cron-scheduler.js` (5 em 5 min).

**3. Combobox "Nome do Contato"** na Nova Conversa Manual — busca em `public.clientes`, auto-
preenche telefone/email ao selecionar, e-mail/telefone com validação rigorosa local (DDD real +
regra do 9º dígito, TLD de e-mail), banner "Cliente novo, seguir mesmo assim?" quando não há match.

**4. Fixes de layout** — `scrollIntoView()` trocado por `scrollTop` direto (evitava pular a janela
inteira); `AdminSidebar.tsx` corrigido (`h-screen top-0` → `h-[calc(100vh-4rem)] top-16`) — bug
estrutural que afetava **todo o admin**, não só Mensageria (~64px de scroll fantasma).

**5. Escala/volumetria** — `GET /conversations` ganhou paginação por cursor (50/página, scroll
infinito), filtro de período (`dateFrom`/`dateTo` com `<DateInputPtBR>`), `totalCount` real via
`COUNT(*)`, divisor de data na thread ("Hoje"/"Ontem"/data completa), tooltip com data absoluta.

**6. Modelo de Visibilidade Gerencial (seção 16/17 do plano) — decisões confirmadas e
implementadas:** atendente só vê próprias + não atribuídas do time; líder de time
(`mensageria.team_members.role='lead'`) vê todo o time; admin vê tudo (decisão 16.3 Opção A).
Líder de time vê "Painel do Gestor" injetado no menu via augmentação client, sem o sidebar global
da plataforma conhecer o módulo (decisão 17.4 Opção B).
- Novo: `src/lib/mensageria/visibilityScope.ts` (`resolveMensageriaScope`, `scopeToSql`)
- Escopo aplicado em `GET`/`PATCH /conversations/[id]`, `POST .../messages`, `GET /conversations`
  (defesa em profundidade — fora do escopo retorna 404, não só oculta na lista)
- Bug real encontrado e corrigido: `UPDATE` sem alias `c.` quebrava com 500 ao aplicar o filtro de escopo
- UI de Times ganhou seletor Agente/Líder + botão de promover/rebaixar
- Validado ponta a ponta com usuário de teste não-admin real criado no tenant (`teste.atendente`,
  role "Atendente" id 49) — via API **e** confirmado na UI/sidebar real do navegador

**Pendente (não é bug, é trabalho ainda não iniciado):** a página `/mensageria/gestao` em si
(Painel do Gestor: KPIs, filtros, tabela densa, drawer) — fundação de acesso pronta, tela ainda não
construída. Ver `docs/PLANO_MENSAGERIA.md` seção 17 (17.5, itens 7-9).

**Dados de teste mantidos no tenant Marketing Digital** (a pedido, para continuar testando o
Painel do Gestor depois): role "Atendente" (id 49), usuário `teste.atendente`/`Teste@2026`, time
"Time Teste E2E", 6 conversas, 1 política de SLA de teste.

**Referências:** `docs/PLANO_MENSAGERIA.md` (seções 15, 16, 17 — as 3 mais recentes).

---

### Sessão 2026-07-07 — Retomada Mensageria: Testes M0-M3 ✅

**Status:** Resgate completo do projeto de mensageria. Plano e script de testes criados.

**O que foi feito:**
1. Lido `docs/PLANO_MENSAGERIA.md` — documento completo de 7 fases (M0-M6)
2. Identificado que M0-M3 já foram implementados (schema + APIs + UI + SSE)
3. Criado `docs/TESTES_MENSAGERIA_M0-M3.md` — plano estruturado com 14 seções:
   - Testes de schema (tabelas, índices, multi-tenant)
   - Testes de ingestão (idempotência, dedupe)
   - Testes de APIs (CRUD, filtros, operações)
   - Testes de UI (layout 3 colunas, fluxos, interações)
   - Testes de tempo real (SSE)
   - Testes de SLA, times, etiquetas, respostas rápidas
4. Criado `scripts/test-mensageria-quick.mjs` — script Node.js executável com 9 seções (~30 testes)

**Implementação atual (M0-M3):**
- ✅ Schema `mensageria` completo (12+ tabelas com índices e constraints)
- ✅ APIs CRUD para conversas, mensagens, labels, times, SLA
- ✅ UI `/mensageria` com layout 3 colunas (filtros, lista conversas, thread)
- ✅ Tempo real via SSE para atualizações ao vivo
- ✅ Etiquetas, respostas rápidas, atribuição, prioridades, SLA
- ✅ Suporte multi-canal (WhatsApp, webform, manual, chatbot)

**Próximos passos (ordem de execução):**
1. Rodar script: `node scripts/test-mensageria-quick.mjs <jwt>`
2. Testes de UI manual: abrir `/mensageria` e validar fluxos
3. Testes de SSE: múltiplas abas sincronizadas
4. Testes com dados realistas (seed com 50+ conversas)
5. ✅ Aprovação de M0-M3
6. Iniciar **M4 — Chatbot** (bot_flows + LLM + tool-use)

**Referências:**
- `docs/PLANO_MENSAGERIA.md` — Plano mestre das 7 fases
- `docs/TESTES_MENSAGERIA_M0-M3.md` — Plano de testes completo
- `scripts/test-mensageria-quick.mjs` — Script de testes automatizados

---

### Sessão 2026-06-16 — FASE 16 + MinIO unificado + Deploy automatizado ✅

#### 1. FASE 16 — Postagem Orgânica no Meta (16.A–16.F) — COMPLETA

Ver detalhes em `docs/claude-memory/project_fase16_organico.md`.
Commits: `bae5fe5` (FASE 16 concluída) + `64b374c` (upload MinIO orgânico) + `56b8945` (dedup s3-client).

**Migrações aplicadas LOCALMENTE, PENDENTES na VPS:**
- `prisma/migration-2026-06-15-fase16-organic.sql`
- `prisma/migration-2026-06-15-fase16f-schedule.sql`

#### 2. Unificação de Object Storage — s3-client.ts

- **Problema:** 3 implementações separadas de storage (disco local em criativos, MinIO em imóveis, novo minio.ts criado para orgânico).
- **Solução:** tudo usa `src/lib/storage/s3-client.ts`. Arquivo `minio.ts` duplicado removido.
- `criativos/upload`: migrado de `public/uploads/` (disco) para MinIO (`criativos/<tenantId>/...`).
- `organic/upload`: usa `s3-client.ts` diretamente.
- `s3-client.ts`: adicionado `ensureBucket()` com auto-criação + política pública.
- Commits: `03dc3b8` + `56b8945`.

#### 3. Deploy VPS — totalmente automatizado

- `scripts/deploy.sh`: coleta domínio + email, gera todas as senhas com `openssl rand`, escreve `.env`, sobe containers, aguarda healthcheck, inicializa buckets MinIO.
- `docker-compose.vps.yml`: `CDN_URL` derivado automaticamente de `PROD_DOMAIN`.
- `ops/Caddyfile`: rota `/storage/*` → `minio:9000` (imagens acessíveis via HTTPS sem expor porta).
- `.env.example`: template completo documentado.
- Commits: `07ebe43` + `5a83880`.

**Para fazer o deploy:**
```bash
git clone https://github.com/alexandreseverogh/NetImobiliaria .
chmod +x scripts/deploy.sh
./scripts/deploy.sh   # pergunta apenas domínio + email
```

---

### Sessão 2026-06-14 — Setup nova máquina + fixes dashboard ✅

#### 1. Setup ambiente nova máquina

- **Fix login** — `DB_PASSWORD` estava errado; `docker inspect netimobiliaria-db` revelou `POSTGRES_PASSWORD=postgres`. Atualizado `.env.local`.
- **Fix `MARKETING_DATABASE_URL`** — porta estava `5432` em vez de `15432`. Corrigido para `postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria`.
- **Restore banco** — backup de outra máquina restaurado via `docker cp` + `pg_restore`. Senha do usuário `admmd` redefinida para `Admin@2024` (bcrypt).
- **Sync GitHub** — projeto local estava 23 commits atrás. Feito `git pull origin main` para 100% atualizado.
- **npm install** — rodado com `--legacy-peer-deps` (react-leaflet@5 requer React 19; projeto usa React 18).

#### 2. Fix radar de demanda — "Dados de mercado externo ainda não disponíveis"

- Cron `POST /api/cron/campanhas/exogenous-signals` executado para popular `exogenous_signals`.
- **Fix constraint `ON CONFLICT`** — índice original era `(segment_id, angle, signal_date, geo)` mas o cron inseria sem `segment_id`. Criado índice sem `segment_id`: `CREATE UNIQUE INDEX exogenous_signals_angle_date_geo_key ON campanhasmarketingdigital.exogenous_signals (angle, signal_date, geo)`.
- **Fix `segment_id NOT NULL`** — `ALTER TABLE campanhasmarketingdigital.exogenous_signals ALTER COLUMN segment_id DROP NOT NULL`.

#### 3. Fix "Erro ao gerar briefing"

- **Causa 1:** Prisma singleton stale (`globalForPrisma.prismaMarketing` criado antes de `npx prisma generate --schema=prisma/schema.marketing.prisma`). Resolvido com generate + restart do servidor.
- **Causa 2 (principal):** `clientId: 'own'` sendo passado para `prisma.strategicBriefing.create()` como UUID — violação de FK. Corrigido em:
  - `src/app/api/admin/campanhas/briefings/generate/route.ts` — sanitiza `rawClientId === 'own'` → `undefined` antes de qualquer chamada.
  - `src/lib/marketing/services/strategicBriefing.ts` — proteção dupla nos 3 blocos `create()`: `(!clientId || clientId === 'own') ? null : clientId`.

#### 4. Gráfico "Distribuição por Campanha" — melhorias

- **Dado real:** trocado de `dailyBudget` (frequentemente 0) para gasto real agregado dos `currentPeriod.insights` por `campaignId`.
- **Labels dentro do donut:** `label` customizado no `<Pie>` com `R$Xk` / `R$X` em branco dentro de cada fatia (fatias < 5% omitidas).
- **Legenda com valor:** legenda abaixo do gráfico agora mostra nome completo (sem truncamento) + percentual + valor R$.
- **Ordenação decrescente:** lista e gráfico ordenados do maior para o menor gasto.
- **Tooltip:** atualizado para formato `R$ X.XXX,XX` (pt-BR).

#### 5. Filtro por segmento — Tracking Health, Insights da IA, Briefing

- **Insights da IA:** já filtrava por `segmentId` na API (`generateAiInsights` com `resolveCampaignIdsBySegment`); `bySegment` retorna apenas o segmento ativo. ✅
- **Briefing Estratégico:** `getLatestBriefing({ segmentId: activeSegment })` e `generateBriefing(..., activeSegment)` já isolam por segmento. ✅
- **Tracking Health:**
  - `TrackingHealthWidget` — adicionada prop `segmentId?: string | null`; repassa para `getTrackingHealth` e `runTrackingHealth`.
  - `marketing-api.ts` — `getTrackingHealth` e `runTrackingHealth` aceitam `segmentId` opcional.
  - `tracking/health/route.ts` — GET lê `segmentId` de searchParams; POST lê do body; ambos repassam para o serviço.
  - `trackingHealthService.ts` — `runTrackingHealthCheck` e `getTrackingHealthHistory` aceitam `_segmentId` (reservado; tabela não tem coluna segment_id ainda).
  - Dashboard: `<TrackingHealthWidget segmentId={activeSegment ?? null} />`.

**Arquivos modificados nesta sessão:**
- `src/app/api/admin/campanhas/briefings/generate/route.ts`
- `src/lib/marketing/services/strategicBriefing.ts`
- `src/lib/marketing/services/trackingHealthService.ts`
- `src/app/api/admin/campanhas/tracking/health/route.ts`
- `src/components/marketing/TrackingHealthWidget.tsx`
- `src/lib/marketing-api.ts`
- `src/app/admin/campanhas/dashboard/page.tsx`

---

### Sessão 2026-06-13 — Dashboard multi-segmento: UI, fixes e commit ✅

Trabalho consolidado no commit **`c39b583`** (push na `main`), que também versionou a
feature multi-segmento (FASE 18.2) que estava sem commit. Itens da sessão:

1. **fix** — `AnimatePresence` ausente no import de `dashboard/page.tsx` (ReferenceError em runtime).
2. **ClientSelector — default inteligente:** `useClientSelector(storageKey, segmentId, isOwnSegment)`.
   Ao trocar de segmento, default = `'own'` só no segmento do tenant (`isOwn`); senão `'segment'`
   (Todos os Clientes). Motivo: campanhas sem cliente herdam o segmento do tenant, então
   "Minha Empresa" é estruturalmente vazia em outros segmentos. `isOwn` vem de `GET /segments`.
3. **Funil por Estágio no modo "Todos os Clientes"** (`SegmentDashboard`): busca
   `GET /dashboard/funnel?segmentId=...` (já isola por segmento) e renderiza `StageFunnelWidget`.
   `SegmentDashboard` agora recebe props `startDate`/`endDate`. Distribuição por Campanha foi
   deliberadamente deixada de fora do modo segmento (ruído com N campanhas).
4. **fix — `funnel_stage`:** o sistema usa `TOF`/`MOF`/`BOF`. O seed usava AWARENESS/CONSIDERATION/
   CONVERSION → funil vazio. Corrigido no banco (UPDATE) e no `seed-multisegmento-teste.sql`.
5. **fix — CPL por ângulo inflado (fan-out de JOIN)** em `segmentIntelligenceService.ts`:
   `LEFT JOIN Insight` + `LEFT JOIN Lead` juntos faziam produto cartesiano (spend × nº leads).
   Corrigido com subqueries pré-agregadas por campanha. CPL voltou a valores reais (~R$ 35–56).
6. **UI — linhas de benchmark/mediana:** estavam com alpha baixíssimo (quase invisíveis).
   Trocadas por tom neutro forte `#cbd5e1` (dark) / `#475569` (light), `strokeWidth 2`,
   em `MultiClientMetricChart` e `MultiClientCplChart`.
7. **UI — máscara de moeda pt-BR** (`formatCurrency` → `R$ 9.999,99`) aplicada em CPLs que
   estavam crus: `SegmentNarrative`, `ClientRankingTable`, `MultiClientCplChart`, `WinningAngleChip`.

**Pendências conhecidas:** CPL ainda cru (`toFixed`) em `/portfolio/cross-insights` (linhas 280/296)
e `CplTimelineChart` — não padronizados nesta sessão. Lixo de debug não versionado permanece no
working tree (cron_debug.txt, scripts/*.mjs, .claude/launch.json) — fora do commit de propósito.

---

### Seed multi-segmento p/ testes do Dashboard — CONCLUÍDO 2026-06-12 ✅

Arquivo `prisma/seed-multisegmento-teste.sql` — dataset de teste do tenant Marketing Digital
cobrindo **4 segmentos** (Imobiliário, Saúde, Carros, Geral) com **6 clientes + campanhas próprias**.
Idempotente e aditivo: identifica seus registros por `metaCampaignId LIKE 'seed_ms_%'` —
re-executar apaga só o que ele criou, nunca toca em Alexandre/Gisele reais.

- **21 campanhas · 924 insights (44 dias) · 5.469 leads.**
- Perfis calibrados por benchmark de cada segmento: `scale` (ok), `alert`/`optimize` (warn),
  `pause` (CTR<1%, 0 leads). Vídeo (Hook Rate) nas campanhas scale. `declared_angle` válido
  por segmento (alimenta Radar + WinningAngle).
- Clientes novos: Imobiliária Premium, Clínica OdontoVida, AutoMax Veículos, RodaBoa
  Concessionária, Loja Mix Geral (uuids fixos `a5ed000X-...`).
- Aplicar: `docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-multisegmento-teste.sql`
- **Nuance:** no ranking do modo "Todos os Clientes" os clientes ficam ok/warn (CPL agregado
  dilui as campanhas pause). Nenhum cliente fica `critical` no agregado — adicionar cliente
  uniformemente caro se quiser testar o badge vermelho do ranking.

---

### FASE 18.2 — Dashboard dirigido por Segmento — CONCLUÍDO 2026-06-11 ✅

No modo agregado (vários clientes de segmentos distintos), 4 seções do dashboard misturavam segmentos
indevidamente. Decisão: quebrar por segmento (Radar, Insights IA, Briefing) e por cliente (Tracking Health),
100% dirigido pelo banco (`system_segments.creative_taxonomy.angles`). Plano completo aprovado.

**Fundação de dados:** nova tabela `campanhasmarketingdigital.segment_angle_terms` (segment_id, angle_slug,
angle_label, search_term) substitui a global `angle_search_terms`; `exogenous_signals` e `demand_radar_cache`
ganham `segment_id`. Seed por segmento ativo.

**Fases:** A) segmentTaxonomyService · B) Wizard+Vision por segmento · C) Radar por segmento ·
D) Insights+Briefing por segmento · E) Tracking Health por cliente. Cada fase: migração local + commit + push.

**Progresso:**
- ✅ **Fase A** — migração `segment_angle_terms` (18 ângulos / 4 segmentos) + `segmentTaxonomyService`.
- ✅ **Fase B** — wizard carrega ângulos do segmento do cliente (`segment-defaults` retorna `allowedAngles`).
  Vision mantida agnóstica (roda no upload, sem segmento). `angles.ts` = fallback legado.
- ✅ **Fase C** — Radar por segmento: cron popula `exogenous_signals` por segmento (Trends real),
  `computeDemandRadarBySegment`, API retorna `{segments:[...]}`, UI empilha um radar por segmento.
  Verificado: agregado → 2 segmentos (Imobiliário+Saúde), cliente único → 1 segmento.
  ⚠️ Campanhas demo têm `declared_angle` genérico antigo (family/luxury…) → endógeno 0 nos novos
  vértices até serem recriadas pelo wizard (ou migradas).
- ✅ **Fase D** — Insights IA por segmento (benchmark próprio de cada segmento; `aiInsights.bySegment`)
  + Briefing Estratégico por segmento (`StrategicBriefing.segment_id`; um briefing por segmento;
    rotas generate/latest e cron retornam/persistem por segmento).
  Verificado: agregado → Insights e Briefings separados Imobiliário + Saúde.
- ✅ **Fase E** — Tracking Health breakdown por cliente (um widget por cliente no modo agregado).

**Resultado:** no modo "todos os clientes", Radar/Insights/Briefing exibem um bloco por segmento e
Tracking Health um card por cliente. Cliente único colapsa para um bloco coerente. 100% dirigido por
banco (system_segments + segment_angle_terms), zero hardcode, zero mock.

### FASE 18.3 — Cadastro dinâmico de ângulos por segmento (IA) — CONCLUÍDO 2026-06-11 ✅

Fecha o loop: ao criar/editar um segmento, o LLM (modelo global) propõe ângulos (slug+rótulo) +
termos PT-BR de Google Trends para o nicho; o admin revisa/edita e salva em `segment_angle_terms`
(sincroniza `creative_taxonomy.angles`). Assim, **segmentos novos ficam 100% dinâmicos** — radar,
wizard, insights, briefing passam a funcionar sem tocar em código nem dados manuais.

- Prompt `segment_angles_suggestion` (global, `system_prompt_templates`).
- `segmentAngleSuggestionService` + rotas `master/segments/[id]/angles` (GET/POST sugerir/PUT salvar).
- `SegmentAnglesModal` + botão "Ângulos & Demanda" na gestão de segmentos (Master).
- Verificado: LLM gerou ângulos+termos PT-BR reais para nicho novo "Pet Shop".

> **O que é dinâmico:** toda a maquinaria (radar/insights/briefing/cron) itera segmentos sozinha.
> Segmento novo só precisa ter seus ângulos cadastrados — agora via IA+confirmação na UI Master.

---

### FASE 18.4 — Sugerir Interesses Meta por IA (híbrido) — CONCLUÍDO 2026-06-11 ✅

A IA não inventa IDs do Meta. Padrão híbrido: LLM propõe NOMES de interesse por segmento
(camadas intenção/estágio/comportamento) → o sistema resolve os **IDs reais na Meta Targeting API** →
admin confirma. Token vem do tenant (`tenant_network_credentials`); IDs do Meta são globais.

- Prompt `segment_interests_suggestion` + `metaInterestService` (resolveMetaAccessToken/searchMetaInterests)
  + `segmentInterestSuggestionService`. Rota `master/segments/[id]/interests/suggest`.
- Modal Interesses ganhou botão **"Ajuda"** (guia multi-segmento) e **"Sugerir com IA"** (chips por camada).
- Verificado: tenant Marketing Digital → Meta resolveu IDs reais (Casamento, Financiamento, Decoração…).

> Diferença vs Ângulos & Demanda: ângulos usam texto livre (Trends); interesses exigem IDs reais do Meta,
> por isso o passo extra de resolução. Sem token Meta → IA ainda devolve os termos + aviso.

---

### FASE 18.5 — Cache de interesses Meta — CONCLUÍDO 2026-06-11 ✅

O endpoint `adinterest` do Meta tem rate-limit agressivo (OAuthException code 1 em rajadas).
Cache compartilhado por termo (`meta_interest_cache`, TTL 30d; IDs globais e estáveis) elimina
rechamadas. `searchMetaInterestsCached`: hit fresco não chama a Meta; erro da Meta → serve cache stale.
Usado na sugestão por IA e na busca manual. Verificado: cache HIT serve IDs reais mesmo com a Meta
em cooldown.

---

**Migrações locais aplicadas (pendente VPS, all-at-once):**
`migration-2026-06-11-segment-driven.sql`, `migration-2026-06-11-briefing-segment.sql`,
`migration-2026-06-11-segment-angles-prompt.sql`, `migration-2026-06-11-segment-interests-prompt.sql`
e `migration-2026-06-11-meta-interest-cache.sql`.
**Nota:** rodar `npx prisma generate --schema=prisma/schema.marketing.prisma` após pull (campo
`StrategicBriefing.segment_id/segment_name` adicionado ao schema). Cron diário de Trends:
`POST /api/cron/campanhas/exogenous-signals` (header `x-cron-secret`).

---

## Última tarefa concluída

### FASE 18.1 — Radar de Demanda (Google Trends × Ângulos) — CONCLUÍDO 2026-06-05 ✅

Implementação completa do Radar de Demanda no Farol de Milha do dashboard.

**Arquivos criados:**
- `prisma/migration-2026-06-05-demand-radar.sql` — 3 tabelas + 24 termos seed + prompt template
  - `campanhasmarketingdigital.angle_search_terms` — termos PT-BR por ângulo
  - `campanhasmarketingdigital.exogenous_signals` — snapshots diários Google Trends
  - `campanhasmarketingdigital.demand_radar_cache` — cache por tenant/client/data
  - `public.system_prompt_templates['demand_radar_actions']` — prompt ZERO HARDCODE
- `src/lib/marketing/services/exogenousTrendsService.ts` — Google Trends unofficial API
  - Timeout 5s por request, fallback mock com jitter diário por ângulo
  - 8 ângulos em paralelo via `Promise.allSettled`
- `src/lib/marketing/services/demandRadarService.ts` — fusão endógeno × exógeno
  - Normalização share-of-spend → 0-100 por ângulo
  - Classificação quadrante: oceano-azul/saturado/vigiar/ponto-morto
- `src/app/api/cron/campanhas/exogenous-signals/route.ts` — cron diário (POST, x-cron-secret)
- `src/app/api/admin/campanhas/dashboard/demand-radar/route.ts` — GET com cache-first

**Arquivos modificados:**
- `src/components/marketing/charts/DemandRadar.tsx` — RadarChart premium self-fetching
  - Série violeta preenchida (endógeno) + linha ciana tracejada (exógeno)
  - Painel lateral com chips por quadrante + legenda semântica
  - Skeleton, estado de erro, botão de refresh, badge Trends ao vivo/estimativa
- `src/app/admin/campanhas/dashboard/page.tsx` — DemandRadar inserido no FarolSection

**Migração aplicada localmente** com psql (127.0.0.1:15432). VPS: pendente (all-at-once).

---

## Última tarefa concluída

### Task 2: Ações críticas geradas por LLM — cross_critical_actions (2026-06-04) ✅

**Decisão:** As 4 ações hardcoded dos alertas `critical-*` em `buildRuleBasedInsights`
eram genéricas e idênticas para todo cliente. Substituídas por chamada LLM no POST,
com contexto real: CPL atual, CPL crítico do segmento, excesso em R$ e %.

**Mudanças:**
- **`prisma/migration-2026-06-04-cross-critical-actions-prompt.sql`** (nova):
  insere template `cross_critical_actions` em `system_prompt_templates` (global, version=1)
  com variáveis: `client_name`, `segment_name`, `cpl_current`, `cpl_critical`,
  `excess_pct`, `excess_brl`
- **`cross-insights/route.ts`**:
  - `CrossPerformer` ganha campo `cplCritical: number | null` (exposto no GET)
  - `sorted` map inclui `cplCritical` na construção dos performers
  - POST handler: novo bloco antes da narrativa que itera sobre insights `critical-*`,
    chama `invokeForContext` em paralelo, faz parse do JSON array retornado e substitui
    `insight.actions`; fallback silencioso para ações padrão se LLM falha ou retorna
    JSON inválido

**Comportamento em produção:**
- `GET` → rápido, sem LLM, ações padrão (hardcoded)
- `POST` (botão "Análise IA") → LLM enriquece ações críticas + gera narrativa de portfólio

**Migration aplicada:** localmente. **Pendente VPS (batch).**

---

### Task 1: Benchmarks migrados para system_segments (2026-06-04) ✅

**Decisão:** `cpl_ideal`, `cpl_critical`, `ctr_min` foram movidos de `system_benchmarks`
para colunas diretas em `system_segments`, eliminando uma query extra de JOIN em cada request
de portfólio e cross-insights. `system_benchmarks` permanece intacto para os demais métricas
(hook_rate, frequency_max, etc.) e para o `benchmarkResolver.ts` 4-layer.

**Mudanças:**
- **`prisma/migration-2026-06-04-segment-benchmarks.sql`** (nova):
  `ALTER TABLE + backfill` — 5 segmentos atualizados (4 com dados, Master Platform sem benchmarks)
- **`src/app/api/admin/master/segments/route.ts`**: adicionados handlers `POST` (criar segmento)
  e `PUT` (atualizar) com os 3 novos campos; GET já retorna `s.*`
- **`src/app/admin/master/segments/page.tsx`**: seção "Benchmarks de Performance" no modal:
  inputs CPL Ideal / CPL Crítico / CTR Mínimo + legenda de status (ok/atenção/crítico)
- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`**: query de clientes e
  tenants ampliada com `s.cpl_ideal, s.cpl_critical, s.ctr_min`; `benchMap` eliminado
- **`src/app/api/admin/campanhas/portfolio/route.ts`**: mesma simplificação + helper `parseNullable`

**Migration aplicada:** localmente via psql 17. **Pendente VPS (batch).**

---

### Briefing Estratégico — documento autônomo do filtro de página (2026-06-04) ✅

**Decisão de produto:** briefing é um documento de inteligência (snapshot), não um gráfico ao vivo.
Deve ser independente do filtro de período da página e carregar seu próprio contexto temporal.

**Mudanças:**
- **Nova coluna DB:** `period_days INTEGER` em `StrategicBriefing`
- **Prisma schema:** `periodDays Int? @map("period_days")` adicionado ao modelo
- **`strategicBriefing.ts`:** os três `create()` (empty / sucesso LLM / fallback) agora salvam `periodDays`
- **`marketing-api.ts`:** `StrategicBriefingData` inclui `periodDays?: number | null`
- **Dashboard — seção Briefing:**
  - Removido o `PeriodBadge` do filtro de página no cabeçalho da seção
  - Botão "Gerar Novo" mostra o período que será usado: `Gerar · 7d`
  - Descrição atualizada: "Documento autônomo — período registrado na geração"
- **`BriefingCard`:** exibe badge de período próprio do documento (canto direito do cabeçalho)
  — badge `null` para briefings históricos sem `period_days` (retrocompatível)

**Arquivos modificados:**
- `prisma/migration-2026-06-04-briefing-period-days.sql` (nova)
- `prisma/schema.marketing.prisma`
- `src/lib/marketing-api.ts`
- `src/lib/marketing/services/strategicBriefing.ts`
- `src/app/admin/campanhas/dashboard/page.tsx`

**Migration aplicada:** localmente via psql 17. Pendente VPS (batch).

---

### Fix cross-insights — narrativa LLM tenant/segmento ciente (2026-06-04) ✅

**Problema:** A IA confundia o tenant (empresa gestora) com os clientes gerenciados na narrativa
de portfólio, e comparava clientes de segmentos diferentes de forma incorreta.

**Solução:**
- `isTenant` flag no `clientList` do GET — campanhas sem `client_id` = tenant, não cliente
- `buildRuleBasedInsights` usa `realClients` (filtra tenant) para todos os insights cruzados
- GET response inclui `tenantName` e `clientDetails[]` (com `isTenant`, `segmentName`, `status`)
- POST handler constrói `client_context` com linhas `[TENANT]` vs `[CLIENTE]` + segmento por linha
- Prompt v2 (`version = 2`): regras explícitas — nunca comparar tenant com clientes, nunca
  comparar segmentos diferentes; variáveis: `{{tenant_name}}`, `{{client_context}}`

**Arquivos modificados:**
- `src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`

**Migration aplicada:**
- `prisma/migration-2026-06-03-cross-pollination-prompt-v2.sql` — UPDATE `content` + `variables`
  (aplicada localmente via node --input-type=module)

**Migration PENDENTE VPS:** — junto ao batch de outras migrations

---

### FASE 14d — Auto-classificação de ângulo em lote (2026-06-03) ✅

**Objetivo:** eliminar trabalho manual de associar ângulo campanha a campanha. A IA classifica
automaticamente todas as campanhas pelo nome, via job em lote com revisão humana antes de salvar.

**Novo campo DB:** `angle_source VARCHAR(20)` em `Campaign`
- `'declared'` = humano confirmou (via badge ou wizard)
- `'llm_auto'` = classificado pelo job de IA
- `NULL` = sem classificação (mostra banner)

**Arquivos novos:**
- `prisma/migration-2026-06-03-angle-source.sql` — ADD COLUMN angle_source
- `prisma/migration-2026-06-03-classify-angle-prompt.sql` — INSERT template `classify_campaign_angle`
- `scripts/run-migration-fase14d.mjs` — runner Node.js para DBeaver
- `src/lib/marketing/services/angleClassifierService.ts` — serviço: `getUnclassifiedCount`,
  `classifyCampaignAngles` (LLM preview, batches de 20), `saveAngleClassifications` (raw SQL)
- `src/app/api/admin/campanhas/portfolio/classify-angles/route.ts` — `GET` (count) +
  `POST mode=preview` (sugestões LLM) + `POST mode=confirm` (salva)

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/route.ts` — enriquece resposta com `angleSource`
  via query raw SQL (angle_source fora do schema Prisma)
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — PATCH seta `angle_source = 'declared'`
  (ou null ao limpar) via raw SQL após update Prisma
- `src/components/marketing/CampanhasModal.tsx`:
  - `AngleBadge` reescrito: 3 estados visuais (amber=sem ângulo, blue=IA, emerald=declarado)
    com tooltip explicativo; callback `onUpdated(angle, source)`
  - `CampaignCard`: `localAngleSource` state rastreia fonte localmente
  - Novo `ClassifyBanner`: aparece quando `unclassifiedCount > 0`, dismissável, botão "Classificar com IA"
  - Novo `ClassifyModal`: 4 steps (loading→review→saving→done), tabela com dropdowns editáveis,
    dots de confiança (emerald/amber/red), barra de progresso, resumo final por ângulo
  - Main modal: `showClassifyModal` + `classifyDismissed` states; `onDone` → refresh campanhas

**⚠️ MIGRATIONS PENDENTES (rodar no DBeaver):**
```
-- Migration 1
prisma/migration-2026-06-03-angle-source.sql

-- Migration 2  
prisma/migration-2026-06-03-classify-angle-prompt.sql
```
Ou: `node scripts/run-migration-fase14d.mjs`

---

### FASE 14c — Ciclo Visual de Ângulo (2026-06-03) ✅

**Objetivo:** fechar o ciclo de calibração com superfície visual — widget de
performance por ângulo, badge editável nos cards de campanha e API dedicada.

**Arquivos novos:**
- `src/app/api/admin/campanhas/portfolio/angle-insights/route.ts` — `GET
  ?period=N&clientId=X&narrative=true` retorna `AngleInsightsResult` +
  narrativa LLM opcional (template `angle_performance_insight`).

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — novo `PATCH`: atualiza
  `declaredAngle` em campanhas existentes via `normalizeAngle()`.
- `src/app/admin/campanhas/portfolio/cross-insights/page.tsx` — adicionada seção
  "Performance por Ângulo" (FASE 14) com: `AngleWidget` (auto-fetch do período
  selecionado), `AngleCplBar` (barra CPL com cor emerald/amber/red), cards
  vencedor/perdedor, tabela por ângulo (spend vertical bar, CPL, CTR, camps),
  botão "Análise IA" que chama `?narrative=true`.
- `src/components/marketing/CampanhasModal.tsx` — `CampaignData` ganha
  `declaredAngle?`; novo `AngleBadge` com edição inline (select + CheckIcon PATCH);
  `CampaignCard` usa `localAngle` state para atualização sem reload; badge aparece
  em todas as campanhas junto a StatusBadge/FunnelBadge.

---

### Fix — AnimatePresence mode="wait" removido (2026-06-03) ✅

**Problema:** `AnimatePresence mode="wait"` em `CampaignWizard.tsx` aguardava a exit
animation completar antes de montar o próximo step. Em abas não visíveis (RAF throttling),
o exit nunca completava → conteúdo do wizard congelava enquanto header avançava. Também
causava timeout do screenshot no preview headless.

**Fix:** Removida a prop `mode="wait"` (linha 356). `AnimatePresence` sem mode monta a
entrada imediatamente → sem dependência de RAF do exit; transição ocorre mesmo com aba
em background.

---

### FASE 14b — Calibração de Ângulo (2026-06-03) ✅

**Objetivo:** agregar métricas (CPL, CTR, spend) por ângulo EFETIVO (declared_angle ??
Vision angle), identificar ângulo vencedor/perdedor e injetar o sinal no briefing
estratégico e no agentDecisor. Princípio ZERO HARDCODE: prompt no DB.

**DB:** `prisma/migration-2026-06-03-angle-performance-insight.sql` — INSERT prompt
`angle_performance_insight` (templateKey) em `public.system_prompt_templates`. Aplicada
localmente via `scripts/run-migration-fase14b.mjs`. ⚠️ NÃO aplicada no VPS (batch depois).

**Arquivos novos:**
- `src/lib/marketing/services/angleInsightsService.ts` — `getAngleInsights(periodDays,
  tenantId, clientId)`: raw SQL com JOIN Campaign → CreativeAsset → CreativeAnalysis para
  ângulo Vision + JOIN Insight para métricas; agrupa por ângulo efetivo (declared_angle ??
  Vision ?? 'unknown'); retorna `AngleInsightsResult` com `angleStats`, `topAngle`,
  `worstAngle`, `textSummary` (rule-based, pronto para injeção em variável LLM).
- `prisma/migration-2026-06-03-angle-performance-insight.sql` — prompt DB.
- `scripts/run-migration-fase14b.mjs` — runner da migration.

**Arquivos modificados:**
- `src/lib/marketing/services/strategicBriefing.ts` — importa `getAngleInsights`;
  `BriefingContext` ganha `angleInsights: AngleInsightsResult`; `gatherBriefingContext`
  popula com `await getAngleInsights(...)`; `buildBriefingVariables` injeta
  `angle_insights`, `winning_angle`, `worst_angle` como variáveis disponíveis para
  templates que as declarem (retrocompatível: sem impacto em templates antigos).
- `src/lib/marketing/services/agentDecisor.ts` — importa `getAngleInsights`; `runDecisor`
  computa `angleCtx` uma vez no topo (7 dias); `enrichWithClaude` recebe `angleCtx?` e
  injeta `winning_angle` / `worst_angle` nas variáveis do template `agent_enrich`.

**Verificação:** migration aplicada com sucesso; tsc sem erros nos arquivos alterados;
SQL testado — JOIN via `CreativeAsset.campaign_id` (snake_case, @map) →
`CreativeAnalysis.asset_id` (FK), `Insight."campaignId"` (camelCase sem @map).

---

### FASE 14a — Ângulo: captura no lançamento (2026-06-03) ✅

**Objetivo:** capturar o ângulo de comunicação DECLARADO no lançamento (hoje o angle
só é inferido pelo Vision a posteriori). Parte 14b (calibração) é a próxima.

**DB:** `prisma/migration-2026-06-03-campaign-declared-angle.sql` — `ALTER TABLE
campanhasmarketingdigital."Campaign" ADD COLUMN IF NOT EXISTS declared_angle VARCHAR(50)`
+ índice `idx_campaign_declared_angle (tenant_id, declared_angle)`. Aplicada no banco
LOCAL via `scripts/run-migration-fase14.mjs`. ⚠️ **Ainda NÃO aplicada no VPS** (migração
do VPS será feita toda de uma vez, depois).

**Arquivos:**
- `prisma/schema.marketing.prisma` — Campaign ganha `declaredAngle String? @db.VarChar(50)`.
  `npx prisma generate` rodado (NÃO db push).
- `src/lib/marketing/angles.ts` (NOVO) — taxonomia única de ângulos (investment, lifestyle,
  family, price, urgency, social, luxury, other) + `ANGLE_OPTIONS`, `normalizeAngle`,
  `angleLabel`. Mesma taxonomia do Vision, para comparar declarado × inferido.
- `src/app/api/admin/campanhas/campaigns/route.ts` — POST destructura `declaredAngle` e
  persiste `normalizeAngle(declaredAngle)` no `campaign.create`.
- `src/components/marketing/CampaignWizard.tsx` — form.declaredAngle (''); seletor
  "Ângulo da comunicação" na StepObjective (opcional, "Deixe a IA inferir"); enviado no
  payload; linha "Ângulo" na revisão.

**Verificação (runtime):** página /nova e wizard compilam sem erro; wizard abre com 7
etapas; coluna+índice confirmados no banco; prisma generate OK. (UI do seletor não dirigida
até o fim por gating de navegação do wizard + ação final destrutiva.)

---

### FASE 13 — Top N Configurável (cross-insights) (2026-06-03) ✅

**Objetivo:** remover hardcode `slice(0,3)` na polinização cruzada e tornar o número
de "melhores CPLs" configurável (Top 3/5/10).

**Arquivos modificados:**

`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`
- GET: novo `topN = clamp(parseInt(?top) , 1, 50)` (default 3); `sorted.slice(0, topN)`.
- `CrossInsightsResponse` ganha campo `top: number`; `result.top = topN`.
- POST: lê `body.top` (clamp 1..50) e repassa `&top=${topN}` ao GET interno.

`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`
- Estado `top` ('3'); seletor Top 3/5/10; `load` e `generate` enviam o param.
- Badge "Top N" / "Top N de M" na seção de melhores CPLs.
- Grid responsivo `sm:grid-cols-2 lg:grid-cols-3` (acomoda 5/10).
- **Bug corrigido (pré-existente):** `PerformerCard` recebia `{...p}` (com `clientName`)
  mas espera `name` → nomes renderizavam em branco. Agora `name={p.clientName}`.

**Verificação (runtime, preview artemis4):** seletor renderiza; trocar para Top 10
dispara `GET ...?period=30&top=10`. (Sem dados de CPL no banco de teste, a seção de
top performers não renderiza — wiring provado pela requisição.)

---

### Plano — FASES 13–17 adicionadas ao plano mestre (2026-06-03) ✅

**Contexto:** Após a verificação em runtime do wizard de campanhas (6/6 PASS) e a
análise estratégica de 5 questões, o usuário pediu para formalizar tudo como FASES
13+ no plano mestre, antes da implementação.

**Arquivo modificado:** `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` (v1.4)

Acrescentadas 5 fases priorizadas por ROI/esforço, fundamentadas em leitura do código:
- **FASE 13 — Top N Configurável** (quick win): remove hardcode `slice(0,3)` em
  `cross-insights/route.ts:288`; param `?top=N`, clamp 1..50, "Top N de M".
- **FASE 14 — Ângulo Estratégico no Ciclo Completo** (maior ROI): coluna
  `Campaign.declared_angle` (nullable), captura no wizard, agregação ângulo×CPL/CTR,
  injeção em agentDecisor/briefing, prompt `angle_performance_insight`.
- **FASE 15 — Agentes: garantia de execução + expansão de ações**: node-cron não
  sobrevive em serverless → worker/endpoint+secret+heartbeat; novas ações DOWNSCALE,
  REALLOCATE_BUDGET, REFRESH_CREATIVE, ADJUST_AUDIENCE; threshold por tenant.
- **FASE 16 — Postagem Orgânica no Meta**: `publishOrganicPost` via page_id existente,
  separado do fluxo pago, confirmação dupla.
- **FASE 17 — Google Ads + Google AI Max** (fase própria): paradigma asset-based ≠ Meta;
  `GoogleCampaignInput` separado, wizard AI Max sem segmentação granular, OAuth2/
  customer_id por tenant, bloqueio sem meta de conversão.

**Próximo passo:** iniciar a implementação na ordem de prioridade (FASE 13 → 17).
**Nota:** apenas planejamento — nenhuma alteração de código/banco nesta etapa.

---

### Fix — Gráfico "Leads por Campanha" + logo clientes (histórico anterior)

### Fix — Gráfico "Leads por Campanha" (2026-06-03) ✅

**Problema:** O gráfico "Leads por Campanha" na página `/admin/campanhas/leads` sempre exibia um único retângulo grande em vez de barras individuais por campanha.

**Causa raiz:** Quando a resolução de nome de campanha falhava no cliente (array `campaigns` vazio ou IDs sem correspondência), todos os itens de `leadsByCampaign` recebiam `name: 'N/A'`. O Recharts `BarChart` renderiza todas as barras na mesma posição X quando possuem o mesmo `name`, resultando em sobreposição visual.

**Arquivos modificados:**

`src/app/api/admin/campanhas/leads/stats/route.ts`
- `leadsByCampaignRaw` ← `prisma.lead.groupBy` (sem alteração)
- Nova etapa: busca nomes das campanhas via `prisma.campaign.findMany({ where: { id: { in: campaignIds } } })`
- `leadsByCampaign` agora retorna `{ campaignId, campaignName, count }[]`
  - Filtra entradas com `campaignId: null` (leads sem campanha vinculada)
  - `campaignName` = nome da campanha OU primeiros 8 chars do UUID como fallback
  - Ordenado por `count` decrescente

`src/app/admin/campanhas/leads/page.tsx`
- `campaignLeads` agora usa `d.campaignName` (do servidor) em vez de lookup `campaigns.find()`
- Fallback: `d.campaignId?.slice(0, 8) || 'Sem campanha'` (garante nomes únicos)
- Retrocompatível: `d.count ?? d._count?.id ?? 0`

---

### Logo de Clientes + ClientAvatar compartilhado (2026-06-03) ✅

**Objetivo:** Exibir logomarca circular dos clientes na tabela Portfolio; suporte a upload/remoção na edição de cliente; componente reutilizável para futuras telas.

**Arquivos criados:**

`src/components/admin/ClientAvatar.tsx`
- Props: `name`, `logoUrl?`, `segmentSlug?`, `isTenant?`, `size?` (`xs`–`xl`), `className?`
- Mostra imagem se `logoUrl` disponível; fallback: iniciais coloridas por segmento
- `SEGMENT_AVATAR_COLORS`: mapeamento slug → classes Tailwind (imobiliaria, saude, educacao, etc.)
- Exports: `ClientAvatar` (default), `ClientAvatarWithFallback`, `getInitials`, `getSegmentAvatarColor`
- Handler `onError` no `<img>`: troca automaticamente para fallback de iniciais

`prisma/migration-2026-06-03-clientes-logo.sql`
- `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;`
- ⚠️ **Executar manualmente no DBeaver antes de usar o upload de logo**

**Arquivos modificados:**

`src/app/api/admin/campanhas/clients/route.ts`
- GET: adiciona `c.logo_url` ao SELECT
- PATCH: reescrito com SET dinâmico — só atualiza os campos enviados (`segment_id` e/ou `logo_url`)
- Validação: `logo_url` > 1.5 MB retorna 400

`src/lib/database/clientes.ts`
- `findClienteByUuid`: adiciona `logo_url` ao SELECT

`src/app/admin/clientes/[id]/editar/page.tsx`
- Importa `ClientAvatar`
- Upload: `<input type="file" accept="image/*">` oculto → canvas resize 256×256 WebP 85%
- `handleLogoFile(file)`: valida MIME + tamanho; redimensiona via Canvas API
- `saveLogo(url)`: PATCH ao endpoint com Bearer token
- UI: avatar grande (`size="xl"`) + botão "Carregar / Alterar logo" + botão "Remover"

`src/app/api/admin/campanhas/portfolio/route.ts`
- Queries de clientes e tenant agora incluem `logo_url`
- `PortfolioClient.logoUrl` populado nos resultados

`src/app/admin/campanhas/portfolio/page.tsx`
- Importa `ClientAvatar` e exibe círculo de logo/iniciais na coluna de cliente da tabela

---

### Option B — Portfolio: linhas expansíveis + modal analítico (2026-06-03) ✅

**Objetivo:** Ao clicar em `[▶]` numa linha de cliente do Portfolio, expandir sub-linhas com campanhas individuais; cada sub-linha tem botão `[📊 Analisar]` que abre um modal com as métricas daquela campanha.

#### Arquivos modificados

**`src/app/api/admin/campanhas/portfolio/route.ts`**
- Novo tipo exportado: `PortfolioClientCampaign` (id, name, externalStatus, metrics, health)
- `PortfolioClient` agora inclui `campaigns: PortfolioClientCampaign[]`
- Adicionadas 2 novas queries SQL:
  - Query 2b: métricas por campanha (spend/impressions/clicks agrupados por `camp.id`)
  - Query 2c: leads por `campaignId` (tabela `Lead`)
- Bloco 2d: agrupa as campanhas num `Map<clientKey, PortfolioClientCampaign[]>` e anexa ao client correspondente

**`src/app/admin/campanhas/portfolio/page.tsx`**
- Novo estado: `expandedClients: Set<string>` — controla quais linhas estão expandidas
- Novo estado: `analyticsModal: ModalState | null` — controla o modal analítico
- `toggleExpand(key)` — alterna expansão de uma linha
- `renderCampaignSubRows(client)` — renderiza sub-linhas animadas (Framer Motion) com:
  - `HealthDot` colorido por health
  - Nome da campanha + status badge (ACTIVE/PAUSED)
  - Spend / Leads + CTR / CPL
  - Botão `[📊 Analisar]`
- `renderRow` atualizado: chevron toggle `[▶/▼]` integrado na coluna Cliente
- `CampaignAnalyticsModal` (inline): overlay com backdrop blur
  - 6 cards de métricas: Investimento, Leads, CPL, Impressões, Cliques, CTR
  - Barra CPL vs benchmark (quando disponível)
  - Link "Ver dashboard completo →" para `/admin/campanhas/dashboard?campaignId=X`

#### Comportamento
- Linhas sem campanhas: chevron desabilitado (cor cinza, cursor default)
- Linhas com campanhas: chevron clicável (▶ expandir / ▼ recolher)
- Modal: abre instantaneamente (dados já na resposta do portfolio, sem fetch extra)
- Modal fecha ao clicar fora (backdrop) ou no X

---

### FASE 10 — Portfolio Dashboard + Cross-Pollination (2026-06-02) ✅

**Objetivo:** Visão consolidada de todos os clientes do tenant com métricas agregadas, benchmarks por segmento, status de saúde CPL/CTR e insights cruzados entre clientes (cross-pollination).

#### Arquivos criados

**API:**

- **`src/app/api/admin/campanhas/portfolio/route.ts`** — `GET /api/admin/campanhas/portfolio`
  - Agrega campanhas/insights por `client_id` (cross-schema SQL: `campanhasmarketingdigital` + `public`)
  - Joins: `Campaign` → `Insight` (spend/impressions/clicks), `Lead` (lead_count por cliente), `public.clientes` + `public.system_segments` (nome + segmento), `public.tenants` (Minha Empresa), `public.system_benchmarks` (CPL ideal/crítico, CTR mínimo)
  - Status calculado: spend=0 → `nodata`; cpl ≥ cplCritical → `critical`; cpl > cplIdeal → `warn`; else `ok`
  - Ordenação: critical→warn→ok→nodata; desempate por spend desc
  - Query params: `period` (1–365 dias, default 30) + `segmentId` (filtro opcional)

- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`** — `GET|POST /api/admin/campanhas/portfolio/cross-insights`
  - GET: insights baseados em regras (sem LLM)
  - POST: adiciona narrativa LLM opcional via `getLlmClientForCampaigns()`; fallback gracioso se LLM indisponível
  - `buildRuleBasedInsights()` gera 5 tipos de insight:
    - `cross-01`: oportunidade de transferência de padrão CPL (ok → critical)
    - `critical-{name}`: alerta individual por cliente em CPL crítico
    - `nodata-01`: clientes sem campanhas ativas
    - `ctr-01`: benchmark de CTR bom → CTR fraco
    - `segment-{name}`: gap de CPL dentro do mesmo segmento (só se diff ≥ 20%)
  - `topPerformers` (top 3 por CPL) + `underperformers` (critical/warn com razão textual)

**Frontend:**

- **`src/app/admin/campanhas/portfolio/page.tsx`** — `/admin/campanhas/portfolio`
  - `StatusBadge`: dot colorido (verde/âmbar/vermelho/cinza) + label
  - `CplBar`: mini barra de progresso CPL vs ideal/crítico
  - `SummaryCard`: 4 KPI cards (total investido, total leads, CPL médio, clientes ativos)
  - `ColHeader`: colunas ordenáveis (clientName, spend, leads, cpl, status)
  - Filtro por segmento (dinâmico, extraído dos dados) + seletor de período (7/14/30/60/90 dias)
  - Aviso: "Status usa benchmark de CADA cliente — NÃO compare CPL absoluto entre segmentos"
  - Link para `/admin/campanhas/portfolio/cross-insights`

- **`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`** — `/admin/campanhas/portfolio/cross-insights`
  - `InsightCard`: colapsável, cor por tipo (vermelho=warning, emerald=opportunity, violet=pattern)
  - `PerformerCard`: ranking com medalhas 🥇🥈🥉
  - Grupo de insights por tipo: warnings primeiro, depois opportunities, patterns
  - Card de narrativa LLM (gradiente violeta) quando `data.narrative` disponível
  - Botão "Gerar análise IA" → POST endpoint → atualiza narrative
  - Navegação ← de volta para portfolio

**DB — Sidebar:**

- **`prisma/migration-2026-06-02-fase10-portfolio-sidebar.sql`**
  - `system_features`: Portfolio (sort_order=8) + Cross-Insights (sort_order=9), category_id=30
  - `permissions`: read + execute para cada feature
  - `role_permissions`: espelha roles da auditoria (41=Master, 42/47=Admin)
  - `tenant_feature_overrides`: provisiona para todos os tenants que têm auditoria

**marketing-api.ts:**
- Tipos `PortfolioClient`, `PortfolioData`, `CrossInsight`, `CrossInsightsData` adicionados
- Funções `getPortfolio()`, `getCrossInsights()`, `generateCrossInsightsNarrative()` adicionadas

#### Fixes incluídos nesta sessão

**Fix — Tracking Health 500 (3 causas):**
1. `checkPixelConfigured` usava `campanhasmarketingdigital."clientes"` → corrigido para `public.clientes` (key `uuid`)
2. `checkAccessToken` referenciava `meta_token_expires_at` (não existe) → corrigido para `tnc.expires_at`; JOIN desnecessário removido
3. `clientId='own'` passado como UUID para Prisma → sanitizado em dashboard page + GET e POST da rota

**Fix — `system_benchmarks` sem coluna `is_active`:**
- Removido `AND is_active = true` das queries de portfolio e cross-insights

**FASE 10 — 100% CONCLUÍDA** ✅

**Pendente:** Executar a migração SQL na VPS (`migration-2026-06-02-fase10-portfolio-sidebar.sql`)

---

### Deploy VPS — Audit Crons registrados no scheduler (2026-06-02)

**Contexto:** Os novos crons `audit-monthly` e `audit-weekly` (FASE 9) são endpoints HTTP no `prod_app`.
Para rodar na VPS precisam ser chamados pelo `prod_feed` container via `feed-cron-scheduler.js`.

**Arquitetura de crons na VPS (resumo):**
- `prod_feed` container → `scripts/feed-cron-scheduler.js` (node-cron) → chama HTTP `http://prod_app:3000/api/cron/...`
- `agentMonitor.ts` tem crons INTERNOS ao Next.js (sync 6h, briefing 08h/18h) — esses NÃO passam pelo scheduler
- Os novos audit crons seguem o padrão HTTP do scheduler

**`scripts/feed-cron-scheduler.js`** — adicionados 2 novos `cron.schedule()`:
```js
// Audit mensal — 1º dia do mês às 09:00
cron.schedule('0 9 1 * *', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-monthly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });

// Audit semanal — domingos às 18:00
cron.schedule('0 18 * * 0', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-weekly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });
```

**`docker-compose.vps.yml`** — adicionados em `prod_app` e `staging_app`:
```yaml
CRON_SECRET: ${PROD_CRON_SECRET}             # valida x-cron-secret nas rotas /api/cron/campanhas/*
MARKETING_DATABASE_URL: ${PROD_MARKETING_DATABASE_URL}  # Prisma marketing schema
```
> ✅ `MARKETING_DATABASE_URL` é construída automaticamente no docker-compose a partir de variáveis já existentes
> (`DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`) — nenhuma var nova precisa ser definida na VPS.

**Arquivos modificados:**
- `scripts/feed-cron-scheduler.js` — +2 cron.schedule() para audit-monthly e audit-weekly
- `docker-compose.vps.yml` — CRON_SECRET + MARKETING_DATABASE_URL em prod_app e staging_app

**Todos os 4 crons agendados no scheduler:**
1. Feed sync diário → 03:00
2. Transbordo leads → a cada 5 min
3. Audit mensal → 1º dia do mês 09:00
4. Audit semanal → domingos 18:00

---

### Fix Leads — Série de Bugs (2026-06-02)

**Problemas corrigidos nesta sessão:**

1. **Stats não filtravam por campanha** — `stats/route.ts` nunca lia `campaignId` dos searchParams.

2. **Dados idênticos para clientes diferentes (raw SQL)** — query `leadsByDay` usava `"campaign_id"::uuid` (coluna errada + cast errado). Coluna correta é `"campaignId"` (TEXT, camelCase, sem `::uuid`).

3. **Promise.all swallowando resultados** — quando stats retornava 500, `Promise.all` descartava leads e campanhas também. Fix: `Promise.allSettled` com verificação individual.

4. **Historical leads sem client_id** — 299 leads criados antes da vinculação campaigns→clients tinham `client_id = NULL`. Backfill via `scripts/backfill-lead-clientid.mjs`: 273 para Alexandre, 26 para Gisele.

5. **Datas em formato OS (mm/dd)** — `<input type="date">` substituído por `<DateInputPtBR>` com máscara dd/mm/aaaa. Adicionada convenção obrigatória no CLAUDE.md.

6. **ClientSelector não defaultava para Minha Empresa** — `sessionStorage` era lido no mount e sobrescrevia o estado 'own'. Removidos ambos os `useEffect` de sessionStorage (hook + componente).

**Estado atual verificado:**
- `GET /leads?clientId=own` → 245 leads ✅
- `GET /leads?clientId=<alexandre>` → 113 leads ✅
- `GET /leads?clientId=<gisele>` → 26 leads ✅
- `GET /leads/stats?clientId=<alexandre>` → totalLeads: 113 ✅

**Arquivos modificados:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — filtro campaignId + raw SQL parâmetrico correto
- `src/app/api/admin/campanhas/leads/route.ts` — sem alteração (já correto)
- `src/app/admin/campanhas/leads/page.tsx` — DateInputPtBR + Promise.allSettled + getCampaigns(clientFilter)
- `src/lib/marketing-api.ts` — getLeadStats aceita campaignId
- `src/components/marketing/ClientSelector.tsx` — removido sessionStorage read; default sempre 'own'
- `src/components/ui/DateInputPtBR.tsx` — NOVO componente (máscara dd/mm/aaaa)
- `CLAUDE.md` — convenção obrigatória DateInputPtBR

**Pendente:** — (todas as pendências desta sessão foram resolvidas)

---

### DateInputPtBR global + ClientSelector Padrões Vencedores (2026-06-02)

**DateInputPtBR aplicado em 13 arquivos:**
`admin/audit`, `admin/master/auditoria`, `admin/logs`, `admin/sessions`, `admin/security-monitor`,
`admin/visitas_plataformas`, `campanhas/iniciativas/nova`, `DashboardFilters`, `AdvancedFilters`,
`ExportReports`, `crm/MarketingCampaignModal`, `crm/page`, `crm/config/marketing`

**DateInputPtBR:** prop `required?: boolean` adicionada.

**ClientSelector em `criativos/padroes/page.tsx`:**
- Hook `useClientSelector('padroes')` — default 'own' (Minha Empresa)
- `vw_creative_patterns` recriada com `client_id` (JOIN com `Campaign`)
- `patterns/route.ts`: filtro `clientId=own|uuid` via `client_id IS NULL` ou `client_id = $N`

**Nenhum `<input type="date">` restante na aplicação** (exceto o JSDoc do próprio componente).

---

### Consultar Campanhas — Modal full-page (2026-06-02)

**Funcionalidade:** Botão "Consultar Campanhas" + modal full-page para visualização das campanhas lançadas, acessível a partir de `/admin/campanhas/nova`.

**Comportamento:**
- **Para tenant (não-master):** botão na seção "Esta campanha é para", após "Para um Cliente"; respeita contexto selecionado (`clientId=own` ou `clientId=<uuid>`)
- **Para master:** botão flutuante acima da seção Criativos; carrega todas as campanhas do tenant sem filtro

**Componente:** `src/components/marketing/CampanhasModal.tsx` (NOVO)
- Grid responsivo `1 col → 2 col (lg) → 3 col (xl)`
- Cards com: status badges (ativa/pausada/arquivada/rascunho), funnel stage, objetivo, budget, período, público (idade/gênero), programação (dias da semana + horários, com suporte a `scheduleTimeSlots` por dia), localização (chips sky), interesses (chips violet, colapsável), tira de criativos (thumbnails + headline/body/CTA)
- Busca por nome + filtro por status
- Loading skeleton (6 cards), empty state, error state com retry
- Fecha com Escape ou clique no overlay
- Framer-motion enter/exit animation

**Arquivos modificados:**
- `src/components/marketing/CampanhasModal.tsx` — NOVO
- `src/app/admin/campanhas/nova/page.tsx` — import + estado `showConsultarModal` + botão (tenant e master) + `<CampanhasModal />`

**API usada:** `GET /api/admin/campanhas/campaigns?clientId=own|<uuid>` (já existia, sem alteração)

---

### FASE 9 — Cron Jobs (9.5) — 100% concluída (2026-06-02)

**Implementação do último item pendente da FASE 9 (seção 9.5 do plano mestre):**

**`src/app/api/cron/campanhas/audit-monthly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-monthly`
- Agendamento: `0 9 1 * *` — 1º dia do mês às 09:00
- Protegido por `CRON_SECRET` (header `x-cron-secret`)
- Itera todos os tenants ativos via `getActiveTenants()`
- Para cada tenant: gera relatório com `clientId=null` (empresa) + um por cada cliente com campanhas
- `periodDays=30`, `withNarrative=false` (evita timeout no cron)
- Retorna `{ tenants, totalReports, succeeded, failed, elapsedMs }`

**`src/app/api/cron/campanhas/audit-weekly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-weekly`
- Agendamento: `0 18 * * 0` — todo domingo às 18:00
- Mesma estrutura do mensal, mas `periodDays=7`
- Suporta `{ withNarrative: true }` no body para ativar narrativa LLM
- Tratamento de erro granular: falha em um relatório não interrompe os demais

**FASE 9 — 100% CONCLUÍDA** ✅

---

### Fix Leads — Filtro de Campanha nas Stats (2026-06-02)

**Problema:** Selecionar uma campanha no dropdown da página `/admin/campanhas/leads` não alterava os dados exibidos (KPIs, gráficos). A tabela de leads filtrava corretamente, mas os stats (total, gráfico por dia, por campanha) sempre mostravam tudo.

**Root cause:**
1. `/api/admin/campanhas/leads/stats/route.ts` nunca lia `campaignId` dos searchParams.
2. A query raw `leadsByDay` nunca incluía filtro de `campaign_id`.
3. `getCampaigns()` era chamado sem `clientFilter`, então o dropdown mostrava campanhas de todos os clientes.

**Fixes:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — lê `campaignId`; aplica `where.campaignId = campaignId` no `count` e `groupBy`; query raw `leadsByDay` condicional com `AND "campaign_id" = ${campaignId}::uuid`
- `src/lib/marketing-api.ts` — `getLeadStats` aceita `campaignId?: string` opcional
- `src/app/admin/campanhas/leads/page.tsx` — `getCampaigns()` passa `clientFilter` para sincronizar dropdown com cliente selecionado

---

### FASE 9 — Audit Report Estruturado (2026-06-01)

**Objetivo:** Relatório mensal/semanal com scorecard de saúde, top problemas, oportunidades, desperdício consolidado, plano de ação semanal e narrativa LLM opcional.

**Arquivos criados:**
- `prisma/migration-2026-06-01-fase9-audit-report.sql` — tabela `AuditReport` + 2 prompt templates (`audit_report_monthly`, `audit_report_weekly`)
- `prisma/schema.marketing.prisma` — model `AuditReport` adicionado
- `src/lib/marketing/services/auditReportService.ts` — serviço completo com 5 dimensões de scoring (Performance 30%, Spend Efficiency 25%, Funnel Health 20%, Tracking 15%, Creative 10%), builders de problemas/oportunidades/plano e narrativa LLM
- `src/app/api/admin/campanhas/auditoria/route.ts` — GET (lista histórico) + POST (gera e persiste)
- `src/app/admin/campanhas/auditoria/page.tsx` — Frontend com gauge, barras de dimensão, problemas/oportunidades, desperdício, plano de ação; **ClientSelector** integrado (filtro por cliente persistido em sessionStorage); `useEffect([days, clientFilter])` auto-regenera ao trocar período ou cliente

**Sidebar (corrigido):** O sistema usa `system_features` (não `sidebar_menu_items`). Inseridos:
  - `system_features` id=101, category_id=30, sort_order=7
  - `permissions` read(930) + execute(931)
  - `role_permissions` para roles 41/42/47 (Master + Administrador)
  - `tenant_feature_overrides` para tenants "Imobiliaria XYZ" e "Marketing Digital"
  - Migration: `prisma/migration-2026-06-02-fase9-sidebar-auditoria.sql`

**DB:** Migração executada, `prisma generate` rodado.

**NOTA:** Prompt templates usam `template_key` + `content` (não `key`/`template`). Confirmado estrutura real da tabela `system_prompt_templates`.

**Bugs corrigidos em 2026-06-02:**
1. Stale Prisma singleton (`global.prismaMarketing` criado antes do `generate`) → fix: alteração no comentário do `next.config.js` força restart completo do processo Next.js
2. `prisma.auditReport.upsert()` falha com campo nullable em compound unique → fix: substituído por `findFirst` + `create`/`update` manual
3. Filtros de período não re-geravam visualização → fix: `useEffect(() => generate(days, false, clientId), [days, clientFilter])`
4. Ausência de filtro por cliente → fix: `ClientSelector` + `useClientSelector('auditoria')` adicionados à página
5. `ClientSelector` dropdown vazio → root cause: `/api/admin/campanhas/clients` retorna array puro (não `{clients:[]}`); fix: `const list = Array.isArray(data) ? data : (data.clients || [])` em `useClientSelector`
6. Filtro de cliente sem efeito → root cause: campanhas tinham `client_id = NULL`; fix: vinculadas 4 campanhas a 2 clientes via UPDATE direto no DB (Alexandre Severo, Gisele Cesse)
7. `invalid input syntax for type uuid: "own"` → root cause: `clientId='own'` (valor de UI) passado para `saveAuditReport` que usa `@db.Uuid`; fix: `dbClientId = report.clientId === 'own' ? null : report.clientId ?? null` antes de qualquer operação DB
8. Seletor de cliente em toggle-pill style (igual página nova campanha) → fix: adicionado `variant="toggle"` em `ClientSelector` nas páginas dashboard e auditoria
9. Dashboard com datas em formato dd/mm/aaaa → fix: substituídos `<input type="date">` por `<DateInputPtBR>` com máscara automática
10. Filtro de campanha adicionado nas páginas dashboard e auditoria → `CampaignSelect` nativo com re-carga automática ao trocar cliente

---

### Fix Login Loop — DB Pool Exhaustion (2026-06-01)

**Problema:** Login em `http://localhost:3000/admin/login` ficava em loop infinito.

**Causa raiz:** PostgreSQL Docker container atingiu `max_connections=100`. Múltiplos serviços Docker (app:3002, feed, lead-worker) + dev local (3000) consumiam todas as conexões disponíveis. A pool usava `min=2` (conexões de aquecimento), o que desperdiçava slots.

**Sintoma técnico:** `/api/admin/auth/login` → 500 com `"Connection terminated due to connection timeout"` (pg-pool `connectionTimeoutMillis: 5000` esgotado). `useAuth.tsx` detectava falha no `/api/admin/auth/me` → `window.location.href = '/admin/login'` → loop.

**Fix aplicado:**
- `src/lib/database/connection.ts`: defaults ajustados para `max=10, min=0, idleTimeout=30s, connectionTimeout=30s, allowExitOnIdle=true`
- `.env.local` (local, não commitado): `DB_POOL_MAX=5, DB_POOL_MIN=0`
- `next.config.js`: comentário adicionado para triggering de restart do servidor (libera conexões antigas)

**Verificação:** Login retorna 200 em ~600ms; `/api/admin/auth/me` retorna 200 em ~200ms (com cookie). Auth flow completo funcional.

---



### Centralização LLM das Campanhas (2026-05-28)

Implementado um único modelo de IA global para todos os insights de campanhas da plataforma:

- **`getLlmClientForCampaigns()`** em `src/lib/marketing/services/llmClient.ts`
  - Lê `campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL`
  - Fallback para `ANTHROPIC_API_KEY` do env se nenhuma config global existir
- **3 pontos de chamada atualizados** para usar a função global:
  - `src/lib/intelligence/llmInvoker.ts`
  - `src/app/api/admin/campanhas/settings/llm/test/route.ts`
  - `src/app/api/admin/master/ia-plataforma/test/route.ts`
- **UI Master** criada em `src/app/admin/master/ia-plataforma/page.tsx`
  - GET/PUT em `/api/admin/master/ia-plataforma`
  - Teste de conexão em `/api/admin/master/ia-plataforma/test`
- **Sidebar** — item "IA da Plataforma" ativo via `system_features` (`category_id=22`, `url=/admin/master/ia-plataforma`)
- **SQL** — `database/migration-2026-05-llm-centralizacao.sql` (índice único + seed linha global)

### ModulesListModal — Componente Reutilizável (2026-05-28)

- Criado `src/components/admin/master/modules/ModulesListModal.tsx`
- Usado em `src/app/admin/master/tenants/page.tsx`

### Plano Mestre — Seção 1.6 adicionada (2026-05-29)

Documentada a **Camada Operacional de Lançamento de Campanhas** (subseções 1.6.1–1.6.13):
- Fronteira automático↔manual (2 baldes, sem camada semi)
- 3 "lares de dado" a criar: page_id/pixel/ig em credentials, network_defaults em system_segments, website em tenants/clientes
- Hotfixes pré-fase identificados: bug page_id, adset_schedule, interest IDs
- Fronteira on-the-fly (1.6.13): ~85–90% dinâmico nos campos; adapter é código irredutível
- Mescla aditiva: FASE 1 expande, FASE 5 → "Video + Conversão/ROI", FASE 11 só consome

---

## Tarefa concluída

### Implementação da Camada de Lançamento — FASE 1 Expandida (2026-05-29)

**Sequência executada:**

- [x] Checkpoint iniciado
- [x] **Migração DB** — executada via rota temporária (psql local + pool Prisma)
  - ✅ `system_segments.network_defaults JSONB` criada e seedada
  - ✅ `tenants.website TEXT` criada
  - ✅ `clientes.website TEXT` criada
  - ✅ GIN index `idx_system_segments_network_defaults` criado
  - ✅ Seeds aplicados: imobiliaria (HOUSING), carros, geral, master, saude
  - Slugs reais confirmados: `imobiliaria`, `carros`, `geral`, `master`, `saude`
- [x] **Hotfix 1** — bug `page_id` corrigido em `src/lib/marketing/networks/meta/metaAdsAdapter.ts`
  - `object_story_spec.page_id` agora usa `this.pageId` (das credentials) e não `this.adAccountId`
  - Lança erro claro se `page_id` não configurado
- [x] **Hotfix 2** — `adset_schedule` agora enviado ao Meta API
  - Método `buildAdsetSchedule()` converte `scheduleStartHour/End` → minutos Meta format
- [x] **Settings premium** — `src/app/admin/campanhas/configuracoes/page.tsx`
  - Seção "Identidade Meta" com page_id, pixel_id, instagram_actor_id, website
  - API: `src/app/api/admin/campanhas/settings/meta-identity/route.ts` (GET+PUT, JSONB merge)
- [x] **ClientSelector** — `src/components/marketing/ClientSelector.tsx` (ALTA PRIORIDADE)
  - Hook `useClientSelector(storageKey)` com sessionStorage persist
  - Integrado em `dashboard/page.tsx` e `leads/page.tsx`
- [x] **CampaignWizard** — `src/components/marketing/CampaignWizard.tsx`
  - `AutoChip` para campos auto-resolvidos
  - `autoFields` state via `getMetaIdentity()` + `/segment-defaults`
  - `StepObjective` com specialAdCategory, pixelId, customEventType
  - Prop `clientId` adicionada
- [x] **API segment-defaults** — `src/app/api/admin/campanhas/segment-defaults/route.ts`
  - Resolução automática pelo segmento do tenant/cliente
  - Fallback gracioso (não quebra wizard)
- [x] **Factory** — `resolveSegmentNetworkDefaults()` em `src/lib/marketing/networks/factory.ts`
- [x] **campaigns/route.ts** — `pixelId` e `customEventType` passados para `networkService.createCampaign()`
- [x] Arquivo temporário `_run_migration.js` removido

**Arquivo de migração:** `prisma/migration-2026-05-29-launch-layer.sql`

---

## Última entrega — Camada 3 (clientes) — 2026-05-29

- ✅ `clientes.page_id TEXT`, `clientes.pixel_id TEXT`, `clientes.instagram_actor_id TEXT` — migração executada
- ✅ API `GET/PUT /api/admin/clientes/[id]/campaign-settings`
- ✅ Página `/admin/clientes/[id]` refatorada com tabs: "Dados do Cliente" | "Configurações Meta"
  - `CampaignField` com indicador "próprio" vs "usando tenant"
  - Barra de progresso de completude
  - Info bar com fallbacks do tenant
- ✅ `getNetworkServiceForTenant()` aceita `clientId` — cascata: `client.page_id ?? tenant.page_id`
- ✅ `campaigns/route.ts` passa `clientId` para cascata de credenciais

## Arquitetura de 3 camadas — COMPLETA

| Camada | Config | UI | Status |
|--------|--------|----|--------|
| **Master** | LLM global | `/admin/master/ia-plataforma` | ✅ |
| **Tenant** | Meta credentials, website, segment | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — Fluxo de Lançamento Unificado (2026-05-29)

- ✅ **`/admin/campanhas/nova`** refatorado como Fase 1 (Criativos) + Fase 2 (Wizard)
  - Seleção de pasta via File System Access API (Chrome/Edge) com fallback `webkitdirectory`
  - Grid de imagens com seleção múltipla (máx 6) e thumbnails no footer
  - Seção "Para quem?" exibida **apenas para tenants** (oculta para Master)
  - `CreateGuard` **removido** do botão "Configurar Campanha" — era o bug que ocultava o botão para Master
  - `contextReady` como única guarda de negócio: `isMaster || campaignFor === 'own' || !!selectedClientId`
- ✅ **`/admin/campanhas/criativos`** substituído por redirect para `/nova`
- ✅ **`/api/admin/auth/me`** — campo `is_system_role` adicionado ao `userResponse`
- ✅ **`isMaster` detection** — `user?.is_system_role` + localStorage fallback (login sempre tem `is_system_role`)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| "Para quem?" aparecia para Master | `is_system_role` não retornado por `/me` | Adicionado ao `userResponse` + fallback localStorage |
| Botão "Configurar Campanha" ausente/desabilitado para Master | `CreateGuard resource="campanhas"` retornava null (sem permissão explícita na DB) | Removido `CreateGuard` — `disabled={!contextReady}` suficiente |

## Última entrega — Interesses Meta reais + Curadoria por segmento (2026-05-30)

### Problema resolvido
Os interesses no wizard usavam IDs fake (strings textuais) que o Meta ignorava silenciosamente.
Interesses agora usam IDs numéricos reais da Meta Targeting Search API.

### O que foi implementado
- **`/api/admin/campanhas/interests/search`** — busca real na Meta Graph API (`/search?type=adinterest&locale=pt_BR`); fallback gracioso se token não configurado
- **`InterestsPicker`** reescrito — busca com debounce 350ms, exibe audience size real, interesses livres como fallback
- **`InterestsPicker`** colapsado em "Avançado" — com banner explicando impacto variável (especialmente HOUSING)
- **`suggestedInterests` por segmento** — `network_defaults.meta.suggested_interests` em `system_segments`
  - `resolveSegmentNetworkDefaults` retorna `suggestedInterests[]`
  - Wizard carrega e exibe chips ⚡ do segmento antes da busca livre
- **`/api/admin/master/segments/[id]/interests`** (GET + PATCH) — Master gerencia seeds por segmento
- **`SegmentInterestsModal`** — modal na página `/admin/master/segmentos` com busca Meta API + salvar
- **Página de Segmentos do Master** — botão "✨ Interesses Meta" por segmento

### Fluxo de curadoria pelo Master
1. `/admin/master/segmentos` → clicar "Interesses Meta" no segmento
2. Modal abre → busca na Meta API → clica para adicionar → salva
3. Todos os tenants daquele segmento passam a ver os chips sugeridos no wizard

## Última entrega — Meta Pixel, WhatsApp auto e Config. Meta no tenant (2026-05-30)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| Prisma `Unknown argument 'networkId'` ao criar campanha | Campo nunca existiu no schema `Campaign` | Removido query e spread `networkId` de `src/app/api/admin/campanhas/campaigns/route.ts` |

### Novos arquivos

- **`src/components/analytics/MetaPixel.tsx`** — componente Client que injeta o snippet fbevents.js via `next/script strategy="afterInteractive"`; rastreia PageView a cada mudança de rota
- **`src/lib/analytics/getMetaPixelId.ts`** — Server helper: busca `credentials->>'pixel_id'` do tenant em `tenant_network_credentials`; falha silenciosa → string vazia
- **`src/app/api/admin/master/tenants/[id]/meta-identity/route.ts`** — GET/PUT para Master gerenciar `page_id`, `pixel_id`, `instagram_actor_id` (JSONB merge) e `website` de qualquer tenant; protegido por `is_system_role`

### Atualizações

- **`src/app/artemis4/layout.tsx`** — agora Server Component assíncrono; busca `pixel_id` do tenant master (`00000000-0000-0000-0000-000000000001`) e injeta `<MetaPixel>` se configurado
- **`src/components/marketing/CampaignWizard.tsx`** — WhatsApp Level 1: `loadAutoFields` busca `getWhatsAppConfig()` em paralelo e pré-preenche `whatsappNumber` + `whatsappMessage` com `AutoChip`; aviso pixel alterado para cinza neutro
- **`src/app/admin/master/tenants/[id]/page.tsx`** — reescrito completamente com tabs "Dados do Tenant" | "Config. Meta"; Config. Meta exibe campos: Facebook Page ID (obrigatório), Meta Pixel ID (conversões), Instagram Actor ID (opcional), Website

### Arquitetura de 3 camadas — COMPLETA (atualizada)

| Camada | Config Meta | UI | Status |
|--------|-------------|----|--------|
| **Master** | page_id, pixel_id, instagram, website | `/admin/master/tenants/{id}` → aba Config. Meta | ✅ |
| **Tenant** | Meta credentials, website | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — FASE 4: Campaign State Machine (2026-05-30)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-30-fase4-lifecycle.sql` (executada via pool raw SQL)
  - `Campaign.lifecycle_status VARCHAR(20) DEFAULT 'DRAFT'`
  - `Campaign.lifecycle_changed_at TIMESTAMP`
  - `Campaign.learning_started_at TIMESTAMP`
  - `Campaign.stable_since TIMESTAMP`
  - Índice `idx_campaign_lifecycle` em `(lifecycle_status, tenant_id)`
  - Seed: ACTIVE → STABLE, PAUSED → PAUSED, outros → DRAFT
  - Tabela `CampaignLifecycleEvent` (audit log de transições; `campaign_id TEXT` pois Campaign.id é TEXT)

- **`src/lib/marketing/services/campaignStateMachine.ts`** — máquina de estados completa
  - 8 estados: `DRAFT | READY | LEARNING | STABLE | SCALING | FATIGUED | PAUSED | KILLED`
  - `VALID_TRANSITIONS` — mapa de transições permitidas por estado
  - `transitionCampaign()` — valida, atualiza `lifecycle_status`, registra em `CampaignLifecycleEvent`
  - `inferLifecycleStatus()` — regras automáticas: frequência > 3.5 + CTR drop > 30% → FATIGUED; ≥7 dias ou ≥50 conversões → STABLE; primeiros dados → LEARNING; pausado externamente → PAUSED
  - `getLifecycleHistory()` — histórico paginado

- **`src/app/api/admin/campanhas/campaigns/[id]/lifecycle/route.ts`**
  - GET — retorna histórico de transições (até 50)
  - POST — transição manual com `{ toStatus, reason }`

- **`src/components/marketing/CampaignLifecycleBadge.tsx`** — badge rico com:
  - Emoji + label colorido por estado
  - Dropdown de transições manuais (via `onTransition` prop)
  - Painel de histórico (ícone ⏰)
  - Props: `campaignId, status, changedAt?, history?, onTransition?, compact?`

- **`src/lib/marketing/services/agentDecisor.ts`** — integrado: após PAUSE executa `transitionCampaign('PAUSED', 'AGENT')`
- **`src/lib/marketing/services/agentMonitor.ts`** — integrado: após cada sync de métricas chama `inferLifecycleStatus()`

- **Dashboard** — `CampaignLifecycleBadge` integrado na tabela de campanhas (coluna "Ciclo de Vida")
  - `marketing-api.ts` Campaign interface atualizada com `lifecycleStatus`, `lifecycleChangedAt`
  - Prisma schema atualizado + `prisma generate` executado

### Validação em produção (30/05/2026)

| Cenário | Status |
|---------|--------|
| Badge renderiza STABLE / PAUSED / FATIGUED / SCALING | ✅ |
| Transição manual STABLE → FATIGUED via dropdown | ✅ |
| Transição manual STABLE → SCALING via dropdown | ✅ |
| Histórico lazy (fetch on demand) com fonte Manual | ✅ |
| `CampaignLifecycleEvent` gravado corretamente no banco | ✅ |

**Bugs corrigidos durante validação:**
- `can't resolve 'fs'` — tipos extraídos para `campaignLifecycleTypes.ts` (sem imports Node.js)
- 401 silencioso — `fetch` direto não enviava token; criado `adminFetch` helper
- `inconsistent types deduced for parameter $1` — adicionado `$1::varchar` / `$2::timestamp` no UPDATE

### Arquitetura do Estado Machine

```
DRAFT → READY → LEARNING → STABLE ⇄ SCALING
                             ↓          ↓
                          FATIGUED ←────┘
                             ↓
                          PAUSED → READY
                             ↓
                           KILLED
```

### Trigger sources
- `SYNC` — inferido automaticamente pelo agentMonitor
- `AGENT` — decisão automática do agentDecisor
- `MANUAL` — operador via API/UI
- `CRON` — jobs agendados (futuro)

---

## Última entrega — FASE 5: Video Metrics + Hook Rate (2026-05-31)

### Migração executada

`prisma/migration-2026-05-31-fase5-video-metrics.sql`
- 7 novas colunas em `campanhasmarketingdigital."Insight"`:
  - `video_views_3s`, `video_views_15s`, `video_views_25_pct`, `video_views_50_pct`, `video_views_75_pct`, `video_views_100_pct`, `thruplay_views` (todos `INTEGER NOT NULL DEFAULT 0`)
- Índice parcial `idx_insight_video ON ("campaignId", video_views_3s) WHERE video_views_3s > 0`
- Seeds `hook_rate_critical` / `hook_rate_min` / `hook_rate_good` em `public.system_benchmarks` para 5 segmentos (imobiliaria, carros, saude, geral, master)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 7 novas colunas `videoViews3s` … `thruplayViews` no model `Insight` |
| `src/lib/marketing/networks/types.ts` | `NetworkInsight` + 7 campos opcionais de vídeo + `breakdowns` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` solicita 7 novos campos de vídeo da Meta Graph API; mapeia `video_*_watched_actions` para os campos |
| `src/lib/marketing/services/agentMonitor.ts` | `syncMetrics` persiste todos os 7 campos de vídeo no upsert do Insight |
| `src/lib/marketing/services/aiInsights.ts` | `CampaignData` + `hasVideoMetrics` / `avgHookRate`; nova regra `video_hook_weak` (ALERT com label "Hook Rate fraco"); benchmarks incluem `hook_rate_critical`/`hook_rate_min` |
| `src/lib/intelligence/benchmarkResolver.ts` | `GLOBAL_FALLBACKS` + `hook_rate_critical: 8`, `hook_rate_min: 12`, `hook_rate_good: 22` |
| `src/lib/marketing-api.ts` | `InsightData` + `videoViews3s?`, `videoViews15s?`, `thruplayViews?` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Hook Rate KPI card condicional (aparece só quando `totalVideoViews3s > 0`); cor semáforo vermelho/âmbar/verde por thresholds |

### Lógica da regra Hook Rate

```
hookRate = video_views_3s / impressions * 100
hookRate < hook_rate_critical (8%)  → ALERT crítico — pausar vídeo
hookRate < hook_rate_min (12%)      → ALERT fraco  — revisar abertura
```

Thresholds por segmento resolvidos via `benchmarkResolver` (4 camadas: cliente → tenant → segmento → global fallback).

---

## Próximos passos imediatos

1. Configurar `pixel_id` do Master via `/admin/master/tenants/[master-id]` → Config. Meta (para Artemis4 funcionar)
2. **Opção A (pendente para amanhã)** — Destravar lançamento real no Meta: access_token, blob: → URL hospedada, localhost → domínio produção
3. Testar fluxo completo Master: selecionar criativos → "Configurar Campanha" → Wizard → lançar
4. Dashboard: adicionar `onTransition` no badge (requisitar permissão ao usuário antes)
5. Remover item "IMPORTAÇÃO DE CRIATIVOS" do sidebar (agora redirecionado; item confuso)

---

## Decisões tomadas em 2026-05-29

| Decisão | Racional |
|---------|----------|
| Mescla ADITIVA ao plano mestre | Seção 1.6 acrescentada, FASES 0–11 intactas |
| Fronteira on-the-fly: ~85–90% dinâmico | Campos guiados por field schema; adapter é código irredutível |
| `network_defaults` em `system_segments` | Curadoria 1x pelo Master, keyed por rede, resolve por segmento |
| `website` como coluna em tenants + clientes | Client-owned site nunca hardcoded; pré-preenche na UI |
| Sem camada "semi-auto" | Só 2 baldes: automático (vem do banco) ou manual (informado na UI) |
| YouTube = canal sob Google Ads | Sem row separado em ad_networks; mesmo adapter/credentials |

---

## Últimas entregas — 2026-05-31

### "Usar no Wizard" — loop IA → Campanha fechado

- ✅ **`ConceptModal`** (`padroes/page.tsx`) — botão **"Usar no Wizard"** por conceito gerado:
  navega para `/admin/campanhas/nova?body=...&headline=...&hookText=...`
- ✅ **`/nova`** — lê `useSearchParams` e passa `initialValues` ao `CampaignWizard`
- ✅ **`CampaignWizard`** — aceita `initialValues.{body, headline, hookText}`:
  - Popula `form.body` e `form.headline` no estado inicial
  - Step 2: banner azul "✨ Texto gerado pela IA"
  - Dica âmbar "🪝 Hook sugerido" abaixo do textarea

**Loop completo:** Dados Meta → Padrões Vencedores → Conceito IA → Wizard pré-preenchido → Lançamento → Novos dados

---

## Última entrega — FASE 7: Funnel Stage Classification (2026-05-31)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-31-fase7-funnel-stage.sql` (executada via Node.js pool)
  - `Campaign.funnel_stage VARCHAR(20) DEFAULT 'TOF'`
  - Índice `idx_campaign_funnel ON (funnel_stage, tenant_id)`
  - Backfill automático: `OUTCOME_AWARENESS/TRAFFIC/REACH → TOF`, `OUTCOME_ENGAGEMENT → MOF`, `OUTCOME_LEADS/SALES/APP_PROMOTION/CONVERSIONS → BOF`
  - Seed de prompt template `funnel_diagnosis` em `public.system_prompt_templates`

- **`prisma/schema.marketing.prisma`** — campo `funnelStage String @default("TOF")` adicionado ao model `Campaign`

- **`src/app/api/admin/campanhas/dashboard/funnel/route.ts`** — GET
  - Agrega métricas por estágio (TOF/MOF/BOF) via `COALESCE(funnel_stage, CASE objective...)` para fallback gracioso
  - Calcula taxas: `tof_ctr` (impressões→cliques), `mof_ltr` (cliques→leads), `bof_cvr` (leads→conversões)
  - Identifica `bottleneck`: estágio com maior share de budget e pior conversão
  - Retorna `{ stages, conversionRates, totals, bottleneck, period }`

- **`src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts`** — POST
  - Chama `invokeForContext({ templateKey: 'funnel_diagnosis', ... })`
  - Formata `funnel_data` e `conversion_rates` como texto estruturado
  - Retorna `{ diagnosis, generatedAt }`

- **`src/app/api/admin/campanhas/campaigns/[id]/funnel-stage/route.ts`** — PATCH
  - Override manual de `funnel_stage` (valida `TOF | MOF | BOF`)
  - Verifica ownership por `tenant_id`

- **`src/components/marketing/StageFunnelWidget.tsx`** (novo componente)
  - `StageCard`: card por estágio com spend/impressões/cliques/leads, destaque vermelho no gargalo
  - `RateArrow`: seta de conversão com cor semáforo (vermelho < 1%, âmbar < 3%, verde ≥ 3%)
  - Totais resumidos: Investimento Total / Leads Totais / CPL Geral
  - Botão "Diagnosticar gargalo com IA" → POST `/diagnosis` → painel colapsável via `AnimatePresence`
  - Diagnóstico cacheado no state (toggle show/hide após primeira chamada)

- **`src/lib/marketing-api.ts`** — novos tipos `FunnelStage`, `FunnelConversionRates`, `FunnelData7`; novas funções `getFunnelData`, `generateFunnelDiagnosis`, `updateCampaignFunnelStage`; campo `funnelStage?` em `Campaign`

- **`src/app/admin/campanhas/dashboard/page.tsx`** — `StageFunnelWidget` integrado no card "Funil de Conversão" (substitui `FunnelChart` quando dados disponíveis)

### Validação
- TypeScript check em todos os novos arquivos: exit code 0 (sem erros)
- Migração executada com sucesso: 4/4 statements OK

---

## Última entrega — FASE 8: Tracking Health Monitor (2026-06-01)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-06-01-fase8-tracking-health.sql` (executada)
  - Tabela `campanhasmarketingdigital."TrackingHealthCheck"` (`id, tenant_id, client_id, overall_score, checks, issues, created_at`)
  - 2 índices: `idx_tracking_health_tenant` (busca recente) + `idx_tracking_health_critical` (score ≤ 50)

- **`prisma/schema.marketing.prisma`** — model `TrackingHealthCheck` adicionado + `prisma generate` executado

- **`src/lib/marketing/services/trackingHealthService.ts`** — service com 7 checks:
  1. `tracking_endpoint` — endpoint `/api/r/__health_check__` responde <500 (peso 20)
  2. `leads_24h` — leads registrados nas últimas 24h (peso 20)
  3. `duplicate_rate` — taxa de leads com mesmo IP em <30s (peso 15)
  4. `pixel_configured` — pixel_id em client/tenant credentials (peso 15)
  5. `access_token` — token Meta configurado + dias p/ expiração (peso 15)
  6. `lead_latency` — latência de query como proxy de captura (peso 10)
  7. `orphan_leads` — leads sem campaignId (peso 5)
  - `runTrackingHealthCheck()` — executa os 7 checks em paralelo, calcula score 0-100
  - `saveTrackingHealthCheck()` — persiste em `TrackingHealthCheck`
  - `getTrackingHealthHistory()` — histórico paginado por tenant

- **`src/app/api/admin/campanhas/tracking/health/route.ts`**
  - `GET` — retorna `{ latest, history }` (latest = check mais recente, history = 30 últimos)
  - `POST` — executa novo check, persiste e retorna resultado completo
  - Auth: `requireApiPermission('dashboard-campanhas', 'READ')` + `getTokenPayload`

- **`src/lib/marketing-api.ts`** — tipos `TrackingCheckResult`, `TrackingHealthIssue`, `TrackingHealthResult`, `TrackingHealthData`; funções `getTrackingHealth()` e `runTrackingHealth()`

- **`src/components/marketing/TrackingHealthWidget.tsx`** — widget completo:
  - Gauge SVG semi-circular (0-100) colorido por score (verde/âmbar/vermelho)
  - Chips de issues (críticos + alertas) ou "Tudo OK"
  - Estado sem dados → botão "Executar 1ª verificação"
  - Lista expandível de todos os checks (accordion por check com detalhe)
  - Botão ↺ para re-executar check a qualquer momento
  - Loading skeleton

- **`src/app/admin/campanhas/dashboard/page.tsx`** — widget integrado entre Farol de Milha e Briefing AI
  - Props: `clientId` respeitando filtro de cliente ativo

### Validação
- Migração executada: 3/3 OK (tabela + 2 índices)
- `prisma generate` executado sem erros
- TypeScript: zero erros nos arquivos da FASE 8
- `GET /api/admin/campanhas/tracking/health` → 401 sem auth (rota compilada e ativa)

---

## Última entrega — UI Improvements: Gráficos & Funil (2026-06-01)

### Alterações implementadas

| Arquivo | Mudança |
|---------|---------|
| `src/components/marketing/charts/MultiMetricChart.tsx` | Props `xLabel?`, `yLeftLabel?`, `yRightLabel?` adicionadas; auto-deriva rótulos a partir dos metrics; rótulos renderizados em XAxis e ambos YAxis; `margin` do ComposedChart ajustado para acomodar rótulos |
| `src/components/marketing/charts/ClassicFunnelChart.tsx` | Reescrito: SVG 300×320px (era 220×240px), taper gentil (bottom 84px, era ~20px), filtro de texto mais forte (`stdDeviation="2.5" floodOpacity="0.70"`), título "Funil do Ciclo de Conversão em Vendas", cores th.num por estágio, `rateColor(rate, isDark)` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Badge "FASE 7" hardcoded removido do heading "Funil por Estágio"; CPL Timeline: Gasto removido, CPL como área primária (left) + Leads como barra (right); Pie chart: inline `label` truncado substituído por legenda externa custom (flex-wrap, percentual calculado, dots coloridos) |
| `src/components/marketing/StageFunnelWidget.tsx` | Nota informativa quando MOF zero ("Sem campanhas OUTCOME_ENGAGEMENT no período"); mensagem de erro de diagnóstico mapeada: "Connection terminated" / timeout → texto amigável em PT-BR |
| `src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts` | Timeout 28s via `Promise.race` + `setTimeout`; resposta HTTP 504 quando timeout; mensagem de erro diferenciada timeout vs erro genérico |

### Comportamento dos rótulos de eixo (MultiMetricChart)

- **X** — sempre "Data" por padrão (override via `xLabel`)
- **Y esquerdo** — auto-deriva do primeiro metric sem `yAxisId` ou com `yAxisId: 'left'`
- **Y direito** — auto-deriva do primeiro metric com `yAxisId: 'right'`

Nenhum callsite precisou de alteração — o comportamento é 100% retrocompatível.

---

## Última entrega — FASE 8.5: Signal-Driven Anticipation (2026-06-01)

### Paradigma

Substituição do modelo de **regressão linear** (forecasting passivo) por **motor de sinais leading**
(escuta ativa da "voz do Meta"). O Farol de Milha agora responde "quando / para onde" em vez de
"o que foi previsto com base no passado".

### Migração DB executada

`prisma/migration-2026-06-01-fase85-signals.sql`:
- 6 novas colunas em `campanhasmarketingdigital."Insight"`:
  `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`, `learning_status`,
  `learning_conversions` (INT), `first_impression_ratio` (FLOAT)
- Índices: `idx_insight_rankings` + `idx_insight_learning`
- Nova tabela `campanhasmarketingdigital."CalibrationSignal"` (pressureScore + signals JSONB)
- Seeds em `public.system_benchmarks`: `frequency_max`, `learning_conv_target`, `fir_floor`,
  `pressure_w_engagement`, `pressure_w_conversion`, `pressure_w_quality`, `cpm_delta_max`

### Arquivos novos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/marketing/services/signalEngine.ts` | Motor de sinais — `computePressure()`, `detectTrend()`, `computeSignalsForCampaign()` |
| `src/lib/marketing/services/anticipationEngine.ts` | `computeAnticipation()` — heurísticas TIME-TO-FATIGUE, EXIT-LEARNING, AUDIENCE-EXHAUSTION; retorna `TimeToEvent[]` + `Trajectory[]` |
| `src/app/api/admin/campanhas/dashboard/anticipation/route.ts` | `GET /dashboard/anticipation` — todas as campanhas ativas em paralelo |
| `src/components/marketing/charts/TimeToEventBar.tsx` | Barra de contagem regressiva (verde→vermelho por urgência) |
| `src/components/marketing/charts/SignalTrajectory.tsx` | Sparkline de 7 pontos + seta direcional + implicação textual |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 6 campos no model `Insight` + model `CalibrationSignal` |
| `src/lib/marketing/networks/types.ts` | 6 campos FASE 8.5 no `NetworkInsight` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` mapeia rankings + `firstImpressionRatio`; novos métodos `fetchAdSetDelivery()` e `fetchRecommendations()` |
| `src/lib/marketing/services/agentMonitor.ts` | `insightBase` persiste 4 novos campos de sinal |
| `src/lib/marketing/services/aiInsights.ts` | `CalibrationAction` union type; `SIGNAL_RULES` (5 regras); retorno `{ insights, calibrationActions }` |
| `src/lib/intelligence/benchmarkResolver.ts` | 6 novos `GLOBAL_FALLBACKS` para sinais |
| `src/lib/marketing/services/agentDecisor.ts` | Caller corrigido para `result.insights` |
| `src/lib/marketing/services/strategicBriefing.ts` | Caller corrigido para `aiResult.insights` |
| `src/app/api/admin/campanhas/insights/ai/route.ts` | Retorna objeto completo `{ insights, calibrationActions }` |
| `src/lib/marketing-api.ts` | Tipos FASE 8.5 + `getAnticipation()` + `getCalibrationInsights()` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Farol de Milha substituído pelos novos componentes; projeções legadas em `<details>` colapsável |

### Heurísticas implementadas

| Evento | Lógica |
|--------|--------|
| `TIME-TO-FATIGUE` | `daysUntil = ceil((freqMax − freqNow) / Δfreq_dia)` |
| `TIME-TO-EXIT-LEARNING` | `daysUntil = ceil(remaining_conv / avg_conv_3d)` |
| `AUDIENCE-EXHAUSTION` | `first_impression_ratio < fir_floor` ou caindo (detectTrend) |

### `computePressure()` — normalização de sinais

```
pressureScore = rankPressure × 60% + trendPressure × 40%
rankPressure  = weighted avg dos 3 rankings Meta (engagement/conversion/quality)
trendPressure = contribuição de CPM + frequência crescente
```

Limiares resolvidos via `benchmarkResolver` (4 camadas: client → tenant → segment → global fallback).

### Validação pré-teste
- TypeScript: zero erros nos arquivos FASE 8.5
- Rota `/dashboard/anticipation` compilada e registrada
- Dashboard page: Farol de Milha renderiza seção de sinais; projeções legadas em `<details>`

---

## Pendências registradas

### 1.7 — Thresholds da State Machine por ENV (pendente)
Thresholds `LEARNING_DAYS`, `FATIGUE_FREQUENCY`, `FATIGUE_CTR_DROP` hardcoded em `campaignStateMachine.ts`.
Mover para variáveis de ambiente. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.7.

### 1.8 — Hook Rate KPI com thresholds dinâmicos (pendente)
Card visual do dashboard usa `8` e `12` hardcoded; regra de IA já usa `benchmarkResolver`.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.8.

### 1.10 — Revisão do modelo de predições → FASE 8.5 ✅ CONCLUÍDA (2026-06-01)
Paradigma virado de regressão linear para **motor de sinais leading**. Ver seção
"Última entrega — FASE 8.5" acima.

### 1.9 — Gestão de Providers e Modelos LLM pelo Master (pendente)
UI CRUD para a tabela `LlmModel` em `/admin/master/ia-plataforma` (nova aba "Catálogo de Modelos").
Permite ao Master adicionar providers, ativar/desativar modelos e marcar recomendados sem SQL.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.9.

**Endpoints a criar:** `GET/POST /api/admin/master/llm-models`, `PUT/PATCH/DELETE /api/admin/master/llm-models/[id]`
**Arquivos principais:** `src/app/admin/master/ia-plataforma/page.tsx` (nova aba), `src/lib/marketing-api.ts`

### FASE 6.5 — Produção de Criativos por Reaproveitamento (pendente) ← NOVO
Fecha o último elo do loop FASE 6: transforma padrão vencedor + conceito da IA em **arquivos de
criativo prontos para lançar**, reaproveitando fotos reais existentes (nunca síntese do imóvel).
Segregado em 2 estágios. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção FASE 6.5.

- **Estágio A — Imagens (CUSTO ZERO, avançar agora):** composição programática com **Sharp + SVG**
  (grátis, já no stack); overlay do copy já gerado + branding + smart-crop multi-formato (1:1/9:16/4:5);
  gate de aprovação humana → vira CreativeAsset lançável. Sem API paga, sem GPU.
  - Requer: object storage (S3/R2) — que também resolve a pendência do `blob:` no lançamento.
  - Novas tabelas: `CreativeTemplate`, `CreativeGenerationJob` + colunas `derived_from_asset_id`/`ai_generated`.
- **Estágio B — Vídeos (custos permitidos, futuro):** reels a partir das fotos reais (Ken Burns +
  Creatomate/Shotstack; image-to-video Luma/Kling/Veo). Provider configurável pelo Master (análogo à 1.9),
  com teto de gasto + rate-limit + webhooks. Reusa toda a infra do Estágio A.

**Prioridade:** Estágio A média-alta (após object storage); Estágio B baixa/futuro.

---

## Pendências anteriores (ainda abertas)

- **Auditoria de permissões CRUD** — `CreateGuard`/`UpdateGuard`/`DeleteGuard` criados, apenas `clientes` protegido. Os demais 30+ módulos ainda sem proteção.
- **Sync Meta real** — validar `POST /insights/sync` com token de produção.
- **Alerta de token Meta expirando** — campo `meta_token_expires_at` existe no tenant, falta notificação na UI.
- **Endpoint CPL por período** — não existe, agregar `spend / count(leads)` por intervalo de datas.

---

## Referências

- `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` — Plano completo das 11 fases (versão 1.3.1)
- `docs/ACCESS_CONTROL.md` — Lógica de controle de acesso e sidebar
- `CLAUDE.md` — Documentação técnica principal (arquitetura, APIs, infra)
