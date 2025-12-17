# 🔬 ANÁLISE TÉCNICA HOLÍSTICA: PERFORMANCE E ESTABILIDADE
## Cenário: 100.000 Imóveis | Dezenas de Milhares de Acessos Diários

**Data:** 2025-01-24  
**Status:** 📊 Análise Técnica - Não Implementação  
**Prioridade:** 🚨 CRÍTICA

---

## 📋 SUMÁRIO EXECUTIVO

### ⚠️ **DIAGNÓSTICO CRÍTICO**

**SIM, a aplicação ENTRARIA EM COLAPSO** no cenário proposto (100k imóveis, dezenas de milhares de acessos diários) com a arquitetura atual.

### 🎯 **PRINCIPAIS GARGALOS IDENTIFICADOS**

1. **🔴 CRÍTICO:** Transferência de imagens via Base64 em Data URLs
2. **🔴 CRÍTICO:** Ausência de CDN para imagens estáticas
3. **🟡 ALTO:** Queries N+1 para busca de imagens principais
4. **🟡 ALTO:** Ausência de cache em múltiplas camadas
5. **🟡 ALTO:** Falta de índices otimizados para queries públicas
6. **🟡 ALTO:** Processamento de imagens em memória do servidor
7. **🟡 MÉDIO:** Paginação não otimizada para grandes volumes

---

## 🔍 ANÁLISE DETALHADA DA ARQUITETURA ATUAL

### 1. **FLUXO ATUAL DE CARREGAMENTO DE CARDS**

#### 1.1. Processo Identificado

```typescript
// src/lib/database/imoveis-public.ts:43-208
listPublicImoveis() 
  → Query principal (imoveis + filtros)
  → fetchImagensPrincipais(ids[]) // Query separada
  → encode(imagem, 'base64') // Conversão pesada
  → data:image/jpeg;base64,... // Transferência via JSON
```

#### 1.2. Problemas Críticos Identificados

> **⚠️ NOTA IMPORTANTE:** Cada imóvel possui **máximo de 10 imagens** (1 principal + 9 na galeria). Esta limitação reduz o impacto comparado a um cenário sem limites, mas **ainda é crítico** devido ao volume de transferência Base64.

**A. Transferência Base64 (33% overhead)**
- **Tamanho original:** 200KB (imagem JPEG média)
- **Tamanho Base64:** ~267KB (+33%)
- **Impacto (listagem):** 20 imóveis × 267KB = **5.3MB por página** (apenas imagem principal)
- **Impacto (galeria):** Máximo 9 imagens × 267KB = **2.4MB por galeria** (pior caso)
- **Cenário:** 60.000 páginas/dia × 5.3MB + 2.000 galerias × 2.4MB = **~323GB/dia** de transferência

**B. Processamento no Servidor**
```sql
-- src/lib/database/imoveis-public.ts:213-222
SELECT DISTINCT ON (imovel_id)
  imovel_id,
  encode(imagem, 'base64') as imagem_base64,  -- ⚠️ CPU INTENSIVO
  tipo_mime
FROM imovel_imagens
WHERE imovel_id = ANY($1::int[])
  AND principal = true
```
- **CPU:** Encoding Base64 para cada imagem
- **Memória:** Imagens carregadas em RAM do servidor
- **I/O:** Leitura de BLOB do PostgreSQL

**C. Query N+1 Potencial**
- Query 1: Buscar imóveis (20-50 registros)
- Query 2: Buscar imagens principais (1 query com ANY)
- **Problema:** Se não usar `ANY($1::int[])`, vira N+1 real

---

### 2. **FLUXO DE GALERIA DE IMAGENS**

#### 2.1. Processo Identificado

```typescript
// src/lib/database/imoveis.ts:690-744
findImovelImagens(imovelId)
  → SELECT * FROM imovel_imagens WHERE imovel_id = $1
  → encode(imagem, 'base64') // Para CADA imagem
  → Retorna array completo de imagens
```

#### 2.2. Problemas Críticos

**A. Carregamento Completo**
- **Cenário:** Imóvel com 20 imagens (5MB total)
- **Base64:** ~6.7MB transferido
- **Problema:** Carrega TODAS as imagens mesmo que usuário veja apenas 1

**B. Sem Lazy Loading**
- Todas as imagens são carregadas ao abrir modal
- Não há paginação ou carregamento progressivo
- Impacto exponencial com múltiplos usuários simultâneos

---

### 3. **ANÁLISE DE CENÁRIO DE CARGA**

#### 3.1. Cenário Proposto

