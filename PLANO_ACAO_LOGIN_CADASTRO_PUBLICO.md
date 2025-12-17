# 📋 PLANO DE AÇÃO DETALHADO - Sistema de Login e Cadastro Público

## 🎯 OBJETIVO
Implementar sistema de autenticação e cadastro para **Clientes** e **Proprietários** na landing page pública (`/landpaging`), com login via 2FA por email, reutilizando toda a infraestrutura existente sem modificar funcionalidades já testadas.

---

## 🔍 ANÁLISE DO SISTEMA EXISTENTE

### ✅ O QUE JÁ EXISTE E ESTÁ FUNCIONANDO

#### 1. **Sistema de Autenticação Admin**
- **Arquivo**: `src/app/api/admin/auth/login/route.ts`
- **Funcionalidades**:
  - Login com username ou email
  - Validação de senha com bcrypt (12 rounds)
  - Geração de JWT com 1h de expiração
  - Sistema de sessões
  - Tratamento de bloqueio de conta
  - Logs de auditoria completos

#### 2. **Sistema 2FA Completo**
- **Serviço**: `src/services/twoFactorAuthService.ts`
- **Método**: Email (já testado e funcionando)
- **Funcionalidades**:
  - Geração de código de 6 dígitos
  - Envio por email via `emailService.sendTemplateEmail('2fa-code', email, { code })`
  - Validação de código com expiração
  - Códigos de backup
  - Logs de auditoria 2FA

#### 3. **Sistema de Email**
- **Serviço**: `src/services/emailService.ts`
- **Configuração**: Dinâmica via banco de dados (tabelas `email_settings` e `email_templates`)
- **Template 2FA**: Já existe template `2fa-code` configurado

#### 4. **Tabelas de Banco de Dados**

##### Tabela `clientes`
```sql
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(15) NOT NULL,
    endereco VARCHAR(200),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    password VARCHAR(255),      -- ✅ JÁ EXISTE
    email VARCHAR(255) NOT NULL UNIQUE,  -- ✅ JÁ EXISTE
    estado_fk VARCHAR(100),
    cidade_fk VARCHAR(100),
    cep VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

##### Tabela `proprietarios`
```sql
CREATE TABLE proprietarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(15) NOT NULL,
    endereco VARCHAR(200),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    password VARCHAR(255),      -- ✅ JÁ EXISTE
    email VARCHAR(255) NOT NULL UNIQUE,  -- ✅ JÁ EXISTE
    estado_fk VARCHAR(100),
    cidade_fk VARCHAR(100),
    cep VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### 5. **CRUD de Clientes e Proprietários**
- **Biblioteca**: `src/lib/database/clientes.ts` e `src/lib/database/proprietarios.ts`
- **APIs Admin**: `/api/admin/clientes` e `/api/admin/proprietarios`
- **Páginas Admin**: `/admin/clientes` e `/admin/proprietarios`
- **Funcionalidades**:
  - Criação de registro com senha (bcrypt hash automático)
  - Validação de CPF
  - Validação de email único
  - Update/Delete
  - Paginação e filtros

#### 6. **Configurações de Autenticação**
- **Arquivo**: `src/lib/config/auth.ts`
- **JWT Secret**: `process.env.JWT_SECRET`
- **Expiração**: 24h (configurável)
- **Salt Rounds**: 12 (bcrypt)
- **Password Policy**: 8 caracteres mínimo, letras maiúsculas, minúsculas, números, caracteres especiais

---

## ❌ O QUE PRECISA SER IMPLEMENTADO

### 1. **Alterações no Banco de Dados**

#### 📋 Script SQL: `add_2fa_fields_clientes_proprietarios.sql`

