-- Padroniza o nome das ações de permissão das 4 features da família "Configurações CRM"
-- (Agentes de Aceleração, Catálogo de Atividades, Configurações CRM, Dashboard de ROI CRM —
-- feature_id 120/119/76/65), que foram cadastradas com `read/write/delete/admin` em vez do
-- vocabulário `read/create/update/delete/execute` que a Matriz de Governança
-- (/admin/permissoes) reconhece.
--
-- Achado real (docs/CHECKPOINT.md, 2026-08-14): a tela só renderiza um toggle por ação se
-- existir uma linha em `permissions` com esse nome EXATO — `write`/`admin` nunca batem com
-- nenhum dos 5 nomes hardcoded na tela (src/app/admin/permissoes/page.tsx:592), então os
-- toggles de "Criar"/"Editar"/"Executar" ficam cinza/impossíveis de conceder por essas 4
-- features, mesmo as permissões existindo de verdade no banco.
--
-- Seguro por construção — confirmado antes de aplicar:
-- 1. `write` já é mapeado pra 'UPDATE' na hora do login (src/app/api/admin/auth/login/
--    route.ts) — este rename só alinha o nome cru no banco com o que o sistema já trata
--    como UPDATE em runtime. Zero mudança de comportamento.
-- 2. Nenhuma rota de API do projeto chama requireApiPermission(request, '<um desses 4
--    slugs>', ...) — confirmado via grep em todo src/app/api. As únicas 2 consumidoras
--    reais são a visibilidade de sidebar (só olha se existe QUALQUER ação em
--    read/view/execute/visualizar/acessar — 'read' já cobre isso, intocado aqui) e esta
--    própria tela de gestão. Renomear write/admin não muda autorização de API nenhuma.
-- 3. `role_permissions` referencia por `permission_id` (PK), não por nome de ação — os
--    grants já concedidos (hoje só ao role "Administrador", nas 2 linhas do nome duplicado)
--    sobrevivem ao rename automaticamente, sem precisar tocar em role_permissions.
--
-- `write` → `update` (mesmo nível semântico já usado no mapeamento de login).
-- `admin` → `execute` (única vaga livre no vocabulário de 5 nomes da tela; nada no código
-- depende do valor literal 'admin' pra essas 4 features, então a única perda é cosmética —
-- passa a aparecer como "Executar" em vez de uma ação sem coluna nenhuma pra mostrar).

UPDATE public.permissions
   SET action = 'update'
 WHERE feature_id IN (120, 119, 76, 65) AND action = 'write';

UPDATE public.permissions
   SET action = 'execute'
 WHERE feature_id IN (120, 119, 76, 65) AND action = 'admin';
