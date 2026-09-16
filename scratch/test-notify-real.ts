/**
 * Teste final: dispara notifyWhatsApp() de verdade contra a instância real da Evolution API,
 * reutilizando o texto exato do degrau 3 já gravado — prova ponta a ponta que a plataforma
 * consegue notificar de verdade via WhatsApp real, não só simular.
 */
import { notifyWhatsApp } from '../src/lib/marketing/services/agentNotificador'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO

async function main() {
  const msg =
    `⏱️ REATRIBUIÇÃO AUTOMÁTICA — lead sem resposta há 8min\n` +
    `TESTE ROTEIRO CRM - Agente Pendencia passou de 6 min aguardando uma ação nossa (1º contato) ` +
    `mesmo após o alerta e o escalonamento. Responsável anterior: Alexandre Severo Campos Lima.\n\n` +
    `🤖 Ação automática: reatribuído automaticamente: Alexandre Severo Campos Lima → Roberto Severo (fallback_plantonista)\n\n` +
    `[TESTE ROTEIRO CRM — mensagem de verificação da instância real da Evolution API]`

  console.log('Enviando via notifyWhatsApp()...')
  await notifyWhatsApp(msg, TENANT_ID)
  console.log('Chamada concluída. Confira seu WhatsApp.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
