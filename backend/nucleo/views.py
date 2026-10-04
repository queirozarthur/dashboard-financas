from django.db.models import Prefetch, ProtectedError, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from . import dashboard, recorrencias
from .cartao import (
    ErroDeFatura,
    FaturaJaPaga,
    cancelar_pagamento,
    com_data_de_pagamento,
    compra_tem_parcela_paga,
    montar_fatura,
    pagar_fatura,
)
from .models import Categoria, Compra, Conta, Orcamento, Recorrencia, Transacao
from .orcamentos import vigentes
from .periodos import Mes
from .serializers import (
    CategoriaSerializer,
    CompraSerializer,
    ConfirmarSerializer,
    ContaSerializer,
    FaturaSerializer,
    OrcamentoSerializer,
    PagarFaturaSerializer,
    PrevistaSerializer,
    RecorrenciaSerializer,
    TransacaoSerializer,
)


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
            return conflito(
                'Não é possível apagar: existem lançamentos ligados a este registro '
                '(transações, compras, recorrências ou orçamentos).'
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

    def destroy(self, request, *args, **kwargs):
        transacao = self.get_object()
        if transacao.compra_id:
            return conflito(
                'Esta transação é parcela de uma compra no cartão. '
                f'Apague a compra inteira em /api/compras/{transacao.compra_id}/.'
            )
        if transacao.fatura_paga:
            mes = Mes.de(transacao.fatura_paga)
            return conflito(
                'Esta transação é o pagamento de uma fatura. Cancele em '
                f'/api/cartoes/{transacao.conta_destino_id}/faturas/{mes}/pagar/.'
            )
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        transacoes = super().get_queryset().select_related('conta', 'conta_destino', 'categoria')
        if self.action != 'list':
            return transacoes

        parametros = self.request.query_params
        if mes := parametros.get('mes'):
            mes = ler_mes(mes)
            transacoes = transacoes.filter(data__gte=mes.primeiro_dia(), data__lt=mes.fim_exclusivo())
        if conta := parametros.get('conta'):
            conta = ler_id(conta, 'conta')
            # Extrato: o que saiu da conta e as transferências que chegaram nela
            transacoes = transacoes.filter(Q(conta=conta) | Q(conta_destino=conta))
        if categoria := parametros.get('categoria'):
            transacoes = transacoes.filter(categoria=ler_id(categoria, 'categoria'))
        return transacoes


class CompraViewSet(DoUsuarioViewSet):
    model = Compra
    serializer_class = CompraSerializer
    pagination_class = PaginacaoTransacoes
    # Sem edição: para corrigir uma compra, apaga e lança de novo
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        parcelas = com_data_de_pagamento(Transacao.objects.order_by('numero_parcela'))
        return (
            super().get_queryset()
            .select_related('cartao', 'categoria')
            .prefetch_related(Prefetch('parcelas_geradas', queryset=parcelas))
        )

    # Relê a compra para a resposta trazer as parcelas com a mesma consulta da listagem
    def perform_create(self, serializer):
        super().perform_create(serializer)
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def destroy(self, request, *args, **kwargs):
        if compra_tem_parcela_paga(self.get_object()):
            return conflito('Esta compra tem parcela em fatura já paga e não pode ser apagada.')
        return super().destroy(request, *args, **kwargs)


class RecorrenciaViewSet(DoUsuarioViewSet):
    model = Recorrencia
    serializer_class = RecorrenciaSerializer

    def get_queryset(self):
        return super().get_queryset().select_related('conta', 'conta_destino', 'categoria')

    @action(detail=False)
    def previstas(self, request):
        mes = ler_mes_ou_atual(request.query_params.get('mes'))
        lista = recorrencias.previstas(request.user, mes)
        return Response(PrevistaSerializer(lista, many=True, context={'mes': mes}).data)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        recorrencia = self.get_object()
        pedido = ConfirmarSerializer(
            data=request.data, context={'request': request, 'recorrencia': recorrencia}
        )
        pedido.is_valid(raise_exception=True)
        try:
            transacao = recorrencias.confirmar(recorrencia, **pedido.validated_data)
        except recorrencias.RecorrenciaJaConfirmada as erro:
            return conflito(str(erro))
        except recorrencias.ErroDeRecorrencia as erro:
            raise ValidationError({'mes': [str(erro)]}) from None
        dados = TransacaoSerializer(transacao, context={'request': request}).data
        return Response(dados, status=status.HTTP_201_CREATED)


class OrcamentoViewSet(DoUsuarioViewSet):
    model = Orcamento
    serializer_class = OrcamentoSerializer

    def get_queryset(self):
        if self.action == 'list' and (mes := self.request.query_params.get('mes')):
            return vigentes(self.request.user, ler_mes(mes))
        return super().get_queryset().select_related('categoria')


class FaturaView(APIView):
    def get(self, request, cartao_id, mes):
        cartao = obter_cartao(request, cartao_id)
        return Response(FaturaSerializer(montar_fatura(cartao, ler_mes(mes))).data)


class PagamentoDaFaturaView(APIView):
    def post(self, request, cartao_id, mes):
        cartao = obter_cartao(request, cartao_id)
        pedido = PagarFaturaSerializer(data=request.data, context={'request': request})
        pedido.is_valid(raise_exception=True)
        try:
            fatura = pagar_fatura(cartao, ler_mes(mes), **pedido.validated_data)
        except FaturaJaPaga as erro:
            return conflito(str(erro))
        except ErroDeFatura as erro:
            raise ValidationError({'detail': str(erro)}) from None
        return Response(FaturaSerializer(fatura).data, status=status.HTTP_201_CREATED)

    def delete(self, request, cartao_id, mes):
        cartao = obter_cartao(request, cartao_id)
        try:
            fatura = cancelar_pagamento(cartao, ler_mes(mes))
        except ErroDeFatura as erro:
            raise ValidationError({'detail': str(erro)}) from None
        return Response(FaturaSerializer(fatura).data)


def obter_cartao(request, cartao_id):
    # Cartão de outro usuário, ou conta que não é cartão, simplesmente não existe aqui
    return get_object_or_404(Conta, pk=cartao_id, usuario=request.user, tipo=Conta.Tipo.CARTAO)


def conflito(mensagem):
    return Response({'detail': mensagem}, status=status.HTTP_409_CONFLICT)


class DashboardView(APIView):
    def get(self, request):
        mes = ler_mes_ou_atual(request.query_params.get('mes'))
        return Response(dashboard.resumo_do_mes(request.user, mes))


class EvolucaoView(APIView):
    MAXIMO_DE_MESES = 24

    def get(self, request):
        ultimo_mes = ler_mes_ou_atual(request.query_params.get('mes'))
        quantidade = request.query_params.get('meses', '6')
        if not quantidade.isdigit() or not 1 <= int(quantidade) <= self.MAXIMO_DE_MESES:
            raise ValidationError({'meses': f'Informe um número de 1 a {self.MAXIMO_DE_MESES}.'})
        return Response(dashboard.evolucao(request.user, ultimo_mes, int(quantidade)))


def ler_mes(texto):
    try:
        return Mes.ler(texto)
    except ValueError:
        raise ValidationError({'mes': 'Use o formato AAAA-MM, por exemplo 2026-10.'}) from None


def ler_mes_ou_atual(texto):
    # localdate usa o TIME_ZONE do settings, não o UTC do servidor
    return ler_mes(texto) if texto else Mes.de(timezone.localdate())


def ler_id(texto, nome):
    if not texto.isdigit():
        raise ValidationError({nome: 'Informe o id numérico.'})
    return int(texto)
