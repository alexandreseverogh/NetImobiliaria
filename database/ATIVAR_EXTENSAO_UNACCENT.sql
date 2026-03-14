-- Protocolo de Atualização de Filtros (Guardian Rules)
-- Objetivo: Ativar a extensão de normalização de acentos no PostgreSQL
-- Este comando é OBRIGATÓRIO para que os novos filtros avançados (Endereco, Bairro, Cidade) funcionem sem erro na VPS.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verificação:
-- SELECT unaccent('Demócrito'); -- Deve retornar 'Democrito'
