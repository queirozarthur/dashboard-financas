import 'react'

// Permite variáveis CSS em `style` (ex.: { '--arrasto': '12px' }) sem forçar o tipo com `as`.
// A extensão de tipo de uma biblioteca só existe com `interface` (declaration merging).
declare module 'react' {
  interface CSSProperties {
    [variavel: `--${string}`]: string | number
  }
}
