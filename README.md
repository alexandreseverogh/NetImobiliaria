# 🏠 Net Imobiliária

**Plataforma completa de gestão imobiliária desenvolvida com Next.js 14, TypeScript e PostgreSQL**

[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.4-blue)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-blue)](https://tailwindcss.com/)

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API](#api)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🎯 Sobre o Projeto

A **Net Imobiliária** é uma plataforma web moderna e responsiva para gestão completa de imóveis, desenvolvida para corretoras e imobiliárias. O sistema oferece uma interface administrativa robusta com autenticação segura, gestão de imóveis, amenidades, proximidades e sistema de imagens integrado.

### ✨ Características Principais

- **Interface Moderna**: Design responsivo com Tailwind CSS
- **Autenticação Segura**: Sistema JWT com refresh tokens
- **Gestão Completa**: CRUD para imóveis, amenidades e proximidades
- **Sistema de Imagens**: Upload e gerenciamento de fotos de imóveis
- **Paginação Inteligente**: Navegação eficiente entre grandes volumes de dados
- **Banco de Dados Robusto**: PostgreSQL com esquema otimizado
- **API RESTful**: Endpoints bem estruturados para integração

## 🚀 Funcionalidades

### 🔐 Sistema de Autenticação
- Login seguro com JWT
- Refresh tokens automáticos
- Middleware de proteção de rotas
- Controle de permissões por cargo

### 🏠 Gestão de Imóveis
- Cadastro completo de imóveis
- Categorização por tipo e status
- Sistema de imagens múltiplas
- Busca e filtros avançados

### 🎯 Amenidades e Proximidades
- Gestão de amenidades do imóvel
- Controle de proximidades (escolas, comércios, etc.)
- Categorização hierárquica
- Paginação otimizada (10 itens por página)

### 📱 Interface Responsiva
- Design mobile-first
- Componentes reutilizáveis
- Navegação intuitiva
- Feedback visual em tempo real

## 🛠️ Tecnologias

### **Frontend**
- **Next.js 14** - Framework React com SSR/SSG
- **TypeScript** - Tipagem estática para JavaScript
- **Tailwind CSS** - Framework CSS utilitário
- **React Hooks** - Gerenciamento de estado funcional

### **Backend**
- **Next.js API Routes** - API RESTful integrada
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação baseada em tokens
- **bcryptjs** - Hash seguro de senhas

### **Ferramentas**
- **ESLint** - Linting de código
- **PostCSS** - Processamento CSS
- **Node.js** - Runtime JavaScript

## 📁 Estrutura do Projeto

```
net-imobiliaria/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── (with-header)/     # Layout com header
│   │   ├── admin/             # Área administrativa
│   │   ├── api/               # API Routes
│   │   └── login/             # Página de login
│   ├── components/            # Componentes React
│   │   ├── admin/            # Componentes administrativos
│   │   ├── Header.tsx        # Cabeçalho principal
│   │   └── PropertyCard.tsx  # Card de imóvel
│   ├── hooks/                # Custom React Hooks
│   ├── lib/                  # Utilitários e configurações
│   │   ├── auth/            # Autenticação JWT
│   │   ├── database/        # Conexões e queries
│   │   └── middleware/      # Middlewares Next.js
│   └── types/               # Definições TypeScript
├── database/                 # Scripts SQL e esquemas
├── scripts/                  # Scripts de automação
├── public/                   # Arquivos estáticos
└── docs/                     # Documentação
```

## ⚙️ Instalação

### **Pré-requisitos**
- Node.js 18+ 
- PostgreSQL 15+
- npm ou yarn

### **1. Clone o repositório**
```bash
git clone https://github.com/alexandreseverogh/net-imobiliaria.git
cd net-imobiliaria
```

### **2. Instale as dependências**
```bash
npm install
```

### **3. Configure o banco de dados**
```bash
# Execute os scripts SQL na ordem:
database/schema.sql
database/seed.sql
```

### **4. Configure as variáveis de ambiente**
```bash
cp env.example .env.local
# Edite .env.local com suas configurações
```

## 🔧 Configuração

### **Variáveis de Ambiente (.env.local)**
```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=net_imobiliaria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_forte

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Configuração do PostgreSQL**
```sql
-- Criar banco de dados
CREATE DATABASE net_imobiliaria;

-- Executar scripts de inicialização
\i database/schema.sql
\i database/seed.sql
```

## 🚀 Uso

### **Desenvolvimento**
```bash
npm run dev
# Acesse: http://localhost:3000
```

### **Build de Produção**
```bash
npm run build
npm start
```

### **Linting e Formatação**
```bash
npm run lint
npm run format
```

## 🔌 API

### **Autenticação**
- `POST /api/admin/auth/login` - Login de usuário
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/auth/me` - Dados do usuário atual

### **Imóveis**
- `GET /api/admin/imoveis` - Listar imóveis
- `POST /api/admin/imoveis` - Criar imóvel
- `PUT /api/admin/imoveis/[id]` - Atualizar imóvel
- `DELETE /api/admin/imoveis/[id]` - Excluir imóvel

### **Amenidades**
- `GET /api/admin/amenidades` - Listar amenidades (com paginação)
- `POST /api/admin/amenidades` - Criar amenidade
- `PUT /api/admin/amenidades/[id]` - Atualizar amenidade
- `DELETE /api/admin/amenidades/[id]` - Excluir amenidade

### **Proximidades**
- `GET /api/admin/proximidades` - Listar proximidades (com paginação)
- `POST /api/admin/proximidades` - Criar proximidade
- `PUT /api/admin/proximidades/[id]` - Atualizar proximidade
- `DELETE /api/admin/proximidades/[id]` - Excluir proximidade

## 👥 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### **Padrões de Código**
- Use TypeScript para todos os arquivos
- Siga as convenções do ESLint
- Escreva testes para novas funcionalidades
- Documente APIs e componentes

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Suporte

- **Issues**: [GitHub Issues](https://github.com/alexandreseverogh/net-imobiliaria/issues)
- **Documentação**: [Wiki do Projeto](https://github.com/alexandreseverogh/net-imobiliaria/wiki)
- **Email**: [seu-email@exemplo.com]

## 🙏 Agradecimentos

- **Next.js Team** - Framework incrível
- **Vercel** - Deploy e hospedagem
- **Tailwind CSS** - Sistema de design
- **PostgreSQL** - Banco de dados robusto

---

**Desenvolvido com ❤️ pela equipe Net Imobiliária**

*Última atualização: Janeiro 2025*

