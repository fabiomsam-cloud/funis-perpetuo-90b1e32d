import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, ReactFlowProvider } from '@xyflow/react'
import { toPng } from 'html-to-image'
import { api, post, Q, K } from './api.js'
import { PERIODOS, periodo, anterior, ddmm, dhm, nf } from './periodo.js'
import { PALETAS, paleta, corSeta, valorNo } from './regras.js'
import NoFunil from './NoFunil.jsx'
import Raia from './Raia.jsx'
import SetaFluxo from './SetaFluxo.jsx'
import Detalhe from './Detalhe.jsx'
import Editor from './Editor.jsx'
import Previsao from './Previsao.jsx'
import { parametrosDaBase, cenarioDe, calcular } from './previsao.js'
import { hojeManaus } from './periodo.js'

const X0 = 210, DX = 232, DY = 150
const nodeTypes = { no: NoFunil, raia: Raia }
const edgeTypes = { seta: SetaFluxo }
const strip = ({ valor, ...n }) => n
const stripE = ({ a, ab, pct, horas, custo_por_pessoa, ...e }) => e
const docDe = d => ({ id: d.mapa_id || null, nome: d.nome, template_codigo: d.template, lanes: d.lanes || [], nodes: (d.nodes || []).map(strip), edges: (d.edges || []).map(stripE), versao: d.versao })
const numsDe = d => ({ valores: Object.fromEntries((d.nodes || []).map(n => [n.id, n.valor || {}])), setas: Object.fromEntries((d.edges || []).map(e => [e.from + '>' + e.to, { a: e.a, ab: e.ab, pct: e.pct, horas: e.horas, custo_por_pessoa: e.custo_por_pessoa }])), kpis: d.kpis, gerado_em: d.gerado_em, cache: d.cache, ms: d.ms, janela_dias: d.janela_dias, rascunho: d.rascunho, ini: d.ini, fim: d.fim })
const novoId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

