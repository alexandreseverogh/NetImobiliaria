# 🛡️ MANIFESTO DE DEPLOY SQL (VPS SYNC)

Este documento rastreia todos os scripts SQL que devem ser aplicados na VPS para manter a paridade com o banco de dados local da Fundação v5.1.

---

## 🛠️ FASE 1: FUNDAÇÃO E IAM

| ID | Arquivo SQL | Status VPS | Data Aplicação | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **0.1** | `schema_migrations_table.sql` | 🔴 [PEN] | - | Tabela de controle de versão |
| **1.1** | `001_create_iam_structure.sql` | 🔴 [PEN] | - | Criação de Tenants e Memberships |

---

## 📅 NOTAS DE DEPLOY
- **2026-04-08:** Início do rastreamento de sincronia com a VPS.
