# 🚀 CORREÇÃO DEBOUNCE/TAB - Páginas Restantes

## ✅ JÁ CORRIGIDO:
1. ✅ RegisterForm (Público - Clientes e Proprietários)
2. ✅ Admin - Novo Cliente

## ⏳ APLICAR AGORA (4 páginas):
3. ⏳ Admin - Editar Cliente
4. ⏳ Admin - Novo Proprietário  
5. ⏳ Admin - Editar Proprietário
6. ⏳ Público - Meu Perfil

---

## 📝 PADRÃO DE CORREÇÃO:

### **PASSO 1: Adicionar Flags**
```typescript
const [cpfValidating, setCpfValidating] = useState(false)
const [cpfExists, setCpfExists] = useState(false)
const [cpfPendingValidation, setCpfPendingValidation] = useState(false)  // ← ADICIONAR

const [emailValidating, setEmailValidating] = useState(false)
const [emailExists, setEmailExists] = useState(false)
const [emailPendingValidation, setEmailPendingValidation] = useState(false)  // ← ADICIONAR
```

### **PASSO 2: Atualizar useEffect de Email**
```typescript
useEffect(() => {
  const email = formData.email
  if (!email || !validateEmail(email)) {
    setEmailExists(false)
    setEmailPendingValidation(false)  // ← ADICIONAR
    return
  }

  setEmailPendingValidation(true)  // ← ADICIONAR

  const verificarEmail = async () => {
    setEmailValidating(true)
    // ... consulta API ...
    setEmailValidating(false)
    setEmailPendingValidation(false)  // ← ADICIONAR
  }

  const timeoutId = setTimeout(verificarEmail, 800)
  return () => clearTimeout(timeoutId)
}, [formData.email])
```

### **PASSO 3: Atualizar checkCPFExists (se existir)**
```typescript
const checkCPFExists = async (cpf: string) => {
  if (!cpf || !validateCPF(cpf)) {
    setCpfPendingValidation(false)  // ← ADICIONAR
    return
  }

  setCpfPendingValidation(true)  // ← ADICIONAR

  try {
    setCpfValidating(true)
    // ... consulta API ...
  } finally {
    setCpfValidating(false)
    setCpfPendingValidation(false)  // ← ADICIONAR
  }
}
```

### **PASSO 4: Atualizar handleKeyDown**
```typescript
case 'cpf':
  const cpfLimpo = formData.cpf.replace(/\D/g, '')
  // Bloquear se: vazio, validando, existe, pendente, incompleto ou inválido
  if (!formData.cpf || cpfValidating || cpfExists || cpfPendingValidation ||  // ← ADICIONAR cpfPendingValidation
      cpfLimpo.length !== 11 || !validateCPF(formData.cpf)) {
    e.preventDefault()
    return
  }
  break

case 'email':
  // Bloquear se: vazio, validando, existe, pendente ou inválido
  if (!formData.email || emailValidating || emailExists || emailPendingValidation ||  // ← ADICIONAR emailPendingValidation
      !validateEmail(formData.email)) {
    e.preventDefault()
    return
  }
  break
```

---

**Status: Aplicando nas 4 páginas restantes...**


