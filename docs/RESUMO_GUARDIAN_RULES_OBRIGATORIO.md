# 🛡️ RESUMO OBRIGATÓRIO: GUARDIAN RULES
## O que DEVO cumprir e o que JAMAIS posso fazer

**Data:** 2025-01-24  
**Status:** 🚨 **INVIOLÁVEL E OBRIGATÓRIO**

---

## 🚨 REGRA PRIMORDIAL - FUNDAÇÃO DE TUDO

### ✅ **DEVO SEMPRE:**
- **INCREMENTAL SIM, DESTRUTIVO NUNCA!**
- Implementar mudanças de forma incremental
- Analisar minuciosamente antes de qualquer implementação
- Solicitar autorização expressa para mudanças que impactem funcionalidades existentes

### ❌ **JAMAIS POSSO:**
- Destruir funcionalidades existentes
- Modificar tabelas/APIs existentes sem autorização
- Mudar lógica de negócio ativa sem análise prévia
- Alterar permissões/roles em uso sem aprovação
- Prosseguir com qualquer risco de quebrar funcionalidades

---

## 🔍 PROTOCOLO DE IMPACTO - OBRIGATÓRIO

### ✅ **DEVO SEMPRE:**

#### **1. ANÁLISE DE IMPACTO MANDATÓRIA**
- Criar documento `ANALISE_IMPACTO_[NOME].md` antes de qualquer implementação
- Identificar TODAS as funcionalidades que podem ser afetadas
- Avaliar TODOS os riscos possíveis
- Criar plano de rollback testado
- Comunicar riscos ao usuário
- Aguardar autorização expressa

#### **2. INVENTÁRIO DE DEPENDÊNCIAS**
- Consultar `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` para alterações em:
  - Cadastros de clientes
  - Cadastros de proprietários
  - Imóveis
  - Integrações públicas
- Atualizar inventário ANTES de concluir análise de impacto
- Anexar resumo das dependências no documento de análise

#### **3. BLOQUEIOS AUTOMÁTICOS**
Se identificar qualquer um destes cenários, DEVO:
1. **PARAR** implementação imediatamente
2. **AGUARDAR** autorização expressa
3. **NÃO** prosseguir sem aprovação

**Cenários que requerem bloqueio:**
- 🔴 Alto risco de quebrar funcionalidades
- 🔴 Modificação de tabelas/APIs ativas
- 🔴 Mudança em lógica de negócio existente
- 🔴 Alteração de permissões/roles ativos

---

## 🔐 REGRAS DE SEGURANÇA - INVIOLÁVEIS

### ✅ **DEVO SEMPRE:**

#### **1. Autenticação e Autorização**
- Criar rotas COM middleware de autenticação
- Validar JWT em todas as rotas protegidas
- Verificar permissões em todas as camadas
- Usar prepared statements (nunca SQL injection)
- Registrar auditoria adequada

#### **2. RBAC (Role-Based Access Control)**
- Criar funcionalidades COM sistema de permissões
- Verificar nível hierárquico antes de permitir acesso
- Respeitar hierarquia: `ADMIN` ≥ `DELETE` ≥ `UPDATE` ≥ `CREATE` ≥ `EXECUTE` ≥ `READ`
- Usar guards específicos: `CreateGuard`, `UpdateGuard`, `DeleteGuard`, `ExecuteGuard`
- Usar `sf.slug` para identificar recursos (ZERO hardcoding)

#### **3. 2FA (Two-Factor Authentication)**
- Manter 2FA obrigatório para operações críticas
- Validar código 2FA quando obrigatório
- Criar códigos com expiração ≤ 10 minutos

#### **4. Rate Limiting**
- Manter rate limiting ativo
- Limitar tentativas de login: ≤ 5 por 15 min
- Limitar tentativas por IP: ≤ 10 por 15 min

### ❌ **JAMAIS POSSO:**

#### **1. Bypass de Segurança**
- ❌ Criar rotas sem middleware de autenticação
- ❌ Remover verificação de JWT
- ❌ Permitir acesso direto sem validação de permissões
- ❌ Hardcodar senhas ou tokens
- ❌ Usar SQL injection (sempre prepared statements)

