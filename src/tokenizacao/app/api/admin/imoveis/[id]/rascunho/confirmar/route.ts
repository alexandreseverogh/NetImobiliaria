/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Confirmar rascunho (manter alterações)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API POST /api/admin/imoveis/[id]/rascunho/confirmar - INICIADA')
  
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    // Buscar rascunho ativo
    const rascunhoResult = await pool.query(
      'SELECT * FROM imovel_rascunho WHERE imovel_id = $1 AND ativo = true',
      [imovelId]
    )

    if (rascunhoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum rascunho ativo encontrado' },
        { status: 404 }
      )
    }

    const rascunho = rascunhoResult.rows[0]
    const alteracoes = rascunho.alteracoes
    console.log('🔍 Confirmando rascunho:', rascunho)
    console.log('🔍 Processando alterações:', alteracoes)
    console.log('🔍 Alterações de documentos:', alteracoes.documentos)
    console.log('🔍 Documentos removidos:', alteracoes.documentos?.removidos)

    // Processar alterações antes de confirmar
    await pool.query('BEGIN')

    try {
      // Remover imagens marcadas para exclusão
      if (alteracoes.imagens?.removidas?.length > 0) {
        console.log('🔍 Tentando deletar imagens:', alteracoes.imagens.removidas, 'do imóvel:', imovelId)
        const deleteResult = await pool.query(
          'DELETE FROM imovel_imagens WHERE id = ANY($1) AND imovel_id = $2',
          [alteracoes.imagens.removidas, imovelId]
        )
        console.log('✅ Imagens removidas:', alteracoes.imagens.removidas, 'Linhas afetadas:', deleteResult.rowCount)
      } else {
        console.log('🔍 Nenhuma imagem para remover')
      }

      // Remover documentos marcados para exclusão
      if (alteracoes.documentos?.removidos?.length > 0) {
        console.log('🔍 Tentando deletar documentos:', alteracoes.documentos.removidos, 'do imóvel:', imovelId)
        const deleteResult = await pool.query(
          'DELETE FROM imovel_documentos WHERE id = ANY($1) AND id_imovel = $2',
          [alteracoes.documentos.removidos, imovelId]
        )
        console.log('✅ Documentos removidos:', alteracoes.documentos.removidos, 'Linhas afetadas:', deleteResult.rowCount)
      } else {
        console.log('🔍 Nenhum documento para remover')
      }

      // Atualizar imagem principal se houver alteração
      if (alteracoes.imagemPrincipal) {
        console.log('🔍 Atualizando imagem principal:', alteracoes.imagemPrincipal)
        
        // Primeiro, definir todas as imagens do imóvel como não principais
        const updateAllResult = await pool.query(
          'UPDATE imovel_imagens SET principal = false WHERE imovel_id = $1',
          [imovelId]
        )
        console.log('🔍 Todas as imagens definidas como não principais:', updateAllResult.rowCount)

        // Depois, definir a imagem selecionada como principal
        const updatePrincipalResult = await pool.query(
          'UPDATE imovel_imagens SET principal = true WHERE id = $1 AND imovel_id = $2',
          [alteracoes.imagemPrincipal, imovelId]
        )
        console.log('🔍 Imagem definida como principal:', updatePrincipalResult.rowCount)
      } else {
        console.log('🔍 Nenhuma alteração de imagem principal para processar')
      }

      // Processar alterações de vídeo
      if (alteracoes.video) {
        console.log('🔍 Processando alterações de vídeo:', alteracoes.video)
        
        if (alteracoes.video.removido) {
          console.log('🔍 Removendo vídeo do imóvel:', imovelId)
          const deleteResult = await pool.query(
            'DELETE FROM imovel_video WHERE imovel_id = $1',
            [imovelId]
          )
          console.log('✅ Vídeo removido:', deleteResult.rowCount)
        } else if (alteracoes.video.adicionado && alteracoes.video.dados) {
          console.log('🔍 Adicionando vídeo ao imóvel:', imovelId)
          console.log('🔍 Dados do vídeo no rascunho:', alteracoes.video.dados)
          
          const { saveImovelVideo } = await import('@/lib/database/imovel-video')
          
          // Converter dados do rascunho para formato da função
          const videoData = alteracoes.video.dados
          
          // Verificar se já temos o Buffer convertido ou se precisamos converter
          let videoBuffer: Buffer
          
          if (videoData.videoBuffer && Buffer.isBuffer(videoData.videoBuffer)) {
            // Já temos o Buffer convertido
            videoBuffer = videoData.videoBuffer
            console.log('✅ Usando Buffer já convertido, tamanho:', videoBuffer.length)
          } else if (videoData.arquivo && typeof videoData.arquivo.arrayBuffer === 'function') {
            // É um objeto File (não deveria acontecer, mas por segurança)
            console.log('⚠️ Convertendo File para Buffer...')
            const arrayBuffer = await videoData.arquivo.arrayBuffer()
            videoBuffer = Buffer.from(arrayBuffer)
            console.log('✅ Buffer criado do File, tamanho:', videoBuffer.length)
          } else {
            console.error('❌ Formato de arquivo de vídeo não suportado:', typeof videoData.arquivo)
            console.error('❌ Estrutura dos dados:', Object.keys(videoData))
            throw new Error('Formato de arquivo de vídeo não suportado')
          }
          
          await saveImovelVideo(imovelId, {
            video: videoBuffer,
            nome_arquivo: videoData.nomeArquivo,
            tipo_mime: videoData.tipoMime,
            tamanho_bytes: videoData.tamanhoBytes,
            duracao_segundos: videoData.duracaoSegundos,
            resolucao: videoData.resolucao,
            formato: videoData.formato
          })
          console.log('✅ Vídeo adicionado com sucesso')
        }
      } else {
        console.log('🔍 Nenhuma alteração de vídeo para processar')
      }

      // Marcar rascunho como inativo (confirmado)
      await pool.query(
        'UPDATE imovel_rascunho SET ativo = false, updated_at = NOW() WHERE id = $1',
        [rascunho.id]
      )

      await pool.query('COMMIT')
      console.log('✅ Rascunho confirmado com sucesso')

    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Rascunho confirmado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao confirmar rascunho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
