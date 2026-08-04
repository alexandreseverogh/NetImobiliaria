-- ============================================================
-- Migra tipos_atividade.icone do formato antigo (nome de componente
-- Heroicons cru, ex. "PhoneIcon") pro formato usado pelo picker de ícone
-- já existente na aplicação (HybridIconSelector/DynamicIcon), que espera
-- "lucide-<Nome>" pra ícones da biblioteca Lucide.
-- ============================================================

UPDATE public.tipos_atividade SET icone = 'lucide-Phone'          WHERE icone = 'PhoneIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-MessageCircle'  WHERE icone = 'ChatBubbleLeftIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-Mail'           WHERE icone = 'EnvelopeIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-Users'          WHERE icone = 'UsersIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-FileText'       WHERE icone = 'DocumentTextIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-Home'           WHERE icone = 'HomeIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-RefreshCw'      WHERE icone = 'ArrowPathIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-Scale'          WHERE icone = 'ScaleIcon';
UPDATE public.tipos_atividade SET icone = 'lucide-AlertTriangle'  WHERE icone = 'ExclamationTriangleIcon';
