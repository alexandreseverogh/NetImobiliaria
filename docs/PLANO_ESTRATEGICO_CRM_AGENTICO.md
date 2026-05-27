# Plano Estratégico: CRM Agêntico Multissegmento (NetImobiliária)

## 1. Visão Geral: O Conceito de "Ativez"
O CRM Agêntico não espera por entradas de dados; ele monitora intenções. O sistema utiliza **Agentes Autônomos de IA** que operam sobre um **Dicionário Semântico Universal** para identificar oportunidades, gerar criativos e iniciar negociações sem intervenção humana prévia.

---

## 2. Arquitetura Técnica

### 2.1. O Núcleo Semântico (Evolução)
Para suportar múltiplos segmentos, o atual Dicionário Semântico será expandido com uma camada de **Intenções e Gatilhos**.

*   **Tabela: `system_agent_definitions`**
    *   `agent_name`: (Hunter, Nurturer, Analyst)
    *   `base_persona`: (Texto descrevendo o comportamento e tom de voz)
    *   `allowed_tools`: JSONB (Lista de APIs que o agente pode chamar)
    *   `segment_overrides`: JSONB (Ajustes de comportamento por segmento)

*   **Tabela: `system_intent_mapping` (O "Tradutor" de Sinais)**
    *   `raw_signal_type`: (EX: "IG_LIKE_HASHTAG", "GG_SEARCH_KEYWORD")
    *   `target_tag_key`: (Referência ao Dicionário)
    *   `confidence_weight`: (0.1 a 1.0)

### 2.2. Tecnologias
*   **IA:** Google Gemini 1.5 Pro (Vertex AI).
*   **Imagens:** Stable Diffusion / Canva API.
*   **Mensageria:** WhatsApp Business API (Evolution/Meta).

---

## 3. Fluxo Operacional (O Ciclo da Isca)
1.  **Monitoramento (Percepção):** Varredura de sinais sociais via Dicionário.
2.  **Análise e Score (Predição):** IA define o nível de urgência/intenção.
3.  **Geração da Isca (Criação):** IA gera criativo visual + copy personalizada.
4.  **Ação Proativa (Deploy):** Envio automático via WhatsApp/Social.
5.  **Feedback (Aprendizado):** Ajuste do modelo baseado na mordida do lead.

---

## 4. Matriz de Riscos e Benefícios
| Categoria | Riscos | Benefícios |
| :--- | :--- | :--- |
| **Privacidade** | LGPD e conformidade de dados sociais. | **Antecipação:** Chegar no cliente antes da concorrência. |
| **Qualidade** | Alucinações da IA (preços/imagens). | **Escala:** Prospecção 24/7 sem fadiga. |
| **Reputação** | Risco de ser invasivo (Spam). | **Personalização:** Cada contato é único e relevante. |

---

## 5. Próximos Passos (Pós-Estabilização)
1.  Criação do MVP do Agente Hunter.
2.  Integração com Webhooks de Redes Sociais.
3.  Cockpit de Controle de Agentes no Master Admin.
