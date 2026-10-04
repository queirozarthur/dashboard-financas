import { createTV } from 'tailwind-variants'

/**
 * Ensina ao tailwind-merge os tokens criados no index.css. Sem isso ele não sabe que
 * `text-legenda` é tamanho de texto, acha que é cor e o descarta ao ver `text-marca`.
 * Todo token novo de tamanho (--text-*) ou sombra (--shadow-*) precisa entrar aqui.
 */
export const CONFIG_DO_MERGE = {
  extend: {
    classGroups: {
      'font-size': [{ text: ['titulo-grande', 'corpo', 'subtitulo', 'nota', 'legenda'] }],
      shadow: [{ shadow: ['linha', 'flutuante'] }],
    },
  },
}

// tv() com a mesma configuração do cn(): variantes dos componentes também resolvem certo
export const tv = createTV({ twMergeConfig: CONFIG_DO_MERGE })
