import type { FC } from 'react'

import type { Conta } from '@/core/api'
import { IconeDoCadastro } from '@/core/ui'
import { cn } from '@/core/utils'

type SeletorDeCartaoProps = {
  cartoes: readonly Conta[]
  escolhido: number
  aoEscolher: (id: number) => void
}

/**
 * Uma pílula por cartão, com o ícone e a cor dele. Por baixo são rádios: as setas do teclado
 * trocam o cartão e o leitor de tela anuncia "1 de 3". No celular a fileira rola de lado.
 */
export const SeletorDeCartao: FC<SeletorDeCartaoProps> = ({ cartoes, escolhido, aoEscolher }) => {
  return (
    // min-w-0: um fieldset não encolhe abaixo do conteúdo, e a fileira empurraria a página
    <fieldset className="-mx-4 mt-4 min-w-0 [scrollbar-width:none] overflow-x-auto px-4">
      <legend className="sr-only">Cartão</legend>
      <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {cartoes.map((cartao) => {
          const marcado = cartao.id === escolhido
          return (
            <label
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2 rounded-full py-1 pr-4 pl-1.5 text-subtitulo select-none',
                'transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-marca',
                marcado
                  ? 'bg-superficie font-semibold shadow-flutuante'
                  : 'bg-separador/40 font-medium text-conteudo-secundario',
              )}
              key={cartao.id}
            >
              <input
                checked={marcado}
                className="sr-only"
                name="cartao"
                onChange={() => {
                  aoEscolher(cartao.id)
                }}
                type="radio"
                value={cartao.id}
              />
              <IconeDoCadastro cor={cartao.cor} icone={cartao.icone} tamanho="pequeno" />
              {cartao.nome}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
