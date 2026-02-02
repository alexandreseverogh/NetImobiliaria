# ❤️ Regras de Negócio: Transbordo de Leads e SLA (Core do Sistema)

**Documento Oficial de Regras de Negócio**
**Última Atualização:** 26/01/2026
**Status:** Em Vigor (Rigorous Compliance Required)

---

## 1. Visão Geral (Macrofuncionalidade "Coração")

A funcionalidade de **Roteamento e Transbordo de Leads** é o mecanismo central que garante o atendimento rápido e qualificado de potenciais clientes. O objetivo é maximizar a conversão distribuindo leads para o corretor mais apto, respeitando uma hierarquia de atendimento e tempos limite (SLA) rigorosos regidos por parâmetros de banco de dados.

A lógica segue o princípio de **Filtros em Cascata**:
1.  **Corretor Externo** (Especialista na Área: Estado/Cidade)
2.  **Corretor Interno** (Equipe da Casa)
3.  **Corretor Plantonista** (Garantia de Atendimento)

---

## 2. Governança por Parâmetros (Sem Hardcoding)

Os tempos de expiração e limites de tentativas **NÃO SÃO FIXOS NO CÓDIGO** (hardcoded). Eles obedecem estritamente aos valores configurados na tabela `parametros`.

| Parâmetro | Tipo | Padrão | Descrição | Origem (Migração) |
| :--- | :--- | :--- | :--- | :--- |
| `proximos_corretores_recebem_leads` | INTEGER | **3** | Número máximo de **Corretores Externos** que receberão o lead sequencialmente antes do transbordo para Internos. | `025_add_proximos...` |
| `sla_minutos_aceite_lead` | INTEGER | **5** | Tempo (minutos) que um **Corretor Externo** tem para aceitar o lead antes de expirar. | `030_add_sla...` |
| `proximos_corretores_recebem_leads_internos` | INTEGER | **3** | Número máximo de **Corretores Internos** que receberão o lead sequencialmente antes do Plantonista. | `002_add_internal...` |
| `sla_minutos_aceite_lead_interno` | INTEGER | **15** | Tempo (minutos) que um **Corretor Interno** tem para aceitar o lead antes de expirar. | `002_add_internal...` |

---

## 3. Comportamento dos Dados (Tabela `imovel_prospect_atribuicoes`)

O sistema mantém um registro auditável de cada tentativa de contato na tabela `imovel_prospect_atribuicoes`. Abaixo, o detalhamento exato do preenchimento dos campos em cada estado.

### 3.1. Ao Atribuir um Lead (Pendente de Aceite)
Quando o sistema escolhe um corretor (Externo ou Interno) para oferecer o lead:

*   **`status`**: Recebe o valor textual `'atribuido'`.
*   **`data_aceite`**: Recebe `NULL`.
*   **`expira_em`**: Recebe `NOW() + INTERVALO` (onde INTERVALO é o valor do parâmetro SLA correspondente ao tipo do corretor).
*   **`motivo`**: JSON contendo metadados da escolha (ex: `{ type: 'area_match', debug: 'Lvl:5 XP:1200' }`).

### 3.2. Ao Expirar (Perda por SLA)
Quando o corretor não aceita no tempo limite (processado pelo Worker):

*   **`status`**: Atualizado para `'expirado'`.
*   **`updated_at`**: Atualizado para `NOW()`.
*   **Ação:** O lead segue imediatamente para o próximo da fila (Transbordo).

### 3.3. Ao Aceitar (Manual ou Automático)
Quando o corretor clica em "Aceitar" ou quando é uma atribuição automática (Dono/Plantonista):

*   **`status`**: Atualizado para `'aceito'`.
*   **`data_aceite`**: Recebe `NOW()`.
*   **`expira_em`**: No caso de **Auto-Aceite** (Dono/Plantonista), nasce como `NULL`. Se foi manual, deixa de ser relevante (pois o status já é aceito).
*   **Efeito Colateral:** O campo `imoveis.corretor_fk` é atualizado com o ID deste corretor.

---

## 4. Fluxo Detalhado de Distribuição e Correlação Geográfica

O "Match" geográfico é estrito e hierárquico. **Não existe match parcial apenas por Bairro.**

A correlação ocorre entre:
1.  **Imóvel:** Campos `imoveis.estado_fk` (UF) e `imoveis.cidade_fk` (Nome da Cidade).
2.  **Corretor:** Tabela `corretor_areas_atuacao`, colunas `estado_fk` e `cidade_fk`.

### Lógica de Seleção:
1.  **Dono do Imóvel (Captação):**
    *   Prioridade Máxima. Se `imovel.corretor_fk` existe, o lead é dele (Auto-Aceite).

2.  **Tentativa 1: Corretor Externo (Geolocalizado):**
    *   Busca corretores onde `caa.estado_fk = imovel.estado_fk` **E** `caa.cidade_fk = imovel.cidade_fk`.
    *   Tipo: `Externo`.
    *   Ordenação: Score (Nível/XP) decrescente.

