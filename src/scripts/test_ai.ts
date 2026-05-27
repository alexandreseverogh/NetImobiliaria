
import { IntelligenceCRM } from '../lib/ai/intelligenceCRM';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`📂 Carregando ambiente de: ${envPath}`);
dotenv.config({ path: envPath });

if (!process.env.DB_NAME) {
    console.error('❌ ERRO: DB_NAME não carregado. Verifique se o script está sendo executado na raiz do projeto.');
    process.exit(1);
}

async function main() {
    const prospectId = 21612; // ID que pegamos do banco
    console.log(`🚀 Iniciando teste real com Gemini para o Prospect ID: ${prospectId}`);
    
    try {
        const result = await IntelligenceCRM.ingestFromProspect(prospectId);
        console.log('✅ Resultado do Processamento:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

main();
