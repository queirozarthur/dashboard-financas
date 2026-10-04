from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef, Q

from .models import Recorrencia, Transacao


class ErroDeRecorrencia(Exception):
    """Regra de recorrência violada; a mensagem vai direto para o usuário."""


class RecorrenciaJaConfirmada(ErroDeRecorrencia):
    pass


def esta_ativa(recorrencia, mes):
    inicio_do_mes = mes.primeiro_dia()
    return recorrencia.inicio <= inicio_do_mes and (
        recorrencia.fim is None or recorrencia.fim >= inicio_do_mes
    )


def ativas_no_mes(recorrencias, mes):
    inicio_do_mes = mes.primeiro_dia()
    return recorrencias.filter(inicio__lte=inicio_do_mes).filter(
        Q(fim__isnull=True) | Q(fim__gte=inicio_do_mes)
    )


def data_sugerida(recorrencia, mes):
    return mes.dia(recorrencia.dia)


def previstas(usuario, mes):
    """Recorrências do mês ainda sem transação confirmada: calculadas, nunca armazenadas."""
    confirmada = Transacao.objects.filter(recorrencia=OuterRef('pk'), competencia=mes.primeiro_dia())
    return (
        ativas_no_mes(Recorrencia.objects.filter(usuario=usuario), mes)
        .exclude(Exists(confirmada))
        .select_related('conta', 'conta_destino', 'categoria')
    )


@transaction.atomic
def confirmar(recorrencia, mes, *, valor=None, data=None, conta=None):
    """Cria a transação do mês; valor, data e conta sugeridos podem ser trocados."""
    if not esta_ativa(recorrencia, mes):
        raise ErroDeRecorrencia(f'Esta recorrência não vale em {mes}.')
    if recorrencia.confirmacoes.filter(competencia=mes.primeiro_dia()).exists():
        raise RecorrenciaJaConfirmada(f'Esta recorrência já foi confirmada em {mes}.')

    try:
        # atomic interno: se a constraint barrar (dois pedidos juntos), só este INSERT é desfeito
        with transaction.atomic():
            return Transacao.objects.create(
                usuario=recorrencia.usuario,
                tipo=recorrencia.tipo,
                descricao=recorrencia.descricao,
                valor=valor if valor is not None else recorrencia.valor,
                data=data or data_sugerida(recorrencia, mes),
                conta=conta or recorrencia.conta,
                conta_destino=recorrencia.conta_destino,
                categoria=recorrencia.categoria,
                recorrencia=recorrencia,
                competencia=mes.primeiro_dia(),
            )
    except IntegrityError:
        raise RecorrenciaJaConfirmada(f'Esta recorrência já foi confirmada em {mes}.') from None
