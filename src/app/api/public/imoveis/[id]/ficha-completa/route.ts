import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 API GET - Iniciando busca do imóvel ID:', params.id)

    const imovelId = parseInt(params.id)
    if (isNaN(imovelId)) {
      console.log('❌ ID inválido:', params.id)
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const nivel = searchParams.get('nivel') || 'basico'
    console.log('🔍 Nível solicitado:', nivel)

    // Buscar dados básicos diretamente da tabela imoveis
    const query = `
      SELECT 
        i.id,
        i.codigo,
        i.titulo,
        i.descricao,
        i.endereco,
        i.numero,
        i.complemento,
        i.bairro,
        i.cep,
        i.latitude,
        i.longitude,
        i.preco,
        i.preco_condominio,
        i.preco_iptu,
        i.taxa_extra,
        i.area_total,
        i.area_construida,
        i.quartos,
        i.banheiros,
        i.suites,
        i.vagas_garagem,
        i.varanda,
        i.andar,
        i.total_andares,
        i.ano_construcao,
        i.mobiliado,
        i.aceita_permuta,
        i.aceita_financiamento,
        i.lancamento,
        i.destaque,
        i.ativo,
        i.estado_fk,
        i.cidade_fk,
        si.consulta_imovel_internauta,
        i.created_at,
        i.updated_at,
        
        -- Relacionamentos
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        si.cor as status_cor,
        
        
        -- Imagem principal
        img.id as imagem_principal_id,
        
        -- Contadores
        (SELECT COUNT(*) FROM imovel_imagens WHERE imovel_id = i.id AND principal = false) as total_imagens,
        (SELECT COUNT(*) FROM imovel_amenidades WHERE imovel_id = i.id) as total_amenidades,
        (SELECT COUNT(*) FROM imovel_proximidades WHERE imovel_id = i.id) as total_proximidades,
        (SELECT COUNT(*) FROM imovel_documentos d JOIN tipo_documento_imovel td ON d.id_tipo_documento = td.id WHERE d.id_imovel = i.id AND td.consulta_imovel_internauta = true) as total_documentos,
        (SELECT COUNT(*) FROM imovel_video WHERE imovel_id = i.id) as total_videos
        
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN status_imovel si ON i.status_fk = si.id
      LEFT JOIN imovel_imagens img ON i.id = img.imovel_id AND img.principal = true
      WHERE i.id = $1
    `

    const result = await pool.query(query, [imovelId])

    if (result.rows.length === 0) {
      console.log('❌ Imóvel não encontrado:', imovelId)
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    const imovel = result.rows[0]
    console.log('✅ Dados básicos encontrados:', imovel.titulo)

    // Montar objeto de resposta base
    const imovelResponse = {
      id: imovel.id,
      codigo: imovel.codigo,
      titulo: imovel.titulo,
      descricao: imovel.descricao,
      endereco: imovel.endereco,
      numero: imovel.numero,
      complemento: imovel.complemento,
      bairro: imovel.bairro,
      cep: imovel.cep,
      latitude: imovel.latitude,
      longitude: imovel.longitude,
      preco: parseFloat(imovel.preco),
      preco_condominio: imovel.preco_condominio ? parseFloat(imovel.preco_condominio) : null,
      preco_iptu: imovel.preco_iptu ? parseFloat(imovel.preco_iptu) : null,
      taxa_extra: imovel.taxa_extra ? parseFloat(imovel.taxa_extra) : null,
      area_total: imovel.area_total,
      area_construida: imovel.area_construida,
      quartos: imovel.quartos,
      banheiros: imovel.banheiros,
      suites: imovel.suites,
      vagas_garagem: imovel.vagas_garagem,
      varanda: imovel.varanda,
      andar: imovel.andar,
      total_andares: imovel.total_andares,
      ano_construcao: imovel.ano_construcao,
      mobiliado: imovel.mobiliado,
      aceita_permuta: imovel.aceita_permuta,
      aceita_financiamento: imovel.aceita_financiamento,
      lancamento: imovel.lancamento,
      destaque: imovel.destaque,
      ativo: imovel.ativo,
      estado_fk: imovel.estado_fk,
      cidade_fk: imovel.cidade_fk,
      consulta_imovel_internauta: imovel.consulta_imovel_internauta,
      created_at: imovel.created_at,
      updated_at: imovel.updated_at,

      // Relacionamentos
      tipo_fk: imovel.tipo_fk,
      finalidade_fk: imovel.finalidade_fk,
      status_fk: imovel.status_fk,
      tipo_nome: imovel.tipo_nome,
      finalidade_nome: imovel.finalidade_nome,
      status_nome: imovel.status_nome,
      status_cor: imovel.status_cor,


      // Imagem e contadores
      imagem_principal: imovel.imagem_principal_id ? {
        url: `/api/public/imagens/${imovel.imagem_principal_id}`,
        alt: imovel.titulo
      } : null,
      total_imagens: parseInt(imovel.total_imagens),
      total_amenidades: parseInt(imovel.total_amenidades),
      total_proximidades: parseInt(imovel.total_proximidades),
      total_documentos: parseInt(imovel.total_documentos),
      total_videos: parseInt(imovel.total_videos)
    }

    // Se for nível básico, retornar apenas os dados básicos
    if (nivel === 'basico') {
      return NextResponse.json({
        success: true,
        nivel: 'basico',
        imovel: imovelResponse
      })
    }

    // Se for nível detalhado, buscar amenidades e proximidades
    if (nivel === 'detalhado') {
      console.log('🔍 Carregando dados detalhados...')

      // Buscar amenidades
      const amenidadesQuery = `
        SELECT 
          a.id,
          a.nome,
          a.descricao,
          ca.nome as categoria_nome,
          ca.cor as categoria_cor
        FROM imovel_amenidades ia
        JOIN amenidades a ON ia.amenidade_id = a.id
        JOIN categorias_amenidades ca ON a.categoria_id = ca.id
        WHERE ia.imovel_id = $1
        ORDER BY ca.nome, a.nome
      `

      const amenidadesResult = await pool.query(amenidadesQuery, [imovelId])
      const amenidades = amenidadesResult.rows.reduce((acc, row) => {
        if (!acc.por_categoria[row.categoria_nome]) {
          acc.por_categoria[row.categoria_nome] = []
        }
        acc.por_categoria[row.categoria_nome].push({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          categoria_nome: row.categoria_nome,
          categoria_cor: row.categoria_cor
        })
        acc.lista.push({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          categoria_nome: row.categoria_nome,
          categoria_cor: row.categoria_cor
        })
        return acc
      }, { por_categoria: {}, lista: [] })

      // Buscar proximidades
      const proximidadesQuery = `
        SELECT 
          p.id,
          p.nome,
          p.descricao,
          cp.nome as categoria_nome,
          cp.cor as categoria_cor,
          ip.distancia_metros,
          ip.tempo_caminhada,
          ip.observacoes
        FROM imovel_proximidades ip
        JOIN proximidades p ON ip.proximidade_id = p.id
        JOIN categorias_proximidades cp ON p.categoria_id = cp.id
        WHERE ip.imovel_id = $1
        ORDER BY cp.nome, p.nome
      `

      const proximidadesResult = await pool.query(proximidadesQuery, [imovelId])
      const proximidades = proximidadesResult.rows.reduce((acc, row) => {
        if (!acc.por_categoria[row.categoria_nome]) {
          acc.por_categoria[row.categoria_nome] = []
        }
        acc.por_categoria[row.categoria_nome].push({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          categoria_nome: row.categoria_nome,
          categoria_cor: row.categoria_cor,
          distancia_metros: row.distancia_metros > 0 ? row.distancia_metros : null,
          tempo_caminhada: row.tempo_caminhada > 0 ? row.tempo_caminhada : null,
          observacoes: row.observacoes
        })
        acc.lista.push({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          categoria_nome: row.categoria_nome,
          categoria_cor: row.categoria_cor,
          distancia_metros: row.distancia_metros > 0 ? row.distancia_metros : null,
          tempo_caminhada: row.tempo_caminhada > 0 ? row.tempo_caminhada : null,
          observacoes: row.observacoes
        })
        return acc
      }, { por_categoria: {}, lista: [] })

      return NextResponse.json({
        success: true,
        nivel: 'detalhado',
        imovel: {
          ...imovelResponse,
          amenidades,
          proximidades
        }
      })
    }

    // Se for nível completo, buscar imagens, vídeos e documentos
    if (nivel === 'completo') {
      console.log('🔍 Carregando dados completos...')

      // Buscar imagens
      const imagensQuery = `
        SELECT 
          id,
          ordem,
          principal,
          tipo_mime,
          tamanho_bytes
        FROM imovel_imagens
        WHERE imovel_id = $1
        ORDER BY principal DESC, ordem ASC
      `
      const imagensResult = await pool.query(imagensQuery, [imovelId])
      const imagens = imagensResult.rows.map(row => ({
        id: row.id,
        url: `/api/public/imagens/${row.id}`,
        alt: `Imagem ${row.ordem || row.id}`,
        ordem: row.ordem,
        principal: row.principal,
        tipo_mime: row.tipo_mime,
        tamanho_bytes: row.tamanho_bytes
      }))

      // Buscar vídeos
      const videosQuery = `
        SELECT 
          id,
          nome_arquivo,
          tipo_mime,
          tamanho_bytes,
          duracao_segundos,
          resolucao,
          formato,
          video
        FROM imovel_video
        WHERE imovel_id = $1 AND ativo = true
        ORDER BY created_at ASC
      `
      const videosResult = await pool.query(videosQuery, [imovelId])
      const videos = videosResult.rows.map(row => ({
        id: row.id,
        url: `data:${row.tipo_mime};base64,${Buffer.from(row.video).toString('base64')}`,
        nome_arquivo: row.nome_arquivo,
        duracao_segundos: row.duracao_segundos,
        resolucao: row.resolucao,
        formato: row.formato,
        tamanho_bytes: row.tamanho_bytes
      }))

      // Buscar documentos com conteúdo
      const documentosQuery = `
        SELECT 
          d.id,
          d.nome_arquivo,
          d.tipo_mime,
          d.tamanho_bytes,
          d.created_at as data_upload,
          d.documento,
          td.descricao as tipo_documento
        FROM imovel_documentos d
        JOIN tipo_documento_imovel td ON d.id_tipo_documento = td.id
        WHERE d.id_imovel = $1 AND td.consulta_imovel_internauta = true
        ORDER BY d.created_at DESC
      `
      const documentosResult = await pool.query(documentosQuery, [imovelId])
      console.log('🔍 Documentos encontrados:', documentosResult.rows.length)

      const documentos = documentosResult.rows.map((row, index) => {
        console.log(`🔍 Documento ${index + 1}:`, {
          id: row.id,
          nome_arquivo: row.nome_arquivo,
          tipo_mime: row.tipo_mime,
          tamanho_bytes: row.tamanho_bytes,
          tem_documento: !!row.documento
        })

        // Converter para base64 diretamente
        const base64Content = Buffer.from(row.documento).toString('base64')
        const url = `data:${row.tipo_mime};base64,${base64Content}`

        console.log(`🔍 URL criada para ${row.nome_arquivo}:`, {
          url_length: url.length,
          url_preview: url.substring(0, 100) + '...'
        })

        return {
          id: row.id,
          nome_arquivo: row.nome_arquivo,
          tipo_documento: row.tipo_documento,
          tipo_mime: row.tipo_mime,
          tamanho_bytes: row.tamanho_bytes,
          data_upload: row.data_upload,
          url: url
        }
      })

      return NextResponse.json({
        success: true,
        nivel: 'completo',
        imovel: {
          ...imovelResponse,
          imagens,
          videos,
          documentos
        }
      })
    }

    // Nível não reconhecido, retornar básico
    return NextResponse.json({
      success: true,
      nivel: 'basico',
      imovel: imovelResponse
    })

  } catch (error) {
    console.error('❌ Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error as Error).message },
      { status: 500 }
    )
  }
}