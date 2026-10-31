import React from 'react'
import { nf, dhm, ddmm } from './periodo.js'
const Tag = ({ c, children }) => <span className={'tag ' + (c || '')}>{children}</span>
export default function Detalhe({ d, carregando, onClose, titulo }) {
  const itens = d?.itens || []
  return (
    <aside className="lateral">
      <div className="cab">
        <div>
          <h2>{titulo}</h2>
          {d && <div className="sub">{ddmm(d.ini)} → {ddmm(d.fim)} · {d.tipo === 'seta' ? 'quem passou de um nó ao outro em até 30 dias' : d.tipo === 'gasto' ? 'campanhas da Meta que gastaram no período' : d.tipo === 'vendas' ? 'matrículas do período (1ª parcela)' : 'pessoas únicas no período · até 200 listadas'}</div>}
        </div>
        <button className="x" onClick={onClose} title="Fechar">✕</button>
      </div>
      {carregando && <div className="vazio-msg">Carregando…</div>}
      {!carregando && d && (
        <>
          <div className="res">
            {d.total != null && <div><b>{nf(d.total)}</b>{d.tipo === 'seta' ? 'saíram do nó de origem' : d.tipo === 'vendas' ? 'matrículas' : d.tipo === 'gasto' ? 'R$ com imposto' : 'pessoas'}</div>}
            {d.passaram != null && <div><b>{nf(d.passaram)}</b>chegaram ao destino{d.total ? ` (${Math.round(d.passaram / d.total * 100)}%)` : ''}</div>}
            {d.compraram != null && <div><b>{nf(d.compraram)}</b>compraram depois{d.total ? ` (${Math.round(d.compraram / d.total * 100)}%)` : ''}</div>}
            {d.tipo === 'gasto' && <div><b>{itens.length}</b>campanhas</div>}
          </div>
          <div className="lista">
            {!itens.length && <div className="vazio-msg">Nada no período.</div>}
            {d.tipo === 'no' && !!itens.length && (
              <table><thead><tr><th>Telefone</th><th>1º evento</th><th>Último</th><th>Jev</th><th>Último passo</th><th>Comprou</th></tr></thead>
                <tbody>{itens.map((x, i) => <tr key={i}><td>{x.tel}</td><td>{dhm(x.primeiro)}</td><td>{dhm(x.ultimo)}</td><td>{x.classe ? <Tag c={x.classe}>{x.classe}</Tag> : ''}</td>
                  <td className="q">{x.ult_funil ? `${x.ult_funil} · ${x.ult_tipo}` : ''}</td><td>{x.comprou_em ? <Tag c="ok">{ddmm(x.comprou_em.slice(0, 10))}</Tag> : ''}</td></tr>)}</tbody></table>)}
            {d.tipo === 'seta' && !!itens.length && (
              <table><thead><tr><th>Telefone</th><th>Saiu de A</th><th>Chegou em B</th><th>Horas</th></tr></thead>
                <tbody>{itens.map((x, i) => <tr key={i}><td>{x.tel}</td><td>{dhm(x.a)}</td><td>{x.b ? <Tag c="ok">{dhm(x.b)}</Tag> : <Tag>não chegou</Tag>}</td><td>{x.horas ?? ''}</td></tr>)}</tbody></table>)}
            {d.tipo === 'gasto' && !!itens.length && (
              <table><thead><tr><th>Campanha</th><th>Conta</th><th>Gasto</th><th>Cliques</th><th>Dias</th></tr></thead>
                <tbody>{itens.map((x, i) => <tr key={i}><td className="q">{x.campaign_name}</td><td>{x.ad_account_name}</td><td>R$ {nf(x.gasto)}</td><td>{nf(x.cliques)}</td><td>{x.dias}</td></tr>)}</tbody></table>)}
            {d.tipo === 'vendas' && !!itens.length && (
              <table><thead><tr><th>Dia</th><th>Telefone</th><th>Produto</th><th>Valor</th><th>Fechou</th><th>Funil</th><th>Origem</th></tr></thead>
                <tbody>{itens.map((x, i) => <tr key={i} style={x.reembolsada ? { opacity: .5, textDecoration: 'line-through' } : null}><td>{ddmm(x.dia)}</td><td>{x.tel}</td><td className="q">{x.produto}</td><td>R$ {nf(x.valor)}</td><td><Tag c={x.fechamento === 'anne' ? 'A' : ''}>{x.fechamento}</Tag></td><td>{x.funil || 'direto'}</td><td>{x.origem}</td></tr>)}</tbody></table>)}
          </div>
        </>
      )}
    </aside>
  )
}
