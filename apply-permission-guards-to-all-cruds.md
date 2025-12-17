# 🛡️ APLICAÇÃO DE PERMISSION GUARDS EM TODOS OS CRUDs

## ✅ Já Implementado

### 1. Proprietários (`/admin/proprietarios`)
- ✅ Botão "Novo Proprietário" (WriteGuard)
- ✅ Botão "Editar" (WriteGuard)
- ✅ Botão "Excluir" (DeleteGuard)
- ✅ Botão "Visualizar" (sem guard - sempre visível)

## 📋 Páginas que Precisam de Guards

### 2. Clientes (`/admin/clientes`)
- [ ] Botão "Novo Cliente" → WriteGuard resource="clientes"
- [ ] Botão "Editar" → WriteGuard resource="clientes"
- [ ] Botão "Excluir" → DeleteGuard resource="clientes"

### 3. Imóveis (`/admin/imoveis`)
- [ ] Botão "Novo Imóvel" → WriteGuard resource="imoveis"
- [ ] Botão "Editar" → WriteGuard resource="imoveis"
- [ ] Botão "Excluir" → DeleteGuard resource="imoveis"

### 4. Amenidades (`/admin/amenidades`)
- [ ] Botão "Nova Amenidade" → WriteGuard resource="amenidades"
- [ ] Botão "Editar" → WriteGuard resource="amenidades"
- [ ] Botão "Excluir" → DeleteGuard resource="amenidades"

### 5. Categorias de Amenidades (`/admin/categorias-amenidades`)
- [ ] Botão "Nova Categoria" → WriteGuard resource="categorias-amenidades"
- [ ] Botão "Editar" → WriteGuard resource="categorias-amenidades"
- [ ] Botão "Excluir" → DeleteGuard resource="categorias-amenidades"

### 6. Proximidades (`/admin/proximidades`)
- [ ] Botão "Nova Proximidade" → WriteGuard resource="proximidades"
- [ ] Botão "Editar" → WriteGuard resource="proximidades"
- [ ] Botão "Excluir" → DeleteGuard resource="proximidades"

### 7. Categorias de Proximidades (`/admin/categorias-proximidades`)
- [ ] Botão "Nova Categoria" → WriteGuard resource="categorias-proximidades"
- [ ] Botão "Editar" → WriteGuard resource="categorias-proximidades"
- [ ] Botão "Excluir" → DeleteGuard resource="categorias-proximidades"

### 8. Tipos de Documentos (`/admin/tipos-documentos`)
- [ ] Botão "Novo Tipo" → WriteGuard resource="tipos-documentos"
- [ ] Botão "Editar" → WriteGuard resource="tipos-documentos"
- [ ] Botão "Excluir" → DeleteGuard resource="tipos-documentos"

### 9. Tipos de Imóveis (`/admin/tipos-imoveis`)
- [ ] Botão "Novo Tipo" → WriteGuard resource="tipos-imoveis"
- [ ] Botão "Editar" → WriteGuard resource="tipos-imoveis"
- [ ] Botão "Excluir" → DeleteGuard resource="tipos-imoveis"

### 10. Finalidades (`/admin/finalidades`)
- [ ] Botão "Nova Finalidade" → WriteGuard resource="finalidades"
- [ ] Botão "Editar" → WriteGuard resource="finalidades"
- [ ] Botão "Excluir" → DeleteGuard resource="finalidades"

### 11. Status de Imóveis (`/admin/status-imovel`)
- [ ] Botão "Novo Status" → WriteGuard resource="status-imovel"
- [ ] Botão "Editar" → WriteGuard resource="status-imovel"
- [ ] Botão "Excluir" → DeleteGuard resource="status-imovel"

### 12. Usuários (`/admin/usuarios`)
- [ ] Botão "Novo Usuário" → WriteGuard resource="usuarios"
- [ ] Botão "Editar" → WriteGuard resource="usuarios"
- [ ] Botão "Excluir" → DeleteGuard resource="usuarios"

## 🎯 Padrão de Implementação

```typescript
// 1. Importar os guards
import { WriteGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

// 2. Envolver botão de criar
<WriteGuard resource="nome-do-recurso">
  <button onClick={...}>Novo Item</button>
</WriteGuard>

// 3. Envolver botão de editar
<WriteGuard resource="nome-do-recurso">
  <button onClick={...}>Editar</button>
</WriteGuard>

// 4. Envolver botão de excluir
<DeleteGuard resource="nome-do-recurso">
  <button onClick={...}>Excluir</button>
</DeleteGuard>

// 5. Botão de visualizar NÃO precisa de guard (sempre visível)
<button onClick={...}>Visualizar</button>
```

## 📝 Mapeamento de Recursos

| Página | Resource Name | Permissões na DB |
|--------|---------------|------------------|
| Proprietários | `proprietarios` | ✅ Cadastradas |
| Clientes | `clientes` | ✅ Cadastradas |
| Imóveis | `imoveis` | ✅ Cadastradas |
| Amenidades | `amenidades` | ✅ Cadastradas |
| Categorias de Amenidades | `categorias-amenidades` | ✅ Cadastradas |
| Proximidades | `proximidades` | ✅ Cadastradas |
| Categorias de Proximidades | `categorias-proximidades` | ✅ Cadastradas |
| Tipos de Documentos | `tipos-documentos` | ✅ Cadastradas |
| Tipos de Imóveis | `tipos-imoveis` | ✅ Cadastradas |
| Finalidades | `finalidades` | ✅ Cadastradas |
| Status de Imóveis | `status-imovel` | ✅ Cadastradas |
| Usuários | `usuarios` | ✅ Cadastradas |

## ⚠️ Observações Importantes

1. **Botões de Visualizar**: NÃO devem ter guard. Se o usuário pode acessar a página (controlado pelo sidebar), ele pode visualizar.

2. **Consistência**: O nome do resource deve ser EXATAMENTE o mesmo usado em `system_features.name`.

3. **Teste**: Após aplicar os guards, testar com usuário com permissão apenas de READ (list).

4. **Validação Backend**: Os guards são apenas para UX. A validação real está nas APIs.


