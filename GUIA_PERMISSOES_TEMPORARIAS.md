ago# ⏰ GUIA COMPLETO: PERMISSÕES TEMPORÁRIAS (expires_at)

**Sistema Net Imobiliária**  
**Versão:** 1.0  
**Data:** 2025-10-09

---

## 📑 ÍNDICE

1. [O que é expires_at](#o-que-é-expires_at)
2. [Quando usar](#quando-usar)
3. [Interface de Gerenciamento](#interface-de-gerenciamento)
4. [Lógica de Funcionamento](#lógica-de-funcionamento)
5. [Fluxos Automáticos](#fluxos-automáticos)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Implementação Técnica](#implementação-técnica)

---

## 🎯 O QUE É expires_at

### Definição

`expires_at` é um campo da tabela `user_permissions` que define quando uma permissão direta **expira automaticamente**.

### Conceito

```
┌─────────────────────────────────────────────────────────┐
│              PERMISSÕES TEMPORÁRIAS                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  expires_at = NULL                                     │
│  ✅ Permissão PERMANENTE                                │
│  → Não expira nunca                                     │
│  → Válida até ser removida manualmente                  │
│                                                         │
│  expires_at = 2025-11-09 23:59:59                      │
│  ⏰ Permissão TEMPORÁRIA                                │
│  → Expira em 09/11/2025 às 23:59:59                    │
│  → Após essa data, não tem mais efeito                  │
│  → Sistema ignora automaticamente                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 QUANDO USAR

### Permissão PERMANENTE (expires_at = NULL)

**Casos:**
- ✅ Permissões padrão do usuário
- ✅ Acesso contínuo a funcionalidades
- ✅ Sem prazo definido
- ✅ Maioria dos casos

**Exemplo:**
```
Usuário: João (Corretor)
Permissão: Exportar relatórios
expires_at: NULL
Motivo: João sempre precisa exportar relatórios
```

### Permissão TEMPORÁRIA (expires_at = data futura)

**Casos:**
- ⏰ Acesso por tempo limitado
- 🧪 Permissões de teste
- 🔄 Substituições temporárias
- 🚨 Acessos excepcionais

**Exemplos:**

**1. Projeto Especial:**
```
Usuário: Maria (Corretora)
Permissão: Editar contratos
expires_at: 2025-12-31 23:59:59
Motivo: "Projeto especial de fim de ano - migração de contratos"
```

**2. Substituição:**
```
Usuário: Pedro (Assistente)
Permissão: Aprovar imóveis
expires_at: 2025-10-20 23:59:59
Motivo: "Substituindo gerente durante férias (10-30/10)"
```

**3. Teste:**
```
Usuário: Ana (Nova funcionária)
Permissão: Deletar clientes
expires_at: 2025-10-16 23:59:59
Motivo: "Período de treinamento - 7 dias"
```

---

## 🖥️ INTERFACE DE GERENCIAMENTO

### 1. Modal de Permissão Direta

**Localização:** `/admin/usuarios` → Editar Usuário → "Adicionar Permissão Direta"

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  ➕ Adicionar Permissão Direta para: João Silva   [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Funcionalidade *                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Gestão de Contratos                        ▼     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Permissão *                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ☑️ Listar contratos                               │ │
│  │ ☑️ Criar contratos                                │ │
│  │ ☑️ Editar contratos                               │ │
│  │ ☐ Excluir contratos                               │ │
│  │ ☑️ Exportar contratos                             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Tipo de Permissão                                     │
│  ◉ Permanente (sem expiração)                          │
│  ○ Temporária (com data de expiração)                  │
│                                                         │
│  ┌─ Configurações de Permissão Temporária ──────────┐ │
│  │  (Aparece quando "Temporária" é selecionado)     │ │
│  │                                                    │ │
│  │  Data de Expiração *                              │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ 📅 09/11/2025    🕐 23:59              ▼    │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  Duração Rápida:                                  │ │
│  │  [+7 dias] [+15 dias] [+30 dias] [+90 dias]      │ │
│  │                                                    │ │
│  │  ⏰ A permissão expirará em: 30 dias              │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Motivo/Justificativa *                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Projeto especial de migração de contratos -      │ │
│  │ necessita acesso temporário por 30 dias           │ │
│  └───────────────────────────────────────────────────┘ │
│  ℹ️ Obrigatório para permissões temporárias           │
│                                                         │
│  ☑️ Notificar usuário por email                        │
│  ☑️ Notificar 3 dias antes da expiração                │
│                                                         │
│  [Cancelar]                           [✅ Conceder]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Visualização de Permissões do Usuário

**Localização:** `/admin/usuarios/[id]/permissoes`

```
┌─────────────────────────────────────────────────────────┐
│  👤 Permissões de: João Silva                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ━━━ PERMISSÕES DO PERFIL (Herdadas) ━━━               │
│                                                         │
│  📋 Corretor (Level 10)                                │
│  ✅ Listar imóveis                                      │
│  ✅ Criar imóveis                                       │
│  ✅ Listar clientes                                     │
│                                                         │
│  ━━━ PERMISSÕES DIRETAS (Individuais) ━━━              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ✅ Exportar relatórios                            │ │
│  │    Origem: Direta                                 │ │
│  │    Concedida por: Admin (08/10/2025)             │ │
│  │    Tipo: ✅ PERMANENTE                            │ │
│  │    [🗑️ Revogar]                                    │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ ⏰ Editar contratos                               │ │
│  │    Origem: Direta                                 │ │
│  │    Concedida por: Super Admin (09/10/2025)       │ │
│  │    Tipo: ⏰ TEMPORÁRIA                            │ │
│  │    Expira em: 09/11/2025 23:59                   │ │
│  │    ⏰ Faltam 30 dias                              │ │
│  │    Motivo: Projeto migração contratos            │ │
│  │    [🔄 Renovar] [🗑️ Revogar]                       │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ 🔴 Deletar clientes                               │ │
│  │    Origem: Direta                                 │ │
│  │    Concedida por: Super Admin (01/10/2025)       │ │
│  │    Tipo: ⏰ TEMPORÁRIA                            │ │
│  │    ❌ EXPIRADA em 08/10/2025                      │ │
│  │    Motivo: Limpeza de base - 7 dias              │ │
│  │    [🔄 Renovar] [🗑️ Remover]                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [+ Adicionar Permissão Direta]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ LÓGICA DE FUNCIONAMENTO

### 1. Ao Buscar Permissões do Usuário

```sql
-- Query que o sistema executa
SELECT 
  p.id,
  p.action,
  sf.category
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE up.user_id = 'uuid-do-usuario'
  AND (
    up.expires_at IS NULL           -- Permanente
    OR up.expires_at > NOW()         -- Ou não expirou ainda
  )
```

**Lógica:**
```
1. Busca permissões diretas do usuário
2. Para cada permissão, verifica:
   
   if (expires_at === NULL) {
     ✅ Permissão válida (permanente)
   } else if (expires_at > NOW()) {
     ✅ Permissão válida (ainda não expirou)
   } else {
     ❌ Permissão expirada (ignorar)
   }
```

### 2. Ao Verificar Autorização

```typescript
// src/lib/database/userPermissions.ts

async function getUserPermissions(userId: string) {
  // Buscar permissões diretas
  const directPermissions = await pool.query(`
    SELECT 
      sf.category as resource,
      p.action as permission_level
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE up.user_id = $1
      AND up.expires_at IS NULL OR up.expires_at > NOW()
      -- ↑ Ignora automaticamente permissões expiradas
  `, [userId])
  
  return directPermissions.rows
}
```

### 3. Job de Limpeza Automática (Recomendado)

```sql
-- Executar diariamente (cron job ou scheduled task)
DELETE FROM user_permissions
WHERE expires_at < NOW() - INTERVAL '30 days'
  -- Remove permissões expiradas há mais de 30 dias
  -- (mantém histórico por 30 dias para auditoria)
```

---

## 🔄 FLUXOS AUTOMÁTICOS

### Fluxo 1: Permissão Temporária Criada

```
┌─────────────────────────────────────────────────────────┐
│  1. Admin concede permissão temporária                 │
│     ├─ Usuário: João                                   │
│     ├─ Permissão: Editar contratos                     │
│     ├─ expires_at: 2025-11-09 23:59:59                │
│     └─ Motivo: Projeto especial                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. Sistema salva no banco                             │
│     INSERT INTO user_permissions (                      │
│       user_id,                                          │
│       permission_id,                                    │
│       granted_by,                                       │
│       expires_at,        ← DATA FUTURA                 │
│       granted_at                                        │
│     )                                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. Sistema envia email de notificação (opcional)      │
│     Para: joao@example.com                             │
│     Assunto: Nova permissão concedida                  │
│     Conteúdo:                                           │
│     "Você recebeu permissão para 'Editar contratos'    │
│      Válida até: 09/11/2025                            │
│      Concedida por: Admin"                             │
└─────────────────────────────────────────────────────────┘
```

### Fluxo 2: Durante o Uso

```
┌─────────────────────────────────────────────────────────┐
│  HOJE: 20/10/2025                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  João faz login                                        │
│  └─ Sistema busca permissões:                          │
│                                                         │
│     SELECT * FROM user_permissions                     │
│     WHERE user_id = 'joao'                             │
│       AND (expires_at IS NULL                          │
│            OR expires_at > '2025-10-20')               │
│                                                         │
│     Resultado:                                          │
│     ✅ Editar contratos (expira em 09/11)              │
│     ✅ Exportar relatórios (permanente)                │
│                                                         │
│  João vê as opções na interface                        │
│  └─ ✅ Pode editar contratos                            │
│  └─ ✅ Pode exportar relatórios                         │
└─────────────────────────────────────────────────────────┘
```

### Fluxo 3: Após Expiração

```
┌─────────────────────────────────────────────────────────┐
│  HOJE: 10/11/2025 (após expiração)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  João faz login                                        │
│  └─ Sistema busca permissões:                          │
│                                                         │
│     SELECT * FROM user_permissions                     │
│     WHERE user_id = 'joao'                             │
│       AND (expires_at IS NULL                          │
│            OR expires_at > '2025-11-10')               │
│                                                         │
│     Resultado:                                          │
│     ❌ Editar contratos (expirou!)                     │
│     ✅ Exportar relatórios (permanente)                │
│                                                         │
│  João vê as opções na interface                        │
│  └─ ❌ NÃO pode mais editar contratos                   │
│  └─ ✅ Ainda pode exportar relatórios                   │
└─────────────────────────────────────────────────────────┘
```

### Fluxo 4: Notificação Antes da Expiração

```
┌─────────────────────────────────────────────────────────┐
│  CRON JOB DIÁRIO (03:00 AM)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Sistema verifica permissões que expiram em breve   │
│                                                         │
│     SELECT                                              │
│       u.email,                                          │
│       u.nome,                                           │
│       p.action,                                         │
│       sf.name,                                          │
│       up.expires_at                                     │
│     FROM user_permissions up                           │
│     JOIN users u ON up.user_id = u.id                  │
│     WHERE up.expires_at BETWEEN NOW()                  │
│                             AND NOW() + INTERVAL '3 days'│
│                                                         │
│  2. Para cada permissão encontrada:                    │
│     └─ Envia email de aviso                            │
│                                                         │
│        Para: joao@example.com                          │
│        Assunto: ⚠️ Permissão expirando em breve        │
│        Conteúdo:                                        │
│        "Sua permissão para 'Editar contratos'          │
│         expira em 3 dias (09/11/2025).                 │
│         Se precisar continuar, solicite renovação."    │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTAÇÃO TÉCNICA

### 1. Componente React: Modal de Permissão Direta

```typescript
// src/components/admin/GrantDirectPermissionModal.tsx
'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'

interface Props {
  userId: string
  userName: string
  onClose: () => void
  onSuccess: () => void
}

export default function GrantDirectPermissionModal({ 
  userId, 
  userName, 
  onClose, 
  onSuccess 
}: Props) {
  const [form, setForm] = useState({
    permissionIds: [] as number[],
    type: 'permanent', // 'permanent' ou 'temporary'
    expiresAt: '',
    reason: ''
  })
  const [errors, setErrors] = useState<any>({})
  const { post } = useApi()

  const handleTypeChange = (type: 'permanent' | 'temporary') => {
    setForm({ ...form, type, expiresAt: type === 'permanent' ? '' : form.expiresAt })
  }

  const handleQuickDuration = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(23, 59, 59, 999)
    setForm({ ...form, expiresAt: date.toISOString().slice(0, 16) })
  }

  const validateForm = () => {
    const newErrors: any = {}

    if (form.permissionIds.length === 0) {
      newErrors.permissions = 'Selecione pelo menos uma permissão'
    }

    if (form.type === 'temporary') {
      if (!form.expiresAt) {
        newErrors.expiresAt = 'Data de expiração é obrigatória'
      } else {
        const expirationDate = new Date(form.expiresAt)
        const now = new Date()
        
        if (expirationDate <= now) {
          newErrors.expiresAt = 'Data deve ser no futuro'
        }
      }
      
      if (!form.reason.trim()) {
        newErrors.reason = 'Motivo é obrigatório para permissões temporárias'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const payload = {
        userId,
        permissionIds: form.permissionIds,
        expiresAt: form.type === 'temporary' ? form.expiresAt : null,
        reason: form.reason || null
      }

      const response = await post('/api/admin/user-permissions', payload)

      if (response.ok) {
        alert('Permissão concedida com sucesso!')
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao conceder permissão')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao conceder permissão')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold mb-4">
          ➕ Adicionar Permissão Direta para: {userName}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Seleção de permissões */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Permissões *
            </label>
            {/* Lista de checkboxes com permissões disponíveis */}
          </div>

          {/* Tipo de permissão */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Tipo de Permissão
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={form.type === 'permanent'}
                  onChange={() => handleTypeChange('permanent')}
                  className="mr-2"
                />
                <span>Permanente (sem expiração)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={form.type === 'temporary'}
                  onChange={() => handleTypeChange('temporary')}
                  className="mr-2"
                />
                <span>Temporária (com data de expiração)</span>
              </label>
            </div>
          </div>

          {/* Configurações temporárias */}
          {form.type === 'temporary' && (
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 mb-4">
              <h3 className="font-medium mb-3">⏰ Configurações de Permissão Temporária</h3>
              
              {/* Data de expiração */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">
                  Data de Expiração *
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.expiresAt && (
                  <p className="text-red-500 text-sm mt-1">{errors.expiresAt}</p>
                )}
              </div>

              {/* Botões de duração rápida */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">
                  Duração Rápida:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(7)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +7 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(15)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +15 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(30)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +30 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(90)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +90 dias
                  </button>
                </div>
              </div>

              {/* Motivo */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">
                  Motivo/Justificativa *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Ex: Projeto especial de migração - necessita acesso por 30 dias"
                />
                {errors.reason && (
                  <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Obrigatório para permissões temporárias (auditoria)
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              ✅ Conceder Permissão
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### 2. API Route: Conceder Permissão Direta

```typescript
// src/app/api/admin/user-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { checkPermission } from '@/lib/middleware/permissionMiddleware'

export async function POST(request: NextRequest) {
  try {
    // Verificar se tem permissão para gerenciar usuários
    const hasPermission = await checkPermission(request, 'usuarios', 'ADMIN')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para conceder permissões diretas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, permissionIds, expiresAt, reason } = body

    // Validação
    if (!userId || !permissionIds || permissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Se temporária, validar expires_at e reason
    if (expiresAt) {
      const expirationDate = new Date(expiresAt)
      const now = new Date()
      
      if (expirationDate <= now) {
        return NextResponse.json(
          { error: 'Data de expiração deve ser no futuro' },
          { status: 400 }
        )
      }
      
      if (!reason || reason.trim() === '') {
        return NextResponse.json(
          { error: 'Motivo é obrigatório para permissões temporárias' },
          { status: 400 }
        )
      }
    }

    // Extrair userId do admin que está concedendo
    const grantedBy = request.userId // Do middleware de auth

    // Inserir permissões
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      for (const permissionId of permissionIds) {
        await client.query(`
          INSERT INTO user_permissions (
            user_id,
            permission_id,
            granted_by,
            expires_at,
            granted_at
          )
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (user_id, permission_id) DO UPDATE
          SET 
            expires_at = $4,
            granted_by = $3,
            granted_at = NOW()
        `, [userId, permissionId, grantedBy, expiresAt || null])
      }
      
      await client.query('COMMIT')
      
      // Enviar email de notificação (opcional)
      if (expiresAt) {
        // TODO: Implementar envio de email
        // await sendPermissionGrantedEmail(userId, permissionIds, expiresAt)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Permissão concedida com sucesso'
      }, { status: 201 })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erro ao conceder permissão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

### 3. Job de Limpeza Automática

```javascript
// src/jobs/cleanExpiredPermissions.js
const { Pool } = require('pg');

const pool = new Pool({
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function cleanExpiredPermissions() {
  try {
    console.log('🧹 Limpando permissões expiradas...');

    // Deletar permissões expiradas há mais de 30 dias
    const result = await pool.query(`
      DELETE FROM user_permissions
      WHERE expires_at < NOW() - INTERVAL '30 days'
      RETURNING id, user_id, expires_at
    `);

    if (result.rows.length > 0) {
      console.log(`✅ ${result.rows.length} permissões expiradas removidas`);
      
      // Registrar em audit_log
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO audit_log (
            action,
            resource_type,
            resource_id,
            details
          )
          VALUES (
            'AUTO_CLEANUP',
            'user_permissions',
            $1,
            $2
          )
        `, [
          row.id,
          JSON.stringify({
            user_id: row.user_id,
            expired_at: row.expires_at,
            removed_at: new Date()
          })
        ]);
      }
    } else {
      console.log('ℹ️ Nenhuma permissão expirada para remover');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

// Executar
cleanExpiredPermissions();
```

### 4. Cron Job (Windows Task Scheduler)

```powershell
# clean-expired-permissions.ps1
cd C:\NetImobiliária\net-imobiliaria
node src/jobs/cleanExpiredPermissions.js
```

**Configurar no Task Scheduler:**
- **Trigger:** Diário às 03:00 AM
- **Action:** PowerShell script acima
- **Executar mesmo se usuário não estiver logado**

---

## 📊 EXEMPLOS PRÁTICOS

### Exemplo 1: Permissão Permanente

```sql
-- Conceder permissão PERMANENTE
INSERT INTO user_permissions (
  user_id,
  permission_id,
  granted_by,
  expires_at,        -- NULL = permanente
  granted_at
)
VALUES (
  'uuid-do-joao',
  45,                -- Exportar relatórios
  'uuid-do-admin',
  NULL,              -- ✅ PERMANENTE
  NOW()
);
```

### Exemplo 2: Permissão por 7 dias

```sql
-- Conceder permissão por 7 DIAS
INSERT INTO user_permissions (
  user_id,
  permission_id,
  granted_by,
  expires_at,                    -- Data futura
  granted_at
)
VALUES (
  'uuid-da-maria',
  52,                            -- Deletar imóveis
  'uuid-do-super-admin',
  NOW() + INTERVAL '7 days',     -- ⏰ Expira em 7 dias
  NOW()
);
```

### Exemplo 3: Renovar Permissão Expirada

```sql
-- Renovar permissão (estender prazo)
UPDATE user_permissions
SET 
  expires_at = NOW() + INTERVAL '30 days',  -- Novo prazo
  granted_by = 'uuid-do-admin',             -- Quem renovou
  granted_at = NOW()                        -- Data da renovação
WHERE user_id = 'uuid-do-joao'
  AND permission_id = 52;
```

---

## 📝 REGRAS DE NEGÓCIO

### Validações Obrigatórias

1. **Se expires_at for preenchido:**
   - ✅ Data deve ser no FUTURO
   - ✅ Motivo (reason) é OBRIGATÓRIO
   - ✅ Sistema deve notificar usuário
   - ✅ Sistema deve avisar antes de expirar

2. **Se expires_at for NULL:**
   - ✅ Permissão é PERMANENTE
   - ℹ️ Motivo (reason) é OPCIONAL
   - ✅ Válida até ser revogada manualmente

3. **Ao buscar permissões:**
   - ✅ SEMPRE verificar: `expires_at IS NULL OR expires_at > NOW()`
   - ✅ Ignorar permissões expiradas automaticamente

4. **Limpeza automática:**
   - ✅ Executar diariamente (cron job)
   - ✅ Remover permissões expiradas há > 30 dias
   - ✅ Manter histórico por 30 dias para auditoria

---

## 🎯 RESUMO

### granted_by NULL

| Aspecto | Detalhes |
|---------|----------|
| **É problema?** | ⚠️ Sim (auditoria) |
| **Gravidade** | 🟡 Média |
| **Impacto técnico** | ✅ Nenhum |
| **Impacto auditoria** | ⚠️ Alto |
| **Foi corrigido?** | ✅ Sim (4 registros preenchidos) |

### expires_at NULL

| Aspecto | Detalhes |
|---------|----------|
| **É problema?** | ❌ Não |
| **É normal?** | ✅ Sim |
| **Significado** | Permissão permanente |
| **Ação necessária** | ✅ Nenhuma |
| **Quando preencher** | Apenas para temporárias |

---

**Documento criado em:** 2025-10-09  
**Versão:** 1.0
