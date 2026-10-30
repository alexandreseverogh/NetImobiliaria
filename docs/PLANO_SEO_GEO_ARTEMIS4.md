# Plano de SEO + GEO — Landing Artemis9 (`/artemis4`)

> Status: **só planejamento, nada implementado.** Diagnóstico feito lendo o código real
> (`src/app/artemis4/layout.tsx`, `Hero.tsx`, `Story.tsx`, `robots.ts`, `sitemap.ts`,
> `ops/Caddyfile`), não por suposição — seção 0 lista exatamente o que já existe hoje.
>
> **Aviso honesto, antes de qualquer coisa:** nenhuma agência ou ferramenta séria garante
> posição no Google ou citação em IA generativa — quem promete isso está vendendo ilusão.
> O que este plano garante é **execução correta de tudo que está sob nosso controle**
> (técnico, estrutura de dado, conteúdo, medição) — que é o maior preditor real de sucesso
> que existe, mas o resultado final também depende de fatores fora do nosso controle
> (concorrência, algoritmo, tempo de maturação do domínio).

---

## 0. Diagnóstico do estado atual — o que já existe, de verdade

| Item | Estado real | Fonte |
|---|---|---|
| `<title>` / meta description | Existem, mas **100% voz de marca**, zero palavra-chave de busca ("Saiba qual anúncio virou venda de verdade") | `layout.tsx:32-34` |
| Open Graph | Existe, mesma mensagem de marca | `layout.tsx:38-46` |
| `<h1>` | Existe, mas é copy de conversão puro, zero termo de busca ("Enquanto você pensa em responder, seu concorrente já vendeu.") | `Hero.tsx:307-309` |
| Dados estruturados (schema.org) | Só `Organization` — nome, logo, contato, endereço real. **Nenhum** `Service`/`SoftwareApplication`/`FAQPage` | `layout.tsx:52-68` |
| `robots.txt` | Existe, libera `/artemis4` pra qualquer `userAgent` (inclusive crawlers de IA, já que usa `*`) | `robots.ts` |
| `sitemap.xml` | Existe, `/artemis4` com prioridade 1 | `sitemap.ts` |
| Canonical | `https://www.artemis9.com.br/artemis4` — consistente com o redirect real do domínio (`artemis9.com.br` → 308 → `/artemis4`, `ops/Caddyfile`) | `layout.tsx:36` + Caddyfile |
| Meta Pixel | Já instalado (conversão paga, Meta Ads) | `layout.tsx:89-94` |
| **Google Search Console** | **Não existe** — sem isso não há visibilidade de NENHUMA métrica orgânica real | — |
| **GA4 / Google Tag Manager** | **Não existe** | grep confirmado, zero ocorrência |
| **FAQ com schema estruturado** | Existe uma seção de FAQ no conteúdo (citada em `docs/CHECKPOINT.md` como "FAQ de 7 objeções reais"), mas **sem `FAQPage` JSON-LD** — hoje é invisível pro Google como FAQ | — |
| Conteúdo de topo de funil (blog/artigos) | Não existe — só a landing transacional | — |
| `llms.txt` | Não existe (padrão emergente pra IA generativa) | — |

**Conclusão do diagnóstico:** a página tem uma base técnica sólida (robots/sitemap/canonical/Organization já certos, Core Web Vitals já trabalhados em sessão anterior) — mas **zero orientação a palavra-chave** no conteúdo visível (title/H1/meta) e **zero instrumentação de medição orgânica**. Sem Search Console, qualquer trabalho de SEO depois seria feito "no escuro" — por isso ele abre o plano, não fecha.

---

## 1. Arquitetura de palavras-chave — pra quem a página precisa aparecer

Organizado por intenção de busca, porque Google e IA generativa respondem de formas diferentes a cada tipo:

