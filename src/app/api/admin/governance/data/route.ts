import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagKey = searchParams.get('tag');

    if (!tagKey) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

    const token = request.cookies.get('admin_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const client = await pool.connect();

    try {
      // 1. Buscar a definição da tag no dicionário
      const tagQuery = `
        SELECT * FROM system_role_tags WHERE tag_key = $1
      `;
      const tagRes = await client.query(tagQuery, [tagKey]);

      if (tagRes.rows.length === 0) {
        return NextResponse.json({ error: `Tag '${tagKey}' não cadastrada no dicionário semântico.` }, { status: 404 });
      }

      const tagDef = tagRes.rows[0];
      let results = [];

      // 2. Resolver baseado no Tipo de Fonte
      if (tagDef.source_type === 'USER_ROLE') {
        // Lógica Legada/Específica para Usuários (JOIN com Roles)
        const usersQuery = `
          SELECT DISTINCT u.id as value, u.nome as label
          FROM users u
          JOIN user_tenant_membership utm ON u.id = utm.user_id
          JOIN user_roles ur ON utm.role_id = ur.id
          JOIN system_role_tags srt ON ur.system_tag_id = srt.id
          WHERE srt.tag_key = $1 AND utm.tenant_id = $2 AND utm.is_active = true
          ORDER BY u.nome ASC
        `;
        const usersRes = await client.query(usersQuery, [tagKey, decoded.tenantId]);
        results = usersRes.rows;
      } 
      else if (tagDef.source_type === 'TABLE' || tagDef.source_table) {
        // Lógica Universal: Consulta qualquer tabela configurada pelo Master
        const tableName = tagDef.source_table;
        const idCol = tagDef.id_column || 'id';
        const labelCol = tagDef.label_column || 'nome';
        
        // Segurança: Sanitização básica de nomes de colunas/tabela (alfanumérico e underscore)
        const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const safeId = idCol.replace(/[^a-zA-Z0-9_]/g, '');
        const safeLabel = labelCol.replace(/[^a-zA-Z0-9_]/g, '');

        // Construção da query dinâmica (protegendo contra injeção SQL nos valores, não nas colunas)
        let dynamicQuery = `SELECT ${safeId} as value, ${safeLabel} as label FROM ${safeTable}`;
        const params = [];

        // Adicionar filtro de tenant se a tabela possuir a coluna tenant_id
        const hasTenantCol = await client.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [safeTable]);

        if (hasTenantCol.rows.length > 0) {
          dynamicQuery += ` WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
          params.push(decoded.tenantId);
        }

        // Filtros adicionais configurados pelo Master
        if (tagDef.filter_column && tagDef.filter_value) {
            const safeFilterCol = tagDef.filter_column.replace(/[^a-zA-Z0-9_]/g, '');
            dynamicQuery += params.length > 0 ? ' AND ' : ' WHERE ';
            dynamicQuery += `${safeFilterCol} = $${params.length + 1}`;
            params.push(tagDef.filter_value);
        }

        dynamicQuery += ` ORDER BY ${safeLabel} ASC`;
        
        const dynamicRes = await client.query(dynamicQuery, params);
        results = dynamicRes.rows;
      }

      return NextResponse.json({
        success: true,
        tag: tagKey,
        data: results
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Error in Universal Resolver:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
