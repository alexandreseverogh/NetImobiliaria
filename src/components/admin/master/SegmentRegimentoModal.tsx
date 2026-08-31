'use client';

/**
 * "Regimento do Segmento" — substitui os 11 botões-ícone da coluna Ações de
 * /admin/master/segments (cada um só com um `title=` de hover como documentação) por um único
 * ponto de entrada. Aqui o Master lê o que cada ferramenta faz, como preencher, um exemplo real
 * e o impacto de configurar — e só then abre a ferramenta de verdade (mesmo componente, mesmo
 * comportamento de sempre), pelo botão "Abrir" de cada seção.
 *
 * Conteúdo de cada item foi extraído dos próprios componentes reais (help panels já existentes
 * em Angles/Interests/Benchmarks/DataEntities/Qualification/Agentes/FitCriteria/AtivoConfig, e
 * dos comentários de topo de Tenants/Distribution/LlmDefault) — nunca inventado.
 */

import { useState } from 'react';
import {
  XMarkIcon, ChevronDownIcon, ArrowRightIcon, BookOpenIcon,
  BuildingOffice2Icon, SparklesIcon, HashtagIcon, AdjustmentsHorizontalIcon,
  CircleStackIcon, UserGroupIcon, CpuChipIcon, BoltIcon, ScaleIcon,
  ArchiveBoxIcon, BeakerIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

export type RegimentoKey =
  | 'tenants' | 'angles' | 'interests' | 'benchmarks' | 'dataEntities'
  | 'distribution' | 'qualification' | 'agentes' | 'fitCriteria'
  | 'ativoConfig' | 'llmDefault';

interface Segment { id: string; name: string }

interface Props {
  segment: Segment;
  onClose: () => void;
  onOpen: (key: RegimentoKey) => void;
}

type ColorKey = 'sky' | 'violet' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'teal' | 'orange';

// Mesmas cores já usadas nos 11 botões-ícone da tabela — continuidade visual entre o índice e
// onde essas ferramentas já aparecem no resto da tela (badges, etc). Classes literais (não
// interpoladas) porque o Tailwind JIT não resolve `bg-${color}-50` com segurança.
const COLOR_MAP: Record<ColorKey, { icon: string; chip: string; button: string; panel: string }> = {
  sky:     { icon: 'text-sky-500',     chip: 'bg-sky-50 border-sky-200',         button: 'bg-sky-600 hover:bg-sky-700',         panel: 'bg-sky-50/60 border-sky-100' },
  violet:  { icon: 'text-violet-500',  chip: 'bg-violet-50 border-violet-200',   button: 'bg-violet-600 hover:bg-violet-700',   panel: 'bg-violet-50/60 border-violet-100' },
  indigo:  { icon: 'text-indigo-500',  chip: 'bg-indigo-50 border-indigo-200',   button: 'bg-indigo-600 hover:bg-indigo-700',   panel: 'bg-indigo-50/60 border-indigo-100' },
  amber:   { icon: 'text-amber-600',   chip: 'bg-amber-50 border-amber-200',     button: 'bg-amber-600 hover:bg-amber-700',     panel: 'bg-amber-50/60 border-amber-100' },
  emerald: { icon: 'text-emerald-500', chip: 'bg-emerald-50 border-emerald-200', button: 'bg-emerald-600 hover:bg-emerald-700', panel: 'bg-emerald-50/60 border-emerald-100' },
  rose:    { icon: 'text-rose-500',    chip: 'bg-rose-50 border-rose-200',       button: 'bg-rose-600 hover:bg-rose-700',       panel: 'bg-rose-50/60 border-rose-100' },
  teal:    { icon: 'text-teal-500',    chip: 'bg-teal-50 border-teal-200',       button: 'bg-teal-600 hover:bg-teal-700',       panel: 'bg-teal-50/60 border-teal-100' },
  orange:  { icon: 'text-orange-500',  chip: 'bg-orange-50 border-orange-200',   button: 'bg-orange-600 hover:bg-orange-700',   panel: 'bg-orange-50/60 border-orange-100' },
};

interface RegimentoItem {
  key: RegimentoKey;
  color: ColorKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  objective: string;
  howToFill: string[];
  example: string;
  impact: string;
}

const ITEMS: RegimentoItem[] = [
  {
    key: 'tenants', color: 'sky', icon: BuildingOffice2Icon,
    title: 'Empresas do Segmento',
    summary: 'Lista, somente leitura, de quais empresas (tenants) usam este segmento hoje.',
    objective:
      'Um raio-x rápido de quantas e quais empresas estão vinculadas a este segmento — nome, ' +
      'cidade/estado e status (ativa/inativa). Não configura nada; é consulta pura, com busca ' +
      'por nome e paginação (preparado pra centenas de empresas por segmento).',
    howToFill: ['Não há nada pra preencher aqui — a tela é 100% somente leitura.'],
    example: 'Buscar "Auto" pra achar rapidamente as concessionárias cadastradas neste segmento.',
    impact: 'Nenhum — é só consulta. Nada aqui altera dado nenhum da plataforma.',
  },
  {
    key: 'angles', color: 'violet', icon: SparklesIcon,
    title: 'Ângulos & Demanda (IA)',
    summary: 'Define os ângulos de comunicação do segmento e os termos que medem sua demanda no Google Trends.',
    objective:
      'Um ângulo é a razão emocional ou racional que leva o público a agir — o mesmo produto ' +
      'pode ser anunciado por ângulos bem diferentes, e o ângulo certo dobra a conversão sem ' +
      'mudar o investimento. Cada ângulo carrega 1 a 4 termos de busca reais, usados pra medir ' +
      'no Google Trends se aquele ângulo está aquecendo ou esfriando.',
    howToFill: [
      'Rótulo — nome do ângulo em PT-BR (ex.: "Preço Acessível").',
      'Slug — identificador estável; nunca mudar depois de campanhas lançadas (dado histórico fica atrelado a ele).',
      'Termos de Trends — específicos e com intenção clara (bom: "financiamento imobiliário"; evitar: "imóvel", genérico demais).',
      'Ou clique "Sugerir com IA" pra já vir com uma proposta pronta pra revisar.',
      'Recomendado: 3 a 6 ângulos por segmento — mais do que isso dificulta a análise comparativa.',
    ],
    example: 'Segmento Imobiliário → ângulo "Investimento" com termos "investir em imóvel", "imóvel para renda".',
    impact:
      'Vira opção de 1 clique no wizard de campanha de todo tenant deste segmento; alimenta o ' +
      'Radar de Demanda; e o Agente Autônomo cita o ângulo vencedor/perdedor ao recomendar ' +
      'escalar ou trocar criativo.',
  },
  {
    key: 'interests', color: 'indigo', icon: HashtagIcon,
    title: 'Interesses Meta',
    summary: 'Interesses de público-alvo (Meta Ads) sugeridos por padrão pra campanhas deste segmento.',
    objective:
      'Define QUEM vê os anúncios — segmentação de público no Meta. Os IDs são reais, resolvidos ' +
      'direto na Meta Targeting API (nunca inventados), então já são válidos pra targeting assim ' +
      'que salvos.',
    howToFill: [
      'Regra de ouro: combine 1 interesse de INTENÇÃO (quem está comprando/contratando agora) + 1-2 de CONTEXTO (estágio de vida ou comportamento adjacente).',
      'Nunca mais de 5-6 interesses juntos — o algoritmo do Meta perde foco e o público fica raso.',
      'Busque por termo no campo de busca (Meta API real) e clique pra adicionar, ou use "Sugerir com IA" — propõe termos por camada e já resolve os IDs.',
    ],
    example: 'Imobiliário → Intenção "Financiamento imobiliário" + Contexto "Recém-casados".',
    impact: 'Vira sugestão de 1 clique na etapa de público-alvo do wizard de campanha, pra todo tenant deste segmento.',
  },
  {
    key: 'benchmarks', color: 'amber', icon: AdjustmentsHorizontalIcon,
    title: 'Parâmetros do Agente',
    summary: 'Os limiares que o Agente Autônomo de Campanhas usa pra decidir quando e quanto agir.',
    objective:
      'Nenhum valor de decisão do agente fica fixo no código — tudo vem daqui, por segmento. ' +
      'Três grupos: Detecção (quando agir — CPL ideal/crítico, CTR mínimo, frequência máxima, ' +
      'gasto sem lead...), Execução (como agir — percentuais de aumento/redução de budget ao ' +
      'escalar ou reduzir) e Sinais & Aprendizado (pesos do índice de pressão e meta de ' +
      'conversões pra sair da fase de aprendizado do Meta).',
    howToFill: [
      'Detecção: valores em R$, % ou número puro que disparam pause/alerta/sugestão de escala.',
      'Execução: percentuais de aumento/redução real de orçamento — manter a Escala Máxima ≤25% pra não resetar o aprendizado do Meta.',
      'Sinais: pesos que precisam somar 1 entre si (engagement + conversão + qualidade).',
      'Precedência de resolução: cliente → tenant → segmento → global.',
    ],
    example: 'CPL Crítico R$ 80 → acima disso, o agente pausa a campanha automaticamente, sem esperar aprovação.',
    impact:
      'Afeta diretamente decisões automáticas reais (pausar, reduzir ou aumentar budget) de todo ' +
      'tenant deste segmento que não tiver override próprio.',
  },
  {
    key: 'dataEntities', color: 'emerald', icon: CircleStackIcon,
    title: 'Dados do Bot',
    summary: 'Quais tabelas e colunas o bot de WhatsApp/Mensageria deste segmento pode consultar numa conversa.',
    objective:
      'Cada entidade cadastrada aqui vira, automaticamente, uma ferramenta que o LLM do bot pode ' +
      'chamar durante uma conversa real — sem escrever nenhum código. O bot só enxerga o que for ' +
      'marcado "mostra" (aparece na resposta) ou "filtra" (o LLM pode buscar por isso), e nunca ' +
      'sai do isolamento por tenant.',
    howToFill: [
      'Por entidade: nome (o que o LLM vê), tabela física real, descrição (quando chamar essa ferramenta), coluna de tenant, filtro padrão, máx. resultados, coluna de identidade (PK).',
      'Colunas: marcar "mostra"/"filtra"/"cabeçalho" (título do item quando agrupado em cartões, só 1 por entidade)/"comparável" (permite ranquear, ex. "qual tem o menor preço")/"agrupável" (permite contar por categoria, ex. "em quais bairros").',
      'Relações (opcional): trazem dado de tabelas correlacionadas via uma tabela-ponte — ex. imóvel → imovel_amenidades → amenidades.nome. "array" pra listas, "count" pra contagem, "first" pra 1 valor só.',
      'Coluna numérica que é uma FK (ex. tipo_fk): preencha "tabela de lookup" pra o bot mostrar/filtrar pelo nome legível, nunca pelo id cru.',
    ],
    example: 'Entidade "imovel" → tabela "imoveis", coluna "bairro" marcada agrupável → o bot responde "em quais bairros vocês têm imóveis" contando 100% das categorias reais, não só uma amostra.',
    impact: 'O bot nunca escreve SQL — só toca exatamente nas tabelas/colunas cadastradas aqui, sempre isolado por tenant.',
  },
  {
    key: 'distribution', color: 'rose', icon: UserGroupIcon,
    title: 'Estratégias de Distribuição de Leads',
    summary: 'A sequência ORDENADA de regras que decide quem recebe cada lead novo deste segmento.',
    objective:
      'Substitui a cascata fixa que só fazia sentido pro Imobiliário — cada segmento monta sua ' +
      'própria combinação de etapas plugáveis (dono do ativo, área geográfica, fila/round robin, ' +
      'plantonista de fallback), sem precisar de código novo.',
    howToFill: [
      'Adicione estratégias do catálogo e reordene com as setas — o motor tenta a 1ª; se não achar candidato, tenta a 2ª, e assim por diante.',
      'Cada estratégia pode ter sua própria config (ex.: "Dono do Ativo" pede a tabela/coluna do imóvel/veículo e quem é o dono).',
      'Deixe sempre uma etapa de fallback (ex.: Plantonista) por último, pra nunca deixar lead sem responsável.',
    ],
    example: '1º Dono do Ativo → 2º Área Geográfica → 3º Plantonista (fallback final, sempre encontra alguém).',
    impact: 'É o motor real que roda a cada lead novo. Sem nenhuma estratégia configurada, leads deste segmento nunca são roteados automaticamente.',
  },
  {
    key: 'qualification', color: 'teal', icon: CpuChipIcon,
    title: 'Qualificação de Lead por IA (CRM)',
    summary: 'Regras padrão (palavra-chave → tag + resumo + score) e o interruptor que libera o CRM pro segmento.',
    objective:
      'A IA usa essas regras pra qualificar automaticamente cada lead novo — que tag de intenção ' +
      'ele demonstra e qual a prontidão dele (score 0-10). "IA Ativa" é o gate: enquanto estiver ' +
      'desligado, nenhum tenant deste segmento consegue usar o Kanban/gestão de leads (a ' +
      'captação de lead em si continua funcionando normalmente nesse meio tempo).',
    howToFill: [
      'Palavras-chave: gatilhos separadas por vírgula que disparam a regra (fallback determinístico + contexto pro LLM).',
      'Tag: rótulo curto da intenção (aparece na ficha do lead no Kanban).',
      'Resumo modelo: o que o atendente vê na ficha.',
      'Score base: 0 a 10 — quanto mais alto, maior a prontidão pra avançar.',
      'IA Ativa pode ser ligada mesmo com poucas regras — o motor sempre tem um fallback genérico.',
    ],
    example: 'Palavras "à vista, pix, dinheiro" → tag "Comprador à Vista", score 10.',
    impact:
      'Cada tenant do segmento herda essas regras por padrão (pode complementar em ' +
      '/crm/config/ia). Um agente diário compara a conversão real de cada regra com a nota ' +
      'cadastrada e sugere ajuste de score quando o desvio é grande.',
  },
  {
    key: 'agentes', color: 'orange', icon: BoltIcon,
    title: 'Agentes de Aceleração (CRM)',
    summary: 'Liga/desliga e parametriza os 5 agentes automáticos do CRM, por segmento.',
    objective:
      'Cada agente (Pendência de Atendimento, Estagnação de Etapa, Próxima Ação Sugerida, ' +
      'Reativação, Recalibração de Score) é um comportamento fixo no código — o que ele faz não ' +
      'muda — mas SE ele roda, e com qual limiar, é 100% definido aqui, por segmento.',
    howToFill: [
      'Ative/desative cada agente individualmente.',
      'Preencha os parâmetros reconhecidos — clique nos chips sugeridos pra já vir com o nome certo + valor padrão documentado, sem precisar decorar.',
      'Chave digitada errada (fora dos parâmetros reconhecidos daquele agente) é salva mas nunca lida — fica "morta", sem erro.',
    ],
    example: 'Agente "Reativação" com dias_inatividade=7 → depois de 7 dias sem resposta do cliente, a IA rascunha e ENVIA sozinha uma mensagem de reativação — a menos que requer_revisao_extra=true, aí exige aprovação humana por PIN antes de qualquer envio.',
    impact:
      '"Pendência de Atendimento" e "Reativação" são os únicos 2 capazes de reatribuir um lead ou ' +
      'falar com o cliente sozinhos, sem fila de aprovação por padrão — vale conferir com calma ' +
      'antes de ativar em segmento regulado (ex.: Saúde). Cada tenant pode sobrepor tudo em ' +
      '/crm/config/agentes.',
  },
  {
    key: 'fitCriteria', color: 'violet', icon: ScaleIcon,
    title: 'Critérios de Aderência (ICP)',
    summary: 'O quão bem um lead se encaixa no perfil ideal de cliente deste segmento — dimensão separada da intenção.',
    objective:
      'Aderência mede ENCAIXE, não interesse — um lead pode estar muito engajado (alta intenção) ' +
      'mas fora do perfil ideal, ou o contrário. Os dois scores nunca são combinados num "geral"; ' +
      'aparecem separados na ficha do lead.',
    howToFill: [
      'Critério em texto livre (ex.: "orçamento declarado compatível com o portfólio ativo") — a IA avalia com base na mensagem real, sem inventar dado que não foi dito.',
      'Peso: 0 a 10, o quanto esse critério pesa na avaliação geral.',
      'Opcional: um limiar de Aderência mínima pra disparar a Sugestão da IA já na captação, sem esperar o lead mudar de etapa (vazio = nunca dispara na captação).',
    ],
    example: '"Está dentro da área de cobertura atendida", peso 8.',
    impact: 'Sem nenhum critério cadastrado, a IA sempre retorna fit neutro (5) — não é erro, só falta curadoria. Cada tenant pode complementar em /crm/config/ia.',
  },
  {
    key: 'ativoConfig', color: 'amber', icon: ArchiveBoxIcon,
    title: 'Config do Ativo (Vínculo Exato)',
    summary: 'A tabela de inventário real (imóvel, veículo...) que um lead pode ser vinculado, e/ou o formulário de Perfil de Interesse.',
    objective:
      '"Origem dos Dados" é opcional — só preencha se este segmento já tem uma tabela real de ' +
      'inventário digitalizada. Sem ela, "Vínculo Exato" fica indisponível no Novo Lead, mas o ' +
      'formulário de Perfil de Interesse (mais simples, texto livre) funciona de qualquer forma.',
    howToFill: [
      'Entidade/Tabela + Coluna de Nome + Rótulo (PT-BR) — os 3 juntos, ou nenhum (nunca meio-preenchido).',
      'Badges: quais colunas aparecem na ficha do lead quando vinculado a um item exato.',
      'Formulário: campos livres do Perfil de Interesse — "Sugerir com IA" propõe campos e já marca 1-2 como obrigatórios (efeito real: trava o "Novo Lead" se não preenchido); revise antes de salvar.',
    ],
    example: 'Segmento Veículos → tabela "veiculos", badges Marca/Modelo/Ano/Preço.',
    impact: 'Cada tenant deste segmento herda isso e pode sobrepor tudo na própria conta, em /crm/config/segmentos.',
  },
  {
    key: 'llmDefault', color: 'sky', icon: BeakerIcon,
    title: 'Modelo de IA Padrão do Segmento',
    summary: 'O 3º nível da cascata Cliente → Tenant → Segmento → Global de modelo de LLM (só CRM/Mensageria).',
    objective:
      'Usado só quando um tenant deste segmento (ou um cliente dele) não tem modelo próprio ' +
      'configurado. O módulo de Campanhas de Marketing Digital NUNCA usa este nível — sempre usa ' +
      'o modelo único e global da plataforma, de propósito.',
    howToFill: ['Escolha provider + modelo + API key, ou deixe "Sem default" pra herdar a linha global da plataforma.'],
    example: 'Segmento com alto volume de mensagens pode usar um modelo mais rápido/barato como padrão, mesmo com o resto da plataforma usando outro globalmente.',
    impact: 'Só entra em jogo quando tenant/cliente deste segmento não tem config própria — nunca sobrescreve um modelo já configurado por eles.',
  },
];

function AccordionRow({
  item, open, onToggle, onOpen,
}: {
  item: RegimentoItem;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const colors = COLOR_MAP[item.color];
  const Icon = item.icon;
  return (
    <div className={cn('rounded-2xl border transition-all', open ? colors.chip : 'border-gray-200 bg-white')}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={cn('h-9 w-9 shrink-0 rounded-xl flex items-center justify-center border', colors.chip)}>
          <Icon className={cn('h-4.5 w-4.5', colors.icon)} />
        </div>
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-black text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-500 truncate">{item.summary}</p>
        </button>
        <button
          onClick={onOpen}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95',
            colors.button,
          )}
        >
          Abrir
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggle}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-white/60 hover:text-gray-700 transition-colors"
          title={open ? 'Recolher detalhes' : 'Ver detalhes'}
        >
          <ChevronDownIcon className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Objetivo</p>
            <p className="text-xs text-gray-700 leading-relaxed">{item.objective}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Como preencher</p>
            <ul className="space-y-1">
              {item.howToFill.map((line, i) => (
                <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                  <span className="text-gray-300 shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn('rounded-xl border px-3 py-2.5', colors.panel)}>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Exemplo</p>
            <p className="text-xs text-gray-700 leading-relaxed">{item.example}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impacto</p>
            <p className="text-xs text-gray-700 leading-relaxed">{item.impact}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SegmentRegimentoModal({ segment, onClose, onOpen }: Props) {
  const [openKeys, setOpenKeys] = useState<Set<RegimentoKey>>(new Set());

  function toggle(key: RegimentoKey) {
    setOpenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-7 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              <BookOpenIcon className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">
                Segmento · {segment.name}
              </p>
              <h2 className="text-lg font-black leading-tight">Regimento do Segmento</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors shrink-0">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Intro */}
        <div className="px-7 pt-5 pb-1 shrink-0">
          <p className="text-xs text-gray-500 leading-relaxed">
            As 11 ferramentas de configuração deste segmento, documentadas — o que cada uma faz,
            como preencher, um exemplo real e o impacto de configurar. Clique no título pra
            expandir os detalhes, ou vá direto no botão <span className="font-bold text-gray-700">Abrir</span>{' '}
            quando já souber o que quer.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-4 space-y-2.5">
          {ITEMS.map(item => (
            <AccordionRow
              key={item.key}
              item={item}
              open={openKeys.has(item.key)}
              onToggle={() => toggle(item.key)}
              onOpen={() => onOpen(item.key)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end shrink-0">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
