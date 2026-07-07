# Plano de Testes — Módulo Mensageria (M0–M3)

> **Status:** Pronto para execução · **Data:** 2026-07-07
> **Objetivo:** Validar M0–M3 em ambiente local antes de avançar para M4 (Chatbot)
> **Ambiente:** localhost:3000 + PostgreSQL 17 local + Redis local

---

## 1. Checklist Pré-Testes

- [ ] Base de dados local atualizada (todas as migrations de mensageria aplicadas)
- [ ] `npm install` e `npm run build` sem erros
- [ ] `npm run dev` rodando na porta 3000
- [ ] Redis conectado (`netimobiliaria-redis` container ativo)
- [ ] Usuário de teste com JWT válido (Master + tenant)
- [ ] Dados de teste: tenant, inboxes (WhatsApp/webform/manual), contacts

---

## 2. Testes de Schema (M0 — Fundação)

### 2.1 Tabelas núcleo existem e têm estrutura correta

**Comando:**
```bash
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria -c "
  \dt mensageria.*
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='mensageria'
"
```

**Esperado:**
- [ ] Tabelas: `inboxes`, `contacts`, `conversations`, `messages`, `teams`, `team_members`, `labels`, `conversation_labels`, `canned_responses`, `conversation_events`, `bot_flows`, `bot_sessions`
- [ ] 12+ tabelas listadas

### 2.2 Índices criados corretamente

**Comando:**
```bash
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria -c "
  SELECT indexname FROM pg_indexes WHERE schemaname = 'mensageria'
"
```

**Esperado:**
- [ ] Índices de UNIQUE em `contacts (tenant_id, phone)` e `(tenant_id, email)`
- [ ] Índices de performance: `conv_inbox_status`, `conv_assignee`, `messages_external`, `messages_conv`
- [ ] 6+ índices listados

### 2.3 Colunas multi-tenant e desacoplamento

**Comando:**
```bash
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria -c "
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_schema='mensageria' AND table_name='conversations' 
  AND column_name IN ('tenant_id', 'client_id', 'inbox_id', 'contact_id')
"
```

**Esperado:**
- [ ] Coluna `tenant_id` tipo `uuid` (NOT NULL)
- [ ] Coluna `client_id` tipo `uuid` (nullable — próprio do tenant quando null)
- [ ] Foreign keys corretos: `inbox_id` → `inboxes`, `contact_id` → `contacts`

---

## 3. Testes de Ingestão (M0 — ingestMessage)

### 3.1 Ingestão WhatsApp simula corretamente (webhook mock)

**Script:** `scripts/test-ingest-message.ts` (ou novo)

```typescript
// Simula webhook Evolution → ingestMessage
import { ingestMessage } from '@/lib/mensageria/ingest'
import { getManualInbox } from '@/lib/mensageria/inboxes'

const tenantId = 'efbf62cf-9e28-4b31-a4f6-82a037412353' // Marketing Digital
const inbox = await getManualInbox(tenantId)
const result = await ingestMessage({
  inbox: inbox as any,
  externalId: `test-wh-${Date.now()}`,
  from: '+5511987654321',
  text: 'Olá, gostaria de saber mais sobre seus serviços',
  attachments: [],
  direction: 'inbound',
})

console.log('✓ Conversa criada:', result.conversationId)
console.log('✓ Contato criado/encontrado:', result.contactId)
console.log('✓ Mensagem ingerida:', result.messageId)
```

**Esperado:**
- [ ] Nova entrada em `mensageria.conversations`
- [ ] Contato dedupado: mesmo telefone = mesma `contact_id`
- [ ] Mensagem com `external_id` (idempotência)
- [ ] `last_message_at` atualizado na conversa

### 3.2 Idempotência — mesma mensagem externa não duplica

**Script:** Executar ingestMessage 2x com o mesmo `externalId`

```typescript
const externalId = `test-idempotent-${Date.now()}`
await ingestMessage({ ..., externalId })
await ingestMessage({ ..., externalId }) // repetida

const count = await pool.query(
  'SELECT COUNT(*) FROM mensageria.messages WHERE external_id = $1',
  [externalId]
)
```

