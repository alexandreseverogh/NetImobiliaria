# 🗺️ Análise: Visualização de Imóveis em Mapa com Círculos Proporcionais ao Preço

## 📋 OBJETIVO

Criar uma visualização onde:
- **Eixo X/Y:** Localização geográfica (latitude/longitude)
- **Tamanho do círculo:** Proporcional ao preço do imóvel
- **Filtro:** Estado e cidade selecionados pelo usuário
- **Interatividade:** Hover/click para ver detalhes do imóvel

---

## 🎯 BIBLIOTECAS GRATUITAS DISPONÍVEIS

### ✅ **OPÇÃO 1: Leaflet + React-Leaflet** (RECOMENDADA)

**Status:** ✅ Já instalado no projeto (`leaflet: ^1.9.4`)

**Vantagens:**
- ✅ **100% Gratuita** - Open source, sem limites
- ✅ **Já está no projeto** - Não precisa instalar
- ✅ **Muito popular** - Grande comunidade
- ✅ **Suporta círculos customizados** - `L.circle()` com raio variável
- ✅ **Performance excelente** - Leve e rápido
- ✅ **Tiles gratuitos** - OpenStreetMap (sem API key)
- ✅ **React-Leaflet** - Wrapper React oficial

**Como funciona:**
```typescript
// Círculo com tamanho baseado no preço
L.circle([latitude, longitude], {
  radius: calcularRaio(preco), // Função que converte preço em pixels/metros
  color: '#3B82F6',
  fillColor: '#3B82F6',
  fillOpacity: 0.5
}).bindPopup(`Imóvel: R$ ${preco}`)
```

**Instalação adicional necessária:**
```bash
npm install react-leaflet @types/leaflet
```

**Limitações:**
- ⚠️ Círculos em Leaflet são em metros (não pixels), precisa converter preço → metros
- ⚠️ Pode precisar de ajuste fino para visualização ideal

---

### ✅ **OPÇÃO 2: Mapbox GL JS** (GRATUITA COM LIMITES)

**Status:** ❌ Não instalado

**Vantagens:**
- ✅ **Gratuita até 50.000 visualizações/mês** - Suficiente para maioria dos casos
- ✅ **Visualização moderna** - Interface bonita e profissional
- ✅ **Suporta círculos com tamanho variável** - `circle-radius` baseado em propriedade
- ✅ **Performance excelente** - Renderização WebGL
- ✅ **Boa documentação** - Muito bem documentada

**Como funciona:**
```typescript
// Camada de círculos com tamanho baseado em propriedade
{
  id: 'imoveis',
  type: 'circle',
  source: 'imoveis-data',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['get', 'preco'],
      0, 5,      // Preço mínimo = 5px
      1000000, 50 // Preço máximo = 50px
    ],
    'circle-color': '#3B82F6',
    'circle-opacity': 0.6
  }
}
```

**Instalação:**
```bash
npm install mapbox-gl react-map-gl
```

**Limitações:**
- ⚠️ Requer API key (mas gratuita até 50k views/mês)
- ⚠️ Precisa criar conta no Mapbox (gratuita)
- ⚠️ Após 50k views/mês, pode ter custos

---

### ✅ **OPÇÃO 3: Google Maps + React Google Maps** (GRATUITA COM LIMITES)

**Status:** ❌ Não instalado

**Vantagens:**
- ✅ **Gratuita até $200/mês** - Créditos mensais
- ✅ **Muito conhecida** - Familiar para usuários
- ✅ **Suporta círculos customizados** - `google.maps.Circle`
- ✅ **Geocoding incluído** - Busca de endereços

**Como funciona:**
```typescript
new google.maps.Circle({
  center: { lat: latitude, lng: longitude },
  radius: calcularRaio(preco), // metros
  fillColor: '#3B82F6',
  fillOpacity: 0.5,
  strokeColor: '#1E40AF',
  strokeWeight: 2
})
```

**Instalação:**
```bash
npm install @react-google-maps/api
```

**Limitações:**
- ⚠️ Requer API key do Google
- ⚠️ Pode ter custos após créditos gratuitos
- ⚠️ Mais complexa de configurar

---

### ✅ **OPÇÃO 4: Deck.gl** (GRATUITA - UBER OPEN SOURCE)

**Status:** ❌ Não instalado

**Vantagens:**
- ✅ **100% Gratuita** - Open source
- ✅ **Visualizações avançadas** - Círculos, heatmaps, clusters
- ✅ **Performance excelente** - WebGL nativo
- ✅ **Suporta Mapbox ou Google Maps** - Flexível

