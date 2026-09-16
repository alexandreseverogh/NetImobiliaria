import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Versão compacta para cards KPI — evita truncamento em espaços reduzidos.
 * Mostra o valor completo (com centavos) até R$ 1.000.000; só abrevia em "M" acima
 * disso, faixa onde o texto ficaria longo demais pro espaço do card. Abreviar já a
 * partir de R$1.000 escondia os centavos atrás de um tooltip (title=fullValue em
 * KpiCard.tsx) que não existe em touch/mobile — sem hover, o valor exato ficava
 * inacessível nesses dispositivos.
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('pt-BR');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

/**
 * Rótulo de exibição por código de rede (public.ad_networks.code). Fonte única — antes
 * `dashboard/page.tsx` e `agentNotificador.ts` mantinham cópias próprias deste mapa, e
 * `CommandCenterView.tsx` nem usava um mapa: tinha um ternário binário
 * (`net === 'meta' ? 'Meta Ads' : 'Google Ads'`) que rotulava QUALQUER rede que não fosse
 * Meta como "Google Ads" — TikTok apareceria com o nome errado nos 3 KPIs de breakdown por
 * rede (docs/PLANO_TIKTOK.md, Achado 2). `networkLabel()` sempre retorna algo sensato mesmo
 * pra um código de rede desconhecido (capitaliza a 1ª letra), nunca finge que é outra rede.
 */
export const NETWORK_LABELS: Record<string, string> = { meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn' };

export function networkLabel(code: string): string {
  return NETWORK_LABELS[code] ?? (code.charAt(0).toUpperCase() + code.slice(1));
}

export const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Trafego', icon: '🌐' },
  { value: 'OUTCOME_SALES', label: 'Vendas', icon: '💰' },
  { value: 'OUTCOME_LEADS', label: 'Leads', icon: '📋' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento', icon: '❤️' },
  { value: 'OUTCOME_AWARENESS', label: 'Alcance', icon: '📢' },
];

export const CTA_TYPES = [
  { value: 'WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_TRAVEL', label: 'Reserve' },
  { value: 'GET_OFFER', label: 'Ver Oferta' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];


