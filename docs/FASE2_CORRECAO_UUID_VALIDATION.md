# 🔧 FASE 2 - CORREÇÃO: Validação UUID em Edição

## ❌ PROBLEMA IDENTIFICADO:

Quando a página de edição era acessada por UUID (ex: `http://localhost:3000/admin/clientes/48ca0922-0b14-40fd-9d24-06edf4d14779/editar`):

1. **Estado e Cidade ficavam em branco**
2. **Validação de CPF/Email não funcionava**

---

## 🔍 CAUSA RAIZ:

As funções de validação `checkCPFExists` e `checkEmailExists` esperavam apenas **INTEGER** no parâmetro `excludeId`, mas quando a página usava UUID na URL, `params.id` era uma **string UUID**.

**Código antigo (ERRADO):**
```typescript
// clientes.ts
export async function checkCPFExists(cpf: string, excludeId?: number)

// Query gerada:
WHERE cpf = $1 AND id != $2
// Com UUID passado como $2 → ERRO!
```

---

## ✅ SOLUÇÃO IMPLEMENTADA:

### **1. Atualizado `checkCPFExists` em clientes.ts:**

```typescript
export async function checkCPFExists(
  cpf: string, 
  excludeId?: number | string  // ← Aceita ambos
): Promise<boolean> {
  try {
    let query = 'SELECT id, cpf FROM clientes WHERE cpf = $1'
    const params: any[] = [cpf]
    
    if (excludeId) {
      // Detectar se é UUID ou INTEGER
      const isUUID = typeof excludeId === 'string' && excludeId.includes('-')
      
      if (isUUID) {
        query += ' AND uuid != $2'  // ← Usa uuid
      } else {
        query += ' AND id != $2'    // ← Usa id
      }
      params.push(excludeId)
    }
    
    // ... resto do código
  }
}
```

### **2. Atualizado `checkEmailExists` em clientes.ts:**

Mesma lógica de dual key (uuid vs id).

### **3. Atualizado ambas funções em proprietarios.ts:**

Replicada a mesma correção para proprietários.

### **4. Adicionados logs detalhados na página de edição:**

```typescript
console.log('🔄 [EDITAR CLIENTE] Carregando dados para ID/UUID:', params.id)
console.log('✅ [EDITAR CLIENTE] Dados recebidos:', {
  id: clienteData.id,
  uuid: clienteData.uuid,
  nome: clienteData.nome,
  estado_fk: clienteData.estado_fk,
  cidade_fk: clienteData.cidade_fk
})
console.log('🔍 [EDITAR CLIENTE] Buscando estado para sigla:', cliente.estado_fk)
```

---

## 📋 ARQUIVOS MODIFICADOS:

1. ✅ `src/lib/database/clientes.ts` - Dual key em `checkCPFExists` e `checkEmailExists`
2. ✅ `src/lib/database/proprietarios.ts` - Dual key em `checkCPFExists` e `checkEmailExists`
3. ✅ `src/app/admin/clientes/[id]/editar/page.tsx` - Logs detalhados

---

## 🧪 TESTES NECESSÁRIOS AGORA:

### **TESTE 3 (REVISADO): Editar por INTEGER**

1. Acesse: `http://localhost:3000/admin/clientes/39/editar`

**Validar:**
- [ ] Estado pré-preenchido (Pernambuco)
- [ ] Cidade pré-preenchida (Recife)
- [ ] Todos os campos aparecem
- [ ] Mude complemento para "1501 B"
- [ ] Salve com sucesso

---

### **TESTE 4 (REVISADO): Editar por UUID**

1. Acesse: `http://localhost:3000/admin/clientes/48ca0922-0b14-40fd-9d24-06edf4d14779/editar`

**Validar:**
- [ ] **Estado pré-preenchido** (Pernambuco) ← ERA O PROBLEMA!
- [ ] **Cidade pré-preenchida** (Recife) ← ERA O PROBLEMA!
- [ ] Todos os campos aparecem
- [ ] Mude complemento para "1501 C"
- [ ] Salve com sucesso

**Console do navegador (F12):**
```
🔄 [EDITAR CLIENTE] Carregando dados para ID/UUID: 48ca0922-0b14-40fd-9d24-06edf4d14779
✅ [EDITAR CLIENTE] Dados recebidos: {
  id: 39,
  uuid: "48ca0922-0b14-40fd-9d24-06edf4d14779",
  nome: "Marina Antonia Ferraz",
  estado_fk: "PE",
  cidade_fk: "Recife",
  cep: "51160070"
}
🔍 [EDITAR CLIENTE] Buscando estado para sigla: PE
🔍 [EDITAR CLIENTE] Estados disponíveis: 27
✅ [EDITAR CLIENTE] Estado encontrado: {id: "...", sigla: "PE", nome: "Pernambuco"}
```

---

### **TESTE 5: Validação de CPF/Email com UUID**

1. Na página de edição com UUID aberta
2. Tente alterar o email para um existente (ex: `figev71996@nyfnk.com`)

**Esperado:**
- [ ] Aparece mensagem "Email já cadastrado"
- [ ] Campo fica vermelho
- [ ] Não permite salvar

**Console (F12):**
```
🔍 [DB] Consultando Email: figev71996@nyfnk.com
Query: SELECT id, email FROM clientes WHERE LOWER(email) = LOWER($1) AND uuid != $2
Params: ["figev71996@nyfnk.com", "48ca0922-0b14-40fd-9d24-06edf4d14779"]
✅ [DB] Query executada com sucesso!
```

---

## 🎯 RESULTADO ESPERADO:

✅ **TESTE 3 (INTEGER):** Estado e Cidade aparecem  
✅ **TESTE 4 (UUID):** Estado e Cidade aparecem (CORRIGIDO!)  
✅ **TESTE 5:** Validação funciona com UUID  

---

## ⚠️ SE AINDA FALHAR:

**Copie TODOS os logs do console (F12) e me envie!**

Especialmente:
- Logs que começam com `🔄 [EDITAR CLIENTE]`
- Logs que começam com `🔍 [EDITAR CLIENTE]`
- Logs que começam com `🔍 [DB]`

---

**EXECUTE OS TESTES 3, 4 e 5 E ME AVISE! 🎯**


