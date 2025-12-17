-- =====================================================
-- POPULAÇÃO DE DADOS - AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Migração de dados estáticos
-- =====================================================

-- ========================================
-- CATEGORIAS DE AMENIDADES
-- ========================================

INSERT INTO categorias_amenidades (nome, descricao, icone, cor, ordem) VALUES
('Lazer & Entretenimento', 'Áreas e equipamentos para diversão e entretenimento', '🎉', '#F59E0B', 1),
('Esporte & Saúde', 'Equipamentos esportivos e de bem-estar', '💪', '#10B981', 2),
('Segurança', 'Sistemas e serviços de segurança', '🔒', '#EF4444', 3),
('Conveniência & Serviços', 'Serviços que facilitam o dia a dia', '🛎️', '#3B82F6', 4),
('Verde & Sustentabilidade', 'Áreas verdes e práticas sustentáveis', '🌱', '#22C55E', 5),
('Tecnologia & Conectividade', 'Recursos tecnológicos e de conectividade', '📱', '#8B5CF6', 6),
('Bem-estar & Relaxamento', 'Espaços para relaxamento e bem-estar', '🧘‍♀️', '#EC4899', 7),
('Públicos Especiais', 'Espaços dedicados a grupos específicos', '👶', '#F97316', 8),
('Estrutura & Arquitetura', 'Elementos estruturais e arquitetônicos', '🏛️', '#6B7280', 9)
ON CONFLICT (nome) DO NOTHING;

-- ========================================
-- AMENIDADES
-- ========================================

-- Lazer & Entretenimento
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Salão de festas', 'Salão para eventos e comemorações', '🎉', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Espaço gourmet', 'Área gourmet para confraternizações', '🍳', true, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Churrasqueira', 'Churrasqueira para uso comum', '🔥', true, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Playground infantil', 'Playground para crianças', '🛝', true, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Brinquedoteca', 'Espaço com brinquedos para crianças', '🧸', false, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Sala de jogos', 'Sala com jogos e entretenimento', '🎮', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Cinema privativo', 'Sala de cinema do condomínio', '🎬', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Lounge/bar', 'Área de lounge com bar', '🍸', false, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Pista de boliche', 'Pista de boliche privativa', '🎳', false, 9),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Discoteca/boate', 'Espaço para festas e dança', '💃', false, 10),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Espaço pet / pet care', 'Área dedicada aos pets', '🐕', true, 11);

-- Esporte & Saúde
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina adulta', 'Piscina para adultos', '🏊‍♂️', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina infantil', 'Piscina para crianças', '🏊‍♀️', true, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina aquecida', 'Piscina com aquecimento', '🌡️', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina olímpica', 'Piscina de tamanho olímpico', '🏆', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Academia/fitness center', 'Academia completa com equipamentos', '💪', true, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra poliesportiva', 'Quadra para múltiplos esportes', '⚽', true, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra de tênis', 'Quadra específica para tênis', '🎾', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra de squash', 'Quadra para squash', '🏸', false, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Campo de futebol society', 'Campo de futebol society', '⚽', false, 9),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Pista de corrida / caminhada', 'Pista para exercícios', '🏃‍♂️', true, 10),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Estúdio de pilates/yoga', 'Estúdio para aulas de pilates e yoga', '🧘‍♀️', false, 11),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Spa com sauna/massagem', 'Spa completo com sauna', '🧖‍♀️', false, 12),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Vestiários com duchas', 'Vestiários equipados', '🚿', false, 13);

-- Segurança
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Portaria 24h', 'Portaria com segurança 24 horas', '👮‍♂️', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Controle de acesso por biometria', 'Sistema biométrico de acesso', '👆', false, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Portão eletrônico', 'Portão com abertura eletrônica', '🚪', true, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Circuito interno de câmeras (CFTV)', 'Sistema de monitoramento por câmeras', '📹', true, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Segurança perimetral', 'Sistema de segurança no perímetro', '🛡️', false, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Clausura (dupla portaria)', 'Sistema de dupla portaria', '🏢', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Alarme monitorado', 'Sistema de alarme monitorado', '🚨', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Brigada de incêndio', 'Equipe especializada em incêndio', '🚒', false, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Elevador com senha/cartão', 'Elevador com controle de acesso', '🛗', false, 9);

