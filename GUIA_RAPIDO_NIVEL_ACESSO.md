# ⚡ GUIA RÁPIDO: NÍVEL DE ACESSO

## 🎯 **CONCEITO BÁSICO**

```
NÍVEL 1 = MAIS PODER 👑
NÍVEL 10 = MENOS PODER 👤
```

**Regra de Ouro:**
> Você **SÓ PODE GERENCIAR** perfis com números **MAIORES** que o seu

---

## 📊 **EXEMPLO VISUAL**

```
┌────────────────────────────────────────────────────┐
│  NÍVEL 1: Super Admin 👑                          │
│     ↓ pode gerenciar                              │
│  NÍVEL 2: Admin 🎯                                │
│     ↓ pode gerenciar                              │
│  NÍVEL 3: Gerente 📋                              │
│     ↓ pode gerenciar                              │
│  NÍVEL 4: Corretor 🏠                             │
│     ↓ pode gerenciar                              │
│  NÍVEL 5: Estagiário 📝                           │
└────────────────────────────────────────────────────┘
```

---

## ✅ **O QUE VOCÊ PODE FAZER**

Se você é **Admin (Nível 2)**, você PODE:

| Ação | Perfis Permitidos |
|------|-------------------|
| ➕ **Criar** | Nível 3, 4, 5... |
| ✏️ **Editar** | Nível 3, 4, 5... |
| 🗑️ **Excluir** | Nível 3, 4, 5... |
| 🔐 **Configurar Permissões** | Nível 3, 4, 5... |

---

## ❌ **O QUE VOCÊ NÃO PODE FAZER**

Se você é **Admin (Nível 2)**, você NÃO PODE:

| Ação | Motivo |
|------|--------|
| ➕ Criar Super Admin (1) | Nível superior ao seu |
| ✏️ Editar outro Admin (2) | Mesmo nível |
| 🗑️ Excluir Super Admin (1) | Protegido pelo sistema |
| 🔐 Configurar seu próprio perfil | Conflito de interesse |

---

## 🎮 **COMO FUNCIONA NO MODAL**

### **Ao criar um novo perfil:**

```
Você é: Admin (Nível 2)

Opções disponíveis no campo "Nível de Acesso":
✅ 3 - Gerente
✅ 4 - Corretor  
✅ 5 - Estagiário
✅ 6, 7, 8, 9, 10...

Opções bloqueadas:
🔒 1 - Super Admin (superior ao seu)
🔒 2 - Admin (igual ao seu)
```

---

## 💡 **DICAS PRÁTICAS**

### **1. Planejamento de Níveis**
```
Reserve níveis baixos para cargos estratégicos:
- Nível 1-2: Direção
- Nível 3-4: Gerência
- Nível 5-6: Operacional
- Nível 7-10: Suporte/Estagiários
```

### **2. Hierarquia Clara**
```
✅ BOM: Diferenças de 1 nível entre cargos relacionados
   Admin (2) → Gerente (3) → Corretor (4)

❌ EVITE: Pular muitos níveis
   Admin (2) → Corretor (8)
```

### **3. Flexibilidade Futura**
```
Deixe espaço entre níveis para crescimento:
✅ Admin (2) → Gerente (4) → Corretor (6)
   (permite adicionar cargos intermediários depois)
```

---

## 🚨 **PROTEÇÕES DO SISTEMA**

### **Super Admin (Nível 1)**
- ⛔ **Não pode ser excluído**
- ⛔ **Não pode ter nível alterado**
- ✅ **Pode gerenciar TODOS os outros perfis**

### **Seu Próprio Perfil**
- ⛔ **Não pode editar a si mesmo**
- ⛔ **Não pode criar perfil de mesmo nível**
- ⛔ **Não pode se auto-promover**

---

## 📋 **CHECKLIST ANTES DE CRIAR PERFIL**

- [ ] Escolhi um nome claro e descritivo?
- [ ] Defini uma descrição completa?
- [ ] Selecionei o nível correto na hierarquia?
- [ ] O nível é inferior ao meu?
- [ ] Este perfil terá 2FA obrigatório?
- [ ] Marquei como ativo?

---

## 🎯 **RESUMO EM 3 PONTOS**

1. **Menor número = Mais poder**
2. **Só gerencia níveis superiores (números maiores)**
3. **Sistema bloqueia automaticamente ações inválidas**

---

**Dúvidas?** Acesse: [EXPLICACAO_NIVEL_ACESSO.md](./EXPLICACAO_NIVEL_ACESSO.md) para detalhes completos



