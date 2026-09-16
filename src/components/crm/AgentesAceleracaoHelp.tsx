'use client';

/**
 * Conteúdo de ajuda dos Agentes de Aceleração do CRM — compartilhado entre as 2 telas que o
 * expõem: o Master, em `/admin/master/segments` → "Agentes de Aceleração" (padrão por
 * segmento), e o tenant, em `/crm/config/agentes` (override por empresa). Extraído pra cá pra
 * nunca divergir entre as duas — o mesmo texto, a mesma pergunta respondida, nos 2 lugares.
 *
 * Cada host renderiza o próprio card/painel por fora (cor de fundo, padding, cantos já
 * seguem o padrão visual de cada tela) e só passa `intro`/`isDark` — este componente cuida
 * só do CONTEÚDO: a visão geral de PIN/cron + o detalhe agente a agente.
 */

import type { ReactNode } from 'react';

interface ParamHint { key: string; label: string; default: string }
interface CatalogAgent { key: string; label: string; description: string; paramHints?: ParamHint[] }

interface Props {
  catalog: CatalogAgent[];
  /** Parágrafo de abertura — muda de moldura conforme quem está lendo (Master vs tenant). */
  intro: ReactNode;
  /** A tela do tenant é dark-mode aware; o modal do Master é sempre claro. */
  isDark?: boolean;
  /** Nota de fechamento específica do host (Master: "override por tenant"; tenant: as 3 opções herdar/forçar). */
  children?: ReactNode;
}

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'];

const CRON_ROWS: Array<{ job: string; cadencia: string; oQueRoda: string }> = [
  { job: 'agentes-scan', cadencia: 'a cada 5 min', oQueRoda: 'Pendência de Atendimento, Estagnação por Etapa, Reativação' },
  { job: 'score-recalibration', cadencia: 'diário, 04:00', oQueRoda: 'Recalibração de Score — não é por lead, é por REGRA de qualificação' },
  { job: 'pendencia-reconciliar', cadencia: 'diário, 03:30', oQueRoda: 'Rede de segurança — corrige estado que não foi materializado na escrita' },
  { job: '(sem cron)', cadencia: 'ao mudar de coluna do lead', oQueRoda: 'Próxima Ação Sugerida — dispara sozinha, nunca por varredura' },
];

