
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 15432
});

// COPY OF FUNCTION FROM prospectRouter.ts
async function pickInternalBrokerByArea(estado, cidade, excludeIds = []) {
    const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Interno'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 1
  `
    const r = await pool.query(q, [estado, cidade, excludeIds || []])
    if (r.rows.length === 0) return null
    const row = r.rows[0]
    return {
        id: row.id,
        nome: row.nome,
        email: row.email,
        motivo: { type: 'area_match_internal', estado_fk: estado, cidade_fk: cidade, debug: `Lvl:${row.nivel} XP:${row.xp}` }
    }
}

async function run() {
    console.log('--- TEST FUNCTION pickInternalBrokerByArea ---');
    // Using Data from Lead 51 scenario
    const estado = 'PE';
    const cidade = 'Recife';
    const excludeIds = [
        'c57ab897-c068-46a4-9b12-bb9f2d938fe7',
        '9c89c838-e989-46e1-a358-6a564ae15034',
        '491795c4-c017-4285-b85a-eb29c26c28b5',
        '4d456e42-4031-46ba-9b5c-912bec1d28b5'
    ];

    try {
        const result = await pickInternalBrokerByArea(estado, cidade, excludeIds);
        console.log('Function Returned:', result);

        if (result) {
            console.log('✅ Success! Found a broker.');
        } else {
            console.log('❌ Failed! Returned null.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
