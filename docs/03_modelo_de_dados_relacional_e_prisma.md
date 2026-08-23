# 03 Modelo de Dados Relacional e Prisma ORM

> **Mapeamento de Schemas, Schemas PostgreSQL, Entidades Principais e Chaves Estrangeiras**

## 1. Organização por Schemas PostgreSQL

Para garantir o isolamento e a governança dos dados, o PostgreSQL é organizado nos seguintes schemas:

1. **`public`**: Entidades de segurança, usuários, perfis, logs, proprietários, clientes e preferências.
2. **`imobiliaria`**: Módulo vertical imobiliário (Imóveis, Amenidades, Proximidades, Documentos de Imóveis, Fichas Técnicas).
3. **`campanhasmarketingdigital`**: Módulo cross-segmento de Ads (Campanhas, AdSets, Ads, AdAssets, Insights, SearchTerms, Negativações, Benchmarks por `BusinessSegment`).
4. **`mensageria`**: Webchat, Conversas, Mensagens, Sessões Públicas, Roteamento e Transbordo de Leads.
5. **`feed`**: Feed de Notícias, Fontes RSS, Agendamentos e Postagens Sociais.

---

## 2. Diagrama de Relacionamentos Principais (ERD)

```mermaid
erDiagram
    Tenant ||--o{ User : "possui"
    Tenant ||--o{ Cliente : "gerencia"
    Tenant ||--o{ Imovel : "registra"
    
    User ||--o{ UserRoleAssignment : "atribui"
    Role ||--o{ UserRoleAssignment : "possui"
    Role ||--o{ RolePermissionAssignment : "atribui"
    Permission ||--o{ RolePermissionAssignment : "define"

    BusinessSegment ||--o{ Cliente : "especifica"
    BusinessSegment ||--o{ Campaign : "orienta prompts"

    Cliente ||--o{ Lead : "gera"
    Lead ||--o{ Conversation : "inicia chat"
    Conversation ||--o{ Message : "contém"

    Campaign ||--o{ AdSet : "contém"
    AdSet ||--o{ AdAsset : "vincula"
    Campaign ||--o{ Insight : "registra métricas"
```

---

## 3. Principais Modelos Prisma (`prisma/schema.prisma`)

* **`User`**: Usuário do sistema (nível 1 a 6, campos 2FA TOTP/Email, `tenant_id`).
* **`Role` / `Permission` / `UserRoleAssignment`**: Sistema RBAC dinâmico e flexível.
* **`Imovel`**: Ficha do imóvel (título, preço, endereço, amenidades, status público 99/ativo, `dual_key` UUID).
* **`Lead` / `LeadEvent`**: Gestão de clientes em potencial, origem, qualificação e timeline de eventos.
* **`Campaign` / `AdSet` / `AdAsset`**: Cockpit de tráfego pago multi-rede (Meta e Google Ads).
* **`BusinessSegment`**: Tabela que armazena vocabulário, prompts e regras específicas por nicho de mercado.
