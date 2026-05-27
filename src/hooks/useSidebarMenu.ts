'use client';

import { useState, useEffect, useCallback } from 'react';
import { sidebarEventManager } from '@/lib/events/sidebarEvents';

// ============================================================
// TIPOS
// ============================================================

export interface SidebarMenuItem {
  id: string; // UUID ou Inteiro convertido para string
  parent_id: string | null;
  name: string;
  icon: string | null;
  path: string | null;
  order_index: number;
  system_id: string | null;
  is_active: boolean;
  roles_required: string[] | null;
  permission_required: string | null;
  badge_count?: number;
  is_expanded?: boolean;
}

// ============================================================
// HOOK: useSidebarMenu
// ============================================================
// Carrega menu da sidebar do banco de dados
// Filtra por permissões do usuário logado
// ============================================================

export function useSidebarMenu(systemId: string = 'admin') {
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<{ 
    mode: 'light' | 'dark'; 
    primaryColor: string; 
    secondaryColor: string;
    tenantName?: string;
  }>({ 
    mode: 'light', 
    primaryColor: '#2563eb',
    secondaryColor: '#F1F1F1',
    tenantName: 'Carregando...'
  });

  const loadMenuFromDatabase = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar token do localStorage
      const token = localStorage.getItem('admin-auth-token');

      // Preparar headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Adicionar token se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Buscar menu da API
      const userData = localStorage.getItem('admin-user-data');
      let tenantId = '';
      if (userData) {
        const parsed = JSON.parse(userData);
        tenantId = parsed.tenantId || parsed.tenant_id || '';
      }

      console.log(`🔍 [useSidebarMenu] Carregando menu para Tenant: ${tenantId}`);

      const response = await fetch(`/api/admin/sidebar/menu?system_id=${systemId}${tenantId ? `&tenant_id=${tenantId}` : ''}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin-auth-token');
          localStorage.removeItem('admin-user-data');
          window.location.href = '/admin/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error(`Erro ao carregar menu: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Erro ao carregar menu');
      }

      if (data.theme) {
        setTheme(data.theme);
      }

      // 💡 NOVA LÓGICA CIRÚRGICA: 
      // O banco de dados agora já retorna o menu formatado como Categoria -> Funcionalidades.
      // Não precisamos mais montar a hierarquia no frontend.
      const menuFromDb = data.menuItems || [];
      setMenuItems(menuFromDb);
    } catch (err: any) {
      console.error('[SidebarMenu] Erro crítico ao carregar menu:', err);
      setError(err.message || 'Erro interno');
      
      // Proteção contra loop de redirecionamento
      setTimeout(() => {
        if (typeof window !== 'undefined' && !window.location.href.includes('error=session_error')) {
          window.location.href = `/admin/login?error=session_error&callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        }
      }, 1500);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    loadMenuFromDatabase();

    // Escutar eventos de mudança na sidebar
    const unsubscribe = sidebarEventManager.subscribe((data?: any) => {
      if (data && Array.isArray(data)) {
        // Função para mapear recursivamente a árvore do designer para o formato da sidebar
        const mapItem = (item: any): any => ({
          ...item,
          id: String(item.id),
          icon: item.icon_name || item.icon,
          path: item.url || item.path,
          parent_id: item.parent_id ? String(item.parent_id) : null,
          children: item.children ? item.children.map(mapItem) : []
        });

        const transformedTree = data.map(mapItem);
        setMenuItems(transformedTree);
      } else {
        // Caso contrário, recarregar do banco
        loadMenuFromDatabase();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [systemId, loadMenuFromDatabase]);

  return {
    menuItems,
    loading,
    error,
    theme,
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
  // 1. Filtrar e ORDENAR itens raiz
  const rootItems = items
    .filter((item) => item.parent_id === null || !items.some(p => p.id === item.parent_id))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const childItems = items.filter((item) =>
    item.parent_id !== null && items.some(p => p.id === item.parent_id)
  );

  // Função recursiva para construir árvore com ordenação
  function buildTree(parentId: string | null): SidebarMenuItem[] {
    const children = childItems
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

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
