# 📊 RESUMO DE FUNCIONALIDADES - NET IMOBILIÁRIA
## Duas Macro Funções Sinérgicas: Público (Landpaging) e Interno (Admin)

**Data:** 2025-01-24  
**Versão:** 2.0  
**Status:** ✅ Em Produção

---

## 🎯 VISÃO GERAL ARQUITETURAL

O sistema Net Imobiliária opera com **duas macro funções sinérgicas** que compartilham dados e funcionalidades:

### **1. 🌐 ÁREA PÚBLICA (Landpaging)**
- **Acesso:** Público, sem necessidade de login (exceto funcionalidades específicas)
- **Objetivo:** Exposição de imóveis para compra/aluguel
- **Público-alvo:** Clientes e proprietários interessados em imóveis
- **URL Base:** `/landpaging`

### **2. 🔐 ÁREA ADMINISTRATIVA (Admin)**
- **Acesso:** Restrito, requer autenticação via login
- **Objetivo:** Gestão completa do sistema imobiliário
- **Público-alvo:** Administradores, corretores e gestores
- **URL Base:** `/admin`

---

## 🌐 MACRO ÁREA 1: ACESSO PÚBLICO (LANDPAGING)

### **1.1. VISUALIZAÇÃO DE IMÓVEIS**

#### **Landing Page Principal (`/landpaging`)**
- ✅ **Hero Section** com busca rápida
- ✅ **Grid de Imóveis em Destaque** (DV = Comprar / DA = Alugar)
- ✅ **Paginação** de imóveis (20 por página)
- ✅ **Destaques Nacionais** (opção para visualizar)
- ✅ **Cards de Imóveis** com informações essenciais:
  - Imagem principal
  - Título e código
  - Preço formatado (BRL)
  - Localização (Estado, Cidade, Bairro)
  - Características (Quartos, Banheiros, Suítes, Garagens, Área)

#### **Sistema de Filtros Avançados**
- ✅ **Filtro por Operação:** Comprar (DV) / Alugar (DA)
- ✅ **Filtro por Estado:** Dropdown com todos os estados
- ✅ **Filtro por Cidade:** Dropdown dinâmico baseado no estado selecionado
- ✅ **Filtro por Bairro:** Campo de texto livre
- ✅ **Filtro por Tipo de Imóvel:** Dropdown com tipos cadastrados
- ✅ **Filtro por Finalidade:** Dropdown com finalidades
- ✅ **Filtro por Preço:** Mínimo e máximo
- ✅ **Filtro por Quartos:** Mínimo
- ✅ **Filtro por Banheiros:** Mínimo
- ✅ **Filtro por Suítes:** Mínimo
- ✅ **Filtro por Vagas de Garagem:** Mínimo
- ✅ **Filtro por Área Total:** Mínimo
- ✅ **Grid Overlay:** Exibe resultados filtrados sobrepostos ao grid de destaque
- ✅ **Paginação de Resultados:** 20 imóveis por página

#### **Geolocalização Automática**
- ✅ **Detecção de Localização:** Via IP do usuário
- ✅ **Modal de Geolocalização:** Solicita permissão do usuário
- ✅ **Filtro Automático:** Aplica filtro de cidade baseado na localização detectada
- ✅ **Fallback:** Continua funcionando se geolocalização falhar

#### **Ficha Completa do Imóvel**
- ✅ **Visualização Detalhada:** Todos os dados do imóvel
- ✅ **Galerias de Imagens:** Visualização de todas as imagens
- ✅ **Vídeo do Imóvel:** Player de vídeo integrado (se disponível)
- ✅ **Documentos:** Download de documentos públicos (se disponíveis)
- ✅ **Informações Completas:**
  - Dados gerais (preço, área, características)
  - Amenidades agrupadas por categoria
  - Proximidades com distâncias
  - Localização completa (endereço, CEP, coordenadas)

### **1.2. AUTENTICAÇÃO PÚBLICA**

#### **Cadastro de Clientes**
- ✅ **Formulário de Cadastro:** Nome, CPF, Email, Telefone, Senha
- ✅ **Validação de CPF:** Verificação de duplicidade
- ✅ **Validação de Email:** Verificação de duplicidade
- ✅ **Validação de Senha:** Mínimo de caracteres e complexidade
- ✅ **Sistema 2FA:** Código de verificação por email (opcional)
- ✅ **Armazenamento:** Tabela `clientes` com UUID como chave primária