-- Conveniência & Serviços
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Estacionamento privativo', 'Vagas de estacionamento privativas', '🚗', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Vagas para visitantes', 'Vagas destinadas a visitantes', '🅿️', true, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Car wash / lava-jato', 'Serviço de lavagem de carros', '🚙', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Market interno / mini-mercado', 'Mercado dentro do condomínio', '🛒', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Coworking / business center', 'Espaço de trabalho compartilhado', '💼', true, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Sala de reuniões', 'Sala para reuniões de trabalho', '👥', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Bicicletário', 'Local para guardar bicicletas', '🚲', true, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Oficina maker/ferramentaria', 'Oficina com ferramentas', '🔧', false, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Concierge', 'Serviço de concierge', '🛎️', false, 9),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Serviço de arrumação/limpeza', 'Serviços de limpeza', '🧹', false, 10),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Delivery box (armários inteligentes para entregas)', 'Sistema de entrega inteligente', '📦', true, 11),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Lavanderia compartilhada', 'Lavanderia de uso comum', '👕', false, 12);

-- Verde & Sustentabilidade
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Jardim arborizado', 'Jardim com árvores e vegetação', '🌳', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Horta comunitária', 'Horta para uso dos moradores', '🥬', false, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Pomar', 'Pomar com árvores frutíferas', '🍎', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Bosque privativo', 'Área de bosque preservado', '🌲', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Estação de reciclagem', 'Local para separação de recicláveis', '♻️', true, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Captação de água da chuva', 'Sistema de captação pluvial', '🌧️', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Energia solar/fotovoltaica', 'Sistema de energia solar', '☀️', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Iluminação LED em áreas comuns', 'Sistema de iluminação eficiente', '💡', true, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Reuso de água', 'Sistema de reaproveitamento de água', '💧', false, 9),
((SELECT id FROM categorias_amenidades WHERE nome = 'Verde & Sustentabilidade'), 'Certificação verde (LEED, AQUA, etc.)', 'Certificações ambientais', '🏅', false, 10);

-- Tecnologia & Conectividade
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Wi-Fi nas áreas comuns', 'Internet sem fio nas áreas comuns', '📶', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Infraestrutura para automação residencial', 'Preparação para casa inteligente', '🏠', false, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Carregadores para carros elétricos', 'Pontos de carregamento elétrico', '🔌', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Aplicativo exclusivo do condomínio', 'App para gestão do condomínio', '📱', true, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Portaria remota', 'Sistema de portaria virtual', '📞', false, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Internet de alta velocidade / fibra', 'Conexão de internet de alta velocidade', '🌐', true, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Som ambiente nas áreas comuns', 'Sistema de som ambiente', '🔊', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Fechaduras eletrônicas', 'Fechaduras digitais', '🔐', false, 8),
((SELECT id FROM categorias_amenidades WHERE nome = 'Tecnologia & Conectividade'), 'Sensores de presença e iluminação inteligente', 'Sistema de iluminação automatizada', '💡', false, 9);

-- Bem-estar & Relaxamento
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Espaço zen / meditação', 'Área para meditação e relaxamento', '🧘‍♀️', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Deck molhado', 'Deck com área molhada', '🏊‍♀️', false, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Solarium', 'Área para banho de sol', '☀️', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Sauna seca e a vapor', 'Saunas seca e a vapor', '🧖‍♂️', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Hidromassagem', 'Banheira de hidromassagem', '🛁', false, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Ofurô', 'Banheira japonesa ofurô', '🛀', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Área de descanso', 'Área para descanso e relaxamento', '🛋️', true, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Bem-estar & Relaxamento'), 'Sala de massagem', 'Sala específica para massagens', '💆‍♀️', false, 8);

