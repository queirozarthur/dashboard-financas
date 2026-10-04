from dataclasses import dataclass
from datetime import date
from decimal import ROUND_DOWN, Decimal

from django.db import IntegrityError, transaction
from django.db.models import OuterRef, Subquery, Sum

from .models import Compra, Conta, Transacao
from .periodos import Mes

CENTAVO = Decimal('0.01')


class ErroDeFatura(Exception):
    """Regra de cartão violada; a mensagem vai direto para o usuário."""


class FaturaJaPaga(ErroDeFatura):
    pass


def dia_no_mes(mes, dia):
    return mes.dia(dia)


def mes_de_fechamento(cartao, data_compra):
    """Mês em que fecha a fatura onde a compra entra."""
    mes = Mes.de(data_compra)
    # No dia do fechamento a fatura já fechou: a compra vai para a próxima
    if data_compra >= dia_no_mes(mes, cartao.dia_fechamento):
        return mes.somar(1)
    return mes


def vencimento(cartao, mes_fechamento):
    """Data de vencimento da fatura que fecha em `mes_fechamento`."""
    if cartao.dia_vencimento > cartao.dia_fechamento:
        return dia_no_mes(mes_fechamento, cartao.dia_vencimento)
    return dia_no_mes(mes_fechamento.somar(1), cartao.dia_vencimento)


def fechamento_da_fatura(cartao, mes_vencimento):
    """Data de fechamento da fatura que vence em `mes_vencimento` (o inverso de `vencimento`)."""
    if cartao.dia_vencimento > cartao.dia_fechamento:
        return dia_no_mes(mes_vencimento, cartao.dia_fechamento)
    return dia_no_mes(mes_vencimento.anterior(), cartao.dia_fechamento)


def vencimentos_das_parcelas(cartao, data_compra, parcelas):
    primeiro_fechamento = mes_de_fechamento(cartao, data_compra)
    return [vencimento(cartao, primeiro_fechamento.somar(indice)) for indice in range(parcelas)]


def dividir_valor(total, parcelas):
    """Divide em parcelas iguais; os centavos que sobram vão na primeira."""
    base = (total / parcelas).quantize(CENTAVO, rounding=ROUND_DOWN)
    resto = total - base * parcelas
    return [base + resto] + [base] * (parcelas - 1)


def pagamentos_do_cartao(cartao):
    return Transacao.objects.filter(conta_destino=cartao, fatura_paga__isnull=False)


def com_data_de_pagamento(parcelas):
    """Anota `data_pagamento` em cada parcela, numa subquery só (sem N+1)."""
    pagamento = Transacao.objects.filter(
        conta_destino=OuterRef('conta'), fatura_paga=OuterRef('data')
    ).values('data')[:1]
    return parcelas.annotate(data_pagamento=Subquery(pagamento))


@transaction.atomic
def registrar_compra(*, usuario, cartao, categoria, valor_total, parcelas, data_compra, descricao=''):
    if not cartao.e_cartao:
        raise ValueError('Compras só podem ser lançadas em conta do tipo cartão.')

    vencimentos = vencimentos_das_parcelas(cartao, data_compra, parcelas)
    # Uma parcela nova numa fatura já paga deixaria o pagamento menor que a fatura
    pagas = set(pagamentos_do_cartao(cartao).filter(fatura_paga__in=vencimentos)
                .values_list('fatura_paga', flat=True))
    for numero, data_vencimento in enumerate(vencimentos, start=1):
        if data_vencimento in pagas:
            raise ErroDeFatura(
                f'A parcela {numero} cairia na fatura que vence em {data_vencimento:%d/%m/%Y}, '
                'que já foi paga.'
            )

    compra = Compra.objects.create(
        usuario=usuario,
        cartao=cartao,
        categoria=categoria,
        descricao=descricao,
        valor_total=valor_total,
        parcelas=parcelas,
        data_compra=data_compra,
    )
    Transacao.objects.bulk_create([
        Transacao(
            usuario=usuario,
            conta=cartao,
            categoria=categoria,
            tipo=Transacao.Tipo.DESPESA,
            descricao=descricao,
            valor=valor,
            # A data da parcela é o vencimento da sua fatura: é nesse mês que ela pesa
            data=data_vencimento,
            compra=compra,
            numero_parcela=numero,
        )
        for numero, (valor, data_vencimento)
        in enumerate(zip(dividir_valor(valor_total, parcelas), vencimentos), start=1)
    ])
    return compra


def compra_tem_parcela_paga(compra):
    return pagamentos_do_cartao(compra.cartao).filter(
        fatura_paga__in=compra.parcelas_geradas.values('data')
    ).exists()


@dataclass
class Fatura:
    cartao: Conta
    mes: Mes
    fechamento: date
    vencimento: date
    total: Decimal
    parcelas: list
    pagamento: Transacao | None

    @property
    def situacao(self):
        return 'paga' if self.pagamento else 'pendente'


def montar_fatura(cartao, mes):
    """Fatura que vence em `mes`: calculada a partir das parcelas, nunca armazenada."""
    parcelas = Transacao.objects.filter(
        conta=cartao,
        compra__isnull=False,
        data__gte=mes.primeiro_dia(),
        data__lt=mes.fim_exclusivo(),
    )
    total = parcelas.aggregate(total=Sum('valor'))['total'] or Decimal('0.00')
    pagamento = (
        pagamentos_do_cartao(cartao)
        .filter(fatura_paga__gte=mes.primeiro_dia(), fatura_paga__lt=mes.fim_exclusivo())
        .select_related('conta')
        .first()
    )
    return Fatura(
        cartao=cartao,
        mes=mes,
        fechamento=fechamento_da_fatura(cartao, mes),
        vencimento=dia_no_mes(mes, cartao.dia_vencimento),
        total=total,
        parcelas=list(
            com_data_de_pagamento(parcelas)
            .select_related('compra', 'categoria')
            .order_by('compra__data_compra', 'id')
        ),
        pagamento=pagamento,
    )


@transaction.atomic
def pagar_fatura(cartao, mes, *, conta, data):
    if conta.e_cartao:
        raise ErroDeFatura('Pague a fatura com uma conta que não seja cartão.')

    fatura = montar_fatura(cartao, mes)
    if fatura.pagamento:
        raise FaturaJaPaga('Esta fatura já foi paga.')
    if not fatura.parcelas:
        raise ErroDeFatura('Não há parcelas nesta fatura.')
    if data < fatura.fechamento:
        raise ErroDeFatura(f'A fatura só fecha em {fatura.fechamento:%d/%m/%Y}; pague a partir dessa data.')

    try:
        # atomic interno: se a constraint barrar, só este INSERT é desfeito
        with transaction.atomic():
            Transacao.objects.create(
                usuario=cartao.usuario,
                tipo=Transacao.Tipo.TRANSFERENCIA,
                conta=conta,
                conta_destino=cartao,
                # Só pagamento total: o valor vem da fatura, nunca do cliente
                valor=fatura.total,
                data=data,
                descricao=f'Pagamento da fatura {mes} de {cartao.nome}',
                fatura_paga=fatura.vencimento,
            )
    except IntegrityError:
        raise FaturaJaPaga('Esta fatura já foi paga.') from None
    return montar_fatura(cartao, mes)


@transaction.atomic
def cancelar_pagamento(cartao, mes):
    fatura = montar_fatura(cartao, mes)
    if not fatura.pagamento:
        raise ErroDeFatura('Esta fatura não está paga.')
    fatura.pagamento.delete()
    return montar_fatura(cartao, mes)
