# 16 Geoprocessamento, Amenidades e Portais

> **Localização Espacial, Filtros por Raio/Bairro, Amenidades/Proximidades e Carga para Portais Imobiliários**

## 1. Geoprocessamento e Busca por Mapa (`Leaflet` / `react-leaflet`)

A plataforma conta com motor de busca geográfica para posicionamento preciso de imóveis no mapa:

* **Geocodificação Automática de CEP**: Converte o CEP informado em coordenadas de latitude e longitude.
* **Busca por Raio e Polígono**: Permite ao visitante buscar imóveis em um raio de X quilômetros ou desenhar uma área no mapa.
* **Privacidade de Endereço**: Permite ocultar o número exato da rua nas buscas públicas mantendo apenas o raio aproximado ou bairro.

---

## 2. Estrutura de Amenidades e Proximidades

A classificação de diferenciais do imóvel utiliza tabelas relacionais dedicadas (`imobiliaria.Amenidade` e `imobiliaria.Proximidade`):

* **Amenidades do Imóvel**: Piscina privativa, churrasqueira, varanda gourmet, ar condicionado, armários planejados.
* **Amenidades do Condomínio**: Portaria 24h, academia, salão de festas, elevador, quadra poliesportiva.
* **Proximidades**: Escolas, hospitais, estações de metrô, supermercados, praias e parques.

---

## 3. Integração e Exportação para Portais Imobiliários

O sistema gera arquivos XML/JSON no padrão dos principais portais imobiliários do Brasil (ZAP Imóveis, VivaReal, OLX, Imovelweb):
* **Agendamento de Carga (`feed-cron-scheduler.js`)**: Sincronização periódica dos imóveis ativos.
* **De-para de Categorias**: Mapeamento automático dos tipos de imóveis locais para os padrões aceitos por cada portal.
