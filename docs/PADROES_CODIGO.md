# 🎯 Padrões de Código e Estrutura - Net Imobiliária

## 📋 Visão Geral

Este documento estabelece **padrões obrigatórios** para estrutura de código, nomenclatura, organização de arquivos e convenções que garantem consistência e manutenibilidade do projeto.

## 🏗️ **ESTRUTURA DE ARQUIVOS**

## 1️⃣ **Estrutura Geral do Projeto**

```
net-imobiliaria/
├── src/                          # ✅ Código fonte
│   ├── app/                     # ✅ Next.js App Router
│   ├── components/              # ✅ Componentes React
│   ├── hooks/                   # ✅ Custom hooks
│   ├── lib/                     # ✅ Utilitários e configurações
│   └── types/                   # ✅ Definições TypeScript
├── docs/                        # ✅ Documentação
├── database/                    # ✅ Scripts SQL
├── scripts/                     # ✅ Scripts de automação
└── tests/                       # ✅ Testes
```

## 2️⃣ **Estrutura por Camada**

### **Frontend Layer**:
```
src/
├── app/                         # ✅ Páginas Next.js
│   ├── (with-header)/          # ✅ Layouts públicos
│   ├── admin/                  # ✅ Área administrativa
│   └── login/                  # ✅ Páginas de autenticação
├── components/                 # ✅ Componentes reutilizáveis
│   ├── admin/                  # ✅ Componentes administrativos
│   ├── Header.tsx              # ✅ Componentes gerais
│   └── PropertyCard.tsx        # ✅ Componentes de domínio
└── hooks/                      # ✅ Custom hooks
    ├── useAuth.tsx             # ✅ Hook de autenticação
    ├── usePermissions.tsx      # ✅ Hook de permissões
    └── useImageUpload.ts       # ✅ Hook de upload
```

### **Backend Layer**:
```
src/app/api/admin/
├── auth/                       # ✅ Autenticação
│   ├── login/route.ts         # ✅ Login
│   ├── logout/route.ts        # ✅ Logout
│   └── me/route.ts            # ✅ Dados do usuário
├── usuarios/                   # ✅ CRUD de usuários
│   ├── route.ts               # ✅ GET, POST
│   └── [id]/route.ts          # ✅ GET, PUT, DELETE
└── imoveis/                    # ✅ CRUD de imóveis
    ├── route.ts               # ✅ Listagem
    ├── [id]/route.ts          # ✅ Operações por ID
    └── stats/route.ts         # ✅ Estatísticas
```

### **Database Layer**:
```
src/lib/database/
├── connection.ts               # ✅ Pool de conexões
├── users.ts                   # ✅ Queries de usuários
├── imoveis.ts                 # ✅ Queries de imóveis
├── proximidades.ts            # ✅ Queries de proximidades
└── audit.ts                   # ✅ Queries de auditoria
```

### **Middleware Layer**:
```
src/lib/middleware/
├── apiAuth.ts                 # ✅ Autenticação de APIs
├── permissionMiddleware.ts    # ✅ Controle de permissões
└── rateLimit.ts              # ✅ Rate limiting
```

## 📝 **PADRÕES DE NOMENCLATURA**

## 1️⃣ **Arquivos e Pastas**

### **✅ CORRETO**:
```
components/
├── UserList.tsx               # ✅ PascalCase para componentes
├── user-form.tsx             # ✅ kebab-case para arquivos
└── useAuth.tsx               # ✅ camelCase para hooks

api/
├── users/route.ts            # ✅ lowercase para rotas
└── [id]/route.ts             # ✅ colchetes para parâmetros

database/
├── users.ts                  # ✅ lowercase para módulos
└── connection.ts             # ✅ lowercase para utilitários
```

### **❌ INCORRETO**:
```
components/
├── userlist.tsx              # ❌ Sem separação
├── User_List.tsx             # ❌ Underscore
└── userList.tsx              # ❌ camelCase para componentes

api/
├── Users/route.ts            # ❌ PascalCase para rotas
└── id/route.ts               # ❌ Sem colchetes
```

## 2️⃣ **Variáveis e Funções**

### **✅ CORRETO**:
```typescript
// ✅ camelCase para variáveis e funções
const userName = 'john_doe'
const isUserActive = true
const fetchUserData = async () => {}

// ✅ PascalCase para classes e interfaces
interface UserData {
  id: string
  name: string
}

class UserService {
  async createUser() {}
}

// ✅ UPPER_SNAKE_CASE para constantes
const MAX_USERS = 100
const API_BASE_URL = '/api'
const DEFAULT_TIMEOUT = 5000
```