#### **Cadastro de Proprietários**
- ✅ **Formulário de Cadastro:** Nome, CPF, Email, Telefone, Senha
- ✅ **Validação de CPF:** Verificação de duplicidade
- ✅ **Validação de Email:** Verificação de duplicidade
- ✅ **Sistema 2FA:** Código de verificação por email (opcional)
- ✅ **Armazenamento:** Tabela `proprietarios` com UUID como chave primária

#### **Login Público**
- ✅ **Login por Email/CPF:** Aceita email ou CPF como identificador
- ✅ **Validação de Senha:** Verificação com bcrypt
- ✅ **Sistema 2FA:** Código de verificação por email (quando habilitado)
- ✅ **Tokens JWT:** Geração de access token e refresh token
- ✅ **Sessão Persistente:** Armazenamento no localStorage

#### **Área "Meu Perfil" (Logado)**
- ✅ **Visualização de Dados:** Nome, CPF, Email, Telefone, Endereço
- ✅ **Edição de Perfil:** Atualização de dados pessoais
- ✅ **Validação de CEP:** Busca automática de endereço via API
- ✅ **Formatação Automática:** CPF, Telefone, CEP
- ✅ **Debounce de Email:** Validação de duplicidade em tempo real
- ✅ **Meus Imóveis:** Listagem de imóveis do proprietário (se aplicável)

### **1.3. INTERESSE EM IMÓVEIS (PROSPECTS)**

#### **Sistema de Interesse**
- ✅ **Formulário "Tenho Interesse":** Modal com campos:
  - Telefone (obrigatório)
  - Preferência de Contato (Telefone, Email, Ambos)
  - Mensagem (opcional)
- ✅ **Registro de Interesse:** Salva em `imovel_prospects`
- ✅ **Notificação por Email:** Envio automático para `alexandreseverog@gmail.com`
- ✅ **Template de Email:** HTML profissional com todos os dados do imóvel e cliente
- ✅ **Validação:** Requer login para registrar interesse

### **1.4. APIS PÚBLICAS (`/api/public/*`)**

#### **Autenticação**
- `POST /api/public/auth/register` - Cadastro de clientes/proprietários
- `POST /api/public/auth/login` - Login público
- `GET /api/public/auth/profile` - Dados do perfil logado
- `PUT /api/public/auth/profile` - Atualização de perfil
- `GET /api/public/auth/meus-imoveis` - Lista imóveis do proprietário

#### **Validações**
- `POST /api/public/check-cpf` - Verifica disponibilidade de CPF
- `POST /api/public/check-email` - Verifica disponibilidade de email

#### **Imóveis**
- `GET /api/public/imoveis/destaque` - Lista imóveis em destaque (DV/DA)
- `GET /api/public/imoveis/pesquisa` - Busca avançada com filtros
- `GET /api/public/imoveis/filtros` - Retorna opções de filtros disponíveis
- `GET /api/public/imoveis/[id]/ficha-completa` - Ficha completa do imóvel
- `GET /api/public/imoveis/[id]/video` - Vídeo do imóvel
- `GET /api/public/imoveis/[id]/documentos/[documentoId]` - Download de documento

#### **Interesse**
- `POST /api/public/imoveis/prospects` - Registrar interesse em imóvel

#### **Geolocalização**
- `GET /api/public/geolocation` - Detecta localização via IP

---

## 🔐 MACRO ÁREA 2: ACESSO ADMINISTRATIVO (ADMIN)

### **2.1. AUTENTICAÇÃO E SEGURANÇA**

#### **Login Administrativo**
- ✅ **Login por Username/Email:** Identificação do usuário
- ✅ **Validação de Senha:** Verificação com bcrypt
- ✅ **Sistema 2FA Obrigatório:** Para Super Admin e Admin (configurável por perfil)
- ✅ **Tokens JWT:** Access token e refresh token
- ✅ **Renovação de Sessão:** Automática antes de expirar
- ✅ **Rate Limiting:** Proteção contra brute force (5 tentativas/15min)

