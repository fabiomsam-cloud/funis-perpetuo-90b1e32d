// Cores provisórias por faixa (Fase 4 troca por comparação com a previsão)
export const CORES = { red: '#e06f6f', amber: '#ef9a3c', green: '#6fe08c', grey: '#5f7368', dash: '#5f7368' }
export const ICONE = { fonte: '🎯', pagina: '📄', evento: '⚡', anne: '💬', humano: '☎️', resultado: '🏆', saida: '🚪' }
export const STRIPE = { fonte: '#6fb3e0', pagina: '#8aa396', evento: '#35d0ba', anne: '#b89cff', humano: '#f5b942', resultado: '#6fe08c', saida: '#e06f6f' }
export function corSeta(e, destino) {
  if (e.estilo === 'dash') return 'dash'
  if (e.custo_por_pessoa != null || e.a == null) return 'grey'
  if (e.pct == null) return 'grey'
  const final = destino && (destino.tipo === 'resultado' || destino.bind?.funil === 'hubla')
  if (final) return e.pct >= 10 ? 'green' : e.pct >= 4 ? 'amber' : 'red'
  return e.pct >= 50 ? 'green' : e.pct >= 20 ? 'amber' : 'red'
}
export function larguraSeta(n) { return n ? Math.max(1.2, Math.min(9, 1 + Math.log10(n + 1) * 2.2)) : 1.2 }
export function valorNo(n) {
  const v = n.valor || {}, k = n.bind?.k
  if (k === 'gasto') return { texto: v.gasto != null ? 'R$ ' + Number(v.gasto).toLocaleString('pt-BR') : '—', num: v.gasto, vazio: !v.gasto }
  if (k === 'vendas') return { texto: v.matriculas != null ? String(v.matriculas) : '—', num: v.matriculas, vazio: !v.matriculas }
  if (k === 'evento') return { texto: v.pessoas != null ? Number(v.pessoas).toLocaleString('pt-BR') : '—', num: v.pessoas, vazio: !v.pessoas }
  return { texto: '—', num: null, vazio: true }
}
