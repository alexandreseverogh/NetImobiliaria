'use client';

/**
 * Dados cadastrais da empresa, editáveis pelo administrador do tenant.
 * Não inclui chaves de IA, domínio público, segmento nem isenções (só o Master edita).
 */
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

const RESOURCE = 'dados-empresa';

type Perfil = {
  razaoSocial: string; cnpjCpf: string; emailContato: string; telefone: string;
  logradouro: string; numero: string; complemento: string; bairro: string;
  cep: string; cidade: string; estado: string;
  primaryColor: string; secondaryColor: string;
  numeroWhatsapp: string; slackWebhookUrl: string;
  calendario: boolean; googleEmail: string; duracaoVisita: number;
};

const EMPTY: Perfil = {
  razaoSocial: '', cnpjCpf: '', emailContato: '', telefone: '',
  logradouro: '', numero: '', complemento: '', bairro: '',
  cep: '', cidade: '', estado: '', primaryColor: '', secondaryColor: '',
  numeroWhatsapp: '', slackWebhookUrl: '',
  calendario: false, googleEmail: '', duracaoVisita: 60,
};

function Input({ label, value, onChange, placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
      />
    </div>
  );
}

export function DadosCadastraisSection() {
  const [data, setData] = useState<Perfil>(EMPTY);
  const [logo, setLogo] = useState('');
  const [logoChanged, setLogoChanged] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/dados-empresa/perfil');
        if (res.ok) {
          const json = await res.json();
          setLogo(json.logo ?? '');
          setData({ ...EMPTY, ...json });
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const set = (key: keyof Perfil) => (v: string) => setData(prev => ({ ...prev, [key]: v }));

  const handleLogoFile = (file: File) => {
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setError('Logo deve ser PNG, JPG, WEBP ou SVG');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('O arquivo é muito grande. O limite para o logo é 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result ?? ''));
      setLogoChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...data };
      if (logoChanged) body.logo = logo || null;
      const res = await adminFetch('/api/admin/dados-empresa/perfil', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resBody.error || 'Erro ao salvar');
      setLogoChanged(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-base font-black text-gray-900">Dados Cadastrais</h2>
        <p className="text-xs text-gray-500 mt-1">Razão social, contato e endereço da sua empresa.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Razão Social" value={data.razaoSocial} onChange={set('razaoSocial')} />
        <Input label="CNPJ / CPF" value={data.cnpjCpf} onChange={set('cnpjCpf')} />
        <Input label="E-mail para notificações" value={data.emailContato} onChange={set('emailContato')} />
        <Input label="Telefone principal" value={data.telefone} onChange={set('telefone')} />
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        <div className="md:col-span-4"><Input label="Logradouro" value={data.logradouro} onChange={set('logradouro')} /></div>
        <div className="md:col-span-2"><Input label="Número" value={data.numero} onChange={set('numero')} /></div>
        <div className="md:col-span-3"><Input label="Complemento" value={data.complemento} onChange={set('complemento')} /></div>
        <div className="md:col-span-3"><Input label="Bairro" value={data.bairro} onChange={set('bairro')} /></div>
        <div className="md:col-span-2"><Input label="CEP" value={data.cep} onChange={set('cep')} /></div>
        <div className="md:col-span-3"><Input label="Cidade" value={data.cidade} onChange={set('cidade')} /></div>
        <div className="md:col-span-1"><Input label="UF" value={data.estado} onChange={set('estado')} maxLength={2} /></div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comunicação e alertas</p>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Número WhatsApp para alertas (DDD + número)" value={data.numeroWhatsapp} onChange={set('numeroWhatsapp')} placeholder="5581999999999" />
          <Input label="Webhook do Slack" value={data.slackWebhookUrl} onChange={set('slackWebhookUrl')} placeholder="https://hooks.slack.com/services/..." />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Calendar</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.calendario}
            onChange={e => setData(prev => ({ ...prev, calendario: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-semibold text-gray-700">Ativar agendamento de visitas com Google Calendar</span>
        </label>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="E-mail Google da empresa" value={data.googleEmail} onChange={set('googleEmail')} />
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duração padrão da visita (minutos)</label>
            <input
              type="number"
              min={15}
              max={480}
              value={data.duracaoVisita}
              onChange={e => setData(prev => ({ ...prev, duracaoVisita: Number(e.target.value) }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Logo da empresa</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-40 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[11px] text-gray-400">Sem logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">
              Escolher arquivo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ''; }}
              />
            </label>
            {logo && (
              <button
                type="button"
                onClick={() => { setLogo(''); setLogoChanged(true); }}
                className="text-xs font-bold text-red-600 hover:text-red-700 text-left"
              >
                Remover logo
              </button>
            )}
            <p className="text-[11px] text-gray-400">PNG, JPG, WEBP ou SVG, até 1 MB.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Cor primária (#RRGGBB)" value={data.primaryColor} onChange={set('primaryColor')} placeholder="#c5a028" />
        <Input label="Cor secundária (#RRGGBB)" value={data.secondaryColor} onChange={set('secondaryColor')} placeholder="#020c1b" />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1464d0] active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Dados Cadastrais'}
          </button>
        </UpdateGuard>
        {saved && <span className="text-xs font-bold text-emerald-600">Salvo</span>}
      </div>
    </div>
  );
}
