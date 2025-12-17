# 📋 TESTES – Proprietários (UUID-Only) e Integração com Imóveis

## ✅ Objetivo

Validar que todas as operações administrativas e integrações com imóveis utilizam **exclusivamente UUID** como identificador de proprietários, rejeitando qualquer uso de IDs inteiros.

---

## 🧪 Testes API Admin – `/api/admin/proprietarios/[id]`

### 1. GET por UUID válido
```bash
curl -X GET http://localhost:3000/api/admin/proprietarios/<UUID_VALIDO> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 200
# - Payload contendo `uuid = <UUID_VALIDO>`
```

### 2. GET com identificador inválido
```bash
curl -X GET http://localhost:3000/api/admin/proprietarios/123 \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 400
# - Mensagem orientando a utilizar UUID
```

### 3. PUT por UUID
```bash
curl -X PUT http://localhost:3000/api/admin/proprietarios/<UUID_VALIDO> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
        "nome": "Teste UUID",
        "cpf": "123.456.789-00",
        "telefone": "81999990000",
        "email": "teste.uuid@exemplo.com",
        "estado_fk": "PE",
        "cidade_fk": "Recife",
        "endereco": "Rua X",
        "bairro": "Centro",
        "numero": "100",
        "cep": "50000000"
      }'

# Esperado
# - HTTP 200
# - Payload com `uuid` preservado e campos atualizados
# - Auditoria registrando `resourceId = <UUID_VALIDO>`
```

### 4. PUT com UUID inválido
```bash
curl -X PUT http://localhost:3000/api/admin/proprietarios/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{ ... }'

# Esperado
# - HTTP 400
# - Mensagem de erro indicando identificador inválido
```

### 5. DELETE por UUID (opcional)
```bash
curl -X DELETE http://localhost:3000/api/admin/proprietarios/<UUID_VALIDO> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - HTTP 200
# - Mensagem "Proprietário excluído com sucesso"
# - Registro removido (verificar via SQL)
```

> ⚠️ Se não quiser remover definitivamente, execute apenas em ambiente de teste.

---

## 🧪 Testes Relacionamento `imoveis` ↔ `proprietarios`

### 6. Edição de imóvel com UUID válido
```bash
curl -X PUT http://localhost:3000/api/admin/imoveis/<ID_IMOVEL> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
        "proprietario_uuid": "<UUID_VALIDO>",
        "titulo": "Imóvel com UUID",
        "...demais campos obrigatórios..."
      }'

# Esperado
# - HTTP 200
# - `proprietario_uuid` retornado igual ao enviado (ou `null` quando permitido)
# - Nenhum campo `proprietario_fk` no payload
# - Auditoria de imóveis referenciando UUID
```

### 7. GET Imóvel - confirmar retorno apenas UUID
```
curl -X GET http://localhost:3000/api/admin/imoveis/<ID_IMOVEL> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

# Esperado
# - `proprietario_uuid` (string) ou `null`
# - Ausência de `proprietario_fk`
```

---

## 🔍 Consultas SQL úteis

```
# Conferir proprietários (uuid)
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -c "SELECT uuid, nome FROM proprietarios ORDER BY created_at DESC LIMIT 5;"
# Conferir imóveis vinculados
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -c "SELECT id, proprietario_uuid FROM imoveis ORDER BY updated_at DESC LIMIT 5;"
```

---

## ✅ Critérios de Sucesso

- Rotas de proprietários aceitam **apenas UUID** como identificador e rejeitam valores inválidos.
- Imóveis aceitam e retornam apenas `proprietario_uuid`.
- Auditorias registram o UUID do proprietário ao alterar registros ou vínculos de imóveis.
- Auditoria (`logAuditEvent`) continua recebendo `resourceId = proprietario.uuid`.

---

## 📝 Observações

- Utilize o script automatizado `scripts/Test-ProprietariosUuidOnly.ps1` para validar rapidamente o fluxo UUID (requer `psql` e token admin).
- Scripts PowerShell (`Test-ProprietariosUuidOnly.ps1`) já rejeitam identificadores inteiros.
- Registrar evidências (prints/consultas) no plano de migração após cada rodada de testes.
- Este roteiro substitui os testes dual-key – qualquer uso de `id` inteiro agora deve ser tratado como legado.

