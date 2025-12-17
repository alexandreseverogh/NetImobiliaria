-- ===============================================
-- SCRIPT DE SEED - DADOS INICIAIS
-- Net Imobiliária - Fase 1 - Dia 3
-- ===============================================

-- ===============================================
-- 1. CONFIGURAÇÕES GLOBAIS DE 2FA
-- ===============================================

INSERT INTO system_2fa_settings (
    enabled,
    required_for_roles,
    optional_for_roles,
    code_length,
    code_expiry_minutes,
    max_attempts,
    email_template,
    email_from,
    email_subject
) VALUES (
    true,
    ARRAY[1, 2], -- Super Admin, Admin
    ARRAY[3],    -- Corretor
    6,
    10,
    3,
    'Código de verificação: {{verificationCode}}. Expira em {{expiryMinutes}} minutos.',
    'noreply@localhost',
    'Código de Verificação - Net Imobiliária (Desenvolvimento)'
);

-- ===============================================
-- 2. PERFIS DE USUÁRIO (USER ROLES)
-- ===============================================

INSERT INTO user_roles (name, description, level, is_system_role, requires_2fa, is_active) VALUES
('Super Admin', 'Acesso total ao sistema, incluindo gestão de outros administradores', 4, true, true, true),
('Administrador', 'Acesso total ao sistema, exceto gestão de super admins', 3, true, true, true),
('Corretor', 'Acesso limitado baseado em permissões específicas', 2, true, false, true),
('Usuário Imobiliária', 'Acesso básico e específico', 1, true, false, true);

-- ===============================================
-- 3. FUNCIONALIDADES DO SISTEMA
-- ===============================================

-- Funcionalidades principais
INSERT INTO system_features (name, description, url, icon, category, order_index, is_active, requires_permission, requires_2fa) VALUES
('Dashboard', 'Painel principal com métricas e resumos', '/admin/dashboards', 'ChartBarIcon', 'main', 1, true, true, false),
('Imóveis', 'Gestão completa de propriedades', '/admin/imoveis', 'HomeIcon', 'main', 2, true, true, false),
('Proprietários', 'Cadastro e gestão de proprietários', '/admin/proprietarios', 'UserGroupIcon', 'main', 3, true, true, false),
('Usuários', 'Gestão de usuários do sistema', '/admin/usuarios', 'UsersIcon', 'main', 4, true, true, true),
('Perfis', 'Gestão de perfis e permissões', '/admin/roles', 'ShieldCheckIcon', 'main', 5, true, true, true),
('Funcionalidades', 'Gestão de funcionalidades do sistema', '/admin/features', 'CogIcon', 'main', 6, true, true, true),
('Auditoria', 'Logs e relatórios de auditoria', '/admin/audit', 'DocumentTextIcon', 'main', 7, true, true, true),
('Configurações', 'Configurações gerais do sistema', '/admin/settings', 'AdjustmentsHorizontalIcon', 'main', 8, true, true, true),
('Relatórios', 'Relatórios e dashboards', '/admin/relatorios', 'ChartPieIcon', 'main', 9, true, true, false);

-- Sub-funcionalidades de Imóveis
INSERT INTO system_features (name, description, url, icon, category, parent_id, order_index, is_active, requires_permission, requires_2fa) VALUES
('Listar Imóveis', 'Visualizar lista de imóveis', '/admin/imoveis', 'ListBulletIcon', 'imoveis', 2, 1, true, true, false),
('Cadastrar Imóvel', 'Adicionar novo imóvel', '/admin/imoveis/novo', 'PlusIcon', 'imoveis', 2, 2, true, true, false),
('Mudanças de Status', 'Alterar status dos imóveis', '/admin/mudancas-status', 'ArrowPathIcon', 'imoveis', 2, 3, true, true, false),
('Documentos', 'Gestão de documentos dos imóveis', '/admin/imoveis/documentos', 'DocumentIcon', 'imoveis', 2, 4, true, true, false),
('Imagens', 'Gestão de imagens dos imóveis', '/admin/imoveis/imagens', 'PhotoIcon', 'imoveis', 2, 5, true, true, false);

-- Sub-funcionalidades de Usuários
INSERT INTO system_features (name, description, url, icon, category, parent_id, order_index, is_active, requires_permission, requires_2fa) VALUES
('Listar Usuários', 'Visualizar lista de usuários', '/admin/usuarios', 'ListBulletIcon', 'usuarios', 4, 1, true, true, true),
('Cadastrar Usuário', 'Adicionar novo usuário', '/admin/usuarios/novo', 'PlusIcon', 'usuarios', 4, 2, true, true, true),
('Sessões Ativas', 'Monitorar sessões ativas', '/admin/usuarios/sessoes', 'GlobeAltIcon', 'usuarios', 4, 3, true, true, true),
('Logs de Login', 'Histórico de logins', '/admin/usuarios/logs', 'ClockIcon', 'usuarios', 4, 4, true, true, true);

