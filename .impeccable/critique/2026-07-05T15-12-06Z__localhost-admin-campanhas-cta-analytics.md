---
timestamp: 2026-07-05T15-12-06Z
slug: localhost-admin-campanhas-cta-analytics
---
# Critique: CTA Analytics — `/admin/campanhas/cta-analytics`

**Slug:** `localhost-admin-campanhas-cta-analytics`
**Date:** 2026-07-05
**File:** `src/app/admin/campanhas/cta-analytics/page.tsx`

---

## Design Health Score

| Dimension | Score | Max |
|-----------|-------|-----|
| AI Slop Verdict | ❌ DETECTED | — |
| Nielsen Heuristics Total | 15 | 40 |
| Cognitive Load Failures | 6 | 8 |
| Detector Findings | 12 | 0 |
| P0 Issues | 2 | — |
| P1 Issues | 2 | — |

**Overall: Needs significant work.** The page is functional but visually misaligned with the design system on every dimension.

---

## AI Slop Verdict: DETECTED

Multiple absolute bans confirmed:

| Ban | Present |
|-----|---------|
| Identical card grid (hero-metric template) | ✅ 4 KPIs, indigo/violet/emerald/blue variants |
| Uppercase eyebrow on every section | ✅ KPI labels, card headers, insights h2 |
| Generic SaaS blue/indigo as primary | ✅ `#6366f1` throughout — anti-ref palette |
| Gradient card backgrounds | ✅ `InsightCard` uses `bg-gradient-to-r` per type |
| Native `<input type="date">` (CLAUDE.md ban) | ✅ Both date inputs in filter bar |
| 4-color accent system (multi-accent) | ✅ indigo/violet/emerald/blue on KPI cards |
| Indigo glow shadow (static decorative) | ✅ `rgba(99,102,241,0.08)` on 3 card surfaces |

The design system (navy `#0a192f` + amber `#c5a028`) is entirely absent from this page.

---

## Anti-Patterns Verdict (Detector)

**12 findings detected — exit code 2**

| Rule | Count | Values |
|------|-------|--------|
| `design-system-color` | 9 | `rgba(99,102,241,0.08)` ×3, `#6366f1`, `#10b981`, `#9ca3af` ×3, `#6b7280` |
| `design-system-radius` | 3 | `10px` ×3 (not in token scale: 6/8/12/16px) |

No false positives. All 12 are genuine drift.

---

## Nielsen Heuristics (Assessment A)

| # | Heuristic | Score | Note |
|---|-----------|-------|------|
| 1 | Visibility of System Status | 2 | Loading exists; no staleness indicators |
| 2 | Match Between System and World | 2 | CTA labels correct; funnel circles abstract |
| 3 | User Control and Freedom | 1 | No undo; native date breaks locale contract |
| 4 | Consistency and Standards | 1 | 4 accent colors in one page; contradicts single-accent system |
| 5 | Error Prevention | 1 | No date range validation; no empty state guards |
| 6 | Recognition Rather Than Recall | 3 | Human-readable CTA labels; filter bar visible |
| 7 | Flexibility and Efficiency | 2 | Period shortcuts exist; no keyboard access |
| 8 | Aesthetic and Minimalist Design | 1 | Heavy decoration competes with signal |
| 9 | Error Recovery | 1 | Not visible in source |
| 10 | Help and Documentation | 1 | No contextual help; heatmap axes unexplained |

**Total: 15/40**

---

## Overall Impression

This page was designed for a generic Tailwind SaaS admin, not "O Painel de Missão." Every surface decision — white background, indigo palette, colored icon rings, gradient insight cards, uppercase eyebrows — is the opposite of the design system's intent. The data architecture is actually thoughtful (CTA × time-of-day × funnel stage is a real question that matters to traffic managers), but the presentation buries the most valuable element (heatmap) under the most generic elements (KPI grid).

The page isn't broken — it's misaligned. A complete rebuild of the visual layer with the existing data model intact would get it to system standards.

---

## Priority Issues

### P0 — Wrong color system
Every color decision contradicts the design system. Indigo `#6366f1` is the exact "generic SaaS blue" this system rejects. No navy, no amber anywhere.

**Fix:** Replace all indigo/violet/emerald/blue accent colors. Background → `#0a192f` (navy-deep) or `#f8fafc` (surface-faint) for light mode. Cards → `#112240` (navy-surface, dark) or white with `rgba(0,0,0,0.06)` border (light). Single accent: amber `#c5a028` for active states, positive deltas, primary actions only.

