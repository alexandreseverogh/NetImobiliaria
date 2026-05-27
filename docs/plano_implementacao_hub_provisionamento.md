# Plano de Implementação: Hub de Provisionamento Master

Este plano visa unificar as entidades de governança em uma única interface de comando, focada na "Entrega de Chaves" e provisionamento macro.

## User Review Required
> [!IMPORTANT]
> **Fluxo de Trabalho:** O Super Admin navegará do **Segmento** -> **Módulo** -> **Empresa** -> **Provisionamento**.
> **Segurança:** O Super Admin **não** verá usuários finais ou perfis internos das empresas.

---

## Propostas de Mudanças

### 1. Backend: Unificação da API de Provisionamento
#### [NEW] [provisioning.ts](file:///c:/NetImobiliária/net-imobiliaria/src/app/api/admin/master/provisioning/route.ts)
Criaremos um endpoint centralizado que permite:
- Listar todas as entidades em uma única árvore de dados (Lazy Loading).
- Salvar o "Pacote de Contrato" (Módulos e Features) de uma empresa em uma única transação.

### 2. Frontend: O "Command Center"
#### [NEW] [MasterProvisioningHub.tsx](file:///c:/NetImobiliária/net-imobiliaria/src/components/admin/MasterProvisioning/MasterProvisioningHub.tsx)
Uma interface de canvas dividido:
- **Painel A:** Seletor de Segmentos e Gestão de Módulos por Segmento.
- **Painel B:** Lista de Empresas do Segmento Selecionado.
- **Painel C:** **Matriz de Provisionamento** (Toggle de Módulos e Features para a Empresa selecionada).

---

## Plano de Verificação

### Automated Tests
- Testar a criação de uma empresa e verificar se o perfil 'Administrador' recebeu apenas as funcionalidades provisionadas pelo Master.

### Manual Verification
- Validar se um Super Admin consegue desativar um módulo para uma empresa e se isso reflete instantaneamente na sidebar daquela empresa.
