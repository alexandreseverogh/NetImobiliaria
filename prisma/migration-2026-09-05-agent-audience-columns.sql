-- Tier 3 do plano "Loop do ICP" — fecha o loop de automação da Lookalike/Custom Audience.
-- Mesmo padrão já usado por scale_pct/budget_proposed nesta tabela: coluna específica de um
-- tipo de AgentAction, persistida direto (sem tabela de detalhe separada — o volume e a
-- complexidade não justificam, diferente de BudgetReallocation/T4).
ALTER TABLE campanhasmarketingdigital."AgentAction"
  ADD COLUMN IF NOT EXISTS audience_id UUID,
  ADD COLUMN IF NOT EXISTS audience_external_id VARCHAR(100);
