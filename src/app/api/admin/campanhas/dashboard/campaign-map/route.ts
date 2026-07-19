import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let _pool: Pool | null = null;
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

// Static coordinate lookup for Meta region keys (BR:STATE:CITY or BR:STATE)
const REGION_COORDS: Record<string, [number, number]> = {
  'BR':            [-14.2350, -51.9253],
  'BR:AC':         [-9.0238, -70.8120],
  'BR:AL':         [-9.5713, -36.7820],
  'BR:AM':         [-3.4168, -65.8561],
  'BR:AP':         [1.4102, -51.7700],
  'BR:BA':         [-12.9718, -38.5011],
  'BR:CE':         [-3.7172, -38.5434],
  'BR:DF':         [-15.7801, -47.9292],
  'BR:ES':         [-19.1834, -40.3089],
  'BR:GO':         [-16.6864, -49.2643],
  'BR:MA':         [-2.5364, -44.2769],
  'BR:MG':         [-19.9191, -43.9386],
  'BR:MS':         [-20.4697, -54.6201],
  'BR:MT':         [-12.6400, -55.4200],
  'BR:PA':         [-1.4558, -48.4902],
  'BR:PB':         [-7.1195, -34.8450],
  'BR:PE':         [-8.0476, -34.8770],
  'BR:PI':         [-5.0920, -42.8038],
  'BR:PR':         [-25.4290, -49.2671],
  'BR:RJ':         [-22.9068, -43.1729],
  'BR:RN':         [-5.7945, -35.2120],
  'BR:RO':         [-10.9472, -62.8250],
  'BR:RR':         [2.8198, -60.6714],
  'BR:RS':         [-30.0346, -51.2177],
  'BR:SC':         [-27.5954, -48.5480],
  'BR:SE':         [-10.9472, -37.0731],
  'BR:SP':         [-23.5505, -46.6333],
  'BR:TO':         [-10.1840, -48.3336],
  // Major cities
  'BR:SP:São Paulo':           [-23.5505, -46.6333],
  'BR:SP:Campinas':            [-22.9099, -47.0626],
  'BR:SP:Santos':              [-23.9618, -46.3322],
  'BR:SP:São Bernardo do Campo':[-23.6939, -46.5650],
  'BR:SP:Osasco':              [-23.5329, -46.7919],
  'BR:SP:Guarulhos':           [-23.4543, -46.5337],
  'BR:SP:Barueri':             [-23.5047, -46.8756],
  'BR:SP:Cotia':               [-23.6033, -46.9197],
  'BR:SP:Alphaville':          [-23.5049, -46.8551],
  'BR:SP:Ribeirão Preto':      [-21.1704, -47.8103],
  'BR:SP:São José dos Campos': [-23.1794, -45.8869],
  'BR:SP:Sorocaba':            [-23.5015, -47.4526],
  'BR:RJ:Rio de Janeiro':      [-22.9068, -43.1729],
  'BR:RJ:Niterói':             [-22.8844, -43.1044],
  'BR:RJ:Duque de Caxias':     [-22.7856, -43.3117],
  'BR:MG:Belo Horizonte':      [-19.9191, -43.9386],
  'BR:MG:Uberlândia':          [-18.9188, -48.2770],
  'BR:MG:Contagem':            [-19.9317, -44.0536],
  'BR:RS:Porto Alegre':        [-30.0346, -51.2177],
  'BR:RS:Caxias do Sul':       [-29.1681, -51.1794],
  'BR:PR:Curitiba':            [-25.4290, -49.2671],
  'BR:PR:Londrina':            [-23.3045, -51.1696],
  'BR:SC:Florianópolis':       [-27.5954, -48.5480],
  'BR:SC:Joinville':           [-26.3044, -48.8456],
  'BR:BA:Salvador':            [-12.9718, -38.5011],
  'BR:CE:Fortaleza':           [-3.7172, -38.5434],
  'BR:PE:Recife':              [-8.0476, -34.8770],
  'BR:PE:Olinda':              [-8.0089, -34.8553],
  'BR:AM:Manaus':              [-3.1019, -60.0250],
  'BR:PA:Belém':               [-1.4558, -48.4902],
  'BR:GO:Goiânia':             [-16.6864, -49.2643],
  'BR:DF:Brasília':            [-15.7801, -47.9292],
  'BR:ES:Vitória':             [-20.3155, -40.3128],
  'BR:MA:São Luís':            [-2.5364, -44.2769],
  'BR:MT:Cuiabá':              [-15.6014, -56.0979],
  'BR:MS:Campo Grande':        [-20.4697, -54.6201],
  'BR:RN:Natal':               [-5.7945, -35.2120],
  'BR:PB:João Pessoa':         [-7.1195, -34.8450],
  'BR:AL:Maceió':              [-9.6658, -35.7350],
  'BR:SE:Aracaju':             [-10.9472, -37.0731],
  'BR:PI:Teresina':            [-5.0920, -42.8038],
};

function resolveCoords(key: string): [number, number] | null {
  if (REGION_COORDS[key]) return REGION_COORDS[key];
  // Try partial match: BR:SP:Some Unknown City → fall back to state
  const parts = key.split(':');
  if (parts.length === 3) {
    const stateKey = `${parts[0]}:${parts[1]}`;
    if (REGION_COORDS[stateKey]) return REGION_COORDS[stateKey];
  }
  return null;
}

