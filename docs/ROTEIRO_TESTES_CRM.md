# Roteiro de Testes — Módulo CRM

> Roteiro manual, para ser executado na UI real (navegador), cobrindo o CRM em 4 blocos:
> **Parte 1** — CRM sozinho (todas as telas, sem depender de Mensageria/Campanhas).
> **Parte 2** — CRM + Mensageria (só essa integração).
> **Parte 3** — CRM + Campanhas de Marketing Digital (só essa integração).
> **Parte 4** — os 3 módulos juntos (CRM + Mensageria + Campanhas).
>
> Convenções: ✅ = resultado esperado · ⚠️ = ponto de atenção/cuidado conhecido · 🧹 = limpeza.
> Prefixe todo dado de teste com `TESTE ROTEIRO CRM` (nome do lead, descrição de atividade
> etc.) — facilita achar e remover tudo depois, sem risco de mexer em dado real.

---

## Parte 0 — Preparação

### 0.1 Escolher o tenant certo pra cada parte

- **Parte 1 (CRM sozinho):** qualquer tenant com CRM contratado serve — as telas do CRM não
  dependem de Mensageria/Campanhas estarem ativos. Se quiser isolamento estrito (nenhum sinal
  vindo de fora), use um tenant que **só** tenha o módulo CRM provisionado.
- **Parte 2 (CRM + Mensageria):** um tenant com CRM **e** Mensageria contratados, **sem**
  Campanhas (senão você não consegue isolar se um lead chegou por causa da Mensageria ou de uma
  campanha).
- **Parte 3 (CRM + Campanhas):** um tenant com CRM **e** Campanhas contratados, **sem**
  Mensageria — os cliques de CTA/formulário do módulo de Campanhas continuam funcionando sem
  Mensageria (viram lead direto, sem passar por conversa/bot).
- **Parte 4 (os 3 juntos):** um tenant com **CRM + Mensageria + Campanhas** todos contratados
  — é o cenário de produção mais completo, e o único em que dá pra testar de verdade os pontos
  de CONVERGÊNCIA (mesmo lead chegando por 2 canais diferentes, atribuição de receita cruzando
  os 3 módulos). Se possível, use um tenant diferente dos das Partes 2/3 (ou o mesmo, resetado)
  pra não herdar lead de teste antigo confundindo os números.

Pra conferir ou ajustar o que está contratado por tenant: login como Master →
`/admin/master/provisioning`. Módulos relevantes: "CRM de Vendas", "Gestão de Mensageria",
"Gestão de Campanhas de Marketing Digital".

### 0.2 Confirmar o gate de IA do CRM

Antes de qualquer teste, entre em `/crm/kanban` com o tenant escolhido. Se aparecer a tela
"CRM aguardando configuração de IA" em vez do quadro Kanban, o **segmento** daquele tenant
ainda não tem `crm_ia_ativa=true` — vá em (Master) `/admin/master/segments` → botão
"Qualificação de Lead por IA (CRM)" do segmento em questão → ative o toggle "IA Ativa" antes
de continuar. Login como Master sempre bypassa esse gate (pode navegar mesmo sem IA ativada).

### 0.3 Ter um segundo usuário (não-admin) à mão, se possível

Vários testes da Parte 1 (disponibilidade de atendente, distribuição/reatribuição) ficam mais
reais com pelo menos 2 usuários reais no tenant com o cargo usado pra distribuição (confira em
`/admin/master/segments` → editar segmento → campo "Cargo do vendedor", normalmente
"Corretor"). Se só houver 1, alguns passos (G2/G3 — reatribuição) ficam só parcialmente
verificáveis; o roteiro sinaliza onde isso importa.

---

## Parte 1 — CRM sozinho

### 1.1 — Dashboard (`/crm`, "Dashboard Inteligente")

> **Decisão de produto (2026-08-13):** o CRM não mede mais custo/ROI/CAC/CPL de marketing —
> nenhuma fonte disponível (verba manual ou gasto sincronizado de mídia paga) representa o
> custo comercial TOTAL de um negócio, e rotular uma fração como "ROI" seria uma meia-verdade.
> Se você ainda ver qualquer menção a "ROI"/"CAC"/"CPL"/"Total Investido"/"Central de Mídia"
> nesta tela, é regressão — reporte.

1. Abrir `/crm`. ✅ Deve carregar sem erro, com filtro de período (`De`/`Até`, formato
   dd/mm/aaaa via `DateInputPtBR` — nunca o seletor nativo do navegador, só aparece com
   "Personalizado" selecionado) e 6 cards de KPI: **Leads Captados**, **Valor Estimado
   Total** (soma o badge de preço — ícone `dollar-sign` — já exibido nos cards do Kanban;
   o rótulo do badge é curado por segmento/tenant no Segment Builder, ex. "Faixa de Preço"
   em Venda de Carros — nunca hardcoded; distinto de "Pipeline Aberto" abaixo, que soma
   `valor_venda_estimado`, um campo separado e deliberado), **Negócios Fechados** (qtd +
   valor real fechado), **Negócios Perdidos** (qtd + valor estimado perdido, quando
   houver), **Pipeline Aberto** (valor ESTIMADO — nunca confundido com valor real),
   **Taxa de Conversão** (+ ciclo médio de venda em dias, quando houver negócio fechado
   no período).
