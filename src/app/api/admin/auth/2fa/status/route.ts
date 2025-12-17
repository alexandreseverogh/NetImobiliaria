import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../../services/twoFactorAuthService';

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Verificar status 2FA
    const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(userId);

    // Buscar configuração 2FA
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'net_imobiliaria',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Roberto@2007',
    });

    const configQuery = `
      SELECT method, email, last_used, backup_codes
      FROM user_2fa_config 
      WHERE user_id = $1
    `;
    
    const configResult = await pool.query(configQuery, [userId]);
    const config = configResult.rows[0];
    
    await pool.end();

    return NextResponse.json({
      success: true,
      data: {
        isEnabled: is2FAEnabled,
        method: config?.method || null,
        email: config?.email || null,
        lastUsed: config?.last_used || null,
        hasBackupCodes: config?.backup_codes ? config.backup_codes.length > 0 : false
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}