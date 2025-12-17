# 🏛️ Separação de Camadas - Net Imobiliária

## 📋 Visão Geral

A aplicação Net Imobiliária implementa uma **separação rigorosa de camadas** seguindo os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**.

## 🎯 Princípios Fundamentais

### **1. Single Responsibility Principle (SRP)**
Cada camada tem **uma única responsabilidade** bem definida.

### **2. Dependency Inversion Principle (DIP)**
Camadas superiores **não dependem** de camadas inferiores diretamente.

### **3. Interface Segregation Principle (ISP)**
Cada camada expõe apenas as **interfaces necessárias**.

## 🏗️ Estrutura das Camadas

## 1️⃣ **FRONTEND LAYER** (Camada de Apresentação)

### **Localização**: `src/app/`, `src/components/`, `src/hooks/`

### **Responsabilidades**:
- ✅ **Renderização de UI** e interação com usuário
- ✅ **Gerenciamento de estado** local e global
- ✅ **Validação de formulários** no cliente
- ✅ **Navegação** e roteamento
- ✅ **Feedback visual** e UX

### **Estrutura**:
```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Páginas administrativas
│   ├── (with-header)/     # Layouts públicos
│   └── api/               # ❌ NÃO PERTENCE AQUI (é Backend)
├── components/            # Componentes React reutilizáveis
│   ├── admin/            # Componentes específicos do admin
│   ├── Header.tsx        # Componentes gerais
│   └── PropertyCard.tsx  # Componentes de domínio
└── hooks/                # Custom hooks para lógica de estado
    ├── useAuth.tsx       # Hook de autenticação
    ├── usePermissions.tsx # Hook de permissões
    └── useImageUpload.ts  # Hook de upload
```

### **Regras Obrigatórias**:
- ❌ **NUNCA** acessar banco de dados diretamente
- ❌ **NUNCA** conter lógica de negócio complexa
- ✅ **SEMPRE** usar hooks para lógica de estado
- ✅ **SEMPRE** validar dados antes de enviar para API
- ✅ **SEMPRE** tratar erros de forma user-friendly

### **Exemplo de Componente Válido**:
```typescript
// ✅ CORRETO: Componente puro com responsabilidades claras
export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Hook para lógica de estado
  const { fetchUsers } = useUsers()
  
  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false))
  }, [])
  
  if (loading) return <LoadingSpinner />
  
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

## 2️⃣ **MIDDLEWARE LAYER** (Camada de Interceptação)

### **Localização**: `src/middleware.ts`, `src/lib/middleware/`

### **Responsabilidades**:
- ✅ **Autenticação** e autorização
- ✅ **Interceptação** de requisições
- ✅ **Rate limiting** e segurança
- ✅ **Logging** e auditoria
- ✅ **Transformação** de dados

### **Estrutura**:
```
src/
├── middleware.ts                    # Middleware principal Next.js
└── lib/middleware/
    ├── apiAuth.ts                  # Autenticação de APIs
    ├── permissionMiddleware.ts     # Controle de permissões
    └── rateLimit.ts               # Rate limiting
```

### **Regras Obrigatórias**:
- ❌ **NUNCA** conter lógica de negócio
- ❌ **NUNCA** acessar banco de dados diretamente
- ✅ **SEMPRE** ser stateless e reutilizável
- ✅ **SEMPRE** retornar respostas padronizadas
- ✅ **SEMPRE** logar ações importantes

### **Exemplo de Middleware Válido**:
```typescript
// ✅ CORRETO: Middleware focado em interceptação
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar autenticação
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('accessToken')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    // Verificar permissões
    const hasPermission = await checkPermission(token, pathname)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  }

  return NextResponse.next()
}
```

## 3️⃣ **BACKEND LAYER** (Camada de API)

### **Localização**: `src/app/api/`

### **Responsabilidades**:
- ✅ **Lógica de negócio** e regras de domínio
- ✅ **Validação** de dados de entrada
- ✅ **Orquestração** de operações
- ✅ **Tratamento de erros** padronizado
- ✅ **Respostas** estruturadas

### **Estrutura**:
```
src/app/api/admin/
├── auth/                    # Autenticação
│   ├── login/route.ts      # Login de usuários
│   ├── logout/route.ts     # Logout de usuários
│   └── me/route.ts         # Dados do usuário atual
├── usuarios/               # CRUD de usuários
│   ├── route.ts           # GET, POST
│   └── [id]/route.ts      # GET, PUT, DELETE
├── imoveis/               # CRUD de imóveis
│   ├── route.ts           # Listagem
│   ├── [id]/route.ts      # Operações por ID
│   └── stats/route.ts     # Estatísticas
└── proximidades/          # CRUD de proximidades
    ├── route.ts           # Listagem
    └── [slug]/route.ts    # Operações por slug
