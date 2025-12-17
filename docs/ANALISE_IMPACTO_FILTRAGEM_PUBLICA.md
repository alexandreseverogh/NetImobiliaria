# 🔍 ANÁLISE DE IMPACTO: FILTRAGEM PÚBLICA DE IMÓVEIS

**Data:** 14/11/25 | **Solicitante:** Usuário Net Imobiliária | **Desenvolvedor:** Assistente (GPT-5.1 Codex)

## 📊 RESUMO EXECUTIVO
- **Tipo:** Melhoria incremental (front público + API dedicada)
- **Risco:** Médio (novos fluxos de consulta expostos publicamente)
- **Impacto:** Médio (performance e UX pública)
- **Recomendação:** Aprovar com observação para monitorar consultas SQL e uso de rate limiting

## 🎯 OBJETIVO
Implementar uma camada de filtros avançados na landing pública de imóveis, mantendo o grid “Em Destaque” como base e exibindo um grid sobreposto apenas quando o internauta aplica filtros. A solução deve entregar UX premium, sem tocar na aplicação Admin e obedecendo integralmente às Guardian Rules.

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Landing pública (`src/app/landpaging`) | Melhoria | Médio | Adicionar painel de filtros e grid overlay |
| Componentes públicos (`SearchForm`, `LandingPropertyCard`) | Melhoria | Baixo | Evoluir para filtros dinâmicos e reutilizar cards |
| API pública de imóveis | Adição | Médio | Criar endpoint `/api/public/imoveis/pesquisa` com paginação |
| Serviços de banco (`lib/database`) | Melhoria | Médio | Extrair consultas parametrizadas e reutilizáveis |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas consultadas:** `imoveis`, `finalidades`, `tipos_imoveis`, `estados`, `municipios`, `imovel_localizacao` (ou equivalente), `imovel_imagens`.
- **Estrutura alterada:** Preservada (nenhuma migration neste ciclo).
- **Dados existentes:** Somente leitura.
- **Rollback possível:** Sim, basta remover a nova rota e componentes públicos.
- **Transações necessárias:** Não (consultas apenas).

## 🔌 IMPACTO APIs
- **Nova rota:** `GET /api/public/imoveis/pesquisa`
  - Query params opcionais: finalidade, tipo, estado, cidade, bairro, faixa de preço (min/max), quartos_min, banheiros_min, suites_min, garagem_min, area_min, pagina, limite.
  - Respostas padronizadas: `{ success, data, pagination }`.
  - Rate limiting específico e prepared statements.
- **Breaking changes:** Nenhum.
- **Compatibilidade:** Total; rotas existentes continuam intactas.
- **Middleware afetado:** Será reaproveitado o rate limiting público (quando aplicável) e validações comuns.

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** `SearchForm` (será evoluído para painel de filtros premium), `LandingPropertyCard`, landing pública.
- **UX alterada:** Preservada para grid de destaque; novo overlay replicando estilo atual.
- **Permissões modificadas:** Não.
- **Responsividade:** Ampliada (drawer/modal para mobile, painel amplo no desktop).

## ⚠️ RISCOS IDENTIFICADOS
1. **Risco alto:** consultas pesadas ao listar todos os imóveis → Mitigação: paginação obrigatória, índices nas colunas filtráveis, limite de registros (ex.: 20 por página).
2. **Risco médio:** exposição de imóveis não validados → Mitigação: filtro por status/flag de publicação (mesmo que inicialmente exibamos todos, manter cláusulas para excluir rascunhos ou registros internos).
3. **Risco baixo:** UX inconsistente com Admin → Mitigação: reaproveitar `LandingPropertyCard`, manter design tokens existentes e revisar com checklist UX.

## 🛡️ PLANO ROLLBACK
1. Remover rota `/api/public/imoveis/pesquisa` e quaisquer serviços auxiliares.
2. Reverter alterações em `src/app/landpaging` e componentes públicos para versões anteriores.
3. Limpar caches e rebuildar o front para garantir que somente o grid de destaque permaneça.
4. Tempo estimado: 20 minutos.
5. Responsável: Assistente (GPT-5.1 Codex) sob demanda do usuário.

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Testes unitários das funções de filtro (mínimo/máximo, dependência estado→cidade→bairro).
- [ ] Testes de integração da rota pública (sem filtros, com filtros múltiplos, paginação).
- [ ] Testes de regressão no grid “Em Destaque”.
- [ ] Testes de performance (tempo de resposta < 500ms com filtros comuns).
- [ ] Testes em todos os perfis de UX (desktop/mobile).
- [ ] Testes de responsividade (drawer mobile, painel desktop).
- [ ] Testes de acessibilidade (foco, labels, leitores de tela).

## 📅 CRONOGRAMA
- **Análise:** concluída (14/11/25).
- **Desenvolvimento:** 2 a 3 dias úteis (inclui front+API).
- **Testes:** 1 dia dedicado (lista acima).
- **Deploy:** após sua validação.
- **Monitoramento:** 2 dias observando métricas de uso e erros.

## ✅ AUTORIZAÇÃO
- [x] Análise aprovada pelo solicitante.
- [ ] Riscos aceitos.
- [ ] Plano de rollback aprovado.
- [ ] Cronograma aprovado.
- [ ] Backup confirmado (não aplicável, pois não há migração).

_Assinatura:_ ___________________ **Data:** ___________