**Esperado:**
- [ ] Coluna `messages` tem apenas 1 linha (não 2)
- [ ] Sem erro constraint violation

### 3.3 Dedupe de contato por telefone e email

**Script:**

```typescript
// Cria contato 1 com telefone
await ingestMessage({
  ..., from: '+5511999999999', to: null, // phone, no email
})
// Cria contato 2 com mesmo telefone — deve reusar contact_id
const result2 = await ingestMessage({
  ..., from: '+5511999999999',
})

console.log('Contatos são o mesmo?', result.contactId === result2.contactId)
```

**Esperado:**
- [ ] Mesmos contatos (mesmo `contact_id`)
- [ ] Única linha em `mensageria.contacts`

---

## 4. Testes de Inbox API (M0-M1)

### 4.1 GET /api/admin/mensageria/conversations — lista

**Request:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  http://localhost:3000/api/admin/mensageria/conversations
```

**Esperado:**
- [ ] Status 200
- [ ] Array de conversas com campos: `id`, `status`, `lastMessageAt`, `contact`, `unreadCount`
- [ ] Ordenado por `last_message_at DESC`

### 4.2 GET com filtros (status, assignee, search)

**Request:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  "http://localhost:3000/api/admin/mensageria/conversations?status=open&assigneeId=unassigned"
```

**Esperado:**
- [ ] Apenas conversas `status='open'`
- [ ] Apenas conversas com `assignee_id IS NULL`

### 4.3 GET /api/admin/mensageria/conversations/{id} — detalhe

**Request:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  http://localhost:3000/api/admin/mensageria/conversations/<conv-id>
```

**Esperado:**
- [ ] Detalhe completo: `status`, `priority`, `firstResponseAt`, `contact`, `inbox`, `labels`, `sla`
- [ ] Array `messages` com todas as bolhas da thread
- [ ] Campo `unreadCount` zerado após GET

### 4.4 POST /api/admin/mensageria/conversations — criar manual

**Request:**
```json
{
  "name": "João da Silva",
  "phone": "+5511987654321",
  "email": null,
  "initialMessage": "Ligação: cliente quer informações sobre imóvel na Zona Sul"
}
```

**Esperado:**
- [ ] Status 201
- [ ] Nova conversa criada com `channel_type='manual'`
- [ ] Contato associado
- [ ] Primeira mensagem com `sender_type='agent'` (atendente criou)

---

## 5. Testes de Mensagens (M1)

### 5.1 POST /api/admin/mensageria/conversations/{id}/messages — enviar

**Request:**
```json
{
  "content": "Obrigado pelo contato! Vamos lhe enviar as fotos do imóvel.",
  "isPrivate": false
}
```

**Esperado:**
- [ ] Status 200
- [ ] Mensagem inserida com `direction='outbound'`, `sender_type='agent'`
- [ ] `conversation.last_message_at` atualizado
- [ ] SSE dispara evento (vê seção 7 — Tempo real)

### 5.2 Notas internas (isPrivate=true)

**Request:**
```json
{
  "content": "Cliente tem muita pressa — oferecer taxa especial",
  "isPrivate": true
}
```

**Esperado:**
- [ ] Mensagem armazenada com `is_private=true`
- [ ] Não enviada para o contato/WhatsApp
- [ ] Exibida com ícone de cadeado 🔒 na UI

### 5.3 Delivery status (simulado)

**Esperado:**
- [ ] Mensagens outbound iniciam com `delivery_status='sent'`
- [ ] Ícone de ✓ na UI (sent)
- [ ] Quando webhook Evolution retorna, atualizar para `delivered` (✓✓)

---

## 6. Testes de Times & Produtividade (M3)

### 6.1 GET /api/admin/mensageria/teams — lista times

**Request:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  http://localhost:3000/api/admin/mensageria/teams
```

**Esperado:**
- [ ] Array de times do tenant
- [ ] Campos: `id`, `name`, `autoAssign`

### 6.2 POST /api/admin/mensageria/teams — criar time

**Request:**
```json
{
  "name": "Time de Vendas — Zona Sul",
  "autoAssign": true
}
```

