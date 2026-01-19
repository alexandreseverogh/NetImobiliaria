require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function checkProperty() {
    try {
        const res = await pool.query(`
      SELECT 
        i.id,
        i.ativo as i_ativo,
        i.estado_fk,
        i.cidade_fk,
        si.id as status_id,
        si.nome as status_nome,
        si.ativo as si_ativo,
        si.consulta_imovel_internauta,
        fi.id as finalidade_id,
        fi.nome as finalidade_nome,
        fi.vender_landpaging,
        fi.alugar_landpaging
      FROM imoveis i
      LEFT JOIN status_imovel si ON i.status_fk = si.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      WHERE i.id = 115
    `);

        if (res.rows.length === 0) {
            console.log('Imóvel 115 não encontrado!');
        } else {
            console.log('Dados do Imóvel 115:', JSON.stringify(res.rows[0], null, 2));
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

checkProperty();
