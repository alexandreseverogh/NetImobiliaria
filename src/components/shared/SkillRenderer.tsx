'use client';

import React from 'react';
import { useSkills } from '@/hooks/useSkills';
import { SKILL_COMPONENTS } from '@/lib/skills/SkillRegistry';

interface SkillRendererProps {
  /** Slug da funcionalidade no banco de dados */
  slug: string;
  /** Componente padrão (legado) que será exibido se a Skill não estiver ativa */
  fallback: React.ReactNode;
  /** Dados que serão passados para a Skill (Contrato de Dados) */
  data?: any;
  /** Props adicionais para a Skill */
  [key: string]: any;
}

/**
 * SkillRenderer - O Componente Mágico de Troca de Visualização
 * 
 * Este componente verifica se o tenant possui uma "Superpower Skill" ativa para o slug fornecido.
 * Se sim, ele faz o swap automático do fallback para o componente Premium.
 */
export function SkillRenderer({ slug, fallback, data, ...props }: SkillRendererProps) {
  const { isSkillActive, getSkillConfig } = useSkills();

  // 1. Verificar se a Skill está ativa para este Tenant
  if (!isSkillActive(slug)) {
    return <>{fallback}</>;
  }

  // 2. Tentar carregar o componente do Registro
  const PremiumComponent = SKILL_COMPONENTS[slug];

  // 3. Se não houver componente Premium mapeado, volta para o padrão
  if (!PremiumComponent) {
    console.warn(`[SKILL_RENDERER] Skill ativa para "${slug}", mas nenhum componente premium encontrado no registro.`);
    return <>{fallback}</>;
  }

  // 4. Pegar configuração personalizada do Master para esta Skill/Tenant
  const config = getSkillConfig(slug);

  // 5. Renderizar a "Superpower" com os dados e configurações injetados
  return <PremiumComponent data={data} config={config} {...props} />;
}
