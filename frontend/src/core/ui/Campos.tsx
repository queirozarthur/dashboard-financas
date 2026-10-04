import { ChevronsUpDown } from 'lucide-react'
import {
  useId,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FC,
  type ReactNode,
} from 'react'

import { cn, digitosParaDecimal, formatarDinheiro } from '@/core/utils'

// Campos como linhas de um <Grupo>: rótulo à esquerda, controle à direita, separador recuado.
// text-corpo (17px): abaixo de 16px o Safari do iPhone dá zoom ao focar o campo.
const CLASSES_DO_CONTROLE =
  'min-w-0 flex-1 bg-transparent py-2.5 text-corpo outline-none placeholder:text-conteudo-secundario disabled:opacity-40'

type ComErro = {
  /** Mensagem mostrada embaixo da linha, em vermelho (ex.: erro que veio da API) */
  erro?: string
}

/**
 * Liga rótulo, campo e mensagem de erro por id: tocar no rótulo foca o campo, e o leitor
 * de tela lê a mensagem de erro junto com ele.
 */
const useLigacoesDoCampo = (erro: string | undefined, idInformado: string | undefined) => {
  const idGerado = useId()
  const idDoErro = useId()
  const idDoCampo = idInformado ?? idGerado
  return {
    idDoCampo,
    idDoErro,
    atributos: {
      id: idDoCampo,
      ...(erro ? { 'aria-invalid': true, 'aria-describedby': idDoErro } : {}),
    },
  }
}

type LinhaDeFormularioProps = ComErro & {
  rotulo: string
  idDoCampo: string
  idDoErro: string
  children: ReactNode
}

const LinhaDeFormulario: FC<LinhaDeFormularioProps> = ({
  rotulo,
  erro,
  idDoCampo,
  idDoErro,
  children,
}) => {
  return (
    <li className="group/linha">
      <div className="flex items-center pl-4 focus-within:bg-marca-suave/40">
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 border-separador pr-4 group-not-first/linha:border-t">
          {/* O <label> envolve só o texto e aponta para o campo pelo id: assim nada mais
              na linha (como o botão ±) é confundido com o campo que ele nomeia */}
          <label className={cn('w-28 shrink-0', erro && 'text-despesa')} htmlFor={idDoCampo}>
            {rotulo}
          </label>
          {children}
        </div>
      </div>
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

export const Campo: FC<CampoProps> = ({ rotulo, erro, className, id, ...campo }) => {
  const { idDoCampo, idDoErro, atributos } = useLigacoesDoCampo(erro, id)
  return (
    <LinhaDeFormulario erro={erro} idDoCampo={idDoCampo} idDoErro={idDoErro} rotulo={rotulo}>
      <input {...campo} {...atributos} className={cn(CLASSES_DO_CONTROLE, className)} />
    </LinhaDeFormulario>
  )
}

type CampoValorProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> &
  ComErro & {
    rotulo: string
    /** Texto decimal como a API usa ("12.34" ou "-12.34"), ou "" quando vazio */
    valor: string
    aoMudar: (valor: string) => void
    /** Mostra o botão ±: o teclado numérico do iPhone não tem a tecla de menos */
    permiteNegativo?: boolean
  }

/** Valor em R$ digitado a partir dos centavos: 1, 2, 3, 4 → R$ 12,34. Nunca vira float. */
export const CampoValor: FC<CampoValorProps> = ({
  rotulo,
  valor,
  aoMudar,
  permiteNegativo = false,
  erro,
  className,
  id,
  ...campo
}) => {
  const { idDoCampo, idDoErro, atributos } = useLigacoesDoCampo(erro, id)
  // Sem dígitos ainda não há valor para levar o sinal: ele fica guardado aqui até a digitação
  const [sinalSemValor, setSinalSemValor] = useState(false)
  const negativo = valor ? valor.startsWith('-') : sinalSemValor

  const mudar = (evento: ChangeEvent<HTMLInputElement>) => {
    const decimal = digitosParaDecimal(evento.target.value)
    aoMudar(decimal && negativo ? `-${decimal}` : decimal)
  }

  const inverterSinal = () => {
    if (!valor) {
      setSinalSemValor(!sinalSemValor)
      return
    }
    aoMudar(negativo ? valor.slice(1) : `-${valor}`)
  }

  return (
    <LinhaDeFormulario erro={erro} idDoCampo={idDoCampo} idDoErro={idDoErro} rotulo={rotulo}>
      {permiteNegativo ? (
        <button
          aria-label="Valor negativo"
          aria-pressed={negativo}
          className={cn(
            'flex h-7 min-w-9 shrink-0 items-center justify-center rounded-md text-subtitulo font-semibold outline-none focus-visible:outline-2 focus-visible:outline-marca',
            negativo ? 'bg-despesa text-sobre-alerta' : 'bg-fundo text-conteudo-secundario',
          )}
          onClick={inverterSinal}
          type="button"
        >
          ±
        </button>
      ) : null}
      <input
        {...campo}
        {...atributos}
        autoComplete="off"
        className={cn(CLASSES_DO_CONTROLE, 'text-right tabular-nums', className)}
        // numeric: no celular abre só o teclado de números
        inputMode="numeric"
        onChange={mudar}
        placeholder={formatarDinheiro(negativo ? '-0' : '0')}
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
export const CampoData: FC<CampoDataProps> = ({ rotulo, erro, className, id, ...campo }) => {
  const { idDoCampo, idDoErro, atributos } = useLigacoesDoCampo(erro, id)
  return (
    <LinhaDeFormulario erro={erro} idDoCampo={idDoCampo} idDoErro={idDoErro} rotulo={rotulo}>
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
  id,
  ...campo
}) => {
  const { idDoCampo, idDoErro, atributos } = useLigacoesDoCampo(erro, id)
  return (
    <LinhaDeFormulario erro={erro} idDoCampo={idDoCampo} idDoErro={idDoErro} rotulo={rotulo}>
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