**Como funciona:**
```typescript
new ScatterplotLayer({
  id: 'imoveis',
  data: imoveis,
  getPosition: d => [d.longitude, d.latitude],
  getRadius: d => calcularRaio(d.preco),
  getFillColor: [59, 130, 246, 150] // RGBA
})
```

**Instalação:**
```bash
npm install deck.gl @deck.gl/react
```

**Limitações:**
- ⚠️ Curva de aprendizado mais íngreme
- ⚠️ Pode ser "overkill" para caso simples

---

## 🎯 RECOMENDAÇÃO FINAL

### **LEAFLET + React-Leaflet** (Opção 1)

**Por quê:**
1. ✅ **Já está instalado** - Não precisa instalar nada novo
2. ✅ **100% Gratuita** - Sem limites, sem API keys
3. ✅ **Simples de implementar** - Documentação clara
4. ✅ **Performance adequada** - Funciona bem para até milhares de imóveis
5. ✅ **OpenStreetMap** - Tiles gratuitos e sem limites

---

## 📐 IMPLEMENTAÇÃO CONCEITUAL

### **Estrutura de Dados:**

**✅ NÃO é necessário criar nova estrutura!** 

A tabela `imoveis` já possui **TODOS** os campos necessários:
- ✅ `id` - ID do imóvel
- ✅ `titulo` - Título do imóvel  
- ✅ `preco` - Preço (para calcular tamanho do círculo)
- ✅ `latitude` - Coordenada latitude (DECIMAL(10,8))
- ✅ `longitude` - Coordenada longitude (DECIMAL(11,8))
- ✅ `tipo_fk` - Tipo do imóvel (via JOIN com `tipos_imovel`)
- ✅ `finalidade_fk` - Finalidade (via JOIN com `finalidades_imovel`)
- ✅ `cidade_fk` - Cidade (para filtro)
- ✅ `estado_fk` - Estado (para filtro)

**Podemos usar diretamente a interface `Imovel` existente** (`src/lib/database/imoveis.ts`):

```typescript
// Opção 1: Usar diretamente a interface existente
import { Imovel } from '@/lib/database/imoveis'

// Opção 2: Criar um tipo mais específico apenas para tipagem do componente
// (mas não é obrigatório, pode usar Imovel diretamente)
type ImovelParaMapa = Pick<Imovel, 
  'id' | 'titulo' | 'preco' | 'latitude' | 'longitude' | 'tipo_fk' | 'finalidade_fk'
> & {
  tipo_nome?: string      // Via JOIN com tipos_imovel
  finalidade_nome?: string // Via JOIN com finalidades_imovel
}
```

**Observação:** A interface `ImovelMapa` mencionada anteriormente era apenas um **exemplo conceitual** para ilustrar quais campos seriam usados. Na prática, **usamos diretamente os dados da tabela `imoveis`** sem necessidade de transformação ou nova estrutura.

**Por que não criar nova estrutura?**
- ❌ **Desnecessário** - Todos os campos já existem
- ❌ **Duplicação** - Criaria redundância de dados
- ❌ **Manutenção** - Mais código para manter
- ✅ **Simplicidade** - Usar diretamente é mais eficiente

### **Função para Calcular Tamanho do Círculo:**

```typescript
function calcularRaioCirculo(preco: number, minPreco: number, maxPreco: number): number {
  // Normalizar preço entre 0 e 1
  const normalizado = (preco - minPreco) / (maxPreco - minPreco)
  
  // Converter para metros (raio mínimo 50m, máximo 500m)
  const raioMinimo = 50  // metros
  const raioMaximo = 500 // metros
  
  return raioMinimo + (normalizado * (raioMaximo - raioMinimo))
}
```

### **Componente React Conceitual:**

