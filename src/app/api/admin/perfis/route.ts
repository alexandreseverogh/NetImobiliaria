import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

interface FeatureRow {
  id: number
  name: string | null
  slug: string | null
  category_id: number | null
  category_slug: string | null
  category_name: string | null
}

const permissionMapping: Record<string, string[]> = {
  NONE: [],
  READ: ['read', 'list'],
  EXECUTE: ['execute', 'read', 'list'],
  CREATE: ['create', 'read', 'list'],
  UPDATE: ['update', 'create', 'read', 'list'],
  DELETE: ['delete', 'update', 'create', 'read', 'list'],
  ADMIN: ['admin', 'delete', 'update', 'create', 'execute', 'read', 'list'],
}

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return value
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const buildMatchCandidates = (value: unknown): string[] => {
  const normalized = normalizeString(value)
  if (!normalized) return []

  const variants = new Set<string>([normalized])
  variants.add(normalized.replace(/\s+/g, ''))
  variants.add(normalized.replace(/\s+/g, '-'))
  variants.add(normalized.replace(/[^a-z0-9]+/g, '-'))
  variants.add(normalized.replace(/[^a-z0-9]+/g, ''))

  return Array.from(variants).filter(Boolean)
}

const findFeatureByKey = (features: FeatureRow[], key: string): FeatureRow | undefined => {
  const keyVariants = buildMatchCandidates(key)
  return features.find(feature => {
    const featureVariants = [
      ...buildMatchCandidates(feature.name),
      ...buildMatchCandidates(feature.slug),
      ...buildMatchCandidates(feature.category_name),
      ...buildMatchCandidates(feature.category_slug),
      ...buildMatchCandidates(feature.id),
      ...buildMatchCandidates(feature.category_id),
    ]
    return featureVariants.some(variant => keyVariants.includes(variant))
  })
}

