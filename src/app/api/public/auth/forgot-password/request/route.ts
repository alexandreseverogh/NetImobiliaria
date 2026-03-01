import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import unifiedTwoFactorAuthService from '@/services/unifiedTwoFactorAuthService'
import emailService from '@/services/emailService'
import { logAuditEvent } from '@/lib/audit/auditLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const { email, userType } = await request.json()

        if (!email || !userType) {
            return NextResponse.json(
                { success: false, message: 'Email e tipo de usuário são obrigatórios' },
                { status: 400 }
            )
        }

        const tableName = userType === 'cliente' ? 'clientes' :
            userType === 'proprietario' ? 'proprietarios' : 'users'
        const idField = userType === 'admin' || userType === 'corretor' ? 'id' : 'uuid'

        // 1. Verificar se o usuário existe
        const userResult = await pool.query(
            `SELECT ${idField} as id, nome, email FROM ${tableName} WHERE email = $1`,
            [email]
        )

        if (userResult.rows.length === 0) {
            // Por segurança, retornamos sucesso mesmo se não encontrar (evita enumeração de usuários)
            // Mas nos logs internos registramos a falha
            console.log(`🔍 FORGOT PASSWORD - Email não encontrado: ${email} na tabela ${tableName}`)
            return NextResponse.json({
                success: true,
                message: 'Se o e-mail estiver cadastrado, um código de recuperação será enviado.'
            })
        }

        const user = userResult.rows[0]

        // 2. Gerar e enviar código (Reutilizando infraestrutura de 2FA)
        // Vamos usar o método sendCodeByEmail do unifiedTwoFactorAuthService, 
        // mas ele espera um UUID. Para o admin/corretor (users), o campo é 'id'.
        const userUuid = user.id

        const forwardedFor = request.headers.get('x-forwarded-for')
        const ipAddress = forwardedFor?.split(',')[0].trim() || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Enviar código usando o template de recuperação (ou 2fa como fallback)
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // Salvar o código com um método específico para sabermos que é recuperação de senha
        // Usamos fuso horário de Brasília para consistência com unifiedTwoFactorAuthService
        await pool.query(
            `INSERT INTO user_2fa_codes (user_id, user_type, code, method, expires_at, ip_address, user_agent, created_at)
             VALUES ($1::uuid, $2, $3, $4, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' + interval '15 minutes'), $5, $6, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))`,
            [userUuid, userType === 'corretor' ? 'admin' : userType, code, 'password_reset', ipAddress, userAgent]
        )

        // Enviar o e-mail
        try {
            await emailService.initialize()

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const resetLink = `${appUrl}/landpaging?reset_email=${encodeURIComponent(email)}&reset_code=${code}&reset_type=${userType}`

            // Tenta usar um template específico de recuperação, senão usa o de 2FA
            let emailSent = false
            try {
                emailSent = await emailService.sendTemplateEmail('password_reset', email, {
                    nome: user.nome,
                    code,
                    expiration_hours: '0.25', // 15 minutos em horas
                    reset_link: resetLink
                })
            } catch (templateError) {
                console.warn('⚠️ Erro ao usar template password_reset, usando fallback:', templateError)
                // Fallback para o template de 2FA se o de reset não existir
                emailSent = await emailService.sendTemplateEmail('2fa_verification', email, {
                    code,
                    expiration_minutes: '15'
                })
            }

            if (!emailSent) throw new Error('Falha ao enviar e-mail')

        } catch (error) {
            console.error('❌ FORGOT PASSWORD - Erro ao enviar e-mail:', error)
            return NextResponse.json(
                { success: false, message: 'Erro ao enviar e-mail de recuperação. Tente novamente.' },
                { status: 500 }
            )
        }

        // 3. Registrar auditoria
        await logAuditEvent({
            userId: userType === 'admin' || userType === 'corretor' ? user.id : null,
            publicUserUuid: userType === 'cliente' || userType === 'proprietario' ? user.id : null,
            userType: userType as any,
            action: 'PASSWORD_RESET_REQUESTED',
            resource: 'AUTH',
            resourceId: user.id,
            details: { email, ipAddress },
            ipAddress,
            userAgent
        })

        return NextResponse.json({
            success: true,
            message: 'Código de recuperação enviado com sucesso para seu e-mail.'
        })

    } catch (error: any) {
        console.error('❌ FORGOT PASSWORD REQUEST ERROR:', error)
        return NextResponse.json(
            { success: false, message: 'Erro interno ao processar solicitação.' },
            { status: 500 }
        )
    }
}