```typescript
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import { Imovel } from '@/lib/database/imoveis' // ✅ Usar interface existente!

interface MapaImoveisProps {
  imoveis: Imovel[] // ✅ Usar diretamente a interface Imovel
  estado?: string
  cidade?: string
}

function MapaImoveis({ imoveis, estado, cidade }: MapaImoveisProps) {
  // Filtrar apenas imóveis com coordenadas válidas
  const imoveisComCoordenadas = imoveis.filter(
    i => i.latitude && i.longitude && i.preco
  )
  
  if (imoveisComCoordenadas.length === 0) {
    return <div>Nenhum imóvel com coordenadas encontrado</div>
  }
  
  // Calcular min/max de preço para normalização
  const precos = imoveisComCoordenadas.map(i => i.preco!).filter(Boolean)
  const minPreco = Math.min(...precos)
  const maxPreco = Math.max(...precos)
  
  // Calcular centro do mapa (centroide dos imóveis)
  const centroLat = imoveisComCoordenadas.reduce(
    (sum, i) => sum + (i.latitude || 0), 0
  ) / imoveisComCoordenadas.length
  
  const centroLng = imoveisComCoordenadas.reduce(
    (sum, i) => sum + (i.longitude || 0), 0
  ) / imoveisComCoordenadas.length
  
  return (
    <MapContainer center={[centroLat, centroLng]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {imoveisComCoordenadas.map(imovel => (
        <Circle
          key={imovel.id}
          center={[imovel.latitude!, imovel.longitude!]}
          radius={calcularRaioCirculo(imovel.preco!, minPreco, maxPreco)}
          color="#3B82F6"
          fillColor="#3B82F6"
          fillOpacity={0.5}
        >
          <Popup>
            <div>
              <h3>{imovel.titulo}</h3>
              <p>R$ {imovel.preco!.toLocaleString('pt-BR')}</p>
              {/* tipo_nome e finalidade_nome viriam via JOIN na query SQL */}
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  )
}
```

**Observação importante:** 
- ✅ **Usar diretamente `Imovel`** - Não precisa criar nova interface
- ✅ **Dados vêm direto do banco** - Query SQL retorna `Imovel[]`
- ✅ **Apenas filtrar coordenadas válidas** - Garantir que `latitude` e `longitude` não sejam `null`

---

## 🎨 MELHORIAS VISUAIS POSSÍVEIS

### **1. Cores por Tipo de Imóvel:**
```typescript
const coresPorTipo = {
  'APARTAMENTO': '#3B82F6',  // Azul
  'CASA': '#10B981',         // Verde
  'COBERTURA': '#F59E0B',    // Laranja
  'LOFT': '#8B5CF6'          // Roxo
}
```

### **2. Opacidade por Finalidade:**
```typescript
const opacidade = imovel.finalidade === 'VENDA' ? 0.7 : 0.4
```

### **3. Clustering para Muitos Imóveis:**
- Usar `react-leaflet-cluster` para agrupar imóveis próximos
- Mostrar contador quando há muitos imóveis em uma área

### **4. Legenda de Preços:**
- Mostrar escala visual (círculos pequeno/médio/grande)
- Indicar faixas de preço correspondentes

---

## 📊 COMPARAÇÃO RÁPIDA

| Biblioteca | Gratuita? | Já Instalada? | Complexidade | Performance |
|------------|-----------|---------------|--------------|-------------|
| **Leaflet** | ✅ 100% | ✅ Sim | ⭐⭐ Fácil | ⭐⭐⭐ Boa |
| **Mapbox GL** | ⚠️ 50k/mês | ❌ Não | ⭐⭐⭐ Média | ⭐⭐⭐⭐ Excelente |
| **Google Maps** | ⚠️ $200/mês | ❌ Não | ⭐⭐⭐ Média | ⭐⭐⭐⭐ Excelente |
| **Deck.gl** | ✅ 100% | ❌ Não | ⭐⭐⭐⭐ Difícil | ⭐⭐⭐⭐⭐ Excelente |

---

## 🚀 PRÓXIMOS PASSOS (QUANDO IMPLEMENTAR)

1. **Instalar React-Leaflet:**
   ```bash
   npm install react-leaflet
   ```

2. **Criar componente `MapaImoveis.tsx`**

3. **Criar API para buscar imóveis com coordenadas:**
   ```typescript
   GET /api/public/imoveis/mapa?estado=SP&cidade=São Paulo
   ```

4. **Integrar na página de busca/filtros**

5. **Adicionar controles de zoom e legenda**

---

## 💡 OBSERVAÇÕES IMPORTANTES

1. **Coordenadas obrigatórias:** Imóveis precisam ter `latitude` e `longitude` preenchidos
2. **Geocoding:** Pode precisar geocodificar endereços que não têm coordenadas
3. **Performance:** Para muitos imóveis (>1000), considerar clustering ou paginação
4. **Mobile:** Leaflet funciona bem em mobile, mas pode precisar ajustes de zoom

---

## ✅ CONCLUSÃO

**Recomendação:** Usar **Leaflet + React-Leaflet** porque:
- ✅ Já está instalado
- ✅ 100% gratuito
- ✅ Simples de implementar
- ✅ Adequado para o caso de uso

**Alternativa:** Se precisar de visualização mais avançada no futuro, considerar **Mapbox GL JS** (ainda gratuita até 50k views/mês).

