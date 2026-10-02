from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Case, DecimalField, F, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import Coalesce

DINHEIRO = DecimalField(max_digits=14, decimal_places=2)


def _soma_por_conta(campo_conta, valor_assinado):
    # Subquery em vez de Sum direto na Conta: somar duas relações reversas
    # (transacoes e transferencias_recebidas) no mesmo JOIN multiplicaria as linhas
    soma = (
        Transacao.objects.filter(**{campo_conta: OuterRef('pk')})
        .order_by()
        .values(campo_conta)
        .annotate(total=Sum(valor_assinado, output_field=DINHEIRO))
        .values('total')
    )
    return Coalesce(Subquery(soma, output_field=DINHEIRO), Value(Decimal('0')), output_field=DINHEIRO)


class ContaQuerySet(models.QuerySet):
    def com_saldo(self):
        saidas_e_entradas = Case(
            When(tipo='receita', then=F('valor')),
            default=-F('valor'),
            output_field=DINHEIRO,
        )
        return self.annotate(
            saldo=F('saldo_inicial')
            + _soma_por_conta('conta', saidas_e_entradas)
            + _soma_por_conta('conta_destino', F('valor'))
        )


class Conta(models.Model):
    class Tipo(models.TextChoices):
        CORRENTE = 'corrente', 'Corrente'
        DINHEIRO = 'dinheiro', 'Dinheiro'
        INVESTIMENTO = 'investimento', 'Investimento'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contas'
    )
    nome = models.CharField(max_length=60)
    tipo = models.CharField(max_length=12, choices=Tipo.choices)
    saldo_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    objects = ContaQuerySet.as_manager()

    class Meta:
        ordering = ['nome']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'nome'],
                name='conta_nome_unico_por_usuario',
                violation_error_message='Você já tem uma conta com esse nome.',
            ),
        ]

    def __str__(self):
        return self.nome


class Categoria(models.Model):
    class Natureza(models.TextChoices):
        RECEITA = 'receita', 'Receita'
        DESPESA = 'despesa', 'Despesa'

    class Tipo(models.TextChoices):
        FIXO = 'fixo', 'Fixo'
        VARIAVEL = 'variavel', 'Variável'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='categorias'
    )
    nome = models.CharField(max_length=60)
    natureza = models.CharField(max_length=7, choices=Natureza.choices)
    tipo = models.CharField(max_length=8, choices=Tipo.choices)

    class Meta:
        ordering = ['natureza', 'nome']
        constraints = [
            # A mesma palavra pode servir de receita e de despesa (ex.: "Outros")
            models.UniqueConstraint(
                fields=['usuario', 'nome', 'natureza'],
                name='categoria_nome_unico_por_usuario',
                violation_error_message='Você já tem uma categoria com esse nome e natureza.',
            ),
        ]

    def __str__(self):
        return f'{self.nome} ({self.get_natureza_display()})'


class Transacao(models.Model):
    class Tipo(models.TextChoices):
        RECEITA = 'receita', 'Receita'
        DESPESA = 'despesa', 'Despesa'
        TRANSFERENCIA = 'transferencia', 'Transferência'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transacoes'
    )
    # PROTECT: apagar uma conta ou categoria com transações apagaria histórico financeiro
    conta = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='transacoes')
    conta_destino = models.ForeignKey(
        Conta,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='transferencias_recebidas',
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='transacoes',
    )
    descricao = models.CharField(max_length=200, blank=True)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    data = models.DateField()
    tipo = models.CharField(max_length=13, choices=Tipo.choices)

    class Meta:
        ordering = ['-data', '-id']
        indexes = [models.Index(fields=['usuario', 'data'])]
        # Repetem no banco as regras que não dependem de outras tabelas, para que
        # admin e scripts também não consigam gravar dados inválidos
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gt=0),
                name='transacao_valor_positivo',
                violation_error_message='O valor precisa ser maior que zero.',
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        tipo__in=['receita', 'despesa'],
                        categoria__isnull=False,
                        conta_destino__isnull=True,
                    )
                    | Q(
                        tipo='transferencia',
                        categoria__isnull=True,
                        conta_destino__isnull=False,
                    )
                ),
                name='transacao_campos_por_tipo',
                violation_error_message=(
                    'Receita e despesa exigem categoria e não têm conta de destino; '
                    'transferência exige conta de destino e não tem categoria.'
                ),
            ),
            models.CheckConstraint(
                condition=~Q(conta_destino=F('conta')),
                name='transacao_destino_diferente',
                violation_error_message='A conta de destino precisa ser diferente da conta de origem.',
            ),
        ]

    def __str__(self):
        return f'{self.data} {self.get_tipo_display()} {self.valor}'
