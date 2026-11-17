# Roteiro de Testes — Mensageria (tenant "Artemis9 - Testes")

**Tenant:** Artemis9 - Testes · `8c4de2ba-c41c-4353-9b38-491a9ce3e0cd`
**Escopo:** configuração de Inboxes, Times, Etiquetas, Respostas Rápidas e SLA; e o impacto
de cada uma na Caixa de Entrada (`/mensageria`) e nas saídas (dashboards, Painel do Gestor,
notificações).

**Papel de cada parte:** o usuário executa as ações na UI. O Claude verifica o banco
(`docker exec ... psql`) e a API, registra o resultado de cada passo neste documento e
investiga qualquer divergência antes de seguir.

**Pré-requisitos**
- Tenant com módulo Mensageria contratado (já ativo) e `bot` desligado (testes do bot ficam
  para rodada posterior, conforme CHECKPOINT).
- Dois usuários no tenant: um administrador (`admxyz`) e um atendente comum. Se o atendente
  não existir, criá-lo antes do Bloco 2.
- Estado inicial conhecido (levantado em 2026-11-18): 1 inbox WhatsApp, 0 times, 0 etiquetas,
  0 respostas rápidas, 0 políticas de SLA, 1 conversa aberta.

---

## Bloco 1 — Inboxes

### 1.1 Estado inicial
1. Abrir `/mensageria/config` → aba **Inboxes**.
   - Esperado: inbox "WhatsApp" listada, canal `WhatsApp`, sem time vinculado.
2. Banco: `SELECT id,name,channel_type,team_id,client_id FROM mensageria.inboxes WHERE tenant_id='8c4de2ba-…';`
   - Esperado: 1 linha, `team_id` NULL.

### 1.2 Criar inbox nova
3. Clicar **Nova inbox** → nome "Formulário do Site", canal **Formulário**, cliente "(Todos)".
4. Salvar.
   - Esperado: aparece na lista; toast de sucesso.
5. Banco: nova linha com `channel_type='webform'`, `client_id` NULL.
6. Tentar criar **outra** inbox de canal **Formulário**.
   - Esperado: canal indisponível ou erro 409 ("já existe inbox deste canal").

### 1.3 Inbox por cliente
7. Criar inbox "WhatsApp — Cliente Teste" com canal WhatsApp e um cliente específico.
   - Esperado: sucesso (se o canal for único por tenant, o item 1.2.6 já define a regra; registrar
     o comportamento real e confirmar contra a regra).
8. Banco: `client_id` preenchido com o cliente escolhido.

### 1.4 Vincular time à inbox
9. (Depende do Bloco 2 — executar depois dele, retornando aqui.)
10. Na inbox "Formulário do Site", escolher um time no seletor.
    - Esperado: salva; banco `team_id` preenchido.
11. Tentar vincular um time de **outro cliente** a uma inbox de cliente diferente.
    - Esperado: a opção não aparece no seletor (filtro por cliente da inbox).

### 1.5 Desativar inbox
12. Desativar a inbox "Formulário do Site".
    - Esperado: status "Inativa". Enviar mensagem por esse canal (ex.: `POST` ao endpoint
      público do formulário) e registrar o comportamento real.

---

## Bloco 2 — Times

### 2.1 Criar times
1. Aba **Times** → criar "Vendas" (auto-atribuição ligada, qualquer cliente).
2. Criar "Suporte" (auto-atribuição **desligada**).
3. Criar "Time Cliente X" vinculado a um cliente específico.
   - Esperado: os 3 aparecem; cada um com `0 inboxes · 0 conversas`; "Vendas" e "Suporte" com
     aviso amarelo "não atende nenhuma inbox".
4. Banco: `SELECT name,auto_assign,client_id FROM mensageria.teams WHERE tenant_id='8c4de2ba-…';`

### 2.2 Membros e líder
5. Em "Vendas", adicionar o atendente comum como membro.
6. Promover o atendente a **líder** (ícone de estrela).
   - Esperado: badge de líder; banco `team_members.role='lead'`.
7. Rebaixar para agente e confirmar que o badge some.

### 2.3 Vincular time a inbox (efeito real)
8. Na aba **Inboxes**, vincular "Vendas" à inbox WhatsApp.
9. Voltar em **Times**: "Vendas" deve mostrar `1 inbox · 0 conversas` e o aviso amarelo some.

---

## Bloco 3 — Atribuição automática (impacto na Caixa de Entrada)

