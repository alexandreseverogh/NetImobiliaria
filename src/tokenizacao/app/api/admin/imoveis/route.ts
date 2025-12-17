import { NextRequest, NextResponse } from 'next/server'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
import { saveImovelDocumentos } from '@/lib/database/imovel-documentos'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { updateImovelAmenidades } from '@/lib/database/amenidades'
import { updateImovelProximidades } from '@/lib/database/proximidades'
import { insertImovelImagem } from '@/lib/database/imoveis'
import { saveImovelVideo } from '@/lib/database/imovel-video'

// Função para extrair usuário logado
function getCurrentUser(request: NextRequest): string | null {
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
    return decoded.userId
  } catch (error) {
    console.error('🔍 Erro ao extrair usuário:', error)
    return null
  }
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
    
    // Verificar se há filtros com valores válidos (não vazios)
    const hasFilters = (searchParams.get('codigo') && searchParams.get('codigo') !== '') || 
                      (searchParams.get('bairro') && searchParams.get('bairro') !== '') || 
                      (searchParams.get('estado') && searchParams.get('estado') !== '') || 
                      (searchParams.get('municipio') && searchParams.get('municipio') !== '') || 
                      (searchParams.get('tipo') && searchParams.get('tipo') !== '') || 
                      (searchParams.get('finalidade') && searchParams.get('finalidade') !== '') || 
                      (searchParams.get('status') && searchParams.get('status') !== '')

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
        console.log('🔍 Estado filtro - ID recebido:', estadoId, 'Sigla convertida:', filtros.estado_sigla)
        console.log('🔍 Mapeamento completo:', siglasEstados)
      }
      
      if (searchParams.get('municipio')) {
        // Frontend envia ID da cidade, mas banco armazena nome
        // Vamos buscar o nome da cidade correspondente ao ID
        const cidadeId = parseInt(searchParams.get('municipio')!)
        // Para isso funcionar, precisamos carregar os municípios do estado selecionado
        // Por enquanto, vamos usar uma abordagem diferente
        filtros.cidade_nome = searchParams.get('municipio') // Temporário - usar nome diretamente
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
    console.error('Erro ao listar imóveis:', error)
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
    
    console.log('🔍 Dados recebidos na API:', JSON.stringify(body, null, 2))
    
    // Verificar dados dos Steps 3, 4 e 5
    console.log('🔍 Amenidades recebidas:', body.amenidades)
    console.log('🔍 Proximidades recebidas:', body.proximidades)
    console.log('🔍 Imagens recebidas:', body.imagens)
    console.log('🔍 Documentos recebidos:', body.documentos)
    
    // Obter usuário logado
    const currentUserId = getCurrentUser(request)
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

    // Sempre usar status_fk = 1 (Ativo)
    body.status_fk = 1

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
    dadosImovel.status_fk = 1 // Sempre status_id = 1
    
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
    dadosImovel.aceita_permuta = body.aceita_permuta === true
    dadosImovel.aceita_financiamento = body.aceita_financiamento === true
    
    // Definir usuário logado
    dadosImovel.created_by = currentUserId
    dadosImovel.updated_by = currentUserId
    
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

    // Criar imóvel
    // TODO: Implementar autenticação real e pegar o UUID do usuário logado
    // Por enquanto, vamos usar NULL para created_by
    const novoImovel = await createImovel(dadosImovel, currentUserId)

    // Gerar código final com o ID real
    if (novoImovel && novoImovel.id) {
      try {
        // Buscar dados para gerar código diretamente do banco
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
            .replace(/\s+/g, '') // Remover espaços
            .replace(/[^A-Za-z0-9_]/g, '') // Manter letras (maiúsculas e minúsculas), números e underscore
            .toUpperCase()
          
          console.log('🔍 Código final gerado:', codigoFinal)
          
          // Atualizar o código no banco
          const { updateImovel } = await import('@/lib/database/imoveis')
          await updateImovel(novoImovel.id, { codigo: codigoFinal }, currentUserId || 'system')
          
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

      // Salvar amenidades (sempre processar, mesmo se array vazio)
      try {
        const amenidadeIds = body.amenidades && Array.isArray(body.amenidades) 
          ? body.amenidades.map((a: any) => a.id)
          : []
        await updateImovelAmenidades(novoImovel.id!, amenidadeIds)
        console.log('✅ Amenidades salvas com sucesso:', amenidadeIds)
      } catch (amenError) {
        console.error('⚠️ Erro ao salvar amenidades (não crítico):', amenError)
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
        console.log('✅ Proximidades salvas com sucesso:', proximidadesFormatadas)
      } catch (proxError) {
        console.error('⚠️ Erro ao salvar proximidades (não crítico):', proxError)
      }

      // Salvar imagens
      if (body.imagens && Array.isArray(body.imagens) && body.imagens.length > 0) {
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
      }
    }

    // Processar vídeo se presente
    if (body.video && body.video.arquivo) {
      try {
        console.log('🔍 Processando vídeo para imóvel:', novoImovel.id)
        console.log('🔍 Dados do vídeo recebidos:', {
          nomeArquivo: body.video.nomeArquivo,
          tipoMime: body.video.tipoMime,
          tamanhoBytes: body.video.tamanhoBytes,
          duracaoSegundos: body.video.duracaoSegundos,
          formato: body.video.formato
        })
        
        const videoFile = body.video.arquivo
        console.log('🔍 Arquivo de vídeo:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        })
        
        const arrayBuffer = await videoFile.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)
        console.log('🔍 Buffer criado com tamanho:', videoBuffer.length)
        
        const videoData = {
          video: videoBuffer,
          nome_arquivo: body.video.nomeArquivo || videoFile.name,
          tipo_mime: body.video.tipoMime || videoFile.type,
          tamanho_bytes: body.video.tamanhoBytes || videoFile.size,
          duracao_segundos: body.video.duracaoSegundos || 30,
          resolucao: body.video.resolucao || '1920x1080',
          formato: body.video.formato || videoFile.name.split('.').pop()?.toLowerCase() || 'mp4'
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
    } else {
      console.log('🔍 Nenhum vídeo presente para processar')
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
