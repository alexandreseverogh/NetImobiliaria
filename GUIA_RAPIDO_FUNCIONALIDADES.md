# ⚡ GUIA RÁPIDO: GESTÃO DE FUNCIONALIDADES

## 🎯 O QUE FAZ?

Sistema para adicionar **novas funcionalidades** ao sistema administrativo de forma **automática e padronizada**.

---

## 🚀 COMO ACESSAR?

1. Login como `admin` (Super Admin)
2. Sidebar → **"Painel Administrativo"** → **"Funcionalidades"**

---

## ➕ CRIAR NOVA FUNCIONALIDADE

### **PASSO 1: Abrir Formulário**
Clique no botão **"➕ Nova Funcionalidade"**

### **PASSO 2: Preencher Dados**

| Campo | Exemplo | Obrigatório |
|-------|---------|-------------|
| **Nome** | "Contratos de Locação" | ✅ Sim |
| **Descrição** | "Gerenciar contratos de locação de imóveis" | ✅ Sim |
| **Categoria** | "contratos" | ✅ Sim |
| **URL** | "/admin/contratos" | ✅ Sim |
| **Tipo** | CRUD ou Single-Use | ✅ Sim |

### **PASSO 3: Opções Adicionais**

- ☑️ **Atribuir ao Super Admin automaticamente** (recomendado)
- ☑️ **Adicionar à sidebar** (se quiser que apareça no menu)

### **PASSO 4: Criar**
Clique em **"Criar Funcionalidade"**

---

## 🔄 TIPOS DE FUNCIONALIDADE

### **CRUD** (Cadastro Completo)
✅ Cria **4 permissões**:
- `create` - Criar novos registros
- `read` - Visualizar registros
- `update` - Editar registros
- `delete` - Excluir registros

**Use quando**: Precisar de listagem e manipulação de dados (ex: Contratos, Imóveis, Clientes)

---

### **Single-Use** (Ação Única)
✅ Cria **1 permissão**:
- `execute` - Executar a ação

**Use quando**: Funcionalidade específica sem CRUD (ex: Exportar Relatório, Sincronizar Dados, Mudança de Status)

---

## ✏️ EXEMPLO PRÁTICO

### **Criar CRUD de "Contratos de Locação"**

```
Nome: Contratos de Locação
Descrição: Gerenciar contratos de locação de imóveis
Categoria: contratos
URL: /admin/contratos
Tipo: CRUD
☑️ Atribuir ao Super Admin
☑️ Adicionar à sidebar
```

**Resultado após clicar em "Criar"**:
```
✅ Funcionalidade "Contratos de Locação" criada com sucesso!
✅ 4 permissões geradas automaticamente
✅ Permissões atribuídas ao Super Admin

📋 Para adicionar à sidebar, edite AdminSidebar.tsx:
{
  name: 'Contratos de Locação',
  href: '/admin/contratos',
  icon: DocumentTextIcon,
  resource: 'contratos'
}
```

---

## 🎨 O QUE A INTERFACE MOSTRA?

