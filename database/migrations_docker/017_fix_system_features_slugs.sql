-- 017_fix_system_features_slugs.sql
-- Corrige slugs e nomes com problemas de encoding ou divergentes do código.

DO $$
BEGIN
    -- 1. Corrigir Receitas Destaques
    UPDATE public.system_features 
    SET slug = 'receitas-destaques', 
        name = 'Receitas de Destaques'
    WHERE slug = 'receitas-an-ncios-destaque' OR id = 57;

    -- 2. Corrigir Destacar Imóvel
    UPDATE public.system_features 
    SET slug = 'destacar-imovel'
    WHERE slug = 'destacar-im-vel' OR id = 53;

    -- 3. Corrigir Parâmetros (remover duplicatas e fixar slug)
    -- Se houver o ID 54 (par-metros), vamos mover as permissões dele (se houver) e deletá-lo
    
    -- Primeiro, deletar permissões duplicadas em 'par-metros' que já existem em 'parametros'
    DELETE FROM public.permissions p
    WHERE feature_id = (SELECT id FROM public.system_features WHERE slug = 'par-metros' LIMIT 1)
    AND EXISTS (
        SELECT 1 FROM public.permissions p2 
        WHERE p2.feature_id = (SELECT id FROM public.system_features WHERE slug = 'parametros' LIMIT 1)
        AND p2.action = p.action
    );

    -- Agora mover as que sobraram (se houver)
    UPDATE public.permissions 
    SET feature_id = (SELECT id FROM public.system_features WHERE slug = 'parametros' LIMIT 1)
    WHERE feature_id = (SELECT id FROM public.system_features WHERE slug = 'par-metros' LIMIT 1)
    AND EXISTS (SELECT 1 FROM public.system_features WHERE slug = 'parametros');

    -- Deletar a duplicata com slug errado
    DELETE FROM public.system_features WHERE slug = 'par-metros';
    
    -- Fixar o nome do que sobrou
    UPDATE public.system_features SET name = 'Parâmetros', slug = 'parametros' WHERE slug = 'parametros';

    -- 4. Corrigir Valores de Anúncios de Destaques
    UPDATE public.system_features 
    SET slug = 'valores-anuncios-destaques'
    WHERE slug = 'valores-de-an-ncios-de-destaques' OR id = 55;

END $$;

