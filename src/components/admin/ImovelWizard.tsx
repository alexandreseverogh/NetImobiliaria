'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Imovel } from '@/lib/types/admin'
import LocationStep from './wizard/LocationStep'
import GeneralDataStep from './wizard/GeneralDataStep'
import AmenidadesStep from './wizard/AmenidadesStep'
import ProximidadesStep from './wizard/ProximidadesStep'
import MediaStep from './wizard/MediaStep'

interface ImovelWizardProps {
  initialData?: Partial<Imovel>
  onSave: (data: Imovel) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
  loading?: boolean
  finalidadesImovel?: any[]
  tiposImovel?: any[]
  statusImovel?: any[]
  registrarAlteracaoRascunho?: (tipo: 'imagem' | 'documento', acao: 'adicionar' | 'remover', id: string) => Promise<void>
  registrarVideoAlteracaoRascunho?: (acao: 'adicionar' | 'remover', dados?: any) => Promise<void>
  substituirVideoRascunho?: (novosDados: any) => Promise<void>
  registrarImagemPrincipalRascunho?: (imageId: string) => Promise<void>
  rascunho?: any // Dados do rascunho para verificar alterações pendentes
  redirectTo?: string // URL para redirecionar após salvar (opcional)
  successRedirectTo?: string // URL para redirecionar após salvar (fluxos especiais, ex.: portal do corretor)
  finalidadePreSelecionada?: boolean // Indica se a finalidade foi pré-selecionada (vem da página pública)
  onlyMineProprietarios?: boolean // No Step 2, limitar proprietários ao corretor logado (fluxo do portal do corretor)
}

interface WizardStep {
  id: number
  title: string
  description: string
  component: React.ComponentType<any>
  isValid: (data: any) => boolean
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (typeof a !== typeof b) return false

