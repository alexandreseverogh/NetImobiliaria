import React from 'react'
import {
  PhoneIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  UsersIcon,
  UserIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  HomeIcon,
  ArrowPathIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  VideoCameraIcon,
  PaperAirplaneIcon,
  MapPinIcon,
  BellIcon,
  StarIcon,
  FlagIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  PencilSquareIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

export interface ActivityIconOption {
  name: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

// Catálogo curado pra tipos de atividade do CRM — nomes batem exatamente com os
// componentes reais do heroicons/24/outline (mesma convenção já usada no seed
// de tipos_atividade, ex. "PhoneIcon", "ChatBubbleLeftIcon").
export const ACTIVITY_ICON_LIBRARY: ActivityIconOption[] = [
  { name: 'PhoneIcon', label: 'Ligação', Icon: PhoneIcon },
  { name: 'ChatBubbleLeftIcon', label: 'WhatsApp/Chat', Icon: ChatBubbleLeftIcon },
  { name: 'ChatBubbleLeftRightIcon', label: 'Conversa', Icon: ChatBubbleLeftRightIcon },
  { name: 'EnvelopeIcon', label: 'E-mail', Icon: EnvelopeIcon },
  { name: 'UsersIcon', label: 'Reunião', Icon: UsersIcon },
  { name: 'UserIcon', label: 'Pessoa', Icon: UserIcon },
  { name: 'DocumentTextIcon', label: 'Proposta/Documento', Icon: DocumentTextIcon },
  { name: 'DocumentCheckIcon', label: 'Documento Aprovado', Icon: DocumentCheckIcon },
  { name: 'HomeIcon', label: 'Visita', Icon: HomeIcon },
  { name: 'ArrowPathIcon', label: 'Follow-up', Icon: ArrowPathIcon },
  { name: 'ScaleIcon', label: 'Negociação', Icon: ScaleIcon },
  { name: 'ExclamationTriangleIcon', label: 'Objeção/Alerta', Icon: ExclamationTriangleIcon },
  { name: 'CalendarIcon', label: 'Agenda', Icon: CalendarIcon },
  { name: 'CheckCircleIcon', label: 'Concluído', Icon: CheckCircleIcon },
  { name: 'ClockIcon', label: 'Pendente/Prazo', Icon: ClockIcon },
  { name: 'VideoCameraIcon', label: 'Videochamada', Icon: VideoCameraIcon },
  { name: 'PaperAirplaneIcon', label: 'Envio', Icon: PaperAirplaneIcon },
  { name: 'MapPinIcon', label: 'Local', Icon: MapPinIcon },
  { name: 'BellIcon', label: 'Lembrete', Icon: BellIcon },
  { name: 'StarIcon', label: 'Destaque', Icon: StarIcon },
  { name: 'FlagIcon', label: 'Marco', Icon: FlagIcon },
  { name: 'HandThumbUpIcon', label: 'Aprovação', Icon: HandThumbUpIcon },
  { name: 'HandThumbDownIcon', label: 'Recusa', Icon: HandThumbDownIcon },
  { name: 'PencilSquareIcon', label: 'Anotação', Icon: PencilSquareIcon },
  { name: 'ClipboardDocumentCheckIcon', label: 'Checklist', Icon: ClipboardDocumentCheckIcon },
  { name: 'CurrencyDollarIcon', label: 'Financeiro', Icon: CurrencyDollarIcon },
  { name: 'XCircleIcon', label: 'Cancelado', Icon: XCircleIcon },
]

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  ACTIVITY_ICON_LIBRARY.map(opt => [opt.name, opt.Icon]),
)

export function ActivityIcon({ name, className = 'h-4 w-4' }: { name?: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) || TagIcon
  return <Icon className={className} />
}
