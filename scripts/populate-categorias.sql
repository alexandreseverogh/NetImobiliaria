-- =====================================================
-- POPULAR CATEGORIAS DE AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Dados estáticos originais
-- =====================================================

-- Limpar tabelas existentes
TRUNCATE TABLE categorias_amenidades CASCADE;
TRUNCATE TABLE categorias_proximidades CASCADE;

-- Resetar sequências
ALTER SEQUENCE categorias_amenidades_id_seq RESTART WITH 1;
ALTER SEQUENCE categorias_proximidades_id_seq RESTART WITH 1;

-- =====================================================
-- CATEGORIAS DE AMENIDADES
-- =====================================================

INSERT INTO categorias_amenidades (nome, descricao, icone, cor, ordem, ativo, created_at, updated_at) VALUES
('Lazer & Entretenimento', 'Amenidades relacionadas a lazer e entretenimento', 'game', '#FF6B6B', 1, true, NOW(), NOW()),
('Esporte & Saúde', 'Amenidades relacionadas a esportes e saúde', 'fitness', '#4ECDC4', 2, true, NOW(), NOW()),
('Segurança', 'Amenidades relacionadas a segurança', 'lock', '#45B7D1', 3, true, NOW(), NOW()),
('Conveniência & Serviços', 'Amenidades relacionadas a conveniência e serviços', 'shopping', '#96CEB4', 4, true, NOW(), NOW()),
('Verde & Sustentabilidade', 'Amenidades relacionadas a sustentabilidade', 'leaf', '#FFEAA7', 5, true, NOW(), NOW()),
('Tecnologia & Conectividade', 'Amenidades relacionadas a tecnologia', 'computer', '#DDA0DD', 6, true, NOW(), NOW()),
('Bem-estar & Relaxamento', 'Amenidades relacionadas a bem-estar', 'spa', '#3B82F6', 7, true, NOW(), NOW()),
('Públicos Especiais', 'Amenidades para públicos específicos', 'users', '#F39C12', 8, true, NOW(), NOW()),
('Estrutura & Arquitetura', 'Amenidades estruturais e arquitetônicas', 'building', '#E74C3C', 9, true, NOW(), NOW());

-- =====================================================
-- CATEGORIAS DE PROXIMIDADES
-- =====================================================

INSERT INTO categorias_proximidades (nome, descricao, icone, cor, ordem, ativo, created_at, updated_at) VALUES
('Comércio & Shopping', 'Pontos de interesse comerciais', 'shopping-bag', '#FF6B6B', 1, true, NOW(), NOW()),
('Alimentação', 'Restaurantes e estabelecimentos de alimentação', 'utensils', '#4ECDC4', 2, true, NOW(), NOW()),
('Saúde & Bem-estar', 'Estabelecimentos de saúde e bem-estar', 'hospital', '#45B7D1', 3, true, NOW(), NOW()),
('Educação', 'Instituições educacionais', 'graduation-cap', '#96CEB4', 4, true, NOW(), NOW()),
('Transporte', 'Opções de transporte público e privado', 'bus', '#FFEAA7', 5, true, NOW(), NOW()),
('Lazer & Cultura', 'Locais de lazer e cultura', 'theater-masks', '#DDA0DD', 6, true, NOW(), NOW()),
('Serviços', 'Serviços diversos', 'tools', '#F39C12', 7, true, NOW(), NOW());

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================

SELECT 'Categorias de Amenidades' as tipo, COUNT(*) as total FROM categorias_amenidades
UNION ALL
SELECT 'Categorias de Proximidades' as tipo, COUNT(*) as total FROM categorias_proximidades;

-- Mostrar categorias criadas
SELECT 'Amenidades' as tipo, nome, ordem FROM categorias_amenidades ORDER BY ordem;
SELECT 'Proximidades' as tipo, nome, ordem FROM categorias_proximidades ORDER BY ordem;
