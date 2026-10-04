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
- A dashboard conta o realizado pela `data` da transação, nunca pela competência: é quando o dinheiro sai, igual ao saldo e às parcelas do cartão.

## Cartão de crédito (fase 1b)

- **Cartão é uma `Conta` com `tipo=cartao`**, com `dia_fechamento` e `dia_vencimento` (1–31; em mês mais curto vale o último dia). Saldo negativo = dívida.
- **`Compra`** (usuario, cartao, categoria, descricao, valor_total, parcelas, data_compra) gera N `Transacao` do tipo `despesa` na conta do cartão, com `compra` e `numero_parcela`. A `data` de cada parcela é o **vencimento da fatura** em que ela cai, então a dashboard mostra cada parcela no mês da sua fatura.
- Centavos da divisão vão na primeira parcela (100,00 em 3x = 33,34 + 33,33 + 33,33). Máximo de 48 parcelas por compra.
- No cartão, despesa entra só como compra (`/api/compras/`): `/api/transacoes/` recusa receita/despesa direto no cartão e não deixa editar nem apagar uma parcela sozinha (409 ao apagar).
- Compra antes do dia de fechamento entra na fatura que fecha naquele mês; no dia do fechamento ou depois, na seguinte. O vencimento cai no mesmo mês do fechamento se `dia_vencimento > dia_fechamento`, senão no mês seguinte.
- **Fatura é calculada, não armazenada:** parcelas do cartão com a mesma data de vencimento.
- **Pagamento = transferência** da conta para o cartão (não é despesa). Só pagamento total: valor igual ao total da fatura, fatura já fechada, uma vez só. Parcelas de fatura paga não podem ser apagadas.
- Rotas da fatura: `GET /api/cartoes/<id>/faturas/<AAAA-MM>/` (fatura que vence no mês), `POST .../pagar/` com `{conta, data}` (o valor vem do total, nunca do cliente) e `DELETE .../pagar/` para cancelar o pagamento. "Fechada" é conferida pela data do pagamento (≥ fechamento), não pela data de hoje.
- O pagamento grava `fatura_paga` (data de vencimento) na transferência; o banco garante uma vez por fatura. Pela rota de transações não dá para transferir para um cartão ou saindo dele, nem editar ou apagar um pagamento (409 com a rota certa).
- Uma compra que cairia numa fatura já paga é recusada.
- Cada parcela mostra número (`3/12`), vencimento, situação (paga/pendente) e data de pagamento (data da transferência que pagou a fatura).
- Apagar a compra apaga as parcelas (se nenhuma estiver em fatura paga). Editar compra: apagar e lançar de novo.
- O `saldo_total` da dashboard desconta só parcelas que vencem até o fim do mês; a dívida total aparece no saldo do cartão.
- Fora da primeira versão: limite disponível, estorno, editar compra parcelada, antecipar parcelas.
- Passos: C1 models e regras de fatura; C2 API de compras; C3 faturas e pagamento; C4 conferir a dashboard com cartão. **Todos concluídos.**

## Recorrências (fase 2a)

- **`Recorrencia`** (usuario, descricao, tipo, valor, conta, conta_destino, categoria, dia 1–31, inicio, fim opcional): só mensal; receita, despesa ou transferência; nunca em cartão. Mesmas validações da `Transacao`. `inicio` e `fim` guardam o primeiro dia do mês.
- **Prevista, você confirma:** previstos são calculados (recorrências ativas no mês sem transação confirmada para aquela competência), nunca armazenados. Confirmar cria a `Transacao` com `recorrencia` e `competencia` (primeiro dia do mês a que se refere); valor, data e conta sugeridos podem ser trocados na confirmação. Uma confirmação por recorrência por mês (garantido no banco).
- Dia 31 em mês curto vira o último dia. Apagar a transação confirmada volta o mês para previsto.
- Mês em que não aconteceu fica previsto só naquele mês (sem "pular" na primeira versão).
- Editar a recorrência afeta só meses não confirmados. Apagar a recorrência mantém as transações confirmadas (`SET_NULL`).
- Dashboard ganha `previsto`: receitas e despesas previstas e `resultado_projetado`; transferências previstas ficam fora. O realizado segue a `data`; o previsto segue a `competencia` (aluguel de outubro pago em 02/11 conta nas despesas de novembro).
- Rotas: CRUD em `/api/recorrencias/` (`inicio`/`fim` como `AAAA-MM`), `GET /api/recorrencias/previstas/?mes=`, `POST /api/recorrencias/<id>/confirmar/` com `{mes, valor?, data?, conta?}` (409 se já confirmada).
- Passos: R1 model e regras; R2 API (cadastro, previstos, confirmação); R3 bloco previsto na dashboard. **Todos concluídos.**

