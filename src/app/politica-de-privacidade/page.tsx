import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Artemis9',
  description: 'Como a Artemis9 coleta, usa e protege os dados pessoais, e como solicitar a exclusão.',
};

// Página pública exigida pela Meta (URL de política de privacidade e de exclusão de dados do App).
// Campos entre colchetes devem ser preenchidos com os dados reais da empresa antes da publicação.
export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-gray-800 leading-relaxed">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: 21/11/2026</p>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">1. Quem somos</h2>
        <p>
          Esta política descreve como a <strong>Artemis9</strong> (CAMPOS TECHNOLOGY LTDA, CNPJ 29.278.729/0001-06,
          Rua Jorge de Lima, 245, Recife/PE) trata os dados pessoais de quem interage com nossos sites, formulários,
          anúncios e atendimento pelo WhatsApp.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">2. Dados que coletamos</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nome, telefone e e-mail informados em formulários de contato ou de interesse.</li>
          <li>Mensagens trocadas conosco pelo WhatsApp e outros canais de atendimento.</li>
          <li>Dados de navegação e de interação com nossos anúncios, usados para medir a eficácia das campanhas.</li>
        </ul>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">3. Como usamos seus dados</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Responder à sua solicitação e dar atendimento comercial.</li>
          <li>Mensurar o desempenho de anúncios e melhorar nossas campanhas.</li>
          <li>Cumprir obrigações legais.</li>
        </ul>
        <p>Não vendemos seus dados pessoais.</p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">4. Compartilhamento</h2>
        <p>
          Seus dados podem ser tratados por provedores que nos ajudam a operar (por exemplo, serviços de
          mensageria e de hospedagem), sempre sob obrigação de confidencialidade. Quando anúncios são
          veiculados em plataformas como Meta (Facebook e Instagram), essas plataformas tratam dados conforme
          as próprias políticas.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">5. Seus direitos e exclusão de dados</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados pessoais a qualquer momento. Para isso,
          envie um e-mail para <strong>contato@artemis9.com.br</strong> com o assunto &quot;Exclusão de dados&quot;,
          informando o telefone ou e-mail usado no contato. Respondemos em até 15 dias.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">6. Segurança</h2>
        <p>
          Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">7. Contato</h2>
        <p>
          Dúvidas sobre esta política: <strong>contato@artemis9.com.br</strong>.
        </p>
      </section>
    </main>
  );
}
