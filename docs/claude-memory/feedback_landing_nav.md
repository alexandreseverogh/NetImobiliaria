---
name: feedback_landing_nav
description: CTAs de landing (artemis4) para /admin/login devem usar <a> nativo, não Next <Link>
metadata:
  type: feedback
---

Nas landing pages públicas (ex: `src/app/artemis4/page.tsx`), os CTAs que apontam
para **outra route group** (notadamente `/admin/login`, layout admin pesado) devem
usar `<a href>` nativo — **nunca** `<Link>` do Next.

**Why:** com `<Link>`, o clique dispara navegação client-side (fetch do RSC +
hidratação do layout admin) que compete pela main thread. Em páginas com mídia
pesada (iframe do YouTube em artemis4) + loops `requestAnimationFrame`, a thread
fica ocupada e a navegação trava até a carga aliviar — sintoma relatado: "clico em
Entrar e não vai até o vídeo adiantar".

**How to apply:** `<a>` nativo faz o browser navegar imediatamente e abandona o
contexto JS atual (mata vídeo + rAF). Reserve `<Link>` para navegação **dentro** da
mesma route group (menu/rodapé internos). Vídeo do YouTube em artemis4 já carrega
async via `requestIdleCallback` + script async/defer — não é o gargalo do clique.

**Root cause real medido (2026-07-11):** mesmo com `<a>` nativo, o clique continuava
lento. Medição: `GET /admin/login` = **10,1s na 1ª vez (fria) vs 0,1–0,3s morna**. O
gargalo dominante é a **compilação sob demanda do Next em DEV** do route group `admin`
inteiro (AuthProvider + SkillsProvider + AdminLayoutContent) — artefato de dev, some
em produção (build). O vídeo/rAF é só agravante de percepção (trava a aba + zero
feedback durante a espera).

**Fix aplicado em `artemis4/page.tsx` (3 partes):** (1) **pré-aquecer** `/admin/login`
em segundo plano no mount via `requestIdleCallback` (`fetch('/admin/login')`) — compila
a rota enquanto o usuário lê a landing, clique pega morna. (2) **teardownSimulation()**
no `onClick` de todo CTA de login — cancela rAF (via `rafIdRef`), limpa o interval da
telemetria (`telemetryIntervalRef`), destrói o player YT; libera a main thread na hora.
(3) **overlay** "Acessando…" (`navigating` state) pra feedback instantâneo. Sem
preventDefault — o `<a>` nativo segue navegando. Verificado: prefetch dispara (network),
clique navega mesmo com a página pesada (rAF+YT ativos).

Relacionado: [[project_arquitetura_core]].