```

### **Regras Obrigatórias**:
- ❌ **NUNCA** conter lógica de UI
- ❌ **NUNCA** acessar banco diretamente (usar camada de dados)
- ✅ **SEMPRE** validar dados de entrada
- ✅ **SEMPRE** usar middlewares de autenticação
- ✅ **SEMPRE** retornar respostas padronizadas
- ✅ **SEMPRE** logar operações importantes

### **Exemplo de API Válida**:
```typescript
// ✅ CORRETO: API com responsabilidades bem definidas
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck

    // 2. Validar dados de entrada
    const data = await request.json()
    const validation = validateUserData(data)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    // 3. Executar lógica de negócio
    const newUser = await createUser(data)

    // 4. Log de auditoria
    auditLogger.log('USER_CREATE', 'Usuário criado', true, newUser.id)

    // 5. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Usuário criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    // 6. Tratamento de erros
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

## 4️⃣ **DATABASE LAYER** (Camada de Dados)

### **Localização**: `src/lib/database/`

### **Responsabilidades**:
- ✅ **Persistência** de dados
- ✅ **Queries** otimizadas
- ✅ **Transações** e consistência
- ✅ **Pool de conexões**
- ✅ **Mapeamento** objeto-relacional

### **Estrutura**:
```
src/lib/database/
├── connection.ts          # Pool de conexões PostgreSQL
├── users.ts              # Queries de usuários
├── imoveis.ts            # Queries de imóveis
├── proximidades.ts       # Queries de proximidades
├── amenidades.ts         # Queries de amenidades
└── audit.ts              # Queries de auditoria
```

### **Regras Obrigatórias**:
- ❌ **NUNCA** conter lógica de negócio
- ❌ **NUNCA** ser chamado diretamente pelo frontend
- ✅ **SEMPRE** usar prepared statements
- ✅ **SEMPRE** tratar transações adequadamente
- ✅ **SEMPRE** retornar dados tipados
- ✅ **SEMPRE** otimizar queries

### **Exemplo de Query Válida**:
```typescript
// ✅ CORRETO: Query focada em persistência
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

## 🔄 **Comunicação Entre Camadas**

### **Fluxo Permitido**:
```
Frontend → Middleware → Backend → Database
    ↑         ↑          ↑         ↑
   UI      Auth/      Business   Persistence
          Perms       Logic      Layer
```

### **Fluxo Proibido**:
```
Frontend ❌→ Database  (Bypass do backend)
Frontend ❌→ Backend   (Bypass do middleware)
Middleware ❌→ Database (Bypass do backend)
```

## 📋 **Checklist de Validação**

### **Para cada nova funcionalidade, verificar**:

#### **Frontend**:
- [ ] Componente é puro e reutilizável?
- [ ] Usa hooks para lógica de estado?
- [ ] Valida dados antes de enviar?
- [ ] Trata erros de forma user-friendly?
- [ ] Não acessa banco diretamente?

#### **Middleware**:
- [ ] É stateless e reutilizável?
- [ ] Não contém lógica de negócio?
- [ ] Retorna respostas padronizadas?
- [ ] Loga ações importantes?
- [ ] Não acessa banco diretamente?

#### **Backend**:
- [ ] Valida dados de entrada?
- [ ] Usa middlewares de autenticação?
- [ ] Retorna respostas padronizadas?
- [ ] Loga operações importantes?
- [ ] Não acessa banco diretamente?

#### **Database**:
- [ ] Usa prepared statements?
- [ ] Trata transações adequadamente?
- [ ] Retorna dados tipados?
- [ ] Otimiza queries?
- [ ] Não contém lógica de negócio?

## 🚨 **Violações Comuns**

### **❌ Frontend acessando banco diretamente**:
```typescript
// ❌ ERRADO: Frontend acessando banco
const users = await pool.query('SELECT * FROM users')
```

### **❌ Backend sem validação**:
```typescript
// ❌ ERRADO: Backend sem validação
export async function POST(request: NextRequest) {
  const data = await request.json()
  const user = await createUser(data) // Sem validação!
  return NextResponse.json(user)
}
```

### **❌ Middleware com lógica de negócio**:
```typescript
// ❌ ERRADO: Middleware com lógica de negócio
export async function middleware(request: NextRequest) {
  const user = await findUserByToken(token)
  if (user.role === 'admin') {
    // Lógica de negócio no middleware!
  }
}
```

## 📚 **Próximos Passos**

1. **Implementar testes** para cada camada
2. **Adicionar monitoramento** de performance
3. **Documentar APIs** com OpenAPI
4. **Implementar cache** entre camadas
5. **Adicionar validação** de arquitetura no CI/CD

---

**Última atualização**: $(date)
**Versão**: 1.0.0
**Status**: ✅ Implementado e Funcionando






