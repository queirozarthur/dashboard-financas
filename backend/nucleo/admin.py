from django.contrib import admin

from .models import Categoria, Conta, Transacao


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'saldo_inicial', 'usuario']
    list_filter = ['tipo', 'usuario']
    list_select_related = ['usuario']
    search_fields = ['nome']


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'natureza', 'tipo', 'usuario']
    list_filter = ['natureza', 'tipo', 'usuario']
    list_select_related = ['usuario']
    search_fields = ['nome']


@admin.register(Transacao)
class TransacaoAdmin(admin.ModelAdmin):
    list_display = ['data', 'tipo', 'valor', 'descricao', 'conta', 'conta_destino', 'categoria', 'usuario']
    list_filter = ['tipo', 'data', 'conta', 'categoria', 'usuario']
    list_select_related = ['conta', 'conta_destino', 'categoria', 'usuario']
    search_fields = ['descricao']
    date_hierarchy = 'data'