### 1.1 Transacional (quem já sabe o que quer, está comparando fornecedor)
- "crm com inteligência artificial"
- "crm integrado com whatsapp e ia"
- "plataforma de marketing digital para empresas"
- "ferramenta de automação de atendimento whatsapp"
- "chatbot para vendas com ia"
- "software de gestão de campanhas de tráfego pago"
- "crm com bot de atendimento"

### 1.2 Informacional / cauda longa (quem está pesquisando o problema, ainda não o produto — é o que mais aparece em IA generativa)
- "como saber qual anúncio gerou venda"
- "como medir roi de campanha de marketing digital"
- "como automatizar atendimento no whatsapp"
- "o que é mensageria no atendimento ao cliente"
- "como integrar crm com whatsapp"
- "como aumentar vendas com marketing digital"
- "atribuição de vendas por campanha de anúncio"

### 1.3 Conversacional / estilo pergunta de assistente de IA (GEO)
São perguntas completas, do jeito que alguém digita no ChatGPT/Gemini/Perplexity, não "palavra-chave":
- "qual a melhor plataforma brasileira pra integrar marketing digital, crm e atendimento automatizado"
- "como saber se um anúncio no instagram realmente virou venda"
- "existe alguma ferramenta que junta crm, whatsapp e inteligência artificial num só lugar"

Essas 3 categorias exigem **conteúdo diferente** — a landing em si serve bem a 1.1; 1.2 e 1.3 exigem conteúdo de apoio que hoje não existe (seção 4).

---

## 2. SEO On-Page — reescrita orientada a dado, sem perder a voz de marca

**Princípio:** não se trata de trocar o copy de conversão por um title genérico de SEO — é adicionar o sinal de palavra-chave QUE FALTA, sem abandonar o que já funciona como gancho emocional.

- **Title** — formato recomendado: `{Benefício com keyword real} | Artemis9` (ex.: algo como "CRM com IA e Automação de Atendimento no WhatsApp | Artemis9" — a decisão final de texto fica pro momento de implementação, com sua aprovação, já que mexe na primeira impressão da marca).
- **Meta description** — manter a narrativa, mas abrir com o termo de busca real nos primeiros ~60 caracteres (é o que o Google corta no snippet).
- **H1** — manter o gancho de marca como SUBTÍTULO (`<p className="a4-lead">`, que já existe) e introduzir no H1 o conceito central com keyword (ex.: incluir explicitamente "Marketing Digital, CRM e Mensageria com IA" — o eyebrow acima do H1 já tem quase isso: `"Marketing Digital · CRM · Mensageria"`; promover essa frase, ou uma variação dela, para dentro do próprio H1 resolve o gap sem inventar texto novo).
- **H2/H3 por seção** — a página já tem 9 formatos de seção (Hero, Story, Product, etc., documentados no CHECKPOINT). Cada H2 existente precisa ser revisado pra garantir que carrega um termo real do cluster 1.1/1.2, não só título estilístico.
- **Alt text em toda imagem/mockup** — os 6+ mockups de tela construídos em HTML/CSS (citados no CHECKPOINT) precisam de `alt` descritivo com keyword, não vazio.

---

## 3. Dados Estruturados (Schema.org) — expandir o que já existe

A base (`Organization`) já está correta e com dado real. Adicionar, sempre com dado 100% real extraído do conteúdo já publicado (nunca fabricado — resenha/avaliação falsa é proibido e seria contraproducente, Google penaliza):