#### **2. Ignorar RBAC**
- ❌ Criar funcionalidades sem sistema de permissões
- ❌ Permitir acesso sem verificação de nível hierárquico
- ❌ Criar perfis com nível superior ao meu
- ❌ Editar meu próprio perfil ou perfis de mesmo nível
- ❌ Excluir Super Admin (nível 1)

#### **3. Bypass de 2FA**
- ❌ Desabilitar 2FA para operações críticas
- ❌ Permitir acesso sem código 2FA quando obrigatório
- ❌ Criar códigos 2FA com expiração > 10 minutos

#### **4. Rate Limiting**
- ❌ Desabilitar rate limiting
- ❌ Permitir > 5 tentativas de login por 15 min
- ❌ Permitir > 10 tentativas por IP por 15 min

---

## 🗄️ REGRAS DE BANCO DE DADOS - CRÍTICAS

### ✅ **DEVO SEMPRE:**

#### **1. Preservação de Dados**
- Preservar dados existentes
- Manter integridade referencial
- Criar foreign keys com ON DELETE CASCADE/SET NULL
- Fazer backup ANTES de qualquer mudança
- Usar transações para operações críticas

#### **2. Lógica de Permissões (INVIOLÁVEL)**
- Respeitar campo `Crud_Execute` em `system_features`
- Criar permissions baseado nesta regra:
  - `Crud_Execute = 'CRUD'` → Criar 4 permissions: `create`, `read`, `update`, `delete`
  - `Crud_Execute = 'EXECUTE'` → Criar 1 permission: `execute`
- Usar minúsculas para actions (`create`, `read`, não `CREATE`, `READ`)
- Verificar `Crud_Execute` antes de criar permissions

#### **3. Sistema de Permissões Granular (5 NÍVEIS)**
- Usar 5 níveis granulares (NÃO usar WRITE):
  - Nível 6: `admin` (ADMIN) - Controle total
  - Nível 5: `delete` (DELETE) - Excluir registros
  - Nível 4: `update` (UPDATE) - Editar registros
  - Nível 3: `create` (CREATE) - Criar novos registros
  - Nível 2: `execute` (EXECUTE) - Executar ação
  - Nível 1: `read`/`list` (READ) - Apenas visualizar
- Usar `sf.slug` para identificar recursos (ZERO hardcoding)
- Mapear nível mais ALTO que o usuário possui
- Usar guards específicos: `CreateGuard`, `UpdateGuard`, `DeleteGuard`, `ExecuteGuard`

#### **4. Transações**
- Usar transações para operações críticas
- Fazer commit/rollback adequadamente
- Controlar erros em operações em lote

### ❌ **JAMAIS POSSO:**

#### **1. Modificações Destrutivas**
- ❌ Deletar registros de `system_features` (usar `is_active = false`)
- ❌ Deletar registros de `permissions` (quebra referências)
- ❌ Deletar registros de `user_roles` sem verificar dependências
- ❌ Fazer DROP de tabelas sem backup completo
- ❌ Truncar tabelas com dados em produção

#### **2. Violação de Integridade**
- ❌ Criar foreign keys sem ON DELETE CASCADE/SET NULL
- ❌ Permitir `granted_by` NULL em permissões (auditoria obrigatória)
- ❌ Criar registros duplicados em tabelas com UNIQUE constraints
- ❌ Modificar estrutura sem migração adequada
- ❌ Alterar tipos de colunas sem conversão de dados

#### **3. Transações**
- ❌ Fazer operações críticas sem transação
- ❌ Deixar transações abertas sem commit/rollback
- ❌ Fazer operações em lote sem controle de erro

#### **4. Lógica de Permissões**
- ❌ Criar permissions duplicadas (maiúsculas e minúsculas)
- ❌ Criar permissions manualmente sem verificar `Crud_Execute`
- ❌ Usar `WriteGuard` (DEPRECATED - era confuso)
- ❌ Usar função `mapFeatureToResource` (DEPRECATED - usar slugs direto)
- ❌ Usar `WRITE` como nível de permissão (foi eliminado)

---

## 🎨 REGRAS DE INTERFACE - UX

### ✅ **DEVO SEMPRE:**
- Usar `PermissionGuard` adequadamente em todos os botões
- Seguir padrão Heroicons para ícones
- Manter consistência com design system
- Criar modais com validação adequada
- Garantir responsividade (mobile-first)
- Seguir breakpoints do Tailwind CSS
- Usar ARIA labels para acessibilidade
- Não usar apenas cor para transmitir informação
- Criar elementos navegáveis por teclado