Pré-condição: Bloco 2.3 concluído (inbox WhatsApp com time "Vendas", auto-atribuição ligada,
atendente comum é membro do time).

### 3.1 Primeira conversa nova
1. Enviar uma mensagem de um número nunca visto para o canal WhatsApp (ou simular pelo
   endpoint de ingestão da inbox).
2. Verificar na Caixa de Entrada (`/mensageria`, com o admin logado):
   - Esperado: conversa criada, `assignee` = atendente comum (único membro), `team` = "Vendas".
3. Banco: `SELECT assignee_id,team_id FROM mensageria.conversations WHERE id=…;` e
   `conversation_events` com `event_type='assigned'` e `payload.auto=true, reason='least_loaded'`.

### 3.2 Balanceamento (least-loaded)
4. Adicionar um segundo membro ao time "Vendas".
5. Enviar 3 mensagens de números novos em sequência.
   - Esperado: as conversas se distribuem entre os dois membros, sempre para quem tem menos
     conversas abertas (não em round-robin cego). Registrar a sequência real de `assignee_id`.

### 3.3 Time com auto-atribuição desligada
6. Vincular "Suporte" (auto-atribuição off) à inbox e enviar nova mensagem.
   - Esperado: conversa criada **sem** assignee (não atribui automaticamente).

### 3.4 Sem time
7. Remover o time da inbox e enviar nova mensagem.
   - Esperado: conversa sem time nem assignee; aparece apenas em "não atribuídas".

---

## Bloco 4 — Visibilidade por papel (impacto na Caixa de Entrada)

Usar o **atendente comum** logado (em janela anônima ou outro navegador).

### 4.1 Atendente vê só o próprio escopo
1. Com conversas atribuídas a outro membro e a conversas não atribuídas do time:
   - Esperado: vê apenas as suas e as não atribuídas do seu time. Não vê conversas de outro
     membro nem de outro time.
2. Abrir por URL direta uma conversa de outro membro.
   - Esperado: 404 (não revelar que existe).

### 4.2 Líder vê o time inteiro
3. Promover o atendente a líder de "Vendas" (Bloco 2.2).
4. Recarregar a Caixa de Entrada do atendente.
   - Esperado: vê todas as conversas do time "Vendas", inclusive as de outros membros.

### 4.3 Administrador vê tudo
5. Logado como admin: vê todas as conversas do tenant, de todos os times e não atribuídas.

### 4.4 Escrita respeita o escopo
6. Atendente tenta enviar mensagem numa conversa fora do seu escopo (via API).
   - Esperado: 404, nenhuma mensagem gravada.

---

## Bloco 5 — Etiquetas

### 5.1 Criar etiquetas
1. Aba **Etiquetas** → criar "Urgente" (vermelho), "Interessado" (verde), "Retorno" (azul).
   - Esperado: 3 chips na aba; banco `mensageria.labels` com as cores.
2. Tentar criar duplicada ("Urgente" de novo).
   - Esperado: erro de duplicidade ou comportamento registrado.

### 5.2 Aplicar em conversa
3. Abrir uma conversa na Caixa de Entrada → aplicar "Urgente".
   - Esperado: chip aparece na conversa e na lista; banco `conversation_labels`.
4. Remover a etiqueta. Esperado: sai da conversa e da lista.

### 5.3 Filtro por etiqueta
5. Aplicar "Interessado" em duas conversas e filtrar por ela na Caixa de Entrada.
   - Esperado: só as duas aparecem.

### 5.4 Excluir etiqueta em uso
6. Excluir "Urgente" enquanto está aplicada em uma conversa.
   - Esperado: registrar se é bloqueada, removida das conversas ou erro. (Decisão a confirmar.)

---

## Bloco 6 — Respostas Rápidas

### 6.1 Criar
1. Aba **Respostas Rápidas** → atalho `/ola`, conteúdo "Olá! Como posso ajudar?".
2. Criar `/preco` com conteúdo longo e quebras de linha.
   - Esperado: ambas listadas; banco `canned_responses`.

### 6.2 Usar no composer
3. Na Caixa de Entrada, digitar `/ol` no campo de mensagem.
   - Esperado: sugestão `/ola` aparece; selecionar insere o texto.
4. Digitar `/preco` e enviar.
   - Esperado: texto completo enviado com as quebras preservadas; mensagem outbound gravada.

