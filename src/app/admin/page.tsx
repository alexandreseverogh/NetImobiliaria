import { pool } from '@/lib/database/connection';
import Image from 'next/image';
import Link from 'next/link';
import * as HeroIcons from '@heroicons/react/24/outline';
import FeedCategoriasSection from '@/components/landpaging/FeedCategoriasSection';

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
    console.error('❌ [AdminDashboard] Erro ao buscar posts:', error);
    return [];
  }
}

// Componente de Ícone Dinâmico
const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
  const Icon = (HeroIcons as any)[iconName];
  return Icon ? <Icon className={className} /> : null;
};

export default async function AdminDashboard() {
  const posts = await getLatestFeedPosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4">
              Mercado Imobiliário
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 max-w-3xl mx-auto">
              Fique por dentro das últimas tendências, notícias e análises do setor imobiliário
            </p>
          </div>
        </div>
        
        {/* Decorative waves */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="relative block w-full h-12" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor" className="text-gray-50"></path>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Posts Grid */}
        {posts && posts.length > 0 ? (
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
                Últimas Notícias
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                As principais novidades do mercado imobiliário selecionadas para você
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {posts.map((post) => (
                <Link 
                  key={post.id} 
                  href={post.url_original} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 h-full transform hover:-translate-y-1"
                >
                  {/* Imagem */}
                  <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {post.url_imagem ? (
                      <Image
                        src={post.url_imagem}
                        alt={post.titulo}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <IconRenderer iconName={post.categoria_icone} className="w-20 h-20" />
                      </div>
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Badge Categoria */}
                    <div className="absolute top-4 left-4 z-10">
                      <span 
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg"
                        style={{ color: post.categoria_cor }}
                      >
                        <IconRenderer iconName={post.categoria_icone} className="w-4 h-4 mr-1.5" />
                        {post.categoria_nome}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-6 flex flex-col flex-grow">
                    {/* Metadados */}
                    <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                      <span className="font-semibold text-blue-600">{post.fonte_nome}</span>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.titulo}
                    </h3>

                    {/* Resumo */}
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                      {post.resumo.replace(/<[^>]*>?/gm, '')}
                    </p>

                    {/* Rodapé do Card */}
                    <div className="pt-4 mt-auto border-t border-gray-100 flex items-center text-blue-600 text-sm font-semibold group-hover:text-blue-700">
                      Ler na íntegra
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
              <IconRenderer iconName="NewspaperIcon" className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum conteúdo disponível</h3>
            <p className="text-gray-600">Os feeds serão exibidos aqui assim que estiverem disponíveis.</p>
          </div>
        )}

        {/* Seção de Categorias e Feeds Antigos */}
        <FeedCategoriasSection />
      </div>
    </div>
  );
}






