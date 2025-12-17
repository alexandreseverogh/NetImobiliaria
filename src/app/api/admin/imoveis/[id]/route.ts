import { NextRequest, NextResponse } from 'next/server'
import { findImovelById, findImovelByIdentifier } from '@/lib/database/imoveis'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { findAmenidadesByImovel } from '@/lib/database/amenidades'
import { findProximidadesByImovel } from '@/lib/database/proximidades'
import { findDocumentosByImovel } from '@/lib/database/imovel-documentos'
import { findImovelImagens } from '@/lib/database/imoveis'
import { findImovelVideoMetadata, findImovelVideo, saveImovelVideo } from '@/lib/database/imovel-video'
import { processAndSaveVideo, VideoData } from '@/lib/utils/videoProcessor'
import { buscarCoordenadasPorEnderecoCompleto } from '@/lib/utils/geocoding'
import pool from '@/lib/database/connection'
import { buildImovelAuditChanges } from '@/lib/utils/imovelAuditHelper'
import { logAuditEvent, extractUserIdFromToken, extractRequestData } from '@/lib/audit/auditLogger'
import { findProprietarioByUuid } from '@/lib/database/proprietarios'

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

function isUuid(value: string): boolean {
  return uuidRegex.test(value)
}

// Função para extrair usuário logado
function getCurrentUser(request: NextRequest): string | null {
  try {
    // Tentar pegar do header Authorization primeiro (Bearer token)
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.replace('Bearer ', '') || null
    
    // Se não encontrou no header, tentar pegar do cookie
    if (!token) {
      token = request.cookies.get('accessToken')?.value || null
    }
    
    if (!token) {
      console.log('🔍 Nenhum token encontrado')
      return null
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      console.log('🔍 Token inválido ou expirado')
      return null
    }

    console.log('🔍 Usuário logado:', decoded.userId)
    return decoded.userId
  } catch (error) {
    console.error('🔍 Erro ao extrair usuário:', error)
    return null
  }
}

const parseDistanceValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const numericString = normalized.replace(/[^0-9.,]/g, '').replace(',', '.')
  if (!numericString) {
    return null
  }

  const parsed = parseFloat(numericString)
  if (Number.isNaN(parsed)) {
    return null
  }

  const isKilometers = normalized.includes('km')
  const meters = isKilometers ? parsed * 1000 : parsed

  return Math.round(meters)
}

