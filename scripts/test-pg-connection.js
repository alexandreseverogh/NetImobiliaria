/**
 * Test PostgreSQL Connection
 * Tests different connection configurations to find what works
 */

const { Pool } = require('pg');

async function testConnection(config, label) {
    console.log(`\n🔍 Testing: ${label}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);

    const pool = new Pool(config);

    try {
        const client = await pool.connect();
        console.log(`   ✅ Connection successful!`);

        // Test query
        const result = await client.query('SELECT version()');
        console.log(`   📊 PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);

        // Check database
        const dbResult = await client.query('SELECT current_database()');
        console.log(`   📁 Current database: ${dbResult.rows[0].current_database}`);

        // Check user
        const userResult = await client.query('SELECT current_user');
        console.log(`   👤 Current user: ${userResult.rows[0].current_user}`);

        client.release();
        await pool.end();

        return true;
    } catch (error) {
        console.log(`   ❌ Connection failed: ${error.message}`);
        await pool.end();
        return false;
    }
}

async function runTests() {
    console.log('🧪 PostgreSQL Connection Tests\n');
    console.log('='.repeat(60));

    const configs = [
        {
            label: 'Config 1: localhost:5432 with Roberto@2007',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'net_imobiliaria',
                user: 'postgres',
                password: 'Roberto@2007'
            }
        },
        {
            label: 'Config 2: 127.0.0.1:5432 with Roberto@2007',
            config: {
                host: '127.0.0.1',
                port: 5432,
                database: 'net_imobiliaria',
                user: 'postgres',
                password: 'Roberto@2007'
            }
        },
        {
            label: 'Config 3: localhost:15432 with Roberto@2007',
            config: {
                host: 'localhost',
                port: 15432,
                database: 'net_imobiliaria',
                user: 'postgres',
                password: 'Roberto@2007'
            }
        }
    ];

    let successCount = 0;

    for (const { label, config } of configs) {
        const success = await testConnection(config, label);
        if (success) successCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Results: ${successCount}/${configs.length} configurations working\n`);

    if (successCount > 0) {
        console.log('✅ PostgreSQL is accessible!');
        console.log('\n📝 DBeaver Connection Settings:');
        console.log('   Host: localhost (or 127.0.0.1)');
        console.log('   Port: 5432');
        console.log('   Database: net_imobiliaria');
        console.log('   Username: postgres');
        console.log('   Password: Roberto@2007');
        console.log('   SSL: Disable');
    } else {
        console.log('❌ No working configuration found!');
        console.log('\n🔧 Troubleshooting steps:');
        console.log('   1. Check if PostgreSQL service is running');
        console.log('   2. Verify pg_hba.conf allows local connections');
        console.log('   3. Check firewall settings');
        console.log('   4. Verify password is correct');
    }
}

runTests();
