import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { userHasPermission } from '@/lib/database/users'

interface PermissionConfig {
  resource: string
  action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
}

// Mapeamento de rotas para permissões necessárias
const routePermissions: Record<string, PermissionConfig> = {
  // Rotas de imóveis
  '/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/admin/imoveis/novo': { resource: 'imoveis', action: 'WRITE' },
  '/admin/imoveis/[id]/edicao': { resource: 'imoveis', action: 'WRITE' },
  
  // Rotas de proximidades
  '/admin/proximidades': { resource: 'proximidades', action: 'READ' },
  '/admin/proximidades/novo': { resource: 'proximidades', action: 'WRITE' },
  '/admin/proximidades/[id]/editar': { resource: 'proximidades', action: 'WRITE' },
  
  // Rotas de amenidades
  '/admin/amenidades': { resource: 'amenidades', action: 'READ' },
  '/admin/amenidades/novo': { resource: 'amenidades', action: 'WRITE' },
  '/admin/amenidades/[id]/editar': { resource: 'amenidades', action: 'WRITE' },
  
  // Rotas de categorias
  '/admin/categorias-amenidades': { resource: 'categorias-amenidades', action: 'READ' },
  '/admin/categorias-amenidades/novo': { resource: 'categorias-amenidades', action: 'WRITE' },
  '/admin/categorias-amenidades/[id]/editar': { resource: 'categorias-amenidades', action: 'WRITE' },
  
  '/admin/categorias-proximidades': { resource: 'categorias-proximidades', action: 'READ' },
  '/admin/categorias-proximidades/novo': { resource: 'categorias-proximidades', action: 'WRITE' },
  '/admin/categorias-proximidades/[id]/editar': { resource: 'categorias-proximidades', action: 'WRITE' },
  
  // Rotas de tipos de documentos
  '/admin/tipos-documentos': { resource: 'tipos-documentos', action: 'READ' },
  '/admin/tipos-documentos/novo': { resource: 'tipos-documentos', action: 'WRITE' },
  '/admin/tipos-documentos/[id]/editar': { resource: 'tipos-documentos', action: 'WRITE' },
  
  // Rotas de tipos de imóveis
  '/admin/tipos-imoveis': { resource: 'tipos-imoveis', action: 'READ' },
  '/admin/tipos-imoveis/novo': { resource: 'tipos-imoveis', action: 'WRITE' },
  '/admin/tipos-imoveis/[id]/editar': { resource: 'tipos-imoveis', action: 'WRITE' },
  
  // Rotas de status
  
  // Rotas de status-imovel
  '/admin/status-imovel': { resource: 'status-imovel', action: 'READ' },
  '/admin/status-imovel/novo': { resource: 'status-imovel', action: 'WRITE' },
  '/admin/status-imovel/[id]/editar': { resource: 'status-imovel', action: 'WRITE' },
  
  // Rotas de finalidades
  '/admin/finalidades': { resource: 'finalidades', action: 'READ' },
  '/admin/finalidades/novo': { resource: 'finalidades', action: 'WRITE' },
  '/admin/finalidades/[id]/editar': { resource: 'finalidades', action: 'WRITE' },
  
  // Rotas de mudanças de status
  '/admin/mudancas-status': { resource: 'status-imovel', action: 'READ' },
  '/admin/mudancas-status/novo': { resource: 'status-imovel', action: 'WRITE' },
  '/admin/mudancas-status/[id]/editar': { resource: 'status-imovel', action: 'WRITE' },
  
  // Rotas de clientes
  '/admin/clientes': { resource: 'clientes', action: 'READ' },
  '/admin/clientes/novo': { resource: 'clientes', action: 'WRITE' },
  '/admin/clientes/[id]/editar': { resource: 'clientes', action: 'WRITE' },
  
  // Rotas de proprietários
  '/admin/proprietarios': { resource: 'proprietarios', action: 'READ' },
  '/admin/proprietarios/novo': { resource: 'proprietarios', action: 'WRITE' },
  '/admin/proprietarios/[id]/editar': { resource: 'proprietarios', action: 'WRITE' },
  
  // Rotas de usuários
  '/admin/usuarios': { resource: 'usuarios', action: 'READ' },
  '/admin/usuarios/novo': { resource: 'usuarios', action: 'WRITE' },
  '/admin/usuarios/[id]/editar': { resource: 'usuarios', action: 'WRITE' },
  
  // Rotas de perfis
  '/admin/perfis': { resource: 'sistema', action: 'READ' },
  '/admin/perfis/novo': { resource: 'sistema', action: 'WRITE' },
  '/admin/perfis/[id]/editar': { resource: 'sistema', action: 'WRITE' },
  
  // APIs de imóveis
  '/api/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/api/admin/imoveis/create': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/update': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/delete': { resource: 'imoveis', action: 'DELETE' },
  
  // APIs de proximidades
  '/api/admin/proximidades': { resource: 'proximidades', action: 'READ' },
  '/api/admin/proximidades/create': { resource: 'proximidades', action: 'WRITE' },
  '/api/admin/proximidades/update': { resource: 'proximidades', action: 'WRITE' },
  '/api/admin/proximidades/delete': { resource: 'proximidades', action: 'DELETE' },
  
  // APIs de amenidades
  '/api/admin/amenidades': { resource: 'amenidades', action: 'READ' },
  '/api/admin/amenidades/create': { resource: 'amenidades', action: 'WRITE' },
  '/api/admin/amenidades/update': { resource: 'amenidades', action: 'WRITE' },
  '/api/admin/amenidades/delete': { resource: 'amenidades', action: 'DELETE' },
  
  // APIs de tipos de documentos
  '/api/admin/tipos-documentos': { resource: 'tipos-documentos', action: 'READ' },
  '/api/admin/tipos-documentos/create': { resource: 'tipos-documentos', action: 'WRITE' },
  '/api/admin/tipos-documentos/update': { resource: 'tipos-documentos', action: 'WRITE' },
  '/api/admin/tipos-documentos/delete': { resource: 'tipos-documentos', action: 'DELETE' },
  
  // APIs de tipos de imóveis
  '/api/admin/tipos-imoveis': { resource: 'tipos-imoveis', action: 'READ' },
  
  // APIs de status
  '/api/admin/status-imovel': { resource: 'status-imovel', action: 'READ' },
  
  // APIs de clientes
  '/api/admin/clientes': { resource: 'clientes', action: 'READ' },
  '/api/admin/clientes/verificar-cpf': { resource: 'clientes', action: 'READ' },
  
  // APIs de proprietários
  '/api/admin/proprietarios': { resource: 'proprietarios', action: 'READ' },
  '/api/admin/proprietarios/verificar-cpf': { resource: 'proprietarios', action: 'READ' },
  
  // APIs de usuários
  '/api/admin/usuarios': { resource: 'usuarios', action: 'READ' }, // GET
  '/api/admin/usuarios/create': { resource: 'usuarios', action: 'WRITE' },
  '/api/admin/usuarios/update': { resource: 'usuarios', action: 'WRITE' },
  '/api/admin/usuarios/delete': { resource: 'usuarios', action: 'DELETE' },
  
  // APIs de perfis
  '/api/admin/perfis': { resource: 'sistema', action: 'READ' },
  '/api/admin/perfis/create': { resource: 'sistema', action: 'WRITE' },
  '/api/admin/perfis/update': { resource: 'sistema', action: 'WRITE' },
  '/api/admin/perfis/delete': { resource: 'sistema', action: 'DELETE' },
}

