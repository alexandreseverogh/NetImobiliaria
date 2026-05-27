import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Criar o Tenant Master se não existir
    await client.query(`
      INSERT INTO tenants (id, name, slug, status, is_system_tenant, created_at, updated_at)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Master Platform', 'master-platform', 'active', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET is_system_tenant = true;
    `);

    // 2. Atualizar níveis e flags das roles fundamentais
    // Role 41: Master Platform
    await client.query(`
      UPDATE user_roles 
      SET level = 1000, is_system_role = true, tenant_id = NULL
      WHERE id = 41;
    `);

    // Role 42: Administrador (Padrão de Empresa)
    await client.query(`
      UPDATE user_roles 
      SET level = 100, is_system_role = false, is_admin_role = true
      WHERE id = 42;
    `);

    // 3. Garantir que o usuário 'admin' está vinculado ao Tenant Master com a Role 41
    await client.query(`
      INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_owner, is_active)
      SELECT id, '00000000-0000-0000-0000-000000000001', 41, true, true 
      FROM users 
      WHERE username = 'admin'
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Pilar 1: Fundação de Dados concluída com sucesso.' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
