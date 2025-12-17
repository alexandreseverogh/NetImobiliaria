import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import unifiedTwoFactorAuthService from '@/services/unifiedTwoFactorAuthService'
import { logAuditEvent } from '@/lib/audit/auditLogger'
import { logLoginAttempt as logSecurityLoginAttempt } from '@/lib/monitoring/securityMonitor'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

interface LoginRequest {
  email: string
  password: string
  userType: 'cliente' | 'proprietario'
  twoFactorCode?: string
}

type PublicLoginAction = 'login' | 'logout' | 'login_failed' | '2fa_required' | '2fa_success' | '2fa_failed'

async function logPublicLoginEvent(params: {
  userUuid?: string | null
  userType: 'cliente' | 'proprietario'
  email: string
  action: PublicLoginAction
  success: boolean
  twoFaUsed: boolean
  reason?: string
  ipAddress: string
  userAgent: string
}) {
  const {
    userUuid,
    userType,
    email,
    action,
    success,
    twoFaUsed,
    reason,
    ipAddress,
    userAgent
  } = params

  try {
    await pool.query(
      `
      INSERT INTO login_logs (
        user_id,
        username,
        action,
        ip_address,
        user_agent,
        two_fa_used,
        success,
        failure_reason,
        created_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
      [
        null,
        email,
        action,
        ipAddress,
        userAgent,
        twoFaUsed,
        success,
        reason || null
      ]
    )
  } catch (error) {
    console.error('❌ PUBLIC LOGIN - Falha ao registrar em login_logs (não crítico):', error)
  }

  const auditAction =
    action === 'login'
      ? (success ? 'PUBLIC_LOGIN_SUCCESS' : 'PUBLIC_LOGIN_ATTEMPT')
      : action === 'login_failed'
        ? 'PUBLIC_LOGIN_FAILED'
        : action === '2fa_required'
          ? 'PUBLIC_2FA_REQUIRED'
          : action === '2fa_success'
            ? 'PUBLIC_2FA_SUCCESS'
            : action === '2fa_failed'
              ? 'PUBLIC_2FA_FAILED'
              : 'PUBLIC_AUTH_EVENT'

  await logAuditEvent({
    userId: null,
    publicUserUuid: userUuid ?? null,
    userType,
    action: auditAction,
    resource: 'PUBLIC_AUTH',
    resourceId: null,
    details: {
      email,
      userType,
      userUuid: userUuid ?? null,
      action,
      success,
      twoFaUsed,
      reason: reason || null
    },
    ipAddress,
    userAgent
  })

  logSecurityLoginAttempt(ipAddress, userAgent, success, userUuid ?? email)
}

function extractRequestMeta(request: NextRequest): { ipAddress: string; userAgent: string } {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const clientIp = request.headers.get('x-client-ip')

  let ipAddress =
    forwardedFor?.split(',')[0].trim() ||
    realIp ||
    cfConnectingIp ||
    clientIp ||
    request.ip ||
    'unknown'

  if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'localhost') {
    ipAddress = process.env.LOCAL_IP || '192.168.1.100'
  }

  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { ipAddress, userAgent }
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password, userType, twoFactorCode } = body

    console.log('🔍 PUBLIC LOGIN - Tentativa de login:', { email, userType, has2FA: !!twoFactorCode })

    // Validar dados de entrada
    if (!email || !password || !userType) {
      return NextResponse.json(
        { success: false, message: 'Email, senha e tipo de usuário são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo de usuário
    if (userType !== 'cliente' && userType !== 'proprietario') {
      return NextResponse.json(
        { success: false, message: 'Tipo de usuário inválido' },
        { status: 400 }
      )
    }

    // Obter IP e User Agent
    const { ipAddress, userAgent } = extractRequestMeta(request)

    // Definir tabela baseado no tipo
    const tableName = userType === 'cliente' ? 'clientes' : 'proprietarios'

    console.log(`🔍 PUBLIC LOGIN - Buscando em tabela: ${tableName}`)

    // 1. Buscar usuário no banco
    // Nota: Ambas as tabelas (clientes e proprietarios) usam apenas 'uuid', não têm 'id'
    const userQuery = `
      SELECT 
        uuid, nome, cpf, email, telefone, password, two_fa_enabled,
        endereco, numero, bairro, estado_fk, cidade_fk, cep
      FROM ${tableName}
      WHERE email = $1
    `
    
    let userResult
    try {
      userResult = await pool.query(userQuery, [email])
    } catch (queryError: any) {
      console.error('❌ PUBLIC LOGIN - Erro na query SQL:', queryError.message)
      console.error('❌ PUBLIC LOGIN - Query:', userQuery)
      console.error('❌ PUBLIC LOGIN - Parâmetros:', [email])
      await logPublicLoginEvent({
        userUuid: null,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: `Erro na query SQL: ${queryError.message}`,
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar usuário. Tente novamente.' },
        { status: 500 }
      )
    }
    
    if (userResult.rows.length === 0) {
      console.log('❌ PUBLIC LOGIN - Usuário não encontrado:', email)
      await logPublicLoginEvent({
        userUuid: null,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: 'Usuário não encontrado',
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const user = userResult.rows[0]
    console.log('✅ PUBLIC LOGIN - Usuário encontrado:', user.nome, '| 2FA:', user.two_fa_enabled)
    console.log('🔍 PUBLIC LOGIN - Campos do usuário:', {
      uuid: user.uuid,
      uuidType: typeof user.uuid,
      email: user.email,
      two_fa_enabled: user.two_fa_enabled
    })

    const userUuid: string | null = user.uuid || null

    if (!userUuid) {
      console.error('❌ PUBLIC LOGIN - Usuário sem UUID cadastrado:', user.email)
      console.error('❌ PUBLIC LOGIN - Dados do usuário:', {
        uuid: user.uuid,
        uuidType: typeof user.uuid,
        hasUuid: !!user.uuid
      })
      await logPublicLoginEvent({
        userUuid: null,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: 'UUID não encontrado para o usuário',
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Conta com dados inconsistentes. Contate o suporte.' },
        { status: 500 }
      )
    }

    // 2. Verificar se senha existe e está válida
    if (!user.password) {
      console.error('❌ PUBLIC LOGIN - Usuário sem senha cadastrada:', user.uuid || 'N/A', user.email)
      await logPublicLoginEvent({
        userUuid,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: 'Senha não cadastrada',
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Conta sem senha cadastrada. Use a opção de recuperação de senha.' },
        { status: 401 }
      )
    }

    // 3. Verificar senha
    let passwordMatch = false
    try {
      passwordMatch = await bcrypt.compare(password, user.password)
    } catch (bcryptError: any) {
      console.error('❌ PUBLIC LOGIN - Erro ao comparar senha:', bcryptError.message)
      await logPublicLoginEvent({
        userUuid,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: `Erro ao validar senha: ${bcryptError.message}`,
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Erro ao validar credenciais. Tente novamente.' },
        { status: 500 }
      )
    }
    
    if (!passwordMatch) {
      console.log('❌ PUBLIC LOGIN - Senha incorreta para:', email)
      await logPublicLoginEvent({
        userUuid,
        userType,
        email,
        action: 'login_failed',
        success: false,
        twoFaUsed: false,
        reason: 'Senha incorreta',
        ipAddress,
        userAgent
      })
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    console.log('✅ PUBLIC LOGIN - Senha correta')

    // 4. Verificar se 2FA está habilitado
    const is2FAEnabled = user.two_fa_enabled === true
    
    if (is2FAEnabled) {
      console.log('🔐 PUBLIC LOGIN - 2FA está habilitado')
      
      // Se 2FA está habilitado mas código não foi fornecido
      if (!twoFactorCode) {
        console.log('📧 PUBLIC LOGIN - Enviando código 2FA por email')
        
        // Enviar código 2FA
        try {
          console.log('📧 PUBLIC LOGIN - Preparando envio de código 2FA:', { userUuid, userType, email })
          
          if (!userUuid) {
            throw new Error('userUuid é obrigatório para envio de código 2FA')
          }
          
          const codeSent = await unifiedTwoFactorAuthService.sendCodeByEmail({
            userUuid,
            userType,
            email: user.email,
            ipAddress,
            userAgent
          })
          
          if (codeSent) {
            console.log('✅ PUBLIC LOGIN - Código 2FA enviado com sucesso')
            await logPublicLoginEvent({
              userUuid,
              userType,
              email,
              action: '2fa_required',
              success: false,
              twoFaUsed: true,
              reason: 'Código 2FA enviado',
              ipAddress,
              userAgent
            })
            return NextResponse.json(
              {
                success: false,
                requires2FA: true,
                message: 'Código de verificação enviado por email'
              },
              { status: 200 }
            )
          } else {
            console.log('❌ PUBLIC LOGIN - Erro ao enviar código 2FA (retornou false)')
            await logPublicLoginEvent({
              userUuid,
              userType,
              email,
              action: '2fa_failed',
              success: false,
              twoFaUsed: true,
              reason: 'Erro ao enviar código 2FA (retornou false)',
              ipAddress,
              userAgent
            })
            return NextResponse.json(
              { success: false, message: 'Erro ao enviar código de verificação' },
              { status: 500 }
            )
          }
        } catch (twoFAError: any) {
          console.error('❌ PUBLIC LOGIN - Erro ao enviar código 2FA:', twoFAError)
          console.error('❌ PUBLIC LOGIN - Stack:', twoFAError?.stack)
          console.error('❌ PUBLIC LOGIN - Detalhes:', {
            message: twoFAError?.message,
            code: twoFAError?.code,
            detail: twoFAError?.detail,
            userUuid,
            userType
          })
          
          await logPublicLoginEvent({
            userUuid,
            userType,
            email,
            action: '2fa_failed',
            success: false,
            twoFaUsed: true,
            reason: `Erro ao enviar código 2FA: ${twoFAError?.message || 'Erro desconhecido'}`,
            ipAddress,
            userAgent
          })
          return NextResponse.json(
            { success: false, message: `Erro ao enviar código de verificação: ${twoFAError?.message || 'Erro desconhecido'}` },
            { status: 500 }
          )
        }
      } else {
        console.log('🔐 PUBLIC LOGIN - Validando código 2FA:', twoFactorCode)
        
        // Validar código 2FA
        const validationResult = await unifiedTwoFactorAuthService.validateCode({
          userUuid,
          userType,
          code: twoFactorCode,
          method: 'email'
        })
        
        if (!validationResult.valid) {
          console.log('❌ PUBLIC LOGIN - Código 2FA inválido:', validationResult.message)
          await logPublicLoginEvent({
            userUuid,
            userType,
            email,
            action: '2fa_failed',
            success: false,
            twoFaUsed: true,
            reason: validationResult.message,
            ipAddress,
            userAgent
          })
          return NextResponse.json(
            { success: false, message: validationResult.message },
            { status: 401 }
          )
        }
        
        console.log('✅ PUBLIC LOGIN - Código 2FA válido')
        await logPublicLoginEvent({
          userUuid,
          userType,
          email,
          action: '2fa_success',
          success: true,
          twoFaUsed: true,
          reason: 'Código 2FA aprovado',
          ipAddress,
          userAgent
        })
      }
    }

    // 5. Gerar JWT
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    
    const jwtPayload = {
      userUuid,
      userType,
      email: user.email,
      nome: user.nome,
      cpf: user.cpf,
      is2FAEnabled: is2FAEnabled
    }
    
    const token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: '24h'
    } as SignOptions)

    console.log('✅ PUBLIC LOGIN - Login bem-sucedido:', user.nome)

    await logPublicLoginEvent({
      userUuid,
      userType,
      email,
      action: 'login',
      success: true,
      twoFaUsed: is2FAEnabled,
      ipAddress,
      userAgent
    })

    // 6. Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: {
          uuid: userUuid,
          nome: user.nome,
          email: user.email,
          cpf: user.cpf,
          telefone: user.telefone,
          userType: userType,
          is2FAEnabled: is2FAEnabled,
          endereco: user.endereco,
          numero: user.numero,
          bairro: user.bairro,
          estado_fk: user.estado_fk,
          cidade_fk: user.cidade_fk,
          cep: user.cep
        }
      }
    })

  } catch (error: any) {
    console.error('❌ PUBLIC LOGIN - Erro no login:', error)
    console.error('❌ PUBLIC LOGIN - Stack trace:', error?.stack)
    console.error('❌ PUBLIC LOGIN - Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    })
    
    try {
      const { ipAddress, userAgent } = extractRequestMeta(request)
      await logAuditEvent({
        userId: null,
        publicUserUuid: null,
        userType: 'proprietario', // Tentar inferir do contexto
        action: 'PUBLIC_LOGIN_ERROR',
        resource: 'PUBLIC_AUTH',
        resourceId: null,
        details: {
          error: error instanceof Error ? error.message : 'erro desconhecido',
          stack: error?.stack,
          code: error?.code
        },
        ipAddress,
        userAgent
      })
    } catch (logError) {
      console.error('❌ PUBLIC LOGIN - Falha ao registrar auditoria de erro:', logError)
    }
    
    // Retornar mensagem de erro mais específica se possível
    const errorMessage = error?.message?.includes('password') 
      ? 'Erro ao validar credenciais. Verifique se sua conta está configurada corretamente.'
      : error?.message?.includes('query') || error?.message?.includes('SQL')
      ? 'Erro ao acessar banco de dados. Tente novamente em alguns instantes.'
      : 'Erro interno do servidor. Tente novamente ou entre em contato com o suporte.'
    
    return NextResponse.json(
      { success: false, message: errorMessage, error: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}

