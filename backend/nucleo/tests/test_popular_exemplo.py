from datetime import date
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from nucleo.models import Conta, Recorrencia, Transacao

Usuario = get_user_model()

HOJE = date(2026, 10, 20)


def popular(*argumentos):
    saida = StringIO()
    # Data fixa: o comando monta os meses a partir de hoje
    with mock.patch('django.utils.timezone.localdate', return_value=HOJE):
        call_command('popular_exemplo', *argumentos, stdout=saida)
    return saida.getvalue()


class TestesPopularExemplo(TestCase):
    def test_cria_o_usuario_e_mostra_a_senha_gerada(self):
        saida = popular()
        usuario = Usuario.objects.get(username='exemplo')
        senha = saida.split('Senha:')[1].strip()
        self.assertTrue(usuario.check_password(senha))

    def test_aceita_usuario_e_senha_escolhidos(self):
        popular('--usuario', 'demo', '--senha', 'segredo-123')
        self.assertTrue(Usuario.objects.get(username='demo').check_password('segredo-123'))

    def test_cria_contas_lancamentos_cartao_e_orcamentos(self):
        popular()
        dono = Usuario.objects.get(username='exemplo')
        self.assertEqual(Conta.objects.filter(usuario=dono).count(), 4)
        self.assertTrue(Transacao.objects.filter(usuario=dono, compra__isnull=False).exists())
        self.assertTrue(Transacao.objects.filter(usuario=dono, fatura_paga__isnull=False).exists())
        self.assertEqual(dono.orcamentos.count(), 3)

    def test_no_mes_atual_sobra_previsto_para_confirmar(self):
        popular()
        dono = Usuario.objects.get(username='exemplo')
        aluguel = Recorrencia.objects.get(usuario=dono, descricao='Aluguel')
        self.assertFalse(aluguel.confirmacoes.filter(competencia=date(2026, 10, 1)).exists())
        self.assertTrue(aluguel.confirmacoes.filter(competencia=date(2026, 9, 1)).exists())

    def test_nada_fica_no_futuro_alem_das_parcelas(self):
        popular()
        futuras = Transacao.objects.filter(data__gt=HOJE, compra__isnull=True)
        self.assertFalse(futuras.exists())

    def test_rodar_de_novo_recria_sem_duplicar(self):
        popular()
        total = Transacao.objects.count()
        popular()
        self.assertEqual(Transacao.objects.count(), total)

    def test_nao_mexe_nos_dados_de_outro_usuario(self):
        outro = Usuario.objects.create_user('queir', password='x')
        Conta.objects.create(usuario=outro, nome='Minha conta', tipo=Conta.Tipo.CORRENTE)
        popular()
        popular()
        self.assertEqual(Conta.objects.filter(usuario=outro).count(), 1)

    def test_a_dashboard_responde_com_os_dados(self):
        popular()
        cliente = APIClient()
        cliente.force_authenticate(Usuario.objects.get(username='exemplo'))
        dados = cliente.get('/api/dashboard/?mes=2026-09').data
        self.assertNotEqual(dados['despesas'], '0.00')
        self.assertEqual(len(dados['orcamentos']['categorias']), 3)

    def test_funciona_em_qualquer_dia_do_ano(self):
        # Começo de mês, virada de ano e fevereiro bissexto são os casos delicados de data
        for hoje in [date(2026, 10, 1), date(2026, 10, 4), date(2027, 1, 2), date(2028, 2, 29)]:
            with self.subTest(hoje=hoje), mock.patch(
                'django.utils.timezone.localdate', return_value=hoje
            ):
                call_command('popular_exemplo', stdout=StringIO())
                self.assertFalse(Transacao.objects.filter(data__gt=hoje, compra__isnull=True).exists())
