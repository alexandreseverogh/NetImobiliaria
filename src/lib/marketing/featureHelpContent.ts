/**
 * Conteúdo dos modais "Ajuda" das 4 páginas do módulo de Campanhas cuja função não é óbvia só
 * pelo nome/descrição na sidebar: Galeria de Criativos, Iniciativas, Destinos de CTA e
 * Mecanismos. Cada entrada documenta o que a feature FAZ DE VERDADE (confirmado lendo o código
 * real — CampaignWizard.tsx, campaigns/route.ts, destinos/page.tsx, mecanismos/page.tsx — não
 * suposto a partir do nome), como usar, o ganho esperado, e como ela se conecta com o resto do
 * módulo. Centralizado aqui (não espalhado dentro de cada page.tsx) para ficar fácil de manter
 * as 4 narrativas coerentes entre si — elas se referenciam mutuamente.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  PhotoIcon,
  FlagIcon,
  LinkIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

export interface HelpStep {
  title: string;
  detail: string;
}

export interface HelpLink {
  label: string;
  href: string;
  detail: string;
}

export interface FeatureHelpContent {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  tagline: string;
  whatIsIt: string[];
  howToUse: HelpStep[];
  benefits: string[];
  integration: HelpLink[];
}

export const CRIATIVOS_HELP: FeatureHelpContent = {
  icon: PhotoIcon,
  title: 'Galeria de Criativos',
  tagline: 'A biblioteca central de imagens — analisada por IA assim que entra.',
  whatIsIt: [
    'É onde ficam todas as imagens usadas (ou disponíveis para uso) em anúncios: enviadas do seu computador ou, quando o segmento do seu negócio permite, geradas diretamente por IA.',
    'Cada imagem, assim que entra na galeria, passa por uma análise automática de visão computacional — a plataforma identifica sozinha o tipo de gancho (o que prende a atenção nos primeiros segundos), o ângulo de comunicação e o tom emocional daquela peça, sem você precisar classificar nada manualmente.',
  ],
  howToUse: [
    {
      title: 'Adicione criativos à galeria',
      detail: 'Envie imagens do computador pelo botão "Adicionar Criativos", ou use "Gerar com IA" quando disponível para o seu segmento de negócio.',
    },
    {
      title: 'Deixe a análise rodar',
      detail: 'A classificação de gancho e ângulo acontece sozinha em segundo plano — não precisa esperar nem preencher nada.',
    },
    {
      title: 'Escolha na hora de lançar',
      detail: 'Ao criar uma campanha nova, a mesma galeria é a fonte das imagens disponíveis para seleção.',
    },
    {
      title: 'O ciclo se fecha depois do lançamento',
      detail: 'A imagem usada fica vinculada à campanha e ao anúncio real — é isso que permite comparar, depois, o que foi anunciado com o que de fato performou.',
    },
  ],
  benefits: [
    'Nunca lança um anúncio "no escuro": todo criativo já chega pré-analisado antes mesmo de virar campanha.',
    '"Padrões Vencedores" (botão no topo da galeria) mostra objetivamente qual gancho e qual ângulo têm o menor CPL real — tira a escolha do achismo.',
    'Alerta automático de saturação de gancho: quando muitos anúncios ativos repetem o mesmo tipo de abertura, a plataforma avisa (risco real de fadiga e CPL subindo) e sugere alternativas.',
    'Reaproveita a mesma imagem em várias campanhas sem precisar reenviar o arquivo.',
  ],
  integration: [
    {
      label: 'Lançar Campanha',
      href: '/admin/campanhas/nova',
      detail: 'É de lá que a galeria é aberta para escolher as imagens da campanha nova.',
    },
    {
      label: 'Painel de Campanhas',
      href: '/admin/campanhas/dashboard',
      detail: 'O CPL e CTR reais de cada campanha alimentam de volta os "Padrões Vencedores" da galeria.',
    },
  ],
};

export const INICIATIVAS_HELP: FeatureHelpContent = {
  icon: FlagIcon,
  title: 'Iniciativas de Campanha',
  tagline: 'Um objetivo, um orçamento, várias campanhas — acompanhados juntos.',
  whatIsIt: [
    'É uma camada acima das campanhas individuais: agrupa várias campanhas — de redes diferentes, tipos diferentes — sob um mesmo objetivo estratégico, um orçamento total planejado, um período e uma meta de KPI (ex.: número de leads).',
    'Serve para responder uma pergunta que nenhuma campanha isolada responde sozinha: "este esforço, como um todo, está indo bem?".',
  ],
  howToUse: [
    {
      title: 'Crie a iniciativa',
      detail: 'Nome, objetivo, orçamento total planejado, data de início/fim e o KPI principal com a meta numérica (ex.: 200 leads).',
    },
    {
      title: 'Vincule campanhas a ela',
      detail: 'No passo de revisão do assistente de lançamento, escolha a iniciativa no campo opcional "Iniciativa de Marketing" — pode vincular quantas campanhas quiser.',
    },
    {
      title: 'Acompanhe o consolidado',
      detail: 'A tela da iniciativa soma sozinha as métricas de todas as campanhas vinculadas — não precisa somar nada manualmente.',
    },
  ],
  benefits: [
    'Ritmo de Orçamento: projeta, a partir do gasto diário real, se a verba vai durar até o fim do período ou vai acabar antes — e quantos dias de fôlego ainda restam.',
    'Progresso de Meta: compara visualmente o quanto da meta já foi atingido contra o quanto do tempo já passou, revelando se você está atrasado antes que seja tarde demais para reagir.',
    'Briefing Consolidado com IA: 1 clique gera uma análise de texto cruzando todas as campanhas da iniciativa — sem precisar montar esse resumo à mão.',
  ],
  integration: [
    {
      label: 'Lançar Campanha',
      href: '/admin/campanhas/nova',
      detail: 'O vínculo com a iniciativa é escolhido ali, no passo final do assistente.',
    },
    {
      label: 'Painel de Campanhas',
      href: '/admin/campanhas/dashboard',
      detail: 'Mesmo motor de métricas — a iniciativa só soma o que já existe por campanha, nunca recalcula nada à parte.',
    },
  ],
};

export const DESTINOS_HELP: FeatureHelpContent = {
  icon: LinkIcon,
  title: 'Destinos de CTA',
  tagline: 'Para onde o clique no anúncio leva a pessoa.',
  whatIsIt: [
    'Todo anúncio tem um botão de chamada para ação — "Saiba Mais", "Fale Conosco", "Comprar Agora". Um Destino de CTA define para ONDE esse clique leva.',
    'Existem 3 tipos: um formulário hospedado pela própria plataforma (captura os dados e já cria o lead sozinho — útil para quem ainda não tem site pronto), um número de WhatsApp, ou uma URL externa (ex.: seu próprio site).',
  ],
  howToUse: [
    {
      title: 'Crie um destino',
      detail: 'Botão "Novo destino" → escolha o tipo (formulário, WhatsApp ou URL externa) e configure os campos ou o número.',
    },
    {
      title: 'Selecione no lançamento',
      detail: 'Ao montar uma campanha no assistente, o destino aparece pronto para escolher no passo de configuração do CTA — a URL final é preenchida sozinha.',
    },
    {
      title: 'Acompanhe a conversão',
      detail: 'Cada destino tem métricas próprias (cliques recebidos, quantos viraram lead) — acessíveis pelo ícone de gráfico no card do destino.',
    },
  ],
  benefits: [
    'Quem ainda não tem site pronto consegue lançar uma campanha real no mesmo dia, usando o formulário hospedado pela própria plataforma.',
    'Toda captura pelo formulário hospedado já nasce como lead identificado no CRM — sem integração manual nenhuma.',
    'Métrica de conversão por destino específico, não só por campanha inteira — mostra se o gargalo está no anúncio ou na página de captura.',
  ],
  integration: [
    {
      label: 'Lançar Campanha',
      href: '/admin/campanhas/nova',
      detail: 'O destino é escolhido dentro do assistente, no passo de configuração do CTA.',
    },
    {
      label: 'Mecanismos',
      href: '/admin/campanhas/mecanismos',
      detail: 'A aba "Link Rastreado" usa o link de um destino já cadastrado aqui, mesmo em campanhas geridas fora desta plataforma.',
    },
    {
      label: 'Leads de Campanhas',
      href: '/admin/campanhas/leads',
      detail: 'É onde aparecem os leads capturados por um formulário hospedado.',
    },
  ],
};

export const MECANISMOS_HELP: FeatureHelpContent = {
  icon: SignalIcon,
  title: 'Mecanismos',
  tagline: 'Os 4 caminhos técnicos por onde um lead chega até o CRM já atribuído certo.',
  whatIsIt: [
    'É a infraestrutura de rastreamento por trás de tudo: os 4 jeitos diferentes pelos quais um clique ou um lead externo pode chegar ao CRM e ficar corretamente vinculado à campanha e ao anúncio de origem.',
    'Fica especialmente útil quando parte da operação de anúncios acontece FORA desta plataforma — por exemplo, uma campanha configurada direto no Meta Ads Manager pelo gestor de tráfego.',
  ],
  howToUse: [
    {
      title: 'B · Link Rastreado',
      detail: 'Pegue o link de um Destino de CTA já cadastrado e use-o em qualquer lugar — inclusive numa campanha lançada fora desta plataforma. O clique já chega rastreado, com UTM.',
    },
    {
      title: 'C · API / Webhook',
      detail: 'Para sistemas próprios ou formulários de terceiros empurrarem um lead direto para o CRM, usando uma chave de API.',
    },
    {
      title: 'D · Meta Lead Ads',
      detail: 'Recebe automaticamente os leads captados pelos Formulários Instantâneos nativos do próprio Meta — sem precisar de nenhuma página de destino.',
    },
    {
      title: 'E · WhatsApp (Evolution)',
      detail: 'Configuração do canal de WhatsApp — toda resposta que carrega a marca de rastreio do anúncio entra já atribuída à campanha certa.',
    },
  ],
  benefits: [
    'Cobre cada jeito real de anunciar — não só as campanhas lançadas por este sistema, também as que o gestor de tráfego configura direto no Meta Ads Manager.',
    'Nenhum lead fica "órfão" sem saber de qual campanha ou anúncio veio, mesmo chegando por um caminho totalmente externo.',
    'Um único painel central para configurar todos os canais de entrada, em vez de espalhado em telas diferentes.',
  ],
  integration: [
    {
      label: 'Destinos de CTA',
      href: '/admin/campanhas/destinos',
      detail: 'Pré-requisito direto da aba "Link Rastreado" — é de lá que o link vem.',
    },
    {
      label: 'Leads de Campanhas',
      href: '/admin/campanhas/leads',
      detail: 'Onde aparece, já atribuído, o resultado de qualquer um dos 4 mecanismos.',
    },
    {
      label: 'Analytics de Captura',
      href: '/admin/campanhas/cta-analytics',
      detail: 'Visão dedicada de performance por canal de entrada.',
    },
  ],
};
