# 🧠 PADRÃO DE COGNIÇÃO (MUITI-SEGMENTO)

Este guia define como a Inteligência Artificial deve traduzir a linguagem natural dos leads em parâmetros técnicos dentro da Fundação v5.1.

---

## 1. O FLUXO DE TRADUÇÃO
1.  **Entrada (Input)**: Texto bruto do lead (WhatsApp, Landing Page, Social).
2.  **Identificação (Cognição I.A.)**: Extraçâo de intenções baseada em categorias pré-definidas (Segment Manager).
3.  **Tagueamento (Tag_Cognicao JSONB)**: Salvando os objetos de intenção com seus pesos (Relevância).
4.  **Mapeamento (Active Logic)**: Consultando o "Mapa Cognitivo" (Database) para encontrar itens que correspondam àquelas intenções.

---

## 2. FORMATO DO OBJETO `tag_cognicao` (JSONB)
Todo lead deve ter um objeto JSONB contendo:
```json
{
  "segment": "imoveis",
  "intents": [
    { "tag": "perto_de_escolas", "score": 0.95, "reasoning": "Lead mencionou filhos estudando." },
    { "tag": "venda_imediata", "score": 0.80, "reasoning": "Lead demonstrou pressa no atendimento." }
  ],
  "filters": {
    "proximity_type": "escola",
    "urgency": "high"
  }
}
```

---

## 3. AS REGRAS DE BUSCA SEMÂNTICA
Cada `tag` em um segmento deve mapear para:
*   **Tabela Alvo**: Onde o dado será buscado.
*   **Coluna Alvo**: Qual campo do estoque contém a informação.
*   **Operador**: Como comparar o dado (Ex: `LIKE`, `RadiusSearch`, `Range`).

---

## 4. O QUE NÃO PODE ACONTECER (RESTRIÇÕES)
*   Nunca salvar tags que não estejam cadastradas no "Gerenciador de Segmentos".
*   Nunca sobrescrever tags manuais do vendedor com tags automatizadas da IA sem permissão explícita.
*   Nunca degradar a performance de busca ao lidar com múltiplos contextos (Tenants).
