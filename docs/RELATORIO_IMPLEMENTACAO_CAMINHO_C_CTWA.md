# Relatório de Implementação: Adoção do Caminho C (Click-to-WhatsApp Nativo)

> Documento de guia para a implementação. Parte do relatório de referência
> `RELATORIO_ARQUITETURA_META_CRM_MENSAGERIA_WHATSAPP.md`, mas registra apenas as
> decisões tomadas e o que cada item exige. Este documento é revisado ponto a ponto antes
> de qualquer alteração de código.

---

## 1. Decisão arquitetural

**Cada tenant escolhe, de forma excludente, a via pela qual recebe os leads dos CTAs de WhatsApp
de seus criativos: Evolution API (QR Code) ou API Oficial da Meta.** Um tenant tem **um único
número de WhatsApp**, então a escolha vale para todas as campanhas dele.

- **Via Evolution (Caminho C)**: o número fica pareado por QR Code, e o aplicativo WhatsApp Business
  continua funcionando no celular. A atribuição vem de `externalAdReply.sourceId`.
- **Via API Oficial**: a atribuição vem de `referral.source_id`. O aplicativo no celular só continua
  funcionando com Coexistência (Caminho A), que exige a burocracia da Meta.

O Caminho C, quando escolhido pelo tenant, passa a ser o padrão para as campanhas. O redirect
`/api/r/[trackingId]` deixa de ser o caminho de atribuição principal em qualquer das duas vias.

Consequências dessa decisão:

- A atribuição de campanha passa a vir do **protocolo do WhatsApp** (`referral` / `externalAdReply`:
  `sourceId`, `ctwaClid`, `sourceUrl`), e não do texto `[ref:...]`. O cliente não consegue alterar
  esses dados.
- O anúncio é criado com `destination_type = WHATSAPP`. Não há mais redirect HTTP 302 no navegador.
- A métrica de **clique** passa a vir da Meta (Insights), não do nosso `CtaInteraction`.
- O `[ref:...]` continua existindo como **fallback** (para campanhas antigas ou canais que não
  entreguem metadados), mas deixa de ser o caminho principal.

### Risco aceito conscientemente
O Caminho C usa a **Evolution API (protocolo não oficial, Baileys)**. O relatório classifica esse
risco como **baixo/médio**, porque o tráfego é receptivo (o cliente inicia a conversa). A decisão
de adotar o C considera esse risco aceito. Se a estratégia mudar para a Cloud API oficial no futuro,
o caminho muda para o A (Coexistência), e a atribuição pelo `referral` continua válida.

---

## 2. Pré-requisitos do Caminho C (operacionais, não de código)

| # | Pré-requisito | Responsável | Observação |
|---|---|---|---|
| 1 | Número do divulgador no aplicativo **WhatsApp Business** | Cliente/tenant | Vinculado à Página do Facebook da empresa |
| 2 | Número pareado na Evolution API via QR Code | Plataforma (já existe) | Instância por tenant/cliente |
| 3 | Campanha criada com `destination_type = WHATSAPP` | Plataforma (a implementar) | Ver item 5 |
| 4 | Webhook da Evolution entregando `externalAdReply` | Plataforma (verificar) | Ver item 4 |

Os itens do Caminho A (verificação de empresa, App Review, Tech Provider, Embedded Signup) **não são
necessários** para o Caminho C.

---

## 3. Itens do relatório analisados

### 3.1. Seção 1.1: Regra de privacidade (Clique × Lead Identificado)

**Status: analisado e aceito, com ajustes de texto.**

- Concordância: o clique é anônimo, e o lead nasce na primeira mensagem. Confere.
- Ajuste 1: o telefone **nem sempre chega**. Pode vir só o identificador `@lid`. Caso já tratado
  (conversa sem número, aviso ao administrador).
- Ajuste 2: a atribuição **não é garantida** no redirect, mas **é garantida no Caminho C**
  (dados no protocolo, fora do texto). O relatório deve separar as duas situações. Como a decisão
  é o Caminho C, essa separação passa a ser apenas informativa.
- Ajuste 3: no Caminho C, o clique não passa pelo nosso servidor, então o Estágio 1 descrito no
  relatório deixa de ser nosso. Métrica de clique passa a vir da Meta.

**Esforço:** baixo (ajuste de texto).

### 3.2. Seção 4.1: Perda da campanha de origem (lacuna 1)

**Status: passa a ser o item central da implementação.** Com o Caminho C, a lacuna 1 deixa de ser
um problema de texto e vira a **fonte principal de atribuição**.

Trabalho previsto:
1. Extrair `referral` (Cloud API) e `externalAdReply` (Evolution) do webhook, incluindo `sourceId`,
   `ctwaClid`, `sourceUrl`, `headline`, `body`.
2. Fazer o lookup `sourceId` → `Ad.external_id` (`metaAdId`), com isolamento por tenant.
3. Gravar `ctwaClid` em `marketing_eventos` (necessário para a CAPI, item 3.5 do relatório).
4. Manter o `[ref:...]` como fallback.

**Esforço:** médio, de 1 a 2 dias. Depende de confirmar, com uma mensagem real de anúncio CTWA,
o formato exato do `externalAdReply` que a Evolution entrega. **Essa confirmação é o primeiro
passo da implementação.**

### 3.3. Seção 4.2: Bot atropela o humano (lacuna 2)

**Status: pendente de análise.** Vale para qualquer caminho. Afeta a experiência diária do atendente.

### 3.4. Seção 4.3: Simulação de digitação e alerta de queda (lacuna 3)

**Status: pendente de análise.**

### 3.5. Seção 4.4: Regularidade do Portfólio na Meta (lacuna 4)

**Status: pendente de análise.** Depende da situação administrativa do Business Manager.

### 3.6. Seções 5 a 8 (Evolution, custos, pré-requisitos da Coexistência, curiosos)

**Status: pendentes de análise.** Lembrando que a seção 7 (Coexistência) é do Caminho A e
**não se aplica** à decisão atual, exceto como referência.

---

## 4. Próximos passos (ordem proposta)

1. Confirmar o formato real do `externalAdReply` com uma campanha CTWA de teste (pré-requisito de 3.2).
2. Implementar a atribuição pelo `sourceId` (3.2).
3. Analisar e decidir a lacuna 2 (3.3).
4. Analisar e decidir a lacuna 3 (3.4).
5. Revisar os itens 5 a 8 à luz do Caminho C.

---

## 5. Criação da campanha com destino WhatsApp nativo (a implementar)

- O anúncio precisa ser criado com `destination_type = WHATSAPP` (em vez de `link_data` com URL
  rastreada).
- O `trackingId` e o redirect deixam de ser usados no caminho principal.
- Revisar a montagem do criativo em `metaAdsAdapter.ts` e o `campaigns/route.ts`.

**Esforço:** médio. Depende de confirmar os parâmetros exatos do `destination_type` na Graph API
v21 (verificação antes de implementar).

---

## 6. Registro de revisão

| Item | Status | Esforço estimado | Data |
|---|---|---|---|
| 1.1 Regra de privacidade | Analisado, aceito com ajustes | Baixo | 2026-11-19 |
| 4.1 Atribuição por `sourceId` | Central, pendente de confirmação do formato | Médio (1 a 2 dias) | 2026-11-19 |
| 4.2 Bot × humano | Pendente | — | — |
| 4.3 Digitação e alerta de queda | Pendente | — | — |
| 4.4 Regularidade Meta | Pendente | — | — |
| 5 a 8 | Pendente | — | — |

---

## 7. Decisão sobre o bot e a Evolution API

**Premissas confirmadas:**
- Não haverá Coexistência (Caminho A), pelo menos por enquanto.
- Cada tenant tem um único número e escolhe, de forma excludente, a via: Evolution ou API Oficial.
- Há preocupação com banimento do número na Evolution, principalmente por volume e padrão de envio do bot.

