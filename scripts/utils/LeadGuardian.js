/**
 * LeadGuardian - Centralized Business Rules Enforcement (JavaScript Version for Scripts)
 */

class LeadGuardian {
    constructor(config) {
        this.config = config;
    }

    /**
     * Determines if an assignment should expire based on SLA rules
     */
    shouldExpire(assignment) {
        if (assignment.expira_em === null) {
            return {
                shouldExpire: false,
                reason: 'Auto-accept assignment (expira_em is NULL)',
                slaMinutes: 0,
                expiresAt: null
            };
        }

        if (assignment.motivo?.type === 'imovel_corretor_fk') {
            return {
                shouldExpire: false,
                reason: 'Owner assignment (imovel_corretor_fk)',
                slaMinutes: 0,
                expiresAt: null
            };
        }

        const now = new Date();
        const expiresAt = new Date(assignment.expira_em);
        const shouldExpire = expiresAt <= now;

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
     */
    getNextTier(history) {
        const externalAttempts = history.filter(h =>
            (h.tipo_corretor === 'Externo' || h.tipo_corretor === null) &&
            !String(h.motivo_type || h.m_type || '').includes('plantonista')
        ).length;

        const internalAttempts = history.filter(h =>
            h.tipo_corretor === 'Interno' &&
            !String(h.motivo_type || h.m_type || '').includes('plantonista')
        ).length;

        const externalLimit = this.config.proximos_corretores_recebem_leads;
        const internalLimit = this.config.proximos_corretores_recebem_leads_internos;

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
     * Calculates the expiration time for a new assignment
     */
    calculateExpirationTime(tier, isOwner) {
        if (isOwner || tier === 'Plantonista') {
            return null;
        }

        const slaMinutes = tier === 'Internal'
            ? this.config.sla_minutos_aceite_lead_interno
            : this.config.sla_minutos_aceite_lead;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + slaMinutes);

        return expiresAt;
    }

    /**
     * Determines the assignment status
     */
    determineAssignmentStatus(tier, isOwner) {
        if (isOwner || tier === 'Plantonista') {
            return 'aceito';
        }
        return 'atribuido';
    }

    /**
     * Creates the motivo object for an assignment
     */
    createAssignmentMotivo(tier, isOwner, source, previousBrokerId, attempts) {
        if (isOwner) {
            return { type: 'imovel_corretor_fk', source };
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

        return {
            type: 'area_match',
            source,
            previous_corretor_fk: previousBrokerId,
            attempts,
            limit: this.config.proximos_corretores_recebem_leads
        };
    }
}

module.exports = { LeadGuardian };
