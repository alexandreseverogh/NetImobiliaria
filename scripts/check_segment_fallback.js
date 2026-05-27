const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const query1 = `
            SELECT s.name as segment_name, m.name as module_name, m.slug
            FROM system_segments s
            JOIN system_segment_modules ssm ON s.id = ssm.segment_id
            JOIN system_modules m ON ssm.module_id = m.id
            WHERE s.name ILIKE '%imobili%'
        `;
        const res1 = await pool.query(query1);
        console.log("-- Módulos no Segmento Imobiliário --");
        console.table(res1.rows);

        const query2 = `
            SELECT id, name FROM sidebar_menu_items WHERE name ILIKE '%agend%médic%' OR name ILIKE '%médico%'
        `;
        const res2 = await pool.query(query2);
        console.log("\\n-- Agenda Médica --");
        console.table(res2.rows);

        if (res2.rows.length > 0) {
            const query3 = `
                SELECT m.name as module_name
                FROM sidebar_menu_item_modules smim
                JOIN system_modules m ON smim.module_id = m.id
                WHERE smim.menu_item_id = $1
            `;
            const res3 = await pool.query(query3, [res2.rows[0].id]);
            console.log("\\n-- Módulos da Agenda Médica --");
            console.table(res3.rows);
        }

    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