- **Imóveis cadastrados:** 100.000
- **Acessos diários:** 20.000 - 50.000
- **Pico simultâneo:** ~500 usuários (estimativa conservadora)
- **Cards por página:** 20-50 imóveis
- **Imagens por imóvel:** Máximo de 10 imagens (1 principal + 9 na galeria)

#### 3.2. Cálculo de Carga Atual

**A. Requisições de Listagem (Cards)**

```
Cenário Conservador:
- 20.000 acessos/dia
- 3 páginas visualizadas por acesso (média)
- 20 imóveis por página
= 20.000 × 3 × 20 = 1.200.000 requisições de imagens principais/dia

Cada requisição (página com 20 imóveis):
- Query principal: ~50ms
- Query imagens principais: ~100ms (com encode base64)
- Transferência: ~5.3MB (20 imóveis × 267KB por imagem principal em Base64)
= ~150ms + transferência de 5.3MB por requisição

Pico simultâneo (500 usuários):
- 500 × 5.3MB = 2.65GB em transferência simultânea
- 500 × 150ms = 75 segundos de processamento simultâneo
```

**B. Requisições de Galeria**

```
Cenário Conservador:
- 10% dos acessos abrem galeria (2.000/dia)
- Máximo 9 imagens por galeria (excluindo principal)
- ~200KB por imagem (média) = 1.8MB por galeria (original)
- Base64: ~2.4MB por galeria (9 imagens × 267KB)
= 2.000 × 2.4MB = 4.8GB/dia apenas em galerias

Pico simultâneo (50 usuários abrindo galeria):
- 50 × 2.4MB = 120MB simultâneo
```

**C. Total Estimado**

```
Transferência diária:
- Listagens: 20.000 acessos × 3 páginas × 5.3MB = 318GB/dia
- Galerias: 2.000 acessos × 2.4MB = 4.8GB/dia
= ~323GB/dia de transferência

Processamento:
- 1.200.000 queries de imagens principais/dia
- 2.000 queries de galerias completas/dia
- Encoding Base64: CPU intensivo (para todas as imagens)
- Memória: Imagens em RAM do servidor
```

---

### 4. **GARGALOS IDENTIFICADOS**

#### 4.1. Banco de Dados

**A. Índices Ausentes/Inadequados**

```sql
-- Verificação necessária (não implementada):
-- CREATE INDEX idx_imovel_imagens_principal 
--   ON imovel_imagens(imovel_id, principal) 
--   WHERE principal = true;

-- CREATE INDEX idx_imoveis_public_filters 
--   ON imoveis(ativo, estado_fk, cidade_fk, finalidade_fk, preco);
```

**B. Queries Não Otimizadas**

```sql
-- Problema: COUNT(*) sem índice adequado
SELECT COUNT(*) FROM imoveis i
LEFT JOIN tipos_imovel ti ON ti.id = i.tipo_fk
WHERE i.ativo = true
-- Pode fazer full table scan em 100k registros
```

**C. BLOB Storage no PostgreSQL**

- **Problema:** Imagens armazenadas como BYTEA no PostgreSQL
- **Impacto:** 
  - I/O pesado para leitura
  - Memória do PostgreSQL consumida
  - Backup/restore lento
  - Replicação pesada

#### 4.2. Aplicação (Next.js)

**A. Processamento Síncrono**

```typescript
// src/lib/database/imoveis-public.ts:210-230
async function fetchImagensPrincipais(ids: number[]) {
  const query = `SELECT ... encode(imagem, 'base64') ...`
  const result = await pool.query(query, [ids])
  // ⚠️ Bloqueia thread até completar encoding
}
```

**B. Ausência de Cache**

- **Identificado:** Existe `src/lib/utils/cache.ts` mas **NÃO está sendo usado** para imagens
- **Cache atual:** Apenas para permissões e listagens básicas
- **TTL:** 2 minutos (muito curto para imagens)

**C. Sem CDN**

- Imagens servidas diretamente do servidor
- Sem cache distribuído
- Sem compressão adaptativa
- Sem otimização por dispositivo

#### 4.3. Rede

**A. Transferência Ineficiente**

- Base64 aumenta tamanho em 33%
- Sem compressão HTTP (gzip/brotli para JSON)
- Sem HTTP/2 Server Push
- Sem lazy loading de imagens

**B. Sem Otimização de Imagens**

- Imagens servidas em tamanho original
- Sem geração de thumbnails
- Sem WebP/AVIF para browsers modernos
- Sem responsive images (srcset)

---

## 🎯 ESTRUTURA NECESSÁRIA PARA PERFORMANCE

