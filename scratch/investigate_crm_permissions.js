const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Investigating user admxyz ---');
  const user = await prisma.users.findFirst({
    where: { username: 'admxyz' },
    include: {
      tenants: true,
      user_role_assignments: {
        include: {
          roles: true
        }
      }
    }
  });

  if (!user) {
    console.log('User admxyz not found');
    return;
  }

  console.log('User found:', {
    id: user.id,
    username: user.username,
    tenant_id: user.tenant_id,
    tenant_name: user.tenants?.name,
    roles: user.user_role_assignments.map(a => a.roles.name)
  });

  console.log('\n--- Checking Tenant Provisioning ---');
  const provisionedModules = await prisma.tenant_modules?.findMany({
    where: { tenant_id: user.tenant_id },
    include: { modules: true }
  }) || [];

  console.log('Provisioned Modules:', provisionedModules.map(m => m.modules?.name));

  console.log('\n--- Checking CRM Features ---');
  const crmFeatures = await prisma.system_features.findMany({
    where: { 
      OR: [
        { name: { contains: 'CRM', mode: 'insensitive' } },
        { slug: { contains: 'crm', mode: 'insensitive' } }
      ]
    }
  });
  
  console.log('CRM Features in system_features:', crmFeatures.map(f => ({ id: f.id, name: f.name, slug: f.slug, is_active: f.is_active })));

  console.log('\n--- Checking Permissions for user admxyz ---');
  const permissions = await prisma.role_permissions.findMany({
    where: {
      role_id: { in: user.user_role_assignments.map(a => a.role_id) }
    },
    include: {
      system_features: true
    }
  });

  const crmPermissions = permissions.filter(p => 
    p.system_features?.name.includes('CRM') || 
    p.system_features?.slug.includes('crm')
  );

  console.log('CRM Permissions found for user:', crmPermissions.map(p => ({
    feature: p.system_features?.name,
    action: p.action
  })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
