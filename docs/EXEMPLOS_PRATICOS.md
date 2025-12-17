# 📖 Exemplos Práticos de Implementação - Net Imobiliária

## 📋 Visão Geral

Este documento fornece **exemplos práticos e completos** de implementação seguindo a arquitetura desacoplada, padrões de código e regras estabelecidas.

## 🎯 Objetivo

Demonstrar como implementar funcionalidades **do zero** seguindo todos os padrões e regras estabelecidas, servindo como **guia prático** para desenvolvedores.

## 🏗️ **EXEMPLO COMPLETO: CRUD de Categorias de Amenidades**

Vamos implementar um CRUD completo de categorias de amenidades seguindo **todas** as regras e padrões estabelecidos.

## 1️⃣ **PASSO 1: Definir Tipos (Database Layer)**

### **Arquivo**: `src/lib/types/admin.ts`

```typescript
// ✅ CORRETO: Tipos bem definidos
export interface CategoriaAmenidade {
  id: string
  nome: string
  descricao?: string
  icone?: string
  cor?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateCategoriaAmenidadeData {
  nome: string
  descricao?: string
  icone?: string
  cor?: string
  ativo?: boolean
}

export interface UpdateCategoriaAmenidadeData {
  nome?: string
  descricao?: string
  icone?: string
  cor?: string
  ativo?: boolean
}

export interface CategoriaAmenidadeResponse extends ApiResponse<CategoriaAmenidade[]> {
  data: CategoriaAmenidade[]
  total: number
}
```

## 2️⃣ **PASSO 2: Implementar Queries (Database Layer)**

### **Arquivo**: `src/lib/database/categorias-amenidades.ts`

