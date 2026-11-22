import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Artemis9',
  description: 'Condições de uso do site e dos serviços da Artemis9.',
};

// Página pública dos Termos de Uso (URL exigida pela Meta no cadastro do App).
// Mesmo conteúdo do modal exibido no rodapé da landing /artemis4.
export default function TermosDeUsoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-gray-800 leading-relaxed">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: 21/11/2026</p>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">1. Aceitação</h2>
        <p>
          Ao acessar o site e os serviços da <strong>Artemis9</strong> (CAMPOS TECHNOLOGY LTDA, CNPJ 29.278.729/0001-06),
          você concorda com estes Termos de Uso. Se não concordar, não utilize o site.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">2. Serviços</h2>
        <p>
          A Artemis9 oferece soluções de gestão de marketing digital e de relacionamento com clientes, incluindo
          gestão de campanhas, atendimento e análise de resultados. As funcionalidades podem variar conforme o plano contratado.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">3. Uso adequado</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Fornecer informações verdadeiras nos formulários e canais de contato.</li>
          <li>Não usar o site para atividades ilícitas, fraudulentas ou que violem direitos de terceiros.</li>
          <li>Não tentar acessar áreas restritas nem prejudicar o funcionamento da plataforma.</li>
        </ul>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">4. Propriedade intelectual</h2>
        <p>
          Marcas, textos, imagens e código do site são de titularidade da Artemis9 ou de seus licenciadores. Nenhum
          direito é transferido ao usuário além do necessário para o uso dos serviços.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">5. Terceiros</h2>
        <p>
          Integrações com plataformas de terceiros (como Meta, Google e WhatsApp) seguem as próprias políticas e termos
          dessas empresas.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">6. Limitação de responsabilidade</h2>
        <p>
          Os resultados de campanhas dependem de fatores de mercado e de terceiros. A Artemis9 não garante resultados
          específicos e não responde por indisponibilidades causadas por plataformas externas.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">7. Alterações</h2>
        <p>Estes termos podem ser atualizados. A versão vigente é sempre a publicada nesta página.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">8. Foro e contato</h2>
        <p>
          Fica eleito o foro da comarca de Recife/PE. Dúvidas: <strong>contato@artemis9.com.br</strong>.
        </p>
      </section>
    </main>
  );
}