#### **Gestão de Sessões**
- ✅ **Visualização de Sessões Ativas:** Lista todas as sessões do usuário
- ✅ **Revogação de Sessões:** Encerrar sessões específicas ou todas
- ✅ **Monitoramento:** IP, User-Agent, última atividade

#### **Logs de Segurança**
- ✅ **Logs de Login:** Sucesso e falha
- ✅ **Logs de Auditoria:** Todas as ações administrativas
- ✅ **Alertas de Segurança:** Tentativas suspeitas
- ✅ **Análise de Logs:** Dashboards e relatórios
- ✅ **Arquivamento:** Logs antigos arquivados
- ✅ **Purga:** Limpeza de logs antigos

### **2.2. GESTÃO DE USUÁRIOS E PERMISSÕES**

#### **CRUD de Usuários**
- ✅ **Criar Usuário:** Nome, username, email, senha, perfis
- ✅ **Listar Usuários:** Grid com filtros e paginação
- ✅ **Editar Usuário:** Atualização de dados e perfis
- ✅ **Excluir Usuário:** Com proteções especiais
- ✅ **Ativar/Desativar:** Controle de acesso
- ✅ **Gestão de 2FA:** Habilitar/desabilitar por usuário

#### **Sistema de Perfis (Roles)**
- ✅ **CRUD de Perfis:** Criar, editar, excluir perfis
- ✅ **Hierarquia de Níveis:** 4 níveis (Super Admin, Admin, Corretor, Usuário)
- ✅ **Configuração de 2FA:** Por perfil (obrigatório/opcional)
- ✅ **Clonagem de Perfis:** Duplicar perfis existentes
- ✅ **Atribuição de Usuários:** Associar usuários a perfis

#### **Sistema de Permissões Granular**
- ✅ **5 Níveis de Permissão:**
  - `ADMIN` (nível 6) - Controle total
  - `DELETE` (nível 5) - Excluir registros
  - `UPDATE` (nível 4) - Editar registros
  - `CREATE` (nível 3) - Criar novos registros
  - `EXECUTE` (nível 2) - Executar ações (dashboards, relatórios)
  - `READ` (nível 1) - Apenas visualizar
- ✅ **Permissões por Recurso:** Baseadas em `system_features.slug`
- ✅ **Matriz de Permissões:** Interface visual para configurar
- ✅ **Bulk Operations:** Operações em lote para permissões
- ✅ **Validação Hierárquica:** Usuário não pode editar mesmo nível ou superior

#### **Sistema de Funcionalidades**
- ✅ **CRUD de Funcionalidades:** Criar, editar, excluir funcionalidades
- ✅ **Categorização:** Agrupar funcionalidades por categoria
- ✅ **Slugs Únicos:** Identificação única de recursos
- ✅ **Tipo CRUD/EXECUTE:** Define se cria 4 ou 1 permissão
- ✅ **Sidebar Dinâmica:** Menu gerado automaticamente do banco

### **2.3. GESTÃO DE IMÓVEIS**

#### **CRUD Completo de Imóveis**
- ✅ **Criar Imóvel:** Wizard em 5 etapas:
  1. **Localização:** Endereço, CEP, Estado, Município, Bairro
  2. **Dados Gerais:** Título, descrição, tipo, finalidade, valores, áreas, características
  3. **Amenidades:** Seleção por categoria com busca
  4. **Proximidades:** Seleção por categoria com distâncias
  5. **Mídia:** Upload de imagens (até 10), vídeos (até 66s), documentos
- ✅ **Editar Imóvel:** Sistema de rascunho para edições seguras
- ✅ **Listar Imóveis:** Grid responsivo com filtros avançados
- ✅ **Visualizar Imóvel:** Ficha completa com todas as informações
- ✅ **Excluir Imóvel:** Com confirmação e proteções

#### **Sistema de Rascunho**
- ✅ **Rascunho Automático:** Salva alterações temporariamente
- ✅ **Confirmação de Mudanças:** Requer confirmação antes de salvar
- ✅ **Cancelamento:** Descartar alterações sem perder dados originais
- ✅ **Preview de Alterações:** Visualizar mudanças antes de confirmar
- ✅ **Suporte a Vídeos:** Rascunho de vídeos com preview

