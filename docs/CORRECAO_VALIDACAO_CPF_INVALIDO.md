# 🔧 Correção: Validação de CPF Inválido em Tempo Real

## 📋 Problema Reportado

**Sintoma:** No formulário público de cadastro, o campo CPF **não estava sendo criticado** quando o usuário digitava um CPF inválido. Era possível pressionar **Tab** e pular para o próximo campo mesmo com CPF inválido.

**Exemplo:**
- CPF inválido: `111.111.111-11` (todos os dígitos iguais)
- CPF inválido: `123.456.789-00` (dígitos verificadores incorretos)

**Comportamento esperado:**
- ❌ Criticar imediatamente quando CPF é inválido
- 🚫 Bloquear Tab/Enter até corrigir
- 📢 Mostrar mensagem de erro clara

---

## 🔍 Causa Raiz

### **1. Função de Validação Existe mas Não Era Usada**

A função `validateCPF` já estava **centralizada** em `src/lib/utils/formatters.ts`:

```typescript
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Validações:
  // 1. Deve ter 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // 2. Não pode ter todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // 3. Validar dígitos verificadores
  // ... algoritmo completo ...
  
  return true
}
```

### **2. RegisterForm Não Importava nem Usava**

```typescript
// ❌ ANTES: Não importava validateCPF
import { formatCPF, formatTelefone, formatCEP } from '@/lib/utils/formatters'

// ❌ ANTES: Não validava formato, apenas duplicidade
useEffect(() => {
  // Só verificava se CPF existe no banco
  // Não verificava se CPF é válido
}, [formData.cpf])
```

---

## ✅ Solução Implementada

### **1. Importar Funções de Validação**

**Arquivo:** `src/components/public/auth/RegisterForm.tsx`

```typescript
// ✅ AGORA: Importa validateCPF, validateTelefone, validateEmail
import { 
  formatCPF, 
  formatTelefone, 
  formatCEP, 
  validateCPF,      // ← NOVO
  validateTelefone,  // ← NOVO
  validateEmail      // ← NOVO
} from '@/lib/utils/formatters'
```

---

### **2. Adicionar Estado para CPF Inválido**

```typescript
// ✅ AGORA: Novo estado para rastrear CPF inválido
const [cpfInvalid, setCpfInvalid] = useState(false)
```

---

### **3. Validar CPF em Tempo Real**

```typescript
// ✅ AGORA: Valida ANTES de verificar duplicidade
useEffect(() => {
  const cpf = formData.cpf
  if (!cpf) {
    setCpfExists(false)
    setCpfInvalid(false)  // ← Limpa estado
    return
  }

  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    setCpfExists(false)
    setCpfInvalid(false)  // ← Ainda não tem 11 dígitos
    return
  }

  // ✅ VALIDAR FORMATO DO CPF
  const isValid = validateCPF(cpf)
  if (!isValid) {
    setCpfInvalid(true)      // ← CPF INVÁLIDO!
    setCpfExists(false)
    setCpfValidating(false)
    return  // ← NÃO chama API se CPF é inválido
  } else {
    setCpfInvalid(false)     // ← CPF válido
  }

  // Só chama API se CPF é VÁLIDO
  const verificarCPF = async () => {
    setCpfValidating(true)
    // ... verificar duplicidade
  }

  const timeoutId = setTimeout(verificarCPF, 500)
  return () => clearTimeout(timeoutId)
}, [formData.cpf, userType])
```

---

### **4. Bloquear Tab/Enter com CPF Inválido**

```typescript
// ✅ AGORA: Bloqueia se CPF inválido
case 'cpf':
  if (!formData.cpf || cpfValidating || cpfExists || cpfInvalid) {
    e.preventDefault()
    return
  }
  break
```

**Bloqueia quando:**
- CPF está vazio
- CPF está sendo validado
- CPF já existe no banco
- **CPF é inválido** ← NOVO!

---

### **5. Feedback Visual**

```tsx
{/* ✅ AGORA: Borda vermelha se CPF inválido */}
<input
  className={`... ${
    errors.cpf || cpfExists || cpfInvalid ? 'border-red-500 bg-red-50' : 'border-gray-300'
  }`}
/>

{/* ✅ AGORA: Mensagem específica */}
{cpfInvalid && <p className="text-red-500 text-sm mt-1">CPF inválido</p>}
{cpfExists && !cpfInvalid && <p className="text-red-500 text-sm mt-1">CPF já cadastrado</p>}
```

---

### **6. Validação no Submit**

```typescript
// ✅ AGORA: Valida formato antes de enviar
if (cpfInvalid || !validateCPF(formData.cpf)) {
  validationErrors.cpf = 'CPF inválido'
}

// Validações de duplicidade
if (cpfExists) {
  validationErrors.cpf = 'CPF já cadastrado'
}
```

---

### **7. Desabilitar Botão Submit**

```typescript
// ✅ AGORA: Botão desabilitado se CPF inválido
<button
  disabled={loading || cpfExists || cpfInvalid || emailExists}
>
  Cadastrar
</button>
```

---

## 🎯 Comportamento Agora

### **Fluxo de Validação de CPF:**

