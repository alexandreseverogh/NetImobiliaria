---
name: NetImobiliária
description: Plataforma SaaS de gestão imobiliária e campanhas Meta Ads multi-tenant
colors:
  navy-void: "#020c1b"
  navy-deep: "#0a192f"
  navy-surface: "#112240"
  gold-accent: "#c5a028"
  gold-default: "#d4af37"
  gold-highlight: "#fde047"
  ink-primary: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#64748b"
  surface-white: "#ffffff"
  surface-faint: "#f8fafc"
  blue-action: "#1d4ed8"
  blue-focus: "#2563eb"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.gold-accent}"
    textColor: "{colors.navy-void}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.gold-default}"
    textColor: "{colors.navy-void}"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.blue-action}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-dark:
    backgroundColor: "{colors.navy-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: NetImobiliária

## 1. Overview

**Creative North Star: "O Painel de Missão"**

Este sistema de design opera sob a premissa de um centro de controle de alta precisão: dados densos apresentados com a calma de quem sabe exatamente o que está acontecendo. Cada número existe em contexto. Cada estado visual tem intenção. A interface não compete com o conteúdo — ela o serve com invisibilidade disciplinada.

O vocabulário visual é grafite profundo e âmbar. O modo escuro não é estético — é funcional. Gestores de tráfego que monitoram CPL e CTR por horas consecutivas precisam de uma superfície que não canse, não distraia, não exija esforço de interpretação. O ouro aparece com parcimônia: uma métrica boa, um estado ativo, um elemento de ação. Sua raridade é a mensagem.

