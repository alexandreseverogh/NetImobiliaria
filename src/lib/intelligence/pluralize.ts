/** Pluralização simples PT-BR pro cargo configurado no segmento (distribution_role_name) —
 *  nunca "corretores" hardcoded, já que o cargo de distribuição é livre por segmento (ver
 *  system_segments.distribution_role_name). Pluraliza só a PRIMEIRA palavra (o substantivo do
 *  cargo em si) e preserva o resto — cargos compostos são comuns ("Consultor de Vendas",
 *  "Corretor de Imóveis"): pluralizar a frase inteira geraria "Vendases"/"Imóveises", que não
 *  são palavras. Regra na primeira palavra: termina em vogal → +s, senão +es (cobre os casos
 *  reais já usados na plataforma: Corretor→Corretores, Atendente→Atendentes,
 *  Vendedor→Vendedores, Consultor→Consultores). */
export function pluralizePtBr(role: string): string {
  const trimmed = role.trim()
  if (!trimmed) return 'atendentes'
  const words = trimmed.split(/\s+/)
  const firstWord = words[0]
  const lastChar = firstWord.slice(-1).toLowerCase()
  const isVowel = 'aeiouáéíóúâêôãõ'.includes(lastChar)
  const pluralFirstWord = isVowel ? `${firstWord}s` : `${firstWord}es`
  return [pluralFirstWord, ...words.slice(1)].join(' ').toLowerCase()
}
