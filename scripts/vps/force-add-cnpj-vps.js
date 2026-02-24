const { Pool } = require('pg');

/**
 * Script para aplicar a coluna CNPJ na VPS via túnel SSH (Porta 5433)
 * Uso: node scripts/vps/force-add-cnpj-vps.js
 */

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria', // Nome padrão na VPS
    password: 'postgres', // Ajuste se for diferente
    port: 5433, // Porta do túnel SSH para a VPS
});

async function run() {
    try {
        console.log('🚀 Iniciando aplicação de CNPJ na VPS via túnel (porta 5433)...');

        // 1. Adicionar coluna CNPJ
        console.log('1. Verificando/Adicionando coluna cnpj...');
        await pool.query(`
            ALTER TABLE proprietarios ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
        `);

        // 2. Permitir CPF nulo
        console.log('2. Alterando cpf para permitir NULL...');
        await pool.query(`
            ALTER TABLE proprietarios ALTER COLUMN cpf DROP NOT NULL;
        `);

        // 3. Adicionar Comentários
        console.log('3. Adicionando comentários...');
        await pool.query(`
            COMMENT ON COLUMN proprietarios.cnpj IS 'CNPJ do proprietário (excludente com CPF)';
            COMMENT ON COLUMN proprietarios.cpf IS 'CPF do proprietário (excludente com CNPJ)';
        `);

        // 4. Criar Índice
        console.log('4. Criando índice para CNPJ...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_proprietarios_cnpj ON proprietarios(cnpj);
        `);

        console.log('✅ Alterações aplicadas com sucesso na VPS!');

    } catch (err) {
        console.error('❌ Erro ao aplicar alterações na VPS:', err.message);
        console.log('\nDICA: Verifique se o túnel SSH está aberto na porta 5433.');
        console.log('Comando sugerido para o túnel: ssh -L 5433:localhost:5432 usuario@ip-da-vps');
    } finally {
        await pool.end();
    }
}

run();
