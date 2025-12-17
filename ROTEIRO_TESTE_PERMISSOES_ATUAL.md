# 🧪 ROTEIRO DE TESTE: NOVO USUÁRIO E PERMISSÕES

**Sistema Net Imobiliária - Estado Atual**  
**Versão:** 1.0  
**Data:** 2025-10-09

---

## ⚠️ IMPORTANTE: SITUAÇÃO ATUAL DO 2FA

### Estado do Sistema 2FA

**Tabelas 2FA existem:**
- ✅ `system_2fa_settings` - Configurações
- ✅ `email_settings` - Config SMTP
- ❌ `email_templates` - Template `2fa-code` **FALTANDO**

**Tabela users:**
- ❌ Coluna `two_fa_enabled` **NÃO EXISTE**
- ❌ Coluna `two_fa_secret` **NÃO EXISTE**

**Conclusão:**
🟡 **2FA está PARCIALMENTE implementado**
- Infraestrutura existe (tabelas, settings)
- MAS integração com `users` está pendente
- APIs de 2FA podem existir mas não funcionam totalmente

### O que PODE ser testado agora

✅ **Login simples** (sem 2FA)  
✅ **Criação de usuários**  
✅ **Atribuição de perfis**  
✅ **Gerenciamento de permissões**  
✅ **Sidebar dinâmica**  
✅ **Controle de acesso (RBAC)**  

❌ **Login com 2FA** (requer implementação completa)

---

## 📝 ROTEIRO AJUSTADO (SEM 2FA)

### 🎯 OBJETIVO DO TESTE

Testar o fluxo completo de:
1. Criar novo usuário
2. Atribuir perfil com permissões limitadas
3. Login do novo usuário
4. Verificar sidebar (poucas opções)
5. Liberar mais permissões ao perfil
6. Verificar sidebar atualizada (mais opções)
7. Testar acesso às funcionalidades

---

## ✅ TESTE 1: CRIAR NOVO USUÁRIO

### Passo 1.1: Preparação

1. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Acesse:** http://localhost:3000/login

3. **Login como admin:**
   - Username: `admin`
   - Password: `admin123`
   - ✅ Dashboard carrega

### Passo 1.2: Criar Usuário

1. **Acesse:** Painel Administrativo → Usuários
   - Ou direto: http://localhost:3000/admin/usuarios

2. **Clique:** "+ Novo Usuário"

3. **Preencha:**
   ```
   Username: maria.silva
   Email: maria.silva@example.com
   Nome: Maria Silva
   Telefone: (81) 98765-4321
   Perfil: Corretor
   Senha: Maria@123
   Confirmar Senha: Maria@123
   ```

4. **Clique:** "Criar Usuário"

**✅ Esperado:**
- Mensagem: "Usuário criado com sucesso!"
- Usuário aparece na lista com perfil "Corretor"

### Passo 1.3: Verificar no Banco

```sql
-- Copie e execute no pgAdmin
SELECT 
  u.username,
  u.email,
  u.nome,
  u.ativo,
  ur.name as perfil,
  ur.level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'maria.silva';
```

**✅ Resultado esperado:**
```
username: maria.silva
email: maria.silva@example.com
ativo: true
perfil: Corretor
level: 10
```

---

## 🔑 TESTE 2: LOGIN E VERIFICAR PERMISSÕES INICIAIS

### Passo 2.1: Fazer Logout

1. No painel admin, clique em **"Sair"**
2. Ou acesse: http://localhost:3000/login

### Passo 2.2: Login como Novo Usuário

1. **Digite:**
   - Username: `maria.silva`
   - Password: `Maria@123`

2. **Clique:** "Entrar"

**✅ Esperado:**
- Login bem-sucedido (sem 2FA)
- Redireciona para: /admin

### Passo 2.3: Verificar Sidebar

**📋 Opções visíveis (Corretor básico):**

Anote o que você vê na sidebar:

```
Sidebar atual:
  [ ] Dashboard
  [ ] Amenidades
  [ ] Proximidades
  [ ] Documentos
  [ ] Imóveis
  [ ] Clientes
  [ ] Proprietários
  [ ] Dashboards
  [ ] Relatórios
```

**✅ Esperado inicialmente:**
- Poucas opções (depende das permissões do Corretor)
- Provavelmente: Dashboard, Relatórios
- **NÃO deve ver:** Painel Administrativo, Usuários

### Passo 2.4: Testar Acesso

Tente acessar cada opção visível e anote:

```
Dashboard: [ ] Carrega  [ ] Erro
Imóveis: [ ] Visível  [ ] Não visível
Clientes: [ ] Visível  [ ] Não visível
```

**📸 TIRE SCREENSHOT da sidebar para comparar depois!**

---

## 🔓 TESTE 3: LIBERAR MAIS PERMISSÕES

### Passo 3.1: Logout e Login como Admin

1. Sair da conta `maria.silva`
2. Login como `admin` / `admin123`

