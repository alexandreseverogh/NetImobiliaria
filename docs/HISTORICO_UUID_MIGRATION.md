# Histórico da Migração UUID

## Checkpoint 13/11/25

- **Contexto**  
  - Finalizada a bateria de scripts automatizados relacionados a perfis e APIs públicas, todos com sucesso.  
  - `npx tsc --noEmit` e `npm run lint` executados logo após os ajustes, ambos sem erros.
- **Validações de UI complementares (13/11 à tarde)**  
  - Wizard de imóveis (CEP, rascunho, upload de mídia) funcionando após prevenção de duplicidade de imagens.  
  - Dashboards administrativos e módulos de logs/auditoria (`/admin/audit`, `/admin/security-monitor`, `/admin/logs`) revisados; filtros (data, tipo, severidade) respondendo com estatísticas e eventos consistentes.  
  - Ajustes no `Security Monitor`:
    - `stats` agora respeita filtros de data/tipo/severidade.
    - Eventos `create` classificados como `resource_creation`; filtro “Criação de Imóveis” disponível.
    - `details` não-JSON são normalizados (chave-valor ou `raw`), eliminando erros de parse.

- **Scripts executados**  
  - `node scripts/test-api.js`  
  - `node scripts/test-api-with-auth.js`  
  - `node scripts/test-user-apis.js`  
  - `node scripts/test-perfis-api.js`

- **Principais correções deste ciclo**  
  - Ajustes no endpoint `GET /api/admin/perfis/[id]` para evitar referência antecipada de funções auxiliares.  
  - Padronização do script `test-perfis-api.js` com nomes únicos por execução, eliminando conflitos 409.

- **Próximos passos sugeridos**  
  - Registrar novos checkpoints após cada bloco de testes ou migrações.  
  - Prosseguir com os itens pendentes da migração UUID (testes de UI, validações adicionais e documentação final).  
  - Manter a rotina de validar com `npx tsc --noEmit` e `npm run lint` após cada ajuste relevante.