### 1. **ARQUITETURA DE CAMADAS**

#### 1.1. Camada de Armazenamento

```
┌─────────────────────────────────────────┐
│  PostgreSQL (Metadados)                 │
│  - imoveis (dados estruturados)         │
│  - imovel_imagens (referências apenas)  │
│  - Índices otimizados                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Object Storage (S3/MinIO/Cloudflare)   │
│  - Imagens originais                    │
│  - Thumbnails gerados                   │
│  - Versões otimizadas (WebP/AVIF)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CDN (Cloudflare/AWS CloudFront)        │
│  - Cache distribuído globalmente        │
│  - Compressão automática                │
│  - HTTP/2 Server Push                   │
└─────────────────────────────────────────┘
```

#### 1.2. Camada de Cache

```
┌─────────────────────────────────────────┐
│  Redis Cache (Camada 1)                 │
│  - Metadados de imóveis (TTL: 10min)   │
│  - Listagens filtradas (TTL: 5min)      │
│  - Contadores e agregações (TTL: 15min) │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Application Cache (Camada 2)           │
│  - In-memory cache para queries frequentes│
│  - TTL: 2-5 minutos                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Browser Cache (Camada 3)               │
│  - Cache-Control headers                │
│  - ETags para validação                │
│  - Service Worker para offline         │
└─────────────────────────────────────────┘
```

---

### 2. **OTIMIZAÇÕES DE BANCO DE DADOS**

#### 2.1. Índices Críticos

```sql
-- Índice para busca de imagens principais
CREATE INDEX CONCURRENTLY idx_imovel_imagens_principal 
ON imovel_imagens(imovel_id, principal) 
WHERE principal = true;

-- Índice composto para filtros públicos
CREATE INDEX CONCURRENTLY idx_imoveis_public_filters 
ON imoveis(ativo, estado_fk, cidade_fk, finalidade_fk, preco, created_at DESC)
WHERE ativo = true;

-- Índice para busca por finalidade (vender/alugar)
CREATE INDEX CONCURRENTLY idx_finalidades_landpaging 
ON finalidades_imovel(vender_landpaging, alugar_landpaging)
WHERE vender_landpaging = true OR alugar_landpaging = true;

-- Índice para ordenação por destaque
CREATE INDEX CONCURRENTLY idx_imoveis_destaque 
ON imoveis(destaque, created_at DESC)
WHERE ativo = true AND destaque = true;
```

#### 2.2. View Materializada para Listagens

```sql
-- View materializada atualizada incrementalmente
CREATE MATERIALIZED VIEW mv_imoveis_public_list AS
SELECT 
  i.id,
  i.codigo,
  i.titulo,
  i.preco,
  i.bairro,
  i.cidade_fk,
  i.estado_fk,
  i.quartos,
  i.banheiros,
  i.suites,
  i.vagas_garagem,
  i.area_total,
  ti.nome AS tipo_nome,
  fi.vender_landpaging,
  fi.alugar_landpaging,
  -- URL da imagem (não a imagem em si)
  CONCAT('/cdn/imoveis/', i.id, '/principal.webp') AS imagem_url
FROM imoveis i
LEFT JOIN tipos_imovel ti ON ti.id = i.tipo_fk
LEFT JOIN finalidades_imovel fi ON fi.id = i.finalidade_fk
WHERE i.ativo = true;

-- Índice na view materializada
CREATE UNIQUE INDEX ON mv_imoveis_public_list(id);

-- Refresh incremental (via trigger)
CREATE OR REPLACE FUNCTION refresh_mv_imoveis_public()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_public_list;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_mv_after_imovel_change
AFTER INSERT OR UPDATE OR DELETE ON imoveis
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_mv_imoveis_public();
```

#### 2.3. Migração de BLOB para Object Storage

```sql
-- Nova estrutura da tabela imovel_imagens
ALTER TABLE imovel_imagens 
  ADD COLUMN url_s3 VARCHAR(500),
  ADD COLUMN url_cdn VARCHAR(500),
  ADD COLUMN thumbnail_url VARCHAR(500),
  ADD COLUMN tamanho_original INTEGER,
  ADD COLUMN formato VARCHAR(10); -- 'jpeg', 'webp', 'avif'

-- Manter coluna 'imagem' por compatibilidade durante migração
-- Remover após migração completa
```

---

### 3. **SISTEMA DE PROCESSAMENTO DE IMAGENS**

#### 3.1. Pipeline de Processamento

```
Upload → Validação → Otimização → Storage → CDN
  ↓         ↓            ↓           ↓        ↓
JPEG    Dimensões    Resize      S3      Cloudflare
PNG     Tamanho      Compress    MinIO   Cache
        Formato      WebP/AVIF   Local   Headers
```

