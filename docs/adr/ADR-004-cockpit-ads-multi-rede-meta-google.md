# ADR-004: Cockpit Ads Multi-Rede (Meta & Google)

* **Status**: Aceito
* **Data**: 2026-05-15
* **Decisores**: Equipe de Marketing e Engenharia

## Contexto
Permitir a gestão unificada de anúncios pagos do Meta Ads (Facebook/Instagram) e Google Ads (Search/PMax) sem obrigar o cliente a usar duas plataformas separadas.

## Decisão
Construir um **Cockpit de Ads em 3 Camadas** com um adaptador multi-rede unificado e regras automáticas de otimização (SCALE, KILL, Negativação).

## Consequências
* **Positivas**: Centralização de métricas, cálculo unificado de CPL/ROAS e sugestões inteligentes de melhoria com aprovação em 1 clique.
* **Negativas**: Manutenção de adaptadores para as constantes atualizações das APIs do Meta e Google Ads.
