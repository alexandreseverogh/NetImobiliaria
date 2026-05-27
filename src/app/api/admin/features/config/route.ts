import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Buscar configuração da feature (mapeamento semântico)
    const query = `
      SELECT id, name, slug, semantic_mapping 
      FROM system_features 
      WHERE slug = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching feature config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
