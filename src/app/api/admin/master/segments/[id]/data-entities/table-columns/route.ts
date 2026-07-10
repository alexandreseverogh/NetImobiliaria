/**
 * Introspecção sob demanda (versão simples do job da seção 14.6-A) — lista as colunas
 * REAIS de uma tabela física (schema public), pra o Master não precisar adivinhar nomes
 * de cabeça ao cadastrar uma entidade em "Dados do Bot".
 *
 * GET /api/admin/master/segments/[id]/data-entities/table-columns?table=imoveis
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

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Vocabulário simplificado que o resolver/UI usa — mapeado a partir do data_type real do Postgres.
function simplifyType(pgType: string): 'text' | 'number' | 'boolean' {
  if (pgType === 'boolean') return 'boolean';
  if (['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'decimal'].includes(pgType)) {
    return 'number';
  }
  return 'text';
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  const table = new URL(request.url).searchParams.get('table')?.trim() || '';
  if (!table || !IDENT_RE.test(table)) {
    return NextResponse.json({ error: 'Nome de tabela inválido' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [table],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: `Tabela "${table}" não encontrada (schema public)` }, { status: 404 });
    }
    return NextResponse.json({
      columns: rows.map((r) => ({ name: r.column_name, type: simplifyType(r.data_type) })),
    });
  } catch (err: any) {
    console.error('[data-entities/table-columns GET]', err?.message ?? err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
