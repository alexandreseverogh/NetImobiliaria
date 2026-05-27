# 🔍 ANÁLISE DE IMPACTO: CRM FASE 1 - FUNDAÇÃO (REAL ESTATE INTELLIGENCE)

**Data:** 29/03/2026 | **Solicitante:** Alexandre Severo | **Desenvolvedor:** Antigravity (AI)

---

## 📊 RESUMO EXECUTIVO
- **Tipo:** NOVA FUNCIONALIDADE (Modular)
- **Risco:** BAIXO (Nova Rota Isolada)
- **Impacto:** NENHUM EM FUNCIONALIDADES ATUAIS
- **Recomendação:** APROVAR - Essencial para a evolução v2.0 do sistema

---

## 🎯 OBJETIVO
Implementar a infraestrutura básica ("Foundation") do CRM Real Estate Intelligence, criando a nova rota `/crm`, as tabelas de `leads_staging` para captação bruta e o motor inicial de deduplicação (Match Engine), preparando o sistema para as fases de inteligência emocional e automação de vendas.

---

## 📋 FUNCIONALIDADES AFETADAS & NOVAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| **Rota /crm** | ADICIONAR | ZERO | Criar diretório `src/app/crm` isolado. |
| **API /api/crm/*** | ADICIONAR | ZERO | Criar endpoints específicos para o roteador de leads. |
| **Login Público** | MODIFICAR (COLAVO) | BAIXO | Adicionar `lead_uuid` como FK opcional para vincular clientes a leads de CRM. |
| **Admin Sidebar** | MUDAR | BAIXO | Adicionar link para o sistema CRM (visível apenas para corretores/gestores). |

---

## 🗄️ IMPACTO BANCO DE DADOS (INCREMENTAL)
- **Novas Tabelas (Principais):**
  - `leads_staging`: Destino de todos os leads de APIs e redes sociais.
  - `leads_kanban`: Gestão de estados do lead no novo funil.
  - `kanban_colunas`: Definição dinâmica das colunas do CRM.
  - `marketing_eventos`: Atribuição de UTMs e click IDs (Meta/Google).
  - `consentimentos_lead`: Registro de opt-in conforme LGPD.
- **Estrutura existente:** Preservada. Nenhuma tabela atual será deletada.
- **Dados existentes:** Os `prospects` atuais em `imovel_prospects` continuarão funcionando, podendo ser migrados no futuro.
- **Rollback possível:** Sim, via revert da branch e deleção das novas tabelas.

---

## 🔌 IMPACTO APIs
- **Novas Rotas:** `/api/crm/leads`, `/api/crm/kanban`, `/api/crm/marketing`.
- **Breaking changes:** Nenhuma. APIs públicas (`/api/public`) e admin (`/api/admin`) permanecem intocadas.
- **Middleware:** O sistema de autenticação será estendido para validar a role `crm_user` na nova rota `/crm`.

---

## 🎨 IMPACTO FRONTEND
- **Identidade Cockpit:** O `/crm` usará um layout otimizado para operações de corretagem (Cards, Funis, Barra de Chat lateral).
- **Separation of Concerns:** Componentes de CRM ficarão em `src/components/crm`, sem poluir o diretório de componentes públicos ou administrativos.

---

## ⚠️ RISCOS IDENTIFICADOS & MITIGAÇÃO
1. **Risco de Performance:** Tabelas de logs de marketing em massa. 
   - **Mitigação:** Criação de índices específicos por `lead_uuid` e `created_at` desde o dia 1.
2. **Conflito de Nomenclatura:** Endpoints com nomes similares aos do `/admin`. 
   - **Mitigação:** Prefixos rigorosos `/api/crm/`.

---

## 🛡️ PLANO ROLLBACK (ESTRATÉGIA DE BRANCH)
Todo o desenvolvimento será feito na branch **`feature/crm-fase1-fundacao`**.
1. **Emergência:** Se o build quebrar, deletar o diretório `src/app/crm` e reverter as migrations 060 a 065 (que serão criadas para este módulo).
2. **Tempo estimado:** 10 minutos.

---

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Validação de login na nova rota `/crm`.
- [ ] Teste de ingestão de lead via API de teste na `leads_staging`.
- [ ] Verificação de integridade referencial entre `leads_staging` e `usuarios`.
- [ ] Teste de permissões (um usuário sem role de CRM não deve acessar `/crm`).

---

## ✅ AUTORIZAÇÃO (CHECKLIST)
- [ ] Análise aprovada pelo solicitante
- [ ] Risco de quebra de Feeds/Admin é ZERO
- [ ] Plano de branches isoladas confirmado
- [ ] Backup confirmado

---
**Assinatura:** Antigravity Agent (AI) **Data:** 29/03/2026
