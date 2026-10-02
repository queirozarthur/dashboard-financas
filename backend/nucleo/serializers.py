from rest_framework import serializers

from .models import Categoria, Conta, Transacao


class DoUsuarioMixin:
    @property
    def usuario(self):
        return self.context['request'].user


class ContaSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Conta
        fields = ['id', 'nome', 'tipo', 'saldo_inicial', 'saldo']

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

        # Trocar a natureza deixaria as transações antigas com categoria incompatível
        if (
            self.instance
            and natureza != self.instance.natureza
            and self.instance.transacoes.exists()
        ):
            raise serializers.ValidationError(
                {'natureza': 'Não é possível mudar a natureza de uma categoria que já tem transações.'}
            )
        return dados


class TransacaoSerializer(DoUsuarioMixin, serializers.ModelSerializer):
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)
    conta_destino_nome = serializers.CharField(source='conta_destino.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Transacao
        fields = [
            'id', 'tipo', 'valor', 'data', 'descricao',
            'conta', 'conta_nome',
            'conta_destino', 'conta_destino_nome',
            'categoria', 'categoria_nome',
        ]

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
        # Num PATCH só chegam os campos alterados; o resto vem do objeto salvo
        def atual(campo):
            return dados.get(campo, getattr(self.instance, campo, None))

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
        else:
            if categoria is None:
                erros['categoria'] = 'Receita e despesa exigem categoria.'
            elif categoria.natureza != tipo:
                erros['categoria'] = (
                    f'A categoria é de {categoria.get_natureza_display().lower()}, '
                    f'mas a transação é de {Transacao.Tipo(tipo).label.lower()}.'
                )
            if conta_destino is not None:
                erros['conta_destino'] = 'Só transferência tem conta de destino.'

        if erros:
            raise serializers.ValidationError(erros)
        return dados
