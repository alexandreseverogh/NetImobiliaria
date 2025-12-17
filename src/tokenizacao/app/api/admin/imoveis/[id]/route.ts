import { NextRequest, NextResponse } from 'next/server'
import { findImovelById } from '@/lib/database/imoveis'
import { findAmenidadesByImovel } from '@/lib/database/amenidades'
import { findProximidadesByImovel } from '@/lib/database/proximidades'
import { findDocumentosByImovel } from '@/lib/database/imovel-documentos'
import { findImovelImagens } from '@/lib/database/imoveis'
import { findImovelVideoMetadata, saveImovelVideo } from '@/lib/database/imovel-video'
import pool from '@/lib/database/connection'

// GET - Buscar imóvel específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API GET /api/admin/imoveis/[id] - INICIADA')
  console.log('🔍 API - Parâmetros recebidos:', params)
  
  try {
    const imovelId = parseInt(params.id)
    console.log('🔍 API - ID extraído:', imovelId)
    
    if (isNaN(imovelId)) {
      console.log('❌ API - ID inválido:', params.id)
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    // Buscar dados básicos do imóvel
    console.log('🔍 API: Chamando findImovelById para ID:', imovelId)
    const imovel = await findImovelById(imovelId)
    console.log('🔍 API: Resultado findImovelById:', imovel ? 'Encontrado' : 'Não encontrado')
    
    if (!imovel) {
      console.log('❌ API: Imóvel não encontrado')
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }
    
    console.log('🔍 API: Dados básicos do imóvel:', {
      id: imovel.id,
      titulo: imovel.titulo,
      estado: imovel.estado_fk,
      cidade: imovel.cidade_fk,
      bairro: imovel.bairro
    })

    // Buscar dados relacionados
    console.log('🔍 API - Buscando dados relacionados para imóvel:', imovelId)
    const [amenidades, proximidades, documentos, imagens, video] = await Promise.all([
      findAmenidadesByImovel(imovelId).catch((error) => {
        console.error('❌ Erro ao buscar amenidades:', error)
        return []
      }),
      findProximidadesByImovel(imovelId).catch((error) => {
        console.error('❌ Erro ao buscar proximidades:', error)
        return []
      }),
      findDocumentosByImovel(imovelId).catch((error) => {
        console.error('❌ Erro ao buscar documentos:', error)
        return []
      }),
      findImovelImagens(imovelId).catch((error) => {
        console.error('❌ Erro ao buscar imagens:', error)
        return []
      }),
      findImovelVideoMetadata(imovelId).catch((error) => {
        console.error('❌ Erro ao buscar vídeo:', error)
        return null
      })
    ])

    console.log('🔍 API - Dados relacionados encontrados:', {
      amenidadesCount: amenidades.length,
      proximidadesCount: proximidades.length,
      documentosCount: documentos.length,
      imagensCount: imagens.length,
      videoExists: !!video
    })

    console.log('🔍 API - Primeiras 3 amenidades:', amenidades.slice(0, 3))
    console.log('🔍 API - Primeiras 3 proximidades:', proximidades.slice(0, 3))
    console.log('🔍 API - TODOS OS DOCUMENTOS:', documentos)
    console.log('🔍 API - Detalhes dos documentos:', documentos.map(doc => ({
      id: doc.id,
      id_tipo_documento: doc.id_tipo_documento,
      nome_arquivo: doc.nome_arquivo,
      tipo_mime: doc.tipo_mime,
      tipo_documento_descricao: doc.tipo_documento_descricao
    })))
    console.log('🔍 API - Todas as imagens:', imagens)
    console.log('🔍 API - Detalhes das imagens:', imagens.map(img => ({
      id: img.id,
      principal: img.principal,
      tipo_mime: img.tipo_mime,
      tamanho_bytes: img.tamanho_bytes,
      ordem: img.ordem
    })))

    return NextResponse.json({
      success: true,
      data: {
        ...imovel,
        amenidades,
        proximidades,
        documentos,
        imagens,
        video
      }
    })

  } catch (error) {
    console.error('Erro ao buscar imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar imóvel específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API PUT /api/admin/imoveis/[id] - INICIADA')
  
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const data = await request.json()
    console.log('🔍 API PUT - Salvando imóvel ID:', imovelId)

    // Atualizar dados básicos do imóvel
    const updateQuery = `
      UPDATE imoveis SET
        titulo = $1,
        descricao = $2,
        endereco = $3,
        numero = $4,
        complemento = $5,
        bairro = $6,
        cidade_fk = $7,
        estado_fk = $8,
        cep = $9,
        preco = $10,
        preco_condominio = $11,
        preco_iptu = $12,
        taxa_extra = $13,
        area_total = $14,
        area_construida = $15,
        quartos = $16,
        banheiros = $17,
        suites = $18,
        varanda = $19,
        vagas_garagem = $20,
        andar = $21,
        total_andares = $22,
        mobiliado = $23,
        aceita_permuta = $24,
        aceita_financiamento = $25,
        tipo_fk = $26,
        finalidade_fk = $27,
        status_fk = $28,
        updated_at = NOW()
      WHERE id = $29
    `

    const values = [
      data.titulo,
      data.descricao,
      data.endereco?.endereco,
      data.endereco?.numero,
      data.endereco?.complemento,
      data.endereco?.bairro,
      data.endereco?.cidade,
      data.endereco?.estado,
      data.endereco?.cep,
      data.preco,
      data.precoCondominio,
      data.precoIPTU,
      data.taxaExtra,
      data.areaTotal,
      data.areaConstruida,
      data.quartos,
      data.banheiros,
      data.suites,
      data.varanda,
      data.vagasGaragem,
      data.andar,
      data.totalAndares,
      data.mobiliado,
      data.aceita_permuta,
      data.aceita_financiamento,
      data.tipo_fk,
      data.finalidade_fk,
      data.status_fk,
      imovelId
    ]

    // Executar todas as operações em paralelo para melhor performance
    const operations = []
    
    // 1. Atualizar dados básicos do imóvel
    operations.push(pool.query(updateQuery, values))
    
    // 2. Preparar amenidades
    const amenidadeIds = data.amenidades && Array.isArray(data.amenidades) 
      ? data.amenidades.map((a: any) => a.id) 
      : []
    
    // 3. Preparar proximidades
    const proximidadesFormatadas = data.proximidades && Array.isArray(data.proximidades)
      ? data.proximidades.map((p: any) => ({
          proximidade_id: p.id,
          distancia_metros: p.distancia ? parseFloat(p.distancia.replace(/[^0-9.]/g, '')) || null : null,
          tempo_caminhada: p.tempo_caminhada || null,
          observacoes: p.observacoes || null
        }))
      : []
    
    // Executar operações em paralelo
    await Promise.all([
      ...operations,
      // Amenidades e proximidades serão executadas em paralelo após o UPDATE
      (async () => {
        const { updateImovelAmenidades } = await import('@/lib/database/amenidades')
        await updateImovelAmenidades(imovelId, amenidadeIds)
      })(),
      (async () => {
        const { updateImovelProximidades } = await import('@/lib/database/proximidades')
        await updateImovelProximidades(imovelId, proximidadesFormatadas)
      })()
    ])
    
    console.log('✅ Imóvel, amenidades e proximidades atualizados')

    // Processar vídeo se presente
    if (data.video && data.video.arquivo) {
      try {
        console.log('🔍 Processando vídeo...')
        
        const videoFile = data.video.arquivo
        const arrayBuffer = await videoFile.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)
        
        const videoData = {
          video: videoBuffer,
          nome_arquivo: data.video.nomeArquivo || videoFile.name,
          tipo_mime: data.video.tipoMime || videoFile.type,
          tamanho_bytes: data.video.tamanhoBytes || videoFile.size,
          duracao_segundos: data.video.duracaoSegundos || 30,
          resolucao: data.video.resolucao || '1920x1080',
          formato: data.video.formato || videoFile.name.split('.').pop()?.toLowerCase() || 'mp4'
        }
        
        const videoId = await saveImovelVideo(imovelId, videoData)
        console.log('✅ Vídeo atualizado, ID:', videoId)
      } catch (videoError) {
        console.error('❌ Erro ao atualizar vídeo:', videoError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Imóvel atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}