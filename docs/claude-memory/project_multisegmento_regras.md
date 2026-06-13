---
name: project-multisegmento-regras
description: Regras de negócio multi-segmento — isolamento obrigatório por segmento no dashboard e em toda a plataforma
metadata: 
  node_type: memory
  type: project
  originSessionId: d21342fc-66d5-476a-a1c4-1ccdb881c8e1
---

# Regras de Negócio Multi-Segmento

## A Regra Fundamental
**O dashboard `/admin/campanhas/dashboard` JAMAIS pode misturar campanhas de clientes com segmentos de negócios distintos.**

## Modelo de Negócio
- Um **tenant** é uma agência de marketing (ou empresa própria) — tem um `segment_id` padrão
- Um tenant pode ter **vários clientes** (`public.clientes`), cada um com seu próprio `segment_id`
- Um cliente pode ser de segmento DIFERENTE do tenant (ex: tenant "Imobiliário" gerencia cliente "Saúde Digital")
- Campanhas podem ser criadas:
  a) Para um cliente específico: `Campaign.client_id` aponta para `clientes.uuid`
  b) Diretamente pelo tenant: `Campaign.client_id` é NULL (herda segmento do tenant)

## Hierarquia de Isolamento
```
Tenant → pode ter clientes de múltiplos segmentos
Campanha → sempre pertence a UM segmento (via client_id → clientes.segment_id, ou via tenant.segment_id)
Dashboard → deve ser filtrado por segmento OU por cliente, nunca misto
```

## Problema Identificado em Produção (2026-06-12)
O tenant "Marketing Digital" já possui campanhas misturadas:
- Campanhas de cliente com segment "Saúde Digital" (GISELE CESSE...)
- Campanhas de cliente com segment "Imobiliário" (Alexandre Severo...)
- Campanhas sem cliente (sem segmento definido)

O dashboard atual mostra TUDO junto — violação da regra.

## Solução Necessária
1. Dashboard deve obrigatoriamente receber `clientId` como filtro OU mostrar apenas o segmento do tenant logado
2. Quando `clientId` é fornecido: mostrar só campanhas daquele cliente
3. Quando `clientId` não é fornecido: mostrar apenas campanhas cujo cliente tem o mesmo `segment_id` do tenant logado (ou campanhas sem cliente do próprio tenant)
4. **Proibir** que a UI ofereça campanhas de segmentos diferentes no mesmo view

**Why:** Dados de performance de imóveis (CPL R$120+) são completamente incomparáveis com saúde digital (CPL R$15). Misturar distorce todos os KPIs, médias e benchmarks.

**How to apply:** Em TODA nova implementação que toque campanhas, insights, leads, briefings ou aiInsights — verificar se há filtro de segmento/cliente e nunca assumir que `tenantId` sozinho é suficiente.
