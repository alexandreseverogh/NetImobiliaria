# 📊 EXPLICAÇÃO COMPLETA: NÍVEL DE ACESSO DOS PERFIS

## 🎯 **O QUE É O NÍVEL DE ACESSO?**

O **Nível de Acesso** é um número de **1 a 10** que define a **hierarquia** e **poder** de cada perfil no sistema.

```
MAIOR PODER (1) ──────────────────────────► MENOR PODER (10)
    Super Admin                                   Estagiário
```

---

## 🔢 **COMO FUNCIONA A NUMERAÇÃO?**

### **REGRA BÁSICA:**
- **Números MENORES** = **MAIS PODER**
- **Números MAIORES** = **MENOS PODER**

### **EXEMPLO DE HIERARQUIA:**

```
Nível 1  ⭐⭐⭐⭐⭐  Super Admin      (Poder Total)
Nível 2  ⭐⭐⭐⭐    Administrador    (Muito Poder)
Nível 3  ⭐⭐⭐      Gerente          (Poder Médio-Alto)
Nível 4  ⭐⭐        Corretor         (Poder Médio)
Nível 5  ⭐          Estagiário       (Poder Limitado)
```

---

## 🎮 **IMPACTOS DO NÍVEL DE ACESSO**

### **1. GERENCIAMENTO DE OUTROS PERFIS** 👥

Um perfil **SÓ PODE GERENCIAR** perfis de nível **INFERIOR** (número maior).

#### **Exemplo Prático:**

```
✅ Admin (Nível 2) PODE gerenciar:
   - Gerente (Nível 3)
   - Corretor (Nível 4)
   - Estagiário (Nível 5)

❌ Admin (Nível 2) NÃO PODE gerenciar:
   - Super Admin (Nível 1)
   - Outro Admin (Nível 2)
```

#### **Operações que dependem da hierarquia:**
- ✏️ **Criar** novos perfis
- 📝 **Editar** perfis existentes
- 🗑️ **Excluir** perfis
- 🔐 **Configurar permissões** de perfis
- 👤 **Atribuir perfis** a usuários

---

### **2. CRIAÇÃO DE NOVOS PERFIS** ➕

Um perfil **SÓ PODE CRIAR** perfis com nível **INFERIOR** ao seu próprio nível.

#### **Exemplo Prático:**

```
Admin (Nível 2) está logado:

✅ PODE criar perfis com níveis:
   - Nível 3 (Gerente)
   - Nível 4 (Corretor)
   - Nível 5 (Estagiário)
   - Nível 6, 7, 8, 9, 10...

❌ NÃO PODE criar perfis com níveis:
   - Nível 1 (Super Admin)
   - Nível 2 (mesmo nível do Admin)

🔒 BLOQUEIO: O modal não permitirá selecionar níveis iguais ou superiores
```

---

### **3. EDIÇÃO DE PERFIS EXISTENTES** ✏️

Um perfil **SÓ PODE EDITAR** perfis de nível **INFERIOR**.

#### **Exemplo Prático:**

```
Gerente (Nível 3) está logado:

✅ PODE editar:
   - Corretor (Nível 4)
   - Estagiário (Nível 5)
   - Qualquer perfil de nível 6+

❌ NÃO PODE editar:
   - Super Admin (Nível 1)
   - Admin (Nível 2)
   - Outro Gerente (Nível 3)

🔒 BLOQUEIO: Botão de edição não aparecerá para perfis de nível igual ou superior
```

---

### **4. CONFIGURAÇÃO DE PERMISSÕES** 🔐

Um perfil **SÓ PODE CONFIGURAR PERMISSÕES** de perfis que ele pode gerenciar.

#### **Exemplo Prático:**

```
Admin (Nível 2) está logado:

✅ PODE configurar permissões de:
   - Gerente (Nível 3)
   - Corretor (Nível 4)
   - Estagiário (Nível 5)

❌ NÃO PODE configurar permissões de:
   - Super Admin (Nível 1)
   - Outro Admin (Nível 2)

🔒 BLOQUEIO: Botão "Permissões" não aparecerá para perfis de nível igual ou superior
```

