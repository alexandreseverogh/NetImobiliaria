'use client'

import Link from 'next/link'
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

/**
 * Esta tela ("Gerenciar Sidebar" / "Design da Sidebar") foi aposentada em
 * 2026-09-19. Ela editava a tabela `public.sidebar_menu_items` — uma tabela
 * que `get_sidebar_menu_for_user()` (a função real que monta a sidebar de
 * todo mundo) NUNCA leu. Qualquer alteração feita aqui nunca teve efeito
 * visível em nenhuma sidebar real, de nenhum usuário, em nenhum tenant.
 *
 * O código funcional desta tela (SidebarManagement/*, useSidebarItems.ts,
 * /api/admin/sidebar/menu-items*, /api/admin/master/sidebar/reorder) foi
 * removido — nenhum tinha consumidor fora deste cluster morto (confirmado
 * por busca em todo o repo antes de apagar). O catálogo (`system_features`
 * id=44) foi desativado (`is_active=false`) — ver
 * prisma/migration-2026-09-19-deactivate-legacy-sidebar-designer.sql.
 *
 * A ferramenta real para adicionar/reordenar itens da sidebar é o
 * "Cockpit do Produto" (/admin/master/cockpit) — edita system_features/
 * system_categorias de verdade, as tabelas que a função de sidebar lê.
 *
 * A rota em si (não o componente) foi mantida — de propósito — só com este
 * aviso, para que quem chegar aqui por um link/favorito antigo entenda o
 * porquê e seja direcionado ao lugar certo, em vez de um 404 sem contexto.
 */
export default function LegacySidebarDesignerRetiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Esta tela foi aposentada</h1>
        <p className="mt-3 text-sm text-gray-600">
          "Gerenciar Sidebar" editava uma tabela que nunca influenciou a sidebar real de nenhum
          usuário — qualquer alteração feita aqui não tinha efeito nenhum. Foi desativada para
          evitar essa confusão.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Para adicionar, reordenar ou provisionar itens de verdade na sidebar, use o{' '}
          <span className="font-semibold text-gray-800">Cockpit do Produto</span>.
        </p>
        <Link
          href="/admin/master/cockpit"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Ir para o Cockpit do Produto
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
