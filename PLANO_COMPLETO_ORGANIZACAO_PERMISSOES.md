# PLANO COMPLETO DE ORGANIZAÇÃO DAS PERMISSÕES
## Baseado no Campo Crud_Execute da Tabela system_features

### ============================================================
### 1. ANÁLISE DO PROBLEMA ATUAL
### ============================================================

#### 1.1 Problemas Identificados:
- **Inconsistência de Dados**: Funcionalidades com `Crud_Execute = EXECUTE` têm permissões CRUD (CREATE, READ, UPDATE, DELETE)
- **Campo Crud_Execute Não Utilizado**: A página `/admin/system-features` não armazena nem exibe o campo `Crud_Execute`
- **Permissões Incorretas**: Funcionalidades EXECUTE têm permissões ADMIN/DELETE/WRITE quando deveriam ter apenas EXECUTE
- **Duplicação de Permissões**: Algumas funcionalidades têm permissões duplicadas

#### 1.2 Estrutura Atual Problemática:
```sql
-- Exemplo de problema atual:
-- Funcionalidade: "Dashboard" (Crud_Execute = EXECUTE)
-- Permissões existentes: ADMIN, DELETE, READ, WRITE ❌ INCORRETO
-- Permissões corretas: EXECUTE ✅ CORRETO
```

### ============================================================
### 2. REGRAS DE ORGANIZAÇÃO DAS PERMISSÕES
### ============================================================

#### 2.1 Para Funcionalidades CRUD (`Crud_Execute = 'CRUD'`):
```sql
-- Deve ter EXATAMENTE 4 permissões:
1. CREATE  - Criar registros
2. READ    - Visualizar registros  
3. UPDATE  - Editar registros
4. DELETE  - Excluir registros

-- NÃO deve ter:
- ADMIN (exceto se for funcionalidade administrativa)
- EXECUTE
- WRITE (redundante com CREATE/UPDATE)
```

#### 2.2 Para Funcionalidades EXECUTE (`Crud_Execute = 'EXECUTE'`):
```sql
-- Deve ter EXATAMENTE 1 permissão:
1. EXECUTE - Executar funcionalidade

-- NÃO deve ter:
- CREATE, READ, UPDATE, DELETE
- ADMIN (exceto se for funcionalidade administrativa)
- WRITE
```

#### 2.3 Para Funcionalidades ADMINISTRATIVAS:
```sql
-- Pode ter permissão ADMIN adicional:
1. ADMIN - Acesso administrativo total
2. CREATE/READ/UPDATE/DELETE ou EXECUTE (conforme tipo)
```

### ============================================================
### 3. PLANO DE CORREÇÃO DAS INTERFACES
### ============================================================

#### 3.1 Correção da Página `/admin/system-features`:

**3.1.1 Atualizar Interface de Criação:**
- Adicionar campo para selecionar tipo: CRUD ou EXECUTE
- Mapear corretamente:
  - `type: 'crud'` → `Crud_Execute = 'CRUD'`
  - `type: 'single'` → `Crud_Execute = 'EXECUTE'`

**3.1.2 Atualizar Interface de Edição:**
- Exibir campo `Crud_Execute` atual
- Permitir alteração do tipo (com aviso sobre impacto nas permissões)
- Mostrar permissões associadas

**3.1.3 Atualizar API:**
- Incluir campo `Crud_Execute` nas operações CREATE/UPDATE
- Validar consistência entre tipo e permissões criadas

#### 3.2 Correção da Página `/admin/permissions`:
- Exibir coluna mostrando o tipo da funcionalidade (CRUD/EXECUTE)
- Destacar inconsistências
- Permitir correção em lote

### ============================================================
### 4. SCRIPT DE MIGRAÇÃO DE DADOS
### ============================================================

#### 4.1 Script de Análise (Identificar Problemas):
```sql
-- Identificar funcionalidades EXECUTE com permissões incorretas
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as total_permissions,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as actions,
    CASE 
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) > 1 THEN 'PROBLEMA'
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) != 4 THEN 'PROBLEMA'
        ELSE 'OK'
    END as status
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY status DESC, sf.name;
```

#### 4.2 Script de Correção (Remover Permissões Incorretas):
```sql
-- Remover permissões incorretas de funcionalidades EXECUTE
DELETE FROM permissions 
WHERE feature_id IN (
    SELECT sf.id 
    FROM system_features sf 
    WHERE sf."Crud_Execute" = 'EXECUTE'
) 
AND action NOT IN ('EXECUTE', 'ADMIN');

-- Remover permissões duplicadas de funcionalidades CRUD
DELETE FROM permissions 
WHERE id IN (
    SELECT p1.id
    FROM permissions p1
    JOIN permissions p2 ON p1.feature_id = p2.feature_id 
        AND p1.action = p2.action 
        AND p1.id > p2.id
    JOIN system_features sf ON p1.feature_id = sf.id
    WHERE sf."Crud_Execute" = 'CRUD'
);
```

#### 4.3 Script de Criação (Adicionar Permissões Faltantes):
```sql
-- Adicionar permissões faltantes para funcionalidades CRUD
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
    sf.id,
    'CREATE',
    'Criar ' || sf.name,
    NOW(),
    NOW()
FROM system_features sf
WHERE sf."Crud_Execute" = 'CRUD'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'CREATE'
);

-- Repetir para READ, UPDATE, DELETE...
```

### ============================================================
### 5. IMPLEMENTAÇÃO DAS CORREÇÕES
### ============================================================

