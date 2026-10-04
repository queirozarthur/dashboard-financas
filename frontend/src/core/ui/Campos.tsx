import { ChevronsUpDown } from 'lucide-react'
import { useId, type ChangeEvent, type ComponentProps, type FC, type ReactNode } from 'react'

import { cn, digitosParaDecimal, formatarDinheiro } from '@/core/utils'

// Campos como linhas de um <Grupo>: rótulo à esquerda, controle à direita, separador recuado.
// text-corpo (17px): abaixo de 16px o Safari do iPhone dá zoom ao focar o campo.
const CLASSES_DO_CONTROLE =
  'min-w-0 flex-1 bg-transparent py-2.5 text-corpo outline-none placeholder:text-conteudo-secundario disabled:opacity-40'

type ComErro = {
  /** Mensagem mostrada embaixo da linha, em vermelho (ex.: erro que veio da API) */
  erro?: string
}

// Liga o controle à mensagem de erro: o leitor de tela lê a mensagem junto com o campo
const useErroDoCampo = (erro: string | undefined) => {
  const id = useId()
  return {
    idDoErro: id,
    atributos: erro ? { 'aria-invalid': true, 'aria-describedby': id } : {},
  }
}

type LinhaDeFormularioProps = ComErro & {
  rotulo: string
  idDoErro: string
  children: ReactNode
}

const LinhaDeFormulario: FC<LinhaDeFormularioProps> = ({ rotulo, erro, idDoErro, children }) => {
  return (
    <li className="group/linha">
      {/* O <label> envolve o controle: tocar no rótulo foca o campo */}
      <label className="flex items-center pl-4 focus-within:bg-marca-suave/40">
        <span className="flex min-h-11 min-w-0 flex-1 items-center gap-3 border-separador pr-4 group-not-first/linha:border-t">
          <span className={cn('w-28 shrink-0', erro && 'text-despesa')}>{rotulo}</span>
          {children}
        </span>
      </label>
      {erro ? (
        <p className="px-4 pb-2 text-nota text-despesa" id={idDoErro}>
          {erro}
        </p>
      ) : null}
    </li>
  )
}

type CampoProps = ComponentProps<'input'> &
  ComErro & {
    rotulo: string
  }

export const Campo: FC<CampoProps> = ({ rotulo, erro, className, ...campo }) => {
  const { idDoErro, atributos } = useErroDoCampo(erro)
  return (
    <LinhaDeFormulario erro={erro} idDoErro={idDoErro} rotulo={rotulo}>
      <input {...campo} {...atributos} className={cn(CLASSES_DO_CONTROLE, className)} />
    </LinhaDeFormulario>
  )
}

type CampoValorProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> &
  ComErro & {
    rotulo: string
    /** Texto decimal como a API usa ("12.34"), ou "" quando vazio */
    valor: string
    aoMudar: (valor: string) => void
  }

/** Valor em R$ digitado a partir dos centavos: 1, 2, 3, 4 → R$ 12,34. Nunca vira float. */
export const CampoValor: FC<CampoValorProps> = ({
  rotulo,
  valor,
  aoMudar,
  erro,
  className,
  ...campo
}) => {
  const { idDoErro, atributos } = useErroDoCampo(erro)
  const mudar = (evento: ChangeEvent<HTMLInputElement>) => {
    aoMudar(digitosParaDecimal(evento.target.value))
  }

  return (
    <LinhaDeFormulario erro={erro} idDoErro={idDoErro} rotulo={rotulo}>
      <input
        {...campo}
        {...atributos}
        autoComplete="off"
        className={cn(CLASSES_DO_CONTROLE, 'text-right tabular-nums', className)}
        // numeric: no celular abre só o teclado de números
        inputMode="numeric"
        onChange={mudar}
        placeholder={formatarDinheiro('0')}
        value={valor ? formatarDinheiro(valor) : ''}
      />
    </LinhaDeFormulario>
  )
}

type CampoDataProps = ComponentProps<'input'> &
  ComErro & {
    rotulo: string
  }

/** Campo de data nativo: no iPhone abre o calendário do próprio iOS. Valor no formato AAAA-MM-DD. */
export const CampoData: FC<CampoDataProps> = ({ rotulo, erro, className, ...campo }) => {
  const { idDoErro, atributos } = useErroDoCampo(erro)
  return (
    <LinhaDeFormulario erro={erro} idDoErro={idDoErro} rotulo={rotulo}>
      <input
        {...campo}
        {...atributos}
        className={cn(CLASSES_DO_CONTROLE, 'text-right tabular-nums', className)}
        type="date"
      />
    </LinhaDeFormulario>
  )
}

export type OpcaoDeSelecao = {
  valor: string
  rotulo: string
}

type CampoSelecaoProps = Omit<ComponentProps<'select'>, 'children'> &
  ComErro & {
    rotulo: string
    opcoes: readonly OpcaoDeSelecao[]
    /** Texto da opção vazia, mostrada enquanto nada foi escolhido */
    vazio?: string
  }

/** Seleção nativa: no iPhone abre a roda de seleção do iOS. */
export const CampoSelecao: FC<CampoSelecaoProps> = ({
  rotulo,
  opcoes,
  vazio = 'Escolher',
  erro,
  className,
  ...campo
}) => {
  const { idDoErro, atributos } = useErroDoCampo(erro)
  return (
    <LinhaDeFormulario erro={erro} idDoErro={idDoErro} rotulo={rotulo}>
      <span className="relative flex min-w-0 flex-1 items-center">
        <select
          {...campo}
          {...atributos}
          className={cn(
            CLASSES_DO_CONTROLE,
            'appearance-none truncate pr-6 text-right text-conteudo-secundario',
            className,
          )}
        >
          <option disabled value="">
            {vazio}
          </option>
          {opcoes.map((opcao) => {
            return (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            )
          })}
        </select>
        <ChevronsUpDown
          aria-hidden="true"
          className="pointer-events-none absolute right-0 size-4 text-conteudo-secundario"
        />
      </span>
    </LinhaDeFormulario>
  )
}
