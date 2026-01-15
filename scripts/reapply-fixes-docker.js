const { spawn } = require('child_process');
const path = require('path');

const scripts = [
    'restore-email-templates.js', // Restaura templates base (novo-lead-corretor)
    'update-imovel-interesse-template.js', // Adiciona dados proprietario no admin
    'create-lead-expirado-template.js', // Adiciona SLA no expirado
    'apply_timezone_fix.js', // Corrige timestamp
    'fix-financiadores-schema.js' // Corrige schema
];

const env = {
    ...process.env,
    DB_HOST: 'localhost',
    DB_PORT: '15432',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_NAME: 'net_imobiliaria'
};

async function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Executando ${scriptName} no Docker (15432)...`);
        const proc = spawn('node', [path.join(__dirname, scriptName)], {
            env,
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${scriptName} finalizado com sucesso.`);
                resolve();
            } else {
                console.error(`❌ ${scriptName} falhou com código ${code}.`);
                reject(new Error(`Falha em ${scriptName}`));
            }
        });
    });
}

async function main() {
    try {
        for (const script of scripts) {
            await runScript(script);
        }
        console.log('\n✅✅✅ TODAS AS CORREÇÕES FORAM APLICADAS NO BANCO DOCKER!');
    } catch (err) {
        console.error('\n❌ Erro durante a execução:', err.message);
    }
}

main();
