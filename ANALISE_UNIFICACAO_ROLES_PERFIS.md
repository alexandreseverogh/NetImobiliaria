# ANÁLISE: UNIFICAÇÃO DE ROLES E PERFIS

## OBJETIVO
Unificar `/admin/perfis` em `/admin/roles`, mantendo apenas uma interface para gestão de perfis com hierarquia.

## ANÁLISE DAS TABELAS

### Tabela `user_roles`
```sql
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,              -- Hierarquia (1-10)
    is_system_role BOOLEAN DEFAULT false,
    requires_2fa BOOLEAN DEFAULT false,   -- 2FA obrigatório
    is_active BOOLEAN DEFAULT true,       -- Status ativo/inativo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);
```

### Relacionamentos
```
user_roles
  ├─ user_role_assignments (M:M com users)
  └─ role_permissions (M:M com permissions)

role_permissions
  └─ permissions
      └─ system_features
```

## CAMPOS NECESSÁRIOS

### Campos existentes na tabela:
- ✅ `id` - PRIMARY KEY
- ✅ `name` - Nome do perfil
- ✅ `description` - Descrição
- ✅ `level` - Hierarquia (obrigatório)
- ✅ `is_system_role` - Perfil do sistema
- ✅ `requires_2fa` - 2FA obrigatório
- ✅ `is_active` - Status
- ✅ `created_at` - Data de criação
- ✅ `updated_at` - Data de atualização
- ✅ `created_by` - Usuário criador

### Campos que precisam ser adicionados:
- ❌ **Nenhum** - Tabela já está completa!

## FUNCIONALIDADES A MANTER

### De `/admin/roles`:
1. ✅ Criar perfil com `level` (hierarquia)
2. ✅ Editar perfil
3. ✅ Excluir perfil
4. ✅ Ativar/Desativar perfil
5. ✅ Toggle 2FA
6. ✅ Clonar perfil
7. ✅ Gerenciar permissões
8. ✅ Visualizar usuários do perfil
9. ✅ Filtros (ativo/inativo, 2FA, busca)

### De `/admin/perfis` (a portar):
1. ❌ Gestão de usuários do perfil (já existe em roles)
2. ❌ Interface simplificada (não necessário)
3. ❌ Cards de visualização (já existe em roles)

## TESTES NECESSÁRIOS

### 1. Estrutura do Banco de Dados
- [ ] Verificar se `user_roles` tem todos os campos
- [ ] Verificar foreign keys
- [ ] Verificar índices
- [ ] Verificar constraints

### 2. Relacionamentos
- [ ] Testar `user_role_assignments` (users ↔ roles)
- [ ] Testar `role_permissions` (roles ↔ permissions)
- [ ] Testar cascade delete

### 3. API `/api/admin/roles`
- [ ] GET - Listar roles
- [ ] POST - Criar role
- [ ] PUT - Atualizar role
- [ ] DELETE - Deletar role
- [ ] PATCH - Toggle 2FA
- [ ] PATCH - Toggle Active

### 4. Interface `/admin/roles`
- [ ] Carregamento de roles
- [ ] Criação de role
- [ ] Edição de role
- [ ] Exclusão de role
- [ ] Toggle 2FA
- [ ] Toggle Active
- [ ] Filtros
- [ ] Busca
- [ ] Paginação

### 5. Validações
- [ ] Nome único
- [ ] Level obrigatório (1-10)
- [ ] Descrição obrigatória
- [ ] Não excluir se tiver usuários

## PLANO DE EXECUÇÃO

### FASE 1: Análise e Testes
1. ✅ Verificar estrutura da tabela
2. ⏳ Testar relacionamentos
3. ⏳ Testar API atual
4. ⏳ Identificar funcionalidades únicas de `/admin/perfis`

### FASE 2: Portar Funcionalidades
1. ⏳ Portar gestão de usuários (se necessário)
2. ⏳ Portar interface (se necessário)
3. ⏳ Adicionar validações

### FASE 3: Remoção
1. ⏳ Remover `/admin/perfis` da sidebar
2. ⏳ Remover arquivos de `/admin/perfis`
3. ⏳ Remover arquivos de `/api/admin/perfis`
4. ⏳ Remover componentes modais de perfis
5. ⏳ Atualizar imports

### FASE 4: Testes Finais
1. ⏳ Testar criação de role
2. ⏳ Testar edição de role
3. ⏳ Testar exclusão de role
4. ⏳ Testar hierarquia
5. ⏳ Testar 2FA
6. ⏳ Testar permissões
7. ⏳ Testar usuários

## STATUS
- **FASE 1**: 🔄 EM ANDAMENTO
- **FASE 2**: ⏳ PENDENTE
- **FASE 3**: ⏳ PENDENTE
- **FASE 4**: ⏳ PENDENTE
