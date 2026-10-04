import { Check } from 'lucide-react'
import type { FC } from 'react'

import {
  CLASSES_DA_COR,
  CORES,
  NOMES_DAS_CORES,
  NOMES_DOS_ICONES,
  cn,
  type Cor,
  type NomeDoIcone,
} from '@/core/utils'

import { ICONES, ROTULOS_DOS_ICONES } from './icones'

// Os dois seletores são rádios de verdade, escondidos atrás do desenho: setas do teclado
// trocam a escolha e leitores de tela anunciam "Azul, 1 de 8" sem código extra

const CLASSES_DA_LEGENDA = 'mb-1.5 px-4 text-nota text-conteudo-secundario uppercase'
const FOCO =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marca'

type SeletorDeCorProps = {
  nome: string
  valor: Cor
  aoMudar: (cor: Cor) => void
}

export const SeletorDeCor: FC<SeletorDeCorProps> = ({ nome, valor, aoMudar }) => {
  return (
    <fieldset className="mt-8">
      <legend className={CLASSES_DA_LEGENDA}>Cor</legend>
      <div className="grid grid-cols-8 rounded-xl bg-superficie px-2 py-1">
        {CORES.map((cor) => {
          const { fundo, tinta } = CLASSES_DA_COR[cor]
          return (
            // A célula inteira (44px de altura) é a área de toque; a bolinha é só o desenho
            <label className="flex h-11 cursor-pointer items-center justify-center" key={cor}>
              <input
                checked={valor === cor}
                className="peer sr-only"
                name={nome}
                onChange={() => {
                  aoMudar(cor)
                }}
                type="radio"
                value={cor}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-8 items-center justify-center rounded-full',
                  fundo,
                  tinta,
                  FOCO,
                )}
              >
                {valor === cor ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="sr-only">{NOMES_DAS_CORES[cor]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

type SeletorDeIconeProps = {
  nome: string
  valor: NomeDoIcone
  /** O escolhido aparece nesta cor, para ver como vai ficar */
  cor: Cor
  aoMudar: (icone: NomeDoIcone) => void
}

export const SeletorDeIcone: FC<SeletorDeIconeProps> = ({ nome, valor, cor, aoMudar }) => {
  const escolhido = CLASSES_DA_COR[cor]
  return (
    <fieldset className="mt-8">
      <legend className={CLASSES_DA_LEGENDA}>Ícone</legend>
      <div className="grid grid-cols-6 gap-1 rounded-xl bg-superficie p-2">
        {NOMES_DOS_ICONES.map((icone) => {
          const Icone = ICONES[icone]
          const marcado = valor === icone
          return (
            <label className="flex h-12 cursor-pointer items-center justify-center" key={icone}>
              <input
                checked={marcado}
                className="peer sr-only"
                name={nome}
                onChange={() => {
                  aoMudar(icone)
                }}
                type="radio"
                value={icone}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg transition-colors duration-150',
                  marcado
                    ? [escolhido.fundo, escolhido.tinta]
                    : 'bg-fundo text-conteudo-secundario',
                  FOCO,
                )}
              >
                <Icone className="size-5" strokeWidth={2} />
              </span>
              <span className="sr-only">{ROTULOS_DOS_ICONES[icone]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
