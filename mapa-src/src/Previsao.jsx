import React from 'react'
import { nf, ddmm } from './periodo.js'
const CEN = [['base', 'Base'], ['otimista', 'Otimista'], ['pessimista', 'Pessimista']]
const pct = (a, b) => (b ? Math.round((a / b - 1) * 100) : null)
const Sinal = ({ v }) => v == null ? null : <small className={v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}> {v > 0 ? '+' : ''}{v}%</small>

export default function Previsao({ doc, prev, cenario, setCenario, params, setParams, calc, status, meta, mes, setMes, mesesOpcoes, sel, onSel, acoes, ocupado, papel }) {
  const fontes = doc.nodes.filter(n => params?.fontes?.[n.id])
  const edgeSel = sel?.tipo === 'seta' ? doc.edges.find(e => e.from === sel.de && e.to === sel.para) : null
  const nome = id => doc.nodes.find(n => n.id === id)?.titulo || id
  const upF = (id, patch) => setParams(p => ({ ...p, fontes: { ...p.fontes, [id]: { ...p.fontes[id], ...patch } } }))
  const k = calc?.kpis || {}, r = status?.real || {}, esp = status?.esperado_ate_agora
  const salva = prev?.salvas?.[cenario]
  const cpaPrev = k.cpa, metaM = meta?.meta_matriculas
  return (
    <aside className="ed">
      <div className="bloco">
        <h3>Previsão · {ddmm(mes).slice(3)}/{mes?.slice(0, 4)}</h3>
        <div className="linha" style={{ marginTop: 0 }}>
          <select value={mes} onChange={e => setMes(e.target.value)}>{mesesOpcoes.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
          <div className="camadas">{CEN.map(([v, l]) => <button key={v} className={cenario === v ? 'on' : ''} onClick={() => setCenario(v)}>{l}</button>)}</div>
        </div>
        <div className="dica" style={{ marginTop: 6 }}>
          {salva ? `Cenário salvo em ${new Date(salva.atualizado_em).toLocaleString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.` : 'Cenário ainda não salvo: números vêm da média real dos últimos 60 dias' + (cenario !== 'base' ? ` ajustada (${cenario === 'otimista' ? 'taxas +15%, custo −10%' : 'taxas −15%, custo +10%'})` : '') + '.'}
          {prev?.base && <> Base: {ddmm(prev.base.ini)} → {ddmm(prev.base.fim)}.</>}
        </div>
        <div className="res" style={{ padding: '8px 0 0' }}>
          <div><b>{nf(k.matriculas)}</b>matrículas previstas</div>
          <div><b>R$ {nf(k.receita)}</b>receita</div>
          <div><b>R$ {nf(k.gasto)}</b>mídia</div>
          <div><b>{k.cpa != null ? 'R$ ' + nf(k.cpa) : '—'}</b>CPA</div>
          <div><b>{k.roas != null ? String(k.roas).replace('.', ',') + '×' : '—'}</b>ROAS</div>
        </div>
        {papel === 'admin' && (
          <div className="linha">
            <button className="ok" onClick={() => acoes.salvar(cenario)} disabled={ocupado}>💾 Salvar {cenario}</button>
            <button onClick={acoes.salvarTodos} disabled={ocupado} title="Salva base, otimista e pessimista de uma vez">Salvar os 3</button>
            <button onClick={acoes.recarregarBase} disabled={ocupado} title="Volta às médias reais dos últimos 60 dias">↺ Média 60 d</button>
            {salva && <button className="perigo" onClick={() => acoes.apagar(cenario)} disabled={ocupado}>Apagar</button>}
          </div>
        )}
      </div>

      {status && !status.sem_dados && (
        <div className="bloco">
          <h3>Real × previsto {status.sem_previsao ? '· sem previsão salva (base = média 60 d)' : ''}</h3>
          <div className="dica">Mês em andamento: {status.dias_decorridos} de {status.dias_mes} dias ({Math.round(status.ritmo * 100)}%). "Esperado" = previsão do cenário base no mesmo ritmo.</div>
          <table style={{ marginTop: 6 }}><thead><tr><th></th><th>Real até {ddmm(status.ate)}</th><th>Esperado</th><th>Mês inteiro</th></tr></thead>
            <tbody>
              <tr><td>Matrículas</td><td><b>{nf(r.matriculas)}</b><Sinal v={pct(r.matriculas, (esp?.matriculas ?? k.matriculas * status.ritmo))} /></td><td>{nf(esp?.matriculas ?? Math.round(k.matriculas * status.ritmo))}</td><td>{nf(status.previsao?.kpis?.matriculas ?? k.matriculas)}</td></tr>
              <tr><td>Receita</td><td><b>R$ {nf(r.receita)}</b><Sinal v={pct(r.receita, (esp?.receita ?? k.receita * status.ritmo))} /></td><td>R$ {nf(esp?.receita ?? Math.round(k.receita * status.ritmo))}</td><td>R$ {nf(status.previsao?.kpis?.receita ?? k.receita)}</td></tr>
              <tr><td>Mídia</td><td><b>R$ {nf(r.gasto)}</b><Sinal v={pct(r.gasto, (esp?.gasto ?? k.gasto * status.ritmo))} /></td><td>R$ {nf(esp?.gasto ?? Math.round(k.gasto * status.ritmo))}</td><td>R$ {nf(status.previsao?.kpis?.gasto ?? k.gasto)}</td></tr>
              <tr><td>ROAS</td><td><b>{r.roas != null ? String(r.roas).replace('.', ',') + '×' : '—'}</b></td><td colSpan={2}>{k.roas != null ? String(k.roas).replace('.', ',') + '×' : '—'} previsto</td></tr>
            </tbody></table>
          {!!status.alertas?.length && <div style={{ marginTop: 8 }}>{status.alertas.map((a, i) => <div key={i} className="dica" style={{ color: 'var(--amber)' }}>⚠ {a}</div>)}</div>}
        </div>
      )}

      <div className="bloco">
        <h3>Meta do mês</h3>
        {metaM != null ? (
          <div className="dica">
            Meta gravada: <b style={{ color: 'var(--cream)' }}>{nf(metaM)} matrículas</b>{meta.verba_prevista ? ` · verba prevista R$ ${nf(meta.verba_prevista)}` : ''}.<br />
            Com este cenário o mapa entrega <b style={{ color: k.matriculas >= metaM ? 'var(--green)' : 'var(--amber)' }}>{nf(k.matriculas)}</b> ({k.matriculas >= metaM ? 'bate a meta' : `faltam ${nf(metaM - k.matriculas)}`}).<br />
            {cpaPrev ? <>Para bater a meta com o CPA previsto (R$ {nf(cpaPrev)}): verba de <b style={{ color: 'var(--cream)' }}>R$ {nf(Math.round(metaM * cpaPrev))}</b>{k.gasto ? ` (hoje R$ ${nf(k.gasto)}, ${metaM * cpaPrev > k.gasto ? '+' : ''}R$ ${nf(Math.round(metaM * cpaPrev - k.gasto))})` : ''}.</> : 'Sem CPA previsto: informe verba e custo por pessoa nas fontes pagas.'}
          </div>
        ) : <div className="dica">Sem meta gravada para este mês (aba Config do painel).</div>}
      </div>

      {edgeSel && (
        <div className="bloco">
          <h3>Taxa da seta</h3>
          <div className="dica"><b style={{ color: 'var(--cream)' }}>{nome(edgeSel.from)}</b> → <b style={{ color: 'var(--cream)' }}>{nome(edgeSel.to)}</b></div>
          <label>Taxa prevista (% de quem sai do nó de origem)</label>
          <input type="number" min="0" max="100" step="0.1" value={params.taxas?.[edgeSel.from + '>' + edgeSel.to] ?? ''} onChange={e => setParams(p => ({ ...p, taxas: { ...p.taxas, [edgeSel.from + '>' + edgeSel.to]: e.target.value === '' ? undefined : Number(e.target.value) } }))} />
          <div className="dica" style={{ marginTop: 4 }}>Média real dos últimos 60 d: {prev?.base?.taxas?.[edgeSel.from + '>' + edgeSel.to] ?? '—'}% · tempo médio {prev?.base?.horas?.[edgeSel.from + '>' + edgeSel.to] ?? '—'} h</div>
          <div className="linha"><button onClick={() => onSel(null)}>Fechar</button></div>
        </div>
      )}

      <div className="bloco">
        <h3>Fontes e entradas</h3>
        {fontes.map(n => { const f = params.fontes[n.id]; const b = prev?.base?.fontes?.[n.id] || {}; return (
          <div key={n.id} style={{ marginBottom: 8, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{n.titulo}</div>
            {n.bind?.k === 'gasto' ? (
              <div className="linha" style={{ marginTop: 4 }}>
                <label style={{ margin: 0, flex: 1 }}>Verba (R$/mês)<input type="number" min="0" step="100" value={f.verba ?? ''} onChange={e => upF(n.id, { verba: Number(e.target.value) })} /></label>
                <label style={{ margin: 0, flex: 1 }}>Custo por pessoa (R$)<input type="number" min="0" step="0.5" value={f.custo_por_pessoa ?? ''} onChange={e => upF(n.id, { custo_por_pessoa: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                <div className="dica" style={{ width: '100%' }}>→ {nf(calc?.nos?.[doc.edges.find(e => e.from === n.id)?.to] ?? 0)} pessoas/mês · média 60 d: R$ {nf(b.gasto_mes)} a R$ {b.custo_por_pessoa ?? '—'} por pessoa</div>
              </div>
            ) : (
              <div className="linha" style={{ marginTop: 4 }}>
                <label style={{ margin: 0, flex: 1 }}>Pessoas no mês<input type="number" min="0" step="10" value={f.pessoas ?? ''} onChange={e => upF(n.id, { pessoas: Number(e.target.value) })} /></label>
                <div className="dica" style={{ width: '100%' }}>média 60 d: {nf(b.pessoas_mes)} pessoas/mês</div>
              </div>
            )}
          </div>) })}
        <label>Ticket por matrícula (1ª parcela, R$)</label>
        <input type="number" min="0" step="10" value={params.ticket ?? ''} onChange={e => setParams(p => ({ ...p, ticket: Number(e.target.value) }))} />
        <label>Alerta quando o real desviar mais de (%)</label>
        <input type="number" min="5" max="80" step="5" value={params.alerta_pct ?? 20} onChange={e => setParams(p => ({ ...p, alerta_pct: Number(e.target.value) }))} />
        <label>Nota</label>
        <textarea value={params.nota || ''} onChange={e => setParams(p => ({ ...p, nota: e.target.value }))} placeholder="o que mudou neste cenário" />
      </div>
      <div className="dica">Clique no número de uma seta para mudar a taxa prevista dela. Os números do mapa passam a mostrar previsto (dourado) e, no mês em andamento, o real logo abaixo.</div>
    </aside>
  )
}
