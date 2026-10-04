import { LogOut } from 'lucide-react'
import { useState, type FC } from 'react'

import {
  Botao,
  Campo,
  CampoData,
  CampoSelecao,
  CampoValor,
  ControleSegmentado,
  Folha,
  Grupo,
  Linha,
  SeletorDeMes,
  Tela,
} from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisórias: cada uma é trocada pela tela de verdade no seu passo
// (T5 lançamentos, T6 contas, T7 cartão, T8 recorrências).

export const TelaLancamentos: FC = () => {
  return (
    <Tela titulo="Lançamentos">
      <SeletorDeMes />
      <p className="mt-6 px-4 text-conteudo-secundario">A lista do mês chega no T5.</p>
    </Tela>
  )
}

type TipoDeExemplo = 'receita' | 'despesa' | 'transferencia'

const TIPOS_DE_EXEMPLO = [
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'transferencia', rotulo: 'Transferência' },
] as const

const CONTAS_DE_EXEMPLO = [
  { valor: '1', rotulo: 'Corrente' },
  { valor: '2', rotulo: 'Carteira' },
]

// Estado local só porque é uma demonstração; o formulário do T5 terá o seu hook
export const TelaNovo: FC = () => {
  const [aberta, setAberta] = useState(false)
  const [tipo, setTipo] = useState<TipoDeExemplo>('despesa')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('2026-10-04')
  const [conta, setConta] = useState('')

  return (
    <Tela titulo="Novo">
      <p className="px-4 text-conteudo-secundario">
        Demonstração dos componentes do formulário. Nada é salvo: o lançamento de verdade chega no
        T5.
      </p>
      <Botao
        className="mt-6"
        largura="total"
        onClick={() => {
          setAberta(true)
        }}
      >
        Abrir folha de exemplo
      </Botao>

      <Folha
        acao={
          <button
            className="min-h-11 font-semibold text-marca outline-none disabled:opacity-40"
            disabled={!valor}
            onClick={() => {
              setAberta(false)
            }}
            type="button"
          >
            Salvar
          </button>
        }
        aberta={aberta}
        aoMudarAberta={setAberta}
        titulo="Novo lançamento"
      >
        <ControleSegmentado
          aoMudar={setTipo}
          nome="tipo-exemplo"
          opcoes={TIPOS_DE_EXEMPLO}
          rotulo="Tipo de lançamento"
          valor={tipo}
        />
        <Grupo>
          <CampoValor aoMudar={setValor} rotulo="Valor" valor={valor} />
          <Campo placeholder="Opcional" rotulo="Descrição" />
        </Grupo>
        <Grupo>
          <CampoData
            onChange={(evento) => {
              setData(evento.target.value)
            }}
            rotulo="Data"
            value={data}
          />
          <CampoSelecao
            onChange={(evento) => {
              setConta(evento.target.value)
            }}
            opcoes={CONTAS_DE_EXEMPLO}
            rotulo="Conta"
            value={conta}
          />
        </Grupo>
      </Folha>
    </Tela>
  )
}

export const TelaCartoes: FC = () => {
  return (
    <Tela titulo="Cartões">
      <p className="px-4 text-conteudo-secundario">Faturas e compras chegam no T7.</p>
    </Tela>
  )
}

export const TelaMais: FC = () => {
  const { sair } = useSessao()
  return (
    <Tela titulo="Mais">
      <Grupo titulo="Cadastros">
        <Linha para="/contas" rotulo="Contas" />
        <Linha para="/categorias" rotulo="Categorias" />
        <Linha para="/recorrencias" rotulo="Recorrências" />
        <Linha para="/orcamentos" rotulo="Orçamentos" />
      </Grupo>
      <Grupo>
        <Linha
          aoTocar={sair}
          icone={<LogOut aria-hidden="true" className="size-5 text-despesa" />}
          rotulo="Sair"
          tom="perigo"
        />
      </Grupo>
    </Tela>
  )
}
