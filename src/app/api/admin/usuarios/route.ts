import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUsersWithRoles, findUsersPaginated, createUser, UserWithRole } from '@/lib/database/users'
import { validateApiInput } from '@/lib/validation/advancedValidation'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
import { logInvalidInput } from '@/lib/monitoring/securityMonitor'
import { validateCPF } from '@/lib/utils/formatters'
import { logAuditEvent as logDbAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { safeParseInt } from '@/lib/utils/safeParser'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

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
  google_refresh_token?: string | null
  google_calendar_authorized?: boolean
  custom_data?: any
}

// Função para validar dados de entrada usando validação avançada
function validateCreateData(data: CreateUserRequest): { isValid: boolean; errors: string[]; sanitizedData?: any } {
  // Usar validação avançada
  const validationResult = validateApiInput(data, 'users')

  // Validações específicas adicionais
  const additionalErrors: string[] = []

  // Validação de username
  if (!data?.username || !data.username.toString().trim()) {
    additionalErrors.push('Username é obrigatório')
  } else if (data.username.toString().trim().length < 3) {
    additionalErrors.push('Username deve ter pelo menos 3 caracteres')
  }

  // Validação de telefone
  if (!data?.telefone || !data.telefone.toString().trim()) {
    additionalErrors.push('Telefone é obrigatório')
  } else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(data.telefone.toString().trim())) {
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
  if (!data?.password || !data.password.toString().trim()) {
    additionalErrors.push('Senha é obrigatória')
  } else if (data.password.toString().trim().length < 6) {
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
    // POST/PUT/DELETE já exigem 'usuarios' via requireApiPermission (JWT, auto-contido) —
    // o GET dependia só de unifiedPermissionMiddleware, que é fail-open pra qualquer rota sem
    // entrada em route_permissions_config (nunca registrada pra /api/admin/usuarios/*, achado
    // real ao investigar o endpoint de foto). Fecha a mesma classe de vazamento já corrigida
    // em /api/crm/clientes/search numa sessão anterior.
    const denied = await requireApiPermission(request, 'usuarios', 'READ')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 10, 1, 100)

    const nome = searchParams.get('nome') || undefined
    const username = searchParams.get('username') || undefined
    const email = searchParams.get('email') || undefined
    const role_name = searchParams.get('role_name') || undefined
    const system_tag = searchParams.get('system_tag') || undefined

    // Extrair tenantId do token para isolamento automático
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    
    // VISÃO MASTER: Se for System Admin (Master), ignora o filtro de tenantId para ver TODOS os usuários
    const isMasterAdmin = decoded?.is_system_role === true
    const tenantId = isMasterAdmin ? undefined : decoded?.tenantId

    // Buscar usuários paginados do banco de dados
    const result = await findUsersPaginated(page, limit, {
      nome,
      username,
      email,
      role_name,
      system_tag,
      tenant_id: tenantId 
    })


    // Filtrar usuários (ocultar senhas por segurança). A foto em si NUNCA viaja no JSON da
    // lista — findUsersPaginated já retorna só um `has_foto` booleano (computado no SQL sem
    // tocar o bytea); quem tem foto é servido via GET /api/admin/usuarios/[id]/foto, que
    // redireciona pro S3/MinIO quando disponível ou faz streaming do bytea como fallback.
    const filteredUsers = result.users.map((user: UserWithRole) => ({
      ...user,
      password: '***' // Ocultar senha
    }))

    // Log de auditoria (sem informações sensíveis)
    auditLogger.log(
      'USERS_LIST',
      `Usuário listou usuários do sistema(Página ${page})`,
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
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'usuarios', 'CREATE')
    if (denied) return denied

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
        existingUserId: formData.get('existingUserId') ? String(formData.get('existingUserId')) : null,
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
        tipo_corretor: formData.get('tipo_corretor') as 'Interno' | 'Externo' | null,
        google_refresh_token: String(formData.get('google_refresh_token') || '').trim() || null,
        google_calendar_authorized: formData.get('google_calendar_authorized') === 'true',
        custom_data: formData.get('custom_data') ? JSON.parse(String(formData.get('custom_data'))) : {}
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
    // Se for vínculo de usuário existente, ignoramos erros de senha, pois a senha não será alterada
    const validation = validateCreateData(createData)
    if (!validation.isValid) {
      const hasOnlyPasswordErrors = validation.errors.every(e => e.includes('Senha') || e.includes('senha'))
      if (!(createData.existingUserId && hasOnlyPasswordErrors)) {
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
    }

    // Obter o tenant atual do token para isolamento
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const isMasterAdmin = decoded?.is_system_role === true
    const tenantId = !isMasterAdmin ? decoded?.tenantId : undefined

    // 🛡️ VALIDAÇÃO HIERÁRQUICA DA ROLE ATRIBUÍDA
    const roleCheck = await pool.query('SELECT level FROM user_roles WHERE id = $1', [createData.roleId])
    if (roleCheck.rows.length > 0) {
      const targetRoleLevel = roleCheck.rows[0].level
      const callerLevel = decoded?.role_level || 0
      if (targetRoleLevel >= callerLevel && !isMasterAdmin) {
        return NextResponse.json(
          { error: `Você só pode atribuir perfis com nível estritamente inferior ao seu (${callerLevel}). O perfil selecionado tem nível ${targetRoleLevel}.` },
          { status: 403 }
        )
      }
    }

    // Criar ou vincular usuário no banco
    let newUser: any;

    if (createData.existingUserId) {
      // VÍNCULO DE USUÁRIO EXISTENTE
      if (tenantId) {
        await pool.query(
          `INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = EXCLUDED.is_active`,
          [createData.existingUserId, tenantId, createData.roleId, createData.ativo !== undefined ? createData.ativo : true]
        )
      } else {
        await pool.query(
          `INSERT INTO user_role_assignments (user_id, role_id, is_active)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = EXCLUDED.is_active`,
          [createData.existingUserId, createData.roleId, createData.ativo !== undefined ? createData.ativo : true]
        )
      }

      newUser = {
        id: createData.existingUserId,
        username: createData.username.trim(),
        email: createData.email.trim(),
        nome: createData.nome.trim()
      }
    } else {
      // CRIAÇÃO DE NOVO USUÁRIO
      newUser = await createUser({
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
        tipo_corretor: createData.tipo_corretor || 'Interno',
        foto: fotoBuffer,
        foto_tipo_mime: fotoMimeType,
        tenantId: tenantId,
        google_refresh_token: createData.google_refresh_token,
        google_calendar_authorized: createData.google_calendar_authorized,
        metadata: createData.custom_data
      })
    }

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
        tenantId: tenantId, // ✅ Adicionado tenantId para isolamento de logs
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
    console.error('❌ ERRO CRÍTICO NA CRIAÇÃO DE USUÁRIO:', error);
    
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