### Passo 3.2: Editar Permissões do Perfil Corretor

1. **Acesse:** Painel Administrativo → Gestão de Perfis
2. **Localize:** Perfil "Corretor"
3. **Clique:** Botão de editar ou "Configurar Permissões"
4. **Marque as seguintes permissões:**

```
☑️ IMÓVEIS:
   ☑️ list (Listar imóveis)
   ☑️ create (Criar imóveis)
   ☑️ update (Editar imóveis)
   ☐ delete (Excluir imóveis) ← NÃO marcar

☑️ CLIENTES:
   ☑️ list (Listar clientes)
   ☑️ create (Criar clientes)
   ☑️ update (Editar clientes)
   ☐ delete (Excluir clientes) ← NÃO marcar

☑️ PROPRIETÁRIOS:
   ☑️ list (Listar proprietários)
   ☐ create (Criar proprietários) ← NÃO marcar
   ☐ update (Editar proprietários) ← NÃO marcar
   ☐ delete (Excluir proprietários) ← NÃO marcar

☑️ AMENIDADES:
   ☑️ list (Listar amenidades)
   ☐ create (Criar amenidades) ← NÃO marcar

☑️ DASHBOARDS:
   ☑️ list (Visualizar dashboards)
```

5. **Clique:** "Salvar"

**✅ Esperado:**
- Mensagem: "Permissões atualizadas com sucesso!"

---

## 👀 TESTE 4: VERIFICAR NOVAS PERMISSÕES NA SIDEBAR

### Passo 4.1: Fazer Logout e Login como maria.silva

1. Sair da conta `admin`
2. Login como `maria.silva` / `Maria@123`

### Passo 4.2: Comparar Sidebar

**ANTES (screenshot anterior):**
```
  • Dashboard
  • Relatórios
```

**DEPOIS (agora):**
```
  • Dashboard ✅
  • Amenidades ✅ NOVO!
    └─ Amenidades
  • Imóveis ✅ NOVO!
    └─ Cadastro
  • Clientes ✅ NOVO!
    └─ Cadastro
  • Proprietários ✅ NOVO!
    └─ Cadastro
  • Dashboards ✅ NOVO!
  • Relatórios ✅
```

**✅ Esperado:**
- Sidebar mostra MUITO MAIS opções
- Novas categorias aparecem
- Sub-opções aparecem

**📸 TIRE SCREENSHOT para comparar!**

---

## 🧪 TESTE 5: VERIFICAR PERMISSÕES DE AÇÃO

### Teste 5.1: Imóveis (PODE criar)

1. **Acesse:** Imóveis → Cadastro
2. **✅ Esperado:** Botão "+ Novo Imóvel" **APARECE**
3. **Clique:** no botão
4. **✅ Esperado:** Formulário abre
5. **Teste:** Tente criar um imóvel de teste
6. **✅ Esperado:** Consegue salvar

### Teste 5.2: Clientes (PODE criar e editar)

1. **Acesse:** Clientes → Cadastro
2. **✅ Esperado:** Botão "+ Novo Cliente" **APARECE**
3. **Tente editar** um cliente existente
4. **✅ Esperado:** Modal de edição abre
5. **Tente excluir** um cliente
6. **✅ Esperado:** Botão de excluir **NÃO APARECE** (sem permissão)

### Teste 5.3: Proprietários (APENAS visualizar)

1. **Acesse:** Proprietários → Cadastro
2. **✅ Esperado:** Lista de proprietários carrega
3. **✅ Esperado:** Botão "+ Novo Proprietário" **NÃO APARECE**
4. **✅ Esperado:** Botões de editar **NÃO APARECEM**
5. **✅ Esperado:** Botões de excluir **NÃO APARECEM**
6. **Conclusão:** Apenas visualização (READ only)

### Teste 5.4: Amenidades (APENAS visualizar)

1. **Acesse:** Amenidades → Amenidades
2. **✅ Esperado:** Lista de amenidades carrega
3. **✅ Esperado:** Botão "+ Nova Amenidade" **NÃO APARECE**
4. **✅ Esperado:** Sem botões de ação (editar/excluir)

---

## 📊 TABELA DE RESULTADOS

Preencha conforme testa:

| Funcionalidade | Visível na Sidebar | Pode Listar | Pode Criar | Pode Editar | Pode Excluir |
|----------------|-------------------|-------------|------------|-------------|--------------|
| Dashboard | [ ] Sim [ ] Não | [ ] Sim | N/A | N/A | N/A |
| Imóveis | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não |
| Clientes | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não |
| Proprietários | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não |
| Amenidades | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não |
| Usuários | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não | [ ] Sim [ ] Não |

**✅ Resultado esperado:**

| Funcionalidade | Visível | Listar | Criar | Editar | Excluir |
|----------------|---------|--------|-------|--------|---------|
| Dashboard | ✅ | ✅ | N/A | N/A | N/A |
| Imóveis | ✅ | ✅ | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Proprietários | ✅ | ✅ | ❌ | ❌ | ❌ |
| Amenidades | ✅ | ✅ | ❌ | ❌ | ❌ |
| Usuários | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 TROUBLESHOOTING

