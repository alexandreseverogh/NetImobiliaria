const { Client } = require('pg');

async function checkTable() {
    const client = new Client({
        host: '127.0.0.1',
        port: 15432,
        user: 'postgres',
        password: 'postgres',
        database: 'net_imobiliaria'
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_features'");
        console.log('Colunas em system_features:', res.rows.map(r => r.column_name));
        
        const hasIcon = res.rows.some(r => r.column_name === 'icon');
        if (!hasIcon) {
            console.log('⚠️ Coluna icon NÃO existe em system_features. Criando...');
            await client.query("ALTER TABLE system_features ADD COLUMN icon VARCHAR(255)");
            console.log('✅ Coluna icon criada com sucesso.');
        } else {
            console.log('✅ Coluna icon já existe.');
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

checkTable();
