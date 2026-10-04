import random
import secrets
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from nucleo import cartao as regras_do_cartao
from nucleo.aparencia import Cor, Icone
from nucleo.models import Categoria, Compra, Conta, Orcamento, Recorrencia, Transacao
from nucleo.periodos import Mes
from nucleo.recorrencias import confirmar

MESES_DE_HISTORICO = 6

# (nome, dias possíveis, faixa em centavos, quantos por mês)
GASTOS_VARIAVEIS = [
    ('Mercado', (2, 28), (4000, 26000), 5),
    ('Transporte', (1, 28), (1500, 6000), 6),
    ('Lazer', (5, 28), (3000, 18000), 2),
    ('Saúde', (3, 25), (5000, 25000), 1),
]


class Command(BaseCommand):
    help = (
        'Cria (ou recria) um usuário com 6 meses de dados de exemplo para ver as telas '
        'funcionando. Só mexe nos dados desse usuário.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--usuario', default='exemplo')
        parser.add_argument(
            '--senha',
            help='Senha do usuário de exemplo; sem ela, uma senha aleatória é gerada e mostrada.',
        )

    @transaction.atomic
    def handle(self, *args, usuario, senha, **opcoes):
        Usuario = get_user_model()
        dono, criado = Usuario.objects.get_or_create(username=usuario)
        if not criado:
            apagar_dados(dono)
        # A senha nunca fica no código: vem do argumento ou é gerada agora
        senha = senha or secrets.token_urlsafe(9)
        dono.set_password(senha)
        dono.save()

        hoje = timezone.localdate()
        Populador(dono, hoje).popular()

        self.stdout.write(self.style.SUCCESS('Dados de exemplo criados.'))
        self.stdout.write(f'  Usuário: {usuario}')
        self.stdout.write(f'  Senha:   {senha}')


def apagar_dados(dono):
    # Ordem importa: contas e categorias são PROTECT enquanto houver lançamentos
    Transacao.objects.filter(usuario=dono).delete()
    Compra.objects.filter(usuario=dono).delete()
    Recorrencia.objects.filter(usuario=dono).delete()
    Orcamento.objects.filter(usuario=dono).delete()
    Conta.objects.filter(usuario=dono).delete()
    Categoria.objects.filter(usuario=dono).delete()


