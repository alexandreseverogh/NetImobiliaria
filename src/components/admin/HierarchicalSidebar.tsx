'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  FolderIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  sort_order?: number
  is_active: boolean
}

interface Feature {
  id: number
  name: string
  description?: string
  category_id: number
  url: string
  is_active: boolean
}

interface UserFeatureCategory {
  category: Category | null
  features: Feature[]
}

interface HierarchicalSidebarProps {
  userPermissions?: string[]
}

export default function HierarchicalSidebar({ userPermissions = [] }: HierarchicalSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [userFeatures, setUserFeatures] = useState<UserFeatureCategory[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  // Carregar dados das categorias e funcionalidades
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Carregar categorias
        const categoriesResponse = await fetch('/api/admin/categorias')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.filter((cat: Category) => cat.is_active))
        }

        // Carregar funcionalidades
        const featuresResponse = await fetch('/api/admin/system-features')
        if (featuresResponse.ok) {
          const featuresData = await featuresResponse.json()
          setFeatures(featuresData.filter((feat: Feature) => feat.is_active))
        }

        // Carregar funcionalidades do usuário (com permissões)
        const userFeaturesResponse = await fetch('/api/admin/user-features')
        if (userFeaturesResponse.ok) {
          const userFeaturesData = await userFeaturesResponse.json()
          console.log('🔍 HierarchicalSidebar - userFeaturesData:', userFeaturesData)
          // Procurar especificamente pela funcionalidade Receitas de Destaques (id = 57)
          const receitasFeature = userFeaturesData.find((cat: UserFeatureCategory) => 
            cat.features?.some((f: Feature) => f.id === 57)
          )
          console.log('🔍 HierarchicalSidebar - Receitas de Destaques encontrada?', receitasFeature !== undefined)
          if (receitasFeature) {
            console.log('🔍 HierarchicalSidebar - Categoria:', receitasFeature.category)
            console.log('🔍 HierarchicalSidebar - Feature:', receitasFeature.features.find((f: Feature) => f.id === 57))
          }
          setUserFeatures(userFeaturesData)
        }

      } catch (error) {
        console.error('Erro ao carregar dados da sidebar:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Expandir categoria
  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Verificar se usuário tem permissão para funcionalidade
  const hasPermission = (featureId: number) => {
    // userFeatures é um array de objetos agrupados por categoria
    // Cada objeto tem: { category: {...}, features: [...] }
    const hasPerm = userFeatures.some(categoryGroup => 
      categoryGroup.features && categoryGroup.features.some(f => f.id === featureId)
    )
    // Debug específico para id 57
    if (featureId === 57) {
      console.log('🔍 HierarchicalSidebar - hasPermission(57):', hasPerm)
      console.log('🔍 HierarchicalSidebar - userFeatures:', userFeatures)
    }
    return hasPerm
  }

  // Obter funcionalidades de uma categoria
  const getCategoryFeatures = (categoryId: number) => {
    const categoryFeatures = features
      .filter(f => f.category_id === categoryId)
      .filter(f => hasPermission(f.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    // Debug específico para categoria Administrativo (id = 3)
    if (categoryId === 3) {
      console.log('🔍 HierarchicalSidebar - getCategoryFeatures(3) - Todas features da categoria:', features.filter(f => f.category_id === 3))
      console.log('🔍 HierarchicalSidebar - getCategoryFeatures(3) - Features filtradas:', categoryFeatures)
      const receitasFeature = features.find(f => f.id === 57 && f.category_id === 3)
      if (receitasFeature) {
        console.log('🔍 HierarchicalSidebar - Receitas feature encontrada em features:', receitasFeature)
        console.log('🔍 HierarchicalSidebar - Receitas tem permissão?', hasPermission(57))
      }
    }
    
    return categoryFeatures
  }

  // Verificar se categoria tem funcionalidades visíveis
  const hasVisibleFeatures = (categoryId: number) => {
    return getCategoryFeatures(categoryId).length > 0
  }

  // Ordenar categorias
  const sortedCategories = categories.sort((a, b) => {
    if (a.sort_order && b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.name.localeCompare(b.name)
  })

  if (loading) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Menu Principal
        </h2>
        
        <nav className="space-y-1">
          {sortedCategories.map((category) => {
            const categoryFeatures = getCategoryFeatures(category.id)
            const isExpanded = expandedCategories.has(category.id)
            const hasFeatures = hasVisibleFeatures(category.id)

            // Não mostrar categoria se não tiver funcionalidades visíveis
            if (!hasFeatures) {
              return null
            }

            return (
              <div key={category.id} className="space-y-1">
                {/* Categoria */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isExpanded 
                      ? 'bg-gray-200 text-gray-900' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="h-4 w-4" />
                    <span>{category.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>

                {/* Funcionalidades da categoria */}
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {categoryFeatures.map((feature) => {
                      const isActive = pathname === feature.url
                      
                      return (
                        <Link
                          key={feature.id}
                          href={feature.url}
                          className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-900'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <DocumentIcon className="h-4 w-4" />
                          <span>{feature.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Funcionalidades sem categoria */}
        {features
          .filter(f => !f.category_id && hasPermission(f.id))
          .length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Outros
            </h3>
            <div className="space-y-1">
              {features
                .filter(f => !f.category_id && hasPermission(f.id))
                .map((feature) => {
                  const isActive = pathname === feature.url
                  
                  return (
                    <Link
                      key={feature.id}
                      href={feature.url}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <DocumentIcon className="h-4 w-4" />
                      <span>{feature.name}</span>
                    </Link>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