```sql
-- Adicionar campos 2FA nas tabelas clientes e proprietarios
-- Net Imobiliária - Sistema de Autenticação Pública

-- ================================================
-- TABELA: clientes
-- ================================================

-- 1. Adicionar campo two_fa_enabled
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT true;

-- 2. Adicionar índice para email (para login rápido)
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- 3. Adicionar comentários
COMMENT ON COLUMN clientes.two_fa_enabled IS 'Indica se 2FA está habilitado para este cliente';
COMMENT ON COLUMN clientes.email IS 'Email do cliente (usado para login e 2FA)';
COMMENT ON COLUMN clientes.password IS 'Senha hash (bcrypt) do cliente';

-- ================================================
-- TABELA: proprietarios
-- ================================================

-- 1. Adicionar campo two_fa_enabled
ALTER TABLE proprietarios 
ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT true;

-- 2. Adicionar índice para email (para login rápido)
CREATE INDEX IF NOT EXISTS idx_proprietarios_email ON proprietarios(email);

-- 3. Adicionar comentários
COMMENT ON COLUMN proprietarios.two_fa_enabled IS 'Indica se 2FA está habilitado para este proprietário';
COMMENT ON COLUMN proprietarios.email IS 'Email do proprietário (usado para login e 2FA)';
COMMENT ON COLUMN proprietarios.password IS 'Senha hash (bcrypt) do proprietário';

-- ================================================
-- VERIFICAÇÃO
-- ================================================

-- Verificar campos adicionados em clientes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clientes' 
  AND column_name IN ('password', 'email', 'two_fa_enabled');

-- Verificar campos adicionados em proprietarios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'proprietarios' 
  AND column_name IN ('password', 'email', 'two_fa_enabled');

-- Verificar índices criados
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('clientes', 'proprietarios')
  AND indexname IN ('idx_clientes_email', 'idx_proprietarios_email');
```

---

### 2. **Novas APIs de Autenticação Pública**

#### 📁 Estrutura de Arquivos

```
src/app/api/public/auth/
├── login/
│   └── route.ts          # Login de clientes e proprietários
├── register/
│   └── route.ts          # Cadastro de novos clientes/proprietários
└── 2fa/
    ├── send-code/
    │   └── route.ts      # Reenviar código 2FA
    └── verify/
        └── route.ts      # Verificar código 2FA
```

#### 📄 API: `/api/public/auth/login/route.ts`

**Funcionalidade**: Autenticar clientes e proprietários com 2FA

**Fluxo**:
1. Recebe: `email`, `password`, `userType` ('cliente' | 'proprietario'), `twoFactorCode?`
2. Valida credenciais na tabela apropriada (`clientes` ou `proprietarios`)
3. Compara senha com bcrypt
4. Se 2FA habilitado e código não fornecido: envia código por email
5. Se código fornecido: valida código 2FA
6. Gera JWT com payload específico (userId, userType, nome, email)
7. Cria sessão
8. Retorna token e dados do usuário

**Reutilização**:
- Mesma lógica de validação do `/api/admin/auth/login/route.ts`
- Mesmo serviço 2FA (`twoFactorAuthService.sendCodeByEmail`)
- Mesma geração de JWT
- Mesmos logs de auditoria

---

#### 📄 API: `/api/public/auth/register/route.ts`

**Funcionalidade**: Cadastrar novos clientes ou proprietários

**Fluxo**:
1. Recebe: dados do formulário + `userType` ('cliente' | 'proprietario')
2. Valida campos obrigatórios
3. Valida CPF e email únicos
4. Hash da senha com bcrypt (12 rounds)
5. Insere na tabela apropriada (`clientes` ou `proprietarios`)
6. Define `two_fa_enabled = true` por padrão
7. **NÃO** faz login automático (usuário deve fazer login após cadastro)
8. Retorna sucesso

**Reutilização**:
- Funções de `src/lib/database/clientes.ts` e `src/lib/database/proprietarios.ts`
- Validações já existentes (CPF, email, telefone)
- Hash de senha com bcrypt já implementado

---

### 3. **Componentes de Interface (Frontend)**

#### 📁 Estrutura de Componentes

```
src/components/public/auth/
├── AuthModal.tsx              # Modal principal (escolha Cliente/Proprietário)
├── LoginForm.tsx              # Formulário de login
├── RegisterForm.tsx           # Formulário de cadastro
├── TwoFactorInput.tsx         # Input de código 2FA (reutilizar do admin)
└── AuthButtons.tsx            # Botões Login e Cadastre-se (topo da página)
```

---

#### 🎨 Componente: `AuthButtons.tsx`

**Localização**: Topo direito da landing page

**Funcionalidade**:
```tsx
<div className="flex items-center gap-3">
  <button onClick={() => openModal('login')}>
    Login
  </button>
  <button onClick={() => openModal('register')}>
    Cadastre-se
  </button>
</div>
```

