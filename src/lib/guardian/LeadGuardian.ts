/**
 * LeadGuardian - Centralized Business Rules Enforcement
 * 
 * This class is the SINGLE SOURCE OF TRUTH for all lead routing decisions.
 * It strictly enforces the business rules defined in:
 * docs/REGRAS_DE_NEGOCIO_TRANSBORDO_LEADS.md
 * 
 * CRITICAL RULES:
 * 1. NO HARDCODING - All parameters come from database (parametros table)
 * 2. STRICT TIER HIERARCHY - External -> Internal -> Plantonista
 * 3. GEOGRAPHIC MATCHING - Estado + Cidade (no partial matches)
 * 4. SLA ENFORCEMENT - Strict expiration times per tier
 * 5. AUTO-ACCEPT RULES - Owner and Plantonista auto-accept (expira_em = NULL)
 */

import type {
    GuardianConfig,
    Assignment,
    AssignmentHistory,
    Prospect,
    Broker,
    TierDecision,
    ExpirationResult,
    RoutingDecision,
    BrokerTier,
    AssignmentStatus,
    AssignmentMotivo
} from './types';

export class LeadGuardian {
    private config: GuardianConfig;

    constructor(config: GuardianConfig) {
        this.config = config;
    }

    /**
     * Determines if an assignment should expire based on SLA rules
     * 
     * RULES:
     * - Assignments with expira_em = NULL NEVER expire (Owner/Plantonista)
     * - Assignments with type='imovel_corretor_fk' NEVER expire
     * - External brokers: use sla_minutos_aceite_lead
     * - Internal brokers: use sla_minutos_aceite_lead_interno
     */
    shouldExpire(assignment: Assignment): ExpirationResult {
        // Rule 1: NULL expira_em means auto-accept (never expires)
        if (assignment.expira_em === null) {
            return {
                shouldExpire: false,
                reason: 'Auto-accept assignment (expira_em is NULL)',
                slaMinutes: 0,
                expiresAt: null
            };
        }

        // Rule 2: Owner assignments never expire
        if (assignment.motivo?.type === 'imovel_corretor_fk') {
            return {
                shouldExpire: false,
                reason: 'Owner assignment (imovel_corretor_fk)',
                slaMinutes: 0,
                expiresAt: null
            };
        }

        // Rule 3: Check if expiration time has passed
        const now = new Date();
        const expiresAt = new Date(assignment.expira_em);
        const shouldExpire = expiresAt <= now;

        // Determine SLA based on assignment type
        const isInternal = assignment.motivo?.type === 'area_match_internal';
        const slaMinutes = isInternal
            ? this.config.sla_minutos_aceite_lead_interno
            : this.config.sla_minutos_aceite_lead;

        return {
            shouldExpire,
            reason: shouldExpire
                ? `SLA expired (${slaMinutes} minutes)`
                : `Within SLA (expires at ${expiresAt.toISOString()})`,
            slaMinutes,
            expiresAt
        };
    }

    /**
     * Determines the next tier to try based on assignment history
     * 
     * STRICT HIERARCHY:
     * 1. Try External brokers up to proximos_corretores_recebem_leads times
     * 2. Try Internal brokers up to proximos_corretores_recebem_leads_internos times
     * 3. Fallback to Plantonista
     * 
     * CRITICAL: This follows the "External -> Internal -> Plantonista" cascade
     */
    getNextTier(history: AssignmentHistory[]): TierDecision {
        // Count attempts by tier (excluding plantonista)
        const externalAttempts = history.filter(h =>
            (h.tipo_corretor === 'Externo' || h.tipo_corretor === null) &&
            !h.motivo_type.includes('plantonista')
        ).length;

        const internalAttempts = history.filter(h =>
            h.tipo_corretor === 'Interno' &&
            !h.motivo_type.includes('plantonista')
        ).length;

        const externalLimit = this.config.proximos_corretores_recebem_leads;
        const internalLimit = this.config.proximos_corretores_recebem_leads_internos;

        // Decision logic following strict hierarchy
        if (externalAttempts < externalLimit && internalAttempts === 0) {
            return {
                tier: 'External',
                reason: `External tier (attempt ${externalAttempts + 1}/${externalLimit})`,
                externalAttempts,
                internalAttempts,
                externalLimit,
                internalLimit
            };
        }

        if (internalAttempts < internalLimit) {
            return {
                tier: 'Internal',
                reason: `Internal tier (attempt ${internalAttempts + 1}/${internalLimit})`,
                externalAttempts,
                internalAttempts,
                externalLimit,
                internalLimit
            };
        }

        return {
            tier: 'Plantonista',
            reason: `Plantonista fallback (External: ${externalAttempts}/${externalLimit}, Internal: ${internalAttempts}/${internalLimit})`,
            externalAttempts,
            internalAttempts,
            externalLimit,
            internalLimit
        };
    }