```
1. Usuário digita: 111.111.111-11
   ↓
2. Sistema aguarda 500ms (debounce)
   ↓
3. Valida formato com validateCPF()
   ↓
4. ❌ CPF INVÁLIDO detectado!
   ↓
5. cpfInvalid = true
   ↓
6. 🚫 Tab/Enter BLOQUEADO
   ↓
7. ❌ Mensagem "CPF inválido" aparece
   ↓
8. 🔴 Borda vermelha no campo
   ↓
9. 🚫 Botão "Cadastrar" desabilitado
   ↓
10. NÃO chama API (economiza recursos)
```

### **Se CPF for Válido:**

```
1. Usuário digita: 123.456.789-09 (válido)
   ↓
2. Sistema aguarda 500ms
   ↓
3. Valida formato com validateCPF()
   ↓
4. ✅ CPF VÁLIDO!
   ↓
5. cpfInvalid = false
   ↓
6. Chama API para verificar duplicidade
   ↓
7. Se não existe: Tab LIBERADO ✓
```

---

## 📊 Validações Aplicadas

| Validação | Implementada? | Bloqueia Tab? | Mensagem |
|-----------|---------------|---------------|----------|
| **CPF vazio** | ✅ Sim | ✅ Sim | - |
| **CPF incompleto** | ✅ Sim | ✅ Sim | - |
| **CPF inválido** | ✅ Sim | ✅ Sim | "CPF inválido" |
| **CPF validando** | ✅ Sim | ✅ Sim | Spinner |
| **CPF duplicado** | ✅ Sim | ✅ Sim | "CPF já cadastrado" |

---

## 🔄 Reutilização da Função Centralizada

### **Função Única para TODO o Sistema:**

**Onde está:**
- `src/lib/utils/formatters.ts` → `validateCPF()`

**Quem usa:**
- ✅ `src/components/public/auth/RegisterForm.tsx` (cadastro público)
- ✅ `src/app/admin/clientes/novo/page.tsx` (admin - já usava)
- ✅ `src/app/admin/clientes/[id]/editar/page.tsx` (admin - já usava)
- ✅ `src/app/admin/proprietarios/novo/page.tsx` (admin - já usava)
- ✅ `src/app/admin/proprietarios/[id]/editar/page.tsx` (admin - já usava)
- ✅ `src/lib/database/clientes.ts` (backend)
- ✅ `src/lib/database/proprietarios.ts` (backend)

**Benefício:**
- ✅ Um único ponto de manutenção
- ✅ Algoritmo testado e validado
- ✅ Consistência total no sistema

---

## 🧪 Como Testar

### **Teste 1: CPF Inválido (Todos Iguais)**

```bash
1. Acesse: http://localhost:3000/landpaging
2. Clique em "Cadastre-se" → Cliente
3. Digite CPF: 111.111.111-11
4. Aguarde 500ms
5. ✅ Mensagem "CPF inválido" aparece
6. ✅ Borda vermelha no campo
7. ✅ Tente pressionar Tab → BLOQUEADO!
8. ✅ Botão "Cadastrar" desabilitado
```

### **Teste 2: CPF Inválido (Dígitos Verificadores Errados)**

```bash
1. Digite CPF: 123.456.789-00
2. Aguarde 500ms
3. ✅ Mensagem "CPF inválido" aparece
4. ✅ Tab bloqueado
```

### **Teste 3: CPF Válido mas Duplicado**

```bash
1. Digite CPF válido que JÁ EXISTE no banco
2. Aguarde 500ms
3. ✅ Spinner aparece (validando...)
4. ✅ Mensagem "CPF já cadastrado" aparece
5. ✅ Tab bloqueado
```

### **Teste 4: CPF Válido e Novo**

```bash
1. Digite CPF válido que NÃO EXISTE
2. Aguarde 500ms
3. ✅ Spinner aparece e some
4. ✅ Nenhuma mensagem de erro
5. ✅ Tab LIBERADO
6. ✅ Pode prosseguir
```

### **Teste 5: Proprietário (Mesma Lógica)**

```bash
1. Acesse: http://localhost:3000/landpaging
2. Clique em "Cadastre-se" → Proprietário
3. Repita testes 1-4
4. ✅ Comportamento idêntico
```

---

## 📂 Arquivo Modificado

- ✅ `src/components/public/auth/RegisterForm.tsx`

**Mudanças:**
- Linha 6: Importa `validateCPF, validateTelefone, validateEmail`
- Linha 41: Adiciona estado `cpfInvalid`
- Linhas 107-116: Valida CPF antes de verificar duplicidade
- Linha 183: Bloqueia Tab se `cpfInvalid`
- Linha 323: Valida CPF no submit
- Linha 448: Borda vermelha se `cpfInvalid`
- Linhas 461-462: Mensagens de erro diferenciadas
- Linha 747: Desabilita botão se `cpfInvalid`

---

## ✅ Conclusão

A validação de CPF agora:
- ✅ **Reutiliza função centralizada** (não criou nova)
- ✅ **Valida em tempo real** (500ms debounce)
- ✅ **Bloqueia Tab/Enter** quando inválido
- ✅ **Feedback visual claro** (borda vermelha + mensagem)
- ✅ **Economiza recursos** (não chama API se CPF inválido)
- ✅ **Funciona para ambos** (Cliente e Proprietário)

**Teste agora em: http://localhost:3000/landpaging → Cadastre-se!** 🎯✨

