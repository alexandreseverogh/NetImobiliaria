-- ==============================================================
-- 🚀 SCRIPT MESTRE: CONFIGURAÇÃO COMPLETA DO CRM (PRODUÇÃO)
-- Data: 31/03/2026
-- Rode este script completo no DBeaver conectado à sua VPS.
-- ==============================================================

-- 1. Tabelas de Estrutura do Kanban
CREATE TABLE IF NOT EXISTS public.kanban_colunas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popular Colunas Iniciais (Se vazias)
INSERT INTO public.kanban_colunas (nome, label, ordem)
VALUES 
    ('lead_captado', 'Lead Captado', 1),
    ('entendimento_dor', 'Qualificação / Entendimento', 2),
    ('apresentacao_valor', 'Apresentação / Visita', 3),
    ('fechamento_contato', 'Proposta / Fechamento', 4)
ON CONFLICT (nome) DO NOTHING;

-- 2. Tabela de Ingestão e Staging de Leads
CREATE TABLE IF NOT EXISTS public.leads_staging (
    lead_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(100),
    tag_sonho TEXT,
    resumo_ia TEXT,
    score_prontidao INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'lead_captado',
    raw_json JSONB DEFAULT '{}',
    imovel_id INTEGER,
    estado_fk VARCHAR(50),
    cidade_fk VARCHAR(100),
    corretor_atribuido_id UUID,
    atribuido_em TIMESTAMP WITH TIME ZONE,
    atribuicao_expira_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Atribuição de Leads no Kanban
CREATE TABLE IF NOT EXISTS public.leads_kanban (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID NOT NULL UNIQUE REFERENCES public.leads_staging(lead_uuid) ON DELETE CASCADE,
    coluna_id INTEGER NOT NULL REFERENCES public.kanban_colunas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sistema de Gamificação e Scores por Corretor
CREATE TABLE IF NOT EXISTS public.corretor_scores (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    nivel INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    leads_recebidos INTEGER DEFAULT 0,
    leads_aceitos INTEGER DEFAULT 0,
    conversao_percent DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Registro de Eventos de Marketing (UTMs/Ads)
CREATE TABLE IF NOT EXISTS public.marketing_eventos (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID REFERENCES public.leads_staging(lead_uuid) ON DELETE CASCADE,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    fbclid VARCHAR(255),
    gclid VARCHAR(255),
    plataforma VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Histórico de Atribuições (Anti-looping e Fallback)
CREATE TABLE IF NOT EXISTS public.leads_staging_atribuicoes (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID NOT NULL,
    corretor_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'atribuido',
    motivo JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Índice de Unificação de Origens (Importante para o site Landpaging)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_staging_unificacao 
ON public.leads_staging (email, imovel_id) 
WHERE email IS NOT NULL AND imovel_id IS NOT NULL;

-- 8. Tabela de Auditoria de Atribuição de Prospects (Site)
-- Garante que o histórico do site também seja rastreável.
CREATE TABLE IF NOT EXISTS public.imovel_prospect_atribuicoes (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER NOT NULL,
    corretor_fk UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'atribuido',
    motivo JSONB,
    expira_em TIMESTAMP WITH TIME ZONE,
    data_aceite TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
