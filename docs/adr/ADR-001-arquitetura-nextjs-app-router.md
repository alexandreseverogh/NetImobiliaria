# ADR-001: Arquitetura Next.js 14 App Router

* **Status**: Aceito
* **Data**: 2026-01-15
* **Decisores**: Equipe de Arquitetura

## Contexto
O projeto exigia uma aplicação moderna, com renderização híbrida (Server Components para performance e SEO no portal público de imóveis, e Client Components para dashboards interativos e complexos).

## Decisão
Adotar **Next.js 14 com a estrutura App Router (`src/app/`)** em TypeScript.

## Consequências
* **Positivas**: Excelentes tempos de carregamento (LCP), suporte nativo a rotas de API (`route.ts`), layouts aninhados e fácil separação entre áreas públicas (`/imoveis`) e administrativas (`/admin`).
* **Negativas**: Exige cuidado na separação dos componentes `'use client'` para evitar bundle grande no navegador.
