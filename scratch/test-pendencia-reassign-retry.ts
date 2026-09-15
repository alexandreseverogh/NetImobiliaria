/**
 * Retesta só o passo de reatribuição (reassignStalledLead), agora que Roberto Severo foi
 * marcado como plantonista. Chama direto a função de execução — não passa pelo evaluate()
 * do agente (que já registrou o degrau 3 e não dispararia de novo por idempotência).
 */
import { reassignStalledLead } from '../src/lib/crm/pendencia/reassignExecutor'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_UUID = '75b3d95e-108a-4129-bdc7-06dc8aea1ff4' // TESTE ROTEIRO CRM - Agente Pendencia

async function main() {
  const outcome = await reassignStalledLead(LEAD_UUID, TENANT_ID)
  console.log('--- Resultado da reatribuição ---')
  console.log(outcome)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
