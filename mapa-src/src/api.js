// Edge do painel dos funis (toda a lógica está no banco: public.fn_funis_mapa → funil.fn_mapa / fn_mapa_detalhe)
const EDGE = 'https://dqpxugdhlgafvddavzzp.supabase.co/functions/v1/dashboard-funis'
export const Q = new URLSearchParams(location.search)
export const K = Q.get('k') || ''
export async function api(params) {
  const u = new URL(EDGE); u.searchParams.set('k', K); u.searchParams.set('v', 'mapa')
  for (const [a, b] of Object.entries(params)) if (b != null && b !== '') u.searchParams.set(a, String(b))
  const r = await fetch(u); const j = await r.json().catch(() => ({ error: r.statusText }))
  if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status))
  return j
}
export async function post(body) {
  const u = new URL(EDGE); u.searchParams.set('k', K)
  const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({ error: r.statusText }))
  if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status))
  return j
}
