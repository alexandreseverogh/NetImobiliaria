import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

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

    // Verificar permissão (usuarios:READ)
    if (!decoded.role_name || !['Super Admin', 'Administrador'].includes(decoded.role_name)) {
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
          COUNT(ura.user_id) as user_count
        FROM user_roles ur
        LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ur.id = $1
        GROUP BY ur.id, ur.name, ur.description
      `;

      const perfilResult = await client.query(perfilQuery, [perfilId]);
      
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

      const getActionPriority = (action: string): number => {
        switch (action) {
          case 'ADMIN':
            return 5 // Máxima prioridade
          case 'DELETE':
          case 'delete':
            return 4
          case 'UPDATE':
          case 'update':
          case 'create':
          case 'execute':
            return 3
          case 'READ':
          case 'read':
            return 1
          default:
            return 0
        }
      }

      permissoesResult.rows.forEach((row) => {
        const { feature_name, action } = row;
        
        // Debug específico para "Categorias"
        if (feature_name === 'Categorias') {
          console.log('🔍 DEBUG - Processando Categorias:', { feature_name, action, current: permissoes[feature_name] });
        }
        
        // Se não tem permissão para esta funcionalidade, ou se a nova ação tem maior prioridade
        if (!permissoes[feature_name]) {
          permissoes[feature_name] = action;
          
          // Debug específico para "Categorias"
          if (feature_name === 'Categorias') {
            console.log('🔍 DEBUG - Categorias definida como:', action);
          }
        } else {
          // Priorizar: delete > update/create > read
          const currentPriority = getActionPriority(permissoes[feature_name]);
          const newPriority = getActionPriority(action);
          
          if (newPriority > currentPriority) {
            permissoes[feature_name] = action;
            
            // Debug específico para "Categorias"
            if (feature_name === 'Categorias') {
              console.log('🔍 DEBUG - Categorias atualizada para:', action, 'prioridade:', newPriority, 'vs', currentPriority);
            }
          }
        }
      });

      // Mapear ações do banco para níveis de permissão do frontend
      const actionToPermissionLevel: Record<string, string> = {
        'READ': 'READ',
        'UPDATE': 'UPDATE', 
        'DELETE': 'DELETE',
        'ADMIN': 'DELETE', // ADMIN = Acesso total (Exclusão)
        'read': 'READ',
        'create': 'UPDATE', 
        'update': 'UPDATE',
        'delete': 'DELETE',
        'execute': 'UPDATE'
      };

      // Converter ações para níveis de permissão
      const permissoesFinais: Record<string, string> = {};
      Object.entries(permissoes).forEach(([feature, action]) => {
        permissoesFinais[feature] = actionToPermissionLevel[action] || 'NONE';
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

      return NextResponse.json({
        success: true,
        perfil: {
          id: perfil.id,
          name: perfil.name,
          description: perfil.description,
          userCount: parseInt(perfil.user_count),
          permissions: permissoesFinais
        }
      });

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

// PUT /api/admin/perfis/[id] - Atualizar perfil
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verificar permissão (usuarios:WRITE)
    if (!decoded.role_name || !['Super Admin', 'Administrador'].includes(decoded.role_name)) {
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

    const body = await request.json();
    const { name, description, permissions } = body;

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
      // Verificar se o perfil existe
      const existingQuery = 'SELECT id FROM user_roles WHERE id = $1';
      const existingResult = await client.query(existingQuery, [perfilId]);
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Perfil não encontrado' },
          { status: 404 }
        );
      }

      // Verificar se já existe outro perfil com o mesmo nome
      const duplicateQuery = 'SELECT id FROM user_roles WHERE LOWER(name) = LOWER($1) AND id != $2';
      const duplicateResult = await client.query(duplicateQuery, [name.trim(), perfilId]);
      
      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { message: 'Já existe outro perfil com este nome' },
          { status: 409 }
        );
      }

      // Iniciar transação
      await client.query('BEGIN');

      try {
        // Atualizar dados básicos do perfil
        const updatePerfilQuery = `
          UPDATE user_roles 
          SET name = $1, description = $2, updated_at = NOW()
          WHERE id = $3
        `;
        
        await client.query(updatePerfilQuery, [name.trim(), description.trim(), perfilId]);

        // Remover permissões existentes
        const deletePermissionsQuery = `
          DELETE FROM role_permissions 
          WHERE role_id = $1
        `;
        await client.query(deletePermissionsQuery, [perfilId]);

        // Configurar novas permissões
        if (permissions) {
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

          // Buscar todas as permissões disponíveis
          const permissionsQuery = 'SELECT id, action, feature_id FROM permissions'
          const permissionsResult = await client.query(permissionsQuery)
          const allPermissions = permissionsResult.rows

          // Configurar permissões para o perfil
          for (const [categoryKey, permission] of Object.entries(permissions)) {
            if (permission === 'NONE') continue

            const feature = findFeatureByKey(features, categoryKey)
            if (!feature) {
              console.warn(
                '⚠️ Perfil (update) - Funcionalidade não encontrada para chave de permissão:',
                categoryKey
              )
              continue
            }

            const actionsToAssign =
              permissionMapping[permission as keyof typeof permissionMapping] || []

            for (const action of actionsToAssign) {
              const permissionObj = allPermissions.find(
                p => p.feature_id === feature.id && p.action.toLowerCase() === action.toLowerCase()
              )

              if (permissionObj) {
                // Associar permissão ao perfil
                const assignQuery = `
                  INSERT INTO role_permissions (role_id, permission_id, granted_at)
                  VALUES ($1, $2, NOW())
                `
                await client.query(assignQuery, [perfilId, permissionObj.id])
              }
            }
          }
        }

        // Commit da transação
        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          message: 'Perfil atualizado com sucesso'
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
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/perfis/[id] - Excluir perfil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verificar permissão (usuarios:DELETE)
    if (!decoded.role_name || !['Super Admin', 'Administrador'].includes(decoded.role_name)) {
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
      // Verificar se o perfil existe
      const existingQuery = 'SELECT id FROM user_roles WHERE id = $1';
      const existingResult = await client.query(existingQuery, [perfilId]);
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Perfil não encontrado' },
          { status: 404 }
        );
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
