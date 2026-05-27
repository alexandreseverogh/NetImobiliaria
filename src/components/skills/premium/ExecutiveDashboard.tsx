'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Home, 
  ArrowUpRight, ArrowDownRight, LayoutGrid 
} from 'lucide-react';

// Dados fictícios para o mockup Premium
const data = [
  { name: 'Jan', revenue: 4000, leads: 240, cvr: 2.1 },
  { name: 'Fev', revenue: 3000, leads: 139, cvr: 1.8 },
  { name: 'Mar', revenue: 2000, leads: 980, cvr: 3.5 },
  { name: 'Abr', revenue: 2780, leads: 390, cvr: 2.3 },
  { name: 'Mai', revenue: 1890, leads: 480, cvr: 2.8 },
  { name: 'Jun', revenue: 2390, leads: 380, cvr: 2.5 },
  { name: 'Jul', revenue: 3490, leads: 430, cvr: 3.1 },
];

const PIE_DATA = [
  { name: 'Venda', value: 400 },
  { name: 'Locação', value: 300 },
  { name: 'LANÇ.', value: 200 },
];

const COLORS = ['#6366f1', '#a855f7', '#ec4899'];

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="relative group overflow-hidden rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon size={80} />
    </div>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {change}%
      </div>
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</p>
  </div>
);

/**
 * ExecutiveDashboard - Superpower Skill UI
 * Uma interface analítica de alto nível que substitui o dashboard padrão.
 */
export default function ExecutiveDashboard({ data: externalData, config }: any) {
  // O parâmetro 'config' vem diretamente da parametrização do Master para este Tenant
  const primaryColor = config?.primary_color || '#6366f1';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header com Saudação Dinâmica */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Performance Executiva
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitoramento de inteligência em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            Baixar Relatório
          </button>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Grid de Estatísticas Master */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="VGV Global" value="R$ 12.4M" change="12.5" trend="up" icon={DollarSign} />
        <StatCard title="Novos Leads" value="1,284" change="4.3" trend="up" icon={Users} />
        <StatCard title="Imóveis Ativos" value="482" change="1.2" trend="down" icon={Home} />
        <StatCard title="Conversão Geral" value="3.82%" change="0.8" trend="up" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Receita Principal */}
        <div className="lg:col-span-2 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Fluxo de Receita e Leads</h2>
            <select className="bg-transparent text-sm font-medium text-slate-500 border-none focus:ring-0 cursor-pointer">
              <last-7-days>Últimos 6 meses</last-7-days>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#888888', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#888888', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={primaryColor} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Vendas */}
        <div className="rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-8">Mix de Portfólio</h2>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-bold dark:text-white">900</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            {PIE_DATA.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}} />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-medium dark:text-white">{item.value} unid.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
