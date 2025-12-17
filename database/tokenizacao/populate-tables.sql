-- =====================================================
-- POPULANDO TABELAS DE CATEGORIAS, AMENIDADES E PROXIMIDADES
-- =====================================================

-- Inserindo categorias de amenidades
INSERT INTO categorias_amenidades (nome, descricao) VALUES
('Lazer & Entretenimento', 'Amenidades relacionadas a lazer e entretenimento'),
('Esporte & Saúde', 'Amenidades relacionadas a esportes e saúde'),
('Segurança', 'Amenidades relacionadas a segurança'),
('Conveniência & Serviços', 'Amenidades relacionadas a conveniência e serviços'),
('Verde & Sustentabilidade', 'Amenidades relacionadas a sustentabilidade'),
('Tecnologia & Conectividade', 'Amenidades relacionadas a tecnologia'),
('Bem-estar & Relaxamento', 'Amenidades relacionadas a bem-estar'),
('Públicos Especiais', 'Amenidades para públicos específicos'),
('Estrutura & Arquitetura', 'Amenidades estruturais');

-- Inserindo categorias de proximidades
INSERT INTO categorias_proximidades (nome, descricao) VALUES
('Comércio & Shopping', 'Proximidades comerciais'),
('Alimentação', 'Proximidades de alimentação'),
('Saúde & Bem-estar', 'Proximidades de saúde'),
('Educação', 'Proximidades educacionais'),
('Transporte', 'Proximidades de transporte'),
('Lazer & Cultura', 'Proximidades de lazer e cultura'),
('Serviços', 'Proximidades de serviços');

-- Inserindo amenidades da categoria "Lazer & Entretenimento"
INSERT INTO amenidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Salão de festas'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Espaço gourmet'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Churrasqueira'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Playground infantil'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Brinquedoteca'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Sala de jogos'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Cinema privativo'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Lounge/bar'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Pista de boliche'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Discoteca/boate'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Lazer & Entretenimento'), 'Espaço pet / pet care');

-- Inserindo amenidades da categoria "Esporte & Saúde"
INSERT INTO amenidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina adulta'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina infantil'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina aquecida'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Piscina olímpica'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Academia/fitness center'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra poliesportiva'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra de tênis'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Quadra de squash'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Campo de futebol society'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Pista de corrida / caminhada'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Estúdio de pilates/yoga'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Spa com sauna/massagem'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Esporte & Saúde'), 'Vestiários com duchas');

-- Inserindo amenidades da categoria "Segurança"
INSERT INTO amenidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Portaria 24h'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Controle de acesso por biometria'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Portão eletrônico'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Circuito interno de câmeras (CFTV)'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Segurança perimetral'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Clausura (dupla portaria)'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Alarme monitorado'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Brigada de incêndio'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Segurança'), 'Elevador com senha/cartão');

-- Inserindo amenidades da categoria "Conveniência & Serviços"
INSERT INTO amenidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Estacionamento privativo'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Vagas para visitantes'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Car wash / lava-jato'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Market interno / mini-mercado'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Coworking / business center'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Sala de reuniões'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Bicicletário'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Oficina maker/ferramentaria'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Concierge'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Serviço de arrumação/limpeza'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Delivery box (armários inteligentes para entregas)'),
((SELECT id FROM categorias_amenidades WHERE nome = 'Conveniência & Serviços'), 'Lavanderia compartilhada');

-- Inserindo proximidades da categoria "Comércio & Shopping"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Shopping Center'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Supermercado'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Farmácia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Banco'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Loja de roupas'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Padaria'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Mercado municipal'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Comércio & Shopping'), 'Feira livre');

-- Inserindo proximidades da categoria "Alimentação"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Restaurante'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Lanchonete'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Pizzaria'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Sorveteria'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Bar'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Café'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Food truck'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Alimentação'), 'Delivery');

-- Inserindo proximidades da categoria "Saúde & Bem-estar"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Hospital'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Posto de saúde'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Clínica médica'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Academia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Fisioterapia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Psicólogo'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Dentista'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Saúde & Bem-estar'), 'Laboratório');

-- Inserindo proximidades da categoria "Educação"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Universidade'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Creche'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Biblioteca'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Cursinho'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola de idiomas'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Centro de estudos'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Educação'), 'Escola técnica');

-- Inserindo proximidades da categoria "Transporte"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Metrô'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Ônibus'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Táxi'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Uber'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Bicicletário'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Estacionamento'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Terminal rodoviário'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Transporte'), 'Aeroporto');

-- Inserindo proximidades da categoria "Lazer & Cultura"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Praia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Parque'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Cinema'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Teatro'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Museu'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Shopping'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Centro cultural'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Lazer & Cultura'), 'Galeria de arte');

-- Inserindo proximidades da categoria "Serviços"
INSERT INTO proximidades (categoria_id, nome) VALUES
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Correios'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Polícia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Bombeiros'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Lavanderia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Oficina'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Pet shop'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Barbearia'),
((SELECT id FROM categorias_proximidades WHERE nome = 'Serviços'), 'Salão de beleza');

-- Inserindo alguns municípios de exemplo (SP, RJ, MG)
INSERT INTO municipios (estado_sigla, estado_nome, nome) VALUES
('SP', 'São Paulo', 'São Paulo'),
('SP', 'São Paulo', 'Campinas'),
('SP', 'São Paulo', 'Santos'),
('SP', 'São Paulo', 'São José dos Campos'),
('SP', 'São Paulo', 'Ribeirão Preto'),
('RJ', 'Rio de Janeiro', 'Rio de Janeiro'),
('RJ', 'Rio de Janeiro', 'Niterói'),
('RJ', 'Rio de Janeiro', 'Petrópolis'),
('RJ', 'Rio de Janeiro', 'Nova Iguaçu'),
('MG', 'Minas Gerais', 'Belo Horizonte'),
('MG', 'Minas Gerais', 'Uberlândia'),
('MG', 'Minas Gerais', 'Contagem'),
('MG', 'Minas Gerais', 'Juiz de Fora'),
('MG', 'Minas Gerais', 'Betim');






