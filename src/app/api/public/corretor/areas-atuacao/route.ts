import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

export const runtime = 'nodejs'

async function getLoggedUser(request: NextRequest): Promise<{ userId: string | null, tenantId?: string, isMaster?: boolean, error?: string }> {
  const token = getTokenFromRequest(request)
  if (!token) return { userId: null, error: 'Token não encontrado (Header ou Cookie)' }

  try {
    const decoded = await verifyToken(token)
    if (!decoded) return { userId: null, error: 'Token inválido ou expirado' }
    return { 
      userId: decoded.userId,
      tenantId: (decoded as any).tenantId,
      isMaster: (decoded as any).is_system_role === true
    }
  } catch (error: any) {
    console.error('❌ Erro ao decodificar token:', error)
    return { userId: null, error: `Erro na verificação: ${error.message}` }
  }
}

export async function GET(request: NextRequest) {
  console.log('🔍 [AREAS_ATUACAO] GET request received');
  try {
    const userResult = await getLoggedUser(request)
    console.log('🔍 [AREAS_ATUACAO] getLoggedUser result:', userResult);

    const { userId, error } = userResult;
    if (!userId) {
      console.warn(`⚠️ [AREAS_ATUACAO] Acesso negado. Motivo: ${error}`)
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 401 })
    }

    console.log('🔍 [AREAS_ATUACAO] Using pool...');
    console.log('🔍 [AREAS_ATUACAO] Querying database for userId:', userId);

    // Validar se o userId é um UUID válido para evitar erro do Postgres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn(`⚠️ [AREAS_ATUACAO] userId inválido (não é UUID): ${userId}`);
      return NextResponse.json({ success: false, error: 'Identificador de usuário inválido' }, { status: 401 });
    }

    const query = `
      SELECT id, estado_fk, cidade_fk, created_at
      FROM public.atendente_area_atuacao
      WHERE corretor_fk = $1::uuid AND (tenant_id = $2 OR $2 IS NULL)
      ORDER BY estado_fk, cidade_fk
    `
    const result = await pool.query(query, [userId, userResult.tenantId || null])
    console.log('✅ [AREAS_ATUACAO] Query result size:', result.rows.length);

    return NextResponse.json({ success: true, areas: result.rows })
  } catch (error: any) {
    console.error('❌ [AREAS_ATUACAO] Erro ao buscar áreas de atuação:', error)
    if (error.stack) console.error(error.stack);

    // DEBUG: Write to ABSOLUTE path
    try {
      const fs = require('fs');
      // Hardcoded path to ensure we can find it
      const logPath = 'C:/NetImobiliária/net-imobiliaria/debug_route_error.log';
      const timestamp = new Date().toISOString();
      const msg = `\n[${timestamp}] [GET] Error: ${error.message}\nStack: ${error.stack}\nUserContext: ${JSON.stringify(request.headers.get('cookie'))}\n`;
      fs.appendFileSync(logPath, msg);
    } catch (e) { console.error('Error writing log file', e); }

    // FORCE return detailed error
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, tenantId, error } = await getLoggedUser(request)
    if (!userId) {
      console.warn(`⚠️ [AREAS_ATUACAO] POST negado. Motivo: ${error}`)
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 401 })
    }

    const { estado_fk, cidade_fk } = await request.json()

    if (!estado_fk || !cidade_fk) {
      return NextResponse.json({ success: false, error: 'Estado e Cidade são obrigatórios' }, { status: 400 })
    }

    const pool = (await import('@/lib/database/connection')).default

    // Validar se o userId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ success: false, error: 'Identificador de usuário inválido' }, { status: 401 });
    }

    // Verificar se já existe no contexto deste tenant
    const checkQuery = `
      SELECT id FROM public.atendente_area_atuacao
      WHERE corretor_fk = $1::uuid AND estado_fk = $2 AND cidade_fk = $3 AND (tenant_id = $4 OR $4 IS NULL)
    `
    const checkResult = await pool.query(checkQuery, [userId, estado_fk, cidade_fk, tenantId || null])

    if (checkResult.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Esta área já está cadastrada' }, { status: 400 })
    }

    const tenantIdToUse = tenantId || '00000000-0000-0000-0000-000000000001'

    const insertQuery = `
      INSERT INTO public.atendente_area_atuacao (corretor_fk, estado_fk, cidade_fk, created_by, tenant_id)
      VALUES ($1::uuid, $2, $3, $1::uuid, $4)
      RETURNING id, estado_fk, cidade_fk, created_at
    `
    const result = await pool.query(insertQuery, [userId, estado_fk, cidade_fk, tenantIdToUse])

    return NextResponse.json({ success: true, area: result.rows[0] })
  } catch (error: any) {
    console.error('❌ [AREAS_ATUACAO] Erro ao cadastrar área de atuação:', error)
    if (error.stack) console.error(error.stack);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, error } = await getLoggedUser(request)
    if (!userId) {
      console.warn(`⚠️ [AREAS_ATUACAO] DELETE negado. Motivo: ${error}`)
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 })
    }

    const pool = (await import('@/lib/database/connection')).default

    // Validar se o userId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ success: false, error: 'Identificador de usuário inválido' }, { status: 401 });
    }

    const query = `
      DELETE FROM public.atendente_area_atuacao
      WHERE id = $1 AND corretor_fk = $2::uuid AND (tenant_id = $3 OR $3 IS NULL)
      RETURNING id
    `
    const { tenantId } = await getLoggedUser(request)
    const result = await pool.query(query, [id, userId, tenantId || null])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Área não encontrada ou não pertence a você' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Área removida com sucesso' })
  } catch (error: any) {
    console.error('❌ [AREAS_ATUACAO] Erro ao remover área de atuação:', error)
    if (error.stack) console.error(error.stack);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
