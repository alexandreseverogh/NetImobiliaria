import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;

  try {
    const query = `
      SELECT t.*,
             s.name as segment_name, 
             s.color_theme as segment_color, 
             s.icon as segment_icon,
             u.nome as admin_nome, 
             u.email as admin_email, 
             u.username as admin_username
      FROM tenants t
      LEFT JOIN system_segments s ON t.segment_id = s.id
      LEFT JOIN user_tenant_membership utm ON t.id = utm.tenant_id AND utm.is_owner = true
      LEFT JOIN users u ON utm.user_id = u.id
      WHERE t.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ tenant: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching tenant details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;

  let client: any = null;
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const body = await request.json();
    client = await pool.connect();
    const { 
      name, slug, segment_id, logo, logo_url, cnpj_cpf, 
      logradouro, numero, bairro, cidade, estado, cep, telefone, email_contato,
      status, calendario, google_email, duracao_visita, ai_config,
      admin_nome, admin_username, admin_email, admin_password,
      primary_color, secondary_color
    } = body;

    await client.query('BEGIN');

    // 1. Atualizar Usuário Administrador (se houver dados de admin no body)
    if (admin_email || admin_username || admin_nome || admin_password) {
      // Buscar o ID do usuário que é o owner deste tenant
      const ownerRes = await client.query(
        'SELECT user_id FROM user_tenant_membership WHERE tenant_id = $1 AND is_owner = true',
        [id]
      );

      if (ownerRes.rows.length > 0) {
        const adminId = ownerRes.rows[0].user_id;
        const userUpdates: string[] = [];
        const userValues: any[] = [];
        let uIdx = 1;

        if (admin_nome) { userUpdates.push(`nome = $${uIdx++}`); userValues.push(admin_nome); }
        if (admin_email) { userUpdates.push(`email = $${uIdx++}`); userValues.push(admin_email); }
        if (admin_username) { userUpdates.push(`username = $${uIdx++}`); userValues.push(admin_username); }
        
        if (admin_password) {
          const hashed = await bcrypt.hash(admin_password, 10);
          userUpdates.push(`password = $${uIdx++}`);
          userValues.push(hashed);
        }

        if (userUpdates.length > 0) {
          userValues.push(adminId);
          await client.query(
            `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = $${uIdx}`,
            userValues
          );
        }
      }
    }

    // 2. Logo pode vir como 'logo' (base64) ou 'logo_url' (string/URL)
    const finalLogo = logo || logo_url;

    const query = `
      UPDATE tenants SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        segment_id = COALESCE($3, segment_id),
        logo_url = COALESCE($4, logo_url),
        cnpj_cpf = COALESCE($5, cnpj_cpf),
        logradouro = COALESCE($6, logradouro),
        numero = COALESCE($7, numero),
        bairro = COALESCE($8, bairro),
        cidade = COALESCE($9, cidade),
        estado = COALESCE($10, estado),
        cep = COALESCE($11, cep),
        telefone = COALESCE($12, telefone),
        email_contato = COALESCE($13, email_contato),
        status = COALESCE($14, status),
        calendario = COALESCE($15, calendario),
        google_email = COALESCE($16, google_email),
        duracao_visita = COALESCE($17, duracao_visita),
        ai_config = COALESCE($18, ai_config),
        primary_color = COALESCE($19, primary_color),
        secondary_color = COALESCE($20, secondary_color),
        updated_at = NOW()
      WHERE id = $21
      RETURNING *
    `;

    const values = [
      name || null, slug || null, segment_id || null, finalLogo || null, cnpj_cpf || null,
      logradouro || null, numero || null, bairro || null, cidade || null, 
      estado || null, cep || null, telefone || null, email_contato || null,
      status || null, 
      calendario !== undefined ? calendario : null,
      google_email || null,
      duracao_visita || null,
      ai_config ? JSON.stringify(ai_config) : null,
      primary_color || null,
      secondary_color || null,
      id
    ];

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, tenant: result.rows[0] });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;
  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    await client.query('BEGIN');

    // 1. Limpar relações que podem não ter cascade
    await client.query('DELETE FROM tenant_modules WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM user_tenant_membership WHERE tenant_id = $1', [id]);
    await client.query('DELETE FROM user_roles WHERE tenant_id = $1', [id]);
    
    // 2. Deletar Tenant
    const result = await client.query('DELETE FROM tenants WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new Error('Unidade não encontrada para exclusão');
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Unidade excluída com sucesso' });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error deleting tenant:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}