/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'

import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
import { saveImovelDocumentos } from '@/lib/database/imovel-documentos'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { updateImovelAmenidades } from '@/lib/database/amenidades'
import { updateImovelProximidades } from '@/lib/database/proximidades'
import { insertImovelImagem } from '@/lib/database/imoveis'
import { saveImovelVideo } from '@/lib/database/imovel-video'

// FunÃ§Ã£o para extrair usuÃ¡rio logado
function getCurrentUser(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      console.log('ðŸ” Nenhum token encontrado')
      return null
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      console.log('ðŸ” Token invÃ¡lido ou expirado')
      return null
    }

    console.log('ðŸ” UsuÃ¡rio logado:', decoded.userId)
    return decoded.userId
  } catch (error) {
    console.error('ðŸ” Erro ao extrair usuÃ¡rio:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  console.log('ðŸ” API GET /api/admin/imoveis - INICIADA')
  console.log('ðŸ” URL completa:', request.url)
  try {
    // Extrair parÃ¢metros da query
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    
    console.log('ðŸ” API - ParÃ¢metros recebidos:', { page, limit })
    console.log('ðŸ” API - Todos os searchParams:', Object.fromEntries(searchParams.entries()))
    
    // Debug individual de cada filtro
    console.log('ðŸ” API - Debug filtros individuais:')
    console.log('  - codigo:', searchParams.get('codigo'), 'vÃ¡lido:', !!(searchParams.get('codigo') && searchParams.get('codigo') !== ''))
    console.log('  - bairro:', searchParams.get('bairro'), 'vÃ¡lido:', !!(searchParams.get('bairro') && searchParams.get('bairro') !== ''))
    console.log('  - estado:', searchParams.get('estado'), 'vÃ¡lido:', !!(searchParams.get('estado') && searchParams.get('estado') !== ''))
    console.log('  - municipio:', searchParams.get('municipio'), 'vÃ¡lido:', !!(searchParams.get('municipio') && searchParams.get('municipio') !== ''))
    console.log('  - tipo:', searchParams.get('tipo'), 'vÃ¡lido:', !!(searchParams.get('tipo') && searchParams.get('tipo') !== ''))
    console.log('  - finalidade:', searchParams.get('finalidade'), 'vÃ¡lido:', !!(searchParams.get('finalidade') && searchParams.get('finalidade') !== ''))
    console.log('  - status:', searchParams.get('status'), 'vÃ¡lido:', !!(searchParams.get('status') && searchParams.get('status') !== ''))
    
    // Verificar se hÃ¡ filtros com valores vÃ¡lidos (nÃ£o vazios)
    const hasFilters = (searchParams.get('codigo') && searchParams.get('codigo') !== '') || 
                      (searchParams.get('bairro') && searchParams.get('bairro') !== '') || 
                      (searchParams.get('estado') && searchParams.get('estado') !== '') || 
                      (searchParams.get('municipio') && searchParams.get('municipio') !== '') || 
                      (searchParams.get('tipo') && searchParams.get('tipo') !== '') || 
                      (searchParams.get('finalidade') && searchParams.get('finalidade') !== '') || 
                      (searchParams.get('status') && searchParams.get('status') !== '')

    console.log('ðŸ” API - hasFilters:', hasFilters)
    console.log('ðŸ” API - page:', page, 'limit:', limit)
    
    // Se nÃ£o houver parÃ¢metros de paginaÃ§Ã£o nem filtros, retornar todos os imÃ³veis
    if (!page && !limit && !hasFilters) {
      console.log('ðŸ” API - Buscando todos os imÃ³veis...')
      const imoveis = await findAllImoveis()
      console.log('ðŸ” API - ImÃ³veis encontrados:', imoveis.length)
      return NextResponse.json({
        success: true,
        data: imoveis
      })
    }
    
    // Caso contrÃ¡rio, usar paginaÃ§Ã£o
    const pageNum = parseInt(page || '1')
    const limitNum = parseInt(limit || '20')
    const offset = (pageNum - 1) * limitNum

      // Filtros
      const filtros: any = {}
      
      // Filtros do frontend - usando os campos corretos do banco
      if (searchParams.get('codigo')) {
        filtros.id = parseInt(searchParams.get('codigo')!)
      }
      
      if (searchParams.get('bairro')) {
        filtros.bairro = searchParams.get('bairro')
      }
      
      if (searchParams.get('estado')) {
        // Frontend envia ID do estado, mas banco armazena sigla
        // Vamos buscar a sigla correspondente ao ID
        const estadoId = parseInt(searchParams.get('estado')!)
        const siglasEstados: {[key: number]: string} = {
          0: 'RO', 1: 'AC', 2: 'AM', 3: 'RR', 4: 'PA', 5: 'AP', 6: 'TO', 7: 'MA',
          8: 'PI', 9: 'CE', 10: 'RN', 11: 'PB', 12: 'PE', 13: 'AL', 14: 'SE', 15: 'BA',
          16: 'MG', 17: 'ES', 18: 'RJ', 19: 'SP', 20: 'PR', 21: 'SC', 22: 'RS', 23: 'MS',
          24: 'MT', 25: 'GO', 26: 'DF'
        }
        filtros.estado_sigla = siglasEstados[estadoId] || null
        console.log('ðŸ” Estado filtro - ID recebido:', estadoId, 'Sigla convertida:', filtros.estado_sigla)
        console.log('ðŸ” Mapeamento completo:', siglasEstados)
      }
      
      if (searchParams.get('municipio')) {
        // Frontend envia ID da cidade, mas banco armazena nome
        // Vamos buscar o nome da cidade correspondente ao ID
        const cidadeId = parseInt(searchParams.get('municipio')!)
        // Para isso funcionar, precisamos carregar os municÃ­pios do estado selecionado
        // Por enquanto, vamos usar uma abordagem diferente
        filtros.cidade_nome = searchParams.get('municipio') // TemporÃ¡rio - usar nome diretamente
      }
      
      if (searchParams.get('tipo')) {
        // Frontend envia ID do tipo
        filtros.tipo_fk = parseInt(searchParams.get('tipo')!)
      }
      
      if (searchParams.get('finalidade')) {
        // Frontend envia ID da finalidade
        filtros.finalidade_fk = parseInt(searchParams.get('finalidade')!)
      }
      
      if (searchParams.get('status')) {
        // Frontend envia ID do status
        filtros.status_fk = parseInt(searchParams.get('status')!)
      }
    
    // Filtros legados (manter compatibilidade)
    if (searchParams.get('tipo_id')) {
      filtros.tipo_id = parseInt(searchParams.get('tipo_id')!)
    }
    
    if (searchParams.get('status_id')) {
      filtros.status_id = parseInt(searchParams.get('status_id')!)
    }
    
    if (searchParams.get('preco_min')) {
      filtros.preco_min = parseFloat(searchParams.get('preco_min')!)
    }
    
    if (searchParams.get('preco_max')) {
      filtros.preco_max = parseFloat(searchParams.get('preco_max')!)
    }
    
    if (searchParams.get('quartos_min')) {
      filtros.quartos_min = parseInt(searchParams.get('quartos_min')!)
    }
    
    if (searchParams.get('area_min')) {
      filtros.area_min = parseFloat(searchParams.get('area_min')!)
    }
    
    if (searchParams.get('cidade')) {
      filtros.cidade = searchParams.get('cidade')
    }
    
    if (searchParams.get('destaque') !== null) {
      filtros.destaque = searchParams.get('destaque') === 'true'
    }

    console.log('ðŸ” API - Filtros processados:', filtros)

    // Buscar imÃ³veis
    const imoveis = await listImoveis(filtros, limitNum, offset)
    
    // Para paginaÃ§Ã£o simples, vamos retornar apenas os imÃ³veis
    // TODO: Implementar contagem total quando necessÃ¡rio
    return NextResponse.json({
      success: true,
      data: imoveis
    })

  } catch (error) {
    console.error('Erro ao listar imÃ³veis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar dados do corpo
    const body = await request.json()
    
    console.log('ðŸ” Dados recebidos na API:', JSON.stringify(body, null, 2))
    
    // Verificar dados dos Steps 3, 4 e 5
    console.log('ðŸ” Amenidades recebidas:', body.amenidades)
    console.log('ðŸ” Proximidades recebidas:', body.proximidades)
    console.log('ðŸ” Imagens recebidas:', body.imagens)
    console.log('ðŸ” Documentos recebidos:', body.documentos)
    
    // Obter usuÃ¡rio logado
    const currentUserId = getCurrentUser(request)
    console.log('ðŸ” UsuÃ¡rio atual:', currentUserId)
    console.log('ðŸ” Campos especÃ­ficos:', {
      codigo: body.codigo,
      titulo: body.titulo,
      tipo_fk: body.tipo_fk,
      finalidade_fk: body.finalidade_fk,
      status_fk: body.status_fk,
      preco: body.preco
    })
    
    if (!body.codigo || !body.titulo || !body.tipo_fk || !body.finalidade_fk) {
      console.log('âŒ ValidaÃ§Ã£o falhou - campos obrigatÃ³rios:', {
        codigo: !!body.codigo,
        titulo: !!body.titulo,
        tipo_fk: !!body.tipo_fk,
        finalidade_fk: !!body.finalidade_fk
      })
      return NextResponse.json(
        { error: 'Campos obrigatÃ³rios: codigo, titulo, tipo_fk, finalidade_fk' },
        { status: 400 }
      )
    }

    // Sempre usar status_fk = 1 (Ativo)
    body.status_fk = 1

    console.log('ðŸ” CÃ³digo recebido para validaÃ§Ã£o:', body.codigo)
    console.log('ðŸ” Regex test result:', /^[A-Z0-9_]{3,50}$/.test(body.codigo))

    // Validar formato do cÃ³digo (permitindo underscore e mais caracteres)
    if (!/^[A-Z0-9_]{3,50}$/.test(body.codigo)) {
      console.log('âŒ CÃ³digo invÃ¡lido:', body.codigo)
      return NextResponse.json(
        { error: 'CÃ³digo deve ter 3-50 caracteres alfanumÃ©ricos maiÃºsculos e underscore' },
        { status: 400 }
      )
    }

    // Validar preÃ§o se fornecido
    if (body.preco && (body.preco <= 0 || body.preco > 999999999.99)) {
      return NextResponse.json(
        { error: 'PreÃ§o deve estar entre 0 e 999.999.999,99' },
        { status: 400 }
      )
    }

    // Validar Ã¡rea se fornecida
    if (body.area_total && (body.area_total <= 0 || body.area_total > 99999.99)) {
      return NextResponse.json(
        { error: 'Ãrea total deve estar entre 0 e 99.999,99' },
        { status: 400 }
      )
    }

    // FunÃ§Ã£o para converter valores numÃ©ricos com vÃ­rgula para ponto
    const converterValorNumerico = (valor: any): number | undefined => {
      console.log('ðŸ” converterValorNumerico - valor recebido:', valor, typeof valor)
      
      if (valor === null || valor === undefined || valor === '') {
        console.log('ðŸ” converterValorNumerico - valor vazio, retornando undefined')
        return undefined
      }
      
      if (typeof valor === 'number') {
        console.log('ðŸ” converterValorNumerico - jÃ¡ Ã© nÃºmero:', valor)
        return valor
      }
      
      if (typeof valor === 'string') {
        // Converter vÃ­rgula para ponto e remover espaÃ§os
        const valorLimpo = valor.replace(/\./g, '').replace(',', '.').trim()
        const numero = parseFloat(valorLimpo)
        console.log('ðŸ” converterValorNumerico - string convertida:', valor, '->', valorLimpo, '->', numero)
        return isNaN(numero) ? undefined : numero
      }
      
      console.log('ðŸ” converterValorNumerico - tipo nÃ£o suportado:', typeof valor)
      return undefined
    }

    // FunÃ§Ã£o para converter IDs de string para number
    const converterId = (id: any): number | undefined => {
      if (id === null || id === undefined || id === '') return undefined
      if (typeof id === 'number') return id
      const numero = parseInt(String(id))
      return isNaN(numero) ? undefined : numero
    }

    // Processar dados de endereÃ§o se vier como objeto
    let dadosImovel = { ...body }
    
    // Converter valores numÃ©ricos
    console.log('ðŸ” Valores originais:', {
      preco: body.preco,
      preco_condominio: body.preco_condominio,
      preco_iptu: body.preco_iptu,
      taxa_extra: body.taxa_extra,
      area_total: body.area_total,
      area_construida: body.area_construida,
      vagas_garagem: body.vagas_garagem,
      varanda: body.varanda,
      total_andares: body.total_andares
    })
    
    // Converter IDs de string para number
    dadosImovel.tipo_fk = converterId(body.tipo_fk)
    dadosImovel.finalidade_fk = converterId(body.finalidade_fk)
    dadosImovel.status_fk = 1 // Sempre status_id = 1
    
    // Converter valores numÃ©ricos (mapeando nomes do frontend para backend)
    dadosImovel.preco = converterValorNumerico(body.preco)
    dadosImovel.preco_condominio = converterValorNumerico(body.precoCondominio)
    dadosImovel.preco_iptu = converterValorNumerico(body.precoIPTU)
    dadosImovel.taxa_extra = converterValorNumerico(body.taxaExtra)
    dadosImovel.area_total = converterValorNumerico(body.areaTotal)
    dadosImovel.area_construida = converterValorNumerico(body.areaConstruida)
    dadosImovel.vagas_garagem = converterValorNumerico(body.vagasGaragem)
    dadosImovel.varanda = converterValorNumerico(body.varanda)
    dadosImovel.total_andares = converterValorNumerico(body.totalAndares)
    
    // Definir valores padrÃ£o para campos booleanos (mapeando nomes do frontend)
    dadosImovel.mobiliado = body.mobiliado === true
    dadosImovel.aceita_permuta = body.aceita_permuta === true
    dadosImovel.aceita_financiamento = body.aceita_financiamento === true
    
    // Definir usuÃ¡rio logado
    dadosImovel.created_by = currentUserId
    dadosImovel.updated_by = currentUserId
    
    console.log('ðŸ” IDs convertidos:', {
      tipo_fk: dadosImovel.tipo_fk,
      finalidade_fk: dadosImovel.finalidade_fk,
      status_fk: dadosImovel.status_fk,
      created_by: dadosImovel.created_by,
      updated_by: dadosImovel.updated_by
    })
    
    console.log('ðŸ” Valores convertidos:', {
      preco: dadosImovel.preco,
      preco_condominio: dadosImovel.preco_condominio,
      preco_iptu: dadosImovel.preco_iptu,
      taxa_extra: dadosImovel.taxa_extra,
      area_total: dadosImovel.area_total,
      area_construida: dadosImovel.area_construida,
      vagas_garagem: dadosImovel.vagas_garagem,
      varanda: dadosImovel.varanda,
      total_andares: dadosImovel.total_andares,
      mobiliado: dadosImovel.mobiliado,
      aceita_permuta: dadosImovel.aceita_permuta,
      aceita_financiamento: dadosImovel.aceita_financiamento,
      created_by: dadosImovel.created_by,
      updated_by: dadosImovel.updated_by
    })
    
    console.log('ðŸ” Valores originais do body (frontend):', {
      preco: body.preco,
      precoCondominio: body.precoCondominio,
      precoIPTU: body.precoIPTU,
      taxaExtra: body.taxaExtra,
      areaTotal: body.areaTotal,
      areaConstruida: body.areaConstruida,
      vagasGaragem: body.vagasGaragem,
      totalAndares: body.totalAndares,
      mobiliado: body.mobiliado,
      aceita_permuta: body.aceita_permuta,
      aceita_financiamento: body.aceita_financiamento
    })
    
    if (body.endereco && typeof body.endereco === 'object') {
      // Extrair campos do objeto endereco
      dadosImovel.endereco = body.endereco.endereco || ''
      dadosImovel.numero = body.endereco.numero || ''
      dadosImovel.complemento = body.endereco.complemento || ''
      dadosImovel.bairro = body.endereco.bairro || ''
      dadosImovel.cidade_fk = body.endereco.cidade || ''
      dadosImovel.estado_fk = body.endereco.estado || ''
      dadosImovel.cep = body.endereco.cep || ''
      
      console.log('ðŸ” Campos de endereÃ§o extraÃ­dos:', {
        endereco: dadosImovel.endereco,
        numero: dadosImovel.numero,
        complemento: dadosImovel.complemento,
        bairro: dadosImovel.bairro,
        cidade_fk: dadosImovel.cidade_fk,
        estado_fk: dadosImovel.estado_fk,
        cep: dadosImovel.cep
      })
    }

    // Criar imÃ³vel
    // TODO: Implementar autenticaÃ§Ã£o real e pegar o UUID do usuÃ¡rio logado
    // Por enquanto, vamos usar NULL para created_by
    const novoImovel = await createImovel(dadosImovel, currentUserId)

    // Gerar cÃ³digo final com o ID real
    if (novoImovel && novoImovel.id) {
      try {
        // Buscar dados para gerar cÃ³digo diretamente do banco
        const pool = (await import('@/lib/database/connection')).default
        
        const [finalidadeResult, tipoResult, statusResult] = await Promise.all([
          pool.query('SELECT nome FROM finalidades_imovel WHERE id = $1', [dadosImovel.finalidade_fk]),
          pool.query('SELECT nome FROM tipos_imovel WHERE id = $1', [dadosImovel.tipo_fk]),
          pool.query('SELECT nome FROM status_imovel WHERE id = 1')
        ])
        
        const finalidade = finalidadeResult.rows[0]
        const tipo = tipoResult.rows[0]
        const status = statusResult.rows[0]
        
        if (finalidade && tipo && status) {
          const finalidadeNome = finalidade.nome || 'FINALIDADE'
          const tipoNome = tipo.nome || 'TIPO'
          const statusNome = status.nome || 'ATIVO'
          
          const codigoFinal = `${finalidadeNome}_${tipoNome}_${statusNome}_${novoImovel.id}`
            .replace(/\s+/g, '') // Remover espaÃ§os
            .replace(/[^A-Za-z0-9_]/g, '') // Manter letras (maiÃºsculas e minÃºsculas), nÃºmeros e underscore
            .toUpperCase()
          
          console.log('ðŸ” CÃ³digo final gerado:', codigoFinal)
          
          // Atualizar o cÃ³digo no banco
          const { updateImovel } = await import('@/lib/database/imoveis')
          await updateImovel(novoImovel.id, { codigo: codigoFinal }, currentUserId || 'system')
          
          // Atualizar o objeto retornado
          novoImovel.codigo = codigoFinal
        }
      } catch (error) {
        console.error('âŒ Erro ao gerar cÃ³digo final:', error)
        // Continuar mesmo com erro na geraÃ§Ã£o do cÃ³digo
      }
    }

    // Salvar documentos se existirem
    console.log('ðŸ” Verificando documentos - body.documentos:', body.documentos)
    console.log('ðŸ” Tipo de body.documentos:', typeof body.documentos)
    console.log('ðŸ” Ã‰ array?', Array.isArray(body.documentos))
    console.log('ðŸ” Length:', body.documentos?.length)
    
    if (body.documentos && Array.isArray(body.documentos) && body.documentos.length > 0) {
      try {
        console.log('ðŸ” Salvando documentos do imÃ³vel:', body.documentos.length)
        console.log('ðŸ” Documentos detalhados:', JSON.stringify(body.documentos, null, 2))
        
        // Converter arquivos para Buffer e preparar dados
        console.log('ðŸ” Processando documentos individuais...')
        const documentosParaSalvar = await Promise.all(
          body.documentos.map(async (doc: any, index: number) => {
            console.log(`ðŸ” Processando documento ${index + 1}:`, {
              tipoDocumentoId: doc.tipoDocumentoId,
              arquivo_tipo: typeof doc.arquivo,
              arquivo_isBuffer: Buffer.isBuffer(doc.arquivo),
              arquivo_isFile: doc.arquivo instanceof File,
              tipoMime: doc.tipoMime,
              tamanhoBytes: doc.tamanhoBytes
            })
            
            // Se o arquivo jÃ¡ Ã© um Buffer, usar diretamente
            if (Buffer.isBuffer(doc.arquivo)) {
              console.log(`ðŸ” Documento ${index + 1}: Usando Buffer existente`)
              return {
                tipo_documento_id: doc.tipoDocumentoId,
                arquivo: doc.arquivo,
                nome_arquivo: doc.nomeArquivo || `documento_${index + 1}`,
                tipo_mime: doc.tipoMime,
                tamanho_bytes: doc.tamanhoBytes
              }
            }
            
            // Se Ã© um File, converter para Buffer
            if (doc.arquivo instanceof File) {
              console.log(`ðŸ” Documento ${index + 1}: Convertendo File para Buffer`)
              const arrayBuffer = await doc.arquivo.arrayBuffer()
              return {
                tipo_documento_id: doc.tipoDocumentoId,
                arquivo: Buffer.from(arrayBuffer),
                nome_arquivo: doc.nomeArquivo || doc.arquivo.name || `documento_${index + 1}`,
                tipo_mime: doc.tipoMime,
                tamanho_bytes: doc.tamanhoBytes
              }
            }
            
            // Se Ã© um objeto vazio (File serializado), pular este documento
            if (typeof doc.arquivo === 'object' && Object.keys(doc.arquivo).length === 0) {
              console.log(`ðŸ” Documento ${index + 1}: Arquivo vazio (File serializado), pulando...`)
              return null // Retornar null para ser filtrado depois
            }
            
            // Se Ã© uma string base64, converter para Buffer
            if (typeof doc.arquivo === 'string') {
              console.log(`ðŸ” Documento ${index + 1}: Convertendo string base64 para Buffer`)
              // Remover o prefixo data:...;base64, se existir
              const base64Data = doc.arquivo.includes(',') ? doc.arquivo.split(',')[1] : doc.arquivo
              return {
                tipo_documento_id: doc.tipoDocumentoId,
                arquivo: Buffer.from(base64Data, 'base64'),
                nome_arquivo: doc.nomeArquivo || `documento_${index + 1}`,
                tipo_mime: doc.tipoMime,
                tamanho_bytes: doc.tamanhoBytes
              }
            }
            
            console.error(`ðŸ” Documento ${index + 1}: Formato nÃ£o suportado:`, typeof doc.arquivo)
            throw new Error('Formato de arquivo nÃ£o suportado')
          })
        )
        
        // Filtrar documentos nulos (arquivos vazios)
        const documentosValidos = documentosParaSalvar.filter(doc => doc !== null)
        console.log('ðŸ” Documentos processados para salvar:', documentosValidos.length)
        console.log('ðŸ” Documentos vÃ¡lidos:', documentosValidos.length > 0 ? 'SIM' : 'NÃƒO')
        
        if (documentosValidos.length > 0) {
          console.log('ðŸ” Chamando saveImovelDocumentos com:', {
            imovelId: novoImovel.id,
            documentosCount: documentosValidos.length,
            primeiroDocumento: documentosValidos[0]
          })
          await saveImovelDocumentos(novoImovel.id!, documentosValidos)
          console.log('âœ… Documentos salvos com sucesso')
        } else {
          console.log('âš ï¸ Nenhum documento vÃ¡lido para salvar')
        }
        
      } catch (docError) {
        console.error('âš ï¸ Erro ao salvar documentos (nÃ£o crÃ­tico):', docError)
        // NÃ£o falhar a criaÃ§Ã£o do imÃ³vel por causa dos documentos
      }

      // Salvar amenidades (sempre processar, mesmo se array vazio)
      try {
        const amenidadeIds = body.amenidades && Array.isArray(body.amenidades) 
          ? body.amenidades.map((a: any) => a.id)
          : []
        await updateImovelAmenidades(novoImovel.id!, amenidadeIds)
        console.log('âœ… Amenidades salvas com sucesso:', amenidadeIds)
      } catch (amenError) {
        console.error('âš ï¸ Erro ao salvar amenidades (nÃ£o crÃ­tico):', amenError)
      }

      // Salvar proximidades (sempre processar, mesmo se array vazio)
      try {
        const proximidadesFormatadas = body.proximidades && Array.isArray(body.proximidades) && body.proximidades.length > 0
          ? body.proximidades.map((p: any) => ({
              proximidade_id: p.id,
              distancia_metros: p.distancia ? parseFloat(p.distancia.replace(/[^0-9.]/g, '')) || null : null,
              tempo_caminhada: p.tempo_caminhada || null,
              observacoes: p.observacoes || null
            }))
          : []
        await updateImovelProximidades(novoImovel.id!, proximidadesFormatadas)
        console.log('âœ… Proximidades salvas com sucesso:', proximidadesFormatadas)
      } catch (proxError) {
        console.error('âš ï¸ Erro ao salvar proximidades (nÃ£o crÃ­tico):', proxError)
      }

      // Salvar imagens
      if (body.imagens && Array.isArray(body.imagens) && body.imagens.length > 0) {
        try {
          for (let i = 0; i < body.imagens.length; i++) {
            const imagem = body.imagens[i]
            console.log(`ðŸ” Processando imagem ${i + 1}:`, {
              id: imagem.id,
              nome: imagem.nome,
              url_type: typeof imagem.url,
              url_length: imagem.url?.length,
              ordem: imagem.ordem,
              principal: imagem.principal
            })
            
            // Converter base64 para Buffer
            let imagemBuffer: Buffer
            if (typeof imagem.url === 'string') {
              // Remover o prefixo data:image/...;base64, se existir
              const base64Data = imagem.url.includes(',') ? imagem.url.split(',')[1] : imagem.url
              imagemBuffer = Buffer.from(base64Data, 'base64')
            } else {
              console.log(`âš ï¸ Imagem ${i + 1}: Formato nÃ£o suportado, pulando...`)
              continue
            }
            
            await insertImovelImagem({
              imovelId: novoImovel.id!,
              ordem: imagem.ordem || i + 1,
              principal: imagem.principal || (i === 0), // Primeira imagem Ã© principal
              tipoMime: 'image/jpeg', // Tipo padrÃ£o, pode ser melhorado
              tamanhoBytes: imagemBuffer.length,
              imagem: imagemBuffer
            })
          }
          console.log('âœ… Imagens salvas com sucesso:', body.imagens.length)
        } catch (imgError) {
          console.error('âš ï¸ Erro ao salvar imagens (nÃ£o crÃ­tico):', imgError)
        }
      }
    }

    // Processar vÃ­deo se presente
    if (body.video && body.video.arquivo) {
      try {
        console.log('ðŸ” Processando vÃ­deo para imÃ³vel:', novoImovel.id)
        console.log('ðŸ” Dados do vÃ­deo recebidos:', {
          nomeArquivo: body.video.nomeArquivo,
          tipoMime: body.video.tipoMime,
          tamanhoBytes: body.video.tamanhoBytes,
          duracaoSegundos: body.video.duracaoSegundos,
          formato: body.video.formato
        })
        
        const videoFile = body.video.arquivo
        console.log('ðŸ” Arquivo de vÃ­deo:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        })
        
        const arrayBuffer = await videoFile.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)
        console.log('ðŸ” Buffer criado com tamanho:', videoBuffer.length)
        
        const videoData = {
          video: videoBuffer,
          nome_arquivo: body.video.nomeArquivo || videoFile.name,
          tipo_mime: body.video.tipoMime || videoFile.type,
          tamanho_bytes: body.video.tamanhoBytes || videoFile.size,
          duracao_segundos: body.video.duracaoSegundos || 30,
          resolucao: body.video.resolucao || '1920x1080',
          formato: body.video.formato || videoFile.name.split('.').pop()?.toLowerCase() || 'mp4'
        }
        
        console.log('ðŸ” Chamando saveImovelVideo com dados:', {
          imovelId: novoImovel.id,
          nome_arquivo: videoData.nome_arquivo,
          tipo_mime: videoData.tipo_mime,
          tamanho_bytes: videoData.tamanho_bytes,
          duracao_segundos: videoData.duracao_segundos,
          formato: videoData.formato
        })
        
        const videoId = await saveImovelVideo(novoImovel.id!, videoData)
        console.log('âœ… VÃ­deo salvo com sucesso, ID:', videoId)
      } catch (videoError) {
        console.error('âŒ Erro ao salvar vÃ­deo:', videoError)
        if (videoError instanceof Error) {
          console.error('âŒ Stack trace:', videoError.stack)
        }
      }
    } else {
      console.log('ðŸ” Nenhum vÃ­deo presente para processar')
    }

    return NextResponse.json({
      success: true,
      message: 'ImÃ³vel criado com sucesso',
      data: novoImovel
    }, { status: 201 })

  } catch (error: any) {
    console.error('âŒ Erro ao criar imÃ³vel:', error)
    console.error('âŒ Tipo do erro:', typeof error)
    console.error('âŒ CÃ³digo do erro:', error.code)
    console.error('âŒ Mensagem do erro:', error.message)
    console.error('âŒ Stack trace:', error.stack)
    
    // Verificar se Ã© erro de cÃ³digo duplicado
    if (error.code === '23505' && error.constraint === 'imoveis_codigo_key') {
      return NextResponse.json(
        { error: 'CÃ³digo de imÃ³vel jÃ¡ existe' },
        { status: 409 }
      )
    }

    // Retornar erro mais especÃ­fico para debug
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message || 'Erro desconhecido',
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}

