import type { Categoria, Conta } from '@/core/api'

type Essencial<T, Chaves extends keyof T> = Pick<T, Chaves> & Partial<T>

/** Conta completa e válida para os testes; só o essencial precisa ser informado. */
export const contaDeTeste = ({
  id,
  nome,
  tipo,
  ...resto
}: Essencial<Conta, 'id' | 'nome' | 'tipo'>): Conta => {
  const cartao = tipo === 'cartao'
  return {
    id,
    nome,
    tipo,
    saldo_inicial: '0.00',
    dia_fechamento: cartao ? 25 : null,
    dia_vencimento: cartao ? 5 : null,
    cor: 'azul',
    icone: cartao ? 'cartao' : 'banco',
    saldo: '0.00',
    ...resto,
  }
}

/** Categoria completa e válida para os testes. */
export const categoriaDeTeste = ({
  id,
  nome,
  natureza,
  ...resto
}: Essencial<Categoria, 'id' | 'nome' | 'natureza'>): Categoria => {
  return { id, nome, natureza, tipo: 'variavel', cor: 'laranja', icone: 'etiqueta', ...resto }
}
