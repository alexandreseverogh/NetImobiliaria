/**
 * Teste isolado do agente pendencia_atendimento — escopado a UM lead específico.
 * NUNCA chama findCandidates() nem o endpoint de scan (que varreriam a plataforma inteira).
 * Só leitura: chama evaluate() e imprime o resultado, sem gravar nada em crm_agent_actions.
 */
import { resolveEffectiveAgentConfig } from '../src/lib/crm/agents/effectiveConfig'
import { pendenciaAtendimentoAgent } from '../src/lib/crm/agents/pendenciaAtendimentoAgent'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_UUID = '75b3d95e-108a-4129-bdc7-06dc8aea1ff4' // TESTE ROTEIRO CRM - Agente Pendencia

async function main() {
  const cfg = await resolveEffectiveAgentConfig('pendencia_atendimento', TENANT_ID, null)
  console.log('--- Config efetiva ---')
  console.log(JSON.stringify(cfg, null, 2))

  if (!cfg || !cfg.ativo) {
    console.log('Agente não está ativo para este tenant/segmento — evaluate() não seria chamado.')
    process.exit(0)
  }

  const result = await pendenciaAtendimentoAgent.evaluate({
    tenantId: TENANT_ID,
    leadUuid: LEAD_UUID,
    clientId: null,
    segment: cfg.segment,
    params: cfg.params,
  })

  console.log('\n--- Resultado do evaluate() ---')
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
