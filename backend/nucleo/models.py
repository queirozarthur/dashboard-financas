from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Case, DecimalField, F, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import Coalesce

DINHEIRO = DecimalField(max_digits=14, decimal_places=2)

# Vale para Transacao e Recorrencia, que têm os mesmos campos de lançamento
CAMPOS_POR_TIPO = Q(
    tipo__in=['receita', 'despesa'],
    categoria__isnull=False,
    conta_destino__isnull=True,
) | Q(
    tipo='transferencia',
    categoria__isnull=True,
    conta_destino__isnull=False,
)
MENSAGEM_CAMPOS_POR_TIPO = (
    'Receita e despesa exigem categoria e não têm conta de destino; '
    'transferência exige conta de destino e não tem categoria.'
)


def _soma_por_conta(campo_conta, valor_assinado, ate):
    # Subquery em vez de Sum direto na Conta: somar duas relações reversas
    # (transacoes e transferencias_recebidas) no mesmo JOIN multiplicaria as linhas
    transacoes = Transacao.objects.filter(**{campo_conta: OuterRef('pk')})
    if ate is not None:
        transacoes = transacoes.filter(data__lte=ate)
    soma = (
        transacoes.order_by()
        .values(campo_conta)
        .annotate(total=Sum(valor_assinado, output_field=DINHEIRO))
        .values('total')
    )
    return Coalesce(Subquery(soma, output_field=DINHEIRO), Value(Decimal('0')), output_field=DINHEIRO)


class ContaQuerySet(models.QuerySet):
    def com_saldo(self, ate=None):
        """Anota `saldo`; com `ate`, considera só as transações até essa data (inclusive)."""
        saidas_e_entradas = Case(
            When(tipo='receita', then=F('valor')),
            default=-F('valor'),
            output_field=DINHEIRO,
        )
        return self.annotate(
            saldo=F('saldo_inicial')
            + _soma_por_conta('conta', saidas_e_entradas, ate)
            + _soma_por_conta('conta_destino', F('valor'), ate)
        )


class Conta(models.Model):
    class Tipo(models.TextChoices):
        CORRENTE = 'corrente', 'Corrente'
        DINHEIRO = 'dinheiro', 'Dinheiro'
        INVESTIMENTO = 'investimento', 'Investimento'
        CARTAO = 'cartao', 'Cartão de crédito'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contas'
    )
    nome = models.CharField(max_length=60)
    tipo = models.CharField(max_length=12, choices=Tipo.choices)
    saldo_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Só para cartão; em mês mais curto, dia 31 vira o último dia do mês
    dia_fechamento = models.PositiveSmallIntegerField(null=True, blank=True)
    dia_vencimento = models.PositiveSmallIntegerField(null=True, blank=True)

    objects = ContaQuerySet.as_manager()

    class Meta:
        ordering = ['nome']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'nome'],
                name='conta_nome_unico_por_usuario',
                violation_error_message='Você já tem uma conta com esse nome.',
            ),
            models.CheckConstraint(
                condition=(
                    # isnull=False explícito: no CHECK, NULL >= 1 não é falso, é "desconhecido",
                    # e o PostgreSQL aceita a linha
                    Q(
                        tipo='cartao',
                        dia_fechamento__isnull=False,
                        dia_vencimento__isnull=False,
                        dia_fechamento__gte=1,
                        dia_fechamento__lte=31,
                        dia_vencimento__gte=1,
                        dia_vencimento__lte=31,
                    )
                    | (
                        ~Q(tipo='cartao')
                        & Q(dia_fechamento__isnull=True, dia_vencimento__isnull=True)
                    )
                ),
                name='conta_dias_so_no_cartao',
                violation_error_message=(
                    'Cartão exige dia de fechamento e de vencimento entre 1 e 31; '
                    'as outras contas não têm esses dias.'
                ),
            ),
        ]

    @property
    def e_cartao(self):
        return self.tipo == self.Tipo.CARTAO

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
    # Preenchidos só nas parcelas de uma compra no cartão; apagar a compra apaga as parcelas
    compra = models.ForeignKey(
        'Compra', on_delete=models.CASCADE, null=True, blank=True, related_name='parcelas_geradas'
    )
    numero_parcela = models.PositiveSmallIntegerField(null=True, blank=True)
    # Preenchido só na transferência que paga uma fatura: a data de vencimento dessa fatura
    fatura_paga = models.DateField(null=True, blank=True)
    # SET_NULL: apagar a recorrência mantém o histórico do que já aconteceu
    recorrencia = models.ForeignKey(
        'Recorrencia', on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmacoes'
    )
    # Primeiro dia do mês a que a transação se refere: o aluguel de outubro pago em
    # 2 de novembro continua sendo de outubro
    competencia = models.DateField(null=True, blank=True)

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
                condition=CAMPOS_POR_TIPO,
                name='transacao_campos_por_tipo',
                violation_error_message=MENSAGEM_CAMPOS_POR_TIPO,
            ),
            models.CheckConstraint(
                condition=~Q(conta_destino=F('conta')),
                name='transacao_destino_diferente',
                violation_error_message='A conta de destino precisa ser diferente da conta de origem.',
            ),
            models.CheckConstraint(
                condition=Q(recorrencia__isnull=True) | Q(competencia__isnull=False),
                name='transacao_recorrencia_com_competencia',
                violation_error_message='Transação de recorrência exige o mês de competência.',
            ),
            # Uma confirmação por mês, mesmo com dois pedidos chegando juntos
            models.UniqueConstraint(
                fields=['recorrencia', 'competencia'],
                condition=Q(recorrencia__isnull=False),
                name='transacao_recorrencia_uma_vez_por_mes',
                violation_error_message='Esta recorrência já foi confirmada neste mês.',
            ),
            models.CheckConstraint(
                condition=(
                    Q(compra__isnull=True, numero_parcela__isnull=True)
                    | Q(
                        compra__isnull=False,
                        numero_parcela__isnull=False,
                        numero_parcela__gte=1,
                        tipo='despesa',
                    )
                ),
                name='transacao_parcela_completa',
                violation_error_message='Parcela exige compra e número, e é sempre despesa.',
            ),
            models.UniqueConstraint(
                fields=['compra', 'numero_parcela'],
                name='transacao_parcela_unica',
            ),
            models.CheckConstraint(
                condition=Q(fatura_paga__isnull=True) | Q(tipo='transferencia'),
                name='transacao_pagamento_e_transferencia',
                violation_error_message='Pagamento de fatura é sempre uma transferência.',
            ),
            # Garante no banco o "uma vez só", mesmo com dois pedidos chegando juntos
            models.UniqueConstraint(
                fields=['conta_destino', 'fatura_paga'],
                condition=Q(fatura_paga__isnull=False),
                name='transacao_fatura_paga_uma_vez',
                violation_error_message='Esta fatura já foi paga.',
            ),
        ]

    def __str__(self):
        return f'{self.data} {self.get_tipo_display()} {self.valor}'


