# 🛡️ GUARDIAN RULES - REGRAS GUARDIÃS DO DESENVOLVIMENTO

**Versão:** 1.0  
**Data:** 2025-01-15  
**Status:** 🚨 **OBRIGATÓRIO**

> **"Estas regras são INVIOLÁVEIS e garantem a estabilidade, segurança e continuidade do sistema!"**

---

## 📋 **ÍNDICE**

1. [Regra Primordial](#regra-primordial)
2. [Protocolo de Impacto](#protocolo-de-impacto)
3. [Regras de Segurança](#regras-de-segurança)
4. [Regras de Banco de Dados](#regras-de-banco-de-dados)
5. [Regras de Interface](#regras-de-interface)
6. [Regras Técnicas](#regras-técnicas)
7. [Regras de Auditoria](#regras-de-auditoria)
8. [Regras de Processo](#regras-de-processo)
9. [Checklist Guardian](#checklist-guardian)
10. [Templates Obrigatórios](#templates-obrigatórios)
11. [Protocolo de Emergência](#protocolo-de-emergência)

---

## 🚨 **REGRA PRIMORDIAL - INVIOLÁVEL**

### **"INCREMENTAL SIM, DESTRUTIVO NUNCA!"**

> **"TODAS as implementações devem ser INCREMENTAIS. Qualquer mudança que possa impactar funcionalidades existentes requer ANÁLISE MINUCIOSA e AUTORIZAÇÃO EXPRESSA. JAMAIS destruir funcionalidades existentes."**

**Esta regra é o FOUNDATION de todas as outras regras!**

**CASOS QUE REQUEREM AUTORIZAÇÃO OBRIGATÓRIA:**
- 🔴 **Modificação de tabelas/APIs existentes**
- 🔴 **Mudança em lógica de negócio ativa**
- 🔴 **Alteração de permissões/roles em uso**
- 🔴 **Qualquer risco de quebrar funcionalidades**

---

## 🔍 **PROTOCOLO DE IMPACTO - OBRIGATÓRIO**

### **ANTES de qualquer implementação:**

#### **1. ANÁLISE DE IMPACTO MANDATÓRIA**

**Documento obrigatório:** `ANALISE_IMPACTO_[NOME].md`

#### **2. INVENTÁRIO DE DEPENDÊNCIAS OBRIGATÓRIO**

- ✅ **Consulta obrigatória:** `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` para qualquer alteração que atinja cadastros de clientes, proprietários, imóveis ou integrações públicas.
- ✅ **Atualização imediata:** toda nova dependência identificada deve ser registrada no inventário **antes** da conclusão da análise de impacto.
- ✅ **Vinculação:** anexar o resumo das dependências afetadas no documento de análise de impacto correspondente.
- ❌ **Proibido** prosseguir sem validar que o inventário está atualizado e assinado pelo responsável atual.

#### **3. BLOQUEIOS AUTOMÁTICOS**

**Se identificar qualquer um destes cenários:**
- 🔴 **Alto risco** de quebrar funcionalidades
- 🔴 **Modificação** de tabelas/APIs ativas
- 🔴 **Mudança** em lógica de negócio existente
- 🔴 **Alteração** de permissões/roles ativos

**AÇÃO OBRIGATÓRIA:**
1. **PARAR** implementação
2. **AGUARDAR** autorização expressa
3. **NÃO** prosseguir sem aprovação

---

## 🔐 **REGRAS DE SEGURANÇA - INVIOLÁVEIS**

### **❌ PROIBIÇÕES ABSOLUTAS**

#### **1. Bypass de Segurança**
- ❌ **NUNCA** criar rotas sem middleware de autenticação
- ❌ **NUNCA** remover verificação de JWT
- ❌ **NUNCA** permitir acesso direto sem validação de permissões
- ❌ **NUNCA** hardcodar senhas ou tokens
- ❌ **NUNCA** usar SQL injection (sempre prepared statements)

#### **2. Ignorar RBAC**
- ❌ **NUNCA** criar funcionalidades sem sistema de permissões
- ❌ **NUNCA** permitir acesso sem verificação de nível hierárquico
- ❌ **NUNCA** criar perfis com nível superior ao seu
- ❌ **NUNCA** editar seu próprio perfil ou perfis de mesmo nível
- ❌ **NUNCA** excluir Super Admin (nível 1)

#### **3. Bypass de 2FA**
- ❌ **NUNCA** desabilitar 2FA para operações críticas
- ❌ **NUNCA** permitir acesso sem código 2FA quando obrigatório
- ❌ **NUNCA** criar códigos 2FA com expiração > 10 minutos

#### **4. Rate Limiting**
- ❌ **NUNCA** desabilitar rate limiting
- ❌ **NUNCA** permitir > 5 tentativas de login por 15 min
- ❌ **NUNCA** permitir > 10 tentativas por IP por 15 min

---

## 🗄️ **REGRAS DE BANCO DE DADOS - CRÍTICAS**

### **❌ PROIBIÇÕES DESTRUTIVAS**

#### **1. Modificações Destrutivas**
- ❌ **NUNCA** deletar registros de `system_features` (use `is_active = false`)
- ❌ **NUNCA** deletar registros de `permissions` (quebra referências)
- ❌ **NUNCA** deletar registros de `user_roles` sem verificar dependências
- ❌ **NUNCA** fazer DROP de tabelas sem backup completo
- ❌ **NUNCA** truncar tabelas com dados em produção

#### **2. Violação de Integridade**
- ❌ **NUNCA** criar foreign keys sem ON DELETE CASCADE/SET NULL
- ❌ **NUNCA** permitir `granted_by` NULL em permissões (auditoria obrigatória)
- ❌ **NUNCA** criar registros duplicados em tabelas com UNIQUE constraints
- ❌ **NUNCA** modificar estrutura sem migração adequada
- ❌ **NUNCA** alterar tipos de colunas sem conversão de dados

#### **3. Transações**
- ❌ **NUNCA** fazer operações críticas sem transação
- ❌ **NUNCA** deixar transações abertas sem commit/rollback
- ❌ **NUNCA** fazer operações em lote sem controle de erro

#### **4. Lógica de Permissions (INVIOLÁVEL)**
- ✅ **SEMPRE** respeitar o campo `Crud_Execute` em `system_features`
- ✅ **SEMPRE** criar permissions baseado nesta regra:
  - `Crud_Execute = 'CRUD'` → Criar 4 permissions: `create`, `read`, `update`, `delete`
  - `Crud_Execute = 'EXECUTE'` → Criar 1 permission: `execute`
- ❌ **NUNCA** criar permissions duplicadas (maiúsculas e minúsculas)
- ❌ **NUNCA** criar permissions manualmente sem verificar `Crud_Execute`
- ✅ **SEMPRE** usar minúsculas para actions (`create`, `read`, não `CREATE`, `READ`)
- 💡 **EXEMPLO:** Dashboard = EXECUTE (não faz sentido CRUD), Clientes = CRUD (faz sentido criar/editar/excluir)

#### **5. Sistema de Permissões Granular (INVIOLÁVEL)**

**✅ 5 NÍVEIS GRANULARES (não usar WRITE):**

| Nível | Action no banco | Nível frontend | O que permite |
|-------|----------------|---------------|---------------|
| 6 | `admin` | `ADMIN` | Controle total sobre o recurso |
| 5 | `delete` | `DELETE` | Excluir registros |
| 4 | `update` | `UPDATE` | Editar registros existentes |
| 3 | `create` | `CREATE` | Criar novos registros |
| 2 | `execute` | `EXECUTE` | Executar ação (dashboards, relatórios) |
| 1 | `read` / `list` | `READ` | Apenas visualizar/listar |

**✅ REGRAS DE MAPEAMENTO:**
- ✅ **SEMPRE** usar `sf.slug` para identificar recursos (ZERO hardcoding)
- ✅ **SEMPRE** mapear nível mais ALTO que o usuário possui
- ✅ **SEMPRE** usar guards específicos: `CreateGuard`, `UpdateGuard`, `DeleteGuard`
- ❌ **NUNCA** usar `WriteGuard` (DEPRECATED - era confuso)
- ❌ **NUNCA** usar função `mapFeatureToResource` (DEPRECATED - usar slugs direto)
- ❌ **NUNCA** usar `WRITE` como nível de permissão (foi eliminado)

**💡 HIERARQUIA DE PERMISSÕES:**
- `ADMIN` ≥ `DELETE` ≥ `UPDATE` ≥ `CREATE` ≥ `EXECUTE` ≥ `READ`
- Exemplo: Usuário com DELETE pode também UPDATE, CREATE e READ
- Exemplo: Usuário com apenas CREATE NÃO pode UPDATE (editar existentes)

**💡 GUARDS NO FRONTEND:**
```typescript
<CreateGuard resource="amenidades">  {/* Botão "Nova Amenidade" */}
<UpdateGuard resource="amenidades">  {/* Botão de editar (lápis) */}
<DeleteGuard resource="amenidades">  {/* Botão de excluir (lixeira) */}
<ExecuteGuard resource="dashboard"> {/* Botão executar relatório */}
```

---

## 🎨 **REGRAS DE INTERFACE - UX**

### **❌ PROIBIÇÕES DE EXPOSIÇÃO**

#### **1. Ações Não Permitidas**
- ❌ **NUNCA** mostrar botões sem `PermissionGuard` adequado
- ❌ **NUNCA** permitir que usuários vejam opções que não podem usar
- ❌ **NUNCA** criar páginas de visualização sem guards nos botões
- ❌ **NUNCA** expor URLs diretas sem verificação de permissão
- ❌ **NUNCA** permitir acesso via URL sem validação de permissão

#### **2. Interface Inconsistente**
- ❌ **NUNCA** criar funcionalidades sem seguir padrão Heroicons
- ❌ **NUNCA** usar cores/estilos inconsistentes com design system
- ❌ **NUNCA** criar modais sem validação adequada
- ❌ **NUNCA** usar ícones diferentes para ações similares

#### **3. Responsividade**
- ❌ **NUNCA** criar interfaces que não funcionam em mobile
- ❌ **NUNCA** ignorar breakpoints do Tailwind CSS
- ❌ **NUNCA** criar elementos que quebram em telas pequenas

---

## 🔧 **REGRAS TÉCNICAS - CÓDIGO**

### **❌ PROIBIÇÕES DE QUALIDADE**

#### **1. Código Não Tipado**
- ❌ **NUNCA** usar `any` em TypeScript
- ❌ **NUNCA** criar componentes sem interfaces tipadas
- ❌ **NUNCA** fazer requisições API sem tratamento de erro
- ❌ **NUNCA** usar console.log em produção
- ❌ **NUNCA** usar `@ts-ignore` sem justificativa

#### **2. Duplicação de Lógica**
- ❌ **NUNCA** duplicar verificação de permissões (middleware já faz)
- ❌ **NUNCA** criar validações manuais quando middleware existe
- ❌ **NUNCA** reescrever funções já existentes
- ❌ **NUNCA** copiar código sem refatorar

#### **3. Performance**
- ❌ **NUNCA** fazer queries N+1 no banco
- ❌ **NUNCA** carregar dados desnecessários
- ❌ **NUNCA** fazer loops desnecessários
- ❌ **NUNCA** ignorar otimizações de bundle

#### **4. Acessibilidade**
- ❌ **NUNCA** ignorar ARIA labels
- ❌ **NUNCA** usar apenas cor para transmitir informação
- ❌ **NUNCA** criar elementos não navegáveis por teclado

---

## 📊 **REGRAS DE AUDITORIA - RASTREABILIDADE**

### **❌ PROIBIÇÕES DE AUDITORIA**

- ❌ **NUNCA** conceder permissões sem registrar `granted_by`
- ❌ **NUNCA** modificar perfis sem registrar quem fez
- ❌ **NUNCA** excluir dados sem log de auditoria
- ❌ **NUNCA** permitir `reason` NULL em permissões temporárias
- ❌ **NUNCA** fazer operações administrativas sem log
- ❌ **NUNCA** ignorar logs de tentativas de acesso negado

### **✅ OBRIGAÇÕES DE AUDITORIA**

- ✅ **SEMPRE** registrar `granted_by` em permissões
- ✅ **SEMPRE** registrar `assigned_by` em atribuições
- ✅ **SEMPRE** logar tentativas de login (sucesso e falha)
- ✅ **SEMPRE** registrar operações críticas
- ✅ **SEMPRE** justificar permissões temporárias

---

## 🚀 **REGRAS DE PROCESSO - IMPLEMENTAÇÃO**

### **❌ PROIBIÇÕES DE IMPLEMENTAÇÃO**

#### **1. Implementação Incompleta**
- ❌ **NUNCA** criar funcionalidades sem todas as camadas (DB + API + Frontend)
- ❌ **NUNCA** implementar sem testar todos os perfis de usuário
- ❌ **NUNCA** fazer deploy sem executar testes de segurança
- ❌ **NUNCA** criar funcionalidades sem documentação
- ❌ **NUNCA** fazer deploy sem backup

#### **2. Bypass do Sistema de Funcionalidades**
- ❌ **NUNCA** adicionar itens na sidebar sem criar em `system_features`
- ❌ **NUNCA** criar permissões sem associar a funcionalidades
- ❌ **NUNCA** permitir acesso sem registro adequado no banco
- ❌ **NUNCA** criar rotas API sem middleware de permissão

#### **3. Testes**
- ❌ **NUNCA** fazer deploy sem testes de regressão
- ❌ **NUNCA** ignorar testes de segurança
- ❌ **NUNCA** fazer deploy sem testar todos os perfis
- ❌ **NUNCA** fazer deploy sem testes de performance

---

## ✅ **CHECKLIST GUARDIAN - OBRIGATÓRIO**

### **ANTES de qualquer desenvolvimento:**

#### **🔍 Análise de Impacto**
- [ ] ✅ Identifiquei todas as funcionalidades que podem ser afetadas?
- [ ] ✅ Criei análise de impacto detalhada?
- [ ] ✅ Avaliei todos os riscos possíveis?
- [ ] ✅ Tenho plano de rollback testado?
- [ ] ✅ Comuniquei os riscos ao usuário?
- [ ] ✅ Recebi autorização expressa?

#### **🛡️ Segurança**
- [ ] ✅ Vou seguir o sistema RBAC existente?
- [ ] ✅ Vou validar permissões em todas as camadas?
- [ ] ✅ Vou implementar 2FA quando necessário?
- [ ] ✅ Vou usar prepared statements?
- [ ] ✅ Vou registrar auditoria adequada?

#### **🗄️ Banco de Dados**
- [ ] ✅ Vou preservar dados existentes?
- [ ] ✅ Vou manter integridade referencial?
- [ ] ✅ Vou criar foreign keys adequadas?
- [ ] ✅ Tenho backup antes de mudanças?
- [ ] ✅ Vou usar transações para operações críticas?

#### **🎨 Interface**
- [ ] ✅ Vou usar PermissionGuard adequadamente?
- [ ] ✅ Vou seguir padrões de design existentes?
- [ ] ✅ Vou validar formulários adequadamente?
- [ ] ✅ Vou testar com todos os perfis?
- [ ] ✅ Vou garantir responsividade?

#### **🔧 Código**
- [ ] ✅ Vou usar TypeScript adequadamente?
- [ ] ✅ Vou tratar erros adequadamente?
- [ ] ✅ Vou seguir padrões de código existentes?
- [ ] ✅ Vou documentar mudanças?
- [ ] ✅ Vou otimizar performance?

#### **📊 Auditoria**
- [ ] ✅ Vou registrar todas as operações?
- [ ] ✅ Vou preencher campos de auditoria?
- [ ] ✅ Vou justificar permissões temporárias?
- [ ] ✅ Vou logar tentativas de acesso?

#### **🚀 Processo**
- [ ] ✅ Vou implementar todas as camadas?
- [ ] ✅ Vou testar completamente?
- [ ] ✅ Vou documentar adequadamente?
- [ ] ✅ Consultei e atualizei `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` quando aplicável?
- [ ] ✅ Vou seguir cronograma aprovado?
- [ ] ✅ Vou fazer backup antes de deploy?

---

## 📋 **TEMPLATES OBRIGATÓRIOS**

### **1. Template de Análise de Impacto**

```markdown
# 🔍 ANÁLISE DE IMPACTO: [NOME_FUNCIONALIDADE]

**Data:** [DATA] | **Solicitante:** [NOME] | **Desenvolvedor:** [NOME]

## 📊 RESUMO EXECUTIVO
- **Tipo:** [NOVA/CORREÇÃO/MELHORIA]
- **Risco:** [BAIXO/MÉDIO/ALTO]
- **Impacto:** [NENHUM/BAIXO/MÉDIO/ALTO]
- **Recomendação:** [APROVAR/CONDICIONAR/NEGAR]

## 🎯 OBJETIVO
[Descrição clara e concisa do que será implementado]

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| [Nome] | [Mod/Add/Rem] | [B/M/A] | [Descrição] |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas modificadas:** [Lista]
- **Estrutura alterada:** [Preservada/Modificada]
- **Dados existentes:** [Preservados/Migrados/Perdidos]
- **Rollback possível:** [Sim/Não]
- **Transações necessárias:** [Sim/Não]

## 🔌 IMPACTO APIs
- **Rotas modificadas:** [Lista]
- **Breaking changes:** [Sim/Não]
- **Compatibilidade:** [Total/Parcial/Nenhuma]
- **Middleware afetado:** [Lista]

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** [Lista]
- **UX alterada:** [Preservada/Modificada]
- **Permissões modificadas:** [Preservadas/Modificadas]
- **Responsividade:** [Preservada/Modificada]

## ⚠️ RISCOS IDENTIFICADOS
1. **Risco Alto:** [Descrição + Mitigação]
2. **Risco Médio:** [Descrição + Mitigação]
3. **Risco Baixo:** [Descrição + Mitigação]

## 🛡️ PLANO ROLLBACK
1. [Passo 1 - Descrição detalhada]
2. [Passo 2 - Descrição detalhada]
3. [Passo 3 - Descrição detalhada]
4. **Tempo estimado:** [X minutos/horas]
5. **Responsável:** [Nome]

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Testes de regressão em funcionalidades existentes
- [ ] Testes de integração
- [ ] Testes de performance
- [ ] Testes de segurança
- [ ] Testes com todos os perfis de usuário
- [ ] Testes de responsividade
- [ ] Testes de acessibilidade

## 📅 CRONOGRAMA
- **Análise:** [X dias]
- **Desenvolvimento:** [X dias]
- **Testes:** [X dias]
- **Deploy:** [Data]
- **Monitoramento:** [X dias]

## ✅ AUTORIZAÇÃO
- [ ] Análise aprovada pelo solicitante
- [ ] Riscos aceitos
- [ ] Plano de rollback aprovado
- [ ] Cronograma aprovado
- [ ] Backup confirmado

**Assinatura:** _____________ **Data:** _________
```

### **2. Template de Relatório de Implementação**

```markdown
# ✅ RELATÓRIO IMPLEMENTAÇÃO: [NOME]

**Data:** [DATA] | **Desenvolvedor:** [NOME]

## 📊 RESUMO
- **Status:** [CONCLUÍDO/EM ANDAMENTO/BLOQUEADO]
- **Funcionalidades implementadas:** [Lista]
- **Funcionalidades afetadas:** [Lista]
- **Problemas encontrados:** [Lista]

## 🧪 TESTES REALIZADOS
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de regressão
- [ ] Testes de segurança
- [ ] Testes com todos os perfis
- [ ] Testes de performance
- [ ] Testes de responsividade

## 📈 MÉTRICAS
- **Tempo de desenvolvimento:** [X horas/dias]
- **Linhas de código:** [X]
- **Bugs encontrados:** [X]
- **Bugs corrigidos:** [X]
- **Cobertura de testes:** [X%]

## 🔄 PRÓXIMOS PASSOS
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

## ⚠️ OBSERVAÇÕES
[Observações importantes sobre a implementação]

## 🛡️ SEGURANÇA
- **Permissões implementadas:** [Lista]
- **Auditoria configurada:** [Sim/Não]
- **2FA configurado:** [Sim/Não]
- **Rate limiting:** [Sim/Não]
```

---

## 🚨 **PROTOCOLO DE EMERGÊNCIA**

### **Se algo quebrar durante implementação:**

1. **PARAR** imediatamente a implementação
2. **REVERTER** para versão anterior estável
3. **COMUNICAR** o problema ao usuário imediatamente
4. **ANALISAR** a causa raiz da quebra
5. **DOCUMENTAR** lições aprendidas
6. **REVISAR** processo antes de nova tentativa
7. **ATUALIZAR** Guardian Rules se necessário

### **Checklist de Emergência:**
- [ ] ✅ Sistema revertido para estado estável
- [ ] ✅ Usuários notificados
- [ ] ✅ Causa raiz identificada
- [ ] ✅ Documentação atualizada
- [ ] ✅ Processo revisado
- [ ] ✅ Nova tentativa autorizada

---

## 🎯 **RESUMO DAS GUARDIAN RULES**

### **REGRA PRINCIPAL:**
> **"INCREMENTAL SIM, DESTRUTIVO NUNCA!"**

### **TRÊS PILARES FUNDAMENTAIS:**
1. **🛡️ SEGURANÇA:** Nunca comprometer segurança existente
2. **🔍 ANÁLISE:** Sempre analisar impacto antes de implementar
3. **✅ AUTORIZAÇÃO:** Nunca prosseguir sem aprovação adequada

### **PROCESSO OBRIGATÓRIO:**
1. **ANALISAR** impacto detalhadamente
2. **DOCUMENTAR** todos os riscos
3. **AUTORIZAR** implementação expressamente
4. **TESTAR** completamente
5. **MONITORAR** resultados
6. **AUDITAR** operações

### **PRINCÍPIOS INVIOLÁVEIS:**
- ✅ **Preservação** de funcionalidades existentes
- ✅ **Segurança** em todas as camadas
- ✅ **Auditoria** de todas as operações
- ✅ **Testes** antes de qualquer deploy
- ✅ **Documentação** de todas as mudanças
- ✅ **Autorização** para mudanças de impacto

---

**Estas Guardian Rules são INVIOLÁVEIS e garantem a estabilidade, segurança e continuidade do sistema!** 🛡️

**Versão:** 1.1  
**Última atualização:** 2025-11-07  
**Status:** 🚨 **ATIVO E OBRIGATÓRIO**
