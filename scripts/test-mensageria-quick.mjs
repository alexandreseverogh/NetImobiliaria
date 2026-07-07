#!/usr/bin/env node

/**
 * Test Suite Rápido — Mensageria M0-M3
 *
 * Valida endpoints críticos e funcionalidades principais
 * Execução: node scripts/test-mensageria-quick.mjs
 *
 * Requer:
 * - Servidor rodando (npm run dev)
 * - JWT válido no .env.local ou passado como argumento
 * - Base de dados local com schema mensageria
 */

import fetch from 'node-fetch'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const JWT = process.env.TEST_JWT || process.argv[2]
const TENANT_ID = 'efbf62cf-9e28-4b31-a4f6-82a037412353' // Marketing Digital

if (!JWT) {
  console.error('❌ JWT não fornecido. Use: node scripts/test-mensageria-quick.mjs <jwt>')
  console.error('   Ou configure TEST_JWT no .env.local')
  process.exit(1)
}

const headers = {
  'Cookie': `admin_auth_token=${JWT}`,
  'Content-Type': 'application/json',
}

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗ ${name}`)
    console.error(`    → ${e.message}`)
    failed++
  }
}

async function request(method, path, body = null) {
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, opts)
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`${method} ${path} → ${res.status} (invalid JSON: ${text.slice(0, 100)})`)
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${json.error || text}`)
  }

  return { status: res.status, data: json }
}

console.log('\n📋 Testes Rápidos — Mensageria M0-M3\n')
console.log(`Base URL: ${BASE_URL}`)
console.log(`Tenant ID: ${TENANT_ID}\n`)

// ============================================================================
// Seção 1: Autenticação
// ============================================================================

console.log('📍 1. Autenticação\n')

await test('GET /conversations sem JWT → 401', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/mensageria/conversations`)
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`)
})

await test('GET /conversations com JWT válido → 200', async () => {
  const { status } = await request('GET', '/api/admin/mensageria/conversations')
  if (status !== 200) throw new Error(`Expected 200, got ${status}`)
})

// ============================================================================
// Seção 2: Leitura (Inbox)
// ============================================================================

console.log('\n📍 2. Leitura — Inbox\n')

let conversations = []
await test('GET /conversations retorna array', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/conversations')
  if (!Array.isArray(data.conversations)) throw new Error('Expected array of conversations')
  conversations = data.conversations || []
  console.log(`    (${conversations.length} conversas encontradas)`)
})

await test('GET /conversations com filtro assigneeId=unassigned', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/conversations?assigneeId=unassigned')
  if (!Array.isArray(data.conversations)) throw new Error('Expected array')
})

let conversationId = null
if (conversations.length > 0) {
  conversationId = conversations[0].id

  await test(`GET /conversations/${conversationId} retorna detalhe`, async () => {
    const { data } = await request('GET', `/api/admin/mensageria/conversations/${conversationId}`)
    if (!data.conversation) throw new Error('Expected conversation object')
    if (!data.messages) throw new Error('Expected messages array')
  })
}

// ============================================================================
// Seção 3: Labels
// ============================================================================

console.log('\n📍 3. Labels (Etiquetas)\n')

let labels = []
await test('GET /labels retorna array', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/labels')
  if (!Array.isArray(data.labels)) throw new Error('Expected array of labels')
  labels = data.labels || []
  console.log(`    (${labels.length} etiquetas encontradas)`)
})

await test('POST /labels cria nova etiqueta', async () => {
  const { data } = await request('POST', '/api/admin/mensageria/labels', {
    name: `Test Label ${Date.now()}`,
    color: '#22c55e',
  })
  if (!data.labelId) throw new Error('Expected labelId in response')
})

// ============================================================================
// Seção 4: Respostas Rápidas
// ============================================================================

console.log('\n📍 4. Respostas Rápidas (Canned Responses)\n')

let cannedResponses = []
await test('GET /canned-responses retorna array', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/canned-responses')
  if (!Array.isArray(data.cannedResponses)) throw new Error('Expected array')
  cannedResponses = data.cannedResponses || []
  console.log(`    (${cannedResponses.length} respostas rápidas encontradas)`)
})

await test('POST /canned-responses cria nova resposta', async () => {
  const { data } = await request('POST', '/api/admin/mensageria/canned-responses', {
    shortcut: `/test${Date.now()}`,
    content: 'Resposta de teste',
  })
  if (!data.id) throw new Error('Expected id in response')
})

