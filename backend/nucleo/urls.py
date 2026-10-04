from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaViewSet,
    CompraViewSet,
    ContaViewSet,
    DashboardView,
    EvolucaoView,
    FaturaView,
    OrcamentoViewSet,
    PagamentoDaFaturaView,
    RecorrenciaViewSet,
    TransacaoViewSet,
)

rotas = DefaultRouter()
rotas.register('contas', ContaViewSet, basename='conta')
rotas.register('categorias', CategoriaViewSet, basename='categoria')
rotas.register('transacoes', TransacaoViewSet, basename='transacao')
rotas.register('compras', CompraViewSet, basename='compra')
rotas.register('recorrencias', RecorrenciaViewSet, basename='recorrencia')
rotas.register('orcamentos', OrcamentoViewSet, basename='orcamento')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/evolucao/', EvolucaoView.as_view(), name='dashboard_evolucao'),
    path('cartoes/<int:cartao_id>/faturas/<str:mes>/', FaturaView.as_view(), name='fatura'),
    path(
        'cartoes/<int:cartao_id>/faturas/<str:mes>/pagar/',
        PagamentoDaFaturaView.as_view(),
        name='fatura_pagar',
    ),
    *rotas.urls,
]
