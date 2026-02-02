import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';
import { routeProspectAndNotify } from '@/lib/routing/prospectRouter';
import emailService from '@/services/emailService';
import fs from 'fs';
import path from 'path';

function cronDebugLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'cron_debug.txt')
        const time = new Date().toISOString()
        fs.appendFileSync(logPath, `[${time}] ${msg}\n`)
    } catch (e) { }
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    cronDebugLog('GET /api/cron/transbordo called');
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
        i.codigo as imovel_codigo,
        i.titulo as imovel_titulo,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        i.preco,
        i.descricao,
        i.endereco,
        i.numero,
        i.bairro,
        i.cidade_fk,
        i.estado_fk,
        i.cep,
        i.quartos,
        i.banheiros,
        i.vagas_garagem,
        i.area_total
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      JOIN imovel_prospects ip ON ip.id = pa.prospect_id
      JOIN imoveis i ON i.id = ip.id_imovel
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN status_imovel si ON i.status_fk = si.id
      WHERE pa.status = 'atribuido' 
        AND pa.expira_em < NOW()
      FOR UPDATE OF pa SKIP LOCKED
    `;

        // Helpers de formatação
        const formatCurrency = (val: any) => {
            const n = parseFloat(val);
            if (isNaN(n)) return 'R$ 0,00';
            return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        const formatAddress = (item: any) => {
            const parts = [
                item.endereco,
                item.numero ? `nº ${item.numero}` : '',
                item.bairro,
                item.cidade_fk,
                item.estado_fk,
                item.cep ? `CEP: ${item.cep}` : ''
            ].filter(Boolean);
            return parts.join(', ');
        };

        const formatDetails = (item: any) => {
            const parts = [];
            if (item.quartos) parts.push(`${item.quartos} quartos`);
            if (item.banheiros) parts.push(`${item.banheiros} banheiros`);
            if (item.vagas_garagem) parts.push(`${item.vagas_garagem} vagas`);
            if (item.area_total) parts.push(`área: ${parseFloat(item.area_total).toFixed(2)} m²`);
            return parts.join(', ');
        };

        await client.query('BEGIN');
        const expiredResult = await client.query(expiredQuery);
        const expiredList = expiredResult.rows;
        cronDebugLog(`Found ${expiredList.length} expired assignments`);

        const summary = {
            processed: 0,
            reassigned: 0,
            to_plantonista: 0,
            errors: 0
        };

        for (const item of expiredList) {
            try {
                summary.processed++;

                // A. Marcar como expirado e dar COMMIT imediato para liberar o lock da linha
                await client.query('BEGIN'); // Start a new transaction for this item's expiration
                await client.query(
                    `UPDATE imovel_prospect_atribuicoes 
                     SET status = 'expirado', motivo = jsonb_set(COALESCE(motivo, '{}'), '{expirado_em}', to_jsonb(NOW())) 
                     WHERE id = $1`,
                    [item.id]
                );
                await client.query('COMMIT');
                cronDebugLog(`Lead ${item.prospect_id}: marked as expired and committed.`);

                // B. Notificar Corretor que Perdeu e Aplicar Penalidade (FORA da transação principal)
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
                                sla_minutos: String(slaMinutos || '5'),
                                // Novos campos ricos
                                imovel_titulo: item.imovel_titulo || 'Imóvel',
                                imovel_codigo: item.imovel_codigo || 'N/A',
                                tipo_nome: item.tipo_nome || '-',
                                finalidade_nome: item.finalidade_nome || '-',
                                status_nome: item.status_nome || '-',
                                imovel_preco: formatCurrency(item.preco),
                                imovel_descricao: item.descricao || '-',
                                imovel_endereco: formatAddress(item),
                                imovel_cidade_uf: `${item.cidade_fk || '-'} / ${item.estado_fk || '-'}`,
                                imovel_detalhes: formatDetails(item)
                            });
                        } catch (emailErr) {
                            console.warn(`[Transbordo] Falha ao enviar email de perda para ${item.corretor_email}:`, emailErr);
                        }
                    }
                }

                // C. Nova Transação para o Roteamento
                await client.query('BEGIN');

                // Buscar histórico de tentativas para este prospect
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

                cronDebugLog(`Routing prospect ${item.prospect_id}. Ext: ${externalAttempts}/${limitExternal}, Int: ${internalAttempts}/${limitInternal}. Target: ${targetTier}`);
                console.log(`[Transbordo] Roteando prospect ${item.prospect_id}. Ext: ${externalAttempts}/${limitExternal}, Int: ${internalAttempts}/${limitInternal}. Target: ${targetTier}`);

                const result = await routeProspectAndNotify(item.prospect_id, distinctBrokers, { forceFallback, targetTier, dbClient: client });

                console.log(`[Transbordo] Resultado do roteamento:`, JSON.stringify(result));

                if (result.success) {
                    summary.reassigned++;
                    cronDebugLog(`Lead ${item.prospect_id}: reassigned successfully to tier ${targetTier}`);
                    console.log(`[Transbordo] ✅ Prospect ${item.prospect_id} redistribuído com sucesso`);
                } else {
                    summary.errors++;
                    cronDebugLog(`Lead ${item.prospect_id}: FAILED reassign: ${result.reason}`);
                    console.error(`[Transbordo] ❌ Falha ao re-rotear prospect ${item.prospect_id}: ${result.reason}`);
                }

                await client.query('COMMIT'); // Commit the routing transaction

            } catch (err) {
                // If an error occurs during the routing phase, rollback the current transaction
                await client.query('ROLLBACK').catch(rollbackErr => console.error("Error during rollback:", rollbackErr));
                summary.errors++;
                console.error(`[Transbordo] Erro processando item ${item.id}:`, err);
            }
        }


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
