// Tipos para o sistema de categorias

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  icon?: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  created_by_username?: string
  updated_by_username?: string
  features?: CategoryFeature[]
  features_count?: number
}

export interface CategoryFeature {
  id: number
  name: string
  category: string
  url: string
  description?: string
  is_active: boolean
  sort_order?: number
}

export interface CategoryFormData {
  name: string
  slug: string
  description?: string
  icon?: string
  color: string
  sort_order: number
  is_active: boolean
}

export interface CategoryFeatureAssociation {
  id: number
  category_id: number
  feature_id: number
  sort_order: number
  created_at: string
  created_by?: string
}

export interface CategoryFeatureOrder {
  feature_id: number
  sort_order: number
}

// Respostas da API
export interface CategoriesResponse {
  success: boolean
  data: Category[]
  total: number
  error?: string
}

export interface CategoryResponse {
  success: boolean
  data: Category
  error?: string
}

export interface CategoryFeaturesResponse {
  success: boolean
  data: {
    category: Category
    features: CategoryFeature[]
    available_features: CategoryFeature[]
    total: number
  }
  error?: string
}

// Filtros para busca
export interface CategoryFilters {
  search?: string
  only_active?: boolean
  include_features?: boolean
}

// Opções de cores predefinidas
export const CATEGORY_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#84CC16', // Lime
] as const

// Ícones disponíveis
export const CATEGORY_ICONS = [
  'CogIcon',
  'UserGroupIcon',
  'ShieldCheckIcon',
  'ChartBarIcon',
  'DocumentTextIcon',
  'Squares2X2Icon',
  'WrenchScrewdriverIcon',
  'ClipboardDocumentListIcon',
  'BuildingOfficeIcon',
  'HomeIcon',
  'MapPinIcon',
  'CurrencyDollarIcon',
  'CalendarDaysIcon',
  'EnvelopeIcon',
  'PhoneIcon',
  'CameraIcon',
  'PhotoIcon',
  'NewspaperIcon',
  'MegaphoneIcon',
  'GlobeAltIcon',
] as const

export type CategoryColor = typeof CATEGORY_COLORS[number]
export type CategoryIcon = typeof CATEGORY_ICONS[number]

