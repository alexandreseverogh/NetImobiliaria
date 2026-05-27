/**
 * Next.js Instrumentation API
 * Executado UMA VEZ quando o servidor Node.js inicia.
 * Apenas no runtime 'nodejs' — não roda no Edge Runtime.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

let _started = false;

export async function register() {
  // Garante execução única (evita duplicação em Fast Refresh no dev)
  if (_started) return;

  // Apenas no runtime Node.js (não Edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  _started = true;

  try {
    // Importação dinâmica para evitar bundling no cliente
    const { startAgentMonitor } = await import('@/lib/marketing/services/agentMonitor');
    startAgentMonitor();
  } catch (err) {
    // Não crashar o servidor se o monitor falhar ao iniciar
    console.error('[instrumentation] Falha ao iniciar Agent Monitor:', err);
  }
}
