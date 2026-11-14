# Roteiro de testes — GERA_MENSAGENS_WHATSAPP (cenários a–f)

Tenant de teste: **Artemis9 - Testes** (`8c4de2ba-c41c-4353-9b38-491a9ce3e0cd`).

Regra de execução:
- O usuário executa os passos pela UI; o Claude verifica no banco.
- Limpeza de dados de CRM e Mensageria só com autorização explícita, na transição entre cenários. A configuração (inboxes, módulos, GERA) é preservada.
- Registrar o resultado de cada passo e, se algo divergir, a tela e a hora (para cruzar com logs e banco).

Ordem sugerida: **f, b, c, d, e** (f é rápido e não depende de dados).

---

## Status

| Cenário | Status |
|---|---|
| a | Concluído |
| b | Concluído (passo 6 validado após reenvio; webhook respondeu 200) |
| c | Pendente |
| d | Pendente |
| e | Pendente |
| f | Passo 1 validado (Clinica Teste: GERA continua `false` após tentativa de ligar; trava funcionou) |

Observações registradas:
- Cenário b, passo 6: a primeira tentativa falhou com erro 500 por timeout de conexão com o banco (Docker Desktop). Reenviada após reinício do Docker; o webhook respondeu 200 e nada foi gravado, como esperado.
- Cenário f, passo 1: validado. Uma tentativa acidental de ligar GERA na Artemis9 - Testes (que tem CRM) foi aceita, como esperado. Estado atual: GERA **ligado** na Artemis9 - Testes; é a precondição do cenário c.
- Testes de combinação de módulos e GERA (relato do usuário, executado pela UI):
  - Sem CRM e sem Mensageria contratados, tentar marcar GERA: **aplicação avisou que não é possível** (regra OK).
  - Com CRM contratado, ligar GERA: **aceito e salvo** (regra OK).
  - Estado do banco na verificação posterior (14:15 UTC): Artemis9 com GERA desligado e **sem CRM**. Ou seja, o estado final não é o do cenário c; o usuário confirmou que vai ajustar antes do cenário c.
- Correções feitas durante os testes (validadas):
  - Ordem de salvamento: módulos são gravados antes dos dados do tenant, para a validação do GERA enxergar CRM recém-marcado.
  - API de módulos: ao gravar uma lista sem CRM e sem Mensageria, o GERA é desligado automaticamente na mesma transação.
  - Validado no banco (14:33:17 UTC): ligar CRM e GERA no mesmo salvamento, na aba Modularização → GERA `true` e CRM ativo.
  - Validado no banco (14:34:07 UTC): com GERA ligado, desmarcar CRM e Mensageria e efetivar → GERA desligado automaticamente. Verificação global: 0 empresas com GERA ligado sem CRM nem Mensageria.
- Cenário c, passo 5 (divergência registrada): `/mensageria` abriu com Caixa de Entrada vazia, sem mensagem de acesso negado, e o item "Central de Mensagens" continuava no menu. Causa: provisões das funcionalidades da Mensageria (`tenant_feature_overrides`) mantidas mesmo com o módulo desligado. Correção aplicada no tenant de teste: provisões `mensageria-*` marcadas como inativas (reversível, sem apagar linhas). Verificado: categoria Central de Mensagens sai do menu.
- Cenário c, passo 5 (validado): `/mensageria` agora exibe "Acesso negado" para tenant sem a Mensageria contratada. Implementado: rota `/api/admin/mensageria/access` + bloqueio no layout da Central de Mensagens. Master mantém acesso.
- Regra "Mensageria contratada → GERA obrigatoriamente ligado" (decisão do usuário): implementada na política de leitura, na gravação de módulos e no bloqueio do toggle no Master. Validado no banco: contratar Mensageria deixou GERA `true`; desmarcar Mensageria (com CRM ativo) manteve GERA `true` e liberou o toggle.
- Cenário c, passo 6 (validado): pergunta sem tag do celular 1 gerou registro inbound no histórico, nenhuma resposta do bot, nenhum envio pela Evolution.
- Cenário d: usar a tag `[ref:teste-campanha-c]` (atribuição à campanha de teste), no lugar de `teste-regra-d`, para manter a mesma regra do cenário c.
- Cenário c concluído. O tenant voltou ao estado do cenário c (CRM e Campanhas ligados, Mensageria desligada, GERA ligado).
- Correção (cenário d, passo 3): a resposta do atendente pela Mensageria não entrava no histórico do lead no CRM, porque a rota de resposta gravava a mensagem sem a linha do tempo. Corrigido: resposta a contato com lead entra no histórico (notas internas ficam de fora).
- Reinício: dados de CRM, Mensageria e CTA do tenant Artemis9 - Testes foram removidos por completo. Configuração mantida (CRM, Mensageria e Campanhas ligados, GERA ligado, referência `teste-campanha-c`).
- Reinício — cenário f (validado): Clinica Teste, com só Campanhas contratada, recusou ligar o GERA com a mensagem esperada. Banco: GERA continua `false` e `updated_at` sem alteração (18:38 de 12/08).
- Cenário b, passo 1 (validado): lead criado e atribuído à campanha de teste; nenhuma mensagem na Mensageria e nenhum registro no histórico do lead, para o tenant Artemis9 - Testes (GERA e Mensageria desligados). Observação: uma conversa antiga do mesmo telefone existe no tenant Artemis9 (outro tenant), sem relação com este teste.
- Cenário b, passo 2 (validado): mensagem com tag de contato que já é lead não gera lead nem histórico, com GERA desligado. Decisão de negócio: sem GERA não há histórico; a limitação é intencional para incentivar a contratação do GERA.
- Cenário b, passo 3 (validado): mensagem sem tag não gera lead novo, histórico nem registro na Mensageria, com GERA desligado.
- Cenário b concluído.
- Melhoria registrada: Caixa de Entrada abre com período De/Até preenchido com a data de hoje.
- Pendências transversais: reativar os eventos `CONTACTS_UPSERT` e `CONTACTS_UPDATE` da Evolution após todos os testes (backup em `scratchpad/webhook-original.json`).

