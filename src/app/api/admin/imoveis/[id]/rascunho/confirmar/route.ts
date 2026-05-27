import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('accessToken')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

// POST - Confirmar rascunho (manter alterações)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API POST /api/admin/imoveis/[id]/rascunho/confirmar - INICIADA')

  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'imoveis', 'UPDATE')
    if (denied) return denied

    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // 🛡️ ISOLAMENTO MULTI-TENANT: Buscar rascunho ativo validando tenant
    const rascunhoResult = await pool.query(
      `SELECT r.* FROM imovel_rascunho r
       JOIN imoveis i ON r.imovel_id = i.id
       WHERE r.imovel_id = $1 AND r.ativo = true
       ${!isMaster ? 'AND i.tenant_id = $2' : ''}`,
      !isMaster ? [imovelId, tenantId] : [imovelId]
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
        
        // OTIMIZADO: 1 query com CASE (antes eram 2 queries)
        const updateResult = await pool.query(
          `UPDATE imovel_imagens 
           SET principal = CASE WHEN id = $1 THEN true ELSE false END 
           WHERE imovel_id = $2`,
          [alteracoes.imagemPrincipal, imovelId]
        )
        console.log('✅ Imagem principal atualizada (otimizado):', updateResult.rowCount, 'linhas')
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
        }
        
        if (alteracoes.video.adicionado && alteracoes.video.dados) {
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
          } else if (videoData.arquivo && typeof videoData.arquivo === 'string') {
            // É uma string base64
            console.log('🔍 Convertendo string base64 para Buffer...')
            const base64Data = videoData.arquivo.includes(',') 
              ? videoData.arquivo.split(',')[1] 
              : videoData.arquivo
            videoBuffer = Buffer.from(base64Data, 'base64')
            console.log('✅ Buffer criado do base64, tamanho:', videoBuffer.length)
          } else if (videoData.arquivo && typeof videoData.arquivo.arrayBuffer === 'function') {
            // É um objeto File (não deveria acontecer, mas por segurança)
            console.log('⚠️ Convertendo File para Buffer...')
            const arrayBuffer = await videoData.arquivo.arrayBuffer()
            videoBuffer = Buffer.from(arrayBuffer)
            console.log('✅ Buffer criado do File, tamanho:', videoBuffer.length)
          } else {
            console.error('❌ Formato de arquivo de vídeo não suportado')
            console.error('❌ Tipo de arquivo:', typeof videoData.arquivo)
            console.error('❌ Estrutura dos dados:', Object.keys(videoData))
            console.error('❌ Dados completos:', JSON.stringify(videoData, null, 2))
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
