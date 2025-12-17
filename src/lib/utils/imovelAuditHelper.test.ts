/**
 * 🧪 TESTES PARA HELPER DE AUDITORIA DE IMÓVEIS
 * 
 * Este arquivo contém testes manuais para validar a função buildImovelAuditChanges
 * 
 * ⚠️ IMPORTANTE: Execute estes testes ANTES de integrar na API principal
 */

import { buildImovelAuditChanges } from './imovelAuditHelper'

// ============================================
// TESTE 1: Campo simples (título)
// ============================================
console.log('🧪 TESTE 1: Alteração de título')
const test1_before = {
  titulo: 'Apartamento antigo',
  preco: 500000
}
const test1_after = {
  titulo: 'Apartamento renovado',
  preco: 500000
}
const test1_result = buildImovelAuditChanges(test1_before, test1_after)
console.log('Resultado:', JSON.stringify(test1_result, null, 2))
console.log('Esperado: { titulo: { before: "Apartamento antigo", after: "Apartamento renovado" } }')
console.log('✅ PASSOU:', Object.keys(test1_result).length === 1 && test1_result.titulo?.before === 'Apartamento antigo')
console.log('---')

// ============================================
// TESTE 2: Múltiplos campos
// ============================================
console.log('🧪 TESTE 2: Alteração de título + preço')
const test2_before = {
  titulo: 'Casa pequena',
  preco: 300000,
  descricao: 'Descrição antiga'
}
const test2_after = {
  titulo: 'Casa grande',
  preco: 350000,
  descricao: 'Descrição antiga'
}
const test2_result = buildImovelAuditChanges(test2_before, test2_after)
console.log('Resultado:', JSON.stringify(test2_result, null, 2))
console.log('Esperado: 2 campos (titulo, preco)')
console.log('✅ PASSOU:', Object.keys(test2_result).length === 2 && test2_result.titulo && test2_result.preco)
console.log('---')

// ============================================
// TESTE 3: Nenhuma alteração
// ============================================
console.log('🧪 TESTE 3: Nenhuma alteração')
const test3_before = {
  titulo: 'Mesmo título',
  preco: 400000
}
const test3_after = {
  titulo: 'Mesmo título',
  preco: 400000
}
const test3_result = buildImovelAuditChanges(test3_before, test3_after)
console.log('Resultado:', JSON.stringify(test3_result, null, 2))
console.log('Esperado: {} (objeto vazio)')
console.log('✅ PASSOU:', Object.keys(test3_result).length === 0)
console.log('---')

// ============================================
// TESTE 4: Endereço (objeto nested)
// ============================================
console.log('🧪 TESTE 4: Alteração de CEP')
const test4_before = {
  cep: '50000-000',
  cidade: 'Recife'
}
const test4_after = {
  endereco: {
    cep: '51000-000',
    cidade: 'Recife'
  }
}
const test4_result = buildImovelAuditChanges(test4_before, test4_after)
console.log('Resultado:', JSON.stringify(test4_result, null, 2))
console.log('Esperado: { cep: { before: "50000-000", after: "51000-000" } }')
console.log('✅ PASSOU:', test4_result.cep?.before === '50000-000' && test4_result.cep?.after === '51000-000')
console.log('---')

// ============================================
// TESTE 5: Preços (nomes diferentes frontend/backend)
// ============================================
console.log('🧪 TESTE 5: Alteração de preço condomínio (nome diferente)')
const test5_before = {
  preco_condominio: 500
}
const test5_after = {
  precoCondominio: 600
}
const test5_result = buildImovelAuditChanges(test5_before, test5_after)
console.log('Resultado:', JSON.stringify(test5_result, null, 2))
console.log('Esperado: { preco_condominio: { before: 500, after: 600 } }')
console.log('✅ PASSOU:', test5_result.preco_condominio?.before === 500 && test5_result.preco_condominio?.after === 600)
console.log('---')

// ============================================
// TESTE 6: Amenidades (arrays)
// ============================================
console.log('🧪 TESTE 6: Alteração de amenidades')
const test6_before = {
  amenidades: [1, 2, 3]
}
const test6_after = {
  amenidades: [1, 2, 3, 4]
}
const test6_result = buildImovelAuditChanges(test6_before, test6_after)
console.log('Resultado:', JSON.stringify(test6_result, null, 2))
console.log('Esperado: { amenidades: { before: [1,2,3], after: [1,2,3,4], added: [4] } }')
console.log('✅ PASSOU:', 
  Array.isArray(test6_result.amenidades?.before) &&
  Array.isArray(test6_result.amenidades?.after) &&
  test6_result.amenidades?.added?.includes(4)
)
console.log('---')

// ============================================
// TESTE 7: Valores null/undefined
// ============================================
console.log('🧪 TESTE 7: Valores null/undefined')
const test7_before = {
  titulo: null,
  preco: null
}
const test7_after = {
  titulo: 'Novo título',
  preco: 500000
}
const test7_result = buildImovelAuditChanges(test7_before, test7_after)
console.log('Resultado:', JSON.stringify(test7_result, null, 2))
console.log('Esperado: 2 campos alterados (titulo e preco)')
console.log('✅ PASSOU:', Object.keys(test7_result).length === 2)
console.log('---')

// ============================================
// TESTE 8: Valores numéricos como string
// ============================================
console.log('🧪 TESTE 8: Preço como string')
const test8_before = {
  preco: 500000
}
const test8_after = {
  preco: '525000' // String do frontend
}
const test8_result = buildImovelAuditChanges(test8_before, test8_after)
console.log('Resultado:', JSON.stringify(test8_result, null, 2))
console.log('Esperado: { preco: { before: 500000, after: 525000 } }')
console.log('✅ PASSOU:', test8_result.preco?.before === 500000 && test8_result.preco?.after === 525000)
console.log('---')

// ============================================
// RESUMO DOS TESTES
// ============================================
console.log('\n📊 RESUMO DOS TESTES:')
console.log('Execute os testes acima e verifique se todos passaram ✅')
console.log('Se algum teste falhar, NÃO integre a função na API principal!')
console.log('Corrija os bugs primeiro e teste novamente.')