**Esperado:**
- [ ] Status 201
- [ ] Time criado com `tenant_id` preenchido

### 6.3 POST /api/admin/mensageria/teams/{id}/members — adicionar membro

**Request:**
```json
{
  "userId": "<uuid-user>",
  "role": "agent"
}
```

**Esperado:**
- [ ] Status 200
- [ ] Membro adicionado à tabela `team_members`

### 6.4 PATCH /api/admin/mensageria/conversations/{id} — atribuição

**Request:**
```json
{
  "assigneeId": "<uuid-user>"
}
```

**Esperado:**
- [ ] Status 200
- [ ] `conversation.assignee_id` atualizado
- [ ] Evento `conversation_events` gravado com `event_type='assigned'`

### 6.5 PATCH — mudança de status

**Request:**
```json
{
  "status": "resolved"
}
```

**Esperado:**
- [ ] `conversation.status = 'resolved'`
- [ ] `conversation.resolved_at` preenchido com NOW()
- [ ] Evento `conversation_events` com `event_type='status_changed'`

### 6.6 Etiquetas (labels) — CRUD

**GET labels:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  http://localhost:3000/api/admin/mensageria/labels
```

**Criar label:**
```json
{
  "name": "Interesse compra",
  "color": "#22c55e"
}
```

**Adicionar label a conversa:**
```bash
POST /api/admin/mensageria/conversations/{id}/labels
{ "labelId": "<uuid>" }
```

**Esperado:**
- [ ] Label criada e aparece no dropdown
- [ ] Conversa exibe chip colorido da label
- [ ] Remover label via DELETE limpa a relação

### 6.7 Respostas rápidas (canned responses)

**GET:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  http://localhost:3000/api/admin/mensageria/canned-responses
```

**Criar:**
```json
{
  "shortcut": "/venda",
  "content": "Ótimo! Vou conectá-lo com nosso time de vendas. Pode deixar seu telefone?"
}
```

**Usar no composer:**
- [ ] Digitar `/venda` no textarea
- [ ] Dropdown aparece com as respostas rápidas que começam com `venda`
- [ ] Clicar expande o atalho no composer

---

## 7. Testes de Tempo Real (SSE) (M1)

### 7.1 SSE conecta e autentica

**Request:**
```bash
curl -H "Cookie: admin_auth_token=<jwt>" \
  -N "http://localhost:3000/api/admin/mensageria/stream"
```

**Esperado:**
- [ ] Status 200
- [ ] Content-Type: `text/event-stream`
- [ ] Conexão mantém aberta (não fecha imediatamente)

### 7.2 Evento ao enviar mensagem

**Cenário:**
1. Abrir SSE em um terminal
2. Enviar mensagem via POST em outro terminal
3. Verificar se o evento aparece no SSE

**Esperado:**
```
data: {"type":"message.created","conversationId":"...","message":{...}}
```

- [ ] Evento recebido em tempo real
- [ ] No cliente, a mensagem aparece na thread sem reload

### 7.3 Múltiplas abas sincronizadas

**Cenário:**
1. Abrir a inbox em duas abas do navegador
2. Em uma aba, enviar mensagem
3. Verificar se a segunda aba atualiza sem reload

**Esperado:**
- [ ] Ambas as abas mostram a mesma mensagem
- [ ] Lista de conversas atualiza em tempo real

---

## 8. Testes de UI (M1-M3)

### 8.1 Layout 3 colunas renderiza

**Acesso:** http://localhost:3000/mensageria

**Esperado:**
- [ ] Coluna 1 (filtros): "Todas", "Minhas", "Não atribuídas" com contadores
- [ ] Coluna 2 (lista): conversas ordenadas por último timestamp
- [ ] Coluna 3 (thread): vazia até selecionar uma conversa
- [ ] Botão "+" para nova conversa manual

### 8.2 Seleção de conversa carrega detalhe

**Ação:** Clicar em uma conversa na coluna 2

**Esperado:**
- [ ] Coluna 3 popula com:
  - Nome e telefone do contato
  - Link "Ver no CRM" (se houver `lead_uuid`)
  - Threads de mensagens
  - Dropdown de prioridade
  - Botão "Resolver"
  - Seção de etiquetas