---

### **5. EXCLUSÃO DE PERFIS** 🗑️

Um perfil **SÓ PODE EXCLUIR** perfis de nível **INFERIOR**.

#### **Regras Especiais:**
- ⛔ **Super Admin NUNCA pode ser excluído** (proteção do sistema)
- ⛔ **Não se pode excluir o próprio perfil**

#### **Exemplo Prático:**

```
Admin (Nível 2) está logado:

✅ PODE excluir:
   - Gerente (Nível 3)
   - Corretor (Nível 4)
   - Estagiário (Nível 5)

❌ NÃO PODE excluir:
   - Super Admin (Nível 1) - PROTEÇÃO DO SISTEMA
   - Outro Admin (Nível 2)

🔒 BLOQUEIO: Botão de exclusão não aparecerá para perfis de nível igual ou superior
```

---

### **6. ATRIBUIÇÃO DE PERFIS A USUÁRIOS** 👤

Um usuário **SÓ PODE ATRIBUIR** perfis de nível **INFERIOR** ao seu próprio perfil.

#### **Exemplo Prático:**

```
Gerente (Nível 3) está criando um novo usuário:

✅ PODE atribuir perfis:
   - Corretor (Nível 4)
   - Estagiário (Nível 5)

❌ NÃO PODE atribuir perfis:
   - Super Admin (Nível 1)
   - Admin (Nível 2)
   - Gerente (Nível 3)

🔒 BLOQUEIO: Lista de perfis no cadastro de usuários mostrará apenas perfis permitidos
```

---

## 📋 **TABELA RESUMO DE PERMISSÕES POR NÍVEL**

| Ação | Regra | Exemplo |
|------|-------|---------|
| **Criar Perfil** | Nível do novo perfil > Nível do criador | Admin (2) cria Corretor (4) ✅ |
| **Editar Perfil** | Nível do perfil alvo > Nível do editor | Gerente (3) edita Estagiário (5) ✅ |
| **Excluir Perfil** | Nível do perfil alvo > Nível do excluidor | Admin (2) exclui Corretor (4) ✅ |
| **Configurar Permissões** | Nível do perfil alvo > Nível do configurador | Gerente (3) configura Corretor (4) ✅ |
| **Atribuir a Usuário** | Nível do perfil > Nível do atribuidor | Admin (2) atribui Gerente (3) ✅ |

---

## 🎨 **VISUALIZAÇÃO NO MODAL "CRIAR NOVO PERFIL"**

### **Campo: Nível de Acesso***

```
┌─────────────────────────────────────────┐
│ Nível de Acesso*                        │
│ ┌─────────────────────────────────────┐ │
│ │ 1 - Super Admin (Mais Alto)      ▼ │ │  ← Pode estar bloqueado
│ └─────────────────────────────────────┘ │
│                                         │
│ Opções disponíveis (exemplo Admin):    │
│ - 3 - Gerente                          │
│ - 4 - Corretor                         │
│ - 5 - Estagiário                       │
│ - 6 - Nível 6                          │
│ - 7 - Nível 7                          │
│ - 8 - Nível 8                          │
│ - 9 - Nível 9                          │
│ - 10 - Nível 10 (Mais Baixo)          │
│                                         │
│ 🔒 Níveis 1 e 2 bloqueados             │
│    (seu perfil é nível 2)              │
└─────────────────────────────────────────┘
```

---

## 🔐 **VALIDAÇÕES AUTOMÁTICAS NO SISTEMA**

### **1. Validação no Modal de Criação**
- ✅ Lista suspensa mostra **apenas níveis permitidos**
- ❌ Níveis iguais ou superiores ao usuário **não aparecem**

### **2. Validação na API**
- ✅ Backend valida hierarquia antes de criar/editar
- ❌ Retorna erro se usuário tentar burlar validação frontend

### **3. Validação Visual na Listagem**
- ✅ Botões de ação aparecem **apenas para perfis gerenciáveis**
- ❌ Perfis de nível igual ou superior mostram "Sem permissão"

---

## 💡 **CASOS DE USO PRÁTICOS**

