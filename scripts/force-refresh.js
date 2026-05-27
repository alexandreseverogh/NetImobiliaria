const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Copiando funções curtas cruciais
async function reEnrich() {
  const client = new Client({
    host: '127.0.0.1',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
  });
  await client.connect();

  const configRes = await client.query('SELECT target_table, target_fk_column, layout_json, form_schema_json FROM crm_segmentos_config WHERE domain_id = 1');
  const { target_table, layout_json, form_schema_json } = configRes.rows[0];

  const leads = await client.query('SELECT lead_uuid, imovel_id, raw_json FROM leads_staging');

  for (const lead of leads.rows) {
    if (lead.imovel_id) {
       // Exact link
       const rowRes = await client.query(`SELECT * FROM ${target_table} WHERE id = $1`, [lead.imovel_id]);
       if (rowRes.rows.length) {
          const row = rowRes.rows[0];
          const enrichedSnapshot = { title: layout_json.title_template, subtitle: layout_json.subtitle_template, badges: [] };
          
          for (const key in row) {
             const token = `{{${key}}}`;
             enrichedSnapshot.title = enrichedSnapshot.title.replace(new RegExp(token, 'g'), row[key] || '');
             enrichedSnapshot.subtitle = enrichedSnapshot.subtitle.replace(new RegExp(token, 'g'), row[key] || '');
          }

          enrichedSnapshot.badges = layout_json.badges.map(b => {
             let rawValue = row[b.campo];
             let formattedValue = rawValue;
             if (rawValue !== null && rawValue !== undefined) {
                if (b.icone === 'dollar-sign' && !isNaN(Number(rawValue))) {
                   formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(rawValue));
                } else if (!isNaN(Number(rawValue)) && typeof rawValue === 'number') {
                   formattedValue = new Intl.NumberFormat('pt-BR').format(rawValue);
                }
             }
             let prefix = b.prefixo || '';
             if (b.icone === 'dollar-sign' && formattedValue && String(formattedValue).includes('R$')) prefix = '';
             return { label: b.label, icone: b.icone, valor: `${prefix}${formattedValue || '---'}${b.sufixo || ''}`, full_width: b.full_width || false };
          });
          
          await client.query('UPDATE leads_staging SET enriquecimento_cache = $1 WHERE lead_uuid = $2', [JSON.stringify(enrichedSnapshot), lead.lead_uuid]);
       }
    } else {
       // Generic
       const badges = [];
       for (const field of form_schema_json) {
          if (lead.raw_json[field.name]) {
              let valorRaw = lead.raw_json[field.name];
              let valorIcon = field.type === 'currency' ? 'dollar-sign' : 'map-pin';
              if (field.type === 'currency') {
                 const limpo = String(valorRaw).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
                 if (!isNaN(Number(limpo)) && limpo.trim() !== '') valorRaw = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(limpo));
              }
              badges.push({ label: field.label || field.name, icone: valorIcon, valor: valorRaw, full_width: field.type === 'currency' });
          }
       }
       if (badges.length > 0) {
           await client.query('UPDATE leads_staging SET enriquecimento_cache = $1 WHERE lead_uuid = $2', [JSON.stringify({ title: 'Perfil de Maior Interesse', subtitle: 'Busca Genérica', badges }), lead.lead_uuid]);
       }
    }
  }
  await client.end();
  console.log("DONE!");
}
reEnrich().catch(console.error);
