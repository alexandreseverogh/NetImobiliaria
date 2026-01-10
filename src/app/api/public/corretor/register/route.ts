import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { getClientIP } from '@/lib/utils/ipUtils'
import { createUser } from '@/lib/database/users'
import { validateCPF } from '@/lib/utils/formatters'
import pool from '@/lib/database/connection'
import { logAuditEvent } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

const limiter = new RateLimiterMemory({
  points: 8, // 8 tentativas
  duration: 60 * 60 // por hora
})

function badRequest(message: string, details?: string[]) {
  return NextResponse.json({ success: false, error: message, details }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    await limiter.consume(ip)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Muitas tentativas. Tente novamente mais tarde.' },
      { status: 429 }
    )
  }

  try {
    const form = await request.formData()

    const username = String(form.get('username') || '').trim()
    const email = String(form.get('email') || '').trim()
    const nome = String(form.get('nome') || '').trim()
    const telefone = String(form.get('telefone') || '').trim()
    const password = String(form.get('password') || '')
    const cpfRaw = String(form.get('cpf') || '').trim()
    const cpf = cpfRaw.replace(/\D/g, '')
    const creci = String(form.get('creci') || '').trim()
    const foto = form.get('foto')

    const errors: string[] = []

    if (!username || username.length < 3) errors.push('Username deve ter pelo menos 3 caracteres')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email inválido')
    if (!nome) errors.push('Nome é obrigatório')
    if (!telefone) errors.push('Telefone é obrigatório')
    if (telefone && !/^\(\d{2}\)\s\d{9}$/.test(telefone)) errors.push('Telefone deve estar no formato (99) 999999999')
    if (!password || password.length < 8) errors.push('Senha deve ter pelo menos 8 caracteres')

    if (!cpf) errors.push('CPF é obrigatório')
    if (cpf && !validateCPF(cpf)) errors.push('CPF inválido')

    if (!creci) errors.push('CRECI é obrigatório')
    if (creci && creci.length > 10) errors.push('CRECI deve ter no máximo 10 caracteres')

    if (!foto || !(foto instanceof File)) {
      errors.push('Foto é obrigatória')
    }

    if (errors.length > 0) return badRequest('Dados inválidos', errors)

    const file = foto as File
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowed.has(file.type)) {
      return badRequest('Formato de foto inválido', ['Envie JPEG, PNG ou WEBP'])
    }
    const maxBytes = 2 * 1024 * 1024 // 2MB
    if (file.size > maxBytes) {
      return badRequest('Foto muito grande', ['Tamanho máximo: 2MB'])
    }

    const buf = Buffer.from(await file.arrayBuffer())

    // Buscar ID do perfil 'Corretor' dinamicamente
    const roleRes = await pool.query("SELECT id FROM user_roles WHERE name = 'Corretor' LIMIT 1")
    const roleId = roleRes.rows[0]?.id || 3 // Fallback para 3 se não encontrar

    // Validar duplicidade de CPF (online)
    const cpfExists = await pool.query('SELECT 1 FROM users WHERE cpf = $1 LIMIT 1', [cpf])
    if (cpfExists.rows.length > 0) {
      return badRequest('Dados inválidos', ['CPF já cadastrado para outro usuário'])
    }

    const newUser = await createUser({
      username,
      email,
      nome,
      telefone,
      password,
      roleId,
      ativo: true,
      isencao: false,
      ultimo_login: null,
      cpf,
      creci,
      foto: buf,
      foto_tipo_mime: file.type,
      tipo_corretor: 'Externo'
    })

    // Auditoria em audit_logs (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      await logAuditEvent({
        userId: null,
        userType: 'corretor',
        // Padrão do sistema: CREATE/UPDATE/DELETE
        action: 'CREATE',
        resource: 'corretores',
        // resource_id é INTEGER no banco; para UUID, guardar em details
        resourceId: null,
        details: {
          created_user_id: newUser.id,
          username: newUser.username,
          nome: newUser.nome,
          email: newUser.email,
          cpf: (newUser as any).cpf || null,
          creci: (newUser as any).creci || null
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro ao registrar auditoria do cadastro de corretor (não crítico):', auditError)
    }

    // não retornar foto nem senha
    const { password: _pw, foto: _foto, ...safe } = newUser as any

    return NextResponse.json(
      {
        success: true,
        message: 'Cadastro de corretor enviado com sucesso.',
        user: safe
      },
      { status: 201 }
    )
  } catch (e: any) {
    const msg = e?.message || 'Erro interno'
    if (String(msg).includes('já existe')) {
      return NextResponse.json({ success: false, error: 'Username, email ou CPF já existe.' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}


