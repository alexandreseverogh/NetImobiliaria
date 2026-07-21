-- Bug real encontrado ao vivo durante T3 (docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md):
-- POST /api/crm/leads lança 500 pra QUALQUER tenant sem nenhum kanban_colunas ativo
-- (onboarding novo, ou tenant só-Mensageria onde um lead é criado silenciosamente via a
-- infra compartilhada) — leads_kanban.coluna_id vira NULL (subquery sem resultado), e o
-- trigger trg_log_kanban_ciclos tentava inserir esse NULL numa coluna NOT NULL de
-- leads_kanban_ciclos. leads_staging já tinha commitado antes (não é perda de dado), mas
-- o caller via 500 — efetivamente uma falha de "lead não confirmado" no ato da criação.
--
-- Fix: o trigger passa a pular o registro de auditoria de ciclo quando não há coluna_id
-- (NULL) — sem coluna configurada, não existe ciclo de kanban pra registrar; o lead
-- continua sendo criado normalmente em leads_staging/leads_kanban. Zero mudança de
-- comportamento pra qualquer tenant que já tem kanban_colunas configuradas (100% dos
-- tenants reais hoje).

CREATE OR REPLACE FUNCTION public.trg_log_kanban_ciclos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Gatilho nativo para registrar o ciclo histórico imune a bugs de backend.
    IF (TG_OP = 'INSERT') THEN
        IF NEW.coluna_id IS NOT NULL THEN
            INSERT INTO leads_kanban_ciclos (lead_uuid, coluna_id, data_entrada)
            VALUES (NEW.lead_uuid, NEW.coluna_id, NOW());
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE' AND OLD.coluna_id IS DISTINCT FROM NEW.coluna_id) THEN
        IF OLD.coluna_id IS NOT NULL THEN
            UPDATE leads_kanban_ciclos
            SET data_saida = NOW()
            WHERE lead_uuid = OLD.lead_uuid AND coluna_id = OLD.coluna_id AND data_saida IS NULL;
        END IF;

        IF NEW.coluna_id IS NOT NULL THEN
            INSERT INTO leads_kanban_ciclos (lead_uuid, coluna_id, data_entrada)
            VALUES (NEW.lead_uuid, NEW.coluna_id, NOW());
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$function$;
