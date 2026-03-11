/**
 * ============================================================
 * ⚠️ DEPRECATED - NÃO USE MAIS ESTE ARQUIVO
 * ============================================================
 * 
 * Este arquivo foi SUBSTITUÍDO por:
 * - src/lib/permissions/PermissionChecker.ts
 * - src/lib/middleware/UnifiedPermissionMiddleware.ts
 * 
 * Motivo: Eliminar hardcoding de rotas
 * 
 * MIGRE PARA:
 * import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
 * 
 * Este arquivo será REMOVIDO na FASE 6
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { userHasPermission } from '@/lib/database/userPermissions'
import type { PermissionAction } from '@/lib/utils/permissions'
import pool from '@/lib/database/connection'

// Helper simples para validar usuário
async function checkUserExistsInDb(userId: string): Promise<boolean> {
  const res = await pool.query('SELECT 1 FROM users WHERE id = $1 AND ativo = true', [userId])
  return res.rows.length > 0
}

interface PermissionConfig {
  resource: string | null
  action: PermissionAction | null
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

  // Rotas de categorias de funcionalidades - SEM VERIFICAÇÃO (TEMPORÁRIO)
  '/api/admin/categorias': { resource: null, action: null },
  '/api/admin/categorias/[id]': { resource: null, action: null },
  '/api/admin/categorias/[id]/features': { resource: null, action: null },
  '/admin/categorias': { resource: null, action: null },
  '/admin/categorias/novo': { resource: null, action: null },
  '/admin/categorias/[id]/editar': { resource: null, action: null },
  '/admin/categorias/[id]': { resource: null, action: null },
  '/admin/categorias/[id]/features': { resource: null, action: null },

  // Rotas de funcionalidades do sistema - COM VERIFICAÇÃO OBRIGATÓRIA
  '/api/admin/system-features': { resource: 'system-features', action: 'READ' },
  '/api/admin/system-features/[id]': { resource: 'system-features', action: 'READ' },
  '/admin/system-features': { resource: 'system-features', action: 'READ' },

  // Rotas de sessões - COM VERIFICAÇÃO OBRIGATÓRIA
  '/api/admin/sessions': { resource: 'system-features', action: 'READ' },
  '/api/admin/sessions/[id]': { resource: 'system-features', action: 'WRITE' },
  '/api/admin/sessions/bulk-revoke': { resource: 'system-features', action: 'WRITE' },
  '/admin/sessions': { resource: 'system-features', action: 'READ' },

  // Rotas de logs de login - COM VERIFICAÇÃO OBRIGATÓRIA
  '/api/admin/login-logs': { resource: 'system-features', action: 'READ' },
  '/admin/login-logs': { resource: 'system-features', action: 'READ' },

  // Rotas de monitoramento de segurança - COM VERIFICAÇÃO OBRIGATÓRIA
  '/api/admin/security-monitor': { resource: 'system-features', action: 'READ' },
  '/admin/security-monitor': { resource: 'system-features', action: 'READ' },

  // Rotas de categorias de amenidades
  '/admin/categorias-amenidades': { resource: 'categorias-amenidades', action: 'READ' },
  '/admin/categorias-amenidades/novo': { resource: 'categorias-amenidades', action: 'WRITE' },
  '/admin/categorias-amenidades/[id]/editar': { resource: 'categorias-amenidades', action: 'WRITE' },

  // Rotas de categorias de proximidades
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
  '/admin/status-imovel': { resource: 'status-imoveis', action: 'READ' },
  '/admin/status-imovel/novo': { resource: 'status-imoveis', action: 'WRITE' },
  '/admin/status-imovel/[id]/editar': { resource: 'status-imoveis', action: 'WRITE' },

  // Rotas de finalidades
  '/admin/finalidades': { resource: 'finalidades', action: 'READ' },
  '/admin/finalidades/novo': { resource: 'finalidades', action: 'WRITE' },
  '/admin/finalidades/[id]/editar': { resource: 'finalidades', action: 'WRITE' },

  // Rotas de mudanças de status
  '/admin/mudancas-status': { resource: 'status-imoveis', action: 'READ' },
  '/admin/mudancas-status/novo': { resource: 'status-imoveis', action: 'WRITE' },
  '/admin/mudancas-status/[id]/editar': { resource: 'status-imoveis', action: 'WRITE' },

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
  '/admin/perfis': { resource: null, action: null },
  '/admin/perfis/novo': { resource: null, action: null },
  '/admin/perfis/[id]/editar': { resource: null, action: null },

  // APIs de imóveis
  '/api/admin/imoveis': { resource: 'imoveis', action: 'READ' },
  '/api/admin/imoveis/create': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/update': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/delete': { resource: 'imoveis', action: 'DELETE' },
  '/api/admin/imoveis/[id]/documentos': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/[id]/imagens': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/[id]/video': { resource: 'imoveis', action: 'WRITE' },
  '/api/admin/imoveis/[id]/rascunho': { resource: 'imoveis', action: 'WRITE' },

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

  // APIs de categorias - COM VERIFICAÇÃO OBRIGATÓRIA
  // (rotas duplicadas removidas; usar bloco acima para comportamento legado)

  // APIs de funcionalidades do sistema - COM VERIFICAÇÃO OBRIGATÓRIA
  // (rotas duplicadas removidas; usar bloco acima para comportamento legado)

  // APIs de tipos de documentos
  '/api/admin/tipos-documentos': { resource: 'tipos-documentos', action: 'READ' },
  '/api/admin/tipos-documentos/create': { resource: 'tipos-documentos', action: 'WRITE' },
  '/api/admin/tipos-documentos/update': { resource: 'tipos-documentos', action: 'WRITE' },
  '/api/admin/tipos-documentos/delete': { resource: 'tipos-documentos', action: 'DELETE' },

  // APIs de tipos de imóveis
  '/api/admin/tipos-imoveis': { resource: 'tipos-imoveis', action: 'READ' },

  // APIs de status
  '/api/admin/status-imovel': { resource: 'status-imoveis', action: 'READ' },

  // APIs de clientes
  '/api/admin/clientes': { resource: 'clientes', action: 'READ' },
  '/api/admin/clientes/verificar-cpf': { resource: 'clientes', action: 'READ' },

  // APIs de proprietários
  '/api/admin/proprietarios': { resource: 'proprietarios', action: 'READ' },
  '/api/admin/proprietarios/verificar-cpf': { resource: 'proprietarios', action: 'READ' },

  // APIs de usuários
  '/api/admin/usuarios': { resource: 'usuarios', action: 'READ' }, // GET
  '/api/admin/usuarios/[id]': { resource: 'usuarios', action: 'READ' }, // GET by ID
  '/api/admin/usuarios/create': { resource: 'usuarios', action: 'WRITE' },
  '/api/admin/usuarios/update': { resource: 'usuarios', action: 'WRITE' },
  '/api/admin/usuarios/delete': { resource: 'usuarios', action: 'DELETE' },

  // APIs de perfis
  '/api/admin/perfis': { resource: null, action: null },
  '/api/admin/perfis/create': { resource: null, action: null },
  '/api/admin/perfis/update': { resource: null, action: null },
  '/api/admin/perfis/delete': { resource: null, action: null },

  // APIs de analytics de visitas — recurso usa o slug da feature (singular)
  '/api/admin/visitas-plataforma': { resource: 'visita-plataforma', action: 'READ' },
}

// Função para verificar permissões em rotas de API
export async function checkApiPermission(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const method = request.method

  // Verificar se a rota precisa de verificação de permissão
  const permissionConfig = findPermissionConfig(pathname, method)

  if (!permissionConfig || !permissionConfig.resource || !permissionConfig.action) {
    return null // Rota não precisa de verificação de permissão
  }
  const { resource, action } = permissionConfig

  // Verificar token de autenticação
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : request.cookies.get('accessToken')?.value

  console.log('🔍 MIDDLEWARE: Token encontrado:', token ? 'SIM' : 'NÃO')
  console.log('🔍 MIDDLEWARE: Auth header:', authHeader ? 'SIM' : 'NÃO')

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

  // 🆕 VALIDAÇÃO CRÍTICA (Fix Sessão Zumbi): Verificar se o usuário existe e está ativo
  try {
    const userExists = await checkUserExistsInDb(decoded.userId)
    if (!userExists) {
      console.warn('👻 [MIDDLEWARE] Token fantasma detectado: Usuário não existe mais:', decoded.userId)
      return NextResponse.json(
        {
          error: 'Usuário inválido ou inativo',
          code: 'USER_NOT_FOUND' // Gatilho para apiClient limpar sessão
        },
        { status: 401 }
      )
    }
  } catch (e) {
    console.error('Erro ao verificar existência do usuário:', e)
  }

  try {
    // Verificar permissão baseada no banco de dados (SISTEMA ROBUSTO)
    const hasPermission = await userHasPermission(decoded.userId, resource, action)

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: `Acesso negado. Permissão insuficiente para ${action} em ${resource}.`,
          details: {
            userId: decoded.userId,
            resource: resource,
            action: action
          }
        },
        { status: 403 }
      )
    }

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
  if (!permissionConfig || !permissionConfig.resource || !permissionConfig.action) {
    return true // Rota não precisa de verificação de permissão
  }
  const { resource, action } = permissionConfig

  try {
    const decoded = await verifyToken(token)
    if (!decoded) {
      return false
    }

    return await userHasPermission(decoded.userId, resource, action)
  } catch (error) {
    console.error('Erro ao verificar permissões da página:', error)
    return false
  }
}

function findPermissionConfig(pathname: string, method: string): PermissionConfig | null {
  // Determinar a ação baseada no método HTTP
  let action: PermissionAction

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

  // Buscar configuração exata primeiro
  if (routePermissions[pathname]) {
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

// Função removida - agora usa sistema robusto de permissões do banco de dados

