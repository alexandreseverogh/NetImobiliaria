# 🔍 ANÁLISE DE IMPACTO: INTEGRAÇÃO LANDPAGING -> CRM INTELLIGENCE

**Data:** 31/03/2026 | **Solicitante:** CRM Strategy | **Desenvolvedor:** Intelligence AI  
**Status:** 🚨 **REVISÃO OBRIGATÓRIA ANTES DE IMPLEMENTAR**

---

## 📊 RESUMO EXECUTIVO
- **Tipo:** MELHORIA / INTEGRAÇÃO (CRM Fase 3)
- **Risco:** **MÉDIO (CONEXÃO PÚBLICA)**
- **Impacto:** **BAIXO (NAS FUNCIONALIDADES EXISTENTES)**
- **Recomendação:** APROVAR COM GATEWAY DE SANITIZAÇÃO

## 🎯 OBJETIVO
Conectar o formulário de "Tenho Interesse" (Landpaging Público) ao motor de automação do `CRM Staging`, garantindo que todo lead seja imediatamente qualificado pela IA e roteado conforme as regras de meritocracia (Round Robin).

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| `TenhoInteresseFormModal` (UI) | Aditivo | Baixo | Adicionar campo hidden de `utm_campaign`. |
| `leads` API Public | Modificativo | **MÉDIO** | Redirecionar para `leads_staging` em vez da fila antiga. |
| `landpaging` | Nenhum | Zero | Preservar as rotas de SEO. |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas modificadas:** `leads_staging` (Ponto de inserção inicial).
- **Estrutura alterada:** Nenhuma estrutura legatária será modificada (Incremental Only).
- **Dados existentes:** Os leads no sistema antigo serão mantidos para histórico.
- **Rollback possível:** Sim. O redirecionamento de fluxos pode ser revertido em segundos via config no `.env`.

## 🔌 IMPACTO APIs
- **Rotas modificadas:** `/api/public/leads` (Captura).
- **Breaking changes:** **NÃO.** O contrato da API pública (JSON input) permanecerá idêntico.
- **Middleware afetado:** `RateLimitMiddleware` (Ajustar para permitir rajadas de leads de campanhas FB Ads).

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** `src/components/TenhoInteresseFormModal.tsx`.
- **UX alterada:** Nenhuma mudança visual para o usuário final. Modificações apenas no `onSubmit`.

## ⚠️ RISCOS IDENTIFICADOS
1.  **Lead Flooding:** Um pico via CAPI (Facebook) poderia inundar a `leads_staging`. Mitigação: `LeadsHarnessQueue` (Buffer).
2.  **IA Timeout:** O processamento da `ConciergeService` não pode atrasar a resposta HTTP para o usuário. Mitigação: **Processamento Async / Worker.**

## 🛡️ PLANO ROLLBACK
1.  Alterar `CRM_ENABLED=false` no `.env`.
2.  Redirecionar o handler do `TenhoInteresseFormModal` para o endpoint legado.
3.  **Tempo estimado:** 5 minutos.

---

## ✅ AUTORIZAÇÃO (GUARDIAN قواعد)
- [ ] Análise aprovada (Aguardar aprovação do USER)
- [ ] Riscos aceitos
- [ ] Plano de rollback testado
- [ ] Backup confirmado

🛰️ **AUTORIZAÇÃO SOLICITADA PARA PROSSEGUIR COM A CONEXÃO DO LANDPAGING AO CRM STAGING.**
