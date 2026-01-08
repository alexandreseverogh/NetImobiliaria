/* eslint-disable */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import PermissionGuard from '@/components/admin/PermissionGuard'

interface NovoStatusImovel {
  nome: string
  cor: string
  descricao: string
  ativo: boolean
  consulta_imovel_internauta: boolean
  visivel_publico: boolean
}

export default function NovoStatusImovelPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<NovoStatusImovel>({
    nome: '',
    cor: '#3B82F6',
    descricao: '',
    ativo: true,
    consulta_imovel_internauta: true,
    visivel_publico: true
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof NovoStatusImovel, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      setError('Nome Ã© obrigatÃ³rio')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/status-imovel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar status de imÃ³vel')
      }

      const result = await response.json()
      console.log('Status de imÃ³vel criado com sucesso:', result)
      
      // Redirecionar para a lista
      router.push('/admin/status-imovel')
    } catch (error) {
      console.error('Erro ao criar status de imÃ³vel:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/status-imovel')
  }

  return (
    <PermissionGuard resource="status-imovel" action="WRITE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Status de ImÃ³vel</h1>
            <p className="mt-1 text-sm text-gray-700">
              Crie um novo status para imÃ³veis
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: DisponÃ­vel, Vendido, Alugado"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Nome Ãºnico para identificar o status
              </p>
            </div>

            {/* Cor */}
            <div>
              <label htmlFor="cor" className="block text-sm font-medium text-gray-700 mb-2">
                Cor
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="cor"
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Cor que serÃ¡ exibida para este status
              </p>
            </div>

            {/* DescriÃ§Ã£o */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                DescriÃ§Ã£o
              </label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="DescriÃ§Ã£o opcional do status"
              />
              <p className="mt-1 text-xs text-gray-500">
                DescriÃ§Ã£o opcional para explicar melhor o status
              </p>
            </div>

            {/* Consulta ImÃ³vel Internauta */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.consulta_imovel_internauta}
                  onChange={(e) => handleInputChange('consulta_imovel_internauta', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Consulta imÃ³vel internauta
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Este status serÃ¡ exibido para consulta de imÃ³veis pelos internautas
              </p>
            </div>

            {/* VisÃ­vel ao PÃºblico */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.visivel_publico}
                  onChange={(e) => handleInputChange('visivel_publico', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  VisÃ­vel ao pÃºblico
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Este status serÃ¡ visÃ­vel para o pÃºblico geral
              </p>
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
                  Status ativo
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Status inativos nÃ£o aparecerÃ£o nos formulÃ¡rios
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Criando...' : 'Criar Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PermissionGuard>
  )
}

