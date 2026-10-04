/** A API respondeu com erro (400, 404, 409...); `dados` traz o corpo, com as mensagens do DRF. */
export class ErroDaApi extends Error {
  readonly status: number
  readonly dados: unknown

  constructor(status: number, dados: unknown) {
    super(`A API respondeu ${status}`)
    this.name = 'ErroDaApi'
    this.status = status
    this.dados = dados
  }
}

/** A sessão acabou (refresh vencido ou ausente): é preciso entrar de novo. */
export class ErroDeSessao extends Error {
  constructor() {
    super('Sua sessão expirou. Entre de novo.')
    this.name = 'ErroDeSessao'
  }
}