2. Trocar o período pra uma janela sem dado nenhum (ex.: um mês bem antigo). ✅ Cards devem
   mostrar zero honestamente, não travar nem mostrar erro. "Pipeline Aberto" é a exceção
   deliberada — é sempre um snapshot de agora, não filtrado por período (mostra o que está
   em aberto AGORA, independente da janela escolhida).
3. Trocar de volta pra um período com dado real. ✅ Números batem com o que você já sabe do
   tenant (ou confira depois via Kanban/Leads).
4. Abaixo dos KPIs: **Funil de Vendas (CRM)** — barra por coluna do Kanban, com contagem e
   % do total. **Gargalos & Ciclos (SLA)** (mantido de sempre) + **Fila de Atenção** (novo —
   contagem de leads aguardando resposta/sem responsável, clicável, leva pra `/crm/resgate`).
   **Top 10 Leads Quentes** + **Inteligência de Mercado** (mantidos de sempre). Por último,
   **Performance — [cargo do segmento]** (tabela por vendedor: atribuídos, fechados, valor
   fechado, perdidos, pipeline estimado, tempo médio de resposta) + **Principais Motivos de
   Perda** (texto real digitado ao perder negócio, contado por frequência).
5. ✅ O rótulo do painel de performance muda com o segmento (ex. "Corretores" no Imobiliário,
   "Consultores de Vendas" em "Venda de Carros" se configurado assim) — mas a LISTA de quem
   aparece nunca depende do nome do cargo, só de quem tem lead atribuído de verdade
   (`leads_staging.corretor_atribuido_id`). Tenant sem nenhum lead atribuído a ninguém ainda
   → tabela vazia, mensagem honesta, sem erro.

### 1.2 — Kanban de Leads (`/crm/kanban`) — o coração do módulo

**Board:**
1. Abrir `/crm/kanban`. ✅ Colunas do funil aparecem na ordem configurada, cada card de lead
   mostra nome, badge de origem (se houver), `score_prontidao%` e, quando existir,
   `score_fit%` ("· X% Fit" ao lado do "Match").
2. Se houver coluna marcada como GANHO ou PERDA (ver 1.5), confirme que ela mostra um badge
   "GANHO"/"PERDA" ao lado do título da coluna.
3. Arrastar um lead de teste de uma coluna pra outra (drag-and-drop). ✅ O card se move e
   persiste (recarregue a página — deve continuar na coluna nova).
4. Mover um lead pra uma coluna marcada como "GANHO", preenchendo valor de venda (se pedido).
   ✅ Sem erro; se o segmento tiver o agente `next_best_action` ativo, o move deve disparar
   `refreshNextBestAction` em segundo plano (não bloqueia a resposta do move).
4b. **Valor Estimado (novo, 2026-08-13):** marque uma coluna NÃO-terminal com "Exige valor
   estimado" (1.5) e mova um lead de teste (sem estimativa ainda) pra ela. ✅ Deve interceptar
   com o modal "Estimativa de Valor 💰" (cor âmbar, distinto do "Negócio Fechado 🎉" verde) —
   preencher e confirmar deixa o move seguir; cancelar mantém o lead na coluna original. Mover
   esse MESMO lead de novo pra outra coluna com a mesma exigência ✅ não pergunta de novo (já
   tem estimativa) — edite na ficha do lead se quiser atualizar. Card do Kanban mostra um
   badge âmbar "~R$X est." (nunca no mesmo tile do badge verde de valor real).

**Ficha do lead (abrir um card):**
5. Confirmar 2 tiles separados: "Intenção X%" (score_prontidao) e "Fit X%" (score_fit, ou
   "—" se o lead nunca foi qualificado com critério de Fit). ✅ Nunca deve aparecer "IPVE"
   (removido — se aparecer, é regressão).
6. Seção **"Sugestão da IA"** (`NextBestActionCard`) — só aparece se o agente
   `next_best_action` estiver ativo pro segmento/tenant (ver 1.7). Se ativo:
   - Deve mostrar `enabled:true` e, ou uma sugestão de texto já gerada, ou nada ainda
     (nunca inventa sugestão).
   - Botão "Registrar como Atividade" — clique deve abrir o formulário de Nova Atividade
     **pré-preenchido** com o texto da sugestão.
7. Seção **"Histórico de Visitas"** (`AgendamentosLead`) — confirme que agendamentos
   existentes aparecem; crie um agendamento de teste se a tela permitir.
8. Seção **"Atividades"** (`AtividadesLead`) — o bloco mais denso:
   - Clique "+ Nova Atividade" → escolha um tipo → digite uma descrição com **pelo menos 15
     caracteres** (`TESTE ROTEIRO CRM - ligação de verificação`) → salvar. ✅ Aparece no topo
     da lista (mais recente primeiro), com o nome do atendente logado ao lado do horário
     (`· Seu Nome`), **sem** o badge dourado "🤖 Agente de IA" (essa atividade é humana).
   - Anexar um arquivo (áudio, imagem ou PDF, até 20MB) numa atividade nova. ✅ Preview
     aparece certo por tipo (player de áudio / thumbnail de imagem com lightbox / link "Abrir"
     de PDF).
   - Editar a atividade recém-criada (ícone de lápis) — mudar a descrição. ✅ Persiste.
   - Excluir a atividade de teste (ícone de lixeira, soft-delete). ✅ Some da lista.
   - Se este lead já tiver uma resposta automática do bot/reativação (ver Parte 2), confirme
     que aparece com o pill dourado **"🤖 Agente de IA"** no lugar do nome do atendente —
     feature testada nesta mesma sessão, confirme que ainda renderiza certo.

