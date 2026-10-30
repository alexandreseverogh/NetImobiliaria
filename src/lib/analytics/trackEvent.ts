'use client';

/**
 * Helper de telemetria de conversão — F0 do plano de SEO/GEO
 * (docs/PLANO_SEO_GEO_ARTEMIS4.md §6, item 6).
 *
 * Empurra pro `dataLayer` (GTM) E chama `gtag` direto (GA4) — redundante de propósito, pra
 * funcionar mesmo que só um dos dois esteja configurado (GTM sem GA4 encadeado dentro dele,
 * ou GA4 instalado sem GTM). Nunca lança erro se nenhum dos dois existir (ex.: adblocker,
 * ou ainda sem os IDs reais configurados) — checa a existência antes de chamar qualquer coisa.
 *
 * Nomes de evento seguem, quando aplicável, o vocabulário padrão do GA4 (ex.: `generate_lead`,
 * que já tem relatório pronto no GA4) — nunca inventa um nome novo pra algo que o GA4 já
 * reconhece nativamente.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch { /* best-effort — nunca quebra a interação do visitante por causa de telemetria */ }

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch { /* idem */ }
}
