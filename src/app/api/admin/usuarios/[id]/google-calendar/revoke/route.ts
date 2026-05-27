import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

/**
 * Revoga autorização do Google Calendar de um usuário (Admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiPermission(request, 'usuarios', 'UPDATE')
    if (denied) return denied

    const auth = await verifyAuthOrRespond(request)
    // 🛡️ SEGURANÇA: Apenas o próprio usuário ou Administrador Master/com permissão podem fazer isso
    const targetUserId = params.id
    const currentUserId = auth.payload!.userId
    
    const isMaster = (auth.payload as any)?.is_system_role === true
    
    if (targetUserId !== currentUserId && !isMaster) {
      // Nota: Poderia verificar permissão específica 'UPDATE' em 'usuarios' aqui se necessário
      return NextResponse.json({ error: 'Acesso negado: você só pode revogar seu próprio acesso' }, { status: 403 })
    }

    const query = `
      UPDATE users 
      SET google_refresh_token = NULL, google_calendar_authorized = false 
      WHERE id = $1
    `
    await pool.query(query, [targetUserId])

    return NextResponse.json({ success: true, message: 'Acesso Google Calendar revogado' })
  } catch (error) {
    console.error('Erro ao revogar acesso Google:', error)
    return NextResponse.json({ error: 'Erro interno ao revogar acesso' }, { status: 500 })
  }
}
