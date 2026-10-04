import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { FC } from 'react'

import { useMesSelecionado, useTransicaoDoMes } from '@/core/hooks'
import { cn, nomeDoMes, textoDoMes } from '@/core/utils'

const CLASSES_DA_SETA =
  'flex size-11 items-center justify-center rounded-full text-marca transition-transform duration-150 outline-none active:scale-96 focus-visible:bg-marca-suave motion-reduce:transition-none'

const ENTRADA = {
  avancar: 'animate-mes-entrar-avancar',
  voltar: 'animate-mes-entrar-voltar',
} as const

const SAIDA = {
  avancar: 'animate-mes-sair-avancar',
  voltar: 'animate-mes-sair-voltar',
} as const

export const SeletorDeMes: FC = () => {
  const { mes, anterior, proximo } = useMesSelecionado()
  const { atual, saindo, direcao, terminarSaida } = useTransicaoDoMes(mes)

  return (
    <div className="flex items-center justify-between rounded-xl bg-superficie px-1">
      <button
        aria-label="Mês anterior"
        className={CLASSES_DA_SETA}
        onClick={anterior}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>

      {/* Os dois nomes ocupam a mesma célula da grade: um sai enquanto o outro entra.
          aria-live fica aqui, no contêiner fixo: quem usa leitor de tela ouve o mês novo */}
      <div aria-live="polite" className="grid overflow-hidden px-2">
        {saindo && direcao ? (
          <span
            aria-hidden="true"
            className={cn(
              'col-start-1 row-start-1 text-center font-semibold motion-reduce:hidden',
              SAIDA[direcao],
            )}
            key={`saindo-${textoDoMes(saindo)}`}
            onAnimationEnd={terminarSaida}
          >
            {nomeDoMes(saindo)}
          </span>
        ) : null}
        {/* key muda a cada mês: o elemento novo monta e a animação de entrada roda de novo */}
        <span
          className={cn(
            'col-start-1 row-start-1 text-center font-semibold motion-reduce:animate-none',
            direcao && ENTRADA[direcao],
          )}
          key={textoDoMes(atual)}
        >
          {nomeDoMes(atual)}
        </span>
      </div>

      <button aria-label="Próximo mês" className={CLASSES_DA_SETA} onClick={proximo} type="button">
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </div>
  )
}
