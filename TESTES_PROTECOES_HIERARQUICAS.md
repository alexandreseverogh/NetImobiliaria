# 🧪 GUIA DE TESTES - PROTEÇÕES HIERÁRQUICAS

**Data:** 30/10/2024  
**Objetivo:** Validar proteções hierárquicas implementadas  
**Duração estimada:** 15-20 minutos

---

## 📋 PRÉ-REQUISITOS

1. ✅ Servidor rodando: `npm run dev`
2. ✅ Banco de dados acessível
3. ✅ Navegador com console aberto (F12)

---

## 👥 USUÁRIOS PARA TESTE

| Username | Senha | Perfil | Nível |
|----------|-------|--------|-------|
| **admin** | admin@123 | Super Admin | 4 |
| **Nunes** | Nunes@123 | Gerente NET | 3 |
| **Gisele** | ??? | Super Admin | 4 |

---

## 🧪 BATERIA DE TESTES

### **TESTE 1: Nunes tenta EXCLUIR admin (DEVE BLOQUEAR)**

**Passos:**
1. Login como `Nunes/Nunes@123`
2. Ir para `/admin/usuarios`
3. Tentar excluir o usuário **admin**

**Resultado esperado:**
- 🚫 Erro: "Apenas Super Admins podem gerenciar outros Super Admins"
- ❌ Exclusão NÃO executada
- 📝 Log no console do servidor: `🚫 Bloqueado por hierarquia`

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 2: Nunes tenta EDITAR admin (DEVE BLOQUEAR)**

**Passos:**
1. Login como `Nunes/Nunes@123`
2. Ir para `/admin/usuarios`
3. Clicar em editar (lápis) no usuário **admin**
4. Tentar salvar qualquer alteração

**Resultado esperado:**
- 🚫 Erro: "Apenas Super Admins podem gerenciar outros Super Admins"
- ❌ Edição NÃO executada

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 3: Nunes tenta se AUTO-EXCLUIR (DEVE BLOQUEAR)**

**Passos:**
1. Login como `Nunes/Nunes@123`
2. Ir para `/admin/usuarios`
3. Tentar excluir o próprio usuário **Nunes**

**Resultado esperado:**
- 🚫 Erro: "Você não pode gerenciar sua própria conta"
- ❌ Exclusão NÃO executada

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 4: admin EXCLUI Nunes (DEVE PERMITIR)**

**Passos:**
1. Login como `admin/admin@123`
2. Ir para `/admin/usuarios`
3. Tentar excluir o usuário **Nunes**
4. **ATENÇÃO:** Confirmar a exclusão
5. **IMPORTANTE:** Recriar o usuário Nunes depois!

**Resultado esperado:**
- ✅ Sucesso: "Usuário excluído com sucesso"
- ✅ Nunes removido da lista
- 📝 Log no console do servidor: `✅ Verificação hierárquica passou`

**Status:** [ ] Passou [ ] Falhou

**⚠️ PÓS-TESTE:** Recriar usuário Nunes!

---

### **TESTE 5: admin tenta se AUTO-EXCLUIR (DEVE BLOQUEAR)**

**Passos:**
1. Login como `admin/admin@123`
2. Ir para `/admin/usuarios`
3. Tentar excluir o próprio usuário **admin**

**Resultado esperado:**
- 🚫 Erro: "Você não pode gerenciar sua própria conta"
- ❌ Exclusão NÃO executada

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 6: admin exclui Gisele (último Super Admin - DEVE BLOQUEAR)**

**⚠️ IMPORTANTE:** Este teste só funciona se Gisele for o último Super Admin ativo!

**Passos:**
1. Login como `admin/admin@123`
2. Ir para `/admin/usuarios`
3. Verificar quantos Super Admins existem
4. Se houver apenas 1, tentar excluir
5. Se houver 2 (admin + Gisele), pular este teste

**Resultado esperado (se houver apenas 1):**
- 🚫 Erro: "Não é possível excluir o último Super Admin ativo do sistema"
- ❌ Exclusão NÃO executada

**Status:** [ ] Passou [ ] Falhou [ ] N/A (mais de 1 admin)

---

### **TESTE 7: Nunes tenta ATRIBUIR perfil Super Admin a alguém (DEVE BLOQUEAR)**