1. **`Service` ou `SoftwareApplication`** — descreve o produto em si (categoria, público-alvo, funcionalidades reais já documentadas na página). **Decisão de tipo, não trivial:** Artemis9 vende uma plataforma SaaS, não um serviço de consultoria prestado por pessoas — `SoftwareApplication` descreve isso com mais precisão do que `ProfessionalService` (subtipo de `LocalBusiness`, pensado pra agência/prestador de serviço local). Usar `ProfessionalService` aqui empurraria o Google a tratar a Artemis9 como negócio local físico, o que não é o caso.
2. **`WebSite`** — tipo próprio, separado de `Organization`: declara `inLanguage: 'pt-BR'` e habilita a `SearchAction` (sitelinks search box do Google, se um dia existir busca interna no site). Custo de implementação baixo, adicionar junto do `Organization`.
3. **`FAQPage`** — sobre a seção de FAQ que já existe no conteúdo (7 objeções reais, citadas no CHECKPOINT) — é o schema que mais ajuda IA generativa a extrair resposta direta.
4. **`BreadcrumbList`** — só se/quando existir hierarquia de página (pouco relevante hoje, landing única).
5. **`HowTo`** — se a seção "tour do produto" (6 mockups de tela, já existente) for reestruturada como passo-a-passo.
6. **`sameAs` dentro do `Organization`** — array de links pros perfis reais de redes sociais da empresa (Instagram/LinkedIn/Facebook) — sinal real de desambiguação de entidade pro Knowledge Graph do Google. **Pré-requisito real, confirmado no código:** hoje a Artemis9 não tem nenhum link de rede social publicado no rodapé (`Chrome.tsx`) — só uma nota de rodapé citando "Instagram e Facebook são marcas da Meta" como disclaimer de trademark, não um perfil real. Esse campo só entra quando/se existirem perfis reais — nunca inventado.

**Nunca entra:** `AggregateRating`/`Review` fabricado — só se um dia houver avaliação real e verificável de cliente.

**Meta Robots, complementar ao Open Graph já existente:** adicionar a diretiva explícita `max-image-preview:large, max-snippet:-1, max-video-preview:-1` (via `Metadata.robots` do Next.js) — libera o Google pra mostrar snippet/thumbnail maior no resultado de busca, aumenta CTR orgânico sem custo de implementação.

---

## 4. Conteúdo & Autoridade — o pilar mais pesado, e o que decide o resultado de verdade

Esta é a parte que exige decisão de produto, não só técnica — **nenhum ajuste on-page sozinho rankeia pra termos competitivos como "marketing digital" ou "crm com ia"** sem volume real de conteúdo de apoio e sinais de autoridade.

- **Hub de conteúdo (`/blog` ou `/recursos`)** — artigos pilares respondendo diretamente aos termos informacionais da seção 1.2 (ex.: "Como medir o ROI real de uma campanha de tráfego pago", "O que é mensageria e por que seu atendimento precisa disso"). Cada artigo linka de volta pra `/artemis4` — é o mecanismo real de ranking pra site novo competir com concorrentes estabelecidos.
- **E-E-A-T (Experience, Expertise, Authoritativeness, Trust)** — página "Sobre"/autoria real, estudos de caso verificáveis (nunca fabricados), depoimento real de cliente com permissão.
- **Backlinks de qualidade** — diretórios de SaaS B2B brasileiro, parcerias reais, imprensa de tecnologia/startups, guest post em blog de marketing — processo contínuo, não técnico, não automatizável com segurança (comprar link é risco real de penalização).

---

## 5. Technical SEO / Performance

- **Core Web Vitals** — já houve trabalho de performance nesta mesma página (lazy-load de vídeo, `next/image`, remoção de canvas pesado — ver histórico no CHECKPOINT). Rodar uma auditoria Lighthouse/PageSpeed Insights real antes de declarar isso resolvido, já que mudanças de conteúdo desta frente (mais seções, mais schema) podem reintroduzir peso.
- **Mobile-first** — já testado em sessões anteriores (375px/768px/1366px sem overflow) — reconfirmar depois de qualquer mudança de conteúdo.
- **Indexação multi-domínio** — já correto: o mesmo app serve `imovtec.com.br` (imóveis) e `artemis9.com.br` (esta landing) com conteúdo de raiz diferente; `sitemap.xml`/`robots.txt` já tratam isso de forma unificada e correta.

---

## 6. Medição — a fundação que falta, deveria vir ANTES de qualquer outra fase

