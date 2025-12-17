# 🧪 ROTEIRO COMPLETO: TESTE 2FA E PERMISSÕES

**Sistema Net Imobiliária**  
**Versão:** 1.0  
**Data:** 2025-10-09

---

## 📑 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [TESTE 1: Criar Novo Usuário](#teste-1-criar-novo-usuário)
3. [TESTE 2: Ativar 2FA para o Usuário](#teste-2-ativar-2fa)
4. [TESTE 3: Login com 2FA](#teste-3-login-com-2fa)
5. [TESTE 4: Liberar Permissões](#teste-4-liberar-permissões)
6. [TESTE 5: Verificar Acesso na Sidebar](#teste-5-verificar-sidebar)
7. [Checklist Completo](#checklist-completo)
8. [Troubleshooting](#troubleshooting)

---

## ✅ PRÉ-REQUISITOS

### 1. Verificar Configurações de Email

```sql
-- Verificar se email está configurado
SELECT 
  smtp_host,
  smtp_port,
  smtp_username,
  from_email,
  is_active,
  environment
FROM email_settings
WHERE is_active = true;
```

**Resultado esperado:**
```
smtp_host: smtp.gmail.com
smtp_port: 587
smtp_username: seu-email@gmail.com
from_email: noreply@netimobiliaria.com.br
is_active: true
environment: development
```

**✅ Se tudo OK, prossiga. Senão, configure o email primeiro.**

### 2. Verificar Templates de Email

```sql
-- Verificar template 2FA
SELECT name, subject, is_active
FROM email_templates
WHERE name = '2fa-code';
```

**Resultado esperado:**
```
name: 2fa-code
subject: Seu código de verificação
is_active: true
```

### 3. Iniciar Servidor

```bash
npm run dev
```

**Aguarde até ver:**
```
✓ Ready in 3.2s
○ Local: http://localhost:3000
```

### 4. Login como Super Admin

1. Acesse: http://localhost:3000/login
2. Username: `admin`
3. Password: `admin123`
4. ✅ Deve logar com sucesso

---

## 🧪 TESTE 1: CRIAR NOVO USUÁRIO

### Passo 1.1: Acessar Gestão de Usuários

1. No menu lateral, clique em: **"Painel Administrativo"**
2. Depois clique em: **"Usuários"**
3. Ou acesse direto: http://localhost:3000/admin/usuarios

**✅ Esperado:** Página de gestão de usuários carrega

### Passo 1.2: Criar Novo Usuário

1. Clique no botão **"+ Novo Usuário"**
2. Preencha o formulário:

```
Username: teste.2fa
Email: SEU-EMAIL-REAL@gmail.com  ⚠️ USE SEU EMAIL REAL!
Nome: Usuário Teste 2FA
Telefone: (81) 99999-9999
Perfil: Corretor
Senha: Teste@123
Confirmar Senha: Teste@123
```

3. Clique em **"Criar Usuário"**

**✅ Esperado:** 
- Mensagem: "Usuário criado com sucesso!"
- Usuário aparece na lista

### Passo 1.3: Verificar no Banco

```sql
-- Verificar se usuário foi criado
SELECT 
  id,
  username,
  email,
  nome,
  ativo,
  two_fa_enabled
FROM users
WHERE username = 'teste.2fa';
```

**✅ Esperado:**
```
username: teste.2fa
email: seu-email@gmail.com
ativo: true
two_fa_enabled: false  ← Ainda não ativado
```

### Passo 1.4: Verificar Perfil Atribuído

```sql
-- Verificar se perfil foi atribuído
SELECT 
  u.username,
  ur.name as perfil,
  ur.level
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'teste.2fa';
```

**✅ Esperado:**
```
username: teste.2fa
perfil: Corretor
level: 10
```

---

## 🔐 TESTE 2: ATIVAR 2FA PARA O USUÁRIO

### Opção A: Via Interface (RECOMENDADO)

**⚠️ NOTA:** Esta interface precisa ser criada ainda.

### Opção B: Via Banco de Dados (PARA TESTE)

```sql
-- Ativar 2FA para o usuário teste
UPDATE users
SET two_fa_enabled = true
WHERE username = 'teste.2fa';

-- Verificar
SELECT username, two_fa_enabled
FROM users
WHERE username = 'teste.2fa';
```

**✅ Esperado:**
```
username: teste.2fa
two_fa_enabled: true
```

### Opção C: Via API (AVANÇADO)

```bash
# Fazer logout do admin
# Fazer login como teste.2fa
# Depois executar:

curl -X POST http://localhost:3000/api/admin/auth/2fa/enable \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📧 TESTE 3: LOGIN COM 2FA

### Passo 3.1: Fazer Logout

1. No painel admin, clique em **"Sair"**
2. Ou acesse: http://localhost:3000/login

**✅ Esperado:** Tela de login

### Passo 3.2: Tentar Login

1. Na tela de login, digite:
   - Username: `teste.2fa`
   - Password: `Teste@123`
2. Clique em **"Entrar"**

**✅ Esperado:** 
- **NÃO** vai para o dashboard
- Aparece tela: **"Digite o código de verificação"**
- Mensagem: "Um código foi enviado para seu email"

### Passo 3.3: Verificar Email

1. **Abra seu email** (o que você cadastrou)
2. **Procure por:** Email da Net Imobiliária
3. **Assunto:** "Seu código de verificação"

**✅ Esperado:**
```
De: noreply@netimobiliaria.com.br
Para: seu-email@gmail.com
Assunto: Seu código de verificação

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Net Imobiliária
    Código de Verificação
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seu código de autenticação de dois fatores é:

    ┌───────────┐
    │  123456   │  ← CÓDIGO DE 6 DÍGITOS
    └───────────┘

Este código expira em 10 minutos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**⚠️ Se o email NÃO chegar:**
- Verifique SPAM/Lixo Eletrônico
- Verifique configurações SMTP
- Execute: `node test-email-service.js`

### Passo 3.4: Inserir Código 2FA

1. **Copie o código** do email (6 dígitos)
2. **Cole na tela** de verificação
3. Clique em **"Verificar"**

**✅ Esperado:**
- Código é validado
- Usuário é autenticado
- Redireciona para: http://localhost:3000/admin

### Passo 3.5: Verificar Dashboard

**❌ Esperado:**
- Dashboard aparece **VAZIO** ou com poucos elementos
- Sidebar mostra **POUCAS OPÇÕES**
- Apenas: Dashboard, Relatórios (permissões básicas do Corretor)

**Por que?**
- Usuário tem apenas perfil "Corretor" (level 10)
- Corretor tem permissões limitadas
- Não vê opções administrativas

---

## 🔑 TESTE 4: LIBERAR PERMISSÕES

### Passo 4.1: Fazer Logout e Login como Admin

1. Sair da conta `teste.2fa`
2. Login como `admin` / `admin123`

### Passo 4.2: Acessar Gestão de Perfis

**Opção A: Dar permissões via PERFIL**

1. Acesse: **Painel Administrativo** → **Gestão de Perfis**
2. Clique em editar o perfil **"Corretor"**
3. Clique em **"Configurar Permissões"**
4. Marque as permissões que deseja liberar:

```
┌─ Selecione Permissões para: Corretor ─────────────────┐
│                                                        │
│  Gestão de Imóveis                                    │
│  ☑️ Listar imóveis                                     │
│  ☑️ Criar imóveis                                      │
│  ☑️ Editar imóveis                                     │
│  ☐ Excluir imóveis                                    │
│                                                        │
│  Gestão de Clientes                                   │
│  ☑️ Listar clientes                                    │
│  ☑️ Criar clientes                                     │
│  ☑️ Editar clientes                                    │
│  ☐ Excluir clientes                                   │
│                                                        │
│  Gestão de Proprietários                              │
│  ☑️ Listar proprietários                               │
│  ☐ Criar proprietários                                │
│  ☐ Editar proprietários                               │
│  ☐ Excluir proprietários                              │
│                                                        │
│  Amenidades                                           │
│  ☑️ Listar amenidades                                  │
│  ☐ Criar amenidades                                   │
│                                                        │
└────────────────────────────────────────────────────────┘

[Cancelar]                           [✅ Salvar]
```

5. Clique em **"Salvar"**

**✅ Esperado:**
- Se operação for crítica, pede código 2FA
- Mensagem: "Permissões atualizadas com sucesso"

### Passo 4.3: Verificar no Banco (Opcional)

```sql
-- Ver permissões do perfil Corretor
SELECT 
  sf.category as recurso,
  p.action as acao
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Corretor'
ORDER BY sf.category, p.action;
```

**✅ Esperado:** Lista com as permissões marcadas

---

## 👀 TESTE 5: VERIFICAR ACESSO NA SIDEBAR

### Passo 5.1: Fazer Logout e Login como teste.2fa

1. Sair da conta `admin`
2. Login como `teste.2fa` / `Teste@123`
3. **Se 2FA estiver ativo:**
   - Verificar email
   - Inserir código
   - Acessar sistema

### Passo 5.2: Verificar Sidebar

**Antes (sem permissões):**
```
Sidebar:
  • Dashboard
  • Relatórios
```

**Depois (com permissões):**
```
Sidebar:
  • Dashboard
  • Amenidades
    └─ Amenidades (apenas listar)
  • Imóveis
    └─ Cadastro
  • Clientes
    └─ Cadastro
  • Proprietários
    └─ Cadastro (apenas listar)
  • Relatórios
```

**✅ Esperado:**
- Sidebar mostra APENAS opções com permissão
- Sub-opções aparecem automaticamente
- Opções sem permissão NÃO aparecem

### Passo 5.3: Testar Acesso às Funcionalidades

#### Teste 5.3.1: Imóveis

1. Clique em **"Imóveis"** → **"Cadastro"**
2. **✅ Esperado:** Página de imóveis carrega
3. **✅ Esperado:** Botão "Novo Imóvel" aparece (tem permissão 'create')
4. Clique em **"Novo Imóvel"**
5. **✅ Esperado:** Formulário abre

#### Teste 5.3.2: Clientes

1. Clique em **"Clientes"** → **"Cadastro"**
2. **✅ Esperado:** Página de clientes carrega
3. **✅ Esperado:** Botão "Novo Cliente" aparece
4. Tente editar um cliente existente
5. **✅ Esperado:** Modal de edição abre (tem permissão 'update')

#### Teste 5.3.3: Amenidades (Apenas Listar)

1. Clique em **"Amenidades"** → **"Amenidades"**
2. **✅ Esperado:** Página carrega com lista
3. **❌ Esperado:** Botão "Nova Amenidade" NÃO aparece (sem permissão 'create')
4. **❌ Esperado:** Botões de editar/excluir NÃO aparecem

---

## 📋 TESTE 6: PERMISSÃO TEMPORÁRIA (AVANÇADO)

### Passo 6.1: Login como Admin

1. Logout do `teste.2fa`
2. Login como `admin`

### Passo 6.2: Dar Permissão Temporária

**Via SQL (para teste rápido):**

```sql
-- 1. Buscar IDs necessários
SELECT id FROM users WHERE username = 'teste.2fa';
-- Anote o UUID, exemplo: abc123...

SELECT id FROM users WHERE username = 'admin';
-- Anote o UUID do admin

SELECT p.id, sf.category, p.action
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category = 'amenidades' AND p.action = 'create';
-- Anote o ID da permissão

-- 2. Conceder permissão temporária por 7 dias
INSERT INTO user_permissions (
  user_id,
  permission_id,
  granted_by,
  expires_at,
  granted_at
)
VALUES (
  'UUID-DO-TESTE-2FA',           -- UUID do teste.2fa
  123,                            -- ID da permissão de criar amenidades
  'UUID-DO-ADMIN',                -- UUID do admin
  NOW() + INTERVAL '7 days',      -- Expira em 7 dias
  NOW()
);
```

### Passo 6.3: Testar Acesso Temporário

1. Logout do `admin`
2. Login como `teste.2fa`
3. Acesse: **Amenidades** → **Amenidades**
4. **✅ Esperado:** AGORA o botão "Nova Amenidade" aparece!
5. **✅ Esperado:** Pode criar amenidades

### Passo 6.4: Simular Expiração

```sql
-- Forçar expiração da permissão
UPDATE user_permissions
SET expires_at = NOW() - INTERVAL '1 hour'  -- Expirou há 1 hora
WHERE user_id = (SELECT id FROM users WHERE username = 'teste.2fa')
  AND permission_id = 123;
```

### Passo 6.5: Verificar Expiração

1. Faça logout e login novamente como `teste.2fa`
2. Acesse: **Amenidades** → **Amenidades**
3. **✅ Esperado:** Botão "Nova Amenidade" NÃO aparece mais!
4. **✅ Esperado:** Permissão expirada é ignorada automaticamente

---

## ✅ CHECKLIST COMPLETO

### Fase 1: Preparação
- [ ] Email configurado no banco
- [ ] Template 2FA ativo
- [ ] Servidor rodando (npm run dev)
- [ ] Login como admin funcionando

### Fase 2: Criar Usuário
- [ ] Acessar /admin/usuarios
- [ ] Criar usuário "teste.2fa" com email REAL
- [ ] Perfil "Corretor" atribuído
- [ ] Usuário aparece na lista

### Fase 3: Ativar 2FA
- [ ] Ativar two_fa_enabled = true no banco
- [ ] Verificar que está ativado

### Fase 4: Testar Login 2FA
- [ ] Fazer logout
- [ ] Tentar login com teste.2fa
- [ ] Tela de código 2FA aparece
- [ ] Email com código recebido
- [ ] Código funciona
- [ ] Login bem-sucedido
- [ ] Dashboard carrega

### Fase 5: Verificar Permissões Iniciais
- [ ] Sidebar mostra poucas opções (Corretor básico)
- [ ] Dashboard acessível
- [ ] Relatórios acessível
- [ ] Opções admin NÃO aparecem

### Fase 6: Liberar Mais Permissões
- [ ] Login como admin
- [ ] Editar perfil Corretor
- [ ] Adicionar permissões (imóveis, clientes, etc)
- [ ] Salvar alterações

### Fase 7: Verificar Novas Permissões
- [ ] Logout e login como teste.2fa
- [ ] Sidebar mostra NOVAS opções
- [ ] Imóveis aparece
- [ ] Clientes aparece
- [ ] Proprietários aparece
- [ ] Amenidades aparece

### Fase 8: Testar Acesso
- [ ] Acessar Imóveis → funciona
- [ ] Criar novo imóvel → funciona
- [ ] Acessar Clientes → funciona
- [ ] Criar novo cliente → funciona
- [ ] Amenidades → só listar (sem criar)

### Fase 9: Permissão Temporária (Opcional)
- [ ] Dar permissão temporária via SQL
- [ ] Verificar que nova opção aparece
- [ ] Forçar expiração
- [ ] Verificar que opção desaparece

---

## 🎬 ROTEIRO PASSO A PASSO VISUAL

### Timeline Completa

```
[00:00] Preparação
  └─ Verificar email configurado
  └─ Iniciar servidor
  └─ Login como admin

[02:00] Criar Usuário
  └─ Acessar /admin/usuarios
  └─ Clicar "+ Novo Usuário"
  └─ Preencher: teste.2fa, email real, Corretor
  └─ Salvar

[05:00] Ativar 2FA
  └─ Executar SQL: UPDATE users SET two_fa_enabled = true

[06:00] Testar Login 2FA
  └─ Logout
  └─ Login como teste.2fa
  └─ Tela de código aparece
  └─ Verificar email (pode demorar 1-2 min)
  └─ Copiar código
  └─ Inserir código
  └─ Dashboard carrega

[10:00] Verificar Permissões Iniciais
  └─ Olhar sidebar
  └─ Ver poucas opções (Corretor básico)

[11:00] Liberar Permissões
  └─ Logout
  └─ Login como admin
  └─ Gestão de Perfis → Corretor
  └─ Configurar Permissões
  └─ Marcar: imóveis, clientes, proprietários
  └─ Salvar

[15:00] Verificar Novas Permissões
  └─ Logout
  └─ Login como teste.2fa (com 2FA)
  └─ Sidebar mostra NOVAS opções
  └─ Testar acesso a cada opção

[20:00] Teste Completo!
```

**⏱️ Tempo total estimado: 20 minutos**

---

## 🧪 SCRIPT DE TESTE AUTOMATIZADO

```javascript
// test-2fa-flow.js
const { Pool } = require('pg');

const pool = new Pool({
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testComplete2FAFlow() {
  console.log('🧪 Teste Completo de 2FA e Permissões\n');

  try {
    // 1. Verificar se usuário teste existe
    console.log('1. Verificando usuário teste.2fa...');
    
    const userResult = await pool.query(`
      SELECT id, username, email, two_fa_enabled
      FROM users
      WHERE username = 'teste.2fa'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('   ❌ Usuário teste.2fa não encontrado');
      console.log('   💡 Crie o usuário primeiro via interface\n');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   ✅ Usuário encontrado: ${user.email}`);
    console.log(`   2FA ativo: ${user.two_fa_enabled ? '✅ Sim' : '❌ Não'}\n`);

    // 2. Verificar perfil
    console.log('2. Verificando perfil atribuído...');
    
    const roleResult = await pool.query(`
      SELECT ur.name, ur.level
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
    `, [user.id]);
    
    if (roleResult.rows.length === 0) {
      console.log('   ❌ Nenhum perfil atribuído!\n');
      return;
    }
    
    console.log(`   ✅ Perfil: ${roleResult.rows[0].name} (Level ${roleResult.rows[0].level})\n`);

    // 3. Verificar permissões do perfil
    console.log('3. Verificando permissões do perfil...');
    
    const permissionsResult = await pool.query(`
      SELECT 
        sf.category,
        p.action,
        COUNT(*) as count
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
      GROUP BY sf.category, p.action
      ORDER BY sf.category, p.action
    `, [user.id]);
    
    if (permissionsResult.rows.length === 0) {
      console.log('   ⚠️ Nenhuma permissão encontrada');
    } else {
      console.log(`   ✅ ${permissionsResult.rows.length} permissões:\n`);
      
      const grouped = {};
      permissionsResult.rows.forEach(row => {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        grouped[row.category].push(row.action);
      });
      
      Object.keys(grouped).forEach(category => {
        console.log(`      ${category}: ${grouped[category].join(', ')}`);
      });
    }

    // 4. Verificar permissões diretas
    console.log('\n4. Verificando permissões diretas...');
    
    const directPermResult = await pool.query(`
      SELECT 
        sf.category,
        p.action,
        up.expires_at,
        CASE 
          WHEN up.expires_at IS NULL THEN 'PERMANENTE'
          WHEN up.expires_at > NOW() THEN 'ATIVA'
          ELSE 'EXPIRADA'
        END as status
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE up.user_id = $1
    `, [user.id]);
    
    if (directPermResult.rows.length === 0) {
      console.log('   ℹ️ Nenhuma permissão direta\n');
    } else {
      console.log(`   ✅ ${directPermResult.rows.length} permissões diretas:\n`);
      directPermResult.rows.forEach(row => {
        const statusIcon = row.status === 'ATIVA' ? '✅' : row.status === 'PERMANENTE' ? '♾️' : '❌';
        console.log(`      ${statusIcon} ${row.category} | ${row.action} | ${row.status}`);
      });
    }

    // 5. Verificar configurações 2FA
    console.log('\n5. Verificando configurações 2FA...');
    
    const twoFAResult = await pool.query(`
      SELECT 
        code_length,
        code_expiration_minutes,
        max_attempts,
        email_template_name,
        is_active
      FROM system_2fa_settings
      WHERE environment = 'development'
        AND is_active = true
    `);
    
    if (twoFAResult.rows.length > 0) {
      const config = twoFAResult.rows[0];
      console.log(`   ✅ Configurações ativas:`);
      console.log(`      Código: ${config.code_length} dígitos`);
      console.log(`      Expiração: ${config.code_expiration_minutes} minutos`);
      console.log(`      Tentativas: ${config.max_attempts}`);
      console.log(`      Template: ${config.email_template_name}\n`);
    } else {
      console.log('   ⚠️ Configurações 2FA não encontradas\n');
    }

    // 6. Resumo
    console.log('📝 RESUMO DO TESTE:\n');
    console.log(`   Usuário: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   2FA: ${user.two_fa_enabled ? '✅ Ativado' : '❌ Desativado'}`);
    console.log(`   Perfil: ${roleResult.rows[0].name}`);
    console.log(`   Permissões do perfil: ${permissionsResult.rows.length}`);
    console.log(`   Permissões diretas: ${directPermResult.rows.length}`);
    console.log('');
    console.log('   ✅ Próximo passo: Fazer login com teste.2fa e verificar!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testComplete2FAFlow();
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: Email não chega

**Soluções:**
```bash
# Testar serviço de email
node test-email-service.js

# Verificar logs
tail -f logs/email.log

# Verificar spam/lixo eletrônico
# Aguardar 2-3 minutos (pode demorar)
```

### Problema 2: Código 2FA inválido

**Verificar:**
```sql
-- Ver códigos 2FA ativos
SELECT 
  user_id,
  code,
  expires_at,
  attempts,
  created_at
FROM two_fa_codes
WHERE user_id = (SELECT id FROM users WHERE username = 'teste.2fa')
ORDER BY created_at DESC
LIMIT 1;
```

### Problema 3: Sidebar não atualiza

**Soluções:**
1. Fazer logout completo
2. Limpar localStorage do navegador (F12 → Application → Clear)
3. Fazer login novamente
4. Token JWT é gerado com novas permissões

### Problema 4: Botões não aparecem

**Verificar:**
```sql
-- Ver permissões efetivas do usuário
SELECT 
  sf.category,
  p.action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'teste.2fa'
  AND (p.action = 'create' OR p.action = 'update' OR p.action = 'delete');
```

---

## 📊 RESULTADO ESPERADO FINAL

### No Gmail

```
📧 Caixa de Entrada:
  [NOVO] Seu código de verificação
  De: noreply@netimobiliaria.com.br
  Código: 123456
  Expira em: 10 minutos
```

### Na Sidebar (usuário teste.2fa)

```
Sidebar depois das permissões:
  ✅ Dashboard
  ✅ Amenidades
     └─ Amenidades
  ✅ Imóveis
     └─ Cadastro
  ✅ Clientes
     └─ Cadastro
  ✅ Proprietários
     └─ Cadastro
  ✅ Relatórios
```

### No Console do Navegador (F12)

```
✅ Login successful
✅ 2FA code sent
✅ 2FA verified
✅ Token received
✅ Permissions loaded: {
     imoveis: 'WRITE',
     clientes: 'WRITE',
     proprietarios: 'READ',
     amenidades: 'READ'
   }
```

---

## 📝 TEMPLATE DE RELATÓRIO

```
TESTE DE 2FA E PERMISSÕES - RESULTADO

Data: ___/___/2025
Testador: ________________

✅ FASE 1: Usuário Criado
   Username: teste.2fa
   Email: ________________
   Perfil: Corretor
   Status: [ ] OK  [ ] FALHOU

✅ FASE 2: 2FA Ativado
   two_fa_enabled: true
   Status: [ ] OK  [ ] FALHOU

✅ FASE 3: Login com 2FA
   Email recebido: [ ] SIM  [ ] NÃO
   Código funcionou: [ ] SIM  [ ] NÃO
   Login sucesso: [ ] SIM  [ ] NÃO

✅ FASE 4: Permissões Liberadas
   Perfil editado: [ ] SIM  [ ] NÃO
   Permissões salvas: [ ] SIM  [ ] NÃO

✅ FASE 5: Sidebar Atualizada
   Novas opções aparecem: [ ] SIM  [ ] NÃO
   Imóveis visível: [ ] SIM  [ ] NÃO
   Clientes visível: [ ] SIM  [ ] NÃO
   Amenidades visível: [ ] SIM  [ ] NÃO

✅ FASE 6: Acesso Funcional
   Pode criar imóvel: [ ] SIM  [ ] NÃO
   Pode criar cliente: [ ] SIM  [ ] NÃO
   NÃO pode criar amenidade: [ ] CORRETO  [ ] INCORRETO

OBSERVAÇÕES:
_________________________________________________
_________________________________________________
_________________________________________________

RESULTADO GERAL: [ ] PASSOU  [ ] FALHOU
```

---

**Documento criado em:** 2025-10-09  
**Versão:** 1.0  
**Tempo estimado:** 20 minutos