**Regra de negócio a validar:**
9. Tente registrar uma atividade com descrição curta (menos de 15 caracteres). ✅ Deve ser
   bloqueado, com mensagem clara (validado tanto no cliente quanto no servidor).

🧹 Remova o(s) lead(s)/atividades de teste ao final (ou deixe se for reaproveitar na Parte 2/3).

### 1.3 — Gestão de Leads (`/crm/leads`)

1. Abrir `/crm/leads`. ✅ Lista paginada de leads, com busca/filtro (confira o que a tela
   oferece: nome, telefone, e-mail, etapa, período).
2. Buscar por um lead de teste criado no passo anterior. ✅ Aparece corretamente.
3. Clicar num lead da lista. ✅ Deve levar (ou abrir) a mesma ficha do Kanban — confirme que
   os dados batem com o que você viu em 1.2.

### 1.4 — Catálogo de Atividades (`/crm/config/atividades`)

1. Abrir a tela. ✅ Lista de tipos de atividade do tenant — deve incluir, entre outros, o
   tipo **"Resposta Automática (IA)"** (ícone de robô, cor dourada) — seedado
   automaticamente, não crie um manualmente.
2. Criar um novo tipo: nome, ícone (via seletor `HybridIconSelector` — busca por nome de
   ícone Lucide/Material/Heroicons), cor, e o checkbox **"Entrada"** (`is_entrada`) — marque
   como entrada só se esse tipo representar o CLIENTE agindo (ex.: "Cliente Respondeu"),
   deixe desmarcado se for uma ação NOSSA (ex.: "Ligação Feita").
3. Escopo do tipo — teste os dois: "Padrão da Empresa" (visível pra todo cliente do tenant) e
   "Cliente Específico" (busque um cliente real via o combobox alfabético — lista já vem
   populada, filtro só ativa com 3+ letras digitadas).
4. Editar o tipo criado (nome, ícone, cor). ✅ Salva e reflete na lista e no formulário de
   Nova Atividade do Kanban.
5. Tentar excluir um tipo que já tem pelo menos 1 atividade registrada usando ele. ✅ Deve
   bloquear com mensagem explícita ("Esta atividade está registrada em N lead(s)...").
6. Excluir o tipo de teste sem nenhuma atividade vinculada. ✅ Soft-delete (some da lista).
7. Tentar recriar um tipo com o MESMO nome de um tipo já desativado no mesmo escopo. ✅ Deve
   funcionar normalmente (bug histórico já corrigido — nome desativado pode ser reutilizado).

### 1.5 — Personalização Kanban (`/crm/config/kanban`)

1. Abrir a tela. ✅ Lista de colunas do funil, cada uma com: nome de exibição, cor,
   `sla_hours` (prazo de estagnação — alimenta o agente `stage_stagnation`), e a seção
   **"Etapa Terminal (opcional)"** com 2 checkboxes: "Etapa de Ganho" / "Etapa de Perda".
2. Marcar os dois checkboxes ao mesmo tempo numa mesma coluna. ✅ Deve desmarcar
   automaticamente o outro (mútua exclusão no cliente) — e se forçar via API, o servidor
   também rejeita com 400 ("Uma etapa não pode ser Ganho e Perda ao mesmo tempo").
3. Marcar uma coluna de teste como "Etapa de Ganho", salvar. ✅ Badge "GANHO" aparece nessa
   coluna no Kanban (1.2).
4. Ajustar `sla_hours` de uma coluna pra um valor baixo (ex.: 1h) — usado no teste do agente
   `stage_stagnation` (1.7). ✅ Salva sem erro.
5. Criar uma coluna nova, reordenar colunas (se a tela permitir arrastar/setas). ✅ Reflete
   na ordem real do Kanban.
6. **Valor Estimado (novo, 2026-08-13):** seção "Valor Estimado (opcional)" com o checkbox
   "Exige valor estimado ao entrar nesta etapa". Marque uma coluna Ganho como estimativa
   também — ✅ o checkbox deve ficar desabilitado/desmarcado automaticamente (redundante, o
   Ganho já pede o valor real). Marque numa coluna NÃO-Ganho, salve. ✅ Badge âmbar "Exige
   valor est." aparece na listagem, e testado em 1.2.4b o move intercepta corretamente.

### 1.6 — Inteligência Artificial (`/crm/config/ia`)

