const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSidebar() {
  try {
    console.log('--- BUSCANDO TENANT ---');
    const tenant = await prisma.tenants.findFirst({
      where: { name: 'Imobiliaria XYZ' }
    });
    console.log('Tenant:', tenant);

    if (!tenant) {
      console.log('Tenant "Imobiliaria XYZ" não encontrado.');
      return;
    }

    console.log('\n--- BUSCANDO USUÁRIO ADMINISTRADOR ---');
    const user = await prisma.users.findFirst({
      where: { 
        tenant_id: tenant.id,
        email: 'admxyz@teste.com.br' // Assumindo baseados no histórico
      },
      include: {
        user_role_assignments: {
          include: {
            roles: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('Usuário admxyz não encontrado para este tenant.');
      // Vamos listar todos os usuários do tenant para garantir
      const allUsers = await prisma.users.findMany({ where: { tenant_id: tenant.id } });
      console.log('Usuários do tenant:', allUsers.map(u => u.email));
      return;
    }

    console.log('Usuário:', user.email);
    const roles = user.user_role_assignments.map(ura => ura.roles);
    console.log('Roles:', roles.map(r => ({ id: r.id, name: r.name, level: r.role_level })));

    console.log('\n--- BUSCANDO FEATURE "Parâmetros Imóveis" ---');
    const feature = await prisma.system_features.findFirst({
      where: { 
        name: { contains: 'Parâmetros Imóveis', mode: 'insensitive' }
      }
    });

    if (!feature) {
      console.log('Feature "Parâmetros Imóveis" não encontrada no sistema.');
      return;
    }

    console.log('Feature encontrada:', {
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
      is_active: feature.is_active,
      parent_id: feature.parent_id
    });

    console.log('\n--- BUSCANDO FILHOS DA FEATURE ---');
    const children = await prisma.system_features.findMany({
      where: { parent_id: feature.id }
    });
    console.log('Filhos:', children.map(c => ({ id: c.id, name: c.name, slug: c.slug, is_active: c.is_active })));

    console.log('\n--- VERIFICANDO PERMISSÕES PARA AS ROLES DO USUÁRIO ---');
    const roleIds = roles.map(r => r.id);
    const permissions = await prisma.role_permissions.findMany({
      where: {
        role_id: { in: roleIds },
        feature_id: { in: [feature.id, ...children.map(c => c.id)] }
      },
      include: {
        system_features: true
      }
    });

    console.log('Permissões encontradas:', permissions.map(p => ({
      role_id: p.role_id,
      feature: p.system_features.name,
      action: p.action
    })));

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSidebar();