### Problema 1: Novas opções não aparecem na sidebar

**Solução:**
1. Fazer logout COMPLETO
2. Limpar cache do navegador (Ctrl + Shift + Delete)
3. Ou abrir aba anônima
4. Login novamente
5. JWT é gerado com permissões atualizadas

### Problema 2: Botões não aparecem

**Verificar no código do navegador (F12):**
```javascript
// Console
localStorage.getItem('user')
// Deve mostrar: {... permissoes: {...} }
```

### Problema 3: Erro 403 ao acessar página

**Significa:**
- Usuário NÃO tem permissão
- Verificar se perfil tem a permissão necessária
- Executar SQL de verificação

---

## 📋 CHECKLIST SIMPLIFICADO

### Pré-teste
- [ ] Servidor rodando (npm run dev)
- [ ] Login admin funcionando

### Criar Usuário
- [ ] Acessar /admin/usuarios
- [ ] Criar "maria.silva", perfil Corretor
- [ ] Verificar na lista

### Login Novo Usuário
- [ ] Logout do admin
- [ ] Login como maria.silva
- [ ] Dashboard carrega
- [ ] **ANOTAR** opções na sidebar

### Liberar Permissões
- [ ] Logout de maria.silva
- [ ] Login como admin
- [ ] Editar perfil Corretor
- [ ] Adicionar permissões (imóveis, clientes, etc)
- [ ] Salvar

### Verificar Atualização
- [ ] Logout do admin
- [ ] Login como maria.silva
- [ ] Sidebar mostra NOVAS opções
- [ ] **COMPARAR** com anotação anterior

### Testar Acessos
- [ ] Imóveis → criar funciona
- [ ] Clientes → criar funciona
- [ ] Proprietários → apenas visualizar
- [ ] Amenidades → apenas visualizar

---

## 🎯 RESULTADO ESPERADO

### Screenshot 1: Sidebar ANTES

```
Sidebar (maria.silva - inicial):
┌────────────────────┐
│ • Dashboard        │
│ • Relatórios       │
└────────────────────┘
```

### Screenshot 2: Sidebar DEPOIS

```
Sidebar (maria.silva - após liberar):
┌────────────────────┐
│ • Dashboard        │
│ • Amenidades       │
│   └─ Amenidades    │
│ • Imóveis          │
│   └─ Cadastro      │
│ • Clientes         │
│   └─ Cadastro      │
│ • Proprietários    │
│   └─ Cadastro      │
│ • Dashboards       │
│ • Relatórios       │
└────────────────────┘
```

### Comportamento de Botões

**Imóveis:**
- ✅ Botão "Novo" aparece
- ✅ Botões "Editar" aparecem
- ❌ Botões "Excluir" NÃO aparecem

**Proprietários:**
- ❌ Botão "Novo" NÃO aparece
- ❌ Botões "Editar" NÃO aparecem
- ❌ Botões "Excluir" NÃO aparecem
- ✅ Apenas VISUALIZAÇÃO

---

## 📝 SOBRE 2FA (IMPLEMENTAÇÃO FUTURA)

### O que falta para 2FA funcionar:

1. **Alterar tabela users:**
   ```sql
   ALTER TABLE users 
   ADD COLUMN two_fa_enabled BOOLEAN DEFAULT false;
   
   ALTER TABLE users 
   ADD COLUMN two_fa_secret VARCHAR(255);
   ```

2. **Criar template de email:**
   ```sql
   INSERT INTO email_templates (name, subject, html_content, variables, category, is_active)
   VALUES (
     '2fa-code',
     'Seu código de verificação',
     '<html>... código aqui ...</html>',
     '["code", "expiration_minutes"]'::jsonb,
     '2fa',
     true
   );
   ```

3. **Criar tabela two_fa_codes** (se não existir):
   ```sql
   CREATE TABLE two_fa_codes (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     code VARCHAR(6),
     expires_at TIMESTAMP,
     attempts INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Implementar lógica nas APIs:**
   - `/api/auth/login` - detectar 2FA e enviar código
   - `/api/auth/2fa/verify` - validar código
   - `emailService` - enviar código por email

### Quando estiver implementado

Use o roteiro: `ROTEIRO_TESTE_2FA_E_PERMISSOES.md` (criado anteriormente)

---

## ⏱️ TEMPO ESTIMADO

- **Criar usuário:** 3 min
- **Login e verificar:** 2 min
- **Liberar permissões:** 5 min
- **Verificar atualização:** 3 min
- **Testar acessos:** 7 min

**TOTAL:** ~20 minutos

---

**Documento criado em:** 2025-10-09  
**Status:** ✅ Pronto para uso  
**Nota:** Roteiro ajustado para estado atual do sistema (sem 2FA completo)


