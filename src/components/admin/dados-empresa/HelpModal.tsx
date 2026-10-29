'use client';

/**
 * Botão "Ajuda" + modal pra `/admin/dados-empresa` — guia campo a campo de ONDE/COMO obter
 * cada valor que a tela pede (URLs reais do Meta for Developers/Business Manager, e os 2
 * casos que nunca vêm de lá: Evolution API é hospedada por terceiro, Webhook Verify Token é
 * escolhido pelo próprio admin). Conteúdo é field-reference (17 campos agrupados por seção),
 * estrutura deliberadamente diferente de `FeatureHelpContent`/`FeatureHelpModal.tsx` (que é
 * narrativo — o que é/como usar/benefícios de 1 feature só) — aqui não há 1 narrativa, são 17
 * respostas independentes à mesma pergunta "de onde vem esse valor?".
 *
 * Reaproveita o mesmo DNA visual do `FeatureHelpModal.tsx` (overlay, painel, Esc, foco) pra
 * consistência entre os 2 modais de ajuda da plataforma, mas com seção própria.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ─── Conteúdo ────────────────────────────────────────────────────────────────

type BadgeTone = 'manual' | 'soon' | 'self-chosen';

interface FieldEntry {
  label: string;
  what: string;
  where: string[];
  link?: { label: string; href: string };
  badge: BadgeTone;
}

interface FieldSection {
  title: string;
  intro?: string;
  fields: FieldEntry[];
}

const BADGE_CONFIG: Record<BadgeTone, { text: string; className: string }> = {
  manual: { text: 'Manual', className: 'bg-slate-100 text-slate-500' },
  soon: { text: 'Em breve: automático', className: 'bg-amber-100 text-amber-700' },
  'self-chosen': { text: 'Você escolhe', className: 'bg-blue-100 text-blue-700' },
};

const SECTIONS: FieldSection[] = [
  {
    title: 'Meta Marketing API',
    intro: 'Todos vêm do App que sua empresa cria em developers.facebook.com. Você precisa de um App próprio — ele nunca é compartilhado entre empresas.',
    fields: [
      {
        label: 'App ID',
        what: 'Identificador numérico do seu App no Meta for Developers.',
        where: [
          'developers.facebook.com → "Meus Apps". Se ainda não existir, clique "Criar App", tipo "Negócios", preencha nome e e-mail de contato.',
          'Dentro do App → Configurações → Básico. O App ID aparece logo no topo da página.',
        ],
        link: { label: 'developers.facebook.com/apps', href: 'https://developers.facebook.com/apps' },
        badge: 'manual',
      },
      {
        label: 'App Secret',
        what: 'Senha do App — usada tanto pra Meta Ads quanto (reaproveitada) pra validar o webhook do WhatsApp Cloud API abaixo.',
        where: [
          'Mesma tela do App ID (Configurações → Básico).',
          'Ao lado do campo "Chave Secreta do App", clique "Mostrar" — a Meta pede sua senha de novo antes de revelar.',
        ],
        badge: 'manual',
      },
      {
        label: 'Access Token (Token do administrador)',
        what: 'Token de longa duração usado pela plataforma pra criar/gerenciar campanhas em nome da sua conta de anúncios.',
        where: [
          'Recomendado: business.facebook.com → Configurações do Negócio → Usuários → Usuários do Sistema → criar um Usuário de Sistema → gerar token com a permissão "ads_management" (esse tipo de token não expira).',
          'Alternativa mais simples, mas temporária (~60 dias): dentro do App → Ferramentas → Explorador da API Graph → selecione o App e a permissão "ads_management" → "Gerar Token de Acesso".',
        ],
        link: { label: 'business.facebook.com/settings', href: 'https://business.facebook.com/settings' },
        badge: 'manual',
      },
      {
        label: 'Ad Account ID',
        what: 'Conta de anúncios onde as campanhas lançadas por esta plataforma vão rodar.',
        where: [
          'business.facebook.com → Configurações do Negócio → Contas → Contas de Anúncio.',
          'Clique na conta → o ID numérico aparece no topo. Cole só o número — sem o prefixo "act_" (a plataforma já adiciona sozinha).',
        ],
        badge: 'manual',
      },
    ],
  },
  {
    title: 'Evolution API',
    intro: 'Única seção que NÃO vem da Meta — a Evolution é uma API de terceiro, não-oficial. Os 3 valores vêm de onde essa instância está hospedada (geralmente quem configurou o WhatsApp não-oficial da sua empresa — um dev, agência ou fornecedor técnico).',
    fields: [
      {
        label: 'Evolution API URL / Key / Instance',
        what: 'Endereço do servidor, chave de acesso e nome da instância da sua Evolution API — só relevante se o provider de WhatsApp escolhido abaixo for "Evolution".',
        where: [
          'Pergunte a quem hospedou/configurou sua instância Evolution API (geralmente aparece no painel de administração dela, ou foi te repassado quando o serviço foi contratado/configurado).',
          'Não existe tela da Meta pra isso — é 100% independente.',
        ],
        badge: 'manual',
      },
    ],
  },
  {
    title: 'Identidade Meta',
    fields: [
      {
        label: 'Facebook Page ID',
        what: 'ID numérico da Página do Facebook da sua empresa — obrigatório pra criar criativos de campanha.',
        where: [
          'Abra sua Página no Facebook → "Sobre" → role até o fim → "ID da Página".',
          'Alternativa: facebook.com/<nome-da-sua-página>/about mostra o mesmo campo.',
        ],
        badge: 'manual',
      },
      {
        label: 'Meta Pixel ID',
        what: 'Usado pra rastrear conversões (ex.: alguém preencheu um formulário vindo de um anúncio).',
        where: [
          'business.facebook.com → Gerenciador de Eventos.',
          'Selecione o Pixel da sua empresa (ou crie um, se ainda não existir) → o ID aparece no topo.',
        ],
        link: { label: 'business.facebook.com/events_manager2', href: 'https://business.facebook.com/events_manager2' },
        badge: 'manual',
      },
      {
        label: 'Instagram Actor ID',
        what: 'Conta comercial do Instagram vinculada, pra permitir criativos também no Instagram. Opcional.',
        where: [
          'Pré-requisito: a conta do Instagram precisa estar vinculada à sua Página do Facebook (Configurações da Página → Contas Vinculadas → Instagram).',
          'O ID em si costuma exigir uma consulta técnica (Graph API Explorer, campo "instagram_business_account" ao consultar /me/accounts) — não aparece numa tela comum de usuário. Se você não tem familiaridade com isso, vale pedir pra quem configurou seu App/Pixel.',
        ],
        badge: 'manual',
      },
      {
        label: 'Website / Site da Empresa',
        what: 'Link do seu site — pré-preenche automaticamente o campo de link ao lançar uma campanha no wizard.',
        where: ['O próprio endereço do site da sua empresa, direto.'],
        badge: 'manual',
      },
    ],
  },
  {
    title: 'WhatsApp — Provider',
    intro: '4 campos (Phone Number ID, WABA ID, Access Token, Número exibido) estão planejados pra virar automáticos — um botão "Conectar WhatsApp" vai abrir um login com Facebook que preenche os 3 primeiros sozinho. Essa automação ainda não está pronta; por ora, todos continuam manuais.',
    fields: [
      {
        label: 'Embedded Signup Config ID',
        what: 'Configuração criada dentro do seu próprio App (o mesmo de "Meta Marketing API" acima) — permite que seus clientes conectem o WhatsApp deles sem precisar criar um App próprio. Mesmo quando a conexão automática existir, este campo continua manual — é algo que só você, dono do App, cria 1 vez.',
        where: [
          'Dentro do seu App (developers.facebook.com) → Adicionar Produto → "Facebook Login for Business" (se ainda não tiver).',
          'Dentro de Facebook Login for Business → criar 1 Configuração, na variação "WhatsApp Embedded Signup".',
          'Selecione as permissões "whatsapp_business_messaging" e "whatsapp_business_management".',
          'O Config ID gerado é o valor deste campo.',
        ],
        badge: 'self-chosen',
      },
      {
        label: 'Webhook Verify Token',
        what: 'Um segredo que VOCÊ escolhe (não a Meta) — qualquer texto — usado pra confirmar que as mensagens recebidas são realmente da Meta.',
        where: [
          'Invente um valor forte (ex.: uma senha aleatória) e cole aqui.',
          'Depois, configure esse MESMO valor no painel de Webhooks do seu App (developers.facebook.com → seu App → Webhooks → WhatsApp Business Account → campo "Verify Token").',
        ],
        badge: 'self-chosen',
      },
      {
        label: 'Phone Number ID',
        what: 'Identificador do número de telefone oficial dentro da WhatsApp Business Platform (não é o número de telefone em si).',
        where: [
          'business.facebook.com → WhatsApp Manager → selecione o número → aba "Configuração da API".',
          'O "Phone number ID" aparece listado ali.',
        ],
        link: { label: 'business.facebook.com/wa/manage', href: 'https://business.facebook.com/wa/manage' },
        badge: 'soon',
      },
      {
        label: 'WABA ID',
        what: 'ID da conta WhatsApp Business (WhatsApp Business Account) dona do número.',
        where: ['Mesma tela do Phone Number ID (WhatsApp Manager → Configuração da API) — "WhatsApp Business Account ID" aparece logo acima.'],
        badge: 'soon',
      },
      {
        label: 'Access Token (system user)',
        what: 'Token permanente de um Usuário de Sistema com permissão de enviar mensagem por aquele número.',
        where: [
          'business.facebook.com → Configurações do Negócio → Usuários → Usuários do Sistema → criar (ou reaproveitar) um Usuário de Sistema.',
          'Atribuir a ele acesso ao ativo "WhatsApp Business Account" correto, com a permissão "whatsapp_business_messaging".',
          'Gerar token de acesso (sem data de expiração) pra esse Usuário de Sistema.',
        ],
        badge: 'soon',
      },
      {
        label: 'Número exibido (opcional)',
        what: 'Só informativo — pra UI mostrar qual número é esse. Não afeta envio/recebimento.',
        where: ['O próprio número de telefone, no formato que preferir (ex.: +55 81 99999-0000).'],
        badge: 'soon',
      },
    ],
  },
];

// ─── Tokens (mesma paleta clara já usada em /admin/dados-empresa) ──────────────

const ink = { primary: '#111827', secondary: '#374151', muted: '#6b7280' };

// ─── Trigger ─────────────────────────────────────────────────────────────────

export function DadosEmpresaHelpButton() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const [open, setOpenState] = useState(false);

  useEffect(() => {
    if (open) { wasOpenRef.current = true; return; }
    if (wasOpenRef.current) { triggerRef.current?.focus(); wasOpenRef.current = false; }
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenState(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
        Ajuda
      </button>

      <AnimatePresence>
        {open && <HelpModal onClose={() => setOpenState(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const overlayMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } };
  const panelMotion = reduceMotion
    ? { initial: { opacity: 1, scale: 1, y: 0 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 1, scale: 1, y: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 10 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div
      {...overlayMotion}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        {...panelMotion}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dados-empresa-help-title"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.25)] overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="dados-empresa-help-title" className="text-lg font-bold leading-tight" style={{ color: ink.primary }}>
                Onde encontrar cada valor
              </h2>
              <p className="text-sm mt-0.5" style={{ color: ink.muted }}>
                Guia campo a campo — urls reais da Meta e o que fazer em cada uma
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Legenda dos badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(Object.keys(BADGE_CONFIG) as BadgeTone[]).map(tone => (
              <span key={tone} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${BADGE_CONFIG[tone].className}`}>
                {BADGE_CONFIG[tone].text}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">
          {SECTIONS.map((section, si) => (
            <section key={si}>
              <h3 className="text-[13px] font-black uppercase tracking-wide" style={{ color: ink.primary }}>
                {section.title}
              </h3>
              {section.intro && (
                <p className="text-xs leading-relaxed mt-1.5" style={{ color: ink.muted }}>{section.intro}</p>
              )}

              <div className="mt-3 space-y-4">
                {section.fields.map((f, fi) => (
                  <div key={fi} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: ink.primary }}>{f.label}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${BADGE_CONFIG[f.badge].className}`}>
                        {BADGE_CONFIG[f.badge].text}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: ink.secondary }}>{f.what}</p>
                    <ul className="mt-2.5 space-y-1.5">
                      {f.where.map((step, wi) => (
                        <li key={wi} className="flex gap-2 text-xs leading-relaxed" style={{ color: ink.muted }}>
                          <span className="shrink-0 mt-[3px] h-1 w-1 rounded-full bg-gray-300" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    {f.link && (
                      <a
                        href={f.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-blue-700 hover:underline"
                      >
                        {f.link.label}
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-center" style={{ color: '#94a3b8' }}>
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px] mx-0.5">Esc</kbd> ou clique fora para fechar
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
