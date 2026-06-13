---
name: project-trafegopago
description: App TrafegoPago — plataforma SaaS multi-tenant multi-segmento de gestão Meta Ads para agências e seus clientes
metadata: 
  node_type: memory
  type: project
  originSessionId: d21342fc-66d5-476a-a1c4-1ccdb881c8e1
---

# Projeto TrafegoPago

## Localização
`C:\NetImobiliária\Trafegopago` (nota: acento no "á", é diretório independente, NÃO é o net-imobiliaria)

## O que é
Plataforma SaaS multi-tenant e multi-segmento para gestão de campanhas Meta Ads. Permite que agências (tenants) gerenciem campanhas para seus próprios clientes de negócios distintos.

## Portas de desenvolvimento
- Frontend: http://localhost:5173 (Vite)
- Backend: http://localhost:3001 (Express)
- DB PostgreSQL: porta 15432 local

## Stack
- Client: React 19, TypeScript, Vite 8, Tailwind 4, React Router 7, Recharts, Framer Motion
- Server: Node.js + Express 5, TypeScript, Prisma 7 (PrismaPg adapter)
- DB: PostgreSQL 17 na porta 15432, banco `net_imobiliaria`
- Dois schemas: `public` (plataforma base compartilhada) e `campanhasmarketingdigital` (tráfego pago)
- psql: `C:\Program Files\PostgreSQL\17\bin\psql.exe`

## Modelo de Negócio Central
```
Tenant (agência) → Clientes (empresas de vários segmentos) → Campanhas Meta Ads
```
- Um tenant pode gerenciar clientes de SEGMENTOS DIFERENTES (ex: agência gerencia imobiliária E clínica)
- Campanhas pertencem a um cliente específico (via `client_id`) OU diretamente ao tenant
- O segmento determina benchmarks, KPIs ideais e linguagem

## Regra Crítica Inviolável
**NUNCA misturar campanhas de segmentos de negócios diferentes no mesmo dashboard/view.**
Veja [[project-multisegmento-regras]]

## Gaps Técnicos Ativos (2026-06-12)
O código atual tem lacunas graves vs o banco real. Veja [[project-gaps-tecnicos]].

## Arquitetura Detalhada
Veja [[project-arquitetura-core]]

## Plano Estratégico
`GRAND_SLAM_PLANO.md` — 5 fases, objetivo ser maior plataforma de automação de tráfego pago do Brasil.
