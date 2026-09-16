# ADR-003: Autenticação 2FA TOTP/Email e Sessão

* **Status**: Aceito
* **Data**: 2026-03-01
* **Decisores**: Equipe de Segurança

## Contexto
Proteger contas de administradores e usuários contra ataques de força bruta ou vazamento de credenciais.

## Decisão
Implementar **Autenticação em Dois Fatores (2FA)** híbrida: TOTP via aplicativo autenticador (`qrcode.react`) e fallback via Email OTP de 6 dígitos.

## Consequências
* **Positivas**: Conformidade com os padrões de segurança corporativa (Guardian Rules) e proteção robusta das sessões.
* **Negativas**: Exige fluxo de autenticação em dois passos no login e mecanismos de recuperação de chave TOTP.
