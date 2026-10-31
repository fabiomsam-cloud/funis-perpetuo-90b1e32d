import React, { useMemo, useState } from 'react'
import { nf, dhm } from './periodo.js'
const TIPOS = ['fonte', 'pagina', 'evento', 'anne', 'humano', 'resultado', 'saida', 'nota']
const NOME_TIPO = { fonte: '🎯 fonte', pagina: '📄 página', evento: '⚡ evento', anne: '💬 Anne', humano: '☎️ humano', resultado: '🏆 resultado', saida: '🚪 saída', nota: '📝 nota' }

export default function Editor({ doc, sel, catalogo, papel, mapaId, sujo, ocupado, versoes, onDoc, onSel, acoes }) {
  const [mostraVersoes, setMostraVersoes] = useState(false)
  const no = sel?.tipo === 'no' ? doc.nodes.find(n => n.id === sel.id) : null
  const seta = sel?.tipo === 'seta' ? doc.edges.find(e => e.from === sel.de && e.to === sel.para) : null
  const funis = useMemo(() => [...new Set((catalogo?.eventos || []).map(e => e.funil))].sort(), [catalogo])
  const tiposDe = f => (catalogo?.eventos || []).filter(e => !f || e.funil === f).reduce((m, e) => { m[e.tipo] = (m[e.tipo] || 0) + e.pessoas; return m }, {})
  const upd = (id, patch) => onDoc(d => ({ ...d, nodes: d.nodes.map(n => n.id === id ? { ...n, ...patch } : n) }))
  const updBind = (id, patch) => onDoc(d => ({ ...d, nodes: d.nodes.map(n => n.id === id ? { ...n, bind: { ...(n.bind || {}), ...patch } } : n) }))
  const titulo = (n) => n.titulo || n.id
  const nomeNo = id => titulo(doc.nodes.find(n => n.id === id) || { id })

  return (
    <aside className="ed">
      <div className="bloco">
        <h3>Mapa {sujo && <span className="sujo">· alterações não salvas</span>}</h3>
        <label>Nome</label>
        <input type="text" value={doc.nome || ''} onChange={e => onDoc(d => ({ ...d, nome: e.target.value }))} />
        <div className="dica" style={{ marginTop: 6 }}>{mapaId ? `Mapa salvo · versão ${doc.versao ?? '?'}` : `Baseado no template "${doc.template_codigo || 'mestre'}" — ao salvar vira um mapa seu desta conta.`}</div>
        <div className="linha">
          <button className="ok" onClick={acoes.salvar} disabled={ocupado}>💾 Salvar{mapaId ? '' : ' como mapa'}</button>
          <button onClick={acoes.atualizar} disabled={ocupado} title="Recalcula os números deste rascunho sem salvar">↻ Atualizar números</button>
          <button onClick={() => { onSel(null); acoes.addNo('evento') }} title="Novo nó no centro da tela">＋ Nó</button>
          <button onClick={() => { onSel(null); acoes.addNo('nota') }}>＋ Nota</button>
        </div>
        <div className="linha">
          <button onClick={acoes.duplicar} disabled={ocupado}>⧉ Duplicar</button>
          {papel === 'admin' && <button onClick={acoes.salvarTemplate} disabled={ocupado} title="Disponibiliza este desenho como template para todas as contas">★ Salvar como template</button>}
          {mapaId && <button onClick={() => { setMostraVersoes(v => !v); if (!mostraVersoes) acoes.versoes() }}>🕘 Versões</button>}
          {mapaId && <button className="perigo" onClick={acoes.arquivar}>Arquivar</button>}
          <button onClick={acoes.compartilhar} title="Copia um link só de leitura para a equipe">🔗 Link de leitura</button>
        </div>
        {mostraVersoes && mapaId && (
          <div style={{ marginTop: 8 }}>
            {(versoes || []).map(v => <div key={v.versao} className="ver"><span>v{v.versao} · {dhm(v.salvo_em)} · {v.nos} nós · {v.setas} setas</span><button onClick={() => acoes.carregarVersao(v.versao)}>Abrir</button></div>)}
            {!versoes?.length && <div className="dica">Sem versões ainda.</div>}
            <div className="dica" style={{ marginTop: 6 }}>Abrir uma versão antiga carrega o desenho; salvar de novo cria uma versão nova.</div>
          </div>
        )}
      </div>

      {no && (
        <div className="bloco">
          <h3>Nó selecionado</h3>
          <label>Tipo</label>
          <select value={no.tipo} onChange={e => upd(no.id, { tipo: e.target.value, bind: e.target.value === 'nota' ? { k: 'nenhum' } : e.target.value === 'resultado' ? { k: 'vendas' } : no.bind })}>
            {TIPOS.map(t => <option key={t} value={t}>{NOME_TIPO[t]}</option>)}
          </select>
          <label>{no.tipo === 'nota' ? 'Título' : 'Nome do nó'}</label>
          <input type="text" value={no.titulo || ''} onChange={e => upd(no.id, { titulo: e.target.value })} />
          <label>{no.tipo === 'nota' ? 'Texto' : 'Linha de apoio (opcional)'}</label>
          <textarea value={no.sub || ''} onChange={e => upd(no.id, { sub: e.target.value })} />
          <label>Raia</label>
          <select value={no.lane || ''} onChange={e => upd(no.id, { lane: e.target.value })}>{(doc.lanes || []).map(l => <option key={l.id} value={l.id}>{l.titulo}</option>)}</select>
          {no.tipo !== 'nota' && (
            <>
              <label>Vínculo com o dado</label>
              <select value={no.bind?.k || 'nenhum'} onChange={e => upd(no.id, { bind: { k: e.target.value } })}>
                <option value="evento">evento do Data Core (pessoas)</option>
                <option value="gasto">gasto de mídia (por funil)</option>
                <option value="vendas">matrículas (resultado)</option>
                <option value="nenhum">sem dado (só desenho)</option>
              </select>
              {no.bind?.k === 'evento' && (
                <>
                  <label>Funil</label>
                  <select value={no.bind.funil || ''} onChange={e => updBind(no.id, { funil: e.target.value || undefined })}>
                    <option value="">(qualquer funil)</option>{funis.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <label>Evento</label>
                  <select value={no.bind.tipo || ''} onChange={e => updBind(no.id, { tipo: e.target.value || undefined, tipos: undefined })}>
                    <option value="">— escolha —</option>
                    {Object.entries(tiposDe(no.bind.funil)).sort((a, b) => b[1] - a[1]).map(([t, p]) => <option key={t} value={t}>{t} · {nf(p)} pessoas em 90 d</option>)}
                  </select>
                  <div className="dica" style={{ marginTop: 4 }}>Vários eventos no mesmo nó: separe por vírgula abaixo (substitui o evento único).</div>
                  <input type="text" placeholder="ex.: card_devolvido, encerrado_inbox" value={(no.bind.tipos || []).join(', ')}
                    onChange={e => { const arr = e.target.value.split(',').map(x => x.trim()).filter(Boolean); updBind(no.id, { tipos: arr.length ? arr : undefined, tipo: arr.length ? undefined : no.bind.tipo }) }} />
                </>
              )}
              {no.bind?.k === 'gasto' && (
                <>
                  <label>Funil (classificação das campanhas)</label>
                  <select value={no.bind.funil || ''} onChange={e => updBind(no.id, { funil: e.target.value })}>
                    <option value="">— escolha —</option>{(catalogo?.gastos || []).map(g => <option key={g.funil} value={g.funil}>{g.funil} · R$ {nf(g.gasto)} em 90 d</option>)}
                  </select>
                </>
              )}
            </>
          )}
          <div className="linha">
            {no.tipo !== 'nota' && <button onClick={() => acoes.verDetalhe(no)} disabled={sujo} title={sujo ? 'Salve ou atualize os números antes' : 'Quem passou por este nó'}>👥 Quem passou</button>}
            <button className="perigo" onClick={() => { acoes.removerNo(no.id); onSel(null) }}>✕ Remover nó</button>
          </div>
        </div>
      )}

      {seta && (
        <div className="bloco">
          <h3>Seta selecionada</h3>
          <div className="dica"><b style={{ color: 'var(--cream)' }}>{nomeNo(seta.from)}</b> → <b style={{ color: 'var(--cream)' }}>{nomeNo(seta.to)}</b></div>
          <label>Estilo</label>
          <select value={seta.estilo || ''} onChange={e => onDoc(d => ({ ...d, edges: d.edges.map(x => x.from === seta.from && x.to === seta.to ? { ...x, estilo: e.target.value || undefined } : x) }))}>
            <option value="">com números (pessoas · % · horas)</option><option value="dash">tracejada (só ligação, sem número)</option>
          </select>
          <div className="linha">
            <button onClick={() => acoes.verSeta(seta)} disabled={sujo}>👥 Quem passou</button>
            <button className="perigo" onClick={() => { acoes.removerSeta(seta); onSel(null) }}>✕ Remover seta</button>
          </div>
        </div>
      )}

      <div className="bloco">
        <h3>Raias</h3>
        {(doc.lanes || []).map((l, i) => (
          <div key={l.id} className="raia-item">
            <input type="text" value={l.titulo} onChange={e => onDoc(d => ({ ...d, lanes: d.lanes.map(x => x.id === l.id ? { ...x, titulo: e.target.value } : x) }))} />
            <input type="text" value={l.sub || ''} placeholder="subtítulo" onChange={e => onDoc(d => ({ ...d, lanes: d.lanes.map(x => x.id === l.id ? { ...x, sub: e.target.value } : x) }))} />
            <button disabled={i === 0} onClick={() => acoes.moverRaia(l.id, -1)}>↑</button>
            <button disabled={i === doc.lanes.length - 1} onClick={() => acoes.moverRaia(l.id, 1)}>↓</button>
            <button className="perigo" onClick={() => acoes.removerRaia(l.id)} title="Remove a raia (os nós dela vão para a primeira raia)">✕</button>
          </div>
        ))}
        <div className="linha"><button onClick={acoes.addRaia}>＋ Raia</button></div>
      </div>

      <div className="dica">Arraste os nós para posicionar. Para ligar dois nós, arraste do ponto dourado à direita de um até o ponto à esquerda do outro. Clique num nó ou no número de uma seta para editar. Nada é gravado até você clicar em Salvar.</div>
    </aside>
  )
}
