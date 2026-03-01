import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logAuditEvent } from '@/lib/audit/auditLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const { resetToken, newPassword } = await request.json()

        if (!resetToken || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Dados incompletos para redefinição' },
                { status: 400 }
            )
        }

        // 1. Validar Token de Reset
        let decoded: any
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'fallback-secret')
            if (decoded.purpose !== 'password_reset_confirmed') throw new Error('Token inválido')
        } catch (err) {
            return NextResponse.json({ success: false, message: 'Sessão de redefinição expirada ou inválida' }, { status: 401 })
        }

        const { userUuid, userType } = decoded
        const tableName = userType === 'cliente' ? 'clientes' :
            userType === 'proprietario' ? 'proprietarios' : 'users'
        const idField = userType === 'admin' || userType === 'corretor' ? 'id' : 'uuid'

        // 2. Hash da nova senha
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        // 3. Atualizar no Banco
        // Nota: clientes e proprietarios usam 'password', users usa 'password' também
        const updateResult = await pool.query(
            `UPDATE ${tableName} SET password = $1 WHERE ${idField} = $2::uuid RETURNING email`,
            [hashedPassword, userUuid]
        )

        if (updateResult.rowCount === 0) {
            return NextResponse.json({ success: false, message: 'Usuário não encontrado para atualização' }, { status: 404 })
        }

        const userEmail = updateResult.rows[0].email

        // 4. Auditoria
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ipAddress = forwardedFor?.split(',')[0].trim() || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        await logAuditEvent({
            userId: userType === 'admin' || userType === 'corretor' ? userUuid : null,
            publicUserUuid: userType === 'cliente' || userType === 'proprietario' ? userUuid : null,
            userType: userType as any,
            action: 'PASSWORD_CHANGED_VIA_RESET',
            resource: 'AUTH',
            resourceId: userUuid,
            details: { email: userEmail, method: 'forgot_password_workflow' },
            ipAddress,
            userAgent
        })

        return NextResponse.json({
            success: true,
            message: 'Sua senha foi redefinida com sucesso! Agora você pode entrar.'
        })

    } catch (error: any) {
        console.error('❌ FORGOT PASSWORD RESET FINAL ERROR:', error)
        return NextResponse.json(
            { success: false, message: 'Erro ao redefinir senha.' },
            { status: 500 }
        )
    }
}
