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

console.log('Configuração do banco:');
console.log(`  DB_HOST: ${envConfig.DB_HOST}`);
console.log(`  DB_PORT: ${envConfig.DB_PORT}`);
console.log(`  DB_NAME: ${envConfig.DB_NAME}`);
console.log(`  DB_USER: ${envConfig.DB_USER}`);

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function createTable() {
    try {
        console.log('\n🔧 Criando tabela financiadores...\n');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS public.financiadores (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          cnpj VARCHAR(18) UNIQUE,
          telefone VARCHAR(20),
          email VARCHAR(255),
          site VARCHAR(255),
          endereco TEXT,
          observacoes TEXT,
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✅ Tabela criada');

        // Inserir dados de exemplo
        await pool.query(`
      INSERT INTO public.financiadores (nome, cnpj, telefone, email, site) VALUES
      ('Caixa Econômica Federal', '00.360.305/0001-04', '(11) 3004-1105', 'atendimento@caixa.gov.br', 'https://www.caixa.gov.br'),
      ('Banco do Brasil', '00.000.000/0001-91', '(11) 4004-0001', 'atendimento@bb.com.br', 'https://www.bb.com.br'),
      ('Itaú Unibanco', '60.701.190/0001-04', '(11) 4004-4828', 'atendimento@itau.com.br', 'https://www.itau.com.br'),
      ('Bradesco', '60.746.948/0001-12', '(11) 4002-4022', 'atendimento@bradesco.com.br', 'https://www.bradesco.com.br'),
      ('Santander', '90.400.888/0001-42', '(11) 4004-3535', 'atendimento@santander.com.br', 'https://www.santander.com.br')
      ON CONFLICT (cnpj) DO NOTHING;
    `);

        console.log('✅ Dados de exemplo inseridos');

        // Verificar
        const count = await pool.query('SELECT COUNT(*) FROM financiadores');
        console.log(`\n📊 Total de financiadores: ${count.rows[0].count}`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

createTable();