**Decisão adotada: Fase 2, com teste prático.**
- O bot atua nas duas vias. Na Evolution, passa a valer uma camada de controles para reduzir o risco.
- Antes de liberar para todos, testamos com um tenant piloto e medimos o volume real de envios.

**Controles previstos para o bot na Evolution (a implementar):**
1. Teto de envios por minuto, por hora e por dia, por número.
2. Intervalo mínimo entre mensagens do bot (inclusive entre fotos de uma mesma resposta).
3. Indicador de digitação antes de cada resposta, se o provider aceitar.
4. Chave de desligamento do bot por tenant, no painel.
5. Registro de volume de envios por número, para medir o risco no piloto.

**Critérios de teste (a definir com você):**
- Tenant piloto.
- Valores dos tetos (sugestão inicial a confirmar).
- Período de observação.
- Sinais de alerta que pausam o bot automaticamente (por exemplo, falha de envio em sequência).

**Observação sobre a API Oficial:** o bot continua limitado à janela de 24h. Templates seguem como
pendência para a reativação e o follow-up fora da janela.

---

## 8. Especificação detalhada da Fase 2 (a implementar, após aprovação)

> Status: **especificação apenas. Nenhum código foi alterado.** A implementação só começa depois da
> revisão deste documento.

### 8.1. Escopo

Controles de envio do bot para tenants que usam a **Evolution API**, com aba editável em
**Dados da Empresa**, aplicação dos limites no envio real e pausa manual por tenant. Tenants na API
Oficial continuam com o comportamento atual (janela de 24h), sem os controles de volume.

**Tenants do piloto:** "Artemis9" (`b97b25b1-0f04-4cf6-8a59-12c49dcbafeb`) e "Net Imobiliária"
(`c828d003-6213-4464-aa38-6c5d10a0aa9a`). Ambos usam Evolution hoje.

### 8.2. Modelo de dados (migração)

Novas colunas em `public.tenants`, todas com valor padrão, para que o tenant herde a regra sem
precisar configurar nada:

| Coluna | Tipo | Padrão | Restrição | Significado |
|---|---|---|---|---|
| `bot_send_per_min` | INT | 20 | 1 a 200 | Máximo de envios do bot por minuto |
| `bot_send_per_hour` | INT | 200 | 1 a 5000 | Máximo de envios do bot por hora |
| `bot_send_per_day` | INT | 1000 | 1 a 50000 | Máximo de envios do bot por dia |
| `bot_send_interval_ms` | INT | 1500 | 0 a 10000 | Intervalo mínimo entre envios consecutivos do bot |
| `bot_typing_enabled` | BOOLEAN | true | — | Mostrar "digitando..." antes de cada resposta |
| `bot_paused` | BOOLEAN | false | — | Pausa o envio automático do bot no tenant inteiro |

Regras da migração:
- `ADD COLUMN IF NOT EXISTS` e `CHECK` com os intervalos acima, para ser idempotente.
- Entra no lote `prisma/deploy-batch-vps-pendente.sql`, dentro do `BEGIN; ... COMMIT;`, na ordem
  de dependência.
- Aplicada duas vezes no banco local com `ON_ERROR_STOP=1` antes de dar a tarefa por concluída.
- O aviso "DEPLOY VPS — banco pendente" em `docs/CHECKPOINT.md` é atualizado.

### 8.3. Contagem de envios (fonte da verdade)

Não se cria contador novo. O volume é contado sobre a própria tabela de mensagens:

```
mensageria.messages
  direction = 'outbound'
  sender_type = 'bot'
  tenant_id = <tenant>
  channel = Evolution (via inbox.provider = 'evolution')
```

Janelas: último minuto, última hora e hoje (fuso `America/Sao_Paulo`). A contagem é feita por
tenant, porque cada tenant tem um único número, então o limite por tenant é o limite por número.

Índice a criar para a consulta ficar barata: `(tenant_id, direction, sender_type, created_at)`,
parcial em `sender_type = 'bot'`.

### 8.4. Aplicação dos limites no envio

Ponto de aplicação: `src/lib/mensageria/botAdapter.ts`, função `deliverIfWhatsApp` e o envio de
cards/fotos, antes de chamar `sendWhatsAppMessage` / `sendWhatsAppMedia`.

Ordem de verificação antes de **cada** envio do bot:

1. **Pausa do tenant (`bot_paused`)**: se verdadeiro, o bot não envia nada. A mensagem não é
   descartada: a conversa fica com a bola com a plataforma, e o atendente humano é avisado.
2. **Teto por minuto, hora e dia**: se algum teto foi atingido, o envio é adiado, não descartado.
   O envio é reagendado para quando a janela liberar. Nunca responder "pela metade".
3. **Intervalo mínimo**: se o último envio do bot ao mesmo número foi há menos de
   `bot_send_interval_ms`, o envio aguarda o tempo restante.
4. **Digitação**: se `bot_typing_enabled`, envia o indicador de presença antes do texto (ver 8.6).

Regra de fila: como o envio pode ser adiado, as respostas do bot entram numa fila simples por
tenant, processada em ordem. Mensagens de handoff e de erro têm prioridade sobre as demais.

### 8.5. Alertas automáticos (sem pausar sozinho na primeira versão)

- Ao atingir 80% de qualquer teto, registra um evento `bot_limit_warning` em
  `mensageria.conversation_events` e notifica o administrador pelo canal de alertas do tenant
  (`whatsapp_alerta`), uma vez por janela.
- Ao atingir 100% de um teto, registra `bot_limit_reached`.
- Falhas de envio consecutivas (3 seguidas) registram `bot_send_failures` e notificam.
- **Pausa automática fica fora desta versão.** A pausa é sempre manual, pelo campo `bot_paused`.
  A decisão de pausa automática será tomada depois de medir o piloto.

### 8.6. Indicador de digitação

Antes de implementar, verificar na documentação oficial da Evolution API a rota de presença
(`sendPresence` ou equivalente, com estado `composing` e duração). A implementação só é feita com
a rota confirmada. Se a Evolution não oferecer a rota na versão em uso, o campo fica desativado e
o intervalo de 8.4 cumpre o papel de espaçamento.

### 8.7. Interface: aba nova em Dados da Empresa

- Nova aba **"Envio do Bot"** em `src/app/admin/dados-empresa/page.tsx`, na lista `TABS`.
- Visível quando o tenant tem Mensageria contratada (`modulos.comunicacao`), o mesmo critério da
  aba "Comunicação".
- Componente novo: `src/components/admin/dados-empresa/BotEnvioSection.tsx`.
- Campos:
  - **Pausar o bot** (interruptor), com aviso: "Enquanto pausado, o bot não responde a nenhum
    contato. As conversas ficam com a equipe."
  - **Máximo por minuto**, **por hora** e **por dia** (campos numéricos, com os limites de 8.2).
  - **Intervalo entre mensagens** (em milissegundos, com dica de valor sugerido).
  - **Mostrar "digitando..."** (interruptor).
- Um único botão "Salvar" no rodapé da seção, mostrando "Salvo" por 2 segundos. Mesmo padrão das
  outras seções da página.
- Validação no cliente e no servidor, com a mensagem de erro exibida no próprio campo.

### 8.8. API

Reaproveita a rota existente `GET/PUT /api/admin/dados-empresa/perfil`, adicionando seis chaves à
`EDITABLE_FIELDS`:

| Chave da API | Coluna |
|---|---|
| `botSendPerMinute` | `bot_send_per_min` |
| `botSendPerHour` | `bot_send_per_hour` |
| `botSendPerDay` | `bot_send_per_day` |
| `botSendIntervalMs` | `bot_send_interval_ms` |
| `botTypingEnabled` | `bot_typing_enabled` |
| `botPaused` | `bot_paused` |

