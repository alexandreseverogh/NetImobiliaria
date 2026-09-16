-- Continuação da migração anterior (migration-2026-08-14-permissions-standardize-crm-config-
-- actions.sql, que cobriu só 4 features) — usuário reportou que o mesmo problema persistia em
-- outra categoria da Matriz de Governança (/admin/permissoes). Varredura confirmou que o
-- padrão `read/write/delete/admin` (em vez de `read/create/update/delete/execute`, os 5 nomes
-- que a tela reconhece) não era exclusivo daquelas 4 — era o padrão de TODA uma leva de
-- features do CRM cadastrada numa sessão anterior. Esta migração generaliza: qualquer
-- `permissions.action` ainda em 'write'/'admin', platform-wide, não só uma lista fixa de ids.
--
-- Mesma garantia de segurança já validada na migração anterior — reconfirmada pra estas 9:
-- 1. 'write' já virava 'UPDATE' no JWT desde o login (mesmo branch do CASE); rename não muda
--    o valor final no token, só o nome cru armazenado no banco.
-- 2. Nenhuma rota chama requireApiPermission com action ADMIN/EXECUTE pra nenhum destes slugs
--    — confirmado via grep em todo src/app/api. `crm-segment-builder` é a única com uso real
--    (READ/UPDATE, nunca ADMIN/EXECUTE) — 'write'→'update' preserva o comportamento, 'admin'
--    nunca era checado ali mesmo.
-- 3. role_permissions referencia por permission_id (PK) — grants existentes sobrevivem ao
--    rename automaticamente.

-- Achado extra durante a varredura: "Ranking de Leads" (feature_id 58) já tinha um
-- permissions row 'execute' PRÓPRIO e distinto (id 856, mais antigo que os outros 4 dessa
-- feature) além do 'admin' redundante do padrão write/admin — as duas linhas colidiriam no
-- rename genérico abaixo (UNIQUE(feature_id, action)). 'admin' nunca é checado em código pra
-- essa feature (nenhuma rota usa 'ranking-leads' em requireApiPermission) e cobre exatamente
-- a mesma coluna da Matriz de Governança que 'execute' já cobre — é puramente redundante, não
-- uma permissão com efeito próprio. Removida (CASCADE já revoga o grant do "Administrador"
-- nela, que mantém intacto o grant de 'execute' que já tinha separadamente).
DELETE FROM public.permissions WHERE feature_id = 58 AND action = 'admin';

UPDATE public.permissions
   SET action = 'update'
 WHERE action = 'write';

UPDATE public.permissions
   SET action = 'execute'
 WHERE action = 'admin';
