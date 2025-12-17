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

// GET /api/admin/perfis - Listar todos os perfis
export async function GET(request: NextRequest) {
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

    // Verificar se é admin ou super admin - usar role_name do JWT atual
    if (!decoded.role_name || !['Super Admin', 'Administrador'].includes(decoded.role_name)) {
      return NextResponse.json(
        { message: 'Acesso negado. Permissão insuficiente.' },
        { status: 403 }
      );
    }

    const client = await pool.connect();

    try {
      // Buscar perfis com contagem de usuários
      const perfisQuery = `
        SELECT 
          ur.id,
          ur.name,
          ur.description,
          COUNT(ura.user_id) as user_count
        FROM user_roles ur
        LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
        GROUP BY ur.id, ur.name, ur.description
        ORDER BY ur.name
      `;

      const perfisResult = await client.query(perfisQuery);
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
          
          // Consolidar permissões por funcionalidade (priorizar DELETE > WRITE > READ)
          const permissoes: Record<string, string> = {};
          permissoesResult.rows.forEach((row) => {
            const { feature_name, action } = row;
            
            // Se não tem permissão para esta funcionalidade, ou se a nova ação tem maior prioridade
            if (!permissoes[feature_name]) {
              permissoes[feature_name] = action;
            } else {
              // Priorizar: delete > update/create > read
              const currentPriority = getActionPriority(permissoes[feature_name]);
              const newPriority = getActionPriority(action);
              
              if (newPriority > currentPriority) {
                permissoes[feature_name] = action;
              }
            }
          });
          
          // Função auxiliar para determinar prioridade das ações
          function getActionPriority(action: string): number {
            switch (action) {
              case 'ADMIN':
              case 'admin':
                return 6 // Máxima prioridade
              case 'DELETE':
              case 'delete':
                return 5
              case 'UPDATE':
              case 'update':
                return 4
              case 'CREATE':
              case 'create':
                return 3
              case 'EXECUTE':
              case 'execute':
                return 3
              case 'READ':
              case 'read':
              case 'LIST':
              case 'list':
                return 1
              default:
                return 0
            }
          }

          // Mapear ações do banco para níveis de permissão do frontend
          const actionToPermissionLevel: Record<string, string> = {
            READ: 'READ',
            LIST: 'READ',
            UPDATE: 'UPDATE',
            DELETE: 'DELETE',
            ADMIN: 'ADMIN',
            EXECUTE: 'EXECUTE',
            CREATE: 'CREATE',
            read: 'READ',
            list: 'READ',
            update: 'UPDATE',
            create: 'CREATE',
            delete: 'DELETE',
            execute: 'EXECUTE',
            admin: 'ADMIN',
          };

          // Converter ações para níveis de permissão
          const permissoesFinais: Record<string, string> = {};
          Object.entries(permissoes).forEach(([feature, action]) => {
            permissoesFinais[feature] = actionToPermissionLevel[action] || 'NONE';
          });

          return {
            id: perfil.id,
            name: perfil.name,
            description: perfil.description,
            userCount: parseInt(perfil.user_count),
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

// POST /api/admin/perfis - Criar novo perfil
export async function POST(request: NextRequest) {
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
      // Verificar se já existe um perfil com o mesmo nome
      const existingQuery = 'SELECT id FROM user_roles WHERE LOWER(name) = LOWER($1)';
      const existingResult = await client.query(existingQuery, [name.trim()]);
      
      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { message: 'Já existe um perfil com este nome' },
          { status: 409 }
        );
      }

      // Iniciar transação
      await client.query('BEGIN');

      try {
        // Criar o perfil
        const createPerfilQuery = `
          INSERT INTO user_roles (name, description, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          RETURNING id
        `;
        
        const createResult = await client.query(createPerfilQuery, [name.trim(), description.trim()]);
        const perfilId = createResult.rows[0].id;

        // Configurar permissões padrão se não fornecidas
        const permissoesParaConfigurar = permissions || {
          imoveis: 'READ',
          proximidades: 'READ',
          amenidades: 'READ',
          'categorias-amenidades': 'READ',
          'categorias-proximidades': 'READ',
          usuarios: 'NONE',
          relatorios: 'READ',
          sistema: 'NONE'
        };

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

        // Configurar permissões para o novo perfil
        for (const [categoryKey, permission] of Object.entries(permissoesParaConfigurar)) {
          if (permission === 'NONE') continue;

          const feature = findFeatureByKey(features, categoryKey)
          if (!feature) {
            console.warn('⚠️ Perfil - Funcionalidade não encontrada para chave de permissão:', categoryKey)
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