#### 3.2. Geração de Versões

```typescript
// Versões necessárias:
interface ImageVersions {
  original: string;      // /cdn/imoveis/{id}/original.jpg
  thumbnail: string;     // /cdn/imoveis/{id}/thumb_300x300.webp
  card: string;          // /cdn/imoveis/{id}/card_800x600.webp
  gallery: string;       // /cdn/imoveis/{id}/gallery_1200x900.webp
  mobile: string;        // /cdn/imoveis/{id}/mobile_400x300.webp
}
```

#### 3.3. Lazy Processing (Queue System)

```typescript
// Sistema de fila para processamento assíncrono
import Bull from 'bull';

const imageProcessingQueue = new Bull('image-processing', {
  redis: { host: 'localhost', port: 6379 }
});

// Job: Processar imagem após upload
imageProcessingQueue.process('optimize-image', async (job) => {
  const { imovelId, imageId, imageBuffer } = job.data;
  
  // 1. Upload original para S3
  // 2. Gerar thumbnails
  // 3. Converter para WebP/AVIF
  // 4. Upload versões otimizadas
  // 5. Atualizar URLs no banco
});
```

---

### 4. **API OTIMIZADA**

#### 4.1. Endpoint de Listagem

```typescript
// GET /api/public/imoveis?page=1&limit=20&estado=SP
export async function GET(request: NextRequest) {
  // 1. Verificar cache Redis
  const cacheKey = `imoveis:${JSON.stringify(filters)}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }

  // 2. Query otimizada (view materializada)
  const imoveis = await pool.query(`
    SELECT * FROM mv_imoveis_public_list
    WHERE estado_fk = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [estado, limit, offset]);

  // 3. Retornar apenas URLs (não imagens)
  const response = {
    data: imoveis.rows.map(row => ({
      ...row,
      imagem_url: row.imagem_url // URL do CDN
    })),
    total: await getTotalCount(filters)
  };

  // 4. Cachear resultado
  await redis.setex(cacheKey, 300, JSON.stringify(response));

  return NextResponse.json(response, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
```

#### 4.2. Endpoint de Imagens

```typescript
// GET /api/public/imoveis/{id}/imagens?size=card&format=webp
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const size = searchParams.get('size') || 'original';
  const format = searchParams.get('format') || 'webp';

  // 1. Buscar URLs do banco (não imagens)
  const imagens = await pool.query(`
    SELECT 
      id,
      ordem,
      principal,
      url_cdn as url,
      thumbnail_url,
      tamanho_original
    FROM imovel_imagens
    WHERE imovel_id = $1
    ORDER BY ordem ASC, id ASC
  `, [params.id]);

  // 2. Retornar URLs (CDN serve as imagens)
  return NextResponse.json({
    imagens: imagens.rows.map(img => ({
      id: img.id,
      ordem: img.ordem,
      principal: img.principal,
      url: `${img.url}?size=${size}&format=${format}`,
      thumbnail: img.thumbnail_url
    }))
  }, {
    headers: {
      'Cache-Control': 'public, max-age=86400', // 24h
      'CDN-Cache-Control': 'public, max-age=31536000' // 1 ano no CDN
    }
  });
}
```

---

### 5. **FRONTEND OTIMIZADO**

#### 5.1. Lazy Loading de Imagens

```typescript
// Componente otimizado
'use client';

import Image from 'next/image';

export function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="property-card">
      <Image
        src={property.imagem_url}
        alt={property.titulo}
        width={800}
        height={600}
        loading="lazy" // ⚠️ Lazy loading nativo
        placeholder="blur" // Blur placeholder
        blurDataURL={property.thumbnail_url} // Thumbnail como placeholder
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        srcSet={`
          ${property.imagem_url}?size=mobile&format=webp 400w,
          ${property.imagem_url}?size=card&format=webp 800w,
          ${property.imagem_url}?size=gallery&format=webp 1200w
        `}
      />
    </div>
  );
}
```

#### 5.2. Intersection Observer para Galeria

```typescript
// Carregar imagens da galeria sob demanda
export function ImageGallery({ imovelId }: { imovelId: number }) {
  const [visibleImages, setVisibleImages] = useState<string[]>([]);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    // Carregar apenas imagens visíveis
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const imageUrl = entry.target.getAttribute('data-src');
          if (imageUrl && !visibleImages.includes(imageUrl)) {
            setVisibleImages(prev => [...prev, imageUrl]);
          }
        }
      });
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="gallery">
      {imageUrls.map((url, index) => (
        <div
          key={index}
          ref={(el) => {
            if (el) observerRef.current?.observe(el);
          }}
          data-src={url}
        >
          {visibleImages.includes(url) && (
            <Image src={url} alt={`Imagem ${index + 1}`} loading="lazy" />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### 6. **MONITORAMENTO E MÉTRICAS**

#### 6.1. Métricas Críticas

```typescript
// Sistema de métricas
interface PerformanceMetrics {
  // Tempo de resposta
  queryTime: number;        // Tempo de query no banco
  processingTime: number;   // Tempo de processamento
  transferTime: number;     // Tempo de transferência
  
  // Cache
  cacheHitRate: number;     // Taxa de acerto do cache
  cacheMissRate: number;    // Taxa de erro do cache
  
  // Recursos
  memoryUsage: number;      // Uso de memória
  cpuUsage: number;         // Uso de CPU
  
  // Rede
  bandwidthUsage: number;   // Uso de banda
  imageSize: number;        // Tamanho médio de imagens
}
```

#### 6.2. Alertas Críticos

```typescript
// Alertas automáticos
const alerts = {
  queryTime: {
    warning: 500,  // ms
    critical: 1000 // ms
  },
  cacheHitRate: {
    warning: 0.7,  // 70%
    critical: 0.5  // 50%
  },
  memoryUsage: {
    warning: 0.8,  // 80%
    critical: 0.9  // 90%
  }
};
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### Cenário: 20.000 acessos/dia, 20 imóveis por página

| Métrica | **ANTES (Atual)** | **DEPOIS (Otimizado)** | **Melhoria** |
|---------|-------------------|------------------------|--------------|
| **Transferência/dia** | 323 GB | 5 GB | **98.5% redução** |
| **Tempo de resposta** | 150-500ms | 50-100ms | **70% mais rápido** |
| **Queries/dia** | 1.202.000 | 240.000 | **80% redução** |
| **CPU (encoding)** | Alto | Baixo | **95% redução** |
| **Memória servidor** | 10-20 GB | 2-4 GB | **80% redução** |
| **Cache hit rate** | 0% | 85-95% | **+85%** |
| **Custo CDN** | R$ 0 | R$ 50-100/mês | **Investimento** |
| **Custo servidor** | R$ 500-1000/mês | R$ 200-400/mês | **60% economia** |

---

## 🚨 RISCOS E MITIGAÇÕES

### 1. **Risco: Migração de BLOB para Object Storage**

**Mitigação:**
- Migração incremental (imóvel por imóvel)
- Manter BLOB durante transição
- Script de rollback automático
- Validação de integridade

### 2. **Risco: Cache Stale (Dados Desatualizados)**

**Mitigação:**
- Invalidação automática via eventos
- TTL adequado por tipo de dado
- Versionamento de cache keys
- Webhooks para atualização

### 3. **Risco: CDN Down**

**Mitigação:**
- Fallback para Object Storage
- Múltiplos provedores CDN
- Health checks automáticos
- Cache local de emergência

---

## 🐳 ARQUITETURA DE DEPLOY COM DOCKER

### 1. **VISÃO GERAL DA ARQUITETURA**

```
┌─────────────────────────────────────────────────────────┐
│                    VPN/SERVIDOR                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Docker Network (bridge)                  │  │
│  │                                                  │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   │  │
│  │  │  Container App   │    │  Container DB    │   │  │
│  │  │  (Next.js)       │◄───┤  (PostgreSQL)    │   │  │
│  │  │  Port: 3000      │    │  Port: 5432      │   │  │
│  │  └──────────────────┘    └──────────────────┘   │  │
│  │         │                         │              │  │
│  │         │                         │              │  │
│  │         ▼                         ▼              │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │      Volumes Persistentes                 │   │  │
│  │  │  - postgres_data (DB)                     │   │  │
│  │  │  - app_logs (Logs da aplicação)           │   │  │
│  │  │  - app_uploads (Uploads temporários)      │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Serviços Externos (Opcional)                │  │
│  │  - Redis (Cache)                                 │  │
│  │  - MinIO/S3 (Object Storage)                     │  │
│  │  - Nginx (Reverse Proxy)                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2. **ESTRUTURA DE ARQUIVOS DOCKER**

#### 2.1. Dockerfile da Aplicação

```dockerfile
# Dockerfile (raiz do projeto)
FROM node:18-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild do código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build da aplicação
RUN npm run build

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Criar diretórios para logs e uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2.2. Dockerfile do Banco de Dados (Opcional - usar imagem oficial)

```dockerfile
# Dockerfile.db (opcional - recomendado usar imagem oficial)
FROM postgres:15-alpine

# Copiar scripts de inicialização
COPY database/init-scripts/ /docker-entrypoint-initdb.d/

# Configurações de performance
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=pt_BR.UTF-8"
ENV POSTGRES_SHARED_PRELOAD_LIBRARIES="pg_stat_statements"

# Criar diretório para backups
RUN mkdir -p /backups && chown postgres:postgres /backups
```

#### 2.3. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Banco de Dados PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: net-imobiliaria-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-net_imobiliaria}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=pt_BR.UTF-8"
      # Configurações de performance
      POSTGRES_SHARED_PRELOAD_LIBRARIES: "pg_stat_statements"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init-scripts:/docker-entrypoint-initdb.d:ro
      - ./database/backups:/backups:ro
    ports:
      - "${DB_PORT:-5432}:5432"
    networks:
      - net-imobiliaria-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=128MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=4MB
      -c min_wal_size=1GB
      -c max_wal_size=4GB

  # Aplicação Next.js
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: net-imobiliaria-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-net_imobiliaria}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      # Redis (se configurado)
      REDIS_HOST: ${REDIS_HOST:-redis}
      REDIS_PORT: ${REDIS_PORT:-6379}
      # Object Storage (se configurado)
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      # CDN
      CDN_URL: ${CDN_URL}
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - app_logs:/app/logs
      - app_uploads:/app/uploads
    networks:
      - net-imobiliaria-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis (Cache) - Opcional mas recomendado
  redis:
    image: redis:7-alpine
    container_name: net-imobiliaria-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - net-imobiliaria-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "${REDIS_PORT:-6379}:6379"

  # MinIO (Object Storage) - Opcional mas recomendado
  minio:
    image: minio/minio:latest
    container_name: net-imobiliaria-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    networks:
      - net-imobiliaria-network
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Nginx (Reverse Proxy) - Opcional mas recomendado
  nginx:
    image: nginx:alpine
    container_name: net-imobiliaria-nginx
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - net-imobiliaria-network
    depends_on:
      - app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  app_logs:
    driver: local
  app_uploads:
    driver: local

