/* eslint-disable */
'use client'

import { Imovel } from '@/lib/types/admin'

interface GeneralDataStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
  finalidades?: any[]
  tipos?: any[]
}

export default function GeneralDataStep({ data, onUpdate, mode, finalidades = [], tipos = [] }: GeneralDataStepProps) {
  console.log('ðŸ” GeneralDataStep - Props recebidas:', {
    dataKeys: Object.keys(data),
    tipo_fk: data.tipo_fk,
    finalidade_fk: data.finalidade_fk,
    finalidadesLength: finalidades.length,
    tiposLength: tipos.length,
    finalidades: finalidades.slice(0, 3), // Primeiros 3 para debug
    tipos: tipos.slice(0, 3) // Primeiros 3 para debug
  })

  const handleInputChange = (field: string, value: any) => {
    console.log('ðŸ” GeneralDataStep - Campo alterado:', field, 'Valor:', value)
    onUpdate({ [field]: value })
  }

  const handleEnderecoChange = (field: string, value: string) => {
    onUpdate({
      endereco: {
        logradouro: data.endereco?.logradouro || '',
        numero: data.endereco?.numero || '',
        complemento: data.endereco?.complemento || '',
        bairro: data.endereco?.bairro || '',
        cidade: data.endereco?.cidade || '',
        estado: data.endereco?.estado || '',
        cep: data.endereco?.cep || '',
        latitude: data.endereco?.latitude,
        longitude: data.endereco?.longitude,
        ...data.endereco,
        [field]: value
      }
    })
  }

  // FunÃ§Ã£o para formatar valores monetÃ¡rios com separaÃ§Ã£o de milhares
  const formatCurrencyValue = (value: string) => {
    // Remove tudo exceto dÃ­gitos e vÃ­rgula
    let cleanValue = value.replace(/[^\d,]/g, '')
    
    // Encontra a posiÃ§Ã£o da vÃ­rgula
    const commaIndex = cleanValue.indexOf(',')
    
    let integerPart = ''
    let decimalPart = ''
    
    if (commaIndex !== -1) {
      // Se hÃ¡ vÃ­rgula, separa as partes
      integerPart = cleanValue.substring(0, commaIndex)
      decimalPart = cleanValue.substring(commaIndex + 1).substring(0, 2) // MÃ¡ximo 2 dÃ­gitos para centavos
    } else {
      // Se nÃ£o hÃ¡ vÃ­rgula, tudo Ã© parte inteira
      integerPart = cleanValue
    }
    
    // Adiciona pontos para separar milhares na parte inteira
    if (integerPart) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    
    // ReconstrÃ³i o valor
    if (decimalPart) {
      return integerPart + ',' + decimalPart
    } else if (commaIndex !== -1) {
      return integerPart + ','
    } else {
      return integerPart
    }
  }

  // FunÃ§Ã£o para formatar Ã¡rea com separaÃ§Ã£o de milhares
  const formatAreaValue = (value: string) => {
    // Remove tudo exceto dÃ­gitos
    const cleanValue = value.replace(/[^\d]/g, '')
    
    // Limita a 5 dÃ­gitos
    const limitedValue = cleanValue.substring(0, 5)
    
    // Formata com pontos para milhares
    return limitedValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // FunÃ§Ã£o para limitar a 2 dÃ­gitos inteiros
  const handleNumericInput = (value: string, maxDigits: number = 2) => {
    const cleanValue = value.replace(/[^\d]/g, '')
    return cleanValue.substring(0, maxDigits)
  }

  // FunÃ§Ã£o para limpar o valor (remover formataÃ§Ã£o) antes de salvar
  const cleanCurrencyValue = (value: string) => {
    return value.replace(/[^\d,]/g, '')
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados Gerais do ImÃ³vel</h2>
        <p className="text-gray-600">
          Preencha as informaÃ§Ãµes bÃ¡sicas sobre o imÃ³vel.
        </p>
      </div>

      {/* Tipo e Finalidade - PRIMEIROS CAMPOS */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Tipo e Finalidade</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo do ImÃ³vel *
            </label>
            <select
              id="tipo"
              value={(data as any).tipo_fk || ''}
              onChange={(e) => handleInputChange('tipo_fk', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione o tipo</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="finalidade" className="block text-sm font-medium text-gray-700 mb-2">
              Finalidade *
            </label>
            <select
              id="finalidade"
              value={(data as any).finalidade_fk || ''}
              onChange={(e) => handleInputChange('finalidade_fk', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione a finalidade</option>
              {finalidades.map((finalidade) => (
                <option key={finalidade.id} value={finalidade.id}>
                  {finalidade.nome.replace('_', ' e ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* InformaÃ§Ãµes BÃ¡sicas */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">InformaÃ§Ãµes BÃ¡sicas</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              TÃ­tulo do ImÃ³vel *
            </label>
            <input
              type="text"
              id="titulo"
              value={data.titulo || ''}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              placeholder="Ex: Apartamento de 3 quartos no Centro"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
              DescriÃ§Ã£o
            </label>
            <textarea
              id="descricao"
              rows={2}
              value={data.descricao || ''}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descreva o imÃ³vel, suas caracterÃ­sticas e diferenciais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Valores</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label htmlFor="preco" className="block text-sm font-medium text-gray-700 mb-2">
              PreÃ§o Principal *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="preco"
                value={data.preco || ''}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  handleInputChange('preco', formattedValue)
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="precoCondominio" className="block text-sm font-medium text-gray-700 mb-2">
              CondomÃ­nio
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="precoCondominio"
                value={data.precoCondominio || ''}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  handleInputChange('precoCondominio', formattedValue)
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="precoIPTU" className="block text-sm font-medium text-gray-700 mb-2">
              IPTU
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="precoIPTU"
                value={data.precoIPTU || ''}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  handleInputChange('precoIPTU', formattedValue)
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="taxaExtra" className="block text-sm font-medium text-gray-700 mb-2">
              Taxa Extra
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="taxaExtra"
                value={data.taxaExtra || ''}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  handleInputChange('taxaExtra', formattedValue)
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ãreas */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Ãreas</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="areaTotal" className="block text-sm font-medium text-gray-700 mb-2">
              Ãrea Total (mÂ²)
            </label>
            <input
              type="text"
              id="areaTotal"
              value={formatAreaValue(String(data.areaTotal || ''))}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^\d]/g, '')
                const limitedValue = cleanValue.substring(0, 5)
                handleInputChange('areaTotal', parseInt(limitedValue) || 0)
              }}
              placeholder="0"
              className="w-24 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          <div>
            <label htmlFor="areaConstruida" className="block text-sm font-medium text-gray-700 mb-2">
              Ãrea ConstruÃ­da (mÂ²)
            </label>
            <input
              type="text"
              id="areaConstruida"
              value={formatAreaValue(String(data.areaConstruida || ''))}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^\d]/g, '')
                const limitedValue = cleanValue.substring(0, 5)
                handleInputChange('areaConstruida', parseInt(limitedValue) || 0)
              }}
              placeholder="0"
              className="w-24 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* CaracterÃ­sticas */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">CaracterÃ­sticas</h3>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          <div>
            <label htmlFor="quartos" className="block text-sm font-medium text-gray-700 mb-2">
              Quartos
            </label>
            <input
              type="text"
              id="quartos"
              value={data.quartos || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('quartos', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="banheiros" className="block text-sm font-medium text-gray-700 mb-2">
              Banheiros
            </label>
            <input
              type="text"
              id="banheiros"
              value={data.banheiros || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('banheiros', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="suites" className="block text-sm font-medium text-gray-700 mb-2">
              SuÃ­tes
            </label>
            <input
              type="text"
              id="suites"
              value={data.suites || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('suites', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="vagasGaragem" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Vagas Garagem
            </label>
            <input
              type="text"
              id="vagasGaragem"
              value={data.vagasGaragem || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('vagasGaragem', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="varanda" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Varanda
            </label>
            <input
              type="text"
              id="varanda"
              value={(data as any).varanda || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('varanda', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="andar" className="block text-sm font-medium text-gray-700 mb-2">
              Andar
            </label>
            <input
              type="text"
              id="andar"
              value={data.andar || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('andar', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="totalAndares" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Total de Andares
            </label>
            <input
              type="text"
              id="totalAndares"
              value={data.totalAndares || ''}
              onChange={(e) => {
                const cleanValue = handleNumericInput(e.target.value, 2)
                handleInputChange('totalAndares', parseInt(cleanValue) || 0)
              }}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>
        </div>

      </div>

      {/* OpÃ§Ãµes */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">OpÃ§Ãµes</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aceitaPermuta"
                checked={(data as any).aceita_permuta || false}
                onChange={(e) => handleInputChange('aceita_permuta', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aceitaPermuta" className="ml-2 block text-sm text-gray-900">
                Aceita Permuta
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aceitaFinanciamento"
                checked={(data as any).aceita_financiamento || false}
                onChange={(e) => handleInputChange('aceita_financiamento', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aceitaFinanciamento" className="ml-2 block text-sm text-gray-900">
                Aceita Financiamento
              </label>
            </div>
          </div>

          <div className="space-y-4">
          </div>
        </div>
      </div>

    </div>
  )
}




