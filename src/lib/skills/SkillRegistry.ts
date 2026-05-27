import dynamic from 'next/dynamic';
import React from 'react';

/**
 * REGISTRO CENTRAL DE SUPERPOWER SKILLS
 * Aqui mapeamos os slugs do banco de dados para os componentes reais.
 * Isso permite Code Splitting automático e Lazy Loading.
 */
export const SKILL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  // Skill de Dashboard Premium
  'dashboards': dynamic(() => import('@/components/skills/premium/ExecutiveDashboard'), {
    loading: () => null,
    ssr: false
  }),

  // Skill de Revenue Intelligence (Receitas)
  'receitas-destaques': dynamic(() => import('@/components/skills/premium/RevenueIntelligence'), {
    loading: () => null,
    ssr: false
  }),

  // Skill de Kanban Ultra-Performance
  'leads-kanban': dynamic(() => import('@/components/skills/premium/KanbanLeads'), {
    loading: () => null,
    ssr: false
  }),

  // Adicione novas skills aqui conforme forem desenvolvidas...
};

export type SkillSlug = keyof typeof SKILL_COMPONENTS;
