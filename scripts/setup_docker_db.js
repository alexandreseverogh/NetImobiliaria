
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Forçar conexão no Container (Porta 15432) para este script
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres', // Docker compose default
    port: 15432, // Porta do Docker mapeada no Host
});

async function migrateAll() {
    try {
        console.log('🔌 Conectando ao Banco Docker (Porta 15432)...');

        // Verificar conexão
        const v = await pool.query('SELECT version()');
        console.log('✅ Conectado:', v.rows[0].version);

        // Listar arquivos de migração
        const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Garantir ordem alfabética (001, 002...)

        console.log(`📂 Encontradas ${files.length} migrações.`);

        // Criar tabela de controle de migração se não existir
        await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        for (const file of files) {
            const alreadyApplied = await pool.query('SELECT 1 FROM migrations WHERE name = $1', [file]);

            if (alreadyApplied.rows.length === 0) {
                console.log(`🚀 Aplicando: ${file}...`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                await pool.query('BEGIN');
                try {
                    await pool.query(sql);
                    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await pool.query('COMMIT');
                    console.log(`   ✅ Sucesso: ${file}`);
                } catch (err) {
                    await pool.query('ROLLBACK');
                    console.error(`   ❌ Falha em ${file}:`, err.message);
                    process.exit(1);
                }
            } else {
                console.log(`   ⏭️  Pular (já aplicado): ${file}`);
            }
        }

        console.log('🎉 Todas as migrações foram verificadas/aplicadas com sucesso no Container!');

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    } finally {
        await pool.end();
    }
}

migrateAll();
