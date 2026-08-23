# 26 Solução de Problemas e FAQ

> **Manual do Usuário — Perguntas Frequentes e Resolução de Erros Comuns**

## 1. Dúvidas Frequentes (FAQ)

### ❓ Esqueci minha senha, como recuperar?
Na tela de login, clique no link **Esqueceu a Senha?**, digite seu e-mail cadastrado e siga as instruções enviadas para redefinir sua senha com segurança.

### ❓ Cadastrei um imóvel, mas ele não aparece no site público. O que pode ser?
Verifique se o status do imóvel está marcado como **Status 99 (Rascunho)**. Imóveis em rascunho ficam visíveis apenas para a equipe interna. Altere o status para **Ativo** para publicar no portal público.

### ❓ O código do aplicativo 2FA está dando "Inválido". O que fazer?
Certifique-se de que a hora e data do seu celular estejam ajustadas para o modo automático. Diferenças de segundos entre o relógio do celular e o servidor podem invalidar o código TOTP.

---

## 2. Diagnóstico de Mensagens de Erro

| Código / Mensagem | Causa Provável | Ação Recomendada |
| :--- | :--- | :--- |
| **401 Unauthorized** | Sua sessão expirou ou o token de acesso é inválido. | Faça logout e realize o login novamente. |
| **403 Forbidden** | Seu perfil não tem permissão (RBAC) para acessar este recurso. | Solicite ao administrador (Nível 5) o ajuste de seu papel. |
| **Rate Limit Exceeded** | Muitas tentativas consecutivas enviadas em curto período. | Aguarde 1 minuto antes de tentar novamente. |
| **Erro ao Fazer Upload de Imagem** | O arquivo excede o limite de tamanho ou formato não suportado. | Utilize imagens nos formatos JPG, PNG ou WebP de até 10MB. |

---

## 3. Suporte Técnico Interno

Se você encontrou um comportamento inesperado que não consta nesta tabela:
1. Abra um chamado com o administrador do sistema da sua empresa.
2. Informe o e-mail do seu usuário, a tela em que o erro ocorreu e um print da mensagem apresentada.
