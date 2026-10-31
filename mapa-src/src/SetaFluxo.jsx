import React, { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react'
import { CORES, larguraSeta } from './regras.js'
import { nf } from './periodo.js'
const bez = (t, p0, p1, p2, p3) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3 }
const T = [0.3, 0.5, 0.7, 0.4, 0.6, 0.35, 0.65, 0.45, 0.55]
export default memo(function SetaFluxo({ id, sourceX, sourceY, targetX, targetY, data }) {
  const { e, cor, k, longa, apagado, comparar, antPct, onClick, prevTaxa, prevN } = data
  const dx = Math.max(60, (targetX - sourceX) / 2)
  const path = `M${sourceX},${sourceY} C${sourceX + dx},${sourceY} ${targetX - dx},${targetY} ${targetX},${targetY}`
  const t = longa ? T[k % T.length] : 0.5
  const lx = bez(t, sourceX, sourceX + dx, targetX - dx, targetX), ly = bez(t, sourceY, sourceY, targetY, targetY)
  const n = e.ab, pct = e.pct, h = e.horas
  const temRotulo = n != null || prevTaxa != null
  const dPct = comparar && antPct != null && pct != null ? Math.round((pct - antPct) * 10) / 10 : null
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={`url(#m-${cor})`}
        style={{ stroke: CORES[cor], strokeWidth: larguraSeta(n), opacity: apagado ? 0.06 : cor === 'dash' ? 0.55 : longa ? 0.5 : 0.85, strokeDasharray: cor === 'dash' ? '6 5' : undefined }} />
      {temRotulo && (
        <EdgeLabelRenderer>
          <div className={`rotulo ${cor}${apagado ? ' apagado' : ''}`} style={{ left: lx, top: ly }} onClick={onClick}
            title={`${nf(n)} pessoas de ${e.from} para ${e.to}` + (pct != null ? ` · ${pct}% do nó de origem` : '') + (h != null ? ` · ${h} h em média` : '') + (e.custo_por_pessoa != null ? ` · R$ ${e.custo_por_pessoa} por pessoa` : '')}>
            {prevTaxa != null && <span style={{ color: 'var(--gold)' }}><b style={{ color: 'var(--gold)' }}>{String(prevTaxa).replace('.', ',')}%</b>{prevN != null ? ` ≈ ${nf(Math.round(prevN))}` : ''} <small style={{ color: 'var(--gold)', opacity: .8 }}>prev</small>{n != null ? ' · ' : ''}</span>}
            {n != null && <b>{nf(n)}</b>}
            {n != null && pct != null && <span> · {String(pct).replace('.', ',')}%{prevTaxa != null ? ' real' : ''}</span>}
            {dPct != null && dPct !== 0 && <span className={'d ' + (dPct > 0 ? 'up' : 'down')}>{dPct > 0 ? '▲' : '▼'}{Math.abs(dPct)}</span>}
            {h != null && <small> · {h} h</small>}
            {e.custo_por_pessoa != null && <small> · R$ {e.custo_por_pessoa}/pessoa</small>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
