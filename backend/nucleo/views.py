import re

from django.db.models import ProtectedError, Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Categoria, Conta, Transacao
from .serializers import CategoriaSerializer, ContaSerializer, TransacaoSerializer


class DoUsuarioViewSet(viewsets.ModelViewSet):
    model = None

    def get_queryset(self):
        # Filtrar aqui faz o objeto de outro usuário simplesmente não existir: 404
        return self.model.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Não é possível apagar: existem transações ligadas a este registro.'},
                status=status.HTTP_409_CONFLICT,
            )


class ContaViewSet(DoUsuarioViewSet):
    model = Conta
    serializer_class = ContaSerializer

    def get_queryset(self):
        return super().get_queryset().com_saldo()

    # O objeto recém-salvo não tem a anotação de saldo; relê para a resposta incluir o campo
    def perform_create(self, serializer):
        super().perform_create(serializer)
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)


class CategoriaViewSet(DoUsuarioViewSet):
    model = Categoria
    serializer_class = CategoriaSerializer


class PaginacaoTransacoes(PageNumberPagination):
    page_size = 50


class TransacaoViewSet(DoUsuarioViewSet):
    model = Transacao
    serializer_class = TransacaoSerializer
    pagination_class = PaginacaoTransacoes

    def get_queryset(self):
        transacoes = super().get_queryset().select_related('conta', 'conta_destino', 'categoria')
        if self.action != 'list':
            return transacoes

        parametros = self.request.query_params
        if mes := parametros.get('mes'):
            ano, numero_mes = ler_mes(mes)
            transacoes = transacoes.filter(data__year=ano, data__month=numero_mes)
        if conta := parametros.get('conta'):
            conta = ler_id(conta, 'conta')
            # Extrato: o que saiu da conta e as transferências que chegaram nela
            transacoes = transacoes.filter(Q(conta=conta) | Q(conta_destino=conta))
        if categoria := parametros.get('categoria'):
            transacoes = transacoes.filter(categoria=ler_id(categoria, 'categoria'))
        return transacoes


def ler_mes(texto):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', texto):
        raise ValidationError({'mes': 'Use o formato AAAA-MM, por exemplo 2026-10.'})
    ano, mes = texto.split('-')
    return int(ano), int(mes)


def ler_id(texto, nome):
    if not texto.isdigit():
        raise ValidationError({nome: 'Informe o id numérico.'})
    return int(texto)
