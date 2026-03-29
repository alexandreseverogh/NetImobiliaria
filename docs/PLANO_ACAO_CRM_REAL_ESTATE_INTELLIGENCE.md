# 📈 GUIA COMERCIAL PARA CORRETORES — NET IMOBILIÁRIA

**Data:** 13 de Dezembro de 2025  
**Objetivo:** Apresentar a proposta da plataforma e o plano de implantação do CRM + IA de forma clara para corretores.

---

## 1. O que você ganha (sem rodeios)

A Net Imobiliária existe para uma coisa: **colocar você conversando com pessoas com intenção real**, com contexto suficiente para você fechar mais — sem depender de sorte, indicação ocasional ou “curioso”.

Você entra para uma operação que combina:
- **Investimento contínuo em marketing** (Meta/YouTube)
- **Organização e ritmo de atendimento** (CRM + Kanban + SLA)
- **IA para qualificar e preparar o lead** (antes de cair no seu WhatsApp)

## 2. Por que isso funciona (o “segredo” é processo)

Lead bom não é só “nome e telefone”. Lead bom vem com:
- **o motivo** (o que a pessoa busca de verdade)
- **a urgência** (por que agora)
- **as restrições** (faixa, região, tipo, condição de compra)
- **os próximos passos** (o que fazer hoje para não esfriar)

O sistema transforma conversa em direção — e direção em resultado.

## 3. Quem pode participar (credibilidade e confiança)

- **CRECI é obrigatório** (exigência legal e também proteção do cliente).
- O cadastro do corretor prevê **validação operacional** do CRECI.

## 4. A sua área de atuação (isso muda tudo)

Você define **onde atende** (UF/cidade e, se desejado, zonas/bairros).  
Isso é essencial para:
- receber leads com maior chance de conversão
- reduzir desperdício de atendimento fora da sua praça
- elevar taxa de visita e proposta

## 5. Como o lead chega até você (fluxo simples)

1) A plataforma capta o lead com anúncios e conteúdos  
2) A IA conversa, qualifica e registra contexto  
3) O CRM organiza o lead em etapas (Kanban)  
4) O lead é encaminhado para o corretor certo (pela área de atuação e regras de distribuição)  
5) Você atende com histórico, roteiro e próximos passos claros

## 6. Perguntas que todo corretor faz (FAQ rápido)

- **“Isso substitui meu atendimento?”** Não. O objetivo é você atender melhor e mais rápido — com o lead mais pronto.
- **“Vou receber curiosos?”** A meta é reduzir ao máximo com qualificação e regras de processo (e medir isso).
- **“Posso escolher minha praça?”** Sim. Área de atuação é requisito central.
- **“E o CRECI?”** É obrigatório e validado.

## 7. Próximo passo (CTA)

Se você quer participar:
- faça o cadastro como corretor
- defina sua área de atuação
- aguarde a validação do CRECI

> A partir daí você entra no fluxo de distribuição e atendimento com processo.

---

## APÊNDICE TÉCNICO (IMPLANTAÇÃO CRM + IA)

> Esta seção é o plano detalhado de execução para produto/engenharia/operação.

## ⚠️ IMPORTANTE: Uso de Tabelas Existentes

Este plano foi ajustado para **utilizar as tabelas existentes** da aplicação, evitando redundância:

### ✅ Tabelas Existentes Utilizadas:

**Atrativos do imóvel (Amenidades):**
- `categorias_amenidades` - Categorias de amenidades
- `amenidades` - Amenidades específicas dos imóveis
- `imovel_amenidades` - Relacionamento N:N entre imóveis e amenidades

**Atrativos do entorno (Proximidades):**
- `categorias_proximidades` - Categorias de proximidades
- `proximidades` - Proximidades específicas do entorno
- `imovel_proximidades` - Relacionamento N:N com `distancia_metros` e `tempo_caminhada`

### 🆕 Novas Tabelas Criadas:

Apenas as tabelas necessárias para o CRM que não existem ainda:
- `leads_staging` - Camada de staging para leads não estruturados
- `campanhas_marketing` - Campanhas emocionais
- `tags_estilo_vida` - Tags de estilo de vida para matching
- `tags_estilo_vida_amenidades` - Relacionamento N:N entre tags e amenidades
- `tags_estilo_vida_proximidades` - Relacionamento N:N entre tags e proximidades
- `leads_staging_preferencias_lazer_amenidades` - Preferências de lazer do lead (amenidades)
- `leads_staging_preferencias_lazer_proximidades` - Preferências de lazer do lead (proximidades)

### 🎯 Funcionalidades de Lazer Implementadas:

- **Captação Sentimental:** IA pergunta sobre preferências de lazer durante a conversa
- **Armazenamento Estruturado:** Preferências armazenadas em tabelas relacionais com importância e distância máxima
- **Matching Inteligente:** Score de match considera preferências de lazer (15% do score total)
- **Ranking Otimizado:** Imóveis são rankeados considerando match de amenidades e proximidades de lazer

### 🎓 Funcionalidades Educacionais Implementadas:

- **Captação de Necessidades:** IA identifica se lead tem filhos estudando ou precisa de universidade próxima
- **Detecção Inteligente:** Sistema detecta idade dos filhos e tipo de instituição necessária (creche, escola, universidade)
- **Armazenamento Estruturado:** Necessidades educacionais armazenadas com distância máxima desejada e importância
- **Matching Inteligente:** Score de match considera necessidades educacionais (10% do score total)
- **Informação de Transporte:** Ficha de imóvel sempre inclui informações sobre transporte público próximo

### 📋 Funcionalidades de Kanban Implementadas:

- **Colunas Dinâmicas:** Sistema de colunas configurável via tabela `kanban_colunas`
- **Gestão Visual:** Interface Kanban para visualizar e gerenciar leads por estágio
- **Múltiplos Leads por Imóvel:** Sistema permite que vários leads disputem o mesmo imóvel
- **Ordenação Inteligente:** Leads ordenados por valor do imóvel (decrescente) quando houver imóvel associado
- **Transições Controladas:** Sistema de validação de transições entre colunas
- **Rastreamento:** Histórico de movimentações e associações de imóveis

---

## 📋 ÍNDICE (APÊNDICE TÉCNICO)

