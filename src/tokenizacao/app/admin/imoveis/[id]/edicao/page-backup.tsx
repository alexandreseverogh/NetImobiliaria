/* eslint-disable */
'use client'

console.log('🔍 Página de Edição - ARQUIVO CARREGADO')

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Imovel } from '@/lib/types/admin'
import ImovelWizard from '@/components/admin/ImovelWizard'
import { TipoImovel, FinalidadeImovel, StatusImovel } from '@/lib/types/admin'

export default function EditarImovelPage() {
  console.log('🔍 Página de Edição - COMPONENTE INICIADO')
  const router = useRouter()
  const params = useParams()
  const imovelId = params.id as string
  console.log('🔍 Página de Edição - imovelId extraído:', imovelId)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<Imovel>>({})
  const [tiposImovel, setTiposImovel] = useState<TipoImovel[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<FinalidadeImovel[]>([])
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])

  const loadImovelData = useCallback(async () => {
    console.log('🔍 Página de Edição - loadImovelData INICIADA')
    console.log('🔍 Página de Edição - imovelId:', imovelId)
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Página de Edição - Antes das requisições')

      // Carregar dados do imóvel e dados de referência em paralelo
      console.log('🔍 Página de Edição - Fazendo requisição para API:', `/api/admin/imoveis/${imovelId}`)
      
      const [imovelResponse, tiposResponse, finalidadesResponse, statusResponse] = await Promise.all([
        fetch(`/api/admin/imoveis/${imovelId}`),
        fetch('/api/admin/imoveis/tipos'),
        fetch('/api/admin/imoveis/finalidades'),
        fetch('/api/admin/status-imovel'),
      ])
      
      console.log('🔍 Página de Edição - Respostas recebidas:', {
        imovelResponse: imovelResponse.status,
        tiposResponse: tiposResponse.status,
        finalidadesResponse: finalidadesResponse.status,
        statusResponse: statusResponse.status
      })

      if (!imovelResponse.ok) {
        throw new Error('Erro ao carregar imóvel')
      }

      const imovel = await imovelResponse.json()
      const tipos = await tiposResponse.json()
      const finalidades = await finalidadesResponse.json()
      const status = await statusResponse.json()

      console.log('🔍 Página de Edição - Dados do imóvel recebidos da API:', imovel)
      console.log('🔍 Página de Edição - Campos específicos:', {
        id: imovel.id,
        titulo: imovel.titulo,
        preco: imovel.preco,
        imagens: imovel.imagens,
        documentos: imovel.documentos
      })

      // Formatar dados para o wizard
      const formattedData: Partial<Imovel> = {
        id: imovel.id,
        titulo: imovel.titulo,
        descricao: imovel.descricao,
        endereco: {
          estado: imovel.estado,
          cidade: imovel.cidade,
          bairro: imovel.bairro,
          endereco: imovel.endereco,
          numero: imovel.numero,
          complemento: imovel.complemento,
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
        aceitaPermuta: imovel.aceita_permuta,
        aceitaFinanciamento: imovel.aceita_financiamento,
        tipo_fk: imovel.tipo_fk,
        finalidade_fk: imovel.finalidade_fk,
        status_fk: imovel.status_fk,
        imagens: imovel.imagens || [],
        documentos: imovel.documentos || [],
        amenidades: imovel.amenidades || [],
        proximidades: imovel.proximidades || []
      }

      console.log('🔍 Página de Edição - Dados formatados para o wizard:', formattedData)
      console.log('🔍 Página de Edição - Campos de valores:', {
        preco: formattedData.preco,
        precoCondominio: formattedData.precoCondominio,
        precoIPTU: formattedData.precoIPTU,
        taxaExtra: formattedData.taxaExtra
      })
      console.log('🔍 Página de Edição - Dados de mídia:', {
        imagens: formattedData.imagens,
        documentos: formattedData.documentos
      })

      setInitialData(formattedData)
      setTiposImovel(tipos)
      setFinalidadesImovel(finalidades)
      setStatusImovel(status)
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

  const handleSave = async (data: Imovel) => {
    try {
      console.log('🔍 Salvando alterações do imóvel:', data)
      
      // Aqui será implementada a API para salvar as alterações
      // Por enquanto, apenas simular o salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('🔍 Alterações salvas com sucesso!')
      
      // Redirecionar para a lista de imóveis
      router.push('/admin/imoveis')
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
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
        <ImovelWizard
          initialData={initialData}
          tiposImovel={tiposImovel}
          finalidadesImovel={finalidadesImovel}
          statusImovel={statusImovel}
          onSave={handleSave}
          mode="edit"
        />
      </div>
    </div>
  )
}
