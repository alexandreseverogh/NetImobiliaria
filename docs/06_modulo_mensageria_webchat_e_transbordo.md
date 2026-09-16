# 06 Mensageria Webchat Público e Robô de Transbordo

> **Widget de Chat Embutível, Protocolo de Transbordo de Leads, RAG e Contexto de Página**

## 1. Arquitetura do Widget de Chat Público (`ChatWidget.tsx`)

O módulo de mensageria disponibiliza um widget de chat dinâmico que pode ser embarcado tanto na aplicação pública quanto em sites parceiros:

```mermaid
sequenceDiagram
    actor Visitante
    participant Widget as ChatWidget UI
    participant PublicAPI as /api/public/mensageria/chat
    participant RAG as Base de Conhecimento LLM
    participant Transbordo as Fila de Atendimento Humano

    Visitante->>Widget: Digita mensagem inicial
    Widget->>PublicAPI: Envia mensagem + contexto da página (ex: ID do Imóvel / Serviço)
    PublicAPI->>RAG: Processa intent com LLM e base RAG
    alt Atendimento IA
        RAG-->>PublicAPI: Retorna resposta personalizada
        PublicAPI-->>Widget: Exibe mensagem do bot
    else Solicitação de Atendente / Transbordo
        PublicAPI->>Transbordo: Notifica operador humano no CRM
        PublicAPI-->>Widget: Informa que o atendente foi chamado
    end
```

---

## 2. Captura do Contexto da Página

O `ChatWidget` detecta dinamicamente a página em que o visitante se encontra:
* Na página do imóvel (`/imoveis/[id]`): O robô de IA lê a ficha técnica do imóvel no banco de dados e tira dúvidas sobre preço, bairro, quartos e condomínio.
* Em páginas de serviços ou institucionais: O robô utiliza a base de conhecimento geral do `BusinessSegment`.

---

## 3. Rate Limiting e Proteção Antibot

Para impedir abusos e ataques de negação de serviço na API pública de mensageria:
* Implementado **Rate Limit dedicado** com `rate-limiter-flexible` limitando a quantidade de mensagens por IP/minuto.
* Validação de captcha e sanificação de texto contra *prompt injection*.