### **Caso 1: Empresa com Hierarquia Simples**

```
Nível 1: Super Admin (Dono da Imobiliária)
Nível 2: Admin (Gerente Geral)
Nível 3: Corretor Senior
Nível 4: Corretor Junior
Nível 5: Estagiário
```

**Fluxo:**
1. Super Admin cria perfil Admin
2. Admin cria perfis Corretor Senior e Junior
3. Corretor Senior pode gerenciar Estagiários
4. Corretor Junior não pode gerenciar ninguém

---

### **Caso 2: Empresa com Múltiplos Departamentos**

```
Nível 1: Super Admin (CEO)
Nível 2: Admin (Diretor)
Nível 3: Gerente de Vendas
Nível 4: Gerente de Marketing
Nível 5: Corretor de Vendas
Nível 6: Analista de Marketing
Nível 7: Assistente
```

**Fluxo:**
1. Super Admin cria Admin
2. Admin cria Gerentes (Vendas e Marketing)
3. Gerente de Vendas gerencia Corretores
4. Gerente de Marketing gerencia Analistas
5. Ambos gerentes podem gerenciar Assistentes

---

## 🎯 **BENEFÍCIOS DO SISTEMA DE NÍVEIS**

### **1. Segurança** 🔒
- Impede que usuários criem perfis mais poderosos que eles
- Protege configurações críticas do sistema

### **2. Hierarquia Clara** 📊
- Estrutura organizacional bem definida
- Fácil entender quem pode fazer o quê

### **3. Escalabilidade** 📈
- Suporta até 10 níveis diferentes
- Flexível para crescimento da empresa

### **4. Auditoria** 📝
- Sistema registra quem criou/editou cada perfil
- Rastreabilidade completa de mudanças

---

## ⚠️ **AVISOS IMPORTANTES**

### **🚨 Super Admin (Nível 1)**
- **PROTEÇÃO MÁXIMA**: Não pode ser editado ou excluído
- **ACESSO TOTAL**: Pode gerenciar TODOS os outros perfis
- **ÚNICO**: Deve haver apenas 1 Super Admin

### **🔒 Seu Próprio Perfil**
- Você **NÃO PODE** editar seu próprio perfil
- Você **NÃO PODE** criar perfil de nível igual ao seu
- Você **NÃO PODE** se auto-promover

### **📊 Níveis Personalizados**
- Você pode criar níveis personalizados (3-10)
- Não precisa usar todos os 10 níveis
- Escolha níveis que façam sentido para sua estrutura

---

## 🔄 **FLUXO COMPLETO DE CRIAÇÃO**

```
1. Usuário clica em "Novo Perfil"
   ↓
2. Modal abre com campos:
   - Nome
   - Descrição
   - Nível (apenas opções permitidas)
   - Ativo
   - 2FA Obrigatório
   ↓
3. Usuário seleciona Nível inferior ao seu
   ↓
4. Frontend valida seleção
   ↓
5. API valida hierarquia novamente
   ↓
6. Se aprovado: Perfil é criado
   ↓
7. Novo perfil aparece na lista
   ↓
8. Usuário pode configurar permissões do novo perfil
```

---

## 📞 **RESUMO EXECUTIVO**

> **O Nível de Acesso define a hierarquia do sistema.**
> 
> **Regra de Ouro:**
> - Números **MENORES** = **MAIS PODER**
> - Você **SÓ PODE GERENCIAR** perfis com números **MAIORES** que o seu
> 
> **Exemplo Simples:**
> - Se você é nível **3**, pode gerenciar níveis **4, 5, 6, 7, 8, 9, 10**
> - Mas **NÃO PODE** gerenciar níveis **1, 2, 3**

---

## 🎓 **PARA SABER MAIS**

- 📄 Veja a página de **Hierarquia de Perfis**: `/admin/hierarchy`
- 🔐 Configure **Permissões**: `/admin/permissions`
- 👥 Gerencie **Perfis**: `/admin/roles`

---

**Criado por:** Sistema Net Imobiliária  
**Data:** 08/10/2025  
**Versão:** 1.0



