/**
 * Tier 3 do plano "Loop do ICP" (2026-09-04) — último item: Lookalike/Custom Audience.
 *
 * Semente da Custom Audience = todo lead com negócio fechado real (leads_kanban.is_ganho) e
 * email OU telefone preenchido (Opção A, decidida com o usuário — mais robusta que filtrar por
 * fit, que dependeria de quanto tempo a qualificação por IA já está ativa no tenant e correria
 * o risco real de nunca bater o mínimo de 100 membros que a Meta exige pra Lookalike).
 *
 * Escopo v1, deliberado: só rede 'meta' — única com Custom Audience/Lookalike real confirmada
 * via documentação oficial nesta sessão. Google Ads tem "Customer Match" (API bem diferente) —
 * fora de escopo, não implementado às cegas.
 *
 * ⚠️ PENDÊNCIA REAL, documentada: nenhuma conta de anúncio de teste real está disponível nesta
 * sessão. A normalização/hash (metaAdsAdapter.ts) foi testada isoladamente e bate exato com o
 * exemplo oficial da documentação do Meta — mas as chamadas de rede reais (createCustomAudience,
 * uploadAudienceUsers, createLookalikeAudience, getAudienceStatus) NUNCA foram exercitadas
 * contra a API real. Testar ponta a ponta assim que houver uma conta de teste disponível.
 */
import pool from '@/lib/database/connection';
import { getNetworkServiceForTenant } from '../networks/factory';
import { MetaAdsAdapter, type CustomAudienceMatchRow } from '../networks/meta/metaAdsAdapter';

const MIN_SEED_MEMBERS = 100; // exigência real da Meta pra Lookalike — verificado ANTES de tentar

