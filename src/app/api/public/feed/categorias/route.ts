import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';

export const dynamic = 'force-dynamic'; // Forçar não-cache

/**
 * GET /api/public/feed/categorias
 * Retorna todas as categorias que possuem feeds ativos
 */
export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Buscar IDs dos 8 feeds mais recentes (independente de categoria)
      const topFeedsResult = await client.query(`
        SELECT id FROM feed.feed_conteudos
        WHERE ativo = true
        ORDER BY data_publicacao DESC
        LIMIT 8
      `);
      const topFeedIds = topFeedsResult.rows.map(row => row.id);

      // Buscar categorias que possuem pelo menos um feed ativo
      // Excluindo os 8 mais recentes que já aparecem no topo
      let query: string;
      let queryParams: any[];

      // Verificar se a coluna 'ordem' existe na tabela
      let hasOrdemColumn = false;
      try {
        const checkColumn = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'feed' 
            AND table_name = 'feed_categorias' 
            AND column_name = 'ordem'
        `);
        hasOrdemColumn = checkColumn.rows.length > 0;
      } catch (e) {
        console.warn('⚠️ [API Feed Categorias] Não foi possível verificar coluna ordem:', e);
      }

      if (topFeedIds.length > 0) {
        // Criar placeholders para os IDs
        const placeholders = topFeedIds.map((_, index) => `$${index + 1}`).join(',');
        
        const orderByClause = hasOrdemColumn 
          ? 'ORDER BY cat.ordem ASC, cat.nome ASC'
          : 'ORDER BY cat.nome ASC';
        
        const groupByClause = hasOrdemColumn
          ? 'GROUP BY cat.id, cat.nome, cat.slug, cat.cor, cat.icone, cat.ordem'
          : 'GROUP BY cat.id, cat.nome, cat.slug, cat.cor, cat.icone';
        
        query = `
          SELECT
            cat.id,
            cat.nome,
            cat.slug,
            cat.cor,
            cat.icone,
            COUNT(c.id) as total_feeds
          FROM feed.feed_categorias cat
          JOIN feed.feed_conteudos c ON cat.id = c.categoria_fk
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND cat.ativo = true
            AND c.id NOT IN (${placeholders})
          ${groupByClause}
          HAVING COUNT(c.id) > 0
          ${orderByClause}
        `;
        queryParams = topFeedIds;
      } else {
        const orderByClause = hasOrdemColumn 
          ? 'ORDER BY cat.ordem ASC, cat.nome ASC'
          : 'ORDER BY cat.nome ASC';
        
        const groupByClause = hasOrdemColumn
          ? 'GROUP BY cat.id, cat.nome, cat.slug, cat.cor, cat.icone, cat.ordem'
          : 'GROUP BY cat.id, cat.nome, cat.slug, cat.cor, cat.icone';
        
        query = `
          SELECT
            cat.id,
            cat.nome,
            cat.slug,
            cat.cor,
            cat.icone,
            COUNT(c.id) as total_feeds
          FROM feed.feed_categorias cat
          JOIN feed.feed_conteudos c ON cat.id = c.categoria_fk
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND cat.ativo = true
          ${groupByClause}
          HAVING COUNT(c.id) > 0
          ${orderByClause}
        `;
        queryParams = [];
      }

      const result = await client.query(query, queryParams);

      const categorias = result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        slug: row.slug,
        cor: row.cor || '#3B82F6',
        icone: row.icone || 'NewspaperIcon',
        total_feeds: parseInt(row.total_feeds)
      }));

      return NextResponse.json({
        success: true,
        data: categorias
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
        }
      });

    } catch (queryError: any) {
      console.error('❌ [API Feed Categorias] Erro na query:', queryError);
      console.error('❌ [API Feed Categorias] Stack:', queryError.stack);
      if (typeof query !== 'undefined') {
        console.error('❌ [API Feed Categorias] Query que falhou:', query);
        console.error('❌ [API Feed Categorias] Parâmetros:', queryParams);
      }
      return NextResponse.json(
        {
          success: false,
          error: queryError.message,
          details: process.env.NODE_ENV === 'development' ? {
            message: queryError.message,
            stack: queryError.stack,
            code: queryError.code,
            detail: queryError.detail,
            hint: queryError.hint
          } : undefined
        },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [API Feed Categorias] Erro ao conectar ao banco:', error);
    console.error('❌ [API Feed Categorias] Stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

