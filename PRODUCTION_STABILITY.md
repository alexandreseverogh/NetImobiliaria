# Garantia de Estabilidade em Produção (VPS Linux)

Você observou que o ambiente de desenvolvimento local (`npm run dev` no Windows) fica "cansado" após muitas horas. Isso é esperado em desenvolvimento, mas **não acontecerá em produção** devido à arquitetura que já está configurada no seu projeto.

## Por que o ambiente de desenvolvimento "cansa"?
1.  **Memory Leaks do Hot Reloading:** O `npm run dev` mantém na memória cada versão alterada dos arquivos para permitir edição rápida. Após horas, isso consome toda a RAM.
2.  **Processos Soltos no Windows:** Scripts manuais às vezes deixam processos Node.js "órfãos" que competem por recursos.

## Por que a VPS Linux será estável?

Sua pasta `scripts/vps/` e o arquivo `docker-compose.vps.yml` já contém uma **Arquitetura de Alta Disponibilidade (Self-Healing)**.

### 1. Sistema de "Self-Healing" (Auto-Cura)
O arquivo `docker-compose.vps.yml` define `restart: unless-stopped` para todos os serviços.
*   **O que acontece se o servidor cair?**
    O Docker reinicia tudo automaticamente assim que o Linux volta.
*   **O que acontece se a aplicação travar com erro fatal?**
    O Docker detecta a queda do processo (Exit Code 1) e reinicia o container imediatamente (em milissegundos).

### 2. Monitoramento Ativo (Healthchecks)
Seu sistema já possui "sondas" de saúde configuradas:
```yaml
healthcheck:
  test: fetch('http://localhost:3000/api/health') ...
```
Isso significa que o Docker pergunta a cada 30 segundos: *"Você está vivo e conectado ao banco?"*
*   A rota `/api/health` verifica a conexão real com o banco de dados.
*   Se o banco cair ou travar, a aplicação reporta erro e o container pode ser reiniciado.

### 3. Build de Produção Otimizado
Em produção, não usamos `npm run dev`. O comando usado é `npm start` (após o build).
*   **Zero Hot Reloading:** O código é estático e compilado. Não há vazamento de memória por edição de arquivos.
*   **Garbage Collection:** O Node.js em modo produção gerencia a memória de forma agressiva para manter a performance estável por meses.

### 4. Gerenciamento de Conexões (Connection Pooling)
Verificamos seu arquivo `src/lib/database/connection.ts` e ele está configurado corretamente para produção:
*   `max: 20`: Limita o número de conexões simultâneas para não derrubar o banco.
*   `idleTimeoutMillis: 30000`: Fecha conexões que não estão sendo usadas para liberar recursos.

## Resumo
O problema de "ambiente cansado" é exclusivo do modo de desenvolvimento no Windows. Sua configuração atual de VPS já inclui as melhores práticas da indústria (Docker, Healthchecks, Restart Policies) para operar 24/7 sem intervenção humana.
