# 📰 Planejamento: Feed de Conteúdos do Mercado Imobiliário

**Versão:** 1.3  
**Data:** 2025-11-23  
**Última Atualização:** 2025-11-23  
**Status:** 📋 Planejamento  
**Autor:** Sistema Net Imobiliária

**Alterações v1.3 (UI e Estratégia Landpaging):**
- ✅ **Categorias Refinadas:** Inclusão estratégica de **Tokenização** como categoria principal.
- ✅ **Integração Landpaging:** Feed será uma seção **"Fique por Dentro do Mercado"** no final da página principal (não isolada).
- ✅ **Layout:** Grid fixo de 4 cards (Desktop) e Carrossel (Mobile) com os posts mais recentes (mix).
- ✅ **Visual:** Cards compactos, imagem menor que imóveis, foco em retenção e autoridade.

---

## 📋 ÍNDICE

1. [Visão Geral e Estratégia](#visão-geral-e-estratégia)
2. [Categorias de Conteúdo](#categorias-de-conteúdo)
3. [Integração na Landpaging (UX/UI)](#integração-na-landpaging-uxui)
4. [Fontes de Dados Públicas](#fontes-de-dados-públicas)
5. [Dinâmica de Atualização](#dinâmica-de-atualização)
6. [Análise de Riscos - GUARDIAN RULES](#análise-de-riscos---guardian-rules)
7. [Plano de Ação Detalhado](#plano-de-ação-detalhado)
8. [Arquitetura Técnica](#arquitetura-técnica)

---

## 🎯 VISÃO GERAL E ESTRATÉGIA

### Objetivo Estratégico
O Feed de Conteúdos atuará como um componente de **retenção e autoridade** na Landpaging. Ele não deve competir com o Grid de Imóveis (conversão principal), mas sim complementar a experiência, oferecendo informação de valor para quem rola a página até o final.

### Posicionamento
- **Local:** Final da página principal, imediatamente antes do Rodapé.
- **Função:** "Rodapé de Conteúdo" para aumentar tempo de permanência e engajamento.

---

## 📚 CATEGORIAS DE CONTEÚDO

Definidas para cobrir interesses variados e alinhar com a estratégia futura da empresa:

1.  **Mercado Financeiro** (Taxas, Economia)
2.  **Tecnologia** (PropTech, Inovação, Automação)
3.  **Decoração** (Design, Interiores)
4.  **Tendências** (Mercado, Cidades em Alta)
5.  **Segurança** (Dicas, Monitoramento)
6.  **História** (Curiosidades, Patrimônio)
7.  **Tokenização** (Blockchain, Crypto Real Estate) - *Categoria Estratégica*

---

## 🎨 INTEGRAÇÃO NA LANDPAGING (UX/UI)

### Seção: "Fique por Dentro do Mercado"

#### Layout Desktop
- **Grid Fixo:** 4 Cards alinhados horizontalmente.
- **Conteúdo:** Os 4 posts mais recentes (qualquer categoria).
- **Visual:** Limpo, imagens com aspect-ratio 16:9 (menores que os imóveis), Título truncado em 2 linhas.

#### Layout Mobile
- **Carrossel Horizontal (Swipe):** Exibe 1.2 cards por vez para incentivar o deslize lateral.
- **Objetivo:** Otimizar espaço vertical.

#### Componente do Card
- **Topo:** Imagem de Capa.
- **Sobreposição:** Badge da Categoria (ex: "Tokenização" em Roxo).
- **Corpo:** Título (H3), Data (ex: "Há 2 horas").
- **Rodapé:** Fonte (ex: "TechCrunch") e Link discreto "Ler na fonte".

---

## 🔌 FONTES DE DADOS (AGREGADOR)

**Modelo:** Curadoria Automática (Agregador).
- **NÃO faz scraping de texto completo.**
- **Armazena:** Título, Resumo, Imagem, Link Original.
- **Clique:** Abre o site original em nova aba (`target="_blank"`).

---

## ⚙️ DINÂMICA DE ATUALIZAÇÃO

- **Agendador:** Cron Job a cada 1 hora.
- **Prioridade:**
    - Alta (Financeiro/Tech): A cada 4h.
    - Média (Geral): Diária.
    - Baixa (História): Semanal.

---

## ⚠️ ANÁLISE DE RISCOS - GUARDIAN RULES

### Conformidade
- ✅ **Banco de Dados:** Schema Isolado (`feed`) -> Não afeta tabelas de imóveis/usuários.
- ✅ **Performance:** Coleta via Fila (Jobs) -> Não trava a navegação do usuário.
- ✅ **Segurança:** Acesso público apenas leitura (`GET`). Gestão restrita a Admin.
- ✅ **Legal:** Modelo de Agregador (Link Externo) -> Sem risco de Copyright.

---

## 📋 PLANO DE AÇÃO DETALHADO

1.  **Banco de Dados:** Criar Schema e Tabelas (`migrations/001_create_feed_schema.sql`).
2.  **Backend:** Criar Services de Coleta (RSS Parser) e Fila.
3.  **Frontend (Componente):** Criar componente `FeedSection` para inserir na Landpaging.
4.  **Integração:** Adicionar `FeedSection` ao final da `page.tsx` da Landpaging.

---

## 🏗️ ARQUITETURA TÉCNICA (Schema `feed`)

```sql
CREATE SCHEMA IF NOT EXISTS feed;

-- Tabelas Principais (Com prefixo para segurança extra)
CREATE TABLE feed.feed_categorias (...);
CREATE TABLE feed.feed_fontes (...);
CREATE TABLE feed.feed_conteudos (...); -- Título, Link, Imagem
CREATE TABLE feed.feed_jobs (...);      -- Fila de Coleta
```

**Tecnologias:** Next.js, PostgreSQL, `rss-parser`.