### 6.3 Atalho duplicado e exclusão
5. Criar um segundo `/ola` → registrar o comportamento.
6. Excluir `/preco`.
   - Esperado: some da lista e do composer; mensagens já enviadas permanecem.

---

## Bloco 7 — SLA

### 7.1 Política global
1. Aba **SLA** → escopo **Global**: primeira resposta 15 min, resolução 24 h.
   - Esperado: política listada com escopo "Global".
2. Banco: `SELECT name,scope,first_response_target_min,resolution_target_min FROM mensageria.sla_policies WHERE tenant_id='8c4de2ba-…';`

### 7.2 Política por inbox e por time (precedência)
3. Criar política de **inbox** "WhatsApp" com primeira resposta 5 min.
4. Criar política de **time** "Vendas" com primeira resposta 10 min.
5. Abrir uma conversa da inbox WhatsApp atribuída ao time "Vendas".
   - Esperado (ordem: inbox > time > global): aplica a política de **inbox** (5 min).
   - Registrar o SLA exibido na conversa e o valor em `conversation_sla`.

### 7.3 Estouro de SLA
6. Deixar uma conversa sem resposta além do prazo (ou ajustar o prazo para 1 min em teste).
   - Esperado: marcada como estourada; alerta gerado (WhatsApp/Slack se configurados).
   - Confirmar que o cron `sla-check` (a cada 5 min) registra o estouro uma única vez.

### 7.4 Desativar política
7. Desativar a política de inbox → a conversa passa a usar a de time, depois a global.

**Execução (2026-11-15):** política "Inbox WhatsApp" (5 min) marcada `is_active=false`. Resolução em `src/lib/mensageria/sla.ts` filtra `is_active = true` antes da precedência, então a conversa passa a usar "Time Vendas" (10 min). Global só vale sem time. ✅

---

## Bloco 8 — Impacto nas saídas

### 8.1 Painel de Analytics (`/mensageria/analytics`)
1. Com as conversas dos blocos anteriores, conferir:
   - Total de conversas por período (filtro de data padrão = hoje).
   - Contagem de "Vindas de campanha" (depende de `[ref:]` ou clique rastreado).
   - Tempo médio de primeira resposta coerente com o que foi enviado.
2. Comparar cada número com consulta SQL direta ao banco. Registrar qualquer divergência.

### 8.2 Painel do Gestor (`/mensageria/gestao`) — líder e admin
3. Logado como líder: vê KPIs (em aberto, SLA estourado, tempo médio) só do time.
4. Logado como admin: KPIs do tenant inteiro; filtros de time, canal, prioridade e data;
   ordenação e paginação.
5. Conferir que os KPIs batem com a Caixa de Entrada e com o banco.

### 8.3 Notificações
6. Com SLA estourado e canais configurados (WhatsApp/Slack do tenant), confirmar o aviso
   recebido. Se os canais não estiverem configurados, registrar que a notificação não saiu.

---

## Bloco 9 — Casos de borda

1. Remover um membro que é líder do time → conversas atribuídas a ele: o que acontece?
2. Excluir um time com inbox vinculada → a inbox fica sem time (confirmar via banco).
3. Excluir um time com conversas atribuídas → conversas mantêm ou perdem o time? Registrar.
4. Desativar o único atendente de um time com auto-atribuição → próxima conversa vai para
   quem? (Esperado: sem assignee, não quebra.)
5. Duas mensagens simultâneas do mesmo contato novo → apenas uma conversa criada (dedupe).

---

## Checklist final de limpeza

- [ ] Inboxes de teste desativadas ou removidas (manter a WhatsApp original).
- [ ] Times, etiquetas, respostas rápidas e políticas de SLA de teste removidos ou
      reclassificados.
- [ ] Conversas de teste removidas do tenant.
- [ ] Atendente de teste sem papel de líder, se não for mais necessário.
- [ ] `count(*)` de cada tabela confirmado.

---

## Registro de execução

| Bloco | Passo | Resultado | Observação |
|---|---|---|---|
| 1 | 1.1–1.5 | — | |
| 2 | 2.1–2.3 | — | |
| 3 | 3.1–3.4 | — | |
| 4 | 4.1–4.4 | — | |
| 5 | 5.1–5.4 | — | |
| 6 | 6.1–6.3 | — | |
| 7 | 7.1–7.4 | — | |
| 8 | 8.1–8.3 | — | |
| 9 | 1–5 | — | |
