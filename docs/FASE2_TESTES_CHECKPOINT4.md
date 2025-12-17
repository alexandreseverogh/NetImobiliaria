## Checkpoint 4 – Listagem de imóveis compatível com dual key

- **Objetivo**: confirmar que o endpoint `/api/admin/imoveis` retorna `proprietario_uuid` juntamente ao `proprietario_fk`, garantindo a compatibilidade com o plano de dual key.
- **Escopo**: listagem `/admin/imoveis` (UI) e chamada direta à API com/sem filtros.

### Testes
- `GET /api/admin/imoveis` (sem filtros): response inclui `proprietario_fk` e `proprietario_uuid` para imóveis que possuem UUID.
- `GET /api/admin/imoveis?codigo=<id>`: mesmo comportamento observado.
- Confirmação no console da página `/admin/imoveis` (logs adicionados previamente) mostrando o array completo com ambos os campos.
- Verificação SQL (`SELECT id, proprietario_fk, proprietario_uuid FROM imoveis ORDER BY id DESC LIMIT 5;`) para validar consistência de dados.

### Status
- ✅ Payload já contém `proprietario_uuid` (graças ao uso da view `imoveis_completos`).
- ✅ UI consome o tipo `Imovel` com o campo disponível, permitindo evoluções futuras (ex.: exibir o identificador no card, exportar, etc.).

### Próximo passo
- Revisar consumidores derivados (ex.: exports, relatórios, dashboards) para garantir que eventuais filtros/joins também estejam preparados para a dual key.


