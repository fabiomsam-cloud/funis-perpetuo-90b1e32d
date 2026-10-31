import React, { memo } from 'react'
export default memo(function Raia({ data }) {
  return <div className={'raia' + (data.vazia ? ' vazia' : '')}><div className="rot">{data.titulo}<b>{data.sub}</b></div></div>
})