1. [Arquitetura e Estrutura de Dados](#1-arquitetura-e-estrutura-de-dados)
2. [Captação e Inteligência de Marketing](#2-captação-e-inteligência-de-marketing)
3. [Qualificação e Conversão (IA Conversacional)](#3-qualificação-e-conversão-ia-conversacional)
4. [Gestão de Leads com Kanban](#4-gestão-de-leads-com-kanban)
5. [Gestão Operacional e Comercial](#5-gestão-operacional-e-comercial)
6. [Pós-Venda: O CRM que Celebra](#6-pós-venda-o-crm-que-celebra)
7. [Métricas e Melhoria Contínua](#7-métricas-e-melhoria-contínua)
8. [Cronograma de Implementação](#8-cronograma-de-implementação)
9. [Recursos Necessários](#9-recursos-necessários)
10. [Considerações Finais](#10-considerações-finais)
11. [Agente de IA para Geração de Leads (Blueprint)](#11-agente-de-ia-para-geração-de-leads-blueprint)

---

## 1. ARQUITETURA E ESTRUTURA DE DADOS

### 1.1. Camada de Staging (Leads Temporários)

**Objetivo:** Evitar "sujar" as tabelas principais com dados não estruturados vindos de mídias sociais.

#### 1.1.1. Tabela: `leads_staging`

**Estrutura:**

```sql
CREATE TABLE leads_staging (
  -- Identificação
  lead_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Origem e Marketing
  origem_detalhada JSONB, -- UTMs: {campanha, criativo, canal, fonte}
  raw_json JSONB, -- Dados brutos da API social (Instagram, Facebook, WhatsApp)
  
  -- Dados do Lead
  nome VARCHAR(255),
  telefone VARCHAR(20),
  email VARCHAR(255),
  instagram_handle VARCHAR(100),
  facebook_id VARCHAR(100),
  
  -- Inteligência Emocional (captado pela IA)
  tag_sonho VARCHAR(100), -- "fim_do_aluguel", "porto_seguro", "descanso_merecido"
  motivacao_profunda TEXT, -- Análise de sentimento da conversa
  palavras_chave JSONB, -- ["medo", "insegurança", "sonho", "estabilidade"]
  prioridade_emocional INTEGER DEFAULT 0, -- Score de urgência emocional
  
  -- Preferências de Lazer (captado pela IA)
  gosta_lazer BOOLEAN, -- Se o lead valoriza atividades de lazer
  tipos_lazer_preferidos JSONB, -- ["piscina", "academia", "quadra", "parques", "praia", "shopping", "restaurantes"]
  importancia_lazer INTEGER DEFAULT 0, -- 0-10: quão importante é o lazer para o lead
  
  -- Necessidades Educacionais (captado pela IA)
  tem_filhos_estudando BOOLEAN, -- Se o lead tem filhos em idade escolar
  precisa_proximidade_escola BOOLEAN, -- Se precisa de escola próxima
  tipo_instituicao_preferida VARCHAR(50), -- "creche", "escola_infantil", "ensino_fundamental", "ensino_medio", "universidade"
  importancia_educacao INTEGER DEFAULT 0, -- 0-10: quão importante é a proximidade educacional
  numero_filhos_estudando INTEGER DEFAULT 0, -- Quantos filhos estão estudando
  idades_filhos JSONB, -- [5, 8, 15] - idades dos filhos para identificar nível educacional necessário
  
  -- Qualificação
  intencao VARCHAR(50), -- "comprar", "alugar", "vender", "investir"
  tipo_imovel VARCHAR(50), -- "apartamento", "casa", "terreno"
  faixa_preco_min DECIMAL(12,2),
  faixa_preco_max DECIMAL(12,2),
  regiao_interesse VARCHAR(255),

  -- 💰 Vendas Casadas (Upgrade / Troca / Permuta) — priorização de lucro
  -- Cenário: o lead é comprador, mas também é proprietário e precisa vender/permuta para comprar.
  perfil_negocio VARCHAR(30), -- "comprador","proprietario","comprador_e_proprietario"
  venda_casada_ativa BOOLEAN DEFAULT FALSE, -- se há dependência entre vender o atual e comprar o novo
  venda_casada_modo VARCHAR(30), -- "vender_para_comprar","entrada_com_venda","permuta","permuta_parcial"
  precisa_vender_para_comprar BOOLEAN, -- trava de decisão: só compra após vender
  aceita_permuta BOOLEAN, -- aceita permuta total/parcial
  aceita_usar_imovel_como_entrada BOOLEAN, -- “dar de entrada” com venda/permuta
  imovel_atual_id INTEGER REFERENCES imoveis(id), -- se o imóvel atual já existir no inventário
  imovel_atual_resumo JSONB, -- se não existir no inventário: {tipo, quartos, vagas, bairro, cidade, estado, metragem, condominio, iptu, faixa_preco}
  valor_estimado_imovel_atual DECIMAL(12,2), -- (opcional) estimativa inicial/avaliacao
  saldo_devedor_financiamento DECIMAL(12,2), -- (opcional) para calcular entrada real
  prazo_desejado_venda_dias INTEGER, -- (opcional) urgência
  flexibilidade_bairros JSONB, -- (opcional) bairros alternativos para destravar a cadeia
  
  -- Status no Pipeline
  status VARCHAR(50) DEFAULT 'desejo_captado', -- Ver seção 3.3
  
  -- Match com Base Legada
  match_proprietario_id UUID REFERENCES proprietarios(id),
  match_cliente_id UUID REFERENCES clientes(id),
  match_score DECIMAL(5,2), -- 0-100: confiança do match
  match_method VARCHAR(50), -- "telefone", "email", "nome_telefone"
  
  -- Metadados
  processado BOOLEAN DEFAULT FALSE,
  processado_em TIMESTAMP,
  observacoes TEXT
);

-- Índices para performance
CREATE INDEX idx_leads_staging_status ON leads_staging(status);
CREATE INDEX idx_leads_staging_processado ON leads_staging(processado);
CREATE INDEX idx_leads_staging_telefone ON leads_staging(telefone);
CREATE INDEX idx_leads_staging_email ON leads_staging(email);
CREATE INDEX idx_leads_staging_tag_sonho ON leads_staging(tag_sonho);
CREATE INDEX idx_leads_staging_created_at ON leads_staging(created_at);
CREATE INDEX idx_leads_staging_gosta_lazer ON leads_staging(gosta_lazer);
CREATE INDEX idx_leads_staging_importancia_lazer ON leads_staging(importancia_lazer);
CREATE INDEX idx_leads_staging_tem_filhos_estudando ON leads_staging(tem_filhos_estudando);
CREATE INDEX idx_leads_staging_precisa_proximidade_escola ON leads_staging(precisa_proximidade_escola);
CREATE INDEX idx_leads_staging_importancia_educacao ON leads_staging(importancia_educacao);
CREATE INDEX idx_leads_staging_venda_casada_ativa ON leads_staging(venda_casada_ativa);
```

#### 1.1.1.1. Entidade “Cadeia” (Venda Casada) — 1 lead pode gerar 2 negociações ligadas

**Objetivo:** tratar “vender o atual → comprar o novo” como uma **cadeia única**, com dependências, prazos e ações de marketing para fechar as duas pontas.

```sql
-- Representa a transação encadeada (venda do imóvel atual + compra do imóvel desejado)
CREATE TABLE vendas_casadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE SET NULL, -- o "upgrade buyer"
  corretor_responsavel_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Imóvel destino (interesse) e imóvel origem (a vender/permuta)
  imovel_destino_id INTEGER REFERENCES imoveis(id) ON DELETE SET NULL,
  imovel_origem_id INTEGER REFERENCES imoveis(id) ON DELETE SET NULL,
  imovel_origem_resumo JSONB, -- quando ainda não está cadastrado

  -- Condições financeiras/negócio
  modo VARCHAR(30) NOT NULL, -- "vender_para_comprar","entrada_com_venda","permuta","permuta_parcial"
  aceita_permuta BOOLEAN DEFAULT FALSE,
  precisa_vender_para_comprar BOOLEAN DEFAULT FALSE,
  valor_estimado_origem DECIMAL(12,2),
  valor_alvo_destino DECIMAL(12,2),
  gap_financeiro_estimado DECIMAL(12,2), -- destino - (origem + recursos/financiamento)

  -- Operação
  status VARCHAR(30) NOT NULL DEFAULT 'aberta', -- "aberta","avaliacao_origem","captacao_origem","marketing_origem","comprador_origem","proposta_origem","proposta_destino","fechada","perdida"
  prioridade INTEGER DEFAULT 0,
  prazo_desejado_venda_dias INTEGER,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendas_casadas_status ON vendas_casadas(status);
CREATE INDEX idx_vendas_casadas_lead ON vendas_casadas(lead_uuid);
```

**Regra de Ouro (venda casada):**
- **Não tratar como 2 processos soltos**: a cadeia tem um “dono” e um status único.
- Sempre registrar: **dependência** (precisa vender para comprar?) e **modo** (venda, entrada, permuta).

-- Tabela de relacionamento: Leads x Necessidades Educacionais (Proximidades)
CREATE TABLE leads_staging_necessidades_educacionais (
  id SERIAL PRIMARY KEY,
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  proximidade_id INTEGER REFERENCES proximidades(id) ON DELETE CASCADE,
  tipo_instituicao VARCHAR(50), -- "creche", "escola_infantil", "ensino_fundamental", "ensino_medio", "universidade"
  distancia_maxima_desejada INTEGER, -- Distância máxima desejada em metros
  importancia INTEGER DEFAULT 8, -- 1-10: importância desta instituição (padrão alto para educação)
  mencionado_pelo_lead BOOLEAN DEFAULT FALSE, -- Se o lead mencionou explicitamente
  nome_instituicao_preferida VARCHAR(255), -- Nome específico da instituição se mencionado
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_uuid, proximidade_id)
);

-- Tabela de relacionamento: Leads x Preferências de Lazer (Amenidades)
CREATE TABLE leads_staging_preferencias_lazer_amenidades (
  id SERIAL PRIMARY KEY,
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  amenidade_id INTEGER REFERENCES amenidades(id) ON DELETE CASCADE,
  importancia INTEGER DEFAULT 5, -- 1-10: importância desta amenidade para o lead
  mencionado_pelo_lead BOOLEAN DEFAULT FALSE, -- Se o lead mencionou explicitamente
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_uuid, amenidade_id)
);

-- Tabela de relacionamento: Leads x Preferências de Lazer (Proximidades)
CREATE TABLE leads_staging_preferencias_lazer_proximidades (
  id SERIAL PRIMARY KEY,
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  proximidade_id INTEGER REFERENCES proximidades(id) ON DELETE CASCADE,
  distancia_maxima_desejada INTEGER, -- Distância máxima desejada em metros
  importancia INTEGER DEFAULT 5, -- 1-10: importância desta proximidade para o lead
  mencionado_pelo_lead BOOLEAN DEFAULT FALSE, -- Se o lead mencionou explicitamente
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_uuid, proximidade_id)
);

-- Índices para performance
CREATE INDEX idx_leads_lazer_amenidades_lead ON leads_staging_preferencias_lazer_amenidades(lead_uuid);
CREATE INDEX idx_leads_lazer_proximidades_lead ON leads_staging_preferencias_lazer_proximidades(lead_uuid);
CREATE INDEX idx_leads_educacao_lead ON leads_staging_necessidades_educacionais(lead_uuid);
CREATE INDEX idx_leads_educacao_tipo ON leads_staging_necessidades_educacionais(tipo_instituicao);
```

**Ações de Implementação:**
- [ ] Criar migration para tabela `leads_staging`
- [ ] Implementar função de limpeza automática (leads antigos > 90 dias)
- [ ] Criar triggers para atualizar `updated_at`
- [ ] Implementar validações de dados na inserção

---

### 1.1.2. Entrada de Dados: Manual Qualificado + Importação com Dedupe (Blueprint)

**Objetivo:** elevar qualidade na origem (menos ruído) sem aumentar atrito para o time.

- **Criação manual qualificada**:
  - Campos-chave obrigatórios (mínimo): `nome`, `telefone` (ou `email`), `intencao`, `regiao_interesse/bairro`, `origem`.
  - **UX**:
    - Autocompletar de **CEP** (reduz erro, acelera cadastro).
    - Autocompletar/validação de **CPF/CNPJ** (se existir no fluxo).
- **Importação de arquivos (CSV/XLSX)**:
  - Wizard “mapear colunas” + preview.
  - **Trava de deduplicação** obrigatória antes de inserir (telefone/email/CPF/CNPJ sanitizados).
  - “Dry run”: mostra inserções/mesclas/rejeições antes de executar.

**Ações de Implementação:**
- [ ] Criar tela/admin de importação (CSV/XLSX) com mapeador de colunas
- [ ] Implementar dedupe obrigatório no import (match engine reaproveitado)
- [ ] Registrar auditoria de import/merge em `auditoria_eventos`

---

### 1.1.3. Enriquecimento (externo) + Sinais internos da plataforma (Blueprint)

**Objetivo:** transformar “nome+telefone” em contexto acionável para corretor e marketing.

- **Enriquecimento externo (quando aplicável)**:
  - Perfil/empresa/renda estimada (proxy), cargo, etc (armazenar em JSONB).
  - Guardar também origem do enrichment + timestamp (para validade).
- **Sinais internos**:
  - **Favoritou imóvel** / **salvou busca** / **visitou imóvel repetidamente** → aumentar prioridade/score e alertar corretor.

```sql
CREATE TABLE produto_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  evento VARCHAR(50) NOT NULL, -- "favoritou_imovel","salvou_busca","visitou_imovel","clicou_whatsapp"
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_produto_eventos_lead ON produto_eventos(lead_uuid, created_at DESC);
```

---

### 1.2. Motor de Deduplicação (Match Engine)

**Objetivo:** Conciliar leads de staging com tabelas de Proprietários e Clientes existentes.

#### 1.2.1. Algoritmo de Match

**Lógica de Prioridade:**

1. **Match Exato por Telefone** (Score: 100)
   - Buscar em `proprietarios.telefone` e `clientes.telefone`
   - Normalizar telefone (remover caracteres especiais)

2. **Match por Email** (Score: 90)
   - Buscar em `proprietarios.email` e `clientes.email`
   - Case-insensitive

3. **Match por Nome + Telefone** (Score: 85)
   - Similaridade de nome > 80% + telefone parcial

4. **Match por Nome + Região** (Score: 70)
   - Similaridade de nome > 80% + mesma região de interesse

**Função SQL:**

```sql
CREATE OR REPLACE FUNCTION match_lead_staging(p_lead_uuid UUID)
RETURNS TABLE (
  match_type VARCHAR(50),
  match_id UUID,
  match_score DECIMAL(5,2),
  match_table VARCHAR(50)
) AS $$
DECLARE
  v_lead leads_staging%ROWTYPE;
  v_telefone_normalizado VARCHAR(20);
BEGIN
  -- Buscar lead
  SELECT * INTO v_lead FROM leads_staging WHERE lead_uuid = p_lead_uuid;
  
  -- Normalizar telefone
  v_telefone_normalizado := regexp_replace(v_lead.telefone, '[^0-9]', '', 'g');
  
  -- Match 1: Telefone exato em Proprietários
  SELECT 'proprietario', id, 100.0, 'proprietarios'
  FROM proprietarios
  WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
  LIMIT 1;
  
  -- Match 2: Telefone exato em Clientes
  SELECT 'cliente', id, 100.0, 'clientes'
  FROM clientes
  WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
  LIMIT 1;
  
  -- Match 3: Email em Proprietários
  SELECT 'proprietario', id, 90.0, 'proprietarios'
  FROM proprietarios
  WHERE LOWER(email) = LOWER(v_lead.email)
  LIMIT 1;
  
  -- Match 4: Email em Clientes
  SELECT 'cliente', id, 90.0, 'clientes'
  FROM clientes
  WHERE LOWER(email) = LOWER(v_lead.email)
  LIMIT 1;
  
  -- Retornar melhor match
  RETURN QUERY
  SELECT * FROM (
    -- Combinar todos os matches
    SELECT 'proprietario'::VARCHAR, id, 100.0::DECIMAL, 'proprietarios'::VARCHAR
    FROM proprietarios
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
    
    UNION ALL
    
    SELECT 'cliente'::VARCHAR, id, 100.0::DECIMAL, 'clientes'::VARCHAR
    FROM clientes
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
    
    UNION ALL
    
    SELECT 'proprietario'::VARCHAR, id, 90.0::DECIMAL, 'proprietarios'::VARCHAR
    FROM proprietarios
    WHERE LOWER(email) = LOWER(v_lead.email)
    
    UNION ALL
    
    SELECT 'cliente'::VARCHAR, id, 90.0::DECIMAL, 'clientes'::VARCHAR
    FROM clientes
    WHERE LOWER(email) = LOWER(v_lead.email)
  ) matches
  ORDER BY match_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar função `match_lead_staging()`
- [ ] Implementar job automático para processar leads não processados
- [ ] Criar interface admin para revisar matches com score < 85
- [ ] Implementar notificação quando match é encontrado

---

### 1.3. Hierarquia de Variáveis (Usando Tabelas Existentes)

**Objetivo:** Utilizar as tabelas existentes de amenidades e proximidades para matching inteligente.

#### 1.3.1. Atrativos do imóvel (Amenidades) - Tabelas Existentes

**Estrutura Atual:**
- `categorias_amenidades` - Categorias de amenidades (ex: "Lazer & Entretenimento", "Segurança")
- `amenidades` - Amenidades específicas (ex: "Piscina", "Academia", "Portaria 24h")
- `imovel_amenidades` - Relacionamento N:N entre imóveis e amenidades

**Exemplo de Uso:**
```sql
-- Buscar amenidades de um imóvel
SELECT 
  a.nome as amenidade,
  ca.nome as categoria
FROM imovel_amenidades ia
INNER JOIN amenidades a ON ia.amenidade_id = a.id
INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
WHERE ia.imovel_id = 123
  AND a.ativo = true;
```

#### 1.3.2. Atrativos do entorno (Proximidades) - Tabelas Existentes

**Estrutura Atual:**
- `categorias_proximidades` - Categorias de proximidades (ex: "Comércio", "Saúde", "Educação")
- `proximidades` - Proximidades específicas (ex: "Shopping", "Hospital", "Escola")
- `imovel_proximidades` - Relacionamento N:N com `distancia_metros` e `tempo_caminhada`

**Exemplo de Uso:**
```sql
-- Buscar proximidades de um imóvel com distâncias
SELECT 
  p.nome as proximidade,
  cp.nome as categoria,
  ip.distancia_metros,
  ip.tempo_caminhada
FROM imovel_proximidades ip
INNER JOIN proximidades p ON ip.proximidade_id = p.id
INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
WHERE ip.imovel_id = 123
  AND p.ativo = true
ORDER BY ip.distancia_metros ASC;
```

**Ações de Implementação:**
- [ ] Documentar mapeamento entre categorias existentes e tags de estilo de vida
- [ ] Criar view consolidada para facilitar queries de matching
- [ ] Implementar função para calcular score de match baseado em amenidades/proximidades
- [ ] Validar que todas as categorias necessárias estão cadastradas

---

### 1.4. Governança, LGPD, Segurança e Auditoria (requisito para produção)

**Objetivo:** Garantir que o CRM seja implementável em produção com **LGPD**, rastreabilidade, controle de acesso e segurança operacional.

#### 1.4.1. Consentimento e Base Legal (LGPD)

- **Princípio**: todo tracking e comunicação deve respeitar **consentimento** e finalidade.
- **Implementar**:
  - **Banner de consentimento** (cookies/pixels) com granularidade: `analytics`, `marketing`, `functional`.
  - **Registro de consentimento por lead** (e por dispositivo quando aplicável).
  - **Opt-out** de comunicações (WhatsApp/e-mail) e de remarketing.

**Tabela sugerida (mínimo):**

```sql
CREATE TABLE consentimentos_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  origem VARCHAR(50) NOT NULL, -- "site", "whatsapp", "instagram", "facebook"
  consent_analytics BOOLEAN DEFAULT FALSE,
  consent_marketing BOOLEAN DEFAULT FALSE,
  consent_communications BOOLEAN DEFAULT FALSE, -- contato ativo (WhatsApp/email)
  policy_version VARCHAR(20), -- versão do texto exibido
  consented_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  ip_hash VARCHAR(128), -- armazenar hash (não IP puro)
  user_agent_hash VARCHAR(128),
  UNIQUE(lead_uuid, origem, policy_version)
);
```

#### 1.4.2. Controle de Acesso (RBAC) e Multitenancy (se aplicável)

- **RBAC**: perfis mínimos: `admin`, `gestor`, `corretor`, `marketing`, `suporte`.
- **Regras**:
  - Corretor vê apenas seus leads (por padrão).
  - Admin/gestor vê tudo; marketing vê dados agregados/anonimizados quando possível.
  - Auditoria de alterações em: status, corretor responsável, imóvel associado, observações.

#### 1.4.3. Auditoria e Log de Eventos

**Tabela sugerida:**

```sql
CREATE TABLE auditoria_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID, -- usuário do sistema (admin/corretor)
  actor_tipo VARCHAR(30) NOT NULL, -- "usuario", "sistema", "webhook"
  entidade VARCHAR(50) NOT NULL, -- "lead", "kanban", "imovel", "consentimento"
  entidade_id VARCHAR(100) NOT NULL,
  acao VARCHAR(50) NOT NULL, -- "create","update","move","associate","delete"
  diff JSONB, -- antes/depois
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_auditoria_eventos_entidade ON auditoria_eventos(entidade, entidade_id);
```

#### 1.4.4. Retenção, Backup e Segurança de Dados

- **Retenção**:
  - `leads_staging` com política (ex.: 90/180 dias) + anonimização.
  - Logs/auditoria com retenção definida (ex.: 12 meses).
- **Backups**: diário + retenção (ex.: 30 dias) + restore testado.
- **Criptografia**: proteger PII (telefone/email) e segredos (tokens) via vault/secret manager.
- **DSAR**: exportação e deleção de dados do lead mediante solicitação (rotina admin).

---

## 2. CAPTAÇÃO E INTELIGÊNCIA DE MARKETING

### 2.1. Reposicionamento de Marketing (O Conteúdo)

**Objetivo:** Abandonar foco técnico e abraçar o Arquetípico. O CRM deve categorizar o "Sonho" do lead já na entrada.

#### 2.1.1. Campanhas com Carga Emocional

**CAMPANHA 1: "O FIM DO ALUGUEL" (Liberdade e Propriedade)**

**Copy:**
- **Título:** Onde você assina o seu futuro? 🔑
- **Texto:** Chega de investir no que não é seu. O aluguel é um teto, mas a casa própria é o chão onde você constrói sua história. Nós usamos nossa tecnologia para encontrar a parcela que cabe no seu bolso e o lugar que cabe no seu coração.
- **CTA:** Descubra sua casa própria
- **Tag de Sonho:** `fim_do_aluguel`

**IA de Atendimento (Pergunta Inicial):**
> "Qual o maior peso hoje: a falta de espaço ou o boleto do aluguel que não volta para você?"

**Segmentação:**
- Idade: 25-45 anos
- Interesses: Finanças pessoais, Investimentos, Casa própria
- Comportamento: Visitou páginas sobre financiamento imobiliário

---

**CAMPANHA 2: "O PORTO SEGURO" (Família e Proteção)**

**Copy:**
- **Título:** Para eles crescerem com raízes. 🌳
- **Texto:** Não é sobre metros quadrados, é sobre as memórias que serão criadas entre essas paredes. Segurança para seus filhos, tranquilidade para você. Encontre o bairro onde sua família pode criar raízes.
- **CTA:** Encontre o lar da sua família
- **Tag de Sonho:** `porto_seguro`

**IA de Atendimento (Pergunta Inicial):**
> "O que não pode faltar no bairro para você se sentir seguro e em casa?"

**Segmentação:**
- Idade: 30-50 anos
- Interesses: Família, Educação infantil, Segurança
- Comportamento: Visitou páginas sobre escolas, parques

---

**CAMPANHA 3: "O DESCANSO MERECIDO" (Envelhecimento Tranquilo)**

**Copy:**
- **Título:** Você trabalhou por isso. Agora, relaxe por aqui. ☕
- **Texto:** A tranquilidade de saber que o seu teto é seu para sempre. Garanta um envelhecimento com dignidade, conforto e a segurança patrimonial que você e sua família merecem.
- **CTA:** Conquiste sua tranquilidade
- **Tag de Sonho:** `descanso_merecido`

**IA de Atendimento (Pergunta Inicial):**
> "O que representa mais conforto para você hoje: localização próxima aos filhos ou um espaço mais moderno e acessível?"

**Segmentação:**
- Idade: 50+ anos
- Interesses: Aposentadoria, Planejamento patrimonial
- Comportamento: Visitou páginas sobre imóveis para aposentados

---

#### 2.1.2. Tabela de Campanhas

```sql
CREATE TABLE campanhas_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tag_sonho VARCHAR(100) NOT NULL UNIQUE, -- "fim_do_aluguel", "porto_seguro", "descanso_merecido"
  titulo VARCHAR(255),
  texto TEXT,
  cta VARCHAR(100),
  pergunta_ia TEXT, -- Pergunta inicial da IA
  segmentacao JSONB, -- {idade_min, idade_max, interesses, comportamentos}
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Ações de Implementação:**
- [ ] Criar tabela `campanhas_marketing`
- [ ] Cadastrar as 3 campanhas iniciais
- [ ] Integrar com Facebook Ads API para criar campanhas dinamicamente
- [ ] Implementar tracking de UTMs nas landing pages

---

### 2.2. Anúncios Dinâmicos por Estilo de Vida (DPA 2.0)

**Objetivo:** Mostrar o imóvel certo para a pessoa certa, baseado em matching de atrativos endógenos/exógenos com perfil do lead.

#### 2.2.1. Tags de Estilo de Vida

**Tabela:** `tags_estilo_vida`

```sql
CREATE TABLE tags_estilo_vida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE, -- "familia_protegida", "investidor_urbano", "tranquilidade_terceira_idade"
  descricao TEXT,
  apelo_emocional TEXT, -- Descrição do sonho
  tag_sonho VARCHAR(100) REFERENCES campanhas_marketing(tag_sonho),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de relacionamento: Tags de Estilo de Vida x Amenidades (N:N)
CREATE TABLE tags_estilo_vida_amenidades (
  id SERIAL PRIMARY KEY,
  tag_estilo_vida_id UUID REFERENCES tags_estilo_vida(id) ON DELETE CASCADE,
  amenidade_id INTEGER REFERENCES amenidades(id) ON DELETE CASCADE,
  peso INTEGER DEFAULT 1, -- Peso da amenidade para este estilo de vida (1-10)
  UNIQUE(tag_estilo_vida_id, amenidade_id)
);

-- Tabela de relacionamento: Tags de Estilo de Vida x Proximidades (N:N)
CREATE TABLE tags_estilo_vida_proximidades (
  id SERIAL PRIMARY KEY,
  tag_estilo_vida_id UUID REFERENCES tags_estilo_vida(id) ON DELETE CASCADE,
  proximidade_id INTEGER REFERENCES proximidades(id) ON DELETE CASCADE,
  distancia_maxima_metros INTEGER, -- Distância máxima desejada para esta proximidade
  peso INTEGER DEFAULT 1, -- Peso da proximidade para este estilo de vida (1-10)
  UNIQUE(tag_estilo_vida_id, proximidade_id)
);
```

**Nota:** Ao invés de armazenar nomes em JSONB, agora referenciamos diretamente as tabelas `amenidades` e `proximidades` existentes através de relacionamentos N:N. Isso garante integridade referencial e facilita queries.

**Matriz de Match (Exemplos):**

| Tag de Estilo de Vida | Variáveis Endógenas | Variáveis Exógenas | Apelo Emocional |
|---|---|---|---|
| **Família Protegida** | Quadra, Piscina, Portaria 24h | Escolas < 1km, Parques < 800m, Hospitais < 2km | Segurança e raízes para os filhos |
| **Investidor Urbano** | Elevador, Garagem, Varanda Gourmet | Metrô < 500m, Shopping < 1km | Alto potencial de valorização |
| **Tranquilidade Terceira Idade** | Elevador, Portaria 24h, Academia | Farmácias < 300m, Hospitais < 1km | Envelhecimento com dignidade |

**Ações de Implementação:**
- [ ] Criar tabela `tags_estilo_vida`
- [ ] Implementar algoritmo de matching: lead → tag_sonho → tags_estilo_vida → imóveis compatíveis
- [ ] Criar API endpoint para buscar imóveis por tag de estilo de vida
- [ ] Integrar com Facebook Dynamic Product Ads

---

### 2.2.1. Matching de Múltiplos Imóveis por Bairro

**Cenário:** Quando um cliente procura um imóvel em um determinado bairro, pode haver vários imóveis disponíveis nesse bairro. O sistema deve rankear esses imóveis baseado no perfil emocional do lead e nas características dos imóveis.

**Objetivo:** Criar um algoritmo que ordena imóveis do mesmo bairro por relevância emocional e técnica.

#### 2.2.1.1. Função de Score de Match por Lead

```sql
CREATE OR REPLACE FUNCTION calcular_score_match_lead(
  p_imovel_id INTEGER,
  p_lead_uuid UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_lead leads_staging%ROWTYPE;
  v_tag_sonho VARCHAR(100);
  v_tag_estilo_vida VARCHAR(100);
BEGIN
  -- Buscar dados do lead
  SELECT * INTO v_lead FROM leads_staging WHERE lead_uuid = p_lead_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_tag_sonho := v_lead.tag_sonho;
  
  -- Buscar tag de estilo de vida associada ao tag_sonho
  SELECT nome INTO v_tag_estilo_vida
  FROM tags_estilo_vida
  WHERE tag_sonho = v_tag_sonho
  LIMIT 1;
  
  -- Score baseado em IPVE (35% do score total)
  v_score := v_score + (calcular_ipve(p_imovel_id) * 0.35);
  
  -- Score baseado em match de amenidades desejadas (25% do score total)
  -- Buscar amenidades esperadas pela tag de estilo de vida usando tabela de relacionamento
  SELECT COALESCE((
    SELECT SUM(teva.peso)::DECIMAL / NULLIF(
      (SELECT SUM(peso) FROM tags_estilo_vida_amenidades WHERE tag_estilo_vida_id = (
        SELECT id FROM tags_estilo_vida WHERE nome = v_tag_estilo_vida
      )), 1
    ) * 30
  ), 0) INTO v_score
  FROM imovel_amenidades ia
  INNER JOIN tags_estilo_vida_amenidades teva ON ia.amenidade_id = teva.amenidade_id
  INNER JOIN tags_estilo_vida tev ON teva.tag_estilo_vida_id = tev.id
  WHERE ia.imovel_id = p_imovel_id
    AND tev.nome = v_tag_estilo_vida;
  
  -- Score baseado em match de proximidades importantes (15% do score total)
  -- Buscar proximidades esperadas pela tag de estilo de vida usando tabela de relacionamento
  SELECT COALESCE((
    SELECT SUM(
      CASE 
        WHEN ip.distancia_metros <= COALESCE(tevp.distancia_maxima_metros, 2000) 
          AND ip.distancia_metros < 500 THEN tevp.peso * 10.0
        WHEN ip.distancia_metros <= COALESCE(tevp.distancia_maxima_metros, 2000) 
          AND ip.distancia_metros < 1000 THEN tevp.peso * 7.0
        WHEN ip.distancia_metros <= COALESCE(tevp.distancia_maxima_metros, 2000) 
          AND ip.distancia_metros < 2000 THEN tevp.peso * 4.0
        ELSE tevp.peso * 1.0
      END
    ) / NULLIF(
      (SELECT SUM(peso) FROM tags_estilo_vida_proximidades WHERE tag_estilo_vida_id = (
        SELECT id FROM tags_estilo_vida WHERE nome = v_tag_estilo_vida
      )), 1
    ) * 0.2
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN tags_estilo_vida_proximidades tevp ON ip.proximidade_id = tevp.proximidade_id
  INNER JOIN tags_estilo_vida tev ON tevp.tag_estilo_vida_id = tev.id
  WHERE ip.imovel_id = p_imovel_id
    AND ip.distancia_metros IS NOT NULL
    AND tev.nome = v_tag_estilo_vida;
  
  -- Score baseado em faixa de preço (10% do score total)
  -- Se o imóvel está dentro da faixa de preço do lead, adiciona pontos
  IF EXISTS (
    SELECT 1 FROM imoveis i
    WHERE i.id = p_imovel_id
      AND i.preco >= COALESCE(v_lead.faixa_preco_min, 0)
      AND i.preco <= COALESCE(v_lead.faixa_preco_max, 999999999)
  ) THEN
    v_score := v_score + 10;
  END IF;
  
  -- Score baseado em preferências de lazer (15% do score total, apenas se gosta_lazer = TRUE)
  -- Match de amenidades de lazer desejadas pelo lead
  IF v_lead.gosta_lazer = TRUE AND v_lead.importancia_lazer >= 5 THEN
    DECLARE
      v_score_lazer DECIMAL(5,2) := 0;
      v_total_importancia_amenidades INTEGER;
      v_total_importancia_proximidades INTEGER;
    BEGIN
      -- Calcular total de importância para normalização
      SELECT COALESCE(SUM(importancia), 1) INTO v_total_importancia_amenidades
      FROM leads_staging_preferencias_lazer_amenidades
      WHERE lead_uuid = p_lead_uuid;
      
      SELECT COALESCE(SUM(importancia), 1) INTO v_total_importancia_proximidades
      FROM leads_staging_preferencias_lazer_proximidades
      WHERE lead_uuid = p_lead_uuid;
      
      -- Match de amenidades de lazer (7.5% do score total)
      SELECT COALESCE((
        SELECT SUM(
          CASE 
            WHEN plla.mencionado_pelo_lead = TRUE THEN plla.importancia * 2.0 -- Bônus se mencionado explicitamente
            ELSE plla.importancia * 1.0
          END
        ) / NULLIF(v_total_importancia_amenidades, 1) * 7.5
      ), 0) INTO v_score_lazer
      FROM imovel_amenidades ia
      INNER JOIN leads_staging_preferencias_lazer_amenidades plla ON ia.amenidade_id = plla.amenidade_id
      WHERE ia.imovel_id = p_imovel_id
        AND plla.lead_uuid = p_lead_uuid;
      
      v_score := v_score + v_score_lazer;
      
      -- Match de proximidades de lazer (7.5% do score total)
      SELECT COALESCE((
        SELECT SUM(
          CASE 
            WHEN pllp.mencionado_pelo_lead = TRUE AND ip.distancia_metros <= COALESCE(pllp.distancia_maxima_desejada, 2000) THEN pllp.importancia * 2.5
            WHEN ip.distancia_metros <= COALESCE(pllp.distancia_maxima_desejada, 2000) AND ip.distancia_metros < 500 THEN pllp.importancia * 2.0
            WHEN ip.distancia_metros <= COALESCE(pllp.distancia_maxima_desejada, 2000) AND ip.distancia_metros < 1000 THEN pllp.importancia * 1.5
            WHEN ip.distancia_metros <= COALESCE(pllp.distancia_maxima_desejada, 2000) THEN pllp.importancia * 1.0
            ELSE pllp.importancia * 0.3
          END
        ) / NULLIF(v_total_importancia_proximidades, 1) * 7.5
      ), 0) INTO v_score_lazer
      FROM imovel_proximidades ip
      INNER JOIN leads_staging_preferencias_lazer_proximidades pllp ON ip.proximidade_id = pllp.proximidade_id
      WHERE ip.imovel_id = p_imovel_id
        AND ip.distancia_metros IS NOT NULL
        AND pllp.lead_uuid = p_lead_uuid;
      
      v_score := v_score + v_score_lazer;
    END;
  END IF;
  
  -- Score baseado em necessidades educacionais (10% do score total, apenas se precisa_proximidade_escola = TRUE)
  IF v_lead.precisa_proximidade_escola = TRUE AND COALESCE(v_lead.importancia_educacao, 0) >= 5 THEN
    DECLARE
      v_score_educacao DECIMAL(5,2) := 0;
      v_total_importancia_educacao INTEGER;
    BEGIN
      -- Calcular total de importância para normalização
      SELECT COALESCE(SUM(importancia), 1) INTO v_total_importancia_educacao
      FROM leads_staging_necessidades_educacionais
      WHERE lead_uuid = p_lead_uuid;
      
      -- Match de proximidades educacionais (10% do score total)
      IF v_total_importancia_educacao > 0 THEN
        SELECT COALESCE((
          SELECT SUM(
            CASE 
              WHEN lne.mencionado_pelo_lead = TRUE AND ip.distancia_metros <= COALESCE(lne.distancia_maxima_desejada, 2000) THEN lne.importancia * 3.0 -- Bônus alto se mencionado explicitamente
              WHEN ip.distancia_metros <= COALESCE(lne.distancia_maxima_desejada, 2000) AND ip.distancia_metros < 500 THEN lne.importancia * 2.5
              WHEN ip.distancia_metros <= COALESCE(lne.distancia_maxima_desejada, 2000) AND ip.distancia_metros < 1000 THEN lne.importancia * 2.0
              WHEN ip.distancia_metros <= COALESCE(lne.distancia_maxima_desejada, 2000) AND ip.distancia_metros < 2000 THEN lne.importancia * 1.5
              WHEN ip.distancia_metros <= COALESCE(lne.distancia_maxima_desejada, 3000) THEN lne.importancia * 1.0
              ELSE lne.importancia * 0.2
            END
          ) / NULLIF(v_total_importancia_educacao, 1) * 10
        ), 0) INTO v_score_educacao
        FROM imovel_proximidades ip
        INNER JOIN proximidades p ON ip.proximidade_id = p.id
        INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
        INNER JOIN leads_staging_necessidades_educacionais lne ON ip.proximidade_id = lne.proximidade_id
        WHERE ip.imovel_id = p_imovel_id
          AND ip.distancia_metros IS NOT NULL
          AND lne.lead_uuid = p_lead_uuid
          AND cp.nome ILIKE '%educação%';
        
        v_score := v_score + v_score_educacao;
      END IF;
    END;
  END IF;
  
  RETURN LEAST(v_score, 100); -- Cap em 100
END;
$$ LANGUAGE plpgsql;
```

#### 2.2.1.2. Função para Buscar e Rankear Imóveis por Bairro e Lead

```sql
CREATE OR REPLACE FUNCTION buscar_imoveis_rankeados_por_bairro(
  p_bairro VARCHAR(255),
  p_lead_uuid UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  imovel_id INTEGER,
  titulo VARCHAR(255),
  bairro VARCHAR(255),
  cidade VARCHAR(255),
  preco DECIMAL(12,2),
  score_match DECIMAL(5,2),
  ipve_score DECIMAL(5,2),
  amenidades_match TEXT[],
  proximidades_match TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as imovel_id,
    i.titulo,
    i.bairro,
    i.cidade_fk as cidade,
    i.preco,
    calcular_score_match_lead(i.id, p_lead_uuid) as score_match,
    calcular_ipve(i.id) as ipve_score,
    ARRAY(
      SELECT a.nome
      FROM imovel_amenidades ia
      INNER JOIN amenidades a ON ia.amenidade_id = a.id
      WHERE ia.imovel_id = i.id
        AND a.ativo = true
    ) as amenidades_match,
    ARRAY(
      SELECT p.nome || ' (' || ip.distancia_metros || 'm)'
      FROM imovel_proximidades ip
      INNER JOIN proximidades p ON ip.proximidade_id = p.id
      WHERE ip.imovel_id = i.id
        AND p.ativo = true
        AND ip.distancia_metros IS NOT NULL
      ORDER BY ip.distancia_metros ASC
      LIMIT 5
    ) as proximidades_match
  FROM imoveis i
  WHERE i.bairro ILIKE '%' || p_bairro || '%'
    AND i.ativo = true
    AND i.status_fk IN (SELECT id FROM status WHERE nome IN ('disponivel', 'reservado'))
  ORDER BY calcular_score_match_lead(i.id, p_lead_uuid) DESC, calcular_ipve(i.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

**Exemplo de Uso:**

```sql
-- Buscar top 5 imóveis no bairro "Boa Viagem" para um lead específico
SELECT * FROM buscar_imoveis_rankeados_por_bairro(
  'Boa Viagem',
  'uuid-do-lead-aqui'::UUID,
  5
);
```

**Ações de Implementação:**
- [ ] Criar função `calcular_score_match_lead()`
- [ ] Criar função `buscar_imoveis_rankeados_por_bairro()`
- [ ] Criar API endpoint `/api/public/imoveis/match-lead` que usa essas funções
- [ ] Implementar cache de resultados para melhor performance
- [ ] Criar interface para corretor visualizar ranking de imóveis para cada lead

---

### 2.3. Potencialização de Variáveis Exógenas

**Objetivo:** Transformar a vizinhança em valor patrimonial através do Ranking IPVE.

#### 2.3.1. Índice de Potencial de Vida e Evolução (IPVE)

**Fórmula de Cálculo (Usando Tabelas Existentes):**

```sql
CREATE OR REPLACE FUNCTION calcular_ipve(p_imovel_id INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_peso_total DECIMAL(5,2) := 0;
BEGIN
  -- Categoria: Mobilidade (Peso: 10)
  -- Buscar proximidades de mobilidade (Metrô, Terminal, Estação)
  SELECT COALESCE(SUM(
    CASE 
      WHEN ip.distancia_metros < 500 THEN 10.0
      WHEN ip.distancia_metros < 1000 THEN 8.0
      WHEN ip.distancia_metros < 2000 THEN 5.0
      ELSE 2.0
    END
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN proximidades p ON ip.proximidade_id = p.id
  INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
  WHERE ip.imovel_id = p_imovel_id
    AND cp.nome ILIKE '%mobilidade%'
    AND ip.distancia_metros IS NOT NULL;
  
  v_peso_total := v_peso_total + 10.0;
  
  -- Categoria: Segurança (Peso: 9)
  -- Buscar proximidades de saúde/segurança (Hospitais, Delegacias, Bombeiros)
  SELECT COALESCE(SUM(
    CASE 
      WHEN ip.distancia_metros < 1000 THEN 10.0
      WHEN ip.distancia_metros < 2000 THEN 7.0
      WHEN ip.distancia_metros < 3000 THEN 4.0
      ELSE 1.0
    END
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN proximidades p ON ip.proximidade_id = p.id
  INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
  WHERE ip.imovel_id = p_imovel_id
    AND (cp.nome ILIKE '%saúde%' OR cp.nome ILIKE '%segurança%')
    AND ip.distancia_metros IS NOT NULL;
  
  v_peso_total := v_peso_total + 9.0;
  
  -- Categoria: Lazer/Saúde (Peso: 8)
  -- Buscar proximidades de lazer (Parques, Academias, Clubes)
  SELECT COALESCE(SUM(
    CASE 
      WHEN ip.distancia_metros < 800 THEN 10.0
      WHEN ip.distancia_metros < 1500 THEN 6.0
      WHEN ip.distancia_metros < 2500 THEN 3.0
      ELSE 1.0
    END
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN proximidades p ON ip.proximidade_id = p.id
  INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
  WHERE ip.imovel_id = p_imovel_id
    AND cp.nome ILIKE '%lazer%'
    AND ip.distancia_metros IS NOT NULL;
  
  v_peso_total := v_peso_total + 8.0;
  
  -- Categoria: Conveniência (Peso: 7)
  -- Buscar proximidades de comércio (Supermercados, Farmácias, Bancos, Restaurantes)
  SELECT COALESCE(SUM(
    CASE 
      WHEN ip.distancia_metros < 500 THEN 10.0
      WHEN ip.distancia_metros < 1000 THEN 7.0
      WHEN ip.distancia_metros < 2000 THEN 4.0
      ELSE 1.0
    END
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN proximidades p ON ip.proximidade_id = p.id
  INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
  WHERE ip.imovel_id = p_imovel_id
    AND cp.nome ILIKE '%comércio%'
    AND ip.distancia_metros IS NOT NULL;
  
  v_peso_total := v_peso_total + 7.0;
  
  -- Categoria: Educação (Peso: 6)
  -- Buscar proximidades de educação (Escolas, Universidades, Creches)
  SELECT COALESCE(SUM(
    CASE 
      WHEN ip.distancia_metros < 1000 THEN 10.0
      WHEN ip.distancia_metros < 2000 THEN 6.0
      WHEN ip.distancia_metros < 3000 THEN 3.0
      ELSE 1.0
    END
  ), 0) INTO v_score
  FROM imovel_proximidades ip
  INNER JOIN proximidades p ON ip.proximidade_id = p.id
  INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
  WHERE ip.imovel_id = p_imovel_id
    AND cp.nome ILIKE '%educação%'
    AND ip.distancia_metros IS NOT NULL;
  
  v_peso_total := v_peso_total + 6.0;
  
  -- Normalizar score (0-100)
  IF v_peso_total > 0 THEN
    RETURN (v_score / v_peso_total) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar função `calcular_ipve()`
- [ ] Adicionar coluna `ipve_score` na tabela `imoveis`
- [ ] Criar job para recalcular IPVE periodicamente (semanal)
- [ ] Criar ranking de imóveis por IPVE na interface admin

---

### 2.4. Tracking, Atribuição, Pixel/CAPI e Experimentos (requisito para performance)

**Objetivo:** Tornar o plano implementável para o futuro com **atribuição confiável** e otimização de campanhas (sem depender apenas do “último clique”).

#### 2.4.1. Taxonomia de Eventos (site → CRM)

- **Eventos mínimos**:
  - `LandingView` (visita /landpaging)
  - `SearchPerformed` (filtros usados)
  - `PropertyView` (visualizou imóvel)
  - `LeadStarted` (abriu modal/form)
  - `LeadSubmitted` (enviou dados)
  - `WhatsAppClick` / `CallClick`
- **Payload padrão**: `session_id`, `lead_uuid` (se já existir), `imovel_id`, `utm_*`, `fbclid/gclid`, `referrer`, `device`.

#### 2.4.2. Captura e Persistência de UTMs/Click IDs

- Persistir UTMs e click IDs no `leads_staging.origem_detalhada` e em uma tabela de eventos (para histórico).

```sql
CREATE TABLE marketing_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE SET NULL,
  session_id VARCHAR(64),
  evento VARCHAR(50) NOT NULL,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE SET NULL,
  utm JSONB,
  click_ids JSONB, -- { fbclid, gclid, fbp, fbc }
  page_url TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_marketing_eventos_lead ON marketing_eventos(lead_uuid, created_at DESC);
CREATE INDEX idx_marketing_eventos_evento ON marketing_eventos(evento, created_at DESC);
```

#### 2.4.3. Meta Pixel + Conversions API (CAPI)

- **Front**: Pixel para `PageView`/`ViewContent`/`Lead`.
- **Back**: CAPI para replicar eventos com maior confiabilidade e deduplicação.
- **Deduplicação**: `event_id` igual no Pixel e no CAPI.
- **LGPD**: só disparar marketing events se `consent_marketing = TRUE`.

#### 2.4.4. GA4/GTM e Painéis

- Definir **dataLayer** padrão e eventos GA4.
- Painéis: funil por campanha/tag_sonho, CPLQ, taxa de contato, agendamento, conversão por corretor.

#### 2.4.5. Experimentos (A/B) de Copy, Criativos e Fluxos

- Feature flag para:
  - variações de copy por `tag_sonho`
  - variações do fluxo (modal vs inline form)
  - perguntas de IA (prompt versionado)
- Registrar `experiment_id` e `variant_id` no `marketing_eventos`.

#### 2.4.6. Analytics de Criativos (Creative Scorecard) para otimização de mídia

**Objetivo:** refinar o direcionamento de criativos em mídias sociais usando métricas “do anúncio até o resultado” (não só clique), conectando **criativo → conversa → lead qualificado → visita → proposta**.

**Dimensões de análise obrigatórias (chaves):**
- `campaign_id`, `adset_id`, `ad_id`, `creative_id`
- `utm_campaign`, `utm_content`, `utm_source`
- `tag_sonho` (emocional) + `tags_estilo_vida` (lifestyle)
- `bairro/cidade` e faixa de preço (segmento)

**Scorecard do criativo (KPIs por criativo):**
- **CTR / CPC / CPM** (mídia)
- **LPV rate** (Landing Page View / clique)
- **LeadStarted → LeadSubmitted** (conversão de formulário)
- **% Leads Qualificados (SQL)** (IA/validação)
- **LRT médio** e **Taxa de Aceite no SLA** (operação)
- **Taxa de Visita/Lead** e **Proposta/Visita** (venda)
- **CPLQ** e **CAC estimado** (eficiência)

**Regras de decisão (automação futura):**
- Pausar criativo com CPLQ alto + baixa conversão para visita.
- Duplicar e escalar criativo com alto SQL + alta visita.
- Criativos “curiosos/timing” entram em régua de nutrição (não escalar).

**Ações de Implementação:**
- [ ] Estender `marketing_eventos` para armazenar IDs de campanha/ad/adset/creative (quando disponíveis via UTMs ou Meta)
- [ ] Criar relatório semanal “Creative Scorecard” (Top 10 melhores e piores)
- [ ] Criar rotina quinzenal de teste (mínimo: 3 variações por tag_sonho)

---

### 2.5. Ecossistema de Fontes (Social Selling) e Integrações Externas (Blueprint)

**Objetivo:** capturar leads onde a intenção nasce (com rastreabilidade e contexto).

- **Meta (Facebook/Instagram)**:
  - Lead Ads (formulários) + Click-to-WhatsApp / Click-to-Direct.
  - Webhooks para ingestão imediata e criação em `leads_staging`.
- **LinkedIn (quando fizer sentido no seu público)**:
  - LinkedIn Gen Forms e/ou importação assistida do perfil (quando permitido).
- **Plugin/“1 clique” (diferencial competitivo – V2)**:
  - Capturar perfil do lead (nome/link/contato) a partir de WhatsApp/LinkedIn e criar lead no CRM com contexto.

**Ações de Implementação:**
- [ ] Padronizar `source_platform` (Meta/LinkedIn/CSV/Plataforma) dentro de `origem_detalhada`
- [ ] Implementar webhooks de entrada (Meta Lead Ads + mensagens)
- [ ] Implementar importação assistida (plugin interno) como fase futura

---

### 2.6. Playbook de Criativos (Compradores, Proprietários e Incorporadoras) + UTMs

**Objetivo:** padronizar criação de anúncios para que o CRM consiga medir, comparar e escalar criativos com base em **SQL, visita e proposta**, e não só clique. Este playbook é o insumo direto para o **Creative Scorecard** (seção 2.4.6 / 7.1.3).

#### 2.6.1. Estrutura padrão de briefing (1 página por criativo)

- **Público**: (ex.: “Família com crianças / Upgrade 30–45”)
- **Promessa**: (qual transformação de vida?)
- **Prova**: (dados do CRM: demanda no bairro, liquidez, proximidades/amenidades)
- **Oferta**: (o que a pessoa recebe ao clicar: lista curada / tour / relatório / avaliação)
- **CTA**: (Click-to-WhatsApp / Lead Ad / Landing)
- **Tagging**: `tag_sonho`, `tags_estilo_vida`, `bairro_cluster`, `ticket_cluster`
- **Métrica-alvo**: CPLQ, SQL rate, visita/lead (definir alvo)

#### 2.6.2. Convenção de UTMs e IDs (obrigatório para analytics)

- **`utm_source`**: `meta` | `google` | `organico` | `parceiro`
- **`utm_medium`**: `paid_social` | `cpc` | `referral`
- **`utm_campaign`**: `{objetivo}_{tag_sonho}_{bairroCluster}_{ticketCluster}_v{n}`
  - Ex.: `compradores_porto_seguro_boa_viagem_500-800_v1`
- **`utm_content`**: `{creative_id}_{gancho}_{formato}`
  - Ex.: `cr123_segurança_parque_video`
- **`utm_term`**: `{audiencia}` (se aplicável)

#### 2.6.3. Biblioteca de criativos — COMPRADORES (3 linhas mestras)

**A) “Fim do Aluguel” (liberdade + previsibilidade)**
- **Gancho**: “Seu aluguel paga o sonho de outra pessoa.”
- **Copy base**: “Chega de investir no que não é seu. Em {{bairro}}, separamos opções com parcela possível e rotina mais leve. Clique e fale com a assistente para ver 3 imóveis que cabem no seu bolso.”
- **Criativo**: antes/depois (aluguel → chave), família no lar.
- **CTA**: Click-to-WhatsApp (“Quero sair do aluguel”).
- **Pergunta inicial da IA**: “Qual pesa mais hoje: falta de espaço ou o boleto do aluguel?”

**B) “Porto Seguro” (família + proteção)**
- **Gancho**: “Para eles crescerem com raízes.”
- **Copy base**: “Mais do que m²: segurança, escola perto e tempo de volta. Em {{bairro}}, selecionamos imóveis com proximidade de educação e parques. Clique e receba a curadoria.”
- **Criativo**: criança/brincadeira + mapa de proximidades (escola/parque).
- **CTA**: WhatsApp (“Quero um bairro seguro”).
- **Pergunta IA**: “O que não pode faltar no bairro para você se sentir seguro?”

**C) “Investidor Urbano” (liquidez + dados)**
- **Gancho**: “Pare de seguir palpite — invista com dados.”
- **Copy base**: “Top oportunidades com maior potencial de valorização e mobilidade em {{bairro}}. Receba agora o relatório do ‘Top 5’ (IPVE + liquidez).”
- **Criativo**: gráfico simples (valorização) + proximidade metrô/eixos.
- **CTA**: “Receber relatório” (Lead Ad ou WhatsApp).
- **Pergunta IA**: “Você busca renda (aluguel) ou valorização (revenda)?”

#### 2.6.4. Biblioteca de criativos — PROPRIETÁRIOS PF (captação de estoque)

**Regra:** campanhas de captação devem ser disparadas por **Gap de Match** (seção 7.1.2 / 7.1.4).

**A) “Temos compradores no seu bairro” (prova social)**
- **Gancho**: “Temos demanda ativa para imóveis como o seu em {{bairro}}.”
- **Copy base**: “Nossa IA conecta seu imóvel direto a compradores qualificados. Cadastre em 2 minutos e receba uma avaliação inicial.”
- **CTA**: “Cadastrar imóvel” (WhatsApp + formulário rápido).
- **Prova (do CRM)**: “tempo médio de 1ª visita em X dias” (se disponível).

**B) “Venda sincronizada para upgrade” (patrimônio em movimento)**
- **Gancho**: “Quer trocar por um imóvel maior sem dor?”
- **Copy base**: “Nós cuidamos da venda do seu imóvel atual enquanto você escolhe o novo. Avaliação e plano de sincronização em 24h.”
- **CTA**: WhatsApp (“Quero avaliar meu imóvel”).

---

### 2.7. Estratégia de Lucro: Priorizar “Vendas Casadas” (Upgrade / Troca / Permuta)

**Objetivo:** maximizar lucro captando o **proprietário oculto** que só anuncia quando desperta desejo por outro imóvel, transformando isso em **cadeia**: *(venda do atual → compra do novo)*.

#### 2.7.1. Gatilhos de detecção (IA + time)

O sistema deve marcar `leads_staging.perfil_negocio = 'comprador_e_proprietario'` e `venda_casada_ativa = true` quando detectar:
- “Quero comprar, mas preciso vender o meu”
- “Quero trocar por maior/menor”
- “Aceito permuta”
- “Quero usar meu imóvel como entrada”

#### 2.7.2. Fluxo operacional (cadeia única)

1. **Despertar (imóvel destino)**: lead demonstra interesse em um imóvel (ou em um perfil de imóvel).
2. **Diagnóstico de destrave**: IA/corretor confirma:
   - se existe imóvel atual,
   - se precisa vender antes,
   - se aceita permuta/entrada,
   - condições mínimas (saldo devedor, prazo, faixa).
3. **Captação do imóvel origem (inventário)**:
   - cadastrar o imóvel atual (ou criar `imovel_origem_resumo` + tarefa de captação/visita/avaliação).
4. **Marketing de dupla ponta (duplo funil)**:
   - **Funil A (comprador do destino)**: nutrir e avançar o lead para visita/proposta do imóvel desejado.
   - **Funil B (comprador do origem)**: ativar demanda (retargeting, DPA, lista de leads com match, campanhas por bairro/ticket).
5. **Sincronização**:
   - quando surgir comprador do origem (ou proposta), destravar e acelerar proposta do destino.

#### 2.7.3. Match para comprador do imóvel origem (aproveitar base existente)

- Usar o “inventário vs demanda” (seções 7.1.2 / 7.1.4) para identificar:
  - leads com busca compatível com o imóvel origem,
  - clusters com alta demanda (bairro/ticket) para ativar mídia.
- Criar um modo de campanha “**compradores para este imóvel**” com UTM e mensuração (CPLQ/SQL/visita).

#### 2.7.4. Permuta como produto (oferta de alto valor)

Quando `aceita_permuta = true`, o corretor deve poder:
- cadastrar “condições de permuta” (total/parcial),
- registrar “gap financeiro” e alternativas (bairros/valores) para destravar,
- priorizar imóveis destino compatíveis com permuta (mesmo bairro/cluster ou “bairros-alvo”).

#### 2.7.5. Mini-playbook operacional (SLA + Checklist) — “Venda casada em 7 dias”

**Objetivo:** padronizar execução para que a cadeia não trave por falta de sequência. Este playbook vira tarefas obrigatórias (`leads_tarefas`) e alertas de estagnação (>48h) conforme seção 3.5.

**SLA recomendado por etapa (padrão):**
- **T0 (até 30 min)**: registrar “diagnóstico de destrave” (modo, dependências, prazo, renda/financiamento básico).
- **T+24h**: concluir **pré-avaliação** do imóvel origem (faixa de valor + estratégia: venda rápida vs melhor preço).
- **T+72h**: imóvel origem **captado e publicado** (ou checklist completo pendente com motivo).
- **T+7 dias**: gerar **1ª rodada de demanda** para o imóvel origem (lista de leads com match + campanha/retargeting + contatos ativos).

**Checklist obrigatório (cadeia):**
- **Diagnóstico (lead)**:
  - confirmar `venda_casada_modo` (vender/entrada/permuta),
  - confirmar `precisa_vender_para_comprar` e `aceita_permuta`,
  - coletar dados mínimos do imóvel origem (`imovel_atual_resumo`) + documentação básica,
  - coletar **gap** estimado (ver seção 5.4).
- **Origem (imóvel atual)**:
  - fotos básicas / tour / documentação mínima,
  - precificação (3 comparáveis) + estratégia (liquidez vs preço),
  - publicação + tag “origem de venda casada”.
- **Destino (imóvel desejado)**:
  - registrar imóvel prioritário (`leads_imoveis_disputa.interesse_prioritario = TRUE`),
  - agendar visita (ou vídeo-tour) e validar “must-haves”.
- **Marketing dupla ponta**:
  - disparar “compradores para este imóvel” (origem) via base + mídia,
  - manter nutrição do destino (escassez + segurança da decisão).

**Travas e ações padrão (para gestor):**
- Se **T+24h sem avaliação**: alerta + redistribuição/assistência.
- Se **T+72h sem publicação**: bloquear avanço para proposta do destino sem motivo (ex.: doc pendente).
- Se **sem demanda no origem**: acionar “Gap de Match” para criar campanhas por cluster (seção 7.1.2/7.1.4).

**Ações de Implementação (playbook):**
- [ ] Criar templates de tarefas “Venda Casada” (diagnóstico, avaliação, captação, publicação, campanha origem)
- [ ] Criar painel “Cadeias atrasadas (SLA)” por etapa e corretor
- [ ] Criar regra: cadeia ativa exige tarefa futura sempre (seção 3.5)

---

**Ações de Implementação (venda casada):**
- [ ] Incluir campos de venda casada no `leads_staging` (acima)
- [ ] Criar tabela `vendas_casadas` para representar a cadeia
- [ ] Criar telas no admin: “Cadeias ativas” + “Diagnóstico” + “Checklist de captação do imóvel origem”
- [ ] Criar automação: ao marcar `venda_casada_ativa`, abrir cadeia e criar tarefas obrigatórias (avaliação/captação/marketing)

#### 2.6.5. Biblioteca de criativos — CONSTRUTORAS / INCORPORADORAS

**Objetivo:** motivar supply institucional com promessa de distribuição + dados + previsibilidade.

**A) “Vitrine com leads qualificados por IA”**
- **Gancho**: “Seu estoque na frente de leads ativos, não curiosos.”
- **Copy base**: “Integração digital + qualificação por IA + relatórios mensais de demanda por bairro/ticket. Envie seu portfólio e receba um plano de distribuição.”
- **CTA**: “Falar com parcerias” (WhatsApp ou formulário B2B).

**B) “Relatório de demanda (insight comercial)”**
- **Gancho**: “Onde a demanda está maior (e por qual ticket)?”
- **Copy base**: “Receba um relatório mensal com as top buscas, clusters de demanda e intenção (SQL) na sua praça.”
- **CTA**: “Solicitar relatório” (Lead Ad B2B).

#### 2.6.6. Checklist de teste (para o time de marketing)

- [ ] Cada criativo tem `tag_sonho` + `utm_campaign` padronizada
- [ ] CTA definido (WhatsApp vs Lead Ad) e pergunta inicial da IA alinhada
- [ ] Variações mínimas: 3 por `tag_sonho` (gancho A/B/C)
- [ ] Critério de corte: CPLQ alto + baixa taxa de visita
- [ ] Criativos vencedores entram na “biblioteca” (playbook) com versão

## 3. QUALIFICAÇÃO E CONVERSÃO (IA CONVERSACIONAL)

### 3.1. System Prompt de Atendimento

**Objetivo:** A IA no Instagram/WhatsApp deixa de ser um "robozinho de filtros" e passa a ser uma Escutadora Ativa.

#### 3.1.1. Prompt da IA "Concierge do Sonho"

```
Você é a assistente virtual da Net Imobiliária, especializada em ajudar pessoas a realizarem o sonho da casa própria.

SEU PAPEL:
- Não vender imóveis, mas ESCUTAR o sonho do cliente
- Identificar a motivação profunda por trás da busca
- Fazer perguntas que revelem o que realmente importa para a pessoa

REGRA DE OURO:
Antes de perguntar sobre preço ou localização, pergunte sobre o SONHO.

PERGUNTAS INICIAIS (escolha baseado na campanha que trouxe o lead):
- Se veio de "O Fim do Aluguel": "Qual o maior peso hoje: a falta de espaço ou o boleto do aluguel que não volta para você?"
- Se veio de "O Porto Seguro": "O que não pode faltar no bairro para você se sentir seguro e em casa?"
- Se veio de "O Descanso Merecido": "O que representa mais conforto para você hoje: localização próxima aos filhos ou um espaço mais moderno e acessível?"

PERGUNTAS SOBRE LAZER (sempre fazer após entender o sonho principal):
- "Você valoriza muito atividades de lazer no seu dia a dia? O que você mais gosta de fazer nos finais de semana?"
- "Quais são suas atividades de lazer preferidas? Por exemplo: piscina, academia, quadra esportiva, parques, praia, shopping, restaurantes?"
- "Para você, é importante ter essas opções de lazer próximas ao imóvel ou dentro do condomínio?"
- "Quão importante é o lazer para você? De 1 a 10, sendo 10 muito importante?"

PERGUNTAS SOBRE EDUCAÇÃO (sempre fazer se mencionar filhos ou estudos):
- "Você tem filhos em idade escolar? Quantos e quais as idades?"
- "A proximidade de escolas/colégios é importante para você? Por quê?"
- "Você ou alguém da família está estudando em universidade? A proximidade da faculdade é importante?"
- "Qual a distância máxima que você considera aceitável de uma escola/universidade? (ex: a pé, de carro, transporte público)"
- "Há alguma escola ou universidade específica que você prefere ou precisa estar próxima?"
- "Quão importante é a proximidade educacional para você? De 1 a 10, sendo 10 muito importante?"

PERGUNTAS SOBRE VENDA CASADA (UPGRADE / TROCA / PERMUTA) — prioridade de lucro:
- "Você já tem um imóvel hoje? Ele é próprio ou financiado?"
- "Para comprar o próximo, você pretende vender o seu atual para dar entrada? Ou você consegue comprar sem vender antes?"
- "Você aceitaria permuta (trocar seu imóvel por outro), mesmo que seja parcial?"
- "Qual bairro/cidade e características do seu imóvel atual (quartos, vagas, metragem) e uma faixa de valor aproximada?"
- "Existe um prazo/urgência para essa troca?"

INFORMAÇÃO SOBRE TRANSPORTE PÚBLICO:
Sempre que apresentar imóveis ao lead, mencione:
- "Ao consultar os imóveis, você terá informações completas sobre transporte público próximo, incluindo estações de metrô, terminais de ônibus e pontos de parada."
- "Essas informações ajudam você a avaliar a facilidade de deslocamento para trabalho, estudos e outras atividades."

CAPTAÇÃO DE PREFERÊNCIAS DE LAZER:
Quando o lead mencionar atividades de lazer, identifique e armazene:

AMENIDADES DE LAZER (variáveis endógenas):
- Piscina, Academia, Quadra Poliesportiva, Salão de Festas, Playground, Churrasqueira, Varanda Gourmet, Espaço Gourmet, Espaço Fitness, Sauna, Piscina Aquecida, Quadra de Tênis, Campo de Futebol

PROXIMIDADES DE LAZER (variáveis exógenas):
- Parques, Praias, Shoppings, Restaurantes, Bares, Cinemas, Teatros, Academias Externas, Clubes, Centros de Lazer, Complexos Esportivos

Se o lead mencionar explicitamente uma amenidade ou proximidade de lazer:
1. Marque como "mencionado_pelo_lead = TRUE"
2. Aumente a importância para 8-10
3. Adicione à lista de preferências do lead

ANÁLISE DE SENTIMENTO:
Identifique palavras-chave emocionais na resposta:
- POSITIVAS: "sonho", "realização", "conquista", "tranquilidade", "segurança"
- NEGATIVAS: "medo", "insegurança", "preocupação", "cansaço", "pressão"

Quando identificar palavras negativas, marque o lead com PRIORIDADE EMOCIONAL ALTA.

ENRIQUECIMENTO HUMANO:
No resumo que você enviar ao corretor, inclua:
1. Motivação Profunda: O que realmente move essa pessoa?
2. Contexto Emocional: Qual a situação de vida atual?
3. Urgência: Há algum fator que acelera a decisão?
4. Perfil de Lazer: Quais atividades de lazer são importantes? Quão importante é o lazer (1-10)?
5. Necessidades Educacionais: Tem filhos estudando? Precisa de escola/universidade próxima? Quão importante (1-10)?

EXEMPLO DE RESUMO PARA O CORRETOR:
"João, 32 anos, está cansado de se mudar a cada 30 meses por causa do aluguel. Busca estabilidade para a filha pequena de 5 anos. Palavras-chave: 'medo de mudar de novo', 'quer raízes', 'filha precisa de escola perto'. Prioridade emocional: ALTA.

PERFIL DE LAZER: Valoriza muito atividades ao ar livre (importância: 8/10). Mencionou explicitamente interesse em: piscina, quadra poliesportiva, parques próximos. Gosta de fazer churrasco nos finais de semana. Preferências: piscina (importância 9), quadra (importância 8), parques a menos de 1km (importância 7).

NECESSIDADES EDUCACIONAIS: Tem 1 filha de 5 anos (ensino infantil). Precisa de escola próxima (importância: 9/10). Preferência por escola a menos de 1km. Mencionou preocupação com segurança no trajeto escola-casa."

IDENTIFICAÇÃO DE PROPRIETÁRIOS OCULTOS:
Se o lead mencionar:
- "Tenho um imóvel para vender"
- "Quero trocar meu apartamento"
- "Tenho uma casa que não uso mais"
- "Quero comprar outro, mas preciso vender o meu antes"
- "Aceito permuta / troco por outro imóvel"

Marque como PROPRIETÁRIO e direcione para o setor de captação.

IMPORTANTE (venda casada):
- Se o lead for simultaneamente comprador e proprietário, marcar como `comprador_e_proprietario` e abrir uma **cadeia** (ver seção 2.7 / tabela `vendas_casadas`).

NUNCA:
- Seja robótica ou genérica
- Pule direto para preços
- Ignore sinais emocionais
- Faça promessas que não pode cumprir

SEMPRE:
- Seja empática e humana
- Valide os sentimentos do cliente
- Mostre que entende o sonho dele
- Transmita segurança e confiança
```

**Ações de Implementação:**
- [ ] Integrar com API de IA (OpenAI GPT-4 ou Claude)
- [ ] Criar endpoint `/api/ia/conversation` para processar mensagens
- [ ] Implementar análise de sentimento usando biblioteca NLP
- [ ] Criar sistema de tags automáticas baseado em palavras-chave
- [ ] Implementar webhook para receber mensagens do WhatsApp/Instagram

---

### 3.2. Filtro de Chaves e Intenção

**Objetivo:** Identificar proprietários ocultos e qualificar intenção de compra.

#### 3.2.1. Palavras-Chave de Intenção

**Tabela:** `palavras_chave_intencao`

```sql
CREATE TABLE palavras_chave_intencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- "proprietario", "comprador", "investidor", "aluguel"
  peso INTEGER DEFAULT 1, -- 1-10: importância da palavra
  contexto TEXT -- Contexto de uso
);

-- Exemplos de inserção
INSERT INTO palavras_chave_intencao (palavra, tipo, peso) VALUES
('tenho imóvel', 'proprietario', 10),
('quero vender', 'proprietario', 10),
('trocar apartamento', 'proprietario', 9),
('comprar casa', 'comprador', 10),
('primeiro imóvel', 'comprador', 8),
('investir', 'investidor', 10),
('alugar', 'aluguel', 10);
```

**Ações de Implementação:**
- [ ] Criar tabela `palavras_chave_intencao`
- [ ] Popular com palavras-chave iniciais
- [ ] Implementar função de análise de intenção na IA
- [ ] Criar dashboard para visualizar distribuição de intenções

---

### 3.3. Gestão de Status no CRM: "A Jornada da Confiança"

**Objetivo:** Mudar nomes técnicos dos status para refletir o momento emocional do cliente.

**Status do Pipeline:**

| Status Técnico | Status Humanizado | Descrição |
|---|---|---|
| `desejo_captado` | **Desejo Captado** | O sonho foi manifestado nas redes sociais |
| `entendimento_dor` | **Entendimento da Dor** | O corretor validou o que impede o cliente de dormir tranquilo |
| `curadoria` | **A Curadoria** | Não é "apresentação de imóvel", é o envio de soluções que protegem o sonho |
| `prova_seguranca` | **A Prova de Segurança** | O momento de sentir a energia do lugar (visita) |
| `conquista` | **A Conquista** | O lead deixa de ser um número e torna-se um Proprietário |

**Ações de Implementação:**
- [ ] Atualizar enum de status no banco de dados
- [ ] Modificar interface do CRM para exibir status humanizados
- [ ] Criar fluxo de transição entre status com validações
- [ ] Implementar notificações automáticas em cada mudança de status

---

### 3.4. Ficha de Imóvel Inteligente

**Objetivo:** Modelo de mensagem estruturada para envio via WhatsApp pelo corretor.

#### 3.4.1. Template de Mensagem

```
Assunto: O seu próximo capítulo começa aqui, [Nome do Lead]! ✨

Olá, [Nome do Lead]! Como conversamos sobre a importância de [Tag de Sonho: ex: segurança e tranquilidade para sua família], selecionei esta oportunidade exclusiva que faz o "match" perfeito com o que você busca:

🏠 [Nome do Edifício ou Referência do Imóvel]
📍 [Bairro]

Por que este imóvel é para você?

Baseado no seu perfil, destaquei os pontos que vão transformar sua rotina:

✅ Realização & Conforto (No Imóvel):
• [Atrativo Endógeno 1: ex: Piscina climatizada]: Para seus momentos de lazer sem precisar sair de casa.
• [Atrativo Endógeno 2: ex: Porteiro Eletrônico 24h]: A tecnologia a serviço da sua total segurança.
• [Atrativo Endógeno 3: ex: Varanda Gourmet]: O cenário perfeito para celebrar suas conquistas com quem você ama.

🏙️ O seu novo "quintal" (Na Vizinhança):
• [Atrativo Exógeno 1: ex: Hospital X a 3 min]: A paz de espírito de ter saúde de ponta ao seu lado.
• [Atrativo Exógeno 2: ex: Escola Y a 500m]: Mais tempo com seus filhos e menos tempo no trânsito.
• [Atrativo Exógeno 3: ex: Shopping Z próximo]: Praticidade para resolver a vida a pé.

🎓 Educação ao Alcance:
• [Se lead tem filhos estudando: Escola/Colégio X a Y metros]: [Descrição específica baseada na idade dos filhos e tipo de instituição necessária]
• [Se lead mencionou universidade: Universidade Y a Z metros]: Facilidade de acesso para estudos

🚌 Mobilidade e Transporte:
• Estação de Metrô a [distância] metros: Conectividade total com a cidade
• Terminal de Ônibus a [distância] metros: Facilidade de deslocamento
• [Outras opções de transporte público próximas]

💡 Informação Importante:
Ao consultar os imóveis em nossa plataforma, você terá informações completas e atualizadas sobre:
- Transporte público próximo (estações de metrô, terminais de ônibus, pontos de parada)
- Instituições de ensino na região (escolas, colégios, universidades)
- Distâncias precisas e tempo de deslocamento

💰 Investimento no seu Futuro:
• Valor: R$ [Preço]
• Condomínio: R$ [Valor] (Ótimo custo-benefício pela infraestrutura oferecida).

[Nome do Lead], este imóvel não é apenas uma propriedade, é o alicerce para a vida tranquila que você planejou.

Podemos agendar uma visita para você sentir a energia desse novo lar?
( ) Sim, gostaria de visitar esta semana.
( ) Tenho uma dúvida sobre o financiamento.
```

**Ações de Implementação:**
- [ ] Criar função para gerar ficha automaticamente
- [ ] Integrar com WhatsApp Business API para envio
- [ ] Implementar botões de resposta rápida (Quick Replies)
- [ ] Criar interface para corretor personalizar mensagem antes de enviar
- [ ] Incluir informações de transporte público na ficha gerada automaticamente
- [ ] Incluir informações educacionais quando lead tem filhos estudando
- [ ] Criar função para buscar e destacar instituições de ensino próximas baseado na idade dos filhos

---

### 3.4.2. Função para Processar Necessidades Educacionais

**Objetivo:** Extrair e armazenar necessidades educacionais do lead durante a conversa com a IA.

```sql
CREATE OR REPLACE FUNCTION processar_necessidades_educacionais(
  p_lead_uuid UUID,
  p_texto_resposta TEXT
)
RETURNS VOID AS $$
DECLARE
  v_lead leads_staging%ROWTYPE;
  v_proximidade_id INTEGER;
  v_tipo_instituicao VARCHAR(50);
  v_distancia_metros INTEGER;
BEGIN
  -- Buscar lead
  SELECT * INTO v_lead FROM leads_staging WHERE lead_uuid = p_lead_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Detectar se tem filhos estudando
  IF p_texto_resposta ILIKE '%filho%' OR 
     p_texto_resposta ILIKE '%filha%' OR
     p_texto_resposta ILIKE '%criança%' OR
     p_texto_resposta ILIKE '%estudando%' OR
     p_texto_resposta ILIKE '%escola%' OR
     p_texto_resposta ILIKE '%colégio%' THEN
    UPDATE leads_staging 
    SET tem_filhos_estudando = TRUE,
        precisa_proximidade_escola = TRUE
    WHERE lead_uuid = p_lead_uuid;
  END IF;
  
  -- Detectar se menciona universidade
  IF p_texto_resposta ILIKE '%universidade%' OR
     p_texto_resposta ILIKE '%faculdade%' OR
     p_texto_resposta ILIKE '%curso superior%' THEN
    UPDATE leads_staging
    SET tipo_instituicao_preferida = 'universidade',
        precisa_proximidade_escola = TRUE
    WHERE lead_uuid = p_lead_uuid;
  END IF;
  
  -- Extrair importância de educação (buscar números de 1-10)
  IF p_texto_resposta ~ '[0-9]+' THEN
    UPDATE leads_staging
    SET importancia_educacao = CAST(
      (SELECT substring(p_texto_resposta FROM '[0-9]+')) AS INTEGER
    )
    WHERE lead_uuid = p_lead_uuid
      AND CAST((SELECT substring(p_texto_resposta FROM '[0-9]+')) AS INTEGER) BETWEEN 1 AND 10;
  END IF;
  
  -- Extrair distância mencionada (ex: "a 500 metros", "menos de 1km")
  IF p_texto_resposta ~ '[0-9]+\s*(metro|m|km|quilômetro)' THEN
    v_distancia_metros := CAST(
      (SELECT substring(p_texto_resposta FROM '([0-9]+)\s*(metro|m|km|quilômetro)', 1)) AS INTEGER
    );
    
    -- Converter km para metros se necessário
    IF p_texto_resposta ILIKE '%km%' OR p_texto_resposta ILIKE '%quilômetro%' THEN
      v_distancia_metros := v_distancia_metros * 1000;
    END IF;
  END IF;
  
  -- Mapear palavras-chave para proximidades educacionais
  -- Escola/Colégio
  IF p_texto_resposta ILIKE '%escola%' OR p_texto_resposta ILIKE '%colégio%' THEN
    SELECT id INTO v_proximidade_id 
    FROM proximidades p
    INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
    WHERE cp.nome ILIKE '%educação%'
      AND (p.nome ILIKE '%escola%' OR p.nome ILIKE '%colégio%')
    LIMIT 1;
    
    IF v_proximidade_id IS NOT NULL THEN
      -- Determinar tipo de instituição baseado no contexto
      IF p_texto_resposta ILIKE '%infantil%' OR p_texto_resposta ILIKE '%creche%' THEN
        v_tipo_instituicao := 'creche';
      ELSIF p_texto_resposta ILIKE '%fundamental%' THEN
        v_tipo_instituicao := 'ensino_fundamental';
      ELSIF p_texto_resposta ILIKE '%médio%' THEN
        v_tipo_instituicao := 'ensino_medio';
      ELSE
        v_tipo_instituicao := 'escola_infantil';
      END IF;
      
      INSERT INTO leads_staging_necessidades_educacionais (
        lead_uuid, 
        proximidade_id, 
        tipo_instituicao,
        distancia_maxima_desejada, 
        importancia, 
        mencionado_pelo_lead
      )
      VALUES (
        p_lead_uuid, 
        v_proximidade_id, 
        v_tipo_instituicao,
        COALESCE(v_distancia_metros, 1000), 
        9, 
        TRUE
      )
      ON CONFLICT (lead_uuid, proximidade_id) DO UPDATE SET
        importancia = GREATEST(leads_staging_necessidades_educacionais.importancia, 9),
        mencionado_pelo_lead = TRUE,
        distancia_maxima_desejada = LEAST(
          COALESCE(leads_staging_necessidades_educacionais.distancia_maxima_desejada, 9999),
          COALESCE(v_distancia_metros, 1000)
        );
    END IF;
  END IF;
  
  -- Universidade/Faculdade
  IF p_texto_resposta ILIKE '%universidade%' OR p_texto_resposta ILIKE '%faculdade%' THEN
    SELECT id INTO v_proximidade_id 
    FROM proximidades p
    INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
    WHERE cp.nome ILIKE '%educação%'
      AND (p.nome ILIKE '%universidade%' OR p.nome ILIKE '%faculdade%')
    LIMIT 1;
    
    IF v_proximidade_id IS NOT NULL THEN
      INSERT INTO leads_staging_necessidades_educacionais (
        lead_uuid, 
        proximidade_id, 
        tipo_instituicao,
        distancia_maxima_desejada, 
        importancia, 
        mencionado_pelo_lead
      )
      VALUES (
        p_lead_uuid, 
        v_proximidade_id, 
        'universidade',
        COALESCE(v_distancia_metros, 5000), 
        8, 
        TRUE
      )
      ON CONFLICT (lead_uuid, proximidade_id) DO UPDATE SET
        importancia = GREATEST(leads_staging_necessidades_educacionais.importancia, 8),
        mencionado_pelo_lead = TRUE,
        distancia_maxima_desejada = LEAST(
          COALESCE(leads_staging_necessidades_educacionais.distancia_maxima_desejada, 9999),
          COALESCE(v_distancia_metros, 5000)
        );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar função `processar_necessidades_educacionais()`
- [ ] Integrar função no endpoint de processamento de mensagens da IA
- [ ] Expandir mapeamento de palavras-chave para todas as instituições educacionais
- [ ] Criar interface admin para visualizar necessidades educacionais de cada lead
- [ ] Implementar detecção automática de idade dos filhos para sugerir tipo de instituição

---

### 3.5. Cadência, Tarefas Obrigatórias e Estagnação (Regra de Ouro do Funil – Blueprint)

**Regra de Ouro:** toda mudança de status/coluna deve exigir **motivo** (ex.: perda) **ou** uma **próxima tarefa** agendada. Sem tarefa futura, o lead fica “morto” no funil.

```sql
CREATE TABLE leads_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- "ligar","whatsapp","email","visita","proposta","followup"
  titulo VARCHAR(255),
  descricao TEXT,
  agendada_para TIMESTAMP NOT NULL,
  concluida_em TIMESTAMP,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_leads_tarefas_pendentes ON leads_tarefas(agendada_para) WHERE concluida_em IS NULL;
```

**Alertas de estagnação (gestão ativa):**
- Notificar gestor se lead ficar **> 48h** na mesma coluna sem interação/tarefa futura.
- Isso vira um **heatmap operacional** no dashboard (ver seção de métricas).

---

### 3.6. Chatbot Conversacional (LLM) com Busca de Imóveis (Imobiliária Digital)

**Objetivo:** disponibilizar um atendimento 24/7 que **conversa**, **qualifica** e **busca imóveis na base** (tabelas `imoveis`, `imovel_amenidades`, `imovel_proximidades`, `amenidades`, `proximidades`, etc.), respondendo com contexto (bairro, preço, IPVE, lazer/educação/transporte) e gerando registros em `leads_staging`.

#### 3.6.1. Modelo mínimo de LLM (recomendação)

- **Mínimo viável**: um modelo com **tool/function calling** para consultar a base com segurança.
- Opções comuns:
  - **OpenAI**: GPT-4o mini / GPT-4.1 mini (bom custo/latência) ou GPT-4o (qualidade).
  - **Anthropic**: Claude (tool use).
- **Regra**: o LLM **não inventa dados**; ele consulta via ferramentas (endpoints/funções SQL) e responde somente com o que a base retornar.

#### 3.6.2. Arquitetura (Tool Calling + “RAG” sobre dados estruturados)

- **Entrada**: mensagem do usuário (site/WhatsApp/Instagram).
- **Pipeline**:
  1. Detectar intenção: `comprar`, `alugar`, `investir`, `upgrade`, `captação`.
  2. Extrair filtros: bairro/cidade, quartos, vagas, faixa de preço, lazer, educação, mobilidade.
  3. **Chamar ferramentas** para buscar imóveis e proximidades/amenidades.
  4. Responder com:
     - Top N imóveis (com justificativa emocional + técnica),
     - perguntas de follow-up (BANT adaptado + sonho),
     - CTA (agendar visita / falar com corretor).

#### 3.6.3. Ferramentas/Endpoints que o LLM pode chamar

**Ferramentas mínimas (server-side):**

- `buscar_imoveis(params)`:
  - filtros: bairro/cidade, tipo, quartos, vagas, preço, ordenação (match/IPVE).
- `buscar_detalhes_imovel(imovel_id)`:
  - retorno: dados do imóvel + amenidades + proximidades (com distância/tempo).
- `buscar_imoveis_rankeados_por_bairro(bairro, lead_uuid, limit)`:
  - já existe no plano (match lead + IPVE).
- `criar_ou_atualizar_lead_staging(dados)`:
  - cria lead e guarda contexto da conversa (`raw_json`/resumo).
- `registrar_evento_marketing(evento)`:
  - para atribuição (quando houver consentimento).

**Regras de segurança das tools:**
- Sempre usar queries parametrizadas (anti-injection).
- Limitar resultados (ex.: 10 por chamada).
- Respeitar LGPD/consentimentos para dados sensíveis.

#### 3.6.4. Prompt do sistema (diretrizes adicionais)

- Persona: **Concierge do Sonho** (humana, empática, objetiva).
- “Nunca invente”: se não achar imóvel, dizer que não encontrou e propor alternativas (bairros próximos, ajuste de faixa).
- Sempre confirmar restrições críticas: faixa de preço, bairro, quartos.
- Sempre oferecer: **transporte público**, **educação** e **lazer** quando relevantes (já contemplado no plano).

#### 3.6.5. Observabilidade e qualidade

- Logar: intenção detectada, filtros extraídos, tools chamadas, latência, erros, “sem resultados”.
- Criar “avaliação humana” (corretor marca se a sugestão da IA foi útil) → feedback loop.

#### 3.6.6. Canal WhatsApp como UX/UI (WhatsApp Business Platform)

**Objetivo:** usar o WhatsApp como principal canal de conversa (UX/UI) do chatbot, com handoff para humano e registro completo no CRM.

**Requisitos essenciais do WhatsApp:**
- **WhatsApp Business Platform API** (Meta) com **Webhooks** para receber mensagens.
- **Janela de 24 horas**: dentro dessa janela, respostas livres; fora dela, só com **message templates** aprovados.
- **Opt-in/LGPD**:
  - registrar consentimento em `consentimentos_lead` (`origem = 'whatsapp'`, `consent_communications = true`).
  - oferecer opt-out (“parar”, “cancelar”) e respeitar imediatamente.

**Fluxo de mensagens (alto nível):**
1. Usuário inicia conversa (click-to-whatsapp ou mensagem direta).
2. Webhook recebe evento → criar/atualizar `leads_staging` + anexar `raw_json` da conversa.
3. Orquestrador chama LLM (com tools) → responde com imóveis e perguntas de qualificação.
4. Se detectado **SQL** (intenção real + contato válido + critérios mínimos):
   - gerar handoff para corretor (atribuição via Round Robin) e notificar corretor.
5. Se “Agendar visita”:
   - criar `visitas_agendadas` e enviar confirmação no WhatsApp (template quando necessário).

**Endpoints sugeridos:**
- `POST /api/webhooks/whatsapp` (recebimento de mensagens/eventos)
- `POST /api/ia/whatsapp/reply` (orquestração: LLM + tools + resposta)
- `POST /api/admin/whatsapp/templates/send` (envio de templates aprovados, quando fora da janela)

**Regras de segurança e operação:**
- Assinatura/verificação do webhook (Meta).
- Rate limit por número (anti-spam).
- Mascarar/criptografar tokens e dados sensíveis.
- Auditoria em `auditoria_eventos` (mensagens, handoffs, envios de template).

**Ações de Implementação:**
- [ ] Implementar webhook WhatsApp + verificação de assinatura
- [ ] Implementar orquestrador do chatbot para WhatsApp (LLM + tools)
- [ ] Implementar catálogo de templates (reengajamento, confirmação de visita, lembretes)
- [ ] Implementar handoff humano (tag “precisa_humano”, fila, e atribuição)

#### 3.6.7. Catálogo inicial de Templates WhatsApp (para aprovação na Meta)

**Objetivo:** ter templates prontos para os casos obrigatórios (fora da janela de 24h) e para automações operacionais (confirmação/lembrete/remarcação).

**Padrões:**
- Templates devem ser **curtos**, claros e com placeholders estritamente necessários.
- Sempre incluir opção de saída (opt-out) quando fizer sentido: “Se preferir, responda PARAR”.

**Templates sugeridos (mínimo viável):**

1. **`tmpl_boas_vindas_primeiro_contato`** *(utilidade / atendimento)*
   - **Quando usar**: primeiro contato após opt-in, ou retorno inicial.
   - **Texto (modelo)**: “Olá {{1}}! Sou a assistente da Net Imobiliária. Para te ajudar melhor, você busca **comprar** ou **alugar** e em qual **bairro/cidade**?”

2. **`tmpl_reengajamento_7d`** *(utilidade)*
   - **Quando usar**: lead ficou parado 7 dias (sem tarefa/sem resposta).
   - **Texto (modelo)**: “Oi {{1}}, passando para saber se você ainda quer ver opções em {{2}}. Posso te enviar 3 imóveis com melhor match agora?”

3. **`tmpl_confirmacao_visita`** *(utilidade)*
   - **Quando usar**: após criar `visitas_agendadas`.
   - **Texto (modelo)**: “Visita confirmada, {{1}}. Imóvel: {{2}}. Data/hora: {{3}}. Endereço: {{4}}. Se precisar remarcar, responda REMARCAR.”

4. **`tmpl_lembrete_visita_24h`** *(utilidade)*
   - **Quando usar**: T-24h da visita.
   - **Texto (modelo)**: “Lembrete: sua visita é amanhã, {{1}}, às {{2}} (Imóvel: {{3}}). Confirma presença? Responda SIM ou REMARCAR.”

5. **`tmpl_lembrete_visita_2h`** *(utilidade)*
   - **Quando usar**: T-2h da visita.
   - **Texto (modelo)**: “Estamos a 2h da sua visita, {{1}} ({{2}}). Se houver imprevisto, responda REMARCAR.”

6. **`tmpl_handoff_corretor`** *(utilidade)*
   - **Quando usar**: IA qualificou como SQL e vai transferir para corretor humano.
   - **Texto (modelo)**: “Perfeito, {{1}}. Vou te conectar com um especialista da Net Imobiliária em {{2}}. Ele(a) falará com você em até {{3}} minutos.”

7. **`tmpl_optout_confirmacao`** *(utilidade / compliance)*
   - **Quando usar**: quando o lead pedir para parar.
   - **Texto (modelo)**: “Certo, {{1}}. Você não receberá mais mensagens por aqui. Se quiser voltar a falar no futuro, é só nos chamar.”

**Ações de Implementação:**
- [ ] Criar “catálogo de templates” (admin) com nome, texto, placeholders, categoria e status (aprovado/rascunho)
- [ ] Submeter templates na Meta e versionar `policy_version`/templates no CRM

#### 3.7. INTEGRAÇÃO PREMIUM COM CHATWOOT (HUB DE ATENDIMENTO)

**Objetivo:** Utilizar o Chatwoot como a "Interface de Guerra" dos corretores, conectando o motor de IA e o banco de dados da Net Imobiliária em uma plataforma omnichannel de alto nível.

##### 3.7.1. Arquitetura da Integração (Full Sync)

A integração não será apenas um webhook básico, mas uma sincronia bidirecional de contexto:

*   **IA de Qualificação -> Chatwoot:** A IA atende no WhatsApp/Insta. Assim que detecta uma intenção real (SQL), ela cria a conversa no Chatwoot e envia uma **Nota Privada** com o resumo do "Sonho", preferências de lazer e match de imóveis.
*   **Chatwoot -> CRM (Kanban):** Quando um corretor resolve uma conversa ou altera um status no Chatwoot, o card no Kanban da Net Imobiliária é movido automaticamente.
*   **Dashboard Interno (Net Widget):** Implementar um *Dashboard App* (iframe) dentro da barra lateral do Chatwoot que mostra a ficha técnica e o score de match dos imóveis diretamente para o corretor enquanto ele digita.

##### 3.7.2. Funcionalidades Premium da Integração

1.  **Contextual Handover (Transbordo Inteligente):**
    *   O corretor não pergunta "O que você busca?". Ele lê o resumo da IA: *"Lead busca sair do aluguel, prioriza segurança para filha de 5 anos e precisa de proximidade com escola X. Score de Match Alta no imóvel ID 45."*
2.  **Sincronização de Atributos Customizados:**
    *   Campos como `tag_sonho`, `faixa_preco` e `area_atuacao` são sincronizados como atributos do contato no Chatwoot, permitindo filtros avançados de busca por lá também.
3.  **Automação por Área de Atuação:**
    *   Leads que buscam imóveis no bairro "X" são automaticamente atribuídos à "Equipe X" no Chatwoot (Teams), garantindo que o corretor especialista receba o lead primeiro.
4.  **Central de Mídia Binária:**
    *   Os criativos de imóveis gerados pelo nosso sistema podem ser disparados pelo corretor via Chatwoot através de um atalho de comando (ex: `/imovel 45`).

##### 3.7.3. Fluxo Técnico de Implementação

*   **Webhook de Entrada:** Conectar o Chatwoot à nossa API de Orquestração.
*   **Custom Attribute Mapper:** Script para garantir que os dados de `leads_staging` reflitam nos campos do Chatwoot.
*   **Agent Bot:** Integrar nossa IA Concierge como um "Agent Bot" no Chatwoot, para que ela inicie as conversas antes do humano intervir.
*   **API de Notificações:** Notificar o corretor via Push (App Chatwoot) assim que a IA termina a qualificação.

**Ações de Implementação:**
- [ ] Configurar instância do Chatwoot (Docker/Self-hosted).
- [ ] Implementar `NetImobiliariaBot` como Agent Bot no Chatwoot.
- [ ] Desenvolver "Sidebar Widget" para visualização de imóveis dentro do Chatwoot.
- [ ] Implementar webhook bidirecional (CRM <-> Chatwoot) para sincronia de status/label.

#### 3.8. INTELIGÊNCIA DE ÁUDIO E VOZ (NÍVEL 1)

**Objetivo:** Permitir que o lead se comunique por voz no WhatsApp/Instagram e receba respostas humanizadas, aumentando a acessibilidade e o engajamento emocional.

##### 3.8.1. Processamento de Áudio Recebido (STT)

*   **Tecnologia:** OpenAI Whisper (modelo `whisper-1`).
*   **Fluxo:** O webhook recebe o arquivo `.ogg/.m4a` -> Transcodificação (se necessário) -> Transcrição via Whisper -> O texto alimentado no motor de IA (Concierge).
*   **Benefício:** O lead pode enviar detalhes complexos do seu "sonho" por áudio enquanto dirige ou caminha, sem barreiras de digitação.

##### 3.8.2. Geração de Áudio de Resposta (TTS)

*   **Tecnologia:** OpenAI TTS (modelo `tts-1-hd`) ou ElevenLabs (Alta Fidelidade).
*   **Fluxo:** IA gera a resposta em texto -> Conversão em áudio com voz humana pré-definida -> Envio do arquivo de áudio no WhatsApp/Instagram.
*   **Persona:** Definir uma voz acolhedora, madura e profissional que represente a Net Imobiliária.

**Ações de Implementação:**
- [ ] Implementar script de transcodificação de áudio (FFmpeg).
- [ ] Integrar API do Whisper para transcrição automática de mensagens recebidas.
- [ ] Implementar serviço de geração de áudio (TTS) para respostas curtas e impactantes.
- [ ] Adicionar player de áudio no painel de controle do CRM para o corretor ouvir as mensagens originais.

#### 3.9. MOTOR DE CAMPANHAS (PÚBLICO‑ALVO, CUSTO, PERÍODO, RETORNO)

**Objetivo:** Gerenciar campanhas de marketing em escala nacional, segmentando por cidade, bairro e perfil de lead, controlando orçamento, datas de veiculação e mensurando retorno (KPIs).  

**Componentes principais:**
- **Tabela `crm_campanhas`** (nome, criativo, custo_estimado, custo_real, datas, status).
- **Tabela `crm_campanha_segmentos`** (JSONB com filtros: cidade, bairro, faixa de preço, tipo de imóvel, etc.).
- **Tabela `crm_campanha_metrics`** (impressões, cliques, leads, receita por dia).
- **Scheduler/Worker** que, diariamente, consulta os segmentos, gera listas de leads e dispara mensagens ou anúncios via Meta Ads API/Chatwoot.
- **Dashboard** (React + Recharts ou Grafana) exibindo CPL, CTR, taxa de conversão, ROI e custo por bairro.

**Fluxo resumido:**
```mermaid
flowchart TD
    A[UI → Nova campanha] --> B[Formulário: nome, datas, orçamento, criativo]
    B --> C[Seleção de Segmentos (cidade/bairro/filters)]
    C --> D[Salvar nas tabelas de campanha]
    D --> E[Scheduler cria tasks diárias]
    E --> F[Worker gera leads e envia mensagens/ads]
    F --> G[Coleta métricas (Meta Insights, webhook de cliques)]
    G --> H[Atualiza crm_campanha_metrics]
    H --> I[Dashboard de ROI]
```

**Integrações:**
- **Kanban:** Leads originados de campanha são criados automaticamente na coluna *Leads – Campanha* com tag `campanha_id`.
- **Chatwoot:** Notas privadas contendo `campanha_id` permitem ao corretor saber a origem do lead.
- **Segurança:** Apenas usuários com role `marketing_manager` podem criar/editar campanhas; auditoria em `crm_campanha_log`.

**Estimativa de esforço:** ~ 50 pontos (5 sprints) – detalhado no roadmap interno.

## 4. GESTÃO DE LEADS COM KANBAN

### 4.1. Arquitetura do Sistema Kanban

**Objetivo:** Visualizar e gerenciar leads através de um sistema Kanban flexível, onde cada coluna representa um estágio do pipeline de vendas.

#### 4.1.1. Tabela de Colunas do Kanban

```sql
CREATE TABLE kanban_colunas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE, -- "leads", "contatados", "agendados", "em_analise_documentacao", "em_analise_credito", "aprovados", "fechados"
  titulo_exibicao VARCHAR(150) NOT NULL, -- "Leads", "Contatados", "Agendados", "Em Análise de Documentação", "Em Análise de Crédito"
  descricao TEXT,
  ordem INTEGER NOT NULL, -- Ordem de exibição das colunas (1, 2, 3, ...)
  cor VARCHAR(7) DEFAULT '#3B82F6', -- Cor hexadecimal para UI
  icone VARCHAR(50), -- Ícone para exibição
  limite_cards INTEGER, -- Limite de cards por coluna (NULL = sem limite)
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_kanban_colunas_ordem ON kanban_colunas(ordem);
CREATE INDEX idx_kanban_colunas_ativa ON kanban_colunas(ativa);

-- Inserir colunas padrão
INSERT INTO kanban_colunas (nome, titulo_exibicao, ordem, cor, icone) VALUES
('leads', 'Leads', 1, '#94A3B8', 'users'),
('contatados', 'Contatados', 2, '#3B82F6', 'phone'),
('agendados', 'Agendados', 3, '#10B981', 'calendar'),
('em_analise_documentacao', 'Em Análise de Documentação', 4, '#F59E0B', 'file-text'),
('em_analise_credito', 'Em Análise de Crédito', 5, '#EF4444', 'credit-card'),
('aprovados', 'Aprovados', 6, '#8B5CF6', 'check-circle'),
('fechados', 'Fechados', 7, '#059669', 'check-circle-2');
```

#### 4.1.2. Tabela de Relacionamento: Leads x Colunas Kanban

```sql
CREATE TABLE leads_kanban (
  id SERIAL PRIMARY KEY,
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  kanban_coluna_id INTEGER REFERENCES kanban_colunas(id) ON DELETE RESTRICT,
  ordem INTEGER DEFAULT 0, -- Ordem dentro da coluna (para ordenação manual)
  corretor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- Corretor responsável
  observacoes TEXT,
  data_movimentacao TIMESTAMP DEFAULT NOW(), -- Data da última movimentação entre colunas
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_uuid) -- Um lead só pode estar em uma coluna por vez (garantia real)
);

-- Índices
CREATE INDEX idx_leads_kanban_lead ON leads_kanban(lead_uuid);
CREATE INDEX idx_leads_kanban_coluna ON leads_kanban(kanban_coluna_id);
CREATE INDEX idx_leads_kanban_corretor ON leads_kanban(corretor_id);
CREATE INDEX idx_leads_kanban_ordem ON leads_kanban(kanban_coluna_id, ordem);
CREATE INDEX idx_leads_kanban_data_movimentacao ON leads_kanban(data_movimentacao);
```

#### 4.1.3. Tabela de Relacionamento: Leads x Imóveis (Disputa)

**Objetivo:** Permitir que múltiplos leads disputem o mesmo imóvel.

```sql
CREATE TABLE leads_imoveis_disputa (
  id SERIAL PRIMARY KEY,
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
  interesse_prioritario BOOLEAN DEFAULT FALSE, -- Se este é o imóvel de maior interesse do lead
  score_match DECIMAL(5,2), -- Score de match calculado pela função calcular_score_match_lead()
  observacoes TEXT, -- Observações do corretor sobre este match
  data_interesse TIMESTAMP DEFAULT NOW(), -- Data em que o lead demonstrou interesse
  status_interesse VARCHAR(50) DEFAULT 'interesse', -- "interesse", "visita_agendada", "proposta_enviada", "aprovado", "recusado"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_uuid, imovel_id) -- Evita duplicatas
);

-- Índices
CREATE INDEX idx_leads_imoveis_disputa_lead ON leads_imoveis_disputa(lead_uuid);
CREATE INDEX idx_leads_imoveis_disputa_imovel ON leads_imoveis_disputa(imovel_id);
CREATE INDEX idx_leads_imoveis_disputa_prioritario ON leads_imoveis_disputa(lead_uuid, interesse_prioritario);
CREATE INDEX idx_leads_imoveis_disputa_score ON leads_imoveis_disputa(lead_uuid, score_match DESC);
```

#### 4.1.3.1. Venda Casada no Kanban (cadeia visível, prioridade e dupla ponta)

**Objetivo:** quando `leads_staging.venda_casada_ativa = true`, o Kanban deve exibir que aquele card é uma **cadeia** (2 transações) e permitir acompanhar o estágio do **origem** (a vender) e do **destino** (a comprar).

**Regras de UI/UX (mínimo viável):**
- No card do lead, exibir badge: **“VENDA CASADA”** + modo (`vender_para_comprar`, `permuta`, etc.).
- Mostrar “Origem”: resumo do imóvel atual (ou `imovel_atual_id`) + status da cadeia (`vendas_casadas.status`).
- Mostrar “Destino”: imóvel prioritário (se existir em `leads_imoveis_disputa` com `interesse_prioritario = TRUE`).

**Regras de priorização (recomendado):**
- Dentro de uma coluna, ordenar primeiro por:
  1) `venda_casada_ativa = true` (cadeias primeiro),
  2) valor do imóvel associado (regra já existente),
  3) `data_movimentacao` (mais recente).

**Sugestão (futuro) — visão dedicada:**
- Criar uma página “**Cadeias (Vendas Casadas)**” que lista `vendas_casadas` e permite mover o `status` da cadeia independentemente da coluna do lead (porque a cadeia tem etapas próprias).

**Ações de Implementação:**
- [ ] Criar migrations para tabelas `kanban_colunas`, `leads_kanban` e `leads_imoveis_disputa`
- [ ] Popular colunas padrão do Kanban
- [ ] Criar triggers para atualizar `updated_at` e `data_movimentacao`
- [ ] Implementar validações de transição entre colunas
 - [ ] Exibir badge “VENDA CASADA” e status da cadeia no card do Kanban quando aplicável
 - [ ] Criar tela “Cadeias (Vendas Casadas)” (lista) consumindo `vendas_casadas`

---

### 4.1.4. Configuração de Sequência das Colunas (Drag & Drop)

**Objetivo:** Permitir que administradores reordenem as colunas do Kanban através de drag & drop, similar à configuração da sidebar.

#### 4.1.4.1. Função para Reordenar Colunas

```sql
CREATE OR REPLACE FUNCTION reordenar_colunas_kanban(
  p_colunas_ordenadas INTEGER[] -- Array com IDs das colunas na nova ordem
)
RETURNS BOOLEAN AS $$
DECLARE
  v_coluna_id INTEGER;
  v_nova_ordem INTEGER;
BEGIN
  -- Atualizar ordem de cada coluna baseado na posição no array
  FOR v_nova_ordem IN 1..array_length(p_colunas_ordenadas, 1) LOOP
    v_coluna_id := p_colunas_ordenadas[v_nova_ordem];
    
    UPDATE kanban_colunas
    SET ordem = v_nova_ordem,
        updated_at = NOW()
    WHERE id = v_coluna_id;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

#### 4.1.4.2. Função para Buscar Colunas Ordenadas

```sql
CREATE OR REPLACE FUNCTION buscar_colunas_kanban_ordenadas()
RETURNS TABLE (
  id INTEGER,
  nome VARCHAR(100),
  titulo_exibicao VARCHAR(150),
  descricao TEXT,
  ordem INTEGER,
  cor VARCHAR(7),
  icone VARCHAR(50),
  limite_cards INTEGER,
  ativa BOOLEAN,
  total_leads BIGINT -- Contagem de leads nesta coluna
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.nome,
    kc.titulo_exibicao,
    kc.descricao,
    kc.ordem,
    kc.cor,
    kc.icone,
    kc.limite_cards,
    kc.ativa,
    COUNT(lk.lead_uuid)::BIGINT as total_leads
  FROM kanban_colunas kc
  LEFT JOIN leads_kanban lk ON kc.id = lk.kanban_coluna_id
  WHERE kc.ativa = TRUE
  GROUP BY kc.id, kc.nome, kc.titulo_exibicao, kc.descricao, kc.ordem, kc.cor, kc.icone, kc.limite_cards, kc.ativa
  ORDER BY kc.ordem ASC;
END;
$$ LANGUAGE plpgsql;
```

#### 4.1.4.3. API Endpoint para Reordenar Colunas

```typescript
// Endpoint: PUT /api/admin/kanban/colunas/reordenar
// Body: { colunasIds: number[] }

export async function PUT(request: NextRequest) {
  try {
    const { colunasIds } = await request.json()
    
    if (!Array.isArray(colunasIds) || colunasIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Array de IDs de colunas é obrigatório' },
        { status: 400 }
      )
    }
    
    // Validar se todos os IDs existem
    const { rows } = await pool.query(
      'SELECT id FROM kanban_colunas WHERE id = ANY($1)',
      [colunasIds]
    )
    
    if (rows.length !== colunasIds.length) {
      return NextResponse.json(
        { success: false, message: 'Uma ou mais colunas não foram encontradas' },
        { status: 404 }
      )
    }
    
    // Reordenar usando função SQL
    await pool.query('SELECT reordenar_colunas_kanban($1)', [colunasIds])
    
    return NextResponse.json({
      success: true,
      message: 'Colunas reordenadas com sucesso'
    })
    
  } catch (error: any) {
    console.error('Erro ao reordenar colunas:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao reordenar colunas', error: error.message },
      { status: 500 }
    )
  }
}
```

#### 4.1.4.4. Componente React de Configuração de Colunas

```typescript
'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { DraggableKanbanColumn } from './DraggableKanbanColumn'

interface KanbanColumn {
  id: number
  nome: string
  titulo_exibicao: string
  ordem: number
  cor: string
  icone: string
  total_leads: number
  ativa: boolean
}

export function KanbanColumnsConfig() {
  const [colunas, setColunas] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    carregarColunas()
  }, [])

  const carregarColunas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/kanban/colunas')
      const data = await response.json()
      setColunas(data.colunas || [])
    } catch (error) {
      console.error('Erro ao carregar colunas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const oldIndex = colunas.findIndex(c => c.id === active.id)
    const newIndex = colunas.findIndex(c => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      setActiveId(null)
      return
    }

    // Reordenar localmente
    const novasColunas = [...colunas]
    const [movedColumn] = novasColunas.splice(oldIndex, 1)
    novasColunas.splice(newIndex, 0, movedColumn)

    // Atualizar ordem no backend
    try {
      const colunasIds = novasColunas.map(c => c.id)
      const response = await fetch('/api/admin/kanban/colunas/reordenar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colunasIds })
      })

      if (response.ok) {
        setColunas(novasColunas)
      } else {
        console.error('Erro ao salvar nova ordem')
        // Reverter para ordem anterior
        carregarColunas()
      }
    } catch (error) {
      console.error('Erro ao salvar ordem:', error)
      carregarColunas()
    }

    setActiveId(null)
  }

  if (loading) {
    return <div className="text-center py-8">Carregando colunas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Configuração de Colunas do Kanban
        </h2>
        <p className="text-sm text-gray-500">
          Arraste as colunas para reordená-las
        </p>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={colunas.map(c => c.id)} 
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {colunas.map(coluna => (
              <DraggableKanbanColumn
                key={coluna.id}
                coluna={coluna}
                isDragging={activeId === coluna.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {colunas.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhuma coluna cadastrada</p>
        </div>
      )}
    </div>
  )
}
```

#### 4.1.4.5. Componente DraggableKanbanColumn

```typescript
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from '@heroicons/react/24/outline'

interface DraggableKanbanColumnProps {
  coluna: {
    id: number
    titulo_exibicao: string
    cor: string
    icone: string
    total_leads: number
  }
  isDragging: boolean
}

export function DraggableKanbanColumn({ coluna, isDragging }: DraggableKanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: coluna.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed
        bg-white shadow-sm cursor-move
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="h-5 w-5 text-gray-400" />
      
      <div 
        className="w-4 h-4 rounded"
        style={{ backgroundColor: coluna.cor }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {coluna.titulo_exibicao}
        </div>
        <div className="text-sm text-gray-500">
          {coluna.total_leads} lead{coluna.total_leads !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="text-xs text-gray-400 font-mono">
        #{coluna.id}
      </div>
    </div>
  )
}
```

**Ações de Implementação:**
- [ ] Criar função `reordenar_colunas_kanban()`
- [ ] Criar função `buscar_colunas_kanban_ordenadas()`
- [ ] Criar endpoint `PUT /api/admin/kanban/colunas/reordenar`
- [ ] Criar componente `KanbanColumnsConfig` com drag & drop
- [ ] Criar componente `DraggableKanbanColumn`
- [ ] Adicionar rota `/admin/kanban/configuracao` para página de configuração
- [ ] Integrar com biblioteca @dnd-kit (já usada na sidebar)
- [ ] Atualizar função `buscar_leads_kanban_coluna()` para usar ordem atualizada

---

### 4.2. Funções de Busca e Ordenação

#### 4.2.1. Função para Buscar Leads de uma Coluna Ordenados

**Objetivo:** Buscar leads de uma coluna específica, ordenados por valor do imóvel (quando houver imóvel associado) ou por ordem manual.

```sql
CREATE OR REPLACE FUNCTION buscar_leads_kanban_coluna(
  p_coluna_id INTEGER,
  p_corretor_id UUID DEFAULT NULL, -- Filtrar por corretor (NULL = todos)
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  lead_uuid UUID,
  nome VARCHAR(255),
  telefone VARCHAR(20),
  email VARCHAR(255),
  tag_sonho VARCHAR(100),
  imovel_id INTEGER,
  imovel_titulo VARCHAR(255),
  imovel_preco DECIMAL(12,2),
  score_match DECIMAL(5,2),
  corretor_id UUID,
  corretor_nome VARCHAR(255),
  ordem INTEGER,
  data_movimentacao TIMESTAMP,
  observacoes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.lead_uuid,
    ls.nome,
    ls.telefone,
    ls.email,
    ls.tag_sonho,
    i.id as imovel_id,
    i.titulo as imovel_titulo,
    i.preco as imovel_preco,
    lid.score_match,
    lk.corretor_id,
    u.nome as corretor_nome,
    lk.ordem,
    lk.data_movimentacao,
    lk.observacoes
  FROM leads_kanban lk
  INNER JOIN leads_staging ls ON lk.lead_uuid = ls.lead_uuid
  LEFT JOIN leads_imoveis_disputa lid ON ls.lead_uuid = lid.lead_uuid AND lid.interesse_prioritario = TRUE
  LEFT JOIN imoveis i ON lid.imovel_id = i.id
  LEFT JOIN usuarios u ON lk.corretor_id = u.id
  WHERE lk.kanban_coluna_id = p_coluna_id
    AND (p_corretor_id IS NULL OR lk.corretor_id = p_corretor_id)
  ORDER BY 
    -- Se tem imóvel associado, ordenar por valor decrescente
    CASE WHEN i.id IS NOT NULL THEN i.preco ELSE 0 END DESC,
    -- Depois por ordem manual
    lk.ordem ASC,
    -- Por último por data de movimentação (mais recente primeiro)
    lk.data_movimentacao DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

#### 4.2.2. Função para Mover Lead entre Colunas

```sql
CREATE OR REPLACE FUNCTION mover_lead_kanban(
  p_lead_uuid UUID,
  p_nova_coluna_id INTEGER,
  p_corretor_id UUID DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_coluna_anterior_id INTEGER;
BEGIN
  -- Buscar coluna atual do lead
  SELECT kanban_coluna_id INTO v_coluna_anterior_id
  FROM leads_kanban
  WHERE lead_uuid = p_lead_uuid
  LIMIT 1;
  
  -- Se não encontrou, criar registro na nova coluna
  IF v_coluna_anterior_id IS NULL THEN
    INSERT INTO leads_kanban (lead_uuid, kanban_coluna_id, corretor_id, observacoes, ordem)
    VALUES (
      p_lead_uuid,
      p_nova_coluna_id,
      p_corretor_id,
      p_observacoes,
      (SELECT COALESCE(MAX(ordem), 0) + 1 FROM leads_kanban WHERE kanban_coluna_id = p_nova_coluna_id)
    );
    RETURN TRUE;
  END IF;
  
  -- Se já está na mesma coluna, apenas atualizar
  IF v_coluna_anterior_id = p_nova_coluna_id THEN
    UPDATE leads_kanban
    SET corretor_id = COALESCE(p_corretor_id, corretor_id),
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = NOW()
    WHERE lead_uuid = p_lead_uuid;
    RETURN TRUE;
  END IF;
  
  -- Mover para nova coluna
  UPDATE leads_kanban
  SET kanban_coluna_id = p_nova_coluna_id,
      corretor_id = COALESCE(p_corretor_id, corretor_id),
      observacoes = COALESCE(p_observacoes, observacoes),
      ordem = (SELECT COALESCE(MAX(ordem), 0) + 1 FROM leads_kanban WHERE kanban_coluna_id = p_nova_coluna_id),
      data_movimentacao = NOW(),
      updated_at = NOW()
  WHERE lead_uuid = p_lead_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

#### 4.2.3. Função para Associar Imóvel a Lead

```sql
CREATE OR REPLACE FUNCTION associar_imovel_lead(
  p_lead_uuid UUID,
  p_imovel_id INTEGER,
  p_interesse_prioritario BOOLEAN DEFAULT FALSE,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_score_match DECIMAL(5,2);
BEGIN
  -- Calcular score de match
  SELECT calcular_score_match_lead(p_imovel_id, p_lead_uuid) INTO v_score_match;
  
  -- Se for prioritário, remover prioridade de outros imóveis do mesmo lead
  IF p_interesse_prioritario = TRUE THEN
    UPDATE leads_imoveis_disputa
    SET interesse_prioritario = FALSE
    WHERE lead_uuid = p_lead_uuid;
  END IF;
  
  -- Inserir ou atualizar associação
  INSERT INTO leads_imoveis_disputa (
    lead_uuid,
    imovel_id,
    interesse_prioritario,
    score_match,
    observacoes
  )
  VALUES (
    p_lead_uuid,
    p_imovel_id,
    p_interesse_prioritario,
    v_score_match,
    p_observacoes
  )
  ON CONFLICT (lead_uuid, imovel_id) DO UPDATE SET
    interesse_prioritario = p_interesse_prioritario,
    score_match = v_score_match,
    observacoes = COALESCE(p_observacoes, leads_imoveis_disputa.observacoes),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar função `buscar_leads_kanban_coluna()`
- [ ] Criar função `mover_lead_kanban()`
- [ ] Criar função `associar_imovel_lead()`
- [ ] Criar API endpoints para operações do Kanban
- [ ] Implementar validações de transição entre colunas

---

### 4.3. Interface do Kanban

#### 4.3.1. Componentes Principais

**Estrutura da Interface:**
- **Colunas Dinâmicas:** Carregadas da tabela `kanban_colunas`
- **Cards de Lead:** Exibem informações resumidas do lead
- **Drag & Drop:** Permitir arrastar cards entre colunas
- **Filtros:** Por corretor, por imóvel, por tag de sonho
- **Ordenação Automática:** Por valor do imóvel quando houver imóvel associado

**Informações no Card:**
- Nome do lead
- Telefone/Email
- Tag de sonho (badge colorido)
- Imóvel associado (se houver) com valor destacado
- Score de match (se houver imóvel)
- Corretor responsável
- Data da última movimentação

#### 4.3.2. API Endpoints Necessários

```typescript
// Buscar todas as colunas do Kanban
GET /api/admin/kanban/colunas

// Buscar leads de uma coluna específica
GET /api/admin/kanban/colunas/:colunaId/leads?corretorId=xxx&limit=50&offset=0

// Mover lead entre colunas
POST /api/admin/kanban/leads/:leadUuid/mover
Body: { colunaId: number, corretorId?: uuid, observacoes?: string }

// Associar imóvel a lead
POST /api/admin/kanban/leads/:leadUuid/imoveis
Body: { imovelId: number, interessePrioritario?: boolean, observacoes?: string }

// Buscar imóveis disputados por um lead
GET /api/admin/kanban/leads/:leadUuid/imoveis

// Buscar leads disputando um imóvel
GET /api/admin/kanban/imoveis/:imovelId/leads
```

**Ações de Implementação:**
- [ ] Criar componente React/Vue de Kanban
- [ ] Implementar drag & drop com biblioteca @dnd-kit (mesma usada na sidebar)
- [ ] Criar cards de lead com informações resumidas
- [ ] Implementar filtros e busca
- [ ] Criar modal de detalhes do lead ao clicar no card
- [ ] Implementar ordenação automática por valor do imóvel
- [ ] Criar página de configuração de colunas (`/admin/kanban/configuracao`)
- [ ] Implementar drag & drop para reordenar colunas (similar à sidebar)
- [ ] Integrar função `buscar_colunas_kanban_ordenadas()` na busca de colunas

---

### 4.4. Regras de Negócio

#### 4.4.1. Transições Permitidas entre Colunas

```sql
CREATE TABLE kanban_transicoes_permitidas (
  id SERIAL PRIMARY KEY,
  coluna_origem_id INTEGER REFERENCES kanban_colunas(id) ON DELETE CASCADE,
  coluna_destino_id INTEGER REFERENCES kanban_colunas(id) ON DELETE CASCADE,
  requer_imovel BOOLEAN DEFAULT FALSE, -- Se requer imóvel associado para transição
  requer_aprovacao BOOLEAN DEFAULT FALSE, -- Se requer aprovação para transição
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coluna_origem_id, coluna_destino_id)
);

-- Exemplos de transições permitidas
INSERT INTO kanban_transicoes_permitidas (coluna_origem_id, coluna_destino_id, requer_imovel) VALUES
-- Leads pode ir para Contatados
((SELECT id FROM kanban_colunas WHERE nome = 'leads'), (SELECT id FROM kanban_colunas WHERE nome = 'contatados'), FALSE),
-- Contatados pode voltar para Leads ou ir para Agendados
((SELECT id FROM kanban_colunas WHERE nome = 'contatados'), (SELECT id FROM kanban_colunas WHERE nome = 'leads'), FALSE),
((SELECT id FROM kanban_colunas WHERE nome = 'contatados'), (SELECT id FROM kanban_colunas WHERE nome = 'agendados'), FALSE),
-- Agendados pode ir para Em Análise de Documentação (requer imóvel)
((SELECT id FROM kanban_colunas WHERE nome = 'agendados'), (SELECT id FROM kanban_colunas WHERE nome = 'em_analise_documentacao'), TRUE),
-- Em Análise de Documentação pode ir para Em Análise de Crédito
((SELECT id FROM kanban_colunas WHERE nome = 'em_analise_documentacao'), (SELECT id FROM kanban_colunas WHERE nome = 'em_analise_credito'), FALSE),
-- Em Análise de Crédito pode ir para Aprovados ou voltar
((SELECT id FROM kanban_colunas WHERE nome = 'em_analise_credito'), (SELECT id FROM kanban_colunas WHERE nome = 'aprovados'), FALSE),
((SELECT id FROM kanban_colunas WHERE nome = 'em_analise_credito'), (SELECT id FROM kanban_colunas WHERE nome = 'em_analise_documentacao'), FALSE),
-- Aprovados pode ir para Fechados
((SELECT id FROM kanban_colunas WHERE nome = 'aprovados'), (SELECT id FROM kanban_colunas WHERE nome = 'fechados'), FALSE);
```

#### 4.4.2. Validação de Transição

```sql
CREATE OR REPLACE FUNCTION validar_transicao_kanban(
  p_lead_uuid UUID,
  p_coluna_destino_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_coluna_origem_id INTEGER;
  v_tem_imovel BOOLEAN;
BEGIN
  -- Buscar coluna atual
  SELECT kanban_coluna_id INTO v_coluna_origem_id
  FROM leads_kanban
  WHERE lead_uuid = p_lead_uuid;
  
  -- Se não tem coluna atual, permitir qualquer transição inicial
  IF v_coluna_origem_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se transição é permitida
  IF NOT EXISTS (
    SELECT 1 FROM kanban_transicoes_permitidas
    WHERE coluna_origem_id = v_coluna_origem_id
      AND coluna_destino_id = p_coluna_destino_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se requer imóvel associado
  SELECT requer_imovel INTO v_tem_imovel
  FROM kanban_transicoes_permitidas
  WHERE coluna_origem_id = v_coluna_origem_id
    AND coluna_destino_id = p_coluna_destino_id;
  
  IF v_tem_imovel = TRUE THEN
    -- Verificar se lead tem imóvel associado
    IF NOT EXISTS (
      SELECT 1 FROM leads_imoveis_disputa
      WHERE lead_uuid = p_lead_uuid
        AND interesse_prioritario = TRUE
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar tabela `kanban_transicoes_permitidas`
- [ ] Popular transições padrão
- [ ] Criar função `validar_transicao_kanban()`
- [ ] Integrar validação na função `mover_lead_kanban()`
- [ ] Criar interface para admin gerenciar transições permitidas

---

### 4.5. Regras Operacionais do Kanban (Motivo / Próxima Tarefa / Estagnação – Blueprint)

**Aplicar a Regra de Ouro no Kanban:**
- Ao mover lead de coluna, exigir:
  - **observação/motivo** (ex.: “tentativa de contato – sem retorno”) **ou**
  - criação de **tarefa pendente** (`leads_tarefas`) com `agendada_para`.
- Ao mover para “Perdido”:
  - exigir `motivos_perda.motivo` estruturado + opcional `detalhes`.

**Alertas de estagnação:**
- Job diário (ou a cada hora) detecta leads parados **> 48h** sem tarefa futura e alerta gestor.

**Ações de Implementação:**
- [ ] Ajustar endpoint `POST /api/admin/kanban/leads/:leadUuid/mover` para exigir motivo ou tarefa
- [ ] Criar endpoint `POST /api/admin/leads/:leadUuid/tarefas`
- [ ] Criar painel “Estagnados >48h” para gestor

---

## 5. GESTÃO OPERACIONAL E COMERCIAL

### 5.1. Round Robin Meritocrático

**Objetivo:** Distribuir leads por especialidade, região e performance.

#### 4.1.1. Algoritmo de Distribuição

**Fatores de Pontuação:**

1. **Especialidade** (Peso: 40%)
   - Corretor tem experiência com tipo de imóvel do lead
   - Score: 0-40 pontos

2. **Região** (Peso: 30%)
   - Corretor conhece a região de interesse do lead
   - Score: 0-30 pontos

3. **Performance** (Peso: 20%)
   - Taxa de conversão do corretor nos últimos 90 dias
   - Score: 0-20 pontos

4. **Disponibilidade** (Peso: 10%)
   - Corretor está online e disponível
   - Score: 0-10 pontos

**Função SQL:**

```sql
CREATE OR REPLACE FUNCTION distribuir_lead_round_robin(p_lead_uuid UUID)
RETURNS UUID AS $$
DECLARE
  v_lead leads_staging%ROWTYPE;
  v_corretor_id UUID;
  v_max_score DECIMAL(5,2) := 0;
BEGIN
  -- Buscar lead
  SELECT * INTO v_lead FROM leads_staging WHERE lead_uuid = p_lead_uuid;
  
  -- Buscar melhor corretor
  SELECT c.id INTO v_corretor_id
  FROM corretores c
  WHERE c.ativo = TRUE
    AND c.disponivel = TRUE
  ORDER BY (
    -- Especialidade (40%)
    CASE 
      WHEN c.especialidades @> ARRAY[v_lead.tipo_imovel] THEN 40
      ELSE 20
    END +
    -- Região (30%)
    CASE 
      WHEN c.regioes_atendidas @> ARRAY[v_lead.regiao_interesse] THEN 30
      ELSE 10
    END +
    -- Performance (20%)
    COALESCE((
      SELECT (conversoes::DECIMAL / NULLIF(leads_atendidos, 0)) * 20
      FROM (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'conquista') as conversoes,
          COUNT(*) as leads_atendidos
        FROM leads_staging
        WHERE corretor_id = c.id
          AND created_at >= NOW() - INTERVAL '90 days'
      ) stats
    ), 10) +
    -- Disponibilidade (10%)
    CASE WHEN c.disponivel THEN 10 ELSE 0 END
  ) DESC
  LIMIT 1;
  
  -- Atribuir lead ao corretor
  UPDATE leads_staging
  SET corretor_id = v_corretor_id,
      status = 'entendimento_dor',
      distribuido_em = NOW()
  WHERE lead_uuid = p_lead_uuid;
  
  RETURN v_corretor_id;
END;
$$ LANGUAGE plpgsql;
```

**Ações de Implementação:**
- [ ] Criar função `distribuir_lead_round_robin()`
- [ ] Implementar job automático para distribuir leads não atribuídos
- [ ] Criar interface para corretores verem seus leads
- [ ] Implementar sistema de notificações quando lead é atribuído

---

### 5.2. SLA de Aceite (5 min) e Transbordo Automático (Escalonamento por Inércia – Blueprint)

**Objetivo:** garantir velocidade. Lead atendido em **< 5 minutos** tende a converter muito mais.

**Regras:**
- Ao atribuir lead, criar registro de SLA (`expira_em = now()+5min`).
- Corretor precisa “Aceitar atendimento”.
- Se não aceitar:
  - registrar evento,
  - penalizar score interno,
  - redistribuir (transbordo) para o próximo candidato.

```sql
CREATE TABLE leads_sla_aceite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  corretor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL, -- "pendente","aceito","expirado","transbordado"
  criado_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL,
  aceito_em TIMESTAMP,
  transbordado_em TIMESTAMP
);
CREATE INDEX idx_leads_sla_pendentes ON leads_sla_aceite(status, expira_em);
```

**Ações de Implementação:**
- [ ] Criar endpoint de aceite (`POST /api/admin/leads/:leadUuid/aceitar`)
- [ ] Criar job para expirar SLA + executar transbordo automático
- [ ] Medir “Taxa de Aceite no SLA” e “LRT” (ver Métricas)

---

### 5.3. Agendamento de Visita (Google Calendar) – Corretor ⇄ Cliente

**Objetivo:** permitir que o corretor agende visita com 1 clique, com confirmação, lembretes e histórico no CRM.

#### 5.3.1. Requisitos funcionais

- Corretor escolhe:
  - lead (`lead_uuid`)
  - imóvel (`imovel_id`, opcional mas recomendado)
  - data/hora (com fuso)
  - local (endereço do imóvel) + observações
- Sistema cria:
  - **evento no Google Calendar** do corretor
  - convite para o cliente (email, se existir) e/ou link de confirmação
  - registro interno de agendamento (para auditoria e Kanban)
- Ao agendar com sucesso:
  - mover lead para coluna “Agendados” (Kanban) e
  - criar `leads_tarefas` do tipo `visita` (próxima ação).

#### 5.3.2. Integração técnica com Google Calendar

- **OAuth2 por corretor** (recomendado): cada corretor conecta sua conta Google.
- Guardar tokens com segurança (criptografia/secret store).
- Usar **Google Calendar API**:
  - criar evento
  - atualizar/cancelar
  - receber webhooks (opcional) para mudanças feitas direto no Google

#### 5.3.3. Tabela sugerida (agendamentos)

```sql
CREATE TABLE visitas_agendadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  imovel_id INTEGER REFERENCES imoveis(id) ON DELETE SET NULL,
  corretor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  inicio_em TIMESTAMP NOT NULL,
  fim_em TIMESTAMP NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  local TEXT,
  observacoes TEXT,
  status VARCHAR(30) DEFAULT 'agendada', -- "agendada","remarcada","cancelada","realizada","nao_compareceu"
  google_calendar_event_id VARCHAR(255),
  google_calendar_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_visitas_lead ON visitas_agendadas(lead_uuid, inicio_em DESC);
CREATE INDEX idx_visitas_corretor ON visitas_agendadas(corretor_id, inicio_em DESC);
```

#### 5.3.4. Endpoints sugeridos

- `POST /api/admin/visitas` → cria visita + cria evento no Google Calendar
- `PUT /api/admin/visitas/:id` → remarcar (update interno + update evento Google)
- `POST /api/admin/visitas/:id/cancelar` → cancela (interno + Google)
- `GET /api/admin/visitas?corretorId=...&from=...&to=...` → agenda do corretor

#### 5.3.5. Regras de disponibilidade

- Buscar busy slots do Google Calendar do corretor e bloquear conflitos.
- Configurar “horários de atendimento” por corretor (ex.: seg-sex 9–18).

**Ações de Implementação:**
- [ ] Implementar OAuth Google por corretor (connect/disconnect)
- [ ] Criar `visitas_agendadas` + endpoints
- [ ] Integrar com Kanban (“Agendados”) e `leads_tarefas`
- [ ] Implementar lembretes (WhatsApp/email) T-24h e T-2h

---

### 5.4. Inteligência de Financiamento do “Gap” (Venda Casada) — destravar diferença de valores

**Contexto:** na venda casada, normalmente \(Preço\_Destino > Valor\_Origem\). A cadeia só fecha rápido se o CRM calcular e orientar o **financiamento do gap** (diferença) com clareza e opções.

#### 5.4.1. Dados mínimos a capturar (para viabilidade)

**Do imóvel origem (atual):**
- `valor_estimado_imovel_atual` (ou faixa), `saldo_devedor_financiamento` (se existir), prazo desejado, liquidez esperada.

**Do comprador (capacidade):**
- renda familiar (faixa), regime de trabalho (CLT/MEI/autônomo), score/“restrições” (auto-declarado), FGTS disponível (sim/não), entrada adicional (valor).

**Do destino (pretendido):**
- preço alvo (ou faixa) + “ticket máximo” real (incluindo parcelas).

> Esses dados entram no `leads_staging` (campos já previstos) e podem ser normalizados futuramente em uma tabela específica (abaixo).

#### 5.4.2. Cálculo operacional do gap (regra simples)

Definir:
- \(V_o\) = valor estimado do imóvel origem (líquido)
- \(D_o\) = saldo devedor/obrigações do imóvel origem (se houver)
- \(E\) = entrada adicional (dinheiro/FGTS/outros)
- \(V_d\) = valor do imóvel destino

Então:
\[
V_{origem\_liquido} = V_o - D_o
\]
\[
gap = V_d - (V_{origem\_liquido} + E)
\]

Armazenar em `vendas_casadas.gap_financeiro_estimado` e usar isso para recomendar a estratégia.

#### 5.4.3. Estratégias recomendadas (playbook financeiro)

- **Financiamento tradicional do destino**:
  - usar origem + entrada como parte do “down payment” e financiar o restante.
  - **Ação CRM:** simular 2–3 cenários de parcela (prazo/juros) e registrar “parcela-alvo” do lead.

- **Permuta parcial** (quando `aceita_permuta = true`):
  - origem entra como parte do pagamento e o **gap** vira financiamento/entrada adicional.
  - **Ação CRM:** marcar imóveis destino “compatíveis com permuta” e priorizar negociações com vendedores abertos à estrutura.

- **Venda do origem com prazo curto (liquidez)**:
  - precificar para girar rápido, mesmo abrindo mão de preço máximo, para destravar o destino.
  - **Ação CRM:** recomendar “estratégia liquidez” quando urgência alta e gap pequeno/médio.

- **Pré-aprovação de crédito (antes de publicar/propor)**:
  - valida capacidade de financiar o gap e reduz “vai-e-volta”.
  - **Ação CRM:** mover para coluna “Em Análise de Crédito” e criar tarefa obrigatória “pré-aprovação”.

- **Produto “ponte”/alternativas (fase futura, opcional)**:
  - crédito ponte/antecipação (banco), home equity, consórcio etc. (dependente de parceiros).
  - **Ação CRM:** tratar como “opções avançadas” com parceiro homologado e compliance.

#### 5.4.4. Módulo de simulação e recomendação (MVP + V2)

**MVP (sem integrações externas):**
- Simulador interno com parâmetros configuráveis (taxa, prazo, % entrada mínima).
- Saída: “cenário conservador / provável / agressivo” + parcela estimada.
- Registro no lead/cadeia (JSONB) para auditoria e decisão do corretor.

**V2 (com parceiros):**
- Integração com APIs/portais de crédito (ou fluxo manual com “status” e anexos).
- Registro estruturado de proposta de crédito, banco, taxa e status.

**Sugestão de tabela (futuro, opcional):**
```sql
CREATE TABLE financiamentos_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_casada_id UUID REFERENCES vendas_casadas(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL, -- "financiamento","permuta_parcial","pre_aprovacao","ponte","home_equity","consorcio"
  valor_gap DECIMAL(12,2) NOT NULL,
  entrada DECIMAL(12,2),
  prazo_meses INTEGER,
  taxa_mensal DECIMAL(8,5),
  parcela_estimada DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'simulado', -- "simulado","em_analise","aprovado","recusado"
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ações de Implementação (financiamento do gap):**
- [ ] Adicionar etapa “Pré-aprovação” no fluxo operacional da cadeia (tarefas + Kanban)
- [ ] Implementar simulador simples de gap (MVP) e registrar resultado por cadeia
- [ ] Criar recomendações automáticas baseadas em regras (urgência, gap, aceita permuta)

---

### 4.2. Script de Abordagem Consultiva

**Objetivo:** Roteiros para corretores focados em Upgrade e Segurança Patrimonial.

#### 4.2.1. Template de Abordagem

**Para Lead "Fim do Aluguel":**

```
"João, vi que você conversou com nossa assistente sobre o desejo de sair do aluguel. Eu sei que comprar o primeiro imóvel gera um misto de alegria e frio na barriga. Meu papel aqui não é te vender um teto, é garantir que você faça o negócio mais seguro da sua vida para que sua família tenha o sossego que merece. Vamos olhar as opções que protegem seu patrimônio?"
```

**Para Lead "Porto Seguro":**

```
"[Nome], nossa assistente me contou que você busca um lugar onde sua família possa criar raízes. Entendo que segurança para os filhos é prioridade. Vou te mostrar imóveis em bairros que oferecem exatamente isso: escolas próximas, parques seguros e a tranquilidade que você precisa para ver seus filhos crescerem felizes."
```

**Para Lead "Descanso Merecido":**

```
"[Nome], você trabalhou muito para chegar onde está. Agora é hora de garantir que seus próximos anos sejam de tranquilidade e conforto. Vou te apresentar opções que combinam acessibilidade, segurança e a localização que facilita sua rotina. Vamos conversar sobre o que é mais importante para você hoje?"
```

**Ações de Implementação:**
- [ ] Criar tabela `templates_abordagem` com templates por tag_sonho
- [ ] Integrar templates no CRM para corretores
- [ ] Criar interface para corretores personalizarem templates
- [ ] Implementar histórico de abordagens usadas

---

## 6. PÓS-VENDA: O CRM QUE CELEBRA

### 6.1. Aniversário da Conquista

**Objetivo:** Disparar gatilhos emocionais após a compra.

#### 6.1.1. Campanhas Automáticas

**Tabela:** `campanhas_pos_venda`

```sql
CREATE TABLE campanhas_pos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- "aniversario_conquista", "educacao_patrimonial", "manutencao", "valorizacao"
  trigger_dias INTEGER, -- Dias após a compra para disparar
  template_mensagem TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exemplo: Aniversário da Conquista (365 dias)
INSERT INTO campanhas_pos_venda (nome, tipo, trigger_dias, template_mensagem) VALUES
('Aniversário da Conquista', 'aniversario_conquista', 365, 
'Faz um ano que você realizou o sonho da casa própria. Como está a vida no novo lar? Queremos saber como você está aproveitando esse espaço que escolhemos juntos!');
```

**Ações de Implementação:**
- [ ] Criar tabela `campanhas_pos_venda`
- [ ] Implementar job para disparar campanhas automaticamente
- [ ] Integrar com WhatsApp Business API para envio
- [ ] Criar dashboard de engajamento pós-venda

---

### 6.2. Educação Patrimonial

**Objetivo:** Enviar conteúdos sobre como valorizar o imóvel.

**Tipos de Conteúdo:**
- Dicas de manutenção preventiva
- Tendências de valorização do bairro
- Reformas que agregam valor
- Financiamento e refinanciamento

**Ações de Implementação:**
- [ ] Criar biblioteca de conteúdos educacionais
- [ ] Implementar sistema de envio automático (mensal)
- [ ] Criar métricas de abertura e engajamento
- [ ] Integrar com blog/portal de conteúdo

---

## 7. MÉTRICAS E MELHORIA CONTÍNUA

### 7.1. Dashboard de Gestão (KPIs)

**KPIs Principais:**

1. **LVR (Lead Velocity Rate)** - Velocidade de geração de leads
   - Fórmula: (Leads do mês atual - Leads do mês anterior) / Leads do mês anterior * 100

2. **CPLQ (Custo por Lead Qualificado)** - Eficiência de marketing
   - Fórmula: Investimento em marketing / Leads qualificados (status >= entendimento_dor)

3. **Match de Base** - Taxa de deduplicação
   - Fórmula: Leads com match / Total de leads * 100

4. **Taxa de Conversão por Tag de Sonho**
   - Fórmula: Conquistas por tag / Leads por tag * 100

5. **Índice de Confiança**
   - Taxa de Indicação: Novos leads vindos de clientes / Total de clientes * 100
   - Sentimento das DMs: Análise de sentimento positivo nas conversas

6. **LRT (Lead Response Time) por Corretor**
   - Tempo entre distribuição (Round Robin) e primeiro contato efetivo (evento de produto/WhatsApp/call).

7. **Taxa de Aceite no SLA (5 min)**
   - % de leads aceitos antes de `leads_sla_aceite.expira_em`.

8. **Conversão de Staging (IA → Humano / SQL)**
   - % de leads que entram em staging e viram “qualificados (SQL)”.

9. **Acurácia de Match de Proprietários**
   - % de leads detectados como `match_proprietario_id` / `match_cliente_id`.

10. **Lead Score médio por origem**
   - Score médio por canal/campanha (UTMs) e por plataforma (Meta/LinkedIn/CSV).

11. **Gap de Match (Inventário vs Demanda)**
   - Quantos leads buscam perfil com baixo estoque → aciona campanha de captação.

12. **Taxa de Vendas Casadas (Attach Rate)**
   - % de fechamentos em que a imobiliária participou da **cadeia completa** (venda do imóvel origem + compra do destino).
   - Fórmula (sugestão): `vendas_casadas_fechadas / fechamentos_totais`.

13. **Tempo de Fechamento da Cadeia (Chain Cycle Time)**
   - Tempo médio entre “cadeia aberta” e “cadeia fechada”.
   - Fórmula (sugestão): `avg(vendas_casadas.atualizado_em - vendas_casadas.criado_em)` filtrando status `fechada`.

14. **Taxa de Destravamento (Venda do Origem → Proposta do Destino)**
   - % de cadeias em que, após “proposta/fechamento do imóvel origem”, o lead avançou para “proposta do destino” em X dias.

15. **Margem/Receita por Cadeia (2 lados)**
   - Receita média por cadeia vs receita média por venda simples (para comprovar a priorização).
   - Requer registrar comissões e vincular `vendas_casadas` aos fechamentos (fase futura).

**Ações de Implementação:**
- [ ] Criar dashboard no admin com KPIs em tempo real
- [ ] Implementar gráficos de tendência (últimos 6 meses)
- [ ] Criar alertas automáticos para KPIs abaixo do esperado
- [ ] Exportar relatórios em PDF/Excel

---

### 7.1.2. Painel “Inventário vs Demanda” (Gap de Match) – Blueprint

**Objetivo:** usar dados do CRM para orientar captação de proprietários e investimento em mídia.

- Exemplo: “200 leads buscando 2 quartos no Itaim, mas 5 imóveis disponíveis”.
- Ação: criar relatório semanal + tarefa/campanha de captação para o bairro/perfil.

**Ações de Implementação:**
- [ ] Criar relatório semanal de gap por bairro/tipologia/faixa de preço
- [ ] Integrar com campanhas de captação (lookalike de proprietários + anúncios hiper-locais)

---

### 7.1.3. Analytics de Criativos (Marketing) — do Criativo ao “Visita/Proposta”

**Objetivo:** guiar a produção de criativos e orçamento com base no que realmente importa: **SQL, visita e proposta**, não apenas clique.

**Painéis recomendados:**
- **Creative Scorecard** (por `creative_id`/`ad_id`):
  - CPL, **CPLQ**, taxa de SQL, taxa de visita, taxa de proposta, LRT, SLA aceite.
- **Matriz Emocional**:
  - performance por `tag_sonho` × público (idade/interesses) × bairro/faixa.
- **Canal vs Qualidade**:
  - Meta vs orgânico vs importação: lead score médio, % SQL, % visita.

**Cadência operacional (processo):**
- **Semanal**: revisar Top/Bottom 10 criativos por CPLQ e por visita.
- **Quinzenal**: rodar novos testes (mínimo 3 variações por `tag_sonho`).
- **Mensal**: atualizar biblioteca de criativos vencedores (playbook interno).

---

### 7.1.4. Analytics para Captação de Inventário (Proprietários e Construtoras/Incorporadoras)

**Objetivo:** criar um motor de aquisição de oferta (supply) baseado em dados: onde falta estoque, quanto isso custa, e quais argumentos/conteúdos convertem.

**Segmentos de supply:**
- **Proprietário PF** (venda/aluguel)
- **Construtora/Incorporadora** (estoque, lançamentos, repasse)

**KPIs de inventário (supply analytics):**
- **Tempo para entrar no inventário (TTI)**: lead proprietário → imóvel publicado.
- **Custo por Captação de Imóvel (CPI)**: investimento / imóveis captados.
- **Taxa de Conversão de Captação**: interessados proprietários → captação efetiva.
- **Liquidez por perfil**: tempo até 1ª visita / 1ª proposta por tipologia/bairro/IPVE.
- **Cobertura de demanda**: demanda (leads) / oferta (imóveis) por cluster (bairro+ticket).

**Uso direto para criativos de captação:**
- Se `Gap de Match` alto em bairro X: disparar campanha “Temos compradores para seu imóvel em X”.
- Se liquidez do cluster for alta: usar como prova (“vendemos em média em Y dias”).

**Propostas de valor (para motivar supply):**
- **Para proprietários**: “compradores qualificados + dados + velocidade + segurança”.
- **Para incorporadoras**: “distribuição omnicanal + qualificação por IA + relatórios de demanda + vitrine de leads ativos”.

**Ações de Implementação:**
- [ ] Criar painel “Supply Funnel” (leads proprietários → imóveis publicados → visitas → propostas)
- [ ] Criar campanhas específicas de captação por cluster (bairro/ticket) alimentadas pelo `Gap de Match`
- [ ] Criar relatório mensal para incorporadoras (“demanda por bairro/ticket”, “top buscas”, “leads qualificados gerados”)

---

### 7.1.5. Analytics de Vendas Casadas (Duplo Funil) — lucro e previsibilidade

**Objetivo:** tornar a priorização de “venda casada” **operável** e **mensurável**, com painéis que mostram onde a cadeia trava: avaliação/captação do origem, geração de comprador para o origem, e avanço do destino.

**Painéis recomendados:**
- **Cadeias Ativas (Kanban/Lista)**: por `status` da `vendas_casadas`, corretor, prazo desejado e prioridade.
- **Duplo Funil**:
  - Funil Origem: `avaliacao_origem → captacao_origem → marketing_origem → comprador_origem → proposta_origem → fechada`
  - Funil Destino: `interesse → visita → proposta_destino → fechada`
- **Travas (Top motivos)**:
  - “precisa vender antes”, “saldo devedor alto”, “preço do origem acima do mercado”, “destino fora do budget”, “sem estoque no cluster”.
- **Economia da cadeia**:
  - Receita média por cadeia vs venda simples
  - Tempo médio por etapa (SLA interno: avaliação em 24h, publicação em 72h, 1ª visita em X dias, etc.)

**Ações de Implementação:**
- [ ] Criar tela “Cadeias (vendas casadas)” com filtros e SLA interno por etapa
- [ ] Criar alertas de estagnação por etapa da cadeia (ex.: 72h sem avaliação/captação do origem)
- [ ] Integrar Creative Scorecard: criativos que mais geram **cadeias** (não só leads)

---

### 7.2. Ciclo de Retroalimentação (Feedback Loop)

**Objetivo:** Usar os "Motivos de Perda" para re-treinar a IA e otimizar o investimento em anúncios.

#### 7.2.1. Tabela de Motivos de Perda

```sql
CREATE TABLE motivos_perda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid),
  motivo VARCHAR(255) NOT NULL, -- "preco_alto", "localizacao", "timing", "concorrencia", "financiamento"
  detalhes TEXT,
  tag_sonho VARCHAR(100),
  campanha_origem VARCHAR(255),
  corretor_id UUID REFERENCES corretores(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ações de Implementação:**
- [ ] Criar tabela `motivos_perda`
- [ ] Implementar interface para corretores registrarem motivos
- [ ] Criar relatório mensal de motivos de perda por campanha
- [ ] Implementar re-treinamento automático da IA com dados de perda

**Extensão do blueprint (Loss Intelligence + Meta CAPI):**
- Ao marcar perda como “perfil_financeiro”, “timing/curioso”, “falta_match”, enviar sinal via **CAPI** como otimização negativa.
- Ao avançar para “visita” ou “proposta”, enviar sinal via **CAPI** como otimização positiva.

```sql
CREATE TABLE loss_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
  reason_code VARCHAR(50) NOT NULL,
  insight_ia TEXT,
  marketing_optimization_sent BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. CRONOGRAMA DE IMPLEMENTAÇÃO

### FASE 1: Fundação (Semanas 1-4)
- [ ] Arquitetura de dados (Staging, Match Engine)
- [ ] Integração com APIs sociais (WhatsApp, Instagram)
- [ ] Sistema básico de IA conversacional
- [ ] Importação CSV/XLSX com mapeador + dedupe (entrada manual/automática)
- [ ] LGPD mínimo: consentimento + auditoria + retenção
- [ ] (Corretor) Cadastro com CRECI + fluxo de validação (operacional)
- [ ] (Corretor) Definição de área de atuação (UF/cidade) e uso disso no roteamento de leads

### FASE 2: Marketing Inteligente (Semanas 5-8)
- [ ] Campanhas emocionais e tags de sonho
- [ ] Sistema de tags de estilo de vida
- [ ] Cálculo de IPVE
- [ ] Integração com Facebook Ads
- [ ] Taxonomia de eventos + Pixel + CAPI + atribuição (UTM/click ids)
- [ ] (Agente IA) Handoff: IA → humano com SLA e rastreio de conversão

### FASE 3: Qualificação e Conversão (Semanas 9-12)
- [ ] System prompt completo da IA
- [ ] Ficha de imóvel inteligente
- [ ] Round robin meritocrático
- [ ] Templates de abordagem
- [ ] SLA de aceite (5 min) + transbordo automático
- [ ] Tarefas obrigatórias por etapa + painel de estagnação (>48h)
- [ ] (Agente IA) Qualificação automática + score de prontidão + roteamento por área de atuação

### FASE 4: Pós-Venda e Métricas (Semanas 13-16)
- [ ] Campanhas pós-venda automáticas
- [ ] Dashboard de KPIs
- [ ] Sistema de feedback loop
- [ ] Relatórios e análises

---

## 9. RECURSOS NECESSÁRIOS

### 8.1. Tecnológicos

#### 8.1.1. APIs de IA
- **OpenAI GPT-4** ou **Anthropic Claude** (API key)
- **Custo:** Pay-per-use (por token)
- **Estimativa:** R$ 0,10 - R$ 0,50 por conversa completa (dependendo do modelo)

#### 8.1.2. Integração com Facebook e Instagram

**📱 O QUE É GRATUITO:**

1. **Facebook Graph API** - ✅ GRATUITA
   - Acesso às APIs é gratuito
   - Requer: Meta Business Account (gratuita)
   - Requer: App verificada no Facebook Developers
   - Limites de rate: 200 chamadas/hora por usuário (pode aumentar com verificação)

2. **Instagram Graph API** - ✅ GRATUITA
   - Acesso às APIs é gratuito
   - Requer: Conta Instagram Business ou Creator
   - Requer: Conexão com Facebook Page
   - Requer: App verificada no Facebook Developers

3. **Facebook Lead Ads API** - ✅ GRATUITA
   - Acesso aos leads capturados via Lead Ads é gratuito
   - Requer: Conta Facebook Ads ativa (gastos apenas com anúncios)
   - Requer: App verificada no Facebook Developers

4. **Instagram Direct Messages API** - ✅ GRATUITA (com limitações)
   - Acesso básico é gratuito
   - Requer: Conta Instagram Business verificada
   - Requer: App verificada no Facebook Developers
   - Limitação: Apenas respostas dentro de 24h após mensagem do usuário são gratuitas

**💰 O QUE É PAGO:**

1. **WhatsApp Business API** - 💰 PAGO (Modelo de Conversas)
   - **Custo:** Baseado em conversas (conversation-based pricing)
   - **Janela de Conversa:** 24 horas após última mensagem do usuário
   - **Tipos de Conversas:**
     - **Conversas iniciadas pelo usuário:** Gratuitas (primeiras 1.000/mês)
     - **Conversas iniciadas pela empresa:** R$ 0,05 - R$ 0,15 por conversa
     - **Conversas de marketing:** R$ 0,10 - R$ 0,20 por conversa
   - **Custo estimado:** R$ 500 - R$ 2.000/mês (dependendo do volume)
   - **Requer:** Meta Business Account verificada
   - **Requer:** Número de telefone verificado
   - **Opção:** Usar provedor oficial (Twilio, MessageBird, etc.) ou acesso direto via Meta

2. **Facebook Ads (Investimento em Anúncios)** - 💰 PAGO
   - **Custo:** Variável (você define orçamento)
   - **Mínimo recomendado:** R$ 500 - R$ 2.000/mês para testes
   - **Custo por Lead (CPL):** R$ 5 - R$ 50 (dependendo do público e concorrência)
   - **Requer:** Conta Facebook Ads ativa
   - **Requer:** Cartão de crédito cadastrado

3. **Verificação de App no Facebook Developers** - 💰 PAGO (Opcional mas Recomendado)
   - **Custo:** Gratuita inicialmente
   - **Verificação de Negócio:** Pode ser necessária para recursos avançados
   - **Custo:** Gratuita, mas requer documentação da empresa

**🔧 FERRAMENTAS INTERMEDIÁRIAS (OPCIONAL):**

Se optar por não desenvolver integração direta, pode usar:

1. **Zapier** - 💰 PAGO
   - **Plano Starter:** $19,99/mês (750 tarefas)
   - **Plano Professional:** $49,99/mês (2.000 tarefas)
   - **Plano Team:** $69,99/mês (50.000 tarefas)
   - **Integração:** Facebook Lead Ads → CRM

2. **Make (Integromat)** - 💰 PAGO
   - **Plano Core:** $9/mês (1.000 operações)
   - **Plano Pro:** $29/mês (10.000 operações)
   - **Plano Teams:** $99/mês (40.000 operações)
   - **Integração:** Facebook Lead Ads → CRM

3. **Pluga** - 💰 PAGO
   - **Plano Starter:** R$ 49/mês
   - **Plano Business:** R$ 149/mês
   - **Foco:** Mercado brasileiro

**💡 RECOMENDAÇÃO: DESENVOLVIMENTO DIRETO**

Para este projeto, **recomenda-se desenvolvimento direto** das integrações:

**Vantagens:**
- ✅ Sem custos mensais de ferramentas intermediárias
- ✅ Controle total sobre os dados
- ✅ Personalização completa
- ✅ Integração nativa com seu CRM
- ✅ Sem limitações de tarefas/operações

**Custos de Desenvolvimento:**
- Desenvolvedor: 2-3 semanas para integração completa
- Manutenção: 4-8h/mês

**Custos Operacionais Mensais Estimados:**

| Item | Custo Mensal Estimado |
|------|----------------------|
| **WhatsApp Business API (chatbot + lembretes + templates)** | R$ 800 - R$ 3.000 |
| **Facebook Ads (investimento)** | R$ 1.000 - R$ 5.000 |
| **APIs de IA (LLM + tool-calling)** | R$ 300 - R$ 1.500 |
| **Google Maps API** | R$ 100 - R$ 300 |
| **TOTAL MENSAL** | **R$ 2.200 - R$ 9.800** |

**Nota:** Os custos variam significativamente com o volume de leads e conversas.

#### 8.1.3. Outras APIs Necessárias
- **Google Maps API:** Para cálculo de distâncias
  - **Custo:** R$ 0,005 por requisição (primeiros R$ 200/mês gratuitos)
  - **Estimativa:** R$ 100 - R$ 300/mês
- **Facebook Ads API:** Para anúncios dinâmicos
  - **Custo:** Gratuita (gastos apenas com anúncios)
- **Banco de Dados:** PostgreSQL (já existente)

### 8.2. Humanos
- **Desenvolvedor Full-Stack:** 1 pessoa (16 semanas)
  - **Especialização:** Integração com APIs do Meta (Facebook/Instagram/WhatsApp)
  - **Conhecimento necessário:** OAuth 2.0, Webhooks, Graph API
- **Designer UX/UI:** 1 pessoa (8 semanas)
- **Especialista em Marketing Digital:** 1 pessoa (consultoria)
  - **Foco:** Configuração de campanhas Facebook Ads e Lead Ads
- **Analista de Dados:** 1 pessoa (consultoria)

### 8.3. Configurações Necessárias (Gratuitas mas Obrigatórias)

#### 8.3.1. Meta Business Account
- **Custo:** ✅ GRATUITA
- **Requisitos:**
  - Conta Facebook pessoal
  - Documentação da empresa (CNPJ)
  - Verificação de identidade

#### 8.3.2. Facebook Developers App
- **Custo:** ✅ GRATUITA
- **Requisitos:**
  - Conta Facebook Developers (gratuita)
  - Criar App do tipo "Business"
  - Configurar OAuth e Webhooks
  - Verificação de App (pode ser necessária para produção)

#### 8.3.3. Instagram Business Account
- **Custo:** ✅ GRATUITA
- **Requisitos:**
  - Converter conta pessoal para Business
  - Conectar com Facebook Page
  - Verificar conta (pode ser necessária)

#### 8.3.4. WhatsApp Business Account
- **Custo:** ✅ GRATUITA (criação)
- **Requisitos:**
  - Número de telefone dedicado
  - Verificação de número via SMS/Telefone
  - Aprovação do Meta para WhatsApp Business API

### 8.4. Infraestrutura
- **Servidor:** VPS ou Cloud (AWS/Azure/GCP)
  - **Requisito:** HTTPS obrigatório para webhooks
  - **Requisito:** Domínio válido com SSL
- **Armazenamento:** Para imagens e documentos
- **CDN:** Para performance de imagens

#### 8.4.1. Operação (VPS) — pontos críticos para escalar com segurança
- **CRM (mensageria e histórico)**
  - **Retenção/Arquivamento**: definir política (ex.: arquivar mensagens antigas após X meses para tabelas de histórico ou storage frio).
  - **Backups**: diário + retenção (ex.: 30 dias) + restore testado periodicamente.
  - **Índices**: planejar índices nas tabelas de mensageria/conversas (por `lead_uuid`, datas, canal, status) e revisar com `EXPLAIN` conforme crescer.
- **Net Imobiliária (site público)**
  - **Monitorar CPU/RAM**: picos, OOM, e saturação em horários de campanha.
  - **Monitorar disco/IO**: uso de NVMe, crescimento do volume do Postgres e logs.
  - **Monitorar tempo de queries**: latência (p95/p99) e queries mais caras (ideal: `pg_stat_statements`).

### 8.5. Resumo de Custos Mensais

**Custos Fixos (APIs e Serviços):**
- WhatsApp Business API (chatbot + automações): R$ 800 - R$ 3.000/mês
- APIs de IA (LLM + tool-calling): R$ 300 - R$ 1.500/mês
- Google Maps API: R$ 100 - R$ 300/mês
- **Subtotal APIs:** R$ 1.200 - R$ 4.800/mês

**Custos Variáveis (Marketing):**
- Facebook Ads (investimento em anúncios): R$ 1.000 - R$ 5.000/mês
- **Este valor depende do volume de leads desejado**

**Custos Únicos (Desenvolvimento):**
- Desenvolvimento de integrações: 2-3 semanas de desenvolvedor
- Configuração inicial: 1 semana

**TOTAL ESTIMADO MENSAL:** R$ 2.200 - R$ 9.800/mês

**Observações Importantes:**
- ✅ APIs do Facebook/Instagram são **gratuitas** (apenas requerem contas verificadas)
- ✅ WhatsApp Business API é **paga** (modelo de conversas)
- ✅ Facebook Ads é **pago** (você controla o investimento)
- ✅ Desenvolvimento direto elimina custos de ferramentas intermediárias (Zapier, Make, etc.)

---

## 10. CONSIDERAÇÕES FINAIS

Este projeto posiciona sua imobiliária digital não apenas como uma vendedora de casas, mas como uma **consultoria de dados e sonhos**. O diferencial competitivo está na capacidade de usar a tecnologia para ser mais humano (entendendo o sonho) e mais estratégico (provando o valor da vizinhança).

**Dica de Ouro:** Ao iniciar o desenvolvimento, comece pela **Camada de Staging (I.1)** e pela **Qualificação via IA (III.1)**. Estes dois módulos trazem o retorno sobre o investimento (ROI) mais rápido para a operação.

---

**Próximos Passos:**
1. Revisar e aprovar este plano de ação
2. Priorizar fases de implementação
3. Alocar recursos (humanos e tecnológicos)
4. Iniciar FASE 1: Fundação

---

*Documento criado em: 13 de Dezembro de 2025*  
*Versão: 1.0*

---

## 11. AGENTE DE IA PARA GERAÇÃO DE LEADS (BLUEPRINT)

### 11.1. Objetivo do agente

Criar um agente de IA que:
- **conversa** com leads (WhatsApp/Instagram/site),
- **qualifica** (intenção, urgência, restrições e contexto),
- **direciona** para o corretor certo (por área de atuação/plantão/performance),
- e **acompanha** a cadência (sem deixar lead morrer).

O agente não “substitui corretor”: ele aumenta a taxa de resposta, reduz ruído e padroniza o processo.

### 11.2. Escopo do MVP (primeira entrega)

- **Entrada**: mensagens do lead (site + WhatsApp como prioridade)
- **Saída**: lead estruturado em `leads_staging` + status inicial + tarefa sugerida
- **Handoff**: encaminhar para corretor em até X minutos quando virar SQL
- **Registro**: salvar resumo da conversa + sinais de intenção + próximos passos

### 11.2.1. Subproduto crítico: Agente de Distribuição (Lead Router)

**Objetivo:** garantir que cada lead seja encaminhado para o corretor certo, no tempo certo, com regras claras e mensuráveis.

O Lead Router decide:
- **quem recebe** o lead (corretor responsável)
- **quando** (SLA e transbordo)
- **por quê** (explicação auditável: área, desempenho, disponibilidade, tipo de intenção)

---

### 11.3. Arquitetura do agente (recomendada)

#### 11.3.1. Linguagem e stack

- **Orquestrador do agente (recomendado): Python + FastAPI**
  - Motivo: facilita evolução do agente (pipelines, avaliação, observabilidade) sem travar o CRM.
- **Framework do agente (recomendado): LangGraph (Python)**
  - Motivo: o agente vira um **grafo/estado** (roteamento, decisões, retries, handoff, jobs) com **checkpoints** e **observabilidade**.
  - Observação: LangGraph trabalha muito bem com tool-calling (via LangChain tools) e/ou com ferramentas expostas por MCP.
- **CRM/Core (existente): Next.js/Node**
  - Mantém UI, rotas admin, regras de negócio e persistência principal.

> Alternativa: tudo em Node/TypeScript. É viável, mas a evolução do agente costuma ser mais rápida em Python.

#### 11.3.2. MCP (Model Context Protocol)

**Recomendado**: expor as ferramentas do CRM como um (ou mais) **MCP Servers** internos e fazer o orquestrador atuar como **MCP Client**.

Benefícios:
- governança (auth, rate limit, auditoria)
- versionamento/contratos de tools
- isolamento entre “IA” e “dados/negócio”

#### 11.3.3. Componentes

- **Ingestão de eventos** (Webhooks):
  - Site (landpaging/modal) — **MVP**
  - WhatsApp Business Platform (mensagens e eventos) — **fase futura**
  - Instagram Messaging API (DMs) — **fase futura**
  - Meta Lead Ads (form) e cliques (UTM/click ids)
  - YouTube/Google Ads (UTM/gclid, quando aplicável)
- **Orquestrador (LLM Router)**
  - decide quais tools chamar
  - gera respostas e atualizações estruturadas
- **Lead Router (distribuição)**
  - recebe um “lead pronto para roteamento”
  - escolhe corretor, cria SLA, aplica transbordo
- **Workers/Jobs**
  - reengajamento, estagnação >48h, expiração SLA, retries
- **Fonte da verdade**: Postgres (tabelas do CRM) + logs/auditoria

---

### 11.3. Ferramentas (tools) que o agente pode chamar (server-side)

- `criar_ou_atualizar_lead_staging(dados)`
- `registrar_evento_marketing(evento)` (com consentimento)
- `buscar_imoveis(params)` e `buscar_detalhes_imovel(imovel_id)` (somente dados reais)
- `atribuir_corretor(lead_uuid)` (round robin por área de atuação)
- `criar_tarefa(lead_uuid, tipo, agendada_para, descricao)`

#### 11.3.1. Tools específicas do Lead Router (mínimo)

- `get_lead_context(lead_uuid)`:
  - retorna: intenção, região, ticket, urgência, origem/campanha/creative_id, histórico de contatos
- `list_eligible_brokers(uf, cidade, criterios)`:
  - retorna lista com: disponibilidade, performance, carga, SLA, status/ativo, CRECI validado
- `assign_lead(lead_uuid, broker_id, reason)`:
  - grava atribuição (auditável) e cria vínculo do lead com corretor
- `create_sla(lead_uuid, broker_id, expira_em)`:
  - SLA de aceite/primeiro contato
- `transbordar_lead(lead_uuid, motivo)`:
  - remove/expira atribuição anterior e re-roteia
- `log_router_decision(lead_uuid, decision_payload)`:
  - guarda explicação + candidatos + pontuações (auditoria/observabilidade)

---

### 11.4. Engenharia de contexto (o que alimenta a decisão)

O Lead Router precisa de um “pacote de contexto” consistente e curto:

#### 11.4.1. Contexto do lead
- intenção (`comprar`, `alugar`, `vender`, `investir`)
- região (UF/cidade e opcional bairro)
- faixa de preço/ticket (quando existir)
- urgência (sinal de timing)
- tag emocional (tag_sonho) e preferências relevantes (lazer/educação/mobilidade)

#### 11.4.2. Contexto de marketing (atribuição)
- `utm_*`, `fbclid/fbp/fbc`, `gclid`
- IDs quando disponíveis: `campaign_id`, `adset_id`, `ad_id`, `creative_id`
- versão de prompt/fluxo (para experimentos e comparação)

#### 11.4.3. Contexto do corretor (elegibilidade)
- CRECI validado
- área de atuação (UF/cidade)
- disponibilidade (online/plantão/horário)
- capacidade atual (carga, leads ativos, backlog)
- performance recente (visita/lead, proposta/visita, LRT)
- compliance: ativo, em dia (se houver regra de mensalidade), permissões

---

### 11.5. Modelo de dados necessário (para roteamento)

O roteamento por área de atuação exige dados explícitos. Se ainda não existir, criar:

- `corretor_areas_atuacao`:
  - `user_id`, `uf`, `cidade`, `ativo`, `prioridade` (opcional)

> Nota de padronização: para o roteamento, **usar somente `public.corretor_areas_atuacao`** como fonte da verdade.  
> Qualquer estrutura alternativa (ex.: tabelas antigas de localidades) deve ser **ignorada** pelo Lead Router para evitar divergência.
- `corretor_status_operacional`:
  - `user_id`, `online`, `plantao`, `capacidade_max`, `carga_atual`, `atualizado_em`
- `leads_atribuicoes` (ou equivalente):
  - `lead_uuid`, `user_id`, `status` (atribuido/aceito/transbordado), `motivo`, `created_at`
- `leads_sla_aceite` (já sugerido no plano):
  - `lead_uuid`, `corretor_id`, `expira_em`, `aceito_em`, `status`
- `marketing_eventos` (já sugerido no plano):
  - amarra lead/session → campanha/ad/creative + utm + click ids

> Observação: o objetivo é permitir auditoria (“por que esse corretor recebeu?”) e otimização (“quais criativos geram leads que viram visita?”).

---

### 11.6. Algoritmo de distribuição (técnico, auditável e justo)

#### 11.6.1. Elegibilidade (gating)

Um corretor só entra no pool se:
- CRECI validado
- ativo
- atende UF/cidade do lead
- dentro da capacidade (carga_atual < capacidade_max)
- não está bloqueado (compliance/regra interna)

#### 11.6.2. Score de roteamento (exemplo)

Pontuar candidatos com pesos configuráveis:

- **Área/fit geográfico** (peso alto)
- **Disponibilidade** (online/plantão)
- **Velocidade** (LRT histórico)
- **Performance** (visita/lead, proposta/visita, conversão por tag_sonho)
- **Carga** (preferir quem está abaixo do limite)
- **Especialidade** (opcional: tipo de imóvel/ticket)

Saída do algoritmo:
- `broker_id` escolhido
- `ranked_candidates[]` com score e motivos (para auditoria)

#### 11.6.3. SLA e transbordo

- Cria SLA (ex.: 5 min para aceite/primeiro contato)
- Se expirar:
  - marca como expirado
  - aplica penalidade (score interno)
  - transborda para o próximo candidato

---

### 11.7. Integrações com Meta/YouTube e criativos (do clique ao corretor)

#### 11.7.1. Ingestão mínima obrigatória
- Capturar `utm_source/medium/campaign/content/term`
- Capturar `fbclid/fbp/fbc` (Meta) e `gclid` (Google/YouTube, quando existir)
- Persistir em `marketing_eventos` e referenciar em `leads_staging.origem_detalhada`

#### 11.7.2. Uso no agente
- A campanha (e o `creative_id`) definem:
  - pergunta inicial
  - tag_sonho
  - fluxo de qualificação (curto/longo)
- O Lead Router usa:
  - praça/segmento (quando campanha é geolocalizada)
  - sinais de intenção (ex.: “Lead Ad” tende a ser diferente de “DM”)

---

### 11.4. Regras de segurança (obrigatórias)

- O agente **não inventa** imóveis/dados: sempre consulta a base.
- Rate limit por IP/número.
- Logs e auditoria de: criação/alteração de lead, atribuição, mensagens enviadas.
- LGPD: consentimento para tracking/remarketing e opt-out de comunicações.

### 11.8. Métricas para validar o agente (incluindo roteamento)

- LRT (Lead Response Time)
- % SQL (lead qualificado) por origem/campanha
- taxa de visita/lead e proposta/visita
- SLA de aceite do corretor (5 min)
- % leads estagnados >48h (deve cair)
- taxa de transbordo (quanto menor, melhor — sem “mascarar” baixa disponibilidade)
- conversão por corretor × praça × tag_sonho × creative_id

### 11.9. Roadmap recomendado (incremental e seguro)

- **MVP**: triagem + qualificação + handoff + registro
- **V1**: busca guiada de imóveis + “lista curta” (3 opções) + follow-ups
- **V2**: integração WhatsApp completa (templates fora da janela) + reengajamento
- **V3**: otimização por performance (feedback loop do corretor + aprendizado de perdas)