class Populador:
    def __init__(self, dono, hoje):
        self.dono = dono
        self.hoje = hoje
        self.mes_atual = Mes.de(hoje)
        self.meses = [self.mes_atual.somar(-n) for n in reversed(range(MESES_DE_HISTORICO))]
        # Semente fixa: rodar de novo gera os mesmos valores
        self.sorteio = random.Random(42)

    def popular(self):
        self.criar_contas_e_categorias()
        self.criar_recorrencias()
        self.criar_gastos_variaveis()
        self.criar_compras_no_cartao()
        self.pagar_faturas_vencidas()
        self.criar_orcamentos()

    def nova_conta(self, nome, tipo, saldo='0', **dias):
        return Conta.objects.create(
            usuario=self.dono, nome=nome, tipo=tipo, saldo_inicial=Decimal(saldo), **dias
        )

    def nova_recorrencia(self, descricao, tipo, valor, dia, **campos):
        return Recorrencia.objects.create(
            usuario=self.dono, descricao=descricao, tipo=tipo, valor=Decimal(valor), dia=dia,
            inicio=self.meses[0].primeiro_dia(), **campos,
        )

    def comprar_no_cartao(self, descricao, categoria, valor, parcelas, data):
        return regras_do_cartao.registrar_compra(
            usuario=self.dono, cartao=self.nubank, categoria=self.categorias[categoria],
            descricao=descricao, valor_total=Decimal(valor), parcelas=parcelas, data_compra=data,
        )

    def criar_contas_e_categorias(self):
        self.corrente = self.nova_conta('Corrente', Conta.Tipo.CORRENTE, '2500.00', cor=Cor.AZUL)
        self.carteira = self.nova_conta('Carteira', Conta.Tipo.DINHEIRO, '150.00', cor=Cor.VERDE)
        self.investimentos = self.nova_conta(
            'Investimentos', Conta.Tipo.INVESTIMENTO, '10000.00', cor=Cor.VIOLETA
        )
        self.nubank = self.nova_conta(
            'Nubank', Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5, cor=Cor.ROSA
        )

        self.categorias = {}
        despesa, receita = Categoria.Natureza.DESPESA, Categoria.Natureza.RECEITA
        fixo, variavel = Categoria.Tipo.FIXO, Categoria.Tipo.VARIAVEL
        for nome, natureza, tipo, icone, cor in [
            ('Moradia', despesa, fixo, Icone.CASA, Cor.AZUL),
            ('Assinaturas', despesa, fixo, Icone.INTERNET, Cor.VIOLETA),
            ('Mercado', despesa, variavel, Icone.CARRINHO, Cor.LARANJA),
            ('Transporte', despesa, variavel, Icone.ONIBUS, Cor.AMARELO),
            ('Lazer', despesa, variavel, Icone.LAZER, Cor.ROSA),
            ('Saúde', despesa, variavel, Icone.SAUDE, Cor.VERMELHO),
            ('Salário', receita, fixo, Icone.TRABALHO, Cor.VERDE),
            ('Extras', receita, variavel, Icone.DINHEIRO, Cor.TURQUESA),
        ]:
            self.categorias[nome] = Categoria.objects.create(
                usuario=self.dono, nome=nome, natureza=natureza, tipo=tipo, icone=icone, cor=cor
            )

    def criar_recorrencias(self):
        salario = self.nova_recorrencia(
            'Salário', 'receita', '6200.00', 5,
            conta=self.corrente, categoria=self.categorias['Salário'],
        )
        aluguel = self.nova_recorrencia(
            'Aluguel', 'despesa', '1800.00', 10,
            conta=self.corrente, categoria=self.categorias['Moradia'],
        )
        internet = self.nova_recorrencia(
            'Internet', 'despesa', '119.90', 15,
            conta=self.corrente, categoria=self.categorias['Assinaturas'],
        )
        aporte = self.nova_recorrencia(
            'Aporte mensal', 'transferencia', '500.00', 6,
            conta=self.corrente, conta_destino=self.investimentos,
        )

        # Meses passados: tudo confirmado. Mês atual: só o salário, o resto fica previsto
        for mes in self.meses[:-1]:
            for recorrencia in [salario, aluguel, internet, aporte]:
                confirmar(recorrencia, mes)
        confirmar(salario, self.mes_atual, data=min(self.hoje, self.mes_atual.dia(5)))

    def criar_gastos_variaveis(self):
        for mes in self.meses:
            ultimo_dia = self.hoje.day if mes == self.mes_atual else mes.ultimo_dia().day
            for nome, (dia_minimo, dia_maximo), (minimo, maximo), quantidade in GASTOS_VARIAVEIS:
                for _ in range(quantidade):
                    dia = self.sorteio.randint(dia_minimo, dia_maximo)
                    if dia > ultimo_dia:
                        continue
                    centavos = self.sorteio.randint(minimo, maximo)
                    Transacao.objects.create(
                        usuario=self.dono,
                        conta=self.carteira if nome == 'Transporte' else self.corrente,
                        categoria=self.categorias[nome],
                        tipo=Transacao.Tipo.DESPESA,
                        descricao=nome,
                        valor=Decimal(centavos) / 100,
                        data=mes.dia(dia),
                    )
        # Um extra no meio do período, para a evolução não ficar plana
        Transacao.objects.create(
            usuario=self.dono, conta=self.corrente, categoria=self.categorias['Extras'],
            tipo=Transacao.Tipo.RECEITA, descricao='Freela', valor=Decimal('750.00'),
            data=self.meses[2].dia(20),
        )

    def criar_compras_no_cartao(self):
        self.comprar_no_cartao('Celular', 'Lazer', '2400.00', 12, self.meses[1].dia(12))
        self.comprar_no_cartao('Tênis', 'Lazer', '389.90', 3, self.meses[3].dia(8))
        for mes in self.meses:
            data = mes.dia(18)
            if data <= self.hoje:
                self.comprar_no_cartao('Streaming', 'Assinaturas', '55.90', 1, data)

    def pagar_faturas_vencidas(self):
        # Paga cada fatura que já venceu, dois dias antes do vencimento
        for mes in self.meses + [self.mes_atual.somar(1)]:
            vencimento = regras_do_cartao.dia_no_mes(mes, self.nubank.dia_vencimento)
            pagamento = vencimento - timedelta(days=2)
            fatura = regras_do_cartao.montar_fatura(self.nubank, mes)
            if fatura.parcelas and vencimento <= self.hoje and pagamento >= fatura.fechamento:
                regras_do_cartao.pagar_fatura(self.nubank, mes, conta=self.corrente, data=pagamento)

    def criar_orcamentos(self):
        inicio = self.meses[0].primeiro_dia()
        for nome, limite in [('Mercado', '900.00'), ('Lazer', '450.00'), ('Transporte', '300.00')]:
            Orcamento.objects.create(
                usuario=self.dono, categoria=self.categorias[nome], valor=Decimal(limite), inicio=inicio
            )
