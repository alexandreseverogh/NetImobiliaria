# 🚀 **SETUP DO BANCO DE DADOS - SISTEMA ROBUSTO**

## **📋 PRÉ-REQUISITOS**

### **1. PostgreSQL Configurado**
- ✅ PostgreSQL instalado e rodando
- ✅ Banco `net_imobiliaria` criado
- ✅ Usuário `postgres` com senha `Roberto@2007`
- ✅ Acesso via `psql` configurado

### **2. Permissões**
- ✅ Usuário `postgres` com permissões de criação de tabelas
- ✅ Extensões `uuid-ossp` e `pgcrypto` disponíveis

---

## **🔧 INSTRUÇÕES DE SETUP**

### **OPÇÃO 1: Setup Automático (Recomendado)**

```bash
# 1. Navegar para a pasta database
cd database

# 2. Executar o script automático
setup_database.bat
```

### **OPÇÃO 2: Setup Manual**

```bash
# 1. Criar as tabelas
psql -h localhost -U postgres -d net_imobiliaria -f "01_create_tables.sql"

# 2. Inserir dados iniciais
psql -h localhost -U postgres -d net_imobiliaria -f "02_seed_initial_data.sql"
```

---

## **📊 VERIFICAÇÃO DA INSTALAÇÃO**

### **1. Verificar Tabelas Criadas**
```sql
-- Conectar ao banco
psql -h localhost -U postgres -d net_imobiliaria

-- Verificar tabelas
\dt

-- Contar tabelas
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
```

### **2. Verificar Dados Iniciais**
```sql
-- Verificar perfis
SELECT * FROM user_roles;

-- Verificar funcionalidades
SELECT COUNT(*) FROM system_features;

-- Verificar permissões
SELECT COUNT(*) FROM permissions;

-- Verificar usuário admin
SELECT username, email, is_active FROM users WHERE username = 'admin';
```

---

## **🎯 DADOS INICIAIS CRIADOS**

### **1. Perfis de Usuário**
- ✅ **Super Admin** (Level 4) - Acesso total + 2FA obrigatório
- ✅ **Administrador** (Level 3) - Acesso total + 2FA obrigatório  
- ✅ **Corretor** (Level 2) - Acesso limitado + 2FA opcional
- ✅ **Usuário Imobiliária** (Level 1) - Acesso básico

### **2. Funcionalidades do Sistema**
- ✅ **Dashboard** - Painel principal
- ✅ **Imóveis** - Gestão completa de propriedades
- ✅ **Proprietários** - Cadastro e gestão
- ✅ **Usuários** - Gestão de usuários + 2FA
- ✅ **Perfis** - Gestão de perfis + 2FA
- ✅ **Funcionalidades** - Gestão dinâmica + 2FA
- ✅ **Auditoria** - Logs e relatórios + 2FA
- ✅ **Configurações** - Configurações gerais + 2FA
- ✅ **Relatórios** - Relatórios e dashboards

### **3. Usuário Administrador Inicial**
- ✅ **Username**: `admin`
- ✅ **Email**: `admin@localhost`
- ✅ **Senha**: `admin123`
- ✅ **Perfil**: Super Admin
- ✅ **2FA**: Configurado (email)

### **4. Configurações 2FA**
- ✅ **Habilitado**: Sim
- ✅ **Código**: 6 dígitos
- ✅ **Expiração**: 10 minutos
- ✅ **Tentativas**: 3 máximo
- ✅ **Obrigatório**: Super Admin, Administrador
- ✅ **Opcional**: Corretor

---

## **📧 CONFIGURAÇÃO DO EMAIL**

### **1. Configurar Gmail SMTP**
```bash
# 1. Copiar arquivo de exemplo
copy env.local.example .env.local

# 2. Editar .env.local com suas credenciais Gmail
# GMAIL_USER=seu_email@gmail.com
# GMAIL_APP_PASSWORD=sua_senha_de_app_do_gmail
```

### **2. Gerar Senha de App do Gmail**
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app para "Net Imobiliária"
3. Use seu email Gmail e a senha de app gerada

---

## **🔍 TROUBLESHOOTING**

### **Erro: "psql não é reconhecido"**
```bash
# Adicionar PostgreSQL ao PATH do Windows
# C:\Program Files\PostgreSQL\15\bin
```

### **Erro: "Falha na conexão"**
```bash
# Verificar se PostgreSQL está rodando
# Verificar credenciais no .env.local
# Testar conexão manual:
psql -h localhost -U postgres -d net_imobiliaria
```

### **Erro: "Tabela já existe"**
```bash
# Limpar banco e executar novamente
psql -h localhost -U postgres -d net_imobiliaria -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

---

## **✅ PRÓXIMOS PASSOS**

Após o setup do banco:

1. **Configurar Gmail SMTP** (.env.local)
2. **Implementar sistema de 2FA**
3. **Criar APIs de autenticação**
4. **Desenvolver interfaces administrativas**

---

## **📞 SUPORTE**

Em caso de problemas:
1. Verificar logs do PostgreSQL
2. Validar permissões do usuário
3. Confirmar configurações do .env.local
4. Testar conexão manual com psql

**🎯 Setup concluído com sucesso! Sistema pronto para desenvolvimento.**



