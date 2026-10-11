import type { FC } from 'react'

type MensagemDeErroProps = {
  mensagem: string | undefined
}

// Controle segmentado não tem a linha de erro dos campos: a mensagem vem logo embaixo dele
export const MensagemDeErro: FC<MensagemDeErroProps> = ({ mensagem }) => {
  if (!mensagem) {
    return null
  }
  return (
    <p className="mt-1.5 px-4 text-nota text-despesa" role="alert">
      {mensagem}
    </p>
  )
}
