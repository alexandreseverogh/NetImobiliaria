/**
 * Script de teste isolado para ingestMessage() — roda fora do Next.js.
 * Uso: npx ts-node -r tsconfig-paths/register scripts/test-ingest-message.ts
 * Limpa os próprios dados de teste ao final (idempotente, seguro para re-rodar).
 */
import { ingestMessage } from '../src/lib/mensageria/ingest'
import pool from '../src/lib/database/connection'

const TENANT_ID = 'efbf62cf-9e28-4b31-a4f6-82a037412353'
const TEST_PHONE = '5511999990000' // prefixo distinto p/ não colidir com dados reais

async function cleanup() {
  await pool.query(
    `DELETE FROM mensageria.conversations WHERE tenant_id = $1 AND contact_id IN (
       SELECT id FROM mensageria.contacts WHERE tenant_id = $1 AND phone = $2
     )`,
    [TENANT_ID, TEST_PHONE],
  )
  await pool.query(`DELETE FROM mensageria.contacts WHERE tenant_id = $1 AND phone = $2`, [TENANT_ID, TEST_PHONE])
  // precisa achar a inbox de teste antes de apagar (via config marker)
  await pool.query(
    `DELETE FROM mensageria.inboxes WHERE tenant_id = $1 AND config->>'test_marker' = 'ingest-test'`,
    [TENANT_ID],
  )
}

async function run() {
  console.log('--- limpando dados de teste anteriores ---')
  await cleanup()

  console.log('--- criando inbox de teste ---')
  const { rows } = await pool.query(
    `INSERT INTO mensageria.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'Inbox Teste Ingest', 'whatsapp', 'evolution', '{"test_marker":"ingest-test"}'::jsonb)
     RETURNING id`,
    [TENANT_ID],
  )
  const inboxId = rows[0].id
  console.log('inboxId:', inboxId)

  console.log('\n--- TESTE 1: primeira mensagem inbound (deve criar contact + conversation) ---')
  const r1 = await ingestMessage({
    tenantId: TENANT_ID,
    inboxId,
    contact: { name: 'Contato Teste', phone: TEST_PHONE },
    direction: 'inbound',
    senderType: 'contact',
    content: 'Olá, tenho interesse em um apartamento',
    externalId: 'evo-msg-001',
  })
  console.log(r1)
  assert(r1.isNewContact === true, 'deveria ser contato novo')
  assert(r1.isNewConversation === true, 'deveria ser conversa nova')
  assert(r1.messageId !== null, 'deveria ter criado mensagem')

  console.log('\n--- TESTE 2: segunda mensagem do MESMO contato (mesma conversation, contact existente) ---')
  const r2 = await ingestMessage({
    tenantId: TENANT_ID,
    inboxId,
    contact: { name: 'Contato Teste', phone: TEST_PHONE },
    direction: 'inbound',
    senderType: 'contact',
    content: 'Vocês têm algo em Copacabana?',
    externalId: 'evo-msg-002',
  })
  console.log(r2)
  assert(r2.isNewContact === false, 'contato NÃO deveria ser novo')
  assert(r2.isNewConversation === false, 'conversa NÃO deveria ser nova')
  assert(r2.conversationId === r1.conversationId, 'deveria reusar a MESMA conversation')

  console.log('\n--- TESTE 3: resposta do agente (outbound) — marca first_response_at ---')
  const r3 = await ingestMessage({
    tenantId: TENANT_ID,
    inboxId,
    contact: { phone: TEST_PHONE },
    direction: 'outbound',
    senderType: 'agent',
    content: 'Olá! Temos sim, posso te enviar opções.',
  })
  console.log(r3)
  assert(r3.conversationId === r1.conversationId, 'resposta deveria ir para a MESMA conversation')

  const { rows: convRows } = await pool.query(
    `SELECT first_response_at, unread_count FROM mensageria.conversations WHERE id = $1`,
    [r1.conversationId],
  )
  console.log('conversation state:', convRows[0])
  assert(convRows[0].first_response_at !== null, 'first_response_at deveria estar preenchido')
  assert(Number(convRows[0].unread_count) === 2, 'unread_count deveria ser 2 (duas mensagens inbound)')

  console.log('\n--- TESTE 4: reenvio do MESMO externalId (idempotência — não deve duplicar) ---')
  const { rows: countBefore } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM mensageria.messages WHERE conversation_id = $1`,
    [r1.conversationId],
  )
  const r4 = await ingestMessage({
    tenantId: TENANT_ID,
    inboxId,
    contact: { phone: TEST_PHONE },
    direction: 'inbound',
    senderType: 'contact',
    content: 'Olá, tenho interesse em um apartamento', // mesmo conteúdo
    externalId: 'evo-msg-001', // MESMO external_id do teste 1 — reenvio do provider
  })
  const { rows: countAfter } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM mensageria.messages WHERE conversation_id = $1`,
    [r1.conversationId],
  )
  console.log('r4 (deve ter messageId=null):', r4)
  console.log('count before:', countBefore[0].n, 'count after:', countAfter[0].n)
  assert(r4.messageId === null, 'reenvio deveria retornar messageId=null (idempotência)')
  assert(countBefore[0].n === countAfter[0].n, 'contagem de mensagens NÃO deveria mudar')

  console.log('\n✅ TODOS OS TESTES PASSARAM')

  console.log('\n--- limpando dados de teste ---')
  await cleanup()
  await pool.end()
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('❌ FALHOU:', msg)
    process.exitCode = 1
    throw new Error('Assertion failed: ' + msg)
  }
  console.log('✓', msg)
}

run().catch(async (e) => {
  console.error('ERRO NO TESTE:', e)
  await pool.end()
  process.exit(1)
})
