-- ====================================================================
-- PILLAR 2: IAM & Multi-tenancy (ROLLBACK)
-- 001_create_iam_structure.rollback.sql
-- Descrição: Reverte as tabelas de Tenants e Memberships.
-- ====================================================================

-- 1. Remove Vínculos e Tenants (CASCADE cuidará do resto)
DROP TABLE IF EXISTS user_tenant_membership CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