#### **Gestão de Mídia**
- ✅ **Upload de Imagens:** Até 10 imagens por imóvel
- ✅ **Seleção de Imagem Principal:** Uma imagem marcada como principal
- ✅ **Upload de Vídeos:** Máximo 66 segundos, 50MB
- ✅ **Upload de Documentos:** Por tipo de documento
- ✅ **Preview de Mídia:** Visualização antes de salvar
- ✅ **Remoção de Mídia:** Com confirmação

#### **Histórico de Status**
- ✅ **Mudanças de Status:** Registro de todas as alterações
- ✅ **Rastreamento:** Quem mudou, quando e motivo
- ✅ **Visualização:** Histórico completo por imóvel

#### **Destaque de Imóveis**
- ✅ **Marcar como Destaque:** Para exibição na landing pública
- ✅ **Tipos de Destaque:** DV (Comprar) e DA (Alugar)
- ✅ **Destaque Nacional:** Opção para destaque em todo o país

### **2.4. GESTÃO DE CATÁLOGOS**

#### **Tipos de Imóveis**
- ✅ **CRUD Completo:** Criar, editar, excluir tipos
- ✅ **Validação:** Nomes únicos

#### **Finalidades**
- ✅ **CRUD Completo:** Criar, editar, excluir finalidades
- ✅ **Configuração Landpaging:** Flags `vender_landpaging` e `alugar_landpaging`
- ✅ **Validação:** Nomes únicos

#### **Status de Imóveis**
- ✅ **CRUD Completo:** Criar, editar, excluir status
- ✅ **Status Padrão:** Status "Ativo" (ID: 1) para novos imóveis
- ✅ **Validação:** Nomes únicos

#### **Tipos de Documentos**
- ✅ **CRUD Completo:** Criar, editar, excluir tipos
- ✅ **Validação:** Nomes únicos

### **2.5. GESTÃO DE AMENIDADES**

#### **Categorias de Amenidades**
- ✅ **CRUD Completo:** Criar, editar, excluir categorias
- ✅ **Personalização:** Ícone, cor, ordem
- ✅ **Validação:** Nomes únicos

#### **Amenidades**
- ✅ **CRUD Completo:** Criar, editar, excluir amenidades
- ✅ **Associação a Categorias:** Cada amenidade pertence a uma categoria
- ✅ **Marcação Popular:** Flag para amenidades mais usadas
- ✅ **Ordenação:** Ordem dentro da categoria
- ✅ **Validação:** Nomes únicos dentro da categoria

### **2.6. GESTÃO DE PROXIMIDADES**

#### **Categorias de Proximidades**
- ✅ **CRUD Completo:** Criar, editar, excluir categorias
- ✅ **Personalização:** Ícone, cor, ordem
- ✅ **Validação:** Nomes únicos

#### **Proximidades**
- ✅ **CRUD Completo:** Criar, editar, excluir proximidades
- ✅ **Associação a Categorias:** Cada proximidade pertence a uma categoria
- ✅ **Marcação Popular:** Flag para proximidades mais usadas
- ✅ **Ordenação:** Ordem dentro da categoria
- ✅ **Validação:** Nomes únicos dentro da categoria

### **2.7. GESTÃO DE CLIENTES E PROPRIETÁRIOS**

#### **CRUD de Clientes**
- ✅ **Criar Cliente:** Nome, CPF, Email, Telefone, Endereço
- ✅ **Listar Clientes:** Grid com filtros e paginação
- ✅ **Editar Cliente:** Atualização de dados
- ✅ **Excluir Cliente:** Com confirmação
- ✅ **Validação de CPF:** Verificação de duplicidade
- ✅ **Validação de Email:** Verificação de duplicidade

#### **CRUD de Proprietários**
- ✅ **Criar Proprietário:** Nome, CPF, Email, Telefone, Endereço
- ✅ **Listar Proprietários:** Grid com filtros e paginação
- ✅ **Editar Proprietário:** Atualização de dados
- ✅ **Excluir Proprietário:** Com confirmação
- ✅ **Validação de CPF:** Verificação de duplicidade
- ✅ **Validação de Email:** Verificação de duplicidade

### **2.8. DASHBOARDS E RELATÓRIOS**

