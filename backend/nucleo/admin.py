from django.contrib import admin

from .models import Categoria, Compra, Conta, Transacao


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'saldo_inicial', 'dia_fechamento', 'dia_vencimento', 'usuario']
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
    list_display = [
        'data', 'tipo', 'valor', 'descricao', 'conta', 'conta_destino', 'categoria',
        'numero_parcela', 'usuario',
    ]
    list_filter = ['tipo', 'data', 'conta', 'categoria', 'usuario']
    list_select_related = ['conta', 'conta_destino', 'categoria', 'usuario']
    search_fields = ['descricao']
    date_hierarchy = 'data'


class ParcelaInline(admin.TabularInline):
    model = Transacao
    fields = ['numero_parcela', 'data', 'valor']
    readonly_fields = fields
    extra = 0
    can_delete = False


# Só leitura: criar uma compra pelo admin não geraria as parcelas
@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ['data_compra', 'descricao', 'valor_total', 'parcelas', 'cartao', 'categoria', 'usuario']
    list_filter = ['cartao', 'usuario']
    list_select_related = ['cartao', 'categoria', 'usuario']
    search_fields = ['descricao']
    inlines = [ParcelaInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
