/**
 * ROTA TEMPORÁRIA — migração colunas de campanha em clientes
 * DELETE após execução com sucesso
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const done: string[] = [];
  const errs: string[] = [];

  const run = async (label: string, sql: string) => {
    try { await prisma.$executeRawUnsafe(sql); done.push(`✅ ${label}`); }
    catch (e: any) { errs.push(`❌ ${label}: ${e.message}`); }
  };

  await run('clientes.page_id',             `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS page_id TEXT`);
  await run('clientes.pixel_id',            `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS pixel_id TEXT`);
  await run('clientes.instagram_actor_id',  `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS instagram_actor_id TEXT`);

  // Verificação
  const cols = await prisma.$queryRawUnsafe<any[]>(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes'
      AND column_name IN ('page_id','pixel_id','instagram_actor_id','website')
    ORDER BY column_name
  `);

  return NextResponse.json({
    success: errs.length === 0,
    done, errs,
    colunas_clientes: cols,
    next_step: errs.length === 0
      ? '🎉 Delete src/app/api/admin/run-migration-clients-campaign/route.ts'
      : '⚠️ Verifique os erros',
  });
}
