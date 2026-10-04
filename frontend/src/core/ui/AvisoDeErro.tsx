import type { FC } from 'react'

import { Botao } from './Botao'

type AvisoDeErroProps = {
  titulo?: string
  mensagem?: string
  aoTentarDeNovo: () => void
}

export const AvisoDeErro: FC<AvisoDeErroProps> = ({
  titulo = 'Não foi possível carregar',
  mensagem = 'Confira se o servidor está ligado e tente de novo.',
  aoTentarDeNovo,
}) => {
  return (
    <div className="mt-6 rounded-xl bg-superficie p-5 text-center" role="alert">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 text-subtitulo text-conteudo-secundario">{mensagem}</p>
      <Botao className="mt-3" intencao="simples" onClick={aoTentarDeNovo}>
        Tentar de novo
      </Botao>
    </div>
  )
}
