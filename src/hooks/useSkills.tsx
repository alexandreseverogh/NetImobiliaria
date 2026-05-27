'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './useAuth';

interface Skill {
  feature_id: number;
  slug: string;
  skill_name: string;
  skill_icon: string;
  component_path: string;
  is_premium: boolean;
  skill_config: any;
}

interface SkillsContextType {
  skills: Skill[];
  loading: boolean;
  isSkillActive: (slug: string) => boolean;
  getSkillConfig: (slug: string) => any;
  refreshSkills: () => Promise<void>;
}

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export function SkillsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = async () => {
    if (!user) {
      setSkills([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/skills/active');
      const data = await response.json();
      
      if (data.success) {
        setSkills(data.skills);
      }
    } catch (error) {
      console.error('[SKILLS_HOOK] Erro ao carregar skills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [user]);

  const isSkillActive = (slug: string) => {
    return skills.some(s => s.slug === slug);
  };

  const getSkillConfig = (slug: string) => {
    const skill = skills.find(s => s.slug === slug);
    return skill?.skill_config || {};
  };

  const value = {
    skills,
    loading,
    isSkillActive,
    getSkillConfig,
    refreshSkills: fetchSkills
  };

  return (
    <SkillsContext.Provider value={value}>
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills() {
  const context = useContext(SkillsContext);
  if (context === undefined) {
    throw new Error('useSkills deve ser usado dentro de um SkillsProvider');
  }
  return context;
}
