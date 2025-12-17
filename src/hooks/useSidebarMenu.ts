'use client';

import { useState, useEffect } from 'react';
import { sidebarEventManager } from '@/lib/events/sidebarEvents';

// ============================================================
// TIPOS
// ============================================================

export interface SidebarMenuItem {
  id: number;
  parent_id: number | null;
  name: string;
  icon_name: string;
  url: string | null;
  resource: string | null;
  order_index: number;
  is_active: boolean;
  roles_required: string[] | null;
  permission_required: string | null;
  permission_action: string | null;
  description: string | null;
  has_permission: boolean; // Adicionado pela função do banco
}

// ============================================================
// HOOK: useSidebarMenu
// ============================================================
// Carrega menu da sidebar do banco de dados
// Filtra por permissões do usuário logado
// ============================================================

export function useSidebarMenu() {
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMenuFromDatabase();
    
    // Escutar eventos de mudança na sidebar
    const unsubscribe = sidebarEventManager.subscribe(() => {
      loadMenuFromDatabase();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadMenuFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar token do localStorage
      const token = localStorage.getItem('auth-token');

      // Preparar headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Adicionar token se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Buscar menu da API
      const response = await fetch('/api/admin/sidebar/menu', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar menu: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar menu');
      }

      // Transformar resposta em estrutura hierárquica
      const hierarchicalMenu = buildHierarchicalMenu(data.menuItems);

      setMenuItems(hierarchicalMenu);
    } catch (err) {
      console.error('Erro ao carregar menu:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMenuItems([]); // Fallback: menu vazio
    } finally {
      setLoading(false);
    }
  };

  return {
    menuItems,
    loading,
    error,
    reloadMenu: loadMenuFromDatabase,
  };
}

// ============================================================
// FUNÇÃO HELPER: buildHierarchicalMenu
// ============================================================
// Converte lista plana em estrutura hierárquica
// ============================================================

function buildHierarchicalMenu(
  items: SidebarMenuItem[]
): SidebarMenuItem[] {
  // Filtrar apenas itens com permissão
  const filteredItems = items.filter((item) => item.has_permission);

  // Separar itens raiz e filhos
  // REGRA: Se um filho não tem pai visível, ele vira root (filho órfão)
  const parentIds = new Set(filteredItems.map(item => item.id));
  
  const rootItems = filteredItems.filter((item) => 
    item.parent_id === null || !parentIds.has(item.parent_id)  // Órfãos viram root!
  );
  const childItems = filteredItems.filter((item) => 
    item.parent_id !== null && parentIds.has(item.parent_id)  // Só filhos com pai visível
  );

  // Função recursiva para construir árvore
  function buildTree(parentId: number | null): SidebarMenuItem[] {
    const children = childItems.filter((item) => item.parent_id === parentId);
    return children.map((child) => ({
      ...child,
      children: buildTree(child.id),
    }));
  }

  // Construir árvore para cada item raiz
  const hierarchicalMenu = rootItems.map((root) => ({
    ...root,
    children: buildTree(root.id),
  }));

  return hierarchicalMenu;
}

// ============================================================
// TIPO EXPORTADO PARA COMPONENTES
// ============================================================

export type SidebarMenuWithChildren = SidebarMenuItem & {
  children?: SidebarMenuItem[];
};
