// Motor de projeção (Fase 4): propaga pessoas pelas setas usando as taxas previstas.
//  parametros = { fontes: {id: {verba, custo_por_pessoa, pessoas}}, taxas: {'a>b': pct}, ticket, alerta_pct, nota }
//  Fonte paga (bind gasto): pessoas = verba / custo_por_pessoa. Fonte sem gasto (sem seta entrando): pessoas informadas.
//  Demais nós: soma das setas que entram (pessoas de origem × taxa). Setas tracejadas não contam.
export function parametrosDaBase(doc, base) {
  const fontes = {}, taxas = {}
  const entra = new Set(doc.edges.filter(e => e.estilo !== 'dash').map(e => e.to))
  for (const n of doc.nodes) {
    const b = n.bind || {}; const f = base?.fontes?.[n.id] || {}
    if (b.k === 'gasto') fontes[n.id] = { verba: f.gasto_mes || 0, custo_por_pessoa: f.custo_por_pessoa || null }
    else if (b.k === 'evento' && !entra.has(n.id)) fontes[n.id] = { pessoas: f.pessoas_mes || 0 }
  }
  for (const e of doc.edges) { if (e.estilo === 'dash') continue; const k = e.from + '>' + e.to; const t = base?.taxas?.[k]; if (t != null) taxas[k] = Number(t) }
  return { fontes, taxas, ticket: Math.round(base?.ticket || 0), alerta_pct: 20, nota: '' }
}
export function cenarioDe(params, tipo) {
  const f = tipo === 'otimista' ? 1.15 : tipo === 'pessimista' ? 0.85 : 1
  const fc = tipo === 'otimista' ? 0.9 : tipo === 'pessimista' ? 1.1 : 1
  const taxas = Object.fromEntries(Object.entries(params.taxas || {}).map(([k, v]) => [k, Math.min(100, Math.round(v * f * 10) / 10)]))
  const fontes = Object.fromEntries(Object.entries(params.fontes || {}).map(([k, v]) => [k, { ...v, custo_por_pessoa: v.custo_por_pessoa != null ? Math.round(v.custo_por_pessoa * fc * 100) / 100 : v.custo_por_pessoa }]))
  return { ...params, taxas, fontes }
}
export function calcular(doc, params) {
  const nos = {}, setas = {}, dado = {}
  const edges = doc.edges.filter(e => e.estilo !== 'dash')
  const byId = Object.fromEntries(doc.nodes.map(n => [n.id, n]))
  let gasto = 0
  for (const n of doc.nodes) {
    const b = n.bind || {}; const f = params.fontes?.[n.id]
    if (b.k === 'gasto' && f) { gasto += Number(f.verba || 0); dado[n.id] = (f.verba && f.custo_por_pessoa) ? Number(f.verba) / Number(f.custo_por_pessoa) : 0 }
    else if (f && f.pessoas != null) dado[n.id] = Number(f.pessoas)
  }
  // ordem topológica (Kahn); em ciclo, o que sobrar entra na ordem do doc
  const grau = {}; doc.nodes.forEach(n => grau[n.id] = 0); edges.forEach(e => { if (byId[e.from] && byId[e.to]) grau[e.to]++ })
  const fila = doc.nodes.filter(n => grau[n.id] === 0).map(n => n.id); const ordem = []; const visto = new Set()
  while (fila.length) { const id = fila.shift(); if (visto.has(id)) continue; visto.add(id); ordem.push(id); edges.filter(e => e.from === id).forEach(e => { grau[e.to]--; if (grau[e.to] === 0) fila.push(e.to) }) }
  doc.nodes.forEach(n => { if (!visto.has(n.id)) ordem.push(n.id) })
  for (const id of ordem) {
    if (dado[id] != null) { nos[id] = dado[id]; continue }
    let soma = 0, tem = false
    for (const e of edges.filter(e => e.to === id)) {
      const k = e.from + '>' + e.to; const de = nos[e.from]
      // seta que sai de uma fonte paga: 100% (as pessoas compradas são as que chegam à página)
      const t = byId[e.from]?.bind?.k === 'gasto' ? 100 : params.taxas?.[k]
      if (t == null || de == null) continue
      const v = de * Number(t) / 100; setas[k] = (setas[k] || 0) + v; soma += v; tem = true
    }
    nos[id] = tem ? soma : (byId[id]?.bind?.k === 'nenhum' ? null : 0)
  }
  // setas que saem de fontes pagas (sem taxa) = pessoas do destino direto
  for (const e of edges) { const k = e.from + '>' + e.to; if (setas[k] == null && byId[e.from]?.bind?.k === 'gasto') setas[k] = nos[e.to] ?? 0 }
  // nó de resultado = o de vendas SEM filtro (total da conta); se só houver filtrados, o primeiro
  const res = doc.nodes.find(n => n.bind?.k === 'vendas' && !n.bind?.funis?.length && !n.bind?.fechamento) || doc.nodes.find(n => n.bind?.k === 'vendas')
  const matriculas = res ? Math.round((nos[res.id] || 0) * 10) / 10 : 0
  const receita = Math.round(matriculas * Number(params.ticket || 0))
  const kpis = { matriculas: Math.round(matriculas), matriculas_exato: matriculas, receita, gasto: Math.round(gasto), cpa: matriculas > 0 ? Math.round(gasto / matriculas) : null, roas: gasto > 0 ? Math.round(receita / gasto * 100) / 100 : null }
  return { nos: Object.fromEntries(Object.entries(nos).map(([k, v]) => [k, v == null ? null : Math.round(v * 10) / 10])), setas: Object.fromEntries(Object.entries(setas).map(([k, v]) => [k, Math.round(v * 10) / 10])), kpis }
}
