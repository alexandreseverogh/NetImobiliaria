'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/marketing-utils';
import type { GoogleCampaignInput } from '@/lib/marketing/networks/types';

interface GoogleAiMaxWizardProps {
  onClose: () => void;
  onLaunch: (payload: GoogleCampaignInput) => Promise<void>;
  initialData?: Partial<GoogleCampaignInput>;
}

export function GoogleAiMaxWizard({ onClose, onLaunch, initialData }: GoogleAiMaxWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLaunching, setIsLaunching] = useState(false);

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [budget, setBudget] = useState(initialData?.budget || 5000); // in cents
  
  const [headlines, setHeadlines] = useState<string[]>(['']);
  const [descriptions, setDescriptions] = useState<string[]>(['']);
  const [finalUrl, setFinalUrl] = useState('');
  
  const [keywords, setKeywords] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  
  const [biddingType, setBiddingType] = useState<'MAXIMIZE_CONVERSIONS' | 'TCPA' | 'TROAS'>('MAXIMIZE_CONVERSIONS');
  const [biddingTarget, setBiddingTarget] = useState<number | undefined>();
  const [conversionGoal, setConversionGoal] = useState<string>('mock_goal_leads');

  // Mocked goals para exibição
  const mockedGoals = [
    { id: 'mock_goal_leads', name: 'Leads (Envio de formulário)' },
    { id: 'mock_goal_whatsapp', name: 'Contatos via WhatsApp' },
    { id: 'mock_goal_sales', name: 'Vendas (Purchase)' }
  ];

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const payload: GoogleCampaignInput = {
        name: name || 'Nova Campanha PMax',
        budget,
        conversionGoal,
        biddingStrategy: {
          type: biddingType,
          targetValue: biddingTarget,
        },
        assetGroups: [
          {
            name: 'Asset Group 1',
            headlines: headlines.filter(h => h.trim() !== ''),
            descriptions: descriptions.filter(d => d.trim() !== ''),
            images: [], // mock for now
            finalUrl: finalUrl || 'https://exemplo.com',
          }
        ],
        audienceSignals: {
          keywords: keywords.filter(k => k.trim() !== ''),
          segments: segments.filter(s => s.trim() !== ''),
        }
      };
      await onLaunch(payload);
    } catch (err) {
      console.error(err);
      alert('Erro ao lançar campanha Google AI Max');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Google AI Max <span className="text-blue-500">Wizard</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Criação de campanha Performance Max (Asset-Based)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">1. Ativos (Assets)</h3>
              <p className="text-sm text-slate-500">O Google usará esses títulos e descrições para montar os anúncios dinamicamente.</p>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Nome da Campanha</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                  placeholder="Ex: PMax Lançamento..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">URL Final</label>
                <input 
                  type="url" 
                  value={finalUrl} 
                  onChange={e => setFinalUrl(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Títulos</label>
                {headlines.map((h, i) => (
                  <input 
                    key={i}
                    type="text" 
                    value={h} 
                    onChange={e => {
                      const newH = [...headlines];
                      newH[i] = e.target.value;
                      setHeadlines(newH);
                    }}
                    className="w-full p-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    placeholder={`Título ${i + 1}`}
                  />
                ))}
                <button 
                  onClick={() => setHeadlines([...headlines, ''])}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 mt-2"
                >
                  + Adicionar Título
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Descrições</label>
                {descriptions.map((d, i) => (
                  <textarea 
                    key={i}
                    value={d} 
                    onChange={e => {
                      const newD = [...descriptions];
                      newD[i] = e.target.value;
                      setDescriptions(newD);
                    }}
                    className="w-full p-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    placeholder={`Descrição ${i + 1}`}
                  />
                ))}
                <button 
                  onClick={() => setDescriptions([...descriptions, ''])}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 mt-2"
                >
                  + Adicionar Descrição
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">2. Sinais de Audiência (Opcional)</h3>
              <p className="text-sm text-slate-500">Forneça dicas ao algoritmo para acelerar a fase de aprendizado (não é uma segmentação restrita).</p>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Palavras-chave (Intenção de Busca)</label>
                {keywords.map((k, i) => (
                  <input 
                    key={i}
                    type="text" 
                    value={k} 
                    onChange={e => {
                      const newK = [...keywords];
                      newK[i] = e.target.value;
                      setKeywords(newK);
                    }}
                    className="w-full p-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    placeholder={`Palavra-chave ${i + 1}`}
                  />
                ))}
                <button 
                  onClick={() => setKeywords([...keywords, ''])}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 mt-2"
                >
                  + Adicionar Palavra-chave
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">3. Orçamento e Lance</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Meta de Conversão (Conta Google)</label>
                <select
                  value={conversionGoal}
                  onChange={e => setConversionGoal(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                >
                  {mockedGoals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">O AI Max otimizará a entrega focada nesta meta.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Orçamento Diário (R$)</label>
                <input 
                  type="number" 
                  value={budget / 100} 
                  onChange={e => setBudget(Number(e.target.value) * 100)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                  min={10}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Estratégia de Lance</label>
                <select
                  value={biddingType}
                  onChange={e => setBiddingType(e.target.value as any)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                >
                  <option value="MAXIMIZE_CONVERSIONS">Maximizar Conversões</option>
                  <option value="TCPA">CPA Desejado (tCPA)</option>
                  <option value="TROAS">ROAS Desejado (tROAS)</option>
                </select>
              </div>

              {(biddingType === 'TCPA' || biddingType === 'TROAS') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {biddingType === 'TCPA' ? 'CPA Alvo (R$)' : 'ROAS Alvo (%)'}
                  </label>
                  <input 
                    type="number" 
                    value={biddingTarget ? biddingTarget / 100 : ''} 
                    onChange={e => setBiddingTarget(Number(e.target.value) * 100)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                    placeholder={biddingType === 'TCPA' ? 'Ex: 50.00' : 'Ex: 200'}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
          <button 
            onClick={() => setStep(step - 1 as any)}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 disabled:opacity-50"
          >
            Voltar
          </button>
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1 as any)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white"
            >
              Avançar
            </button>
          ) : (
            <button 
              onClick={handleLaunch}
              disabled={isLaunching}
              className="px-8 py-2.5 rounded-xl text-sm font-black bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {isLaunching ? 'Lançando...' : 'LANÇAR CAMPANHA PMAX'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