```typescript
// ✅ CORRETO: Queries seguindo padrões
import pool from './connection'
import { CategoriaAmenidade, CreateCategoriaAmenidadeData, UpdateCategoriaAmenidadeData } from '@/lib/types/admin'

// 1. Função para criar categoria
export async function createCategoriaAmenidade(
  data: CreateCategoriaAmenidadeData
): Promise<CategoriaAmenidade> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const result = await client.query(
      `INSERT INTO categorias_amenidades (nome, descricao, icone, cor, ativo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.nome,
        data.descricao || null,
        data.icone || null,
        data.cor || null,
        data.ativo ?? true
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

// 2. Função para buscar todas as categorias
export async function findCategoriasAmenidades(): Promise<CategoriaAmenidade[]> {
  const result = await pool.query(`
    SELECT 
      id,
      nome,
      descricao,
      icone,
      cor,
      ativo,
      created_at,
      updated_at
    FROM categorias_amenidades
    WHERE ativo = true
    ORDER BY nome
  `)
  
  return result.rows
}

// 3. Função para buscar categoria por ID
export async function findCategoriaAmenidadeById(id: string): Promise<CategoriaAmenidade | null> {
  const result = await pool.query(
    'SELECT * FROM categorias_amenidades WHERE id = $1',
    [id]
  )
  
  return result.rows[0] || null
}

// 4. Função para atualizar categoria
export async function updateCategoriaAmenidade(
  id: string,
  data: UpdateCategoriaAmenidadeData
): Promise<CategoriaAmenidade> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const result = await client.query(
      `UPDATE categorias_amenidades 
       SET nome = $1, descricao = $2, icone = $3, cor = $4, ativo = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        data.nome,
        data.descricao,
        data.icone,
        data.cor,
        data.ativo,
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

// 5. Função para deletar categoria
export async function deleteCategoriaAmenidade(id: string): Promise<void> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Verificar se há amenidades usando esta categoria
    const amenidadesResult = await client.query(
      'SELECT COUNT(*) as count FROM amenidades WHERE categoria_id = $1',
      [id]
    )
    
    if (parseInt(amenidadesResult.rows[0].count) > 0) {
      throw new Error('Não é possível excluir categoria que possui amenidades associadas')
    }
    
    await client.query(
      'DELETE FROM categorias_amenidades WHERE id = $1',
      [id]
    )
    
    await client.query('COMMIT')
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

## 3️⃣ **PASSO 3: Implementar API Routes (Backend Layer)**

### **Arquivo**: `src/app/api/admin/categorias-amenidades/route.ts`

```typescript
// ✅ CORRETO: API seguindo padrões
import { NextRequest, NextResponse } from 'next/server'
import { auditLogger } from '@/lib/utils/auditLogger'
import { validationUtils } from '@/lib/utils/validation'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { 
  createCategoriaAmenidade, 
  findCategoriasAmenidades 
} from '@/lib/database/categorias-amenidades'
import { 
  CategoriaAmenidade, 
  CreateCategoriaAmenidadeData, 
  ApiResponse 
} from '@/lib/types/admin'

// 1. Interface para dados de entrada
interface CreateCategoriaRequest {
  nome: string
  descricao?: string
  icone?: string
  cor?: string
  ativo?: boolean
}

// 2. Função de validação
function validateCreateData(data: CreateCategoriaRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.nome?.trim()) {
    errors.push('Nome é obrigatório')
  } else if (data.nome.length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres')
  } else if (data.nome.length > 100) {
    errors.push('Nome deve ter no máximo 100 caracteres')
  }
  
  if (data.descricao && data.descricao.length > 500) {
    errors.push('Descrição deve ter no máximo 500 caracteres')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 3. GET - Listar categorias
export async function GET(request: NextRequest) {
  try {
    // 3.1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 3.2. Buscar dados
    const categorias = await findCategoriasAmenidades()
    
    // 3.3. Log de auditoria
    auditLogger.log(
      'CATEGORIAS_AMENIDADES_LIST',
      'Usuário listou categorias de amenidades',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )
    
    // 3.4. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: categorias,
      total: categorias.length
    })
    
  } catch (error) {
    console.error('Erro ao listar categorias de amenidades:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// 4. POST - Criar categoria
export async function POST(request: NextRequest) {
  try {
    // 4.1. Verificar autenticação e permissões
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    // 4.2. Validar dados de entrada
    const data: CreateCategoriaRequest = await request.json()
    const validation = validateCreateData(data)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validation.errors
      }, { status: 400 })
    }
    
    // 4.3. Executar lógica de negócio
    const newCategoria = await createCategoriaAmenidade(data)
    
    // 4.4. Log de auditoria
    auditLogger.log(
      'CATEGORIA_AMENIDADE_CREATE',
      'Categoria de amenidade criada',
      true,
      newCategoria.id,
      newCategoria.nome,
      request.ip || 'unknown'
    )
    
    // 4.5. Retornar resposta padronizada
    return NextResponse.json({
      success: true,
      data: newCategoria,
      message: 'Categoria criada com sucesso'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar categoria de amenidade:', error)
    
    // 4.6. Tratamento de erros específicos
    if (error instanceof Error) {
      if (error.message.includes('já existe')) {
        return NextResponse.json({
          success: false,
          error: 'Nome da categoria já existe'
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

### **Arquivo**: `src/app/api/admin/categorias-amenidades/[id]/route.ts`

```typescript
// ✅ CORRETO: API para operações por ID
import { NextRequest, NextResponse } from 'next/server'
import { auditLogger } from '@/lib/utils/auditLogger'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { 
  findCategoriaAmenidadeById,
  updateCategoriaAmenidade,
  deleteCategoriaAmenidade
} from '@/lib/database/categorias-amenidades'
import { UpdateCategoriaAmenidadeData } from '@/lib/types/admin'

// 1. GET - Buscar categoria por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    const categoria = await findCategoriaAmenidadeById(params.id)
    
    if (!categoria) {
      return NextResponse.json({
        success: false,
        error: 'Categoria não encontrada'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: categoria
    })
    
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// 2. PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    const data: UpdateCategoriaAmenidadeData = await request.json()
    
    // Validar dados
    if (data.nome && data.nome.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Nome deve ter pelo menos 2 caracteres'
      }, { status: 400 })
    }
    
    const updatedCategoria = await updateCategoriaAmenidade(params.id, data)
    
    auditLogger.log(
      'CATEGORIA_AMENIDADE_UPDATE',
      'Categoria de amenidade atualizada',
      true,
      updatedCategoria.id,
      updatedCategoria.nome,
      request.ip || 'unknown'
    )
    
    return NextResponse.json({
      success: true,
      data: updatedCategoria,
      message: 'Categoria atualizada com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// 3. DELETE - Deletar categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await checkApiPermission(request)
    if (authCheck) return authCheck
    
    await deleteCategoriaAmenidade(params.id)
    
    auditLogger.log(
      'CATEGORIA_AMENIDADE_DELETE',
      'Categoria de amenidade excluída',
      true,
      params.id,
      'unknown',
      request.ip || 'unknown'
    )
    
    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('amenidades associadas')) {
        return NextResponse.json({
          success: false,
          error: 'Não é possível excluir categoria que possui amenidades associadas'
        }, { status: 400 })
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

## 4️⃣ **PASSO 4: Implementar Hook Customizado (Frontend Layer)**

### **Arquivo**: `src/hooks/useCategoriasAmenidades.ts`

```typescript
// ✅ CORRETO: Hook seguindo padrões
import { useState, useEffect, useCallback } from 'react'
import { CategoriaAmenidade, CreateCategoriaAmenidadeData, UpdateCategoriaAmenidadeData } from '@/lib/types/admin'
import { apiClient } from '@/lib/utils/apiClient'

// 1. Interface para retorno do hook
interface UseCategoriasAmenidadesReturn {
  categorias: CategoriaAmenidade[]
  loading: boolean
  error: string | null
  fetchCategorias: () => Promise<CategoriaAmenidade[]>
  createCategoria: (data: CreateCategoriaAmenidadeData) => Promise<CategoriaAmenidade>
  updateCategoria: (id: string, data: UpdateCategoriaAmenidadeData) => Promise<CategoriaAmenidade>
  deleteCategoria: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// 2. Hook principal
export function useCategoriasAmenidades(): UseCategoriasAmenidadesReturn {
  // 2.1. Estado local
  const [categorias, setCategorias] = useState<CategoriaAmenidade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 2.2. Função para buscar categorias
  const fetchCategorias = useCallback(async (): Promise<CategoriaAmenidade[]> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<CategoriaAmenidade[]>('/api/admin/categorias-amenidades', {
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutos
      })
      
      if (response.success && response.data) {
        setCategorias(response.data)
        return response.data
      }
      
      throw new Error('Erro ao buscar categorias')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 2.3. Função para criar categoria
  const createCategoria = useCallback(async (data: CreateCategoriaAmenidadeData): Promise<CategoriaAmenidade> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.post<CategoriaAmenidade>('/api/admin/categorias-amenidades', data)
      
      if (response.success && response.data) {
        setCategorias(prev => [...prev, response.data!])
        return response.data
      }
      
      throw new Error('Erro ao criar categoria')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 2.4. Função para atualizar categoria
  const updateCategoria = useCallback(async (id: string, data: UpdateCategoriaAmenidadeData): Promise<CategoriaAmenidade> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.put<CategoriaAmenidade>(`/api/admin/categorias-amenidades/${id}`, data)
      
      if (response.success && response.data) {
        setCategorias(prev => prev.map(categoria => 
          categoria.id === id ? response.data! : categoria
        ))
        return response.data
      }
      
      throw new Error('Erro ao atualizar categoria')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 2.5. Função para deletar categoria
  const deleteCategoria = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.delete(`/api/admin/categorias-amenidades/${id}`)
      
      if (response.success) {
        setCategorias(prev => prev.filter(categoria => categoria.id !== id))
      } else {
        throw new Error('Erro ao deletar categoria')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 2.6. Função para refetch
  const refetch = useCallback(async () => {
    await fetchCategorias()
  }, [fetchCategorias])
  
  // 2.7. Effect para carregar dados iniciais
  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])
  
  // 2.8. Retorno do hook
  return {
    categorias,
    loading,
    error,
    fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    refetch
  }
}
```

## 5️⃣ **PASSO 5: Implementar Componentes (Frontend Layer)**

### **Arquivo**: `src/components/admin/CategoriaAmenidadeCard.tsx`

```typescript
// ✅ CORRETO: Componente seguindo padrões
import React from 'react'
import { CategoriaAmenidade } from '@/lib/types/admin'
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/config/constants'

// 1. Interface de props
interface CategoriaAmenidadeCardProps {
  categoria: CategoriaAmenidade
  onEdit: (categoria: CategoriaAmenidade) => void
  onDelete: (categoria: CategoriaAmenidade) => void
  className?: string
}

// 2. Componente principal
export default function CategoriaAmenidadeCard({
  categoria,
  onEdit,
  onDelete,
  className = ''
}: CategoriaAmenidadeCardProps) {
  // 3. Handlers de eventos
  const handleEdit = () => {
    onEdit(categoria)
  }
  
  const handleDelete = () => {
    onDelete(categoria)
  }
  
  // 4. Renderização
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border border-gray-200 ${className}`}>
      {/* Header com ícone e ações */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: categoria.cor || CATEGORY_COLORS.default }}
          >
            {categoria.icone || CATEGORY_ICONS.default}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{categoria.nome}</h3>
            {categoria.descricao && (
              <p className="text-sm text-gray-600">{categoria.descricao}</p>
            )}
          </div>
        </div>
        
        {/* Ações */}
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            title="Editar categoria"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            title="Excluir categoria"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Status */}
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          categoria.ativo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {categoria.ativo ? 'Ativo' : 'Inativo'}
        </span>
        
        <span className="text-xs text-gray-500">
          Criado em {new Date(categoria.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  )
}
```

### **Arquivo**: `src/components/admin/CategoriaAmenidadeForm.tsx`

```typescript
// ✅ CORRETO: Formulário seguindo padrões
import React, { useState, useEffect } from 'react'
import { CategoriaAmenidade, CreateCategoriaAmenidadeData, UpdateCategoriaAmenidadeData } from '@/lib/types/admin'
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/config/constants'

// 1. Interface de props
interface CategoriaAmenidadeFormProps {
  categoria?: CategoriaAmenidade
  onSubmit: (data: CreateCategoriaAmenidadeData | UpdateCategoriaAmenidadeData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

// 2. Componente principal
export default function CategoriaAmenidadeForm({
  categoria,
  onSubmit,
  onCancel,
  loading = false
}: CategoriaAmenidadeFormProps) {
  // 3. Estado local
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: '',
    cor: '',
    ativo: true
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 4. Effect para popular formulário em modo de edição
  useEffect(() => {
    if (categoria) {
      setFormData({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
        icone: categoria.icone || '',
        cor: categoria.cor || '',
        ativo: categoria.ativo
      })
    }
  }, [categoria])
  
  // 5. Função de validação
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    } else if (formData.nome.length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
    } else if (formData.nome.length > 100) {
      newErrors.nome = 'Nome deve ter no máximo 100 caracteres'
    }
    
    if (formData.descricao && formData.descricao.length > 500) {
      newErrors.descricao = 'Descrição deve ter no máximo 500 caracteres'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // 6. Handler de submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
    }
  }
  
  // 7. Handlers de input
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  // 8. Renderização
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome *
        </label>
        <input
          type="text"
          id="nome"
          value={formData.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.nome ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Digite o nome da categoria"
        />
        {errors.nome && (
          <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
        )}
      </div>
      
      {/* Descrição */}
      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.descricao ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Digite uma descrição para a categoria"
        />
        {errors.descricao && (
          <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
        )}
      </div>
      
      {/* Ícone */}
      <div>
        <label htmlFor="icone" className="block text-sm font-medium text-gray-700 mb-1">
          Ícone
        </label>
        <select
          id="icone"
          value={formData.icone}
          onChange={(e) => handleInputChange('icone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione um ícone</option>
          {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
            <option key={key} value={icon}>
              {icon} {key}
            </option>
          ))}
        </select>
      </div>
      
      {/* Cor */}
      <div>
        <label htmlFor="cor" className="block text-sm font-medium text-gray-700 mb-1">
          Cor
        </label>
        <select
          id="cor"
          value={formData.cor}
          onChange={(e) => handleInputChange('cor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione uma cor</option>
          {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
            <option key={key} value={color}>
              {key}
            </option>
          ))}
        </select>
      </div>
      
      {/* Status */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="ativo"
          checked={formData.ativo}
          onChange={(e) => handleInputChange('ativo', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="ativo" className="ml-2 block text-sm text-gray-700">
          Categoria ativa
        </label>
      </div>
      
      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : (categoria ? 'Atualizar' : 'Criar')}
        </button>
      </div>
    </form>
  )
}
```

## 6️⃣ **PASSO 6: Implementar Página Principal (Frontend Layer)**

### **Arquivo**: `src/app/admin/categorias-amenidades/page.tsx`

```typescript
// ✅ CORRETO: Página seguindo padrões
'use client'

import React, { useState } from 'react'
import { CategoriaAmenidade, CreateCategoriaAmenidadeData, UpdateCategoriaAmenidadeData } from '@/lib/types/admin'
import { useCategoriasAmenidades } from '@/hooks/useCategoriasAmenidades'
import CategoriaAmenidadeCard from '@/components/admin/CategoriaAmenidadeCard'
import CategoriaAmenidadeForm from '@/components/admin/CategoriaAmenidadeForm'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// 1. Componente principal
export default function CategoriasAmenidadesPage() {
  // 2. Estado local
  const [showForm, setShowForm] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaAmenidade | null>(null)
  const [deletingCategoria, setDeletingCategoria] = useState<CategoriaAmenidade | null>(null)
  
  // 3. Hook customizado
  const {
    categorias,
    loading,
    error,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    refetch
  } = useCategoriasAmenidades()
  
  // 4. Handlers de eventos
  const handleCreate = () => {
    setEditingCategoria(null)
    setShowForm(true)
  }
  
  const handleEdit = (categoria: CategoriaAmenidade) => {
    setEditingCategoria(categoria)
    setShowForm(true)
  }
  
  const handleDelete = (categoria: CategoriaAmenidade) => {
    setDeletingCategoria(categoria)
  }
  
  const handleFormSubmit = async (data: CreateCategoriaAmenidadeData | UpdateCategoriaAmenidadeData) => {
    try {
      if (editingCategoria) {
        await updateCategoria(editingCategoria.id, data as UpdateCategoriaAmenidadeData)
      } else {
        await createCategoria(data as CreateCategoriaAmenidadeData)
      }
      
      setShowForm(false)
      setEditingCategoria(null)
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
    }
  }
  
  const handleFormCancel = () => {
    setShowForm(false)
    setEditingCategoria(null)
  }
  
  const handleConfirmDelete = async () => {
    if (!deletingCategoria) return
    
    try {
      await deleteCategoria(deletingCategoria.id)
      setDeletingCategoria(null)
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
    }
  }
  
  const handleCancelDelete = () => {
    setDeletingCategoria(null)
  }
  
  // 5. Renderização condicional
  if (loading && categorias.length === 0) {
    return <LoadingSpinner />
  }
  
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />
  }
  
  // 6. Renderização principal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias de Amenidades</h1>
          <p className="text-gray-600">Gerencie as categorias de amenidades do sistema</p>
        </div>
        
        <PermissionGuard resource="categorias-amenidades" action="WRITE">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Nova Categoria
          </button>
        </PermissionGuard>
      </div>
      
      {/* Lista de categorias */}
      {categorias.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma categoria encontrada</p>
          <PermissionGuard resource="categorias-amenidades" action="WRITE">
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Criar primeira categoria
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map(categoria => (
            <CategoriaAmenidadeCard
              key={categoria.id}
              categoria={categoria}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            
            <CategoriaAmenidadeForm
              categoria={editingCategoria || undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              loading={loading}
            />
          </div>
        </div>
      )}
      
      {/* Modal de confirmação de exclusão */}
      {deletingCategoria && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Confirmar Exclusão</h2>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a categoria "{deletingCategoria.nome}"?
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **Para cada nova funcionalidade, verificar**:

- [ ] **Tipos**: Definiu interfaces TypeScript?
- [ ] **Database**: Implementou queries com transações?
- [ ] **API**: Criou rotas com validação e autenticação?
- [ ] **Hook**: Implementou hook customizado?
- [ ] **Componentes**: Criou componentes reutilizáveis?
- [ ] **Página**: Implementou página principal?
- [ ] **Permissões**: Adicionou controle de acesso?
- [ ] **Validação**: Validou dados em múltiplas camadas?
- [ ] **Logging**: Logou operações importantes?
- [ ] **Cache**: Implementou cache adequadamente?
- [ ] **Tratamento de Erros**: Tratou erros adequadamente?
- [ ] **UX**: Implementou feedback visual?

## 🚨 **PONTOS DE ATENÇÃO**

### **1. Validação de Dados**:
- ✅ **SEMPRE** validar no frontend para UX
- ✅ **SEMPRE** validar no backend para segurança
- ✅ **SEMPRE** validar no banco para integridade

### **2. Tratamento de Erros**:
- ✅ **SEMPRE** tratar erros de forma user-friendly
- ✅ **SEMPRE** logar erros para debugging
- ✅ **SEMPRE** retornar status codes corretos

### **3. Performance**:
- ✅ **SEMPRE** usar cache quando apropriado
- ✅ **SEMPRE** otimizar queries
- ✅ **SEMPRE** implementar lazy loading

### **4. Segurança**:
- ✅ **SEMPRE** verificar autenticação
- ✅ **SEMPRE** verificar permissões
- ✅ **SEMPRE** sanitizar dados

## 📚 **Próximos Passos**

1. **Implementar testes** para cada camada
2. **Adicionar validação** automática de arquitetura
3. **Implementar monitoramento** de performance
4. **Criar templates** para novos recursos
5. **Documentar APIs** com OpenAPI

---

**Última atualização**: $(date)
**Versão**: 1.0.0
**Status**: ✅ Implementado e Funcionando