- Permissão: `requireAnyApiPermission(request, ['dados-empresa'], 'READ'|'UPDATE')`, o mesmo da
  rota atual.
- Booleanos e inteiros são validados com os intervalos de 8.2. Valor fora do intervalo retorna 400
  com mensagem clara.
- A mesma rota continua sendo a fonte única dos dados da empresa.

### 8.9. Regras de coexistência com a janela de 24h

- Tenant na **Evolution**: vale 8.4, sem janela de 24h.
- Tenant na **API Oficial**: vale a janela de 24h já implementada. Os limites de 8.2 não se aplicam,
  e a pausa (`bot_paused`) continua valendo.
- A troca de via do tenant não altera os valores configurados.

### 8.10. Testes de aceitação (antes de liberar o piloto)

1. **Limite por minuto**: configurar 3 por minuto, disparar 6 respostas e confirmar que as 3
   primeiras saem no minuto, e as demais saem no minuto seguinte, sem perda.
2. **Limite por dia**: configurar 5 por dia, esgotar e confirmar que nenhuma resposta sai além do
   limite e que o alerta de 100% é registrado.
3. **Intervalo**: configurar 3000 ms e confirmar o espaçamento real entre as mensagens.
4. **Pausa**: ligar a pausa, enviar uma mensagem de contato e confirmar que o bot não responde e que
   a conversa aparece com a equipe. Desligar e confirmar que o bot volta a responder.
5. **Persistência**: salvar, recarregar a página e confirmar os valores.
6. **Validação**: enviar valores fora dos intervalos e confirmar a rejeição com mensagem clara.
7. **Isolamento**: confirmar que a alteração no "Artemis9" não afeta o "Net Imobiliária".
8. **Tenant na API Oficial**: confirmar que os limites não bloqueiam o envio, e que a pausa funciona.
9. **Regressão**: confirmar que o atendimento humano e o envio manual não passam pelos limites.

### 8.11. Métricas do piloto (para decidir a Fase 2 de verdade)

Coletar por tenant e por dia, durante o período de observação:
- Envios do bot por minuto, hora e dia (pico e média).
- Quantidade de vezes em que um teto foi atingido.
- Falhas de envio e respostas recebidas com erro do provider.
- Quantidade de conversas em que o humano assumiu depois de uma resposta do bot.
- Ocorrência de desconexão da instância.

A decisão de liberar o bot para todos os tenants da Evolution depende desses números, não de
estimativa.

### 8.12. Itens de confirmação

1. **Em aberto.** Rota de presença da Evolution (8.6), a ser verificada na documentação da versão
   em uso antes de implementar o indicador de digitação.
2. **Confirmado: manter na fila.** Quando o envio é adiado por teto, a resposta espera na fila
   até a janela liberar. Nada é descartado.
3. **Confirmado: `whatsapp_alerta`.** Os alertas de 8.5 vão para o número de alerta do tenant.

### 8.13. Esforço estimado

| Parte | Esforço |
|---|---|
| Migração e lote de deploy | Baixo (menos de 1 hora) |
| API (campos na rota de perfil) | Baixo (1 a 2 horas) |
| Aba e componente de interface | Médio (de meio dia a 1 dia) |
| Contagem e aplicação dos limites no envio, com fila | Médio a alto (de 1 a 2 dias) |
| Indicador de digitação (depende da rota) | Baixo, se a rota existir |
| Alertas de limite e falha | Baixo a médio (de meio dia a 1 dia) |
| Testes de aceitação (8.10) | Médio (de 1 a 2 dias) |
| **Total estimado** | **De 4 a 6 dias úteis** |

### 8.14. Ordem de implementação (após aprovação)

1. Confirmar os três itens de 8.12.
2. Migração + lote de deploy + checkpoint.
3. API e aba de interface, com persistência.
4. Contagem de envios e índice.
5. Aplicação dos limites, intervalo e fila no envio.
6. Pausa manual.
7. Indicador de digitação, se a rota for confirmada.
8. Alertas de 80%, 100% e falhas consecutivas.
9. Testes de aceitação (8.10).
10. Liberação do piloto nos dois tenants e início do período de observação (8.11).

---

## 9. Análise dos itens do relatório de referência

> Cada item do relatório `RELATORIO_ARQUITETURA_META_CRM_MENSAGERIA_WHATSAPP.md` é analisado
> ponto a ponto, com o que concordamos, o que ajustar, as verificações pendentes e o esforço.

### 9.1. Item 3.1: Impacto do formato do criativo (Redirect × CTWA nativo)

**Status: analisado, com ajustes de texto e verificações pendentes.**

**Concordamos com:**
- No **redirect**, a Meta trata o clique como link externo. A janela gratuita de 72h não se aplica
  (vale só para anúncios com destino WhatsApp), e o `referral` não chega ao WhatsApp.
- No **CTWA nativo**, o WhatsApp recebe `sourceId` e `ctwa_clid`, que são os dados usados na
  atribuição. Essa é a base da decisão pelo Caminho C.

**Ajustes necessários no relatório:**
1. **Percentual de perda (20% a 40%)**: sem fonte. Tratar como estimativa ou remover até haver fonte.
2. **Janela de 72h na Evolution**: a 72h só se aplica à API Oficial. Na Evolution, não há cobrança por
   mensagem, então a janela não é benefício nem custo. O relatório deve dizer isso.
3. **Página vinculada**: para criar anúncio com destino WhatsApp, o número precisa estar vinculado à
   Página do Facebook. O item não menciona essa exigência, que é condição do Caminho C.
4. **`externalAdReply` não verificado**: nunca confirmamos se a Evolution entrega `sourceId` e
   `ctwaClid` no webhook. Marcar como não verificado.

**Verificações pendentes (antes de implementar a atribuição, item 4.1):**
- Confirmar na documentação da Meta a exigência de Página vinculada para um número usado pela Evolution
  como destino de CTWA.
- Confirmar a origem do número de 20% a 40%, ou tirá-lo do relatório.
- Confirmar, com uma mensagem real de anúncio CTWA, o formato do `externalAdReply` entregue pela Evolution.

**Esforço:**
- Ajuste de texto no relatório: baixo, algumas horas.
- Verificações de documentação: baixo, algumas horas.
- Confirmação do `externalAdReply` com mensagem real: parte do item 4.1 (1 a 2 dias no total).

### 9.2. Item 3.2: Matriz comparativa das três arquiteturas

**Status: analisado, com ajustes na matriz.**

**Concordamos com:**
- **Custo**: a API Oficial é cobrada por mensagem fora das janelas gratuitas. A Evolution não tem
  cobrança da Meta, pois usa a linha do celular.
- **Risco de banimento**: a Cloud API é oficial. A Evolution (caminhos B e C) usa protocolo não
  oficial, com risco baixo/médio, o que justifica os controles da seção 8.
- **Experiência de clique**: o redirect (B) passa pelo navegador. O CTWA (A e C) abre o WhatsApp direto.
- **Burocracia**: a Cloud API exige verificação, App Review e Tech Provider. O C exige apenas vincular
  o número à Página. O B não exige nada.

**Ajustes necessários na matriz:**
1. **Caminho A sem Coexistência não mantém o aplicativo no celular.** A linha "App continua
   funcionando" diz "Sim", mas isso só vale com Coexistência, que está descartada por enquanto. A
   coluna precisa indicar que, na nossa situação, a Cloud API tira o aplicativo do celular.
2. **Linha de confiabilidade da atribuição.** A matriz deve comparar a confiabilidade, não só o
   mecanismo. No B, a identificação depende do `[ref:]` no texto, que o cliente pode apagar. Esse é o
   motivo central da decisão pelo C.
