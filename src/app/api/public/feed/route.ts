import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/connection';

export const dynamic = 'force-dynamic'; // Forçar não-cache

export async function GET() {
  // Palavras-chave relacionadas ao mercado imobiliário para filtro adicional
  // Usando uma única condição com múltiplas palavras-chave para melhor performance
  const realEstateKeywords = [
    'imóvel', 'imóveis', 'imobiliário', 'imobiliária', 'imobiliarias',
    'casa', 'casas', 'apartamento', 'apartamentos',
    'propriedade', 'propriedades',
    'aluguel', 'venda', 'compra', 'locação',
    'financiamento imobiliário', 'crédito imobiliário',
    'mercado imobiliário', 'setor imobiliário',
    'construção', 'construtoras', 'construtor',
    'investimento imobiliário', 'investimentos imobiliários',
    'tokenização imobiliária', 'tokenização',
    'proptech', 'prop tech',
    'real estate', 'realty',
    'selic', 'incc', 'ipca imóveis',
    'habitação', 'habitações',
    'condomínio', 'condomínios',
    'terreno', 'terrenos',
    'lote', 'lotes',
    'escritura', 'escrituras',
    'registro de imóveis',
    'iptu', 'itbi',
    'zoneamento', 'zoneamento urbano',
    'arquitetura', 'arquitetônico',
    'decoração', 'interiores',
    'reforma', 'reformas',
    'mobiliário', 'mobília'
  ];

  // Construir filtro SQL usando uma única condição com múltiplas palavras-chave
  // Isso é mais eficiente que múltiplos parâmetros
  const keywordPattern = realEstateKeywords.map(k => `%${k}%`).join('|');
  
  const query = `
    SELECT 
      c.id, 
      c.titulo, 
      c.resumo, 
      c.url_original, 
      c.url_imagem, 
      c.data_publicacao,
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
    ORDER BY c.data_publicacao DESC
    LIMIT 8
  `;
  
  // TEMPORARIAMENTE: Removendo filtro para debug - retornar todos os conteúdos ativos
  // TODO: Reativar filtro após verificar por que nenhum conteúdo passa
  const params: any[] = [];
  
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      
      // Transformar dados para garantir formato correto
      const data = result.rows.map(row => ({
        id: row.id,
        titulo: row.titulo,
        resumo: row.resumo || '',
        url_original: row.url_original,
        url_imagem: row.url_imagem || null,
        data_publicacao: row.data_publicacao ? new Date(row.data_publicacao).toISOString() : new Date().toISOString(),
        categoria_nome: row.categoria_nome,
        categoria_cor: row.categoria_cor || '#3B82F6',
        categoria_icone: row.categoria_icone || 'NewspaperIcon',
        fonte_nome: row.fonte_nome
      }));
      
      return NextResponse.json({ success: true, data });
    } catch (queryError: any) {
      console.error('❌ [API Feed] Erro na query:', queryError);
      console.error('❌ [API Feed] Stack:', queryError.stack);
      return NextResponse.json({ 
        success: false, 
        error: queryError.message,
        details: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
      }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [API Feed] Erro ao conectar ao banco:', error);
    console.error('❌ [API Feed] Stack:', error.stack);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}







