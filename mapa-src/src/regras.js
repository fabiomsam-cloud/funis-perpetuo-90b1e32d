// Cores provisórias por faixa (Fase 4 troca por comparação com a previsão)
// Paletas por tema (31/10): no claro as cores de significado ficam mais escuras para continuarem legíveis sobre o branco
export const PALETAS = {
  dark: {
    CORES: { red: '#e06f6f', amber: '#ef9a3c', green: '#6fe08c', grey: '#5f7368', dash: '#5f7368' },
    STRIPE: { fonte: '#6fb3e0', pagina: '#8aa396', evento: '#35d0ba', anne: '#b89cff', humano: '#f5b942', resultado: '#6fe08c', saida: '#e06f6f' },
    fundo: '#0b1512', pontos: 'rgba(138,163,150,.18)', minimapNo: '#2b4638', minimapMask: 'rgba(11,21,18,.7)', opacidade: { normal: .85, longa: .5, dash: .55 },
  },
  light: {
    CORES: { red: '#c0392b', amber: '#c7742b', green: '#1f8a5a', grey: '#7d8c84', dash: '#8a978f' },
    STRIPE: { fonte: '#2f6fa8', pagina: '#6c7c74', evento: '#0f8f7f', anne: '#6f4fd6', humano: '#b8860b', resultado: '#1f8a5a', saida: '#c0392b' },
    fundo: '#f4f6f3', pontos: 'rgba(60,80,70,.22)', minimapNo: '#c9d3cd', minimapMask: 'rgba(244,246,243,.75)', opacidade: { normal: .95, longa: .7, dash: .7 },
  },
}
export const temaAtual = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
export const paleta = (t) => PALETAS[t || temaAtual()]
export const CORES = PALETAS.dark.CORES      // compatibilidade: use paleta(tema).CORES quando o tema importar
export const ICONE = { fonte: '🎯', pagina: '📄', evento: '⚡', anne: '💬', humano: '☎️', resultado: '🏆', saida: '🚪' }
export const STRIPE = PALETAS.dark.STRIPE
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
