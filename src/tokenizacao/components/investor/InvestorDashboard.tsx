'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Calendar,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  User
} from 'lucide-react'
import PortfolioOverview from './PortfolioOverview'
import TokenHoldings from './TokenHoldings'
import TransactionHistory from './TransactionHistory'
import PerformanceCharts from './PerformanceCharts'
import DividendHistory from './DividendHistory'
import InvestorProfile from './InvestorProfile'

export default function InvestorDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'portfolio', label: 'Carteira', icon: Wallet },
    { id: 'transactions', label: 'Transações', icon: BarChart3 },
    { id: 'dividends', label: 'Dividendos', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'profile', label: 'Perfil', icon: User },
  ]

  // Dados mockados do investidor
  const investorData = {
    name: 'João Silva',
    email: 'joao.silva@email.com',
    totalInvested: 15000,
    currentValue: 17250,
    totalReturn: 2250,
    returnPercentage: 15.0,
    monthlyDividends: 187.50,
    totalDividends: 1125,
    kycStatus: 'approved',
    riskProfile: 'moderado'
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <PortfolioOverview investorData={investorData} />
      case 'portfolio':
        return <TokenHoldings />
      case 'transactions':
        return <TransactionHistory />
      case 'dividends':
        return <DividendHistory />
      case 'performance':
        return <PerformanceCharts />
      case 'profile':
        return <InvestorProfile investorData={investorData} />
      default:
        return <PortfolioOverview investorData={investorData} />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header do Portal */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo, {investorData.name}!
            </h1>
            <p className="text-blue-100">
              Gerencie seus investimentos em tokenização de imóveis
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Status KYC */}
            <div className="flex items-center space-x-2 bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm font-medium">KYC Aprovado</span>
            </div>
            
            {/* Notificações */}
            <button className="relative p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Configurações */}
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Valor Total Investido */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {investorData.totalInvested.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Valor Atual */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Valor Atual</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {investorData.currentValue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Retorno Total */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Retorno Total</p>
              <p className="text-2xl font-bold text-green-600">
                +R$ {investorData.totalReturn.toLocaleString()}
              </p>
              <p className="text-sm text-green-600">
                +{investorData.returnPercentage}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Dividendos Mensais */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Dividendos Mensais</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {investorData.monthlyDividends.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Total: R$ {investorData.totalDividends.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