### **❌ INCORRETO**:
```typescript
// ❌ snake_case para variáveis
const user_name = 'john_doe'
const is_user_active = true

// ❌ camelCase para constantes
const maxUsers = 100
const apiBaseUrl = '/api'

// ❌ snake_case para interfaces
interface user_data {
  id: string
}
```

## 3️⃣ **Componentes React**

### **✅ CORRETO**:
```typescript
// ✅ PascalCase para componentes
export default function UserList() {
  return <div>User List</div>
}

// ✅ camelCase para props
interface UserListProps {
  users: User[]
  onUserSelect: (user: User) => void
  showInactive?: boolean
}

// ✅ camelCase para estado
const [users, setUsers] = useState<User[]>([])
const [isLoading, setIsLoading] = useState(false)
const [selectedUser, setSelectedUser] = useState<User | null>(null)
```

### **❌ INCORRETO**:
```typescript
// ❌ camelCase para componentes
export default function userList() {
  return <div>User List</div>
}

// ❌ snake_case para props
interface UserListProps {
  user_list: User[]
  on_user_select: (user: User) => void
}

// ❌ snake_case para estado
const [user_list, set_user_list] = useState<User[]>([])
```

## 4️⃣ **APIs e Rotas**

### **✅ CORRETO**:
```typescript
// ✅ camelCase para funções de API
export async function GET(request: NextRequest) {}
export async function POST(request: NextRequest) {}
export async function PUT(request: NextRequest) {}
export async function DELETE(request: NextRequest) {}

// ✅ camelCase para variáveis
const userData = await request.json()
const validationResult = validateUserData(userData)
const newUser = await createUser(userData)
```

### **❌ INCORRETO**:
```typescript
// ❌ snake_case para funções
export async function get_user(request: NextRequest) {}
export async function create_user(request: NextRequest) {}

// ❌ snake_case para variáveis
const user_data = await request.json()
const validation_result = validateUserData(userData)
```

## 5️⃣ **Database e Queries**

### **✅ CORRETO**:
```typescript
// ✅ camelCase para funções
export async function createUser(userData: CreateUserData): Promise<User> {}
export async function findUserById(id: string): Promise<User | null> {}
export async function updateUserStatus(id: string, status: boolean): Promise<void> {}

// ✅ camelCase para variáveis
const queryResult = await pool.query('SELECT * FROM users')
const userRows = queryResult.rows
const newUser = userRows[0]
```

### **❌ INCORRETO**:
```typescript
// ❌ snake_case para funções
export async function create_user(user_data: CreateUserData) {}
export async function find_user_by_id(id: string) {}

// ❌ snake_case para variáveis
const query_result = await pool.query('SELECT * FROM users')
const user_rows = queryResult.rows
```

## 🏗️ **PADRÕES DE ESTRUTURA**

## 1️⃣ **Componentes React**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Estrutura padrão de componente
import React, { useState, useEffect, useCallback } from 'react'
import { NextRequest } from 'next/server'

// 1. Imports de tipos
import { User, UserFormData } from '@/lib/types/admin'

// 2. Imports de hooks
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'

// 3. Imports de componentes
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// 4. Interface de props
interface UserListProps {
  onUserSelect: (user: User) => void
  showInactive?: boolean
  className?: string
}

// 5. Componente principal
export default function UserList({ 
  onUserSelect, 
  showInactive = false,
  className = ''
}: UserListProps) {
  // 6. Estado local
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 7. Hooks customizados
  const { user: currentUser } = useAuth()
  const { fetchUsers, createUser, updateUser } = useUsers()
  
  // 8. Funções de callback
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchUsers({ includeInactive: showInactive })
      setUsers(data)
    } catch (err) {
      setError('Erro ao carregar usuários')
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchUsers, showInactive])
  
  // 9. Effects
  useEffect(() => {
    loadUsers()
  }, [loadUsers])
  
  // 10. Handlers de eventos
  const handleUserSelect = useCallback((user: User) => {
    onUserSelect(user)
  }, [onUserSelect])
  
  const handleRetry = useCallback(() => {
    loadUsers()
  }, [loadUsers])
  
  // 11. Renderização condicional
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />
  
  // 12. Renderização principal
  return (
    <div className={`user-list ${className}`}>
      {users.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onClick={() => handleUserSelect(user)}
        />
      ))}
    </div>
  )
}
```

## 2️⃣ **APIs e Rotas**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Estrutura padrão de API
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import { validationUtils } from '@/lib/utils/validation'
import { createUser, findUsersWithRoles } from '@/lib/database/users'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { User, CreateUserData, ApiResponse } from '@/lib/types/admin'

// 1. Interface para dados de entrada
interface CreateUserRequest {
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  password: string
}

// 2. Função de validação
function validateCreateData(data: CreateUserRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.username?.trim()) {
    errors.push('Username é obrigatório')
  }
  
  if (!data.email?.trim()) {
    errors.push('Email é obrigatório')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 3. GET - Listar recursos
export async function GET(request: NextRequest) {
  try {
    // 3.1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 3.2. Buscar dados
    const users = await findUsersWithRoles()
    
    // 3.3. Log de auditoria
    auditLogger.log(
      'USERS_LIST',
      'Usuário listou usuários do sistema',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )
    
    // 3.4. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: users,
      total: users.length
    })
    
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// 4. POST - Criar recurso
export async function POST(request: NextRequest) {
  try {
    // 4.1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 4.2. Validar dados de entrada
    const data: CreateUserRequest = await request.json()
    const validation = validateCreateData(data)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validation.errors
      }, { status: 400 })
    }
    
    // 4.3. Executar lógica de negócio
    const newUser = await createUser(data)
    
    // 4.4. Log de auditoria
    auditLogger.log(
      'USER_CREATE',
      'Usuário criado no sistema',
      true,
      newUser.id,
      newUser.username,
      request.ip || 'unknown'
    )
    
    // 4.5. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Usuário criado com sucesso'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    
    // 4.6. Tratamento de erros específicos
    if (error instanceof Error) {
      if (error.message.includes('já existe')) {
        return NextResponse.json({
          success: false,
          error: 'Username ou email já existe'
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
```

