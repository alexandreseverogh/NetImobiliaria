const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function deleteProspects() {
    try {
        console.log('\n🗑️  Deletando registros das tabelas de prospects...\n');

        // 1. Contar registros antes
        const countAtribuicoes = await pool.query('SELECT COUNT(*) FROM imovel_prospect_atribuicoes');
        const countProspects = await pool.query('SELECT COUNT(*) FROM imovel_prospects');

        console.log(`📊 Registros ANTES:`);
        console.log(`   - imovel_prospect_atribuicoes: ${countAtribuicoes.rows[0].count}`);
        console.log(`   - imovel_prospects: ${countProspects.rows[0].count}`);

        // 2. Deletar atribuições primeiro (foreign key)
        const deleteAtribuicoes = await pool.query('DELETE FROM imovel_prospect_atribuicoes');
        console.log(`\n✅ Deletados ${deleteAtribuicoes.rowCount} registros de imovel_prospect_atribuicoes`);

        // 3. Deletar prospects
        const deleteProspects = await pool.query('DELETE FROM imovel_prospects');
        console.log(`✅ Deletados ${deleteProspects.rowCount} registros de imovel_prospects`);

        // 4. Verificar contagem final
        const finalCountAtribuicoes = await pool.query('SELECT COUNT(*) FROM imovel_prospect_atribuicoes');
        const finalCountProspects = await pool.query('SELECT COUNT(*) FROM imovel_prospects');

        console.log(`\n📊 Registros DEPOIS:`);
        console.log(`   - imovel_prospect_atribuicoes: ${finalCountAtribuicoes.rows[0].count}`);
        console.log(`   - imovel_prospects: ${finalCountProspects.rows[0].count}`);

        console.log('\n✅ Limpeza concluída com sucesso!\n');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

deleteProspects();
