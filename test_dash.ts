import { resolveCampaignIdsBySegment } from './src/lib/marketing/segmentUtils';
import { prisma } from './src/lib/marketing/prisma';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// inject fake DB_NAME if missing
if (!process.env.DB_NAME) process.env.DB_NAME = 'net_imobiliaria';

async function test() {
  const payload = { tenantId: 'efbf62cf-9e28-4b31-a4f6-82a037412353' };
  const segmentId = '92e5ddd3-4f3b-4f93-9839-6168d09e25e8'; // Imobiliário
  const clientId = 'own';
  const startDate = new Date('2026-06-17T00:00:00.000Z');
  const endDate = new Date('2026-07-17T23:59:59.999Z');

  console.log('Resolving campaigns...');
  const segmentCampaignIds = await resolveCampaignIdsBySegment(payload.tenantId, segmentId, clientId);
  console.log('Campaigns count:', segmentCampaignIds.length);

  const insightWhere = {
    tenantId: payload.tenantId,
    campaignId: { in: segmentCampaignIds },
    date: { gte: startDate, lte: endDate },
  };
  
  console.log('Querying insights with Prisma...');
  const currentInsights = await prisma.insight.findMany({ where: insightWhere, orderBy: { date: 'desc' } });
  console.log('Insights found:', currentInsights.length);
  if (currentInsights.length > 0) {
    console.log(currentInsights[0]);
  }
}
test().catch(console.error).finally(() => process.exit(0));
