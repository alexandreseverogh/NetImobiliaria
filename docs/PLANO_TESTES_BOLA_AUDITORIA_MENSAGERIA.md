# Plano de testes — Bola de atendimento, pasta "Aguardando resposta" e auditoria de resolução

**Escopo:** Mensageria (Caixa de Entrada e Painel do Gestor) e Master (Regimento do Segmento).
**Ambiente:** tenant Marketing Digital (`efbf62cf-…`), segmento "Gestão de Marketing Digital".
**Como usar:** execute um bloco por vez, na ordem. Marque cada passo como OK ou FALHOU e anote o que viu.
Ao concluir um bloco, avisamos juntos antes de seguir para o próximo.

**Regras que estão sendo testadas**
- Bola com a gente (`nos`): a última mensagem pública é do contato e ainda não foi respondida.
- Bola com o contato (`cliente`): nossa última resposta pública é mais recente.
- Resolvida: só por decisão humana. Uma conversa resolvida não tem bola.
- Nota interna nunca devolve a bola. Resposta pública do atendente ou do bot devolve.

---

## Bloco 1 — Caixa de Entrada: pasta "Aguardando resposta" (`/mensageria`)

| # | Passo | Resultado esperado |
|---|---|---|
| 1.1 | Abra `/mensageria`. Observe a lateral esquerda. | Primeira pasta é **"Aguardando resposta"** com um contador numérico, antes de "Todas". |
| 1.2 | Anote o número do contador. Clique em "Todas". Conte as conversas abertas de dias anteriores. | O contador de "Aguardando resposta" não muda ao trocar de pasta. |
| 1.3 | Clique em **"Aguardando resposta"**. | Lista mostra só conversas em que o contato escreveu por último e ainda não recebeu resposta nossa. O número de itens bate com o contador. |
| 1.4 | Observe a ordem da lista. | Mais antigas primeiro. |
| 1.5 | Em cada card da lista, leia a linha abaixo do texto. | Aparece "Aguardando resposta · há X dias" (ou horas/minutos). Quanto mais antiga, maior o tempo. |
| 1.6 | Observe o bloco "Período" da lateral com a pasta "Aguardando resposta" ativa. | Os campos De/Até somem, substituídos pela frase "Mostrando todas as pendências, independente da data". |
| 1.7 | Com a pasta "Aguardando resposta" aberta, confira se há conversas de dias anteriores. | Aparecem todas. Nenhuma é cortada pela data. |
| 1.8 | Clique em "Todas" e volte ao bloco "Período". | Os campos De/Até voltam a aparecer e filtram normalmente. |

**Verificação de consistência:** conte as conversas com "Aguardando resposta" no card. Elas devem corresponder às da pasta.

---

## Bloco 2 — Bola muda com as mensagens (`/mensageria`, conversa aberta)

Use uma conversa de teste (ou crie uma pelo botão "+ Nova conversa" com um contato de teste).

| # | Passo | Resultado esperado |
|---|---|---|
| 2.1 | Entre por WhatsApp/Formulário uma mensagem nova de um contato (ou use o contato de teste). Atualize a tela. | A conversa aparece em "Aguardando resposta" com "há 0 min"/"agora". |
| 2.2 | Abra a conversa e envie uma **resposta pública** pelo composer. | A conversa sai de "Aguardando resposta" (o contador diminui em 1). No card, a linha de pendência some. |
| 2.3 | Escreva uma **nota interna** (ícone de cadeado / "nota interna") e envie. | A conversa **continua** em "Aguardando resposta". A nota não devolve a bola. |
| 2.4 | Quando o contato responder de novo, confira a lista. | A conversa volta para "Aguardando resposta", com o relógio recomeçando do novo horário. |

---

## Bloco 3 — Resolver e reabrir conversa (`/mensageria`)

| # | Passo | Resultado esperado |
|---|---|---|
| 3.1 | Abra uma conversa **aguardando resposta**. Use a ação de **resolver** da thread. | A conversa some de "Aguardando resposta" e o contador cai. Aparece como resolvida (em "Todas", com filtro de status resolvida). |
| 3.2 | Abra essa conversa resolvida e use a ação de **reabrir**. | Se o contato **não** tiver outra conversa aberta, a conversa reabre. Se a bola estava com a gente, volta para "Aguardando resposta". |
| 3.3 | Com a conversa resolvida, faça o contato escrever de novo. | Surge uma **conversa nova** para o mesmo contato. A antiga continua resolvida. |
| 3.4 | Tente reabrir a conversa antiga enquanto a nova estiver aberta. | Mensagem de erro clara: "Este contato já tem outra conversa aberta nesta inbox. Resolva-a antes de reabrir esta." A conversa não reabre e a tela não quebra. |

---

## Bloco 4 — Painel do Gestor: aba "Auditoria de resolução" (`/mensageria/gestao`)

