---
name: project-arquitetura-core
description: "Arquitetura completa da plataforma TrafegoPago — stack, schemas, relações entre tabelas, gaps críticos identificados"
metadata: 
  node_type: memory
  type: project
  originSessionId: d21342fc-66d5-476a-a1c4-1ccdb881c8e1
---

# Arquitetura Core — TrafegoPago

## Localização
`C:\NetImobiliária\Trafegopago` (nota: acento no nome do diretório)

## Stack
- Client: React 19, TypeScript, Vite, Tailwind 4, React Router 7, Recharts, Framer Motion
- Server: Node.js + Express 5, TypeScript, Prisma 7 (adapter PrismaPg)
- DB: PostgreSQL 17 na porta **15432** local
- DB name: `net_imobiliaria`
- Dois schemas: `public` (plataforma base) e `campanhasmarketingdigital` (trafego pago)
- psql: `C:\Program Files\PostgreSQL\17\bin\psql.exe`

## Modelo de Banco — Relações Críticas

```
public.system_segments          ← 6 segmentos: Imobiliário, Saúde Digital, Pet, Carros, Geral, Master
    ↑ segment_id             ↑ segment_id
public.tenants               public.clientes    ← clientes podem ter segmento DIFERENTE do tenant
                                     ↑ client_id
campanhasmarketingdigital."Campaign"             ← campanha pertence a cliente OU direto ao tenant
         ↑ campaignId
campanhasmarketingdigital."Insight"
campanhasmarketingdigital."Lead"
```

## Tabelas campanhasmarketingdigital (Prisma schema)
Campaign, AdSet, Ad, Insight, Lead, WhatsAppConfig, Settings, AiInsight, AgentAction, StrategicBriefing

Colunas REAIS em Campaign (banco) além do schema.prisma:
- `client_id` (uuid FK → public.clientes.uuid)
- `network_id`, `external_id`, `network_metadata`
- `initiative_id`, `lifecycle_status`, `lifecycle_changed_at`
- `learning_started_at`, `stable_since`, `funnel_stage`
- `declared_angle`, `angle_source`

O `schema.prisma` atual NÃO MAPEIA `client_id` — lacuna crítica.

## Segmentos Ativos (2026-06-12)
| ID | Nome | Slug |
|---|---|---|
| 92e5ddd3... | Imobiliário | imobiliaria |
| 9389eaf1... | Saúde Digital | saude |
| 072cee23... | Pet | pet |
| e842312b... | Venda de Carros | carros |
| 4690b2f8... | Geral | geral |
| 2b940dfd... | Master Platform | master |

## Tenants Ativos (2026-06-12)
| Nome | Slug | segment_id |
|---|---|---|
| Imobiliaria XYZ | imobiliaria-xyz | Imobiliário |
| Marketing Digital | imobiliaria-md | Imobiliário |
| Master Platform | master-platform | null |

## Auth
- JWT via `server/src/middleware/auth.ts`
- `req.tenantId`, `req.tenant`, `req.userId`, `req.userRole`
- Header interno para agentes: `x-tenant-id` + `x-internal-secret`
- `authDb.ts` usa `prisma.$queryRaw` no schema `public`

**Why:** O Prisma adapter aponta para o schema `campanhasmarketingdigital`, então queries em `public.*` usam `$queryRaw` com tabela qualificada.

**How to apply:** Ao implementar qualquer query que cruze dados de `public.tenants`, `public.clientes` ou `public.system_segments` com tabelas de campanhas, sempre usar `$queryRaw` ou joins explícitos.
