const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 5433, // Porta do túnel SSH para a VPS
});

async function checkStructure() {
    try {
        console.log('🔍 Verificando estrutura da tabela proprietarios na VPS...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'proprietarios'
            ORDER BY column_name;
        `);

        console.log('\nColunas encontradas:');
        res.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });

        const hasCnpj = res.rows.some(col => col.column_name === 'cnpj');

        if (hasCnpj) {
            console.log('\n✅ Atributo CNPJ ENCONTRADO na VPS.');
        } else {
            console.log('\n❌ Atributo CNPJ NÃO ENCONTRADO na VPS.');
        }

        // Verificar Índices
        const indexRes = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'proprietarios' AND indexname = 'idx_proprietarios_cnpj';
        `);

        if (indexRes.rows.length > 0) {
            console.log('✅ Índice idx_proprietarios_cnpj ENCONTRADO na VPS.');
        } else {
            console.log('❌ Índice idx_proprietarios_cnpj NÃO ENCONTRADO na VPS.');
        }

    } catch (err) {
        console.error('❌ Erro ao conectar na VPS (Porta 5433):', err.message);
    } finally {
        await pool.end();
    }
}

checkStructure();
