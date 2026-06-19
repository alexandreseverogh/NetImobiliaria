import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

// 1. Check all campanhas features (category_id=30) with sort_order
const features = await pool.query(`
  SELECT id, name, url, sort_order, icon, is_active
  FROM public.system_features
  WHERE category_id = 30
  ORDER BY COALESCE(sort_order, 0), name
`);
console.log('=== category_id=30 features ===');
console.log(JSON.stringify(features.rows, null, 2));

// 2. Check if auditoria already exists
const exists = await pool.query(`
  SELECT id FROM public.system_features WHERE url = '/admin/campanhas/auditoria'
`);
if (exists.rows.length > 0) {
  console.log('\n⚠️ Feature already exists with id:', exists.rows[0].id);
} else {
  // 3. Insert
  const result = await pool.query(`
    INSERT INTO public.system_features
      (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
    VALUES
      (
        'Auditoria de Campanhas',
        'Relatório estruturado mensal/semanal com scorecard de saúde, problemas, oportunidades e plano de ação',
        30,
        '/admin/campanhas/auditoria',
        true,
        'campanhas-auditoria',
        98,
        'ClipboardList',
        NOW(),
        NOW()
      )
    RETURNING id, name, url, sort_order
  `);
  console.log('\n✅ system_features inserted:', JSON.stringify(result.rows[0]));
}

// 4. Check tenant_feature_overrides for the main tenant to see if we need to provision it
const tenant = await pool.query(`
  SELECT id, name FROM public.tenants LIMIT 5
`);
console.log('\n=== Tenants ===');
console.log(JSON.stringify(tenant.rows));

// 5. Check how desperdicio (id=97) is provisioned for tenants
const overrides = await pool.query(`
  SELECT tfo.*, t.name as tenant_name
  FROM public.tenant_feature_overrides tfo
  JOIN public.tenants t ON t.id = tfo.tenant_id
  WHERE tfo.feature_id = 97
  LIMIT 5
`);
console.log('\n=== desperdicio tenant_feature_overrides ===');
console.log(JSON.stringify(overrides.rows, null, 2));

await pool.end();
