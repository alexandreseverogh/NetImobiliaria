import { NextRequest, NextResponse } from 'next/server'
import { createCliente } from '@/lib/database/clientes'
import { createProprietario } from '@/lib/database/proprietarios'
import { validateCPF, validateEmail, validateCNPJ } from '@/lib/utils/formatters'
import { logAuditEvent, extractRequestData } from '@/lib/audit/auditLogger'
import pool from '@/lib/database/connection'

type PublicRegisterLogAction = 'register' | 'register_failed'

function getRequestMeta(request: NextRequest): { ipAddress: string; userAgent: string } {
  const { ipAddress, userAgent } = extractRequestData(request)
  return {
    ipAddress:
      ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'localhost'
        ? process.env.LOCAL_IP || '192.168.1.100'
        : ipAddress,
    userAgent
  }
}

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

interface RegisterRequest {
  userType: 'cliente' | 'proprietario'
  nome: string
  cpf?: string
  cnpj?: string
  email: string
  telefone: string
  password: string
  endereco?: string
  numero?: string
  bairro?: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
}

async function logPublicRegisterEvent(params: {
  action: PublicRegisterLogAction
  success: boolean
  reason: string
  email: string
  userType: 'cliente' | 'proprietario'
  ipAddress: string
  userAgent: string
  userUuid?: string | null
  extraDetails?: Record<string, unknown>
}) {
  const {
    action,
    success,
    reason,
    email,
    userType,
    ipAddress,
    userAgent,
    userUuid,
    extraDetails
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
        false,
        success,
        reason
      ]
    )
  } catch (error) {
    console.error('❌ PUBLIC REGISTER - Falha ao registrar em login_logs (não crítico):', error)
  }

  await logAuditEvent({
    userId: null,
    publicUserUuid: userUuid ?? null,
    userType,
    action: action === 'register' && success ? 'PUBLIC_REGISTER_SUCCESS' : 'PUBLIC_REGISTER_FAILED',
    resource: 'PUBLIC_REGISTER',
    resourceId: null,
    details: {
      email,
      userType,
      userUuid: userUuid ?? null,
      reason,
      success,
      ...(extraDetails ?? {})
    },
    ipAddress,
    userAgent
  })
}

