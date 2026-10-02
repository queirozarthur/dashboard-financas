from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoriaViewSet, ContaViewSet, DashboardView, EvolucaoView, TransacaoViewSet

rotas = DefaultRouter()
rotas.register('contas', ContaViewSet, basename='conta')
rotas.register('categorias', CategoriaViewSet, basename='categoria')
rotas.register('transacoes', TransacaoViewSet, basename='transacao')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/evolucao/', EvolucaoView.as_view(), name='dashboard_evolucao'),
    *rotas.urls,
]