## 3️⃣ **Database e Queries**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Estrutura padrão de query
import pool from './connection'
import { hashPassword } from '@/lib/auth/password'
import { User, CreateUserData, UpdateUserData } from '@/lib/types/admin'

// 1. Interface para dados de entrada
interface CreateUserData {
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  password: string
  ativo: boolean
}

// 2. Função de criação
export async function createUser(userData: CreateUserData): Promise<User> {
  const client = await pool.connect()
  
  try {
    // 2.1. Iniciar transação
    await client.query('BEGIN')
    
    // 2.2. Query com prepared statement
    const result = await client.query(
      `INSERT INTO users (username, email, nome, telefone, role_id, password_hash, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userData.username,
        userData.email,
        userData.nome,
        userData.telefone,
        userData.roleId,
        await hashPassword(userData.password),
        userData.ativo
      ]
    )
    
    // 2.3. Confirmar transação
    await client.query('COMMIT')
    
    // 2.4. Retornar dados
    return result.rows[0]
    
  } catch (error) {
    // 2.5. Reverter transação em caso de erro
    await client.query('ROLLBACK')
    throw error
  } finally {
    // 2.6. Liberar conexão
    client.release()
  }
}

// 3. Função de busca
export async function findUsersWithRoles(): Promise<User[]> {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.nome,
      u.telefone,
      u.ativo,
      u.created_at,
      u.updated_at,
      r.id as role_id,
      r.nome as role_nome,
      r.nivel as role_nivel
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.ativo = true
    ORDER BY u.nome
  `)
  
  return result.rows
}

// 4. Função de atualização
export async function updateUser(id: string, userData: UpdateUserData): Promise<User> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const result = await client.query(
      `UPDATE users 
       SET username = $1, email = $2, nome = $3, telefone = $4, role_id = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        userData.username,
        userData.email,
        userData.nome,
        userData.telefone,
        userData.roleId,
        id
      ]
    )
    
    await client.query('COMMIT')
    return result.rows[0]
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

## 4️⃣ **Hooks Customizados**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Estrutura padrão de hook
import { useState, useEffect, useCallback } from 'react'
import { User, CreateUserData, UpdateUserData } from '@/lib/types/admin'
import { apiClient } from '@/lib/utils/apiClient'

// 1. Interface para opções do hook
interface UseUsersOptions {
  includeInactive?: boolean
  page?: number
  limit?: number
}

// 2. Interface para retorno do hook
interface UseUsersReturn {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: (options?: UseUsersOptions) => Promise<User[]>
  createUser: (userData: CreateUserData) => Promise<User>
  updateUser: (id: string, userData: UpdateUserData) => Promise<User>
  deleteUser: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// 3. Hook principal
export function useUsers(initialOptions: UseUsersOptions = {}): UseUsersReturn {
  // 3.1. Estado local
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 3.2. Função para buscar usuários
  const fetchUsers = useCallback(async (options: UseUsersOptions = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<User[]>('/api/admin/usuarios', {
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutos
      })
      
      if (response.success && response.data) {
        setUsers(response.data)
        return response.data
      }
      
      throw new Error('Erro ao buscar usuários')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 3.3. Função para criar usuário
  const createUser = useCallback(async (userData: CreateUserData): Promise<User> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.post<User>('/api/admin/usuarios', userData)
      
      if (response.success && response.data) {
        setUsers(prev => [...prev, response.data!])
        return response.data
      }
      
      throw new Error('Erro ao criar usuário')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 3.4. Função para atualizar usuário
  const updateUser = useCallback(async (id: string, userData: UpdateUserData): Promise<User> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.put<User>(`/api/admin/usuarios/${id}`, userData)
      
      if (response.success && response.data) {
        setUsers(prev => prev.map(user => 
          user.id === id ? response.data! : user
        ))
        return response.data
      }
      
      throw new Error('Erro ao atualizar usuário')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 3.5. Função para deletar usuário
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.delete(`/api/admin/usuarios/${id}`)
      
      if (response.success) {
        setUsers(prev => prev.filter(user => user.id !== id))
      } else {
        throw new Error('Erro ao deletar usuário')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 3.6. Função para refetch
  const refetch = useCallback(async () => {
    await fetchUsers(initialOptions)
  }, [fetchUsers, initialOptions])
  
  // 3.7. Effect para carregar dados iniciais
  useEffect(() => {
    fetchUsers(initialOptions)
  }, [fetchUsers, initialOptions])
  
  // 3.8. Retorno do hook
  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    refetch
  }
}
```

## 🔧 **PADRÕES DE CONFIGURAÇÃO**

## 1️⃣ **Constantes e Configurações**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Configurações centralizadas
export const APP_CONFIG = {
  // Configurações gerais
  APP_NAME: 'Net Imobiliária',
  APP_VERSION: '1.0.0',
  
  // Configurações de paginação
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
  },
  
  // Configurações de upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_IMAGES_PER_IMOVEL: 20
  }
}

