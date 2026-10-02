import re
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Mes:
    ano: int
    numero: int

    @classmethod
    def ler(cls, texto):
        """Converte 'AAAA-MM'; levanta ValueError se o formato for inválido."""
        if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', texto):
            raise ValueError(texto)
        ano, numero = texto.split('-')
        return cls(int(ano), int(numero))

    @classmethod
    def de(cls, dia):
        return cls(dia.year, dia.month)

    def somar(self, quantidade):
        indice = self.ano * 12 + (self.numero - 1) + quantidade
        return Mes(indice // 12, indice % 12 + 1)

    def anterior(self):
        return self.somar(-1)

    def primeiro_dia(self):
        return date(self.ano, self.numero, 1)

    def fim_exclusivo(self):
        """Primeiro dia do mês seguinte, para filtrar com data < fim_exclusivo."""
        return self.somar(1).primeiro_dia()

    def ultimo_dia(self):
        return self.fim_exclusivo() - timedelta(days=1)

    def __str__(self):
        return f'{self.ano:04d}-{self.numero:02d}'
