/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
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
  registrarImagemPrincipalRascunho?: (imageId: string) => Promise<void>
  rascunho?: any // Dados do rascunho para verificar alteraÃ§Ãµes pendentes
}

interface WizardStep {
  id: number
  title: string
  description: string
  component: React.ComponentType<any>
  isValid: (data: any) => boolean
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
  registrarImagemPrincipalRascunho,
  rascunho
}: ImovelWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Imovel>>(initialData)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [createdImovel, setCreatedImovel] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const totalSteps = 5

  // Atualizar formData quando initialData mudar (modo de ediÃ§Ã£o)
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData(initialData)
    }
  }, [initialData])

  // Definir os passos do wizard
  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'LocalizaÃ§Ã£o',
      description: 'Estado e municÃ­pio do imÃ³vel',
      component: LocationStep,
      isValid: (data) => {
        const isValid = !!(data.endereco?.estado && data.endereco?.cidade)
        console.log('ðŸ” ValidaÃ§Ã£o Step 1:', { 
          estado: data.endereco?.estado, 
          cidade: data.endereco?.cidade, 
          isValid 
        })
        return isValid
      }
    },
    {
      id: 2,
      title: 'Dados Gerais',
      description: 'InformaÃ§Ãµes bÃ¡sicas do imÃ³vel',
      component: GeneralDataStep,
      isValid: (data) => !!(data.titulo && data.tipo_fk && data.finalidade_fk && data.preco)
    },
    {
      id: 3,
      title: 'Comodidades',
      description: 'Comodidades do imÃ³vel',
      component: AmenidadesStep,
      isValid: () => true // Amenidades sÃ£o opcionais
    },
    {
      id: 4,
      title: 'Proximidades',
      description: 'Pontos de interesse prÃ³ximos',
      component: ProximidadesStep,
      isValid: () => true // Proximidades sÃ£o opcionais
    },
    {
      id: 5,
      title: 'MÃ­dia',
      description: 'Imagens e documentos',
      component: MediaStep,
      isValid: () => true // MÃ­dia Ã© opcional
    }
  ]

  const currentStepData = steps.find(step => step.id === currentStep)
  const CurrentStepComponent = currentStepData?.component

  const updateFormData = (newData: Partial<Imovel>) => {
    const updatedData = { ...formData, ...newData }
    setFormData(updatedData)
    
    // Gerar cÃ³digo automaticamente se todos os campos necessÃ¡rios estiverem preenchidos
    generateCodigo(updatedData)
  }

  const generateCodigo = (data: Partial<Imovel>) => {
    // Verificar se todos os campos necessÃ¡rios estÃ£o preenchidos
    if (data.tipo_fk && data.finalidade_fk && data.endereco?.estado && 
        data.endereco?.cidade && data.endereco?.bairro && data.id) {
      
      // Buscar descriÃ§Ãµes dos tipos e finalidades
      const tipo = tiposImovel.find(t => t.id === data.tipo_fk)
      const finalidade = finalidadesImovel.find(f => f.id === data.finalidade_fk)
      
      if (tipo && finalidade) {
        // Gerar cÃ³digo: [Tipo] + [Finalidade] + [Estado] + [Cidade] + [Bairro] + [ID]
        const codigo = `${tipo.nome}_${finalidade.nome}_${data.endereco.estado}_${data.endereco.cidade}_${data.endereco.bairro}_${data.id}`
          .replace(/\s+/g, '') // Remover espaÃ§os
          .replace(/[^A-Z0-9_]/g, '') // Manter apenas letras maiÃºsculas, nÃºmeros e underscore
          .toUpperCase()
        
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
    // Verificar se todos os passos obrigatÃ³rios estÃ£o vÃ¡lidos
    const step1Valid = steps[0].isValid(formData)
    const step2Valid = steps[1].isValid(formData)
    
    // Verificar se dados de referÃªncia estÃ£o carregados
    const hasFinalidades = finalidadesImovel && finalidadesImovel.length > 0
    const hasTipos = tiposImovel && tiposImovel.length > 0
    
    // Verificar se nÃ£o estÃ¡ salvando
    const notSaving = !isSaving
    
    const isValid = step1Valid && step2Valid && hasFinalidades && hasTipos && notSaving
    
    // Debug apenas se houver problema
    if (!isValid) {
      console.log('ðŸ” ValidaÃ§Ã£o falhou:', {
        step1Valid,
        step2Valid,
        hasFinalidades,
        hasTipos,
        notSaving,
        titulo: formData.titulo,
        tipo_fk: formData.tipo_fk,
        finalidade_fk: formData.finalidade_fk,
        preco: formData.preco
      })
    }
    
    return isValid
  }

  const handleSave = async () => {
    if (isSaving) return
    
    if (canSave()) {
      setIsSaving(true)
      console.log('ðŸ” Salvando imÃ³vel...')
      
      try {
        // Converter para string para comparaÃ§Ã£o (evita problemas de tipo)
        const finalidade = finalidadesImovel.find(f => String(f.id) === String(formData.finalidade_fk))
        const tipo = tiposImovel.find(t => String(t.id) === String(formData.tipo_fk))
        const status = { id: 1, nome: 'ATIVO' } // Sempre status_id = 1
        
        if (!finalidade || !tipo || !status) {
          console.error('âŒ Dados insuficientes para gerar cÃ³digo')
          return
        }
        
        // Gerar cÃ³digo temporÃ¡rio Ãºnico (serÃ¡ atualizado apÃ³s salvar)
        const finalidadeNome = finalidade.nome || 'FINALIDADE'
        const tipoNome = tipo.nome || 'TIPO'
        const statusNome = status.nome || 'ATIVO'
        
        const codigoTemp = `${finalidadeNome}_${tipoNome}_${statusNome}_TEMP_${Date.now()}`
          .replace(/\s+/g, '') // Remover espaÃ§os
          .replace(/[^A-Za-z0-9_]/g, '') // Manter letras (maiÃºsculas e minÃºsculas), nÃºmeros e underscore
          .toUpperCase()
        
        const dataToSave = { ...formData, codigo: codigoTemp }
        
        await onSave(dataToSave as Imovel)
        console.log('âœ… ImÃ³vel salvo!')
        
        // Mostrar sucesso com cÃ³digo temporÃ¡rio
        setCreatedImovel({ id: Date.now(), codigo: codigoTemp })
        setShowSuccessPopup(true)
      } catch (error) {
        console.error('âŒ Erro ao salvar imÃ³vel:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Atualizar passos completados quando os dados mudam
  useEffect(() => {
    const completed = steps
      .filter(step => {
        // Para etapas obrigatÃ³rias (1 e 2), verificar se sÃ£o vÃ¡lidas
        if (step.id <= 2) {
          return step.isValid(formData)
        }
        // Para etapas opcionais (3, 4, 5), sÃ³ marcar como concluÃ­da se jÃ¡ foi visitada
        return step.id < currentStep
      })
      .map(step => step.id)
    setCompletedSteps(completed)
  }, [formData, currentStep])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' ? 'Novo ImÃ³vel' : 'Editar ImÃ³vel'}
          </h1>
          <p className="mt-2 text-gray-600">
            {mode === 'create' 
              ? 'Preencha as informaÃ§Ãµes do novo imÃ³vel em 5 etapas'
              : 'Atualize as informaÃ§Ãµes do imÃ³vel'
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
              <CurrentStepComponent
                data={formData}
                onUpdate={updateFormData}
                mode={mode}
                finalidades={finalidadesImovel}
                tipos={tiposImovel}
                statusImovel={statusImovel}
                imovelId={mode === 'edit' ? formData.id : undefined}
                registrarAlteracaoRascunho={registrarAlteracaoRascunho}
                registrarVideoAlteracaoRascunho={registrarVideoAlteracaoRascunho}
                registrarImagemPrincipalRascunho={registrarImagemPrincipalRascunho}
                rascunho={rascunho}
              />
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
                  PrÃ³ximo
                  <ChevronRightIcon className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!canSave() || loading || isSaving}
                  className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || isSaving ? 'Salvando...' : mode === 'create' ? 'Cadastrar ImÃ³vel' : 'Salvar AlteraÃ§Ãµes'}
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
                Progresso: {currentStep} de {totalSteps} etapas concluÃ­das
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
            {/* Ãcone de sucesso */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* TÃ­tulo */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Sucesso!
            </h3>
            
            {/* Mensagem */}
            <p className="text-gray-600 text-center mb-4">
              ImÃ³vel cadastrado com sucesso
            </p>
            
            {/* CÃ³digo do imÃ³vel */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-500 text-center mb-1">CÃ³digo do imÃ³vel:</p>
              <p className="text-lg font-mono font-semibold text-gray-900 text-center">
                {createdImovel.codigo}
              </p>
            </div>
            
            {/* BotÃµes */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowSuccessPopup(false)
                  onCancel && onCancel()
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Voltar Ã  Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