## Orçamentos (fase 2b)

- **`Orcamento`** (usuario, categoria só de despesa, valor, inicio): o limite vale de `inicio` em diante, até existir outro mais novo para a mesma categoria. Mudar o limite cria uma nova vigência; meses antigos mantêm o limite antigo. Um orçamento por categoria por mês de início.
- A sobra não passa para o mês seguinte.
- Dashboard ganha `orcamentos`: por categoria com limite, `limite`, `gasto` (realizado pela data, inclui parcelas do cartão), `previsto` (recorrências não confirmadas da categoria), `restante` (limite − gasto − previsto, pode ser negativo) e `percentual` = (gasto + previsto) / limite, o quanto já está comprometido; mais uma linha de total (`percentual` nulo sem orçamentos).
- Rotas: CRUD em `/api/orcamentos/` (`inicio` como `AAAA-MM`); `?mes=AAAA-MM` lista os limites que valem no mês.
- Passos: O1 model, regra de vigência e API; O2 bloco na dashboard. **Todos concluídos.**
- Limitação conhecida: não dá para encerrar um limite a partir de um mês (só mudar o valor ou apagar).

## Frontend (fase 3)

- Pasta `frontend/`, React + Vite + TypeScript. As skills de front-end são escritas para monorepo/Next.js; aqui aplicamos as regras delas **dentro do `frontend/`**, sem Turborepo: `src/app` (rotas, providers), `src/core/{ui,api,utils}`, `src/features/<nome>` (cada pasta com `index.ts`, `components/`, `hooks/`, `consts/`). Named exports, componentes `FC` com `type`, lógica em hooks.
- Tailwind com tokens semânticos (sem cor crua), `tv()` para variantes e `cn()` para classes condicionais. Componentes próprios; Radix só para comportamento acessível (Dialog, Select...). React Router, TanStack Query, Recharts, Vitest + Testing Library, vite-plugin-pwa, oxlint, Prettier. **zod** valida toda resposta da API (o tipo vem do esquema); **lucide-react** para ícones (SF Symbols não podem ser usados na web).
- Valores: receita em verde com "+", despesa em cor normal com "−" (U+2212); vermelho só para alerta (saldo negativo, orçamento estourado). Componente `Valor` e função `apresentarValor`.
- O mês escolhido fica na URL (`?mes=AAAA-MM`, hook `useMesSelecionado`).
- Formulários: `Campo`, `CampoValor` (digitado a partir dos centavos, entrega texto `"12.34"`), `CampoData` e `CampoSelecao` como linhas de um `Grupo`. Data e seleção são **nativos** (no iPhone abrem o calendário e a roda do iOS); Radix só na `Folha`. `ControleSegmentado` usa rádios de verdade. A `Folha` fecha com Cancelar, Esc ou arrastando para baixo; no computador vira janela central.
- **Todo token novo de tamanho de texto (`--text-*`) ou sombra (`--shadow-*`) no `index.css` precisa entrar em `CONFIG_DO_MERGE` (`core/utils/tailwind.ts`)**, senão o `cn()`/`tv()` o confunde com cor e o descarta. Usar sempre `tv` e `cn` de `@/core/utils`, nunca direto das bibliotecas.
- **Visual "applenizado"** (estilo iOS): fonte do sistema (SF) no Apple e Inter nos outros; títulos grandes que encolhem ao rolar; listas agrupadas em blocos arredondados sobre fundo cinza claro; barra de abas embaixo translúcida com desfoque; formulários como bottom sheet; controle segmentado; números tabulares; resposta ao toque (scale) e animações com mola. **Só tema claro.** Cor principal verde-azulado; verde para receita e vermelho para despesa ficam reservados.
- Sessão: access token só na memória; refresh no `localStorage` (trocar por cookie httpOnly antes de publicar na internet).
- Dinheiro chega e volta como texto; só é formatado para exibir, nunca vira float. Nenhuma soma no frontend.
- Gráficos seguem a skill `dataviz` (paleta validada pelo script, barras em vez de pizza). **Nos gráficos, receita é verde e despesa é azul** (`--color-serie-despesa`): verde x vermelho falhou no teste de daltonismo. Fixo x variável: azul x laranja. Texto nunca na cor da série; legenda com 2+ séries; tabela escondida (`sr-only`) para leitores de tela.
- Lançamentos: lista do mês agrupada por dia (só agrupa, nunca soma), rolagem infinita (`useInfiniteQuery`, 50 por página), filtros de conta e categoria na URL. O ＋ da barra **abre a folha de novo lançamento por cima da tela atual** (não é uma tela). Apagar: **no celular, arrastar a linha para a esquerda** (só com o dedo) revela "Apagar", que apaga direto; **no computador, botão "Apagar lançamento" na folha, com confirmação**. Formulário só oferece contas que não são cartão (compra no cartão é o T7); parcelas e pagamentos de fatura abrem só para leitura.
- **Mais cor, estilo Ajustes do iPhone:** cada categoria e conta tem `cor` (uma das 8 da paleta validada da skill dataviz, na ordem azul, laranja, turquesa, amarelo, rosa, verde, violeta, vermelho; o hex fica no frontend) e `icone` (lista fixa em `nucleo/aparencia.py`). Em branco no cadastro, o `save()` escolhe: próxima cor da paleta para aquele usuário e ícone pelo tipo da conta (categoria: etiqueta). Listas mostram um quadradinho colorido com ícone; o cartão do resultado é um degradê verde-azulado; barras de gastos por categoria usam a cor da categoria. Transações, gastos por categoria e orçamentos devolvem `cor`/`icone` da categoria.
- Contas e categorias: telas em `/mais/contas` e `/mais/categorias` (a aba Mais continua acesa), com "‹ Mais" para voltar, folha com prévia, seletor de cor (8) e de ícone, apagar arrastando (celular) ou na folha (computador). Dados compartilhados (`useContas`, `useCategorias`, `useAtualizarDados`, `errosDoDRF`) ficam em `core/api`. **Regras novas no backend:** conta com lançamentos não pode virar cartão nem deixar de ser cartão (entre corrente, dinheiro e investimento pode); cartão começa sempre com saldo inicial zero (a dívida vem das compras). Saldo inicial de outras contas pode ser negativo (botão ± no campo, porque o teclado numérico do iPhone não tem a tecla de menos).
- Formulários: o `<label>` envolve só o texto do rótulo e aponta para o campo por `id` (outros controles na linha, como o ±, não são confundidos com o campo).
- Única exceção ao "dinheiro nunca vira número": `Number()` só para o Recharts calcular a altura das barras (e `flex-grow` da barra fixo x variável). Esse número nunca é somado nem exibido; o texto mostrado vem sempre da API.
- Passos: T1 base ✓; T2 login e sessão ✓; T3a layout, navegação, título que encolhe, lista agrupada, valor e seletor de mês ✓; T3b campos, controle segmentado e folha (bottom sheet) ✓; T4a dashboard (resultado, previsto, orçamentos) ✓; T4b gráficos (gastos por categoria, fixo x variável, evolução) ✓; T5a lista de lançamentos ✓; T5b formulário (novo, editar, apagar) ✓; T6a cor e ícone no backend ✓; T6b visual colorido ✓; T6c telas de contas e categorias ✓; T7 cartão; T8 recorrências e orçamentos; T9 PWA.

## Ordem dos passos

1. Ambiente: venv, dependências, projeto Django, PostgreSQL via `.env`, `.gitignore`, primeiro commit.
2. App `nucleo`: models `Conta`, `Categoria`, `Transacao` + migrations + admin.
3. Autenticação JWT e CORS.
4. Serializers com as validações e viewsets com filtro por usuário.
5. Testes: isolamento entre usuários, validações da transação, cálculo do saldo.
6. Endpoints da dashboard, com testes.

## Fora do escopo por enquanto

- Depois dos orçamentos vêm as telas; metas e investimentos em fases seguintes.
- Funcionalidades de freelancer (contas a receber, MEI): decidi não incluir.
- Telas: só depois do backend estar testado.
