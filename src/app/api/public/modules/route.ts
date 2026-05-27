import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT id, name, slug, description, icon, is_active
      FROM system_modules
      WHERE is_active = true AND slug != 'master-platform'
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    
    // Mapeamento opcional para garantir que o Saúde Digital tenha uma descrição legal se vier nula do banco
    const modules = result.rows.map(m => {
      if (m.slug === 'saude' && !m.description) {
        return {
          ...m,
          description: 'Módulo inovador de gestão e acompanhamento de saúde corporativa e telemedicina integrada.'
        };
      }
      return m;
    });

    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    console.error('Error fetching public modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