-- Públicos Especiais
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Espaços para terceira idade (jogos, convivência)', 'Áreas específicas para idosos', '👴', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Acessibilidade total (elevadores, rampas, banheiros adaptados)', 'Estrutura totalmente acessível', '♿', true, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Berçário / fraldário', 'Espaço para cuidados com bebês', '👶', false, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Espaço adolescente', 'Área dedicada aos adolescentes', '🧒', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Pet place / agility dog', 'Área de exercícios para pets', '🐕‍🦺', true, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Públicos Especiais'), 'Área kids supervisionada', 'Área infantil com supervisão', '👨‍👩‍👧‍👦', false, 6);

-- Estrutura & Arquitetura
INSERT INTO amenidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Hall social decorado', 'Hall de entrada decorado', '🏛️', true, 1),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Elevador social e de serviço', 'Elevadores separados', '🛗', true, 2),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Gerador de energia', 'Gerador para emergências', '⚡', true, 3),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Poço artesiano', 'Poço de água próprio', '💧', false, 4),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Estrutura para ar-condicionado', 'Preparação para ar-condicionado', '❄️', true, 5),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Sistema de aquecimento central', 'Sistema central de aquecimento', '🔥', false, 6),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Depósitos privativos', 'Depósitos individuais', '📦', false, 7),
((SELECT id FROM categorias_amenidades WHERE nome = 'Estrutura & Arquitetura'), 'Áreas técnicas', 'Áreas para equipamentos técnicos', '⚙️', false, 8);

-- ========================================
-- CATEGORIAS DE PROXIMIDADES
-- ========================================

INSERT INTO categorias_proximidades (nome, descricao, icone, cor, ordem) VALUES
('Comércio & Shopping', 'Estabelecimentos comerciais e centros de compras', '🛍️', '#F59E0B', 1),
('Alimentação', 'Restaurantes, bares e estabelecimentos gastronômicos', '🍽️', '#EF4444', 2),
('Saúde & Bem-estar', 'Hospitais, clínicas e estabelecimentos de saúde', '🏥', '#10B981', 3),
('Educação', 'Escolas, universidades e instituições de ensino', '🎓', '#3B82F6', 4),
('Transporte', 'Estações, pontos e meios de transporte', '🚌', '#8B5CF6', 5),
('Lazer & Cultura', 'Parques, cinemas e espaços culturais', '🎭', '#EC4899', 6),
('Serviços', 'Serviços públicos e privados essenciais', '🏢', '#6B7280', 7)
ON CONFLICT (nome) DO NOTHING;

-- ========================================
-- PROXIMIDADES
-- ========================================

-- Comércio & Shopping
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Shopping Center', 'Centro comercial com diversas lojas', '🏬', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Supermercado', 'Supermercado para compras do dia a dia', '🛒', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Farmácia', 'Farmácia para medicamentos', '💊', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Banco', 'Agência bancária', '🏦', true, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Loja de roupas', 'Loja de vestuário', '👕', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Padaria', 'Padaria e confeitaria', '🥖', true, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Mercado municipal', 'Mercado público municipal', '🏪', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Feira livre', 'Feira livre semanal', '🥕', false, 8);

-- Alimentação
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Restaurante', 'Restaurante para refeições', '🍽️', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Lanchonete', 'Lanchonete para lanches rápidos', '🍔', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Pizzaria', 'Pizzaria', '🍕', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Sorveteria', 'Sorveteria', '🍦', false, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Bar', 'Bar para drinks e petiscos', '🍺', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Café', 'Cafeteria', '☕', true, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Food truck', 'Food truck', '🚚', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Delivery', 'Serviço de delivery', '🛵', true, 8);