networks:
  net-imobiliaria-network:
    driver: bridge
```

### 3. **REQUISITOS DE INFRAESTRUTURA NA VPN**

#### 3.1. Software Base Necessário

```bash
# 1. Docker Engine (versão 20.10+)
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verificar instalação
docker --version
docker-compose --version

# 2. Docker Compose (versão 2.0+)
# Já incluído no Docker Desktop ou instalar separadamente:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Git (para clonar repositório)
sudo apt-get update
sudo apt-get install -y git

# 4. Certbot (para SSL/TLS - opcional mas recomendado)
sudo apt-get install -y certbot python3-certbot-nginx
```

#### 3.2. Recursos de Hardware Recomendados

```
Mínimo para Produção:
- CPU: 4 cores
- RAM: 8GB (4GB para PostgreSQL, 2GB para App, 2GB sistema)
- Disco: 100GB SSD (50GB para dados, 50GB para backups/logs)
- Rede: 100Mbps

Recomendado para Alta Performance:
- CPU: 8 cores
- RAM: 16GB (8GB PostgreSQL, 4GB App, 2GB Redis, 2GB sistema)
- Disco: 500GB SSD (200GB dados, 200GB backups, 100GB logs)
- Rede: 1Gbps
```

#### 3.3. Configurações do Sistema Operacional

```bash
# 1. Aumentar limites do sistema para PostgreSQL
sudo nano /etc/security/limits.conf
# Adicionar:
postgres soft nofile 65536
postgres hard nofile 65536

