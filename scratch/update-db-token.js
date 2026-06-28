const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: '127.0.0.1',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
  });

  const tenantId = 'a6281640-194d-42e7-b822-9f2718c1f873';
  const userToken = 'EAAOVyW4YfswBR9vYVWcK4XoNGY7xCqz1lqZBftvmfYami0nEYutn4FUZAlmPpn8uqoroLgR9ZB8F5kA2eL7XFNHSZBHMaudm9fW48LKaSaAGG8ZAxqtHZCMbHBNZA512ZApyGfzJxPzjZCeZArphZAywoBZAZC8k80OUU5cL0Ro4eSa7eI2YCj9DKXpYSaosXOeS6ftJEUaZAhWJHkjpO5gHVZANF5SHsZA8FMvwOoseYSxBYDHsyNOPNuRQP0hAgCQfup2wZAjLksMS8eVozW8d6DDdPbQZDZD';
  const pageId = '1179958165208760'; // ID retornado da API
  const appId = '1009117298196172'; // ID do App Meta Imovitec

  try {
    console.log('🔄 Atualizando a tabela public.tenants para a tenant Imovitec...');
    await pool.query(
      `UPDATE public.tenants 
       SET meta_token = $1, 
           meta_page_id = $2, 
           meta_app_id = $3,
           updated_at = NOW() 
       WHERE id = $4::uuid`,
      [userToken, pageId, appId, tenantId]
    );
    console.log('✅ Tabela public.tenants atualizada.');

    console.log('🔄 Atualizando tenant_network_credentials para a tenant Imovitec...');
    // Verificar se já existe credencial cadastrada
    const credentialsRes = await pool.query(
      `SELECT tnc.id, tnc.credentials 
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
       WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta' LIMIT 1`,
      [tenantId]
    );

    const metaCredentials = {
      app_id: appId,
      page_id: pageId,
      pixel_id: '4327562070887454', // Mantendo o pixel configurado
      access_token: userToken,
      instagram_actor_id: ''
    };

    if (credentialsRes.rows[0]) {
      await pool.query(
        `UPDATE public.tenant_network_credentials 
         SET credentials = $1::jsonb, 
             updated_at = NOW(),
             is_active = true 
         WHERE id = $2`,
        [JSON.stringify(metaCredentials), credentialsRes.rows[0].id]
      );
      console.log('✅ tenant_network_credentials atualizado.');
    } else {
      await pool.query(
        `INSERT INTO public.tenant_network_credentials
           (tenant_id, network_id, credentials, display_name, is_active)
         SELECT $1::uuid, n.id, $2::jsonb, 'Meta Ads', true
         FROM public.ad_networks n WHERE n.code = 'meta'`,
        [tenantId, JSON.stringify(metaCredentials)]
      );
      console.log('✅ tenant_network_credentials criado.');
    }

    console.log('\n🎉 Sincronização da tenant Imovitec concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

main();
