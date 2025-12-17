# 🛡️ INSTRUÇÕES PARA APLICAR PERMISSION GUARDS

## Status Atual

- ✅ **Implementado (3/12)**:
  - `proprietarios` (completo: WriteGuard + DeleteGuard)
  - `categorias-amenidades` (parcial: apenas WriteGuard)
  - `categorias-proximidades` (parcial: apenas WriteGuard)

- ❌ **Pendente (9/12)**:
  - `clientes`
  - `imoveis`
  - `amenidades`
  - `proximidades`
  - `tipos-documentos`
  - `tipos-imoveis`
  - `finalidades`
  - `status-imovel`
  - `usuarios`

## Padrão de Implementação

### 1. Adicionar Importação (no topo do arquivo)

```typescript
import { WriteGuard, DeleteGuard } from '@/components/admin/PermissionGuard'
```

### 2. Aplicar nos Botões

#### Botão "Novo" (Criar)
```typescript
<WriteGuard resource="nome-do-recurso">
  <button onClick={() => router.push('/admin/recurso/novo')}>
    <PlusIcon />
    Novo Item
  </button>
</WriteGuard>
```

#### Botão "Editar"
```typescript
<WriteGuard resource="nome-do-recurso">
  <button onClick={() => router.push(`/admin/recurso/${id}/editar`)}>
    <PencilIcon />
  </button>
</WriteGuard>
```

#### Botão "Excluir"
```typescript
<DeleteGuard resource="nome-do-recurso">
  <button onClick={() => handleDelete(id)}>
    <TrashIcon />
  </button>
</DeleteGuard>
```

#### Botão "Visualizar" (SEM GUARD)
```typescript
<button onClick={() => router.push(`/admin/recurso/${id}`)}>
  <EyeIcon />
</button>
```

## Prioridade de Implementação

1. **Alta**: `clientes`, `imoveis`, `usuarios` (CRUDs principais)
2. **Média**: `amenidades`, `proximidades`, `tipos-documentos`
3. **Baixa**: `tipos-imoveis`, `finalidades`, `status-imovel`

## Completar Implementações Parciais

### categorias-amenidades
- ✅ WriteGuard já aplicado
- ❌ Falta DeleteGuard

### categorias-proximidades
- ✅ WriteGuard já aplicado
- ❌ Falta DeleteGuard

## Teste Após Implementação

1. Login como usuário "Corretor" com apenas permissão `list`
2. Verificar que:
   - ✅ Botões "Novo", "Editar" e "Excluir" estão OCULTOS
   - ✅ Botão "Visualizar" está VISÍVEL
   - ✅ Lista de itens é exibida normalmente

## Comando para Verificar

```bash
node check-permission-guards-in-pages.js
```