export function AgentesAceleracaoHelp({ catalog, intro, isDark = false, children }: Props) {
  const heading = isDark ? 'text-white' : 'text-gray-900';
  const divider = isDark ? 'border-orange-500/20' : 'border-orange-200/70';
  const code = isDark ? 'bg-white/10 text-orange-300' : 'bg-white text-gray-700';
  const tableBorder = isDark ? 'border-white/10' : 'border-gray-200';

  const Code = ({ children: c }: { children: ReactNode }) => (
    <code className={`font-mono px-1 rounded ${code}`}>{c}</code>
  );

  return (
    <div className="space-y-4 text-[12px] leading-relaxed">
      <div>
        <p className={`font-black mb-1 ${heading}`}>Como funciona esta tela</p>
        {intro}
      </div>

      <div className={`pt-3 border-t ${divider}`}>
        <p>
          <span className="font-semibold">⏸️ Nota temporária (2026-09-01):</span> o canal de
          Slack de todos os agentes (CRM e Campanhas) está pausado no código enquanto o
          desacoplamento entre módulos é feito em partes, começando só por WhatsApp/Evolution.
          Nenhuma notificação some — só deixa de sair também por Slack; o WhatsApp continua
          funcionando normalmente. Reativação é reversível e já está planejada pra uma rodada
          futura dedicada.
        </p>
      </div>

      <div className={`pt-3 border-t space-y-2 ${divider}`}>
        <p className={`font-black ${heading}`}>PIN, aprovação e prioridade — visão geral</p>
        <p>
          <span className="font-semibold">PIN só existe para um agente</span> — "Reativação de
          Lead Inativo" — e só quando o parâmetro <Code>requer_revisao_extra</Code> está ligado.
          Nenhum outro agente do catálogo pede aprovação nem gera PIN: cada um dispara sozinho
          (avisa, reatribui, ou sugere) sem passar por ninguém.
        </p>
        <p>
          Quando o PIN existe, há <span className="font-semibold">2 jeitos de decidir a mesma
          ação</span> — a decisão em si é idêntica, só muda como a pessoa prova quem é: um link
          de WhatsApp com <span className="font-semibold">PIN de 6 dígitos</span> (sem sessão
          nenhuma — o PIN é a única prova, expira em 24h), ou a aba{' '}
          <span className="font-semibold">"Aprovações Pendentes"</span> aqui mesmo em{' '}
          <Code>/crm/config/agentes</Code> (a sessão logada já é a prova, sem precisar de PIN).
        </p>
        <p>
          <span className="font-semibold">"Priorização" não é uma fila única entre agentes.</span>{' '}
          Todos rodam na mesma varredura, mas só o de Pendência de Atendimento tem uma escada
          real de urgência crescente (4 degraus: avisa → escala ao gestor → reatribui sozinho →
          fila de resgate), controlada pelos parâmetros dele. Os demais só "disparam" ou "não
          disparam" — sem grau intermediário.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b ${tableBorder}`}>
                <th className={`py-1 pr-3 font-black ${heading}`}>Job</th>
                <th className={`py-1 pr-3 font-black ${heading}`}>Cadência</th>
                <th className={`py-1 font-black ${heading}`}>O que roda</th>
              </tr>
            </thead>
            <tbody>
              {CRON_ROWS.map((row) => (
                <tr key={row.job} className={`border-b last:border-0 ${tableBorder}`}>
                  <td className="py-1 pr-3"><Code>{row.job}</Code></td>
                  <td className="py-1 pr-3 whitespace-nowrap">{row.cadencia}</td>
                  <td className="py-1">{row.oQueRoda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {catalog.map((agent, i) => (
        <div key={agent.key} className={`pt-3 border-t first:pt-0 first:border-0 ${divider}`}>
          <p className={`font-black ${heading}`}>{ORDINAL[i] ?? `${i + 1}º`} Agente — {agent.label}</p>
          {agent.key === 'pendencia_atendimento' && (
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li><span className="font-semibold">Quando roda:</span> verificação automática a cada 5 minutos. Diferente de tudo que existia antes, ele não olha só o primeiro contato — ele acompanha, o tempo todo, <span className="font-semibold">de quem é a bola</span>: se o lead chegou, mandou mensagem ou o atendente registrou um retorno do cliente, o lead passa a aguardar uma ação nossa e o relógio corre. Assim que alguém responde de verdade, o relógio zera. Se o cliente escrever de novo, ele reinicia — no 2º, no 3º, no 40º toque.</li>
              <li><span className="font-semibold">Parâmetros reconhecidos:</span> <Code>minutos_1o_contato</Code> — prazo do primeiro contato, que é legitimamente mais curto (sem preencher, usa 30); <Code>minutos_continuidade</Code> — prazo do 2º toque em diante, quando a conversa já está andando (sem preencher, usa 240 = 4h); <Code>fator_escalonamento</Code> — quantas vezes o prazo precisa estourar para escalar ao gestor (sem preencher, usa 3); <Code>fator_reatribuicao</Code> — quantas vezes o prazo precisa estourar para o lead trocar de atendente sozinho (sem preencher, usa 6).</li>
              <li><span className="font-semibold">Escada automática, sem fila de aprovação:</span> 1º avisa sobre o responsável → 2º escala ao gestor → 3º <span className="font-semibold">passa o lead para outro atendente automaticamente</span>, usando as mesmas regras de distribuição já configuradas para este segmento. Se o responsável estiver marcado como indisponível (férias/atestado), o lead <span className="font-semibold">pula direto para o escalonamento</span> — e, quando o lead for reatribuído, quem estava de licença <span className="font-semibold">não leva penalidade</span>: perde o lead, mas não é punido por estar doente.</li>
              <li><span className="font-semibold">Quem está indisponível sai da fila:</span> ninguém marcado como ausente recebe lead novo — nem na captação, nem no transbordo, nem nesta reatribuição. Isso vale inclusive para o dono da carteira e para o plantonista.</li>
              <li><span className="font-semibold">Onde aparece:</span> WhatsApp do tenant (Slack temporariamente pausado, ver nota no topo), em <span className="font-semibold">mensagem agrupada</span> (uma por rodada, organizada por responsável) — nunca uma mensagem por lead, o que seria inutilizável numa operação grande. Cada ocorrência fica registrada individualmente para auditoria.</li>
            </ul>
          )}
          {agent.key === 'stage_stagnation' && (
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li><span className="font-semibold">Quando roda:</span> mesma verificação a cada 5 minutos — olha quanto tempo cada lead está PARADO na etapa atual (sem toque humano desde que entrou nela) e compara com o prazo daquela etapa.</li>
              <li><span className="font-semibold">Parâmetro reconhecido:</span> nenhum. O prazo de cada etapa <span className="font-semibold">não vem daqui</span> — vem de "Personalização Kanban" (o próprio tenant configura, coluna por coluna, um campo "SLA" em horas; padrão 24h se ninguém mexer). Se adicionar um parâmetro aqui mesmo assim, ele fica salvo mas nunca é lido por este agente.</li>
              <li><span className="font-semibold">Onde aparece no CRM:</span> mesma limitação do 1º agente — só WhatsApp do tenant (Slack pausado), nada visível ainda dentro do Kanban em si.</li>
            </ul>
          )}
          {agent.key === 'next_best_action' && (
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li><span className="font-semibold">Quando roda:</span> diferente dos outros — não é verificação por tempo, não passa por nenhum cron. Dispara sozinho toda vez que o lead muda de coluna no Kanban, e também sob demanda (botão "Atualizar sugestão" na ficha do lead).</li>
              <li><span className="font-semibold">Parâmetro reconhecido:</span> <Code>qtd_atividades_contexto</Code> — quantas das atividades mais recentes do lead a IA vê antes de sugerir a próxima ação (1 a 20). Sem preencher, usa 5.</li>
              <li><span className="font-semibold">Onde aparece no CRM:</span> este é o único dos três com efeito visível <span className="font-semibold">dentro do próprio CRM</span> hoje — card "Sugestão da IA" na ficha do lead (`/crm/kanban`), com botão "Registrar como Atividade". Nunca manda WhatsApp, nunca precisa de aprovação nem PIN — é só uma sugestão de texto.</li>
            </ul>
          )}
          {agent.key === 'reactivation' && (
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li><span className="font-semibold">Quando roda:</span> a cada 5 minutos, sobre leads em que <span className="font-semibold">a bola está com o cliente</span> — nós já respondemos e é ele quem sumiu. Lead que está esperando resposta NOSSA nunca entra aqui (esse é assunto do agente de Pendência de Atendimento, que escala internamente em vez de cutucar o cliente).</li>
              <li><span className="font-semibold">Parâmetros reconhecidos:</span> <Code>dias_inatividade</Code> — quantos dias de silêncio do cliente até reativar (sem preencher, usa 7); <Code>requer_revisao_extra</Code> — escreva <Code>true</Code> para segmentos regulados (ex.: Saúde) onde nenhuma mensagem pode sair sem um humano ler antes.</li>
              <li><span className="font-semibold">Este agente FALA com o lead — e, por padrão, sozinho:</span> a IA rascunha a mensagem de reativação e o sistema <span className="font-semibold">envia automaticamente</span> pelo WhatsApp, sem fila de aprovação e sem PIN. O tenant é avisado depois, com o texto exato que foi enviado. É deliberado: a plataforma opera call centers grandes, e esperar aprovação humana lead a lead recria o gargalo que todo o resto elimina.</li>
              <li><span className="font-semibold">Como travar o envio automático:</span> preencha <Code>requer_revisao_extra</Code> = <Code>true</Code>. Aí sim nada sai sozinho: chega um WhatsApp pro tenant com o rascunho + PIN de 6 dígitos, e a mensagem só vai pro lead depois que um humano revisar (podendo editar o texto) e aprovar. Rejeitar descarta sem enviar nada.</li>
              <li><span className="font-semibold">Onde aparece no CRM:</span> com revisão extra ligada, na aba "Aprovações Pendentes" em <Code>/crm/config/agentes</Code> (aprovar/rejeitar logado, sem precisar do PIN) + o link por PIN no WhatsApp, como caminho alternativo pra quem não está com a plataforma aberta.</li>
            </ul>
          )}
          {agent.key === 'score_recalibration' && (
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li><span className="font-semibold">Quando roda:</span> uma vez por dia (04:00), não a cada 5 minutos — é o único agente que não olha leads, e sim as <span className="font-semibold">regras de qualificação</span> deste segmento. Ele compara a nota que cada regra dá com a taxa de conversão que aquela regra realmente produziu.</li>
              <li><span className="font-semibold">Parâmetros reconhecidos:</span> <Code>janela_dias</Code> — período analisado (sem preencher, usa 90); <Code>divergencia_minima_pct</Code> — o quanto a nota precisa estar distante da realidade para virar sugestão (sem preencher, usa 30); <Code>min_leads_amostra</Code> — mínimo de leads para a estatística contar (sem preencher, usa 10).</li>
              <li><span className="font-semibold">O que ele muda sozinho e o que pede aprovação:</span> reordenar a prioridade das regras pela conversão real é automático (é só ordem interna de avaliação). Já <span className="font-semibold">mudar a nota</span> de uma regra vira uma sugestão que espera um clique seu — sem PIN, é decisão 1-clique dentro da própria tela, já que quem decide já está logado.</li>
              <li><span className="font-semibold">Onde aparece:</span> junto de cada regra em "Qualificação de Lead por IA (CRM)" — na versão do Master em <Code>/admin/master/segments</Code> e na do tenant em <Code>/crm/config/ia</Code>. Não passa pela aba "Aprovações Pendentes" — é um mecanismo próprio, separado do PIN de reativação.</li>
            </ul>
          )}
          {!['pendencia_atendimento', 'stage_stagnation', 'next_best_action', 'reactivation', 'score_recalibration'].includes(agent.key) && (
            <p className={`mt-1 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Documentação deste agente ainda não escrita aqui — ver docs/PLANO_AGENTES_ACELERACAO_CRM.md.</p>
          )}
        </div>
      ))}

      <div className={`pt-3 border-t space-y-1 ${divider}`}>
        <p className={`font-black ${heading}`}>Se você preencher mais de um parâmetro no mesmo agente</p>
        <ul className="space-y-1 list-disc pl-4">
          <li>Só as chaves que o agente reconhece (listadas acima, e sugeridas como chip clicável em cada card) têm efeito real. Qualquer outra chave digitada é salva no banco, mas nunca é lida — fica "morta", sem erro nem aviso na tela.</li>
          <li>Não é possível ter a <span className="font-semibold">mesma chave duas vezes</span>: o parâmetro é guardado como par chave→valor, então renomear uma linha pro nome de outra que já existe sobrescreve a anterior silenciosamente (perde o valor de antes).</li>
        </ul>
      </div>

      {children}
    </div>
  );
}
