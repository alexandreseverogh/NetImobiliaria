'use client';

/**
 * Instruções de "como colar o código de rastreio manual no anúncio, direto na Meta" —
 * docs/PLANO_REF_MANUAL_CAMPANHA_IMPORTADA.md §3.4. Componente compartilhado, usado em 2
 * lugares: inline em `/admin/campanhas/importar` (contexto de uso real, junto do código gerado)
 * e dentro do modal "Ajuda" de `/admin/dados-empresa` (referência consolidada, a pedido do
 * usuário) — mesmo texto nos dois, nunca duplicado.
 */

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function ManualRefInstructions({ showMecanismosLink = false }: { showMecanismosLink?: boolean }) {
  return (
    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-gray-700">
          Cole esse código <strong>direto na mensagem pré-preenchida</strong> do anúncio, dentro
          da Meta — a partir desse momento, conversas <strong>novas</strong> vão gerar lead no
          CRM e conversa na Mensageria automaticamente. Conversas que já aconteceram antes de
          colar o código <strong>nunca podem ser recuperadas</strong> — o código precisa estar
          na mensagem no momento em que o lead a envia.
        </p>
      </div>
      <ol className="space-y-2 pl-1">
        <li className="flex gap-2 text-xs text-gray-600">
          <span className="shrink-0 h-5 w-5 rounded-full border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-700">1</span>
          <span>No Gerenciador de Anúncios da Meta, abra o anúncio (objetivo "Clique para o WhatsApp") e edite a mensagem pré-preenchida do CTA.</span>
        </li>
        <li className="flex gap-2 text-xs text-gray-600">
          <span className="shrink-0 h-5 w-5 rounded-full border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-700">2</span>
          <span>Cole o código em qualquer posição do texto (início, meio ou fim — o sistema reconhece de qualquer jeito).</span>
        </li>
        <li className="flex gap-2 text-xs text-gray-600">
          <span className="shrink-0 h-5 w-5 rounded-full border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-700">3</span>
          <span>Salve/publique a alteração. Pronto — sem nenhum passo adicional nesta plataforma.</span>
        </li>
      </ol>
      {showMecanismosLink && (
        <p className="text-[11px] text-gray-400">
          Se o anúncio direciona pra um site/formulário (não abre o WhatsApp direto), use o{' '}
          <a href="/admin/campanhas/mecanismos" className="text-blue-700 font-bold hover:underline">Destino de CTA</a>{' '}
          em vez deste código.
        </p>
      )}
    </div>
  );
}
