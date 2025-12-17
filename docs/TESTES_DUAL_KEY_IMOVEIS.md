## ✅ Objetivo

Validar que os fluxos de imóveis operam **exclusivamente** com `proprietario_uuid`, garantindo que nenhum resquício de `proprietario_fk` permaneça após a migração para UUID.

---

## 🧪 Pré-requisitos

- Token JWT de admin válido (`<TOKEN_ADMIN>`).
- `psql` configurado com `PGPASSWORD='Roberto@2007'`.
- UUID de pelo menos um proprietário válido:
  ```sql
  SELECT uuid, nome
  FROM proprietarios
  ORDER BY nome
  LIMIT 5;
  ```

---

## 🧪 Testes API Admin `/api/admin/imoveis/[id]`

### 1. GET por ID sequencial
```
curl -X GET http://localhost:3000/api/admin/imoveis/39 \
  -H "Authorization: Bearer <TOKEN_ADMIN>"

ESPERADO:
- HTTP 200
- JSON com `id = 39` (sequencial) e campo `proprietario_uuid` preenchido (string UUID).
- Ausência de `proprietario_fk` no payload.
```

### 2. PUT utilizando apenas `proprietario_uuid`
```
curl -X PUT http://localhost:3000/api/admin/imoveis/39 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
        "titulo": "Imóvel com UUID",
        "proprietario_uuid": "48ca0922-0b14-40fd-9d24-06edf4d14779",
        ...demais campos obrigatórios...
      }'

ESPERADO:
- HTTP 200
- `proprietario_uuid` no response igual ao valor enviado.
- Nenhum campo `proprietario_fk` retornado.
- Auditoria registrando alteração com UUID.
```

### 3. PUT removendo proprietário (caso permitido)
```
curl -X PUT http://localhost:3000/api/admin/imoveis/39 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -d '{
        "titulo": "Imóvel sem proprietário",
        "proprietario_uuid": null,
        ...demais campos obrigatórios...
      }'

ESPERADO:
- HTTP 200
- `proprietario_uuid` retornado como `null`.
- Nenhum vestígio de `proprietario_fk` no payload.
```

### 4. PUT manter ID sequencial

Verificar no payload de resposta (ou via SQL) que o campo `id` do imóvel permanece o sequencial original. Nenhum imóvel deve ganhar UUID como identificador principal.

---

## 🔍 Consultas SQL de verificação

```bash
$env:PGPASSWORD='Roberto@2007'
psql -U postgres -d net_imobiliaria -c "SELECT id, codigo, proprietario_uuid FROM imoveis ORDER BY id DESC LIMIT 5;"
```

Esperado: `id` sequencial intacto e `proprietario_uuid` preenchido (ou `NULL` quando aplicável). Coluna `proprietario_fk` não deve existir nos ambientes pós-migração.

---

## ✅ Critérios de sucesso

- GET/PUT retornam e aceitam apenas `proprietario_uuid` para associação de imóveis.
- Tabela `imoveis` mantém `proprietario_uuid` consistente com o proprietário escolhido.
- Nenhuma chamada tenta enviar/receber `proprietario_fk`.
- Logs/auditoria exibem o UUID do proprietário ao registrar alterações.

---

## 📝 Observações

- Testar também via UI (página de edição e criação de imóvel) para garantir que a experiência permanece estável.
- Registrar evidências (prints/consultas) no plano de migração após cada rodada de testes.