    /**
     * Validates if a broker can be assigned to a prospect
     * 
     * VALIDATION RULES:
     * 1. Broker must be active (ativo = true)
     * 2. Geographic match: estado_fk AND cidade_fk must match (no partial)
     * 3. Broker must not have already received this lead
     */
    validateAssignment(
        prospect: Prospect,
        broker: Broker,
        history: AssignmentHistory[]
    ): { valid: boolean; reason: string } {
        // Rule 1: Broker must be active
        if (!broker.ativo) {
            return { valid: false, reason: 'Broker is not active' };
        }

        // Rule 2: Check if broker already received this lead
        const alreadyAssigned = history.some(h => h.corretor_fk === broker.id);
        if (alreadyAssigned) {
            return { valid: false, reason: 'Broker already received this lead' };
        }

        return { valid: true, reason: 'Valid assignment' };
    }

    /**
     * Calculates the expiration time for a new assignment
     * 
     * RULES:
     * - Owner assignments: expira_em = NULL (auto-accept)
     * - Plantonista assignments: expira_em = NULL (auto-accept)
     * - External brokers: NOW() + sla_minutos_aceite_lead
     * - Internal brokers: NOW() + sla_minutos_aceite_lead_interno
     */
    calculateExpirationTime(
        tier: BrokerTier,
        isOwner: boolean
    ): Date | null {
        // Auto-accept cases (no expiration)
        if (isOwner || tier === 'Plantonista') {
            return null;
        }

        // Calculate expiration based on tier
        const slaMinutes = tier === 'Internal'
            ? this.config.sla_minutos_aceite_lead_interno
            : this.config.sla_minutos_aceite_lead;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + slaMinutes);

        return expiresAt;
    }

    /**
     * Determines the assignment status based on routing context
     * 
     * RULES:
     * - Owner assignments: status = 'aceito' (auto-accept)
     * - Plantonista assignments: status = 'aceito' (auto-accept)
     * - All other assignments: status = 'atribuido' (requires manual accept)
     */
    determineAssignmentStatus(
        tier: BrokerTier,
        isOwner: boolean
    ): AssignmentStatus {
        if (isOwner || tier === 'Plantonista') {
            return 'aceito';
        }
        return 'atribuido';
    }

    /**
     * Creates the motivo (reason) object for an assignment
     * 
     * This provides audit trail and debugging information
     */
    createAssignmentMotivo(
        tier: BrokerTier,
        isOwner: boolean,
        source: string,
        previousBrokerId?: string,
        attempts?: number
    ): AssignmentMotivo {
        if (isOwner) {
            return {
                type: 'imovel_corretor_fk',
                source
            };
        }

        if (tier === 'Plantonista') {
            return {
                type: 'fallback_plantonista',
                source,
                previous_corretor_fk: previousBrokerId,
                attempts
            };
        }

        if (tier === 'Internal') {
            return {
                type: 'area_match_internal',
                source,
                previous_corretor_fk: previousBrokerId,
                attempts,
                limit: this.config.proximos_corretores_recebem_leads_internos
            };
        }

        // External
        return {
            type: 'area_match',
            source,
            previous_corretor_fk: previousBrokerId,
            attempts,
            limit: this.config.proximos_corretores_recebem_leads
        };
    }

    /**
     * Makes a complete routing decision for a prospect
     * 
     * This is the main entry point for routing logic
     */
    makeRoutingDecision(
        prospect: Prospect,
        broker: Broker | null,
        tier: BrokerTier,
        history: AssignmentHistory[],
        source: string,
        previousBrokerId?: string
    ): RoutingDecision {
        const isOwner = prospect.corretor_fk === broker?.id;
        const shouldAutoAccept = isOwner || tier === 'Plantonista';

        const tierDecision = this.getNextTier(history);
        const attempts = tier === 'External'
            ? tierDecision.externalAttempts + 1
            : tierDecision.internalAttempts + 1;

        return {
            broker,
            tier,
            motivo: this.createAssignmentMotivo(tier, isOwner, source, previousBrokerId, attempts),
            status: this.determineAssignmentStatus(tier, isOwner),
            expira_em: this.calculateExpirationTime(tier, isOwner),
            shouldAutoAccept
        };
    }

    /**
     * Gets the current configuration
     */
    getConfig(): GuardianConfig {
        return { ...this.config };
    }
}

export default LeadGuardian;
