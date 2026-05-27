# Platform Schema Standard (PSS) - Master Platform 🛡️💎

Este documento define o padrão obrigatório para criação de qualquer nova tabela de entidade no ecossistema NetImobiliária / Master Platform. O descumprimento destes padrões invalida o agnostismo e a cognição da plataforma.

## 🛡️ Colunas Obrigatórias (The "Big 5")

Toda tabela que represente uma entidade de negócio (ex: `pacientes`, `veiculos`, `cursos`) DEVE conter:

1.  **`id` (UUID)**: Identificador único universal. Nunca use `Serial` para novas tabelas.
2.  **`tenant_id` (UUID)**: Obrigatório para isolamento multi-tenant (Pilar 6).
3.  **`metadata` (JSONB)**: A "Mala Infinita". Inicializar com `DEFAULT '{}'`. É aqui que o Field Builder armazena campos dinâmicos.
4.  **`is_active` (BOOLEAN)**: Padrão `TRUE`. Essencial para Soft Delete e governança de dados.
5.  **`created_at / updated_at` (TIMESTAMP)**: Auditoria temporal automática.

## 🛠️ Exemplo de Template de Criação (SQL)

```sql
CREATE TABLE public.nome_da_entidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    
    -- Colunas Fixas (Core)
    nome VARCHAR(255) NOT NULL,
    
    -- A MALA INFINITA (Pilar 3.4)
    metadata JSONB DEFAULT '{}',
    
    -- Controle e Auditoria
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexação Obrigatória para Performance
CREATE INDEX idx_nome_da_entidade_metadata ON public.nome_da_entidade USING GIN (metadata);
CREATE INDEX idx_nome_da_entidade_tenant ON public.nome_da_entidade (tenant_id);
```

## 🚀 Governança de Deploy (Espelhamento Ativo)

Para garantir a paridade absoluta entre os ambientes de Desenvolvimento (Local) e Produção (VPS), fica estabelecida a seguinte regra compulsória:

1.  **Atomicidade de Mudança**: Nenhuma alteração de esquema SQL (`ALTER`, `CREATE`, `DROP`) deve ser considerada concluída se não for replicada no arquivo `database/migrations/PILAR_X_CONSOLIDATED_SYNC.sql`.
2.  **Idempotência**: Todos os comandos no script de sincronização devem usar `IF NOT EXISTS`, `ON CONFLICT` ou blocos `EXCEPTION` para permitir execuções repetidas sem erro.
3.  **Responsabilidade da IA**: A IA deve realizar o espelhamento **proativamente**, sem necessidade de lembretes por parte do Usuário.

---
**Status**: VIGENTE
**Versão**: 1.1 (Governance Hardening)