### **Listagem de Funcionalidades**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Buscar...                        [Todas] ▼  [➕ Nova]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Contratos de Locação                    [✅ Ativo]      │
│    Gerenciar contratos de locação de imóveis               │
│    contratos | /admin/contratos | 4 permissões             │
│    [✏️ Editar] [🗑️ Excluir]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📊 Funcionalidades do Sistema              [✅ Ativo]      │
│    Gerenciar funcionalidades e permissões do sistema       │
│    system-features | /admin/system-features | 4 permissões │
│    [✏️ Editar] [🗑️ Excluir]                                 │
└─────────────────────────────────────────────────────────────┘
```

### **Badges de Status**
- 🟢 **Ativo**: Funcionalidade operacional
- 🔴 **Inativo**: Funcionalidade desativada (não aparece na sidebar)

### **Contador de Permissões**
- Mostra quantas permissões foram criadas para cada funcionalidade
- CRUD: 4 permissões
- Single-Use: 1 permissão

---

## 🔐 DEPOIS DE CRIAR, O QUE FAZER?

### **1. Atribuir a Outros Perfis** (Opcional)
Se quiser que `Admin` ou `Corretor` também tenham acesso:

**Opção A**: Gestão de Perfis
1. Sidebar → "Painel Administrativo" → "Gestão de Perfis"
2. Selecionar perfil (ex: "Admin")
3. Clicar em "🔒 Gerenciar Permissões"
4. Marcar as permissões da nova funcionalidade

**Opção B**: Configurar Permissões (Matriz)
1. Sidebar → "Painel Administrativo" → "Configurar Permissões"
2. Selecionar perfis na matriz
3. Marcar permissões

### **2. Adicionar à Sidebar** (Se marcou a opção)
Editar `src/components/admin/AdminSidebar.tsx`:

```typescript
{
  name: 'Contratos de Locação',
  href: '/admin/contratos',
  icon: DocumentTextIcon,
  resource: 'contratos',
  roles: ['Super Admin', 'Administrador']
}
```

### **3. Criar a Página Frontend**
Criar `src/app/admin/contratos/page.tsx` com a interface

### **4. Criar as APIs**
Criar `src/app/api/admin/contratos/route.ts` com os endpoints

---

## 🛠️ REGRAS DE CATEGORIA

A **categoria** deve seguir `kebab-case`:
- ✅ `contratos`
- ✅ `tipos-imoveis`
- ✅ `categorias-amenidades`
- ❌ `Contratos`
- ❌ `Tipos de Imóveis`
- ❌ `categorias_amenidades`

**Por quê?** A categoria é usada internamente para mapear permissões.

---

## ⚠️ ATENÇÕES

### **❌ NÃO EXCLUIR SEM PENSAR**
- Ao excluir uma funcionalidade, **todas as permissões são removidas**
- Usuários perdem acesso imediatamente
- **Ação irreversível!**

### **✅ USAR DESATIVAR AO INVÉS DE EXCLUIR**
- Se não quer que apareça na sidebar, **desative** ao invés de excluir
- Funcionalidades inativas podem ser reativadas depois
- Histórico é mantido

---

## 🎯 CHECKLIST COMPLETO

### ✅ **Criar Funcionalidade**
- [ ] Login como Super Admin
- [ ] Acessar "Painel Administrativo" → "Funcionalidades"
- [ ] Clicar em "Nova Funcionalidade"
- [ ] Preencher todos os campos obrigatórios
- [ ] Escolher tipo (CRUD ou Single-Use)
- [ ] Marcar "Atribuir ao Super Admin"
- [ ] Marcar "Adicionar à sidebar" (se aplicável)
- [ ] Criar

### ✅ **Implementar Funcionalidade**
- [ ] Criar página frontend (`src/app/admin/[categoria]/page.tsx`)
- [ ] Criar API backend (`src/app/api/admin/[categoria]/route.ts`)
- [ ] Adicionar à sidebar (se marcou a opção)
- [ ] Testar acesso como Super Admin
- [ ] Atribuir a outros perfis (se necessário)
- [ ] Testar acesso com outros perfis

---

## 📞 PERGUNTAS FREQUENTES

### **1. Posso editar as permissões depois?**
Não pela interface de "Funcionalidades". Use "Gestão de Perfis" ou "Configurar Permissões".

### **2. Posso mudar o tipo de CRUD para Single-Use?**
Não. Crie uma nova funcionalidade.

### **3. A sidebar atualiza automaticamente?**
Não. Você precisa editar manualmente `AdminSidebar.tsx` seguindo as instruções.

### **4. Posso criar duas funcionalidades com a mesma categoria?**
Sim! Categoria é só para agrupamento. O nome e URL devem ser únicos.

### **5. Como renomear uma funcionalidade?**
Use o botão "Editar" ao lado da funcionalidade.

---

## 🎉 PRONTO!

Agora você pode adicionar **novas funcionalidades ao sistema de forma profissional e padronizada**!

**Tempo estimado**: 2-3 minutos para criar uma nova funcionalidade 🚀



