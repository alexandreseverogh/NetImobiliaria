-- Migration: Mover URL da feature Aprovações do Agente
-- De: /admin/master/aprovacoes
-- Para: /admin/campanhas/aprovacoes
-- Data: 2026-06-23

UPDATE public.system_features
SET url        = '/admin/campanhas/aprovacoes',
    updated_at = NOW()
WHERE id   = 106
  AND slug = 'master-aprovacoes-agente';
