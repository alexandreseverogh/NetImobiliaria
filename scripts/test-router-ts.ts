import { routeProspectAndNotify } from '../src/lib/routing/prospectRouter';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        console.log('--- TESTING ROUTER FOR PROSPECT 85 ---');
        const result = await routeProspectAndNotify(85);
        console.log('Result:', result);
    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        process.exit(0);
    }
}
run();
