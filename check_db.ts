import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/marketing/prisma';

async function check() {
  const tenants = await prisma.tenant.findMany({
    where: { name: { contains: 'Marketing Digital' } }
  });
  console.log('Tenants:', tenants.map(t => ({ id: t.id, name: t.name })));
  
  for (const tenant of tenants) {
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, adNetwork: true, client: { select: { name: true, segment: { select: { name: true } } } } }
    });
    console.log(`\nCampanhas para Tenant ${tenant.name}:`, campaigns.length);
    for (const camp of campaigns) {
      console.log(` - ${camp.name} (${camp.adNetwork}) [Client: ${camp.client?.name} | Seg: ${camp.client?.segment?.name}]`);
    }

    const insights = await prisma.insight.findMany({
      where: { tenantId: tenant.id },
      orderBy: { date: 'desc' },
      take: 5
    });
    console.log(`\nÚltimos 5 insights para Tenant ${tenant.name}:`, insights);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
