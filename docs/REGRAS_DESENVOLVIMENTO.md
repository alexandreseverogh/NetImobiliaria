# 📋 Regras Obrigatórias de Desenvolvimento - Net Imobiliária

## 🚨 **IMPORTANTE**: Estas regras são **OBRIGATÓRIAS** e devem ser seguidas em **TODOS** os desenvolvimentos futuros.

## 📋 Visão Geral

Este documento estabelece **regras rígidas** que garantem a manutenção da arquitetura desacoplada e a qualidade do código. **Violações destas regras resultarão em rejeição do código**.

## 🎯 Princípios Fundamentais

### **1. Arquitetura Desacoplada**
- ✅ **SEMPRE** respeitar a separação de camadas
- ✅ **SEMPRE** seguir os fluxos de comunicação definidos
- ❌ **NUNCA** criar dependências diretas entre camadas não adjacentes

### **2. Qualidade de Código**
- ✅ **SEMPRE** escrever código limpo e legível
- ✅ **SEMPRE** usar TypeScript com tipagem forte
- ✅ **SEMPRE** seguir os padrões estabelecidos

### **3. Segurança**
- ✅ **SEMPRE** validar dados em múltiplas camadas
- ✅ **SEMPRE** usar autenticação e autorização
- ✅ **SEMPRE** logar operações importantes

## 🏗️ **REGRAS POR CAMADA**

## 1️⃣ **FRONTEND LAYER** - Regras Obrigatórias

### **✅ OBRIGATÓRIO**:

#### **1. Estrutura de Arquivos**:
```
src/
├── app/                    # ✅ Páginas Next.js
├── components/            # ✅ Componentes reutilizáveis
│   ├── admin/            # ✅ Componentes administrativos
│   └── [gerais]          # ✅ Componentes gerais
└── hooks/                # ✅ Custom hooks
```

#### **2. Componentes**:
- ✅ **SEMPRE** usar TypeScript com interfaces bem definidas
- ✅ **SEMPRE** ser componentes funcionais (não classes)
- ✅ **SEMPRE** usar hooks para lógica de estado
- ✅ **SEMPRE** validar props com TypeScript
- ✅ **SEMPRE** tratar erros de forma user-friendly

#### **3. Hooks**:
- ✅ **SEMPRE** começar com `use` (ex: `useAuth`, `useUsers`)
- ✅ **SEMPRE** retornar objetos com propriedades nomeadas
- ✅ **SEMPRE** usar `useCallback` para funções
- ✅ **SEMPRE** usar `useMemo` para valores computados

#### **4. Estado**:
- ✅ **SEMPRE** usar `useState` para estado local
- ✅ **SEMPRE** usar Context API para estado global
- ✅ **SEMPRE** usar `useEffect` para side effects
- ✅ **SEMPRE** limpar subscriptions no cleanup

### **❌ PROIBIDO**:

#### **1. Acesso Direto ao Banco**:
```typescript
// ❌ PROIBIDO: Frontend acessando banco diretamente
import pool from '@/lib/database/connection'
const users = await pool.query('SELECT * FROM users')
```

#### **2. Lógica de Negócio Complexa**:
```typescript
// ❌ PROIBIDO: Lógica de negócio no frontend
function calculateUserPermissions(user: User) {
  // Lógica complexa de permissões
}
```

#### **3. Validação de Segurança**:
```typescript
// ❌ PROIBIDO: Validação de segurança no frontend
function validateAdminAccess(user: User) {
  return user.role === 'admin' // Inseguro!
}
```

### **📝 Exemplo de Componente Válido**:
```typescript
// ✅ CORRETO: Componente seguindo todas as regras
interface UserListProps {
  onUserSelect: (user: User) => void
  showInactive?: boolean
}

export default function UserList({ onUserSelect, showInactive = false }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { fetchUsers } = useUsers()
  
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
  
  useEffect(() => {
    loadUsers()
  }, [loadUsers])
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} onRetry={loadUsers} />
  
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onClick={() => onUserSelect(user)}
        />
      ))}
    </div>
  )
}
```

## 2️⃣ **MIDDLEWARE LAYER** - Regras Obrigatórias

### **✅ OBRIGATÓRIO**:

#### **1. Estrutura de Arquivos**:
```
src/
├── middleware.ts                    # ✅ Middleware principal
└── lib/middleware/
    ├── apiAuth.ts                  # ✅ Autenticação
    ├── permissionMiddleware.ts     # ✅ Permissões
    └── rateLimit.ts               # ✅ Rate limiting
```

