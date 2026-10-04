import { useState, type FC } from 'react'

import { Botao } from '@/core/ui'

type ZonaDeExclusaoProps = {
  apagando: boolean
  aoApagar: () => void
}

/**
 * Apagar pelo computador: botão no fim da folha, com confirmação no mesmo lugar.
 * No celular fica escondida (md:block): lá se apaga arrastando a linha da lista.
 */
export const ZonaDeExclusao: FC<ZonaDeExclusaoProps> = ({ apagando, aoApagar }) => {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <div className="mt-8 hidden rounded-xl bg-superficie md:block">
        <Botao
          intencao="perigo"
          largura="total"
          onClick={() => {
            setConfirmando(true)
          }}
        >
          Apagar lançamento
        </Botao>
      </div>
    )
  }

  return (
    <div className="mt-8 hidden rounded-xl bg-superficie p-4 text-center md:block" role="group">
      <p className="font-semibold">Apagar este lançamento?</p>
      <p className="mt-1 text-subtitulo text-conteudo-secundario">Não dá para desfazer.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao
          intencao="simples"
          onClick={() => {
            setConfirmando(false)
          }}
        >
          Manter
        </Botao>
        <Botao carregando={apagando} intencao="perigo" onClick={aoApagar}>
          Apagar
        </Botao>
      </div>
    </div>
  )
}
