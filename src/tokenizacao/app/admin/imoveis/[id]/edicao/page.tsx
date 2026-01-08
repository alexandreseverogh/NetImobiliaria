/* eslint-disable */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Imovel } from '@/lib/types/admin'
import ImovelWizard from '@/components/admin/ImovelWizard'
import RascunhoStatusBar from '@/components/admin/RascunhoStatusBar'
import { TipoImovel } from '@/lib/database/tipos-imoveis'
import { Finalidade } from '@/lib/database/finalidades'
import { StatusImovel } from '@/lib/database/status-imovel'
import { useRascunho } from '@/hooks/useRascunho'

export default function EditarImovelPage() {
  const router = useRouter()
  const params = useParams()
  const imovelId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<Imovel>>({})
  const [tiposImovel, setTiposImovel] = useState<TipoImovel[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<Finalidade[]>([])
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])

  // Hook de rascunho
  const {
    rascunho, 
    iniciarRascunho, 
    registrarAlteracao,
    registrarVideoAlteracao,
    registrarImagemPrincipal,
    descartarRascunho, 
    confirmarRascunho, 
    loading: rascunhoLoading, 
    error: rascunhoError 
  } = useRascunho(parseInt(imovelId))

  const loadImovelData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Carregando dados do imóvel ID:', imovelId)

      // Carregar dados do imóvel e dados de referência em paralelo
      const [imovelResponse, tiposResponse, finalidadesResponse, statusResponse] = await Promise.all([
        fetch(`/api/admin/imoveis/${imovelId}`),
        fetch('/api/admin/imoveis/tipos'),
        fetch('/api/admin/imoveis/finalidades'),
        fetch('/api/admin/status-imovel'),
      ])

      console.log('🔍 Resposta da API imóvel:', imovelResponse.status)

      if (!imovelResponse.ok) {
        throw new Error('Erro ao carregar imóvel')
      }

      const response = await imovelResponse.json()
      console.log('🔍 Resposta completa da API:', response)
      const imovel = response.data
      console.log('🔍 Dados do imóvel extraídos:', imovel)
      const tipos = await tiposResponse.json()
      const finalidades = await finalidadesResponse.json()
      const status = await statusResponse.json()

      // Formatar dados para o wizard
      const formattedData: Partial<Imovel> = {
        id: imovel.id,
        titulo: imovel.titulo,
        descricao: imovel.descricao,
        endereco: {
          logradouro: imovel.endereco,
          numero: imovel.numero,
          complemento: imovel.complemento,
          bairro: imovel.bairro,
          cidade: imovel.cidade_fk,
          estado: imovel.estado_fk,
          cep: imovel.cep
        },
        preco: imovel.preco,
        precoCondominio: imovel.preco_condominio,
        precoIPTU: imovel.preco_iptu,
        taxaExtra: imovel.taxa_extra,
        areaTotal: imovel.area_total,
        areaConstruida: imovel.area_construida,
        quartos: imovel.quartos,
        banheiros: imovel.banheiros,
        suites: imovel.suites,
        varanda: imovel.varanda,
        vagasGaragem: imovel.vagas_garagem,
        andar: imovel.andar,
        totalAndares: imovel.total_andares,
        mobiliado: imovel.mobiliado,
        aceita_permuta: imovel.aceita_permuta,
        aceita_financiamento: imovel.aceita_financiamento,
        tipo_fk: imovel.tipo_fk,
        finalidade_fk: imovel.finalidade_fk,
        status: imovel.status_fk,
        imagens: imovel.imagens || [],
        documentos: imovel.documentos || [],
        amenidades: imovel.amenidades || [],
        proximidades: imovel.proximidades || []
      }

      console.log('🔍 Dados formatados para o wizard:', formattedData)
      console.log('🔍 Dados de endereço formatados:', formattedData.endereco)
      console.log('🔍 Amenidades recebidas da API:', imovel.amenidades)
      console.log('🔍 Proximidades recebidas da API:', imovel.proximidades)
      console.log('🔍 Amenidades no formattedData:', formattedData.amenidades)
      console.log('🔍 Proximidades no formattedData:', formattedData.proximidades)

      setInitialData(formattedData)
      setTiposImovel(tipos)
      setFinalidadesImovel(finalidades)
      setStatusImovel(status)

      // O rascunho será verificado automaticamente pelo hook useRascunho
    } catch (error) {
      console.error('Erro ao carregar dados do imóvel:', error)
      setError('Erro ao carregar dados do imóvel')
    } finally {
      setLoading(false)
    }
  }, [imovelId])

  useEffect(() => {
    if (imovelId) {
      loadImovelData()
    }
  }, [imovelId, loadImovelData])

  // Inicializar rascunho após dados carregados e se não existir um ativo
  useEffect(() => {
    if (!loading && !error && imovelId && !rascunho && !rascunhoLoading) {
      console.log('🔍 Inicializando rascunho para imóvel:', imovelId)
      iniciarRascunho().catch(err => {
        console.error('Erro ao inicializar rascunho:', err)
      })
    }
  }, [loading, error, imovelId, rascunho, rascunhoLoading, iniciarRascunho])

  const handleSave = async (data: Imovel) => {
    try {
      console.log('🔍 Salvando alterações do imóvel:', data)
      
      // Chamar API para salvar as alterações
      const response = await fetch(`/api/admin/imoveis/${imovelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar alterações')
      }

      const result = await response.json()
      console.log('🔍 Imóvel atualizado com sucesso:', result)
      
      // Confirmar rascunho (manter alterações)
      if (rascunho) {
        await confirmarRascunho()
      }
      
      // Redirecionar para a lista de imóveis
      router.push('/admin/imoveis')
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert('Erro ao salvar alterações: ' + (error as Error).message)
    }
  }

  const handleDescartarRascunho = async () => {
    try {
      console.log('🔍 Descartando rascunho...')
      await descartarRascunho()
      
      // Recarregar dados do imóvel para reverter alterações
      await loadImovelData()
      
      alert('Rascunho descartado com sucesso! Todas as alterações foram revertidas.')
    } catch (error) {
      console.error('Erro ao descartar rascunho:', error)
      alert('Erro ao descartar rascunho: ' + (error as Error).message)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando imóvel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro: {error}</p>
          <button
            onClick={loadImovelData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Imóvel</h1>
        
        {/* Barra de status do rascunho */}
        {rascunho && (
          <RascunhoStatusBar
            rascunho={rascunho}
            onDescartar={handleDescartarRascunho}
            loading={rascunhoLoading}
          />
        )}
        
        {/* Exibir erro do rascunho se houver */}
        {rascunhoError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Erro no rascunho:</strong> {rascunhoError}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <ImovelWizard
          initialData={initialData}
          tiposImovel={tiposImovel}
          finalidadesImovel={finalidadesImovel}
          statusImovel={statusImovel}
          onSave={handleSave}
          onCancel={() => router.push('/admin/imoveis')}
          mode="edit"
          registrarAlteracaoRascunho={registrarAlteracao}
          registrarVideoAlteracaoRascunho={registrarVideoAlteracao}
          registrarImagemPrincipalRascunho={registrarImagemPrincipal}
          rascunho={rascunho}
        />
      </div>
    </div>
  )
}