#### **2. Middleware Functions**:
- ✅ **SEMPRE** ser stateless e reutilizável
- ✅ **SEMPRE** retornar `NextResponse` ou `null`
- ✅ **SEMPRE** tratar erros adequadamente
- ✅ **SEMPRE** logar ações importantes
- ✅ **SEMPRE** validar tokens JWT

#### **3. Autenticação**:
- ✅ **SEMPRE** verificar tokens em cookies e headers
- ✅ **SEMPRE** validar expiração de tokens
- ✅ **SEMPRE** retornar 401 para tokens inválidos
- ✅ **SEMPRE** usar `verifyToken` do módulo de auth

#### **4. Permissões**:
- ✅ **SEMPRE** verificar permissões por recurso e ação
- ✅ **SEMPRE** retornar 403 para acesso negado
- ✅ **SEMPRE** usar `userHasPermission` do banco
- ✅ **SEMPRE** logar tentativas de acesso negado

### **❌ PROIBIDO**:

#### **1. Lógica de Negócio**:
```typescript
// ❌ PROIBIDO: Lógica de negócio no middleware
export async function middleware(request: NextRequest) {
  const user = await findUserByToken(token)
  if (user.role === 'admin') {
    // Lógica de negócio no middleware!
  }
}
```

#### **2. Acesso Direto ao Banco**:
```typescript
// ❌ PROIBIDO: Middleware acessando banco diretamente
export async function middleware(request: NextRequest) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
}
```

#### **3. Respostas Complexas**:
```typescript
// ❌ PROIBIDO: Respostas complexas no middleware
export async function middleware(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: complexData,
    pagination: paginationData
  })
}
```

### **📝 Exemplo de Middleware Válido**:
```typescript
// ✅ CORRETO: Middleware seguindo todas as regras
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se precisa de autenticação
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('accessToken')?.value
    
    if (!token) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Token de autenticação não fornecido' },
          { status: 401 }
        )
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    // Verificar se o token é válido
    const decoded = verifyToken(token)
    if (!decoded) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Token de autenticação inválido' },
          { status: 401 }
        )
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    // Verificar permissões para rotas específicas
    const permissionCheck = await checkPagePermission(pathname, token)
    if (!permissionCheck) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
    }
  }
  
  return NextResponse.next()
}
```

## 3️⃣ **BACKEND LAYER** - Regras Obrigatórias

### **✅ OBRIGATÓRIO**:

#### **1. Estrutura de Arquivos**:
```
src/app/api/admin/
├── auth/                    # ✅ Autenticação
├── usuarios/               # ✅ CRUD de usuários
├── imoveis/               # ✅ CRUD de imóveis
└── [outros recursos]/     # ✅ Outros recursos
```

#### **2. API Routes**:
- ✅ **SEMPRE** usar métodos HTTP corretos (GET, POST, PUT, DELETE)
- ✅ **SEMPRE** validar dados de entrada
- ✅ **SEMPRE** usar middlewares de autenticação
- ✅ **SEMPRE** retornar respostas padronizadas
- ✅ **SEMPRE** tratar erros adequadamente

#### **3. Validação**:
- ✅ **SEMPRE** validar dados com `validationUtils`
- ✅ **SEMPRE** retornar 400 para dados inválidos
- ✅ **SEMPRE** incluir detalhes dos erros
- ✅ **SEMPRE** sanitizar dados de entrada

#### **4. Respostas**:
- ✅ **SEMPRE** usar interface `ApiResponse<T>`
- ✅ **SEMPRE** incluir `success: boolean`
- ✅ **SEMPRE** incluir `message` para feedback
- ✅ **SEMPRE** usar status codes corretos

#### **5. Logging**:
- ✅ **SEMPRE** usar `auditLogger` para operações importantes
- ✅ **SEMPRE** logar criação, edição e exclusão
- ✅ **SEMPRE** incluir informações do usuário
- ✅ **SEMPRE** incluir IP e timestamp

### **❌ PROIBIDO**:

#### **1. Acesso Direto ao Banco**:
```typescript
// ❌ PROIBIDO: API acessando banco diretamente
export async function GET(request: NextRequest) {
  const result = await pool.query('SELECT * FROM users')
  return NextResponse.json(result.rows)
}
```

