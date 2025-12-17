# Inventário de Dependências – Imóveis & Wizards

**Versão:** 0.3  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** cadastro, edição, listagem e gerenciamento completo de imóveis (dados gerais, localização, amenidades, proximidades, mídia, rascunhos), incluindo fluxos em múltiplos passos e integrações com proprietários.
- **Objetivo:** manter consistência entre banco de dados, APIs, componentes de wizard e validações, garantindo segurança, performance e reutilização seguindo Guardian Rules (ordem de passos do CRUD de imóveis).
- **Componentes-chave:** tabela `imoveis` e views auxiliares, serviços `src/lib/database/imoveis.ts`, wizards (`ImovelWizard`, `SimpleImovelWizard`), APIs `/api/admin/imoveis/*`, módulos de amenidades/proximidades/mídia, sincronização com proprietários (dual key).

## 2. Banco de Dados e Migrações
- **Tabelas primárias:** `imoveis`, `imoveis_completos` (view), `imovel_imagens`, `imovel_documentos`, `imovel_videos`, `imovel_amenidades`, `imovel_proximidades`, `amenidades`, `proximidades`, `categorias_amenidades`, `categorias_proximidades`.
- **Chaves críticas:**
  - `imoveis.proprietario_uuid` (UUID) → FK para `proprietarios.uuid`
  - Foreign keys para `tipos_imovel`, `finalidades_imovel`, `status_imovel`
  - Índices em `codigo`, `proprietario_fk`, `proprietario_uuid`, `status_fk`, `destaque`
- **Scripts relevantes:**
  - `database/create_imovel_video_table.sql`, `populate-amenidades-proximidades.sql`
  - Migrações que adicionam colunas de rascunho e sincronização (ver `database/migrations/` – arquivos amenidades/proximidades)
  - `database/fase2_adicionar_uuid_migration.sql` (adiciona `proprietario_uuid`)
  - `database/TESTES_DUAL_KEY_IMOVEIS*.md/sql` (histórico dual key – manter para referência)
  - `scripts/sql/fase3_imoveis_uuid_only.sql` (executado em 08/11/25 – aplica `NOT NULL` e remove `proprietario_fk`)
- **Requisitos Guardian:** manter sequência do CRUD em 7 etapas (filtros → descrição → valores/área → amenidades → proximidades → imagens → documentos). Nenhuma alteração sem análise de impacto.

### Situação Atual (08/11/25)
- ✅ `proprietario_uuid` preenchido automaticamente em todos os fluxos de criação/edição; APIs, serviços e wizard usam apenas UUID.
- ✅ `scripts/sql/fase3_imoveis_uuid_only.sql` executado (08/11/25): `proprietario_uuid` tornou-se `NOT NULL` e `proprietario_fk` foi removido.
- ✅ Consultas pós-migração:
  - `SELECT COUNT(*) FROM imoveis WHERE proprietario_uuid IS NULL;` → **0**
  - `SELECT COUNT(*) FROM imoveis i LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid WHERE i.proprietario_uuid IS NOT NULL AND p.uuid IS NULL;` → **0**
- 📋 Componentes atualizados (08/11/25) para operar somente com UUID:
  - `src/lib/database/imoveis.ts`
  - `src/app/api/admin/imoveis/[id]/route.ts`
  - `src/components/admin/wizard/GeneralDataStep.tsx`
  - `src/components/admin/ImovelGrid.tsx`
  - `src/app/admin/imoveis/[id]/edicao/page.tsx`
  - `src/lib/types/admin.ts`
  - `src/lib/utils/imovelAuditHelper.ts`
- ⚠️ Pendências:
  - Atualizar/remover documentações e scripts legados baseados em `proprietario_fk` (PS1 antigos, docs “Dual Key”).
  - Confirmar que dashboards/exportações/reportings usam apenas `proprietario_uuid`.
  - Anexar evidências de execução/rollback ao plano e inventário geral.

## 3. APIs e Serviços
- **Rotas principais (`src/app/api/admin/imoveis`):**
  - `GET /api/admin/imoveis` → listagem paginada via `listImoveis` (filtros híbridos novos/legados), fallback `findAllImoveis`.
  - `POST /api/admin/imoveis` → cria imóvel, converte tipos numéricos, sincroniza proprietário, grava amenidades/proximidades/mídia e gera geocodificação.
  - `GET/PUT /api/admin/imoveis/[id]` → consulta e atualização completa (com sincronização proprietária e logging de auditoria).
  - Sub-rotas: `amenidades`, `proximidades`, `imagens`, `documentos`, `rascunho`, `restore`, `confirmar`.
- **Serviços de BD (`src/lib/database`):**
  - `imoveis.ts` (CRUD completo, filtros, geocodificação, relacionamento dual key com proprietários).
  - `imovel-video.ts`, `imovel-documentos.ts`, `amenidades.ts`, `proximidades.ts` (manipulam associações e mídia, respeitando transações quando necessário).
  - `logAuditEvent` registra alterações críticas.
- **Buscas auxiliares:** geocodificação (`src/lib/utils/geocoding.ts`), scripts de teste (`scripts/Test-DualKeyImoveis.ps1`).

```350:426:src/lib/database/imoveis.ts
const proprietarioIdentificador = imovel.proprietario_uuid ?? imovel.proprietario_fk
...
const proprietario = await findProprietarioByUuid(proprietarioIdentificador)
...
const result = await pool.query(query, values)
```

