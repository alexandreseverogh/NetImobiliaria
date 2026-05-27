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
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || 'your-secret-key'; // Fallback para desenvolvimento

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        cronDebugLog('Unauthorized cron access attempt');
        return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const client = await pool.connect();

    try {
        // 1. Ler Parâmetros Gerais
        const paramsRes = await client.query('SELECT proximos_corretores_recebem_leads, proximos_corretores_recebem_leads_internos, sla_minutos_aceite_lead FROM parametros_imoveis LIMIT 1');
        const limitExternal = parseInt(paramsRes.rows[0]?.proximos_corretores_recebem_leads || '3');
        const limitInternal = parseInt(paramsRes.rows[0]?.proximos_corretores_recebem_leads_internos || '3');
        const slaMinutos = parseInt(paramsRes.rows[0]?.sla_minutos_aceite_lead || '5');

        // --- BLOCO 0: AUTOLIMPEZA DE HISTÓRICO (EXPURGO 30 DIAS) ---
        // Mantemos o banco leve removendo registros antigos de auditoria/histórico
        await client.query(`DELETE FROM leads_staging_atribuicoes WHERE created_at < NOW() - INTERVAL '30 days'`);
        await client.query(`
            DELETE FROM imovel_prospect_atribuicoes 
            WHERE created_at < NOW() - INTERVAL '30 days' 
              AND status NOT IN ('atribuido', 'aceito')
        `);
        cronDebugLog('Cleanup de histórico (30 dias) executado.');

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

        const summary = {
            processed: 0,
            reassigned: 0,
            to_plantonista: 0,
            errors: 0
        };

        // --- BLOCO 1: TRANSBORDO PROSPECTS (SITE) ---
        const expiredQuery = `
          SELECT 
            pa.id, pa.prospect_id, pa.corretor_fk,
            u.email as corretor_email, u.nome as corretor_nome,
            i.codigo as imovel_codigo, i.titulo as imovel_titulo,
            ti.nome as tipo_nome, fi.nome as finalidade_nome, si.nome as status_nome,
            i.preco, i.descricao, i.endereco, i.numero, i.bairro, i.cidade_fk, i.estado_fk,
            i.cep, i.quartos, i.banheiros, i.vagas_garagem, i.area_total
          FROM imovel_prospect_atribuicoes pa
          JOIN users u ON u.id = pa.corretor_fk
          JOIN imovel_prospects ip ON ip.id = pa.prospect_id
          JOIN imoveis i ON i.id = ip.id_imovel
          LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
          LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
          LEFT JOIN status_imovel si ON i.status_fk = si.id
          WHERE pa.status = 'atribuido' AND pa.expira_em < NOW()
          FOR UPDATE OF pa SKIP LOCKED
        `;

        const expiredResult = await client.query(expiredQuery);
        cronDebugLog(`Found ${expiredResult.rows.length} expired prospects`);

        for (const item of expiredResult.rows) {
            try {
                summary.processed++;
                // Marcar como expirado
                await client.query('UPDATE imovel_prospect_atribuicoes SET status = \'expirado\' WHERE id = $1', [item.id]);

                // Penalidade e Notificação
                try {
                    const { GamificationService } = await import('@/lib/gamification/gamificationService');
                    await GamificationService.penalizeSLA(item.corretor_fk);
                    if (item.corretor_email) {
                        await emailService.sendTemplateEmail('lead-expirado', item.corretor_email, {
                            nome_corretor: item.corretor_nome,
                            imovel_titulo: item.imovel_titulo,
                            imovel_codigo: item.imovel_codigo || 'N/A',
                            imovel_preco: formatCurrency(item.preco),
                            imovel_endereco: formatAddress(item),
                            imovel_cidade_uf: `${item.cidade_fk || '-'} / ${item.estado_fk || '-'}`,
                            imovel_detalhes: formatDetails(item)
                        });
                    }
                } catch (e) { console.error('Ação pós-expiração falhou:', e); }

                // Nova Atribuição
                const historyRes = await client.query('SELECT corretor_fk FROM imovel_prospect_atribuicoes WHERE prospect_id = $1', [item.prospect_id]);
                const exclude = historyRes.rows.map(r => r.corretor_fk);
                
                const result = await routeProspectAndNotify(item.prospect_id, exclude, { dbClient: client });
                if (result.success) summary.reassigned++;
                else summary.errors++;

            } catch (err) {
                console.error(`Erro processando prospect ${item.prospect_id}:`, err);
                summary.errors++;
            }
        }

        // --- BLOCO 2: TRANSBORDO CRM (LEADS STAGING) ---
        const stgExpiredQuery = `
          SELECT lead_uuid, imovel_id, estado_fk, cidade_fk, corretor_atribuido_id as current_corretor
          FROM leads_staging
          WHERE atribuicao_expira_em < NOW() AND corretor_atribuido_id IS NOT NULL
          FOR UPDATE SKIP LOCKED
        `;
        const stgResult = await client.query(stgExpiredQuery);
        cronDebugLog(`Found ${stgResult.rows.length} expired staging leads`);

        const { DistributionEngine } = await import('@/lib/routing/distributionEngine');

        for (const stgLead of stgResult.rows) {
            try {
                summary.processed++;
                
                // Buscar histórico para excluir todos que já tiveram o lead
                const hRes = await client.query('SELECT corretor_id FROM leads_staging_atribuicoes WHERE lead_uuid = $1', [stgLead.lead_uuid]);
                const exclude = hRes.rows.map(r => r.corretor_id);
                if (stgLead.current_corretor && !exclude.includes(stgLead.current_corretor)) exclude.push(stgLead.current_corretor);

                let ownerId = null;
                if (stgLead.imovel_id) {
                    const oRes = await client.query('SELECT corretor_fk FROM imoveis WHERE id = $1', [stgLead.imovel_id]);
                    ownerId = oRes.rows[0]?.corretor_fk;
                }

                const newRouted = await DistributionEngine.findBestCandidate({
                    lead_id: stgLead.lead_uuid,
                    target_id: stgLead.imovel_id,
                    source_owner_id: ownerId,
                    estado_fk: stgLead.estado_fk,
                    cidade_fk: stgLead.cidade_fk,
                    domain_id: 1
                }, exclude, client);

                if (newRouted) {
                    await client.query(
                        `UPDATE leads_staging 
                         SET corretor_atribuido_id = $1, atribuicao_expira_em = $2, atribuido_em = NOW()
                         WHERE lead_uuid = $3`,
                        [newRouted.id, newRouted.is_plantonista ? null : newRouted.expira_em, stgLead.lead_uuid]
                    );

                    // LOG DE HISTÓRICO
                    await client.query(
                        `INSERT INTO leads_staging_atribuicoes (lead_uuid, corretor_id, status)
                         VALUES ($1, $2, $3)`,
                        [stgLead.lead_uuid, newRouted.id, 'atribuido']
                    );

                    summary.reassigned++;
                    
                    try {
                        const { GamificationService } = await import('@/lib/gamification/gamificationService');
                        // Penaliza quem perdeu
                        if (stgLead.current_corretor) await GamificationService.penalizeSLA(stgLead.current_corretor);
                        // Recompensa quem recebeu
                        await GamificationService.awardXP(newRouted.id, 0, 'leads_recebidos');
                    } catch (gErr) { }
                } else {
                    summary.errors++;
                }
            } catch (stgErr) {
                console.error(`Erro no staging ${stgLead.lead_uuid}:`, stgErr);
                summary.errors++;
            }
        }

        return NextResponse.json({ success: true, summary });

    } catch (error) {
        console.error('[Transbordo] Erro fatal:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    } finally {
        client.release();
    }
}
