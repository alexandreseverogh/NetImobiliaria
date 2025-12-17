import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// API PÚBLICA - Buscar imóveis em destaque (SEM autenticação)
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de filtro
    const { searchParams } = new URL(request.url)
    const tipoDestaque = searchParams.get('tipo_destaque') || 'DV' // Default: Destaque Venda
    const estado = searchParams.get('estado') || null // Estado selecionado pelo usuário
    const cidade = searchParams.get('cidade') || null // Cidade selecionada pelo usuário
    const destaqueNacionalOnlyParam = searchParams.get('destaque_nacional_only')
    // IMPORTANTE: Se destaque_nacional_only está presente mas não é 'true', tratar como se não estivesse presente
    // Isso evita problemas com valores inválidos como 'false', '', null, etc.
    const destaqueNacionalOnly = destaqueNacionalOnlyParam === 'true' // Forçar busca apenas de destaque nacional
    
    console.log('🔍 API Pública - Buscando imóveis em destaque')
    console.log('🔍 API Pública - Tipo destaque:', tipoDestaque)
    console.log('🔍 API Pública - Estado recebido:', estado)
    console.log('🔍 API Pública - Cidade recebida:', cidade)
    console.log('🔍 API Pública - Parâmetro destaque_nacional_only (raw):', destaqueNacionalOnlyParam)
    console.log('🔍 API Pública - Destaque nacional apenas (parsed):', destaqueNacionalOnly)
    console.log('🔍 API Pública - URL completa:', request.url)
    
    // Se destaqueNacionalOnly estiver ativo, buscar apenas destaque nacional (sem filtros de estado/cidade)
    if (destaqueNacionalOnly) {
      console.log('🔍 API Pública - Buscando apenas destaque nacional (modo forçado)')
      console.log('🔍 API Pública - Tipo destaque recebido:', tipoDestaque)
      
      // IMPORTANTE: Garantir que estamos buscando APENAS imóveis com destaque_nacional = true
      // e filtrando pela finalidade correta (Comprar ou Alugar)
      let query = `
        SELECT 
          i.id,
          i.codigo,
          i.titulo,
          i.descricao,
          i.preco,
          i.endereco,
          i.numero,
          i.complemento,
          i.bairro,
          i.cidade_fk,
          i.estado_fk,
          i.cep,
          i.quartos,
          i.banheiros,
          i.area_total,
          i.vagas_garagem,
          i.tipo_fk,
          i.finalidade_fk,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          fi.tipo_destaque,
          i.destaque_nacional,
          fi.vender_landpaging,
          fi.alugar_landpaging
        FROM imoveis i
        INNER JOIN tipos_imovel ti ON i.tipo_fk = ti.id
        INNER JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        INNER JOIN status_imovel si ON i.status_fk = si.id
        WHERE i.destaque_nacional = true
        AND i.ativo = true
        AND si.ativo = true
        AND si.consulta_imovel_internauta = true
      `
      
      // Aplicar o mesmo filtro de finalidade para destaque nacional
      if (tipoDestaque === 'DV') {
        // Para "Comprar": filtrar por vender_landpaging = true
        query += ` AND fi.vender_landpaging = true`
        console.log('🔍 API Pública - Filtro aplicado: vender_landpaging = true (Comprar)')
      } else if (tipoDestaque === 'DA') {
        // Para "Alugar": filtrar por alugar_landpaging = true
        query += ` AND fi.alugar_landpaging = true`
        console.log('🔍 API Pública - Filtro aplicado: alugar_landpaging = true (Alugar)')
      } else {
        console.warn('⚠️ API Pública - Tipo destaque inválido:', tipoDestaque, '- não aplicando filtro de finalidade')
      }
      
      query += ` ORDER BY i.created_at DESC LIMIT 50`
      
      console.log('🔍 API Pública - Query SQL (destaque nacional forçado):', query)
      const result = await pool.query(query)
      console.log('🔍 API Pública - Imóveis encontrados com destaque nacional (modo forçado):', result.rows.length)
      
      // Validar que todos os resultados têm destaque_nacional = true
      const imoveisInvalidos = result.rows.filter(r => !r.destaque_nacional)
      if (imoveisInvalidos.length > 0) {
        console.error('❌ API Pública - ERRO: Encontrados imóveis sem destaque_nacional = true:', imoveisInvalidos.length)
        console.error('❌ API Pública - IDs inválidos:', imoveisInvalidos.map(r => r.id))
        // Filtrar apenas imóveis válidos
        result.rows = result.rows.filter(r => r.destaque_nacional === true)
        console.log('🔍 API Pública - Imóveis válidos após filtro:', result.rows.length)
      }
      
      // Validar que os filtros de finalidade estão corretos
      if (tipoDestaque === 'DV') {
        const imoveisInvalidosFinalidade = result.rows.filter(r => !r.vender_landpaging)
        if (imoveisInvalidosFinalidade.length > 0) {
          console.error('❌ API Pública - ERRO: Encontrados imóveis sem vender_landpaging = true:', imoveisInvalidosFinalidade.length)
          console.error('❌ API Pública - IDs inválidos:', imoveisInvalidosFinalidade.map(r => r.id))
          result.rows = result.rows.filter(r => r.vender_landpaging === true)
          console.log('🔍 API Pública - Imóveis válidos após filtro de finalidade:', result.rows.length)
        }
      } else if (tipoDestaque === 'DA') {
        const imoveisInvalidosFinalidade = result.rows.filter(r => !r.alugar_landpaging)
        if (imoveisInvalidosFinalidade.length > 0) {
          console.error('❌ API Pública - ERRO: Encontrados imóveis sem alugar_landpaging = true:', imoveisInvalidosFinalidade.length)
          console.error('❌ API Pública - IDs inválidos:', imoveisInvalidosFinalidade.map(r => r.id))
          result.rows = result.rows.filter(r => r.alugar_landpaging === true)
          console.log('🔍 API Pública - Imóveis válidos após filtro de finalidade:', result.rows.length)
        }
      }
      
      // Remover duplicatas por ID (caso o JOIN tenha criado duplicatas)
      const imoveisUnicos = new Map()
      result.rows.forEach(imovel => {
        if (!imoveisUnicos.has(imovel.id)) {
          imoveisUnicos.set(imovel.id, imovel)
        }
      })
      result.rows = Array.from(imoveisUnicos.values())
      
      if (result.rows.length !== imoveisUnicos.size) {
        console.warn('⚠️ API Pública - Removidas duplicatas:', result.rows.length - imoveisUnicos.size)
      }
      
      if (result.rows.length > 0) {
        console.log('🔍 API Pública - Primeiros imóveis:', result.rows.slice(0, 5).map(r => ({
          id: r.id,
          titulo: r.titulo,
          destaque_nacional: r.destaque_nacional,
          finalidade_fk: r.finalidade_fk,
          vender_landpaging: r.vender_landpaging,
          alugar_landpaging: r.alugar_landpaging,
          tipo_destaque: tipoDestaque
        })))
      }
      
      console.log('✅ API Pública - Total de imóveis válidos após validações:', result.rows.length)
      
      // Buscar imagem principal para cada imóvel
      const imoveisComImagens = await Promise.all(
        result.rows.map(async (imovel) => {
          console.log('🔍 API Pública - Buscando imagem para imóvel ID:', imovel.id)
          
          const imagemQuery = `
            SELECT 
              encode(imagem, 'base64') as imagem_base64,
              tipo_mime
            FROM imovel_imagens
            WHERE imovel_id = $1 AND principal = true
            LIMIT 1
          `
          
          const imagemResult = await pool.query(imagemQuery, [imovel.id])
          console.log('🔍 API Pública - Imagens encontradas para imóvel', imovel.id, ':', imagemResult.rows.length)
          
          const imagemPrincipal = imagemResult.rows.length > 0 
            ? `data:${imagemResult.rows[0].tipo_mime || 'image/jpeg'};base64,${imagemResult.rows[0].imagem_base64}`
            : null
          
          return {
            ...imovel,
            imagem_principal: imagemPrincipal
          }
        })
      )
      
      console.log('✅ API Pública - Retornando', imoveisComImagens.length, 'imóveis (destaque nacional)')
      
      return NextResponse.json({
        success: true,
        imoveis: imoveisComImagens
      })
    }
    
    // IMPORTANTE: Se não há filtros de estado/cidade, SEMPRE buscar apenas destaque nacional
    // Isso garante que quando a página carrega inicialmente sem localização, busque apenas destaque nacional
    // Se há filtros de estado/cidade (localização confirmada via modal), buscar primeiro destaque LOCAL (destaque = true)
    const naoTemFiltrosLocalizacao = !estado && !cidade
    
    // Declarar query e result no escopo correto para garantir que estejam disponíveis em todos os caminhos
    let query: string
    let result: any
    let usadoFallbackNacional = false // Flag para rastrear se foi usado fallback para destaque nacional
    
    if (naoTemFiltrosLocalizacao) {
      console.log('🔍 API Pública - Sem filtros de localização - buscando apenas destaque nacional')
      
      // Buscar apenas destaque nacional quando não há filtros de localização
      query = `
        SELECT 
          i.id,
          i.codigo,
          i.titulo,
          i.descricao,
          i.preco,
          i.endereco,
          i.numero,
          i.complemento,
          i.bairro,
          i.cidade_fk,
          i.estado_fk,
          i.cep,
          i.quartos,
          i.banheiros,
          i.area_total,
          i.vagas_garagem,
          i.tipo_fk,
          i.finalidade_fk,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          fi.tipo_destaque,
          i.destaque_nacional,
          fi.vender_landpaging,
          fi.alugar_landpaging
        FROM imoveis i
        INNER JOIN tipos_imovel ti ON i.tipo_fk = ti.id
        INNER JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        INNER JOIN status_imovel si ON i.status_fk = si.id
        WHERE i.destaque_nacional = true
        AND i.ativo = true
        AND si.ativo = true
        AND si.consulta_imovel_internauta = true
      `
      
      // Aplicar o mesmo filtro de finalidade para destaque nacional
      if (tipoDestaque === 'DV') {
        // Para "Comprar": filtrar por vender_landpaging = true
        query += ` AND fi.vender_landpaging = true`
        console.log('🔍 API Pública - Filtro aplicado: vender_landpaging = true (Comprar)')
      } else if (tipoDestaque === 'DA') {
        // Para "Alugar": filtrar por alugar_landpaging = true
        query += ` AND fi.alugar_landpaging = true`
        console.log('🔍 API Pública - Filtro aplicado: alugar_landpaging = true (Alugar)')
      }
      
      query += ` ORDER BY i.created_at DESC LIMIT 50`
      
      console.log('🔍 API Pública - Query SQL (sem filtros de localização):', query)
      result = await pool.query(query)
      console.log('🔍 API Pública - Imóveis encontrados com destaque nacional (sem filtros):', result.rows.length)
      
      // Validar que todos os resultados têm destaque_nacional = true
      const imoveisInvalidos = result.rows.filter(r => !r.destaque_nacional)
      if (imoveisInvalidos.length > 0) {
        console.error('❌ API Pública - ERRO: Encontrados imóveis sem destaque_nacional = true:', imoveisInvalidos.length)
        result.rows = result.rows.filter(r => r.destaque_nacional === true)
      }
      
      // Validar filtros de finalidade
      if (tipoDestaque === 'DV') {
        const imoveisInvalidosFinalidade = result.rows.filter(r => !r.vender_landpaging)
        if (imoveisInvalidosFinalidade.length > 0) {
          console.error('❌ API Pública - ERRO: Encontrados imóveis sem vender_landpaging = true:', imoveisInvalidosFinalidade.length)
          result.rows = result.rows.filter(r => r.vender_landpaging === true)
        }
      } else if (tipoDestaque === 'DA') {
        const imoveisInvalidosFinalidade = result.rows.filter(r => !r.alugar_landpaging)
        if (imoveisInvalidosFinalidade.length > 0) {
          console.error('❌ API Pública - ERRO: Encontrados imóveis sem alugar_landpaging = true:', imoveisInvalidosFinalidade.length)
          result.rows = result.rows.filter(r => r.alugar_landpaging === true)
        }
      }
      
      // Remover duplicatas
      const imoveisUnicos = new Map()
      result.rows.forEach(imovel => {
        if (!imoveisUnicos.has(imovel.id)) {
          imoveisUnicos.set(imovel.id, imovel)
        }
      })
      result.rows = Array.from(imoveisUnicos.values())
      
    } else {
      // Há filtros de estado/cidade (localização confirmada via modal) - buscar destaque LOCAL primeiro
      console.log('🔍 API Pública - Há filtros de localização - buscando destaque LOCAL (destaque = true)')
      
      // Primeira tentativa: buscar imóveis com destaque = true que correspondem ao estado/cidade
      // Para "Comprar" (DV): filtrar por vender_landpaging = true
      // Para "Alugar" (DA): filtrar por alugar_landpaging = true
      let       query = `
        SELECT 
          i.id,
          i.codigo,
          i.titulo,
          i.descricao,
          i.preco,
          i.endereco,
          i.numero,
          i.complemento,
          i.bairro,
          i.cidade_fk,
          i.estado_fk,
          i.cep,
          i.quartos,
          i.banheiros,
          i.area_total,
          i.vagas_garagem,
          i.tipo_fk,
          i.finalidade_fk,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          fi.tipo_destaque
        FROM imoveis i
        INNER JOIN tipos_imovel ti ON i.tipo_fk = ti.id
        INNER JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        INNER JOIN status_imovel si ON i.status_fk = si.id
        WHERE i.destaque = true
        AND i.ativo = true
        AND si.ativo = true
        AND si.consulta_imovel_internauta = true
      `
      
      // Adicionar filtro baseado no tipo de destaque (Comprar ou Alugar)
      if (tipoDestaque === 'DV') {
        // Para "Comprar": filtrar por vender_landpaging = true
        query += ` AND fi.vender_landpaging = true`
      } else if (tipoDestaque === 'DA') {
        // Para "Alugar": filtrar por alugar_landpaging = true
        query += ` AND fi.alugar_landpaging = true`
      }
      
      const params: any[] = []
      let paramIndex = 1
      
      // FILTRO DE ESTADO
      // IMPORTANTE: Se há estado mas NÃO há cidade selecionada, busca TODOS os imóveis do estado
      // independentemente do conteúdo do campo cidade_fk na tabela imoveis
      // estado_fk é CHAR(2) - armazena SIGLA do estado (ex: "RJ", "SP")
      if (estado) {
        // estado_fk armazena sigla, então usar comparação exata (case-insensitive)
        const estadoNormalizado = estado.trim().toUpperCase()
        query += ` AND UPPER(TRIM(i.estado_fk)) = $${paramIndex}`
        params.push(estadoNormalizado)
        paramIndex++
        console.log('🔍 API Pública - Estado normalizado para busca:', estadoNormalizado)
      }
      
      // FILTRO DE CIDADE (OPCIONAL)
      // IMPORTANTE: Este filtro só é aplicado se uma cidade específica for selecionada
      // Se não houver cidade selecionada (ou "Todas as cidades"), busca todos os imóveis do estado
      // cidade_fk é VARCHAR(100) - armazena NOME da cidade (ex: "Rio de Janeiro", "São Paulo")
      // Usar ILIKE com trim para remover espaços extras e fazer match case-insensitive
      if (cidade) {
        const cidadeNormalizada = cidade.trim()
        query += ` AND TRIM(i.cidade_fk) ILIKE $${paramIndex}`
        params.push(`%${cidadeNormalizada}%`)
        paramIndex++
        console.log('🔍 API Pública - Cidade normalizada para busca:', cidadeNormalizada)
      }
      
      query += ` ORDER BY i.created_at DESC`
      
      console.log('🔍 API Pública - Query SQL (destaque local):', query)
      console.log('🔍 API Pública - Parâmetros:', params)
      
      // Query de debug para verificar se o imóvel existe
      if (estado && cidade) {
        const debugQuery = `
          SELECT 
            i.id,
            i.destaque,
            i.destaque_nacional,
            i.estado_fk,
            i.cidade_fk,
            i.ativo,
            i.status_fk,
            i.finalidade_fk,
            fi.vender_landpaging,
            fi.alugar_landpaging,
            si.ativo as status_ativo,
            si.consulta_imovel_internauta
          FROM imoveis i
          LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
          LEFT JOIN status_imovel si ON i.status_fk = si.id
          WHERE i.estado_fk = $1 AND i.cidade_fk ILIKE $2
          LIMIT 10
        `
        const estadoNormalizadoDebug = estado.trim().toUpperCase()
        const cidadeNormalizadaDebug = cidade.trim()
        const debugResult = await pool.query(debugQuery, [estadoNormalizadoDebug, `%${cidadeNormalizadaDebug}%`])
        console.log('🔍 API Pública - DEBUG: Imóveis encontrados com estado/cidade:', debugResult.rows.length)
        if (debugResult.rows.length > 0) {
          console.log('🔍 API Pública - DEBUG: Detalhes dos imóveis encontrados:', debugResult.rows.map(r => ({
            id: r.id,
            destaque: r.destaque,
            destaque_nacional: r.destaque_nacional,
            estado_fk: r.estado_fk,
            cidade_fk: r.cidade_fk,
            ativo: r.ativo,
            status_fk: r.status_fk,
            finalidade_fk: r.finalidade_fk,
            vender_landpaging: r.vender_landpaging,
            alugar_landpaging: r.alugar_landpaging,
            status_ativo: r.status_ativo,
            consulta_imovel_internauta: r.consulta_imovel_internauta
          })))
        }
      }
      
      result = await pool.query(query, params)
      
      console.log('🔍 API Pública - Imóveis encontrados com destaque local:', result.rows.length)
      console.log('🔍 API Pública - Query executada:', query)
      console.log('🔍 API Pública - Parâmetros usados:', params)
      console.log('🔍 API Pública - Estado recebido (raw):', estado)
      console.log('🔍 API Pública - Cidade recebida (raw):', cidade)
      if (result.rows.length > 0) {
        console.log('🔍 API Pública - Primeiros imóveis encontrados:', result.rows.slice(0, 3).map(r => ({
          id: r.id,
          cidade_fk: r.cidade_fk,
          estado_fk: r.estado_fk,
          destaque: r.destaque,
          destaque_nacional: r.destaque_nacional
        })))
      } else {
        console.log('⚠️ API Pública - NENHUM imóvel encontrado com destaque local para:', {
          estado,
          cidade,
          tipoDestaque,
          mensagem: 'Verificando se há problema nos filtros de finalidade ou status'
        })
        
        // Verificar se há imóveis que passaram nos filtros básicos mas falharam nos filtros de finalidade/status
        if (estado && cidade) {
          const estadoNormalizadoDebug = estado.trim().toUpperCase()
          const cidadeNormalizadaDebug = cidade.trim()
          const debugQueryCompleto = `
            SELECT 
              i.id,
              i.destaque,
              i.ativo,
              i.status_fk,
              i.finalidade_fk,
              fi.vender_landpaging,
              fi.alugar_landpaging,
              si.ativo as status_ativo,
              si.consulta_imovel_internauta,
              CASE 
                WHEN i.destaque = false THEN 'Falhou: destaque = false'
                WHEN i.ativo = false THEN 'Falhou: ativo = false'
                WHEN si.ativo = false THEN 'Falhou: status.ativo = false'
                WHEN si.consulta_imovel_internauta = false THEN 'Falhou: status.consulta_imovel_internauta = false'
                WHEN fi.vender_landpaging = false AND $3 = 'DV' THEN 'Falhou: vender_landpaging = false (tipoDestaque = DV)'
                WHEN fi.alugar_landpaging = false AND $3 = 'DA' THEN 'Falhou: alugar_landpaging = false (tipoDestaque = DA)'
                ELSE 'Passou em todos os filtros'
              END as motivo_exclusao
            FROM imoveis i
            LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
            LEFT JOIN status_imovel si ON i.status_fk = si.id
            WHERE i.estado_fk = $1 
            AND i.cidade_fk ILIKE $2
            AND i.destaque = true
            LIMIT 10
          `
          const debugResultCompleto = await pool.query(debugQueryCompleto, [estadoNormalizadoDebug, `%${cidadeNormalizadaDebug}%`, tipoDestaque])
          if (debugResultCompleto.rows.length > 0) {
            console.log('🔍 API Pública - DEBUG: Imóveis com destaque=true encontrados mas excluídos pelos filtros:', debugResultCompleto.rows.map(r => ({
              id: r.id,
              motivo_exclusao: r.motivo_exclusao,
              destaque: r.destaque,
              ativo: r.ativo,
              status_ativo: r.status_ativo,
              consulta_imovel_internauta: r.consulta_imovel_internauta,
              vender_landpaging: r.vender_landpaging,
              alugar_landpaging: r.alugar_landpaging
            })))
          }
        }
      }
      
      // Se não encontrou nenhum imóvel com destaque local, buscar destaque nacional como fallback
      if (result.rows.length === 0) {
        console.log('🔍 API Pública - Nenhum imóvel local encontrado, buscando destaque nacional como fallback')
        usadoFallbackNacional = true
        
        query = `
          SELECT 
            i.id,
            i.codigo,
            i.titulo,
            i.descricao,
            i.preco,
            i.endereco,
            i.numero,
            i.complemento,
            i.bairro,
            i.cidade_fk,
            i.estado_fk,
            i.cep,
            i.quartos,
            i.banheiros,
            i.area_total,
            i.vagas_garagem,
            i.tipo_fk,
            i.finalidade_fk,
            ti.nome as tipo_nome,
            fi.nome as finalidade_nome,
            fi.tipo_destaque
          FROM imoveis i
          INNER JOIN tipos_imovel ti ON i.tipo_fk = ti.id
          INNER JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
          INNER JOIN status_imovel si ON i.status_fk = si.id
          WHERE i.destaque_nacional = true
          AND i.ativo = true
          AND si.ativo = true
          AND si.consulta_imovel_internauta = true
        `
        
        // Aplicar o mesmo filtro de finalidade para destaque nacional
        if (tipoDestaque === 'DV') {
          // Para "Comprar": filtrar por vender_landpaging = true
          query += ` AND fi.vender_landpaging = true`
        } else if (tipoDestaque === 'DA') {
          // Para "Alugar": filtrar por alugar_landpaging = true
          query += ` AND fi.alugar_landpaging = true`
        }
        
        query += ` ORDER BY i.created_at DESC LIMIT 50`
        
        result = await pool.query(query)
        console.log('🔍 API Pública - Imóveis encontrados com destaque nacional (fallback):', result.rows.length)
      }
    }
    
    // Garantir que result foi atribuído antes de usar
    if (!result || !result.rows) {
      console.error('❌ API Pública - ERRO: result não foi definido corretamente')
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar imóveis em destaque',
        imoveis: []
      })
    }
    
    console.log('✅ API Pública - Imóveis em destaque encontrados:', result.rows.length)
    console.log('🔍 API Pública - Dados dos imóveis:', result.rows)
    
    // Buscar imagem principal para cada imóvel
    const imoveisComImagens = await Promise.all(
      result.rows.map(async (imovel) => {
        console.log('🔍 API Pública - Buscando imagem para imóvel ID:', imovel.id)
        
        const imagemQuery = `
          SELECT 
            encode(imagem, 'base64') as imagem_base64,
            tipo_mime
          FROM imovel_imagens
          WHERE imovel_id = $1 AND principal = true
          LIMIT 1
        `
        
        const imagemResult = await pool.query(imagemQuery, [imovel.id])
        console.log('🔍 API Pública - Imagens encontradas para imóvel', imovel.id, ':', imagemResult.rows.length)
        
        const imagemPrincipal = imagemResult.rows.length > 0 
          ? `data:${imagemResult.rows[0].tipo_mime || 'image/jpeg'};base64,${imagemResult.rows[0].imagem_base64}`
          : null
        
        return {
          ...imovel,
          imagem_principal: imagemPrincipal
        }
      })
    )
    
    console.log('✅ API Pública - Retornando', imoveisComImagens.length, 'imóveis')
    console.log('🔍 API Pública - Foi usado fallback nacional?', usadoFallbackNacional)
    
    return NextResponse.json({
      success: true,
      imoveis: imoveisComImagens,
      usadoFallbackNacional: usadoFallbackNacional || false
    })

  } catch (error) {
    console.error('❌ Erro ao buscar imóveis em destaque:', error)
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

