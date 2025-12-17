import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

// GET /api/admin/perfis/[id] - Buscar perfil específico
export async function GET(
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

    // Verificar permissão (usuarios:READ)
    if (!decoded.permissoes?.usuarios || !['READ', 'WRITE', 'DELETE'].includes(decoded.permissoes.usuarios)) {
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
          sf.category,
          p.action
        FROM user_roles ur
        JOIN role_permissions rp ON ur.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN system_features sf ON p.feature_id = sf.id
        WHERE ur.id = $1
        ORDER BY sf.category, p.action
      `;

      const permissoesResult = await client.query(permissoesQuery, [perfilId]);
      
      // Consolidar permissões por categoria
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

      return NextResponse.json({
        success: true,
        perfil: {
          id: perfil.id,
          name: perfil.name,
          description: perfil.description,
          userCount: parseInt(perfil.user_count),
          permissions: permissoes
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
    if (!decoded.permissoes?.usuarios || !['WRITE', 'DELETE'].includes(decoded.permissoes.usuarios)) {
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
          // Mapear permissões do frontend para o banco
          const permissionMapping: Record<string, string[]> = {
            'READ': ['read', 'list'],
            'WRITE': ['read', 'list', 'create', 'update'],
            'DELETE': ['read', 'list', 'create', 'update', 'delete']
          };

          // Buscar todas as funcionalidades do sistema
          const featuresQuery = 'SELECT id, category FROM system_features';
          const featuresResult = await client.query(featuresQuery);
          const features = featuresResult.rows;

          // Buscar todas as permissões disponíveis
          const permissionsQuery = 'SELECT id, action, feature_id FROM permissions';
          const permissionsResult = await client.query(permissionsQuery);
          const allPermissions = permissionsResult.rows;

          // Configurar permissões para o perfil
          for (const [category, permission] of Object.entries(permissions)) {
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
    if (!decoded.permissoes?.usuarios || decoded.permissoes.usuarios !== 'DELETE') {
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
