import dynamic from 'next/dynamic';

/**
 * ============================================================
 * AUDIT ENRICHMENT REGISTRY
 * ============================================================
 * Este arquivo centraliza o mapeamento entre os IDs salvos no 
 * banco de dados pelo MASTER e os componentes React físicos.
 * 
 * Usamos dynamic import para carregar apenas o que for necessário.
 * ============================================================
 */

export const AuditRegistry: Record<string, any> = {
  // Mapeamento: 'id-do-banco' -> Componente React
  'imovel-audit-card': dynamic(() => import('./ImovelAuditDetail')),
  
  // Futuros componentes premium podem ser adicionados aqui:
  // 'cliente-rich-card': dynamic(() => import('./ClienteAuditDetail')),
  // 'paciente-rich-card': dynamic(() => import('./PacienteAuditDetail')),
};

export type EnrichmentType = 'NONE' | 'UNIVERSAL' | 'PREMIUM';

export interface AuditConfig {
  table_name: string;
  enrichment_type: EnrichmentType;
  premium_component_id?: string;
  is_active: boolean;
}
