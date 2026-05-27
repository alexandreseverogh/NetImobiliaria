-- ============================================================
-- SCRIPT DE MIGRAÇÃO ULTRA-ROBUSTO - ISOLAMENTO MULTI-TENANT
-- ============================================================

DO $$ 
DECLARE
    t_name TEXT;
    tables_to_fix TEXT[] := ARRAY['login_logs', 'audit_logs', 'login_attempts', 'audit_2fa_logs', 'email_logs', 'login_logs_purged'];
BEGIN
    FOREACH t_name IN ARRAY tables_to_fix LOOP
        -- 1. Verificar se a tabela existe
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_name) THEN
            
            -- 2. Tentar adicionar a coluna tenant_id
            BEGIN
                EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL', t_name);
                RAISE NOTICE '✅ Tabela %: Coluna tenant_id adicionada ou já existente.', t_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Tabela %: Erro ao adicionar coluna - %', t_name, SQLERRM;
            END;

            -- 3. Tentar criar os índices
            BEGIN
                EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id)', 'idx_' || t_name || '_tenant_id', t_name);
                RAISE NOTICE '✅ Tabela %: Índice de tenant_id criado.', t_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Tabela %: Erro ao criar índice - %', t_name, SQLERRM;
            END;

        ELSE
            RAISE NOTICE '⚠️ Tabela %: Não existe no banco de dados. Pulando...', t_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- RECONSTRUÇÃO DAS FUNÇÕES (SQL DINÂMICO PARA EVITAR ERRO DE VALIDAÇÃO)
-- ============================================================

-- Função para estatísticas de logs
CREATE OR REPLACE FUNCTION get_login_logs_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (total_logs BIGINT, success_count BIGINT, failure_count BIGINT, unique_users BIGINT, last_login TIMESTAMP) AS $$
BEGIN
  RETURN QUERY EXECUTE '
    SELECT 
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE success = true)::BIGINT,
      COUNT(*) FILTER (WHERE success = false)::BIGINT,
      COUNT(DISTINCT user_id)::BIGINT,
      MAX(created_at)
    FROM login_logs
    WHERE ($1 IS NULL OR tenant_id = $1)'
  USING p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Função para expurgo de logs
CREATE OR REPLACE FUNCTION purge_login_logs_with_archive(p_retention_days INTEGER, p_purged_by UUID, p_reason TEXT DEFAULT 'MANUAL_PURGE', p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (deleted_count INTEGER, archived_count INTEGER, execution_time INTERVAL) AS $$
DECLARE
  v_start_time TIMESTAMP := clock_timestamp();
  v_deleted INTEGER;
  v_archived INTEGER;
  v_cutoff_date TIMESTAMP := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN
  -- Arquivamento dinâmico
  EXECUTE '
    INSERT INTO login_logs_purged (user_id, username, action, ip_address, user_agent, two_fa_used, two_fa_method, success, failure_reason, session_id, created_at, tenant_id, purged_at, purged_by, purge_reason)
    SELECT user_id, username, action, ip_address, user_agent, two_fa_used, two_fa_method, success, failure_reason, session_id, created_at, tenant_id, NOW(), $1, $2
    FROM login_logs
    WHERE created_at < $3 AND ($4 IS NULL OR tenant_id = $4)'
  USING p_purged_by, p_reason, v_cutoff_date, p_tenant_id;
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  -- Deleção dinâmica
  EXECUTE 'DELETE FROM login_logs WHERE created_at < $1 AND ($2 IS NULL OR tenant_id = $2)'
  USING v_cutoff_date, p_tenant_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted, v_archived, clock_timestamp() - v_start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' AND table_name IN ('login_logs', 'audit_logs', 'login_attempts', 'audit_2fa_logs', 'email_logs', 'login_logs_purged')
ORDER BY table_name;
