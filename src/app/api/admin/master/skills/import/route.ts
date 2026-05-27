import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  // Apenas Master pode importar habilidades globais
  if (!decoded || !decoded.is_system_role) {
    if (decoded?.username !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  }

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const { skill } = await request.json();

    if (!skill || !skill.id) {
      return NextResponse.json({ error: 'Dados da Skill inválidos' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Criar ou Atualizar a Categoria Automática de Superpoderes
      const catRes = await client.query(`
        INSERT INTO system_categorias (name, slug, sort_order)
        VALUES ('Superpoderes & IA', 'superpowers-ia', 99)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);
      const categoryId = catRes.rows[0].id;

      // 2. Importar como Feature no Sistema
      const featureRes = await client.query(`
        INSERT INTO system_features (name, slug, category_id, is_active, is_skill, skill_metadata)
        VALUES ($1, $2, $3, true, true, $4)
        ON CONFLICT (slug) DO UPDATE 
        SET name = $1, is_skill = true, skill_metadata = $4
        RETURNING id
      `, [skill.name, skill.id, categoryId, JSON.stringify({
        type: skill.category,
        origin: skill.origin,
        version: skill.version,
        requirements: skill.requirements || []
      })]);
      
      const featureId = featureRes.rows[0].id;

      // 3. Vincular a um Módulo Base (Padrão: Administrativo ou o primeiro módulo de sistema)
      const moduleRes = await client.query("SELECT id FROM system_modules WHERE name = 'Administrativo' OR name = 'SISTEMA' LIMIT 1");
      if (moduleRes.rows.length > 0) {
        await client.query(`
          INSERT INTO system_feature_modules (feature_id, module_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [featureId, moduleRes.rows[0].id]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Habilidade '${skill.name}' importada e associada com sucesso!`,
        featureId
      });
    } catch (dbErr: any) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Erro na importação de skill:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
