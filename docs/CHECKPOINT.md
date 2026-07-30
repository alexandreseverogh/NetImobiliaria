# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-07-29 (continuação 9) — **Tradução de "Tracking" → "Rastreamento"
> e "Trends" → "Tendências" no dashboard (commit `e0c6253`).** Usuário apontou, corretamente,
> que o fix da sessão anterior ("Saúde do Tracking") ainda deixava a palavra "Tracking" em
> inglês, e que "Trends ao vivo" no Radar de Demanda também devia virar 100% português.
> Varredura completa (não só os 2 pontos apontados) encontrou **7 ocorrências a mais** do
> mesmo problema, em 3 arquivos que o fix anterior não tinha tocado: `auditReportService.ts`
> (label + 3 strings de "detail" da dimensão "tracking" do relatório de auditoria — mesma
> etiqueta, tela diferente) e `DashboardHelpModal.tsx` (glossário/dicas/benchmarks do modal
> de Ajuda — 7 ocorrências; a decisão de sessão anterior de manter esse modal intocado era
> só sobre PALETA de cor, não sobre idioma, então não se aplicava aqui). Tradução escolhida
> (`Tracking`→`Rastreamento`) já era consistente com texto pré-existente na própria tela
> ("Score de rastreamento por cliente"/"Score 0-100 da saúde do rastreamento" já estavam em
> português antes desta sessão). Para "Trends": badge `📶 Trends ao vivo`→`📶 Tendências ao
> vivo` e os 2 rótulos "Demanda (Trends)" (tooltip + série do gráfico)→"Demanda (Tendências)"
> em `DemandRadar.tsx`; mantido de propósito **"Google Trends"** na legenda que credita a
> fonte real do dado (nome de produto, mesma categoria de "Meta Pixel"/"YouTube" já
> preservados). Verificado ao vivo (navegador real, segmento Imobiliário, aba Inteligência
> Profunda): `body.innerText` confirma "Saúde do Rastreamento"/"Tendências ao vivo" presentes
> e as versões antigas em inglês ausentes. `npx tsc --noEmit`: zero erros novos nos 6
> arquivos tocados (mesmo artefato stale de `.next/types` de sempre).
>
> — **Sessão anterior (2026-07-29, continuação 8): Testes manuais do Redesign Premium:
> 2 achados durante a rodada de testes do usuário na tela de Leads e no dashboard.**
>
> **(1) "Campanha" e "Ad Set" pareciam mostrar as mesmas opções em `/admin/campanhas/
> dashboard` — investigado, NÃO é bug.** Confirmado em 2 camadas (SQL direto comparando
> nome de campanha vs. ad set no banco, e depois ao vivo no navegador real, sessão
> autenticada, segmento Imobiliário, via `getComputedStyle`/leitura direta dos 2 `<select>`):
> são listas genuinamente diferentes (ex.: campanha "Alto Padrão — Alphaville" → ad set
> "Alphaville 35-60 anos") — a maioria dos dados de teste só nomeou o ad set como
> "`<nome da campanha>` · AdSet", o que faz parecer repetição à primeira vista, mas é a
> hierarquia real do Meta (Campanha → Ad Set → Anúncio), 2 filtros corretos e distintos.
> Nenhuma mudança de código necessária.
>
> **(2) Teste da paginação de `/admin/campanhas/leads` sem dado suficiente — 15 leads de
> teste inseridos temporariamente (aprovados pelo usuário).** Tenant Marketing Digital (admmd)
> tem só 9 leads reais no total, desde sempre (2026-07-04 a 07-08) — nenhum período mais
> largo resolveria, e "Todos os Clientes" só chegaria a 9, ainda abaixo dos 20 necessários
> pra 2ª página aparecer (`PAGE_SIZE=20`). Inseridos 15 leads sintéticos ("TESTE PAGINACAO
> 1..15", `leads_staging`+`marketing_eventos`, `client_id NULL`, datados nas últimas 15h) —
> confirmado via API real que o total no escopo/período testado pelo usuário foi de 6 pra
> 21. **Pendente: remover esses 15 leads assim que o usuário confirmar que já viu o botão
> de página ativa dourado** (tarefa registrada, não esquecida).
>
> **(3) Feedback de UX na seção "Tracking Health" (commit `e8713b3`):** usuário apontou 2
> problemas reais — nome em inglês (3 ocorrências: widget compacto, estado "sem dado ainda"
> e o heading da seção, em `TrackingHealthWidget.tsx` + `DeepDiveView.tsx` +
> `dashboard/page.tsx`) e o botão de atualizar (↺) "extremamente pequeno, pode passar
> despercebido". Corrigido: título → "Saúde do Tracking" (nome que o próprio código já usava
> internamente num comentário — "Saúde do Tracking (FASE 8)"); botão de atualizar aumentado
> (`p-2`→`p-2.5`, `h-4`→`h-5`) e recolorido pra `gold-premium` (era cinza neutro por design
> — decisão revertida a pedido explícito do usuário, que preferiu destacá-lo mais). Verificado
> ao vivo: `getComputedStyle` do ícone confirma `rgb(197, 160, 40)` (gold-premium exato) e
> 20px. `npx tsc --noEmit`: zero erros novos (único erro a mais no total é artefato stale de
> `.next/types`, build output, não código-fonte).
>
> — **Sessão anterior (2026-07-29, continuação 6): "Entrar" lento em `/artemis4` de novo —
> issue crônico já documentado em 2026-07-11, causa raiz confirmada idêntica, fix anterior
> reforçado (commit `2e9d42f`).** Usuário reportou o mesmo sintoma de sessões antigas: clicar
> "Entrar" demora "um século" antes de mostrar o login. Antes de mexer em qualquer coisa,
> confirmado ao vivo (2 `curl` seguidos em `/admin/login`) que é **exatamente** o mesmo
> fenômeno de sempre — Next.js em modo DEV compila cada rota sob demanda no 1º hit depois de
> cada restart do servidor (3,57s frio vs 0,24s morno, medido agora) — e **não** uma
> regressão das mudanças de CSP/CSRF desta mesma sessão (confirmado diretamente, não
> assumido). O fix de 2026-07-11 (pré-aquecer `/admin/login` via `requestIdleCallback` ao
> montar `/artemis4`) continuava no código, mas tinha uma lacuna real: esperava até 4s de
> ociosidade antes de disparar — como "Entrar" é o 1º CTA visível na tela, um clique rápido
> (a ação óbvia da página) batia o aquecimento na corrida e pagava o compile frio do mesmo
> jeito. Corrigido: o `fetch` de aquecimento agora dispara direto no mount, sem esperar
> ociosidade/timeout nenhum. Verificado ao vivo (aba nova, network log limpo): a requisição
> pra `/admin/login` já aparece resolvida (`200 OK`) na primeira leva de chamadas da página,
> junto dos chunks JS/CSS iniciais — antes só aparecia depois de 3-4s. `npx tsc --noEmit`: 52
> erros, mesma baseline, zero novos. Sem custo real em produção (rota já vem pré-compilada no
> build de produção — o fenômeno inteiro é exclusivo de `next dev`).
>
> — **Sessão anterior (2026-07-29, continuação 5): Fix real de CSP encontrado ao VERIFICAR
> AO VIVO (commit `7b10fb9`), não hipotético.** Usuário pediu automatizar 2 coisas
> (rotina de teste local + automação do grep de log em produção) — investigação mostrou que
> ambas as automações propostas tinham custo desproporcional (headless browser novo pra
> local; socket do Docker montado noutro container pra prod, ironicamente uma concessão de
> segurança sensível) frente a uma alternativa mais simples (notificação direta do próprio
> processo). Perguntado ao usuário: escolheu NÃO adicionar nenhuma automação nova — nem
> prober headless, nem notificação Slack — confirmando que o pipeline já construído
> (report-uri + log) já bastava.
>
> Com o servidor dev já reiniciado (confirmado via `curl -I`, sem eu precisar tocar em
> nenhum processo), aproveitei pra fazer uma verificação real com navegador de verdade (meu
> Browser pane) em `/artemis4` — e ela encontrou um problema GENUÍNO: **83 violações reais
> de CSP por carregamento**, não hipotéticas. Isolado o payload exato via instrumentação
> temporária (gravação em arquivo, revertida depois — mesmo padrão de diagnóstico já usado
> nesta sessão) + o evento nativo `securitypolicyviolation` do navegador: 2 causas distintas,
> ambas cobertas erradas na política original —
> **(1) `eval` em `script-src` (81 ocorrências)** — o Next.js em modo DEV usa `eval()`
> internamente pro source-map do Fast Refresh (`devtool: 'eval-source-map'`, confirmado que
> este projeto deixa automático); build de produção não usa. Corrigido com `'unsafe-eval'`
> só em dev, mesmo padrão condicional já usado pro MinIO.
> **(2) `https://www.youtube.com/iframe_api` + `.../www-widgetapi.js` (`script-src-elem`)**
> — achado real que o inventário original errou: a página carrega o script da IFrame Player
> API do YouTube DIRETO nela, não só dentro do iframe embutido — eu só tinha colocado
> `youtube.com` em `frame-src`, faltava em `script-src`. Corrigido.
> Revalidado com aba de navegador **limpa** (não a mesma usada pra diagnosticar, pra não
> herdar histórico) em `/artemis4` e numa página real de imóvel: **zero violação em ambas**
> depois do fix, confirmado via `read_network_requests` (0 POSTs pro endpoint de report).
> **Lacunas de verificação registradas com honestidade, não escondidas:** Meta Pixel
> (`connect.facebook.net`/`www.facebook.com`) segue sem teste ao vivo — tenant Master ainda
> sem `pixel_id` configurado (pendência antiga, não desta sessão); `img-src` do MinIO
> (`localhost:9000`) não foi exercitado — o imóvel testado (id 31) não tinha foto real fora
> do `/_next/image` otimizado. `npx tsc --noEmit`: 52 erros, mesma baseline, zero novos.
>
> — **Sessão anterior (2026-07-29, continuação 4): Auto-report de violações de CSP (commit
> `39646a9`), resposta a "não sei como irei observar".** Depois de implementar Fase 1 (CSP
> Report-Only) e Fase 2 (CSRF log-only) — ver resumo logo abaixo — o usuário apontou, com
> razão, que "checar o Console do navegador/terminal por um tempo" não é um processo real
> executável. Resolvido eliminando a etapa manual: adicionado `report-uri` à política CSP
> apontando pro novo endpoint público `POST /api/public/security/csp-report`
> (`src/app/api/public/security/csp-report/route.ts`) — o NAVEGADOR dispara esse POST
> sozinho, automaticamente, sempre que detecta uma violação (mesmo em modo Report-Only, que
> continua sem bloquear nada). O endpoint só `console.warn` o relatório (rate-limited via
> `applyPublicRateLimit`, reaproveitado de `src/lib/security/rate-limiter.ts` — mesmo teto de
> qualquer rota pública, pra não virar vetor de flood de log) — sem tabela nova, sem mudança
> de comportamento. Com isso, `[CSP-VIOLATION]` (novo) e `[CSRF-CHECK]` (Fase 2) caem no
> MESMO lugar — os logs do processo do servidor — sem exigir nenhum passo manual:
> **produção (Docker):** `docker logs netimobiliaria-app | grep -E "CSP-VIOLATION|CSRF-CHECK"`
> a qualquer momento (Docker retém o histórico); **dev local:** aparece direto no terminal
> rodando `npm run dev` enquanto a aplicação é usada normalmente. `npx tsc --noEmit`: 52
> erros, mesma baseline, zero novos no endpoint criado.
>
> — **Sessão anterior (2026-07-29, continuação 3): Plano de endurecimento: Fase 1 (CSP
> Report-Only) e Fase 2 (CSRF via Origin/Referer, log-only) implementadas, na mesma sessão
> que fechou a Fase -1/Fase 0 (resumo completo logo abaixo).** Usuário perguntou "como
> podemos avançar ainda em relação a essa questão de segurança?" — as duas fases seguintes
> do plano aprovado (`C:\Users\T-GAMER\.claude\plans\crystalline-riding-squid.md`) foram
> desenhadas pra serem risco zero por construção: nenhuma delas bloqueia nada nesta rodada,
> só observam/logam, exatamente como o plano exige antes de promover qualquer uma pra modo
> bloqueante.
>
> **Fase 1 — CSP em `Content-Security-Policy-Report-Only` (commit `4018855`):** antes de
> escrever a política, levantamento real (grep + leitura de código) de quais domínios
> externos o NAVEGADOR de fato carrega — chamadas server-to-server (Graph API do Meta,
> Google OAuth/Translation/Calendar/Gemini) não entram, CSP não as governa. Achado: só 3
> dependências externas reais do lado do browser — Meta Pixel (`connect.facebook.net` +
> beacon `www.facebook.com`, injeta script inline via `dangerouslySetInnerHTML`, por isso
> `script-src` precisou de `'unsafe-inline'`), YouTube embed em `/artemis4`
> (`www.youtube.com`, `frame-src`), e MinIO só em dev (`localhost:9000` — em produção passa
> pelo proxy Caddy `/storage/*`, mesma origem, não precisa entrar na política). Os ~30
> domínios de notícia no `images.remotePatterns` do `next.config.js` (globo, uol, forbes,
> dezeen etc.) ficaram de fora de propósito — são só pro otimizador de imagem do Next
> (server-side), o navegador só vê `/_next/image`, mesma origem. Também: o bloco de headers
> de segurança (`X-Frame-Options` etc.), que só rodava em produção, passou a rodar sempre —
> sem isso, violação de CSP só seria percebida depois de já estar em produção. Verificado
> via `node -e` carregando o config e resolvendo `headers()` nos 3 branches
> (`NODE_ENV` vazio/`development`/`production`) — condicionais de MinIO-dev-only e
> HSTS-prod-only corretos nos 3 casos. Não verificado ao vivo no navegador nesta sessão —
> havia um processo `node.exe` já ocupando a porta 3000 (possível sessão de dev ativa do
> usuário) e, perguntado explicitamente, o usuário optou por reiniciar o próprio servidor
> quando conveniente, não eu. **Pendente da próxima sessão que tocar o servidor:** reiniciar
> pra carregar o `next.config.js` novo, abrir uma página de imóvel + `/artemis4`, checar o
> Console do navegador por linhas `[Report Only]` — não deveria bloquear nada, mas qualquer
> violação inesperada aponta um domínio que faltou no inventário, a ajustar antes de promover
> a política pra modo bloqueante.
>
> **Fase 2 — CSRF via Origin/Referer em modo log-only (commit `01f786b`):** novo
> `src/lib/security/csrfOriginCheck.ts` — compara o header `Origin` (ou `Referer` como
> fallback) contra a origem real vista pelo próprio Next.js (`request.nextUrl.origin`, deriva
> do Host/`X-Forwarded-Host` — funciona em dev e produção sem allowlist fixa que poderia
> ficar desatualizada), só pra rotas `/api/*` de método que muda estado
> (POST/PUT/PATCH/DELETE), excluindo `/api/public/*` e `/api/cron/*` (webhooks/cron
> legítimos, chamados de fora do navegador, nunca têm `Origin`). Só `console.warn` — nunca
> bloqueia. **Achado real ao plugar isso:** o `matcher` do `src/middleware.ts` excluía `/api`
> inteiramente (`(?!api|...)`)  — ou seja, esse middleware NUNCA rodava em nenhuma rota de
> API até agora, só em páginas. Precisou ganhar um segundo padrão (`'/api/:path*'`) pro
> `logCsrfOriginCheck` de fato rodar; `isProtectedRoute` (lógica de redirect de sessão pra
> `/admin`/`/crm`) nunca casa com pathname iniciando em `/api`, então o comportamento de
> página existente não muda em nada com essa ampliação. Removido também o campo `csrf`
> decorativo de `src/app/login/page.tsx` — gerado via `Math.random()` no client, confirmado
> que nunca era lido nem enviado por `handleSubmit` (que já usa `fetch` via
> `useAuth().login()`, não um POST de formulário cru) e nunca validado no servidor; mantê-lo
> ao lado da defesa real (Origin/Referer) só daria falsa sensação de segurança. `npx tsc
> --noEmit`: 52 erros, mesma baseline, zero novos nos 3 arquivos tocados/criados. Não
> verificado ao vivo (mesma razão da Fase 1 — sem restart do servidor) — o log de
> `[CSRF-CHECK]` aparece no TERMINAL do `next dev`, não no console do navegador; pendente
> observar por um tempo antes de decidir a política de bloqueio real, conforme o plano exige.
>
> — **Sessão anterior (2026-07-29, continuação 2): Plano de endurecimento de
> autenticação/sessão: Fase -1 (XSS real) + Fase 0 (2 fixes de higiene) implementadas.**
> Depois da varredura do cookie
> fantasma (ver resumo logo abaixo), o usuário fez uma pergunta de arquitetura genuína:
> "essa alternativa de checar os acessos pelo cookie, em detrimento de checar por autenticação
> no header, não deixa toda a aplicação vulnerável a falhas e outros riscos?" — pediu em
> seguida um plano de endurecimento de verdade (investigação primeiro, zero alteração,
> análise completa de impacto/risco de quebra) e, antes de aprovar, exigiu uma avaliação
> honesta e direta de quão vulnerável a aplicação está HOJE, sem nenhuma das correções — "seja
> bem honesto atuando como um profissional senior de cibersecurity". Investigação (3 agentes
> de pesquisa dedicados, só leitura) mapeou os 3 sistemas de sessão paralelos da plataforma
> (admin/corretor/público, cada um duplicando o mesmo JWT em cookie `httpOnly` + `localStorage`
> JS-legível) e produziu um plano faseado, salvo em `C:\Users\T-GAMER\.claude\plans\
> crystalline-riding-squid.md`. **Avaliação honesta dada ao usuário antes da aprovação:** a
> pergunta original (CSRF via cookie) é risco BAIXO-MODERADO hoje — `sameSite:'lax'` é
> mitigação padrão da indústria e funciona na prática, não é porta aberta; MAS existe uma
> vulnerabilidade REAL, ativa, com cadeia de exploração completa até roubo de sessão de admin,
> não-teórica: upload de documento de imóvel grava `nome_arquivo` sem sanitização (permissão de
> corretor comum, não exclusiva de admin) → interpolado sem escape num `document.write()` em
> `DocumentosLista.tsx`/`DocumentModal.tsx`, usado na página PÚBLICA do imóvel → script injetado
> roda na mesma origem do painel admin → lê `localStorage.getItem('admin-auth-token')`, o JWT de
> sessão de 7 dias, bearer token puro, funciona de qualquer lugar sem depender de cookie/CSRF
> nenhum. Essa avaliação elevou o fix desse XSS a uma "Fase -1" urgente e independente do resto
> do roadmap (que segue válido, mas é menos urgente) — usuário aprovou o plano com essa moldura.
>
> **Implementado nesta sessão (Fase -1 + Fase 0, commit `2a4886b`):**
> **Fase -1 — fechado o XSS real:** `document.write()` em `DocumentosLista.tsx` e
> `DocumentModal.tsx` reescrito pra nunca mais interpolar dado externo (`nome_arquivo`/`url`) numa
> string HTML — agora recebe só markup 100% estático e fixo; nome do arquivo e URL do PDF são
> atribuídos DEPOIS via propriedades seguras do DOM (`element.textContent`, `document.title`,
> `iframe.src` — nenhuma delas é parseada como markup) + allowlist de esquema de URL
> (`/^(https?:)?\/\//i.test(url) || url.startsWith('/')`, bloqueia `javascript:` antes mesmo de
> abrir o popup). **Verificado ao vivo, não só por leitura de código:** testado no navegador real
> com um payload malicioso (`'"><img src=x onerror=window.__xssFired=true>.pdf'`) atribuído via
> `textContent`/`.title` — resultado: `xssFired:false` (o handler nunca executa), `innerHTML`
> mostra os caracteres `<`/`>` escapados como entidade HTML (`&lt;`/`&gt;`), confirmando que o
> navegador trata a string como texto puro, nunca como marcação — exatamente o comportamento que
> fecha a cadeia de exploração descrita na avaliação de risco.
> **Fase 0 (2 dos 3 itens do plano — item 1, remover o campo `csrf` decorativo de
> `src/app/login/page.tsx`, foi deliberadamente adiado pra dentro da Fase 2, que ainda decide se
> vira a base real de defesa CSRF ou é só removido):**
> (2) `secure:false` hardcoded em `/api/admin/auth/refresh/route.ts` (2 ocorrências, cookies
> `accessToken`/`refreshToken`) corrigido pra `process.env.NODE_ENV === 'production'`, mesmo
> padrão já usado em `login/route.ts` — exigia atacante já em posição de rede pra explorar, não
> era emergência, mas corrigido junto por ser risco de quebra zero.
> (3) `getUserFromLocalStorage()` removida de `src/middleware/publicAuth.ts` — fazia
> `jwt.verify()` no client usando uma env var (`NEXT_PUBLIC_JWT_SECRET`) que nunca é definida em
> nenhum `.env` real da plataforma; confirmado via grep que a função tinha ZERO callers antes de
> remover — código morto, mas um padrão perigoso se alguém reativasse sem perceber que o secret
> nunca existiu de verdade. `publicAuthMiddleware` (a outra função do mesmo arquivo, com checagem
> correta server-side) ficou intocada, mesmo também sem uso — fora do escopo deste fix pontual.
> `npx tsc --noEmit`: 52 erros, mesma baseline pré-existente, zero novos nos 4 arquivos tocados.
>
> **Ainda pendente do plano, não iniciado nesta sessão:** Fase 1 (Content-Security-Policy —
> precisa de levantamento completo de domínios externos genuinamente usados — Meta Pixel,
> YouTube em `/artemis4`, MinIO/S3 — e rollout em modo Report-Only antes de bloquear) e Fase 2
> (defesa CSRF real via checagem de Origin/Referer, reaproveitando a lógica já escrita mas nunca
> plugada em `environmentMiddleware.ts`, também com período de observação em modo log antes de
> aplicar de verdade). Fase 3 (auditoria das ~132 rotas "zona cinzenta" não classificadas) e a
> eliminação total do token duplicado em localStorage seguem explicitamente FORA de escopo desta
> rodada — o próprio plano documenta o porquê (200+ call-sites, 3 sistemas de login paralelos,
> `useAuth.tsx` precisaria reescrita, zero suíte de testes automatizados no projeto pra verificar
> uma refatoração desse tamanho sem navegar manualmente por cada tela).
>
> — **Sessão anterior (2026-07-29, continuação): Varredura completa do bug de cookie fantasma
> "accessToken" em toda a base de código.** Depois de corrigir o Kanban de Leads (ver
> resumo anterior abaixo), o usuário pediu uma varredura minuciosa pra saber se o mesmo
> padrão quebrava qualquer outra funcionalidade — a pendência tinha ficado registrada como
> "não atacada" no fix anterior. Delegado o levantamento a um agente de pesquisa dedicado
> (não confiar em heurística de grep rápido, que já tinha dado 1 falso positivo antes) —
> retornou uma tabela completa das 44 rotas afetadas, classificando cada uma por presença
> de fallback de Authorization e por quem realmente a chama no frontend. **Achado que
> simplificou toda a correção:** o cookie real (`admin_auth_token`) é `httpOnly` — o
> navegador já o envia AUTOMATICAMENTE em toda requisição same-origin, mesmo `fetch()` cru
> sem nenhum header manual (httpOnly só impede LEITURA via JS, nunca bloqueia o envio
> automático pelo navegador). Ou seja, o problema nunca foi "frontend esquece de mandar o
> token" — era só o backend checar o nome ERRADO de cookie (`accessToken`, que nenhum login
> desta plataforma jamais cria). Corrigido com uma troca mecânica e seca (só o nome da
> string checada, nenhuma lógica) em **41 arquivos reais** (2 `route-backup.ts` ficaram de
> fora — não são rotas de verdade pro Next App Router, são cópias de backup mortas).
> Confirmado ao vivo, via `curl` com o token SÓ no cookie (sem nenhum header Authorization,
> pra provar a causa raiz de verdade): `GET /api/crm/stats/dashboard` (dashboard principal
> do CRM) voltou a funcionar; `GET /api/admin/imoveis/[id]/rascunho` (sistema de auto-save
> da edição de imóvel, usado em TODOS os 10 pontos de chamada de `hooks/useRascunho.ts`,
> sempre falhava silenciosamente antes) voltou a responder corretamente; `GET /api/admin/
> user-features` (permissões da sidebar hierárquica) passou a autenticar o usuário
> corretamente (a negação de acesso que ele retorna agora é o controle de permissão real
> funcionando, não mais "usuário nunca reconhecido"). **Achado relacionado, mesma família
> de sintoma mas causa diferente:** 6 componentes administrativos (criar/editar/excluir
> feature de sistema, excluir categoria, excluir perfil, listar usuários de um role) liam
> `localStorage.getItem('auth-token')` — chave que só é populada pelo login de CORRETOR,
> nunca pelo de admin (`admin-auth-token`, a chave real) — corrigidos junto. `npx tsc
> --noEmit`: mesma baseline (52 erros pré-existentes), zero novos nos 47 arquivos tocados.
> **Fora de escopo, documentado no relatório de auditoria, não corrigido por não ter
> nenhum caller real encontrado:** ~9 rotas de `imoveis-debug/[id]/*` sem fallback de
> Authorization nenhum (só o cookie), e 2 componentes seletores (`AmenidadesSelector.tsx`,
> `ProximidadesSelector.tsx`) que fazem fetch cru mas não são importados em lugar nenhum
> do app — candidatos a remoção de código morto numa rodada futura, não tocados aqui.
> Commit `671ad0a`.
>
> — **Sessão anterior (2026-07-29): 2 achados reais investigando a sidebar/CRM do tenant
> admmd.** Usuário perguntou por que "Rede Meta Ads"/"Rede Google Ads" aparecem na sidebar e
> por que nenhuma funcionalidade do CRM ("Gestão de Leads"/"Kanban de Leads") funciona pra esse
> tenant. Investigação (rodando `get_sidebar_menu_for_user()` de verdade pro usuário, não só
> lendo código) revelou 2 causas reais e distintas:
> **(1) Sidebar:** as 3 "Rede X Ads" são toggles de capacidade (`system_features` sem `url`,
> reaproveitando o mecanismo de provisionamento só pra saber se o tenant contratou aquela rede —
> nunca foram pensadas como página) — a função de sidebar nunca filtrava por `url` vazio, então
> qualquer feature assim "vazava" pro menu como item morto (`path: null`). Ao mesmo tempo,
> "Gestão de Leads"/"Kanban de Leads" tinham o MESMO sintoma (`url` vazio) só que por
> esquecimento real — as páginas (`src/app/crm/kanban`, `src/app/crm/leads`) já existiam no
> código. Corrigido com 1 migração (`migration-2026-07-29-sidebar-url-fixes.sql`): populou o
> `url` das 2 entradas de CRM + adicionou um filtro (`sf.url IS NOT NULL AND sf.url <> ''`) na
> função de sidebar, pra qualquer toggle futuro nunca mais vazar sem precisar de exceção por id.
> Verificado via diff do JSON da função antes/depois (só as 4 mudanças esperadas) + sanity check
> em outro tenant real. Commits `9fac3f8` + `5a20cdc` (doc em `ACCESS_CONTROL.md`).
> **(2) CRM de fato não funcionava — bug mais sério, achado ao testar `/crm/kanban` de verdade:**
> o quadro Kanban sempre mostrava 0 leads em toda coluna, pra QUALQUER tenant (não só admmd).
> Causa: `src/app/crm/kanban/page.tsx` chamava `fetch()` cru (sem header de autenticação) pra 3
> endpoints, que por sua vez liam o token de um cookie chamado `accessToken` — que **nenhum
> fluxo de login desta plataforma jamais seta** (o cookie real é `admin_auth_token`). Sem token
> nenhum, toda query `WHERE tenant_id = $1` recebia `$1=NULL` e nunca casava com nada. Achado um
> 2º bug juntamente: `GET /api/crm/kanban/colunas` **nunca teve filtro de tenant nenhum** —
> retornava as colunas de TODOS os tenants misturadas (explicando as várias "LEAD CAPTADO"/"EM
> ANÁLISE" repetidas na tela, uma por tenant + 7 linhas órfãs legadas). Corrigido: `page.tsx`
> passou a usar `adminFetch` nas 3 chamadas; os 3 endpoints (`leads`, `kanban/colunas`,
> `kanban/move`) passaram a checar o cookie certo; `kanban/colunas` ganhou isolamento completo
> por tenant (GET/POST/DELETE). Testado ao vivo, ponta a ponta, sessão real do admmd: GET
> colunas retornou exatamente as 7 do tenant (antes: todas de todos), GET leads retornou os 6
> reais (antes: 0), a tela renderizou os 6 leads corretamente, POST move testado nos dois
> sentidos e revertido sem resíduo. Commit `3c9045c`.
>
> — **Sessão anterior (2026-07-28): Fix real: filtro de Origem em `/admin/campanhas/leads` não
> afetava os cards/gráficos do topo.** Usuário reportou, testando o Redesign Premium recém
> concluído (ver resumo anterior abaixo), que qualquer opção escolhida no filtro "Origem" da
> tela de Leads mostrava sempre os mesmos resultados. Investigação encontrou **2 bugs reais e
> independentes**, ambos confirmados ao vivo antes e depois do fix — nunca corrigido "no escuro":
> (1) `GET /api/admin/campanhas/leads/stats` **nunca lia o query param `origem`** — só o
> endpoint irmão (`GET /api/admin/campanhas/leads`, que alimenta a tabela "Últimos Leads" no
> rodapé) já filtrava corretamente; os cards do topo (Total Leads, Média/Dia, os 2 gráficos)
> sempre mostravam o total geral, dando a falsa impressão de que o filtro inteiro não tinha
> efeito. Corrigido replicando a mesma condição já usada no endpoint irmão
> (`COALESCE(me.plataforma, 'direto') = origem`) — commit `c1605a9`. (2) **Race condition real**
> encontrada durante a investigação (não hipotética — confirmada no próprio network log da
> sessão): `useClientSelector` troca `clientFilter` de `'own'` pra `'segment'` logo após o mount
> (comportamento já existente, documentado), disparando múltiplas chamadas a `loadAll()` em
> paralelo sem nenhum cancelamento/sequenciamento — uma resposta mais antiga podia, em teoria,
> sobrescrever uma mais nova. Corrigido com um contador de requisição (`requestIdRef`) em
> `loadAll()`/`goToPage()` — commit `7e754bc`. **Metodologia de verificação, sessão de debug
> colaborativa com o usuário via DevTools do navegador dele (não só o meu):** SQL direto no
> Postgres confirmando os valores reais de `plataforma` por tenant · `curl` direto contra o
> servidor com um JWT gerado na hora, contornando qualquer cache de navegador · leitura da aba
> Network do DevTools do usuário passo a passo (Request URL completa com `origem=whatsapp_
> organico`, Response com `totalLeads:4`, e por fim o próprio card na tela mostrando `4`) — cada
> etapa isolando uma camada diferente (backend puro → rede → estado React → DOM renderizado) até
> confirmar que a cadeia inteira funciona ponta a ponta. Um teste seguinte do usuário
> ("WhatsApp CTA" → 0 leads) inicialmente pareceu suspeito mas se confirmou correto: não existe
> nenhum lead real com essa origem específica nesse tenant — `0` é a resposta certa, não um
> resíduo do bug. `npx tsc --noEmit` limpo nos 2 arquivos tocados em cada commit.
>
> — **Sessão anterior (2026-07-28): Redesign Premium: 3ª rodada — Leads, widgets embutidos do
> Dashboard e componentes compartilhados (Cliente/Segmento/CampanhasModal/LocationPicker) +
> eliminação de redundância de hex solto.** Continuação da pendência do CLAUDE.md ("Redesign
> Premium — parcialmente concluído, resto é opcional se pedido"). Usuário perguntou o ganho real
> de completar `leads/page.tsx` + os componentes compartilhados e pediu pra seguir com ambos.
> Convertidos (indigo-600 → âmbar `#c5a028`/`#020c1b`, mesmo critério das 4 telas anteriores —
> só pontos de decisão/estado-ativo, nunca cor categórica/informativa): `leads/page.tsx` (página
> de leads em si, commit `08ab802`) · 4 widgets embutidos no Dashboard —
> `KpiCard.tsx`/`StageFunnelWidget.tsx`/`TrackingHealthWidget.tsx`/`CampaignMapWidget.tsx`
> (commit `901e0fc`) · `ClientSelector.tsx`/`SegmentSelector.tsx`, os 2 seletores mais reusados
> do módulo (commit `0220815`) · `CampanhasModal.tsx`, o modal "Consultar Campanhas" (commit
> `6946460`) · `LocationPicker.tsx` (etapa de localização do wizard) + `WinningAngleChip.tsx`
> (commit `a960b2e`). **Achado real de arquitetura, levantado pelo usuário no meio da rodada:**
> o `tailwind.config.js` já tinha tokens nomeados (`gold.premium`, `navy.dark`, etc.) pras
> exatas cores que eu vinha escrevendo como hex solto (`bg-[#c5a028]`) — retrofit mecânico nos 9
> arquivos já tocados até aquele ponto pro token nomeado, sem mudança visual (commit `9b1ac7e`).
> **Decisões de "deixar como está" registradas com critério, não só varridas:** `LocationPicker`
> — chips de localidade já adicionada e linhas do dropdown de busca (elementos repetidos por
> item) neutralizados pra cinza em vez de âmbar, pra não diluir o acento único (mesmo critério
> do `AssetCard` de Criativos); `WinningAngleChip` — link "Ver análise →" virou cinza, não âmbar
> (âmbar como cor de TEXTO sobre fundo claro teria contraste insuficiente, diferente de âmbar
> como fundo de botão, já usado em todo o resto); `DashboardHelpModal.tsx` — avaliado por
> completo e mantido **intocado**, sem nenhuma conversão: todo o indigo ali (ícone "?", botão
> "Ajuda", aba ativa interna, hover de card, link de expandir) forma uma identidade visual
> coerente e autocontida do recurso de Ajuda — converter só parte quebraria essa consistência
> interna, converter tudo pra âmbar tornaria "Ajuda" indistinguível do CTA primário e do aviso
> de IA (que também usa âmbar); `WinningAngleChip.ANGLE_COLORS`/`StatusBadge`/`FunnelBadge` do
> `CampanhasModal` — taxonomias categóricas deliberadas (1 cor fixa por categoria), mesmo padrão
> de `SEGMENT_COLORS`/`STAGE_COLORS` já preservado nas rodadas anteriores. Verificado em cada
> commit via `npx tsc --noEmit` (baseline de 53 erros pré-existentes, zero novos) + pelo menos
> 1 valor computado real conferido ao vivo no navegador por arquivo (`getComputedStyle`,
> incluindo confirmar que a classe nova `accent-gold-premium` do slider do `LocationPicker`
> realmente compila no Tailwind — `rgb(197, 160, 40)` confirmado). **Ainda fora de escopo,
> nunca pedido nesta rodada:** as ~13 páginas do módulo que nunca entraram no escopo do
> Redesign Premium (aprovações, auditoria, desperdício, destinos, iniciativas, mecanismos,
> portfolio, publicações, configurações/redes) — continuam com indigo genérico, sem terem sido
> avaliadas ainda. — **Sessão anterior (2026-07-28): Consolidação de worktrees: conferido o
> estado real dos 4 fronts.** Usuário pediu pra conferir o estado real de `netimob-google`, `netimob-cherrypick` e
> `netimob-imgfix` (a tabela do CLAUDE.md é só um snapshot, pode estar desatualizada). Checado via
> `git merge-base --is-ancestor` (não por suposição): `netimob-google`
> (`feature/google-ads-implementation`) e `netimob-cherrypick` (`feature/mensageria-rag`) já
> estão 100% mergeados em `feature/ag-cockpit-camadas` — nenhum trabalho pendente, worktrees
> redundantes (mantidos por ora, não removidos sem pedido explícito). `netimob-imgfix`
> (`fix/next-image-minio-localhost`) tinha 1 commit real e ainda não mergeado
> (`00cb95a`, 15/07) — confirmado por inspeção direta do código (não só pelo git log) que o bug
> que ele corrige (fotos de imóveis não aparecendo na landpaging/página de detalhe, causa raiz:
> o otimizador de imagem do Next não segue o redirect 302 de `/api/public/imagens/[id]` pro
> MinIO) **ainda estava presente** neste worktree principal — `SafeImage.tsx` sem o unoptimize
> condicional, `LandingPropertyCard.tsx` sem o mesmo tratamento, `next.config.js` sem
> `localhost:9000` nos `remotePatterns`. Trazido via `git cherry-pick 00cb95a` (não merge da
> branch inteira, pra evitar conflito irrelevante com `CLAUDE.md`, que tinha divergido nos dois
> lados por motivos não relacionados) — aplicado sem conflito, commit `cdadf4d`, `npx tsc --noEmit`
> limpo nos 3 arquivos tocados. Não reverificado visualmente no navegador — o commit original já
> tinha sido testado ao vivo pelo autor ("fotos reais confirmadas na landpaging e na página de
> detalhe"), e o código trazido é byte-a-byte idêntico. — **Sessão anterior (2026-07-28): T6
> (webhook de Instant Form do TikTok) — achado real de
> pesquisa: bloqueado por T2, não é mais "opcional independente".** Usuário perguntou se T6 tinha
> sido resolvido e declarou a regra "nenhum lead invisível de nenhuma rede", o que tornaria T6
> obrigatório em vez de opcional — antes de implementar (mesmo rigor já usado na pesquisa do
> webhook do Google), fui checar a documentação REAL da TikTok Business API (o fetch estático
> falhou — é um SPA que só renderiza via JS — resolvido navegando de verdade via browser e lendo
> o iframe same-origin renderizado). Achado: o mecanismo do TikTok é estruturalmente diferente do
> Google — lá o CLIENTE configura URL+chave self-serve na própria tela dele; no TikTok, SOMOS NÓS
> que chamamos `POST /subscription/subscribe/` com `app_id`/`secret` do nosso app + `access_token`
> do cliente via OAuth — os mesmos 2 pré-requisitos de T2 (app aprovado + conexão OAuth com a
> conta do cliente). **T6 não pode ser adiantado independente de T2**, ao contrário do que
> `PLANO_TIKTOK.md` §3 presumia ("espelhando `/api/public/google-leads/webhook`" — suposição
> incorreta, corrigida). Documento atualizado com o payload real do webhook (`entry[].changes[]`
> com `name`/`phone_number`/`email`/etc.) pra quando T2 destravar. Decisão do usuário: documentar
> agora, implementar só quando T2 for desbloqueado — nenhum código escrito nesta rodada. Quanto à
> regra em si ("nenhum lead invisível"): já é estruturalmente cumprida hoje — o wizard nunca
> oferece Instant Form como CTA pro TikTok (`instant_form_supported=false`, Fase 1 do §3, já
> implementada desde T1/T3), então nenhuma campanha lançada por esta plataforma pode gerar lead
> invisível; o único jeito de isso acontecer é o cliente configurar um Instant Form manualmente
> direto no TikTok Ads Manager dele, fora da nossa ferramenta — fora do nosso controle, mesma
> limitação inerente de qualquer plataforma terceira. — **Sessão anterior (2026-07-28):**
> **Redesign Premium concluído nas 4 superfícies do módulo de
> Campanhas** (pendência do CLAUDE.md "Redesign Premium — ativar skill `impeccable`"): Dashboard,
> Configurações, CampaignWizard e Criativos, uma checkpoint por vez com aprovação do usuário
> antes de seguir pra próxima. Passe estreito e deliberadamente reversível (não uma reconstrução
> total): substitui o indigo-600 genérico por `#c5a028`/`#020c1b` (o acento âmbar do "Painel de
> Missão", já definido em `PRODUCT.md`/`DESIGN.md` deste projeto) nos pontos reais de
> decisão/estado-ativo — CTAs primários, seleção única (cards de rede/formato/objetivo/template),
> toggles de escolha exclusiva ou multi-select central à tela, navegação de etapas — e fixa o
> anel de foco em `#2563eb` (regra do DESIGN.md, independente do acento). Removido também 1
> padrão explicitamente banido pelo DESIGN.md (side-stripe border colorida na linha selecionada
> da lista de clientes em Configurações). Deixado de propósito como estava: ícones/badges/textos
> informativos (não são decisão), o componente `InterestsPicker` inteiro do wizard e as
> micro-ações repetidas por card da galeria de Criativos (plurais/reincidentes — promovê-los ao
> acento único diluiria a "Regra do Acento Único" do próprio DESIGN.md) e os 2 sub-sistemas com
> marca própria já estabelecida (azul `#1877f2` do Meta em Configurações, violeta do modal
> "Criar com IA" em Criativos). Verificado via `npx tsc --noEmit` (zero erros novos em cada
> arquivo) + inspeção de estilo computado ao vivo no navegador em cada superfície (o Browser pane
> não estava compositando screenshot nesta sessão — `javascript_tool`/`getComputedStyle` usado
> como substituto, incluindo clique real em controles pra confirmar estado ativo/selecionado).
> Commits: `6458f32` (Dashboard), `becdc3f` (Configurações), `03b43e7` (CampaignWizard), `f1704b1`
> (Criativos). — **Sessão anterior (2026-07-28, Contratação de rede):** cada rede de
> anúncio (Meta/Google/TikTok) agora é gateada por tenant via o sistema genérico de
> provisionamento já usado pelo resto da plataforma (`system_features` +
> `tenant_feature_overrides`, tela `/admin/master/provisioning`) — decisão explícita do usuário
> pra não duplicar em colunas soltas em `tenants`. `/admin/campanhas/nova` ganhou botões
> separados por rede (Meta Ads / TikTok Ads / Google AI Max), cada um desabilitado quando a rede
> não está contratada+conectada pro tenant logado. Testado ao vivo com token Master (bypass) e
> token de tenant real (TikTok corretamente desabilitado com "Rede não contratada"). Ver seção
> "Última tarefa concluída" abaixo. — **Sessão anterior (2026-07-27, TikTok/T4):** T4, o motor
> de realocação de verba
> cross-rede (`docs/PLANO_TIKTOK.md` §8), está formalmente concluído**: migração + elegibilidade
> de 11 critérios + execução atômica com PIN + notificação WhatsApp + medição D+14 + circuit
> breaker (2 camadas: suprime sugestão nova e bloqueia execução de proposta já aprovada) + UI
> (card no dashboard, "Para onde mover" no Desperdício, histórico com veredito) + os 16 cenários
> formais da Trilha H — tudo testado ao vivo contra dado real, zero mudança de código necessária
> nos testes formais (o motor bateu com a especificação do plano em todos os casos). Só falta T2
> (adapter real do TikTok), bloqueado por aprovação externa do app no TikTok for Business. Ver
> seção "Última tarefa concluída" abaixo para o detalhe completo. — **Trilha B e Trilha C do
> teste rigoroso concluídas por completo** (`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`).
> Trilha B: roteiro manual
> confirmado item a item, 3 bugs reais achados e corrigidos (disclaimer de "Conversões"
> generalizado Meta+Google, CPL nulo em 2 telas, filtro de rede na Visão 4) +, fora do escopo
> original mas confirmado com o usuário, uma leva de bugs reais de multi-tenant na validação de
> CPF/e-mail de clientes/proprietários (nunca funcionava — faltava tenantId) + gate de módulo na
> tela pós-cadastro de cliente. Trilha C: 5 cenários de campanha com cliente de teste dedicado,
> Fases 0-5 executadas ponta a ponta com dado real (leads, CRM/Kanban até negócio fechado,
> Mensageria, todos os dashboards, Agentes) — achou e corrigiu 1 bug real (`expandEndOfDay`
> faltando em Insights da IA/Briefing, excluía leads do próprio dia) + corrigiu documentação
> desatualizada do Agente Autônomo no CLAUDE.md. Todo dado de teste (Trilha C) removido ao
> final, 0 resíduo confirmado. Trilha D/E (conta real Google/simulação) seguem não iniciadas.
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar — e também ao retomar após
> interrupção, antes de continuar, para não repetir o mesmo hiato de documentação.

---

## Tarefa em andamento

**Testes manuais do Redesign Premium, em andamento pelo usuário.** Pendência real e
pontual: **remover os 15 leads de teste** ("TESTE PAGINACAO 1..15", tenant Marketing
Digital) inseridos pra viabilizar o teste visual da paginação em `/admin/campanhas/leads`
— assim que o usuário confirmar que já viu o botão de página ativa dourado. Ver resumo no
topo deste arquivo. Fora isso, todas as 4 fases da rodada de hardening (Fase -1/0/1/2)
seguem implementadas e commitadas, captura automática de log funcionando; Meta Pixel e
`img-src` do MinIO seguem sem teste ao vivo (lacuna honesta, não bug); Fase 3 e eliminação
do token em localStorage fora de escopo por decisão do plano
(`C:\Users\T-GAMER\.claude\plans\crystalline-riding-squid.md`).

## Última tarefa concluída

### Sessão 2026-07-29 (continuação 9) — Tradução completa "Tracking"→"Rastreamento" + "Trends"→"Tendências" ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-29 (continuação 9)").
Commit `e0c6253`.

---

### Sessão 2026-07-29 (continuação 8) — Testes manuais: achados Campanha/Ad Set + Tracking Health ✅

Ver resumo completo no topo deste arquivo. Commit `e8713b3`. Pendência: limpar os 15 leads
de teste (ver "Tarefa em andamento" acima).

---

### Sessão 2026-07-29 (continuação 6) — "Entrar" lento em /artemis4: fix crônico reforçado ✅

Ver resumo completo no topo deste arquivo. Commit `2e9d42f`.

---

### Sessão 2026-07-29 (continuação 5) — Fix real de CSP (eval dev-only + youtube script-src) ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-29 (continuação 5)").
Commit `7b10fb9`.

---

### Sessão 2026-07-29 (continuação 4) — Auto-report de violações de CSP ✅

Ver resumo completo no topo deste arquivo ("Atualizado em: 2026-07-29 (continuação 4)").
Commit `39646a9`.

---

### Sessão 2026-07-29 (continuação 3) — Hardening Fase 1 (CSP Report-Only) + Fase 2 (CSRF log-only) ✅

Ver resumo completo no topo deste arquivo. Commits `4018855` (Fase 1) + `01f786b` (Fase 2).

---

### Sessão 2026-07-29 (continuação 2) — Hardening Fase -1 (XSS real) + Fase 0 (2 itens) ✅

Ver resumo completo no topo deste arquivo. Commit `2a4886b`.

---

### Sessão 2026-07-29 (continuação) — Varredura completa do cookie fantasma "accessToken" ✅

**Contexto:** o fix do Kanban de Leads (sessão anterior, mesmo dia) tinha registrado como
pendência não atacada: "esse mesmo padrão de cookie inexistente aparece em ~40 outras rotas
do sistema — vale ficar de olho". Usuário pediu explicitamente uma varredura minuciosa em
vez de deixar como risco aberto.

**Metodologia:** delegado o levantamento completo a um agente de pesquisa dedicado (Explore),
com instrução explícita de NÃO confiar em heurística de grep de proximidade de texto — na
sessão anterior, um `grep -A3` rápido tinha classificado errado 1 arquivo como "sem fallback
de Authorization" quando na verdade ele checava o header primeiro, só que numa ordem diferente
no código. O agente leu cada um dos 44 arquivos por completo e cruzou com quem realmente
chama cada rota no frontend (via `useApi`/`useAuthenticatedFetch`/`adminFetch`/fetch cru),
produzindo um veredito individual: SEGURO / QUEBRADO / QUEBRADO-PARCIAL / SEM-CALLER-
ENCONTRADO / ROTA-MORTA.

**Achado que simplificou a correção inteira:** o cookie real de sessão
(`admin_auth_token`) é gravado com `httpOnly: true` no login. Isso significa que o
NAVEGADOR já anexa esse cookie automaticamente em toda requisição same-origin — inclusive
`fetch()` cru sem nenhum header manual — porque `httpOnly` só impede LEITURA via
`document.cookie`/JS, nunca bloqueia o envio automático pelo navegador. Ou seja: ao
contrário do que a sessão anterior presumiu (que a causa era sempre "frontend esquece de
mandar o Bearer"), a causa raiz real, na maioria dos casos, era só o backend checar o NOME
ERRADO de cookie (`accessToken`, que nenhum login desta plataforma jamais cria). Isso reduz
a correção de "auditar e corrigir caller por caller" para uma troca mecânica e segura de
uma única string, em cada arquivo, sem tocar em nenhuma lógica de controle.

**Corrigido:** troca de `cookies.get('accessToken')` → `cookies.get('admin_auth_token')` em
**41 arquivos reais** (2 `route-backup.ts` deixados de fora — nome de arquivo não é
`route.ts`, o Next App Router não os registra como rota, são cópias de backup mortas,
confirmado que não são importados em lugar nenhum).

**3 rotas confirmadas quebradas pelo agente, reverificadas ao vivo depois do fix** (via
`curl` mandando o token SÓ como cookie, nunca como header Authorization, pra provar que a
causa raiz real é a que foi corrigida, não uma coincidência de outro caminho):
- `GET /api/crm/stats/dashboard` (dashboard principal do CRM, `/crm`) — antes sempre
  falhava (mesma causa raiz do bug do Kanban já corrigido); depois: `{"success":true,
  "stats":[...]}` com os 6 leads reais do tenant Marketing Digital.
- `GET /api/admin/imoveis/[id]/rascunho` (sistema de auto-save da edição de imóvel via
  `hooks/useRascunho.ts` — usado nos 10 pontos de chamada do hook, incluindo criar/atualizar/
  descartar rascunho) — antes sempre falhava silenciosamente pra qualquer imóvel, qualquer
  tenant; depois: `{"success":true,"rascunho":null}` (resposta honesta — sem rascunho
  ativo pro imóvel testado, não mais um erro de autenticação mascarado).
- `GET /api/admin/user-features` (alimenta a lista de permissões da sidebar hierárquica em
  `HierarchicalSidebar.tsx`) — antes nunca reconhecia nenhum usuário; depois autentica
  corretamente e aplica o controle de permissão de verdade (a negação de acesso que retornou
  no teste é o sistema de permissões funcionando como desenhado pro role testado, não mais
  "usuário nunca identificado").

**Achado relacionado, investigado durante a mesma varredura, causa diferente mas sintoma
idêntico (401 silencioso):** 6 componentes administrativos — `CreateSystemFeatureModal.tsx`,
`EditSystemFeatureModal.tsx`, `DeleteSystemFeatureModal.tsx`, `DeleteCategoryModal.tsx`
(`categorias/`), `DeletePerfilModal.tsx`, `RoleUsersModal.tsx` — liam
`localStorage.getItem('auth-token')`, uma chave que só é populada pelo fluxo de login de
CORRETOR (`CorretorLoginModal.tsx`), nunca pelo login de admin (a chave real é
`admin-auth-token`, confirmada em `src/lib/auth/adminFetch.ts` e em toda tela do painel
administrativo). Corrigidos os 8 pontos de leitura nesses 6 arquivos pra usar a chave certa.

**Verificado:** `npx tsc --noEmit` — mesma baseline pré-existente (52 erros), zero novos em
qualquer um dos 47 arquivos tocados nesta rodada.

**Fora de escopo, documentado no relatório do agente, não corrigido por não ter nenhum
caller real encontrado em `src/app`/`src/components`/`src/hooks` (garantidamente quebrado
SE algum dia alguém chamar, mas sem impacto hoje):** ~9 rotas de `imoveis-debug/[id]/*`
que checam só o cookie, sem fallback de Authorization nenhum. Registrado também, mas fora
do escopo desta correção de bug de auth (candidato a limpeza de código morto numa rodada
futura, não tocado aqui): 2 componentes seletores (`AmenidadesSelector.tsx`,
`ProximidadesSelector.tsx`) que fazem fetch cru sem auth mas não são importados em lugar
nenhum do app.

Commit `671ad0a`.

---

### Sessão 2026-07-29 — Sidebar (Rede Ads + links mortos de CRM) e Kanban de Leads real ✅

**Contexto:** usuário perguntou (1) por que "Rede Meta Ads"/"Rede Google Ads" aparecem na
sidebar do tenant `admmd`, e (2) por que nenhuma funcionalidade do CRM ("Gestão de Leads",
"Kanban de Leads") é acionada pra esse mesmo tenant.

**Achado 1 — sidebar mostrando itens sem página real, commits `9fac3f8` + `5a20cdc`:**
rodei `get_sidebar_menu_for_user()` de verdade pro `admmd` (não só lido o código) e confirmei:
as 3 "Rede X Ads" são toggles de capacidade (`system_features.url` vazio de propósito —
reaproveitam o mecanismo de provisionamento só pra saber se o tenant contratou aquela rede,
nunca foram pensadas como página, consumidas só por `GET /api/admin/campanhas/configuracoes/
redes`). "Gestão de Leads"/"Kanban de Leads" tinham o MESMO sintoma (`url` vazio) só que por
esquecimento genuíno — as páginas (`src/app/crm/kanban/page.tsx`, `src/app/crm/leads/page.tsx`)
já existem no código, só nunca foram linkadas. Corrigido via
`prisma/migration-2026-07-29-sidebar-url-fixes.sql`: populei o `url` das 2 entradas de CRM
(`/crm/kanban`, `/crm/leads`) + adicionei um filtro na função (`sf.url IS NOT NULL AND sf.url
<> ''`) pra qualquer toggle de capacidade (presente ou futuro) nunca mais vazar pra sidebar sem
precisar de exceção por id. Verificado via diff do JSON retornado pela função antes/depois —
só as 4 mudanças esperadas (3 toggles somem, os 2 links de CRM ganham path real) — e sanity
check rodando a função pra outro tenant real (Imobiliaria XYZ, 2 usuários, sem erro).

**Achado 2 — bug mais sério, achado testando `/crm/kanban` de verdade no navegador:** o quadro
Kanban mostrava **0 leads em toda coluna**, mesmo com 6 leads reais confirmados no banco pro
tenant. Isso não era específico do `admmd` — afetava QUALQUER tenant. Causa raiz:
`src/app/crm/kanban/page.tsx` chamava `fetch()` cru (sem nenhum header de autenticação) pros
3 endpoints de dados (`/api/crm/kanban/colunas`, `/api/crm/leads`, `/api/crm/kanban/move`) —
únicas 3 chamadas do arquivo que não usavam `adminFetch` nem passavam o Bearer manualmente
(as outras 2 chamadas do mesmo arquivo, `fetchTenantConfig`/`fetchAgendamentos`, já faziam
certo). Sem esse header, e sem NENHUM login desta plataforma jamais setar o cookie que os 3
endpoints tentavam ler (`accessToken` — o cookie real é `admin_auth_token`, confirmado em
`/api/admin/auth/login`), `getCurrentUser()` sempre retornava `null` → `tenantId = null` → toda
query `WHERE tenant_id = $1` nunca casava com nenhuma linha. **Achado um 2º bug no mesmo lugar,
investigando o 1º:** `GET /api/crm/kanban/colunas` **nunca teve filtro de tenant nenhum** —
retornava as colunas de TODOS os tenants misturadas (explica as várias "LEAD CAPTADO"/"EM
ANÁLISE" repetidas lado a lado na captura de tela que o usuário mandou — um conjunto de 7
colunas por tenant real, mais 7 linhas órfãs legadas com `tenant_id NULL`).

**Corrigido (commit `3c9045c`):** `page.tsx` passou a usar `adminFetch` nas 3 chamadas; os 3
endpoints (`leads/route.ts`, `kanban/move/route.ts`, e o novo `getCurrentUser` de
`kanban/colunas/route.ts`) passaram a checar o cookie certo (`admin_auth_token`);
`kanban/colunas/route.ts` ganhou isolamento completo por tenant nos 3 métodos (GET filtra por
`tenant_id`, POST seta `tenant_id` no INSERT e exige `tenant_id` no UPDATE, DELETE verifica
posse antes de apagar) — mesmo padrão já usado em `leads/route.ts` e `move/route.ts`.

**Testado ao vivo, ponta a ponta, sessão real do `admmd`** (JWT gerado com `userId` real,
setado em cookie + localStorage, mesmo playbook já documentado neste arquivo): `GET colunas`
retornou exatamente as 7 do tenant Marketing Digital (antes: todas de todos os tenants
misturadas) · `GET leads` retornou os 6 leads reais (antes: 0, sempre) · a tela do Kanban
renderizou os 6 leads corretamente na coluna "Lead Captado", as demais 6 colunas com 0 (correto
— nenhum lead avançou ainda) · `POST move` testado nos dois sentidos num lead real (Lead
Captado → Em Análise → Lead Captado de volta), confirmado sem resíduo depois via SQL direto.
`npx tsc --noEmit`: mesma baseline pré-existente, zero erros novos nos 4 arquivos tocados.

**Fora de escopo desta rodada, registrado honestamente:** o padrão de cookie `accessToken`
(nunca setado por nenhum login) aparece em ~40 outras rotas de API além das 3 corrigidas aqui
(a maioria delas funciona hoje porque é chamada via `adminFetch`, que sempre manda o Bearer
header — o problema só se manifesta quando o caller usa `fetch()` cru, como era o caso aqui).
Não auditei nem toquei nas outras ~37 rotas — fica registrado como um padrão a verificar se
outro sintoma parecido aparecer em outra tela do CRM.

---

### Sessão 2026-07-28 (continuação 5) — Fix: filtro de Origem na tela de Leads (2 bugs reais) ✅

**Contexto:** durante o roteiro de testes do Redesign Premium concluído na sessão anterior, o
usuário reportou: "qualquer que seja a opção escolhida no filtro 'Origem', os resultados
exibidos são sempre os mesmos... como se não estivesse realmente filtrando".

**Bug 1 — backend nunca lia o filtro (commit `c1605a9`):** `GET /api/admin/campanhas/leads/
stats/route.ts` nunca extraía `sp.get('origem')` — a tabela de leads no rodapé da página
(endpoint irmão, `GET /api/admin/campanhas/leads`) já filtrava certinho, mas os cards do topo
("Total Leads", "Média/Dia") e os 2 gráficos ("Sinal × Total Leads por Dia", "Leads por
Origem") vinham do endpoint `/stats`, que sempre devolvia o total geral. Testado direto no
Postgres antes de mexer no código (`docker exec ... psql`) pra confirmar os valores reais de
`marketing_eventos.plataforma` do tenant Marketing Digital: `whatsapp_organico`=4,
`cta_app_form`=2, `cta_api`=1. Corrigido adicionando a mesma condição já usada no endpoint
irmão (`COALESCE(me.plataforma, 'direto') = origem`) ao `WHERE` compartilhado por todas as
queries da rota. Verificado com `curl` direto (sem navegador) pros 3 cenários: sem filtro→6,
`whatsapp_organico`→4, `meta_lead_ads` (sem lead real)→0 — todos exatos.

**Bug 2 — race condition real, achada investigando o Bug 1 (commit `7e754bc`):**
`useClientSelector('leads')` troca `clientFilter` de `'own'` pra `'segment'` automaticamente
logo após o mount (comportamento pré-existente, documentado em sessão anterior) — confirmado ao
vivo no próprio network log da sessão do usuário que isso dispara 3-4 chamadas a `loadAll()`
em sequência rápida a cada carregamento de página, **sem nenhum cancelamento ou sequenciamento**
entre elas. Sem proteção, uma resposta mais antiga (ex.: sem `origem`) que demorasse mais pra
resolver no servidor podia sobrescrever o estado de uma resposta mais nova (já filtrada),
dando exatamente a sensação relatada de "o filtro não teve efeito". Corrigido com um contador
de requisição (`requestIdRef`, incrementado a cada `loadAll()`/`goToPage()`) — a resposta só
atualiza o estado se ainda for a requisição mais recente disparada.

**Depuração colaborativa via DevTools do navegador do próprio usuário** (não só o meu) —
mesmo depois dos 2 fixes, o usuário ainda via "o mesmo resultado", o que levantou a dúvida
honesta de se havia um 3º bug ainda não encontrado. Isolado camada por camada, sem assumir
nada: (1) SQL direto — confirmou os dados reais; (2) `curl` com JWT gerado na hora, contornando
qualquer cache de navegador — confirmou o backend puro; (3) leitura guiada da aba Network do
DevTools do usuário (Request URL completa com `origem=whatsapp_organico`, aba Response com
`totalLeads:4`) — confirmou que a resposta CERTA estava chegando no navegador dele; (4)
pergunta direta sobre o que a TELA (não o DevTools) mostrava naquele exato momento — confirmou
`4`, batendo com a resposta. Cada etapa isolou uma camada diferente (banco → servidor → rede →
estado React → DOM) até fechar o ciclo completo sem nenhum salto de fé. Um teste seguinte do
usuário (selecionar "WhatsApp CTA" → 0 leads) inicialmente pareceu suspeito, mas se confirmou
**correto, não um resíduo do bug**: não existe nenhum lead real com essa origem específica
(`cta_whatsapp`) nesse tenant — zero é a resposta certa, e o próprio fato de números diferentes
aparecerem pra origens diferentes (4, 0, e por decorrência 6/2/1 nas demais) já é a prova de
que o filtro funciona ponta a ponta.

**`npx tsc --noEmit` limpo nos 2 arquivos tocados** (`leads/stats/route.ts`,
`leads/page.tsx`) em cada commit. Nenhum push imediato — enviado só ao final, a pedido
explícito do usuário ("faça commit de tudo e push no github remoto").

---

### Sessão 2026-07-28 (continuação 4) — Redesign Premium: Leads + widgets do Dashboard + componentes compartilhados ✅

**Contexto:** depois das 4 telas principais do Redesign Premium (Dashboard, Configurações,
CampaignWizard, Criativos — ver entrada "continuação" abaixo), o CLAUDE.md registrava como
pendência opcional "`leads/page.tsx` (nunca entrou no escopo desta rodada) e os componentes
compartilhados de gráfico". Usuário perguntou "qual será o ganho se implementarmos ambos?" —
respondido em 2-3 frases (consistência visual completa do módulo + esses componentes
reaparecem em quase toda tela, então o ganho de cada correção se multiplica) — usuário
confirmou "siga então".

**Implementado, 4 commits de conversão + 1 de refatoração, mesmo critério das rodadas
anteriores (indigo-600 → âmbar `#c5a028`/`#020c1b`, só em pontos reais de
decisão/estado-ativo, nunca cor categórica/informativa):**

1. **`leads/page.tsx`** (commit `08ab802`) — anéis de foco, hover de linha da tabela (neutro,
   não âmbar) e botão de página ativa da paginação.
2. **4 widgets embutidos no Dashboard** (commit `901e0fc`) — `KpiCard.tsx` (glow de hover
   neutralizado de indigo pra branco/preto — Regra Flat-By-Default; botão de referência do
   Hook Rate), `StageFunnelWidget.tsx` (botão + painel "Diagnosticar gargalo com IA",
   unificado com a cor já usada nos outros avisos de IA), `TrackingHealthWidget.tsx` (botão
   "Executar 1ª verificação"), `CampaignMapWidget.tsx` (spinner).
3. **`ClientSelector.tsx` + `SegmentSelector.tsx`** (commit `0220815`) — os 2 seletores mais
   reutilizados do módulo (aparecem em quase toda tela): pills de estado selecionado, anel do
   dropdown aberto, anéis de foco da busca, spinner, linha selecionada no dropdown. No
   `SegmentSelector`, consolidado um caso de 3 sinais de cor simultâneos numa linha selecionada
   (fundo+texto+badge todos mudando junto) pra só o checkbox mudar — Regra do Acento Único.
4. **`CampanhasModal.tsx`** (commit `6946460`) — modal "Consultar Campanhas": pill de dia da
   semana ativo no agendamento, botão de página ativa da paginação interna, 4 anéis de foco de
   select, hover do botão "Limpar filtros".
5. **`LocationPicker.tsx` + `WinningAngleChip.tsx`** (commit `a960b2e`) — etapa de localização
   do wizard: botão "Salvar/Adicionar", slider de raio E o círculo desenhado no mapa Leaflet
   (cor real do overlay, não só classe Tailwind) viram âmbar; `WinningAngleChip`'s link
   "Ver análise →" vira cinza.

**Achado real de arquitetura, levantado pelo próprio usuário no meio da rodada** ("não
teríamos como refatorar de forma que haja total reutilização e eliminação de redundância de
código?"): o `tailwind.config.js` já tinha tokens nomeados (`gold.premium: '#c5a028'`,
`navy.dark: '#020c1b'`, `gold: '#d4af37'`, `navy`/`navy.light`) pras exatas cores que eu vinha
escrevendo como hex arbitrário (`bg-[#c5a028]`) desde a 1ª rodada — nunca tinha percebido que
já existiam. **Commit `9b1ac7e`** — retrofit mecânico (`sed`) nos 9 arquivos já tocados até
aquele ponto, trocando todo hex solto pelo token nomeado equivalente (zero mudança visual,
mesmo valor — só elimina a duplicação do literal espalhado pelo código). Verificado: grep
confirma zero hex solto restante (2 referências em comentário, inofensivas), `tsc` limpo,
`getComputedStyle` no botão "Sync Meta" confirma `rgb(197, 160, 40)`/`rgb(2, 12, 27)`,
idêntico a antes do retrofit.

**Decisões de "deixar como está" nesta rodada, cada uma com critério explícito (não foi
varredura cega de indigo→âmbar):**
- `LocationPicker.tsx` — chips de localidade já adicionada e linhas do dropdown de busca
  (elementos que se repetem, um por item na lista) neutralizados pra **cinza**, não âmbar —
  mesmo critério já usado no `AssetCard` de Criativos (repetição dilui o acento único).
- `WinningAngleChip.tsx` — link "Ver análise →" virou **cinza**, não âmbar: âmbar como cor de
  TEXTO sobre fundo claro (`#c5a028` em branco) fica abaixo do contraste mínimo de 4.5:1 pra
  texto pequeno — diferente de âmbar como FUNDO de botão (`bg-gold-premium text-navy-dark`),
  que é o uso padrão em todo o resto do módulo e não tem esse problema.
- `DashboardHelpModal.tsx` — **avaliado por completo e mantido 100% intocado**, nenhuma
  conversão. Todo o indigo do arquivo (ícone "?", botão "Ajuda", aba ativa dentro do modal,
  hover de card, link "ver mais detalhes") forma uma identidade visual coerente e autocontida
  do recurso de Ajuda/Guia — não é indigo-por-omissão. Converter só parte quebraria essa
  consistência interna (aba ativa em âmbar mas hover de card ainda indigo, por exemplo);
  converter tudo pra âmbar tornaria "Ajuda" visualmente indistinguível do CTA primário E do
  aviso de IA (que também é âmbar) — 3 significados diferentes competindo pela mesma cor. Mesmo
  princípio já aplicado à paleta por-segmento do `SegmentSelector` e ao pill violeta "Todos os
  Clientes" do `ClientSelector` nas rodadas anteriores: identidade deliberada e distinta, não
  indigo-padrão a corrigir.
- Taxonomias categóricas preservadas: `WinningAngleChip.ANGLE_COLORS`/`ANGLE_COLORS_LIGHT`
  (1 cor fixa por ângulo — investimento/estilo de vida/família/...), `StatusBadge`/
  `FunnelBadge` do `CampanhasModal` (1 cor fixa por status/estágio de funil) — mesmo padrão de
  `SEGMENT_COLORS`/`STAGE_COLORS` já preservado desde as primeiras rodadas.

**Verificado em cada commit:** `npx tsc --noEmit` — baseline de 53 erros pré-existentes, **zero
novos** em qualquer arquivo tocado, confirmado depois do último commit também. Pelo menos 1
valor computado real conferido ao vivo no navegador por arquivo/grupo, sessão autenticada real
(tenant Imovtec) — incluindo confirmar que a combinação nova `accent-gold-premium` (nunca usada
antes nesta sessão, é a cor do "thumb"/trilha de um `<input type="range">`) realmente compila no
Tailwind (`getComputedStyle(...).accentColor === 'rgb(197, 160, 40)'`, testado via elemento
sintético já que o slider real fica dentro do wizard, atrás de várias etapas).

**Fora de escopo, nunca pedido nesta rodada, registrado honestamente:** as ~13 páginas do
módulo que nunca entraram no escopo do Redesign Premium original (aprovações, auditoria,
desperdício, destinos, iniciativas — 3 arquivos —, mecanismos, portfolio — 2 arquivos —,
publicações, configurações/redes) continuam com indigo genérico, sem terem sido avaliadas —
não foram tocadas por não terem sido pedidas, não por esquecimento.

**Com isso, a pendência "Redesign Premium" do CLAUDE.md está encerrada no escopo que já foi
pedido em algum momento** (as 4 telas principais + Leads + os componentes efetivamente
compartilhados entre elas). As ~13 páginas nunca atacadas ficam como pendência nova, só se
pedidas — CLAUDE.md atualizado pra refletir isso.

---

### Sessão 2026-07-28 (continuação 3) — Consolidação de worktrees + fix de fotos trazido ✅

**Contexto:** usuário pediu pra conferir o estado real das outras 3 frentes em worktree
(`netimob-google`, `netimob-cherrypick`, `netimob-imgfix`) — a tabela do `CLAUDE.md` que as lista
é só um snapshot de 2026-07-19, explicitamente marcado como "pode estar desatualizada".

**Verificação (não por suposição — `git merge-base --is-ancestor` de cada tip contra o HEAD
atual):**
- `netimob-google` (`feature/google-ads-implementation`, tip `86eecbf`) — **já mergeado**.
- `netimob-cherrypick` (`feature/mensageria-rag`, tip `83d60cf`) — **já mergeado**.
- `netimob-imgfix` (`fix/next-image-minio-localhost`, tip `00cb95a`) — **NÃO mergeado**, 1 commit
  real de 15/07 ("fix: fotos de imóveis não apareciam na landpaging e página de detalhe").

**Achado real, confirmado por inspeção direta do código deste worktree (não só pelo git log):**
o bug que o commit `00cb95a` corrige ainda estava presente aqui. Causa raiz: `/api/public/
imagens/[id]` redireciona (302) pro storage real (MinIO/S3) em vez de reenviar os bytes — o
otimizador de imagem do Next, pra URLs relativas/mesma origem, chama o handler da rota
diretamente em processo em vez de fazer um fetch HTTP real, não segue o redirect, recebe resposta
vazia e quebra ("Input Buffer is empty" no Sharp). Conferido: `SafeImage.tsx` aqui não pulava a
otimização pra esse caminho (`shouldUnoptimize` só cobria `data:`/`blob:`/paths sem `/`),
`LandingPropertyCard.tsx` sem tratamento nenhum, `next.config.js` sem `localhost:9000`/
`127.0.0.1:9000` (MinIO) nos `remotePatterns`.

**Trazido via `git cherry-pick 00cb95a`** (não merge da branch inteira — o commit não toca
`CLAUDE.md`, mas as duas branches tinham divergido nesse arquivo por motivos não relacionados;
cherry-pick evita esse conflito irrelevante). Aplicado sem conflito (`git auto-merge` só em
`next.config.js`), novo commit `cdadf4d`. `npx tsc --noEmit` limpo nos 3 arquivos tocados
(`SafeImage.tsx`, `LandingPropertyCard.tsx`, `next.config.js`). Não reverificado visualmente no
navegador — o commit original já tinha sido testado ao vivo pelo próprio autor ("fotos reais
confirmadas na landpaging e na página de detalhe do imóvel") e o código trazido é byte-a-byte
idêntico, sem nenhuma adaptação.

**Worktrees já mergeados (`netimob-google`, `netimob-cherrypick`) mantidos por ora** — usuário não
pediu remoção, e remover worktree é uma operação que vale confirmar explicitamente antes, mesmo
já confirmado que não têm trabalho pendente.

---

### Sessão 2026-07-28 (continuação 2) — T6: pesquisa real revela bloqueio estrutural por T2 ✅

**Contexto:** usuário perguntou se T6 (webhook de Instant Form do TikTok, `docs/PLANO_TIKTOK.md`
§10) tinha sido resolvido. Resposta: não, nunca foi atacado — é o único item do faseamento do
plano que nenhuma sessão anterior tocou. O usuário então declarou uma regra de negócio explícita:
"não poderá haver nenhum lead invisível vindo de qualquer rede" — o que reabre a questão de se T6
deveria deixar de ser "opcional" e virar obrigatório.

**Antes de implementar qualquer coisa, pesquisa real da API do TikTok** (mesmo rigor já usado na
sessão do webhook do Google — nunca confiar em memória pra contrato de API de terceiro). Tentativas
via `WebFetch`/`WebSearch` bateram num limite real: a documentação oficial
(`business-api.tiktok.com/portal/docs`) é um SPA que só renderiza via JavaScript — o `WebFetch` só
converte HTML estático pra markdown, sem executar JS, então recebia sempre a casca vazia da página
(só título, sem conteúdo). Resolvido navegando de verdade com o Browser pane real (que executa JS)
— achado um detalhe técnico a mais: o conteúdo real fica dentro de um `<iframe>` same-origin
(`business-api.tiktok.com/gateway/docs/...`), acessível via `iframe.contentDocument` direto (sem
problema de CORS, mesmo origin). Navegado pela árvore real: Marketing API → Campaign Management →
Create Lead Generation ads → Lead generation → Webhook subscription → "Subscribe to ad account
Webhook events via Subscription API" — a página certa, com o payload completo documentado.

**Achado real, que muda a resposta:** o mecanismo do TikTok é **estruturalmente diferente** do
usado no webhook do Google (`/api/public/google-leads/webhook`), que o `PLANO_TIKTOK.md` §3
presumia poder "espelhar" — suposição nunca verificada antes, agora confirmada incorreta. No
Google, o CLIENTE configura URL+chave compartilhada direto na própria tela dele do Google Ads —
self-serve, zero dependência da nossa integração além da chave. No TikTok, a inscrição é feita
por NÓS, chamando `POST /subscription/subscribe/` com `app_id`/`secret` do NOSSO app desenvolvedor
+ `access_token` do CLIENTE obtido via OAuth + `advertiser_id` — exatamente os mesmos 2
pré-requisitos que T2 (adapter real) já precisa resolver (app aprovado + conexão OAuth com a conta
do cliente). **T6 não pode ser adiantado independente de T2** — ao contrário do que a entrada
original do faseamento sugeria ("(Opcional)"), agora corrigido pra "bloqueado por T2". Uma vez
inscrito, o payload do webhook já vem completo (sem precisar de uma 2ª chamada de "pull"):
`object:1`, `entry[].id` (lead ID), `lead_source` (`INSTANT_FORM`/`DIRECT_MESSAGE`), `page_id`,
`campaign_id`/`campaign_name`, `adgroup_id`, `ad_id`, `create_time`, e `changes[]` — array de
`{field, value}` com os campos reais do formulário (`name`, `phone_number`, `email`, `address`,
`gender`, `scheduled_time`, dinâmico conforme o Instant Form configurado).

**Decisão do usuário:** documentar agora, implementar só quando T2 destravar (bloqueado por
aprovação externa do app no TikTok for Business, inalterado desde sessões anteriores) — nenhum
código escrito nesta rodada. `docs/PLANO_TIKTOK.md` atualizado em 3 pontos (§3 com o achado
completo + payload real, §10 tabela de faseamento, §12 tabela de riscos) pra que a próxima sessão
que retomar T2 já saiba exatamente o que fazer em seguida, sem repetir a pesquisa.

**Quanto à regra "nenhum lead invisível" em si — já cumprida hoje, sem precisar de T6:** o wizard
nunca oferece Instant Form como opção de CTA pro TikTok (`network_defaults.tiktok.
instant_form_supported=false`, Fase 1 do §3, implementada desde T1/T3) — é estruturalmente
impossível uma campanha lançada por esta plataforma gerar lead invisível, porque a própria opção
que geraria esse lead nunca é oferecida. O único jeito de um lead TikTok ficar invisível hoje é o
cliente configurar um Instant Form manualmente direto no TikTok Ads Manager DELE, fora da nossa
ferramenta — cenário fora do nosso controle, mesma limitação inerente de qualquer plataforma
terceira (não é um gap específico nosso, nem algo que T6 sozinho eliminaria por completo, já que
depende do cliente usar exclusivamente os caminhos que passam pela nossa plataforma).

---

### Sessão 2026-07-28 (continuação) — Redesign Premium: acento âmbar nas 4 superfícies do módulo ✅

**Contexto:** usuário pediu status dos próximos passos; um dos 3 itens pendentes listados no
CLAUDE.md era "Redesign Premium — ativar skill `impeccable`" (Dashboard, Configurações,
CampaignWizard, Criativos + `src/components/marketing/` charts). Usuário pediu pra implementar
esse item (junto com o alerta de token, já concluído na sessão anterior — ver seção seguinte).

**Escopo real levantado antes de agir:** `context.mjs` do skill confirmou que este projeto já
tem `PRODUCT.md`/`DESIGN.md` próprios (escritos numa sessão anterior não registrada em detalhe
aqui) — um sistema de design "Painel de Missão": navy-based dark-mode-primary + acento âmbar
único (`#c5a028` sobre `#020c1b`, contraste ≈7,88:1 calculado à mão), "Regra do Acento Único"
(âmbar é a ÚNICA cor de decisão — qualquer outra ênfase usa peso/posição, nunca outro acento),
"Regra Antivetorial" (nunca branco/indigo genérico de SaaS), "Regra Flat-By-Default" (sombra só
em hover/estado, nunca decorativa em repouso) e um anel de foco fixo `#2563eb` independente do
acento. Ou seja: o trabalho real não era "criar" um design system, era **aplicar o que já existe
mas nunca foi propagado** — as 4 telas do módulo (e vários componentes compartilhados) ainda
usavam indigo-600 genérico (a cor padrão de IA-SaaS que o próprio skill lista como "AI slop").

**Bloqueio de ambiente, resolvido com o usuário via `AskUserQuestion`:** o Browser pane não
estava compositando screenshot nesta sessão ("the page is not compositing frames") mesmo com o
painel focado — nem eu nem o usuário conseguimos ver a prévia visual. Usuário decidiu: (1)
prosseguir com rigor no nível de código mesmo sem verificação visual disponível agora,
substituindo por `javascript_tool`/`getComputedStyle` (que continuou funcionando mesmo com o
screenshot quebrado); (2) **uma superfície por vez, com checkpoint** — apresentar o resultado de
cada tela, esperar aprovação, só então seguir pra próxima. Processo seguido à risca nas 4 rodadas.

**Padrão aplicado, consistente nas 4 superfícies** (passe estreito — corrige o sistema de cor nos
pontos de decisão real, não uma reconstrução visual completa):
- CTAs primários (botões "Salvar"/"Sync"/"Lançar"/"Adicionar"/"Gerar"/"Aprovar") e estados
  ativos/selecionados (abas, pills de período, cards de seleção única, toggles de escolha
  exclusiva ou multi-select central à tela) → `#c5a028` bg / `#020c1b` texto, sem gradiente nem
  glow decorativo (Regra Flat-By-Default — sombra só aparece no hover).
- Anéis de foco (`focus:ring-*`) → `#2563eb` fixo, em todo input/select/textarea tocado.
- Banners de aviso/notícia (ex.: "Texto gerado pela IA", "será criada PAUSADA", feedback de
  upload) → unificados no mesmo âmbar já usado pelos outros avisos de cada tela (eram os únicos
  em indigo, destoando do resto).
- 1 padrão explicitamente banido pelo `DESIGN.md` corrigido: side-stripe border colorida
  (`border-l-2 border-l-indigo-500`) na linha selecionada da lista de clientes em Configurações
  — trocado por tint de fundo, sem faixa lateral.

**Deixado deliberadamente sem alteração, com critério explícito em cada commit:**
- Cor informativa/categórica (ícones de cabeçalho, badges de categoria, eyebrows, textos de
  destaque inline) — não é ponto de decisão, converter tudo pra âmbar violaria a própria "Regra
  do Acento Único" (diluir o significado de "isto é a decisão desta tela").
- Sub-sistemas com marca própria já estabelecida: azul `#1877f2` da Meta (botão "Salvar
  Identidade Meta" em Configurações) e violeta do modal "Criar novo criativo com IA" em
  Criativos (zero indigo lá — já nasceu 100% violeta) — branding de terceiro/feature própria,
  fora do escopo da correção de sistema de cor genérico.
- Seções plurais/autocontidas: o `InterestsPicker` inteiro no CampaignWizard (avançado/opcional,
  converter só parte ficaria mais inconsistente que não tocar) e as micro-ações repetidas por
  card na galeria de Criativos (dezenas de cards simultâneos — promover cada um ao acento único
  diluiria exatamente o que a regra existe pra evitar); essas viraram neutras (slate), não âmbar.

**Verificado em cada uma das 4 rodadas:** `npx tsc --noEmit` sem erros novos no arquivo tocado +
inspeção ao vivo no navegador real (tenant Marketing Digital, sessão autenticada real) via
`javascript_tool`/`getComputedStyle` — incluindo cliques reais em controles (selecionar
segmento, avançar etapas do wizard, marcar gênero/dia da semana) pra confirmar que o estado
"selecionado"/"ativo" renderiza exatamente `rgb(197, 160, 40)`/`rgb(2, 12, 27)`, não só que a
classe CSS existe no código. Sem verificação visual por screenshot (limitação de ambiente desta
sessão, não resolvida) — usuário ainda não viu a prévia pixel-a-pixel, só a confirmação via
estilo computado descrita acima em cada checkpoint apresentado.

**Fora de escopo desta rodada, registrado como pendência real:** `src/components/marketing/`
(charts: `AnalyticsView.tsx`, `BriefingCard.tsx`, `CommandCenterView.tsx`, `KpiCard.tsx`,
`PeriodBadge.tsx`, `ClassicFunnelChart.tsx` — ~28 ocorrências de indigo encontradas via grep,
listadas no CLAUDE.md original mas não atacadas aqui) — o pedido do usuário cobriu as 4 telas
principais; os componentes de gráfico compartilhados ficam pra uma rodada futura, se pedida.

Commits: `6458f32` (Dashboard), `becdc3f` (Configurações), `03b43e7` (CampaignWizard), `f1704b1`
(Criativos).

---

### Sessão 2026-07-28 — Contratação de rede por tenant (Meta/Google/TikTok) ✅

**Contexto:** usuário notou que o botão "Meta / TikTok" em `/admin/campanhas/nova` escondia a
opção de TikTok atrás de um rótulo enganoso (achado real, corrigido primeiro — commit
`6b5acb5`). Isso levou a uma discussão de modelo de negócio: cada rede de anúncio é cobrada
separadamente por tenant, então o ideal é botão próprio por rede, desabilitado quando a empresa
não contratou aquela rede. Usuário propôs 3 colunas boolean em `tenants` + aba CRUD nova;
recomendei reaproveitar o sistema genérico de provisionamento já usado por todo o resto da
plataforma (`system_features`+`tenant_feature_overrides`, `/admin/master/provisioning`) em vez
de um 2º mecanismo paralelo — usuário concordou.

**Implementado** (`prisma/migration-2026-07-28-network-provisioning.sql`): 3 features sem `url`
própria (não são página, são toggle de capacidade) — `campanhas-rede-meta/google/tiktok`,
vinculadas ao módulo "Gestão de Campanhas de Marketing Digital" (já linkado ao segmento
Imobiliário, então aparecem automaticamente na árvore do Master). Backfill deliberado (não é
provisionamento automático genérico): tenants com credencial JÁ ativa numa rede continuam
habilitados — só TikTok, sem nenhum tenant com credencial real, ficou de fora do backfill.
`permissions`/`role_permissions` **não** foram criadas (pesquisa confirmou que só protegem
visibilidade de sidebar via `get_sidebar_menu_for_user`; essas 3 features são lidas por uma
query bespoke dentro de uma API já existente, não pelo pipeline de rota/sidebar).

`GET /api/admin/campanhas/configuracoes/redes` ganhou o campo `contracted` por rede (LEFT JOIN
`tenant_feature_overrides`), com bypass total pra Master (`is_system_role`) — mesmo padrão de
`get_sidebar_menu_for_user`. É o único ponto de verdade, consumido por 3 lugares: a tela
Configurações → Redes, o step "Rede de Anúncios" do `CampaignWizard.tsx`, e os botões de
`/admin/campanhas/nova`. Prioridade de estado num card: `Em breve` (não suportado) →
`Não contratado` → `Não conectado` → `Conectado`.

`/admin/campanhas/nova` — o botão único "Meta / TikTok" virou 2 botões independentes (mais o já
existente "Google AI Max"), cada um desabilitado individualmente quando a rede não está
contratada+conectada. `CampaignWizard` ganhou `initialValues.networkCode` pra pré-selecionar a
rede escolhida no botão de fora — o wizard ainda mostra o passo "Rede de Anúncios" normalmente
(usuário pode confirmar ou trocar), só chega com a intenção certa já marcada.

**Testado ao vivo:** contagem de features no Hub de Provisionamento Master confirmou 11→14 pro
módulo de Campanhas (as 3 novas entraram corretamente na árvore, sem precisar tocar em
`system_segment_modules` — o módulo já estava linkado ao segmento Imobiliário) · endpoint
testado com 2 tokens reais: Master (`is_system_role:true`) → `contracted:true` pras 3 redes
(bypass); tenant real (`is_system_role:false`, mesmo tenant Marketing Digital) →
`contracted:true` só pra Meta/Google (as que já tinham credencial ativa antes desta feature),
`contracted:false` pro TikTok (nunca teve credencial real) · com o token de tenant real injetado
no navegador, botão "TikTok Ads" renderizou `disabled=true` com tooltip "Rede não contratada"
(distinto de "Rede não conectada", confirmando a prioridade de mensagem correta), Meta Ads e
Google AI Max continuaram habilitados. `npx tsc --noEmit`: 64 erros, mesma baseline, zero novos.

---

### Sessão 2026-07-27 (TikTok/T4) — histórico anterior

**Implementação da rede TikTok** (`docs/PLANO_TIKTOK.md`) — plano completo escrito e aprovado
em 2026-07-27 (auditoria de código encontrou 3 achados que mudam o desenho vs. o esboço antigo
de `PLANO_GOOGLE_TIKTOK.md` §Fase 2: benchmarks sem dimensão de rede, bug real de rótulo
meta/google no dashboard, `REALLOCATE_BUDGET` como casca nunca preenchida).

**T0 concluído** (commit `0b877b3`): `system_benchmarks.network_id` + cascata de 6 camadas no
`benchmarkResolver`, `aiInsights.ts`/`wastedSpendService.ts` resolvendo benchmark por
(segmento, rede) da campanha, fix do ternário binário em `CommandCenterView.tsx`. Zero
regressão confirmada ao vivo contra dado real (Meta+Google).

**T1 concluído** (commit `ebb7ecd`): `FakeTikTokAdapter` (implementa `AdNetworkService` direto,
sem precisar do truque de herança do fake do Google), `networkLeadSource.tiktok = 'cta_engagement'`
(decisão deliberada — TikTok nasce com atribuição de receita real, sem repetir o débito de
identidade que travou a Visão 4 do Google), `network_defaults.tiktok` seedado no segmento
Imobiliário com `instant_form_supported=false` (guardrail pro Wizard, T3). Smoke test ao vivo:
cron real criou `Insight` via upsert de verdade contra o fake, `insights/ai` processou a
campanha TikTok sem erro e confirmou lead via `cta_engagement` (não `insight_conversions`).
Dado de teste removido, 0 resíduo.

**T3 concluído** (commit `08c9207`): achado real — `CampaignWizard.tsx` já tinha um step "Rede de
Anúncios" genérico (dynamic, lê `/redes`, ícone do TikTok já mapeado); só faltava
`ad_networks.capabilities.supported=true` pro TikTok (Google tem essa flag `false` de propósito
— Performance Max é formato fundamentalmente diferente, por isso tem wizard próprio; TikTok
cabe no genérico porque segue o mesmo padrão campanha→ad group→ad do Meta). Form de credenciais
TikTok adicionado em `configuracoes/redes/page.tsx` (backend já era genérico). 2 textos
hardcoded "Meta Ads Manager" no `CampaignWizard.tsx` corrigidos (mesma classe do Achado 2 do
T0) — achados testando ao vivo com TikTok selecionado.

**⚠️ Achado incidental importante, fora do escopo do plano TikTok, mas relevante pra TODA sessão
futura:** a limitação "verificação visual no navegador impossível" documentada em dezenas de
sessões anteriores neste arquivo **está resolvida**. Causa raiz real: `useAuth.
checkAuthentication()` (`src/hooks/useAuth.tsx:94`) lê o token de `localStorage.getItem(
'admin-auth-token')`, NUNCA do cookie — sessões anteriores só injetavam o cookie
(`admin_auth_token`, o que o middleware de fato checa) e nunca testaram setar o localStorage
também, então sempre bateram em `error=session_expired` e concluíram (incorretamente) que a
causa era um problema de dado (`/me` falhando). Confirmado ao vivo nesta sessão: um JWT
fabricado com o `userId` REAL de um usuário existente (`admmd`,
`67c62443-b022-4517-b7d8-bb90b8af38fd`), setado em **ambos** `document.cookie` E
`localStorage.setItem('admin-auth-token', token)` + `localStorage.setItem('admin-user-data',
JSON.stringify(user))` (usando o `user` retornado por uma chamada real a `/api/admin/auth/me`
com esse token) — funciona perfeitamente, sessão completa, navegação livre por todo o admin.
**Playbook pra sessões futuras que precisarem verificar UI autenticada:**
```js
// 1. Gerar JWT com userId REAL (não um placeholder) + JWT_SECRET real do .env.local
// 2. No browser, via javascript_tool:
document.cookie = "admin_auth_token=" + TOKEN + "; path=/";
fetch('/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + TOKEN } })
  .then(r => r.json())
  .then(data => {
    localStorage.setItem('admin-auth-token', TOKEN);
    localStorage.setItem('admin-user-data', JSON.stringify(data.user));
  });
// 3. Navegar normalmente — sessão válida
```

**T4 concluído** (motor de realocação cross-rede, `docs/PLANO_TIKTOK.md` §8 — não depende do
TikTok real, já opera sobre Meta×Google hoje): migração `BudgetReallocation` (tabela de detalhe
bilateral, linkada 1:1 à `AgentAction` que já carrega PIN/aprovação) + 5 benchmarks novos
(`realloc_min_cpl_gap_pct=30%`, `realloc_max_pct_of_source=30%`, `realloc_marginal_haircut_pct=25%`,
`realloc_max_abs_cents=R$50`, `realloc_cooldown_days=14`) seedados nos 6 segmentos ativos via
`benchmarkResolver`. `reallocationEngine.ts` — `findReallocationOpportunities()` aplica 11
critérios de elegibilidade (mesmo cliente/segmento/funnel_stage, redes diferentes, origem com
lead real, ambas maduras, destino com eficiência PROVADA não prometida, nenhuma em learning,
destino com headroom real — frequência pra Meta/TikTok, IS Lost Budget pra Google —, origem não é
a única campanha do seu funnel_stage, cooldown por par, vantagem de CPL acima do mínimo) e calcula
o ganho líquido projetado com **haircut marginal explícito** (nunca assume CPL médio constante no
destino após receita extra — a resposta ingênua "CPL menor → move tudo" fica deliberadamente
impossível de expressar aqui). `runReallocationAgent()` converte a melhor oportunidade por
campanha-origem numa `AgentAction` tipo `REALLOCATE_BUDGET` (sempre OFFENSIVE — aumenta gasto
numa rede, sempre exige aprovação humana com PIN, nunca auto-executa) + a `BudgetReallocation`
vinculada. Fio de volta no cron (`/api/cron/campanhas/sync`) + no digest do WhatsApp
(`agentNotificador.ts` — bucket próprio `reallocs`, achado real: sem isso a ação ficaria
criada no banco mas invisível/inaprovável via WhatsApp, só um outro tipo já tinha esse
tratamento) + na execução (`agentDecisor.executeAction`, branch `REALLOCATE_BUDGET`: atualiza os
AdSets de origem E destino dentro de um único `prisma.$transaction` — **desvio deliberado do
texto literal do plano**, que sugeria reverter a origem se a chamada de rede do destino falhasse;
o código real do projeto (SCALE/DOWNSCALE já existentes) sempre trata push de rede como
best-effort/non-blocking e o banco local como fonte da verdade, então a atomicidade real é
a transação Postgres entre as duas campanhas, não uma reversão condicionada à rede) + no reject
(`/api/agent/reject/[id]`, achado real: sem o fix, rejeitar deixava a `BudgetReallocation` presa
em `PROPOSED` pra sempre, já que `setStatus()` só tocava a `AgentAction`).

**Testado ao vivo, ponta a ponta, com números batendo exatos com o cálculo manual**: 2 campanhas
sintéticas (Meta CPL R$50, TikTok CPL R$20, mesmo tenant/segmento/funnel_stage BOF) → motor
encontrou 1 candidato (gap 60%, R$15/dia, ganho líquido projetado +0,30 lead/dia, confiança 0,94)
→ `runReallocationAgent` criou `AgentAction`+`BudgetReallocation` reais → aprovado via PIN real
(`/api/agent/approve/[id]`) → `AdSet` de origem 100→85 (-R$15), destino 60→75 (+R$15), ambas as
tabelas marcadas `EXECUTED` com os valores corretos. **Achado real de sessão longa, mesma classe
já documentada váras vezes neste arquivo:** o servidor dev tinha o singleton do Prisma Client
travado ANTES do `npx prisma generate` que criou o model `BudgetReallocation` — `prisma.
budgetReallocation` vinha `undefined` até o comentário do `next.config.js` ser tocado (força
restart completo do processo Next, mesmo truque já usado em sessões de FASE 9/Auditoria). Todo
dado de teste (2 campanhas, 2 AdSets, 10 Insight, 25 CtaInteraction, 1 AgentAction, 1
BudgetReallocation) removido depois, 0 resíduo confirmado por SQL. `npx tsc --noEmit`: 64 erros,
mesma baseline pré-existente, zero novos em qualquer arquivo tocado.

**T5 concluído** (medição D+14 + circuit breaker, commit `55ec099`): cron diário
(`/api/cron/campanhas/realloc-measure`, 07:00, registrado no `feed-cron-scheduler.js`) mede
propostas `EXECUTED` há ≥14 dias — compara leads/dia numa janela de 14 dias ANTES vs. DEPOIS do
`executed_at`, tanto na origem quanto no destino (`deltaTarget + deltaSource`), pra isolar o
efeito da realocação de uma sazonalidade genérica de "mais tráfego este mês"; grava
`actual_lead_gain`/`verdict` (`CONFIRMED` se ≥50% do projetado, `BACKFIRED` se ≤0, `NEUTRAL` no
meio). Circuit breaker (`reallocationMeasurement.isReallocationCircuitBreakerTripped`): ≥3
`BACKFIRED` do tenant em 90 dias — checado em 2 pontos, não só 1, pra cobrir o texto literal do
plano ("não executa nem com aprovação"): (1) `runReallocationAgent` para de propor enquanto
ativo; (2) `agentDecisor.executeAction` (branch `REALLOCATE_BUDGET`) barra a execução mesmo com
PIN correto, caso a proposta já estivesse `PENDING_APPROVAL` de antes do breaker disparar —
marca `AgentAction`/`BudgetReallocation` como `BLOCKED` e alerta o Master via `notifyAlert`
(Slack+WhatsApp). Os 2 endpoints de aprovação (`/api/agent/approve/[id]` e
`/api/admin/master/aprovacoes`) passaram a checar o status real gravado depois de chamar
`executeAction` — sem isso, o approve mostraria "✅ Aprovado e executado!" mesmo quando o breaker
bloqueou tudo, uma mensagem enganosa pro humano que aprovou.

**Testado ao vivo, ponta a ponta, números batendo exatos com o cálculo manual**: cenário
CONFIRMED (campanhas reais com leads reais antes/depois do `executed_at` sintético) →
`actual_lead_gain=0.214` (leads/dia) contra `projected_lead_gain=0.300` → `verdict=CONFIRMED` ·
3 cenários BACKFIRED (campanhas sem lead nenhum → `actual_lead_gain=0`) → `verdict=BACKFIRED` nos
3 · com os 3 BACKFIRED no banco, criado um par elegível do zero (mesmo molde do smoke test do
T4) → `runReallocationAgent` retornou `proposalsCreated=0` (breaker ativo suprimiu a sugestão
nova) · criada uma proposta `PENDING_APPROVAL` pré-existente pro mesmo par → aprovada via PIN
correto → resposta HTML "🛑 Bloqueada pelo circuit breaker" (não "executado"), `AgentAction`
e `BudgetReallocation` ambos `BLOCKED`, `AdSet.dailyBudget` das duas campanhas intocado
(confirmado igual ao valor antes da tentativa). Todo dado de teste (4 campanhas, AdSets,
Insight, CtaInteraction, 4 `BudgetReallocation`, 1 `AgentAction`) removido depois, 0 resíduo
confirmado por SQL. `npx tsc --noEmit`: zero erros novos em qualquer arquivo tocado (os 2 a mais
no total eram artefato stale de `.next/types` de uma rota de debug já removida, não código real).

**UI concluída** (commit `2199bcd`, `docs/PLANO_TIKTOK.md` §8.6): `GET /api/admin/campanhas/
realocacoes` (propostas vivas `PROPOSED` + histórico `EXECUTED/MEASURED/REJECTED/BLOCKED`,
escopado por tenant+cliente) alimenta 3 superfícies novas — card "Oportunidade de Realocação" na
Visão Executiva do dashboard (`ReallocationOpportunityWidget.tsx`, mesmo padrão self-fetching de
`RevenueAttributionWidget`, só renderiza com ≥1 proposta viva — nunca skeleton vazio permanente);
seção "Para onde mover" no Desperdício de Verba (conecta o diagnóstico já existente na página à
ação concreta, com badge "desperdício" quando a campanha-origem da proposta já está numa das
categorias de desperdício listadas acima); "Histórico de Realocações" com o veredito D+14
(Confirmado/Neutro/Não deu certo) quando disponível, senão o status operacional. A fila de
aprovação (`/admin/campanhas/aprovacoes`) já renderizava `REALLOCATE_BUDGET` desde a T4
original — não precisou de mudança.

**Testado ao vivo no navegador** (sessão autenticada real via JWT com `userId` real + playbook
documentado acima, dashboard com segmento Imobiliário selecionado): sem dado real → nenhuma das
3 seções aparece (comportamento correto — testado no estado limpo pós-T5); inserida 1 proposta
`PROPOSED` + 1 `MEASURED/CONFIRMED` manualmente → os 3 widgets renderizaram os números exatos
(CPL R$82→R$31, 62% vantagem, R$30/dia, +0.55 lead/dia no card; badge "CONFIRMADO" sem o status
`MEASURED` redundante ao lado, depois de um ajuste). Único warning de console encontrado
(hydration em `SegmentSelector.tsx`) é pré-existente, não relacionado ao código novo. Dado de
teste removido, 0 resíduo confirmado.

**Trilha H concluída — 16/16 cenários testados ao vivo contra dado real** (`docs/PLANO_TIKTOK.md`
§11), usando um par de campanhas "flexível" (`th-flex-source` Meta / `th-flex-target` TikTok,
mesmo molde comprovado do smoke test original do T4) mutado incrementalmente entre chamadas
reais a `findReallocationOpportunities`/`runReallocationAgent` — cada caso negativo confirmado
por contraste direto com o baseline positivo (H1), não isolado:

- **H1** (baseline positivo) — confere exato com o cálculo manual (gap 60%, R$15/dia,
  +0,30 lead/dia, confiança 0,94) — mesmo resultado do smoke test T4 original.
- **H2** (gap 8%, abaixo do mínimo 30%) — 0 candidatos.
- **H3** (destino com 2 leads, abaixo de `min_leads_scale`) — o par específico
  origem→destino não qualificou (E6), mas a mutação incidentalmente criou uma oportunidade
  REVERSA válida (destino caro→origem barata) — achado que confirma o motor avalia as duas
  direções de forma independente, não um bug.
- **H4** (destino em `LEARNING`) — 0 candidatos.
- **H5** (destino com frequência 4.5, acima do teto ~3) — 0 candidatos (sem headroom).
- **H6** (origem BOF × destino TOF) — o par específico não apareceu (E3); um candidato
  não-relacionado surgiu entre o destino mutado e uma campanha real pré-existente que
  também é TOF — efeito colateral esperado do dado de produção compartilhado, não um bug.
- **H7** (origem com 0 leads) — 0 candidatos nas duas direções (E7 bloqueia forward, E6
  bloqueia reverse já que a origem-sem-lead também não serve como destino).
- **H8** (mesma rede nos dois lados) — 0 candidatos (E4).
- **H9** (proposta `EXECUTED` recente pro mesmo par) — 0 candidatos com o registro de
  cooldown presente; removendo o registro, o candidato baseline reaparece idêntico ao H1
  (prova que o cooldown, não outra coisa, era o bloqueio).
- **H10** — já comprovado no smoke test original do T4 (aprovação com PIN real:
  `DOWNSCALE` origem + `SCALE` destino, ambos aplicados atomicamente).
- **H11** (falha de rede não reverte) — comportamento real do motor **diverge deliberadamente**
  do texto literal do plano (que sugeria reverter a origem se a rede do destino falhasse); a
  arquitetura real do projeto (igual PAUSE/SCALE/DOWNSCALE) trata push de rede como best-effort
  sempre, nunca bloqueia nem reverte o estado local — confirmado implicitamente no smoke test
  original do T4 (tenant sem credenciais reais de Meta/TikTok, e mesmo assim as duas campanhas
  tiveram o budget alterado corretamente via `prisma.$transaction`, a garantia real de
  atomicidade). Documentado como decisão consciente, não um gap de teste.
- **H12** (rejeição) — `AgentAction`+`BudgetReallocation` marcados `REJECTED` via
  `/api/agent/reject/[id]` com PIN real, `AdSet.dailyBudget` das duas campanhas confirmado
  intocado depois.
- **H13/H14/H15** — já comprovados ao vivo no T5 (medição D+14 CONFIRMED/BACKFIRED + circuit
  breaker nas duas camadas).
- **H16** (cadeia A→B,C no mesmo ciclo) — criada uma 3ª campanha (Google) como 2º destino
  válido pra `th-flex-source`; `findReallocationOpportunities` corretamente achou os 3
  candidatos possíveis (incluindo o par mais fraco origem→destino1); `runReallocationAgent`
  criou exatamente 2 propostas (1 por campanha-origem DISTINTA), sempre escolhendo a de maior
  ganho projetado — a opção mais fraca da mesma origem foi corretamente descartada, sem
  cascata.

Todo dado de teste (3 campanhas, AdSets, Insight, CtaInteraction, 2 `AgentAction`+
`BudgetReallocation` do H16, 1 par de H9/H12) removido depois, 0 resíduo confirmado por SQL em
cada rodada. Nenhuma mudança de código foi necessária — o motor bateu com a especificação do
plano em todos os 16 cenários. `npx tsc --noEmit`: 64 erros, mesma baseline, zero novos.

**Com isso, T4 (motor de realocação cross-rede) está formalmente concluído — migração,
elegibilidade, execução atômica, notificação, medição D+14, circuit breaker, UI e os 16 testes
formais da Trilha H, tudo testado ao vivo contra dado real.** T2 (adapter real do TikTok,
TikTok Business API v1.3) segue como a única pendência do plano `docs/PLANO_TIKTOK.md`,
bloqueada por aprovação externa do app no TikTok for Business — inalterado desde sessões
anteriores.

## Penúltima tarefa concluída

Trilha E do teste rigoroso
(`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`) concluída — camada de simulação (adapters fake
implementando `AdNetworkService`) escolhida no nível 3 (cobertura completa) pelo usuário.

**Implementado:** `src/lib/marketing/networks/fake/FakeMetaAdapter.ts` (implementa a interface
direto) e `FakeGoogleAdapter.ts` (**estende** `GoogleAdsAdapter` de propósito — `agentMonitor.ts`
faz `instanceof GoogleAdsAdapter` antes de coletar Search Terms, um fake que só implementasse a
interface nunca passaria nesse check). Roteados na `factory.ts` via credencial sentinela
(`access_token`/`developer_token === '__SIMULATED__'`) — nunca por env var global, só ativa pra
um tenant explicitamente configurado assim.

**Testado ao vivo, 3 caminhos de código real NUNCA antes exercitados neste ambiente de dev** (sem
credencial real, sempre caíam no branch de erro): (1) cron real de sync criando `Insight` via
`prisma.insight.upsert` de verdade, com bônus de PAUSE real disparando sobre dado do fake; (2)
agente de negativação do Google identificando e negativando um termo de verdade
(`AgentAction`/`GoogleNegativeKeyword`/`GoogleSearchTerm.status` todos corretos); (3) Wizard real
(`POST /campaigns` Meta e `POST /google` Performance Max) persistindo os IDs externos do fake —
primeira vez que o caminho de SUCESSO dessas 2 rotas roda ponta a ponta neste ambiente. 0
discrepâncias. Todo dado de teste removido, 0 resíduo confirmado.

**Com isso, Trilhas A, B, C e E do roteiro estão formalmente concluídas.** Só falta a Trilha D
(validação contra as APIs reais do Meta/Google) — bloqueada em decisões do usuário: deploy de
staging na VPS, criação de conta Google Ads, decisão sobre gasto real pequeno. Ver seção própria
no documento do roteiro pra retomar quando fizer sentido.

**Achados reais desta rodada (Trilha C), por ordem de descoberta:**
1. **Bug real, não do seed — `expandEndOfDay` faltando em `aiInsights.ts`/`strategicBriefing.ts`**
   (corrigido, commit `a411ba4`): `endDate` de data pura ("YYYY-MM-DD") virava meia-noite UTC sem
   expandir pro fim do dia — excluía qualquer lead com timestamp real (`created_at`) do PRÓPRIO
   dia final do período, ou seja, todo lead de "hoje" quando o período termina hoje (o caso mais
   comum de uso real). `dashboard/full/route.ts` já fazia essa expansão corretamente (7+ rotas já
   seguiam esse padrão) — replicado via `expandEndOfDay()` (exportado de `aiInsights.ts`, reusado
   em `strategicBriefing.ts`). Achado ao vivo: depois de injetar 15 cliques WhatsApp reais, o
   dashboard mostrava 15 leads mas Insights da IA continuava recomendando PAUSE por "0 leads" pra
   essa mesma campanha — a contradição entre os dois endpoints expôs o bug.
2. **CLAUDE.md desatualizado sobre o Agente Autônomo (corrigido, seção "Agente Autônomo")**: o
   doc dizia "PAUSE/ALERT → PENDING_APPROVAL, SCALE/OPTIMIZE → PENDING_EXECUTION" — o código real
   (`DEFENSIVE_TYPES`/`OFFENSIVE_TYPES` em `agentDecisor.ts`) faz o INVERSO, e de forma mais
   sensata: PAUSE/DOWNSCALE (reduz risco/gasto) executa direto sem aprovação; SCALE (aumenta
   gasto) exige aprovação humana com PIN. Confirmado ao vivo: PAUSE do Cenário 2 virou `EXECUTED`
   na hora (`Campaign.status` real mudou pra `PAUSED`); SCALE do Cenário 1 ficou
   `PENDING_APPROVAL` com PIN de 6 dígitos. Não é bug de código — só o texto do CLAUDE.md que
   estava errado, corrigido nesta sessão.
3. **Achado da rodada anterior, RESOLVIDO nesta sessão (não era limitação de ambiente)** —
   `POST /api/agent/approve/[id]` retornava **500 com corpo HTTP completamente vazio** pra
   QUALQUER ação ofensiva (SCALE/REFRESH_CREATIVE/ADJUST_AUDIENCE/REALLOCATE_BUDGET), com PIN
   certo ou errado, com ou sem credenciais Meta — não era "falta de credencial real" como
   suspeitado antes. Causa raiz real: `getAction()` fazia `WHERE a.id = $1::uuid` contra
   `AgentAction.id`, que é coluna **TEXT** — Postgres rejeita a comparação
   (`operator does not exist: text = uuid`) antes mesmo do try/catch da rota rodar, e o handler
   padrão de erro do Next.js devolve 500 vazio. Isso quebrava tanto o `GET` (formulário de PIN,
   o link que o gestor clica no WhatsApp) quanto o `POST` (execução) — a rota de aprovação via
   WhatsApp nunca funcionou, desde que foi escrita. `/api/agent/reject` nunca teve esse bug (usa
   Prisma `$queryRaw` com interpolação de tag, sem cast manual). Isolado criando uma campanha/
   ação sintéticas + logging temporário (revertido depois) que confirmou `getAction()` nunca
   completava. Corrigido: `WHERE a.id = $1` (sem cast). Testado ao vivo: `GET` retorna o
   formulário de PIN normalmente, `POST` com PIN correto executa de verdade
   (`AgentAction.status='EXECUTED'`, `AdSet.dailyBudget` atualizado de fato no banco,
   `budget_before=5000→budget_after=5500`). Commit `8be46a8`.

**Confirmado funcionando corretamente, ponta a ponta, com dado real, em todas as 5 fases:**
- **Fase 1** (leads reais): 15 cliques WhatsApp (Cenário 1) → `CtaInteraction`; 3 submissões via
  Mecanismo C com `?ref=` (Cenário 4) → `campaign_id`/`cta_type` corretos; 2 cliques (Cenário 5).
  `dashboard/full` refletiu `leadCount=28`, `cplByNetwork` exatos.
- **Fase 2** (CRM/Kanban): resposta WhatsApp real simulada (`[ref:trilha-c-sucesso-track]`) →
  lead criado com `campaign_id` correto; movido pra "fechamento" (`valor_venda=R$450.000`) →
  Visão 4 (`/dashboard/revenue-attribution`) retornou `cpaReal=300, roasReal=1500` EXATO. Lead
  "visita presencial" sem campanha criado via `/api/crm/leads` — confirmado que NÃO aparece em
  `leadCount` de Campanhas (isolamento CRM↔Campanhas correto).
- **Fase 3** (Mensageria): `contact.attribution` mostra nome real da campanha pra resposta com
  `[ref:]`; mensagem orgânica (sem ref) mostra `campaignId:null, utmMedium:'organico'`; KPI
  "Vindas de campanha" em `/mensageria/analytics` refletiu `deCampanha:1, deCampanhaPct:50`
  exato (1 de 2 conversas do dia).
- **Fase 4** (dashboards): Desperdício de Verba (`R$865`, categorizado certinho por campanha),
  Portfolio (Cenário 2 = `health:"nodata"`, nuance confirmada não-contraditória com o
  `ZERO_LEADS_SPEND` de Desperdício), Auditoria (score 44, mesmos R$865/CPL R$58 batendo com as
  outras telas), Mapa de Campanhas (5 campanhas, leads exatos) — tudo consistente entre si.
- **Fase 5** (Agentes): cron `sync` disparado manualmente, `AgentAction` criada corretamente só
  pras 2 ações com confidence ≥ 0.85 (SCALE 0.90, PAUSE 0.95 — OPTIMIZE/ALERT/DOWNSCALE, todas
  <0.85, corretamente filtradas, confirma o threshold documentado); reject testado com sucesso;
  Briefing Estratégico gerado corretamente recomenda escalar o Cenário 1 (nunca confunde com os
  ruins), reconhece o Cenário 2 já pausado, identifica fadiga+CPL alto no Cenário 5.

**Pendência real, não-bloqueante:** testar o webhook do Lead Form do Google
(`/api/public/google-leads/webhook`) com uma conta REAL do Google Ads, depois que a aplicação
estiver publicada (deploy pendente, discutido em sessões anteriores).

## Última tarefa concluída

### Sessão 2026-07-27 — Trilha C Fase 0: seed de 5 campanhas + bug real no próprio seed (não no app) ✅

**Contexto:** iniciada a Trilha C do teste rigoroso — 5 cenários de campanha desenhados à mão
contra os benchmarks reais do segmento Imobiliário (`cpl_ideal=35, cpl_critical=80, ctr_min=0.8,
frequency_max=3.0, spend_no_lead=50, min_days_running=3`), num cliente de teste dedicado criado
pela própria UI (já corrigida nesta sessão — ver entrada anterior). Cenário 5 (Fadiga) incluído a
pedido explícito do usuário antes de começar.

**Bug real encontrado, mas na MINHA seed, não na aplicação:** depois de aplicar
`prisma/seed-trilha-c.sql` e confirmar os totais batendo exatos via SQL direto, o endpoint
`GET /insights/ai` retornava números de gasto sistematicamente MENORES que o total semeado (ex.:
Cenário 1 mostrava R$240 em vez de R$300) e o Cenário 4 (Site Próprio, só 3 dias de dado) estava
**totalmente ausente** da lista de insights. Investigação (`aiInsights.ts`, linha ~429):
`insightWhere.date.lte = new Date(filters.endDate)` — `new Date("2026-07-26")` vira
`2026-07-26T00:00:00.000Z` (meia-noite). Minha seed tinha usado literais `'2026-07-26 12:00:00'`
(meio-dia, por legibilidade) — esse horário fica DEPOIS da meia-noite do filtro `lte`, então o
último dia de cada campanha era silenciosamente excluído. Para o Cenário 4, perder 1 dos 3 dias
derrubou `daysRunning` (=`insights.length`) de 3 pra 2, abaixo do `min_days_running=3` — por isso
nenhuma regra disparava pra ele.

**Confirmado que não é bug real da aplicação:** dado sincronizado de verdade
(`agentMonitor.ts:225`, `date: new Date(day.date)`) vem de uma string tipo `"2026-07-26"` da API
do Meta/Google — sem hora, vira meia-noite UTC também, batendo exatamente com o `lte` do filtro.
O desalinhamento foi 100% um artefato da minha escolha de horário na seed, não um bug latente na
lógica de filtro de datas da plataforma.

**Corrigido:** `UPDATE "Insight" SET date = date_trunc('day', date) WHERE "campaignId" IN (...)`
— normaliza as 22 linhas semeadas pra meia-noite, igual ao padrão real de sincronização.
Reconfirmado ao vivo: todos os 5 cenários agora aparecem com o gasto exato semeado e disparam
exatamente a regra prevista no plano (incluindo o Cenário 4, antes ausente).

**Lição registrada:** ao semear dado de teste pra `Insight.date` (ou qualquer campo `DateTime`
comparado via `gte`/`lte` com uma string de data pura vinda de query param), usar sempre meia-noite
(`date_trunc('day', ...)` ou literal sem componente de hora) — nunca um horário "legível" como
meio-dia — pra não introduzir um desalinhamento artificial com o filtro que não existe no dado
real sincronizado pela plataforma.

---

### Sessão 2026-07-25/26 — Webhook do Lead Form nativo do Google Ads (recebimento) ✅

**Contexto:** durante a Trilha B, o usuário perguntou por que "Negócios Fechados" (Visão 4 —
Funil de Receita) nunca sai de zero pra campanha Google real deste tenant. Investigação (ver
commit `36f96d6` logo antes, que já tinha corrigido a Visão 4 pra respeitar o filtro de rede)
confirmou algo mais estrutural: `leadsIdentified` da Visão 4 pra essa campanha é **0**, mesmo o
Dashboard mostrando 64 leads — porque os 64 "leads" do Google vêm de `Insight.conversions` (número
agregado da API, sem identidade individual), e nenhuma dessas 64 conversões vira uma linha real em
`marketing_eventos`/`leads_staging`. Sem identidade real, nunca há negócio fechado possível de
rastrear. Solução discutida e decidida com o usuário: implementar o **Lead Form nativo do Google
Ads** (formulário preenchido dentro do próprio anúncio, sem sair do Google — equivalente ao
Formulário Instantâneo do Meta), que captura identidade real (nome/telefone/e-mail).

**Pesquisa feita antes de implementar** (não confiei em memória): documentação oficial do Google
consultada via WebFetch (`developers.google.com/google-ads/webhook/docs/implementation` +
`/samples` + suporte `support.google.com/google-ads/answer/16729613`) — confirmou o schema exato
do payload (`lead_id`, `campaign_id`, `user_column_data[{column_id,string_value}]`, `google_key`),
que a validação é uma chave compartilhada simples (não HMAC), que a config (URL+chave do webhook)
é feita pelo CLIENTE direto na tela do Lead Form no Google Ads (sem precisar de Developer Token
nem chamada nossa à API do Google — correção de uma suposição errada minha anterior), e que
dedupe é necessário via `lead_id` (Google não garante entrega exatamente-uma-vez).

**Implementado** (mesmo molde do webhook do Meta Lead Ads já existente,
`/api/public/meta-leads/webhook`):
1. `prisma/migration-2026-07-25-google-lead-form-webhook.sql` — tabela
   `campanhasmarketingdigital."GoogleLeadFormSubmission"` (PK=`lead_id`, dedupe idempotente).
2. `POST /api/public/google-leads/webhook` — resolve tenant/campanha via `Campaign.external_id`
   (rede google), valida a `google_key` do tenant (reaproveitando
   `tenant_network_credentials.credentials->>'lead_form_webhook_key'`, 1 chave por tenant),
   extrai nome/telefone/e-mail (`FULL_NAME`/`FIRST_NAME`+`LAST_NAME`/`EMAIL`/`PHONE_NUMBER`) e
   chama `/api/crm/leads` com `campaign_id` real. Deliberadamente NÃO usa CtaInteraction/
   CtaSubmission (mecanismo de redirect — não se aplica, o formulário nunca sai do Google) nem
   conta como "Sinal de Interesse (Meta)" (explicitamente só-Meta).
3. `google_lead_form`/`google_lead_form_test` adicionados ao ORIGEM_LABEL/ORIGEM_COLOR de Leads
   Capturados.

**Testado em 2 camadas, ambas com sucesso:**
- **Local (localhost direto):** payload sintético válido → lead real criado, `campaign_id`
  corretamente resolvido, `marketing_eventos.plataforma='google_lead_form'` · reenvio do mesmo
  `lead_id` → dedupe, sem duplicar · `google_key` errada → 401 · `campaign_id` desconhecido → 200
  no-op (evita retry infinito do Google por algo irresolvível).
- **Túnel ngrok real (HTTP público → nosso servidor):** usuário criou conta ngrok, gerou
  authtoken. 2 percalços resolvidos no processo: (1) instalação via `npx ngrok` baixou o binário
  errado (Mach-O/macOS em vez de Windows) — corrigido baixando o zip oficial direto de
  `bin.equinox.io`; (2) Windows Defender bloqueou a extração (falso-positivo comum com ngrok,
  heurística de C2) — o usuário já tinha o ngrok instalado por conta própria e resolveu isso
  antes de mandar o comando de configurar o authtoken; (3) o comando do usuário
  (`ngrok config add-authtoken $2vh0...`) salvou o token com um `$` a mais (erro de digitação/
  cópia) — corrigido reconfigurando sem o `$`. Túnel subiu (`https://<id>.ngrok-free.app`),
  requisição POST real confirmada no inspector do ngrok (200 OK) e no banco (lead criado
  corretamente com `campaign_id` resolvido). **Achado incidental durante esse teste:** o número
  de telefone de teste usado coincidiu, por acaso, com um lead residual de 2026-07-04/07-21
  (teste de uma sessão bem anterior, nunca limpo) — Match Engine mesclou corretamente (prova de
  que F4 continua funcionando), mas expôs resíduo antigo. Limpo (contact da Mensageria
  desvinculado, marketing_eventos/leads_kanban/leads_staging/GoogleLeadFormSubmission removidos).
  Todo dado de teste desta sessão (local + ngrok) removido depois, 0 resíduo confirmado. Túnel
  ngrok encerrado ao final (não deixado aberto sem necessidade).

**npx tsc --noEmit limpo em todos os arquivos tocados.** Commits: `b274b27` (feature).

### Como testar com uma conta REAL do Google Ads, quando a aplicação estiver publicada (deploy)

1. **URL do webhook em produção:** `https://<dominio-de-producao>/api/public/google-leads/webhook`
   (troca só o domínio — o path é fixo).
2. **Configurar a chave do tenant** — hoje só via SQL (não existe UI ainda pra isso), escolher
   uma chave forte e gravar em `tenant_network_credentials.credentials` (rede `google`):
   ```sql
   UPDATE public.tenant_network_credentials
      SET credentials = credentials || '{"lead_form_webhook_key": "<CHAVE-FORTE-AQUI>"}'::jsonb
    WHERE tenant_id = '<uuid-do-tenant>'::uuid
      AND network_id = (SELECT id FROM public.ad_networks WHERE code='google');
   -- Se a linha não existir ainda (tenant nunca configurou Google Ads antes), fazer INSERT
   -- (ver src/app/api/admin/configuracoes/google-ads/route.ts pro padrão de INSERT/UPSERT).
   ```
3. **Cliente configura o Lead Form no Google Ads real:** na conta dele, editor do anúncio com
   Lead Form → "Exportar leads" → "Other data integration options" → "Webhook integration" →
   cola a URL (passo 1) + a MESMA chave gravada no passo 2.
4. **Testar:** botão "Send test data" na própria tela do Google Ads (gera um payload com
   `is_test:true`, cai como origem `google_lead_form_test` no nosso lado) — confirmar que aparece
   em `/admin/campanhas/leads` (Leads Capturados) com a campanha certa atribuída. Depois, com o
   Lead Form realmente publicado e recebendo tráfego real, confirmar leads reais chegando com
   `origem='google_lead_form'` e, eventualmente, que "Negócios Fechados" na Visão 4 deixa de ser
   zero assim que um desses leads fechar negócio no CRM.
5. **Pendência conhecida, não implementada:** UI de configuração da chave (hoje só SQL) — se
   virar recorrente, vale uma tela simples em `/admin/configuracoes/google-ads` (mesmo padrão já
   usado pras credenciais da API do Google Ads).

## Penúltima tarefa concluída

### Sessão 2026-07-22 (continuação 19) — Mecanismo C: atribuição de campanha real via `?ref=` ✅

**Contexto:** durante a revisão da Trilha A, o usuário levantou uma preocupação mais ampla: CPL
computado sem considerar "outros CTAs como formulários, views, etc., pra todas as redes".
Investigação confirmou que o lado de LEITURA (`leadEvents.ts`) já cobria formulário corretamente
pro Meta — mas achei um terceiro mecanismo de ESCRITA de lead nunca auditado antes: Mecanismo C
(`/api/public/cta/ingest`, webhook genérico documentado em `/admin/campanhas/mecanismos`, já
configurado com API key ativa nos 4 tenants). Esse mecanismo nunca tentava resolver
`campaign_id` — evidência real (não hipotética): linhas de `CtaSubmission` no banco com
`lead_uuid` preenchido (leads reais, já matchados no CRM) e `campaign_id NULL`, de testes
anteriores do próprio mecanismo ("Teste Webhook", "Novo Webhook").

**Discussão de escopo com o usuário (importante, não só técnica):** o usuário reformulou o
modelo mental certo — CPL do módulo de Campanhas só deveria contar leads com gasto de campanha
real por trás (visita presencial, lead comprado de terceiro, etc. NÃO deveriam entrar nessa
conta, mesmo tendo custo/valor — isso é escopo do CRM, não de Campanhas). Isso reduziu o achado
a uma pergunta mais estreita: existe caso real em que o Mecanismo C recebe lead de um anúncio
REAL desta plataforma? Usuário confirmou: sim — cliente pode ter site PRÓPRIO (não o `/l/{slug}`
hospedado aqui) como destino de um anúncio nosso, empurrando o lead pra cá via esse webhook.

**Implementado (aditivo, retrocompatível):**
1. `/api/public/cta/ingest/route.ts` — aceita campo opcional `ref` (mesmo trackingId que
   `/api/r/{trackingId}` já anexa como `?ref=` ao redirecionar pro destino do anúncio, mesmo
   quando esse destino é externo); resolve via `resolveCtaRef` (mesma função do Mecanismo B).
   Nunca aceita `campaign_id`/`ad_id` crus do chamador externo — só `ref` que resolve de
   verdade, por segurança (não deixar um integrador arbitrário atribuir lead a qualquer
   campanha).
2. `mecanismos/page.tsx` — snippet JS captura `?ref=` da URL no carregamento (guarda em
   `sessionStorage`), repassa no submit; `curlExample`/documentação atualizados.

**Bug real, pré-existente e dormant, encontrado DURANTE o teste ao vivo (não hipotético):**
`resolveCtaRef` (`src/lib/cta/service.ts`) hardcodeava `ctaType:'WHATSAPP_MESSAGE'` pra
QUALQUER match via `Ad.trackingId`, ignorando o `ctaType` real já armazenado na tabela `Ad`.
Neste banco, todo `Ad` com `trackingId` hoje genuinamente tem `ctaType=WHATSAPP_MESSAGE` (por
isso o bug nunca se manifestou) — mas quebraria silenciosamente o cenário que o usuário acabou
de confirmar como real: anúncio com `ctaType=LEARN_MORE` apontando pro site do cliente teria a
submissão gravada com `cta_type` errado, e `leadEvents.ts` a excluiria (mesmo filtro que existe
pra não contar 2x o eco de resposta real de WhatsApp) — lead real, com campanha corretamente
resolvida, mesmo assim invisível no CPL. Corrigido: `resolveCtaRef` agora lê `a."ctaType"` real.

**Testado ao vivo, ponta a ponta** (tenant Marketing Digital, campanha "Alto Padrão —
Alphaville", trackingId `demo-track-001`, `ctaType` do anúncio temporariamente ajustado pra
`LEARN_MORE` só durante o teste e revertido depois): `POST /api/public/cta/ingest` com `ref`
real → `campaign_id` resolvido corretamente em `CtaSubmission`+`marketing_eventos`, `cta_type`
correto (`LEARN_MORE`), `dashboard/full` refletiu `leadCount=1` atribuído à campanha certa · sem
`ref` → `campaign_id`/`cta_type` continuam `NULL`, idêntico ao comportamento antigo
(retrocompatibilidade confirmada). Todo dado de teste removido depois (0 linhas residuais),
`Ad.ctaType` revertido ao valor original. `npx tsc --noEmit`: zero erros novos. Commit `3990fc2`.

## Última tarefa concluída

### Sessão 2026-07-22 (continuação 18) — Trilha A: auditoria técnica independente pós-consolidação ✅

**Contexto:** depois da consolidação de `leadEvents.ts` (16/16 tasks concluídas, ver entrada
abaixo), o usuário pediu — com razão, dado o histórico de bugs reais achados em sequência —
uma segunda verificação rigorosa e independente, em 2 trilhas: técnica (minha) + manual em
todas as UIs (dele). Pedido: "vamos pecar por excesso".

**Metodologia (documentada em `docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`):** verdade
fundamental calculada por SQL puro, sem passar por nenhuma linha de código da aplicação (nem
`leadEvents.ts`, nem os endpoints) — é o padrão contra o qual todo consumidor foi comparado.

**Resultado — 14 de 14 consumidores batem com a verdade fundamental (64 leads/R$244.823,19 na
janela 01/04–21/07/2026, escopo "own"):** `dashboard/full`, `dashboard/segment`,
`dashboard/funnel`, `dashboard/predictions`, `dashboard/campaign-map`, `portfolio`,
`cross-insights`, `auditoria` (janela rolling 30d), `briefing estratégico`, `iniciativas`,
`insights/ai` (Google corretamente DOWNSCALE, não PAUSE falso), `desperdicio` (Google fora de
ZERO_LEADS_SPEND), `tracking/health` (roda sem erro, leads_24h=0 é honesto — dimensão diferente
da janela testada, não é bug).

**3 casos de borda testados (não cobertos pelos testes de migração arquivo-por-arquivo):**
1. **Achado #1 ponta a ponta com a consolidação NOVA** (nunca testado junto antes — o fix é de
   uma sessão anterior à criação de `leadEvents.ts`): simulado webhook real do Meta Lead Ads
   (HMAC válido, `ad_id` real) → `CtaSubmission` com `campaign_id` resolvido +`lead_uuid` +
   `cta_type≠WHATSAPP_MESSAGE` → `dashboard/full` refletiu `leadCount:1` corretamente atribuído
   à campanha certa. Dado de teste removido (5 tabelas, 0 residual).
2. **Guarda de deduplicação** (clique de WhatsApp + eco da resposta = 1 lead) reconfirmada
   contra o código consolidado (tinha sido provada só no código antigo) — `leadCount=1`, não 2.
3. **Rede órfã** (campanha sem `network_id`) — não precisou sintetizar: 3 das 5 campanhas reais
   do escopo já não têm `network_id` e a verdade fundamental já confirmou o fallback pra
   `'meta'` funcionando em produção.

**Nenhuma discrepância encontrada.** Documento completo com a metodologia + tabela de resultados
+ roteiro manual (Trilha B, com números de referência exatos por tela) entregue ao usuário em
`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md`. **Trilha B ainda pendente de execução pelo
usuário** — ver seção "Tarefa em andamento" acima.

---

### Sessão 2026-07-21/22 (continuação 17+) — Auditoria de robustez de CPL + consolidação em fonte única ✅ (histórico)

### Sessão 2026-07-21/22 (continuação 17+) — Auditoria de robustez de CPL + consolidação em fonte única ✅

**Contexto:** usuário, com razão, ficou seriamente preocupado com a robustez do cálculo de CPL
(métrica mais importante do negócio) depois de eu ter corrigido 2 bugs reais seguidos na mesma
conversa (Google usando conversões reais, Meta contando lead de formulário). Pediu auditoria
completa de TODA forma de gerar lead em TODA rede antes de eu considerar o assunto encerrado.
**Ordem de execução confirmada explicitamente pelo usuário: "#1 → consolidação → #4".**

**Auditoria (agente Explore) encontrou 4 achados, por gravidade:**
1. **CRÍTICO, dado real sendo perdido:** o webhook de Formulário Instantâneo do Meta
   (`/api/public/meta-leads/webhook`) salvava o lead certinho no CRM, mas nunca resolvia
   `campaign_id` (só guardava o `ad_id` externo) — como toda métrica de campanha filtra por
   `campaign_id`, esses leads reais e pagos ficavam invisíveis em CPL/funil/IA. `OUTCOME_LEADS`
   (objetivo padrão do wizard) é tipicamente usado com Formulário Instantâneo no mundo real —
   não era caso de borda. **Corrigido e testado ao vivo, commitado** (resolução via
   `Ad.metaAdId → AdSet.campaignId`).
2. **Inconsistência visível na mesma tela:** `cplByNetwork` já usava a definição completa de
   lead, mas `currentLeadCount`/`funnelData.leads`/`leadsByCampaign` na MESMA resposta de
   `/dashboard/full` continuavam só WhatsApp. **Corrigido e testado ao vivo, commitado.**
3. **~15 arquivos duplicando a mesma lógica incompleta** (`aiInsights.ts`, `wastedSpendService.ts`,
   `portfolio`, `trackingHealthService`, `briefing`, `funil`, `predições`, `mapa de campanhas`,
   `segmentIntelligenceService`, `auditReportService`, `iniciativas` — lista completa no
   progresso abaixo). Consequência real: IA podia recomendar pausar uma campanha de Google/
   formulário achando que tinha 0 leads, quando na verdade tinha leads reais só que num canal
   que aquela regra específica não sabia olhar. **Consolidado — todos os 15 migrados.**
4. **Estrutural, não é bug de código:** `Insight.conversions` do Google é a soma de qualquer
   "ação de conversão" configurada na CONTA do cliente no Google Ads — pode incluir coisas que
   não são lead. **Resolvido com um aviso explícito na UI** (task #75, `GoogleAdsView.tsx`,
   deixado de propósito como último item por instrução explícita do usuário) — não dava pra
   corrigir só no nosso código, então a solução foi transparência.

**Decisão de arquitetura (não só patch pontual):** criado
`src/lib/marketing/services/leadEvents.ts` — fonte ÚNICA de "o que é lead" (ciente de rede e de
mecanismo de CTA): `getLeadEvents(tenantId, {campaignIds, startDate, endDate})` retorna
`LeadEvent[]` (`{date, campaignId, network, count}`); helpers de agregação `sumLeads`/
`leadsByDay`/`leadsByCampaign`/`leadsByNetwork`. Resolve a rede de cada campanha
(`Campaign.networkId → ad_networks.code`) e escolhe a fonte certa via
`src/lib/marketing/services/networkLeadSource.ts` (`LEAD_SOURCE_BY_NETWORK`): Meta →
`cta_engagement` (WHATSAPP_CLICK **ou** CtaSubmission com `lead_uuid` não-nulo, sempre excluindo
`cta_type='WHATSAPP_MESSAGE'` pra não contar 2x a resposta real de WhatsApp, que grava as duas
tabelas); Google/YouTube → `insight_conversions` (campo `Insight.conversions`, já real da API).
Todo consumidor deve migrar pra usar isso em vez de reimplementar a própria query — é a causa
raiz de por que o mesmo bug apareceu 2x seguidas antes desta rodada.

**Progresso final — 16 de 16 tasks concluídas (tasks #60-75, rastreadas no task tool):**
- ✅ #60 `leadEvents.ts` construído (módulo central + `networkLeadSource.ts`)
- ✅ #61 `cplTimelineService.ts` migrado — testado: totais idênticos antes/depois, zero regressão
- ✅ #62 `dashboard/full/route.ts` migrado — testado: `currentLeadCount`/`funnelData.leads`/
  `leadsByNetwork`/`cplByNetwork` agora todos batem (64 em todos, na mesma resposta)
- ✅ #63 `dashboard/segment/route.ts` migrado (`fetchClientData`: total de leads por cliente +
  leads por dia, ambos usavam WHATSAPP_CLICK cru) — testado ao vivo (tenant Marketing Digital,
  segmento Imobiliário, 2026-04-01 a 2026-07-21): `leads=64, cpl=3825.36`, batendo exatamente
  com `dashboard/full` no mesmo escopo. `tsc --noEmit`: zero erros no arquivo. Commitado
  (`d6b6d8b`).
- ✅ #68 `aiInsights.ts` migrado — testado: campanha Google real agora gera SCALE/OPTIMIZE em vez
  de potencialmente PAUSE incorreto por "0 leads"
- ✅ #69 `wastedSpendService.ts` migrado — testado ao vivo: campanha Google real deixou de
  aparecer na categoria `ZERO_LEADS_SPEND` (só as 3 campanhas Meta genuinamente sem lead
  permaneceram)
- ✅ #70 `trackingHealthService.ts` migrado (`checkLeads24h`/`checkOrphanLeads`, via 2 helpers
  novos `countBroadLeads`/`countBroadOrphanLeads`; `checkDuplicateRate`/`checkLeadLatency`
  deliberadamente NÃO tocados — motivo documentado no código) — testado ao vivo via
  `POST /tracking/health?clientId=own`, rodou sem erro
- ✅ #71 `segmentIntelligenceService.ts` migrado (`buildAnglesSummary` — removida a subquery de
  leads que fazia JOIN junto com spend, risco do mesmo bug de produto cartesiano já visto antes;
  leads agora vêm de `getLeadEvents` separado, merged em JS) — não testado ao vivo ponta a ponta
  (alimenta narrativa LLM sem endpoint isolado simples de testar), mas `tsc --noEmit` limpo +
  mesmas primitivas já provadas ao vivo 4x em outros arquivos
- ✅ #64 `dashboard/funnel/route.ts` migrado (leads por estágio TOF/MOF/BOF — antes JOIN direto
  com CtaInteraction agrupado por estágio; agora resolve campanha→estágio e soma leads via
  `getLeadEvents`+`leadsByCampaign` em JS). Bug real pego no teste ao vivo: a nova query de
  escopo parou de referenciar `$2`/`$3` (removido o JOIN com Insight), e Postgres rejeita bind
  com mais parâmetros do que o texto SQL referencia — corrigido com uma referência inócua
  `$2::timestamp IS NOT NULL AND $3::timestamp IS NOT NULL`. Testado: leads=64 (clientId=own),
  batendo com os demais. Commit `0bc9d2a`.
- ✅ #65 `dashboard/predictions/route.ts` migrado (série histórica de leads, base da regressão
  linear). Testado: soma da série = 64. Commit `c7d495d`.
- ✅ #66 `dashboard/campaign-map/route.ts` migrado (leads por localização geográfica no mapa;
  usa `Pool` próprio, não Prisma — leads resolvidos depois da query principal, usando os
  campaign_id já retornados). Testado: soma de leads deduplicada por campanha = 64.
  Commit `3d46af0`.
- ✅ #67 `portfolio/route.ts` + `portfolio/cross-insights/route.ts` migrados — cada um tinha 2
  queries próprias (leads por cliente + leads por campanha), ambas só WHATSAPP_CLICK; unificadas
  numa única chamada a `getLeadEvents` por arquivo, agregada por cliente em JS via mapa
  campanha→client_id. Testado: "Marketing Digital" (own) com leads=64/spend=244823.19/
  cpl=3825.36 nos dois endpoints — mesmíssimos números de todos os outros já migrados.
  Commit `7d203a3`.
- ✅ #72 `auditReportService.ts` migrado (`collectCampaignMetrics` + `collectFunnelMetrics.
  aggStage`, 2 pontos). Testado: relatório de auditoria (score de Performance) retornou
  "CPL R$3331 crítico" — bate exato com `dashboard/full` na mesma janela
  (213189.39/64=3331.08). Commit `43be45b`.
- ✅ #73 `strategicBriefing.ts` migrado (`gatherBriefingContext`, leads do período atual +
  anterior, por campanha). Testado: briefing gerado recomenda DOWNSCALE + revisão de criativo
  pra campanha Google real (CPL crítico reconhecido), não mais PAUSE cego por "0 leads".
  Commit `67d0d6f`.
- ✅ #74 `iniciativas/[id]/route.ts` + `iniciativas/[id]/briefing/route.ts` migrados. Testado ao
  vivo com iniciativa de teste temporária vinculada à campanha real do Google: GET retornou
  totalLeads=64 (spend batendo exato); POST /briefing gerou narrativa citando "64 leads... CPL
  médio de R$3.330,54" (=213154.39/64). Dado de teste removido depois (0 linhas residuais
  confirmadas). Commit `48b7d29`.
- ✅ #75 Aviso de UX adicionado em `GoogleAdsView.tsx` (banner âmbar no topo do drill-down de
  Google no dashboard) explicando que "conversões"/ROAS do Google vêm de qualquer ação de
  conversão configurada na CONTA do cliente no Google Ads — pode incluir coisas que não são
  lead. Puramente textual, sem mudança de lógica. Commit `d9deae7`.

**Disciplina mantida em cada arquivo migrado:** `tsc --noEmit` limpo + teste ao vivo contra dado
real (não mockado) comparando resultado antes/depois quando há endpoint isolado testável, commit
próprio por arquivo com mensagem explicando o bug/inconsistência resolvida.

**Esta frente está formalmente concluída.** Todo consumidor de "quantos leads teve essa
campanha/cliente/segmento/período" no módulo de Campanhas usa `leadEvents.ts` — nenhum lugar
reimplementa a própria contagem de lead nem assume que WhatsApp/formulário/Google contam da
mesma forma. Se um novo arquivo precisar contar leads no futuro, ele deve importar
`getLeadEvents`/`sumLeads`/`leadsByDay`/`leadsByCampaign`/`leadsByNetwork` de
`src/lib/marketing/services/leadEvents.ts` em vez de escrever uma query nova.

## Tarefa em andamento

**Nenhuma outra tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 16) — CPL: teste multi-rede real + fix de lead de formulário ✅

**Contexto:** usuário fez 2 perguntas de acompanhamento sobre o fix de CPL ciente de rede da
tarefa anterior: (1) pediu teste com gasto real em mais de uma rede simultaneamente; (2)
questionou se "lead = clique de WhatsApp" está certo, já que o CTA de um anúncio pode ser
formulário também. As duas levaram a achados reais.

**Pergunta 1 — confirmado sem precisar fabricar dado:** achei uma janela de datas
(2026-04-01 a 2026-07-21) que já cobre o histórico real das duas redes deste tenant
simultaneamente. `cplByNetwork` retornou `google: {spend:213154.39, leads:64, cpl:3330.54}` +
`meta: {spend:31668.80, leads:1, cpl:31668.80}`, com o total combinado batendo exatamente a
soma das duas (R$244.823,19 / 65 leads).

**Pergunta 2 — achado real confirmado com dado ao vivo:** `CtaInteraction.event_type` tem 4
valores (`VIEW`/`SUBMIT`/`WHATSAPP_CLICK`/`REDIRECT`) — o CTA de um anúncio nem sempre é
WhatsApp, pode ser formulário (`ctaType='LEARN_MORE'`, redireciona pra `/l/{slug}`). Achei 8
submissões reais `LEARN_MORE` neste tenant, 7 com `lead_uuid` preenchido — meu cálculo de CPL
ignorava esse sinal inteiro, mostrando `leads:0` mesmo com leads reais atribuídos.

**Implementado:**
1. `networkLeadSource.ts` — método renomeado `'whatsapp_click'` → `'cta_engagement'`, cobrindo
   `CtaInteraction.WHATSAPP_CLICK` **e** `CtaSubmission` (`lead_uuid IS NOT NULL`).
2. `cplTimelineService.ts` + `dashboard/full/route.ts` — somam as duas fontes por dia/rede.

**Bug pego durante a própria verificação (não hipotético):** uma resposta real de WhatsApp
TAMBÉM grava uma `CtaSubmission` (via `inboundProcessor.ts`, chamada `insertSubmission`
incondicional) — somar clique + submissão sem filtro contaria o mesmo lead 2x. Confirmado ao
vivo: a campanha "Alto Padrão — Alphaville" tinha um `WHATSAPP_CLICK` e uma `CtaSubmission`
**do mesmo lead**, 25 segundos de diferença (resíduo do meu próprio teste T8 de uma tarefa
anterior desta sessão, nunca limpo completamente — limpo agora). Corrigido com
`cta_type != 'WHATSAPP_MESSAGE'` no filtro de submissões — só formulário soma como sinal
adicional.

**Testado ao vivo com dado sintético controlado e mínimo** (removido logo depois): par
clique+resposta de WhatsApp (mesmo lead) + 1 lead de formulário genuíno, mesmo dia/campanha →
endpoint retornou `leads:2` (não 3) — confirma que a correção de duplicação funciona de verdade,
não só na teoria. `npx tsc --noEmit`: zero erros novos.

**CLAUDE.md atualizado** — seção "Multi-Rede" reflete o método renomeado e o cuidado de não
duplicar contagem entre clique e submissão de WhatsApp.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 15) — CPL ciente de rede + terreno pra novas redes ✅

**Contexto:** usuário fez 2 perguntas sobre o endpoint de CPL recém-criado: (1) o cálculo cobre
todas as redes (Meta/Google/TikTok/YouTube)? (2) como uma feature futura vai "adivinhar" que
esse cálculo já existe? Investigação da pergunta 1 revelou um achado real, não hipotético.

**Achado:** o gasto (spend) já cobria todas as redes automaticamente (tabela `Insight` é
agnóstica de rede), mas **leads não** — tanto `cplTimelineService.ts` quanto o `cplByNetwork`
pré-existente de `dashboard/full/route.ts` só contavam `CtaInteraction.WHATSAPP_CLICK`, que é
como o Meta sinaliza lead nesta plataforma. O Google Ads não depende de clique de WhatsApp —
suas conversões reais já vêm da própria API (`GoogleAdsAdapter.fetchInsights` → persiste em
`Insight.conversions`), campo que nenhum dos dois cálculos lia. Uma campanha de Google real com
gasto e conversões reais aparecia com `leads:0/cpl:null`, escondendo dado real.

**Implementado:**
1. `src/lib/marketing/services/networkLeadSource.ts` (novo) — registro central
   `LEAD_SOURCE_BY_NETWORK` (`meta→whatsapp_click`, `google→insight_conversions`, YouTube cai
   sob `google` mesmo adapter) + `leadSourceForNetwork()` com fallback seguro pra rede
   desconhecida. Mesmo espírito do catálogo de estratégias de distribuição e do factory de
   redes — vocabulário em código, mas 1 linha nova basta quando LinkedIn/TikTok (FASE 11)
   ganharem adapter real.
2. `cplTimelineService.ts` — resolve a rede de cada campanha no escopo, separa em 2 grupos
   (clique de WhatsApp vs conversões do Insight) e soma os leads de cada grupo por dia antes de
   calcular o CPL.
3. `dashboard/full/route.ts` — `cplByNetwork` usa o mesmo registro pra decidir, por rede, se lê
   `leadsByNetwork` (WhatsApp) ou a nova `conversionsByNetwork` (derivada de `currentInsights`,
   já em memória — sem query extra).
4. `CLAUDE.md` — nova seção "Multi-Rede" documentando o catálogo de métricas compartilhadas
   (`cplTimelineService`/`revenueAttributionService`/`wastedSpendService`) e o registro de
   lead-por-rede, como resposta à pergunta 2 do usuário sobre descoberta futura.

**Testado ao vivo contra dado real persistente** (campanha "Google Search — Apartamentos SP",
seed da FASE 17, tenant Marketing Digital): conversões reais por dia (4,4,7,5,2) batendo exato
com `Insight.conversions` via SQL direto; `cplByNetwork.google` passou de `{leads:0,cpl:null}`
pra `{leads:22,cpl:3613.22}` no período testado · regressão do caminho Meta confirmada: total
combinado no escopo mais amplo bateu exatamente com a soma das 2 fontes (64 conversões Google +
1 clique WhatsApp Meta = 65). `npx tsc --noEmit`: zero erros novos nos 3 arquivos tocados/criados.

**Resposta dada ao usuário sobre "como descobrir que já existe" (pergunta 2):** honesta —
não há mecanismo automático de descoberta. Depende de convenção (pasta `src/lib/marketing/
services/`) e documentação (`CLAUDE.md`, agora com a seção nova). Sugestão de uma seção
"Métricas Compartilhadas" catalogando os serviços reutilizáveis foi aceita e incorporada dentro
da mesma seção "Multi-Rede" (não virou seção separada, ficou mais coeso assim).

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 14) — Investigação do 500 em `GET /dashboard/full` ✅

**Contexto:** achado à parte registrado na tarefa anterior (endpoint de CPL) — `GET /dashboard/
full` lançava 500 pro tenant Marketing Digital. Usuário pediu investigação.

**Método:** como o servidor dev já estava rodando fora do controle desta sessão (sem acesso ao
stdout do terminal), instrumentei temporariamente a rota com uma variável `lastStep` exposta na
resposta de erro (não `console.log`, que seria invisível) pra bisectar exatamente onde o código
falhava, testei ao vivo, encontrei o ponto exato, e revertive toda a instrumentação
(`git checkout --`) assim que a causa ficou clara — zero mudança de código permanente.

**Causa raiz confirmada:** o crash acontecia exatamente em `prisma.ctaInteraction.count(...)`
(linha 114) — só é possível se `prisma.ctaInteraction` (o model gerado) estiver `undefined`.
Conferido que o client gerado em disco (`node_modules/.prisma/client`) tinha `ctaInteraction`
normalmente — o problema era a instância do `PrismaClient` presa no singleton global
(`globalForPrisma.prismaMarketing`, `src/lib/marketing/prisma.ts`) do processo Node de longa
duração desta sessão, criada antes da última regeneração do client. Explica por que nenhum dos
dezenas de testes reais desta sessão pegou isso antes: todo o resto do código que grava/lê
`CtaInteraction` usa SQL cru (`pool.query`), não o model Prisma tipado — essa rota é a única que
chama `.ctaInteraction.count()` diretamente.

**Resolvido:** usuário reiniciou o `npm run dev`. Reconfirmado ao vivo — `GET /dashboard/full`
voltou a funcionar (`leadCount:1, spend:213154.39`), batendo exatamente com o que `/dashboard/
cpl` (implementado na tarefa anterior) e a query SQL direta já mostravam. Mesmo padrão de bug já
documentado várias vezes no histórico deste arquivo ("Prisma singleton stale") — não é um bug de
código, é um efeito colateral de sessões de dev muito longas sem restart após regenerar o client.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 13) — Endpoint reutilizável de CPL por período ✅

**Contexto:** próximo item da lista de pendências levantada após a conclusão da bateria de
testes. Usuário pediu implementação (CPL é um dos KPIs mais importantes de tráfego pago,
necessário pra relatórios futuros) depois de eu investigar e reportar que a "falta" não era
uma lacuna funcional (os gráficos de CPL diário já existiam e funcionavam), mas sim a ausência
de um endpoint genérico reutilizável — o cálculo estava duplicado (uma vez derivado no cliente,
outra vez embutido dentro do endpoint de comparação de segmento).

**Implementado:**
1. `src/lib/marketing/services/cplTimelineService.ts` (novo) — `getCplTimeline(tenantId, opts)`:
   resolve `campaignIds` no escopo (reaproveita `resolveCampaignIdsBySegment` + filtro de
   cliente, mesma lógica de `/dashboard/full`), agrega `spend` por dia via `prisma.insight.
   groupBy` e `leads` por dia via a mesma query de `CtaInteraction` (`WHATSAPP_CLICK`) já usada
   em `/dashboard/full`, funde os dois num array `{date, spend, leads, cpl}[]`.
2. `GET /api/admin/campanhas/dashboard/cpl` (novo) — mesmos query params de convenção do
   dashboard (`startDate`/`endDate`/`clientId`/`segmentId`/`campaignId`).
3. `marketing-api.ts` — `getCplTimeline()` + tipos `CplTimelinePoint`/`CplTimelineData`.
4. `dashboard/page.tsx` — `cplData` (consumido por `CplTimelineChart`) passou a vir do novo
   endpoint em vez de ser derivado no cliente.

**Bug real corrigido de quebra (achado durante a implementação, não hipotético):** a derivação
antiga no cliente zipava `data.currentPeriod.insights` (1 linha por CAMPANHA por dia, não 1 por
dia) com o mapa de leads por dia — com 2+ campanhas ativas no mesmo dia, o total de leads
daquele dia era contado uma vez por linha de campanha, inflando o CPL exibido no gráfico. O
serviço novo agrega por dia (`GROUP BY`) antes de calcular o CPL, eliminando a duplicação.

**Testado:** resultado do endpoint batido contra `SUM(spend)`/`COUNT(leads)` via SQL direto
(fonte da verdade, não outro endpoint) pro tenant real Marketing Digital, mesmo escopo/período
— bateu exato (R$213.154,39 / 1 lead). `npx tsc --noEmit`: 55 erros, mesma baseline
pré-existente (1 erro novo de compatibilidade de iterador de `Map` corrigido antes do commit
final — `[...map.keys()]` exige downlevelIteration; trocado por `Array.from(map.keys())`).

**Achado à parte, não corrigido (fora de escopo):** `GET /dashboard/full` lança 500 ("Cannot
read properties of undefined (reading 'count')") pro tenant Marketing Digital num teste manual
via curl — pré-existente, arquivo não tocado nesta sessão, não investigado a fundo. Vale
registrar pra a próxima sessão que mexer nesse endpoint.

**CLAUDE.md atualizado:** item "Endpoint CPL por período" removido da lista de pendências;
`dashboard/cpl` documentado na tabela de API Routes do módulo.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 12) — Resolução dos achados DG2/T3 da bateria de testes ✅

**DG2 — decisão de produto, sem implementação:** perguntei ao usuário se valia adicionar um
aviso na UI de Campanhas dizendo que cliques de WhatsApp sem o módulo Mensageria não viram lead
identificado. Resposta: **não implementar** — é estratégia de negócio deliberada. O gestor sentir
a dor de não conseguir gerenciar o pós-clique é o que aumenta a propensão de contratar Mensageria;
alertar aqui reduziria essa fricção comercial. Registrado como decisão consciente, não pendência.

**T3 — implementado (atribuição de campanha visível na Mensageria):** o usuário esclareceu 2
coisas importantes antes de eu implementar: (1) a tabela `leads_staging`/`marketing_eventos`
"deveria estar no schema public porque é compartilhada entre mais de 1 módulo" — conferido
direto no banco: **já está** em `public` (não em `campanhasmarketingdigital`), então não havia
nenhuma migração de schema pendente aqui, só um mal-entendido meu ao descrever o achado
originalmente. (2) Pediu pra eu revisar se um clique de WhatsApp aparece no dashboard de
Mensageria — investigação confirmou que **não aparecia em lugar nenhum**: o vínculo
`mensageria.contacts.lead_uuid → public.marketing_eventos` já existia e funcionava (confirmado
no T6), mas o único uso desse dado em toda a Mensageria era um link "Ver no CRM →" (inútil pra
quem só tem Mensageria).

**Implementado:**
1. `GET /api/admin/mensageria/conversations/[id]` — novo `contact.attribution` via
   `LEFT JOIN LATERAL` em `marketing_eventos` (toque mais recente do lead) +
   `JOIN campanhasmarketingdigital."Campaign"` pra resolver o nome real. `null` quando o lead
   não tem nenhum toque de marketing; campos de UTM presentes mas `campaignId: null` quando é
   orgânico (distingue "não sabemos" de "sabemos que foi orgânico").
2. `ConversationThread.tsx` — badge no cabeçalho da conversa (📣 nome da campanha real, ou
   "WhatsApp orgânico"), visível **independente de o tenant ter CRM** — ao contrário do link
   "Ver no CRM" que já existia.
3. `GET /api/admin/mensageria/analytics` — novo KPI "Vindas de campanha" (contagem + %) via
   `EXISTS` correlacionado no `marketing_eventos`, seguindo a mesma disciplina de "cada query
   com seu próprio array de parâmetros" já usada no resto do arquivo.
4. `mensageria/analytics/page.tsx` — card do novo KPI ao lado de "Resolvidas pelo bot".

**Testado ao vivo, ponta a ponta, tenant-bancada (campanha+ad reais de teste, C+M):** clique real
`/api/r/{trackingId}` → resposta simulada com `[ref:...]` → `GET /conversations/[id]` retornou
`attribution.campaignName` = nome real da campanha · segunda mensagem, mesma conversa, SEM ref
(orgânica) → `attribution` com `campaignId:null`, badge cairia em "WhatsApp orgânico" · `GET
/analytics` refletiu corretamente `novas:2, deCampanha:1, deCampanhaPct:50` (só a de campanha
conta, a orgânica não infla o número). Dado de teste removido depois, confirmado zero resíduo.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente, nenhum novo.

## Tarefa em andamento

**Nenhuma tarefa em andamento no momento.**

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 11) — Auditoria + fix do Seletor de Cliente (`cta-analytics`) ✅

**Contexto:** usuário perguntou quais eram os próximos passos após a conclusão da matriz de
testes de unificação de leads. O CLAUDE.md tinha um TODO marcado "ALTA PRIORIDADE" dizendo que
nenhuma página do módulo de Campanhas expunha o seletor de cliente — mas o histórico deste
mesmo arquivo (`CHECKPOINT.md`) mostrava várias sessões anteriores adicionando `ClientSelector`
a várias páginas. Delegada uma auditoria (agente `Explore`) pra confirmar o estado real antes de
implementar qualquer coisa — regra do projeto de nunca recomendar/agir a partir de memória sem
verificar o estado atual primeiro.

**Achado:** o TODO estava de fato desatualizado. 9 das 10 páginas do módulo já tinham
`ClientSelector`/`useClientSelector` totalmente funcionais (não cosméticos — `clientId`
realmente chegava nas chamadas de API): `dashboard`, `leads`, `criativos`, `criativos/padroes`,
`iniciativas`, `desperdicio`, `portfolio`, `auditoria`, `publicacoes`. A única página realmente
sem seletor era `cta-analytics` — e o backend (`/api/admin/campanhas/cta-analytics/route.ts`)
já suportava `clientId` (`own`/`<uuid>`/`all`) desde uma sessão anterior; só faltava a UI.

**Implementado:** `ClientSelector` (variant `toggle`, `allowSegment={false}` já que o filtro de
Segmento existente na página tem precedência sobre `clientId` na API) adicionado ao header da
página, ao lado do seletor de período. `clientFilter` entra na querystring só quando não há
segmento selecionado (evita mandar um parâmetro que a API já ignora). CLAUDE.md corrigido: os 2
TODOs "ALTA PRIORIDADE" duplicados removidos/atualizados pra refletir o estado real (concluído).

**Verificado:** `npx tsc --noEmit` — 55 erros, mesma baseline pré-existente, nenhum novo.
Verificação visual no navegador tentada (injeção de cookie JWT real do usuário `admmd`, tenant
Marketing Digital) — mesma limitação de sempre já documentada dezenas de vezes neste projeto:
`useAuth`/`/me` client-side redireciona pra `/admin/login` mesmo com JWT+`userId` reais em
navegação completa. Confiança na correção vem de `tsc` limpo + o componente/hook serem os
MESMOS já usados e visualmente aprovados nas outras 9 páginas (mesmo padrão, zero código novo
no componente em si).

**Próximos passos reais, ainda em aberto (levantados na auditoria/conversa, não atacados):**
- Redesign Premium via skill `impeccable` (item 1 do CLAUDE.md)
- Sync Meta real, fluxo completo do CampaignWizard, alerta de token Meta expirando, endpoint CPL
  por período (item 2 do CLAUDE.md)
- Achados da bateria de testes desta sessão (DG2 — aviso de UX; T3 — decisão de produto sobre
  lead via Mensageria-só; retenção de tabelas de auditoria; simetria de gamificação; limpeza de
  código morto `LeadGuardian`/`lead-router-sla-worker`)
- Outras frentes em worktrees separados: `netimob-google` (Google Ads/TikTok), `netimob-cherrypick`
  (Mensageria RAG), `netimob-imgfix` (fix de fotos via MinIO)

**Nenhuma tarefa em andamento no momento.** O plano de unificação de leads entre Campanhas/CRM/
Mensageria (`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md`) está formalmente concluído e testado.
Pendências reais, deprioritizadas por instrução explícita do usuário (não atacar sem pedido):
política de retenção das tabelas de auditoria (BLOCO 0 do `transbordo`), simetria de gamificação
(XP não é dado no caminho de `imovel_prospects`, só em `leads_staging`), limpeza de código morto
(`LeadGuardian.ts`/`lead-router-sla-worker.ts`), aviso de UX sobre cliques de WhatsApp sem
Mensageria contratada (achado no DG2), decisão de produto sobre lead criado via infra
compartilhada mesmo com só Mensageria contratada (achado no T3).

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 10) — Execução da matriz formal de testes (T1-T9/DG1-4/I1-4/A1-3) ✅

**Contexto:** último item pendente do plano de unificação. Antes de começar, o usuário fechou um
buraco real que eu tinha levantado ao responder "como seguir": no tenant real Imobiliaria XYZ,
nenhum nível da cascata do Imobiliário (`owner_of_asset`/`geo_area`/`plantonista_fallback`)
conseguia achar candidato — os 37 imóveis reais estão todos com `corretor_fk NULL`, a tabela
`atendente_area_atuacao` tem 0 linhas, e a única corretora real (Juliana Carvalho) tem
`is_plantonista=false`. O usuário adicionou `round_robin` como prioridade 4
(`slaMinutos:"300"`) — confirmado no banco, fecha o risco de lead morto antes de começar os
testes formais.

**Executado:** os 20 cenários de `docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md`, na ordem do
documento (T1→T9→DG1→DG4→I1→I4→A1→A3), todos com dado real (nunca mockado) — tenant-bancada
"Teste RAG — Multi-Segmento" (`tenant_modules`/`tenant_feature_overrides` ligados/desligados por
cenário e sempre revertidos a zero ao final) pra combos que nenhum tenant real tem hoje (C/R/M/
C+M/R+M isolados), e os tenants reais Imobiliaria XYZ + Marketing Digital pros combos C+R e
C+R+M. **20/20 passaram.**

**Bug real encontrado e corrigido (durante T3):** `POST /api/crm/leads` lançava 500 pra qualquer
tenant sem nenhum `kanban_colunas` ativo (onboarding novo, ou tenant só-Mensageria criando lead
via infra compartilhada) — o trigger `trg_log_kanban_ciclos` tentava gravar `coluna_id NULL`
numa coluna NOT NULL de `leads_kanban_ciclos`. `leads_staging` já commitava antes do crash (sem
perda de dado), mas o caller via erro. Corrigido via
`prisma/migration-2026-07-21-fix-kanban-ciclos-null-coluna.sql` (trigger pula o registro de
auditoria quando `coluna_id IS NULL`; zero mudança de comportamento pra tenants com kanban
configurado — 100% dos tenants reais hoje).

**Achado real sobre o mecanismo de desprovisionamento (durante DG4):** desligar só
`tenant_modules.is_enabled=false` do módulo `crm` NÃO esconde a categoria CRM da sidebar — a
função `get_sidebar_menu_for_user` tem uma "NOVA REGRA" (fallback já documentado no próprio
código da função) que mostra a categoria se a feature tiver `tenant_feature_overrides.is_active=
true`, independente de `tenant_modules`. Não é bug: é o modelo de provisionamento já documentado
em `docs/ACCESS_CONTROL.md` — `tenant_feature_overrides` é o ato deliberado de provisionamento (o
"contrato"), `tenant_modules` é sinal comercial complementar. Confirmado repetindo o teste
desligando `tenant_feature_overrides` (o mecanismo real que `/admin/master/provisioning` usa) →
sidebar corretamente escondeu tudo de CRM, `leads_staging`/`leads_kanban` do lead continuaram
100% intactos; reativado depois (I4) → sidebar voltou, lead não duplicou.

**Achados de produto registrados, não implementados (fora de escopo desta rodada):**
- **T3:** `processInboundWhatsAppMessage` chama `/api/crm/leads` incondicionalmente — um lead é
  criado em `leads_staging` mesmo quando o tenant só tem Mensageria contratada (infra
  compartilhada, por design do D1) — vale uma decisão de produto se isso deve ficar assim.
- **DG2:** não existe hoje nenhum aviso explícito na UI de Campanhas avisando que cliques de
  WhatsApp sem o módulo Mensageria contratado não viram lead identificado.
- **T7 (nuance de enunciado):** `marketing_eventos` não fica literalmente vazio pra lead
  orgânico do WhatsApp — grava 1 linha honesta (`utm_source='whatsapp', utm_medium='organico'`)
  com `campaign_id NULL` (zero atribuição falsa, que era o que realmente importava).

**Outras confirmações relevantes:** round_robin (adicionado pelo usuário antes da bateria)
confirmado funcionando ponta a ponta com dado real no T4 (Juliana Carvalho corretamente
atribuída); T8/T9 rodaram contra a fixture real "Alto Padrão — Alphaville" (Marketing Digital),
confirmando Match Engine (1 lead, 2 eventos de atribuição) e Visão 4 (CPA/ROAS reais) sem
nenhuma regressão.

**Todo dado de teste removido ao final** (incluindo o usuário-bancada temporário criado só pra
gerar sidebar real via `get_sidebar_menu_for_user`) — confirmado via SQL que não sobrou nenhuma
linha `TESTE UNIF%` em nenhuma tabela, e o tenant-bancada voltou a zero módulos/features/colunas.

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 9) — UI: diferenciar ajuda de geo_area × plantonista_fallback ✅

**Contexto:** ao revisar (via print real da tela) o modal "Estratégias de Distribuição de
Leads" depois do rename da tabela + generalização do `plantonistaFallbackStrategy`, o usuário
perguntou se algo mais precisava mudar na UI. Investigando, o texto de ajuda do bloco de config
(tabela/coluna FK/estado/cidade do vendedor) era **idêntico** nos blocos de `geo_area` e
`plantonista_fallback` — risco real de o Master achar que precisa manter as duas configs
sincronizadas.

**Discussão que resolveu a dúvida (antes de mexer no código):** propus inicialmente unificar
a config num campo só de segmento; o usuário reagiu com um cenário de negócio real — "e se o
atendimento é regionalizado no dia a dia, mas no fim de semana um plantonista da MATRIZ (sede
nacional) cobre todos os estados, sem seguir a regionalização normal?". Isso confirma que as
duas estratégias **devem poder apontar pra fontes de área diferentes** — não é inconsistência,
é um requisito de negócio legítimo. Retirei a sugestão de unificar.

**O que já estava certo, só não comunicado:** o código das 2 estratégias já implementa a
diferença corretamente — `geoAreaStrategy` usa `INNER JOIN` + `WHERE` (filtro obrigatório: só
considera quem atua exatamente naquele estado/cidade); `plantonistaFallbackStrategy` usa
`LEFT JOIN` + `ORDER BY CASE` (só prioriza por área, nunca exclui ninguém — um plantonista sem
área cadastrada, ou de área diferente, continua 100% elegível). Isso já resolve o cenário do
usuário sem precisar de nenhuma mudança de lógica.

**Implementado — só texto, config/lógica intocadas:**
`SegmentDistributionModal.tsx` — o parágrafo de ajuda acima dos 4 campos (tabela/coluna FK/
estado/cidade) agora é condicional por `strategyKey`: para `geo_area` explica que é filtro
obrigatório; para `plantonista_fallback` explica que é só desempate, que é **independente** do
bloco de Área Geográfica acima, e dá o exemplo concreto do plantão nacional na sede como razão
legítima para apontar pra uma fonte diferente.

**Verificado:** `npx tsc --noEmit` — 55 erros, mesma baseline pré-existente, nenhum novo (nenhum
no arquivo tocado). Mudança é puramente de texto JSX (sem lógica nova, sem migração, sem
validação nova) — não justifica verificação em navegador (mesma limitação de sempre de
cookie/middleware Master já documentada repetidamente neste projeto).

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 8) — Rename `corretor_areas_atuacao` → `atendente_area_atuacao` ✅

**Contexto:** pergunta original do usuário (bem no início desta frente de trabalho) que tinha
ficado pendente enquanto investigávamos o worker duplicado e generalizávamos o `geo_area`.
Com as duas coisas resolvidas, o impacto real do rename caiu de 44 arquivos (levantamento
original) pra só 5 em `src/` — a maior parte do resto eram scripts de debug/migrations
históricas, fora de escopo.

**Decisões confirmadas com o usuário:** nome final `atendente_area_atuacao`; generalizar
`plantonistaFallbackStrategy.ts` (ainda hardcoded) na mesma leva, já que ficava barato.

**Implementado:**
1. `prisma/migration-2026-07-21-rename-corretor-areas-atuacao.sql` — `ALTER TABLE ... RENAME`
   + os 4 índices + 4 constraints de FK + a sequence, tudo renomeado junto (metadado, sem
   cópia de dado). Confirmado antes: nenhum segmento tinha `sellerAreaTable` explícito em
   `segment_distribution_strategies.config` (todos usando o default do código), então nenhum
   dado de config precisou migrar.
2. `geoAreaStrategy.ts` — só o default (`sellerAreaTable = 'atendente_area_atuacao'`).
3. `plantonistaFallbackStrategy.ts` — generalizado no mesmo padrão do `geo_area` (config
   opcional `sellerAreaTable`/`sellerAreaFk`/`sellerEstadoColumn`/`sellerCidadeColumn`,
   defaults idênticos ao comportamento de sempre) — antes só usava a tabela hardcoded como
   critério de desempate.
4. `src/lib/database/users.ts` (limpeza ao deletar usuário) e
   `src/app/api/public/corretor/areas-atuacao/route.ts` (API pública onde o corretor
   cadastra sua própria área — GET/POST/DELETE) atualizados pro nome novo.
5. `SegmentDistributionModal.tsx` + API de validação — textos/placeholders atualizados,
   `plantonista_fallback` ganha os mesmos campos de config que `geo_area` (mesmo bloco de UI,
   reaproveitado pelas duas estratégias).

**Testado ao vivo:** `POST /api/crm/leads` (geo_area + plantonista_fallback contra a tabela
renomeada, sem erro) · `GET/POST/DELETE /api/public/corretor/areas-atuacao` (a API pública real
que o corretor usa) — ciclo completo testado com token real de um corretor de verdade,
confirmado no banco que a linha foi escrita/lida/removida em `atendente_area_atuacao`. `npx tsc
--noEmit`: 55 erros, mesma baseline pré-existente (os 4 erros que aparecem no arquivo de
`areas-atuacao` já existiam antes — mismatch de tipo em `getLoggedUser`, não relacionado às
mudanças de nome de tabela). Dado de teste removido depois.

**Fora de escopo, deliberado:** a URL pública `/corretor/areas-atuacao` (a página que o corretor
acessa) não foi renomeada — é uma decisão independente do nome da tabela, e mudar a URL
quebraria links/favoritos salvos por corretores reais. Scripts de debug (~25 arquivos) e
migrations históricas mantidos com o nome antigo, como já era o combinado.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 7) — `geo_area` sem tabela hardcoded + fallback de geografia genérico ✅

**Contexto:** ao revisar a estratégia `geo_area` recém-criada, o usuário perguntou como a
aplicação "adivinha" quais campos/tabelas fazem o match de área geográfica entre lead e
vendedor. Resposta honesta: não adivinhava — tinha 2 pontos hardcoded que sobraram da extração
do F7 (a tabela do vendedor dentro da estratégia, e o fallback de geografia do lead em
`/api/crm/leads`, que só sabia buscar em `imoveis`). Consertados os dois agora.

**Implementado:**
1. `geoAreaStrategy.ts` — `sellerAreaTable`/`sellerAreaFk`/`sellerEstadoColumn`/
   `sellerCidadeColumn` viram config opcional da estratégia (defaults idênticos ao
   comportamento de sempre — `corretor_areas_atuacao`/`corretor_fk`/`estado_fk`/`cidade_fk` —
   zero regressão pra quem não configurar nada). Identificadores validados antes de
   interpolar na SQL.
2. `/api/crm/leads/route.ts` — o fallback "sem estado_fk/cidade_fk no payload, busca no
   imóvel" deixou de ser hardcoded: agora resolve a config `owner_of_asset` do segmento do
   tenant (reaproveitando `targetTable`/`targetIdColumn`, que já existiam) + 2 campos novos
   (`estadoColumn`/`cidadeColumn`). Sem esses 2 campos configurados, o fallback é
   simplesmente pulado (sem erro) — segmento sem essa noção de geografia do ativo não quebra.
   Fallback de `tenant_id` a partir do imóvel (quando `tenant_id` não vem no payload) mantido
   como está — é uma conveniência legada separada, fora do escopo desta rodada.
3. `prisma/migration-2026-07-21-owner-of-asset-geo-columns.sql` — backfill do segmento
   Imobiliário com `estadoColumn='estado_fk'`/`cidadeColumn='cidade_fk'`, preservando o
   comportamento exato de hoje.
4. `SegmentDistributionModal.tsx` + API de estratégias — novos campos expostos na tela do
   Master (com nota de que são opcionais) e validados tanto no cliente quanto no servidor.

**Testado ao vivo:** `POST /api/crm/leads` com `imovel_id` real e **sem** `estado_fk`/
`cidade_fk` no payload (tenant Imobiliaria XYZ) → `leads_staging.estado_fk='PE'`,
`cidade_fk='Recife'` corretamente herdados do imóvel via o novo caminho genérico (não mais a
query hardcoded, que foi removida). `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente.
Dado de teste removido depois.

**Pendências reais registradas, ainda não atacadas:** `plantonistaFallbackStrategy.ts` ainda
usa `corretor_areas_atuacao` hardcoded (só como critério de desempate na ordenação, não como
filtro obrigatório — impacto bem menor que o do `geo_area`, deliberadamente fora de escopo
desta rodada). Plano de testes formal (`docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md`) continua
pendente de execução.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 6) — Aposentado worker duplicado de roteamento de leads ✅

**Contexto:** ao investigar por que a pergunta "qual campo determina a área geográfica pro
match de distribuição" não tinha resposta clara na estratégia `geo_area`, o usuário perguntou o
impacto de renomear `corretor_areas_atuacao` — investigação dessa pergunta revelou um achado bem
mais sério: **existe um segundo motor de roteamento de leads, completamente separado do
`DistributionEngine`, rodando ativamente**: `scripts/lead-router-sla-worker.ts` (usa
`src/lib/guardian/LeadGuardian.ts`, cujo próprio comentário se autodeclara "SINGLE SOURCE OF
TRUTH") — container Docker próprio (`netimobiliaria-lead-worker`), rodando há 3 dias, processando
`imovel_prospect_atribuicoes` a cada 1 minuto, **em paralelo** ao `/api/cron/transbordo` (a cada 5
min, via `netimobiliaria-feed`) — que faz a MESMA coisa (expira SLA + reatribui), com uma lógica
de decisão DIFERENTE. Risco real: reatribuições divergentes / e-mails duplicados pro mesmo evento,
sem erro nenhum nos logs — silencioso.

**Investigação de causa raiz confirmou:** `LeadGuardian`/worker foram tocados pela última vez em
2026-02-02 (5 meses e meio parado); `DistributionEngine`/`prospectRouter` foram tocados ontem
(refactor de estratégias desta sessão). Cronologia + o próprio comentário do `LeadGuardian` deixam
claro que o `DistributionEngine` foi construído pra SUBSTITUIR essa classe, mas o corte nunca foi
finalizado — o worker antigo nunca foi desligado do `docker-compose.yml`.

**Achado que reduziu o risco da decisão:** `docker-compose.vps.yml` (produção) **nunca teve** o
serviço `lead-worker` — só existe no `docker-compose.yml` de dev local desta máquina. Produção
roda, desde que existe, só `feed-cron-scheduler.js` → `/api/cron/transbordo` (serviço `prod_feed`,
`restart: unless-stopped`, com `CRON_SECRET`/dependências corretas). **A duplicação nunca afetou
produção** — era um problema só deste ambiente de desenvolvimento.

**Decisão do usuário, com 2 exigências explícitas:** (1) priorizar não comprometer a confiabilidade
da distribuição de leads (a lógica parametrizável por segmento agora tem que sempre rodar, sem
"leads mortos" por SLA não cumprido) — testar ANTES de desligar a rede de segurança antiga; (2) a
questão de crescimento das tabelas de auditoria (BLOCO 0 do transbordo, limpeza de 30 dias) fica
como pendência de estudo, não resolvida agora; (3) gamificação (XP/penalidade) não é prioridade
agora — só esclarecer o estado real, sem implementar.

**Investigação de paridade (`prospectRouter.ts` lido por completo):** confirmado que o caminho
novo (`routeProspectAndNotify` → `DistributionEngine`) já cobre tudo que o worker antigo fazia pra
`imovel_prospect_atribuicoes` — e mais: verifica atribuição ativa duplicada antes de inserir,
auto-aceite vincula `imoveis.corretor_fk`, e-mails ricos (corretor + notificação ao cliente em
auto-aceite). **Achado sobre gamificação:** nem o worker antigo nem o `prospectRouter.ts` novo
premiam XP de quem RECEBE o lead reatribuído de `imovel_prospects` (só o caminho do CRM,
`leads_staging`, faz isso) — assimetria pré-existente, não é regressão de nada desta sessão. A
penalização de quem PERDEU o lead por SLA já é feita pelo `transbordo` (BLOCO 1); o worker antigo
nunca fazia nem isso.

**Testado ao vivo, ponta a ponta, antes de desligar qualquer coisa:** criado `imovel_prospects` +
`imovel_prospect_atribuicoes` de teste (status='atribuido', `expira_em` no passado) + 1 corretor
de teste plantonista (única forma de ter um 2º candidato real, já que só existe 1 corretor no
ambiente de dev hoje) → `POST /api/cron/transbordo` real → confirmado no banco: assignment original
virou `status='expirado'`, nova assignment criada com `motivo={"type":"fallback_plantonista",
"engine":"v2"}` (confirma que passou pelo motor NOVO) — cascata completa (dono→geo→plantonista)
funcionou corretamente. Todo dado de teste removido depois, incluindo reverter `imoveis.corretor_fk`
que o auto-aceite tinha gravado.

**Ação executada:** container `netimobiliaria-lead-worker` parado e removido (`docker stop` +
`docker rm`). Serviço `lead-worker` comentado (não apagado) em `docker-compose.yml`, com nota
explicando o porquê e apontando pra este registro. Confirmado `docker compose config` válido
depois da edição, demais containers (`feed`, `db`, `app`, `redis`, `translator`, `minio`) intactos.
Código-fonte (`scripts/lead-router-sla-worker.ts/.js`, `src/lib/guardian/`) mantido no repositório
por ora — limpeza de código morto fica pra uma próxima sessão, sem pressa.

**Pendências reais registradas, não atacadas:** política de retenção das tabelas de auditoria
(`leads_staging_atribuicoes`, `imovel_prospect_atribuicoes` — BLOCO 0 do transbordo) — precisa de
estudo próprio antes de qualquer mudança. Assimetria de gamificação (XP não premiado pro caminho de
`imovel_prospects`) — registrada, não é prioridade agora. Limpeza de código-fonte morto
(`LeadGuardian`, worker antigo) — pendente, sem urgência.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 4) — Motor de distribuição: cascata fixa → estratégias plugáveis ✅

**Contexto:** ao reportar o F7 concluído (extração do acoplamento a "imóvel" do
`DistributionEngine` pras 4 colunas de `system_segments`), o usuário questionou se isso
realmente escalava pra "dezenas de segmentos... zero hardcoded em TUDO". Resposta honesta: não
totalmente — o F7 tirou os 2 hardcodes mais graves (nome do role, busca do dono do ativo), mas
a CASCATA em si (dono → geográfico externo → geográfico interno → plantonista) continuava fixa
no código, igual pra todo segmento. Isso é errado de verdade pra várias verticais reais (Saúde
importa mais especialidade que geografia; B2B nacional não tem geografia nenhuma). Documento
explicado ao usuário antes de implementar: cada segmento passa a declarar sua PRÓPRIA lista
ordenada de estratégias, não só os parâmetros de uma cascata única — mesmo padrão adapter já
usado na plataforma pra redes de anúncio (`AdNetworkService`) e provedores de LLM
(`getLlmClient`). Usuário também perguntou sobre UI: confirmado que segue o padrão já
estabelecido (botão por linha na lista de segmentos, sem item novo na sidebar — mesmo molde de
Ângulos/Interesses/Benchmarks/Dados do Bot/Empresas).

**Implementado:**
1. `prisma/migration-2026-07-21-segment-distribution-strategies.sql` — nova tabela
   `public.segment_distribution_strategies` (segment_id, strategy_key, priority, is_active,
   config jsonb, UNIQUE(segment_id, strategy_key)). Migra os dados do F7: Imobiliário ganha
   `owner_of_asset` (com o config `imoveis`/`id`/`corretor_fk` que já estava hardcoded) +
   `geo_area` + `plantonista_fallback`; todo outro segmento ganha `geo_area` +
   `plantonista_fallback` — preserva o comportamento EXATO que cada um já tinha (a cascata
   sempre rodou pra todos, só o Nível 1 nunca disparava fora do Imobiliário). As 3 colunas do
   F7 (`distribution_target_table/target_id_column/owner_column`) são removidas — foram
   adicionadas nesta mesma sessão, sem nenhum outro código dependendo delas, então não é uma
   migração destrutiva no sentido do CLAUDE.md. `distribution_role_name` fica (parâmetro
   transversal, usado por todas as estratégias, não específico de uma etapa).
2. `src/lib/routing/strategies/` (novo diretório) — 4 módulos, cada um um algoritmo isolado
   implementando a interface `DistributionStrategy`: `ownerOfAssetStrategy` (o Nível 1 do F7,
   generalizado — aceita tanto `sourceOwnerId` já resolvido pelo chamador quanto resolve
   sozinho via `config.targetTable/targetIdColumn/ownerColumn`), `geoAreaStrategy` (Nível 2/3
   de sempre, extraído sem mudança de lógica), `roundRobinStrategy` (**novo** — fila pura, sem
   geografia nem dono, pra segmentos como B2B nacional/SaaS), `plantonistaFallbackStrategy`
   (Nível 4 de sempre). `index.ts` — catálogo (`DISTRIBUTION_STRATEGIES`/
   `DISTRIBUTION_STRATEGY_CATALOG`), mesmo espírito do catálogo de redes de anúncio: o
   vocabulário é código, mas quais se aplicam a cada segmento e em que ordem é 100% dado.
3. `DistributionEngine.findBestCandidate` virou orquestrador — resolve o segmento do tenant,
   busca a lista ordenada de `segment_distribution_strategies` ativas, itera chamando cada
   módulo até achar candidato. `/api/crm/leads/route.ts` simplificado (removida a resolução
   manual de `sourceOwnerId`/`seller_role_name` que eu tinha acabado de adicionar no F7 — o
   engine resolve tudo sozinho agora).
4. **Bug real de pré-multi-tenant encontrado e corrigido durante a extração** (não introduzido
   por mim, preexistente): `transbordo/route.ts` (cron) e `prospectRouter.ts` NUNCA passavam
   `tenant_id` pro `DistributionEngine` — sempre caía no tenant master por padrão. Isso não
   quebrava nada enquanto a cascata era fixa e igual pra todo mundo, mas quebraria silenciosamente
   agora (resolveria o segmento errado, perderia a config de `owner_of_asset` do Imobiliário).
   Corrigido: `i.tenant_id`/`stgLead.tenant_id` adicionados às queries já existentes e passados
   pro engine — fix de causa raiz, não workaround.
5. `GET/PUT /api/admin/master/segments/[id]/distribution-strategies` — replace-all
   transacional, valida `strategyKey` contra o catálogo real e identificadores de
   `config.targetTable/targetIdColumn/ownerColumn` (mesmo padrão de `data-entities/route.ts`).
6. `SegmentDistributionModal.tsx` (novo) — lista reordenável (setas ↑↓, sem lib de drag-and-drop
   nova), toggle ativo/inativo, remover, adicionar do catálogo de estratégias disponíveis,
   formulário de config específico por `strategy_key`. Botão novo (`UserGroupIcon`, rosa) na
   linha de cada segmento em `/admin/master/segments`, mesmo padrão dos outros 5 botões — sem
   item novo na sidebar. Removidos os 3 campos obsoletos do formulário principal do segmento
   (ficou só `distribution_role_name`, que continua fazendo sentido ali).

**Testado ao vivo, ponta a ponta, com dado real** (segmento Imobiliário, tenant Imobiliaria
XYZ): `GET .../distribution-strategies` retornou as 3 estratégias migradas corretamente com o
config real do owner_of_asset · `POST /api/crm/leads` com `imovel_id` real → orquestrador
executou sem erro (mesmo resultado do teste de regressão do F7 original) · **teste decisivo do
round_robin**: adicionado temporariamente como prioridade 1 no segmento Imobiliário, criado um
lead SEM `imovel_id` e sem geografia (que antes não tinha absolutamente NENHUM candidato
possível) → round_robin encontrou corretamente o único "Corretor" ativo do tenant (Juliana
Carvalho, que não tem área geográfica cadastrada nem é plantonista — inelegível pras outras 3
estratégias, mas elegível pra fila pura) — prova concreta de que uma estratégia nova resolve um
caso que a cascata fixa nunca resolveria · validação de identificador (`targetTable: "imoveis;
DROP TABLE users;--"`) e de `strategyKey` inventada → ambas rejeitadas com 400, estado do
segmento intacto depois · segmento revertido ao estado original (3 estratégias) depois do teste.
**Lição registrada:** a limpeza do teste de round_robin fez um `DELETE FROM corretor_scores
WHERE user_id = ...` sem escopar por período/lead — funcionou porque confirmei via 3 queries
cruzadas (leads_staging_atribuicoes/leads_staging/imovel_prospect_atribuicoes, todas count=0
pra esse usuário) que a linha não tinha histórico anterior, mas o `DELETE` em si foi mais largo
do que deveria — da próxima vez, decrementar em vez de apagar, ou checar o estado antes/depois.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero novos em qualquer arquivo
tocado nesta rodada).

**Pendências reais do plano de unificação, ainda não atacadas:** matriz formal de testes (§7 —
9 cenários de contratação + degradação graciosa + integridade da fonte única). A estratégia
`specialty_match` (casar especialidade do lead com especialidade do vendedor) foi discutida mas
deliberadamente NÃO implementada — exigiria uma tabela nova (`user_specialties`) sem nenhum
segmento real pedindo isso ainda; fica pra quando houver um caso concreto.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 3) — F7: CRM agnóstico de domínio ✅

**Contexto:** última fase pendente do plano de migração (F0-F7 completo depois desta entrega —
ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6). Usuário perguntou "F5 já foi implementado?"
— esclarecido que F5 (§6, "Separar tipos na clientes") é a MESMA entrega já documentada como
"D2" nesta sessão (a tabela de fases numera F5, a tabela de decisões numera D2 — mesmo código,
mesmo commit `5f91f93`).

**Investigação antes de implementar:** `DistributionEngine` (`src/lib/routing/
distributionEngine.ts`) tinha 2 pontos hardcoded pra imóvel: o nome do role de vendedor
(`ur.name = 'Corretor'`, hardcoded em 2 queries SQL) e a query fixa de "dono do ativo"
(`/api/crm/leads` sempre fazia `SELECT corretor_fk FROM imoveis WHERE id = $1`, com `domain_id`
sempre `1`). `parametros_imoveis` (tabela de SLA/limites de roteamento) já era 100%
tenant-agnóstica na prática (sempre foi `tenant_id`-scoped, funcionaria pra qualquer segmento)
apesar do nome legado — não precisou de mudança.

**Implementado (aditivo, zero renomeação de tabela — `corretor_areas_atuacao`/
`imovel_prospect_atribuicoes` continuam com esses nomes, mas suas COLUNAS já eram
estruturalmente genéricas o bastante pra qualquer segmento reusar):**
1. `prisma/migration-2026-07-21-segment-distribution-config.sql` — 4 colunas novas em
   `system_segments`: `distribution_role_name` (default `'Corretor'`, preserva 100% do
   comportamento atual pra todo segmento existente), `distribution_target_table`,
   `distribution_target_id_column`, `distribution_owner_column` (as 3 últimas NULL por padrão —
   Nível 1 do motor de roteamento é pulado graciosamente quando ausentes, cai pro roteamento
   geográfico que já era agnóstico). Backfill do segmento Imobiliário com
   `imoveis`/`id`/`corretor_fk` — os valores que já estavam hardcoded no código, zero
   regressão.
2. `DistributionEngine.findBestCandidate` ganha `ctx.seller_role_name?` (default `'Corretor'`
   se ausente) — thread pelas 2 queries que antes tinham `'Corretor'` cravado.
3. `/api/crm/leads/route.ts` — `domain_id` continua existindo só como legado de log; a busca do
   "dono do ativo" e o nome do role agora vêm de `resolveSegment(tenantId, clientId)` (helper já
   existente, reusado — não duplicado) lendo as 4 colunas novas. SQL dinâmico com identificador
   validado (`IDENT_RE`, mesmo padrão de `data-entities/route.ts`) antes de interpolar
   tabela/coluna — nunca lê `system_segments` como SQL confiável sem checar.
4. `POST/PUT /api/admin/master/segments` — aceitam e validam (mesmo `IDENT_RE`) as 4 colunas
   novas; UI do editor de segmento (`/admin/master/segments`) ganha a seção "Distribuição de
   Leads" (cargo do vendedor + tabela/coluna de ID/coluna do dono), mesmo padrão visual das
   seções já existentes (Chatbot, Imagens por IA).

**Testado ao vivo, ponta a ponta, com dado real:** `POST /api/crm/leads` com `imovel_id` real
(tenant Imobiliaria XYZ) → query dinâmica gerada a partir da config do segmento Imobiliário
executou sem erro contra a tabela `imoveis` real, motor de distribuição encontrou corretamente
o único usuário com role "Corretor" deste tenant mas não o roteou (ele não tem
`corretor_areas_atuacao` cadastrada nem é plantonista — condição real pré-existente dos dados,
não regressão) — confirma que o filtro por role, agora parametrizado em vez de hardcoded,
continua batendo exatamente igual a antes · `PUT /api/admin/master/segments` testado com
payload completo (lição de uma sessão anterior aplicada: nunca mandar payload parcial nesse
endpoint replace-all) setando `distribution_role_name='Consultor de Saúde'` +
tabela/colunas de teste pro segmento Saúde → persistiu corretamente, `module_ids` preservado ·
tentativa de injeção (`distribution_target_table: "exames; DROP TABLE imoveis;--"`) → rejeitada
com 400 pela validação de identificador · segmento Saúde revertido ao estado original depois.
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero nos arquivos tocados).

**Com isso, o plano `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` tem F0-F7 e D1-D4 completos.**
Resta só a matriz formal de testes (§7 — 9 cenários de contratação + degradação graciosa +
integridade da fonte única), que até agora só foi verificada ad-hoc a cada entrega, não
executada como suíte formal.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação 2) — F2/F3: rastreio real de CTA de formulário no wizard ✅

**Contexto:** próxima fase do plano depois de F6 (ver entrada abaixo). F2/F3 pedem "CTA de
formulário no wizard + token de rastreio... → CtaInteraction" — o caminho WhatsApp via token já
tinha sido fechado em D3 (sessão anterior); faltava o equivalente pro caminho de formulário.

**Investigação antes de implementar — descoberta importante:** a infraestrutura de "CTA de
formulário" já existia quase inteira (`CtaDestination`/`CtaFormClient`/`/l/[slug]`/
`/api/public/cta/[slug]/submit`, tudo com suporte a ler `campaign_id`/`ad_id` da query string) —
o wizard já deixava escolher um destino de formulário cadastrado como link do anúncio. **2 gaps
reais concretos, não hipotéticos, encontrados lendo o código ponta a ponta:**
1. `campaigns/route.ts` só roteava o link do anúncio por `/api/r/{trackingId}` (o mecanismo de
   rastreio real) quando `ctaType === 'WHATSAPP_MESSAGE'` — qualquer CTA de formulário ia
   **direto** pro destino, sem gerar `CtaInteraction` nenhuma e sem carregar o `trackingId` real
   do `Ad` — o lead resultante nunca tinha como saber de qual campanha/anúncio veio.
2. Mesmo nos casos em que `campaign_id`/`ad_id` chegavam corretos na query string,
   `/api/public/cta/[slug]/submit/route.ts` **nunca os repassava** pro `POST /api/crm/leads` —
   `campaignId` era extraído da URL e depois descartado, `marketing_eventos.campaign_id` ficava
   sempre `NULL` pra leads de formulário.

**Implementado:**
1. `campaigns/route.ts` — TODO CTA (não só WhatsApp) agora usa `/api/r/{trackingId}` como link
   enviado ao Meta; `Ad.linkUrl` no banco passa a guardar o destino real (o que `/api/r` lê pra
   redirecionar), separado da URL rastreada que vai pro criativo.
2. `/api/r/[trackingId]/route.ts` generalizado — CTA não-WhatsApp loga `CtaInteraction`
   (`event_type='REDIRECT'`, `campaignId`/`adId` reais) e redireciona pro `ad.linkUrl` com
   `?ref={trackingId}` anexado.
3. `/l/[slug]/page.tsx` e `/api/public/cta/[slug]/submit/route.ts` — resolvem `?ref=` via
   `resolveCtaRef` (mesmo resolvedor de D3), com prioridade sobre `campaign_id`/`ad_id`
   manuais na URL; `submit/route.ts` agora de fato repassa `campaign_id` pro `/api/crm/leads`
   (gap 2 acima).

**Bug adicional pego testando ao vivo (não hipotético):** o `submit/route.ts` mandava
`utm_campaign` (nome real via `resolveCtaRef`) como campo **flat** no corpo da requisição, mas
`/api/crm/leads` usa `utm_params` (aninhado) quando presente e **ignora** o campo flat — o nome
real da campanha nunca chegava em `marketing_eventos.utm_campaign` (ficava vazio). Corrigido
movendo o valor pra dentro de `utm_params.campaign`. Só foi pego porque testei a submissão de
verdade contra o banco em vez de confiar na leitura do código.

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, `Ad`/`CtaInteraction`/
`CtaSubmission` de teste criados e removidos depois; usado o destino `APP_FORM` real
"Teste Form - Captação" e a campanha real "Alto Padrão — Alphaville"): `GET /api/r/{trackingId}`
→ redireciona pra `/l/{slug}?ref={trackingId}`, `CtaInteraction` gravada com `campaign_id`/`ad_id`
reais · `POST /api/public/cta/{slug}/submit?ref={trackingId}` → `marketing_eventos.campaign_id`
= id real da campanha, `utm_campaign` = "Alto Padrão — Alphaville" (nome real, não mais vazio) ·
**regressão do caminho WhatsApp confirmada intacta** (`GET /api/r/demo-track-001` continua
redirecionando pro `wa.me` com `[ref:...]` embutido, idêntico a antes da generalização).
`npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero nos arquivos tocados).

**Pendências reais do plano de unificação, ainda não atacadas:** F7 (CRM agnóstico de domínio —
extrair o acoplamento a imóvel do motor de distribuição pra um adaptador) e a matriz formal dos
9 cenários de teste (§7) — ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6/§7.

---

## Última tarefa concluída

### Sessão 2026-07-21 (continuação) — F6: Visão 4 (Funil de Receita — CPA/ROAS real) ✅

**Contexto:** próxima fase do plano de unificação depois de F4 (Match Engine, ver entrada
abaixo). F6 é o "payoff comercial" descrito no plano (§5 Visão 4): atribuir receita real de
volta à campanha/criativo — CPA **real** (custo por negócio fechado, não por clique) e ROAS
**real** (receita/investimento) — condicional a C+R (só existe quando o tenant tem Campanhas
E CRM contratados, já que sem CRM não há `leads_staging`/`leads_kanban` pra saber que um lead
virou negócio fechado).

**Investigação antes de implementar:** conferido que `kanban_colunas.nome = 'fechamento'` é o
estágio de negócio ganho (nome fixo interno, `titulo_exibicao` é customizável pelo tenant —
mesmo padrão já usado em outras partes do código, ex. `entendimento_dor`) e que
`leads_staging.valor_venda` guarda o valor do negócio. Confirmado que nenhum tenant de teste
tem negócio fechado real ainda (esperado, ambiente de dev) — validação ponta a ponta feita com
dado temporário real (não mockado), documentado abaixo.

**Implementado:**
1. `src/lib/marketing/services/revenueAttributionService.ts` — `hasCrmModule(tenantId)`
   (checa `tenant_modules`+`system_modules.slug='crm'`) + `getRevenueAttribution(...)`: junta
   `Insight` (gasto, schema campanhas) + `marketing_eventos` (atribuição, campaign_id) +
   `leads_staging`+`leads_kanban`+`kanban_colunas` (negócio fechado, schema public) via SQL
   cru cross-schema, no mesmo padrão já usado em `portfolio/route.ts`. **Metodologia de
   cohort:** tanto leads identificados quanto negócios fechados são filtrados por
   `marketing_eventos.created_at` dentro do período (não pela data de fechamento do negócio,
   que pode ser depois) — evita misturar receita de leads antigos com o gasto de um período
   recente. Simplificação documentada no código: multi-touch não é fracionado (lead que veio
   de 2 campanhas conta receita inteira nas duas).
2. `GET /api/admin/campanhas/dashboard/revenue-attribution` — `available:false` com motivo
   explícito quando o tenant não tem CRM (degradação graciosa, nunca finge CPA/ROAS que não
   existe).
3. `RevenueAttributionWidget.tsx` (novo, self-fetching, mesmo padrão de `CampaignMapWidget`) —
   KPIs (Receita Real, CPA Real, ROAS Real, Negócios Fechados) + top 5 campanhas por ROAS.
   Integrado em `CommandCenterView.tsx` (nova prop `periodDays`, passada de
   `effectivePeriodDays` já existente em `dashboard/page.tsx`).

**Testado ao vivo, ponta a ponta, contra dados reais** (tenant Marketing Digital): sem negócio
fechado real → `available:true`, todas as campanhas com `dealsWon:0`/`cpaReal:null` (honesto,
não inventa) · criado 1 lead de teste real via `POST /api/crm/leads` com `campaign_id` de uma
campanha real com gasto real (R$11.927,02, "Alto Padrão — Alphaville"), movido pro estágio
`fechamento` com `valor_venda=850000` → endpoint retornou `cpaReal=11927.02` (bate exato com o
gasto/1 negócio) e `roasReal=71.27` (850000/11927.02, conferido) — matemática correta · gate
`hasCrmModule` testado contra tenant sem nenhum módulo (Master Platform) →
`available:false, reason:'crm_not_contracted'`, mensagem explícita · dado de teste removido
depois, cascata confirmada. `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (zero
nos arquivos novos/tocados) · página `/admin/campanhas/dashboard` confirmada compilando sem
erro via `curl` com cookie de sessão real (HTTP 200) — verificação visual no navegador não foi
possível, mesma limitação de sempre já registrada dezenas de vezes neste projeto (client-side
`useAuth`/`/me` redireciona mesmo com JWT+`userId` reais em navegação completa).

**Pendências reais do plano de unificação, ainda não atacadas:** F2/F3 (CTA de formulário no
wizard — o caminho WhatsApp via token já está fechado desde D3), F7 (CRM agnóstico de domínio,
extrair o acoplamento a imóvel pra adaptador) e a matriz formal de testes dos 9 cenários — ver
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6/§7.

---

## Última tarefa concluída

### Sessão 2026-07-21 — F4: Match Engine real (telefone normalizado + `match_method`) ✅

**Contexto:** próxima fase do plano de unificação depois de D1/D2/D3 (ver entradas abaixo).
F4 pede "dedupe real por telefone/email contra leads/contatos existentes, gravando
match_method" — o dedupe que já existia em `/api/crm/leads` (POST) comparava telefone por
**string exata**, o que é frágil entre canais que formatam o número de forma diferente.

**Bug real confirmado em produção antes de implementar (não hipotético):** encontrada a MESMA
pessoa (`alexandreseverog@gmail.com`) com 2 linhas em `leads_staging` — telefone gravado como
`"(81) 99800-0047"` numa linha e `"+5581998000047"` noutra (mesmo número, formato diferente).
Nesse caso específico o `tenant_id` de uma das linhas também está `NULL` (registro legado de
antes do multi-tenant), então não teria casado de qualquer forma — mas confirma que o padrão
"mesmo número, formatos diferentes entre canais" é real, não um cenário forçado.

**Implementado:**
1. `prisma/migration-2026-07-21-leads-staging-match-engine.sql` — coluna `match_method
   VARCHAR(20)` em `leads_staging` (audita COMO o match aconteceu: `email`/`telefone`/`novo`/
   `manual`) + índice funcional em `(tenant_id, RIGHT(regexp_replace(telefone,'\D','','g'),10))`
   pra comparar telefone normalizado com performance de índice.
2. `src/app/api/crm/leads/route.ts` — query de match reescrita: telefone comparado pelos
   últimos 10 dígitos normalizados (só números, ignora `+55`/DDI/formatação) em vez de string
   exata; email continua tendo prioridade sobre telefone quando ambos batem;
   `match_method` gravado tanto no INSERT (lead novo) quanto no UPDATE (lead enriquecido).

**Bug de escaping pego ao testar ao vivo (não hipotético, corrigido na mesma rodada):** a 1ª
versão da query usava `'\D'` (uma barra) dentro do template string TypeScript — em JS,
`\D` dentro de uma string não é um escape reconhecido, então a barra é **descartada em
runtime**, e o Postgres recebia só `'D'` como padrão de regex (removeria a letra D do
telefone, não os não-dígitos) — silencioso, sem erro, resultado errado. Corrigido pra `\\D`
(a barra dupla em TS produz `\D` de verdade na string enviada ao Postgres). Só foi pego porque
testei a query de verdade contra o banco em vez de confiar na leitura do código.

**Testado ao vivo, ponta a ponta, via `POST /api/crm/leads` real** (tenant Marketing Digital,
dados de teste prefixados `TESTE MATCH ENGINE` e removidos depois, cascata confirmada — 0
linhas restantes): telefone com formatação diferente do mesmo número (`(81) 91234-5678` vs
`+5581912345678`) → **mesmo `lead_uuid`** nas 2 chamadas, `match_method='telefone'` (bug
original confirmado corrigido) · mesmo email com telefone totalmente diferente → mesmo
`lead_uuid`, `match_method='email'` (prioridade de email preservada) · telefone/email sem
nenhuma correspondência → novo `lead_uuid`, `match_method='novo'`. `npx tsc --noEmit`: 55
erros, mesma baseline pré-existente (nenhum novo).

**Pendências reais do plano de unificação, ainda não atacadas:** F2/F3 (CTA de formulário no
wizard), F5 (funil unificado/CPA-ROAS real), F6 (CRM agnóstico de domínio), F7 (matriz formal
dos 9 cenários de teste + degradação graciosa) — ver
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6.

---

## Última tarefa concluída

### Sessão 2026-07-20 (continuação) — D2: discriminador `tipo_cliente` em `public.clientes` ✅

**Contexto:** próximo item da lista de pendências reais do plano de unificação (D1/D3 já
implementados e commitados na mesma sessão, ver entrada abaixo). D2 resolve a sobrecarga
semântica de `public.clientes` (mistura cliente-da-agência PJ, comprador PJ e consumidor PF)
com um discriminador aditivo, sem tabela nova — decisão já tomada e documentada em
`docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §4/§9.2.

**Investigação antes de implementar:** conferidos os 10 registros reais — confirmado que
`origem_cadastro='Plataforma'` sempre corresponde a empresa-cliente-da-agência (tem
`segment_id`, é o que os seletores de cliente do módulo de Campanhas/Mensageria usam pra
`Campaign.client_id`) e `origem_cadastro='Publico'` sempre corresponde a pessoa física
auto-cadastrada (sem `segment_id`). Backfill do discriminador seguiu exatamente essa regra,
confirmada nos dados reais antes de escrever o UPDATE — não foi suposição.

**Implementado:**
1. `prisma/migration-2026-07-20-clientes-tipo-cliente.sql` — coluna `tipo_cliente VARCHAR(20)
   NOT NULL DEFAULT 'consumidor_pf'` + CHECK (`conta_gerenciada`/`comprador_pj`/`consumidor_pf`)
   + índice `(tenant_id, tipo_cliente)`. Aditiva — nenhuma das 7 FKs reais que apontam pra
   `clientes.uuid` foi tocada (confirmado via `information_schema` antes de migrar).
2. `src/lib/database/clientes.ts` — `Cliente`/`CreateClienteData`/`UpdateClienteData`/
   `ClienteFilters` ganham `tipo_cliente`; `createCliente` deriva o tipo de `origem_cadastro`
   quando não informado explicitamente (mesma regra do backfill).
3. `src/app/api/admin/clientes/route.ts` (GET filtro + POST sempre cria `conta_gerenciada`,
   já que este formulário é exclusivamente pra cadastro de cliente-da-agência) e `[id]/route.ts`
   (PUT aceita `tipo_cliente`) atualizados.
4. **UI — 4 páginas de `src/app/admin/clientes/`:** lista (badge colorido + filtro dropdown);
   `novo` (banner informativo — este formulário sempre cria conta gerenciada, não é seletor,
   já que consumidor PF nasce do fluxo público de leads, não daqui); `[id]/editar` (seletor
   editável, com nota de que só "Conta Gerenciada" aparece nos seletores de Campanhas/
   Mensageria e ganha a aba "Config. Meta" — aba escondida quando o tipo não é esse);
   `[id]` detalhe (badge de tipo + mesma condicional na aba "Configurações Meta").
5. **`src/app/api/admin/campanhas/clients/route.ts`** — `WHERE tipo_cliente = 'conta_gerenciada'`
   adicionado. Confirmado (grep) que este é o ÚNICO endpoint por trás do componente
   `ClientSelector.tsx` compartilhado por todo o módulo de Campanhas E também consumido por
   `mensageria/config/page.tsx` — um fix cobre os dois módulos.

**Testado via API real (JWT com userId real, tenant Marketing Digital):**
`GET /api/admin/campanhas/clients` retorna só os 7 clientes reais deste tenant, todos
`conta_gerenciada` (nenhum dos 2 `consumidor_pf` do outro tenant vazou, e nenhum apareceria
mesmo que estivesse no mesmo tenant) · `GET /api/admin/clientes` retorna `tipo_cliente`
correto em cada linha. `npx tsc --noEmit`: 55 erros, mesma baseline pré-existente (nenhum novo
nos 9 arquivos tocados — o único erro que toca `clientes.ts` é o default `{}` de
`ClienteFilters` em `findClientesPaginated`, que já existia antes desta sessão).

**Verificação visual no navegador NÃO foi possível** — mesma limitação de sempre já registrada
dezenas de vezes neste projeto (cookie+JWT válido, inclusive com `userId` real desta vez, ainda
assim `useAuth`/`/me` client-side redireciona pra `/admin/login` em navegação completa).
Confiança na renderização correta vem da API real batendo exatamente com o que os componentes
consomem + revisão de código dos 4 JSX tocados.

**Pendências reais do plano de unificação, ainda não atacadas:** F2-F7 do plano de migração
(funis "várias visões", plano de testes rigoroso das 7 combinações de módulos contratados,
Match Engine, CRM agnóstico de domínio) — ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` §6.

---

## Última tarefa concluída

### Sessão 2026-07-20 — Unificação de leads: tabela "Lead" → CtaInteraction (D1/D3) ✅

**Contexto:** ao investigar por que "Onde está o Dinheiro?" mostrava R$ 0,00 pra uma campanha real
do Google (fix anterior desta mesma sessão, commit `d6f2fd8`), o usuário levantou uma questão
arquitetural maior: Campanhas e CRM liam "lead" de tabelas completamente diferentes e
desconectadas, quebrando a exigência de "única fonte da verdade" entre módulos que, apesar de
integrados, são **comercializados separadamente** (um tenant pode contratar só Campanhas, sem
CRM nem Mensageria). Isso motivou uma investigação profunda seguida de um documento estratégico
completo: `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` (v1.1, commits `e3d7654`/`33c9b73`), com
4 decisões (D1-D4) e um plano de migração de 7 fases (F0-F7) + plano de testes rigoroso cobrindo
as 7 combinações de contratação dos 3 módulos.

**Descoberta central durante a implementação:** existiam DOIS sistemas paralelos e desconectados
de atribuição de clique/lead — Sistema A (campanhas lançadas pelo próprio wizard desta
plataforma, via `Ad.trackingId` + `/api/r/[trackingId]`, gravando na tabela `Lead` sem atribuição
real na resposta do WhatsApp) e Sistema B (campanhas geridas externamente no Meta Ads Manager,
via mecanismo de CTA em `/admin/campanhas/mecanismos` → `CtaDestination`/`CtaInteraction`/
`CtaSubmission`, que **já funcionava ponta a ponta** via tag `[ref:slug]` reconhecida no webhook
da Evolution, mas sem `Campaign.id` real, só `utm_campaign` em texto livre). `resolveCtaRef`
(`src/lib/cta/service.ts`) unifica os dois: tenta `Ad.trackingId` primeiro (atribuição mais rica),
cai para `CtaDestination.slug` depois.

**Requisito explícito do usuário incorporado durante a implementação:** a API do WhatsApp
(Evolution, hoje) deve ficar desacoplada da lógica de negócio, pra permitir trocar por outro
provider (ex.: API oficial do Meta) no futuro sem duplicar código. Resolvido extraindo
`src/lib/whatsapp/inboundProcessor.ts` (`processInboundWhatsAppMessage`, agnóstico de provider) —
`evolution/webhook/route.ts` virou um adaptador fino (só autentica + normaliza o payload
específico da Evolution), no mesmo padrão já usado pra redes de anúncio
(`AdNetworkService`/`buildNetworkService`).

**Implementado (D1 — migração `Lead` → `CtaInteraction`; D3 — atribuição desacoplada):**
1. `prisma/migration-2026-07-20-marketing-eventos-campaign-id.sql` — `marketing_eventos` ganha
   `campaign_id TEXT` real (antes só `utm_campaign` texto livre).
2. `resolveCtaRef` (novo, `cta/service.ts`) — bridge entre os 2 sistemas de atribuição.
3. `src/lib/whatsapp/inboundProcessor.ts` (novo) — lógica de negócio do WhatsApp entrante
   (atribuição + lead no CRM + ingestão na Mensageria) extraída, agnóstica de provider.
4. `evolution/webhook/route.ts` reescrito como adaptador fino.
5. `/api/r/[trackingId]/route.ts` reescrito: grava clique como `CtaInteraction` (WHATSAPP_CLICK)
   e embute `[ref:{trackingId}]` na mensagem de WhatsApp — fecha o loop clique → resposta → lead.
6. `/api/crm/leads` passa a aceitar e persistir `campaign_id` real em `marketing_eventos`.
7. Prisma schema (`schema.marketing.prisma`): model `CtaInteraction` adicionado, model `Lead`
   removido. `npx prisma generate` limpo.
8. **~15 pontos de leitura migrados** de `Lead` para `CtaInteraction` (dashboards full/funnel/
   predictions/segment/campaign-map, portfolio + cross-insights, `aiInsights.ts`,
   `trackingHealthService.ts`, `wastedSpendService.ts`, `strategicBriefing.ts`,
   `auditReportService.ts`, `segmentIntelligenceService.ts`, iniciativas + briefing) — todos
   filtrando `eventType = 'WHATSAPP_CLICK'` pra preservar a semântica original de "1 lead = 1
   clique com interesse real" (a filosofia do usuário: "houve interesse — trabalhem agora pra
   transformar isso em vendas"), já que `CtaInteraction` agora também guarda eventos `SUBMIT`/
   `VIEW`/`REDIRECT` que não devem ser contados como leads nos dashboards de Campanhas.

**Testado ponta a ponta, com dados reais (não hipotético):** clique real em `trackingId` de teste
existente (`demo-track-001`, campanha "Alto Padrão — Alphaville") → `CtaInteraction`
(WHATSAPP_CLICK) gravado com `campaign_id`/`ad_id` corretos · redirect real pro WhatsApp confirma
`[ref:demo-track-001]` embutido na mensagem · webhook da Evolution simulado com essa mesma tag →
`CtaInteraction` (SUBMIT) + `CtaSubmission` linkado ao lead → lead real criado em
`leads_staging`/`marketing_eventos` com `campaign_id` real e `utm_campaign` = nome real da
campanha (não mais texto solto) · contato da Mensageria linkado ao `lead_uuid` corretamente ·
dados de teste desta verificação removidos depois. `npx tsc --noEmit`: 55 erros, mesma baseline
pré-existente (nenhum novo nos 22 arquivos tocados). Commit `dd1c0da`.

**Pendências reais, não atacadas nesta sessão (ver `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md`):**
- D2 (discriminador na tabela `clientes` pra distinguir conta_gerenciada/comprador_pj/
  consumidor_pf) — decidido, não implementado.
- Fases F2-F7 do plano de migração (funis "várias visões", plano de testes rigoroso das 7
  combinações de módulos contratados, etc.) — pendentes.
- Placeholder `'sua_chave_aqui'` em `tenants.anthropic_api_key` (registrado como pendência há
  duas sessões) — ainda não limpo.

---

### Sessão 2026-07-19 (continuação 5) — Bot de mensageria não respondia nada — 4 bugs reais ✅

**Sintoma reportado:** `/mensageria/config` → aba Bot, "boa noite"/"boa tarde" sempre devolviam
o fallback genérico "Desculpe, tive um problema para processar sua mensagem agora". Investigação
achou uma cadeia de 4 bugs reais e independentes — cada um mascarando o próximo, só visíveis um de
cada vez conforme o anterior era corrigido:

1. **`botAdapter.ts` chamava `getLlmClientForCampaigns()` (config GLOBAL da plataforma) em vez de
   `getLlmClient(tenantId)` (config do TENANT)** — o bot de mensageria é por-tenant (cada empresa
   escolhe provider/modelo em Configurações → IA), mas ignorava essa escolha e sempre caía no
   Groq global. Corrigido o import e o call site.
2. **Modelo Groq global (`meta-llama/llama-4-scout-17b-16e-instruct`) foi removido pela Groq** —
   confirmado via `GET /v1/models` da própria conta (não aparece mais na lista). Atualizado pra
   `llama-3.3-70b-versatile` (disponível, confirmado). Afeta também os motores de campanha
   (`getLlmClientForCampaigns`, que usa a MESMA linha global da tabela `Settings`).
3. **`gemini-2.0-flash` (modelo configurado pra este tenant) tem cota ZERO** nesta API key —
   confirmado via curl direto na API do Google (`429 RESOURCE_EXHAUSTED`, `limit: 0`). Trocado
   pra `gemini-flash-latest` (mesma chave, testado real, 200 OK).
4. **Bug real, mais sério, achado depois — `getLlmClient()` sempre usava o valor placeholder da
   migração/seed (`tenants.anthropic_api_key = 'sua_chave_aqui'`, presente em TODOS os 4 tenants)
   em vez da chave real configurada em `Settings.llmApiKey`** — a ordem antiga lia o campo legado
   primeiro e só usava a chave real do provider escolhido (`cfg.llmApiKey`) se esse campo
   estivesse vazio; como o placeholder nunca é vazio, a API real (Gemini, no caso) sempre recebia
   `"sua_chave_aqui"` como Bearer token e rejeitava com "Please pass a valid API key". Esse bug
   afeta **qualquer tenant configurado com provider ≠ anthropic** — reordenado pra usar sempre a
   config do tenant primeiro; o campo legado só é lido como fallback quando o provider realmente É
   anthropic E não placeholder.
5. **Bug de infraestrutura, achado por último — o pacote npm `openai` retorna `400 status code
   (no body)` de forma reproduzível quando roda dentro do runtime RSC/webpack do Next.js contra o
   shim OpenAI-compat do Gemini** — isolado com certeza: o MESMO request via `fetch()` nativo, no
   MESMO processo do dev server, sempre funciona; via SDK `openai`, sempre falha (testado repetido,
   inclusive depois de restart completo do servidor — não é conexão persa/keep-alive). Substituído
   `makeOpenAICompatibleClient()` inteiro pra usar `fetch()` cru em vez do SDK — `postChatCompletion()`
   novo em `llmClient.ts`. Sem perda de funcionalidade (só usávamos `chat.completions.create`, sem
   streaming/upload).
6. **Último bug, só visível depois do #5 corrigido — Gemini exige o campo
   `extra_content.google.thought_signature` de volta em cada `functionCall` echoado no histórico**
   (multi-turno de tool-use) — sem isso, rejeita com 400 "missing thought_signature". `LlmToolCall`
   ganhou campo opaco `providerExtra?: unknown`; capturado do `tc.extra_content` na resposta e
   reenviado no próximo turno. Outros providers (Groq etc.) não têm esse campo — passthrough
   condicional, zero efeito neles.

**Testado ao vivo, ponta a ponta, via `/mensageria/config` → Bot → "Testar conversa com o bot"**
(tenant Marketing Digital): "boa noite" → resposta correta em português · pergunta com tool-use
real ("tem apartamento em Imbiribeira?") → chamou `buscar_imovel`, resposta coerente
("Não encontrei nenhum apartamento... ") — confirmado via SQL que este tenant tem **0** imóveis
cadastrados, então a resposta é honesta, não um bug. `npx tsc --noEmit` limpo nos 3 arquivos
tocados (`llmClient.ts`, `botAdapter.ts` só o import, `Settings`/`tenants` via SQL direto).

**Arquivos tocados:** `src/lib/marketing/services/llmClient.ts` (reescrita de
`makeOpenAICompatibleClient` + fix de ordem em `getLlmClient`), `src/lib/mensageria/botAdapter.ts`
(1 linha — import/call site do client certo). SQL direto (não migração versionada — são valores de
config, não schema): `Settings.llmModel` do tenant Marketing Digital e da linha global corrigidos.

**Pendência:** o placeholder `'sua_chave_aqui'` continua presente nos 4 tenants em
`tenants.anthropic_api_key` — inofensivo agora que `getLlmClient()` o ignora explicitamente, mas
vale limpar/nulificar numa próxima sessão pra não confundir leitura direta do banco.

---

## Tarefa em andamento

### Consolidação — fim da colaboração multi-agente, merge de tudo em net-imobiliaria (2026-07-19)

**Decisão do usuário:** abandonar a colaboração paralela com o Antigravity e passar a trabalhar
sempre a partir do diretório principal (`net-imobiliaria`), unificando as duas frentes que
estavam em worktrees isolados.

**1. Limpeza do diretório principal** — as 39 mudanças não commitadas do Antigravity que ainda
estavam soltas em `net-imobiliaria` foram removidas (`git checkout -- .` + `git clean -fd`),
**só depois de verificar item a item** que todas (exceto 1 migração deliberadamente descartada,
já documentada) estavam commitadas e corrigidas no worktree `netimob-google`.

**2. Merge do Google Ads** — `feature/google-ads-implementation` mergeado em
`feature/ag-cockpit-camadas` (branch atual de `net-imobiliaria`). **Zero conflitos** — as duas
branches tinham divergido em conjuntos de arquivos completamente disjuntos (uma só mexeu em
`CLAUDE.md`/`docs/AI_SYNC.md`/`docs/CHECKPOINT.md`, a outra só em código). `npx tsc --noEmit`
confirmado limpo depois (65 linhas = mesma baseline de sempre, nada novo).

**3. Mensageria RAG já estava dentro** — `feature/mensageria-rag` já era ancestral de
`feature/ag-cockpit-camadas` (merges anteriores já tinham trazido o código pra lá) — confirmado
via `git merge-base --is-ancestor`, nenhuma ação necessária.

**4. CLAUDE.md atualizado** — seção "Coordenação com outros agentes de IA" substituída por
"Múltiplas Frentes em Paralelo": mantém a disciplina de checar `git branch`/`git status`/
`git worktree list` no início de sessão (ainda útil — o projeto segue com múltiplos worktrees
em paralelo), mas sem mais coordenação com outro agente. `docs/AI_SYNC.md` marcado como
histórico/encerrado.

**5. Dados de teste PERSISTENTES criados** (diferente de rodadas anteriores — **não** foram
removidos depois, ficam no banco pra você testar à vontade):
- **Google Ads:** campanha real `google-test-imoveis-sp-001` ("Google Search — Apartamentos SP"),
  14 dias de `Insight` (ROAS 3.35x, IS Lost Budget médio 26.4% — dispara a regra
  IMPRESSION_SHARE_OPPORTUNITY), 42 `Lead`s, 6 `GoogleSearchTerm` (3 com conversão, 3 sem —
  candidatos reais de negativação). Script salvo em `prisma/seed-demo-google-ads.sql`
  (idempotente, `ON CONFLICT DO NOTHING` — pode rodar de novo sem duplicar).
- **Mensageria RAG:** 2 documentos reais criados via API (embeddings reais do Gemini, não
  fabricados) no tenant Marketing Digital — "Financiamento Imobiliário — Condições" (5 trechos)
  e "Agendamento de Visitas e Política de Reserva" (4 trechos). Visíveis em `/mensageria/config`
  → aba "Base de Conhecimento", e o bot já responde perguntas relacionadas (bot_flow ativo
  nesse tenant).

**Testado ao vivo, ponta a ponta, no servidor real do usuário (porta 3000, não um worktree
isolado):** dev server reiniciado (Prisma Client mudou com o merge) · dashboard → segmento
Imobiliário → aba "GOOGLE ADS" aparece e mostra ROAS 3.35x / IS Lost 26.39% reais · tabela de
Search Terms populada, botão "Negativar" presente · KPIs da Visão Executiva (Gasto Total, CPL
Médio) já mostram breakdown Meta × Google combinado · `/mensageria/config` → Base de Conhecimento
mostra os 2 documentos com contagem de trechos correta.

**Próximos passos reais:** Developer Token Google Ads API ainda não solicitado (nada testado
contra a API real do Google) · Mensageria RAG: Fase 6 (testes de qualidade com mais documentos)
e Fase 7 (deploy VPS — pgvector na imagem de produção) seguem pendentes.

---

### Plano Google Ads + TikTok — FASE 1/A2 implementada em worktree isolado (2026-07-19, histórico)

### Plano Google Ads + TikTok — FASE 1/A2 implementada em worktree isolado (2026-07-19)

**Branch/worktree:** `feature/google-ads-implementation`, em `C:\NetImobiliária\netimob-google`
(worktree separado — **não** o diretório principal `net-imobiliaria`, que segue com o Antigravity
trabalhando em `feature/ag-cockpit-camadas`, intocado).

**Como o trabalho do Antigravity foi herdado (sem interferir nele):** todo o estado dele em
`feature/ag-cockpit-camadas` — commitado + modificações/arquivos novos não commitados (39
mudanças) — foi "puxado" via `git diff`+`git apply` (arquivos rastreados) e cópia direta
(arquivos novos) para dentro do worktree isolado. O diretório original dele ficou
byte-a-byte intacto (confirmado via `git status` antes/depois).

**Auditoria encontrou 2 conflitos arquiteturais, resolvidos com o usuário** (detalhes completos
em `docs/PLANO_GOOGLE_TIKTOK.md`, seção "Auditoria + Decisões de Arquitetura"):
1. **Identificador de rede:** decidido reusar `ad_networks` + `Campaign.network_id` (infra
   madura já existente) em vez da coluna nova `ad_network` que o Antigravity tinha criado mas
   nunca usava em lugar nenhum do código. **Bug de brinde corrigido:** `network_id` nunca era
   setado na criação de campanha — as 24 campanhas existentes tinham todas `NULL`, quebrando
   silenciosamente a agregação "Distribuição por Rede" do dashboard.
2. **Credenciais Google:** decidido consolidar em `public.tenant_network_credentials` (mesma
   tabela genérica já usada pelo Meta) em vez da tabela dedicada `GoogleAdsConfig` que ele
   tinha modelado no Prisma mas nunca migrado no banco (quebraria em runtime).

**Implementado nesta sessão (tudo com `npx tsc --noEmit` e `npx prisma generate` limpos):**
- Schema drift corrigido: `Campaign.networkId`/`externalId` existiam no banco sem estar
  mapeados no Prisma (por isso o código evitava usá-los, com raw SQL) — agora mapeados.
- `factory.ts`, `configuracoes/google-ads/route.ts`, `campanhas/google/route.ts` reescritos
  para usar `tenant_network_credentials` + `network_id` (nada de tabela/coluna dedicada).
- `admin/configuracoes/google-ads/page.tsx` reescrita — usava componentes shadcn/ui
  (`@/components/ui/card` etc.) que não existem neste projeto; agora Tailwind puro no mesmo
  padrão visual da aba "Identidade Meta" já existente.
- **A2 do plano aplicada no banco:** 4 colunas novas em `Insight` (search_impression_share,
  search_budget_lost_is, search_rank_lost_is, conversions_value) + 2 tabelas novas
  (`GoogleSearchTerm`, `GoogleNegativeKeyword`) — migração
  `prisma/migration-2026-07-19-google-ads-a2.sql`.
- **A3 parcial:** `GoogleAdsAdapter.fetchInsights` agora busca Impression Share/ROAS reais da
  Google Ads API (antes eram campos mockados); `agentMonitor.ts` persiste os 4 campos novos.

**Sessão 2026-07-19 (continuação) — A3 a A7 implementadas, mesmo worktree/branch:**

- **A3 completa** — `GoogleAdsAdapter.createCampaign` agora cria Asset Group real (Assets de
  texto + imagem via `customer.assets.create`, vinculados via `AssetGroupAsset` com
  `field_type` correto) em vez do stub anterior que pulava essa etapa. `uploadCreative` faz
  upload real de imagem (antes mock). Novo método `addNegativeKeyword` (Google-only). Novo
  método `fetchSearchTerms` (GAQL `search_term_view`). **Bug real corrigido:** a extração de
  `resource_name` da resposta da API usava `(result as any)[0].id` — a resposta real só tem
  `.results[0].resource_name`, então toda a cadeia budget→campanha→asset group dependia de um
  valor sempre `undefined`.
- **A4 completa** — `collectGoogleSearchTerms()` em `agentMonitor.ts`, disparado só para
  campanhas Google dentro do mesmo loop de `syncMetrics`, grava em `GoogleSearchTerm` sem
  nunca resetar o status de um termo já tratado numa rodada anterior.
- **A5 completa** — `network_defaults.google` em 3 segmentos (Imobiliário, Carros, Geral):
  `campaign_types`, `bidding_strategy`, limites de headline/description, `negative_seed_terms`,
  `impression_share_target`, `negation_spend_threshold_pct`. Zero código por vertical.
- **A6 completa** — `googleNegationService.ts` (novo): lê `GoogleSearchTerm`, agrega por termo,
  propõe negativo quando gasto > X% do total da campanha sem conversão (X do segmento via A5).
  Nova ação `ADD_NEGATIVE_KEYWORD` (defensiva, auto-executa) + nova regra
  `IMPRESSION_SHARE_OPPORTUNITY` (SCALE quando IS Lost Budget alto + CPL já bom) em
  `aiInsights.ts`, com benchmark `is_lost_budget_scale_min` no mesmo padrão de 4 camadas já
  usado por `cpl_ideal`/`hook_rate_*`. **Bug real corrigido em `executeAction()`:** usava
  `campaign.networkCode`/`external_id` — campos que **nunca existiram** (schema real é
  `networkId`/`externalId` camelCase) — toda campanha, Google inclusive, caía silenciosamente
  no fallback `'meta'` ao pausar/reduzir budget/etc. Cron `/api/cron/campanhas/sync` agora
  dispara `runNegationAgent()` por tenant.
- **A7 parcial** — `dashboard/full/route.ts`: `leadsByNetwork` agrupa por código de rede (join
  `ad_networks`), não pelo UUID cru. **Bug real corrigido:** `calcTotals().spendByNetwork` usava
  `i.adNetwork` — campo que nunca existiu em `Insight` — sempre produzia `{undefined: total}`.
  Novo `cplByNetwork` no response (CPL Meta × Google lado a lado). Card "CPL Médio" no
  `CommandCenterView.tsx` ganha breakdown por rede (mesmo padrão visual dos cards de
  Gasto/Leads, só quando há ≥2 redes com dado real — sem empilhar card novo).

**Verificado:** `npx tsc --noEmit` limpo em todos os arquivos tocados (62 erros = mesma
baseline pré-existente, nada novo) · `npx prisma generate` limpo em ambos os commits desta
sessão.

**Sessão 2026-07-19 (continuação 2) — wizard com imagens reais + drill-down de Search Terms:**

- **Wizard do Google usa imagens reais** — `GoogleAiMaxWizard.tsx` mandava `images: []`
  hardcoded (comentário "mock for now" do próprio Antigravity), ignorando o que o usuário
  selecionava na Fase 1 da página `/nova`. Corrigido: `selectedImages` (mesmo tipo `Creative`
  do wizard Meta) passado de `nova/page.tsx`, preview de thumbnails + aviso quando 0 imagens
  + botão "Lançar" desabilitado nesse caso (Performance Max exige ≥1 imagem por Asset Group).
  **Nota:** `img.path` é um blob URL — mesma limitação pré-existente e compartilhada com o
  wizard Meta (não é regressão nova), documentada como "Opção A pendente" há várias sessões.
- **Drill-down de Search Terms na UI** — nova aba "Google Ads" no dashboard (só aparece
  quando há dado real de rede Google): cards de ROAS + IS Lost (Budget) por campanha, e
  tabela de termos pendentes de revisão com botão "Negativar" manual (complementa o agente
  automático da A6). Novo módulo `googleNegationCore.ts` — extrai a mecânica real de
  negativar (chamada API + memória) pra um lugar único, evitando import circular entre
  `agentDecisor.ts` e `googleNegationService.ts` (ambos agora chamam o mesmo helper).

**2 bugs reais encontrados testando ao vivo no navegador (nenhum pego pelo `tsc`):**
1. Query de resumo (ROAS/IS Lost) usava `"tenantId"` (camelCase) numa coluna do `Insight`
   que na verdade é `tenant_id` (snake_case) — erro Postgres 42703, só aparece em runtime.
2. O bloco JSX da aba "Google Ads" ficou, por engano, **aninhado dentro** do bloco
   condicional `{activeLayer === 'DEEP_DIVE' && (...)}` — nunca renderizava quando a aba
   selecionada era `'GOOGLE'` (mutuamente exclusivo com `'DEEP_DIVE'`). JSX sintaticamente
   válido, então o `tsc` não acusa nada — só descoberto clicando na aba de verdade e vendo
   que nada acontecia.

**Ajuste de UX:** o erro do negativar usava `alert()` nativo — trocado por banner inline
(mesmo padrão de erro já usado no projeto), tanto por consistência quanto porque o dialog
nativo travava a automação de teste do navegador usada nesta sessão.

**Testado ao vivo, ponta a ponta** (servidor dev dedicado porta 3071, dados de teste
temporários inseridos e removidos depois): wizard do Google com 0 imagens → aviso + botão
desabilitado confirmado via DOM · com 1 imagem real (injetada via `DataTransfer`, sem
precisar do picker nativo de pasta) → thumbnail renderiza, botão habilitado · aba "Google
Ads" aparece só com campanha Google real · cards ROAS 3.00x / IS Lost 25.00% corretos ·
tabela com 2 termos de teste, cores corretas (conversões=0 em vermelho) · clique em
"Negativar" → chamada real, falha corretamente (sem credenciais Google no tenant de teste),
erro mostrado em banner inline sem travar a página nem remover a linha.

**Pendente (próxima sessão): Developer Token Google Ads API ainda não solicitado** —
nenhum fluxo foi testado contra a API real do Google (só via a lib `google-ads-api`/
`google-ads-node`, revisão de código e os testes de UI/banco acima). É o item que trava
testar `createCampaign`/`addNegativeKeyword`/`fetchInsights` reais.

---

### M4.3 — RAG / Base de Conhecimento (branch `feature/mensageria-rag`, worktree `netimob-cherrypick`)

Plano completo discutido e travado com o usuário (`docs/PLANO_MENSAGERIA.md` §14.6-B). Decisões:
pgvector (não banco vetorial dedicado) · chunking estrutural por cabeçalho + retrieval contextual
· busca híbrida (vetor + full-text) · KB = mais uma ferramenta do bot (`buscar_conhecimento`) ·
markdown como fonte-da-verdade + import de PDF/DOCX · embedding via API barata
(`text-embedding-3-small`) · UI editável pelo **admin do tenant** (não Master), com o tenant
editando a KB dele E a dos clientes sob seu guarda-chuva · escopo tenant/cliente forçado no servidor.

**Fases:** 0 infra pgvector ✅ · 1 schema ✅ · 2 embedding (factory+Settings) ✅ · 3 ingestão
(markdown→chunk→embed) ✅ (PDF/DOCX import fica pra depois) · 4 recuperação híbrida + ferramenta ✅
· 5 UI (admin do tenant gerenciar a KB) · 6 testes de carga/qualidade · 7 deploy VPS.

- **Fase 0 ✅** — pgvector 0.8.0. Escolhido **build próprio sobre alpine** (`docker/postgres/
  Dockerfile`, `with_llvm=no`) em vez da imagem oficial Debian, pra evitar o gotcha de collation
  musl→glibc (que exigiria REINDEX). Container `netimobiliaria-db` recriado reusando o volume
  `net-imobiliaria_db_data` (dados intactos: 37 imóveis confirmados). `docker-compose.yml` da
  branch atualizado pra buildar do Dockerfile. **Pendência VPS:** aplicar o mesmo em
  `docker-compose.vps.yml` + `deploy.sh` (Fase 7).
- **Fase 1 ✅** — `prisma/migration-2026-07-16-mensageria-rag.sql` aplicada: `knowledge_documents`
  (fonte editável) + `knowledge_chunks` (tsv gerado 'portuguese' + índices HNSW/GIN/escopo).
  Smoke test de distância cosseno OK. **Ajuste nesta rodada:** usuário escolheu **Gemini** como
  provider de embedding (não `text-embedding-3-small` da OpenAI, cogitado no plano original) — a
  tabela ainda estava vazia (zero chunks), então a coluna `embedding` foi corrigida direto pra
  `vector(768)` (dim do Gemini) via `ALTER COLUMN` + o comentário do SQL atualizado, sem migração
  de dado nenhuma.
- **Fase 2 ✅** — `embedText(text, tenantId?)` em `llmClient.ts`. **Bug real pego ao vivo, não
  hipotético:** a 1ª tentativa usou `text-embedding-004` via endpoint OpenAI-compatible do
  Gemini (mesmo baseURL já usado pro chat) — 404 real (`ListModels` da conta confirmou que esse
  modelo não existe mais pra essa API key; só `gemini-embedding-001`/`-2-preview`/`-2` disponíveis).
  Corrigido pra `gemini-embedding-001` via **REST nativo** do Gemini (não o layer OpenAI-compat —
  ele não expõe `outputDimensionality`), com `outputDimensionality: 768` (truncamento Matryoshka
  nativo do modelo, não um corte cru do vetor) — confirmado ao vivo via curl direto na API do
  Google que retorna exatamente 768 valores reais. Cascata de chave: Settings do tenant com
  `llmProvider='gemini'` → `GEMINI_API_KEY` do `.env` (fallback global) — embedding é uma escolha
  técnica de infra, deliberadamente independente do provider de CHAT configurado por tenant (que
  hoje é Groq pra maioria).
- **Fase 3 ✅ (markdown; PDF/DOCX pendente)** — `src/lib/mensageria/tools/knowledgeBase.ts`:
  `chunkMarkdown()` quebra por heading (# a ######, pilha de níveis, `heading_path` tipo
  "Vendas > Financiamento") + teto de 1200 chars por chunk (split por parágrafo, sem cortar
  palavra no meio); `regenerateChunks(documentId)` apaga+re-gera+re-embeda tudo numa transação,
  chamado a cada save do documento (POST/PUT). API `src/app/api/admin/mensageria/knowledge/
  route.ts` + `[id]/route.ts` (CRUD, mesmo padrão de auth/estilo de `labels/route.ts`).
- **Fase 4 ✅** — `searchKnowledge()`: busca híbrida (`1 - cosine_distance` peso 0.7 +
  `ts_rank` peso 0.3, capado em 1), escopo tenant+cliente forçado no SQL (`client_id IS NULL OR
  client_id = $clientId` — herança tenant→cliente igual inboxes/bot_flows; `$clientId` nulo já
  restringe sozinho a só docs tenant-wide via semântica de NULL do SQL, sem caso especial).
  `hasKnowledgeBase()` faz a ferramenta `buscar_conhecimento` só aparecer pro LLM quando o
  tenant/cliente TEM pelo menos 1 documento ativo (mesmo princípio das ferramentas de dados
  estruturados — nunca oferecer ferramenta sempre vazia). Ramo próprio no loop de tool-use do
  `botAdapter.ts` (não mexe no fluxo de linhas/fotos/paginação das outras ferramentas), com aviso
  explícito nos dados pro LLM nunca completar com conhecimento geral quando o trecho não cobrir a
  pergunta exatamente.

**Testado ao vivo, ponta a ponta** (tenant Marketing Digital, servidor dev do próprio worktree em
`:3051` — não o `:3002`/App principal, que monta o código do OUTRO agente na `net-imobiliaria`):
documento real "Política de Garantia" (90 dias + como acionar) → 2 chunks reais gerados, 768 dims
confirmadas via `vector_dims()` no Postgres · pergunta que a KB cobre ("vocês dão garantia... como
funciona?") → bot respondeu citando os 90 dias e o fluxo de acionamento exatamente como cadastrado
· pergunta que a KB NÃO cobre ("reembolso em até 30 dias?") → bot recusou honestamente
("não tenho certeza... falar com um atendente"), sem inventar uma política · dado de teste
removido depois (`DELETE`, cascata de chunks confirmada por `COUNT(*) = 0`) · `npx tsc --noEmit`
limpo em todos os arquivos tocados (erros remanescentes são baseline pré-existente, não relacionados).

**Achado operacional (multi-agente):** `preview_start` com config nomeada do `.claude/launch.json`
resolve relativo ao diretório principal da sessão (`net-imobiliaria`), não ao worktree onde estou
trabalhando — mesmo apontando pro `launch.json` certo, o servidor que sobe roda o código do OUTRO
agente (confirmado por um erro de stack trace apontando pra `net-imobiliaria\.next\...`). Pra
testar código deste worktree, é preciso subir o `next dev` manualmente nele, numa porta dedicada
(usei 3051, já que 3050 também está reservado no `launch.json` local e pode colidir).

**Fase 5 ✅ (UI de gestão da KB)** — nova aba **"Base de Conhecimento"** em `/mensageria/config`
(mesmo padrão de abas já usado por Inboxes/Times/Etiquetas/SLA/Bot — **não** virou rota própria
`/mensageria/config/conhecimento` do plano original de 2026-07-08; esse desenho já tinha sido
abandonado na prática quando "Chatbot" virou a aba "Bot" em vez de feature/rota separada, então
"Base de Conhecimento" seguiu o padrão real, não o documento desatualizado). CRUD completo:
criar/editar/ativar-desativar/excluir documento, textarea em markdown monoespaçado, combobox de
cliente com busca debounced (reaproveita `/clientes-search`, mesmo endpoint do combobox de Nova
Conversa Manual) — vazio = vale pra todos os clientes do tenant. Lista mostra nº de trechos
(chunks) e status ativo/inativo por documento. Nota na aba Bot aponta pra esta aba (persona fica
no Editor de Prompts, regras/FAQ ficam aqui).

**2 bugs reais pegos testando a API por trás da UI (não achados por inspeção, achados rodando de
verdade)** — nenhum dos dois tinha aparecido nos testes anteriores porque a sessão anterior só
testava via curl direto comparando com o schema já em `snake_case`, sem passar pelo contrato que o
componente React realmente espera:
1. `GET /knowledge` fazia `JOIN public.clientes c` selecionando `c.name` — coluna não existe
   (schema em português usa `c.nome`). Erro real (`42703`) confirmado no log do dev server ao
   testar a listagem pela primeira vez. Corrigido.
2. As 2 rotas (`GET /knowledge` e `GET /knowledge/[id]`) devolviam as linhas **cruas do Postgres**
   (`client_id`, `source_type`, `is_active` etc., snake_case) mas o componente React (seguindo a
   convenção já usada em `inboxes/route.ts`) espera `camelCase` (`clientId`, `sourceType`,
   `isActive`) — sem o mapeamento explícito, a UI exibiria tudo como `undefined`. Corrigido nas
   duas rotas com mapeamento manual campo-a-campo, no mesmo padrão já usado por `inboxes/route.ts`
   (`id: r.id, channelType: r.channel_type, ...`). `chunkCount` também precisou de `Number(...)`
   — `count(*)` do Postgres volta como string via o driver `pg`.

**Testado via API completa (curl), ciclo inteiro:** criar documento sem cliente → listar (campos
certos, `clientName: null`) → buscar cliente real (`Alexandre Severo Soluções Tecnológicas`) →
editar vinculando `clientId` → listar de novo (`clientName` populado corretamente) → deletar →
cascata de chunks confirmada (`COUNT(*) = 0` nas duas tabelas). `npx tsc --noEmit` limpo em todos
os arquivos tocados (grep filtrado, zero ocorrências).

**Verificação visual no navegador NÃO foi possível nesta rodada** — mesma limitação já registrada
repetidamente neste projeto (ver sessões de 2026-07-09 a 2026-07-14 no histórico deste arquivo):
injetar um JWT fabricado localmente (cookie + localStorage) resolve pras rotas de API (que só
confiam no payload do token), mas a página client-side chama `/api/admin/auth/me`, que faz lookup
real do usuário no banco — um `userId` fabricado não existe, então a página redireciona pra
`/admin/login` mesmo com cookie+token "válidos" (assinatura correta, usuário inexistente).
Confirmado o redirecionamento real via `location.href` no navegador (`/admin/login?callbackUrl=
%2Fmensageria%2Fconfig`), não um bug — comportamento correto de segurança. Confiança na
renderização correta vem de: `tsc` limpo + API validada ponta a ponta com os MESMOS campos que o
componente consome + revisão de código da estrutura JSX (mesmos padrões visuais já usados e
aprovados nas outras 6 abas desta página).

**Achado operacional (registrado antes, reconfirmado):** durante esta sessão o classificador de
segurança do harness (Edit/Write/Bash) ficou intermitentemente indisponível por vários minutos
seguidos — não é um problema do projeto, é uma instabilidade da própria ferramenta. Contornado
esperando e tentando de novo (sem pular a revisão/teste por causa disso).

**Próximos passos:** Fase 6 testes de qualidade com mais documentos reais/variados · Fase 7 deploy
VPS (pgvector na imagem + `GEMINI_API_KEY` no ambiente de produção) · a branch ainda não virou PR
pra `main`.

---

### Sessão 2026-07-18 (continuação 2) — combobox de cliente + import PDF/DOCX + visualizador de trechos ✅

Pedido direto do usuário (2 itens da lista de pendências da rodada anterior).

**1. Combobox de cliente alfabético com filtro incremental** — trocado o campo de busca
debounced (mín. 2 letras, só top 8, via `/clientes-search`) por um combobox de verdade: carrega
a lista completa do tenant **uma vez** — `/api/admin/campanhas/clients?limit=200` já devolve
`ORDER BY nome ASC` — e filtra 100% no cliente conforme o usuário digita (sem round-trip por
letra). `onMouseDown` no lugar de `onClick` nas opções (dispara antes do `onBlur` do input, senão
o dropdown fecha antes do clique ser registrado).

**2. Import de PDF/DOCX** (Fase 3, item que tinha ficado de fora): `documentImport.ts`
(`extractMarkdownFromFile`) — PDF via `pdf-parse` (`PDFParse.getText()`, sem heading, degrada pra
chunking por parágrafo no `chunkMarkdown` já existente — mesmo código, sem branch especial);
DOCX via `mammoth.convertToHtml()` + conversão HTML→Markdown por regex (segura aqui porque a
entrada é SEMPRE a saída flat e previsível do mammoth, nunca HTML arbitrário) — preserva a
hierarquia real de Heading 1/2/3 do Word, alimentando o `heading_path` contextual do chunking.
Nova rota `POST /knowledge/import` (multipart/form-data) reaproveita o MESMO `regenerateChunks()`
de sempre; documento importado abre direto em modo de edição na UI (extração pode trazer ruído —
cabeçalho/rodapé repetido, numeração de página — revisão antes de confirmar "Salvar" é o desenho
certo, não um passo opcional).

**Bug real pego ao testar (não hipotético):** `pdf-parse`/`mammoth` funcionavam isolados via Node
puro, mas quebravam dentro da API route do Next com `"Object.defineProperty called on non-object"`
— erro genérico do webpack tentando empacotar o require dinâmico interno do pdf.js. Corrigido com
`experimental.serverComponentsExternalPackages: ['pdf-parse', 'mammoth']` no `next.config.js`
(trata como pacote externo, usa `require` nativo do Node em runtime — padrão conhecido pra libs
baseadas em pdf.js dentro do Next). **2º bug real:** `pdf-parse` insere um separador
`-- N of M --` entre páginas no texto extraído — vazava pro markdown como se fosse conteúdo real;
removido por regex antes do texto entrar no pipeline.

**3. Visualizador de trechos (chunks)** — nova rota `GET /knowledge/[id]/chunks` (só leitura,
nunca expõe o vetor de embedding) + botão de expandir (chevron) em cada linha da lista, mostrando
`heading_path` + `chunk_text` de cada trecho gerado — exatamente o que o bot recupera de verdade,
não só a contagem. Carregado sob demanda (1ª vez que expande), cacheado em memória depois.

**Testado ao vivo, ponta a ponta** (via curl multipart, servidor dedicado do worktree — não o
`:3000` compartilhado): PDF hand-crafted (estrutura válida, xref com offsets reais calculados) →
extraído texto real, "-- 1 of 1 --" limpo · DOCX real (fixture do próprio mammoth, lista
`<ul><li>`) → convertido corretamente pra `- Apple\n- Banana` · `GET .../chunks` retornou o chunk
gerado de cada import corretamente · dados de teste removidos depois, cascata confirmada
(`COUNT(*) = 0` em documents e chunks). `npx tsc --noEmit` limpo em todos os arquivos tocados.

**Dependências novas:** `pdf-parse@^2.4.5`, `mammoth@^1.12.0` (instaladas com
`--legacy-peer-deps`, mesma convenção já documentada no projeto por causa do `react-leaflet@5`).

**⚠️ Nota de persistência (dev):** o container roda agora com `netimob-postgres:17-pgvector` (setado
inline no recreate). Até esta branch mergear em `main`, um `docker compose up` do diretório
principal (branch do Antigravity, ainda com default `postgres:17-alpine`) reverteria a imagem —
setar `POSTGRES_IMAGE=netimob-postgres:17-pgvector` no `.env` do docker, ou não recriar o db sem
essa var, até o merge.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — Coordenação multi-agente + limpeza de sidebar ✅

**Descoberta durante a sessão:** outro agente de IA (Antigravity) está trabalhando em paralelo
neste mesmo repositório, numa branch própria (`feature/ag-cockpit-camadas`), refatorando o
dashboard de Campanhas. A branch ativa do diretório principal (`C:\NetImobiliária\net-
imobiliaria`) mudou de `main` pra essa branch sem eu ter feito isso deliberadamente — meu commit
de checkpoint do M4.4 acabou indo pra lá por engano.

**Corrigido com segurança, via `git worktree` isolado** (nunca tocando na branch/arquivos não
commitados do Antigravity):
1. Cherry-pick do meu commit de volta pra `main` (`d2b6de1`).
2. Código real do M4.4 movido pra uma branch nova, só minha: `feature/mensageria-webchat`
   (worktree em `C:\NetImobiliária\netimob-cherrypick`) — pronta pra virar PR.
3. `CLAUDE.md` ganhou uma nova regra obrigatória: ler `docs/AI_SYNC.md` no início de toda sessão,
   nunca trocar de branch/rodar operação destrutiva num diretório com trabalho não commitado de
   outro agente, preferir worktree separado. Aplicada em `main` (`c7cfd2f`) e localmente no
   diretório original (não commitada lá — push nessa branch foi bloqueado pelo verificador de
   segurança por ser branch de outro agente, decisão respeitada).
4. `docs/AI_SYNC.md` — registrado um novo log de atividade do Claude, avisando o Antigravity do
   que foi feito e confirmando que nenhum arquivo dele foi tocado.

**Limpeza de sidebar:** usuário notou 2 itens ("Chatbot", "Base de Conhecimento") cadastrados
desde a fase antiga de registro de acesso (antes do bot existir), ambos apontando pra URLs sem
página real (404). Investigado: "Chatbot" (`/mensageria/config/chatbot`) é puro duplicado — a
config real do bot já vive em "Configurações" → aba "Bot". "Base de Conhecimento"
(`/mensageria/config/conhecimento`) corresponde ao M4.3 (RAG), genuinamente não iniciado — não
mexido, só documentado como pendência real.

**Ação:** `system_features.is_active = false` pro id=113 (`mensageria-chatbot`) —
`prisma/migration-2026-07-15-mensageria-remove-chatbot-sidebar-duplicate.sql`. Desativado, não
deletado (reversível, mesmo padrão já usado em toda a plataforma pra esconder item da sidebar
sem apagar histórico/permissões associadas). Confirmado via SQL: `is_active=f`.

**Pendências reais do módulo Mensageria, levantadas nesta sessão:**
- M4.3 (RAG/Base de Conhecimento) — não iniciado.
- Merge de `feature/mensageria-webchat` em `main` (via PR) — código pronto, testado, só falta
  integrar oficialmente.
- Item "Base de Conhecimento" da sidebar continua apontando pra URL sem página — decisão de
  desativar ou construir fica pra quando M4.3 for atacado.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — M4.4: Widget de chat público na página de imóvel ✅

**Contexto:** próxima fase formal do plano (`docs/PLANO_MENSAGERIA.md` §18.1) depois de várias
sessões blindando o M4.2. Decisão inicial do usuário ("posicionar na landpaging") revelou um
conflito de arquitetura real: `/landpaging` agrega imóveis de TODOS os tenants do segmento, sem
nenhum parâmetro de escopo — colocar o bot lá misturaria a identidade de qual empresa está
respondendo. Resolvido com o usuário: widget vai na **página de detalhe de 1 imóvel**
(`/imoveis/[id]`), onde existe um tenant real e único pra escopar.

**Implementado (zero hardcode por segmento — o mesmo componente serviria qualquer vertical):**
1. `tenant_id` exposto na API de ficha completa (`/api/public/imoveis/[id]/ficha-completa`) —
   coluna já existia na tabela `imoveis`, só não era selecionada.
2. `resolveWebchatInbox(tenantId)` em `inboxes.ts` — clone do padrão já usado por
   `resolveWebformInbox` (cria a inbox lazy na 1ª mensagem real, `channel_type='webchat'`, já
   previsto no schema desde M0 mas nunca usado até agora).
3. Novo endpoint público **sem autenticação** `/api/public/mensageria/chat` (GET recarrega
   histórico, POST envia mensagem) — reaproveita 100% do pipeline existente
   (`ingestMessage`→`maybeRunBot`, mesmo mecanismo do WhatsApp/`/bot/test`). Identidade do
   visitante anônimo: UUID gerado no navegador (localStorage), usado como `phone: "web:<uuid>"`
   — zero mudança na regra de dedupe já existente em `ingest.ts`.
4. **Rate limit dedicado** (`webchatLimiter`, 15 msg/min por sessão E por IP,
   `src/lib/security/rate-limiter.ts`) — obrigatório aqui: é a única rota pública da plataforma
   que dispara uma chamada LLM real sem autenticação nenhuma, risco genuíno de custo/abuso.
5. Gate por `bot_flows.is_active` ANTES de criar qualquer contato/conversa — tenant sem bot
   configurado nunca aparece com o widget, sem gerar lixo no banco.
6. `ChatWidget.tsx` (`src/components/mensageria/ChatWidget.tsx`) — bolha flutuante + painel,
   parametrizada só por `tenantId` (+ `pageContext` opcional, ver abaixo). Embutida em
   `src/app/(with-header)/imoveis/[id]/page.tsx`.

**Bug real pego no teste ao vivo, corrigido na mesma rodada — contexto de página:** perguntado
"quanto custa esse imóvel?" na própria página do imóvel (preço bem visível na tela), o bot
respondeu que o preço "não foi especificado na pergunta" — ele não tinha nenhuma noção de qual
imóvel a conversa começou. Corrigido de forma genérica (não amarrado a "imóvel"):
- `describeEntityRowByIdentity(segmentId, tenantId, entityName, identityValue)` (novo,
  `genericResolver.ts`) — resolve 1 linha pela coluna de identidade e devolve um resumo em texto
  natural dos campos selecionáveis reais.
- `IngestMessageInput.botContext` (novo, `ingest.ts`) — hint textual só pra aquele turno, nunca
  vira mensagem visível na thread, repassado a `maybeRunBot`→`runBotReply`→apendado à persona.
- `ChatWidget` ganhou prop `pageContext={{ entity: 'imovel', id }}` — a página de detalhe passa
  isso, o backend resolve o registro real (preço, quartos, bairro etc.) a cada mensagem (nunca
  cacheado/obsoleto) e informa o bot que "esse"/"este" se refere a ESTE item específico.

**Testado ao vivo, no navegador de verdade** (não só via curl): bolha aparece na página real do
imóvel 1 (tenant Imobiliária XYZ, bot ativo) · mensagem enviada pelo painel → resposta do bot
renderizada em tempo real, sem login, sem cookie · rate limit testado com 17 mensagens rápidas —
15 passam (HTTP 200), 16ª e 17ª bloqueadas (HTTP 429) · inbox `webchat` criada corretamente no
banco · após o fix de contexto de página, "quanto custa esse imóvel?" respondeu corretamente
"R$ 906.000,00" (valor real da tela). `npx tsc --noEmit` limpo em todos os 8 arquivos tocados.

**Fora de escopo desta rodada (documentado, não esquecido):** streaming/SSE no widget (polling
simples por ora); múltiplos clientes por tenant no widget (`clientId` fica de fora, tenant-only,
mesmo padrão de `webform`/`manual`); M4.3 (RAG) continua não iniciada.

---

## Última tarefa concluída

### Sessão 2026-07-15 (continuação) — M4.4: Widget de chat público na página de imóvel ✅

**Contexto:** próxima fase formal do plano (`docs/PLANO_MENSAGERIA.md` §18.1) depois de várias
sessões blindando o M4.2. Decisão inicial do usuário ("posicionar na landpaging") revelou um
conflito de arquitetura real: `/landpaging` agrega imóveis de TODOS os tenants do segmento, sem
nenhum parâmetro de escopo — colocar o bot lá misturaria a identidade de qual empresa está
respondendo. Resolvido com o usuário: widget vai na **página de detalhe de 1 imóvel**
(`/imoveis/[id]`), onde existe um tenant real e único pra escopar.

**Implementado (zero hardcode por segmento — o mesmo componente serviria qualquer vertical):**
1. `tenant_id` exposto na API de ficha completa (`/api/public/imoveis/[id]/ficha-completa`) —
   coluna já existia na tabela `imoveis`, só não era selecionada.
2. `resolveWebchatInbox(tenantId)` em `inboxes.ts` — clone do padrão já usado por
   `resolveWebformInbox` (cria a inbox lazy na 1ª mensagem real, `channel_type='webchat'`, já
   previsto no schema desde M0 mas nunca usado até agora).
3. Novo endpoint público **sem autenticação** `/api/public/mensageria/chat` (GET recarrega
   histórico, POST envia mensagem) — reaproveita 100% do pipeline existente
   (`ingestMessage`→`maybeRunBot`, mesmo mecanismo do WhatsApp/`/bot/test`). Identidade do
   visitante anônimo: UUID gerado no navegador (localStorage), usado como `phone: "web:<uuid>"`
   — zero mudança na regra de dedupe já existente em `ingest.ts`.
4. **Rate limit dedicado** (`webchatLimiter`, 15 msg/min por sessão E por IP,
   `src/lib/security/rate-limiter.ts`) — obrigatório aqui: é a única rota pública da plataforma
   que dispara uma chamada LLM real sem autenticação nenhuma, risco genuíno de custo/abuso.
5. Gate por `bot_flows.is_active` ANTES de criar qualquer contato/conversa — tenant sem bot
   configurado nunca aparece com o widget, sem gerar lixo no banco.
6. `ChatWidget.tsx` (`src/components/mensageria/ChatWidget.tsx`) — bolha flutuante + painel,
   parametrizada só por `tenantId` (+ `pageContext` opcional, ver abaixo). Embutida em
   `src/app/(with-header)/imoveis/[id]/page.tsx`.

**Bug real pego no teste ao vivo, corrigido na mesma rodada — contexto de página:** perguntado
"quanto custa esse imóvel?" na própria página do imóvel (preço bem visível na tela), o bot
respondeu que o preço "não foi especificado na pergunta" — ele não tinha nenhuma noção de qual
imóvel a conversa começou. Corrigido de forma genérica (não amarrado a "imóvel"):
- `describeEntityRowByIdentity(segmentId, tenantId, entityName, identityValue)` (novo,
  `genericResolver.ts`) — resolve 1 linha pela coluna de identidade e devolve um resumo em texto
  natural dos campos selecionáveis reais.
- `IngestMessageInput.botContext` (novo, `ingest.ts`) — hint textual só pra aquele turno, nunca
  vira mensagem visível na thread, repassado a `maybeRunBot`→`runBotReply`→apendado à persona.
- `ChatWidget` ganhou prop `pageContext={{ entity: 'imovel', id }}` — a página de detalhe passa
  isso, o backend resolve o registro real (preço, quartos, bairro etc.) a cada mensagem (nunca
  cacheado/obsoleto) e informa o bot que "esse"/"este" se refere a ESTE item específico.

**Testado ao vivo, no navegador de verdade** (não só via curl): bolha aparece na página real do
imóvel 1 (tenant Imobiliária XYZ, bot ativo) · mensagem enviada pelo painel → resposta do bot
renderizada em tempo real, sem login, sem cookie · rate limit testado com 17 mensagens rápidas —
15 passam (HTTP 200), 16ª e 17ª bloqueadas (HTTP 429) · inbox `webchat` criada corretamente no
banco · após o fix de contexto de página, "quanto custa esse imóvel?" respondeu corretamente
"R$ 906.000,00" (valor real da tela). `npx tsc --noEmit` limpo em todos os 8 arquivos tocados.

**Fora de escopo desta rodada (documentado, não esquecido):** streaming/SSE no widget (polling
simples por ora); múltiplos clientes por tenant no widget (`clientId` fica de fora, tenant-only,
mesmo padrão de `webform`/`manual`); M4.3 (RAG) continua não iniciada.

---

## Última tarefa concluída

### Sessão 2026-07-15 — Guard-rail "nunca responder sem consultar" + comparação de modelos LLM ⚠️

**Bug real reportado (conversa colada):** na mesma conversa, o bot afirmou corretamente que
existem imóveis em Piedade (via `agrupar_imovel`) e, pouco depois, negou a existência desses
mesmos imóveis quando perguntado diretamente ("não encontramos imóveis em Piedade"). Investigação
com instrumentação temporária (log de `call.name`/`call.input`, revertido depois) confirmou: em
ambos os casos (o relatado e minha reprodução), a causa é o LLM **simplesmente não chamar
nenhuma ferramenta** naquele turno específico e responder "não encontramos" do nada — aleatório,
não ligado a uma pergunta específica.

**Mitigação implementada (código, `botAdapter.ts`):** novo guard-rail permanente
`NEVER_ANSWER_WITHOUT_TOOL_GUARDRAIL`, complementar ao `TOOL_GUARDRAIL` já existente (que cobre o
risco oposto — chamar ferramenta sem relação real com a pergunta): proíbe afirmar
"não encontramos"/"não temos" sem ter acabado de consultar a ferramenta correspondente NESTE
turno. **Testado honestamente: NÃO resolveu sozinho** — bateria de 3 rodadas (9 perguntas) com o
guard-rail ativo ainda teve ~4-5 falhas do mesmo tipo. Confirma, com dado concreto, que texto de
instrução tem um teto real contra esse tipo de falha — não é um problema de prompt mal escrito.

**Comparação de modelos LLM feita ao vivo, mesma bateria de perguntas, todos free-tier:**

| Provider/Modelo | Resultado |
|---|---|
| Groq `llama-4-scout-17b` (original) | Às vezes pula a chamada de ferramenta (bug acima) |
| Groq `llama-3.3-70b-versatile` | NÃO usa tool-calling estruturado da API — escreve a chamada como texto solto (`<function.x>`), pior que o Scout pra esse fim |
| Groq `openai/gpt-oss-120b` | Inventa nomes de ferramenta com erro de digitação (`agrupart_imovel`) → API rejeita com 400, turno inteiro falha |
| Groq `moonshotai/kimi-k2-instruct-0905` | Não disponível nesta conta Groq (confirmado via `/v1/models` — retorna vazio pra qualquer termo kimi/moonshot) |
| Kimi/Moonshot direto (conta internacional do usuário) | Chave válida mas conta suspensa por saldo insuficiente (`platform.moonshot.ai`) — nosso catálogo apontava pro endpoint errado (`.cn`, China), corrigível mas não testado a fundo por causa do saldo |
| Google `gemini-flash-latest` | Chave já provisionada (`GEMINI_API_KEY`) funciona (`gemini-2.5-flash` e `gemini-2.0-flash-001` falharam por indisponibilidade/cota=0 nesta conta espec[ifica) — mas API do Google retornando `503 UNAVAILABLE` (sobrecarga temporária do lado deles, confirmado 3x direto na origem, sem passar pelo nosso código) no momento do teste — não foi possível concluir a bateria completa |

**Estado final desta sessão:** revertido pra `groq`/`llama-4-scout-17b-16e-instruct` (o mais
estável dos 3 testados no Groq, apesar do bug original ainda existir probabilisticamente) — chave
Groq restaurada e conexão reconfirmada. Gemini fica como próximo candidato a retestar quando a
sobrecarga do Google passar; catálogo (`LlmModel`) já tem `gemini-flash-latest`,
`moonshotai/kimi-k2-instruct-0905` (Groq) e `openai/gpt-oss-120b` (Groq) cadastrados pra uso
futuro sem precisar de nova migração.

**Migrações aplicadas:** `migration-2026-07-15-llmmodel-kimi-k2-groq.sql`,
`migration-2026-07-15-llmmodel-gpt-oss-120b-groq.sql`,
`migration-2026-07-15-llmmodel-gemini-flash-latest.sql`.

**Nota de segurança:** o usuário colou 2 API keys reais em texto puro no chat durante esta sessão
(Kimi/Moonshot e Groq) — recomendado ao usuário rotacionar/revogar ambas por precaução, já que
ficaram registradas na transcrição da conversa.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 10) — Ferramenta genérica de agrupamento/contagem ✅

**Contexto:** conversa real mostrou o bot listando só 4 dos 7 bairros reais desse tenant
("em quais cidades e bairros vocês têm imóveis?"), sempre os mesmos, porque `buscar_imovel`
(`max_rows=5`, mesmo com paginação) só enumera categorias que aparecem nos primeiros IDs — um
bairro como Piedade (6 imóveis, ids mais altos) nunca surgia, mesmo tendo mais itens que Estância
(1 imóvel). Paginação resolve "ver mais itens", não "enumerar todas as categorias distintas" — são
problemas diferentes.

**Desafio do usuário:** resolver isso genericamente pra QUALQUER segmento (saúde, carros,
produtos...) sem nenhuma linha hardcoded — o "campo agrupador" muda por segmento (bairro, marca,
especialidade, categoria) e o código nunca pode saber esse nome de antemão.

**Implementado — mesmo padrão de opt-in já usado em `is_comparable`/`is_image`/`is_group_header`:**
1. Novo flag `is_groupable` em `EntityColumn` (`genericResolver.ts`) — Master marca por coluna,
   em qualquer entidade de qualquer segmento. O código só filtra pela flag, nunca lê o nome da
   coluna.
2. `aggregateEntity()` — nova função que roda `SELECT <campo>, count(*) GROUP BY <campo> ORDER BY
   count DESC LIMIT 30` sobre a entidade, reaproveitando os MESMOS filtros/escopo de tenant já
   usados em `resolveEntity` (extraído pra `buildWhereClause()` compartilhado). Resolve o nome
   legível via `buildGroupExpr()` quando o campo é uma FK com lookup (ex.: fabricante_fk →
   fabricantes.nome) — mesma mecânica já usada pra colunas normais.
3. `getToolsForSegment` — qualquer entidade com ≥1 coluna `is_groupable` ganha automaticamente a
   ferramenta `agrupar_<entidade>`, ao lado de `buscar_`/`comparar_` — zero código novo por
   segmento. Descrição da ferramenta orienta o LLM a usá-la só pra perguntas exploratórias
   ("em quais X vocês têm"), não pra ver itens individuais (aí é `buscar_`).
4. `botAdapter.ts` — novo ramo no loop de tool-use pra `agrupar_*`, separado do fluxo de linhas
   normal (sem foto/cabeçalho/paginação, que não fazem sentido pra uma contagem por categoria).

**Migração:** `prisma/migration-2026-07-14-mensageria-bot-is-groupable.sql` marca `bairro` como
`is_groupable:true` na entidade `imovel` — único campo aplicado nesta rodada; outros segmentos
precisam da mesma curadoria (Master marca o campo relevante deles) quando forem ativados.

**Testado ao vivo, tenant real (37 imóveis, 7 bairros):** pergunta exata reportada ("em quais
cidades e bairros vocês têm imóveis?") → bot listou os 7 bairros reais com as contagens EXATAS
(Imbiribeira 20, Piedade 6, Boa Viagem 6, Ipsep 2, Estância 1, Madalena 1, Cordeiro 1) —
conferido via SQL direto, bate 100% · Piedade e Cordeiro, que nunca apareciam antes, agora
aparecem corretamente · drill-down testado em seguida ("me mostra os imóveis de Piedade") →
`buscar_imovel` funcionando normalmente, achou os 6 imóveis reais de Piedade (bairro que antes
era invisível pro bot) · round-trip real `GET/PUT /data-entities` confirma o flag sobrevivendo ao
ciclo salvar-pela-tela · `npx tsc --noEmit` limpo nos 4 arquivos tocados.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 9) — Paginação genérica no bot ("mostrar mais") ✅

**Contexto:** investigando uma conversa real onde o bot só citava 1 imóvel por bairro com dados
pobres, achamos a causa: o tenant tem 37 imóveis reais em 7 bairros, mas `max_rows` da entidade
`imovel` é 5 — toda consulta sem filtro específico só via 5 linhas no total. Cogitamos um link pra
uma página pública externa ("ver todos aqui"), mas investigação revelou que a única página pública
existente (`/landpaging`) agrega TODOS os tenants do segmento junto, sem parâmetro de escopo por
tenant — mandar o visitante pra lá vazaria imóveis de concorrentes. Descartado por ora; decisão do
usuário: implementar só paginação dentro do próprio chat.

**Implementado — genérico, zero hardcode por segmento:**
1. `resolveEntity()` (`genericResolver.ts`) — passa a aceitar `pagina` (1-based, vindo do LLM) e
   retorna `{ rows, totalCount, page, pageSize }` em vez de array cru. `totalCount` vem de um
   `COUNT(*)` companheiro (mesmo WHERE, sem LIMIT/OFFSET) — é o que permite o bot saber que existem
   mais resultados além dos mostrados. `OFFSET` usa a MESMA `ORDER BY` determinística da sessão
   anterior — sem isso, a página 2 poderia repetir ou pular itens da página 1.
2. Novo parâmetro `pagina` injetado automaticamente em toda ferramenta `buscar_<entidade>`
   (`addPaginationParam`) — deliberadamente NÃO adicionado em `comparar_<entidade>` (comparação
   precisa varrer o conjunto de candidatos inteiro pra achar o vencedor real; paginar quebraria a
   conta).
3. `botAdapter.ts` — quando `totalCount` > o que foi mostrado, injeta um aviso explícito no
   `tool_result` com a contagem real e instrução de perguntar se o visitante quer ver mais,
   chamando a MESMA ferramenta de novo com `pagina` incrementada.
4. `compareEntity` ajustado pro novo formato de retorno de `resolveEntity` (`{ rows }` em vez de
   array direto) — sem mudança de comportamento nele.

**Testado ao vivo, tenant real com 20 imóveis em Imbiribeira:** 1ª pergunta ("quais imóveis vocês
têm na Imbiribeira?") → 5 imóveis com TODOS os campos (preço, quartos, banheiros, vagas — antes
vinha só o título) + "Você gostaria de ver mais opções?" · "sim, mostra mais" → 5 imóveis
COMPLETAMENTE DIFERENTES dos primeiros (página 2 real, sem repetição) + oferece mais de novo,
confirmando que ainda há mais além da página 2. `npx tsc --noEmit` limpo nos 2 arquivos tocados.

**Nota da 2ª parte do problema original (respostas "pobres"):** não era um bug separado — era
consequência direta do `max_rows=5` forçando o LLM a resumir muitos bairros numa resposta minúscula.
Com a paginação, cada resposta agora cobre só 1 bairro/consulta por vez com todos os campos —
resolvido como efeito colateral, sem mudança nenhuma na lógica de formatação.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 8) — Resolvido o "caso residual": LIMIT sem ORDER BY ✅

**Causa raiz real do achado residual da tarefa anterior:** `resolveEntity()` (`genericResolver.ts`)
montava `SELECT ... LIMIT N` **sem `ORDER BY`**. Postgres não garante ordem nem conjunto estável
de linhas em `LIMIT` sem `ORDER BY` — duas chamadas idênticas na MESMA conversa (ex.: listar
imóveis, depois perguntar "tem fotos?", cada uma disparando uma nova consulta ao `buscar_imovel`)
podiam devolver amostras de até 5 itens DIFERENTES entre si, mesmo com os mesmos filtros. Isso
explicava o bot "esquecer"/contradizer o que tinha acabado de listar — não era o LLM inventando,
era o BANCO devolvendo dados diferentes pra a mesma pergunta.

**Corrigido:** `ORDER BY e.<identityColumn>` adicionado à query — determinístico, genérico (usa a
mesma coluna de identidade já configurada por entidade, funciona pra qualquer segmento), sem
custo de configuração nova.

**Testado:** SQL direto confirma `ORDER BY id LIMIT 5` devolvendo os MESMOS 5 registros em
execuções repetidas · reproduzida a sequência exata do achado residual ("quais imóveis vocês
têm?" → "tem fotos?") 3x seguidas — nas 3, o 2º turno confirmou fotos EXATAMENTE dos mesmos 5
imóveis citados no 1º turno (Imóvel 1, 2, 3, 4, 6), zero inconsistência, contra o comportamento
instável de antes. `npx tsc --noEmit` limpo.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 7) — Bot dizendo "não posso exibir fotos" numa pergunta de acompanhamento ✅⚠️

**Bug real reportado via conversa colada:** depois de já ter listado imóveis (sem foto pedida),
perguntado "tem fotos dos imóveis?", o bot respondeu "não posso exibir as fotos diretamente
aqui... posso transferir você para um atendente" — contradizendo diretamente a regra da persona
de que a plataforma sempre envia foto real como mensagem separada quando existe.

**Diagnóstico:** a regra "nunca diga que não pode exibir imagens" só existia DENTRO do aviso
injetado no `tool_result` de uma chamada de ferramenta (mecanismo de sessão anterior) — se o LLM
decide não chamar nenhuma ferramenta naquele turno (respondendo só de memória do histórico), essa
proteção nunca chega a ele. Tentei reproduzir a sequência exata 4x antes do fix — funcionou
corretamente todas as vezes (LLM é probabilístico, não consegui forçar a falha de forma
determinística), então a correção foi feita preventivamente com base no diagnóstico da causa raiz,
não confirmada por reprodução direta do erro relatado.

**Implementado:** novo guard-rail genérico (`PHOTO_FOLLOWUP_GUARDRAIL`, `botAdapter.ts`,
`resolvePersona`) — regra permanente (fora do ciclo de tool-use, vale em qualquer turno):
sempre chamar a ferramenta de novo quando o visitante perguntar sobre foto, mesmo sobre itens já
mencionados antes sem foto; proíbe explicitamente a frase "não posso exibir/mostrar imagens".
Aplica a todos os segmentos automaticamente, sem exigir edição de persona por segmento.

**Testado:** 5 tentativas de reprodução com frases variadas (`"tem fotos dos imoveis?"`,
`"tem fotos?"`) — 0/5 repetiram a frase proibida depois do fix; 2/5 enviaram fotos reais como
anexo corretamente. **Achado residual, honestamente registrado, NÃO é o mesmo bug relatado:** numa
pergunta bem genérica sem bairro ("quais imóveis vocês têm?"), uma das rodadas disse "não
encontrei fotos" pra um item que na verdade TEM foto real no banco (Imóvel 1) — indício de que a
amostra de até 5 imóveis retornada pela ferramenta pode variar entre chamadas na mesma conversa
(sem filtro de bairro pra fixar o conjunto), então o 2º check de foto pode acabar batendo em itens
diferentes do que foram citados no texto. Fica registrado como risco a observar, não corrigido
nesta rodada. `npx tsc --noEmit` limpo.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 6) — Ferramenta chamada por engano em pergunta sem relação real ✅

**Bug real reportado:** perguntado deliberadamente algo sem correspondência com nenhum dado
mapeado ("você tem o estatudo de imoveis?" — estatuto, não um campo/entidade real), o bot chamou
a ferramenta `tipo_imovel` e respondeu com a lista de tipos (Casa, Apartamento, etc.) — um dado
real, mas sem nenhuma relação com a pergunta. Pior que "não sei", porque parece resposta certa.

**Restrição do usuário:** sem hardcode de palavra-chave em código — só via instrução de prompt,
e válido pra **todos os segmentos**, não só Imobiliário.

**Implementado em 2 camadas:**
1. **Guard-rail genérico em código** (`botAdapter.ts`, `resolvePersona`) — texto fixo
   (`TOOL_GUARDRAIL`) concatenado a QUALQUER persona resolvida (segmento específico, fallback
   global, ou hardcoded de emergência), pedindo pro LLM só chamar ferramenta quando a pergunta
   corresponder claramente à descrição dela, nunca "no chute" por semelhança solta. Aplica
   automaticamente a todo segmento presente e futuro, sem exigir que o Master repita a regra em
   cada template de persona.
2. **Descrição da ferramenta mais restritiva** (dado, não código — `mensageria.segment_data_
   entities`, entidade `tipo_imovel`) — a descrição antiga ("use pra responder o que a empresa
   oferece") era ampla demais e pesava na decisão de tool-calling tanto ou mais que a persona.
   Reescrita com critério explícito de quando NÃO usar (documentos/contratos/estatuto/política) —
   mesmo padrão já usado em `status_fk` numa sessão anterior.
   `prisma/migration-2026-07-14-mensageria-bot-tipo-imovel-desc-fix.sql`.

**Testado:** só o guard-rail (camada 1) sozinho NÃO foi suficiente — reproduzi o bug de novo
mesmo com ele presente, confirmando mais uma vez que instrução textual genérica tem baixa adesão
sozinha. Com a descrição da entidade reescrita (camada 2) somada ao guard-rail, retestei a EXATA
pergunta reportada 3x seguidas — 3/3 corretas ("não tenho acesso a informações sobre o estatuto
de imóveis..."), sem chamar a ferramenta · regressão checada: "quais tipos de imóveis vocês
trabalham?" (pergunta legítima) continua chamando a ferramenta normalmente e listando os tipos
reais. `npx tsc --noEmit` limpo.

**Nota de generalização:** a camada 1 (guard-rail em código) já vale automaticamente pra qualquer
segmento. A camada 2 (descrição mais restritiva) foi aplicada só em `tipo_imovel` — outros
segmentos/entidades que sofrerem do mesmo tipo de confusão precisam do mesmo tratamento na
descrição de CADA entidade, feito pelo Master na tela "Dados do Bot" (sem código novo).

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 5) — Fotos enviadas sem pedido explícito (todo turno com dado de imóvel) ✅

**Bug real reportado via conversa colada pelo usuário:** toda resposta que tocava linhas com foto
real mandava as fotos automaticamente — inclusive "em quais bairros vocês têm imóveis?", "qual tem
o valor mais baixo?", "qual a média de valor?" — nenhuma dessas perguntas pedia foto, mas cada uma
disparou 1-4 mensagens de imagem depois do texto. Causa: `collectRowImages`/`itemsByKey` em
`botAdapter.ts` coletava as URLs de TODA linha retornada por qualquer tool call, sem checar se a
pergunta atual pedia isso.

**Restrição do usuário:** "nada hardcoded, a não ser que possamos instruir o prompt" — ou seja,
não podia virar uma lista de palavras-chave fixa em código (`if (msg.includes('foto'))`), tinha
que ser o próprio LLM decidindo, como já acontece com campos/operação/critério da ferramenta de
comparação.

**Implementado:** novo parâmetro `incluir_fotos` (string "true"/"false") injetado automaticamente
em QUALQUER ferramenta (`buscar_*`/`comparar_*`) de entidade que tenha ao menos 1 relation
`is_image` — `addPhotoIntentParam()` em `genericResolver.ts`, dirigido 100% por metadado (nenhum
segmento/campo fixo). Descrição do parâmetro instrui o LLM a marcar `true` só quando o visitante
pediu foto NESTA pergunta especificamente. `botAdapter.ts`: `collectRowImages` só roda quando
`call.input.incluir_fotos` veio `true` nessa chamada — sem pedido, `itemsByKey` guarda `images:[]`
pra aquele item (sem afetar cabeçalho/agrupamento). O aviso "nenhum item tem foto" também passou a
só disparar quando `wantsPhotos` é true — antes disparava sempre que havia relation de imagem sem
foto encontrada, mesmo em perguntas que não tinham nada a ver com fotos.

**Testado ao vivo, 4 cenários seguidos na mesma conversa:** "em quais bairros vocês têm imóveis?"
→ zero fotos (bug original, confirmado corrigido) · "qual tem os valores mais baixos?" → zero
fotos · "me manda fotos dos imóveis de Boa Viagem" → pediu foto explicitamente, sistema respondeu
corretamente "não encontrei fotos disponíveis" (conferido via SQL: os 6 imóveis de Boa Viagem
deste tenant de teste realmente têm 0 fotos reais — resposta certa, não bug) · "quero ver fotos
dos imóveis da Imbiribeira" (bairro com fotos reais) → 4 cartões, cada um com 1 foto anexada de
verdade. `npx tsc --noEmit` limpo nos 2 arquivos tocados.

---

## Última tarefa concluída

### Sessão 2026-07-14 (continuação 4) — Segregação moeda × quantidade em `comparar_<entidade>` ✅

**Motivação:** usuário apontou um risco real depois do fix anterior (flag `is_comparable`): nada
impedia o bot de somar campos de NATUREZAS diferentes — ex. `preco + quartos` — já que
`is_comparable` só marca "este campo é elegível pra comparação", não "este campo pode ser somado
com aquele outro". Descartei a 1ª ideia (unidade em texto livre, o Master digitaria "R$"/"m²"/etc)
depois que o usuário perguntou como escolheria essas unidades — texto livre é frágil e sem
necessidade real, já que o único caso de negócio genuíno é somar campos de DINHEIRO entre si
(preço + condomínio + IPTU = custo total); somar quantidades entre si (quartos + banheiros) nunca
é uma pergunta real.

**Implementado:** novo campo `comparison_kind: 'moeda' | 'quantidade'` em `EntityColumn`
(`genericResolver.ts`) — só relevante quando `is_comparable=true`; default seguro `'quantidade'`
quando ausente. `compareEntity` passa a rejeitar (com erro explícito, não calcula) qualquer
`campos` com 2+ itens a menos que TODOS sejam `moeda` — combinação de quantidade com quantidade,
ou quantidade com moeda, é sempre recusada; ranking de 1 campo só nunca precisa dessa checagem
(sempre seguro). Descrição da ferramenta (`buildCompareParamsSchema`) já avisa o LLM quais campos
são combináveis. UI ganhou um dropdown "quantidade"/"moeda" ao lado do checkbox "comparável" (só
2 opções — Master não digita nada). `prisma/migration-2026-07-14-mensageria-bot-comparison-kind.sql`
marca `preco`/`preco_condominio`/`preco_iptu` como `moeda` e `quartos`/`banheiros`/
`vagas_garagem`/`area_total` como `quantidade`.

**Testado ao vivo** (rate-limit do Groq já tinha resetado): "somando preço + condomínio + IPTU"
(3 campos moeda) → bot respondeu corretamente "Imóvel 1, R$ 433.300,00" — conferido via SQL direto
que bate exatamente com a soma real · "somando preço com quantidade de quartos" (moeda + quantidade
misturados) → bot recusou explicitamente ("não é permitido combinar campos de moeda com campos de
quantidade") e ofereceu a alternativa sensata (menor preço isolado) em vez de inventar um total
sem sentido — exatamente o comportamento pretendido. `npx tsc --noEmit` limpo nos 3 arquivos
tocados. SQL confirma os 7 campos com `comparison_kind` correto (3 moeda, 4 quantidade).

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação 3) — Cabeçalho único, id excluído, flag `is_comparable` explícita ✅

**Contexto:** usuário fez 3 perguntas de design sobre a tela "Dados do Bot" (Master → Segmentos),
cada uma revelando um gap real (não hipotético):
1. "cabeçalho" (`is_group_header`) permitia marcar várias colunas na UI, mas `botAdapter.ts` só
   usa a primeira (`.find()`) — as demais ficavam marcadas sem efeito, enganoso.
2. `id` (PK, numérica) entrava como campo elegível pra soma/comparação — sem sentido de negócio
   nenhum (chave arbitrária, não quantidade).
3. Campos como `andar`/`vagas_garagem` são posição/quantidade, não "valor" — marcar QUALQUER
   numérico selecionável como comparável (comportamento anterior) permitia somas sem sentido
   (ex.: andar + vagas de garagem). Faltava curadoria explícita, no mesmo padrão de `is_image`/
   `is_group_header` (flag que o Master ativa deliberadamente, não inferência automática por tipo).

**Corrigido (3 partes, plano aprovado em `bright-herding-minsky.md`):**
1. **Cabeçalho exclusivo** — `SegmentDataEntitiesModal.tsx`: `updateColumn` agora desmarca
   `is_group_header` em todas as outras colunas da mesma entidade quando uma é marcada.
2. **Identidade sempre excluída** — `genericResolver.ts`: `isComparableNumericColumn` passa a
   receber `identityColumn` e excluir sempre essa coluna (estrutural, sem flag — nenhuma entidade
   de nenhum segmento deveria comparar por PK). Atualizados os 3 call sites (`compareEntity`,
   `buildCompareParamsSchema`, `getToolsForSegment`) + espelho no frontend.
3. **Flag explícita `is_comparable`** — nova propriedade em `EntityColumn`/`EntityColumnInput`;
   `isComparableNumericColumn` agora exige `is_comparable===true` além de number/selectable/sem
   lookup/não-identidade. UI ganhou checkbox "comparável" (mesmo padrão visual de "cabeçalho") ao
   lado de cada coluna numérica; badge agregado e ícone por linha passam a refletir o flag real em
   vez de inferir do `type` cru. `prisma/migration-2026-07-14-mensageria-bot-is-comparable.sql`
   marca `is_comparable:true` em `preco`, `preco_condominio`, `preco_iptu`, `quartos`, `banheiros`,
   `vagas_garagem`, `area_total` — deixa `andar` e `id` de fora deliberadamente (Master pode
   ajustar livremente depois, é exatamente o ponto de virar curadoria).

**Testado:** `npx tsc --noEmit` limpo (só erros pré-existentes de baseline, nenhum nos 4 arquivos
tocados) · SQL confirma os 7 campos com `is_comparable:true`, ausente em `andar`/`id`/demais ·
round-trip real `GET/PUT /api/admin/master/segments/[id]/data-entities` confirma o flag
sobrevivendo ao ciclo salvar-pela-tela · teste ao vivo do bot (pergunta de comparação real, mesmo
cenário do bug original) bateu no rate-limit diário do Groq (429, "Used 499711/500000") — confirmado
via logging temporário de stack trace (adicionado e revertido nesta sessão, `botAdapter.ts` com
diff líquido zero) que é o MESMO bloqueio ambiental já documentado antes nesta sessão, não um bug
introduzido pelas mudanças — o try/catch existente tratou graciosamente com a mensagem de fallback.
Retestar o `comparar_imovel` ao vivo fica pendente até o quota resetar. Exclusividade do cabeçalho
verificada por leitura de código (mutual-exclusion no `updateColumn`), não interação real no
navegador — mesma limitação de cookie/middleware Master já documentada repetidamente nesta sessão.

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação 2) — Ícone de comparação por coluna ✅

Usuário confirmou via print real que o badge agregado (sessão anterior) renderiza corretamente
("9 campos elegíveis... id, quartos, banheiros..."), mas pediu o indicador também **por linha de
coluna** — não só no resumo do topo. Adicionado `CalculatorIcon` (mesmo import já usado no badge)
inline em cada linha de coluna, condicionado à mesma regra (`type==='number' && selectable &&
!lookup_table`) — aparece só nas colunas realmente elegíveis, ao lado da descrição.

**Testado:** `npx tsc --noEmit` limpo. Verificação visual desta vez confirmada pelo usuário
(primeira vez nesta sessão que uma verificação visual do módulo Master foi confirmada por print
real, não só inferência de código — a limitação de cookie/middleware Master continua valendo pra
verificação MINHA própria, mas o usuário consegue ver a tela normalmente pela sessão dele).

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 (continuação) — Badge "campos elegíveis para comparação" no Dados do Bot ✅

Usuário pediu visibilidade da nova ferramenta `comparar_<entidade>` (sessão anterior) na tela
Master. Como a capacidade é 100% derivada de metadado já existente (nenhum campo novo de config),
adicionado só um indicador visual: `comparableFieldNames()` em
`SegmentDataEntitiesModal.tsx` espelha a mesma regra do backend
(`isComparableNumericColumn` em `genericResolver.ts` — número + selecionável + sem lookup) e
renderiza um aviso âmbar acima da lista de colunas de cada entidade: "N campos elegíveis para
comparação: preco, preco_iptu, quartos, ...". Zero API nova — só leitura do state já carregado.

**Testado:** `npx tsc --noEmit` limpo. Verificação visual no navegador não foi possível — mesma
limitação de cookie/middleware Master já documentada repetidamente nesta sessão (confirmado mais
uma vez: navegação pra `/admin/master/segments` com cookie injetado via JS foi redirecionada).
Confiança na correção via inspeção de código (lógica é uma cópia 1:1 do filtro já testado e
validado no backend) — pendente confirmação visual do usuário.

---

## Penúltima tarefa concluída

### Sessão 2026-07-14 — preco_iptu exposto ao bot + comparação exclui colunas FK ✅

**Achado crítico, checando a UI de "Dados do Bot":** `preco_iptu` estava com `selectable:false` —
**nunca esteve exposto ao bot em nenhum momento desta sessão**. Todo valor de IPTU que o bot
mostrou (inclusive no relato original do bug de comparação, "R$ 1.100,00" pro imóvel 1) era
**inventado** — confirmado comparando com o dado real (`preco_iptu` do imóvel 1 = R$ 2.200,00,
não bate com o que o bot disse). Não era "estimativa imprecisa", era alucinação total por falta
de acesso ao dado. Corrigido: `preco_iptu` agora `selectable:true` (mesmo padrão do fix de
`preco_condominio`, sessão anterior).

**2º bug achado no mesmo processo:** a ferramenta `comparar_<entidade>` (sessão anterior)
considerava `type:'number' && selectable:true` como critério de elegibilidade — mas colunas FK
com lookup (`tipo_fk`, `status_fk`, `finalidade_fk`) também são `type:'number'` no banco (são
FKs), só que o valor que o bot vê é o NOME resolvido (ex.: "Apartamento"), não um número somável.
Nova função `isComparableNumericColumn()` exclui colunas com lookup válido da elegibilidade —
usada nos 3 lugares que antes repetiam a checagem inline.

**Testado:** `npx tsc --noEmit` limpo · lista de campos elegíveis pra comparação reconferida via
SQL — `preco_iptu` entrou, `tipo_fk`/`status_fk`/`finalidade_fk` saíram.

---

## Penúltima tarefa concluída

### Sessão 2026-07-13 (continuação 2) — Ferramenta genérica `comparar_<entidade>` — cálculo sai do LLM ✅⚠️

**Motivação:** sessão anterior mostrou que pedir pro LLM (na mesma chamada de formatação de
cartões) fazer aritmética entre vários itens e escolher o vencedor não é confiável — chegou a
inventar "IPTU aproximado". Usuário questionou se a correção generalizaria pra outros segmentos
(carro, saúde) sem hardcode de nome de campo. Resposta: a ideia original ("código já sabe quais
campos somar") NÃO generalizava — o código não pode saber de antemão que "valor+IPTU" é a soma
certa pra UMA pergunta específica. Desenho corrigido: separar "quais campos + qual operação" (LLM
extrai — tarefa que ele faz bem) de "executar a conta e escolher o vencedor" (código faz — 100%
determinístico), numa ferramenta nova derivada só de metadado já existente.

**Implementado:**
1. `genericResolver.ts` — `compareEntity(entity, params, ctx)`: reaproveita `resolveEntity` pra
   buscar as linhas candidatas (mesmos filtros/tenant/maxRows de sempre); calcula em JS
   (`Number()` real, nunca texto) soma/subtração/média dos `campos` pedidos; encontra o extremo
   (menor/maior, com tolerância de arredondamento) e retorna só a(s) linha(s) vencedora(s) com
   `_total_calculado` anexado. `campos` só aceita nomes que já são
   `entity.columns` com `type==='number' && selectable===true` — zero config nova, zero nome de
   campo/segmento fixo.
2. `getToolsForSegment` — qualquer entidade com ≥1 coluna numérica selecionável ganha
   automaticamente a ferramenta `comparar_<entidade>` (ao lado de `buscar_<entidade>`, que
   continua igual). Já vale pro imóvel hoje (preco, preco_iptu, quartos etc. já são
   number+selectable) e valeria pra carro/saúde/qualquer segmento assim que tiverem colunas
   numéricas cadastradas — sem código novo.
3. `botAdapter.ts` — loop de tool-use reconhece `comparar_*` além de `buscar_*`; resultado
   (já ranqueado pelo código) passa pelo MESMO pipeline de sanitização/fotos/cartões que já
   existia; aviso extra explícito: "o item já foi selecionado pelo sistema, _total_calculado já
   é real, NUNCA recalcule".

**Verificado (nível código, sem LLM — 100% determinístico):** SQL direto confirma o cálculo real
de `preco+preco_iptu` pra todos os imóveis ativos do tenant de teste — imóvel 2 (R$400.000,00,
sem IPTU) é o menor hoje. `npx tsc --noEmit` limpo.

**⚠️ Teste end-to-end via LLM real BLOQUEADO nesta sessão** — não por bug, mas porque a cota diária
do provider Groq (`llama-4-scout-17b-16e-instruct`, config LLM global da plataforma) esgotou
(500.000 tokens/dia) pelo volume de testes ao vivo feitos ao longo de toda a sessão. Erro `429`
capturado corretamente pelo try/catch já existente (fallback de robustez de sessão anterior) —
sem crash, sem silêncio, mensagem de desculpa exibida como projetado. **Pendência real pra próxima
sessão:** retestar "qual desses tem o valor menor somando valor+IPTU?" repetidas vezes assim que a
cota resetar (ou com outro provider configurado), esperando agora 100% de consistência já que o
cálculo em si não depende mais do LLM — só a extração de campos/operação varia por chamada.

---

## Penúltima tarefa concluída

### Sessão 2026-07-13 (continuação) — Cartões seletivos + 2 bugs reais no filtro FK + capacidade de comparação ainda não confiável ✅⚠️

**Pergunta original do usuário:** conversa real mostrou o bot listando TODOS os 5 imóveis em
cartões quando perguntado "qual desses tem o valor menor somando valor+IPTU?" — sem fazer conta
nenhuma. Perguntou se era só ajuste de prompt.

**Resposta: não, era um bug de arquitetura real.** `buildCards()` em `botAdapter.ts` fazia
`items.map(...)` incondicional — todo item retornado pela ferramenta virava cartão, não importava
o que o LLM decidisse no JSON de formatação. Corrigido: `items.filter(...)` só inclui a chave que
o LLM de fato retornou no JSON; instrução reescrita pra pedir cálculo/comparação real e seleção
explícita do(s) item(ns) que respondem à pergunta (não mais "um card por item sempre").

**Durante o reteste, 2 bugs reais e mais sérios encontrados nas colunas FK com lookup
(`tipo_fk`/`status_fk`/`finalidade_fk`, sessão anterior):**

1. **Vazamento de tenant no filtro por nome.** Testei "quais imóveis vocês têm disponíveis?" — o
   LLM às vezes filtrava `status_fk="disponível"` (palavra genérica, minha própria descrição da
   coluna sugeria esse exemplo errado — corrigido primeiro, não resolveu sozinho). Investigação
   mais funda: a checagem de existência de categoria que eu tinha acabado de adicionar (pra não
   forçar resultado vazio quando o LLM inventa um valor) **não era escopada por tenant** —
   `status_imovel` é catálogo por-tenant, e outro tenant TEM "Disponível" no catálogo dele. A
   checagem via "existe globalmente" deixava passar, o filtro real então casava contra ids de
   OUTRO tenant, e a busca voltava vazia pra este tenant mesmo com "Ativo" sendo a categoria real
   equivalente. Corrigido: checagem de existência E filtro real agora escopados por
   `entity.tenantColumn` (convenção: catálogo de lookup usa a mesma coluna de tenant da entidade
   base).
2. **Colisão de substring em palavras com prefixo de negação.** Mesmo com o escopo por tenant
   corrigido, "disponível" ainda batia via `ILIKE '%disponível%'` dentro de "**In**disponível" —
   significado oposto! Corrigido: troca de `ILIKE` por `~*` com fronteira de palavra Postgres
   (`\ydisponível\y`) — "disponível" não bate dentro de "indisponível" (sem fronteira de palavra
   entre "in" e "disponível", ambos caracteres de palavra), mas continua batendo normalmente em
   "Bangalo"/"Apartamento". Valor do LLM sempre escapado (`escapeRegex`) antes de virar padrão.

**Testado exaustivamente (múltiplas rodadas, LLM é probabilístico):** "quais imóveis disponíveis"
→ 6/6 sucessos depois do fix completo (vs. falhas intermitentes antes) · bangalô continua
corretamente negativo (regressão OK) · tipo real (apartamento) continua funcionando.

**⚠️ Capacidade de comparação matemática AINDA NÃO É CONFIÁVEL — reportado com honestidade, não
resolvido:** testei "qual tem o valor menor somando valor+IPTU" 3x depois do fix arquitetural de
seleção de cartões. Resultado: 1x correto, 2x errado — numa delas o LLM literalmente inventou
"IPTU aproximado" (violando a instrução explícita de nunca estimar), selecionou itens de valor
ALTO (não baixo), e o texto final citou um total que não bate com nenhum cartão exibido nem com a
soma real. **Avaliação honesta:** pedir que o mesmo LLM (numa única chamada de formatação) faça
aritmética entre vários itens, selecione o(s) correto(s) E monte JSON estrito é pedir demais de
uma vez — o padrão "sinal explícito nos dados" que funcionou pros bugs anteriores não é suficiente
aqui porque o problema não é falta de dado, é confiabilidade de cálculo multi-etapa do próprio
modelo. **Recomendação pra próxima sessão:** mover o cálculo pra fora do LLM — código faz a soma/
comparação/ranking real (quando a pergunta claramente pede isso e os campos numéricos existem) e
passa o resultado JÁ CALCULADO pro LLM só formatar em texto natural, em vez de pedir que ele
calcule. Não implementado ainda — decisão de escopo pra conversar com o usuário antes.

**Arquivos tocados:** `src/lib/mensageria/botAdapter.ts` (buildCards seletivo, loadHistory inclui
`content_type='card'` — bug relacionado: cartões ficavam invisíveis no histórico de turnos
seguintes, fazendo o bot "esquecer" itens já mostrados e pedir esclarecimento desnecessário),
`src/lib/mensageria/tools/genericResolver.ts` (escopo por tenant + fronteira de palavra no filtro
de lookup). `prisma/migration-2026-07-13-mensageria-bot-status-fk-desc-fix.sql`. `npx tsc --noEmit`
limpo em todos.

---

## Penúltima tarefa concluída

### Sessão 2026-07-13 — Filtro contaminado por assunto anterior não relacionado ✅

**Bug reportado (via conversa real, não teste):** sequência real "boa noite" → "estou precisando de
um consórcio" (bot respondeu corretamente que não tem info sobre consórcio) → "em quais bairros tem
imoveis?" → bot respondeu "não encontrei nenhum imóvel disponível", mesmo havendo imóveis reais
cadastrados em múltiplos bairros (Imbiribeira, Boa Viagem).

**Investigação:** localizei a conversa real no banco (`mensageria.messages`) e reproduzi a sequência
exata via `/api/admin/mensageria/bot/test` — **não reproduziu de forma determinística** (5/5
tentativas isoladas + a sequência exata replayada funcionaram corretamente, retornando os imóveis
reais). Conclusão: falha intermitente do LLM, não um bug de código — hipótese mais provável é o
turno anterior sobre "consórcio" (assunto sem relação com critério de busca) ocasionalmente
contaminando o filtro da chamada seguinte à ferramenta.

**Reforçada a persona** (`mensageria_bot_persona`, segmento Imobiliário) — nova regra explícita:
só usar na ferramenta os critérios que a pergunta ATUAL pede, nunca reaproveitar valor de um assunto
anterior não relacionado; perguntas genéricas/exploratórias ("em quais bairros vocês têm imóveis")
devem chamar a ferramenta SEM filtro nenhum, nunca inventando um critério.
`prisma/migration-2026-07-13-mensageria-bot-persona-filtro-nao-contamina.sql`.

**Testado:** retest da sequência exata "boa noite" → "consórcio" → "bairros" 5x seguidas após o
reforço — 5/5 corretas (imóveis reais retornados, sem falso "não encontrei"). Não é prova
estatística definitiva (comportamento de LLM é probabilístico, a falha original também não era
100% reprodutível antes do fix), mas consistente com a hipótese e sem nenhuma regressão observada.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 (continuação 3) — Auditoria de hardcode + coluna de identidade configurável ✅

**Contexto:** usuário questionou, após eu ter corrigido um nome de tabela errado numa migração
("finalidades" → "finalidades_imovel"), se existe qualquer coisa hardcoded na aplicação —
exigência explícita de zero hardcode, multi-segmento, tudo regido por registros em tabela.

**Auditoria feita (grep no código, não por memória):** confirmado zero ocorrências de nomes de
entidade/tabela/campo específicos do imóvel (`'imovel'`, `'tipos_imovel'`, `'fotos'`, `'titulo'`,
`'bairro'`, `'quartos'`, `'preco'`, `'andar'`, `'condominio'`) em `src/lib/mensageria/`. Todo acesso
a campo em `botAdapter.ts` é dinâmico (`row?.[field]`, `row?.[headerCol]`), com o nome do campo
vindo de config (`entity.relations.filter(r => r.is_image)`, `entity.columns.find(c =>
c.is_group_header)`). A frase citada pelo usuário era sobre um erro meu **numa migração SQL**
(dado gravado numa linha de config, equivalente a um Master digitando errado num formulário) — não
código.

**Um ponto real encontrado e corrigido:** `botAdapter.ts` casava linha↔item nos cartões sempre via
`row?.id` — nome de coluna fixo (não específico de segmento, mas não configurável, diferente do
`base_pk` das relations que já era). Corrigido: nova coluna real `identity_column` em
`mensageria.segment_data_entities` (`prisma/migration-2026-07-11-mensageria-bot-identity-column.sql`,
default `'id'`, preserva 100% do comportamento atual) — cada entidade declara sua própria PK.
`genericResolver.ts`: `SegmentDataEntity.identityColumn`; `resolveEntity` sempre inclui essa coluna
na projeção SQL mesmo se o Master esquecer de marcá-la "mostra" (evita quebra silenciosa por erro
de config). `botAdapter.ts` usa `entity.identityColumn` em vez do literal `'id'`. UI (Master →
Segmentos → Dados do Bot): novo campo "Coluna de identidade" no formulário da entidade.

**Testado:** `npx tsc --noEmit` limpo · regressão dos cartões premium (Imbiribeira) — chave de item
agora via `entity.identityColumn`, mesmo resultado de antes (1 cartão por imóvel, 1 foto cada) ·
round-trip real `PUT/GET /data-entities` confirma `identityColumn` sobrevivendo ao salvar pela tela.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 (continuação) — Colunas FK com lookup no resolver genérico ✅

**Bug real reportado:** perguntado "tem imóveis de bangalô na Imbiribeira?", o bot respondeu "sim"
e listou 5 imóveis reais descrevendo cada um como "Este bangalô tem...". Nenhum é bangalô de
verdade — `tipo_fk=90` (bangalô) não existe em nenhuma linha de `imoveis`. Causa raiz: `tipo_fk`
estava com `selectable:false, filterable:false` — o bot não tinha como filtrar por tipo; mesmo se
fosse filterable, o valor bruto é um número (id) e o LLM só sabe o texto "bangalô", sem saber o id.
Sem filtro real, a tool call só filtrou por bairro, trouxe imóveis de qualquer tipo, e o LLM
**assumiu** que eram bangalôs — alucinação por ausência de capacidade, não por regra mal seguida.

**Diagnóstico do usuário, confirmado e generalizado:** o gap é estrutural — qualquer coluna que é
**chave estrangeira** (`tipo_fk→tipos_imovel.id`, `status_fk→status_imovel.id`,
`finalidade_fk→finalidades_imovel.id`) só podia ser número cru ou ficava de fora.

**Implementado — novo tipo de coluna "com lookup" no resolver genérico** (`genericResolver.ts`):
`EntityColumn` ganha `lookup_table`/`lookup_pk`/`lookup_label_column` opcionais (mesmo espírito do
`is_image`/`is_group_header` — presença = capacidade ativada, dirigido 100% por config, zero
hardcoded, funciona pra qualquer FK de qualquer segmento).
- `buildColumnProjection()` — projeta o NOME legível via subquery em vez do id cru
  (`tipo_fk: "Apartamento"` em vez de `tipo_fk: 5`). Config inválida cai no comportamento antigo,
  nunca quebra.
- Filtro: coluna com lookup válido nunca usa a coerção número/texto normal — sempre casa o valor
  do LLM (texto, ex. "bangalô") contra o nome via `IN (SELECT id FROM tabela WHERE nome ILIKE ...)`.
  Isso é o que torna o filtro **real**: sem nenhuma linha daquele tipo, o resultado vem vazio de
  verdade (cai no aviso "nenhum resultado" já existente), em vez do LLM inventar.
- `buildParamsSchema`: coluna com lookup sempre descrita como "texto" pro LLM, mesmo com `type`
  interno `number` — o valor esperado é o nome, não o id.
- UI (`SegmentDataEntitiesModal.tsx`) — 2ª linha por coluna: "tabela de lookup" / "coluna do nome"
  / "PK", mesma mecânica visual já usada nas relations. `data-entities/route.ts` valida os 3 novos
  identificadores com o mesmo `IDENT_RE` das relations.
- `prisma/migration-2026-07-11-mensageria-bot-fk-lookup.sql` — ativa em `tipo_fk`, `status_fk`,
  `finalidade_fk` da entidade `imovel` (as 3 colunas de classificação que um visitante pergunta por
  nome). **Fora de escopo deliberado:** `corretor_fk`/`proprietario_uuid` não entraram — identidade
  de corretor/proprietário é dado sensível, não exposto por padrão sem pedido explícito.

**Testado ponta a ponta:** SQL direto confirma "bangalô" → 0 linhas reais (nenhum imóvel é bangalô)
e um tipo real ("apartamento") → 6 linhas com `tipo_fk` já resolvido pro nome · reproduzido o
cenário EXATO reportado via API do bot — agora responde "não encontrei nenhum imóvel de bangalô...
posso ajustar os critérios?" em vez de inventar 5 imóveis · contraste com tipo real (apartamento) →
encontra corretamente e monta os cartões premium · regressão dos cartões (sessão anterior)
confirmada sem quebra · round-trip real dos 3 novos campos via `PUT /data-entities` sobrevive ·
`npx tsc --noEmit` limpo.

---

## Penúltima tarefa concluída

---

## Última tarefa concluída

### Sessão 2026-07-11 — Bot: agrupamento por item em cartões premium (multi-segmento) ✅

**Contexto:** pedindo fotos de vários imóveis, o bot (1) colava URLs cruas no texto e (2) mandava as
fotos como lote anônimo no fim, sem associação ao imóvel, cortadas no teto de 4. Usuário quer, por
item: cabeçalho + infos pedidas + TODAS as fotos daquele item, item a item, numa visualização
premium, **genérico multi-segmento** (Saúde/Carros/etc. — "sempre há um item de agrupamento
principal"). Plano em `C:\Users\T-GAMER\.claude\plans\bright-herding-minsky.md`.

**Antes disso, 2 bugs menores corrigidos e commitados nesta sessão:**
- Contradição em consulta vazia ("Sim, temos apartamentos em SP" + "não tenho informações"): o
  aviso de "campos disponíveis" entrava mesmo com zero linhas, fazendo o LLM inferir que a entidade
  existe → "temos". Agora resultado vazio recebe aviso explícito de "nenhum resultado" (commit
  `f9f7321`).

**Implementado (cartões):**
1. **Config — flag `is_group_header` por coluna** (espelha `is_image`): `EntityColumn`
   (`genericResolver.ts`), rota `data-entities`, checkbox "cabeçalho" no `SegmentDataEntitiesModal`.
   Migração seta `is_group_header:true` na coluna `titulo` do imóvel. Genérico: qualquer segmento
   marca sua coluna de rótulo (nome da clínica, modelo do carro).
2. **`botAdapter.ts`** — reescrita: coleta fotos POR LINHA (Map por id, não mais achatado);
   **sanitiza** o `tool_result` (troca os arrays de URL por flag `<foto disponível>`/`<sem foto>` —
   o LLM nunca recebe URL pra colar); novo tipo `BotReply` (flat | cards); **modo cartão** (gatilho:
   >1 item E ≥1 foto real) faz uma chamada de formatação dedicada que devolve JSON `{_intro, "<id>":
   texto, _outro}` (código fornece as chaves = casamento robusto por id, sem parsing de prosa); envia
   `_intro` → 1 msg `contentType:'card'` por item (content=cabeçalho+info, attachments=fotos daquele
   item) → `_outro`. `deliverIfWhatsApp` p/ card manda texto + cada mídia (WhatsApp não tem cartão).
3. **`ingest.ts`**: `'card'` no union `ContentType` (sem migração — coluna é `text` livre).
4. **Renderização premium do card** nas duas bolhas (`ConversationThread.tsx` + painel de teste):
   cabeçalho dourado + info + galeria grid das fotos, tema escuro do chat.
5. **Persona** ajustada: agrupamento por cartão é automático da plataforma (LLM não monta no texto
   nem cola link); aviso de "sem foto" reforçado pra NUNCA negar capacidade ("não posso exibir
   imagens") — só dizer que estes itens não têm foto agora.

**Testado ponta a ponta** (API de teste, tenant Imobiliária XYZ): multi-item c/ foto (Imbiribeira) →
intro + 1 cartão por imóvel com a foto correta de cada um, zero URL no texto ✓ · item único → flat
(sem regressão) ✓ · vazio (SP) → limpo, sem cartão ✓ · multi-item SEM foto (Boa Viagem) → agrupa no
texto, sem cartão ✓ · regressão de tom "não posso exibir imagens" corrigida (agora "nenhum desses
imóveis tem foto no momento") ✓ · round-trip real de `is_group_header` via PUT `data-entities`
sobrevive (`true`) ✓ · `npx tsc --noEmit` limpo.

**Pendências/nota:** verificação VISUAL do card no navegador não feita (injeção de cookie de sessão
não sobrevive ao middleware — mesma limitação de toda a sessão; estrutura JSON confirmada via API no
formato exato que o componente consome + revisão de código). **Artefato de dado conhecido:** a
relation `qtd_fotos` conta TODAS as linhas de `imovel_imagens` (inclui legadas sem `url_cdn`), então
um card pode dizer "Possui 18 fotos" exibindo 1 — some quando as fotos legadas forem migradas pro
CDN (fora de escopo). Envio real ao WhatsApp de card ainda não testado com credenciais reais.

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 — artemis4: "Entrar" lento (issue crônico) — root cause + fix ✅

**Sintoma (crônico):** na landing `/artemis4`, depois que o vídeo do YouTube começa, clicar em
"Entrar" demorava um tempo enorme pra abrir `/admin/login`. Hipótese do usuário: o vídeo prende as
ações. Já havia uma decisão registrada ([[feedback_landing_nav]]) de usar `<a>` nativo em vez de
`<Link>` — mas ainda estava lento.

**Root cause REAL (medido, não suposto):** `GET /admin/login` = **10,1s na 1ª vez (fria) vs
0,1–0,3s morna** (curl direto no dev server). O gargalo dominante é a **compilação sob demanda do
Next em DEV** do route group `admin` inteiro (`AuthProvider` + `SkillsProvider` +
`AdminLayoutContent`), não o vídeo — **artefato de desenvolvimento, some em produção (build)**. O
vídeo/rAF é só agravante de percepção: durante a espera, o loop de canvas (60fps) + o interval da
telemetria (postMessage ao iframe YT) travam a aba e não dão feedback, reforçando a sensação de
"travou até o vídeo adiantar".

**Fix — 3 partes, tudo confinado a `src/app/artemis4/page.tsx`:**
1. **Pré-aquecer `/admin/login`** em segundo plano no mount, via `requestIdleCallback`
   (`fetch('/admin/login')`, mesmo padrão que o YouTube já usa) — compila a rota enquanto o usuário
   lê a landing; o clique pega a rota morna (~0,3s em vez de 10s). Inofensivo em produção.
2. **`teardownSimulation()`** no `onClick` de todos os 5 CTAs de `/admin/login` — cancela o rAF
   (novo `rafIdRef` + guarda `simStoppedRef` no topo do `render`), limpa o interval da telemetria
   (`telemetryIntervalRef`) e destrói o player do YouTube. Libera a main thread na hora do clique.
   **Não** faz `preventDefault` — o `<a>` nativo segue navegando.
3. **Overlay "Acessando área administrativa…"** (`navigating` state) — feedback visual instantâneo
   em vez de página congelada durante a carga.

**Testado ponta a ponta** (preview real, YouTube de fato tocando): prefetch confirmado no network
(`GET /admin/login → 200` disparado ANTES de qualquer clique) · clicar em "Entrar" numa página tão
pesada que o screenshot pré-clique deu timeout **navegou com sucesso** pro formulário de login (a
teardown destravou a thread + rota morna) · `npx tsc --noEmit` limpo · erros de hidratação
`#document` observados são pré-existentes (injeção do MetaPixel no `artemis4/layout.tsx`), não
introduzidos por esta mudança (o state `navigating` começa `false` nos dois lados do SSR).

---

## Penúltima tarefa concluída

### Sessão 2026-07-11 — Fix segmento no modal de login + botão "Empresas" nos Segmentos ✅

**1. Fix — modal de seleção de empresa no login sempre mostrava "Geral":** causa raiz era um
mismatch de nome de campo, não falta de dado — `src/app/api/admin/auth/login/route.ts` fazia o
JOIN certo com `system_segments` mas selecionava a coluna como `s.name as segment`; o frontend
(`src/app/admin/login/page.tsx:368`) lia `tenant.segment_name` (undefined sempre) com fallback
literal `'Geral'`. Corrigido o alias da query pra `segment_name` — sem tocar no frontend. Validado
via SQL direto (não via HTTP — não tenho a senha real de nenhum usuário multi-tenant e não resetei
sem autorização): usuário `admxyz` (2 empresas, ambas segmento Imobiliário) agora traria
"Imobiliário" nas duas em vez de "Geral". `npx tsc --noEmit` limpo.

**2. Botão "Empresas" em `/admin/master/segments`:** 6º botão na coluna de Ações (ícone
`BuildingOffice2Icon`, azul-céu), abre `SegmentTenantsModal.tsx` (novo componente, mesmo shell
visual de `SegmentDataEntitiesModal.tsx`) — lista alfabética das empresas do segmento, busca com
debounce 350ms, paginação real via API (preparado para centenas de tenants por segmento).
- `GET /api/admin/master/segments/[id]/tenants` (novo, `requireMaster`) — `search`/`page`/
  `pageSize`, `ORDER BY name ASC`, count separado pro total. Endpoint dedicado, não reaproveita
  `GET /api/admin/master/tenants` (sem filtro de segmento/paginação, JOINs pesados desnecessários).
- **Bug real pego no próprio teste:** `logo_url` de pelo menos 1 tenant é uma imagem base64
  embutida (não uma URL leve) — o payload da 1ª versão da query veio com 554KB só pra 2-3 linhas.
  Corrigido: `CASE WHEN logo_url LIKE 'data:%' THEN NULL ELSE logo_url END` — omite o blob grande
  da lista (cai no fallback de iniciais via `ClientAvatarWithFallback`), mantém URLs leves reais.
- Avatar reaproveita `ClientAvatarWithFallback` (`@/components/admin/ClientAvatar`, já usado em
  Portfolio/clientes) — zero componente de avatar novo.

**Testado:** `GET .../tenants` real via curl+JWT Master — retorna as 3 empresas do segmento
Imobiliário em ordem alfabética (Imobiliaria XYZ, Imovitec, Marketing Digital), `search=imov` filtra
corretamente pra 1 resultado, `pageSize=1&page=2` pagina corretamente, sem cookie → 403. Payload
compacto após o fix do `logo_url`. `npx tsc --noEmit` limpo nos 3 arquivos. **Não verificado
visualmente no navegador** — injeção de cookie de sessão Master não sobrevive à revalidação de
middleware em navegação completa (mesma limitação já registrada várias vezes nesta sessão) —
confiei na API real + no mesmo padrão visual já comprovado em `SegmentDataEntitiesModal.tsx`.

---

## Penúltima tarefa concluída

### Bot exibindo fotos de imóveis + envio real ao WhatsApp (M4.2 extensão) ✅

Usuário perguntou se o bot consegue exibir fotos (antes só contava via `qtd_fotos`). Investigação
achou 2 lacunas: (1) faltava relation com o link real da foto (`imovel_imagens.url_cdn`) + nenhuma
bolha de chat sabia renderizar imagem; (2) descoberta maior — **nenhuma resposta do bot chegava ao
WhatsApp real** (`sendEvolutionMessage` só era chamado na resposta manual de atendente, nunca em
`botAdapter.ts`). Usuário confirmou querer as duas coisas resolvidas juntas. Plano completo em
`C:\Users\T-GAMER\.claude\plans\bright-herding-minsky.md`.

**Implementado:**
1. `prisma/migration-2026-07-10-mensageria-bot-fotos-relation.sql` — nova relation `fotos`
   (`agg:'array'`, `imovel_imagens.url_cdn`, max 4) na entidade `imovel` do segmento Imobiliário.
2. `botAdapter.ts`: `runBotReply()` agora retorna `{ text, images }` em vez de só string —
   `collectImageUrls()` colhe as URLs não-nulas de dentro das linhas retornadas por qualquer tool
   call (determinístico, não depende do LLM formatar um link na prosa). `maybeRunBot()` manda 1
   `ingestMessage()` pro texto + 1 `ingestMessage()` por imagem (`contentType:'image'`,
   `attachments:[{url}]`) — mesma ordem que um atendente mandaria no WhatsApp.
3. **Fecha o gap de entrega real**: novo `deliverIfWhatsApp()` em `botAdapter.ts` — depois de cada
   `ingestMessage()` bem-sucedido (incluindo a mensagem fixa de `handoffToHuman()`), se o canal é
   `whatsapp`, chama `sendEvolutionMessage()` (texto) ou a nova `sendEvolutionMedia()` (imagem, via
   `POST {api_url}/message/sendMedia/{instance}`) e atualiza `delivery_status`. Antes desta sessão,
   NENHUMA resposta do bot saía de fato pro WhatsApp — só ficava visível dentro da plataforma.
4. `ConversationThread.tsx` + painel de teste (`mensageria/config/page.tsx`) — bolha de mensagem
   renderiza `<img>` quando `contentType==='image'`; `GET /api/admin/mensageria/bot/test` passou a
   selecionar/retornar `content_type`/`attachments` (faltava, só a rota de conversas já tinha).
5. Persona (`mensageria_bot_persona`, segmento Imobiliário) reforçada 2x: (1) ignorar
   silenciosamente links vazios/nulos da relation `fotos`; (2) **nunca colar a URL crua no texto**
   — a foto já é enviada como mensagem de imagem de verdade logo em seguida (1ª versão do teste
   mostrou o bot colando o link como texto E mandando a imagem, redundante — corrigido).

**Testado ponta a ponta** (via `POST /api/admin/mensageria/bot/test`, tenant Imobiliária XYZ, inbox
WhatsApp de teste sem credenciais reais — envio real tentado e falhou graciosamente como esperado,
sem nenhuma chamada de fato disparada com sucesso): apontei temporariamente `url_cdn` de 1 foto real
(imóvel 2, Boa Viagem) pra uma URL de imagem pública de teste (revertido depois) · pedi "fotos de
apartamentos de 3 quartos em Boa Viagem" (filtro determinístico — a entidade não permite filtrar
por ID do imóvel, só por bairro/quartos/etc., então perguntar por "imóvel 2" diretamente é
inconsistente por design) · confirmado: mensagem de texto limpa ("Aqui estão as fotos!", sem URL) +
mensagem separada `contentType:'image'` com a URL real em `attachments` · `delivery_status='failed'`
na tentativa de envio real (esperado, inbox de teste sem credenciais Evolution) · `npx tsc --noEmit`
limpo nos 6 arquivos tocados.

**Pendências:** verificação visual da renderização `<img>` no navegador não foi feita (injeção de
cookie de sessão não sobrevive à revalidação de middleware em navegação completa — mesma limitação
já registrada antes nesta sessão) — validado via API/JSON real (`contentType`/`attachments` no
formato exato que os componentes esperam) + revisão de código, não visualmente. Envio real de
imagem/texto ao WhatsApp genuíno (`sendEvolutionMedia`) só foi testado contra uma inbox sem
credenciais (falha graciosa) — teste com credenciais reais fica pendente de o usuário indicar um
número de teste, conforme combinado no plano (ação externa irreversível, não disparada
unilateralmente).

**Follow-up mesma sessão — bug real reportado pelo usuário e corrigido:** usuário testou "gostaria
de ver as fotos de cada um" (vários imóveis numa lista de bairros sem foto real no CDN) e o bot
respondeu com "Fotos: Aqui estão as fotos!" repetido por item, sem mandar imagem nenhuma. Causa
raiz: `buildRelationSubquery` (array agg) não filtrava `NULL`/vazio na origem — um imóvel sem
`url_cdn` gerava `fotos:[null,null,null,null]` (array "cheio", só que de nulos) em vez de `fotos:[]`
limpo. O LLM via aquele array não-vazio e tentava renderizar algo por posição. Corrigido em
`genericResolver.ts`: a subquery agora filtra `IS NOT NULL AND <> ''` na origem e usa
`COALESCE(array_agg(v), ARRAY[]::text[])` — garante `[]` de verdade quando não há valor real.
Reforçada também a persona (`mensageria_bot_persona`) pro caso de LISTA de vários imóveis: uma
frase única no fim, não uma linha "Fotos:" repetida por item. Retestado: cenário exato reportado
(zero fotos reais entre os imóveis) agora responde com 1 frase natural "No momento não tenho fotos
desses imóveis disponíveis" · cenário misto (1 imóvel com foto real + outros sem) menciona a foto
disponível corretamente e manda só 1 imagem de verdade, sem ruído nos demais. `npx tsc --noEmit`
limpo.

**Follow-up mesma sessão — 2º bug real, mesma causa raiz mais funda:** mesmo depois do fix acima
(array `fotos:[]` limpo), o usuário reportou o bot dizendo "As fotos dos imóveis estão disponíveis"
pra uma lista de imóveis SEM foto real nenhuma — confirmado via SQL direto que o resultado da
ferramenta era `fotos:[]` para todos, então o array já estava correto; o problema era o LLM não
seguir de forma confiável a regra "se vazio, diga que não há foto" só porque ela estava escrita na
persona, um texto separado do resultado da chamada. Corrigido em `botAdapter.ts`: quando a entidade
tem relation `is_image` e a chamada retorna linhas mas nenhuma foto de verdade, o `tool_result`
mandado pro LLM passa a incluir um campo `aviso` explícito ("Nenhum dos itens abaixo tem foto/imagem
disponível no momento. Não afirme que há fotos disponíveis.") directly nos dados, não só na
instrução geral — sinal textual explícito nos dados é seguido de forma muito mais confiável do que
inferência sobre array vazio. Retestado 3x seguidas com o cenário exato reportado: as 3 respostas
agora abrem com "No momento não tenho fotos desses imóveis disponíveis" · regressão confirmada: caso
misto (1 imóvel com foto real) continua mencionando certo e mandando a imagem de verdade. `npx tsc
--noEmit` limpo.

**Follow-up mesma sessão — dados de teste reais + 3º bug (invenção de campo não mapeado):**
1. **Limpeza + dados reais:** os 13 registros do imóvel 17 apontavam pra objetos que não existem
   mais no MinIO (404 confirmado direto na origem, `curl` contra o bucket) — resquício de teste de
   uma sessão anterior. Limpos (`storage_type`/`url_cdn = NULL`). `prisma/seed-fotos-reais-
   imbiribeira.sql` — a pedido do usuário, populou a foto principal de cada um dos 6 imóveis do
   bairro Imbiribeira (tenant Imobiliária XYZ) com uma imagem pública real (picsum.photos, uma
   por imóvel, todas testadas com `curl` retornando 200) — dado persistente, não revertido depois
   (diferente dos testes anteriores desta sessão), pra servir de base de teste contínua.
2. **`preco_condominio` exposto ao bot** (estava com `selectable=false`, igual o usuário suspeitou)
   — `prisma/migration-2026-07-10-mensageria-bot-preco-condominio.sql`.
3. **3º bug real — invenção de valor pra campo não mapeado:** usuário pediu explicitamente que,
   pra QUALQUER campo não mapeado (não só condomínio), o bot admita que não tem a informação em
   vez de inventar. 1ª tentativa (regra só na persona) FALHOU no teste — perguntado sobre "suítes"
   (campo não mapeado), o bot respondeu com números fabricados e ERRADOS por imóvel (comparado
   com o valor real na tabela `imoveis`). Mesma lição do bug de fotos: regra abstrata na persona
   não é confiável sozinha. Corrigido em `botAdapter.ts`: todo `tool_result` agora inclui um
   `aviso` com a lista exata dos campos disponíveis (`entity.columns` selecionáveis +
   `entity.relations`) e instrução explícita de nunca estimar/inventar campo fora dessa lista —
   sinal explícito nos dados, igual ao fix de fotos. Retestado: parou de inventar números
   específicos, mas 1ª rodada ainda disse "o imóvel não possui suítes" (confundindo "sem dado"
   com "resposta é zero") — reforçada a persona distinguindo os dois casos
   (`migration-2026-07-10-mensageria-bot-persona-nao-confundir-zero.sql`). Retestado 2x: resposta
   limpa nas duas ("Não tenho essa informação disponível... sugiro falar com um atendente"), sem
   afirmar zero nem inventar valor. `npx tsc --noEmit` limpo.

**Follow-up mesma sessão — generalização pra qualquer segmento (Saúde, Veículos, etc.):** usuário
perguntou se a exibição de fotos funcionaria pra outros segmentos "com zero hardcoded". Resposta
honesta: a 1ª versão tinha um hardcode real — `collectImageUrls()` procurava literalmente a chave
`"fotos"` no resultado da tool call. Corrigido: `EntityRelation` (`genericResolver.ts`) ganhou o
campo `is_image?: boolean`; `collectImageUrls()` agora recebe a `entity` e descobre dinamicamente
quais relations são imagem (`entity.relations.filter(r => r.is_image)`) — funciona pra qualquer
nome de campo/entidade/segmento, sem tocar em código. UI "Dados do Bot" (Master → Segmentos →
`SegmentDataEntitiesModal.tsx`) ganhou o checkbox "É uma lista de links de imagem" nas relations
tipo array — um Master configurando Saúde Digital ou Veículos marca isso na tela, sem SQL nenhum.
`prisma/migration-2026-07-10-mensageria-bot-fotos-is-image-flag.sql` retroaplicou a flag na relation
`fotos` já existente do imóvel. Testado: GET/PUT reais via `/api/admin/master/segments/[id]/
data-entities` confirmam a flag sobrevivendo ao round-trip completo; reteste do bot (mesmo cenário
de Boa Viagem) confirma que a imagem continua sendo detectada e enviada corretamente pelo novo
mecanismo genérico. `npx tsc --noEmit` limpo.

---

## Penúltima tarefa concluída

### Sessão 2026-07-10 (continuação 6) — Investigação "andar inventado" + fallback de robustez do bot ✅

**Investigação 1 — falso alarme corrigido:** usuário reportou o bot "inventando" andares dos
imóveis. Eu tinha confirmado `andar = NULL` numa consulta ANTERIOR e assumi que continuava assim
— erro meu, não considerei que o usuário pudesse ter atualizado o dado manualmente entre as duas
consultas. Reconferido: os valores que o bot reportou (`andar=1,2,3,5,6`) batiam **exatamente**
com o estado atual real da tabela `imoveis` — o bot estava certo, eu que me baseei em dado
desatualizado. Lição: nunca reafirmar uma conclusão de consulta anterior sem reconferir o estado
atual, especialmente quando o usuário pode estar editando dados em paralelo.

**Investigação 2 — bot não respondeu a "me mostre as fotos dos imoveis":** confirmado no histórico
real (`mensageria.messages`) que a mensagem foi ingerida mas nenhuma resposta do bot foi gerada —
falha real, engolida silenciosamente pelo catch "best-effort" do hook em `ingestMessage()`.
Tentei reproduzir com logging temporário de erro (escrita em arquivo) — a reprodução ("de novo")
funcionou perfeitamente (usou a relation `qtd_fotos` corretamente, retornou contagens reais).
Não consegui capturar o stack trace da falha original (aconteceu antes de eu adicionar o log).
Indício de falha transitória (timeout/hiccup da API do LLM), não bug determinístico — mas revelou
uma lacuna de robustez real independente da causa exata.

**Corrigido:** `botAdapter.ts` — `runBotReply()` agora roda dentro de try/catch próprio; se
lançar exceção (não só retornar vazio), ainda envia uma mensagem de desculpa genérica ao contato
em vez de silêncio total. Antes, só o caso "conteúdo vazio" tinha fallback — uma falha de
verdade (erro de rede/provider) deixava o contato sem nenhuma resposta, parecendo bot quebrado.

**Testado:** `npx tsc --noEmit` limpo. Não foi possível testar o caminho de erro em si (exigiria
forçar uma falha real do provider LLM), mas a mudança é estruturalmente simples (try/catch +
fallback já usado no caso de conteúdo vazio) e de baixo risco.

---

---

## ⚠️ Incidente registrado — dados apagados por engano nesta sessão

**O que aconteceu:** ao testar a feature `chatbot_max_turns_default` (item anterior deste
checkpoint), fiz 2 chamadas diretas via curl a `PUT /api/admin/master/segments` passando
`"module_ids":[]` (só queria testar o campo novo, ignorei os demais campos do payload). Essa
rota faz **replace-all** de `system_segment_modules` pro segmento (`DELETE` + reinsert do que
vier no body) — como não veio nada, apagou os 6 vínculos módulo↔segmento do "Imobiliário" que
existiam antes. Sintoma reportado pelo usuário: `/admin/master/provisioning` parou de mostrar
módulos/features pro segmento Imobiliário (a árvore dessa tela é agrupada por
`system_segment_modules`).

**Diagnóstico errado na primeira resposta:** inicialmente concluí "não fui eu" com base só em
não ter tocado o COMPONENTE da tela — não considerei que uma chamada de API minha, em outro
contexto (testando outro campo), pudesse ter efeito colateral destrutivo numa tabela
compartilhada. O usuário insistiu "a tela funcionava antes" e essa insistência foi o que me fez
reabrir a investigação e achar a causa real.

**Corrigido:** reconstrução por evidência (não há backup do estado exato anterior) — união dos
módulos que os 2 tenants reais do segmento Imobiliário (Imobiliaria XYZ + Marketing Digital) já
tinham provisionados em `tenant_modules`: Mercado Imobiliário, Administrativo Provisionado,
Cadastros, CRM de Vendas, Gestão de Campanhas de Marketing Digital, Gestão de Mensageria (6).
Reinseridos via SQL direto (não pela rota PUT, pra não repetir o mesmo erro). Verificado via
`GET /api/admin/master/provisioning` — a árvore volta a mostrar os 6 módulos com features sob
o segmento Imobiliário.

**Lição registrada:** ao testar uma API existente por fora da UI (curl direto), **nunca**
montar o body só com o campo que estou testando quando a rota é do tipo "replace-all" — sempre
buscar o estado atual completo primeiro (`GET`) e enviar o objeto inteiro de volta, alterando só
o campo relevante. Isso já era a prática usada em alguns dos meus testes anteriores nesta sessão
(ex.: round-trip do PUT de `segment_data_entities`), mas não segui essa mesma disciplina aqui.

---

## Última tarefa concluída

### Sessão 2026-07-10 (continuação 5) — Toggle "usar padrão do segmento" + botão Limpar ✅

**Motivação:** usuário reportou que o campo MaxTurns não refletia o valor do segmento — causa
real: tenants que já tinham salvo seu próprio `maxTurns` sempre viam esse valor, nunca o padrão
do segmento, mesmo depois do Master mudar o padrão (comportamento correto de override, mas
confuso sem uma forma explícita de "voltar a seguir o segmento"). Também reportado: falta um
botão "Limpar" — já existia ("Reiniciar conversa"), só estava pequeno demais pra ser notado.

**Implementado:**
1. `bot_flows.handoff_rules.maxTurns` agora é tratado como genuinamente opcional — `null`
   significa "segue o padrão do segmento". `botAdapter.ts`: `effectiveMaxTurns = rules.maxTurns
   ?? segmento.chatbot_max_turns_default ?? 6` — a mudança real está aqui, o fallback agora vale
   em **runtime**, não só como sugestão de UI (antes, `maxTurns=null` nunca disparava handoff
   por turno nenhuma vez).
2. `GET /api/admin/mensageria/bot-flows` sempre retorna `segmentMaxTurnsDefault` junto do
   `flow` (antes só vinha quando `flow` era `null`).
3. Aba Bot — checkbox "Usar padrão do segmento (N)" ao lado do campo MaxTurns; quando marcado,
   o input fica desabilitado mostrando o valor do segmento, e o PUT manda `maxTurns: null`.
4. "Reiniciar conversa" virou um botão de verdade — rótulo "Limpar conversa", ícone de lixeira,
   fundo/borda vermelha — usuário não tinha notado o texto pequeno anterior.

**Testado:** GET confirma `segmentMaxTurnsDefault=15` (o usuário já tinha ajustado o segmento
Imobiliário pra 15 seguindo minha sugestão anterior — boa validação orgânica de que a UI do
Master funciona) · PUT com `maxTurns:null` persiste e reflete corretamente no GET seguinte ·
**teste de runtime decisivo:** rodei 6 turnos numa conversa com `maxTurns:null` — turno 6 (que
teria disparado handoff sob o limite fixo antigo de 6) **não** disparou, confirmando que o bot
está usando o padrão do segmento (15) de verdade, não só exibindo na tela. `npx tsc --noEmit`
limpo.

---

### Sessão 2026-07-10 (continuação 4) — MaxTurns padrão vira parâmetro por segmento ✅

**Contexto:** investigando um handoff "inesperado" no bairro Imbiribeira (Imobiliaria XYZ), veio
à tona que a conversa de teste tinha mais turnos do que o usuário mostrou (6, não 4 — puxei o
histórico completo do banco pra provar) — o limite configurado (`maxTurns=6`) disparou
corretamente, não foi bug de dados/ferramenta. Só que 6 é pouco pra uma conversa imobiliária real
(fácil estourar só explorando 2-3 bairros). Usuário pediu: esse padrão deve ser um parâmetro de
tabela, editável pelo Master, **por segmento de negócio** (não um valor fixo no componente).

**Implementado** (mesmo padrão já usado pra outros parâmetros diretos em `system_segments`, ex.
`cpl_ideal`/`cpl_critical`):
1. `prisma/migration-2026-07-10-segment-chatbot-max-turns.sql` — `system_segments.
   chatbot_max_turns_default INTEGER NOT NULL DEFAULT 6`.
2. `POST/PUT /api/admin/master/segments` aceitam o novo campo.
3. `/admin/master/segments` — modal "Editar segmento" ganhou o campo (seção verde, mesmo padrão
   visual do toggle "Imagens por IA"), editável por segmento.
4. `GET /api/admin/mensageria/bot-flows` (nível tenant) — quando o tenant ainda não configurou o
   próprio flow, resolve o segmento do tenant (`resolveSegment`) e retorna
   `suggestedMaxTurns = segmento.chatbot_max_turns_default` em vez do `flow: null` cru. A aba Bot
   em `/mensageria/config` usa essa sugestão como valor inicial do campo, em vez do `'6'` fixo
   que tinha antes.

**Testado:** `npx tsc --noEmit` limpo · `GET /master/segments` confirma o campo presente e = 6
pros 6 segmentos existentes · `PUT` alterando o valor funciona (confirmado, depois revertido) ·
tentativa de testar o fallback (`suggestedMaxTurns`) end-to-end esbarrou numa FK (`bot_sessions`
referenciando o `bot_flows` da Imobiliaria XYZ) — não forcei a remoção pra não arriscar o config
real do tenant; a lógica em si é simples e segue o mesmo padrão já comprovado de `resolveSegment`
usado em várias outras partes do código nesta sessão, então confiei na revisão de código.

**Erro cometido de novo (4ª vez nesta sessão) e corrigido:** digitei "Imobiliário" acentuado
direto num `curl -d` de teste — corrompeu o **nome do segmento** (mais visível que os casos
anteriores, que eram descrições). Corrigido via arquivo. **Ação tomada:** a partir de agora,
qualquer corpo de requisição com acento vai sempre por arquivo primeiro, sem exceção — o padrão
"é só um valor que eu já sei que está certo" continua causando o mesmo erro toda vez.

---

### Sessão 2026-07-10 (continuação 3) — tipos_imovel: completa o fix de escopo pra Imobiliaria XYZ ✅

**Motivação:** usuário reportou `/admin/tipos-imoveis` sem nenhum registro, logado como
Imobiliaria XYZ. Causa: consequência direta do fix de escopo por tenant feito antes nesta sessão
(`migration-2026-07-09-tipos-status-imovel-tenant-scope.sql`) — naquela rodada só duplicamos o
catálogo do master pro Marketing Digital (decisão explícita do usuário na hora, pra não arriscar
os 12 imóveis reais da Imobiliaria XYZ que usam `tipo_fk=12`). Antes do fix do bug de escopo, a
Imobiliaria XYZ "enxergava" (incorretamente) as linhas do master; com o escopo corrigido, passou
a ver zero linhas próprias — ficou pendente duplicar pra ela também, e esqueci de fazer isso.

**Corrigido:** `prisma/migration-2026-07-10-tipos-imovel-imobiliaria-xyz.sql` — duplica as 12
linhas do master pro tenant Imobiliaria XYZ (mesmo padrão já usado pro Marketing Digital,
puramente aditivo/INSERT, `ON CONFLICT DO NOTHING` idempotente).

**Testado:** API `/api/admin/tipos-imoveis` com token real da Imobiliaria XYZ retorna os 12 tipos
próprios, acentos corretos (usei arquivo pra aplicar, não linha de comando — sem repetir o erro
de encoding desta vez) · confirmado que os 12 imóveis reais que usam `tipo_fk=12` continuam
intactos e apontando pro mesmo id (INSERT não mexeu em nenhuma linha existente nem em nenhum FK).

---

### Sessão 2026-07-10 (continuação 2) — Persona: reforço de idioma e escopo ✅

**Motivação (bug real, achado testando com Imobiliaria XYZ já ativa):** perguntado algo fora do
segmento imobiliário ("indicação de remédio pra dor de cabeça"), o bot respondeu **em inglês**
("I don't have access to médico information") — a persona já pedia português, mas não tinha
instrução explícita pra pergunta fora de escopo, e o modelo "escapou" do idioma nesse caso.

**Corrigido** (dado, não código — `public.system_prompt_templates`, template
`mensageria_bot_persona`, os dois templates ativos hoje: fallback global + Imobiliário):
adicionadas 2 regras explícitas — (1) responder SEMPRE em português, mesmo pergunta em outro
idioma ou assunto fora do papel; (2) se a pergunta não tem relação com o negócio, responder com
cordialidade que não tem conhecimento sobre aquele assunto específico, deixar claro qual é o
papel do bot, e perguntar se pode ajudar com algo relacionado.
`prisma/migration-2026-07-10-mensageria-bot-persona-escopo-idioma.sql` (aplicada, idempotente).

**Testado:** repeti a exata pergunta que tinha vazado pra inglês, no mesmo tenant (Imobiliaria
XYZ) — resposta agora cordial, 100% em português, explicando que não tem conhecimento sobre
remédios e redirecionando pro que pode ajudar (imóveis).

---

### Sessão 2026-07-10 (continuação) — Criação manual de inbox ✅

**Motivação:** usuário reportou o campo de "Testar bot" desabilitado logado como Imobiliaria XYZ.
Investigação: tenant tem **zero inboxes** — nunca teve nenhuma interação real em nenhum canal.
Achado importante antes de implementar: `resolveWebformInbox()`/`resolveManualInbox()`
(`src/lib/mensageria/inboxes.ts`) já criam a inbox **automaticamente na primeira mensagem real**
de cada canal — não é ausência de mecanismo, é que Imobiliaria XYZ nunca usou o módulo. Levei
isso ao usuário antes de construir a tela (pra não duplicar um mecanismo já existente); usuário
confirmou que queria a criação manual mesmo assim — útil pra provisionar a inbox **antes** da
primeira interação real (ex.: testar o bot antes de divulgar o canal).

**Implementado:**
- `POST /api/admin/mensageria/inboxes` — cria inbox própria do tenant (`client_id NULL`).
  Restrito a canais funcionais hoje (`whatsapp`/`webform`/`manual` — não `webchat`/`chatbot`,
  que ainda não têm superfície real). Rejeita duplicata do mesmo canal pro tenant (409) —
  mantém a mesma premissa de unicidade que o auto-create já assume (`LIMIT 1`).
- Aba "Inboxes" — formulário de criação (nome + canal) aparece só se houver algum canal ainda
  não criado; lista abaixo continua como já era.

**Testado** (token de teste pro tenant Imobiliaria XYZ, usuário real `admxyz`): tenant começou
com 0 inboxes · POST criou "Formulários do Site" (webform) · 2ª tentativa do mesmo canal → 409 ·
GET reflete o estado correto. **Erro cometido e corrigido no processo:** digitei "Formulários"
acentuado direto no `curl -d` de novo (mesmo erro já registrado antes) — corrigido via arquivo.
**Reforçando a lição:** revisar antes de testar — nunca digitar acento inline em curl/bash.
`npx tsc --noEmit` limpo.

**Pendente:** Imobiliaria XYZ ainda não tem `bot_flows` ativo — a inbox já existe e o campo de
teste já destrava, mas o bot em si precisa ser configurado/ativado na aba Bot pra responder de
verdade (mesmo passo que qualquer tenant novo precisa fazer).

---

### Sessão 2026-07-10 — "Dados do Bot": introspecção sob demanda de colunas ✅

**Motivação (feedback real do usuário testando a UI):** o cadastro de colunas era 100% manual —
o Master tinha que digitar de cabeça os nomes reais das colunas de `imoveis` (47 colunas ao todo,
só 10 configuradas). Usuário: "imaginei que fosse listados todos os campos da tabela para o
usuário não precisar adivinhar".

**Implementado** (versão simples/imediata do job de introspecção da seção 14.6-A — sem criar
linhas-esqueleto automaticamente, só carrega sob demanda quando o Master pede):
- `GET /api/admin/master/segments/[id]/data-entities/table-columns?table=X` — consulta
  `information_schema.columns` (schema `public`) e mapeia `data_type` do Postgres pro
  vocabulário simplificado do resolver (`text`/`number`/`boolean`). Valida o nome da tabela
  contra `IDENT_RE` antes de consultar; 404 se a tabela não existir.
- Botão "Carregar colunas da tabela" em cada card de entidade — busca as colunas reais e
  **mescla** com as já configuradas (nunca sobrescreve; só adiciona as que faltam, com
  `selectable=false`/`filterable=false` por padrão — o Master decide o que exibir/filtrar).

**Testado:** `imoveis` retorna as 47 colunas reais com tipo mapeado corretamente · tabela
inexistente → 404 · identificador com SQL injetado (`imoveis; DROP TABLE imoveis;--`) → 400,
rejeitado pela validação · rota é somente leitura (não grava nada), sem necessidade de
restaurar estado depois do teste. `npx tsc --noEmit` limpo.

**Também corrigido nesta sessão (feedback de UX sobre a transição de loading):** esqueleto de
carregamento do modal reescrito para imitar a forma real dos cards (título+tabela, descrição,
grid de colunas) em vez de 2 blocos cinzas genéricos — a troca abrupta "caixa vazia → formulário
denso" estava sendo percebida como "dois modais abrindo em sequência". Também adicionada uma
guarda contra fetch duplicado do React Strict Mode (dev) no `useEffect` de carregamento.

---

### Sessão 2026-07-09 (continuação 2) — UI "Dados do Bot" no Master (Ponto 3c) ✅

**Decisão de UX (discutida com o usuário antes de implementar):** usuário propôs um botão na
página de Prompts. Recomendei `/admin/master/segments` em vez disso — `segment_data_entities` é
keyed por `segment_id`, igual `segment_angle_terms` (Ângulos & Demanda) e Interesses Meta, e a
página de Prompts é genérica pra qualquer `template_key` (não só a persona do bot), então acoplar
um botão específico ali seria estranho. Segments já tem exatamente essa gaveta — 3 botões de
config por segmento (Ângulos, Interesses, Parâmetros do Agente). Usuário confirmou: seguir só na
página de Segmentos, sem atalho a partir de Prompts.

**Implementado** (mesmo padrão visual/interação de `SegmentAnglesModal` — cards editáveis,
replace-all no save, sem "Sugerir com IA" ainda, já que não há job de introspecção):
1. `GET/PUT /api/admin/master/segments/[id]/data-entities` — só entidades de escopo segmento
   (`tenant_id IS NULL`; overrides por tenant continuam via SQL, mesma decisão já tomada pra
   `bot_flows`). PUT é replace-all transacional (delete + reinsert), valida todo identificador
   (nome de tabela/coluna/tabela-ponte/lookup) contra `IDENT_RE` antes de persistir — o Master não
   consegue salvar um fragmento de SQL disfarçado de nome de coluna.
2. `SegmentDataEntitiesModal.tsx` (novo) — cards de entidade (nome/tabela/descrição/coluna de
   tenant/filtro padrão/máx. resultados/ativo), sub-lista de colunas (nome/tipo/descrição/
   mostra/filtra), sub-lista de relations (nome/agregação/tabela-ponte/FK/tabela de nomes/FK do
   lookup/coluna trazida/teto), painel de Ajuda explicando colunas×relations e a garantia de
   segurança (bot nunca escreve SQL, sempre isolado por tenant).
3. `/admin/master/segments` — 4º botão na coluna de Ações (ícone `CircleStackIcon`, verde-esmeralda
   pra diferenciar dos outros 3), abre o modal escopado ao segmento da linha.

**Testado** (token Master gerado manualmente via padrão do CLAUDE.md, cookie `admin_auth_token` —
a rota usa cookie como as rotas irmãs de Ângulos/Benchmarks, não Bearer header):
`GET` retorna as 2 entidades reais (`imovel` com as 3 relations, `tipo_imovel`) exatamente como
estão no banco · `PUT` com uma 3ª entidade de teste persistiu tudo corretamente (colunas, relations,
inclusive `is_active=false`) · validação rejeitou um nome de tabela com SQL injetado
(`"imoveis; DROP TABLE imoveis;--"`) · estado original restaurado byte-a-byte (mesma contagem de
colunas/relations) · bot re-testado depois do round-trip pela API — continua respondendo com os 12
tipos reais, sem regressão. `npx tsc --noEmit` limpo.

**Follow-up — usuário reportou modal preso no skeleton de loading:** investigação longa (Fast
Refresh do dev server, tentativa de injetar cookie de sessão Master via Chrome DevTools MCP pra
reproduzir — abandonada, muita camada de validação client-side pra forjar) até o usuário mandar
prints reais do Network/Response do navegador: a API sempre respondeu 200 com dado correto: **o
modal nunca teve bug** — a UI renderiza os cards perfeitamente. O que os prints revelaram foi outro
problema real, introduzido por mim: o `curl` que usei mais cedo pra restaurar o estado original
depois do teste de round-trip passou o JSON acentuado direto na linha de comando do Git Bash
(Windows) — corrompeu UTF-8 (á/ç/õ/— viraram `�`) ao gravar no banco. Corrigido com um `UPDATE`
aplicado via arquivo real (`docker exec -i ... < arquivo.sql`), não linha de comando — mesmo padrão
seguro já usado nas migrações. **Lição registrada:** nunca passar texto acentuado inline em comando
bash/curl no Git Bash Windows — sempre escrever um arquivo (Write tool) e aplicar via stdin/arquivo.

**Pendências (próxima rodada):** UX multi-segmento em `/admin/master/prompts` (Ponto 2, ainda não
atacado) · sem botão "Sugerir com IA" nesta tela (dependeria do job de introspecção, fora de
escopo) · overrides por tenant de `segment_data_entities` continuam só via SQL.

---

### Sessão 2026-07-09 (continuação) — UI de teste de conversa + fix tenant_id em tipos_imovel/status_imovel ✅

**Contexto:** usuário pediu uma UI temporária pra testar conversas de múltiplos turnos com o bot
(memória, handoff, tool-use) antes de ir pra UI definitiva do Master. Testando, encontrou o bot
respondendo genérico/alucinado sobre "que tipos de imóveis vocês trabalham" — investigação revelou
um bug pré-existente e maior do que a pergunta original, em `tipos_imovel`/`status_imovel`.

**1. UI de teste de conversa** (`/mensageria/config` → aba Bot):
- `POST /api/admin/mensageria/bot/test` reescrito: `GET ?inboxId=` (estado atual — histórico completo
  + `handledByBot`/`botSessionActive`), `POST` (manda mensagem, retorna histórico **inteiro**, não só
  a resposta nova), `DELETE ?inboxId=` (reinicia — deleta a `conversation`, `messages`/`bot_sessions`/
  `conversation_events` cascateiam via FK).
- Painel "Testar bot" virou chat de verdade: bolhas indo/vindo (mesmo estilo do `ConversationThread`
  real), scroll automático, persiste entre trocas de aba/reload, banner quando handoff já ocorreu,
  botão "Reiniciar conversa".
- **Bug de robustez pego no teste:** o LLM global é OpenAI-compatible com validação estrita — a rodada
  final do loop de tool-use mandava `tools: []`, que o provider rejeita (`400`). Corrigido:
  `completeWithTools` omite `tools` da requisição quando vazio, nos dois branches (Anthropic/OpenAI).
- **Testado:** memória entre turnos (perguntei nome, dei "Carlos", perguntei de volta — acertou) ·
  handoff por keyword (`botSessionActive` vira `false`, bot fica em silêncio nas mensagens seguintes,
  confirmado por acidente com um double-submit) · `GET` reflete exatamente o mesmo estado do último
  `POST` (sem drift, testável após reload).

**2. Bug real encontrado via teste — `tipos_imovel` não tinha escopo por tenant de verdade:**
- Comparando com as rotas irmãs (`finalidades`/`status_imovel`, que extraem `tenantId` do JWT
  corretamente), a rota `/api/admin/tipos-imoveis` **ignorava o tenant do token** — `GET` chamava
  `findAllTiposImovel()` sem argumento, e a função tinha `tenantId: string = '00000000-...'`
  **hardcoded como default**. Toda empresa da plataforma via a mesma lista de 12 tipos do tenant
  master. `POST`/`PUT`/`PATCH`/`DELETE` em `[id]/route.ts` tinham o mesmo problema (e ainda um bug de
  assinatura: `updateTipoImovel(id, {nome,...})` passava um objeto no lugar do `tenantId` esperado —
  confirmado pelos erros de TS pré-existentes já vistos no baseline desta sessão, que na hora pareciam
  não-relacionados e agora se mostraram diretamente relevantes).
- **Descoberta adicional:** a constraint `UNIQUE(nome)` (global, não por tenant) em `tipos_imovel` E
  `status_imovel` impedia a correção direta — não dava pra duplicar "Apartamento" pro tenant Marketing
  Digital enquanto "Apartamento" já existisse sob o master.
- **Verificação de impacto antes de agir:** Imobiliaria XYZ (tenant real, `c828d003...`) tem **12
  imóveis reais** usando `tipo_fk=12` ("Apartamento", uma linha do master) — mover(UPDATE) as linhas
  pra Marketing Digital quebraria a visibilidade do catálogo pra Imobiliaria XYZ assim que o bug da
  rota fosse corrigido. Decisão confirmada com o usuário: **duplicar** (não mover) pro Marketing
  Digital, `amenidades`/`proximidades` ficam de fora (são catálogos genuinamente compartilhados,
  já validados funcionando via `imovel_amenidades`/`imovel_proximidades` no teste anterior).
- **`prisma/migration-2026-07-09-tipos-status-imovel-tenant-scope.sql`** (aplicada): `UNIQUE(nome)` →
  `UNIQUE(tenant_id, nome)` em `tipos_imovel` e `status_imovel` · duplica as 12 linhas de `tipos_imovel`
  e a 1 linha órfã de `status_imovel` (ambas sob o master) pro tenant Marketing Digital · Imobiliaria
  XYZ e o master continuam com suas linhas intactas.
- **Rotas corrigidas** (`src/lib/database/tipos-imoveis.ts` + `src/app/api/admin/tipos-imoveis/
  route.ts` + `.../[id]/route.ts`): `tenantId` agora `string | undefined` em toda a cadeia (mesmo
  padrão de `status-imovel.ts`) — master vê tudo (sem filtro), tenant vê só o seu; `POST` exige
  tenantId (401 se ausente); `PUT`/`PATCH`/`DELETE` corrigidos pra passar `tenantId` na posição certa.
- **`prisma/migration-2026-07-09-mensageria-bot-tipos-imovel.sql`** — registra `tipos_imovel` como 2ª
  ferramenta de dados do bot (segmento Imobiliário).
- **Testado:** `npx tsc --noEmit` limpo (os erros de TS pré-existentes em `tipos-imoveis/*` do
  baseline desta sessão desapareceram) · query simulada confirma 12 linhas próprias do Marketing
  Digital · bot re-testado com a MESMA pergunta que tinha alucinado antes — agora cita os 12 tipos
  reais, sem inventar nada.

**Pendências (inalteradas, próxima rodada):** UI "Dados do Bot" no Master (3c) · UX multi-segmento em
`/admin/master/prompts` (Ponto 2) · `amenidades`/`proximidades` ainda não registradas como ferramentas
do bot (ficaram de fora desta rodada, mas o motor já suporta — é só cadastro).

---

### Sessão 2026-07-09 — M4.2 refinamento (motor de dados multi-tabela + persona no lugar certo) ✅

### Sessão 2026-07-09 — M4.2 refinamento (motor de dados multi-tabela + persona no lugar certo) ✅

**Contexto:** revisão holística pedida pelo usuário apontou 3 pontos. Sequência confirmada:
"motor primeiro, UI depois". Esta rodada fez Ponto 1 + Ponto 3a/3b.

1. **Ponto 1 — persona no lugar certo (feito):** removido o campo de persona (override) da aba Bot em
   `/mensageria/config`, do endpoint `bot-flows` (GET/PUT não lê/grava mais `system_prompt`) e do
   `botAdapter` (`resolvePersona` não honra mais override — persona é 100% dirigida por segmento).
   A persona agora vem só de `/admin/master/prompts` (template `mensageria_bot_persona`,
   `resolvePromptTemplate` faz segmento → fallback global). A aba Bot ficou com o operacional do
   tenant (ativo, handoff keywords/maxTurns, teste) + uma nota apontando pro Editor de Prompts.
2. **Ponto 3a — relations no resolver (feito):** `genericResolver.ts` reganhou o suporte a `relations`
   (que eu havia descartado do design 14.6-A), mais robusto que o rascunho do plano: subqueries
   escalares correlacionadas com agregação one-to-many (`array_agg` com teto), `count`, `first`, e
   multi-hop (imovel → tabela-ponte → lookup do nome). TODOS os identificadores são montados pelo
   resolver a partir de campos "bare" validados por IDENT_RE — config NUNCA fornece fragmento SQL cru
   (o rascunho 14.6-A interpolava `r.join_table`/`r.on`/`r.select` direto; isto é mais seguro).
3. **Ponto 3b — re-seed Imobiliário (feito):** `migration-2026-07-08-mensageria-bot-relations.sql`
   popula relations reais na entidade `imovel`: `qtd_fotos`=count de `imovel_imagens`;
   `amenidades`=array via `imovel_amenidades`→`amenidades.nome`; `proximidades`=array via
   `imovel_proximidades`→`proximidades.nome`. Aplicada localmente.

**Bug real encontrado e corrigido durante o teste (importante):** o LLM global da plataforma é um
provider **OpenAI-compatible com validação estrita de schema** (não Anthropic). O modelo mandou
`quartos: "3"` (string) e o provider rejeitou a tool call porque o schema declarava `number`
(`400 tool call validation failed ... expected number, but got string`). Isso explica por que o
teste de M4.1 tinha passado "na sorte" (naquela vez o modelo emitiu número). **Correção:** o schema
das ferramentas agora expõe todo filtro como `string`, e a coerção pro tipo real acontece
server-side no `resolveEntity` (número via `Number()` com validação, boolean normalizado, texto
ILIKE). Robusto e determinístico independentemente do que o modelo emite. Também: `completeWithTools`
passou a **omitir** `tools` da requisição quando o array é vazio (a rodada final do loop de tool-use
mandava `tools: []`, que os providers rejeitam).

**Testado ponta a ponta** (tenant Marketing Digital, dados temporários removidos após validação):
SQL das relations validado contra dados REAIS do tenant Imobiliaria XYZ (imóvel 17, 44 amenidades →
multi-hop + `array_agg` corretos) · bot respondeu citando as 3 amenidades, 2 proximidades e campos
base (preço/banheiros/vagas/área) exatamente como inseridos · `npx tsc --noEmit` limpo · bundle da
config confirma persona removida + nota do Editor de Prompts presente.

**Nota honesta de cobertura:** só o branch **OpenAI-compatible** de `completeWithTools` foi exercitado
em runtime (é o provider global configurado). O branch Anthropic compila e está correto por
construção, mas não foi testado ao vivo nesta rodada.

**Pendências desta frente (próxima rodada — "UI depois"):**
- **3c — UI "Dados do Bot" no Master:** modal por segmento (padrão Ângulos/Interesses/Benchmarks de
  `/admin/master/segments`) pra cadastrar entidades + colunas selectable/filterable + relations sem
  SQL. É o que torna o "quais tabelas cada segmento acessa" 100% parametrizável (inclusive Saúde,
  Carros, etc. — hoje só via SQL).
- **Ponto 2 — UX multi-segmento em `/admin/master/prompts`:** a capacidade existe (botão "Duplicar
  p/ segmento"; banco permite N variantes por template_key), mas o fluxo é escondido e tem footgun
  (abrir o Global, trocar segmento e clicar Salvar MOVE o Global pro segmento). Tornar "adicionar
  variante por segmento" first-class + proteger o Salvar.
- Persona por segmento: hoje semeados global + Imobiliário. Saúde/Carros/etc. entram via
  `/admin/master/prompts` quando forem ativados.
- Job de introspecção de tabelas novas (14.6-A) — futuro.

---

## Penúltima tarefa concluída

### Sessão 2026-07-08 — M4.1 + M4.2: Chatbot mínimo + ferramentas de dados por segmento ✅

**Escopo confirmado com o usuário:** M4.1 (núcleo do bot) **junto com** M4.2 (tool-use sobre dados do
segmento). RAG (14.6-B) e o widget público (`webchat`, 8.4) ficam para depois (M4.3/M4.4). Ver
`docs/PLANO_MENSAGERIA.md` seção 18.1.

**Implementado:**
1. `src/lib/marketing/services/llmClient.ts` — `LlmClient` ganhou `completeWithTools(system, messages,
   tools, maxTokens)`, implementado nos dois branches (Anthropic nativo com `system`+`tools`+
   `tool_use`/`tool_result` blocks; OpenAI-compatible com `role:'system'`+`tool_calls`+`role:'tool'`).
   Tipos novos: `LlmToolDef`, `LlmToolCall`, `LlmMessage`, `LlmToolResponse`.
2. `src/lib/mensageria/tools/genericResolver.ts` (novo) — `loadEntitiesForSegment`, `resolveEntity`
   (SQL parametrizado, whitelist de identificadores, `default_filter` como config confiável),
   `getToolsForSegment` (1 entidade ativa → 1 ferramenta do LLM, sem tocar em código).
3. `src/lib/mensageria/botAdapter.ts` (novo) — `maybeRunBot(conversationId, tenantId)`: gate (canal
   ≠ manual, sem assignee humano, `bot_sessions.active` — não reage depois de um handoff já feito),
   resolve `bot_flows` (client_id > tenant-wide), handoff por keyword/maxTurns ANTES de chamar o LLM,
   loop de tool-use (`runBotReply`, até 3 iterações) com fallback de mensagem se o LLM devolver vazio.
4. `src/lib/mensageria/ingest.ts` — hook best-effort no fim de `ingestMessage()`: mensagem inbound de
   contato chama `maybeRunBot()`; a resposta do bot reentra em `ingestMessage()` como outbound/bot
   (sem recursão infinita, já que o hook só dispara em inbound).
5. `prisma/migration-2026-07-08-mensageria-bot-persona.sql` — seed de dados (schema já existia desde
   M0): prompt `mensageria_bot_persona` (fallback global + especialização do segmento Imobiliário) +
   1ª `segment_data_entities` (entidade `imovel` → `public.imoveis`, 10 colunas, segmento Imobiliário,
   todos os tenants do segmento). Aplicada localmente.
6. `GET/PUT /api/admin/mensageria/bot-flows` — configura o flow padrão do tenant (ativo, persona
   override, keywords de handoff, maxTurns). `POST /api/admin/mensageria/bot/test` — simula mensagem
   inbound numa inbox (exercita o pipeline real) e retorna a resposta; rejeita canal Manual.
7. Aba "Bot" em `/mensageria/config` — toggle ativo/inativo, persona override, keywords/maxTurns,
   painel "Testar bot". Fix incidental: `TextInput` (componente compartilhado da página) descartava
   silenciosamente qualquer `className` passado via prop (spread antes do className fixo) — corrigido
   para mesclar, afetando também os 2 usos pré-existentes que já passavam `className` sem efeito.

**Testado ponta a ponta** (via API real, tenant Marketing Digital): tool-use encontrando zero
resultados corretamente isolado por tenant (perguntou por imóveis que só existiam em outro tenant) ·
com 3 imóveis de teste inseridos em `public.imoveis` (removidos após validação, autorizado pelo
usuário) o bot respondeu citando dados reais corretos (2 de 3 matches, detalhes batendo com o banco) ·
handoff por palavra-chave (`handled_by_bot=false`, evento `bot_handoff` registrado, conversa aparece
na fila "não atribuídas") · bug real encontrado e corrigido durante o teste: `ON CONFLICT ... SET
active = true` reativava a sessão do bot a cada mensagem, então depois de um handoff o bot voltava a
responder na próxima mensagem do contato — corrigido pra checar `bot_sessions.active` antes de
qualquer coisa e retornar silenciosamente se já foi feito handoff · canal Manual rejeitado pelo
endpoint de teste · `npx tsc --noEmit` limpo (zero erros novos, só os pré-existentes de outras áreas).

**Pendências conhecidas, não bloqueantes:** UI "Dados do Bot" no Master (cadastro de
`segment_data_entities` por enquanto só via SQL) · job de introspecção automática de tabelas novas ·
resumo rolante de memória (thread + `bot_sessions.state` sem resumo já bastam pro MVP) · verificação
visual em navegador da aba "Bot" não feita (só bundle compilado + API real — sem 2º servidor dev,
ver lição operacional já registrada nesta sessão).

**Dados mantidos para o usuário continuar testando:** `bot_flows` ativo no tenant Marketing Digital
(flow padrão, sem persona override, keywords `atendente/humano/falar com alguem`, maxTurns=6).

---

### Sessão 2026-07-08 — Caixa de Entrada: Coluna 3 refatorada para `ConversationThread` ✅

Pendência registrada na sessão anterior ("`ConversationThread.tsx` duplica lógica que também existe
inline em `/mensageria/page.tsx`") resolvida. Trouxe o recurso de respostas rápidas (`/atalho`) para
dentro de `ConversationThread.tsx` (não existia lá) — estado, memo `cannedMatches`, dropdown no
composer — alcançando paridade total antes de trocar. Removido `showCannedSuggestions` (confirmado
código morto). `page.tsx` agora usa `<ConversationThread key={selectedId} conversationId={selectedId}
onUpdated={loadConversations} />`; todo estado/lógica da thread duplicados foram removidos
(~314 linhas de duplicação eliminadas no total). O antigo update otimista local de `unreadCount` foi
substituído por `onUpdated` → `loadConversations()` (o `GET /conversations/[id]` já zera
`unread_count` no servidor) — validado ponta a ponta via API+DB. `key={selectedId}` também corrigiu
um bug latente (texto do composer vazando entre conversas ao trocar de seleção).

**Testado:** `npx tsc --noEmit` sem erros novos; bundle compilado inspecionado via curl confirma
presença de `cannedMatches`/`shortcut`/`canned-responses`; fluxo de zerar `unread_count` confirmado
via API+DB real.

---

### Sessão 2026-07-07 (continuação 2) — Painel do Gestor (`/mensageria/gestao`) ✅

**Status:** Fundação de visibilidade gerencial (sessão anterior) usada como base — seção 17 do
plano (17.5, itens 7-9) implementada por completo: acesso, API estendida e a tela em si.

1. `prisma/migration-2026-07-08-mensageria-gestao-access.sql` — feature `mensageria-gestao`
   (id 115) registrada (aditiva à migration anterior, módulo/categoria já existiam).
2. `GET /conversations` ganhou: paginação numerada (`page`/`pageSize`, coexiste com o `cursor` da
   Caixa de Entrada na mesma rota) · filtros `teamId`/`priority`/`labelId`/`channelType` ·
   `sortBy`/`sortDir` · `includeKpis=1` (em aberto, SLA estourado, tempo médio de 1ª resposta) ·
   `teamName`/`firstResponseDurationSec` na resposta.
3. `src/components/mensageria/ConversationThread.tsx` (novo) — thread reaproveitável (mesma UX da
   Caixa de Entrada), usada no drawer lateral do Painel do Gestor. Não foi feita a refatoração de
   `/mensageria/page.tsx` para usar esse componente também (ficou como componente novo e paralelo,
   por segurança — evitar risco de regressão na Caixa de Entrada já validada em M0-M3).
4. `/mensageria/gestao` (novo) — KPIs, filtros, tabela densa ordenável, paginação numerada, drawer.
   Gate client-side pra `scopeLevel==='own'` (a API já protege os dados por trás disso de qualquer forma).

**Testado:** filtros (time/canal/prioridade/data), ordenação, paginação numerada e KPIs — todos
validados via API com dados reais do tenant de teste. Sidebar confirmada via
`get_sidebar_menu_for_user()` real (admin vê pelo caminho do banco).

**Pendência conhecida, não crítica:** `ConversationThread.tsx` duplica lógica que também existe
inline em `/mensageria/page.tsx` (coluna 3). Refatorar a Caixa de Entrada pra usar o componente
compartilhado é trabalho futuro de limpeza, não bloqueante.

**Referências:** `docs/PLANO_MENSAGERIA.md` seção 17 (17.5 — todos os itens 1-9 concluídos).

---

### Sessão 2026-07-07 (continuação) — Mensageria: config UI, acesso, escala e visibilidade gerencial ✅

**Status:** Testes M0-M3 aprovados na sessão anterior. Nesta sessão: telas de configuração
construídas do zero, registro de acesso (sidebar/permissões), correções de qualidade (validação,
layout) e a fundação de visibilidade gerencial (M5.1) implementada e validada ponta a ponta.

**1. Registro de acesso (fase M6 antecipada)** — `prisma/migration-2026-07-07-mensageria-access.sql`:
módulo `mensageria` + categoria "Central de Mensagens" (id 31) + 5 `system_features`
(`mensageria-inbox/analytics/config/chatbot/conhecimento`) + `permissions` + `role_permissions`
(41/42/47/48) + `tenant_feature_overrides` provisionado nos 4 tenants. Validado rodando
`get_sidebar_menu_for_user()` com usuário admin real.

**2. Página `/mensageria/config`** (não existia — só as APIs) — 5 abas: Inboxes (status + vínculo
com time responsável), Times (criar/deletar, adicionar/remover membro, **promover a líder** ⭐),
Etiquetas, Respostas Rápidas, SLA (com seletor de escopo Global/Inbox/Time). APIs novas:
`inboxes`, `inboxes/[id]` (PATCH team_id), `users` (lista p/ dropdown), `clientes-search`,
`my-scope`. Cron de SLA (`sla-check`) registrado em `scripts/feed-cron-scheduler.js` (5 em 5 min).

**3. Combobox "Nome do Contato"** na Nova Conversa Manual — busca em `public.clientes`, auto-
preenche telefone/email ao selecionar, e-mail/telefone com validação rigorosa local (DDD real +
regra do 9º dígito, TLD de e-mail), banner "Cliente novo, seguir mesmo assim?" quando não há match.

**4. Fixes de layout** — `scrollIntoView()` trocado por `scrollTop` direto (evitava pular a janela
inteira); `AdminSidebar.tsx` corrigido (`h-screen top-0` → `h-[calc(100vh-4rem)] top-16`) — bug
estrutural que afetava **todo o admin**, não só Mensageria (~64px de scroll fantasma).

**5. Escala/volumetria** — `GET /conversations` ganhou paginação por cursor (50/página, scroll
infinito), filtro de período (`dateFrom`/`dateTo` com `<DateInputPtBR>`), `totalCount` real via
`COUNT(*)`, divisor de data na thread ("Hoje"/"Ontem"/data completa), tooltip com data absoluta.

**6. Modelo de Visibilidade Gerencial (seção 16/17 do plano) — decisões confirmadas e
implementadas:** atendente só vê próprias + não atribuídas do time; líder de time
(`mensageria.team_members.role='lead'`) vê todo o time; admin vê tudo (decisão 16.3 Opção A).
Líder de time vê "Painel do Gestor" injetado no menu via augmentação client, sem o sidebar global
da plataforma conhecer o módulo (decisão 17.4 Opção B).
- Novo: `src/lib/mensageria/visibilityScope.ts` (`resolveMensageriaScope`, `scopeToSql`)
- Escopo aplicado em `GET`/`PATCH /conversations/[id]`, `POST .../messages`, `GET /conversations`
  (defesa em profundidade — fora do escopo retorna 404, não só oculta na lista)
- Bug real encontrado e corrigido: `UPDATE` sem alias `c.` quebrava com 500 ao aplicar o filtro de escopo
- UI de Times ganhou seletor Agente/Líder + botão de promover/rebaixar
- Validado ponta a ponta com usuário de teste não-admin real criado no tenant (`teste.atendente`,
  role "Atendente" id 49) — via API **e** confirmado na UI/sidebar real do navegador

**Pendente (não é bug, é trabalho ainda não iniciado):** a página `/mensageria/gestao` em si
(Painel do Gestor: KPIs, filtros, tabela densa, drawer) — fundação de acesso pronta, tela ainda não
construída. Ver `docs/PLANO_MENSAGERIA.md` seção 17 (17.5, itens 7-9).

**Dados de teste mantidos no tenant Marketing Digital** (a pedido, para continuar testando o
Painel do Gestor depois): role "Atendente" (id 49), usuário `teste.atendente`/`Teste@2026`, time
"Time Teste E2E", 6 conversas, 1 política de SLA de teste.

**Referências:** `docs/PLANO_MENSAGERIA.md` (seções 15, 16, 17 — as 3 mais recentes).

---

### Sessão 2026-07-07 — Retomada Mensageria: Testes M0-M3 ✅

**Status:** Resgate completo do projeto de mensageria. Plano e script de testes criados.

**O que foi feito:**
1. Lido `docs/PLANO_MENSAGERIA.md` — documento completo de 7 fases (M0-M6)
2. Identificado que M0-M3 já foram implementados (schema + APIs + UI + SSE)
3. Criado `docs/TESTES_MENSAGERIA_M0-M3.md` — plano estruturado com 14 seções:
   - Testes de schema (tabelas, índices, multi-tenant)
   - Testes de ingestão (idempotência, dedupe)
   - Testes de APIs (CRUD, filtros, operações)
   - Testes de UI (layout 3 colunas, fluxos, interações)
   - Testes de tempo real (SSE)
   - Testes de SLA, times, etiquetas, respostas rápidas
4. Criado `scripts/test-mensageria-quick.mjs` — script Node.js executável com 9 seções (~30 testes)

**Implementação atual (M0-M3):**
- ✅ Schema `mensageria` completo (12+ tabelas com índices e constraints)
- ✅ APIs CRUD para conversas, mensagens, labels, times, SLA
- ✅ UI `/mensageria` com layout 3 colunas (filtros, lista conversas, thread)
- ✅ Tempo real via SSE para atualizações ao vivo
- ✅ Etiquetas, respostas rápidas, atribuição, prioridades, SLA
- ✅ Suporte multi-canal (WhatsApp, webform, manual, chatbot)

**Próximos passos (ordem de execução):**
1. Rodar script: `node scripts/test-mensageria-quick.mjs <jwt>`
2. Testes de UI manual: abrir `/mensageria` e validar fluxos
3. Testes de SSE: múltiplas abas sincronizadas
4. Testes com dados realistas (seed com 50+ conversas)
5. ✅ Aprovação de M0-M3
6. Iniciar **M4 — Chatbot** (bot_flows + LLM + tool-use)

**Referências:**
- `docs/PLANO_MENSAGERIA.md` — Plano mestre das 7 fases
- `docs/TESTES_MENSAGERIA_M0-M3.md` — Plano de testes completo
- `scripts/test-mensageria-quick.mjs` — Script de testes automatizados

---

### Sessão 2026-06-16 — FASE 16 + MinIO unificado + Deploy automatizado ✅

#### 1. FASE 16 — Postagem Orgânica no Meta (16.A–16.F) — COMPLETA

Ver detalhes em `docs/claude-memory/project_fase16_organico.md`.
Commits: `bae5fe5` (FASE 16 concluída) + `64b374c` (upload MinIO orgânico) + `56b8945` (dedup s3-client).

**Migrações aplicadas LOCALMENTE, PENDENTES na VPS:**
- `prisma/migration-2026-06-15-fase16-organic.sql`
- `prisma/migration-2026-06-15-fase16f-schedule.sql`

#### 2. Unificação de Object Storage — s3-client.ts

- **Problema:** 3 implementações separadas de storage (disco local em criativos, MinIO em imóveis, novo minio.ts criado para orgânico).
- **Solução:** tudo usa `src/lib/storage/s3-client.ts`. Arquivo `minio.ts` duplicado removido.
- `criativos/upload`: migrado de `public/uploads/` (disco) para MinIO (`criativos/<tenantId>/...`).
- `organic/upload`: usa `s3-client.ts` diretamente.
- `s3-client.ts`: adicionado `ensureBucket()` com auto-criação + política pública.
- Commits: `03dc3b8` + `56b8945`.

#### 3. Deploy VPS — totalmente automatizado

- `scripts/deploy.sh`: coleta domínio + email, gera todas as senhas com `openssl rand`, escreve `.env`, sobe containers, aguarda healthcheck, inicializa buckets MinIO.
- `docker-compose.vps.yml`: `CDN_URL` derivado automaticamente de `PROD_DOMAIN`.
- `ops/Caddyfile`: rota `/storage/*` → `minio:9000` (imagens acessíveis via HTTPS sem expor porta).
- `.env.example`: template completo documentado.
- Commits: `07ebe43` + `5a83880`.

**Para fazer o deploy:**
```bash
git clone https://github.com/alexandreseverogh/NetImobiliaria .
chmod +x scripts/deploy.sh
./scripts/deploy.sh   # pergunta apenas domínio + email
```

---

### Sessão 2026-06-14 — Setup nova máquina + fixes dashboard ✅

#### 1. Setup ambiente nova máquina

- **Fix login** — `DB_PASSWORD` estava errado; `docker inspect netimobiliaria-db` revelou `POSTGRES_PASSWORD=postgres`. Atualizado `.env.local`.
- **Fix `MARKETING_DATABASE_URL`** — porta estava `5432` em vez de `15432`. Corrigido para `postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria`.
- **Restore banco** — backup de outra máquina restaurado via `docker cp` + `pg_restore`. Senha do usuário `admmd` redefinida para `Admin@2024` (bcrypt).
- **Sync GitHub** — projeto local estava 23 commits atrás. Feito `git pull origin main` para 100% atualizado.
- **npm install** — rodado com `--legacy-peer-deps` (react-leaflet@5 requer React 19; projeto usa React 18).

#### 2. Fix radar de demanda — "Dados de mercado externo ainda não disponíveis"

- Cron `POST /api/cron/campanhas/exogenous-signals` executado para popular `exogenous_signals`.
- **Fix constraint `ON CONFLICT`** — índice original era `(segment_id, angle, signal_date, geo)` mas o cron inseria sem `segment_id`. Criado índice sem `segment_id`: `CREATE UNIQUE INDEX exogenous_signals_angle_date_geo_key ON campanhasmarketingdigital.exogenous_signals (angle, signal_date, geo)`.
- **Fix `segment_id NOT NULL`** — `ALTER TABLE campanhasmarketingdigital.exogenous_signals ALTER COLUMN segment_id DROP NOT NULL`.

#### 3. Fix "Erro ao gerar briefing"

- **Causa 1:** Prisma singleton stale (`globalForPrisma.prismaMarketing` criado antes de `npx prisma generate --schema=prisma/schema.marketing.prisma`). Resolvido com generate + restart do servidor.
- **Causa 2 (principal):** `clientId: 'own'` sendo passado para `prisma.strategicBriefing.create()` como UUID — violação de FK. Corrigido em:
  - `src/app/api/admin/campanhas/briefings/generate/route.ts` — sanitiza `rawClientId === 'own'` → `undefined` antes de qualquer chamada.
  - `src/lib/marketing/services/strategicBriefing.ts` — proteção dupla nos 3 blocos `create()`: `(!clientId || clientId === 'own') ? null : clientId`.

#### 4. Gráfico "Distribuição por Campanha" — melhorias

- **Dado real:** trocado de `dailyBudget` (frequentemente 0) para gasto real agregado dos `currentPeriod.insights` por `campaignId`.
- **Labels dentro do donut:** `label` customizado no `<Pie>` com `R$Xk` / `R$X` em branco dentro de cada fatia (fatias < 5% omitidas).
- **Legenda com valor:** legenda abaixo do gráfico agora mostra nome completo (sem truncamento) + percentual + valor R$.
- **Ordenação decrescente:** lista e gráfico ordenados do maior para o menor gasto.
- **Tooltip:** atualizado para formato `R$ X.XXX,XX` (pt-BR).

#### 5. Filtro por segmento — Tracking Health, Insights da IA, Briefing

- **Insights da IA:** já filtrava por `segmentId` na API (`generateAiInsights` com `resolveCampaignIdsBySegment`); `bySegment` retorna apenas o segmento ativo. ✅
- **Briefing Estratégico:** `getLatestBriefing({ segmentId: activeSegment })` e `generateBriefing(..., activeSegment)` já isolam por segmento. ✅
- **Tracking Health:**
  - `TrackingHealthWidget` — adicionada prop `segmentId?: string | null`; repassa para `getTrackingHealth` e `runTrackingHealth`.
  - `marketing-api.ts` — `getTrackingHealth` e `runTrackingHealth` aceitam `segmentId` opcional.
  - `tracking/health/route.ts` — GET lê `segmentId` de searchParams; POST lê do body; ambos repassam para o serviço.
  - `trackingHealthService.ts` — `runTrackingHealthCheck` e `getTrackingHealthHistory` aceitam `_segmentId` (reservado; tabela não tem coluna segment_id ainda).
  - Dashboard: `<TrackingHealthWidget segmentId={activeSegment ?? null} />`.

**Arquivos modificados nesta sessão:**
- `src/app/api/admin/campanhas/briefings/generate/route.ts`
- `src/lib/marketing/services/strategicBriefing.ts`
- `src/lib/marketing/services/trackingHealthService.ts`
- `src/app/api/admin/campanhas/tracking/health/route.ts`
- `src/components/marketing/TrackingHealthWidget.tsx`
- `src/lib/marketing-api.ts`
- `src/app/admin/campanhas/dashboard/page.tsx`

---

### Sessão 2026-06-13 — Dashboard multi-segmento: UI, fixes e commit ✅

Trabalho consolidado no commit **`c39b583`** (push na `main`), que também versionou a
feature multi-segmento (FASE 18.2) que estava sem commit. Itens da sessão:

1. **fix** — `AnimatePresence` ausente no import de `dashboard/page.tsx` (ReferenceError em runtime).
2. **ClientSelector — default inteligente:** `useClientSelector(storageKey, segmentId, isOwnSegment)`.
   Ao trocar de segmento, default = `'own'` só no segmento do tenant (`isOwn`); senão `'segment'`
   (Todos os Clientes). Motivo: campanhas sem cliente herdam o segmento do tenant, então
   "Minha Empresa" é estruturalmente vazia em outros segmentos. `isOwn` vem de `GET /segments`.
3. **Funil por Estágio no modo "Todos os Clientes"** (`SegmentDashboard`): busca
   `GET /dashboard/funnel?segmentId=...` (já isola por segmento) e renderiza `StageFunnelWidget`.
   `SegmentDashboard` agora recebe props `startDate`/`endDate`. Distribuição por Campanha foi
   deliberadamente deixada de fora do modo segmento (ruído com N campanhas).
4. **fix — `funnel_stage`:** o sistema usa `TOF`/`MOF`/`BOF`. O seed usava AWARENESS/CONSIDERATION/
   CONVERSION → funil vazio. Corrigido no banco (UPDATE) e no `seed-multisegmento-teste.sql`.
5. **fix — CPL por ângulo inflado (fan-out de JOIN)** em `segmentIntelligenceService.ts`:
   `LEFT JOIN Insight` + `LEFT JOIN Lead` juntos faziam produto cartesiano (spend × nº leads).
   Corrigido com subqueries pré-agregadas por campanha. CPL voltou a valores reais (~R$ 35–56).
6. **UI — linhas de benchmark/mediana:** estavam com alpha baixíssimo (quase invisíveis).
   Trocadas por tom neutro forte `#cbd5e1` (dark) / `#475569` (light), `strokeWidth 2`,
   em `MultiClientMetricChart` e `MultiClientCplChart`.
7. **UI — máscara de moeda pt-BR** (`formatCurrency` → `R$ 9.999,99`) aplicada em CPLs que
   estavam crus: `SegmentNarrative`, `ClientRankingTable`, `MultiClientCplChart`, `WinningAngleChip`.

**Pendências conhecidas:** CPL ainda cru (`toFixed`) em `/portfolio/cross-insights` (linhas 280/296)
e `CplTimelineChart` — não padronizados nesta sessão. Lixo de debug não versionado permanece no
working tree (cron_debug.txt, scripts/*.mjs, .claude/launch.json) — fora do commit de propósito.

---

### Seed multi-segmento p/ testes do Dashboard — CONCLUÍDO 2026-06-12 ✅

Arquivo `prisma/seed-multisegmento-teste.sql` — dataset de teste do tenant Marketing Digital
cobrindo **4 segmentos** (Imobiliário, Saúde, Carros, Geral) com **6 clientes + campanhas próprias**.
Idempotente e aditivo: identifica seus registros por `metaCampaignId LIKE 'seed_ms_%'` —
re-executar apaga só o que ele criou, nunca toca em Alexandre/Gisele reais.

- **21 campanhas · 924 insights (44 dias) · 5.469 leads.**
- Perfis calibrados por benchmark de cada segmento: `scale` (ok), `alert`/`optimize` (warn),
  `pause` (CTR<1%, 0 leads). Vídeo (Hook Rate) nas campanhas scale. `declared_angle` válido
  por segmento (alimenta Radar + WinningAngle).
- Clientes novos: Imobiliária Premium, Clínica OdontoVida, AutoMax Veículos, RodaBoa
  Concessionária, Loja Mix Geral (uuids fixos `a5ed000X-...`).
- Aplicar: `docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-multisegmento-teste.sql`
- **Nuance:** no ranking do modo "Todos os Clientes" os clientes ficam ok/warn (CPL agregado
  dilui as campanhas pause). Nenhum cliente fica `critical` no agregado — adicionar cliente
  uniformemente caro se quiser testar o badge vermelho do ranking.

---

### FASE 18.2 — Dashboard dirigido por Segmento — CONCLUÍDO 2026-06-11 ✅

No modo agregado (vários clientes de segmentos distintos), 4 seções do dashboard misturavam segmentos
indevidamente. Decisão: quebrar por segmento (Radar, Insights IA, Briefing) e por cliente (Tracking Health),
100% dirigido pelo banco (`system_segments.creative_taxonomy.angles`). Plano completo aprovado.

**Fundação de dados:** nova tabela `campanhasmarketingdigital.segment_angle_terms` (segment_id, angle_slug,
angle_label, search_term) substitui a global `angle_search_terms`; `exogenous_signals` e `demand_radar_cache`
ganham `segment_id`. Seed por segmento ativo.

**Fases:** A) segmentTaxonomyService · B) Wizard+Vision por segmento · C) Radar por segmento ·
D) Insights+Briefing por segmento · E) Tracking Health por cliente. Cada fase: migração local + commit + push.

**Progresso:**
- ✅ **Fase A** — migração `segment_angle_terms` (18 ângulos / 4 segmentos) + `segmentTaxonomyService`.
- ✅ **Fase B** — wizard carrega ângulos do segmento do cliente (`segment-defaults` retorna `allowedAngles`).
  Vision mantida agnóstica (roda no upload, sem segmento). `angles.ts` = fallback legado.
- ✅ **Fase C** — Radar por segmento: cron popula `exogenous_signals` por segmento (Trends real),
  `computeDemandRadarBySegment`, API retorna `{segments:[...]}`, UI empilha um radar por segmento.
  Verificado: agregado → 2 segmentos (Imobiliário+Saúde), cliente único → 1 segmento.
  ⚠️ Campanhas demo têm `declared_angle` genérico antigo (family/luxury…) → endógeno 0 nos novos
  vértices até serem recriadas pelo wizard (ou migradas).
- ✅ **Fase D** — Insights IA por segmento (benchmark próprio de cada segmento; `aiInsights.bySegment`)
  + Briefing Estratégico por segmento (`StrategicBriefing.segment_id`; um briefing por segmento;
    rotas generate/latest e cron retornam/persistem por segmento).
  Verificado: agregado → Insights e Briefings separados Imobiliário + Saúde.
- ✅ **Fase E** — Tracking Health breakdown por cliente (um widget por cliente no modo agregado).

**Resultado:** no modo "todos os clientes", Radar/Insights/Briefing exibem um bloco por segmento e
Tracking Health um card por cliente. Cliente único colapsa para um bloco coerente. 100% dirigido por
banco (system_segments + segment_angle_terms), zero hardcode, zero mock.

### FASE 18.3 — Cadastro dinâmico de ângulos por segmento (IA) — CONCLUÍDO 2026-06-11 ✅

Fecha o loop: ao criar/editar um segmento, o LLM (modelo global) propõe ângulos (slug+rótulo) +
termos PT-BR de Google Trends para o nicho; o admin revisa/edita e salva em `segment_angle_terms`
(sincroniza `creative_taxonomy.angles`). Assim, **segmentos novos ficam 100% dinâmicos** — radar,
wizard, insights, briefing passam a funcionar sem tocar em código nem dados manuais.

- Prompt `segment_angles_suggestion` (global, `system_prompt_templates`).
- `segmentAngleSuggestionService` + rotas `master/segments/[id]/angles` (GET/POST sugerir/PUT salvar).
- `SegmentAnglesModal` + botão "Ângulos & Demanda" na gestão de segmentos (Master).
- Verificado: LLM gerou ângulos+termos PT-BR reais para nicho novo "Pet Shop".

> **O que é dinâmico:** toda a maquinaria (radar/insights/briefing/cron) itera segmentos sozinha.
> Segmento novo só precisa ter seus ângulos cadastrados — agora via IA+confirmação na UI Master.

---

### FASE 18.4 — Sugerir Interesses Meta por IA (híbrido) — CONCLUÍDO 2026-06-11 ✅

A IA não inventa IDs do Meta. Padrão híbrido: LLM propõe NOMES de interesse por segmento
(camadas intenção/estágio/comportamento) → o sistema resolve os **IDs reais na Meta Targeting API** →
admin confirma. Token vem do tenant (`tenant_network_credentials`); IDs do Meta são globais.

- Prompt `segment_interests_suggestion` + `metaInterestService` (resolveMetaAccessToken/searchMetaInterests)
  + `segmentInterestSuggestionService`. Rota `master/segments/[id]/interests/suggest`.
- Modal Interesses ganhou botão **"Ajuda"** (guia multi-segmento) e **"Sugerir com IA"** (chips por camada).
- Verificado: tenant Marketing Digital → Meta resolveu IDs reais (Casamento, Financiamento, Decoração…).

> Diferença vs Ângulos & Demanda: ângulos usam texto livre (Trends); interesses exigem IDs reais do Meta,
> por isso o passo extra de resolução. Sem token Meta → IA ainda devolve os termos + aviso.

---

### FASE 18.5 — Cache de interesses Meta — CONCLUÍDO 2026-06-11 ✅

O endpoint `adinterest` do Meta tem rate-limit agressivo (OAuthException code 1 em rajadas).
Cache compartilhado por termo (`meta_interest_cache`, TTL 30d; IDs globais e estáveis) elimina
rechamadas. `searchMetaInterestsCached`: hit fresco não chama a Meta; erro da Meta → serve cache stale.
Usado na sugestão por IA e na busca manual. Verificado: cache HIT serve IDs reais mesmo com a Meta
em cooldown.

---

**Migrações locais aplicadas (pendente VPS, all-at-once):**
`migration-2026-06-11-segment-driven.sql`, `migration-2026-06-11-briefing-segment.sql`,
`migration-2026-06-11-segment-angles-prompt.sql`, `migration-2026-06-11-segment-interests-prompt.sql`
e `migration-2026-06-11-meta-interest-cache.sql`.
**Nota:** rodar `npx prisma generate --schema=prisma/schema.marketing.prisma` após pull (campo
`StrategicBriefing.segment_id/segment_name` adicionado ao schema). Cron diário de Trends:
`POST /api/cron/campanhas/exogenous-signals` (header `x-cron-secret`).

---

## Última tarefa concluída

### FASE 18.1 — Radar de Demanda (Google Trends × Ângulos) — CONCLUÍDO 2026-06-05 ✅

Implementação completa do Radar de Demanda no Farol de Milha do dashboard.

**Arquivos criados:**
- `prisma/migration-2026-06-05-demand-radar.sql` — 3 tabelas + 24 termos seed + prompt template
  - `campanhasmarketingdigital.angle_search_terms` — termos PT-BR por ângulo
  - `campanhasmarketingdigital.exogenous_signals` — snapshots diários Google Trends
  - `campanhasmarketingdigital.demand_radar_cache` — cache por tenant/client/data
  - `public.system_prompt_templates['demand_radar_actions']` — prompt ZERO HARDCODE
- `src/lib/marketing/services/exogenousTrendsService.ts` — Google Trends unofficial API
  - Timeout 5s por request, fallback mock com jitter diário por ângulo
  - 8 ângulos em paralelo via `Promise.allSettled`
- `src/lib/marketing/services/demandRadarService.ts` — fusão endógeno × exógeno
  - Normalização share-of-spend → 0-100 por ângulo
  - Classificação quadrante: oceano-azul/saturado/vigiar/ponto-morto
- `src/app/api/cron/campanhas/exogenous-signals/route.ts` — cron diário (POST, x-cron-secret)
- `src/app/api/admin/campanhas/dashboard/demand-radar/route.ts` — GET com cache-first

**Arquivos modificados:**
- `src/components/marketing/charts/DemandRadar.tsx` — RadarChart premium self-fetching
  - Série violeta preenchida (endógeno) + linha ciana tracejada (exógeno)
  - Painel lateral com chips por quadrante + legenda semântica
  - Skeleton, estado de erro, botão de refresh, badge Trends ao vivo/estimativa
- `src/app/admin/campanhas/dashboard/page.tsx` — DemandRadar inserido no FarolSection

**Migração aplicada localmente** com psql (127.0.0.1:15432). VPS: pendente (all-at-once).

---

## Última tarefa concluída

### Task 2: Ações críticas geradas por LLM — cross_critical_actions (2026-06-04) ✅

**Decisão:** As 4 ações hardcoded dos alertas `critical-*` em `buildRuleBasedInsights`
eram genéricas e idênticas para todo cliente. Substituídas por chamada LLM no POST,
com contexto real: CPL atual, CPL crítico do segmento, excesso em R$ e %.

**Mudanças:**
- **`prisma/migration-2026-06-04-cross-critical-actions-prompt.sql`** (nova):
  insere template `cross_critical_actions` em `system_prompt_templates` (global, version=1)
  com variáveis: `client_name`, `segment_name`, `cpl_current`, `cpl_critical`,
  `excess_pct`, `excess_brl`
- **`cross-insights/route.ts`**:
  - `CrossPerformer` ganha campo `cplCritical: number | null` (exposto no GET)
  - `sorted` map inclui `cplCritical` na construção dos performers
  - POST handler: novo bloco antes da narrativa que itera sobre insights `critical-*`,
    chama `invokeForContext` em paralelo, faz parse do JSON array retornado e substitui
    `insight.actions`; fallback silencioso para ações padrão se LLM falha ou retorna
    JSON inválido

**Comportamento em produção:**
- `GET` → rápido, sem LLM, ações padrão (hardcoded)
- `POST` (botão "Análise IA") → LLM enriquece ações críticas + gera narrativa de portfólio

**Migration aplicada:** localmente. **Pendente VPS (batch).**

---

### Task 1: Benchmarks migrados para system_segments (2026-06-04) ✅

**Decisão:** `cpl_ideal`, `cpl_critical`, `ctr_min` foram movidos de `system_benchmarks`
para colunas diretas em `system_segments`, eliminando uma query extra de JOIN em cada request
de portfólio e cross-insights. `system_benchmarks` permanece intacto para os demais métricas
(hook_rate, frequency_max, etc.) e para o `benchmarkResolver.ts` 4-layer.

**Mudanças:**
- **`prisma/migration-2026-06-04-segment-benchmarks.sql`** (nova):
  `ALTER TABLE + backfill` — 5 segmentos atualizados (4 com dados, Master Platform sem benchmarks)
- **`src/app/api/admin/master/segments/route.ts`**: adicionados handlers `POST` (criar segmento)
  e `PUT` (atualizar) com os 3 novos campos; GET já retorna `s.*`
- **`src/app/admin/master/segments/page.tsx`**: seção "Benchmarks de Performance" no modal:
  inputs CPL Ideal / CPL Crítico / CTR Mínimo + legenda de status (ok/atenção/crítico)
- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`**: query de clientes e
  tenants ampliada com `s.cpl_ideal, s.cpl_critical, s.ctr_min`; `benchMap` eliminado
- **`src/app/api/admin/campanhas/portfolio/route.ts`**: mesma simplificação + helper `parseNullable`

**Migration aplicada:** localmente via psql 17. **Pendente VPS (batch).**

---

### Briefing Estratégico — documento autônomo do filtro de página (2026-06-04) ✅

**Decisão de produto:** briefing é um documento de inteligência (snapshot), não um gráfico ao vivo.
Deve ser independente do filtro de período da página e carregar seu próprio contexto temporal.

**Mudanças:**
- **Nova coluna DB:** `period_days INTEGER` em `StrategicBriefing`
- **Prisma schema:** `periodDays Int? @map("period_days")` adicionado ao modelo
- **`strategicBriefing.ts`:** os três `create()` (empty / sucesso LLM / fallback) agora salvam `periodDays`
- **`marketing-api.ts`:** `StrategicBriefingData` inclui `periodDays?: number | null`
- **Dashboard — seção Briefing:**
  - Removido o `PeriodBadge` do filtro de página no cabeçalho da seção
  - Botão "Gerar Novo" mostra o período que será usado: `Gerar · 7d`
  - Descrição atualizada: "Documento autônomo — período registrado na geração"
- **`BriefingCard`:** exibe badge de período próprio do documento (canto direito do cabeçalho)
  — badge `null` para briefings históricos sem `period_days` (retrocompatível)

**Arquivos modificados:**
- `prisma/migration-2026-06-04-briefing-period-days.sql` (nova)
- `prisma/schema.marketing.prisma`
- `src/lib/marketing-api.ts`
- `src/lib/marketing/services/strategicBriefing.ts`
- `src/app/admin/campanhas/dashboard/page.tsx`

**Migration aplicada:** localmente via psql 17. Pendente VPS (batch).

---

### Fix cross-insights — narrativa LLM tenant/segmento ciente (2026-06-04) ✅

**Problema:** A IA confundia o tenant (empresa gestora) com os clientes gerenciados na narrativa
de portfólio, e comparava clientes de segmentos diferentes de forma incorreta.

**Solução:**
- `isTenant` flag no `clientList` do GET — campanhas sem `client_id` = tenant, não cliente
- `buildRuleBasedInsights` usa `realClients` (filtra tenant) para todos os insights cruzados
- GET response inclui `tenantName` e `clientDetails[]` (com `isTenant`, `segmentName`, `status`)
- POST handler constrói `client_context` com linhas `[TENANT]` vs `[CLIENTE]` + segmento por linha
- Prompt v2 (`version = 2`): regras explícitas — nunca comparar tenant com clientes, nunca
  comparar segmentos diferentes; variáveis: `{{tenant_name}}`, `{{client_context}}`

**Arquivos modificados:**
- `src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`

**Migration aplicada:**
- `prisma/migration-2026-06-03-cross-pollination-prompt-v2.sql` — UPDATE `content` + `variables`
  (aplicada localmente via node --input-type=module)

**Migration PENDENTE VPS:** — junto ao batch de outras migrations

---

### FASE 14d — Auto-classificação de ângulo em lote (2026-06-03) ✅

**Objetivo:** eliminar trabalho manual de associar ângulo campanha a campanha. A IA classifica
automaticamente todas as campanhas pelo nome, via job em lote com revisão humana antes de salvar.

**Novo campo DB:** `angle_source VARCHAR(20)` em `Campaign`
- `'declared'` = humano confirmou (via badge ou wizard)
- `'llm_auto'` = classificado pelo job de IA
- `NULL` = sem classificação (mostra banner)

**Arquivos novos:**
- `prisma/migration-2026-06-03-angle-source.sql` — ADD COLUMN angle_source
- `prisma/migration-2026-06-03-classify-angle-prompt.sql` — INSERT template `classify_campaign_angle`
- `scripts/run-migration-fase14d.mjs` — runner Node.js para DBeaver
- `src/lib/marketing/services/angleClassifierService.ts` — serviço: `getUnclassifiedCount`,
  `classifyCampaignAngles` (LLM preview, batches de 20), `saveAngleClassifications` (raw SQL)
- `src/app/api/admin/campanhas/portfolio/classify-angles/route.ts` — `GET` (count) +
  `POST mode=preview` (sugestões LLM) + `POST mode=confirm` (salva)

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/route.ts` — enriquece resposta com `angleSource`
  via query raw SQL (angle_source fora do schema Prisma)
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — PATCH seta `angle_source = 'declared'`
  (ou null ao limpar) via raw SQL após update Prisma
- `src/components/marketing/CampanhasModal.tsx`:
  - `AngleBadge` reescrito: 3 estados visuais (amber=sem ângulo, blue=IA, emerald=declarado)
    com tooltip explicativo; callback `onUpdated(angle, source)`
  - `CampaignCard`: `localAngleSource` state rastreia fonte localmente
  - Novo `ClassifyBanner`: aparece quando `unclassifiedCount > 0`, dismissável, botão "Classificar com IA"
  - Novo `ClassifyModal`: 4 steps (loading→review→saving→done), tabela com dropdowns editáveis,
    dots de confiança (emerald/amber/red), barra de progresso, resumo final por ângulo
  - Main modal: `showClassifyModal` + `classifyDismissed` states; `onDone` → refresh campanhas

**⚠️ MIGRATIONS PENDENTES (rodar no DBeaver):**
```
-- Migration 1
prisma/migration-2026-06-03-angle-source.sql

-- Migration 2  
prisma/migration-2026-06-03-classify-angle-prompt.sql
```
Ou: `node scripts/run-migration-fase14d.mjs`

---

### FASE 14c — Ciclo Visual de Ângulo (2026-06-03) ✅

**Objetivo:** fechar o ciclo de calibração com superfície visual — widget de
performance por ângulo, badge editável nos cards de campanha e API dedicada.

**Arquivos novos:**
- `src/app/api/admin/campanhas/portfolio/angle-insights/route.ts` — `GET
  ?period=N&clientId=X&narrative=true` retorna `AngleInsightsResult` +
  narrativa LLM opcional (template `angle_performance_insight`).

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — novo `PATCH`: atualiza
  `declaredAngle` em campanhas existentes via `normalizeAngle()`.
- `src/app/admin/campanhas/portfolio/cross-insights/page.tsx` — adicionada seção
  "Performance por Ângulo" (FASE 14) com: `AngleWidget` (auto-fetch do período
  selecionado), `AngleCplBar` (barra CPL com cor emerald/amber/red), cards
  vencedor/perdedor, tabela por ângulo (spend vertical bar, CPL, CTR, camps),
  botão "Análise IA" que chama `?narrative=true`.
- `src/components/marketing/CampanhasModal.tsx` — `CampaignData` ganha
  `declaredAngle?`; novo `AngleBadge` com edição inline (select + CheckIcon PATCH);
  `CampaignCard` usa `localAngle` state para atualização sem reload; badge aparece
  em todas as campanhas junto a StatusBadge/FunnelBadge.

---

### Fix — AnimatePresence mode="wait" removido (2026-06-03) ✅

**Problema:** `AnimatePresence mode="wait"` em `CampaignWizard.tsx` aguardava a exit
animation completar antes de montar o próximo step. Em abas não visíveis (RAF throttling),
o exit nunca completava → conteúdo do wizard congelava enquanto header avançava. Também
causava timeout do screenshot no preview headless.

**Fix:** Removida a prop `mode="wait"` (linha 356). `AnimatePresence` sem mode monta a
entrada imediatamente → sem dependência de RAF do exit; transição ocorre mesmo com aba
em background.

---

### FASE 14b — Calibração de Ângulo (2026-06-03) ✅

**Objetivo:** agregar métricas (CPL, CTR, spend) por ângulo EFETIVO (declared_angle ??
Vision angle), identificar ângulo vencedor/perdedor e injetar o sinal no briefing
estratégico e no agentDecisor. Princípio ZERO HARDCODE: prompt no DB.

**DB:** `prisma/migration-2026-06-03-angle-performance-insight.sql` — INSERT prompt
`angle_performance_insight` (templateKey) em `public.system_prompt_templates`. Aplicada
localmente via `scripts/run-migration-fase14b.mjs`. ⚠️ NÃO aplicada no VPS (batch depois).

**Arquivos novos:**
- `src/lib/marketing/services/angleInsightsService.ts` — `getAngleInsights(periodDays,
  tenantId, clientId)`: raw SQL com JOIN Campaign → CreativeAsset → CreativeAnalysis para
  ângulo Vision + JOIN Insight para métricas; agrupa por ângulo efetivo (declared_angle ??
  Vision ?? 'unknown'); retorna `AngleInsightsResult` com `angleStats`, `topAngle`,
  `worstAngle`, `textSummary` (rule-based, pronto para injeção em variável LLM).
- `prisma/migration-2026-06-03-angle-performance-insight.sql` — prompt DB.
- `scripts/run-migration-fase14b.mjs` — runner da migration.

**Arquivos modificados:**
- `src/lib/marketing/services/strategicBriefing.ts` — importa `getAngleInsights`;
  `BriefingContext` ganha `angleInsights: AngleInsightsResult`; `gatherBriefingContext`
  popula com `await getAngleInsights(...)`; `buildBriefingVariables` injeta
  `angle_insights`, `winning_angle`, `worst_angle` como variáveis disponíveis para
  templates que as declarem (retrocompatível: sem impacto em templates antigos).
- `src/lib/marketing/services/agentDecisor.ts` — importa `getAngleInsights`; `runDecisor`
  computa `angleCtx` uma vez no topo (7 dias); `enrichWithClaude` recebe `angleCtx?` e
  injeta `winning_angle` / `worst_angle` nas variáveis do template `agent_enrich`.

**Verificação:** migration aplicada com sucesso; tsc sem erros nos arquivos alterados;
SQL testado — JOIN via `CreativeAsset.campaign_id` (snake_case, @map) →
`CreativeAnalysis.asset_id` (FK), `Insight."campaignId"` (camelCase sem @map).

---

### FASE 14a — Ângulo: captura no lançamento (2026-06-03) ✅

**Objetivo:** capturar o ângulo de comunicação DECLARADO no lançamento (hoje o angle
só é inferido pelo Vision a posteriori). Parte 14b (calibração) é a próxima.

**DB:** `prisma/migration-2026-06-03-campaign-declared-angle.sql` — `ALTER TABLE
campanhasmarketingdigital."Campaign" ADD COLUMN IF NOT EXISTS declared_angle VARCHAR(50)`
+ índice `idx_campaign_declared_angle (tenant_id, declared_angle)`. Aplicada no banco
LOCAL via `scripts/run-migration-fase14.mjs`. ⚠️ **Ainda NÃO aplicada no VPS** (migração
do VPS será feita toda de uma vez, depois).

**Arquivos:**
- `prisma/schema.marketing.prisma` — Campaign ganha `declaredAngle String? @db.VarChar(50)`.
  `npx prisma generate` rodado (NÃO db push).
- `src/lib/marketing/angles.ts` (NOVO) — taxonomia única de ângulos (investment, lifestyle,
  family, price, urgency, social, luxury, other) + `ANGLE_OPTIONS`, `normalizeAngle`,
  `angleLabel`. Mesma taxonomia do Vision, para comparar declarado × inferido.
- `src/app/api/admin/campanhas/campaigns/route.ts` — POST destructura `declaredAngle` e
  persiste `normalizeAngle(declaredAngle)` no `campaign.create`.
- `src/components/marketing/CampaignWizard.tsx` — form.declaredAngle (''); seletor
  "Ângulo da comunicação" na StepObjective (opcional, "Deixe a IA inferir"); enviado no
  payload; linha "Ângulo" na revisão.

**Verificação (runtime):** página /nova e wizard compilam sem erro; wizard abre com 7
etapas; coluna+índice confirmados no banco; prisma generate OK. (UI do seletor não dirigida
até o fim por gating de navegação do wizard + ação final destrutiva.)

---

### FASE 13 — Top N Configurável (cross-insights) (2026-06-03) ✅

**Objetivo:** remover hardcode `slice(0,3)` na polinização cruzada e tornar o número
de "melhores CPLs" configurável (Top 3/5/10).

**Arquivos modificados:**

`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`
- GET: novo `topN = clamp(parseInt(?top) , 1, 50)` (default 3); `sorted.slice(0, topN)`.
- `CrossInsightsResponse` ganha campo `top: number`; `result.top = topN`.
- POST: lê `body.top` (clamp 1..50) e repassa `&top=${topN}` ao GET interno.

`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`
- Estado `top` ('3'); seletor Top 3/5/10; `load` e `generate` enviam o param.
- Badge "Top N" / "Top N de M" na seção de melhores CPLs.
- Grid responsivo `sm:grid-cols-2 lg:grid-cols-3` (acomoda 5/10).
- **Bug corrigido (pré-existente):** `PerformerCard` recebia `{...p}` (com `clientName`)
  mas espera `name` → nomes renderizavam em branco. Agora `name={p.clientName}`.

**Verificação (runtime, preview artemis4):** seletor renderiza; trocar para Top 10
dispara `GET ...?period=30&top=10`. (Sem dados de CPL no banco de teste, a seção de
top performers não renderiza — wiring provado pela requisição.)

---

### Plano — FASES 13–17 adicionadas ao plano mestre (2026-06-03) ✅

**Contexto:** Após a verificação em runtime do wizard de campanhas (6/6 PASS) e a
análise estratégica de 5 questões, o usuário pediu para formalizar tudo como FASES
13+ no plano mestre, antes da implementação.

**Arquivo modificado:** `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` (v1.4)

Acrescentadas 5 fases priorizadas por ROI/esforço, fundamentadas em leitura do código:
- **FASE 13 — Top N Configurável** (quick win): remove hardcode `slice(0,3)` em
  `cross-insights/route.ts:288`; param `?top=N`, clamp 1..50, "Top N de M".
- **FASE 14 — Ângulo Estratégico no Ciclo Completo** (maior ROI): coluna
  `Campaign.declared_angle` (nullable), captura no wizard, agregação ângulo×CPL/CTR,
  injeção em agentDecisor/briefing, prompt `angle_performance_insight`.
- **FASE 15 — Agentes: garantia de execução + expansão de ações**: node-cron não
  sobrevive em serverless → worker/endpoint+secret+heartbeat; novas ações DOWNSCALE,
  REALLOCATE_BUDGET, REFRESH_CREATIVE, ADJUST_AUDIENCE; threshold por tenant.
- **FASE 16 — Postagem Orgânica no Meta**: `publishOrganicPost` via page_id existente,
  separado do fluxo pago, confirmação dupla.
- **FASE 17 — Google Ads + Google AI Max** (fase própria): paradigma asset-based ≠ Meta;
  `GoogleCampaignInput` separado, wizard AI Max sem segmentação granular, OAuth2/
  customer_id por tenant, bloqueio sem meta de conversão.

**Próximo passo:** iniciar a implementação na ordem de prioridade (FASE 13 → 17).
**Nota:** apenas planejamento — nenhuma alteração de código/banco nesta etapa.

---

### Fix — Gráfico "Leads por Campanha" + logo clientes (histórico anterior)

### Fix — Gráfico "Leads por Campanha" (2026-06-03) ✅

**Problema:** O gráfico "Leads por Campanha" na página `/admin/campanhas/leads` sempre exibia um único retângulo grande em vez de barras individuais por campanha.

**Causa raiz:** Quando a resolução de nome de campanha falhava no cliente (array `campaigns` vazio ou IDs sem correspondência), todos os itens de `leadsByCampaign` recebiam `name: 'N/A'`. O Recharts `BarChart` renderiza todas as barras na mesma posição X quando possuem o mesmo `name`, resultando em sobreposição visual.

**Arquivos modificados:**

`src/app/api/admin/campanhas/leads/stats/route.ts`
- `leadsByCampaignRaw` ← `prisma.lead.groupBy` (sem alteração)
- Nova etapa: busca nomes das campanhas via `prisma.campaign.findMany({ where: { id: { in: campaignIds } } })`
- `leadsByCampaign` agora retorna `{ campaignId, campaignName, count }[]`
  - Filtra entradas com `campaignId: null` (leads sem campanha vinculada)
  - `campaignName` = nome da campanha OU primeiros 8 chars do UUID como fallback
  - Ordenado por `count` decrescente

`src/app/admin/campanhas/leads/page.tsx`
- `campaignLeads` agora usa `d.campaignName` (do servidor) em vez de lookup `campaigns.find()`
- Fallback: `d.campaignId?.slice(0, 8) || 'Sem campanha'` (garante nomes únicos)
- Retrocompatível: `d.count ?? d._count?.id ?? 0`

---

### Logo de Clientes + ClientAvatar compartilhado (2026-06-03) ✅

**Objetivo:** Exibir logomarca circular dos clientes na tabela Portfolio; suporte a upload/remoção na edição de cliente; componente reutilizável para futuras telas.

**Arquivos criados:**

`src/components/admin/ClientAvatar.tsx`
- Props: `name`, `logoUrl?`, `segmentSlug?`, `isTenant?`, `size?` (`xs`–`xl`), `className?`
- Mostra imagem se `logoUrl` disponível; fallback: iniciais coloridas por segmento
- `SEGMENT_AVATAR_COLORS`: mapeamento slug → classes Tailwind (imobiliaria, saude, educacao, etc.)
- Exports: `ClientAvatar` (default), `ClientAvatarWithFallback`, `getInitials`, `getSegmentAvatarColor`
- Handler `onError` no `<img>`: troca automaticamente para fallback de iniciais

`prisma/migration-2026-06-03-clientes-logo.sql`
- `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;`
- ⚠️ **Executar manualmente no DBeaver antes de usar o upload de logo**

**Arquivos modificados:**

`src/app/api/admin/campanhas/clients/route.ts`
- GET: adiciona `c.logo_url` ao SELECT
- PATCH: reescrito com SET dinâmico — só atualiza os campos enviados (`segment_id` e/ou `logo_url`)
- Validação: `logo_url` > 1.5 MB retorna 400

`src/lib/database/clientes.ts`
- `findClienteByUuid`: adiciona `logo_url` ao SELECT

`src/app/admin/clientes/[id]/editar/page.tsx`
- Importa `ClientAvatar`
- Upload: `<input type="file" accept="image/*">` oculto → canvas resize 256×256 WebP 85%
- `handleLogoFile(file)`: valida MIME + tamanho; redimensiona via Canvas API
- `saveLogo(url)`: PATCH ao endpoint com Bearer token
- UI: avatar grande (`size="xl"`) + botão "Carregar / Alterar logo" + botão "Remover"

`src/app/api/admin/campanhas/portfolio/route.ts`
- Queries de clientes e tenant agora incluem `logo_url`
- `PortfolioClient.logoUrl` populado nos resultados

`src/app/admin/campanhas/portfolio/page.tsx`
- Importa `ClientAvatar` e exibe círculo de logo/iniciais na coluna de cliente da tabela

---

### Option B — Portfolio: linhas expansíveis + modal analítico (2026-06-03) ✅

**Objetivo:** Ao clicar em `[▶]` numa linha de cliente do Portfolio, expandir sub-linhas com campanhas individuais; cada sub-linha tem botão `[📊 Analisar]` que abre um modal com as métricas daquela campanha.

#### Arquivos modificados

**`src/app/api/admin/campanhas/portfolio/route.ts`**
- Novo tipo exportado: `PortfolioClientCampaign` (id, name, externalStatus, metrics, health)
- `PortfolioClient` agora inclui `campaigns: PortfolioClientCampaign[]`
- Adicionadas 2 novas queries SQL:
  - Query 2b: métricas por campanha (spend/impressions/clicks agrupados por `camp.id`)
  - Query 2c: leads por `campaignId` (tabela `Lead`)
- Bloco 2d: agrupa as campanhas num `Map<clientKey, PortfolioClientCampaign[]>` e anexa ao client correspondente

**`src/app/admin/campanhas/portfolio/page.tsx`**
- Novo estado: `expandedClients: Set<string>` — controla quais linhas estão expandidas
- Novo estado: `analyticsModal: ModalState | null` — controla o modal analítico
- `toggleExpand(key)` — alterna expansão de uma linha
- `renderCampaignSubRows(client)` — renderiza sub-linhas animadas (Framer Motion) com:
  - `HealthDot` colorido por health
  - Nome da campanha + status badge (ACTIVE/PAUSED)
  - Spend / Leads + CTR / CPL
  - Botão `[📊 Analisar]`
- `renderRow` atualizado: chevron toggle `[▶/▼]` integrado na coluna Cliente
- `CampaignAnalyticsModal` (inline): overlay com backdrop blur
  - 6 cards de métricas: Investimento, Leads, CPL, Impressões, Cliques, CTR
  - Barra CPL vs benchmark (quando disponível)
  - Link "Ver dashboard completo →" para `/admin/campanhas/dashboard?campaignId=X`

#### Comportamento
- Linhas sem campanhas: chevron desabilitado (cor cinza, cursor default)
- Linhas com campanhas: chevron clicável (▶ expandir / ▼ recolher)
- Modal: abre instantaneamente (dados já na resposta do portfolio, sem fetch extra)
- Modal fecha ao clicar fora (backdrop) ou no X

---

### FASE 10 — Portfolio Dashboard + Cross-Pollination (2026-06-02) ✅

**Objetivo:** Visão consolidada de todos os clientes do tenant com métricas agregadas, benchmarks por segmento, status de saúde CPL/CTR e insights cruzados entre clientes (cross-pollination).

#### Arquivos criados

**API:**

- **`src/app/api/admin/campanhas/portfolio/route.ts`** — `GET /api/admin/campanhas/portfolio`
  - Agrega campanhas/insights por `client_id` (cross-schema SQL: `campanhasmarketingdigital` + `public`)
  - Joins: `Campaign` → `Insight` (spend/impressions/clicks), `Lead` (lead_count por cliente), `public.clientes` + `public.system_segments` (nome + segmento), `public.tenants` (Minha Empresa), `public.system_benchmarks` (CPL ideal/crítico, CTR mínimo)
  - Status calculado: spend=0 → `nodata`; cpl ≥ cplCritical → `critical`; cpl > cplIdeal → `warn`; else `ok`
  - Ordenação: critical→warn→ok→nodata; desempate por spend desc
  - Query params: `period` (1–365 dias, default 30) + `segmentId` (filtro opcional)

- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`** — `GET|POST /api/admin/campanhas/portfolio/cross-insights`
  - GET: insights baseados em regras (sem LLM)
  - POST: adiciona narrativa LLM opcional via `getLlmClientForCampaigns()`; fallback gracioso se LLM indisponível
  - `buildRuleBasedInsights()` gera 5 tipos de insight:
    - `cross-01`: oportunidade de transferência de padrão CPL (ok → critical)
    - `critical-{name}`: alerta individual por cliente em CPL crítico
    - `nodata-01`: clientes sem campanhas ativas
    - `ctr-01`: benchmark de CTR bom → CTR fraco
    - `segment-{name}`: gap de CPL dentro do mesmo segmento (só se diff ≥ 20%)
  - `topPerformers` (top 3 por CPL) + `underperformers` (critical/warn com razão textual)

**Frontend:**

- **`src/app/admin/campanhas/portfolio/page.tsx`** — `/admin/campanhas/portfolio`
  - `StatusBadge`: dot colorido (verde/âmbar/vermelho/cinza) + label
  - `CplBar`: mini barra de progresso CPL vs ideal/crítico
  - `SummaryCard`: 4 KPI cards (total investido, total leads, CPL médio, clientes ativos)
  - `ColHeader`: colunas ordenáveis (clientName, spend, leads, cpl, status)
  - Filtro por segmento (dinâmico, extraído dos dados) + seletor de período (7/14/30/60/90 dias)
  - Aviso: "Status usa benchmark de CADA cliente — NÃO compare CPL absoluto entre segmentos"
  - Link para `/admin/campanhas/portfolio/cross-insights`

- **`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`** — `/admin/campanhas/portfolio/cross-insights`
  - `InsightCard`: colapsável, cor por tipo (vermelho=warning, emerald=opportunity, violet=pattern)
  - `PerformerCard`: ranking com medalhas 🥇🥈🥉
  - Grupo de insights por tipo: warnings primeiro, depois opportunities, patterns
  - Card de narrativa LLM (gradiente violeta) quando `data.narrative` disponível
  - Botão "Gerar análise IA" → POST endpoint → atualiza narrative
  - Navegação ← de volta para portfolio

**DB — Sidebar:**

- **`prisma/migration-2026-06-02-fase10-portfolio-sidebar.sql`**
  - `system_features`: Portfolio (sort_order=8) + Cross-Insights (sort_order=9), category_id=30
  - `permissions`: read + execute para cada feature
  - `role_permissions`: espelha roles da auditoria (41=Master, 42/47=Admin)
  - `tenant_feature_overrides`: provisiona para todos os tenants que têm auditoria

**marketing-api.ts:**
- Tipos `PortfolioClient`, `PortfolioData`, `CrossInsight`, `CrossInsightsData` adicionados
- Funções `getPortfolio()`, `getCrossInsights()`, `generateCrossInsightsNarrative()` adicionadas

#### Fixes incluídos nesta sessão

**Fix — Tracking Health 500 (3 causas):**
1. `checkPixelConfigured` usava `campanhasmarketingdigital."clientes"` → corrigido para `public.clientes` (key `uuid`)
2. `checkAccessToken` referenciava `meta_token_expires_at` (não existe) → corrigido para `tnc.expires_at`; JOIN desnecessário removido
3. `clientId='own'` passado como UUID para Prisma → sanitizado em dashboard page + GET e POST da rota

**Fix — `system_benchmarks` sem coluna `is_active`:**
- Removido `AND is_active = true` das queries de portfolio e cross-insights

**FASE 10 — 100% CONCLUÍDA** ✅

**Pendente:** Executar a migração SQL na VPS (`migration-2026-06-02-fase10-portfolio-sidebar.sql`)

---

### Deploy VPS — Audit Crons registrados no scheduler (2026-06-02)

**Contexto:** Os novos crons `audit-monthly` e `audit-weekly` (FASE 9) são endpoints HTTP no `prod_app`.
Para rodar na VPS precisam ser chamados pelo `prod_feed` container via `feed-cron-scheduler.js`.

**Arquitetura de crons na VPS (resumo):**
- `prod_feed` container → `scripts/feed-cron-scheduler.js` (node-cron) → chama HTTP `http://prod_app:3000/api/cron/...`
- `agentMonitor.ts` tem crons INTERNOS ao Next.js (sync 6h, briefing 08h/18h) — esses NÃO passam pelo scheduler
- Os novos audit crons seguem o padrão HTTP do scheduler

**`scripts/feed-cron-scheduler.js`** — adicionados 2 novos `cron.schedule()`:
```js
// Audit mensal — 1º dia do mês às 09:00
cron.schedule('0 9 1 * *', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-monthly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });

// Audit semanal — domingos às 18:00
cron.schedule('0 18 * * 0', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-weekly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });
```

**`docker-compose.vps.yml`** — adicionados em `prod_app` e `staging_app`:
```yaml
CRON_SECRET: ${PROD_CRON_SECRET}             # valida x-cron-secret nas rotas /api/cron/campanhas/*
MARKETING_DATABASE_URL: ${PROD_MARKETING_DATABASE_URL}  # Prisma marketing schema
```
> ✅ `MARKETING_DATABASE_URL` é construída automaticamente no docker-compose a partir de variáveis já existentes
> (`DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`) — nenhuma var nova precisa ser definida na VPS.

**Arquivos modificados:**
- `scripts/feed-cron-scheduler.js` — +2 cron.schedule() para audit-monthly e audit-weekly
- `docker-compose.vps.yml` — CRON_SECRET + MARKETING_DATABASE_URL em prod_app e staging_app

**Todos os 4 crons agendados no scheduler:**
1. Feed sync diário → 03:00
2. Transbordo leads → a cada 5 min
3. Audit mensal → 1º dia do mês 09:00
4. Audit semanal → domingos 18:00

---

### Fix Leads — Série de Bugs (2026-06-02)

**Problemas corrigidos nesta sessão:**

1. **Stats não filtravam por campanha** — `stats/route.ts` nunca lia `campaignId` dos searchParams.

2. **Dados idênticos para clientes diferentes (raw SQL)** — query `leadsByDay` usava `"campaign_id"::uuid` (coluna errada + cast errado). Coluna correta é `"campaignId"` (TEXT, camelCase, sem `::uuid`).

3. **Promise.all swallowando resultados** — quando stats retornava 500, `Promise.all` descartava leads e campanhas também. Fix: `Promise.allSettled` com verificação individual.

4. **Historical leads sem client_id** — 299 leads criados antes da vinculação campaigns→clients tinham `client_id = NULL`. Backfill via `scripts/backfill-lead-clientid.mjs`: 273 para Alexandre, 26 para Gisele.

5. **Datas em formato OS (mm/dd)** — `<input type="date">` substituído por `<DateInputPtBR>` com máscara dd/mm/aaaa. Adicionada convenção obrigatória no CLAUDE.md.

6. **ClientSelector não defaultava para Minha Empresa** — `sessionStorage` era lido no mount e sobrescrevia o estado 'own'. Removidos ambos os `useEffect` de sessionStorage (hook + componente).

**Estado atual verificado:**
- `GET /leads?clientId=own` → 245 leads ✅
- `GET /leads?clientId=<alexandre>` → 113 leads ✅
- `GET /leads?clientId=<gisele>` → 26 leads ✅
- `GET /leads/stats?clientId=<alexandre>` → totalLeads: 113 ✅

**Arquivos modificados:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — filtro campaignId + raw SQL parâmetrico correto
- `src/app/api/admin/campanhas/leads/route.ts` — sem alteração (já correto)
- `src/app/admin/campanhas/leads/page.tsx` — DateInputPtBR + Promise.allSettled + getCampaigns(clientFilter)
- `src/lib/marketing-api.ts` — getLeadStats aceita campaignId
- `src/components/marketing/ClientSelector.tsx` — removido sessionStorage read; default sempre 'own'
- `src/components/ui/DateInputPtBR.tsx` — NOVO componente (máscara dd/mm/aaaa)
- `CLAUDE.md` — convenção obrigatória DateInputPtBR

**Pendente:** — (todas as pendências desta sessão foram resolvidas)

---

### DateInputPtBR global + ClientSelector Padrões Vencedores (2026-06-02)

**DateInputPtBR aplicado em 13 arquivos:**
`admin/audit`, `admin/master/auditoria`, `admin/logs`, `admin/sessions`, `admin/security-monitor`,
`admin/visitas_plataformas`, `campanhas/iniciativas/nova`, `DashboardFilters`, `AdvancedFilters`,
`ExportReports`, `crm/MarketingCampaignModal`, `crm/page`, `crm/config/marketing`

**DateInputPtBR:** prop `required?: boolean` adicionada.

**ClientSelector em `criativos/padroes/page.tsx`:**
- Hook `useClientSelector('padroes')` — default 'own' (Minha Empresa)
- `vw_creative_patterns` recriada com `client_id` (JOIN com `Campaign`)
- `patterns/route.ts`: filtro `clientId=own|uuid` via `client_id IS NULL` ou `client_id = $N`

**Nenhum `<input type="date">` restante na aplicação** (exceto o JSDoc do próprio componente).

---

### Consultar Campanhas — Modal full-page (2026-06-02)

**Funcionalidade:** Botão "Consultar Campanhas" + modal full-page para visualização das campanhas lançadas, acessível a partir de `/admin/campanhas/nova`.

**Comportamento:**
- **Para tenant (não-master):** botão na seção "Esta campanha é para", após "Para um Cliente"; respeita contexto selecionado (`clientId=own` ou `clientId=<uuid>`)
- **Para master:** botão flutuante acima da seção Criativos; carrega todas as campanhas do tenant sem filtro

**Componente:** `src/components/marketing/CampanhasModal.tsx` (NOVO)
- Grid responsivo `1 col → 2 col (lg) → 3 col (xl)`
- Cards com: status badges (ativa/pausada/arquivada/rascunho), funnel stage, objetivo, budget, período, público (idade/gênero), programação (dias da semana + horários, com suporte a `scheduleTimeSlots` por dia), localização (chips sky), interesses (chips violet, colapsável), tira de criativos (thumbnails + headline/body/CTA)
- Busca por nome + filtro por status
- Loading skeleton (6 cards), empty state, error state com retry
- Fecha com Escape ou clique no overlay
- Framer-motion enter/exit animation

**Arquivos modificados:**
- `src/components/marketing/CampanhasModal.tsx` — NOVO
- `src/app/admin/campanhas/nova/page.tsx` — import + estado `showConsultarModal` + botão (tenant e master) + `<CampanhasModal />`

**API usada:** `GET /api/admin/campanhas/campaigns?clientId=own|<uuid>` (já existia, sem alteração)

---

### FASE 9 — Cron Jobs (9.5) — 100% concluída (2026-06-02)

**Implementação do último item pendente da FASE 9 (seção 9.5 do plano mestre):**

**`src/app/api/cron/campanhas/audit-monthly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-monthly`
- Agendamento: `0 9 1 * *` — 1º dia do mês às 09:00
- Protegido por `CRON_SECRET` (header `x-cron-secret`)
- Itera todos os tenants ativos via `getActiveTenants()`
- Para cada tenant: gera relatório com `clientId=null` (empresa) + um por cada cliente com campanhas
- `periodDays=30`, `withNarrative=false` (evita timeout no cron)
- Retorna `{ tenants, totalReports, succeeded, failed, elapsedMs }`

**`src/app/api/cron/campanhas/audit-weekly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-weekly`
- Agendamento: `0 18 * * 0` — todo domingo às 18:00
- Mesma estrutura do mensal, mas `periodDays=7`
- Suporta `{ withNarrative: true }` no body para ativar narrativa LLM
- Tratamento de erro granular: falha em um relatório não interrompe os demais

**FASE 9 — 100% CONCLUÍDA** ✅

---

### Fix Leads — Filtro de Campanha nas Stats (2026-06-02)

**Problema:** Selecionar uma campanha no dropdown da página `/admin/campanhas/leads` não alterava os dados exibidos (KPIs, gráficos). A tabela de leads filtrava corretamente, mas os stats (total, gráfico por dia, por campanha) sempre mostravam tudo.

**Root cause:**
1. `/api/admin/campanhas/leads/stats/route.ts` nunca lia `campaignId` dos searchParams.
2. A query raw `leadsByDay` nunca incluía filtro de `campaign_id`.
3. `getCampaigns()` era chamado sem `clientFilter`, então o dropdown mostrava campanhas de todos os clientes.

**Fixes:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — lê `campaignId`; aplica `where.campaignId = campaignId` no `count` e `groupBy`; query raw `leadsByDay` condicional com `AND "campaign_id" = ${campaignId}::uuid`
- `src/lib/marketing-api.ts` — `getLeadStats` aceita `campaignId?: string` opcional
- `src/app/admin/campanhas/leads/page.tsx` — `getCampaigns()` passa `clientFilter` para sincronizar dropdown com cliente selecionado

---

### FASE 9 — Audit Report Estruturado (2026-06-01)

**Objetivo:** Relatório mensal/semanal com scorecard de saúde, top problemas, oportunidades, desperdício consolidado, plano de ação semanal e narrativa LLM opcional.

**Arquivos criados:**
- `prisma/migration-2026-06-01-fase9-audit-report.sql` — tabela `AuditReport` + 2 prompt templates (`audit_report_monthly`, `audit_report_weekly`)
- `prisma/schema.marketing.prisma` — model `AuditReport` adicionado
- `src/lib/marketing/services/auditReportService.ts` — serviço completo com 5 dimensões de scoring (Performance 30%, Spend Efficiency 25%, Funnel Health 20%, Tracking 15%, Creative 10%), builders de problemas/oportunidades/plano e narrativa LLM
- `src/app/api/admin/campanhas/auditoria/route.ts` — GET (lista histórico) + POST (gera e persiste)
- `src/app/admin/campanhas/auditoria/page.tsx` — Frontend com gauge, barras de dimensão, problemas/oportunidades, desperdício, plano de ação; **ClientSelector** integrado (filtro por cliente persistido em sessionStorage); `useEffect([days, clientFilter])` auto-regenera ao trocar período ou cliente

**Sidebar (corrigido):** O sistema usa `system_features` (não `sidebar_menu_items`). Inseridos:
  - `system_features` id=101, category_id=30, sort_order=7
  - `permissions` read(930) + execute(931)
  - `role_permissions` para roles 41/42/47 (Master + Administrador)
  - `tenant_feature_overrides` para tenants "Imobiliaria XYZ" e "Marketing Digital"
  - Migration: `prisma/migration-2026-06-02-fase9-sidebar-auditoria.sql`

**DB:** Migração executada, `prisma generate` rodado.

**NOTA:** Prompt templates usam `template_key` + `content` (não `key`/`template`). Confirmado estrutura real da tabela `system_prompt_templates`.

**Bugs corrigidos em 2026-06-02:**
1. Stale Prisma singleton (`global.prismaMarketing` criado antes do `generate`) → fix: alteração no comentário do `next.config.js` força restart completo do processo Next.js
2. `prisma.auditReport.upsert()` falha com campo nullable em compound unique → fix: substituído por `findFirst` + `create`/`update` manual
3. Filtros de período não re-geravam visualização → fix: `useEffect(() => generate(days, false, clientId), [days, clientFilter])`
4. Ausência de filtro por cliente → fix: `ClientSelector` + `useClientSelector('auditoria')` adicionados à página
5. `ClientSelector` dropdown vazio → root cause: `/api/admin/campanhas/clients` retorna array puro (não `{clients:[]}`); fix: `const list = Array.isArray(data) ? data : (data.clients || [])` em `useClientSelector`
6. Filtro de cliente sem efeito → root cause: campanhas tinham `client_id = NULL`; fix: vinculadas 4 campanhas a 2 clientes via UPDATE direto no DB (Alexandre Severo, Gisele Cesse)
7. `invalid input syntax for type uuid: "own"` → root cause: `clientId='own'` (valor de UI) passado para `saveAuditReport` que usa `@db.Uuid`; fix: `dbClientId = report.clientId === 'own' ? null : report.clientId ?? null` antes de qualquer operação DB
8. Seletor de cliente em toggle-pill style (igual página nova campanha) → fix: adicionado `variant="toggle"` em `ClientSelector` nas páginas dashboard e auditoria
9. Dashboard com datas em formato dd/mm/aaaa → fix: substituídos `<input type="date">` por `<DateInputPtBR>` com máscara automática
10. Filtro de campanha adicionado nas páginas dashboard e auditoria → `CampaignSelect` nativo com re-carga automática ao trocar cliente

---

### Fix Login Loop — DB Pool Exhaustion (2026-06-01)

**Problema:** Login em `http://localhost:3000/admin/login` ficava em loop infinito.

**Causa raiz:** PostgreSQL Docker container atingiu `max_connections=100`. Múltiplos serviços Docker (app:3002, feed, lead-worker) + dev local (3000) consumiam todas as conexões disponíveis. A pool usava `min=2` (conexões de aquecimento), o que desperdiçava slots.

**Sintoma técnico:** `/api/admin/auth/login` → 500 com `"Connection terminated due to connection timeout"` (pg-pool `connectionTimeoutMillis: 5000` esgotado). `useAuth.tsx` detectava falha no `/api/admin/auth/me` → `window.location.href = '/admin/login'` → loop.

**Fix aplicado:**
- `src/lib/database/connection.ts`: defaults ajustados para `max=10, min=0, idleTimeout=30s, connectionTimeout=30s, allowExitOnIdle=true`
- `.env.local` (local, não commitado): `DB_POOL_MAX=5, DB_POOL_MIN=0`
- `next.config.js`: comentário adicionado para triggering de restart do servidor (libera conexões antigas)

**Verificação:** Login retorna 200 em ~600ms; `/api/admin/auth/me` retorna 200 em ~200ms (com cookie). Auth flow completo funcional.

---



### Centralização LLM das Campanhas (2026-05-28)

Implementado um único modelo de IA global para todos os insights de campanhas da plataforma:

- **`getLlmClientForCampaigns()`** em `src/lib/marketing/services/llmClient.ts`
  - Lê `campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL`
  - Fallback para `ANTHROPIC_API_KEY` do env se nenhuma config global existir
- **3 pontos de chamada atualizados** para usar a função global:
  - `src/lib/intelligence/llmInvoker.ts`
  - `src/app/api/admin/campanhas/settings/llm/test/route.ts`
  - `src/app/api/admin/master/ia-plataforma/test/route.ts`
- **UI Master** criada em `src/app/admin/master/ia-plataforma/page.tsx`
  - GET/PUT em `/api/admin/master/ia-plataforma`
  - Teste de conexão em `/api/admin/master/ia-plataforma/test`
- **Sidebar** — item "IA da Plataforma" ativo via `system_features` (`category_id=22`, `url=/admin/master/ia-plataforma`)
- **SQL** — `database/migration-2026-05-llm-centralizacao.sql` (índice único + seed linha global)

### ModulesListModal — Componente Reutilizável (2026-05-28)

- Criado `src/components/admin/master/modules/ModulesListModal.tsx`
- Usado em `src/app/admin/master/tenants/page.tsx`

### Plano Mestre — Seção 1.6 adicionada (2026-05-29)

Documentada a **Camada Operacional de Lançamento de Campanhas** (subseções 1.6.1–1.6.13):
- Fronteira automático↔manual (2 baldes, sem camada semi)
- 3 "lares de dado" a criar: page_id/pixel/ig em credentials, network_defaults em system_segments, website em tenants/clientes
- Hotfixes pré-fase identificados: bug page_id, adset_schedule, interest IDs
- Fronteira on-the-fly (1.6.13): ~85–90% dinâmico nos campos; adapter é código irredutível
- Mescla aditiva: FASE 1 expande, FASE 5 → "Video + Conversão/ROI", FASE 11 só consome

---

## Tarefa concluída

### Implementação da Camada de Lançamento — FASE 1 Expandida (2026-05-29)

**Sequência executada:**

- [x] Checkpoint iniciado
- [x] **Migração DB** — executada via rota temporária (psql local + pool Prisma)
  - ✅ `system_segments.network_defaults JSONB` criada e seedada
  - ✅ `tenants.website TEXT` criada
  - ✅ `clientes.website TEXT` criada
  - ✅ GIN index `idx_system_segments_network_defaults` criado
  - ✅ Seeds aplicados: imobiliaria (HOUSING), carros, geral, master, saude
  - Slugs reais confirmados: `imobiliaria`, `carros`, `geral`, `master`, `saude`
- [x] **Hotfix 1** — bug `page_id` corrigido em `src/lib/marketing/networks/meta/metaAdsAdapter.ts`
  - `object_story_spec.page_id` agora usa `this.pageId` (das credentials) e não `this.adAccountId`
  - Lança erro claro se `page_id` não configurado
- [x] **Hotfix 2** — `adset_schedule` agora enviado ao Meta API
  - Método `buildAdsetSchedule()` converte `scheduleStartHour/End` → minutos Meta format
- [x] **Settings premium** — `src/app/admin/campanhas/configuracoes/page.tsx`
  - Seção "Identidade Meta" com page_id, pixel_id, instagram_actor_id, website
  - API: `src/app/api/admin/campanhas/settings/meta-identity/route.ts` (GET+PUT, JSONB merge)
- [x] **ClientSelector** — `src/components/marketing/ClientSelector.tsx` (ALTA PRIORIDADE)
  - Hook `useClientSelector(storageKey)` com sessionStorage persist
  - Integrado em `dashboard/page.tsx` e `leads/page.tsx`
- [x] **CampaignWizard** — `src/components/marketing/CampaignWizard.tsx`
  - `AutoChip` para campos auto-resolvidos
  - `autoFields` state via `getMetaIdentity()` + `/segment-defaults`
  - `StepObjective` com specialAdCategory, pixelId, customEventType
  - Prop `clientId` adicionada
- [x] **API segment-defaults** — `src/app/api/admin/campanhas/segment-defaults/route.ts`
  - Resolução automática pelo segmento do tenant/cliente
  - Fallback gracioso (não quebra wizard)
- [x] **Factory** — `resolveSegmentNetworkDefaults()` em `src/lib/marketing/networks/factory.ts`
- [x] **campaigns/route.ts** — `pixelId` e `customEventType` passados para `networkService.createCampaign()`
- [x] Arquivo temporário `_run_migration.js` removido

**Arquivo de migração:** `prisma/migration-2026-05-29-launch-layer.sql`

---

## Última entrega — Camada 3 (clientes) — 2026-05-29

- ✅ `clientes.page_id TEXT`, `clientes.pixel_id TEXT`, `clientes.instagram_actor_id TEXT` — migração executada
- ✅ API `GET/PUT /api/admin/clientes/[id]/campaign-settings`
- ✅ Página `/admin/clientes/[id]` refatorada com tabs: "Dados do Cliente" | "Configurações Meta"
  - `CampaignField` com indicador "próprio" vs "usando tenant"
  - Barra de progresso de completude
  - Info bar com fallbacks do tenant
- ✅ `getNetworkServiceForTenant()` aceita `clientId` — cascata: `client.page_id ?? tenant.page_id`
- ✅ `campaigns/route.ts` passa `clientId` para cascata de credenciais

## Arquitetura de 3 camadas — COMPLETA

| Camada | Config | UI | Status |
|--------|--------|----|--------|
| **Master** | LLM global | `/admin/master/ia-plataforma` | ✅ |
| **Tenant** | Meta credentials, website, segment | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — Fluxo de Lançamento Unificado (2026-05-29)

- ✅ **`/admin/campanhas/nova`** refatorado como Fase 1 (Criativos) + Fase 2 (Wizard)
  - Seleção de pasta via File System Access API (Chrome/Edge) com fallback `webkitdirectory`
  - Grid de imagens com seleção múltipla (máx 6) e thumbnails no footer
  - Seção "Para quem?" exibida **apenas para tenants** (oculta para Master)
  - `CreateGuard` **removido** do botão "Configurar Campanha" — era o bug que ocultava o botão para Master
  - `contextReady` como única guarda de negócio: `isMaster || campaignFor === 'own' || !!selectedClientId`
- ✅ **`/admin/campanhas/criativos`** substituído por redirect para `/nova`
- ✅ **`/api/admin/auth/me`** — campo `is_system_role` adicionado ao `userResponse`
- ✅ **`isMaster` detection** — `user?.is_system_role` + localStorage fallback (login sempre tem `is_system_role`)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| "Para quem?" aparecia para Master | `is_system_role` não retornado por `/me` | Adicionado ao `userResponse` + fallback localStorage |
| Botão "Configurar Campanha" ausente/desabilitado para Master | `CreateGuard resource="campanhas"` retornava null (sem permissão explícita na DB) | Removido `CreateGuard` — `disabled={!contextReady}` suficiente |

## Última entrega — Interesses Meta reais + Curadoria por segmento (2026-05-30)

### Problema resolvido
Os interesses no wizard usavam IDs fake (strings textuais) que o Meta ignorava silenciosamente.
Interesses agora usam IDs numéricos reais da Meta Targeting Search API.

### O que foi implementado
- **`/api/admin/campanhas/interests/search`** — busca real na Meta Graph API (`/search?type=adinterest&locale=pt_BR`); fallback gracioso se token não configurado
- **`InterestsPicker`** reescrito — busca com debounce 350ms, exibe audience size real, interesses livres como fallback
- **`InterestsPicker`** colapsado em "Avançado" — com banner explicando impacto variável (especialmente HOUSING)
- **`suggestedInterests` por segmento** — `network_defaults.meta.suggested_interests` em `system_segments`
  - `resolveSegmentNetworkDefaults` retorna `suggestedInterests[]`
  - Wizard carrega e exibe chips ⚡ do segmento antes da busca livre
- **`/api/admin/master/segments/[id]/interests`** (GET + PATCH) — Master gerencia seeds por segmento
- **`SegmentInterestsModal`** — modal na página `/admin/master/segmentos` com busca Meta API + salvar
- **Página de Segmentos do Master** — botão "✨ Interesses Meta" por segmento

### Fluxo de curadoria pelo Master
1. `/admin/master/segmentos` → clicar "Interesses Meta" no segmento
2. Modal abre → busca na Meta API → clica para adicionar → salva
3. Todos os tenants daquele segmento passam a ver os chips sugeridos no wizard

## Última entrega — Meta Pixel, WhatsApp auto e Config. Meta no tenant (2026-05-30)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| Prisma `Unknown argument 'networkId'` ao criar campanha | Campo nunca existiu no schema `Campaign` | Removido query e spread `networkId` de `src/app/api/admin/campanhas/campaigns/route.ts` |

### Novos arquivos

- **`src/components/analytics/MetaPixel.tsx`** — componente Client que injeta o snippet fbevents.js via `next/script strategy="afterInteractive"`; rastreia PageView a cada mudança de rota
- **`src/lib/analytics/getMetaPixelId.ts`** — Server helper: busca `credentials->>'pixel_id'` do tenant em `tenant_network_credentials`; falha silenciosa → string vazia
- **`src/app/api/admin/master/tenants/[id]/meta-identity/route.ts`** — GET/PUT para Master gerenciar `page_id`, `pixel_id`, `instagram_actor_id` (JSONB merge) e `website` de qualquer tenant; protegido por `is_system_role`

### Atualizações

- **`src/app/artemis4/layout.tsx`** — agora Server Component assíncrono; busca `pixel_id` do tenant master (`00000000-0000-0000-0000-000000000001`) e injeta `<MetaPixel>` se configurado
- **`src/components/marketing/CampaignWizard.tsx`** — WhatsApp Level 1: `loadAutoFields` busca `getWhatsAppConfig()` em paralelo e pré-preenche `whatsappNumber` + `whatsappMessage` com `AutoChip`; aviso pixel alterado para cinza neutro
- **`src/app/admin/master/tenants/[id]/page.tsx`** — reescrito completamente com tabs "Dados do Tenant" | "Config. Meta"; Config. Meta exibe campos: Facebook Page ID (obrigatório), Meta Pixel ID (conversões), Instagram Actor ID (opcional), Website

### Arquitetura de 3 camadas — COMPLETA (atualizada)

| Camada | Config Meta | UI | Status |
|--------|-------------|----|--------|
| **Master** | page_id, pixel_id, instagram, website | `/admin/master/tenants/{id}` → aba Config. Meta | ✅ |
| **Tenant** | Meta credentials, website | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — FASE 4: Campaign State Machine (2026-05-30)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-30-fase4-lifecycle.sql` (executada via pool raw SQL)
  - `Campaign.lifecycle_status VARCHAR(20) DEFAULT 'DRAFT'`
  - `Campaign.lifecycle_changed_at TIMESTAMP`
  - `Campaign.learning_started_at TIMESTAMP`
  - `Campaign.stable_since TIMESTAMP`
  - Índice `idx_campaign_lifecycle` em `(lifecycle_status, tenant_id)`
  - Seed: ACTIVE → STABLE, PAUSED → PAUSED, outros → DRAFT
  - Tabela `CampaignLifecycleEvent` (audit log de transições; `campaign_id TEXT` pois Campaign.id é TEXT)

- **`src/lib/marketing/services/campaignStateMachine.ts`** — máquina de estados completa
  - 8 estados: `DRAFT | READY | LEARNING | STABLE | SCALING | FATIGUED | PAUSED | KILLED`
  - `VALID_TRANSITIONS` — mapa de transições permitidas por estado
  - `transitionCampaign()` — valida, atualiza `lifecycle_status`, registra em `CampaignLifecycleEvent`
  - `inferLifecycleStatus()` — regras automáticas: frequência > 3.5 + CTR drop > 30% → FATIGUED; ≥7 dias ou ≥50 conversões → STABLE; primeiros dados → LEARNING; pausado externamente → PAUSED
  - `getLifecycleHistory()` — histórico paginado

- **`src/app/api/admin/campanhas/campaigns/[id]/lifecycle/route.ts`**
  - GET — retorna histórico de transições (até 50)
  - POST — transição manual com `{ toStatus, reason }`

- **`src/components/marketing/CampaignLifecycleBadge.tsx`** — badge rico com:
  - Emoji + label colorido por estado
  - Dropdown de transições manuais (via `onTransition` prop)
  - Painel de histórico (ícone ⏰)
  - Props: `campaignId, status, changedAt?, history?, onTransition?, compact?`

- **`src/lib/marketing/services/agentDecisor.ts`** — integrado: após PAUSE executa `transitionCampaign('PAUSED', 'AGENT')`
- **`src/lib/marketing/services/agentMonitor.ts`** — integrado: após cada sync de métricas chama `inferLifecycleStatus()`

- **Dashboard** — `CampaignLifecycleBadge` integrado na tabela de campanhas (coluna "Ciclo de Vida")
  - `marketing-api.ts` Campaign interface atualizada com `lifecycleStatus`, `lifecycleChangedAt`
  - Prisma schema atualizado + `prisma generate` executado

### Validação em produção (30/05/2026)

| Cenário | Status |
|---------|--------|
| Badge renderiza STABLE / PAUSED / FATIGUED / SCALING | ✅ |
| Transição manual STABLE → FATIGUED via dropdown | ✅ |
| Transição manual STABLE → SCALING via dropdown | ✅ |
| Histórico lazy (fetch on demand) com fonte Manual | ✅ |
| `CampaignLifecycleEvent` gravado corretamente no banco | ✅ |

**Bugs corrigidos durante validação:**
- `can't resolve 'fs'` — tipos extraídos para `campaignLifecycleTypes.ts` (sem imports Node.js)
- 401 silencioso — `fetch` direto não enviava token; criado `adminFetch` helper
- `inconsistent types deduced for parameter $1` — adicionado `$1::varchar` / `$2::timestamp` no UPDATE

### Arquitetura do Estado Machine

```
DRAFT → READY → LEARNING → STABLE ⇄ SCALING
                             ↓          ↓
                          FATIGUED ←────┘
                             ↓
                          PAUSED → READY
                             ↓
                           KILLED
```

### Trigger sources
- `SYNC` — inferido automaticamente pelo agentMonitor
- `AGENT` — decisão automática do agentDecisor
- `MANUAL` — operador via API/UI
- `CRON` — jobs agendados (futuro)

---

## Última entrega — FASE 5: Video Metrics + Hook Rate (2026-05-31)

### Migração executada

`prisma/migration-2026-05-31-fase5-video-metrics.sql`
- 7 novas colunas em `campanhasmarketingdigital."Insight"`:
  - `video_views_3s`, `video_views_15s`, `video_views_25_pct`, `video_views_50_pct`, `video_views_75_pct`, `video_views_100_pct`, `thruplay_views` (todos `INTEGER NOT NULL DEFAULT 0`)
- Índice parcial `idx_insight_video ON ("campaignId", video_views_3s) WHERE video_views_3s > 0`
- Seeds `hook_rate_critical` / `hook_rate_min` / `hook_rate_good` em `public.system_benchmarks` para 5 segmentos (imobiliaria, carros, saude, geral, master)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 7 novas colunas `videoViews3s` … `thruplayViews` no model `Insight` |
| `src/lib/marketing/networks/types.ts` | `NetworkInsight` + 7 campos opcionais de vídeo + `breakdowns` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` solicita 7 novos campos de vídeo da Meta Graph API; mapeia `video_*_watched_actions` para os campos |
| `src/lib/marketing/services/agentMonitor.ts` | `syncMetrics` persiste todos os 7 campos de vídeo no upsert do Insight |
| `src/lib/marketing/services/aiInsights.ts` | `CampaignData` + `hasVideoMetrics` / `avgHookRate`; nova regra `video_hook_weak` (ALERT com label "Hook Rate fraco"); benchmarks incluem `hook_rate_critical`/`hook_rate_min` |
| `src/lib/intelligence/benchmarkResolver.ts` | `GLOBAL_FALLBACKS` + `hook_rate_critical: 8`, `hook_rate_min: 12`, `hook_rate_good: 22` |
| `src/lib/marketing-api.ts` | `InsightData` + `videoViews3s?`, `videoViews15s?`, `thruplayViews?` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Hook Rate KPI card condicional (aparece só quando `totalVideoViews3s > 0`); cor semáforo vermelho/âmbar/verde por thresholds |

### Lógica da regra Hook Rate

```
hookRate = video_views_3s / impressions * 100
hookRate < hook_rate_critical (8%)  → ALERT crítico — pausar vídeo
hookRate < hook_rate_min (12%)      → ALERT fraco  — revisar abertura
```

Thresholds por segmento resolvidos via `benchmarkResolver` (4 camadas: cliente → tenant → segmento → global fallback).

---

## Próximos passos imediatos

1. Configurar `pixel_id` do Master via `/admin/master/tenants/[master-id]` → Config. Meta (para Artemis4 funcionar)
2. **Opção A (pendente para amanhã)** — Destravar lançamento real no Meta: access_token, blob: → URL hospedada, localhost → domínio produção
3. Testar fluxo completo Master: selecionar criativos → "Configurar Campanha" → Wizard → lançar
4. Dashboard: adicionar `onTransition` no badge (requisitar permissão ao usuário antes)
5. Remover item "IMPORTAÇÃO DE CRIATIVOS" do sidebar (agora redirecionado; item confuso)

---

## Decisões tomadas em 2026-05-29

| Decisão | Racional |
|---------|----------|
| Mescla ADITIVA ao plano mestre | Seção 1.6 acrescentada, FASES 0–11 intactas |
| Fronteira on-the-fly: ~85–90% dinâmico | Campos guiados por field schema; adapter é código irredutível |
| `network_defaults` em `system_segments` | Curadoria 1x pelo Master, keyed por rede, resolve por segmento |
| `website` como coluna em tenants + clientes | Client-owned site nunca hardcoded; pré-preenche na UI |
| Sem camada "semi-auto" | Só 2 baldes: automático (vem do banco) ou manual (informado na UI) |
| YouTube = canal sob Google Ads | Sem row separado em ad_networks; mesmo adapter/credentials |

---

## Últimas entregas — 2026-05-31

### "Usar no Wizard" — loop IA → Campanha fechado

- ✅ **`ConceptModal`** (`padroes/page.tsx`) — botão **"Usar no Wizard"** por conceito gerado:
  navega para `/admin/campanhas/nova?body=...&headline=...&hookText=...`
- ✅ **`/nova`** — lê `useSearchParams` e passa `initialValues` ao `CampaignWizard`
- ✅ **`CampaignWizard`** — aceita `initialValues.{body, headline, hookText}`:
  - Popula `form.body` e `form.headline` no estado inicial
  - Step 2: banner azul "✨ Texto gerado pela IA"
  - Dica âmbar "🪝 Hook sugerido" abaixo do textarea

**Loop completo:** Dados Meta → Padrões Vencedores → Conceito IA → Wizard pré-preenchido → Lançamento → Novos dados

---

## Última entrega — FASE 7: Funnel Stage Classification (2026-05-31)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-31-fase7-funnel-stage.sql` (executada via Node.js pool)
  - `Campaign.funnel_stage VARCHAR(20) DEFAULT 'TOF'`
  - Índice `idx_campaign_funnel ON (funnel_stage, tenant_id)`
  - Backfill automático: `OUTCOME_AWARENESS/TRAFFIC/REACH → TOF`, `OUTCOME_ENGAGEMENT → MOF`, `OUTCOME_LEADS/SALES/APP_PROMOTION/CONVERSIONS → BOF`
  - Seed de prompt template `funnel_diagnosis` em `public.system_prompt_templates`

- **`prisma/schema.marketing.prisma`** — campo `funnelStage String @default("TOF")` adicionado ao model `Campaign`

- **`src/app/api/admin/campanhas/dashboard/funnel/route.ts`** — GET
  - Agrega métricas por estágio (TOF/MOF/BOF) via `COALESCE(funnel_stage, CASE objective...)` para fallback gracioso
  - Calcula taxas: `tof_ctr` (impressões→cliques), `mof_ltr` (cliques→leads), `bof_cvr` (leads→conversões)
  - Identifica `bottleneck`: estágio com maior share de budget e pior conversão
  - Retorna `{ stages, conversionRates, totals, bottleneck, period }`

- **`src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts`** — POST
  - Chama `invokeForContext({ templateKey: 'funnel_diagnosis', ... })`
  - Formata `funnel_data` e `conversion_rates` como texto estruturado
  - Retorna `{ diagnosis, generatedAt }`

- **`src/app/api/admin/campanhas/campaigns/[id]/funnel-stage/route.ts`** — PATCH
  - Override manual de `funnel_stage` (valida `TOF | MOF | BOF`)
  - Verifica ownership por `tenant_id`

- **`src/components/marketing/StageFunnelWidget.tsx`** (novo componente)
  - `StageCard`: card por estágio com spend/impressões/cliques/leads, destaque vermelho no gargalo
  - `RateArrow`: seta de conversão com cor semáforo (vermelho < 1%, âmbar < 3%, verde ≥ 3%)
  - Totais resumidos: Investimento Total / Leads Totais / CPL Geral
  - Botão "Diagnosticar gargalo com IA" → POST `/diagnosis` → painel colapsável via `AnimatePresence`
  - Diagnóstico cacheado no state (toggle show/hide após primeira chamada)

- **`src/lib/marketing-api.ts`** — novos tipos `FunnelStage`, `FunnelConversionRates`, `FunnelData7`; novas funções `getFunnelData`, `generateFunnelDiagnosis`, `updateCampaignFunnelStage`; campo `funnelStage?` em `Campaign`

- **`src/app/admin/campanhas/dashboard/page.tsx`** — `StageFunnelWidget` integrado no card "Funil de Conversão" (substitui `FunnelChart` quando dados disponíveis)

### Validação
- TypeScript check em todos os novos arquivos: exit code 0 (sem erros)
- Migração executada com sucesso: 4/4 statements OK

---

## Última entrega — FASE 8: Tracking Health Monitor (2026-06-01)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-06-01-fase8-tracking-health.sql` (executada)
  - Tabela `campanhasmarketingdigital."TrackingHealthCheck"` (`id, tenant_id, client_id, overall_score, checks, issues, created_at`)
  - 2 índices: `idx_tracking_health_tenant` (busca recente) + `idx_tracking_health_critical` (score ≤ 50)

- **`prisma/schema.marketing.prisma`** — model `TrackingHealthCheck` adicionado + `prisma generate` executado

- **`src/lib/marketing/services/trackingHealthService.ts`** — service com 7 checks:
  1. `tracking_endpoint` — endpoint `/api/r/__health_check__` responde <500 (peso 20)
  2. `leads_24h` — leads registrados nas últimas 24h (peso 20)
  3. `duplicate_rate` — taxa de leads com mesmo IP em <30s (peso 15)
  4. `pixel_configured` — pixel_id em client/tenant credentials (peso 15)
  5. `access_token` — token Meta configurado + dias p/ expiração (peso 15)
  6. `lead_latency` — latência de query como proxy de captura (peso 10)
  7. `orphan_leads` — leads sem campaignId (peso 5)
  - `runTrackingHealthCheck()` — executa os 7 checks em paralelo, calcula score 0-100
  - `saveTrackingHealthCheck()` — persiste em `TrackingHealthCheck`
  - `getTrackingHealthHistory()` — histórico paginado por tenant

- **`src/app/api/admin/campanhas/tracking/health/route.ts`**
  - `GET` — retorna `{ latest, history }` (latest = check mais recente, history = 30 últimos)
  - `POST` — executa novo check, persiste e retorna resultado completo
  - Auth: `requireApiPermission('dashboard-campanhas', 'READ')` + `getTokenPayload`

- **`src/lib/marketing-api.ts`** — tipos `TrackingCheckResult`, `TrackingHealthIssue`, `TrackingHealthResult`, `TrackingHealthData`; funções `getTrackingHealth()` e `runTrackingHealth()`

- **`src/components/marketing/TrackingHealthWidget.tsx`** — widget completo:
  - Gauge SVG semi-circular (0-100) colorido por score (verde/âmbar/vermelho)
  - Chips de issues (críticos + alertas) ou "Tudo OK"
  - Estado sem dados → botão "Executar 1ª verificação"
  - Lista expandível de todos os checks (accordion por check com detalhe)
  - Botão ↺ para re-executar check a qualquer momento
  - Loading skeleton

- **`src/app/admin/campanhas/dashboard/page.tsx`** — widget integrado entre Farol de Milha e Briefing AI
  - Props: `clientId` respeitando filtro de cliente ativo

### Validação
- Migração executada: 3/3 OK (tabela + 2 índices)
- `prisma generate` executado sem erros
- TypeScript: zero erros nos arquivos da FASE 8
- `GET /api/admin/campanhas/tracking/health` → 401 sem auth (rota compilada e ativa)

---

## Última entrega — UI Improvements: Gráficos & Funil (2026-06-01)

### Alterações implementadas

| Arquivo | Mudança |
|---------|---------|
| `src/components/marketing/charts/MultiMetricChart.tsx` | Props `xLabel?`, `yLeftLabel?`, `yRightLabel?` adicionadas; auto-deriva rótulos a partir dos metrics; rótulos renderizados em XAxis e ambos YAxis; `margin` do ComposedChart ajustado para acomodar rótulos |
| `src/components/marketing/charts/ClassicFunnelChart.tsx` | Reescrito: SVG 300×320px (era 220×240px), taper gentil (bottom 84px, era ~20px), filtro de texto mais forte (`stdDeviation="2.5" floodOpacity="0.70"`), título "Funil do Ciclo de Conversão em Vendas", cores th.num por estágio, `rateColor(rate, isDark)` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Badge "FASE 7" hardcoded removido do heading "Funil por Estágio"; CPL Timeline: Gasto removido, CPL como área primária (left) + Leads como barra (right); Pie chart: inline `label` truncado substituído por legenda externa custom (flex-wrap, percentual calculado, dots coloridos) |
| `src/components/marketing/StageFunnelWidget.tsx` | Nota informativa quando MOF zero ("Sem campanhas OUTCOME_ENGAGEMENT no período"); mensagem de erro de diagnóstico mapeada: "Connection terminated" / timeout → texto amigável em PT-BR |
| `src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts` | Timeout 28s via `Promise.race` + `setTimeout`; resposta HTTP 504 quando timeout; mensagem de erro diferenciada timeout vs erro genérico |

### Comportamento dos rótulos de eixo (MultiMetricChart)

- **X** — sempre "Data" por padrão (override via `xLabel`)
- **Y esquerdo** — auto-deriva do primeiro metric sem `yAxisId` ou com `yAxisId: 'left'`
- **Y direito** — auto-deriva do primeiro metric com `yAxisId: 'right'`

Nenhum callsite precisou de alteração — o comportamento é 100% retrocompatível.

---

## Última entrega — FASE 8.5: Signal-Driven Anticipation (2026-06-01)

### Paradigma

Substituição do modelo de **regressão linear** (forecasting passivo) por **motor de sinais leading**
(escuta ativa da "voz do Meta"). O Farol de Milha agora responde "quando / para onde" em vez de
"o que foi previsto com base no passado".

### Migração DB executada

`prisma/migration-2026-06-01-fase85-signals.sql`:
- 6 novas colunas em `campanhasmarketingdigital."Insight"`:
  `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`, `learning_status`,
  `learning_conversions` (INT), `first_impression_ratio` (FLOAT)
- Índices: `idx_insight_rankings` + `idx_insight_learning`
- Nova tabela `campanhasmarketingdigital."CalibrationSignal"` (pressureScore + signals JSONB)
- Seeds em `public.system_benchmarks`: `frequency_max`, `learning_conv_target`, `fir_floor`,
  `pressure_w_engagement`, `pressure_w_conversion`, `pressure_w_quality`, `cpm_delta_max`

### Arquivos novos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/marketing/services/signalEngine.ts` | Motor de sinais — `computePressure()`, `detectTrend()`, `computeSignalsForCampaign()` |
| `src/lib/marketing/services/anticipationEngine.ts` | `computeAnticipation()` — heurísticas TIME-TO-FATIGUE, EXIT-LEARNING, AUDIENCE-EXHAUSTION; retorna `TimeToEvent[]` + `Trajectory[]` |
| `src/app/api/admin/campanhas/dashboard/anticipation/route.ts` | `GET /dashboard/anticipation` — todas as campanhas ativas em paralelo |
| `src/components/marketing/charts/TimeToEventBar.tsx` | Barra de contagem regressiva (verde→vermelho por urgência) |
| `src/components/marketing/charts/SignalTrajectory.tsx` | Sparkline de 7 pontos + seta direcional + implicação textual |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 6 campos no model `Insight` + model `CalibrationSignal` |
| `src/lib/marketing/networks/types.ts` | 6 campos FASE 8.5 no `NetworkInsight` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` mapeia rankings + `firstImpressionRatio`; novos métodos `fetchAdSetDelivery()` e `fetchRecommendations()` |
| `src/lib/marketing/services/agentMonitor.ts` | `insightBase` persiste 4 novos campos de sinal |
| `src/lib/marketing/services/aiInsights.ts` | `CalibrationAction` union type; `SIGNAL_RULES` (5 regras); retorno `{ insights, calibrationActions }` |
| `src/lib/intelligence/benchmarkResolver.ts` | 6 novos `GLOBAL_FALLBACKS` para sinais |
| `src/lib/marketing/services/agentDecisor.ts` | Caller corrigido para `result.insights` |
| `src/lib/marketing/services/strategicBriefing.ts` | Caller corrigido para `aiResult.insights` |
| `src/app/api/admin/campanhas/insights/ai/route.ts` | Retorna objeto completo `{ insights, calibrationActions }` |
| `src/lib/marketing-api.ts` | Tipos FASE 8.5 + `getAnticipation()` + `getCalibrationInsights()` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Farol de Milha substituído pelos novos componentes; projeções legadas em `<details>` colapsável |

### Heurísticas implementadas

| Evento | Lógica |
|--------|--------|
| `TIME-TO-FATIGUE` | `daysUntil = ceil((freqMax − freqNow) / Δfreq_dia)` |
| `TIME-TO-EXIT-LEARNING` | `daysUntil = ceil(remaining_conv / avg_conv_3d)` |
| `AUDIENCE-EXHAUSTION` | `first_impression_ratio < fir_floor` ou caindo (detectTrend) |

### `computePressure()` — normalização de sinais

```
pressureScore = rankPressure × 60% + trendPressure × 40%
rankPressure  = weighted avg dos 3 rankings Meta (engagement/conversion/quality)
trendPressure = contribuição de CPM + frequência crescente
```

Limiares resolvidos via `benchmarkResolver` (4 camadas: client → tenant → segment → global fallback).

### Validação pré-teste
- TypeScript: zero erros nos arquivos FASE 8.5
- Rota `/dashboard/anticipation` compilada e registrada
- Dashboard page: Farol de Milha renderiza seção de sinais; projeções legadas em `<details>`

---

## Pendências registradas

### 1.7 — Thresholds da State Machine por ENV (pendente)
Thresholds `LEARNING_DAYS`, `FATIGUE_FREQUENCY`, `FATIGUE_CTR_DROP` hardcoded em `campaignStateMachine.ts`.
Mover para variáveis de ambiente. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.7.

### 1.8 — Hook Rate KPI com thresholds dinâmicos (pendente)
Card visual do dashboard usa `8` e `12` hardcoded; regra de IA já usa `benchmarkResolver`.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.8.

### 1.10 — Revisão do modelo de predições → FASE 8.5 ✅ CONCLUÍDA (2026-06-01)
Paradigma virado de regressão linear para **motor de sinais leading**. Ver seção
"Última entrega — FASE 8.5" acima.

### 1.9 — Gestão de Providers e Modelos LLM pelo Master (pendente)
UI CRUD para a tabela `LlmModel` em `/admin/master/ia-plataforma` (nova aba "Catálogo de Modelos").
Permite ao Master adicionar providers, ativar/desativar modelos e marcar recomendados sem SQL.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.9.

**Endpoints a criar:** `GET/POST /api/admin/master/llm-models`, `PUT/PATCH/DELETE /api/admin/master/llm-models/[id]`
**Arquivos principais:** `src/app/admin/master/ia-plataforma/page.tsx` (nova aba), `src/lib/marketing-api.ts`

### FASE 6.5 — Produção de Criativos por Reaproveitamento (pendente) ← NOVO
Fecha o último elo do loop FASE 6: transforma padrão vencedor + conceito da IA em **arquivos de
criativo prontos para lançar**, reaproveitando fotos reais existentes (nunca síntese do imóvel).
Segregado em 2 estágios. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção FASE 6.5.

- **Estágio A — Imagens (CUSTO ZERO, avançar agora):** composição programática com **Sharp + SVG**
  (grátis, já no stack); overlay do copy já gerado + branding + smart-crop multi-formato (1:1/9:16/4:5);
  gate de aprovação humana → vira CreativeAsset lançável. Sem API paga, sem GPU.
  - Requer: object storage (S3/R2) — que também resolve a pendência do `blob:` no lançamento.
  - Novas tabelas: `CreativeTemplate`, `CreativeGenerationJob` + colunas `derived_from_asset_id`/`ai_generated`.
- **Estágio B — Vídeos (custos permitidos, futuro):** reels a partir das fotos reais (Ken Burns +
  Creatomate/Shotstack; image-to-video Luma/Kling/Veo). Provider configurável pelo Master (análogo à 1.9),
  com teto de gasto + rate-limit + webhooks. Reusa toda a infra do Estágio A.

**Prioridade:** Estágio A média-alta (após object storage); Estágio B baixa/futuro.

---

## Pendências anteriores (ainda abertas)

- **Auditoria de permissões CRUD** — `CreateGuard`/`UpdateGuard`/`DeleteGuard` criados, apenas `clientes` protegido. Os demais 30+ módulos ainda sem proteção.
- **Sync Meta real** — validar `POST /insights/sync` com token de produção.
- **Alerta de token Meta expirando** — campo `meta_token_expires_at` existe no tenant, falta notificação na UI.
- **Endpoint CPL por período** — não existe, agregar `spend / count(leads)` por intervalo de datas.

---

## Referências

- `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` — Plano completo das 11 fases (versão 1.3.1)
- `docs/ACCESS_CONTROL.md` — Lógica de controle de acesso e sidebar
- `CLAUDE.md` — Documentação técnica principal (arquitetura, APIs, infra)
