import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';
import { routeProspectAndNotify } from '@/lib/routing/prospectRouter';
import emailService from '@/services/emailService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const client = await pool.connect();

    try {
        // 1. Ler Parâmetros Gerais
        const paramsRes = await client.query('SELECT proximos_corretores_recebem_leads, proximos_corretores_recebem_leads_internos, sla_minutos_aceite_lead FROM parametros LIMIT 1');
        const limitExternal = parseInt(paramsRes.rows[0]?.proximos_corretores_recebem_leads || '3');
        const limitInternal = parseInt(paramsRes.rows[0]?.proximos_corretores_recebem_leads_internos || '3');
        const slaMinutos = parseInt(paramsRes.rows[0]?.sla_minutos_aceite_lead || '5');

        // 2. Buscar atribuições vencidas (status='atribuido' e expira_em < NOW())
        const expiredQuery = `
      SELECT 
        pa.id, 
        pa.prospect_id, 
        pa.corretor_fk,
        u.email as corretor_email,
        u.nome as corretor_nome,
        i.codigo as imovel_codigo
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      JOIN imovel_prospects ip ON ip.id = pa.prospect_id
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE pa.status = 'atribuido' 
        AND pa.expira_em < NOW()
      FOR UPDATE SKIP LOCKED
    `;

        await client.query('BEGIN');
        const expiredResult = await client.query(expiredQuery);
        const expiredList = expiredResult.rows;

        const summary = {
            processed: 0,
            reassigned: 0,
            to_plantonista: 0,
            errors: 0
        };

        for (const item of expiredList) {
            try {
                summary.processed++;

                // A. Marcar como expirado
                await client.query(
                    `UPDATE imovel_prospect_atribuicoes 
           SET status = 'expirado', motivo = jsonb_set(COALESCE(motivo, '{}'), '{expirado_em}', to_jsonb(NOW())) 
           WHERE id = $1`,
                    [item.id]
                );

                // B. Notificar Corretor que Perdeu e Aplicar Penalidade
                if (item.corretor_fk) {
                    // 1. Penalidade de XP (Gamificação)
                    try {
                        console.log(`[Transbordo] Aplicando penalidade ao corretor ${item.corretor_fk} por perder lead ${item.prospect_id}`);
                        const { GamificationService } = await import('@/lib/gamification/gamificationService');
                        await GamificationService.penalizeSLA(item.corretor_fk);
                    } catch (gErr) {
                        console.error(`[Transbordo] Falha ao aplicar penalidade:`, gErr);
                    }

                    // 2. Email de Perda
                    if (item.corretor_email) {
                        try {
                            await emailService.sendTemplateEmail('lead-expirado', item.corretor_email, {
                                nome_corretor: item.corretor_nome,
                                codigo_imovel: item.imovel_codigo || 'N/A',
                                sla_minutos: String(slaMinutos || '5')
                            });
                        } catch (emailErr) {
                            console.warn(`[Transbordo] Falha ao enviar email de perda para ${item.corretor_email}:`, emailErr);
                        }
                    }
                }

                await client.query('COMMIT');
                await client.query('BEGIN');

                // C. Buscar histórico de tentativas para este propspect
                const historyRes = await client.query(
                    `SELECT pa.corretor_fk, u.tipo_corretor, u.is_plantonista 
                     FROM imovel_prospect_atribuicoes pa
                     JOIN users u ON u.id = pa.corretor_fk
                     WHERE pa.prospect_id = $1`,
                    [item.prospect_id]
                );

                const distinctBrokers = historyRes.rows.map(r => r.corretor_fk); // UUIDs para exclude

                // Contar tentativas por tipo (ignorando plantonistas pois eles são o fim da linha)
                // is_plantonista precedence overrides tipo_corretor usually, but here checking explicit fields
                const externalAttempts = historyRes.rows.filter(r =>
                    (r.tipo_corretor === 'Externo') && !r.is_plantonista
                ).length;

                const internalAttempts = historyRes.rows.filter(r =>
                    (r.tipo_corretor === 'Interno') && !r.is_plantonista
                ).length;

                // D. Decidir Roteamento (Tiered Transbordo)
                let targetTier: 'External' | 'Internal' | 'Plantonista' = 'External';
                let forceFallback = false;

                if (externalAttempts < limitExternal && internalAttempts === 0) {
                    targetTier = 'External';
                } else if (internalAttempts < limitInternal) {
                    targetTier = 'Internal';
                } else {
                    targetTier = 'Plantonista';
                    forceFallback = true;
                }

                console.log(`[Transbordo] Roteando prospect ${item.prospect_id}. Ext: ${externalAttempts}/${limitExternal}, Int: ${internalAttempts}/${limitInternal}. Target: ${targetTier}`);

                const result = await routeProspectAndNotify(item.prospect_id, distinctBrokers, { forceFallback, targetTier, dbClient: client });

                console.log(`[Transbordo] Resultado do roteamento:`, JSON.stringify(result));

                if (result.success) {
                    summary.reassigned++;
                    console.log(`[Transbordo] ✅ Prospect ${item.prospect_id} redistribuído com sucesso`);
                } else {
                    summary.errors++;
                    console.error(`[Transbordo] ❌ Falha ao re-rotear prospect ${item.prospect_id}: ${result.reason}`);
                }

            } catch (err) {
                summary.errors++;
                console.error(`[Transbordo] Erro processando item ${item.id}:`, err);
            }
        }

        await client.query('COMMIT');

        return NextResponse.json({
            success: true,
            summary
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Transbordo] Erro fatal:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    } finally {
        client.release();
    }
}
