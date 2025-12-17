'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { WriteGuard } from '@/components/admin/PermissionGuard'

interface CategoriaAmenidadeForm {
  nome: string
  descricao: string
  icone: string
  cor: string
  ordem: number
  ativo: boolean
}

export default function NovaCategoriaAmenidadePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CategoriaAmenidadeForm>({
    nome: '',
    descricao: '',
    icone: 'star',
    cor: '#3B82F6',
    ordem: 1,
    ativo: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/categorias-amenidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar categoria')
      }

      router.replace('/admin/categorias-amenidades')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value) : value
    }))
  }

  return (
    <WriteGuard resource="categorias-amenidades">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar
          </button>
        </div>

        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Nova Categoria de Amenidade
          </h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Lazer & Entretenimento"
              />
            </div>

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                name="descricao"
                rows={3}
                value={formData.descricao}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva a categoria..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="icone" className="block text-sm font-medium text-gray-700 mb-2">
                  Ícone
                </label>
                <select
                  id="icone"
                  name="icone"
                  value={formData.icone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="star">⭐ Estrela</option>
                  <option value="heart">❤️ Coração</option>
                  <option value="leaf">🌱 Folha</option>
                  <option value="wifi">📱 WiFi</option>
                  <option value="shield">🔒 Escudo</option>
                  <option value="fitness">💪 Fitness</option>
                  <option value="service">🛎️ Serviço</option>
                  <option value="users">👥 Usuários</option>
                  <option value="building">🏛️ Edifício</option>
                </select>
              </div>

              <div>
                <label htmlFor="cor" className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <input
                  type="color"
                  id="cor"
                  name="cor"
                  value={formData.cor}
                  onChange={handleChange}
                  className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ordem" className="block text-sm font-medium text-gray-700 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  id="ordem"
                  name="ordem"
                  min="1"
                  value={formData.ordem}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  id="ativo"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                  Ativo
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Categoria'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </WriteGuard>
  )
}
