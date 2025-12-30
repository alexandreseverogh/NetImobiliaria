import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = request.cookies.get('accessToken')?.value
  return cookie || null
}

async function getLoggedUser(request: NextRequest) {
  const token = getToken(request)
  if (!token) return null

  try {
    const decoded: any = verifyTokenNode(token)
    return decoded?.userId || null
  } catch (error) {
    console.error('❌ Erro ao decodificar token:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getLoggedUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const pool = (await import('@/lib/database/connection')).default
    const query = `
      SELECT id, estado_fk, cidade_fk, created_at 
      FROM public.corretor_areas_atuacao 
      WHERE corretor_fk = $1::uuid 
      ORDER BY estado_fk, cidade_fk
    `
    const result = await pool.query(query, [userId])
    return NextResponse.json({ success: true, areas: result.rows })
  } catch (error: any) {
    console.error('❌ Erro ao buscar áreas de atuação:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getLoggedUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const { estado_fk, cidade_fk } = await request.json()

    if (!estado_fk || !cidade_fk) {
      return NextResponse.json({ success: false, error: 'Estado e Cidade são obrigatórios' }, { status: 400 })
    }

    const pool = (await import('@/lib/database/connection')).default

    // Verificar se já existe
    const checkQuery = `
      SELECT id FROM public.corretor_areas_atuacao 
      WHERE corretor_fk = $1::uuid AND estado_fk = $2 AND cidade_fk = $3
    `
    const checkResult = await pool.query(checkQuery, [userId, estado_fk, cidade_fk])
    
    if (checkResult.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Esta área já está cadastrada' }, { status: 400 })
    }

    const insertQuery = `
      INSERT INTO public.corretor_areas_atuacao (corretor_fk, estado_fk, cidade_fk, created_by)
      VALUES ($1::uuid, $2, $3, $1::uuid)
      RETURNING id, estado_fk, cidade_fk, created_at
    `
    const result = await pool.query(insertQuery, [userId, estado_fk, cidade_fk])

    return NextResponse.json({ success: true, area: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Erro ao cadastrar área de atuação:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getLoggedUser(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 })
    }

    const pool = (await import('@/lib/database/connection')).default
    const query = `
      DELETE FROM public.corretor_areas_atuacao 
      WHERE id = $1 AND corretor_fk = $2::uuid
      RETURNING id
    `
    const result = await pool.query(query, [id, userId])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Área não encontrada ou não pertence a você' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Área removida com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao remover área de atuação:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
