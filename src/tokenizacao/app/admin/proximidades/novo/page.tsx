/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

// Debug: verificar se a pÃ¡gina estÃ¡ carregando
console.log('ðŸ” NovaProximidadePage carregada')

interface CategoriaProximidade {
  id: number
  nome: string
  descricao?: string
  icone?: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

interface NovaProximidade {
  nome: string
  categoria: string
  descricao: string
  ativo: boolean
}

export default function NovaProximidadePage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<CategoriaProximidade[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<NovaProximidade>({
    nome: '',
    categoria: '',
    descricao: '',
    ativo: true
  })

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      const response = await fetch('/api/admin/categorias-proximidades')
      const data = await response.json()
      
      // A API retorna um array direto, nÃ£o um objeto com success/data
      if (Array.isArray(data)) {
        // Filtrar apenas categorias ativas para criaÃ§Ã£o de novas proximidades
        const categoriasAtivas = data.filter((categoria: CategoriaProximidade) => categoria.ativo === true)
        console.log(`âœ… ${categoriasAtivas.length} categorias ativas carregadas para seleÃ§Ã£o`)
        setCategorias(categoriasAtivas)
      } else if (data.success && Array.isArray(data.data)) {
        // Fallback para formato antigo
        const categoriasAtivas = data.data.filter((categoria: CategoriaProximidade) => categoria.ativo === true)
        setCategorias(categoriasAtivas)
      } else {
        console.error('Formato de resposta invÃ¡lido:', data)
        setCategorias([])
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      setCategorias([])
    }
  }

  const handleInputChange = (field: keyof NovaProximidade, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.categoria) {
      alert('Por favor, preencha todos os campos obrigatÃ³rios')
      return
    }

    setSaving(true)
    
    try {
      const response = await fetch('/api/admin/proximidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('âœ… Proximidade criada com sucesso:', result)
        router.push('/admin/proximidades')
      } else {
        const errorData = await response.json()
        alert(`Erro ao salvar: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar proximidade')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/proximidades"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nova Proximidade</h1>
            <p className="mt-1 text-sm text-gray-500">
              Adicione um novo ponto de interesse prÃ³ximo aos imÃ³veis
            </p>
          </div>
        </div>
      </div>

      {/* FormulÃ¡rio */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Proximidade *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: Shopping Center Recife, Praia de Boa Viagem..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              required
              value={formData.categoria}
              onChange={(e) => handleInputChange('categoria', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map(categoria => (
                <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>
              ))}
            </select>
          </div>

          {/* DescriÃ§Ã£o */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DescriÃ§Ã£o
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descreva detalhes sobre este ponto de interesse..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Proximidade ativa
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Proximidades inativas nÃ£o aparecerÃ£o na seleÃ§Ã£o de imÃ³veis
            </p>
          </div>

          {/* BotÃµes */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link
              href="/admin/proximidades"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Salvar Proximidade
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}








