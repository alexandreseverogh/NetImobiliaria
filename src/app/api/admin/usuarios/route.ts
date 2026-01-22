import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUsersWithRoles, findUsersPaginated, createUser, UserWithRole } from '@/lib/database/users'
import { validateApiInput } from '@/lib/validation/advancedValidation'
import { logInvalidInput } from '@/lib/monitoring/securityMonitor'
import { validateCPF } from '@/lib/utils/formatters'
import { logAuditEvent as logDbAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

// Interface para criação de usuário
interface CreateUserRequest {
  username: string
  email: string
  nome: string
  telefone: string
  cpf: string
  roleId: number
  password: string
  ativo?: boolean
  isencao?: boolean
  is_plantonista?: boolean
  tipo_corretor?: 'Interno' | 'Externo' | null
}

// Função para validar dados de entrada usando validação avançada
function validateCreateData(data: CreateUserRequest): { isValid: boolean; errors: string[]; sanitizedData?: any } {
  // Usar validação avançada
  const validationResult = validateApiInput(data, 'users')

  // Validações específicas adicionais
  const additionalErrors: string[] = []

  // Validação de username (não coberta pelas regras padrão)
  if (!data.username.trim()) {
    additionalErrors.push('Username é obrigatório')
  } else if (data.username.length < 3) {
    additionalErrors.push('Username deve ter pelo menos 3 caracteres')
  }

  // Validação de telefone
  if (!data.telefone.trim()) {
    additionalErrors.push('Telefone é obrigatório')
  } else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(data.telefone)) {
    additionalErrors.push('Telefone deve estar no formato (XX) XXXXX-XXXX')
  }

  // Validação de CPF
  const cpfDigits = String(data.cpf || '').replace(/\D/g, '')
  if (!cpfDigits) {
    additionalErrors.push('CPF é obrigatório')
  } else if (!validateCPF(cpfDigits)) {
    additionalErrors.push('CPF inválido')
  }

  // Validação de senha
  if (!data.password.trim()) {
    additionalErrors.push('Senha é obrigatória')
  } else if (data.password.length < 6) {
    additionalErrors.push('Senha deve ter pelo menos 6 caracteres')
  }

  // Validação de roleId
  if (!data.roleId || data.roleId < 1) {
    additionalErrors.push('ID do perfil é obrigatório')
  }

  return {
    isValid: validationResult.isValid && additionalErrors.length === 0,
    errors: [...validationResult.errors, ...additionalErrors],
    sanitizedData: validationResult.sanitizedData
  }
}

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const nome = searchParams.get('nome') || undefined
    const username = searchParams.get('username') || undefined
    const email = searchParams.get('email') || undefined
    const role_name = searchParams.get('role_name') || undefined

    // Buscar usuários paginados do banco de dados
    const result = await findUsersPaginated(page, limit, {
      nome,
      username,
      email,
      role_name
    })

    // Filtrar usuários (ocultar senhas por segurança)
    const filteredUsers = result.users.map((user: UserWithRole) => ({
      ...user,
      password: '***' // Ocultar senha
    }))

    // Log de auditoria (sem informações sensíveis)
    auditLogger.log(
      'USERS_LIST',
      `Usuário listou usuários do sistema (Página ${page})`,
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev
    })

  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    let createData: any = {}
    let fotoBuffer: Buffer | undefined = undefined
    let fotoMimeType: string | undefined = undefined

    // Verificar Content-Type para decidir como ler
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()

      createData = {
        username: String(formData.get('username') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        nome: String(formData.get('nome') || '').trim(),
        telefone: String(formData.get('telefone') || '').trim(),
        cpf: String(formData.get('cpf') || '').trim(),
        roleId: Number(formData.get('roleId')),
        password: String(formData.get('password') || ''),
        ativo: formData.get('ativo') === 'true',
        isencao: formData.get('isencao') === 'true',
        is_plantonista: formData.get('is_plantonista') === 'true',
        tipo_corretor: formData.get('tipo_corretor') as 'Interno' | 'Externo' | null
      }

      const fotoFile = formData.get('foto')
      if (fotoFile && fotoFile instanceof File) {
        // Validar foto
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(fotoFile.type)) {
          return NextResponse.json(
            { error: 'Formato de foto inválido. Permitido: JPG, PNG, WEBP' },
            { status: 400 }
          )
        }
        if (fotoFile.size > 5 * 1024 * 1024) { // 5MB
          return NextResponse.json(
            { error: 'Foto muito grande. Máximo: 5MB' },
            { status: 400 }
          )
        }
        fotoBuffer = Buffer.from(await fotoFile.arrayBuffer())
        fotoMimeType = fotoFile.type
      }
    } else {
      createData = await request.json()
    }

    // Validação dos dados de entrada
    const validation = validateCreateData(createData)
    if (!validation.isValid) {
      // Log de entrada inválida para monitoramento
      logInvalidInput(
        request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        '/api/admin/usuarios',
        validation.errors
      )

      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // Criar usuário no banco
    const newUser = await createUser({
      username: createData.username.trim(),
      email: createData.email.trim(),
      nome: createData.nome.trim(),
      telefone: createData.telefone.trim(),
      cpf: createData.cpf,
      roleId: createData.roleId,
      password: createData.password,
      ativo: createData.ativo !== undefined ? createData.ativo : true,
      isencao: createData.isencao !== undefined ? createData.isencao : false,
      is_plantonista: createData.is_plantonista !== undefined ? createData.is_plantonista : false,
      ultimo_login: null,
      // Se for Corretor (roleId = 3), usa o tipo_corretor fornecido ou padrão 'Interno'.
      tipo_corretor: createData.roleId === 3 ? (createData.tipo_corretor || 'Interno') : null,
      foto: fotoBuffer,
      foto_tipo_mime: fotoMimeType
    })

    // Log de auditoria
    auditLogger.log(
      'USER_CREATE',
      'Usuário criou um novo usuário no sistema',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    // Auditoria na tabela audit_logs (não crítico) - especialmente importante para cadastro de corretores
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const requesterUserId = extractUserIdFromToken(request) // quem cadastrou (admin)

      await logDbAuditEvent({
        userId: requesterUserId,
        userType: 'admin',
        action: 'CREATE',
        resource: 'usuarios',
        resourceId: newUser.id,
        details: {
          created_user: {
            id: newUser.id,
            username: newUser.username,
            nome: newUser.nome,
            email: newUser.email,
            cpf: (newUser as any).cpf || null,
            roleId: createData.roleId,
            has_photo: !!fotoBuffer
          }
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro ao registrar auditoria (audit_logs) na criação de usuário (não crítico):', auditError)
    }

    // Não retornar senha nem foto
    const { password, foto: _f, ...userWithoutPassword } = newUser as any

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)

    // Tratar erros específicos do banco
    if (error instanceof Error) {
      if (error.message.includes('já existe')) {
        return NextResponse.json(
          { error: 'Username, email ou CPF já existe no sistema' },
          { status: 400 }
        )
      }
      if (error.message.includes('Perfil especificado não existe')) {
        return NextResponse.json(
          { error: 'Perfil especificado não existe ou não está ativo' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
