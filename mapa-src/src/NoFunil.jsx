import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ICONE, paleta, valorNo } from './regras.js'
import { nf } from './periodo.js'

function Delta({ atual, ant }) {
  if (ant == null || atual == null) return null
  const d = atual - ant; if (d === 0) return <small className="flat">=</small>
  const p = ant ? Math.round(d / ant * 100) : null
  return <small className={d > 0 ? 'up' : 'down'} title={`período anterior: ${nf(ant)}`}>{d > 0 ? '+' : ''}{nf(d)}{p != null ? ` (${p > 0 ? '+' : ''}${p}%)` : ''}</small>
}
export default memo(function NoFunil({ data }) {
  const { n, sel, apagado, comparar, ant, tema } = data
  const STRIPE = paleta(tema).STRIPE
  const v = valorNo(n), va = ant ? valorNo({ ...n, valor: ant }) : null
  const k = n.bind?.k, val = n.valor || {}
  const cls = ['no', n.tipo, sel ? 'sel' : '', apagado ? 'apagado' : '', v.vazio && n.tipo !== 'nota' ? 'vazio' : ''].join(' ')
  if (n.tipo === 'nota') return (
    <div className={cls}><div className="n">📝 {n.titulo}</div>{n.sub && <div className="s">{n.sub}</div>}</div>
  )
  return (
    <div className={cls} style={{ '--cor': STRIPE[n.tipo] || '#2b4638' }} title={n.bind ? JSON.stringify(n.bind) : ''}>
      {Array.from({ length: 9 }, (_, i) => <Handle key={i} type="target" position={Position.Left} id={'t' + i} style={{ top: 14 + i * 11 }} />)}
      <Handle type="source" position={Position.Right} id="s" />
      <div className="t">{ICONE[n.tipo]} {n.tipo}</div>
      <div className="n">{n.titulo}</div>
      {data.previsao ? (
        <>
          <div className="v" style={{ color: 'var(--gold)' }}>{data.previsao.texto}<small style={{ color: 'var(--gold)', opacity: .8 }}>previsto</small></div>
          <div className="s">real no período: <b>{v.texto}</b>{data.previsao.num != null && v.num != null && data.previsao.num > 0 && data.ritmo != null ? <span className={v.num >= data.previsao.num * data.ritmo ? 'up' : 'down'}> · {Math.round((v.num / (data.previsao.num * data.ritmo) - 1) * 100) > 0 ? '+' : ''}{Math.round((v.num / (data.previsao.num * data.ritmo) - 1) * 100)}% vs esperado</span> : null}</div>
        </>
      ) : (
        <div className="v">{v.texto}{comparar && va && <Delta atual={v.num} ant={va.num} />}</div>
      )}
      {k === 'gasto' && <div className="s">{val.campanhas ? `${val.campanhas} campanha${val.campanhas > 1 ? 's' : ''} · com imposto` : (n.sub || 'sem gasto no período')}</div>}
      {k === 'evento' && <div className="s">{val.eventos && val.eventos !== val.pessoas ? `pessoas · ${nf(val.eventos)} eventos` : 'pessoas'}{n.sub ? ` · ${n.sub}` : ''}</div>}
      {k === 'vendas' && val.matriculas != null && (
        <div className="s">R$ {nf(val.receita)} · 1ª parcela paga<br />
          fechamento: <b style={{ color: 'var(--purple)' }}>Anne {val.fechamento?.anne ?? 0}</b> · <b style={{ color: 'var(--gold)' }}>humano {val.fechamento?.humano ?? 0}</b> · sozinho {val.fechamento?.sozinho ?? 0}<br />
          {Object.entries(val.por_funil || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, q]) => `${f} ${q}`).join(' · ')}
          {val.reembolsos ? <><br /><span style={{ color: 'var(--red)' }}>{val.reembolsos} reembolso{val.reembolsos > 1 ? 's' : ''}</span></> : null}
        </div>)}
      {k === 'nenhum' && n.sub && <div className="s">{n.sub}</div>}
    </div>
  )
})