3. **Três linhas a incluir:**
   - **Reativação e follow-up fora de 24h**: A exige templates, ainda não implementados. B e C não
     têm esse recurso, e a reativação pela Evolution aumenta o risco.
   - **Controles de volume**: B e C precisam deles por causa do risco de banimento. A não precisa.
   - **Pré-requisito no código**: A já tem integração Cloud. C exige extrair `externalAdReply` na
     Evolution, ainda não verificado.
4. **Coluna de status na decisão:**
   - Caminho C: **adotado para as campanhas**.
   - Caminho A: **descartado por enquanto** (sem Coexistência).
   - Caminho B: **não usado para campanhas**.

**Esforço:** baixo para ajustar a matriz e incluir as linhas novas (algumas horas). Os pré-requisitos
de código já estão estimados nos itens 4.1 e 8.

### 9.3. Item 4.1: Perda da campanha de origem (lacuna 1)

**Status: analisado, com correções no diagnóstico e na implementação.**

**Diagnóstico corrigido.** A descrição original misturava dois cenários. Com a adoção do CTWA nativo
para as campanhas:
- **Redirect (caminho B)**: o cliente pode apagar o `[ref:...]` pré-preenchido, e o lead cai como
  orgânico. Esse caminho não é mais usado nas campanhas.
- **CTWA nativo (caminho C)**: a atribuição vem do `sourceId`, no protocolo da mensagem. O cliente não
  consegue alterá-lo. O risco real é a plataforma **não capturar** esse dado, o que faria todo lead de
  anúncio cair como orgânico. É uma falha de implementação nossa, não uma ação do cliente.

**Concordamos com:** o diagnóstico de que a atribuição depende só do texto, e a solução de usar o
identificador do anúncio enviado pela Meta.

**Ajustes necessários no relatório de referência:**
1. **Evolução não entrega `externalAdReply` hoje.** O relatório diz que o webhook já lê esse campo na
   linha 136, mas não há nenhuma referência a `externalAdReply`, `sourceId` ou `ctwa` no código da
   Evolution. Precisa ser construído.
2. **Cloud API não lê `referral` hoje.** O arquivo do webhook existe, mas não trata o campo. Precisa
   ser construído.
3. **Nome do campo.** Para anúncios Meta, o ID está em `metaAdId` (preenchido em 29 de 33 anúncios).
   `external_id` é uma coluna genérica de várias redes, preenchida em 7 de 33, e não está mapeada no
   schema Prisma. A busca deve usar `metaAdId` para Meta e `external_id` para as demais redes.
4. **Busca por ID da Meta inexistente.** `resolveCtaRef` procura só por `trackingId`, slug de destino e
   `manual_ref`. A busca pelo ID do anúncio precisa ser criada.
5. **`ctwaClid` sem destino.** O relatório manda gravar em `marketing_eventos` para a CAPI (item 8.4),
   mas essa tabela não tem coluna para ele. Verificar o schema antes de implementar, e incluir a coluna
   na migração do lote de deploy.
6. **Anúncios sem `metaAdId`.** Dos 33 anúncios, 4 não têm esse ID. Para eles, a atribuição pelo
   `sourceId` não funciona. Precisam ser tratados à parte, ou ficam dependendo do `[ref:]`.

**Verificação obrigatória antes de implementar:** confirmar, com uma mensagem real de anúncio CTWA
enviada pela Evolution, o formato do `externalAdReply` entregue no webhook. Sem isso, a extração pode
ser feita no formato errado.

**Esforço:**

| Item | Esforço |
|---|---|
| Confirmar formato do `externalAdReply` com mensagem real | Baixo, depende de anúncio CTWA ativo |
| Extrair `externalAdReply` na Evolution | Baixo a médio |
| Extrair `referral` na Cloud API | Baixo |
| Busca por `metaAdId` e `external_id` em `resolveCtaRef` | Baixo (algumas horas) |
| Coluna para `ctwaClid`, com migração e lote de deploy | Baixo |
| Tratamento dos 4 anúncios sem `metaAdId` | Baixo |
| **Total** | **De 1 a 2 dias**, principalmente pela verificação do formato real |

### 9.4. Item 4.2: Bot atropela o humano (lacuna 2)

**Status: analisado, com correções de referência e de solução.**

**Confirmado no código:**
- Uma mensagem `fromMe` (enviada pelo celular do tenant) é gravada como outbound com
  `senderType: 'system'`, mas **não pausa o bot**. O bot só é chamado para mensagens inbound de contato
  (`ingest.ts`, condição `direction === 'inbound' && senderType === 'contact'`).
- O bot só para se a conversa tiver `assignee_id` ou se `bot_sessions.active` for falso. Responder pelo
  celular não define nenhum dos dois. Por isso, na próxima mensagem do cliente, o bot responde por cima
  do humano.
- A Cloud API não trata `smb_message_echoes`. Isso não tem efeito enquanto a Coexistência estiver
  descartada.

**Correções no relatório de referência:**
1. **Referências de linha desatualizadas.** O processamento de `fromMe` foi movido para
   `src/lib/whatsapp/evolutionEventProcessor.ts`. A rota de webhook não contém mais os trechos citados
   (`recordOutboundFromTenant`, linhas 33–54, 115–129, 136).
2. **Distinção entre eco do bot e resposta humana.** O relatório sugere verificar se o `external_id` já
   existe. Essa é a abordagem correta, e é viável porque o código já grava o `external_id` do envio do
   bot logo após o envio (`botAdapter.ts`, linha 505). Assim:
   - `fromMe` com `external_id` já existente = eco do próprio bot → **não pausa**.
   - `fromMe` com `external_id` novo = humano respondendo pelo celular → **pausa o bot**.

**Riscos a tratar:**
- **Corrida entre eco e gravação.** Se o eco chegar antes do `UPDATE` que grava o `external_id`, o eco
  do bot seria tratado como humano. Precisa ser testado com a ordem real de eventos da Evolution.
- **Pausa persistente.** Enquanto o humano não devolver a conversa, o bot fica quieto. O mecanismo é o
  mesmo do handoff (`bot_sessions.active = false`).

**Esforço:**

| Item | Esforço |
|---|---|
| Distinguir eco do bot de resposta humana pelo `external_id` | Baixo a médio (algumas horas) |
| Pausar o bot e registrar o evento de takeover (reusa o mecanismo do handoff) | Baixo |
| Testar a ordem real dos eventos (corrida) com conversa real | Médio |
| **Total** | **De 1 a 2 dias** |

### 9.5. Item 4.3: Simulação de digitação e alerta de queda (lacuna 3)

**Status: analisado. Dois pontos confirmados, um detalhe a acrescentar.**

**Confirmado no código:**
- **Sem simulação de digitação.** O envio de texto (`evolutionSend.ts`, linha 41) envia só `number`,
  `text` e `linkPreview`. Não há `delay` nem indicador de presença.
- **Sem intervalo entre fotos.** Os envios de imagens do bot são feitos em sequência, em laço, sem
  espera entre eles (`botAdapter.ts`, linhas 674 e 688).
- **Eventos de conexão descartados.** O webhook filtra e ignora os eventos que não são de mensagem ou
  contato (`route.ts`, linha 35). O `connection.update` é descartado sem aviso.

**Detalhe a acrescentar ao relatório:**
- **O evento de conexão já está assinado.** A configuração da instância inclui `CONNECTION_UPDATE`
  (`evolutionServer.ts`, linha 74). Ou seja, a Evolution envia o evento e a plataforma o descarta. A
  correção é tratar o evento que já chega, sem assinar nada novo.
- **Digitação e intervalo também reduzem o risco de banimento.** Espaçar as mensagens e mostrar
  digitação deixa o envio mais parecido com o de uma pessoa. Por isso, esse item se conecta aos
  controles de volume da seção 8, e depende da mesma verificação: a rota de presença da Evolution
  (item 8.6).