3.  **Tentativa 2: Corretor Interno (Backup Geográfico):**
    *   Busca corretores onde `caa.estado_fk = imovel.estado_fk` **E** `caa.cidade_fk = imovel.cidade_fk`.
    *   Tipo: `Interno`.

4.  **Tentativa 3: Plantonista (Global):**
    *   Se ninguém da área aceitar (ou não houver ninguém), busca qualquer usuário com flag `is_plantonista = true`.

---

## 5. Templates de E-mail (Jornada Completa)

A comunicação por e-mail é crítica e deve seguir rigorosamente os gatilhos e conteúdos abaixo.

### 5.1. Admin: Notificação de Interesse (Landpaging)
*   **Gatilho:** Clique no botão **'Tenho Interesse'** em qualquer card de imóvel na área pública.
*   **Destinatário:** Administrador (`alexandreseverog@gmail.com`).
*   **Template:** `imovel-interesse`
*   **Conteúdo Obrigatório:** Ficha completa do imóvel + Dados do cliente + Dados do proprietário.
    *   Variáveis: `codigo`, `titulo`, `preco`, `condominio`, `iptu`, `area_total`, `quartos`, `suites`, `banheiros`, `vagas`, `endereco_completo` (Rua, Nº, Bairro, Cidade, Estado, CEP), `proprietario_*`, `cliente_*`, `mensagem`.

### 5.2. Corretor: Nova Oportunidade (Aceite Necessário)
*   **Gatilho:** Atribuição de lead para um corretor que **NÃO** é o dono do imóvel e **NÃO** é plantonista (fluxo normal de Externo/Interno).
*   **Destinatário:** Corretor selecionado.
*   **Template:** `novo-lead-corretor`
*   **Assunto:** `Novo lead para você (aceite necessário) — {{codigo}}`
*   **Ação Esperada:** O corretor deve clicar no link e aceitar o lead no painel.

### 5.3. Corretor: Auto-Aceite (Dono ou Plantonista)
*   **Gatilho:** Atribuição de lead para o **Dono do Imóvel** (Captação) **OU** para o **Corretor Plantonista**.
*   **Destinatário:** Corretor selecionado (Dono ou Plantonista).
*   **Template:** `novo-lead-corretor-imovel-fk`
*   **Assunto:** `Novo interesse em imóvel — {{codigo}}`
*   **Diferença:** O lead já nasce com status `aceito`. O e-mail é apenas informativo ("Acesse o painel para ver detalhes").

### 5.4. Corretor: Lead Perdido (Expiração de SLA)
*   **Gatilho:** Quando um lead expira (`status='expirado'`) porque o corretor anterior não aceitou no tempo limite.
*   **Destinatário:** O corretor que **PERDEU** o lead.
*   **Template:** `lead-perdido-sla`
*   **Assunto:** `SLA expirado — lead redirecionado ({{codigo}})`
*   **Conteúdo Obrigatório (Paridade com Admin):** Além do aviso de SLA expirado, este e-mail **DEVE** conter todos os detalhes ricos do imóvel para maximizar o impacto pedagógico ("Veja o que você perdeu").
    *   **Campos Exigidos:** Mesmo conjunto de dados do e-mail do Admin (`imovel-interesse`): Preço, Condomínio, IPTU, Área, Quartos, Suítes, Vagas, Endereço Completo, etc.
    *   **Contexto de SLA:** `{{sla_minutos}}` expirados, tentativa `{{tentativa_atual}}` de `{{limite_tentativas}}`.

### 5.5. Cliente: Lead em Atendimento (Confirmação)
*   **Gatilho:** Quando o lead entra em status `aceito` (seja por clique manual do corretor, seja por atribuição automática ao Dono/Plantonista).
*   **Destinatário:** Cliente (interessado).
*   **Template:** `lead-aceito-cliente`
*   **Assunto:** `Um corretor está cuidando do seu interesse no imóvel {{codigo}}`
*   **Objetivo:** Tranquilizar o cliente e apresentar o corretor.
*   **Conteúdo Permitido:** Nome do Corretor, Telefone do Corretor (opcional), Dados do Imóvel (Título, Código).
*   **PROIBIDO:** Jamais exibir dados do Proprietário.

### 5.6. Restrições de Layout e Conteúdo
*   **Sem Fotos:** Para garantir entregabilidade e leveza, **NENHUM** e-mail transacional deve conter fotos do imóvel anexadas ou no corpo HTML. O corretor deve acessar o link do painel para visualizar a galeria.
*   **Dados Sensíveis:** No e-mail de "Lead Perdido", os dados de contato do Proprietário e do Cliente são **omitidos** propositalmente, mantendo apenas os dados públicos do imóvel.

---

## 6. Regras de Auditoria e Compliance

1.  **Logs de Expiração:** Todo evento de expiração gera um registro na tabela `audit_logs` com a tag `SLA_EXPIRED`, contendo o ID do corretor que perdeu e o tempo exato.
2.  **Imutabilidade:** Registros expirados nunca são deletados da tabela de atribuições; servem para cálculo de Score do Corretor.
3.  **Unicidade:** O sistema garante via transação de banco que apenas um corretor tenha o status `atribuido` ou `aceito` por vez para um mesmo lead.

---

**Fim do Documento**
