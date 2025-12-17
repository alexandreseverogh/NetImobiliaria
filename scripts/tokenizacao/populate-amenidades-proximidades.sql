-- =====================================================
-- POPULAR AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Dados estáticos originais
-- =====================================================

-- Limpar tabelas existentes
TRUNCATE TABLE amenidades CASCADE;
TRUNCATE TABLE proximidades CASCADE;

-- Resetar sequências
ALTER SEQUENCE amenidades_id_seq RESTART WITH 1;
ALTER SEQUENCE proximidades_id_seq RESTART WITH 1;

-- =====================================================
-- AMENIDADES - LAZER & ENTRETENIMENTO
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'star', false, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Salão de festas', 'Salão para eventos e comemorações'),
    ('Espaço gourmet', 'Área gourmet para refeições especiais'),
    ('Churrasqueira', 'Área para churrascos'),
    ('Playground infantil', 'Área de recreação para crianças'),
    ('Brinquedoteca', 'Espaço com brinquedos para crianças'),
    ('Sala de jogos', 'Ambiente para jogos e entretenimento'),
    ('Cinema privativo', 'Sala de cinema exclusiva'),
    ('Lounge/bar', 'Área de descanso e drinks'),
    ('Pista de boliche', 'Pista para bowling'),
    ('Discoteca/boate', 'Área para festas e dança'),
    ('Espaço pet / pet care', 'Área dedicada aos pets')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento') AS cat;

-- =====================================================
-- AMENIDADES - ESPORTE & SAUDE
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'fitness', CASE WHEN nome IN ('Piscina adulta', 'Academia/fitness center', 'Piscina infantil') THEN true ELSE false END, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Piscina adulta', 'Piscina para adultos'),
    ('Piscina infantil', 'Piscina para crianças'),
    ('Piscina aquecida', 'Piscina com aquecimento'),
    ('Piscina olímpica', 'Piscina de tamanho olímpico'),
    ('Academia/fitness center', 'Academia completa'),
    ('Quadra poliesportiva', 'Quadra para diversos esportes'),
    ('Quadra de tênis', 'Quadra específica para tênis'),
    ('Quadra de squash', 'Quadra para squash'),
    ('Campo de futebol society', 'Campo para futebol society'),
    ('Pista de corrida / caminhada', 'Pista para exercícios'),
    ('Estúdio de pilates/yoga', 'Espaço para pilates e yoga'),
    ('Spa com sauna/massagem', 'Área de spa completa'),
    ('Vestiários com duchas', 'Vestiários equipados')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde') AS cat;

-- =====================================================
-- AMENIDADES - SEGURANCA
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'shield', CASE WHEN nome IN ('Portaria 24h', 'Circuito interno de câmeras (CFTV)') THEN true ELSE false END, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Portaria 24h', 'Portaria com atendimento 24 horas'),
    ('Controle de acesso por biometria', 'Acesso controlado por biometria'),
    ('Portão eletrônico', 'Portão automatizado'),
    ('Circuito interno de câmeras (CFTV)', 'Sistema de monitoramento'),
    ('Segurança perimetral', 'Segurança no perímetro'),
    ('Clausura (dupla portaria)', 'Sistema de dupla portaria'),
    ('Alarme monitorado', 'Sistema de alarme'),
    ('Brigada de incêndio', 'Equipe de segurança contra incêndio'),
    ('Elevador com senha/cartão', 'Elevador com acesso controlado')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_amenidades WHERE nome = 'Segurança') AS cat;

-- =====================================================
-- AMENIDADES - CONVENIENCIA & SERVICOS
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'service', CASE WHEN nome IN ('Estacionamento privativo', 'Vagas para visitantes') THEN true ELSE false END, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Estacionamento privativo', 'Vagas de garagem privativas'),
    ('Vagas para visitantes', 'Vagas para visitantes'),
    ('Car wash / lava-jato', 'Serviço de lavagem de carros'),
    ('Market interno / mini-mercado', 'Conveniência interna'),
    ('Coworking / business center', 'Espaço de trabalho'),
    ('Sala de reuniões', 'Sala para reuniões'),
    ('Bicicletário', 'Espaço para bicicletas'),
    ('Oficina maker/ferramentaria', 'Espaço para projetos'),
    ('Concierge', 'Serviço de concierge'),
    ('Serviço de arrumação/limpeza', 'Serviços de limpeza'),
    ('Delivery box (armários inteligentes para entregas)', 'Sistema de entregas'),
    ('Lavanderia compartilhada', 'Lavanderia comum')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços') AS cat;

-- =====================================================
-- PROXIMIDADES - COMÉRCIO & SHOPPING
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'shopping', CASE WHEN nome IN ('Shopping Center', 'Supermercado') THEN true ELSE false END, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Shopping Center', 'Centro comercial'),
    ('Supermercado', 'Supermercado'),
    ('Farmácia', 'Farmácia'),
    ('Banco', 'Agência bancária'),
    ('Loja de roupas', 'Loja de vestuário'),
    ('Padaria', 'Padaria'),
    ('Mercado municipal', 'Mercado municipal'),
    ('Feira livre', 'Feira livre')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping') AS cat;

-- =====================================================
-- PROXIMIDADES - SAÚDE & BEM-ESTAR
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, cat.id, 'hospital', CASE WHEN nome IN ('Hospital', 'Posto de saúde') THEN true ELSE false END, ROW_NUMBER() OVER(), true, NOW(), NOW()
FROM (VALUES 
    ('Hospital', 'Hospital'),
    ('Posto de saúde', 'Unidade básica de saúde'),
    ('Clínica médica', 'Clínica médica'),
    ('Academia', 'Academia de ginástica'),
    ('Fisioterapia', 'Clínica de fisioterapia'),
    ('Psicólogo', 'Consultório psicológico'),
    ('Dentista', 'Consultório odontológico'),
    ('Laboratório', 'Laboratório de exames')
) AS v(nome, descricao)
CROSS JOIN (SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar') AS cat;

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================

SELECT 'Amenidades' as tipo, COUNT(*) as total FROM amenidades
UNION ALL
SELECT 'Proximidades' as tipo, COUNT(*) as total FROM proximidades;

-- Mostrar algumas amenidades por categoria
SELECT ca.nome as categoria, COUNT(a.id) as total_amenidades 
FROM categorias_amenidades ca
LEFT JOIN amenidades a ON ca.id = a.categoria_id
GROUP BY ca.nome, ca.ordem
ORDER BY ca.ordem;

-- Mostrar algumas proximidades por categoria
SELECT cp.nome as categoria, COUNT(p.id) as total_proximidades 
FROM categorias_proximidades cp
LEFT JOIN proximidades p ON cp.id = p.categoria_id
GROUP BY cp.nome, cp.ordem
ORDER BY cp.ordem;
