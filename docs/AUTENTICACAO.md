# 🔐 Sistema de Autenticação JWT - NET IMOBILIÁRIA

## 📋 Visão Geral

O sistema de autenticação da NET IMOBILIÁRIA utiliza **JWT (JSON Web Tokens)** para gerenciar sessões de usuários de forma segura e escalável. O sistema implementa tokens de acesso e refresh, com renovação automática e proteção de rotas.

## 🏗️ Arquitetura

### Componentes Principais

1. **JWT Utils** (`src/lib/auth/jwt.ts`)
   - Geração de tokens
   - Verificação de tokens
   - Renovação automática

2. **Password Utils** (`src/lib/auth/password.ts`)
   - Hash de senhas com bcrypt
   - Validação de força de senha
   - Geração de senhas aleatórias

3. **Middleware** (`src/middleware.ts`)
   - Proteção de rotas
   - Verificação automática de tokens
   - Redirecionamento para login

4. **API Routes** (`src/app/api/admin/auth/`)
   - Login
   - Logout
   - Verificação de usuário
   - Renovação de tokens

5. **Hook de Autenticação** (`src/hooks/useAuth.tsx`)
   - Contexto de autenticação
   - Gerenciamento de estado
   - Funções de login/logout

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` baseado no `env.example`:

```env
# Configurações JWT
JWT_SECRET="sua-chave-secreta-super-segura-aqui-mude-em-producao"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Configurações de Segurança
NODE_ENV="development"
```

### Configurações Centralizadas

Todas as configurações estão centralizadas em `src/lib/config/auth.ts`:

```typescript
export const AUTH_CONFIG = {
  JWT: {
    SECRET: process.env.JWT_SECRET || 'default-secret',
    ACCESS_TOKEN_EXPIRES_IN: '24h',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },
  COOKIES: {
    ACCESS_TOKEN_NAME: 'accessToken',
    REFRESH_TOKEN_NAME: 'refreshToken',
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict',
  },
  // ... outras configurações
}
```

## 🚀 Como Usar

### 1. Login de Usuário

```typescript
import { useAuth } from '@/hooks/useAuth'

function LoginComponent() {
  const { login, loading } = useAuth()
  
  const handleLogin = async () => {
    const result = await login(username, password)
    if (result.success) {
      // Redirecionamento automático para /admin
    }
  }
}
```

### 2. Proteção de Rotas

O middleware protege automaticamente as rotas `/admin` e `/api/admin`. Usuários não autenticados são redirecionados para `/admin/login`.

### 3. Verificação de Autenticação

```typescript
import { useAuth } from '@/hooks/useAuth'

function ProtectedComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Carregando...</div>
  if (!user) return <div>Acesso negado</div>
  
  return <div>Bem-vindo, {user.nome}!</div>
}
```

### 4. Logout

```typescript
import { useAuth } from '@/hooks/useAuth'

function LogoutButton() {
  const { logout } = useAuth()
  
  const handleLogout = () => {
    logout() // Redirecionamento automático para /admin/login
  }
}
```

## 🔒 Segurança

### Tokens JWT

- **Access Token**: Validade de 24 horas
- **Refresh Token**: Validade de 7 dias
- **Renovação Automática**: Tokens expirados são renovados automaticamente

### Cookies Seguros

- **HttpOnly**: Previne acesso via JavaScript
- **Secure**: HTTPS obrigatório em produção
- **SameSite**: Proteção contra CSRF
- **Path**: Restrito ao domínio

### Validação de Senhas

- Mínimo de 8 caracteres
- Letra maiúscula obrigatória
- Letra minúscula obrigatória
- Número obrigatório
- Caractere especial obrigatório

## 📱 API Endpoints

### POST `/api/admin/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "1",
    "username": "admin",
    "nome": "Administrador Principal",
    "cargo": "ADMIN",
    "permissoes": { ... }
  },
  "message": "Login realizado com sucesso"
}
```

### POST `/api/admin/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

