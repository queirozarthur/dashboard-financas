# App de finanças pessoais

Sistema para controlar minhas finanças: receitas, despesas por categoria, contas, investimentos e uma dashboard. Projeto pessoal, feito para eu aprender, então explique o que fizer e por quê.

## Stack

- Backend: Django + Django REST Framework, autenticação JWT (`djangorestframework-simplejwt`), `django-cors-headers`, PostgreSQL (`psycopg`), configurações em `.env` (`python-decouple`).
- Frontend (fase futura): React + Vite + TypeScript, Recharts, TanStack Query. Primeiro mobile-first, instalável como PWA. Usar as skills de front-end instaladas.
- Ambiente: Windows 11 nativo, terminal PowerShell. O projeto fica fora de pastas sincronizadas pelo OneDrive (está em `C:\Users\queir\Desktop\financas`, que não é sincronizada). Use `python` (não `python3`) e ative o venv com `.venv\Scripts\Activate.ps1`. Comandos de exemplo devem ser em PowerShell.
- Repositório: https://github.com/queirozarthur/dashboard-financas (**público**).
- Banco: PostgreSQL 18 local (serviço `postgresql-x64-18`), banco `financas`, credenciais no `.env`.
- **Controle Inteligente de Aplicativos (Smart App Control) está ligado** e bloqueia o `psql.exe` e a DLL do `psycopg[binary]`. Por isso usamos só `psycopg` (implementação pura em Python), que carrega a `libpq.dll` de `C:\Program Files\PostgreSQL\18\bin` (essa pasta está no PATH do usuário). Não instalar `psycopg[binary]`. O `manage.py dbshell` também não funciona (ele chama o `psql`); para rodar SQL, usar um script com `psycopg` ou uma ferramenta gráfica.

## Estrutura

```
financas/
├── backend/
│   ├── config/          settings e urls
│   ├── nucleo/          contas, categorias, transações, recorrências
│   └── investimentos/   investimentos, operações, atualizações, proventos
└── frontend/            só na fase de telas
```

## Como trabalhar comigo

- Passos pequenos. Termine um passo, mostre o que mudou, rode os testes e espere eu revisar antes do próximo.
- Antes de editar vários arquivos, mostre o plano em poucas linhas.
- Quando eu pedir um arquivo, entregue o arquivo completo, não só um trecho.
- Explique conceitos novos em uma ou duas frases (ORM, serializer, JWT, migration). Sou iniciante em Django.
- Faça um commit por passo concluído, com mensagem curta em português.
- Nunca coloque senha, `SECRET_KEY` ou token no código nem em commit. Tudo vai no `.env`, que está no `.gitignore`. Mantenha um `.env.example` sem valores reais. O repositório é público: antes de cada commit, confira com `git status` que nada sensível está indo junto.
- Se uma decisão não estiver neste arquivo, pergunte antes de decidir.

## Convenções de código

- Nomes de models, campos, variáveis, funções e testes em português, curtos e claros (`Transacao`, `valor`, `conta_destino`).
- Comentários só quando explicam o porquê, não o quê.
- Testes com `python manage.py test`. Toda regra de negócio listada abaixo precisa de teste.

## Regras do sistema

1. **Dinheiro nunca em float.** Use `DecimalField(max_digits=12, decimal_places=2)`. O DRF envia Decimal como string no JSON.
2. **Todo model tem `usuario`** (`ForeignKey` para o usuário), e toda view filtra por `request.user` em `get_queryset`. O dono é preenchido no servidor (`perform_create`), nunca vem do cliente. Acessar o objeto de outro usuário retorna 404.
3. **Aporte e transferência não são despesa.** Uma transferência move dinheiro entre contas e não entra em receita nem despesa.
4. **Saldo é calculado, nunca armazenado:** `saldo_inicial` + receitas − despesas + transferências recebidas − transferências enviadas.
5. **Categoria e tipo são coisas diferentes.** A categoria diz o que é (Moradia, Alimentação). O `tipo` da categoria diz se é fixo ou variável.
6. **Agregações no backend** (`annotate`, `Sum`), nunca somando no frontend.
7. Evitar o problema N+1: use `select_related` nas listagens.

## Modelo de dados, fase 1

```
Conta       usuario, nome, tipo (corrente | dinheiro | investimento), saldo_inicial
Categoria   usuario, nome, natureza (receita | despesa), tipo (fixo | variavel)
Transacao   usuario, conta, conta_destino (só transferência), categoria (vazia em
            transferência), descricao, valor, data, tipo (receita | despesa | transferencia)
```

Validações da `Transacao` (no serializer):

- `valor` maior que zero.
- `receita` e `despesa` exigem `categoria` e não podem ter `conta_destino`.
- `transferencia` exige `conta_destino` diferente de `conta` e não pode ter `categoria`.
- A `natureza` da categoria precisa bater com o `tipo` da transação.
- Conta e categoria precisam pertencer ao mesmo usuário da transação.

## Endpoints, fase 1

- `POST /api/token/` e `POST /api/token/refresh/` (login JWT).
- CRUD em `/api/contas/`, `/api/categorias/`, `/api/transacoes/`, com filtros por mês, conta e categoria na listagem de transações.
- `GET /api/dashboard/?mes=2026-10`: receitas, despesas e resultado do mês, saldo total das contas, gastos por categoria, fixo × variável e a comparação com o mês anterior.
- `GET /api/dashboard/evolucao/?meses=6`: receitas e despesas dos últimos meses.

## Decisões já tomadas

- Apagar conta ou categoria com transações é bloqueado (`on_delete=PROTECT`); a API responde 409.
- Nome de conta é único por usuário; nome de categoria é único por usuário + natureza.
- As regras da transação que não dependem de outra tabela também são `CheckConstraint` no PostgreSQL.
- Não dá para mudar a natureza de uma categoria que já tem transações.
- JWT: access de 15 min, refresh de 7 dias com rotação e lista negra. Toda rota exige login por padrão.
- `?conta=<id>` nas transações funciona como extrato (inclui transferências recebidas).
- Transações paginadas de 50 em 50; contas e categorias sem paginação.
- Dashboard: `saldo_total` é o saldo no último dia do mês escolhido; fixo × variável considera só despesas; sem `?mes`, usa o mês atual no fuso local.
- Evolução: padrão 6 meses, máximo 24, meses vazios com zero, `?mes` escolhe o último mês da série.
- Testes usam hash de senha MD5 (só quando `test` está no `sys.argv`).

## Ordem dos passos

1. Ambiente: venv, dependências, projeto Django, PostgreSQL via `.env`, `.gitignore`, primeiro commit.
2. App `nucleo`: models `Conta`, `Categoria`, `Transacao` + migrations + admin.
3. Autenticação JWT e CORS.
4. Serializers com as validações e viewsets com filtro por usuário.
5. Testes: isolamento entre usuários, validações da transação, cálculo do saldo.
6. Endpoints da dashboard, com testes.

## Fora do escopo por enquanto

- Cartão de crédito (parcelas, fatura): conversa separada depois da fase 1.
- Recorrências, orçamentos, metas e investimentos: fases seguintes.
- Funcionalidades de freelancer (contas a receber, MEI): decidi não incluir.
- Telas: só depois do backend estar testado.