  if (a === null || b === null) return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

export default function ImovelWizard({ 
  initialData = {}, 
  onSave, 
  onCancel, 
  mode, 
  loading = false,
  finalidadesImovel = [],
  tiposImovel = [],
  statusImovel = [],
  registrarAlteracaoRascunho,
  registrarVideoAlteracaoRascunho,
  substituirVideoRascunho,
  registrarImagemPrincipalRascunho,
  rascunho,
  redirectTo,
  successRedirectTo,
  finalidadePreSelecionada = false,
  onlyMineProprietarios = false
}: ImovelWizardProps) {
  console.log('🔍 ImovelWizard - COMPONENTE INICIADO - mode:', mode, 'initialData:', initialData)
  console.log('🔍 ImovelWizard - TESTE SIMPLES - 1, 2, 3')
  console.log('🔍 ImovelWizard - initialData.video:', initialData?.video)
  console.log('🔍 ImovelWizard - TESTE SIMPLES - 1, 2, 3')
  
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Imovel>>(() => {
    console.log('🔍 ImovelWizard - useState inicial - initialData:', initialData)
    console.log('🔍 ImovelWizard - useState inicial - initialData.video:', initialData?.video)
    return initialData
  })
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [createdImovel, setCreatedImovel] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [cepValidation, setCepValidation] = useState<{ valid: boolean; message?: string | null }>({ valid: false, message: null })
  
  // Modal de boas-vindas para cadastramento público
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Mostrar modal apenas se for acesso público (redirectTo definido) e modo criação
    return !!(redirectTo && mode === 'create')
  })
  
  // Ref para rastrear se já inicializamos o formData com initialData
  const initialDataAppliedRef = useRef(false)
  
  useEffect(() => {
    console.log('🟩 [ImovelWizard] CEP validation state changed:', cepValidation)
  }, [cepValidation])
  
  const totalSteps = 5
  
  // Log para debug do formData inicial
  console.log('🔍 ImovelWizard - formData inicial:', {
    hasVideo: !!formData.video,
    videoId: formData.video?.id,
    videoNomeArquivo: formData.video?.nome_arquivo,
    formDataKeys: Object.keys(formData),
    initialDataKeys: initialData ? Object.keys(initialData) : 'no initialData'
  })
  
  // Log para debug do formData a cada renderização
  console.log('🔍 ImovelWizard - RENDERIZAÇÃO - formData.video:', formData.video)
  console.log('🔍 ImovelWizard - RENDERIZAÇÃO - formData completo:', formData)
  
  // Log para debug do currentStep
  console.log('🔍 ImovelWizard - currentStep:', currentStep, 'totalSteps:', totalSteps)

  // Atualizar formData quando initialData mudar (modo de edição) - PADRÃO BACKUP
  // IMPORTANTE: Em modo de criação, só aplicar initialData uma vez no início
  // Isso evita sobrescrever dados já preenchidos quando initialData contém apenas finalidade_fk pré-selecionada
  useEffect(() => {
    if (mode === 'edit' && Object.keys(initialData).length > 0) {
      // Em modo de edição, sempre atualizar com initialData
      setFormData(initialData)
    } else if (mode === 'create' && Object.keys(initialData).length > 0 && !initialDataAppliedRef.current) {
      // Em modo de criação, aplicar initialData apenas uma vez no início
      // Usar ref para evitar aplicar múltiplas vezes
      initialDataAppliedRef.current = true
      setFormData(prev => {
        // Se prev já tem finalidade_fk, não sobrescrever
        // Caso contrário, adicionar finalidade_fk do initialData preservando o resto
        if (prev.finalidade_fk) {
          return prev
        }
        // Adicionar finalidade_fk preservando todos os outros dados
        return { ...prev, finalidade_fk: initialData.finalidade_fk }
      })
    }
  }, [initialData, mode])
  
  // NUNCA resetar formData após ele ter sido preenchido
  // Este useEffect só deve executar uma vez no início

  // REMOVIDO: useEffect duplicado que estava causando loop
  // O vídeo já é copiado no useEffect principal acima

  // Monitorar mudanças no formData para debug - REMOVIDO TEMPORARIAMENTE PARA EVITAR LOOP
  // useEffect(() => {
  //   console.log('🔍 ImovelWizard - formData mudou:', {
  //     hasVideo: !!formData.video,
  //     videoId: formData.video?.id,
  //     videoNomeArquivo: formData.video?.nome_arquivo,
  //     formDataKeys: Object.keys(formData)
  //   })
  // }, [formData.video?.id])

  // Log do formData para debug - removido para evitar loop infinito

  // Removido useEffect duplicado - o vídeo já é preservado no useEffect acima

  // Definir os passos do wizard
  const steps: WizardStep[] = useMemo(() => ([
    {
      id: 1,
      title: 'Localização',
      description: 'Estado e município do imóvel',
      component: LocationStep,
      isValid: (data) => {
        const endereco = data.endereco || {}

        const filled = (value: any) => {
          if (typeof value === 'string') {
            return value.trim().length > 0
          }
          if (typeof value === 'number') {
            return !Number.isNaN(value)
          }
          return false
        }

        const estado = filled(endereco.estado)
        const cidade = filled(endereco.cidade)
        const numero = filled(endereco.numero)
        const bairro = filled(endereco.bairro)
        const logradouro = filled(endereco.endereco)
        const cepValido = cepValidation.valid

        const validEndereco = estado && cidade && numero && (bairro || logradouro) && cepValido

        console.log('🔍 Validação Step 1 (com CEP):', {
          endereco,
          estado,
          cidade,
          bairro,
          logradouro,
          numero,
          cepValido,
          cepValidation,
          validEndereco
        })

        return validEndereco
      }
    },
    {
      id: 2,
      title: 'Dados Gerais',
      description: 'Informações básicas do imóvel',
      component: GeneralDataStep,
      isValid: (data) => {
        // Converter finalidade_fk para número se necessário (pode vir como string do select)
        const finalidadeFk = data.finalidade_fk 
          ? (typeof data.finalidade_fk === 'string' ? Number(data.finalidade_fk) : data.finalidade_fk)
          : null
        
        const isValid = !!(data.titulo && data.tipo_fk && finalidadeFk && data.preco)
        console.log('🔍 Validação Step 2:', { 
          titulo: data.titulo, 
          tipo_fk: data.tipo_fk, 
          finalidade_fk: data.finalidade_fk,
          finalidadeFkConvertido: finalidadeFk,
          preco: data.preco,
          isValid 
        })
        return isValid
      }
    },
    {
      id: 3,
      title: 'Comodidades',
      description: 'Comodidades do imóvel',
      component: AmenidadesStep,
      isValid: () => true // Amenidades são opcionais
    },
    {
      id: 4,
      title: 'Proximidades',
      description: 'Pontos de interesse próximos',
      component: ProximidadesStep,
      isValid: () => true // Proximidades são opcionais
    },
    {
      id: 5,
      title: 'Mídia',
      description: 'Imagens e documentos',
      component: MediaStep,
      isValid: () => true // Mídia é opcional
    }
  ]), [cepValidation])

  const currentStepData = steps.find(step => step.id === currentStep)
  const CurrentStepComponent = currentStepData?.component

  type ImovelFormData = Partial<Imovel> & { video?: any }

  const updateFormData = (newData: Partial<Imovel>) => {
    console.log('🔍 ImovelWizard - updateFormData chamado com:', newData)
    console.log('🔍 ImovelWizard - updateFormData - newData.video:', newData.video)
    console.log('🔍 ImovelWizard - updateFormData - newData.video?.arquivo:', newData.video?.arquivo)
    console.log('🔍 ImovelWizard - updateFormData - newData.video?.arquivo é File?', newData.video?.arquivo instanceof File)

    let mergedData: Partial<Imovel> | null = null

    setFormData((prev) => {
      const hasChanges = Object.keys(newData).some((key) => {
        const typedKey = key as keyof Imovel
        return !deepEqual(prev[typedKey], newData[typedKey])
      })

      if (!hasChanges) {
        return prev
      }

      const updatedData = { ...prev, ...newData }
      mergedData = updatedData
      console.log('🔍 ImovelWizard - updateFormData - ANTES do setFormData - updatedData.video:', updatedData.video)
      return updatedData
    })

    if (mergedData) {
      const mergedWithVideo = mergedData as ImovelFormData
      // Gerar código automaticamente se todos os campos necessários estiverem preenchidos
      generateCodigo(mergedWithVideo)

      // Log para debug do vídeo
      if (newData.video !== undefined) {
        console.log('🔍 ImovelWizard - updateFormData vídeo:', {
          newDataVideo: newData.video,
          updatedDataVideo: mergedWithVideo.video,
          hasVideo: !!mergedWithVideo.video,
          videoId: mergedWithVideo.video?.id,
          videoNomeArquivo: mergedWithVideo.video?.nome_arquivo,
          videoArquivo: mergedWithVideo.video?.arquivo,
          videoArquivoIsFile: mergedWithVideo.video?.arquivo instanceof File
        })
      }
    }
  }

  const generateCodigo = (data: Partial<Imovel>) => {
    console.log('🔍 generateCodigo - mode:', mode)
    console.log('🔍 generateCodigo - data:', data)
    
    // No modo de edição, não gerar código - apenas usar o existente
    if (mode === 'edit') {
      console.log('🔍 generateCodigo - Modo edição: usando código existente')
      return
    }
    
    // No modo de criação, gerar código automaticamente
    if (mode === 'create' && data.tipo_fk && data.finalidade_fk) {
      console.log('🔍 generateCodigo - Modo criação: gerando código')
      
      // Buscar descrições dos tipos e finalidades
      const tipo = tiposImovel.find(t => t.id === data.tipo_fk)
      const finalidade = finalidadesImovel.find(f => f.id === data.finalidade_fk)
      
      console.log('🔍 generateCodigo - tipo encontrado:', tipo)
      console.log('🔍 generateCodigo - finalidade encontrada:', finalidade)
      
      if (tipo && finalidade) {
        // Gerar código: [Finalidade]_[Tipo]_[Status]_[ID]
        const id = `TEMP_${Date.now()}`
        
        const codigo = `${finalidade.nome}_${tipo.nome}_ATIVO_${id}`
          .replace(/\s+/g, '') // Remover espaços
          .replace(/[^A-Z0-9_]/g, '') // Manter apenas letras maiúsculas, números e underscore
          .toUpperCase()
        
        console.log('🔍 generateCodigo - código gerado:', codigo)
        setFormData(prev => ({ ...prev, codigo }))
      }
    }
  }

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
      setCurrentStep(stepNumber)
    }
  }

  const isStepCompleted = (stepNumber: number) => {
    const step = steps.find(s => s.id === stepNumber)
    return step ? step.isValid(formData) : false
  }

  const isCurrentStepValid = () => {
    return currentStepData ? currentStepData.isValid(formData) : false
  }

  const canProceed = () => {
    return isCurrentStepValid() && currentStep < totalSteps
  }

  const canSave = () => {
    // Verificar campos essenciais do Step 1 (sem exigir numero para salvar)
    // O número será validado pelo backend se o CEP for alterado
    const step1Valid = !!(formData.endereco?.estado && formData.endereco?.cidade)
    
    // Verificar se Step 2 está válido
    const step2Valid = steps[1].isValid(formData)
    
    // Verificar se dados de referência estão carregados
    const hasFinalidades = finalidadesImovel && finalidadesImovel.length > 0
    const hasTipos = tiposImovel && tiposImovel.length > 0
    
    // Verificar se não está salvando
    const notSaving = !isSaving
    
    const isValid = step1Valid && step2Valid && hasFinalidades && hasTipos && notSaving
    
    // Debug apenas se houver problema
    if (!isValid) {
      console.log('🔍 Validação de salvamento falhou:', {
        step1Valid,
        step2Valid,
        hasFinalidades,
        hasTipos,
        notSaving,
        estado: formData.endereco?.estado,
        cidade: formData.endereco?.cidade,
        titulo: formData.titulo,
        tipo_fk: formData.tipo_fk,
        finalidade_fk: formData.finalidade_fk,
        preco: formData.preco
      })
    }
    
    return isValid
  }

  const handleSave = async () => {
    console.log('🟡 [WIZARD] handleSave chamado - isSaving:', isSaving)
    
    if (isSaving) {
      console.log('❌ Já está salvando, ignorando chamada')
      return
    }
    
    console.log('🟡 [WIZARD] Verificando canSave...')
    const canSaveResult = canSave()
    console.log('🟡 [WIZARD] canSave result:', canSaveResult)
    
    // Validar proprietario_uuid antes de salvar
    if (!formData.proprietario_uuid || formData.proprietario_uuid === null || formData.proprietario_uuid === undefined || formData.proprietario_uuid === '') {
      console.error('❌ [WIZARD] proprietario_uuid não preenchido:', formData.proprietario_uuid)
      alert('Por favor, selecione um proprietário antes de salvar o imóvel.')
      return
    }
    
    if (canSaveResult) {
      setIsSaving(true)
      console.log('🟡 [WIZARD] Salvando imóvel...')
      console.log('🟡 [WIZARD] formData COMPLETO:', formData)
      console.log('🟡 [WIZARD] formData.proprietario_uuid:', formData.proprietario_uuid)
      console.log('🟡 [WIZARD] formData.endereco:', formData.endereco)
      console.log('🟡 [WIZARD] formData.endereco.numero:', formData.endereco?.numero)
      console.log('🟡 [WIZARD] Tipo do numero:', typeof formData.endereco?.numero)
      
      try {
        // Converter para string para comparação (evita problemas de tipo)
        const finalidade = finalidadesImovel.find(f => String(f.id) === String(formData.finalidade_fk))
        const tipo = tiposImovel.find(t => String(t.id) === String(formData.tipo_fk))
        
        // PRESERVAR status_fk original em modo de edição
        let status
        if (mode === 'edit') {
          // Em modo de edição, preservar o status_fk original do initialData
          const originalStatusId = initialData.status
          status = statusImovel.find(s => s.id === originalStatusId) || { id: 1, nome: 'ATIVO' }
          console.log('🔍 Modo edição - Preservando status_fk original:', originalStatusId, '->', status.nome)
        } else {
          // Em modo de criação, sempre usar status_id = 1
          status = { id: 1, nome: 'ATIVO' }
          console.log('🔍 Modo criação - Usando status padrão:', status.nome)
        }
        
        if (!finalidade || !tipo || !status) {
          console.error('❌ Dados insuficientes para gerar código')
          return
        }
        
        // Gerar código temporário único (será atualizado após salvar)
        const finalidadeNome = finalidade.nome || 'FINALIDADE'
        const tipoNome = tipo.nome || 'TIPO'
        const statusNome = status.nome || 'ATIVO'
        
        const codigoTemp = `${finalidadeNome}_${tipoNome}_${statusNome}_TEMP_${Date.now()}`
          .replace(/\s+/g, '') // Remover espaços
          .replace(/[^A-Za-z0-9_]/g, '') // Manter letras (maiúsculas e minúsculas), números e underscore
          .toUpperCase()
        
        // PRESERVAR status_fk original em modo de edição
        const dataToSave = { 
          ...formData, 
          codigo: codigoTemp,
          // Preservar status_fk original em modo de edição
          ...(mode === 'edit' && { status_fk: initialData.status })
        }
        
        console.log('🟡 [WIZARD] dataToSave COMPLETO antes de chamar onSave:', dataToSave)
        console.log('🟡 [WIZARD] dataToSave.endereco:', dataToSave.endereco)
        console.log('🟡 [WIZARD] dataToSave.endereco.numero:', dataToSave.endereco?.numero)
        
        await onSave(dataToSave as Imovel)
        console.log('✅ Imóvel salvo!')
        
        // Verificar se veio da página pública
        const fromPublic = typeof window !== 'undefined' && sessionStorage.getItem('imovelCreatedFromPublic') === 'true'
        
        if (fromPublic && redirectTo) {
          // Se veio da pública, redirecionar diretamente sem mostrar popup
          console.log('🔄 Redirecionando para página pública:', redirectTo)
          window.location.href = redirectTo
        } else {
          // Se veio da admin, mostrar popup de sucesso
          setCreatedImovel({ id: Date.now(), codigo: codigoTemp })
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error('❌ Erro ao salvar imóvel:', error)
        console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
        alert('Erro ao salvar imóvel: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
      } finally {
        setIsSaving(false)
      }
    } else {
      console.log('❌ canSave retornou false, não salvando')
      console.log('❌ Dados atuais:', formData)
    }
  }

  // Atualizar passos completados quando os dados mudam
  useEffect(() => {
    const completed = steps
      .filter(step => {
        if (step.id <= 2) {
          return step.isValid(formData)
        }
        return step.id < currentStep
      })
      .map(step => step.id)

    setCompletedSteps(prev => {
      if (prev.length === completed.length && prev.every((value, index) => value === completed[index])) {
        return prev
      }
      return completed
    })
  }, [formData, currentStep, steps])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de Boas-Vindas para Cadastramento Público */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all animate-fadeIn">
            {/* Header do Modal com gradiente */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Bem-vindo ao Cadastro de Imóvel
                  </h2>
                </div>
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
                  aria-label="Fechar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="px-8 py-6">
              <div className="space-y-5 text-gray-700">
                <p className="text-base leading-relaxed">
                  Para cadastrar o seu imóvel, você percorrerá <span className="font-semibold text-blue-600">5 etapas simples e objetivas</span>, contendo algumas informações obrigatórias assinaladas com um <span className="text-red-500 font-bold">(*)</span>. Ao completar cada uma delas, você estará contribuindo para que o seu anúncio tenha mais força, alcance e destaque dentro da plataforma.
                </p>

                <p className="text-base leading-relaxed">
                  Cada detalhe informado nos ajuda a apresentar o seu imóvel da forma mais profissional possível. Nas etapas de <span className="font-semibold text-blue-600">Atrativos</span> e <span className="font-semibold text-blue-600">Proximidade</span>, dedique-se a preencher tudo com cuidado e sinceridade. Informações claras, completas e verdadeiras tornam o seu anúncio muito mais competitivo — aumentando o interesse de potenciais compradores e locatários e favorecendo uma impressão positiva desde o primeiro contato.
                </p>

                <p className="text-base leading-relaxed">
                  Capriche também no envio das fotos: você pode fazer upload de até <span className="font-semibold text-blue-600">10 imagens em alta qualidade</span> e escolher aquela que representará o imóvel na lista principal de resultados. Boas fotos, somadas às informações corretas, potencializam a visibilidade do seu anúncio e aumentam as chances de venda ou locação em menos tempo.
                </p>
              </div>

              {/* Botão de Fechar */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Entendi, vamos começar!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' ? 'Novo Imóvel' : 'Editar Imóvel'}
          </h1>
          <p className="mt-2 text-gray-600">
            {mode === 'create' 
              ? 'Preencha as informações do novo imóvel em 5 etapas'
              : 'Atualize as informações do imóvel'
            }
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, stepIdx) => (
                <li key={step.id} className="relative">
                  <div className="flex items-center">
                    <button
                      onClick={() => goToStep(step.id)}
                      className={`group relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        currentStep === step.id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : completedSteps.includes(step.id)
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 bg-white text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {completedSteps.includes(step.id) ? (
                        <CheckIcon className="w-6 h-6" />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </button>
                    
                    {stepIdx < steps.length - 1 && (
                      <div className={`ml-4 w-full h-0.5 ${
                        completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {CurrentStepComponent && (
              <>
                {console.log('🔍 ImovelWizard - Renderizando CurrentStepComponent:', {
                  currentStep,
                  hasVideo: !!formData.video,
                  videoId: formData.video?.id,
                  videoNomeArquivo: formData.video?.nome_arquivo,
                  formDataKeys: Object.keys(formData),
                  videoKeys: formData.video ? Object.keys(formData.video) : 'no video'
                })}
              </>
            )}
            {CurrentStepComponent && (
              <>
                {console.log('🔍 ImovelWizard - PASSANDO DADOS PARA MediaStep:', {
                  formDataVideo: formData.video,
                  formDataVideoId: formData.video?.id,
                  formDataVideoNomeArquivo: formData.video?.nome_arquivo,
                  formDataKeys: Object.keys(formData),
                  formDataVideoKeys: formData.video ? Object.keys(formData.video) : 'no video'
                })}
                <CurrentStepComponent
                  data={formData}
                  onUpdate={updateFormData}
                  onCepValidationChange={setCepValidation}
                mode={mode}
                finalidades={finalidadesImovel}
                tipos={tiposImovel}
                statusImovel={statusImovel}
                imovelId={mode === 'edit' ? formData.id : undefined}
                registrarAlteracaoRascunho={registrarAlteracaoRascunho}
                registrarVideoAlteracaoRascunho={registrarVideoAlteracaoRascunho}
                substituirVideoRascunho={substituirVideoRascunho}
                registrarImagemPrincipalRascunho={registrarImagemPrincipalRascunho}
                rascunho={rascunho}
                finalidadePreSelecionada={finalidadePreSelecionada}
                onlyMineProprietarios={onlyMineProprietarios}
              />
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={currentStep === 1 ? onCancel : goToPreviousStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              {currentStep === 1 ? 'Cancelar' : 'Anterior'}
            </button>

            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRightIcon className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!canSave() || loading || isSaving}
                  className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || isSaving ? 'Salvando...' : mode === 'create' ? 'Cadastrar Imóvel' : 'Salvar Alterações'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Progresso: {currentStep} de {totalSteps} etapas concluídas
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Etapa {currentStep} de {totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Sucesso */}
      {showSuccessPopup && createdImovel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            {/* Ícone de sucesso */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Título */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Sucesso!
            </h3>
            
            {/* Mensagem */}
            <p className="text-gray-600 text-center mb-4">
              Imóvel cadastrado com sucesso
            </p>
            
            {/* Código do imóvel */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-500 text-center mb-1">Código do imóvel:</p>
              <p className="text-lg font-mono font-semibold text-gray-900 text-center">
                {createdImovel.codigo}
              </p>
            </div>
            
            {/* Botões */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSuccessPopup(false)
                  if (successRedirectTo) {
                    window.location.href = successRedirectTo
                  }
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowSuccessPopup(false)
                  // Se houver redirectTo definido, redirecionar para landpaging
                  if (redirectTo) {
                    window.location.href = redirectTo
                  } else if (successRedirectTo) {
                    window.location.href = successRedirectTo
                  } else if (onCancel) {
                    // Usar o onCancel padrão (admin)
                    onCancel()
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {mode === 'create' ? 'Voltar à Lista' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


