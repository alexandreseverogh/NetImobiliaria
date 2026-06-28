const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({ host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres' });

async function main() {
  const r = await pool.query(
    "SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp FROM public.tenants WHERE id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'"
  );
  const c = r.rows[0];
  console.log('URL:     ', c.evolution_api_url);
  console.log('Instance:', c.evolution_instance);
  console.log('Phone:   ', c.numero_whatsapp);
  console.log('Key:     ', c.evolution_api_key ? '***' + c.evolution_api_key.slice(-4) : '(vazio)');

  if (c.evolution_api_url && c.evolution_instance) {
    try {
      const resp = await axios.get(
        `${c.evolution_api_url}/instance/connectionState/${c.evolution_instance}`,
        { headers: { apikey: c.evolution_api_key }, timeout: 5000 }
      );
      console.log('Status WPP:', JSON.stringify(resp.data));
    } catch (e) {
      console.log('Erro conexão WPP:', e.response?.data || e.message);
    }
  }
  pool.end();
}
main().catch(console.error);
