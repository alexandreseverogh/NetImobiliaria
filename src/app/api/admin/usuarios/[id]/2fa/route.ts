import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import pool from '@/lib/database/connection'

/**
 * PATCH - Habilitar/Desabilitar 2FA para um usuário específico (admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 API 2FA - Iniciando...')
    
    // 1. Buscar dados do usuário-alvo
    const userId = params.id
    console.log('🔐 API 2FA - User ID:', userId)

    // Buscar email do usuário-alvo
    console.log('🔐 API 2FA - Buscando usuário...')
    const userQuery = await pool.query(
      'SELECT id, email, nome, username FROM users WHERE id = $1',
      [userId]
    )
    console.log('🔐 API 2FA - Usuário encontrado:', userQuery.rows.length)

    if (userQuery.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const user = userQuery.rows[0]
    console.log('🔐 API 2FA - Dados do usuário:', user)

    // 3. Buscar configuração atual de 2FA
    console.log('🔐 API 2FA - Buscando configuração 2FA...')
    const configQuery = await pool.query(
      'SELECT is_enabled FROM user_2fa_config WHERE user_id = $1::uuid AND method = $2',
      [userId, 'email']
    )
    const currentState = configQuery.rows.length > 0 && configQuery.rows[0].is_enabled
    console.log('🔐 API 2FA - Estado atual:', currentState)

    // 4. Buscar dados do body (toggle)
    console.log('🔐 API 2FA - Lendo body...')
    const { enable } = await request.json()
    console.log('🔐 API 2FA - Enable:', enable)

    const newState = enable === true

    // Se o estado não vai mudar, retornar sucesso
    if (currentState === newState) {
      return NextResponse.json({
        success: true,
        message: `2FA já está ${newState ? 'habilitado' : 'desabilitado'}`,
        data: {
          user_id: userId,
          is_enabled: currentState
        }
      })
    }

    // 5. Atualizar configuração 2FA
    if (newState) {
      // Habilitar 2FA
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.floor(100000 + Math.random() * 900000).toString()
      )

      const hashedBackupCodes = backupCodes.map(code => {
        const crypto = require('crypto')
        return crypto.createHash('sha256').update(code).digest('hex')
      })

      // Atualizar tabela user_2fa_config
      await pool.query(
        `INSERT INTO user_2fa_config (user_id, method, is_enabled, backup_codes, created_at, updated_at)
         VALUES ($1::uuid, 'email', true, $2, NOW(), NOW())
         ON CONFLICT (user_id, method) 
         DO UPDATE SET 
           is_enabled = true,
           backup_codes = $2,
           updated_at = NOW()`,
        [userId, hashedBackupCodes]
      )

      // Atualizar tabela users também
      await pool.query(
        'UPDATE users SET two_fa_enabled = true WHERE id = $1',
        [userId]
      )

      // Log de auditoria
      try {
        await pool.query(
          `INSERT INTO audit_2fa_logs (user_id, action, method, ip_address, user_agent, details, created_at)
           VALUES ($1::uuid, '2fa_enabled_by_admin', 'email', $2, $3, $4, NOW())`,
          [userId, request.headers.get('x-forwarded-for') || 'unknown', request.headers.get('user-agent') || 'unknown', JSON.stringify({ enabled_by: 'admin' })]
        )
      } catch (logError) {
        console.error('Erro ao logar auditoria:', logError)
      }

    } else {
      // Desabilitar 2FA
      await pool.query(
        'UPDATE user_2fa_config SET is_enabled = false, updated_at = NOW() WHERE user_id = $1::uuid',
        [userId]
      )

      // Atualizar tabela users também
      await pool.query(
        'UPDATE users SET two_fa_enabled = false WHERE id = $1',
        [userId]
      )

      // Invalidar códigos pendentes
      await pool.query(
        'UPDATE user_2fa_codes SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      )

      // Log de auditoria
      try {
        await pool.query(
          `INSERT INTO audit_2fa_logs (user_id, action, method, ip_address, user_agent, details, created_at)
           VALUES ($1::uuid, '2fa_disabled_by_admin', 'email', $2, $3, $4, NOW())`,
          [userId, request.headers.get('x-forwarded-for') || 'unknown', request.headers.get('user-agent') || 'unknown', JSON.stringify({ disabled_by: 'admin' })]
        )
      } catch (logError) {
        console.error('Erro ao logar auditoria:', logError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `2FA ${newState ? 'habilitado' : 'desabilitado'} com sucesso`,
      data: {
        user_id: userId,
        username: user.username,
        email: user.email,
        is_enabled: newState
      }
    })

  } catch (error) {
    console.error('❌ ERRO ao alterar 2FA:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

