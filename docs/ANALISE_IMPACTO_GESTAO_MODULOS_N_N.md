# 🔍 ANÁLISE DE IMPACTO: Hub de Provisionamento 4-Cols e Gestão Módulo-Feature N:N

**Data:** 2026-04-14 | **Solicitante:** Super Admin | **Desenvolvedor:** Antigravity

## 📊 RESUMO EXECUTIVO
- **Tipo:** MELHORIA / REESTRUTURAÇÃO
- **Risco:** BAIXO
- **Impacto:** MÉDIO
- **Recomendação:** APROVAR

## 🎯 OBJETIVO
1. Reestruturar o `MasterProvisioningHub.tsx` para apresentar um grid de 4 colunas (Segmentos, Tenants, Módulos, Funcionalidades) para maior clareza visual e controle pontual sobre o contrato da empresa.
2. Criar a interface e API de Gestão N:N em `/admin/master/modules` que permitirá ao Super Admin atrelar ou desatrelar funcionalidades (`system_features`) dos módulos macros (`system_modules`) do sistema globalmente.
3. Exibição de Funcionalidades Órfãs (sem módulo) na matriz de provisionamento para não haver perda de rastreabilidade.

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Master Provisioning Hub | Modificação UI/UX | Baixo | Alterar de 3 para 4 colunas; isolar componentes visuais. |
| Master Provisioning API | Adição | Baixo | Consulta para retornar 'features órfãs' independentemente da query `LEFT JOIN` atual. |
| Master Modules Page | Modificação UI | Baixo | Adicionar painel interativo de drag/drop ou multi-select para features x módulos. |
| Master Modules API | Adição | Baixo | Criar endpoint para gravar/ler as relações N:N na tabela `system_feature_modules`. |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas modificadas:** Nenhuma estrutura de tabela será alterada.
- **Inserção/Modificação:** A tabela `system_feature_modules` receberá inserts/deletes com base na ação na interface N:N (Gestão de Módulos).
- **Estrutura alterada:** Preservada. (Já existe `system_feature_modules` para PIVO N:N).
- **Dados existentes:** Preservados.
- **Transações necessárias:** Sim, para a atualização atômica de todos os módulos de uma feature.

## 🔌 IMPACTO APIs
- **Rotas modificadas:** 
  - `GET /api/admin/master/provisioning/route.ts` - Refatorada para buscar todas as dependências de sistema independentes de estarem vinculadas.
  - `POST /api/admin/master/modules/[id]/features/route.ts` (Nova)
  - `GET /api/admin/master/features/route.ts` (Nova, opcional, para ler todas features ativas)
- **Breaking changes:** Não
- **Middleware afetado:** Nenhum, todas continuarão blindadas pela check de 'Super Admin'.

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** `MasterProvisioningHub.tsx`, e interfaces modais de Módulos.
- **UX alterada:** Modificada (Melhoria). Agora é um dashboard holístico horizontal de 4 colunas ativáveis passo a passo.

## ⚠️ RISCOS IDENTIFICADOS
1. **Risco Baixo:** Bugs visuais na 4ª coluna se houverem muitas features. **Mitigação:** Adicionar scroll independente e filtros de busca / custom scrollbar na coluna 4.

## 🛡️ PLANO ROLLBACK
1. Reverter o branch (git checkout).
2. Restore dos arquivos `MasterProvisioningHub.tsx` e originais de `route.ts`.
3. **Tempo estimado:** 5 minutos
4. **Responsável:** Antigravity

## 🧪 TESTES OBRIGATÓRIOS
- [x] Testes de regressão UI na tela principal (Tenants e Provisioning)
- [x] Testes de inserção no banco N:N (Módulos vs Features)
- [x] Teste de Super Admin.

## ✅ AUTORIZAÇÃO
- [x] Análise aprovada pelo solicitante
- [x] Riscos aceitos
- [x] Plano de rollback aprovado
- [x] Backup confirmado