#### **2. Lógica de UI**:
```typescript
// ❌ PROIBIDO: Lógica de UI no backend
export async function GET(request: NextRequest) {
  return NextResponse.json({
    html: '<div>Usuários</div>',
    css: '.user-list { color: blue; }'
  })
}
```

#### **3. Validação Insegura**:
```typescript
// ❌ PROIBIDO: Validação insegura
export async function POST(request: NextRequest) {
  const data = await request.json()
  // Sem validação!
  const user = await createUser(data)
  return NextResponse.json(user)
}
```

### **📝 Exemplo de API Válida**:
```typescript
// ✅ CORRETO: API seguindo todas as regras
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 2. Validar dados de entrada
    const data = await request.json()
    const validation = validationUtils.validateObject(data, 'user')
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validation.errors
      }, { status: 400 })
    }
    
    // 3. Executar lógica de negócio
    const newUser = await createUser(data)
    
    // 4. Log de auditoria
    auditLogger.log(
      'USER_CREATE',
      'Usuário criado no sistema',
      true,
      newUser.id,
      newUser.username,
      request.ip || 'unknown'
    )
    
    // 5. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Usuário criado com sucesso'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    
    // 6. Tratamento de erros
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

## 4️⃣ **DATABASE LAYER** - Regras Obrigatórias

### **✅ OBRIGATÓRIO**:

#### **1. Estrutura de Arquivos**:
```
src/lib/database/
├── connection.ts          # ✅ Pool de conexões
├── users.ts              # ✅ Queries de usuários
├── imoveis.ts            # ✅ Queries de imóveis
└── [outros módulos].ts   # ✅ Outros módulos
```

#### **2. Queries**:
- ✅ **SEMPRE** usar prepared statements
- ✅ **SEMPRE** tratar transações adequadamente
- ✅ **SEMPRE** retornar dados tipados
- ✅ **SEMPRE** otimizar queries
- ✅ **SEMPRE** usar pool de conexões

#### **3. Transações**:
- ✅ **SEMPRE** usar `BEGIN`, `COMMIT`, `ROLLBACK`
- ✅ **SEMPRE** liberar conexões no `finally`
- ✅ **SEMPRE** tratar erros de transação
- ✅ **SEMPRE** usar `client.release()`

#### **4. Tipagem**:
- ✅ **SEMPRE** usar interfaces TypeScript
- ✅ **SEMPRE** tipar parâmetros e retornos
- ✅ **SEMPRE** usar generics quando apropriado
- ✅ **SEMPRE** validar tipos de dados

### **❌ PROIBIDO**:

#### **1. Lógica de Negócio**:
```typescript
// ❌ PROIBIDO: Lógica de negócio no banco
export async function createUser(userData: CreateUserData) {
  // Lógica de negócio no banco!
  if (userData.role === 'admin') {
    userData.permissions = 'all'
  }
  
  const result = await pool.query('INSERT INTO users...')
  return result.rows[0]
}
```

#### **2. Queries Inseguras**:
```typescript
// ❌ PROIBIDO: Queries inseguras
export async function findUser(username: string) {
  const query = `SELECT * FROM users WHERE username = '${username}'`
  const result = await pool.query(query)
  return result.rows[0]
}
```

#### **3. Conexões Não Gerenciadas**:
```typescript
// ❌ PROIBIDO: Conexões não gerenciadas
export async function createUser(userData: CreateUserData) {
  const client = await pool.connect()
  const result = await client.query('INSERT INTO users...')
  // Sem client.release()!
  return result.rows[0]
}
```

### **📝 Exemplo de Query Válida**:
```typescript
// ✅ CORRETO: Query seguindo todas as regras
export async function createUser(userData: CreateUserData): Promise<User> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Query com prepared statement
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

## 🔧 **REGRAS GERAIS**

### **✅ OBRIGATÓRIO**:

#### **1. TypeScript**:
- ✅ **SEMPRE** usar TypeScript com tipagem forte
- ✅ **SEMPRE** definir interfaces para todos os objetos
- ✅ **SEMPRE** usar generics quando apropriado
- ✅ **SEMPRE** evitar `any` e `unknown`

#### **2. Configuração**:
- ✅ **SEMPRE** usar constantes de `APP_CONFIG`
- ✅ **SEMPRE** evitar hardcoding
- ✅ **SEMPRE** usar variáveis de ambiente
- ✅ **SEMPRE** centralizar configurações

