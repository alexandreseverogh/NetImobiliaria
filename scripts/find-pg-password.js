/**
 * Script para testar diferentes senhas no PostgreSQL Docker
 * Testa várias combinações de senhas comuns
 */

const { Pool } = require('pg');

const passwords = [
    'Roberto@2007',
    '381Nb@729',
    'postgres',
    '',
    'net_imobiliaria'
];

async function testPassword(password, label) {
    const pool = new Pool({
        host: 'localhost',
        port: 15432,
        database: 'net_imobiliaria',
        user: 'postgres',
        password: password
    });

    try {
        const client = await pool.connect();
        console.log(`✅ SUCESSO com senha: "${label}"`);
        console.log(`   Senha: ${password ? password : '(vazia)'}`);

        const result = await client.query('SELECT current_database(), current_user');
        console.log(`   Database: ${result.rows[0].current_database}`);
        console.log(`   User: ${result.rows[0].current_user}`);

        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.log(`❌ Falhou com senha: "${label}" - ${error.message.split('\n')[0]}`);
        await pool.end();
        return false;
    }
}

async function findPassword() {
    console.log('🔍 Testando senhas no PostgreSQL Docker (porta 15432)...\n');

    for (let i = 0; i < passwords.length; i++) {
        const success = await testPassword(passwords[i], `Opção ${i + 1}`);
        if (success) {
            console.log('\n🎯 Senha encontrada! Atualize o .env.local com essa senha.');
            return;
        }
    }

    console.log('\n❌ Nenhuma senha funcionou.');
    console.log('\n💡 Soluções:');
    console.log('   1. Recriar container com senha conhecida:');
    console.log('      docker-compose down -v');
    console.log('      docker-compose up -d db');
    console.log('   2. Resetar senha do PostgreSQL dentro do container');
}

findPassword();
