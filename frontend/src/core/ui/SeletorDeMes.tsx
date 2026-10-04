import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { FC } from 'react'

import { useMesSelecionado } from '@/core/hooks'
import { nomeDoMes } from '@/core/utils'

const CLASSES_DA_SETA =
  'flex size-11 items-center justify-center rounded-full text-marca transition-transform duration-150 outline-none active:scale-96 focus-visible:bg-marca-suave motion-reduce:transition-none'

export const SeletorDeMes: FC = () => {
  const { mes, anterior, proximo } = useMesSelecionado()

  return (
    <div className="flex items-center justify-between rounded-xl bg-superficie px-1">
      <button
        aria-label="Mês anterior"
        className={CLASSES_DA_SETA}
        onClick={anterior}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="size-6" />
      </button>
      {/* aria-live: quem usa leitor de tela ouve o mês novo ao trocar */}
      <span aria-live="polite" className="font-semibold">
        {nomeDoMes(mes)}
      </span>
      <button aria-label="Próximo mês" className={CLASSES_DA_SETA} onClick={proximo} type="button">
        <ChevronRight aria-hidden="true" className="size-6" />
      </button>
    </div>
  )
}