---

## Cenário c — Marketing + CRM, parâmetro ligado, sem Mensageria

**Preparação:** CRM e Campanhas ligados; Mensageria desligada; parâmetro ligado no Master.

1. Celular 1 envia `[ref:teste-regra-d] Oi, quero saber mais`.
   - Esperado: lead criado.
2. Celular 1 envia `Qual o valor?` (orgânica).
   - Esperado: a mensagem entra no histórico do lead na ficha, mesmo sem a tag. (Com o parâmetro ligado, toda mensagem do contato entra.)
3. Celular 2 responde pelo aparelho `Claro, segue o valor`.
   - Esperado: a resposta aparece no histórico do lead como enviada pela empresa.
4. Verificar `/crm/kanban` e `/crm/leads`.
   - Esperado: o lead continua único, com as 3 mensagens no histórico.
5. Abrir `/mensageria`.
   - Esperado: acesso negado. O histórico continua visível só no CRM.
6. Esperar uma resposta automática (se houver bot ativo).
   - Esperado: o bot não responde, porque a Mensageria não está contratada.

## Cenário d — Marketing + CRM + Mensageria, parâmetro ligado

**Preparação:** CRM, Campanhas e Mensageria ligados; parâmetro ligado.

1. Celular 1 envia `[ref:teste-regra-d] Oi`.
   - Esperado: lead criado e conversa na Mensageria, com a mensagem.
2. Abrir `/mensageria`.
   - Esperado: a conversa aparece na caixa de entrada, com o nome e a origem do CTA.
3. Celular 2 responde pela Mensageria (campo de resposta).
   - Esperado: a mensagem chega ao celular 1 e aparece nas duas telas.
4. Celular 1 envia mensagem orgânica.
   - Esperado: entra na mesma conversa. Atualiza o lead.
5. Testar o bot: configurar um fluxo ativo em `/mensageria/config` (aba Bot) e enviar uma pergunta do celular 1.
   - Esperado: o bot responde no WhatsApp e a resposta aparece na Mensageria.

## Cenário e — Mensageria sem CRM, parâmetro ligado

**Preparação:** Mensageria e Campanhas ligados; CRM desligado; parâmetro ligado.

1. Celular 1 envia `[ref:teste-regra-d] Oi`.
   - Esperado: conversa na Mensageria com a mensagem. Nenhum lead no CRM.
2. Verificar `/mensageria`: a conversa aparece.
3. Verificar o menu: não há itens de CRM.

## Cenário f — Trava de contratação

1. No Master, em uma empresa sem CRM nem Mensageria (ex.: "Clinica Teste"), ligar `GERA_MENSAGENS_WHATSAPP` e salvar.
   - Esperado: erro com a mensagem "só pode ser ligado com CRM e/ou Mensageria contratado". A tela não deve gravar.

