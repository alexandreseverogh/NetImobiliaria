
import { listImoveis } from '../src/lib/database/imoveis';

async function run() {
    try {
        const uuid = 'b441fa86-ed4e-4621-9b4b-eb7467efa6c1';
        console.log('Testing listImoveis with proprietario_uuid:', uuid);

        const imoveis = await listImoveis({ proprietario_uuid: uuid });

        console.log('Returned count:', imoveis.length);
        imoveis.forEach(i => {
            // @ts-ignore
            console.log(`- ${i.codigo}: Owner ${i.proprietario_uuid} (${i.proprietario_nome})`);
        });

        if (imoveis.length > 0 && imoveis.every(i => i.proprietario_uuid === uuid)) {
            console.log('SUCCESS: Filtering is working correctly in isolation.');
        } else if (imoveis.length > 0) {
            console.log('FAILURE: Some properties do not match the UUID.');
        } else {
            console.log('WARNING: No properties found for this owner (could be correct).');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
