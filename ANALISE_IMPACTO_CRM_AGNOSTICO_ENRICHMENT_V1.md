# 🔍 ANÁLISE DE IMPACTO: CRM_AGNOSTICO_ENRICHMENT_V1

**Data:** 01/04/2026 | **Solicitante:** Usuário | **Desenvolvedor:** Antigravity

## 📊 RESUMO EXECUTIVO
- **Tipo:** NOVA FUNCIONALIDADE (Infraestrutura)
- **Risco:** BAIXO (Apenas adição de coluna e nova rota de API)
- **Impacto:** NENHUM em funcionalidades existentes
- **Recomendação:** APROVAR para viabilizar Segment Builder do CRM Agnóstico

## 🎯 OBJETIVO
Implementar a infraestrutura de dados para o CRM Agnóstico, permitindo o armazenamento de snapshots de enriquecimento e a configuração de layouts via metadados JSON. Isso sustenta a UI desenvolvida em `src/app/crm/config/segmentos/page.tsx`.

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Leads Staging | Add | Baixo | Adição da coluna `enriquecimento_cache` |
| Segment Builder | Add | Baixo | Criação da Rota API de Configuração |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas modificadas:** 
  - `leads_staging`: Adição da coluna `enriquecimento_cache` (JSONB) para persistência do resumo enriquecido.
- **Estrutura alterada:** Preservada (Incremental).
- **Dados existentes:** Preservados.
- **Rollback possível:** Sim (`ALTER TABLE leads_staging DROP COLUMN`).
- **Transações necessárias:** Sim.

## 🔌 IMPACTO APIs
- **Rotas modificadas:** Nenhuma (Criando nova).
- **Novas Rotas:** `src/app/api/crm/config/segmentos/route.ts`.
- **Compatibilidade:** Total.
- **Middleware afetado:** `UnifiedPermissionMiddleware.ts` deve validar acesso à rota.

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** `SegmentConfigPage`.
- **UX alterada:** Nova página de configuração agora será funcional (carregamento e salvamento ativos).

## ⚠️ RISCOS IDENTIFICADOS
1. **Risco Baixo:** O `EnrichmentService` pode começar a falhar se as queries forem executadas antes da migration. **Mitigação:** Executar migration ANTES de qualquer alteração de código.

## 🛡️ PLANO ROLLBACK
1. Remover coluna `enriquecimento_cache` de `leads_staging`: 
   `ALTER TABLE leads_staging DROP COLUMN IF EXISTS enriquecimento_cache;`
2. Remover arquivos das novas rotas de API.
3. **Tempo estimado:** 2 minutos.

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Verificar se coluna `enriquecimento_cache` aceita JSONB.
- [ ] Testar GET na nova API `/api/crm/config/segmentos`.
- [ ] Testar POST com JSON de layout no Segment Builder.

## 📅 CRONOGRAMA
- **Deploy Banco:** Hoje.
- **Deploy API:** Hoje.
- **Monitoramento:** Imediato via logs de erro.

## ✅ AUTORIZAÇÃO
- [x] Análise aprovada pelo solicitante (Confirmado via prompt "prossiga")
- [x] Riscos aceitos
- [x] Plano de rollback aprovado
- [x] Backup confirmado (Banco local)

**Assinatura:** Antigravity (AI Agent) **Data:** 2026-04-01
