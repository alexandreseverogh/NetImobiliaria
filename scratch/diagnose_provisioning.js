const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProvisioning() {
  try {
    const tenantName = 'Imobiliaria XYZ';
    const tenant = await prisma.tenants.findFirst({
      where: { name: tenantName },
      include: { 
        system_segments: true
      }
    });

    if (!tenant) {
      console.log(`Tenant ${tenantName} não encontrado.`);
      return;
    }

    console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})`);
    console.log(`Segmento: ${tenant.system_segments?.name || 'N/A'} (ID: ${tenant.segment_id})`);

    // Buscar todas as features que contenham "Parâmetros"
    const features = await prisma.system_features.findMany({
      where: {
        name: { contains: 'Parâmetros', mode: 'insensitive' }
      }
    });

    console.log('\n--- FEATURES ENCONTRADAS ---');
    for (const f of features) {
      console.log(`Feature: ${f.name} | Slug: ${f.slug} | ID: ${f.id} | Active: ${f.is_active}`);
      
      // Verificando Blueprints para o segmento do tenant
      if (tenant.segment_id) {
        const blueprint = await prisma.$queryRaw`
          SELECT * FROM system_segment_blueprints 
          WHERE feature_id = ${f.id} AND segment_id = ${tenant.segment_id}::uuid
        `;
        console.log(`  Blueprint Segmento:`, blueprint);
      }

      // Verificando Overrides para o tenant
      const override = await prisma.$queryRaw`
        SELECT * FROM tenant_feature_overrides 
        WHERE feature_id = ${f.id} AND tenant_id = ${tenant.id}::uuid
      `;
      console.log(`  Override Tenant:`, override);

      // Verificando Permissões (quem tem acesso)
      const perms = await prisma.role_permissions.findMany({
        where: { feature_id: f.id },
        include: { user_roles: true }
      });
      console.log(`  Roles com acesso:`, perms.map(p => p.user_roles.name).join(', '));
    }

    // Buscar itens de sidebar que referenciam essas features
    const sidebarItems = await prisma.sidebar_menu_items.findMany({
      where: {
        OR: [
          { name: { contains: 'Parâmetros', mode: 'insensitive' } },
          { resource: { in: features.map(f => f.slug) } }
        ]
      }
    });

    console.log('\n--- ITENS DE SIDEBAR ENCONTRADOS ---');
    sidebarItems.forEach(item => {
      console.log(`Item: ${item.name} | Resource: ${item.resource} | Parent: ${item.parent_id} | Active: ${item.is_active} | URL: ${item.url}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProvisioning();