// Função para verificar permissões em rotas de API
export async function checkApiPermission(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const method = request.method
  
  console.log('🔍 MIDDLEWARE: Verificando', method, pathname)
  
  // Verificar se a rota precisa de verificação de permissão
  const permissionConfig = findPermissionConfig(pathname, method)
  
  console.log('🔍 MIDDLEWARE: Config encontrada:', permissionConfig)
  
  if (!permissionConfig) {
    return null // Rota não precisa de verificação de permissão
  }
  
  // Verificar token de autenticação
  const token = request.cookies.get('accessToken')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token de autenticação não fornecido' },
      { status: 401 }
    )
  }
  
  // Verificar se o token é válido
  const decoded = await verifyToken(token)
  if (!decoded) {
    return NextResponse.json(
      { error: 'Token de autenticação inválido ou expirado' },
      { status: 401 }
    )
  }
  
  try {
    // Verificar permissão baseada no perfil do usuário
    console.log('🔍 MIDDLEWARE: Verificando permissão para usuário', decoded.userId, 'role:', (decoded as any).role_name, ':', permissionConfig.action, 'em', permissionConfig.resource)
    
    const hasPermission = checkPermissionByRole(decoded, permissionConfig)
    
    console.log('🔍 MIDDLEWARE: Resultado da verificação:', hasPermission)
    
    if (!hasPermission) {
      console.log('❌ MIDDLEWARE: Permissão negada')
      return NextResponse.json(
        { 
          error: `Permissão negada: ${permissionConfig.action} em ${permissionConfig.resource}`,
          requiredPermission: permissionConfig
        },
        { status: 403 }
      )
    }
    
    console.log('✅ MIDDLEWARE: Permissão concedida')
    return null // Permissão concedida, continuar com a requisição
  } catch (error) {
    console.error('Erro ao verificar permissões:', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar permissões' },
      { status: 500 }
    )
  }
}

