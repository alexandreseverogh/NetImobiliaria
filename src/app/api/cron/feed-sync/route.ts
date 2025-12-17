import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';
import { fetchAndParseFeed, saveFeedItems } from '@/lib/services/feedService';

export const dynamic = 'force-dynamic'; // Impede cache estático dessa rota

export async function GET(request: Request) {
  // Autenticação simples para Cron (opcional: verificar header Authorization)
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  const client = await pool.connect();

  try {
    // 1. Buscar próximo Job pendente (FIFO)
    // Usa FOR UPDATE SKIP LOCKED para evitar que múltiplos workers peguem o mesmo job
    const jobQuery = `
      SELECT j.id, j.fonte_fk, f.url_feed, f.categoria_fk, COALESCE(f.idioma, 'pt') as idioma
      FROM feed.feed_jobs j
      JOIN feed.feed_fontes f ON j.fonte_fk = f.id
      WHERE j.status = 'PENDING'
      ORDER BY j.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    
    await client.query('BEGIN');
    const jobResult = await client.query(jobQuery);

    if (jobResult.rowCount === 0) {
      await client.query('COMMIT');
      return NextResponse.json({ message: 'Nenhum job pendente.' }, { status: 200 });
    }

    const job = jobResult.rows[0];
    const jobId = job.id;

    // 2. Atualizar status para PROCESSING
    await client.query(
      `UPDATE feed.feed_jobs SET status = 'PROCESSING', iniciado_em = NOW() WHERE id = $1`,
      [jobId]
    );
    await client.query('COMMIT'); // Libera o lock do banco logo após marcar como processing

    // 3. Processamento (Fora da transação do banco para não travar conexão longa)
    try {
      console.log(`Iniciando processamento do Job #${jobId} (Fonte: ${job.url_feed})`);
      
      const items = await fetchAndParseFeed(job.url_feed);
      const savedCount = await saveFeedItems(items, job.fonte_fk, job.categoria_fk, job.idioma || 'pt');

      // 4. Sucesso
      await client.query(
        `UPDATE feed.feed_jobs 
         SET status = 'COMPLETED', finalizado_em = NOW(), log_erro = $2 
         WHERE id = $1`,
        [jobId, `Processado com sucesso. ${savedCount} novos itens.`]
      );
      
      // Atualiza data da última coleta na fonte
      await client.query(
        `UPDATE feed.feed_fontes SET ultima_coleta = NOW(), status_coleta = 'OK' WHERE id = $1`,
        [job.fonte_fk]
      );

      return NextResponse.json({ 
        success: true, 
        jobId, 
        savedCount,
        message: 'Feed processado com sucesso' 
      });

    } catch (processError) {
      // 5. Falha no processamento
      console.error(`Falha no Job #${jobId}:`, processError);
      const errorMsg = (processError as Error).message.substring(0, 1000); // Limita tamanho do log

      await client.query(
        `UPDATE feed.feed_jobs 
         SET status = 'FAILED', finalizado_em = NOW(), log_erro = $2, tentativas = tentativas + 1 
         WHERE id = $1`,
        [jobId, errorMsg]
      );

      // Atualiza status da fonte para ERRO
      await client.query(
        `UPDATE feed.feed_fontes SET status_coleta = 'ERRO', msg_erro = $2 WHERE id = $1`,
        [job.fonte_fk, errorMsg]
      );

      return NextResponse.json({ 
        success: false, 
        jobId, 
        error: errorMsg 
      }, { status: 500 });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro fatal no worker de feed:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  } finally {
    client.release();
  }
}






