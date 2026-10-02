from calendar import monthrange
from datetime import date
from decimal import ROUND_DOWN, Decimal

from django.db import transaction

from .models import Compra, Transacao
from .periodos import Mes

CENTAVO = Decimal('0.01')


def dia_no_mes(mes, dia):
    # Dia 31 num mês de 30 dias (ou 29 em fevereiro) vira o último dia do mês
    return date(mes.ano, mes.numero, min(dia, monthrange(mes.ano, mes.numero)[1]))


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


def dividir_valor(total, parcelas):
    """Divide em parcelas iguais; os centavos que sobram vão na primeira."""
    base = (total / parcelas).quantize(CENTAVO, rounding=ROUND_DOWN)
    resto = total - base * parcelas
    return [base + resto] + [base] * (parcelas - 1)


@transaction.atomic
def registrar_compra(*, usuario, cartao, categoria, valor_total, parcelas, data_compra, descricao=''):
    if not cartao.e_cartao:
        raise ValueError('Compras só podem ser lançadas em conta do tipo cartão.')

    compra = Compra.objects.create(
        usuario=usuario,
        cartao=cartao,
        categoria=categoria,
        descricao=descricao,
        valor_total=valor_total,
        parcelas=parcelas,
        data_compra=data_compra,
    )
    primeiro_fechamento = mes_de_fechamento(cartao, data_compra)
    Transacao.objects.bulk_create([
        Transacao(
            usuario=usuario,
            conta=cartao,
            categoria=categoria,
            tipo=Transacao.Tipo.DESPESA,
            descricao=descricao,
            valor=valor,
            # A data da parcela é o vencimento da sua fatura: é nesse mês que ela pesa
            data=vencimento(cartao, primeiro_fechamento.somar(indice)),
            compra=compra,
            numero_parcela=indice + 1,
        )
        for indice, valor in enumerate(dividir_valor(valor_total, parcelas))
    ])
    return compra