export interface TenantAudience {
  id: string;
  tenantId: string;
  clientId: string | null;
  networkCode: string;
  kind: 'custom' | 'lookalike';
  externalId: string | null;
  originAudienceId: string | null;
  name: string;
  criteria: Record<string, unknown>;
  memberCountUploaded: number;
  approximateCount: number | null;
  status: string;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

/** Conta quantos leads elegíveis existem, SEM enviar nada — usado pela UI pra mostrar "você
 *  tem N leads elegíveis" e decidir se vale tentar criar (gate honesto de MIN_SEED_MEMBERS). */
export async function countEligibleClosedDeals(tenantId: string, clientId?: string | null): Promise<number> {
  const clientFilter = clientId === 'own' || !clientId
    ? 'AND ls.client_id IS NULL'
    : 'AND ls.client_id = $2::uuid';
  const params = clientId === 'own' || !clientId ? [tenantId] : [tenantId, clientId];

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n
       FROM public.leads_staging ls
       JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id AND kc.is_ganho = true
      WHERE ls.tenant_id = $1::uuid ${clientFilter}
        AND (ls.email IS NOT NULL AND ls.email <> '' OR ls.telefone IS NOT NULL AND ls.telefone <> '')`,
    params,
  );
  return rows[0]?.n ?? 0;
}

async function fetchEligibleRows(tenantId: string, clientId?: string | null): Promise<CustomAudienceMatchRow[]> {
  const clientFilter = clientId === 'own' || !clientId
    ? 'AND ls.client_id IS NULL'
    : 'AND ls.client_id = $2::uuid';
  const params = clientId === 'own' || !clientId ? [tenantId] : [tenantId, clientId];

  const { rows } = await pool.query(
    `SELECT ls.email, ls.telefone
       FROM public.leads_staging ls
       JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id AND kc.is_ganho = true
      WHERE ls.tenant_id = $1::uuid ${clientFilter}
        AND (ls.email IS NOT NULL AND ls.email <> '' OR ls.telefone IS NOT NULL AND ls.telefone <> '')`,
    params,
  );
  return rows.map((r) => ({ email: r.email || undefined, phone: r.telefone || undefined }));
}

async function resolveMetaAdapter(tenantId: string, clientId?: string | null): Promise<MetaAdsAdapter> {
  const service = await getNetworkServiceForTenant(tenantId, 'meta', clientId ?? null);
  if (!(service instanceof MetaAdsAdapter)) {
    throw new Error('Audiences só são suportadas na rede Meta nesta versão — credencial resolvida não é um MetaAdsAdapter.');
  }
  return service;
}

function mapRow(r: any): TenantAudience {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clientId: r.client_id,
    networkCode: r.network_code,
    kind: r.kind,
    externalId: r.external_id,
    originAudienceId: r.origin_audience_id,
    name: r.name,
    criteria: r.criteria ?? {},
    memberCountUploaded: r.member_count_uploaded,
    approximateCount: r.approximate_count,
    status: r.status,
    errorMessage: r.error_message,
    lastSyncedAt: r.last_synced_at,
    createdAt: r.created_at,
  };
}

export async function listAudiences(tenantId: string, clientId?: string | null): Promise<TenantAudience[]> {
  const clientFilter = clientId === 'own' || !clientId ? 'AND client_id IS NULL' : 'AND client_id = $2::uuid';
  const params = clientId === 'own' || !clientId ? [tenantId] : [tenantId, clientId];
  const { rows } = await pool.query(
    `SELECT * FROM public.tenant_audiences WHERE tenant_id = $1::uuid ${clientFilter} ORDER BY created_at DESC`,
    params,
  );
  return rows.map(mapRow);
}

/**
 * Cria a Custom Audience a partir dos negócios fechados reais do escopo (tenant/cliente).
 * Nunca chama a Meta sem antes confirmar amostra >= MIN_SEED_MEMBERS — evita gastar uma
 * chamada real pra um resultado que a própria Meta rejeitaria de qualquer forma, e dá um
 * motivo específico em vez do erro genérico da API.
 */
export async function createCustomAudienceFromClosedDeals(
  tenantId: string,
  clientId: string | null | undefined,
  name: string,
): Promise<TenantAudience> {
  const rows = await fetchEligibleRows(tenantId, clientId);
  if (rows.length < MIN_SEED_MEMBERS) {
    throw new Error(
      `Apenas ${rows.length} negócio(s) fechado(s) com email/telefone — a Meta exige pelo menos ${MIN_SEED_MEMBERS} membros na audiência semente.`,
    );
  }

  const adapter = await resolveMetaAdapter(tenantId, clientId);
  const clientIdForDb = clientId === 'own' || !clientId ? null : clientId;

  const insertRes = await pool.query(
    `INSERT INTO public.tenant_audiences (tenant_id, client_id, network_code, kind, name, criteria, status)
     VALUES ($1::uuid, $2::uuid, 'meta', 'custom', $3, $4::jsonb, 'CREATING')
     RETURNING *`,
    [tenantId, clientIdForDb, name, JSON.stringify({ source: 'closed_deals', eligibleCount: rows.length })],
  );
  const localRow = insertRes.rows[0];

  try {
    const { externalId } = await adapter.createCustomAudience(name, 'Gerada automaticamente a partir de negócios fechados reais no CRM.');
    await pool.query(
      `UPDATE public.tenant_audiences SET external_id = $2, status = 'UPLOADING', updated_at = now() WHERE id = $1::uuid`,
      [localRow.id, externalId],
    );

    const uploaded = await adapter.uploadAudienceUsers(externalId, rows);
    const { rows: updated } = await pool.query(
      `UPDATE public.tenant_audiences
          SET status = 'PROCESSING', member_count_uploaded = $2, last_synced_at = now(), updated_at = now()
        WHERE id = $1::uuid RETURNING *`,
      [localRow.id, uploaded],
    );
    return mapRow(updated[0]);
  } catch (err: any) {
    await pool.query(
      `UPDATE public.tenant_audiences SET status = 'FAILED', error_message = $2, updated_at = now() WHERE id = $1::uuid`,
      [localRow.id, err?.message || 'Erro desconhecido'],
    );
    throw err;
  }
}

/** Cria uma Lookalike a partir de uma Custom Audience já existente — confirma localmente que
 *  a semente já processou (status READY ou PROCESSING com approximate_count real) e tem
 *  >= MIN_SEED_MEMBERS antes de tentar, mesmo racional do create acima.
 *
 *  `expectedTenantId` é sempre exigido e checado ANTES de qualquer ação — sem isso, um
 *  usuário de um tenant poderia passar o `id` de uma audiência de OUTRO tenant e disparar uma
 *  chamada real à Meta (e uma linha nova) usando as credenciais/dado de negócio de outro
 *  tenant. Nunca confia só na rota chamadora pra fazer esse isolamento. */
export async function createLookalikeFromAudience(
  tenantAudienceId: string,
  country: string,
  ratio: number,
  expectedTenantId: string,
): Promise<TenantAudience> {
  if (ratio < 0.01 || ratio > 0.2) {
    throw new Error('ratio deve estar entre 0.01 e 0.20 (1% a 20%), conforme a Meta exige.');
  }

  const { rows: originRows } = await pool.query(
    `SELECT * FROM public.tenant_audiences WHERE id = $1::uuid AND kind = 'custom'`,
    [tenantAudienceId],
  );
  const origin = originRows[0];
  if (!origin) throw new Error('Custom Audience de origem não encontrada.');
  if (origin.tenant_id !== expectedTenantId) {
    throw new Error('Custom Audience de origem não encontrada.'); // mesma mensagem de "não existe" — não confirma pra fora que o id é de outro tenant
  }
  if (!origin.external_id) throw new Error('Custom Audience de origem ainda não foi criada na Meta (sem external_id).');
  if (origin.member_count_uploaded < MIN_SEED_MEMBERS) {
    throw new Error(`A audiência semente tem só ${origin.member_count_uploaded} membro(s) enviado(s) — a Meta exige pelo menos ${MIN_SEED_MEMBERS}.`);
  }

  const adapter = await resolveMetaAdapter(origin.tenant_id, origin.client_id);
  const name = `Lookalike ${(ratio * 100).toFixed(0)}% - ${country} (de "${origin.name}")`;

  const insertRes = await pool.query(
    `INSERT INTO public.tenant_audiences
       (tenant_id, client_id, network_code, kind, name, criteria, origin_audience_id, status)
     VALUES ($1::uuid, $2::uuid, 'meta', 'lookalike', $3, $4::jsonb, $5::uuid, 'CREATING')
     RETURNING *`,
    [origin.tenant_id, origin.client_id, name, JSON.stringify({ country, ratio }), tenantAudienceId],
  );
  const localRow = insertRes.rows[0];

  try {
    const { externalId } = await adapter.createLookalikeAudience(origin.external_id, country, ratio);
    const { rows: updated } = await pool.query(
      `UPDATE public.tenant_audiences
          SET external_id = $2, status = 'PROCESSING', last_synced_at = now(), updated_at = now()
        WHERE id = $1::uuid RETURNING *`,
      [localRow.id, externalId],
    );
    return mapRow(updated[0]);
  } catch (err: any) {
    await pool.query(
      `UPDATE public.tenant_audiences SET status = 'FAILED', error_message = $2, updated_at = now() WHERE id = $1::uuid`,
      [localRow.id, err?.message || 'Erro desconhecido'],
    );
    throw err;
  }
}

/** Consulta o status real na Meta e atualiza a linha local — chamado sob demanda (botão
 *  "Atualizar status" na UI) e também pelo cron `audiences-refresh` (ver final do arquivo).
 *
 *  `expectedTenantId` sempre exigido e checado antes de qualquer coisa — mesmo racional de
 *  isolamento de `createLookalikeFromAudience`. */
export async function refreshAudienceStatus(tenantAudienceId: string, expectedTenantId: string): Promise<TenantAudience> {
  const { rows } = await pool.query(`SELECT * FROM public.tenant_audiences WHERE id = $1::uuid`, [tenantAudienceId]);
  const row = rows[0];
  if (!row || row.tenant_id !== expectedTenantId) throw new Error('Audiência não encontrada.');
  if (!row.external_id) return mapRow(row);

  const adapter = await resolveMetaAdapter(row.tenant_id, row.client_id);
  const { operationStatus, approximateCount } = await adapter.getAudienceStatus(row.external_id);

  // Códigos reais da Meta (developers.facebook.com/docs/marketing-api/reference/custom-audience):
  // 200 = Normal (pronta) · 441 = preenchendo, já utilizável imediatamente. Qualquer outro
  // valor real (baixa taxa de match, erro, flag de integridade etc.) mantém o status local
  // como estava — nunca promove pra READY sem confirmação real da rede.
  const READY_CODES = [200, 441];
  const newStatus = operationStatus !== null && READY_CODES.includes(operationStatus) ? 'READY' : row.status;
  const { rows: updated } = await pool.query(
    `UPDATE public.tenant_audiences
        SET status = $2, approximate_count = $3, last_synced_at = now(), updated_at = now()
      WHERE id = $1::uuid RETURNING *`,
    [tenantAudienceId, newStatus, approximateCount],
  );
  return mapRow(updated[0]);
}

// ─── Automação (cron `audiences-refresh`) — nunca gasta dinheiro, nunca muda campanha ativa ──
// Decisão do usuário (2026-09-05): manter a Custom Audience atualizada e criar a Lookalike a
// partir dela podem ser 100% automáticos, porque nenhum dos dois muda segmentação de campanha
// nem gasto real — é só manutenção de uma lista de clientes e a definição de um público novo.
// A ETAPA que de fato altera uma campanha (USE_LOOKALIKE_AUDIENCE) nunca vive aqui — ela é uma
// sugestão de `aiInsights.ts`, sempre passando por aprovação humana via PIN (agentDecisor.ts).

/** Reenvia a lista atual de negócios fechados pra uma Custom Audience já existente — a Meta
 *  trata reenvio como união (hashes repetidos não duplicam), então isso é sempre seguro e
 *  idempotente mesmo chamado todo dia. */
export async function refreshCustomAudienceMembers(audienceId: string): Promise<TenantAudience> {
  const { rows } = await pool.query(
    `SELECT * FROM public.tenant_audiences WHERE id = $1::uuid AND kind = 'custom'`,
    [audienceId],
  );
  const row = rows[0];
  if (!row || !row.external_id) throw new Error('Custom Audience não encontrada ou sem external_id.');

  const eligibleRows = await fetchEligibleRows(row.tenant_id, row.client_id);
  const adapter = await resolveMetaAdapter(row.tenant_id, row.client_id);
  const uploaded = await adapter.uploadAudienceUsers(row.external_id, eligibleRows);

  const { rows: updated } = await pool.query(
    `UPDATE public.tenant_audiences
        SET member_count_uploaded = $2, last_synced_at = now(), updated_at = now()
      WHERE id = $1::uuid RETURNING *`,
    [audienceId, uploaded],
  );
  return mapRow(updated[0]);
}

/** Todos os pares (tenant, cliente) com >= MIN_SEED_MEMBERS negócios fechados elegíveis que
 *  AINDA não têm nenhuma Custom Audience criada — candidatos à criação automática. */
async function findScopesNeedingCustomAudience(): Promise<{ tenantId: string; clientId: string | null }[]> {
  const { rows } = await pool.query(
    `SELECT ls.tenant_id, ls.client_id, count(*)::int AS n
       FROM public.leads_staging ls
       JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id AND kc.is_ganho = true
      WHERE (ls.email IS NOT NULL AND ls.email <> '' OR ls.telefone IS NOT NULL AND ls.telefone <> '')
      GROUP BY ls.tenant_id, ls.client_id
     HAVING count(*) >= $1`,
    [MIN_SEED_MEMBERS],
  );
  const { rows: existing } = await pool.query(
    `SELECT tenant_id, client_id FROM public.tenant_audiences WHERE kind = 'custom'`,
  );
  const existingSet = new Set(existing.map((r: any) => `${r.tenant_id}::${r.client_id ?? 'own'}`));
  return rows
    .filter((r: any) => !existingSet.has(`${r.tenant_id}::${r.client_id ?? 'own'}`))
    .map((r: any) => ({ tenantId: r.tenant_id, clientId: r.client_id }));
}

/** Cria automaticamente 1 Custom Audience por escopo elegível ainda sem nenhuma — nome
 *  identificável como gerado pelo sistema (o admin pode renomear/criar outra manualmente na
 *  UI a qualquer momento; isso nunca impede a criação manual). */
export async function autoCreateCustomAudiencesForEligibleScopes(): Promise<{ created: number; failed: number }> {
  const scopes = await findScopesNeedingCustomAudience();
  let created = 0;
  let failed = 0;
  for (const { tenantId, clientId } of scopes) {
    try {
      const name = `Clientes Reais (Auto) — ${new Date().toISOString().slice(0, 10)}`;
      await createCustomAudienceFromClosedDeals(tenantId, clientId, name);
      created++;
    } catch (err) {
      console.error(`[audienceService] falha ao auto-criar Custom Audience (tenant ${tenantId}, client ${clientId ?? 'own'}):`, err);
      failed++;
    }
  }
  return { created, failed };
}

/** Atualiza a lista de membros de toda Custom Audience já existente e ativa (nunca as que já
 *  falharam permanentemente — essas exigem intervenção manual, retry automático indefinido
 *  seria ruído). */
export async function refreshAllExistingCustomAudiences(): Promise<{ refreshed: number; failed: number }> {
  const { rows } = await pool.query(
    `SELECT id FROM public.tenant_audiences WHERE kind = 'custom' AND external_id IS NOT NULL AND status <> 'FAILED'`,
  );
  let refreshed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await refreshCustomAudienceMembers(row.id);
      refreshed++;
    } catch (err) {
      console.error(`[audienceService] falha ao atualizar membros da audiência ${row.id}:`, err);
      failed++;
    }
  }
  return { refreshed, failed };
}

/** Cria automaticamente 1 Lookalike (ratio 1%, o mais preciso — ponto de partida recomendado
 *  pela própria Meta) para toda Custom Audience READY com amostra suficiente que ainda não
 *  tem nenhuma Lookalike filha. Nunca cria uma 2ª a partir da mesma semente. */
export async function autoCreateLookalikesFromReadyCustoms(): Promise<{ created: number; failed: number }> {
  const { rows } = await pool.query(
    `SELECT c.id, c.tenant_id
       FROM public.tenant_audiences c
      WHERE c.kind = 'custom' AND c.status = 'READY' AND c.member_count_uploaded >= $1
        AND NOT EXISTS (SELECT 1 FROM public.tenant_audiences l WHERE l.origin_audience_id = c.id)`,
    [MIN_SEED_MEMBERS],
  );
  let created = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await createLookalikeFromAudience(row.id, 'BR', 0.01, row.tenant_id);
      created++;
    } catch (err) {
      console.error(`[audienceService] falha ao auto-criar Lookalike (semente ${row.id}):`, err);
      failed++;
    }
  }
  return { created, failed };
}

/** Consulta o status real de toda audiência ainda em processamento — só assim uma Custom
 *  Audience recém-criada chega a virar READY sozinha (e a Lookalike, criada automaticamente
 *  em seguida) sem ninguém precisar clicar "Atualizar status" manualmente. */
export async function refreshAllProcessingStatuses(): Promise<{ refreshed: number; failed: number }> {
  const { rows } = await pool.query(
    `SELECT id, tenant_id FROM public.tenant_audiences
      WHERE external_id IS NOT NULL AND status IN ('CREATING', 'UPLOADING', 'PROCESSING')`,
  );
  let refreshed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await refreshAudienceStatus(row.id, row.tenant_id);
      refreshed++;
    } catch (err) {
      console.error(`[audienceService] falha ao atualizar status da audiência ${row.id}:`, err);
      failed++;
    }
  }
  return { refreshed, failed };
}
