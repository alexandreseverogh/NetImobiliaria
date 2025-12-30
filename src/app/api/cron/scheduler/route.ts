import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const client = await pool.connect();

  try {
    // Busca fontes ativas que precisam de atualização
    // Critério: (ultima_coleta + intervalo) <= AGORA  OU  ultima_coleta IS NULL
    // E não deve ter job PENDING/PROCESSING já existente para evitar duplicar a fila
    const query = `
      INSERT INTO feed.feed_jobs (fonte_fk, status)
      SELECT f.id, 'PENDING'
      FROM feed.feed_fontes f
      WHERE f.ativo = true
      AND (
        f.ultima_coleta IS NULL 
        OR f.ultima_coleta + (f.intervalo_minutos || ' minutes')::INTERVAL <= NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM feed.feed_jobs j 
        WHERE j.fonte_fk = f.id 
        AND j.status IN ('PENDING', 'PROCESSING')
      )
      RETURNING id, fonte_fk;
    `;

    const result = await client.query(query);
    const agendados = result.rowCount;

    return NextResponse.json({
      success: true,
      message: `Agendamento executado com sucesso.`,
      jobs_criados: agendados,
      jobs: result.rows
    });

  } catch (error) {
    console.error('Erro no Scheduler de Feed:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
}







