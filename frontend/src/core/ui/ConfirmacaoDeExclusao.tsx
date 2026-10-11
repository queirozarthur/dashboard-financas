import { useState, type FC } from 'react'

import { cn } from '@/core/utils'

import { Botao } from './Botao'

type ConfirmacaoDeExclusaoProps = {
  /** Texto do botão, ex.: "Apagar lançamento" */
  rotulo: string
  /** Pergunta da confirmação, ex.: "Apagar este lançamento?" */
  pergunta: string
  /** Linha embaixo da pergunta */
  aviso?: string
  /** Texto do botão que confirma */
  confirmar?: string
  apagando: boolean
  aoApagar: () => void
  /**
   * No celular, listas apagam arrastando a linha, então o botão fica só no computador.
   * Onde não há linha para arrastar (ex.: apagar uma compra inteira), ele aparece sempre.
   */
  visivelNoCelular?: boolean
}

/** Ação destrutiva: botão vermelho, com confirmação no mesmo lugar antes de agir. */
export const ConfirmacaoDeExclusao: FC<ConfirmacaoDeExclusaoProps> = ({
  rotulo,
  pergunta,
  aviso = 'Não dá para desfazer.',
  confirmar = 'Apagar',
  apagando,
  aoApagar,
  visivelNoCelular = false,
}) => {
  const [confirmando, setConfirmando] = useState(false)
  const visibilidade = visivelNoCelular ? '' : 'hidden md:block'

  if (!confirmando) {
    return (
      <div className={cn('mt-8 rounded-xl bg-superficie', visibilidade)}>
        <Botao
          intencao="perigo"
          largura="total"
          onClick={() => {
            setConfirmando(true)
          }}
        >
          {rotulo}
        </Botao>
      </div>
    )
  }

  return (
    <div className={cn('mt-8 rounded-xl bg-superficie p-4 text-center', visibilidade)} role="group">
      <p className="font-semibold">{pergunta}</p>
      <p className="mt-1 text-subtitulo text-conteudo-secundario">{aviso}</p>
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
          {confirmar}
        </Botao>
      </div>
    </div>
  )
}
