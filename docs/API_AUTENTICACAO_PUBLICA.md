# 📚 Documentação: APIs de Autenticação Pública

## 🎯 Visão Geral

APIs para autenticação de **Clientes** e **Proprietários** na área pública do sistema, com suporte a 2FA por email.

---

## 🔐 APIs Criadas

### 1. **POST `/api/public/auth/login`** - Login com 2FA

#### Descrição
Autentica clientes ou proprietários e retorna token JWT.

#### Request Body
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "userType": "cliente",  // ou "proprietario"
  "twoFactorCode": "123456"  // Opcional na 1ª chamada
}
```

#### Fluxo
1. **1ª Chamada** (sem código 2FA):
   - Valida email e senha
   - Envia código 2FA por email
   - Retorna `requires2FA: true`

2. **2ª Chamada** (com código 2FA):
   - Valida código 2FA
   - Retorna token JWT

#### Response (Sucesso - Com 2FA)
```json
{
  "success": false,
  "requires2FA": true,
  "message": "Código de verificação enviado por email"
}
```

#### Response (Sucesso - Login Completo)
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@email.com",
      "cpf": "123.456.789-00",
      "telefone": "(81) 99999-9999",
      "userType": "cliente",
      "is2FAEnabled": true,
      "endereco": "Rua Exemplo, 123",
      "numero": "123",
      "bairro": "Centro",
      "estado_fk": "PE",
      "cidade_fk": "Recife",
      "cep": "50000-000"
    }
  }
}
```

#### Response (Erro)
```json
{
  "success": false,
  "message": "Credenciais inválidas"
}
```

---

### 2. **POST `/api/public/auth/register`** - Cadastro

#### Descrição
Cadastra novo cliente ou proprietário.

#### Request Body
```json
{
  "userType": "cliente",  // ou "proprietario"
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "email": "joao@email.com",
  "telefone": "(81) 99999-9999",
  "password": "senha123456",
  "endereco": "Rua Exemplo, 123",  // Opcional
  "numero": "123",  // Opcional
  "bairro": "Centro",  // Opcional
  "estado_fk": "PE",  // Opcional
  "cidade_fk": "Recife",  // Opcional
  "cep": "50000-000"  // Opcional
}
```

#### Validações
- ✅ Nome, CPF, email, telefone e senha são obrigatórios
- ✅ CPF válido e único
- ✅ Email válido e único
- ✅ Senha mínimo 8 caracteres
- ✅ `userType` deve ser 'cliente' ou 'proprietario'

#### Response (Sucesso)
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso! Faça login para acessar sua conta.",
  "data": {
    "id": 18,
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "userType": "cliente"
  }
}
```

#### Response (Erro - CPF Duplicado)
```json
{
  "success": false,
  "message": "CPF já cadastrado"
}
```

#### Response (Erro - Email Duplicado)
```json
{
  "success": false,
  "message": "Email já cadastrado"
}
```

---

### 3. **GET `/api/public/auth/profile`** - Visualizar Perfil

#### Descrição
Retorna dados do perfil do usuário autenticado.

#### Headers
```
Authorization: Bearer <token_jwt>
```

#### Response (Sucesso)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@email.com",
    "telefone": "(81) 99999-9999",
    "endereco": "Rua Exemplo, 123",
    "numero": "123",
    "bairro": "Centro",
    "estado_fk": "PE",
    "cidade_fk": "Recife",
    "cep": "50000-000",
    "two_fa_enabled": true,
    "userType": "cliente",
    "created_at": "2025-11-05T10:00:00.000Z",
    "updated_at": "2025-11-05T10:00:00.000Z"
  }
}
```

#### Response (Erro - Não Autenticado)
```json
{
  "success": false,
  "message": "Não autenticado"
}
```

---

### 4. **PUT `/api/public/auth/profile`** - Atualizar Perfil

#### Descrição
Atualiza dados do perfil do usuário autenticado.

#### Headers
```
Authorization: Bearer <token_jwt>
```

#### Request Body (Campos Editáveis)
```json
{
  "nome": "João Silva Santos",
  "email": "joao.santos@email.com",
  "telefone": "(81) 98888-8888",
  "password": "novaSenha123",  // Opcional
  "endereco": "Rua Nova, 456",
  "numero": "456",
  "bairro": "Boa Viagem",
  "estado_fk": "PE",
  "cidade_fk": "Recife",
  "cep": "51000-000"
}
```

