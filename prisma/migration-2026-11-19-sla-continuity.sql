-- SLA de continuidade: prazo para o atendente responder sempre que a bola volta para nós.
-- Nulo = sem SLA de continuidade (comportamento atual preservado).
ALTER TABLE mensageria.sla_policies
  ADD COLUMN IF NOT EXISTS continuity_target_min INTEGER;