---

#### 🎨 Componente: `AuthModal.tsx`

**Funcionalidade**: Modal que exibe escolha entre Cliente e Proprietário

**Estados**:
- `mode`: 'login' | 'register'
- `userType`: 'cliente' | 'proprietario' | null
- `step`: 'choose-type' | 'form' | '2fa'

**Fluxo Login**:
1. Usuário clica em "Login"
2. Modal abre com opções: "Cliente" ou "Proprietário"
3. Usuário escolhe tipo
4. Exibe `LoginForm` para o tipo escolhido
5. Se 2FA necessário: exibe `TwoFactorInput`

**Fluxo Cadastro**:
1. Usuário clica em "Cadastre-se"
2. Modal abre com opções: "Cliente" ou "Proprietário"
3. Usuário escolhe tipo
4. Exibe `RegisterForm` apropriado (CRUD completo)

---

#### 🎨 Componente: `LoginForm.tsx`

**Campos**:
- Email
- Senha
- (Código 2FA - condicional)

**Reutilização**:
- Layout similar a `src/app/admin/login/page.tsx`
- Mesmo componente de 2FA (6 dígitos)
- Mesmas validações

---

#### 🎨 Componente: `RegisterForm.tsx`

**Funcionalidade**: Formulário completo de cadastro

**IMPORTANTE**: Reutilizar CRUD existente

**Para Clientes**:
- Renderizar formulário de `/admin/clientes` (modo criação)
- **ADICIONAR**: Campo "Senha" e "Confirmar Senha"
- Campos: nome, CPF, telefone, email, senha, endereço, estado, cidade, CEP

**Para Proprietários**:
- Renderizar formulário de `/admin/proprietarios` (modo criação)
- **ADICIONAR**: Campo "Senha" e "Confirmar Senha"
- Campos: nome, CPF, telefone, email, senha, endereço, estado, cidade, CEP

**Validações**:
- Todas as validações já existentes no CRUD
- Adicionar validação de senha: mínimo 8 caracteres, letras, números
- Confirmar senha deve ser igual à senha

---

### 4. **Alterações na Landing Page**

#### 📄 Arquivo: `src/app/landpaging/page.tsx`

**Alterações Mínimas**:

```tsx
import AuthButtons from '@/components/public/auth/AuthButtons'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ADICIONAR: Botões de autenticação no topo */}
      <div className="absolute top-6 right-6 z-50">
        <AuthButtons />
      </div>
      
      <HeroSection />
      
      {/* Resto do código permanece igual */}
    </div>
  )
}
```

---

### 5. **Sistema de Sessão para Clientes/Proprietários**

#### 📄 Criar: `src/lib/auth/publicAuth.ts`

**Funcionalidades**:
- Verificar se usuário está autenticado
- Obter dados do usuário logado (cliente ou proprietário)
- Logout
- Middleware de proteção de rotas

**JWT Payload**:
```typescript
{
  userId: number,           // ID na tabela clientes ou proprietarios
  userType: 'cliente' | 'proprietario',
  email: string,
  nome: string,
  cpf: string,
  is2FAEnabled: boolean,
  iat: timestamp,
  exp: timestamp
}
```

---

### 6. **Página de Perfil (Área Restrita)**

#### 📁 Estrutura

```
src/app/(public)/
├── meu-perfil/
│   └── page.tsx           # Área do cliente/proprietário logado
```

**Funcionalidade**:
- Exibir dados do usuário logado
- Permitir edição dos próprios dados (UPDATE)
- **NÃO** permitir visualizar outros registros
- Botão de logout

**Segurança**:
- Middleware verifica token JWT
- Usuário só acessa seus próprios dados
- UPDATE via API `/api/public/auth/profile`

---

## 🛠️ ESTRATÉGIA DE IMPLEMENTAÇÃO

### 📌 FASE 1: Preparação do Banco de Dados ✅

**Tarefas**:
1. Criar e executar script `add_2fa_fields_clientes_proprietarios.sql`
2. Verificar se campos foram adicionados corretamente
3. Testar índices criados

**Rollback**:
```sql
ALTER TABLE clientes DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS two_fa_enabled;
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_proprietarios_email;
```

---

### 📌 FASE 2: APIs de Autenticação Pública

