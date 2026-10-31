// Datas no fuso de Manaus (o Data Core também conta o dia em America/Manaus)
export function hojeManaus() { const s = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' }); return s }
const d = s => { const [y, m, dd] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)) }
const iso = x => x.toISOString().slice(0, 10)
const addDias = (s, n) => iso(new Date(d(s).getTime() + n * 86400000))
export const PERIODOS = [
  ['mes', 'Mês vigente'], ['mes_ant', 'Mês anterior'], ['d7', 'Últimos 7 dias'], ['d30', 'Últimos 30 dias'], ['d60', 'Últimos 60 dias'], ['d90', 'Últimos 90 dias'], ['custom', 'Personalizado'],
]
export function periodo(tipo, ini, fim) {
  const hoje = hojeManaus(), ontem = addDias(hoje, -1)
  if (tipo === 'custom' && ini && fim) return { ini, fim }
  if (tipo === 'mes') { const i = hoje.slice(0, 8) + '01'; return i > ontem ? periodo('mes_ant') : { ini: i, fim: ontem } }
  if (tipo === 'mes_ant') { const i = hoje.slice(0, 8) + '01'; const fimAnt = addDias(i, -1); return { ini: fimAnt.slice(0, 8) + '01', fim: fimAnt } }
  const n = { d7: 7, d30: 30, d60: 60, d90: 90 }[tipo] || 30
  return { ini: addDias(ontem, -(n - 1)), fim: ontem }
}
export function anterior({ ini, fim }) { const dias = Math.round((d(fim) - d(ini)) / 86400000) + 1; return { ini: addDias(ini, -dias), fim: addDias(ini, -1) } }
export const ddmm = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : ''
export const dhm = s => s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
export const nf = (v, c = 0) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c })
export const R$ = v => v == null ? '—' : 'R$ ' + nf(v)