#### 5.1 Fase 1: Correção da API (src/app/api/admin/system-features/route.ts)
```typescript
// POST - Criar funcionalidade
export async function POST(request: NextRequest) {
  const { name, description, category_id, url, type = 'crud' } = data
  
  // Mapear tipo para Crud_Execute
  const crudExecute = type === 'crud' ? 'CRUD' : 'EXECUTE'
  
  // Criar funcionalidade com Crud_Execute
  const featureResult = await pool.query(`
    INSERT INTO system_features (name, description, category_id, url, "Crud_Execute", is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
    RETURNING id
  `, [name, description, category_id, url, crudExecute])
  
  // Criar permissões baseadas no Crud_Execute
  if (crudExecute === 'CRUD') {
    // Criar CREATE, READ, UPDATE, DELETE
  } else {
    // Criar apenas EXECUTE
  }
}
```

#### 5.2 Fase 2: Correção da Interface (CreateSystemFeatureModal.tsx)
```typescript
// Adicionar campo para exibir Crud_Execute
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Tipo de Funcionalidade *
  </label>
  <select
    value={formData.type}
    onChange={(e) => setFormData({...formData, type: e.target.value as 'crud' | 'single'})}
  >
    <option value="crud">CRUD (Create, Read, Update, Delete)</option>
    <option value="single">EXECUTE (Funcionalidade Única)</option>
  </select>
</div>
```

#### 5.3 Fase 3: Correção da Página de Permissões
```typescript
// Adicionar coluna mostrando tipo da funcionalidade
<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Tipo
</th>

// Na linha da tabela
<td className="px-3 py-4 whitespace-nowrap">
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    feature.crud_execute === 'CRUD' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800'
  }`}>
    {feature.crud_execute}
  </span>
</td>
```

### ============================================================
### 6. VALIDAÇÃO E TESTES
### ============================================================

#### 6.1 Testes de Validação:
1. **Teste de Criação**: Criar funcionalidade CRUD e verificar se tem 4 permissões
2. **Teste de Criação**: Criar funcionalidade EXECUTE e verificar se tem 1 permissão
3. **Teste de Edição**: Alterar tipo de funcionalidade e verificar impacto nas permissões
4. **Teste de Consistência**: Verificar se todas as funcionalidades estão consistentes

#### 6.2 Scripts de Validação:
```sql
-- Validar consistência geral
SELECT 
    'Funcionalidades CRUD com permissões incorretas' as problema,
    COUNT(*) as quantidade
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'CRUD'
GROUP BY sf.id
HAVING COUNT(p.id) != 4

UNION ALL

SELECT 
    'Funcionalidades EXECUTE com permissões incorretas' as problema,
    COUNT(*) as quantidade
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'EXECUTE'
GROUP BY sf.id
HAVING COUNT(p.id) != 1;
```

### ============================================================
### 7. CRONOGRAMA DE IMPLEMENTAÇÃO
### ============================================================

#### Dia 1: Análise e Preparação
- [x] Analisar estrutura atual
- [x] Identificar problemas
- [ ] Criar scripts de migração

#### Dia 2: Correção da API
- [ ] Atualizar POST /api/admin/system-features
- [ ] Atualizar PUT /api/admin/system-features/[id]
- [ ] Testar criação e edição

#### Dia 3: Correção da Interface
- [ ] Atualizar CreateSystemFeatureModal
- [ ] Atualizar EditSystemFeatureModal
- [ ] Atualizar página de listagem

#### Dia 4: Migração de Dados
- [ ] Executar scripts de correção
- [ ] Validar consistência
- [ ] Testar funcionalidades

#### Dia 5: Testes e Validação
- [ ] Testes completos
- [ ] Validação de segurança
- [ ] Documentação final

### ============================================================
### 8. RISCOS E MITIGAÇÕES
### ============================================================

#### 8.1 Riscos Identificados:
- **Perda de Permissões**: Usuários podem perder acesso durante migração
- **Inconsistência Temporária**: Sistema pode ficar inconsistente durante migração
- **Quebra de Funcionalidades**: APIs podem parar de funcionar

#### 8.2 Mitigações:
- **Backup Completo**: Fazer backup antes de qualquer alteração
- **Migração Gradual**: Migrar funcionalidade por funcionalidade
- **Testes em Ambiente Isolado**: Testar tudo antes de aplicar em produção
- **Rollback Plan**: Plano de reversão em caso de problemas

### ============================================================
### 9. MONITORAMENTO PÓS-IMPLEMENTAÇÃO
### ============================================================

#### 9.1 Métricas de Sucesso:
- 100% das funcionalidades CRUD têm exatamente 4 permissões
- 100% das funcionalidades EXECUTE têm exatamente 1 permissão
- 0% de inconsistências entre Crud_Execute e permissões
- Interface funcionando corretamente para criação/edição

#### 9.2 Alertas de Monitoramento:
- Funcionalidades com permissões inconsistentes
- Tentativas de criar permissões incorretas
- Erros na API de system-features

### ============================================================
### 10. CONCLUSÃO
### ============================================================

Este plano garante que:
1. **Consistência**: Todas as funcionalidades seguem as regras definidas
2. **Clareza**: Interface mostra claramente o tipo de funcionalidade
3. **Manutenibilidade**: Sistema fica mais fácil de manter e entender
4. **Segurança**: Permissões são aplicadas corretamente
5. **Escalabilidade**: Novas funcionalidades seguem o padrão correto

A implementação deve ser feita de forma gradual e com testes rigorosos para garantir a estabilidade do sistema.
