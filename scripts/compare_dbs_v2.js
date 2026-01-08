
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurações
const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'Roberto@2007', // Senha fornecida pelo usuário
    port: 5432,
};

const dockerConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
};

async function inspectDB(name, config) {
    console.log(`\n--- Inspecionando Banco: ${name} (${config.port}) ---`);
    const pool = new Pool(config);
    try {
        // 1. Verificar tabelas sugeridas
        const tablesToCheck = [
            'system_categorias',
            'system_features',
            'system_feature_categoria',
            'sidebar_menu_items',
            'sidebar_item_roles',
            'sidebar_menu_versions'
        ];

        for (const t of tablesToCheck) {
            const res = await pool.query(`SELECT to_regclass('public.${t}')`);
            const exists = !!res.rows[0].to_regclass;

            if (!exists) {
                console.log(`❌ Tabela '${t}' NÃO EXISTE.`);
                continue;
            }

            console.log(`✅ Tabela '${t}' existe.`);

            // Query específica para Parametros
            let query = `SELECT * FROM ${t} LIMIT 5`;

            if (t === 'system_categorias') {
                query = `SELECT * FROM ${t} WHERE name ILIKE '%Param%' OR name ILIKE '%Padr%' OR id IN (1, 8)`;
            } else if (t === 'system_features') {
                // Tenta adaptar às colunas existentes (slug ou code)
                const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}'`);
                const colNames = cols.rows.map(c => c.column_name);
                const hasSlug = colNames.includes('slug');
                const hasCode = colNames.includes('code');
                const whereClause = hasSlug ? "slug = 'parametros'" : (hasCode ? "code = 'parametros'" : "name ILIKE '%Param%'");

                query = `SELECT * FROM ${t} WHERE ${whereClause}`;
            } else if (t === 'sidebar_menu_items') {
                query = `SELECT * FROM ${t} WHERE resource = 'parametros' OR name ILIKE '%Param%'`;
            } else if (t === 'system_feature_categoria') {
                query = `SELECT * FROM ${t} LIMIT 10`;
            }

            try {
                const rows = await pool.query(query);
                if (rows.rows.length > 0) {
                    console.table(rows.rows);
                } else {
                    console.log(`   (Sem registros encontrados para 'Parametros')`);
                }
            } catch (err) {
                console.log(`   Erro ao consultar dados: ${err.message}`);
            }
        }

    } catch (err) {
        console.error(`❌ Erro fatal ao conectar ${name}:`, err.message);
    } finally {
        await pool.end();
    }
}

async function run() {
    await inspectDB('LOCAL (Original)', localConfig);
    // await inspectDB('DOCKER (Target)', dockerConfig); // Já inspecionamos o Docker exaustivamente, vamos focar no Local para não poluir o output
}

run();
