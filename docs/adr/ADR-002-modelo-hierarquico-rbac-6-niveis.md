# ADR-002: Modelo Hierárquico RBAC de 6 Níveis

* **Status**: Aceito
* **Data**: 2026-02-10
* **Decisores**: Equipe de Segurança e Arquitetura

## Contexto
Necessidade de suportar múltiplos perfis de acesso no mesmo tenant (Super Admin, Diretor, Gerente, Corretor, Assistente, Leitura) garantindo isolamento estrito de dados e funcionalidades.

## Decisão
Implementar um sistema de **Role-Based Access Control (RBAC) Hierárquico em 6 Níveis**, respaldado pelas tabelas `Role`, `Permission`, `UserRoleAssignment` e `RolePermissionAssignment`.

## Consequências
* **Positivas**: Granularidade total no controle de rotas de API e componentes de interface (Sidebar dinâmica), eliminando acessos indevidos.
* **Negativas**: Requer verificação de permissão (`hasPermission`) em todos os endpoints administrativos.
