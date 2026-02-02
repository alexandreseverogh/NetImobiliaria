/**
 * Guardian Configuration Helper
 * 
 * Fetches Guardian configuration from the database (parametros table)
 * This ensures NO HARDCODING of business rule parameters
 */

import pool from '../database/connection';
import type { GuardianConfig } from './types';

/**
 * Fetches Guardian configuration from the parametros table
 * 
 * CRITICAL: This is the ONLY way to get configuration values.
 * Never hardcode SLA times or retry limits in the code.
 */
export async function fetchGuardianConfig(dbClient?: any): Promise<GuardianConfig> {
    const runner = dbClient || pool;

    try {
        const result = await runner.query(`
      SELECT 
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads_internos,
        sla_minutos_aceite_lead_interno
      FROM public.parametros
      LIMIT 1
    `);

        if (result.rows.length === 0) {
            // Fallback to safe defaults if no config exists
            console.warn('[Guardian] No parametros found in database, using defaults');
            return {
                proximos_corretores_recebem_leads: 3,
                sla_minutos_aceite_lead: 5,
                proximos_corretores_recebem_leads_internos: 3,
                sla_minutos_aceite_lead_interno: 15
            };
        }

        const row = result.rows[0];

        return {
            proximos_corretores_recebem_leads: Number(row.proximos_corretores_recebem_leads) || 3,
            sla_minutos_aceite_lead: Number(row.sla_minutos_aceite_lead) || 5,
            proximos_corretores_recebem_leads_internos: Number(row.proximos_corretores_recebem_leads_internos) || 3,
            sla_minutos_aceite_lead_interno: Number(row.sla_minutos_aceite_lead_interno) || 15
        };
    } catch (error) {
        console.error('[Guardian] Error fetching config from database:', error);
        // Return safe defaults on error
        return {
            proximos_corretores_recebem_leads: 3,
            sla_minutos_aceite_lead: 5,
            proximos_corretores_recebem_leads_internos: 3,
            sla_minutos_aceite_lead_interno: 15
        };
    }
}

/**
 * Fetches assignment history for a prospect
 * Used by Guardian to determine next tier
 */
export async function fetchAssignmentHistory(prospectId: number, dbClient?: any) {
    const runner = dbClient || pool;

    const result = await runner.query(`
    SELECT 
      pa.corretor_fk,
      u.tipo_corretor,
      COALESCE(pa.motivo->>'type', '') as motivo_type,
      pa.status,
      pa.created_at
    FROM public.imovel_prospect_atribuicoes pa
    JOIN public.users u ON u.id = pa.corretor_fk
    WHERE pa.prospect_id = $1
    ORDER BY pa.created_at ASC
  `, [prospectId]);

    return result.rows.map((row: any) => ({
        corretor_fk: row.corretor_fk,
        tipo_corretor: row.tipo_corretor,
        motivo_type: row.motivo_type,
        status: row.status,
        created_at: new Date(row.created_at)
    }));
}
