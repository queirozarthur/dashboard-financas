from django.utils import timezone
from rest_framework import serializers

from .cartao import ErroDeFatura, registrar_compra
from .models import Categoria, Compra, Conta, Recorrencia, Transacao
from .periodos import Mes
from .recorrencias import data_sugerida


class DoUsuarioMixin:
    @property
    def usuario(self):
        return self.context['request'].user


class ContaSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Conta
        fields = ['id', 'nome', 'tipo', 'saldo_inicial', 'dia_fechamento', 'dia_vencimento', 'saldo']
        extra_kwargs = {
            'dia_fechamento': {'min_value': 1, 'max_value': 31},
            'dia_vencimento': {'min_value': 1, 'max_value': 31},
        }

    def validate(self, dados):
        def atual(campo):
            return dados.get(campo, getattr(self.instance, campo, None))

        dias = {campo: atual(campo) for campo in ['dia_fechamento', 'dia_vencimento']}
        # Mesma regra da CheckConstraint; checar aqui devolve 400 com mensagem, não 500
        if atual('tipo') == Conta.Tipo.CARTAO:
            erros = {campo: 'Cartão exige este dia.' for campo, dia in dias.items() if dia is None}
        else:
            erros = {campo: 'Só cartão tem este dia.' for campo, dia in dias.items() if dia is not None}
        if erros:
            raise serializers.ValidationError(erros)
        return dados

    def validate_nome(self, nome):
        # A UniqueConstraint usa o usuario, que não vem do cliente; sem esta checagem
        # o banco recusaria com erro 500 em vez de uma mensagem
        repetidas = Conta.objects.filter(usuario=self.usuario, nome=nome)
        if self.instance:
            repetidas = repetidas.exclude(pk=self.instance.pk)
        if repetidas.exists():
            raise serializers.ValidationError('Você já tem uma conta com esse nome.')
        return nome


class CategoriaSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'natureza', 'tipo']

    def validate(self, dados):
        nome = dados.get('nome', getattr(self.instance, 'nome', None))
        natureza = dados.get('natureza', getattr(self.instance, 'natureza', None))

        repetidas = Categoria.objects.filter(usuario=self.usuario, nome=nome, natureza=natureza)
        if self.instance:
            repetidas = repetidas.exclude(pk=self.instance.pk)
        if repetidas.exists():
            raise serializers.ValidationError(
                {'nome': 'Você já tem uma categoria com esse nome e natureza.'}
            )

        # Trocar a natureza deixaria transações e recorrências com categoria incompatível
        if (
            self.instance
            and natureza != self.instance.natureza
            and (self.instance.transacoes.exists() or self.instance.recorrencias.exists())
        ):
            raise serializers.ValidationError(
                {'natureza': 'Não é possível mudar a natureza de uma categoria que já tem '
                             'transações ou recorrências.'}
            )
        return dados


class TransacaoSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)
    # allow_null: sem isso o DRF omite o campo quando a relação está vazia
    conta_destino_nome = serializers.CharField(
        source='conta_destino.nome', read_only=True, allow_null=True
    )
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, allow_null=True)

    class Meta:
        model = Transacao
        fields = [
            'id', 'tipo', 'valor', 'data', 'descricao',
            'conta', 'conta_nome',
            'conta_destino', 'conta_destino_nome',
            'categoria', 'categoria_nome',
            'compra', 'numero_parcela', 'fatura_paga', 'recorrencia', 'competencia',
        ]
        # Parcelas, pagamentos de fatura e confirmações têm rotas próprias;
        # aqui o cliente só enxerga o vínculo
        read_only_fields = ['compra', 'numero_parcela', 'fatura_paga', 'recorrencia', 'competencia']

    def get_fields(self):
        campos = super().get_fields()
        # Só aceita contas e categorias do próprio usuário; as de outro usuário
        # recebem o mesmo erro de um id inexistente, sem revelar que existem
        contas = Conta.objects.filter(usuario=self.usuario)
        campos['conta'].queryset = contas
        campos['conta_destino'].queryset = contas
        campos['categoria'].queryset = Categoria.objects.filter(usuario=self.usuario)
        return campos

    def validate_valor(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('O valor precisa ser maior que zero.')
        return valor

    def validate(self, dados):
        # Mudar uma parcela sozinha faria a soma das parcelas deixar de bater com a compra
        if self.instance and self.instance.compra_id:
            raise serializers.ValidationError(
                'Esta transação é parcela de uma compra no cartão. '
                'Para corrigir, apague a compra e lance de novo.'
            )
        if self.instance and self.instance.fatura_paga:
            raise serializers.ValidationError(
                'Esta transação é o pagamento de uma fatura. '
                'Para corrigir, cancele o pagamento na rota da fatura e pague de novo.'
            )

        validar_lancamento(dados, self.instance)
        return dados


def validar_lancamento(dados, instancia=None):
    """Regras de receita, despesa e transferência; valem para Transacao e Recorrencia."""

    # Num PATCH só chegam os campos alterados; o resto vem do objeto salvo
    def atual(campo):
        return dados.get(campo, getattr(instancia, campo, None))

    tipo = atual('tipo')
    conta = atual('conta')
    conta_destino = atual('conta_destino')
    categoria = atual('categoria')
    erros = {}

    if tipo == Transacao.Tipo.TRANSFERENCIA:
        if conta_destino is None:
            erros['conta_destino'] = 'Transferência exige conta de destino.'
        elif conta_destino == conta:
            erros['conta_destino'] = 'A conta de destino precisa ser diferente da conta de origem.'
        if categoria is not None:
            erros['categoria'] = 'Transferência não tem categoria.'
        # No cartão só entram compras e o pagamento da fatura, que tem rota própria
        if conta_destino is not None and conta_destino.e_cartao:
            erros['conta_destino'] = (
                'Para pagar o cartão, use a rota de pagamento da fatura: '
                '/api/cartoes/<id>/faturas/<AAAA-MM>/pagar/.'
            )
        if conta is not None and conta.e_cartao:
            erros['conta'] = 'Não é possível transferir saindo de um cartão de crédito.'
    else:
        if categoria is None:
            erros['categoria'] = 'Receita e despesa exigem categoria.'
        elif categoria.natureza != tipo:
            erros['categoria'] = (
                f'A categoria é de {categoria.get_natureza_display().lower()}, '
                f'mas o lançamento é de {Transacao.Tipo(tipo).label.lower()}.'
            )
        if conta_destino is not None:
            erros['conta_destino'] = 'Só transferência tem conta de destino.'
        # No cartão, a despesa precisa cair na fatura certa: isso só a compra calcula
        if conta is not None and conta.e_cartao:
            erros['conta'] = 'No cartão, lance a despesa como compra em /api/compras/.'

    if erros:
        raise serializers.ValidationError(erros)


class ParcelaSerializer(serializers.ModelSerializer):
    """Espera parcelas anotadas por cartao.com_data_de_pagamento."""

    numero = serializers.SerializerMethodField()
    vencimento = serializers.DateField(source='data')
    situacao = serializers.SerializerMethodField()
    data_pagamento = serializers.DateField()

    class Meta:
        model = Transacao
        fields = ['id', 'numero', 'valor', 'vencimento', 'situacao', 'data_pagamento']

    def get_numero(self, parcela):
        return f'{parcela.numero_parcela}/{parcela.compra.parcelas}'

    def get_situacao(self, parcela):
        return 'paga' if parcela.data_pagamento else 'pendente'


class ParcelaDaFaturaSerializer(ParcelaSerializer):
    # Dentro de uma fatura, situação e data de pagamento são da fatura, não de cada parcela
    situacao = None
    data_pagamento = None
    descricao = serializers.CharField(source='compra.descricao')
    categoria_nome = serializers.CharField(source='categoria.nome')
    data_compra = serializers.DateField(source='compra.data_compra')

    class Meta(ParcelaSerializer.Meta):
        fields = ['id', 'compra', 'descricao', 'categoria_nome', 'data_compra', 'numero', 'valor']


class PagamentoDaFaturaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    data = serializers.DateField()
    conta = serializers.IntegerField(source='conta_id')
    conta_nome = serializers.CharField(source='conta.nome')
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)


class FaturaSerializer(serializers.Serializer):
    cartao = serializers.IntegerField(source='cartao.id')
    cartao_nome = serializers.CharField(source='cartao.nome')
    mes = serializers.CharField()
    fechamento = serializers.DateField()
    vencimento = serializers.DateField()
    fechada = serializers.SerializerMethodField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    situacao = serializers.CharField()
    pagamento = PagamentoDaFaturaSerializer(allow_null=True)
    parcelas = ParcelaDaFaturaSerializer(many=True)

    def get_fechada(self, fatura):
        return timezone.localdate() >= fatura.fechamento


class PagarFaturaSerializer(DoUsuarioMixin, serializers.Serializer):
    conta = serializers.PrimaryKeyRelatedField(queryset=Conta.objects.none())
    data = serializers.DateField()

    def get_fields(self):
        campos = super().get_fields()
        campos['conta'].queryset = Conta.objects.filter(usuario=self.usuario)
        return campos


class CompraSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    # Limite contra um número absurdo de parcelas, que geraria milhares de transações
    MAXIMO_DE_PARCELAS = 48

    cartao_nome = serializers.CharField(source='cartao.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    parcelas_geradas = ParcelaSerializer(many=True, read_only=True)

    class Meta:
        model = Compra
        fields = [
            'id', 'descricao', 'valor_total', 'parcelas', 'data_compra',
            'cartao', 'cartao_nome',
            'categoria', 'categoria_nome',
            'parcelas_geradas',
        ]

    def get_fields(self):
        campos = super().get_fields()
        campos['cartao'].queryset = Conta.objects.filter(usuario=self.usuario)
        campos['categoria'].queryset = Categoria.objects.filter(usuario=self.usuario)
        return campos

    def validate_cartao(self, cartao):
        if not cartao.e_cartao:
            raise serializers.ValidationError('Compras só podem ser lançadas em conta do tipo cartão.')
        return cartao

    def validate_categoria(self, categoria):
        if categoria.natureza != Categoria.Natureza.DESPESA:
            raise serializers.ValidationError('A compra precisa de uma categoria de despesa.')
        return categoria

    def validate_valor_total(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('O valor precisa ser maior que zero.')
        return valor

    def validate_parcelas(self, parcelas):
        if not 1 <= parcelas <= self.MAXIMO_DE_PARCELAS:
            raise serializers.ValidationError(f'Informe de 1 a {self.MAXIMO_DE_PARCELAS} parcelas.')
        return parcelas

    def create(self, dados):
        # As parcelas nascem junto com a compra, numa transação só do banco
        try:
            return registrar_compra(**dados)
        except ErroDeFatura as erro:
            # Lista, como nos outros erros: fora do validate() o DRF não normaliza o formato
            raise serializers.ValidationError({'data_compra': [str(erro)]}) from None


class CampoMes(serializers.Field):
    """Mês como 'AAAA-MM' na API; no banco, o primeiro dia do mês."""

    default_error_messages = {'invalido': 'Use o formato AAAA-MM, por exemplo 2026-10.'}

    def to_representation(self, valor):
        return str(Mes.de(valor))

    def to_internal_value(self, texto):
        try:
            return Mes.ler(str(texto)).primeiro_dia()
        except ValueError:
            self.fail('invalido')


class RecorrenciaSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)
    conta_destino_nome = serializers.CharField(
        source='conta_destino.nome', read_only=True, allow_null=True
    )
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, allow_null=True)
    inicio = CampoMes()
    fim = CampoMes(required=False, allow_null=True)

    class Meta:
        model = Recorrencia
        fields = [
            'id', 'descricao', 'tipo', 'valor', 'dia', 'inicio', 'fim',
            'conta', 'conta_nome',
            'conta_destino', 'conta_destino_nome',
            'categoria', 'categoria_nome',
        ]
        extra_kwargs = {'dia': {'min_value': 1, 'max_value': 31}}

    def get_fields(self):
        campos = super().get_fields()
        contas = Conta.objects.filter(usuario=self.usuario)
        campos['conta'].queryset = contas
        campos['conta_destino'].queryset = contas
        campos['categoria'].queryset = Categoria.objects.filter(usuario=self.usuario)
        return campos

    def validate_valor(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('O valor precisa ser maior que zero.')
        return valor

    def validate(self, dados):
        validar_lancamento(dados, self.instance)
        inicio = dados.get('inicio', getattr(self.instance, 'inicio', None))
        fim = dados.get('fim', getattr(self.instance, 'fim', None))
        if fim is not None and fim < inicio:
            raise serializers.ValidationError({'fim': 'O fim não pode ser antes do início.'})
        return dados


class PrevistaSerializer(serializers.ModelSerializer):
    """Espera `mes` no contexto, para sugerir a data."""

    recorrencia = serializers.IntegerField(source='id')
    data = serializers.SerializerMethodField()
    conta_nome = serializers.CharField(source='conta.nome')
    conta_destino_nome = serializers.CharField(source='conta_destino.nome', allow_null=True)
    categoria_nome = serializers.CharField(source='categoria.nome', allow_null=True)

    class Meta:
        model = Recorrencia
        fields = [
            'recorrencia', 'descricao', 'tipo', 'valor', 'data',
            'conta', 'conta_nome',
            'conta_destino', 'conta_destino_nome',
            'categoria', 'categoria_nome',
        ]

    def get_data(self, recorrencia):
        # Texto 'AAAA-MM-DD', como os DateField; o método devolveria um objeto date
        return data_sugerida(recorrencia, self.context['mes']).isoformat()


class ConfirmarSerializer(DoUsuarioMixin, serializers.Serializer):
    """Espera `recorrencia` no contexto; valor, data e conta substituem os sugeridos."""

    mes = serializers.CharField()
    valor = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    data = serializers.DateField(required=False)
    conta = serializers.PrimaryKeyRelatedField(queryset=Conta.objects.none(), required=False)

    def get_fields(self):
        campos = super().get_fields()
        campos['conta'].queryset = Conta.objects.filter(usuario=self.usuario)
        return campos

    def validate_mes(self, texto):
        try:
            return Mes.ler(texto)
        except ValueError:
            raise serializers.ValidationError('Use o formato AAAA-MM, por exemplo 2026-10.') from None

    def validate_valor(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('O valor precisa ser maior que zero.')
        return valor

    def validate(self, dados):
        # Trocar a conta não pode quebrar as regras (cartão, destino igual à origem)
        if 'conta' in dados:
            validar_lancamento({'conta': dados['conta']}, self.context['recorrencia'])
        return dados