**Esforço:**

| Item | Esforço | Observação |
|---|---|---|
| Indicador de digitação (`delay` e presença) | Baixo | Depende da rota de presença na versão em uso (seção 8.6) |
| Intervalo entre fotos | Baixo | Já previsto no controle de intervalo (seção 8.4) |
| Tratar `CONNECTION_UPDATE` e avisar quando o estado for de fechamento | Baixo (algumas horas) | Usa o canal de alerta do tenant (`whatsapp_alerta`), já confirmado |
| **Total, sem a digitação** | **Menos de 1 dia** | |

### 9.6. Item 4.4: Regularidade administrativa do Portfólio na Meta (lacuna 4)

**Status: analisado. É um pré-requisito de situação, não um item de código.**

**Confirmado:**
- Com o Portfólio Empresarial restrito, a Meta bloqueia as chamadas da API com o erro
  `API access blocked` (registrado no checkpoint, em 12/10/2026).
- Com o Portfólio restrito, nenhum anúncio pode ser criado nem veiculado. Como o Caminho C é um
  anúncio CTWA, esse item bloqueia tudo que depende de campanhas.

**O que o relatório deixa de dizer:**
1. **A situação não tem resolução registrada.** A restrição foi registrada em 12/10/2026, com prazo de
   31 dias para pedir análise à Meta. Esse prazo venceu por volta de 12/11/2026. O checkpoint não diz se
   a análise foi pedida nem se a restrição foi removida. Hoje é 19/11/2026, e a situação atual precisa
   ser confirmada com o titular do Portfólio.
2. **Não sabemos se a restrição atinge os tenants de teste.** O checkpoint cita o Portfólio "Artemis4",
   no qual estaria a Página "Artemis9". Os tokens de "Artemis9" e "Net Imobiliária" estão cadastrados,
   com validade até janeiro de 2027. Validade do token não garante acesso: a restrição pode bloquear
   mesmo com token válido. O token de "Marketing Digital" venceu em 23/07/2026.
3. **Validar os tokens não altera nada.** A plataforma já tem a verificação de credenciais
   (`validateCredentials`), que faz uma leitura simples. Ela mostra se o acesso está bloqueado, sem criar
   nem alterar anúncios.

**Ações fora do código:**
- Verificar no Business Manager, em Configurações do Portfólio, se há restrição e qual é o estado.
  Se houver, o pedido de análise deve ser feito ou acompanhado pelo titular.
- Enquanto a restrição estiver ativa, o Caminho C não pode ser validado de ponta a ponta.

**Esforço:**

| Item | Esforço | Responsável |
|---|---|---|
| Verificar a situação no Business Manager | Menos de 1 hora | Titular do Portfólio |
| Validar os tokens dos tenants de teste (leitura, sem alterações) | Baixo (minutos) | Plataforma |
| Resolver a restrição | Não depende de código; o prazo é definido pela Meta | Titular do Portfólio |

### 9.7. Item 5.1: Estabilidade e duração da conexão da Evolution

**Status: analisado. As afirmações gerais são externas e precisam de fonte antes de servir de base.**

**Consultado no ambiente (somente leitura):**
- A Evolution responde na porta 8081 e tem duas instâncias:
  - `hub-marketing-digital`: conectada (`open`).
  - `t-c3fc15b77033` (teste): não conectada (`connecting`).
- O container da Evolution está no ar há 6 horas. A instância principal continua conectada depois da
  reinicialização. É um indício a favor da persistência da sessão, mas um único caso não comprova o
  prazo de 3 a 6 meses.

**Concordamos com:** as causas de instabilidade citadas são plausíveis: atualizações de protocolo da
Meta, erros de descriptografia (Bad MAC) e desconexão manual pelo celular.

**Ajustes necessários no relatório:**
1. **Afirmações sem fonte.** O prazo de 3 a 6 meses de sessão e a regra dos 14 dias de inatividade do
   aparelho principal são afirmações externas. Precisam de referência da documentação antes de orientar
   decisões.
2. **Ausência de monitoramento de estado.** O relatório descreve as causas de queda, mas não registra que
   a plataforma não percebe uma queda. Como visto no item 4.3, o evento de conexão é descartado. Se a
   instância de um tenant cair, ninguém é avisado. Isso precisa constar junto com as causas.
3. **Instância de teste desconectada.** A instância `t-c3fc15b77033` está em `connecting`. Uma instância
   pode ficar sem conexão, e hoje isso passa despercebido.

**Esforço:**

| Item | Esforço |
|---|---|
| Verificar as afirmações externas na documentação | Baixo (algumas horas) |
| Monitorar o estado das instâncias (já previsto no item 9.5) | Baixo (algumas horas) |
| Teste de persistência após reinicialização do container, com acompanhamento | Baixo, mas exige tempo de observação |

### 9.8. Item 5.2: Anatomia do banimento e recuperabilidade do número

**Status: analisado. As afirmações sobre tipos de banimento são externas. O ponto central é o agente de reativação.**

**Concordamos com:**
- O maior risco é o **disparo ativo para contatos frios**, quando o contato não salvou o número e pode
  denunciar. É o padrão que os controles da seção 8 precisam evitar.
- O tráfego **receptivo** (o cliente inicia a conversa) tem risco menor.
- Os dois níveis de restrição fazem sentido: o temporário pode ser contestado, o definitivo não.

**O que o relatório não considera:**
1. **O agente de reativação é envio ativo.** O agente de reativação (G6) envia mensagem automaticamente
   para leads sem atividade há um número de dias configurado, sem que o cliente tenha escrito. É o
   padrão de risco descrito no próprio item 5.2. A análise de risco do bot cobre só respostas a mensagens
   recebidas, e deixa esse caso de fora. Precisa entrar nos controles de volume (seção 8), ou o agente
   não deve enviar pela Evolution.
2. **O histórico fica na nossa base.** Se o número for banido, as conversas continuam no banco da
   plataforma. Isso é uma vantagem concreta, e deve constar no plano de recuperação.
3. **"Solicitar Análise" é manual.** A recuperação do nível temporário depende do titular do número, no
   celular. O plano precisa dizer quem executa, em quanto tempo e como o atendimento se comporta enquanto
   o número está restrito.
4. **Não há alerta de restrição.** A plataforma só percebe falhas de envio. O sinal de falhas seguidas
   (seção 8.5) precisa estar ligado a esse caso.

**Esforço:**

| Item | Esforço | Observação |
|---|---|---|
| Desligar ou limitar a reativação pela Evolution | Baixo (algumas horas) | Depende de decisão de negócio |
| Incluir o agente de reativação nos controles de volume | Baixo a médio | Dentro do trabalho da seção 8 |
| Ligar o alerta de falhas seguidas à restrição | Baixo | Já previsto na seção 8.5 |
| Plano de ação para restrição (responsável, prazo, comportamento do atendimento) | Sem código | Depende de processo |

### 9.9. Item 6.1: As duas janelas de gratuidade da Meta

**Status: analisado. A janela de 24h está implementada. A de 72h não está modelada, e só vale na API Oficial.**

**Confirmado no código:**
- A janela de atendimento de 24h é aplicada na API Oficial (`whatsappCloudSend.ts`, função
  `windowError`). Sem mensagem do cliente nas últimas 24 horas, o texto livre é bloqueado. A regra
  confere com o relatório.

**O que o relatório deixa de dizer:**
1. **A janela de 72h do anúncio não existe no código.** A regra de 72h serve para explicar que templates
   ficam gratuitos nesse período. Como o código não envia templates, a ausência não gera erro hoje. Se
   os templates forem implementados (seção 6.2), a lógica de 72h precisará existir. Isso exige saber
   quando o anúncio iniciou a conversa, o que depende da atribuição pelo `referral` (item 4.1).
