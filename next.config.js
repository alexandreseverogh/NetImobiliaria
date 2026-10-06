/** @type {import('next').NextConfig} */
// last-restart: 2026-10-06 — Prisma Client regenerado (campo mediaPool em
// OrganicRecurrenceSchedule, FASE 16.H) depois do dev server já estar de pé; singleton
// global de prisma.ts ficou preso na versão antiga do client até este restart limpo
// Configurações baseadas no ambiente (sem TypeScript)
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Timeout para geração de páginas estáticas (SSG) - evita timeout do build Docker
  // O builder tenta conectar ao banco durante SSG (o que é esperado e tratado como 404)
  staticPageGenerationTimeout: 180,

  // Output standalone para builds Docker otimizados
  output: 'standalone',

  // Configurações de imagens
  images: {
    remotePatterns: [
      // MinIO local (armazenamento de fotos de imóveis, ver src/lib/storage/s3-client.ts) —
      // sem isso, o otimizador de imagem do Next bloqueia silenciosamente qualquer foto vinda
      // de localhost:9000, deixando o card do imóvel com o espaço da imagem em branco (bug real
      // reportado: fotos existem de verdade no MinIO e carregam via curl, só o Next as recusava).
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
      },
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
    // Sem isso, src/instrumentation.ts NUNCA é carregado por esta versão do Next
    // (14.x — o flag só virou default/estável na 15). Confirmado direto no código-fonte
    // instalado (next/dist/server/config-shared.js: instrumentationHook default = false) e
    // por ausência total de log ("Agent Monitor iniciado...") em meses de histórico do
    // container netimobiliaria-app — o motor de sync/briefing automático de Campanhas
    // (agentMonitor.ts) nunca chegou a rodar, mesmo já implementado e correto. Essencial
    // tanto local (Docker e `npm run dev` direto) quanto na build de produção da VPS.
    instrumentationHook: true,
    missingSuspenseWithCSRBailout: false,
    // pdf-parse (baseado em pdf.js) e mammoth fazem require/import dinâmico interno que o
    // bundler do webpack do Next quebra ao tentar empacotar (erro real observado: "Object.
    // defineProperty called on non-object" — funcionava isolado via Node puro, só falhava
    // dentro da API route). Tratar como pacote externo faz o Next usar o require nativo do
    // Node em runtime em vez de tentar empacotar — padrão já documentado pra libs pdf.js em
    // Next.js. M4.3 RAG — import de PDF/DOCX na Base de Conhecimento.
    // google-ads-api → google-gax → @grpc/grpc-js dependem de módulos nativos do Node
    // (stream, net, tls, http2...) que não existem no runtime Edge. `instrumentation.ts`
    // (agentMonitor.ts) já checa `NEXT_RUNTIME !== 'nodejs'` e nunca EXECUTA esse caminho
    // no Edge — mas com instrumentationHook ativado (linha acima), o Next tenta EMPACOTAR
    // instrumentation.ts pros dois runtimes na build, e falha resolvendo 'stream' pro bundle
    // Edge antes mesmo de chegar a rodar o guard. Mesmo remédio já usado acima pra pdf-parse/
    // mammoth: tratar como pacote externo faz o Next usar require nativo do Node em runtime,
    // sem tentar empacotar — nunca chega a ser resolvido/executado no bundle Edge de qualquer
    // forma, então não tem custo real, só destrava a build.
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'google-ads-api', 'google-gax', '@grpc/grpc-js', '@grpc/proto-loader'],
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
  }),

  // Headers de segurança — sempre ativos (inclusive em dev, pra CSP Report-Only ser
  // observável durante o desenvolvimento, não só depois de já estar em produção).
  // Fase 1 do plano de hardening (docs/CHECKPOINT.md) — CSP em Report-Only: só loga
  // violação no console, nunca bloqueia nada. Inventário real de domínios externos
  // carregados pelo NAVEGADOR (não chamadas server-to-server, que não entram na CSP):
  // Meta Pixel (connect.facebook.net + www.facebook.com), YouTube embed E o script da
  // IFrame Player API em /artemis4 (www.youtube.com — carrega tanto o iframe quanto um
  // <script src> direto na página, achado real via captura ao vivo do report-uri, ver
  // CHECKPOINT), MinIO em dev (localhost:9000 — em produção vai via proxy Caddy
  // /storage/*, mesma origem). Os ~30 domínios de notícias em `images.remotePatterns`
  // acima são só pro otimizador de imagem do Next (server-side) — o navegador só vê
  // /_next/image, mesma origem, nunca precisam entrar aqui.
  //
  // 'unsafe-eval' em script-src é DEV-ONLY: o Next.js usa eval() internamente pro
  // source-map do Fast Refresh (webpack devtool 'eval-source-map', deixado automático
  // neste projeto — ver bloco `webpack:` mais abaixo). Build de produção não usa eval()
  // pra isso — confirmado via captura ao vivo: 81 das 83 violações reais observadas em
  // dev eram exatamente essa, nenhuma delas faz sentido incluir permanentemente.
  async headers() {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.youtube.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://www.facebook.com${isDevelopment ? ' http://localhost:9000 http://127.0.0.1:9000' : ''}`,
      "frame-src 'self' https://www.youtube.com",
      "connect-src 'self' https://www.facebook.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      // Reporta violação automaticamente pro nosso próprio endpoint — transforma
      // "observar por um tempo" em algo automático (logs do servidor), em vez de
      // depender de alguém abrir o DevTools e ficar olhando o Console manualmente.
      "report-uri /api/public/security/csp-report",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },

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
  webpack: (config, { dev, isServer, nextRuntime }) => {
    // Configurações específicas para produção
    if (!dev) {
      config.optimization.minimize = true
    }

    // instrumentationHook (acima) faz o Next tentar empacotar instrumentation.ts pros DOIS
    // runtimes (edge + nodejs), mesmo o código só EXECUTAR no nodejs (guard explícito em
    // instrumentation.ts: `if (process.env.NEXT_RUNTIME !== 'nodejs') return`) — confirmado
    // ao vivo: "Agent Monitor iniciado..." aparece certinho no boot do server nodejs, o erro
    // só surge depois, na tentativa (separada) de empacotar o bundle Edge do mesmo arquivo.
    // A árvore de dependências (agentMonitor.ts → GoogleAdsAdapter.ts → google-ads-api →
    // gaxios/google-auth-library/@grpc/grpc-js; e agentMonitor.ts → agentDecisor.ts →
    // llmInvoker.ts → llmClient.ts → @anthropic-ai/sdk, que tem um recurso de agent-toolset
    // usando `node:child_process`) usa módulos nativos do Node que não existem no Edge.
    // Duas classes de erro diferentes, cada uma pedindo o remédio certo:
    // (1) `require('modulo')` puro → resolve.fallback (fallback abaixo) resolve pra vazio.
    // (2) `import 'node:modulo'` (esquema de URI) → resolve.fallback NUNCA intercepta isso
    //     (o erro real é "UnhandledSchemeError", webpack rejeita o esquema `node:` ANTES de
    //     chegar a resolver o módulo — não é falta de fallback, é falta de handler pro
    //     esquema). Corrigido via `externals`: qualquer `node:xxx` vira um require externo
    //     puro (nunca empacotado) — não importa se seria resolvível no Edge de verdade,
    //     porque esse código nunca EXECUTA lá (o guard garante), só precisa sobreviver à
    //     build. `require('module').builtinModules` cobre a lista completa de nomes reais
    //     desta versão do Node, sem manutenção manual a cada novo pacote que aparecer.
    const builtins = require('module').builtinModules
    const externalizeNodeScheme = ({ request }, callback) => {
      if (request && builtins.includes(request.replace(/^node:/, '')) && request.startsWith('node:')) {
        return callback(null, `commonjs ${request}`)
      }
      callback()
    }
    config.externals = Array.isArray(config.externals)
      ? [...config.externals, externalizeNodeScheme]
      : config.externals
        ? [config.externals, externalizeNodeScheme]
        : [externalizeNodeScheme]

    if (nextRuntime === 'edge') {
      const fallback = { ...config.resolve.fallback }
      for (const name of builtins) {
        fallback[name] = false
      }
      config.resolve.fallback = fallback
    }

    // Deixar o Next.js gerenciar o devtool automaticamente
    // Isso evita conflitos com as configurações otimizadas do Next.js

    return config
  },

  // Configurações de redirecionamento
  async redirects() {
    return [
      // Redirecionar HTTP para HTTPS em produção (Middleware já faz isso dinamicamente)
    ]
  },

  // Configurações de reescrita (Rewrites)
  async rewrites() {
    return [
      {
        source: '/admin/finalidades-imoveis/:path*',
        destination: '/admin/finalidades/:path*',
      },
      {
        source: '/api/admin/finalidades-imoveis/:path*',
        destination: '/api/admin/finalidades/:path*',
      },
      {
        source: '/admin/status-imoveis/:path*',
        destination: '/admin/status-imovel/:path*',
      },
      {
        source: '/api/admin/status-imoveis/:path*',
        destination: '/api/admin/status-imovel/:path*',
      },
    ]
  },
}

module.exports = nextConfig

