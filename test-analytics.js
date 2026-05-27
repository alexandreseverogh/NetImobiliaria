
const pool = require('./src/lib/database/connection').default;
const { getVisitasSummary } = require('./src/lib/database/analytics');

async function test() {
    try {
        const filters = {
            from: '2026-05-01',
            to: '2026-05-31',
            tenant_id: 'c828d003-6213-4464-aa38-6c5d10a0aa9a'
        };
        const summary = await getVisitasSummary(filters, '2026-04-01', '2026-04-30');
        console.log('Summary:', summary);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

test();
