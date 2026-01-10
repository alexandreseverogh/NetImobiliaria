
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Logic from test-db-connection.js to parsing env
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

// Exact query from prospects/route.ts (status = all)
const QUERY = `
      SELECT
        a.prospect_id,
        a.status,
        a.created_at as atribuido_em,
        a.expira_em,
        a.data_aceite as aceito_em,
        COALESCE(a.motivo->>'type','') as motivo_type,
        (a.expira_em IS NOT NULL AND a.status = 'atribuido') as requires_aceite,
        ip.created_at as data_interesse,
        i.id as imovel_id,
        i.codigo,
        i.titulo,
        i.descricao,
        i.preco,
        i.preco_condominio,
        i.preco_iptu,
        i.taxa_extra,
        i.area_total,
        i.area_construida,
        i.quartos,
        i.banheiros,
        i.suites,
        i.vagas_garagem,
        i.varanda,
        i.andar,
        i.total_andares,
        i.aceita_permuta,
        i.aceita_financiamento,
        i.endereco,
        i.numero,
        i.complemento,
        i.bairro,
        i.cidade_fk,
        i.estado_fk,
        i.cep,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        pr.nome as proprietario_nome,
        pr.cpf as proprietario_cpf,
        pr.telefone as proprietario_telefone,
        pr.email as proprietario_email,
        pr.endereco as proprietario_endereco,
        pr.numero as proprietario_numero,
        pr.complemento as proprietario_complemento,
        pr.bairro as proprietario_bairro,
        pr.cidade_fk as proprietario_cidade,
        pr.estado_fk as proprietario_estado,
        pr.cep as proprietario_cep,
        c.nome as cliente_nome,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        ip.preferencia_contato,
        ip.mensagem
      FROM public.imovel_prospect_atribuicoes a
      INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
      INNER JOIN public.imoveis i ON ip.id_imovel = i.id
      LEFT JOIN public.tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN public.status_imovel si ON i.status_fk = si.id
      LEFT JOIN public.proprietarios pr ON pr.uuid = i.proprietario_uuid
      INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
      WHERE a.corretor_fk = $1::uuid
        AND a.status IN ('atribuido','aceito','expirado')
      ORDER BY a.created_at DESC
      LIMIT 200
`;

async function run() {
    const logFile = path.join(__dirname, 'repro_output.txt');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, 'Starting reproduction...\n');

    try {
        const envVars = loadEnvFile();
        const config = {
            host: envVars.POSTGRES_HOST || 'localhost',
            port: parseInt(envVars.POSTGRES_PORT) || 5432,
            database: envVars.POSTGRES_DB || 'net_imobiliaria',
            user: envVars.POSTGRES_USER || 'postgres',
            password: envVars.POSTGRES_PASSWORD || 'Roberto@2007'
        };

        const client = new Client(config);
        await client.connect();
        log('Connected.');

        // Use a known user ID (Roberto) from previous check
        const userId = '491795c4-c017-4285-b85a-eb29c26c28b5';
        log('Testing with User ID: ' + userId);

        log('Executing Query...');
        const res = await client.query(QUERY, [userId]);
        log('Query success! Rows: ' + res.rows.length);

        await client.end();
    } catch (err) {
        log('Query FAILED!');
        log('Error: ' + err.message);
        log('Hint: ' + err.hint);
        log('Position: ' + err.position);
        log('Stack: ' + err.stack);
    }
}

run();