Pré-requisito: ter pelo menos algumas conversas resolvidas no período (faça isso nos blocos anteriores).

| # | Passo | Resultado esperado |
|---|---|---|
| 4.1 | Abra `/mensageria/gestao`. Observe as abas no topo. | Duas abas: **"Fila operacional"** (selecionada por padrão) e **"Auditoria de resolução"**. |
| 4.2 | Clique em "Auditoria de resolução". | Some a fila (KPIs e tabela). Aparece a lista de conversas resolvidas no período. |
| 4.3 | Confira o período (De/Até) no topo da página. Mude para um intervalo com resoluções e depois um sem resoluções. | A lista muda conforme o período. Sem resoluções, aparece "Nenhuma conversa resolvida neste período." |
| 4.4 | Observe a coluna **Sinais**. | Conversas sem sinal mostram "Sem sinais" em verde. Com sinal, aparecem etiquetas âmbar: "Sem resposta", "Resolvida rápido", "Após longo silêncio", "Cliente voltou". |
| 4.5 | Passe o mouse sobre uma etiqueta. | Aparece a explicação do sinal. |
| 4.6 | Marque "Mostrar só com sinais". | Some quem não tem sinal. Desmarque e tudo volta. |
| 4.7 | Confira a ordem. | As conversas com mais sinais aparecem primeiro. |
| 4.8 | Clique em "Como ler os sinais" (abaixo da tabela). | Expande com a explicação dos quatro sinais. |
| 4.9 | Clique numa linha da auditoria. | Abre o painel lateral com a **conversa completa**, mensagens em ordem cronológica, com data e hora. Nada é alterado. |
| 4.10 | No painel lateral, confira horários e notas internas. | Horário absoluto (dd/mm/aaaa hh:mm:ss). Notas internas aparecem marcadas. |
| 4.11 | Feche o painel e volte à aba "Fila operacional". | A fila volta normalmente, com os KPIs e a tabela. |

**Casos esperados de referência** (conjunto de teste de dados controlados):
- Conversa em que o contato escreveu há 10 min e ninguém respondeu, resolvida agora → sinais "Sem resposta" e "Resolvida rápido".
- Mesmo contato abriu conversa nova logo depois → sinal "Cliente voltou" na conversa anterior.
- Conversa respondida antes da resolução → **sem sinal**.

---

## Bloco 5 — Limites por segmento (Master, `/admin/master/segments`)

| # | Passo | Resultado esperado |
|---|---|---|
| 5.1 | Na tabela de segmentos, clique em **Regimento do Segmento** de "Gestão de Marketing Digital". | Abre a lista de ferramentas. Aparece o item **"Auditoria de Resolução (Mensageria)"** (ícone de prancheta, verde). |
| 5.2 | Clique em "Abrir" nesse item. | Abre o modal com três campos preenchidos: **Resolução rápida (min) = 15**, **Longo silêncio (h) = 48**, **Reincidência (dias) = 3**. |
| 5.3 | Troque o valor de "Resolução rápida" para `30` e clique em **Salvar**. | Aparece "Salvo" por 2 segundos. |
| 5.4 | Feche o modal, abra de novo. | O valor `30` continua salvo. |
| 5.5 | Digite `0` em qualquer campo e salve. | Mensagem de erro: "Todos os valores precisam ser números maiores que zero." Nada é gravado. |
| 5.6 | Volte para o valor `15` e salve. Depois abra `/mensageria/gestao` → Auditoria. | As conversas são reclassificadas com o novo limite (a etiqueta "Resolvida rápido" passa a depender de 15 minutos). |
| 5.7 | Faça o mesmo em outro segmento (ex.: "Venda de Carros"). | Os valores daquele segmento começam iguais aos padrões e não mudam os de Marketing Digital. |

---

## Bloco 6 — Verificações de consistência (cruzamento entre telas)

| # | Verificação | Resultado esperado |
|---|---|---|
| 6.1 | O contador de "Aguardando resposta" na Caixa bate com o número de conversas listadas na mesma pasta. | Sim. |
| 6.2 | Uma conversa resolvida na Caixa aparece na Auditoria do Painel do Gestor (no período da resolução). | Sim, com o nome de quem resolveu. |
| 6.3 | Quem resolveu aparece com o nome correto (o usuário logado no momento). | Sim. |
| 6.4 | Abrir a mesma conversa pela Auditoria e pela Caixa mostra o mesmo conteúdo. | Sim. |

---

## Registro de execução

| Bloco | Data | Testador | Passos OK | Passos com falha | Observações |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |

---

## Pontos que ainda não são testados automaticamente

- O envio real pelo WhatsApp (depende do número conectado) não entra nestes testes. A bola muda pelo registro da mensagem, não pelo envio.
- Conversas de canais externos (formulário, webchat) seguem a mesma regra, mas o teste manual foi feito principalmente pela Caixa com WhatsApp/manual.
