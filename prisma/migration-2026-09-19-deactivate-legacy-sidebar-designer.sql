-- Desativa o catálogo da ferramenta legada "Design da Sidebar"
-- (/admin/configuracoes/sidebar), que escreve em public.sidebar_menu_items —
-- tabela que get_sidebar_menu_for_user() NUNCA lê. Editar por lá nunca teve
-- efeito no que qualquer usuário real vê na sidebar; a ferramenta real é o
-- Cockpit do Produto (/admin/master/cockpit), que edita system_features/
-- system_categorias de verdade.
--
-- A feature já estava com category_id NULL (órfã, nunca apareceu em nenhuma
-- sidebar, nem a de Master) — este UPDATE é só defesa em profundidade: se
-- algum dia alguém reassociar uma categoria a ela sem conhecer este histórico,
-- is_active=false garante que ela continua invisível.
--
-- Aplicado junto com a remoção do código-fonte exclusivo dela (componentes em
-- src/components/admin/SidebarManagement/, hook useSidebarItems.ts, rotas
-- /api/admin/sidebar/menu-items* e /api/admin/master/sidebar/reorder — nenhum
-- tinha consumidor fora desse cluster, confirmado por grep antes de apagar) e
-- a substituição de src/app/admin/configuracoes/sidebar/page.tsx por um aviso
-- apontando para o Cockpit.
--
-- Tabelas sidebar_menu_items / sidebar_menu_item_modules deliberadamente NÃO
-- removidas nesta rodada — dropar tabela é mais irreversível do que o
-- necessário para resolver a confusão (sem nenhuma UI/API restante
-- referenciando elas, ficam inertes).

UPDATE public.system_features
SET is_active = false
WHERE id = 44
  AND name = 'Design da Sidebar';