function Mapa() {
  const rf = useReactFlow()
  const [lista, setLista] = useState(null)
  const [conta, setConta] = useState(Q.get('m') || 'TJAM')
  const [template, setTemplate] = useState(Q.get('t') || 'mestre')
  const [mapaId, setMapaId] = useState(Q.get('id') || null)
  const [pTipo, setPTipo] = useState(Q.get('p') || 'mes')
  const [custom, setCustom] = useState({ ini: Q.get('ini') || '', fim: Q.get('fim') || '' })
  const [comparar, setComparar] = useState(Q.get('c') === '1')
  const [camada, setCamada] = useState('real')
  const [editar, setEditar] = useState(false)
  const [doc, setDoc] = useState(null)
  const [nums, setNums] = useState(null)
  const [ant, setAnt] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')
  const [sel, setSel] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [detCarregando, setDetCarregando] = useState(false)
  const [sujo, setSujo] = useState(false)
  const [catalogo, setCatalogo] = useState(null)
  const [versoes, setVersoes] = useState(null)
  // ---- previsão (Fase 4) ----
  const mesAtual = hojeManaus().slice(0, 8) + '01'
  const [prevMes, setPrevMes] = useState(Q.get('mes') || mesAtual)
  const [cenario, setCenario] = useState('base')
  const [prev, setPrev] = useState(null)              // {base, salvas:{cen:row}, meta, status}
  const [paramsAll, setParamsAll] = useState(null)    // {base, otimista, pessimista}
  const [statusMes, setStatusMes] = useState(null)    // alerta do mês vigente (qualquer camada)
  // ---- tema claro/escuro (31/10): ?tema=light|dark na URL > escolha guardada no navegador > escuro
  const [tema, setTema] = useState(() => { const q = Q.get('tema'); if (q === 'light' || q === 'dark') return q; try { const g = localStorage.getItem('mapa_tema'); if (g === 'light' || g === 'dark') return g } catch {} return 'dark' })
  useEffect(() => { document.documentElement.dataset.theme = tema; try { localStorage.setItem('mapa_tema', tema) } catch {} }, [tema])
  const P = paleta(tema)
  const wrap = useRef(null)
  const per = useMemo(() => periodo(pTipo, custom.ini, custom.fim), [pTipo, custom])
  const papel = lista?.papel || 'leitura'
  const aviso = (t) => { setToast(t); setTimeout(() => setToast(''), 3500) }

  const carregarLista = useCallback(async () => { try { setLista(await api({ lista: 1, m: conta })) } catch (e) { setErro(String(e.message)) } }, [conta])
  useEffect(() => { carregarLista() }, [carregarLista])
  useEffect(() => { if (editar && !catalogo) api({ catalogo: 1, m: conta }).then(setCatalogo).catch(() => {}) }, [editar, conta, catalogo])
  useEffect(() => { setCatalogo(null) }, [conta])
  useEffect(() => { const f = e => { if (sujo) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f) }, [sujo])

  const syncUrl = useCallback(() => {
    const u = new URL(location.href); u.searchParams.set('m', conta); u.searchParams.set('p', pTipo)
    if (mapaId) { u.searchParams.set('id', mapaId); u.searchParams.delete('t') } else { u.searchParams.set('t', template); u.searchParams.delete('id') }
    if (pTipo === 'custom') { u.searchParams.set('ini', per.ini); u.searchParams.set('fim', per.fim) } else { u.searchParams.delete('ini'); u.searchParams.delete('fim') }
    comparar ? u.searchParams.set('c', '1') : u.searchParams.delete('c'); history.replaceState(null, '', u)
  }, [conta, template, mapaId, pTipo, per, comparar])

  const carregar = useCallback(async (fresco = false) => {
    setCarregando(true); setErro(''); setSel(null); setDetalhe(null)
    try {
      const base = mapaId ? { m: conta, id: mapaId } : { m: conta, t: template }
      const d = await api({ ...base, ini: per.ini, fim: per.fim, fresco: fresco ? 1 : undefined })
      setDoc(docDe(d)); setNums(numsDe(d)); setSujo(false)
      if (comparar) { const a = anterior(per); setAnt(numsDe(await api({ ...base, ini: a.ini, fim: a.fim }))) } else setAnt(null)
      syncUrl(); setTimeout(() => rf.fitView({ padding: 0.08, duration: 300 }), 50)
      api({ ...base, previsao: 1, mes: mesAtual, base: 0 }).then(x => setStatusMes(x.status)).catch(() => {})
    } catch (e) { setErro(String(e.message)) } finally { setCarregando(false) }
  }, [conta, template, mapaId, per, comparar, rf, syncUrl])
  // camada Previsão: carrega base 60 d, previsões salvas do mês, meta e status
  const carregarPrevisao = useCallback(async () => {
    if (!doc) return
    try {
      const base = mapaId ? { m: conta, id: mapaId } : { m: conta, t: template }
      const x = await api({ ...base, previsao: 1, mes: prevMes })
      const salvas = Object.fromEntries((x.previsoes || []).map(r => [r.cenario, r]))
      const pb = parametrosDaBase(doc, x.base)
      setPrev({ base: x.base, salvas, meta: x.meta, status: x.status })
      setParamsAll({ base: salvas.base?.parametros || pb, otimista: salvas.otimista?.parametros || cenarioDe(pb, 'otimista'), pessimista: salvas.pessimista?.parametros || cenarioDe(pb, 'pessimista') })
    } catch (e) { setErro(String(e.message)) }
  }, [doc, conta, template, mapaId, prevMes])
  useEffect(() => { if (camada === 'previsao') carregarPrevisao() }, [camada, carregarPrevisao])
  useEffect(() => { if (camada === 'previsao' && prevMes === mesAtual && pTipo !== 'mes') setPTipo('mes') }, [camada, prevMes])
  const params = paramsAll?.[cenario]
  const calc = useMemo(() => (doc && params && camada === 'previsao') ? calcular(doc, params) : null, [doc, params, camada])
  const setParams = (fn) => setParamsAll(all => ({ ...all, [cenario]: typeof fn === 'function' ? fn(all[cenario]) : fn }))
  const ritmoMes = prev?.status?.ritmo
  useEffect(() => { if (!K) { setErro('Falta o token (?k=) na URL — abra pelo painel dos funis.'); return } if (pTipo === 'custom' && (!custom.ini || !custom.fim)) return; carregar() }, [carregar])

  const trocar = (fn) => { if (sujo && !window.confirm('Há alterações não salvas. Descartar?')) return; setEditar(false); fn() }

  // ---- React Flow: nós e setas a partir do doc + números ----
  const { nodes, edges } = useMemo(() => {
    if (!doc) return { nodes: [], edges: [] }
    const lanes = doc.lanes || [], laneIdx = Object.fromEntries(lanes.map((l, i) => [l.id, i]))
    const byId = Object.fromEntries(doc.nodes.map(n => [n.id, n]))
    const val = id => nums?.valores?.[id] || {}
    const maxCol = Math.max(7, ...doc.nodes.map(n => n.col || 0))
    const ligados = new Set(); if (sel?.tipo === 'no') { ligados.add(sel.id); doc.edges.forEach(e => { if (e.from === sel.id || e.to === sel.id) { ligados.add(e.from); ligados.add(e.to) } }) }
    const vaziaPorLane = {}; doc.nodes.forEach(n => { const v = valorNo({ ...n, valor: val(n.id) }); vaziaPorLane[n.lane] = (vaziaPorLane[n.lane] ?? true) && v.vazio && n.tipo !== 'nota' })
    const raias = lanes.map((l, i) => ({ id: 'lane:' + l.id, type: 'raia', position: { x: 0, y: i * DY }, draggable: false, selectable: false, focusable: false, zIndex: -1,
      style: { width: X0 + (maxCol + 1) * DX + 60, height: DY }, data: { titulo: l.titulo, sub: l.sub, vazia: vaziaPorLane[l.id] } }))
    const prevDe = (n) => {
      if (!calc) return undefined
      const k = n.bind?.k; if (k === 'nenhum' || n.tipo === 'nota') return undefined
      if (k === 'gasto') { const v = params?.fontes?.[n.id]?.verba; return { texto: v != null ? 'R$ ' + nf(v) : '—', num: v } }
      if (k === 'vendas') return { texto: nf(calc.kpis.matriculas), num: calc.kpis.matriculas }
      const v = calc.nos?.[n.id]; return { texto: v != null ? nf(Math.round(v)) : '—', num: v }
    }
    const nos = doc.nodes.map(n => ({ id: n.id, type: 'no', position: n.pos || { x: X0 + (n.col || 0) * DX, y: (laneIdx[n.lane] ?? 0) * DY + 34 }, draggable: editar,
      data: { n: { ...n, valor: val(n.id) }, ant: ant?.valores?.[n.id], comparar, tema, previsao: prevDe(n), ritmo: prevMes === mesAtual ? ritmoMes : null, sel: sel?.tipo === 'no' && sel.id === n.id, apagado: !editar && sel?.tipo === 'no' && !ligados.has(n.id) } }))
    const entradas = {}
    const setas = doc.edges.map((e, i) => {
      const k = (entradas[e.to] = (entradas[e.to] ?? 0) + 1) - 1
      const a = byId[e.from], b = byId[e.to]; const longa = a && b && ((b.col || 0) - (a.col || 0) > 1.5 || a.lane !== b.lane)
      const num = nums?.setas?.[e.from + '>' + e.to] || {}; const ee = { ...e, ...num }
      const selSeta = sel?.tipo === 'seta' && sel.de === e.from && sel.para === e.to
      const apagado = sel?.tipo === 'no' ? !(e.from === sel.id || e.to === sel.id) : sel?.tipo === 'seta' ? !selSeta : false
      return { id: e.from + '>' + e.to, source: e.from, target: e.to, sourceHandle: 's', targetHandle: 't' + (editar ? 0 : k % 9), type: 'seta',
        data: { e: ee, cor: corSeta(ee, b), k, longa, tema, apagado: editar ? selSeta ? false : (sel ? apagado : false) : apagado, comparar, antPct: ant?.setas?.[e.from + '>' + e.to]?.pct,
          prevTaxa: calc && e.estilo !== 'dash' && a?.bind?.k !== 'gasto' ? params?.taxas?.[e.from + '>' + e.to] : undefined, prevN: calc ? calc.setas?.[e.from + '>' + e.to] : undefined,
          onClick: () => (editar || camada === 'previsao') ? setSel({ tipo: 'seta', de: e.from, para: e.to }) : abrirSeta(e) } }
    })
    return { nodes: [...raias, ...nos], edges: setas }
  }, [doc, nums, ant, sel, comparar, editar, calc, params, camada, prevMes, ritmoMes, tema])

  // ---- leitura: aprofundamento ----
  const baseDet = () => mapaId ? { m: conta, id: mapaId } : { m: conta, t: template }
  const abrirNo = async (n) => {
    if (sel?.tipo === 'no' && sel.id === n.id && !editar) { setSel(null); setDetalhe(null); return }
    setSel({ tipo: 'no', id: n.id, titulo: n.titulo }); setDetCarregando(true); setDetalhe(null)
    try { setDetalhe(await api({ ...baseDet(), ini: per.ini, fim: per.fim, no: n.id })) } catch (e) { setErro(String(e.message)) } finally { setDetCarregando(false) }
  }
  const abrirSeta = async (e) => {
    const a = doc.nodes.find(x => x.id === e.from), b = doc.nodes.find(x => x.id === e.to)
    setSel({ tipo: 'seta', de: e.from, para: e.to, titulo: `${a?.titulo} → ${b?.titulo}` }); setDetCarregando(true); setDetalhe(null)
    try { setDetalhe(await api({ ...baseDet(), ini: per.ini, fim: per.fim, de: e.from, para: e.to })) } catch (err) { setErro(String(err.message)) } finally { setDetCarregando(false) }
  }

  // ---- edição ----
  const marcar = (fn) => { setDoc(fn); setSujo(true) }
  const onNodesChange = useCallback((changes) => {
    if (!editar) return
    setDoc(d => { if (!d) return d; let mud = false; const nodes = d.nodes.map(n => { const c = changes.find(x => x.type === 'position' && x.id === n.id && x.position); if (!c) return n; mud = true; return { ...n, pos: { x: Math.round(c.position.x), y: Math.round(c.position.y) } } }); return mud ? { ...d, nodes } : d })
  }, [editar])
  const onNodeDragStop = useCallback((_, node) => {
    if (!editar || node.type !== 'no') return
    setDoc(d => { const lanes = d.lanes || []; const li = Math.max(0, Math.min(lanes.length - 1, Math.floor((node.position.y - 34 + DY / 2) / DY)))
      return { ...d, nodes: d.nodes.map(n => n.id === node.id ? { ...n, pos: { x: Math.round(node.position.x), y: Math.round(node.position.y) }, lane: lanes[li]?.id ?? n.lane, col: Math.round(((node.position.x - X0) / DX) * 100) / 100 } : n) } })
    setSujo(true)
  }, [editar])
  const onConnect = useCallback((c) => {
    if (!editar || !c.source || !c.target || c.source === c.target) return
    marcar(d => d.edges.some(e => e.from === c.source && e.to === c.target) ? d : { ...d, edges: [...d.edges, { from: c.source, to: c.target }] })
  }, [editar])
  const addNo = (tipo) => {
    const el = wrap.current?.querySelector('.react-flow'); const r = el?.getBoundingClientRect()
    const c = rf.screenToFlowPosition({ x: (r?.left || 0) + (r?.width || 800) / 2, y: (r?.top || 0) + (r?.height || 500) / 2 })
    const lanes = doc.lanes || []; const li = Math.max(0, Math.min(lanes.length - 1, Math.floor((c.y - 34 + DY / 2) / DY)))
    const id = novoId()
    marcar(d => ({ ...d, nodes: [...d.nodes, { id, tipo, titulo: tipo === 'nota' ? 'Nota' : 'Novo nó', sub: tipo === 'nota' ? 'escreva aqui' : '', lane: lanes[li]?.id, col: Math.round(((c.x - X0) / DX) * 100) / 100, pos: { x: Math.round(c.x - 88), y: Math.round(c.y - 40) }, bind: tipo === 'nota' ? { k: 'nenhum' } : tipo === 'resultado' ? { k: 'vendas' } : { k: 'evento' } }] }))
    setSel({ tipo: 'no', id })
  }
  const acoes = {
    addNo,
    removerNo: (id) => marcar(d => ({ ...d, nodes: d.nodes.filter(n => n.id !== id), edges: d.edges.filter(e => e.from !== id && e.to !== id) })),
    removerSeta: (s) => marcar(d => ({ ...d, edges: d.edges.filter(e => !(e.from === s.from && e.to === s.to)) })),
    addRaia: () => marcar(d => ({ ...d, lanes: [...(d.lanes || []), { id: 'r' + Date.now().toString(36), titulo: 'NOVA RAIA', sub: '' }] })),
    moverRaia: (id, dir) => marcar(d => { const ls = [...d.lanes]; const i = ls.findIndex(l => l.id === id); const j = i + dir; if (j < 0 || j >= ls.length) return d; [ls[i], ls[j]] = [ls[j], ls[i]]
      // nós sem posição livre acompanham a raia; nós com posição ficam onde estão, então reposiciona pela raia
      return { ...d, lanes: ls, nodes: d.nodes.map(n => n.pos ? { ...n, pos: { ...n.pos, y: (ls.findIndex(l => l.id === n.lane)) * DY + 34 } } : n) } }),
    removerRaia: (id) => marcar(d => { const ls = d.lanes.filter(l => l.id !== id); const primeira = ls[0]?.id; return { ...d, lanes: ls, nodes: d.nodes.map(n => n.lane === id ? { ...n, lane: primeira } : n) } }),
    atualizar: async () => {
      setOcupado(true); try { const d = await post({ acao: 'mapa_calcular', mentoria: conta, ini: per.ini, fim: per.fim, lanes: doc.lanes, nodes: doc.nodes, edges: doc.edges }); setNums(numsDe(d)); aviso('Números atualizados para este rascunho.') } catch (e) { setErro(String(e.message)) } finally { setOcupado(false) }
    },
    salvar: async () => {
      setOcupado(true)
      try {
        const r = await post({ acao: 'mapa_salvar', id: mapaId, mentoria: conta, template_codigo: doc.template_codigo, nome: doc.nome, lanes: doc.lanes, nodes: doc.nodes, edges: doc.edges, viewport: rf.getViewport(), por: 'painel' })
        setSujo(false); aviso(`Salvo · versão ${r.versao}`); await carregarLista()
        if (!mapaId) setMapaId(r.id); else setDoc(d => ({ ...d, versao: r.versao }))
      } catch (e) { setErro(String(e.message)) } finally { setOcupado(false) }
    },
    salvarTemplate: async () => {
      const codigo = window.prompt('Código do template (letras minúsculas, sem espaço). Use um existente para substituí-lo:', doc.template_codigo && doc.template_codigo !== 'mestre' ? doc.template_codigo : '')
      if (!codigo) return; const nome = window.prompt('Nome do template:', doc.nome) || codigo
      if (codigo === 'mestre' && !window.confirm('Isso substitui o MAPA MESTRE de todas as contas. Continuar?')) return
      setOcupado(true); try { await post({ acao: 'template_salvar', codigo: codigo.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), nome, tipo: codigo === 'mestre' ? 'mestre' : 'funil', lanes: doc.lanes, nodes: doc.nodes, edges: doc.edges }); aviso('Template salvo.'); await carregarLista() } catch (e) { setErro(String(e.message)) } finally { setOcupado(false) }
    },
    duplicar: async () => {
      const nome = window.prompt('Nome do novo mapa:', (doc.nome || 'Mapa') + ' (cópia)'); if (!nome) return
      setOcupado(true); try { const r = await post(mapaId ? { acao: 'mapa_clonar', mentoria: conta, de_id: mapaId, nome, por: 'painel' } : { acao: 'mapa_clonar', mentoria: conta, de_template: template, nome, por: 'painel' }); await carregarLista(); setSujo(false); setMapaId(r.id); aviso('Mapa duplicado.') } catch (e) { setErro(String(e.message)) } finally { setOcupado(false) }
    },
    versoes: async () => { try { const r = await post({ acao: 'mapa_versoes', id: mapaId }); setVersoes(r.versoes) } catch (e) { setErro(String(e.message)) } },
    carregarVersao: async (v) => { try { const r = await post({ acao: 'mapa_versao', id: mapaId, versao: v }); setDoc(d => ({ ...d, lanes: r.lanes || d.lanes, nodes: r.nodes, edges: r.edges })); setSujo(true); aviso(`Versão ${v} carregada — salve para torná-la atual.`) } catch (e) { setErro(String(e.message)) } },
    arquivar: async () => { if (!window.confirm('Arquivar este mapa? Ele some da lista (os dados ficam guardados).')) return; try { await post({ acao: 'mapa_arquivar', id: mapaId }); setSujo(false); setMapaId(null); setTemplate('mestre'); setEditar(false); await carregarLista(); aviso('Mapa arquivado.') } catch (e) { setErro(String(e.message)) } },
    compartilhar: async () => {
      const tk = lista?.token_leitura; if (!tk) { aviso('Só o admin gera o link de leitura.'); return }
      const u = new URL(location.href); u.searchParams.set('k', tk); u.searchParams.delete('c')
      try { await navigator.clipboard.writeText(u.toString()); aviso('Link de leitura copiado — a equipe vê, não edita.') } catch { window.prompt('Copie o link de leitura:', u.toString()) }
    },
    verDetalhe: (n) => abrirNo(n), verSeta: (e) => abrirSeta(e),
  }

  const acoesPrev = {
    salvar: async (cen) => {
      setOcupado(true)
      try { const c = calcular(doc, paramsAll[cen]); await post({ acao: 'previsao_salvar', mentoria: conta, mapa_id: mapaId, template_codigo: mapaId ? null : template, mes: prevMes, cenario: cen, parametros: paramsAll[cen], resultado: { kpis: c.kpis, nos: c.nos, setas: c.setas }, por: 'painel' }); aviso(`Previsão ${cen} salva.`); await carregarPrevisao() } catch (e) { setErro(String(e.message)) } finally { setOcupado(false) }
    },
    salvarTodos: async () => { for (const c of ['base', 'otimista', 'pessimista']) await acoesPrev.salvar(c) },
    recarregarBase: () => { if (!prev?.base) return; const pb = parametrosDaBase(doc, prev.base); setParamsAll({ base: pb, otimista: cenarioDe(pb, 'otimista'), pessimista: cenarioDe(pb, 'pessimista') }); aviso('Parâmetros voltaram à média real dos últimos 60 dias (não salvo).') },
    apagar: async (cen) => { const id = prev?.salvas?.[cen]?.id; if (!id || !window.confirm(`Apagar a previsão ${cen} deste mês?`)) return; try { await post({ acao: 'previsao_apagar', id }); aviso('Previsão apagada.'); await carregarPrevisao() } catch (e) { setErro(String(e.message)) } },
  }
  const mesesOpcoes = useMemo(() => { const out = []; const [y, m] = mesAtual.split('-').map(Number); for (let i = -1; i <= 2; i++) { const d = new Date(Date.UTC(y, m - 1 + i, 1)); const v = d.toISOString().slice(0, 10); out.push({ v, l: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }) } return out }, [mesAtual])
  const exportar = async () => {
    const el = wrap.current?.querySelector('.react-flow'); if (!el) return
    const png = await toPng(el, { backgroundColor: P.fundo, pixelRatio: 2, filter: x => !(x.classList && (x.classList.contains('react-flow__minimap') || x.classList.contains('react-flow__controls') || x.classList.contains('legenda'))) })
    const a = document.createElement('a'); a.download = `mapa-${conta}-${mapaId || template}-${per.ini}_${per.fim}.png`; a.href = png; a.click()
  }
  const k = nums?.kpis, kA = ant?.kpis
  const D = (v, va, pct) => (comparar && va != null && v != null) ? <small className={v - va > 0 ? 'up' : v - va < 0 ? 'down' : 'flat'}>{v - va > 0 ? '+' : ''}{pct ? (v - va).toFixed(2) : nf(v - va)}</small> : null
  const nomeConta = lista?.mentorias?.find(m => m.codigo === conta)?.nome || conta
  const mapasConta = (lista?.mapas || []).filter(m => m.mentoria === conta)
  const selMapa = mapaId ? 'id:' + mapaId : 't:' + template
  const escolherMapa = (v) => trocar(() => { if (v.startsWith('id:')) setMapaId(v.slice(3)); else { setMapaId(null); setTemplate(v.slice(2)) } })

  return (
    <div className={'app' + (camada === 'mapa' ? ' modo-mapa' : '') + (editar ? ' modo-editar' : '')}>
      <header>
        <h1>Mapa dos Funis<small>{doc?.nome || ''}{nums?.rascunho ? ' · rascunho' : ''}</small></h1>
        <select value={conta} onChange={e => trocar(() => { setMapaId(null); setConta(e.target.value) })} title="Conta (mentoria)">{(lista?.mentorias || [{ codigo: conta, nome: conta }]).map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}</select>
        <select value={selMapa} onChange={e => escolherMapa(e.target.value)} title="Mapa">
          <optgroup label="Templates">{(lista?.templates || [{ codigo: 'mestre', nome: 'Mapa mestre', tipo: 'mestre' }]).map(t => <option key={t.codigo} value={'t:' + t.codigo}>{t.tipo === 'mestre' ? '★ ' : ''}{t.nome}</option>)}</optgroup>
          {mapasConta.length > 0 && <optgroup label={`Mapas de ${nomeConta}`}>{mapasConta.map(m => <option key={m.id} value={'id:' + m.id}>{m.nome} · v{m.versao}</option>)}</optgroup>}
          {mapaId && !mapasConta.some(m => m.id === mapaId) && <option value={'id:' + mapaId}>{doc?.nome || 'mapa'}</option>}
        </select>
        <select value={pTipo} onChange={e => setPTipo(e.target.value)} title="Período">{PERIODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {pTipo === 'custom' && <><input type="date" value={custom.ini} onChange={e => setCustom(c => ({ ...c, ini: e.target.value }))} /><input type="date" value={custom.fim} onChange={e => setCustom(c => ({ ...c, fim: e.target.value }))} /></>}
        <button className={comparar ? 'on' : ''} onClick={() => setComparar(v => !v)} title="Variação contra o período anterior de mesmo tamanho">± anterior</button>
        <div className="camadas"><button className={camada === 'real' ? 'on' : ''} onClick={() => { setCamada('real'); setSel(null) }}>Real</button><button className={camada === 'mapa' ? 'on' : ''} onClick={() => { setCamada('mapa'); setSel(null) }}>Só o mapa</button><button className={camada === 'previsao' ? 'on' : ''} onClick={() => { setCamada('previsao'); setEditar(false); setSel(null); setDetalhe(null) }} title="Taxas e verba por cenário, real × previsto, meta do mês">Previsão</button></div>
        {papel === 'admin' && <button className={editar ? 'on' : ''} onClick={() => { if (editar && sujo && !window.confirm('Sair da edição e descartar as alterações não salvas?')) return; if (editar) { carregar() } setEditar(v => !v); setSel(null); setDetalhe(null) }} title="Edita este desenho: arrastar, criar nós e setas, vincular dados">✎ Editar</button>}
        <button onClick={() => carregar(true)} title="Recalcula agora (ignora o cache do dia)" disabled={editar}>↻ Recalcular</button>
        <button onClick={exportar} title="Baixa a imagem do mapa">⬇ PNG</button>
        <button className="tema-btn" onClick={() => setTema(t => t === 'dark' ? 'light' : 'dark')} title={tema === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}>{tema === 'dark' ? '☀️' : '🌙'}</button>
        {camada === 'previsao' && calc && <div className="kpis" style={{ borderLeft: '2px solid var(--gold)', paddingLeft: 8 }}>
          <div className="kpi"><b style={{ color: 'var(--gold)' }}>{nf(calc.kpis.matriculas)}</b><span>previsto · matrículas</span></div>
          <div className="kpi"><b style={{ color: 'var(--gold)' }}>R$ {nf(calc.kpis.receita)}</b><span>receita</span></div>
          <div className="kpi"><b style={{ color: 'var(--gold)' }}>R$ {nf(calc.kpis.gasto)}</b><span>mídia</span></div>
          <div className="kpi"><b style={{ color: 'var(--gold)' }}>{calc.kpis.roas != null ? String(calc.kpis.roas).replace('.', ',') + '×' : '—'}</b><span>ROAS</span></div>
          <div className="kpi"><b style={{ color: 'var(--gold)' }}>{calc.kpis.cpa != null ? 'R$ ' + nf(calc.kpis.cpa) : '—'}</b><span>CPA</span></div>
        </div>}
        {k && camada !== 'previsao' && <div className="kpis">
          <div className="kpi"><b>{nf(k.matriculas)}{D(k.matriculas, kA?.matriculas)}</b><span>matrículas</span></div>
          <div className="kpi"><b>R$ {nf(k.receita)}{D(k.receita, kA?.receita)}</b><span>receita</span></div>
          <div className="kpi"><b>R$ {nf(k.gasto)}{D(k.gasto, kA?.gasto)}</b><span>mídia ×1,1383</span></div>
          <div className="kpi"><b>{k.roas != null ? String(k.roas).replace('.', ',') + '×' : '—'}{D(k.roas, kA?.roas, true)}</b><span>ROAS</span></div>
          <div className="kpi"><b>{k.cpa != null ? 'R$ ' + nf(k.cpa) : '—'}{D(k.cpa, kA?.cpa)}</b><span>CPA</span></div>
        </div>}
        <div className="status">
          <span><b>{nomeConta}</b> · {ddmm(per.ini)} → {ddmm(per.fim)}{comparar && ant ? ` (anterior ${ddmm(ant.ini)} → ${ddmm(ant.fim)})` : ''}</span>
          {nums && <span>números {nums.rascunho ? 'do rascunho' : nums.cache ? 'do cache' : 'recalculados'} · gerado {dhm(nums.gerado_em)}{nums.ms ? ` · ${(nums.ms / 1000).toFixed(1)} s` : ''} · janela {nums.janela_dias} d</span>}
          <span>sem Black · matrícula = 1ª parcela paga · dia no fuso de Manaus{papel === 'leitura' ? ' · modo leitura' : ''}</span>
          {editar && <span className="sujo">{sujo ? '● alterações não salvas' : '✎ modo de edição'}</span>}
          {statusMes && !statusMes.sem_dados && !statusMes.sem_previsao && (statusMes.alerta
            ? <span style={{ color: 'var(--red)', fontWeight: 600 }} title={(statusMes.alertas || []).join(' · ')}>⚠ fora da previsão: {(statusMes.alertas || [])[0]}</span>
            : <span style={{ color: 'var(--green)' }}>✓ dentro da previsão do mês (matrículas {statusMes.desvio_pct?.matriculas > 0 ? '+' : ''}{statusMes.desvio_pct?.matriculas ?? 0}% vs esperado)</span>)}
        </div>
      </header>
      <div className="corpo">
        <div className="canvas" ref={wrap}>
          {erro && <div className="erro" onClick={() => setErro('')}>⚠ {erro}</div>}
          {(carregando || ocupado) && <div className="carregando">{ocupado ? 'Gravando…' : 'Calculando o mapa…'}</div>}
          <svg width="0" height="0" style={{ position: 'absolute' }}><defs>
            {Object.entries(PALETAS).flatMap(([t, pal]) => Object.entries(pal.CORES).map(([c, cor]) => <marker key={t + c} id={`m-${c}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill={cor} /></marker>))}
          </defs></svg>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} minZoom={0.15} maxZoom={2} fitView proOptions={{ hideAttribution: true }}
            nodesDraggable={editar} nodesConnectable={editar} elementsSelectable={false} panOnScroll zoomOnScroll={false}
            onNodesChange={onNodesChange} onNodeDragStop={onNodeDragStop} onConnect={onConnect}
            onNodeClick={(_, n) => { if (n.type !== 'no') return; (editar || camada === 'previsao') ? setSel({ tipo: 'no', id: n.id }) : abrirNo(n.data.n) }} onPaneClick={() => { setSel(null); setDetalhe(null) }}>
            <Background color={P.pontos} gap={22} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={n => n.type === 'raia' ? 'transparent' : P.minimapNo} maskColor={P.minimapMask} />
          </ReactFlow>
          <div className="legenda">
            <i style={{ background: P.STRIPE.fonte }} />fonte <i style={{ background: P.STRIPE.pagina }} />página <i style={{ background: P.STRIPE.evento }} />evento <i style={{ background: P.STRIPE.anne }} />Anne <i style={{ background: P.STRIPE.humano }} />humano <i style={{ background: P.STRIPE.resultado }} />resultado<br />
            Seta = pessoas que passaram de um nó ao outro em até {nums?.janela_dias ?? 30} dias · <b style={{ color: 'var(--green)' }}>%</b> <b style={{ color: 'var(--amber)' }}>%</b> <b style={{ color: 'var(--red)' }}>%</b> cores por faixa (provisórias até a Previsão) · largura ∝ volume · clique no nó ou no número da seta para ver quem passou.
          </div>
          {toast && <div className="toast">{toast}</div>}
        </div>
        {camada === 'previsao' && doc && params && <Previsao doc={doc} prev={prev} cenario={cenario} setCenario={setCenario} params={params} setParams={setParams} calc={calc} status={prev?.status} meta={prev?.meta} mes={prevMes} setMes={setPrevMes} mesesOpcoes={mesesOpcoes} sel={sel} onSel={setSel} acoes={acoesPrev} ocupado={ocupado} papel={papel} />}
        {editar && doc && <Editor doc={doc} sel={sel} catalogo={catalogo} papel={papel} mapaId={mapaId} sujo={sujo} ocupado={ocupado} versoes={versoes} onDoc={marcar} onSel={setSel} acoes={acoes} />}
        {!editar && camada !== 'previsao' && sel && <Detalhe d={detalhe} carregando={detCarregando} titulo={sel.titulo} onClose={() => { setSel(null); setDetalhe(null) }} />}
      </div>
    </div>
  )
}
export default function App() { return <ReactFlowProvider><Mapa /></ReactFlowProvider> }
