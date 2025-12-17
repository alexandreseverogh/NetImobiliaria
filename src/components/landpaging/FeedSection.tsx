import { pool } from '@/lib/database/connection';
import Image from 'next/image';
import Link from 'next/link';
import * as HeroIcons from '@heroicons/react/24/outline';
import FeedCategoriasSection from './FeedCategoriasSection';

export const revalidate = 0; // Forçar renderização dinâmica

// Função para buscar os posts mais recentes
async function getLatestFeedPosts() {
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
    ORDER BY c.data_publicacao DESC
    LIMIT 8
  `;
  
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ [FeedSection] Erro ao buscar posts:', error);
    return [];
  }
}

// Componente de Ícone Dinâmico
const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
  const Icon = (HeroIcons as any)[iconName];
  return Icon ? <Icon className={className} /> : null;
};

export default async function FeedSection() {
  const posts = await getLatestFeedPosts();

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-[2496px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Fique por Dentro do Mercado
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            As últimas notícias, tendências e análises do setor imobiliário selecionadas para você.
          </p>
        </div>

        {/* Grid de Posts (Desktop: 4 colunas, Mobile: Scroll Horizontal) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4 lg:pb-0 lg:overflow-visible snap-x snap-mandatory scrollbar-hide">
          
          {posts.map((post) => (
            <Link 
              key={post.id} 
              href={post.url_original} 
              target="_blank" 
              rel="noopener noreferrer"
              className="snap-center shrink-0 w-[85vw] sm:w-auto group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 h-full"
            >
              {/* Imagem */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                {post.url_imagem ? (
                  <Image
                    src={post.url_imagem}
                    alt={post.titulo}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <IconRenderer iconName={post.categoria_icone} className="w-16 h-16" />
                  </div>
                )}
                
                {/* Badge Categoria */}
                <div className="absolute top-3 left-3 z-10">
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
                    style={{ color: post.categoria_cor }}
                  >
                    <IconRenderer iconName={post.categoria_icone} className="w-3 h-3 mr-1" />
                    {post.categoria_nome}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-5 flex flex-col flex-grow">
                {/* Metadados */}
                <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                  <span className="font-medium text-blue-600">{post.fonte_nome}</span>
                  <span>•</span>
                  <time dateTime={post.data_publicacao.toISOString()}>
                    {new Date(post.data_publicacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>

                {/* Título */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {post.titulo}
                </h3>

                {/* Resumo */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                  {post.resumo.replace(/<[^>]*>?/gm, '') /* Remove HTML tags básico se houver */}
                </p>

                {/* Rodapé do Card */}
                <div className="pt-4 mt-auto border-t border-gray-50 flex items-center text-blue-600 text-sm font-medium">
                  Ler na íntegra
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

        </div>

        {/* Seção de Categorias e Feeds Antigos */}
        <FeedCategoriasSection />
      </div>
    </section>
  );
}
