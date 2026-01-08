/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { userHasPermission } from '@/lib/database/users'
import { findImovelById } from '@/lib/database/imoveis'
import { 
  findAmenidadesByImovel, 
  updateImovelAmenidades, 
  addAmenidadeToImovel, 
  removeAmenidadeFromImovel 
} from '@/lib/database/amenidades'

// Listar amenidades do imóvel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    // Buscar amenidades do imóvel
    const amenidades = await findAmenidadesByImovel(id)
    
    return NextResponse.json({
      success: true,
      data: amenidades
    })

  } catch (error) {
    console.error('Erro ao listar amenidades do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Atualizar amenidades do imóvel (substitui todas)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'WRITE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { amenidades } = body

    if (!Array.isArray(amenidades)) {
      return NextResponse.json(
        { error: 'Lista de amenidades inválida' },
        { status: 400 }
      )
    }

    // Validar IDs das amenidades
    const amenidadeIds = amenidades.map(id => parseInt(id)).filter(id => !isNaN(id))
    
    if (amenidadeIds.length !== amenidades.length) {
      return NextResponse.json(
        { error: 'IDs de amenidades inválidos' },
        { status: 400 }
      )
    }

    // Atualizar amenidades
    await updateImovelAmenidades(id, amenidadeIds)

    return NextResponse.json({
      success: true,
      message: 'Amenidades atualizadas com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar amenidades do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Adicionar amenidade ao imóvel
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'WRITE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { amenidadeId, observacoes } = body

    if (!amenidadeId || isNaN(parseInt(amenidadeId))) {
      return NextResponse.json(
        { error: 'ID da amenidade é obrigatório' },
        { status: 400 }
      )
    }

    // Adicionar amenidade
    const relacionamentoId = await addAmenidadeToImovel(id, parseInt(amenidadeId), observacoes)

    return NextResponse.json({
      success: true,
      message: 'Amenidade adicionada com sucesso',
      data: { id: relacionamentoId }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao adicionar amenidade ao imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Remover amenidade do imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'WRITE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const amenidadeId = searchParams.get('amenidadeId')

    if (!amenidadeId || isNaN(parseInt(amenidadeId))) {
      return NextResponse.json(
        { error: 'ID da amenidade é obrigatório' },
        { status: 400 }
      )
    }

    // Remover amenidade
    const sucesso = await removeAmenidadeFromImovel(id, parseInt(amenidadeId))

    if (!sucesso) {
      return NextResponse.json(
        { error: 'Amenidade não encontrada no imóvel' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Amenidade removida com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover amenidade do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}