// ✅ CORRETO: Constantes específicas
export const USER_ROLES = {
  ADMIN: 'admin',
  CORRETOR: 'corretor',
  ASSISTENTE: 'assistente'
} as const

export const PERMISSION_LEVELS = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  DELETE: 3
} as const
```

## 2️⃣ **Interfaces TypeScript**

### **✅ Estrutura Padrão**:
```typescript
// ✅ CORRETO: Interfaces bem definidas
export interface User {
  id: string
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  password: string
  ativo?: boolean
}

export interface UpdateUserData {
  username?: string
  email?: string
  nome?: string
  telefone?: string
  roleId?: number
  ativo?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

## 📋 **CHECKLIST DE VALIDAÇÃO**

### **Para cada arquivo, verificar**:

- [ ] **Nomenclatura**: Segue os padrões estabelecidos?
- [ ] **Estrutura**: Segue a estrutura padrão da camada?
- [ ] **Imports**: Estão organizados corretamente?
- [ ] **Tipagem**: Usa TypeScript com tipagem forte?
- [ ] **Documentação**: Tem comentários adequados?
- [ ] **Tratamento de Erros**: Trata erros adequadamente?
- [ ] **Logging**: Loga operações importantes?
- [ ] **Validação**: Valida dados adequadamente?

## 🚨 **VIOLAÇÕES COMUNS**

### **❌ Nomenclatura Incorreta**:
```typescript
// ❌ ERRADO: Nomenclatura inconsistente
const user_list = []
const UserName = 'john'
const fetch_user_data = () => {}

// ✅ CORRETO: Nomenclatura consistente
const userList = []
const userName = 'john'
const fetchUserData = () => {}
```

### **❌ Estrutura Incorreta**:
```typescript
// ❌ ERRADO: Estrutura desorganizada
export default function UserList() {
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    // Lógica complexa no effect
  }, [])
  
  const handleClick = () => {
    // Lógica no handler
  }
  
  return <div>Users</div>
}

// ✅ CORRETO: Estrutura organizada
export default function UserList() {
  // Estado
  const [users, setUsers] = useState<User[]>([])
  
  // Hooks
  const { fetchUsers } = useUsers()
  
  // Callbacks
  const handleClick = useCallback(() => {
    // Lógica simples
  }, [])
  
  // Effects
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])
  
  // Renderização
  return <div>Users</div>
}
```

## 📚 **FERRAMENTAS DE VALIDAÇÃO**

### **1. ESLint Configuration**:
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "next/core-web-vitals"
  ],
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"]
      },
      {
        "selector": "function",
        "format": ["camelCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ]
  }
}
```

### **2. Prettier Configuration**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## 📚 **Próximos Passos**

1. **Implementar validação automática** de padrões
2. **Adicionar pre-commit hooks** para validação
3. **Criar templates** para novos arquivos
4. **Implementar linting** automático
5. **Documentar padrões** específicos por domínio

---

**Última atualização**: $(date)
**Versão**: 1.0.0
**Status**: ✅ Implementado e Funcionando






