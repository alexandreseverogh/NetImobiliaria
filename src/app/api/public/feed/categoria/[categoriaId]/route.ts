import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';

export const dynamic = 'force-dynamic'; // Forçar não-cache

/**
 * GET /api/public/feed/categoria/[categoriaId]
 * Retorna feeds antigos de uma categoria específica
 * 
 * Query params:
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 20, máximo: 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { categoriaId: string } }
) {
  try {
    const categoriaId = parseInt(params.categoriaId);
    
    // Validação básica
    if (isNaN(categoriaId) || categoriaId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID de categoria inválido' },
        { status: 400 }
      );
    }

    // Extrair parâmetros de paginação
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    
    try {
      // Verificar se a categoria existe e está ativa
      const categoriaCheck = await client.query(
        `SELECT id, nome, cor, icone FROM feed.feed_categorias WHERE id = $1`,
        [categoriaId]
      );

      if (categoriaCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Categoria não encontrada' },
          { status: 404 }
        );
      }

      const categoria = categoriaCheck.rows[0];

      // Buscar IDs dos 8 feeds mais recentes (independente de categoria)
      const topFeedsResult = await client.query(`
        SELECT id FROM feed.feed_conteudos
        WHERE ativo = true
        ORDER BY data_publicacao DESC
        LIMIT 8
      `);
      const topFeedIds = topFeedsResult.rows.map(row => row.id);

      // Construir query com exclusão segura dos top feeds
      let query: string;
      let countQuery: string;
      let queryParams: any[];
      let countParams: any[];

      if (topFeedIds.length > 0) {
        // Criar placeholders para os IDs (começando do $2, pois $1 é categoriaId)
        const placeholders = topFeedIds.map((_, index) => `$${index + 2}`).join(',');
        
        query = `
          SELECT 
            c.id, 
            c.titulo, 
            c.resumo, 
            c.url_original, 
            c.url_imagem, 
            to_char(c.data_publicacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_publicacao,
            cat.nome as categoria_nome,
            cat.cor as categoria_cor,
            cat.icone as categoria_icone,
            f.nome as fonte_nome
          FROM feed.feed_conteudos c
          JOIN feed.feed_categorias cat ON c.categoria_fk = cat.id
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND c.categoria_fk = $1
            AND c.id NOT IN (${placeholders})
          ORDER BY c.data_publicacao DESC
          LIMIT $${topFeedIds.length + 2} OFFSET $${topFeedIds.length + 3}
        `;

        countQuery = `
          SELECT COUNT(*) as total
          FROM feed.feed_conteudos c
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND c.categoria_fk = $1
            AND c.id NOT IN (${placeholders})
        `;

        queryParams = [categoriaId, ...topFeedIds, limit, offset];
        countParams = [categoriaId, ...topFeedIds];
      } else {
        // Se não houver top feeds, não precisa excluir nada
        query = `
          SELECT 
            c.id, 
            c.titulo, 
            c.resumo, 
            c.url_original, 
            c.url_imagem, 
            to_char(c.data_publicacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_publicacao,
            cat.nome as categoria_nome,
            cat.cor as categoria_cor,
            cat.icone as categoria_icone,
            f.nome as fonte_nome
          FROM feed.feed_conteudos c
          JOIN feed.feed_categorias cat ON c.categoria_fk = cat.id
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND c.categoria_fk = $1
          ORDER BY c.data_publicacao DESC
          LIMIT $2 OFFSET $3
        `;

        countQuery = `
          SELECT COUNT(*) as total
          FROM feed.feed_conteudos c
          JOIN feed.feed_fontes f ON c.fonte_fk = f.id
          WHERE c.ativo = true
            AND f.ativo = true
            AND f.status_coleta = 'OK'
            AND c.categoria_fk = $1
        `;

        queryParams = [categoriaId, limit, offset];
        countParams = [categoriaId];
      }

      const [result, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Transformar dados para garantir formato correto
      const data = result.rows.map(row => ({
        id: row.id,
        titulo: row.titulo,
        resumo: row.resumo || '',
        url_original: row.url_original,
        url_imagem: row.url_imagem || null,
        // data_publicacao vem como texto sem timezone (timestamp do banco),
        // para evitar "shift" de dia/ano por conversão UTC/local no browser.
        data_publicacao: row.data_publicacao || new Date().toISOString(),
        categoria_nome: row.categoria_nome,
        categoria_cor: row.categoria_cor || '#3B82F6',
        categoria_icone: row.categoria_icone || 'NewspaperIcon',
        fonte_nome: row.fonte_nome
      }));

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        categoria: {
          id: categoria.id,
          nome: categoria.nome,
          cor: categoria.cor,
          icone: categoria.icone
        }
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });

    } catch (queryError: any) {
      console.error('❌ [API Feed Categoria] Erro na query:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: queryError.message,
          details: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
        },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [API Feed Categoria] Erro ao conectar ao banco:', error);
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