2. **A janela de 72h só vale na API Oficial.** O relatório apresenta as duas janelas como gerais. O
   benefício é da API Oficial. Pela decisão atual, a Evolution atende as campanhas do Caminho C, então a
   janela de 72h não se aplica a elas. Só vale se um tenant escolher a API Oficial para campanhas.
3. **Não há janela na Evolution.** Não há cobrança por mensagem nem janela de 24h. O envio é limitado
   pelos controles de volume da seção 8. O contraste precisa constar no relatório.

**Esforço:**

| Item | Esforço |
|---|---|
| Ajustar o texto: FEP só na API Oficial, Evolution sem janela | Baixo (algumas horas) |
| Modelar a janela de 72h na API Oficial | Alto, depende de templates (seção 6.2). Não é necessário agora, se a API Oficial não for usada para campanhas |

### 9.10. Item 6.2: Cobrança fora das janelas e templates

**Status: analisado. A regra de templates está correta, mas o relatório não tem fonte de preço, e templates não existem no código.**

**Confirmado no código:**
- Fora da janela de 24h, o envio pela API Oficial é bloqueado. Templates não são suportados
  (`whatsappCloudSend.ts`, função `windowError`).
- O agente de reativação respeita a janela na API Oficial. Quando ela está fechada, não envia e guarda o
  rascunho na ação para cópia manual (`reactivationExecutor.ts`).
- Não há cálculo de custo no código. O contador mensal de envios serve só para visibilidade.

**O que o relatório precisa ajustar:**
1. **Valores sem fonte e sem data.** Os preços em dólar e em reais (por exemplo, US$ 0,0625 para
   marketing) mudam com frequência e variam por país. Precisam de referência à tabela oficial da Meta e
   da data de consulta.
2. **Regra de Utility ambígua.** A frase "grátis dentro da janela CSW até a virada de política da Meta"
   depende de data. Deve dizer o que está em vigor, com data, ou ser removida.
3. **Templates descritos como se existissem.** O relatório fala em templates como recurso da plataforma.
   O código não os suporta. Isso precisa ficar explícito.
4. **Sem controle de custo.** A cobrança é feita na conta da Meta, no cartão do próprio tenant. A
   plataforma não calcula nem alerta sobre valores.
5. **Só se aplica à API Oficial.** Pela decisão atual, as campanhas usam a Evolution, sem cobrança por
   mensagem. Este subitem só vale se um tenant escolher a API Oficial.

**Esforço:**

| Item | Esforço |
|---|---|
| Atualizar preços com fonte e data, ou marcar como referência | Baixo (algumas horas) |
| Corrigir a descrição de templates e a regra de Utility | Baixo |
| Suporte a templates (criação e aprovação na Meta, envio com variáveis, categorias) | Alto |
| Controle de custo por tenant na API Oficial | Médio, se for necessário |

### 9.11. Item 6.3: Isolamento financeiro (Tech Provider e Embedded Signup)

**Status: analisado. O princípio do isolamento está correto, mas a arquitetura descrita não confere com o código.**

**Confirmado:**
- Cada tenant conecta a própria conta de WhatsApp Business (WABA) e cadastra o próprio cartão na Meta. A
  cobrança fica com o titular da WABA, sem passivo da plataforma. Esse é o ponto central do item, e está
  correto.

**O que não confere com o código:**
1. **O Embedded Signup não está implementado.** O relatório diz que o modelo "Tech Provider com Embedded
   Signup" foi adotado. No código, existe só o campo para guardar o `config_id`
   (`whatsapp_embedded_signup_config_id`). Não há o fluxo de login da Meta no frontend (`FB.login`) nem a
   troca do código por token no backend.
2. **As credenciais são cadastradas manualmente.** O `waba_id`, o `phone_number_id` e o `access_token`
   são informados na tela de configuração, e não obtidos pelo fluxo da Meta. Isso exige que o tenant
   tenha esses dados e é propenso a erro.
3. **O modelo real é de App por tenant, não de Tech Provider.** O código usa `meta_app_id` e
   `meta_app_secret` do próprio tenant. Cada tenant precisaria de um App próprio aprovado para a API
   Oficial, o que aumenta a burocracia descrita na seção 7.
4. **O isolamento vale nos dois modelos.** Mesmo com App por tenant, a cobrança continua com o titular da
   WABA. A conclusão do item não muda, mas a descrição da arquitetura precisa mudar.
5. **Relação com a restrição do Portfólio (9.6).** Cada tenant tem o próprio Portfólio. Uma restrição
   afeta só o tenant dele, o que reforça o isolamento financeiro e operacional.

**Esforço:**

| Item | Esforço |
|---|---|
| Corrigir a descrição da arquitetura no relatório | Baixo (algumas horas) |
| Implementar o Embedded Signup (login da Meta, troca de código por token, inscrição da WABA nos webhooks) | Alto. Só é necessário se a API Oficial for usada |
| Manter o cadastro manual | Baixo, sem mudanças, mas com risco de erro de cadastro |

### 9.12. Seção 7 do relatório de referência (Coexistência)

**Status: não se aplica. Fora de escopo por decisão.**

A seção 7 descreve os pré-requisitos para o modo de Coexistência (Caminho A), que mantém o aplicativo
WhatsApp Business no celular enquanto o número usa a API Oficial. **Não vamos trabalhar com Coexistência,
pelo menos por enquanto.** Por isso, os itens 7.1 a 7.4 (credenciamento, Embedded Signup, implementação
e pré-requisitos do celular) não são analisados aqui.

Se a Coexistência voltar a ser considerada no futuro, a seção 7 deve ser reanalisada, junto com a
matriz da seção 9.2 e o modelo da seção 9.11.

### 9.13. Item 8.1: Criativo com âncora de qualificação (pré-clique)

**Status: analisado. O princípio é correto, mas faltam a entidade certa, a fonte do dado e a medição.**

**Concordamos com:**
- Filtrar antes do clique é a camada mais barata. Um criativo que deixa clara a faixa de preço ou a
  condição faz o curioso sem perfil nem clicar, evitando gasto e tempo de atendimento.
- A camada é coerente com as demais, porque reduz o volume que o bot e o CRM precisam filtrar depois.

**Ajustes necessários no relatório:**
1. **Nome da entidade errado.** O relatório fala em `BusinessSegment`, que não existe no projeto. O nome
   correto é `system_segments`.
2. **Prompts de criativo só existem na versão global.** Os templates `creative_concept_generator` e
   `creative_concept_generation` não têm variante por segmento. O mecanismo já existe (campo `segment_id`
   em `system_prompt_templates`), então basta criar as variantes. Hoje nenhum segmento tem âncora
   configurada.
3. **Falta a fonte da âncora.** O relatório manda incluir preço, bairro ou condição no texto, mas não diz
   de onde vem o dado. Para Imobiliário, a faixa pode vir do estoque (`imoveis`). Para os demais segmentos,
   é preciso definir uma fonte. Sem ela, a âncora pode ser inventada, o que é arriscado em segmentos
   regulados, como saúde.
4. **O wizard não tem campo de faixa de preço.** O texto do anúncio é livre (`body` e `headline`). Se a
   âncora depender do dado do segmento, o wizard precisa oferecer esse dado na geração do criativo.
5. **Trade-off não mencionado.** Uma âncora restritiva reduz curiosos, mas pode afastar quem está perto da
   faixa. O relatório deve dizer como medir o efeito: taxa de lead qualificado antes e depois da mudança.

**Esforço:**

| Item | Esforço | Observação |
|---|---|---|
| Variantes dos prompts por segmento (curadoria pelo Master) | Baixo | Depende de conteúdo validado |
| Fonte de dados da âncora por segmento | Médio | Imobiliário já tem a fonte no estoque; os demais precisam definir a sua |
| Integrar o dado ao wizard na geração do criativo | Médio | |
| Medir o efeito (taxa de qualificados antes e depois) | Baixo | Usa dados que o sistema já tem |

