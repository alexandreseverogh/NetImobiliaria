const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Construir connection string se não existir, baseada nas vars individuais
let connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.DB_HOST) {
    connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

if (!connectionString) {
    console.error('DATABASE_URL não encontrada e variáveis de DB incompletas.');
    process.exit(1);
}

// Ocultar senha no log
const logSafeUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
console.log(`Conectando ao banco: ${logSafeUrl}`);

const pool = new Pool({
    connectionString: connectionString,
});

async function run() {
    try {
        console.log('Verificando tabela parametros...');

        // Verificar se a coluna já existe
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='parametros' AND column_name='cobranca_corretor_externo';
    `);

        if (res.rows.length === 0) {
            console.log('Adicionando coluna cobranca_corretor_externo...');
            await pool.query(`
        ALTER TABLE parametros 
        ADD COLUMN cobranca_corretor_externo BOOLEAN DEFAULT FALSE;
      `);
            console.log('Coluna adicionada com sucesso.');
        } else {
            console.log('Coluna cobranca_corretor_externo JÁ EXISTE no banco.');
        }

    } catch (err) {
        console.error('Erro ao acessar/alterar banco:', err);
    } finally {
        await pool.end();
    }
}

run();
