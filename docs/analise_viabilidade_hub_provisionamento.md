# Análise de Viabilidade: Hub de Provisionamento Master

Esta análise avalia a criação de uma interface unificada para o Super Admin gerenciar a estrutura macro da plataforma sem interferir na gestão interna das empresas.

## 1. Mapeamento da Hierarquia de Responsabilidades

| Nível | Entidade | Responsabilidade | Governança |
| :--- | :--- | :--- | :--- |
| **0** | **Segmento** | Super Admin | Definição de Indústria (Ex: Saúde, Imóveis) |
| **1** | **Módulo** | Super Admin | Motores Funcionais (Ex: CRM, Billing) |
| **2** | **Tenant (Empresa)**| Super Admin | Criação da Instância de Negócio |
| **3** | **Blueprint (Provisionamento)** | Super Admin | Entrega da "Chave": Módulos contratados e criação automática do perfil 'Administrador'. |
| **4** | **Configuração Endógena** | **Admin da Empresa** | Gestão TOTAL: Criação de sub-perfis (vendedores, gerentes), hierarquias internas, acessos e usuários. |

---

## 2. Viabilidade de UI/UX (O Hub de Provisionamento)

### Arquitetura da Interface Proposta
A UI unificada é perfeitamente viável através de um modelo de **Matriz de Provisionamento Dinâmico**.

> [!TIP]
> **Conceito Visual:** Em vez de páginas separadas, teríamos uma "Visão Master" onde o Super Admin seleciona um **Tenant** e o sistema exibe uma checklist hierárquica (`Módulo -> Features`).
> - **Ações do Master:** Ativar/Desativar Módulos inteiros ou Features específicas baseadas no contrato.
> - **Ação de Bootstrap:** Marcar quais Features o Admin da empresa verá no primeiro login.

### Impacto de Navegação
O impacto é positivo: reduz o tempo de configuração de um novo cliente de 15 minutos (pulando de tela em tela) para menos de 2 minutos.

---

## 3. Riscos Técnicos e Impacto de Quebra

### ⚠️ Ponto de Atenção: Conflito de Governança
Não há risco de quebra nas configurações internas das empresas (Perfis/Usuários) desde que a UI Unificada siga a regra de **Não Interferência**.

- **Viabilidade de Dados:** Precisamos apenas garantir que a tabela `tenant_feature_overrides` seja o espelho fiel do que o Super Admin marca na UI.
- **Hierarquia de Ferro:** A nova lógica de Sidebar já implementada prioritiza o provisionamento master.

---

## 4. Conclusão da Análise

| Aspecto | Avaliação | Justificativa |
| :--- | :--- | :--- |
| **Viabilidade Técnica** | **Excelente** | O banco de dados já suporta essa cascata de filtros. |
| **Integridade de UX** | **Alta** | Simplifica o workflow sem expor dados sensíveis das empresas ao Master. |
| **Risco de Regressão** | **Mínimo** | Mantém a separação total entre `system_features` e `permissions` locais. |
