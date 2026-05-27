import React from 'react';
import { icons, LucideProps } from 'lucide-react';

export interface DynamicIconProps extends Omit<LucideProps, 'ref'> {
  name?: string;
  fallback?: React.ReactNode;
}

/**
 * Componente que renderiza um ícone da biblioteca Lucide React a partir de uma string.
 * Faz a formatação automática do nome (ex: 'shield-check' -> 'ShieldCheck').
 */
const DynamicIcon = ({ name, fallback, ...props }: DynamicIconProps) => {
  const FallbackIcon = fallback || <icons.Circle {...props} className={props.className ? `${props.className} opacity-30` : 'opacity-30'} />;

  if (!name || name.trim() === '') {
    return <>{FallbackIcon}</>;
  }

  // Tenta várias formatações de string para encontrar o ícone no objeto exportado pelo Lucide
  const exactMatch = (icons as any)[name];
  const pascalCase = name.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
  const pascalMatch = (icons as any)[pascalCase];

  const IconComponent = exactMatch || pascalMatch;

  if (!IconComponent) {
    return <>{FallbackIcon}</>;
  }

  return <IconComponent {...props} />;
};

export default DynamicIcon;
