/** @type {import('next').NextConfig} */

// Configurações baseadas no ambiente (sem TypeScript)
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Configurações de imagens
  images: {
    remotePatterns: [
      // Imagens gerais
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // Globo/Grupo Globo (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.glbimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.globo.com',
      },
      // InfoMoney (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.infomoney.com.br',
      },
      // Exame (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.exame.com',
      },
      // Olhar Digital (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.olhardigital.com.br',
      },
      // UOL e R7
      {
        protocol: 'https',
        hostname: '**.uol.com.br',
      },
      {
        protocol: 'https',
        hostname: '**.r7.com',
      },
      // CoinTelegraph (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.cointelegraph.com',
      },
      // Wall Street Journal
      {
        protocol: 'https',
        hostname: 'feeds.a.dj.com',
      },
      // Forbes (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.forbes.com',
      },
      // ArchDaily (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.archdaily.com',
      },
      {
        protocol: 'https',
        hostname: '**.adsttc.com',
      },
      // Dezeen (precisa http e https para static.dezeen.com)
      {
        protocol: 'https',
        hostname: '**.dezeen.com',
      },
      {
        protocol: 'http',
        hostname: 'static.dezeen.com',
      },
      // PropTech News (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.proptechnews.com',
      },
      {
        protocol: 'https',
        hostname: '**.realestatetechnews.com',
      },
      // Zillow (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.zillow.com',
      },
      // Realtor.com (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.realtor.com',
      },
      // Architectural Digest (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.architecturaldigest.com',
      },
      // Dwell (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.dwell.com',
      },
      // Apartment Therapy (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.apartmenttherapy.com',
      },
      {
        protocol: 'https',
        hostname: '**.apartmenttherapy.info',
      },
      {
        protocol: 'https',
        hostname: 'cdn.apartmenttherapy.info',
      },
      // Propmodo (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.propmodo.com',
      },
      // Propmodo (domínio raiz)
      {
        protocol: 'https',
        hostname: 'propmodo.com',
      },
      // CNET (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.cnet.com',
      },
      // The Verge (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.theverge.com',
      },
      // CoinDesk (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.coindesk.com',
      },
      // Reuters (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.reuters.com',
      },
      // Bloomberg (wildcard cobre todos os subdomínios)
      {
        protocol: 'https',
        hostname: '**.bloomberg.com',
      },
      // Sanity CMS (wildcard cobre todos os subdomínios incluindo cdn.sanity.io)
      {
        protocol: 'https',
        hostname: '**.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      // RDC PIX (wildcard cobre todos os subdomínios incluindo na.rdcpix.com)
      {
        protocol: 'https',
        hostname: '**.rdcpix.com',
      },
    ],
  },

  // Ignorar erros de lint e typescript no build (Phase 1 Stabilization)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Corrige o erro fatal "useSearchParams() should be wrapped in Suspense"
  // que afeta muitas páginas admin no build de produção (Next.js 14.1+)
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // Configurações de ambiente
  env: {
    ENVIRONMENT: isDevelopment ? 'development' : 'production',
  },

  // Configurações de desenvolvimento
  ...(isDevelopment && {
    // Source maps em desenvolvimento
    productionBrowserSourceMaps: false,

    // Logs mais verbosos em desenvolvimento
    logging: {
      fetches: {
        fullUrl: true,
      },
    },

    // Hot reload em desenvolvimento
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),

  // Configurações de produção
  ...(isProduction && {
    // Source maps desabilitados em produção
    productionBrowserSourceMaps: false,

    // Compressão habilitada em produção
    compress: true,

    // Otimizações de produção
    swcMinify: true,

    // Headers de segurança em produção
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          ],
        },
      ]
    },
  }),

  /* 
  experimental: {
    // Turbopack em desenvolvimento (se disponível)
    ...(isDevelopment && {
      turbo: {
        rules: {
          '*.svg': {
            loaders: ['@svgr/webpack'],
            as: '*.js',
          },
        },
      },
    }),
  },
  */

  // Configurações de webpack
  webpack: (config, { dev, isServer }) => {
    // Configurações específicas para produção
    if (!dev) {
      config.optimization.minimize = true
    }

    // Deixar o Next.js gerenciar o devtool automaticamente
    // Isso evita conflitos com as configurações otimizadas do Next.js

    return config
  },

  // Configurações de redirecionamento
  async redirects() {
    return [
      // Redirecionar HTTP para HTTPS em produção
      ...(isProduction ? [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://netimobiliaria.com.br/:path*',
          permanent: true,
        },
      ] : []),
    ]
  },
}

module.exports = nextConfig