**Hoje não existe nenhuma forma de medir tráfego orgânico real desta página.** Sem isso, qualquer melhoria feita depois é um tiro no escuro — não dá pra saber se funcionou.

1. **Google Search Console** — verificação de propriedade (`artemis9.com.br`), submissão do sitemap já existente. Pré-requisito de tudo — é a única fonte real de "por qual termo o Google já mostra esta página, em qual posição, quantos cliques".
2. **GA4** (via Google Tag Manager, de preferência — centraliza governança de todos os pixels, incluindo o Meta Pixel já instalado, num só lugar).
3. **Canal de referência de IA generativa no GA4** — tráfego com `referrer` de `chat.openai.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com` tratado como canal próprio (hoje cairia em "Direct"/"Referral" sem distinção) — é como se mede, na prática, se a estratégia de GEO está funcionando.
4. **Bing Webmaster Tools** — baixo esforço, cobre o Bing (que alimenta o Copilot da Microsoft).
5. **Google Business Profile (Google Meu Negócio)** — registrar a Artemis9 com o MESMO nome/endereço/telefone já declarados no `Organization` JSON-LD (`layout.tsx`, dado real já extraído do rodapé). Reforça a resolução de entidade do Google pro Knowledge Graph e é pré-requisito pra um eventual Knowledge Panel aparecer na busca pelo nome da marca — custo zero, só cadastro.
6. **Taxonomia de eventos de conversão, grounded nas CTAs reais da página** (não um placeholder genérico) — confirmado no código quais ações já existem hoje em `Hero.tsx`/`Story.tsx`: abrir o modal de contato com especialista (`onOpenSpecialist` → `SpecialistContactModal.tsx`), clique em "Entrar" (login), abertura de detalhe de módulo (`ModuleDetailModal.tsx`), navegação do carrossel do console. Cada um vira um evento nomeado no GA4/GTM (ex.: `abrir_contato_especialista`, `enviar_contato_especialista`, `abrir_detalhe_modulo`), disparado de forma defensiva (checando se `window.gtag`/`dataLayer` existe antes de chamar — nunca quebra a página se o usuário tiver adblocker).
7. **Google Consent Mode v2 (LGPD)** — antes de disparar qualquer pixel/tag de terceiro (GA4, Meta Pixel), o consentimento do visitante precisa ser respeitado — mesmo princípio de cuidado com dado pessoal que o projeto já aplica em outros módulos (consentimento de lead na Mensageria). Implementar via Consent Mode v2 do Google, que já é o padrão suportado nativamente por GTM/GA4 — tags disparam em modo "cego"/agregado até o consentimento ser dado.

---

## 7. GEO — Otimização pra motores de IA generativa (ChatGPT, Perplexity, Gemini, Copilot, AI Overviews do Google)

Este é o pilar mais novo e menos "resolvido" pelo mercado em geral — ninguém tem fórmula fechada, mas os sinais já observados consistentemente são:

