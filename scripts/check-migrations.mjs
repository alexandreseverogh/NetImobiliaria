import pkg from 'pg';
const { Pool } = pkg;

// Usa variáveis individuais (mesmo padrão de connection.ts)
const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME     || 'net_imobiliaria',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false,
});

const c = await pool.connect();
try {
  // 1. logo_url na tabela clientes
  const col = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='logo_url'"
  );
  console.log('logo_url em clientes:          ', col.rows.length > 0 ? '✅ JÁ EXISTE' : '❌ PENDENTE');

  // 2. system_features portfolio
  const sf = await c.query(
    "SELECT url, is_active FROM public.system_features WHERE url LIKE '/admin/campanhas/portfolio%' ORDER BY url"
  );
  const portfolioRow     = sf.rows.find(r => r.url === '/admin/campanhas/portfolio');
  const crossInsightsRow = sf.rows.find(r => r.url === '/admin/campanhas/portfolio/cross-insights');

  console.log('system_features /portfolio:    ', portfolioRow     ? '✅ JÁ EXISTE' : '❌ PENDENTE');
  console.log('system_features /cross-insights:', crossInsightsRow ? '✅ JÁ EXISTE' : '❌ PENDENTE');

  // 3. tenant_feature_overrides
  const tfo = await c.query(
    `SELECT COUNT(*) AS n
     FROM public.tenant_feature_overrides tfo
     JOIN public.system_features sf ON sf.id = tfo.feature_id
     WHERE sf.url = '/admin/campanhas/portfolio'`
  );
  const n = parseInt(tfo.rows[0].n);
  console.log('tenant_overrides (portfolio):  ', n > 0 ? `✅ ${n} tenant(s)` : '❌ PENDENTE (0 tenants)');

} finally {
  c.release();
  await pool.end();
}