```1:200:src/app/api/admin/imoveis/route.ts
import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
...
const imoveis = await listImoveis(filtros, limitNum, offset)
```

## 4. Frontend / UX
- **Wizards:**
  - `ImovelWizard` (5 passos) e `SimpleImovelWizard` (fluxo simplificado) estruturam o CRUD seguindo a ordem mandatória Guardian.
  - Steps dedicados (`LocationStep`, `GeneralDataStep`, `AmenidadesStep`, `ProximidadesStep`, `MediaStep`) agrupam dados com validações específicas.
- **Listagem:** `ImovelGrid.tsx` apresenta cards com permissões aplicadas (editar/excluir), integra filtros e paginação.
- **Hooks e formulários auxiliares:** `useEstadosCidades`, `useImovelWizard` (quando aplicável) para carregamento de dados e validação.
- **UX/Security:** uso de `PermissionGuard` para ações (criar, editar, remover), feedback consistente, logs de etapas, compatibilidade mobile (layout responsivo Tailwind).

## 5. Segurança, Permissões e Auditoria
- **Permissões necessárias:** slugs `imoveis` com níveis `CREATE`, `READ`, `UPDATE`, `DELETE`, integrados ao middleware unificado.
- **Auditoria:** `logAuditEvent` registra criação/edição; alterações em mídia/documentos também devem registrar logs via funções específicas.
- **Integração proprietários:** valida dual key antes de salvar (evita FK inválida). Falha → erro explícito.
- **Rascunhos:** rotas `rascunho` controlam persistência parcial com autenticação obrigatória.

## 6. Performance e Observabilidade
- **Consultas otimizadas:** `imoveis_completos` centraliza joins para listagem; índices em colunas de filtros asseguram performance.
- **Geocodificação com fallback:** `buscarCoordenadasPorEnderecoCompleto` deve ser protegida com rate limiting / cache (validar antes de produção).
- **Logs volumosos:** ações do wizard (vídeos/imagens) geram registros; planejar rotação / purga periódica.

## 7. Boas Práticas DRY / Reutilização
- Reutilizar funções de conversão (`converterValorNumerico`, `converterId`) antes de inserir no banco.
- Centralizar manipulação de amenidades/proximidades em seus módulos; não duplicar lógica no frontend.
- Guardar estado de formulário utilizando hooks compartilhados; manter padronização de campos (snake_case no backend, camelCase no front).
- Evitar hardcoding de enums; usar catálogos vindos de APIs (`tipos_imovel`, `finalidades_imovel`, `status_imovel`).

## 8. Testes e Checklists Obrigatórios
- **Automatizados:** `scripts/Test-DualKeyImoveis.ps1` (garante sincronização proprietario_fk/uuid), `scripts/test-validacoes-cadastro.ts` (validações front).
- **Manuais/documentados:** `docs/TESTES_DUAL_KEY_IMOVEIS.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md`, `docs/TESTES_FINAIS_COMPLETOS_FASE2.md` (grupo 3), `docs/INSTRUCOES_TESTE_EDICAO_CLIENTES.md` (impacto cruzado).
- **Guardian Checklist:** antes de alterações, percorrer a sequência completa do wizard, testar upload de mídia, amenidades, proximidades, restauração de rascunho e filtros da listagem.

## 9. Dependências Cruzadas
- **Clientes/Proprietários:** dual key para proprietários, validações de CPF/email; alterar lógica requer sincronização com o inventário de clientes/proprietários.
- **Permissões/RBAC:** criação/edição/exclusão de imóveis exige permissão `imoveis`; wizards só devem renderizar ações quando guardas confirmarem acesso.
- **Amenidades/Proximidades:** dependem de catálogos (`categorias_*`, `amenidades`, `proximidades`), com impacto direto no wizard.
- **Mídia/Documentos:** integra com serviços de armazenamento; scripts de manutenção de arquivos devem respeitar auditoria.
- **Dashboards & relatórios:** consumo de dados de imóveis (ex.: destaques, status); alterações na estrutura devem atualizar consultas em dashboards.

## 10. Riscos e Mitigações
- **Dados inconsistentes:** falha na sincronização proprietária gera imóveis órfãos → executar scripts dual key após alterações.
- **Quebra de ordem Guardian:** qualquer mudança na sequência do wizard deve ser pre-aprovada e documentada (proibido alterar sem autorização).
- **Uploads grandes:** mídia (imagens/vídeos) pode impactar performance; validar quotas e compressão.
- **Geocodificação externa:** serviços externos podem falhar ou rate limit → implementar retry/backoff.
- **Rollback:** manter scripts de reversão para cada migração, incluindo remoção segura de colunas/mídia.

## 11. Plano de Atualização Contínua
1. Atualizar este capítulo sempre que novos campos, etapas do wizard ou integrações forem adicionados.
2. Anexar evidências de testes (prints/logs) nas análises de impacto (`ANALISE_IMPACTO_IMOVEIS.md`).
3. Revisão bimestral das rotas e scripts associados para garantir aderência com Guardian Rules e desempenho.
4. Planejar unificação de logs/rascunhos em serviço centralizado para simplificar manutenção futura.

---

**Responsável pela atualização:** _(preencher)_