Este sistema rejeita explicitamente: o azul pop SaaS genérico (#3b82f6 como cor de ação universal); o template admin cinza do GitHub sem personalidade; a densidade hostil do Meta Ads Manager; e o glassmorphism de startup que envelhece em meses.

**Key Characteristics:**
- Modo escuro-primário com navy profundo como superfície base
- Âmbar/ouro como único acento cromático — raridade intencional
- Inter em múltiplos pesos como único typeface (sem par serifado)
- Elevação via tonalidade, não via sombra — camadas de navy mais claro indicam hierarquia
- Dados em contexto: toda métrica acompanhada de referência ou tendência

## 2. Colors: A Paleta Grafite-Âmbar

Uma paleta de dois pólos: o negro de marinha profundo do espaço e o âmbar quente do alerta. Toda cor de suporte é derivada dessas duas famílias — nada entra de fora.

### Primary
- **Âmbar Missão** (`#c5a028` / gold-accent): A única cor de ação verdadeira. Usada em botões primários, indicadores de estado ativo, badges de destaque positivo. Sua presença em ≤10% de qualquer tela é a regra — quando aparece, significa algo.
- **Âmbar Quente** (`#d4af37` / gold-default): Variante mais clara do acento. Hover de botões primários, highlights de gráfico de linha principal.
- **Âmbar Alerta** (`#fde047` / gold-highlight): Somente para estados de atenção/alerta — CPL acima do benchmark, frequência crítica. Nunca decorativo.

### Secondary
- **Azul Institucional** (`#1d4ed8` / blue-action): Links, botões secundários, estados de foco com anel. Componente de transição enquanto o sistema migra para âmbar como primário.
- **Azul Foco** (`#2563eb` / blue-focus): Anel de foco (`outline`) em elementos interativos para acessibilidade — fixo, não substituível.

### Neutral
- **Void** (`#020c1b` / navy-void): Cor mais escura. Fundo base do sidebar e header em dark mode. O piso do espaço.
- **Navy Profundo** (`#0a192f` / navy-deep): Superfície principal em dark mode. Corpo de páginas admin.
- **Navy Elevado** (`#112240` / navy-surface): Superfície levantada: cards, painéis, modais em dark mode. Hierarquia por tonalidade, não por sombra.
- **Tinta Primária** (`#0f172a` / ink-primary): Texto de corpo em light mode. Próximo do preto mas com ligeiro toque de navy.
- **Tinta Secundária** (`#334155` / ink-secondary): Labels, subheadings, texto de suporte em light mode.
- **Tinta Muted** (`#64748b` / ink-muted): Metadados, timestamps, placeholders. Contraste mínimo 4.5:1 garantido sobre fundos claros.
- **Superfície Branca** (`#ffffff` / surface-white): Fundo de cards e inputs em contextos light.
- **Superfície Faint** (`#f8fafc` / surface-faint): Background de páginas em light mode. Quase branco, sem tinte quente.

### Named Rules
**A Regra do Acento Único.** O âmbar é a única cor de decisão. Se um elemento pede destaque e não é âmbar, receba hierarquia via peso tipográfico ou posição — não via outra cor de acento. Duas cores de destaque numa tela é zero destaque.

**A Regra Antivetorial.** A superfície não é o branding. Fundo branco genérico com azul primário genérico é o template, não o produto. Toda superfície de dashboard deve ser navy ou derivado.

## 3. Typography

**Display/Body Font:** Inter (system sans-serif stack: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)

**Character:** Inter em um único typeface — a sofisticação vem dos pesos e do espaçamento, não da mistura de famílias. Funcional como uma cockpit display, legível a qualquer tamanho, sem personalidade desnecessária. Modo de usar: peso pesado para hierarquia, não para decoração.

### Hierarchy
- **Display** (700, clamp(1.75rem → 2.5rem), lh 1.1, ls -0.02em): Títulos de página, hero de landing. Máximo em dashboards: nome do módulo no topo da seção principal.
- **Headline** (600, 1.25rem, lh 1.3, ls -0.01em): Cabeçalhos de card, títulos de seção dentro de página. O grau onde o peso faz o trabalho.
- **Title** (600, 0.9375rem, lh 1.4): Rótulos de widget, nomes de campanha em tabelas, subtítulos de painel.
- **Body** (400, 0.875rem, lh 1.6): Todo texto de suporte, descrições, valores de formulário. Máximo 65–75ch por linha.
- **Label** (500, 0.75rem, lh 1.4, ls 0.01em): Chaves de dado (CPL, CTR, Impressões), badges, status tags. Nunca uppercase por padrão — uppercase reservado para estados críticos específicos.

### Named Rules
**A Regra do Peso, Não da Cor.** Hierarquia tipográfica é construída por peso (400/500/600/700) e tamanho — nunca por cor diferente. Texto colorido em parágrafos de suporte é proibido; use peso ou muted.

## 4. Elevation

Este sistema usa **elevação tonal**, não sombras. Em dark mode, superfícies mais claras de navy indicam profundidade maior — navy-void → navy-deep → navy-surface → cards ainda mais claros. Em light mode, a progressão é surface-faint → surface-white → cards com sutil borda 1px.

Sombras existem apenas para feedback de estado (hover de card, abertura de dropdown, modal) — nunca como decoração estática.

### Shadow Vocabulary
- **Estado hover** (`box-shadow: 0 4px 20px rgba(0,0,0,0.25)`): Cards clicáveis ao hover. Sinaliza interatividade, não importância estática.
- **Modal/Dialog** (`box-shadow: 0 20px 60px rgba(0,0,0,0.5)`): Isolamento de camada modal do fundo. Único contexto onde sombra pesada é válida.
- **Dropdown** (`box-shadow: 0 8px 24px rgba(0,0,0,0.3)`): Menus suspensos e popovers. Diferencia do body sem dramatismo.

### Named Rules
**A Regra Flat-By-Default.** Superfícies estáticas são flat. Sombra aparece somente em resposta a estado (hover, foco, elevação modal). Um card com sombra em repouso é decorativo; um card sem sombra que ganha sombra no hover é comunicativo.

## 5. Components

### Buttons
Interface de ação com três graus de comprometimento visual.
- **Shape:** Gently rounded (8px radius — `rounded-md`)
- **Primary:** Fundo âmbar (`#c5a028`), texto navy-void, peso 600. Padding 12px × 24px. O botão de missão — aparece uma vez por contexto, no ponto de decisão.
- **Primary Hover:** Âmbar mais claro (`#d4af37`), `transition: background 0.18s ease-out`. Sem transform, sem escala — o âmbar fala por si.
- **Secondary / Outline:** Fundo branco, borda 1px azul institucional, texto azul. Para ações secundárias como "Cancelar" ou "Exportar".
- **Ghost:** Sem fundo, sem borda. Texto ink-secondary. Para ações terciárias dentro de cards densos.

### Chips / Badges
- **Style:** `background: rgba(navy, 0.1)`, texto ink-secondary, borda 1px com 8% opacidade, radius 6px. Sem uppercase por padrão.
- **Estado Ativo / Positivo:** Background âmbar 15% opacidade, texto âmbar escuro. Para CPL ok, campanha ativa.
- **Estado Crítico:** Background vermelho 12% opacidade, texto vermelho. Para alertas de pause, CTR crítico.
- **Estado Neutro / Muted:** Fundo surface-faint, texto ink-muted.

### Cards / Containers
- **Corner Style:** Gently rounded (12px — `rounded-lg`)
- **Background (light):** surface-white com borda 1px `rgba(0,0,0,0.06)`
- **Background (dark):** navy-surface (`#112240`) sem borda explícita — tonalidade faz o trabalho
- **Shadow Strategy:** Flat em repouso. Hover adiciona sombra sutil (ver Elevation)
- **Internal Padding:** 24px (lg) como padrão; 16px (md) em cards compactos de dado

### Inputs / Fields
- **Style:** Fundo surface-white, borda 1px ink-muted/40, radius 8px, padding 10px × 14px
- **Focus:** Anel 2px solid blue-focus (#2563eb), offset 2px. Sem glow ou sombra extra.
- **Error:** Borda 1px solid vermelho, texto de erro abaixo em label weight.
- **Disabled:** Opacidade 50%, cursor not-allowed. Não trocar a cor do campo — manter a paleta, reduzir apenas a opacidade.

### Navigation (Sidebar)
- **Fundo:** navy-void (`#020c1b`) — o piso do espaço
- **Item inativo:** texto gray-300/80, ícone gray-400
- **Item ativo:** texto branco, ícone na cor primária do tenant (configurável), fundo branco/5
- **Categoria expandida:** background white/5, texto branco
- **Typography:** 0.8125rem, weight 700, uppercase, italic — identidade atual do sidebar; manter enquanto redesigns de página progridem

### KPI / Metric Card (Componente Signature)
O componente central do produto. Toda métrica em contexto:
- Número principal: display weight (700), tamanho relativo ao espaço disponível
- Label: label weight (500, 0.75rem, ink-muted)
- Delta/Tendência: badge colorido ao lado ou abaixo — sempre com sinal (+/-) e período de referência
- Benchmark: linha tracejada ou texto muted "Meta: X" abaixo do valor principal
- **Proibido:** número isolado sem contexto. Um "R$ 45,20" sem referência não diz nada ao gestor.

## 6. Do's and Don'ts

### Do:
- **Do** usar âmbar (`#c5a028`) como único acento de ação — um por contexto, no ponto de decisão.
- **Do** construir hierarquia com peso tipográfico (400/600/700 de Inter) antes de recorrer a tamanho ou cor.
- **Do** usar navy profundo (`#0a192f` / `#020c1b`) como superfície base em toda interface admin.
- **Do** apresentar toda métrica com contexto: delta, benchmark ou período de referência visível.
- **Do** reservar sombras para feedback de estado (hover, modal, dropdown) — nunca decorativo estático.
- **Do** garantir contraste ≥ 4.5:1 em todo texto de corpo, incluindo textos muted sobre fundos coloridos.
- **Do** usar `prefers-reduced-motion` para toda animação — fallback de crossfade instantâneo.
- **Do** limitar linhas de texto de corpo a 65–75ch máximo.

### Don't:
- **Don't** usar `#3b82f6` (azul pop SaaS) como cor de ação primária. É o template, não o produto.
- **Don't** criar dashboards com fundo branco genérico — a superfície navy é parte da identidade.
- **Don't** usar `border-left` colorido maior que 1px como acento decorativo em cards ou alertas. Reescrever com fundo tintado ou borda completa.
- **Don't** usar gradiente em texto (`background-clip: text`). Nunca, em nenhum contexto.
- **Don't** usar glassmorphism decorativo — blur e transparências somente quando funcionalmente necessários (modal sobre conteúdo denso).
- **Don't** criar cards idênticos em grid com ícone + heading + texto repetido sem variação. É o padrão SaaS genérico que este sistema rejeita explicitamente.
- **Don't** usar cores diferentes para criar hierarquia tipográfica dentro de um parágrafo — use peso.
- **Don't** exibir métricas nuas (número sem contexto, benchmark ou tendência). Um CPL isolado não é informação — é ruído.
- **Don't** fazer o design do Meta Ads Manager: cinza, denso sem ritmo, hostil, sem personalidade.
- **Don't** usar uppercase em labels por padrão — reservar para estados críticos ou identidade específica (sidebar atual tem justificativa histórica; novos componentes: sans uppercase).