// Função para verificar permissões em páginas administrativas
export async function checkPagePermission(pathname: string, token: string): Promise<boolean> {
  const permissionConfig = findPermissionConfig(pathname, 'GET') // Páginas sempre usam GET
  if (!permissionConfig) {
    return true // Rota não precisa de verificação de permissão
  }
  
  try {
    const decoded = await verifyToken(token)
    if (!decoded) {
      return false
    }
    
    return await userHasPermission(
      decoded.userId, 
      permissionConfig.resource, 
      permissionConfig.action
    )
  } catch (error) {
    console.error('Erro ao verificar permissões da página:', error)
    return false
  }
}

function findPermissionConfig(pathname: string, method: string): PermissionConfig | null {
  // Determinar a ação baseada no método HTTP
  let action: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  
  switch (method) {
    case 'GET':
      action = 'READ'
      break
    case 'POST':
    case 'PUT':
    case 'PATCH':
      action = 'WRITE'
      break
    case 'DELETE':
      action = 'DELETE'
      break
    default:
      action = 'READ'
  }
  
  // Buscar configuração exata primeiro - mas só se for GET
  if (routePermissions[pathname] && method === 'GET') {
    return routePermissions[pathname]
  }
  
  // Buscar por padrões de rota com parâmetros dinâmicos
  for (const [pattern, config] of Object.entries(routePermissions)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      // Converter padrão para regex
      const regexPattern = pattern
        .replace(/\[.*?\]/g, '[^/]+') // Substituir [id] por regex
        .replace(/\//g, '\\/') // Escapar barras
      
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(pathname)) {
        return config
      }
    }
  }
  
  // Se não encontrou configuração específica, usar ação baseada no método
  // Extrair o recurso da rota (ex: /api/admin/usuarios -> usuarios)
  const pathParts = pathname.split('/')
  if (pathParts.length >= 4 && pathParts[1] === 'api' && pathParts[2] === 'admin') {
    const resource = pathParts[3]
    return { resource, action }
  }
  
  return null
}

// Função para verificar permissões baseada no perfil do usuário
function checkPermissionByRole(decoded: any, config: PermissionConfig): boolean {
  const userRole = decoded.role_name || ''
  
  console.log('🔍 checkPermissionByRole: userRole =', userRole, 'resource =', config.resource, 'action =', config.action)
  
  // Super Admin e Administrador têm acesso total
  if (userRole === 'Super Admin' || userRole === 'Administrador') {
    console.log('✅ checkPermissionByRole: Super Admin/Admin - acesso total')
    return true
  }
  
  // Corretor: Acesso a Imóveis e Relatórios
  if (userRole === 'Corretor') {
    const hasAccess = config.resource === 'imoveis' || config.resource === 'relatorios'
    console.log('🔍 checkPermissionByRole: Corretor - acesso =', hasAccess)
    return hasAccess
  }
  
  // Usuário: Acesso a Relatórios e Tipos de Documentos
  if (userRole === 'Usuário') {
    const hasAccess = config.resource === 'relatorios' || config.resource === 'tipos-documentos'
    console.log('🔍 checkPermissionByRole: Usuário - acesso =', hasAccess)
    return hasAccess
  }
  
  // Perfil não reconhecido: negar acesso
  console.log('❌ checkPermissionByRole: Perfil não reconhecido - negando acesso')
  return false
}

