import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database/connection'

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
        i.destaque,
        i.ativo,
        i.created_at,
        i.updated_at,
        i.estado_fk,
        i.cidade_fk,
        i.tipo_fk,
        i.finalidade_fk,
        i.status_fk,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        si.cor as status_cor,
        si.consulta_imovel_internauta,
        -- Imagem principal
        CASE 
          WHEN img.id IS NOT NULL THEN 
            json_build_object(
              'id', img.id,
              'tipo_mime', img.tipo_mime,
              'tamanho_bytes', img.tamanho_bytes,
              'ordem', img.ordem,
              'principal', img.principal,
              'url', '/api/imoveis/' || i.id || '/imagens/' || img.id
            )
          ELSE NULL
        END as imagem_principal,
        -- Contadores
        (SELECT COUNT(*) FROM imovel_imagens WHERE imovel_id = i.id) as total_imagens,
        (SELECT COUNT(*) FROM imovel_amenidades WHERE imovel_id = i.id) as total_amenidades,
        (SELECT COUNT(*) FROM imovel_proximidades WHERE imovel_id = i.id) as total_proximidades,
        (SELECT COUNT(*) FROM documento_imovel WHERE imovel_fk = i.id AND ativo = true) as total_documentos
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN status_imovel si ON i.status_fk = si.id
      LEFT JOIN imovel_imagens img ON i.id = img.imovel_id AND img.principal = true
      WHERE i.id = $1 AND i.ativo = true
    `

    console.log('🔍 Executando query...')
    const result = await pool.query(query, [imovelId])
    console.log('🔍 Resultado da query:', result.rows.length, 'registros')

    if (result.rows.length === 0) {
      console.log('❌ Imóvel não encontrado')
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    const imovel = result.rows[0]
    console.log('✅ Imóvel encontrado:', imovel.codigo)

    return NextResponse.json({
      success: true,
      nivel: 'basico',
      imovel: {
        id: imovel.id,
        codigo: imovel.codigo,
        titulo: imovel.titulo,
        descricao: imovel.descricao,
        preco: imovel.preco,
        area_total: imovel.area_total,
        quartos: imovel.quartos,
        banheiros: imovel.banheiros,
        suites: imovel.suites,
        vagas_garagem: imovel.vagas_garagem,
        bairro: imovel.bairro,
        endereco: imovel.endereco,
        tipo_nome: imovel.tipo_nome,
        finalidade_nome: imovel.finalidade_nome,
        status_nome: imovel.status_nome,
        status_cor: imovel.status_cor,
        imagem_principal: imovel.imagem_principal,
        total_imagens: imovel.total_imagens,
        total_amenidades: imovel.total_amenidades,
        total_proximidades: imovel.total_proximidades,
        total_documentos: imovel.total_documentos,
        consulta_imovel_internauta: imovel.consulta_imovel_internauta
      }
    })

  } catch (error) {
    console.error('❌ Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error as Error).message },
      { status: 500 }
    )
  }
}