### 9.14. Item 8.2: O bot como triagem e qualificação (pós-clique)

**Status: analisado. O bot responde com dados reais, mas o transbordo não depende do score, e a conversa não atualiza a qualificação.**

**Confirmado no código:**
- O bot responde às perguntas consultando as ferramentas de dados do segmento, com dados reais.
- O `score_fit` é calculado pela IA do CRM na criação ou no recebimento do lead, pelo `POST /api/crm/leads`
  e pelo formulário público de imóveis (`qualifyLead`).

**O que o relatório não confere com o código:**
1. **O transbordo não depende do score.** O relatório diz que só os leads que atingem os critérios de
   transbordo passam para o humano. No código, o transbordo acontece só por palavra-chave configurada pelo
   tenant ou pelo limite de turnos (`maxTurns`). O score de fit não entra nessa decisão.
2. **A conversa do bot não atualiza o score.** O `qualifyLead` roda só na criação ou no recebimento do lead.
   As respostas do bot e as mensagens seguintes do cliente não recalculam o score. A qualificação continua
   sendo a da primeira mensagem.
3. **Agendamento não é gatilho.** O relatório cita "solicitação de agendamento" como critério de transbordo.
   O código não tem esse gatilho. Só existe se o tenant configurar a palavra-chave correspondente.
4. **Não há qualificação estruturada.** Perguntas sobre orçamento, prazo e decisor dependem de a persona
   pedir no prompt. Não há etapa programada, nem campos gravados a partir das respostas.
5. **O bot atua só em conversas sem humano.** Ele fica em silêncio quando o contato já tem atendente
   designado ou quando já houve transbordo. Isso está correto, mas o relatório não menciona.

**Consequência prática:** hoje, todo contato que escreve é atendido pelo bot até o limite de turnos ou até
usar uma palavra-chave, e depois é transferido. Isso não separa curiosos de compradores. A separação real
depende apenas do score da primeira mensagem, que não é usado para decidir o transbordo.

**Esforço:**

| Item | Esforço |
|---|---|
| Recalcular o score a partir da conversa | Médio. Exige reavaliar o lead quando chegam novas mensagens |
| Usar o score como critério de transbordo | Médio. Precisa de um limiar claro, por segmento |
| Qualificação estruturada (orçamento, prazo, decisor) registrada no CRM | Médio a alto. Envolve o fluxo de perguntas e os campos do lead |
| Corrigir a descrição no relatório | Baixo |

### 9.15. Item 8.3: Trava de escala por qualidade de lead

**Status: analisado e decidido.**

**Confirmado no código:**
- A trava existe (`aiInsights.ts`, função `hasAcceptableLeadQuality`) e é aplicada só à regra `SCALE`.
- Benchmark `avg_fit_scale_min`: 40 em Imobiliário e 45 em Gestão de Marketing Digital. Sem registro, o
  código usa 40.
- O fit médio é a média do `score_fit` dos leads ligados à campanha pelo `campaign_id` de
  `marketing_eventos`, no período.

**Brechas identificadas:**
1. **Sem fit, a trava libera.** Quando `avgFit` é nulo, a condição retorna verdadeiro. Isso acontece em
   segmentos sem critérios de fit (Geral, Master, Pet e Saúde Digital têm zero), em leads sem qualificação
   e em leads de CTWA nativo, que não têm campanha vinculada enquanto o item 4.1 não for implementado.
2. **A realocação de verba não consulta o fit.** O motor `reallocationEngine.ts` (ação
   `REALLOCATE_BUDGET`) move orçamento sem checar a qualidade dos leads.
3. **Não há amostra mínima.** Um único lead basta para bloquear ou liberar a escala.
4. **A trava só impede aumento de verba.** Campanhas com fit persistentemente baixo não são reduzidas nem
   pausadas por causa do fit.
5. **O fit é uma média sem recência.** Não considera mudança de público ao longo do tempo.
6. **Depende dos itens 8.2 e 4.1.** Sem score atualizado pela conversa e sem vínculo dos leads de CTWA, a
   trava trabalha com dado incompleto.

**Decisão adotada:**
1. **Sem fit, não escala.** Quando `avgFit` é nulo, o `SCALE` é bloqueado.
2. **Amostra mínima para liberar.** A escala só é liberada com pelo menos **10 leads qualificados** no
   período. O valor é inicial e deve ser ajustado com os dados do piloto.
3. **Com fit suficiente, aplica o limiar do segmento.** Abaixo de 40 (ou 45, em Gestão), o `SCALE` continua
   bloqueado.
4. **A realocação de verba segue a mesma regra.** `REALLOCATE_BUDGET` só move orçamento para campanhas que
   passam pela trava.
5. **O bloqueio não pausa.** Campanhas em andamento continuam rodando. Só deixam de receber mais verba.

**Razão da decisão:** escalar sem saber a qualidade multiplica o gasto com curiosos, e a equipe perde
tempo com leads sem chance de compra. Bloquear tem custo menor: campanhas boas escalam mais devagar até
gerarem dado de fit, e a trava se desfaz sozinha.

**Limite da decisão:** a regra protege o orçamento, mas não aumenta vendas por si só. Para isso, ela
depende de:
- Critérios de fit para os segmentos que ainda não têm (Geral, Pet, Saúde e Master).
- Score atualizado pela conversa (item 8.2).
- Vínculo dos leads de CTWA nativo com a campanha (item 4.1).

**Esforço:**

| Item | Esforço | Depende de |
|---|---|---|
| Bloquear `SCALE` quando não há fit (regra nova) | Baixo | — |
| Amostra mínima de 10 leads qualificados | Baixo | — |
| Aplicar a trava à realocação de verba (`REALLOCATE_BUDGET`) | Baixo a médio | — |
| Critérios de fit para Geral, Pet, Saúde e Master | Médio, curadoria pelo Master | Conteúdo validado |
| Reduzir ou pausar campanha com fit persistentemente baixo | Médio | Amostra mínima |
| Recalcular score pela conversa e vincular leads de CTWA nativo | Médio | Itens 8.2 e 4.1 |

### 9.16. Item 8.4: Devolução de conversões do CRM à Meta (Conversions API)

**Status: analisado. A CAPI ainda não existe no código. É a alavanca mais forte, mas depende de outros itens.**

**Confirmado no código:**
- **Não há envio à Conversions API.** Não há nenhuma chamada a eventos da Meta com `action_source`,
  `messaging_channel` ou `event_name`. O único uso de `/events` é o da agenda do Google.
- **Não há `ctwa_clid`.** O campo não aparece no código, nas colunas de `marketing_eventos` nem no banco.
- **As funções de hash existem.** `sha256Hex` e `normalizePhoneForMatch` estão em `metaAdsAdapter.ts` e
  podem ser reutilizadas para o telefone.
- **Há campos de rastreio web, não de CTWA.** `marketing_eventos` tem `fbclid`, `fbp` e `fbc`, que são de
  rastreio de site.

**Concordamos com:**
- É a alavanca mais forte para atrair compradores. Ao receber eventos de lead qualificado, visita agendada
  ou venda fechada, o algoritmo deixa de otimizar só para clique. Isso ataca o problema dos curiosos na
  origem.
- Usar o valor da venda no evento `Purchase` conecta a campanha ao resultado comercial. O CRM já tem o
  `valor_venda`.

**Ajustes necessários no relatório:**
1. **Depende do item 4.1.** O `ctwa_clid` vem do `referral` (Cloud API) ou do `externalAdReply` (Evolution),
   que ainda não são lidos. Sem isso, nenhum evento CTWA pode ser atribuído. É o pré-requisito real.
