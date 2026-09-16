# 17 Jornada e Funil Específico Imobiliário

> **Funil de Venda/Aluguel, Etapas do Cliente, Proposta Comercial e Gestão de Propostas**

## 1. Funil de Vendas Imobiliário

A jornada do cliente interessado em comprar ou alugar um imóvel é mapeada no CRM através de fases bem definidas:

```mermaid
graph LR
    LeadIn[1. Lead Capturado] --> Qualif[2. Lead Qualificado pela IA]
    Qualif --> Agendamento[3. Visita Agendada ao Imóvel]
    Agendamento --> Visita[4. Visita Realizada]
    Visita --> Proposta[5. Proposta Emita]
    Proposta --> Análise[6. Análise de Crédito / Documentação]
    Análise --> Fechamento[7. Contrato Assinado / Ganho]
```

---

## 2. Emissão de Propostas e Ficha Comercial

* **Proposta Comercial Digital**: Permite ao corretor registrar a proposta do cliente (valor oferecido, forma de pagamento, entrada, financiamento, permuta).
* **Notificação ao Proprietário**: Notifica o proprietário para aceite, recusa ou contraproposta.
* **Geração de PDF (`jspdf`)**: Gera o termo de proposta assinado em PDF com marca d'água da imobiliária.

---

## 3. Gestão de Chaves e Visitas

* **Agendamento com Confirmação SMS/WhatsApp**: Dispara lembretes automáticos para o cliente e para o corretor 2 horas antes da visita.
* **Feedback Pós-Visita**: Registra no CRM a avaliação do cliente sobre o imóvel visitado para orientar o proprietário sobre preço e apresentação.
