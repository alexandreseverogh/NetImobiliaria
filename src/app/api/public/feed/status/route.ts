import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para verificar o status do serviço de coleta de feed
 * Retorna informações sobre última coleta, jobs pendentes, etc.
 */
export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // 1. Verificar última coleta de qualquer fonte ativa
      const ultimaColetaResult = await client.query(`
        SELECT 
          MAX(ultima_coleta) as ultima_coleta,
          COUNT(*) FILTER (WHERE ultima_coleta > NOW() - INTERVAL '2 hours') as fontes_ativas_recentes,
          COUNT(*) FILTER (WHERE ultima_coleta IS NULL) as fontes_nunca_coletadas,
          COUNT(*) FILTER (WHERE status_coleta = 'ERRO') as fontes_com_erro
        FROM feed.feed_fontes
        WHERE ativo = true
      `);

      const ultimaColeta = ultimaColetaResult.rows[0];
      const ultimaColetaDate = ultimaColeta.ultima_coleta 
        ? new Date(ultimaColeta.ultima_coleta) 
        : null;

      // 2. Verificar jobs pendentes
      const jobsPendentesResult = await client.query(`
        SELECT COUNT(*) as total
        FROM feed.feed_jobs
        WHERE status = 'PENDING'
      `);

      const jobsPendentes = parseInt(jobsPendentesResult.rows[0].total) || 0;

      // 3. Verificar jobs processados recentemente (últimas 2 horas)
      const jobsRecentesResult = await client.query(`
        SELECT COUNT(*) as total
        FROM feed.feed_jobs
        WHERE status = 'COMPLETED' 
          AND finalizado_em > NOW() - INTERVAL '2 hours'
      `);

      const jobsRecentes = parseInt(jobsRecentesResult.rows[0].total) || 0;

      // 4. Verificar total de conteúdos disponíveis
      const conteudosResult = await client.query(`
        SELECT COUNT(*) as total
        FROM feed.feed_conteudos
        WHERE ativo = true
      `);

      const totalConteudos = parseInt(conteudosResult.rows[0].total) || 0;

      // 5. Determinar status do serviço
      let status: 'ativo' | 'parado' | 'erro' | 'desconhecido' = 'desconhecido';
      let mensagem = '';
      
      if (ultimaColetaDate) {
        const horasDesdeUltimaColeta = (Date.now() - ultimaColetaDate.getTime()) / (1000 * 60 * 60);
        
        if (horasDesdeUltimaColeta < 2) {
          status = 'ativo';
          mensagem = `Serviço ativo - Última coleta há ${Math.round(horasDesdeUltimaColeta * 60)} minutos`;
        } else if (horasDesdeUltimaColeta < 24) {
          status = 'parado';
          mensagem = `Serviço parado - Última coleta há ${Math.round(horasDesdeUltimaColeta)} horas`;
        } else {
          status = 'parado';
          mensagem = `Serviço parado há muito tempo - Última coleta há ${Math.round(horasDesdeUltimaColeta / 24)} dias`;
        }
      } else {
        status = 'desconhecido';
        mensagem = 'Nenhuma coleta registrada ainda';
      }

      // Se há muitas fontes com erro, marcar como erro
      if (ultimaColeta.fontes_com_erro > 0 && ultimaColeta.fontes_com_erro >= ultimaColeta.fontes_ativas_recentes) {
        status = 'erro';
        mensagem = `${ultimaColeta.fontes_com_erro} fonte(s) com erro na coleta`;
      }

      return NextResponse.json({
        success: true,
        status,
        mensagem,
        dados: {
          ultima_coleta: ultimaColetaDate?.toISOString() || null,
          fontes_ativas_recentes: parseInt(ultimaColeta.fontes_ativas_recentes) || 0,
          fontes_nunca_coletadas: parseInt(ultimaColeta.fontes_nunca_coletadas) || 0,
          fontes_com_erro: parseInt(ultimaColeta.fontes_com_erro) || 0,
          jobs_pendentes: jobsPendentes,
          jobs_recentes: jobsRecentes,
          total_conteudos: totalConteudos
        }
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [Feed Status] Erro ao verificar status:', error);
    return NextResponse.json({
      success: false,
      status: 'erro',
      mensagem: 'Erro ao verificar status do serviço',
      error: error.message
    }, { status: 500 });
  }
}

