from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

Usuario = get_user_model()


class TestesLoginJWT(APITestCase):
    def setUp(self):
        Usuario.objects.create_user('ana', password='senha-teste')

    def login(self, senha='senha-teste'):
        return self.client.post(reverse('token'), {'username': 'ana', 'password': senha})

    def renovar(self, refresh):
        return self.client.post(reverse('token_refresh'), {'refresh': refresh})

    def test_login_com_senha_certa_devolve_os_dois_tokens(self):
        resposta = self.login()
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIn('access', resposta.data)
        self.assertIn('refresh', resposta.data)

    def test_login_com_senha_errada_e_recusado(self):
        resposta = self.login(senha='errada')
        self.assertEqual(resposta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duracao_dos_tokens(self):
        tokens = self.login().data
        access = AccessToken(tokens['access'])
        refresh = RefreshToken(tokens['refresh'])
        self.assertEqual(access['exp'] - access['iat'], timedelta(minutes=15).total_seconds())
        self.assertEqual(refresh['exp'] - refresh['iat'], timedelta(days=7).total_seconds())

    def test_refresh_devolve_access_e_refresh_novos(self):
        refresh_antigo = self.login().data['refresh']
        resposta = self.renovar(refresh_antigo)
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIn('access', resposta.data)
        self.assertNotEqual(resposta.data['refresh'], refresh_antigo)

    def test_refresh_ja_usado_nao_vale_mais(self):
        refresh_antigo = self.login().data['refresh']
        self.renovar(refresh_antigo)
        resposta = self.renovar(refresh_antigo)
        self.assertEqual(resposta.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173'])
class TestesCORS(APITestCase):
    def test_origem_permitida_recebe_cabecalho_cors(self):
        resposta = self.client.options(reverse('token'), HTTP_ORIGIN='http://localhost:5173')
        self.assertEqual(resposta['Access-Control-Allow-Origin'], 'http://localhost:5173')

    def test_origem_desconhecida_nao_recebe_cabecalho_cors(self):
        resposta = self.client.options(reverse('token'), HTTP_ORIGIN='http://site-malicioso.com')
        self.assertNotIn('Access-Control-Allow-Origin', resposta)
