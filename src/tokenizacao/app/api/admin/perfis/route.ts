import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

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

    // Verificar permissão (usuarios:READ)
    if (!decoded.permissoes?.usuarios || !['READ', 'WRITE', 'DELETE'].includes(decoded.permissoes.usuarios)) {
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
              sf.category,
              p.action
            FROM user_roles ur
            JOIN role_permissions rp ON ur.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE ur.id = $1
            ORDER BY sf.category, p.action
          `;

          const permissoesResult = await client.query(permissoesQuery, [perfil.id]);
          
          // Consolidar permissões por categoria (priorizar DELETE > WRITE > READ)
          const permissoes: Record<string, string> = {};
          permissoesResult.rows.forEach((row) => {
            const { category, action } = row;
            if (!permissoes[category] || 
                (action === 'DELETE') || 
                (action === 'WRITE' && permissoes[category] !== 'DELETE') ||
                (action === 'READ' && !['WRITE', 'DELETE'].includes(permissoes[category]))) {
              permissoes[category] = action;
            }
          });

          // Definir permissões padrão para categorias não configuradas
          const categorias = ['imoveis', 'proximidades', 'amenidades', 'categorias-amenidades', 'categorias-proximidades', 'usuarios', 'relatorios', 'sistema'];
          categorias.forEach(categoria => {
            if (!permissoes[categoria]) {
              permissoes[categoria] = 'NONE';
            }
          });

          return {
            id: perfil.id,
            name: perfil.name,
            description: perfil.description,
            userCount: parseInt(perfil.user_count),
            permissions: permissoes
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
    if (!decoded.permissoes?.usuarios || !['WRITE', 'DELETE'].includes(decoded.permissoes.usuarios)) {
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
        const featuresQuery = 'SELECT id, category FROM system_features';
        const featuresResult = await client.query(featuresQuery);
        const features = featuresResult.rows;

        // Buscar todas as permissões disponíveis
        const permissionsQuery = 'SELECT id, action, feature_id FROM permissions';
        const permissionsResult = await client.query(permissionsQuery);
        const allPermissions = permissionsResult.rows;

        // Mapear permissões do frontend para o banco
        const permissionMapping: Record<string, string[]> = {
          'READ': ['read', 'list'],
          'WRITE': ['read', 'list', 'create', 'update'],
          'DELETE': ['read', 'list', 'create', 'update', 'delete']
        };

        // Configurar permissões para o novo perfil
        for (const [category, permission] of Object.entries(permissoesParaConfigurar)) {
          if (permission === 'NONE') continue;

          const feature = features.find(f => f.category === category);
          if (!feature) continue;

          const actionsToAssign = permissionMapping[permission as keyof typeof permissionMapping] || [];
          
          for (const action of actionsToAssign) {
            const permissionObj = allPermissions.find(p => 
              p.action === action && p.feature_id === feature.id
            );
            
            if (permissionObj) {
              // Associar permissão ao perfil
              const assignQuery = `
                INSERT INTO role_permissions (role_id, permission_id, created_at)
                VALUES ($1, $2, NOW())
              `;
              await client.query(assignQuery, [perfilId, permissionObj.id]);
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
