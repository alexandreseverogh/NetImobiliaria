# 🛠️ IMPLEMENTAÇÃO TÉCNICA: NOVA FUNCIONALIDADE

**Guia passo a passo com código completo**

---

## 📋 ÍNDICE

1. [Passo 1: Banco de Dados](#passo-1-banco-de-dados)
2. [Passo 2: Backend (APIs)](#passo-2-backend)
3. [Passo 3: Frontend (Interface)](#passo-3-frontend)
4. [Passo 4: Sidebar](#passo-4-sidebar)
5. [Passo 5: Testes](#passo-5-testes)

---

## 📊 PASSO 1: BANCO DE DADOS

### 1.1. Criar Feature

```sql
-- Inserir nova funcionalidade
INSERT INTO system_features (name, category, description, url, is_active)
VALUES (
  'Gestão de Contratos',           -- Nome exibido
  'contratos',                      -- Identificador único
  'Gestão completa de contratos de locação e venda',
  '/admin/contratos',               -- URL da página
  true                              -- Ativa
)
RETURNING id;
-- Retorna: 72 (exemplo)
```

### 1.2. Criar Permissões

```sql
-- Permissões padrão
INSERT INTO permissions (feature_id, action, description)
VALUES
  (72, 'list', 'Listar contratos'),
  (72, 'create', 'Criar novos contratos'),
  (72, 'update', 'Editar contratos existentes'),
  (72, 'delete', 'Excluir contratos');

-- Permissões adicionais (opcional)
INSERT INTO permissions (feature_id, action, description)
VALUES
  (72, 'approve', 'Aprovar contratos'),
  (72, 'export', 'Exportar contratos para Excel/PDF'),
  (72, 'admin', 'Administração completa de contratos');
```

### 1.3. Atribuir ao Super Admin

```sql
-- Super Admin sempre tem acesso total
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'Super Admin'),
  p.id,
  (SELECT id FROM users WHERE username = 'admin')
FROM permissions p
WHERE p.feature_id = 72;
```

### 1.4. Atribuir a Outros Perfis

```sql
-- Admin: pode listar, criar e editar (mas não excluir)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'Admin'),
  p.id,
  (SELECT id FROM users WHERE username = 'admin')
FROM permissions p
WHERE p.feature_id = 72
  AND p.action IN ('list', 'create', 'update');

-- Corretor: pode apenas listar
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM user_roles WHERE name = 'Corretor'),
  p.id,
  (SELECT id FROM users WHERE username = 'admin')
FROM permissions p
WHERE p.feature_id = 72
  AND p.action = 'list';
```

### 1.5. Script Completo (Automatizado)

```javascript
// add-contratos-feature.js
const { Pool } = require('pg');

const pool = new Pool({
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function addContratosFeature() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Criar feature
    const featureResult = await client.query(`
      INSERT INTO system_features (name, category, description, url, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'Gestão de Contratos',
      'contratos',
      'Gestão completa de contratos de locação e venda',
      '/admin/contratos',
      true
    ]);
    
    const featureId = featureResult.rows[0].id;
    console.log(`✅ Feature criada: ID ${featureId}`);
    
    // 2. Criar permissões
    const permissions = [
      ['list', 'Listar contratos'],
      ['create', 'Criar novos contratos'],
      ['update', 'Editar contratos existentes'],
      ['delete', 'Excluir contratos'],
      ['approve', 'Aprovar contratos'],
      ['export', 'Exportar contratos']
    ];
    
    for (const [action, description] of permissions) {
      await client.query(`
        INSERT INTO permissions (feature_id, action, description)
        VALUES ($1, $2, $3)
      `, [featureId, action, description]);
    }
    
    console.log(`✅ ${permissions.length} permissões criadas`);
    
    // 3. Atribuir ao Super Admin (todas)
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_by)
      SELECT 
        (SELECT id FROM user_roles WHERE name = 'Super Admin'),
        p.id,
        (SELECT id FROM users WHERE username = 'admin')
      FROM permissions p
      WHERE p.feature_id = $1
    `, [featureId]);
    
    console.log('✅ Permissões atribuídas ao Super Admin');
    
    // 4. Atribuir ao Admin (exceto delete)
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_by)
      SELECT 
        (SELECT id FROM user_roles WHERE name = 'Admin'),
        p.id,
        (SELECT id FROM users WHERE username = 'admin')
      FROM permissions p
      WHERE p.feature_id = $1
        AND p.action IN ('list', 'create', 'update', 'approve', 'export')
    `, [featureId]);
    
    console.log('✅ Permissões atribuídas ao Admin');
    
    await client.query('COMMIT');
    console.log('\n🎉 Feature "Gestão de Contratos" adicionada com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addContratosFeature();
```

---

## 🔧 PASSO 2: BACKEND (APIs)

### 2.1. Criar API Route

```typescript
// src/app/api/admin/contratos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/middleware/permissionMiddleware'
import pool from '@/lib/database/connection'

// GET - Listar contratos
export async function GET(request: NextRequest) {
  try {
    // Verificar permissão
    const hasPermission = await checkPermission(request, 'contratos', 'READ')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para listar contratos' },
        { status: 403 }
      )
    }

    // Buscar contratos
    const result = await pool.query(`
      SELECT 
        id,
        numero_contrato,
        imovel_id,
        cliente_id,
        tipo,
        valor,
        data_inicio,
        data_fim,
        status,
        created_at
      FROM contratos
      WHERE ativo = true
      ORDER BY created_at DESC
    `)

    return NextResponse.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Erro ao listar contratos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar contrato
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão
    const hasPermission = await checkPermission(request, 'contratos', 'WRITE')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para criar contratos' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validar dados
    if (!body.numero_contrato || !body.imovel_id || !body.cliente_id) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Inserir contrato
    const result = await pool.query(`
      INSERT INTO contratos (
        numero_contrato,
        imovel_id,
        cliente_id,
        tipo,
        valor,
        data_inicio,
        data_fim,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      body.numero_contrato,
      body.imovel_id,
      body.cliente_id,
      body.tipo,
      body.valor,
      body.data_inicio,
      body.data_fim,
      'pendente',
      request.userId // Do middleware de auth
    ])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar contrato:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

### 2.2. Criar API para Item Específico

```typescript
// src/app/api/admin/contratos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkPermission } from '@/lib/middleware/permissionMiddleware'
import pool from '@/lib/database/connection'

// GET - Buscar contrato específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hasPermission = await checkPermission(request, 'contratos', 'READ')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      'SELECT * FROM contratos WHERE id = $1',
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contrato não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar contrato
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hasPermission = await checkPermission(request, 'contratos', 'WRITE')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para editar' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const result = await pool.query(`
      UPDATE contratos
      SET 
        numero_contrato = $1,
        valor = $2,
        status = $3,
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      body.numero_contrato,
      body.valor,
      body.status,
      request.userId,
      params.id
    ])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir contrato
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hasPermission = await checkPermission(request, 'contratos', 'DELETE')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para excluir' },
        { status: 403 }
      )
    }

    // Soft delete
    await pool.query(`
      UPDATE contratos
      SET ativo = false, updated_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [request.userId, params.id])

    return NextResponse.json({
      success: true,
      message: 'Contrato excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
```

---

## 🎨 PASSO 3: FRONTEND (INTERFACE)

### 3.1. Criar Página Principal

```typescript
// src/app/admin/contratos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Contrato {
  id: number
  numero_contrato: string
  tipo: string
  valor: number
  status: string
  created_at: string
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { get, del } = useApi()

  useEffect(() => {
    fetchContratos()
  }, [])

  const fetchContratos = async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/contratos')
      
      if (response.ok) {
        const data = await response.json()
        setContratos(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar contratos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este contrato?')) return

    try {
      const response = await del(`/api/admin/contratos/${id}`)
      
      if (response.ok) {
        alert('Contrato excluído com sucesso!')
        fetchContratos()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao excluir contrato')
    }
  }

  return (
    <PermissionGuard resource="contratos" permission="READ">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestão de Contratos</h1>
          
          <PermissionGuard resource="contratos" permission="WRITE">
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Novo Contrato
            </button>
          </PermissionGuard>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contratos.map((contrato) => (
                  <tr key={contrato.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contrato.numero_contrato}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contrato.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      R$ {contrato.valor.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        contrato.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        contrato.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contrato.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <PermissionGuard resource="contratos" permission="WRITE">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                        
                        <PermissionGuard resource="contratos" permission="DELETE">
                          <button
                            onClick={() => handleDelete(contrato.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
```

---

## 📱 PASSO 4: SIDEBAR

### 4.1. Adicionar Item ao Menu

```typescript
// src/components/admin/AdminSidebar.tsx
import { DocumentTextIcon } from '@heroicons/react/24/outline'

const getMenuStructure = (): MenuItem[] => {
  return [
    // ... outros itens ...
    
    {
      name: 'Contratos',
      icon: DocumentTextIcon,
      resource: 'contratos',
      roles: ['Super Admin', 'Administrador', 'Corretor'],
      children: [
        {
          name: 'Listar Contratos',
          href: '/admin/contratos',
          icon: DocumentTextIcon,
          resource: 'contratos',
          roles: ['Super Admin', 'Administrador', 'Corretor']
        },
        {
          name: 'Novo Contrato',
          href: '/admin/contratos/novo',
          icon: PlusIcon,
          resource: 'contratos',
          roles: ['Super Admin', 'Administrador']
        }
      ]
    },
    
    // ... outros itens ...
  ]
}
```

### 4.2. Como a Sidebar Filtra Automaticamente

```typescript
// Lógica interna da sidebar (já implementada)

// 1. Buscar permissões do usuário logado
const userPermissions = user.permissoes // Do JWT

// 2. Para cada item do menu:
const isVisible = (menuItem: MenuItem) => {
  // Verifica se usuário tem o perfil necessário
  const hasRole = menuItem.roles.includes(user.role_name)
  if (!hasRole) return false
  
  // Verifica se tem permissão para o recurso
  if (menuItem.resource) {
    const hasPermission = userPermissions[menuItem.resource]
    if (!hasPermission) return false
  }
  
  // Se tem filhos, verifica se pelo menos um é visível
  if (menuItem.children) {
    const visibleChildren = menuItem.children.filter(isVisible)
    return visibleChildren.length > 0
  }
  
  return true
}

// 3. Renderizar apenas itens visíveis
const visibleMenu = menuItems.filter(isVisible)
```

---

## 🔐 FLUXO DE AUTORIZAÇÃO POR PERFIL

### Cenário: Usuário "João" (Corretor) tenta acessar Contratos

```
┌─────────────────────────────────────────────────────────┐
│  1. João faz login                                     │
│     └─ Recebe JWT com permissões                       │
│        {                                                │
│          userId: "uuid-joao",                           │
│          role_name: "Corretor",                         │
│          role_level: 10,                                │
│          permissoes: {                                  │
│            "contratos": "READ"  ← TEM PERMISSÃO        │
│          }                                              │
│        }                                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. Sidebar é renderizada                              │
│     ├─ Verifica: role_name = "Corretor"?              │
│     │  └─ ✅ SIM, está na lista de roles permitidos    │
│     ├─ Verifica: tem permissão em "contratos"?        │
│     │  └─ ✅ SIM, tem "READ"                            │
│     └─ ✅ EXIBE "Contratos" na sidebar                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. João clica em "Contratos"                          │
│     └─ Navega para /admin/contratos                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. Página carrega                                     │
│     ├─ PermissionGuard verifica "READ" em "contratos" │
│     │  └─ ✅ TEM → Renderiza página                     │
│     ├─ Botão "Novo Contrato":                          │
│     │  └─ PermissionGuard verifica "WRITE"             │
│     │     └─ ❌ NÃO TEM → Botão não aparece             │
│     └─ Botão "Excluir":                                │
│        └─ PermissionGuard verifica "DELETE"            │
│           └─ ❌ NÃO TEM → Botão não aparece             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  5. João tenta listar contratos                        │
│     ├─ GET /api/admin/contratos                        │
│     ├─ Middleware verifica "READ" em "contratos"      │
│     │  └─ ✅ TEM                                         │
│     └─ ✅ Retorna lista de contratos                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  6. João tenta criar contrato (via API direta)        │
│     ├─ POST /api/admin/contratos                       │
│     ├─ Middleware verifica "WRITE" em "contratos"     │
│     │  └─ ❌ NÃO TEM                                     │
│     └─ ❌ 403 Forbidden                                 │
└─────────────────────────────────────────────────────────┘
```

### Comparação de Acesso por Perfil

| Ação | Super Admin | Admin | Corretor |
|------|-------------|-------|----------|
| **Ver na sidebar** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Listar contratos** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Criar contrato** | ✅ Sim | ✅ Sim | ❌ Não |
| **Editar contrato** | ✅ Sim | ✅ Sim | ❌ Não |
| **Excluir contrato** | ✅ Sim | ❌ Não | ❌ Não |
| **Aprovar contrato** | ✅ Sim | ✅ Sim | ❌ Não |
| **Exportar contratos** | ✅ Sim | ✅ Sim | ❌ Não |

---

## 🎯 INTERFACE DE GERENCIAMENTO

### Proposta: Página de Gerenciamento de Features

**Localização:** `/admin/system-features` (a ser criada)

```typescript
// src/app/admin/system-features/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import PermissionGuard from '@/components/admin/PermissionGuard'

export default function SystemFeaturesPage() {
  const [features, setFeatures] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { get, post } = useApi()

  const fetchFeatures = async () => {
    const response = await get('/api/admin/system-features')
    if (response.ok) {
      const data = await response.json()
      setFeatures(data.data)
    }
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  return (
    <PermissionGuard resource="sistema" permission="ADMIN">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Funcionalidades do Sistema</h1>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            + Nova Funcionalidade
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div key={feature.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold text-lg">{feature.name}</h3>
              <p className="text-sm text-gray-600">{feature.category}</p>
              <p className="text-sm text-gray-500 mt-2">{feature.description}</p>
              
              <div className="mt-4 flex gap-2">
                <button className="text-blue-600 text-sm">
                  🔑 Permissões ({feature.permissions_count})
                </button>
                <button className="text-green-600 text-sm">
                  👥 Perfis ({feature.roles_count})
                </button>
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <CreateFeatureModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchFeatures}
          />
        )}
      </div>
    </PermissionGuard>
  )
}
```

### Modal de Criação

```typescript
// src/components/admin/CreateFeatureModal.tsx
'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateFeatureModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    url: '',
    description: '',
    createDefaultPermissions: true,
    assignToSuperAdmin: true
  })
  const [errors, setErrors] = useState<any>({})
  const { post } = useApi()

  const validateForm = () => {
    const newErrors: any = {}

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!form.category.trim()) {
      newErrors.category = 'Category é obrigatório'
    } else if (!/^[a-z0-9-]+$/.test(form.category)) {
      newErrors.category = 'Apenas letras minúsculas, números e hífen'
    }

    if (!form.url.trim()) {
      newErrors.url = 'URL é obrigatória'
    } else if (!form.url.startsWith('/admin/')) {
      newErrors.url = 'URL deve começar com /admin/'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const response = await post('/api/admin/system-features', form)

      if (response.ok) {
        alert('Funcionalidade criada com sucesso!')
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao criar funcionalidade')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar funcionalidade')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Nova Funcionalidade</h2>

        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Funcionalidade *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Gestão de Contratos"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (identificador único) *
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value.toLowerCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: contratos"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas letras minúsculas, números e hífen (-)
            </p>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL da Página *
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: /admin/contratos"
            />
            {errors.url && (
              <p className="text-red-500 text-sm mt-1">{errors.url}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Descrição detalhada da funcionalidade"
            />
          </div>

          {/* Opções */}
          <div className="mb-4 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.createDefaultPermissions}
                onChange={(e) => setForm({ ...form, createDefaultPermissions: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">
                Criar permissões padrão (list, create, update, delete)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.assignToSuperAdmin}
                onChange={(e) => setForm({ ...form, assignToSuperAdmin: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">
                Atribuir automaticamente ao Super Admin
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              ✅ Criar Funcionalidade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## 🧪 PASSO 5: TESTES

### Script de Teste Completo

```javascript
// test-new-feature.js
const { Pool } = require('pg');

const pool = new Pool({
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testNewFeature() {
  console.log('🧪 Testando nova funcionalidade "Contratos"...\n');

  // 1. Verificar se feature foi criada
  const featureResult = await pool.query(`
    SELECT * FROM system_features WHERE category = 'contratos'
  `);
  
  console.log('1. Feature criada:', featureResult.rows.length > 0 ? '✅' : '❌');

  // 2. Verificar permissões
  const permissionsResult = await pool.query(`
    SELECT p.action, p.description
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf.category = 'contratos'
  `);
  
  console.log(`2. Permissões criadas: ${permissionsResult.rows.length} ✅`);
  permissionsResult.rows.forEach(p => {
    console.log(`   - ${p.action}: ${p.description}`);
  });

  // 3. Verificar atribuição ao Super Admin
  const superAdminResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf.category = 'contratos'
      AND rp.role_id = (SELECT id FROM user_roles WHERE name = 'Super Admin')
  `);
  
  console.log(`3. Atribuído ao Super Admin: ${superAdminResult.rows[0].count} permissões ✅`);

  // 4. Verificar acesso de outros perfis
  const roles = ['Admin', 'Corretor'];
  
  for (const roleName of roles) {
    const roleResult = await pool.query(`
      SELECT p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.category = 'contratos'
        AND rp.role_id = (SELECT id FROM user_roles WHERE name = $1)
    `, [roleName]);
    
    console.log(`4. Permissões do ${roleName}: ${roleResult.rows.map(r => r.action).join(', ') || 'nenhuma'}`);
  }

  await pool.end();
  console.log('\n✅ Testes concluídos!');
}

testNewFeature();
```

---

## 📝 RESUMO DO FLUXO

### Fluxo Simplificado

```
1. CRIAR FEATURE (Super Admin)
   └─ INSERT INTO system_features
   └─ INSERT INTO permissions (4x padrão)
   └─ INSERT INTO role_permissions (Super Admin)

2. ATRIBUIR A PERFIS (Super Admin/Admin)
   └─ Acessa /admin/roles/[id]/permissions
   └─ Seleciona permissões desejadas
   └─ Sistema verifica hierarquia
   └─ Se crítico, pede 2FA
   └─ INSERT INTO role_permissions

3. DESENVOLVER INTERFACE (Desenvolvedor)
   └─ Criar página /app/admin/[feature]/page.tsx
   └─ Criar API /api/admin/[feature]/route.ts
   └─ Adicionar item na sidebar
   └─ Adicionar PermissionGuard

4. USUÁRIO ACESSA (Usuário Final)
   └─ Faz login → recebe JWT com permissões
   └─ Sidebar filtra automaticamente
   └─ Vê apenas opções permitidas
   └─ Clica e acessa funcionalidade
   └─ API valida permissões
   └─ Interface mostra apenas ações permitidas
```

---

## 🔒 REGRAS DE SEGURANÇA

### Validações Obrigatórias

1. **Criação de Feature:**
   - ✅ Usuário deve ter level >= 50
   - ✅ Nome deve ser único
   - ✅ Category deve ser único
   - ✅ URL deve ser única
   - ✅ Registrar auditoria

2. **Atribuição de Permissões:**
   - ✅ Verificar hierarquia (solicitante > alvo)
   - ✅ Solicitar 2FA se operação crítica
   - ✅ Registrar granted_by
   - ✅ Invalidar cache de permissões

3. **Acesso à Feature:**
   - ✅ JWT válido
   - ✅ Usuário ativo
   - ✅ Permissão específica para ação
   - ✅ Rate limiting

---

## 💡 BOAS PRÁTICAS

### 1. Nomenclatura

**Category:**
- ✅ Use kebab-case: `gestao-contratos`
- ✅ Seja descritivo mas conciso
- ❌ Evite abreviações confusas

**Permissões:**
- ✅ Use verbos em inglês: `list`, `create`, `update`, `delete`
- ✅ Seja específico: `approve`, `export`, `publish`
- ❌ Evite nomes genéricos: `action1`, `perm2`

### 2. Hierarquia

- ✅ Use `parent_id` para sub-funcionalidades
- ✅ Exemplo: "Imóveis" (pai) > "Tipos de Imóveis" (filho)

### 3. Permissões

- ✅ Sempre crie pelo menos: `list`, `create`, `update`, `delete`
- ✅ Adicione permissões específicas conforme necessário
- ✅ Documente o que cada permissão permite

### 4. Auditoria

- ✅ Sempre preencha `granted_by`
- ✅ Use `reason` em permissões diretas
- ✅ Registre em audit_log

---

**Documento criado em:** 2025-10-09  
**Versão:** 1.0