2. **Depende dos itens 8.2 e 8.3.** O evento `Lead` só deveria ser enviado para leads qualificados, mas o
   score não é atualizado pela conversa. Sem isso, o evento de qualificação é inexato.
3. **Nomes de eventos e parâmetros precisam de verificação.** O relatório cita `Lead`, `Schedule`,
   `Purchase`, `action_source: business_messaging` e `messaging_channel: whatsapp`. Devem ser confirmados
   na documentação da Meta antes de implementar.
4. **Falta deduplicação.** Sem um `event_id` único por evento, o mesmo evento pode ser contado mais de uma
   vez.
5. **Falta consentimento.** Enviar dados de contato à Meta exige base legal ou consentimento do titular
   (LGPD). A tabela `consentimentos_lead` deve ser verificada como fonte.
6. **Depende da restrição do Portfólio (9.6).** Sem o acesso da Meta liberado, a CAPI não funciona.

**Esforço:**

| Item | Esforço | Depende de |
|---|---|---|
| Guardar `ctwa_clid` (coluna e migração no lote de deploy) | Baixo | Item 4.1 |
| Envio à CAPI com hash do telefone e `event_id` | Médio (1 a 2 dias) | Item 4.1 e restrição do Portfólio |
| Disparo dos eventos a partir das etapas do CRM | Médio | Itens 8.2 e 8.3 |
| Verificar nomes de eventos e parâmetros na Meta | Baixo | — |
| Verificar base legal e consentimento | Baixo a médio | — |
| **Total** | **De 3 a 5 dias** | Depois de 4.1 e da liberação do Portfólio |

### 9.17. Item 8.5: Públicos Lookalike de negócios fechados

**Status: analisado. A automação já existe. O número fixo de 100 precisa ser separado em piso da Meta e gatilho de negócio, e o gatilho precisa ser configurável.**

**O que já é automático:**
- O cron `audiences-refresh` roda todos os dias. Ele mantém a lista de clientes atualizada, cria a audiência
  personalizada quando há negócios fechados suficientes e cria o Lookalike quando a audiência está pronta.
- A aplicação do Lookalike em uma campanha aumenta o gasto. Por isso, passa pela ação
  `USE_LOOKALIKE_AUDIENCE`, que exige aprovação com PIN. Essa regra deve ser mantida.

**Sobre a Auditoria de Campanhas:** a Auditoria é um relatório de leitura (pontuação, problemas,
oportunidades e plano de ação). Ela pode mostrar a situação das audiências, mas **não deve executar** a
aplicação de um Lookalike, porque isso aumenta gasto sem a aprovação com PIN.

**Estado atual (verificado):** a tabela de audiências existe, mas está vazia. Nenhum público personalizado
nem Lookalike foi criado. A criação depende de negócios fechados com contato e do acesso à Meta liberado
(item 9.6).

**Correção à análise anterior: o número 100 não é uma regra única.** O código usa uma constante fixa
(`MIN_SEED_MEMBERS = 100`, em `audienceService.ts`) para duas coisas diferentes:
1. **Piso técnico da Meta**: exigência para criar um Lookalike a partir de uma audiência semente. Não é
   configurável e não pode ser ultrapassado para baixo. Deve ser confirmado na documentação da Meta.
2. **Gatilho de negócio**: a decisão de quando criar ou atualizar a audiência. Depende do mercado, do
   ticket, do ciclo de vendas, do tamanho da equipe e da logística de cada segmento e de cada tenant. Não
   deve ser fixo.

**Como deve ser:**
- **Piso da Meta fixo**: o sistema nunca cria a semente abaixo desse valor.
- **Gatilho configurável** por segmento, com sobrescrita por tenant e por cliente, seguindo a cascata de
  benchmarks que já existe.
- **Parâmetros adicionais configuráveis**: janela de tempo dos negócios fechados, frequência de atualização
  da audiência e critério de quais negócios entram na semente.
- **A Auditoria usa o mesmo parâmetro** para mostrar quantos negócios faltam, em vez de repetir o número
  fixo.

**Esforço:**

| Item | Esforço |
|---|---|
| Separar o piso da Meta do gatilho de negócio | Baixo (algumas horas) |
| Gatilho configurável por cascata (segmento, tenant, cliente) | Baixo a médio (1 a 2 dias) |
| Parâmetros de janela, frequência e critério da semente | Médio (1 a 2 dias) |
| Diagnóstico de audiências na Auditoria, usando o parâmetro configurado | Baixo a médio (1 a 2 dias) |
| Confirmar o piso da Meta na documentação | Baixo (algumas horas) |

---

## 10. Demanda adicional: direcionamento de mensagens por campanha (inbox)

**Status: demanda registrada. A ser implementada após o item 4.1.**

### 10.1. Contexto

No módulo de Mensageria, a inbox que recebe a mensagem é hoje escolhida apenas pelo tenant ou pelo cliente
(função `resolveWhatsAppInbox`). A campanha que originou o lead não influencia essa escolha.

Um tenant pode ter atendentes especializados por campanha. Portanto, a inbox de destino deve ser definida
**no lançamento da campanha**.

### 10.2. Como o código funciona hoje

- A inbox é escolhida por tenant ou cliente, sem considerar a campanha.
- A inbox tem um time (`inboxes.team_id`).
- A atribuição automática (`autoAssign`) escolhe o atendente de menor carga dentro do time da inbox.
- Portanto, a cadeia atual é: **inbox → time → atendente de menor carga**. A campanha não aparece em nenhum passo.

### 10.3. Decisões tomadas

1. **A escolha é feita no wizard de lançamento**, em um passo "Atendimento", que define a **inbox** da campanha.
2. **Uma campanha tem uma única inbox.** Não há mais de uma inbox por campanha.
3. **O time não é escolhido à parte.** Ele vem da própria inbox (`inboxes.team_id`), e a atribuição de atendente continua sendo a regra atual.
4. **Sem vínculo**, vale o fluxo atual: inbox padrão do tenant ou do cliente.

### 10.4. Como deve funcionar

1. No wizard, o passo "Atendimento" lista apenas as inboxes compatíveis com a via escolhida pelo tenant
   (Evolution ou API Oficial).
2. O vínculo campanha → inbox fica gravado na campanha (nova coluna, com migração no lote de deploy).
3. Ao receber uma mensagem, a plataforma identifica a campanha pela atribuição (`sourceId`, item 4.1, ou
   `[ref:]` como fallback) e direciona para a inbox vinculada.
4. A atribuição de atendente segue a regra atual, dentro do time da inbox.
5. Contato que volta por outra campanha: a conversa aberta permanece na inbox original, pela regra de
   conversa aberta única por contato e inbox. Só cria outra conversa se a inbox for diferente.

### 10.5. Pontos de atenção

- **Dependência do item 4.1.** Sem a atribuição pelo `sourceId`, a mensagem não tem como saber de qual
  campanha veio, e o direcionamento não funciona. O item 4.1 passa a ser ainda mais prioritário.
- **Compatibilidade da inbox com a via.** Como o provider é uma escolha do tenant, a lista de inboxes do
  wizard precisa ser filtrada pela via.
- **Bot fora do escopo desta demanda.** O bot continua configurado por tenant ou cliente. Se a campanha
  também precisar definir o bot, será uma nova demanda.

### 10.6. Esforço

| Item | Esforço | Depende de |
|---|---|---|
| Passo "Atendimento" no wizard, com seleção de inbox compatível com a via | Baixo a médio (1 a 2 dias) | — |
| Migração e lote de deploy | Baixo | — |
| Direcionamento por campanha na entrada da mensagem | Médio (1 a 2 dias) | Item 4.1 |
| Fallback para a inbox padrão | Baixo | — |
| Testes com várias campanhas e inboxes | Médio (1 a 2 dias) | Itens acima |
| **Total** | **De 1 a 2 semanas** | Item 4.1 |
