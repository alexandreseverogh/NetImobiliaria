---
name: project_storage_minio
description: Arquitetura de object storage — cliente único s3-client.ts, buckets, prefixos e regra de uso
metadata:
  type: project
---

## Object Storage — MinIO / S3

**Cliente único:** `src/lib/storage/s3-client.ts`
**NUNCA criar outro cliente S3/MinIO** — usar sempre este arquivo.

### Variáveis de ambiente

| Var | Dev (`.env.local`) | VPS (auto via docker-compose) |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | `http://minio:9000` (interno) |
| `S3_ACCESS_KEY` | `minioadmin` | `${MINIO_ROOT_USER}` |
| `S3_SECRET_KEY` | `minio_default_pass` | `${MINIO_ROOT_PASSWORD}` |
| `S3_BUCKET` | `net-imobiliaria` | `netimobiliaria-prod` |
| `CDN_URL` | `http://localhost:9000/net-imobiliaria` | `https://{domínio}/storage/{bucket}` |

### Módulos que usam storage e seus prefixos

| Módulo | Prefixo no bucket | Rota de upload |
|---|---|---|
| Imóveis (fotos) | `tenants/<tenantId>/imoveis/<id>/` | via `generateS3Key()` |
| Criativos (biblioteca) | `criativos/<tenantId>/<hash16>.<ext>` | `/api/admin/campanhas/criativos/upload` |
| Publicações orgânicas | `organic/<tenantId>/<uuid>.<ext>` | `/api/admin/campanhas/organic/upload` |

### API do cliente

```typescript
import { uploadToS3, getS3Url, deleteFromS3, isS3Configured } from '@/lib/storage/s3-client';

// Upload
const result = await uploadToS3(s3Key, buffer, contentType);
// result = { s3Key, url, bucket } ou null se MinIO não configurado

// URL pública (usa CDN_URL se disponível)
const url = getS3Url(s3Key);  // string | null
```

### Comportamento de fallback

Se `S3_ENDPOINT` não estiver configurado, `uploadToS3` retorna `null`.
Os módulos de criativos e organic/upload têm fallback para disco local
com aviso de log — **não funciona em produção com múltiplas instâncias**.

### Bucket — criação automática

`ensureBucket()` é chamado na primeira chamada a `uploadToS3()` de cada processo.
Cria o bucket se não existir e aplica política pública de leitura.
Em dev: bucket `net-imobiliaria` criado automaticamente no MinIO local.
Na VPS: buckets criados pelo `scripts/deploy.sh` via `mc` antes do primeiro upload.

**Why:** bucket deve existir com `anonymous download` para que URLs do MinIO
sejam acessíveis sem autenticação pelo browser.

**How to apply:** ao criar novo módulo com upload, usar `uploadToS3` + `getS3Url`
do `s3-client.ts`. Escolher prefixo próprio (ex: `documentos/<tenantId>/`).