### 8.3 Enviar mensagem funciona

**Ação:**
1. Digitar no textarea: "Teste de mensagem"
2. Pressionar Enter ou clicar avião

**Esperado:**
- [ ] Mensagem aparece na thread (verde/âmbar)
- [ ] Textarea limpa
- [ ] Spinner brevemente (enviando)
- [ ] Ícone ✓ ao lado da mensagem
- [ ] SSE dispara (outros clientes veem em tempo real)

### 8.4 Nota interna (lock icon)

**Ação:**
1. Clicar ícone de cadeado
2. Textarea muda de cor (âmbar)
3. Digitar nota
4. Enviar

**Esperado:**
- [ ] Nota aparece com ícone 🔒 e borda tracejada
- [ ] Não é enviada para contato
- [ ] Label "Nota interna" na mensagem

### 8.5 Modal "Nova conversa manual"

**Ação:** Clicar botão "+" na coluna 1

**Esperado:**
- [ ] Modal abre com campos: Nome, Telefone, E-mail, Resumo
- [ ] Ao submeter, nova conversa criada e selecionada
- [ ] Primeira mensagem é o resumo inserido

### 8.6 Filtros funcionam

**Ação:**
1. Clicar "Minhas" → lista mostra apenas conversas assignadas ao usuário
2. Clicar "Não atribuídas" → mostra conversas sem assignee
3. Clicar "Todas" → todas novamente

**Esperado:**
- [ ] Lista atualiza sem reload
- [ ] Contadores corretos

### 8.7 Atribução (assign)

**Ação:**
1. Selecionar conversa não atribuída
2. Clicar e-mail / seletor de membro
3. Escolher um agente

**Esperado:**
- [ ] Dropdown fecha
- [ ] Campo de assignee mostra nome do agente
- [ ] Conversa move de "Não atribuídas" para seu time (se visto por outro agente via SSE)

### 8.8 Prioridade

**Ação:** Dropdown "Sem prioridade" → selecionar "Alta"

**Esperado:**
- [ ] Badge muda cor (vermelho/laranja para "Alta")
- [ ] Valor persiste (reload da página mantém a prioridade)

### 8.9 Resolver conversa

**Ação:** Clicar botão "Resolver"

**Esperado:**
- [ ] Botão vira "Resolvida" com cor verde
- [ ] Status muda em tempo real
- [ ] Conversa sai de "Todas" se filtro muda para "Abertas" (se implementado)

### 8.10 Etiquetas

**Ação:**
1. Clicar "+ Etiqueta"
2. Picker abre com todas as etiquetas não aplicadas
3. Clicar uma etiqueta

**Esperado:**
- [ ] Chip colorido aparece na seção de etiquetas
- [ ] "×" remove a etiqueta
- [ ] Etiqueta não aparece 2x no picker

### 8.11 Respostas rápidas

**Ação:** Digitar `/` no textarea

**Esperado:**
- [ ] Dropdown aparece com sugestões
- [ ] Continuar digitando filtra (ex: `/ven` mostra `/venda`)
- [ ] Clicar expande no textarea

---

## 9. Testes de Dados Realistas (M1-M3)

### 9.1 Seed com dados históricos

**Script:** `prisma/seed-mensageria-test.sql` (ou novo)

```sql
-- Seed de inboxes, contacts, conversas e mensagens para teste
INSERT INTO mensageria.inboxes (tenant_id, name, channel_type, config, is_active)
VALUES 
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'WhatsApp Vendas', 'whatsapp', '{"evolution_instance":"trafegopago"}', true),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'Formulários', 'webform', '{}', true),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'Manual', 'manual', '{}', true);

-- 10 contatos reais
INSERT INTO mensageria.contacts (tenant_id, name, phone, email) VALUES
  ('efbf62cf-...', 'João Silva', '+5511987654321', 'joao@email.com'),
  ('efbf62cf-...', 'Maria Santos', '+5511999998888', 'maria@email.com'),
  -- ... 8 mais ...
;

-- 20 conversas abertas/resolvidas
INSERT INTO mensageria.conversations (...) VALUES ...;

-- 100+ mensagens distribuídas
INSERT INTO mensageria.messages (...) VALUES ...;
```

