# ADR-005: Fundação Multi-Segmento e Prompt Management

* **Status**: Aceito
* **Data**: 2026-06-01
* **Decisores**: Equipe de Arquitetura e Produto

## Contexto
Tornar os motores de CRM, Mensageria, Feed e Ads da plataforma capazes de atender qualquer segmento de mercado (Saúde, Educação, Serviços, Varejo, Automóveis) além do setor Imobiliário.

## Decisão
Adotar o princípio **Segmento ≠ Tenant** e isolar as inteligências de negócio em tabelas configuráveis no banco de dados (`BusinessSegment` e `PromptManagement`), mantendo o código 100% agnóstico.

## Consequências
* **Positivas**: Expansão ilimitada para novos nichos de mercado sem a necessidade de reescrever código ou criar forks da aplicação.
* **Negativas**: Exige parametrização rigorosa de prompts e vocabulários no banco de dados para cada segmento cadastrado.