// ============================================================================
// Seção 5: Times
// ============================================================================

console.log('\n📍 5. Times (Teams)\n')

let teams = []
await test('GET /teams retorna array', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/teams')
  if (!Array.isArray(data.teams)) throw new Error('Expected array')
  teams = data.teams || []
  console.log(`    (${teams.length} times encontrados)`)
})

if (teams.length > 0) {
  const teamId = teams[0].id
  await test(`GET /teams/${teamId}/members retorna membros`, async () => {
    const { data } = await request('GET', `/api/admin/mensageria/teams/${teamId}/members`)
    if (!Array.isArray(data.members)) throw new Error('Expected members array')
  })
}

// ============================================================================
// Seção 6: SLA Policies
// ============================================================================

console.log('\n📍 6. SLA Policies\n')

let slas = []
await test('GET /sla-policies retorna array', async () => {
  const { data } = await request('GET', '/api/admin/mensageria/sla-policies')
  if (!Array.isArray(data.policies)) throw new Error('Expected array')
  slas = data.policies || []
  console.log(`    (${slas.length} políticas de SLA encontradas)`)
})

// ============================================================================
// Seção 7: Operações em Conversa (se houver conversa)
// ============================================================================

if (conversationId) {
  console.log('\n📍 7. Operações em Conversa\n')

  await test('PATCH /conversations/{id} muda status', async () => {
    const { data } = await request('PATCH', `/api/admin/mensageria/conversations/${conversationId}`, {
      status: 'pending',
    })
    if (!data.conversationId) throw new Error('Expected conversationId in response')
  })

  await test('PATCH /conversations/{id} muda prioridade', async () => {
    const { data } = await request('PATCH', `/api/admin/mensageria/conversations/${conversationId}`, {
      priority: 'high',
    })
    if (!data.conversationId) throw new Error('Expected conversationId in response')
  })

  // Adicionar label (se houver label)
  if (labels.length > 0) {
    await test(`POST /conversations/{id}/labels adiciona etiqueta`, async () => {
      const { data } = await request('POST', `/api/admin/mensageria/conversations/${conversationId}/labels`, {
        labelId: labels[0].id,
      })
      // Pode não retornar nada, só validar status 200
    })
  }

  // Enviar mensagem
  await test('POST /conversations/{id}/messages envia mensagem', async () => {
    const { data } = await request('POST', `/api/admin/mensageria/conversations/${conversationId}/messages`, {
      content: `Teste automatizado ${new Date().toISOString()}`,
      isPrivate: false,
    })
    if (!data.messageId) throw new Error('Expected messageId in response')
  })

  // Nota interna
  await test('POST /conversations/{id}/messages cria nota interna', async () => {
    const { data } = await request('POST', `/api/admin/mensageria/conversations/${conversationId}/messages`, {
      content: 'Nota de teste — não enviada ao contato',
      isPrivate: true,
    })
    if (!data.messageId) throw new Error('Expected messageId in response')
  })
}

// ============================================================================
// Seção 8: Criar Conversa Manual
// ============================================================================

console.log('\n📍 8. Criar Conversa Manual\n')

await test('POST /conversations cria conversa manual', async () => {
  const { data } = await request('POST', '/api/admin/mensageria/conversations', {
    name: `Contato Teste ${Date.now()}`,
    phone: `+551199${Math.floor(Math.random() * 1000000)}`,
    email: null,
    initialMessage: 'Conversa iniciada manualmente via teste',
  })
  if (!data.conversationId) throw new Error('Expected conversationId in response')
  console.log(`    (Conversa criada: ${data.conversationId})`)
})

// ============================================================================
// Seção 9: SSE Stream
// ============================================================================

console.log('\n📍 9. Tempo Real (SSE)\n')

await test('GET /stream abre conexão SSE', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/mensageria/stream`, {
    headers: { 'Cookie': `admin_auth_token=${JWT}` },
  })
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
  if (!res.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('Expected content-type: text/event-stream')
  }
})

// ============================================================================
// Resumo
// ============================================================================

console.log('\n' + '='.repeat(60))
console.log(`\n✅ Testes Finalizados\n`)
console.log(`  Passou: ${passed}`)
console.log(`  Falhou: ${failed}`)
console.log(`  Total:  ${passed + failed}\n`)

if (failed === 0) {
  console.log('🎉 Todos os testes passaram!')
  process.exit(0)
} else {
  console.log('⚠️  Alguns testes falharam. Revise os erros acima.')
  process.exit(1)
}
