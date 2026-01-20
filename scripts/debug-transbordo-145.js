const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function debugTransbordo() {
    try {
        console.log('--- DIAGNÓSTICO TRANSBORDO IMÓVEL 145 (JS PURO) ---');

        // 0. Params
        const paramsRes = await pool.query('SELECT sla_minutos_aceite_lead, qtde_anuncios_imoveis_corretor FROM parametros LIMIT 1');
        console.log('⚙️ Parametros:', paramsRes.rows[0]);

        // 1. Dados do Imóvel
        const imovelRes = await pool.query(`
      SELECT id, titulo, cidade_fk, estado_fk, corretor_fk 
      FROM imoveis WHERE id = 145
    `);
        if (imovelRes.rows.length === 0) {
            console.log('❌ Imóvel 145 não encontrado.');
            return;
        }
        const imovel = imovelRes.rows[0];
        console.log('🏠 Imóvel:', imovel);

        // 2. Dados do Corretor (se houver corretor_fk ou o UUID fornecido)
        const targetUuid = '9c89c838-e989-46e1-a358-6a564ae15034';

        if (imovel.corretor_fk && imovel.corretor_fk !== targetUuid) {
            console.log('⚠️ Imóvel tem corretor_fk DIFERENTE do reportado no problema:', imovel.corretor_fk);
        }

        const corretorRes = await pool.query(`
      SELECT id, nome, email, tipo_corretor, is_plantonista
      FROM users WHERE id = $1
    `, [targetUuid]);
        const corretor = corretorRes.rows[0] || {};
        console.log('👤 Corretor (Target):', corretor);

        // 3. Checar Áreas de Atuação desse corretor
        const areasRes = await pool.query(`
      SELECT cidade_fk, estado_fk 
      FROM corretor_areas_atuacao 
      WHERE corretor_fk = $1
    `, [targetUuid]);
        console.log('🗺️ Áreas de Atuação do Corretor:', areasRes.rows);

        // 4. Buscar a atribuição (logs)
        const attribRes = await pool.query(`
      SELECT ipa.*, ip.id_cliente, ip.created_at as lead_created_at
      FROM imovel_prospect_atribuicoes ipa
      JOIN imovel_prospects ip ON ip.id = ipa.prospect_id
      WHERE ip.id_imovel = 145 AND ipa.corretor_fk = $1
      ORDER BY ipa.created_at DESC
      LIMIT 1
    `, [targetUuid]);

        if (attribRes.rows.length > 0) {
            const attr = attribRes.rows[0];
            console.log('📋 Atribuição Encontrada:', {
                id: attr.id,
                status: attr.status,
                motivo: attr.motivo, // O JSON vai revelar o caminho tomado
                expira_em: attr.expira_em,
                created_at: attr.created_at
            });
        } else {
            console.log('❌ Nenhuma atribuição encontrada para este corretor neste imóvel.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

debugTransbordo();
