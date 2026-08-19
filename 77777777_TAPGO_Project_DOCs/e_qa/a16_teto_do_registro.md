---
tags: [nota, evolucao, registro]
status: atual
---
# A-16 — o teto do registro, medido (sessão de evolução, 2026-08-19)

> **Continuação de [[a13_estrutura_do_registro]].** Aquela nota mediu três saídas quando o
> registro carregava `QA-NN` junto. Duas foram executadas — `D-50` (QA em arquivo próprio +
> `medida()` sem padding) e `D-63` (as 8 questões respondidas para o arquivo, aviso a 10.800).
> Esta mede o que sobrou depois delas.

## Método (repetível na máquina do dono)

Tudo medido no repositório real, nunca de memória. As contagens usam a mesma regra do
`check.py` — `medida()` (célula de tabela sem padding) **e** leitura com quebra de linha
normalizada, porque o arquivo está em CRLF e `read_text()` converte: sem isso a conta dá
12.328 em vez de 11.997, e os 331 de diferença são só os `\r`.

## 1. O estado que abriu a sessão

| | linhas | chars | média |
|---|---|---|---|
| cabeçalho + notas de rodapé | — | 1.094 | — |
| **Decisões (D-NN)** | 44 | 10.011 | 227 |
| **Questões (Q-NN)** | 4 | 891 | 222 |
| **total** | | **11.997** | teto 12.000 — **3 de folga** |

**Custo de uma decisão hoje:** as 5 últimas (`D-63`, `D-65`..`D-68`) somam 1.624 → **324 cada**.
`D-63` projetou 362; o número caiu porque `T-14` mandou a evidência longa para o tema.

**Custo de uma sessão de trabalho:** desde `D-63` (registro em 10.600 em 13/08), três sessões
escreveram — `T-20` +582, `T-12` +559, `T-14` +256 → soma 1.397, **média +466/sessão**.
Bate com a projeção de `A-13` para o regime pós-`A-12` (+484).

## 2. O pool de arquivamento é ZERO — medido, não estimado

`D-43`: sai da tabela quem **nenhum `.md` vivo** cita. Rodando a régua do próprio `check.py`
sobre as 44 linhas vivas:

| régua | linhas livres | chars | registro ficaria em |
|---|---|---|---|
| a de hoje (o aviso do `check.py`) | **0** | 0 | 11.997 |
| + seção "Feito" do backlog tratada como histórico | **0** | 0 | 11.997 |
| + `e_qa/` também tratado como histórico | 1 (`D-07`) | 77 | 11.920 |

A única linha que qualquer afrouxamento solta é `D-07` — uma das **REJEITADAS**, que `A-09` e
`A-12` preservaram de propósito por serem a lista-morta que a fase de evolução varre. Retirá-la
cega a fase, por 77 caracteres.

> Nota de método: o aviso de teto e a checagem 10 do `check.py` usam **réguas diferentes** de
> citação (uma lê `corpo` cru, a outra `sem_bloco_de_codigo`) e recortes diferentes de "vivo"
> (o aviso inclui `e_qa/`, a checagem 10 não). Não muda nenhum número acima — as duas dão 0 —,
> mas é a ambiguidade que `A-13` levantou, agora resolvida na prática a favor do espírito.

## 3. As duas saídas de arquivamento que sobravam, medidas

Nenhuma alcança o portão de `A-16` ("folga para pelo menos 3 decisões" = **975** caracteres):

| saída | rende | = decisões | por que morre |
|---|---|---|---|
| **(i)** as 15 linhas `ARQUIVADO` viram ponteiro puro | **788** | 2,4 | abaixo do portão; e apaga a coluna "Decisão (curta)", que é o que deixa a fase de evolução varrer a lista-morta **sem** abrir o arquivo |
| **(ii)** as 6 REJEITADAS saem para arquivo próprio (o padrão de `D-50`) | **821** | 2,5 | abaixo do portão; e o padrão de `D-50` cobra uma linha no Mapa de leitura do CONTEXT, que tem **118** caracteres de folga (3.882/4.000) |

As duas são pool de uma passagem só: não se regeneram, e a curva de +466/sessão as consome em
menos de duas sessões.

## 4. Por que a saída (b) de `A-13` volta aprovada, tendo sido reprovada lá

