# 📋 TESTES – Clientes (UUID-Only)

## ✅ Objetivo

Confirmar que todas as operações administrativas com clientes utilizam **somente UUID** como identificador e que não há dependência remanescente de IDs inteiros.

---

## 🧪 Testes API Admin – `/api/admin/clientes/[id]`

### 1. GET por UUID válido
```bash
curl -X GET http://localhost:3000/api/admin/clientes/<UUID_VALIDO> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 200
# - Payload contendo o `uuid = <UUID_VALIDO>`.
```

### 2. GET com identificador inválido (ex.: inteiro legado)
```bash
curl -X GET http://localhost:3000/api/admin/clientes/123 \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 400
# - Mensagem orientando a utilizar UUID.
```

### 3. PUT por UUID
```bash
curl -X PUT http://localhost:3000/api/admin/clientes/<UUID_VALIDO> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
        "nome": "Cliente UUID",
        "cpf": "123.456.789-00",
        "telefone": "81999990000",
        "email": "cliente.uuid@exemplo.com",
        "estado_fk": "PE",
        "cidade_fk": "Recife",
        "endereco": "Rua X",
        "bairro": "Centro",
        "numero": "100",
        "cep": "50000000"
      }'

# Esperado
# - HTTP 200
# - Payload com `uuid` preservado e campos atualizados.
# - Auditoria com `resourceId = <UUID_VALIDO>`.
```

### 4. PUT com UUID inválido
```bash
curl -X PUT http://localhost:3000/api/admin/clientes/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{ ... }'

# Esperado
# - HTTP 400 (UUID inválido).
```

### 5. DELETE por UUID (opcional)
```bash
curl -X DELETE http://localhost:3000/api/admin/clientes/<UUID_VALIDO> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 200
# - Mensagem "Cliente excluído com sucesso".
# - Auditoria com `resourceId = uuid`.
```

> ⚠️ Execute apenas em ambiente de teste se não quiser remover registros reais.

---

## 🔍 Consultas SQL de verificação

```bash
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -c "SELECT uuid, nome FROM clientes ORDER BY created_at DESC LIMIT 5;"

Resultado esperado: apenas a coluna `uuid`; nenhum resquício de `id` legado.
```

---

## 🤖 Script automatizado

- **Arquivo**: `scripts/Test-ClientesUuidOnly.ps1`
- **Execução**:
  ```powershell
  .\scripts\Test-ClientesUuidOnly.ps1 `
    -AdminToken "<TOKEN>" `
    -ClienteUuid "<UUID_VALIDO>"
  ```
- **Ações**:
  1. Snapshot do cliente (GET por UUID);
  2. Confirma rejeição de identificadores legados;
  3. PUT com dados aleatórios via UUID + rollback opcional;
  4. (Opcional) Consulta SQL para garantir consistência.

---

## ✅ Critérios de sucesso
- Endpoints administrativos aceitam e retornam apenas UUID;
- Erros adequados para identificadores inválidos;
- Auditoria registra `resourceId` com o UUID do cliente;
- Interfaces consumam `uuid` para navegação, edição e exclusão.

---

## 📝 Observações
- Rodar em conjunto com o roteiro de proprietários (`docs/TESTES_DUAL_KEY_PROPRIETARIOS.md`).
- Registrar prints/consultas como evidência no plano de migração.
- Incluir testes de UI (listagem, edição, exclusão) após execução do script automatizado.