#### Restrições
- ❌ **CPF não pode ser alterado**
- ❌ **ID não pode ser alterado**
- ✅ Email deve ser único (não pode ser de outro usuário)
- ✅ Senha será hash automaticamente

#### Response (Sucesso)
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": 1,
    "nome": "João Silva Santos",
    "email": "joao.santos@email.com",
    // ... demais campos atualizados
    "userType": "cliente"
  }
}
```

#### Response (Erro - Email em Uso)
```json
{
  "success": false,
  "message": "Email já está em uso"
}
```

---

## 🔒 Segurança

### JWT (JSON Web Token)
- **Expiração**: 24 horas
- **Secret**: Variável de ambiente `JWT_SECRET`
- **Payload**:
```json
{
  "userId": 1,
  "userType": "cliente",
  "email": "usuario@email.com",
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "is2FAEnabled": true,
  "iat": 1699200000,
  "exp": 1699286400
}
```

### 2FA (Two-Factor Authentication)
- **Método**: Email
- **Código**: 6 dígitos numéricos
- **Expiração**: Configurável (padrão: 10 minutos)
- **Serviço**: Reutiliza `twoFactorAuthService` do admin

### Senhas
- **Algoritmo**: bcrypt
- **Salt Rounds**: 12
- **Validação**: Mínimo 8 caracteres
- **Armazenamento**: Sempre hash, nunca texto plano

---

## 📊 Fluxo Completo de Cadastro e Login

```
1. Usuário acessa /landpaging
2. Clica em "Cadastre-se"
3. Escolhe "Cliente" ou "Proprietário"
4. Preenche formulário
   ├── POST /api/public/auth/register
   ├── Validações (CPF, email, senha)
   ├── Criação na tabela clientes ou proprietarios
   └── Senha hash com bcrypt

5. Clica em "Login"
6. Escolhe tipo de usuário
7. Informa email e senha
   ├── POST /api/public/auth/login (1ª chamada)
   ├── Valida credenciais
   └── Envia código 2FA por email

8. Digita código de 6 dígitos
   ├── POST /api/public/auth/login (2ª chamada)
   ├── Valida código 2FA
   └── Retorna token JWT

9. Acessa /meu-perfil
   ├── GET /api/public/auth/profile
   └── Visualiza seus dados

10. Edita perfil
    ├── PUT /api/public/auth/profile
    └── Atualiza dados (exceto CPF)
```

---

## 🧪 Testando as APIs

### Cadastro
```bash
curl -X POST http://localhost:3000/api/public/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "cliente",
    "nome": "Teste Silva",
    "cpf": "111.111.111-11",
    "email": "teste@teste.com",
    "telefone": "(81) 99999-9999",
    "password": "senha12345"
  }'
```

### Login (1ª chamada - Enviar 2FA)
```bash
curl -X POST http://localhost:3000/api/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@teste.com",
    "password": "senha12345",
    "userType": "cliente"
  }'
```

### Login (2ª chamada - Com código 2FA)
```bash
curl -X POST http://localhost:3000/api/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@teste.com",
    "password": "senha12345",
    "userType": "cliente",
    "twoFactorCode": "123456"
  }'
```

### Visualizar Perfil
```bash
curl -X GET http://localhost:3000/api/public/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Atualizar Perfil
```bash
curl -X PUT http://localhost:3000/api/public/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Silva Santos",
    "telefone": "(81) 98888-8888"
  }'
```

---

## 📝 Notas Importantes

1. **2FA Obrigatório**: Por padrão, todos os novos cadastros têm `two_fa_enabled = true`
2. **Sem Login Automático**: Após cadastro, usuário deve fazer login manualmente
3. **Token no Header**: Usar `Authorization: Bearer <token>` para rotas autenticadas
4. **CPF Imutável**: CPF não pode ser alterado após cadastro
5. **Email Único**: Cada email só pode estar em um registro (cliente ou proprietário)

---

**Data**: 05/11/2025  
**Versão**: 1.0  
**Sistema**: Net Imobiliária - Autenticação Pública


