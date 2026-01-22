
const { routeProspectAndNotify } = require('../src/lib/routing/prospectRouter.ts');
const pool = require('../src/lib/database/connection.ts').default || require('../src/lib/database/connection.ts');

const IMOVEL_ID = 145;

async function runTest() {
    try {
        console.log('--- TEST ROUTE ACTUAL ---');

        // 1. Create a Dummy Prospect for Imovel 145
        console.log('Creating dummy prospect...');
        const pRes = await pool.query(`
      INSERT INTO imovel_prospects (id_imovel, created_at, updated_at)
      VALUES ($1, NOW(), NOW())
      RETURNING id
    `, [IMOVEL_ID]);
        const prospectId = pRes.rows[0].id;
        console.log(`Dummy Prospect ID: ${prospectId}`);

        // 2. Insert Dummy History (2 Externals + 2 Internals) to simulate the blockage
        // IDs must be real users to avoid FK errors if stricty enforced, but usually just UUIDs.
        // Let's use the ones from the screenshot to be realistic.
        // Externals: c57ab..., 9c89c...
        // Internals: 49179..., 4d456...
        console.log('Inserting dummy history...');
        const dummyHistory = [
            'c57ab897-c068-46a4-9b12-bb9f2d938fe7', // Ext 1
            '9c89c838-e989-46e1-a358-6a564ae15034', // Ext 2
            '491795c4-c017-4285-b85a-eb29c26c2c28', // Int 1
            '4d456e42-4031-46ba-9b5c-912bec1d28b5', // Int 2
        ];

        for (const uid of dummyHistory) {
            await pool.query(`
            INSERT INTO imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, created_at, expira_em)
            VALUES ($1, $2, 'expirado', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes')
        `, [prospectId, uid]);
        }

        // 3. Call Router with targetTier = 'Internal'
        console.log('Calling routeProspectAndNotify(..., targetTier="Internal")...');
        const excludes = dummyHistory;

        const result = await routeProspectAndNotify(prospectId, excludes, { targetTier: 'Internal' });

        console.log('RESULT:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('SUCCESS! Assigned to someone.');
            // Check who
            const whoCalls = await pool.query('SELECT corretor_fk FROM imovel_prospect_atribuicoes WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1', [prospectId]);
            console.log('Assigned User ID:', whoCalls.rows[0]?.corretor_fk);
        } else {
            console.log('FAILURE! Reason:', result.reason);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

runTest();