- **Conteúdo em formato extraível** — resposta direta no início do parágrafo, listas, tabelas comparativas (modelos de IA extraem trechos, não leem a página inteira como um humano navegando visualmente).
- **`FAQPage` schema** (seção 3) — é o formato que IA generativa mais consistentemente cita, porque já vem estruturado como pergunta-resposta.
- **`llms.txt` em 2 camadas** (padrão real de `llmstxt.org`, não inventado): um arquivo curto (`llms.txt`) na raiz do domínio, resumindo em texto simples o que a Artemis9 é, os problemas reais que resolve e os 3 pilares do produto (Marketing Digital/CRM/Mensageria — mesmo vocabulário já usado no eyebrow do Hero); e um 2º arquivo mais profundo (`llms-full.txt`) com conteúdo mais detalhado — funcionamento de cada pilar, para quem serve, especificidades por segmento de negócio atendido (a plataforma já é multi-segmento, nunca hardcoded pra 1 vertical só — mesmo princípio de "zero hardcode" seguido no resto do código, aqui vale também pro conteúdo voltado a LLM). Os 2 arquivos sempre derivados do conteúdo real já publicado — nunca um texto novo inventado só pra este fim.
- **Garantir que `robots.txt` não bloqueia crawlers de IA — e deixar explícito, não só implícito.** Hoje a regra `userAgent: '*'`/`allow: '/'` já cobre qualquer bot, inclusive os de IA — mas vale adicionar blocos nomeados explícitos (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) com `Allow: /` cada um. Não muda o comportamento funcional hoje, mas documenta a intenção explicitamente e blinda contra o risco real de alguém, numa sessão futura, adicionar uma regra de bloqueio nomeada sem perceber que isso bloquearia só os crawlers de IA (regra nomeada tem precedência sobre o wildcard `*` na maioria dos parsers de robots.txt).
- **Autoridade externa** — IA generativa tende a citar fontes que JÁ aparecem em muitos lugares confiáveis — isso volta diretamente pro pilar de backlinks/imprensa da seção 4, não tem atalho técnico que substitua isso.
- **Dados estruturados ricos (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`)** — é o principal sinal que a IA generativa usa hoje pra "entender" quem é a entidade por trás do site, mais do que o texto solto.

---

## 8. Fases de execução (cronograma honesto)

SEO não é instantâneo — resultado real pra termos competitivos tipicamente leva **3 a 6 meses** de execução consistente, mesmo fazendo tudo certo. Faseado assim, pra sempre poder medir o efeito de cada camada antes de empilhar a próxima:

| Fase | O quê | Por quê nessa ordem |
|---|---|---|
| **F0 — Medição** | Search Console + GA4/GTM + Bing Webmaster | Sem isso, nenhuma fase seguinte é mensurável |
| **F1 — On-page + Schema** | Title/H1/meta reescritos, `FAQPage`/`Service` JSON-LD, alt text | Ganho rápido, baixo risco, baixo esforço |
| **F2 — GEO técnico** | `llms.txt`, revisão explícita de `robots.txt` pra crawlers de IA | Mesma leva de F1, esforço baixo |
| **F3 — Conteúdo pilar** | Hub de artigos (`/blog` ou `/recursos`), decisão de produto | Maior esforço, maior impacto real no médio prazo |
| **F4 — Autoridade** | Backlinks, imprensa, parcerias, depoimentos reais | Processo contínuo, começa em paralelo a F3 |
| **F5 — Iteração** | Ajustar com base no dado real do Search Console (quais termos já trazem impressão mas pouco clique, etc.) | Só é possível depois que F0 acumular histórico |

---

## 9. Decisões necessárias pra avançar — organizadas por quem resolve

### 9.1 — Já implementado nesta rodada (código puro, sem precisar de conta nova)

> **Status real, sem exagero:** o CÓDIGO está no ar; os 3 recursos que dependem de conta
> Google (GTM/GA4/Search Console) continuam **inertes** até você criar as contas reais e
> colar os 3 valores — nenhum deles é tratado como "concluído" até isso acontecer (mesma
> ressalva que apontei no plano do Forma360 — não repetir o erro de declarar pronto com
> placeholder).

- `WebSite`/`SoftwareApplication`/`FAQPage` JSON-LD — adicionados em `layout.tsx`, ao lado
  do `Organization` já existente. `FAQPage` é derivado automaticamente do array `FAQ` real
  (`data.ts`) — nunca um texto duplicado à mão, se a FAQ visível mudar o schema acompanha.
- Diretiva `max-image-preview:large,max-snippet:-1,max-video-preview:-1` no `metadata.robots`.
- Blocos nomeados explícitos no `robots.ts` (`GPTBot`, `ClaudeBot`, `PerplexityBot`,
  `Google-Extended`).
- `llms.txt` + `llms-full.txt` (`public/`) — conteúdo 100% derivado do que já está publicado
  (Hero, FAQ, Capabilities, Guarantees reais de `data.ts`), nada inventado.
- `title`/meta description/OG — reescritos com palavra-chave real (`Marketing Digital, CRM
  com IA e Mensageria`), mantendo o gancho de marca como OG description.
- `GoogleTags.tsx` (novo componente) — GTM + GA4 + Google Consent Mode v2 (padrão negado,
  LGPD), montado em `layout.tsx`. **Inerte** sem `NEXT_PUBLIC_GTM_ID`/`NEXT_PUBLIC_GA4_ID`.
- `trackEvent.ts` (novo helper) — telemetria defensiva (nunca quebra com adblocker), wired
  nas 3 CTAs reais da página (`page.tsx`): "Entrar" (`login_click`), abrir contato com
  especialista (`abrir_contato_especialista`), abrir detalhe de módulo
  (`abrir_detalhe_modulo`) — e na macro-conversão real, só após sucesso confirmado da API
  (`SpecialistContactModal.tsx` → `generate_lead`, nome padrão já reconhecido pelo GA4).
- `metadata.verification.google` — lê `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, inerte sem valor.
- `.env.example` + `scripts/vps/deploy-github.sh` — 3 novas variáveis (`PROD_GTM_ID`,
  `PROD_GA4_ID`, `PROD_GOOGLE_SITE_VERIFICATION`), só no ambiente de produção (nunca
  staging — não queremos tráfego de teste no GA4 real nem Search Console indexando staging).

### 9.2 — Decisão sua, de estratégia (não precisa de conta nova, só de uma resposta)

1. **Criar `/blog` ou `/recursos`** — sim/não, e se sim, quem escreve e mantém os artigos continuamente (é o pilar que mais pesa pro ranking competitivo, mas só funciona com conteúdo novo de verdade, não é tarefa de 1 sessão).
2. **Ordem de execução** — recomendo F0 (medição) → F1 (on-page/schema) → F2 (GEO técnico) em paralelo, F3/F4 (conteúdo/autoridade) depois. Confirma essa ordem ou prefere outra?

### 9.3 — Status real (atualizado em 2026-10-30, pós-deploy)

**Fase 0 — CONCLUÍDA, verificada ao vivo em produção:**
- ✅ **Google Analytics 4** criado (`G-ZR6EMBG2HD`), confirmado carregando em `artemis9.com.br/artemis4`.
- ✅ **Google Search Console** — propriedade `https://www.artemis9.com.br/` verificada (método Tag HTML).
- ✅ **Sitemap submetido e processado** — `/sitemap.xml` ciente de domínio (fix `abf44a8`/PR #14), 1 página encontrada (`/artemis4`), status "Processado".
- ⏭️ **Google Tag Manager** — pulado deliberadamente (GA4 já carrega direto via gtag.js, sem precisar do GTM no meio). Pode ser adicionado depois só com a env var `PROD_GTM_ID`, sem mudança de código.

**Ainda pendente, sem bloquear nada do que já está no ar:**

| O que | Onde | O que eu preciso de volta |
|---|---|---|
| Cadastrar **Google Business Profile** | `business.google.com` | Confirmação de que foi feito com o mesmo nome/telefone/endereço já reais no `Organization` JSON-LD |
| Confirmar o **Meta Pixel ID** atual | Já existe na plataforma (tenant master) | Confirmar se é esse mesmo que deve valer pra esta landing, ou se precisa de um dedicado |
| Perfis reais de redes sociais (Instagram/LinkedIn/Facebook), se existirem | — | As URLs reais, pra entrar no `sameAs` — sem isso, esse campo fica fora por agora |
| **Fase 3 — hub de conteúdo (`/blog`)** | — | Usuário escreve/mantém; eu cuido da parte técnica (SEO on-page, schema, publicação) — ainda não iniciado |