// GET - Buscar imóvel específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API GET /api/admin/imoveis/[id] - INICIADA')
  console.log('🔍 API - Parâmetros recebidos:', params)
  
  try {
    const isNumeric = /^\d+$/.test(params.id)
    const imovelId = parseInt(params.id)
    if (isNumeric && isNaN(imovelId)) {
      console.log('❌ API - ID inválido:', params.id)
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Chamando findImovelByIdentifier:', params.id)
    const imovel = await findImovelByIdentifier(isNumeric ? imovelId : params.id)
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
      codigo: imovel.codigo,
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
      findImovelVideo(imovelId).catch((error) => {
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
      principal: (img as any).principal ?? img.is_principal,
      tipo_mime: img.tipo_mime,
      tamanho_bytes: img.tamanho_bytes,
      ordem: img.ordem
    })))

    const responseData = {
      success: true,
      data: {
        ...imovel,
        amenidades,
        proximidades,
        documentos,
        imagens,
        video
      }
    }
    
    console.log('🔍 API - Resposta completa:', {
      id: responseData.data.id,
      codigo: responseData.data.codigo,
      titulo: responseData.data.titulo
    })
    
    console.log('🔍 API - Vídeo na resposta:', {
      videoExists: !!responseData.data.video,
      videoId: responseData.data.video?.id,
      videoNomeArquivo: responseData.data.video?.nome_arquivo,
      videoTamanhoBytes: responseData.data.video?.tamanho_bytes,
      videoTipoMime: responseData.data.video?.tipo_mime,
      videoDuracaoSegundos: responseData.data.video?.duracao_segundos,
      videoResolucao: responseData.data.video?.resolucao,
      videoFormato: responseData.data.video?.formato,
      videoAtivo: responseData.data.video?.ativo,
      videoKeys: responseData.data.video ? Object.keys(responseData.data.video) : 'no video',
      hasVideoBuffer: !!responseData.data.video?.video,
      videoBufferType: typeof responseData.data.video?.video,
      videoBufferLength: responseData.data.video?.video ? responseData.data.video.video.length : 0
    })
    
    return NextResponse.json(responseData)

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
    console.log('🔍 API PUT - imovelId:', imovelId)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    // Processar JSON (mesma abordagem do NOVO IMÓVEL)
    console.log('🔍 API PUT - Processando JSON')
    const data = await request.json()
    
    console.log('🔍 API PUT - Salvando imóvel ID:', imovelId)
    console.log('🔍 API PUT - DADOS COMPLETOS RECEBIDOS:', JSON.stringify(data, null, 2))
    console.log('🔍 API PUT - Object.keys(data):', Object.keys(data))
    console.log('🔍 API PUT - Object.keys(data).length:', Object.keys(data).length)
    console.log('🔍 API PUT - data.status_fk:', data.status_fk)
    console.log('🔍 API PUT - Tipo de data.status_fk:', typeof data.status_fk)
    console.log('🔍 API PUT - data.amenidades recebido:', data.amenidades)
    console.log('🔍 API PUT - data.proximidades recebido:', data.proximidades)
    console.log('🔍 API PUT - data.video recebido:', data.video)
    console.log('🔍 API PUT - data.video.arquivo:', data.video?.arquivo)
    console.log('🔍 API PUT - data.video.nomeArquivo:', data.video?.nomeArquivo)

    // CASO ESPECIAL: Se enviar APENAS destaque ou destaque_nacional (mudança simples)
    const dataKeys = Object.keys(data)
    const isSimpleUpdate = (dataKeys.length === 1 && dataKeys[0] === 'destaque') || 
                           (dataKeys.length === 1 && dataKeys[0] === 'destaque_nacional') ||
                           (dataKeys.length === 2 && dataKeys.includes('destaque') && dataKeys.includes('destaque_nacional'))
    
    if (isSimpleUpdate) {
      console.log('🔍 API PUT - Atualização SIMPLES: destaque e/ou destaque_nacional')
      
      // 1. Buscar o destaque atual para comparar
      const imovelAtual = await pool.query('SELECT destaque, destaque_nacional, codigo, titulo FROM imoveis WHERE id = $1', [imovelId])
      const destaqueAtual = imovelAtual.rows[0]?.destaque
      const destaqueNacionalAtual = imovelAtual.rows[0]?.destaque_nacional
      const imovelCodigo = imovelAtual.rows[0]?.codigo
      const imovelTitulo = imovelAtual.rows[0]?.titulo
      
      console.log('🔍 Destaque atual:', destaqueAtual)
      console.log('🔍 Destaque nacional atual:', destaqueNacionalAtual)
      console.log('🔍 Novo destaque:', data.destaque)
      console.log('🔍 Novo destaque nacional:', data.destaque_nacional)
      
      // 2. Preparar campos para atualização
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1
      
      if ('destaque' in data) {
        updateFields.push(`destaque = $${paramIndex}`)
        updateValues.push(data.destaque)
        paramIndex++
      }
      
      if ('destaque_nacional' in data) {
        updateFields.push(`destaque_nacional = $${paramIndex}`)
        updateValues.push(data.destaque_nacional)
        paramIndex++
      }
      
      updateFields.push(`updated_at = NOW()`)
      updateValues.push(imovelId)
      
      // 3. Atualizar destaque e/ou destaque_nacional na tabela imoveis
      await pool.query(
        `UPDATE imoveis SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      )
      console.log('✅ Destaque(s) atualizado(s) na tabela imoveis')
      
      // 3. Registrar log de auditoria SE o destaque ou destaque_nacional mudou
      const destaqueMudou = 'destaque' in data && destaqueAtual !== data.destaque
      const destaqueNacionalMudou = 'destaque_nacional' in data && destaqueNacionalAtual !== data.destaque_nacional
      
      if (destaqueMudou || destaqueNacionalMudou) {
        const currentUserId = getCurrentUser(request)
        console.log('🔍 User ID para auditoria:', currentUserId)
        
        if (currentUserId) {
          try {
            const userInfo = await pool.query(
              'SELECT username, nome FROM users WHERE id = $1',
              [currentUserId]
            )
            
            const userName = userInfo.rows[0]?.nome || userInfo.rows[0]?.username || 'Desconhecido'
            
            // Construir descrição baseada nas mudanças
            const actions: string[] = []
            if (destaqueMudou) {
              actions.push(data.destaque ? 'destacou' : 'removeu destaque do')
            }
            if (destaqueNacionalMudou) {
              actions.push(data.destaque_nacional ? 'destacou nacionalmente' : 'removeu destaque nacional do')
            }
            const actionDescription = actions.join(' e ')
            
            const auditQuery = `
              INSERT INTO audit_logs (
                user_id,
                action,
                resource,
                resource_id,
                details,
                ip_address,
                user_agent
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `
            
            const details = {
              description: `${actionDescription.charAt(0).toUpperCase() + actionDescription.slice(1)} imóvel ${imovelCodigo} (${imovelTitulo})`,
              imovel_codigo: imovelCodigo,
              imovel_titulo: imovelTitulo,
              destaque_anterior: destaqueAtual,
              destaque_novo: 'destaque' in data ? data.destaque : destaqueAtual,
              destaque_nacional_anterior: destaqueNacionalAtual,
              destaque_nacional_novo: 'destaque_nacional' in data ? data.destaque_nacional : destaqueNacionalAtual,
              action_type: actionDescription,
              changed_by: currentUserId,
              changed_by_name: userName,
              timestamp: new Date().toISOString()
            }
            
            await pool.query(auditQuery, [
              currentUserId,
              'UPDATE',
              'destacar-imovel',
              imovelId,
              JSON.stringify(details),
              request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              request.headers.get('user-agent') || 'unknown'
            ])
            
            console.log('✅ Log de auditoria registrado para destacar/remover destaque')
          } catch (auditError) {
            console.error('⚠️ Erro ao registrar log de auditoria (não crítico):', auditError)
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Destaque atualizado com sucesso'
      })
    }
    
    // CASO ESPECIAL: Se enviar APENAS status_fk (mudança de status)
    if (dataKeys.length === 1 && dataKeys[0] === 'status_fk') {
      console.log('🔍 API PUT - Atualização SIMPLES: apenas status_fk')
      
      // 1. Buscar o status atual para comparar
      const imovelAtual = await pool.query('SELECT status_fk FROM imoveis WHERE id = $1', [imovelId])
      const statusAtual = imovelAtual.rows[0]?.status_fk
      
      console.log('🔍 Status atual:', statusAtual)
      console.log('🔍 Novo status:', data.status_fk)
      console.log('🔍 Status vai mudar?', statusAtual !== data.status_fk)
      
      // 2. Atualizar status na tabela imoveis
      await pool.query(
        'UPDATE imoveis SET status_fk = $1, updated_at = NOW() WHERE id = $2',
        [data.status_fk, imovelId]
      )
      console.log('✅ Status atualizado na tabela imoveis')
      
      // 3. Inserir no histórico SE o status mudou
      if (statusAtual !== data.status_fk) {
        const currentUserId = getCurrentUser(request)
        console.log('🔍 User ID para histórico:', currentUserId)
        
        const historicoQuery = `
          INSERT INTO imovel_status (imovel_fk, status_fk, created_by, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `
        
        try {
          const resultHistorico = await pool.query(historicoQuery, [imovelId, data.status_fk, currentUserId])
          console.log('✅ Histórico de status inserido:', resultHistorico.rows[0])
          
          // 4. Registrar log de auditoria
          if (currentUserId) {
            try {
              // Buscar informações para o log
              const imovelInfo = await pool.query(
                'SELECT codigo, titulo FROM imoveis WHERE id = $1',
                [imovelId]
              )
              
              const statusAntigoInfo = await pool.query(
                'SELECT nome FROM status_imovel WHERE id = $1',
                [statusAtual]
              )
              
              const statusNovoInfo = await pool.query(
                'SELECT nome FROM status_imovel WHERE id = $1',
                [data.status_fk]
              )
              
              const userInfo = await pool.query(
                'SELECT username, nome FROM users WHERE id = $1',
                [currentUserId]
              )
              
              const imovelCodigo = imovelInfo.rows[0]?.codigo || 'Desconhecido'
              const imovelTitulo = imovelInfo.rows[0]?.titulo || 'Desconhecido'
              const statusAntigoNome = statusAntigoInfo.rows[0]?.nome || 'Desconhecido'
              const statusNovoNome = statusNovoInfo.rows[0]?.nome || 'Desconhecido'
              const userName = userInfo.rows[0]?.nome || userInfo.rows[0]?.username || 'Desconhecido'
              
              const auditQuery = `
                INSERT INTO audit_logs (
                  user_id,
                  action,
                  resource,
                  resource_id,
                  details,
                  ip_address,
                  user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `
              
              const details = {
                description: `Mudou status do imóvel ${imovelCodigo} (${imovelTitulo}) de "${statusAntigoNome}" para "${statusNovoNome}"`,
                imovel_codigo: imovelCodigo,
                imovel_titulo: imovelTitulo,
                status_anterior: statusAtual,
                status_anterior_nome: statusAntigoNome,
                status_novo: data.status_fk,
                status_novo_nome: statusNovoNome,
                changed_by: currentUserId,
                changed_by_name: userName,
                timestamp: new Date().toISOString()
              }
              
              await pool.query(auditQuery, [
                currentUserId,
                'UPDATE',
                'mudanca-status',
                imovelId,
                JSON.stringify(details),
                request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                request.headers.get('user-agent') || 'unknown'
              ])
              
              console.log('✅ Log de auditoria registrado para mudança de status')
            } catch (auditError) {
              console.error('⚠️ Erro ao registrar log de auditoria (não crítico):', auditError)
            }
          }
        } catch (insertError) {
          console.error('❌ ERRO ao inserir histórico:', insertError)
          console.error('❌ Detalhes:', insertError instanceof Error ? insertError.message : insertError)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Status atualizado com sucesso'
      })
    }
    
    // CASO COMPLETO: Atualização de múltiplos campos (edição completa)
    console.log('🔍 API PUT - Atualização COMPLETA: múltiplos campos')
    
    // Buscar dados atuais do imóvel (para merge e geocoding)
    const imovelAtualResult = await pool.query('SELECT * FROM imoveis WHERE id = $1', [imovelId])
    if (imovelAtualResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }
    const imovelAtual = imovelAtualResult.rows[0]
    
    let proprietarioUuidNormalizado: string | null = imovelAtual.proprietario_uuid ?? null

    if ('proprietario_uuid' in data || 'proprietario_fk' in data) {
      const identificadorBruto =
        data.proprietario_uuid !== undefined
          ? data.proprietario_uuid
          : data.proprietario_fk

      if (
        identificadorBruto === undefined ||
        identificadorBruto === null ||
        `${identificadorBruto}`.toString().trim() === ''
      ) {
        proprietarioUuidNormalizado = null
      } else {
        const identificadorLimpo = `${identificadorBruto}`.trim()
        if (!isUuid(identificadorLimpo)) {
          return NextResponse.json(
            { error: 'Identificador de proprietário inválido. Utilize o UUID.' },
            { status: 400 }
          )
        }

        const proprietario = await findProprietarioByUuid(identificadorLimpo)
        if (!proprietario) {
          return NextResponse.json(
            { error: 'Proprietário informado não foi encontrado' },
            { status: 404 }
          )
        }
        proprietarioUuidNormalizado = proprietario.uuid
      }
    }

    data.proprietario_uuid = proprietarioUuidNormalizado
    delete data.proprietario_fk
    
    // Buscar coordenadas geográficas se endereço foi alterado
    let latitude = null
    let longitude = null
    
    const cepAtual = imovelAtual.cep
    const numeroAtual = imovelAtual.numero
    const latitudeAtual = imovelAtual.latitude
    const longitudeAtual = imovelAtual.longitude
    const destaqueAtual = imovelAtual.destaque
    
    // Verificar se o CEP ou NÚMERO foram alterados, ou se não há coordenadas atuais
    const cepNovo = data.endereco?.cep
    const numeroNovo = data.endereco?.numero
    const cepAlterado = cepAtual !== cepNovo
    const numeroAlterado = numeroAtual !== numeroNovo
    const semCoordenadas = !latitudeAtual || !longitudeAtual
    
    console.log('🔍 ========== VERIFICAÇÃO DE COORDENADAS ==========')
    console.log('🔍 CEP Atual (banco):', cepAtual)
    console.log('🔍 CEP Novo (requisição):', cepNovo)
    console.log('🔍 CEP Alterado?:', cepAlterado)
    console.log('🔍 Número Atual (banco):', numeroAtual)
    console.log('🔍 Número Novo (requisição):', numeroNovo)
    console.log('🔍 Número Alterado?:', numeroAlterado)
    console.log('🔍 Latitude Atual:', latitudeAtual)
    console.log('🔍 Longitude Atual:', longitudeAtual)
    console.log('🔍 Sem Coordenadas?:', semCoordenadas)
    console.log('🔍 Endereço completo:', data.endereco)
    
    // VALIDAÇÃO RIGOROSA: NÚMERO É SEMPRE OBRIGATÓRIO (independente se CEP mudou)
    // IMPORTANTE: Verificar se numero existe e não é vazio
    const numeroVazio = !data.endereco?.numero || data.endereco.numero.trim() === ''
    
    if (data.endereco && numeroVazio) {
      console.error('❌ ERRO CRÍTICO: Número do imóvel é obrigatório!')
      console.error('❌ Dados COMPLETOS de endereço recebidos:', JSON.stringify(data.endereco, null, 2))
      console.error('❌ Tipo do numero:', typeof data.endereco.numero)
      console.error('❌ Valor do numero:', data.endereco.numero)
      console.error('❌ Numero é undefined?', data.endereco.numero === undefined)
      console.error('❌ Numero é null?', data.endereco.numero === null)
      console.error('❌ Numero é string vazia?', data.endereco.numero === '')
      console.error('❌ TODOS OS DADOS RECEBIDOS:', JSON.stringify(data, null, 2))
      
      return NextResponse.json(
        { 
          error: 'O número do imóvel é obrigatório',
          field: 'numero',
          details: {
            mensagem: 'Por favor, informe o número do imóvel. Todo imóvel deve ter um número.',
            numeroRecebido: data.endereco.numero,
            tipoNumero: typeof data.endereco.numero
          }
        },
        { status: 400 }
      )
    }
    
    // Buscar novas coordenadas se: CEP mudou OU Número mudou OU não há coordenadas
    if ((cepAlterado || numeroAlterado || semCoordenadas) && cepNovo && data.endereco?.numero) {
      try {
        console.log('🚀 INICIANDO BUSCA DE NOVAS COORDENADAS...')
        console.log('🔍 Motivo da busca:', {
          cepAlterado,
          numeroAlterado,
          semCoordenadas
        })
        console.log('🔍 Dados para busca:', {
          endereco: data.endereco.endereco,
          numero: data.endereco.numero,
          complemento: data.endereco.complemento || '',
          bairro: data.endereco.bairro || '',
          cidade: data.endereco.cidade,
          estado: data.endereco.estado,
          cep: cepNovo
        })
        
        // IMPORTANTE: Buscar coordenadas com ENDEREÇO COMPLETO incluindo NÚMERO
        // Isso garante precisão máxima na localização do imóvel
        // Coordenadas são recalculadas se CEP OU NÚMERO mudaram
        const coordenadas = await buscarCoordenadasPorEnderecoCompleto(
          data.endereco.endereco,
          data.endereco.numero, // OBRIGATÓRIO
          data.endereco.complemento || '',
          data.endereco.bairro || '',
          data.endereco.cidade,
          data.endereco.estado,
          cepNovo
        )

        if (coordenadas) {
          latitude = coordenadas.lat
          longitude = coordenadas.lon
          console.log('✅ SUCESSO! Novas coordenadas obtidas com endereço completo:', { lat: latitude, lon: longitude })
        } else {
          console.log('⚠️ AVISO: Coordenadas não encontradas para endereço completo, mantendo valores atuais')
          latitude = latitudeAtual
          longitude = longitudeAtual
        }
      } catch (error) {
        console.error('❌ ERRO ao buscar coordenadas na edição:', error)
        console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
        // Mantém coordenadas atuais em caso de erro
        latitude = latitudeAtual
        longitude = longitudeAtual
      }
    } else {
      // CEP e Número não mudaram, mantém coordenadas atuais
      latitude = latitudeAtual
      longitude = longitudeAtual
      console.log('ℹ️ CEP e Número não foram alterados - mantendo coordenadas atuais')
    }
    
    console.log('🔍 COORDENADAS FINAIS QUE SERÃO SALVAS:', { lat: latitude, lon: longitude })
    console.log('🔍 ===============================================')

    // Função para converter valores numéricos com vírgula para ponto (formato brasileiro para banco)
    const converterValorNumerico = (valor: any): number | undefined => {
      console.log('🔍 converterValorNumerico - valor recebido:', valor, typeof valor)
      
      if (valor === null || valor === undefined || valor === '') {
        console.log('🔍 converterValorNumerico - valor vazio, retornando undefined')
        return undefined
      }
      
      if (typeof valor === 'number') {
        console.log('🔍 converterValorNumerico - já é número:', valor)
        return valor
      }
      
      if (typeof valor === 'string') {
        // Converter formato brasileiro para banco: "1.256,00" -> 1256.00
        const valorLimpo = valor.replace(/\./g, '').replace(',', '.').trim()
        const numero = parseFloat(valorLimpo)
        console.log('🔍 converterValorNumerico - string convertida:', valor, '->', valorLimpo, '->', numero)
        return isNaN(numero) ? undefined : numero
      }
      
      console.log('🔍 converterValorNumerico - tipo não suportado:', typeof valor)
      return undefined
    }

    // Verificar se é uma atualização apenas de status
    const isStatusUpdateOnly = Object.keys(data).length === 1 && data.status_fk !== undefined
    
    console.log('🔍 ========== VERIFICAÇÃO isStatusUpdateOnly ==========')
    console.log('🔍 isStatusUpdateOnly:', isStatusUpdateOnly)
    console.log('🔍 Condições:')
    console.log('   - Object.keys(data).length === 1:', Object.keys(data).length === 1)
    console.log('   - data.status_fk !== undefined:', data.status_fk !== undefined)
    console.log('🔍 ================================================')

    if (isStatusUpdateOnly) {
      // Atualizar apenas o status_fk e adicionar ao histórico
      console.log('🔍 ========== ATUALIZAÇÃO DE STATUS ==========')
      console.log('🔍 Imóvel ID:', imovelId)
      console.log('🔍 Novo status_fk recebido:', data.status_fk)
      
      // 1. Buscar o status atual para comparar
      const imovel = await pool.query('SELECT status_fk FROM imoveis WHERE id = $1', [imovelId])
      const statusAtual = imovel.rows[0]?.status_fk
      console.log('🔍 Status atual no banco:', statusAtual)
      console.log('🔍 Status vai mudar?', statusAtual !== data.status_fk)
      
      // 2. Atualizar o status_fk na tabela imoveis
      const updateStatusQuery = `UPDATE imoveis SET status_fk = $1 WHERE id = $2`
      await pool.query(updateStatusQuery, [data.status_fk, imovelId])
      console.log('✅ Status atualizado na tabela imoveis')
      
      // 3. Adicionar ao histórico SE o status mudou
      if (statusAtual !== data.status_fk) {
        // Pegar o usuário logado
        const currentUserId = getCurrentUser(request)
        console.log('🔍 User ID para histórico:', currentUserId)
        console.log('🔍 Tipo de currentUserId:', typeof currentUserId)
        
        const historicoQuery = `
          INSERT INTO imovel_status (imovel_fk, status_fk, created_by, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `
        
        console.log('🔍 Executando INSERT em imovel_status...')
        console.log('🔍 Parâmetros:', { imovelId, statusFk: data.status_fk, userId: currentUserId })
        
        try {
          const resultHistorico = await pool.query(historicoQuery, [imovelId, data.status_fk, currentUserId])
          console.log('✅ Histórico de status inserido:', resultHistorico.rows[0])
          console.log('✅ ID do registro de histórico criado:', resultHistorico.rows[0]?.id)
        } catch (insertError) {
          console.error('❌ ERRO ao inserir em imovel_status:', insertError)
          console.error('❌ Mensagem do erro:', insertError instanceof Error ? insertError.message : insertError)
          console.error('❌ Stack trace:', insertError instanceof Error ? insertError.stack : 'N/A')
          throw insertError
        }
        
        // 4. Registrar log de auditoria
        if (currentUserId) {
          try {
            // Buscar nome do imóvel para o log
            const imovelInfo = await pool.query(
              'SELECT codigo, titulo FROM imoveis WHERE id = $1',
              [imovelId]
            )
            
            // Buscar nome do status para o log
            const statusInfo = await pool.query(
              'SELECT nome FROM status_imovel WHERE id = $1',
              [data.status_fk]
            )
            
            // Buscar nome do usuário
            const userInfo = await pool.query(
              'SELECT username, nome FROM users WHERE id = $1',
              [currentUserId]
            )
            
            const imovelCodigo = imovelInfo.rows[0]?.codigo || 'Desconhecido'
            const imovelTitulo = imovelInfo.rows[0]?.titulo || 'Desconhecido'
            const statusNome = statusInfo.rows[0]?.nome || 'Desconhecido'
            const userName = userInfo.rows[0]?.nome || userInfo.rows[0]?.username || 'Desconhecido'
            
            const auditQuery = `
              INSERT INTO audit_logs (
                user_id,
                action,
                resource,
                resource_id,
                details,
                ip_address,
                user_agent
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `
            
            const details = {
              description: `Adicionou novo status "${statusNome}" ao imóvel ${imovelCodigo} (${imovelTitulo})`,
              imovel_codigo: imovelCodigo,
              imovel_titulo: imovelTitulo,
              status_anterior: statusAtual,
              status_novo: data.status_fk,
              status_nome: statusNome,
              created_by: currentUserId,
              created_by_name: userName,
              timestamp: new Date().toISOString()
            }
            
            await pool.query(auditQuery, [
              currentUserId,
              'UPDATE',
              'imovel_status',
              imovelId,
              JSON.stringify(details),
              request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              request.headers.get('user-agent') || 'unknown'
            ])
            
            console.log('✅ Log de auditoria registrado para mudança de status')
          } catch (auditError) {
            // Não falhar o processo se o log de auditoria falhar
            console.error('⚠️ Erro ao registrar log de auditoria (não crítico):', auditError)
          }
        }
      } else {
        console.log('ℹ️ Status não mudou (statusAtual === novo status), não inserindo histórico')
        console.log('ℹ️ statusAtual:', statusAtual, 'tipo:', typeof statusAtual)
        console.log('ℹ️ data.status_fk:', data.status_fk, 'tipo:', typeof data.status_fk)
      }
      
      console.log('🔍 ==========================================')
      return NextResponse.json({ success: true, message: 'Status atualizado com sucesso' })
    }

    // Obter usuário logado para updated_by
    const currentUserId = getCurrentUser(request)
    console.log('🔍 Usuário logado (updated_by):', currentUserId)

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
        latitude = $10,
        longitude = $11,
        preco = $12,
        preco_condominio = $13,
        preco_iptu = $14,
        taxa_extra = $15,
        area_total = $16,
        area_construida = $17,
        quartos = $18,
        banheiros = $19,
        suites = $20,
        varanda = $21,
        vagas_garagem = $22,
        andar = $23,
        total_andares = $24,
        mobiliado = $25,
        aceita_permuta = $26,
        aceita_financiamento = $27,
        tipo_fk = $28,
        finalidade_fk = $29,
        status_fk = $30,
        proprietario_uuid = $31,
        destaque = $32,
        updated_by = $33,
        updated_at = NOW()
      WHERE id = $34
    `

    console.log('🔍 ========== PREPARANDO UPDATE NO BANCO ==========')
    console.log('🔍 Latitude que será salva ($10):', latitude)
    console.log('🔍 Longitude que será salva ($11):', longitude)
    console.log('🔍 Tipo de latitude:', typeof latitude)
    console.log('🔍 Tipo de longitude:', typeof longitude)
    
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
      latitude, // $10 - latitude
      longitude, // $11 - longitude
      converterValorNumerico(data.preco), // $12 - Convertido
      converterValorNumerico(data.precoCondominio), // $13 - Convertido
      converterValorNumerico(data.precoIPTU), // $14 - Convertido
      converterValorNumerico(data.taxaExtra), // $15 - Convertido
      converterValorNumerico(data.areaTotal), // $16 - Convertido
      converterValorNumerico(data.areaConstruida), // $17 - Convertido
      converterValorNumerico(data.quartos), // $18 - Convertido
      converterValorNumerico(data.banheiros), // $19 - Convertido
      converterValorNumerico(data.suites), // $20 - Convertido
      converterValorNumerico(data.varanda), // $21 - Convertido
      converterValorNumerico(data.vagasGaragem), // $22 - Convertido
      converterValorNumerico(data.andar), // $23 - Convertido
      converterValorNumerico(data.totalAndares), // $24 - Convertido
      data.mobiliado,
      data.aceita_permuta,
      data.aceita_financiamento,
      data.tipo_fk,
      data.finalidade_fk,
      data.status_fk,
      proprietarioUuidNormalizado, // $31
      data.destaque !== undefined ? data.destaque : destaqueAtual, // $32
      currentUserId, // $33 - updated_by
      imovelId // $34 - WHERE id
    ]

    // Executar todas as operações em paralelo para melhor performance
    const operations = []
    
    // 1. Atualizar dados básicos do imóvel
    console.log('🔍 Executando UPDATE no banco de dados...')
    const updateOperation = pool.query(updateQuery, values)
    operations.push(updateOperation)
    
    // 2. Preparar amenidades
    console.log('🔍 API - Dados recebidos para amenidades:', data.amenidades)
    console.log('🔍 API - Tipo de data.amenidades:', typeof data.amenidades)
    console.log('🔍 API - É array?', Array.isArray(data.amenidades))
    if (data.amenidades && Array.isArray(data.amenidades)) {
      console.log('🔍 API - Estrutura do primeiro item:', data.amenidades[0])
      console.log('🔍 API - Propriedades disponíveis:', Object.keys(data.amenidades[0] || {}))
    }
    
    const amenidadeIds = data.amenidades && Array.isArray(data.amenidades) 
      ? data.amenidades
          .map((a: any) => {
            console.log('🔍 API - Processando amenidade:', a)
            const rawId = a?.amenidadeId ?? a?.amenidade_id ?? a?.id

            if (rawId === undefined || rawId === null) {
              console.warn('⚠️ API - Amenidade sem ID válido será ignorada:', a)
              return null
            }

            const parsedId = typeof rawId === 'number' ? rawId : parseInt(rawId, 10)

            if (Number.isNaN(parsedId)) {
              console.warn('⚠️ API - Amenidade com ID não numérico será ignorada:', rawId, a)
              return null
            }

            return parsedId
          })
          .filter((id: number | null): id is number => id !== null)
          .filter((id: number, index: number, array: number[]) => array.indexOf(id) === index)
      : []
    
    console.log('🔍 API - amenidadeIds finais:', amenidadeIds)
    
    // 3. Preparar proximidades
    console.log('🔍 API - Dados recebidos para proximidades:', data.proximidades)
    console.log('🔍 API - Tipo de data.proximidades:', typeof data.proximidades)
    console.log('🔍 API - É array?', Array.isArray(data.proximidades))
    
    const proximidadesFormatadas = data.proximidades && Array.isArray(data.proximidades)
      ? data.proximidades.map((p: any) => {
          console.log('🔍 API - Processando proximidade:', p)
          console.log('🔍 API - p.id:', p.id ?? p.proximidade_id)
          console.log('🔍 API - p.distancia (raw):', p.distancia, 'tipo:', typeof p.distancia)
          console.log('🔍 API - p.distancia_metros (raw):', p.distancia_metros, 'tipo:', typeof p.distancia_metros)
          console.log('🔍 API - p.tempo_caminhada (raw):', p.tempo_caminhada, 'tipo:', typeof p.tempo_caminhada)
          console.log('🔍 API - p.observacoes:', p.observacoes)

          const distanciaMetros = parseDistanceValue(p.distancia_metros ?? p.distancia)

          let tempoCaminhada = null
          if (p.tempo_caminhada !== null && p.tempo_caminhada !== undefined && p.tempo_caminhada !== '') {
            if (typeof p.tempo_caminhada === 'number') {
              tempoCaminhada = p.tempo_caminhada
            } else if (typeof p.tempo_caminhada === 'string') {
              const parsed = parseInt(p.tempo_caminhada.replace(/[^0-9]/g, ''), 10)
              tempoCaminhada = Number.isNaN(parsed) ? null : parsed
            }
          }

          console.log('🔍 API - Valores processados:', { distanciaMetros, tempoCaminhada })

          return {
            proximidade_id: p.id ?? p.proximidade_id,
            distancia_metros: distanciaMetros,
            tempo_caminhada: tempoCaminhada,
            observacoes: p.observacoes || null
          }
        })
      : []
    
    console.log('🔍 API - proximidadesFormatadas:', proximidadesFormatadas)
    
    // Executar operações em paralelo
    await Promise.all([
      ...operations,
      // Amenidades e proximidades serão executadas em paralelo após o UPDATE
      (async () => {
        console.log('🔍 API - Chamando updateImovelAmenidades com:', { imovelId, amenidadeIds })
        const { updateImovelAmenidades } = await import('@/lib/database/amenidades')
        await updateImovelAmenidades(imovelId, amenidadeIds)
      })(),
      (async () => {
        try {
          console.log('🔍 API - Iniciando updateImovelProximidades')
          console.log('🔍 API - imovelId:', imovelId)
          console.log('🔍 API - proximidadesFormatadas:', JSON.stringify(proximidadesFormatadas, null, 2))
          
          const { updateImovelProximidades } = await import('@/lib/database/proximidades')
          await updateImovelProximidades(imovelId, proximidadesFormatadas)
          
          console.log('✅ API - updateImovelProximidades concluído')
        } catch (err) {
          console.error('❌ API - Erro em updateImovelProximidades:', err)
          console.error('❌ API - Stack:', err instanceof Error ? err.stack : 'N/A')
          throw err
        }
      })()
    ])
    
    console.log('🔍 ========== RESULTADO DO UPDATE ==========')
    console.log('🔍 UPDATE executado com sucesso!')
    console.log('🔍 Linhas afetadas:', operations[0])
    
    // Verificar se as coordenadas foram realmente salvas no banco
    const verificacao = await pool.query(
      'SELECT id, cep, latitude, longitude FROM imoveis WHERE id = $1',
      [imovelId]
    )
    console.log('🔍 VERIFICAÇÃO PÓS-UPDATE no banco:', verificacao.rows[0])
    console.log('🔍 ==========================================')
    
    console.log('✅ Imóvel, amenidades e proximidades atualizados')

    // Processar vídeo se presente (mesma lógica do NOVO IMÓVEL)
    console.log('🔍 API PUT - Verificando vídeo...')
    console.log('🔍 API PUT - data.video existe?', !!data.video)
    console.log('🔍 API PUT - data.video completo:', JSON.stringify(data.video, null, 2))
    console.log('🔍 API PUT - data.video.arquivo existe?', !!data.video?.arquivo)
    console.log('🔍 API PUT - data.video.arquivo tipo:', typeof data.video?.arquivo)
    console.log('🔍 API PUT - data.video.arquivo é string?', typeof data.video?.arquivo === 'string')
    console.log('🔍 API PUT - data.video.arquivo é File?', data.video?.arquivo instanceof File)
    console.log('🔍 API PUT - data.video.arquivo é Buffer?', Buffer.isBuffer(data.video?.arquivo))
    
    if (data.video && data.video.arquivo) {
      try {
        console.log('🔍 API PUT - Processando vídeo...')
        const videoData: VideoData = {
          arquivo: data.video.arquivo, // String base64
          nomeArquivo: data.video.nomeArquivo,
          tipoMime: data.video.tipoMime,
          tamanhoBytes: data.video.tamanhoBytes,
          duracaoSegundos: data.video.duracaoSegundos,
          resolucao: data.video.resolucao,
          formato: data.video.formato
        }
        
        console.log('🔍 API PUT - VideoData criado com:', {
          nomeArquivo: videoData.nomeArquivo,
          tipoMime: videoData.tipoMime,
          tamanhoBytes: videoData.tamanhoBytes,
          duracaoSegundos: videoData.duracaoSegundos,
          formato: videoData.formato,
          arquivoType: typeof videoData.arquivo,
          arquivoLength: typeof videoData.arquivo === 'string' ? videoData.arquivo.length : 'N/A'
        })
        console.log('🔍 API PUT - Chamando processAndSaveVideo...')
        
        const videoId = await processAndSaveVideo(imovelId, videoData)
        console.log('✅ API PUT - Vídeo salvo com sucesso, ID:', videoId)
      } catch (videoError) {
        console.error('❌ Erro ao salvar vídeo:', videoError)
        console.error('❌ Stack trace:', videoError instanceof Error ? videoError.stack : 'No stack trace')
      }
    } else {
      console.log('🔍 API PUT - Nenhum vídeo presente para processar')
      console.log('🔍 API PUT - data.video:', data.video)
      console.log('🔍 API PUT - data.video?.arquivo:', data.video?.arquivo)
    }

    // ========================================
    // AUDITORIA: Registrar alterações (NÃO CRÍTICO)
    // ========================================
    try {
      console.log('🔍 ========== INICIANDO AUDITORIA ==========')
      
      const userId = extractUserIdFromToken(request)
      const { ipAddress, userAgent } = extractRequestData(request)
      
      console.log('🔍 AUDITORIA - userId:', userId)
      console.log('🔍 AUDITORIA - imovelAtual disponível:', !!imovelAtualResult?.rows?.[0])
      
      if (userId && imovelAtualResult?.rows?.[0]) {
        // Buscar amenidades e proximidades ANTES para comparar
        const amenidadesAntes = await findAmenidadesByImovel(imovelId).catch(() => [])
        const proximidadesAntes = await findProximidadesByImovel(imovelId).catch(() => [])
        const imagensAntes = await findImovelImagens(imovelId).catch(() => [])
        const documentosAntes = await findDocumentosByImovel(imovelId).catch(() => [])
        
        // COMPARAÇÃO MANUAL DIRETA - Não usar helper
        // Helper requer objetos completos, aqui fazemos comparação precisa campo a campo
        
        const changes: any = {}
        const temValor = (val: any) => val !== undefined && val !== null && val !== ''
        
        // Comparar titulo
        if (temValor(data.titulo) && data.titulo !== imovelAtualResult.rows[0].titulo) {
          changes.titulo = {
            before: imovelAtualResult.rows[0].titulo,
            after: data.titulo
          }
        }
        
        // Comparar descricao
        if (temValor(data.descricao) && data.descricao !== imovelAtualResult.rows[0].descricao) {
          changes.descricao = {
            before: imovelAtualResult.rows[0].descricao,
            after: data.descricao
          }
        }
        
        // Comparar campos de endereço (se enviados)
        if (data.endereco) {
          if (temValor(data.endereco.endereco) && data.endereco.endereco !== imovelAtualResult.rows[0].endereco) {
            changes.endereco = {
              before: imovelAtualResult.rows[0].endereco,
              after: data.endereco.endereco
            }
          }
          if (temValor(data.endereco.numero) && data.endereco.numero !== imovelAtualResult.rows[0].numero) {
            changes.numero = {
              before: imovelAtualResult.rows[0].numero,
              after: data.endereco.numero
            }
          }
          if (temValor(data.endereco.complemento) && data.endereco.complemento !== imovelAtualResult.rows[0].complemento) {
            changes.complemento = {
              before: imovelAtualResult.rows[0].complemento,
              after: data.endereco.complemento
            }
          }
          if (temValor(data.endereco.bairro) && data.endereco.bairro !== imovelAtualResult.rows[0].bairro) {
            changes.bairro = {
              before: imovelAtualResult.rows[0].bairro,
              after: data.endereco.bairro
            }
          }
          if (temValor(data.endereco.cidade) && data.endereco.cidade !== imovelAtualResult.rows[0].cidade_fk) {
            changes.cidade = {
              before: imovelAtualResult.rows[0].cidade_fk,
              after: data.endereco.cidade
            }
          }
          if (temValor(data.endereco.estado) && data.endereco.estado !== imovelAtualResult.rows[0].estado_fk) {
            changes.estado = {
              before: imovelAtualResult.rows[0].estado_fk,
              after: data.endereco.estado
            }
          }
          if (temValor(data.endereco.cep) && data.endereco.cep !== imovelAtualResult.rows[0].cep) {
            changes.cep = {
              before: imovelAtualResult.rows[0].cep,
              after: data.endereco.cep
            }
          }
        }
        
        // Coordenadas - só se realmente mudaram
        if (latitude !== latitudeAtual && temValor(latitude)) {
          changes.latitude = {
            before: latitudeAtual,
            after: latitude
          }
        }
        if (longitude !== longitudeAtual && temValor(longitude)) {
          changes.longitude = {
            before: longitudeAtual,
            after: longitude
          }
        }
        
        // Valores monetários - comparar NÚMEROS (converter ambos)
        if (temValor(data.preco)) {
          const valorNovo = converterValorNumerico(data.preco)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].preco)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.preco = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.precoCondominio)) {
          const valorNovo = converterValorNumerico(data.precoCondominio)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].preco_condominio)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.preco_condominio = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.precoIPTU)) {
          const valorNovo = converterValorNumerico(data.precoIPTU)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].preco_iptu)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.preco_iptu = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.taxaExtra)) {
          const valorNovo = converterValorNumerico(data.taxaExtra)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].taxa_extra)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.taxa_extra = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.areaTotal)) {
          const valorNovo = converterValorNumerico(data.areaTotal)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].area_total)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.area_total = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.areaConstruida)) {
          const valorNovo = converterValorNumerico(data.areaConstruida)
          const valorAtual = parseFloat(imovelAtualResult.rows[0].area_construida)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.area_construida = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        
        // Outros numéricos - comparar NÚMEROS (converter ambos)
        if (temValor(data.quartos)) {
          const valorNovo = converterValorNumerico(data.quartos)
          const valorAtual = parseInt(imovelAtualResult.rows[0].quartos)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.quartos = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.banheiros)) {
          const valorNovo = converterValorNumerico(data.banheiros)
          const valorAtual = parseInt(imovelAtualResult.rows[0].banheiros)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.banheiros = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.suites)) {
          const valorNovo = converterValorNumerico(data.suites)
          const valorAtual = parseInt(imovelAtualResult.rows[0].suites)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.suites = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.varanda)) {
          const valorNovo = converterValorNumerico(data.varanda)
          const valorAtual = parseInt(imovelAtualResult.rows[0].varanda)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.varanda = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.vagasGaragem)) {
          const valorNovo = converterValorNumerico(data.vagasGaragem)
          const valorAtual = parseInt(imovelAtualResult.rows[0].vagas_garagem)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.vagas_garagem = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.andar)) {
          const valorNovo = converterValorNumerico(data.andar)
          const valorAtual = parseInt(imovelAtualResult.rows[0].andar)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.andar = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        if (temValor(data.totalAndares)) {
          const valorNovo = converterValorNumerico(data.totalAndares)
          const valorAtual = parseInt(imovelAtualResult.rows[0].total_andares)
          if (temValor(valorNovo) && valorNovo !== valorAtual) {
            changes.total_andares = {
              before: valorAtual,
              after: valorNovo
            }
          }
        }
        
        // Booleanos - comparar se enviados
        if (data.mobiliado !== undefined && data.mobiliado !== null && data.mobiliado !== imovelAtualResult.rows[0].mobiliado) {
          changes.mobiliado = {
            before: imovelAtualResult.rows[0].mobiliado,
            after: data.mobiliado
          }
        }
        if (data.aceita_permuta !== undefined && data.aceita_permuta !== null && data.aceita_permuta !== imovelAtualResult.rows[0].aceita_permuta) {
          changes.aceita_permuta = {
            before: imovelAtualResult.rows[0].aceita_permuta,
            after: data.aceita_permuta
          }
        }
        if (data.aceita_financiamento !== undefined && data.aceita_financiamento !== null && data.aceita_financiamento !== imovelAtualResult.rows[0].aceita_financiamento) {
          changes.aceita_financiamento = {
            before: imovelAtualResult.rows[0].aceita_financiamento,
            after: data.aceita_financiamento
          }
        }
        if (data.destaque !== undefined && data.destaque !== null && data.destaque !== imovelAtualResult.rows[0].destaque) {
          changes.destaque = {
            before: imovelAtualResult.rows[0].destaque,
            after: data.destaque
          }
        }
        
        // FKs - comparar se enviados
        if (temValor(data.tipo_fk) && data.tipo_fk !== imovelAtualResult.rows[0].tipo_fk) {
          changes.tipo_fk = {
            before: imovelAtualResult.rows[0].tipo_fk,
            after: data.tipo_fk
          }
        }
        if (temValor(data.finalidade_fk) && data.finalidade_fk !== imovelAtualResult.rows[0].finalidade_fk) {
          changes.finalidade_fk = {
            before: imovelAtualResult.rows[0].finalidade_fk,
            after: data.finalidade_fk
          }
        }
        if (temValor(data.status_fk) && data.status_fk !== imovelAtualResult.rows[0].status_fk) {
          changes.status_fk = {
            before: imovelAtualResult.rows[0].status_fk,
            after: data.status_fk
          }
        }
        if (
          data.proprietario_uuid !== undefined &&
          data.proprietario_uuid !== imovelAtualResult.rows[0].proprietario_uuid
        ) {
          changes.proprietario_uuid = {
            before: imovelAtualResult.rows[0].proprietario_uuid,
            after: data.proprietario_uuid
          }
        }
        
        // Arrays - comparar IDs
        if (data.amenidades !== undefined && data.amenidades !== null) {
          const amenidadesIds = data.amenidades.map((a: any) => a.amenidade_id || a.id).sort()
          const amenidadesAntesIds = amenidadesAntes.map((a: any) => a.amenidade_id || a.id).sort()
          
          if (JSON.stringify(amenidadesIds) !== JSON.stringify(amenidadesAntesIds)) {
            const added = amenidadesIds.filter((id: number) => !amenidadesAntesIds.includes(id))
            const removed = amenidadesAntesIds.filter((id: number) => !amenidadesIds.includes(id))
            
            changes.amenidades = {
              before: amenidadesAntesIds,
              after: amenidadesIds
            }
            if (added.length > 0) changes.amenidades.added = added
            if (removed.length > 0) changes.amenidades.removed = removed
          }
        }
        
        if (data.proximidades !== undefined && data.proximidades !== null) {
          const proximidadesIds = data.proximidades.map((p: any) => p.proximidade_id || p.id).sort()
          const proximidadesAntesIds = proximidadesAntes.map((p: any) => p.proximidade_id || p.id).sort()
          
          if (JSON.stringify(proximidadesIds) !== JSON.stringify(proximidadesAntesIds)) {
            const added = proximidadesIds.filter((id: number) => !proximidadesAntesIds.includes(id))
            const removed = proximidadesAntesIds.filter((id: number) => !proximidadesIds.includes(id))
            
            changes.proximidades = {
              before: proximidadesAntesIds,
              after: proximidadesIds
            }
            if (added.length > 0) changes.proximidades.added = added
            if (removed.length > 0) changes.proximidades.removed = removed
          }
        }
        
        if (data.imagens !== undefined && data.imagens !== null) {
          const imagensCountNovo = data.imagens.length
          if (imagensCountNovo !== imagensAntes.length) {
            changes.imagens_count = {
              before: imagensAntes.length,
              after: imagensCountNovo,
              action: imagensCountNovo > imagensAntes.length ? 'added' : 'removed'
            }
          }
        }
        
        if (data.documentos !== undefined && data.documentos !== null) {
          const documentosCountNovo = data.documentos.length
          if (documentosCountNovo !== documentosAntes.length) {
            changes.documentos_count = {
              before: documentosAntes.length,
              after: documentosCountNovo,
              action: documentosCountNovo > documentosAntes.length ? 'added' : 'removed'
            }
          }
        }
        
        console.log('🔍 AUDITORIA - Mudanças detectadas:', JSON.stringify(changes, null, 2))
        console.log('🔍 AUDITORIA - Total de mudanças:', Object.keys(changes).length)
        
        // Só registrar se houver mudanças
        if (Object.keys(changes).length > 0) {
          // Buscar nome do usuário para incluir no log
          let userName = 'Desconhecido'
          if (userId) {
            try {
              const userInfo = await pool.query('SELECT nome, username FROM users WHERE id = $1', [userId])
              if (userInfo.rows.length > 0) {
                userName = userInfo.rows[0].nome || userInfo.rows[0].username
              }
            } catch (userError) {
              console.error('⚠️ Erro ao buscar nome do usuário (não crítico):', userError)
            }
          }
          
          await logAuditEvent({
            userId,
            action: 'UPDATE',
            resource: 'imoveis',
            resourceId: imovelId,
            details: {
              description: `Editou imóvel ${imovelAtualResult.rows[0].codigo}`,
              imovel_codigo: imovelAtualResult.rows[0].codigo,
              imovel_titulo: imovelAtualResult.rows[0].titulo,
              changes,
              total_changes: Object.keys(changes).length,
              updated_by: userId,
              updated_by_name: userName,
              updated_at: new Date().toISOString()
            },
            ipAddress,
            userAgent
          })
          
          console.log('✅ AUDITORIA - Log registrado com sucesso')
        } else {
          console.log('ℹ️ AUDITORIA - Nenhuma mudança detectada, log não registrado')
        }
      } else {
        console.log('⚠️ AUDITORIA - Pulada (sem userId ou dados do imóvel)')
      }
    } catch (auditError) {
      console.error('⚠️ Erro na auditoria (NÃO CRÍTICO):', auditError)
      // NÃO propagar erro - operação principal deve continuar
    }
    console.log('🔍 ========== FIM DA AUDITORIA ==========')

    return NextResponse.json({
      success: true,
      message: 'Imóvel atualizado com sucesso'
    })

  } catch (error) {
    console.error('❌ ERRO ao atualizar imóvel:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('❌ Nome do erro:', error instanceof Error ? error.name : 'Unknown')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}