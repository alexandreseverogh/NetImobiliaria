-- Unifica o corte de "atenção" (status_warn_min) em 40 em todas as dimensões da auditoria.
-- Antes: 45 em creative, funnel_health, performance e tracking; 40 em spend_efficiency.
UPDATE campanhasmarketingdigital.audit_scoring_bands
SET score = 40, updated_at = now()
WHERE rule_key = 'status_warn_min' AND score <> 40;
