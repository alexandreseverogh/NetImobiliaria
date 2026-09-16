'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface FormState {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  developerToken: '',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  customerId: '',
  isActive: true,
};

function Field({
  label, value, onChange, placeholder, type = 'text', hint, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-4 ${isPassword ? 'pr-12' : 'pr-4'}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

export default function GoogleAdsConfigPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/admin/configuracoes/google-ads');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setForm({
              developerToken: data.config.developerToken || '',
              clientId: data.config.clientId || '',
              clientSecret: data.config.clientSecret || '',
              refreshToken: data.config.refreshToken || '',
              customerId: data.config.customerId || '',
              isActive: data.config.isActive ?? true,
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/configuracoes/google-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Credenciais inválidas. Verifique os dados.' });
      } else {
        setResult({ success: true, message: 'Credenciais validadas e salvas com sucesso!' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Erro inesperado ao conectar com o servidor.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Voltar
        </button>
        <h1 className="text-2xl font-black text-gray-900">Google Ads API</h1>
        <p className="text-sm text-gray-400 mt-1">
          Credenciais de desenvolvedor do Google Ads — ativa campanhas Performance Max e coleta de métricas reais.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-black text-gray-900">Credenciais de Acesso</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tokens do Google Cloud Console + ID da conta gerenciadora. Ofuscados após salvar.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <Field
            label="Developer Token"
            value={form.developerToken}
            onChange={v => setForm(f => ({ ...f, developerToken: v }))}
            type="password"
            required
            hint="Nível Basic — Google Ads API Center"
          />
          <Field
            label="Client ID"
            value={form.clientId}
            onChange={v => setForm(f => ({ ...f, clientId: v }))}
            type="password"
            required
            hint="OAuth2 client — Google Cloud Console"
          />
          <Field
            label="Client Secret"
            value={form.clientSecret}
            onChange={v => setForm(f => ({ ...f, clientSecret: v }))}
            type="password"
            required
          />
          <Field
            label="Refresh Token"
            value={form.refreshToken}
            onChange={v => setForm(f => ({ ...f, refreshToken: v }))}
            type="password"
            required
          />
          <Field
            label="Customer ID (conta de anúncios)"
            value={form.customerId}
            onChange={v => setForm(f => ({ ...f, customerId: v }))}
            placeholder="1234567890 (sem hífens)"
            required
          />

          <label className="flex items-center gap-3 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Ativar integração com Google Ads</span>
          </label>

          {result && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-medium ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {result.success ? <CheckCircleIcon className="h-5 w-5 shrink-0" /> : <XCircleIcon className="h-5 w-5 shrink-0" />}
              {result.message}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-50">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            Testar Conexão e Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
