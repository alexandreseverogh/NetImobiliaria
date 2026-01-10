
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const http = require('http');

function loadEnvFile() {
    const envPath = path.join(__dirname, '../.env.local');
    const envVars = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key] = valueParts.join('=').trim();
                }
            }
        }
    }
    return envVars;
}

async function callCron() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/cron/transbordo', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
    });
}

async function run() {
    const envVars = loadEnvFile();
    const port = parseInt(envVars.DB_PORT || envVars.POSTGRES_PORT || '15432');
    const config = {
        host: envVars.DB_HOST || envVars.POSTGRES_HOST || 'localhost',
        port: port,
        database: envVars.DB_NAME || envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.DB_USER || envVars.POSTGRES_USER || 'postgres',
        password: envVars.DB_PASSWORD || envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    const client = new Client(config);
    await client.connect();
    console.log('Connected to DB');

    try {
        // 1. Find a Broker to 'Lose' the lead
        const brokerRes = await client.query("SELECT id FROM users WHERE ativo = true LIMIT 1");
        const brokerId = brokerRes.rows[0].id;

        // 2. Ensure Score exists
        await client.query("INSERT INTO corretor_scores (user_id, xp_total) VALUES ($1, 1000) ON CONFLICT (user_id) DO UPDATE SET xp_total = 1000", [brokerId]);

        // 3. Find a prospect/property (or create dummy logic, but better to reuse existing if possible)
        // Getting any prospect
        const prospectRes = await client.query("SELECT id FROM imovel_prospects LIMIT 1");
        if (prospectRes.rows.length === 0) {
            console.log("No prospects found to test.");
            return;
        }
        const prospectId = prospectRes.rows[0].id;

        // 4. Create an EXPIRED attribution
        // First clean up active ones for this prospect
        await client.query("DELETE FROM imovel_prospect_atribuicoes WHERE prospect_id = $1", [prospectId]);

        console.log(`Simulating EXPIRED assignment for Broker ${brokerId} on Prospect ${prospectId}`);
        await client.query(`
        INSERT INTO imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, expira_em, created_at)
        VALUES ($1, $2, 'atribuido', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours')
      `, [prospectId, brokerId]);

        // 5. Trigger CRON
        console.log("Triggering Cron via HTTP...");
        const res = await callCron();
        console.log("Cron Response:", res.status, res.body);

        // 6. Check Result (XP Penalty)
        const scoreRes = await client.query("SELECT xp_total, leads_perdidos_sla FROM corretor_scores WHERE user_id = $1", [brokerId]);
        console.log("Broker Score After:", scoreRes.rows[0]);

        if (scoreRes.rows[0].xp_total < 1000) {
            console.log("✅ SUCCESS: XP was deducted!");
        } else {
            console.log("❌ FAILURE: XP remained same (or increased).");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
