from django.db import models


class Cor(models.TextChoices):
    """As 8 cores da paleta validada da skill dataviz, NESTA ordem (a ordem é o que garante
    que cores vizinhas se distinguem, inclusive para daltônicos). O hex fica no frontend."""

    AZUL = 'azul', 'Azul'
    LARANJA = 'laranja', 'Laranja'
    TURQUESA = 'turquesa', 'Turquesa'
    AMARELO = 'amarelo', 'Amarelo'
    ROSA = 'rosa', 'Rosa'
    VERDE = 'verde', 'Verde'
    VIOLETA = 'violeta', 'Violeta'
    VERMELHO = 'vermelho', 'Vermelho'


class Icone(models.TextChoices):
    """Ícones que dá para escolher; o frontend liga cada nome a um desenho."""

    CASA = 'casa', 'Casa'
    CARRINHO = 'carrinho', 'Carrinho'
    REFEICAO = 'refeicao', 'Refeição'
    CARRO = 'carro', 'Carro'
    ONIBUS = 'onibus', 'Ônibus'
    SAUDE = 'saude', 'Saúde'
    ACADEMIA = 'academia', 'Academia'
    EDUCACAO = 'educacao', 'Educação'
    LAZER = 'lazer', 'Lazer'
    VIAGEM = 'viagem', 'Viagem'
    ROUPA = 'roupa', 'Roupa'
    PRESENTE = 'presente', 'Presente'
    PET = 'pet', 'Pet'
    CELULAR = 'celular', 'Celular'
    INTERNET = 'internet', 'Internet'
    ENERGIA = 'energia', 'Energia'
    AGUA = 'agua', 'Água'
    TRABALHO = 'trabalho', 'Trabalho'
    DINHEIRO = 'dinheiro', 'Dinheiro'
    COFRINHO = 'cofrinho', 'Cofrinho'
    INVESTIMENTO = 'investimento', 'Investimento'
    BANCO = 'banco', 'Banco'
    CARTEIRA = 'carteira', 'Carteira'
    CARTAO = 'cartao', 'Cartão'
    RECIBO = 'recibo', 'Recibo'
    ETIQUETA = 'etiqueta', 'Etiqueta'


ICONE_DA_CONTA = {
    'corrente': Icone.BANCO,
    'dinheiro': Icone.CARTEIRA,
    'investimento': Icone.INVESTIMENTO,
    'cartao': Icone.CARTAO,
}


def proxima_cor(quantidade_existente):
    """Cada cadastro novo pega a próxima cor da paleta, em ordem, voltando ao início depois da 8ª."""
    return Cor.values[quantidade_existente % len(Cor.values)]
