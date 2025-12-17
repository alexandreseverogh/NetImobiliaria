'use client'

import { useState, useEffect, useCallback } from 'react'
import ImovelWizard from '@/components/admin/ImovelWizard'
import LocationStep from '@/components/admin/wizard/LocationStep'
import GeneralDataStep from '@/components/admin/wizard/GeneralDataStep'
import AmenidadesStep from '@/components/admin/wizard/AmenidadesStep'
import ProximidadesStep from '@/components/admin/wizard/ProximidadesStep'
import MediaStep from '@/components/admin/wizard/MediaStep'
import { TipoImovel } from '@/lib/database/tipos-imoveis'
import { Finalidade } from '@/lib/database/finalidades'
import { StatusImovel } from '@/lib/database/status-imovel'
import { useRouter } from 'next/navigation'

export default function NovoImovelPage() {
  const router = useRouter()
  const [tiposImovel, setTiposImovel] = useState<TipoImovel[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<Finalidade[]>([])
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTiposStatusEFinalidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [tiposResponse, finalidadesResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/imoveis/tipos'),
        fetch('/api/admin/imoveis/finalidades'),
        fetch('/api/admin/status-imovel'),
      ])

      if (!tiposResponse.ok) throw new Error('Erro ao carregar tipos de imóvel')
      if (!finalidadesResponse.ok) throw new Error('Erro ao carregar finalidades de imóvel')
      if (!statusResponse.ok) throw new Error('Erro ao carregar status de imóvel')

      const tiposData = await tiposResponse.json()
      const finalidadesData = await finalidadesResponse.json()
      const statusData = await statusResponse.json()

      setTiposImovel(tiposData || [])
      setFinalidadesImovel(finalidadesData || [])
      setStatusImovel(statusData || [])

    } catch (err: any) {
      console.error('Erro ao carregar dados iniciais:', err)
      setError(err.message || 'Erro ao carregar dados iniciais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTiposStatusEFinalidades()
  }, [loadTiposStatusEFinalidades])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <p className="text-red-600">Erro: {error}</p>
        <button
          onClick={loadTiposStatusEFinalidades}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Imóvel</h1>
        <ImovelWizard
          mode="create"
          finalidadesImovel={finalidadesImovel}
          tiposImovel={tiposImovel}
          statusImovel={statusImovel}
          onSave={async (data) => {
            console.log('🔍 onSave chamado com dados:', JSON.stringify(data, null, 2))
            try {
              const requestBody = {
                ...data,
                created_by: "1"
              }
              console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2))
              
              const response = await fetch('/api/admin/imoveis', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              })

              console.log('🔍 Response status:', response.status)
              console.log('🔍 Response ok:', response.ok)

              if (response.ok) {
                const result = await response.json()
                console.log('✅ Imóvel criado com sucesso, ID:', result.data.id)
                return result.data // Retornar o imóvel criado para o popup
              } else {
                const errorText = await response.text()
                console.log('❌ Erro response:', errorText)
                throw new Error(`Erro ao criar imóvel: ${response.status} - ${errorText}`)
              }
            } catch (error) {
              console.error('❌ Erro ao salvar imóvel:', error)
              throw error
            }
          }}
          onCancel={() => router.push('/admin/imoveis')}
        />
      </div>
    </div>
  )
}