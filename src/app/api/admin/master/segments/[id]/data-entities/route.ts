/**
 * Dados do Bot (M4.2, Ponto 3c) — entidades de dados consultáveis pelo bot de um segmento.
 *
 * GET /api/admin/master/segments/[id]/data-entities
 *   → entidades atuais do segmento (mensageria.segment_data_entities, tenant_id IS NULL)
 *
 * PUT /api/admin/master/segments/[id]/data-entities
 *   → substitui (replace) o conjunto do segmento. Body: { entities: [...] }
 *
 * Só cobre entidades de escopo segmento (tenant_id IS NULL) — overrides por tenant
 * continuam via SQL direto por ora, mesma decisão já tomada pra bot_flows (18.1).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

interface EntityColumnInput {
  name: string;
  type: 'text' | 'number' | 'boolean';
  description?: string;
  selectable?: boolean;
  filterable?: boolean;
  is_group_header?: boolean;
  lookup_table?: string;
  lookup_pk?: string;
  lookup_label_column?: string;
}
interface EntityRelationInput {
  name: string;
  description?: string;
  bridge_table: string;
  bridge_fk: string;
  base_pk?: string;
  lookup_table?: string;
  lookup_fk?: string;
  lookup_pk?: string;
  select_column: string;
  agg?: 'array' | 'count' | 'first';
  max?: number;
  is_image?: boolean;
}
interface EntityInput {
  entityName: string;
  tableName: string;
  description?: string;
  tenantColumn?: string;
  defaultFilter?: string;
  maxRows?: number;
  isActive?: boolean;
  columns: EntityColumnInput[];
  relations: EntityRelationInput[];
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, entity_name, table_name, description, columns, relations,
              tenant_column, default_filter, max_rows, is_active
         FROM mensageria.segment_data_entities
        WHERE segment_id = $1::uuid AND tenant_id IS NULL
        ORDER BY entity_name`,
      [params.id],
    );
    return NextResponse.json({
      entities: rows.map((r) => ({
        id: r.id,
        entityName: r.entity_name,
        tableName: r.table_name,
        description: r.description,
        columns: r.columns || [],
        relations: r.relations || [],
        tenantColumn: r.tenant_column,
        defaultFilter: r.default_filter,
        maxRows: r.max_rows,
        isActive: r.is_active,
      })),
    });
  } catch (err: any) {
    console.error('[segments/data-entities GET]', err?.message ?? err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateEntities(entities: EntityInput[]): string | null {
  for (const e of entities) {
    if (!e.entityName?.trim() || !IDENT_RE.test(e.entityName.trim())) {
      return `Nome de entidade inválido: "${e.entityName}" (use letras/números/underscore, sem espaço)`;
    }
    if (!e.tableName?.trim() || !IDENT_RE.test(e.tableName.trim())) {
      return `Nome de tabela inválido em "${e.entityName}": "${e.tableName}"`;
    }
    if (e.tenantColumn && !IDENT_RE.test(e.tenantColumn)) {
      return `Coluna de tenant inválida em "${e.entityName}": "${e.tenantColumn}"`;
    }
    for (const c of e.columns || []) {
      if (!c.name?.trim() || !IDENT_RE.test(c.name.trim())) {
        return `Nome de coluna inválido em "${e.entityName}": "${c.name}"`;
      }
      const lookupFields = [c.lookup_table, c.lookup_pk, c.lookup_label_column].filter((v): v is string => !!v);
      for (const f of lookupFields) {
        if (!IDENT_RE.test(f)) return `Identificador de lookup inválido na coluna "${c.name}" de "${e.entityName}": "${f}"`;
      }
    }
    for (const r of e.relations || []) {
      const fields = [r.name, r.bridge_table, r.bridge_fk, r.select_column, r.base_pk, r.lookup_table, r.lookup_fk, r.lookup_pk]
        .filter((v): v is string => !!v);
      for (const f of fields) {
        if (!IDENT_RE.test(f)) return `Identificador inválido em relation "${r.name}" de "${e.entityName}": "${f}"`;
      }
    }
  }
  return null;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const entities = body?.entities as EntityInput[];
    if (!Array.isArray(entities)) {
      return NextResponse.json({ error: 'Campo "entities" deve ser um array' }, { status: 400 });
    }

    const validationError = validateEntities(entities);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM mensageria.segment_data_entities WHERE segment_id = $1::uuid AND tenant_id IS NULL`,
        [params.id],
      );

      for (const e of entities) {
        await client.query(
          `INSERT INTO mensageria.segment_data_entities
             (segment_id, tenant_id, entity_name, table_name, description, columns, relations,
              tenant_column, default_filter, max_rows, is_active)
           VALUES ($1::uuid, NULL, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)`,
          [
            params.id,
            e.entityName.trim(),
            e.tableName.trim(),
            e.description?.trim() || null,
            JSON.stringify(e.columns || []),
            JSON.stringify(e.relations || []),
            e.tenantColumn?.trim() || 'tenant_id',
            e.defaultFilter?.trim() || null,
            Math.min(Math.max(e.maxRows || 5, 1), 20),
            e.isActive !== false,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, count: entities.length });
  } catch (err: any) {
    console.error('[segments/data-entities PUT]', err?.message ?? err);
    return NextResponse.json({ error: err.message ?? 'Erro ao salvar entidades' }, { status: 500 });
  }
}
