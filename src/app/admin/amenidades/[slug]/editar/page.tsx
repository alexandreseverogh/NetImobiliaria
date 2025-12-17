'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface Amenidade {
  id: number
  nome: string
  descricao: string
  status: string
  categoria_id: number
  categoria_nome: string
  slug: string
}

interface CategoriaAmenidade {
  id: number
  nome: string
}

export default function EditarAmenidadePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { get, put } = useAuthenticatedFetch()
  const [amenidade, setAmenidade] = useState<Amenidade | null>(null)
  const [categorias, setCategorias] = useState<CategoriaAmenidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      console.log('🔍 Carregando dados da amenidade:', params.slug)
      
      // Carregar categorias com autenticação
      const categoriasResponse = await get('/api/admin/categorias-amenidades')
      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json()
        console.log('📦 Categorias recebidas:', categoriasData)
        
        // Garantir que data seja um array e filtrar apenas categorias ativas
        if (Array.isArray(categoriasData)) {
          const categoriasAtivas = categoriasData.filter((categoria: any) => categoria.ativo === true)
          setCategorias(categoriasAtivas)
          console.log('✅ Categorias ativas carregadas:', categoriasAtivas.length)
        } else if (categoriasData && categoriasData.data && Array.isArray(categoriasData.data)) {
          const categoriasAtivas = categoriasData.data.filter((categoria: any) => categoria.ativo === true)
          setCategorias(categoriasAtivas)
          console.log('✅ Categorias ativas carregadas:', categoriasAtivas.length)
        } else {
          console.warn('⚠️ Dados de categorias não são um array:', categoriasData)
          setCategorias([])
        }
      }

      // Carregar dados da amenidade com autenticação
      const amenidadeResponse = await get(`/api/admin/amenidades/${params.slug}`)
      if (amenidadeResponse.ok) {
        const amenidadeData = await amenidadeResponse.json()
        console.log('📦 Amenidade recebida:', amenidadeData)
        
        if (amenidadeData.success && amenidadeData.data) {
          setAmenidade(amenidadeData.data)
          console.log('✅ Categoria ID da amenidade:', amenidadeData.data.categoria_id)
        } else {
          setError('Erro ao carregar amenidade')
        }
      } else {
        console.error('❌ Erro ao carregar amenidade:', amenidadeResponse.status)
        setError('Amenidade não encontrada')
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [get, params.slug])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amenidade) return

    try {
      setSaving(true)
      
      console.log('📤 Salvando amenidade:', amenidade)
      
      const response = await put(`/api/admin/amenidades/${amenidade.slug}`, amenidade)

      if (response.ok) {
        console.log('✅ Amenidade salva com sucesso')
        router.push('/admin/amenidades')
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao salvar:', errorData)
        setError(errorData.error || 'Erro ao salvar amenidade')
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error)
      setError('Erro ao salvar amenidade')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Amenidade, value: string | boolean | number) => {
    if (!amenidade) return
    setAmenidade({ ...amenidade, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !amenidade) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erro: {error || 'Amenidade não encontrada'}</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/amenidades"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Editar Amenidade</h1>
              <p className="mt-2 text-sm text-gray-700">
                Editando: {amenidade.nome}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="bg-white shadow sm:rounded-md">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                required
                value={amenidade.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Categoria */}
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                Categoria *
              </label>
              <select
                id="categoria"
                required
                value={amenidade.categoria_id}
                onChange={(e) => handleInputChange('categoria_id', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                id="descricao"
                rows={3}
                value={amenidade.descricao || ''}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={amenidade.status === 'Ativo'}
                onChange={(e) => handleInputChange('status', e.target.checked ? 'Ativo' : 'Inativo')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                Ativo
              </label>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/amenidades"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