-- ===============================================
-- 4. PERMISSÕES ESPECÍFICAS
-- ===============================================

-- Permissões para cada funcionalidade
INSERT INTO permissions (feature_id, action, description, is_system_permission) VALUES
-- Dashboard
(1, 'READ', 'Visualizar dashboard', true),
-- Imóveis
(2, 'READ', 'Visualizar imóveis', true),
(2, 'CREATE', 'Criar imóveis', true),
(2, 'UPDATE', 'Editar imóveis', true),
(2, 'DELETE', 'Excluir imóveis', true),
-- Sub-funcionalidades de Imóveis
(10, 'READ', 'Listar imóveis', true),
(11, 'CREATE', 'Cadastrar imóvel', true),
(12, 'UPDATE', 'Alterar status de imóveis', true),
(13, 'READ', 'Visualizar documentos', true),
(13, 'CREATE', 'Upload de documentos', true),
(13, 'DELETE', 'Excluir documentos', true),
(14, 'READ', 'Visualizar imagens', true),
(14, 'CREATE', 'Upload de imagens', true),
(14, 'DELETE', 'Excluir imagens', true),
-- Proprietários
(3, 'READ', 'Visualizar proprietários', true),
(3, 'CREATE', 'Criar proprietários', true),
(3, 'UPDATE', 'Editar proprietários', true),
(3, 'DELETE', 'Excluir proprietários', true),
-- Usuários
(4, 'READ', 'Visualizar usuários', true),
(4, 'CREATE', 'Criar usuários', true),
(4, 'UPDATE', 'Editar usuários', true),
(4, 'DELETE', 'Excluir usuários', true),
-- Sub-funcionalidades de Usuários
(15, 'READ', 'Listar usuários', true),
(16, 'CREATE', 'Cadastrar usuário', true),
(17, 'READ', 'Visualizar sessões ativas', true),
(17, 'DELETE', 'Revogar sessões', true),
(18, 'READ', 'Visualizar logs de login', true),
-- Perfis
(5, 'READ', 'Visualizar perfis', true),
(5, 'CREATE', 'Criar perfis', true),
(5, 'UPDATE', 'Editar perfis', true),
(5, 'DELETE', 'Excluir perfis', true),
-- Funcionalidades
(6, 'READ', 'Visualizar funcionalidades', true),
(6, 'CREATE', 'Criar funcionalidades', true),
(6, 'UPDATE', 'Editar funcionalidades', true),
(6, 'DELETE', 'Excluir funcionalidades', true),
-- Auditoria
(7, 'READ', 'Visualizar auditoria', true),
(7, 'EXPORT', 'Exportar relatórios', true),
-- Configurações
(8, 'READ', 'Visualizar configurações', true),
(8, 'UPDATE', 'Editar configurações', true),
-- Relatórios
(9, 'READ', 'Visualizar relatórios', true),
(9, 'EXPORT', 'Exportar relatórios', true);

-- ===============================================
-- 5. ASSOCIAÇÃO PERFIL-PERMISSÃO
-- ===============================================

-- Super Admin - Todas as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Administrador - Todas as permissões exceto gestão de Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions p
WHERE p.id NOT IN (
    SELECT id FROM permissions 
    WHERE feature_id IN (
        SELECT id FROM system_features 
        WHERE name = 'Usuários' AND parent_id IS NULL
    )
    AND action = 'DELETE'
);

-- Corretor - Permissões limitadas
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions p
WHERE p.feature_id IN (
    -- Dashboard
    1,
    -- Imóveis e sub-funcionalidades
    2, 10, 12, 13, 14,
    -- Proprietários
    3,
    -- Relatórios
    9
) AND p.action IN ('READ', 'UPDATE');

-- Usuário Imobiliária - Apenas visualização
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions p
WHERE p.feature_id IN (
    -- Dashboard
    1,
    -- Imóveis (apenas visualização)
    2, 10, 13, 14,
    -- Proprietários (apenas visualização)
    3,
    -- Relatórios (apenas visualização)
    9
) AND p.action = 'READ';

-- ===============================================
-- 6. CONFIGURAÇÕES DE EMAIL (DESENVOLVIMENTO)
-- ===============================================

