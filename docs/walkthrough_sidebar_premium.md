# Walkthrough: Governança Master e Redesign de Elite

Este documento detalha a reestruturação da plataforma para suportar a **Hierarquia de Ferro** e o novo design premium.

## 1. Arquitetura "Hierarquia de Ferro"
Implementamos no banco de dados a regra de ouro: **Segmento -> Módulo -> Empresa -> Perfis -> Permissões**.

- **Ponte Segmento-Módulo:** Tabela `system_segment_modules` (N:N), permitindo que módulos como o **CRM** sejam compartilhados entre indústrias.
- **Migração de Blueprints:** Registros de funcionalidades migrados automaticamente para este novo modelo.
- **SQL Blindado:** Função `get_sidebar_menu_for_user` refatorada com um **Recursive CTE**, validando permissões e mantendo a **Ordem de Fábrica**.

## 2. Interface Premium de Gestão da Sidebar
A central de design da barra lateral foi reconstruída com estética **Glassmorphism**.

- **Premium Menu Manager:** Novo canvas de gestão com Drag-and-Drop.
- **Bulk Save:** Sincronização em massa da ordem de exibição.
- **Modais Master:** Redesign total dos modais de criação e edição.

## 3. Arquivos Principais
- [update_sidebar_iron_hierarchy_safe.sql](file:///c:/NetImobiliária/net-imobiliaria/database/update_sidebar_iron_hierarchy_safe.sql)
- [PremiumMenuManager.tsx](file:///c:/NetImobiliária/net-imobiliaria/src/components/admin/SidebarManagement/PremiumMenuManager.tsx)
- [useSidebarMenu.ts](file:///c:/NetImobiliária/net-imobiliaria/src/hooks/useSidebarMenu.ts)

## 4. Ordem e Prioridades
A **Ordem de Fábrica** foi fixada, garantindo que o item **MASTER PLATFORM** seja sempre o primeiro (índice 0), independentemente da ordem de criação dos registros.
