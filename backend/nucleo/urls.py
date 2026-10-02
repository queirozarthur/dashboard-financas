from rest_framework.routers import DefaultRouter

from .views import CategoriaViewSet, ContaViewSet, TransacaoViewSet

rotas = DefaultRouter()
rotas.register('contas', ContaViewSet, basename='conta')
rotas.register('categorias', CategoriaViewSet, basename='categoria')
rotas.register('transacoes', TransacaoViewSet, basename='transacao')

urlpatterns = rotas.urls
