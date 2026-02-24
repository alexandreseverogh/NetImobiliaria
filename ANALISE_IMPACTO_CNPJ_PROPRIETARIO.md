# 🔍 ANÁLISE DE IMPACTO: Cadastro de Proprietários (CNPJ e Validação CPF Admin)

**Data:** 2026-02-24 | **Solicitante:** Usuário | **Desenvolvedor:** Antigravity

## 📊 RESUMO EXECUTIVO
- **Tipo:** MELHORIA / REGRAS DE NEGÓCIO
- **Risco:** MÉDIO (Devido a alteração de esquema de banco de dados e lógica de validação)
- **Impacto:** ALTO (Afeta o fluxo principal de cadastro de proprietários em admin e landpaging)
- **Recomendação:** APROVAR E IMPLEMENTAR

## 🎯 OBJETIVO
1.  Introduzir o campo **CNPJ** na tabela de proprietários.
2.  Garantir a **exclusividade mútua** entre CPF e CNPJ na interface e no banco de dados.
3.  Implementar validações brasileiras para CNPJ.
4.  Permitir o uso de CPF "999.999.999-99" **exclusivamente** via interface administrativa.
5.  Bloquear o uso de CPF "999..." na interface pública (landpaging).

## 📋 FUNCIONALIDADES AFETADAS
| Funcionalidade | Tipo Impacto | Risco | Ação Necessária |
|----------------|--------------|-------|-----------------|
| Banco de Dados | Estrutural | Médio | Adicionar coluna `cnpj` à tabela `proprietarios`. |
| API de Cadastro | Lógica | Médio | Atualizar validações de CPF/CNPJ e exclusividade. |
| Admin: Novo/Edit | UI/UX | Médio | Adicionar campo CNPJ, lógica de exclusividade e validação especial de CPF. |
| Landpaging: Registro | UI/UX | Médio | Adicionar campo CNPJ, lógica de exclusividade e bloqueio de CPF fictício. |

## 🗄️ IMPACTO BANCO DE DADOS
- **Tabelas modificadas:** `proprietarios`.
- **Estrutura alterada:** Adição da coluna `cnpj` (VARCHAR).
- **Dados existentes:** Preservados. O campo CPF continuará preenchido para registros antigos.
- **Rollback possível:** Sim (`ALTER TABLE proprietarios DROP COLUMN cnpj`).

## 🔌 IMPACTO APIs
- **Rotas modificadas:** 
    - `/api/admin/proprietarios`
    - `/api/public/auth/register` (e auxiliares de checagem)
- **Breaking changes:** Não, mas requer atenção à tipagem dos objetos retornados.

## 🎨 IMPACTO FRONTEND
- **Componentes afetados:** `RegisterForm.tsx`, Páginas de proprietário no Admin.
- **UX alterada:** Usuário escolhe entre preencher CPF ou CNPJ. Ao digitar um, o outro é limpo.
- **Bloqueio de Navegação:** Se o documento for inválido, o foco permanece no campo.

## ⚠️ RISCOS IDENTIFICADOS
1. **Risco Médio:** Incompatibilidade temporária entre código novo e banco antigo durante o deploy.
   - **Mitigação:** Executar a migração do banco ANTES do deploy do código.
2. **Risco Baixo:** Erros de validação em cadastros via ADMIN devido à regra dos "999...".
   - **Mitigação:** Testes rigorosos em ambos os contextos (Admin vs Público).

## 🛡️ PLANO ROLLBACK
1. Reverter alterações nos arquivos `.ts` e `.tsx`.
2. Remover a coluna `cnpj` se necessário (embora não obrigatório se a UI for revertida).
3. **Tempo estimado:** 10 minutos.

## 🧪 TESTES OBRIGATÓRIOS
- [ ] Cadastro via Admin com CPF normal (sucesso).
- [ ] Cadastro via Admin com CPF "999..." (sucesso).
- [ ] Cadastro via Admin com CNPJ válido (sucesso, CPF limpo).
- [ ] Cadastro via Admin com CNPJ inválido (bloqueio).
- [ ] Registro via Público com CPF normal (sucesso).
- [ ] Registro via Público com CPF "999..." (falha/bloqueio).
- [ ] Registro via Público com CNPJ válido (sucesso).

## 📅 CRONOGRAMA
- **Desenvolvimento:** 40-60 minutos.
- **Testes:** 20 minutos.
- **Deploy:** Imediato após aprovação.