export interface CampaignMapLocation {
  name: string;
  lat: number;
  lng: number;
  radius?: number;
  campaigns: { id: string; name: string; status: string; leads: number; spend: number }[];
}

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let clientId  = searchParams.get('clientId')  || null;
    if (clientId === 'segment' || clientId === 'all') clientId = null;
    const segmentId = searchParams.get('segmentId') || null;
    const startDate = searchParams.get('startDate') || null;
    const endDate   = searchParams.get('endDate')
      ? (searchParams.get('endDate')!.length === 10
          ? searchParams.get('endDate')! + 'T23:59:59.999Z'
          : searchParams.get('endDate')!)
      : null;

    const pool = getPool();

    // Build campaign filter
    const conditions: string[] = [`c.tenant_id = $1::uuid`];
    const params: any[] = [payload.tenantId];

    if (clientId && clientId !== 'own' && clientId !== 'segment') {
      params.push(clientId);
      conditions.push(`c.client_id = $${params.length}::uuid`);
    } else if (clientId === 'own') {
      conditions.push(`c.client_id IS NULL`);
    }

    // Skip segment filter when showing own campaigns (client_id IS NULL — segment filter would contradict)
    if (segmentId && clientId !== 'own') {
      params.push(segmentId);
      conditions.push(`EXISTS (
        SELECT 1 FROM public.clientes cl
        WHERE cl.uuid = c.client_id AND cl.segment_id = $${params.length}::uuid
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // All date params — fully parameterized (no string interpolation in SQL)
    let insightDateWhere = '';
    if (startDate) {
      params.push(startDate);
      insightDateWhere += ` AND i.date >= $${params.length}::date`;
    }
    if (endDate) {
      params.push(endDate);
      insightDateWhere += ` AND i.date <= $${params.length}::timestamptz`;
    }

    let leadsDateFilter = '';
    if (startDate) {
      params.push(startDate);
      leadsDateFilter += ` AND l."clickedAt" >= $${params.length}::timestamptz`;
    }
    if (endDate) {
      params.push(endDate);
      leadsDateFilter += ` AND l."clickedAt" <= $${params.length}::timestamptz`;
    }

    // DISTINCT ON (c.id, a.id) prevents duplicate rows when campaign has multiple
    // AdSets with identical locations — spend is aggregated once per campaign in sp CTE.
    const query = `
      SELECT DISTINCT ON (c.id, a.id)
        c.id              AS campaign_id,
        c.name            AS campaign_name,
        c.status          AS campaign_status,
        a.locations       AS locations,
        COALESCE(lc.leads, 0)  AS leads,
        COALESCE(sp.spend, 0)  AS spend
      FROM campanhasmarketingdigital."Campaign" c
      JOIN campanhasmarketingdigital."AdSet" a ON a."campaignId" = c.id
      -- Only campaigns with spend in the selected period (consistent with pie chart)
      INNER JOIN (
        SELECT "campaignId", SUM(spend) AS spend
        FROM campanhasmarketingdigital."Insight" i
        WHERE spend > 0 ${insightDateWhere}
        GROUP BY "campaignId"
      ) sp ON sp."campaignId" = c.id
      LEFT JOIN (
        SELECT "campaignId", COUNT(*) AS leads
        FROM campanhasmarketingdigital."Lead" l
        WHERE 1=1 ${leadsDateFilter}
        GROUP BY "campaignId"
      ) lc ON lc."campaignId" = c.id
      WHERE ${whereClause}
        AND a.locations IS NOT NULL
        AND a.locations::text NOT IN ('null', '[]', '{}')
      ORDER BY c.id, a.id, sp.spend DESC
    `;

    const result = await pool.query(query, params);

    // Group locations — track campaign IDs per location key to avoid double-counting
    const locationMap  = new Map<string, CampaignMapLocation>();
    const locationSeen = new Map<string, Set<string>>(); // locationKey → Set<campaignId>

    function addCampaignToLocation(
      locKey: string,
      locEntry: Omit<CampaignMapLocation, 'campaigns'>,
      campaign: CampaignMapLocation['campaigns'][0],
    ) {
      if (!locationMap.has(locKey)) {
        locationMap.set(locKey, { ...locEntry, campaigns: [] });
        locationSeen.set(locKey, new Set());
      }
      // Skip if this campaign was already added to this location (prevents double-count)
      if (locationSeen.get(locKey)!.has(campaign.id)) return;
      locationSeen.get(locKey)!.add(campaign.id);
      locationMap.get(locKey)!.campaigns.push(campaign);
    }

    for (const row of result.rows) {
      const loc = row.locations as any;
      const campaign = {
        id:     row.campaign_id as string,
        name:   row.campaign_name as string,
        status: row.campaign_status as string,
        leads:  Number(row.leads),
        spend:  Number(row.spend),
      };

      // Format 1: custom_locations with lat/lng
      if (loc.custom_locations && Array.isArray(loc.custom_locations)) {
        for (const cl of loc.custom_locations) {
          if (!cl.latitude || !cl.longitude) continue;
          const key = `${cl.latitude.toFixed(4)},${cl.longitude.toFixed(4)}`;
          addCampaignToLocation(key, {
            name:   cl.name || 'Localização personalizada',
            lat:    cl.latitude,
            lng:    cl.longitude,
            radius: cl.radius,
          }, campaign);
        }
        continue;
      }

      // Format 2: Meta key (BR:STATE:CITY)
      if (loc.key) {
        const coords = resolveCoords(loc.key);
        if (!coords) continue;
        addCampaignToLocation(loc.key, {
          name: loc.name || loc.key,
          lat:  coords[0],
          lng:  coords[1],
        }, campaign);
      }
    }

    return NextResponse.json({
      locations: Array.from(locationMap.values()),
    });

  } catch (error: any) {
    console.error('GET /dashboard/campaign-map error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