**Tarefas**:
1. Criar `/api/public/auth/login/route.ts`
   - Copiar estrutura de `/api/admin/auth/login/route.ts`
   - Adaptar para buscar em `clientes` ou `proprietarios`
   - Manter toda lógica 2FA, bcrypt, JWT
   
2. Criar `/api/public/auth/register/route.ts`
   - Reutilizar funções de `src/lib/database/clientes.ts` e `proprietarios.ts`
   - Adicionar validação de senha
   
3. Criar `/api/public/auth/2fa/*` (se necessário, ou reutilizar admin)

**Testes**:
- Testar login com credenciais válidas
- Testar 2FA por email
- Testar cadastro de novo cliente
- Testar cadastro de novo proprietário
- Testar validações (CPF duplicado, email duplicado)

**Rollback**:
- Deletar arquivos de API criados
- Banco de dados não é afetado (apenas INSERTs de teste)

---

### 📌 FASE 3: Componentes de Interface

**Tarefas**:
1. Criar `AuthButtons.tsx` (simples)
2. Criar `AuthModal.tsx` (com escolha de tipo)
3. Criar `LoginForm.tsx` (reutilizar layout do admin)
4. Criar `RegisterForm.tsx` (reutilizar CRUD existente)
5. Adicionar `AuthButtons` na landing page

**Testes**:
- Testar abertura de modal
- Testar fluxo de login completo
- Testar fluxo de cadastro completo
- Testar responsividade
- Testar validações visuais

**Rollback**:
- Deletar componentes criados
- Remover `AuthButtons` da landing page

---

### 📌 FASE 4: Área Restrita (Perfil)

**Tarefas**:
1. Criar middleware de autenticação pública
2. Criar página `/meu-perfil`
3. Criar API `/api/public/auth/profile` (GET e PUT)
4. Implementar edição de perfil

**Testes**:
- Testar acesso sem estar logado (deve redirecionar)
- Testar visualização de dados do perfil
- Testar edição de dados
- Testar que não consegue acessar dados de outros

**Rollback**:
- Deletar página e APIs criadas
- Remover middleware

---

## 🔒 SEGURANÇA - GUARDIAN RULES

### ✅ Pontos de Segurança Implementados

1. **Senhas**:
   - Sempre hash com bcrypt (12 rounds)
   - Nunca armazenar senha em texto plano
   - Validação de força de senha no frontend e backend

2. **2FA Obrigatório**:
   - `two_fa_enabled = true` por padrão
   - Código enviado por email
   - Código expira em X minutos (configurável)

3. **JWT**:
   - Token com expiração de 24h
   - Payload mínimo (sem dados sensíveis)
   - Secret forte (variável de ambiente)

4. **Validações**:
   - CPF único
   - Email único
   - Validação de formato em frontend e backend

5. **Logs de Auditoria**:
   - Todos os logins registrados
   - Tentativas falhadas registradas
   - Códigos 2FA registrados

6. **Isolamento de Dados**:
   - Cliente só acessa seus dados
   - Proprietário só acessa seus dados
   - Sem acesso cruzado

---

## 📊 PONTOS DE ATENÇÃO

### ⚠️ NÃO MODIFICAR (Funcionalidades Já Testadas)

1. **Sistema 2FA**: `src/services/twoFactorAuthService.ts` - NÃO ALTERAR
2. **Sistema de Email**: `src/services/emailService.ts` - NÃO ALTERAR
3. **Login Admin**: `/api/admin/auth/login` - NÃO ALTERAR
4. **CRUD Admin**: `/admin/clientes` e `/admin/proprietarios` - NÃO ALTERAR
5. **Tabelas Admin**: `users`, `user_roles`, etc. - NÃO ALTERAR

### ✅ REUTILIZAR (Sem Modificar)

1. Funções de hash de senha (bcrypt)
2. Funções de validação (CPF, email, telefone)
3. Geração de JWT
4. Envio de email 2FA
5. Layout e estilo do admin login
6. Formulários de CRUD existentes

### 🆕 CRIAR (Novo Código)

