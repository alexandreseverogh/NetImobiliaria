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

async function checkFinanciadoresTable() {
    try {
        console.log('\n🔍 Verificando tabela financiadores...\n');

        // Verificar se a tabela existe
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'financiadores'
      );
    `);

        const exists = tableCheck.rows[0].exists;
        console.log(`📋 Tabela 'financiadores' existe: ${exists}`);

        if (!exists) {
            console.log('\n🔍 Procurando tabelas similares...');
            const similarTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%financi%'
        ORDER BY table_name
      `);

            if (similarTables.rows.length > 0) {
                console.log('\n📋 Tabelas similares encontradas:');
                similarTables.rows.forEach(r => console.log(`   - ${r.table_name}`));
            } else {
                console.log('\n❌ Nenhuma tabela similar encontrada');
            }
        } else {
            // Mostrar estrutura da tabela
            const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'financiadores'
        ORDER BY ordinal_position
      `);

            console.log('\n📋 Estrutura da tabela financiadores:');
            console.table(structure.rows);
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkFinanciadoresTable();