-- Saúde & Bem-estar
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Hospital', 'Hospital geral', '🏥', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Posto de saúde', 'Unidade básica de saúde', '🏥', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Clínica médica', 'Clínica médica especializada', '👨‍⚕️', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Academia', 'Academia de ginástica', '🏋️‍♂️', true, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Fisioterapia', 'Clínica de fisioterapia', '🦵', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Psicólogo', 'Consultório psicológico', '🧠', false, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Dentista', 'Consultório odontológico', '🦷', true, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Laboratório', 'Laboratório de análises clínicas', '🔬', true, 8);

-- Educação
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola', 'Escola de ensino fundamental e médio', '🏫', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Universidade', 'Universidade ou faculdade', '🎓', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Creche', 'Creche para crianças', '👶', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Biblioteca', 'Biblioteca pública', '📚', false, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Cursinho', 'Cursinho pré-vestibular', '📝', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola de idiomas', 'Escola de idiomas', '🗣️', false, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Centro de estudos', 'Centro de estudos e pesquisa', '🔍', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola técnica', 'Escola técnica profissionalizante', '⚙️', false, 8);

-- Transporte
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Metrô', 'Estação de metrô', '🚇', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Ônibus', 'Ponto de ônibus', '🚌', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Táxi', 'Ponto de táxi', '🚕', false, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Uber', 'Ponto de Uber/99', '🚗', true, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Bicicletário', 'Estação de bicicletas', '🚲', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Estacionamento', 'Estacionamento público', '🅿️', true, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Terminal rodoviário', 'Terminal de ônibus', '🚍', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Aeroporto', 'Aeroporto', '✈️', false, 8);

-- Lazer & Cultura
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Praia', 'Praia', '🏖️', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Parque', 'Parque público', '🌳', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Cinema', 'Cinema', '🎬', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Teatro', 'Teatro', '🎭', false, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Museu', 'Museu', '🏛️', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Shopping', 'Shopping center', '🏬', true, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Centro cultural', 'Centro cultural', '🎨', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Galeria de arte', 'Galeria de arte', '🖼️', false, 8);

-- Serviços
INSERT INTO proximidades (categoria_id, nome, descricao, icone, popular, ordem) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Correios', 'Agência dos Correios', '📮', true, 1),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Polícia', 'Delegacia de polícia', '👮‍♂️', true, 2),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Bombeiros', 'Corpo de bombeiros', '🚒', true, 3),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Lavanderia', 'Lavanderia', '👕', false, 4),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Oficina', 'Oficina mecânica', '🔧', false, 5),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Pet shop', 'Pet shop', '🐕', false, 6),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Barbearia', 'Barbearia', '💇‍♂️', false, 7),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Salão de beleza', 'Salão de beleza', '💅', false, 8);

-- ========================================
-- VERIFICAÇÕES E ESTATÍSTICAS
-- ========================================

-- Verificar quantidades inseridas
SELECT 
    'Categorias de Amenidades' as tabela,
    COUNT(*) as total
FROM categorias_amenidades
WHERE ativo = true

UNION ALL

SELECT 
    'Amenidades' as tabela,
    COUNT(*) as total
FROM amenidades
WHERE ativo = true

UNION ALL

SELECT 
    'Categorias de Proximidades' as tabela,
    COUNT(*) as total
FROM categorias_proximidades
WHERE ativo = true

UNION ALL

SELECT 
    'Proximidades' as tabela,
    COUNT(*) as total
FROM proximidades
WHERE ativo = true;

-- Verificar distribuição por categoria
SELECT 
    ca.nome as categoria,
    COUNT(a.id) as total_amenidades
FROM categorias_amenidades ca
LEFT JOIN amenidades a ON ca.id = a.categoria_id AND a.ativo = true
WHERE ca.ativo = true
GROUP BY ca.id, ca.nome
ORDER BY ca.ordem;

SELECT 
    cp.nome as categoria,
    COUNT(p.id) as total_proximidades
FROM categorias_proximidades cp
LEFT JOIN proximidades p ON cp.id = p.categoria_id AND p.ativo = true
WHERE cp.ativo = true
GROUP BY cp.id, cp.nome
ORDER BY cp.ordem;