// GET /api/admin/perfis - Listar todos os perfis
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação - buscar token dos cookies ou header
    const token = request.cookies.get('admin_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { message: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificação Semântica (Parametrizada)
    const hasAccess = 
      decoded.permissoes?.['usuarios'] && ['READ', 'UPDATE', 'CREATE', 'DELETE', 'ADMIN'].includes(decoded.permissoes['usuarios']) ||
      decoded.permissoes?.['gestao-perfis'] && ['READ', 'UPDATE', 'CREATE', 'DELETE', 'ADMIN'].includes(decoded.permissoes['gestao-perfis']);

    // Privilégio de Sistema (Master)
    const isMasterAdmin = !!decoded.is_system_role;

    if (!hasAccess && !isMasterAdmin) {
      return NextResponse.json(
        { message: 'Acesso negado. Permissão para Gestão de Perfis insuficiente.' },
        { status: 403 }
      );
    }

    const client = await pool.connect();

    try {
      // Buscar perfis com contagem e lista de usuários (Global + Tenant)
      const perfisQuery = `
        SELECT 
          ur.id,
          ur.name,
          ur.description,
          ur.level,
          ur.is_system_role,
          ur.is_active,
          ur.requires_2fa,
          (
            SELECT COUNT(DISTINCT user_id) 
            FROM (
              SELECT user_id FROM user_role_assignments WHERE role_id = ur.id
              UNION
              SELECT user_id FROM user_tenant_membership 
              WHERE role_id = ur.id AND tenant_id = $1 AND is_active = true
            ) as all_users
          ) as user_count,
          (
            SELECT COALESCE(json_agg(nome), '[]')
            FROM (
              SELECT DISTINCT u.nome 
              FROM users u
              LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
              LEFT JOIN user_tenant_membership utm ON u.id = utm.user_id
              WHERE (ura.role_id = ur.id) OR (utm.role_id = ur.id AND utm.tenant_id = $1 AND utm.is_active = true)
              LIMIT 5
            ) as user_list
          ) as user_names
        FROM user_roles ur
        WHERE ur.tenant_id = $1 OR ur.tenant_id IS NULL
        ORDER BY ur.level DESC, ur.name ASC
      `;

      const perfisResult = await client.query(perfisQuery, [decoded.tenantId || null]);
      const perfis = perfisResult.rows;

      // Buscar permissões para cada perfil
      const perfisComPermissoes = await Promise.all(
        perfis.map(async (perfil) => {
          const permissoesQuery = `
            SELECT 
              sf.name as feature_name,
              p.action
            FROM user_roles ur
            JOIN role_permissions rp ON ur.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE ur.id = $1
            ORDER BY sf.name, p.action
          `;

          const permissoesResult = await client.query(permissoesQuery, [perfil.id]);
          
          // Consolidar permissões granulares por funcionalidade
          const permissoesFinais: Record<string, string[]> = {};
          
          permissoesResult.rows.forEach((row) => {
            const { feature_name, action } = row;
            if (!permissoesFinais[feature_name]) {
              permissoesFinais[feature_name] = [];
            }
            if (!permissoesFinais[feature_name].includes(action)) {
              permissoesFinais[feature_name].push(action);
            }
          });

          return {
            id: perfil.id,
            name: perfil.name,
            description: perfil.description,
            level: perfil.level,
            is_system_role: perfil.is_system_role,
            is_active: perfil.is_active,
            two_fa_required: perfil.requires_2fa,
            userCount: parseInt(perfil.user_count),
            user_names: perfil.user_names || [],
            permissions: permissoesFinais
          };
        })
      );

      return NextResponse.json({
        success: true,
        perfis: perfisComPermissoes
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao buscar perfis:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

const getActionPriority = (action: string): number => {
  const a = action.toUpperCase()
  switch (a) {
    case 'ADMIN': return 5
    case 'DELETE': return 4
    case 'UPDATE': return 3
    case 'CREATE': return 3
    case 'EXECUTE': return 3
    case 'READ': return 1
    case 'LIST': return 1
    default: return 0
  }
}

// POST /api/admin/perfis - Criar novo perfil
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'perfis', 'CREATE')
    if (denied) return denied

    // Verificar autenticação - buscar token dos cookies ou header
    const token = request.cookies.get('admin_auth_token')?.value ||
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { message: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificar permissão via Parametrização Real
    const canWrite = 
      decoded.permissoes?.['usuarios'] && ['UPDATE', 'CREATE', 'DELETE', 'ADMIN', 'EXECUTE'].includes(decoded.permissoes['usuarios']) ||
      decoded.permissoes?.['gestao-perfis'] && ['UPDATE', 'CREATE', 'DELETE', 'ADMIN', 'EXECUTE'].includes(decoded.permissoes['gestao-perfis']);
      
    const isMasterAdmin = !!decoded.is_system_role;

    if (!canWrite && !isMasterAdmin) {
      return NextResponse.json(
        { message: 'Acesso negado. Funcionalidade de Gestão restrita ou Permissão insuficiente.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, permissions, level, is_system_role } = body;

    // Validação dos dados
    if (!name || !description) {
      return NextResponse.json(
        { message: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json(
        { message: 'Descrição deve ter pelo menos 5 caracteres' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verificar se já existe um perfil com o mesmo nome nesta tenant (ou global)
      const existingQuery = 'SELECT id FROM user_roles WHERE LOWER(name) = LOWER($1) AND (tenant_id = $2 OR is_system_role = true)';
      const existingResult = await client.query(existingQuery, [name.trim(), decoded.tenantId || null]);
      
      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { message: 'Já existe um perfil com este nome' },
          { status: 409 }
        );
      }

      // Iniciar transação
      await client.query('BEGIN');

      try {
        // 1. Criar perfil
        const targetLevel = level !== undefined ? parseInt(level) : 1;
        const currentUserLevel = decoded.role_level || 0;

        // Regra de Ouro: Nível deve ser inferior ao do criador (exceto Master Admin)
        if (targetLevel >= currentUserLevel && !isMasterAdmin) {
          return NextResponse.json(
            { message: `Você só pode criar perfis com nível inferior ao seu (${currentUserLevel}).` },
            { status: 403 }
          );
        }

        const targetIsSystem = is_system_role === true && isMasterAdmin; // Só master cria master

        const createQuery = `
          INSERT INTO user_roles (name, description, level, is_system_role, tenant_id, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
          RETURNING id
        `;
        
        const createResult = await client.query(createQuery, [
          name.trim(), 
          description.trim(), 
          targetLevel,
          targetIsSystem,
          targetIsSystem ? null : (decoded.tenantId || null)
        ]);
        const perfilId = createResult.rows[0].id;

        // Configurar permissões padrão (vazio, pois agora é 100% moldado pela Interface do BD)
        const permissoesParaConfigurar: Record<string, string[]> = permissions || {};

        // Buscar todas as funcionalidades do sistema
        const featuresQuery = `
          SELECT 
            sf.id,
            sf.name,
            sf.slug,
            sf.category_id,
            sc.slug AS category_slug,
            sc.name AS category_name
          FROM system_features sf
          LEFT JOIN system_categorias sc ON sf.category_id = sc.id
        `
        const featuresResult = await client.query<FeatureRow>(featuresQuery)
        const features = featuresResult.rows

        // Buscar todas as permissões disponíveis (verbetes de action puras)
        const permissionsQuery = 'SELECT id, action, feature_id FROM permissions'
        const permissionsResult = await client.query(permissionsQuery)
        const allPermissions = permissionsResult.rows

        // Configurar permissões granulares para o novo perfil
        for (const [categoryKey, requestedActions] of Object.entries(permissoesParaConfigurar)) {
          if (!requestedActions || (Array.isArray(requestedActions) && requestedActions.length === 0)) continue;

          const feature = findFeatureByKey(features, categoryKey)
          if (!feature) {
            console.warn('⚠️ Perfil - Funcionalidade não encontrada para chave:', categoryKey)
            continue
          }

          // [NOVO] Verificação de Herança de Permissão
          if (!isMasterAdmin) {
            const creatorAction = decoded.permissoes?.[feature.slug || ''] || decoded.permissoes?.[feature.name || ''] || 'NONE';
            const creatorPriority = getActionPriority(creatorAction);
            
            const actionsToAssign = Array.isArray(requestedActions) 
              ? requestedActions 
              : [requestedActions];

            for (const action of actionsToAssign) {
              const requestedPriority = getActionPriority(action);
              if (requestedPriority > creatorPriority) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                  { message: `Permissão insuficiente para conceder '${action}' na funcionalidade '${feature.name}'. Você possui apenas '${creatorAction}'.` },
                  { status: 403 }
                );
              }
            }
          }

          const actionsToAssign = Array.isArray(requestedActions) 
            ? requestedActions 
            : typeof requestedActions === 'string' 
              ? [requestedActions]
              : [];
          
          for (const action of actionsToAssign) {
            const permissionObj = allPermissions.find(
              p => p.feature_id === feature.id && p.action.toLowerCase() === action.toLowerCase()
            )
            
            if (permissionObj) {
              const assignQuery = `
                INSERT INTO role_permissions (role_id, permission_id, granted_at, tenant_id)
                VALUES ($1, $2, NOW(), $3)
              `
              await client.query(assignQuery, [perfilId, permissionObj.id, targetIsSystem ? null : (decoded.tenantId || null)])
            }
          }
        }

        // [NOVO] Salvar campos customizados
        const customFields = body.custom_fields || [];
        console.log(`🔍 DEBUG - Salvando ${customFields.length} campos customizados para perfil ${perfilId}`);
        
        for (let i = 0; i < customFields.length; i++) {
          const field = customFields[i];
          console.log(`🔍 DEBUG - Campo [${i}]:`, field);
          
          const insertFieldQuery = `
            INSERT INTO role_custom_fields (role_id, field_name, field_label, field_type, mask, is_required, field_options, order_index, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          await client.query(insertFieldQuery, [
            perfilId,
            field.name,
            field.label,
            field.type || 'text',
            field.mask || null,
            field.required || false,
            field.options || null,
            i,
            targetIsSystem ? null : (decoded.tenantId || null)
          ]);
        }

        // Commit da transação
        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          message: 'Perfil criado com sucesso',
          perfil: {
            id: perfilId,
            name: name.trim(),
            description: description.trim(),
            userCount: 0,
            permissions: permissoesParaConfigurar
          }
        });

      } catch (error) {
        // Rollback em caso de erro
        await client.query('ROLLBACK');
        throw error;
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
