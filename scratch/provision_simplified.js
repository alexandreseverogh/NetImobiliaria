const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';
const systemTenant = '00000000-0000-0000-0000-000000000001';

async function run() {
  try {
    console.log('1. Backfilling imoveis with NULL tenant_id to system tenant...');
    await pool.query("UPDATE imoveis SET tenant_id = $1 WHERE tenant_id IS NULL", [systemTenant]);

    console.log(`2. Provisioning parameters for tenant ${tenantId}...`);
    await pool.query(`
      INSERT INTO public.parametros (
        tenant_id, 
        vl_destaque_nacional,
        qtde_anuncios_imoveis_corretor,
        periodo_anuncio_corretor,
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads_internos,
        sla_minutos_aceite_lead_interno,
        cobranca_corretor_externo
      )
      SELECT 
        $1,
        vl_destaque_nacional,
        qtde_anuncios_imoveis_corretor,
        periodo_anuncio_corretor,
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads_internos,
        sla_minutos_aceite_lead_interno,
        cobranca_corretor_externo
      FROM public.parametros
      WHERE tenant_id = $2
      ON CONFLICT (tenant_id) DO NOTHING;
    `, [tenantId, systemTenant]);

    console.log(`3. Provisioning valor_destaque_local for tenant ${tenantId}...`);
    await pool.query(`
      INSERT INTO public.valor_destaque_local (tenant_id, estado_fk, cidade_fk, valor_destaque, valor_mensal, created_at, updated_at)
      SELECT $1, estado_fk, cidade_fk, valor_destaque, valor_mensal, NOW(), NOW()
      FROM public.valor_destaque_local
      WHERE tenant_id = $2
      ON CONFLICT (tenant_id, estado_fk, cidade_fk) DO NOTHING;
    `, [tenantId, systemTenant]);

    console.log('4. Moving 5 properties to the user tenant and enabling highlights for testing...');
    // We need to make sure the finalidade_fk exists in the new tenant if we were strictly isolating finalities.
    // But for now let's just use existing ones.
    const properties = await pool.query("SELECT id FROM imoveis WHERE tenant_id = $1 LIMIT 5", [systemTenant]);
    for (const row of properties.rows) {
      await pool.query("UPDATE imoveis SET tenant_id = $1, destaque = true, destaque_nacional = true, estado_fk = 'SP' WHERE id = $2", [tenantId, row.id]);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run();
