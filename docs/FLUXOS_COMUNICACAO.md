# 🔄 Fluxos de Comunicação - Net Imobiliária

## 📋 Visão Geral

Este documento define **todos os fluxos de comunicação** permitidos entre as camadas da aplicação, garantindo que a arquitetura desacoplada seja mantida e respeitada.

## 🎯 Princípios de Comunicação

### **1. Unidirecional**
O fluxo de dados sempre vai **de cima para baixo** nas camadas.

### **2. Padronizado**
Todas as comunicações seguem **padrões consistentes**.

### **3. Tipado**
Todas as interfaces são **fortemente tipadas** com TypeScript.

### **4. Validado**
Todos os dados são **validados** em cada camada.

## 🏗️ Fluxos Principais

## 1️⃣ **Fluxo de Autenticação**

### **Diagrama**:
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│ Middleware  │───▶│   Backend   │───▶│  Database   │
│ (useAuth)   │    │ (apiAuth)   │    │ (/auth/me)  │    │ (users)     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                    ┌─────────────┐    ┌─────────────┐
                    │   JWT       │    │  Response   │
                    │ (Token)     │    │ (User Data) │
                    └─────────────┘    └─────────────┘
```

### **Implementação**:

#### **Frontend** (`useAuth.tsx`):
```typescript
// ✅ CORRETO: Hook de autenticação
export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null)
  
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
    }
  }
  
  return { user, checkAuth }
}
```

#### **Middleware** (`apiAuth.ts`):
```typescript
// ✅ CORRETO: Middleware de autenticação
export function apiAuthMiddleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value
  
  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
  
  return null // Continua com a requisição
}
```

#### **Backend** (`/api/admin/auth/me/route.ts`):
```typescript
// ✅ CORRETO: API de autenticação
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    const user = await getCurrentUser(request)
    
    return NextResponse.json({
      success: true,
      user: user
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

#### **Database** (`users.ts`):
```typescript
// ✅ CORRETO: Query de usuário
export async function getCurrentUser(request: NextRequest): Promise<User> {
  const token = request.cookies.get('accessToken')?.value
  const decoded = verifyToken(token!)
  
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [decoded.userId]
  )
  
  return result.rows[0]
}
```

## 2️⃣ **Fluxo de Operações CRUD**

### **Diagrama**:
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│ Middleware  │───▶│   Backend   │───▶│  Database   │
│ (Component) │    │ (Auth/      │    │ (API Route) │    │ (Queries)   │
│             │    │  Perms)     │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                    ┌─────────────┐    ┌─────────────┐
                    │ Validation  │    │  Response   │
                    │ & Auth      │    │ (Data)      │
                    └─────────────┘    └─────────────┘
```

### **Implementação**:

#### **Frontend** (`UserList.tsx`):
```typescript
// ✅ CORRETO: Componente com CRUD
export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/usuarios')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchUsers()
  }, [])
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

#### **Backend** (`/api/admin/usuarios/route.ts`):
```typescript
// ✅ CORRETO: API CRUD
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 2. Buscar dados
    const users = await findUsersWithRoles()
    
    // 3. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      users: users,
      total: users.length
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

#### **Database** (`users.ts`):
```typescript
// ✅ CORRETO: Query CRUD
export async function findUsersWithRoles(): Promise<User[]> {
  const result = await pool.query(`
    SELECT u.*, r.nome as role_nome, r.nivel as role_nivel
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.ativo = true
    ORDER BY u.nome
  `)
  
  return result.rows
}
```

## 3️⃣ **Fluxo de Permissões**

### **Diagrama**:
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│ Middleware  │───▶│   Backend   │───▶│  Database   │
│ (Permission │    │ (Permission │    │ (Permission │    │ (user_roles │
│  Guard)     │    │  Check)     │    │  Validation)│    │  table)     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                    ┌─────────────┐    ┌─────────────┐
                    │ Permission  │    │  Response   │
                    │ Result      │    │ (Allow/     │
                    │             │    │  Deny)      │
                    └─────────────┘    └─────────────┘
```

### **Implementação**:

#### **Frontend** (`PermissionGuard.tsx`):
```typescript
// ✅ CORRETO: Guard de permissões
export default function PermissionGuard({ 
  children, 
  resource, 
  action 
}: PermissionGuardProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const { hasPermission: checkPermission } = usePermissions()
  
  useEffect(() => {
    const verifyPermission = async () => {
      const hasAccess = checkPermission(resource, action)
      setHasPermission(hasAccess)
    }
    
    verifyPermission()
  }, [resource, action, checkPermission])
  
  if (!hasPermission) return null
  
  return <>{children}</>
}
```

#### **Middleware** (`permissionMiddleware.ts`):
```typescript
// ✅ CORRETO: Middleware de permissões
export async function checkApiPermission(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const permissionConfig = findPermissionConfig(pathname)
  
  if (!permissionConfig) return null
  
  const token = request.cookies.get('accessToken')?.value
  const decoded = verifyToken(token!)
  
  const hasPermission = await userHasPermission(
    decoded.userId,
    permissionConfig.resource,
    permissionConfig.action
  )
  
  if (!hasPermission) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  
  return null
}
```

## 4️⃣ **Fluxo de Validação**

