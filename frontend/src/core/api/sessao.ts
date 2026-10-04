// O access (15 min) fica só na memória: some ao fechar a aba e não fica exposto no armazenamento.
// O refresh (7 dias) fica no localStorage para não pedir login toda vez que o app abre.
const CHAVE_REFRESH = 'financas.refresh'

export type Tokens = {
  access: string
  refresh: string
}

type AoEncerrar = () => void

let access: string | null = null
const ouvintes = new Set<AoEncerrar>()

// localStorage pode lançar erro (aba anônima, armazenamento bloqueado); sem ele, a sessão só não persiste
const lerRefresh = (): string | null => {
  try {
    return localStorage.getItem(CHAVE_REFRESH)
  } catch {
    return null
  }
}

const gravarRefresh = (refresh: string | null): void => {
  try {
    if (refresh === null) {
      localStorage.removeItem(CHAVE_REFRESH)
    } else {
      localStorage.setItem(CHAVE_REFRESH, refresh)
    }
  } catch {
    // Sem armazenamento disponível: a sessão vale só enquanto a aba estiver aberta
  }
}

export const obterAccess = (): string | null => {
  return access
}

export const obterRefresh = (): string | null => {
  return lerRefresh()
}

export const guardarTokens = (tokens: Tokens): void => {
  access = tokens.access
  gravarRefresh(tokens.refresh)
}

export const encerrarSessao = (): void => {
  access = null
  gravarRefresh(null)
  ouvintes.forEach((ouvinte) => {
    ouvinte()
  })
}

/** Avisa quando a sessão acaba (sair ou refresh vencido). Devolve a função que cancela o aviso. */
export const aoEncerrarSessao = (ouvinte: AoEncerrar): (() => void) => {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
