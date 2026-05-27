# 📋 Análise de Impacto: Arquitetura CRM Agnóstica (Multi-Domínio)

**Autor:** Antigravity (AI Coding Assistant)  
**Data:** 30 de Março de 2026  
**Objetivo:** Evoluir o CRM do estágio "Imobiliário" para um modelo **"Domínio Agnóstico"** (reutilizável para Saúde, Educação, etc.), mantendo isolamento total do `landpaging` e `admin` atuais.

---

## 🛡️ Isolamento e Segurança (Guardian Rules)

1. **Camada de Adaptação (Adapters):** Toda lógica ligada a "Imóveis" ficará restrita a adaptadores. O núcleo do CRM (`distributionEngine.ts`, `kanbanService.ts`) não enxergará tabelas como `imoveis` diretamente.
2. **Impacto no Legado:** **ZERO**. O código de `landpaging` e `admin` não será tocado. A refatoração ocorrerá exclusivamente dentro do escopo do `/api/crm` e `/lib/routing`.

---

## 🏗️ Estrutura Proposta (Design Patterns)

### 1. Interface de Lead Universal (`StandardLeadContext`)
Em vez de funções que pedem um ID de imóvel, trabalharemos com um contrato:
```typescript
interface DistributionContext {
  target_id: string;      // ID do "Ativo" (Imóvel, Curso, Paciente)
  owner_id: string|null;   // ID do "Dono do Ativo" (Corretor, Professor, Médico)
  location: { uf: string; city: string };
  profile_score: number;
}
```

### 2. Fluxo de Execução (O "De-Coupling")
*   **Trigger (Imóveis):** O endpoint do CRM de Imóveis recebe o lead -> Busca o dono do imóvel -> Monta o `DistributionContext` -> Chama o `DistributionEngine`.
*   **Trigger (Futura Educação):** Um futuro endpoint de Cursos recebe o lead -> Busca o coordenador do curso -> Monta o mesmo `DistributionContext` -> Chama o **MESMO** `DistributionEngine`.

---

## 📊 Impacto nos Módulos Desenvolvidos

### **A. Banco de Dados (PostgreSQL)**
*   **Leads Staging:** Manteremos os campos genéricos (nome, email, telefone, geoloc).
*   **Metadados:** Uso intensivo do `raw_json` para armazenar dados específicos de cada nicho (ex: "ID do Imóvel" ou "ID da Instituição").
*   **Risco:** Baixo. É apenas uma mudança de visão sobre como interpretamos os dados.

### **B. Kanban e Dashboard (UI)**
*   **Abstração de Labels:** Os textos da interface (ex: "Últimos Imóveis") serão movidos para um arquivo de configuração ou tradução (i18n).
*   **Cards Dinâmicos:** O card do Kanban lerá o `raw_json` para decidir o que exibir (uma foto de casa ou o logo de uma escola).

### **C. Motor de Distribuição (`distributionEngine.ts`)**
*   **Refatoração Necessária:** Iremos extrair as queries SQL que usam explicitamente a tabela `imoveis` e passaremos a injetar essas dependências como parâmetros.
*   **Risco:** Médio (requer testes de integração), mas com **benefício vital** de evitar duplicação.

---

## ⚠️ Matriz de Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Vínculo Físico no DB** | Baixo | Usar `imovel_id` atual, mas tratá-lo no código como `subject_id` genérico para futuras migrações facilitadas. |
| **Complexidade Inicial** | Baixo | Criar interfaces leves que não adicionam "boilerplate" desnecessário ao código. |

---

## 📅 Próximo Passo Técnico
1. Criar o arquivo `src/lib/routing/distributionEngine.ts` com o contrato agnóstico.
2. Iniciar a refatoração do `prospectRouter.ts` para que ele alimente esse contrato sem quebrar o fluxo do site.

**Aprovação solicitada para iniciar esta arquitetura escalável e multi-área.**
