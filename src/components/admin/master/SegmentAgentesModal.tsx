'use client';

/**
 * Agentes de Aceleração do CRM, por segmento (docs/PLANO_AGENTES_ACELERACAO_CRM.md).
 * Lista vem de CRM_AGENT_CATALOG (código) — cresce 1 entrada por fase (F1-F5). Nesta fase
 * (F0 — Fundação) o catálogo está vazio de propósito: nenhum agente real existe ainda, então
 * a tela mostra isso honestamente em vez de expor um toggle sem efeito nenhum por trás.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface ParamHint { key: string; label: string; default: string }
interface CatalogAgent { key: string; label: string; description: string; paramHints?: ParamHint[] }
interface AgentConfig { agent_key: string; ativo: boolean; params: Record<string, any> }
interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'];

export function SegmentAgentesModal({ segment, onClose }: Props) {
  const [catalog, setCatalog] = useState<CatalogAgent[]>([]);
  const [configByKey, setConfigByKey] = useState<Record<string, AgentConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/agentes`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const cat: CatalogAgent[] = Array.isArray(d.catalog) ? d.catalog : [];
        setCatalog(cat);
        const byKey: Record<string, AgentConfig> = {};
        for (const c of cat) {
          const existing = (d.config ?? []).find((r: any) => r.agent_key === c.key);
          byKey[c.key] = existing
            ? { agent_key: c.key, ativo: !!existing.ativo, params: existing.params ?? {} }
            : { agent_key: c.key, ativo: false, params: {} };
        }
        setConfigByKey(byKey);
      })
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const setAtivo = (key: string, ativo: boolean) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], ativo } }));

  const setParam = (key: string, paramKey: string, value: string) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [paramKey]: value } } }));

  const removeParam = (key: string, paramKey: string) =>
    setConfigByKey(prev => {
      const { [paramKey]: _omit, ...rest } = prev[key].params;
      return { ...prev, [key]: { ...prev[key], params: rest } };
    });

  const addParam = (key: string) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, '': '' } } }));

  // Preenche já com chave+valor padrão do hint — o Master só confirma/ajusta, não precisa
  // saber de cabeça o nome exato do parâmetro nem redigitar o default documentado no código.
  const useHint = (key: string, hint: ParamHint) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [hint.key]: hint.default } } }));

  const renameParamKey = (key: string, oldKey: string, newKey: string) =>
    setConfigByKey(prev => {
      const params = { ...prev[key].params };
      const value = params[oldKey];
      delete params[oldKey];
      params[newKey] = value;
      return { ...prev, [key]: { ...prev[key], params } };
    });

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const agents = Object.values(configByKey).map(c => ({
        agent_key: c.agent_key,
        ativo: c.ativo,
        params: Object.fromEntries(Object.entries(c.params).filter(([k]) => k.trim() !== '')),
      }));
      const res = await fetch(`/api/admin/master/segments/${segment.id}/agentes`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setSaveOk(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Agentes de Aceleração (CRM)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Liga/desliga cada agente e ajusta os parâmetros dele — vale pra todo tenant deste
              segmento. Clique em "Ajuda" pra ver, agente a agente, como preencher e onde cada
              parâmetro faz efeito.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button onClick={() => setShowHelp(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                showHelp ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100')}>
              <QuestionMarkCircleIcon className="h-4 w-4" /> Ajuda
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {showHelp && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 space-y-4 text-[12px] leading-relaxed text-gray-700">
              <div>
                <p className="font-black text-gray-900 mb-1">Como funciona esta tela</p>
                <p>
                  Cada agente abaixo é um comportamento fixo no código (o que ele faz não muda),
                  mas <span className="font-semibold">se ele roda ou não, e com qual limiar,
                  é 100% definido aqui</span> — nada disso fica fixo no código da aplicação.
                  O que você salva aqui vale como <span className="font-semibold">padrão para
                  todo tenant deste segmento</span> ({segment.name}).
                </p>
              </div>

              {catalog.map((agent, i) => (
                <div key={agent.key} className="pt-3 border-t border-orange-200/70 first:pt-0 first:border-0">
                  <p className="font-black text-gray-900">{ORDINAL[i] ?? `${i + 1}º`} Agente — {agent.label}</p>
                  {agent.key === 'pendencia_atendimento' && (
                    <ul className="mt-1 space-y-1 list-disc pl-4">
                      <li><span className="font-semibold">Quando roda:</span> verificação automática a cada 5 minutos. Diferente de tudo que existia antes, ele não olha só o primeiro contato — ele acompanha, o tempo todo, <span className="font-semibold">de quem é a bola</span>: se o lead chegou, mandou mensagem ou o atendente registrou um retorno do cliente, o lead passa a aguardar uma ação nossa e o relógio corre. Assim que alguém responde de verdade, o relógio zera. Se o cliente escrever de novo, ele reinicia — no 2º, no 3º, no 40º toque.</li>
                      <li><span className="font-semibold">Parâmetros reconhecidos:</span> <code className="font-mono bg-white px-1 rounded">minutos_1o_contato</code> — prazo do primeiro contato, que é legitimamente mais curto (sem preencher, usa 30); <code className="font-mono bg-white px-1 rounded">minutos_continuidade</code> — prazo do 2º toque em diante, quando a conversa já está andando (sem preencher, usa 240 = 4h); <code className="font-mono bg-white px-1 rounded">fator_escalonamento</code> — quantas vezes o prazo precisa estourar para escalar ao gestor (sem preencher, usa 3); <code className="font-mono bg-white px-1 rounded">fator_reatribuicao</code> — quantas vezes o prazo precisa estourar para o lead trocar de atendente sozinho (sem preencher, usa 6).</li>
                      <li><span className="font-semibold">Escada automática, sem fila de aprovação:</span> 1º avisa sobre o responsável → 2º escala ao gestor → 3º <span className="font-semibold">passa o lead para outro atendente automaticamente</span>, usando as mesmas regras de distribuição já configuradas para este segmento. Se o responsável estiver marcado como indisponível (férias/atestado), o lead <span className="font-semibold">pula direto para o escalonamento</span> — e, quando o lead for reatribuído, quem estava de licença <span className="font-semibold">não leva penalidade</span>: perde o lead, mas não é punido por estar doente.</li>
                      <li><span className="font-semibold">Quem está indisponível sai da fila:</span> ninguém marcado como ausente recebe lead novo — nem na captação, nem no transbordo, nem nesta reatribuição. Isso vale inclusive para o dono da carteira e para o plantonista.</li>
                      <li><span className="font-semibold">Onde aparece:</span> WhatsApp/Slack do tenant, em <span className="font-semibold">mensagem agrupada</span> (uma por rodada, organizada por responsável) — nunca uma mensagem por lead, o que seria inutilizável numa operação grande. Cada ocorrência fica registrada individualmente para auditoria.</li>
                    </ul>
                  )}
                  {agent.key === 'stage_stagnation' && (
                    <ul className="mt-1 space-y-1 list-disc pl-4">
                      <li><span className="font-semibold">Quando roda:</span> mesma verificação a cada 5 minutos — olha quanto tempo cada lead está PARADO na etapa atual (sem toque humano desde que entrou nela) e compara com o prazo daquela etapa.</li>
                      <li><span className="font-semibold">Parâmetro reconhecido:</span> nenhum. O prazo de cada etapa <span className="font-semibold">não vem daqui</span> — vem de "Personalização Kanban" (o próprio tenant configura, coluna por coluna, um campo "SLA" em horas; padrão 24h se ninguém mexer). Se adicionar um parâmetro aqui mesmo assim, ele fica salvo mas nunca é lido por este agente.</li>
                      <li><span className="font-semibold">Onde aparece no CRM:</span> mesma limitação do 1º agente — só WhatsApp/Slack do tenant, nada visível ainda dentro do Kanban em si.</li>
                    </ul>
                  )}
                  {agent.key === 'next_best_action' && (
                    <ul className="mt-1 space-y-1 list-disc pl-4">
                      <li><span className="font-semibold">Quando roda:</span> diferente dos outros dois — não é verificação por tempo. Dispara sozinho toda vez que o lead muda de coluna no Kanban, e também sob demanda (botão "Atualizar sugestão" na ficha do lead).</li>
                      <li><span className="font-semibold">Parâmetro reconhecido:</span> <code className="font-mono bg-white px-1 rounded">qtd_atividades_contexto</code> — quantas das atividades mais recentes do lead a IA vê antes de sugerir a próxima ação (1 a 20). Sem preencher, usa 5.</li>
                      <li><span className="font-semibold">Onde aparece no CRM:</span> este é o único dos três com efeito visível <span className="font-semibold">dentro do próprio CRM</span> hoje — card "Sugestão da IA" na ficha do lead (`/crm/kanban`), com botão "Registrar como Atividade". Nunca manda WhatsApp/Slack, nunca precisa de aprovação — é só uma sugestão de texto.</li>
                    </ul>
                  )}
                  {agent.key === 'reactivation' && (
                    <ul className="mt-1 space-y-1 list-disc pl-4">
                      <li><span className="font-semibold">Quando roda:</span> mesma verificação a cada 5 minutos — olha todo lead sem NENHUM contato registrado (nem atividade) há muitos dias, e que não está numa etapa final (ganho/perdido).</li>
                      <li><span className="font-semibold">Quando roda:</span> a cada 5 minutos, sobre leads em que <span className="font-semibold">a bola está com o cliente</span> — nós já respondemos e é ele quem sumiu. Lead que está esperando resposta NOSSA nunca entra aqui (esse é assunto do agente de Pendência de Atendimento, que escala internamente em vez de cutucar o cliente).</li>
                      <li><span className="font-semibold">Parâmetros reconhecidos:</span> <code className="font-mono bg-white px-1 rounded">dias_inatividade</code> — quantos dias de silêncio do cliente até reativar (sem preencher, usa 7); <code className="font-mono bg-white px-1 rounded">requer_revisao_extra</code> — escreva <code className="font-mono bg-white px-1 rounded">true</code> para segmentos regulados (ex.: Saúde) onde nenhuma mensagem pode sair sem um humano ler antes.</li>
                      <li><span className="font-semibold">Este agente FALA com o lead — e, por padrão, sozinho:</span> a IA rascunha a mensagem de reativação e o sistema <span className="font-semibold">envia automaticamente</span> pelo WhatsApp, sem fila de aprovação. O tenant é avisado depois, com o texto exato que foi enviado. É deliberado: a plataforma opera call centers grandes, e esperar aprovação humana lead a lead recria o gargalo que todo o resto elimina.</li>
                      <li><span className="font-semibold">Como travar o envio automático:</span> preencha <code className="font-mono bg-white px-1 rounded">requer_revisao_extra</code> = <code className="font-mono bg-white px-1 rounded">true</code>. Aí sim nada sai sozinho: chega um WhatsApp pro tenant com o rascunho + PIN de 6 dígitos, e a mensagem só vai pro lead depois que um humano revisar (podendo editar o texto) e aprovar. Rejeitar descarta sem enviar nada.</li>
                      <li><span className="font-semibold">Onde aparece no CRM:</span> com revisão extra ligada, na aba "Aprovações Pendentes" em <span className="font-mono bg-white px-1 rounded">/crm/config/agentes</span> (aprovar/rejeitar logado, sem precisar do PIN) + o link por PIN no WhatsApp. Sem ela, a notificação chega já informando o que foi enviado.</li>
                    </ul>
                  )}
                  {agent.key === 'score_recalibration' && (
                    <ul className="mt-1 space-y-1 list-disc pl-4">
                      <li><span className="font-semibold">Quando roda:</span> uma vez por dia (04:00), não a cada 5 minutos — é o único agente que não olha leads, e sim as <span className="font-semibold">regras de qualificação</span> deste segmento. Ele compara a nota que cada regra dá com a taxa de conversão que aquela regra realmente produziu.</li>
                      <li><span className="font-semibold">Parâmetros reconhecidos:</span> <code className="font-mono bg-white px-1 rounded">janela_dias</code> — período analisado (sem preencher, usa 90); <code className="font-mono bg-white px-1 rounded">divergencia_minima_pct</code> — o quanto a nota precisa estar distante da realidade para virar sugestão (sem preencher, usa 30); <code className="font-mono bg-white px-1 rounded">min_leads_amostra</code> — mínimo de leads para a estatística contar (sem preencher, usa 10).</li>
                      <li><span className="font-semibold">O que ele muda sozinho e o que pede aprovação:</span> reordenar a prioridade das regras pela conversão real é automático (é só ordem interna de avaliação). Já <span className="font-semibold">mudar a nota</span> de uma regra vira uma sugestão que espera um clique seu.</li>
                      <li><span className="font-semibold">Onde aparece:</span> junto de cada regra em "Qualificação de Lead por IA (CRM)", nesta mesma tela — e na versão do tenant em <span className="font-mono bg-white px-1 rounded">/crm/config/ia</span>. Não passa pela aba "Aprovações Pendentes".</li>
                    </ul>
                  )}
                  {!['pendencia_atendimento', 'stage_stagnation', 'next_best_action', 'reactivation', 'score_recalibration'].includes(agent.key) && (
                    <p className="mt-1 text-gray-500 italic">Documentação deste agente ainda não escrita aqui — ver docs/PLANO_AGENTES_ACELERACAO_CRM.md.</p>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-orange-200/70 space-y-1">
                <p className="font-black text-gray-900">Se você preencher mais de um parâmetro no mesmo agente</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>Só as chaves que o agente reconhece (listadas acima, e sugeridas como chip clicável em cada card) têm efeito real. Qualquer outra chave digitada é salva no banco, mas nunca é lida — fica "morta", sem erro nem aviso na tela.</li>
                  <li>Não é possível ter a <span className="font-semibold">mesma chave duas vezes</span>: o parâmetro é guardado como par chave→valor, então renomear uma linha pro nome de outra que já existe sobrescreve a anterior silenciosamente (perde o valor de antes).</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-orange-200/70 space-y-1">
                <p className="font-black text-gray-900">Sobre override por tenant</p>
                <p>
                  Cada tenant deste segmento pode sobrepor o que você salvar aqui em{' '}
                  <span className="font-mono bg-white px-1 rounded">/crm/config/agentes</span> —
                  ele escolhe, agente a agente, entre herdar o padrão do segmento ou forçar
                  ativado/desativado só pra empresa dele. Enquanto o tenant não mexer em nada,
                  usa exatamente o que for salvo aqui.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : catalog.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-gray-500">Nenhum agente disponível ainda</p>
              <p className="text-xs text-gray-400 mt-1">
                Os agentes são liberados um de cada vez, conforme cada fase do plano é implementada
                (Velocidade de 1º Contato, Estagnação, Próxima Ação, Reativação, Recalibração de Score).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {catalog.map((agent, i) => {
                const cfg = configByKey[agent.key];
                if (!cfg) return null;
                const paramEntries = Object.entries(cfg.params);
                const pendingHints = (agent.paramHints ?? []).filter(h => !(h.key in cfg.params));
                return (
                  <div key={agent.key} className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{ORDINAL[i] ?? `${i + 1}º`} Agente</p>
                        <p className="text-sm font-black text-gray-900">{agent.label}</p>
                        <p className="text-[11px] text-gray-500">{agent.description}</p>
                      </div>
                      <input type="checkbox" checked={cfg.ativo} onChange={e => setAtivo(agent.key, e.target.checked)}
                        className="h-5 w-5 rounded accent-orange-600 shrink-0" />
                    </label>

                    <div className="space-y-1.5">
                      {paramEntries.map(([pKey, pVal], i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input value={pKey} onChange={e => renameParamKey(agent.key, pKey, e.target.value)}
                            placeholder="parâmetro"
                            className="w-1/3 px-2 py-1 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          <input value={String(pVal)} onChange={e => setParam(agent.key, pKey, e.target.value)}
                            placeholder="valor"
                            className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          <button onClick={() => removeParam(agent.key, pKey)} className="text-gray-300 hover:text-red-500 p-1">
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addParam(agent.key)}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-orange-600">
                        <PlusIcon className="h-3 w-3" /> Adicionar parâmetro
                      </button>
                    </div>

                    {pendingHints.length > 0 && (
                      <div className="pt-1 border-t border-gray-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Parâmetros deste agente</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pendingHints.map(hint => (
                            <button key={hint.key} onClick={() => useHint(agent.key, hint)}
                              title={`Adiciona "${hint.key}" com o valor padrão (${hint.default})`}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-200 bg-orange-50 text-[11px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                              <PlusIcon className="h-3 w-3" /> {hint.label} <span className="font-mono text-orange-400">({hint.default})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
          {saveOk && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircleIcon className="h-4 w-4" /> Salvo!
            </span>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
            Fechar
          </button>
          <button onClick={handleSave} disabled={saving || catalog.length === 0}
            className={cn('px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              saving || catalog.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
