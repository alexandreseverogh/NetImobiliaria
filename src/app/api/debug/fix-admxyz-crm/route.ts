
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminRoleId = 42;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Encontrar todas as features vinculadas ao módulo CRM
      const featuresRes = await client.query(`
        SELECT f.id, f.slug, f.name
        FROM system_features f
        JOIN system_feature_modules fm ON f.id = fm.feature_id
        JOIN system_modules m ON fm.module_id = m.id
        WHERE m.slug = 'crm'
      `);
      
      const features = featuresRes.rows;
      const actions = ['read', 'write', 'delete', 'admin'];

      for (const feature of features) {
        for (const action of actions) {
          // Criar permissão se não existir
          const pRes = await client.query(`
            INSERT INTO permissions (feature_id, action)
            SELECT $1, $2::text
            WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE feature_id = $1 AND action = $2::text)
            RETURNING id
          `, [feature.id, action]);
          
          let permissionId = pRes.rows[0]?.id;
          if (!permissionId) {
            const existing = await client.query("SELECT id FROM permissions WHERE feature_id = $1 AND action = $2", [feature.id, action]);
            permissionId = existing.rows[0].id;
          }

          // Vincular à role (Role 42 é o Admin Padrão)
          await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, $2
            WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2)
          `, [adminRoleId, permissionId]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ 
        success: true, 
        message: `CRM Permissions provisioned for Role ${adminRoleId}`,
        features_count: features.length
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