**Passos:**
1. Login como `Nunes/Nunes@123`
2. Ir para `/admin/usuarios`
3. Selecionar qualquer usuário (ex: criar um novo usuário teste)
4. Tentar atribuir perfil "Super Admin"

**Resultado esperado:**
- 🚫 Erro: "Você não pode atribuir perfis de nível igual ou superior ao seu"
- ❌ Atribuição NÃO executada

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 8: admin ATRIBUI perfil Gerente a usuário (DEVE PERMITIR)**

**Passos:**
1. Login como `admin/admin@123`
2. Ir para `/admin/usuarios`
3. Selecionar usuário de nível inferior
4. Atribuir perfil "Gerente de Vendas" (nível 3)

**Resultado esperado:**
- ✅ Sucesso: "Perfil atribuído com sucesso"
- ✅ Usuário agora tem o novo perfil
- 📝 Log: `✅ Verificação hierárquica passou`

**Status:** [ ] Passou [ ] Falhou

---

### **TESTE 9: Nunes tenta REMOVER perfil de admin (DEVE BLOQUEAR)**

**Passos:**
1. Login como `Nunes/Nunes@123`
2. Ir para `/admin/usuarios`
3. Tentar remover perfil do usuário **admin**

**Resultado esperado:**
- 🚫 Erro: "Apenas Super Admins podem gerenciar outros Super Admins"
- ❌ Remoção NÃO executada

**Status:** [ ] Passou [ ] Falhou

---

## 📊 RESUMO DE RESULTADOS

### **Proteções validadas:**

| # | Teste | Status |
|---|-------|--------|
| 1 | Nunes → Excluir admin | [ ] |
| 2 | Nunes → Editar admin | [ ] |
| 3 | Nunes → Auto-excluir | [ ] |
| 4 | admin → Excluir Nunes | [ ] |
| 5 | admin → Auto-excluir | [ ] |
| 6 | Excluir último admin | [ ] |
| 7 | Nunes → Atribuir Super Admin | [ ] |
| 8 | admin → Atribuir Gerente | [ ] |
| 9 | Nunes → Remover perfil admin | [ ] |

### **Critério de aprovação:**

- ✅ **MÍNIMO:** 8/9 testes passando
- ✅ **IDEAL:** 9/9 testes passando

---

## 🔍 COMO VERIFICAR LOGS

### **Console do navegador (F12):**

Procure por:
```
🚫 Bloqueado por hierarquia: [mensagem]
✅ Verificação hierárquica passou
```

### **Console do servidor (terminal):**

Procure por:
```
🛡️ PROTEÇÃO HIERÁRQUICA
🚫 Bloqueado por hierarquia: [mensagem]
✅ Verificação hierárquica passou - pode [ação]
```

---

## ⚠️ TROUBLESHOOTING

### **Problema: Testes não bloqueiam quando deveriam**

**Possíveis causas:**
1. Código não foi salvo/recompilado
2. Servidor não foi reiniciado
3. Cache do navegador (Ctrl+Shift+R)

**Solução:**
1. Parar servidor (Ctrl+C)
2. Limpar cache Next.js: `rm -rf .next`
3. Reiniciar: `npm run dev`

### **Problema: Erro 500 em vez de 403**

**Causa:** Função de hierarquia com erro

**Solução:**
1. Verificar logs do servidor
2. Verificar se funções foram exportadas corretamente
3. Verificar se imports dinâmicos funcionaram

---

## 📝 RELATÓRIO DE TESTE

Após completar todos os testes, preencha:

**Data:** ___/___/2024  
**Testado por:** _____________  
**Testes passaram:** ___/9  
**Bloqueios críticos:** [ ] SIM [ ] NÃO  
**Proteções funcionando:** [ ] SIM [ ] NÃO

**Observações:**
_____________________________________
_____________________________________
_____________________________________

---

## ✅ APROVAÇÃO

[ ] **APROVADO** - Todas as proteções funcionando  
[ ] **REPROVADO** - Correções necessárias  
[ ] **PARCIAL** - Alguns testes falharam

**Próximos passos:**
- Se aprovado: Marcar como completo
- Se reprovado: Identificar e corrigir falhas
- Se parcial: Avaliar criticidade das falhas