`A-13` deu à saída (b) **P=0,30 como paliativo e 0,05 como solução**, e o motivo principal foi o
custo: *"paga exatamente o mesmo pedágio de manifesto"* — patch local congela o `check.py`
contra upgrades do kit.

**Três coisas mudaram, e é o que autoriza re-propor (regra 1):**

1. **O pedágio já foi pago.** `D-50` patchou o `check.py`, e o `.kit-manifest` guarda
   `604fe5f355fc681c` contra o sha real de hoje, `78d6019e9a2b0e0d`. O arquivo já é
   "customizado"; subir o teto **não** compra nenhum custo novo de manifesto.
2. **A instabilidade sumiu.** `medida()` (prioridade nº 2 de `A-13`, P=0,55) entrou em `D-50`:
   o `Ctrl+S` do dono não custa mais os ~2.270 de padding. O teto agora mede texto.
3. **As alternativas deixaram de existir.** Em `A-13` havia pool (4.668 pela letra). Hoje é 0,
   medido na seção 2. "Subir o teto" não é a saída mais barata entre três — é a única.

O que **não** mudou: subir o teto continua sem mudar a inclinação da curva. Isso fica declarado
no `D-69` com data, não escondido.

## 5. O número escolhido, e o que ele compra

Teto **12.000 → 16.000**; aviso **10.800 → 14.400** (os mesmos 90% que `D-63` escolheu).

Contado **depois** de escrever a própria linha do `D-69`, que custou 502 e levou o registro a
**12.499** — o número que vale é o de depois, não o de antes:

| | valor |
|---|---|
| folga até o teto | **3.501** = **10,8 decisões** = **7,5 sessões** |
| folga até o **aviso** | 1.901 = 5,9 decisões = 4,1 sessões |
| entre aviso e parede | 1.600 = 4,9 decisões (contra 1.200 / 3,7 de `D-63`) |
| portão de `A-16` (3 decisões = 975) | cumprido com **3,6×** de margem |

**Por que 16.000 e não 20.000 ou 40.000.** O teto existe por uma razão só: a fase de evolução é
a única que lê o registro **inteiro**, e um registro que não cabe numa sessão deixa de ser
auditável. `A-13` mediu que cobrir 30 dias exigiria ~40.000 — *"nesse ponto ele deixa de ser
restrição"*. 16.000 é +33%: continua sendo uma restrição que morde (a próxima parede tem data),
e ainda assim dá 3,6× o que o portão pede.

**Custo completo, declarado:** 5 constantes/strings no `check.py` (linhas 266, 268, 272,
293, 673) · nenhuma checagem nova, então o docstring segue "14 falhas / 12 avisos" e a asserção do
`README` do kit não muda · duas linhas de documentação que citavam 12.000 (`README.md` da raiz,
`e_qa/README.md`) · a linha de estado do CONTEXT passa a dizer `/16.000`, senão o próprio
`check.py` acusa divergência (o dicionário `ORCAMENTOS` é chaveado pelo teto).

## 6. O que fica em aberto, com data

A curva não mudou: **+466/sessão**. O aviso volta em ~4,1 sessões de escrita e a parede em ~7,5.
Quando isso acontecer, o pool de `D-43` continuará em 0 e as saídas (i) e (ii) da seção 3
continuarão rendendo menos de 3 decisões cada. **A pergunta seguinte não é "arquivar ou subir o
teto"** — é qual dos dois abaixo, e ela não é do agente:

- encolher o que uma decisão **custa** (hoje 324): mais evidência para o tema, menos na linha;
- repetir o padrão de `D-50` e separar por ciclo de vida (as REJEITADAS são o candidato natural
  — só a fase de evolução as lê), **pagando** a linha no Mapa do CONTEXT, que exige que o CONTEXT
  tenha folga antes.

Nos dois casos o gargalo passa a ser o **CONTEXT**, hoje em 3.882/4.000 (118 de folga, 97%) — e
ele não tem `A-NN` aberto. É o próximo a bater na parede, antes do registro.

## 7. O que o dono roda para conferir

```bash
python scripts/check.py
```

Esperado: **nenhum aviso do `c_decisions.md`** (12.499 está abaixo do novo aviso de 14.400), os
dois avisos que já existiam (CONTEXT a 97%, QA a 95%), e `OK` no resto. O sandbox do agente é
indicativo; o portão é o que roda na máquina real.