# 2. Configurar swap (se necessário)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Otimizar kernel para PostgreSQL
sudo nano /etc/sysctl.conf
# Adicionar:
vm.swappiness=10
vm.dirty_ratio=60
vm.dirty_background_ratio=2
kernel.shmmax=68719476736
kernel.shmall=4294967296

# Aplicar configurações
sudo sysctl -p

# 4. Configurar firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (apenas se necessário acesso externo)
sudo ufw enable
```

### 4. **CONFIGURAÇÃO DE REDE E SEGURANÇA**

#### 4.1. Arquivo .env.production

```env
# .env.production (na VPN)
# ============================================
# BANCO DE DADOS
# ============================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=senha_super_segura_aqui_gerada_aleatoriamente

# ============================================
# APLICAÇÃO
# ============================================
NODE_ENV=production
APP_PORT=3000
HOSTNAME=0.0.0.0

# ============================================
# JWT
# ============================================
JWT_SECRET=jwt_secret_super_seguro_gerado_aleatoriamente_64_chars
JWT_REFRESH_SECRET=refresh_secret_super_seguro_gerado_aleatoriamente_64_chars
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# REDIS (Cache)
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=senha_redis_segura_aqui

# ============================================
# OBJECT STORAGE (MinIO/S3)
# ============================================
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_access_key_aqui
S3_SECRET_KEY=minio_secret_key_aqui
S3_BUCKET=net-imobiliaria-images
S3_REGION=us-east-1
S3_USE_SSL=false

