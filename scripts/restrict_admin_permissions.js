import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
  const roleId = 2; // Administrador Local

  try {
    console.log(`🧹 Limpando permissões do cargo Administrador (ID: ${roleId})...`);

    // 1. Remover TODAS as permissões atuais
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // 2. Adicionar apenas o "Core Governance" solicitado pelo usuário
    // IDs das permissões identificadas: 782, 779, 780, 781 (usuarios), 836 (perfis), 837 (hierarquia), 839 (permissoes)
    const permissionsToAdd = [782, 779, 780, 781, 836, 837, 839];

    for (const pId of permissionsToAdd) {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleId, pId]
      );
    }

    console.log('✅ Role Administrador agora possui acesso APENAS à Governança (Usuários, Perfis, Hierarquias e Permissões).');
    
  } catch(e) {
    console.error('❌ Erro:', e);
  } finally {
    pool.end();
  }
}

run();
