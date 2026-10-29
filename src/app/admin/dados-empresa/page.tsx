"use client";
import { useEffect, useState } from 'react';
import {
  getSettings, updateSettings,
  getMetaIdentity, updateMetaIdentity,
  type MetaIdentitySettings,
} from '@/lib/marketing-api';
import { adminFetch } from '@/lib/auth/adminFetch';
import {
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  IdentificationIcon,
  PhotoIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';
import { UpdateGuard } from '@/components/admin/PermissionGuard';
import { DadosEmpresaHelpButton } from '@/components/admin/dados-empresa/HelpModal';

/**
 * "Dados da Empresa" — self-service do próprio tenant admin pros campos tenant-wide que antes
 * só existiam dentro de Campanhas (Meta Ads App) ou Mensageria (provider/credencial WhatsApp
 * Cloud API), ambos gated por módulo de billing — docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md
 * §9/§10. Feature `dados-empresa` é `is_default_tenant_admin_feature=true`: todo tenant admin
 * chega aqui, independente de ter contratado Campanhas, Mensageria ou CRM.
 *
 * Deliberadamente FORA de escopo aqui (fica em Campanhas, por ser específico de lançamento de
 * anúncio): número de redirect do CTA de anúncio (WhatsAppConfig), Anthropic API Key (fallback
 * de LLM só do agente de Campanhas) e Threshold de Confiança do Agente Decisor.
 */

const RESOURCE = 'dados-empresa';

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-gray-50 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pl-4",
            isPassword ? "pr-12" : "pr-4"
          )}
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

function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="p-2 bg-gold-premium/10 rounded-xl">
          <Icon className="h-5 w-5 text-gold-premium" />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// ─── Meta Marketing API + Evolution API — mesma linha de Settings (public.tenants) ───────────

function TechSettingsSection() {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    metaAppId: '', metaAppSecret: '', metaToken: '', adAccountId: '',
    evolutionApiUrl: '', evolutionApiKey: '', evolutionInstance: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((s: any) => {
      setSettings({
        metaAppId: s.metaAppId || '', metaAppSecret: s.metaAppSecret || '',
        metaToken: s.metaToken || '', adAccountId: s.adAccountId || '',
        evolutionApiUrl: s.evolutionApiUrl || '', evolutionApiKey: s.evolutionApiKey || '',
        evolutionInstance: s.evolutionInstance || '',
      });
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      const payload: any = {
        metaAppId: settings.metaAppId,
        metaAppSecret: settings.metaAppSecret,
        adAccountId: settings.adAccountId,
        evolutionApiUrl: settings.evolutionApiUrl,
        evolutionApiKey: settings.evolutionApiKey,
        evolutionInstance: settings.evolutionInstance,
      };
      if (settings.metaToken) payload.metaToken = settings.metaToken;
      await updateSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  if (!loaded) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-premium" />
    </div>
  );

  return (
    <>
      <SectionCard icon={Cog6ToothIcon} title="Meta Marketing API" description="App ID, credenciais e conta de anúncios da sua empresa">
        <Field label="App ID" value={settings.metaAppId}
          onChange={v => setSettings(s => ({ ...s, metaAppId: v }))}
          placeholder="Ex: 972196948862111" />
        <Field label="App Secret" value={settings.metaAppSecret}
          onChange={v => setSettings(s => ({ ...s, metaAppSecret: v }))}
          placeholder="abc123def456..." type="password"
          hint="Mesmo App usado pra WhatsApp Cloud API — Embedded Signup abaixo reaproveita este App Secret." />
        <Field label="Access Token (Token do administrador)" value={settings.metaToken}
          onChange={v => setSettings(s => ({ ...s, metaToken: v }))}
          placeholder="Token de longa duração" type="password"
          hint="Deixe em branco para manter o token atual" />
        <Field label="Ad Account ID" value={settings.adAccountId}
          onChange={v => setSettings(s => ({ ...s, adAccountId: v }))}
          placeholder="Ex: 10150461381441874 (sem 'act_')" />

        <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
          <UpdateGuard resource={RESOURCE}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </UpdateGuard>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
              <XCircleIcon className="h-4 w-4" /> {error}
            </span>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={ChatBubbleLeftRightIcon} title="Evolution API" description="Instância WhatsApp não-oficial (QR code) — só relevante se o provider abaixo for Evolution">
        <Field label="Evolution API URL" value={settings.evolutionApiUrl}
          onChange={v => setSettings(s => ({ ...s, evolutionApiUrl: v }))}
          placeholder="http://localhost:8080" />
        <Field label="Evolution API Key" value={settings.evolutionApiKey}
          onChange={v => setSettings(s => ({ ...s, evolutionApiKey: v }))}
          placeholder="Chave da API Evolution" type="password" />
        <Field label="Evolution Instance" value={settings.evolutionInstance}
          onChange={v => setSettings(s => ({ ...s, evolutionInstance: v }))}
          placeholder="Nome da Instância" />

        <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
          <UpdateGuard resource={RESOURCE}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </UpdateGuard>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
            </span>
          )}
        </div>
      </SectionCard>
    </>
  );
}

