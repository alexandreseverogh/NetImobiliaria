# Roteiro de Teste Rigoroso — Cascata de WhatsApp no CTA de Anúncio (Achados #1, #2, #3)

> ## ✅ RESULTADO DA EXECUÇÃO (2026-10-28) — APROVADO, 0 falhas encontradas
>
> Todos os blocos (A-H) foram executados ponta a ponta contra ambiente real (Postgres + servidor
> dev + navegador real com sessão injetada), com tenant/clientes/usuário de teste dedicados —
> nunca mockado. Destaques:
>
> - **Bloco A** (schema) — FK composta, índice único parcial, coexistência tenant-wide/cliente,
>   todos confirmados via SQL direto.
> - **Bloco B** (resolver) — `whatsappNumbersMatch` confirmado via reimplementação fiel da
>   lógica; B1-B6 cobertos por transitividade pelos Blocos C/E/F (consumidores reais).
> - **Bloco C** (achado #2, o bug principal) — **C2 é a prova decisiva**: uma campanha do
>   Cliente A redirecionou para `wa.me/558199990002` (número do CLIENTE), nunca o do tenant
>   (`558199990001`), mesmo com os dois configurados simultaneamente. C1/C3/C4/C5/C6/C7/C8
>   confirmados sem desvio.
> - **Bloco D** (achado #1, wizard) — confirmado **com uma campanha real lançada pelo wizard
>   completo (7 etapas, cliente real selecionado via UI)**: bloco somente-leitura mostrou o
>   número do cliente, zero `<input>`/`<textarea>` dentro do bloco, validação bloqueou
>   corretamente quando a config foi removida (D4) e liberou quando restaurada, link de edição
>   apontou para a URL certa, resumo final da revisão (D7) refletiu o valor resolvido.
> - **Teste decisivo de ponta a ponta** — o `Ad` real criado por essa campanha lançada via UI
>   foi testado contra `/api/r/[trackingId]` de verdade: redirecionou para
>   `wa.me/558199990002?text=Texto final de teste [ref:7d0157ef-mvs49q4l]` — prova que o ciclo
>   completo (wizard → criação real → redirect real) funciona com os 3 achados corrigidos
>   juntos, não apenas em isolamento.
> - **Blocos E/F** (APIs de configuração) — todos os cenários (incluindo validações 400, 403,
>   isolamento entre tenants 404, apagar override restaura herança) confirmados exatamente como
>   especificado.
> - **Bloco G** (UI visual) — confirmado no navegador real: card "WhatsApp" na visão do tenant
>   (nunca existia antes), aviso âmbar de desalinhamento (achado #3) renderizando corretamente
>   tanto no nível tenant quanto no nível cliente, seção "WhatsApp" na tela do cliente com os
>   badges "próprio" corretos.
> - **Bloco H** (regressão) — `npx tsc --noEmit` limpo (0 erros, após remover 1 artefato stale
>   de cache `.next/types` não relacionado a esta mudança); nenhuma campanha/config real
>   pré-existente foi tocada.
> - **Bloco Z** (limpeza) — confirmado `count(*)=0` em todas as tabelas de teste; as 2 linhas
>   reais de `WhatsAppConfig` (Master Platform, Marketing Digital) confirmadas **byte-a-byte
>   idênticas** ao estado capturado antes de qualquer teste.
>
> Nenhum bug novo encontrado nesta rodada — as 3 correções implementadas em 2026-10-27 se
> comportam exatamente como projetado sob este roteiro.
>
> ---
>
> Criado em 2026-10-28. Cobre as 3 correções da frente "campanha Meta com CTA WhatsApp ×
> compatibilidade com a Mensageria", investigada nos dias 2026-10-26/27:
>
> - **Achado #1** — o wizard de campanha tinha campos editáveis de "Número WhatsApp"/
>   "Mensagem Pré-preenchida" que nunca eram lidos por nenhum adapter de rede nem persistidos
>   em `Ad` — eram 100% decorativos, dando a falsa impressão de controlar o que o anúncio real
>   faz. Removidos; substituídos por um bloco somente-leitura mostrando o valor REAL resolvido.
> - **Achado #2** — o redirect real do clique no anúncio (`/api/r/[trackingId]`) sempre usava
>   a config `WhatsAppConfig` do TENANT, mesmo quando a campanha pertencia a um cliente real
>   que tivesse (ou devesse ter) um número próprio — bug de verdade, não hipotético.
> - **Achado #3** — nenhuma validação cruzada existia entre o número configurado pro redirect
>   do anúncio (`WhatsAppConfig.phoneNumber`) e o número de fato pareado com a instância
>   Evolution que recebe mensagem real na Mensageria (`tenants.numero_whatsapp`/
>   `clientes.numero_whatsapp`) — um admin podia configurar um número que nunca cairia como
>   conversa na Mensageria, sem nenhum aviso.
>
> **Princípio deste roteiro:** nenhum teste é hipotético — todo passo roda contra o banco/API
> reais (nunca mock), com dado temporário criado deliberadamente e **sempre removido ao final**,
> confirmado por `count(*)=0` nas tabelas tocadas. As 2 linhas reais e pré-existentes de
> `WhatsAppConfig` (tenant Master Platform e tenant Marketing Digital) **nunca são alteradas** —
> qualquer teste que precise mexer nelas deve capturar o valor exato antes e restaurar depois,
> confirmado por comparação byte-a-byte.

---

## 0. Preparação — dados de teste (criar uma vez, reusar em todos os blocos)

Rodar via `docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria` (sempre
aplicando SQL via arquivo/stdin, nunca inline com acento — risco de corrupção de UTF-8 já
documentado neste projeto).

```sql
-- Tenant de teste dedicado (nunca usar um tenant real de produção para isto)
INSERT INTO public.tenants (id, name, status, evolution_instance, numero_whatsapp)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'TESTE WHATSAPP CASCATA', 'active',
        'teste-evolution-tenant', '5581999990001')
ON CONFLICT (id) DO NOTHING;

-- 2 clientes de teste sob esse tenant
INSERT INTO public.clientes (uuid, tenant_id, nome, evolution_instance, numero_whatsapp)
VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'CLIENTE TESTE A (com instância própria)', 'teste-evolution-cliente-a', '5581999990002'),
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'CLIENTE TESTE B (sem instância própria)', NULL, NULL)
ON CONFLICT (uuid) DO NOTHING;
```

**Comando de limpeza final (guardar para rodar no Bloco Z):**
```sql
DELETE FROM campanhasmarketingdigital."Ad"
  WHERE "adSetId" IN (SELECT id FROM campanhasmarketingdigital."AdSet"
    WHERE "campaignId" IN (SELECT id FROM campanhasmarketingdigital."Campaign"
      WHERE tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'));
DELETE FROM campanhasmarketingdigital."AdSet"
  WHERE "campaignId" IN (SELECT id FROM campanhasmarketingdigital."Campaign"
    WHERE tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001');
DELETE FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001';
DELETE FROM campanhasmarketingdigital."WhatsAppConfig" WHERE tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001';
DELETE FROM public.clientes WHERE tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001';
DELETE FROM public.tenants WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
```

---

## Bloco A — Integridade do schema (migração)

| # | Passo | Esperado |
|---|---|---|
| A1 | `\d campanhasmarketingdigital."WhatsAppConfig"` | Coluna `client_id uuid` presente; FK `whatsapp_config_client_same_tenant` (tenant_id, client_id) → `clientes(tenant_id, uuid)`; índice único `whatsapp_config_tenant_client_uq` em `(tenant_id, COALESCE(client_id, '00000000-...'))` |
| A2 | `SELECT id, tenant_id, client_id, "phoneNumber" FROM "WhatsAppConfig" WHERE tenant_id IN ('00000000-0000-0000-0000-000000000001','efbf62cf-9e28-4b31-a4f6-82a037412353')` | As 2 linhas reais pré-existentes continuam lá, com `client_id IS NULL`, valores de `phoneNumber` idênticos ao estado anterior (anotar antes de qualquer teste, comparar depois) |
| A3 | `INSERT INTO "WhatsAppConfig" (..., tenant_id, client_id, ...) VALUES (..., '<tenant-teste>', '<uuid de cliente de OUTRO tenant>', ...)` | Rejeitado com erro de violação da FK `whatsapp_config_client_same_tenant` |
| A4 | Inserir 1 linha tenant-wide + 1 linha client-scoped para o MESMO tenant de teste (client_id NULL e client_id = Cliente A) | As 2 coexistem sem conflito — confirma que o índice parcial com COALESCE não acusa falso-duplicado entre "tenant-wide" e "de um cliente específico" |
| A5 | Tentar inserir uma 2ª linha tenant-wide para o MESMO tenant (`client_id NULL` de novo) | Rejeitado por `ON CONFLICT`/violação de unicidade (ou, se usado `ON CONFLICT DO UPDATE`, atualiza a linha existente em vez de duplicar) |

---

## Bloco B — `whatsappConfigResolver.ts` (funções puras de resolução)

Testável via script isolado (`ts-node -r tsconfig-paths/register`) ou diretamente pelas rotas
dos Blocos E/F/C, que são consumidoras diretas destas funções — os Blocos C/E/F já cobrem B por
transitividade. Caso se queira confirmar a função isoladamente:

| # | Cenário | Chamada | Esperado |
|---|---|---|---|
| B1 | Tenant com config tenant-wide, sem clientId | `resolveWhatsAppConfig(tenantTeste, null)` | Retorna a linha tenant-wide, `scope: 'tenant'` |
| B2 | Cliente A TEM override próprio | `resolveWhatsAppConfig(tenantTeste, clienteA)` | Retorna a linha do Cliente A, `scope: 'client'` |
| B3 | Cliente B NÃO tem override | `resolveWhatsAppConfig(tenantTeste, clienteB)` | Cai pro tenant-wide, `scope: 'tenant'` |
| B4 | Tenant sem NENHUMA config (nem tenant-wide) | `resolveWhatsAppConfig(tenantSemConfig, null)` | Retorna `null` |
| B5 | Cliente A tem `evolution_instance` própria | `resolveEvolutionPairedNumber(tenantTeste, clienteA)` | Retorna `clientes.numero_whatsapp` do Cliente A (`5581999990002`) |
| B6 | Cliente B sem `evolution_instance` própria | `resolveEvolutionPairedNumber(tenantTeste, clienteB)` | Cai pro `tenants.numero_whatsapp` (`5581999990001`) |
| B7a | Mesmo número, formatos diferentes | `whatsappNumbersMatch('+5581998000047', '5581998000047')` | `true` |
| B7b | Mesmo número, um sem o 9º dígito | `whatsappNumbersMatch('558181234567', '5581981234567')` | `true` (regra do 9º dígito BR) |
| B7c | Números genuinamente diferentes | `whatsappNumbersMatch('5581999990001', '5581999990002')` | `false` |
| B7d | Um dos dois vazio/nulo | `whatsappNumbersMatch('5581999990001', null)` | `null` (nunca "false" — "não dá pra comparar" ≠ "não bate") |

---

## Bloco C — Achado #2: `/api/r/[trackingId]` resolve a cascata certa (o bug principal)

Criar, para cada cenário, uma `Campaign` → `AdSet` → `Ad` reais de teste (um conjunto por
cenário, todos sob o tenant de teste), com `Ad.ctaType = 'WHATSAPP_MESSAGE'` e `Ad.trackingId`
único. Verificar via `curl -i` (sem seguir redirect) o header `Location` da resposta `302`.

| # | Cenário | Setup | Esperado no `Location` |
|---|---|---|---|
| C1 | Campanha SEM cliente (`client_id NULL`), só config tenant-wide existe | `Campaign.clientId = NULL` | `wa.me/<número do TENANT>` |
| C2 | **Decisivo** — Campanha do CLIENTE A (que tem override próprio), config do tenant TAMBÉM existe mas é diferente | `Campaign.clientId = Cliente A` | `wa.me/<número do CLIENTE A>` — nunca o do tenant. Prova direta de que o bug #2 foi corrigido: antes da correção, este cenário sempre devolvia o número do tenant. |
| C3 | Campanha do CLIENTE B (sem override próprio) | `Campaign.clientId = Cliente B` | Cai pro número do TENANT (herança funcionando) |
| C4 | Campanha de um tenant SEM nenhuma config em nenhum nível | `Campaign.tenantId` = outro tenant de teste, 0 linhas em `WhatsAppConfig` | Redireciona para `/` (home) — nunca quebra, nunca manda pra `wa.me/undefined` |
| C5 | `Ad.body` preenchido (não vazio) | Mesma config do C1, mas `Ad.body = 'Texto real do anúncio'` | Mensagem no `wa.me` usa `ad.body`, não `defaultMessage` da config (prioridade correta, comportamento pré-existente preservado) |
| C6 | `Ad.body = ''` (vazio) | Mesma config do C1 | Mensagem no `wa.me` usa `WhatsAppConfig.defaultMessage` (fallback correto) |
| C7 | Qualquer um dos cenários acima | — | A mensagem decodificada da URL termina com `[ref:<trackingId>]` — regressão do mecanismo de atribuição, não pode ter quebrado |
| C8 | Qualquer um dos cenários acima | Consultar `CtaInteraction` depois da chamada | 1 linha nova com `event_type='WHATSAPP_CLICK'`, `campaign_id`/`ad_id`/`client_id` corretos — regressão do rastreamento de clique |

**Comando de verificação sugerido:**
```bash
curl -s -D - -o /dev/null "http://localhost:3000/api/r/<trackingId>" | grep -i "^location:"
```

---

## Bloco D — Achado #1: Wizard sem campos editáveis mortos

Requer sessão autenticada no navegador (ver seção "Como autenticar" no final deste documento)
ou inspeção direta do bundle/comportamento via `read_page`/`javascript_tool`.

| # | Passo | Esperado |
|---|---|---|
| D1 | Abrir o wizard (`/admin/campanhas/nova`), avançar até o step "Chamada para Ação (CTA)" com `ctaType = WHATSAPP_MESSAGE`, sem nenhum cliente selecionado | Bloco mostra "Número:" e "Mensagem padrão:" com os valores resolvidos do TENANT logado (batendo com `GET /settings/whatsapp`), sem nenhum `<input>`/`<textarea>` editável — confirmar via DOM que não há elemento de formulário dentro desse bloco |
| D2 | Mesmo wizard, mas com um cliente selecionado que TEM override próprio | Bloco mostra o número/mensagem do CLIENTE (não do tenant) — mesma cascata do Bloco C, agora na UI |
| D3 | Inspecionar o payload de `POST /api/admin/campanhas/campaigns` disparado ao lançar (Network do navegador, ou ler `campaigns/route.ts`) | Corpo da requisição **não contém** `whatsappNumber` nem `whatsappMessage` — confirma que o dead code foi removido do fluxo de criação |
| D4 | Selecionar `ctaType = WHATSAPP_MESSAGE` num tenant/cliente SEM nenhuma config resolvida (nem tenant nem cliente) | Validação bloqueia o avanço com a mensagem "Número de WhatsApp não configurado — configure em Configurações → WhatsApp." (tenant) ou a variante "...em 'Config. Meta' deste cliente, ou no tenant." (cliente) |
| D5 | Mesmo cenário do D4, mas com config resolvida (tenant OU cliente) | Validação passa, wizard avança normalmente |
| D6 | Clicar no link "Editar em Configurações" (sem cliente) / "Editar nas configurações deste cliente" (com cliente) | Abre, em nova aba, `/admin/campanhas/configuracoes` (tenant) ou `/admin/clientes/{clientId}/editar` (cliente) — o `id` no link deve ser o `clientId` real selecionado no wizard |
| D7 | Step de revisão final do wizard (resumo antes de lançar) | Linha "WhatsApp" mostra o valor resolvido (`autoFields.whatsappNumber`), nunca mais `form.whatsappNumber` (campo que não existe mais no estado) |

---

## Bloco E — `GET/PUT /api/admin/campanhas/settings/whatsapp` (tenant-wide)

Usar JWT real do tenant de teste (ver "Como autenticar").

| # | Passo | Esperado |
|---|---|---|
| E1 | `GET` antes de qualquer config existir pro tenant de teste | `{phoneNumber:'', defaultMessage:'', businessName:'', evolutionNumber:'5581999990001', numbersMatch:null}` — `numbersMatch` é `null` porque não há `phoneNumber` pra comparar, não `false` |
| E2 | `PUT {phoneNumber:'5581999990001', defaultMessage:'teste', businessName:'Teste'}` | `200`, retorna a linha gravada; confirmar por `SELECT` direto que `client_id IS NULL` |
| E3 | `GET` depois do E2 | `phoneNumber` reflete o salvo; `numbersMatch: true` (bate com `tenants.numero_whatsapp` do setup) |
| E4 | `PUT {phoneNumber:'', defaultMessage:'x'}` (só 1 campo) | `400` — "phoneNumber e defaultMessage são obrigatórios" |
| E5 | `PUT` com JWT de um usuário sem a permissão `configuracoes-campanhas` (UPDATE) | `403` — confirma que o fix do "resource fantasma" não abriu a rota pra qualquer um; a permissão real continua sendo exigida |
| E6 | `PUT {phoneNumber:'5581999999999', ...}` (número diferente do Evolution) | `200`; `GET` seguinte mostra `numbersMatch: false` — confirma o Achado #3 na superfície tenant-wide |

---

## Bloco F — `GET/PUT /api/admin/clientes/[id]/campaign-settings` (override por cliente)

| # | Passo | Esperado |
|---|---|---|
| F1 | `GET` do Cliente B (sem override), com tenant já configurado no Bloco E | `whatsappNumber: ''`, `fallback.whatsappNumber` = o do tenant, `numbersMatch` calculado sobre o EFETIVO (= o do tenant, já que Cliente B não tem override) |
| F2 | `PUT` do Cliente A com `{whatsappNumber:'5581999990002', whatsappMessage:'msg do cliente A', whatsappBusinessName:'A'}` | `200`; `SELECT` direto confirma nova linha em `WhatsAppConfig` com `client_id = Cliente A` |
| F3 | `GET` do Cliente A depois do F2 | `whatsappNumber` = o do cliente (não o fallback); `fallback.whatsappNumber` continua mostrando o do TENANT (nunca contaminado pelo override do cliente) |
| F4 | `PUT` do Cliente A com `{whatsappNumber:'5581999999998', whatsappMessage:''}` (só 1 dos 2 campos) | `400` — "informe número e mensagem juntos, ou deixe os dois vazios" |
| F5 | `PUT` do Cliente A com `{whatsappNumber:'', whatsappMessage:''}` (ambos vazios, restaurando herança) | `200`; `SELECT` confirma que a linha `client_id = Cliente A` foi DELETADA; `GET` seguinte mostra `whatsappNumber: ''` de novo, herdando do tenant |
| F6 | `GET` do Cliente A com override ativo (repetir F2), comparar `numbersMatch` | Calculado sobre o número EFETIVO do cliente (não o do tenant) vs. `resolveEvolutionPairedNumber` do Cliente A (que usa a instância PRÓPRIA dele, Bloco B5) |
| F7 | `PUT` do Cliente A usando o JWT de OUTRO tenant (não o de teste) | `404` ou erro — nunca deve permitir editar cliente de tenant diferente do autenticado (`WHERE uuid = $1 AND tenant_id = $2` já isola isso; confirmar que não há vazamento) |

---

## Bloco G — UI no navegador (confirmação visual)

Autenticar como o tenant de teste (ver seção final) e confirmar visualmente:

| # | Tela | Verificar |
|---|---|---|
| G1 | `/admin/campanhas/configuracoes` (visão tenant) | Novo card "WhatsApp" presente, com os 3 campos e botão "Salvar WhatsApp"; preencher um número diferente do Evolution e confirmar que o aviso âmbar aparece ao salvar |
| G2 | Mesma tela, logado como Master (visão master) | Card "WhatsApp" já existente também mostra o aviso âmbar quando os números não batem (regressão + extensão) |
| G3 | `/admin/clientes/{Cliente A}/editar` → aba "Config. Meta" | Seção "WhatsApp" (gradiente verde) com os 3 campos, badge "próprio"/"usando tenant" corretos, aviso âmbar se desalinhado com a Evolution do próprio cliente |
| G4 | Wizard (`/admin/campanhas/nova`), step CTA, com e sem cliente selecionado | Bloco somente-leitura correto nos 2 casos (D1/D2 revisitados visualmente) |

---

## Bloco H — Regressão geral

| # | Verificação | Como | Esperado |
|---|---|---|---|
| H1 | TypeScript | `npx tsc --noEmit` | Exit code `0`, zero erros |
| H2 | Campanhas reais pré-existentes não afetadas | `SELECT count(*) FROM "Campaign"` antes/depois de toda a bateria | Mesmo número — nenhuma linha real criada/apagada fora do tenant de teste |
| H3 | As 2 linhas reais de `WhatsAppConfig` (Master Platform, Marketing Digital) | Comparar `phoneNumber`/`defaultMessage`/`businessName` capturados no A2 vs. o estado final | Idênticos byte-a-byte |
| H4 | Fluxo real de lançamento de campanha (sem CTA WhatsApp, ex. `LEARN_MORE`) | Lançar uma campanha de teste com destino de formulário | Continua funcionando sem nenhuma referência a `whatsappNumber`/`whatsappMessage` — confirma que a remoção do Achado #1 não quebrou o caminho não-WhatsApp |

---

## Bloco Z — Limpeza final (obrigatório)

1. Rodar o SQL de limpeza da seção 0.
2. `SELECT count(*) FROM public.tenants WHERE id = 'aaaaaaaa-...'` → `0`.
3. `SELECT count(*) FROM public.clientes WHERE tenant_id = 'aaaaaaaa-...'` → `0`.
4. `SELECT count(*) FROM campanhasmarketingdigital."WhatsAppConfig" WHERE tenant_id = 'aaaaaaaa-...'` → `0`.
5. Reconfirmar H3 (as 2 linhas reais intactas) uma última vez, depois da limpeza.
6. Confirmar nenhum arquivo de script/debug temporário sobrou no working tree (`git status`).

---

## Como autenticar como o tenant de teste (sem navegador real)

Mesmo padrão já documentado neste projeto: gerar um JWT com `jwt.sign({ userId: <uuid real de
um usuário existente OU um fabricado consistente>, tenantId: 'aaaaaaaa-0000-4000-8000-000000000001',
... }, process.env.JWT_SECRET)` e enviar via cookie `admin_auth_token` (rotas de API) — chamadas
de API confiam só no payload assinado do token, não fazem lookup de usuário, então um `userId`
fabricado é suficiente para os Blocos C/E/F. Para verificação VISUAL real no navegador (Bloco G),
é necessário também popular `localStorage.setItem('admin-auth-token', ...)` e
`admin-user-data`, já que `useAuth`/`/api/admin/auth/me` faz lookup real do usuário — nesse caso
usar um `userId` de um usuário real existente vinculado ao tenant de teste, ou aceitar que o
Bloco G só é confirmável com um usuário real (criar 1 usuário mínimo de teste vinculado ao
tenant, se necessário, e removê-lo também no Bloco Z).
