# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-08-27 (continuação 8) — **Fix real, causa raiz diferente da
> investigada na rodada anterior: arrastar um lead de volta pra 1ª coluna ("Lead Captado")
> falhava especificamente quando a coluna de origem já não estava mais visível na tela** —
> usuário refinou o relato ("consigo recuar da 3ª pra 2ª, da 5ª pra 2ª... o problema é o
> recuo, COM O MOUSE, pra primeira etapa"), isolando que o padrão nunca dependia da coluna de
> origem, só do destino ser especificamente a 1ª.
>
> **Causa raiz confirmada, não suposta:** o board rola horizontalmente
> (`overflow-x-auto`) e a lógica de move em si sempre esteve correta (confirmado reproduzindo
> via `DragEvent`+`DataTransfer` reais — moveu certo mesmo antes do fix) — o que falha é
> puramente físico/espacial: com mais de ~3 colunas visíveis por vez num viewport real
> (confirmado `scrollWidth:2524` vs `clientWidth:1041` numa tela de 1440px), arrastar de volta
> pra uma coluna fora da área visível (a 1ª, quando o usuário está olhando a 3ª/5ª/etc.) exige
> que o navegador role o container ENQUANTO o card está sendo arrastado — e auto-scroll nativo
> do HTML5 Drag and Drop não é confiável pra `<div>` customizado com `overflow-x-auto` (só
> funciona de verdade pra rolagem da JANELA em muitos navegadores). Sem esse mecanismo, o
> usuário fisicamente não consegue soltar o card em cima de uma coluna que a tela não mostra.
>
> **Corrigido** (`src/app/crm/kanban/page.tsx`) — auto-scroll durante o drag, mesmo padrão já
> usado por qualquer Kanban real (Trello, Jira etc.): novo `boardScrollRef` (`useRef`) no
> container rolável + `handleBoardDragOver` — a cada evento nativo `dragover` (que já repete
> sozinho durante o gesto, sem precisar de `setInterval`), se o cursor está a menos de 90px da
> borda esquerda/direita do container, rola 28px nessa direção. Aditivo — não interfere no
> `handleDragOver`/`handleDrop` já existentes nas colunas individuais (`dragover` borbulha
> normalmente, os dois handlers coexistem).
>
> **Testado ao vivo, ponta a ponta, com lead real** ("Gisele Cesse Campos", tenant CRM
> SOZINHO), reproduzindo o cenário exato do relato numa tela de 1440px (>3 colunas exigem
> scroll): (1) confirmado que um único evento `dragover` perto da borda esquerda já reduz
> `scrollLeft` em 28px · (2) 30 eventos seguidos (simulando o cursor parado perto da borda
> durante um arrasto real seguro) levam `scrollLeft` corretamente a 0, sem passar do limite ·
> (3) **fluxo completo**: lead movida pra "Proposta Enviada" (5ª coluna, mesmo exemplo citado
> pelo usuário) → board rolado todo pra direita (a 5ª coluna fica fora da view da 1ª) →
> `dragstart` no card real → 60 `dragover` seguidos perto da borda esquerda (simula segurar o
> card ali) → `scrollLeft` chega a 0 (1ª coluna revelada) → `drop` na 1ª coluna → confirmado
> por SQL: `coluna_id=58` ("Lead Captado"), exatamente o resultado que o usuário não
> conseguia obter com o mouse. Lead restaurada ao estado anterior ao teste (Entendimento da
> Dor, `valor_venda_estimado` intocado — confirma que o drag-and-drop nunca mexe nesse campo,
> mesmo depois do fix). `npx tsc --noEmit`: zero erros no arquivo tocado.

> **Atualizado em:** 2026-08-27 (continuação 7) — **2 itens: (1) investigado e descartado —
> "drag-and-drop/Avançar/Recuar parou de funcionar" era artefato do ambiente de teste, não
> regressão real; (2) rótulo "Mensagem Original do Lead" → "Mensagem do Lead"** (Kanban e
> `/crm/leads`), a pedido do usuário — raciocínio: com o precedente do Valor Estimado (agora
> editável ao longo do pipeline), qualquer campo capturado na criação do lead pode se tornar
> editável no futuro, então "original" deixa de comunicar a garantia de imutabilidade que o
> nome sugeria.
>
> **Investigação do item 1, mais longa que o esperado:** os botões "Avançar Etapa"/"Recuar
> Etapa" pareciam ausentes do DOM em checks via `document.body.innerText` — mas confirmado por
> **screenshot real** (não só leitura de DOM) que sempre estiveram lá, renderizando
> corretamente; o `innerText` só não capturava porque o footer do modal ficava abaixo da
> dobra do viewport pequeno (606x526) usado pela automação, combinado com o conteúdo rolável
> do corpo do modal — `innerText` não é confiável pra conteúdo fora do viewport visível nesse
> ambiente, `textContent`/screenshot são a fonte confiável. Clique real confirmou o botão
> "Avançar" funcionando (moveu lead 58→59, revertido depois).
>
> **Drag-and-drop — achado real, mas de causa ambiental, não de código:** simulação de
> `left_click_drag` (mouse-based) não dispara os eventos nativos HTML5 (`dragstart`/
> `dragover`/`drop`) — limitação conhecida de automação, não bug da aplicação. Reconstruído
> com `DragEvent`+`DataTransfer` reais via JS — a 1ª tentativa retornou `404 "Lead não
> encontrado ou sem permissão"` no `POST /api/crm/kanban/move`, e a causa raiz real era o
> **token JWT de teste ter expirado** durante a investigação (`exp` no passado, confirmado
> decodificando o token) — nada relacionado a `handleDragStart`/`handleDrop`. Gerado token
> novo (3h), reconfirmado com o MESMO mecanismo de `DragEvent`+`DataTransfer`: moveu o lead
> corretamente (58→59), revertido em seguida (59→58) com o mesmo mecanismo. **Nenhuma mudança
> de código foi necessária** — o drag-and-drop e os botões Avançar/Recuar continuam
> funcionando exatamente como antes; nenhuma das mudanças desta sessão os afetou.
>
> **Item 2 testado ao vivo:** ficha de "Gisele Cesse Campos" aberta via Kanban e via
> `/crm/leads` (botão "Abrir Ficha") — as duas confirmaram "MENSAGEM DO LEAD" (rótulo novo),
> zero ocorrência de "MENSAGEM ORIGINAL DO LEAD" restante. `npx tsc --noEmit`: zero erros nos
> 2 arquivos tocados (`crm/kanban/page.tsx`, `crm/leads/page.tsx`).

> **Atualizado em:** 2026-08-27 (continuação 6) — **Botão de salvar do Valor Estimado (ficha
> do lead) passa a só aparecer quando o campo tem alteração real pendente** — apontado pelo
> usuário como "issue ingênuo" da implementação anterior: o botão ficava sempre visível,
> mesmo sem nenhuma mudança digitada.
>
> **Implementado** (`src/app/crm/kanban/page.tsx`): computado `savedFormatted` (o valor JÁ
> PERSISTIDO em `selectedLead.valor_venda_estimado`, formatado com o mesmo `Number(...)
> .toLocaleString('pt-BR', {...})` já usado no sync inicial) e comparado contra
> `fichaValorEstimadoInput` (o que está no campo agora) — `hasUnsavedChange` só é `true`
> quando os dois divergem. O botão "Salvar Valor Estimado" (`CheckBadgeIcon`) só renderiza
> nesse caso, com uma pequena animação de entrada (`animate-in fade-in zoom-in-95`); some
> sozinho depois de um save bem-sucedido, porque `saveFichaValorEstimado` já atualiza
> `selectedLead.valor_venda_estimado` em memória com o mesmo valor recém-persistido — os dois
> lados da comparação convergem sem precisar de nenhum estado "dirty" separado pra resetar.
>
> **Testado ao vivo, ponta a ponta, com a mesma lead real** ("Gisele Cesse Campos", tenant CRM
> SOZINHO): campo sem alteração → botão ausente (`saveButtonVisible:false`) · valor alterado
> pra R$110.000,00 → botão aparece (`saveButtonVisibleAfterEdit:true`) · clique em salvar →
> `200 OK`, botão some (`saveButtonVisibleAfterSave:false`), confirmado por SQL que persistiu
> `valor_venda_estimado=110000.00` com `coluna_id` inalterado (59, Em Análise) · valor
> restaurado pra R$100.000,00 e salvo de novo, confirmado por SQL o estado exato de antes do
> teste. `npx tsc --noEmit`: zero erros no arquivo tocado.

> **Atualizado em:** 2026-08-27 (continuação 5) — **Fix real: campo "Demanda do Cliente" no
> "+ Novo Lead" sobrepunha texto digitado ao ultrapassar as linhas visíveis** — reportado pelo
> usuário ("quando atinge um limite, o que é digitado começa a cobrir palavras e letras
> anteriores").
>
> **Causa raiz:** a `<textarea>` (`NovoLeadModal.tsx`) não declarava `overflow-y-auto` própria
> e vivia aninhada dentro do corpo do modal, que já é rolável
> (`max-h-[60vh] overflow-y-auto`) — com o overflow do campo ambíguo (dependendo do default do
> navegador), o comportamento de "manter o cursor visível ao digitar" ficava indefinido:
> assim que o texto passava das 3 linhas visíveis, a nova linha era desenhada por cima da
> última linha já renderizada em vez de rolar o conteúdo do próprio campo pra baixo.
>
> **Corrigido:** `rows={3}` → `rows={4}` (mais espaço antes de precisar rolar) +
> `overflow-y-auto` explícito + `max-h-48` (trava a altura máxima do próprio campo, garante
> que ele sempre role internamente a partir daí) + `leading-relaxed` (espaçamento de linha
> mais folgado).
>
> **Testado ao vivo, ponta a ponta:** texto de 12 linhas digitado no campo real →
> `scrollHeight:570` vs `clientHeight:115` (confirma que o conteúdo excede a área visível) →
> `scrollTop` avançou corretamente até `455` (o máximo possível) ao posicionar o cursor no
> fim do texto — o campo rolou o próprio conteúdo pra manter o cursor visível, em vez de
> sobrepor texto. Confirmado visualmente por screenshot: barra de rolagem própria do campo,
> últimas 2 linhas ("Linha 11"/"Linha 12") legíveis e sem nenhuma sobreposição. Modal fechado
> sem submeter, confirmado por SQL que nenhum lead de teste foi criado (`count(*)=0`). `npx
> tsc --noEmit`: zero erros no arquivo tocado.

> **Atualizado em:** 2026-08-27 (continuação 4) — **Valor Estimado deixa de ser um popup que
> intercepta o move do card e vira campo editável direto na ficha do lead — pedido explícito
> do usuário depois de testar o mecanismo da continuação anterior ("o valor editável quando o
> lead se mover para outra fase, deverá funcionar não logo antes da exibição do card do lead,
> e sim no modal do proprio lead").**
>
> **Implementado** (`src/app/crm/kanban/page.tsx`): removido por completo o popup "Estimativa
> de Valor 💰" (`pendingEstimativaMove`/`confirmEstimativaMove`, ~60 linhas de JSX) — mover um
> lead pra qualquer coluna não-terminal nunca mais interrompe o fluxo pedindo valor. No lugar,
> a ficha ganhou um tile "Valor Estimado" sempre visível ao lado de "Valor Fechado (real)":
> **editável** (input mascarado + botão de salvar, `saveFichaValorEstimado` — reaproveita o
> próprio `POST /api/crm/kanban/move` passando o MESMO `coluna_id` atual, sem mudar de etapa)
> enquanto a etapa corrente não é Ganho/Perda; vira **somente leitura** (`—` ou o valor
> formatado) assim que o lead entra numa etapa terminal, onde estimar não faz mais sentido.
> Os botões "Avançar Etapa"/"Recuar Etapa" (`moveLead`) passam a levar consigo o valor que já
> está no campo da ficha (`requestMove(lead, targetCol, valorEstimadoOverride)`) — o
> drag-and-drop do board (`handleDrop`) continua chamando `requestMove` **sem** esse 3º
> argumento, de propósito: mover pelo board nunca deveria alterar silenciosamente uma
> estimativa que o atendente não está olhando naquele momento.
>
> **Bug real pego na própria verificação, corrigido:** o input da ficha mostrava o valor cru
> sem máscara (`"100000.00"` em vez de `"100.000,00"`) — causa raiz: o driver `pg` devolve
> coluna `NUMERIC` como **string** em JS, e `string.toLocaleString('pt-BR', {...})` cai no
> `Object.prototype.toLocaleString` (que ignora os argumentos e só devolve `.toString()`), não
> no `Number.prototype.toLocaleString` que de fato formata — silencioso, sem erro nenhum.
> Corrigido envolvendo em `Number(...)` antes de formatar (o `Intl.NumberFormat.format()` já
> usado no resto da ficha/card não tem esse problema, por isso só esse ponto quebrava).
>
> **Achado operacional, mesma classe já documentada várias vezes neste arquivo:** editar
> `pendingEstimativaMove`/`confirmEstimativaMove` pra fora do arquivo deixou o bundle do
> dev-server (HMR) preso numa versão anterior — `ReferenceError: pendingEstimativaMove is not
> defined` ao vivo no navegador, mesmo com `npx tsc --noEmit` limpo e o grep confirmando zero
> referência no source. Resolvido com o mesmo remédio de sempre (editar o comentário
> `// last-restart:` em `next.config.js`, força reinício completo do processo Next — confirmado
> via `Get-CimInstance Win32_Process` que um novo `start-server.js` de fato subiu depois do
> edit) + abrir uma aba NOVA do navegador (a aba antiga mantinha o runtime webpack antigo
> carregado em memória mesmo depois do servidor reiniciar).
>
> **Testado ao vivo, ponta a ponta, com lead real** ("Gisele Cesse Campos", tenant CRM
> SOZINHO, coluna real "Em Análise", `valor_venda_estimado` real = R$100.000,00): input da
> ficha confirmado exibindo `"100.000,00"` (formatado) depois do fix · salvamento autônomo
> (sem trocar etapa) testado alterando pra R$105.000,00 e clicando salvar → confirmado por SQL
> `valor_venda_estimado=105000.00` com `coluna_id` **inalterado** (59, Em Análise) · "Avançar
> Etapa" testado em seguida → confirmado por SQL `coluna_id` mudou pra 60 (Entendimento da
> Dor) **e** `valor_venda_estimado` permaneceu 105000.00 (não foi resetado/perdido pelo move) ·
> drag-and-drop confirmado por leitura de código não passando o 3º argumento (`handleDrop` →
> `requestMove(lead, targetCol)`, sem `valorEstimadoOverride`) · modo somente-leitura
> confirmado ao vivo abrindo a ficha de um lead real já em etapa Ganho (Severina Bastos,
> `valor_venda_estimado` NULL) — `hasEditableInput:false`, exibindo `"—"` honesto, sem input
> nenhum. Lead real "Gisele Cesse Campos" **restaurada ao estado exato de antes do teste**
> (coluna_id=59/Em Análise, valor_venda_estimado=100000.00, valor_venda ainda NULL),
> confirmado por SQL final. `npx tsc --noEmit`: zero erros no arquivo tocado.

> **Atualizado em:** 2026-08-27 (continuação 3) — **Fecha o loop de feedback da IA no "+ Novo
> Lead" + corrige 2 textos enganosos, depois de uma discussão de fundo sobre "qual é o papel
> real da IA nesta tela pra acelerar vendas".**
>
> **Contexto — pergunta direta do usuário sobre a frase "Estes dados engatilham a IA!"**
> (no bloco "Perfil de Interesse"): investigação em `ConciergeService.qualifyLead()` confirmou
> que a frase estava **errada** — `raw_json` (os campos dinâmicos tipo Marca Desejada/Ano
> Desejado) nunca é injetado no prompt do LLM, só serve de trava booleana ("existe dado
> estruturado?"); quem de fato alimenta a classificação é só o campo **"Demanda do Cliente"**
> (texto livre). Usuário pediu uma análise mais profunda, se colocando no lugar de um
> atendente/vendedor brasileiro médio — não técnico, sem paciência pra "IA nos bastidores" sem
> retorno visível. Meu diagnóstico, aceito pelo usuário: a qualificação acontecia **100% em
> silêncio** (o atendente digitava a Demanda, salvava, o modal fechava, e nada na tela mostrava
> o resultado — só reaparecia depois, escondido dentro da ficha) — o oposto de "acelerar
> vendas". Contrastado com os 5 Agentes de Aceleração (que ainda vamos testar): cada um entrega
> uma ação **visível e imediata** (alerta, sugestão pronta, mensagem de reativação já escrita),
> nunca um "score silencioso".
>
> **Implementado (3 itens, aprovados e implementados juntos):**
> 1. **Fecha o loop de feedback** — `POST /api/crm/leads` agora retorna `qualification`
>    (`tag_sonho`, `score_prontidao`, `score_fit`, sempre em %, honesto mesmo quando é "A
>    Definir" por falta de dado — nunca maquiado). `NovoLeadModal.tsx` ganha um **Passo 3**
>    ("Lead registrado") mostrando a tag real + os 2 scores + uma frase explicando o porquê
>    ("ajuda a priorizar quem atacar primeiro"), antes de fechar — substitui o fechamento
>    imediato e silencioso de antes.
> 2. **Rótulo da "Demanda do Cliente" reescrito** — ganha o sufixo "— ajuda a priorizar quem
>    atacar primeiro" e o placeholder passa a dizer explicitamente "A IA usa este texto pra
>    estimar Intenção e Aderência do lead" — nomeando o ganho real em linguagem de vendedor,
>    não de tecnologia.
> 3. **Frase errada do "Perfil de Interesse" corrigida** — "Estes dados engatilham a IA!" virou
>    "Os campos abaixo ficam salvos como referência rápida pra você e pro time — quem alimenta
>    a classificação por IA é a 'Demanda do Cliente', acima." — aponta pro campo certo.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO): lead criado com
> demanda real ("Cliente quer fechar hoje, tem o dinheiro em mãos, só está decidindo a cor.")
> → Passo 3 mostrou corretamente "Comprador à Vista" / Intenção 100% / Aderência 70% →
> confirmado por SQL que bate exatamente com o que foi persistido (`tag_sonho`,
> `score_prontidao`, `score_fit`). Lead de teste removido depois, `count(*)=0` confirmado.
> `npx tsc --noEmit`: zero erros nos 2 arquivos tocados.
>
> **Atualizado em:** 2026-08-27 (continuação 2) — **"Faixa de Valor" (campo dinâmico do Perfil
> de Interesse) e "Valor Estimado" (campo do Pipeline) eram genuinamente redundantes — os dois
> perguntavam "quanto o negócio vale", só que em momentos e por pessoas diferentes. Decisão do
> usuário: consolidar em só 2 valores no ciclo de vida do lead — Valor Estimado (nasce na
> criação, editável a cada troca de coluna) e Valor de Fechamento (real, automático em Ganho)
> — eliminando "Faixa de Valor" e o gate "Exige valor estimado" por coluna.**
>
> **Arquitetura nova, 100% agnóstica de segmento:**
> 1. **`NovoLeadModal.tsx`** — novo campo **fixo** "Valor Estimado (opcional)" (não depende
>    mais de `form_schema_json` do segmento) — grava direto em `valor_venda_estimado`, nunca
>    em `raw_json`. Campos `type:"currency"` do schema dinâmico deixam de ser renderizados
>    (substituídos por este campo único) — filtrados tanto na renderização quanto na
>    validação de obrigatório.
> 2. **`form_schema_json` dos 2 segmentos com campo de moeda** (Imobiliário `preco`, Venda de
>    Carros `faixa_preco`) — removidos via a API real do Master (`PUT .../ativo-config`).
>    Opção "Moeda" removida dos 2 seletores de tipo de campo (`SegmentAtivoConfigModal.tsx`
>    Master, `crm/config/segmentos/page.tsx` tenant) e do prompt de sugestão por IA
>    (`crm_ativo_form_schema_suggestion`, banco) — pra nenhum novo segmento recriar o campo
>    morto no futuro.
> 3. **`POST /api/crm/leads`** — aceita `valor_venda_estimado` na criação; no merge (Match
>    Engine, lead re-contata), atualiza só se um valor novo vier (`COALESCE`), nunca apaga um
>    valor já existente com null.
> 4. **`kanban/page.tsx` — `requestMove`** reescrito: coluna de Ganho e Perda continuam como
>    estavam (sem mudança); **qualquer outra coluna intermediária** agora SEMPRE oferece o
>    modal "Atualizar Valor Estimado?" pré-preenchido com o valor já existente do lead — não é
>    mais um gate condicionado a config de coluna (`requer_valor_estimado` aposentado, coluna
>    do banco mantida mas sem uso, sem migração destrutiva). Campo vazio ao confirmar = move
>    sem alterar nada (nunca zera um valor real só porque o atendente não mexeu).
> 5. **`/crm/config/kanban`** — checkbox "Exige valor estimado" removido (substituído por um
>    texto explicando o novo mecanismo automático); badge "Exige valor est." removido da
>    listagem.
>
> **Testado ao vivo, ponta a ponta, via API real** (tenant CRM SOZINHO): lead criado com
> `valor_venda_estimado=85000` → confirmado no banco, `raw_json` sem nenhuma chave de moeda ·
> movido pra coluna intermediária com novo valor (90000) → atualizado corretamente · movido de
> novo SEM passar valor → `valor_venda_estimado` permaneceu 90000, intocado · movido pra
> Ganho com `valor_venda=92000` → os dois campos (`valor_venda_estimado=90000`,
> `valor_venda=92000`) coexistiram sem se sobrescrever, exatamente como desenhado. Dado de
> teste removido depois. `npx tsc --noEmit`: zero erros em todos os 7 arquivos tocados.
>
> **Atualizado em:** 2026-08-27 — **Fix real: "Exige valor estimado ao entrar nesta etapa"
> só era desabilitado/desmarcado automaticamente pra "Etapa de Ganho" — "Etapa de Perda" não
> tinha a mesma trava, mesmo a lógica de negócio sendo idêntica nos dois casos.**
>
> **Contexto:** revisando o print da tela "Editar Etapa" (`/crm/config/kanban`), usuário
> questionou por que só Ganho desabilita esse checkbox, já que pedir valor estimado de
> pipeline aberto pra uma etapa marcada como Perda também não faz sentido — o negócio já
> morreu, não há mais nada a estimar. Confirmado no código (`kanban/page.tsx` linhas 222-225)
> que a trava (`disabled`/`checked` mascarado) só considerava `is_ganho`, nunca `is_perda` —
> lacuna real, não intencional (o texto de ajuda ao lado já dizia "Não aplicável na Etapa de
> Ganho", nunca mencionava Perda).
>
> **Corrigido nos 2 lados:**
> 1. `src/app/api/crm/kanban/colunas/route.ts` — `requerValorEstimado` (a normalização que já
>    existia só pra `!isGanho`) agora exige também `!isPerda` antes de persistir `true`.
> 2. `src/app/crm/config/kanban/page.tsx` — checkbox "Exige valor estimado" desabilitado
>    quando `is_ganho || is_perda` (antes só `is_ganho`); os onChange de "Etapa de Ganho" e
>    "Etapa de Perda" passaram a zerar `requer_valor_estimado` no state do cliente assim que
>    marcados (higiene — evita um `requer_valor_estimado:true` obsoleto sobrevivendo no
>    `currentEdit` só porque o checkbox ficou visualmente desmarcado/desabilitado, mesmo o
>    servidor já normalizando isso de qualquer forma). Texto de ajuda atualizado citando os
>    dois casos.
>
> **Testado ao vivo, com dado real** (tenant CRM SOZINHO, coluna real "Em Análise" — sem
> nenhum dos 3 atributos ativos): marcar "Etapa de Perda" → "Exige valor estimado" confirmado
> `disabled:true, checked:false` na hora, via DOM · desmarcar "Etapa de Perda" → checkbox
> volta a `disabled:false` · modal fechado sem salvar, confirmado por SQL que a coluna real
> permanece com os 3 campos `false`, sem nenhum resíduo do teste. `npx tsc --noEmit`: zero
> erros nos 2 arquivos tocados.
>
> **Atualizado em:** 2026-08-26 (continuação 4) — **3 correções reais no resumo do lead,
> reportadas por 2 prints (card do Kanban + ficha detalhe): (1) badge de valor fechado no
> card sem rótulo, difícil de identificar como "Valor Fechado" de longe; (2) leads antigos
> ainda mostrando o rótulo congelado "Faixa de Preço" mesmo depois do rename pra "Faixa de
> Valor" (config já corrigida numa entrada anterior); (3) ícone de calendário do card pedido
> em verde claro.**
>
> **(1) Badge "Valor Fechado" ganha rótulo explícito** — nos dois lugares que já mostravam o
> valor bruto sem contexto (`bg-emerald-500/10`, card do Kanban e resumo de `/crm/leads`),
> adicionado o prefixo `"Valor Fechado:"` dentro do próprio badge — mesma nomenclatura já
> usada na ficha ("VALOR FECHADO (REAL)"), agora reconhecível também no resumo sem precisar
> abrir a ficha.
>
> **(2) Cache de enriquecimento regenerado pros 5 leads reais afetados** — achado real,
> confirmado por SQL: `enriquecimento_cache` é congelado no momento da criação do lead
> (mesmo padrão já documentado várias vezes neste arquivo) — os 5 leads reais do segmento
> Venda de Carros (tenant CRM SOZINHO) criados antes do rename continuavam com o texto
> "Faixa de Preço" fossilizado, mesmo com `form_schema_json` já dizendo "Faixa de Valor".
> Como `EnrichmentService.reEnrichAllLeads()` só cobre o caminho de Vínculo Exato (exige
> `target_fk_column`, que este segmento não tem — só usa Perfil de Interesse), não havia
> nenhum mecanismo de lote pra esse caso. Regenerado via chamada real a
> `EnrichmentService.enrichLead(leadUuid, tenantId, null)` (o mesmo código que roda na
> criação de um lead novo) pelos 5 leads reais, através de uma rota temporária
> (`/api/admin/reenrich-tmp-2026`, Master-only, removida ao final — mesmo padrão de rotas
> de diagnóstico já usado várias vezes nesta sessão). Confirmado por SQL:
> `enriquecimento_cache::text LIKE '%Faixa de Preço%'` → `count=0` em toda a base depois.
> De brinde, o resíduo "Orçamento Previsto" (que ainda existia no `raw_json` de 1 lead, de
> antes da remoção do campo) também saiu do badge — a reconstrução usa o schema ATUAL, que
> não tem mais esse campo, então ele deixa de aparecer mesmo sem apagar o dado bruto.
>
> **(3) Ícone de "Agendar Visita" no card do Kanban — azul → verde claro** (pedido direto do
> usuário) — `border-blue-*`/`text-blue-*` trocado por `border-emerald-*`/`text-emerald-*`
> nos dois temas (claro/escuro). Só o ícone inline do CARD, não o botão grande "Agendar
> Visita" da ficha (que continua indigo, fora de escopo — não foi pedido).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, 5 leads reais):
> "FAIXA DE VALOR" confirmado em todos os 5 cards, zero ocorrência de "FAIXA DE PREÇO"/
> "ORÇAMENTO PREVISTO" restante · "Valor Fechado: R$ 45.000,00"/"R$ 55.000,00" confirmados
> com o rótulo novo nos 2 leads reais já fechados · ícone de calendário confirmado via
> `getComputedStyle` — `color: rgb(5,150,105)` / `borderColor: rgb(167,243,208)` (emerald-
> 600/emerald-200 exatos) nos 5 botões reais do board. `npx tsc --noEmit`: zero erros nos 2
> arquivos tocados. Rota temporária de re-enriquecimento removida, confirmado ausente do
> `git status`.
>
> **Atualizado em:** 2026-08-26 (continuação 3) — **`/crm/leads`: Valor Fechado (real) passa a
> aparecer logo no resumo da linha (coluna "Dados Enriquecidos"), não mais só dentro da ficha
> — pedido direto do usuário: "quando um lead tiver passado pela fase de fechamento... esse
> valor de fechamento também é para ser exibido logo no resumo do lead".**
>
> `src/app/crm/leads/page.tsx` — badge `lead.valor_venda != null` inserido no topo da célula
> "Dados Enriquecidos", antes do bloco `EnrichedLeadData`/snippet de mensagem — mesma cor/
> formato já usado no card do Kanban (`bg-emerald-500/10 text-emerald-500`), pra manter o
> mesmo vocabulário visual de "isto é o valor REAL de um negócio fechado" em toda a
> plataforma. Escopo deliberadamente restrito ao valor REAL (`valor_venda`) — o pedido foi
> especificamente sobre "fase de fechamento"; `valor_venda_estimado` (Pipeline em aberto) não
> foi tocado nesta rodada, sem que tenha sido pedido.
>
> **Testado ao vivo, com dado real** (tenant CRM SOZINHO): 2 leads reais já fechados
> ("Severina Bastos" R$45.000,00, "Julieta Maria Lima" R$55.000,00) confirmados via DOM —
> `getComputedStyle` mostra `rgb(16,185,129)`/`rgba(16,185,129,0.1)` (emerald-500 exato) só
> nesses 2 valores, distinto dos demais valores em texto simples (Faixa de Preço/Orçamento
> Previsto, que continuam neutros) — os 3 leads sem fechamento não mostram nenhum badge extra.
> `npx tsc --noEmit`: zero erros no arquivo tocado.
>
> **Atualizado em:** 2026-08-26 (continuação 2) — **Modal "Negócio Fechado" do Kanban passa a
> mostrar, como referência desabilitada, o valor de interesse que o PRÓPRIO lead declarou —
> genérico por segmento, feito na mesma investigação do rótulo "Faixa de Valor".**
>
> **Correção de premissa, antes de agir:** o usuário presumiu que "Faixa de Preço"/"Orçamento
> Previsto" (entrada anterior) fossem colunas reais de `leads_staging` e pediu pra excluir a
> que sobrou. Confirmado via `\d leads_staging`: **nunca existiu coluna nenhuma com esses
> nomes** — são só chaves dentro do `raw_json` (JSONB genérico), geradas dinamicamente pelo
> `form_schema_json` que o Master cura por segmento. `raw_json.faixa_preco`,
> `valor_venda_estimado` e `valor_venda` são as 3 colunas de valor reais da tabela, 100%
> independentes entre si — confirmado lendo `kanban/move/route.ts`: o `UPDATE` do move monta
> um `SET` dinâmico que só toca `status`/`valor_venda`/`valor_venda_estimado`/`updated_at`,
> nunca `raw_json`. Informar o valor de fechamento nunca sobrescreve o que foi digitado em
> "Faixa de Valor". Achado 1 resíduo histórico real (1 lead com `orcamento_previsto` ainda no
> `raw_json`, de antes da remoção do campo) — deixado intacto, dado congelado, mesmo padrão já
> adotado no projeto pra não reprocessar histórico sem pedido explícito.
>
> **Implementado (pedido real, não hipotético):** no modal "Negócio Fechado 🎉" (dispara ao
> mover um lead pra uma coluna de Ganho), o atendente agora vê, acima do campo de valor real,
> um campo **desabilitado** com o valor que o próprio lead declarou no Perfil de Interesse —
> rótulo "Faixa de Valor (declarado pelo lead)" hoje, mas **calculado dinamicamente**: sempre
> o 1º campo `type:"currency"` do `form_schema_json` resolvido pro tenant/segmento
> (`GET /api/crm/ativo/config`, já existente, reaproveitado) — zero nome de campo/segmento
> fixo, funciona igual em Imobiliário (`preco`) ou qualquer segmento futuro com um campo de
> moeda no Perfil de Interesse. Só aparece quando o segmento tem esse campo configurado E o
> lead de fato preencheu (nunca um campo vazio). O campo real de baixo foi renomeado de
> "Valor da Venda (opcional)" pra **"Valor de Fechamento (opcional)"**, como pedido.
>
> `l.raw_json` adicionado ao `SELECT` de `GET /api/crm/leads` (não vinha antes) —
> `kanban/page.tsx` ganhou `raw_json` no tipo `Lead`, novo state `ativoFormSchema` (fetch de
> `/api/crm/ativo/config` no mount) e `referenceValueField` (useMemo, acha o campo currency).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, lead real "Frank
> Aguiar", `raw_json.faixa_preco="R$ 20.000,00"`): avançado etapa a etapa (Lead Captado →
> ... → Proposta Enviada → tentativa de mover pra Fechamento) até disparar o modal — campo
> desabilitado confirmado via DOM (`disabled:true, value:"R$ 20.000,00"`), rótulo "FAIXA DE
> VALOR (DECLARADO PELO LEAD)" renderizado corretamente, campo "VALOR DE FECHAMENTO
> (OPCIONAL)" vazio ao lado. Modal cancelado (não fechei negócio de verdade nesse lead real) e
> o lead recuado etapa a etapa de volta pra "Lead Captado" — confirmado por SQL que
> `valor_venda`/`valor_venda_estimado` permanecem `NULL`, sem nenhum resíduo da verificação.
> `npx tsc --noEmit`: zero erros nos 2 arquivos tocados.
>
> **Atualizado em:** 2026-08-26 (continuação) — **Rótulo "Faixa de Preço" → "Faixa de Valor"
> no segmento Venda de Carros + esclarecido pro usuário: `raw_json.faixa_preco` (Perfil de
> Interesse, na criação) e `valor_venda`/`valor_venda_estimado` (Pipeline/Fechamento, no
> Kanban) são 3 colunas 100% independentes em `leads_staging` — confirmado lendo
> `kanban/move/route.ts`, o `UPDATE` do move monta um `SET` dinâmico que só toca `status`/
> `valor_venda`/`valor_venda_estimado`/`updated_at`, nunca `raw_json`. Informar o valor de
> fechamento nunca sobrescreve nem apaga o que foi digitado em "Faixa de Valor" — coexistem
> na mesma linha, cada um com seu propósito (interesse declarado × estimativa de pipeline ×
> valor real fechado).
>
> Mudança em si é só de rótulo — `name: "faixa_preco"` (a chave interna, usada dentro de
> `raw_json` e lida pelo `EnrichmentService`) preservado intacto de propósito, pra não quebrar
> a leitura de nenhum dado já gravado; só o `label` exibido mudou. Feito via a mesma API real
> do Master (`PUT /api/admin/master/segments/[id]/ativo-config`), sem SQL direto.
>
> **Testado ao vivo:** round-trip da API confirma `label:"Faixa de Valor"` com `name`/`type`/
> `required` intactos; sessão real no navegador → "+ Novo Lead" → Passo 2 confirma o rótulo
> "FAIXA DE VALOR" renderizado corretamente. Modal fechado sem submeter, confirmado por SQL
> que nenhum lead de teste foi criado (`count(*)=0`).
>
> **Atualizado em:** 2026-08-26 — **Campo redundante removido do "Perfil de Interesse" do
> segmento Venda de Carros: "Orçamento Previsto" e "Faixa de Preço" eram 2 campos de moeda
> separados perguntando essencialmente a mesma coisa — usuário apontou via print real do
> `NovoLeadModal.tsx` e pediu análise de todo o módulo de CRM antes de decidir qual ficava.**
>
> **Investigação (sem tocar em nada), ponta a ponta, confirmou zero distinção funcional entre
> os dois em qualquer lugar do código:** (1) `NovoLeadModal.tsx` renderiza o formulário 100%
> genérico a partir do `form_schema_json` do segmento — nenhuma linha reconhece nenhum dos 2
> nomes; (2) `POST /api/crm/leads` grava os dois juntos, sem distinção, dentro do mesmo blob
> `raw_json`; (3) `ConciergeService.qualifyLead` recebe `raw_json` só como flag booleana
> ("existe dado estruturado?") — o conteúdo NUNCA é injetado no prompt do LLM, só `mensagem`
> (texto livre) vai pra IA, então nenhum dos 2 campos influencia score/qualificação hoje; (4)
> `EnrichmentService.enrichGenericLead` (os badges de "Dados Enriquecidos") itera o schema
> campo a campo sem nenhum `if` por nome — os dois, sendo `type:"currency"`, recebiam
> exatamente o mesmo ícone, formatação e `full_width:true`; (5) nenhum dos 2 se conecta a
> `valor_venda`/`valor_venda_estimado` (os campos reais de Pipeline/Fechamento) — essa
> captura é 100% independente, feita depois, ao mover o lead no Kanban. Única diferença real
> encontrada: `faixa_preco` era `required:true`, `orcamento_previsto` era `required:false`.
>
> **Decisão do usuário, depois da análise:** manter só "Faixa de Preço" (o obrigatório).
> Corrigido via a própria API real do Master (`GET`+`PUT
> /api/admin/master/segments/[id]/ativo-config`, replace-all — nunca SQL direto), removendo
> só a entrada `orcamento_previsto` do `form_schema_json` do segmento Venda de Carros; os
> outros 5 campos (`marca_desejada`, `faixa_preco`, `ano_desejado`, `tipo_veiculo`,
> `comentario`) e `target_table`/`layout_json`/`is_active` preservados exatamente como
> estavam. Nenhum tenant tinha override próprio desse schema (`crm_ativo_config_tenant`
> confirmado vazio pra ambos os nomes) — só a config do segmento precisou de ajuste.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, sessão real):
> round-trip da API confirma os 5 campos certos, `orcamento_previsto` ausente · sessão real no
> navegador → "+ Novo Lead" → Passo 2 "Perfil de Interesse" confirma só 5 campos renderizados
> (Marca Desejada/Faixa de Preço/Ano Desejado/Tipo de Veículo/Comentário), sem "Orçamento
> Previsto" · confirmado que leads JÁ EXISTENTES (ex. "Julieta Maria Lima", "Frank Aguiar" na
> coluna "Em Análise") continuam mostrando o badge "ORÇAMENTO PREVISTO" no card do Kanban —
> comportamento esperado e correto, é o `enriquecimento_cache` já gravado no momento da
> criação de cada um, a mudança só afeta lead criado daqui pra frente, nunca reprocessa
> retroativamente dado histórico. Modal fechado sem submeter, confirmado por SQL que nenhum
> lead de teste foi criado (`count(*)=0`).
>
> **Causa raiz:** `AdminSidebar.tsx`, `isActive(href)` usava `pathname.startsWith(href)` sem
> nenhum limite — `/crm` (Dashboard de ROI CRM) é literalmente um prefixo de string de
> `/crm/config/kanban` (Personalização Kanban), então os dois casavam ao mesmo tempo pra
> qualquer página dentro de `/crm/*`. O código já tinha um caso especial pra `/admin` exigindo
> match exato (`href === '/admin' ? pathname === '/admin' : ...`) — sinal de que esse mesmo
> problema já tinha sido notado ali antes, só nunca generalizado pra outros caminhos curtos
> como `/crm`.
>
> **Corrigido, sem quebrar o caso legítimo de rota dinâmica aninhada** (ex.: uma lista
> continuar destacada enquanto se edita um registro dela, tipo `/algo/42/editar`): agora
> `isActive` só considera um item "ativo por ancestralidade" quando **nenhum outro item do
> menu é um match mais específico** (mais longo) pro `pathname` atual — calculado achatando
> todos os `path` reais cadastrados no menu (`allMenuPaths`) e comparando comprimento. Como
> `/crm/config/kanban` É um item real do próprio menu, ele sempre vence `/crm` como o match
> mais específico, e `/crm` para de acender à toa.
>
> **Testado ao vivo, os dois sentidos, com dado real** (tenant Marketing Digital, mesma
> estrutura de menu do print do usuário): em `/crm/config/kanban` → só "Personalização
> Kanban" com fundo destacado (`rgb(26,43,60)`), "Dashboard de ROI CRM" transparente (bug
> original confirmado corrigido) · em `/crm` → só "Dashboard de ROI CRM" destacado, todos os
> irmãos (Personalização Kanban, Catálogo de Atividades, Agentes de Aceleração, Field
> Builder) transparentes — nenhuma regressão no sentido inverso. `npx tsc --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 40) — **Fix real: em `/crm/config/atividades`,
> clicar num filtro de categoria ou numa aba de biblioteca (Lucide/Material/Heroicons) dentro
> do seletor de ícone submetia o formulário de "Nova Atividade" por engano, fechando o modal
> e "pulando" os campos seguintes — usuário relatou percebendo isso ao escolher um ícone.**
>
> **Causa raiz:** 6 `<button>` dentro dos 3 componentes do seletor de ícone
> (`HybridIconSelector.tsx`, `LucideIconSelector.tsx`, `MaterialIconSelector.tsx`) nunca
> tinham `type="button"` — as abas de biblioteca (✨ Lucide / 🎨 Material / ⚡ Heroicons), os
> filtros de categoria de cada biblioteca, e o botão "Limpar" da busca do Lucide. Como esses
> componentes vivem DENTRO do `<form onSubmit={handleSave}>` da tela de atividades, o HTML
> trata qualquer `<button>` sem `type` explícito como `type="submit"` por padrão — clicar em
> qualquer um desses (não só no ícone final) disparava `handleSave()` com o formulário ainda
> incompleto, salvando e fechando o modal na hora. Só o botão do ícone individual em si (o
> quadradinho clicável de cada ícone) já tinha `type="button"` correto nos 3 componentes —
> por isso o problema só aparecia ao interagir com abas/filtros ANTES de clicar no ícone
> escolhido, não sempre.
>
> **Corrigido:** `type="button"` adicionado nos 6 pontos. Sem mudança de comportamento
> nenhuma além de parar de submeter sozinho — o clique em cada aba/filtro continua fazendo
> exatamente o que já fazia (trocar biblioteca, filtrar categoria, limpar busca).
>
> **Testado ao vivo, reproduzindo a sequência exata do bug e confirmando a correção**
> (tenant Marketing Digital, via `/crm/config/atividades` → "+ Nova Atividade" → abrir
> seletor de ícone): clique na aba "🎨 Material (Otimizado)" → modal continuou aberto,
> trocou de biblioteca corretamente (confirmado por `type="button"` no DOM real e pelo
> conteúdo da tela mudando para "Material UI Icons... 30 ícones") · clique no filtro
> "Business (2)" → modal continuou aberto, filtrou corretamente · clique no ícone real
> "Apartment" → seletor fechou (comportamento esperado), modal principal continuou aberto
> com Nome/Ordem/Cor/Direção/Salvar ainda visíveis, campo Ícone preenchido com
> `mui-Apartment` — fluxo completo, do jeito que deveria ter funcionado desde sempre. Modal
> fechado sem salvar (`Fechar`), confirmado por SQL que nada foi persistido
> (`count(*)=0` pra `icone='mui-Apartment'`). `npx tsc --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 39) — **Ícone do avatar em `/crm/leads`
> (coluna Identidade) trocado de azul pra laranja claro — usuário apontou que o cliente é a
> informação mais importante da linha e merece se destacar do azul, já o acento dominante no
> resto da tela (filtros, badge de telefone, "Abrir Ficha").**
>
> `src/app/crm/leads/page.tsx` — mesma estrutura da continuação 38 (fundo leve + `UserIcon`),
> só a cor muda: `bg-blue-50/text-blue-500` → `bg-orange-50/text-orange-500` (claro),
> `bg-blue-500/10/text-blue-400` → `bg-orange-500/10/text-orange-400` (escuro).
>
> **Testado ao vivo**: confirmado via `getComputedStyle` — `rgb(255,247,237)`/`rgb(249,115,22)`
> (orange-50/orange-500 exatos) nos 3 primeiros avatares reais, consistente. `npx tsc
> --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 38) — **Ícone do avatar em `/crm/leads`
> (coluna Identidade) unificado — antes distinguia `imovel_id` via ícone/gradiente diferente
> (`UsersIcon` azul-índigo saturado vs. `MapPinIcon` slate, este último trocado de verde pra
> slate na continuação 37), usuário pediu algo mais simples.**
>
> `src/app/crm/leads/page.tsx` — os 2 estados viram 1 só: `UserIcon` (o ícone tradicional de
> perfil/rosto, `@heroicons/react/24/outline`, nunca usado nesta tela antes — `UsersIcon`
> plural continua importado, ainda usado em `OwnerAvatar` e no header da ficha) sobre fundo
> leve e colorido (`bg-blue-50`/`text-blue-500` claro, `bg-blue-500/10`/`text-blue-400`
> escuro) — nunca preto nem cinza, como pedido explicitamente; reaproveita o mesmo azul já
> usado como acento único no resto da página (filtros ativos, "Abrir Ficha"), em vez de um
> gradiente saturado.
>
> **Testado ao vivo, com dado real** (6 leads reais, tenant Marketing Digital): confirmado via
> `getComputedStyle` que os 6 avatares têm exatamente o mesmo `backgroundColor`
> (`rgb(239,246,255)` = blue-50) e `color` (`rgb(59,130,246)` = blue-500) — consistente entre
> todas as linhas, independente de `imovel_id`. `npx tsc --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 37) — **3 ajustes de UI em `/crm/leads`, todos
> pedidos direto pelo usuário: remoção do botão "Importar CSV/Planilha" (decorativo, agora
> pendência documentada), ícone verde ao lado do nome do lead trocado por neutro, e padding
> mais estreito nas colunas Intenção/Aderência/Responsável/Origem-Data pra fechar o espaço em
> branco entre elas + telefone e "Origem/Data" garantidos em 1 linha só.**
>
> 1. **Botão "Importar CSV/Planilha" removido** — `src/app/crm/leads/page.tsx`, era o mesmo
>    tipo de UI morta do botão de impressão digital (continuação 34), só que sem função
>    nenhuma ainda planejada pra virar; a pendência real já ficou documentada na continuação
>    anterior (35), o botão em si não devia continuar visível prometendo algo que não existe.
> 2. **Ícone circular ao lado do nome (quando o lead não tem `imovel_id`) — verde/emerald
>    trocado por slate neutro** (`bg-gradient-to-tr from-emerald-600 to-green-600` →
>    `from-slate-500 to-slate-600`). O verde competia com o significado já estabelecido dessa
>    cor no resto da tela (Valor Fechado real, docs/CHECKPOINT.md 2026-08-13) e ficava
>    "carnavalesco" ao lado do azul do outro estado (lead com `imovel_id`); slate é a mesma
>    paleta discreta já usada no badge de Etapa.
> 3. **Espaço em branco entre Intenção/Aderência/Responsável/Origem-Data** — as 4 colunas
>    tinham `px-6` (24px de cada lado) mesmo com conteúdo bem curto (%, avatar pequeno, 2
>    linhas de texto); reduzido pra `px-3` no header E no corpo da tabela (mantendo os dois
>    em sincronia, senão cabeçalho e célula ficam desalinhados). De brinde, telefone (badge
>    azul na coluna Identidade) e as 2 linhas de "Origem/Data" ganharam `whitespace-nowrap`
>    (nunca mais quebram em 2 linhas); "Origem/Data" também teve a fonte reduzida (`text-xs`→
>    `text-[11px]`, `text-[10px]`→`text-[9px]`) e `tracking-widest`→`tracking-wide` no rótulo,
>    dando mais folga sem precisar alargar a coluna.
>
> **Achado real no meio da verificação, resolvido:** depois de editar o arquivo várias vezes
> em sequência rápida, o compilador SWC do dev server ficou preso mostrando um erro de sintaxe
> stale (`Unexpected token 'div'`) mesmo com `npx tsc --noEmit` limpo e o arquivo genuinamente
> correto — mesmo padrão de "cache do Next mascarando estado real" já documentado várias vezes
> neste arquivo. Resolvido com o mesmo remédio de sempre (editar o comentário `last-restart` em
> `next.config.js`, força reinício completo do processo). Confirmado depois que os erros que
> persistiam no `read_console_messages` eram só histórico acumulado da sessão do navegador
> (o tool não limpa entradas antigas sozinho) — a página em si já estava renderizando
> corretamente havia várias checagens antes disso ser percebido.
>
> **Testado ao vivo, com dado real** (tenant Marketing Digital, 6 leads reais via Histórico):
> botão CSV confirmado ausente do DOM · ícones dos 5 leads sem `imovel_id` confirmados slate
> via inspeção de classe (não mais `emerald`/`green`) · larguras reais das colunas medidas via
> `getBoundingClientRect` — Intenção 96,8px / Aderência 105,3px / Responsável 125,1px /
> Origem-Data 132,8px (bem mais estreitas que antes, com `px-6` cada uma reservaria 48px só de
> padding) · badge de telefone confirmado 1 linha só (`scrollWidth === clientWidth`, `white-
> space: nowrap`) · as 2 linhas de "Origem/Data" confirmadas 1 linha cada (`height:16.5px` e
> `13.5px`, alturas de linha única, sem overflow) — a altura maior da célula como um todo
> (90,5px) vem da coluna Identidade (nome+telefone+e-mail, 3 linhas), que dita a altura da
> linha inteira da tabela, não de quebra dentro da própria célula de Origem/Data. `npx tsc
> --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 36) — **Snippet de mensagem original em
> `/crm/leads` alargado — usuário apontou que sobrava muito espaço em branco à direita do
> texto truncado antes de precisar clicar em expandir.**
>
> Causa: o snippet (recolhido) tinha `max-w-[220px]`, mas a coluna "Dados Enriquecidos" já é
> naturalmente mais larga que isso — o conteúdo irmão logo acima (`EnrichedLeadData`, quando
> o lead tem dados enriquecidos) usa `max-w-sm` (384px), e como colunas de tabela HTML em
> `table-layout: auto` compartilham a largura mais larga entre TODAS as linhas, a coluna já
> media 384px de qualquer forma — o snippet só não aproveitava esse espaço já reservado.
>
> `src/app/crm/leads/page.tsx` — `max-w-[220px]` → `max-w-sm`, mesmo valor já usado pelo
> `EnrichedLeadData` irmão (reaproveita o teto já existente em vez de inventar um novo);
> ternário `isExpanded ? 'max-w-sm' : 'max-w-[220px]'` simplificado pra um valor único fixo
> (recolhido e expandido usam a mesma largura máxima agora — a diferença entre os dois
> estados passou a ser só `truncate` vs. `whitespace-pre-wrap` no `<span>` interno, não mais
> também a largura do container).
>
> **Testado ao vivo com dado real**: mesma mensagem de teste, mesma posição de corte medida
> via `scrollWidth`/`clientWidth` — largura do botão confirmada em 384px (era 220px);
> conteúdo visível antes das reticências quase dobrou de tamanho na prática. Lead de teste
> removido depois, `count(*)=0` confirmado. `npx tsc --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 35) — **Pendência futura registrada: "Importar
> CSV/Planilha" em `/crm/leads` — investigado, nada implementado (pedido explícito do
> usuário: "vamos deixar para implementar isso depois").**
>
> Mesmo padrão do botão de impressão digital (continuação 34): o botão existe desde o
> primeiro commit da tela (27/05/2026), sem `onClick`, 100% decorativo. Pesquisa (agente
> Explore) confirmou que **não existe absolutamente nenhuma infraestrutura** por trás disso
> hoje — nem rota de API, nem pacote npm de parsing (CSV/XLSX), nem menção em nenhum doc de
> planejamento do projeto, nem tela parecida em qualquer outro lugar da aplicação pra servir
> de referência (o único endpoint de import existente, `mensageria/knowledge/import`, é
> "1 arquivo → 1 registro", não import tabular linha a linha).
>
> **Decisões reais que vão precisar ser tomadas quando isso for atacado, registradas aqui pra
> não perder o levantamento:**
> 1. **Biblioteca de parsing** — nenhuma instalada (`papaparse` p/ CSV; `.xlsx` real exigiria
>    algo como `exceljs`/`xlsx` também, já que o botão promete os dois formatos).
> 2. **Qual semântica de duplicata usar na importação em massa** — o ponto mais delicado. O
>    CRM já tem 2 comportamentos bem diferentes hoje pra criação de lead: o Match Engine
>    automático (`POST /api/crm/leads` sem `utm_source='CRM Manual'`) funde num lead
>    existente por e-mail OU telefone normalizado (últimos 10 dígitos), com email tendo
>    prioridade, dentro do mesmo `tenant_id`; já o "+ Novo Lead" manual sempre cria um card
>    novo, mesmo duplicado, de propósito. Uma planilha de centenas/milhares de linhas precisa
>    escolher um dos dois — mesclar tudo automaticamente arrisca perder dado real se a
>    planilha tiver ruído de e-mail/telefone; nunca mesclar arrisca duplicar em massa.
> 3. **Nenhuma validação no banco** — `leads_staging` não tem `NOT NULL` em quase nenhuma
>    coluna (só a PK), toda validação de negócio hoje é só na camada da API (`POST
>    /api/crm/leads` exige e-mail OU telefone, exceto quando `utm_source='CRM Manual'`). Um
>    importador que gravasse linha crua direto no banco sem passar pela mesma validação
>    encheria a tabela de lixo.
> 4. **`UNIQUE(email, imovel_id)`** — constraint real no banco (`idx_leads_staging_
>    unificacao`), diferente da chave que o Match Engine da aplicação usa (tenant+e-mail/
>    telefone) — um importador ingênuo pode violar essa constraint sem perceber, ou vice-versa
>    deixar passar duplicata que o app consideraria a mesma pessoa.
> 5. **UI de pré-visualização/erro por linha** — não existe nenhum precedente na aplicação
>    (upload de imagem/documento/PDF não serve de referência pra parsing tabular). Precisaria
>    decidir: preview antes de confirmar, sinalização linha a linha do que é válido/inválido,
>    e processamento síncrono vs. job em background pra planilhas grandes.
>
> Nada implementado nesta rodada — só investigação + registro. Retomar quando o usuário
> priorizar.
>
> **Atualizado em:** 2026-08-25 (continuação 34) — **Botão de impressão digital na coluna
> "Ação" de `/crm/leads` (ao lado de "Abrir Ficha") era UI morta desde o primeiro commit da
> tela — sem `onClick`, sem tooltip, sem nenhuma função. Usuário perguntou pra que servia;
> investigado (confirmado via `git log -S`, existe desde 27/05/2026 sem nenhuma alteração
> depois) e, junto com o usuário, transformado em algo real: abre um painel explicando como o
> Match Engine (F4) resolveu aquele lead.**
>
> `src/app/api/crm/leads/route.ts` — `match_method` (já gravado no banco desde F4, nunca
> exposto pelo `GET`) adicionado ao `SELECT`. `src/app/crm/leads/page.tsx` —
> `MATCH_METHOD_INFO` (rótulo + explicação em PT-BR pros 4 valores reais: `email`/`telefone`/
> `manual`/`novo`); botão vira funcional (`onClick`, `title`, fundo azul quando o painel está
> aberto) — `state` `openMatchInfo` (`Set<string>`, por `lead_uuid`, independente entre
> linhas, mesmo padrão já usado pro expand de mensagem original); painel abre como uma linha
> extra da tabela (`colSpan={9}`, fundo azul claro) logo abaixo do lead, não um popover
> flutuante — evita qualquer risco de recorte pelo `overflow-hidden` do container da tabela.
> Lead anterior à existência da coluna (`match_method IS NULL`) cai num fallback honesto
> ("Não registrado"), nunca inventa um método.
>
> **Testado ao vivo, os 3 estados reais, com dado real** (tenant Marketing Digital): lead
> criado via `POST /api/crm/leads` com `utm_source:'CRM Manual'` → painel "Cadastro Manual" ·
> 2º `POST` reenviando o mesmo e-mail de um lead já existente (sem `utm_source`) → Match
> Engine mesclou no mesmo `lead_uuid`, confirmado por SQL `match_method='email'`, painel
> exibiu "E-mail" com a explicação certa · lead real de 04/07/2026 (anterior a F4/Match
> Engine, `match_method` `NULL` no banco) → painel exibiu corretamente "Não registrado" · os
> 2 primeiros testados abertos AO MESMO TEMPO, confirmando que o toggle é independente por
> linha. Leads de teste removidos depois, `count(*)=0` confirmado. `npx tsc --noEmit`: 0
> erros.
>
> **Atualizado em:** 2026-08-25 (continuação 33) — Título de `/crm/leads` renomeado de
> "CENTRO DE STAGING (CAPTAÇÃO)" / "Gerenciamento de leads qualificados pela Inteligência
> Concierge." para "LEADS" / "Gerenciamento de Leads" — pedido direto do usuário, texto puro,
> sem mudança de lógica. Confirmado ao vivo no navegador.
>
> **Atualizado em:** 2026-08-25 (continuação 32) — **Snippet de mensagem original em
> `/crm/leads` ganha botão de expandir/recolher — antes só dava pra ver a íntegra no hover do
> `title` nativo (pouco descobrível, inútil em touch) ou abrindo a ficha inteira.**
>
> Pedido direto do usuário na sequência da entrega anterior (continuação 31, mesmo dia): "na
> visualização da mensagem original do lead, deveria ter uma opção de expandir para
> visualização da mensagem original na íntegra".
>
> `src/app/crm/leads/page.tsx` — snippet da tabela virou um `<button>` clicável (ícone de
> balão + texto + chevron ↓/↑) em vez de um `<div>` estático: novo state `expandedMessages`
> (`Set<string>` de `lead_uuid`, por linha, independente entre leads) + `toggleMessageExpand`.
> Recolhido: `truncate` (1 linha, reticências) em `max-w-[220px]`, chevron pra baixo. Expandido:
> `whitespace-pre-wrap break-words` (texto completo, com quebra de linha real) em `max-w-sm`,
> chevron pra cima. `title` nativo mantido nos dois estados como reforço (texto completo
> recolhido / "Recolher mensagem" expandido), nunca removido — só deixou de ser o único jeito
> de ver a íntegra sem sair da lista.
>
> **Testado ao vivo, os dois sentidos, com dado real** (lead de teste, mensagem de ~420
> caracteres): recolhido → `span.className="truncate"`, `scrollWidth(2024) > clientWidth(188)`
> (corte real confirmado, não só corte de viewport) · clique → expandido →
> `span.className="whitespace-pre-wrap break-words"`, `button.title="Recolher mensagem"`,
> altura do botão salta pra 420px (texto genuinamente quebrando em várias linhas, não mais 1
> linha cortada) · clique de novo → volta ao estado recolhido, `title` volta a ser o texto
> completo. Confirmado visualmente via screenshot (chevron ▲ visível, texto em 3+ linhas).
> Lead de teste removido depois, `count(*)=0` confirmado. `npx tsc --noEmit`: 0 erros.
>
> **Atualizado em:** 2026-08-25 (continuação 31) — **Mensagem original do lead nunca era
> persistida em lugar nenhum — só a reescrita da IA (`resumo_ia`) sobrevivia. Nova coluna
> `mensagem_original`, exibida na íntegra na ficha (Kanban + `/crm/leads`), snippet truncado
> na listagem, e incluída na busca por texto. Achado de brinde, mais sério: leads de WhatsApp
> orgânico eram qualificados pela IA com string vazia, sempre — bug de nome de campo.**
>
> **Contexto:** usuário reportou que a mensagem original informada na captação do lead nunca
> aparecia por inteiro — nem no card do Kanban, nem em `/crm/leads` — só a versão já
> reescrita pela IA. Pediu também: (1) como exibir isso em `/crm/leads` sem virar UI feia
> numa lista densa, se a mensagem for grande; (2) incluir o conteúdo da mensagem original na
> busca por texto (hoje só nome/telefone/email/tag do sonho).
>
> **Causa raiz confirmada com dado real** (lead "Severina Bastos", criado nesta mesma sessão):
> `POST /api/crm/leads` recebe `data.mensagem` só como insumo passageiro pro
> `ConciergeService.qualifyLead()` — gera `tag_sonho`/`resumo_ia`/scores e descarta em
> seguida; nenhuma coluna de `leads_staging` guarda o texto verbatim. `raw_json` só tem os
> campos estruturados do formulário (`faixa_preco`, `ano_desejado`...), nunca a "Demanda do
> Cliente" que a pessoa efetivamente digitou.
>
> **Achado extra, mais grave, no mesmo caminho:** `src/lib/whatsapp/inboundProcessor.ts`
> mandava o campo como `mensagem_inicial` (não `mensagem`) e `payload_extra` (não `raw_json`)
> pra `POST /api/crm/leads` — nomes que a rota nunca lê (só destructura `data.mensagem`).
> Resultado: **todo lead vindo de WhatsApp orgânico era qualificado pela IA com string vazia,
> sempre**, silenciosamente — não era só "mensagem não exibida", a IA nunca via o texto real
> desses leads.
>
> **Implementado:**
> 1. `prisma/migration-2026-08-25-leads-staging-mensagem-original.sql` —
>    `leads_staging.mensagem_original TEXT` (nullable, sem backfill possível — o texto já
>    tinha sido perdido pra todo lead anterior a esta coluna).
> 2. `src/app/api/crm/leads/route.ts` — persiste `data.mensagem` em `mensagem_original` tanto
>    no INSERT quanto no UPDATE (Match Engine); no UPDATE usa
>    `COALESCE(mensagem_original, $novo)` — **nunca sobrescreve**, preserva sempre o texto do
>    PRIMEIRO contato mesmo quando o mesmo lead volta a se manifestar depois (exatamente como
>    o usuário descreveu: "a mensagem original informada na geração do primeiro lead").
>    `GET` (lista, consumida por Kanban e `/crm/leads`) passa a expor a coluna.
> 3. `src/lib/whatsapp/inboundProcessor.ts` — `mensagem_inicial` → `mensagem` (nome de campo
>    real esperado pela rota) — corrige o bug de qualificação vazia pra leads de WhatsApp.
> 4. `src/app/api/public/imoveis/prospects/route.ts` — mesmo tratamento no 2º (e último)
>    caminho de INSERT direto em `leads_staging` (fluxo "Tenho Interesse" da página de
>    imóvel) — `mensagem_original` gravado na criação, nunca tocado no `ON CONFLICT DO
>    UPDATE` (mesma semântica de nunca sobrescrever).
> 5. **Ficha do lead (Kanban e `/crm/leads`, mesmo componente/estilo nos dois)** — novo card
>    "Mensagem Original do Lead", neutro (não azul/âmbar — essas cores já significam "isto é
>    trabalho da IA" nesta UI, e este bloco é o oposto: a palavra exata do lead), posicionado
>    ANTES do card "Análise por IA", texto completo com `whitespace-pre-wrap` (preserva quebra
>    de linha que o lead tenha digitado). Só renderiza quando existe — leads anteriores à
>    coluna nunca têm esse texto.
> 6. **`/crm/leads` (lista)** — snippet de 1 linha truncado (`truncate` + `title` nativo pro
>    texto completo no hover) na coluna "Dados Enriquecidos", ícone de balão de mensagem;
>    nunca a mensagem inteira na linha da tabela (lista densa, muitos leads por tela) — a
>    íntegra sempre visível na ficha. Busca por texto (`filteredLeads`) estendida pra
>    comparar também `mensagem_original`; placeholder do campo atualizado.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital): `POST
> /api/crm/leads` com mensagem real de ~400 caracteres → `mensagem_original` persistido
> verbatim, distinto de `resumo_ia` (a reescrita da IA) · 2º `POST` simulando um recontato
> (mesmo email/telefone, mensagem DIFERENTE) → confirmado via SQL que o Match Engine mesclou
> no mesmo `lead_uuid` e `mensagem_original` permaneceu o texto do PRIMEIRO contato, não
> sobrescrito · `/crm/leads`: snippet truncado confirmado via `getBoundingClientRect`
> (`span.clientWidth=204 < scrollWidth=2027`, corte real com `text-overflow:ellipsis`, não só
> corte de viewport) e `title` com os 414 caracteres completos · busca por
> `"financiamento bancário"` (substring só presente na mensagem, ausente de nome/telefone/
> email/tag) → filtrou corretamente pro único lead que bate · ficha aberta em `/crm/leads` E
> em `/crm/kanban` (mesmo lead) → as duas confirmaram "MENSAGEM ORIGINAL DO LEAD" com o texto
> completo, card neutro, posicionado antes de "Análise por IA" (que mostrava corretamente o
> `resumo_ia` mais recente — da 2ª mensagem, comportamento correto e distinto: mensagem
> original é congelada no primeiro contato, já a análise da IA reflete sempre o estado mais
> recente). Lead de teste removido depois, `count(*)=0` confirmado. `npx tsc --noEmit`: 0
> erros em todos os 4 arquivos tocados.
>
> **Atualizado em:** 2026-08-25 (continuação 30) — **`/crm/leads` ganha os 3 campos que o
> roteiro de testes apontou como ausentes (Etapa na tabela, filtro de Etapa real, telefone na
> busca) + a ficha do lead ("Abrir Ficha") passa a ter paridade real com a ficha do Kanban.**
>
> **Contexto:** usuário testando o item 1.3 do `docs/ROTEIRO_TESTES_CRM.md` ("busca/filtro:
> nome, telefone, e-mail, etapa, período") apontou que a coluna "Etapa" não existia na
> listagem. Investigação achou mais 2 gaps reais no caminho: o dropdown de filtro
> "Todos os Status/Novos/Duplicados" nunca teve `value`/`onChange` — decorativo, sem nenhum
> efeito no filtro real — e a busca por texto nunca incluía o campo telefone. Usuário aprovou
> corrigir os 3 juntos, e pediu adicionalmente que a ficha aberta via "Abrir Ficha" (o drawer
> desta tela) passasse a trazer os mesmos campos já exibidos na ficha do Kanban (Atividades,
> Visitas, etc.) — até então uma versão bem mais pobre da mesma informação.
>
> **Implementado:**
> 1. `src/app/api/crm/leads/route.ts` — `SELECT` do endpoint passou a expor `k.id as
>    coluna_id` e `k.titulo_exibicao as coluna_titulo` (antes só `k.nome as coluna_nome`, o
>    slug interno, nunca o rótulo amigável que o tenant configura em `/crm/config/kanban`).
> 2. `src/app/crm/leads/page.tsx` — coluna "Etapa" nova na tabela (exibe `coluna_titulo`);
>    dropdown "Todos os Status" trocado por um filtro de Etapa real, populado via
>    `GET /api/crm/kanban/colunas` (as etapas de verdade do tenant, na ordem do board) e
>    ligado a `filteredLeads` por `coluna_id`; busca por texto passou a incluir telefone, com
>    comparação normalizada por dígito (`replace(/\D/g,'')`) — tolerante a `+55`/formatação,
>    mesmo padrão de robustez já usado no Match Engine (F4, `docs/CHECKPOINT.md` 2026-07-21).
> 3. Ficha do lead (drawer) reescrita pra reaproveitar os mesmos componentes já usados e
>    testados na ficha do Kanban, em vez de duplicar uma versão resumida: tiles de
>    Intenção/Aderência com a mesma cor distinta (azul/violeta) já usada lá; tiles de Valor
>    Fechado (real, verde)/Valor Potencial (estimado, âmbar) quando presentes;
>    `NextBestActionCard` (Sugestão da IA); `AgendamentosLead` (Histórico de Visitas, com
>    "Agendar Visita" condicionado a `tenantConfig.calendario`, via novo `AgendarVisitaModal`
>    nesta tela); `AtividadesLead` (Atividades, com o mesmo mecanismo de pré-preenchimento a
>    partir da Sugestão da IA — "Registrar como Atividade" — já usado no Kanban). Campos
>    `coluna_id`/`coluna_titulo`/`client_id`/`valor_venda`/`valor_venda_estimado` já vinham do
>    backend (adicionados nesta e em sessões anteriores) — não precisou de nenhum campo novo
>    além de `coluna_id`/`coluna_titulo` no passo 1. Deliberadamente fora de escopo (navegação
>    de board, não "campo do lead"): barra de progresso de etapa, botões Avançar/Recuar Etapa,
>    Excluir/Restaurar Lead — esta tela nunca teve o conceito de "próxima coluna" a oferecer.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, sessão real via
> JWT com `userId` real de `admmd`): filtro de Etapa real testado (selecionar "Lead Captado"
> excluiu corretamente o único lead em "Entendimento da Dor" dos 6 reais do tenant) · busca por
> telefone testada (`"998000047"`, sem o prefixo `+55` armazenado, achou corretamente "Roberto
> Severo") · ficha aberta confirmou, via rede real (não simulada): `GET .../next-best-action`,
> `GET /agendamentos`, `GET /atividades`, `GET /atividades/tipos`, todos `200`, e renderizando
> corretamente "Sugestão da IA" (`enabled:true, suggestion:null` → "Nenhuma sugestão gerada
> ainda"), "Histórico de Visitas" e "Atividades" (ambos vazios, honesto — lead de teste real
> sem histórico) · confirmado visualmente (screenshot) que os tiles "Intenção"/"Aderência" saem
> azul/violeta reais, headers "Histórico de Visitas"/"Atividades" em negrito · botão "Agendar
> Visita" corretamente AUSENTE (tenant com `calendario:false`, mesma condicional já usada no
> Kanban) — confirma que a paridade não é só visual, a lógica condicional também foi
> reaproveitada corretamente. `npx tsc --noEmit`: 0 erros (nos 2 arquivos tocados e no total).
>
> **Atualizado em:** 2026-08-25 (continuação 29) — **Badge "X% Match · Y% Aderência" no
> canto superior direito do card do Kanban vira 2 linhas ("X% Match" numa, "Y% Aderência"
> na outra) em vez de 1 linha só separada por " · ".**
>
> `src/app/crm/kanban/page.tsx` — cada valor (`score_prontidao`/`score_fit`) passou a ser
> seu próprio `<div>` dentro do badge (em vez de concatenado por string), com o container
> ganhando `text-right leading-tight`. Card sem Aderência (`score_fit == null`) continua
> mostrando só 1 linha, sem espaço vazio — a condicional que já existia (`lead.score_fit !=
> null && ...`) não mudou, só o jeito de renderizar quando presente.
>
> **Testado ao vivo**, mesmo lead real da imagem do usuário ("Severina Bastos"): confirmado
> via `getBoundingClientRect()` que as 2 linhas ("80% Match"/"60% Aderência") estão em
> `top` diferentes (502px vs 515.75px) mas mesmo `left` (248px) e mesma `width` (85.7px) —
> genuinamente empilhadas, não lado a lado. Os demais cards do board (só `score_prontidao`,
> sem Aderência) confirmados com 1 linha só, sem regressão. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 28) — **2 ajustes pontuais de UI no Kanban:
> campo de data do filtro (De/Até) truncava o "dd/mm/aaaa"; data de criação no rodapé do
> card muda de "24 DE AGO." pra "dd/mm/aaaa".**
>
> 1. **Filtro de data (`De`/`Até`)** — o wrapper era `w-32` (128px); o `DateInputPtBR`
>    reserva `paddingRight:28px` fixo pro botão do calendário (posição interna do
>    componente, não ajustável via className) + `pl-4` (16px) do próprio uso aqui = só
>    84px de content-box pro texto "dd/mm/aaaa", que mede ~84px na fonte usada — no limite
>    exato, cortando o último "a". Corrigido alargando pra `w-36` (144px) — não mexeu no
>    ícone em si (ele continua na mesma posição relativa), só deu mais espaço pro texto
>    caber por inteiro.
> 2. **Data de criação no card** — `toLocaleDateString('pt-BR', {day:'2-digit',
>    month:'short'})` ("24 DE AGO.") → `toLocaleDateString('pt-BR')` (formato numérico
>    padrão `dd/mm/aaaa`), mesmo padrão de data já obrigatório em toda a UI (`CLAUDE.md`).
>
> **Testado ao vivo:** medido via canvas `measureText` com a mesma fonte real do input —
> texto do placeholder mede 84,3px, cabe com folga nos 98px de content-box agora
> disponíveis (era ~84px antes, no limite exato do corte relatado); `scrollWidth ===
> clientWidth` nos dois campos, sem overflow. Card confirmado sem nenhuma ocorrência de
> "DE AGO" no board, formato `dd/mm/aaaa` presente. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 27) — **Retomada a pendência da entrega
> anterior: badge flutuante de `tag_sonho` (topo do card do Kanban) trocado de azul pra
> âmbar — o card já tinha muito azul (avatar, Match/Aderência, CTA), e o usuário
> questionou se dava pra diferenciar sem virar "carnaval".**
>
> Decisão fechada com o usuário antes de implementar: **um único acento novo, nunca uma
> cor por categoria de tag** — com 7-8 tags possíveis por segmento, mapear cada uma pra
> uma cor diferente é o cenário que genuinamente vira visualmente confuso; um acento único
> resolve "muito azul" sem trocar um problema por outro. Cor escolhida: **âmbar**, não uma
> cor nova sem relação com o resto — já é a cor usada em todo o resto desta mesma ficha
> pra sinalizar "isto veio da IA" (Sugestão da IA, Valor Potencial estimado); `tag_sonho` é
> exatamente isso (classificação gerada pela IA), então reforça o significado em vez de só
> decorar. Violeta foi cogitada e descartada — colidiria com "Aderência", que já é violeta
> na ficha.
>
> `src/app/crm/kanban/page.tsx` — badge do topo (`bg-blue-600`/`text-blue-600` +
> `SparklesIcon` azul) → `bg-amber-600`/`text-amber-600` + `SparklesIcon` âmbar, mesma
> estrutura, só a cor. Testado ao vivo: os 4 badges reais do board (Comprador à Vista,
> Apenas Pesquisando, Interesse Geral ×2) confirmados via `getComputedStyle` —
> `rgb(217,119,6)` (âmbar-600 exato) sobre branco com borda âmbar-200. `npx tsc --noEmit`:
> 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 26) — **Card do Kanban mostrava o mesmo
> `tag_sonho` 2x (badge flutuante no topo + badge no rodapé) — redundância apontada pelo
> usuário via print real. Badge do rodapé substituído por "tempo desde a captação" (dias),
> informação nova, nunca exibida em lugar nenhum do card antes.**
>
> `src/app/crm/kanban/page.tsx` — o badge índigo no rodapé (`{lead.tag_sonho || 'TBD'}`)
> tirado; no lugar, novo cálculo `daysSinceCreation()` (dias corridos em dia civil, mesmo
> critério já usado pela data "24 DE AGO." ao lado — nunca fração de 24h) + badge neutro
> (slate, `ClockIcon`) com "Hoje"/"1 dia"/"N dias". Badge do topo (o pill flutuante com
> `SparklesIcon`) mantido intocado — é o único lugar que ainda mostra `tag_sonho` no card.
> Cor deliberadamente neutra (slate), não mais uma cor nova — o usuário tinha levantado a
> preocupação de "já ter muita cor azul nos cards" antes de interromper a própria mensagem
> sem chegar a uma decisão sobre isso; escolhida a opção que resolve sem adicionar mais uma
> cor à paleta do card.
>
> **Testado ao vivo no navegador**, board real (tenant CRM SOZINHO, os mesmos leads da
> imagem do usuário): confirmado por contagem de texto que cada tag (`COMPRADOR À VISTA`/
> `APENAS PESQUISANDO`) aparece exatamente 1x agora (antes 2x no mesmo card); os 4 badges de
> dias confirmados via `getComputedStyle` — cor neutra (`rgb(100,116,139)`/slate-500 sobre
> `rgb(248,250,252)`/slate-50), com ícone de relógio, valores reais ("1 dia", "9 dias")
> batendo com a data de criação de cada lead. `npx tsc --noEmit`: 0 erros.
>
> **Pendência real, não decidida:** a pergunta original do usuário sobre trocar a cor azul
> dos badges de status (`COMPRADOR À VISTA` etc.) por outra cor — mensagem interrompida
> antes de eu responder, nunca retomada. Fica em aberto pra próxima vez que for pedido.

> **Atualizado em:** 2026-08-25 (continuação 25) — **Fix real, sem nenhuma mudança de
> código: foto do dono do lead não carregava no card do Kanban (ícone quebrado) — não era
> a imagem em si, era o proxy de porta do Docker Desktop pra MinIO (porta 9000) travado,
> mesma classe de incidente já documentada nesta sessão pro Postgres.**
>
> Usuário mandou print real de um card mostrando o avatar do "Roberto" como ícone quebrado
> (não as iniciais, não o ícone genérico — literalmente o placeholder de imagem falha do
> navegador), suspeitando do formato salvo. Investigação, do lead até a origem:
> 1. Confirmado no banco 2 usuários reais chamados "Roberto Severo" (tenants diferentes,
>    e-mails diferentes — Marketing Digital e CRM SOZINHO — não é duplicata, é legítimo);
>    o lead da imagem (`corretor_atribuido_id`) aponta pro correto, o da CRM SOZINHO
>    (`73ef6f74-...`), que TEM foto real salva (`storage_type='s3'`, `url_cdn` presente,
>    56.453 bytes de bytea legado também presentes).
> 2. `GET /api/admin/usuarios/[id]/foto` faz 302 pro `url_cdn`
>    (`http://localhost:9000/net-imobiliaria/users/.../....jpg`) — testado direto via curl:
>    conexão TCP abre, mas **resposta vazia** ("Empty reply from server"), mesmo sintoma
>    exato já documentado nesta sessão pro Postgres (2026-08-25, "Docker Desktop port-
>    forwarding proxy pode entrar num estado quebrado depois de uma interrupção abrupta do
>    container").
> 3. Confirmado que a imagem em si nunca esteve com problema: `docker exec netimobiliaria-
>    minio curl ...` (a mesma URL, mas de DENTRO do container, sem passar pelo proxy do
>    Windows) → `200 OK`, `56453` bytes — bate exato com o legado salvo no banco.
>
> **Corrigido com `docker restart netimobiliaria-minio`** (só o container do MinIO, não o
> Docker Desktop inteiro — mesmo remédio já usado antes pro Postgres). Reconfirmado via
> curl do host: `200 OK` depois do restart.
>
> **Testado ao vivo no navegador**, board real do Kanban (tenant CRM SOZINHO): os 3
> avatares reais do board (Roberto, Eustroncio, Clementina) confirmados via
> `naturalWidth`/`naturalHeight`/`complete` — todos carregando imagem de verdade agora
> (`498×521`, `554×554`, `620×494`), nenhum placeholder quebrado. Nenhuma mudança de
> código — puramente operacional, mesma disciplina do incidente anterior de Postgres.

> **Atualizado em:** 2026-08-25 (continuação 24) — **3 ajustes visuais pontuais na ficha do
> Kanban: rótulo "Análise Concierge IA" → "Análise por IA"; tiles Intenção/Aderência
> ganham cor de fundo própria e distinta (azul/violeta, discreta); labels "Histórico de
> Visitas"/"Atividades" passam a ler como negrito de verdade.**
>
> Pedido direto do usuário. `src/app/crm/kanban/page.tsx` — (1) label do card renomeado;
> (2) os 2 tiles (antes neutros, `t.cardInner` sem cor) ganharam fundo próprio: Intenção em
> azul (eco do card "Análise por IA" que os envolve), Aderência em violeta (mesma cor já
> usada em todo o resto da plataforma pra esse conceito — `SegmentFitCriteriaModal.tsx`,
> Master) — opacidade baixa (`bg-blue-50`/`bg-violet-50` claro, `/10` escuro), mesmo padrão
> restrito já usado nos tiles de Valor Fechado/Potencial logo abaixo, pra nunca competir
> com o resto da UI.
>
> **Achado real no processo, pego antes de virar bug visual:** `AgendamentosLead.tsx` e
> `AtividadesLead.tsx` já tinham `font-black` (peso 900, o mais pesado do Tailwind) nesses
> 2 labels — tecnicamente já "negrito" — mas na cor `t.textMuted` (cinza apagado), que
> visualmente não lê como ênfase nenhuma nesse tamanho de fonte. Corrigido trocando pra
> `t.textPrimary` (mesma lógica de contraste que outros labels claramente em negrito da
> mesma ficha, ex. "Perfil Emocional", já usam) — o peso não mudou, mas agora lê como
> negrito de verdade.
>
> **Testado ao vivo, no navegador, com o mesmo lead real da imagem do usuário** ("Severina
> Bastos", tenant CRM SOZINHO): "ANÁLISE POR IA" confirmado no cabeçalho do card ·
> `getComputedStyle` dos 2 tiles confirma `bg-blue-50`/`text-blue-700` (Intenção) e
> `bg-violet-50`/`text-violet-700` (Aderência), cores distintas e discretas · `getComputedStyle`
> dos 2 labels confirma `font-weight:900` sobre `rgb(17,24,39)` (gray-900, alto contraste) em
> vez do cinza apagado de antes. **Achado incidental, limpo no processo:** o mesmo lead tinha
> 2 sugestões da IA (`crm_agent_actions`) residuais de testes anteriores desta sessão (nunca
> removidas) — apagadas, `count(*)=0` confirmado. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 23) — **Disparo automático da Sugestão da IA
> (next_best_action) já na captação do lead, gatilhado por um piso de Aderência
> configurável por segmento — fecha a lacuna discutida com o usuário ("por que só dispara
> em mudança de etapa?").**
>
> **Decisão de arquitetura, fechada com o usuário antes de implementar:** disparar a
> sugestão em TODO lead capturado gastaria LLM à toa em lead frio (captação pode ser alto
> volume e 100% automática — webhook, formulário público, WhatsApp orgânico). Solução:
> novo parâmetro numérico por segmento — "Aderência mínima" (0-100) — só dispara na
> captação quando `score_fit` do lead recém-qualificado bate ou passa esse piso. Sem valor
> configurado (`null`), comportamento atual é preservado (nunca dispara na captação, só em
> mudança de etapa/botão manual). Usuário pediu 80% pros dois segmentos já configurados
> nesta sessão (Imobiliário, Venda de Carros).
>
> **Implementado:**
> 1. `prisma/migration-2026-08-25-segment-nba-captacao-fit-minimo.sql` — `system_segments.
>    next_best_action_captacao_fit_minimo INTEGER` (nullable, CHECK 0-100).
> 2. `segmentResolver.ts` — campo novo na interface `Segment` (`SELECT ss.*` já cobre
>    automaticamente, sem mudar a query).
> 3. `GET/PUT /api/admin/master/segments/[id]/fit-criteria` estendida — GET retorna
>    `captacaoFitMinimo`; PUT aceita o campo (opcional — ausente preserva o valor já salvo,
>    nunca confunde "não mandou" com "quer zerar"), valida 0-100, persiste em
>    `system_segments` na mesma transação do replace-all dos critérios. Achado de
>    passagem, corrigido: a função já tinha uma conexão do pool adquirida ANTES das
>    validações que podem retornar cedo (vazava a conexão em qualquer erro 400) — corrigido
>    adquirindo o client só depois de tudo validado.
> 4. `SegmentFitCriteriaModal.tsx` — novo campo numérico ("Disparo automático da Sugestão
>    da IA na captação"), card âmbar próprio (distinto da lista de critérios), vazio =
>    desativado.
> 5. `POST /api/crm/leads` — depois de persistir a qualificação, se `score_fit !== null`,
>    resolve o segmento de novo (1 query leve extra, só na captação) e — se
>    `next_best_action_captacao_fit_minimo` estiver configurado E o score bater ou passar —
>    chama `refreshNextBestAction()` fire-and-forget (mesma disciplina de `POST /api/crm/
>    kanban/move`, nunca bloqueia a resposta do lead; a função já checa internamente se o
>    agente está `ativo` pro tenant/segmento, sem duplicar essa lógica aqui).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, piso real de 80%
> configurado via a API real do Master, critérios existentes preservados — 6 em cada
> segmento, confirmado por SQL antes/depois): lead com perfil forte (sedan popular à
> vista, R$45mil, decisor próprio, mora perto, sem troca) → `score_fit=90` → confirmado
> `crm_agent_actions` com 1 linha `next_best_action`/`INFORMATIVE` real, gerada na hora, **sem
> nenhuma mudança de etapa nem clique manual** · lead de perfil frio ("só olhando por
> curiosidade, sem pressa") → `score_fit=50` (abaixo do piso) → confirmado `count(*)=0` em
> `crm_agent_actions`, nenhum disparo. `npx tsc --noEmit`: 0 erros.
>
> **Achado real no processo de teste, não é bug da aplicação:** 4 tentativas seguidas
> mostraram `resumo_ia` genérico ("Qualificação por IA ainda não configurada...") mesmo
> pro tenant certo — investigado a fundo (rota de diagnóstico temporária confirmou
> `resolveSegment()` retornando `crm_ia_ativa:true` corretamente) até achar a causa raiz
> real: o cwd do Bash desta sessão tinha migrado pra dentro de `scratch/` num comando
> anterior (`cd scratch && node ...`), e ficou lá persistindo entre chamadas — os `node -e
> "require('dotenv').config({path:'.env.local'})"` seguintes procuravam o arquivo relativo
> a esse cwd errado, carregavam 0 variáveis, `JWT_SECRET` undefined, e o `jwt.sign()`
> falhava silenciosamente (só a linha de aviso do dotenv sobrava no stdout, capturada por
> engano como se fosse o token). O token corrompido falhava a verificação, `sessionUser`
> virava `null`, e o lead caía no tenant Master por padrão — nada relacionado a
> `resolveSegment`/qualificação. Corrigido voltando o cwd pra raiz do projeto antes de
> gerar o token; os 6 leads de teste (4 deles acidentalmente criados sob o tenant Master
> por causa desse bug de tooling) removidos, cascata confirmada `count(*)=0` em
> `leads_staging`/`crm_agent_actions`/`leads_kanban`. Rota de diagnóstico temporária e o
> touch de `next.config.js` (tentativa de fix por restart, que não era a causa real)
> revertidos por completo.

> **Atualizado em:** 2026-08-25 (continuação 22) — **Badge "✨ Sugerido pela IA" em
> Atividades — quando o atendente clica "Registrar como Atividade" no card "Sugestão da
> IA" (F3, `next_best_action`) e salva, a atividade resultante passa a exibir esse badge,
> distinto do já existente "🤖 Agente de IA" (que significa a IA agiu sozinha, sem
> humano).**
>
> Pedido do usuário junto com 2 perguntas sobre a mesma tela (Ficha do Lead): (1) por que
> Aderência deu 60% pra um lead real ("Severina Bastos", Venda de Carros); (2) se "Sugestão
> da IA" só dispara manualmente.
>
> **Resposta à pergunta 1 (investigação, sem mudança de código):** confirmado no banco que
> o `resumo_ia` real desse lead é "busca pickup semi-nova a diesel com orçamento máximo de
> R$50.000, pronto para fechar a compra". Cruzando com os 6 critérios de Aderência de
> "Venda de Carros" (cadastrados na entrega anterior desta sessão): "prazo de compra
> realista" (peso 6) bate forte e positivo ("pronto para fechar"); "É o próprio comprador"/
> "localização"/"veículo de troca" (peso 6+6+5) não têm nenhuma informação na mensagem →
> neutros por design (o prompt explicitamente instrui a nunca penalizar ausência de dado);
> e o critério de maior peso, "capacidade financeira compatível com o veículo" (peso 9),
> plausivelmente pesou como fraco/moderado — pickup semi-nova a diesel no mercado real
> brasileiro tipicamente custa bem mais que R$50.000, então há uma tensão real entre
> orçamento declarado e categoria de veículo desejada. A combinação (1 critério pesado
> fraco + 1 forte + 3 neutros) é coerente com 60%. Não é uma fórmula auditável linha a
> linha (o LLM decide holisticamente, sem expor o raciocínio), mas o resultado é plausível
> e não é bug.
>
> **Resposta à pergunta 2:** não, não é só manual — `refreshNextBestAction()` já dispara
> automaticamente (fire-and-forget) toda vez que um lead muda de etapa no Kanban (`POST
> /api/crm/kanban/move`, `ON_STAGE_CHANGE`), além do botão manual (ícone laranja
> "Atualizar sugestão"). O card da Severina estava vazio só porque o lead nunca mudou de
> etapa desde a captação (ainda em "Lead Captado") — testado ao vivo clicando o botão
> manual, gerou sugestão real na hora.
>
> **Implementado (pergunta 3, feature real):** `prisma/migration-2026-08-25-atividades-
> sugerido-por-ia.sql` — `atividades_lead.sugerido_por_ia BOOLEAN NOT NULL DEFAULT false`
> (aditiva). `POST /api/crm/atividades` aceita e persiste o campo. `AtividadesLead.tsx` —
> novo state `formSugeridoPorIa`, setado `true` só pelo efeito de `prefill` (o texto que
> vem do card "Sugestão da IA"), resetado `false` em `resetForm`/`startEdit` (nunca vaza
> pra uma edição de atividade não-relacionada); enviado só na criação (nunca no PATCH — a
> proveniência não muda depois de criada). Badge novo (`✨ Sugerido pela IA`, âmbar, eco da
> cor do próprio card "Sugestão da IA") ao lado da atribuição humana normal (`· Nome do
> Atendente`) — nunca substitui essa atribuição, porque aqui um humano sempre clicou
> Salvar; é conceitualmente diferente do badge dourado "🤖 Agente de IA" (ação 100%
> autônoma, sem humano, `origem='ia'`).
>
> **Testado ao vivo, ponta a ponta, com dado real** (mesmo lead da imagem do usuário,
> tenant CRM SOZINHO): clicado "Atualizar sugestão" → sugestão real gerada pela IA (Groq) ·
> "Registrar como Atividade" → form abriu pré-preenchido com o texto exato da sugestão ·
> tipo "WhatsApp" selecionado + "Registrar" → atividade real criada, confirmado via API
> `sugerido_por_ia:true, origem:"humano"` · confirmado visualmente: `"· Alexandre Severo
> Campos Lima"` (atribuição humana preservada) **+** `"✨ Sugerido pela IA"` lado a lado,
> cor âmbar confirmada via `getComputedStyle` (`rgb(217,119,6)` sobre fundo
> `rgba(245,158,11,0.15)`). Atividade de teste removida depois — achado real no processo:
> a remoção via SQL cru (em vez do endpoint DELETE real) deixou `leads_staging.bola_com`
> desatualizado (`'cliente'`, refletindo a atividade já apagada) — corrigido rodando o cron
> real de reconciliação (`POST /api/cron/crm/pendencia-reconciliar`), que confirmou e
> corrigiu exatamente `corrigidos:1`, restaurando `bola_com='nos'` (honesto — lead sem
> nenhuma atividade real deve mesmo estar com a bola conosco). `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 21) — **UI de cadastro/edição de Critérios de
> Aderência: campo de texto vira `<textarea>` multi-linha nas 2 telas onde existe (Master e
> tenant) — antes era `<input>` de 1 linha, exigindo scroll horizontal com o mouse pra ler
> o critério inteiro.**
>
> Pedido direto do usuário, depois de usar a tela recém-populada com os critérios reais da
> entrega anterior. Achado: o card de EXIBIÇÃO (`FitCard`, só leitura) já quebrava linha
> naturalmente (`<p>`) — o problema era só nos 2 formulários de EDIÇÃO:
> `SegmentFitCriteriaModal.tsx` (Master) e a seção "Seus Critérios de Aderência" de
> `/crm/config/ia` (tenant).
>
> **Implementado:** `<input>` → `<textarea rows={2} className="... resize-y">` nos dois
> lugares. No modal do Master, o campo de texto (que dividia a linha com Peso/Ativo/Excluir)
> passou a ocupar sozinho a linha de cima, com Peso/Ativo/Excluir numa 2ª linha abaixo (rótulo
> "Peso" adicionado, já que a posição não deixa mais isso implícito). Na tela do tenant, o
> textarea manteve o mesmo grid `md:col-span-3` já usado pelo input.
>
> **Testado ao vivo no navegador**, sessão Master real: modal do segmento "Venda de Carros"
> confirma 6 `<textarea>` reais (um por critério, texto completo já visível, sem truncar) ·
> digitado um texto de teste bem mais longo num deles → confirmado via `scrollHeight`/
> `clientHeight` que quebra em múltiplas linhas dentro do campo · fechado com "Fechar" (sem
> clicar em Salvar) → confirmado por SQL que os 6 critérios reais da entrega anterior
> permanecem intactos, nenhum resíduo do texto de teste. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 20) — **Critérios de Aderência (Fit/ICP)
> cadastrados pela primeira vez pros segmentos Imobiliário e Venda de Carros — só dado
> curado, sem mudança de código. A coluna "Aderência" (entregas anteriores) deixa de
> mostrar "—" pra esses 2 segmentos e passa a exibir a nota real da IA.**
>
> Pedido direto do usuário ("baseado no seu vasto conhecimento... preencha os critérios de
> aderência"). Escritos pra ficar coerentes com as regras de qualificação de Intenção já
> existentes de cada segmento (7 regras cada, lidas do banco antes de escrever) — mesmo
> vocabulário de negócio, sem contradição. 6 critérios por segmento, `peso` 5-9/10, gravados
> via a rota real do Master (`PUT /api/admin/master/segments/[id]/fit-criteria`, replace-all
> transacional — o mesmo caminho que a UI usaria), não SQL direto:
>
> **Imobiliário:** orçamento/financiamento compatível com o portfólio · região de atuação
> real · finalidade (moradia/investimento/comercial) compatível · prazo de decisão
> realista · é o próprio decisor · situação cadastral/crédito compatível com financiamento.
>
> **Venda de Carros:** capacidade financeira/crédito compatível com o veículo · categoria
> desejada dentro do estoque real · prazo de compra realista · é o próprio comprador/
> decisor · localização compatível pra visita/test drive · veículo de troca compatível com
> o que a loja aceita.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, segmento Venda de
> Carros): `GET` confirma os 2 conjuntos persistidos com UTF-8 correto (escrito via arquivo,
> não inline em curl — lição já documentada nesta sessão) · lead de teste real criado via
> `POST /api/crm/leads` (mensagem realista: picape, R$80mil de entrada + financiamento,
> decisor próprio, mora perto, Corolla 2019 de troca) → `ConciergeService.qualifyLead` real
> (LLM Groq `openai/gpt-oss-120b`) retornou `score_prontidao=90, score_fit=90` (antes desta
> entrega, `score_fit` seria sempre `null` pra esse segmento — 0 critérios cadastrados) ·
> confirmado na tabela real de `/crm/leads`: "90% 90%" (Intenção/Aderência), ambos em verde
> (`rgb(34,197,94)`, threshold >80% correto). Lead de teste removido depois, `count(*)=0`
> confirmado em `leads_staging`/`leads_kanban`.
>
> Nenhum arquivo de código tocado nesta rodada — só dado (curadoria, mesma natureza das 14
> regras de qualificação já existentes). Master pode editar/ajustar livremente a qualquer
> momento em `/admin/master/segments` → botão "Critérios de Aderência (ICP)".

> **Atualizado em:** 2026-08-25 (continuação 19) — **Rótulo "Fit" (inglês) renomeado pra
> "Aderência" em toda a UI — usuário apontou que muitas pessoas no Brasil não sabem o que
> "Fit" significa.** Também confirmado no banco, a pedido do usuário, que "Venda de Carros"
> (segmento da entrega anterior) não tem NENHUM critério de fit cadastrado ainda — nem no
> padrão do segmento, nem em override do tenant CRM SOZINHO (`fit_segmento=0`,
> `fit_tenant=0`) — o "—" mostrado é honesto, não bug.
>
> **9 pontos de texto visível corrigidos** (grep `\bFit\b` em `*.tsx`, confirmado ao final
> que só sobraram comentários de código, nunca texto renderizado): cabeçalho da tabela e
> tile do drawer em `/crm/leads`; badge do card e tile da ficha em `/crm/kanban`; título do
> modal + texto de ajuda em `SegmentFitCriteriaModal.tsx` (Master); tooltip do botão em
> `/admin/master/segments`; os 2 headings de `/crm/config/ia` (tenant). Identificadores
> internos de código (`score_fit`, `FitCriterion`, `crm_fit_criterios_*`, nomes de função)
> **não** foram tocados — só texto exibido ao usuário, exatamente o que foi pedido.
>
> **Testado ao vivo:** `/crm/leads` recarregado confirma cabeçalho "ADERÊNCIA" (via
> `innerText`) e drawer do lead "Frank Aguiar" confirma `"INTENÇÃO\n\n30%\n\nADERÊNCIA\n\n—"`
> — mesmo lead/cenário da entrega anterior, agora com o rótulo em português. `npx tsc
> --noEmit`: 0 erros (2 execuções, incluindo uma em background).

> **Atualizado em:** 2026-08-25 (continuação 18) — **Coluna "Fit" adicionada à tabela de
> `/crm/leads`, ao lado de "Intenção" — mesmo tratamento honesto já usado no drawer/ficha
> (número real quando o segmento/tenant tem critério de fit configurado, "—" quando não).**
>
> Pedido direto do usuário, seguindo a decisão registrada na entrega anterior (Fit só
> aparecia no drawer, não na tabela). Usuário perguntou antes se precisaria configurar algo
> novo em Segmentos — esclarecido que não: a coluna só reflete o `score_fit` já existente
> (`crm_fit_criterios_segmento`/`_tenant`, curado em `/admin/master/segments` → "Critérios
> de Fit (ICP)" ou sobreposto pelo tenant em `/crm/config/ia`) — segmento sem nenhum
> critério cadastrado (caso real de "Venda de Carros" hoje) continua mostrando "—".
>
> **Implementado** (`src/app/crm/leads/page.tsx`): array de cabeçalho da tabela ganhou
> `'Fit'` entre `'Intenção'` e `'Responsável'` (7→8 colunas, índices de alinhamento
> centralizado/direita ajustados); nova célula com a mesma lógica de cor por faixa já usada
> em Intenção (verde >80%, azul >50%, neutro senão) e fallback `'—'` quando `score_fit` é
> `null`; `colSpan={7}→{8}` nas 2 linhas de estado especial (carregando/vazio), senão
> ficariam desalinhadas com a tabela de 8 colunas.
>
> **Testado ao vivo, os 2 ramos, com dado real** (tenant CRM SOZINHO): estado atual (nenhum
> lead com fit real, segmento sem critério) → coluna "FIT" renderiza "—" nas 3 linhas,
> confirmado via `innerText` · como nenhum lead do banco inteiro tem `score_fit` não-nulo
> hoje, setado temporariamente `score_fit=90` num lead real de teste ("Frank Aguiar") via
> SQL direto → recarregada a página → célula confirmada via `getComputedStyle`:
> `"90%"`, `color: rgb(34, 197, 94)` (verde-500, threshold >80% correto) — revertido pra
> `NULL` logo em seguida, confirmado por SQL. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 17) — **Varredura completa por "IPVE" no
> código encontrou uma 3ª ocorrência, pior que as duas anteriores: um card de KPI
> chamado "Taxa de Match IPVE" cujo valor era `Math.random() * 20 + 70` — nem sequer
> derivado de dado real — e que nunca era exibido em lugar nenhum (payload morto).**
>
> **Contexto:** usuário perguntou, depois dos 2 fixes anteriores, se a questão do IPVE
> estava de fato resolvida — pedido que motivou uma varredura (`grep -r IPVE src/`) em vez
> de assumir que os 2 pontos já achados eram os únicos.
>
> **Achado:** `GET /api/crm/stats/dashboard` — endpoint consumido só por `/crm/page.tsx`
> — retornava um array `stats` com 4 cards: "Total Leads (Staging)" (real), "CPLQ
> (Consolidado)" (`'R$ 0,00'` fixo, comentário "Será calculado na Fase 2"), "Média de
> Prontidão" (real), e **"Taxa de Match IPVE"** (`Math.random() * 20 + 70`, `change: '+4%'`
> também fixo). Confirmado por grep que **nenhum desses 4 campos é lido em lugar nenhum**
> do frontend — `crm/page.tsx` só destrutura `statsData.leads_por_status` (que alimenta o
> `KanbanFunnelWidget`) — resíduo do dashboard antigo, anterior à reescrita "Caminho 1"
> (2026-08-13, ver entrada correspondente neste arquivo) que substituiu esses 4 cards
> pelos 5 KPIs reais atuais (Leads Captados/Negócios Fechados/Perdidos/Pipeline/Conversão)
> sem que ninguém tivesse limpado o payload morto do endpoint que ficou pra trás.
>
> **Corrigido:** removido por completo o array `stats` e as 3 queries que só existiam pra
> alimentar ele (`totalLeadsQuery`/`avgScoreQuery`/`recentLeadsQuery`) — endpoint agora só
> roda a query real (`statusQuery`, contagem por coluna do Kanban) e retorna
> `{success, leads_por_status}`, exatamente o único campo que o consumidor real usa.
>
> **Testado ao vivo:** `GET /api/crm/stats/dashboard` real (tenant CRM SOZINHO) confirma
> resposta limpa (`success`+`leads_por_status`, sem `stats`); `/crm` recarregado no
> navegador real renderiza 100% normal — os 5 KPIs, funil, gargalos, fila de atenção, top
> leads, performance por vendedor — nada dependia do payload removido. `npx tsc --noEmit`:
> 0 erros. Varredura final (`grep -r IPVE src/`) confirma zero ocorrência fora de
> comentário explicativo (histórico do fix, nunca texto visível ao usuário).

> **Atualizado em:** 2026-08-25 (continuação 16) — **Segunda tela com o mesmo resíduo
> imobiliário-específico: `/crm/leads` (lista de leads, drawer de detalhe) ainda tinha
> "Score IPVE" e "Aderência IPVE" — o mesmo bug já corrigido na ficha do Kanban em
> 2026-08-23, só que numa 2ª tela nunca alcançada por aquele fix.**
>
> **Contexto:** pedido pelo usuário depois de uma explicação detalhada de como
> `score_prontidao`/`score_fit` funcionam ponta a ponta (`ConciergeService.qualifyLead`,
> cascata tenant→segmento de regras/critérios, prompt `crm_lead_qualification`, conversão
> ×10 na persistência) — usuário questionou diretamente se o conceito "IPVE" deveria sequer
> existir, apontando que foi implementado quando a plataforma era só Imobiliário.
>
> **Achado, confirmado por leitura de código antes de corrigir:** `src/app/crm/leads/
> page.tsx` tinha 2 resíduos independentes do mesmo problema, nenhum tocado pelo fix da
> ficha do Kanban (arquivo diferente): (1) cabeçalho da coluna da tabela dizia **"Score
> IPVE"**, mas a célula sempre exibiu `score_prontidao` (Intenção) — nunca nada
> específico de IPVE, um rótulo simplesmente errado; (2) o drawer de detalhe tinha 2 tiles,
> "Prontidão para Compra" (`score_prontidao`, correto) e **"Aderência IPVE"** — um valor
> 100% fabricado (`Math.min(score_prontidao + 15, 99)`, sem nenhum critério de fit real por
> trás), com um badge "Score Real" que emprestava falsa credibilidade ao número inventado.
>
> **Corrigido, mesmo tratamento já usado na ficha do Kanban:** coluna renomeada "Score
> IPVE" → "Intenção"; os 2 tiles do drawer viraram "Intenção" (`score_prontidao`) / "Fit"
> (`score_fit` real, ou "—" quando o segmento/tenant não tem nenhum critério de fit
> cadastrado — nunca inventa) — mesmos rótulos, mesmo comportamento honesto, zero badge
> decorativo. `LeadStaging.score_fit` adicionado à interface (o backend, `GET /api/crm/
> leads`, já retornava esse campo desde a sessão de 2026-08-23 — só o frontend desta tela
> nunca lia).
>
> **Testado ao vivo no navegador**, tenant CRM SOZINHO (segmento "Venda de Carros", mesmo
> cenário do print original do usuário — 0 critérios de fit cadastrados): cabeçalho da
> coluna confirmado "INTENÇÃO"; drawer do lead "Frank Aguiar" (score 30%) confirmado via
> `innerText` do overlay real: `"INTENÇÃO\n\n30%\n\nFIT\n\n—"` — sem nenhum traço de
> "IPVE"/"Aderência"/badge fabricado. `npx tsc --noEmit`: 0 erros.
>
> **Pergunta do usuário ("ainda não sei se realmente deve existir esse IPVE") permanece em
> aberto, não decidida nesta rodada** — o conceito de "Fit"/ICP em si é real e generalizado
> (`docs/PLANO_AGENTES_ACELERACAO_CRM.md` §3.1, já usado em outras partes do CRM); o que foi
> corrigido agora foi só o nome/rótulo "IPVE" (sigla imobiliária) e o valor fabricado por
> trás dele nesta 2ª tela — a decisão de produto sobre se "Fit" deveria ganhar mais
> destaque/uso em `/crm/leads` (ex.: coluna própria na tabela) não foi levantada nem pedida.

> **Atualizado em:** 2026-08-25 (continuação 15) — **Fix real de agnosticismo de segmento:
> o e-mail/agenda de visita tinha "corretor" e "imóvel" hardcoded — quebraria em qualquer
> tenant fora do Imobiliário.** Usuário revisou o resumo da entrega anterior (convite do
> cliente) e apontou a violação diretamente: o texto "data, horário, nome do corretor,
> imóvel (se houver), observações" contradiz o pilar central do projeto (plataforma
> agnóstica de segmento, zero hardcoded de vocabulário de negócio) — a aplicação também
> serve Saúde, Venda de Carros, etc., e nada nesse fluxo podia assumir que o atendente se
> chama "corretor" nem que o ativo vinculado é sempre "imóvel".
>
> **Achado real, confirmado por leitura de código antes de corrigir:** `POST /api/crm/
> agendamentos`, `GET .../usuario` e os 2 templates de e-mail (`sendConfirmacaoCorretor`/
> `sendConfirmacaoLead` em `calendarService`→`emailService.ts`) tinham `JOIN imoveis i ON
> i.id = ls.imovel_id` cravado em SQL cru, e os templates tinham "🏠 Imóvel"/"Seu Corretor"
> como texto fixo — mesmo com o resto da sessão (Performance por Vendedor, `resolveSegment`,
> `resolveAtivoConfig`) já tendo resolvido exatamente esse problema em outras partes do CRM.
>
> **Corrigido reaproveitando os 2 mecanismos já existentes e comprovados na sessão, sem
> nenhum conceito novo:** `resolveSegment(tenantId).distribution_role_name` (cargo real do
> atendente por segmento, cai em "Atendente" se o segmento não tiver customizado) +
> `resolveAtivoConfig(tenantId)` (tabela/coluna FK/coluna de nome/rótulo do "ativo"
> vinculado ao lead — imóvel no Imobiliário, veículo em Carros quando configurado, `null`
> em segmentos sem nada configurado). `POST /api/crm/agendamentos` e `GET .../usuario`
> passaram a montar a query do "ativo" dinamicamente (`hasAtivo` computado com `IDENT_RE`
> revalidando cada identificador antes de interpolar em SQL cru — mesma defesa em
> profundidade já usada em `EnrichmentService`/`leads/route.ts`); sem config nenhuma, cai
> num fallback `NULL::text as imovel_nome` honesto, nunca quebra. Os 2 templates de e-mail
> ganharam `roleLabel`/`ativoLabel` como parâmetros obrigatórios/opcionais — "Seu Corretor"
> virou `${roleLabel}` (sem o prefixo "Seu " pra não brigar com concordância de gênero em
> outros cargos), o bloco de "🏠 Imóvel" virou "📌 ${ativoLabel || 'Item vinculado'}".
> `crm/kanban/page.tsx` (`CalendarioGeralView`) teve os 2 fallbacks textuais
> "Consultar imóvel"/"Endereço sob consulta" trocados por "Consultar detalhes"/"Detalhes
> sob consulta" — o fallback `'Objeto de interesse'` e o ícone `MapPinIcon` já eram
> genéricos o bastante, deixados como estavam.
>
> **Testado ao vivo, ponta a ponta, tenant CRM SOZINHO (segmento "Venda de Carros",
> `distribution_role_name='Consultor de Vendas'`, sem nenhum `crm_ativo_config_segmento`
> configurado — exatamente o caso que provaria o fix, já que é o cenário onde o hardcoded
> antigo mais quebraria):** `POST /api/crm/agendamentos` real (lead + convite de cliente)
> → sucesso, `imovel_id:null` (fallback sem-ativo funcionando, sem crash), os 2 eventos
> reais do Google Calendar criados (confirma que o fix não regrediu nada do fix anterior de
> `attendees` na conta da empresa) · aguardado o envio assíncrono → `email_corretor_
> enviado:true` e `email_lead_enviado:true` — confirma que os templates renderizam sem erro
> usando `roleLabel`/`ativoLabel` reais (`"Consultor de Vendas"`, `undefined`). Agendamento
> de teste cancelado (remove os eventos do Google Calendar) + removido via `DELETE` direto,
> confirmado `count(*)=0`. `npx tsc --noEmit`: 0 erros.
>
> **Pendência real, não atacada nesta rodada:** o caminho "hasAtivo=true" (tenant com
> `crm_ativo_config_segmento` real configurado, ex. Imobiliaria XYZ/Marketing Digital no
> segmento Imobiliário) não foi reexercitado ao vivo nesta correção especificamente — a
> mesma mecânica (`resolveAtivoConfig`/`IDENT_RE`) já foi testada exaustivamente em outras
> sessões (`EnrichmentService`, `leads/route.ts`), então o risco de regressão é baixo, mas
> fica registrado como confirmação redundante possível numa sessão futura.

> **Atualizado em:** 2026-08-25 (continuação 14) — **Convite do cliente: SMTP corrigido
> (senha de app nova, funcionando) + texto do modal passa a refletir honestamente os 2
> cenários (com/sem calendário pessoal do atendente conectado). Frente "convite pro
> cliente" fechada — os 3 itens levantados (attendee via calendário pessoal, e-mail de
> confirmação, texto da UI) testados e confirmados.**
>
> **SMTP:** senha de app trocada pela nova ("Artemis4 CRM SMTP", gerada na Fase 5 desta
> sessão) no `.env.local` — testado isolado (`nodemailer.verify()`) e depois via
> agendamento real: `email_corretor_enviado`/`email_lead_enviado` **ambos `true`** pela
> primeira vez nesta sessão inteira.
>
> **Texto do modal** (`AgendarVisitaModal.tsx`, resumo do passo "Confirmar"): a frase
> "o cliente recebe um convite do Google Calendar" só é verdadeira quando o atendente tem
> calendário pessoal conectado (a empresa não pode mais convidar ninguém, ver fix da
> continuação 12) — antes disso, o texto afirmava isso incondicionalmente sempre que
> `convidarCliente` estava marcado. Corrigido pra 2 variantes: com calendário pessoal,
> mantém o texto original; sem, passa a dizer "recebe um e-mail de confirmação... (sem
> convite do Google Calendar — só o calendário da empresa cria evento, e ele não pode
> convidar ninguém; conecte seu calendário pessoal pra isso funcionar)".
>
> **Testado ao vivo no navegador, os 2 ramos, com usuários reais do tenant CRM SOZINHO:**
> Eustroncio Pinto (`google_calendar_authorized:false`) → texto correto do ramo sem
> calendário pessoal · Roberto Severo (`google_calendar_authorized:true`) → texto correto
> do ramo com calendário pessoal. `npx tsc --noEmit`: 0 erros. Nenhum agendamento real foi
> criado nesses 2 testes (só navegação até o passo de confirmação, sem submeter) — nada
> pra limpar.
>
> **Achado incidental nesta rodada, resolvido no processo:** Docker foi interrompido
> abruptamente em algum momento (não um `docker compose down` limpo) — Postgres se
> recuperou sozinho via WAL replay, mas o encaminhamento de porta do Docker Desktop pro
> Windows (`127.0.0.1:15432`) ficou num estado quebrado (aceitava TCP, mas o handshake do
> protocolo do Postgres nunca completava — `pg.Pool` do host sempre recebia "Connection
> terminated unexpectedly", mesmo com o container "healthy" e acessível por dentro via
> `docker exec`). Resolvido com `docker restart netimobiliaria-db` — sem precisar reiniciar
> o Docker Desktop inteiro. Registrado aqui porque não é a primeira vez que esse projeto
> documenta esse tipo de sintoma de pool/rede (ver "Fix Login Loop — DB Pool Exhaustion",
> 2026-06-01) — mas desta vez a causa raiz real era outra (proxy de porta do Docker Desktop,
> não exaustão de conexões do Postgres em si).

> **Atualizado em:** 2026-08-25 (continuação 13) — **Convite do cliente via calendário
> pessoal confirmado funcionando de ponta a ponta + achado real: SMTP de confirmação
> nunca funcionou porque a senha de app salva estava com espaços (e, mesmo sem espaços,
> é uma credencial antiga/inválida — trocada por uma nova gerada nesta sessão).**
>
> **Item 1 — convite do cliente, testado ao vivo com evento real:** agendamento criado
> como o usuário Roberto (`imovitecadm@gmail.com`, calendário pessoal já conectado) com
> `convidar_cliente:true` → buscado o evento real na Calendar API (não só o banco) →
> `attendees` confirmado com o e-mail do cliente real (`tessddsff@gmail.com`,
> `responseStatus:"needsAction"`) — prova que o Google de fato mandou o convite nativo.
> Mecanismo já implementado numa sessão anterior, nunca antes confirmado funcionando de
> verdade; agora confirmado.
>
> **Item 2 — achado real no SMTP:** `getTransporter()` (`emailService.ts`) sempre passou
> `process.env.SMTP_PASS` cru pro nodemailer — a senha de app salva em `.env.local` tinha
> os espaços que o Google mostra na tela (4 blocos de 4, 19 caracteres com espaço em vez
> de 16), e o Gmail rejeita silenciosamente com espaço. Isolado via `nodemailer.
> createTransport(...).verify()` fora do Next.js (mesmo padrão de diagnóstico das rodadas
> anteriores) — confirmado que MESMO sem espaço a credencial específica salva ali
> continuava sendo rejeitada (`535 Username and Password not accepted`) — ou seja, é uma
> senha de app antiga/inválida, nunca de fato validada (bate com o achado já registrado
> antes nesta sessão: "email_lead_enviado nunca virou true, pré-existente"). Vai ser
> trocada pela senha nova gerada na Fase 5 do setup do Google Calendar desta mesma sessão.
>
> **Corrigido, independente da causa da senha:** `getTransporter()` agora sempre remove
> espaços de `SMTP_PASS` (`.replace(/\s+/g, '')`) antes de autenticar — protege contra o
> mesmo erro de cópia acontecer de novo no futuro (é fácil colar com espaço, já que é
> assim que o Google exibe). `npx tsc --noEmit`: 0 erros.
>
> **Pendente:** usuário vai trocar `SMTP_PASS` no `.env.local` pela senha de app nova
> (nunca compartilhada com esta sessão, mesma disciplina de sempre) e reiniciar o dev —
> teste real de envio (`sendConfirmacaoLead`) ainda por confirmar depois da troca.

> **Atualizado em:** 2026-08-25 (continuação 12) — **Fix real: calendário da empresa
> nunca criava evento nenhum, em nenhum agendamento, mesmo com a Service Account
> corretamente configurada e o calendário corretamente compartilhado.** Descoberto no
> primeiro teste real depois da Fase 1-5 (Service Account configurada localmente,
> `.env.local` com `GOOGLE_SERVICE_ACCOUNT_KEY` real) — usuário pediu pra testar geração
> de evento nos dois calendários (empresa + atendente), sem envolver ainda o convite do
> cliente.
>
> **Investigação, descartando hipóteses por ordem, sem adivinhar:** confirmado via rota de
> diagnóstico temporária (`GET /api/diag-gsa-tmp-2026`, removida ao final — cuidado real
> pego no processo: pasta com `_` no início é "privada" no App Router do Next.js e nunca
> vira rota, 404 até renomear) que o `.env.local` estava sendo lido e parseado
> **corretamente** pelo processo real (`parseOk:true`, `client_email` batendo exato) — não
> era problema de leitura de env var. Confirmado também, via script standalone replicando
> a mesma chamada fora do Next.js, que a MESMA chave criava evento real com sucesso — não
> era problema de credencial nem de permissão do calendário. Isolado o erro real expondo
> temporariamente a mensagem de exceção na resposta da API (revertido logo em seguida):
> `"Service accounts cannot invite attendees without Domain-Wide Delegation of Authority."`
> — restrição real e documentada da API do Google: uma Service Account sem Domain-Wide
> Delegation nunca pode ter `attendees` num evento, mesmo com permissão de escrita no
> calendário. Domain-Wide Delegation só existe pra contas Google Workspace — nunca pra
> Gmail pessoal (o caso de `tenants.google_email` hoje) — não dá pra contornar via
> configuração nenhuma. `eventoBase.attendees` sempre incluía pelo menos o e-mail do
> próprio atendente logado, então TODO agendamento (não só os que convidam cliente)
> sempre bloqueava a criação do evento da empresa, desde sempre.
>
> **Corrigido** (`src/app/api/crm/agendamentos/route.ts`): o evento da empresa passa a ser
> criado sem `attendees` (destructuring de `eventoBase` excluindo o campo só nessa
> chamada) — o convite nativo de verdade continua acontecendo pelo calendário PESSOAL do
> atendente (`createEventUsuario`, sem essa restrição), e a notificação por e-mail
> (atendente/cliente) continua pelos e-mails de confirmação customizados
> (`sendConfirmacaoCorretor`/`sendConfirmacaoLead`), que nunca dependeram do Calendar.
>
> **Testado ao vivo, ponta a ponta, com agendamento real** (tenant CRM SOZINHO, lead real
> Frank Aguiar, usuário real `admxyz` com calendário pessoal conectado): antes do fix,
> `google_event_id_empresa` sempre `null`; depois do fix, **os dois IDs vieram preenchidos
> na mesma resposta** — `google_event_id_usuario` e `google_event_id_empresa` — primeira
> vez nesta sessão inteira que isso acontece. Todo evento/dado de teste criado durante a
> investigação (2 na conta pessoal + 1 direto via script standalone na empresa, mais os 3
> agendamentos de diagnóstico anteriores) removido/cancelado via a própria API + chamada
> direta à Calendar API, `count(*)=0` confirmado. Instrumentação de diagnóstico
> (rota temporária + variável de erro exposta na resposta) 100% revertida —
> confirmado por `git status`/`git diff` vazio antes do commit do fix real. `npx tsc
> --noEmit`: 0 erros (1 artefato stale de `.next/types` da rota de diagnóstico deletada,
> mesmo padrão já documentado neste projeto, removido manualmente).
>
> **Também neste bloco:** usuário adicionou `imovitecadm@gmail.com` ("Roberto Severo",
> tenant CRM SOZINHO) como usuário de teste na Tela de Permissão OAuth do Google Cloud —
> desbloqueia o "Conectar agora" (calendário pessoal) pra esse usuário especificamente, que
> antes batia em `Erro 403: access_denied` (app em modo Teste, só e-mails cadastrados como
> testador conseguem passar pela tela de consentimento). Conexão em si (OAuth completo)
> ainda não confirmada — `google_calendar_authorized` continua `false` pra esse usuário até
> ele de fato completar o fluxo "Conectar agora" pela UI.

> **Atualizado em:** 2026-08-25 (continuação 11) — **Setup real do Google Calendar +
> SMTP de produção concluído (Google Cloud Console + Gmail), guiado passo a passo com o
> usuário via prints. `scripts/deploy.sh` ganha um mecanismo de auto-preenchimento seguro
> — nunca segredo real dentro de arquivo versionado.**
>
> **Feito no Google Cloud Console (projeto "Artemis4 CRM", reaproveitando o mesmo Client
> OAuth já usado em dev, por decisão do usuário):**
> 1. Redirect URIs de produção/staging cadastrados no Client OAuth existente:
>    `https://www.artemis4.com.br/api/auth/google/callback` +
>    `https://staging.artemis4.com.br/api/auth/google/callback`.
> 2. Service Account `netimobiliaria-calendar-empresa` criada (e-mail técnico
>    `artemis4-calendar-empresa@artemis4-crm.iam.gserviceaccount.com`), sem papel de IAM
>    no projeto (não precisa — o acesso real é concedido direto no Google Calendar).
> 3. Chave JSON gerada e baixada — **nunca compartilhada com esta sessão do Claude**, só o
>    usuário teve acesso ao conteúdo, por decisão de segurança combinada antes de começar.
> 4. Calendário de `alexandreseverog@gmail.com` compartilhado com o e-mail técnico da
>    Service Account, permissão **"Fazer alterações e ver todos os detalhes dos eventos"**
>    — achado real no processo: a permissão inicial que o Google sugere por padrão ao
>    adicionar alguém é só leitura ("Mais detalhes de todos os eventos"), teria deixado a
>    Service Account incapaz de criar evento nenhum; corrigido antes de prosseguir.
> 5. Senha de app do Gmail gerada (`myaccount.google.com/apppasswords`, nome "Artemis4 CRM
>    SMTP") — mesma disciplina: nunca compartilhada com esta sessão.
>
> **Pedido original do usuário — automatizar a inserção dessas variáveis no `.env` de
> produção pra quando o deploy real acontecer — recusado na forma literal pedida (colar os
> valores reais dentro de `scripts/deploy.sh`) e resolvido de forma segura:** `scripts/
> deploy.sh` (arquivo rastreado pelo Git, já commitado/enviado ao GitHub várias vezes nesta
> sessão) nunca deveria conter segredo real — uma vez commitado, fica no histórico do
> repositório para sempre, mesmo que uma linha seja apagada num commit seguinte. Implementado
> em vez disso um mecanismo de **arquivo de segredos separado, fora do Git**:
> - `scripts/deploy.secrets.env` (novo, **adicionado ao `.gitignore`** — confirmado via
>   `git check-ignore -v` que nunca aparece nem como untracked) — contém os valores reais.
> - `scripts/deploy.secrets.env.example` (novo, este sim versionado) — template sem
>   segredo nenhum, documentando os campos esperados.
> - `scripts/deploy.sh` — antes de gerar o `.env`, checa se `scripts/deploy.secrets.env`
>   existe; se existir, faz `source` nele (`set -a`) e usa os valores pra pré-preencher
>   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_SERVICE_ACCOUNT_KEY`/`SMTP_*` no `.env`
>   gerado; se não existir, os campos ficam em branco — comportamento idêntico ao de antes,
>   zero regressão pra quem não usar esse arquivo. Todo campo escrito no `.env` gerado agora
>   sai entre aspas simples (`GOOGLE_CLIENT_ID='...'`), defesa em profundidade — inclusive
>   pra campos que hoje não têm espaço/aspas (ex. `SMTP_FROM_NAME='Artemis4 CRM'`, achado
>   ao revisar: o próprio valor default sugerido tem espaço, quebraria um `source` bash
>   sem aspas).
>
> **Testado, sem tocar no repositório real:** simulação completa do round-trip (arquivo de
> segredos fake com JSON+aspas internas e valor com espaço → `source` → geração do `.env`
> via o mesmo heredoc do script → `source` do `.env` gerado, simulando tanto o passo
> seguinte do próprio `deploy.sh` quanto a leitura que o `docker compose` faria) rodada
> num diretório `/tmp` isolado — confirmado que o JSON sai válido depois do round-trip
> completo (`JSON.parse` sem erro) e que `SMTP_FROM_NAME` sobrevive com o espaço intacto.
> Caso sem arquivo de segredos (comportamento antigo) também testado — campos saem como
> `''` (vazio, aspas simples), sem quebrar nada. `bash -n scripts/deploy.sh` sem erro de
> sintaxe.
>
> `scripts/deploy.secrets.env` real já preenchido com os 2 valores não-sensíveis que esta
> sessão já tinha (mesmo `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` de dev, reaproveitados) —
> faltam só `GOOGLE_SERVICE_ACCOUNT_KEY` (colar o JSON baixado) e `SMTP_PASS` (colar a senha
> de app), que só o usuário tem, com instrução completa de como preencher escrita dentro do
> próprio arquivo (comentários). Quando a VPS existir de fato, o arquivo precisa ser levado
> pra lá fora do Git (ex. `scp`) antes de rodar `./scripts/deploy.sh` — documentado no
> próprio arquivo.

> **Atualizado em:** 2026-08-25 (continuação 10) — **Deploy da VPS ganha as variáveis do
> Google Calendar + SMTP (nenhuma delas passava pelo `scripts/deploy.sh` até agora) + fix
> real: `GOOGLE_REDIRECT_URI` nunca poderia funcionar em produção do jeito que estava.**
> Usuário perguntou, depois do resumo da rodada anterior, se o deploy preencheria
> automaticamente essas variáveis em todas as instâncias — resposta honesta: não, e
> nunca poderia, já que Google/SMTP são credenciais emitidas por terceiros (diferente de
> senha de banco/JWT_SECRET, que `deploy.sh` já gera sozinho via `openssl`).
>
> **Achado real, mais sério que só "falta documentar":** `GOOGLE_REDIRECT_URI` era uma env
> var única e fixa (`src/app/api/auth/google/authorize` e `.../callback`) — mas produção e
> staging são domínios DIFERENTES, e o Google exige o `redirect_uri` batendo exato com o
> que foi cadastrado. Um valor único nunca poderia estar certo pras duas instâncias ao
> mesmo tempo. Corrigido derivando o callback em runtime a partir de
> `NEXT_PUBLIC_APP_URL` (novo `getGoogleRedirectUri()` em `calendarService.ts`, usado nos
> 2 pontos) — essa variável já é corretamente diferente por instância no
> `docker-compose.vps.yml` (`PROD_APP_URL`/`STAGING_APP_URL`), então passa a funcionar
> certo nas duas sem nenhuma env var nova. `GOOGLE_REDIRECT_URI` removida de `.env.local`
> (não lida mais em lugar nenhum) — só falta cadastrar os 2 URLs de callback reais (prod +
> staging) como "URIs de redirecionamento autorizados" no mesmo Client OAuth do Google
> Cloud Console, passo manual único, fora do código.
>
> **`scripts/deploy.sh` + `docker-compose.vps.yml`** — mesmo padrão já usado pra
> `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` (placeholder vazio no `.env` gerado, preenchido
> manualmente depois do deploy): `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/
> `GOOGLE_SERVICE_ACCOUNT_KEY`/`SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/
> `SMTP_PASS`/`SMTP_FROM_NAME` adicionadas ao template + no bloco `environment:` de
> `prod_app` **e** `staging_app` (sem YAML anchor no arquivo — duplicado igual todo o
> resto já era) — um valor só no `.env`, preenchido uma vez, ativa as duas instâncias
> juntas (mesmo comportamento que os campos de LLM já têm).
>
> **Achado de segurança no processo, corrigido antes de virar problema real:**
> `GOOGLE_SERVICE_ACCOUNT_KEY` é um blob JSON com aspas duplas internas — `deploy.sh` faz
> `source .env` em bash pra carregar as variáveis; sem aspas simples envolvendo o valor
> inteiro, bash trata as aspas duplas internas como delimitador e as remove, corrompendo o
> JSON antes mesmo de chegar ao container (e, por `set -a`, esse valor corrompido ganha
> precedência sobre o parsing correto que o próprio `docker compose` faria do `.env` cru).
> `.env.google_calendar.example` corrigido pra mostrar o valor entre aspas simples
> (`GOOGLE_SERVICE_ACCOUNT_KEY='{"type":...}'`) com o porquê explicado; mesmo aviso
> replicado no comentário do placeholder gerado por `deploy.sh`.
>
> **Testado:** `npx tsc --noEmit` limpo · `docker-compose.vps.yml` validado como YAML
> (`js-yaml`) confirmando as novas chaves presentes nos 2 serviços · `bash -n
> scripts/deploy.sh` sem erro de sintaxe · `GET /api/auth/google/authorize` real (dev)
> confirmou `redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback`
> — idêntico ao valor hardcoded de antes, agora derivado de `NEXT_PUBLIC_APP_URL` em vez
> de env var fixa, sem regressão no fluxo de dev.

> **Atualizado em:** 2026-08-25 (continuação 9) — **Convite do cliente por Google Calendar
> nativo (attendee) + achado real: a Service Account do calendário da empresa nunca esteve
> configurada em nenhum ambiente.** Usuário pediu, depois de agendar uma visita, que o
> cliente também recebesse o evento no próprio Google Calendar — levantou 2 preocupações:
> (1) lead ainda sem cadastro em `clientes`; (2) mesmo cadastrado, o e-mail pode não ser
> conta Google.
>
> **Investigação (sem escrever código ainda) revelou que as duas preocupações eram, na
> prática, dissolvidas por um mecanismo que já existia parcialmente:** os dois
> `createEvent*` (`calendarService.ts`) já incluíam o e-mail do lead como `attendee` com
> `sendUpdates=all` — o convite nativo do Google funciona pra qualquer provedor de e-mail
> (não só Gmail), sem exigir OAuth do lado do cliente. Achado real, não hipotético, no
> caminho: `GOOGLE_SERVICE_ACCOUNT_KEY` **nunca esteve configurada** — nem em `.env.local`
> (dev), nem em `.env.example`/`docker-compose.vps.yml` (templates de deploy) — só existia
> um arquivo de exemplo nunca preenchido. Por isso `google_event_id_empresa` sempre ficou
> vazio em todo agendamento já criado nesta sessão; o único caminho que já criava evento
> real era o pessoal (`createEventUsuario`, quando o atendente logado já conectou o
> próprio Google Calendar via OAuth).
>
> **Resolvido em 2 frentes, conforme pedido ("vamos resolver as 2 questões"):**
> 1. **Documentação do setup da Service Account** (`.env.google_calendar.example`) — passo
>    extra que faltava documentado: além da chave, o calendário de `tenants.google_email`
>    precisa ser compartilhado manualmente com o `client_email` da Service Account
>    (permissão "Fazer alterações em eventos"), por tenant. Ação real de criar a Service
>    Account/compartilhar o calendário depende do usuário (conta Google dele, fora do que
>    esta sessão consegue automatizar) — documentado, não implementado nesta rodada.
> 2. **Convite do cliente — UI/UX implementada e testada de ponta a ponta:**
>    `prisma/migration-2026-08-25-agendamentos-email-convite.sql` — nova coluna
>    `agendamentos.email_convite_destino` (audit trail de qual e-mail foi de fato
>    convidado, `NULL` = nenhum convite). `POST /api/crm/agendamentos` — novo par
>    `cliente_email`/`convidar_cliente` no body; e-mail efetivo resolvido com prioridade
>    body > `clientes.email` (join já existente) > `leads_staging.email`, validado por
>    regex simples; `convidar_cliente` é o interruptor único que governa TANTO o attendee
>    do Google Calendar QUANTO o e-mail de confirmação customizado (nunca desacoplados —
>    do ponto de vista do cliente é a mesma decisão de contato). Quando o lead ainda não
>    tinha e-mail e o atendente digita um pra convidar, o valor é gravado de volta em
>    `leads_staging.email` (só quando estava vazio — nunca sobrescreve um valor real
>    já existente). `AgendarVisitaModal.tsx` — novo campo "E-mail do cliente" (editável,
>    pré-preenchido com `lead.email`) + checkbox "Convidar o cliente por e-mail", com aviso
>    âmbar quando marcado sem e-mail; texto do resumo final passa a citar o e-mail real
>    que vai ser convidado, ou avisa explicitamente que nenhum convite será enviado.
>
> **Testado ao vivo, ponta a ponta, 3 cenários com agendamento real** (tenant CRM SOZINHO,
> usuário real `admxyz` com Google Calendar pessoal conectado — confirma o caminho de
> criação de evento de verdade, já que o da empresa segue bloqueado até a Service Account
> ser configurada): (1) lead com e-mail já capturado (Frank Aguiar) → campo pré-preenchido,
> resumo final citou o e-mail certo, `agendamentos.email_convite_destino` gravado igual ao
> `attendee` do evento criado de fato · (2) lead novo sem nenhum e-mail (criado só pra este
> teste) → campo veio vazio + aviso âmbar; digitado um e-mail na hora → agendamento criado
> com esse e-mail como convite E `leads_staging.email` do lead passou a ter esse valor
> (write-back confirmado por SQL, fechando a lacuna de cadastro pro futuro) · (3) chamada
> direta com `convidar_cliente:false` e e-mail válido → `email_convite_destino` gravado
> `NULL`, confirma que o interruptor suprime o convite mesmo com e-mail presente.
> **Achado incidental, não-regressão** (mesmo comportamento presente em todos os 4
> agendamentos de teste desta sessão, inclusive os de antes desta mudança):
> `email_lead_enviado`/`email_corretor_enviado` nunca viram `true` apesar de SMTP
> configurado em `.env.local` — pré-existente, fora do escopo desta rodada, registrado
> honestamente como pendência a investigar se o usuário quiser confirmação de entrega real
> do e-mail de confirmação (distinto do convite nativo do Google, que é o que este pedido
> resolveu). Todo dado de teste (3 agendamentos + 1 lead descartável) removido via a
> própria API (cancelamento real, apaga o evento do Google Calendar) + SQL, `count(*)=0`
> confirmado; os 3 agendamentos reais pré-existentes deste tenant (não meus) intactos.
> `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 8) — **Fix real: "Histórico de Visitas" só
> refletia um agendamento novo depois de recarregar a página inteira.** Usuário pediu
> explicitamente que o agendamento recém-salvo aparecesse na lista logo em seguida, sem
> precisar recarregar.
>
> **Causa raiz confirmada:** `AgendamentosLead.tsx` só busca `GET /api/crm/agendamentos` uma
> vez, no mount (`useEffect` chaveado só por `leadUuid`) — nada disparava um novo fetch depois
> de criar um agendamento. `AgendarVisitaModal.onSuccess` (chamado ao clicar "Concluir" na tela
> de sucesso, já depois do `POST` real ter retornado 201) só fechava o modal
> (`setIsAgendarOpen(false)`), sem avisar o componente da lista.
>
> **Corrigido:** `AgendamentosLead` ganhou a prop opcional `refreshKey?: number`, incluída nas
> deps do `useEffect` de carga — mudar o valor força um novo `loadAgendamentos()`.
> `kanban/page.tsx` ganhou o state `agendamentosVersion`, incrementado dentro do `onSuccess` do
> `AgendarVisitaModal` (`setAgendamentosVersion(v => v + 1)`), e repassado como `refreshKey` pro
> `AgendamentosLead` da ficha do lead.
>
> **Testado ao vivo, ponta a ponta, com agendamento real** (tenant CRM SOZINHO, lead real
> "Frank Aguiar", usuário real `admxyz`): fluxo completo Data→Horário→Confirmar→"Visita
> Agendada!" → `POST` real criou o evento (Google Calendar + linha em `agendamentos`,
> `status='agendado'`) → clique em "Concluir" → **sem nenhuma navegação/reload**, "Histórico de
> Visitas" passou de 1 para 2 itens e o novo agendamento ("qua., 26 de ago. • 10:00–11:00")
> apareceu imediatamente no topo da lista — confirmado via leitura do DOM logo após o clique,
> não por suposição. Agendamento de teste cancelado em seguida pela própria UI (botão
> "Cancelar visita", mesmo fluxo real que qualquer usuário usaria — remove o evento do Google
> Calendar e marca `status='cancelado'`, nunca hard-delete), confirmado por SQL. `npx tsc
> --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 7) — **Banner de calendário pessoal não conectado
> passa a mostrar o e-mail cadastrado do atendente logado.** Complemento direto do banner da
> continuação anterior — usuário perguntou explicitamente: "exibir 'Nenhum e-mail cadastrado'
> quando não houver e-mail cadastrado para o atendente logado ou o e-mail que está cadastrado".
>
> **Implementado** (`src/components/crm/AgendarVisitaModal.tsx`): `Props.tenantConfig` ganhou o
> campo `user_email?: string | null` (o dado já existia em runtime — `GET /api/crm/config/
> tenant` já retorna `u.email as user_email`, só nunca tinha sido declarado no tipo nem lido
> pelo componente); nova linha no banner "E-mail cadastrado: {tenantConfig.user_email ||
> 'Nenhum e-mail cadastrado'}", com o valor de fallback em itálico pra se diferenciar
> visualmente de um e-mail real.
>
> **Testado ao vivo, os dois ramos, mesmo cenário já validado antes** (tenant CRM SOZINHO,
> usuário real `admxyz`, sessão JWT real): e-mail real cadastrado (`alexandreseverog@gmail.com`)
> → banner mostra exatamente esse valor · e-mail temporariamente esvaziado no banco (`users.
> email=''`, único jeito de reproduzir — a coluna é `NOT NULL`, nunca fica `NULL` de verdade)
> → banner mostra "Nenhum e-mail cadastrado" em itálico (confirmado via `getComputedStyle`,
> `font-style: italic`) · e-mail restaurado ao valor original logo em seguida, confirmado por
> SQL. `npx tsc --noEmit`: 0 erros (1 erro de sintaxe JSX cometido e corrigido no meio do
> processo — a 1ª edição cortou o `<a` da tag do link "Conectar agora" ao inserir a nova linha
> antes dele).

> **Atualizado em:** 2026-08-25 (continuação 6) — **Agendar Visita: aviso não-bloqueante quando
> o atendente logado não tem o próprio Google Calendar conectado.** Complemento direto do fix
> anterior (empresa já basta, nunca mais bloqueia): usuário perguntou se a aplicação avisa o
> atendente que ele não vai receber o evento no calendário pessoal — resposta honesta foi que
> não, só o texto sutil do resumo final indicava isso.
>
> **Implementado** (`src/components/crm/AgendarVisitaModal.tsx`): banner âmbar dispensável nos
> passos "Data"/"Horário" (só quando `!hasPersonalCalendar`, nunca nos demais passos) —
> explica a consequência real ("o evento vai pro calendário da empresa, só não aparece no seu
> Google Calendar pessoal, sem lembrete automático") + link "Conectar agora" (mesmo CTA de
> OAuth já usado na tela de bloqueio antiga) + botão de dispensar (state `personalBannerDismissed`,
> resetado toda vez que o modal reabre). Nunca bloqueia — só informa, exatamente como pedido.
>
> **Testado ao vivo:** banner renderiza com o texto certo assim que o modal abre pro atendente
> sem calendário pessoal conectado; clique em "Dispensar" remove corretamente (confirmado numa
> 2ª leitura do DOM — a 1ª leitura, na mesma call síncrona do clique, ainda pegou o state
> antes do re-render do React aplicar). `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 5) — **Agendar Visita não bloqueia mais o fluxo
> pedindo OAuth pessoal do Google Calendar quando o TENANT já tem o calendário da empresa
> configurado.** Usuário reportou (print real): mesmo com `tenants.calendario=true` e
> `tenants.google_email` configurados via `/admin/master/tenants` pro tenant CRM SOZINHO,
> clicar em "+ Nova visita" no Kanban ainda mostrava a tela bloqueante "Conectar Google
> Calendar" — e defendeu corretamente que esse tipo de aviso deveria viver na tela de
> configuração do tenant, não interromper o fluxo de agendar visita.
>
> **Investigação confirmou que é decisão de arquitetura, não bug cosmético:** o agendamento
> sempre usou DOIS calendários juntos — o da EMPRESA (Service Account + `tenants.google_email`,
> já configurado) e o do ATENDENTE LOGADO individualmente (OAuth pessoal, refresh_token em
> `users.google_refresh_token`) — ambos somados tanto pra checar disponibilidade quanto pra
> criar o evento (o corretor também tem o compromisso no próprio Google Calendar). O gate do
> modal (`AgendarVisitaModal`) e os 2 endpoints (`disponibilidade`/`POST agendamentos`) exigiam
> o token PESSOAL do usuário logado como requisito OBRIGATÓRIO, ignorando por completo que o
> calendário da empresa já bastaria sozinho.
>
> **Confirmado via `AskUserQuestion`** entre 2 opções (abandonar de vez o calendário pessoal vs.
> manter os 2 mas parar de bloquear quando só o pessoal falta): usuário escolheu manter os 2,
> só corrigir a degradação — calendário pessoal vira reforço opcional, nunca bloqueio.
>
> **Implementado:**
> 1. `src/lib/google/calendarService.ts` — `getAvailableSlots` aceita `userRefreshToken`
>    opcional (`string | null | undefined`); sem ele, a checagem de conflito roda só com o
>    calendário da empresa, sem lançar erro.
> 2. `src/app/api/crm/agendamentos/disponibilidade/route.ts` — reordenado: a config do TENANT
>    (`calendario`/`google_email`) vira o bloqueio real (checada primeiro); o token pessoal do
>    usuário logado deixou de ser obrigatório, só é lido e repassado se existir.
> 3. `src/app/api/crm/agendamentos/route.ts` (POST) — removido o 403 que exigia
>    `google_calendar_authorized`/`google_refresh_token` do usuário; `createEventUsuario` só é
>    tentado quando o token existe, `createEventEmpresa` (que já rodava incondicional) segue
>    sendo o caminho garantido.
> 4. `src/components/crm/AgendarVisitaModal.tsx` — gate vira
>    `tenantConfig.empresa_configurada || (google_calendar_authorized && has_google_token)`
>    (era só a 2ª metade, obrigatória); texto do resumo de confirmação passa a ser condicional
>    ("no seu Google Calendar e no calendário da empresa" só quando o pessoal está conectado,
>    senão só "no calendário da empresa"); tela "connect" (agora só alcançável quando NEM a
>    empresa está configurada) reescrita pra apontar pro admin configurar em Configurações da
>    Empresa, com a conexão pessoal como alternativa, não mais como única saída.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, usuário real `admxyz`
> sem token pessoal — confirmado via SQL `google_calendar_authorized=false`,
> `has_token=false` — tenant COM `calendario=true`/`google_email` reais): `GET /api/crm/
> config/tenant` confirma `empresa_configurada:true` · `GET .../disponibilidade` passou de
> 403/503 pra `200` com slots reais · **sessão real no navegador**: clique em "+ Nova visita"
> no Kanban pula direto pro passo "Data" (sem a tela de conectar) · avançado até "Confirmar" →
> texto correto "Um evento será criado no calendário da empresa." (sem menção ao "seu Google
> Calendar", confirmando o texto condicional) · `POST /api/crm/agendamentos` real (lead de
> teste descartável) → `201`, agendamento criado com sucesso (antes: 403 `NOT_AUTHORIZED`).
> `npx tsc --noEmit`: 0 erros. Lead + agendamento de teste removidos, `count(*)=0` confirmado.

> **Atualizado em:** 2026-08-25 (continuação 4) — **Botão de excluir anexo: de um "×" cinza
> discreto pra um botão explícito com texto+ícone de lixeira+borda vermelha.** O fix anterior
> (cor visível no tema claro) já tinha resolvido o problema técnico, mas o usuário mandou novo
> print mostrando que o "×" pequeno ao lado de cada anexo (mesmo visível) não era percebido
> como um botão de exclusão de verdade — só um caractere solto.
>
> **Corrigido:** `AttachmentEntry` — `XMarkIcon` sozinho virou `TrashIcon` + texto "Remover",
> num botão com borda vermelha (`border-red-200`/`text-red-500` no claro,
> `border-red-500/20`/`text-red-400` no escuro) — mesmo vocabulário de ícone já usado no botão
> "Excluir" da atividade inteira, agora inconfundível como controle clicável. Cada linha de
> anexo também ganhou um fundo sutil (`bg-gray-50`/`bg-white/[0.03]`) pra separar visualmente
> um anexo do outro.
>
> **Testado ao vivo:** `getComputedStyle` dos 3 botões confirma texto "Remover", `color:
> rgb(239, 68, 68)` (vermelho-500) e `border: rgb(254, 202, 202)` (vermelho-200) — visualmente
> explícito, não mais um glifo isolado. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 3) — **Fix real: botão de excluir anexo invisível
> no tema claro — `text-white/30` hardcoded, nunca reagia ao tema.** Usuário mandou print real
> do card no tema claro confirmando os 3 anexos listados mas nenhum botão de exclusão visível
> — o botão existia (commit anterior) mas renderizava branco quase transparente sobre fundo
> claro, efetivamente invisível.
>
> **Corrigido:** `AttachmentEntry` (`src/components/crm/AtividadesLead.tsx`) passou a chamar
> `useTheme()` (não tinha acesso ao tema antes, só o componente pai tinha) e o botão de
> remover troca `text-white/30` fixo por `t.isDark ? 'text-white/40' : 'text-gray-400'` —
> mesmo padrão já usado nos botões de editar/excluir atividade no mesmo arquivo.
>
> **Testado ao vivo, tema claro** (mesma tela do print do usuário): `getComputedStyle` dos 3
> botões de remover confirma `color: rgb(156, 163, 175)` (cinza-400 real, visível) em vez do
> branco quase invisível de antes. `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação 2) — **Atividades do CRM: botão de excluir anexo
> individual passa a existir também no card de leitura, não só dentro do formulário de
> edição.** Pedido direto do usuário: "tem que haver um botão de exclusão de anexos
> individualmente" — confirmado via `AskUserQuestion` que o botão já existia (dentro de
> "Editar"), mas faltava direto no card, sem precisar entrar em edição antes.
>
> **Implementado** (`src/components/crm/AtividadesLead.tsx`): `handleRemoveExistingAnexo`
> generalizado pra `handleDeleteAnexo(anexoId, atividadeId)` — mesma chamada à API
> (`DELETE /api/crm/atividades/anexos`), mas agora atualiza os DOIS locais de state que podem
> exibir o mesmo anexo ao mesmo tempo: a lista `atividades` (card de leitura, sempre visível)
> e `editingAnexos` (formulário de edição, quando aberto) — a atividade real continua
> renderizada embaixo mesmo com o formulário dela aberto em cima, então os dois precisam ficar
> consistentes. `<AttachmentEntry onRemove={...}>` agora passado também no card de leitura
> (antes só dentro do form).
>
> **Testado ao vivo, ponta a ponta:** durante o teste, a mesma atividade real já tinha 2
> anexos genuínos que o próprio usuário subiu entre as rodadas de teste anteriores
> (`CEMIG_v10.pdf`, um comprovante de apartamento) — confirmado que NÃO eram meus, preservados
> intactos. Adicionado um 4º anexo só de teste via API → confirmado renderizando no card de
> leitura (sem precisar clicar em "Editar") → clique real no botão "Remover este anexo" direto
> no card (com `window.confirm` interceptado só pra este teste automatizado) → removido com
> sucesso, e os outros 3 (o legado + os 2 reais do usuário) confirmados intactos via SQL
> (`nome_original` das 3 linhas batendo exato com o esperado). `npx tsc --noEmit`: 0 erros.

> **Atualizado em:** 2026-08-25 (continuação) — **Atividades do CRM: novo anexo escolhido na
> edição aparece na hora, na MESMA lista dos já existentes (selo "Novo"), não mais numa seção
> separada.** Ajuste direto pedido pelo usuário sobre a entrega anterior (múltiplos anexos por
> atividade — ver entrada logo abaixo): confirmado via `AskUserQuestion` que o esperado era uma
> lista única (não 2 seções, "Anexos já registrados" vs. "Novos anexos ainda não salvos").
>
> **Implementado** (`src/components/crm/AtividadesLead.tsx`): `formFiles: File[]` virou
> `pendingFiles: PendingFile[]` (`{id, file, previewUrl, tipo}`) — `previewUrl` gerado via
> `URL.createObjectURL(file)` no exato momento da seleção (preview real local, sem esperar
> upload); `AttachmentPreview` generalizado pra `AttachmentEntry` (aceita `url`/`tipo`/
> `nomeOriginal` normalizados, funciona tanto pra anexo já salvo quanto pendente) — mesma
> renderização de áudio/imagem/PDF pros dois casos, prop `pending` só acrescenta o selo âmbar
> "Novo"; a lista "Anexos" no formulário agora itera `editingAnexos` seguido de `pendingFiles`
> sem nenhuma quebra visual entre os dois. `URL.revokeObjectURL` chamado ao remover um
> pendente, ao resetar o form e num cleanup de unmount (evita vazamento de blob: no navegador).
>
> **Testado ao vivo no navegador** (tenant CRM SOZINHO, mesma atividade real com 1 anexo já
> salvo): arquivo PDF sintético injetado no input real (`DataTransfer`+`change` — mesmo padrão
> já usado nesta sessão pra simular seleção de arquivo sem picker nativo) → confirmado via DOM
> que o novo anexo (`novo_documento_teste.pdf`, `blob:` local) aparece imediatamente logo após
> o existente (`et_software.pdf`) na mesma lista, com exatamente 1 selo "Novo" — sem clicar em
> Salvar · botão "Remover (ainda não salvo)" testado → item pendente removido do DOM
> (`blobLinksRemaining:0`) sem nenhuma chamada à API (anexo real permanece intacto) ·
> formulário cancelado sem salvar. `npx tsc --noEmit`: 0 erros. `atividade_lead_anexos`
> confirmada com `count(*)=1` ao final (nenhum resíduo — nada chegou a ser persistido).

> **Atualizado em:** 2026-08-25 — **Atividades do CRM: múltiplos anexos por atividade (antes
> só 1, sem histórico visível na edição).** Pedido direto do usuário: "na edição de uma
> atividade, quando já existe um documento anteriormente anexado, não é exibido esse
> histórico de anexos... se existirem documentos anteriores, devem ser exibidos e deverá ser
> possível anexar outras mais". Confirmado via `AskUserQuestion` (2 opções — corrigir só a
> exibição do único anexo existente vs. suporte real a múltiplos): usuário escolheu
> **múltiplos anexos de verdade**.
>
> **Causa raiz:** `atividades_lead` guardava no máximo 1 anexo por atividade em 4 colunas
> soltas (`anexo_url`/`anexo_tipo`/`anexo_nome_original`/`anexo_tamanho_bytes`) — o formulário
> de edição (`startEdit()`) nunca lia nem exibia esse anexo já existente, e qualquer novo
> upload durante a edição SUBSTITUÍA o anterior (o backend já preservava o anexo quando
> nenhum arquivo novo vinha, mas não tinha como somar um 2º). Confirmado via grep que só 2
> arquivos em todo o código liam essas colunas (`route.ts` + `AtividadesLead.tsx`).
>
> **Implementado:**
> 1. `prisma/migration-2026-08-25-atividade-lead-anexos.sql` (aplicada) — nova tabela
>    `public.atividade_lead_anexos` (N linhas por atividade, `s3_key`/`url`/`tipo`/
>    `nome_original`/`tamanho_bytes`/`created_at`); backfill do único anexo real existente no
>    banco (1 linha, atividade "Reunião para esclarecimento de políticas de preços", tenant
>    CRM SOZINHO) — `s3_key` derivado do segmento estável `atividades/...` do path da URL
>    (não hardcoded em `CDN_URL`/`S3_ENDPOINT`, funciona igual em dev/produção); as 4 colunas
>    legadas removidas de `atividades_lead` na mesma migração, depois do backfill confirmado.
> 2. `src/app/api/crm/atividades/route.ts` reescrita — `POST`/`PATCH` aceitam `arquivos`
>    (multipart, múltiplos arquivos sob o mesmo campo) em vez de `arquivo` único; cada upload
>    vira uma linha NOVA em `atividade_lead_anexos`, nunca substitui as existentes; `GET`
>    embute `anexos: Anexo[]` em cada atividade via subquery `json_agg` correlacionada
>    (`ORDER BY created_at ASC`, `COALESCE(...,'[]')` — nunca `null`).
> 3. `src/app/api/crm/atividades/anexos/route.ts` (novo) — `DELETE ?id=X` remove 1 anexo
>    específico (hard delete real, não soft — resíduo de upload errado não é "estado de
>    negócio" a preservar); isolamento por tenant via JOIN com a atividade dona (nunca confia
>    em `tenant_id` solto do anexo); remove o objeto do S3/MinIO best-effort (não bloqueia a
>    resposta se o storage falhar).
> 4. `src/components/crm/AtividadesLead.tsx` reescrita — `Atividade.anexos: Anexo[]` (era 3
>    campos únicos); `AttachmentPreview` agora recebe 1 `Anexo` + `onRemove?` opcional (usado
>    só dentro do formulário de edição, nunca no card de leitura); card de leitura lista TODOS
>    os anexos da atividade + contador "N anexos" ao lado do autor; formulário de edição ganha
>    seção "Anexos já registrados" (lista os existentes, cada um com botão remover — chama o
>    endpoint novo na hora, sem esperar "Salvar") + input de arquivo com `multiple` ("pode
>    escolher vários") + lista de "Novos anexos (ainda não salvos)" com remoção individual
>    antes de enviar.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, atividade real com o
> único anexo pré-existente da plataforma): `GET` confirma `anexos:[{...et_software.pdf...}]`
> pra atividade com anexo e `anexos:[]` pra atividade sem nenhum · `PATCH` com um 2º arquivo
> real (multipart) → confirmado por `GET` seguinte que os DOIS anexos coexistem (nunca
> substituiu o 1º) · `DELETE /anexos?id=X` do 2º → confirmado que só ele sumiu (1º intacto) +
> objeto real removido do MinIO (`404` confirmado direto na origem) · **sessão real no
> navegador** (JWT+cookie+localStorage injetados, tenant CRM SOZINHO): card de leitura mostra
> "· 1 anexo" + o link do PDF; clique em "Editar" abre o formulário com a seção "Anexos já
> registrados" mostrando o PDF existente + botão "Remover este anexo" (confirmado ausente na
> cópia do card de leitura, presente só na do formulário); input de arquivo confirmado
> `multiple:true` via DOM. `npx tsc --noEmit`: 0 erros. Todo dado de teste (2º anexo inserido
> só pra provar a soma) removido, descrição original da atividade restaurada
> (`UPDATE` revertendo o texto de teste do PATCH via JSON usado no meio da verificação),
> `atividade_lead_anexos` confirmada com só a 1 linha real (`count(*)=1`) ao final.

> **Atualizado em:** 2026-08-23 (continuação 2) — **Roteiro de testes (item 1.2, passos 5/6/7):
> bug real encontrado e corrigido — `score_fit` era fabricado (valor neutro 50%) quando o
> segmento/tenant não tinha nenhum critério de Fit cadastrado, em vez de `null`/"—" como o
> próprio roteiro (e o docstring do módulo) já exigia.** Testado ao vivo com dado real, tenant
> CRM SOZINHO (segmento Venda de Carros, 0 critérios de Fit cadastrados — nem no segmento nem
> no tenant).
>
> **Contexto:** usuário pediu pra testar minuciosamente 3 itens da ficha do lead: (5) os tiles
> separados "Intenção X%"/"Fit X% ou —"; (6) `NextBestActionCard` (sugestão + botão "Registrar
> como Atividade"); (7) `AgendamentosLead` (histórico de visitas).
>
> **Bug real encontrado testando o item 5, não hipotético:** `src/lib/ai/conciergeService.ts`,
> `qualifyWithLlm()` — quando `fitCriteria.length === 0` (nenhum critério de Fit cadastrado pro
> segmento/tenant), o prompt instruía o LLM a **"retorne score_fit: 5 (neutro)"** e o código
> persistia esse valor fabricado direto — contradizendo o próprio docstring de
> `QualificationResult.score_fit` ("null = nunca avaliado... nunca inventamos um número aqui")
> e o fallback por palavra-chave (`matchByKeyword`, no mesmo arquivo), que já fazia a coisa
> certa (`score_fit: null`) nesse mesmo cenário. Um lead de teste real qualificado pelo LLM
> (Groq, mensagem real sobre picape 4x4) confirmou: `score_fit=50` persistido mesmo com 0 linhas
> em `crm_fit_criterios_segmento`/`crm_fit_criterios_tenant` — a ficha mostraria "Fit 50%" como
> se fosse uma avaliação real, quando não existe nenhum critério configurado pra avaliar nada.
>
> **Corrigido em 2 camadas** (texto do prompt sozinho não é suficiente — LLMs nem sempre seguem
> a instrução de omitir um campo, mesma lição já registrada várias vezes nesta sessão pra outros
> agentes): (1) o prompt passa a dizer "ignore o campo score_fit (será descartado)" em vez de
> pedir um valor neutro; (2) **guarda dura no código**, não só no texto — `qualifyWithLlm` agora
> força `scoreFit = null` sempre que `fitCriteria.length === 0`, independente do que o LLM
> devolver, mesma disciplina já usada no fallback por palavra-chave.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO, usuário real
> `admxyz`/sessão JWT real injetada no navegador): lead de teste criado via `POST /api/crm/leads`
> real (mensagem "Quero uma picape 4x4 usada, tenho até 90 mil pra dar de entrada") →
> qualificação real via LLM (Groq) confirmada por SQL: `tag_sonho="Financiamento"`,
> `score_prontidao=80`, **`score_fit=NULL`** (antes do fix: `50`) · ficha aberta no navegador
> real confirmou os 2 tiles separados: "INTENÇÃO 80%" / "FIT —" — bate exato com o esperado pelo
> roteiro · nenhuma ocorrência de "IPVE" em lugar nenhum da página (`document.body.innerText`
> completo inspecionado) · **item 6**: `GET .../next-best-action` retornou `enabled:true`
> (herdado do padrão do segmento "Venda de Carros", sem override no tenant) com
> `suggestion:null` — card renderizou "Nenhuma sugestão gerada ainda" (nunca fabrica); clique em
> "Atualizar sugestão" gerou uma sugestão real e coerente via LLM ("Envie imediatamente um
> WhatsApp... com três sugestões de picapes 4x4... e solicite um horário para a primeira
> simulação de financiamento"); clique em "Registrar como Atividade" abriu o formulário de Nova
> Atividade com o `<textarea>` já preenchido com o texto EXATO da sugestão (confirmado via
> `textarea.value`, não só visualmente) · **item 7**: inserido 1 agendamento real via SQL direto
> em `public.agendamentos` (status `agendado`, corretor real, observação) — impossível testar a
> CRIAÇÃO via UI real porque `AgendarVisitaModal` exige OAuth real do Google Calendar
> (`google_calendar_authorized`/`has_google_token`), que não pode ser simulado nesta sessão;
> reaberta a ficha → "HISTÓRICO DE VISITAS" renderizou corretamente o agendamento existente
> (badge "AGENDADO", data/hora formatada em `America/Recife`, nome do corretor, observação) —
> confirma que `AgendamentosLead.tsx` (componente puramente de leitura) funciona.
>
> Limpeza: lead de teste + agendamento de teste removidos (`leads_staging`/`leads_kanban`/
> `agendamentos`, `count(*)=0` confirmado nas 3 tabelas). `npx tsc --noEmit`: 0 erros.
>
> **Pendência real, não atacada nesta rodada:** testar a CRIAÇÃO de agendamento via
> `AgendarVisitaModal` com OAuth real do Google Calendar exige consentimento externo do usuário
> — fora do que esta sessão consegue simular; se o usuário quiser essa confirmação, precisa ser
> feito manualmente por ele ou numa sessão com credencial OAuth real já conectada.

> **Atualizado em:** 2026-08-23 (continuação) — **Roteiro de testes (item 1.2, passos 4/4b):
> fix real — `executeMove` não propagava `valor_venda`/`valor_venda_estimado` pro state da
> ficha aberta, causando re-prompt indevido do modal "Estimativa de Valor" ao mover um lead
> por 2 etapas que exigem estimativa na mesma sessão.** Testado ao vivo com dado real, tenant
> CRM SOZINHO (segmento Venda de Carros).
>
> **Contexto:** usuário pediu pra testar o item "mover lead pra coluna GANHO... deve disparar
> `refreshNextBestAction` em segundo plano" + o item novo "4b — Valor Estimado" (interceptar
> com modal âmbar, não perguntar de novo se já tem estimativa). Perguntou também o que precisa
> configurar pra ativar os agentes — resposta: `next_best_action` já estava ativo (herdado do
> segmento "Venda de Carros", sem override no tenant) — só faltava uma chave de LLM configurada
> pro tenant (nunca teve nenhuma linha em `campanhasmarketingdigital."Settings"`).
>
> **Bug real encontrado durante o próprio teste (não hipotético):** `src/app/crm/kanban/
> page.tsx`, `executeMove()` — o `setLeads` (state do board) já mesclava corretamente
> `valor_venda`/`valor_venda_estimado` no lead movido, mas o `setSelectedLead` (state da FICHA
> ABERTA, é o que `requestMove()` lê pra decidir se intercepta) só atualizava `coluna_nome`,
> nunca os valores. Resultado: dentro da MESMA sessão de modal, mover um lead pra uma 1ª coluna
> que exige estimativa (preenche corretamente) e depois pra uma 2ª coluna que também exige
> voltava a interceptar — o `lead.valor_venda_estimado` que `requestMove` lia ainda estava
> `null`/`undefined` no `selectedLead` stale, mesmo já persistido no servidor. O 1º teste desta
> mesma rodada (2 leads diferentes, com reload de página no meio) tinha mascarado o bug —
> só apareceu ao reproduzir a sequência completa sem reload, exatamente como um atendente real
> usaria (mover várias vezes seguidas na mesma ficha aberta).
>
> **Corrigido:** `setSelectedLead` agora recebe o mesmo spread condicional de `valorVenda`/
> `valorEstimado` que `setLeads` já tinha — 1 linha. `npx tsc --noEmit`: 0 erros.
>
> **Testado ao vivo, ponta a ponta, reproduzindo a sequência exata do bug antes/depois do fix**
> (2 leads de teste dedicados, tenant CRM SOZINHO): coluna "Em Análise" marcada com "Exige
> valor estimado" (via UI real, `/crm/config/kanban`) · lead sem estimativa movido pra lá →
> intercepta com modal âmbar "Estimativa de Valor 💰" (`bg-amber-500/10 text-amber-500`,
> confirmado via `getComputedStyle`) · **cancelar** → mantém na coluna original, sem gravar
> nada (confirmado via SQL) · **confirmar** com R$45.000,00 → move + persiste corretamente ·
> 2ª coluna ("Entendimento da Dor") também marcada — mover o MESMO lead pra lá, ainda na mesma
> sessão de modal → **antes do fix: interceptava de novo (bug reproduzido)** · **depois do
> fix: não interceptou, seguiu direto** (retestado do zero com um 2º lead, resetado e refeito
> a sequência completa sem reload) · card do Kanban confirmado com badge âmbar "~R$X est."
> nunca no mesmo tile do badge verde de valor real · lead levado até "Fechamento" (GANHO) →
> modal verde "Negócio Fechado 🎉" (distinto do âmbar), preenchido R$58.000,00 → ficha mostra
> "VALOR FECHADO (REAL) R$ 58.000,00" (verde) e "VALOR POTENCIAL (ESTIMADO) R$ 60.000,00"
> (âmbar) lado a lado, nunca confundidos.
>
> **`next_best_action` — disparo em segundo plano confirmado, com 1 achado real no caminho:**
> a chave/modelo Groq já configurados globalmente na plataforma (`llama-3.3-70b-versatile`)
> foram descontinuados pelo provider — confirmado via `GET https://api.groq.com/openai/v1/
> models` (não está mais na lista) e via chamada direta (404 `model_not_found`). Trocado pro
> modelo já cadastrado no catálogo `LlmModel` deste projeto, `openai/gpt-oss-120b` (mesmo
> provider/chave, testado e funcionando via curl direto antes de aplicar). Configurada 1 linha
> nova em `campanhasmarketingdigital."Settings"` pro tenant CRM SOZINHO (nunca tinha nenhuma —
> por isso qualquer agente com LLM estava silenciosamente inoperante nesse tenant até agora,
> "Não foi possível gerar a sugestão agora." sem detalhe do erro real pro usuário, por design
> de segurança da rota). **Deixado configurado de propósito** (não é resíduo de teste — é uma
> lacuna real de config do tenant, corrigida) para os próximos itens do roteiro que dependem de
> LLM (`reactivation`, `score_recalibration`) já funcionarem sem precisar repetir esse setup.
> Confirmado end-to-end: `refreshNextBestAction` disparado a cada move (fire-and-forget, nunca
> bloqueou a resposta do move) e, com o modelo corrigido, gerou sugestão real e coerente
> ("Envie imediatamente uma proposta por e-mail com os modelos de sedãs usados dentro do limite
> de R$ 60 mil...", citando o contexto real do lead), persistida em `crm_agent_actions`
> (`type='INFORMATIVE'`, `status='NOTIFIED'`).
>
> Limpeza: os 2 leads de teste removidos (cascata confirmada — `crm_agent_actions`/
> `atividades_lead`/`leads_kanban` zerados), colunas "Em Análise"/"Entendimento da Dor"
> revertidas pra `requer_valor_estimado=false` (config só de teste, não pedida como permanente).

> **Atualizado em:** 2026-08-23 — **Concluída a Implementação da Documentação Viva & Manual Operacional no Browser (Padrão Docsify v4)**.
> Criada a estrutura completa em `docs/` (`index.html`, `_sidebar.md`, 20 capítulos organizados nos 3 Pilares e ADRs), o script `npm run docs` no `package.json`, a rota interna em `/admin/documentacao` e as diretrizes obrigatórias de manutenção contínua da documentação em `CLAUDE.md` e `AGENTS.md`.

> **Atualizado em:** 2026-08-16 (continuação 5) — **`/crm/leads`: adicionados os mesmos
> filtros de período (7/30/90/Personalizado/Histórico) e foto do responsável já existentes
> no dashboard `/crm` e no Kanban.** Pedido direto do usuário em 2 partes na mesma rodada:
> "na pagina crm/leads exibir também a foto do dono do lead" e, em seguida, "na pagina
> crm/leads deverá funcionar os mesmos filtros de datas e intervalos como foram implementados
> em dashboard".
>
> **Foto do responsável** — `src/app/crm/leads/page.tsx` ganhou `OwnerAvatar` (mesmo padrão
> foto→iniciais→ícone genérico já usado no card do Kanban), nova coluna "Responsável" na
> tabela; `GET /api/crm/leads` já retornava `corretor_atribuido_id`/`corretor_nome`/
> `corretor_tem_foto` desde uma sessão anterior (2026-08-14), só a UI desta página nunca
> consumia.
>
> **Filtro de período** — `src/lib/crm/resolveTimeframeRange.ts` (já existente, usado por
> `analytics/performance` e `analytics/performance-vendedores`) agora também resolve o filtro
> de `GET /api/crm/leads`: novo `timeframeParam` **opcional** — só filtra por data quando o
> caller manda `?timeframe=`, preservando 100% o comportamento de `/crm/kanban` (que chama
> este mesmo endpoint sem nenhum parâmetro, esperando todos os leads sem corte de data).
> `crm/leads/page.tsx` ganhou o mesmo seletor visual do dashboard (7 Dias/30 Dias/90 Dias/
> Personalizado com `DateInputPtBR` De/Até/Histórico).
>
> **Testado ao vivo, ponta a ponta, dado real** (tenant Imovtec/CRM SOZINHO): via API — sem
> `timeframe` → todos os leads (regressão do Kanban confirmada intacta) · `timeframe=30` →
> os 2 leads reais · range vazio (`custom`, 01/07/2026–22/07/2026) → 0 leads · sessão real no
> navegador: clique em "Personalizado" + digitar o range vazio → "Nenhum lead encontrado" ·
> clique em "30 Dias" → os 2 leads reais reapareceram, cada um com a foto real do responsável
> carregando (`naturalWidth` 620/554, `complete:true`) na nova coluna "Responsável". `npx tsc
> --noEmit`: 0 erros. Arquivos temporários de teste removidos.
>
> **Atualizado em:** 2026-08-16 (continuação 4) — **Kanban do CRM (`/crm/kanban`): badge
> "Ganho"/"Perda" nunca existiu no board em si — só na tela de configuração.** Achado
> executando o item 1.2 do roteiro de testes ("confirme que ela mostra um badge 'GANHO'/
> 'PERDA' ao lado do título da coluna") com print real de uma coluna "FECHAMENTO" (etapa
> `is_ganho=true`) sem nenhum badge visível, só o título e a contagem.
>
> **Causa:** a sessão de 2026-08-07 que introduziu `is_ganho`/`is_perda` implementou o badge
> só em `/crm/config/kanban` (a tela de configuração das etapas) — o board real
> (`/crm/kanban`) sempre usou esses 2 campos apenas pra decidir a lógica de mover lead
> (interceptar com modal de valor), nunca pra desenhar nada no cabeçalho da coluna. O roteiro
> de testes (item 1.2, seção do board) sempre presumiu que o badge estava lá; nunca esteve.
>
> **Corrigido:** `src/app/crm/kanban/page.tsx` — mesmo par de badges (`bg-emerald-500/15` /
> `bg-red-500/15`, pill arredondado, texto "Ganho"/"Perda") já usado em `/crm/config/kanban`,
> replicado no cabeçalho de cada coluna do board, entre o título e o contador — a API
> (`GET /api/crm/kanban/colunas`, `SELECT *`) já retornava `is_ganho`/`is_perda`, só faltava
> o front-end do board renderizar.
>
> **Testado ao vivo, sessão real no navegador, mesmo tenant/lead do print do usuário:**
> confirmado via DOM que a coluna "Fechamento" (`is_ganho=true`) mostra "Ganho" e "Perdido"
> (`is_perda=true`) mostra "Perda", enquanto as demais colunas (Lead Captado, Em Análise,
> etc.) continuam sem nenhum badge — e visualmente via screenshot, batendo com o estilo já
> usado na tela de config. `npx tsc --noEmit`: 0 erros. Nenhum dado de teste criado, token
> JWT temporário apagado do disco.

> **Atualizado em:** 2026-08-16 (continuação 3) — **Dashboard do CRM (`/crm`): 2 filtros de
> período ("Personalizado" e "Histórico") nunca funcionaram, desde que foram adicionados na
> UI — quebrados silenciosamente. Achado + corrigido no mesmo pedido do usuário que trouxe o
> card "Valor Estimado Total" e o Top 10.**
>
> **Bug real, reportado com print:** usuário selecionou "Personalizado", preencheu De/Até
> pra um período sem nenhum lead (01/07 a 22/07/2026) — os cards totalizadores continuaram
> mostrando os totais da consulta anterior (2 leads, R$130.000,00), como se o filtro não
> tivesse tido efeito nenhum. Investigação: `GET /api/crm/analytics/performance` e
> `GET /api/crm/analytics/performance-vendedores` sempre interpolaram `timeframe` direto num
> `INTERVAL '${timeframe} days'` — funciona pros botões numéricos (7/30/90), mas quando
> `timeframe='custom'` ou `'all'` (os valores reais que a UI manda pra "Personalizado" e
> "Histórico"), vira `INTERVAL 'custom days'`/`INTERVAL 'all days'` — erro de sintaxe real do
> Postgres, confirmado via curl direto (`invalid input syntax for type interval`), 500 em
> ambos endpoints pras 2 opções. O front-end nunca tratava esse erro (só `console.error`),
> então a tela ficava com os totais da ÚLTIMA consulta bem-sucedida, sem nenhum aviso visível
> — exatamente o sintoma do print. **Nunca funcionou desde que essas 2 opções foram
> adicionadas na UI** (não é regressão desta sessão).
>
> **Corrigido:** `src/lib/crm/resolveTimeframeRange.ts` (novo, compartilhado pelos 2
> endpoints) — resolve `timeframe`/`startDate`/`endDate` em bounds `{from, to}` reais
> (sentinelas de época 1970/9999 pra "sem limite", nunca `null` — todo caller sempre faz bind
> de exatamente 2 parâmetros de data, sem montar SQL condicional nem interpolar texto de
> usuário). `custom` usa De/Até de verdade (Até inclui o dia inteiro, mesmo idioma de
> `expandEndOfDay` já usado no projeto); `all` remove qualquer limite; numérico mantém o
> comportamento de sempre; entrada inválida/incompleta cai no default seguro de 30 dias em vez
> de quebrar. As 5 queries que antes interpolavam `${timeframe} days` (3 em `performance/
> route.ts`, 2 em `performance-vendedores/route.ts`) passaram a usar `$2::timestamptz`/
> `$3::timestamptz` parametrizados — corrige o crash E fecha de brinde um vetor de SQL
> injection que existia nesse ponto (nenhuma validação prévia de `timeframe` antes de
> interpolar). `pipelineQuery` (Pipeline Aberto) ficou intocada de propósito — é sempre
> snapshot de agora, nunca filtrada por período, comportamento já documentado.
>
> **Testado via API e ao vivo no navegador, ponta a ponta, reproduzindo a sequência exata do
> print do usuário:** `custom` com o período vazio (01/07–22/07) → antes 500, depois
> `leads_captados:0, valor_estimado_total:0, cycle_heatmap:[]` (`pipeline_leads` continua 2,
> corretamente — é snapshot) · `custom` cobrindo os 2 leads reais (15/08–16/08) →
> `leads_captados:2, valor_estimado_total:130000` · `all` (Histórico, também quebrado antes) →
> mesmos 2 leads, agora funcionando · `performance-vendedores` custom vazio →
> `vendedores:[], motivos_perda:[]` · **sessão real no navegador**, mesmo fluxo do usuário
> (clicar "Personalizado" → digitar 01/07/2026 e 22/07/2026 → clicar a seta de aplicar) →
> "Leads Captados" e "Valor Estimado Total" zeraram corretamente na tela, "Gargalos & Ciclos"
> mudou pro estado vazio "Aguardando movimentações de Kanban...". `npx tsc --noEmit`: 0 erros.
> Nenhum dado de teste criado (bug reproduzido só com dado real já existente + variação de
> parâmetro de URL), tokens JWT temporários apagados do disco.

> **Atualizado em:** 2026-08-16 — **Kanban do CRM: dono do lead sempre é quem criou
> manualmente (nunca mais o motor de distribuição) + exclusão híbrida de lead (permanente sem
> atividade, reversível com atividade) + achado real corrigido no caminho (bug de UTF-8 numa
> constraint que impedia digitar acento no formulário de segmento).** Pedido do usuário:
> "o dono de cada lead é o user que se logou na aplicação e, obrigatoriamente, o user que
> acessou a pagina crm/kanban e gravou o lead" — regra de negócio nova, não uma correção de
> bug (o card já exibia foto/nome do responsável desde uma sessão anterior; o problema real
> era que "+ Novo Lead" nunca fixava um dono, deixando o `DistributionEngine` (geografia/
> round-robin/plantonista) decidir, às vezes sem achar ninguém).
>
> **Implementado** (`src/app/api/crm/leads/route.ts`, bloco de atribuição do `POST`): quando
> `utm_source === 'CRM Manual'` (o valor que `NovoLeadModal.tsx` sempre manda) **e** existe
> sessão autenticada, o dono é fixado direto no usuário logado — `corretor_atribuido_id =
> sessionUser.userId`, `atribuicao_expira_em = NULL` (mesma semântica de "já aceito" usada em
> outros caminhos de auto-aceite), log em `leads_staging_atribuicoes`, sem mover Kanban nem
> tocar gamificação (`corretor_scores`). Qualquer outro caminho de criação (webhook Meta/
> Google, WhatsApp orgânico, mecanismo de CTA) continua 100% intocado, passando pelo
> `DistributionEngine` como sempre.
>
> **Exclusão de lead — feature nova, pedida em seguida ("deve existir um botão para exclusão
> de leads").** Regra híbrida decidida pelo usuário: lead **sem nenhuma atividade registrada**
> é excluído **permanentemente** (a tabela já tem `ON DELETE CASCADE` pra tudo relacionado —
> `atividades_lead`, `consentimentos_lead`, `crm_agent_actions`, `leads_kanban_ciclos`,
> `leads_kanban`, `leads_staging_atribuicoes`, `marketing_eventos`); lead **com** atividade é
> excluído de forma **reversível** (soft-delete) com botão de restaurar e filtro pra ver
> excluídos. Botão só na Ficha do Lead (opção escolhida pelo usuário — nunca no card do
> Kanban, pra não ter exclusão por clique acidental).
>
> `prisma/migration-2026-08-14-leads-staging-deleted-at.sql` (aplicada) —
> `leads_staging.deleted_at TIMESTAMPTZ` + índice `(tenant_id, deleted_at)`.
> `src/app/api/crm/leads/[leadUuid]/route.ts` (novo) — `DELETE` conta atividades ativas
> (`atividades_lead WHERE deleted_at IS NULL`); zero → `DELETE FROM leads_staging` real
> (cascata cobre o resto); ≥1 → `UPDATE ... SET deleted_at = NOW()`, reversível.
> `PATCH {action:'restore'}` limpa `deleted_at`. Mesmo padrão de auth
> (`verifyTokenNode`/`resolveLeadScope`) já usado em `/api/crm/pendencia/resgate` e
> `next-best-action` — Master bypassa tenant, tenant comum nunca sai do próprio escopo.
> `GET /api/crm/leads` ganhou `?includeDeleted=1` (default exclui).
> `src/app/crm/kanban/page.tsx` — botão "Mostrar leads excluídos" no cabeçalho (ícone lixeira,
> destaca quando ativo); card soft-deletado fica opaco/grayscale com badge vermelha
> "Excluído" e para de ser arrastável; Ficha do lead ganha rodapé com "Excluir"/"Restaurar" à
> esquerda (os botões de mover etapa somem quando o lead está excluído).
>
> **Achado incidental, corrigido no processo:** ao investigar por que um lead de teste
> ("Frank Aguiar", criado pelo próprio usuário testando) parecia sem dono/foto numa print,
> confirmei ao vivo (sessão real no navegador, inspeção direta do DOM — não só leitura de
> código) que na verdade JÁ estava funcionando: a foto carregou (554×554px reais) e a legenda
> do primeiro nome estava presente/visível — só em fonte pequena (9px), fácil de não notar
> numa print. Não era bug, era um estado de página desatualizado no momento da captura.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant CRM SOZINHO): via API — lead
> criado com `utm_source:'CRM Manual'` sem nenhuma atividade → `DELETE` retornou
> `mode:'hard'`, `count(*)=0` confirmado depois · lead criado + 1 atividade real inserida →
> `DELETE` retornou `mode:'soft'`, `deleted_at` gravado, sumiu do `GET` default, apareceu com
> `?includeDeleted=1` · `PATCH restore` limpou `deleted_at`, lead reapareceu no `GET` default ·
> restaurar de novo → 409 ("não está excluído") · excluir de novo em cima de já-excluído →
> 409 ("já está excluído") · **sessão real no navegador** (JWT+cookie+localStorage
> injetados, mesmo playbook já documentado neste arquivo): toggle "Mostrar leads excluídos"
> revelou o card com badge vermelha; Ficha do lead excluído mostrou o botão "Restaurar Lead"
> (e nenhum botão de mover etapa); clique real no botão restaurou o lead e o badge sumiu do
> card sem precisar de reload manual. `npx tsc --noEmit`: 0 erros (exit code 0, saída vazia).
> Todo dado de teste removido (2 leads + atividade + cascata, `count(*)=0` confirmado em
> `leads_staging`/`atividades_lead`/`leads_kanban`), tokens JWT temporários apagados do disco.

> **Atualizado em:** 2026-08-14 (continuação 2) — **Desacopla "Perfil de Interesse" de
> "Vínculo Exato" (segmento sem tabela de inventário real ganha formulário mesmo assim) +
> campo "Demanda do Cliente" (texto livre, sempre disponível) + Master ganha "Sugerir com
> IA" pros campos do formulário.** Continuação direta da entrada anterior — usuário testou o
> resultado (tenant Carros/CRM SOZINHO) e apontou o cenário clássico de um cliente real da
> plataforma: segmento sem NENHUMA tabela de inventário digitalizada (nem existe `veiculos`
> no banco). Nesse caso a tela "Perfil de Interesse" mostrava "Nenhum campo configurado no
> Segment Builder" — zero valor prático, porque `target_table`/`target_fk_column`/
> `target_name_column`/`target_label` eram `NOT NULL` na MESMA linha que carrega
> `form_schema_json`, então não dava nem pra salvar perguntas de interesse sem uma tabela
> real. Confirmado também que `NovoLeadModal.tsx` nunca teve nenhum campo de texto livre —
> o payload nunca mandava `mensagem`, então `ConciergeService.qualifyLead` sempre recebia
> string vazia nesse fluxo, mesmo com Perfil de Interesse preenchido.
>
> **Decisão do usuário, em 2 partes:** (1) o campo de texto livre não devia se chamar
> "Observação" — vira **"Demanda do Cliente"** (enquadra como o pedido do cliente, não uma
> nota interna do atendente); (2) antes de decidir como alimentar os campos do formulário,
> perguntou explicitamente se dava pra ter uma **IA sugerindo (não decidindo)** perguntas-
> chave por segmento, com o usuário podendo adicionar as próprias por cima — mesmo padrão já
> comprovado em Campanhas (FASE 18.3, Ângulos & Demanda: LLM sugere, Master revisa/edita,
> salva só com confirmação humana). Confirmado que o precedente já existe e funciona;
> replicado o mesmo desenho (POST=sugere sem salvar, PUT=salva) pro CRM.
>
> **Implementado:**
> 1. `prisma/migration-2026-08-14-crm-ativo-config-nullable-target.sql` — `target_table`/
>    `target_fk_column`/`target_name_column`/`target_label` viram nullable em
>    `crm_ativo_config_segmento`/`_tenant`. Os 2 conceitos (Vínculo Exato × Perfil de
>    Interesse) deixam de estar acoplados pela constraint do banco.
> 2. `resolveAtivoConfig.ts` — `AtivoConfig` os 4 campos de Vínculo Exato viram
>    `string | null`; só valida/exige o trio (table/fk/name) quando `target_table` está
>    presente — sem tabela, retorna a config normalmente com `formSchemaJson` intacto.
> 3. `EnrichmentService.enrichLead` — bug real que só apareceria DEPOIS da migração acima,
>    pego e corrigido na mesma rodada: a validação de `targetTable`/`targetNameColumn`
>    rodava ANTES do `if (!sourceId)` (caminho de Perfil de Interesse) — com `target_table`
>    nulo, isso quebraria até o caminho genérico, que nunca deveria depender de tabela
>    nenhuma. Reordenado: `enrichGenericLead` roda primeiro e incondicional; a validação de
>    tabela só entra no branch de Vínculo Exato (`sourceId` presente).
>    `reEnrichAllLeads` ganhou o mesmo guard (sem `targetFkColumn`, não tenta reprocessar
>    leads por vínculo exato — só isso, sem tentar reprocessar Perfil de Interesse em lote,
>    fora de escopo desta rodada).
> 4. `/api/crm/ativo/config` — `available` passa a refletir `!!config.targetTable`
>    especificamente (não mais `!!config`) — Perfil de Interesse funciona mesmo com
>    `available:false`. `/api/crm/ativo/search` idem, degrada pra `items:[]` sem tabela.
> 5. Rotas de escrita (`PUT /admin/master/segments/[id]/ativo-config` e
>    `POST /api/crm/config/segmentos`) — validação "tudo ou nada": ou os 3 campos de
>    identificação vêm juntos (Vínculo Exato configurado), ou nenhum deles (só formulário).
>    Nunca aceita meio-configurado.
> 6. `NovoLeadModal.tsx` — novo campo "Demanda do Cliente" (textarea, sempre visível no
>    Passo 2, independente da aba Vínculo Exato/Perfil de Interesse selecionada) → vai pro
>    payload como `mensagem` — campo que `POST /api/crm/leads` já lia
>    (`data.mensagem || ''`) mas que nenhum caller do modal jamais preenchia.
> 7. **"Sugerir com IA" pro formulário (novo, mesmo padrão de Ângulos & Demanda):**
>    `prisma/migration-2026-08-14-crm-ativo-form-schema-suggestion-prompt.sql` (prompt
>    global `crm_ativo_form_schema_suggestion`) + `src/lib/crm/
>    ativoFormSchemaSuggestionService.ts` (`suggestAtivoFormSchema`, mesmo formato de
>    `segmentAngleSuggestionService.ts`) + `POST /api/admin/master/segments/[id]/
>    ativo-config` (novo, ao lado do GET/PUT já existentes) + botão "Sugerir com IA" no
>    `SegmentAtivoConfigModal.tsx` — só popula a lista de campos, nunca salva sozinho; Master
>    revisa/edita/remove antes de clicar "Salvar" (que continua o único ato de confirmação).
>    UI dos 2 modais (Master + tenant) ganhou aviso claro de que Vínculo Exato é opcional
>    (grupo tudo-ou-nada) e texto explicando que o formulário funciona independente dele.
>
> **Testado ao vivo, ponta a ponta, contra dado real** (via API real, JWTs reais dos 2
> tenants envolvidos — CRM SOZINHO/Venda de Carros e Imobiliaria XYZ): `POST` de sugestão
> real pro segmento Venda de Carros (sem nenhum prompt escrito à mão, só nome+descrição do
> segmento) devolveu 7 campos genuinamente relevantes (`marca_desejada`, `faixa_preco`
> obrigatório, `ano_minimo`, `tipo_veiculo`, `tipo_cambio`, `comentario`, `orcamento`
> obrigatório) · `PUT` salvando só 2 desses campos, sem nenhum `target_table` → persistiu
> corretamente (`target_table:null`) · `GET` efetivo do tenant refletiu `available:false` +
> os 2 campos herdados do segmento · `GET .../search` sem tabela → `items:[]`, sem 500 ·
> `PUT` com `target_table` preenchido mas `target_label`/`target_name_column` vazios → 400
> com a mensagem certa (tudo-ou-nada funcionando) · **lead real criado via API simulando o
> fluxo novo do modal** (Demanda: "Quero um SUV automático até 90 mil, meu carro quebrou" +
> raw_json com 2 campos) → `tag_sonho:"🔄 Troca de Veículo"`, `resumo_ia` coerente com o
> texto da Demanda, `score_prontidao:80`, `enriquecimento_cache` com os 2 badges do Perfil
> de Interesse corretos — confirma a Demanda alimentando a IA de verdade, e o Perfil de
> Interesse funcionando 100% sem nenhuma tabela de veículo existir. **Regressão confirmada
> intacta** (Imobiliário, Imobiliaria XYZ): config do Master com `target_table:"imoveis"` +
> badges + formulário, tudo idêntico a antes · busca real de Vínculo Exato (`?q=Imbiribeira`)
> retornou os 9 imóveis reais esperados · lead criado com `imovel_id:31` real → 9 badges
> completos (estado/cidade/endereço/código/dorms/suítes/vagas/área/valor), idêntico ao
> comportamento documentado em sessões anteriores. `npx tsc --noEmit`: 0 erros (mesma
> baseline zerada desde 2026-07-31, nenhum erro novo em nenhum arquivo tocado/criado).
>
> **Limpeza:** os 2 leads de teste removidos (`DELETE FROM leads_staging`, cascata via FK
> `ON DELETE CASCADE` confirmada em `leads_kanban`/`leads_kanban_ciclos`/`atividades_lead`/
> `marketing_eventos`/`crm_agent_actions`/`consentimentos_lead`/`leads_staging_atribuicoes` —
> `count(*)=0` em todas) · a config de demonstração salva no segmento Venda de Carros durante
> o teste (que tinha um artefato de encoding real do meu próprio `curl -d` inline com acento,
> mesmo erro operacional já documentado dezenas de vezes neste arquivo — nunca do código)
> removida, segmento restaurado ao estado real honesto (0 config, aguardando o Master
> configurar de verdade via a UI, agora com "Sugerir com IA" disponível) · tokens JWT
> temporários apagados do disco.

> **Atualizado em:** 2026-08-14 (continuação) — **"Vínculo Exato" do Novo Lead (e a config de
> enriquecimento que o alimenta) para de ser hardcoded pra Imobiliário — vira segmento
> (padrão curado pelo Master) + tenant (override), igual ao padrão já usado em Agentes de
> Aceleração/Critérios de Fit/Qualificação.** Nasceu de um print do usuário: tenant "CRM
> SOZINHO" (segmento Venda de Carros) mostrando "Pesquisar Imóvel" no modal de Novo Lead.
>
> **Achado real, mais fundo do que o print sugeria:** a config inteira (`crm_segmentos_config`,
> 1 linha em todo o banco, `domain_id=1` cravado em 3 call sites — `NovoLeadModal.tsx`,
> `/api/crm/leads`, `/api/public/imoveis/prospects`) nunca teve auth real
> (`unifiedPermissionMiddleware` fail-open, rota nunca registrada em
> `route_permissions_config` — mesma classe do achado de `/api/admin/usuarios` mais cedo no
> dia) **e** `target_table`/`target_fk_column` eram interpolados direto em SQL sem validação
> (`EnrichmentService.enrichLead`) — SQL injection sem autenticação, ativa até esta correção.
> Achado incidental: `permissoes` do JWT (login) nunca mapeava a ação literal `'write'` (13
> linhas de `permissions` na plataforma usam esse nome) pra `'UPDATE'`, caindo no `ELSE` e
> ficando minúscula — nunca batia contra `PERMISSION_LEVELS` (maiúsculo). Corrigido de brinde.
>
> **Implementado:**
> - `crm_ativo_config_segmento` (padrão por segmento, curado pelo Master) +
>   `crm_ativo_config_tenant` (override por tenant, ganha do padrão) substituem por completo
>   a antiga `crm_segmentos_config` (dropada). Campos novos: `target_name_column` (qual coluna
>   mostra o "nome" na busca) + `target_label` (como chamar o item em PT-BR — "Imóvel",
>   "Veículo"...). `src/lib/crm/resolveAtivoConfig.ts` — cascata tenant→segmento→`null`
>   (nunca inventa), valida identificador (`IDENT_RE`) antes de qualquer SQL.
> - `EnrichmentService` reescrito — `enrichLead(leadUuid, tenantId, sourceId)` em vez de
>   `domainId` literal; revalida identificador antes de interpolar (defesa em profundidade).
> - `/api/crm/config/segmentos` reescrita — `requireApiPermission('crm-segment-builder', ...)`
>   real; POST só escreve no override do PRÓPRIO tenant (nunca mais um tenant sobrescrevendo a
>   config global de outro, que era o comportamento antes); novo DELETE restaura o padrão do
>   segmento. Novo `GET/PUT /api/admin/master/segments/[id]/ativo-config` +
>   `SegmentAtivoConfigModal.tsx` (botão "Config do Ativo") — onde o Master cura o padrão por
>   segmento (ex.: cadastrar `veiculos` pro segmento Carros, quando existir de verdade).
> - **Endpoints leves, deliberadamente SEM a permissão de editar config** —
>   `GET /api/crm/ativo/config` (available+label+formSchema) e
>   `GET /api/crm/ativo/search` — só sessão válida do tenant, porque um Atendente comum
>   criando um lead não tem (nem deveria precisar de) permissão de editar o Segment Builder.
>   Substituem `/api/crm/imoveis/search` (deletada, hardcoded a imóvel).
> - `NovoLeadModal.tsx` — aba "Vínculo Exato" só aparece quando o segmento/tenant tem config;
>   texto/placeholder/resultado da busca vêm do `target_label` resolvido; sem config
>   nenhuma (caso do Carros hoje), vai direto pra "Perfil de Interesse", sem busca quebrada.
>
> **Testado ao vivo, ponta a ponta, com dado real** (múltiplos JWTs reais, 4 tenants
> diferentes): regressão Imobiliário (Marketing Digital + Imobiliaria XYZ) — busca genérica
> encontrou imóveis reais por título e por ID; lead criado com vínculo exato real (imóvel 31)
> enriqueceu corretamente com os 9 badges reais (estado/cidade/endereço/dorms/suítes/vagas/
> área/valor) via o novo `EnrichmentService` — bate exato com o layout antigo migrado · Carros
> (CRM SOZINHO) — `available:false` honesto antes de qualquer config; Master configurou um
> padrão de teste (`tipos_imovel` como stand-in, única tabela real disponível pra provar
> genericidade sem fabricar dado de veículo) → `available:true` refletiu na hora; override do
> tenant confirmado ganhando do padrão do segmento; DELETE confirmado restaurando a herança ·
> gates de permissão testados nos 2 sentidos (com/sem `crm-segment-builder`: rota de edição
> 403 sem a permissão, endpoint leve funciona igual pros dois) · **confirmado visualmente no
> navegador**, sessão real do tenant Carros: modal "Novo Lead" → Passo 2 mostra só "Perfil de
> Interesse", zero menção a imóvel — exatamente o bug do print original, fechado. `npx tsc
> --noEmit`: 0 erros. Todo dado/config de teste removido (config de teste do Carros deletada,
> lead de teste na XYZ removido, tokens temporários apagados) — Carros de volta ao estado real
> honesto (nenhuma config ainda, aguardando o Master cadastrar o ativo real do segmento).
>
> **Pendência real, não é bug — decisão de negócio do usuário/Master:** nenhum segmento além
> de Imobiliário tem hoje uma tabela de ativo real no banco (não existe `veiculos` nem
> equivalente pra Venda de Carros). A mecânica está pronta; falta o Master de fato cadastrar
> a tabela quando ela existir, em `/admin/master/segments` → botão "Config do Ativo".

> **Atualizado em:** 2026-08-14 — **Foto do usuário migrada pra S3/MinIO (escopo:
> criar/editar/listar em `admin/usuarios`) + achado real de vulnerabilidade corrigido +
> avatar do responsável nos cards do Kanban do CRM.**
>
> **Migração pra S3/MinIO, pedido direto do usuário** ("fazer uso da mesma tecnologia de
> MinIO que já está sendo utilizada... como na inserção e edição das imagens dos imóveis"),
> escopo confirmado via `AskUserQuestion` ("Só admin/usuarios: criar, editar e listar") —
> login, cadastro público e anexo de e-mail continuam no `bytea` puro, fora de escopo por
> decisão explícita. `users` ganhou `storage_type`/`s3_key`/`url_cdn`; `createUser`/
> `updateUser` viraram dual-writer (S3 primeiro, fallback `bytea` — mesmo padrão de
> `imovel_imagens`); `generateUserPhotoS3Key()` em `s3-client.ts` (sem prefixo de tenant,
> diferente do de imóvel — `userId` já é globalmente único). Novo
> `GET /api/admin/usuarios/[id]/foto` — 302 pro S3/MinIO quando `storage_type='s3'`, streaming
> do `bytea` como fallback legado; lista/detalhe pararam de embutir base64, só `has_foto`.
>
> **Achado real durante a implementação, corrigido:** `deleteUser()` nunca limpava o objeto
> S3 da foto — confirmado ao vivo (linha do banco removida, objeto no MinIO continuava
> `200`). Corrigido com metadado lido antes da transação + `deleteFromS3` não-bloqueante
> depois do commit, mesmo padrão de `deleteImovelImagem`.
>
> **Achado real mais sério, investigando como autenticar corretamente o novo endpoint de
> foto (não hipotético — confirmado por SQL + teste ao vivo):** `GET /api/admin/usuarios`
> (lista) e `GET /api/admin/usuarios/[id]` (detalhe) sempre dependeram só de
> `unifiedPermissionMiddleware`, que é **fail-open pra qualquer rota sem entrada em
> `route_permissions_config`** (mesma classe de vazamento já corrigida antes em
> `/api/crm/clientes/search`) — confirmado que nenhuma rota da família `/api/admin/usuarios/*`
> jamais foi registrada nessa tabela, e que `src/middleware.ts` explicitamente exclui `/api/*`
> do seu próprio gate de sessão (`isProtectedRoute` só casa `/admin`/`/crm`). Ou seja: listar
> todos os usuários e ver o detalhe de qualquer um (sem senha, mas com e-mail/telefone/CPF/
> role) não exigia nenhuma autenticação real — bug pré-existente, não introduzido nesta
> sessão, só descoberto agora. **Corrigido:** `requireApiPermission(request, 'usuarios',
> 'READ')` adicionado às duas rotas (mesmo padrão já usado no PUT/DELETE dos mesmos
> arquivos). Testado ao vivo: sem a permissão `usuarios` no JWT → 403 nas duas; com ela → 200,
> sem regressão.
>
> **Endpoint de foto — gate deliberadamente mais leve que CRUD de usuário:** exigir
> `permissoes.usuarios` ali quebraria o próprio consumidor que motivou a pergunta seguinte do
> usuário (um Atendente comum vendo o avatar de um colega no Kanban, sem ter permissão de
> gestão de usuários) — corrigido com JWT verificado de verdade (`verifyToken`, não só
> formato) + mesmo tenant do usuário-alvo via `user_tenant_membership` (Master bypassa).
> Testado ao vivo: sem token → 401; tenant diferente → 403; mesmo tenant sem `permissoes.
> usuarios` → 302 (funciona, prova que o gate certo não é o de CRUD).
>
> **Avatar do responsável no Kanban do CRM** — usuário perguntou diretamente se a foto do
> usuário aparecia nos cards de `/crm/kanban`; confirmado que não (ícone genérico, sem
> nenhuma referência a `corretor_atribuido_id`). `GET /api/crm/leads` ganhou `LEFT JOIN
> users` (`corretor_atribuido_id`, `corretor_nome`, `corretor_tem_foto`); o ícone decorativo
> do cabeçalho do card virou o avatar real do responsável (foto via o endpoint acima →
> iniciais em caixa azul quando não tem foto → ícone genérico só quando ninguém está
> atribuído — 3 estados, cascata igual à já usada em outras telas do projeto).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital): usuário de
> teste com foto real (não hipotética — 1ª tentativa usou um PNG 1x1 corrompido feito à mão
> que o navegador rejeitou silenciosamente, `naturalWidth:0`; substituído por um PNG real do
> próprio repo, confirmado `1024x1024` carregando de verdade, inclusive numa aba nova sem
> cache) → avatar com foto real no card · usuário sem foto → iniciais "FA" em caixa azul ·
> screenshot real do navegador confirma os 2 estados lado a lado · `npx tsc --noEmit`: 0
> erros. Todo dado de teste (3 leads, 2 usuários, os objetos S3 correspondentes) removido —
> confirmado `count(*)=0` e os objetos no MinIO retornando `404`.

> **Atualizado em:** 2026-08-13 (continuação) — **Reversão de rumo completa: `/crm` deixa de
> pretender medir ROI/CAC/CPL — substituído por um dashboard 100% CRM-nativo — e ganha captura
> disciplinada de Valor ESTIMADO de negócio (Caminho 1, decisão final do usuário).** Esta
> entrada **substitui por completo** a entrada anterior (breakdown manual+sincronizado de
> custo, "Caminho 3") — o próprio usuário rejeitou aquela solução horas depois de aprová-la,
> com o argumento decisivo: mesmo um número de ROI **verificado e parcial** (só mídia paga
> digital sincronizada) é uma meia-verdade, porque nenhuma fonte disponível representa o custo
> comercial/marketing TOTAL de um negócio (rádio, jornal, revista, promoter, comissão etc.
> nunca são capturados de forma verificável nesta plataforma). Rotular qualquer fração disso
> de "ROI" empresta uma credibilidade que o número não tem.
>
> **Decisão fechada:** o CRM não mede mais custo/retorno. Mede o que ele sabe de verdade —
> leads, funil, velocidade, conversão, quem está performando — e adiciona **Valor ESTIMADO de
> negócio** (nunca confundido com custo nem com o valor REAL de fechamento) como sinal de
> priorização ("negócio grande merece atenção primeiro"), capturado de forma disciplinada.
>
> **Fase 0 — remoção completa.** `DROP TABLE marketing_campanhas_orcamento` (a "Central de
> Mídia" nunca teve uso real, 0 linhas em todo o banco). Revertidas as 2 colunas + índice
> (`segment_id`/`target_name_column`/`idx_crm_segmentos_config_segment`) que a entrada anterior
> tinha adicionado em `crm_segmentos_config` pro `project_roi` — ficaram órfãs sem esse
> consumidor. `system_features` id=72 ("Central de Mídias") desativada (`is_active=false`,
> soft-disable, mesmo padrão de sempre pra esconder item de sidebar sem apagar histórico).
> Deletados: `src/app/api/crm/marketing/orcamento/route.ts`,
> `src/components/crm/MarketingCampaignModal.tsx`, `src/app/crm/config/marketing/page.tsx`,
> e `hasCampanhasModule()` de `revenueAttributionService.ts` (só tinha esses 2 callers).
> `src/app/crm/page.tsx` perdeu o botão "Central de Mídia", os 5 KPI cards antigos e toda a
> seção "Nível 2" (toggle projectROI/campaignROI, modal de drill-down) — virou a base limpa
> pra reconstrução. **Confirmado sem tocar em nada real de Campanhas:** `getRevenueAttribution`/
> `hasCrmModule` (a Visão 4 REAL do módulo de Campanhas, `/admin/campanhas/dashboard`) nunca
> dependeu de `marketing_campanhas_orcamento` — dropar a tabela tem zero efeito ali.
>
> **Fase 1 — motor de KPIs CRM-nativos.** `roi/route.ts` renomeado pra
> `src/app/api/crm/analytics/performance/route.ts`, query nova sem nenhum custo: Leads
> Captados (`COUNT(*)` de `leads_staging` no período), Negócios Fechados (qtd + `SUM(valor_
> venda)` via `kanban_colunas.is_ganho=true`, já existia), **Negócios Perdidos** (qtd, novo,
> análogo via `is_perda=true` — item pedido explicitamente pelo usuário: "de forma análoga a
> negócios fechados, acho que também deve ser exibida uma análise de negócios perdidos"),
> Pipeline Aberto (`SUM(valor_venda_estimado)` dos leads fora de etapa terminal, depende da
> Fase 2), Taxa de Conversão/Perda, Ciclo Médio de Venda. `cycle_heatmap` (Gargalos & Ciclos)
> ficou intocado — já era 100% CRM-nativo.
>
> **Fase 2 — Valor Estimado, captura progressiva e disciplinada.** Pedido do usuário: "vamos
> ter que incluir, logo na entrada, o valor da venda... isso irá direcionar todos os esforços
> da empresa para priorizar o fechamento dos negócios mais rentáveis" — mas nunca confundido
> com o valor REAL (`valor_venda`, só existe depois do fechamento) nem com custo. Decisão via
> `AskUserQuestion`: captura **obrigatória só ao avançar pra uma etapa específica**,
> configurável por tenant (não um campo livre editável a qualquer momento). Migração
> (`prisma/migration-2026-08-13-crm-remove-cost-add-valor-estimado.sql`): `leads_staging.
> valor_venda_estimado NUMERIC(15,2)` (nullable, NULL = "ainda não sabemos", nunca 0 por
> padrão) + `kanban_colunas.requer_valor_estimado BOOLEAN DEFAULT false`. `kanban/colunas/
> route.ts` aceita o novo campo (mútua consideração com `is_ganho` — desabilitado quando a
> coluna já é etapa de Ganho, pedir estimativa ali é redundante). `kanban/move/route.ts`
> aceita `valor_venda_estimado` opcional, mesma disciplina do `valor_venda` (servidor nunca
> bloqueia duro — a barreira real é sempre no cliente). `/crm/config/kanban/page.tsx` ganhou o
> checkbox "Exige valor estimado ao entrar nesta etapa" na seção de config da coluna. `/crm/
> kanban/page.tsx` generalizou o padrão já existente do "Negócio Fechado 🎉"
> (`requestMove`/`executeMove`/`confirmGanhoMove`) com um novo `confirmEstimativaMove` — mover
> pra uma coluna com `requer_valor_estimado=true` sem estimativa ainda intercepta com um modal
> "Estimativa de Valor 💰" (âmbar, distinto do verde do Ganho) antes de chamar a API. Badge no
> card do Kanban e tile na ficha do lead: verde "R$X" quando `valor_venda` real existe, âmbar
> "~R$X est." quando só existe a estimativa — nunca os dois no mesmo elemento, nunca a mesma
> cor/peso.
>
> **Bug real encontrado E CORRIGIDO na própria verificação ao vivo desta fase, fora do escopo
> original mas com a mesma causa raiz do problema que a Fase 2 existe pra resolver:**
> `leads_staging.valor_venda` tinha `DEFAULT 0` no schema E `POST /api/crm/leads` gravava
> `data.valor_venda || 0` no INSERT — ou seja, **todo lead já criado na plataforma, desde
> sempre, tinha um "negócio fechado de R$ 0,00" fabricado**, nunca `NULL`. Confirmado ao vivo:
> o badge âmbar novo nunca aparecia pra nenhum lead com estimativa, porque a condição
> `valor_venda == null` nunca era verdadeira — todo card mostrava um badge verde "R$ 0,00"
> permanente e fabricado. Causa raiz mais funda: `NovoLeadModal.tsx` ("+ Novo Lead") tinha um
> campo "VGV Automático (Preço Imóvel)"/"Valor Base de Compra" que escrevia no `valor_venda`
> REAL já na CRIAÇÃO do lead — o texto de ajuda do próprio campo dizia literalmente "informe
> manualmente para cálculo de ROI em leads de perfil", um resíduo direto do modelo de ROI que
> a Fase 0 já tinha matado, e hardcoded com termo específico de imóvel ("VGV"), violando a
> regra de agnosticismo de segmento. **Corrigido:** campo removido por completo do
> `NovoLeadModal.tsx` (state, auto-preenchimento do preço do imóvel, os 2 blocos de UI, o
> campo no payload — `selectedImovel`/`imovel_id` continuam intocados, são legítimos);
> `POST /api/crm/leads` corrigido pra `data.valor_venda ?? null` (nunca inventa 0);
> `ALTER TABLE leads_staging ALTER COLUMN valor_venda DROP DEFAULT` +
> `UPDATE ... SET valor_venda = NULL WHERE valor_venda = 0` (8 linhas reais corrigidas — 7 do
> tenant Marketing Digital + 1 do Master, confirmado que nenhuma tinha valor genuinamente
> positivo antes de zerar; 1 lead legado com `tenant_id NULL` e valor real positivo, já
> documentado em sessão anterior, ficou intocado). Migração:
> `prisma/migration-2026-08-13-fix-valor-venda-fake-zero.sql`.
>
> **Fase 3 — Performance por Vendedor + Motivos de Perda, 100% agnóstico por construção.**
> Usuário, avaliando se reaproveitar `corretor_scores`/gamificação seria honesto mesmo sem
> nenhum agente de aceleração ativo, e eu tendo achado 3 problemas reais nesse sistema
> (`role.name='Corretor'` hardcoded, `vendas_realizadas` nunca escrito em lugar nenhum do
> código, só cobre o fluxo legado `imovel_prospects`), decidiu: construir do zero, direto de
> `leads_kanban`/`leads_staging`, **sem** passar por `corretor_scores`/gamificação, **sem**
> hardcode de nome de cargo, "deverá funcionar impecavelmente para quaisquer segmentos de
> negócio, de forma totalmente agnóstica". `pluralizePtBr` extraído de
> `src/app/api/crm/analytics/insights/route.ts` pra `src/lib/intelligence/pluralize.ts`
> (2º consumidor agora — evita duplicar a 3ª vez). Novo `GET /api/crm/analytics/
> performance-vendedores`: agrupa por `leads_staging.corretor_atribuido_id` (o mesmo campo já
> usado por TODAS as 4 estratégias de distribuição, independente de segmento — nunca
> `corretor_scores`) — leads atribuídos, negócios fechados (qtd+valor real), negócios perdidos
> (qtd+valor estimado, capturado antes de perder), pipeline em aberto, taxa de conversão,
> tempo médio de 1ª resposta. Só lista quem tem ≥1 lead atribuído no período. Rótulo do painel
> ("Corretores"/"Consultores de Vendas"/etc.) resolvido via
> `resolveSegment(tenantId).distribution_role_name` pluralizado — só a legenda muda por
> segmento, a query nunca sabe o nome do cargo. **Motivos de Perda** no mesmo endpoint:
> `GROUP BY leads_kanban.motivo_perda`, contagem, top N — dado 100% real (texto que o próprio
> usuário digitou ao perder o negócio), zero número inventado. Novo componente
> `PerformanceVendedoresPanel.tsx` (tabela + mini-painel de motivos).
>
> **Fase 4 — montagem final de `/crm/page.tsx`.** Layout novo, sem nenhuma menção a ROI:
> Linha 1 (5 KPIs: Leads Captados · Negócios Fechados · Negócios Perdidos · Pipeline Aberto ·
> Taxa de Conversão) · Linha 2 (`KanbanFunnelWidget`, intocado) · Linha 3 (Gargalos & Ciclos +
> Fila de Atenção, reaproveitando `GET /api/crm/pendencia/resgate` já existente, zero backend
> novo) · Linha 4 (Top 5 Leads Quentes + Inteligência de Mercado, ambos já existentes) ·
> Linha 5 (Performance por Vendedor + Motivos de Perda, Fase 3).
>
> **Fase 5 — `docs/ROTEIRO_TESTES_CRM.md` reescrito** pra refletir a nova realidade: item 1.1
> reescrito por completo (novo layout, sem menção a `crm_segmentos_config`/`domainId=1`, que
> não existe mais); item 1.2 ganhou o teste do modal "Estimativa de Valor 💰"; item 1.5 ganhou
> o teste do checkbox novo (mútua consideração com Ganho); nota da Parte 3 sobre "Central de
> Mídias vs. módulo real de Campanhas" removida (não existe mais Central de Mídia). Varredura
> final (`grep -i "roi\|investido\|CAC\|CPL\|central de mídia"`) confirmou zero menção órfã.
>
> **Testado ao vivo, ponta a ponta, com dado real, nos dois tenants de teste desta frente**
> (CRM SOZINHO — só CRM, segmento "Venda de Carros",
> `distribution_role_name='Consultor de Vendas'` — e Marketing Digital — CRM+Campanhas+
> Mensageria, segmento Imobiliário): dashboard `/crm` carrega sem nenhum card de custo em
> nenhum dos dois · Performance por Vendedor confirmado agnóstico de verdade — mesmo endpoint,
> mesma lógica, rótulo do painel muda ("Consultor de Vendas" vs. rótulo padrão) sem nenhum
> branch de código por segmento · `POST /api/crm/kanban/move` com `valor_venda_estimado` real
> testado direto via API antes da verificação visual — persistiu corretamente, refletiu em
> Pipeline Aberto · **verificação visual final no navegador** (sessão real, tenant Marketing
> Digital): badge âmbar "~R$ 85.000,00 est." confirmado renderizando corretamente no card do
> Kanban do lead de teste — e, na mesma tela, confirmado que TODOS os outros leads reais
> pré-existentes (Gisele, Roberto Severo etc.) pararam de mostrar o badge verde fabricado
> "R$ 0,00" que tinham antes do fix do bug acima (nenhum deles tem valor real nem estimado —
> comportamento correto e honesto, sem badge nenhum). `npx tsc --noEmit`: **0 erros** (mesma
> baseline zerada desde 2026-07-31, nenhum erro novo em qualquer arquivo tocado/criado/
> deletado desta frente inteira). Confirmado que `getRevenueAttribution`/Visão 4 real de
> Campanhas (`/admin/campanhas/dashboard`) segue 100% intocada — nenhuma mudança desta sessão
> chega perto desse código.
>
> **Limpeza:** lead de teste "TESTE VALOR ESTIMADO" removido (`leads_staging`+`leads_kanban`+
> `leads_kanban_ciclos`, cascata confirmada `count(*)=0`); `kanban_colunas` id=34 ("Proposta
> Enviada", Marketing Digital) revertida pra `requer_valor_estimado=false`; servidor de preview
> de teste parado; tokens JWT temporários apagados do disco.
>
> **Pendência real, fora de escopo desta rodada, registrada honestamente:** os 3 leads
> "TESTE..." mais antigos (Auto Atribuição, Backward Compat, Cliente Próprio) e o lead legado
> com `tenant_id NULL` continuam no banco — nunca foram registrados como pendência de limpeza
> minha em nenhuma sessão anterior (mesma disciplina já documentada: só apago o que registrei
> como meu resíduo). Nenhum agente de aceleração de CRM ativado — decisão de negócio do
> usuário/Master, fora de escopo técnico.

---

> **Atualizado em:** 2026-08-13 — **`/crm` dashboard (Dashboard de ROI CRM): 3 fontes de dado
> estruturalmente quebradas corrigidas — Total Investido/CPL/CAC/ROI, "Nível 2" (project_roi) e
> um funil real de CRM adicionado (nunca existia).** Nasceu da execução do item 1.1 do roteiro
> de testes: usuário notou que o print de `/crm` não mostrava "funil, leads, negócios" nem o
> filtro De/Até (esse já existia, só escondido atrás do botão "Personalizado" — não era bug).
> Investigando os 4 KPIs financeiros do topo, achado bem mais sério: eles vinham de
> `marketing_campanhas_orcamento` (verba manual da "Central de Mídia", `/crm/config/marketing`)
> — **0 linhas em todo o banco, platform-wide** — e o próprio endpoint que grava nela nunca
> preenchia `tenant_id` (bug real e latente, nunca exercitado por a feature nunca ter tido uso
> real). O "Nível 2: Performance por Produto/Categoria" (`project_roi`) vinha de
> `crm_segmentos_config`, **1 única linha no banco inteiro** (`domain_id=1`, hardcoded pra
> `imoveis`), desconectada de `system_segments` — nenhum segmento além do Imobiliário jamais
> teria equivalente, e o "nome de exibição" da entidade era um ternário hardcoded no próprio
> `roi/route.ts` (`target_table === 'imoveis' ? 'titulo' : 'nome'`).
>
> **Discussão de arquitetura com o usuário antes de corrigir** (2 cenários de contratação):
> (1) **só CRM contratado** — os KPIs financeiros continuam fazendo sentido, a fonte é a verba
> manual (é exatamente pra isso que a Central de Mídia existe); corrigir = consertar o bug de
> `tenant_id`, nunca esconder o card. (2) **CRM + Campanhas contratados** — usuário identificou
> o risco real de somar as 2 fontes (manual + gasto sincronizado de verdade) às cegas: duplicação
> (usuário digita manualmente uma campanha que já está sincronizada) e números que não batem
> entre o dashboard do CRM e o de Campanhas, parecendo bug.
>
> **Achado que resolveu o risco #2 por construção, não por convenção:** já existia
> `getRevenueAttribution()` (`src/lib/marketing/services/revenueAttributionService.ts`, F6 —
> "Visão 4/Funil de Receita" do dashboard de Campanhas) calculando exatamente "gasto real
> sincronizado × negócio fechado no CRM" por campanha. Reaproveitada aqui em vez de reagregar
> `campanhasmarketingdigital."Insight"` de novo em `roi/route.ts` — garante que o "gasto
> sincronizado" mostrado no CRM **nunca diverge** do que o dashboard de Campanhas já mostra,
> porque são literalmente a mesma chamada de função, não dois cálculos que podem discordar.
>
> **Implementado:**
> 1. **`src/app/api/crm/marketing/orcamento/route.ts`** — `getCurrentUser()` (mesmo padrão
>    `admin_auth_token`/Bearer já usado no resto de `/api/crm/*`); POST/PUT passam a gravar
>    `tenant_id`; GET filtra por `tenant_id`; 401 sem sessão nas 3 rotas.
> 2. **`hasCampanhasModule()`** (novo, ao lado de `hasCrmModule` já existente em
>    `revenueAttributionService.ts`) — inverso exato, `tenant_modules JOIN system_modules WHERE
>    slug='trafego-pago'`. Reaproveita a mesma condição já usada em `/api/admin/clientes/
>    tem-modulo-campanhas/route.ts`, sem duplicar a query, só extraída como função importável
>    pro servidor chamar direto (sem round-trip HTTP).
> 3. **`roi/route.ts` — breakdown, nunca soma cega:** `manual_investido` (verba da Central de
>    Mídia, agora tenant-scoped) calculado sempre; `synced_investido` via `getRevenueAttribution`
>    só quando `hasCampanhasModule` é `true`; `total_investido = manual + synced`. Resposta ganha
>    `manual_investido`/`synced_investido`/`campanhas_contratado`. `cac_global`/`cpl_global`/
>    `roi_global` mantêm a mesma fórmula de sempre, só que sobre a base agora correta.
> 4. **`/crm/page.tsx`** — card "Total Investido" ganha uma 2ª linha ("R$X sincronizado
>    (Campanhas) + R$Y manual (CRM)") só quando as 2 fontes contribuem de verdade — nunca some
>    o número atrás de uma soma ambígua, mas também não polui a UI com "R$0" quando só 1 fonte
>    existe (o caso comum).
> 5. **`MarketingCampaignModal.tsx`** (Central de Mídia) — reduz a chance de duplicação na
>    origem: quando o tenant tem Campanhas contratada (checado via `/api/admin/clientes/
>    tem-modulo-campanhas`, endpoint já existente, reaproveitado), o toggle de canais só oferece
>    opções offline (Impresso/Rádio/Evento/Indicação/Outro/Taboola) — os 4 canais digitais que o
>    módulo de Campanhas já sincroniza automaticamente somem da lista, com uma nota explicando o
>    porquê. Sem Campanhas contratada, todos os canais continuam disponíveis (única fonte real
>    que esse tenant tem).
> 6. **`project_roi` — migrado de `crm_segmentos_config`/`domain_id` solto pra a mesma tabela,
>    agora conectada a `system_segments` de verdade.** Migração
>    (`prisma/migration-2026-08-12-crm-segmentos-config-segment-id.sql`, aplicada): 2 colunas
>    novas — `segment_id UUID REFERENCES system_segments(id)` + `target_name_column VARCHAR(100)
>    DEFAULT 'nome'` — aditivas, a rota/tela pré-existente (`/api/crm/config/segmentos`, "Segment
>    Builder" de enriquecimento de lead, keyed por `domain_id`) continua 100% intocada, sem
>    nenhuma regressão. Backfill: a única linha real (domain_id=1) ganhou `segment_id` do
>    Imobiliário + `target_name_column='titulo'` (preserva o comportamento exato do ternário
>    antigo). `roi/route.ts` resolve o segmento real do tenant via `resolveSegment()` (já usado
>    em `insights/route.ts`) e busca a config por `segment_id` — segmento sem nenhuma linha (ex.:
>    "Venda de Carros") faz `project_roi` simplesmente não rodar (`project_roi_available:false`),
>    honesto, sem inventar tabela nenhuma; a UI mostra um empty state distinto ("este segmento
>    não tem entidade de produto/projeto configurada") em vez do genérico "aguardando dado".
>    **Correção de rota feita a meio da implementação, antes de qualquer teste:** a 1ª tentativa
>    tinha reaproveitado a config `owner_of_asset` de `segment_distribution_strategies` (curada
>    pelo Master pro motor de distribuição de lead) — investigação mais funda revelou que o
>    campo `targetIdColumn` daquela estratégia significa "PK na tabela do ativo"
>    (`imoveis.id`), não "coluna FK em `leads_staging`/`marketing_campanhas_orcamento` que aponta
>    pro ativo" (`imovel_id`) — são conceitos diferentes que só coincidem por acaso no caso real
>    hoje. Corrigido antes de rodar qualquer query real, revertendo pra `crm_segmentos_config`
>    (que já tinha o campo certo) só com a conexão a `segment_id` adicionada.
> 7. **Funil real de CRM (novo, nunca existia em `/crm`).** `GET /api/crm/stats/dashboard` —
>    a query que já alimentava `leads_por_status` (usada só internamente, nunca renderizada em
>    lugar nenhum) ganhou `k.id, k.titulo_exibicao, k.cor, k.ordem`, filtro `k.ativa=true`,
>    `ORDER BY k.ordem`. Novo `src/components/crm/KanbanFunnelWidget.tsx` — barra horizontal por
>    coluna do Kanban (contagem + % do total, cor real da coluna), plugado logo abaixo dos 5
>    cards de KPI. Deliberadamente distinto do funil de mídia paga já existente no dashboard de
>    Campanhas (`StageFunnelWidget`, TOF/MOF/BOF por atribuição de anúncio) — este responde
>    "onde estão meus negócios no funil de vendas", aquele "que campanha trouxe lead em qual
>    estágio de anúncio"; sempre visível com CRM, independente de Campanhas contratada.
>
> **Testado ao vivo, ponta a ponta, contra os 2 tenants reais dos 2 cenários discutidos**
> (`preview-alt`, porta 3050; JWTs reais com `userId` real de cada tenant, removidos depois):
> **CRM SOZINHO** (só `cadastros`+`crm`, segmento Venda de Carros) — `GET /roi` inicial:
> `manual_investido:0, synced_investido:0, campanhas_contratado:false, project_roi_available:
> false` (honesto, sem inventar nada) · `POST /orcamento` com verba real de teste →
> confirmado via SQL direto que `tenant_id` foi gravado corretamente (bug A fechado) · `GET
> /roi` seguinte refletiu `manual_investido:500, total_investido:500` exato.
> **Marketing Digital** (`cadastros`+`crm`+`mensageria`+`trafego-pago`, segmento Imobiliário,
> com gasto real sincronizado de campanhas reais) — `GET /roi` (180 dias): `synced_investido:
> 432144.30741740734, campanhas_contratado:true, project_roi_available:true` (segmento tem
> config agora) · **cross-check direto contra SQL** replicando a mesma query de
> `getRevenueAttribution`: `432144.30741740717` — bate exato (diferença de centésimos de
> centavo é ruído de ponto flutuante em soma de várias linhas, não divergência real) — prova
> que o número nunca sai dessincronizado do dashboard de Campanhas, por reaproveitar a mesma
> função · `POST /orcamento` com verba manual de teste (canal "Impresso") → `GET /roi` seguinte:
> `manual_investido:1234.56, synced_investido:432144.30741740734, total_investido:
> 433378.86741740734` — soma exata das 2 fontes, nunca confundidas.
> **Gate da Central de Mídia:** `GET /tem-modulo-campanhas` → `true` pra Marketing Digital,
> `false` pra CRM SOZINHO — confirma que o toggle de canais restringe corretamente pra cada
> cenário. **`stats/dashboard`** (fonte do funil novo): CRM SOZINHO retornou as 7 colunas reais
> do Kanban (`id`/`titulo_exibicao`/`cor`/`ordem` corretos, `total:0` em todas — tenant
> genuinamente vazio, sem erro). `npx tsc --noEmit`: 0 erros em todo o projeto (rodado limpo,
> sem cache, 2x). Todo dado de teste removido depois (`DELETE` nas 2 verbas manuais, `count(*)
> =0` confirmado), preview server parado, tokens temporários apagados do disco.
>
> **Pendência real, não atacada nesta rodada, registrada com honestidade:** `project_roi` não
> foi testado com uma linha REAL e não-vazia (exigiria um tenant com imóveis reais E verba
> manual vinculada a um `imovel_id` — nem "CRM SOZINHO" nem "Marketing Digital" têm imóveis
> próprios cadastrados) — a mudança de mecanismo (config agora vem de `crm_segmentos_config`
> conectada por `segment_id`, em vez do `domain_id` solto) foi validada por 2 caminhos
> independentes (segmento COM config → `available:true`; segmento SEM config → `available:
> false`, nenhum dos dois deu erro de SQL nas 2 execuções reais), mas o caminho "linha não-vazia
> com nome de imóvel real resolvido via `target_name_column`" só foi verificado por revisão de
> código, não por execução ao vivo. Vale testar contra o tenant "Imobiliaria XYZ" (que tem
> imóveis reais) numa sessão futura, se o usuário quiser essa confirmação redundante.

> **Atualizado em:** 2026-08-11 (continuação 4) — **Fix real, mesma classe do vazamento de
> segurança corrigido momentos antes — 2ª rota irmã do mesmo dashboard (`GET /api/crm/
> analytics/insights`, painel "Inteligência de Mercado" em `/crm`) também vazava dado
> operacional entre tenants, mais um hardcode real-estate-específico junto.** Usuário testou
> "CRM SOZINHO" (0 leads, segmento "Venda de Carros") e viu "Aviso: 6 leads estão estagnados
> fora do SLA. Notificar corretores imediatamente" — apontou corretamente 2 problemas: o
> número não podia ser real (tenant sem nenhum lead) e "corretores" não tem nenhuma relação
> com o segmento de carros.
>
> **Causa raiz confirmada — idêntica à da rota `analytics/roi` corrigida na entrada anterior:**
> zero extração de sessão, zero filtro de tenant nas 2 queries (`trendQuery` — tag de sonho em
> alta; `bottleneckQuery` — contagem de leads fora do SLA). Confirmado por prova direta: os
> "6 leads" eram na verdade o total platform-wide de leads fora do SLA (todos pertencentes ao
> tenant "Marketing Digital", 5 no momento da nova checagem — a contagem é viva/muda com o
> tempo, não é discrepância). Achado #2, incidental mas real: a mensagem "Notificar corretores
> imediatamente" era um literal hardcoded no código — nunca variava por segmento, mesmo a
> plataforma já tendo um campo dedicado pra isso (`system_segments.distribution_role_name`,
> usado em todo o resto do CRM pra essa exata finalidade desde F7).
>
> **Corrigido** (`src/app/api/crm/analytics/insights/route.ts`): mesmo padrão de extração de
> sessão/tenant já aplicado na rota irmã; `WHERE tenant_id = $1` nas 2 queries (`bottleneckQuery`
> via `JOIN leads_staging`, já que `leads_kanban.tenant_id` também não é 100% confiável — 1 de
> 7 linhas reais estava `NULL`); mensagem de aviso passa a usar `resolveSegment(...)
> .distribution_role_name` (pluralizado por uma regra PT-BR simples: vogal final → `+s`, senão
> `+es` — cobre Corretor→Corretores, Atendente→Atendentes, Vendedor→Vendedores) em vez do
> literal "corretores".
>
> **Atendido — segmento "Venda de Carros" customizado com `distribution_role_name =
> 'Consultor de Vendas'`** (decisão do usuário via `system_segments`, editável a qualquer
> momento no modal "Editar Segmento" → seção "Distribuição de Leads — Cargo do Vendedor").
>
> **Bug real pego ANTES do usuário testar, na própria verificação desta correção:** o helper
> `pluralizePtBr` pluralizava a STRING INTEIRA pela última letra — pra "Consultor de Vendas"
> (termina em 's') isso geraria **"Consultor de Vendases"**, uma não-palavra. Corrigido pra
> pluralizar só a PRIMEIRA palavra (o substantivo do cargo) preservando o resto —
> "Consultor de Vendas" → "consultores de vendas"; testado também contra os demais casos reais
> da plataforma (Corretor, Atendente, Vendedor, "Corretor de Imóveis") pra confirmar que a
> mudança não quebrou nenhum caso simples de palavra única.
>
> **Testado ao vivo o branch exato que só dispara com >5 leads estagnados** (não exercitado
> nos testes anteriores desta rodada, que só tinham `stale_leads` baixo): 6 leads de teste
> temporários inseridos pro tenant "CRM SOZINHO" (Venda de Carros), `GET` real confirmou
> `"Aviso: 6 leads estão estagnados fora do SLA. Notificar consultores de vendas
> imediatamente."` — correto, sem a não-palavra, escopado só a esse tenant. Todo dado de
> teste removido (`DELETE` em `leads_kanban`+`leads_staging`, `count(*)=0` confirmado).
>
> **Testado ao vivo, ponta a ponta:** `GET` real pro tenant "CRM SOZINHO" →
> `stale_leads: 0` (antes vazava o total de outro tenant); mesma chamada pro tenant
> "Marketing Digital" → `stale_leads: 5`, batendo exato com a contagem real e escopada desse
> tenant (SQL direto confirma: os 5 leads fora do SLA no banco inteiro pertencem 100% a
> Marketing Digital) — zero regressão de acesso legítimo; sem sessão → `401`. Confirmado
> visualmente no navegador: painel "Gargalos & Ciclos (SLA)" mostra "Aguardando movimentações
> de Kanban..." e "Inteligência de Mercado" mostra "Mantenha o monitoramento ativo dos novos
> leads." pro tenant vazio, sem nenhum resíduo do dado de outro tenant. `npx tsc --noEmit`: 0
> erros novos no arquivo tocado.

> **Atualizado em:** 2026-08-11 (continuação 3) — **Fix real de segurança: vazamento de dado
> operacional entre tenants em `/api/crm/analytics/roi` (Dashboard `/crm`, painel "Gargalos &
> Ciclos (SLA)").** Achado pelo usuário testando o item 1.1 do roteiro com o tenant "CRM
> SOZINHO" (0 leads, criado agora pra teste): o painel mostrava 3 linhas de dado com contagem
> e horas específicas — "Lead Captado, 1 lead, 345.5h, Atraso Crítico" etc. — mesmo o tenant
> não tendo nenhum lead nem movimentação de Kanban.
>
> **Causa raiz confirmada:** a rota inteira (`GET /api/crm/analytics/roi`, usada só por
> `/crm`, "Dashboard de ROI CRM") nunca teve NENHUMA filtragem por tenant em NENHUMA das 4
> queries (`kpiQuery`, `campaignROIQuery`, `projectROIQuery`, `cycleQuery`) — nem sequer
> extraía o usuário autenticado da requisição. Já era uma pendência **documentada** desde a
> sessão de hardening Ganho/Perda (2026-08-07: "não filtra por tenant_id em nenhuma query...
> registrado como pendência real a investigar numa sessão futura se essa rota ainda for usada
> por alguma tela") — mas nunca tinha sido confirmada com evidência concreta de vazamento real
> até este teste. Confirmado por prova direta: os 3 valores exatos que apareciam pra "CRM
> SOZINHO" batem byte a byte com o `leads_kanban_ciclos` real do tenant "Marketing Digital"
> (único tenant com dado real nessa tabela).
>
> **Corrigido** (`src/app/api/crm/analytics/roi/route.ts`): (1) adicionada extração de
> usuário/tenant via `verifyTokenNode` (mesmo padrão de `pendencia/resgate/route.ts` — Master
> pode inspecionar outro tenant via `?tenant_id=`, tenant comum nunca sai do próprio escopo;
> 401 sem sessão); (2) `WHERE tenant_id = $1` adicionado às 4 queries. Achado no processo:
> `leads_kanban_ciclos.tenant_id` existe na tabela mas o trigger que a popula nunca o
> preenche (mesmo achado já documentado em G0, sempre `NULL`) — o escopo dessa query teve que
> vir via `JOIN leads_staging` (fonte confiável), nunca `lkc.tenant_id` direto. Achado
> incidental, não corrigido por ser um problema separado: `marketing_campanhas_orcamento`
> está **completamente vazia** (0 linhas) pra toda a plataforma — por isso os KPIs de "Nível
> 1" (Total Investido, ROI Global, CAC, CPL) sempre mostram zero pra qualquer tenant,
> independente do fix de tenant aqui; é uma tabela legada desconectada da fonte real de dados
> de campanha (`campanhasmarketingdigital."Insight"`), registrada como achado, não corrigida
> nesta rodada (fora do escopo — o vazamento entre tenants era o problema de segurança real).
>
> **Testado ao vivo, ponta a ponta, com prova direta:** `GET` real pro tenant "CRM SOZINHO"
> (0 leads) → `cycle_heatmap: []` (correto, honesto); mesma chamada pro tenant "Marketing
> Digital" (dono real do dado) → os mesmos 3 valores exatos que antes vazavam pra "CRM
> SOZINHO" continuam aparecendo corretamente ali, sem regressão de acesso legítimo; sem
> nenhuma sessão → `401`. `npx tsc --noEmit`: 0 erros novos no arquivo tocado.
>
> **Pendência real, fora de escopo desta rodada:** a arquitetura de segmento por trás desta
> mesma rota (`crm_segmentos_config`/`domainId=1`, hardcoded pro Imobiliário) continua
> desatualizada em relação ao `system_segments`/`resolveSegment` já padronizado no resto da
> plataforma — só a filtragem por tenant foi corrigida aqui, o `domainId` legado permanece
> como já estava documentado.

> **Atualizado em:** 2026-08-11 (continuação) — **Fix real, mesma classe de bug encontrada
> numa 2ª superfície do Master: 3 features do CRM (Catálogo de Atividades, Agentes de
> Aceleração (CRM), Fila de Resgate) nunca linkadas ao módulo "CRM de Vendas", invisíveis em
> QUALQUER tenant com o módulo contratado.** Usuário testou `/admin/master/cockpit` (ferramenta
> de curadoria estrutural do catálogo — segmento→módulo→categoria→feature — distinta de
> `/admin/master/provisioning`, já auditada na entrada anterior) e reportou: "Catálogo de
> Atividades"/"Agentes de Aceleração (CRM)" apareciam corretamente atribuídas à categoria
> "Configurações CRM" no cockpit, mas não apareciam na sidebar de "CRM SOZINHO" mesmo com o
> módulo "CRM de Vendas" contratado. Também questionou se "Agentes de Aceleração (CRM)" é uma
> página segregada de verdade ou só o modal do Master em `/admin/master/segments`.
>
> **Esclarecido — são 2 coisas diferentes, ambas reais:** o modal do Master
> (`SegmentAgentesModal`, em `/admin/master/segments`) configura os PARÂMETROS dos 5 agentes
> por segmento (acesso direto do Master, nunca passa por provisionamento). A feature 120 aqui
> é a PÁGINA do TENANT (`/crm/config/agentes`, construída na fase G4) onde o tenant sobrepõe
> os padrões do segmento e vê a fila "Aprovações Pendentes" — página real, só nunca ficou
> acessível a nenhum tenant por causa do bug abaixo.
>
> **Causa raiz idêntica à da entrada anterior:** `system_categorias.module_id`/
> `system_features.category_id` (o que o Cockpit cura) é uma dimensão de curadoria
> COMPLETAMENTE SEPARADA de `system_feature_modules` (o que realmente decide se uma feature
> vira candidata a `tenant_feature_overrides`, tanto na criação de tenant quanto no Coluna 4
> de `/admin/master/provisioning`) — uma feature pode estar perfeitamente categorizada no
> Cockpit e mesmo assim nunca ser provisionável em lugar nenhum, se faltar o segundo vínculo.
> Auditoria completa (todas as features ativas com URL real sem nenhum vínculo em
> `system_feature_modules`) confirmou 3 features do CRM nessa situação — Catálogo de
> Atividades (119), Agentes de Aceleração (CRM) (120), Fila de Resgate (121, achada na mesma
> varredura, mesmo sintoma, ainda não teria sido reportada mas já estava quebrada) — diferente
> de todas as demais features CRM mais antigas (Kanban de Leads, Gestão de Leads, Central de
> Mídias etc.), que já tinham o vínculo certo.
>
> **Corrigido** (`prisma/migration-2026-08-11-fix-crm-orphan-features-leak.sql`, aplicada): as
> 3 linkadas ao módulo real "CRM de Vendas"; concedido retroativamente pros 7 tenants que já
> têm esse módulo contratado (Imobiliaria XYZ, Imovitec, Marketing Digital + os 4 tenants de
> teste com CRM) — é exatamente o que teria acontecido automaticamente se o vínculo já
> existisse desde que essas features foram criadas.
>
> **Achado à parte, confirmado NÃO ser bug (documentado, não corrigido):** "Análise de
> Ciclos" (73) já está corretamente linkada ao módulo e já está provisionada pra "CRM
> SOZINHO" — mas continua invisível porque `system_features.url` está vazio pra ela (item de
> catálogo sem página própria construída ainda). Comportamento deliberado do Filtro C, já
> citado como exemplo no próprio `docs/ACCESS_CONTROL.md`.
>
> **Auditoria mais ampla, registrada como pendência real, não atacada nesta rodada** (por
> prudência — risco de mapear pro módulo errado sem contexto suficiente): outras 7 features
> ativas com URL real e também sem vínculo em `system_feature_modules` — 3 são páginas
> exclusivas do Master (`/admin/master/prompts`, `/admin/master/ia-plataforma`,
> `/admin/master/skills`, irrelevantes pra tenant comum já que Master bypassa os 2 filtros de
> qualquer forma), 1 é uma skill (`/admin/skills/brainstorming`, modelo de provisionamento
> possivelmente diferente, não investigado), e 3 parecem páginas legadas/mortas (`/admin/
> dashboard`, `/admin/relatorios`, `/admin/logs/reports`, sem confirmação se ainda têm uso
> real). Vale uma varredura dedicada numa sessão futura, se o usuário quiser garantir que não
> há mais nenhum caso deste padrão.
>
> **Testado ao vivo:** `get_sidebar_menu_for_user()` real pro tenant "CRM SOZINHO" — as 3
> features agora aparecem nas categorias certas (Catálogo de Atividades + Agentes de
> Aceleração sob "Configurações CRM"; Fila de Resgate sob "CRM").

> **Atualizado em:** 2026-08-11 — **Fix real: 4 features de Campanhas de Marketing Digital
> vazando pra TODO tenant da plataforma, mesmo sem o módulo contratado — achado sistêmico,
> não específico do tenant reportado.** Usuário reportou: tenant "CRM SOZINHO" mostrava na
> sidebar as categorias "Campanhas de Marketing Digital" e "Gestão Administrativa de Imóveis",
> nenhuma das duas provisionada para ele.
>
> **Causa raiz #1 (a mais séria) — features 106/107/108/109 ("Aprovações do Agente"/"Destinos
> de CTA"/"Analytics de Captura"/"Mecanismos") nunca foram linkadas ao módulo "Gestão de
> Campanhas de Marketing Digital" em `system_feature_modules`** — diferente de TODAS as outras
> 14 irmãs da mesma categoria (`Galeria de Criativos`, `Painel de Campanhas`, `Leads`, etc.),
> que já têm o vínculo. Pior: as 4 estavam com `is_default_tenant_admin_feature=true` — a
> mesma flag que `POST /api/admin/master/tenants` usa pra decidir quais features são
> "essenciais" e seedar automaticamente em TODO tenant novo, **independente de qual módulo
> foi selecionado na criação**. Resultado real, confirmado via SQL, não hipotético: TODOS os 6
> tenants reais/de teste da plataforma tinham essas 4 features em `tenant_feature_overrides` —
> inclusive "CRM SOZINHO" e "CRM + MENSAGERIA" (nenhum dos dois com Campanhas contratado).
>
> **Causa raiz #2 — mapeamento de categoria legado e errado.** `system_feature_categorias`
> tinha 1 linha órfã do tempo em que a plataforma era só imobiliária: a feature "Usuários"
> (categoria padrão real = "Permissões") estava forçada pra categoria "Gestão Administrativa
> Imóveis" — fazia uma feature legitimamente provisionada (todo tenant admin tem "Usuários"
> por ser também `is_default_tenant_admin_feature`) aparecer sob um nome de categoria
> completamente fora de contexto pra qualquer tenant de segmento não-imobiliário, reforçando a
> mesma percepção de "categoria nunca provisionada".
>
> **Corrigido** (`prisma/migration-2026-08-11-fix-campanhas-orphan-features-leak.sql`,
> aplicada): (1) as 4 features linkadas ao módulo real, igual as 14 irmãs; (2)
> `is_default_tenant_admin_feature=false` nas 4 — só passam a ser provisionadas quando o
> Master de fato seleciona o módulo de Campanhas pro tenant, nunca mais por padrão; (3) o
> mapeamento de "Usuários" corrigido de volta pra "Permissões"; (4) limpeza retroativa — as
> `tenant_feature_overrides` das 4 features removidas **só** dos tenants que não têm o módulo
> de Campanhas contratado (`tenant_modules`) — os 6 tenants que têm (Imobiliaria XYZ, Imovitec,
> Marketing Digital + os 3 tenants de teste com Campanhas) mantiveram acesso intacto, zero
> regressão. Master Platform (bypassa Filtro B de qualquer forma, `v_is_master=true` na função
> de sidebar) deixado fora da limpeza de propósito, por ser irrelevante funcionalmente.
>
> **Testado ao vivo:** `get_sidebar_menu_for_user()` real pro usuário `admxyz` no tenant "CRM
> SOZINHO" — antes retornava 6 categorias incluindo "Campanhas de Marketing Digital" (4
> features) e "Gestão Administrativa Imóveis" (1 feature, "Usuários" mal-categorizada); depois
> retorna só as 5 categorias legítimas (Sistema, Permissões — com "Usuários" corretamente
> aqui —, Cadastros, Configurações CRM, CRM). Confirmado via SQL que os 6 tenants com Campanhas
> contratado continuam com as 4 features ativas (nenhuma perda de acesso real).

> **Atualizado em:** 2026-08-09 (continuação 2) — **Fix real: módulo associado a um tenant
> (`tenant_modules`) desaparecia da coluna "Módulos Assinados" em `/admin/master/provisioning`
> quando o segmento do tenant não tinha esse módulo curado em `system_segment_modules`.**
> Reportado pelo usuário: tenant "CRM SOZINHO" (segmento "Venda de Carros") tinha "Cadastros"
> e "CRM de Vendas" associados, mas nenhum dos dois aparecia na coluna de módulos ao selecionar
> o tenant.
>
> **Causa raiz confirmada:** a API (`GET /api/admin/master/provisioning?tenant_id=X`) sempre
> retornou os 2 módulos corretamente (`tenant_modules` estava certo) — o bug era 100%
> client-side, em `MasterProvisioningHub.tsx`: a Coluna 3 só iterava
> `activeSegmentData.modules` (a árvore do segmento SELECIONADO, via `system_segment_modules`)
> — nunca os módulos que o tenant de fato tem. "Venda de Carros" nunca teve nenhum módulo
> curado nessa tabela (`0 rows`), então qualquer módulo atribuído a um tenant desse segmento
> ficava invisível e sem checkbox pra gerenciar, mesmo persistido e devolvido pela API.
> Confirmado que "Cadastros"/"CRM de Vendas" existem na árvore só sob "Imobiliário"/"Saúde
> Digital".
>
> **Corrigido:** `modulesToShow` — achata TODOS os módulos de TODOS os segmentos da árvore
> num mapa único (a forma de um módulo é a mesma onde aparecer, já que features são ligadas ao
> módulo via `system_feature_modules`, não ao par segmento-módulo) e complementa a lista do
> segmento ativo com qualquer módulo que o tenant já tenha fora dela — com um badge "Fora do
> Segmento" pra deixar claro que é uma atribuição cruzada. A resolução de features da Coluna 4
> (`featuresToShow`) também corrigida pra buscar em `modulesToShow`, não só na árvore do
> segmento — senão selecionar um desses módulos "extras" nunca resolveria as features.
>
> **Testado ao vivo no navegador** (sessão Master real): tenant "CRM SOZINHO" → segmento
> "Venda de Carros" selecionado → os 2 módulos aparecem corretamente com "FORA DO SEGMENTO" e
> a contagem certa de features (12 pra CRM de Vendas, 2 pra Cadastros). `npx tsc --noEmit`: 0
> erros. Nenhuma escrita no banco durante o teste (só leitura/seleção, nunca cliquei em
> "Aplicar Contrato Master").
>
> **Pendência real, fora de escopo desta rodada:** 2 módulos ativos (`master-platform`,
> `saude`) não estão linkados a NENHUM segmento em `system_segment_modules` — não afetados
> pelo fix acima (que só resolve módulos presentes em ALGUM ramo da árvore), mas registrado
> como o mesmo tipo de gap de curadoria que causou o bug original, caso algum tenant um dia
> tenha um desses 2 módulos atribuído.

> **Atualizado em:** 2026-08-09 (continuação) — **Execução real do `docs/ROTEIRO_TESTES_CRM.md`
> (Partes 1 e 3, + spot-check da 4) — 3 achados reais, 2 corrigidos e verificados ponta a
> ponta, 1 parcialmente corrigido aguardando input do usuário.** Pedido do usuário: "rode" o
> roteiro de testes do CRM recém-escrito. Executado via API real (JWT gerado com `userId`
> real, tenants Imobiliaria XYZ e Marketing Digital) + Browser pane pro Kanban visual.
>
> **Achado #1 (corrigido) — `POST /api/crm/leads` nunca lia o tenant da sessão autenticada,
> só do corpo da requisição, com default silencioso pro tenant Master quando ausente.** O
> modal "Novo Lead" da própria UI do Kanban (`NovoLeadModal.tsx`) **nunca envia `tenant_id`**
> no payload — confirmado ao vivo: um lead criado por `admxyz` (Imobiliaria XYZ) via essa
> rota, sem `tenant_id` explícito, era gravado silenciosamente sob o tenant Master. Os 5
> chamadores servidor-a-servidor sem sessão (webhooks Meta/Google, `inboundProcessor` do
> WhatsApp, mecanismo de CTA) sempre passaram `tenant_id` explícito corretamente — só o
> caminho autenticado estava quebrado. **Corrigido:** `src/app/api/crm/leads/route.ts`
> resolve `leadTenantId` com prioridade (1) sessão autenticada não-Master, (2) `tenant_id` do
> corpo (preserva os 5 chamadores legítimos), (3) Master como último fallback. Testado ao
> vivo: lead sem `tenant_id` no corpo, só sessão → grava no tenant certo + IA qualifica de
> verdade (antes caía no fallback `crm_ia_ativa=false` do Master); chamada sem sessão com
> `tenant_id` explícito → comportamento idêntico a antes, zero regressão.
>
> **Achado #2 (corrigido) — não existia, em NENHUM lugar da UI, um jeito de registrar quanto
> valeu um negócio ao fechá-lo.** `POST /api/crm/kanban/move` nunca aceitava nem persistia
> `valor_venda` — só move a coluna. O único lugar que já escrevia essa coluna era o form de
> **criação** do lead (`NovoLeadModal.tsx`), o que não faz sentido de negócio (o valor da
> venda só é conhecido no fechamento, não na captação). Resultado prático: a Visão 4
> (CPA/ROAS real, F6) ficava silenciosamente zerada pra todo negócio fechado pelo fluxo normal
> do Kanban. **Corrigido, com aprovação explícita do usuário antes de implementar** (2
> opções propostas via `AskUserQuestion`, escolhida "Corrigir agora"): rota `kanban/move`
> ganhou `valor_venda` opcional (validado, não-negativo) persistido junto do move; UI do
> Kanban (`kanban/page.tsx`) ganhou um modal "Negócio Fechado 🎉" que intercepta qualquer move
> pra uma coluna `is_ganho=true` e pede o valor antes de confirmar — `requestMove`/
> `executeMove`/`confirmGanhoMove`, ponto único de decisão tanto pro drag-and-drop quanto pro
> botão avançar/voltar da ficha. **Testado ponta a ponta com números reais:** lead real
> atribuído à campanha "Alto Padrão — Alphaville" (Marketing Digital, gasto real R$11.927,02)
> movido pra Fechamento com `valor_venda=950000` → replicada a query real de
> `revenueAttributionService.ts` → **`leads:1, deals:1, revenue:950000.00`** na campanha certa
> — confirma que o fix propaga corretamente até a Visão 4, não só até o banco. Validação de
> negativo testada (`-100` → 400). `npx tsc --noEmit`: 0 erros.
>
> **Achado #3 (corrigido por completo) — as 7 tags curadas de qualificação por IA do segmento
> Imobiliário (`crm_qualificacao_regras_segmento.tag_resultante`) tinham o emoji corrompido em
> `??`** ("?? Primeiro Imóvel", "?? Proprietário (Venda)", etc.) — resíduo de uma migração de
> sessão anterior aplicada via `curl` inline no Git Bash Windows (o mesmo padrão de corrupção
> de UTF-8 multi-byte já documentado dezenas de vezes neste arquivo). **Confirmado que não é
> bug de código:** testei o LLM (Groq, `llama-3.3-70b-versatile`, provider real configurado
> pra esse tenant) direto, fora da aplicação, pedindo pra ecoar "🏠 Primeiro Imóvel" — voltou
> com o emoji intacto (`f0 9f 8f a0` em hex, UTF-8 correto). O lead de teste que expôs o
> achado tinha caído no fallback por palavra-chave (não no LLM), copiando o `tag_resultante`
> corrompido verbatim do banco. Corrigida na hora só a linha com confirmação textual do valor
> original ("🏠 Primeiro Imóvel", citado várias vezes neste arquivo em sessões anteriores) —
> as outras 6 não foram adivinhadas de propósito (nenhum registro do valor original em
> lugar nenhum). **Usuário confirmou não lembrar o original também** — resolvido escolhendo
> 6 emojis novos e coerentes (não é recuperação de dado, é curadoria nova, mesma coisa que o
> Master faria manualmente na tela): 💰 Proprietário (Venda), 🔑 Proprietário (Locação),
> 🔄 Interesse em Permuta, ⏰ Urgência de Mudança, 📈 Investidor de Ativos, ⬆️ Upgrade
> Residencial. Aplicado via arquivo `.sql` (nunca inline no bash — é literalmente o mesmo bug
> que causou a corrupção original), confirmado via SQL que as 7 linhas têm UTF-8 correto
> (`tag_resultante ~ '\?\?'` = false em todas). Editável a qualquer momento em
> `/admin/master/segments` → "Qualificação de Lead por IA (CRM)" se o usuário quiser trocar.
>
> **Confirmado funcionando, sem achados, via API real:** gate `crm_ia_ativa`
> (`/api/crm/segment-status`), ficha do lead completa (atividades — criar/editar/excluir/
> validação de 15 caracteres/badge IA vs humano —, Kanban move entre etapas), Catálogo de
> Atividades (CRUD, reuso de nome após soft-delete, bloqueio de exclusão em uso — não
> re-testado nesta rodada, já coberto em sessão anterior), mútua exclusão `is_ganho`/
> `is_perda` via API, `/api/crm/config/ia` e `/api/crm/config/agentes` (GET refletindo as 7
> regras reais + catálogo de agentes), Fila de Resgate (vazia, como esperado), disponibilidade
> de atendente (`PATCH .../disponibilidade` — marcar, validar data no passado→400, validar
> usuário de outro tenant→404, liberar), e a convergência do Match Engine (Parte 4.3: mesmo
> telefone em 2 formatos diferentes + e-mail → mesmo `lead_uuid`, confirmado `count(*)=1`).
>
> **Partes 2 e a maior parte da 4 não re-executadas nesta rodada** — os mecanismos centrais
> (bot M4.1 gravando atividade com badge IA, reativação automática G6) já tinham sido testados
> ponta a ponta na sessão imediatamente anterior a esta (ver entrada abaixo, "Badge 'Agente de
> IA'..."), incluindo com LLM real. Fica registrado como pendência re-executar o roteiro
> completo da Parte 2/4 (bot + reativação + fluxo de aprovação PIN via WhatsApp real) numa
> próxima rodada, se o usuário quiser essa confirmação redundante.
>
> **Limpeza:** todo lead/tipo de atividade de teste removido (`count(*)=0` real, os 2 tipos de
> teste ficaram soft-deletados — mesma convenção reversível de sempre, invisíveis pra
> aplicação), disponibilidade de `jucarvalho` revertida, tokens JWT temporários apagados do
> disco. `git status` confirmado limpo (só os arquivos de código realmente tocados).
>
> **Atualizado em:** 2026-08-09 — **Badge "Agente de IA" vs "Atendente" nas Atividades do CRM
> — concluído e testado.** Pedido direto do usuário: na aba "Atividades" da ficha do lead
> (Kanban do CRM), destacar quando uma resposta ao lead foi dada pela IA em vez de por um
> atendente humano. Esclarecido via `AskUserQuestion` (2 perguntas, ambíguas o bastante pra
> justificar): (1) tela — confirmado "Aba Atividades do CRM", não a thread de conversa da
> Mensageria (que já tinha um badge parcial, só pra `sender_type='bot'`, nunca pra `'system'`
> nem com um badge explícito pro lado humano); (2) fontes que contam como "IA" — confirmado
> **ambas**: a reativação automática (G6, `reactivationExecutor.autoSendReactivation`) e o
> chatbot (M4.1, `botAdapter.maybeRunBot`).
>
> **Implementado:** `prisma/migration-2026-08-09-atividades-origem-ia.sql` (aplicada) —
> `atividades_lead.origem varchar(10) DEFAULT 'humano'` (CHECK `IN ('humano','ia')`) + seed de
> um tipo novo por tenant com Kanban configurado ("Resposta Automática (IA)", ícone
> `lucide-Bot`, cor `#c5a028`/gold-premium — mesmo acento de IA já usado em toda a plataforma,
> `is_entrada=false` porque é sempre ação NOSSA). `src/lib/crm/atividades/logAiAtividade.ts`
> (novo) — helper único e best-effort (nunca derruba o envio real se falhar), compartilhado
> pelos dois hooks: resolve `coluna_id` via `leads_kanban`, resolve o tipo "Resposta Automática
> (IA)" com cascata cliente→tenant, insere com `origem='ia'`/`usuario_id=NULL`. Chamado em 2
> pontos: `reactivationExecutor.autoSendReactivation()` (só no outcome `'sent'` — envio
> automático de verdade, não no caminho aprovado por humano) e `botAdapter.maybeRunBot()` (nos
> 3 formatos de resposta do bot — fallback, cards, texto plano — sempre que o contato já está
> vinculado a um lead real via `mensageria.contacts.lead_uuid`; a mensagem de handoff pra
> humano é deliberadamente excluída, não é uma resposta real). Deliberadamente **não** chama
> `touchPendency()` — os dois caminhos já enviam a mensagem via `ingestMessage()`, que já
> dispara esse gancho desde G0; duplicar aqui só arriscaria os dois divergirem no futuro.
> `AtividadesLead.tsx` — campo `origem` na interface + badge dourado "🤖 Agente de IA" no lugar
> do nome do atendente quando `origem==='ia'`, preservando o `· {usuario_nome}` de sempre pro
> caso humano (default).
>
> **Testado ao vivo, ponta a ponta, com dado real, tenant Marketing Digital** (lead de teste
> criado e removido depois): atividade humana via `POST /api/crm/atividades` real →
> `origem:'humano'`, badge de nome do atendente preservado. Bot (M4.1) — vinculado o contato
> de teste real do endpoint `/api/admin/mensageria/bot/test` ao lead de teste (simulando o que
> o Match Engine faz em produção) e mandada uma mensagem real pra inbox `webform` (canal sem
> risco de envio real — `deliverIfWhatsApp` só age em `channel_type==='whatsapp'`) → bot
> respondeu de verdade (LLM real) e gravou a atividade com `origem:'ia'`, `tipo_atividade_id`
> correto, `usuario_id` nulo, `coluna_id` resolvido certo. Reativação automática (G6) — como
> nenhum servidor Evolution real está acessível neste ambiente de dev (`localhost:8081`
> configurado na inbox real deste tenant não responde, confirmado antes de qualquer teste) e
> `outcome:'sent'` exige uma resposta HTTP 2xx real, subido um mock local
> (`scripts/mock-evolution-server.js`, script temporário, removido ao final) e apontada a
> inbox WhatsApp real do tenant pra ele **temporariamente** (config original capturado antes,
> restaurado byte-a-byte depois, confirmado por SQL) — inserida 1 `crm_agent_actions` real
> (`agent_key='reactivation'`) + chamada real de `autoSendReactivation()` via rota de API
> temporária (`src/app/api/test-autosend-tmp/`, removida ao final) → `outcome:'sent'` confirmado
> (mock recebeu o POST), `crm_agent_actions.status='EXECUTED'`, atividade gravada com
> `origem:'ia'` e a mensagem real da reativação na descrição. Toda infraestrutura de teste
> removida (mock server morto, rota deletada, script deletado); todo dado de teste removido
> (lead + kanban + atividades + ação, cascata confirmada `count(*)=0` em 4 tabelas); contato
> reusável de teste do bot (`mensageria.contacts`, tenant Marketing Digital) restaurado ao
> estado original (`lead_uuid=NULL`) — é reutilizado entre sessões de teste do admin, não
> deletado; a conversa de teste em si (com todo o histórico, inclusive um resíduo de uma
> sessão anterior nunca limpo) foi apagada via o próprio `DELETE` do endpoint real de teste.
> Credenciais reais de Evolution do tenant confirmadas restauradas (comparação byte-a-byte
> com o valor capturado antes do teste). `npx tsc --noEmit`: 0 erros (incluindo depois de
> remover a rota temporária — 1 artefato stale em `.next/types` referenciando o arquivo já
> deletado, removido manualmente, mesmo padrão de "cache do Next mascarando estado real" já
> documentado várias vezes neste arquivo).
>
> **Achado incidental, não relacionado ao trabalho desta rodada, registrado:** a conversa de
> teste reusável do bot (`/api/admin/mensageria/bot/test`, tenant Marketing Digital, telefone
> fixo `5500000000001`) tinha histórico de uma sessão de teste anterior nunca limpo (mensagens
> de 2026-07-20 sobre "troca de bateria de celular", visíveis ao reabrir a conversa nesta
> sessão) — resolvido de brinde ao apagar a conversa inteira via o `DELETE` real do endpoint,
> já que eu mesmo ia reutilizá-la e sujá-la mais.

> **Atualizado em:** 2026-08-08 — **Nova frente: Vigilância de Pendência de Atendimento
> ("de quem é a bola"). Plano completo escrito e aprovado; fase G0 (fundação) concluída e
> testada.** Nasceu de uma pergunta do usuário sobre o alcance real do F1
> (`speed_to_lead`): "e se o 3º ou 4º contato ficar sem resposta? E se o atendente adoecer ou
> ganhar na loteria?". A auditoria confirmou que a preocupação era muito maior do que a
> pergunta supunha — **três buracos independentes**, todos com a mesma raiz: *todo prazo que
> existe na plataforma é prazo de PRIMEIRO toque*.
>
> **Buraco A — lead sem dono nunca é reprocessado.** `DistributionEngine` pode não achar
> candidato; nesse caso `corretor_atribuido_id` fica NULL e o transbordo exige o contrário
> (`AND corretor_atribuido_id IS NOT NULL`). O F1 alerta uma vez e nunca mais. No banco: leads
> com telefone válido, sem dono, zero atividade, o mais antigo parado há 107 dias.
> **Buraco B — o caminho de atribuição MAIS COMUM nasce fora da rede.**
> `api/crm/leads/route.ts:272` grava `atribuicao_expira_em = NULL` quando a atribuição é para o
> dono do ativo ou plantonista — e `owner_of_asset` é a estratégia de prioridade 1 do segmento
> Imobiliário. É literalmente "o corretor dono da carteira adoeceu": todo lead dele apodrece em
> silêncio, permanentemente.
> **Buraco C — os três relógios existentes são todos de 1º toque:** F1 para de olhar na 1ª
> atividade; `scanAndAlertBreaches()` da Mensageria para na 1ª resposta (`first_response_at IS
> NULL`); `atribuicao_expira_em` é one-shot, nenhum endpoint renova.
> **Buraco D (achado pela lente nova) — o F4 despacha a ação errada:** mede
> `MAX(atividades_lead.created_at)` sem noção de direção, então um lead em que *o cliente
> escreveu e nós nunca respondemos* vira candidato a "mensagem de reativação" — mandaríamos um
> "sentimos sua falta" para quem está esperando resposta nossa.
>
> **Decisões do usuário (2026-08-08), com a moldura de missão que as justifica** ("a plataforma
> automatiza call centers com grande número de atendentes; não pode haver espera por decisão
> manual, e do 2º toque em diante o atendimento a lead parado tem que ser totalmente
> sistemático — seja a parada causada pelo cliente ou, principalmente, pelo atendente"):
> (1) existe estado de indisponibilidade temporária, que suspende a punição de SLA mas mantém e
> acelera a reatribuição — adoecer não é relaxar; (2) **nenhuma fila de aprovação** em degrau
> interno, tudo automático; (3) `is_entrada` no catálogo de atividades (mesmo remédio do
> `is_ganho`); (4) o F1 é **absorvido**, não coexiste — janela livre agora porque nenhum agente
> está ativado em produção.
>
> **Plano completo em `docs/PLANO_PENDENCIA_ATENDIMENTO.md`** — conceito unificador (um relógio
> por lead: bola com a gente / com o cliente / encerrado, este último já resolvido pelo
> `is_ganho`/`is_perda` de ontem), idempotência **por degrau por episódio de pendência** (a
> chave do episódio é o próprio `bola_desde`, sem tabela nova), fontes por módulo contratado
> via adapter (ninguém fica sem cobertura, ninguém é obrigado a contratar módulo), escada de
> escalonamento 100% automática terminando em reatribuição pelo `DistributionEngine` que já
> existe, e fases G0-G5.
>
> **G0 concluída e testada** (detalhe completo no §6.2 do plano): migração aplicada
> (`bola_com`/`bola_desde` + CHECKs + índices parciais, `tipos_atividade.is_entrada`,
> `users.indisponivel_ate`), regra canônica única em `src/lib/crm/pendencia/pendencyState.ts`,
> ganchos nos 6 caminhos de escrita reais, cron de reconciliação às 03:30, e `is_entrada` no
> CRUD do catálogo de atividades. **3 achados que só apareceram testando o caminho real:**
> (1) `ingest.ts` NÃO é o "ponto único de ingestão" que declara — o endpoint de resposta do
> atendente grava direto na tabela, e sem gancho dedicado o motor escalaria um lead recém
> respondido; (2) nota interna não pode devolver a bola (a 1ª versão contava qualquer
> `outbound`); (3) re-manifestação de lead existente não movia nada — resolvido usando
> `marketing_eventos` (1 linha por toque) como fonte. Testado ponta a ponta via APIs reais nos
> 8 cenários, backfill de 23 leads, reconciliação idempotente, todo dado de teste removido
> (`count(*)=0` em 7 tabelas), `npx tsc --noEmit`: 0 erros.
>
> **G1 concluída e testada na mesma sessão** (detalhe no §6.3 do plano): agente
> `pendencia_atendimento` com degraus 1-2, limiar distinto entre 1º contato (30min) e
> continuidade (240min), pulo direto pro escalonamento quando o responsável está indisponível,
> **idempotência por degrau por episódio** (chave = o próprio `bola_desde`, sem tabela nova) e
> **digest anti-flood** (uma notificação por tenant por rodada, agrupada por responsável, em vez
> de uma por lead — obrigatório na escala de call center). `speed_to_lead` (F1) foi absorvido e
> **removido do disco e do catálogo**: era o caso particular de ordinal 1 do mesmo relógio.
>
> **Mudança na página `/admin/master/segments`:** nenhuma na mecânica — o modal "Agentes de
> Aceleração" é genérico desde F0 e deriva de `CRM_AGENT_CATALOG`, então o agente novo aparece
> sozinho (com seus 3 `paramHints` como chips clicáveis) e o antigo some sozinho. A única edição
> foi no painel de Ajuda, que tem um bloco de texto por `agent.key` — aproveitado para escrever
> também o bloco do `score_recalibration`, que caía no fallback genérico desde F5.
>
> **Testado ao vivo, 10 cenários** (tenant Marketing Digital, canais Evolution/Slack reais
> nulados antes de cada varredura e restaurados ao valor exato depois): degrau 1 aos 45min ·
> degrau 2 direto às 5h · lead de 2min não dispara · responsável indisponível pula pro degrau 2 ·
> 2ª varredura imediata `fired:0` · progressão 1→2 sem repetir · bola devolvida sai da vigilância ·
> **cliente volta e passam 45min → não dispara** (limiar agora é o de continuidade) · **cliente
> volta e passam 5h → degrau 1 DE NOVO com `ehPrimeiroContato:false`** (o rearme, que responde
> exatamente à pergunta que originou a frente) · 23 disparos numa rodada → `digests: 1`.
>
> **O que a 1ª varredura revelou:** além dos 4 leads de teste, o motor capturou **19 leads
> parados entre 231h e 839h** — leads sobre os quais nenhum mecanismo da plataforma jamais teria
> levantado a mão. São os Buracos A e C, agora visíveis.
>
> **Armadilha de teste registrada (2ª vez nesta base, a 1ª foi em F2):** backdatar `bola_desde`
> sem mover junto as ações do episódio anterior cria linha do tempo impossível e faz a
> idempotência parecer quebrada. Em produção não ocorre (episódio novo sempre começa em `now()`).
>
> **Limpeza:** todo dado de teste removido, canais restaurados (confirmado por SQL), reconciliação
> final `corrigidos: 0`, `npx tsc --noEmit` 0 erros. Aproveitado para remover os 15 leads
> `TESTE PAGINACAO` — pendência minha registrada desde 2026-07-29, agora fechada.
>
> **G2 concluída e testada na mesma sessão** (detalhe no §6.4 do plano) — o degrau que transforma
> o motor de *alarme* em *correção*, **sem migração nova**: reaproveita integralmente o
> `DistributionEngine` e o catálogo de estratégias por segmento. Entregue: filtro de
> indisponibilidade nas **4 estratégias de distribuição** (cobre de uma vez captação inicial,
> transbordo e reatribuição — não só o caminho deste agente); `CrmAgent.execute?()` (contrato
> novo — o agente declara seu efeito colateral real, o runner chama sem saber o que é);
> `src/lib/crm/pendencia/reassignExecutor.ts`; degrau 3 com `fator_reatribuicao` (default 6); o
> digest passa a mostrar o que a máquina corrigiu sozinha. Guarda-corpo deliberado:
> `limiarReatribuicao = max(limiarBase × fator, limiarEscalonamento + 1)` — reatribuir antes de
> ter avisado alguém seria tirar o lead pelas costas do responsável.
>
> **Testado ao vivo:** lead parado 200min com responsável **de atestado** → reatribuído
> (Fernanda → Roberto) · **penalidade de SLA nunca chamada** na pessoa ausente (ela não tem
> sequer linha em `corretor_scores`) · indisponível não recebeu nenhum dos 6 leads
> reatribuídos · histórico de atribuição com as 2 linhas certas · **todos** os atendentes
> indisponíveis → não crasha, relata "sem atendente disponível" e o lead segue pendente.
>
> **O teste explicou o Buraco A concretamente:** os 2 usuários do tenant não têm linha em
> `user_role_assignments`, e as 4 estratégias filtram por ele — por isso o `DistributionEngine`
> nunca achou candidato e 21 leads ficaram órfãos. Não é bug do motor, é configuração de acesso
> incompleta daquele tenant — mas prova que a fila de resgate visível (degrau 4, G3) é
> indispensável, porque hoje esse estado é silencioso. Com os papéis corrigidos no teste, **os 5
> leads órfãos reais (sem dono há 34–107 dias) ganharam responsável automaticamente** — Buraco A
> corrigido de fato, não só alertado; todos revertidos ao estado original na limpeza.
>
> **G3 concluída e testada na mesma sessão** (detalhe no §6.5 do plano) — e a primeira
> descoberta foi que **o Buraco B não precisava de conserto, e "consertá-lo" teria sido o erro**:
> `atribuicao_expira_em` significa *prazo de ACEITE*, e lead auto-aceito corretamente não tem
> prazo pendente — dar valor a ele faria o transbordo reatribuir um lead que FOI aceito. O motor
> de pendência não referencia esse campo (é dirigido só por `bola_com`/`bola_desde`), então já
> cobre o caso por um mecanismo melhor. Confirmado ao vivo com um lead nesse exato estado.
>
> **Entregue:** `rescueQueue.ts` (`runRescueRetries()` + `getRescueQueue()`), retentativa plugada
> no cron de varredura rodando **antes** dela, degrau 4 no agente,
> `GET /api/crm/pendencia/resgate` (UI fica pra G4), marca 🆘 no digest. **Duas cadências de
> propósito:** retentar atribuição a cada rodada (o lead precisa sair da fila no minuto em que
> alguém ficar disponível); alertar sobre a fila uma vez por episódio.
>
> **2 achados reais que só apareceram testando, ambos corrigidos:** (1) a escada esgotada era
> **herdada** pelo novo responsável — depois de uma reatribuição, todos os degraus já haviam
> disparado e o novo dono ficava sem relógio nenhum; corrigido movendo a janela de idempotência
> para `GREATEST(bola_desde, última reatribuição)`. (2) Com esse fix, o lead **quicaria entre
> atendentes** — reatribuído após 400min, disparava o degrau 3 no instante seguinte e seria
> repassado de novo, cada pessoa perdendo o lead antes de ter tido chance real; corrigido
> separando **dois relógios**: `minutosParado` (espera REAL do cliente) governa o texto das
> mensagens, `minutosNaJanela` (tempo sob o responsável atual) governa os degraus. `bola_desde`
> nunca é resetado — resetá-lo faria a plataforma subestimar a espera real da pessoa.
>
> **Testado ao vivo:** órfão → degrau 3 (reatribuição falha) → degrau 4 · fila via API real
> (`total:7, semResponsavel:6`) · **um atendente fica elegível → `resgate: {examinados:8,
> atribuidos:6}`** e a fila de órfãos esvazia sozinha (Buraco A fechado) · leads recém-reatribuídos
> não disparam de novo. Limpeza completa, canais restaurados, `tsc` 0 erros.
>
> **G4 concluída e testada na mesma sessão** (detalhe no §6.6 do plano). **Config dos degraus não
> precisou de nada novo** — os 4 parâmetros já são editáveis pelo editor genérico que existe desde
> F0 (`/admin/master/segments` → "Agentes de Aceleração" e `/crm/config/agentes`, ambos derivando
> de `paramHints`). A UI nova é só o que não tinha superfície nenhuma:
> `PATCH /api/admin/usuarios/[id]/disponibilidade` (endpoint dedicado, não campo no formulário de
> edição — marcar atestado é ação operacional, não edição de cadastro; valida data futura e
> confirma que o usuário é do tenant de quem pede) · badge "AUSENTE" + botão "Ausência"/"Liberar"
> em `/admin/usuarios`, com modal que **exige data de retorno** em vez de booleano (toggle sem
> prazo depende de alguém lembrar de desmarcar; com data a pessoa volta sozinha) · página
> `/crm/resgate` + migração de sidebar na categoria **CRM** (operação, não configuração),
> deliberadamente somente-leitura porque o sistema já retenta sozinho — o que a tela entrega é o
> DIAGNÓSTICO, já que a saída costuma estar fora do CRM.
>
> **Bug real encontrado testando a UI de verdade:** o badge "AUSENTE" não aparecia — eu o tinha
> colocado dentro do bloco que só renderiza para `role_name === 'Corretor'`, e a atendente de teste
> tem o cargo "Atendente". É exatamente a suposição por vertical que esta frente vem removendo (o
> cargo de distribuição é configurável por segmento via `distribution_role_name`). Movido para fora
> do bloco.
>
> **Testado ao vivo:** ausência via endpoint real ✅ · data no passado → 400 ✅ · usuário de outro
> tenant → 404 ✅ · **efeito real na distribuição** (ausente e única com o cargo → `atribuidos:0`;
> liberada pelo mesmo endpoint → `atribuidos:1` e o lead ganha dona) ✅ · sidebar confirmada pela
> função real do banco ✅ · página renderizando KPIs, badges e tempo de espera ✅.
>
> **G5 concluída e testada na mesma sessão — a frente está formalmente completa** (§6.7/§6.8 do
> plano). `reactivationAgent` deixa de medir `MAX(atividades_lead.created_at)` (sem noção de
> direção) e passa a ler o estado: candidato é lead com `bola_com='cliente'`, e o silêncio conta
> desde `bola_desde` — o silêncio DELE, não "a última coisa que aconteceu no lead". `evaluate()`
> revalida a bola antes de propor (ela pode ter voltado pra nós entre a varredura e a avaliação).
> Duas simplificações de brinde: o piso de 6h vira silêncio do cliente, e a exclusão de etapa
> terminal some do agente — lead ganho/perdido já tem `bola_com` NULL pelo motor canônico.
>
> **Testado com dois leads de contraste, ambos parados há 10 dias, sobre os MESMOS dados:** com a
> lógica ANTIGA os dois virariam candidatos — inclusive o que espera resposta NOSSA, que receberia
> um "sentimos sua falta"; com a NOVA, só o lead em que o cliente sumiu. A falha foi demonstrada
> lado a lado, não assumida. **Domínios disjuntos provados na mesma rodada:** o lead esperando
> nossa resposta foi capturado por `pendencia_atendimento` (degrau 3) e o lead do cliente sumido
> **não foi tocado** por ele — um relógio, duas direções, ações opostas.
>
> **Os 4 buracos do §1 estão fechados:** A (G3), B (já coberto por G1/G2, sem precisar de
> conserto), C (G0/G1), D (G5).
>
> **G6 — reativação automática (a pendência do §8, decidida e implementada na mesma sessão).**
> Usuário: "não espera decisão manual". O `type` do F4 deixou de ser fixo e passou a refletir o
> que de fato acontece: **sem** `requer_revisao_extra` → `DEFENSIVE`, o `execute()` **envia
> sozinho** e o tenant é notificado depois com o texto exato; **com** a flag → `OFFENSIVE`,
> `PENDING_APPROVAL` + PIN, fluxo de F4 intocado. O freio virou o que sempre deveria ter sido:
> a chave que separa segmento comum de segmento regulado. O envio real foi extraído para
> `deliverReactivation()`, compartilhado pelos dois caminhos ("quem autorizou" separado de "como
> se entrega"); `CrmAgent.execute()` passou a receber o `actionId`; e a notificação 1:1 agora
> inclui `🤖 Ação automática:` + o texto integral enviado — sem isso o tenant descobriria só
> depois que uma mensagem saiu para o cliente dele.
>
> **Testado com LLM real e credenciais de envio deliberadamente neutralizadas:** sem a flag →
> `DEFENSIVE`/`EXECUTED` com mensagem real da IA, e linha `outbound`/`system` em
> `mensageria.messages` com `delivery_status: failed` (falha esperada e **segura** — nada chegou
> a telefone real) · com a flag → `OFFENSIVE`/`PENDING_APPROVAL`+PIN e **zero** contatos criados,
> provando que nem a tentativa de envio acontece. Texto de Ajuda do Master reescrito (dizia "a
> mensagem nunca sai sozinha", o que passou a ser falso por padrão).
>
> **Nada está ativado em produção** — todos os agentes nascem desligados; ativar por segmento e
> escolher os limiares reais é decisão de negócio do usuário/Master. ⚠️ **`reactivation` é o
> único agente que fala com o cliente sem passar por ninguém** — antes de ligá-lo num segmento,
> decidir conscientemente se aquele segmento precisa de `requer_revisao_extra=true`.

> **Atualizado em:** 2026-08-07 (continuação) — **Hardening real de agnosticismo de
> segmento: etapa de Ganho/Perda do Kanban vira atributo booleano explícito, não mais
> inferido do nome da coluna.** Usuário, revisando o texto do botão "Ajuda" dos Agentes de
> Aceleração (que citava "Imobiliário" como exemplo dinâmico), questionou diretamente se
> toda a lógica dos 5 agentes foi de fato implementada agnosticamente a qualquer segmento
> de negócio — não assumido, auditado via grep em todo `src/`. Confirmado que os 5 agentes
> em si (catálogo, `evaluate()`, `findCandidates()`, resolução de config efetiva) não têm
> nenhum branch por slug/nome de segmento. **Achado real, porém, num nível mais baixo:** 4
> consumidores (`revenueAttributionService.ts` — CPA/ROAS real da Visão 4 de Campanhas;
> `scoreRecalibrationService.ts` — F5; `reactivationAgent.ts` — F4, exclusão de leads já em
> etapa terminal; `api/crm/analytics/roi/route.ts`, 4 ocorrências) reconheciam "negócio
> fechado"/"perdido" só comparando `kanban_colunas.nome` contra os literais
> `'fechamento'`/`'perdido'` — o mesmo `nome` que `/api/crm/kanban/colunas` (POST) sempre
> permitiu qualquer tenant editar livremente, sem nenhum aviso de que aquele texto também
> carregava um significado oculto de ciclo de vida do negócio. Um tenant de um segmento
> não-imobiliário (ou até um tenant Imobiliário) renomeando sua etapa de vitória pra um
> termo natural do próprio negócio ("Contrato Assinado", "Venda Concluída") quebraria
> silenciosamente CPA/ROAS real, a recalibração de score e a elegibilidade de reativação de
> lead — sem nenhum erro visível, só dado errado. Usuário propôs a correção diretamente:
> 2 atributos booleanos (`is_ganho`/`is_perda`) na configuração da etapa do Kanban,
> editáveis pelo próprio tenant, com os agentes/relatórios passando a se basear neles em
> vez do nome.
>
> **Implementado:** `prisma/migration-2026-08-07-kanban-etapa-ganho-perda.sql` (aplicada) —
> `kanban_colunas.is_ganho`/`is_perda` (boolean, default false) + backfill preservando
> exatamente o comportamento implícito de antes (`is_ganho=true WHERE nome='fechamento'`,
> idem `perdido`) + CHECK de mútua exclusão (`NOT (is_ganho AND is_perda)`). Seed de tenant
> novo (`api/admin/master/tenants/route.ts`) atualizado pra já gravar os 2 flags corretos na
> criação, não só via backfill histórico. `api/crm/kanban/colunas/route.ts` (POST, INSERT e
> UPDATE) passa a aceitar/persistir os 2 campos, com a mesma validação de mútua exclusão
> replicada no servidor (400 explícito se os dois vierem `true` juntos — nunca confia só na
> UI). `/crm/config/kanban` (Personalização Kanban) ganhou a seção "Etapa Terminal
> (opcional)" no modal de edição — 2 checkboxes com mútua exclusão automática no cliente +
> nota explicando que é esse atributo, não o nome, que os Agentes/relatórios usam — e um
> badge "GANHO"/"PERDA" na tabela ao lado do título de exibição de cada etapa. Os 4
> consumidores migrados de `kc.nome = 'fechamento'` pra `kc.is_ganho = true` (mecânico,
> mesma semântica); `reactivationAgent.ts` perdeu o array `ETAPAS_TERMINAIS` — a exclusão de
> leads em etapa terminal virou `kc.is_ganho IS NOT TRUE AND kc.is_perda IS NOT TRUE`
> (`IS NOT TRUE` em vez de `<> true`/`= false` porque a query usa `LEFT JOIN` até
> `kanban_colunas` — lead sem nenhuma etapa registrada tem `kc` inteiro `NULL`, e
> `NULL IS NOT TRUE` avalia corretamente como verdadeiro, mantendo esse lead elegível).
>
> **Testado ao vivo, ponta a ponta, provando a vulnerabilidade original e a correção juntas**
> (tenant Marketing Digital, lead de teste real): inserido lead com `valor_venda=R$500.000`
> na etapa `id=35` ("fechamento", `is_ganho=true`) → **renomeado o `nome` da etapa** pra
> `'Negocio_Ganho_Renomeado_TESTE'` (simulando exatamente a ação que um tenant tem liberdade
> de fazer hoje) → SQL com a lógica ANTIGA (`kc.nome = 'fechamento'`) voltou `0` vendas/R$0 —
> confirma a vulnerabilidade real, não hipotética; SQL com a lógica NOVA (`kc.is_ganho =
> true`) continuou retornando `1` venda/R$500.000,00 corretamente, e a query de
> `reactivationAgent.findCandidates` corretamente **excluiu** esse lead da elegibilidade de
> reativação (0 candidatos), mesmo com o nome já não batendo mais com nada hardcoded.
> Testado também via API real (`POST /api/crm/kanban/colunas` com JWT real do tenant):
> `is_ganho:true` + `is_perda:true` juntos → 400 "Uma etapa não pode ser Ganho e Perda ao
> mesmo tempo" · rename revertido pra `'fechamento'` pela mesma API, mantendo `is_ganho:true`
> intacto · sessão real no navegador (JWT+cookie+localStorage injetados): tabela real
> renderizou os badges "GANHO"/"PERDA" nas etapas certas; modal de edição abriu com os
> checkboxes refletindo o estado real do banco (Ganho marcado, Perda desmarcado); clique real
> (trusted, via `computer` tool — um `dispatchEvent` sintético forçado não bastou, só um
> clique de verdade aciona o `onChange` controlado do React corretamente) no checkbox
> "Etapa de Perda" desmarcou automaticamente "Etapa de Ganho" no cliente, confirmando a
> mútua exclusão também na UI; modal fechado sem salvar, confirmado por SQL que nada mudou
> no banco. Todo dado de teste removido (lead + kanban), `count(*)=0` confirmado. `npx tsc
> --noEmit`: 0 erros.
>
> **Decisão consciente de escopo:** `src/app/api/crm/analytics/roi/route.ts` tem outros
> problemas pré-existentes e não relacionados (usa uma tabela de config legada
> `crm_segmentos_config`/`domain_id` diferente do `system_segments`/`resolveSegment` já
> padronizado no resto da plataforma, e não filtra por `tenant_id` em nenhuma query) — fora
> de escopo desta rodada, só a troca mecânica `nome='fechamento'`→`is_ganho=true` foi feita
> ali, registrado aqui como pendência real a investigar numa sessão futura se essa rota
> ainda for usada por alguma tela.

> **Atualizado em:** 2026-08-07 — **F0 a F5 dos Agentes de Aceleração do CRM concluídas e
> testadas — `docs/PLANO_AGENTES_ACELERACAO_CRM.md` está formalmente completo, os 5 agentes
> implementados.** F4 (Reativação) foi o 1º agente `OFFENSIVE` de verdade do catálogo (fala
> diretamente com o lead, exige aprovação humana PIN+WhatsApp); F5 (Recalibração de Score),
> concluída na sequência na mesma sessão, é o único agente que opera sobre REGRAS em vez de
> leads — reordena por conversão real (automático) e sugere ajuste de score (aprovação
> 1-clique). Implementação iniciada numa sessão anterior (plano aprovado antes, nunca
> implementado até então). Usuário pediu relato passo-a-passo das fases antes de começar;
> confirmou F4 ganharia trava extra por segmento sensível (Saúde) e pediu esclarecimento sobre
> F1 — nesse esclarecimento, achado real: o catálogo original marcava `speed_to_lead` como
> `ON_LEAD_CREATED`, mas isso não funciona sozinho (no instante da criação, "0 minutos se
> passaram" sempre) — corrigido no plano pra registrar que F1 na prática precisa ser uma
> varredura por cron, mesmo padrão já usado pelo `sla-check` da Mensageria. Usuário confirmou
> seguir com F0, depois "prossiga" fase a fase até F5 (ver resumo completo de F4 e F5 logo
> abaixo, após F0-F3).
>
> **F5 — Recalibração de Score: ✅ concluída e testada.** Achado real que muda o desenho
> literal do plano original: o editor do Master/tenant faz **replace-all** (DELETE+reinsert) a
> cada save de `crm_qualificacao_regras_segmento`/`_tenant` — guardar as estatísticas de
> conversão como COLUNAS da própria regra (como o plano original propunha) seria apagado no
> próximo save, mesmo sem nenhuma mudança de conteúdo. Corrigido: estatísticas SEMPRE
> computadas ao vivo por `(escopo, tag_resultante)` — nunca persistidas — em
> `src/lib/crm/agents/scoreRecalibrationService.ts`. Único agente que não opera por lead (opera
> sobre regras) — por isso tem fila própria, `crm_score_recalibration_suggestions` (não
> reaproveita `crm_agent_actions`, que exige `lead_uuid`), aprovação 1-clique in-app (sem PIN —
> Master/tenant já autenticado na mesma tela). Job diário dedicado
> (`POST /api/cron/crm/score-recalibration`, 04h, separado do scan de 5 em 5 min dos outros 4
> agentes) reordena `ordem` das regras pela conversão real (automático, sem aprovação — só
> prioridade interna de match, `ConciergeService` já usa essa coluna) e gera sugestão de ajuste
> de score quando a divergência é grande. Decisão sempre resolve a regra pelo `tag_resultante`
> real (nunca pelo `rule_id` bruto, tolerante ao replace-all) — regra já deletada/editada entre
> a sugestão nascer e ser decidida vira `outcome:'stale'`, nunca crasha.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
> Imobiliário): 3 regras de teste inseridas via SQL direto (nunca pelo replace-all do Master,
> pra não arriscar as 7 regras reais de produção) + 1 regra via a API real do tenant — 40 leads
> reais (10% conversão, forte divergência de `score_base=9`) — cron real gerou as sugestões e
> reordenou (as 7 regras reais preservaram sua ordem RELATIVA entre si, sort estável) —
> caminhos aplicar/descartar/stale/ownership todos confirmados nos dois escopos (segmento via
> Master, tenant via `/crm/config/ia`) — UI real, clique em "Aplicar" no navegador persistiu o
> novo score no banco. Todo dado de teste removido e a **ordem original das 7 regras reais de
> produção restaurada byte-a-byte** (confirmado por diff contra snapshot). `npx tsc --noEmit`:
> 0 erros.
>
> **Implementado** (`prisma/migration-2026-08-06-crm-agentes-f0.sql`, aplicada):
> `crm_agentes_config_segmento` (sem `tenant_id` — mesmo modelo, já comprovado, de
> `crm_qualificacao_regras_segmento`/`system_benchmarks`), `crm_agentes_config_tenant`
> (`tenant_id` sempre real), `crm_agent_actions` (mirror de
> `campanhasmarketingdigital."AgentAction"`, mesma taxonomia DEFENSIVE/OFFENSIVE + PIN de
> aprovação já validada em produção no módulo de Campanhas). `src/lib/crm/agents/types.ts`
> (`CrmAgentContext`/`CrmAgentResult`/`CrmAgent`, mesmo molde de
> `src/lib/routing/strategies/types.ts`) + `src/lib/crm/agents/index.ts`
> (`CRM_AGENTS`/`CRM_AGENT_CATALOG`) — **deliberadamente vazios nesta fase**: nenhum agente
> real existe ainda (cada fase F1-F5 registra 1 entrada), então a API/UI nunca expõe um toggle
> "de mentira" pra capacidade que ainda não roda de verdade — mesma disciplina já usada no
> gate `crm_ia_ativa` (sessão de 2026-08-04). `GET/PUT /api/admin/master/segments/[id]/agentes`
> (PUT valida `agent_key` contra o catálogo, rejeita qualquer chave não registrada) +
> `SegmentAgentesModal.tsx` + botão "Agentes de Aceleração" (ícone raio, laranja) em
> `/admin/master/segments`.
>
> **Testado ao vivo:** `GET .../agentes` retorna `{catalog:[], config:[]}` pro segmento
> Imobiliário · `PUT` com `agent_key:"speed_to_lead"` (ainda não registrado) → 400 explícito,
> confirma que nenhuma fase futura pode ser "ligada" antes de existir de verdade · sem cookie
> → 403 · segmento inexistente → 404 · sessão Master real no navegador: os 6 botões "Agentes
> de Aceleração" renderizam (1 por segmento), modal abre mostrando honestamente "Nenhum
> agente disponível ainda" (não uma lista vazia sem explicação) + botão Salvar desabilitado
> enquanto o catálogo estiver vazio. `npx tsc --noEmit`: 0 erros em todos os arquivos
> novos/tocados.
>
> **F0.5 — Score de Fit (ICP): ✅ concluída e testada, mesma sessão.**
> `prisma/migration-2026-08-06-crm-fit-f05.sql` (aplicada) — `crm_fit_criterios_segmento`
> (sem `tenant_id`) + `crm_fit_criterios_tenant` (`tenant_id` sempre real), mesma dupla camada
> já validada em `crm_qualificacao_regras_*`; `leads_staging.score_fit INTEGER` (aditivo);
> as 2 linhas de `crm_lead_qualification` (global + Imobiliário) ganham a seção
> `{{criterios_fit}}` + o 4º campo `score_fit` no JSON de saída — mesma 1 chamada de LLM que
> já resolve `score_prontidao`, agora resolve os 2 juntos. `ConciergeService.qualifyLead()`
> busca critérios (tenant+segmento) em paralelo com as regras, injeta no prompt, parseia
> `score_fit` (clamp 0-10) — fallback por palavra-chave nunca inventa fit (sempre `null`).
> `GET/PUT /api/admin/master/segments/[id]/fit-criteria` + `SegmentFitCriteriaModal.tsx` +
> botão "Critérios de Fit (ICP)" em `/admin/master/segments`. `/api/crm/config/ia` +
> `/crm/config/ia` ganham "Critérios de Fit do Segmento" (leitura) + "Seus Critérios de Fit"
> (CRUD do tenant).
>
> **2 achados reais no processo, ambos corrigidos:**
> 1. `/crm/kanban` — a ficha do lead tinha um tile **"IPVE"** que sempre foi um número
>    **fabricado** (`score_prontidao + 15`, sem nenhum dado real por trás, resíduo de antes
>    desta sessão) — substituído pelo tile real "Fit". Card do Kanban ganha `· Xx Fit` só
>    quando `score_fit` existe de verdade (nunca um chip vazio/fabricado pros leads antigos).
> 2. Com Gemini (`gemini-flash-latest`, provider real do tenant de teste), o JSON de resposta
>    veio truncado no meio repetidas vezes depois que o prompt ganhou a 2ª dimensão de
>    julgamento — `maxTokens` subiu de 500 pra 700 (prompt objetivamente mais longo/complexo
>    agora). Confirmado que, mesmo truncando, o sistema nunca fabrica `score_fit` — cai pro
>    fallback por regra corretamente. Testado com Groq (`llama-3.3-70b-versatile`) que a
>    chamada completa (JSON limpo) retorna `score_fit` certo.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
> Imobiliário): `POST /api/crm/leads` real → `score_prontidao=90`/`score_fit=80` persistidos
> (mesma convenção `×10` de `score_prontidao`) · `GET /api/crm/leads` expõe `score_fit` ·
> Master criou/consultou critérios reais via API e no modal (navegador, sessão real) · tenant
> criou/removeu critério próprio via `/crm/config/ia` (API + navegador) · Kanban real
> (navegador): card mostrou `"90% Match · 80% Fit"`, demais leads reais (sem fit) mostraram só
> `"50% Match"`, sem chip fabricado · ficha do lead mostrou "Intenção 90%"/"Fit 80%" reais,
> "IPVE" confirmado ausente. Todo dado de teste removido (lead + 2 critérios de segmento + 1
> de tenant), `count(*)=0` confirmado nas 3 tabelas. `npx tsc --noEmit`: 0 erros.
>
> **Incidente registrado, resolvido:** ao testar contra Groq, sobrescrevi
> `Settings.llmApiKey` do tenant de teste sem capturar o valor original primeiro — recuperado
> com alta confiança (mesmo comprimento do `GEMINI_API_KEY` global do `.env`, plausível já que
> é o tenant de desenvolvimento da própria plataforma) e **verificado funcionalmente**
> (chamada real à API do Gemini autenticou com sucesso) antes de seguir. Lição: sempre
> capturar o valor completo de uma credencial real antes de sobrescrever pra teste, não só
> metadados (provider/model/tamanho).
>
> **F1 — Velocidade de 1º Contato: ✅ concluída e testada, mesma sessão. Primeiro agente real
> do catálogo.** `src/lib/crm/agents/speedToLeadAgent.ts` — sem LLM, `trigger:
> 'SCHEDULED_SCAN'` (corrigido do `ON_LEAD_CREATED` original — achado da rodada anterior:
> no instante da criação "0 minutos se passaram" sempre, não dá pra saber se vai estourar o
> prazo). `evaluate(ctx)` julga 1 lead: dispara `DEFENSIVE` quando não há `atividades_lead`
> real há mais de `params.minutos_alerta` (fallback de código = 30min só quando ativo sem
> valor configurado). `src/lib/crm/agents/runner.ts` (`runCrmAgentScans`) acha candidatos com
> 1 query global (últimas 48h, sem atividade, sem ação já registrada — mesma disciplina de
> idempotência do `scanAndAlertBreaches()` da Mensageria), resolve config efetiva por tenant
> (override > default do segmento, cache em memória por rodada), e quando dispara grava
> `crm_agent_actions` + notifica via `notifyWhatsApp`/`notifySlack` — **mesmas funções já
> usadas pelos agentes de Campanhas e pelo SLA da Mensageria**, notificam o WhatsApp/Slack do
> TENANT (não um número pessoal de corretor — esse canal não existe em nenhum lugar da
> plataforma hoje; reusar o canal já provado é mais seguro que inventar um novo nesta fase).
> `POST /api/cron/crm/agentes-scan` (novo, `x-cron-secret`) — mesmo padrão exato do
> `/api/cron/mensageria/sla-check`; registrado em `scripts/feed-cron-scheduler.js`, a cada 5
> minutos.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
> Imobiliário, `minutos_alerta:1` só pra acelerar o teste): 4 leads reais — sem atividade e
> backdatado 5min → disparou; sem atividade que envelheceu ~2min durante o próprio teste →
> disparou; recém-criado (segundos) → não disparou, ainda dentro do prazo; com atividade real
> registrada e backdatado 5min → nunca virou candidato (excluído já na query SQL, nem chega a
> chamar `evaluate()`). Scan re-rodado uma 2ª vez → `fired:0`, `count(*)` confirma zero linha
> duplicada (idempotência). `crm_agent_actions` só tinha as 2 linhas esperadas em toda a base
> — confirma que nenhum outro tenant/lead real foi afetado (o agente só estava ativo pro
> tenant/segmento de teste). Todo dado de teste removido (leads + kanban + atividade, cascata
> confirmada), toggle do Master revertido pra `ativo:false` — decisão de ativar de verdade +
> escolher `minutos_alerta` real fica com o usuário/Master, não decidida nesta sessão.
> `npx tsc --noEmit`: 0 erros.
>
> **F2 — Estagnação por Etapa: ✅ concluída e testada, mesma sessão. 2º agente real do
> catálogo.** `src/lib/crm/agents/stageStagnationAgent.ts` — sem LLM, reaproveita 3 coisas que
> já existiam e nunca tinham sido ligadas a nenhuma ação: `kanban_colunas.sla_hours` (já por
> etapa, já por tenant, default 24h — feature "Personalização Kanban", nunca antes consumida
> por nada), `leads_kanban_ciclos.data_entrada` do ciclo aberto (`data_saida IS NULL` = etapa
> atual do lead), e `atividades_lead` desde que entrou na etapa (toque humano recente cancela
> o alerta mesmo com SLA técnico estourado). Coluna sem `sla_hours` nunca gera candidato.
> **Idempotência escopada ao CICLO** (diferente de F1, que é por lead pra sempre) — uma ação
> antiga de uma etapa anterior não bloqueia um alerta novo quando o lead avança e estagna de
> novo numa etapa diferente.
>
> **Runner generalizado** (`src/lib/crm/agents/runner.ts`) — antes hardcoded só pro
> `speed_to_lead`, agora itera qualquer agente `SCHEDULED_SCAN` com `findCandidates()`
> (método novo, opcional, em `CrmAgent`/`types.ts`) — cada agente sabe achar os próprios
> candidatos com a própria condição, o runner só orquestra. `speedToLeadAgent.ts` também
> migrado pro novo formato.
>
> **Bug real encontrado e corrigido durante o teste ao vivo:** `leads_kanban_ciclos` tem
> colunas `tenant_id`/`client_id` no schema, mas o trigger que a popula
> (`trg_log_kanban_ciclos`) nunca as preenche — ficam sempre `NULL`. A 1ª versão do
> `findCandidates()` lia esses campos direto de `leads_kanban_ciclos` — resultado: todo
> candidato vinha com `tenantId: null`, `resolveSegment` sempre retornava `null`, e o agente
> nunca disparava pra ninguém (`scanned:9, fired:0` no 1º teste). Corrigido com `JOIN
> leads_staging` pra pegar o tenant/cliente reais (fonte confiável, mesma usada por F1).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, coluna real
> "Lead Captado", `sla_hours=2`, ativado só via override de tenant): lead sem atividade,
> ciclo backdatado 3h → disparou (`"Lead parado em 'Lead Captado' há 3h"`) · lead com
> atividade real registrada 1h após a entrada na etapa → nunca virou candidato · lead com
> ciclo backdatado só 30min (dentro do SLA de 2h) → não disparou · scan re-rodado → `fired:0`,
> sem duplicata · **teste de idempotência por ciclo**: o lead estagnado movido pra uma 2ª
> coluna real ("Em Análise", `sla_hours=4`), backdatado com timestamps internamente coerentes
> (ação antiga movida pra 10 dias atrás, novo ciclo pra 9 dias atrás — necessário porque um
> backdate solto de poucas horas cria ordem cronológica impossível numa sessão de teste de
> minutos) → disparou um 2º alerta independente pra etapa nova, sem apagar nem duplicar o da
> etapa anterior · coluna real sem nenhum lead antes do teste, com `sla_hours` zerado pra
> `NULL` temporariamente + lead backdatado 100h → nunca virou candidato, `sla_hours` restaurado
> logo em seguida · confirmado sem efeito em nenhum outro tenant (`crm_agent_actions` só com
> linhas do tenant de teste). **Cuidado real tomado, não hipotético:** o tenant de teste tem
> `slack_webhook_url`/`evolution_api_url` REAIS — como o scan também processa leads
> genuinamente antigos já estagnados que já existiam no banco (ex. o lead real "Roberto
> Severo"), os 2 canais foram temporariamente nulados antes de cada rodada de scan e
> restaurados ao valor real exato depois, confirmado via SQL. Todo dado de teste removido (3
> leads + cascata, as 7 linhas de `crm_agent_actions` geradas — incluindo as dos 5 leads reais
> pré-existentes também genuinamente estagnados — removidas por completo, override de tenant
> removido, `count(*)=0` em todas as tabelas tocadas). `npx tsc --noEmit`: 0 erros.
>
> **F3 — Next Best Action: ✅ concluída e testada, mesma sessão. 1º agente com LLM do
> catálogo.** Trigger real `ON_STAGE_CHANGE` (+ sob demanda) — diferente de F1/F2, nunca
> `SCHEDULED_SCAN`, então `nextBestActionAgent.ts` não tem `findCandidates()` (não faz sentido
> varrer todos os leads a cada 5min pra sugerir a próxima ação de cada um, é sempre "este lead
> específico, agora"). A resolução de config efetiva (tenant override > default do segmento)
> foi extraída de `runner.ts` pra `src/lib/crm/agents/effectiveConfig.ts`
> (`resolveEffectiveAgentConfig`), compartilhada entre o loop de scan (que envolve com cache
> por-rodada) e o fluxo de 1-lead-por-vez de F3 (sem cache).
>
> `type: 'INFORMATIVE'` — novo valor no union de `CrmAgentResult.type`, ao lado de
> `DEFENSIVE`/`OFFENSIVE`: nunca dispara WhatsApp/Slack, nunca exige PIN, é só uma sugestão de
> texto reaproveitando `crm_agent_actions` (sem tabela nova) — coluna `type` alargada de
> `varchar(10)` pra `varchar(20)` na migração desta fase (`INFORMATIVE` tem 11 chars).
> `nextBestActionAgent.ts` monta o contexto real do lead (etapa atual + tempo nela via
> `leads_kanban_ciclos`, qualificação já existente, N atividades mais recentes) e chama
> `getLlmClient(tenantId)` com o Prompt Mestre do segmento (`crm_agent_next_best_action`,
> cascata segmento→global igual `crm_lead_qualification`) — resposta é texto livre (1-3
> frases), não JSON.
>
> **Achado do usuário, corrigido na mesma sessão — `LIMIT 5` cravado direto na query:** a 1ª
> versão tinha o número de atividades de contexto fixo no código, quebrando a regra "zero
> hardcoded" que o resto do plano já segue à risca (`speed_to_lead.minutos_alerta`,
> `stage_stagnation.sla_hours` — sempre configuráveis via `params`, nunca uma constante).
> Corrigido: `params.qtd_atividades_contexto` (fallback de código = 5 só quando o agente está
> ativo sem valor configurado, clamp 1-20, mesmo padrão de `minutos_alerta`) — editável na
> MESMA UI que já configura os outros agentes, `/admin/master/segments` → "Agentes de
> Aceleração" → editor genérico de parâmetros (chave/valor livre, já existente desde F0, zero
> UI nova) — e sobreponível por tenant em `crm_agentes_config_tenant`, igual todo o resto.
> Verificado que `LIMIT $N` parametrizado funciona de verdade via o driver `pg` real (não só
> lido no código). `npx tsc --noEmit`: 0 erros no arquivo tocado.
>
> **Achado real no teste ao vivo — `maxTokens`:** 300 veio cortado no meio de uma frase real;
> 500 pareceu piorar (vazou rascunho/raciocínio interno do modelo, nunca a resposta final); só
> em 1500 a resposta veio limpa e correta — mesma classe de comportamento já documentada em
> F0.5 (Gemini consome parte do orçamento de tokens em conteúdo interno antes da resposta
> visível). `maxTokens` fixado em 1500, com comentário explicando o porquê.
>
> `POST /api/crm/kanban/move` ganhou o trigger: depois de mover o lead com sucesso, chama
> `refreshNextBestAction(...).catch(...)` sem `await` — best-effort, nunca bloqueia a resposta
> do move (mesma disciplina de `notifyWhatsApp`/`notifySlack`). UI: `NextBestActionCard.tsx`
> (card "Sugestão da IA" na ficha do lead, nunca renderiza nada quando o agente está
> desativado — mesma disciplina de nunca expor capacidade "de mentira" desde F0) + botão
> "Registrar como Atividade" (novo prop `prefill` em `AtividadesLead.tsx`, reabre o form de
> Nova Atividade pré-preenchido). **Master — zero código novo**: `next_best_action` entrou em
> `CRM_AGENT_CATALOG` e o modal genérico "Agentes de Aceleração" (já construído em F0) passou
> a exibi-lo automaticamente, sem tela nova.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
> Imobiliário, ativado só pra este tenant): lead real criado com mensagem real ("quero comprar
> um apartamento de 3 quartos em Boa Viagem, tenho a entrada guardada") → qualificação real
> disparou · atividade real registrada (contato via WhatsApp, orçamento até R$650 mil) · `GET`
> antes de gerar → `{enabled:true, suggestion:null}` (honesto, nunca inventa) · `POST` → 
> sugestão real e específica citando os dados reais do lead ("Selecione e envie ao cliente via
> WhatsApp de 2 a 3 opções de imóveis localizados em Boa Viagem, com 3 quartos e valor de até
> R$ 650 mil...") — nunca genérica, nunca inventou dado não fornecido · `GET` seguinte
> confirmou persistência · confirmado que nenhum outro tenant tem o agente ativo por padrão
> (só o override deste 1 tenant, `crm_agentes_config_segmento` sem nenhuma linha pro agente).
>
> **Lacuna de verificação registrada com honestidade:** o trigger automático via
> `POST /api/crm/kanban/move` usa a MESMA função (`refreshNextBestAction`) já provada correta
> pelo teste direto do endpoint — revisão de código confirma a chamada (3 linhas, sem lógica
> própria). A confirmação AO VIVO desse gatilho específico esbarrou na cota diária gratuita
> real do Gemini (`RESOURCE_EXHAUSTED`, 20 requisições/dia, já consumida pelos testes de LLM
> desta sessão inteira, F0.5 incluído) — 2 tentativas de mover o lead depois do teste
> bem-sucedido do endpoint direto confirmaram a chamada sendo feita (resposta do move nunca
> bloqueou) mas sem crédito de API restante pra completar a chamada real. Nenhum tenant tem
> `anthropic_api_key` real configurado pra trocar de provider nesta sessão (mesma técnica já
> usada em F0.5 exigiria uma credencial nova, fora de escopo). Todo dado de teste removido
> (lead + atividade + cascata, override do tenant revertido pra 0 linhas), `count(*)=0`
> confirmado em `leads_staging`/`crm_agent_actions`/`crm_agentes_config_tenant` pro
> `agent_key='next_best_action'`. `npx tsc --noEmit`: 0 erros.
>
> **Follow-up mesma sessão — 2 achados reais do usuário testando o modal da Master, ambos
> corrigidos.** (1) **`paramHints`** — `CrmAgent` ganhou `paramHints?: {key,label,default}[]`;
> cada agente declara os próprios parâmetros reconhecidos (`minutos_alerta`,
> `qtd_atividades_contexto`; `stage_stagnation` sem nenhum, de propósito — o limiar dele vive
> em `kanban_colunas.sla_hours`). `CRM_AGENT_CATALOG` passou a ser DERIVADO de `CRM_AGENTS`
> (não repetido campo a campo) — evita o catálogo divergir do agente real, exatamente o tipo
> de erro que causou o achado original (`LIMIT 5` cravado direto no código, sem nenhuma UI
> revelando o parâmetro). Modal da Master (e a página nova, item 2) renderizam os hints não
> usados como chips clicáveis que já preenchem a linha com o valor padrão. (2)
> **`/crm/config/agentes` construída de verdade** — o modal da Master sempre dizia "cada
> tenant pode sobrepor em /crm/config/agentes", mas essa página nunca existiu; achado pelo
> usuário lendo o próprio texto. O mecanismo de override (`crm_agentes_config_tenant`) já
> existia no banco desde F0 (`resolveEffectiveAgentConfig` já lê ele), só faltava UI. Nova
> página espelha exatamente `/crm/config/ia`: `GET/PUT /api/crm/config/agentes` (PUT só
> escreve na tabela do tenant, nunca na do segmento; `ativo:null` explícito = herdar o
> padrão) + página com 3 estados por agente ("Herdar do segmento"/"Forçar ativado"/"Forçar
> desativado") + o padrão do segmento sempre visível ao lado, somente leitura. Registrada na
> sidebar (categoria "Configurações CRM") pelo mesmo padrão idempotente de "Catálogo de
> Atividades". Texto do modal da Master corrigido pra apontar pra página real.
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital): `PUT` real
> forçando `next_best_action` ativo com `qtd_atividades_contexto=7` → persistiu na mesma
> linha que `resolveEffectiveAgentConfig` já lê (reaproveita o mecanismo já provado em F3) ·
> `agent_key` inventado → 400 · 2º tenant real do mesmo segmento (Imobiliaria XYZ) →
> `tenantOverrides` vazio, confirma isolamento · navegador real (sessão JWT do tenant, não
> Master): página carregou o estado real (input com `qtd_atividades_contexto`/`7` confirmado
> via JS, botão "Forçar ativado" com a classe visual ativa) · clique em "Herdar do segmento"
> + "Salvar" pela própria UI → confirmado por SQL que persistiu `ativo=NULL` mantendo
> `params` intacto · `get_sidebar_menu_for_user()` real confirma o item na sidebar, ao lado
> de "Personalização Kanban"/"Catálogo de Atividades". Todo dado de teste removido
> (`crm_agentes_config_tenant` zerado). `npx tsc --noEmit`: 0 erros.
>
> **F4 — Reativação: ✅ concluída e testada, mesma sessão. 1º agente `OFFENSIVE` de verdade do
> catálogo — fala diretamente com o lead.** `src/lib/crm/agents/reactivationAgent.ts` —
> `trigger: 'SCHEDULED_SCAN'`, `findCandidates()` acha leads sem nenhuma `atividades_lead` há
> mais de um piso genérico de 6h (o corte real é `dias_inatividade`, resolvido por
> `evaluate()`), exclui etapas terminais (`kanban_colunas.nome IN ('fechamento','perdido')`) e
> leads sem telefone (nunca proporia reativação de algo impossível de enviar) — cooldown de 30
> dias ou `PENDING_APPROVAL` em aberto evita reproposta repetida do mesmo lead a cada scan.
> `evaluate()` chama o LLM (`crm_agent_reactivation_message`, mesma cascata segmento→global de
> `crm_agent_next_best_action`) pra rascunhar a mensagem — `maxTokens=1500`, mesmo achado real
> já documentado em F0.5/F3 (Gemini com teto baixo corta a resposta ou vaza raciocínio
> interno). `paramHints`: `dias_inatividade` (default 7) e `requer_revisao_extra` (default
> `'false'`).
>
> **`requer_revisao_extra`** (§7 item 2 do plano, decisão fechada nesta fase): quando `true` no
> config efetivo (tenant > segmento), aprovar a sugestão NUNCA dispara envio automático — só
> grava o rascunho revisado com status novo `APPROVED_MANUAL` (distinto de `EXECUTED`, pra
> nunca sugerir "foi enviado" quando não foi). Sem essa flag, aprovar de fato envia via
> WhatsApp real, reaproveitando a infra já provada da Mensageria (`resolveWhatsAppInbox` +
> `ingestMessage` com `senderType:'system'` + `sendEvolutionMessage`) — mesmo trio que o bot
> usa pra responder de verdade, nunca um canal novo inventado só pra este agente. Falha real de
> envio (credencial ausente/API fora do ar) marca `EXECUTED` com `delivery_status='failed'` na
> mensagem, nunca trava a decisão do humano nem esconde o rascunho.
>
> `src/lib/crm/agents/reactivationExecutor.ts` (novo, compartilhado pelos 2 fluxos de decisão
> abaixo — a lógica de aprovar/rejeitar é idêntica, só muda COMO o humano se autentica):
> - `src/app/api/crm/agent/approve|reject/[id]/route.ts` (novo) — mirror exato do fluxo
>   HTML+PIN já em produção nos agentes de Campanhas
>   (`src/app/api/agent/approve|reject/[id]/route.ts`): link de WhatsApp sem sessão, PIN de 6
>   dígitos, formulário com a mensagem **editável** antes de confirmar (plano §5: "aprovar
>   edita e envia").
> - `src/app/api/crm/agent/approvals/route.ts` (novo) — equivalente autenticado (sem PIN,
>   sessão JWT já é a prova de identidade), mesmo padrão de `/api/admin/master/aprovacoes`
>   (Campanhas). Nunca confia em `tenant_id` do body — sempre resolve a ação real e compara
>   contra o tenant da sessão antes de decidir (Master bypassa), testado ao vivo com JWT de um
>   2º tenant real → 403 confirmado.
> - `src/lib/crm/agents/runner.ts` — `recordAndNotify()` (extraído do corpo do loop) ramifica
>   por `result.type`: OFFENSIVE gera PIN+expiração (mesmo `Math.floor(100000+Math.random()
>   *900000)` de `agentDecisor.ts`), grava `status='PENDING_APPROVAL'` e notifica com PIN +
>   links de aprovar/rejeitar; DEFENSIVE mantém o comportamento de sempre (F1/F2).
> - `src/app/crm/config/agentes/page.tsx` — nova aba "Aprovações Pendentes" (badge com
>   contagem real), lista com textarea editável + Aprovar/Rejeitar, mesmo padrão visual de
>   `/admin/campanhas/aprovacoes`.
> - `SegmentAgentesModal.tsx` — 4º bloco no painel de Ajuda já existente.
>
> **Testado ao vivo, ponta a ponta, com dado e LLM reais** (tenant Marketing Digital, segmento
> Imobiliário): achado real no processo — a cota diária gratuita do Gemini já estava esgotada
> (mesmo limite de 20 req/dia documentado em sessões anteriores), contornado trocando
> temporariamente o provider do tenant de teste pra Groq (mesma técnica já usada em F0.5),
> revertido ao Gemini original ao final. 4 leads de teste reais (sem atividade, backdatados 10
> dias, fora de etapa terminal): **Caminho A (send real)** — aprovado via PIN com mensagem
> editada → `status=EXECUTED`, `suggested_message` = texto editado (a edição prevalece sobre o
> rascunho original), linha real criada em `mensageria.messages` (`direction=outbound,
> sender_type=system, delivery_status=failed` — falha esperada e segura: as credenciais reais
> de Evolution/Slack deste tenant foram temporariamente neutralizadas *antes* de qualquer scan,
> mesmo cuidado já documentado em F2 ["o tenant de teste tem `evolution_api_url`/
> `slack_webhook_url` REAIS"], restauradas ao valor exato depois, confirmado por SQL).
> **Caminho B (rejeição via PIN)** — PIN errado → 422 com reformulário; PIN certo →
> `REJECTED`. **Caminho C (`requer_revisao_extra=true`, via API autenticada)** — aprovado →
> `status=APPROVED_MANUAL`, `executed_at` NULL, **zero linha criada em `mensageria.contacts`**
> pro telefone do lead (confirma que nem a tentativa de envio chega a acontecer). **Caminho D
> (ownership)** — JWT de um tenant diferente tentando decidir a ação → 403 real. **UI real,
> clique a clique** (sessão JWT real do tenant + Master): aba "Aprovações Pendentes" renderiza
> o item com o rascunho real da IA, clique em "Rejeitar" remove da lista e persiste `REJECTED`
> no banco; painel de Ajuda do Master mostra a seção nova do 4º agente. Todo dado de teste
> removido (5 leads + kanban + ações + trace de mensageria + override de tenant), credenciais
> Evolution/Slack/LLM restauradas ao valor exato original (confirmado por SQL), `npx tsc
> --noEmit`: 0 erros.
>
> **Próximo passo:** F5 (Recalibração de Score) — job diário de reordenação por conversão real
> + fila de sugestão de novo score, exige aprovação; depende de F0 e F0.5.
>
> — **Sessão anterior (2026-08-04, continuação 7) — `/crm/config/ia` reconstruída do zero:**
> motor de qualificação de lead por IA nunca funcionou de verdade pra nenhum tenant real, em
> nenhum segmento — corrigido com arquitetura nova + gate explícito de uso do CRM.**
>
> Usuário pediu investigação profunda de `/crm/config/ia` (5 perguntas: funcionalidades reais,
> tabelas/consumidores, por que não lê `system_segments`, o que "+ Nova Regra de IA" processa,
> se já existem registros reais). Achado central: `config_segmentos`/`config_segmentos_
> inteligencia` eram uma tabela de "segmento" paralela e desconectada do sistema real
> (`public.system_segments`), só usada pelo tenant Master (nunca por nenhum tenant real —
> Imobiliaria XYZ, Imovtec, Marketing Digital). Os 3 chamadores de
> `ConciergeService.qualifyLead()` hardcodavam `segmentId=1`, e a cascata de "global" usava
> `tenant_id IS NULL` — como as únicas linhas pertenciam ao tenant Master (`tenant_id` real,
> não NULL), nenhum tenant real jamais batia na condição. Confirmado empiricamente: todo lead
> real desta sessão sempre teve `resumo_ia` = o texto genérico hardcoded do fallback do
> `ConciergeService`, nunca uma qualificação real — a tela existia, salvava, mas nunca teve
> efeito nenhum em produção.
>
> **Usuário deu 4 diretivas obrigatórias antes de corrigir** (refinadas numa 2ª rodada, ver
> plano completo salvo no arquivo de plano da sessão): (1) nunca `tenant_id NULL` em lugar
> nenhum, nem pro tenant Master; (2) zero hardcoded, nenhuma lógica especial-casada por
> segmento — tudo genérico pra qualquer vertical; (3) modelo LLM sempre o do tenant primeiro,
> fallback pro padrão da plataforma; (4) visão holística de valor real (aceleração de
> captação→venda, diferente de CRM passivo); (5) **não pode haver uso do CRM por um tenant
> cujo segmento ainda não tenha IA configurada** — esclarecido com o usuário que o bloqueio
> vale só pro uso INTERNO (Kanban/gestão), nunca pra captação pública de lead (nunca perder
> lead real por config pendente).
>
> **Implementado** (`prisma/migration-2026-08-05-crm-ia-qualificacao.sql`, aplicada):
> 1. `public.crm_qualificacao_regras_segmento` (nova) — regras padrão por segmento, Master-
>    curated, sem `tenant_id` (mesmo modelo já comprovado de `system_benchmarks`/
>    `system_prompt_templates` — segmento sem "dono", nada de sentinela NULL). Migradas as 7
>    regras reais e não-órfãs de `config_segmentos_inteligencia` pro segmento real
>    "Imobiliário" (`92e5ddd3-...`) — único conteúdo real que já existia, não uma meta de
>    quantidade pra nenhum outro segmento (Master pode cadastrar 0, 3 ou 20 regras, o número
>    nunca é parte do modelo). As 7 linhas órfãs (`segmento_id NULL`, lixo duplicado) descartadas.
> 2. `public.crm_qualificacao_regras_tenant` (nova) — camada de override do próprio tenant,
>    `tenant_id` sempre real e concreto (nunca sentinela — esta tabela existe justamente pra
>    representar posse real).
> 3. `system_segments.crm_ia_ativa BOOLEAN DEFAULT false` (nova coluna) — gate explícito da
>    Master, mesmo padrão já usado por `imagens_por_ia` na mesma tabela; nunca inferido
>    automaticamente da presença de regras. Ativado `true` pro segmento Imobiliário como parte
>    da própria migração (curadoria inicial em nome da Master, evita regressão nos 3 tenants
>    reais que já usam esse segmento).
> 4. Prompt Mestre migrado pra `system_prompt_templates` (tabela já existente, já usada por
>    Mensageria/Briefing) — novo `template_key='crm_lead_qualification'`, variante real do
>    Imobiliário + fallback global — zero tabela nova pra isso.
> 5. `DROP TABLE config_segmentos`/`config_segmentos_inteligencia` — sem FK de entrada além
>    de si mesmas, confirmado antes de derrubar.
> 6. `src/lib/ai/conciergeService.ts` reescrito — assinatura muda de `qualifyLead(mensagem,
>    segmentId=1, tenantId?, rawJson?)` pra `qualifyLead(mensagem, tenantId, clientId,
>    rawJson?)`: resolve segmento real via `resolveSegment` (já existente) → checa
>    `crm_ia_ativa` (devolve resultado neutro e explícito se `false`, nunca finge qualificação)
>    → LLM via `getLlmClient(tenantId)` (mesmo factory usado pelo bot de Mensageria — tenant
>    primeiro, fallback padrão depois; substitui a chamada direta antiga ao SDK do Gemini) com
>    o prompt do segmento (`resolvePromptTemplate`) + regras como contexto → fallback
>    determinístico por palavra-chave (regras do tenant primeiro, depois do segmento) se o LLM
>    falhar.
> 7. Código morto deletado: `src/lib/ai/intelligenceCRM.ts` (nomes de tabela/coluna que não
>    existem mais, só chamado por um script de teste avulso) + `src/scripts/test_ai.ts` (só
>    testava o arquivo acima).
> 8. 2 call sites corrigidos (`api/crm/leads/route.ts`, `api/public/imoveis/prospects/
>    route.ts`) — usam `leadTenantId`/`leadClientId` reais, zero hardcode.
> 9. `/api/crm/config/ia` reescrita — auth trocada pro padrão `getCurrentUser()`+
>    `verifyTokenNode` (consistente com o resto de `/api/crm/*` tocado nesta sessão, antes
>    usava `verifyToken`/`getTokenFromRequest` de um módulo diferente); GET retorna segmento
>    resolvido + prompt + regras do segmento (leitura) + regras do tenant (CRUD); POST só
>    `saveRule`/`deleteRule` sobre a tabela do tenant — `saveSegment`/"Adicionar Novo Segmento"
>    removidos (não existe mais essa ideia; segmento é herdado, não criado pelo tenant aqui).
> 10. `/crm/config/ia/page.tsx` reescrita — sem sidebar de "Setores de Atuação"; cabeçalho com
>     segmento resolvido + badge de status; bloco "Prompt Mestre" (leitura); bloco "Regras
>     Padrão do Segmento" (leitura, curadas pela Master); bloco "Suas Regras Personalizadas"
>     (CRUD real do tenant).
> 11. **Gate de uso interno do CRM** — novo `GET /api/crm/segment-status` (Master sempre
>     bypassa) + `src/app/crm/CRMLayoutContent.tsx` bloqueia `{children}` com uma tela cheia
>     ("CRM aguardando configuração de IA") quando o segmento do tenant não tem
>     `crm_ia_ativa=true` — exceto a própria rota `/crm/config/ia`, que fica sempre acessível
>     (é onde o tenant acompanha o status e cadastra as próprias regras enquanto aguarda).
>     Captação pública (`/api/public/imoveis/prospects`, `/api/crm/leads` via webhook/form)
>     nunca passa por este gate — só a UI interna.
> 12. Master ganhou nova gaveta em `/admin/master/segments`: botão "Qualificação de Lead por
>     IA (CRM)" (ícone `CpuChipIcon`, teal) abre `SegmentQualificationRulesModal.tsx` (mesmo
>     padrão já estabelecido de `SegmentAnglesModal`/`SegmentDistributionModal` — lista
>     editável, replace-all no save) + toggle `crm_ia_ativa` no topo do modal; novo
>     `GET/PUT /api/admin/master/segments/[id]/qualification-rules`. Nova coluna "IA CRM" na
>     tabela de segmentos (mesmo padrão visual de "IA Imagens").
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
> Imobiliário, `admmd`): `GET /api/crm/segment-status` → `ready:true` · `GET /api/crm/config/
> ia` → segmento + prompt + as 7 regras migradas corretas · `POST /api/crm/leads` com mensagem
> real ("Quero sair do aluguel, já tenho a entrada guardada...") → qualificação REAL via LLM
> (sem fallback — confirmado por ausência do warning de erro nos logs), `tag_sonho='🏠
> Primeiro Imóvel'`, `resumo_ia` correto, `score_prontidao=90` — batendo com a regra real
> migrada, gravado em `leads_staging` de verdade. **Teste de generalidade, não hipotético**:
> ativado `crm_ia_ativa=true` no segmento "Geral" (tenant de teste "Teste RAG —
> Multi-Segmento", nunca teve nenhum conteúdo Imobiliário) via a API nova do Master, cadastrada
> 1 regra genérica ("orçamento/preço") → `POST /api/crm/leads` com mensagem "quanto custa o
> serviço" → qualificação correta (`tag_sonho='Interesse em Preço'`, resumo coerente, score 60)
> — confirma que a MESMA implementação funciona pra um segmento recém-criado sem nenhum código
> especial-casado. Navegador real (sessão JWT injetada, Marketing Digital): `/crm/kanban`
> renderiza normalmente (não bloqueado, `crm_ia_ativa=true`); `/crm/config/ia` renderiza
> "Inteligência de Qualificação", "Segmento: Imobiliário", badge "IA Ativa neste Segmento",
> Prompt Mestre correto. **Não testado visualmente no navegador** (só via API + revisão de
> código, para respeitar o pedido explícito do usuário de reduzir consumo de token com o
> Browser pane): o estado BLOQUEADO da tela — já confirmado que `/api/crm/segment-status`
> retorna `ready:false` corretamente pra segmento sem curadoria, e o condicional em
> `CRMLayoutContent.tsx` é um `if` direto sobre esse valor, sem lógica adicional a validar.
> `npx tsc --noEmit`: 0 erros em todos os arquivos novos/tocados (baseline zerada mantida).
> Todo dado de teste removido: 2 leads de teste (+ cascata `leads_kanban`) deletados, segmento
> "Geral" revertido (`crm_ia_ativa=false`, regra de teste removida) — confirmado por SQL
> `count(*)=0` residual.
>
> **Pendência real, registrada e não atacada nesta rodada** (fora de escopo, explicitamente
> adiada, mesmo padrão de fronteira já usado no plano de hardening de auth desta sessão):
> endurecer as rotas administrativas individuais de `/api/crm/*` (kanban/move, leads
> GET/PATCH, atividades etc.) contra chamada direta via API sem passar pela UI — o gate desta
> rodada cobre o uso real (a UI, via `CRMLayoutContent.tsx`), não uma blindagem de API
> completa.
>
> — **Sessão anterior (2026-08-04, continuação 6) — Fix real: tipo de atividade desativado
> (soft-delete) bloqueava pra sempre a reutilização do nome, disparando "Já existe uma
> atividade com esse nome nesse escopo." mesmo editando um campo qualquer de outro item.**
> Usuário reportou o erro aparecendo ao salvar edições no CRUD; testes sistemáticos via API
> (ordem, ícone, cor, isoladamente e combinados) não reproduziram nada — toda edição comum
> funcionou normalmente. A pista real veio de um resíduo já presente no banco desta mesma
> sessão de testes: um tipo "Telepatia" desativado (`ativo=false`, criado numa rodada
> anterior só pra testar o bloqueio de exclusão). Tentei recriar um tipo com esse mesmo
> nome/escopo — e reproduzi o erro exato na hora.
>
> **Causa raiz confirmada:** os 2 índices únicos de `tipos_atividade`
> (`ux_tipos_atividade_tenant`/`ux_tipos_atividade_client`) nunca filtravam por `ativo` —
> um tipo desativado continua ocupando a vaga do nome pra sempre, mesmo sumindo de toda a
> UI (o `GET` só lista `ativo=true`). Qualquer tentativa de recriar aquele nome, ou renomear
> outro tipo pra ele, esbarra na constraint do Postgres contra uma linha invisível — parecia
> "editei um campo qualquer e apareceu erro de nome duplicado do nada", porque de fato o
> usuário nunca via o nome conflitante em lugar nenhum.
>
> **Corrigido:** `prisma/migration-2026-08-04-tipos-atividade-unique-ativo.sql` (aplicada) —
> os 2 índices recriados com `AND ativo = true` na condição parcial, então só linhas ativas
> disputam a unicidade do nome — um nome "liberado" por soft-delete pode ser reutilizado
> normalmente. De brinde, o branch de `UPDATE` da API (editar um tipo já existente) ganhou o
> mesmo tratamento de erro 23505 que o `INSERT` já tinha — antes, um conflito genuíno durante
> edição vazava o erro cru do Postgres (500) em vez da mensagem amigável (409).
>
> **Testado:** recriar "Telepatia" no mesmo escopo do fantasma → antes 409 (bloqueado),
> depois da migração → 200 (sucesso real, nova linha). `npx tsc --noEmit`: 0 erros. Todo
> dado de teste desta rodada removido (o "Telepatia" recriado só pra provar o fix, e os
> valores de "Ligação" usados nos testes de edição revertidos ao original).
>
> — **Sessão anterior (2026-08-04, continuação 5) — Janela do picker de ícone estava
> pequena demais.** Continuação direta da rodada anterior (troca pro `HybridIconSelector`) —
> usuário testou e apontou que a área ainda ficava "extremamente pequena" pra escolha
> visual. Causa: o modal "Editar/Nova Atividade" era `max-w-md` (~448px), bem mais estreito
> que o `max-w-2xl` (~672px) que `MenuCreateModal.tsx` usa quando embute o mesmo seletor —
> o painel de 4000+ ícones ficava espremido num modal pensado só pra 3 campos de texto
> pequenos. Corrigido alinhando com a largura já usada nesse padrão estabelecido
> (`max-w-md` → `max-w-2xl`) + altura do wrapper do painel aumentada (`max-h-72` →
> `max-h-[34rem]`, o `LucideIconSelector` interno já tem layout fixo de 500px, o wrapper
> antigo cortava ele no meio criando scroll-dentro-de-scroll).
>
> **Verificado com o mínimo de Browser pane** (mesma disciplina da rodada anterior): medido
> via JS direto no DOM — modal real 672px, painel de ícones 606×544px (era ~380px de largura
> útil antes). `npx tsc --noEmit`: 0 erros.
>
> — **Sessão anterior (2026-08-04, continuação 4) — Fix real: picker de ícone custom abria
> vazio + troca pelo componente já existente na aplicação.** Usuário reportou, testando a
> entrega anterior: (1) o botão "escolher ícone" abria uma espécie de modal vazio; (2) uso
> pesado do Browser pane pra testar UI está consumindo muito token — pedido explícito pra
> reduzir.
>
> **Achado real:** o picker que eu tinha construído do zero (`ActivityIconPicker.tsx` +
> `activityIcons.tsx`, commit anterior) tinha bug de posicionamento/renderização próprio —
> mas o ponto principal é que **nunca deveria ter sido construído do zero**: a aplicação já
> tem um seletor de ícone maduro e usado em produção (`HybridIconSelector.tsx`, com abas
> Lucide/Material/Heroicons, 4000+ ícones, busca), no mesmo padrão de embutir (input
> `readOnly` como gatilho + painel expandido **inline**, não popover absoluto) já usado em
> `MenuCreateModal.tsx`/`MenuEditModal.tsx` (gestão de sidebar). Substituído: removidos os 2
> arquivos novos, `page.tsx` e `AtividadesLead.tsx` agora usam `HybridIconSelector` (seleção)
> + `DynamicIcon` (componente já existente, `@/components/common/DynamicIcon`, renderização)
> — o mesmo par já usado pelo resto da plataforma pra ícone de feature/sidebar.
>
> **Formato de valor mudou** (`lucide-<Nome>` em vez do nome cru do componente Heroicons,
> ex. `PhoneIcon` → `lucide-Phone`) — `prisma/migration-2026-08-04-tipos-atividade-lucide-icons.sql`
> (aplicada) migra as 36 linhas do seed original (9 tipos × 4 tenants) pro novo formato.
>
> **Verificado com o mínimo de Browser pane necessário** (pedido do usuário atendido — 1
> navegação + JS direto no DOM pra inspecionar, sem a sequência longa de screenshots/cliques
> da rodada anterior): painel do picker confirmado com 302 ícones SVG renderizados (não mais
> vazio) · busca por "Phone" + seleção confirmada setando `lucide-Phone` no campo · painel
> fecha sozinho após selecionar · nenhum dado alterado (ícone selecionado era o mesmo já
> salvo pra "Ligação", modal fechado sem submeter). `npx tsc --noEmit`: 0 erros.
>
> **Lição registrada:** antes de construir um componente de UI do zero, checar primeiro se já
> existe um equivalente maduro na base — `HybridIconSelector`/`DynamicIcon` já resolviam
> exatamente esse problema e eu não tinha procurado.
>
> — **Sessão anterior (2026-08-04, continuação 3) — 4 ajustes no CRUD de Atividades
> (`/crm/config/atividades`), a pedido do usuário.**
>
> **1) Rótulo "Tipo" → "Atividade"** em todo texto visível do CRUD (botões "Nova/Editar/Salvar
> Atividade", mensagens de erro da API, empty-state da tabela) e no formulário de registro em
> `AtividadesLead.tsx` ("Selecione a atividade...", "Escolha uma atividade.").
>
> **2) Picker de ícone real — investigação encontrou a causa raiz de dois problemas ao mesmo
> tempo (achado #2 e #3 do usuário eram o mesmo bug, não dois):** o campo Ícone sempre foi um
> `<input type="text">` livre, sem nenhuma biblioteca — e pior, o valor salvo **nunca era
> exibido em lugar nenhum da aplicação** (nem na tabela do catálogo, nem na Ficha do lead).
> Testado ao vivo via API antes de mexer em UI: editar nome/ícone realmente persistia no banco
> (confirmado por SQL direto) — ou seja, "Salvar não funciona" (achado #3) não era um bug de
> gravação, era 100% falta de feedback visual: o usuário mudava o ícone (texto livre, sem
> preview), clicava Salvar, e como nada na tela refletia essa mudança, parecia que não tinha
> salvado nada. Corrigido projetando a causa raiz, não o sintoma: `src/lib/crm/activityIcons.tsx`
> (catálogo curado de 26 ícones heroicons/24/outline, nomes PascalCase batendo com o que já
> estava salvo no seed — `PhoneIcon`, `ChatBubbleLeftIcon` etc.) + `ActivityIconPicker.tsx`
> (grid popover, substitui o input livre) + `ActivityIcon` renderizado agora em 2 lugares novos:
> coluna "Ícone" na tabela do catálogo, e badge colorido ao lado de cada atividade na Ficha do
> lead (`AtividadesLead.tsx`, antes só um dot de cor sem ícone nenhum).
>
> **3) Feedback de sucesso** — toast (`✓ Atividade atualizada/criada/desativada com sucesso.`,
> auto-some em 3s) adicionado ao criar/editar/desativar, fechando de vez a percepção de "não
> aconteceu nada" mesmo pra edições que não mudam nada visível na tabela (ex.: só a cor).
>
> **4) Bloqueio de exclusão por uso real — feature nova, não existia antes.** `DELETE
> /api/crm/atividades/tipos` agora conta `atividades_lead` ativas (`deleted_at IS NULL`)
> referenciando aquele tipo antes de desativar; havendo ≥1, retorna 409 com a contagem exata
> ("Esta atividade está registrada em N lead(s)..."), sem tocar no catálogo. Sem nenhum lead
> associado, desativa normalmente (soft, `ativo=false` — mesma convenção reversível já usada no
> resto da plataforma).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital): via API — criada
> atividade real vinculando um tipo de teste a um lead real → tentativa de excluir o tipo → 409
> com a mensagem certa → removida a atividade do lead → exclusão do tipo agora sucede (200) ·
> edição de nome/ícone via API confirmada persistindo no banco antes mesmo de tocar a UI · via
> navegador real (sessão JWT injetada): editado "Ligação" trocando o ícone (telefone → vídeo) via
> o novo picker → clique em Salvar → toast de sucesso apareceu → confirmado no banco que
> persistiu → revertido pro ícone original (mesma execução, não um teste hipotético) · confirmado
> via JS que as 9 linhas da tabela renderizam exatamente 1 SVG cada na coluna Ícone (não só a
> testada) · aberto "+ Nova Atividade" na Ficha do lead Roberto Severo → dropdown mostra
> corretamente "Selecione a atividade..." (renomeado). Todo dado de teste (tipo + atividade)
> removido depois, 0 resíduo confirmado — **exceto 1 atividade de teste pré-existente
> ("teste dfdsafsdfs", lead Gisele Cesse) que já estava no banco antes desta sessão e não foi eu
> quem criou — deixada intacta, não é resíduo meu pra limpar sem confirmação.** `npx tsc
> --noEmit`: 0 erros em todos os arquivos novos/tocados.
>
> — **Sessão anterior (2026-08-04, continuação 2) — Fix real: busca de cliente em
> `/crm/config/atividades` não era isolada por tenant + virou dropdown alfabético populado.**
> Usuário pediu explicitamente: dropdown sempre populado em ordem alfabética com os clientes
> da tenant logada, mais um botão de busca que filtra só depois de 3 letras digitadas
> (antes era typeahead automático por debounce, sem lista prévia).
>
> **Achado real no processo, não só a mudança pedida:** `GET /api/crm/clientes/search`
> (`src/app/api/crm/clientes/search/route.ts`) nunca filtrava por `tenant_id` — usava
> `unifiedPermissionMiddleware`, que é fail-open pra rota sem entrada em
> `route_permissions_config` (nenhuma existia pra essa rota) — ou seja, o handler nunca tinha
> acesso ao tenant de quem estava logado, e a query rodava sem WHERE de tenant nenhum. Isso
> significava que a busca de cliente nesta tela (e em qualquer outro consumidor da mesma rota,
> ex. `NovoLeadModal.tsx`) podia retornar clientes de QUALQUER tenant da plataforma, não só do
> tenant logado — real vazamento de dado entre tenants, não só uma lacuna de UX.
>
> **Corrigido:** rota reescrita pro mesmo padrão `getCurrentUser()` (cookie/Bearer +
> `verifyTokenNode`) já usado por toda a família `/api/crm/*` tocada nesta sessão — sempre
> escopado por `tenant_id` (Master vê tudo, mesmo bypass do resto da plataforma). Ganhou 2
> modos: sem `q` → lista TODOS os clientes do tenant, `ORDER BY nome ASC`, teto 500 (alimenta
> o dropdown pré-populado); com `q` de 3+ caracteres → filtra por nome/email/telefone/cpf,
> mesma ordenação, teto 20. `q` de 1-2 caracteres retorna vazio (nunca busca parcial demais).
>
> `src/app/crm/config/atividades/page.tsx` — bloco "Cliente Específico" reescrito: ao entrar
> nesse escopo (ou depois de "Trocar"), carrega e mostra a lista completa alfabética
> imediatamente, sem precisar digitar nada; input de busca + botão "Buscar" (desabilitado com
> menos de 3 letras, Enter também dispara) substitui o filtro automático por debounce; "Limpar"
> volta pra lista completa. Cliente selecionado vira um chip fixo com ação "Trocar".
>
> **Testado ao vivo, ponta a ponta** (tenant Marketing Digital, real): API sem `q` retornou os
> 7 clientes reais do tenant em ordem alfabética exata, nenhum de outro tenant · `q=gi` (2
> letras) retornou vazio · `q=gis` (3 letras) retornou só o match real · navegador real: clique
> em "Cliente Específico" já mostra os 7 na hora, sem digitar nada · digitado "aut" + clique em
> "Buscar" → filtrou pra só "AutoMax Veículos" · selecionado → chip fixo + catálogo daquele
> cliente (vazio, como esperado — nenhum tipo próprio criado ainda) · "Trocar" → lista completa
> volta a aparecer. `npx tsc --noEmit`: 0 erros nos 2 arquivos tocados.
>
> — **Sessão anterior (2026-08-04) — Catálogo de Atividades adicionado à sidebar.**
> Usuário pediu explicitamente: o CRUD de tipos de atividade (`/crm/config/atividades`, entrada
> anterior deste arquivo) deveria estar acessível pela sidebar, na categoria "Configurações
> CRM", com acesso pro administrador do tenant + qualquer usuário com permissão concedida —
> mesmo modelo de acesso já usado por toda a plataforma (`docs/ACCESS_CONTROL.md`).
>
> **Implementado:** `prisma/migration-2026-08-04-crm-atividades-sidebar.sql` (aplicada) —
> replica exatamente o padrão da feature irmã "Personalização Kanban" (id 75, mesma categoria
> 25): novo `system_features` (id 119, url `/crm/config/atividades`) + 4 `permissions`
> (read/write/delete/admin) + `role_permissions` copiado do mesmo conjunto de roles que já tem
> acesso a "Personalização Kanban" (role 42 "Administrador") + `tenant_feature_overrides`
> provisionado pros mesmos 3 tenants que já têm CRM ativo (Imobiliaria XYZ, Imovtec, Marketing
> Digital). Achado no processo: usei `icon: 'ListBullet'` na 1ª tentativa, mas o
> `DynamicIcon.tsx` do projeto só resolve por um mapa fixo de chaves lowercase
> (`clipboarddocumentlisticon`, `viewcolumnsicon`, etc.) — sem match, cai silenciosamente no
> ícone padrão (`HomeIcon`). Corrigido pra `clipboarddocumentlisticon` (já usado por outras
> features do mesmo tipo "lista/catálogo"), tanto no banco quanto na migração-fonte.
>
> **Verificado ao vivo:** `get_sidebar_menu_for_user()` real (usuário `admmd`, tenant Marketing
> Digital) confirma o item "Catálogo de Atividades" dentro de "Configurações CRM", ao lado de
> "Personalização Kanban" · navegador real (sessão JWT injetada): categoria expande mostrando
> o item com o ícone certo, clique navega pra `/crm/config/atividades` e a tela carrega os 9
> tipos reais do tenant normalmente.
>
> — **Sessão anterior (2026-08-04) — Feature "Atividades por lead" implementada e testada.**
> Continuação direta da entrada anterior (plano apresentado, aguardando aprovação) — usuário
> respondeu com 4 decisões de design explícitas que fecharam o plano: (1) catálogo de tipos
> pode ser por tenant OU por cliente específico do tenant; (2) atividades já criadas podem ser
> editadas/excluídas (implementado como soft-delete via `deleted_at` — reversível, mesma
> convenção de nunca apagar dado de verdade já usada no resto da plataforma, não uma
> exclusão física); (3) campo opcional por card, N atividades por lead; (4) lista sempre em
> ordem cronológica — inicialmente pedida crescente, **corrigida pelo usuário logo em seguida**
> pra decrescente (mais recente primeiro) antes de eu implementar.
>
> **Implementado:**
> 1. `prisma/migration-2026-08-03-crm-atividades-lead.sql` (aplicada) — `public.tipos_atividade`
>    (catálogo; `client_id NULL` = padrão do tenant, preenchido = específico daquele cliente;
>    2 índices únicos parciais pra unicidade de nome por escopo, já que `NULL` não colide em
>    `UNIQUE` normal do Postgres) + `public.atividades_lead` (registros; `coluna_id` capturado
>    automaticamente do `leads_kanban` do lead no momento da criação, nunca escolhido pelo
>    usuário; `deleted_at` pro soft-delete; 4 colunas de anexo). Seed inicial de 9 tipos padrão
>    por tenant (Ligação, WhatsApp, E-mail, Reunião, Proposta Enviada, Visita Realizada,
>    Follow-up, Negociação, Objeção Registrada) — aplicado automaticamente a todo tenant que já
>    tem Kanban configurado (4 tenants, 36 linhas).
> 2. `src/app/api/crm/atividades/tipos/route.ts` (novo) — CRUD do catálogo, escopado por
>    `client_id` opcional; `DELETE` é soft (`ativo=false`), preserva atividades já criadas com
>    aquele tipo.
> 3. `src/app/api/crm/atividades/route.ts` (novo) — GET (lista por `lead_uuid`, mais recente
>    primeiro), POST (multipart, com anexo opcional — áudio/imagem/PDF via `s3-client.ts`/MinIO,
>    prefixo `atividades/<tenant_id>/<lead_uuid>/`, teto 20MB), PATCH (edição, inclui trocar
>    anexo), DELETE (soft). `tenant_id`/`client_id`/`coluna_id` sempre resolvidos no servidor a
>    partir do `lead_uuid` — nunca confia no que o client mandaria, evita atribuir atividade a
>    lead de outro tenant.
> 4. `GET /api/crm/leads` — nova subquery `atividades_count` (só ativas) por lead, pro badge do
>    card do Kanban; `client_id` do lead também exposto (usado pra resolver o catálogo certo).
> 5. `src/components/crm/AtividadesLead.tsx` (novo) — lista + formulário inline "+ Nova
>    Atividade" (select de tipo, textarea com mínimo de 15 caracteres validado client+server,
>    input de arquivo), preview de anexo por tipo (áudio: player inline; imagem: thumbnail +
>    lightbox; PDF: link "Abrir"), ações de editar/excluir por item.
> 6. `src/app/crm/kanban/page.tsx` — badge de contagem no card (só aparece se > 0); seção
>    "Atividades" na Ficha do lead, logo abaixo de "Histórico de Visitas"; novo ícone de atalho
>    na toolbar pra `/crm/config/atividades` (mesmo padrão do atalho já existente pra
>    `/crm/config/kanban`).
> 7. `src/app/crm/config/atividades/page.tsx` (novo) — CRUD do catálogo com seletor de escopo
>    "Padrão da Empresa" vs. "Cliente Específico" (busca de cliente reaproveitando
>    `/api/crm/clientes/search`, mesmo componente/UX já usado em `NovoLeadModal.tsx`).
>
> **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, lead real
> "Roberto Severo", usuário real `admmd`): via API (curl) — criação com e sem anexo (imagem real
> upada no MinIO, URL pública confirmada 200), ordem cronológica decrescente confirmada,
> `atividades_count` refletido em `GET /api/crm/leads`, validação de descrição curta (400),
> edição (PATCH), soft-delete (some da listagem, mas a linha continua no banco com
> `deleted_at` preenchido), catálogo escopado por cliente isolado corretamente do catálogo do
> tenant (não vaza pro escopo tenant-wide), rejeição de nome duplicado no mesmo escopo (409).
> Achado no processo, não é bug do app: 2 tentativas de teste com acento direto no `curl -d`
> corromperam o UTF-8 ("Ligação"→"Liga??o") — mesmo padrão de erro operacional já documentado
> várias vezes nesta sessão (nunca passar texto acentuado inline em bash/curl no Git Bash
> Windows, sempre via arquivo) — refeito corretamente via `--data-binary @arquivo.json`, sem
> repetir o erro. Via navegador real (sessão JWT injetada, mesmo playbook já documentado): fluxo
> completo "+ Nova Atividade" → seleciona tipo → digita descrição → Registrar → ficha atualiza
> na hora com o item novo (dot colorido do tipo, "agora", nome do autor) → fechado o modal,
> reload confirma o badge "1" no card na posição certa (ao lado da data). Botão de excluir
> confirmado ligado corretamente à API (mesma API já validada via curl) — o clique automatizado
> parou no `confirm()` nativo do navegador (limitação conhecida de automação headless, não um
> bug), exclusão final feita via SQL direto pra fechar a limpeza. Todo dado de teste removido
> (atividade + tipo "Vistoria Técnica" criado só pra testar escopo por cliente), `count(*)=0`
> confirmado nas duas tabelas além do seed padrão. `npx tsc --noEmit`: 0 erros (mesma baseline
> zerada desde 2026-07-31, nenhum erro novo em nenhum dos 6 arquivos novos/tocados).
>
> **Pendente:** nenhuma — a feature está completa no escopo pedido. Redesign Premium do CRM
> (`CLAUDE.md` §1b) segue como próxima rodada quando o usuário priorizar.
>
> — **Sessão anterior (2026-08-03, continuação 7) — Início da frente de trabalho de CRM +
> plano da feature Atividades apresentado.** Auditoria real (agente Explore) de quais telas do
> CRM já passaram pelo Redesign Premium — confirmado que **nenhuma** (0 de 14 telas/componentes
> usa `gold-premium`/`navy-dark`; 5 arquivos com indigo genérico explícito, os outros 9 com
> paleta ad-hoc blue/emerald/purple/amber sem token de marca nenhum). Plano documentado no
> `CLAUDE.md` (seção "1b. Redesign Premium — módulo de CRM") pra implementar numa rodada
> futura — decisão do usuário foi **não iniciar agora**, priorizar funcionalidade nova
> primeiro. Investigação real confirmou que a tabela `agendamentos` já existente **não é
> reaproveitável** pra Atividades — é especificamente "visita a imóvel integrada ao Google
> Calendar", não um conceito genérico.
>
> — **Sessão anterior (2026-08-03, continuação 6) — Filtro "vigente" no dropdown de
> Campanha do Dashboard, com toggle "Mostrar encerradas" (Mecanismo B da discussão de
> segregação do passado, commit `2586c0a`).** Fechamento da mesma discussão das rodadas
> anteriores — usuário pediu explicitamente pra implementar agora, com a variante toggle
> (não automático/silencioso), depois de uma rodada de esclarecimento sobre o que
> "mesmo limiar de recência" e "toggle" significavam na prática (perguntas legítimas,
> minha explicação anterior tinha empacotado os dois conceitos demais numa pergunta só).
>
> **Critério de "vigente" fechado com o usuário:** `lifecycleStatus != 'KILLED'` E (teve
> `Insight` OU foi criada) dentro de `AGENT_INSIGHT_RECENCY_DAYS` (30 dias, mesma constante
> já exportada do fix anterior — um conceito único de "atual" na plataforma, dois
> mecanismos independentes que só compartilham o número). Nunca filtra o cálculo em si —
> só o que aparece por padrão no `<select>` de Campanha; a campanha atualmente selecionada
> nunca some da lista, mesmo que deixe de ser vigente entre um load e outro (evita
> `<select>` com `value` sem `option` correspondente).
>
> **Implementado:**
> 1. `aiInsights.ts` — `AGENT_INSIGHT_RECENCY_DAYS` exportado (antes só interno).
> 2. `dashboard/full/route.ts` — nova query `prisma.insight.groupBy` (MAX(date) por
>    campanha, sem nenhum filtro de período — precisa saber a ÚLTIMA atividade real de
>    todos os tempos, não só dentro do período selecionado na tela) computa `isVigente`
>    por campanha, anexado à resposta (`campaigns: campaignsWithVigente`). Zero mudança em
>    `campaignIds`/`insightWhere` usados pro cálculo de KPI — só um campo novo de leitura.
> 3. `marketing-api.ts` — `Campaign.isVigente?: boolean`.
> 4. `dashboard/page.tsx` — `showEndedCampaigns` (state, default `false`);
>    `campaignDropdownOptions` deriva de `campaigns` filtrando `isVigente !== false` (com a
>    ressalva da campanha já selecionada); checkbox "Mostrar encerradas (N)" ao lado do
>    label "Campanha", só aparece quando `N > 0`.
>
> **Verificado ao vivo, com dado real** (tenant Marketing Digital, segmento Imobiliário,
> escopo "Minha Empresa" — as mesmas 6 campanhas do print original do usuário):
> `GET dashboard/full` confirma `isVigente` correto por campanha — `true` só pras 2 com
> atividade real recente ("TikTok - Campanha Teste", criada há poucos dias, e "Google
> Search — Apartamentos SP", sincronizando há 15 dias); `false` pras 4 restantes
> ("campanha 7" — criada há 64 dias, nunca sincronizou; "MD · Captação Própria
> Premium/Financiamento" — `PAUSED`, última atividade há 52 dias; "Alto Padrão —
> Alphaville" — já `KILLED`). Dropdown na tela renderizou corretamente só as 2 vigentes +
> checkbox "Mostrar encerradas (4)"; clicado o checkbox → as 6 reapareceram imediatamente.
> "Onde está o Dinheiro?" (lista diferente, não tocada) continuou mostrando as 5 com
> gasto no período, confirmando que o filtro não vazou pra nenhum outro lugar. `npx tsc
> --noEmit`: 0 erros em todos os arquivos tocados.
>
> — **Sessão anterior (2026-08-03, continuação 5) — Fix real: `generateAiInsights()` sem
> nenhum piso de recência quando chamada sem período (agentDecisor.ts cron autônomo +
> strategicBriefing.ts, Briefing com LLM) — evitava avaliar/narrar campanha morta há
> semanas como se fosse dado de agora (commit seguinte).** Continuação direta da discussão
> de "segregação do passado" desta mesma sessão (achado já documentado na rodada anterior,
> tabela dos 3 chamadores de `generateAiInsights`) — usuário pediu pra prosseguir com a
> correção.
>
> **Implementado:** `aiInsights.ts` ganha `AGENT_INSIGHT_RECENCY_DAYS` (env, default 30,
> mesmo padrão de `AGENT_CONFIDENCE_THRESHOLD`/`AGENT_SYNC_SCHEDULE` já documentados no
> CLAUDE.md) — a query de `Insight` por campanha sempre tem piso inferior de data agora:
> explícito (`filters.startDate`, quando quem chama passa período — a UI do dashboard já
> fazia isso, continua igual) ou implícito (`now - AGENT_INSIGHT_RECENCY_DAYS`, quando o
> caller não passa filtro nenhum — o caso do cron autônomo e do Briefing). Fix cirúrgico
> num único ponto (a função compartilhada), não precisou tocar nos 4 call sites.
>
> **Verificado com precisão, no nível exato de dado que o código consulta (não só
> leitura de código):** comparado a query real ANTES/DEPOIS pra "Alto Padrão — Alphaville"
> (já `lifecycle_status='KILLED'`, última atividade real 41 dias atrás) — comportamento
> antigo (`take: 14` puro) retornava **14 linhas** (a campanha morta seria avaliada pela
> decisão automática e narrada pelo Briefing como se fosse performance de agora);
> comportamento novo (piso de 30 dias) retorna **0 linhas** — corretamente excluída.
> `npx tsc --noEmit`: 0 erros no arquivo tocado. `AGENT_INSIGHT_RECENCY_DAYS` documentado
> no CLAUDE.md junto dos outros env vars do agente autônomo.
>
> — **Sessão anterior (2026-08-03, continuação 4) — Sync multi-rede + gate de
> provisionamento na coleta + badge de "rede descontinuada" no Dashboard (commit
> `9eeac98`).** Nasceu de uma discussão socrática longa com o usuário (não um bug
> reportado): por que só existe "Sync
> Meta" e não Google/TikTok, se os KPIs já somam as 3 redes juntas? Investigação real (não
> hipotética) confirmou 2 achados sérios:
>
> **Achado 1 — o botão manual estava genuinamente preso ao Meta, código legado nunca
> generalizado** quando os adapters de Google/TikTok chegaram (FASE 1/T1): filtrava
> campanha por `metaCampaignId` e chamava `getNetworkServiceForTenant(tenantId, 'meta')`
> com string fixa. O cron automático (`syncMetrics()`, a cada 6h) já era multi-rede de
> verdade — só o botão manual tinha ficado pra trás.
>
> **Achado 2 — mais sério: nenhum caminho de coleta checava se a rede está CONTRATADA agora
> (`tenant_feature_overrides`), só se tem credencial ATIVA (`tenant_network_credentials`).**
> Um tenant que teve uma rede provisionada no passado e teve o contrato encerrado depois
> continuava sendo sincronizado normalmente pelo cron, gastando chamada real de API numa
> rede que não paga mais — o controle de provisionamento (`contracted`) só existia na porta
> de entrada da UI (bloquear lançar campanha nova), nunca na tubulação de dados.
>
> **Decisão de negócio fechada com o usuário antes de implementar:** dado histórico já
> coletado de uma rede desprovisionada **continua contando nos cálculos pra sempre**
> (nunca escondido retroativamente) — só a COLETA de dado novo para. Como aviso de
> transparência sobre isso, um badge no Dashboard quando isso está acontecendo.
>
> **Implementado:**
> 1. `src/lib/marketing/services/networkProvisioning.ts` (novo) — `getProvisionedNetworkCodes
>    (tenantId)`, fonte única de "quais redes estão contratadas agora", extraída da mesma
>    lógica que já existia só dentro de `GET /configuracoes/redes`. Sem bypass de Master —
>    isto não é gate de visibilidade de tela, é estado real de contrato, precisa valer
>    igual mesmo consultado sem usuário logado (cron).
> 2. `agentMonitor.ts` — `syncMetrics()` (cron) ganha o gate: `if (!provisionedNetworks.has
>    (networkCode)) continue`, calculado 1x por tenant. Extraído `syncCampaignInsights()`
>    (exportado) — o mapeamento completo de campos do `Insight` (vídeo, sinais Meta,
>    Impression Share do Google) que antes só existia inline dentro do loop do cron, agora
>    reaproveitado também pelo sync manual — fonte única, evita repetir a mesma classe de
>    defasagem que causou o Achado 1.
> 3. `POST /insights/sync` reescrito — cobre TODAS as redes contratadas+conectadas do
>    tenant (não só Meta), mesma resolução de rede por campanha do cron, mesmo gate de
>    provisionamento, resposta quebrada por rede (`byNetwork`) pra isolar erro de uma rede
>    sem travar as outras (ex.: Google com token expirado não impede Meta/TikTok de
>    sincronizar). Botão renomeado "Sync Meta" → "Sincronizar".
> 4. `dashboard/full/route.ts` — computa `discontinuedNetworks` (redes com dado no escopo
>    atual — `availableNetworks`, já existia — menos redes contratadas agora). Zero
>    mudança em nenhum cálculo de KPI existente, só um campo novo de leitura.
> 5. `DiscontinuedNetworkBanner.tsx` (novo) — mesmo padrão visual/posicional do
>    `TokenExpiryBanner` já existente (self-contido, sem novo fetch — o dado já vem
>    dentro da resposta de `dashboard/full`).
>
> **Verificado ao vivo, com dado real, não hipotético:** `npx tsc --noEmit` — 0 erros em
> todos os arquivos tocados. Testado o cenário completo via toggle real e reversível no
> banco (não dado sintético): desativada temporariamente a feature `campanhas-rede-google`
> pro tenant Marketing Digital → `GET dashboard/full` retornou `discontinuedNetworks:
> ["google"]` (antes: `[]`) com `availableNetworks` e `Gasto Total` (R$213.154,39, dado
> real da campanha Google Search) **inalterados** — confirma a decisão de nunca esconder
> retroativamente · banner renderizou corretamente na tela ("Google não está mais
> contratada... Revisar em Configurações → Redes") · revertido o toggle, confirmado
> `discontinuedNetworks: []` de volta ao normal, zero resíduo no banco (foi só um UPDATE
> reversível numa linha já existente, não INSERT de dado novo). Botão "Sincronizar"
> confirmado renderizando com o novo rótulo. **Não verificado ao vivo:** o caminho de
> sucesso do sync em si contra API real de rede — o JWT sintético usado nesta sessão bate
> num 403 genuíno de `requireApiPermission` (checagem RBAC server-side inalterada por este
> commit, confirmado via diff — não é regressão, é limitação de como o token de teste é
> montado) — mesma lacuna de "sync real com token de produção" já registrada como pendência
> há várias sessões, não nova.
>
> — **Sessão anterior (2026-08-03, continuação 3) — Fix real: link "Ver análise →" do card
> CREATIVE_FATIGUE (Dashboard → Inteligência Profunda) ainda roxo (`text-violet-500`) e
> em fonte minúscula — resíduo do Redesign Premium, nunca convertido (commit `38016f9`).**
> Usuário testou o item "WinningAngleChip: link 'Ver análise →' deve estar cinza, não
> roxo" e mandou 3 prints em sequência tentando localizar a tela certa — o 1º era do
> wizard de campanha (`/admin/campanhas/nova`, aviso de saturação de hook — feature
> diferente, "Ver sugestões de hook"), o 2º já era a página de destino
> (`/admin/campanhas/portfolio/cross-insights`, pra onde o link leva DEPOIS de clicado,
> não o link em si), e o 3º finalmente mostrou o link procurado — só que reportado como
> "extremamente pequeno".
>
> **Investigado: não era o mesmo link do teste original.** `WinningAngleChip.tsx` (a
> barra "Ângulo vencedor" que o teste original citava) já estava correto — conferido no
> código, `text-slate-500 hover:text-slate-800`/`hover:text-slate-300`, sem nenhum roxo. O
> link do 3º print é um componente DIFERENTE: o card "CREATIVE_FATIGUE" dentro da seção
> "Insights da IA" (`DeepDiveView.tsx`), que aponta pra `/admin/campanhas/criativos/padroes`
> — nunca fazia parte do teste original citado pelo usuário, mas achado real e válido por
> conta própria: `text-[10px] font-bold text-violet-500 hover:underline` — roxo, nunca
> convertido na rodada de Redesign Premium (que converteu o `WinningAngleChip` mas deixou
> este card de fora, provavelmente por serem visualmente parecidos mas viverem em
> arquivos diferentes).
>
> **Corrigido:** `text-violet-500` → `text-slate-500 hover:text-slate-800` (claro) /
> `hover:text-slate-300` (escuro), mesmo padrão já usado no restante do arquivo (linha
> ~140) e no `WinningAngleChip`; peso/estilo elevado pra `font-black uppercase
> tracking-wide` (igual aos badges irmãos do mesmo card, ex. `CREATIVE_FATIGUE`/
> `Confiança: X%`) — tamanho de fonte mantido em 10px (mesma convenção de toda a
> tipografia compacta desta seção de insights, não um bug isolado de tamanho), mas o peso
> visual maior deixa o CTA mais presente sem quebrar a hierarquia compacta do card.
>
> **Verificado ao vivo:** `npx tsc --noEmit` — 0 erros. Sessão real (tenant Marketing
> Digital, segmento Imobiliário, modo escuro — o mesmo tema do print do usuário), card
> CREATIVE_FATIGUE presente (saturação de hook real, 73%) → `getComputedStyle` do link
> confirma `color: rgb(100, 116, 139)` (`#64748b` = slate-500 exato, não mais roxo) e
> `className` confirma `hover:text-slate-300` ativo (branch dark). `npx tsc --noEmit`
> limpo, nenhum erro novo no arquivo tocado.
>
> — **Sessão anterior (2026-08-03, continuação 2) — 2 achados na sequência do fix de
> retry dos botões de rede: `<img src="/google-logo.png">` inexistente (404 real) +
> feedback visual ausente enquanto os botões esperam a resposta (commit `db2e4f3`).**
> Usuário
> reportou, testando o fix anterior: (1) console mostrando erro de uma imagem do Google
> não carregada; (2) "o mesmo problema de ainda aparecem os 3 botões de escolha da rede
> desabilitados ainda persiste".
>
> **Achado 1 — real, confirmado no log do próprio servidor dev do usuário** (ele colou a
> linha exata): `GET /google-logo.png 404 in 29059ms`. O botão "Google AI Max" usava
> `<img src="/google-logo.png">` — arquivo que **nunca existiu** em `public/` (confirmado
> via busca no diretório inteiro, zero resultado). Único ponto do código inteiro que
> referenciava esse caminho. Um `onError` já escondia a imagem quebrada silenciosamente,
> então nunca quebrou visualmente — mas gerava a requisição 404 real que aparecia no
> console, exatamente o que o usuário viu. Corrigido: substituído por um `<span>G</span>`
> inline (mesmo padrão de ícone-texto já usado pro Google no seletor de rede do
> `CampaignWizard.tsx`, que usa `'G'` como ícone da rede Google sem depender de nenhum
> arquivo de imagem) — zero requisição de rede, zero 404.
>
> **Achado 2 — o retry da rodada anterior (`4315968`) está correto em princípio, mas não
> resolve a percepção do usuário sozinho:** o retry evita os botões ficarem presos **pra
> sempre**, mas não acelera a compilação em si do Next em modo dev (medido ao vivo de novo
> nesta mesma investigação: `Compiled /api/admin/campanhas/settings/client-creatives in
> 27.6s`, `GET /google-logo.png 404 in 29059ms` — o mesmo padrão de sobrecarga do
> compilador já documentado, ainda presente no ambiente do usuário). Sem nenhum feedback
> visual, os botões continuavam parecendo simplesmente "travados/quebrados" durante esse
> tempo de espera real, mesmo o retry por trás funcionando — a percepção do usuário de
> "o mesmo problema ainda persiste" é sobre a UX da espera, não sobre o retry ter falhado.
>
> **Corrigido — feedback visual + saída manual, sem prometer resolver o tempo de
> compilação em si (que é uma característica do modo dev, não um bug corrigível no
> cliente):** enquanto `!networksLoaded`, aparece agora um indicador com spinner
> ("Carregando redes disponíveis…") acima dos 3 botões; depois de 6s ainda carregando, o
> texto muda pra "Ainda carregando as redes disponíveis…" com um link "Tentar novamente"
> que força uma nova tentativa imediata (via `networksRetryTick`, novo state que
> retrigger o mesmo `useEffect` de carga) sem esperar o backoff automático nem exigir
> recarregar a página inteira.
>
> **Verificado ao vivo:** `npx tsc --noEmit` — 0 erros (mesma baseline zerada, nada novo).
> `document.querySelectorAll('img[src*="google-logo"]').length === 0` confirma a imagem
> quebrada removida do DOM. Botões testados habilitando corretamente em ~2s numa rota já
> aquecida (sem regressão do caminho de sucesso). O cenário de compile-storm genuíno (que
> motivou a investigação) foi reproduzido de novo ao vivo nesta sessão, confirmando que o
> fenômeno de base (dev-mode, várias rotas compilando ao mesmo tempo) é real e
> independente de qualquer coisa no código do cliente — o que esta rodada resolve é a
> transparência (usuário sabe que está carregando, não travado) e dá uma saída manual,
> não a duração da espera em si, que é inerente ao `next dev` numa sessão fria.
>
> — **Sessão anterior (2026-08-03, continuação) — Fix real: botões de rede
> (Meta/TikTok/Google) em `/admin/campanhas/nova` ficavam presos desabilitados sem
> nenhuma recuperação, às vezes por muito tempo (commit `4315968`).** Usuário reportou:
> depois de escolher a pasta e clicar num criativo específico, os botões de rede abaixo
> "muitas das vezes" ficavam desabilitados por um bom tempo — às vezes, depois de muito
> tempo, passavam a habilitar.
>
> **Investigado ao vivo, reproduzido de verdade (não hipotético):** os 3 botões dependem
> de `networksLoaded`/`networkStatus`, preenchidos por 1 único `useEffect` que chama
> `GET /api/admin/campanhas/configuracoes/redes` uma vez no mount, sem NENHUM retry —
> `.catch(() => setNetworkStatus({}))` seguido de `.finally(() => setNetworksLoaded(true))`.
> Reproduzido com um servidor dev genuinamente frio (não simulado): a 1ª tentativa dessa
> rota, junto com `/api/admin/sidebar/menu` e `/api/admin/campanhas/settings/client-
> creatives`, chegou a **retornar 404** depois de 47-53 segundos — sintoma real de
> sobrecarga do compilador do Next em dev (várias rotas compilando ao mesmo tempo), não
> hipótese. Como o efeito só roda 1 vez (`deps: []`) e não tinha nenhum retry, essa falha
> transitória deixava os 3 botões presos desabilitados **pra sempre** naquela instância da
> página — a única recuperação possível era recarregar a página inteira manualmente, o que
> bate exatamente com "às vezes, depois de um tempo longo eles passam a ser habilitados"
> relatado pelo usuário (não é a mesma requisição demorando — é uma NOVA tentativa via
> reload manual que, dessa vez, acerta a rota já compilada).
>
> **Corrigido:** `useEffect` reescrito com retry automático (até 3 tentativas, backoff
> curto de 1,5s/3s) antes de desistir e mostrar os botões como indisponíveis — nenhuma
> falha transitória isolada (cold-compile em dev, hiccup de rede, blip passageiro de pool
> de conexão em produção) trava mais os botões sem chance de recuperação automática.
>
> **Verificado ao vivo:** `npx tsc --noEmit` — 0 erros (mesma baseline zerada, nada novo no
> arquivo tocado). Caminho normal (sucesso rápido) confirmado sem regressão — botões
> habilitam em ~2s numa rota já aquecida, mesmo resultado de antes do fix. O caminho de
> falha/retry em si não foi forçado ao vivo (exigiria interceptar `fetch` antes do 1º mount
> da página, incompatível com a forma como a sessão injeta JWT via script pós-carregamento)
> — confiança vem da revisão de código (padrão simples de retry com contador + backoff,
> com flag `cancelled` pra evitar update de state após unmount) e do log real capturado que
> motivou o fix (a falha 404 documentada acima).
>
> — **Sessão anterior (2026-08-03) — Fix real: círculo do raio de alcance no `LocationPicker`
> (mapa "Selecionar no Mapa") ainda dourado só num dos 2 caminhos de código — o outro
> continuava indigo (commit seguinte).** Usuário tinha pedido, numa sessão anterior, que o
> círculo do raio no mapa Leaflet virasse dourado (parte do Redesign Premium); mandou print
> do modal aberto via "Ver no mapa" numa localidade já cadastrada, pedindo confirmação
> visual de que o teste tinha passado. **O print não mostrava nenhum círculo colorido
> visível** — nem dourado, nem o indigo antigo.
>
> **Investigado, achado real:** `LocationPicker.tsx` tem DOIS pontos que criam o círculo
> Leaflet (`L.circle(...)`), não um só. O caminho usado quando o usuário CLICA num ponto
> novo do mapa (dentro de `placePin`, ~linha 269) já tinha sido corrigido pra `#c5a028`
> (dourado) na rodada anterior do Redesign Premium. Mas o SEGUNDO caminho — usado quando o
> modal abre já com uma localidade EXISTENTE (`initial` prop presente, exatamente o cenário
> do print do usuário: endereço já preenchido, botão "Ver no mapa" clicado numa localidade
> já salva) — continuava hardcoded em `#6366f1` (indigo/azul-arroxeado), nunca tocado
> naquela rodada. Confirmado que é este 2º caminho que roda no cenário do usuário.
>
> **Corrigido:** troca mecânica de `#6366f1` → `#c5a028` nas 2 ocorrências (`color`/
> `fillColor`) do bloco de criação do círculo "inicial" (linha ~312-313).
>
> **Sobre o círculo não aparecer visível em NENHUMA cor no print original — investigado e
> confirmado que não é bug, é escala:** testado ao vivo (sessão real via JWT, tenant
> Marketing Digital, wizard Meta Ads → step "Público" → localidade real "Recife,
> Pernambuco" adicionada via busca → reaberta em modo edição via "Ver no mapa", o mesmo
> fluxo do print original) — `getBoundingClientRect()` do elemento SVG do círculo confirma
> ~1322×1322px de bounding box num viewport de 1280×720: pra um raio em dezenas de km, o
> círculo é MUITO maior que a área visível do mapa na tela — a borda curva nunca aparece
> dentro do viewport, só o preenchimento a 12% de opacidade, sutil o bastante pra passar
> despercebido numa captura de tela comprimida sobre um mapa multicolorido. Não é um bug de
> renderização à parte — é esperado pra raios grandes, independente da cor.
>
> **Verificado ao vivo, não só por leitura de código:** reproduzido o cenário exato do
> print (localidade já existente reaberta via "Ver no mapa") — `document.querySelectorAll
> ('.leaflet-overlay-pane path')` confirma `stroke: "#c5a028", fill: "#c5a028"` (dourado
> exato), não mais `#6366f1`. `npx tsc --noEmit`: 0 erros (mesma baseline zerada desta
> sessão, nenhum erro novo no único arquivo tocado). Nenhum dado de teste persistido — a
> localidade de teste existiu só no estado do wizard em memória, nunca chegou a ser salva
> (não cheguei a clicar em "Lançar"/confirmar), então não há resíduo a limpar.
>
> — **Sessão anterior (2026-08-02, continuação 4) — Fix real: trocar pra Google AI Max de
> dentro do wizard Meta/TikTok em `/admin/campanhas/nova` (commit `c1fe33a`).** Usuário
> reportou: depois de escolher criativos + rede na Fase 1, a Fase 2 mostra de novo as 3
> opções de rede com a escolhida já marcada — mas se o usuário quiser trocar pra Google AI
> Max ali dentro, a opção fica desabilitada.
>
> **Investigado — não era bug de provisionamento.** Google Ads nunca é "supported" dentro
> do `CampaignWizard` genérico, de propósito: Performance Max tem estrutura fundamentalmente
> diferente (asset groups, não adSet/ad), por isso vive num componente próprio
> (`GoogleAiMaxWizard.tsx`), decisão arquitetural já documentada neste arquivo. O problema
> real era que, uma vez dentro do wizard genérico, **não existia nenhum caminho funcional**
> pra chegar no assistente certo — o usuário precisaria descobrir sozinho que tinha que
> fechar o wizard e voltar pra Fase 1 pra clicar no botão separado "Google AI Max". O rótulo
> "Em breve" reforçava a confusão, sugerindo "ainda não lançado" quando na verdade é
> "estrutura diferente, sempre vai ser outro assistente".
>
> **Corrigido com um atalho real, não só cosmético:** novo prop opcional `onSwitchToGoogle`
> no `CampaignWizard`, repassado a `StepNetwork` — quando presente (só quando Google está
> contratado+conectado pro tenant, mesma regra já usada nos 3 botões macro da Fase 1 via
> `networkReady()`), o tile de Google troca "Em breve" por "Abrir assistente próprio →",
> agora clicável de verdade: fecha o `CampaignWizard` e abre o `GoogleAiMaxWizard`
> diretamente (`nova/page.tsx`: `setShowWizard(false); setShowGoogleWizard(true)`),
> reaproveitando os mesmos criativos já selecionados na Fase 1 — nenhum dos dois wizards
> perde o que já foi escolhido, já que ambos recebem a mesma prop `selectedImages={selected}`.
>
> **Testado ao vivo, tenant real com Google contratado+conectado:** aberto o wizard via
> "Meta Ads" → step "Rede" → tile Google mostrou corretamente "Abrir assistente próprio →"
> (não mais "Em breve") → clique fechou o wizard Meta e abriu "Google AI Max Wizard —
> Performance Max" corretamente. `npx tsc --noEmit`: 0 erros.
>
> — **Sessão anterior (2026-08-02, continuação 3) — 2 ajustes no card "Desempenho
> Acumulado" (commits `0ee57a7` + `a168d83`), ambos a pedido do usuário testando a
> entrega anterior.**
>
> **(1) Container discreto:** o bloco de 4 tiles coloridos (Gasto/Leads/CPL/CTR) estava
> solto direto no card, sem nenhum agrupamento visual — usuário: "não ficou legal... deve
> estar dentro de um container, estilizado e colorido discretamente". Envolvido em
> `bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-2.5`, mesmo padrão já usado
> no container de "Período de veiculação" mais abaixo no mesmo modal. Confirmado via
> `getComputedStyle`: fundo `rgba(248,250,252,0.7)`, borda `rgb(241,245,249)`.
>
> **(2) "Leads" sempre zerado — não era bug de contagem, era rótulo enganoso.** Usuário:
> "o campo LEADS sempre é exibido zerado. Qual tal exibirmos SINAIS DE INTERESSE?".
> Verificado ao vivo contra a API real: 5 das 6 campanhas do tenant têm gasto real
> (R$9.670 a R$11.927) mas `leads: 0` — a métrica (via `leadEvents.ts`) conta clique bruto
> de WhatsApp/formulário (`CtaInteraction`/`CtaSubmission`), e esses registros foram
> removidos ao final de sessões de teste anteriores (a disciplina de "0 resíduo" já
> documentada extensivamente neste arquivo) — não há engajamento real persistido pra essas
> campanhas agora, mesmo com gasto real acontecendo. A contagem em si está certa; o rótulo
> "Leads" é que promete mais do que mede (sugere confirmação no CRM, que a métrica nunca
> exigiu — mesma definição de "Sinal de Interesse (Meta)" já usada em
> `/admin/campanhas/leads`, também clique bruto sem confirmação). Renomeado "Leads" →
> "Sinais Interesse" e, por consistência interna do mesmo grupo de tiles, "CPL Médio" →
> "Custo/Sinal" — computação idêntica, só o texto mudou (decisão restrita a este card; o
> "CPL Médio" da Visão Executiva do dashboard, `CommandCenterView.tsx`, não foi tocado —
> é a mesma métrica mas já é terminologia estabelecida em toda a plataforma).
>
> **Verificado ao vivo, com dado real, em ambas as rodadas:** container com fundo/borda
> confirmados via `getComputedStyle`; labels novos ("SINAIS INTERESSE", "CUSTO/SINAL")
> renderizando com os mesmos valores de antes (ex.: campanha Google Search continua
> mostrando 64/R$3.330,54, agora sob o rótulo novo). `npx tsc --noEmit`: 0 erros nas duas
> rodadas.
>
> — **Sessão anterior (2026-08-02, continuação 2) — "Consultar Campanhas": data de criação com
> destaque + Desempenho Acumulado por card (commit `26ef853`).** Usuário pediu análise de
> viabilidade de 2 itens por card: 1) data de criação junto do período de veiculação; 2) os
> mesmos indicadores da Visão Executiva do dashboard (`CommandCenterView.tsx`), cumulativos
> "até a data e hora da consulta". Após análise (ver troca anterior), usuário aprovou a
> recomendação: implementar os 4 indicadores aplicáveis por campanha individual — Gasto,
> Leads, CPL, CTR/Hook Rate — excluindo "Campanhas Ativas" (métrica de portfólio, não faz
> sentido por campanha).
>
> **Achado real confirmado antes de implementar:** `GET /api/admin/campanhas/campaigns` (a
> API que alimenta esse modal) nunca fez join nenhum com `Insight` nem contagem de lead —
> só retornava metadado de configuração (orçamento, público, agendamento). Não era "expor
> um campo", era agregação nova.
>
> **Implementado:**
> 1. Backend — nova agregação por campanha, **sem filtro de período** (cumulativo desde
>    sempre): `Insight.groupBy` (spend/impressions/clicks/videoViews3s) + leads via
>    `leadEvents.ts` (a fonte única de contagem de lead do projeto — cada rede sinaliza lead
>    de um jeito diferente, e esse serviço já resolve isso). CTR e Hook Rate em percentual;
>    Hook Rate só aparece quando a campanha tem vídeo real (`videoViews3s > 0`), senão cai
>    pra CTR — mesma regra condicional já usada na Visão Executiva
>    (`hookRate !== null ? <HookRateKpiCard> : <KpiCard CTR>`). Falha na agregação não
>    bloqueia a listagem (`metrics: null`, card renderiza sem essa seção — degrada
>    graciosamente).
> 2. Frontend — "Criada em" saiu do texto pequeno solto perto do badge de objetivo e virou
>    um 3º bloco na mesma linha de Orçamento/Período (mesmo peso visual dos outros dois);
>    nova seção "Desempenho Acumulado" logo abaixo, com 4 tiles compactos (Gasto/Leads/
>    CPL Médio/CTR-ou-Hook-Rate).
>
> **Testado ao vivo, com dado real, batendo com números já documentados em sessões
> anteriores:** "Google Search — Apartamentos SP" → R$ 213.154,39 / 64 leads / R$ 3.330,54
> CPL / 4,11% CTR (idêntico ao que já tinha sido confirmado manualmente meses atrás) · "MD
> · Captação Própria Premium" (tem vídeo real) → corretamente "Hook Rate 11,00%" em vez de
> CTR · campanhas sem `Insight`/lead nenhum (TikTok de teste, "campanha 7") → R$ 0,00 / 0 /
> — / — honesto, sem inventar dado. `npx tsc --noEmit`: 0 erros (mesma baseline zerada,
> nenhum erro novo).
>
> — **Sessão anterior (2026-08-02) — Fix real: campo de busca do "Consultar Campanhas" era
> seleção exata, não texto livre — nunca podia retornar zero resultados (commit
> `5392cb0`).** Usuário reportou, citando um item de teste ("Digite um filtro que não
> retorne nada → clique em 'Limpar filtros'... não concluído"): "na funcionalidade de
> consulta de campanhas não visualizo o botão 'Limpar filtros'".
>
> **Investigação ao vivo (não hipotética) mostrou 2 coisas distintas:** (1) o botão
> "Limpar filtros" **já funcionava perfeitamente** — testado ao vivo selecionando o status
> "Removidas" (nenhuma campanha removida existe) → apareceu corretamente "Nenhuma campanha
> encontrada" + "Limpar filtros", clique restaurou a lista; (2) o campo que parecia ser
> "busca por nome" nunca foi um input de texto livre — era um `<select>` com a lista exata
> das campanhas já carregadas (`search === c.id`, seleção exata). Por construção, um
> dropdown de seleção exata **nunca pode retornar zero resultados** (só dá pra escolher um
> nome que já existe) — por isso o teste "digite um filtro que não retorne nada" nunca
> conseguia disparar o empty state por essa via, mesmo o botão em si estando correto.
>
> **Corrigido:** os 2 controles (desktop + mobile) trocados de `<select>` pra
> `<input type="text">` real, com ícone de lupa; filtro passou de `c.id === search`
> (comparação exata) pra `c.name.toLowerCase().includes(search.trim().toLowerCase())`
> (substring, case-insensitive) — `hasActiveFilters`/`matchSearch` já usavam a variável
> `search` genericamente, sem mudança de tipo necessária no resto do componente.
>
> **Testado ao vivo, ponta a ponta, o cenário exato do teste original:** digitado
> "xyzxyznaoexiste" (não bate com nenhuma das 6 campanhas reais) → `(0/6)` + "Nenhuma
> campanha encontrada" + "Ajuste os filtros..." + botão "Limpar filtros" visível ·
> `mouseover` no botão confirmado via `getComputedStyle`: `color: rgb(75, 85, 99)` (cinza,
> não roxo) · clique no botão → campo de busca limpo (`value === ''`) e as 6 campanhas
> reais voltaram a aparecer. `npx tsc --noEmit`: 0 erros (mesma baseline zerada, nenhum
> erro novo no arquivo tocado).
>
> — **Sessão anterior (2026-08-01) — Fix real: horário de veiculação errado no card do
> "Consultar Campanhas" + label "CAMPANHA " no nome (commit `93f1c5a`).** Usuário pediu 2
> ajustes na tela: exibir o horário de veiculação em cada card, e prefixar o nome da
> campanha com "CAMPANHA ".
>
> **Investigação (não hipotética) mostrou que a seção "Programação" já existia** no card
> (`ScheduleDisplay`, dentro de `CampanhasModal.tsx`) — só que tinha um bug real: o parser
> de `scheduleTimeSlots` assumia um formato inventado (`{day, startHour, endHour}`),
> enquanto o formato REAL gravado pelo Meta (`adset_schedule`, confirmado via
> `GET /api/admin/campanhas/campaigns` real) é `{days: number[], start_minute, end_minute,
> timezone_type}` — uma entrada cobre VÁRIOS dias de uma vez, e o horário é em MINUTOS
> desde meia-noite (não hora cheia — 1230 = 20:30). Resultado real, confirmado ao vivo
> antes do fix: todo card com horário "personalizado por dia" mostrava só "DOM" (dia
> errado, sempre o primeiro do enum) + "–" (nem hora nenhuma, `fmtHour(undefined)` retorna
> string vazia).
>
> **Corrigido:** novo `fmtMinutes()` converte minutos→HH:mm (1440 tratado como "24:00", fim
> do dia, não "00:00" do dia seguinte); o parser expande cada entrada do array real em uma
> linha por dia (usando o `days: number[]` de verdade, não mais o índice da entrada como
> fallback de dia). Campanhas sem nenhuma restrição de horário (schedule uniforme, sem
> `scheduleStartHour`/`scheduleEndHour`) agora mostram explicitamente "00:00 → 24:00 (dia
> todo)" em vez de omitir a linha de horário — todo card sempre tem um horário visível,
> como pedido (antes, esse caso — a maioria das campanhas reais deste tenant — não mostrava
> horário nenhum). Label "CAMPANHA " adicionado antes do nome de cada card.
>
> **Testado ao vivo, com dado real, comparando antes/depois:** "TikTok - Campanha Teste"
> (`days:[2,5]`, `start_minute:1200, end_minute:1260`) — antes "DOM –", depois "TER
> 20:00–21:00" + "SEX 20:00–21:00" (2 dias reais, cada um com o horário certo) · "campanha
> 7" (7 dias, `start_minute:360, end_minute:1380`) — depois mostra os 7 dias corretos, cada
> um "06:00–23:00" · campanhas sem `scheduleTimeSlots` nem horas customizadas ("Google
> Search...", "MD · Captação Própria Premium/Financiamento") — depois mostram "00:00 →
> 24:00 (dia todo)" explicitamente. `npx tsc --noEmit`: 0 erros (mesma baseline zerada da
> sessão anterior, nenhum erro novo no arquivo tocado).
>
> — **Sessão anterior (2026-07-31) — `npx tsc --noEmit` zerado por completo (53 → 0),
> investigado arquivo por arquivo, achando bugs reais no caminho (commit seguinte).**
> Usuário perguntou, depois do commit anterior reportar "53 erros, exatamente a baseline
> conhecida": "como podemos resolver, definitivamente, para zerar isso?" — pedido de
> zerar a baseline histórica de erros do tsc, nunca atacada em nenhuma sessão anterior.
>
> **Achado estrutural que mudou a natureza do trabalho:** havia um `tsconfig.tsbuildinfo`
> (cache incremental do tsc) mascarando erros reais — `lib/database/audit.ts` tinha 3
> funções inteiras (`getActionAuditLogs`/`getAuditStats`/`cleanupOldAuditLogs`) que nunca
> importavam `pool`, lançando `ReferenceError` em runtime pra qualquer caller real — o
> cache full-project run nunca reportava isso, só uma compilação isolada do arquivo
> revelou. Cache purgado (`rm tsconfig.tsbuildinfo`, já no `.gitignore`) e toda verificação
> desta rodada foi feita do zero, sem cache — só assim a contagem final é confiável.
>
> **Achado mais sério, pausado pra decisão do usuário via `AskUserQuestion` antes de
> corrigir:** a verificação de duplicidade de CPF/CNPJ/e-mail no cadastro público
> (`RegisterForm.tsx` → `POST /api/public/auth/register`) estava **completamente
> quebrada** — `createCliente`/`createProprietario` e os 5 endpoints públicos de
> pré-checagem faziam `WHERE ... AND tenant_id = $2` com `tenantId=undefined` (cadastro
> público não tem tenant, é o fluxo `consumidor_pf` da decisão D2) — em SQL, `= NULL`
> nunca é verdadeiro, então a checagem nunca encontrava nenhuma duplicata: era possível
> cadastrar o mesmo CPF/e-mail várias vezes pelo formulário público, sem bloqueio nenhum,
> silenciosamente. Usuário escolheu "Corrigir de verdade agora" (não só satisfazer o
> compilador) — corrigido com `IS NOT DISTINCT FROM` (null-safe) em `clientes.ts`/
> `proprietarios.ts` (create/update/check, incluindo a query final de UPDATE que também
> silenciosamente não afetava nenhuma linha pra usuário público) + propagado aos 5 call
> sites (`check-cpf`/`check-cnpj`/`check-email`/`auth/check-email`/`auth/profile`, todos
> passando `tenantId=null` explícito agora).
>
> **Outros bugs reais encontrados no caminho (não hipotéticos — cada um investigado até a
> causa raiz antes de decidir o fix, nunca suprimido só pra silenciar o tsc):**
> - `api/admin/imoveis/[id]/route.ts` — Temporal Dead Zone real: dentro do bloco
>   `if ('status_fk' in data)`, o log de auditoria de mudança de status parcial referenciava
>   `currentUserPayload` (nome nunca declarado nesse bloco — só existe uma declaração bem
>   mais abaixo, no escopo pai) — `ReferenceError` sempre, engolido pelo try/catch. Nome
>   certo já existia no mesmo bloco (`currentUser`).
> - `api/admin/imoveis/route.ts` — mesmo padrão: shorthand `tenantId,` no log de auditoria
>   de criação de imóvel sem nenhuma variável `tenantId` no escopo do handler POST (só
>   existe uma no GET, função diferente) — toda criação de imóvel perdia o log de auditoria.
> - `admin/hierarquia-perfis/page.tsx` — modal de editar perfil sempre abria com nome/
>   descrição vazios e nível caindo no fallback `1`: o objeto passado pro `EditPerfilModal`
>   usava chaves em português (`nome`/`descricao`/`nivel`) mas o modal lê inglês (`name`/
>   `description`/`level`).
> - `api/admin/categorias-amenidades/[id]/route.ts` — mesmo bug do "cookie fantasma
>   `accessToken`" já documentado e corrigido em 41 arquivos numa sessão anterior
>   (2026-07-29) — este `GET` ficou de fora daquela varredura; o `PUT` do mesmo arquivo já
>   usava o padrão certo (`admin_auth_token`), usado como referência pro fix.
> - `CategoryFeaturesModal.tsx` — `const { get, put, del } = useApi()`: o hook retorna a
>   chave `delete`, não `del` — `del(...)` sempre foi `undefined`, quebrando a remoção de
>   feature nesse modal.
> - `SidebarManagement/MenuCreateModal.tsx` — `setSelectedCategoryId(null)` no cleanup final
>   de `handleSave()` referenciava um setter nunca declarado (sem `useState` correspondente,
>   `categories` prop nunca usada na UI) — toda vez que o save tinha sucesso, essa linha
>   lançava `ReferenceError` capturado pelo próprio catch, logando "Erro ao salvar" mesmo
>   quando o save funcionou.
> - `components/skills/premium/ExecutiveDashboard.tsx` — `<last-7-days>Últimos 6
>   meses</last-7-days>` dentro de um `<select>` (deveria ser `<option>`) — resíduo de
>   copy-paste, dropdown sem nenhuma option funcional.
> - `hooks/usePermissions.tsx` — as 2 branches de retorno tinham formato diferente: o
>   branch "sem permissão" nunca incluía `auditConfigs` (só o branch normal incluía) —
>   qualquer consumidor que dependesse desse campo tinha falso-negativo silencioso quando
>   o usuário não tinha `permissoes`.
> - `services/twoFactorAuthService.ts` — `null` passado onde `reason?: string` esperava
>   `string | undefined`; substituído por `undefined` (mesmo efeito na gravação, já que o
>   código já normalizava `reason || null` internamente — zero mudança de comportamento).
>
> **Zero-risco (config/limpeza, sem bug por trás):** `tsconfig.json` `target: "es5"` →
> `"es2017"` (stack já é Next 14/React 18 — resolve 7 erros de `downlevelIteration` de
> uma vez); 3 scripts de debug mortos na raiz removidos (`check_db.ts`/`scratch_query.ts`/
> `test_uuid.ts` — schema já desatualizado, zero referência em `src/`); named export
> duplicado (`export function DashboardPage`) removido de `dashboard/page.tsx` (só o
> `export default` é permitido num `page.tsx` do App Router — a duplicata quebrava o
> gerador de tipos de rota do Next); `LucideIconSelector.tsx` — import morto e nunca usado
> de `@/components/ui/input` (módulo que nem existe) removido; `MediaStep.tsx` —
> `isPrincipal={image.principal ?? false}` (tipo `boolean|undefined`→`boolean`, sem mudança
> de comportamento real); `FeedCategoriasSection.tsx` — `IconRenderer` local ganhou suporte
> a `style` (estava sendo passado mas silenciosamente ignorado — cor do ícone por categoria
> nunca aparecia); `lib/database/clientes.ts`/`proprietarios.ts` — `findClientesPaginated`/
> `findProprietariosPaginated` perderam o default `filters = {}` (os 2 únicos call sites
> reais de cada já passavam filtro completo com `tenant_id`; default vazio era um footgun
> de querybar sem isolamento de tenant, nunca exercitado na prática).
>
> **Verificado:** `npx tsc --noEmit` com cache purgado — **0 erros** (baseline de 53 zerada
> de verdade, não suprimida). Testado ao vivo no navegador que a feature construída na
> sessão anterior (sugestão de hook, Caminho A/B) continua funcionando sem regressão.
> Não foi feita verificação visual dedicada dos 2 ajustes puramente cosméticos
> (`ExecutiveDashboard.tsx`/`FeedCategoriasSection.tsx`) além de confirmar que a página
> `/landpaging` carrega normalmente — risco residual muito baixo (mudança de 1-2 linhas,
> sem lógica nova). Commit único, mensagem detalhada por achado.
>
> — **Sessão anterior (2026-07-30, continuação 8) — Sugestão concreta de hook (Caminho A
> "com histórico" / Caminho B "sem histórico") no aviso de saturação do wizard, commit
> seguinte.** Continuação direta da investigação anterior (continuação 7, fix do
> `hook_type` fora do enum) — usuário perguntou, mostrando o aviso já corrigido
> ("Portfólio saturado com hook 'Outro' (73%)"): **"Com essa sugestão provida, qual é a
> ação efetiva que o usuário deve tomar?"** — "Outro" não é uma técnica de hook real que
> dê pra "diversificar", então o aviso sozinho não levava a nenhuma ação concreta.
>
> **Discussão socrática de design (várias rodadas, usuário corrigindo cada proposta antes
> de aprovar a versão final):**
> 1ª proposta (reescrever a mensagem pra sugerir "reanalisar ou usar abordagem mais
> explícita") foi rejeitada por vaga — usuário: "o que você, no lugar do usuário,
> consideraria pra agir efetivamente?", cenário explícito de empresa em estágio inicial
> sem histórico de performance. 2ª proposta (texto de hook concreto gerado por IA a partir
> da cena real da imagem) tinha um exemplo com **fato inventado** ("já são 40 famílias
> morando aqui") — usuário pegou na hora: "como o modelo LLM iria 'adivinhar' esses dados?
> Se for pra estreia de uma clínica médica ou loja de carros?" (risco real de publicidade
> enganosa/CDC art. 37, e em segmento regulado como saúde, CFM). 3ª proposta (placeholder
> `[X]` pro número desconhecido) também foi rejeitada pelo usuário com o argumento mais
> forte da conversa: no Mercado Imobiliário existe divulgação de lançamento **na planta**
> (imóvel ainda nem construído) — pra esse caso não existe NENHUM número real pra
> preencher, nunca, então um placeholder é estruturalmente inaplicável, não só arriscado.
> Usuário propôs a arquitetura final, limpa: **"1) Se houver histórico de performance dos
> criativos, usa-se a técnica de sugestão baseada nesse histórico; 2) Se não houver
> histórico, só sugerir informações lidas diretamente da imagem."** Refinei: nem todo hook
> é seguro no Caminho B — Prova Social e Urgência-de-estoque exigem fato externo
> verificável que, em alguns cenários (pré-lançamento), nunca vai existir — excluídos por
> completo do Caminho B, não templados. Última pergunta do usuário, também rejeitando
> arbitrariedade: **"Qual será o número 'mágico' que caracterize a existência de
> histórico?"** — resolvido reaproveitando os benchmarks JÁ existentes e configuráveis por
> segmento (`min_leads_scale`/`min_days_running`, o mesmo critério de maturidade já usado
> na regra SCALE de `aiInsights.ts`), em vez de inventar um número novo. Usuário confirmou
> ("faz sim") e autorizou implementação ("avance").
>
> **Implementado — decisão de caminho sempre no servidor, nunca confiando em CTR/CPL que o
> client mandasse (gap de confiança que o endpoint irmão `concepts/route.ts`, pré-existente,
> tem e este não repete):**
> 1. `src/lib/marketing/services/hookSaturationService.ts` — reescrito: `REAL_HOOK_TYPES`
>    (o enum real de 7 valores, corrigindo de brinde um bug real achado no caminho —
>    a sugestão "experimente hooks de X ou Y" sorteava de `Object.keys(HOOK_LABELS)`
>    inteiro, que mistura hook_type com valores de angle tipo "Investimento"/"Luxo", então
>    podia sugerir "experimente o hook Investimento", que nunca foi um hook de verdade);
>    `SAFE_COLD_START_HOOKS` (os 4 hooks sustentáveis só com o que está visível na imagem —
>    Curiosidade/Benefício/História/Problema — nunca Urgência/Prova Social);
>    `getHookSuggestionContext(tenantId, clientId)` — resolve segmento real, busca os
>    benchmarks reais via `resolveBenchmarks`, calcula maturidade real por hook_type
>    (leads via `leadEvents.ts`, dias via `COUNT(DISTINCT date)` de `Insight` — mesma
>    convenção `daysRunning` já usada em `aiInsights.ts`) e decide Caminho A ou B.
> 2. `src/lib/marketing/services/creativeAnalysisService.ts` — extraído
>    `callTextLlmForJson()` (helper compartilhado multi-provider, já existia inline em
>    `generateCreativeConcepts`) + novo `generateVisualHookSuggestions()` (Caminho B),
>    chamando um prompt novo.
> 3. `prisma/migration-2026-07-30-creative-hook-suggestion-coldstart.sql` (aplicada) — novo
>    template global `creative_hook_suggestion_coldstart`, com regra explícita "nunca
>    invente número/estatística/certificação", ancorado só nas cenas reais (`scene_description`/
>    `key_visual_elements`) já extraídas pela Vision no upload de cada criativo do tenant.
> 4. `POST /api/admin/campanhas/criativos/hook-suggestions` (novo) — decide o caminho no
>    servidor via `getHookSuggestionContext`; Caminho A reaproveita
>    `generateCreativeConcepts` (já existia, usado por "Padrões Vencedores") alimentado com
>    CTR/CPL/leads reais agregados; Caminho B chama `generateVisualHookSuggestions`.
> 5. `CampaignWizard.tsx` — o aviso de saturação (dentro de `StepType`) ganhou um novo
>    componente `HookAlertPanel` com botão "Ver sugestões de hook" que chama o endpoint
>    novo e renderiza o resultado (label do caminho + concepts ou suggestions).
>
> **Testado ao vivo, ponta a ponta, nos dois caminhos:**
> Caminho B (estado real do tenant, sem nenhum dado sintético) — `curl` direto no endpoint
> retornou sugestões reais e seguras, ex.: `{"hookType":"curiosity","hookText":"O que está
> por trás do QR Code?","why":"...sem inventar fatos."}` — confirmado sem nenhum fato
> inventado, sem Prova Social/Urgência. Caminho A — inserido temporariamente 6
> `CtaInteraction` sintéticas (`ad_id LIKE 'teste-hookA-%'`) numa campanha real (hook_type
> 'urgency', 47 dias reais de Insight) pra cruzar o threshold de 5 leads/3 dias do segmento
> Imobiliário → endpoint retornou corretamente `path:"history"` com `basedOn` real (6
> leads, 47 dias, CTR/CPL reais) e 5 concepts gerados pelo `generateCreativeConcepts`
> existente — dado de teste removido na sequência, confirmado 0 linhas residuais.
> **Verificação final no navegador real** (sessão JWT injetada, tenant Marketing Digital,
> imagem sintética injetada via `DataTransfer` — nunca persistida no banco, sem precisar
> de limpeza): wizard Meta Ads → step "Tipo" → aviso renderizou "Portfólio saturado com
> hook 'Outro' (73%)" com o botão novo → clique → painel mostrou corretamente o Caminho B
> ("Sem histórico maduro ainda — sugestões geradas só a partir das fotos reais... sem
> inventar dado") com 3 sugestões reais (Curiosidade "O que está por trás do QR Code?",
> Problema "Procurando conveniência?", História "Imagine viver no luxo"), cada uma com o
> texto de `why` confirmando a ausência de fato inventado — bate exatamente com o desenho
> aprovado pelo usuário. `npx tsc --noEmit`: mesma baseline, zero erros novos nos arquivos
> tocados.
>
> — **Sessão anterior (2026-07-30, continuação 7) — Fix real: `hook_type` de criativo gravado
> fora do enum do prompt, contaminando o aviso "Portfólio saturado com hook 'Preço'" no
> wizard (commit seguinte).** Usuário mandou print do passo "Tipo" do wizard TikTok
> perguntando se o aviso de saturação de hook era confiável e de onde vinha — pediu
> investigação, não assumir.
>
> **Investigação (não hipotética, com dado real do banco):** o aviso vem de um pipeline real
> — cada criativo é analisado por Vision LLM no upload (`creative_vision_analysis`, prompt em
> `system_prompt_templates`), classificado em vários campos incluindo `hook_type`; uma 2ª
> etapa (`hookSaturationService.ts`) agrega o portfólio atual do cliente/tenant por
> `hook_type` e alerta quando um tipo passa de 50% de share. Isso está correto e funcionando.
>
> **Achado real durante a investigação:** o próprio prompt define `hook_type` como só um
> destes 7 valores — `urgency|curiosity|social_proof|benefit|story|problem|other` —
> **"price" (Preço) não é um deles**; "price" só é válido no campo **separado** `angle`
> (`investment|lifestyle|family|price|urgency|social|luxury|other`), um conceito diferente
> (tema do anúncio, não técnica de atenção). `creativeAnalysisService.ts` nunca validava o
> que o LLM devolvia antes de gravar. Confirmado no banco (todo o banco, não só um tenant):
> **8 linhas** com `hook_type` fora do enum — 7 "price" + 1 "investment".
>
> **Corrigido, com autorização explícita do usuário ("quero"):**
> 1. `src/lib/marketing/services/creativeAnalysisService.ts` — novo `VALID_HOOK_TYPES` (o
>    enum real dos 7 valores do prompt); resultado da Vision é clampado contra esse set antes
>    de persistir — valor fora do enum vira `'other'` (mesmo fallback que `EMPTY_RESULT` já
>    usava pra "não consegui classificar"), com log de aviso pra rastreabilidade futura.
> 2. `prisma/migration-2026-07-30-fix-invalid-hook-type.sql` (aplicada) — corrige as 8 linhas
>    históricas já gravadas erradas pra `'other'`. Não deu pra saber o hook_type correto sem
>    reprocessar via Vision (custo de LLM) — `'other'` é o mesmo fallback conservador do
>    próprio código, não um chute novo.
>
> **Verificado:** `npx tsc --noEmit` — 53 erros, mesma baseline, zero no arquivo tocado.
> `GET /api/admin/campanhas/criativos/hook-saturation` (com e sem `clientId`, replicando a
> chamada real do wizard) agora retorna `dominantHook:"other"` (73%) em vez de `"price"` —
> o aviso no wizard (que só renderiza com exatamente 1 criativo selecionado, mesma condição
> do print do usuário) vai mostrar "Portfólio saturado com hook 'Outro'", não mais "Preço".
> `emotional_tone`/`cta_style`/`angle` conferidos — só `hook_type` tinha valores fora do
> enum, escopo do fix está completo.
>
> — **Sessão anterior (2026-07-30, continuação 6) — Fix real: wizard de campanha (Meta/
> TikTok) levava 30+ segundos pra abrir + refazia a escolha de rede do zero (commit
> seguinte).** Usuário reportou: ao clicar num dos 3 botões macro ("Meta Ads"/"TikTok Ads"/
> "Google AI Max") em `/admin/campanhas/nova`, a "segunda página" (o wizard) demorava
> extremamente pra carregar e mostrava de novo os mesmos 3 botões de escolha de rede — pediu
> avaliação antes de mexer.
>
> **Investigação, com medição real:** cliquei em "Meta Ads" via script e cronometrei —
> **mais de 30 segundos** até o passo "Rede de Anúncios" do wizard aparecer (o teste bateu no
> timeout de 30s da própria ferramenta de automação). Causas reais, confirmadas via
> `read_network_requests`, não hipotéticas:
> 1. `CampaignWizard`/`GoogleAiMaxWizard` são carregados via `next/dynamic({ssr:false})` —
>    chunk JS separado, nunca compilado antecipadamente, só no 1º uso — mesmo padrão de causa
>    raiz já corrigido em `/admin/login` e em `/api/admin/campanhas/campaigns` nesta sessão,
>    nunca aplicado aqui.
> 2. `StepNetwork` (passo 1 do wizard) faz sua **própria** chamada a `GET /api/admin/
>    campanhas/configuracoes/redes` — o MESMO endpoint que `/nova` já buscou e guarda em
>    `networkStatus`. Capturado **4 chamadas duplicadas** a esse endpoint só numa abertura,
>    cada uma com seu próprio skeleton de loading.
> 3. A "pergunta de novo pela rede" é real, não impressão: `StepNetwork` sempre renderiza os
>    3 cards de escolha de novo — a pré-seleção do botão clicado em `/nova` só aparece como
>    anel dourado, não pula a etapa.
>
> **Decisão do usuário (perguntado antes de implementar):** manter a etapa "Rede" visível
> (útil poder trocar de rede dentro do wizard), mas fazê-la aparecer **instantânea, já com a
> opção certa destacada** — não pular a etapa, só eliminar a demora e a rebusca.
>
> **Implementado:**
> 1. `src/app/admin/campanhas/nova/page.tsx` — novo `useEffect` de prewarm: `import(
>    '@/components/marketing/CampaignWizard')` e `import('@/components/marketing/
>    GoogleAiMaxWizard')` disparados sem renderizar nada, assim que a página monta — o
>    webpack compila os chunks em background enquanto o usuário ainda escolhe criativos.
> 2. Página já guarda `networkStatus` (mapa derivado) mas descartava a lista crua da API —
>    nova state `networksRaw` guarda a resposta completa (`d.networks`), repassada como prop
>    `networks` pro `<CampaignWizard>`.
> 3. `src/components/marketing/CampaignWizard.tsx` — `Props` ganha `networks?: NetworkOption[]`
>    (interface movida pra cima, próxima da declaração de `Props`, removida a duplicata que
>    existia mais abaixo); `StepNetwork` recebe `networks` como prop — se vier preenchida,
>    usa direto (zero fetch, zero skeleton); se ausente (uso standalone), cai no fallback de
>    sempre buscar sozinha, mantendo retrocompatibilidade.
>
> **Verificado:** `npx tsc --noEmit` — 53 erros, mesma baseline, zero nos 2 arquivos tocados.
> Ao vivo, depois do dev server estabilizar (sessões de teste anteriores foram contaminadas
> por HMR concorrente dos próprios edits, causando hangs de 30-78s não relacionados ao fix
> em si — descartadas, refeitas limpas): clique em "Meta Ads" abre a etapa "Rede de
> Anúncios" **instantaneamente** (confirmado 2x, sem skeleton visível), Meta Ads já com o
> anel dourado de seleção (`ring-2`) — mesma UX pedida: etapa continua visível e editável,
> mas sem demora nem rebusca.
>
> — **Sessão anterior (2026-07-30, continuação 5) — 2 pontos testados pelo usuário: TikTok
> Ads desabilitado (não era bug — provisionamento pendente) + paginação do "Consultar
> Campanhas" (não era bug — bastava usar "Todos os Clientes"), commit `migration-2026-07-30-
> provision-tiktok-test-marketing-digital.sql`.**
>
> **(1) "TikTok Ads" desabilitado em `/admin/campanhas/nova` pro tenant admmd —
> investigado, confirmado que era o gate de provisionamento por rede funcionando
> corretamente, não um bug.** `GET /api/admin/campanhas/configuracoes/redes` mostrava TikTok
> com `contracted:false` (sem linha em `tenant_feature_overrides` pra
> `campanhas-rede-tiktok`) **e** `connected:false` (nenhuma linha em
> `tenant_network_credentials`) — exatamente o comportamento documentado no CLAUDE.md
> ("cada rede é cobrada separadamente"). Perguntado ao usuário via `AskUserQuestion` antes
> de mexer em dado de tenant real; escolheu "Provisionar + conectar credencial de teste".
> Aplicado `prisma/migration-2026-07-30-provision-tiktok-test-marketing-digital.sql`
> (aditivo/idempotente): insere `tenant_feature_overrides` (feature 117,
> `campanhas-rede-tiktok`) + uma linha em `tenant_network_credentials` com
> `credentials={"access_token":"__SIMULATED__"}` — mesmo marcador sentinela já usado na
> Trilha E/T3 desta sessão (`SIMULATED_MARKER` em `factory.ts`), que ativa o
> `FakeTikTokAdapter` em vez de tentar falar com a API real do TikTok (T2, adapter real,
> segue bloqueado por aprovação externa). Verificado ao vivo: endpoint agora retorna
> `contracted:true, connected:true` pro TikTok; botão "TikTok Ads" com `disabled:false`;
> clicado de verdade → wizard abre no step "Rede de Anúncios" com TikTok pré-selecionado,
> badge "Conectado".
>
> **(2) Paginação do modal "Consultar Campanhas" não testável — usuário relatou só 5
> campanhas na tabela.** Não era bug nem faltava dado: as 5 são só as campanhas "próprias"
> (`client_id IS NULL`) do tenant Marketing Digital; o tenant tem mais 23 campanhas
> distribuídas entre os 7 clientes reais que gerencia (28 no total). O pill "Todos os
> Clientes" no `ClientSelector` — já implementado dentro do modal numa sessão anterior desta
> mesma frente — remove o filtro de `clientId` e já traz as 28 campanhas de uma vez.
> Verificado ao vivo: clicado "Todos os Clientes" → título "Todas as Campanhas (28)",
> paginação real com 3 páginas (12+12+4), confirmando que o componente de paginação já
> funciona — só faltava o usuário saber que esse pill existe. Nenhuma mudança de código
> necessária.
>
> — **Sessão anterior (2026-07-30, continuação 4) — Fix real: ícone de calendário longe do
> campo de data no modal "Consultar Campanhas" (commit seguinte).** Usuário mandou print
> mostrando o ícone de calendário afastado do fim visível dos campos De/Até. Causa real:
> `DateInputPtBR` (componente compartilhado) posiciona o botão do calendário via
> `absolute right-2` dentro do seu próprio `<span className="w-full">` — só que "w-full" ali
> é 100% do CONTAINER PAI, não do `<input>` visível. No `CampanhasModal.tsx`, a largura
> `w-[120px]` tinha sido aplicada só na className do `<input>` (repassada como prop), nunca
> no wrapper — como o `<span>` é filho direto de uma linha flex (`flex items-center gap-2
> flex-wrap`), ele esticava pra ocupar o espaço livre da linha inteira, arrastando o ícone
> pra longe do campo visualmente estreito. Corrigido envolvendo cada `DateInputPtBR` num
> `<div className="w-[120px] shrink-0">` (a largura fixa agora vale pro wrapper que o
> componente realmente respeita) — `className` do input passou a usar `w-full` desse novo
> container em vez do valor fixo direto. Verificado ao vivo via `getComputedStyle`/
> `getBoundingClientRect`: ícone agora fica a 24px do fim do input (dentro do próprio padding
> do campo, `gap: -24`), idêntico ao posicionamento já usado em todo o resto do app.
>
> — **Sessão anterior (2026-07-30, continuação 3) — Ajustes de UX no modal "Consultar
> Campanhas" (commit seguinte).** Usuário pediu 2 ajustes pontuais na entrega anterior: (1)
> label explícito "Período de veiculação" acima dos filtros de data/presets, tudo dentro de
> um container visualmente discreto (não solto no cabeçalho); (2) label explicando o que
> significa o valor cru exibido tipo "LEAD GENERATION" (era `AdSet.optimizationGoal`, jogado
> junto dos chips de Público-alvo sem nenhuma legenda).
>
> **`src/components/marketing/CampanhasModal.tsx`:**
> - O bloco de período (`DateInputPtBR` De/Até + presets Hoje/7d/15d/30d + botão limpar) agora
>   vive dentro de um card próprio (`bg-gray-50/70 border border-gray-100 rounded-xl`), com o
>   label uppercase cinza "Período de veiculação" no topo — mesmo padrão visual já usado nos
>   outros labels de seção do card de campanha (`Público-alvo`, `Programação`, `Localização`).
> - `adSet.optimizationGoal` (ex.: "LEAD GENERATION", "LINK CLICKS") separado do grupo
>   Público-alvo (não é sobre QUEM é alcançado, é sobre PRA QUE AÇÃO o Meta otimiza a
>   entrega) — ganhou sua própria mini-seção com o label "Otimizado para" acima do chip.
>
> **Verificado:** `npx tsc --noEmit` — 53 erros, mesma baseline, zero no arquivo tocado. Ao
> vivo (sessão real, tenant Marketing Digital): label "Período de veiculação" confirmado
> presente no container discreto; label "Otimizado para" confirmado presente em cada um dos
> 5 cards de campanha reais, acima do chip de otimização.
>
> — **Sessão anterior (2026-07-30, continuação 2) — Modal "Consultar Campanhas": pivot de
> cliente + filtro de período por veiculação + prewarm da rota (commit `e56e9a2` seguinte).**
> Usuário reportou dois pontos testando `/admin/campanhas/nova` → "Consultar Campanhas" pro
> tenant admmd: (1) nenhuma campanha aparecia; (2) a tela deveria ter os mesmos filtros de
> Minha Empresa/Segmentos/Clientes/período já implementados no dashboard — pediu análise
> profunda sob a ótica do negócio antes de mexer em código.
>
> **Investigação do item 1 — não era bug de lógica.** Testado ao vivo (sessão real via JWT,
> tenant Marketing Digital): as 5 campanhas próprias reais carregaram corretamente depois de
> alguns segundos, batendo exato com o banco; reaberto o modal uma 2ª vez (rota já compilada)
> carregou instantâneo. Confirmado também que nenhum dos 7 clientes reais deste tenant está
> genuinamente zerado (3-4 campanhas cada). Causa real: mesmo padrão crônico já documentado
> várias vezes neste arquivo — compilação sob demanda do Next em modo DEV faz a 1ª abertura
> de uma rota numa sessão nova levar alguns segundos, tempo em que o skeleton de loading pode
> ser confundido com "nada aparece" se o usuário não espera. Não é esperado em produção
> (build já compilado).
>
> **Item 2 — análise de negócio, não implementação direta.** Proposta inicial (Cliente sim,
> Segmento não, período como "filtro de busca secundário") foi corrigida depois do usuário
> pedir reavaliação do ponto do período: a distinção "busca vs. agregação" era artificial —
> um filtro de período num catálogo tem a mesma função real que num dashboard (escopar o que
> é relevante agora), só que aplicado a JANELA DE VEICULAÇÃO da campanha
> (`AdSet.startTime`/`endTime`), não a "data de criação do registro" (proposta original,
> corrigida) nem a agregação de gasto/leads (que esta tela não tem). Precedente direto: o
> próprio Meta Ads Manager filtra sua lista de campanhas por data de veiculação, não de
> criação — mesmo padrão replicado aqui. Segmento ficou de fora como eixo novo (implícito
> pelo cliente escolhido, redundante nesta tela mono-tenant).
>
> **Implementado, `src/components/marketing/CampanhasModal.tsx`:**
> 1. **Pivot de cliente sem fechar o modal** — `ClientSelector` (`variant="toggle"`, mesmo
>    componente já usado em 9 outras telas do módulo) inserido no cabeçalho; novo estado
>    interno `localClientFilter` (inicializado a partir das props `campaignFor`/
>    `effectiveClientId` só na transição de abertura, editável livremente depois);
>    `fetchCampaigns` refeito pra depender dele em vez das props fixas. Lista de clientes
>    carregada via o mesmo endpoint `/api/admin/campanhas/clients` que o hook
>    `useClientSelector` já usa (não reaproveitado diretamente porque o hook tem lógica de
>    default por segmento que não se aplica aqui — mono-tenant, sem conceito de segmento
>    ativo). `contextTitle`/`contextSubtitle` recalculados a partir do pivot local.
> 2. **Filtro de período por janela de veiculação** — `DateInputPtBR` (De/Até) + presets
>    Hoje/7d/15d/30d, mesmo visual do dashboard; filtro client-side (`overlapsPeriod`):
>    `campanha.adSets.some(as => as.startTime <= fim && (!as.endTime || as.endTime >= início))`
>    — campanha sem `endTime` (em aberto) é tratada como ainda ativa em qualquer período que
>    não termine antes do início dela.
> 3. **`hasActiveFilters`** unifica busca+status+período pro empty-state e o botão
>    "Limpar filtros" (que agora também limpa o período).
>
> **`src/app/admin/campanhas/nova/page.tsx`** — prewarm: `adminFetch('/api/admin/campanhas/
> campaigns?clientId=own')` disparado direto no mount (sem esperar ociosidade — mesma lição
> já aplicada no fix do `/artemis4`: um clique rápido vence um `requestIdleCallback`).
>
> **Verificado:** `npx tsc --noEmit` — 53 erros, mesma baseline, zero nos 2 arquivos tocados.
> Ao vivo (sessão real, tenant Marketing Digital): pivot de "Minha Empresa" → "AutoMax
> Veículos" sem fechar o modal, título atualiza pra "Campanhas de AutoMax Veículos (3)",
> batendo com o banco · filtro de período testado com range antes do início real das 3
> campanhas (todas com `startTime=2026-04-29`, sem `endTime`) → corretamente 0/3, empty state
> "Ajuste os filtros de busca, status ou período" · "Limpar filtros" restaura as 3
> corretamente, campos de data limpos, presets desmarcados.
>
> — **Sessão anterior (2026-07-30, continuação) — Fix real: dropdown de Segmento ignorava a
> cor real cadastrada em `system_segments.color_theme` (commit `e56e9a2`).** Testando o item
> "Abra o dropdown de segmento → passe o mouse pelas opções → a opção com o mouse em cima usa
> fundo âmbar suave, não indigo", o usuário declarou a expectativa correta: "eu imaginei que a
> cor exibida para cada segmento no dropdown seria a cor do tema do segmento que está na
> tabela segments" — e não era. `SegmentSelector.tsx` tinha uma paleta fixa de 15 cores por
> slug (`PALETTE`/`palFor()`), nunca lendo o campo real `colorTheme` que o próprio componente
> já recebia via prop e que o Master já edita com um color-picker de verdade em
> `/admin/master/segments` — a personalização do Master nunca tinha efeito nenhum na tela real
> que o usuário final vê, só na própria tela de gestão. Confirmado real (não intencional) antes
> de mexer, com `AskUserQuestion` — usuário escolheu "usar a cor real do Master".
> Corrigido: `palFor()`/`PALETTE` removidos, substituídos por `themeStyleFor(colorTheme,
> isDark)` — deriva `dot`/`chip`/`tabText`/`tabBorder`/`tabActive` como objetos `CSSProperties`
> a partir do hex real, aplicados via `style={}` (Tailwind JIT não gera classe de um hex vindo
> do banco em runtime); translúcido via hex+2-dígitos-alfa (`${cor}26`), técnica CSS válida em
> todo browser evergreen. Fallback `#6366f1` (indigo) só se `colorTheme` vier nulo/vazio —
> nunca deveria acontecer, já que a coluna é `NOT NULL DEFAULT '#2563eb'` no schema real, mas
> mantido por segurança. Os 3 pontos de renderização (chip do trigger, dot da lista do
> dropdown, abas de multi-segmento) foram todos migrados pro mesmo helper. Verificado: `npx
> tsc --noEmit` — 53 erros, mesma baseline, zero no arquivo tocado. Ao vivo (sessão real via
> JWT, tenant Marketing Digital, segmento Imobiliário — `color_theme` real `#2563eb` no banco):
> `getComputedStyle` do dot da lista e do chip do trigger confirmam `rgb(37, 99, 235)` exato
> (= `#2563eb`), chip com fundo translúcido azul e borda azul — bate 100% com o valor real da
> tabela, não mais o indigo hardcoded. **Não exercitado ao vivo:** a linha de abas de
> multi-segmento (`multiMode`, 2+ segmentos simultâneos) — o único hook consumidor hoje
> (`useSegmentSelector`, usado em `dashboard/page.tsx`) faz seleção exclusiva de propósito
> (`next = prev.includes(id) ? [] : [id]`, comentário "Exclusive selection" no próprio código),
> então esse branch nunca é alcançado na prática hoje; migrado pro mesmo `themeStyleFor` com a
> mesma técnica já comprovada nos outros 2 pontos, confiança por revisão de código + padrão
> idêntico, não por interação ao vivo.
>
> — **Sessão anterior (2026-07-30): Lacuna real de provisionamento (`tenant_feature_overrides`)
> corrigida: categorias "Sistema" e "Cadastros" incompletas na sidebar de 2 tenants reais
> (commit `df218f6`).** Usuário reportou que, logado como admmd (Marketing Digital), a
> categoria "Sistema" só mostrava 2 dos itens esperados ("Sessões"/"Visita Plataforma") e
> "Cadastros" só mostrava "Clientes" (faltando "Proprietários"). Investigação (comparando
> `tenant_feature_overrides` das 3 empresas reais, não assumindo bug de código) confirmou:
> **não era bug na função `get_sidebar_menu_for_user` nem no frontend** — 7 features reais de
> "Sistema" (Monitoramento/Auditoria de login, Expurgo de histórico, Análise de Logs,
> Configurações de Logs, Monitoramento de Segurança, Auditoria de Logs do Sistema, Auditoria
> de Ações) e "Proprietários" (Cadastros) já estavam provisionadas pra "Imobiliaria XYZ" (e
> Proprietários também pra "Imovitec"), mas nunca tinham sido provisionadas pra "Marketing
> Digital" — e as 7 de Sistema também faltavam em "Imovitec". Como são ferramentas básicas de
> administração/segurança e um cadastro básico (não algo que varia por plano comercial, ao
> contrário de módulos como Campanhas/CRM), ficou claro que era lacuna de rollout, não
> restrição deliberada — confirmado perguntando ao usuário antes de escrever qualquer dado.
> As únicas 2 features de "Sistema" sem provisionamento em NENHUMA empresa real ("Categorias
> de Funcionalidades", "Funcionalidades do sistema") foram deixadas intocadas — fazem sentido
> como exclusivas do Master (gerenciam o catálogo global de features, não faria sentido
> nenhuma empresa comum ter acesso). Corrigido via migração aditiva/idempotente
> (`migration-2026-07-30-provision-sistema-cadastros-gap.sql`, `ON CONFLICT DO UPDATE`) —
> provisiona as 7 features de Sistema pra Marketing Digital e Imovitec, e Proprietários pra
> Marketing Digital. Verificado ao vivo rodando `get_sidebar_menu_for_user()` de verdade pro
> usuário admmd (não só a tabela crua): "Sistema" retorna as 9 features reais esperadas,
> "Cadastros" retorna Proprietários + Clientes.
>
> — **Sessão anterior (2026-07-29, continuação 11): Troca da logomarca padrão pra
> `artemis4_light_b.png` em `/artemis4`, `/admin/login` (as 2 peles) e no `AdminHeader.tsx`
> pós-login (commit `cff1fb1`).** Pedido direto do usuário. Achado no caminho: a pele CRM
> do login (`?system=crm`, "Olhos de Águia") usava por engano uma imagem do Artemis4 com um
> path com erro de digitação (`Artetmis4.JPEG`) nunca notado antes — perguntado ao usuário se
> trocava ali também (marca visualmente diferente) ou deixava fora do escopo; escolheu trocar
> também, por ser claramente um resíduo, não uma escolha deliberada de manter uma marca à
> parte (diferente da decisão já tomada sobre `DashboardHelpModal.tsx` numa sessão anterior,
> que era mesmo intocado de propósito). Achado técnico relevante: o asset novo tem fundo
> **branco opaco**, sem transparência (confirmado nas 2 variantes irmãs também —
> `artemis4_light_a.png` idem, `artemis4_dark.png` nem é logo, é um mockup completo de
> apresentação de marca, não usado) — nos 2 lugares de fundo escuro (header da landing, pele
> CRM do login, e o `AdminHeader.tsx` quando `theme.mode==='dark'`, usado hoje pelo layout da
> Central de Mensagens) precisou de uma badge/círculo branco ao redor pra não aparecer como
> caixa branca crua; no login padrão (já claro) e no header do admin em modo claro (maioria
> dos casos hoje) a imagem já se encaixa direto. Verificado ao vivo nas 3 telas (imagem
> carrega, wrapper branco confirmado via `getComputedStyle`) — **exceto o fallback do
> `AdminHeader.tsx` em si**, que não pôde ser exercitado com um tenant real: os 4 tenants
> ativos deste banco já têm logo próprio configurado (prioridade 1 no código, intocada),
> então nenhum hoje realmente cai no fallback que troquei — confirmado em vez disso que a
> string exata retornada carrega como imagem válida (1024px), e a lógica em si segue o mesmo
> padrão (`if/return` de literal) já usado e comprovado antes. `npx tsc --noEmit`: 53 erros,
> mesma baseline, zero novos.
>
> — **Sessão anterior (2026-07-29, continuação 10): Bug real encontrado testando o teste
> sugerido de outra coisa: mapa de cor por segmento em `ClientSelector.tsx` nunca batia com
> nenhum segmento real desta base (commit `1bbe5d5`).** Usuário mandou um print testando o
> item "pill de estado ativo fica dourado" no seletor "Para um Cliente" — o pill em si já
> estava correto, mas os avatares de iniciais dos clientes na lista ("AS"/"IP") apareciam
> roxo/indigo. Investigação: `SEGMENT_COLORS` (mapa categórico por segmento, mesmo padrão já
> documentado como "taxonomia deliberada, não indigo-por-omissão" em sessões anteriores) tinha
> chaves especulativas (`imobiliario`, `automotivo`, `varejo`, `ecommerce`, `saude`,
> `educacao`, `beleza`, `marketing-digital`) que **nunca correspondiam a nenhum dos 6
> segmentos reais** cadastrados em `public.system_segments` (Imobiliário, Saúde Digital,
> Venda de Carros, Geral, Pet, Master Platform) nem aos slugs reais (`imobiliaria`, `saude`,
> `carros`, `geral`, `pet`, `master`) — e a normalização de string nunca removia acento, então
> mesmo "Imobiliário"→"imobiliário" (minúsculo, mas com acento) não batia com a chave
> `imobiliario` (sem acento). Resultado real, confirmado, não hipotético: TODO cliente de
> QUALQUER segmento desta plataforma sempre caiu no fallback indigo — a diferenciação de cor
> por categoria nunca funcionou de verdade em produção, desde que foi implementada.
> Corrigido: `normalizeSegmentKey()` usa Unicode NFD + remove diacríticos de verdade; mapa
> ganhou chaves reais (nome normalizado E slug, cobrindo os dois formatos que podem chegar)
> pros 6 segmentos + manteve as chaves especulativas antigas (Master pode criar segmento novo
> com qualquer slug a qualquer momento, sem deploy). Verificado ao vivo: os mesmos 2 clientes
> do print original agora `bg-blue-500` (`rgb(59, 130, 246)`), e a lista completa de clientes
> reais da plataforma mostrou cada segmento com sua cor própria (laranja/Carros, rosa/Saúde,
> cinza/Geral) — zero indigo restante. `npx tsc --noEmit`: 53 erros, mesma baseline, zero
> novos. (Quanto ao teste original do spinner do Mapa de Campanhas: confirmado só por
> `getComputedStyle`, `rgb(197,160,40)`/dourado — já estava correto, sem mudança de código.)
>
> — **Sessão anterior (2026-07-29, continuação 9): Tradução de "Tracking" → "Rastreamento"
> e "Trends" → "Tendências" no dashboard (commit `e0c6253`).** Usuário apontou, corretamente,
> que o fix da sessão anterior ("Saúde do Tracking") ainda deixava a palavra "Tracking" em
> inglês, e que "Trends ao vivo" no Radar de Demanda também devia virar 100% português.
> Varredura completa (não só os 2 pontos apontados) encontrou **7 ocorrências a mais** do
> mesmo problema, em 3 arquivos que o fix anterior não tinha tocado: `auditReportService.ts`
> (label + 3 strings de "detail" da dimensão "tracking" do relatório de auditoria — mesma
> etiqueta, tela diferente) e `DashboardHelpModal.tsx` (glossário/dicas/benchmarks do modal
> de Ajuda — 7 ocorrências; a decisão de sessão anterior de manter esse modal intocado era
> só sobre PALETA de cor, não sobre idioma, então não se aplicava aqui). Tradução escolhida
> (`Tracking`→`Rastreamento`) já era consistente com texto pré-existente na própria tela
> ("Score de rastreamento por cliente"/"Score 0-100 da saúde do rastreamento" já estavam em
> português antes desta sessão). Para "Trends": badge `📶 Trends ao vivo`→`📶 Tendências ao
> vivo` e os 2 rótulos "Demanda (Trends)" (tooltip + série do gráfico)→"Demanda (Tendências)"
> em `DemandRadar.tsx`; mantido de propósito **"Google Trends"** na legenda que credita a
> fonte real do dado (nome de produto, mesma categoria de "Meta Pixel"/"YouTube" já
> preservados). Verificado ao vivo (navegador real, segmento Imobiliário, aba Inteligência
> Profunda): `body.innerText` confirma "Saúde do Rastreamento"/"Tendências ao vivo" presentes
> e as versões antigas em inglês ausentes. `npx tsc --noEmit`: zero erros novos nos 6
> arquivos tocados (mesmo artefato stale de `.next/types` de sempre).
>
> — **Sessão anterior (2026-07-29, continuação 8): Testes manuais do Redesign Premium:
> 2 achados durante a rodada de testes do usuário na tela de Leads e no dashboard.**
>
> **(1) "Campanha" e "Ad Set" pareciam mostrar as mesmas opções em `/admin/campanhas/
> dashboard` — investigado, NÃO é bug.** Confirmado em 2 camadas (SQL direto comparando
> nome de campanha vs. ad set no banco, e depois ao vivo no navegador real, sessão
> autenticada, segmento Imobiliário, via `getComputedStyle`/leitura direta dos 2 `<select>`):
> são listas genuinamente diferentes (ex.: campanha "Alto Padrão — Alphaville" → ad set
> "Alphaville 35-60 anos") — a maioria dos dados de teste só nomeou o ad set como
> "`<nome da campanha>` · AdSet", o que faz parecer repetição à primeira vista, mas é a
> hierarquia real do Meta (Campanha → Ad Set → Anúncio), 2 filtros corretos e distintos.
> Nenhuma mudança de código necessária.
>
> **(2) Teste da paginação de `/admin/campanhas/leads` sem dado suficiente — 15 leads de
> teste inseridos temporariamente (aprovados pelo usuário).** Tenant Marketing Digital (admmd)
> tem só 9 leads reais no total, desde sempre (2026-07-04 a 07-08) — nenhum período mais
> largo resolveria, e "Todos os Clientes" só chegaria a 9, ainda abaixo dos 20 necessários
> pra 2ª página aparecer (`PAGE_SIZE=20`). Inseridos 15 leads sintéticos ("TESTE PAGINACAO
> 1..15", `leads_staging`+`marketing_eventos`, `client_id NULL`, datados nas últimas 15h) —
> confirmado via API real que o total no escopo/período testado pelo usuário foi de 6 pra
> 21. **Pendente: remover esses 15 leads assim que o usuário confirmar que já viu o botão
> de página ativa dourado** (tarefa registrada, não esquecida).
>
> **(3) Feedback de UX na seção "Tracking Health" (commit `e8713b3`):** usuário apontou 2
> problemas reais — nome em inglês (3 ocorrências: widget compacto, estado "sem dado ainda"
> e o heading da seção, em `TrackingHealthWidget.tsx` + `DeepDiveView.tsx` +
> `dashboard/page.tsx`) e o botão de atualizar (↺) "extremamente pequeno, pode passar
> despercebido". Corrigido: título → "Saúde do Tracking" (nome que o próprio código já usava
> internamente num comentário — "Saúde do Tracking (FASE 8)"); botão de atualizar aumentado
> (`p-2`→`p-2.5`, `h-4`→`h-5`) e recolorido pra `gold-premium` (era cinza neutro por design
> — decisão revertida a pedido explícito do usuário, que preferiu destacá-lo mais). Verificado
> ao vivo: `getComputedStyle` do ícone confirma `rgb(197, 160, 40)` (gold-premium exato) e
> 20px. `npx tsc --noEmit`: zero erros novos (único erro a mais no total é artefato stale de
> `.next/types`, build output, não código-fonte).
>
> — **Sessão anterior (2026-07-29, continuação 6): "Entrar" lento em `/artemis4` de novo —
> issue crônico já documentado em 2026-07-11, causa raiz confirmada idêntica, fix anterior
> reforçado (commit `2e9d42f`).** Usuário reportou o mesmo sintoma de sessões antigas: clicar
> "Entrar" demora "um século" antes de mostrar o login. Antes de mexer em qualquer coisa,
> confirmado ao vivo (2 `curl` seguidos em `/admin/login`) que é **exatamente** o mesmo
> fenômeno de sempre — Next.js em modo DEV compila cada rota sob demanda no 1º hit depois de
> cada restart do servidor (3,57s frio vs 0,24s morno, medido agora) — e **não** uma
> regressão das mudanças de CSP/CSRF desta mesma sessão (confirmado diretamente, não
> assumido). O fix de 2026-07-11 (pré-aquecer `/admin/login` via `requestIdleCallback` ao
> montar `/artemis4`) continuava no código, mas tinha uma lacuna real: esperava até 4s de
> ociosidade antes de disparar — como "Entrar" é o 1º CTA visível na tela, um clique rápido
> (a ação óbvia da página) batia o aquecimento na corrida e pagava o compile frio do mesmo
> jeito. Corrigido: o `fetch` de aquecimento agora dispara direto no mount, sem esperar
> ociosidade/timeout nenhum. Verificado ao vivo (aba nova, network log limpo): a requisição
> pra `/admin/login` já aparece resolvida (`200 OK`) na primeira leva de chamadas da página,
> junto dos chunks JS/CSS iniciais — antes só aparecia depois de 3-4s. `npx tsc --noEmit`: 52
> erros, mesma baseline, zero novos. Sem custo real em produção (rota já vem pré-compilada no
> build de produção — o fenômeno inteiro é exclusivo de `next dev`).
>
> — **Sessão anterior (2026-07-29, continuação 5): Fix real de CSP encontrado ao VERIFICAR
> AO VIVO (commit `7b10fb9`), não hipotético.** Usuário pediu automatizar 2 coisas
> (rotina de teste local + automação do grep de log em produção) — investigação mostrou que
> ambas as automações propostas tinham custo desproporcional (headless browser novo pra
> local; socket do Docker montado noutro container pra prod, ironicamente uma concessão de
> segurança sensível) frente a uma alternativa mais simples (notificação direta do próprio
> processo). Perguntado ao usuário: escolheu NÃO adicionar nenhuma automação nova — nem
> prober headless, nem notificação Slack — confirmando que o pipeline já construído
> (report-uri + log) já bastava.
>
> Com o servidor dev já reiniciado (confirmado via `curl -I`, sem eu precisar tocar em
> nenhum processo), aproveitei pra fazer uma verificação real com navegador de verdade (meu
> Browser pane) em `/artemis4` — e ela encontrou um problema GENUÍNO: **83 violações reais
> de CSP por carregamento**, não hipotéticas. Isolado o payload exato via instrumentação
> temporária (gravação em arquivo, revertida depois — mesmo padrão de diagnóstico já usado
> nesta sessão) + o evento nativo `securitypolicyviolation` do navegador: 2 causas distintas,
> ambas cobertas erradas na política original —
> **(1) `eval` em `script-src` (81 ocorrências)** — o Next.js em modo DEV usa `eval()`
> internamente pro source-map do Fast Refresh (`devtool: 'eval-source-map'`, confirmado que
> este projeto deixa automático); build de produção não usa. Corrigido com `'unsafe-eval'`
> só em dev, mesmo padrão condicional já usado pro MinIO.
> **(2) `https://www.youtube.com/iframe_api` + `.../www-widgetapi.js` (`script-src-elem`)**
> — achado real que o inventário original errou: a página carrega o script da IFrame Player
> API do YouTube DIRETO nela, não só dentro do iframe embutido — eu só tinha colocado
> `youtube.com` em `frame-src`, faltava em `script-src`. Corrigido.
> Revalidado com aba de navegador **limpa** (não a mesma usada pra diagnosticar, pra não
> herdar histórico) em `/artemis4` e numa página real de imóvel: **zero violação em ambas**
> depois do fix, confirmado via `read_network_requests` (0 POSTs pro endpoint de report).
> **Lacunas de verificação registradas com honestidade, não escondidas:** Meta Pixel
> (`connect.facebook.net`/`www.facebook.com`) segue sem teste ao vivo — tenant Master ainda
> sem `pixel_id` configurado (pendência antiga, não desta sessão); `img-src` do MinIO
> (`localhost:9000`) não foi exercitado — o imóvel testado (id 31) não tinha foto real fora
> do `/_next/image` otimizado. `npx tsc --noEmit`: 52 erros, mesma baseline, zero novos.
>
> — **Sessão anterior (2026-07-29, continuação 4): Auto-report de violações de CSP (commit
> `39646a9`), resposta a "não sei como irei observar".** Depois de implementar Fase 1 (CSP
> Report-Only) e Fase 2 (CSRF log-only) — ver resumo logo abaixo — o usuário apontou, com
> razão, que "checar o Console do navegador/terminal por um tempo" não é um processo real
> executável. Resolvido eliminando a etapa manual: adicionado `report-uri` à política CSP
> apontando pro novo endpoint público `POST /api/public/security/csp-report`
> (`src/app/api/public/security/csp-report/route.ts`) — o NAVEGADOR dispara esse POST
> sozinho, automaticamente, sempre que detecta uma violação (mesmo em modo Report-Only, que
> continua sem bloquear nada). O endpoint só `console.warn` o relatório (rate-limited via
> `applyPublicRateLimit`, reaproveitado de `src/lib/security/rate-limiter.ts` — mesmo teto de
> qualquer rota pública, pra não virar vetor de flood de log) — sem tabela nova, sem mudança
> de comportamento. Com isso, `[CSP-VIOLATION]` (novo) e `[CSRF-CHECK]` (Fase 2) caem no
> MESMO lugar — os logs do processo do servidor — sem exigir nenhum passo manual:
> **produção (Docker):** `docker logs netimobiliaria-app | grep -E "CSP-VIOLATION|CSRF-CHECK"`
> a qualquer momento (Docker retém o histórico); **dev local:** aparece direto no terminal
> rodando `npm run dev` enquanto a aplicação é usada normalmente. `npx tsc --noEmit`: 52
> erros, mesma baseline, zero novos no endpoint criado.
>
> — **Sessão anterior (2026-07-29, continuação 3): Plano de endurecimento: Fase 1 (CSP
> Report-Only) e Fase 2 (CSRF via Origin/Referer, log-only) implementadas, na mesma sessão
> que fechou a Fase -1/Fase 0 (resumo completo logo abaixo).** Usuário perguntou "como
> podemos avançar ainda em relação a essa questão de segurança?" — as duas fases seguintes
> do plano aprovado (`C:\Users\T-GAMER\.claude\plans\crystalline-riding-squid.md`) foram
> desenhadas pra serem risco zero por construção: nenhuma delas bloqueia nada nesta rodada,
> só observam/logam, exatamente como o plano exige antes de promover qualquer uma pra modo
> bloqueante.
>
> **Fase 1 — CSP em `Content-Security-Policy-Report-Only` (commit `4018855`):** antes de
> escrever a política, levantamento real (grep + leitura de código) de quais domínios
> externos o NAVEGADOR de fato carrega — chamadas server-to-server (Graph API do Meta,
> Google OAuth/Translation/Calendar/Gemini) não entram, CSP não as governa. Achado: só 3
> dependências externas reais do lado do browser — Meta Pixel (`connect.facebook.net` +
> beacon `www.facebook.com`, injeta script inline via `dangerouslySetInnerHTML`, por isso
> `script-src` precisou de `'unsafe-inline'`), YouTube embed em `/artemis4`
> (`www.youtube.com`, `frame-src`), e MinIO só em dev (`localhost:9000` — em produção passa
> pelo proxy Caddy `/storage/*`, mesma origem, não precisa entrar na política). Os ~30
> domínios de notícia no `images.remotePatterns` do `next.config.js` (globo, uol, forbes,
> dezeen etc.) ficaram de fora de propósito — são só pro otimizador de imagem do Next
> (server-side), o navegador só vê `/_next/image`, mesma origem. Também: o bloco de headers
> de segurança (`X-Frame-Options` etc.), que só rodava em produção, passou a rodar sempre —
> sem isso, violação de CSP só seria percebida depois de já estar em produção. Verificado
> via `node -e` carregando o config e resolvendo `headers()` nos 3 branches
> (`NODE_ENV` vazio/`development`/`production`) — condicionais de MinIO-dev-only e
> HSTS-prod-only corretos nos 3 casos. Não verificado ao vivo no navegador nesta sessão —
> havia um processo `node.exe` já ocupando a porta 3000 (possível sessão de dev ativa do
> usuário) e, perguntado explicitamente, o usuário optou por reiniciar o próprio servidor
> quando conveniente, não eu. **Pendente da próxima sessão que tocar o servidor:** reiniciar
> pra carregar o `next.config.js` novo, abrir uma página de imóvel + `/artemis4`, checar o
> Console do navegador por linhas `[Report Only]` — não deveria bloquear nada, mas qualquer
> violação inesperada aponta um domínio que faltou no inventário, a ajustar antes de promover
> a política pra modo bloqueante.
>
> **Fase 2 — CSRF via Origin/Referer em modo log-only (commit `01f786b`):** novo
> `src/lib/security/csrfOriginCheck.ts` — compara o header `Origin` (ou `Referer` como
> fallback) contra a origem real vista pelo próprio Next.js (`request.nextUrl.origin`, deriva
> do Host/`X-Forwarded-Host` — funciona em dev e produção sem allowlist fixa que poderia
> ficar desatualizada), só pra rotas `/api/*` de método que muda estado
> (POST/PUT/PATCH/DELETE), excluindo `/api/public/*` e `/api/cron/*` (webhooks/cron
> legítimos, chamados de fora do navegador, nunca têm `Origin`). Só `console.warn` — nunca
> bloqueia. **Achado real ao plugar isso:** o `matcher` do `src/middleware.ts` excluía `/api`
> inteiramente (`(?!api|...)`)  — ou seja, esse middleware NUNCA rodava em nenhuma rota de
> API até agora, só em páginas. Precisou ganhar um segundo padrão (`'/api/:path*'`) pro
> `logCsrfOriginCheck` de fato rodar; `isProtectedRoute` (lógica de redirect de sessão pra
> `/admin`/`/crm`) nunca casa com pathname iniciando em `/api`, então o comportamento de
> página existente não muda em nada com essa ampliação. Removido também o campo `csrf`
> decorativo de `src/app/login/page.tsx` — gerado via `Math.random()` no client, confirmado
> que nunca era lido nem enviado por `handleSubmit` (que já usa `fetch` via
> `useAuth().login()`, não um POST de formulário cru) e nunca validado no servidor; mantê-lo
> ao lado da defesa real (Origin/Referer) só daria falsa sensação de segurança. `npx tsc
> --noEmit`: 52 erros, mesma baseline, zero novos nos 3 arquivos tocados/criados. Não
> verificado ao vivo (mesma razão da Fase 1 — sem restart do servidor) — o log de
> `[CSRF-CHECK]` aparece no TERMINAL do `next dev`, não no console do navegador; pendente
> observar por um tempo antes de decidir a política de bloqueio real, conforme o plano exige.
>
> — **Sessão anterior (2026-07-29, continuação 2): Plano de endurecimento de
> autenticação/sessão: Fase -1 (XSS real) + Fase 0 (2 fixes de higiene) implementadas.**
> Depois da varredura do cookie
> fantasma (ver resumo logo abaixo), o usuário fez uma pergunta de arquitetura genuína:
> "essa alternativa de checar os acessos pelo cookie, em detrimento de checar por autenticação
> no header, não deixa toda a aplicação vulnerável a falhas e outros riscos?" — pediu em
> seguida um plano de endurecimento de verdade (investigação primeiro, zero alteração,
> análise completa de impacto/risco de quebra) e, antes de aprovar, exigiu uma avaliação
> honesta e direta de quão vulnerável a aplicação está HOJE, sem nenhuma das correções — "seja
> bem honesto atuando como um profissional senior de cibersecurity". Investigação (3 agentes
> de pesquisa dedicados, só leitura) mapeou os 3 sistemas de sessão paralelos da plataforma
> (admin/corretor/público, cada um duplicando o mesmo JWT em cookie `httpOnly` + `localStorage`
> JS-legível) e produziu um plano faseado, salvo em `C:\Users\T-GAMER\.claude\plans\
> crystalline-riding-squid.md`. **Avaliação honesta dada ao usuário antes da aprovação:** a
> pergunta original (CSRF via cookie) é risco BAIXO-MODERADO hoje — `sameSite:'lax'` é
> mitigação padrão da indústria e funciona na prática, não é porta aberta; MAS existe uma
> vulnerabilidade REAL, ativa, com cadeia de exploração completa até roubo de sessão de admin,
> não-teórica: upload de documento de imóvel grava `nome_arquivo` sem sanitização (permissão de
> corretor comum, não exclusiva de admin) → interpolado sem escape num `document.write()` em
> `DocumentosLista.tsx`/`DocumentModal.tsx`, usado na página PÚBLICA do imóvel → script injetado
> roda na mesma origem do painel admin → lê `localStorage.getItem('admin-auth-token')`, o JWT de
> sessão de 7 dias, bearer token puro, funciona de qualquer lugar sem depender de cookie/CSRF
> nenhum. Essa avaliação elevou o fix desse XSS a uma "Fase -1" urgente e independente do resto
> do roadmap (que segue válido, mas é menos urgente) — usuário aprovou o plano com essa moldura.
>
> **Implementado nesta sessão (Fase -1 + Fase 0, commit `2a4886b`):**
> **Fase -1 — fechado o XSS real:** `document.write()` em `DocumentosLista.tsx` e
> `DocumentModal.tsx` reescrito pra nunca mais interpolar dado externo (`nome_arquivo`/`url`) numa
> string HTML — agora recebe só markup 100% estático e fixo; nome do arquivo e URL do PDF são
> atribuídos DEPOIS via propriedades seguras do DOM (`element.textContent`, `document.title`,
> `iframe.src` — nenhuma delas é parseada como markup) + allowlist de esquema de URL
> (`/^(https?:)?\/\//i.test(url) || url.startsWith('/')`, bloqueia `javascript:` antes mesmo de
> abrir o popup). **Verificado ao vivo, não só por leitura de código:** testado no navegador real
> com um payload malicioso (`'"><img src=x onerror=window.__xssFired=true>.pdf'`) atribuído via
> `textContent`/`.title` — resultado: `xssFired:false` (o handler nunca executa), `innerHTML`
> mostra os caracteres `<`/`>` escapados como entidade HTML (`&lt;`/`&gt;`), confirmando que o
> navegador trata a string como texto puro, nunca como marcação — exatamente o comportamento que
> fecha a cadeia de exploração descrita na avaliação de risco.
> **Fase 0 (2 dos 3 itens do plano — item 1, remover o campo `csrf` decorativo de
> `src/app/login/page.tsx`, foi deliberadamente adiado pra dentro da Fase 2, que ainda decide se
> vira a base real de defesa CSRF ou é só removido):**
> (2) `secure:false` hardcoded em `/api/admin/auth/refresh/route.ts` (2 ocorrências, cookies
> `accessToken`/`refreshToken`) corrigido pra `process.env.NODE_ENV === 'production'`, mesmo
> padrão já usado em `login/route.ts` — exigia atacante já em posição de rede pra explorar, não
> era emergência, mas corrigido junto por ser risco de quebra zero.
> (3) `getUserFromLocalStorage()` removida de `src/middleware/publicAuth.ts` — fazia
> `jwt.verify()` no client usando uma env var (`NEXT_PUBLIC_JWT_SECRET`) que nunca é definida em
> nenhum `.env` real da plataforma; confirmado via grep que a função tinha ZERO callers antes de
> remover — código morto, mas um padrão perigoso se alguém reativasse sem perceber que o secret
> nunca existiu de verdade. `publicAuthMiddleware` (a outra função do mesmo arquivo, com checagem
> correta server-side) ficou intocada, mesmo também sem uso — fora do escopo deste fix pontual.
> `npx tsc --noEmit`: 52 erros, mesma baseline pré-existente, zero novos nos 4 arquivos tocados.
>
> **Ainda pendente do plano, não iniciado nesta sessão:** Fase 1 (Content-Security-Policy —
> precisa de levantamento completo de domínios externos genuinamente usados — Meta Pixel,
> YouTube em `/artemis4`, MinIO/S3 — e rollout em modo Report-Only antes de bloquear) e Fase 2
> (defesa CSRF real via checagem de Origin/Referer, reaproveitando a lógica já escrita mas nunca
> plugada em `environmentMiddleware.ts`, também com período de observação em modo log antes de
> aplicar de verdade). Fase 3 (auditoria das ~132 rotas "zona cinzenta" não classificadas) e a
> eliminação total do token duplicado em localStorage seguem explicitamente FORA de escopo desta
> rodada — o próprio plano documenta o porquê (200+ call-sites, 3 sistemas de login paralelos,
> `useAuth.tsx` precisaria reescrita, zero suíte de testes automatizados no projeto pra verificar
> uma refatoração desse tamanho sem navegar manualmente por cada tela).
>
> — **Sessão anterior (2026-07-29, continuação): Varredura completa do bug de cookie fantasma
> "accessToken" em toda a base de código.** Depois de corrigir o Kanban de Leads (ver
> resumo anterior abaixo), o usuário pediu uma varredura minuciosa pra saber se o mesmo
> padrão quebrava qualquer outra funcionalidade — a pendência tinha ficado registrada como
> "não atacada" no fix anterior. Delegado o levantamento a um agente de pesquisa dedicado
> (não confiar em heurística de grep rápido, que já tinha dado 1 falso positivo antes) —
> retornou uma tabela completa das 44 rotas afetadas, classificando cada uma por presença
> de fallback de Authorization e por quem realmente a chama no frontend. **Achado que
> simplificou toda a correção:** o cookie real (`admin_auth_token`) é `httpOnly` — o
> navegador já o envia AUTOMATICAMENTE em toda requisição same-origin, mesmo `fetch()` cru
> sem nenhum header manual (httpOnly só impede LEITURA via JS, nunca bloqueia o envio
> automático pelo navegador). Ou seja, o problema nunca foi "frontend esquece de mandar o
> token" — era só o backend checar o nome ERRADO de cookie (`accessToken`, que nenhum login
> desta plataforma jamais cria). Corrigido com uma troca mecânica e seca (só o nome da
> string checada, nenhuma lógica) em **41 arquivos reais** (2 `route-backup.ts` ficaram de
> fora — não são rotas de verdade pro Next App Router, são cópias de backup mortas).
> Confirmado ao vivo, via `curl` com o token SÓ no cookie (sem nenhum header Authorization,
> pra provar a causa raiz de verdade): `GET /api/crm/stats/dashboard` (dashboard principal
> do CRM) voltou a funcionar; `GET /api/admin/imoveis/[id]/rascunho` (sistema de auto-save
> da edição de imóvel, usado em TODOS os 10 pontos de chamada de `hooks/useRascunho.ts`,
> sempre falhava silenciosamente antes) voltou a responder corretamente; `GET /api/admin/
> user-features` (permissões da sidebar hierárquica) passou a autenticar o usuário
> corretamente (a negação de acesso que ele retorna agora é o controle de permissão real
> funcionando, não mais "usuário nunca reconhecido"). **Achado relacionado, mesma família
> de sintoma mas causa diferente:** 6 componentes administrativos (criar/editar/excluir
> feature de sistema, excluir categoria, excluir perfil, listar usuários de um role) liam
> `localStorage.getItem('auth-token')` — chave que só é populada pelo login de CORRETOR,
> nunca pelo de admin (`admin-auth-token`, a chave real) — corrigidos junto. `npx tsc
> --noEmit`: mesma baseline (52 erros pré-existentes), zero novos nos 47 arquivos tocados.
> **Fora de escopo, documentado no relatório de auditoria, não corrigido por não ter
> nenhum caller real encontrado:** ~9 rotas de `imoveis-debug/[id]/*` sem fallback de
> Authorization nenhum (só o cookie), e 2 componentes seletores (`AmenidadesSelector.tsx`,
> `ProximidadesSelector.tsx`) que fazem fetch cru mas não são importados em lugar nenhum
> do app — candidatos a remoção de código morto numa rodada futura, não tocados aqui.
> Commit `671ad0a`.
>
> — **Sessão anterior (2026-07-29): 2 achados reais investigando a sidebar/CRM do tenant
> admmd.** Usuário perguntou por que "Rede Meta Ads"/"Rede Google Ads" aparecem na sidebar e
> por que nenhuma funcionalidade do CRM ("Gestão de Leads"/"Kanban de Leads") funciona pra esse
> tenant. Investigação (rodando `get_sidebar_menu_for_user()` de verdade pro usuário, não só
> lendo código) revelou 2 causas reais e distintas:
> **(1) Sidebar:** as 3 "Rede X Ads" são toggles de capacidade (`system_features` sem `url`,
> reaproveitando o mecanismo de provisionamento só pra saber se o tenant contratou aquela rede —
> nunca foram pensadas como página) — a função de sidebar nunca filtrava por `url` vazio, então
> qualquer feature assim "vazava" pro menu como item morto (`path: null`). Ao mesmo tempo,
> "Gestão de Leads"/"Kanban de Leads" tinham o MESMO sintoma (`url` vazio) só que por
> esquecimento real — as páginas (`src/app/crm/kanban`, `src/app/crm/leads`) já existiam no
> código. Corrigido com 1 migração (`migration-2026-07-29-sidebar-url-fixes.sql`): populou o
> `url` das 2 entradas de CRM + adicionou um filtro (`sf.url IS NOT NULL AND sf.url <> ''`) na
> função de sidebar, pra qualquer toggle futuro nunca mais vazar sem precisar de exceção por id.
> Verificado via diff do JSON da função antes/depois (só as 4 mudanças esperadas) + sanity check
> em outro tenant real. Commits `9fac3f8` + `5a20cdc` (doc em `ACCESS_CONTROL.md`).
> **(2) CRM de fato não funcionava — bug mais sério, achado ao testar `/crm/kanban` de verdade:**
> o quadro Kanban sempre mostrava 0 leads em toda coluna, pra QUALQUER tenant (não só admmd).
> Causa: `src/app/crm/kanban/page.tsx` chamava `fetch()` cru (sem header de autenticação) pra 3
> endpoints, que por sua vez liam o token de um cookie chamado `accessToken` — que **nenhum
> fluxo de login desta plataforma jamais seta** (o cookie real é `admin_auth_token`). Sem token
> nenhum, toda query `WHERE tenant_id = $1` recebia `$1=NULL` e nunca casava com nada. Achado um
> 2º bug juntamente: `GET /api/crm/kanban/colunas` **nunca teve filtro de tenant nenhum** —
> retornava as colunas de TODOS os tenants misturadas (explicando as várias "LEAD CAPTADO"/"EM
> ANÁLISE" repetidas na tela, uma por tenant + 7 linhas órfãs legadas). Corrigido: `page.tsx`
> passou a usar `adminFetch` nas 3 chamadas; os 3 endpoints (`leads`, `kanban/colunas`,
> `kanban/move`) passaram a checar o cookie certo; `kanban/colunas` ganhou isolamento completo
> por tenant (GET/POST/DELETE). Testado ao vivo, ponta a ponta, sessão real do admmd: GET
> colunas retornou exatamente as 7 do tenant (antes: todas de todos), GET leads retornou os 6
> reais (antes: 0), a tela renderizou os 6 leads corretamente, POST move testado nos dois
> sentidos e revertido sem resíduo. Commit `3c9045c`.
>
> — **Sessão anterior (2026-07-28): Fix real: filtro de Origem em `/admin/campanhas/leads` não
> afetava os cards/gráficos do topo.** Usuário reportou, testando o Redesign Premium recém
> concluído (ver resumo anterior abaixo), que qualquer opção escolhida no filtro "Origem" da
> tela de Leads mostrava sempre os mesmos resultados. Investigação encontrou **2 bugs reais e
> independentes**, ambos confirmados ao vivo antes e depois do fix — nunca corrigido "no escuro":
> (1) `GET /api/admin/campanhas/leads/stats` **nunca lia o query param `origem`** — só o
> endpoint irmão (`GET /api/admin/campanhas/leads`, que alimenta a tabela "Últimos Leads" no
> rodapé) já filtrava corretamente; os cards do topo (Total Leads, Média/Dia, os 2 gráficos)
> sempre mostravam o total geral, dando a falsa impressão de que o filtro inteiro não tinha
> efeito. Corrigido replicando a mesma condição já usada no endpoint irmão
> (`COALESCE(me.plataforma, 'direto') = origem`) — commit `c1605a9`. (2) **Race condition real**
> encontrada durante a investigação (não hipotética — confirmada no próprio network log da
> sessão): `useClientSelector` troca `clientFilter` de `'own'` pra `'segment'` logo após o mount
> (comportamento já existente, documentado), disparando múltiplas chamadas a `loadAll()` em
> paralelo sem nenhum cancelamento/sequenciamento — uma resposta mais antiga podia, em teoria,
> sobrescrever uma mais nova. Corrigido com um contador de requisição (`requestIdRef`) em
> `loadAll()`/`goToPage()` — commit `7e754bc`. **Metodologia de verificação, sessão de debug
> colaborativa com o usuário via DevTools do navegador dele (não só o meu):** SQL direto no
> Postgres confirmando os valores reais de `plataforma` por tenant · `curl` direto contra o
> servidor com um JWT gerado na hora, contornando qualquer cache de navegador · leitura da aba
> Network do DevTools do usuário passo a passo (Request URL completa com `origem=whatsapp_
> organico`, Response com `totalLeads:4`, e por fim o próprio card na tela mostrando `4`) — cada
> etapa isolando uma camada diferente (backend puro → rede → estado React → DOM renderizado) até
> confirmar que a cadeia inteira funciona ponta a ponta. Um teste seguinte do usuário
> ("WhatsApp CTA" → 0 leads) inicialmente pareceu suspeito mas se confirmou correto: não existe
> nenhum lead real com essa origem específica nesse tenant — `0` é a resposta certa, não um
> resíduo do bug. `npx tsc --noEmit` limpo nos 2 arquivos tocados em cada commit.
>
> — **Sessão anterior (2026-07-28): Redesign Premium: 3ª rodada — Leads, widgets embutidos do
> Dashboard e componentes compartilhados (Cliente/Segmento/CampanhasModal/LocationPicker) +
> eliminação de redundância de hex solto.** Continuação da pendência do CLAUDE.md ("Redesign
> Premium — parcialmente concluído, resto é opcional se pedido"). Usuário perguntou o ganho real
> de completar `leads/page.tsx` + os componentes compartilhados e pediu pra seguir com ambos.
> Convertidos (indigo-600 → âmbar `#c5a028`/`#020c1b`, mesmo critério das 4 telas anteriores —
> só pontos de decisão/estado-ativo, nunca cor categórica/informativa): `leads/page.tsx` (página
> de leads em si, commit `08ab802`) · 4 widgets embutidos no Dashboard —
> `KpiCard.tsx`/`StageFunnelWidget.tsx`/`TrackingHealthWidget.tsx`/`CampaignMapWidget.tsx`
> (commit `901e0fc`) · `ClientSelector.tsx`/`SegmentSelector.tsx`, os 2 seletores mais reusados
> do módulo (commit `0220815`) · `CampanhasModal.tsx`, o modal "Consultar Campanhas" (commit
> `6946460`) · `LocationPicker.tsx` (etapa de localização do wizard) + `WinningAngleChip.tsx`
> (commit `a960b2e`). **Achado real de arquitetura, levantado pelo usuário no meio da rodada:**
> o `tailwind.config.js` já tinha tokens nomeados (`gold.premium`, `navy.dark`, etc.) pras
> exatas cores que eu vinha escrevendo como hex solto (`bg-[#c5a028]`) — retrofit mecânico nos 9
> arquivos já tocados até aquele ponto pro token nomeado, sem mudança visual (commit `9b1ac7e`).
> **Decisões de "deixar como está" registradas com critério, não só varridas:** `LocationPicker`
> — chips de localidade já adicionada e linhas do dropdown de busca (elementos repetidos por
> item) neutralizados pra cinza em vez de âmbar, pra não diluir o acento único (mesmo critério
> do `AssetCard` de Criativos); `WinningAngleChip` — link "Ver análise →" virou cinza, não âmbar
> (âmbar como cor de TEXTO sobre fundo claro teria contraste insuficiente, diferente de âmbar
> como fundo de botão, já usado em todo o resto); `DashboardHelpModal.tsx` — avaliado por
> completo e mantido **intocado**, sem nenhuma conversão: todo o indigo ali (ícone "?", botão
> "Ajuda", aba ativa interna, hover de card, link de expandir) forma uma identidade visual
> coerente e autocontida do recurso de Ajuda — converter só parte quebraria essa consistência
> interna, converter tudo pra âmbar tornaria "Ajuda" indistinguível do CTA primário e do aviso
> de IA (que também usa âmbar); `WinningAngleChip.ANGLE_COLORS`/`StatusBadge`/`FunnelBadge` do
> `CampanhasModal` — taxonomias categóricas deliberadas (1 cor fixa por categoria), mesmo padrão
> de `SEGMENT_COLORS`/`STAGE_COLORS` já preservado nas rodadas anteriores. Verificado em cada
> commit via `npx tsc --noEmit` (baseline de 53 erros pré-existentes, zero novos) + pelo menos
> 1 valor computado real conferido ao vivo no navegador por arquivo (`getComputedStyle`,
> incluindo confirmar que a classe nova `accent-gold-premium` do slider do `LocationPicker`
> realmente compila no Tailwind — `rgb(197, 160, 40)` confirmado). **Ainda fora de escopo,
> nunca pedido nesta rodada:** as ~13 páginas do módulo que nunca entraram no escopo do
> Redesign Premium (aprovações, auditoria, desperdício, destinos, iniciativas, mecanismos,
> portfolio, publicações, configurações/redes) — continuam com indigo genérico, sem terem sido
> avaliadas ainda. — **Sessão anterior (2026-07-28): Consolidação de worktrees: conferido o
> estado real dos 4 fronts.** Usuário pediu pra conferir o estado real de `netimob-google`, `netimob-cherrypick` e
> `netimob-imgfix` (a tabela do CLAUDE.md é só um snapshot, pode estar desatualizada). Checado via
> `git merge-base --is-ancestor` (não por suposição): `netimob-google`
> (`feature/google-ads-implementation`) e `netimob-cherrypick` (`feature/mensageria-rag`) já
> estão 100% mergeados em `feature/ag-cockpit-camadas` — nenhum trabalho pendente, worktrees
> redundantes (mantidos por ora, não removidos sem pedido explícito). `netimob-imgfix`
> (`fix/next-image-minio-localhost`) tinha 1 commit real e ainda não mergeado
> (`00cb95a`, 15/07) — confirmado por inspeção direta do código (não só pelo git log) que o bug
> que ele corrige (fotos de imóveis não aparecendo na landpaging/página de detalhe, causa raiz:
> o otimizador de imagem do Next não segue o redirect 302 de `/api/public/imagens/[id]` pro
> MinIO) **ainda estava presente** neste worktree principal — `SafeImage.tsx` sem o unoptimize
> condicional, `LandingPropertyCard.tsx` sem o mesmo tratamento, `next.config.js` sem
> `localhost:9000` nos `remotePatterns`. Trazido via `git cherry-pick 00cb95a` (não merge da
> branch inteira, pra evitar conflito irrelevante com `CLAUDE.md`, que tinha divergido nos dois
> lados por motivos não relacionados) — aplicado sem conflito, commit `cdadf4d`, `npx tsc --noEmit`
> limpo nos 3 arquivos tocados. Não reverificado visualmente no navegador — o commit original já
> tinha sido testado ao vivo pelo autor ("fotos reais confirmadas na landpaging e na página de
> detalhe"), e o código trazido é byte-a-byte idêntico. — **Sessão anterior (2026-07-28): T6
> (webhook de Instant Form do TikTok) — achado real de
> pesquisa: bloqueado por T2, não é mais "opcional independente".** Usuário perguntou se T6 tinha
> sido resolvido e declarou a regra "nenhum lead invisível de nenhuma rede", o que tornaria T6
> obrigatório em vez de opcional — antes de implementar (mesmo rigor já usado na pesquisa do
> webhook do Google), fui checar a documentação REAL da TikTok Business API (o fetch estático
> falhou — é um SPA que só renderiza via JS — resolvido navegando de verdade via browser e lendo
> o iframe same-origin renderizado). Achado: o mecanismo do TikTok é estruturalmente diferente do
> Google — lá o CLIENTE configura URL+chave self-serve na própria tela dele; no TikTok, SOMOS NÓS
> que chamamos `POST /subscription/subscribe/` com `app_id`/`secret` do nosso app + `access_token`
> do cliente via OAuth — os mesmos 2 pré-requisitos de T2 (app aprovado + conexão OAuth com a
> conta do cliente). **T6 não pode ser adiantado independente de T2**, ao contrário do que
> `PLANO_TIKTOK.md` §3 presumia ("espelhando `/api/public/google-leads/webhook`" — suposição
> incorreta, corrigida). Documento atualizado com o payload real do webhook (`entry[].changes[]`
> com `name`/`phone_number`/`email`/etc.) pra quando T2 destravar. Decisão do usuário: documentar
> agora, implementar só quando T2 for desbloqueado — nenhum código escrito nesta rodada. Quanto à
> regra em si ("nenhum lead invisível"): já é estruturalmente cumprida hoje — o wizard nunca
> oferece Instant Form como CTA pro TikTok (`instant_form_supported=false`, Fase 1 do §3, já
> implementada desde T1/T3), então nenhuma campanha lançada por esta plataforma pode gerar lead
> invisível; o único jeito de isso acontecer é o cliente configurar um Instant Form manualmente
> direto no TikTok Ads Manager dele, fora da nossa ferramenta — fora do nosso controle, mesma
> limitação inerente de qualquer plataforma terceira. — **Sessão anterior (2026-07-28):**
> **Redesign Premium concluído nas 4 superfícies do módulo de
> Campanhas** (pendência do CLAUDE.md "Redesign Premium — ativar skill `impeccable`"): Dashboard,
> Configurações, CampaignWizard e Criativos, uma checkpoint por vez com aprovação do usuário
> antes de seguir pra próxima. Passe estreito e deliberadamente reversível (não uma reconstrução
> total): substitui o indigo-600 genérico por `#c5a028`/`#020c1b` (o acento âmbar do "Painel de
> Missão", já definido em `PRODUCT.md`/`DESIGN.md` deste projeto) nos pontos reais de
> decisão/estado-ativo — CTAs primários, seleção única (cards de rede/formato/objetivo/template),
> toggles de escolha exclusiva ou multi-select central à tela, navegação de etapas — e fixa o
> anel de foco em `#2563eb` (regra do DESIGN.md, independente do acento). Removido também 1
> padrão explicitamente banido pelo DESIGN.md (side-stripe border colorida na linha selecionada
> da lista de clientes em Configurações). Deixado de propósito como estava: ícones/badges/textos
> informativos (não são decisão), o componente `InterestsPicker` inteiro do wizard e as
> micro-ações repetidas por card da galeria de Criativos (plurais/reincidentes — promovê-los ao
> acento único diluiria a "Regra do Acento Único" do próprio DESIGN.md) e os 2 sub-sistemas com
> marca própria já estabelecida (azul `#1877f2` do Meta em Configurações, violeta do modal
> "Criar com IA" em Criativos). Verificado via `npx tsc --noEmit` (zero erros novos em cada
> arquivo) + inspeção de estilo computado ao vivo no navegador em cada superfície (o Browser pane
> não estava compositando screenshot nesta sessão — `javascript_tool`/`getComputedStyle` usado
> como substituto, incluindo clique real em controles pra confirmar estado ativo/selecionado).
> Commits: `6458f32` (Dashboard), `becdc3f` (Configurações), `03b43e7` (CampaignWizard), `f1704b1`
> (Criativos). — **Sessão anterior (2026-07-28, Contratação de rede):** cada rede de
> anúncio (Meta/Google/TikTok) agora é gateada por tenant via o sistema genérico de
> provisionamento já usado pelo resto da plataforma (`system_features` +
> `tenant_feature_overrides`, tela `/admin/master/provisioning`) — decisão explícita do usuário
> pra não duplicar em colunas soltas em `tenants`. `/admin/campanhas/nova` ganhou botões
> separados por rede (Meta Ads / TikTok Ads / Google AI Max), cada um desabilitado quando a rede
> não está contratada+conectada pro tenant logado. Testado ao vivo com token Master (bypass) e
> token de tenant real (TikTok corretamente desabilitado com "Rede não contratada"). Ver seção
> "Última tarefa concluída" abaixo. — **Sessão anterior (2026-07-27, TikTok/T4):** T4, o motor
> de realocação de verba
> cross-rede (`docs/PLANO_TIKTOK.md` §8), está formalmente concluído**: migração + elegibilidade
> de 11 critérios + execução atômica com PIN + notificação WhatsApp + medição D+14 + circuit
> breaker (2 camadas: suprime sugestão nova e bloqueia execução de proposta já aprovada) + UI
> (card no dashboard, "Para onde mover" no Desperdício, histórico com veredito) + os 16 cenários
> formais da Trilha H — tudo testado ao vivo contra dado real, zero mudança de código necessária
> nos testes formais (o motor bateu com a especificação do plano em todos os casos). Só falta T2
> (adapter real do TikTok), bloqueado por aprovação externa do app no TikTok for Business. Ver
> seção "Última tarefa concluída" abaixo para o detalhe completo. — **Trilha B e Trilha C do
> teste rigoroso concluídas por completo** (`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`).
> Trilha B: roteiro manual
> confirmado item a item, 3 bugs reais achados e corrigidos (disclaimer de "Conversões"
> generalizado Meta+Google, CPL nulo em 2 telas, filtro de rede na Visão 4) +, fora do escopo
> original mas confirmado com o usuário, uma leva de bugs reais de multi-tenant na validação de
> CPF/e-mail de clientes/proprietários (nunca funcionava — faltava tenantId) + gate de módulo na
> tela pós-cadastro de cliente. Trilha C: 5 cenários de campanha com cliente de teste dedicado,
> Fases 0-5 executadas ponta a ponta com dado real (leads, CRM/Kanban até negócio fechado,
> Mensageria, todos os dashboards, Agentes) — achou e corrigiu 1 bug real (`expandEndOfDay`
> faltando em Insights da IA/Briefing, excluía leads do próprio dia) + corrigiu documentação
> desatualizada do Agente Autônomo no CLAUDE.md. Todo dado de teste (Trilha C) removido ao
> final, 0 resíduo confirmado. Trilha D/E (conta real Google/simulação) seguem não iniciadas.
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar — e também ao retomar após
> interrupção, antes de continuar, para não repetir o mesmo hiato de documentação.

---

## Tarefa em andamento

**Nenhuma.** Dono do lead manual (creator-as-owner) + exclusão híbrida de lead (permanente/
reversível) estão concluídos e testados — ver entrada no topo deste arquivo ("Atualizado em:
2026-08-16"). `/crm` (Caminho 1 — fim de ROI/custo, dashboard 100% CRM-nativo + Valor
Estimado) está formalmente concluído — ver entrada no topo deste arquivo ("Atualizado em:
2026-08-13 (continuação)"). `docs/PLANO_AGENTES_ACELERACAO_CRM.md` e
`docs/PLANO_PENDENCIA_ATENDIMENTO.md`
(G0-G6) estão formalmente concluídos, e o badge "Agente de IA" vs "Atendente" nas Atividades
do CRM (pedido direto do usuário, ver entrada no topo deste arquivo, "Atualizado em:
2026-08-09") também — implementado, testado ao vivo com dado real (bot M4.1 e reativação
automática G6) e limpo. Nota histórica preservada abaixo (F0-F5 dos Agentes de Aceleração):
F0 a F5 dos Agentes de Aceleração do CRM implementadas e testadas (ver entradas no topo deste
arquivo, "F5 — Recalibração de Score" e "F4 — Reativação"). Os 5 agentes (`speed_to_lead`,
`stage_stagnation`, `next_best_action`, `reactivation`, `score_recalibration`) existem, estão
registrados no catálogo e têm UI completa de configuração/aprovação — falta só o
usuário/Master decidir ATIVAR cada um de verdade e escolher os parâmetros reais, o que é uma
decisão de negócio, não uma tarefa técnica pendente.

**Nota real pro usuário/Master, não decidida nesta sessão:** os 5 agentes implementados estão
testados e funcionais, mas ficam **desligados por padrão** (mesma disciplina de nunca ativar
automaticamente uma capacidade nova) — pra usar de verdade, é preciso ativá-los em
`/admin/master/segments` → "Agentes de Aceleração" (botão raio, laranja) por segmento, e
decidir os parâmetros reais (`minutos_alerta` pro `speed_to_lead`, `qtd_atividades_contexto`
pro `next_best_action`, `dias_inatividade`/`requer_revisao_extra` pro `reactivation`,
`janela_dias`/`divergencia_minima_pct`/`min_leads_amostra` pro `score_recalibration` — todos
aparecem como sugestão clicável no próprio modal, não precisa mais saber o nome de cabeça;
`sla_hours` do `stage_stagnation` já existe por coluna via "Personalização Kanban", só falta o
tenant/Master decidir valores reais por etapa em vez do default de 24h). Cada tenant também
pode sobrepor o padrão do segmento, agente a agente, em `/crm/config/agentes` (sidebar →
Configurações CRM) — a mesma tela tem a aba "Aprovações Pendentes" (fila de ações do
`reactivation` aguardando decisão humana, sem precisar do link de WhatsApp+PIN). As sugestões
de recalibração de score (`score_recalibration`) aparecem inline junto de cada regra em
`/admin/master/segments` → "Qualificação de Lead por IA (CRM)" (Master) e `/crm/config/ia`
(tenant), não na aba "Aprovações Pendentes" — decisão de UX tomada em F5 pra manter a
sugestão junto do contexto da regra que ela afeta.

**Decisão real pendente do usuário, específica de `reactivation`:** o plano previu
`requer_revisao_extra` como trava extra pra segmentos sensíveis (Saúde foi o exemplo citado) —
implementado e testado, mas **nenhum segmento tem essa flag ativada ainda**; decidir e
configurar fica com o usuário/Master antes de ligar o agente de verdade pra Saúde.

**Pendência real registrada, não endereçada:** F1/F2 notificam 1:1 (uma mensagem por lead),
não em digest agrupado como o plano original (§7 item 3) propunha — não chegou a ser um
problema real nos testes desta sessão, mas um tenant com muitos leads estagnados ao mesmo
tempo pode gerar uma enxurrada de WhatsApp/Slack.

Pendência real registrada em sessão anterior, deliberadamente fora de escopo: endurecer as
rotas administrativas individuais de `/api/crm/*` contra chamada direta via API sem passar
pela UI (o gate `crm_ia_ativa` cobre o uso real via `CRMLayoutContent.tsx`, não uma blindagem
de API completa).

Pendências mais antigas, ainda não atacadas: o caminho de SUCESSO do sync multi-rede
(POST /insights/sync contra API real de rede, não verificado ao vivo — token de teste
sintético bate num 403 genuíno de RBAC). Redesign Premium do CRM (`CLAUDE.md` §1b) documentado
mas não implementado, por decisão do usuário. **(Os 15 leads "TESTE PAGINACAO" foram removidos
em 2026-08-08 — pendência fechada.)**

**Resíduo de teste NÃO removido, por não ser meu pra decidir:** 3 leads no tenant Marketing
Digital com cara de teste de sessões antigas ("Teste Auto Atribuicao", "Teste Backward Compat",
"Teste Cliente Proprio") — diferente dos "TESTE PAGINACAO", nunca foram registrados como
pendência de limpeza minha, então ficaram intactos (mesma disciplina já aplicada a uma atividade
de teste pré-existente em 2026-08-04). Confirmar com o usuário antes de apagar.

**(Pendência antiga sobre `crm_segmentos_config`/`domain_id` em `roi/route.ts` — fechada em
2026-08-13: a rota foi renomeada pra `performance/route.ts` e não usa mais aquela tabela
legada em nenhum ponto; ver entrada no topo deste arquivo.)**

## Última tarefa concluída

### Sessão 2026-08-13 (continuação) — `/crm`: fim de ROI/custo + dashboard CRM-nativo + Valor Estimado ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-13 (continuação)"). Caminho
1 (supressão total de ROI/CAC/CPL) decidido pelo usuário depois de rejeitar até a versão
"verificada e parcial" (Caminho 3) da rodada anterior mesma data. Substituído por Leads
Captados/Negócios Fechados/Negócios Perdidos/Pipeline Aberto/Taxa de Conversão + Performance
por Vendedor (100% agnóstico, via `corretor_atribuido_id`, sem gamificação) + Motivos de Perda
+ captura disciplinada de Valor Estimado por etapa configurável do Kanban. Bug real achado e
corrigido na própria verificação: `valor_venda` tinha `DEFAULT 0` (não NULL) desde sempre,
fabricando um "negócio fechado de R$0" em todo lead — corrigido na raiz (schema + API +
`NovoLeadModal.tsx`, que também tinha um campo legado de captura prematura de valor real).

### Sessão 2026-08-08 — Vigilância de Pendência de Atendimento: G0 a G5 ✅ — frente completa

`docs/PLANO_PENDENCIA_ATENDIMENTO.md` está formalmente concluído (§6.2=G0 … §6.7=G5, §6.8 = o
estado final). Nasceu de uma pergunta do usuário sobre o alcance do F1 e acabou substituindo os
três relógios de "primeiro toque" da plataforma por um relógio contínuo por lead, com escada de
escalonamento 100% automática que termina em reatribuição, fila de resgate visível, e a
reativação (F4) finalmente despachando a ação certa. **Nada ativado em produção** — decisão de
negócio do usuário/Master.

### Sessão 2026-08-08 — Pendência de Atendimento G0 + G1 + G2 + G3 + G4 ✅

Ver resumo no topo e o plano em `docs/PLANO_PENDENCIA_ATENDIMENTO.md` (§6.2=G0 … §6.6=G4).
Com G4 a frente ganha superfície: dá pra marcar alguém de atestado pela tela (com data de
retorno, para a pessoa voltar sozinha à fila) e a fila de resgate deixou de ser invisível.
Falta só G5 (F4 lendo o estado, fechando o Buraco D).

### Sessão 2026-08-08 — Pendência de Atendimento G0 + G1 + G2 + G3 ✅

Ver resumo no topo e o plano em `docs/PLANO_PENDENCIA_ATENDIMENTO.md` (§6.2=G0, §6.3=G1,
§6.4=G2, §6.5=G3). Com G3 o Buraco A está fechado (lead sem dono volta a ser oferecido à
distribuição a cada rodada e tem fila visível) e o Buraco B foi verificado como já coberto —
sem mexer em `atribuicao_expira_em`, o que teria sido a correção errada. Faltam G4 (UI) e
G5 (F4 lendo o estado, Buraco D).

### Sessão 2026-08-08 — Pendência de Atendimento G0 + G1 + G2 ✅

Ver resumo completo no topo e o plano em `docs/PLANO_PENDENCIA_ATENDIMENTO.md`
(§6.2 = G0, §6.3 = G1, §6.4 = G2). Com G2 a escada deixa de só avisar e passa a corrigir:
reatribuição automática, indisponibilidade respeitada nas 4 estratégias de distribuição
(cobrindo também captação inicial e transbordo), e ninguém punido por estar de licença.
Faltam G3 (fila de resgate + fix do Buraco B), G4 (UI) e G5 (F4 lendo o estado, Buraco D).

### Sessão 2026-08-08 — Pendência de Atendimento G0 + G1 ✅

Ver resumo completo no topo deste arquivo e o plano em `docs/PLANO_PENDENCIA_ATENDIMENTO.md`
(§6.2 = G0, §6.3 = G1). G1 entrega o motor que de fato vigia: escada de degraus automática,
idempotência por episódio (rearma a cada ida e volta da bola), digest anti-flood, e a absorção
do F1. Faltam G2 (reatribuição automática), G3 (fila de resgate + fix do Buraco B), G4 (UI) e
G5 (F4 lendo o estado, fechando o Buraco D).

### Sessão 2026-08-08 — Pendência de Atendimento G0 (fundação "de quem é a bola") ✅

Ver resumo completo no topo deste arquivo e o plano em
`docs/PLANO_PENDENCIA_ATENDIMENTO.md` (§6.2 tem o detalhe da G0 e os 3 achados de teste).
Fundação do relógio contínuo que substitui os três relógios de "primeiro toque" da
plataforma. Nada dispara ainda — o motor (G1) e a escada de escalonamento (G2/G3) são as
próximas fases.

### Sessão 2026-08-07 (continuação) — Hardening: Ganho/Perda do Kanban vira booleano explícito ✅

Ver resumo completo no topo deste arquivo ("Hardening real de agnosticismo de segmento").
Achado real de uma auditoria pedida pelo usuário (não hipotética): 4 consumidores
reconheciam "negócio fechado"/"perdido" só comparando `kanban_colunas.nome` contra os
literais `'fechamento'`/`'perdido'` — o mesmo campo que qualquer tenant sempre pôde renomear
livremente. Corrigido com 2 colunas booleanas (`is_ganho`/`is_perda`), editáveis na mesma tela
de Personalização Kanban, com mútua exclusão validada no servidor e no cliente. Provado ao
vivo que a vulnerabilidade era real (renomear a etapa quebrava CPA/ROAS com a lógica antiga) e
que a correção resolve (mesma etapa renomeada continua reconhecida corretamente com a lógica
nova).

### Sessão 2026-08-07 — F5 (Recalibração de Score) dos Agentes de Aceleração do CRM ✅ — plano completo

Ver resumo completo no topo deste arquivo ("F5 — Recalibração de Score"). Último agente do
catálogo — único que opera sobre regras (não leads); reordenação automática por conversão
real + sugestão de ajuste de score com aprovação 1-clique, tolerante ao replace-all do editor
de regras. Com esta fase, `docs/PLANO_AGENTES_ACELERACAO_CRM.md` está formalmente concluído.

---

### Sessão 2026-08-07 — F4 (Reativação) dos Agentes de Aceleração do CRM ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-07", seção "F4 — Reativação").
1º agente `OFFENSIVE` de verdade do catálogo — fluxo de aprovação PIN+WhatsApp e aba
"Aprovações Pendentes" autenticada, envio real via WhatsApp reaproveitando a infra da
Mensageria, trava `requer_revisao_extra` pra segmentos sensíveis.

---

### Sessão 2026-08-06 — F0 (Fundação) + F0.5 (Score de Fit/ICP) + F1 (Velocidade de 1º Contato) + F2 (Estagnação por Etapa) + F3 (Next Best Action) dos Agentes de Aceleração do CRM ✅

Ver resumo completo no topo deste arquivo ("F0 (Fundação)... concluídas e testadas").

---

### Sessão 2026-08-04 (continuação 7) — Reconstrução de `/crm/config/ia` (qualificação de lead por IA) ✅

Ver resumo completo no topo deste arquivo ("continuação 7" logo abaixo da entrada de
2026-08-06).

---

### Sessão 2026-08-03 (continuação 6) — Filtro "vigente" no dropdown de Campanha, com toggle ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação 6)").

---

### Sessão 2026-08-03 (continuação 5) — Fix real: piso de recência em generateAiInsights() sem período ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação 5),
histórico").

---

### Sessão 2026-08-03 (continuação 4) — Sync multi-rede + gate de provisionamento + badge de rede descontinuada ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação 4),
histórico").

---

### Sessão 2026-08-03 (continuação 3) — Fix: link "Ver análise →" roxo no card CREATIVE_FATIGUE ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação 3),
histórico").

---

### Sessão 2026-08-03 (continuação 2) — Fix: google-logo.png 404 + feedback visual/retry manual ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação 2),
histórico").

---

### Sessão 2026-08-03 (continuação) — Fix real: retry pros botões de rede em /nova ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03 (continuação),
histórico").

---

### Sessão 2026-08-03 — Fix real: círculo indigo residual no LocationPicker (2º caminho de código) ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-03, histórico").

---

### Sessão 2026-08-02 (continuação 4) — Fix real: trocar pra Google AI Max de dentro do wizard ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-02 (continuação 4), histórico"). Commit `c1fe33a`.

---

### Sessão 2026-08-02 (continuação 3) — Container discreto + "Sinais Interesse" no Desempenho Acumulado ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-02 (continuação 3), histórico"). Commits `0ee57a7` + `a168d83`.

---

### Sessão 2026-08-02 (continuação 2) — Desempenho Acumulado + destaque da data de criação por card ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-02 (continuação 2), histórico"). Commit `26ef853`.

---

### Sessão 2026-08-02 — Fix real: busca do "Consultar Campanhas" era seleção exata, não texto livre ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-02 (histórico)"). Commit `5392cb0`.

---

### Sessão 2026-08-01 — Fix real: horário de veiculação errado no card + label "CAMPANHA " ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-08-01 (histórico)"). Commit `93f1c5a`.

---

### Sessão 2026-07-31 — `npx tsc --noEmit` zerado (53 → 0), bugs reais no caminho ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-31 (histórico)"). Commits `587754e` + `acb4e8b`.

---

### Sessão 2026-07-30 (continuação 8) — Sugestão concreta de hook (Caminho A/B) no aviso de saturação ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 8)"). Commit `465840b`.

---

### Sessão 2026-07-30 (continuação 7) — Fix real: hook_type fora do enum contaminava aviso de saturação ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 7)"). Commit `e8ebc48`.

---

### Sessão 2026-07-30 (continuação 6) — Fix real: wizard de campanha lento + refazia escolha de rede ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 6)"). Commit `bed3a7a`.

---

### Sessão 2026-07-30 (continuação 5) — TikTok Ads provisionado (teste) + paginação esclarecida ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 5)"). Commit `af2fe90`.

---

### Sessão 2026-07-30 (continuação 4) — Fix real: ícone de calendário afastado do campo de data ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 4)"). Commit `45f129c`.

---

### Sessão 2026-07-30 (continuação 3) — Ajustes de UX: label "Período de veiculação" + "Otimizado para" ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 3)"). Commit `32ce711`.

---

### Sessão 2026-07-30 (continuação 2) — "Consultar Campanhas": pivot de cliente + período por veiculação + prewarm ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação 2)"). Commit `47a683f`.

---

### Sessão 2026-07-30 (continuação) — Fix real: dropdown de Segmento ignorava color_theme real ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30 (continuação)"). Commit `e56e9a2`.

---

### Sessão 2026-07-30 — Lacuna real de provisionamento (Sistema + Cadastros) ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-30"). Commit `df218f6`.

---

### Sessão 2026-07-29 (continuação 11) — Troca de logomarca padrão (artemis4_light_b) ✅

Ver resumo completo no topo deste arquivo. Commit `cff1fb1`.

---

### Sessão 2026-07-29 (continuação 10) — Fix real: mapa de cor por segmento nunca batia (ClientSelector) ✅

Ver resumo completo no topo deste arquivo. Commit `1bbe5d5`.

---

### Sessão 2026-07-29 (continuação 9) — Tradução completa "Tracking"→"Rastreamento" + "Trends"→"Tendências" ✅

Ver resumo completo no topo deste arquivo. Commit `e0c6253`.

---

### Sessão 2026-07-29 (continuação 8) — Testes manuais: achados Campanha/Ad Set + Tracking Health ✅

Ver resumo completo no topo deste arquivo. Commit `e8713b3`. Pendência: limpar os 15 leads
de teste (ver "Tarefa em andamento" acima).

---

### Sessão 2026-07-29 (continuação 6) — "Entrar" lento em /artemis4: fix crônico reforçado ✅

Ver resumo completo no topo deste arquivo. Commit `2e9d42f`.

---

### Sessão 2026-07-29 (continuação 5) — Fix real de CSP (eval dev-only + youtube script-src) ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-29 (continuação 5)").
Commit `7b10fb9`.

---

### Sessão 2026-07-29 (continuação 4) — Auto-report de violações de CSP ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-29 (continuação 4)").
Commit `39646a9`.

---

### Sessão 2026-07-29 (continuação 3) — Hardening Fase 1 (CSP Report-Only) + Fase 2 (CSRF log-only) ✅

Ver resumo completo no topo deste arquivo. Commits `4018855` (Fase 1) + `01f786b` (Fase 2).

---

### Sessão 2026-07-29 (continuação 2) — Hardening Fase -1 (XSS real) + Fase 0 (2 itens) ✅

Ver resumo completo no topo deste arquivo. Commit `2a4886b`.

---

### Sessão 2026-07-29 (continuação) — Varredura completa do cookie fantasma "accessToken" ✅

**Contexto:** o fix do Kanban de Leads (sessão anterior, mesmo dia) tinha registrado como
pendência não atacada: "esse mesmo padrão de cookie inexistente aparece em ~40 outras rotas
do sistema — vale ficar de olho". Usuário pediu explicitamente uma varredura minuciosa em
vez de deixar como risco aberto.

**Metodologia:** delegado o levantamento completo a um agente de pesquisa dedicado (Explore),
com instrução explícita de NÃO confiar em heurística de grep de proximidade de texto — na
sessão anterior, um `grep -A3` rápido tinha classificado errado 1 arquivo como "sem fallback
de Authorization" quando na verdade ele checava o header primeiro, só que numa ordem diferente
no código. O agente leu cada um dos 44 arquivos por completo e cruzou com quem realmente
chama cada rota no frontend (via `useApi`/`useAuthenticatedFetch`/`adminFetch`/fetch cru),
produzindo um veredito individual: SEGURO / QUEBRADO / QUEBRADO-PARCIAL / SEM-CALLER-
ENCONTRADO / ROTA-MORTA.

**Achado que simplificou a correção inteira:** o cookie real de sessão
(`admin_auth_token`) é gravado com `httpOnly: true` no login. Isso significa que o
NAVEGADOR já anexa esse cookie automaticamente em toda requisição same-origin — inclusive
`fetch()` cru sem nenhum header manual — porque `httpOnly` só impede LEITURA via
`document.cookie`/JS, nunca bloqueia o envio automático pelo navegador. Ou seja: ao
contrário do que a sessão anterior presumiu (que a causa era sempre "frontend esquece de
mandar o Bearer"), a causa raiz real, na maioria dos casos, era só o backend checar o NOME
ERRADO de cookie (`accessToken`, que nenhum login desta plataforma jamais cria). Isso reduz
a correção de "auditar e corrigir caller por caller" para uma troca mecânica e segura de
uma única string, em cada arquivo, sem tocar em nenhuma lógica de controle.

**Corrigido:** troca de `cookies.get('accessToken')` → `cookies.get('admin_auth_token')` em
**41 arquivos reais** (2 `route-backup.ts` deixados de fora — nome de arquivo não é
`route.ts`, o Next App Router não os registra como rota, são cópias de backup mortas,
confirmado que não são importados em lugar nenhum).

**3 rotas confirmadas quebradas pelo agente, reverificadas ao vivo depois do fix** (via
`curl` mandando o token SÓ como cookie, nunca como header Authorization, pra provar que a
causa raiz real é a que foi corrigida, não uma coincidência de outro caminho):
- `GET /api/crm/stats/dashboard` (dashboard principal do CRM, `/crm`) — antes sempre
  falhava (mesma causa raiz do bug do Kanban já corrigido); depois: `{"success":true,
  "stats":[...]}` com os 6 leads reais do tenant Marketing Digital.
- `GET /api/admin/imoveis/[id]/rascunho` (sistema de auto-save da edição de imóvel via
  `hooks/useRascunho.ts` — usado nos 10 pontos de chamada do hook, incluindo criar/atualizar/
  descartar rascunho) — antes sempre falhava silenciosamente pra qualquer imóvel, qualquer
  tenant; depois: `{"success":true,"rascunho":null}` (resposta honesta — sem rascunho
  ativo pro imóvel testado, não mais um erro de autenticação mascarado).
- `GET /api/admin/user-features` (alimenta a lista de permissões da sidebar hierárquica em
  `HierarchicalSidebar.tsx`) — antes nunca reconhecia nenhum usuário; depois autentica
  corretamente e aplica o controle de permissão de verdade (a negação de acesso que retornou
  no teste é o sistema de permissões funcionando como desenhado pro role testado, não mais
  "usuário nunca identificado").

**Achado relacionado, investigado durante a mesma varredura, causa diferente mas sintoma
idêntico (401 silencioso):** 6 componentes administrativos — `CreateSystemFeatureModal.tsx`,
`EditSystemFeatureModal.tsx`, `DeleteSystemFeatureModal.tsx`, `DeleteCategoryModal.tsx`
(`categorias/`), `DeletePerfilModal.tsx`, `RoleUsersModal.tsx` — liam
`localStorage.getItem('auth-token')`, uma chave que só é populada pelo fluxo de login de
CORRETOR (`CorretorLoginModal.tsx`), nunca pelo login de admin (a chave real é
`admin-auth-token`, confirmada em `src/lib/auth/adminFetch.ts` e em toda tela do painel
administrativo). Corrigidos os 8 pontos de leitura nesses 6 arquivos pra usar a chave certa.

**Verificado:** `npx tsc --noEmit` — mesma baseline pré-existente (52 erros), zero novos em
qualquer um dos 47 arquivos tocados nesta rodada.

**Fora de escopo, documentado no relatório do agente, não corrigido por não ter nenhum
caller real encontrado em `src/app`/`src/components`/`src/hooks` (garantidamente quebrado
SE algum dia alguém chamar, mas sem impacto hoje):** ~9 rotas de `imoveis-debug/[id]/*`
que checam só o cookie, sem fallback de Authorization nenhum. Registrado também, mas fora
do escopo desta correção de bug de auth (candidato a limpeza de código morto numa rodada
futura, não tocado aqui): 2 componentes seletores (`AmenidadesSelector.tsx`,
`ProximidadesSelector.tsx`) que fazem fetch cru sem auth mas não são importados em lugar
nenhum do app.

Commit `671ad0a`.

---

### Sessão 2026-07-29 — Sidebar (Rede Ads + links mortos de CRM) e Kanban de Leads real ✅

**Contexto:** usuário perguntou (1) por que "Rede Meta Ads"/"Rede Google Ads" aparecem na
sidebar do tenant `admmd`, e (2) por que nenhuma funcionalidade do CRM ("Gestão de Leads",
"Kanban de Leads") é acionada pra esse mesmo tenant.

**Achado 1 — sidebar mostrando itens sem página real, commits `9fac3f8` + `5a20cdc`:**
rodei `get_sidebar_menu_for_user()` de verdade pro `admmd` (não só lido o código) e confirmei:
as 3 "Rede X Ads" são toggles de capacidade (`system_features.url` vazio de propósito —
reaproveitam o mecanismo de provisionamento só pra saber se o tenant contratou aquela rede,
nunca foram pensadas como página, consumidas só por `GET /api/admin/campanhas/configuracoes/
redes`). "Gestão de Leads"/"Kanban de Leads" tinham o MESMO sintoma (`url` vazio) só que por
esquecimento genuíno — as páginas (`src/app/crm/kanban/page.tsx`, `src/app/crm/leads/page.tsx`)
já existem no código, só nunca foram linkadas. Corrigido via
`prisma/migration-2026-07-29-sidebar-url-fixes.sql`: populei o `url` das 2 entradas de CRM
(`/crm/kanban`, `/crm/leads`) + adicionei um filtro na função (`sf.url IS NOT NULL AND sf.url
<> ''`) pra qualquer toggle de capacidade (presente ou futuro) nunca mais vazar pra sidebar sem
precisar de exceção por id. Verificado via diff do JSON retornado pela função antes/depois —
só as 4 mudanças esperadas (3 toggles somem, os 2 links de CRM ganham path real) — e sanity
check rodando a função pra outro tenant real (Imobiliaria XYZ, 2 usuários, sem erro).

**Achado 2 — bug mais sério, achado testando `/crm/kanban` de verdade no navegador:** o quadro
Kanban mostrava **0 leads em toda coluna**, mesmo com 6 leads reais confirmados no banco pro
tenant. Isso não era específico do `admmd` — afetava QUALQUER tenant. Causa raiz:
`src/app/crm/kanban/page.tsx` chamava `fetch()` cru (sem nenhum header de autenticação) pros
3 endpoints de dados (`/api/crm/kanban/colunas`, `/api/crm/leads`, `/api/crm/kanban/move`) —
únicas 3 chamadas do arquivo que não usavam `adminFetch` nem passavam o Bearer manualmente
(as outras 2 chamadas do mesmo arquivo, `fetchTenantConfig`/`fetchAgendamentos`, já faziam
certo). Sem esse header, e sem NENHUM login desta plataforma jamais setar o cookie que os 3
endpoints tentavam ler (`accessToken` — o cookie real é `admin_auth_token`, confirmado em
`/api/admin/auth/login`), `getCurrentUser()` sempre retornava `null` → `tenantId = null` → toda
query `WHERE tenant_id = $1` nunca casava com nenhuma linha. **Achado um 2º bug no mesmo lugar,
investigando o 1º:** `GET /api/crm/kanban/colunas` **nunca teve filtro de tenant nenhum** —
retornava as colunas de TODOS os tenants misturadas (explica as várias "LEAD CAPTADO"/"EM
ANÁLISE" repetidas lado a lado na captura de tela que o usuário mandou — um conjunto de 7
colunas por tenant real, mais 7 linhas órfãs legadas com `tenant_id NULL`).

**Corrigido (commit `3c9045c`):** `page.tsx` passou a usar `adminFetch` nas 3 chamadas; os 3
endpoints (`leads/route.ts`, `kanban/move/route.ts`, e o novo `getCurrentUser` de
`kanban/colunas/route.ts`) passaram a checar o cookie certo (`admin_auth_token`);
`kanban/colunas/route.ts` ganhou isolamento completo por tenant nos 3 métodos (GET filtra por
`tenant_id`, POST seta `tenant_id` no INSERT e exige `tenant_id` no UPDATE, DELETE verifica
posse antes de apagar) — mesmo padrão já usado em `leads/route.ts` e `move/route.ts`.

**Testado ao vivo, ponta a ponta, sessão real do `admmd`** (JWT gerado com `userId` real,
setado em cookie + localStorage, mesmo playbook já documentado neste arquivo): `GET colunas`
retornou exatamente as 7 do tenant Marketing Digital (antes: todas de todos os tenants
misturadas) · `GET leads` retornou os 6 leads reais (antes: 0, sempre) · a tela do Kanban
renderizou os 6 leads corretamente na coluna "Lead Captado", as demais 6 colunas com 0 (correto
— nenhum lead avançou ainda) · `POST move` testado nos dois sentidos num lead real (Lead
Captado → Em Análise → Lead Captado de volta), confirmado sem resíduo depois via SQL direto.
`npx tsc --noEmit`: mesma baseline pré-existente, zero erros novos nos 4 arquivos tocados.

**Fora de escopo desta rodada, registrado honestamente:** o padrão de cookie `accessToken`
(nunca setado por nenhum login) aparece em ~40 outras rotas de API além das 3 corrigidas aqui
(a maioria delas funciona hoje porque é chamada via `adminFetch`, que sempre manda o Bearer
header — o problema só se manifesta quando o caller usa `fetch()` cru, como era o caso aqui).
Não auditei nem toquei nas outras ~37 rotas — fica registrado como um padrão a verificar se
outro sintoma parecido aparecer em outra tela do CRM.

---

### Sessão 2026-07-28 (continuação 5) — Fix: filtro de Origem na tela de Leads (2 bugs reais) ✅

**Contexto:** durante o roteiro de testes do Redesign Premium concluído na sessão anterior, o
usuário reportou: "qualquer que seja a opção escolhida no filtro 'Origem', os resultados
exibidos são sempre os mesmos... como se não estivesse realmente filtrando".

**Bug 1 — backend nunca lia o filtro (commit `c1605a9`):** `GET /api/admin/campanhas/leads/
stats/route.ts` nunca extraía `sp.get('origem')` — a tabela de leads no rodapé da página
(endpoint irmão, `GET /api/admin/campanhas/leads`) já filtrava certinho, mas os cards do topo
("Total Leads", "Média/Dia") e os 2 gráficos ("Sinal × Total Leads por Dia", "Leads por
Origem") vinham do endpoint `/stats`, que sempre devolvia o total geral. Testado direto no
Postgres antes de mexer no código (`docker exec ... psql`) pra confirmar os valores reais de
`marketing_eventos.plataforma` do tenant Marketing Digital: `whatsapp_organico`=4,
`cta_app_form`=2, `cta_api`=1. Corrigido adicionando a mesma condição já usada no endpoint
irmão (`COALESCE(me.plataforma, 'direto') = origem`) ao `WHERE` compartilhado por todas as
queries da rota. Verificado com `curl` direto (sem navegador) pros 3 cenários: sem filtro→6,
`whatsapp_organico`→4, `meta_lead_ads` (sem lead real)→0 — todos exatos.

**Bug 2 — race condition real, achada investigando o Bug 1 (commit `7e754bc`):**
`useClientSelector('leads')` troca `clientFilter` de `'own'` pra `'segment'` automaticamente
logo após o mount (comportamento pré-existente, documentado em sessão anterior) — confirmado ao
vivo no próprio network log da sessão do usuário que isso dispara 3-4 chamadas a `loadAll()`
em sequência rápida a cada carregamento de página, **sem nenhum cancelamento ou sequenciamento**
entre elas. Sem proteção, uma resposta mais antiga (ex.: sem `origem`) que demorasse mais pra
resolver no servidor podia sobrescrever o estado de uma resposta mais nova (já filtrada),
dando exatamente a sensação relatada de "o filtro não teve efeito". Corrigido com um contador
de requisição (`requestIdRef`, incrementado a cada `loadAll()`/`goToPage()`) — a resposta só
atualiza o estado se ainda for a requisição mais recente disparada.

**Depuração colaborativa via DevTools do navegador do próprio usuário** (não só o meu) —
mesmo depois dos 2 fixes, o usuário ainda via "o mesmo resultado", o que levantou a dúvida
honesta de se havia um 3º bug ainda não encontrado. Isolado camada por camada, sem assumir
nada: (1) SQL direto — confirmou os dados reais; (2) `curl` com JWT gerado na hora, contornando
qualquer cache de navegador — confirmou o backend puro; (3) leitura guiada da aba Network do
DevTools do usuário (Request URL completa com `origem=whatsapp_organico`, aba Response com
`totalLeads:4`) — confirmou que a resposta CERTA estava chegando no navegador dele; (4)
pergunta direta sobre o que a TELA (não o DevTools) mostrava naquele exato momento — confirmou
`4`, batendo com a resposta. Cada etapa isolou uma camada diferente (banco → servidor → rede →
estado React → DOM) até fechar o ciclo completo sem nenhum salto de fé. Um teste seguinte do
usuário (selecionar "WhatsApp CTA" → 0 leads) inicialmente pareceu suspeito, mas se confirmou
**correto, não um resíduo do bug**: não existe nenhum lead real com essa origem específica
(`cta_whatsapp`) nesse tenant — zero é a resposta certa, e o próprio fato de números diferentes
aparecerem pra origens diferentes (4, 0, e por decorrência 6/2/1 nas demais) já é a prova de
que o filtro funciona ponta a ponta.

**`npx tsc --noEmit` limpo nos 2 arquivos tocados** (`leads/stats/route.ts`,
`leads/page.tsx`) em cada commit. Nenhum push imediato — enviado só ao final, a pedido
explícito do usuário ("faça commit de tudo e push no github remoto").

---

### Sessão 2026-07-28 (continuação 4) — Redesign Premium: Leads + widgets do Dashboard + componentes compartilhados ✅

**Contexto:** depois das 4 telas principais do Redesign Premium (Dashboard, Configurações,
CampaignWizard, Criativos — ver entrada "continuação" abaixo), o CLAUDE.md registrava como
pendência opcional "`leads/page.tsx` (nunca entrou no escopo desta rodada) e os componentes
compartilhados de gráfico". Usuário perguntou "qual será o ganho se implementarmos ambos?" —
respondido em 2-3 frases (consistência visual completa do módulo + esses componentes
reaparecem em quase toda tela, então o ganho de cada correção se multiplica) — usuário
confirmou "siga então".

**Implementado, 4 commits de conversão + 1 de refatoração, mesmo critério das rodadas
anteriores (indigo-600 → âmbar `#c5a028`/`#020c1b`, só em pontos reais de
decisão/estado-ativo, nunca cor categórica/informativa):**

1. **`leads/page.tsx`** (commit `08ab802`) — anéis de foco, hover de linha da tabela (neutro,
   não âmbar) e botão de página ativa da paginação.
2. **4 widgets embutidos no Dashboard** (commit `901e0fc`) — `KpiCard.tsx` (glow de hover
   neutralizado de indigo pra branco/preto — Regra Flat-By-Default; botão de referência do
   Hook Rate), `StageFunnelWidget.tsx` (botão + painel "Diagnosticar gargalo com IA",
   unificado com a cor já usada nos outros avisos de IA), `TrackingHealthWidget.tsx` (botão
   "Executar 1ª verificação"), `CampaignMapWidget.tsx` (spinner).
3. **`ClientSelector.tsx` + `SegmentSelector.tsx`** (commit `0220815`) — os 2 seletores mais
   reutilizados do módulo (aparecem em quase toda tela): pills de estado selecionado, anel do
   dropdown aberto, anéis de foco da busca, spinner, linha selecionada no dropdown. No
   `SegmentSelector`, consolidado um caso de 3 sinais de cor simultâneos numa linha selecionada
   (fundo+texto+badge todos mudando junto) pra só o checkbox mudar — Regra do Acento Único.
4. **`CampanhasModal.tsx`** (commit `6946460`) — modal "Consultar Campanhas": pill de dia da
   semana ativo no agendamento, botão de página ativa da paginação interna, 4 anéis de foco de
   select, hover do botão "Limpar filtros".
5. **`LocationPicker.tsx` + `WinningAngleChip.tsx`** (commit `a960b2e`) — etapa de localização
   do wizard: botão "Salvar/Adicionar", slider de raio E o círculo desenhado no mapa Leaflet
   (cor real do overlay, não só classe Tailwind) viram âmbar; `WinningAngleChip`'s link
   "Ver análise →" vira cinza.

**Achado real de arquitetura, levantado pelo próprio usuário no meio da rodada** ("não
teríamos como refatorar de forma que haja total reutilização e eliminação de redundância de
código?"): o `tailwind.config.js` já tinha tokens nomeados (`gold.premium: '#c5a028'`,
`navy.dark: '#020c1b'`, `gold: '#d4af37'`, `navy`/`navy.light`) pras exatas cores que eu vinha
escrevendo como hex arbitrário (`bg-[#c5a028]`) desde a 1ª rodada — nunca tinha percebido que
já existiam. **Commit `9b1ac7e`** — retrofit mecânico (`sed`) nos 9 arquivos já tocados até
aquele ponto, trocando todo hex solto pelo token nomeado equivalente (zero mudança visual,
mesmo valor — só elimina a duplicação do literal espalhado pelo código). Verificado: grep
confirma zero hex solto restante (2 referências em comentário, inofensivas), `tsc` limpo,
`getComputedStyle` no botão "Sync Meta" confirma `rgb(197, 160, 40)`/`rgb(2, 12, 27)`,
idêntico a antes do retrofit.

**Decisões de "deixar como está" nesta rodada, cada uma com critério explícito (não foi
varredura cega de indigo→âmbar):**
- `LocationPicker.tsx` — chips de localidade já adicionada e linhas do dropdown de busca
  (elementos que se repetem, um por item na lista) neutralizados pra **cinza**, não âmbar —
  mesmo critério já usado no `AssetCard` de Criativos (repetição dilui o acento único).
- `WinningAngleChip.tsx` — link "Ver análise →" virou **cinza**, não âmbar: âmbar como cor de
  TEXTO sobre fundo claro (`#c5a028` em branco) fica abaixo do contraste mínimo de 4.5:1 pra
  texto pequeno — diferente de âmbar como FUNDO de botão (`bg-gold-premium text-navy-dark`),
  que é o uso padrão em todo o resto do módulo e não tem esse problema.
- `DashboardHelpModal.tsx` — **avaliado por completo e mantido 100% intocado**, nenhuma
  conversão. Todo o indigo do arquivo (ícone "?", botão "Ajuda", aba ativa dentro do modal,
  hover de card, link "ver mais detalhes") forma uma identidade visual coerente e autocontida
  do recurso de Ajuda/Guia — não é indigo-por-omissão. Converter só parte quebraria essa
  consistência interna (aba ativa em âmbar mas hover de card ainda indigo, por exemplo);
  converter tudo pra âmbar tornaria "Ajuda" visualmente indistinguível do CTA primário E do
  aviso de IA (que também é âmbar) — 3 significados diferentes competindo pela mesma cor. Mesmo
  princípio já aplicado à paleta por-segmento do `SegmentSelector` e ao pill violeta "Todos os
  Clientes" do `ClientSelector` nas rodadas anteriores: identidade deliberada e distinta, não
  indigo-padrão a corrigir.
- Taxonomias categóricas preservadas: `WinningAngleChip.ANGLE_COLORS`/`ANGLE_COLORS_LIGHT`
  (1 cor fixa por ângulo — investimento/estilo de vida/família/...), `StatusBadge`/
  `FunnelBadge` do `CampanhasModal` (1 cor fixa por status/estágio de funil) — mesmo padrão de
  `SEGMENT_COLORS`/`STAGE_COLORS` já preservado desde as primeiras rodadas.

**Verificado em cada commit:** `npx tsc --noEmit` — baseline de 53 erros pré-existentes, **zero
novos** em qualquer arquivo tocado, confirmado depois do último commit também. Pelo menos 1
valor computado real conferido ao vivo no navegador por arquivo/grupo, sessão autenticada real
(tenant Imovtec) — incluindo confirmar que a combinação nova `accent-gold-premium` (nunca usada
antes nesta sessão, é a cor do "thumb"/trilha de um `<input type="range">`) realmente compila no
Tailwind (`getComputedStyle(...).accentColor === 'rgb(197, 160, 40)'`, testado via elemento
sintético já que o slider real fica dentro do wizard, atrás de várias etapas).

**Fora de escopo, nunca pedido nesta rodada, registrado honestamente:** as ~13 páginas do
módulo que nunca entraram no escopo do Redesign Premium original (aprovações, auditoria,
desperdício, destinos, iniciativas — 3 arquivos —, mecanismos, portfolio — 2 arquivos —,
publicações, configurações/redes) continuam com indigo genérico, sem terem sido avaliadas —
não foram tocadas por não terem sido pedidas, não por esquecimento.

**Com isso, a pendência "Redesign Premium" do CLAUDE.md está encerrada no escopo que já foi
pedido em algum momento** (as 4 telas principais + Leads + os componentes efetivamente
compartilhados entre elas). As ~13 páginas nunca atacadas ficam como pendência nova, só se
pedidas — CLAUDE.md atualizado pra refletir isso.

---

### Sessão 2026-07-28 (continuação 3) — Consolidação de worktrees + fix de fotos trazido ✅

**Contexto:** usuário pediu pra conferir o estado real das outras 3 frentes em worktree
(`netimob-google`, `netimob-cherrypick`, `netimob-imgfix`) — a tabela do `CLAUDE.md` que as lista
é só um snapshot de 2026-07-19, explicitamente marcado como "pode estar desatualizada".

**Verificação (não por suposição — `git merge-base --is-ancestor` de cada tip contra o HEAD
atual):**
- `netimob-google` (`feature/google-ads-implementation`, tip `86eecbf`) — **já mergeado**.
- `netimob-cherrypick` (`feature/mensageria-rag`, tip `83d60cf`) — **já mergeado**.
- `netimob-imgfix` (`fix/next-image-minio-localhost`, tip `00cb95a`) — **NÃO mergeado**, 1 commit
  real de 15/07 ("fix: fotos de imóveis não apareciam na landpaging e página de detalhe").

**Achado real, confirmado por inspeção direta do código deste worktree (não só pelo git log):**
o bug que o commit `00cb95a` corrige ainda estava presente aqui. Causa raiz: `/api/public/
imagens/[id]` redireciona (302) pro storage real (MinIO/S3) em vez de reenviar os bytes — o
otimizador de imagem do Next, pra URLs relativas/mesma origem, chama o handler da rota
diretamente em processo em vez de fazer um fetch HTTP real, não segue o redirect, recebe resposta
vazia e quebra ("Input Buffer is empty" no Sharp). Conferido: `SafeImage.tsx` aqui não pulava a
otimização pra esse caminho (`shouldUnoptimize` só cobria `data:`/`blob:`/paths sem `/`),
`LandingPropertyCard.tsx` sem tratamento nenhum, `next.config.js` sem `localhost:9000`/
`127.0.0.1:9000` (MinIO) nos `remotePatterns`.

**Trazido via `git cherry-pick 00cb95a`** (não merge da branch inteira — o commit não toca
`CLAUDE.md`, mas as duas branches tinham divergido nesse arquivo por motivos não relacionados;
cherry-pick evita esse conflito irrelevante). Aplicado sem conflito (`git auto-merge` só em
`next.config.js`), novo commit `cdadf4d`. `npx tsc --noEmit` limpo nos 3 arquivos tocados
(`SafeImage.tsx`, `LandingPropertyCard.tsx`, `next.config.js`). Não reverificado visualmente no
navegador — o commit original já tinha sido testado ao vivo pelo próprio autor ("fotos reais
confirmadas na landpaging e na página de detalhe do imóvel") e o código trazido é byte-a-byte
idêntico, sem nenhuma adaptação.

**Worktrees já mergeados (`netimob-google`, `netimob-cherrypick`) mantidos por ora** — usuário não
pediu remoção, e remover worktree é uma operação que vale confirmar explicitamente antes, mesmo
já confirmado que não têm trabalho pendente.

---

### Sessão 2026-07-28 (continuação 2) — T6: pesquisa real revela bloqueio estrutural por T2 ✅

**Contexto:** usuário perguntou se T6 (webhook de Instant Form do TikTok, `docs/PLANO_TIKTOK.md`
§10) tinha sido resolvido. Resposta: não, nunca foi atacado — é o único item do faseamento do
plano que nenhuma sessão anterior tocou. O usuário então declarou uma regra de negócio explícita:
"não poderá haver nenhum lead invisível vindo de qualquer rede" — o que reabre a questão de se T6
deveria deixar de ser "opcional" e virar obrigatório.

**Antes de implementar qualquer coisa, pesquisa real da API do TikTok** (mesmo rigor já usado na
sessão do webhook do Google — nunca confiar em memória pra contrato de API de terceiro). Tentativas
via `WebFetch`/`WebSearch` bateram num limite real: a documentação oficial
(`business-api.tiktok.com/portal/docs`) é um SPA que só renderiza via JavaScript — o `WebFetch` só
converte HTML estático pra markdown, sem executar JS, então recebia sempre a casca vazia da página
(só título, sem conteúdo). Resolvido navegando de verdade com o Browser pane real (que executa JS)
— achado um detalhe técnico a mais: o conteúdo real fica dentro de um `<iframe>` same-origin
(`business-api.tiktok.com/gateway/docs/...`), acessível via `iframe.contentDocument` direto (sem
problema de CORS, mesmo origin). Navegado pela árvore real: Marketing API → Campaign Management →
Create Lead Generation ads → Lead generation → Webhook subscription → "Subscribe to ad account
Webhook events via Subscription API" — a página certa, com o payload completo documentado.

**Achado real, que muda a resposta:** o mecanismo do TikTok é **estruturalmente diferente** do
usado no webhook do Google (`/api/public/google-leads/webhook`), que o `PLANO_TIKTOK.md` §3
presumia poder "espelhar" — suposição nunca verificada antes, agora confirmada incorreta. No
Google, o CLIENTE configura URL+chave compartilhada direto na própria tela dele do Google Ads —
self-serve, zero dependência da nossa integração além da chave. No TikTok, a inscrição é feita
por NÓS, chamando `POST /subscription/subscribe/` com `app_id`/`secret` do NOSSO app desenvolvedor
+ `access_token` do CLIENTE obtido via OAuth + `advertiser_id` — exatamente os mesmos 2
pré-requisitos que T2 (adapter real) já precisa resolver (app aprovado + conexão OAuth com a conta
do cliente). **T6 não pode ser adiantado independente de T2** — ao contrário do que a entrada
original do faseamento sugeria ("(Opcional)"), agora corrigido pra "bloqueado por T2". Uma vez
inscrito, o payload do webhook já vem completo (sem precisar de uma 2ª chamada de "pull"):
`object:1`, `entry[].id` (lead ID), `lead_source` (`INSTANT_FORM`/`DIRECT_MESSAGE`), `page_id`,
`campaign_id`/`campaign_name`, `adgroup_id`, `ad_id`, `create_time`, e `changes[]` — array de
`{field, value}` com os campos reais do formulário (`name`, `phone_number`, `email`, `address`,
`gender`, `scheduled_time`, dinâmico conforme o Instant Form configurado).

**Decisão do usuário:** documentar agora, implementar só quando T2 destravar (bloqueado por
aprovação externa do app no TikTok for Business, inalterado desde sessões anteriores) — nenhum
código escrito nesta rodada. `docs/PLANO_TIKTOK.md` atualizado em 3 pontos (§3 com o achado
completo + payload real, §10 tabela de faseamento, §12 tabela de riscos) pra que a próxima sessão
que retomar T2 já saiba exatamente o que fazer em seguida, sem repetir a pesquisa.

**Quanto à regra "nenhum lead invisível" em si — já cumprida hoje, sem precisar de T6:** o wizard
nunca oferece Instant Form como opção de CTA pro TikTok (`network_defaults.tiktok.
instant_form_supported=false`, Fase 1 do §3, implementada desde T1/T3) — é estruturalmente
impossível uma campanha lançada por esta plataforma gerar lead invisível, porque a própria opção
que geraria esse lead nunca é oferecida. O único jeito de um lead TikTok ficar invisível hoje é o
cliente configurar um Instant Form manualmente direto no TikTok Ads Manager DELE, fora da nossa
ferramenta — cenário fora do nosso controle, mesma limitação inerente de qualquer plataforma
terceira (não é um gap específico nosso, nem algo que T6 sozinho eliminaria por completo, já que
depende do cliente usar exclusivamente os caminhos que passam pela nossa plataforma).

---

### Sessão 2026-07-28 (continuação) — Redesign Premium: acento âmbar nas 4 superfícies do módulo ✅

**Contexto:** usuário pediu status dos próximos passos; um dos 3 itens pendentes listados no
CLAUDE.md era "Redesign Premium — ativar skill `impeccable`" (Dashboard, Configurações,
CampaignWizard, Criativos + `src/components/marketing/` charts). Usuário pediu pra implementar
esse item (junto com o alerta de token, já concluído na sessão anterior — ver seção seguinte).

**Escopo real levantado antes de agir:** `context.mjs` do skill confirmou que este projeto já
tem `PRODUCT.md`/`DESIGN.md` próprios (escritos numa sessão anterior não registrada em detalhe
aqui) — um sistema de design "Painel de Missão": navy-based dark-mode-primary + acento âmbar
único (`#c5a028` sobre `#020c1b`, contraste ≈7,88:1 calculado à mão), "Regra do Acento Único"
(âmbar é a ÚNICA cor de decisão — qualquer outra ênfase usa peso/posição, nunca outro acento),
"Regra Antivetorial" (nunca branco/indigo genérico de SaaS), "Regra Flat-By-Default" (sombra só
em hover/estado, nunca decorativa em repouso) e um anel de foco fixo `#2563eb` independente do
acento. Ou seja: o trabalho real não era "criar" um design system, era **aplicar o que já existe
mas nunca foi propagado** — as 4 telas do módulo (e vários componentes compartilhados) ainda
usavam indigo-600 genérico (a cor padrão de IA-SaaS que o próprio skill lista como "AI slop").

**Bloqueio de ambiente, resolvido com o usuário via `AskUserQuestion`:** o Browser pane não
estava compositando screenshot nesta sessão ("the page is not compositing frames") mesmo com o
painel focado — nem eu nem o usuário conseguimos ver a prévia visual. Usuário decidiu: (1)
prosseguir com rigor no nível de código mesmo sem verificação visual disponível agora,
substituindo por `javascript_tool`/`getComputedStyle` (que continuou funcionando mesmo com o
screenshot quebrado); (2) **uma superfície por vez, com checkpoint** — apresentar o resultado de
cada tela, esperar aprovação, só então seguir pra próxima. Processo seguido à risca nas 4 rodadas.

**Padrão aplicado, consistente nas 4 superfícies** (passe estreito — corrige o sistema de cor nos
pontos de decisão real, não uma reconstrução visual completa):
- CTAs primários (botões "Salvar"/"Sync"/"Lançar"/"Adicionar"/"Gerar"/"Aprovar") e estados
  ativos/selecionados (abas, pills de período, cards de seleção única, toggles de escolha
  exclusiva ou multi-select central à tela) → `#c5a028` bg / `#020c1b` texto, sem gradiente nem
  glow decorativo (Regra Flat-By-Default — sombra só aparece no hover).
- Anéis de foco (`focus:ring-*`) → `#2563eb` fixo, em todo input/select/textarea tocado.
- Banners de aviso/notícia (ex.: "Texto gerado pela IA", "será criada PAUSADA", feedback de
  upload) → unificados no mesmo âmbar já usado pelos outros avisos de cada tela (eram os únicos
  em indigo, destoando do resto).
- 1 padrão explicitamente banido pelo `DESIGN.md` corrigido: side-stripe border colorida
  (`border-l-2 border-l-indigo-500`) na linha selecionada da lista de clientes em Configurações
  — trocado por tint de fundo, sem faixa lateral.

**Deixado deliberadamente sem alteração, com critério explícito em cada commit:**
- Cor informativa/categórica (ícones de cabeçalho, badges de categoria, eyebrows, textos de
  destaque inline) — não é ponto de decisão, converter tudo pra âmbar violaria a própria "Regra
  do Acento Único" (diluir o significado de "isto é a decisão desta tela").
- Sub-sistemas com marca própria já estabelecida: azul `#1877f2` da Meta (botão "Salvar
  Identidade Meta" em Configurações) e violeta do modal "Criar novo criativo com IA" em
  Criativos (zero indigo lá — já nasceu 100% violeta) — branding de terceiro/feature própria,
  fora do escopo da correção de sistema de cor genérico.
- Seções plurais/autocontidas: o `InterestsPicker` inteiro no CampaignWizard (avançado/opcional,
  converter só parte ficaria mais inconsistente que não tocar) e as micro-ações repetidas por
  card na galeria de Criativos (dezenas de cards simultâneos — promover cada um ao acento único
  diluiria exatamente o que a regra existe pra evitar); essas viraram neutras (slate), não âmbar.

**Verificado em cada uma das 4 rodadas:** `npx tsc --noEmit` sem erros novos no arquivo tocado +
inspeção ao vivo no navegador real (tenant Marketing Digital, sessão autenticada real) via
`javascript_tool`/`getComputedStyle` — incluindo cliques reais em controles (selecionar
segmento, avançar etapas do wizard, marcar gênero/dia da semana) pra confirmar que o estado
"selecionado"/"ativo" renderiza exatamente `rgb(197, 160, 40)`/`rgb(2, 12, 27)`, não só que a
classe CSS existe no código. Sem verificação visual por screenshot (limitação de ambiente desta
sessão, não resolvida) — usuário ainda não viu a prévia pixel-a-pixel, só a confirmação via
estilo computado descrita acima em cada checkpoint apresentado.

**Fora de escopo desta rodada, registrado como pendência real:** `src/components/marketing/`
(charts: `AnalyticsView.tsx`, `BriefingCard.tsx`, `CommandCenterView.tsx`, `KpiCard.tsx`,
`PeriodBadge.tsx`, `ClassicFunnelChart.tsx` — ~28 ocorrências de indigo encontradas via grep,
listadas no CLAUDE.md original mas não atacadas aqui) — o pedido do usuário cobriu as 4 telas
principais; os componentes de gráfico compartilhados ficam pra uma rodada futura, se pedida.

Commits: `6458f32` (Dashboard), `becdc3f` (Configurações), `03b43e7` (CampaignWizard), `f1704b1`
(Criativos).

---

### Sessão 2026-07-28 — Contratação de rede por tenant (Meta/Google/TikTok) ✅

**Contexto:** usuário notou que o botão "Meta / TikTok" em `/admin/campanhas/nova` escondia a
opção de TikTok atrás de um rótulo enganoso (achado real, corrigido primeiro — commit
`6b5acb5`). Isso levou a uma discussão de modelo de negócio: cada rede de anúncio é cobrada
separadamente por tenant, então o ideal é botão próprio por rede, desabilitado quando a empresa
não contratou aquela rede. Usuário propôs 3 colunas boolean em `tenants` + aba CRUD nova;
recomendei reaproveitar o sistema genérico de provisionamento já usado por todo o resto da
plataforma (`system_features`+`tenant_feature_overrides`, `/admin/master/provisioning`) em vez
de um 2º mecanismo paralelo — usuário concordou.

**Implementado** (`prisma/migration-2026-07-28-network-provisioning.sql`): 3 features sem `url`
própria (não são página, são toggle de capacidade) — `campanhas-rede-meta/google/tiktok`,
vinculadas ao módulo "Gestão de Campanhas de Marketing Digital" (já linkado ao segmento
Imobiliário, então aparecem automaticamente na árvore do Master). Backfill deliberado (não é
provisionamento automático genérico): tenants com credencial JÁ ativa numa rede continuam
habilitados — só TikTok, sem nenhum tenant com credencial real, ficou de fora do backfill.
`permissions`/`role_permissions` **não** foram criadas (pesquisa confirmou que só protegem
visibilidade de sidebar via `get_sidebar_menu_for_user`; essas 3 features são lidas por uma
query bespoke dentro de uma API já existente, não pelo pipeline de rota/sidebar).

`GET /api/admin/campanhas/configuracoes/redes` ganhou o campo `contracted` por rede (LEFT JOIN
`tenant_feature_overrides`), com bypass total pra Master (`is_system_role`) — mesmo padrão de
`get_sidebar_menu_for_user`. É o único ponto de verdade, consumido por 3 lugares: a tela
Configurações → Redes, o step "Rede de Anúncios" do `CampaignWizard.tsx`, e os botões de
`/admin/campanhas/nova`. Prioridade de estado num card: `Em breve` (não suportado) →
`Não contratado` → `Não conectado` → `Conectado`.

`/admin/campanhas/nova` — o botão único "Meta / TikTok" virou 2 botões independentes (mais o já
existente "Google AI Max"), cada um desabilitado individualmente quando a rede não está
contratada+conectada. `CampaignWizard` ganhou `initialValues.networkCode` pra pré-selecionar a
rede escolhida no botão de fora — o wizard ainda mostra o passo "Rede de Anúncios" normalmente
(usuário pode confirmar ou trocar), só chega com a intenção certa já marcada.

**Testado ao vivo:** contagem de features no Hub de Provisionamento Master confirmou 11→14 pro
módulo de Campanhas (as 3 novas entraram corretamente na árvore, sem precisar tocar em
`system_segment_modules` — o módulo já estava linkado ao segmento Imobiliário) · endpoint
testado com 2 tokens reais: Master (`is_system_role:true`) → `contracted:true` pras 3 redes
(bypass); tenant real (`is_system_role:false`, mesmo tenant Marketing Digital) →
`contracted:true` só pra Meta/Google (as que já tinham credencial ativa antes desta feature),
`contracted:false` pro TikTok (nunca teve credencial real) · com o token de tenant real injetado
no navegador, botão "TikTok Ads" renderizou `disabled=true` com tooltip "Rede não contratada"
(distinto de "Rede não conectada", confirmando a prioridade de mensagem correta), Meta Ads e
Google AI Max continuaram habilitados. `npx tsc --noEmit`: 64 erros, mesma baseline, zero novos.

---

### Sessão 2026-07-27 (TikTok/T4) — histórico anterior

**Implementação da rede TikTok** (`docs/PLANO_TIKTOK.md`) — plano completo escrito e aprovado
em 2026-07-27 (auditoria de código encontrou 3 achados que mudam o desenho vs. o esboço antigo
de `PLANO_GOOGLE_TIKTOK.md` §Fase 2: benchmarks sem dimensão de rede, bug real de rótulo
meta/google no dashboard, `REALLOCATE_BUDGET` como casca nunca preenchida).

**T0 concluído** (commit `0b877b3`): `system_benchmarks.network_id` + cascata de 6 camadas no
`benchmarkResolver`, `aiInsights.ts`/`wastedSpendService.ts` resolvendo benchmark por
(segmento, rede) da campanha, fix do ternário binário em `CommandCenterView.tsx`. Zero
regressão confirmada ao vivo contra dado real (Meta+Google).

**T1 concluído** (commit `ebb7ecd`): `FakeTikTokAdapter` (implementa `AdNetworkService` direto,
sem precisar do truque de herança do fake do Google), `networkLeadSource.tiktok = 'cta_engagement'`
(decisão deliberada — TikTok nasce com atribuição de receita real, sem repetir o débito de
identidade que travou a Visão 4 do Google), `network_defaults.tiktok` seedado no segmento
Imobiliário com `instant_form_supported=false` (guardrail pro Wizard, T3). Smoke test ao vivo:
cron real criou `Insight` via upsert de verdade contra o fake, `insights/ai` processou a
campanha TikTok sem erro e confirmou lead via `cta_engagement` (não `insight_conversions`).
Dado de teste removido, 0 resíduo.

**T3 concluído** (commit `08c9207`): achado real — `CampaignWizard.tsx` já tinha um step "Rede de
Anúncios" genérico (dynamic, lê `/redes`, ícone do TikTok já mapeado); só faltava
`ad_networks.capabilities.supported=true` pro TikTok (Google tem essa flag `false` de propósito
— Performance Max é formato fundamentalmente diferente, por isso tem wizard próprio; TikTok
cabe no genérico porque segue o mesmo padrão campanha→ad group→ad do Meta). Form de credenciais
TikTok adicionado em `configuracoes/redes/page.tsx` (backend já era genérico). 2 textos
hardcoded "Meta Ads Manager" no `CampaignWizard.tsx` corrigidos (mesma classe do Achado 2 do
T0) — achados testando ao vivo com TikTok selecionado.

**⚠️ Achado incidental importante, fora do escopo do plano TikTok, mas relevante pra TODA sessão
futura:** a limitação "verificação visual no navegador impossível" documentada em dezenas de
sessões anteriores neste arquivo **está resolvida**. Causa raiz real: `useAuth.
checkAuthentication()` (`src/hooks/useAuth.tsx:94`) lê o token de `localStorage.getItem(
'admin-auth-token')`, NUNCA do cookie — sessões anteriores só injetavam o cookie
(`admin_auth_token`, o que o middleware de fato checa) e nunca testaram setar o localStorage
também, então sempre bateram em `error=session_expired` e concluíram (incorretamente) que a
causa era um problema de dado (`/me` falhando). Confirmado ao vivo nesta sessão: um JWT
fabricado com o `userId` REAL de um usuário existente (`admmd`,
`67c62443-b022-4517-b7d8-bb90b8af38fd`), setado em **ambos** `document.cookie` E
`localStorage.setItem('admin-auth-token', token)` + `localStorage.setItem('admin-user-data',
JSON.stringify(user))` (usando o `user` retornado por uma chamada real a `/api/admin/auth/me`
com esse token) — funciona perfeitamente, sessão completa, navegação livre por todo o admin.
**Playbook pra sessões futuras que precisarem verificar UI autenticada:**
```js
// 1. Gerar JWT com userId REAL (não um placeholder) + JWT_SECRET real do .env.local
// 2. No browser, via javascript_tool:
document.cookie = "admin_auth_token=" + TOKEN + "; path=/";
fetch('/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + TOKEN } })
  .then(r => r.json())
  .then(data => {
    localStorage.setItem('admin-auth-token', TOKEN);
    localStorage.setItem('admin-user-data', JSON.stringify(data.user));
  });
// 3. Navegar normalmente — sessão válida
```

**T4 concluído** (motor de realocação cross-rede, `docs/PLANO_TIKTOK.md` §8 — não depende do
TikTok real, já opera sobre Meta×Google hoje): migração `BudgetReallocation` (tabela de detalhe
bilateral, linkada 1:1 à `AgentAction` que já carrega PIN/aprovação) + 5 benchmarks novos
(`realloc_min_cpl_gap_pct=30%`, `realloc_max_pct_of_source=30%`, `realloc_marginal_haircut_pct=25%`,
`realloc_max_abs_cents=R$50`, `realloc_cooldown_days=14`) seedados nos 6 segmentos ativos via
`benchmarkResolver`. `reallocationEngine.ts` — `findReallocationOpportunities()` aplica 11
critérios de elegibilidade (mesmo cliente/segmento/funnel_stage, redes diferentes, origem com
lead real, ambas maduras, destino com eficiência PROVADA não prometida, nenhuma em learning,
destino com headroom real — frequência pra Meta/TikTok, IS Lost Budget pra Google —, origem não é
a única campanha do seu funnel_stage, cooldown por par, vantagem de CPL acima do mínimo) e calcula
o ganho líquido projetado com **haircut marginal explícito** (nunca assume CPL médio constante no
destino após receita extra — a resposta ingênua "CPL menor → move tudo" fica deliberadamente
impossível de expressar aqui). `runReallocationAgent()` converte a melhor oportunidade por
campanha-origem numa `AgentAction` tipo `REALLOCATE_BUDGET` (sempre OFFENSIVE — aumenta gasto
numa rede, sempre exige aprovação humana com PIN, nunca auto-executa) + a `BudgetReallocation`
vinculada. Fio de volta no cron (`/api/cron/campanhas/sync`) + no digest do WhatsApp
(`agentNotificador.ts` — bucket próprio `reallocs`, achado real: sem isso a ação ficaria
criada no banco mas invisível/inaprovável via WhatsApp, só um outro tipo já tinha esse
tratamento) + na execução (`agentDecisor.executeAction`, branch `REALLOCATE_BUDGET`: atualiza os
AdSets de origem E destino dentro de um único `prisma.$transaction` — **desvio deliberado do
texto literal do plano**, que sugeria reverter a origem se a chamada de rede do destino falhasse;
o código real do projeto (SCALE/DOWNSCALE já existentes) sempre trata push de rede como
best-effort/non-blocking e o banco local como fonte da verdade, então a atomicidade real é
a transação Postgres entre as duas campanhas, não uma reversão condicionada à rede) + no reject
(`/api/agent/reject/[id]`, achado real: sem o fix, rejeitar deixava a `BudgetReallocation` presa
em `PROPOSED` pra sempre, já que `setStatus()` só tocava a `AgentAction`).

**Testado ao vivo, ponta a ponta, com números batendo exatos com o cálculo manual**: 2 campanhas
sintéticas (Meta CPL R$50, TikTok CPL R$20, mesmo tenant/segmento/funnel_stage BOF) → motor
encontrou 1 candidato (gap 60%, R$15/dia, ganho líquido projetado +0,30 lead/dia, confiança 0,94)
→ `runReallocationAgent` criou `AgentAction`+`BudgetReallocation` reais → aprovado via PIN real
(`/api/agent/approve/[id]`) → `AdSet` de origem 100→85 (-R$15), destino 60→75 (+R$15), ambas as
tabelas marcadas `EXECUTED` com os valores corretos. **Achado real de sessão longa, mesma classe
já documentada váras vezes neste arquivo:** o servidor dev tinha o singleton do Prisma Client
travado ANTES do `npx prisma generate` que criou o model `BudgetReallocation` — `prisma.
budgetReallocation` vinha `undefined` até o comentário do `next.config.js` ser tocado (força
restart completo do processo Next, mesmo truque já usado em sessões de FASE 9/Auditoria). Todo
dado de teste (2 campanhas, 2 AdSets, 10 Insight, 25 CtaInteraction, 1 AgentAction, 1
BudgetReallocation) removido depois, 0 resíduo confirmado por SQL. `npx tsc --noEmit`: 64 erros,
mesma baseline pré-existente, zero novos em qualquer arquivo tocado.

**T5 concluído** (medição D+14 + circuit breaker, commit `55ec099`): cron diário
(`/api/cron/campanhas/realloc-measure`, 07:00, registrado no `feed-cron-scheduler.js`) mede
propostas `EXECUTED` há ≥14 dias — compara leads/dia numa janela de 14 dias ANTES vs. DEPOIS do
`executed_at`, tanto na origem quanto no destino (`deltaTarget + deltaSource`), pra isolar o
efeito da realocação de uma sazonalidade genérica de "mais tráfego este mês"; grava
`actual_lead_gain`/`verdict` (`CONFIRMED` se ≥50% do projetado, `BACKFIRED` se ≤0, `NEUTRAL` no
meio). Circuit breaker (`reallocationMeasurement.isReallocationCircuitBreakerTripped`): ≥3
`BACKFIRED` do tenant em 90 dias — checado em 2 pontos, não só 1, pra cobrir o texto literal do
plano ("não executa nem com aprovação"): (1) `runReallocationAgent` para de propor enquanto
ativo; (2) `agentDecisor.executeAction` (branch `REALLOCATE_BUDGET`) barra a execução mesmo com
PIN correto, caso a proposta já estivesse `PENDING_APPROVAL` de antes do breaker disparar —
marca `AgentAction`/`BudgetReallocation` como `BLOCKED` e alerta o Master via `notifyAlert`
(Slack+WhatsApp). Os 2 endpoints de aprovação (`/api/agent/approve/[id]` e
`/api/admin/master/aprovacoes`) passaram a checar o status real gravado depois de chamar
`executeAction` — sem isso, o approve mostraria "✅ Aprovado e executado!" mesmo quando o breaker
bloqueou tudo, uma mensagem enganosa pro humano que aprovou.

**Testado ao vivo, ponta a ponta, números batendo exatos com o cálculo manual**: cenário
CONFIRMED (campanhas reais com leads reais antes/depois do `executed_at` sintético) →
`actual_lead_gain=0.214` (leads/dia) contra `projected_lead_gain=0.300` → `verdict=CONFIRMED` ·
3 cenários BACKFIRED (campanhas sem lead nenhum → `actual_lead_gain=0`) → `verdict=BACKFIRED` nos
3 · com os 3 BACKFIRED no banco, criado um par elegível do zero (mesmo molde do smoke test do
T4) → `runReallocationAgent` retornou `proposalsCreated=0` (breaker ativo suprimiu a sugestão
nova) · criada uma proposta `PENDING_APPROVAL` pré-existente pro mesmo par → aprovada via PIN
correto → resposta HTML "🛑 Bloqueada pelo circuit breaker" (não "executado"), `AgentAction`
e `BudgetReallocation` ambos `BLOCKED`, `AdSet.dailyBudget` das duas campanhas intocado
(confirmado igual ao valor antes da tentativa). Todo dado de teste (4 campanhas, AdSets,
Insight, CtaInteraction, 4 `BudgetReallocation`, 1 `AgentAction`) removido depois, 0 resíduo
confirmado por SQL. `npx tsc --noEmit`: zero erros novos em qualquer arquivo tocado (os 2 a mais
no total eram artefato stale de `.next/types` de uma rota de debug já removida, não código real).

**UI concluída** (commit `2199bcd`, `docs/PLANO_TIKTOK.md` §8.6): `GET /api/admin/campanhas/
realocacoes` (propostas vivas `PROPOSED` + histórico `EXECUTED/MEASURED/REJECTED/BLOCKED`,
escopado por tenant+cliente) alimenta 3 superfícies novas — card "Oportunidade de Realocação" na
Visão Executiva do dashboard (`ReallocationOpportunityWidget.tsx`, mesmo padrão self-fetching de
`RevenueAttributionWidget`, só renderiza com ≥1 proposta viva — nunca skeleton vazio permanente);
seção "Para onde mover" no Desperdício de Verba (conecta o diagnóstico já existente na página à
ação concreta, com badge "desperdício" quando a campanha-origem da proposta já está numa das
categorias de desperdício listadas acima); "Histórico de Realocações" com o veredito D+14
(Confirmado/Neutro/Não deu certo) quando disponível, senão o status operacional. A fila de
aprovação (`/admin/campanhas/aprovacoes`) já renderizava `REALLOCATE_BUDGET` desde a T4
original — não precisou de mudança.

**Testado ao vivo no navegador** (sessão autenticada real via JWT com `userId` real + playbook
documentado acima, dashboard com segmento Imobiliário selecionado): sem dado real → nenhuma das
3 seções aparece (comportamento correto — testado no estado limpo pós-T5); inserida 1 proposta
`PROPOSED` + 1 `MEASURED/CONFIRMED` manualmente → os 3 widgets renderizaram os números exatos
(CPL R$82→R$31, 62% vantagem, R$30/dia, +0.55 lead/dia no card; badge "CONFIRMADO" sem o status
`MEASURED` redundante ao lado, depois de um ajuste). Único warning de console encontrado
(hydration em `SegmentSelector.tsx`) é pré-existente, não relacionado ao código novo. Dado de
teste removido, 0 resíduo confirmado.

**Trilha H concluída — 16/16 cenários testados ao vivo contra dado real** (`docs/PLANO_TIKTOK.md`
§11), usando um par de campanhas "flexível" (`th-flex-source` Meta / `th-flex-target` TikTok,
mesmo molde comprovado do smoke test original do T4) mutado incrementalmente entre chamadas
reais a `findReallocationOpportunities`/`runReallocationAgent` — cada caso negativo confirmado
por contraste direto com o baseline positivo (H1), não isolado:

- **H1** (baseline positivo) — confere exato com o cálculo manual (gap 60%, R$15/dia,
  +0,30 lead/dia, confiança 0,94) — mesmo resultado do smoke test T4 original.
- **H2** (gap 8%, abaixo do mínimo 30%) — 0 candidatos.
- **H3** (destino com 2 leads, abaixo de `min_leads_scale`) — o par específico
  origem→destino não qualificou (E6), mas a mutação incidentalmente criou uma oportunidade
  REVERSA válida (destino caro→origem barata) — achado que confirma o motor avalia as duas
  direções de forma independente, não um bug.
- **H4** (destino em `LEARNING`) — 0 candidatos.
- **H5** (destino com frequência 4.5, acima do teto ~3) — 0 candidatos (sem headroom).
- **H6** (origem BOF × destino TOF) — o par específico não apareceu (E3); um candidato
  não-relacionado surgiu entre o destino mutado e uma campanha real pré-existente que
  também é TOF — efeito colateral esperado do dado de produção compartilhado, não um bug.
- **H7** (origem com 0 leads) — 0 candidatos nas duas direções (E7 bloqueia forward, E6
  bloqueia reverse já que a origem-sem-lead também não serve como destino).
- **H8** (mesma rede nos dois lados) — 0 candidatos (E4).
- **H9** (proposta `EXECUTED` recente pro mesmo par) — 0 candidatos com o registro de
  cooldown presente; removendo o registro, o candidato baseline reaparece idêntico ao H1
  (prova que o cooldown, não outra coisa, era o bloqueio).
- **H10** — já comprovado no smoke test original do T4 (aprovação com PIN real:
  `DOWNSCALE` origem + `SCALE` destino, ambos aplicados atomicamente).
- **H11** (falha de rede não reverte) — comportamento real do motor **diverge deliberadamente**
  do texto literal do plano (que sugeria reverter a origem se a rede do destino falhasse); a
  arquitetura real do projeto (igual PAUSE/SCALE/DOWNSCALE) trata push de rede como best-effort
  sempre, nunca bloqueia nem reverte o estado local — confirmado implicitamente no smoke test
  original do T4 (tenant sem credenciais reais de Meta/TikTok, e mesmo assim as duas campanhas
  tiveram o budget alterado corretamente via `prisma.$transaction`, a garantia real de
  atomicidade). Documentado como decisão consciente, não um gap de teste.
- **H12** (rejeição) — `AgentAction`+`BudgetReallocation` marcados `REJECTED` via
  `/api/agent/reject/[id]` com PIN real, `AdSet.dailyBudget` das duas campanhas confirmado
  intocado depois.
- **H13/H14/H15** — já comprovados ao vivo no T5 (medição D+14 CONFIRMED/BACKFIRED + circuit
  breaker nas duas camadas).
- **H16** (cadeia A→B,C no mesmo ciclo) — criada uma 3ª campanha (Google) como 2º destino
  válido pra `th-flex-source`; `findReallocationOpportunities` corretamente achou os 3
  candidatos possíveis (incluindo o par mais fraco origem→destino1); `runReallocationAgent`
  criou exatamente 2 propostas (1 por campanha-origem DISTINTA), sempre escolhendo a de maior
  ganho projetado — a opção mais fraca da mesma origem foi corretamente descartada, sem
  cascata.

Todo dado de teste (3 campanhas, AdSets, Insight, CtaInteraction, 2 `AgentAction`+
`BudgetReallocation` do H16, 1 par de H9/H12) removido depois, 0 resíduo confirmado por SQL em
cada rodada. Nenhuma mudança de código foi necessária — o motor bateu com a especificação do
plano em todos os 16 cenários. `npx tsc --noEmit`: 64 erros, mesma baseline, zero novos.

**Com isso, T4 (motor de realocação cross-rede) está formalmente concluído — migração,
elegibilidade, execução atômica, notificação, medição D+14, circuit breaker, UI e os 16 testes
formais da Trilha H, tudo testado ao vivo contra dado real.** T2 (adapter real do TikTok,
TikTok Business API v1.3) segue como a única pendência do plano `docs/PLANO_TIKTOK.md`,
bloqueada por aprovação externa do app no TikTok for Business — inalterado desde sessões
anteriores.

## Penúltima tarefa concluída

Trilha E do teste rigoroso
(`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`) concluída — camada de simulação (adapters fake
implementando `AdNetworkService`) escolhida no nível 3 (cobertura completa) pelo usuário.

**Implementado:** `src/lib/marketing/networks/fake/FakeMetaAdapter.ts` (implementa a interface
direto) e `FakeGoogleAdapter.ts` (**estende** `GoogleAdsAdapter` de propósito — `agentMonitor.ts`
faz `instanceof GoogleAdsAdapter` antes de coletar Search Terms, um fake que só implementasse a
interface nunca passaria nesse check). Roteados na `factory.ts` via credencial sentinela
(`access_token`/`developer_token === '__SIMULATED__'`) — nunca por env var global, só ativa pra
um tenant explicitamente configurado assim.

**Testado ao vivo, 3 caminhos de código real NUNCA antes exercitados neste ambiente de dev** (sem
credencial real, sempre caíam no branch de erro): (1) cron real de sync criando `Insight` via
`prisma.insight.upsert` de verdade, com bônus de PAUSE real disparando sobre dado do fake; (2)
agente de negativação do Google identificando e negativando um termo de verdade
(`AgentAction`/`GoogleNegativeKeyword`/`GoogleSearchTerm.status` todos corretos); (3) Wizard real
(`POST /campaigns` Meta e `POST /google` Performance Max) persistindo os IDs externos do fake —
primeira vez que o caminho de SUCESSO dessas 2 rotas roda ponta a ponta neste ambiente. 0
discrepâncias. Todo dado de teste removido, 0 resíduo confirmado.

**Com isso, Trilhas A, B, C e E do roteiro estão formalmente concluídas.** Só falta a Trilha D
(validação contra as APIs reais do Meta/Google) — bloqueada em decisões do usuário: deploy de
staging na VPS, criação de conta Google Ads, decisão sobre gasto real pequeno. Ver seção própria
no documento do roteiro pra retomar quando fizer sentido.

**Achados reais desta rodada (Trilha C), por ordem de descoberta:**
1. **Bug real, não do seed — `expandEndOfDay` faltando em `aiInsights.ts`/`strategicBriefing.ts`**
   (corrigido, commit `a411ba4`): `endDate` de data pura ("YYYY-MM-DD") virava meia-noite UTC sem
   expandir pro fim do dia — excluía qualquer lead com timestamp real (`created_at`) do PRÓPRIO
   dia final do período, ou seja, todo lead de "hoje" quando o período termina hoje (o caso mais
   comum de uso real). `dashboard/full/route.ts` já fazia essa expansão corretamente (7+ rotas já
   seguiam esse padrão) — replicado via `expandEndOfDay()` (exportado de `aiInsights.ts`, reusado
   em `strategicBriefing.ts`). Achado ao vivo: depois de injetar 15 cliques WhatsApp reais, o
   dashboard mostrava 15 leads mas Insights da IA continuava recomendando PAUSE por "0 leads" pra
   essa mesma campanha — a contradição entre os dois endpoints expôs o bug.
2. **CLAUDE.md desatualizado sobre o Agente Autônomo (corrigido, seção "Agente Autônomo")**: o
   doc dizia "PAUSE/ALERT → PENDING_APPROVAL, SCALE/OPTIMIZE → PENDING_EXECUTION" — o código real
   (`DEFENSIVE_TYPES`/`OFFENSIVE_TYPES` em `agentDecisor.ts`) faz o INVERSO, e de forma mais
   sensata: PAUSE/DOWNSCALE (reduz risco/gasto) executa direto sem aprovação; SCALE (aumenta
   gasto) exige aprovação humana com PIN. Confirmado ao vivo: PAUSE do Cenário 2 virou `EXECUTED`
   na hora (`Campaign.status` real mudou pra `PAUSED`); SCALE do Cenário 1 ficou
   `PENDING_APPROVAL` com PIN de 6 dígitos. Não é bug de código — só o texto do CLAUDE.md que
   estava errado, corrigido nesta sessão.
3. **Achado da rodada anterior, RESOLVIDO nesta sessão (não era limitação de ambiente)** —
   `POST /api/agent/approve/[id]` retornava **500 com corpo HTTP completamente vazio** pra
   QUALQUER ação ofensiva (SCALE/REFRESH_CREATIVE/ADJUST_AUDIENCE/REALLOCATE_BUDGET), com PIN
   certo ou errado, com ou sem credenciais Meta — não era "falta de credencial real" como
   suspeitado antes. Causa raiz real: `getAction()` fazia `WHERE a.id = $1::uuid` contra
   `AgentAction.id`, que é coluna **TEXT** — Postgres rejeita a comparação
   (`operator does not exist: text = uuid`) antes mesmo do try/catch da rota rodar, e o handler
   padrão de erro do Next.js devolve 500 vazio. Isso quebrava tanto o `GET` (formulário de PIN,
   o link que o gestor clica no WhatsApp) quanto o `POST` (execução) — a rota de aprovação via
   WhatsApp nunca funcionou, desde que foi escrita. `/api/agent/reject` nunca teve esse bug (usa
   Prisma `$queryRaw` com interpolação de tag, sem cast manual). Isolado criando uma campanha/
   ação sintéticas + logging temporário (revertido depois) que confirmou `getAction()` nunca
   completava. Corrigido: `WHERE a.id = $1` (sem cast). Testado ao vivo: `GET` retorna o
   formulário de PIN normalmente, `POST` com PIN correto executa de verdade
   (`AgentAction.status='EXECUTED'`, `AdSet.dailyBudget` atualizado de fato no banco,
   `budget_before=5000→budget_after=5500`). Commit `8be46a8`.

**Confirmado funcionando corretamente, ponta a ponta, com dado real, em todas as 5 fases:**
- **Fase 1** (leads reais): 15 cliques WhatsApp (Cenário 1) → `CtaInteraction`; 3 submissões via
  Mecanismo C com `?ref=` (Cenário 4) → `campaign_id`/`cta_type` corretos; 2 cliques (Cenário 5).
  `dashboard/full` refletiu `leadCount=28`, `cplByNetwork` exatos.
- **Fase 2** (CRM/Kanban): resposta WhatsApp real simulada (`[ref:trilha-c-sucesso-track]`) →
  lead criado com `campaign_id` correto; movido pra "fechamento" (`valor_venda=R$450.000`) →
  Visão 4 (`/dashboard/revenue-attribution`) retornou `cpaReal=300, roasReal=1500` EXATO. Lead
  "visita presencial" sem campanha criado via `/api/crm/leads` — confirmado que NÃO aparece em
  `leadCount` de Campanhas (isolamento CRM↔Campanhas correto).
- **Fase 3** (Mensageria): `contact.attribution` mostra nome real da campanha pra resposta com
  `[ref:]`; mensagem orgânica (sem ref) mostra `campaignId:null, utmMedium:'organico'`; KPI
  "Vindas de campanha" em `/mensageria/analytics` refletiu `deCampanha:1, deCampanhaPct:50`
  exato (1 de 2 conversas do dia).
- **Fase 4** (dashboards): Desperdício de Verba (`R$865`, categorizado certinho por campanha),
  Portfolio (Cenário 2 = `health:"nodata"`, nuance confirmada não-contraditória com o
  `ZERO_LEADS_SPEND` de Desperdício), Auditoria (score 44, mesmos R$865/CPL R$58 batendo com as
  outras telas), Mapa de Campanhas (5 campanhas, leads exatos) — tudo consistente entre si.
- **Fase 5** (Agentes): cron `sync` disparado manualmente, `AgentAction` criada corretamente só
  pras 2 ações com confidence ≥ 0.85 (SCALE 0.90, PAUSE 0.95 — OPTIMIZE/ALERT/DOWNSCALE, todas
  <0.85, corretamente filtradas, confirma o threshold documentado); reject testado com sucesso;
  Briefing Estratégico gerado corretamente recomenda escalar o Cenário 1 (nunca confunde com os
  ruins), reconhece o Cenário 2 já pausado, identifica fadiga+CPL alto no Cenário 5.

**Pendência real, não-bloqueante:** testar o webhook do Lead Form do Google
(`/api/public/google-leads/webhook`) com uma conta REAL do Google Ads, depois que a aplicação
estiver publicada (deploy pendente, discutido em sessões anteriores).

## Última tarefa concluída

### Sessão 2026-07-27 — Trilha C Fase 0: seed de 5 campanhas + bug real no próprio seed (não no app) ✅

**Contexto:** iniciada a Trilha C do teste rigoroso — 5 cenários de campanha desenhados à mão
contra os benchmarks reais do segmento Imobiliário (`cpl_ideal=35, cpl_critical=80, ctr_min=0.8,
frequency_max=3.0, spend_no_lead=50, min_days_running=3`), num cliente de teste dedicado criado
pela própria UI (já corrigida nesta sessão — ver entrada anterior). Cenário 5 (Fadiga) incluído a
pedido explícito do usuário antes de começar.

**Bug real encontrado, mas na MINHA seed, não na aplicação:** depois de aplicar
`prisma/seed-trilha-c.sql` e confirmar os totais batendo exatos via SQL direto, o endpoint
`GET /insights/ai` retornava números de gasto sistematicamente MENORES que o total semeado (ex.:
Cenário 1 mostrava R$240 em vez de R$300) e o Cenário 4 (Site Próprio, só 3 dias de dado) estava
**totalmente ausente** da lista de insights. Investigação (`aiInsights.ts`, linha ~429):
`insightWhere.date.lte = new Date(filters.endDate)` — `new Date("2026-07-26")` vira
`2026-07-26T00:00:00.000Z` (meia-noite). Minha seed tinha usado literais `'2026-07-26 12:00:00'`
(meio-dia, por legibilidade) — esse horário fica DEPOIS da meia-noite do filtro `lte`, então o
último dia de cada campanha era silenciosamente excluído. Para o Cenário 4, perder 1 dos 3 dias
derrubou `daysRunning` (=`insights.length`) de 3 pra 2, abaixo do `min_days_running=3` — por isso
nenhuma regra disparava pra ele.

**Confirmado que não é bug real da aplicação:** dado sincronizado de verdade
(`agentMonitor.ts:225`, `date: new Date(day.date)`) vem de uma string tipo `"2026-07-26"` da API
do Meta/Google — sem hora, vira meia-noite UTC também, batendo exatamente com o `lte` do filtro.
O desalinhamento foi 100% um artefato da minha escolha de horário na seed, não um bug latente na
lógica de filtro de datas da plataforma.

**Corrigido:** `UPDATE "Insight" SET date = date_trunc('day', date) WHERE "campaignId" IN (...)`
— normaliza as 22 linhas semeadas pra meia-noite, igual ao padrão real de sincronização.
Reconfirmado ao vivo: todos os 5 cenários agora aparecem com o gasto exato semeado e disparam
exatamente a regra prevista no plano (incluindo o Cenário 4, antes ausente).

**Lição registrada:** ao semear dado de teste pra `Insight.date` (ou qualquer campo `DateTime`
comparado via `gte`/`lte` com uma string de data pura vinda de query param), usar sempre meia-noite
(`date_trunc('day', ...)` ou literal sem componente de hora) — nunca um horário "legível" como
meio-dia — pra não introduzir um desalinhamento artificial com o filtro que não existe no dado
real sincronizado pela plataforma.

---

### Sessão 2026-07-25/26 — Webhook do Lead Form nativo do Google Ads (recebimento) ✅

**Contexto:** durante a Trilha B, o usuário perguntou por que "Negócios Fechados" (Visão 4 —
Funil de Receita) nunca sai de zero pra campanha Google real deste tenant. Investigação (ver
commit `36f96d6` logo antes, que já tinha corrigido a Visão 4 pra respeitar o filtro de rede)
confirmou algo mais estrutural: `leadsIdentified` da Visão 4 pra essa campanha é **0**, mesmo o
Dashboard mostrando 64 leads — porque os 64 "leads" do Google vêm de `Insight.conversions` (número
agregado da API, sem identidade individual), e nenhuma dessas 64 conversões vira uma linha real em
`marketing_eventos`/`leads_staging`. Sem identidade real, nunca há negócio fechado possível de
rastrear. Solução discutida e decidida com o usuário: implementar o **Lead Form nativo do Google
Ads** (formulário preenchido dentro do próprio anúncio, sem sair do Google — equivalente ao
Formulário Instantâneo do Meta), que captura identidade real (nome/telefone/e-mail).

**Pesquisa feita antes de implementar** (não confiei em memória): documentação oficial do Google
consultada via WebFetch (`developers.google.com/google-ads/webhook/docs/implementation` +
`/samples` + suporte `support.google.com/google-ads/answer/16729613`) — confirmou o schema exato
do payload (`lead_id`, `campaign_id`, `user_column_data[{column_id,string_value}]`, `google_key`),
que a validação é uma chave compartilhada simples (não HMAC), que a config (URL+chave do webhook)
é feita pelo CLIENTE direto na tela do Lead Form no Google Ads (sem precisar de Developer Token
nem chamada nossa à API do Google — correção de uma suposição errada minha anterior), e que
dedupe é necessário via `lead_id` (Google não garante entrega exatamente-uma-vez).

**Implementado** (mesmo molde do webhook do Meta Lead Ads já existente,
`/api/public/meta-leads/webhook`):
1. `prisma/migration-2026-07-25-google-lead-form-webhook.sql` — tabela
   `campanhasmarketingdigital."GoogleLeadFormSubmission"` (PK=`lead_id`, dedupe idempotente).
2. `POST /api/public/google-leads/webhook` — resolve tenant/campanha via `Campaign.external_id`
   (rede google), valida a `google_key` do tenant (reaproveitando
   `tenant_network_credentials.credentials->>'lead_form_webhook_key'`, 1 chave por tenant),
   extrai nome/telefone/e-mail (`FULL_NAME`/`FIRST_NAME`+`LAST_NAME`/`EMAIL`/`PHONE_NUMBER`) e
   chama `/api/crm/leads` com `campaign_id` real. Deliberadamente NÃO usa CtaInteraction/
   CtaSubmission (mecanismo de redirect — não se aplica, o formulário nunca sai do Google) nem
   conta como "Sinal de Interesse (Meta)" (explicitamente só-Meta).
3. `google_lead_form`/`google_lead_form_test` adicionados ao ORIGEM_LABEL/ORIGEM_COLOR de Leads
   Capturados.

**Testado em 2 camadas, ambas com sucesso:**
- **Local (localhost direto):** payload sintético válido → lead real criado, `campaign_id`
  corretamente resolvido, `marketing_eventos.plataforma='google_lead_form'` · reenvio do mesmo
  `lead_id` → dedupe, sem duplicar · `google_key` errada → 401 · `campaign_id` desconhecido → 200
  no-op (evita retry infinito do Google por algo irresolvível).
- **Túnel ngrok real (HTTP público → nosso servidor):** usuário criou conta ngrok, gerou
  authtoken. 2 percalços resolvidos no processo: (1) instalação via `npx ngrok` baixou o binário
  errado (Mach-O/macOS em vez de Windows) — corrigido baixando o zip oficial direto de
  `bin.equinox.io`; (2) Windows Defender bloqueou a extração (falso-positivo comum com ngrok,
  heurística de C2) — o usuário já tinha o ngrok instalado por conta própria e resolveu isso
  antes de mandar o comando de configurar o authtoken; (3) o comando do usuário
  (`ngrok config add-authtoken $2vh0...`) salvou o token com um `$` a mais (erro de digitação/
  cópia) — corrigido reconfigurando sem o `$`. Túnel subiu (`https://<id>.ngrok-free.app`),
  requisição POST real confirmada no inspector do ngrok (200 OK) e no banco (lead criado
  corretamente com `campaign_id` resolvido). **Achado incidental durante esse teste:** o número
  de telefone de teste usado coincidiu, por acaso, com um lead residual de 2026-07-04/07-21
  (teste de uma sessão bem anterior, nunca limpo) — Match Engine mesclou corretamente (prova de
  que F4 continua funcionando), mas expôs resíduo antigo. Limpo (contact da Mensageria
  desvinculado, marketing_eventos/leads_kanban/leads_staging/GoogleLeadFormSubmission removidos).
  Todo dado de teste desta sessão (local + ngrok) removido depois, 0 resíduo confirmado. Túnel
  ngrok encerrado ao final (não deixado aberto sem necessidade).

**npx tsc --noEmit limpo em todos os arquivos tocados.** Commits: `b274b27` (feature).

### Como testar com uma conta REAL do Google Ads, quando a aplicação estiver publicada (deploy)

1. **URL do webhook em produção:** `https://<dominio-de-producao>/api/public/google-leads/webhook`
   (troca só o domínio — o path é fixo).
2. **Configurar a chave do tenant** — hoje só via SQL (não existe UI ainda pra isso), escolher
   uma chave forte e gravar em `tenant_network_credentials.credentials` (rede `google`):
   ```sql
   UPDATE public.tenant_network_credentials
      SET credentials = credentials || '{"lead_form_webhook_key": "<CHAVE-FORTE-AQUI>"}'::jsonb
    WHERE tenant_id = '<uuid-do-tenant>'::uuid
      AND network_id = (SELECT id FROM public.ad_networks WHERE code='google');
   -- Se a linha não existir ainda (tenant nunca configurou Google Ads antes), fazer INSERT
   -- (ver src/app/api/admin/configuracoes/google-ads/route.ts pro padrão de INSERT/UPSERT).
   ```
3. **Cliente configura o Lead Form no Google Ads real:** na conta dele, editor do anúncio com
   Lead Form → "Exportar leads" → "Other data integration options" → "Webhook integration" →
   cola a URL (passo 1) + a MESMA chave gravada no passo 2.
4. **Testar:** botão "Send test data" na própria tela do Google Ads (gera um payload com
   `is_test:true`, cai como origem `google_lead_form_test` no nosso lado) — confirmar que aparece
   em `/admin/campanhas/leads` (Leads Capturados) com a campanha certa atribuída. Depois, com o
   Lead Form realmente publicado e recebendo tráfego real, confirmar leads reais chegando com
   `origem='google_lead_form'` e, eventualmente, que "Negócios Fechados" na Visão 4 deixa de ser
   zero assim que um desses leads fechar negócio no CRM.
5. **Pendência conhecida, não implementada:** UI de configuração da chave (hoje só SQL) — se
   virar recorrente, vale uma tela simples em `/admin/configuracoes/google-ads` (mesmo padrão já
   usado pras credenciais da API do Google Ads).

## Penúltima tarefa concluída

### Sessão 2026-07-22 (continuação 19) — Mecanismo C: atribuição de campanha real via `?ref=` ✅

**Contexto:** durante a revisão da Trilha A, o usuário levantou uma preocupação mais ampla: CPL
computado sem considerar "outros CTAs como formulários, views, etc., pra todas as redes".
Investigação confirmou que o lado de LEITURA (`leadEvents.ts`) já cobria formulário corretamente
pro Meta — mas achei um terceiro mecanismo de ESCRITA de lead nunca auditado antes: Mecanismo C
(`/api/public/cta/ingest`, webhook genérico documentado em `/admin/campanhas/mecanismos`, já
configurado com API key ativa nos 4 tenants). Esse mecanismo nunca tentava resolver
`campaign_id` — evidência real (não hipotética): linhas de `CtaSubmission` no banco com
`lead_uuid` preenchido (leads reais, já matchados no CRM) e `campaign_id NULL`, de testes
anteriores do próprio mecanismo ("Teste Webhook", "Novo Webhook").

**Discussão de escopo com o usuário (importante, não só técnica):** o usuário reformulou o
modelo mental certo — CPL do módulo de Campanhas só deveria contar leads com gasto de campanha
real por trás (visita presencial, lead comprado de terceiro, etc. NÃO deveriam entrar nessa
conta, mesmo tendo custo/valor — isso é escopo do CRM, não de Campanhas). Isso reduziu o achado
a uma pergunta mais estreita: existe caso real em que o Mecanismo C recebe lead de um anúncio
REAL desta plataforma? Usuário confirmou: sim — cliente pode ter site PRÓPRIO (não o `/l/{slug}`
hospedado aqui) como destino de um anúncio nosso, empurrando o lead pra cá via esse webhook.

**Implementado (aditivo, retrocompatível):**
1. `/api/public/cta/ingest/route.ts` — aceita campo opcional `ref` (mesmo trackingId que
   `/api/r/{trackingId}` já anexa como `?ref=` ao redirecionar pro destino do anúncio, mesmo
   quando esse destino é externo); resolve via `resolveCtaRef` (mesma função do Mecanismo B).
   Nunca aceita `campaign_id`/`ad_id` crus do chamador externo — só `ref` que resolve de
   verdade, por segurança (não deixar um integrador arbitrário atribuir lead a qualquer
   campanha).
2. `mecanismos/page.tsx` — snippet JS captura `?ref=` da URL no carregamento (guarda em
   `sessionStorage`), repassa no submit; `curlExample`/documentação atualizados.

**Bug real, pré-existente e dormant, encontrado DURANTE o teste ao vivo (não hipotético):**
`resolveCtaRef` (`src/lib/cta/service.ts`) hardcodeava `ctaType:'WHATSAPP_MESSAGE'` pra
QUALQUER match via `Ad.trackingId`, ignorando o `ctaType` real já armazenado na tabela `Ad`.
Neste banco, todo `Ad` com `trackingId` hoje genuinamente tem `ctaType=WHATSAPP_MESSAGE` (por
isso o bug nunca se manifestou) — mas quebraria silenciosamente o cenário que o usuário acabou
de confirmar como real: anúncio com `ctaType=LEARN_MORE` apontando pro site do cliente teria a
submissão gravada com `cta_type` errado, e `leadEvents.ts` a excluiria (mesmo filtro que existe
pra não contar 2x o eco de resposta real de WhatsApp) — lead real, com campanha corretamente
resolvida, mesmo assim invisível no CPL. Corrigido: `resolveCtaRef` agora lê `a."ctaType"` real.

**Testado ao vivo, ponta a ponta** (tenant Marketing Digital, campanha "Alto Padrão —
Alphaville", trackingId `demo-track-001`, `ctaType` do anúncio temporariamente ajustado pra
`LEARN_MORE` só durante o teste e revertido depois): `POST /api/public/cta/ingest` com `ref`
real → `campaign_id` resolvido corretamente em `CtaSubmission`+`marketing_eventos`, `cta_type`
correto (`LEARN_MORE`), `dashboard/full` refletiu `leadCount=1` atribuído à campanha certa · sem
`ref` → `campaign_id`/`cta_type` continuam `NULL`, idêntico ao comportamento antigo
(retrocompatibilidade confirmada). Todo dado de teste removido depois (0 linhas residuais),
`Ad.ctaType` revertido ao valor original. `npx tsc --noEmit`: zero erros novos. Commit `3990fc2`.

## Última tarefa concluída

### Sessão 2026-07-22 (continuação 18) — Trilha A: auditoria técnica independente pós-consolidação ✅

**Contexto:** depois da consolidação de `leadEvents.ts` (16/16 tasks concluídas, ver entrada
abaixo), o usuário pediu — com razão, dado o histórico de bugs reais achados em sequência —
uma segunda verificação rigorosa e independente, em 2 trilhas: técnica (minha) + manual em
todas as UIs (dele). Pedido: "vamos pecar por excesso".

**Metodologia (documentada em `docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`):** verdade
fundamental calculada por SQL puro, sem passar por nenhuma linha de código da aplicação (nem
`leadEvents.ts`, nem os endpoints) — é o padrão contra o qual todo consumidor foi comparado.

**Resultado — 14 de 14 consumidores batem com a verdade fundamental (64 leads/R$244.823,19 na
janela 01/04–21/07/2026, escopo "own"):** `dashboard/full`, `dashboard/segment`,
`dashboard/funnel`, `dashboard/predictions`, `dashboard/campaign-map`, `portfolio`,
`cross-insights`, `auditoria` (janela rolling 30d), `briefing estratégico`, `iniciativas`,
`insights/ai` (Google corretamente DOWNSCALE, não PAUSE falso), `desperdicio` (Google fora de
ZERO_LEADS_SPEND), `tracking/health` (roda sem erro, leads_24h=0 é honesto — dimensão diferente
da janela testada, não é bug).

**3 casos de borda testados (não cobertos pelos testes de migração arquivo-por-arquivo):**
1. **Achado #1 ponta a ponta com a consolidação NOVA** (nunca testado junto antes — o fix é de
   uma sessão anterior à criação de `leadEvents.ts`): simulado webhook real do Meta Lead Ads
   (HMAC válido, `ad_id` real) → `CtaSubmission` com `campaign_id` resolvido +`lead_uuid` +
   `cta_type≠WHATSAPP_MESSAGE` → `dashboard/full` refletiu `leadCount:1` corretamente atribuído
   à campanha certa. Dado de teste removido (5 tabelas, 0 residual).
2. **Guarda de deduplicação** (clique de WhatsApp + eco da resposta = 1 lead) reconfirmada
   contra o código consolidado (tinha sido provada só no código antigo) — `leadCount=1`, não 2.
3. **Rede órfã** (campanha sem `network_id`) — não precisou sintetizar: 3 das 5 campanhas reais
   do escopo já não têm `network_id` e a verdade fundamental já confirmou o fallback pra
   `'meta'` funcionando em produção.

**Nenhuma discrepância encontrada.** Documento completo com a metodologia + tabela de resultados
+ roteiro manual (Trilha B, com números de referência exatos por tela) entregue ao usuário em
`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`. **Trilha B ainda pendente de execução pelo
usuário** — ver seção "Tarefa em andamento" acima.

---

### Sessão 2026-07-21/22 (continuação 17+) — Auditoria de robustez de CPL + consolidação em fonte única ✅ (histórico)

### Sessão 2026-07-21/22 (continuação 17+) — Auditoria de robustez de CPL + consolidação em fonte única ✅

**Contexto:** usuário, com razão, ficou seriamente preocupado com a robustez do cálculo de CPL
(métrica mais importante do negócio) depois de eu ter corrigido 2 bugs reais seguidos na mesma
conversa (Google usando conversões reais, Meta contando lead de formulário). Pediu auditoria
completa de TODA forma de gerar lead em TODA rede antes de eu considerar o assunto encerrado.
**Ordem de execução confirmada explicitamente pelo usuário: "#1 → consolidação → #4".**

**Auditoria (agente Explore) encontrou 4 achados, por gravidade:**
1. **CRÍTICO, dado real sendo perdido:** o webhook de Formulário Instantâneo do Meta
   (`/api/public/meta-leads/webhook`) salvava o lead certinho no CRM, mas nunca resolvia
   `campaign_id` (só guardava o `ad_id` externo) — como toda métrica de campanha filtra por
   `campaign_id`, esses leads reais e pagos ficavam invisíveis em CPL/funil/IA. `OUTCOME_LEADS`
   (objetivo padrão do wizard) é tipicamente usado com Formulário Instantâneo no mundo real —
   não era caso de borda. **Corrigido e testado ao vivo, commitado** (resolução via
   `Ad.metaAdId → AdSet.campaignId`).
2. **Inconsistência visível na mesma tela:** `cplByNetwork` já usava a definição completa de
   lead, mas `currentLeadCount`/`funnelData.leads`/`leadsByCampaign` na MESMA resposta de
   `/dashboard/full` continuavam só WhatsApp. **Corrigido e testado ao vivo, commitado.**
3. **~15 arquivos duplicando a mesma lógica incompleta** (`aiInsights.ts`, `wastedSpendService.ts`,
   `portfolio`, `trackingHealthService`, `briefing`, `funil`, `predições`, `mapa de campanhas`,
   `segmentIntelligenceService`, `auditReportService`, `iniciativas` — lista completa no
   progresso abaixo). Consequência real: IA podia recomendar pausar uma campanha de Google/
   formulário achando que tinha 0 leads, quando na verdade tinha leads reais só que num canal
   que aquela regra específica não sabia olhar. **Consolidado — todos os 15 migrados.**
4. **Estrutural, não é bug de código:** `Insight.conversions` do Google é a soma de qualquer
   "ação de conversão" configurada na CONTA do cliente no Google Ads — pode incluir coisas que
   não são lead. **Resolvido com um aviso explícito na UI** (task #75, `GoogleAdsView.tsx`,
   deixado de propósito como último item por instrução explícita do usuário) — não dava pra
   corrigir só no nosso código, então a solução foi transparência.

**Decisão de arquitetura (não só patch pontual):** criado
`src/lib/marketing/services/leadEvents.ts` — fonte ÚNICA de "o que é lead" (ciente de rede e de
mecanismo de CTA): `getLeadEvents(tenantId, {campaignIds, startDate, endDate})` retorna
`LeadEvent[]` (`{date, campaignId, network, count}`); helpers de agregação `sumLeads`/
`leadsByDay`/`leadsByCampaign`/`leadsByNetwork`. Resolve a rede de cada campanha
(`Campaign.networkId → ad_networks.code`) e escolhe a fonte certa via
`src/lib/marketing/services/networkLeadSource.ts` (`LEAD_SOURCE_BY_NETWORK`): Meta →
`cta_engagement` (WHATSAPP_CLICK **ou** CtaSubmission com `lead_uuid` não-nulo, sempre excluindo
`cta_type='WHATSAPP_MESSAGE'` pra não contar 2x a resposta real de WhatsApp, que grava as duas
tabelas); Google/YouTube → `insight_conversions` (campo `Insight.conversions`, já real da API).
Todo consumidor deve migrar pra usar isso em vez de reimplementar a própria query — é a causa
raiz de por que o mesmo bug apareceu 2x seguidas antes desta rodada.

**Progresso final — 16 de 16 tasks concluídas (tasks #60-75, rastreadas no task tool):**
- ✅ #60 `leadEvents.ts` construído (módulo central + `networkLeadSource.ts`)
- ✅ #61 `cplTimelineService.ts` migrado — testado: totais idênticos antes/depois, zero regressão
- ✅ #62 `dashboard/full/route.ts` migrado — testado: `currentLeadCount`/`funnelData.leads`/
  `leadsByNetwork`/`cplByNetwork` agora todos batem (64 em todos, na mesma resposta)
- ✅ #63 `dashboard/segment/route.ts` migrado (`fetchClientData`: total de leads por cliente +
  leads por dia, ambos usavam WHATSAPP_CLICK cru) — testado ao vivo (tenant Marketing Digital,
  segmento Imobiliário, 2026-04-01 a 2026-07-21): `leads=64, cpl=3825.36`, batendo exatamente
  com `dashboard/full` no mesmo escopo. `tsc --noEmit`: zero erros no arquivo. Commitado
  (`d6b6d8b`).
- ✅ #68 `aiInsights.ts` migrado — testado: campanha Google real agora gera SCALE/OPTIMIZE em vez
  de potencialmente PAUSE incorreto por "0 leads"
- ✅ #69 `wastedSpendService.ts` migrado — testado ao vivo: campanha Google real deixou de
  aparecer na categoria `ZERO_LEADS_SPEND` (só as 3 campanhas Meta genuinamente sem lead
  permaneceram)
- ✅ #70 `trackingHealthService.ts` migrado (`checkLeads24h`/`checkOrphanLeads`, via 2 helpers
  novos `countBroadLeads`/`countBroadOrphanLeads`; `checkDuplicateRate`/`checkLeadLatency`
  deliberadamente NÃO tocados — motivo documentado no código) — testado ao vivo via
  `POST /tracking/health?clientId=own`, rodou sem erro
- ✅ #71 `segmentIntelligenceService.ts` migrado (`buildAnglesSummary` — removida a subquery de
  leads que fazia JOIN junto com spend, risco do mesmo bug de produto cartesiano já visto antes;
  leads agora vêm de `getLeadEvents` separado, merged em JS) — não testado ao vivo ponta a ponta
  (alimenta narrativa LLM sem endpoint isolado simples de testar), mas `tsc --noEmit` limpo +
  mesmas primitivas já provadas ao vivo 4x em outros arquivos
- ✅ #64 `dashboard/funnel/route.ts` migrado (leads por estágio TOF/MOF/BOF — antes JOIN direto
  com CtaInteraction agrupado por estágio; agora resolve campanha→estágio e soma leads via
  `getLeadEvents`+`leadsByCampaign` em JS). Bug real pego no teste ao vivo: a nova query de
  escopo parou de referenciar `$2`/`$3` (removido o JOIN com Insight), e Postgres rejeita bind
  com mais parâmetros do que o texto SQL referencia — corrigido com uma referência inócua
  `$2::timestamp IS NOT NULL AND $3::timestamp IS NOT NULL`. Testado: leads=64 (clientId=own),
  batendo com os demais. Commit `0bc9d2a`.
- ✅ #65 `dashboard/predictions/route.ts` migrado (série histórica de leads, base da regressão
  linear). Testado: soma da série = 64. Commit `c7d495d`.
- ✅ #66 `dashboard/campaign-map/route.ts` migrado (leads por localização geográfica no mapa;
  usa `Pool` próprio, não Prisma — leads resolvidos depois da query principal, usando os
  campaign_id já retornados). Testado: soma de leads deduplicada por campanha = 64.
  Commit `3d46af0`.
- ✅ #67 `portfolio/route.ts` + `portfolio/cross-insights/route.ts` migrados — cada um tinha 2
  queries próprias (leads por cliente + leads por campanha), ambas só WHATSAPP_CLICK; unificadas
  numa única chamada a `getLeadEvents` por arquivo, agregada por cliente em JS via mapa
  campanha→client_id. Testado: "Marketing Digital" (own) com leads=64/spend=244823.19/
  cpl=3825.36 nos dois endpoints — mesmíssimos números de todos os outros já migrados.
  Commit `7d203a3`.
- ✅ #72 `auditReportService.ts` migrado (`collectCampaignMetrics` + `collectFunnelMetrics.
  aggStage`, 2 pontos). Testado: relatório de auditoria (score de Performance) retornou
  "CPL R$3331 crítico" — bate exato com `dashboard/full` na mesma janela
  (213189.39/64=3331.08). Commit `43be45b`.
- ✅ #73 `strategicBriefing.ts` migrado (`gatherBriefingContext`, leads do período atual +
  anterior, por campanha). Testado: briefing gerado recomenda DOWNSCALE + revisão de criativo
  pra campanha Google real (CPL crítico reconhecido), não mais PAUSE cego por "0 leads".
  Commit `67d0d6f`.
- ✅ #74 `iniciativas/[id]/route.ts` + `iniciativas/[id]/briefing/route.ts` migrados. Testado ao
  vivo com iniciativa de teste temporária vinculada à campanha real do Google: GET retornou
  totalLeads=64 (spend batendo exato); POST /briefing gerou narrativa citando "64 leads... CPL
  médio de R$3.330,54" (=213154.39/64). Dado de teste removido depois (0 linhas residuais
  confirmadas). Commit `48b7d29`.
- ✅ #75 Aviso de UX adicionado em `GoogleAdsView.tsx` (banner âmbar no topo do drill-down de
  Google no dashboard) explicando que "conversões"/ROAS do Google vêm de qualquer ação de
  conversão configurada na CONTA do cliente no Google Ads — pode incluir coisas que não são
  lead. Puramente textual, sem mudança de lógica. Commit `d9deae7`.

**Disciplina mantida em cada arquivo migrado:** `tsc --noEmit` limpo + teste ao vivo contra dado
real (não mockado) comparando resultado antes/depois quando há endpoint isolado testável, commit
próprio por arquivo com mensagem explicando o bug/inconsistência resolvida.

**Esta frente está formalmente concluída.** Todo consumidor de "quantos leads teve essa
campanha/cliente/segmento/período" no módulo de Campanhas usa `leadEvents.ts` — nenhum lugar
reimplementa a própria contagem de lead nem assume que WhatsApp/formulário/Google contam da
mesma forma. Se um novo arquivo precisar contar leads no futuro, ele deve importar
`getLeadEvents`/`sumLeads`/`leadsByDay`/`leadsByCampaign`/`leadsByNetwork` de
`src/lib/marketing/services/leadEvents.ts` em vez de escrever uma query nova.

## Tarefa em andamento

**Nenhuma outra tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 16) — CPL: teste multi-rede real + fix de lead de formulário ✅

**Contexto:** usuário fez 2 perguntas de acompanhamento sobre o fix de CPL ciente de rede da
tarefa anterior: (1) pediu teste com gasto real em mais de uma rede simultaneamente; (2)
questionou se "lead = clique de WhatsApp" está certo, já que o CTA de um anúncio pode ser
formulário também. As duas levaram a achados reais.

**Pergunta 1 — confirmado sem precisar fabricar dado:** achei uma janela de datas
(2026-04-01 a 2026-07-21) que já cobre o histórico real das duas redes deste tenant
simultaneamente. `cplByNetwork` retornou `google: {spend:213154.39, leads:64, cpl:3330.54}` +
`meta: {spend:31668.80, leads:1, cpl:31668.80}`, com o total combinado batendo exatamente a
soma das duas (R$244.823,19 / 65 leads).

**Pergunta 2 — achado real confirmado com dado ao vivo:** `CtaInteraction.event_type` tem 4
valores (`VIEW`/`SUBMIT`/`WHATSAPP_CLICK`/`REDIRECT`) — o CTA de um anúncio nem sempre é
WhatsApp, pode ser formulário (`ctaType='LEARN_MORE'`, redireciona pra `/l/{slug}`). Achei 8
submissões reais `LEARN_MORE` neste tenant, 7 com `lead_uuid` preenchido — meu cálculo de CPL
ignorava esse sinal inteiro, mostrando `leads:0` mesmo com leads reais atribuídos.

**Implementado:**
1. `networkLeadSource.ts` — método renomeado `'whatsapp_click'` → `'cta_engagement'`, cobrindo
   `CtaInteraction.WHATSAPP_CLICK` **e** `CtaSubmission` (`lead_uuid IS NOT NULL`).
2. `cplTimelineService.ts` + `dashboard/full/route.ts` — somam as duas fontes por dia/rede.

**Bug pego durante a própria verificação (não hipotético):** uma resposta real de WhatsApp
TAMBÉM grava uma `CtaSubmission` (via `inboundProcessor.ts`, chamada `insertSubmission`
incondicional) — somar clique + submissão sem filtro contaria o mesmo lead 2x. Confirmado ao
vivo: a campanha "Alto Padrão — Alphaville" tinha um `WHATSAPP_CLICK` e uma `CtaSubmission`
**do mesmo lead**, 25 segundos de diferença (resíduo do meu próprio teste T8 de uma tarefa
anterior desta sessão, nunca limpo completamente — limpo agora). Corrigido com
`cta_type != 'WHATSAPP_MESSAGE'` no filtro de submissões — só formulário soma como sinal
adicional.

**Testado ao vivo com dado sintético controlado e mínimo** (removido logo depois): par
clique+resposta de WhatsApp (mesmo lead) + 1 lead de formulário genuíno, mesmo dia/campanha →
endpoint retornou `leads:2` (não 3) — confirma que a correção de duplicação funciona de verdade,
não só na teoria. `npx tsc --noEmit`: zero erros novos.

**CLAUDE.md atualizado** — seção "Multi-Rede" reflete o método renomeado e o cuidado de não
duplicar contagem entre clique e submissão de WhatsApp.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 15) — CPL ciente de rede + terreno pra novas redes ✅

**Contexto:** usuário fez 2 perguntas sobre o endpoint de CPL recém-criado: (1) o cálculo cobre
todas as redes (Meta/Google/TikTok/YouTube)? (2) como uma feature futura vai "adivinhar" que
esse cálculo já existe? Investigação da pergunta 1 revelou um achado real, não hipotético.

**Achado:** o gasto (spend) já cobria todas as redes automaticamente (tabela `Insight` é
agnóstica de rede), mas **leads não** — tanto `cplTimelineService.ts` quanto o `cplByNetwork`
pré-existente de `dashboard/full/route.ts` só contavam `CtaInteraction.WHATSAPP_CLICK`, que é
como o Meta sinaliza lead nesta plataforma. O Google Ads não depende de clique de WhatsApp —
suas conversões reais já vêm da própria API (`GoogleAdsAdapter.fetchInsights` → persiste em
`Insight.conversions`), campo que nenhum dos dois cálculos lia. Uma campanha de Google real com
gasto e conversões reais aparecia com `leads:0/cpl:null`, escondendo dado real.

**Implementado:**
1. `src/lib/marketing/services/networkLeadSource.ts` (novo) — registro central
   `LEAD_SOURCE_BY_NETWORK` (`meta→whatsapp_click`, `google→insight_conversions`, YouTube cai
   sob `google` mesmo adapter) + `leadSourceForNetwork()` com fallback seguro pra rede
   desconhecida. Mesmo espírito do catálogo de estratégias de distribuição e do factory de
   redes — vocabulário em código, mas 1 linha nova basta quando LinkedIn/TikTok (FASE 11)
   ganharem adapter real.
2. `cplTimelineService.ts` — resolve a rede de cada campanha no escopo, separa em 2 grupos
   (clique de WhatsApp vs conversões do Insight) e soma os leads de cada grupo por dia antes de
   calcular o CPL.
3. `dashboard/full/route.ts` — `cplByNetwork` usa o mesmo registro pra decidir, por rede, se lê
   `leadsByNetwork` (WhatsApp) ou a nova `conversionsByNetwork` (derivada de `currentInsights`,
   já em memória — sem query extra).
4. `CLAUDE.md` — nova seção "Multi-Rede" documentando o catálogo de métricas compartilhadas
   (`cplTimelineService`/`revenueAttributionService`/`wastedSpendService`) e o registro de
   lead-por-rede, como resposta à pergunta 2 do usuário sobre descoberta futura.

**Testado ao vivo contra dado real persistente** (campanha "Google Search — Apartamentos SP",
seed da FASE 17, tenant Marketing Digital): conversões reais por dia (4,4,7,5,2) batendo exato
com `Insight.conversions` via SQL direto; `cplByNetwork.google` passou de `{leads:0,cpl:null}`
pra `{leads:22,cpl:3613.22}` no período testado · regressão do caminho Meta confirmada: total
combinado no escopo mais amplo bateu exatamente com a soma das 2 fontes (64 conversões Google +
1 clique WhatsApp Meta = 65). `npx tsc --noEmit`: zero erros novos nos 3 arquivos tocados/criados.

**Resposta dada ao usuário sobre "como descobrir que já existe" (pergunta 2):** honesta —
não há mecanismo automático de descoberta. Depende de convenção (pasta `src/lib/marketing/
services/`) e documentação (`CLAUDE.md`, agora com a seção nova). Sugestão de uma seção
"Métricas Compartilhadas" catalogando os serviços reutilizáveis foi aceita e incorporada dentro
da mesma seção "Multi-Rede" (não virou seção separada, ficou mais coeso assim).

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 14) — Investigação do 500 em `GET /dashboard/full` ✅

**Contexto:** achado à parte registrado na tarefa anterior (endpoint de CPL) — `GET /dashboard/
full` lançava 500 pro tenant Marketing Digital. Usuário pediu investigação.

**Método:** como o servidor dev já estava rodando fora do controle desta sessão (sem acesso ao
stdout do terminal), instrumentei temporariamente a rota com uma variável `lastStep` exposta na
resposta de erro (não `console.log`, que seria invisível) pra bisectar exatamente onde o código
falhava, testei ao vivo, encontrei o ponto exato, e revertive toda a instrumentação
(`git checkout --`) assim que a causa ficou clara — zero mudança de código permanente.

**Causa raiz confirmada:** o crash acontecia exatamente em `prisma.ctaInteraction.count(...)`
(linha 114) — só é possível se `prisma.ctaInteraction` (o model gerado) estiver `undefined`.
Conferido que o client gerado em disco (`node_modules/.prisma/client`) tinha `ctaInteraction`
normalmente — o problema era a instância do `PrismaClient` presa no singleton global
(`globalForPrisma.prismaMarketing`, `src/lib/marketing/prisma.ts`) do processo Node de longa
duração desta sessão, criada antes da última regeneração do client. Explica por que nenhum dos
dezenas de testes reais desta sessão pegou isso antes: todo o resto do código que grava/lê
`CtaInteraction` usa SQL cru (`pool.query`), não o model Prisma tipado — essa rota é a única que
chama `.ctaInteraction.count()` diretamente.

**Resolvido:** usuário reiniciou o `npm run dev`. Reconfirmado ao vivo — `GET /dashboard/full`
voltou a funcionar (`leadCount:1, spend:213154.39`), batendo exatamente com o que `/dashboard/
cpl` (implementado na tarefa anterior) e a query SQL direta já mostravam. Mesmo padrão de bug já
documentado várias vezes no histórico deste arquivo ("Prisma singleton stale") — não é um bug de
código, é um efeito colateral de sessões de dev muito longas sem restart após regenerar o client.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 13) — Endpoint reutilizável de CPL por período ✅

**Contexto:** próximo item da lista de pendências levantada após a conclusão da bateria de
testes. Usuário pediu implementação (CPL é um dos KPIs mais importantes de tráfego pago,
necessário pra relatórios futuros) depois de eu investigar e reportar que a "falta" não era
uma lacuna funcional (os gráficos de CPL diário já existiam e funcionavam), mas sim a ausência
de um endpoint genérico reutilizável — o cálculo estava duplicado (uma vez derivado no cliente,
outra vez embutido dentro do endpoint de comparação de segmento).

**Implementado:**
1. `src/lib/marketing/services/cplTimelineService.ts` (novo) — `getCplTimeline(tenantId, opts)`:
   resolve `campaignIds` no escopo (reaproveita `resolveCampaignIdsBySegment` + filtro de
   cliente, mesma lógica de `/dashboard/full`), agrega `spend` por dia via `prisma.insight.
   groupBy` e `leads` por dia via a mesma query de `CtaInteraction` (`WHATSAPP_CLICK`) já usada
   em `/dashboard/full`, funde os dois num array `{date, spend, leads, cpl}[]`.
2. `GET /api/admin/campanhas/dashboard/cpl` (novo) — mesmos query params de convenção do
   dashboard (`startDate`/`endDate`/`clientId`/`segmentId`/`campaignId`).
3. `marketing-api.ts` — `getCplTimeline()` + tipos `CplTimelinePoint`/`CplTimelineData`.
4. `dashboard/page.tsx` — `cplData` (consumido por `CplTimelineChart`) passou a vir do novo
   endpoint em vez de ser derivado no cliente.

**Bug real corrigido de quebra (achado durante a implementação, não hipotético):** a derivação
antiga no cliente zipava `data.currentPeriod.insights` (1 linha por CAMPANHA por dia, não 1 por
dia) com o mapa de leads por dia — com 2+ campanhas ativas no mesmo dia, o total de leads
daquele dia era contado uma vez por linha de campanha, inflando o CPL exibido no gráfico. O
serviço novo agrega por dia (`GROUP BY`) antes de calcular o CPL, eliminando a duplicação.

**Testado:** resultado do endpoint batido contra `SUM(spend)`/`COUNT(leads)` via SQL direto
(fonte da verdade, não outro endpoint) pro tenant real Marketing Digital, mesmo escopo/período
— bateu exato (R$213.154,39 / 1 lead). `npx tsc --noEmit`: 55 erros, mesma baseline
pré-existente (1 erro novo de compatibilidade de iterador de `Map` corrigido antes do commit
final — `[...map.keys()]` exige downlevelIteration; trocado por `Array.from(map.keys())`).

**Achado à parte, não corrigido (fora de escopo):** `GET /dashboard/full` lança 500 ("Cannot
read properties of undefined (reading 'count')") pro tenant Marketing Digital num teste manual
via curl — pré-existente, arquivo não tocado nesta sessão, não investigado a fundo. Vale
registrar pra a próxima sessão que mexer nesse endpoint.

**CLAUDE.md atualizado:** item "Endpoint CPL por período" removido da lista de pendências;
`dashboard/cpl` documentado na tabela de API Routes do módulo.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 12) — Resolução dos achados DG2/T3 da bateria de testes ✅

**DG2 — decisão de produto, sem implementação:** perguntei ao usuário se valia adicionar um
aviso na UI de Campanhas dizendo que cliques de WhatsApp sem o módulo Mensageria não viram lead
identificado. Resposta: **não implementar** — é estratégia de negócio deliberada. O gestor sentir
a dor de não conseguir gerenciar o pós-clique é o que aumenta a propensão de contratar Mensageria;
alertar aqui reduziria essa fricção comercial. Registrado como decisão consciente, não pendência.

**T3 — implementado (atribuição de campanha visível na Mensageria):** o usuário esclareceu 2
coisas importantes antes de eu implementar: (1) a tabela `leads_staging`/`marketing_eventos`
"deveria estar no schema public porque é compartilhada entre mais de 1 módulo" — conferido
direto no banco: **já está** em `public` (não em `campanhasmarketingdigital`), então não havia
nenhuma migração de schema pendente aqui, só um mal-entendido meu ao descrever o achado
originalmente. (2) Pediu pra eu revisar se um clique de WhatsApp aparece no dashboard de
Mensageria — investigação confirmou que **não aparecia em lugar nenhum**: o vínculo
`mensageria.contacts.lead_uuid → public.marketing_eventos` já existia e funcionava (confirmado
no T6), mas o único uso desse dado em toda a Mensageria era um link "Ver no CRM →" (inútil pra
quem só tem Mensageria).

**Implementado:**
1. `GET /api/admin/mensageria/conversations/[id]` — novo `contact.attribution` via
   `LEFT JOIN LATERAL` em `marketing_eventos` (toque mais recente do lead) +
   `JOIN campanhasmarketingdigital."Campaign"` pra resolver o nome real. `null` quando o lead
   não tem nenhum toque de marketing; campos de UTM presentes mas `campaignId: null` quando é
   orgânico (distingue "não sabemos" de "sabemos que foi orgânico").
2. `ConversationThread.tsx` — badge no cabeçalho da conversa (📣 nome da campanha real, ou
   "WhatsApp orgânico"), visível **independente de o tenant ter CRM** — ao contrário do link
   "Ver no CRM" que já existia.
3. `GET /api/admin/mensageria/analytics` — novo KPI "Vindas de campanha" (contagem + %) via
   `EXISTS` correlacionado no `marketing_eventos`, seguindo a mesma disciplina de "cada query
   com seu próprio array de parâmetros" já usada no resto do arquivo.
4. `mensageria/analytics/page.tsx` — card do novo KPI ao lado de "Resolvidas pelo bot".

**Testado ao vivo, ponta a ponta, tenant-bancada (campanha+ad reais de teste, C+M):** clique real
`/api/r/{trackingId}` → resposta simulada com `[ref:...]` → `GET /conversations/[id]` retornou
`attribution.campaignName` = nome real da campanha · segunda mensagem, mesma conversa, SEM ref
(orgânica) → `attribution` com `campaignId:null`, badge cairia em "WhatsApp orgânico" · `GET
/analytics` refletiu corretamente `novas:2, deCampanha:1, deCampanhaPct:50` (só a de campanha
conta, a orgânica não infla o número). Dado de teste removido depois, confirmado zero resíduo.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente, nenhum novo.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 11) — Auditoria + fix do Seletor de Cliente (`cta-analytics`) ✅

**Contexto:** usuário perguntou quais eram os próximos passos após a conclusão da matriz de
testes de unificação de leads. O CLAUDE.md tinha um TODO marcado "ALTA PRIORIDADE" dizendo que
nenhuma página do módulo de Campanhas expunha o seletor de cliente — mas o histórico deste
mesmo arquivo (`CHECKPOINT.md`) mostrava várias sessões anteriores adicionando `ClientSelector`
a várias páginas. Delegada uma auditoria (agente `Explore`) pra confirmar o estado real antes de
implementar qualquer coisa — regra do projeto de nunca recomendar/agir a partir de memória sem
verificar o estado atual primeiro.

**Achado:** o TODO estava de fato desatualizado. 9 das 10 páginas do módulo já tinham
`ClientSelector`/`useClientSelector` totalmente funcionais (não cosméticos — `clientId`
realmente chegava nas chamadas de API): `dashboard`, `leads`, `criativos`, `criativos/padroes`,
`iniciativas`, `desperdicio`, `portfolio`, `auditoria`, `publicacoes`. A única página realmente
sem seletor era `cta-analytics` — e o backend (`/api/admin/campanhas/cta-analytics/route.ts`)
já suportava `clientId` (`own`/`<uuid>`/`all`) desde uma sessão anterior; só faltava a UI.

**Implementado:** `ClientSelector` (variant `toggle`, `allowSegment={false}` já que o filtro de
Segmento existente na página tem precedência sobre `clientId` na API) adicionado ao header da
página, ao lado do seletor de período. `clientFilter` entra na querystring só quando não há
segmento selecionado (evita mandar um parâmetro que a API já ignora). CLAUDE.md corrigido: os 2
TODOs "ALTA PRIORIDADE" duplicados removidos/atualizados pra refletir o estado real (concluído).

**Verificado:** `npx tsc --noEmit` — 55 erros, mesma baseline pré-existente, nenhum novo.
Verificação visual no navegador tentada (injeção de cookie JWT real do usuário `admmd`, tenant
Marketing Digital) — mesma limitação de sempre já documentada dezenas de vezes neste projeto:
`useAuth`/`/me` client-side redireciona pra `/admin/login` mesmo com JWT+`userId` reais em
navegação completa. Confiança na correção vem de `tsc` limpo + o componente/hook serem os
MESMOS já usados e visualmente aprovados nas outras 9 páginas (mesmo padrão, zero código novo
no componente em si).

**Próximos passos reais, ainda em aberto (levantados na auditoria/conversa, não atacados):**
- Redesign Premium via skill `impeccable` (item 1 do CLAUDE.md)
- Sync Meta real, fluxo completo do CampaignWizard, alerta de token Meta expirando, endpoint CPL
  por período (item 2 do CLAUDE.md)
- Achados da bateria de testes desta sessão (DG2 — aviso de UX; T3 — decisão de produto sobre
  lead via Mensageria-só; retenção de tabelas de auditoria; simetria de gamificação; limpeza de
  código morto `LeadGuardian`/`lead-router-sla-worker`)
- Outras frentes em worktrees separados: `netimob-google` (Google Ads/TikTok), `netimob-cherrypick`
  (Mensageria RAG), `netimob-imgfix` (fix de fotos via MinIO)

**Nenhuma tarefa em andamento no momento.** O plano de unificação de leads entre Campanhas/CRM/
Mensageria (`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md`) está formalmente concluído e testado.
Pendências reais, deprioritizadas por instrução explícita do usuário (não atacar sem pedido):
política de retenção das tabelas de auditoria (BLOCO 0 do `transbordo`), simetria de gamificação
(XP não é dado no caminho de `imovel_prospects`, só em `leads_staging`), limpeza de código morto
(`LeadGuardian.ts`/`lead-router-sla-worker.ts`), aviso de UX sobre cliques de WhatsApp sem
Mensageria contratada (achado no DG2), decisão de produto sobre lead criado via infra
compartilhada mesmo com só Mensageria contratada (achado no T3).

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 10) — Execução da matriz formal de testes (T1-T9/DG1-4/I1-4/A1-3) ✅

**Contexto:** último item pendente do plano de unificação. Antes de começar, o usuário fechou um
buraco real que eu tinha levantado ao responder "como seguir": no tenant real Imobiliaria XYZ,
nenhum nível da cascata do Imobiliário (`owner_of_asset`/`geo_area`/`plantonista_fallback`)
conseguia achar candidato — os 37 imóveis reais estão todos com `corretor_fk NULL`, a tabela
`atendente_area_atuacao` tem 0 linhas, e a única corretora real (Juliana Carvalho) tem
`is_plantonista=false`. O usuário adicionou `round_robin` como prioridade 4
(`slaMinutos:"300"`) — confirmado no banco, fecha o risco de lead morto antes de começar os
testes formais.

**Executado:** os 20 cenários de `docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md`, na ordem do
documento (T1→T9→DG1→DG4→I1→I4→A1→A3), todos com dado real (nunca mockado) — tenant-bancada
"Teste RAG — Multi-Segmento" (`tenant_modules`/`tenant_feature_overrides` ligados/desligados por
cenário e sempre revertidos a zero ao final) pra combos que nenhum tenant real tem hoje (C/R/M/
C+M/R+M isolados), e os tenants reais Imobiliaria XYZ + Marketing Digital pros combos C+R e
C+R+M. **20/20 passaram.**

**Bug real encontrado e corrigido (durante T3):** `POST /api/crm/leads` lançava 500 pra qualquer
tenant sem nenhum `kanban_colunas` ativo (onboarding novo, ou tenant só-Mensageria criando lead
via infra compartilhada) — o trigger `trg_log_kanban_ciclos` tentava gravar `coluna_id NULL`
numa coluna NOT NULL de `leads_kanban_ciclos`. `leads_staging` já commitava antes do crash (sem
perda de dado), mas o caller via erro. Corrigido via
`prisma/migration-2026-07-21-fix-kanban-ciclos-null-coluna.sql` (trigger pula o registro de
auditoria quando `coluna_id IS NULL`; zero mudança de comportamento pra tenants com kanban
configurado — 100% dos tenants reais hoje).

**Achado real sobre o mecanismo de desprovisionamento (durante DG4):** desligar só
`tenant_modules.is_enabled=false` do módulo `crm` NÃO esconde a categoria CRM da sidebar — a
função `get_sidebar_menu_for_user` tem uma "NOVA REGRA" (fallback já documentado no próprio
código da função) que mostra a categoria se a feature tiver `tenant_feature_overrides.is_active=
true`, independente de `tenant_modules`. Não é bug: é o modelo de provisionamento já documentado
em `docs/ACCESS_CONTROL.md` — `tenant_feature_overrides` é o ato deliberado de provisionamento (o
"contrato"), `tenant_modules` é sinal comercial complementar. Confirmado repetindo o teste
desligando `tenant_feature_overrides` (o mecanismo real que `/admin/master/provisioning` usa) →
sidebar corretamente escondeu tudo de CRM, `leads_staging`/`leads_kanban` do lead continuaram
100% intactos; reativado depois (I4) → sidebar voltou, lead não duplicou.

**Achados de produto registrados, não implementados (fora de escopo desta rodada):**
- **T3:** `processInboundWhatsAppMessage` chama `/api/crm/leads` incondicionalmente — um lead é
  criado em `leads_staging` mesmo quando o tenant só tem Mensageria contratada (infra
  compartilhada, por design do D1) — vale uma decisão de produto se isso deve ficar assim.
- **DG2:** não existe hoje nenhum aviso explícito na UI de Campanhas avisando que cliques de
  WhatsApp sem o módulo Mensageria contratado não viram lead identificado.
- **T7 (nuance de enunciado):** `marketing_eventos` não fica literalmente vazio pra lead
  orgânico do WhatsApp — grava 1 linha honesta (`utm_source='whatsapp', utm_medium='organico'`)
  com `campaign_id NULL` (zero atribuição falsa, que era o que realmente importava).

**Outras confirmações relevantes:** round_robin (adicionado pelo usuário antes da bateria)
confirmado funcionando ponta a ponta com dado real no T4 (Juliana Carvalho corretamente
atribuída); T8/T9 rodaram contra a fixture real "Alto Padrão — Alphaville" (Marketing Digital),
confirmando Match Engine (1 lead, 2 eventos de atribuição) e Visão 4 (CPA/ROAS reais) sem
nenhuma regressão.

**Todo dado de teste removido ao final** (incluindo o usuário-bancada temporário criado só pra
gerar sidebar real via `get_sidebar_menu_for_user`) — confirmado via SQL que não sobrou nenhuma
linha `TESTE UNIF%` em nenhuma tabela, e o tenant-bancada voltou a zero módulos/features/colunas.

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 9) — UI: diferenciar ajuda de geo_area × plantonista_fallback ✅

**Contexto:** ao revisar (via print real da tela) o modal "Estratégias de Distribuição de
Leads" depois do rename da tabela + generalização do `plantonistaFallbackStrategy`, o usuário
perguntou se algo mais precisava mudar na UI. Investigando, o texto de ajuda do bloco de config
(tabela/coluna FK/estado/cidade do vendedor) era **idêntico** nos blocos de `geo_area` e
`plantonista_fallback` — risco real de o Master achar que precisa manter as duas configs
sincronizadas.

**Discussão que resolveu a dúvida (antes de mexer no código):** propus inicialmente unificar
a config num campo só de segmento; o usuário reagiu com um cenário de negócio real — "e se o
atendimento é regionalizado no dia a dia, mas no fim de semana um plantonista da MATRIZ (sede
nacional) cobre todos os estados, sem seguir a regionalização normal?". Isso confirma que as
duas estratégias **devem poder apontar pra fontes de área diferentes** — não é inconsistência,
é um requisito de negócio legítimo. Retirei a sugestão de unificar.

**O que já estava certo, só não comunicado:** o código das 2 estratégias já implementa a
diferença corretamente — `geoAreaStrategy` usa `INNER JOIN` + `WHERE` (filtro obrigatório: só
considera quem atua exatamente naquele estado/cidade); `plantonistaFallbackStrategy` usa
`LEFT JOIN` + `ORDER BY CASE` (só prioriza por área, nunca exclui ninguém — um plantonista sem
área cadastrada, ou de área diferente, continua 100% elegível). Isso já resolve o cenário do
usuário sem precisar de nenhuma mudança de lógica.

**Implementado — só texto, config/lógica intocadas:**
`SegmentDistributionModal.tsx` — o parágrafo de ajuda acima dos 4 campos (tabela/coluna FK/
estado/cidade) agora é condicional por `strategyKey`: para `geo_area` explica que é filtro
obrigatório; para `plantonista_fallback` explica que é só desempate, que é **independente** do
bloco de Área Geográfica acima, e dá o exemplo concreto do plantão nacional na sede como razão
legítima para apontar pra uma fonte diferente.

**Verificado:** `npx tsc --noEmit` — 55 erros, mesma baseline pré-existente, nenhum novo (nenhum
no arquivo tocado). Mudança é puramente de texto JSX (sem lógica nova, sem migração, sem
validação nova) — não justifica verificação em navegador (mesma limitação de sempre de
cookie/middleware Master já documentada repetidamente neste projeto).

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 8) — Rename `corretor_areas_atuacao` → `atendente_area_atuacao` ✅

**Contexto:** pergunta original do usuário (bem no início desta frente de trabalho) que tinha
ficado pendente enquanto investigávamos o worker duplicado e generalizávamos o `geo_area`.
Com as duas coisas resolvidas, o impacto real do rename caiu de 44 arquivos (levantamento
original) pra só 5 em `src/` — a maior parte do resto eram scripts de debug/migrations
históricas, fora de escopo.

**Decisões confirmadas com o usuário:** nome final `atendente_area_atuacao`; generalizar
`plantonistaFallbackStrategy.ts` (ainda hardcoded) na mesma leva, já que ficava barato.

**Implementado:**
1. `prisma/migration-2026-07-21-rename-corretor-areas-atuacao.sql` — `ALTER TABLE ... RENAME`
   + os 4 índices + 4 constraints de FK + a sequence, tudo renomeado junto (metadado, sem
   cópia de dado). Confirmado antes: nenhum segmento tinha `sellerAreaTable` explícito em
   `segment_distribution_strategies.config` (todos usando o default do código), então nenhum
   dado de config precisou migrar.
2. `geoAreaStrategy.ts` — só o default (`sellerAreaTable = 'atendente_area_atuacao'`).
3. `plantonistaFallbackStrategy.ts` — generalizado no mesmo padrão do `geo_area` (config
   opcional `sellerAreaTable`/`sellerAreaFk`/`sellerEstadoColumn`/`sellerCidadeColumn`,
   defaults idênticos ao comportamento de sempre) — antes só usava a tabela hardcoded como
   critério de desempate.
4. `src/lib/database/users.ts` (limpeza ao deletar usuário) e
   `src/app/api/public/corretor/areas-atuacao/route.ts` (API pública onde o corretor
   cadastra sua própria área — GET/POST/DELETE) atualizados pro nome novo.
5. `SegmentDistributionModal.tsx` + API de validação — textos/placeholders atualizados,
   `plantonista_fallback` ganha os mesmos campos de config que `geo_area` (mesmo bloco de UI,
   reaproveitado pelas duas estratégias).

**Testado ao vivo:** `POST /api/crm/leads` (geo_area + plantonista_fallback contra a tabela
renomeada, sem erro) · `GET/POST/DELETE /api/public/corretor/areas-atuacao` (a API pública real
que o corretor usa) — ciclo completo testado com token real de um corretor de verdade,
confirmado no banco que a linha foi escrita/lida/removida em `atendente_area_atuacao`. `npx tsc
--noEmit`: 55 erros, mesma baseline pré-existente (os 4 erros que aparecem no arquivo de
`areas-atuacao` já existiam antes — mismatch de tipo em `getLoggedUser`, não relacionado às
mudanças de nome de tabela). Dado de teste removido depois.

**Fora de escopo, deliberado:** a URL pública `/corretor/areas-atuacao` (a página que o corretor
acessa) não foi renomeada — é uma decisão independente do nome da tabela, e mudar a URL
quebraria links/favoritos salvos por corretores reais. Scripts de debug (~25 arquivos) e
migrations históricas mantidos com o nome antigo, como já era o combinado.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 7) — `geo_area` sem tabela hardcoded + fallback de geografia genérico ✅

**Contexto:** ao revisar a estratégia `geo_area` recém-criada, o usuário perguntou como a
aplicação "adivinha" quais campos/tabelas fazem o match de área geográfica entre lead e
vendedor. Resposta honesta: não adivinhava — tinha 2 pontos hardcoded que sobraram da extração
do F7 (a tabela do vendedor dentro da estratégia, e o fallback de geografia do lead em
`/api/crm/leads`, que só sabia buscar em `imoveis`). Consertados os dois agora.

**Implementado:**
1. `geoAreaStrategy.ts` — `sellerAreaTable`/`sellerAreaFk`/`sellerEstadoColumn`/
   `sellerCidadeColumn` viram config opcional da estratégia (defaults idênticos ao
   comportamento de sempre — `corretor_areas_atuacao`/`corretor_fk`/`estado_fk`/`cidade_fk` —
   zero regressão pra quem não configurar nada). Identificadores validados antes de
   interpolar na SQL.
2. `/api/crm/leads/route.ts` — o fallback "sem estado_fk/cidade_fk no payload, busca no
   imóvel" deixou de ser hardcoded: agora resolve a config `owner_of_asset` do segmento do
   tenant (reaproveitando `targetTable`/`targetIdColumn`, que já existiam) + 2 campos novos
   (`estadoColumn`/`cidadeColumn`). Sem esses 2 campos configurados, o fallback é
   simplesmente pulado (sem erro) — segmento sem essa noção de geografia do ativo não quebra.
   Fallback de `tenant_id` a partir do imóvel (quando `tenant_id` não vem no payload) mantido
   como está — é uma conveniência legada separada, fora do escopo desta rodada.
3. `prisma/migration-2026-07-21-owner-of-asset-geo-columns.sql` — backfill do segmento
   Imobiliário com `estadoColumn='estado_fk'`/`cidadeColumn='cidade_fk'`, preservando o
   comportamento exato de hoje.
4. `SegmentDistributionModal.tsx` + API de estratégias — novos campos expostos na tela do
   Master (com nota de que são opcionais) e validados tanto no cliente quanto no servidor.

**Testado ao vivo:** `POST /api/crm/leads` com `imovel_id` real e **sem** `estado_fk`/
`cidade_fk` no payload (tenant Imobiliaria XYZ) → `leads_staging.estado_fk='PE'`,
`cidade_fk='Recife'` corretamente herdados do imóvel via o novo caminho genérico (não mais a
query hardcoded, que foi removida). `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente.
Dado de teste removido depois.

**Pendências reais registradas, ainda não atacadas:** `plantonistaFallbackStrategy.ts` ainda
usa `corretor_areas_atuacao` hardcoded (só como critério de desempate na ordenação, não como
filtro obrigatório — impacto bem menor que o do `geo_area`, deliberadamente fora de escopo
desta rodada). Plano de testes formal (`docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md`) continua
pendente de execução.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 6) — Aposentado worker duplicado de roteamento de leads ✅

**Contexto:** ao investigar por que a pergunta "qual campo determina a área geográfica pro
match de distribuição" não tinha resposta clara na estratégia `geo_area`, o usuário perguntou o
impacto de renomear `corretor_areas_atuacao` — investigação dessa pergunta revelou um achado bem
mais sério: **existe um segundo motor de roteamento de leads, completamente separado do
`DistributionEngine`, rodando ativamente**: `scripts/lead-router-sla-worker.ts` (usa
`src/lib/guardian/LeadGuardian.ts`, cujo próprio comentário se autodeclara "SINGLE SOURCE OF
TRUTH") — container Docker próprio (`netimobiliaria-lead-worker`), rodando há 3 dias, processando
`imovel_prospect_atribuicoes` a cada 1 minuto, **em paralelo** ao `/api/cron/transbordo` (a cada 5
min, via `netimobiliaria-feed`) — que faz a MESMA coisa (expira SLA + reatribui), com uma lógica
de decisão DIFERENTE. Risco real: reatribuições divergentes / e-mails duplicados pro mesmo evento,
sem erro nenhum nos logs — silencioso.

**Investigação de causa raiz confirmou:** `LeadGuardian`/worker foram tocados pela última vez em
2026-02-02 (5 meses e meio parado); `DistributionEngine`/`prospectRouter` foram tocados ontem
(refactor de estratégias desta sessão). Cronologia + o próprio comentário do `LeadGuardian` deixam
claro que o `DistributionEngine` foi construído pra SUBSTITUIR essa classe, mas o corte nunca foi
finalizado — o worker antigo nunca foi desligado do `docker-compose.yml`.

**Achado que reduziu o risco da decisão:** `docker-compose.vps.yml` (produção) **nunca teve** o
serviço `lead-worker` — só existe no `docker-compose.yml` de dev local desta máquina. Produção
roda, desde que existe, só `feed-cron-scheduler.js` → `/api/cron/transbordo` (serviço `prod_feed`,
`restart: unless-stopped`, com `CRON_SECRET`/dependências corretas). **A duplicação nunca afetou
produção** — era um problema só deste ambiente de desenvolvimento.

**Decisão do usuário, com 2 exigências explícitas:** (1) priorizar não comprometer a confiabilidade
da distribuição de leads (a lógica parametrizável por segmento agora tem que sempre rodar, sem
"leads mortos" por SLA não cumprido) — testar ANTES de desligar a rede de segurança antiga; (2) a
questão de crescimento das tabelas de auditoria (BLOCO 0 do transbordo, limpeza de 30 dias) fica
como pendência de estudo, não resolvida agora; (3) gamificação (XP/penalidade) não é prioridade
agora — só esclarecer o estado real, sem implementar.

**Investigação de paridade (`prospectRouter.ts` lido por completo):** confirmado que o caminho
novo (`routeProspectAndNotify` → `DistributionEngine`) já cobre tudo que o worker antigo fazia pra
`imovel_prospect_atribuicoes` — e mais: verifica atribuição ativa duplicada antes de inserir,
auto-aceite vincula `imoveis.corretor_fk`, e-mails ricos (corretor + notificação ao cliente em
auto-aceite). **Achado sobre gamificação:** nem o worker antigo nem o `prospectRouter.ts` novo
premiam XP de quem RECEBE o lead reatribuído de `imovel_prospects` (só o caminho do CRM,
`leads_staging`, faz isso) — assimetria pré-existente, não é regressão de nada desta sessão. A
penalização de quem PERDEU o lead por SLA já é feita pelo `transbordo` (BLOCO 1); o worker antigo
nunca fazia nem isso.

**Testado ao vivo, ponta a ponta, antes de desligar qualquer coisa:** criado `imovel_prospects` +
`imovel_prospect_atribuicoes` de teste (status='atribuido', `expira_em` no passado) + 1 corretor
de teste plantonista (única forma de ter um 2º candidato real, já que só existe 1 corretor no
ambiente de dev hoje) → `POST /api/cron/transbordo` real → confirmado no banco: assignment original
virou `status='expirado'`, nova assignment criada com `motivo={"type":"fallback_plantonista",
"engine":"v2"}` (confirma que passou pelo motor NOVO) — cascata completa (dono→geo→plantonista)
funcionou corretamente. Todo dado de teste removido depois, incluindo reverter `imoveis.corretor_fk`
que o auto-aceite tinha gravado.

**Ação executada:** container `netimobiliaria-lead-worker` parado e removido (`docker stop` +
`docker rm`). Serviço `lead-worker` comentado (não apagado) em `docker-compose.yml`, com nota
explicando o porquê e apontando pra este registro. Confirmado `docker compose config` válido
depois da edição, demais containers (`feed`, `db`, `app`, `redis`, `translator`, `minio`) intactos.
Código-fonte (`scripts/lead-router-sla-worker.ts/.js`, `src/lib/guardian/`) mantido no repositório
por ora — limpeza de código morto fica pra uma próxima sessão, sem pressa.

**Pendências reais registradas, não atacadas:** política de retenção das tabelas de auditoria
(`leads_staging_atribuicoes`, `imovel_prospect_atribuicoes` — BLOCO 0 do transbordo) — precisa de
estudo próprio antes de qualquer mudança. Assimetria de gamificação (XP não premiado pro caminho de
`imovel_prospects`) — registrada, não é prioridade agora. Limpeza de código-fonte morto
(`LeadGuardian`, worker antigo) — pendente, sem urgência.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 4) — Motor de distribuição: cascata fixa → estratégias plugáveis ✅

**Contexto:** ao reportar o F7 concluído (extração do acoplamento a "imóvel" do
`DistributionEngine` pras 4 colunas de `system_segments`), o usuário questionou se isso
realmente escalava pra "dezenas de segmentos... zero hardcoded em TUDO". Resposta honesta: não
totalmente — o F7 tirou os 2 hardcodes mais graves (nome do role, busca do dono do ativo), mas
a CASCATA em si (dono → geográfico externo → geográfico interno → plantonista) continuava fixa
no código, igual pra todo segmento. Isso é errado de verdade pra várias verticais reais (Saúde
importa mais especialidade que geografia; B2B nacional não tem geografia nenhuma). Documento
explicado ao usuário antes de implementar: cada segmento passa a declarar sua PRÓPRIA lista
ordenada de estratégias, não só os parâmetros de uma cascata única — mesmo padrão adapter já
usado na plataforma pra redes de anúncio (`AdNetworkService`) e provedores de LLM
(`getLlmClient`). Usuário também perguntou sobre UI: confirmado que segue o padrão já
estabelecido (botão por linha na lista de segmentos, sem item novo na sidebar — mesmo molde de
Ângulos/Interesses/Benchmarks/Dados do Bot/Empresas).

**Implementado:**
1. `prisma/migration-2026-07-21-segment-distribution-strategies.sql` — nova tabela
   `public.segment_distribution_strategies` (segment_id, strategy_key, priority, is_active,
   config jsonb, UNIQUE(segment_id, strategy_key)). Migra os dados do F7: Imobiliário ganha
   `owner_of_asset` (com o config `imoveis`/`id`/`corretor_fk` que já estava hardcoded) +
   `geo_area` + `plantonista_fallback`; todo outro segmento ganha `geo_area` +
   `plantonista_fallback` — preserva o comportamento EXATO que cada um já tinha (a cascata
   sempre rodou pra todos, só o Nível 1 nunca disparava fora do Imobiliário). As 3 colunas do
   F7 (`distribution_target_table/target_id_column/owner_column`) são removidas — foram
   adicionadas nesta mesma sessão, sem nenhum outro código dependendo delas, então não é uma
   migração destrutiva no sentido do CLAUDE.md. `distribution_role_name` fica (parâmetro
   transversal, usado por todas as estratégias, não específico de uma etapa).
2. `src/lib/routing/strategies/` (novo diretório) — 4 módulos, cada um um algoritmo isolado
   implementando a interface `DistributionStrategy`: `ownerOfAssetStrategy` (o Nível 1 do F7,
   generalizado — aceita tanto `sourceOwnerId` já resolvido pelo chamador quanto resolve
   sozinho via `config.targetTable/targetIdColumn/ownerColumn`), `geoAreaStrategy` (Nível 2/3
   de sempre, extraído sem mudança de lógica), `roundRobinStrategy` (**novo** — fila pura, sem
   geografia nem dono, pra segmentos como B2B nacional/SaaS), `plantonistaFallbackStrategy`
   (Nível 4 de sempre). `index.ts` — catálogo (`DISTRIBUTION_STRATEGIES`/
   `DISTRIBUTION_STRATEGY_CATALOG`), mesmo espírito do catálogo de redes de anúncio: o
   vocabulário é código, mas quais se aplicam a cada segmento e em que ordem é 100% dado.
3. `DistributionEngine.findBestCandidate` virou orquestrador — resolve o segmento do tenant,
   busca a lista ordenada de `segment_distribution_strategies` ativas, itera chamando cada
   módulo até achar candidato. `/api/crm/leads/route.ts` simplificado (removida a resolução
   manual de `sourceOwnerId`/`seller_role_name` que eu tinha acabado de adicionar no F7 — o
   engine resolve tudo sozinho agora).
4. **Bug real de pré-multi-tenant encontrado e corrigido durante a extração** (não introduzido
   por mim, preexistente): `transbordo/route.ts` (cron) e `prospectRouter.ts` NUNCA passavam
   `tenant_id` pro `DistributionEngine` — sempre caía no tenant master por padrão. Isso não
   quebrava nada enquanto a cascata era fixa e igual pra todo mundo, mas quebraria silenciosamente
   agora (resolveria o segmento errado, perderia a config de `owner_of_asset` do Imobiliário).
   Corrigido: `i.tenant_id`/`stgLead.tenant_id` adicionados às queries já existentes e passados
   pro engine — fix de causa raiz, não workaround.
5. `GET/PUT /api/admin/master/segments/[id]/distribution-strategies` — replace-all
   transacional, valida `strategyKey` contra o catálogo real e identificadores de
   `config.targetTable/targetIdColumn/ownerColumn` (mesmo padrão de `data-entities/route.ts`).
6. `SegmentDistributionModal.tsx` (novo) — lista reordenável (setas ↑↓, sem lib de drag-and-drop
   nova), toggle ativo/inativo, remover, adicionar do catálogo de estratégias disponíveis,
   formulário de config específico por `strategy_key`. Botão novo (`UserGroupIcon`, rosa) na
   linha de cada segmento em `/admin/master/segments`, mesmo padrão dos outros 5 botões — sem
   item novo na sidebar. Removidos os 3 campos obsoletos do formulário principal do segmento
   (ficou só `distribution_role_name`, que continua fazendo sentido ali).

**Testado ao vivo, ponta a ponta, com dado real** (segmento Imobiliário, tenant Imobiliaria
XYZ): `GET .../distribution-strategies` retornou as 3 estratégias migradas corretamente com o
config real do owner_of_asset · `POST /api/crm/leads` com `imovel_id` real → orquestrador
executou sem erro (mesmo resultado do teste de regressão do F7 original) · **teste decisivo do
round_robin**: adicionado temporariamente como prioridade 1 no segmento Imobiliário, criado um
lead SEM `imovel_id` e sem geografia (que antes não tinha absolutamente NENHUM candidato
possível) → round_robin encontrou corretamente o único "Corretor" ativo do tenant (Juliana
Carvalho, que não tem área geográfica cadastrada nem é plantonista — inelegível pras outras 3
estratégias, mas elegível pra fila pura) — prova concreta de que uma estratégia nova resolve um
caso que a cascata fixa nunca resolveria · validação de identificador (`targetTable: "imoveis;
DROP TABLE users;--"`) e de `strategyKey` inventada → ambas rejeitadas com 400, estado do
segmento intacto depois · segmento revertido ao estado original (3 estratégias) depois do teste.
**Lição registrada:** a limpeza do teste de round_robin fez um `DELETE FROM corretor_scores
WHERE user_id = ...` sem escopar por período/lead — funcionou porque confirmei via 3 queries
cruzadas (leads_staging_atribuicoes/leads_staging/imovel_prospect_atribuicoes, todas count=0
pra esse usuário) que a linha não tinha histórico anterior, mas o `DELETE` em si foi mais largo
do que deveria — da próxima vez, decrementar em vez de apagar, ou checar o estado antes/depois.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero novos em qualquer arquivo
tocado nesta rodada).

**Pendências reais do plano de unificação, ainda não atacadas:** matriz formal de testes (§7 —
9 cenários de contratação + degradação graciosa + integridade da fonte única). A estratégia
`specialty_match` (casar especialidade do lead com especialidade do vendedor) foi discutida mas
deliberadamente NÃO implementada — exigiria uma tabela nova (`user_specialties`) sem nenhum
segmento real pedindo isso ainda; fica pra quando houver um caso concreto.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 3) — F7: CRM agnóstico de domínio ✅

**Contexto:** última fase pendente do plano de migração (F0-F7 completo depois desta entrega —
ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6). Usuário perguntou "F5 já foi implementado?"
— esclarecido que F5 (§6, "Separar tipos na clientes") é a MESMA entrega já documentada como
"D2" nesta sessão (a tabela de fases numera F5, a tabela de decisões numera D2 — mesmo código,
mesmo commit `5f91f93`).

**Investigação antes de implementar:** `DistributionEngine` (`src/lib/routing/
distributionEngine.ts`) tinha 2 pontos hardcoded pra imóvel: o nome do role de vendedor
(`ur.name = 'Corretor'`, hardcoded em 2 queries SQL) e a query fixa de "dono do ativo"
(`/api/crm/leads` sempre fazia `SELECT corretor_fk FROM imoveis WHERE id = $1`, com `domain_id`
sempre `1`). `parametros_imoveis` (tabela de SLA/limites de roteamento) já era 100%
tenant-agnóstica na prática (sempre foi `tenant_id`-scoped, funcionaria pra qualquer segmento)
apesar do nome legado — não precisou de mudança.

**Implementado (aditivo, zero renomeação de tabela — `corretor_areas_atuacao`/
`imovel_prospect_atribuicoes` continuam com esses nomes, mas suas COLUNAS já eram
estruturalmente genéricas o bastante pra qualquer segmento reusar):**
1. `prisma/migration-2026-07-21-segment-distribution-config.sql` — 4 colunas novas em
   `system_segments`: `distribution_role_name` (default `'Corretor'`, preserva 100% do
   comportamento atual pra todo segmento existente), `distribution_target_table`,
   `distribution_target_id_column`, `distribution_owner_column` (as 3 últimas NULL por padrão —
   Nível 1 do motor de roteamento é pulado graciosamente quando ausentes, cai pro roteamento
   geográfico que já era agnóstico). Backfill do segmento Imobiliário com
   `imoveis`/`id`/`corretor_fk` — os valores que já estavam hardcoded no código, zero
   regressão.
2. `DistributionEngine.findBestCandidate` ganha `ctx.seller_role_name?` (default `'Corretor'`
   se ausente) — thread pelas 2 queries que antes tinham `'Corretor'` cravado.
3. `/api/crm/leads/route.ts` — `domain_id` continua existindo só como legado de log; a busca do
   "dono do ativo" e o nome do role agora vêm de `resolveSegment(tenantId, clientId)` (helper já
   existente, reusado — não duplicado) lendo as 4 colunas novas. SQL dinâmico com identificador
   validado (`IDENT_RE`, mesmo padrão de `data-entities/route.ts`) antes de interpolar
   tabela/coluna — nunca lê `system_segments` como SQL confiável sem checar.
4. `POST/PUT /api/admin/master/segments` — aceitam e validam (mesmo `IDENT_RE`) as 4 colunas
   novas; UI do editor de segmento (`/admin/master/segments`) ganha a seção "Distribuição de
   Leads" (cargo do vendedor + tabela/coluna de ID/coluna do dono), mesmo padrão visual das
   seções já existentes (Chatbot, Imagens por IA).

**Testado ao vivo, ponta a ponta, com dado real:** `POST /api/crm/leads` com `imovel_id` real
(tenant Imobiliaria XYZ) → query dinâmica gerada a partir da config do segmento Imobiliário
executou sem erro contra a tabela `imoveis` real, motor de distribuição encontrou corretamente
o único usuário com role "Corretor" deste tenant mas não o roteou (ele não tem
`corretor_areas_atuacao` cadastrada nem é plantonista — condição real pré-existente dos dados,
não regressão) — confirma que o filtro por role, agora parametrizado em vez de hardcoded,
continua batendo exatamente igual a antes · `PUT /api/admin/master/segments` testado com
payload completo (lição de uma sessão anterior aplicada: nunca mandar payload parcial nesse
endpoint replace-all) setando `distribution_role_name='Consultor de Saúde'` +
tabela/colunas de teste pro segmento Saúde → persistiu corretamente, `module_ids` preservado ·
tentativa de injeção (`distribution_target_table: "exames; DROP TABLE imoveis;--"`) → rejeitada
com 400 pela validação de identificador · segmento Saúde revertido ao estado original depois.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero nos arquivos tocados).

**Com isso, o plano `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` tem F0-F7 e D1-D4 completos.**
Resta só a matriz formal de testes (§7 — 9 cenários de contratação + degradação graciosa +
integridade da fonte única), que até agora só foi verificada ad-hoc a cada entrega, não
executada como suíte formal.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 2) — F2/F3: rastreio real de CTA de formulário no wizard ✅

**Contexto:** próxima fase do plano depois de F6 (ver entrada abaixo). F2/F3 pedem "CTA de
formulário no wizard + token de rastreio... → CtaInteraction" — o caminho WhatsApp via token já
tinha sido fechado em D3 (sessão anterior); faltava o equivalente pro caminho de formulário.

**Investigação antes de implementar — descoberta importante:** a infraestrutura de "CTA de
formulário" já existia quase inteira (`CtaDestination`/`CtaFormClient`/`/l/[slug]`/
`/api/public/cta/[slug]/submit`, tudo com suporte a ler `campaign_id`/`ad_id` da query string) —
o wizard já deixava escolher um destino de formulário cadastrado como link do anúncio. **2 gaps
reais concretos, não hipotéticos, encontrados lendo o código ponta a ponta:**
1. `campaigns/route.ts` só roteava o link do anúncio por `/api/r/{trackingId}` (o mecanismo de
   rastreio real) quando `ctaType === 'WHATSAPP_MESSAGE'` — qualquer CTA de formulário ia
   **direto** pro destino, sem gerar `CtaInteraction` nenhuma e sem carregar o `trackingId` real
   do `Ad` — o lead resultante nunca tinha como saber de qual campanha/anúncio veio.
2. Mesmo nos casos em que `campaign_id`/`ad_id` chegavam corretos na query string,
   `/api/public/cta/[slug]/submit/route.ts` **nunca os repassava** pro `POST /api/crm/leads` —
   `campaignId` era extraído da URL e depois descartado, `marketing_eventos.campaign_id` ficava
   sempre `NULL` pra leads de formulário.

**Implementado:**
1. `campaigns/route.ts` — TODO CTA (não só WhatsApp) agora usa `/api/r/{trackingId}` como link
   enviado ao Meta; `Ad.linkUrl` no banco passa a guardar o destino real (o que `/api/r` lê pra
   redirecionar), separado da URL rastreada que vai pro criativo.
2. `/api/r/[trackingId]/route.ts` generalizado — CTA não-WhatsApp loga `CtaInteraction`
   (`event_type='REDIRECT'`, `campaignId`/`adId` reais) e redireciona pro `ad.linkUrl` com
   `?ref={trackingId}` anexado.
3. `/l/[slug]/page.tsx` e `/api/public/cta/[slug]/submit/route.ts` — resolvem `?ref=` via
   `resolveCtaRef` (mesmo resolvedor de D3), com prioridade sobre `campaign_id`/`ad_id`
   manuais na URL; `submit/route.ts` agora de fato repassa `campaign_id` pro `/api/crm/leads`
   (gap 2 acima).

**Bug adicional pego testando ao vivo (não hipotético):** o `submit/route.ts` mandava
`utm_campaign` (nome real via `resolveCtaRef`) como campo **flat** no corpo da requisição, mas
`/api/crm/leads` usa `utm_params` (aninhado) quando presente e **ignora** o campo flat — o nome
real da campanha nunca chegava em `marketing_eventos.utm_campaign` (ficava vazio). Corrigido
movendo o valor pra dentro de `utm_params.campaign`. Só foi pego porque testei a submissão de
verdade contra o banco em vez de confiar na leitura do código.

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, `Ad`/`CtaInteraction`/
`CtaSubmission` de teste criados e removidos depois; usado o destino `APP_FORM` real
"Teste Form - Captação" e a campanha real "Alto Padrão — Alphaville"): `GET /api/r/{trackingId}`
→ redireciona pra `/l/{slug}?ref={trackingId}`, `CtaInteraction` gravada com `campaign_id`/`ad_id`
reais · `POST /api/public/cta/{slug}/submit?ref={trackingId}` → `marketing_eventos.campaign_id`
= id real da campanha, `utm_campaign` = "Alto Padrão — Alphaville" (nome real, não mais vazio) ·
**regressão do caminho WhatsApp confirmada intacta** (`GET /api/r/demo-track-001` continua
redirecionando pro `wa.me` com `[ref:...]` embutido, idêntico a antes da generalização).
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero nos arquivos tocados).

**Pendências reais do plano de unificação, ainda não atacadas:** F7 (CRM agnóstico de domínio —
extrair o acoplamento a imóvel do motor de distribuição pra um adaptador) e a matriz formal dos
9 cenários de teste (§7) — ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6/§7.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação) — F6: Visão 4 (Funil de Receita — CPA/ROAS real) ✅

**Contexto:** próxima fase do plano de unificação depois de F4 (Match Engine, ver entrada
abaixo). F6 é o "payoff comercial" descrito no plano (§5 Visão 4): atribuir receita real de
volta à campanha/criativo — CPA **real** (custo por negócio fechado, não por clique) e ROAS
**real** (receita/investimento) — condicional a C+R (só existe quando o tenant tem Campanhas
E CRM contratados, já que sem CRM não há `leads_staging`/`leads_kanban` pra saber que um lead
virou negócio fechado).

**Investigação antes de implementar:** conferido que `kanban_colunas.nome = 'fechamento'` é o
estágio de negócio ganho (nome fixo interno, `titulo_exibicao` é customizável pelo tenant —
mesmo padrão já usado em outras partes do código, ex. `entendimento_dor`) e que
`leads_staging.valor_venda` guarda o valor do negócio. Confirmado que nenhum tenant de teste
tem negócio fechado real ainda (esperado, ambiente de dev) — validação ponta a ponta feita com
dado temporário real (não mockado), documentado abaixo.

**Implementado:**
1. `src/lib/marketing/services/revenueAttributionService.ts` — `hasCrmModule(tenantId)`
   (checa `tenant_modules`+`system_modules.slug='crm'`) + `getRevenueAttribution(...)`: junta
   `Insight` (gasto, schema campanhas) + `marketing_eventos` (atribuição, campaign_id) +
   `leads_staging`+`leads_kanban`+`kanban_colunas` (negócio fechado, schema public) via SQL
   cru cross-schema, no mesmo padrão já usado em `portfolio/route.ts`. **Metodologia de
   cohort:** tanto leads identificados quanto negócios fechados são filtrados por
   `marketing_eventos.created_at` dentro do período (não pela data de fechamento do negócio,
   que pode ser depois) — evita misturar receita de leads antigos com o gasto de um período
   recente. Simplificação documentada no código: multi-touch não é fracionado (lead que veio
   de 2 campanhas conta receita inteira nas duas).
2. `GET /api/admin/campanhas/dashboard/revenue-attribution` — `available:false` com motivo
   explícito quando o tenant não tem CRM (degradação graciosa, nunca finge CPA/ROAS que não
   existe).
3. `RevenueAttributionWidget.tsx` (novo, self-fetching, mesmo padrão de `CampaignMapWidget`) —
   KPIs (Receita Real, CPA Real, ROAS Real, Negócios Fechados) + top 5 campanhas por ROAS.
   Integrado em `CommandCenterView.tsx` (nova prop `periodDays`, passada de
   `effectivePeriodDays` já existente em `dashboard/page.tsx`).

**Testado ao vivo, ponta a ponta, contra dados reais** (tenant Marketing Digital): sem negócio
fechado real → `available:true`, todas as campanhas com `dealsWon:0`/`cpaReal:null` (honesto,
não inventa) · criado 1 lead de teste real via `POST /api/crm/leads` com `campaign_id` de uma
campanha real com gasto real (R$11.927,02, "Alto Padrão — Alphaville"), movido pro estágio
`fechamento` com `valor_venda=850000` → endpoint retornou `cpaReal=11927.02` (bate exato com o
gasto/1 negócio) e `roasReal=71.27` (850000/11927.02, conferido) — matemática correta · gate
`hasCrmModule` testado contra tenant sem nenhum módulo (Master Platform) →
`available:false, reason:'crm_not_contracted'`, mensagem explícita · dado de teste removido
depois, cascata confirmada. `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero
nos arquivos novos/tocados) · página `/admin/campanhas/dashboard` confirmada compilando sem
erro via `curl` com cookie de sessão real (HTTP 200) — verificação visual no navegador não foi
possível, mesma limitação de sempre já registrada dezenas de vezes neste projeto (client-side
`useAuth`/`/me` redireciona mesmo com JWT+`userId` reais em navegação completa).

**Pendências reais do plano de unificação, ainda não atacadas:** F2/F3 (CTA de formulário no
wizard — o caminho WhatsApp via token já está fechado desde D3), F7 (CRM agnóstico de domínio,
extrair o acoplamento a imóvel pra adaptador) e a matriz formal de testes dos 9 cenários — ver
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6/§7.

---

## Última tarefa concluída

### Sessão 2026-07-21 — F4: Match Engine real (telefone normalizado + `match_method`) ✅

**Contexto:** próxima fase do plano de unificação depois de D1/D2/D3 (ver entradas abaixo).
F4 pede "dedupe real por telefone/email contra leads/contatos existentes, gravando
match_method" — o dedupe que já existia em `/api/crm/leads` (POST) comparava telefone por
**string exata**, o que é frágil entre canais que formatam o número de forma diferente.

**Bug real confirmado em produção antes de implementar (não hipotético):** encontrada a MESMA
pessoa (`alexandreseverog@gmail.com`) com 2 linhas em `leads_staging` — telefone gravado como
`"(81) 99800-0047"` numa linha e `"+5581998000047"` noutra (mesmo número, formato diferente).
Nesse caso específico o `tenant_id` de uma das linhas também está `NULL` (registro legado de
antes do multi-tenant), então não teria casado de qualquer forma — mas confirma que o padrão
"mesmo número, formatos diferentes entre canais" é real, não um cenário forçado.

**Implementado:**
1. `prisma/migration-2026-07-21-leads-staging-match-engine.sql` — coluna `match_method
   VARCHAR(20)` em `leads_staging` (audita COMO o match aconteceu: `email`/`telefone`/`novo`/
   `manual`) + índice funcional em `(tenant_id, RIGHT(regexp_replace(telefone,'\D','','g'),10))`
   pra comparar telefone normalizado com performance de índice.
2. `src/app/api/crm/leads/route.ts` — query de match reescrita: telefone comparado pelos
   últimos 10 dígitos normalizados (só números, ignora `+55`/DDI/formatação) em vez de string
   exata; email continua tendo prioridade sobre telefone quando ambos batem;
   `match_method` gravado tanto no INSERT (lead novo) quanto no UPDATE (lead enriquecido).

**Bug de escaping pego ao testar ao vivo (não hipotético, corrigido na mesma rodada):** a 1ª
versão da query usava `'\D'` (uma barra) dentro do template string TypeScript — em JS,
`\D` dentro de uma string não é um escape reconhecido, então a barra é **descartada em
runtime**, e o Postgres recebia só `'D'` como padrão de regex (removeria a letra D do
telefone, não os não-dígitos) — silencioso, sem erro, resultado errado. Corrigido pra `\\D`
(a barra dupla em TS produz `\D` de verdade na string enviada ao Postgres). Só foi pego porque
testei a query de verdade contra o banco em vez de confiar na leitura do código.

**Testado ao vivo, ponta a ponta, via `POST /api/crm/leads` real** (tenant Marketing Digital,
dados de teste prefixados `TESTE MATCH ENGINE` e removidos depois, cascata confirmada — 0
linhas restantes): telefone com formatação diferente do mesmo número (`(81) 91234-5678` vs
`+5581912345678`) → **mesmo `lead_uuid`** nas 2 chamadas, `match_method='telefone'` (bug
original confirmado corrigido) · mesmo email com telefone totalmente diferente → mesmo
`lead_uuid`, `match_method='email'` (prioridade de email preservada) · telefone/email sem
nenhuma correspondência → novo `lead_uuid`, `match_method='novo'`. `npx tsc --noEmit`: 55
erros, mesma baseline pré-existente (nenhum novo).

**Pendências reais do plano de unificação, ainda não atacadas:** F2/F3 (CTA de formulário no
wizard), F5 (funil unificado/CPA-ROAS real), F6 (CRM agnóstico de domínio), F7 (matriz formal
dos 9 cenários de teste + degradação graciosa) — ver
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6.

---

## Última tarefa concluída

### Sessão 2026-07-20 (continuação) — D2: discriminador `tipo_cliente` em `public.clientes` ✅

**Contexto:** próximo item da lista de pendências reais do plano de unificação (D1/D3 já
implementados e commitados na mesma sessão, ver entrada abaixo). D2 resolve a sobrecarga
semântica de `public.clientes` (mistura cliente-da-agência PJ, comprador PJ e consumidor PF)
com um discriminador aditivo, sem tabela nova — decisão já tomada e documentada em
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §4/§9.2.

**Investigação antes de implementar:** conferidos os 10 registros reais — confirmado que
`origem_cadastro='Plataforma'` sempre corresponde a empresa-cliente-da-agência (tem
`segment_id`, é o que os seletores de cliente do módulo de Campanhas/Mensageria usam pra
`Campaign.client_id`) e `origem_cadastro='Publico'` sempre corresponde a pessoa física
auto-cadastrada (sem `segment_id`). Backfill do discriminador seguiu exatamente essa regra,
confirmada nos dados reais antes de escrever o UPDATE — não foi suposição.

**Implementado:**
1. `prisma/migration-2026-07-20-clientes-tipo-cliente.sql` — coluna `tipo_cliente VARCHAR(20)
   NOT NULL DEFAULT 'consumidor_pf'` + CHECK (`conta_gerenciada`/`comprador_pj`/`consumidor_pf`)
   + índice `(tenant_id, tipo_cliente)`. Aditiva — nenhuma das 7 FKs reais que apontam pra
   `clientes.uuid` foi tocada (confirmado via `information_schema` antes de migrar).
2. `src/lib/database/clientes.ts` — `Cliente`/`CreateClienteData`/`UpdateClienteData`/
   `ClienteFilters` ganham `tipo_cliente`; `createCliente` deriva o tipo de `origem_cadastro`
   quando não informado explicitamente (mesma regra do backfill).
3. `src/app/api/admin/clientes/route.ts` (GET filtro + POST sempre cria `conta_gerenciada`,
   já que este formulário é exclusivamente pra cadastro de cliente-da-agência) e `[id]/route.ts`
   (PUT aceita `tipo_cliente`) atualizados.
4. **UI — 4 páginas de `src/app/admin/clientes/`:** lista (badge colorido + filtro dropdown);
   `novo` (banner informativo — este formulário sempre cria conta gerenciada, não é seletor,
   já que consumidor PF nasce do fluxo público de leads, não daqui); `[id]/editar` (seletor
   editável, com nota de que só "Conta Gerenciada" aparece nos seletores de Campanhas/
   Mensageria e ganha a aba "Config. Meta" — aba escondida quando o tipo não é esse);
   `[id]` detalhe (badge de tipo + mesma condicional na aba "Configurações Meta").
5. **`src/app/api/admin/campanhas/clients/route.ts`** — `WHERE tipo_cliente = 'conta_gerenciada'`
   adicionado. Confirmado (grep) que este é o ÚNICO endpoint por trás do componente
   `ClientSelector.tsx` compartilhado por todo o módulo de Campanhas E também consumido por
   `mensageria/config/page.tsx` — um fix cobre os dois módulos.

**Testado via API real (JWT com userId real, tenant Marketing Digital):**
`GET /api/admin/campanhas/clients` retorna só os 7 clientes reais deste tenant, todos
`conta_gerenciada` (nenhum dos 2 `consumidor_pf` do outro tenant vazou, e nenhum apareceria
mesmo que estivesse no mesmo tenant) · `GET /api/admin/clientes` retorna `tipo_cliente`
correto em cada linha. `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (nenhum novo
nos 9 arquivos tocados — o único erro que toca `clientes.ts` é o default `{}` de
`ClienteFilters` em `findClientesPaginated`, que já existia antes desta sessão).

**Verificação visual no navegador NÃO foi possível** — mesma limitação de sempre já registrada
dezenas de vezes neste projeto (cookie+JWT válido, inclusive com `userId` real desta vez, ainda
assim `useAuth`/`/me` client-side redireciona pra `/admin/login` em navegação completa).
Confiança na renderização correta vem da API real batendo exatamente com o que os componentes
consomem + revisão de código dos 4 JSX tocados.

**Pendências reais do plano de unificação, ainda não atacadas:** F2-F7 do plano de migração
(funis "várias visões", plano de testes rigoroso das 7 combinações de módulos contratados,
Match Engine, CRM agnóstico de domínio) — ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6.

---

## Última tarefa concluída

### Sessão 2026-07-20 — Unificação de leads: tabela "Lead" → CtaInteraction (D1/D3) ✅

**Contexto:** ao investigar por que "Onde está o Dinheiro?" mostrava R$ 0,00 pra uma campanha real
do Google (fix anterior desta mesma sessão, commit `d6f2fd8`), o usuário levantou uma questão
arquitetural maior: Campanhas e CRM liam "lead" de tabelas completamente diferentes e
desconectadas, quebrando a exigência de "única fonte da verdade" entre módulos que, apesar de
integrados, são **comercializados separadamente** (um tenant pode contratar só Campanhas, sem
CRM nem Mensageria). Isso motivou uma investigação profunda seguida de um documento estratégico
completo: `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` (v1.1, commits `e3d7654`/`33c9b73`), com
4 decisões (D1-D4) e um plano de migração de 7 fases (F0-F7) + plano de testes rigoroso cobrindo
as 7 combinações de contratação dos 3 módulos.

**Descoberta central durante a implementação:** existiam DOIS sistemas paralelos e desconectados
de atribuição de clique/lead — Sistema A (campanhas lançadas pelo próprio wizard desta
plataforma, via `Ad.trackingId` + `/api/r/[trackingId]`, gravando na tabela `Lead` sem atribuição
real na resposta do WhatsApp) e Sistema B (campanhas geridas externamente no Meta Ads Manager,
via mecanismo de CTA em `/admin/campanhas/mecanismos` → `CtaDestination`/`CtaInteraction`/
`CtaSubmission`, que **já funcionava ponta a ponta** via tag `[ref:slug]` reconhecida no webhook
da Evolution, mas sem `Campaign.id` real, só `utm_campaign` em texto livre). `resolveCtaRef`
(`src/lib/cta/service.ts`) unifica os dois: tenta `Ad.trackingId` primeiro (atribuição mais rica),
cai para `CtaDestination.slug` depois.

**Requisito explícito do usuário incorporado durante a implementação:** a API do WhatsApp
(Evolution, hoje) deve ficar desacoplada da lógica de negócio, pra permitir trocar por outro
provider (ex.: API oficial do Meta) no futuro sem duplicar código. Resolvido extraindo
`src/lib/whatsapp/inboundProcessor.ts` (`processInboundWhatsAppMessage`, agnóstico de provider) —
`evolution/webhook/route.ts` virou um adaptador fino (só autentica + normaliza o payload
específico da Evolution), no mesmo padrão já usado pra redes de anúncio
(`AdNetworkService`/`buildNetworkService`).

**Implementado (D1 — migração `Lead` → `CtaInteraction`; D3 — atribuição desacoplada):**
1. `prisma/migration-2026-07-20-marketing-eventos-campaign-id.sql` — `marketing_eventos` ganha
   `campaign_id TEXT` real (antes só `utm_campaign` texto livre).
2. `resolveCtaRef` (novo, `cta/service.ts`) — bridge entre os 2 sistemas de atribuição.
3. `src/lib/whatsapp/inboundProcessor.ts` (novo) — lógica de negócio do WhatsApp entrante
   (atribuição + lead no CRM + ingestão na Mensageria) extraída, agnóstica de provider.
4. `evolution/webhook/route.ts` reescrito como adaptador fino.
5. `/api/r/[trackingId]/route.ts` reescrito: grava clique como `CtaInteraction` (WHATSAPP_CLICK)
   e embute `[ref:{trackingId}]` na mensagem de WhatsApp — fecha o loop clique → resposta → lead.
6. `/api/crm/leads` passa a aceitar e persistir `campaign_id` real em `marketing_eventos`.
7. Prisma schema (`schema.marketing.prisma`): model `CtaInteraction` adicionado, model `Lead`
   removido. `npx prisma generate` limpo.
8. **~15 pontos de leitura migrados** de `Lead` para `CtaInteraction` (dashboards full/funnel/
   predictions/segment/campaign-map, portfolio + cross-insights, `aiInsights.ts`,
   `trackingHealthService.ts`, `wastedSpendService.ts`, `strategicBriefing.ts`,
   `auditReportService.ts`, `segmentIntelligenceService.ts`, iniciativas + briefing) — todos
   filtrando `eventType = 'WHATSAPP_CLICK'` pra preservar a semântica original de "1 lead = 1
   clique com interesse real" (a filosofia do usuário: "houve interesse — trabalhem agora pra
   transformar isso em vendas"), já que `CtaInteraction` agora também guarda eventos `SUBMIT`/
   `VIEW`/`REDIRECT` que não devem ser contados como leads nos dashboards de Campanhas.

**Testado ponta a ponta, com dados reais (não hipotético):** clique real em `trackingId` de teste
existente (`demo-track-001`, campanha "Alto Padrão — Alphaville") → `CtaInteraction`
(WHATSAPP_CLICK) gravado com `campaign_id`/`ad_id` corretos · redirect real pro WhatsApp confirma
`[ref:demo-track-001]` embutido na mensagem · webhook da Evolution simulado com essa mesma tag →
`CtaInteraction` (SUBMIT) + `CtaSubmission` linkado ao lead → lead real criado em
`leads_staging`/`marketing_eventos` com `campaign_id` real e `utm_campaign` = nome real da
campanha (não mais texto solto) · contato da Mensageria linkado ao `lead_uuid` corretamente ·
dados de teste desta verificação removidos depois. `npx tsc --noEmit`: 55 erros, mesma baseline
pré-existente (nenhum novo nos 22 arquivos tocados). Commit `dd1c0da`.

**Pendências reais, não atacadas nesta sessão (ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md`):**
- D2 (discriminador na tabela `clientes` pra distinguir conta_gerenciada/comprador_pj/
  consumidor_pf) — decidido, não implementado.
- Fases F2-F7 do plano de migração (funis "várias visões", plano de testes rigoroso das 7
  combinações de módulos contratados, etc.) — pendentes.
- Placeholder `'sua_chave_aqui'` em `tenants.anthropic_api_key` (registrado como pendência há
  duas sessões) — ainda não limpo.

---

### Sessão 2026-07-19 (continuação 5) — Bot de mensageria não respondia nada — 4 bugs reais ✅

**Sintoma reportado:** `/mensageria/config` → aba Bot, "boa noite"/"boa tarde" sempre devolviam
o fallback genérico "Desculpe, tive um problema para processar sua mensagem agora". Investigação
achou uma cadeia de 4 bugs reais e independentes — cada um mascarando o próximo, só visíveis um de
cada vez conforme o anterior era corrigido:

1. **`botAdapter.ts` chamava `getLlmClientForCampaigns()` (config GLOBAL da plataforma) em vez de
   `getLlmClient(tenantId)` (config do TENANT)** — o bot de mensageria é por-tenant (cada empresa
   escolhe provider/modelo em Configurações → IA), mas ignorava essa escolha e sempre caía no
   Groq global. Corrigido o import e o call site.
2. **Modelo Groq global (`meta-llama/llama-4-scout-17b-16e-instruct`) foi removido pela Groq** —
   confirmado via `GET /v1/models` da própria conta (não aparece mais na lista). Atualizado pra
   `llama-3.3-70b-versatile` (disponível, confirmado). Afeta também os motores de campanha
   (`getLlmClientForCampaigns`, que usa a MESMA linha global da tabela `Settings`).
3. **`gemini-2.0-flash` (modelo configurado pra este tenant) tem cota ZERO** nesta API key —
   confirmado via curl direto na API do Google (`429 RESOURCE_EXHAUSTED`, `limit: 0`). Trocado
   pra `gemini-flash-latest` (mesma chave, testado real, 200 OK).
4. **Bug real, mais sério, achado depois — `getLlmClient()` sempre usava o valor placeholder da
   migração/seed (`tenants.anthropic_api_key = 'sua_chave_aqui'`, presente em TODOS os 4 tenants)
   em vez da chave real configurada em `Settings.llmApiKey`** — a ordem antiga lia o campo legado
   primeiro e só usava a chave real do provider escolhido (`cfg.llmApiKey`) se esse campo
   estivesse vazio; como o placeholder nunca é vazio, a API real (Gemini, no caso) sempre recebia
   `"sua_chave_aqui"` como Bearer token e rejeitava com "Please pass a valid API key". Esse bug
   afeta **qualquer tenant configurado com provider ≠ anthropic** — reordenado pra usar sempre a
   config do tenant primeiro; o campo legado só é lido como fallback quando o provider realmente É
   anthropic E não placeholder.
5. **Bug de infraestrutura, achado por último — o pacote npm `openai` retorna `400 status code
   (no body)` de forma reproduzível quando roda dentro do runtime RSC/webpack do Next.js contra o
   shim OpenAI-compat do Gemini** — isolado com certeza: o MESMO request via `fetch()` nativo, no
   MESMO processo do dev server, sempre funciona; via SDK `openai`, sempre falha (testado repetido,
   inclusive depois de restart completo do servidor — não é conexão persa/keep-alive). Substituído
   `makeOpenAICompatibleClient()` inteiro pra usar `fetch()` cru em vez do SDK — `postChatCompletion()`
   novo em `llmClient.ts`. Sem perda de funcionalidade (só usávamos `chat.completions.create`, sem
   streaming/upload).
6. **Último bug, só visível depois do #5 corrigido — Gemini exige o campo
   `extra_content.google.thought_signature` de volta em cada `functionCall` echoado no histórico**
   (multi-turno de tool-use) — sem isso, rejeita com 400 "missing thought_signature". `LlmToolCall`
   ganhou campo opaco `providerExtra?: unknown`; capturado do `tc.extra_content` na resposta e
   reenviado no próximo turno. Outros providers (Groq etc.) não têm esse campo — passthrough
   condicional, zero efeito neles.

**Testado ao vivo, ponta a ponta, via `/mensageria/config` → Bot → "Testar conversa com o bot"**
(tenant Marketing Digital): "boa noite" → resposta correta em português · pergunta com tool-use
real ("tem apartamento em Imbiribeira?") → chamou `buscar_imovel`, resposta coerente
("Não encontrei nenhum apartamento... ") — confirmado via SQL que este tenant tem **0** imóveis
cadastrados, então a resposta é honesta, não um bug. `npx tsc --noEmit` limpo nos 3 arquivos
tocados (`llmClient.ts`, `botAdapter.ts` só o import, `Settings`/`tenants` via SQL direto).

**Arquivos tocados:** `src/lib/marketing/services/llmClient.ts` (reescrita de
`makeOpenAICompatibleClient` + fix de ordem em `getLlmClient`), `src/lib/mensageria/botAdapter.ts`
(1 linha — import/call site do client certo). SQL direto (não migração versionada — são valores de
config, não schema): `Settings.llmModel` do tenant Marketing Digital e da linha global corrigidos.

**Pendência:** o placeholder `'sua_chave_aqui'` continua presente nos 4 tenants em
`tenants.anthropic_api_key` — inofensivo agora que `getLlmClient()` o ignora explicitamente, mas
vale limpar/nulificar numa próxima sessão pra não confundir leitura direta do banco.

---

## Tarefa em andamento

### Consolidação — fim da colaboração multi-agente, merge de tudo em net-imobiliaria (2026-07-19)

**Decisão do usuário:** abandonar a colaboração paralela com o Antigravity e passar a trabalhar
sempre a partir do diretório principal (`net-imobiliaria`), unificando as duas frentes que
estavam em worktrees isolados.

**1. Limpeza do diretório principal** — as 39 mudanças não commitadas do Antigravity que ainda
estavam soltas em `net-imobiliaria` foram removidas (`git checkout -- .` + `git clean -fd`),
**só depois de verificar item a item** que todas (exceto 1 migração deliberadamente descartada,
já documentada) estavam commitadas e corrigidas no worktree `netimob-google`.

**2. Merge do Google Ads** — `feature/google-ads-implementation` mergeado em
`feature/ag-cockpit-camadas` (branch atual de `net-imobiliaria`). **Zero conflitos** — as duas
branches tinham divergido em conjuntos de arquivos completamente disjuntos (uma só mexeu em
`CLAUDE.md`/`docs/AI_SYNC.md`/`docs/CHECKPOINT.md`, a outra só em código). `npx tsc --noEmit`
confirmado limpo depois (65 linhas = mesma baseline de sempre, nada novo).

**3. Mensageria RAG já estava dentro** — `feature/mensageria-rag` já era ancestral de
`feature/ag-cockpit-camadas` (merges anteriores já tinham trazido o código pra lá) — confirmado
via `git merge-base --is-ancestor`, nenhuma ação necessária.

**4. CLAUDE.md atualizado** — seção "Coordenação com outros agentes de IA" substituída por
"Múltiplas Frentes em Paralelo": mantém a disciplina de checar `git branch`/`git status`/
`git worktree list` no início de sessão (ainda útil — o projeto segue com múltiplos worktrees
em paralelo), mas sem mais coordenação com outro agente. `docs/AI_SYNC.md` marcado como
histórico/encerrado.

**5. Dados de teste PERSISTENTES criados** (diferente de rodadas anteriores — **não** foram
removidos depois, ficam no banco pra você testar à vontade):
- **Google Ads:** campanha real `google-test-imoveis-sp-001` ("Google Search — Apartamentos SP"),
  14 dias de `Insight` (ROAS 3.35x, IS Lost Budget médio 26.4% — dispara a regra
  IMPRESSION_SHARE_OPPORTUNITY), 42 `Lead`s, 6 `GoogleSearchTerm` (3 com conversão, 3 sem —
  candidatos reais de negativação). Script salvo em `prisma/seed-demo-google-ads.sql`
  (idempotente, `ON CONFLICT DO NOTHING` — pode rodar de novo sem duplicar).
- **Mensageria RAG:** 2 documentos reais criados via API (embeddings reais do Gemini, não
  fabricados) no tenant Marketing Digital — "Financiamento Imobiliário — Condições" (5 trechos)
  e "Agendamento de Visitas e Política de Reserva" (4 trechos). Visíveis em `/mensageria/config`
  → aba "Base de Conhecimento", e o bot já responde perguntas relacionadas (bot_flow ativo
  nesse tenant).

**Testado ao vivo, ponta a ponta, no servidor real do usuário (porta 3000, não um worktree
isolado):** dev server reiniciado (Prisma Client mudou com o merge) · dashboard → segmento
Imobiliário → aba "GOOGLE ADS" aparece e mostra ROAS 3.35x / IS Lost 26.39% reais · tabela de
Search Terms populada, botão "Negativar" presente · KPIs da Visão Executiva (Gasto Total, CPL
Médio) já mostram breakdown Meta × Google combinado · `/mensageria/config` → Base de Conhecimento
mostra os 2 documentos com contagem de trechos correta.

**Próximos passos reais:** Developer Token Google Ads API ainda não solicitado (nada testado
contra a API real do Google) · Mensageria RAG: Fase 6 (testes de qualidade com mais documentos)
e Fase 7 (deploy VPS — pgvector na imagem de produção) seguem pendentes.

---

### Plano Google Ads + TikTok — FASE 1/A2 implementada em worktree isolado (2026-07-19, histórico)

### Plano Google Ads + TikTok — FASE 1/A2 implementada em worktree isolado (2026-07-19)

**Branch/worktree:** `feature/google-ads-implementation`, em `C:\NetImobiliária\netimob-google`
(worktree separado — **não** o diretório principal `net-imobiliaria`, que segue com o Antigravity
trabalhando em `feature/ag-cockpit-camadas`, intocado).

**Como o trabalho do Antigravity foi herdado (sem interferir nele):** todo o estado dele em
`feature/ag-cockpit-camadas` — commitado + modificações/arquivos novos não commitados (39
mudanças) — foi "puxado" via `git diff`+`git apply` (arquivos rastreados) e cópia direta
(arquivos novos) para dentro do worktree isolado. O diretório original dele ficou
byte-a-byte intacto (confirmado via `git status` antes/depois).

**Auditoria encontrou 2 conflitos arquiteturais, resolvidos com o usuário** (detalhes completos
em `docs/PLANO_GOOGLE_TIKTOK.md`, seção "Auditoria + Decisões de Arquitetura"):
1. **Identificador de rede:** decidido reusar `ad_networks` + `Campaign.network_id` (infra
   madura já existente) em vez da coluna nova `ad_network` que o Antigravity tinha criado mas
   nunca usava em lugar nenhum do código. **Bug de brinde corrigido:** `network_id` nunca era
   setado na criação de campanha — as 24 campanhas existentes tinham todas `NULL`, quebrando
   silenciosamente a agregação "Distribuição por Rede" do dashboard.
2. **Credenciais Google:** decidido consolidar em `public.tenant_network_credentials` (mesma
   tabela genérica já usada pelo Meta) em vez da tabela dedicada `GoogleAdsConfig` que ele
   tinha modelado no Prisma mas nunca migrado no banco (quebraria em runtime).

**Implementado nesta sessão (tudo com `npx tsc --noEmit` e `npx prisma generate` limpos):**
- Schema drift corrigido: `Campaign.networkId`/`externalId` existiam no banco sem estar
  mapeados no Prisma (por isso o código evitava usá-los, com raw SQL) — agora mapeados.
- `factory.ts`, `configuracoes/google-ads/route.ts`, `campanhas/google/route.ts` reescritos
  para usar `tenant_network_credentials` + `network_id` (nada de tabela/coluna dedicada).
- `admin/configuracoes/google-ads/page.tsx` reescrita — usava componentes shadcn/ui
  (`@/components/ui/card` etc.) que não existem neste projeto; agora Tailwind puro no mesmo
  padrão visual da aba "Identidade Meta" já existente.
- **A2 do plano aplicada no banco:** 4 colunas novas em `Insight` (search_impression_share,
  search_budget_lost_is, search_rank_lost_is, conversions_value) + 2 tabelas novas
  (`GoogleSearchTerm`, `GoogleNegativeKeyword`) — migração
  `prisma/migration-2026-07-19-google-ads-a2.sql`.
- **A3 parcial:** `GoogleAdsAdapter.fetchInsights` agora busca Impression Share/ROAS reais da
  Google Ads API (antes eram campos mockados); `agentMonitor.ts` persiste os 4 campos novos.

**Sessão 2026-07-19 (continuação) — A3 a A7 implementadas, mesmo worktree/branch:**

- **A3 completa** — `GoogleAdsAdapter.createCampaign` agora cria Asset Group real (Assets de
  texto + imagem via `customer.assets.create`, vinculados via `AssetGroupAsset` com
  `field_type` correto) em vez do stub anterior que pulava essa etapa. `uploadCreative` faz
  upload real de imagem (antes mock). Novo método `addNegativeKeyword` (Google-only). Novo
  método `fetchSearchTerms` (GAQL `search_term_view`). **Bug real corrigido:** a extração de
  `resource_name` da resposta da API usava `(result as any)[0].id` — a resposta real só tem
  `.results[0].resource_name`, então toda a cadeia budget→campanha→asset group dependia de um
  valor sempre `undefined`.
- **A4 completa** — `collectGoogleSearchTerms()` em `agentMonitor.ts`, disparado só para
  campanhas Google dentro do mesmo loop de `syncMetrics`, grava em `GoogleSearchTerm` sem
  nunca resetar o status de um termo já tratado numa rodada anterior.
- **A5 completa** — `network_defaults.google` em 3 segmentos (Imobiliário, Carros, Geral):
  `campaign_types`, `bidding_strategy`, limites de headline/description, `negative_seed_terms`,
  `impression_share_target`, `negation_spend_threshold_pct`. Zero código por vertical.
- **A6 completa** — `googleNegationService.ts` (novo): lê `GoogleSearchTerm`, agrega por termo,
  propõe negativo quando gasto > X% do total da campanha sem conversão (X do segmento via A5).
  Nova ação `ADD_NEGATIVE_KEYWORD` (defensiva, auto-executa) + nova regra
  `IMPRESSION_SHARE_OPPORTUNITY` (SCALE quando IS Lost Budget alto + CPL já bom) em
  `aiInsights.ts`, com benchmark `is_lost_budget_scale_min` no mesmo padrão de 4 camadas já
  usado por `cpl_ideal`/`hook_rate_*`. **Bug real corrigido em `executeAction()`:** usava
  `campaign.networkCode`/`external_id` — campos que **nunca existiram** (schema real é
  `networkId`/`externalId` camelCase) — toda campanha, Google inclusive, caía silenciosamente
  no fallback `'meta'` ao pausar/reduzir budget/etc. Cron `/api/cron/campanhas/sync` agora
  dispara `runNegationAgent()` por tenant.
- **A7 parcial** — `dashboard/full/route.ts`: `leadsByNetwork` agrupa por código de rede (join
  `ad_networks`), não pelo UUID cru. **Bug real corrigido:** `calcTotals().spendByNetwork` usava
  `i.adNetwork` — campo que nunca existiu em `Insight` — sempre produzia `{undefined: total}`.
  Novo `cplByNetwork` no response (CPL Meta × Google lado a lado). Card "CPL Médio" no
  `CommandCenterView.tsx` ganha breakdown por rede (mesmo padrão visual dos cards de
  Gasto/Leads, só quando há ≥2 redes com dado real — sem empilhar card novo).

**Verificado:** `npx tsc --noEmit` limpo em todos os arquivos tocados (62 erros = mesma
baseline pré-existente, nada novo) · `npx prisma generate` limpo em ambos os commits desta
sessão.

**Sessão 2026-07-19 (continuação 2) — wizard com imagens reais + drill-down de Search Terms:**

- **Wizard do Google usa imagens reais** — `GoogleAiMaxWizard.tsx` mandava `images: []`
  hardcoded (comentário "mock for now" do próprio Antigravity), ignorando o que o usuário
  selecionava na Fase 1 da página `/nova`. Corrigido: `selectedImages` (mesmo tipo `Creative`
  do wizard Meta) passado de `nova/page.tsx`, preview de thumbnails + aviso quando 0 imagens
  + botão "Lançar" desabilitado nesse caso (Performance Max exige ≥1 imagem por Asset Group).
  **Nota:** `img.path` é um blob URL — mesma limitação pré-existente e compartilhada com o
  wizard Meta (não é regressão nova), documentada como "Opção A pendente" há várias sessões.
- **Drill-down de Search Terms na UI** — nova aba "Google Ads" no dashboard (só aparece
  quando há dado real de rede Google): cards de ROAS + IS Lost (Budget) por campanha, e
  tabela de termos pendentes de revisão com botão "Negativar" manual (complementa o agente
  automático da A6). Novo módulo `googleNegationCore.ts` — extrai a mecânica real de
  negativar (chamada API + memória) pra um lugar único, evitando import circular entre
  `agentDecisor.ts` e `googleNegationService.ts` (ambos agora chamam o mesmo helper).

**2 bugs reais encontrados testando ao vivo no navegador (nenhum pego pelo `tsc`):**
1. Query de resumo (ROAS/IS Lost) usava `"tenantId"` (camelCase) numa coluna do `Insight`
   que na verdade é `tenant_id` (snake_case) — erro Postgres 42703, só aparece em runtime.
2. O bloco JSX da aba "Google Ads" ficou, por engano, **aninhado dentro** do bloco
   condicional `{activeLayer === 'DEEP_DIVE' && (...)}` — nunca renderizava quando a aba
   selecionada era `'GOOGLE'` (mutuamente exclusivo com `'DEEP_DIVE'`). JSX sintaticamente
   válido, então o `tsc` não acusa nada — só descoberto clicando na aba de verdade e vendo
   que nada acontecia.

**Ajuste de UX:** o erro do negativar usava `alert()` nativo — trocado por banner inline
(mesmo padrão de erro já usado no projeto), tanto por consistência quanto porque o dialog
nativo travava a automação de teste do navegador usada nesta sessão.

**Testado ao vivo, ponta a ponta** (servidor dev dedicado porta 3071, dados de teste
temporários inseridos e removidos depois): wizard do Google com 0 imagens → aviso + botão
desabilitado confirmado via DOM · com 1 imagem real (injetada via `DataTransfer`, sem
precisar do picker nativo de pasta) → thumbnail renderiza, botão habilitado · aba "Google
Ads" aparece só com campanha Google real · cards ROAS 3.00x / IS Lost 25.00% corretos ·
tabela com 2 termos de teste, cores corretas (conversões=0 em vermelho) · clique em
"Negativar" → chamada real, falha corretamente (sem credenciais Google no tenant de teste),
erro mostrado em banner inline sem travar a página nem remover a linha.

**Pendente (próxima sessão): Developer Token Google Ads API ainda não solicitado** —
nenhum fluxo foi testado contra a API real do Google (só via a lib `google-ads-api`/
`google-ads-node`, revisão de código e os testes de UI/banco acima). É o item que trava
testar `createCampaign`/`addNegativeKeyword`/`fetchInsights` reais.

---

### M4.3 — RAG / Base de Conhecimento (branch `feature/mensageria-rag`, worktree `netimob-cherrypick`)

Plano completo discutido e travado com o usuário (`docs/PLANO_MENSAGERIA.md` §14.6-B). Decisões:
pgvector (não banco vetorial dedicado) · chunking estrutural por cabeçalho + retrieval contextual
· busca híbrida (vetor + full-text) · KB = mais uma ferramenta do bot (`buscar_conhecimento`) ·
markdown como fonte-da-verdade + import de PDF/DOCX · embedding via API barata
(`text-embedding-3-small`) · UI editável pelo **admin do tenant** (não Master), com o tenant
editando a KB dele E a dos clientes sob seu guarda-chuva · escopo tenant/cliente forçado no servidor.

**Fases:** 0 infra pgvector ✅ · 1 schema ✅ · 2 embedding (factory+Settings) ✅ · 3 ingestão
(markdown→chunk→embed) ✅ (PDF/DOCX import fica pra depois) · 4 recuperação híbrida + ferramenta ✅
· 5 UI (admin do tenant gerenciar a KB) · 6 testes de carga/qualidade · 7 deploy VPS.

- **Fase 0 ✅** — pgvector 0.8.0. Escolhido **build próprio sobre alpine** (`docker/postgres/
  Dockerfile`, `with_llvm=no`) em vez da imagem oficial Debian, pra evitar o gotcha de collation
  musl→glibc (que exigiria REINDEX). Container `netimobiliaria-db` recriado reusando o volume
  `net-imobiliaria_db_data` (dados intactos: 37 imóveis confirmados). `docker-compose.yml` da
  branch atualizado pra buildar do Dockerfile. **Pendência VPS:** aplicar o mesmo em
  `docker-compose.vps.yml` + `deploy.sh` (Fase 7).
- **Fase 1 ✅** — `prisma/migration-2026-07-16-mensageria-rag.sql` aplicada: `knowledge_documents`
  (fonte editável) + `knowledge_chunks` (tsv gerado 'portuguese' + índices HNSW/GIN/escopo).
  Smoke test de distância cosseno OK. **Ajuste nesta rodada:** usuário escolheu **Gemini** como
  provider de embedding (não `text-embedding-3-small` da OpenAI, cogitado no plano original) — a
  tabela ainda estava vazia (zero chunks), então a coluna `embedding` foi corrigida direto pra
  `vector(768)` (dim do Gemini) via `ALTER COLUMN` + o comentário do SQL atualizado, sem migração
  de dado nenhuma.
- **Fase 2 ✅** — `embedText(text, tenantId?)` em `llmClient.ts`. **Bug real pego ao vivo, não
  hipotético:** a 1ª tentativa usou `text-embedding-004` via endpoint OpenAI-compatible do
  Gemini (mesmo baseURL já usado pro chat) — 404 real (`ListModels` da conta confirmou que esse
  modelo não existe mais pra essa API key; só `gemini-embedding-001`/`-2-preview`/`-2` disponíveis).
  Corrigido pra `gemini-embedding-001` via **REST nativo** do Gemini (não o layer OpenAI-compat —
  ele não expõe `outputDimensionality`), com `outputDimensionality: 768` (truncamento Matryoshka
  nativo do modelo, não um corte cru do vetor) — confirmado ao vivo via curl direto na API do
  Google que retorna exatamente 768 valores reais. Cascata de chave: Settings do tenant com
  `llmProvider='gemini'` → `GEMINI_API_KEY` do `.env` (fallback global) — embedding é uma escolha
  técnica de infra, deliberadamente independente do provider de CHAT configurado por tenant (que
  hoje é Groq pra maioria).
- **Fase 3 ✅ (markdown; PDF/DOCX pendente)** — `src/lib/mensageria/tools/knowledgeBase.ts`:
  `chunkMarkdown()` quebra por heading (# a ######, pilha de níveis, `heading_path` tipo
  "Vendas > Financiamento") + teto de 1200 chars por chunk (split por parágrafo, sem cortar
  palavra no meio); `regenerateChunks(documentId)` apaga+re-gera+re-embeda tudo numa transação,
  chamado a cada save do documento (POST/PUT). API `src/app/api/admin/mensageria/knowledge/
  route.ts` + `[id]/route.ts` (CRUD, mesmo padrão de auth/estilo de `labels/route.ts`).
- **Fase 4 ✅** — `searchKnowledge()`: busca híbrida (`1 - cosine_distance` peso 0.7 +
  `ts_rank` peso 0.3, capado em 1), escopo tenant+cliente forçado no SQL (`client_id IS NULL OR
  client_id = $clientId` — herança tenant→cliente igual inboxes/bot_flows; `$clientId` nulo já
  restringe sozinho a só docs tenant-wide via semântica de NULL do SQL, sem caso especial).
  `hasKnowledgeBase()` faz a ferramenta `buscar_conhecimento` só aparecer pro LLM quando o
  tenant/cliente TEM pelo menos 1 documento ativo (mesmo princípio das ferramentas de dados
  estruturados — nunca oferecer ferramenta sempre vazia). Ramo próprio no loop de tool-use do
  `botAdapter.ts` (não mexe no fluxo de linhas/fotos/paginação das outras ferramentas), com aviso
  explícito nos dados pro LLM nunca completar com conhecimento geral quando o trecho não cobrir a
  pergunta exatamente.

**Testado ao vivo, ponta a ponta** (tenant Marketing Digital, servidor dev do próprio worktree em
`:3051` — não o `:3002`/App principal, que monta o código do OUTRO agente na `net-imobiliaria`):
documento real "Política de Garantia" (90 dias + como acionar) → 2 chunks reais gerados, 768 dims
confirmadas via `vector_dims()` no Postgres · pergunta que a KB cobre ("vocês dão garantia... como
funciona?") → bot respondeu citando os 90 dias e o fluxo de acionamento exatamente como cadastrado
· pergunta que a KB NÃO cobre ("reembolso em até 30 dias?") → bot recusou honestamente
("não tenho certeza... falar com um atendente"), sem inventar uma política · dado de teste
removido depois (`DELETE`, cascata de chunks confirmada por `COUNT(*) = 0`) · `npx tsc --noEmit`
limpo em todos os arquivos tocados (erros remanescentes são baseline pré-existente, não relacionados).

**Achado operacional (multi-agente):** `preview_start` com config nomeada do `.claude/launch.json`
resolve relativo ao diretório principal da sessão (`net-imobiliaria`), não ao worktree onde estou
trabalhando — mesmo apontando pro `launch.json` certo, o servidor que sobe roda o código do OUTRO
agente (confirmado por um erro de stack trace apontando pra `net-imobiliaria\.next\...`). Pra
testar código deste worktree, é preciso subir o `next dev` manualmente nele, numa porta dedicada
(usei 3051, já que 3050 também está reservado no `launch.json` local e pode colidir).

**Fase 5 ✅ (UI de gestão da KB)** — nova aba **"Base de Conhecimento"** em `/mensageria/config`
(mesmo padrão de abas já usado por Inboxes/Times/Etiquetas/SLA/Bot — **não** virou rota própria
`/mensageria/config/conhecimento` do plano original de 2026-07-08; esse desenho já tinha sido
abandonado na prática quando "Chatbot" virou a aba "Bot" em vez de feature/rota separada, então
"Base de Conhecimento" seguiu o padrão real, não o documento desatualizado). CRUD completo:
criar/editar/ativar-desativar/excluir documento, textarea em markdown monoespaçado, combobox de
cliente com busca debounced (reaproveita `/clientes-search`, mesmo endpoint do combobox de Nova
Conversa Manual) — vazio = vale pra todos os clientes do tenant. Lista mostra nº de trechos
(chunks) e status ativo/inativo por documento. Nota na aba Bot aponta pra esta aba (persona fica
no Editor de Prompts, regras/FAQ ficam aqui).

**2 bugs reais pegos testando a API por trás da UI (não achados por inspeção, achados rodando de
verdade)** — nenhum dos dois tinha aparecido nos testes anteriores porque a sessão anterior só
testava via curl direto comparando com o schema já em `snake_case`, sem passar pelo contrato que o
componente React realmente espera:
1. `GET /knowledge` fazia `JOIN public.clientes c` selecionando `c.name` — coluna não existe
   (schema em português usa `c.nome`). Erro real (`42703`) confirmado no log do dev server ao
   testar a listagem pela primeira vez. Corrigido.
2. As 2 rotas (`GET /knowledge` e `GET /knowledge/[id]`) devolviam as linhas **cruas do Postgres**
   (`client_id`, `source_type`, `is_active` etc., snake_case) mas o componente React (seguindo a
   convenção já usada em `inboxes/route.ts`) espera `camelCase` (`clientId`, `sourceType`,
   `isActive`) — sem o mapeamento explícito, a UI exibiria tudo como `undefined`. Corrigido nas
   duas rotas com mapeamento manual campo-a-campo, no mesmo padrão já usado por `inboxes/route.ts`
   (`id: r.id, channelType: r.channel_type, ...`). `chunkCount` também precisou de `Number(...)`
   — `count(*)` do Postgres volta como string via o driver `pg`.

**Testado via API completa (curl), ciclo inteiro:** criar documento sem cliente → listar (campos
certos, `clientName: null`) → buscar cliente real (`Alexandre Severo Soluções Tecnológicas`) →
editar vinculando `clientId` → listar de novo (`clientName` populado corretamente) → deletar →
cascata de chunks confirmada (`COUNT(*) = 0` nas duas tabelas). `npx tsc --noEmit` limpo em todos
os arquivos tocados (grep filtrado, zero ocorrências).

**Verificação visual no navegador NÃO foi possível nesta rodada** — mesma limitação já registrada
repetidamente neste projeto (ver sessões de 2026-07-09 a 2026-07-14 no histórico deste arquivo):
injetar um JWT fabricado localmente (cookie + localStorage) resolve pras rotas de API (que só
confiam no payload do token), mas a página client-side chama `/api/admin/auth/me`, que faz lookup
real do usuário no banco — um `userId` fabricado não existe, então a página redireciona pra
`/admin/login` mesmo com cookie+token "válidos" (assinatura correta, usuário inexistente).
Confirmado o redirecionamento real via `location.href` no navegador (`/admin/login?callbackUrl=
%2Fmensageria%2Fconfig`), não um bug — comportamento correto de segurança. Confiança na
renderização correta vem de: `tsc` limpo + API validada ponta a ponta com os MESMOS campos que o
componente consome + revisão de código da estrutura JSX (mesmos padrões visuais já usados e
aprovados nas outras 6 abas desta página).

**Achado operacional (registrado antes, reconfirmado):** durante esta sessão o classificador de
segurança do harness (Edit/Write/Bash) ficou intermitentemente indisponível por vários minutos
seguidos — não é um problema do projeto, é uma instabilidade da própria ferramenta. Contornado
esperando e tentando de novo (sem pular a revisão/teste por causa disso).

**Próximos passos:** Fase 6 testes de qualidade com mais documentos reais/variados · Fase 7 deploy
VPS (pgvector na imagem + `GEMINI_API_KEY` no ambiente de produção) · a branch ainda não virou PR
pra `main`.

---

### Sessão 2026-07-18 (continuação 2) — combobox de cliente + import PDF/DOCX + visualizador de trechos ✅

Pedido direto do usuário (2 itens da lista de pendências da rodada anterior).

**1. Combobox de cliente alfabético com filtro incremental** — trocado o campo de busca
debounced (mín. 2 letras, só top 8, via `/clientes-search`) por um combobox de verdade: carrega
a lista completa do tenant **uma vez** — `/api/admin/campanhas/clients?limit=200` já devolve
`ORDER BY nome ASC` — e filtra 100% no cliente conforme o usuário digita (sem round-trip por
letra). `onMouseDown` no lugar de `onClick` nas opções (dispara antes do `onBlur` do input, senão
o dropdown fecha antes do clique ser registrado).

**2. Import de PDF/DOCX** (Fase 3, item que tinha ficado de fora): `documentImport.ts`
(`extractMarkdownFromFile`) — PDF via `pdf-parse` (`PDFParse.getText()`, sem heading, degrada pra
chunking por parágrafo no `chunkMarkdown` já existente — mesmo código, sem branch especial);
DOCX via `mammoth.convertToHtml()` + conversão HTML→Markdown por regex (segura aqui porque a
entrada é SEMPRE a saída flat e previsível do mammoth, nunca HTML arbitrário) — preserva a
hierarquia real de Heading 1/2/3 do Word, alimentando o `heading_path` contextual do chunking.
Nova rota `POST /knowledge/import` (multipart/form-data) reaproveita o MESMO `regenerateChunks()`
de sempre; documento importado abre direto em modo de edição na UI (extração pode trazer ruído —
cabeçalho/rodapé repetido, numeração de página — revisão antes de confirmar "Salvar" é o desenho
certo, não um passo opcional).

**Bug real pego ao testar (não hipotético):** `pdf-parse`/`mammoth` funcionavam isolados via Node
puro, mas quebravam dentro da API route do Next com `"Object.defineProperty called on non-object"`
— erro genérico do webpack tentando empacotar o require dinâmico interno do pdf.js. Corrigido com
`experimental.serverComponentsExternalPackages: ['pdf-parse', 'mammoth']` no `next.config.js`
(trata como pacote externo, usa `require` nativo do Node em runtime — padrão conhecido pra libs
baseadas em pdf.js dentro do Next). **2º bug real:** `pdf-parse` insere um separador
`-- N of M --` entre páginas no texto extraído — vazava pro markdown como se fosse conteúdo real;
removido por regex antes do texto entrar no pipeline.

**3. Visualizador de trechos (chunks)** — nova rota `GET /knowledge/[id]/chunks` (só leitura,
nunca expõe o vetor de embedding) + botão de expandir (chevron) em cada linha da lista, mostrando
`heading_path` + `chunk_text` de cada trecho gerado — exatamente o que o bot recupera de verdade,
não só a contagem. Carregado sob demanda (1ª vez que expande), cacheado em memória depois.

**Testado ao vivo, ponta a ponta** (via curl multipart, servidor dedicado do worktree — não o
`:3000` compartilhado): PDF hand-crafted (estrutura válida, xref com offsets reais calculados) →
extraído texto real, "-- 1 of 1 --" limpo · DOCX real (fixture do próprio mammoth, lista
`<ul><li>`) → convertido corretamente pra `- Apple\n- Banana` · `GET .../chunks` retornou o chunk
gerado de cada import corretamente · dados de teste removidos depois, cascata confirmada
(`COUNT(*) = 0` em documents e chunks). `npx tsc --noEmit` limpo em todos os arquivos tocados.

**Dependências novas:** `pdf-parse@^2.4.5`, `mammoth@^1.12.0` (instaladas com
`--legacy-peer-deps`, mesma convenção já documentada no projeto por causa do `react-leaflet@5`).

**⚠️ Nota de persistência (dev):** o container roda agora com `netimob-postgres:17-pgvector` (setado
inline no recreate). Até esta branch mergear em `main`, um `docker compose up` do diretório
principal (branch do Antigravity, ainda com default `postgres:17-alpine`) reverteria a imagem —
setar `POSTGRES_IMAGE=netimob-postgres:17-pgvector` no `.env` do docker, ou não recriar o db sem
essa var, até o merge.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — Coordenação multi-agente + limpeza de sidebar ✅

**Descoberta durante a sessão:** outro agente de IA (Antigravity) está trabalhando em paralelo
neste mesmo repositório, numa branch própria (`feature/ag-cockpit-camadas`), refatorando o
dashboard de Campanhas. A branch ativa do diretório principal (`C:\NetImobiliária\net-
imobiliaria`) mudou de `main` pra essa branch sem eu ter feito isso deliberadamente — meu commit
de checkpoint do M4.4 acabou indo pra lá por engano.

**Corrigido com segurança, via `git worktree` isolado** (nunca tocando na branch/arquivos não
commitados do Antigravity):
1. Cherry-pick do meu commit de volta pra `main` (`d2b6de1`).
2. Código real do M4.4 movido pra uma branch nova, só minha: `feature/mensageria-webchat`
   (worktree em `C:\NetImobiliária\netimob-cherrypick`) — pronta pra virar PR.
3. `CLAUDE.md` ganhou uma nova regra obrigatória: ler `docs/AI_SYNC.md` no início de toda sessão,
   nunca trocar de branch/rodar operação destrutiva num diretório com trabalho não commitado de
   outro agente, preferir worktree separado. Aplicada em `main` (`c7cfd2f`) e localmente no
   diretório original (não commitada lá — push nessa branch foi bloqueado pelo verificador de
   segurança por ser branch de outro agente, decisão respeitada).
4. `docs/AI_SYNC.md` — registrado um novo log de atividade do Claude, avisando o Antigravity do
   que foi feito e confirmando que nenhum arquivo dele foi tocado.

**Limpeza de sidebar:** usuário notou 2 itens ("Chatbot", "Base de Conhecimento") cadastrados
desde a fase antiga de registro de acesso (antes do bot existir), ambos apontando pra URLs sem
página real (404). Investigado: "Chatbot" (`/mensageria/config/chatbot`) é puro duplicado — a
config real do bot já vive em "Configurações" → aba "Bot". "Base de Conhecimento"
(`/mensageria/config/conhecimento`) corresponde ao M4.3 (RAG), genuinamente não iniciado — não
mexido, só documentado como pendência real.

**Ação:** `system_features.is_active = false` pro id=113 (`mensageria-chatbot`) —
`prisma/migration-2026-07-15-mensageria-remove-chatbot-sidebar-duplicate.sql`. Desativado, não
deletado (reversível, mesmo padrão já usado em toda a plataforma pra esconder item da sidebar
sem apagar histórico/permissões associadas). Confirmado via SQL: `is_active=f`.

**Pendências reais do módulo Mensageria, levantadas nesta sessão:**
- M4.3 (RAG/Base de Conhecimento) — não iniciado.
- Merge de `feature/mensageria-webchat` em `main` (via PR) — código pronto, testado, só falta
  integrar oficialmente.
- Item "Base de Conhecimento" da sidebar continua apontando pra URL sem página — decisão de
  desativar ou construir fica pra quando M4.3 for atacado.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — M4.4: Widget de chat público na página de imóvel ✅

**Contexto:** próxima fase formal do plano (`docs/PLANO_MENSAGERIA.md` §18.1) depois de várias
sessões blindando o M4.2. Decisão inicial do usuário ("posicionar na landpaging") revelou um
conflito de arquitetura real: `/landpaging` agrega imóveis de TODOS os tenants do segmento, sem
nenhum parâmetro de escopo — colocar o bot lá misturaria a identidade de qual empresa está
respondendo. Resolvido com o usuário: widget vai na **página de detalhe de 1 imóvel**
(`/imoveis/[id]`), onde existe um tenant real e único pra escopar.

**Implementado (zero hardcode por segmento — o mesmo componente serviria qualquer vertical):**
1. `tenant_id` exposto na API de ficha completa (`/api/public/imoveis/[id]/ficha-completa`) —
   coluna já existia na tabela `imoveis`, só não era selecionada.
2. `resolveWebchatInbox(tenantId)` em `inboxes.ts` — clone do padrão já usado por
   `resolveWebformInbox` (cria a inbox lazy na 1ª mensagem real, `channel_type='webchat'`, já
   previsto no schema desde M0 mas nunca usado até agora).
3. Novo endpoint público **sem autenticação** `/api/public/mensageria/chat` (GET recarrega
   histórico, POST envia mensagem) — reaproveita 100% do pipeline existente
   (`ingestMessage`→`maybeRunBot`, mesmo mecanismo do WhatsApp/`/bot/test`). Identidade do
   visitante anônimo: UUID gerado no navegador (localStorage), usado como `phone: "web:<uuid>"`
   — zero mudança na regra de dedupe já existente em `ingest.ts`.
4. **Rate limit dedicado** (`webchatLimiter`, 15 msg/min por sessão E por IP,
   `src/lib/security/rate-limiter.ts`) — obrigatório aqui: é a única rota pública da plataforma
   que dispara uma chamada LLM real sem autenticação nenhuma, risco genuíno de custo/abuso.
5. Gate por `bot_flows.is_active` ANTES de criar qualquer contato/conversa — tenant sem bot
   configurado nunca aparece com o widget, sem gerar lixo no banco.
6. `ChatWidget.tsx` (`src/components/mensageria/ChatWidget.tsx`) — bolha flutuante + painel,
   parametrizada só por `tenantId` (+ `pageContext` opcional, ver abaixo). Embutida em
   `src/app/(with-header)/imoveis/[id]/page.tsx`.

**Bug real pego no teste ao vivo, corrigido na mesma rodada — contexto de página:** perguntado
"quanto custa esse imóvel?" na própria página do imóvel (preço bem visível na tela), o bot
respondeu que o preço "não foi especificado na pergunta" — ele não tinha nenhuma noção de qual
imóvel a conversa começou. Corrigido de forma genérica (não amarrado a "imóvel"):
- `describeEntityRowByIdentity(segmentId, tenantId, entityName, identityValue)` (novo,
  `genericResolver.ts`) — resolve 1 linha pela coluna de identidade e devolve um resumo em texto
  natural dos campos selecionáveis reais.
- `IngestMessageInput.botContext` (novo, `ingest.ts`) — hint textual só pra aquele turno, nunca
  vira mensagem visível na thread, repassado a `maybeRunBot`→`runBotReply`→apendado à persona.
- `ChatWidget` ganhou prop `pageContext={{ entity: 'imovel', id }}` — a página de detalhe passa
  isso, o backend resolve o registro real (preço, quartos, bairro etc.) a cada mensagem (nunca
  cacheado/obsoleto) e informa o bot que "esse"/"este" se refere a ESTE item específico.

**Testado ao vivo, no navegador de verdade** (não só via curl): bolha aparece na página real do
imóvel 1 (tenant Imobiliária XYZ, bot ativo) · mensagem enviada pelo painel → resposta do bot
renderizada em tempo real, sem login, sem cookie · rate limit testado com 17 mensagens rápidas —
15 passam (HTTP 200), 16ª e 17ª bloqueadas (HTTP 429) · inbox `webchat` criada corretamente no
banco · após o fix de contexto de página, "quanto custa esse imóvel?" respondeu corretamente
"R$ 906.000,00" (valor real da tela). `npx tsc --noEmit` limpo em todos os 8 arquivos tocados.

**Fora de escopo desta rodada (documentado, não esquecido):** streaming/SSE no widget (polling
simples por ora); múltiplos clientes por tenant no widget (`clientId` fica de fora, tenant-only,
mesmo padrão de `webform`/`manual`); M4.3 (RAG) continua não iniciada.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — M4.4: Widget de chat público na página de imóvel ✅

**Contexto:** próxima fase formal do plano (`docs/PLANO_MENSAGERIA.md` §18.1) depois de várias
sessões blindando o M4.2. Decisão inicial do usuário ("posicionar na landpaging") revelou um
conflito de arquitetura real: `/landpaging` agrega imóveis de TODOS os tenants do segmento, sem
nenhum parâmetro de escopo — colocar o bot lá misturaria a identidade de qual empresa está
respondendo. Resolvido com o usuário: widget vai na **página de detalhe de 1 imóvel**
(`/imoveis/[id]`), onde existe um tenant real e único pra escopar.

**Implementado (zero hardcode por segmento — o mesmo componente serviria qualquer vertical):**
1. `tenant_id` exposto na API de ficha completa (`/api/public/imoveis/[id]/ficha-completa`) —
   coluna já existia na tabela `imoveis`, só não era selecionada.
2. `resolveWebchatInbox(tenantId)` em `inboxes.ts` — clone do padrão já usado por
   `resolveWebformInbox` (cria a inbox lazy na 1ª mensagem real, `channel_type='webchat'`, já
   previsto no schema desde M0 mas nunca usado até agora).
3. Novo endpoint público **sem autenticação** `/api/public/mensageria/chat` (GET recarrega
   histórico, POST envia mensagem) — reaproveita 100% do pipeline existente
   (`ingestMessage`→`maybeRunBot`, mesmo mecanismo do WhatsApp/`/bot/test`). Identidade do
   visitante anônimo: UUID gerado no navegador (localStorage), usado como `phone: "web:<uuid>"`
   — zero mudança na regra de dedupe já existente em `ingest.ts`.
4. **Rate limit dedicado** (`webchatLimiter`, 15 msg/min por sessão E por IP,
   `src/lib/security/rate-limiter.ts`) — obrigatório aqui: é a única rota pública da plataforma
   que dispara uma chamada LLM real sem autenticação nenhuma, risco genuíno de custo/abuso.
5. Gate por `bot_flows.is_active` ANTES de criar qualquer contato/conversa — tenant sem bot
   configurado nunca aparece com o widget, sem gerar lixo no banco.
6. `ChatWidget.tsx` (`src/components/mensageria/ChatWidget.tsx`) — bolha flutuante + painel,
   parametrizada só por `tenantId` (+ `pageContext` opcional, ver abaixo). Embutida em
   `src/app/(with-header)/imoveis/[id]/page.tsx`.

**Bug real pego no teste ao vivo, corrigido na mesma rodada — contexto de página:** perguntado
"quanto custa esse imóvel?" na própria página do imóvel (preço bem visível na tela), o bot
respondeu que o preço "não foi especificado na pergunta" — ele não tinha nenhuma noção de qual
imóvel a conversa começou. Corrigido de forma genérica (não amarrado a "imóvel"):
- `describeEntityRowByIdentity(segmentId, tenantId, entityName, identityValue)` (novo,
  `genericResolver.ts`) — resolve 1 linha pela coluna de identidade e devolve um resumo em texto
  natural dos campos selecionáveis reais.
- `IngestMessageInput.botContext` (novo, `ingest.ts`) — hint textual só pra aquele turno, nunca
  vira mensagem visível na thread, repassado a `maybeRunBot`→`runBotReply`→apendado à persona.
- `ChatWidget` ganhou prop `pageContext={{ entity: 'imovel', id }}` — a página de detalhe passa
  isso, o backend resolve o registro real (preço, quartos, bairro etc.) a cada mensagem (nunca
  cacheado/obsoleto) e informa o bot que "esse"/"este" se refere a ESTE item específico.

**Testado ao vivo, no navegador de verdade** (não só via curl): bolha aparece na página real do
imóvel 1 (tenant Imobiliária XYZ, bot ativo) · mensagem enviada pelo painel → resposta do bot
renderizada em tempo real, sem login, sem cookie · rate limit testado com 17 mensagens rápidas —
15 passam (HTTP 200), 16ª e 17ª bloqueadas (HTTP 429) · inbox `webchat` criada corretamente no
banco · após o fix de contexto de página, "quanto custa esse imóvel?" respondeu corretamente
"R$ 906.000,00" (valor real da tela). `npx tsc --noEmit` limpo em todos os 8 arquivos tocados.

**Fora de escopo desta rodada (documentado, não esquecido):** streaming/SSE no widget (polling
simples por ora); múltiplos clientes por tenant no widget (`clientId` fica de fora, tenant-only,
mesmo padrão de `webform`/`manual`); M4.3 (RAG) continua não iniciada.

---

## Última tarefa concluída

### Sessão 2026-07-15 — Guard-rail "nunca responder sem consultar" + comparação de modelos LLM ⚠️

**Bug real reportado (conversa colada):** na mesma conversa, o bot afirmou corretamente que
existem imóveis em Piedade (via `agrupar_imovel`) e, pouco depois, negou a existência desses
mesmos imóveis quando perguntado diretamente ("não encontramos imóveis em Piedade"). Investigação
com instrumentação temporária (log de `call.name`/`call.input`, revertido depois) confirmou: em
ambos os casos (o relatado e minha reprodução), a causa é o LLM **simplesmente não chamar
nenhuma ferramenta** naquele turno específico e responder "não encontramos" do nada — aleatório,
não ligado a uma pergunta específica.

**Mitigação implementada (código, `botAdapter.ts`):** novo guard-rail permanente
`NEVER_ANSWER_WITHOUT_TOOL_GUARDRAIL`, complementar ao `TOOL_GUARDRAIL` já existente (que cobre o
risco oposto — chamar ferramenta sem relação real com a pergunta): proíbe afirmar
"não encontramos"/"não temos" sem ter acabado de consultar a ferramenta correspondente NESTE
turno. **Testado honestamente: NÃO resolveu sozinho** — bateria de 3 rodadas (9 perguntas) com o
guard-rail ativo ainda teve ~4-5 falhas do mesmo tipo. Confirma, com dado concreto, que texto de
instrução tem um teto real contra esse tipo de falha — não é um problema de prompt mal escrito.

**Comparação de modelos LLM feita ao vivo, mesma bateria de perguntas, todos free-tier:**

| Provider/Modelo | Resultado |
|---|---|
| Groq `llama-4-scout-17b` (original) | Às vezes pula a chamada de ferramenta (bug acima) |
| Groq `llama-3.3-70b-versatile` | NÃO usa tool-calling estruturado da API — escreve a chamada como texto solto (`<function.x>`), pior que o Scout pra esse fim |
| Groq `openai/gpt-oss-120b` | Inventa nomes de ferramenta com erro de digitação (`agrupart_imovel`) → API rejeita com 400, turno inteiro falha |
| Groq `moonshotai/kimi-k2-instruct-0905` | Não disponível nesta conta Groq (confirmado via `/v1/models` — retorna vazio pra qualquer termo kimi/moonshot) |
| Kimi/Moonshot direto (conta internacional do usuário) | Chave válida mas conta suspensa por saldo insuficiente (`platform.moonshot.ai`) — nosso catálogo apontava pro endpoint errado (`.cn`, China), corrigível mas não testado a fundo por causa do saldo |
| Google `gemini-flash-latest` | Chave já provisionada (`GEMINI_API_KEY`) funciona (`gemini-2.5-flash` e `gemini-2.0-flash-001` falharam por indisponibilidade/cota=0 nesta conta espec[ifica) — mas API do Google retornando `503 UNAVAILABLE` (sobrecarga temporária do lado deles, confirmado 3x direto na origem, sem passar pelo nosso código) no momento do teste — não foi possível concluir a bateria completa |

**Estado final desta sessão:** revertido pra `groq`/`llama-4-scout-17b-16e-instruct` (o mais
estável dos 3 testados no Groq, apesar do bug original ainda existir probabilisticamente) — chave
Groq restaurada e conexão reconfirmada. Gemini fica como próximo candidato a retestar quando a
sobrecarga do Google passar; catálogo (`LlmModel`) já tem `gemini-flash-latest`,
`moonshotai/kimi-k2-instruct-0905` (Groq) e `openai/gpt-oss-120b` (Groq) cadastrados pra uso
futuro sem precisar de nova migração.

**Migrações aplicadas:** `migration-2026-07-15-llmmodel-kimi-k2-groq.sql`,
`migration-2026-07-15-llmmodel-gpt-oss-120b-groq.sql`,
`migration-2026-07-15-llmmodel-gemini-flash-latest.sql`.

**Nota de segurança:** o usuário colou 2 API keys reais em texto puro no chat durante esta sessão
(Kimi/Moonshot e Groq) — recomendado ao usuário rotacionar/revogar ambas por precaução, já que
ficaram registradas na transcrição da conversa.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 10) — Ferramenta genérica de agrupamento/contagem ✅

**Contexto:** conversa real mostrou o bot listando só 4 dos 7 bairros reais desse tenant
("em quais cidades e bairros vocês têm imóveis?"), sempre os mesmos, porque `buscar_imovel`
(`max_rows=5`, mesmo com paginação) só enumera categorias que aparecem nos primeiros IDs — um
bairro como Piedade (6 imóveis, ids mais altos) nunca surgia, mesmo tendo mais itens que Estância
(1 imóvel). Paginação resolve "ver mais itens", não "enumerar todas as categorias distintas" — são
problemas diferentes.

**Desafio do usuário:** resolver isso genericamente pra QUALQUER segmento (saúde, carros,
produtos...) sem nenhuma linha hardcoded — o "campo agrupador" muda por segmento (bairro, marca,
especialidade, categoria) e o código nunca pode saber esse nome de antemão.

**Implementado — mesmo padrão de opt-in já usado em `is_comparable`/`is_image`/`is_group_header`:**
1. Novo flag `is_groupable` em `EntityColumn` (`genericResolver.ts`) — Master marca por coluna,
   em qualquer entidade de qualquer segmento. O código só filtra pela flag, nunca lê o nome da
   coluna.
2. `aggregateEntity()` — nova função que roda `SELECT <campo>, count(*) GROUP BY <campo> ORDER BY
   count DESC LIMIT 30` sobre a entidade, reaproveitando os MESMOS filtros/escopo de tenant já
   usados em `resolveEntity` (extraído pra `buildWhereClause()` compartilhado). Resolve o nome
   legível via `buildGroupExpr()` quando o campo é uma FK com lookup (ex.: fabricante_fk →
   fabricantes.nome) — mesma mecânica já usada pra colunas normais.
3. `getToolsForSegment` — qualquer entidade com ≥1 coluna `is_groupable` ganha automaticamente a
   ferramenta `agrupar_<entidade>`, ao lado de `buscar_`/`comparar_` — zero código novo por
   segmento. Descrição da ferramenta orienta o LLM a usá-la só pra perguntas exploratórias
   ("em quais X vocês têm"), não pra ver itens individuais (aí é `buscar_`).
4. `botAdapter.ts` — novo ramo no loop de tool-use pra `agrupar_*`, separado do fluxo de linhas
   normal (sem foto/cabeçalho/paginação, que não fazem sentido pra uma contagem por categoria).

**Migração:** `prisma/migration-2026-07-14-mensageria-bot-is-groupable.sql` marca `bairro` como
`is_groupable:true` na entidade `imovel` — único campo aplicado nesta rodada; outros segmentos
precisam da mesma curadoria (Master marca o campo relevante deles) quando forem ativados.

**Testado ao vivo, tenant real (37 imóveis, 7 bairros):** pergunta exata reportada ("em quais
cidades e bairros vocês têm imóveis?") → bot listou os 7 bairros reais com as contagens EXATAS
(Imbiribeira 20, Piedade 6, Boa Viagem 6, Ipsep 2, Estância 1, Madalena 1, Cordeiro 1) —
conferido via SQL direto, bate 100% · Piedade e Cordeiro, que nunca apareciam antes, agora
aparecem corretamente · drill-down testado em seguida ("me mostra os imóveis de Piedade") →
`buscar_imovel` funcionando normalmente, achou os 6 imóveis reais de Piedade (bairro que antes
era invisível pro bot) · round-trip real `GET/PUT /data-entities` confirma o flag sobrevivendo ao
ciclo salvar-pela-tela · `npx tsc --noEmit` limpo nos 4 arquivos tocados.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 9) — Paginação genérica no bot ("mostrar mais") ✅

**Contexto:** investigando uma conversa real onde o bot só citava 1 imóvel por bairro com dados
pobres, achamos a causa: o tenant tem 37 imóveis reais em 7 bairros, mas `max_rows` da entidade
`imovel` é 5 — toda consulta sem filtro específico só via 5 linhas no total. Cogitamos um link pra
uma página pública externa ("ver todos aqui"), mas investigação revelou que a única página pública
existente (`/landpaging`) agrega TODOS os tenants do segmento junto, sem parâmetro de escopo por
tenant — mandar o visitante pra lá vazaria imóveis de concorrentes. Descartado por ora; decisão do
usuário: implementar só paginação dentro do próprio chat.

**Implementado — genérico, zero hardcode por segmento:**
1. `resolveEntity()` (`genericResolver.ts`) — passa a aceitar `pagina` (1-based, vindo do LLM) e
   retorna `{ rows, totalCount, page, pageSize }` em vez de array cru. `totalCount` vem de um
   `COUNT(*)` companheiro (mesmo WHERE, sem LIMIT/OFFSET) — é o que permite o bot saber que existem
   mais resultados além dos mostrados. `OFFSET` usa a MESMA `ORDER BY` determinística da sessão
   anterior — sem isso, a página 2 poderia repetir ou pular itens da página 1.
2. Novo parâmetro `pagina` injetado automaticamente em toda ferramenta `buscar_<entidade>`
   (`addPaginationParam`) — deliberadamente NÃO adicionado em `comparar_<entidade>` (comparação
   precisa varrer o conjunto de candidatos inteiro pra achar o vencedor real; paginar quebraria a
   conta).
3. `botAdapter.ts` — quando `totalCount` > o que foi mostrado, injeta um aviso explícito no
   `tool_result` com a contagem real e instrução de perguntar se o visitante quer ver mais,
   chamando a MESMA ferramenta de novo com `pagina` incrementada.
4. `compareEntity` ajustado pro novo formato de retorno de `resolveEntity` (`{ rows }` em vez de
   array direto) — sem mudança de comportamento nele.

**Testado ao vivo, tenant real com 20 imóveis em Imbiribeira:** 1ª pergunta ("quais imóveis vocês
têm na Imbiribeira?") → 5 imóveis com TODOS os campos (preço, quartos, banheiros, vagas — antes
vinha só o título) + "Você gostaria de ver mais opções?" · "sim, mostra mais" → 5 imóveis
COMPLETAMENTE DIFERENTES dos primeiros (página 2 real, sem repetição) + oferece mais de novo,
confirmando que ainda há mais além da página 2. `npx tsc --noEmit` limpo nos 2 arquivos tocados.

**Nota da 2ª parte do problema original (respostas "pobres"):** não era um bug separado — era
consequência direta do `max_rows=5` forçando o LLM a resumir muitos bairros numa resposta minúscula.
Com a paginação, cada resposta agora cobre só 1 bairro/consulta por vez com todos os campos —
resolvido como efeito colateral, sem mudança nenhuma na lógica de formatação.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 8) — Resolvido o "caso residual": LIMIT sem ORDER BY ✅

**Causa raiz real do achado residual da tarefa anterior:** `resolveEntity()` (`genericResolver.ts`)
montava `SELECT ... LIMIT N` **sem `ORDER BY`**. Postgres não garante ordem nem conjunto estável
de linhas em `LIMIT` sem `ORDER BY` — duas chamadas idênticas na MESMA conversa (ex.: listar
imóveis, depois perguntar "tem fotos?", cada uma disparando uma nova consulta ao `buscar_imovel`)
podiam devolver amostras de até 5 itens DIFERENTES entre si, mesmo com os mesmos filtros. Isso
explicava o bot "esquecer"/contradizer o que tinha acabado de listar — não era o LLM inventando,
era o BANCO devolvendo dados diferentes pra a mesma pergunta.

**Corrigido:** `ORDER BY e.<identityColumn>` adicionado à query — determinístico, genérico (usa a
mesma coluna de identidade já configurada por entidade, funciona pra qualquer segmento), sem
custo de configuração nova.

**Testado:** SQL direto confirma `ORDER BY id LIMIT 5` devolvendo os MESMOS 5 registros em
execuções repetidas · reproduzida a sequência exata do achado residual ("quais imóveis vocês
têm?" → "tem fotos?") 3x seguidas — nas 3, o 2º turno confirmou fotos EXATAMENTE dos mesmos 5
imóveis citados no 1º turno (Imóvel 1, 2, 3, 4, 6), zero inconsistência, contra o comportamento
instável de antes. `npx tsc --noEmit` limpo.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 7) — Bot dizendo "não posso exibir fotos" numa pergunta de acompanhamento ✅⚠️

**Bug real reportado via conversa colada:** depois de já ter listado imóveis (sem foto pedida),
perguntado "tem fotos dos imóveis?", o bot respondeu "não posso exibir as fotos diretamente
aqui... posso transferir você para um atendente" — contradizendo diretamente a regra da persona
de que a plataforma sempre envia foto real como mensagem separada quando existe.

**Diagnóstico:** a regra "nunca diga que não pode exibir imagens" só existia DENTRO do aviso
injetado no `tool_result` de uma chamada de ferramenta (mecanismo de sessão anterior) — se o LLM
decide não chamar nenhuma ferramenta naquele turno (respondendo só de memória do histórico), essa
proteção nunca chega a ele. Tentei reproduzir a sequência exata 4x antes do fix — funcionou
corretamente todas as vezes (LLM é probabilístico, não consegui forçar a falha de forma
determinística), então a correção foi feita preventivamente com base no diagnóstico da causa raiz,
não confirmada por reprodução direta do erro relatado.

**Implementado:** novo guard-rail genérico (`PHOTO_FOLLOWUP_GUARDRAIL`, `botAdapter.ts`,
`resolvePersona`) — regra permanente (fora do ciclo de tool-use, vale em qualquer turno):
sempre chamar a ferramenta de novo quando o visitante perguntar sobre foto, mesmo sobre itens já
mencionados antes sem foto; proíbe explicitamente a frase "não posso exibir/mostrar imagens".
Aplica a todos os segmentos automaticamente, sem exigir edição de persona por segmento.

**Testado:** 5 tentativas de reprodução com frases variadas (`"tem fotos dos imoveis?"`,
`"tem fotos?"`) — 0/5 repetiram a frase proibida depois do fix; 2/5 enviaram fotos reais como
anexo corretamente. **Achado residual, honestamente registrado, NÃO é o mesmo bug relatado:** numa
pergunta bem genérica sem bairro ("quais imóveis vocês têm?"), uma das rodadas disse "não
encontrei fotos" pra um item que na verdade TEM foto real no banco (Imóvel 1) — indício de que a
amostra de até 5 imóveis retornada pela ferramenta pode variar entre chamadas na mesma conversa
(sem filtro de bairro pra fixar o conjunto), então o 2º check de foto pode acabar batendo em itens
diferentes do que foram citados no texto. Fica registrado como risco a observar, não corrigido
nesta rodada. `npx tsc --noEmit` limpo.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 6) — Ferramenta chamada por engano em pergunta sem relação real ✅

**Bug real reportado:** perguntado deliberadamente algo sem correspondência com nenhum dado
mapeado ("você tem o estatudo de imoveis?" — estatuto, não um campo/entidade real), o bot chamou
a ferramenta `tipo_imovel` e respondeu com a lista de tipos (Casa, Apartamento, etc.) — um dado
real, mas sem nenhuma relação com a pergunta. Pior que "não sei", porque parece resposta certa.

**Restrição do usuário:** sem hardcode de palavra-chave em código — só via instrução de prompt,
e válido pra **todos os segmentos**, não só Imobiliário.

**Implementado em 2 camadas:**
1. **Guard-rail genérico em código** (`botAdapter.ts`, `resolvePersona`) — texto fixo
   (`TOOL_GUARDRAIL`) concatenado a QUALQUER persona resolvida (segmento específico, fallback
   global, ou hardcoded de emergência), pedindo pro LLM só chamar ferramenta quando a pergunta
   corresponder claramente à descrição dela, nunca "no chute" por semelhança solta. Aplica
   automaticamente a todo segmento presente e futuro, sem exigir que o Master repita a regra em
   cada template de persona.
2. **Descrição da ferramenta mais restritiva** (dado, não código — `mensageria.segment_data_
   entities`, entidade `tipo_imovel`) — a descrição antiga ("use pra responder o que a empresa
   oferece") era ampla demais e pesava na decisão de tool-calling tanto ou mais que a persona.
   Reescrita com critério explícito de quando NÃO usar (documentos/contratos/estatuto/política) —
   mesmo padrão já usado em `status_fk` numa sessão anterior.
   `prisma/migration-2026-07-14-mensageria-bot-tipo-imovel-desc-fix.sql`.

**Testado:** só o guard-rail (camada 1) sozinho NÃO foi suficiente — reproduzi o bug de novo
mesmo com ele presente, confirmando mais uma vez que instrução textual genérica tem baixa adesão
sozinha. Com a descrição da entidade reescrita (camada 2) somada ao guard-rail, retestei a EXATA
pergunta reportada 3x seguidas — 3/3 corretas ("não tenho acesso a informações sobre o estatuto
de imóveis..."), sem chamar a ferramenta · regressão checada: "quais tipos de imóveis vocês
trabalham?" (pergunta legítima) continua chamando a ferramenta normalmente e listando os tipos
reais. `npx tsc --noEmit` limpo.

**Nota de generalização:** a camada 1 (guard-rail em código) já vale automaticamente pra qualquer
segmento. A camada 2 (descrição mais restritiva) foi aplicada só em `tipo_imovel` — outros
segmentos/entidades que sofrerem do mesmo tipo de confusão precisam do mesmo tratamento na
descrição de CADA entidade, feito pelo Master na tela "Dados do Bot" (sem código novo).

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 5) — Fotos enviadas sem pedido explícito (todo turno com dado de imóvel) ✅

**Bug real reportado via conversa colada pelo usuário:** toda resposta que tocava linhas com foto
real mandava as fotos automaticamente — inclusive "em quais bairros vocês têm imóveis?", "qual tem
o valor mais baixo?", "qual a média de valor?" — nenhuma dessas perguntas pedia foto, mas cada uma
disparou 1-4 mensagens de imagem depois do texto. Causa: `collectRowImages`/`itemsByKey` em
`botAdapter.ts` coletava as URLs de TODA linha retornada por qualquer tool call, sem checar se a
pergunta atual pedia isso.

**Restrição do usuário:** "nada hardcoded, a não ser que possamos instruir o prompt" — ou seja,
não podia virar uma lista de palavras-chave fixa em código (`if (msg.includes('foto'))`), tinha
que ser o próprio LLM decidindo, como já acontece com campos/operação/critério da ferramenta de
comparação.

**Implementado:** novo parâmetro `incluir_fotos` (string "true"/"false") injetado automaticamente
em QUALQUER ferramenta (`buscar_*`/`comparar_*`) de entidade que tenha ao menos 1 relation
`is_image` — `addPhotoIntentParam()` em `genericResolver.ts`, dirigido 100% por metadado (nenhum
segmento/campo fixo). Descrição do parâmetro instrui o LLM a marcar `true` só quando o visitante
pediu foto NESTA pergunta especificamente. `botAdapter.ts`: `collectRowImages` só roda quando
`call.input.incluir_fotos` veio `true` nessa chamada — sem pedido, `itemsByKey` guarda `images:[]`
pra aquele item (sem afetar cabeçalho/agrupamento). O aviso "nenhum item tem foto" também passou a
só disparar quando `wantsPhotos` é true — antes disparava sempre que havia relation de imagem sem
foto encontrada, mesmo em perguntas que não tinham nada a ver com fotos.

**Testado ao vivo, 4 cenários seguidos na mesma conversa:** "em quais bairros vocês têm imóveis?"
→ zero fotos (bug original, confirmado corrigido) · "qual tem os valores mais baixos?" → zero
fotos · "me manda fotos dos imóveis de Boa Viagem" → pediu foto explicitamente, sistema respondeu
corretamente "não encontrei fotos disponíveis" (conferido via SQL: os 6 imóveis de Boa Viagem
deste tenant de teste realmente têm 0 fotos reais — resposta certa, não bug) · "quero ver fotos
dos imóveis da Imbiribeira" (bairro com fotos reais) → 4 cartões, cada um com 1 foto anexada de
verdade. `npx tsc --noEmit` limpo nos 2 arquivos tocados.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 4) — Segregação moeda × quantidade em `comparar_<entidade>` ✅

**Motivação:** usuário apontou um risco real depois do fix anterior (flag `is_comparable`): nada
impedia o bot de somar campos de NATUREZAS diferentes — ex. `preco + quartos` — já que
`is_comparable` só marca "este campo é elegível pra comparação", não "este campo pode ser somado
com aquele outro". Descartei a 1ª ideia (unidade em texto livre, o Master digitaria "R$"/"m²"/etc)
depois que o usuário perguntou como escolheria essas unidades — texto livre é frágil e sem
necessidade real, já que o único caso de negócio genuíno é somar campos de DINHEIRO entre si
(preço + condomínio + IPTU = custo total); somar quantidades entre si (quartos + banheiros) nunca
é uma pergunta real.

**Implementado:** novo campo `comparison_kind: 'moeda' | 'quantidade'` em `EntityColumn`
(`genericResolver.ts`) — só relevante quando `is_comparable=true`; default seguro `'quantidade'`
quando ausente. `compareEntity` passa a rejeitar (com erro explícito, não calcula) qualquer
`campos` com 2+ itens a menos que TODOS sejam `moeda` — combinação de quantidade com quantidade,
ou quantidade com moeda, é sempre recusada; ranking de 1 campo só nunca precisa dessa checagem
(sempre seguro). Descrição da ferramenta (`buildCompareParamsSchema`) já avisa o LLM quais campos
são combináveis. UI ganhou um dropdown "quantidade"/"moeda" ao lado do checkbox "comparável" (só
2 opções — Master não digita nada). `prisma/migration-2026-07-14-mensageria-bot-comparison-kind.sql`
marca `preco`/`preco_condominio`/`preco_iptu` como `moeda` e `quartos`/`banheiros`/
`vagas_garagem`/`area_total` como `quantidade`.

**Testado ao vivo** (rate-limit do Groq já tinha resetado): "somando preço + condomínio + IPTU"
(3 campos moeda) → bot respondeu corretamente "Imóvel 1, R$ 433.300,00" — conferido via SQL direto
que bate exatamente com a soma real · "somando preço com quantidade de quartos" (moeda + quantidade
misturados) → bot recusou explicitamente ("não é permitido combinar campos de moeda com campos de
quantidade") e ofereceu a alternativa sensata (menor preço isolado) em vez de inventar um total
sem sentido — exatamente o comportamento pretendido. `npx tsc --noEmit` limpo nos 3 arquivos
tocados. SQL confirma os 7 campos com `comparison_kind` correto (3 moeda, 4 quantidade).

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação 3) — Cabeçalho único, id excluído, flag `is_comparable` explícita ✅

**Contexto:** usuário fez 3 perguntas de design sobre a tela "Dados do Bot" (Master → Segmentos),
cada uma revelando um gap real (não hipotético):
1. "cabeçalho" (`is_group_header`) permitia marcar várias colunas na UI, mas `botAdapter.ts` só
   usa a primeira (`.find()`) — as demais ficavam marcadas sem efeito, enganoso.
2. `id` (PK, numérica) entrava como campo elegível pra soma/comparação — sem sentido de negócio
   nenhum (chave arbitrária, não quantidade).
3. Campos como `andar`/`vagas_garagem` são posição/quantidade, não "valor" — marcar QUALQUER
   numérico selecionável como comparável (comportamento anterior) permitia somas sem sentido
   (ex.: andar + vagas de garagem). Faltava curadoria explícita, no mesmo padrão de `is_image`/
   `is_group_header` (flag que o Master ativa deliberadamente, não inferência automática por tipo).

**Corrigido (3 partes, plano aprovado em `bright-herding-minsky.md`):**
1. **Cabeçalho exclusivo** — `SegmentDataEntitiesModal.tsx`: `updateColumn` agora desmarca
   `is_group_header` em todas as outras colunas da mesma entidade quando uma é marcada.
2. **Identidade sempre excluída** — `genericResolver.ts`: `isComparableNumericColumn` passa a
   receber `identityColumn` e excluir sempre essa coluna (estrutural, sem flag — nenhuma entidade
   de nenhum segmento deveria comparar por PK). Atualizados os 3 call sites (`compareEntity`,
   `buildCompareParamsSchema`, `getToolsForSegment`) + espelho no frontend.
3. **Flag explícita `is_comparable`** — nova propriedade em `EntityColumn`/`EntityColumnInput`;
   `isComparableNumericColumn` agora exige `is_comparable===true` além de number/selectable/sem
   lookup/não-identidade. UI ganhou checkbox "comparável" (mesmo padrão visual de "cabeçalho") ao
   lado de cada coluna numérica; badge agregado e ícone por linha passam a refletir o flag real em
   vez de inferir do `type` cru. `prisma/migration-2026-07-14-mensageria-bot-is-comparable.sql`
   marca `is_comparable:true` em `preco`, `preco_condominio`, `preco_iptu`, `quartos`, `banheiros`,
   `vagas_garagem`, `area_total` — deixa `andar` e `id` de fora deliberadamente (Master pode
   ajustar livremente depois, é exatamente o ponto de virar curadoria).

**Testado:** `npx tsc --noEmit` limpo (só erros pré-existentes de baseline, nenhum nos 4 arquivos
tocados) · SQL confirma os 7 campos com `is_comparable:true`, ausente em `andar`/`id`/demais ·
round-trip real `GET/PUT /api/admin/master/segments/[id]/data-entities` confirma o flag
sobrevivendo ao ciclo salvar-pela-tela · teste ao vivo do bot (pergunta de comparação real, mesmo
cenário do bug original) bateu no rate-limit diário do Groq (429, "Used 499711/500000") — confirmado
via logging temporário de stack trace (adicionado e revertido nesta sessão, `botAdapter.ts` com
diff líquido zero) que é o MESMO bloqueio ambiental já documentado antes nesta sessão, não um bug
introduzido pelas mudanças — o try/catch existente tratou graciosamente com a mensagem de fallback.
Retestar o `comparar_imovel` ao vivo fica pendente até o quota resetar. Exclusividade do cabeçalho
verificada por leitura de código (mutual-exclusion no `updateColumn`), não interação real no
navegador — mesma limitação de cookie/middleware Master já documentada repetidamente nesta sessão.

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação 2) — Ícone de comparação por coluna ✅

Usuário confirmou via print real que o badge agregado (sessão anterior) renderiza corretamente
("9 campos elegíveis... id, quartos, banheiros..."), mas pediu o indicador também **por linha de
coluna** — não só no resumo do topo. Adicionado `CalculatorIcon` (mesmo import já usado no badge)
inline em cada linha de coluna, condicionado à mesma regra (`type==='number' && selectable &&
!lookup_table`) — aparece só nas colunas realmente elegíveis, ao lado da descrição.

**Testado:** `npx tsc --noEmit` limpo. Verificação visual desta vez confirmada pelo usuário
(primeira vez nesta sessão que uma verificação visual do módulo Master foi confirmada por print
real, não só inferência de código — a limitação de cookie/middleware Master continua valendo pra
verificação MINHA própria, mas o usuário consegue ver a tela normalmente pela sessão dele).

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação) — Badge "campos elegíveis para comparação" no Dados do Bot ✅

Usuário pediu visibilidade da nova ferramenta `comparar_<entidade>` (sessão anterior) na tela
Master. Como a capacidade é 100% derivada de metadado já existente (nenhum campo novo de config),
adicionado só um indicador visual: `comparableFieldNames()` em
`SegmentDataEntitiesModal.tsx` espelha a mesma regra do backend
(`isComparableNumericColumn` em `genericResolver.ts` — número + selecionável + sem lookup) e
renderiza um aviso âmbar acima da lista de colunas de cada entidade: "N campos elegíveis para
comparação: preco, preco_iptu, quartos, ...". Zero API nova — só leitura do state já carregado.

**Testado:** `npx tsc --noEmit` limpo. Verificação visual no navegador não foi possível — mesma
limitação de cookie/middleware Master já documentada repetidamente nesta sessão (confirmado mais
uma vez: navegação pra `/admin/master/segments` com cookie injetado via JS foi redirecionada).
Confiança na correção via inspeção de código (lógica é uma cópia 1:1 do filtro já testado e
validado no backend) — pendente confirmação visual do usuário.

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 — preco_iptu exposto ao bot + comparação exclui colunas FK ✅

**Achado crítico, checando a UI de "Dados do Bot":** `preco_iptu` estava com `selectable:false` —
**nunca esteve exposto ao bot em nenhum momento desta sessão**. Todo valor de IPTU que o bot
mostrou (inclusive no relato original do bug de comparação, "R$ 1.100,00" pro imóvel 1) era
**inventado** — confirmado comparando com o dado real (`preco_iptu` do imóvel 1 = R$ 2.200,00,
não bate com o que o bot disse). Não era "estimativa imprecisa", era alucinação total por falta
de acesso ao dado. Corrigido: `preco_iptu` agora `selectable:true` (mesmo padrão do fix de
`preco_condominio`, sessão anterior).

**2º bug achado no mesmo processo:** a ferramenta `comparar_<entidade>` (sessão anterior)
considerava `type:'number' && selectable:true` como critério de elegibilidade — mas colunas FK
com lookup (`tipo_fk`, `status_fk`, `finalidade_fk`) também são `type:'number'` no banco (são
FKs), só que o valor que o bot vê é o NOME resolvido (ex.: "Apartamento"), não um número somável.
Nova função `isComparableNumericColumn()` exclui colunas com lookup válido da elegibilidade —
usada nos 3 lugares que antes repetiam a checagem inline.

**Testado:** `npx tsc --noEmit` limpo · lista de campos elegíveis pra comparação reconferida via
SQL — `preco_iptu` entrou, `tipo_fk`/`status_fk`/`finalidade_fk` saíram.

---

## Penúltima tarefa concluída

### Sessão 2026-07-13 (continuação 2) — Ferramenta genérica `comparar_<entidade>` — cálculo sai do LLM ✅⚠️

**Motivação:** sessão anterior mostrou que pedir pro LLM (na mesma chamada de formatação de
cartões) fazer aritmética entre vários itens e escolher o vencedor não é confiável — chegou a
inventar "IPTU aproximado". Usuário questionou se a correção generalizaria pra outros segmentos
(carro, saúde) sem hardcode de nome de campo. Resposta: a ideia original ("código já sabe quais
campos somar") NÃO generalizava — o código não pode saber de antemão que "valor+IPTU" é a soma
certa pra UMA pergunta específica. Desenho corrigido: separar "quais campos + qual operação" (LLM
extrai — tarefa que ele faz bem) de "executar a conta e escolher o vencedor" (código faz — 100%
determinístico), numa ferramenta nova derivada só de metadado já existente.

**Implementado:**
1. `genericResolver.ts` — `compareEntity(entity, params, ctx)`: reaproveita `resolveEntity` pra
   buscar as linhas candidatas (mesmos filtros/tenant/maxRows de sempre); calcula em JS
   (`Number()` real, nunca texto) soma/subtração/média dos `campos` pedidos; encontra o extremo
   (menor/maior, com tolerância de arredondamento) e retorna só a(s) linha(s) vencedora(s) com
   `_total_calculado` anexado. `campos` só aceita nomes que já são
   `entity.columns` com `type==='number' && selectable===true` — zero config nova, zero nome de
   campo/segmento fixo.
2. `getToolsForSegment` — qualquer entidade com ≥1 coluna numérica selecionável ganha
   automaticamente a ferramenta `comparar_<entidade>` (ao lado de `buscar_<entidade>`, que
   continua igual). Já vale pro imóvel hoje (preco, preco_iptu, quartos etc. já são
   number+selectable) e valeria pra carro/saúde/qualquer segmento assim que tiverem colunas
   numéricas cadastradas — sem código novo.
3. `botAdapter.ts` — loop de tool-use reconhece `comparar_*` além de `buscar_*`; resultado
   (já ranqueado pelo código) passa pelo MESMO pipeline de sanitização/fotos/cartões que já
   existia; aviso extra explícito: "o item já foi selecionado pelo sistema, _total_calculado já
   é real, NUNCA recalcule".

**Verificado (nível código, sem LLM — 100% determinístico):** SQL direto confirma o cálculo real
de `preco+preco_iptu` pra todos os imóveis ativos do tenant de teste — imóvel 2 (R$400.000,00,
sem IPTU) é o menor hoje. `npx tsc --noEmit` limpo.

**⚠️ Teste end-to-end via LLM real BLOQUEADO nesta sessão** — não por bug, mas porque a cota diária
do provider Groq (`llama-4-scout-17b-16e-instruct`, config LLM global da plataforma) esgotou
(500.000 tokens/dia) pelo volume de testes ao vivo feitos ao longo de toda a sessão. Erro `429`
capturado corretamente pelo try/catch já existente (fallback de robustez de sessão anterior) —
sem crash, sem silêncio, mensagem de desculpa exibida como projetado. **Pendência real pra próxima
sessão:** retestar "qual desses tem o valor menor somando valor+IPTU?" repetidas vezes assim que a
cota resetar (ou com outro provider configurado), esperando agora 100% de consistência já que o
cálculo em si não depende mais do LLM — só a extração de campos/operação varia por chamada.

---

## Penúltima tarefa concluída

### Sessão 2026-07-13 (continuação) — Cartões seletivos + 2 bugs reais no filtro FK + capacidade de comparação ainda não confiável ✅⚠️

**Pergunta original do usuário:** conversa real mostrou o bot listando TODOS os 5 imóveis em
cartões quando perguntado "qual desses tem o valor menor somando valor+IPTU?" — sem fazer conta
nenhuma. Perguntou se era só ajuste de prompt.

**Resposta: não, era um bug de arquitetura real.** `buildCards()` em `botAdapter.ts` fazia
`items.map(...)` incondicional — todo item retornado pela ferramenta virava cartão, não importava
o que o LLM decidisse no JSON de formatação. Corrigido: `items.filter(...)` só inclui a chave que
o LLM de fato retornou no JSON; instrução reescrita pra pedir cálculo/comparação real e seleção
explícita do(s) item(ns) que respondem à pergunta (não mais "um card por item sempre").

**Durante o reteste, 2 bugs reais e mais sérios encontrados nas colunas FK com lookup
(`tipo_fk`/`status_fk`/`finalidade_fk`, sessão anterior):**

1. **Vazamento de tenant no filtro por nome.** Testei "quais imóveis vocês têm disponíveis?" — o
   LLM às vezes filtrava `status_fk="disponível"` (palavra genérica, minha própria descrição da
   coluna sugeria esse exemplo errado — corrigido primeiro, não resolveu sozinho). Investigação
   mais funda: a checagem de existência de categoria que eu tinha acabado de adicionar (pra não
   forçar resultado vazio quando o LLM inventa um valor) **não era escopada por tenant** —
   `status_imovel` é catálogo por-tenant, e outro tenant TEM "Disponível" no catálogo dele. A
   checagem via "existe globalmente" deixava passar, o filtro real então casava contra ids de
   OUTRO tenant, e a busca voltava vazia pra este tenant mesmo com "Ativo" sendo a categoria real
   equivalente. Corrigido: checagem de existência E filtro real agora escopados por
   `entity.tenantColumn` (convenção: catálogo de lookup usa a mesma coluna de tenant da entidade
   base).
2. **Colisão de substring em palavras com prefixo de negação.** Mesmo com o escopo por tenant
   corrigido, "disponível" ainda batia via `ILIKE '%disponível%'` dentro de "**In**disponível" —
   significado oposto! Corrigido: troca de `ILIKE` por `~*` com fronteira de palavra Postgres
   (`\ydisponível\y`) — "disponível" não bate dentro de "indisponível" (sem fronteira de palavra
   entre "in" e "disponível", ambos caracteres de palavra), mas continua batendo normalmente em
   "Bangalo"/"Apartamento". Valor do LLM sempre escapado (`escapeRegex`) antes de virar padrão.

**Testado exaustivamente (múltiplas rodadas, LLM é probabilístico):** "quais imóveis disponíveis"
→ 6/6 sucessos depois do fix completo (vs. falhas intermitentes antes) · bangalô continua
corretamente negativo (regressão OK) · tipo real (apartamento) continua funcionando.

**⚠️ Capacidade de comparação matemática AINDA NÃO É CONFIÁVEL — reportado com honestidade, não
resolvido:** testei "qual tem o valor menor somando valor+IPTU" 3x depois do fix arquitetural de
seleção de cartões. Resultado: 1x correto, 2x errado — numa delas o LLM literalmente inventou
"IPTU aproximado" (violando a instrução explícita de nunca estimar), selecionou itens de valor
ALTO (não baixo), e o texto final citou um total que não bate com nenhum cartão exibido nem com a
soma real. **Avaliação honesta:** pedir que o mesmo LLM (numa única chamada de formatação) faça
aritmética entre vários itens, selecione o(s) correto(s) E monte JSON estrito é pedir demais de
uma vez — o padrão "sinal explícito nos dados" que funcionou pros bugs anteriores não é suficiente
aqui porque o problema não é falta de dado, é confiabilidade de cálculo multi-etapa do próprio
modelo. **Recomendação pra próxima sessão:** mover o cálculo pra fora do LLM — código faz a soma/
comparação/ranking real (quando a pergunta claramente pede isso e os campos numéricos existem) e
passa o resultado JÁ CALCULADO pro LLM só formatar em texto natural, em vez de pedir que ele
calcule. Não implementado ainda — decisão de escopo pra conversar com o usuário antes.

**Arquivos tocados:** `src/lib/mensageria/botAdapter.ts` (buildCards seletivo, loadHistory inclui
`content_type='card'` — bug relacionado: cartões ficavam invisíveis no histórico de turnos
seguintes, fazendo o bot "esquecer" itens já mostrados e pedir esclarecimento desnecessário),
`src/lib/mensageria/tools/genericResolver.ts` (escopo por tenant + fronteira de palavra no filtro
de lookup). `prisma/migration-2026-07-13-mensageria-bot-status-fk-desc-fix.sql`. `npx tsc --noEmit`
limpo em todos.

---

## Penúltima tarefa concluída

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
