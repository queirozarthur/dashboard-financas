import * as Dialog from '@radix-ui/react-dialog'
import type { CSSProperties, FC, ReactNode } from 'react'

import { useArrastarParaFechar } from '@/core/hooks'
import { cn } from '@/core/utils'

type FolhaProps = {
  aberta: boolean
  aoMudarAberta: (aberta: boolean) => void
  titulo: string
  /** Botão do canto direito da barra (ex.: "Salvar") */
  acao?: ReactNode
  children: ReactNode
}

/**
 * Folha que sobe de baixo, como as do iOS; no computador (md+) vira janela central.
 * O Radix cuida do que é difícil: foco preso dentro da folha, Esc fecha, fundo sem rolar.
 */
export const Folha: FC<FolhaProps> = ({ aberta, aoMudarAberta, titulo, acao, children }) => {
  return (
    <Dialog.Root onOpenChange={aoMudarAberta} open={aberta}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=closed]:animate-fundo-sair data-[state=open]:animate-fundo-entrar motion-reduce:animate-none" />
        <ConteudoDaFolha
          acao={acao}
          aoFechar={() => {
            aoMudarAberta(false)
          }}
          titulo={titulo}
        >
          {children}
        </ConteudoDaFolha>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type ConteudoDaFolhaProps = {
  titulo: string
  acao?: ReactNode
  aoFechar: () => void
  children: ReactNode
}

// Componente separado: o Radix desmonta o conteúdo ao fechar, então o arrasto volta a zero
// sozinho na próxima abertura
const ConteudoDaFolha: FC<ConteudoDaFolhaProps> = ({ titulo, acao, aoFechar, children }) => {
  const { arrasto, arrastando, manipuladores } = useArrastarParaFechar(aoFechar)
  // A variável CSS move a folha junto com o dedo; a classe translate-y-(--arrasto) a aplica
  const estilo: CSSProperties = { '--arrasto': `${arrasto}px` }

  return (
    <Dialog.Content
      // Sem descrição separada: o título e o formulário já explicam a folha
      aria-describedby={undefined}
      className={cn(
        // A folha nunca cobre a tela toda: sobra um respiro no topo, como no iOS
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-3rem)] flex-col rounded-t-2xl bg-fundo pb-seguro shadow-flutuante outline-none',
        'translate-y-(--arrasto) data-[state=closed]:animate-folha-sair data-[state=open]:animate-folha-entrar motion-reduce:animate-none',
        // Enquanto o dedo arrasta, a folha acompanha sem atraso; ao soltar, volta com transição
        !arrastando && 'transition-[translate] duration-300 ease-out',
        'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-0',
        'md:data-[state=closed]:animate-janela-sair md:data-[state=open]:animate-janela-entrar',
      )}
      style={estilo}
    >
      <div {...manipuladores} className="touch-none select-none md:touch-auto">
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1.5 w-9 rounded-full bg-separador md:hidden"
        />
        <div className="grid grid-cols-3 items-center px-4 py-1.5 md:pt-3">
          <Dialog.Close asChild>
            <button
              className="min-h-11 justify-self-start text-marca outline-none focus-visible:underline"
              type="button"
            >
              Cancelar
            </button>
          </Dialog.Close>
          <Dialog.Title className="truncate text-center font-semibold">{titulo}</Dialog.Title>
          <div className="justify-self-end">{acao}</div>
        </div>
      </div>
      <div className="overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
    </Dialog.Content>
  )
}
