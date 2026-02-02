/**
 * Limpa dados de teste - Remove atribuições de teste
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function cleanTestData() {
    try {
        console.log('🧹 Limpando dados de teste...\n');

        // Deletar atribuições do imóvel 145
        const deleteAttr = await pool.query(`
      DELETE FROM imovel_prospect_atribuicoes
      WHERE prospect_id IN (
        SELECT id FROM imovel_prospects WHERE id_imovel = 145
      )
      RETURNING id
    `);

        console.log(`✅ Removidas ${deleteAttr.rowCount} atribuições`);

        // Deletar prospects do imóvel 145
        const deleteProsp = await pool.query(`
      DELETE FROM imovel_prospects
      WHERE id_imovel = 145
      RETURNING id
    `);

        console.log(`✅ Removidos ${deleteProsp.rowCount} prospects`);

        console.log('\n✅ Limpeza concluída! Pronto para novo teste.\n');

        await pool.end();

    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

cleanTestData();
