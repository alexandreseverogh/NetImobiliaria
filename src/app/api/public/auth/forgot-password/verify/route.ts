import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const { email, code, userType } = await request.json()

        if (!email || !code || !userType) {
            return NextResponse.json(
                { success: false, message: 'Dados incompletos' },
                { status: 400 }
            )
        }

        const tableName = userType === 'cliente' ? 'clientes' :
            userType === 'proprietario' ? 'proprietarios' : 'users'
        const idField = (userType === 'admin' || userType === 'corretor' || tableName === 'users') ? 'id' : 'uuid'

        console.log(`🔍 FORGOT-PASSWORD VERIFY - Buscando usuário: ${email} em ${tableName} (${idField})`)

        // 1. Buscar UUID do usuário
        const userResult = await pool.query(
            `SELECT ${idField} as id FROM ${tableName} WHERE email = $1`,
            [email]
        )

        if (userResult.rows.length === 0) {
            console.error(`❌ FORGOT-PASSWORD VERIFY - Usuário não encontrado: ${email}`)
            return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 })
        }

        const userUuid = userResult.rows[0].id
        console.log(`✅ FORGOT-PASSWORD VERIFY - UUID encontrado: ${userUuid}. Validando código: ${code}`)

        // 2. Validar código na tabela user_2fa_codes
        // Usando a mesma lógica de fuso horário do unifiedTwoFactorAuthService
        const codeResult = await pool.query(
            `SELECT id FROM user_2fa_codes 
             WHERE user_id = $1::uuid 
             AND (TRIM(code) = TRIM($2))
             AND method = 'password_reset' 
             AND used = false 
             AND expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
             ORDER BY created_at DESC LIMIT 1`,
            [userUuid, code]
        )

        if (codeResult.rows.length === 0) {
            console.error(`❌ FORGOT-PASSWORD VERIFY - Código inválido ou expirado para ${email}`)
            return NextResponse.json({ success: false, message: 'Código inválido ou expirado' }, { status: 401 })
        }

        // 3. Marcar código como usado
        await pool.query('UPDATE user_2fa_codes SET used = true WHERE id = $1', [codeResult.rows[0].id])

        // 4. Gerar token temporário para reset (válido por 10 minutos)
        const resetToken = jwt.sign(
            {
                userUuid,
                userType,
                purpose: 'password_reset_confirmed'
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '10m' }
        )

        return NextResponse.json({
            success: true,
            resetToken,
            message: 'Código validado com sucesso. Defina sua nova senha.'
        })

    } catch (error: any) {
        console.error('❌ FORGOT PASSWORD VERIFY ERROR:', error)
        return NextResponse.json(
            { success: false, message: 'Erro ao validar código.' },
            { status: 500 }
        )
    }
}
