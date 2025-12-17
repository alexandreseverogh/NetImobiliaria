# 🚀 Guia de Instalação - Net Imobiliária

## 📋 Pré-requisitos

### **1. Node.js (OBRIGATÓRIO)**
- **Versão**: Node.js 18.0.0 ou superior
- **Download**: [nodejs.org](https://nodejs.org/)
- **Verificação**: `node --version` (deve retornar v18+)

### **2. PostgreSQL (OBRIGATÓRIO)**
- **Versão**: PostgreSQL 15.0 ou superior
- **Download**: [postgresql.org](https://www.postgresql.org/download/)
- **Verificação**: `psql --version` (deve retornar 15+)

### **3. Git (OBRIGATÓRIO)**
- **Download**: [git-scm.com](https://git-scm.com/)
- **Verificação**: `git --version`

### **4. Editor de Código (RECOMENDADO)**
- **Visual Studio Code**: [code.visualstudio.com](https://code.visualstudio.com/)
- **Extensões recomendadas**:
  - TypeScript
  - Tailwind CSS IntelliSense
  - PostgreSQL
  - ES7+ React/Redux/React-Native snippets

## 🔧 Instalação Passo a Passo

### **Passo 1: Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/net-imobiliaria.git
cd net-imobiliaria
```

### **Passo 2: Instale as Dependências**
```bash
npm install
```

### **Passo 3: Configure o PostgreSQL**

#### **3.1. Crie o Banco de Dados**
```sql
-- Conecte-se ao PostgreSQL como superusuário
psql -U postgres

-- Crie o banco de dados
CREATE DATABASE net_imobiliaria;

-- Crie um usuário específico (opcional, mas recomendado)
CREATE USER net_imobiliaria_user WITH PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE net_imobiliaria TO net_imobiliaria_user;

-- Saia do psql
\q
```

#### **3.2. Execute os Scripts SQL**
```bash
# Execute o schema principal
psql -U postgres -d net_imobiliaria -f database/schema.sql

# Execute os dados iniciais
psql -U postgres -d net_imobiliaria -f database/seed.sql
```

### **Passo 4: Configure as Variáveis de Ambiente**

#### **4.1. Crie o arquivo .env.local**
```bash
cp env.example .env.local
```

#### **4.2. Edite o arquivo .env.local**
```env
# ===========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ===========================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=net_imobiliaria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_forte_aqui

# ===========================================
# CONFIGURAÇÕES JWT
# ===========================================
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_minimo_32_caracteres
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ===========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Passo 5: Gere Senhas Seguras**

#### **5.1. Gere uma senha forte para o banco**
```bash
npm run generate-password
```

#### **5.2. Gere um JWT secret seguro**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Passo 6: Execute a Aplicação**

#### **6.1. Modo Desenvolvimento**
```bash
npm run dev
```

#### **6.2. Verifique se está funcionando**
- Acesse: `http://localhost:3000`
- Login: `admin` / `admin123`

## 🔍 Verificação da Instalação

### **1. Verificar Dependências**
```bash
npm list --depth=0
```

### **2. Verificar Banco de Dados**
```bash
psql -U postgres -d net_imobiliaria -c "SELECT COUNT(*) FROM users;"
```

### **3. Verificar Aplicação**
```bash
curl http://localhost:3000/api/admin/auth/me
```

## 🚨 Solução de Problemas

### **Erro: "Cannot find module"**
```bash
rm -rf node_modules package-lock.json
npm install
```

### **Erro: "Connection refused" (PostgreSQL)**
```bash
# Verificar se PostgreSQL está rodando
sudo service postgresql status

# Iniciar PostgreSQL
sudo service postgresql start
```

### **Erro: "Port 3000 is in use"**
```bash
# Encontrar processo na porta 3000
netstat -ano | findstr :3000

# Finalizar processo
taskkill /F /PID [PID_NUMBER]
```

### **Erro: "JWT_SECRET is required"**
```bash
# Verificar se .env.local existe
ls -la .env.local

# Verificar conteúdo
cat .env.local | grep JWT_SECRET
```

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run build           # Build para produção
npm run start           # Inicia servidor de produção
npm run lint            # Executa linter

# Banco de Dados
npm run migrate:amenidades  # Migra dados de amenidades
npm run test:auth          # Testa autenticação
npm run test:usuarios      # Testa CRUD de usuários
npm run test:perfis        # Testa API de perfis

# Utilitários
npm run generate-password  # Gera senha segura
npm run clean             # Limpa node_modules e reinstala
```

## 🔐 Credenciais Padrão

### **Usuário Administrador**
- **Username**: `admin`
- **Password**: `admin123`

### **Banco de Dados**
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `net_imobiliaria`
- **User**: `postgres`
- **Password**: `sua_senha_forte_aqui`

## 🌐 URLs Importantes

- **Aplicação**: `http://localhost:3000`
- **Login**: `http://localhost:3000/admin/login`
- **Admin**: `http://localhost:3000/admin`
- **API**: `http://localhost:3000/api`

## 📱 Requisitos do Sistema

### **Mínimos**
- **RAM**: 4GB
- **Disco**: 2GB livres
- **CPU**: Dual-core 2.0GHz

### **Recomendados**
- **RAM**: 8GB+
- **Disco**: 5GB+ livres
- **CPU**: Quad-core 3.0GHz+

## 🆘 Suporte

### **Documentação**
- [README.md](./README.md) - Documentação principal
- [docs/](./docs/) - Documentação técnica detalhada

### **Comandos de Diagnóstico**
```bash
# Verificar versões
node --version
npm --version
psql --version

# Verificar dependências
npm list --depth=0

# Verificar banco
psql -U postgres -d net_imobiliaria -c "\dt"

# Verificar logs
npm run dev 2>&1 | tee logs.txt
```

---

**✅ Instalação Concluída!** 

Agora você pode acessar `http://localhost:3000` e começar a usar a Net Imobiliária! 🚀