1. APIs de autenticação pública (`/api/public/auth/*`)
2. Componentes de interface pública (`AuthModal`, `LoginForm`, etc.)
3. Middleware de autenticação pública
4. Página de perfil público (`/meu-perfil`)
5. Script SQL para adicionar campos 2FA

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Banco de Dados
- [ ] Executar script SQL para adicionar campos 2FA
- [ ] Verificar índices criados
- [ ] Testar query de login por email

### Backend (APIs)
- [ ] Criar `/api/public/auth/login`
- [ ] Criar `/api/public/auth/register`
- [ ] Criar `/api/public/auth/profile` (GET/PUT)
- [ ] Testar todas as APIs com Postman/Insomnia

### Frontend (Componentes)
- [ ] Criar `AuthButtons.tsx`
- [ ] Criar `AuthModal.tsx`
- [ ] Criar `LoginForm.tsx`
- [ ] Criar `RegisterForm.tsx`
- [ ] Integrar na landing page

### Área Restrita
- [ ] Criar middleware de autenticação
- [ ] Criar página `/meu-perfil`
- [ ] Implementar edição de perfil

### Testes
- [ ] Testar cadastro de cliente
- [ ] Testar cadastro de proprietário
- [ ] Testar login de cliente com 2FA
- [ ] Testar login de proprietário com 2FA
- [ ] Testar edição de perfil
- [ ] Testar segurança (acesso sem login)

### Documentação
- [ ] Documentar novas APIs
- [ ] Atualizar README
- [ ] Documentar fluxo de autenticação pública

---

## 🎯 RESULTADO ESPERADO

Após implementação completa:

1. ✅ Usuário acessa `/landpaging`
2. ✅ Vê botões "Login" e "Cadastre-se" no topo direito
3. ✅ Clica em "Cadastre-se"
4. ✅ Escolhe "Cliente" ou "Proprietário"
5. ✅ Preenche formulário completo (CRUD)
6. ✅ Cadastro é salvo no banco com senha hash
7. ✅ Clica em "Login"
8. ✅ Escolhe "Cliente" ou "Proprietário"
9. ✅ Informa email e senha
10. ✅ Recebe código 2FA por email
11. ✅ Informa código 2FA
12. ✅ É autenticado com JWT
13. ✅ Pode acessar `/meu-perfil`
14. ✅ Pode editar seus próprios dados
15. ✅ Não pode ver dados de outros usuários

---

## 🔄 ESTRATÉGIA DE ROLLBACK

Cada fase tem rollback independente:

### Fase 1 (Banco):
```sql
-- Reverter alterações
ALTER TABLE clientes DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS two_fa_enabled;
```

### Fase 2 (APIs):
- Deletar pasta `src/app/api/public/auth/`
- Nenhum dado é perdido

### Fase 3 (Frontend):
- Deletar pasta `src/components/public/auth/`
- Remover import na landing page

### Fase 4 (Perfil):
- Deletar página `/meu-perfil`
- Deletar API `/api/public/auth/profile`

---

## 📚 REFERÊNCIAS

### Arquivos Chave para Consulta

1. **Autenticação Admin**:
   - `src/app/api/admin/auth/login/route.ts`
   - `src/app/admin/login/page.tsx`

2. **Sistema 2FA**:
   - `src/services/twoFactorAuthService.ts`
   - `src/services/emailService.ts`

3. **Banco de Dados**:
   - `src/lib/database/clientes.ts`
   - `src/lib/database/proprietarios.ts`

4. **Configurações**:
   - `src/lib/config/auth.ts`
   - `.env` (JWT_SECRET)

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Banco de Dados | 30 minutos |
| 2 | APIs Backend | 2-3 horas |
| 3 | Componentes Frontend | 3-4 horas |
| 4 | Área Restrita | 1-2 horas |
| **TOTAL** | | **6-9 horas** |

---

## ✅ APROVAÇÃO PARA INICIAR

Este plano segue rigorosamente:
- ✅ Reutiliza funcionalidades existentes
- ✅ Não modifica código testado
- ✅ Tem estratégia de rollback para cada fase
- ✅ Mantém segurança e 2FA
- ✅ Usa bcrypt e JWT corretamente
- ✅ Isola clientes e proprietários
- ✅ Permite UPDATE apenas dos próprios dados

**PRÓXIMO PASSO**: Aguardar sua aprovação para iniciar implementação.

**Pergunta**: Posso começar pela FASE 1 (Banco de Dados)?


