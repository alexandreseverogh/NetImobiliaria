'use client';

/**
 * Guia "Como obter códigos para importação de campanhas" — mostrado na página de importação.
 * Os caminhos de menu do Meta mudam de tempo em tempo; as URLs apontam para as telas de entrada
 * oficiais. Se algum rótulo estiver diferente, a ideia do passo continua valendo.
 */
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Field = {
  label: string;
  required: boolean;
  where: string;        // onde obter no Meta
  url?: string;         // URL de entrada
  configure: string;    // onde colar na aplicação
};

const FIELDS: Field[] = [
  {
    label: 'Token de acesso (Access Token)',
    required: true,
    where: 'Crie um Usuário do Sistema no Gerenciador de Negócios, dê a ele acesso à conta de anúncios e gere o token com as permissões ads_read, ads_management e business_management. Um token de Usuário do Sistema não expira; um token de usuário comum expira.',
    url: 'https://business.facebook.com/settings/system-users',
    configure: 'Campanhas → Configurações → Redes → Meta Ads → campo "Access Token"',
  },
  {
    label: 'ID da conta de anúncios',
    required: true,
    where: 'Na lista de contas de anúncios, abra a conta desejada. O ID aparece no formato act_123456789 (pode colar com ou sem o prefixo act_).',
    url: 'https://business.facebook.com/settings/ad-accounts',
    configure: 'Campanhas → Configurações → Redes → Meta Ads → campo "ID da conta de anúncios"',
  },
  {
    label: 'App ID',
    required: true,
    where: 'Dentro do seu app em "Configurações → Básico". É o identificador numérico do app.',
    url: 'https://developers.facebook.com/apps/',
    configure: 'Campanhas → Configurações → Redes → Meta Ads → campo "App ID"',
  },
  {
    label: 'App Secret',
    required: true,
    where: 'Dentro do mesmo app, em "Configurações → Básico". Clique em "Mostrar" para ver o valor. Trate como senha: não compartilhe.',
    url: 'https://developers.facebook.com/apps/',
    configure: 'Campanhas → Configurações → Redes → Meta Ads → campo "App Secret"',
  },
  {
    label: 'ID da Página do Facebook',
    required: false,
    where: 'Necessário para lançar campanhas novas (não para importar). Abra a Página e veja o ID em "Sobre" ou nas configurações da Página.',
    url: 'https://business.facebook.com/settings/pages',
    configure: 'Campanhas → Configurações → Identidade Meta → "Facebook Page ID"',
  },
  {
    label: 'ID do Pixel',
    required: false,
    where: 'Necessário para medir conversões no site. No Gerenciador de Eventos, selecione o Pixel e copie o ID.',
    url: 'https://business.facebook.com/events_manager',
    configure: 'Campanhas → Configurações → Identidade Meta → "Meta Pixel ID"',
  },
  {
    label: 'ID da conta do Instagram',
    required: false,
    where: 'Necessário para anúncios no Instagram. Use o ID da conta profissional do Instagram vinculada à Página.',
    url: 'https://business.facebook.com/settings/instagram-accounts',
    configure: 'Campanhas → Configurações → Identidade Meta → "Instagram Actor ID"',
  },
];

export function ComoObterCodigosMetaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="como-obter-codigos-title"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Importação de campanhas</p>
            <h2 id="como-obter-codigos-title" className="text-xl font-black text-gray-900">Como obter os códigos do Meta</h2>
            <p className="text-sm text-gray-500 mt-1">
              Siga os passos abaixo uma única vez. Depois, cole cada código no campo indicado da aplicação.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>Entre no Gerenciador de Negócios do Meta com a conta que administra a empresa.</li>
            <li>Para cada campo abaixo, abra o link indicado e copie o valor.</li>
            <li>Cole o valor no campo correspondente em <strong>Campanhas → Configurações → Redes</strong> (ou em <strong>Identidade Meta</strong>, para os IDs de Página, Pixel e Instagram).</li>
            <li>Use o botão de validação da tela de Redes para confirmar que o Meta aceitou as credenciais.</li>
            <li>Volte a esta página e clique em <strong>Buscar campanhas no Meta</strong>.</li>
          </ol>

          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.label} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-black text-gray-900">{f.label}</p>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${f.required ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                    {f.required ? 'Obrigatório para importar' : 'Opcional'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{f.where}</p>
                {f.url && (
                  <p className="text-xs mt-2">
                    <span className="font-bold text-gray-500">Onde obter:</span>{' '}
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline break-all">{f.url}</a>
                  </p>
                )}
                <p className="text-xs mt-1">
                  <span className="font-bold text-gray-500">Onde configurar aqui:</span>{' '}
                  <span className="text-gray-700">{f.configure}</span>
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400">
            As telas do Meta podem mudar de nome com o tempo. Se não encontrar algum item no caminho indicado,
            procure pelo nome do campo dentro da tela do link. O token e o App Secret são credenciais: guarde-os
            só nas configurações da aplicação.
          </p>
        </div>
      </div>
    </div>
  );
}