#### **3. Cache**:
- ✅ **SEMPRE** usar sistema de cache implementado
- ✅ **SEMPRE** definir TTL apropriado
- ✅ **SEMPRE** invalidar cache quando necessário
- ✅ **SEMPRE** usar `cacheUtils` para operações

#### **4. Validação**:
- ✅ **SEMPRE** usar `validationUtils`
- ✅ **SEMPRE** validar em múltiplas camadas
- ✅ **SEMPRE** sanitizar dados de entrada
- ✅ **SEMPRE** retornar erros detalhados

#### **5. Logging**:
- ✅ **SEMPRE** usar `auditLogger` para operações importantes
- ✅ **SEMPRE** logar erros com contexto
- ✅ **SEMPRE** incluir informações do usuário
- ✅ **SEMPRE** usar níveis de log apropriados

### **❌ PROIBIDO**:

#### **1. Hardcoding**:
```typescript
// ❌ PROIBIDO: Valores hardcoded
const maxUsers = 100
const timeout = 5000
const apiUrl = 'http://localhost:3000'
```

#### **2. Código Não Tipado**:
```typescript
// ❌ PROIBIDO: Código não tipado
function processData(data) {
  return data.map(item => item.name)
}
```

#### **3. Logs Inseguros**:
```typescript
// ❌ PROIBIDO: Logs com dados sensíveis
console.log('User data:', { password: user.password, token: user.token })
```

## 🚨 **PROCESSO DE VALIDAÇÃO**

### **1. Code Review**:
- [ ] **Arquitetura**: Respeita separação de camadas?
- [ ] **Tipagem**: Usa TypeScript corretamente?
- [ ] **Configuração**: Usa constantes centralizadas?
- [ ] **Validação**: Valida dados adequadamente?
- [ ] **Logging**: Loga operações importantes?
- [ ] **Cache**: Usa sistema de cache?
- [ ] **Segurança**: Implementa autenticação/autorização?

### **2. Testes Automatizados**:
- [ ] **Unit Tests**: Testa cada função isoladamente?
- [ ] **Integration Tests**: Testa comunicação entre camadas?
- [ ] **E2E Tests**: Testa fluxos completos?
- [ ] **Security Tests**: Testa vulnerabilidades?

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

## 📋 **Checklist de Desenvolvimento**

### **Antes de começar**:
- [ ] **Entendi** a arquitetura desacoplada?
- [ ] **Identifiquei** em qual camada trabalhar?
- [ ] **Defini** as interfaces necessárias?
- [ ] **Planejei** os fluxos de comunicação?

### **Durante o desenvolvimento**:
- [ ] **Sigo** as regras da camada?
- [ ] **Uso** TypeScript com tipagem forte?
- [ ] **Valido** dados adequadamente?
- [ ] **Loggo** operações importantes?

### **Antes de finalizar**:
- [ ] **Testei** a funcionalidade?
- [ ] **Validei** a arquitetura?
- [ ] **Documentei** o código?
- [ ] **Revisei** as regras?

## 🚨 **Consequências de Violações**

### **Violações Leves**:
- ⚠️ **Warning** no code review
- 📝 **Sugestão** de correção
- 🔄 **Refatoração** obrigatória

### **Violações Graves**:
- ❌ **Rejeição** do código
- 🚫 **Bloqueio** do merge
- 📚 **Treinamento** obrigatório

### **Violações Críticas**:
- 🚨 **Revisão** de arquitetura
- 🔒 **Suspensão** de desenvolvimento
- 📋 **Replanejamento** completo

## 📚 **Recursos de Apoio**

- [📁 Separação de Camadas](./SEPARACAO_CAMADAS.md)
- [🔄 Fluxos de Comunicação](./FLUXOS_COMUNICACAO.md)
- [🎯 Padrões de Código](./PADROES_CODIGO.md)
- [🧪 Guia de Testes](./GUIA_TESTES.md)
- [📖 Exemplos Práticos](./EXEMPLOS_PRATICOS.md)

---

**⚠️ IMPORTANTE**: Estas regras são **OBRIGATÓRIAS** e devem ser seguidas em **TODOS** os desenvolvimentos futuros. **Violações resultarão em rejeição do código**.

**Última atualização**: $(date)
**Versão**: 1.0.0
**Status**: ✅ Implementado e Funcionando