### ❌ **JAMAIS POSSO:**
- Mostrar botões sem `PermissionGuard` adequado
- Permitir que usuários vejam opções que não podem usar
- Criar páginas de visualização sem guards nos botões
- Expor URLs diretas sem verificação de permissão
- Permitir acesso via URL sem validação de permissão
- Criar interfaces que não funcionam em mobile
- Ignorar breakpoints do Tailwind CSS
- Criar elementos que quebram em telas pequenas
- Ignorar ARIA labels
- Usar apenas cor para transmitir informação
- Criar elementos não navegáveis por teclado

---

## 🔧 REGRAS TÉCNICAS - CÓDIGO

### ✅ **DEVO SEMPRE:**

#### **1. TypeScript**
- Usar TypeScript adequadamente
- Criar componentes com interfaces tipadas
- Tratar erros adequadamente em requisições API
- Usar variável de ambiente `NODE_ENV` para logs (não console.log em produção)

#### **2. Reutilização**
- Reutilizar verificação de permissões (middleware já faz)
- Usar funções já existentes
- Refatorar código duplicado

#### **3. Performance**
- Evitar queries N+1 no banco
- Não carregar dados desnecessários
- Evitar loops desnecessários
- Otimizar bundle

#### **4. Acessibilidade**
- Usar ARIA labels
- Não usar apenas cor para transmitir informação
- Criar elementos navegáveis por teclado

### ❌ **JAMAIS POSSO:**
- Usar `any` em TypeScript
- Criar componentes sem interfaces tipadas
- Fazer requisições API sem tratamento de erro
- Usar console.log em produção
- Usar `@ts-ignore` sem justificativa
- Duplicar verificação de permissões (middleware já faz)
- Criar validações manuais quando middleware existe
- Reescrever funções já existentes
- Copiar código sem refatorar
- Fazer queries N+1 no banco
- Carregar dados desnecessários
- Fazer loops desnecessários
- Ignorar otimizações de bundle
- Ignorar ARIA labels
- Usar apenas cor para transmitir informação
- Criar elementos não navegáveis por teclado

---

## 📊 REGRAS DE AUDITORIA - RASTREABILIDADE

### ✅ **DEVO SEMPRE:**
- Registrar `granted_by` em permissões
- Registrar `assigned_by` em atribuições
- Logar tentativas de login (sucesso e falha)
- Registrar operações críticas
- Justificar permissões temporárias

### ❌ **JAMAIS POSSO:**
- Conceder permissões sem registrar `granted_by`
- Modificar perfis sem registrar quem fez
- Excluir dados sem log de auditoria
- Permitir `reason` NULL em permissões temporárias
- Fazer operações administrativas sem log
- Ignorar logs de tentativas de acesso negado

---

## 🚀 REGRAS DE PROCESSO - IMPLEMENTAÇÃO

### ✅ **DEVO SEMPRE:**

#### **1. Implementação Completa**
- Criar funcionalidades com todas as camadas (DB + API + Frontend)
- Implementar testando todos os perfis de usuário
- Executar testes de segurança antes de deploy
- Criar funcionalidades com documentação
- Fazer backup antes de deploy

#### **2. Sistema de Funcionalidades**
- Adicionar itens na sidebar APÓS criar em `system_features`
- Criar permissões associadas a funcionalidades
- Registrar adequadamente no banco antes de permitir acesso
- Criar rotas API COM middleware de permissão

#### **3. Testes**
- Executar testes de regressão antes de deploy
- Executar testes de segurança
- Testar com todos os perfis antes de deploy
- Executar testes de performance

### ❌ **JAMAIS POSSO:**
- Criar funcionalidades sem todas as camadas (DB + API + Frontend)
- Implementar sem testar todos os perfis de usuário
- Fazer deploy sem executar testes de segurança
- Criar funcionalidades sem documentação
- Fazer deploy sem backup
- Adicionar itens na sidebar sem criar em `system_features`
- Criar permissões sem associar a funcionalidades
- Permitir acesso sem registro adequado no banco
- Criar rotas API sem middleware de permissão
- Fazer deploy sem testes de regressão
- Ignorar testes de segurança
- Fazer deploy sem testar todos os perfis
- Fazer deploy sem testes de performance

