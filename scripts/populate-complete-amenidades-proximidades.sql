-- =====================================================
-- POPULAR TODAS AS AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Dados completos conforme MIGRAÇÃO_AMENIDADES.md
-- =====================================================

-- Limpar tabelas existentes
TRUNCATE TABLE amenidades CASCADE;
TRUNCATE TABLE proximidades CASCADE;

-- Resetar sequências
ALTER SEQUENCE amenidades_id_seq RESTART WITH 1;
ALTER SEQUENCE proximidades_id_seq RESTART WITH 1;

-- =====================================================
-- AMENIDADES - CATEGORIA 1: LAZER & ENTRETENIMENTO
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 1, 'star', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Salão de festas', 'Salão para eventos e comemorações', false, 1),
    ('Espaço gourmet', 'Área gourmet para refeições especiais', false, 2),
    ('Churrasqueira', 'Área para churrascos', true, 3),
    ('Playground infantil', 'Área de recreação para crianças', true, 4),
    ('Brinquedoteca', 'Espaço com brinquedos para crianças', false, 5),
    ('Sala de jogos', 'Ambiente para jogos e entretenimento', false, 6),
    ('Cinema privativo', 'Sala de cinema exclusiva', true, 7),
    ('Lounge/bar', 'Área de descanso e drinks', false, 8),
    ('Pista de boliche', 'Pista para bowling', false, 9),
    ('Discoteca/boate', 'Área para festas e dança', false, 10),
    ('Espaço pet / pet care', 'Área dedicada aos pets', true, 11)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 2: ESPORTE & SAÚDE
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 2, 'fitness', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Piscina adulta', 'Piscina para adultos', true, 1),
    ('Piscina infantil', 'Piscina para crianças', true, 2),
    ('Piscina aquecida', 'Piscina com aquecimento', true, 3),
    ('Piscina olímpica', 'Piscina de tamanho olímpico', false, 4),
    ('Academia/fitness center', 'Academia completa', true, 5),
    ('Quadra poliesportiva', 'Quadra para diversos esportes', true, 6),
    ('Quadra de tênis', 'Quadra específica para tênis', false, 7),
    ('Quadra de squash', 'Quadra para squash', false, 8),
    ('Campo de futebol society', 'Campo para futebol society', false, 9),
    ('Pista de corrida / caminhada', 'Pista para exercícios', true, 10),
    ('Estúdio de pilates/yoga', 'Espaço para pilates e yoga', true, 11),
    ('Spa com sauna/massagem', 'Área de spa completa', true, 12),
    ('Vestiários com duchas', 'Vestiários equipados', false, 13)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 3: SEGURANÇA (JÁ COMPLETA)
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 3, 'shield', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Portaria 24h', 'Portaria com atendimento 24 horas', true, 1),
    ('Controle de acesso por biometria', 'Acesso controlado por biometria', true, 2),
    ('Portão eletrônico', 'Portão automatizado', true, 3),
    ('Circuito interno de câmeras (CFTV)', 'Sistema de monitoramento', true, 4),
    ('Segurança perimetral', 'Segurança no perímetro', false, 5),
    ('Clausura (dupla portaria)', 'Sistema de dupla portaria', false, 6),
    ('Alarme monitorado', 'Sistema de alarme', true, 7),
    ('Brigada de incêndio', 'Equipe de segurança contra incêndio', false, 8),
    ('Elevador com senha/cartão', 'Elevador com acesso controlado', false, 9)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 4: CONVENIÊNCIA & SERVIÇOS (JÁ COMPLETA)
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 4, 'service', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Estacionamento privativo', 'Vagas de garagem privativas', true, 1),
    ('Vagas para visitantes', 'Vagas para visitantes', true, 2),
    ('Car wash / lava-jato', 'Serviço de lavagem de carros', false, 3),
    ('Market interno / mini-mercado', 'Conveniência interna', true, 4),
    ('Coworking / business center', 'Espaço de trabalho', false, 5),
    ('Sala de reuniões', 'Sala para reuniões', false, 6),
    ('Bicicletário', 'Espaço para bicicletas', false, 7),
    ('Oficina maker/ferramentaria', 'Espaço para projetos', false, 8),
    ('Concierge', 'Serviço de concierge', true, 9),
    ('Serviço de arrumação/limpeza', 'Serviços de limpeza', false, 10),
    ('Delivery box (armários inteligentes para entregas)', 'Sistema de entregas', false, 11),
    ('Lavanderia compartilhada', 'Lavanderia comum', false, 12)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 5: VERDE & SUSTENTABILIDADE
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 5, 'leaf', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Jardim comunitário', 'Jardim compartilhado entre moradores', false, 1),
    ('Horta orgânica', 'Horta para cultivo de alimentos orgânicos', false, 2),
    ('Área de compostagem', 'Sistema de compostagem de resíduos', false, 3),
    ('Telhado verde', 'Telhado com vegetação', false, 4),
    ('Sistema de captação de água da chuva', 'Captação e reuso de água pluvial', false, 5),
    ('Painéis solares', 'Energia solar renovável', true, 6),
    ('Bicicletário coberto', 'Estacionamento para bicicletas', false, 7),
    ('Área de reciclagem', 'Ponto de coleta seletiva', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 6: TECNOLOGIA & CONECTIVIDADE
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 6, 'wifi', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Wi-Fi de alta velocidade', 'Internet de alta velocidade', true, 1),
    ('Sala de videoconferência', 'Sala para reuniões virtuais', false, 2),
    ('Sistema de automação residencial', 'Controle inteligente da casa', true, 3),
    ('Carregadores para veículos elétricos', 'Estações de carregamento', false, 4),
    ('Sistema de som ambiente', 'Sistema de áudio integrado', false, 5),
    ('Controle de acesso por app', 'Acesso via aplicativo móvel', true, 6),
    ('Sistema de monitoramento remoto', 'Monitoramento via smartphone', false, 7),
    ('Área de coworking digital', 'Espaço de trabalho com tecnologia', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 7: BEM-ESTAR & RELAXAMENTO
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 7, 'heart', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Spa completo', 'Spa com tratamentos relaxantes', true, 1),
    ('Sauna finlandesa', 'Sauna tradicional finlandesa', false, 2),
    ('Banho turco', 'Banho turco tradicional', false, 3),
    ('Sala de massagem', 'Sala para massagens terapêuticas', true, 4),
    ('Área de meditação', 'Espaço para práticas meditativas', false, 5),
    ('Jardim zen', 'Jardim para relaxamento', false, 6),
    ('Sala de aromaterapia', 'Terapia com aromas', false, 7),
    ('Área de hidroterapia', 'Tratamento com água', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 8: PÚBLICOS ESPECIAIS
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 8, 'users', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Área para idosos', 'Espaço adaptado para idosos', false, 1),
    ('Playground acessível', 'Parquinho para crianças com deficiência', false, 2),
    ('Sala de amamentação', 'Espaço para mães amamentarem', false, 3),
    ('Área para pets', 'Espaço dedicado aos animais de estimação', true, 4),
    ('Sala de estudos silenciosa', 'Ambiente para estudos', false, 5),
    ('Área para adolescentes', 'Espaço para jovens', false, 6),
    ('Sala de reunião para famílias', 'Sala para encontros familiares', false, 7),
    ('Área para eventos especiais', 'Espaço para celebrações', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- AMENIDADES - CATEGORIA 9: ESTRUTURA & ARQUITETURA
-- =====================================================

INSERT INTO amenidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 9, 'building', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Fachada arquitetônica', 'Design arquitetônico diferenciado', true, 1),
    ('Lobby de entrada', 'Recepção elegante', true, 2),
    ('Escadaria monumental', 'Escadaria com design especial', false, 3),
    ('Área de exposição', 'Espaço para exposições', false, 4),
    ('Sala de estar comunitária', 'Área de convivência', false, 5),
    ('Biblioteca comunitária', 'Biblioteca compartilhada', false, 6),
    ('Área de eventos', 'Espaço para eventos', false, 7),
    ('Sala de reuniões executivas', 'Sala para reuniões de negócios', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 1: COMÉRCIO & SHOPPING (JÁ COMPLETA)
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 1, 'shopping', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Shopping Center', 'Centro comercial', true, 1),
    ('Supermercado', 'Supermercado', true, 2),
    ('Farmácia', 'Farmácia', true, 3),
    ('Banco', 'Agência bancária', true, 4),
    ('Loja de roupas', 'Loja de vestuário', false, 5),
    ('Padaria', 'Padaria', false, 6),
    ('Mercado municipal', 'Mercado municipal', false, 7),
    ('Feira livre', 'Feira livre', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 2: ALIMENTAÇÃO
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 2, 'utensils', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Restaurante', 'Restaurante', true, 1),
    ('Pizzaria', 'Pizzaria', true, 2),
    ('Hamburgueria', 'Hamburgueria', false, 3),
    ('Sorveteria', 'Sorveteria', false, 4),
    ('Café', 'Café', false, 5),
    ('Bar', 'Bar', false, 6),
    ('Lanchonete', 'Lanchonete', false, 7),
    ('Food truck', 'Food truck', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 3: SAÚDE & BEM-ESTAR (JÁ COMPLETA)
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 3, 'hospital', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Hospital', 'Hospital', true, 1),
    ('Posto de saúde', 'Unidade básica de saúde', true, 2),
    ('Clínica médica', 'Clínica médica', false, 3),
    ('Academia', 'Academia de ginástica', true, 4),
    ('Fisioterapia', 'Clínica de fisioterapia', false, 5),
    ('Psicólogo', 'Consultório psicológico', false, 6),
    ('Dentista', 'Consultório odontológico', false, 7),
    ('Laboratório', 'Laboratório de exames', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 4: EDUCAÇÃO
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 4, 'graduation-cap', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Escola infantil', 'Escola para crianças pequenas', true, 1),
    ('Escola fundamental', 'Escola fundamental', true, 2),
    ('Escola de ensino médio', 'Escola de ensino médio', false, 3),
    ('Universidade', 'Universidade', false, 4),
    ('Biblioteca', 'Biblioteca pública', false, 5),
    ('Centro de idiomas', 'Escola de idiomas', false, 6),
    ('Escola de música', 'Escola de música', false, 7),
    ('Centro de treinamento', 'Centro de capacitação', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 5: TRANSPORTE
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 5, 'bus', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Ponto de ônibus', 'Ponto de ônibus', true, 1),
    ('Estação de metrô', 'Estação de metrô', true, 2),
    ('Estação de trem', 'Estação de trem', false, 3),
    ('Taxi', 'Ponto de táxi', false, 4),
    ('Uber', 'Área para aplicativos', false, 5),
    ('Bicicletário público', 'Estacionamento para bicicletas', false, 6),
    ('Estacionamento público', 'Estacionamento público', false, 7),
    ('Terminal rodoviário', 'Terminal de ônibus', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 6: LAZER & CULTURA
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 6, 'theater-masks', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Teatro', 'Teatro', true, 1),
    ('Cinema', 'Cinema', true, 2),
    ('Museu', 'Museu', false, 3),
    ('Parque', 'Parque público', true, 4),
    ('Praça', 'Praça pública', false, 5),
    ('Galeria de arte', 'Galeria de arte', false, 6),
    ('Casa de shows', 'Casa de shows', false, 7),
    ('Centro cultural', 'Centro cultural', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- PROXIMIDADES - CATEGORIA 7: SERVIÇOS
-- =====================================================

INSERT INTO proximidades (nome, descricao, categoria_id, icone, popular, ordem, ativo, created_at, updated_at) 
SELECT nome, descricao, 7, 'briefcase', popular, ordem, true, NOW(), NOW()
FROM (VALUES 
    ('Correios', 'Agência dos correios', true, 1),
    ('Delegacia', 'Delegacia de polícia', false, 2),
    ('Bombeiros', 'Corpo de bombeiros', false, 3),
    ('Prefeitura', 'Prefeitura municipal', false, 4),
    ('Cartório', 'Cartório', false, 5),
    ('Advocacia', 'Escritório de advocacia', false, 6),
    ('Contabilidade', 'Escritório de contabilidade', false, 7),
    ('Consultório médico', 'Consultório médico', false, 8)
) AS v(nome, descricao, popular, ordem);

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================

SELECT 'Amenidades' as tipo, COUNT(*) as total FROM amenidades
UNION ALL
SELECT 'Proximidades' as tipo, COUNT(*) as total FROM proximidades;

-- Mostrar amenidades por categoria
SELECT ca.nome as categoria, COUNT(a.id) as total_amenidades 
FROM categorias_amenidades ca
LEFT JOIN amenidades a ON ca.id = a.categoria_id
GROUP BY ca.nome, ca.ordem
ORDER BY ca.ordem;

-- Mostrar proximidades por categoria
SELECT cp.nome as categoria, COUNT(p.id) as total_proximidades 
FROM categorias_proximidades cp
LEFT JOIN proximidades p ON cp.id = p.categoria_id
GROUP BY cp.nome, cp.ordem
ORDER BY cp.ordem;
