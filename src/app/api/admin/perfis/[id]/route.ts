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
  CREATE: ['create', 'execute', 'read', 'list'],
  UPDATE: ['update', 'create', 'execute', 'read', 'list'],
  DELETE: ['delete', 'update', 'create', 'execute', 'read', 'list'],
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

const getActionPriority = (action: string): number => {
  const a = action.toUpperCase()
  switch (a) {
    case 'ADMIN': return 6
    case 'DELETE': return 5
    case 'UPDATE': return 4
    case 'CREATE': return 3
    case 'EXECUTE': return 2
    case 'READ': return 1
    case 'LIST': return 1
    default: return 0
  }
}

const actionToPermissionLevel: Record<string, string> = {
  'ADMIN': 'ADMIN',
  'DELETE': 'DELETE',
  'UPDATE': 'UPDATE',
  'CREATE': 'CREATE',
  'EXECUTE': 'EXECUTE',
  'READ': 'READ',
  'admin': 'ADMIN',
  'delete': 'DELETE',
  'update': 'UPDATE',
  'create': 'CREATE',
  'execute': 'EXECUTE',
  'read': 'READ',
  'list': 'READ',
  'WRITE': 'UPDATE'
};

// GET /api/admin/perfis/[id] - Buscar perfil específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 DEBUG - API /perfis/[id] chamada para perfil ID:', params.id);
    
    // Verificar autenticação - buscar token dos cookies ou header
    const token = request.cookies.get('accessToken')?.value || 
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
        { message: 'Acesso negado. Permissão insuficiente.' },
        { status: 403 }
      );
    }

    const perfilId = parseInt(params.id);
    if (isNaN(perfilId)) {
      return NextResponse.json(
        { message: 'ID do perfil inválido' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Buscar perfil
      const perfilQuery = `
        SELECT 
          ur.id,
          ur.name,
          ur.description,
          ur.level,
          ur.is_system_role,
          COUNT(ura.user_id) as user_count
        FROM user_roles ur
        LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ur.id = $1 AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        GROUP BY ur.id, ur.name, ur.description, ur.level, ur.is_system_role
      `;

      const perfilResult = await client.query(perfilQuery, [perfilId, decoded.tenantId || null]);
      
      if (perfilResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Perfil não encontrado' },
          { status: 404 }
        );
      }

      const perfil = perfilResult.rows[0];

      // Buscar permissões do perfil
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

      const permissoesResult = await client.query(permissoesQuery, [perfilId]);
      
      // Debug: verificar permissões encontradas
      console.log('🔍 DEBUG - Perfil ID:', perfilId);
      console.log('🔍 DEBUG - Total de permissões encontradas:', permissoesResult.rows.length);
      console.log('🔍 DEBUG - Primeiras 5 permissões:', permissoesResult.rows.slice(0, 5));
      
      // Consolidar permissões por funcionalidade (priorizar ADMIN > DELETE > WRITE > READ)
      const permissoes: Record<string, string> = {};

      permissoesResult.rows.forEach((row) => {
        let { feature_name, action } = row;
        
        // Normalização de Legado: 'WRITE' -> 'update'
        if (action === 'WRITE') action = 'update';
        
        const currentAction = permissoes[feature_name];
        if (!currentAction) {
          permissoes[feature_name] = action;
        } else {
          const currentPriority = getActionPriority(currentAction);
          const newPriority = getActionPriority(action);
          
          if (newPriority > currentPriority) {
            permissoes[feature_name] = action;
          }
        }
      });

      // Converter ações para níveis de permissão
      const permissoesFinais: Record<string, string[]> = {};
      Object.entries(permissoes).forEach(([feature, action]) => {
        const level = actionToPermissionLevel[action] || actionToPermissionLevel[action.toUpperCase()] || 'NONE';
        permissoesFinais[feature] = permissionMapping[level] || [];
      });
      
      // Debug: verificar resultado final
      console.log('🔍 DEBUG - Permissões consolidadas:', Object.keys(permissoes).length);
      console.log('🔍 DEBUG - Exemplos de consolidação:', Object.entries(permissoes).slice(0, 5));
      console.log('🔍 DEBUG - Permissões finais:', Object.keys(permissoesFinais).length);
      console.log('🔍 DEBUG - Exemplos finais:', Object.entries(permissoesFinais).slice(0, 5));
      
      // Debug específico para "Categorias"
      console.log('🔍 DEBUG - Permissão para "Categorias":', permissoes['Categorias']);
      console.log('🔍 DEBUG - Permissão final para "Categorias":', permissoesFinais['Categorias']);
      
      // Buscar todas as funcionalidades do sistema
      const funcionalidadesQuery = `
        SELECT id, name, description, category_id
        FROM system_features
        ORDER BY name
      `;
      
      const funcionalidadesResult = await client.query(funcionalidadesQuery);
      const funcionalidades = funcionalidadesResult.rows;
      
      // Debug: verificar se as funcionalidades estão sendo retornadas
      console.log('🔍 DEBUG - Funcionalidades encontradas:', funcionalidades.length);
      console.log('🔍 DEBUG - Primeiras 5 funcionalidades:', funcionalidades.slice(0, 5));
      // Buscar campos customizados do perfil
      const customFieldsQuery = `
        SELECT * FROM role_custom_fields 
        WHERE role_id = $1 
        ORDER BY order_index ASC
      `;
      const customFieldsResult = await client.query(customFieldsQuery, [perfilId]);

      // Resultado consolidado
      const resultadoFinal = {
        ...perfil,
        user_count: parseInt(perfil.user_count),
        permissions: permissoesFinais,
        custom_fields: customFieldsResult.rows || []
      };

      return NextResponse.json(resultadoFinal);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'perfis', 'UPDATE')
    if (denied) return denied

    const token = request.cookies.get('accessToken')?.value ||
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ message: 'Sessão expirada' }, { status: 401 });

    const isMasterAdmin = !!decoded.is_system_role;
    const perfilId = parseInt(params.id);
    if (isNaN(perfilId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

    const body = await request.json();
    const { name, description, permissions, level, is_system_role, custom_fields } = body;

    if (!name || !description) {
      return NextResponse.json({ message: 'Nome e descrição são obrigatórios' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Security check: only allow updating if tenant_id matches or if master admin updating system role
      const checkQuery = 'SELECT tenant_id, is_system_role FROM user_roles WHERE id = $1';
      const checkRes = await client.query(checkQuery, [perfilId]);
      if (checkRes.rows.length === 0) return NextResponse.json({ message: 'Perfil não encontrado' }, { status: 404 });
      
      const roleTenantId = checkRes.rows[0].tenant_id;
      const isSystemRole = checkRes.rows[0].is_system_role;

      if (!isMasterAdmin) {
         if (isSystemRole || roleTenantId !== decoded.tenantId) {
             return NextResponse.json({ message: 'Acesso negado: Perfil global ou de outro tenant.' }, { status: 403 });
         }
      }

      // 1. Preparar permissões
      const featuresQuery = `
        SELECT sf.id, sf.name, sf.slug, sf.category_id, sc.slug AS category_slug, sc.name AS category_name
        FROM system_features sf
        LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      `;
      const featuresResult = await client.query<FeatureRow>(featuresQuery);
      const features = featuresResult.rows;

      const allPermsQuery = 'SELECT id, action, feature_id FROM permissions';
      const allPermsResult = await client.query(allPermsQuery);
      const allPermissions = allPermsResult.rows;

      const permissionIdsToInsert: number[] = [];
      if (permissions) {
        for (const [key, requestedActions] of Object.entries(permissions)) {
          if (!requestedActions || (Array.isArray(requestedActions) && requestedActions.length === 0)) continue;
          const feature = findFeatureByKey(features, key);
          if (!feature) continue;

          const actions = Array.isArray(requestedActions) ? requestedActions : [requestedActions];
          for (const action of actions) {
            const perm = allPermissions.find(p => 
              p.feature_id === feature.id && p.action.toLowerCase() === action.toLowerCase()
            );
            if (perm) permissionIdsToInsert.push(perm.id);
          }
        }
      }

      // 2. Executar gravação
      await client.query('BEGIN');

      try {
        const targetLevel = parseInt(level?.toString()) || 1;
        const targetIsSystem = is_system_role === true && isMasterAdmin;

        await client.query(
          'UPDATE user_roles SET name = $1, description = $2, level = $3, is_system_role = $4, updated_at = NOW() WHERE id = $5',
          [name.trim(), description.trim(), targetLevel, targetIsSystem, perfilId]
        );

        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [perfilId]);
        for (const permId of permissionIdsToInsert) {
          await client.query('INSERT INTO role_permissions (role_id, permission_id, granted_at, tenant_id) VALUES ($1, $2, NOW(), $3)', [perfilId, permId, targetIsSystem ? null : (decoded.tenantId || null)]);
        }

        const fields = custom_fields || [];
        await client.query('DELETE FROM role_custom_fields WHERE role_id = $1', [perfilId]);
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          await client.query(`
            INSERT INTO role_custom_fields (role_id, field_name, field_label, field_type, mask, is_required, field_options, order_index, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            perfilId, 
            f.name || f.field_name, 
            f.label || f.field_label, 
            f.type || f.field_type || 'text', 
            f.mask || null, 
            f.required || f.is_required || false, 
            f.options || f.field_options || null, 
            i,
            targetIsSystem ? null : (decoded.tenantId || null)
          ]);
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'Perfil atualizado com sucesso' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/admin/perfis/[id] - Excluir perfil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'perfis', 'DELETE')
    if (denied) return denied

    // Verificar autenticação - buscar token dos cookies ou header
    const token = request.cookies.get('accessToken')?.value ||
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

    // Verificação Semântica
    const isMasterAdmin = !!decoded.is_system_role;
    
    if (!isMasterAdmin && !(decoded.permissoes?.['usuarios'] === 'ADMIN')) {
       return NextResponse.json({ message: 'Acesso negado ao comando de exclusão.' }, { status: 403 });
    }

    const perfilId = parseInt(params.id);
    if (isNaN(perfilId)) {
      return NextResponse.json(
        { message: 'ID do perfil inválido' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verificar se o perfil existe
      const existingQuery = 'SELECT id, tenant_id, is_system_role FROM user_roles WHERE id = $1';
      const existingResult = await client.query(existingQuery, [perfilId]);
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Perfil não encontrado' },
          { status: 404 }
        );
      }

      const roleTenantId = existingResult.rows[0].tenant_id;
      const isSystemRole = existingResult.rows[0].is_system_role;

      if (!isMasterAdmin) {
         if (isSystemRole || roleTenantId !== decoded.tenantId) {
             return NextResponse.json({ message: 'Acesso negado: Perfil global ou de outro tenant.' }, { status: 403 });
         }
      }

      // Verificar se há usuários usando este perfil
      const usersQuery = 'SELECT COUNT(*) as user_count FROM user_role_assignments WHERE role_id = $1';
      const usersResult = await client.query(usersQuery, [perfilId]);
      const userCount = parseInt(usersResult.rows[0].user_count);

      if (userCount > 0) {
        return NextResponse.json(
          { message: `Não é possível excluir o perfil. Ele está sendo usado por ${userCount} usuário(s).` },
          { status: 409 }
        );
      }

      // Iniciar transação
      await client.query('BEGIN');

      try {
        // Remover permissões do perfil
        const deletePermissionsQuery = `
          DELETE FROM role_permissions 
          WHERE role_id = $1
        `;
        await client.query(deletePermissionsQuery, [perfilId]);

        // Excluir o perfil
        const deletePerfilQuery = `
          DELETE FROM user_roles 
          WHERE id = $1
        `;
        await client.query(deletePerfilQuery, [perfilId]);

        // Commit da transação
        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          message: 'Perfil excluído com sucesso'
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
    console.error('Erro ao excluir perfil:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
