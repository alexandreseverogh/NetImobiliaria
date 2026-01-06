import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

export async function POST(request: NextRequest) {
  const diagnostico: any = {
    etapa: '',
    erro: null,
    detalhes: {}
  };

  try {
    diagnostico.etapa = '1. Recebendo body';
    const body = await request.json();
    const { username, password } = body;
    diagnostico.detalhes.username = username;
    diagnostico.detalhes.password_length = password?.length || 0;

    diagnostico.etapa = '2. Conectando ao banco';
    const client = await pool.connect();
    diagnostico.detalhes.db_connected = true;

    try {
      diagnostico.etapa = '3. Buscando usuário';
      const userQuery = `
        SELECT 
          u.id, u.username, u.email, u.password, u.ativo,
          u.two_fa_enabled
        FROM users u
        WHERE u.username = $1 OR u.email = $1
      `;
      
      const userResult = await client.query(userQuery, [username]);
      diagnostico.detalhes.user_found = userResult.rows.length > 0;
      
      if (userResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          diagnostico,
          message: 'Usuário não encontrado'
        });
      }

      const user = userResult.rows[0];
      diagnostico.detalhes.user_id = user.id;
      diagnostico.detalhes.user_active = user.ativo;
      diagnostico.detalhes.two_fa_enabled = user.two_fa_enabled;

      diagnostico.etapa = '4. Verificando senha';
      const passwordMatch = await bcrypt.compare(password, user.password);
      diagnostico.detalhes.password_match = passwordMatch;

      if (!passwordMatch) {
        return NextResponse.json({
          success: false,
          diagnostico,
          message: 'Senha incorreta'
        });
      }

      diagnostico.etapa = '5. Importando twoFactorAuthService';
      const twoFactorAuthService = (await import('../../../../../services/twoFactorAuthService')).default;
      diagnostico.detalhes.service_imported = true;

      diagnostico.etapa = '6. Verificando 2FA';
      const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(user.id);
      diagnostico.detalhes.is2fa_enabled_result = is2FAEnabled;

      diagnostico.etapa = '7. Teste de emailService';
      const emailService = (await import('../../../../../services/emailService')).default;
      diagnostico.detalhes.email_service_imported = true;

      return NextResponse.json({
        success: true,
        diagnostico,
        message: 'Diagnóstico completo - todas as etapas passaram!'
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      diagnostico,
      erro: {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5)
      }
    }, { status: 500 });
  }
}

