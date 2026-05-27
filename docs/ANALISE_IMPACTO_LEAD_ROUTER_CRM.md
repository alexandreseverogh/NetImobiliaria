# 📋 Análise de Impacto: Roteamento Inteligente de Leads (CRM v2.0)

**Autor:** Antigravity (AI Coding Assistant)  
**Data:** 30 de Março de 2026  
**Objetivo:** Implementar o motor de distribuição automática para leads da `leads_staging`, garantindo a prioridade do dono da captação e o transbordo multinível até o plantonista.

---

## 🛡️ Conformidade com Guardian Rules

1. **Incremental Sim, Destrutivo Nunca:** Nenhuma tabela existente será alterada. Usaremos as colunas já criadas (`leads_staging.imovel_id`, `imoveis.corretor_fk`).
2. **Segurança & RBAC:** O roteamento respeitará os papéis de `Corretor` e o campo `ativo` dos usuários.
3. **Integridade de Dados:** Todas as atribuições serão registradas na tabela de auditoria/logs para rastreabilidade ("por que ele recebeu este lead?").

---

## 🎯 Escopo Técnico

A distribuição de leads será acionada nos seguintes gatilhos:
- **Evento 1:** Entrada de novo lead na `leads_staging` (site, Meta, WhatsApp).
- **Evento 2:** Expiração de SLA (Transbordo automático via Cron).

**⚠️ DINAMISMO TOTAL:** Jamais usaremos valores "chumbados" (hardcoded). Todas as quantidades de tentativas e tempos de expiração serão regidas pela tabela de `parametros` do sistema.

---

## 📊 Fluxo de Decisão (Hierarchy Engine)

O algoritmo seguirá estritamente esta ordem de prioridade:

### **Nível 1: Dono da Captação (Property Owner)**
- **Verificação:** Se o lead tem um `imovel_id` vinculado (origem do interesse).
- **Ação:** Buscar `corretor_fk` na tabela `imoveis`.
- **Condição:** Se o corretor estiver `ativo` e com CRECI validado, ele recebe o lead primeiro.
- **SLA Dinâmico:**
  - Se Corretor **Externo**: Regido por `parametros.sla_minutos_aceite_lead`.
  - Se Corretor **Interno**: Regido por `parametros.sla_minutos_aceite_lead_interno`.

### **Nível 2: Roteamento Geográfico (Área de Atuação)**
- **Condição:** Se não houver imóvel vinculado, dono inexistente ou SLA expirado.
- **Sub-nível A (Externo):** Tentar até **`parametros.proximos_corretores_recebem_leads`** corretores da área.
  - **SLA:** Regido por **`parametros.sla_minutos_aceite_lead`**.
- **Sub-nível B (Interno):** Tentar até **`parametros.proximos_corretores_recebem_leads_internos`** corretores da área.
  - **SLA:** Regido por **`parametros.sla_minutos_aceite_lead_interno`**.
- **Critério de Seleção:** Round Robin (Menos leads hoje + Maior tempo ocioso).

### **Nível 3: Destino Final (Plantonista)**
- **Condição:** Se todas as tentativas acima falharem ou expirarem.
- **Ação:** O lead é encaminhado para o pool de **Plantonistas** (`is_plantonista = true`).
- **Garantia:** O Plantonista é o receptor universal final para evitar perda de lead.

---

## 🛠️ Plano de Implementação (Proposta Refatorada)

### 1. Unificação do Motor: `src/lib/routing/distributionEngine.ts`
Em vez de duplicar código, vamos **extrair a inteligência de decisão** de `prospectRouter.ts` para um motor agnóstico em uma biblioteca central.
- O motor receberá (Localidade, Perfil, Imóvel_Alvo) e retornará o "Melhor Corretor".
- **Lógica de SLA:** O motor calculará o timestamp de expiração (`expira_em`) baseado na tipologia do corretor selecionado, consultando os campos distintos:
  - `sla_minutos_aceite_lead` (Externo)
  - `sla_minutos_aceite_lead_interno` (Interno)
- Evita duplicação e garante que o CRM e o Site usem a mesma regra de negócio.

### 2. Integração na API de Ingestão: `src/app/api/crm/leads/route.ts`
Chamar o motor unificado logo após a identificação do lead em staging.

### 3. Melhoria no Cron de Transbordo: `src/app/api/cron/transbordo/route.ts`
Expandir a verificação de expiração para contemplar a tabela `leads_staging` usando o novo motor.

---

## ⚠️ Análise de Risco e Impacto

| Risco | Impacto | Mitigação |
|---|---|---|
| **Evolução de Parâmetros** | Médio | Alterações no painel administrativo refletirão imediatamente no transbordo sem novos deploys. |
| **Duplicação de Lógica** | Baixo | Eliminada pela unificação no `distributionEngine.ts`. |
| **Concorrência** | Médio | Uso de `FOR UPDATE SKIP LOCKED` para isolamento de fila. |

---

## 📅 Próximos Passos (Aguardando Aprovação)
1. Iniciar a extração da lógica para `src/lib/routing/distributionEngine.ts`.
2. Mapear dependências de banco para os novos campos de `leads_staging`.

> [!IMPORTANT]
> **Nenhuma alteração de código ou banco foi realizada.** Esta é uma análise técnica para sua revisão conforme determinado pelas Guardian Rules.
