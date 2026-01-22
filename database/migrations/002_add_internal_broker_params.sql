-- Migration: Add parameters for Internal Broker Transbordo
ALTER TABLE parametros
ADD COLUMN IF NOT EXISTS proximos_corretores_recebem_leads_internos INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS sla_minutos_aceite_lead_interno INTEGER DEFAULT 15;

-- Update existing row with defaults if needed
UPDATE parametros 
SET 
  proximos_corretores_recebem_leads_internos = 3, 
  sla_minutos_aceite_lead_interno = 15
WHERE proximos_corretores_recebem_leads_internos IS NULL;