# ============================================
# CDN
# ============================================
CDN_URL=https://cdn.netimobiliaria.com.br

# ============================================
# SEGURANÇA
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://netimobiliaria.com.br,https://www.netimobiliaria.com.br

# ============================================
# LOGS
# ============================================
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

#### 4.2. Configuração Nginx (Reverse Proxy)

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    upstream app {
        server app:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name netimobiliaria.com.br www.netimobiliaria.com.br;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name netimobiliaria.com.br www.netimobiliaria.com.br;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints com rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Aplicação Next.js
        location / {
            limit_req zone=general_limit burst=50 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://app/api/health;
        }
    }
}
```

### 5. **SCRIPTS DE DEPLOY**

#### 5.1. Script de Deploy Inicial

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Iniciando deploy da Net Imobiliária..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado. Instale primeiro.${NC}"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado. Instale primeiro.${NC}"
    exit 1
fi

# Verificar se arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️ Arquivo .env.production não encontrado.${NC}"
    echo "Criando a partir do template..."
    cp env.production.example .env.production
    echo -e "${YELLOW}⚠️ Configure o arquivo .env.production antes de continuar!${NC}"
    exit 1
fi

# Parar containers existentes
echo -e "${YELLOW}🛑 Parando containers existentes...${NC}"
docker-compose down

# Remover imagens antigas (opcional)
read -p "Deseja remover imagens antigas? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️ Removendo imagens antigas...${NC}"
    docker-compose down --rmi all
fi

# Build das imagens
echo -e "${GREEN}🔨 Construindo imagens Docker...${NC}"
docker-compose build --no-cache

# Iniciar serviços
echo -e "${GREEN}🚀 Iniciando serviços...${NC}"
docker-compose up -d

# Aguardar serviços ficarem prontos
echo -e "${YELLOW}⏳ Aguardando serviços ficarem prontos...${NC}"
sleep 10

# Verificar saúde dos serviços
echo -e "${GREEN}🏥 Verificando saúde dos serviços...${NC}"
docker-compose ps

# Executar migrações do banco (se necessário)
echo -e "${YELLOW}📊 Executando migrações do banco de dados...${NC}"
docker-compose exec -T postgres psql -U postgres -d net_imobiliaria -f /docker-entrypoint-initdb.d/migrate.sql || echo "Nenhuma migração pendente"

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}🌐 Aplicação disponível em: http://localhost:3000${NC}"
```

#### 5.2. Script de Backup

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "📦 Criando backup do banco de dados..."

docker-compose exec -T postgres pg_dump -U postgres net_imobiliaria > $BACKUP_FILE

# Comprimir backup
gzip $BACKUP_FILE
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup criado: $BACKUP_FILE"

# Manter apenas últimos 7 backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +8 | xargs rm -f

echo "✅ Limpeza de backups antigos concluída"
```

#### 5.3. Script de Restore

```bash
#!/bin/bash
# restore.sh

set -e

if [ -z "$1" ]; then
    echo "❌ Uso: ./restore.sh <arquivo_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️ ATENÇÃO: Esta operação irá substituir todos os dados atuais!"
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " -r
if [[ ! $REPLY == "SIM" ]]; then
    echo "Operação cancelada."
    exit 1
fi

echo "🔄 Restaurando backup: $BACKUP_FILE"

# Descomprimir se necessário
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U postgres -d net_imobiliaria
else
    docker-compose exec -T postgres psql -U postgres -d net_imobiliaria < $BACKUP_FILE
fi