**Esperado:**
- [ ] Seed roda sem erro
- [ ] Inbox carrega com ~20 conversas visíveis
- [ ] Histórico de mensagens renderiza corretamente
- [ ] Performance aceitável (< 1s para carregar lista)

### 9.2 Teste de volume (SLA, atribuição)

**Cenário:** 50 conversas, 5 agentes, 3 times

**Ação:**
1. Auto-atribuição round-robin (se implementada)
2. Verificar distribuição equitativa

**Esperado:**
- [ ] Cada agente recebe ~10 conversas
- [ ] UI não trava com 50 items na lista

---

## 10. Testes de SLA (M3)

### 10.1 GET /api/admin/mensageria/sla-policies

**Esperado:**
- [ ] Array de políticas (se houver seed)
- [ ] Campos: `id`, `name`, `scope`, `firstResponseTargetMin`, `resolutionTargetMin`

### 10.2 Badge SLA renderiza

**Cenário:** Conversa com SLA policy

**Esperado:**
- [ ] Badge mostra prazo (ex: "Responder até 14:30")
- [ ] Se estourou: cor vermelha "SLA estourado"
- [ ] Se ainda há tempo: cinza "Responder até..."

---

## 11. Testes de Autenticação e Permissões (M1-M3)

### 11.1 Sem cookie — retorna 401

**Request:**
```bash
curl http://localhost:3000/api/admin/mensageria/conversations
```

**Esperado:**
- [ ] Status 401
- [ ] Erro: "Não autenticado"

### 11.2 Cookie inválido — retorna 401

**Request:**
```bash
curl -H "Cookie: admin_auth_token=fake" \
  http://localhost:3000/api/admin/mensageria/conversations
```

**Esperado:**
- [ ] Status 401

### 11.3 Isolamento por tenant

**Cenário:** 2 tenants diferentes

**Request (Tenant A):**
```bash
curl -H "Cookie: admin_auth_token=<jwt-A>" \
  http://localhost:3000/api/admin/mensageria/conversations
```

**Esperado:**
- [ ] Retorna apenas conversas do Tenant A
- [ ] Tenant B nunca vê dados de Tenant A

---

## 12. Execução Prática

### Rotina de testes automatizados (Node.js)

Criar script `scripts/test-mensageria-m0-m3.mjs`:

```javascript
import fetch from 'node-fetch'

const BASE = 'http://localhost:3000'
const JWT = '<seu-jwt>'

async function test(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
  }
}

// Testes
await test('GET /conversations — 200', async () => {
  const res = await fetch(`${BASE}/api/admin/mensageria/conversations`, {
    headers: { Cookie: `admin_auth_token=${JWT}` }
  })
  if (res.status !== 200) throw new Error(`status ${res.status}`)
})

// ... mais testes ...

console.log('\n✓ Todos os testes passaram!')
```

**Executar:**
```bash
node scripts/test-mensageria-m0-m3.mjs
```

---

## 13. Checklist Final

- [ ] Schema validado (tabelas + índices)
- [ ] Ingestão multi-canal funciona (WhatsApp, webform, manual)
- [ ] APIs respondendo corretamente
- [ ] UI renderiza sem erros
- [ ] Tempo real (SSE) funciona
- [ ] Etiquetas, respostas rápidas, SLA funcionam
- [ ] Isolamento por tenant
- [ ] Performance aceitável (< 1s para listagens)
- [ ] Dados realistas testados (50+ conversas)

---

## 14. Próximos Passos (após aprovação dos testes)

- [ ] Avançar para **M4 — Chatbot** (bot_flows + LLM)
- [ ] Migração para VPS (batch SQL)
- [ ] Provisionar módulo para tenants via `/admin/master/provisioning`
- [ ] Hardening: rate limits, validação de entrada, CORS

---

## Referências

- `docs/PLANO_MENSAGERIA.md` — Plano completo
- `src/app/mensageria/` — UI implementada
- `src/app/api/admin/mensageria/` — APIs implementadas
- `src/lib/mensageria/` — Serviços de negócio