// ─── Identidade Meta (Page/Pixel/Instagram/Website) ───────────────────────────────────────────

function IdentityField({
  icon: Icon, label, value, onChange, placeholder, hint, badge, status,
}: {
  icon: React.ElementType; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; badge?: { text: string; color: string };
  status?: 'ok' | 'empty';
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </label>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${badge.color}`}>
              {badge.text}
            </span>
          )}
          {status === 'ok' && <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
          {status === 'empty' && <div className="h-4 w-4 rounded-full border-2 border-gray-200" />}
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:border-transparent transition-all',
          status === 'ok' ? 'border-emerald-200 focus:ring-emerald-500' : 'border-gray-200 focus:ring-blue-600',
        )}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function MetaIdentitySection() {
  const [data, setData] = useState<MetaIdentitySettings>({
    pageId: '', pixelId: '', instagramActorId: '',
    accessToken: '', appId: '', adAccountId: '',
    credentialsActive: false, lastValidated: null, tokenExpiresAt: null,
    website: '', tenantName: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMetaIdentity().then(d => { setData(d); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await updateMetaIdentity({
        pageId: data.pageId, pixelId: data.pixelId,
        instagramActorId: data.instagramActorId, website: data.website,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function fieldStatus(val: string): 'ok' | 'empty' {
    return val.trim().length > 0 ? 'ok' : 'empty';
  }

  if (!loaded) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-premium" />
    </div>
  );

  return (
    <SectionCard icon={IdentificationIcon} title="Identidade Meta" description="Page ID, Pixel, Instagram e Site">
      <IdentityField icon={IdentificationIcon} label="Facebook Page ID" value={data.pageId}
        onChange={v => setData(d => ({ ...d, pageId: v }))} placeholder="Ex: 105308234567890"
        hint="ID numérico da sua Página do Facebook. Obrigatório para criar criativos."
        badge={{ text: 'Obrigatório', color: 'bg-red-100 text-red-600' }} status={fieldStatus(data.pageId)} />
      <IdentityField icon={ShieldCheckIcon} label="Meta Pixel ID" value={data.pixelId}
        onChange={v => setData(d => ({ ...d, pixelId: v }))} placeholder="Ex: 876543210987654"
        hint="Para rastreamento de conversões." badge={{ text: 'Conversões', color: 'bg-indigo-100 text-indigo-600' }}
        status={fieldStatus(data.pixelId)} />
      <IdentityField icon={PhotoIcon} label="Instagram Actor ID" value={data.instagramActorId}
        onChange={v => setData(d => ({ ...d, instagramActorId: v }))} placeholder="Ex: 17841234567890"
        hint="Opcional — para criativos no Instagram." badge={{ text: 'Opcional', color: 'bg-gray-100 text-gray-500' }}
        status={data.instagramActorId ? fieldStatus(data.instagramActorId) : 'empty'} />
      <IdentityField icon={LinkIcon} label="Website / Site da Empresa" value={data.website}
        onChange={v => setData(d => ({ ...d, website: v }))} placeholder="https://seusite.com.br"
        hint="Pré-preenche o Link da campanha no wizard." status={fieldStatus(data.website)} />

      {(data.adAccountId || data.credentialsActive) && (
        <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">Ad Account:</span>
            <code className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-mono text-gray-700">
              act_{data.adAccountId || '—'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', data.credentialsActive ? 'bg-emerald-500' : 'bg-gray-300')} />
            <span className="text-[11px] text-gray-500">{data.credentialsActive ? 'Credenciais ativas' : 'Credenciais inativas'}</span>
          </div>
          {data.tokenExpiresAt && (
            <div className="text-[11px] text-gray-400">
              Token expira: {new Date(data.tokenExpiresAt).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1464d0] active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Identidade Meta'}
          </button>
        </UpdateGuard>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
            <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
            <XCircleIcon className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ─── WhatsApp — provider + credencial tenant-wide + config do App (Embedded Signup) ───────────

function WhatsAppCloudSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantProvider, setTenantProvider] = useState('evolution');
  const [selected, setSelected] = useState('evolution');
  const [tenantApp, setTenantApp] = useState<{ hasMetaApp: boolean; embeddedSignupConfigId: string | null; hasWebhookVerifyToken: boolean }>({ hasMetaApp: false, embeddedSignupConfigId: null, hasWebhookVerifyToken: false });
  const [credential, setCredential] = useState<{ phoneNumberId: string; wabaId: string; displayPhoneNumber: string | null; paymentMethodConfirmed: boolean } | null>(null);
  const [usage, setUsage] = useState<{ sentThisMonth: number } | null>(null);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '', displayPhoneNumber: '', embeddedSignupConfigId: '', webhookVerifyToken: '' });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/mensageria/whatsapp-cloud');
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Falha ao carregar.'); return; }
      setTenantProvider(data.tenantProvider);
      setSelected(data.tenantProvider);
      setTenantApp(data.tenantApp);
      setCredential(data.credential);
      setUsage(data.usage);
      setPaymentConfirmed(data.credential?.paymentMethodConfirmed || false);
      setForm({
        phoneNumberId: data.credential?.phoneNumberId || '',
        wabaId: data.credential?.wabaId || '',
        accessToken: '',
        displayPhoneNumber: data.credential?.displayPhoneNumber || '',
        embeddedSignupConfigId: data.tenantApp?.embeddedSignupConfigId || '',
        webhookVerifyToken: '',
      });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMessage(''); setSaved(false);
    try {
      const body: Record<string, unknown> = { provider: selected };
      if (selected === 'whatsapp_cloud') {
        body.paymentMethodConfirmed = paymentConfirmed;
        if (form.phoneNumberId.trim()) body.phoneNumberId = form.phoneNumberId.trim();
        if (form.wabaId.trim()) body.wabaId = form.wabaId.trim();
        if (form.accessToken.trim()) body.accessToken = form.accessToken.trim();
        if (form.displayPhoneNumber.trim()) body.displayPhoneNumber = form.displayPhoneNumber.trim();
        if (form.embeddedSignupConfigId.trim()) body.embeddedSignupConfigId = form.embeddedSignupConfigId.trim();
        if (form.webhookVerifyToken.trim()) body.webhookVerifyToken = form.webhookVerifyToken.trim();
      }
      const res = await adminFetch('/api/admin/mensageria/whatsapp-cloud', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Falha ao salvar.'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
    } finally { setSaving(false); }
  }

  const usagePct = usage ? Math.round((usage.sentThisMonth / 1000) * 100) : 0;

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-premium" />
    </div>
  );

  return (
    <SectionCard icon={ChatBubbleLeftRightIcon} title="WhatsApp — Provider" description="Escolha excludente: Evolution (não-oficial) ou Cloud API (oficial Meta) — custo sempre do tenant, nunca da plataforma">
      <div className="flex gap-2">
        {(['evolution', 'whatsapp_cloud'] as const).map(p => (
          <button key={p} type="button" onClick={() => setSelected(p)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors',
              selected === p ? 'bg-gold-premium/15 border-gold-premium text-gold-premium' : 'bg-gray-50 border-gray-200 text-gray-500',
            )}>
            {p === 'evolution' ? 'Evolution (padrão)' : 'WhatsApp Cloud API (oficial)'}
          </button>
        ))}
      </div>

      {selected === 'whatsapp_cloud' && (
        <div className="space-y-4 pt-3 border-t border-gray-50">
          <div className={cn(
            'flex items-start gap-3 rounded-xl p-4',
            tenantApp.hasMetaApp ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200',
          )}>
            {tenantApp.hasMetaApp
              ? <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              : <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {tenantApp.hasMetaApp
                ? 'Seu App Meta (acima, Marketing API) já está configurado — reaproveitado pra WhatsApp Cloud API.'
                : 'Configure primeiro o App ID/Secret em "Meta Marketing API" acima — WhatsApp Cloud API reaproveita o mesmo App.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Embedded Signup Config ID" value={form.embeddedSignupConfigId}
              onChange={v => setForm(f => ({ ...f, embeddedSignupConfigId: v }))}
              placeholder="Ex: 1234567890123456"
              hint="Criado dentro do seu App → Facebook Login for Business → variação WhatsApp Embedded Signup." />
            <Field label="Webhook Verify Token" value={form.webhookVerifyToken}
              onChange={v => setForm(f => ({ ...f, webhookVerifyToken: v }))}
              placeholder={tenantApp.hasWebhookVerifyToken ? 'Já salvo — deixe vazio p/ manter' : 'Escolha um valor'} type="password" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
            <Field label="Phone Number ID" value={form.phoneNumberId}
              onChange={v => setForm(f => ({ ...f, phoneNumberId: v }))} placeholder="Ex: 109876543210" />
            <Field label="WABA ID" value={form.wabaId}
              onChange={v => setForm(f => ({ ...f, wabaId: v }))} placeholder="Ex: 987654321098" />
            <Field label="Access Token (system user)" value={form.accessToken}
              onChange={v => setForm(f => ({ ...f, accessToken: v }))}
              placeholder={credential ? 'Já salvo — deixe vazio p/ manter' : 'Resultante do Embedded Signup'} type="password" />
            <Field label="Número exibido (opcional)" value={form.displayPhoneNumber}
              onChange={v => setForm(f => ({ ...f, displayPhoneNumber: v }))} placeholder="+55 81 99999-0000" />
          </div>
          <p className="text-[11px] text-gray-400">
            Essa credencial vale pra toda a empresa (não vinculada a um cliente específico). Pra configurar
            o WhatsApp de um cliente que você gerencia, acesse a ficha do cliente → aba "Configurações Meta".
          </p>

          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" checked={paymentConfirmed} onChange={e => setPaymentConfirmed(e.target.checked)} />
            Já cadastrei cartão no Business Manager da Meta
          </label>

          {usage && (
            <p className={cn('text-xs', usagePct >= 100 ? 'text-red-500' : usagePct >= 80 ? 'text-amber-500' : 'text-gray-400')}>
              {usage.sentThisMonth} / 1.000 mensagens de serviço gratuitas este mês
              {usagePct >= 100 ? ' — franquia esgotada, sinal de atendimento gerando movimento real.' : ''}
            </p>
          )}
        </div>
      )}

      {message && <p className="text-xs text-red-500">{message}</p>}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </UpdateGuard>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
            <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
          </span>
        )}
      </div>
    </SectionCard>
  );
}

export default function DadosEmpresaPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-gold-premium uppercase tracking-[0.3em] mb-2">Dados da Empresa</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dados da Empresa</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Identidade Meta, Evolution API e provider de WhatsApp — independente dos módulos que você contratou.
            </p>
          </div>
          <DadosEmpresaHelpButton />
        </div>
        <div className="space-y-6">
          <TechSettingsSection />
          <MetaIdentitySection />
          <WhatsAppCloudSection />
        </div>
      </div>
    </div>
  );
}
