const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function removeOwnerSection() {
    try {
        console.log('--- SUPPRESSING OWNER DATA IN EMAIL TEMPLATE ---');

        // 1. Get current content
        const res = await pool.query("SELECT html_content FROM email_templates WHERE name = 'lead_accepted_client_notification'");
        if (res.rows.length === 0) {
            console.log('❌ Template not found.');
            return;
        }

        let html = res.rows[0].html_content;

        // 2. Identify the block to remove. 
        // Mapped based on previous logs/structure. 
        // We want to remove the Section Header "Proprietário" and its fields.
        // It likely looks like: <h3>Proprietário</h3> ... content ... <h3>Seus Dados (Cliente)</h3>
        // Or similar structure.

        // Let's use Regex to be safe, finding the block between "Proprietário" header and the next section or end.
        // BUT regex on HTML is risky without exact structure.
        // Let's try to find the start index of "Proprietário" and the start index of the NEXT section "Seus Dados".

        const startMarker = 'Proprietário';
        const endMarker = 'Seus Dados'; // Assuming "Seus Dados (Cliente)" follows

        const startIdx = html.indexOf(startMarker);
        const endIdx = html.indexOf(endMarker);

        if (startIdx === -1) {
            console.log('❌ "Proprietário" section not found. Already removed?');
            return;
        }

        // Find the enclosing header tag start (e.g. <h3> or <div class="section-title">)
        // We search backwards from startIdx for the opening tag.
        const openingTagIdx = html.lastIndexOf('<h3', startIdx); // Assuming it is a H3

        if (openingTagIdx === -1 || openingTagIdx > startIdx) {
            console.log('❌ Could not find opening tag for Proprietário header.');
            // Fallback: Just erase from startMarker
        }

        // Define the cut range.
        // If endIdx is found, cut up to it. If not, cut carefully.
        // Based on user log:
        // ... Details ...
        // H3 Proprietário
        // ... lines ...
        // H3 Seus Dados (Cliente)

        let cutStart = openingTagIdx !== -1 ? openingTagIdx : startIdx;
        let cutEnd = endIdx !== -1 ? endIdx : -1;

        if (cutEnd === -1) {
            console.log('❌ Could not safely determine end of section (next header not found). Aborting to avoid damage.');
            return;
        }

        console.log(`✂️ Cutting from index ${cutStart} to ${cutEnd}`);
        console.log('--- CONTENT TO BE REMOVED ---');
        console.log(html.substring(cutStart, cutEnd));
        console.log('-----------------------------');

        const newHtml = html.substring(0, cutStart) + html.substring(cutEnd);

        // 3. Update DB
        await pool.query(
            "UPDATE email_templates SET html_content = $1 WHERE name = 'lead_accepted_client_notification'",
            [newHtml]
        );

        console.log('✅ Template updated successfully.');

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

removeOwnerSection();