INSERT INTO email_settings (
    smtp_host,
    smtp_port,
    smtp_secure,
    from_email,
    from_name,
    is_active,
    environment
) VALUES (
    'smtp.gmail.com',
    587,
    false, -- TLS para desenvolvimento
    'noreply@localhost',
    'Net Imobiliária - Desenvolvimento',
    true,
    'development'
);

-- ===============================================
-- 7. TEMPLATES DE EMAIL
-- ===============================================

INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active) VALUES
(
    '2fa_verification',
    'Código de Verificação - Net Imobiliária',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Código de Verificação - Desenvolvimento</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f8fafc; }
        .code { font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; margin: 20px 0; padding: 20px; background: white; border: 2px solid #1e40af; border-radius: 8px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .dev-notice { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Código de Verificação</h1>
            <p>Net Imobiliária - Sistema Administrativo</p>
        </div>
        <div class="content">
            <div class="dev-notice">
                <strong>🧪 AMBIENTE DE DESENVOLVIMENTO</strong><br>
                Este é um email de teste do sistema de 2FA.
            </div>
            
            <h2>Olá, {{userName}}!</h2>
            <p>Você solicitou acesso ao sistema administrativo. Use o código abaixo para completar o login:</p>
            
            <div class="code">{{verificationCode}}</div>
            
            <p><strong>Este código expira em {{expiryMinutes}} minutos.</strong></p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                    <li>Nunca compartilhe este código com ninguém</li>
                    <li>Se você não solicitou este acesso, ignore este email</li>
                    <li>Em caso de dúvidas, entre em contato com o administrador</li>
                </ul>
            </div>
            
            <p>Atenciosamente,<br>Equipe Net Imobiliária</p>
        </div>
    </div>
</body>
</html>',
    'Código de Verificação - Net Imobiliária

Olá, {{userName}}!

Você solicitou acesso ao sistema administrativo. Use o código abaixo para completar o login:

{{verificationCode}}

Este código expira em {{expiryMinutes}} minutos.

⚠️ Importante:
- Nunca compartilhe este código com ninguém
- Se você não solicitou este acesso, ignore este email
- Em caso de dúvidas, entre em contato com o administrador

Atenciosamente,
Equipe Net Imobiliária',
    '{"userName": "string", "verificationCode": "string", "expiryMinutes": "number"}',
    true
);

-- ===============================================
-- 8. USUÁRIO ADMINISTRADOR INICIAL
-- ===============================================

-- Criar usuário administrador inicial
INSERT INTO users (username, email, password_hash, nome, is_active, email_verified) VALUES
('admin', 'admin@localhost', crypt('admin123', gen_salt('bf')), 'Administrador Inicial', true, true);

-- Associar ao perfil Super Admin
INSERT INTO user_role_assignments (user_id, role_id, assigned_by) VALUES
(1, 1, 1);

-- Configurar 2FA para o administrador
INSERT INTO user_2fa_config (user_id, method, email, is_enabled) VALUES
(1, 'email', 'admin@localhost', true);

-- ===============================================
-- VERIFICAÇÃO DOS DADOS INSERIDOS
-- ===============================================

-- Verificar configurações de 2FA
SELECT 'Configurações 2FA:' as tipo, COUNT(*) as quantidade FROM system_2fa_settings;

-- Verificar perfis criados
SELECT 'Perfis:' as tipo, COUNT(*) as quantidade FROM user_roles;

-- Verificar funcionalidades criadas
SELECT 'Funcionalidades:' as tipo, COUNT(*) as quantidade FROM system_features;

-- Verificar permissões criadas
SELECT 'Permissões:' as tipo, COUNT(*) as quantidade FROM permissions;

-- Verificar associações perfil-permissão
SELECT 'Associações Perfil-Permissão:' as tipo, COUNT(*) as quantidade FROM role_permissions;

-- Verificar configurações de email
SELECT 'Configurações Email:' as tipo, COUNT(*) as quantidade FROM email_settings;

-- Verificar templates de email
SELECT 'Templates Email:' as tipo, COUNT(*) as quantidade FROM email_templates;

-- Verificar usuário administrador
SELECT 'Usuário Admin:' as tipo, COUNT(*) as quantidade FROM users WHERE username = 'admin';

-- ===============================================
-- SCRIPT DE SEED CONCLUÍDO
-- ===============================================

-- Mostrar resumo final
SELECT 
    'SEED CONCLUÍDO' as status,
    (SELECT COUNT(*) FROM user_roles) as perfis_criados,
    (SELECT COUNT(*) FROM system_features) as funcionalidades_criadas,
    (SELECT COUNT(*) FROM permissions) as permissoes_criadas,
    (SELECT COUNT(*) FROM role_permissions) as associacoes_criadas,
    (SELECT COUNT(*) FROM users) as usuarios_criados;