### GET `/api/admin/auth/me`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "1",
    "username": "admin",
    "nome": "Administrador Principal",
    "cargo": "ADMIN",
    "permissoes": { ... },
    "ultimoAcesso": "2024-12-19T10:30:00.000Z"
  }
}
```

### POST `/api/admin/auth/refresh`

**Response:**
```json
{
  "success": true,
  "message": "Token renovado com sucesso",
  "accessToken": "novo.jwt.token"
}
```

## 🧪 Testando o Sistema

### Usuários de Teste

O sistema vem com usuários pré-configurados em `src/lib/admin/users.json`:

1. **admin** / **admin123** - Administrador com todas as permissões
2. **corretor1** / **corretor123** - Corretor com permissões limitadas
3. **assistente1** / **assistente123** - Assistente com permissões básicas

### Fluxo de Teste

1. Acesse `/admin/login`
2. Use as credenciais de teste
3. Verifique redirecionamento para `/admin`
4. Teste logout
5. Verifique proteção de rotas

## 🔧 Personalização

### Adicionar Novos Usuários

Edite `src/lib/admin/users.json`:

```json
{
  "id": "4",
  "username": "novo_usuario",
  "email": "novo@exemplo.com",
  "password": "$2b$10$...", // Use bcrypt para hash
  "nome": "Novo Usuário",
  "cargo": "CORRETOR",
  "permissoes": {
    "imoveis": "WRITE",
    "proximidades": "READ",
    "usuarios": "READ",
    "relatorios": "READ"
  },
  "ativo": true
}
```

### Modificar Permissões

```typescript
export interface UserPermissions {
  imoveis: Permission
  proximidades: Permission
  usuarios: Permission
  relatorios: Permission
  // Adicione novas permissões aqui
  configuracoes: Permission
}

export type Permission = 'READ' | 'WRITE' | 'DELETE'
```

### Alterar Configurações JWT

```typescript
// src/lib/config/auth.ts
export const AUTH_CONFIG = {
  JWT: {
    ACCESS_TOKEN_EXPIRES_IN: '1h', // Reduzir para 1 hora
    REFRESH_TOKEN_EXPIRES_IN: '30d', // Aumentar para 30 dias
  },
  // ... outras configurações
}
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Token Expirado**
   - O sistema renova automaticamente
   - Verifique se o refresh token não expirou

2. **Cookies Não Funcionando**
   - Verifique configurações de HTTPS em produção
   - Confirme configurações de domínio

3. **Middleware Não Funciona**
   - Verifique se está no arquivo `middleware.ts`
   - Confirme configuração do matcher

4. **Erro de Hash de Senha**
   - Use bcrypt para gerar hashes
   - Verifique se a senha está correta

### Logs de Debug

```typescript
// Adicione logs para debug
console.log('Token recebido:', token)
console.log('Token decodificado:', decoded)
console.log('Usuário encontrado:', user)
```

## 📚 Recursos Adicionais

### Cliente API

Use o cliente API personalizado para requisições autenticadas:

```typescript
import { api } from '@/lib/utils/api'

// Requisição com renovação automática de token
const data = await api.get('/api/admin/imoveis')
```

### Hooks Personalizados

```typescript
// Hook para verificar permissões
export function usePermission(resource: string, action: Permission) {
  const { user } = useAuth()
  return user?.permissoes[resource] === action || user?.permissoes[resource] === 'DELETE'
}
```

## 🔮 Próximos Passos

1. **Rate Limiting**: Implementar proteção contra ataques de força bruta
2. **Auditoria**: Log de todas as ações dos usuários
3. **2FA**: Autenticação de dois fatores
4. **Sessões Múltiplas**: Gerenciar múltiplas sessões por usuário
5. **Integração com Banco**: Migrar de JSON para banco de dados real

---

**🔐 Sistema de Autenticação JWT - Seguro, Escalável e Fácil de Usar!**