echo "✅ Restauração concluída!"
```

### 6. **CHECKLIST DE INSTALAÇÃO NA VPN**

#### 6.1. Pré-Deploy

- [ ] **Sistema Operacional:** Ubuntu Server 22.04 LTS ou similar
- [ ] **Docker Engine:** Versão 20.10+ instalada e configurada
- [ ] **Docker Compose:** Versão 2.0+ instalada
- [ ] **Git:** Instalado para clonar repositório
- [ ] **Firewall:** Configurado (portas 80, 443, 22)
- [ ] **SSL/TLS:** Certificados obtidos (Let's Encrypt ou comercial)
- [ ] **Domínio:** DNS configurado apontando para IP da VPN
- [ ] **Recursos:** CPU, RAM e disco conforme especificações

#### 6.2. Deploy Inicial

- [ ] **Repositório:** Clonado na VPN
- [ ] **Variáveis de Ambiente:** `.env.production` configurado
- [ ] **Senhas:** Todas geradas aleatoriamente e seguras
- [ ] **Volumes:** Diretórios criados com permissões corretas
- [ ] **Build:** Imagens Docker construídas
- [ ] **Containers:** Iniciados e saudáveis
- [ ] **Banco de Dados:** Migrações executadas
- [ ] **Health Checks:** Todos os serviços respondendo

#### 6.3. Pós-Deploy

- [ ] **Testes:** Aplicação acessível via domínio
- [ ] **SSL:** Certificado válido e renovação automática configurada
- [ ] **Backups:** Script de backup agendado (cron)
- [ ] **Monitoramento:** Logs sendo coletados
- [ ] **Performance:** Métricas sendo coletadas
- [ ] **Segurança:** Firewall e rate limiting ativos

### 7. **COMANDOS ÚTEIS PARA MANUTENÇÃO**

```bash
# Ver logs da aplicação
docker-compose logs -f app

# Ver logs do banco
docker-compose logs -f postgres

# Acessar shell do container da aplicação
docker-compose exec app sh

# Acessar PostgreSQL
docker-compose exec postgres psql -U postgres -d net_imobiliaria

# Reiniciar apenas a aplicação
docker-compose restart app

# Atualizar aplicação (após git pull)
docker-compose build app
docker-compose up -d app

# Ver uso de recursos
docker stats

# Limpar recursos não utilizados
docker system prune -a --volumes

# Backup manual
./backup.sh

# Restore manual
./restore.sh backups/backup_20250124_120000.sql.gz
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação (Sem Impacto)
- [ ] Criar índices no banco de dados
- [ ] Implementar sistema de cache Redis
- [ ] Configurar Object Storage (S3/MinIO)
- [ ] Criar pipeline de processamento de imagens

### Fase 2: Migração Incremental
- [ ] Migrar novos uploads para Object Storage
- [ ] Processar imagens existentes em background
- [ ] Atualizar APIs para retornar URLs
- [ ] Implementar fallback para BLOB antigo

### Fase 3: Otimização Frontend
- [ ] Implementar lazy loading
- [ ] Adicionar placeholders/blur
- [ ] Otimizar tamanhos de imagem
- [ ] Implementar Intersection Observer

### Fase 4: CDN e Cache
- [ ] Configurar CDN (Cloudflare/AWS)
- [ ] Implementar cache headers
- [ ] Configurar compressão
- [ ] Monitorar métricas

### Fase 5: Limpeza
- [ ] Remover código de BLOB
- [ ] Remover coluna 'imagem' do banco
- [ ] Otimizar queries restantes
- [ ] Documentar arquitetura final

---

## 📝 CONCLUSÃO

### **RESPOSTA DIRETA À PERGUNTA:**

**SIM, a aplicação ENTRARIA EM COLAPSO** com 100k imóveis e dezenas de milhares de acessos diários na arquitetura atual.

### **PRINCIPAIS MOTIVOS:**

1. **Transferência de 323GB/dia** apenas em imagens Base64 (318GB listagens + 4.8GB galerias)
2. **Processamento CPU intensivo** de encoding Base64 para 1.202.000 queries/dia
3. **Memória do servidor** saturada com imagens em RAM (até 2.4MB por galeria)
4. **Queries não otimizadas** sem índices adequados
5. **Ausência de cache** em múltiplas camadas

### **SOLUÇÃO NECESSÁRIA:**

1. **Migração para Object Storage + CDN** (crítico)
2. **Sistema de cache em múltiplas camadas** (crítico)
3. **Otimização de queries e índices** (alto)
4. **Lazy loading e processamento assíncrono** (alto)
5. **Monitoramento e alertas** (médio)

### **INVESTIMENTO ESTIMADO:**

- **Desenvolvimento:** 2-3 semanas
- **Infraestrutura:** R$ 150-300/mês (CDN + Object Storage)
- **Economia:** R$ 300-600/mês (redução de servidor)
- **ROI:** Positivo em 1-2 meses

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Análise técnica holística - Não implementação**  
**Próximo passo:** Aprovação e planejamento de implementação incremental

