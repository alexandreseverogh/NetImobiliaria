const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function checkProprietario() {
    try {
        // Buscar dados do imóvel 121
        const imovel = await pool.query('SELECT id, codigo, titulo, proprietario_uuid FROM imoveis WHERE id = 121');

        if (imovel.rows.length === 0) {
            console.log('❌ Imóvel 121 não encontrado');
            return;
        }

        console.log('--- Imóvel 121 ---');
        console.log('ID:', imovel.rows[0].id);
        console.log('Código:', imovel.rows[0].codigo);
        console.log('Título:', imovel.rows[0].titulo);
        console.log('Proprietário UUID:', imovel.rows[0].proprietario_uuid);
        console.log('Tipo do UUID:', typeof imovel.rows[0].proprietario_uuid);
        console.log('UUID é null?:', imovel.rows[0].proprietario_uuid === null);
        console.log('UUID é string vazia?:', imovel.rows[0].proprietario_uuid === '');

        // Se tiver UUID, tentar buscar o proprietário
        if (imovel.rows[0].proprietario_uuid) {
            try {
                const prop = await pool.query('SELECT uuid, nome, cpf FROM proprietarios WHERE uuid = $1::uuid', [imovel.rows[0].proprietario_uuid]);

                if (prop.rows.length > 0) {
                    console.log('\n✅ Proprietário encontrado:');
                    console.log('Nome:', prop.rows[0].nome);
                    console.log('CPF:', prop.rows[0].cpf);
                } else {
                    console.log('\n❌ Proprietário NÃO encontrado no banco!');
                }
            } catch (error) {
                console.log('\n❌ Erro ao buscar proprietário:');
                console.error(error.message);
            }
        } else {
            console.log('\n⚠️ Imóvel sem proprietário definido');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        pool.end();
    }
}

checkProprietario();