1. Abrir a tela. ✅ Cabeçalho mostra o segmento resolvido do tenant + badge de status ("IA
   Ativa neste Segmento" ou aviso de bloqueio).
2. Bloco **"Prompt Mestre"** — somente leitura, mostra o prompt real usado pra qualificar
   lead (segmento + fallback global). ✅ Nota apontando pro Editor de Prompts do Master.
3. Bloco **"Regras Padrão do Segmento"** — somente leitura, lista as regras curadas pela
   Master (palavra-chave → tag/resumo/score).
4. Bloco **"Suas Regras Personalizadas"** — CRUD real do tenant:
   - Criar uma regra de teste (palavra-chave, tag, resumo modelo, score base).
   - Editar, depois excluir.
   ✅ Regra do tenant tem prioridade sobre a regra do segmento no fallback por
   palavra-chave (teste indireto: crie uma regra do tenant pra uma palavra-chave que já
   existe no segmento, com tag diferente — um lead novo com essa palavra deve pegar a tag
   do TENANT).
5. Bloco **"Critérios de Fit (ICP)"** (segmento, leitura) + **"Seus Critérios de Fit"**
   (tenant, CRUD) — mesma mecânica do bloco de regras, mas alimenta o `score_fit` (não o
   `score_prontidao`).
6. Se houver **sugestão de recalibração de score** pendente (gerada pelo cron diário
   `score_recalibration`, ver 1.7) — deve aparecer inline, junto da regra afetada, com botão
   de aplicar/descartar 1-clique (sem PIN, sessão já é a prova de identidade).
7. Teste real de qualificação: crie um lead novo (via `/api/crm/leads` ou formulário público,
   se o tenant tiver um) com uma mensagem que bata numa regra conhecida (do segmento ou do
   tenant). ✅ `tag_sonho`/`resumo_ia`/`score_prontidao` (e `score_fit`, se houver critério
   configurado) aparecem certos na ficha do Kanban.

### 1.7 — Agentes de Aceleração (`/crm/config/agentes`)

**Aba principal (configuração):**
1. Abrir a tela. ✅ Lista dos agentes disponíveis: `pendencia_atendimento` (absorveu o antigo
   `speed_to_lead`), `stage_stagnation`, `next_best_action`, `reactivation`,
   `score_recalibration`. Cada um com 3 estados: "Herdar do segmento" / "Forçar ativado" /
   "Forçar desativado", e o padrão do segmento sempre visível ao lado (somente leitura).
2. Pra cada agente, os parâmetros aparecem como chips clicáveis (`paramHints`) que já
   preenchem o valor padrão — clique num chip, confirme que preenche o campo.
3. **Force-ativar `pendencia_atendimento`** com parâmetros agressivos pra teste
   (`minutos_1o_contato`/`minutos_continuidade` bem baixos, ex. 1-2 min) num tenant/segmento
   de teste. ⚠️ Cuidado: isso pode gerar notificação real via WhatsApp/Slack se o tenant
   tiver canais reais configurados — considere nular temporariamente
   `evolution_api_url`/`slack_webhook_url` do tenant antes de forçar um scan real (via SQL,
   restaurando depois), a menos que você QUEIRA ver a notificação real chegar.
4. **Force-ativar `stage_stagnation`** — depende do `sla_hours` configurado por coluna (1.5).
5. **Force-ativar `next_best_action`** — dispara ao mover lead de etapa (1.2, passo 4) e/ou
   sob demanda pela ficha do lead.
6. **Force-ativar `reactivation`** — parâmetros: `dias_inatividade` (ex. baixe pra 1 dia só
   pra teste) e o toggle `requer_revisao_extra` (segmento sensível — nunca envia sozinho,
   mesmo aprovado).
7. **Force-ativar `score_recalibration`** — não opera sobre leads, sobre regras; roda no cron
   diário (04h) ou pode ser conferido direto em `/crm/config/ia` (1.6, passo 6).

**Aba "Aprovações Pendentes":**
8. Se o agente `reactivation` estiver ativo (sem `requer_revisao_extra`), qualquer envio
   automático aparece já como `EXECUTED` direto na Atividade do lead (badge "🤖 Agente de
   IA") — não passa por aprovação.
9. Se `requer_revisao_extra=true` estiver ativo num segmento sensível, uma proposta de
   reativação deve aparecer aqui como **pendente**, com o rascunho da IA **editável** antes de
   aprovar. Teste os 3 caminhos:
   - Aprovar sem editar → mensagem enviada de verdade via WhatsApp (ou `APPROVED_MANUAL` se o
     lead não tiver telefone).
   - Aprovar editando o texto → a versão editada é a que fica registrada/enviada.
   - Rejeitar → status vira `REJECTED`, nada é enviado.
10. Teste também o caminho alternativo de aprovação **sem sessão** (link de WhatsApp + PIN de
    6 dígitos) — se você tiver acesso a uma notificação real de teste: `GET
    /api/crm/agent/approve/[id]` abre o formulário de PIN; PIN errado → reformulário; PIN
    certo → executa.

### 1.8 — Fila de Resgate (`/crm/resgate`)

1. Abrir a tela. ✅ Tela **somente leitura** — mostra leads sem responsável elegível no
   momento (a plataforma já retenta sozinha a cada rodada do agente `pendencia_atendimento`;
   esta tela é diagnóstico, não uma ação manual).
2. KPIs no topo: total na fila, quantos estão sem responsável nenhum, tempo de espera.
3. Se você marcar TODOS os atendentes do cargo de distribuição como indisponíveis (1.9) e
   houver um lead pendente, ele deve aparecer aqui. Ao liberar um atendente, na rodada
   seguinte do agente (ou reload da tela, se ela reconsulta em tempo real) o lead deve sumir
   da fila — confirme que ele ganhou responsável de verdade (veja no Kanban).

### 1.9 — Disponibilidade do atendente (`/admin/usuarios`)

1. Abrir `/admin/usuarios`. ✅ Usuários com o cargo de distribuição (ex. "Corretor") mostram
   um botão "Ausência" (e badge **"AUSENTE"** quando já marcado).
2. Clicar "Ausência" num usuário de teste. ✅ Modal exige **data de retorno** (não é um
   simples toggle) — preencher e confirmar.
3. ✅ Badge "AUSENTE" aparece na lista imediatamente.
4. Tentar marcar ausência com data no passado. ✅ Deve rejeitar (400).
5. Clicar "Liberar" no mesmo usuário antes da data de retorno. ✅ Badge some, volta a ficar
   elegível pra distribuição/reatribuição na hora (não precisa esperar a data).
6. Teste de efeito real (se houver ≥2 usuários com o cargo de distribuição): marque UM deles
   ausente, force um novo lead a ser distribuído (crie um lead de teste sem dono, ou espere o
   agente de pendência escalar um) — ✅ o lead nunca vai pro atendente ausente.

### 1.10 — Master: `/admin/master/segments` (config que afeta todo o CRM)

Só acessível como Master. Pra cada segmento, os botões de ação relevantes ao CRM:

1. **"Agentes de Aceleração"** (botão raio) — espelha 1.7 no nível de segmento: ativar/
   desativar cada agente por padrão, editar parâmetros default.
2. **"Qualificação de Lead por IA (CRM)"** (botão teal) — toggle `crm_ia_ativa` (gate de uso
   do CRM, 0.2) + CRUD das regras padrão do segmento (espelha 1.6, camada segmento).
3. **"Critérios de Fit (ICP)"** — CRUD dos critérios de fit padrão do segmento.
4. **"Estratégias de Distribuição"** (se disponível) — lista ordenável de estratégias
   (`owner_of_asset`, `geo_area`, `round_robin`, `plantonista_fallback`) por segmento, com
   config por estratégia (tabela/coluna do "dono do ativo", nome do cargo de vendedor etc.).
   Adicione/remova/reordene uma estratégia de teste e confirme que a distribuição de um lead
   novo respeita a ordem.
5. **"Empresas"** — lista as empresas (tenants) daquele segmento; útil pra confirmar em qual
   segmento está o tenant que você está usando no resto do roteiro.

🧹 Reverta qualquer mudança de configuração de segmento feita só pra teste (toggle de agente,
regra de teste, estratégia de teste) antes de sair desta seção.

---

## Parte 2 — CRM + Mensageria (integração única)

**Pré-condição:** tenant com CRM + Mensageria contratados, **sem** Campanhas (pra isolar).
Confirme em `/mensageria/config` → aba "Bot" que existe um `bot_flow` ativo (M4.1) — se não
houver, ative um antes de começar, com um segmento que já tenha `crm_ia_ativa=true`.

### 2.1 — Lead orgânico via WhatsApp vira lead no CRM (Match Engine)

1. Mande uma mensagem real de WhatsApp (ou use `/mensageria/config` → aba "Bot" → "Testar
   bot" com uma inbox `webform`/`whatsapp`, sem risco de envio real se usar `webform`) pro
   número/inbox do tenant, com um texto real de intenção
   (`TESTE ROTEIRO CRM - quero comprar um apartamento de 2 quartos`).
2. ✅ Um lead novo aparece em `/crm/kanban` (coluna inicial), com `tag_sonho`/`resumo_ia`
   qualificados (se a regra bater) e o telefone/nome do contato.
3. Confirme em `/crm/atividades` (ou na ficha) que **não** existe atividade nenhuma ainda além
   das automáticas do bot — o lead nasceu direto da mensageria, sem passar por formulário do
   CRM.

### 2.2 — Badge de atribuição na conversa (Mensageria)

1. Abra `/mensageria` (Caixa de Entrada), ache a conversa do contato de teste.
2. ✅ Badge no cabeçalho da conversa mostrando "WhatsApp orgânico" (sem campanha por trás —
   correto, já que este tenant não tem Campanhas nesta parte do roteiro).
3. Confirme que "Ver no CRM →" (se existir) leva pro mesmo lead visto em 2.1.

### 2.3 — Bot (M4.1) respondendo → atividade "🤖 Agente de IA" no CRM

1. Continue a conversa do passo 2.1 com uma pergunta real que o bot deva responder (ex.:
   "quais bairros vocês têm imóveis?").
2. ✅ Bot responde na conversa (Mensageria).
3. Volte pro lead no Kanban (1.2) → aba Atividades. ✅ Uma nova atividade aparece com o pill
   dourado **"🤖 Agente de IA"** (não o nome de nenhum atendente), tipo "Resposta Automática
   (IA)", descrição contendo o texto real que o bot respondeu.
4. Registre manualmente uma atividade humana no mesmo lead (1.2, passo 8). ✅ As duas
   convivem na mesma lista, uma com badge de IA e outra com `· Nome do Atendente` — a
   distinção visual deve ficar clara lado a lado.

### 2.4 — Pergunta fora de escopo / handoff pra humano

1. Pergunte algo sem relação com o negócio (ex.: "qual a previsão do tempo?"). ✅ Bot admite
   que não sabe, sem inventar, sem chamar ferramenta errada.
2. Digite uma palavra-chave de handoff configurada (ex. "atendente", "humano" — confira em
   `/mensageria/config` → aba Bot quais estão configuradas) OU exceda o `maxTurns`
   configurado. ✅ Bot envia a mensagem de transição ("vou te conectar com um atendente") e
   para de responder sozinho.
3. Confirme na ficha do lead (Atividades) que a mensagem de HANDOFF em si **não** virou uma
   atividade de IA (é deliberadamente excluída — só respostas reais contam).

### 2.5 — Reativação automática (G6) enviando WhatsApp real + atividade IA

⚠️ Este teste envia mensagem real se o tenant tiver credencial Evolution real e o lead tiver
telefone real. Use um lead/telefone de teste que você controla, ou aceite que a mensagem vai
sair de verdade.

1. Ative o agente `reactivation` pro segmento/tenant (1.7, passo 6), com
   `dias_inatividade` baixo o bastante pra pegar um lead de teste parado.
2. Deixe um lead de teste sem nenhuma atividade nossa por tempo suficiente (ou backdate a
   última atividade via ficha, se a tela permitir editar data — senão, espere o prazo real).
3. Aguarde o próximo scan do agente (cron a cada poucos minutos) ou force via o endpoint de
   scan, se você tiver acesso.
4. ✅ Se `requer_revisao_extra=false`: mensagem sai automaticamente, `crm_agent_actions`
   marca `EXECUTED`, e a ficha do lead ganha uma atividade "🤖 Agente de IA" com o texto real
   enviado ("Reativação automática enviada via WhatsApp: ...").
5. ✅ Se `requer_revisao_extra=true`: nada é enviado sozinho — a proposta aparece em
   `/crm/config/agentes` → "Aprovações Pendentes" (ver 1.7, passos 9-10) pra decisão humana.

### 2.6 — Widget de chat na página do imóvel (M4.4) criando lead

1. Abra a página pública de um imóvel real deste tenant (`/imoveis/[id]`).
2. Clique na bolha de chat flutuante, mande uma mensagem real perguntando sobre O IMÓVEL DA
   PÁGINA especificamente ("quanto custa esse imóvel?"). ✅ Bot responde com o preço real
   (contexto de página — sabe a qual imóvel "esse" se refere).
3. Depois de uma troca real de mensagens com intenção clara, confirme que um lead novo (ou o
   mesmo, se o telefone/sessão já existia) aparece no Kanban, e que a atividade de resposta
   do bot também aparece com o badge de IA.

### 2.7 — "De quem é a bola" (pendência de atendimento) refletindo a Mensageria

1. Depois do bot responder (2.3), confirme (indiretamente, via comportamento) que o lead NÃO
   está na fila do agente `pendencia_atendimento` — a bola está com o cliente
   (`bola_com='cliente'`), não com a gente.
2. Faça o CLIENTE mandar uma mensagem nova e não responda (nem via bot, nem manual). ✅
   Depois do prazo configurado (`minutos_1o_contato`/`minutos_continuidade`), o agente deve
   escalar — verifique notificação (se canal configurado) ou o efeito de reatribuição/fila
   de resgate (1.8) depois de tempo suficiente.
3. Um atendente humano responde manualmente pela Caixa de Entrada da Mensageria (não pelo
   bot). ✅ A bola volta pra "com o cliente" — confirme que o lead sai de qualquer fila de
   pendência ativa.

🧹 Ao final: apague a(s) conversa(s)/contato(s) de teste (via `/mensageria/config` → Bot →
"Testar bot" → botão de reiniciar conversa, se usou esse caminho) e o(s) lead(s) de teste
criados nesta parte, revertendo qualquer toggle de agente que você ativou só pra este teste.

---

## Parte 3 — CRM + Campanhas de Marketing Digital (integração única)

**Pré-condição:** tenant com CRM + Campanhas contratados, **sem** Mensageria (isolamento).
Os testes desta parte usam o módulo REAL de Campanhas (`/admin/campanhas/*`) — a "Central de
Mídias" (`/crm/config/marketing`, tela de rastreio manual de campanha) foi removida por
completo em 2026-08-13 (decisão de produto: nenhuma fonte de custo manual/parcial representa
o custo comercial TOTAL de um negócio, ver `docs/CHECKPOINT.md`). Se você ainda encontrar essa
tela ou o botão "Central de Mídia" em `/crm`, é regressão — reporte.

### 3.1 — Clique de WhatsApp em anúncio vira lead com atribuição real

1. No módulo de Campanhas (`/admin/campanhas/*`), pegue o link de rastreio (`trackingId`) de
   um anúncio real de teste — ou use o clique simulado via `/api/r/[trackingId]`.
2. Clique no link. ✅ Redireciona pro WhatsApp com uma tag `[ref:...]` embutida na mensagem
   pré-preenchida.
3. Responda de fato essa conversa (real ou simulada via webhook de teste, se o tenant não
   tiver Mensageria neste cenário — nesse caso a resposta chega por outro canal manual, mas
   ainda referencia o `ref`).
4. ✅ Lead aparece no Kanban do CRM com `campaign_id` real vinculado — confirme abrindo a
   ficha (ou olhando `leads_staging.utm_campaign`/o nome da campanha, se exposto na UI).

### 3.2 — Lead via formulário do site (mecanismo B/C) vira lead com campaign_id

1. Se o tenant tiver um destino de formulário (CTA de anúncio apontando pra `/l/{slug}`),
   preencha o formulário público como se fosse um visitante real, chegando via o link
   rastreado do anúncio (`?ref=...`).
2. ✅ Lead aparece no CRM com `campaign_id` real — mesma verificação do passo anterior.
3. Preencha o MESMO formulário, mas SEM vir de um link rastreado (acesso direto). ✅ Lead
   ainda é criado normalmente, mas sem atribuição de campanha (orgânico) — nunca deve inventar
   uma campanha que não existiu.

### 3.3 — Negócio fechado no CRM propaga pra Visão 4 (CPA/ROAS real) do dashboard de Campanhas

1. No Kanban, mova o lead do passo 3.1 (ou 3.2) até a coluna marcada como **"GANHO"** (1.5),
   preenchendo um valor de venda real de teste (ex. R$ 450.000,00).
2. Vá no dashboard de Campanhas (`/admin/campanhas/dashboard`), seção "Funil de Receita"
   (Visão 4). ✅ A campanha que gerou esse lead deve mostrar `CPA real` e `ROAS real`
   refletindo o gasto real da campanha dividido pelo(s) negócio(s) fechado(s) — não mais
   `null`/zero.
3. ⚠️ Confirme que o CPA/ROAS usa o atributo booleano `is_ganho` da coluna do Kanban, não o
   nome da coluna — teste de regressão: renomeie a etapa de "Fechamento" pra qualquer outro
   texto (mantendo `is_ganho=true`) e confirme que o CPA/ROAS continua batendo certo (não
   deve quebrar só porque o nome mudou).

### 3.4 — Distribuição por dono do ativo (`owner_of_asset`)

Só relevante em segmento Imobiliário, ou qualquer segmento com a estratégia `owner_of_asset`
configurada (1.10, passo 4) usando a tabela real de imóveis (ou entidade equivalente).

1. Vincule um imóvel real a um corretor real (`corretor_fk` preenchido).
2. Crie um lead novo especificamente sobre esse imóvel (via API pública de prospecção, ou
   formulário da ficha do imóvel).
3. ✅ O lead deve ser atribuído automaticamente ao corretor dono daquele imóvel (Nível 1 da
   cascata de distribuição), aparecendo já com responsável no Kanban — sem passar pelas
   estratégias de geografia/round-robin, que são níveis de fallback.

### 3.5 — "Sugestão da IA" (next_best_action) usando contexto de campanha

1. Com o agente `next_best_action` ativo (1.7, passo 5), abra a ficha de um lead vindo de
   campanha (3.1/3.2) que já tenha qualificação (`tag_sonho`) e pelo menos uma atividade
   registrada.
2. Clique pra gerar/atualizar a sugestão (ou mova o lead de etapa, que dispara automático).
3. ✅ A sugestão da IA deve ser específica ao contexto real do lead (etapa atual, tempo nela,
   qualificação, atividades recentes) — nunca genérica, nunca citando dado que não existe.

🧹 Ao final: reverta o valor de venda/etapa de teste (ou apague o lead de teste inteiro,
cascata cuida do resto), remova qualquer imóvel/corretor de vínculo de teste feito só pra
3.4, e confirme no dashboard de Campanhas que os números voltaram ao estado anterior ao teste
(sem negócio de teste inflando CPA/ROAS reais).

---

## Parte 4 — Os 3 módulos juntos (CRM + Mensageria + Campanhas)

**Pré-condição:** tenant com CRM + Mensageria + Campanhas todos contratados (0.1). Este é o
cenário mais próximo de produção real — algumas convergências abaixo só existem quando os 3
módulos estão ativos ao mesmo tempo. ⚠️ Vários dos pontos desta Parte já foram validados
tecnicamente em sessões anteriores (documentado em `docs/CHECKPOINT.md` como Trilha C, T8/T9,
I1-I4) — o objetivo aqui é **re-confirmar na UI real**, não é a primeira vez que a plataforma é
testada nisso.

### 4.1 — Sidebar e navegação com tudo provisionado

1. Logue como usuário real deste tenant. ✅ A sidebar deve mostrar, ao mesmo tempo: categoria
   "CRM" completa (1.x), "Central de Mensagens" (Caixa de Entrada, Analytics, Configurações),
   e "Gestão de Campanhas de Marketing Digital" (Dashboard, Leads, Criativos, etc.) — sem
   nenhum item faltando por causa de outro módulo.
2. Confirme que nenhuma tela de um módulo trava/redireciona por engano pra outra.

### 4.2 — Caminho completo: anúncio → WhatsApp → bot → lead qualificado → atividade IA

Este é o teste "ponta a ponta" mais representativo do produto real.

1. Pegue o link de rastreio (`trackingId`) de uma campanha real de teste (Campanhas).
2. Clique nele → abre WhatsApp com `[ref:...]` embutido (3.1).
3. Responda a mensagem de fato — como agora o tenant TEM Mensageria, a resposta cai na Caixa
   de Entrada de verdade (não precisa de canal alternativo, diferente da Parte 3).
4. ✅ O bot (M4.1) responde automaticamente, se houver `bot_flow` ativo — confirme que a
   conversa mostra o badge de atribuição com o **nome real da campanha** (não "WhatsApp
   orgânico" — diferença chave em relação à Parte 2, onde não havia campanha nenhuma).
5. ✅ O lead aparece no Kanban do CRM já com `campaign_id` real E qualificado pela IA
   (`tag_sonho`/`resumo_ia`/`score_prontidao`).
6. ✅ Na ficha do lead, aba Atividades: a resposta do bot aparece com o badge "🤖 Agente de
   IA" — igual à Parte 2, só que agora o lead também carrega atribuição de campanha.
7. Mova o lead até a coluna "GANHO" com valor de venda de teste. ✅ CPA/ROAS real aparece na
   Visão 4 do dashboard de Campanhas (3.3) — igual à Parte 3, mas desta vez o caminho todo
   (clique → WhatsApp → bot → qualificação → negócio fechado) rodou com os 3 módulos reais
   ativos ao mesmo tempo, não simulado por partes.

### 4.3 — Match Engine: mesmo lead por 2 canais diferentes converge, não duplica

1. Escolha um lead de teste com telefone/e-mail conhecido.
2. Gere um 1º toque por um canal (ex.: clique de WhatsApp + resposta, via 4.2).
3. Gere um **2º toque diferente**, mesmo telefone/e-mail, por outro canal (ex.: preenche um
   formulário de captação do site, ou manda mensagem por outra inbox/webform).
4. ✅ Os dois toques devem convergir pro **mesmo** `lead_uuid` — confirme em `/crm/leads`
   (busca por telefone) que existe **1 lead só**, não 2. Abra a ficha e confirme que o
   `match_method` reflete como o 2º toque foi casado (telefone normalizado ou e-mail).
5. ✅ Ambos os toques devem estar refletidos em `marketing_eventos`/atividades do mesmo lead
   (histórico não se perde, só não duplica o lead em si).

### 4.4 — Contagem de leads bate entre CRM e Campanhas

1. No dashboard de Campanhas (`/admin/campanhas/dashboard`), anote o número de "Leads" (ou
   "Sinais de Interesse", dependendo do card) pro período/campanha usada nos testes acima.
2. Em `/crm/leads`, filtre pelo mesmo período/campanha (se houver filtro de campanha na
   tela). ✅ A contagem deve bater — ou, se os rótulos forem conceitos diferentes
   ("Sinais de Interesse" no lado de Campanhas conta clique bruto; "Leads identificados" no
   CRM conta lead com identidade real), a UI deve deixar isso claro pelos próprios rótulos,
   nunca prometer implicitamente que são a mesma coisa quando não são.

### 4.5 — Reativação automática (G6) num lead com origem de campanha

1. Repita o teste da Parte 2 (2.5), mas agora com um lead que tenha `campaign_id` real
   (originado em 4.2 ou 3.1).
2. ✅ A mensagem de reativação sai pelo mesmo canal real de Mensageria (não um canal
   separado por ser um lead "de campanha") e a atividade "🤖 Agente de IA" é registrada
   normalmente.
3. Se esse lead depois fechar negócio (mova pra "GANHO"), ✅ a atribuição de CPA/ROAS na
   Visão 4 continua correta — a reativação não deve "perder" a campanha original de origem.

### 4.6 — Fluxo de aprovação PIN via WhatsApp real (caminho `requer_revisao_extra`)

1. Com `requer_revisao_extra=true` ativo (1.7, passo 6) e Mensageria real disponível, force
   uma proposta de reativação pendente.
2. ✅ A notificação de aprovação (WhatsApp + PIN de 6 dígitos, ou Slack se configurado) deve
   chegar de verdade no canal real do tenant — diferente das Partes 1-3, aqui dá pra testar
   esse caminho ponta a ponta sem precisar simular.
3. Abra o link recebido, confirme o PIN, aprove (ou rejeite). ✅ Mesmo resultado esperado do
   passo 1.7.9, mas agora exercitando a notificação real, não só a aba "Aprovações
   Pendentes" da UI.

### 4.7 — Desprovisionar um módulo no meio do ciclo não corrompe nada

1. Com um lead de teste já em andamento (qualificado, com atividades, talvez até com negócio
   fechado), vá em `/admin/master/provisioning` e **desative** temporariamente o módulo de
   Mensageria (ou Campanhas) pra este tenant.
2. ✅ O CRM continua funcionando normalmente — o lead não desaparece, as atividades
   continuam visíveis, o funil de receita não quebra (só deixa de RECEBER dado novo daquele
   módulo, o histórico já gravado permanece).
3. ✅ A sidebar reflete a mudança (item do módulo desprovisionado some), sem erro 500 em
   nenhuma tela do CRM.
4. Reative o módulo. ✅ Tudo volta ao normal, sem duplicar nada que já existia.

🧹 Ao final desta Parte: remova todo lead/conversa/atividade de teste desta seção, reverta
qualquer desprovisionamento feito só pra 4.7, e confirme que os números de CPA/ROAS reais do
dashboard de Campanhas voltaram a refletir só dado real (sem negócio de teste inflando).

---

## Checklist de limpeza final (rodar depois de cada Parte)

- [ ] Todo lead com nome/descrição prefixado `TESTE ROTEIRO CRM` removido (cascata cuida de
      atividades, agendamentos, ações de agente vinculadas).
- [ ] Toggles de agente (Parte 1.7 / 2.5) revertidos ao estado original, a menos que a
      intenção seja realmente ativar em produção.
- [ ] `sla_hours`/valores de parâmetro alterados só pra acelerar teste, revertidos.
- [ ] Conversas/contatos de teste na Mensageria removidos ou resetados.
- [ ] Nenhum canal real (Evolution/Slack) deixado nulado por engano — confirme que voltou ao
      valor real, se você mexeu nisso pra evitar notificação durante teste.
- [ ] Provisionamento de módulo (Parte 4.7) revertido ao estado original em
      `/admin/master/provisioning`, se você desprovisionou algo só pra teste.
- [ ] Confirmar `npx tsc --noEmit` limpo se qualquer ajuste de código foi feito durante os
      testes (não deveria ser necessário — este roteiro é só de UI).