class Compra(models.Model):
    """Compra no cartão; as parcelas são Transacoes geradas por nucleo.cartao.registrar_compra."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='compras'
    )
    cartao = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='compras')
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='compras')
    descricao = models.CharField(max_length=200, blank=True)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2)
    parcelas = models.PositiveSmallIntegerField(default=1)
    data_compra = models.DateField()

    class Meta:
        ordering = ['-data_compra', '-id']
        constraints = [
            models.CheckConstraint(
                condition=Q(valor_total__gt=0),
                name='compra_valor_positivo',
                violation_error_message='O valor precisa ser maior que zero.',
            ),
            models.CheckConstraint(
                condition=Q(parcelas__gte=1),
                name='compra_ao_menos_uma_parcela',
                violation_error_message='A compra precisa ter pelo menos uma parcela.',
            ),
        ]

    def __str__(self):
        return f'{self.data_compra} {self.descricao} {self.valor_total} em {self.parcelas}x'


class Recorrencia(models.Model):
    """Lançamento mensal previsto; vira Transacao só quando confirmado (nucleo.recorrencias)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recorrencias'
    )
    descricao = models.CharField(max_length=200)
    tipo = models.CharField(max_length=13, choices=Transacao.Tipo.choices)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    conta = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='recorrencias')
    conta_destino = models.ForeignKey(
        Conta,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='recorrencias_recebidas',
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='recorrencias',
    )
    # Em mês mais curto, dia 31 vira o último dia do mês
    dia = models.PositiveSmallIntegerField()
    # Primeiro dia do mês de início e do último mês (inclusive); sem fim, não acaba
    inicio = models.DateField()
    fim = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['dia', 'descricao']
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gt=0),
                name='recorrencia_valor_positivo',
                violation_error_message='O valor precisa ser maior que zero.',
            ),
            models.CheckConstraint(
                condition=CAMPOS_POR_TIPO,
                name='recorrencia_campos_por_tipo',
                violation_error_message=MENSAGEM_CAMPOS_POR_TIPO,
            ),
            models.CheckConstraint(
                condition=~Q(conta_destino=F('conta')),
                name='recorrencia_destino_diferente',
                violation_error_message='A conta de destino precisa ser diferente da conta de origem.',
            ),
            models.CheckConstraint(
                condition=Q(dia__gte=1, dia__lte=31),
                name='recorrencia_dia_valido',
                violation_error_message='O dia precisa estar entre 1 e 31.',
            ),
            models.CheckConstraint(
                condition=Q(inicio__day=1) & (Q(fim__isnull=True) | Q(fim__day=1, fim__gte=F('inicio'))),
                name='recorrencia_periodo_valido',
                violation_error_message='Início e fim são meses, e o fim não pode ser antes do início.',
            ),
        ]

    def __str__(self):
        return f'{self.descricao} (dia {self.dia})'


class Orcamento(models.Model):
    """Limite mensal de gasto de uma categoria, válido de `inicio` até a próxima vigência."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orcamentos'
    )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='orcamentos')
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    # Primeiro dia do mês a partir do qual o limite vale
    inicio = models.DateField()

    class Meta:
        ordering = ['categoria__nome', '-inicio']
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gt=0),
                name='orcamento_valor_positivo',
                violation_error_message='O limite precisa ser maior que zero.',
            ),
            models.CheckConstraint(
                condition=Q(inicio__day=1),
                name='orcamento_inicio_e_um_mes',
                violation_error_message='O início é um mês (primeiro dia).',
            ),
            models.UniqueConstraint(
                fields=['categoria', 'inicio'],
                name='orcamento_uma_vigencia_por_mes',
                violation_error_message='Esta categoria já tem um limite começando neste mês.',
            ),
        ]

    def __str__(self):
        return f'{self.categoria.nome}: {self.valor} desde {self.inicio:%m/%Y}'