#### **Dashboards do Sistema**
- ✅ **Dashboard Principal:** Métricas gerais do sistema
- ✅ **Dashboard de Imóveis:** Estatísticas por tipo, finalidade, status, área, preço, quartos, estado
- ✅ **Dashboard de Clientes/Proprietários:** Estatísticas por estado
- ✅ **Dashboard de Auditoria:** Ações do sistema
- ✅ **Dashboard de Login:** Perfis de login, tentativas

#### **Relatórios**
- ✅ **Exportação de Dados:** CSV, Excel
- ✅ **Filtros Avançados:** Por período, tipo, status
- ✅ **Análise de Logs:** Relatórios de segurança

### **2.9. APIS ADMINISTRATIVAS (`/api/admin/*`)**

#### **Autenticação**
- `POST /api/admin/auth/login` - Login administrativo
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/auth/me` - Dados do usuário logado
- `POST /api/admin/auth/refresh` - Renovar token
- `POST /api/admin/auth/renew-session` - Renovar sessão
- `GET /api/admin/auth/session-info` - Informações da sessão
- `POST /api/admin/auth/2fa/send-code` - Enviar código 2FA
- `POST /api/admin/auth/2fa/verify-code` - Verificar código 2FA
- `POST /api/admin/auth/2fa/enable` - Habilitar 2FA
- `POST /api/admin/auth/2fa/disable` - Desabilitar 2FA
- `GET /api/admin/auth/2fa/status` - Status do 2FA

#### **Usuários**
- `GET /api/admin/usuarios` - Listar usuários
- `POST /api/admin/usuarios` - Criar usuário
- `GET /api/admin/usuarios/[id]` - Buscar usuário
- `PUT /api/admin/usuarios/[id]` - Editar usuário
- `DELETE /api/admin/usuarios/[id]` - Excluir usuário
- `PUT /api/admin/usuarios/[id]/status` - Ativar/desativar
- `POST /api/admin/usuarios/[id]/assign-role` - Atribuir perfil
- `POST /api/admin/usuarios/[id]/remove-role` - Remover perfil
- `POST /api/admin/usuarios/[id]/2fa` - Gestão de 2FA

#### **Perfis (Roles)**
- `GET /api/admin/roles` - Listar perfis
- `POST /api/admin/roles` - Criar perfil
- `GET /api/admin/roles/[id]` - Buscar perfil
- `PUT /api/admin/roles/[id]` - Editar perfil
- `DELETE /api/admin/roles/[id]` - Excluir perfil
- `POST /api/admin/roles/[id]/clone` - Clonar perfil
- `GET /api/admin/roles/[id]/permissions` - Permissões do perfil
- `PUT /api/admin/roles/[id]/permissions` - Atualizar permissões
- `GET /api/admin/roles/[id]/users` - Usuários do perfil
- `POST /api/admin/roles/[id]/toggle-2fa` - Alternar 2FA
- `POST /api/admin/roles/[id]/toggle-active` - Ativar/desativar

#### **Permissões**
- `GET /api/admin/permissions` - Listar permissões
- `POST /api/admin/permissions` - Criar permissão
- `GET /api/admin/permissions/[id]` - Buscar permissão
- `PUT /api/admin/permissions/[id]` - Editar permissão
- `POST /api/admin/permissions/[id]/2fa` - Configurar 2FA

#### **Funcionalidades**
- `GET /api/admin/system-features` - Listar funcionalidades
- `POST /api/admin/system-features` - Criar funcionalidade
- `GET /api/admin/system-features/[id]` - Buscar funcionalidade
- `PUT /api/admin/system-features/[id]` - Editar funcionalidade
- `DELETE /api/admin/system-features/[id]` - Excluir funcionalidade

#### **Imóveis**
- `GET /api/admin/imoveis` - Listar imóveis
- `POST /api/admin/imoveis` - Criar imóvel
- `GET /api/admin/imoveis/[id]` - Buscar imóvel
- `PUT /api/admin/imoveis/[id]` - Editar imóvel
- `DELETE /api/admin/imoveis/[id]` - Excluir imóvel
- `GET /api/admin/imoveis/[id]/amenidades` - Amenidades do imóvel
- `PUT /api/admin/imoveis/[id]/amenidades` - Atualizar amenidades
- `GET /api/admin/imoveis/[id]/proximidades` - Proximidades do imóvel
- `PUT /api/admin/imoveis/[id]/proximidades` - Atualizar proximidades
- `GET /api/admin/imoveis/[id]/imagens` - Imagens do imóvel
- `POST /api/admin/imoveis/[id]/imagens` - Adicionar imagem
- `DELETE /api/admin/imoveis/[id]/imagens/[imageId]` - Remover imagem
- `PUT /api/admin/imoveis/[id]/imagem-principal` - Definir imagem principal
- `GET /api/admin/imoveis/[id]/documentos` - Documentos do imóvel
- `POST /api/admin/imoveis/[id]/documentos` - Adicionar documento
- `DELETE /api/admin/imoveis/[id]/documentos/[documentoId]` - Remover documento
- `GET /api/admin/imoveis/[id]/video` - Vídeo do imóvel
- `POST /api/admin/imoveis/[id]/video` - Adicionar vídeo
- `DELETE /api/admin/imoveis/[id]/video` - Remover vídeo
- `GET /api/admin/imoveis/[id]/video/preview` - Preview do vídeo
- `GET /api/admin/imoveis/[id]/rascunho` - Buscar rascunho
- `POST /api/admin/imoveis/[id]/rascunho` - Criar rascunho
- `PUT /api/admin/imoveis/[id]/rascunho` - Atualizar rascunho
- `DELETE /api/admin/imoveis/[id]/rascunho` - Excluir rascunho
- `POST /api/admin/imoveis/[id]/rascunho/confirmar` - Confirmar rascunho
- `GET /api/admin/imoveis/[id]/historico-status` - Histórico de status
- `POST /api/admin/imoveis/[id]/restore` - Restaurar versão anterior

#### **Amenidades**
- `GET /api/admin/amenidades` - Listar amenidades
- `POST /api/admin/amenidades` - Criar amenidade
- `GET /api/admin/amenidades/[slug]` - Buscar amenidade
- `PUT /api/admin/amenidades/[slug]` - Editar amenidade
- `DELETE /api/admin/amenidades/[slug]` - Excluir amenidade

#### **Categorias de Amenidades**
- `GET /api/admin/categorias-amenidades` - Listar categorias
- `POST /api/admin/categorias-amenidades` - Criar categoria
- `GET /api/admin/categorias-amenidades/[id]` - Buscar categoria
- `PUT /api/admin/categorias-amenidades/[id]` - Editar categoria
- `DELETE /api/admin/categorias-amenidades/[id]` - Excluir categoria

#### **Proximidades**
- `GET /api/admin/proximidades` - Listar proximidades
- `POST /api/admin/proximidades` - Criar proximidade
- `GET /api/admin/proximidades/[slug]` - Buscar proximidade
- `PUT /api/admin/proximidades/[slug]` - Editar proximidade
- `DELETE /api/admin/proximidades/[slug]` - Excluir proximidade

#### **Categorias de Proximidades**
- `GET /api/admin/categorias-proximidades` - Listar categorias
- `POST /api/admin/categorias-proximidades` - Criar categoria
- `GET /api/admin/categorias-proximidades/[id]` - Buscar categoria
- `PUT /api/admin/categorias-proximidades/[id]` - Editar categoria
- `DELETE /api/admin/categorias-proximidades/[id]` - Excluir categoria

#### **Clientes**
- `GET /api/admin/clientes` - Listar clientes
- `POST /api/admin/clientes` - Criar cliente
- `GET /api/admin/clientes/[id]` - Buscar cliente
- `PUT /api/admin/clientes/[id]` - Editar cliente
- `DELETE /api/admin/clientes/[id]` - Excluir cliente
- `POST /api/admin/clientes/verificar-cpf` - Verificar CPF
- `POST /api/admin/clientes/verificar-email` - Verificar email

#### **Proprietários**
- `GET /api/admin/proprietarios` - Listar proprietários
- `POST /api/admin/proprietarios` - Criar proprietário
- `GET /api/admin/proprietarios/[id]` - Buscar proprietário
- `PUT /api/admin/proprietarios/[id]` - Editar proprietário
- `DELETE /api/admin/proprietarios/[id]` - Excluir proprietário
- `POST /api/admin/proprietarios/verificar-cpf` - Verificar CPF
- `POST /api/admin/proprietarios/verificar-email` - Verificar email

#### **Dashboards**
- `GET /api/admin/dashboards/imoveis-por-tipo` - Estatísticas por tipo
- `GET /api/admin/dashboards/imoveis-por-finalidade` - Estatísticas por finalidade
- `GET /api/admin/dashboards/imoveis-por-status` - Estatísticas por status
- `GET /api/admin/dashboards/imoveis-por-estado` - Estatísticas por estado
- `GET /api/admin/dashboards/imoveis-por-area` - Estatísticas por área
- `GET /api/admin/dashboards/imoveis-por-faixa-preco` - Estatísticas por preço
- `GET /api/admin/dashboards/imoveis-por-quartos` - Estatísticas por quartos
- `GET /api/admin/dashboards/clientes-proprietarios-estado` - Estatísticas de clientes/proprietários
- `GET /api/admin/dashboards/login-profiles` - Estatísticas de login
- `GET /api/admin/dashboards/audit-actions` - Estatísticas de auditoria

#### **Logs e Auditoria**
- `GET /api/admin/login-logs` - Logs de login
- `GET /api/admin/login-logs/archived` - Logs arquivados
- `POST /api/admin/login-logs/purge` - Limpar logs
- `GET /api/admin/audit` - Logs de auditoria
- `GET /api/admin/security-monitor` - Monitoramento de segurança

#### **Sessões**
- `GET /api/admin/sessions` - Listar sessões
- `GET /api/admin/sessions/[id]` - Buscar sessão
- `DELETE /api/admin/sessions/[id]` - Revogar sessão
- `POST /api/admin/sessions/bulk-revoke` - Revogar múltiplas sessões

---

## 🔄 SINERGIA ENTRE AS ÁREAS

### **Compartilhamento de Dados**
- ✅ **Imóveis:** Mesma tabela `imoveis` usada por ambas as áreas
- ✅ **Clientes/Proprietários:** Cadastrados na área pública, gerenciados na admin
- ✅ **Catálogos:** Tipos, finalidades, status compartilhados
- ✅ **Amenidades/Proximidades:** Mesmas categorias e itens

### **Fluxos Integrados**
- ✅ **Cadastro Público → Gestão Admin:** Clientes/proprietários cadastrados publicamente aparecem na área admin
- ✅ **Cadastro Admin → Exibição Pública:** Imóveis cadastrados na admin aparecem na landing (se ativos e em destaque)
- ✅ **Interesse Público → Notificação Admin:** Interesses registrados geram emails para administradores

### **Segurança Compartilhada**
- ✅ **2FA Unificado:** Mesmo sistema de 2FA para ambas as áreas
- ✅ **Validações Compartilhadas:** CPF, Email validados da mesma forma
- ✅ **Logs Unificados:** Logs de autenticação compartilhados

---

## 📊 RESUMO ESTATÍSTICO

### **Área Pública (Landpaging)**
- **Páginas:** 1 principal + área logada
- **APIs Públicas:** ~15 endpoints
- **Funcionalidades Principais:** 4 módulos (Visualização, Autenticação, Interesse, Geolocalização)

### **Área Administrativa (Admin)**
- **Páginas:** ~30+ páginas administrativas
- **APIs Administrativas:** ~100+ endpoints
- **Funcionalidades Principais:** 9 módulos (Autenticação, Usuários, Imóveis, Catálogos, Amenidades, Proximidades, Clientes/Proprietários, Dashboards, Logs)

---

## 🎯 CONCLUSÃO

O sistema Net Imobiliária opera com **duas macro funções sinérgicas**:

1. **🌐 Área Pública:** Focada em exposição e captação, sem necessidade de login para visualização básica
2. **🔐 Área Administrativa:** Focada em gestão completa, com acesso restrito e sistema robusto de permissões

Ambas as áreas compartilham dados e funcionalidades, criando um ecossistema integrado e eficiente para gestão imobiliária.

---

**Documento gerado seguindo GUARDIAN_RULES.md**  
**Última atualização:** 2025-01-24  
**Status:** ✅ Completo e atualizado