### **Diagrama**:
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│ Middleware  │───▶│   Backend   │───▶│  Database   │
│ (Form       │    │ (Basic      │    │ (Business   │    │ (Data       │
│  Validation)│    │  Validation)│    │  Validation)│    │  Integrity) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                    ┌─────────────┐    ┌─────────────┐
                    │ Validation  │    │  Response   │
                    │ Result      │    │ (Success/   │
                    │             │    │  Error)     │
                    └─────────────┘    └─────────────┘
```

### **Implementação**:

#### **Frontend** (`UserForm.tsx`):
```typescript
// ✅ CORRETO: Validação no frontend
export default function UserForm() {
  const [formData, setFormData] = useState<UserFormData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateForm = (data: UserFormData) => {
    const newErrors: Record<string, string> = {}
    
    if (!data.username) newErrors.username = 'Username é obrigatório'
    if (!data.email) newErrors.email = 'Email é obrigatório'
    if (!data.password) newErrors.password = 'Senha é obrigatória'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(formData)) return
    
    // Enviar para API
    const response = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    const result = await response.json()
    if (!result.success) {
      setErrors(result.errors || {})
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
    </form>
  )
}
```

#### **Backend** (`/api/admin/usuarios/route.ts`):
```typescript
// ✅ CORRETO: Validação no backend
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validação de dados
    const validation = validateUserData(data)
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: validation.errors
      }, { status: 400 })
    }
    
    // Criar usuário
    const newUser = await createUser(data)
    
    return NextResponse.json({
      success: true,
      user: newUser
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

## 5️⃣ **Fluxo de Cache**

### **Diagrama**:
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│ Middleware  │───▶│   Backend   │───▶│  Database   │
│ (Cache      │    │ (Cache      │    │ (Cache      │    │ (Data       │
│  Check)     │    │  Layer)     │    │  Strategy)  │    │  Source)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                    ┌─────────────┐    ┌─────────────┐
                    │ Cache Hit/  │    │  Response   │
                    │ Miss        │    │ (Cached/    │
                    │             │    │  Fresh)     │
                    └─────────────┘    └─────────────┘
```

### **Implementação**:

#### **Frontend** (`useCache.ts`):
```typescript
// ✅ CORRETO: Hook de cache
export function useCache() {
  const [cache, setCache] = useState<Map<string, any>>(new Map())
  
  const getCached = (key: string) => {
    return cache.get(key)
  }
  
  const setCached = (key: string, value: any, ttl: number = 300000) => {
    setCache(prev => new Map(prev.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })))
  }
  
  return { getCached, setCached }
}
```

#### **Backend** (`apiClient.ts`):
```typescript
// ✅ CORRETO: Cliente API com cache
export async function fetchWithCache<T>(
  endpoint: string,
  options: { ttl?: number; forceRefresh?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { ttl, forceRefresh = false } = options
  const cacheKey = cacheUtils.generateKey('api', { endpoint })
  
  if (!forceRefresh) {
    const cached = generalCache.get<ApiResponse<T>>(cacheKey)
    if (cached) return cached
  }
  
  const result = await apiClient.get<T>(endpoint)
  
  if (result.success) {
    generalCache.set(cacheKey, result, ttl)
  }
  
  return result
}
```

## 🚨 **Fluxos Proibidos**

### **❌ Frontend → Database (Bypass do Backend)**:
```typescript
// ❌ ERRADO: Frontend acessando banco diretamente
const users = await pool.query('SELECT * FROM users')
```

### **❌ Frontend → Backend (Bypass do Middleware)**:
```typescript
// ❌ ERRADO: Frontend chamando backend sem middleware
const response = await fetch('/api/admin/usuarios', {
  headers: { 'Authorization': 'Bearer ' + token } // Deveria ser no middleware
})
```

### **❌ Middleware → Database (Bypass do Backend)**:
```typescript
// ❌ ERRADO: Middleware acessando banco diretamente
export async function middleware(request: NextRequest) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
}
```

## 📋 **Checklist de Validação de Fluxos**

### **Para cada nova funcionalidade, verificar**:

- [ ] **Frontend** usa apenas APIs RESTful?
- [ ] **Middleware** intercepta todas as requisições?
- [ ] **Backend** valida dados antes de processar?
- [ ] **Database** é acessado apenas pelo backend?
- [ ] **Respostas** seguem padrão consistente?
- [ ] **Erros** são tratados em cada camada?
- [ ] **Cache** é implementado adequadamente?
- [ ] **Logs** são gerados em pontos críticos?

## 🔧 **Ferramentas de Validação**

### **1. ESLint Rules**:
```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../database/*"],
            "message": "Frontend não pode acessar database diretamente"
          }
        ]
      }
    ]
  }
}
```

### **2. TypeScript Interfaces**:
```typescript
// ✅ CORRETO: Interfaces bem definidas
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface User {
  id: string
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  ativo: boolean
}
```

### **3. Validação de Arquitetura**:
```typescript
// ✅ CORRETO: Validação automática
export function validateArchitecture() {
  // Verificar se frontend não acessa database
  // Verificar se middleware não contém lógica de negócio
  // Verificar se backend não acessa UI
  // Verificar se database não contém lógica de negócio
}
```

## 📚 **Próximos Passos**

1. **Implementar testes** para cada fluxo
2. **Adicionar monitoramento** de performance
3. **Implementar rate limiting** por fluxo
4. **Adicionar validação** automática de arquitetura
5. **Documentar APIs** com OpenAPI

---

**Última atualização**: $(date)
**Versão**: 1.0.0
**Status**: ✅ Implementado e Funcionando






