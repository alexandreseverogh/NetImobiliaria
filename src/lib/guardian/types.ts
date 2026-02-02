/**
 * Guardian Rules - Type Definitions
 * Strict types for lead routing business logic enforcement
 */

export type BrokerTier = 'External' | 'Internal' | 'Plantonista';

export type AssignmentStatus = 'atribuido' | 'aceito' | 'expirado' | 'rejeitado';

export interface GuardianConfig {
    /** Maximum number of External brokers to try before moving to Internal tier */
    proximos_corretores_recebem_leads: number;

    /** SLA time in minutes for External brokers to accept a lead */
    sla_minutos_aceite_lead: number;

    /** Maximum number of Internal brokers to try before moving to Plantonista */
    proximos_corretores_recebem_leads_internos: number;

    /** SLA time in minutes for Internal brokers to accept a lead */
    sla_minutos_aceite_lead_interno: number;
}

export interface Assignment {
    id: number;
    prospect_id: number;
    corretor_fk: string;
    status: AssignmentStatus;
    motivo: AssignmentMotivo;
    expira_em: Date | null;
    data_aceite: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface AssignmentMotivo {
    type: 'imovel_corretor_fk' | 'area_match' | 'area_match_internal' | 'fallback_plantonista' | string;
    source?: string;
    previous_corretor_fk?: string;
    attempts?: number;
    limit?: number;
    debug?: string;
}

export interface AssignmentHistory {
    corretor_fk: string;
    tipo_corretor: 'Externo' | 'Interno' | null;
    motivo_type: string;
    status: AssignmentStatus;
    created_at: Date;
}

export interface Prospect {
    id: number;
    id_imovel: number;
    id_cliente: string;
    estado_fk: string;
    cidade_fk: string;
    corretor_fk?: string | null;
    created_at: Date;
}

export interface Broker {
    id: string;
    nome: string;
    email: string;
    tipo_corretor: 'Externo' | 'Interno' | null;
    is_plantonista: boolean;
    ativo: boolean;
}

export interface TierDecision {
    tier: BrokerTier;
    reason: string;
    externalAttempts: number;
    internalAttempts: number;
    externalLimit: number;
    internalLimit: number;
}

export interface ExpirationResult {
    shouldExpire: boolean;
    reason: string;
    slaMinutes: number;
    expiresAt: Date | null;
}

export interface RoutingDecision {
    broker: Broker | null;
    tier: BrokerTier;
    motivo: AssignmentMotivo;
    status: AssignmentStatus;
    expira_em: Date | null;
    shouldAutoAccept: boolean;
}
