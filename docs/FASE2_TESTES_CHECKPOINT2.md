# 🧪 FASE 2 - CHECKPOINT 2: TESTES PUT/DELETE

## 📋 O QUE FOI IMPLEMENTADO:

✅ **API PUT atualizada:**
- `/api/admin/clientes/[id]` - Editar por INTEGER ou UUID

✅ **API DELETE atualizada:**
- `/api/admin/clientes/[id]` - Deletar por INTEGER ou UUID

---

## 🧪 TESTES OBRIGATÓRIOS - FAÇA AGORA

### **TESTE 3: Editar Cliente por INTEGER**

1. **Acesse:** `http://localhost:3000/admin/clientes/39/editar`

2. **Faça uma alteração pequena:**
   - Troque o complemento de "1501 A" para "1501 B" (por exemplo)

3. **Clique em "Salvar Cliente"**

**Esperado:**
- ✅ Salva sem erro
- ✅ Mensagem de sucesso
- ✅ Redireciona para lista

**Console do navegador (F12):**
```
📝 [API CLIENTES PUT] Recebido ID: 39
📝 [API CLIENTES PUT] Atualizando por INTEGER: 39
✅ Cliente atualizado com sucesso
```

4. **Verifique a alteração:**
   - `http://localhost:3000/admin/clientes/39`
   - Complemento deve mostrar "1501 B"

---

### **TESTE 4: Editar Cliente por UUID**

**UUID do cliente 39:**
```
48ca0922-0b14-40fd-9d24-06edf4d14779
```

1. **Acesse:** `http://localhost:3000/admin/clientes/48ca0922-0b14-40fd-9d24-06edf4d14779/editar`

2. **Faça uma alteração pequena:**
   - Troque o complemento de "1501 B" para "1501 C"

3. **Clique em "Salvar Cliente"**

**Esperado:**
- ✅ Salva sem erro
- ✅ Mensagem de sucesso
- ✅ Redireciona para lista

**Console do navegador (F12):**
```
📝 [API CLIENTES PUT] Recebido ID: 48ca0922-0b14-40fd-9d24-06edf4d14779
📝 [API CLIENTES PUT] Atualizando por UUID
✅ Cliente atualizado com sucesso
```

4. **Verifique a alteração:**
   - `http://localhost:3000/admin/clientes/39`
   - Complemento deve mostrar "1501 C"

---

### **TESTE 5: Verificar Dual Key no Banco**

Execute no terminal:

```bash
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -c "SELECT id, uuid, nome, complemento FROM clientes WHERE id = 39;"
```

**Esperado:**
```
 id |                 uuid                 |         nome          | complemento
----+--------------------------------------+-----------------------+-------------
 39 | 48ca0922-0b14-40fd-9d24-06edf4d14779 | Marina Antonia Ferraz | 1501 C
(1 row)
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

### **TESTE 3 (PUT por INTEGER):**
- [ ] Página de edição abre
- [ ] Campos pré-preenchidos
- [ ] Alteração salva sem erro
- [ ] Redireciona corretamente
- [ ] Logs corretos no console

### **TESTE 4 (PUT por UUID):**
- [ ] Página de edição abre com UUID na URL
- [ ] Campos pré-preenchidos
- [ ] Alteração salva sem erro
- [ ] Redireciona corretamente
- [ ] Logs mostram "UUID" detectado

### **TESTE 5 (Banco de Dados):**
- [ ] Registro mostra ambas as chaves (id E uuid)
- [ ] Complemento atualizado corretamente

---

## ⚠️ SE ALGO DER ERRADO:

### **Qualquer teste falha:**

**AÇÃO IMEDIATA:** Rollback!
```bash
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -f database/fase2_rollback.sql
```

**E depois:** Restaurar backup
```bash
# Listar backups disponíveis
dir database\backups\

# Restaurar o mais recente
pg_restore -U postgres -d net_imobiliaria -c database/backups/backup_antes_fase2_*.backup
```

---

## ✅ SE TODOS OS TESTES PASSAREM:

**Próximos passos:**
1. Repetir GET/PUT/DELETE para **Proprietários**
2. Atualizar APIs de **Imóveis** (proprietario_fk vs proprietario_uuid)
3. Atualizar frontend para usar dual key
4. Testes completos de integração

---

## 🎯 RESULTADO ESPERADO:

**TODOS devem funcionar perfeitamente!**

Se todos passarem:
- ✅ Dual key totalmente funcional para Clientes
- ✅ Edição funciona com ambas as chaves
- ✅ Banco mantém integridade
- ✅ Podemos replicar para Proprietários

---

**⚠️ IMPORTANTE: NÃO vamos testar DELETE agora!**

Vamos deixar DELETE para depois, quando tudo estiver 100% estável. Por enquanto, só GET e PUT são críticos.

---

**EXECUTE OS TESTES 3, 4 e 5 AGORA E ME AVISE OS RESULTADOS! 🎯**


