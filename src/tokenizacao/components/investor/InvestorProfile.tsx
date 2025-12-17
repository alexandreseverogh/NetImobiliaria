'use client'

import { useState } from 'react'
import { User, Mail, Phone, MapPin, Shield, Edit, Save, X } from 'lucide-react'

interface InvestorProfileProps {
  investorData: {
    name: string
    email: string
    totalInvested: number
    currentValue: number
    totalReturn: number
    returnPercentage: number
    monthlyDividends: number
    totalDividends: number
    kycStatus: string
    riskProfile: string
  }
}

export default function InvestorProfile({ investorData }: InvestorProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: investorData.name,
    email: investorData.email,
    phone: '(11) 99999-9999',
    address: 'São Paulo, SP',
    riskProfile: investorData.riskProfile,
    investmentGoals: 'Diversificação de portfólio e renda passiva',
    experience: 'Intermediário'
  })

  const handleSave = () => {
    // Aqui você salvaria os dados
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      name: investorData.name,
      email: investorData.email,
      phone: '(11) 99999-9999',
      address: 'São Paulo, SP',
      riskProfile: investorData.riskProfile,
      investmentGoals: 'Diversificação de portfólio e renda passiva',
      experience: 'Intermediário'
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-8">
      {/* Header do Perfil */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <User className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{formData.name}</h2>
              <p className="text-blue-100">{formData.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Shield className="h-4 w-4 text-green-300" />
                <span className="text-sm text-green-300">KYC Aprovado</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Editar Perfil</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informações Pessoais */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Informações Pessoais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{formData.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{formData.email}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{formData.phone}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{formData.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Informações de Investimento */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Perfil de Investidor</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perfil de Risco</label>
            {isEditing ? (
              <select
                value={formData.riskProfile}
                onChange={(e) => setFormData({...formData, riskProfile: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="conservador">Conservador</option>
                <option value="moderado">Moderado</option>
                <option value="arrojado">Arrojado</option>
              </select>
            ) : (
              <p className="text-gray-900 capitalize">{formData.riskProfile}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experiência</label>
            {isEditing ? (
              <select
                value={formData.experience}
                onChange={(e) => setFormData({...formData, experience: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            ) : (
              <p className="text-gray-900 capitalize">{formData.experience}</p>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Objetivos de Investimento</label>
            {isEditing ? (
              <textarea
                value={formData.investmentGoals}
                onChange={(e) => setFormData({...formData, investmentGoals: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{formData.investmentGoals}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status KYC */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Status de Verificação</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Verificação de Identidade</p>
                <p className="text-sm text-green-600">Documentos aprovados e verificados</p>
              </div>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Aprovado
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Verificação de Endereço</p>
                <p className="text-sm text-green-600">Comprovante de residência validado</p>
              </div>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Aprovado
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Verificação de Renda</p>
                <p className="text-sm text-green-600">Comprovantes de renda verificados</p>
              </div>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Aprovado
            </span>
          </div>
        </div>
      </div>

      {/* Estatísticas do Investidor */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Suas Estatísticas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{investorData.totalInvested.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Investido</p>
            <p className="text-xs text-gray-500">R$</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">+{investorData.returnPercentage}%</p>
            <p className="text-sm text-gray-600">Retorno Total</p>
            <p className="text-xs text-gray-500">Desde o início</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{investorData.monthlyDividends.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Dividendos Mensais</p>
            <p className="text-xs text-gray-500">R$</p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">8</p>
            <p className="text-sm text-gray-600">Meses Investindo</p>
            <p className="text-xs text-gray-500">Desde jun/2023</p>
          </div>
        </div>
      </div>
    </div>
  )
}