---

## Tag de atribuição usada nos testes

- **Tag:** `[ref:teste-campanha-c]`
- **Resolve para:** a campanha de teste "Testes de Geração de campanhas - Artemis9" (`Campaign.manual_ref`).
- **Por que não `teste-regra-d`:** essa tag existe como `CtaDestination.slug` (destino de formulário, sem campanha). O sistema resolve destino antes de `manual_ref`, então a tag nunca chegava à campanha. A tag nova foi checada: não existe em `Ad.trackingId`, `CtaDestination.slug` nem `Campaign.manual_ref`.
- **Limitação do teste:** a tag é digitada manualmente no WhatsApp. O caminho real (clique no anúncio, com a plataforma inserindo a tag) não é coberto por este roteiro.

## Cenário c — passo a passo (preparação)

Pré-condição: CRM ligado, Campanhas ligado, Mensageria desligada, GERA ligado.

1. Celular 1 envia `[ref:teste-campanha-c] Oi, quero saber mais`. Esperado: lead criado e atribuído à campanha de teste.
2. Celular 1 envia `Qual o valor?` (sem tag). Esperado: entra no histórico do mesmo lead, sem lead novo.
3. Celular 2 responde pelo aparelho `Claro, segue o valor`. Esperado: resposta no histórico como enviada pela empresa.
4. `/crm/kanban` e `/crm/leads`: lead único, com 3 mensagens no histórico.
5. `/mensageria`: acesso negado.
6. Nenhuma resposta automática (não há bot ativo).

## Cenário b — Marketing + CRM, GERA desligado

**Pré-condição:** CRM e Campanhas ligados, Mensageria desligada, GERA desligado.

1. Celular 1 envia `Olá. [ref:teste-campanha-c]`. Esperado: lead criado, atribuído à campanha de teste.
2. Celular 1 envia `Quero mais informações. [ref:teste-campanha-c]`. Esperado: nenhum lead novo, e a mensagem **não** entra no histórico (GERA desligado).
3. Celular 1 envia `Qual o valor?` sem tag. Esperado: nada é gravado no histórico e nenhum lead novo é criado.

## Cenário d — Marketing + CRM + Mensageria, GERA ligado

**Pré-condição:** CRM, Campanhas e Mensageria ligados; GERA ligado.

1. Celular 1 envia `Olá. [ref:teste-campanha-c]`. Esperado: lead criado e atribuído à campanha de teste; conversa na Mensageria com a mensagem; mensagem no histórico do lead. **Validado** (18:05 UTC).
2. Abrir `/mensageria`. Esperado: a conversa aparece com nome e origem do CTA. **Validado.**
3. Celular 2 responde pela Mensageria. Esperado: a mensagem chega ao celular 1 e aparece nas duas telas. **Validado** (18:09 UTC): resposta `sent`, aparece na Mensageria e no histórico do lead. Observação: contato de terceiro conhecido (`5511988162164`) criou lead próprio no mesmo período; não afeta os passos do celular 1.
4. Celular 1 envia mensagem orgânica. Esperado: entra na mesma conversa e atualiza o lead. **Validado** (18:12 UTC): mesma conversa, registro no histórico do lead, sem lead novo.
5. Bot: **adiado** para a rodada de testes do bot (ver `docs/CHECKPOINT.md`, pendência "testar o BOT depois"). Não executar nesta rodada.

## Cenário e — Mensageria sem CRM, GERA ligado

**Pré-condição:** Mensageria e Campanhas ligados; CRM desligado; GERA ligado.

1. Celular 1 envia `Oi. [ref:teste-campanha-c]`. Esperado: conversa na Mensageria com a mensagem; **nenhum lead** no CRM. **Validado** (18:52 UTC): conversa e mensagem na Mensageria, sem lead, sem histórico no CRM e sem atribuição de campanha. Observação: a mensagem gravada foi "Olá." (o teste verifica o comportamento, não o texto).
2. Abrir `/mensageria`. Esperado: a conversa aparece. **Validado.**
3. Verificar o menu. Esperado: não há itens de CRM. **Validado** (menu: Campanhas, Sistema, Permissões, Cadastros e Central de Mensagens).
- Cenário e concluído.

## Checklist final

- [ ] Anotar resultado de cada passo de cada cenário.
- [ ] Em divergência, registrar tela e hora.
- [ ] Cruzar com logs do servidor e com o banco.
- [ ] Reativar eventos de contato da Evolution ao final.
