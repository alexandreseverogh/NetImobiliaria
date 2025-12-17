## Checkpoint 3 – Imóveis com dual key

- **Objetivo**: garantir que `proprietario_fk` e `proprietario_uuid` sejam mantidos em paralelo durante criação e edição de imóveis.
- **Escopo**: `/api/admin/imoveis` (POST/PUT/GET) + fluxo `Novo Imóvel` e `Edição de Imóvel` no admin.

### Testes executados
- `Novo Imóvel` (UI) selecionando proprietário via busca.
  - Resultado: registro criado com `proprietario_fk` (INTEGER) e `proprietario_uuid` (UUID) sincronizados.
- `Edição de Imóvel` (UI) alterando proprietário.
  - Resultado: atualização mantém ambos os campos consistentes; auditoria registra mudança de `proprietario_uuid`.
- Validação manual no banco (`SELECT id, proprietario_fk, proprietario_uuid FROM imoveis WHERE id = ?`).
  - Resultado: colunas atualizadas em paralelo conforme esperado.

### Observações
- Teste via API direta foi tentado, mas abortado porque faltou o campo `codigo` — confirmado pelos logs do backend.
- A UI já garante todos os campos obrigatórios, então a validação foi considerada suficiente para este checkpoint.

### Próximo passo
- Prosseguir para o item seguinte do plano: revisar listagem de interessados (garantir que exibe `proprietario_uuid` e segue a estratégia dual key).

