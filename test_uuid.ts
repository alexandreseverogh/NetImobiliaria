import { resolveCampaignIdsBySegment } from './src/lib/marketing/segmentUtils';

async function check() {
  try {
    const tenantId = 'efbf62cf-9e28-4b31-a4f6-82a037412353';
    const segmentId = '92e5ddd3-4f3b-4f93-9839-6168d09e25e8';
    
    console.log('Testing with clientId = segment');
    const ids = await resolveCampaignIdsBySegment(tenantId, segmentId, 'segment');
    console.log('Ids:', ids);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
check();
