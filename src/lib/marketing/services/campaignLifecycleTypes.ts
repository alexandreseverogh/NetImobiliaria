/**
 * Tipos e constantes de lifecycle — sem imports Node.js.
 * Seguro para importar em Client Components.
 */

export type LifecycleStatus =
  | 'DRAFT'
  | 'READY'
  | 'LEARNING'
  | 'STABLE'
  | 'SCALING'
  | 'FATIGUED'
  | 'PAUSED'
  | 'KILLED';

export type TriggerSource = 'AGENT' | 'MANUAL' | 'SYNC' | 'CRON';

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  DRAFT:    'Rascunho',
  READY:    'Pronto',
  LEARNING: 'Aprendendo',
  STABLE:   'Estável',
  SCALING:  'Escalando',
  FATIGUED: 'Fatigado',
  PAUSED:   'Pausado',
  KILLED:   'Encerrado',
};

export const LIFECYCLE_COLORS: Record<LifecycleStatus, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  READY:    'bg-blue-100 text-blue-700',
  LEARNING: 'bg-yellow-100 text-yellow-700',
  STABLE:   'bg-green-100 text-green-700',
  SCALING:  'bg-emerald-100 text-emerald-700',
  FATIGUED: 'bg-red-100 text-red-700',
  PAUSED:   'bg-orange-100 text-orange-700',
  KILLED:   'bg-slate-500 text-white border border-slate-400/50',
};

export const LIFECYCLE_EMOJI: Record<LifecycleStatus, string> = {
  DRAFT:    '📝',
  READY:    '🚀',
  LEARNING: '📚',
  STABLE:   '✅',
  SCALING:  '📈',
  FATIGUED: '🔴',
  PAUSED:   '⏸️',
  KILLED:   '💀',
};

export const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  DRAFT:    ['READY', 'KILLED'],
  READY:    ['LEARNING', 'PAUSED', 'KILLED'],
  LEARNING: ['STABLE', 'PAUSED', 'KILLED'],
  STABLE:   ['SCALING', 'FATIGUED', 'PAUSED', 'KILLED'],
  SCALING:  ['STABLE', 'FATIGUED', 'PAUSED', 'KILLED'],
  FATIGUED: ['PAUSED', 'KILLED', 'READY'],
  PAUSED:   ['READY', 'KILLED'],
  KILLED:   [],
};
