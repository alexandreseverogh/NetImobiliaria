# 🧪 INSTRUÇÕES - Testar Edição de Clientes e Proprietários

**Data**: 05/11/2025  
**Sistema**: Net Imobiliária

---

## 🎯 OBJETIVO

Verificar se o campo `cidade_fk` está sendo carregado e exibido corretamente nas páginas de edição.

---

## 📊 DADOS DE TESTE

### **Cliente ID 34** (João Lyra Aguiar):
```
estado_fk = "Pernambuco"
cidade_fk = "Recife"
cep = "51160-070"
```

---

## 🔍 COMO TESTAR

### **PASSO 1: Abrir Console do Navegador**

1. Abra o navegador (Chrome/Edge)
2. Pressione **F12** para abrir DevTools
3. Vá na aba **Console**

---

### **PASSO 2: Acessar Página de Edição**

1. Acesse: `http://localhost:3000/admin/clientes/34/editar`
2. **AGUARDE** carregar completamente
3. **OBSERVE** os logs no console

---

### **PASSO 3: Verificar Logs**

Você deve ver logs como:

```
🔍 Buscando estado para: Pernambuco
✅ Estado encontrado: {id: "25", sigla: "PE", nome: "Pernambuco"}
🔍 Buscando cidade para: Recife
🔍 Municípios disponíveis: 185
✅ Cidade encontrada: {id: "153", nome: "Recife"}
```

---

### **PASSO 4: Verificar Campos do Formulário**

#### ✅ **Estado**:
- Select deve mostrar: **"PE - Pernambuco"**

#### ✅ **Cidade**:
- Select deve mostrar: **"Recife"**
- **NÃO** deve mostrar "Selecione a cidade"

#### ✅ **CEP**:
- Input deve mostrar: **"51160-070"**

#### ✅ **Endereço**:
- Input deve mostrar: **"Rua Jorge de Lima"**

#### ✅ **Bairro**:
- Input deve mostrar: **"Imbiribeira"**

---

## ⚠️ SE A CIDADE NÃO APARECER

### **Logs de Erro para Buscar**:

```
⚠️ Cidade não encontrada na lista de municípios: Recife
⚠️ Municípios disponíveis: [...]
```

### **Possíveis Causas**:

1. **Timing**: Municípios não carregaram antes do useEffect
2. **Nome diferente**: "Recife" vs "RECIFE" (case sensitive)
3. **Espaços**: "Recife " vs "Recife" (trailing spaces)

---

## 🔧 SOLUÇÃO SE HOUVER PROBLEMA

Se a cidade não aparecer, execute no console do navegador:

```javascript
// Ver dados carregados
console.log('Cliente:', window.cliente)
console.log('Estados:', window.estadosCidades)
console.log('Form Data:', window.formData)
```

---

## 📋 TESTE TAMBÉM PARA PROPRIETÁRIOS

Repetir os mesmos passos para:

**Proprietário ID 4** (Geyson Soares):
```
estado_fk = "Bahia"
cidade_fk = "Paulo Afonso"
cep = "41121-211"
```

URL: `http://localhost:3000/admin/proprietarios/4/editar`

---

## ✅ RESULTADO ESPERADO

Após as correções, **AMBAS** as páginas devem:

1. ✅ Carregar **Estado** corretamente do `estado_fk`
2. ✅ Carregar **Cidade** corretamente do `cidade_fk`
3. ✅ Mostrar cidade no select (não "Selecione a cidade")
4. ✅ Permitir editar todos os campos
5. ✅ Salvar com `updated_by` e `updated_at` atualizados

---

## 🐛 DEBUG ADICIONAL

Se ainda houver problema, verifique no banco:

```sql
-- Ver dados exatos do cliente
SELECT id, nome, estado_fk, cidade_fk, cep 
FROM clientes 
WHERE id = 34;

-- Ver se a cidade existe no JSON de municípios
-- (Verificar arquivo: src/lib/admin/municipios.json)
```

---

**Criado por**: Sistema Automatizado  
**Data**: 05 de Novembro de 2025


