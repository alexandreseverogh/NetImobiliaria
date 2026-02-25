import { NextRequest, NextResponse } from 'next/server'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

// Aumentar o limite de tamanho para uploads (Imagens/Base64)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
import { saveImovelDocumentos } from '@/lib/database/imovel-documentos'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { updateImovelAmenidades } from '@/lib/database/amenidades'
import { updateImovelProximidades } from '@/lib/database/proximidades'
import { insertImovelImagem } from '@/lib/database/imoveis'
import { saveImovelVideo } from '@/lib/database/imovel-video'
import { buscarCoordenadasPorEnderecoCompleto } from '@/lib/utils/geocoding'
import { safeParseInt, safeParseFloat } from '@/lib/utils/safeParser'

// Função para extrair usuário logado
function getCurrentUserPayload(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

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
    return decoded
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

export async function GET(request: NextRequest) {
  console.log('🔍 API GET /api/admin/imoveis - INICIADA')
  console.log('🔍 URL completa:', request.url)
  try {
    // Extrair parâmetros da query
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    console.log('🔍 API - Parâmetros recebidos:', { page, limit })
    console.log('🔍 API - Todos os searchParams:', Object.fromEntries(searchParams.entries()))

    // Debug individual de cada filtro
    console.log('🔍 API - Debug filtros individuais:')
    console.log('  - codigo:', searchParams.get('codigo'), 'válido:', !!(searchParams.get('codigo') && searchParams.get('codigo') !== ''))
    console.log('  - bairro:', searchParams.get('bairro'), 'válido:', !!(searchParams.get('bairro') && searchParams.get('bairro') !== ''))
    console.log('  - estado:', searchParams.get('estado'), 'válido:', !!(searchParams.get('estado') && searchParams.get('estado') !== ''))
    console.log('  - municipio:', searchParams.get('municipio'), 'válido:', !!(searchParams.get('municipio') && searchParams.get('municipio') !== ''))
    console.log('  - tipo:', searchParams.get('tipo'), 'válido:', !!(searchParams.get('tipo') && searchParams.get('tipo') !== ''))
    console.log('  - finalidade:', searchParams.get('finalidade'), 'válido:', !!(searchParams.get('finalidade') && searchParams.get('finalidade') !== ''))
    console.log('  - status:', searchParams.get('status'), 'válido:', !!(searchParams.get('status') && searchParams.get('status') !== ''))
    console.log('  - corretor:', searchParams.get('corretor'), 'válido:', !!(searchParams.get('corretor') && searchParams.get('corretor') !== ''))
    console.log('  - proprietario_uuid:', searchParams.get('proprietario_uuid'), 'válido:', !!(searchParams.get('proprietario_uuid') && searchParams.get('proprietario_uuid') !== ''))

    // Verificar se há filtros com valores válidos (não vazios)
    const hasFilters = (searchParams.get('codigo') && searchParams.get('codigo') !== '') ||
      (searchParams.get('bairro') && searchParams.get('bairro') !== '') ||
      (searchParams.get('estado') && searchParams.get('estado') !== '') ||
      (searchParams.get('municipio') && searchParams.get('municipio') !== '') ||
      (searchParams.get('tipo') && searchParams.get('tipo') !== '') ||
      (searchParams.get('finalidade') && searchParams.get('finalidade') !== '') ||
      (searchParams.get('status') && searchParams.get('status') !== '') ||
      (searchParams.get('corretor') && searchParams.get('corretor') !== '') ||
      (searchParams.get('proprietario_uuid') && searchParams.get('proprietario_uuid') !== '')

    console.log('🔍 API - hasFilters:', hasFilters)
    console.log('🔍 API - page:', page, 'limit:', limit)

    // Se não houver parâmetros de paginação nem filtros, retornar todos os imóveis
    if (!page && !limit && !hasFilters) {
      console.log('🔍 API - Buscando todos os imóveis...')
      const imoveis = await findAllImoveis()
      console.log('🔍 API - Imóveis encontrados:', imoveis.length)
      return NextResponse.json({
        success: true,
        data: imoveis
      })
    }

    // Caso contrário, usar paginação
    const pageNum = safeParseInt(page, 1, 1)
    const limitNum = safeParseInt(limit, 20, 1, 100)
    const offset = (pageNum - 1) * limitNum

    // Filtros
    const filtros: any = {}

    // Filtros do frontend - usando os campos corretos do banco
    if (searchParams.get('codigo')) {
      filtros.id = safeParseInt(searchParams.get('codigo'), 0, 1)
    }

    if (searchParams.get('bairro')) {
      filtros.bairro = searchParams.get('bairro')
    }

    if (searchParams.get('estado')) {
      // Frontend agora envia SIGLA do estado (ex: "PE")
      // NÃO tentar converter para Int
      const estadoSigla = searchParams.get('estado')
      filtros.estado_sigla = estadoSigla
      console.log('🔍 Estado filtro - Sigla recebida:', filtros.estado_sigla)
    }

    if (searchParams.get('municipio')) {
      // Frontend envia NOME da cidade (ex: "Recife")
      // NÃO tentar converter para Int
      filtros.cidade_nome = searchParams.get('municipio')
      console.log('🔍 Municipio filtro - Nome recebido:', filtros.cidade_nome)
    }

    if (searchParams.get('tipo')) {
      // Frontend envia ID do tipo
      filtros.tipo_fk = safeParseInt(searchParams.get('tipo'), 0, 1)
    }

    if (searchParams.get('finalidade')) {
      // Frontend envia ID da finalidade
      filtros.finalidade_fk = safeParseInt(searchParams.get('finalidade'), 0, 1)
    }

    if (searchParams.get('status')) {
      // Frontend envia ID do status
      // Tratar casos onde pode vir formato "99:1" (extrair apenas o número)
      const statusValue = searchParams.get('status')!
      const statusId = parseInt(statusValue.split(':')[0]) // Pegar apenas a parte antes do ":"
      if (!isNaN(statusId)) {
        filtros.status_fk = statusId
        console.log('🔍 Status filtro - valor recebido:', statusValue, 'convertido para:', statusId)
      } else {
        console.warn('⚠️ Status filtro inválido:', statusValue)
      }
    }

    // Filtro de corretor
    if (searchParams.get('corretor')) {
      filtros.corretor_fk = safeParseInt(searchParams.get('corretor'), 0, 1)
      console.log('🔍 Corretor filtro - ID recebido:', filtros.corretor_fk)
    }

    // Filtro de proprietário
    if (searchParams.get('proprietario_uuid')) {
      filtros.proprietario_uuid = searchParams.get('proprietario_uuid')
      console.log('🔍 Proprietário filtro - UUID recebido:', filtros.proprietario_uuid)
    }

    // Filtros legados (manter compatibilidade)
    if (searchParams.get('tipo_id')) {
      filtros.tipo_id = safeParseInt(searchParams.get('tipo_id'), 0, 1)
    }

    if (searchParams.get('status_id')) {
      filtros.status_id = safeParseInt(searchParams.get('status_id'), 0, 1)
    }

    if (searchParams.get('preco_min')) {
      filtros.preco_min = safeParseFloat(searchParams.get('preco_min'), 0, 0)
    }

    if (searchParams.get('preco_max')) {
      filtros.preco_max = safeParseFloat(searchParams.get('preco_max'), 0, 0)
    }

    if (searchParams.get('quartos_min')) {
      filtros.quartos_min = safeParseInt(searchParams.get('quartos_min'), 0, 0)
    }

    if (searchParams.get('area_min')) {
      filtros.area_min = safeParseFloat(searchParams.get('area_min'), 0, 0)
    }

    if (searchParams.get('cidade')) {
      filtros.cidade = searchParams.get('cidade')
    }

    if (searchParams.get('destaque') !== null) {
      filtros.destaque = searchParams.get('destaque') === 'true'
    }

    if (searchParams.get('corretor')) {
      filtros.corretor_id = searchParams.get('corretor')
    }

    console.log('🔍 API - Filtros processados:', filtros)

    // Buscar imóveis
    const imoveis = await listImoveis(filtros, limitNum, offset)

    // Para paginação simples, vamos retornar apenas os imóveis
    // TODO: Implementar contagem total quando necessário
    return NextResponse.json({
      success: true,
      data: imoveis
    })

  } catch (error) {
    console.error('❌ Erro ao listar imóveis:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')

    const errorLog = `
=== ERROR ${new Date().toISOString()} ===
Message: ${error instanceof Error ? error.message : String(error)}
Stack: ${error instanceof Error ? error.stack : 'N/A'}
URL: ${request.url}
===================================

`
    try {
      const fs = require('fs')
      fs.appendFileSync('C:/NetImobiliária/net-imobiliaria/debug_crash.txt', errorLog)
    } catch (e) {
      console.error('Error writing log:', e)
    }

    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar dados do corpo
    const body = await request.json()

    // Detectar origem do cadastro (público ou admin)
    // Verificar se o body contém uma flag de origem pública ou se vem do referer público
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    const isPublicAccess =
      body.origemPublica === true ||
      referer.includes('/landpaging') ||
      origin.includes('/landpaging') ||
      referer.includes('noSidebar=true')
    const origemCadastro = isPublicAccess ? 'Publico' : 'Admin'

    console.log('🔍 Dados recebidos na API:', JSON.stringify(body, null, 2))
    console.log('🔍 Origem do cadastro detectada:', origemCadastro, {
      origemPublica: body.origemPublica,
      referer,
      origin,
      isPublicAccess
    })

    // Verificar dados dos Steps 3, 4 e 5
    console.log('🔍 Amenidades recebidas:', body.amenidades)
    console.log('🔍 Proximidades recebidas:', body.proximidades)
    console.log('🔍 Imagens recebidas:', body.imagens)
    console.log('🔍 Documentos recebidos:', body.documentos)

    // Obter usuário logado
    const currentUser = getCurrentUserPayload(request)
    const currentUserId = (currentUser as any)?.userId || null
    // Tokens do sistema podem trazer cargo OU role_name (ex.: login do corretor).
    const currentUserRoleName = String(
      (currentUser as any)?.role_name || (currentUser as any)?.cargo || ''
    ).toLowerCase()
    console.log('🔍 Usuário atual:', currentUserId)
    console.log('🔍 Campos específicos:', {
      codigo: body.codigo,
      titulo: body.titulo,
      tipo_fk: body.tipo_fk,
      finalidade_fk: body.finalidade_fk,
      status_fk: body.status_fk,
      preco: body.preco
    })

    if (!body.codigo || !body.titulo || !body.tipo_fk || !body.finalidade_fk) {
      console.log('❌ Validação falhou - campos obrigatórios:', {
        codigo: !!body.codigo,
        titulo: !!body.titulo,
        tipo_fk: !!body.tipo_fk,
        finalidade_fk: !!body.finalidade_fk
      })
      return NextResponse.json(
        { error: 'Campos obrigatórios: codigo, titulo, tipo_fk, finalidade_fk' },
        { status: 400 }
      )
    }

    // Validar proprietario_uuid - não pode ser null ou undefined
    if (!body.proprietario_uuid || body.proprietario_uuid === null || body.proprietario_uuid === undefined || body.proprietario_uuid === '') {
      console.log('❌ Validação falhou - proprietario_uuid obrigatório:', {
        proprietario_uuid: body.proprietario_uuid,
        tipo: typeof body.proprietario_uuid
      })
      return NextResponse.json(
        {
          error: 'Campo obrigatório: proprietario_uuid. É necessário selecionar um proprietário para o imóvel.',
          details: 'O campo proprietario_uuid não pode ser nulo ou vazio',
          code: 'PROPRIETARIO_REQUIRED'
        },
        { status: 400 }
      )
    }

    // Fluxo do portal do corretor: o proprietário selecionado DEVE pertencer ao corretor logado.
    try {
      const fromCorretorPortal = body.fromCorretorPortal === true
      const isCorretor = currentUserRoleName.includes('corretor')
      if (fromCorretorPortal && isCorretor && currentUserId) {
        const pool = (await import('@/lib/database/connection')).default
        const check = await pool.query(
          `SELECT 1 FROM public.proprietarios WHERE uuid = $1::uuid AND corretor_fk = $2::uuid LIMIT 1;`,
          [body.proprietario_uuid, currentUserId]
        )
        if (check.rows.length === 0) {
          return NextResponse.json(
            { error: 'Proprietário não pertence ao corretor logado' },
            { status: 403 }
          )
        }
      }
    } catch (e) {
      console.error('❌ Erro ao validar proprietário do corretor:', e)
      return NextResponse.json(
        { error: 'Erro ao validar proprietário do corretor' },
        { status: 500 }
      )
    }

    // Definir status baseado na origem do cadastro
    // Status 99 = Em Analise (cadastro público)
    // Status 1 = Ativo (cadastro admin)
    if (isPublicAccess) {
      body.status_fk = 99
      console.log('🔍 Status definido para cadastro público: status_fk = 99 (Em Analise)')
    } else {
      body.status_fk = 1
      console.log('🔍 Status definido para cadastro admin: status_fk = 1 (Ativo)')
    }

    console.log('🔍 Código recebido para validação:', body.codigo)
    console.log('🔍 Regex test result:', /^[A-Z0-9_]{3,50}$/.test(body.codigo))

    // Validar formato do código (permitindo underscore e mais caracteres)
    if (!/^[A-Z0-9_]{3,50}$/.test(body.codigo)) {
      console.log('❌ Código inválido:', body.codigo)
      return NextResponse.json(
        { error: 'Código deve ter 3-50 caracteres alfanuméricos maiúsculos e underscore' },
        { status: 400 }
      )
    }

    // Validar preço se fornecido
    if (body.preco && (body.preco <= 0 || body.preco > 999999999.99)) {
      return NextResponse.json(
        { error: 'Preço deve estar entre 0 e 999.999.999,99' },
        { status: 400 }
      )
    }

    // Validar área se fornecida
    if (body.area_total && (body.area_total <= 0 || body.area_total > 99999.99)) {
      return NextResponse.json(
        { error: 'Área total deve estar entre 0 e 99.999,99' },
        { status: 400 }
      )
    }

    // Função para converter valores numéricos com vírgula para ponto
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
        // Converter vírgula para ponto e remover espaços
        const valorLimpo = valor.replace(/\./g, '').replace(',', '.').trim()
        const numero = parseFloat(valorLimpo)
        console.log('🔍 converterValorNumerico - string convertida:', valor, '->', valorLimpo, '->', numero)
        return isNaN(numero) ? undefined : numero
      }

      console.log('🔍 converterValorNumerico - tipo não suportado:', typeof valor)
      return undefined
    }

    // Função para converter IDs de string para number
    const converterId = (id: any): number | undefined => {
      if (id === null || id === undefined || id === '') return undefined
      if (typeof id === 'number') return id
      const numero = parseInt(String(id))
      return isNaN(numero) ? undefined : numero
    }

    // Processar dados de endereço se vier como objeto
    let dadosImovel = { ...body }

    // Converter valores numéricos
    console.log('🔍 Valores originais:', {
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
    // Status já foi definido acima baseado em isPublicAccess
    // Garantir consistência (não sobrescrever se já foi definido)
    if (!dadosImovel.status_fk) {
      dadosImovel.status_fk = isPublicAccess ? 99 : 1
    }
    console.log('🔍 Status final para inserção:', dadosImovel.status_fk, 'Origem:', origemCadastro)

    // Converter valores numéricos (mapeando nomes do frontend para backend)
    dadosImovel.preco = converterValorNumerico(body.preco)
    dadosImovel.preco_condominio = converterValorNumerico(body.precoCondominio)
    dadosImovel.preco_iptu = converterValorNumerico(body.precoIPTU)
    dadosImovel.taxa_extra = converterValorNumerico(body.taxaExtra)
    dadosImovel.area_total = converterValorNumerico(body.areaTotal)
    dadosImovel.area_construida = converterValorNumerico(body.areaConstruida)
    dadosImovel.vagas_garagem = converterValorNumerico(body.vagasGaragem)
    dadosImovel.varanda = converterValorNumerico(body.varanda)
    dadosImovel.total_andares = converterValorNumerico(body.totalAndares)

    // Definir valores padrão para campos booleanos (mapeando nomes do frontend)
    dadosImovel.mobiliado = body.mobiliado === true
    dadosImovel.aceita_permuta = body.aceitaPermuta === true || body.aceita_permuta === true
    dadosImovel.aceita_financiamento = body.aceitaFinanciamento === true || body.aceita_financiamento === true

    // Definir usuário logado e origem do cadastro
    // Se o usuário for um proprietário (não está na tabela 'users'), created_by e updated_by devem ser null,
    // pois a FK aponta para 'users'. O vínculo com proprietário é feito via 'proprietario_uuid'.
    const isOwner = currentUserRoleName.includes('proprietário') ||
      currentUserRoleName.includes('proprietario') ||
      (currentUser as any)?.userType === 'proprietario'

    dadosImovel.created_by = isOwner ? null : currentUserId
    dadosImovel.updated_by = isOwner ? null : currentUserId
    dadosImovel.origem_cadastro = origemCadastro

    // Fluxo do portal do corretor: garantir corretor_fk = corretor logado (e impedir spoof via body)
    try {
      const fromCorretorPortal = body.fromCorretorPortal === true
      const isCorretor = currentUserRoleName.includes('corretor')
      if (fromCorretorPortal && isCorretor && currentUserId) {
        dadosImovel.corretor_fk = currentUserId
      } else {
        // No fluxo padrão, não confiar em corretor_fk vindo do frontend
        // (se um dia admin puder setar manualmente, isso deve ser implementado com permissão explícita).
        if ('corretor_fk' in dadosImovel) {
          delete (dadosImovel as any).corretor_fk
        }
      }
    } catch {
      // não bloquear criação por esse motivo
    }

    console.log('🔍 IDs convertidos:', {
      tipo_fk: dadosImovel.tipo_fk,
      finalidade_fk: dadosImovel.finalidade_fk,
      status_fk: dadosImovel.status_fk,
      created_by: dadosImovel.created_by,
      updated_by: dadosImovel.updated_by
    })

    console.log('🔍 Valores convertidos:', {
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
      lancamento: dadosImovel.lancamento,
      created_by: dadosImovel.created_by,
      updated_by: dadosImovel.updated_by
    })

    console.log('🔍 Valores originais do body (frontend):', {
      preco: body.preco,
      precoCondominio: body.precoCondominio,
      precoIPTU: body.precoIPTU,
      taxaExtra: body.taxaExtra,
      areaTotal: body.areaTotal,
      areaConstruida: body.areaConstruida,
      vagasGaragem: body.vagasGaragem,
      totalAndares: body.totalAndares,
      mobiliado: body.mobiliado,
      aceitaPermuta: body.aceitaPermuta,
      aceitaFinanciamento: body.aceitaFinanciamento,
      lancamento: body.lancamento
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

      console.log('🔍 Campos de endereço extraídos:', {
        endereco: dadosImovel.endereco,
        numero: dadosImovel.numero,
        complemento: dadosImovel.complemento,
        bairro: dadosImovel.bairro,
        cidade_fk: dadosImovel.cidade_fk,
        estado_fk: dadosImovel.estado_fk,
        cep: dadosImovel.cep
      })
    }

    // Buscar coordenadas geográficas se endereço completo estiver disponível
    // IMPORTANTE: Número é OBRIGATÓRIO para precisão na localização
    if (dadosImovel.cep && dadosImovel.endereco && dadosImovel.numero && dadosImovel.cidade_fk && dadosImovel.estado_fk) {
      try {
        console.log('🔍 Buscando coordenadas geográficas para o endereço completo')
        console.log('🔍 Dados:', {
          endereco: dadosImovel.endereco,
          numero: dadosImovel.numero,
          bairro: dadosImovel.bairro,
          cidade: dadosImovel.cidade_fk,
          estado: dadosImovel.estado_fk,
          cep: dadosImovel.cep
        })

        const coordenadas = await buscarCoordenadasPorEnderecoCompleto(
          dadosImovel.endereco,
          dadosImovel.numero, // OBRIGATÓRIO
          dadosImovel.complemento || '',
          dadosImovel.bairro || '',
          dadosImovel.cidade_fk,
          dadosImovel.estado_fk,
          dadosImovel.cep
        )

        if (coordenadas) {
          dadosImovel.latitude = coordenadas.lat
          dadosImovel.longitude = coordenadas.lon
          console.log('✅ Coordenadas encontradas com endereço completo:', coordenadas)
        } else {
          console.log('⚠️ Coordenadas não encontradas, salvando sem coordenadas')
        }
      } catch (error) {
        console.error('❌ Erro ao buscar coordenadas:', error)
        // Continua sem coordenadas em caso de erro
      }
    } else {
      console.log('⚠️ Dados de endereço incompletos para buscar coordenadas')
      console.log('⚠️ Verificar:', {
        temCep: !!dadosImovel.cep,
        temEndereco: !!dadosImovel.endereco,
        temNumero: !!dadosImovel.numero,
        temCidade: !!dadosImovel.cidade_fk,
        temEstado: !!dadosImovel.estado_fk
      })
    }

    // Gerar código temporário para criação do imóvel (será substituído após obtenção do ID real)
    const codigoTemp = `TEMP_${Date.now()}`
    dadosImovel.codigo = codigoTemp

    // Criar imóvel
    // TODO: Implementar autenticação real e pegar o UUID do usuário logado
    // Por enquanto, vamos usar NULL para created_by se for proprietário
    const novoImovel = await createImovel(dadosImovel, isOwner ? null : currentUserId)

    // Registrar vínculo imovel_corretor SOMENTE quando o cadastro foi iniciado via portal do corretor
    // e o usuário logado for de fato um corretor.
    try {
      const fromCorretorPortal = body.fromCorretorPortal === true
      const isCorretor = currentUserRoleName.includes('corretor')
      if (fromCorretorPortal && isCorretor && currentUserId && novoImovel?.id) {
        const pool = (await import('@/lib/database/connection')).default
        await pool.query(
          `
            INSERT INTO public.imovel_corretor (imovel_fk, corretor_fk, created_by)
            VALUES ($1, $2::uuid, $3::uuid)
            ON CONFLICT (imovel_fk, corretor_fk) DO NOTHING
          `,
          [novoImovel.id, currentUserId, currentUserId]
        )
      }
    } catch (e) {
      // Não quebrar o cadastro do imóvel por falha no vínculo (observabilidade via log)
      console.error('❌ Erro ao registrar vínculo em imovel_corretor:', e)
    }

    // Gerar código final com o ID real
    if (novoImovel && novoImovel.id) {
      try {
        // Buscar dados para gerar código diretamente do banco
        const pool = (await import('@/lib/database/connection')).default

        const [finalidadeResult, tipoResult] = await Promise.all([
          pool.query('SELECT nome FROM finalidades_imovel WHERE id = $1', [dadosImovel.finalidade_fk]),
          pool.query('SELECT nome FROM tipos_imovel WHERE id = $1', [dadosImovel.tipo_fk])
        ])

        const finalidade = finalidadeResult.rows[0]
        const tipo = tipoResult.rows[0]

        if (finalidade && tipo) {
          const finalidadeNome = finalidade.nome || 'FINALIDADE'
          const tipoNome = tipo.nome || 'TIPO'

          // Gerar código no formato: TIPO_IMOVEL_FINALIDADE_ID
          const codigoFinal = `${tipoNome}_${finalidadeNome}_${novoImovel.id}`
            .replace(/\s+/g, '') // Remover espaços
            .replace(/[^A-Za-z0-9_]/g, '') // Manter letras (maiúsculas e minúsculas), números e underscore
            .toUpperCase()

          console.log('🔍 Código final gerado:', codigoFinal)
          console.log('🔍 Componentes:', { tipoNome, finalidadeNome, id: novoImovel.id })

          // Atualizar o código diretamente no banco usando UPDATE SQL
          const pool = (await import('@/lib/database/connection')).default
          await pool.query(
            'UPDATE imoveis SET codigo = $1, updated_at = NOW() WHERE id = $2',
            [codigoFinal, novoImovel.id]
          )

          console.log('✅ Código atualizado no banco de dados')

          // Atualizar o objeto retornado
          novoImovel.codigo = codigoFinal
        }
      } catch (error) {
        console.error('❌ Erro ao gerar código final:', error)
        // Continuar mesmo com erro na geração do código
      }
    }

    // Salvar documentos se existirem
    console.log('🔍 Verificando documentos - body.documentos:', body.documentos)
    console.log('🔍 Tipo de body.documentos:', typeof body.documentos)
    console.log('🔍 É array?', Array.isArray(body.documentos))
    console.log('🔍 Length:', body.documentos?.length)

    if (body.documentos && Array.isArray(body.documentos) && body.documentos.length > 0) {
      try {
        console.log('🔍 Salvando documentos do imóvel:', body.documentos.length)
        console.log('🔍 Documentos detalhados:', JSON.stringify(body.documentos, null, 2))

        // Converter arquivos para Buffer e preparar dados
        console.log('🔍 Processando documentos individuais...')
        const documentosParaSalvar = await Promise.all(
          body.documentos.map(async (doc: any, index: number) => {
            console.log(`🔍 Processando documento ${index + 1}:`, {
              tipoDocumentoId: doc.tipoDocumentoId,
              arquivo_tipo: typeof doc.arquivo,
              arquivo_isBuffer: Buffer.isBuffer(doc.arquivo),
              arquivo_isFile: doc.arquivo instanceof File,
              tipoMime: doc.tipoMime,
              tamanhoBytes: doc.tamanhoBytes
            })

            // Se o arquivo já é um Buffer, usar diretamente
            if (Buffer.isBuffer(doc.arquivo)) {
              console.log(`🔍 Documento ${index + 1}: Usando Buffer existente`)
              return {
                tipo_documento_id: doc.tipoDocumentoId,
                arquivo: doc.arquivo,
                nome_arquivo: doc.nomeArquivo || `documento_${index + 1}`,
                tipo_mime: doc.tipoMime,
                tamanho_bytes: doc.tamanhoBytes
              }
            }

            // Se é um File, converter para Buffer
            if (doc.arquivo instanceof File) {
              console.log(`🔍 Documento ${index + 1}: Convertendo File para Buffer`)
              const arrayBuffer = await doc.arquivo.arrayBuffer()
              return {
                tipo_documento_id: doc.tipoDocumentoId,
                arquivo: Buffer.from(arrayBuffer),
                nome_arquivo: doc.nomeArquivo || doc.arquivo.name || `documento_${index + 1}`,
                tipo_mime: doc.tipoMime,
                tamanho_bytes: doc.tamanhoBytes
              }
            }

            // Se é um objeto vazio (File serializado), pular este documento
            if (typeof doc.arquivo === 'object' && Object.keys(doc.arquivo).length === 0) {
              console.log(`🔍 Documento ${index + 1}: Arquivo vazio (File serializado), pulando...`)
              return null // Retornar null para ser filtrado depois
            }

            // Se é uma string base64, converter para Buffer
            if (typeof doc.arquivo === 'string') {
              console.log(`🔍 Documento ${index + 1}: Convertendo string base64 para Buffer`)
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

            console.error(`🔍 Documento ${index + 1}: Formato não suportado:`, typeof doc.arquivo)
            throw new Error('Formato de arquivo não suportado')
          })
        )

        // Filtrar documentos nulos (arquivos vazios)
        const documentosValidos = documentosParaSalvar.filter(doc => doc !== null)
        console.log('🔍 Documentos processados para salvar:', documentosValidos.length)
        console.log('🔍 Documentos válidos:', documentosValidos.length > 0 ? 'SIM' : 'NÃO')

        if (documentosValidos.length > 0) {
          console.log('🔍 Chamando saveImovelDocumentos com:', {
            imovelId: novoImovel.id,
            documentosCount: documentosValidos.length,
            primeiroDocumento: documentosValidos[0]
          })
          await saveImovelDocumentos(novoImovel.id!, documentosValidos)
          console.log('✅ Documentos salvos com sucesso')
        } else {
          console.log('⚠️ Nenhum documento válido para salvar')
        }

      } catch (docError) {
        console.error('⚠️ Erro ao salvar documentos (não crítico):', docError)
        // Não falhar a criação do imóvel por causa dos documentos
      }
    }

    // Salvar amenidades (sempre processar, mesmo se array vazio) - MOVIDO PARA FORA
    if (novoImovel && novoImovel.id) {
      try {
        const amenidadeIds = body.amenidades && Array.isArray(body.amenidades)
          ? body.amenidades
            .map((a: any) => {
              const rawId = a?.amenidadeId ?? a?.amenidade_id ?? a?.id
              if (rawId === undefined || rawId === null) {
                console.warn('⚠️ POST /imoveis - Amenidade sem ID válido será ignorada:', a)
                return null
              }

              const parsedId = typeof rawId === 'number' ? rawId : parseInt(rawId, 10)
              if (Number.isNaN(parsedId)) {
                console.warn('⚠️ POST /imoveis - Amenidade com ID não numérico será ignorada:', rawId, a)
                return null
              }

              return parsedId
            })
            .filter((id: number | null): id is number => id !== null)
            .filter((id: number, index: number, array: number[]) => array.indexOf(id) === index)
          : []
        await updateImovelAmenidades(novoImovel.id!, amenidadeIds)
        console.log('✅ Amenidades salvas com sucesso:', amenidadeIds)
      } catch (amenError) {
        console.error('⚠️ Erro ao salvar amenidades (não crítico):', amenError)
      }

      // Salvar proximidades (sempre processar, mesmo se array vazio) - MOVIDO PARA FORA
      try {
        console.log('🔍 API - Processando proximidades:', {
          temProximidades: !!body.proximidades,
          tipo: typeof body.proximidades,
          isArray: Array.isArray(body.proximidades),
          length: body.proximidades?.length,
          proximidades: body.proximidades
        })

        const proximidadesFormatadas = body.proximidades && Array.isArray(body.proximidades) && body.proximidades.length > 0
          ? body.proximidades.map((p: any) => {
            console.log('🔍 API - Processando proximidade:', p)
            return {
              proximidade_id: p.id ?? p.proximidade_id,
              distancia_metros: parseDistanceValue(p.distancia_metros ?? p.distancia),
              tempo_caminhada: p.tempo_caminhada || null,
              observacoes: p.observacoes || null
            }
          })
          : []

        console.log('🔍 API - Proximidades formatadas:', proximidadesFormatadas)
        await updateImovelProximidades(novoImovel.id!, proximidadesFormatadas)
        console.log('✅ Proximidades salvas com sucesso:', proximidadesFormatadas)
      } catch (proxError) {
        console.error('⚠️ Erro ao salvar proximidades (não crítico):', proxError)
        if (proxError instanceof Error) {
          console.error('⚠️ Stack trace:', proxError.stack)
        }
      }

      // Salvar imagens (MOVIDO PARA FORA - sempre executar se imóvel foi criado)
      console.log('🔍 API - CHECKPOINT IMAGENS:', {
        tem_body_imagens: !!body.imagens,
        tipo: typeof body.imagens,
        isArray: Array.isArray(body.imagens),
        length: body.imagens?.length,
        imagens: body.imagens
      })

      if (body.imagens && Array.isArray(body.imagens) && body.imagens.length > 0) {
        console.log('✅ API - ENTRANDO no bloco de salvamento de imagens')
        try {
          for (let i = 0; i < body.imagens.length; i++) {
            const imagem = body.imagens[i]
            console.log(`🔍 Processando imagem ${i + 1}:`, {
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
              console.log(`⚠️ Imagem ${i + 1}: Formato não suportado, pulando...`)
              continue
            }

            await insertImovelImagem({
              imovelId: novoImovel.id!,
              ordem: imagem.ordem || i + 1,
              principal: imagem.principal || (i === 0), // Primeira imagem é principal
              tipoMime: 'image/jpeg', // Tipo padrão, pode ser melhorado
              tamanhoBytes: imagemBuffer.length,
              imagem: imagemBuffer
            })
          }
          console.log('✅ Imagens salvas com sucesso:', body.imagens.length)
        } catch (imgError) {
          console.error('⚠️ Erro ao salvar imagens (não crítico):', imgError)
        }
      } else {
        console.log('⚠️ API - NÃO entrou no bloco de imagens - condição falhou')
      }
    }

    // Processar vídeo se presente - MOVIDO PARA FORA
    if (novoImovel && novoImovel.id && body.video && body.video.arquivo) {
      try {
        console.log('🔍 Processando vídeo para imóvel:', novoImovel.id)
        console.log('🔍 Dados do vídeo recebidos:', {
          nomeArquivo: body.video.nomeArquivo,
          tipoMime: body.video.tipoMime,
          tamanhoBytes: body.video.tamanhoBytes,
          duracaoSegundos: body.video.duracaoSegundos,
          formato: body.video.formato,
          arquivoType: typeof body.video.arquivo,
          arquivoIsString: typeof body.video.arquivo === 'string'
        })

        let videoBuffer: Buffer

        // Verificar se o arquivo é uma string base64 ou um File object
        if (typeof body.video.arquivo === 'string') {
          // É uma string base64 (data:video/...;base64,... ou apenas base64)
          console.log('🔍 Arquivo de vídeo é base64 string')
          const base64Data = body.video.arquivo.includes(',')
            ? body.video.arquivo.split(',')[1]
            : body.video.arquivo
          videoBuffer = Buffer.from(base64Data, 'base64')
          console.log('🔍 Buffer criado a partir de base64 com tamanho:', videoBuffer.length)
        } else if (body.video.arquivo instanceof File || (body.video.arquivo && typeof body.video.arquivo.arrayBuffer === 'function')) {
          // É um File object (raro, mas possível em alguns casos)
          console.log('🔍 Arquivo de vídeo é File object')
          const videoFile = body.video.arquivo as File
          console.log('🔍 Arquivo de vídeo:', {
            name: videoFile.name,
            size: videoFile.size,
            type: videoFile.type
          })
          const arrayBuffer = await videoFile.arrayBuffer()
          videoBuffer = Buffer.from(arrayBuffer)
          console.log('🔍 Buffer criado a partir de File com tamanho:', videoBuffer.length)
        } else {
          throw new Error('Formato de arquivo de vídeo não suportado')
        }

        const videoData = {
          video: videoBuffer,
          nome_arquivo: body.video.nomeArquivo || (typeof body.video.arquivo === 'string' ? 'video.mp4' : (body.video.arquivo as File)?.name || 'video.mp4'),
          tipo_mime: body.video.tipoMime || (typeof body.video.arquivo === 'string' ? 'video/mp4' : (body.video.arquivo as File)?.type || 'video/mp4'),
          tamanho_bytes: body.video.tamanhoBytes || videoBuffer.length,
          duracao_segundos: body.video.duracaoSegundos || 30,
          resolucao: body.video.resolucao || '1920x1080',
          formato: body.video.formato || (typeof body.video.arquivo === 'string' ? 'mp4' : (body.video.arquivo as File)?.name.split('.').pop()?.toLowerCase() || 'mp4')
        }

        console.log('🔍 Chamando saveImovelVideo com dados:', {
          imovelId: novoImovel.id,
          nome_arquivo: videoData.nome_arquivo,
          tipo_mime: videoData.tipo_mime,
          tamanho_bytes: videoData.tamanho_bytes,
          duracao_segundos: videoData.duracao_segundos,
          formato: videoData.formato
        })

        const videoId = await saveImovelVideo(novoImovel.id!, videoData)
        console.log('✅ Vídeo salvo com sucesso, ID:', videoId)
      } catch (videoError) {
        console.error('❌ Erro ao salvar vídeo:', videoError)
        if (videoError instanceof Error) {
          console.error('❌ Stack trace:', videoError.stack)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Imóvel criado com sucesso',
      data: novoImovel
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Erro ao criar imóvel:', error)
    console.error('❌ Tipo do erro:', typeof error)
    console.error('❌ Código do erro:', error.code)
    console.error('❌ Mensagem do erro:', error.message)
    console.error('❌ Stack trace:', error.stack)

    // Verificar se é erro de código duplicado
    if (error.code === '23505' && error.constraint === 'imoveis_codigo_key') {
      return NextResponse.json(
        { error: 'Código de imóvel já existe' },
        { status: 409 }
      )
    }

    // Retornar erro mais específico para debug
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