**Command:** `/impeccable colorize src/app/admin/campanhas/cta-analytics/page.tsx`

---

### P0 — Native `<input type="date">` (CLAUDE.md mandatory violation)
Both date picker inputs use HTML native date input. This is explicitly banned in CLAUDE.md — the native input renders in the OS locale format (mm/dd on US systems) rather than the mandatory pt-BR dd/mm/aaaa format.

**Fix:**
```tsx
import DateInputPtBR from '@/components/ui/DateInputPtBR'

// Replace both:
<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
// With:
<DateInputPtBR value={startDate} onChange={iso => setStartDate(iso)} />
```

---

### P1 — Four accent colors on KPI cards destroy hierarchy
indigo/violet/emerald/blue on 4 parallel cards implies 4 different categories. They are the same tier of metric. Color encodes nothing meaningful here — it's decoration pretending to be information. When everything is accented, nothing is.

**Fix:** All 4 KPI cards use identical treatment. Neutral card (navy-surface or white). Metric value in display weight, white or ink-primary. Single amber delta badge to show direction. Let label and value carry all semantic weight.

---

### P1 — Gradient InsightCard backgrounds are visual noise
`bg-gradient-to-r` for emerald-to-teal, blue-to-indigo, amber-to-orange generates 4 different colored card faces. At dashboard scale, this reads as an alert system competing with the actual data.

**Fix:** Flat white/navy cards. 2px left-border colored by insight type (this is the one semantic context where a side-stripe earns its place). Card body: clean, neutral surface. The insight text carries the story — the container should step back.

---

### P2 — Uppercase eyebrows applied to everything
`text-xs font-semibold uppercase tracking-widest` on KPI metric labels, card headers, section h2 ("Insights automáticos"), and filter labels. When every tier uses this pattern, it signals nothing. DESIGN.md explicitly bans uppercase as a default: "reservado para estados críticos — nunca uppercase em labels por padrão."

**Fix:** KPI metric names → 12px, weight 500, sentence case, ink-muted. Card titles → 15px (title), weight 600, sentence case. Section headers → one level larger, sentence case, ink-primary. Reserve uppercase exclusively for genuine critical status indicators.

---

### P3 — Heatmap placed before the story it supports
A 7×24 matrix (168 cells) sits in the primary scroll alongside KPIs, before users have oriented to the top-level narrative. This is the most complex visual on the page placed at the most generic position.

**Fix:** Progressive disclosure. The heatmap earns the page — but only after the KPI story is established. Option A: move to expandable section below fold. Option B: surface a single chip ("Pico: Ter 19h–21h, +34% leads") inline with KPIs; expand to full matrix on click.

---

## Persona Red Flags

**Marcos (Gestor de Tráfego, monitors CPL/CTR daily):**
- 4-color KPI grid forces re-learning on every visit — no cognitive anchor for the primary metrics (CPL and CTR deserve visual priority, not equal ranking with impressions)
- WhatsApp is likely 80% of CTAs; the ranking chart shows absolute volumes, not deviation from baseline — not actionable
- Heatmap (highest-value element for scheduling decisions) is buried below fold
- Native date input creates locale friction on a pt-BR system

**Riley (stress tester):**
- Empty period: funnel numbered circles likely render broken without meaningful empty state
- Single CTA type: bar chart with one bar is visually meaningless with no explanation
- Start > end date via native input: no error prevention visible in source
- Zero insight cards: insights section likely collapses with no explanatory text

---

## Strengths

1. **Data model is right.** CTA × time-of-day × funnel stage answers a genuine traffic manager question. The analytical intent is solid.
2. **CTA label mapping is correct.** `WHATSAPP_MESSAGE → WhatsApp` translates API keys to user vocabulary — keep this pattern.
3. **Period shortcuts work.** 7d/30d/90d + custom range is the right structure for campaign window thinking.

---

## Questions to Consider

1. What is the primary decision this page enables? Every element currently has equal visual weight — there's no answer to "what should Marcos do next?"
2. Should deviation from baseline replace absolute ranking? If WhatsApp always tops the chart, that's a static fact, not a decision surface.
3. Should the heatmap be the hero? For scheduling decisions, peak-hours intelligence may be the most actionable output — it could be the dominant visual with KPIs as annotations.
4. How does this page connect to campaign actions? After reading "Tue 20h peaks," can Marcos schedule a campaign or adjust budget from here?