---

## ✅ CHECKLIST GUARDIAN - OBRIGATÓRIO ANTES DE QUALQUER DESENVOLVIMENTO

### **🔍 Análise de Impacto**
- [ ] ✅ Identifiquei todas as funcionalidades que podem ser afetadas?
- [ ] ✅ Criei análise de impacto detalhada?
- [ ] ✅ Avaliei todos os riscos possíveis?
- [ ] ✅ Tenho plano de rollback testado?
- [ ] ✅ Comuniquei os riscos ao usuário?
- [ ] ✅ Recebi autorização expressa?

### **🛡️ Segurança**
- [ ] ✅ Vou seguir o sistema RBAC existente?
- [ ] ✅ Vou validar permissões em todas as camadas?
- [ ] ✅ Vou implementar 2FA quando necessário?
- [ ] ✅ Vou usar prepared statements?
- [ ] ✅ Vou registrar auditoria adequada?

### **🗄️ Banco de Dados**
- [ ] ✅ Vou preservar dados existentes?
- [ ] ✅ Vou manter integridade referencial?
- [ ] ✅ Vou criar foreign keys adequadas?
- [ ] ✅ Tenho backup antes de mudanças?
- [ ] ✅ Vou usar transações para operações críticas?

### **🎨 Interface**
- [ ] ✅ Vou usar PermissionGuard adequadamente?
- [ ] ✅ Vou seguir padrões de design existentes?
- [ ] ✅ Vou validar formulários adequadamente?
- [ ] ✅ Vou testar com todos os perfis?
- [ ] ✅ Vou garantir responsividade?

### **🔧 Código**
- [ ] ✅ Vou usar TypeScript adequadamente?
- [ ] ✅ Vou tratar erros adequadamente?
- [ ] ✅ Vou seguir padrões de código existentes?
- [ ] ✅ Vou documentar mudanças?
- [ ] ✅ Vou otimizar performance?

### **📊 Auditoria**
- [ ] ✅ Vou registrar todas as operações?
- [ ] ✅ Vou preencher campos de auditoria?
- [ ] ✅ Vou justificar permissões temporárias?
- [ ] ✅ Vou logar tentativas de acesso?

### **🚀 Processo**
- [ ] ✅ Vou implementar todas as camadas?
- [ ] ✅ Vou testar completamente?
- [ ] ✅ Vou documentar adequadamente?
- [ ] ✅ Consultei e atualizei `docs/INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md` quando aplicável?
- [ ] ✅ Vou seguir cronograma aprovado?
- [ ] ✅ Vou fazer backup antes de deploy?

---

## 🚨 PROTOCOLO DE EMERGÊNCIA

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

## 🎯 RESUMO DOS TRÊS PILARES FUNDAMENTAIS

### **1. 🛡️ SEGURANÇA**
- Nunca comprometer segurança existente
- Sempre validar permissões
- Sempre usar prepared statements
- Sempre registrar auditoria

### **2. 🔍 ANÁLISE**
- Sempre analisar impacto antes de implementar
- Sempre documentar riscos
- Sempre criar plano de rollback
- Sempre consultar inventário de dependências

### **3. ✅ AUTORIZAÇÃO**
- Nunca prosseguir sem aprovação adequada
- Sempre comunicar riscos
- Sempre aguardar autorização expressa
- Sempre seguir cronograma aprovado

---

## 📋 PROCESSO OBRIGATÓRIO

1. **ANALISAR** impacto detalhadamente
2. **DOCUMENTAR** todos os riscos
3. **AUTORIZAR** implementação expressamente
4. **TESTAR** completamente
5. **MONITORAR** resultados
6. **AUDITAR** operações

---

## 💡 PRINCÍPIOS INVIOLÁVEIS

- ✅ **Preservação** de funcionalidades existentes
- ✅ **Segurança** em todas as camadas
- ✅ **Auditoria** de todas as operações
- ✅ **Testes** antes de qualquer deploy
- ✅ **Documentação** de todas as mudanças
- ✅ **Autorização** para mudanças de impacto

---

**Estas Guardian Rules são INVIOLÁVEIS e garantem a estabilidade, segurança e continuidade do sistema!** 🛡️

**Versão:** 1.0  
**Data:** 2025-01-24  
**Status:** 🚨 **ATIVO E OBRIGATÓRIO**








