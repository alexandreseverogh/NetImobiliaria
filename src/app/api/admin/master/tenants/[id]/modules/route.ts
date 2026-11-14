import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;

  try {
    const query = `
      SELECT sm.*, 
             CASE WHEN tm.tenant_id IS NOT NULL THEN true ELSE false END as assigned
      FROM system_modules sm
      LEFT JOIN tenant_modules tm ON sm.id = tm.module_id AND tm.tenant_id = $1
      ORDER BY sm.name ASC
    `;
    const result = await pool.query(query, [id]);
    return NextResponse.json({ modules: result.rows });
  } catch (error: any) {
    console.error('Error fetching tenant modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;
  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const body = await request.json();
    const { moduleIds } = body;

    if (!Array.isArray(moduleIds)) {
      return NextResponse.json({ error: 'moduleIds deve ser um array' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 0. Módulos atuais (antes da troca), para saber quais saem e quais entram
    const beforeRes = await client.query('SELECT module_id FROM tenant_modules WHERE tenant_id = $1', [id]);
    const beforeIds: string[] = beforeRes.rows.map((r: { module_id: string }) => r.module_id);

    // 1. Remover módulos atuais
    await client.query('DELETE FROM tenant_modules WHERE tenant_id = $1', [id]);

    // 2. Inserir novos módulos
    if (moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await client.query(
          'INSERT INTO tenant_modules (tenant_id, module_id) VALUES ($1, $2)',
          [id, moduleId]
        );
      }
    }

    // 2b. Sincroniza as funcionalidades provisionadas com os módulos: o que sai do contrato some
    // da sidebar; o que volta a entrar reaparece (só provisões já existentes são reativadas).
    // Funcionalidade ligada a um módulo que continua contratado NÃO é desativada.
    const newIds: string[] = moduleIds as string[];
    const removedIds = beforeIds.filter(mid => !newIds.includes(mid));
    const addedIds = newIds.filter(mid => !beforeIds.includes(mid));
    if (removedIds.length > 0) {
      await client.query(
        `UPDATE public.tenant_feature_overrides SET is_active = false
          WHERE tenant_id = $1
            AND feature_id IN (SELECT feature_id FROM public.system_feature_modules WHERE module_id = ANY($2::uuid[]))
            AND feature_id NOT IN (SELECT feature_id FROM public.system_feature_modules WHERE module_id = ANY($3::uuid[]))`,
        [id, removedIds, newIds],
      )
    }
    if (addedIds.length > 0) {
      await client.query(
        `UPDATE public.tenant_feature_overrides SET is_active = true
          WHERE tenant_id = $1
            AND feature_id IN (SELECT feature_id FROM public.system_feature_modules WHERE module_id = ANY($2::uuid[]))`,
        [id, addedIds],
      )
    }

    // 3. Regra GERA_MENSAGENS_WHATSAPP: só pode ficar ligado com CRM e/ou Mensageria contratado.
    // Se a nova lista não tiver nenhum dos dois, desliga o GERA na mesma transação.
    const slugsResult = moduleIds.length > 0
      ? await client.query('SELECT slug FROM system_modules WHERE id = ANY($1::uuid[])', [moduleIds])
      : { rows: [] as { slug: string }[] };
    const slugs = slugsResult.rows.map((r: { slug: string }) => r.slug);
    if (!slugs.includes('crm') && !slugs.includes('mensageria')) {
      await client.query('UPDATE tenants SET gera_mensagens_whatsapp = false WHERE id = $1', [id]);
    }
    // Com a Mensageria contratada, o GERA é obrigatoriamente ligado (sem ele as mensagens não chegam).
    if (slugs.includes('mensageria')) {
      await client.query('UPDATE tenants SET gera_mensagens_whatsapp = true WHERE id = $1', [id]);
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating tenant modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}