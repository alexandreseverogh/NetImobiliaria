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

async function alterTable() {
    try {
        console.log('\n🔧 Alterando tabela financiadores para adicionar campos corretos...\n');

        // Adicionar colunas faltantes
        await pool.query(`
      ALTER TABLE financiadores 
      ADD COLUMN IF NOT EXISTS headline TEXT,
      ADD COLUMN IF NOT EXISTS valor_mensal DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS logo_base64 TEXT,
      ADD COLUMN IF NOT EXISTS logo_tipo_mime VARCHAR(100);
    `);

        console.log('✅ Colunas adicionadas com sucesso');

        // Verificar estrutura
        const structure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financiadores'
      ORDER BY ordinal_position
    `);

        console.log('\n📋 Estrutura atualizada da tabela:');
        console.table(structure.rows);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

alterTable();
