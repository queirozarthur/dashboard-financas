import { tv } from 'tailwind-variants'

export const estiloBotao = tv({
  base: [
    'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold select-none',
    // Resposta ao toque do iOS: encolhe um pouco ao pressionar (e não anima se o sistema pede menos movimento)
    'transition-transform duration-150 active:scale-96 motion-reduce:transition-none motion-reduce:active:scale-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca',
    'disabled:opacity-40 disabled:active:scale-100',
  ],
  variants: {
    intencao: {
      principal: 'bg-marca text-sobre-marca',
      simples: 'bg-transparent text-marca',
      perigo: 'bg-transparent text-despesa',
    },
    largura: {
      conteudo: '',
      total: 'w-full',
    },
  },
  defaultVariants: { intencao: 'principal', largura: 'conteudo' },
})