export async function POST(request: NextRequest) {
  let email = ''
  let userType: 'cliente' | 'proprietario' = 'cliente'
  let cpf = ''
  let cnpj = ''
  let createdUserUuid: string | null = null

  try {
    const body: RegisterRequest = await request.json()
    userType = body.userType
    const { nome, telefone, password, ...enderecoData } = body
    email = body.email
    cpf = body.cpf || ''
    cnpj = body.cnpj || ''

    console.log('📝 PUBLIC REGISTER - Tentativa de cadastro:', { email, userType })

    const { ipAddress, userAgent } = getRequestMeta(request)

    const logFailure = async (reason: string) => {
      await logPublicRegisterEvent({
        action: 'register_failed',
        success: false,
        reason,
        email,
        userType,
        ipAddress,
        userAgent,
        extraDetails: { cpf, cnpj }
      })
    }

    if (!userType || !nome || (!cpf && !cnpj) || !email || !telefone || !password) {
      await logFailure('Campos obrigatórios ausentes')
      return NextResponse.json(
        {
          success: false,
          message: 'Campos obrigatórios: tipo de usuário, nome, documento (CPF ou CNPJ), email, telefone e senha'
        },
        { status: 400 }
      )
    }

    if (userType !== 'cliente' && userType !== 'proprietario') {
      await logFailure('Tipo de usuário inválido')
      return NextResponse.json(
        { success: false, message: 'Tipo de usuário inválido' },
        { status: 400 }
      )
    }

    if (cpf && !validateCPF(cpf, true)) {
      await logFailure('CPF inválido')
      return NextResponse.json(
        { success: false, message: 'CPF inválido' },
        { status: 400 }
      )
    }

    if (cnpj && !validateCNPJ(cnpj)) {
      await logFailure('CNPJ inválido')
      return NextResponse.json(
        { success: false, message: 'CNPJ inválido' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      await logFailure('Email inválido')
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      await logFailure('Senha muito curta')
      return NextResponse.json(
        {
          success: false,
          message: 'A senha deve ter no mínimo 8 caracteres'
        },
        { status: 400 }
      )
    }

    console.log('✅ PUBLIC REGISTER - Validações iniciais OK')

    const rawEndereco = (enderecoData as Record<string, any>) || {}

    const logradouro = rawEndereco.logradouro ?? rawEndereco.endereco ?? null
    const bairro = rawEndereco.bairro ?? null
    const cidade = rawEndereco.cidade ?? rawEndereco.cidade_fk ?? null
    const estado = rawEndereco.estado ?? rawEndereco.estado_fk ?? null
    const enderecoCep = rawEndereco.cep ?? rawEndereco.endereco_cep ?? null
    const enderecoNumero = rawEndereco.numero ?? rawEndereco.numero_endereco ?? null
    const enderecoComplemento = rawEndereco.complemento ?? null

    const estadoFk = rawEndereco.estado_fk ?? estado ?? null
    const cidadeFk = rawEndereco.cidade_fk ?? cidade ?? null

    const userData: any = {
      nome,
      cpf: cpf || undefined,
      cnpj: cnpj || undefined,
      email,
      telefone,
      password,
      logradouro,
      bairro,
      cidade,
      estado,
      cep: enderecoCep,
      numero: enderecoNumero,
      complemento: enderecoComplemento,
      endereco: logradouro,
      estado_fk: estadoFk,
      cidade_fk: cidadeFk,
      origem_cadastro: 'Publico',
      created_by: 'public_register'
    }

    console.log('📋 PUBLIC REGISTER - Dados preparados para criação')

    let newUser

    try {
      if (userType === 'cliente') {
        console.log('👤 PUBLIC REGISTER - Criando cliente...')
        newUser = await createCliente(userData)
        console.log('✅ PUBLIC REGISTER - Cliente criado com sucesso:', newUser.uuid)
      } else {
        console.log('🏢 PUBLIC REGISTER - Criando proprietário...')
        newUser = await createProprietario(userData, true)
        console.log('✅ PUBLIC REGISTER - Proprietário criado com sucesso:', newUser.uuid)
      }
    } catch (error: any) {
      console.error('❌ PUBLIC REGISTER - Erro ao criar usuário:', error)

      const reason = error?.message ?? 'Erro ao criar cadastro'
      if (error.message?.includes('CPF já cadastrado')) {
        await logFailure('CPF já cadastrado')
        return NextResponse.json(
          { success: false, message: 'CPF já cadastrado' },
          { status: 409 }
        )
      }

      if (error.message?.includes('CNPJ já cadastrado')) {
        await logFailure('CNPJ já cadastrado')
        return NextResponse.json(
          { success: false, message: 'CNPJ já cadastrado' },
          { status: 409 }
        )
      }

      if (error.message?.includes('Email já cadastrado')) {
        await logFailure('Email já cadastrado')
        return NextResponse.json(
          { success: false, message: 'Email já cadastrado' },
          { status: 409 }
        )
      }

      await logFailure(reason)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar cadastro' },
        { status: 500 }
      )
    }

    createdUserUuid = newUser.uuid || null
    console.log('🎉 PUBLIC REGISTER - Cadastro concluído com sucesso')

    await logPublicRegisterEvent({
      action: 'register',
      success: true,
      reason: 'PUBLIC_REGISTER_SUCCESS',
      email: newUser.email,
      userType,
      userUuid: createdUserUuid,
      ipAddress,
      userAgent,
      extraDetails: { cpf: newUser.cpf, cnpj: (newUser as any).cnpj, origem: (newUser as any).origem_cadastro }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Cadastro realizado com sucesso! Faça login para acessar sua conta.',
        data: {
          uuid: newUser.uuid,
          nome: newUser.nome,
          email: newUser.email,
          cpf: newUser.cpf,
          cnpj: (newUser as any).cnpj,
          userType
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ PUBLIC REGISTER - Erro no cadastro:', error)

    try {
      const { ipAddress, userAgent } = getRequestMeta(request)
      await logPublicRegisterEvent({
        action: 'register_failed',
        success: false,
        reason: error instanceof Error ? error.message : 'erro desconhecido',
        email,
        userType,
        userUuid: createdUserUuid,
        ipAddress,
        userAgent,
        extraDetails: { cpf }
      })
    } catch (logError) {
      console.error('❌ PUBLIC REGISTER - Falha ao registrar auditoria de erro:', logError)
    }

    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
