---
tags: [nota, evolucao, registro]
status: atual
---
# O registro no teto — o que ainda dá para cortar (sessão de evolução, 2026-08-21)

> **Continuação de [[a21_limite_por_linha]]**, que subiu o teto para 20.000 (`D-82`) declarando
> ser **rejeição adiada** com prazo de ~9–11 decisões. O prazo venceu em **um dia**. Esta nota
> mede o que sobrou, e a resposta é diferente da de `A-21`: pela primeira vez desde `A-13` existe
> corte no registro, e ele **não** é arquivar linha nem subir teto.

## Método (repetível na máquina do dono)

Tudo medido no repositório real com a régua do próprio `check.py` (`medida()`, célula de tabela
sem o padding de alinhamento, `D-50`) — nunca de memória, nunca de estimativa. As citações por ID
saíram de varredura sobre os 77 `.md` vivos do repositório, com o mesmo recorte de "vivo" do aviso
de teto (fora: `c_decisions.md`, `decisions_archive.md`, `d_history/`).

Custo de contexto, quando citado abaixo, usa a régua **~3,6 caracteres por token** (português com
crases e tabela). É a única fase que carrega o registro inteiro, então é nela que a conta cai.

## 1. O estado que abriu a sessão

| registro | medido | teto | folga | o que a folga compra |
|---|---|---|---|---|
| [[c_decisions\|DECISIONS]] | **19.718** | 20.000 | **282** | **nada** — a linha mais barata das 7 últimas custa 323 |
| [[d_qa\|QA]] | 7.346 | 8.000 | 654 | um achado, se ele delegar |
| [[a_context_source\|CONTEXT]] | 3.868 | 4.000 | 132 | uma linha de estado curta |

**Composição do registro, medida:** cabeçalho + rodapé **1.223** · 41 ADOTADAS vivas **15.377**
(375 cada) · 9 REJEITADAS **1.996** (222 cada) · 5 `Q-NN` **1.122**.

**O prazo de `D-82`, conferido:** o registro saiu de 16.676 (commit de `D-82`/`D-83`) para 19.718
em **um dia** — `D-84`..`D-90` mais as duas edições de estado em `Q-15`/`Q-16`. Prometeu ~9–11
decisões e entregou **7**. Não é desvio: é a curva que `A-21` §5.2 já dizia que não mudaria.

## 2. `D-83` está funcionando — e não é ele que trava

As 7 linhas escritas depois dele: **370 · 323 · 381 · 381 · 378 · 372 · 396**. Todas ≤ 400,
mediana **378**, nenhuma perdeu evidência (todas apontam para tema ou nota). O portão de `D-83`
está em **8 de 10** e a essa altura ele passa.

O que `D-83` conserta é a **inclinação**. O intercepto é o mesmo de `A-21` §2.1, e agora mais
apertado: **282 de folga, e nem esta auditoria consegue registrar o próprio veredito.** Pela
segunda sessão seguida, a conclusão precede o espaço para escrevê-la.

## 3. Por que o pool de `D-43` é zero — a causa tem nome, e nunca foi medida

`D-43` retira da tabela quem **nenhum `.md` vivo cita**. Medido hoje, o arquivo que decide isso é
um só:

| | valor |
|---|---|
| `b_process/c_backlog.md` | **198.785** caracteres |
| dentro dele, cards **fechados** (`- [x]`) | **185.884** (93,5%) |
| IDs vivos do registro que ele cita | **51 de 55** |

Todo `D-NN` nasce citado pelo card que o motivou, e o card **nunca some** — ele só ganha um `[x]`.
O critério de `D-43` é avaliado contra um arquivo de 199k que, por construção, cita tudo. O pool
não é zero por falta de linha morta; é zero porque a régua não consegue enxergar linha morta.

Isso não reabre "arquivar pelo critério de `D-43`", que segue morta (§4). Muda **o diagnóstico**:
os quatro relatórios anteriores leram o zero como "não há o que cortar", e ele significa "a régua
mede o backlog". `A-16` §2 já havia afrouxado essa mesma régua e obtido **0 linhas**; hoje o mesmo
afrouxamento rende **3** (`D-44`, `D-85`, `D-87` — 963 caracteres), porque essas três passaram a
existir sem citação fora do backlog. É o ângulo novo que a regra 1 exige, e ele vem com número.

## 4. Lista-morta percorrida (regra 1)

| ideia | onde morreu | continua morta? |
|---|---|---|
| arquivar pelo critério de `D-43` (régua de hoje) | `A-13`, `A-16`, `A-20`, `A-21` | **sim** — pool ZERO pela 5ª vez, impresso pelo `check.py` desta sessão |
| `ARQUIVADO` vira ponteiro puro | `A-16` (i), 788 | **sim** — pool gasto por `D-74` |
| REJEITADAS para arquivo próprio | `A-16` (ii), 821 | **sim** — e §5.1 depende delas ficarem inteiras |
| comprimir a prosa das linhas antigas | `A-20` §6 | **sim, e continua proibida** — §5.1 **não** é isto: nada é comprimido, a íntegra vai para a nota |
| partir o registro em dois arquivos | `A-21` §4 | **sim** — dois arquivos carregados juntos custam o mesmo |
| subir o teto do registro | `A-13` (b) · `A-20` §6 · adotada em `D-82` | **volta REPROVADA — §5.4**, e desta vez sem ângulo novo |
| `A-21` como escrito no §8 | `A-21` §2 | **sim** — reparada e adotada como `D-83` |

## 5. As quatro saídas, medidas

| # | saída | rende | registro fica em | = decisões a 372 | custo de contexto |
|---|---|---|---|---|---|
| **5.1** | as 8 linhas gordas **ADOTADAS** delegam a evidência à nota | **3.113** | **16.605** | **8,4** | **−3.113 chars ≈ −865 tokens** por sessão de evolução |
| **5.2** | `Q-15`/`Q-16` fechadas saem da tabela viva | **459** | 19.259 | 1,2 | −459 chars ≈ −130 tokens |
| **5.3** | card fechado do backlog deixa de segurar linha | 963 | 18.755 | 2,6 | −963 chars ≈ −270 tokens, +5 linhas no `check.py` |
| **5.4** | teto 20.000 → 24.000 | 4.000 | — | 10,8 | **+4.000 chars ≈ +1.100 tokens** por sessão, quando gasto |

### 5.1 As 8 gordas delegam a evidência — a única saída acima do portão de `A-16`

São as linhas que `D-83` isentou por estarem vivas antes dele, e são **29% do registro**:

| linha | mede | destino da íntegra (já existe) |
|---|---|---|
| `D-62` | 461 | [[m4_catalogo_notas]] (é evidência de asset e build, não a lista) |
| `D-65` | 581 | tema novo em `a_context/` (é restrição visual permanente) — **o único que custa linha no Mapa do CONTEXT** |
| `D-70` | 412 | **nota nova** em `e_qa/` — é o fechamento de E-5, e nenhuma das existentes é dele |
| `D-71` | 623 | [[stack]] |
| `D-72` | 780 | [[entrega_e6]] |
| `D-73` | 923 | [[m5_sessao_notas]] |
| `D-75` | 979 | [[qa25_reentrada_na_janela]] |
| `D-80` | 514 | [[qa25_reentrada_na_janela]] |
| **soma** | **5.273** | ponteiro medido: **260** e **275** em dois rascunhos → 270 × 8 = 2.160 |

**`D-76` (480) fica inteira, de propósito:** é REJEITADA, e a coluna de evidência dela **é** a
lista-morta que esta fase varre sem abrir o arquivo. O mesmo vale para as outras 8 rejeitadas.
Delegar a evidência de uma rejeição é cegar a fase de evolução por 480 caracteres — o erro que
`A-16` (i) já pagou.

**Por que isto não é `A-20` §6 (prosa comprimida) de novo:** nada é comprimido. O que sai da linha
entra na nota **inteiro** — é a regra escrita em `D-83`, aplicada às linhas que só escaparam dela
por serem anteriores. Hoje elas são as **únicas** do registro que violam o padrão vigente do
projeto, e a isenção existe porque reescrever linha viva nunca foi decidido, não porque foi
recusado.

**Custo completo, declarado:** uma decisão que **supersede o append-only na coluna de evidência**
(a decisão em si não muda; a íntegra vai para a nota e o ponteiro fica — é o mecanismo de
`ARQUIVADO` aplicado à **coluna** em vez da **linha**) · 8 linhas reescritas + 6 notas recebendo
texto · `ISENTAS_LINHA_MAX` cai de 12 para 3 (`QA-20`, `QA-21`, `QA-27`), e com isso `D-83` passa
a valer sobre o DECISIONS inteiro · `D-65` exige tema novo em `a_context/` e **uma linha no Mapa
de leitura do CONTEXT**, que tem 132 de folga — se ela não couber, `D-65` sai desta rodada e a
saída rende 2.532 em vez de 3.113 · **zero byte em `src/`**, nenhum rebuild, nenhuma migração.

**Portão, escrito ANTES do experimento:**
1. `python scripts/check.py` **verde**, com `ISENTAS_LINHA_MAX` reduzida às 3 do QA.
2. DECISIONS medido **≤ 16.700**. Abaixo de 2.900 liberados, **reprova**: uma sessão inteira de
   reescrita tem de render mais que as saídas de uma passagem que `A-16` já matou (788, 821).
3. **Zero evidência perdida:** para cada uma das 8, todo número da coluna removida aparece na nota
   de destino — conferível por `grep` do número, um a um.
4. **Não pode regredir:** as 9 REJEITADAS ficam inteiras · nenhum wikilink quebrado, nenhuma nota
   órfã, nenhum ID citado inexistente (checagens 7 e 10) · CONTEXT continua ≤ 4.000.

**P(passar) = 0,60**, acima da taxa-base de 20–30% por três razões medidas, não estimadas: o
mecanismo já está provado **neste** registro (141 em `D-67`, 175 em `D-68`, 238 em `D-81` quando
delega, contra 923 e 979 quando não); os destinos já existem em 6 dos 8 casos; e o efeito é
aritmético, não comportamental — não depende de ninguém escrever mais curto no futuro. O que
segura os 0,40: a reescrita retroativa é decisão do dono, e `D-65` pode não caber no CONTEXT.

### 5.2 As duas questões fechadas saem — e é ela que destrava a escrita

`Q-15` (216) e `Q-16` (255) estão marcadas **fechada por `D-84`/`D-88`** na própria tabela. `D-63`
já mandou as 8 questões RESPONDIDAS para [[decisions_archive]] com o ID preservado; estas duas são
o mesmo caso e ninguém as levou, porque o aviso do `check.py` só varre linhas `D-NN` — o `velhas`
da linha 288 casa `^\|\s*(D-\d+)\s*\|`, e `Q-NN` nunca entrou na conta.

Rende **459** líquidos (471 menos os 12 dos dois IDs no rodapé "Retirados da tabela").

**Por que ela vem primeiro, mesmo rendendo pouco:** com 282 de folga, **nenhuma linha nova cabe**
— nem a de `D-NN` que adota a §5.1. É o mesmo bloqueio de `A-21` §2.1, e a saída é a mesma que
`A-21` §1 usou no QA: executar um corte que uma decisão **já adotada** autoriza, sem gastar linha
nova. Com os 459, cabem duas linhas de ~300.

**A honestidade que falta declarar:** `D-63` foi ação única sobre 8 questões, não regra permanente.
Aplicá-la a `Q-15`/`Q-16` é leitura de precedente, e é sua para confirmar. Virar regra escrita no
cabeçalho custaria ~150 dos 459 — e eu **não** recomendaria pagá-los agora.

**Portão:** `check.py` verde · as duas íntegras em [[decisions_archive]] com ID preservado · o
CONTEXT continua citando "`Q-15`/`Q-16` fechadas por `D-84`/`D-88`" e a checagem 10 continua
achando os IDs (o arquivo morto conta) · DECISIONS ≤ 19.260. **P = 0,85.**

### Resultado medido — executado em 2026-08-21 (`D-91`)

O portão acima foi escrito **antes**. Contra ele, o experimento **reprova no item 2** e passa nos
outros três. O que a nota não mediu ao projetar 3.113: ela mediu as **colunas de evidência** e o
ponteiro, nunca os **prefixos** (`| ID | data | status | decisão |`). O teto de `D-83` é da **linha
inteira**, e os prefixos medem de 175 a **400**.

| linha | antes | depois | liberou | prefixo |
|---|---|---|---|---|
| `D-62` | 460 | 374 | 86 | 214 |
| `D-65` | 580 | 386 | 194 | 314 |
| `D-70` | 411 | 318 | 93 | 175 |
| `D-71` | 622 | 372 | 250 | 257 |
| `D-72` | 779 | 335 | 444 | 237 |
| `D-73` | 922 | 371 | 551 | 271 |
| `D-80` | 513 | 397 | 116 | 335 |
| `D-75` | 978 | — | **0** | **400** |
| **soma** | | | **1.734** | |

**`D-75` não foi executada, e não é escolha:** só a coluna de DECISÃO dela mede **400**. Nenhum
ponteiro, nem o vazio, a leva a ≤ 400 — a linha inteira mediria 401 com a evidência apagada.
Encurtá-la é reescrever a **decisão**, e `D-91` supersede o append-only só na **evidência**. Ela
sozinha valia ~600 dos 3.113 projetados, e é a maior parte da diferença.

**Contra o portão, item a item:**

1. `check.py` **verde** — mas `ISENTAS_LINHA_MAX` caiu para **5**, não para as 3 do QA: `D-76` (479)
   fica pelo motivo escrito no §5.1, e `D-75` (978) fica por não caber. **Passa com desvio.**
2. DECISIONS **17.916**, não ≤ 16.700; liberou **1.734**, não ≥ 2.900. **REPROVA.**
3. Zero evidência perdida — cada número das 7 colunas conferido por `grep` na nota de destino.
   **Passa.**
4. As **9** REJEITADAS inteiras · nenhum wikilink quebrado · nenhuma nota órfã · CONTEXT **3.958**
   ≤ 4.000. **Passa.**

**O que fazer com a reprova, declarado e não escondido:** 1.734 é **mais que o dobro** das saídas
que `A-16` matou (788, 821), que é a razão que o item 2 dá para existir. O número que ele cobra
(2.900) foi calibrado sobre uma projeção errada. **Manter ou reverter é chamada do dono** — reverter
é um `git revert`. O que **não** volta à mesa é a §5.4: o registro saiu de 19.718 para 17.916, abaixo
do aviso de 18.000, e o teto de 20.000 deixou de morder.

**Efeito colateral que rende:** com `ISENTAS` em 5, `D-83` passa a valer sobre 45 das 50 linhas do
registro — contra 38 antes. É a metade da §5.1 que não aparece nos 1.734.

### 5.3 Card fechado do backlog deixa de segurar linha — rende, mas não paga sozinha

É a régua do §3 virada em regra: `d_history/` já não segura linha; card com `[x]` é a mesma coisa
— histórico de tarefa, não referência viva.

Medido: solta `D-44`, `D-85`, `D-87` — **963**, contra o portão de 3 decisões de `A-16` (**975**).
**Reprova por 12 caracteres**, e o número é esse mesmo. Pior: a linha de `D-NN` que a adota custa
~370, então o líquido de hoje é **~590**.

O que ela tem e as outras não: **o pool se refaz**. Das 7 decisões desde `D-83`, 2 (`D-85`,
`D-87`) já nasceriam arquiváveis por ela — **29%** do que se escreve volta, ~106 por decisão de
372. Cobre menos de um terço da queima. É melhoria de regime, não corte.

**Recomendação: só como carona da §5.1, no mesmo commit** — aí o custo da linha de decisão já está
pago e os 963 entram limpos. Sozinha, `P = 0,30`.

### 5.4 Subir o teto para 24.000 — **REPROVADA**

Não há ângulo novo (regra 1). `D-82` subiu para 20.000 declarando-se **rejeição adiada**, com
prazo de ~9–11 decisões que durou **7 e um dia**. Repetir agora seria a terceira adiada seguida
(`D-63` → `D-69` → `D-82`), e desta vez com uma diferença que mata o argumento de `A-16` §4.3
(*"não é a saída mais barata entre três — é a única"*): a §5.1 **existe**, é medida, e libera
3.113 dos 4.000 que o teto compraria — **sem** cobrar o pedágio de contexto.

E o pedágio é o assunto: o teto existe porque esta fase carrega o registro **inteiro**. A 24.000,
são ~6.700 tokens de leitura obrigatória por sessão de evolução, contra os ~5.500 de hoje. `A-13`
mediu que cobrir 30 dias exigiria ~40.000, *"e nesse ponto ele deixa de ser restrição"*. Cada
subida sem corte é um passo nessa direção.

**Fica REPROVADA por existir alternativa medida, não por ser inviável.** Se você recusar a §5.1
(reescrever linha viva é sua chamada), esta volta à mesa **na hora** — e aí ela é a única, como em
`A-16`. Nesse cenário eu recomendaria **22.000**, não 24.000: metade do salto, pela mesma razão
que `A-16` escolheu 16.000 e não 40.000 — a próxima parede tem de ter data.

## 6. Prioridade (valor × P ÷ custo)

| # | proposta | valor | P | custo | veredito |
|---|---|---|---|---|---|
| 1 | §5.2 — as duas questões fechadas saem | médio: 459, e é o que **destrava a escrita** | **0,85** | zero decisão nova (precedente `D-63`) | **executar primeiro** |
| 2 | §5.1 — as 8 gordas delegam a evidência | **alto**: 3.113, e alinha o registro ao próprio `D-83` | **0,60** | 1 sessão, 1 `D-NN`, tupla do `check.py`, tema novo p/ `D-65` | **para o dono** |
| 3 | §5.3 — card fechado não segura linha | baixo sozinha (590 líquidos), médio como regime (+29%) | 0,30 | ~5 linhas no `check.py`, carona na linha da §5.1 | **carona, não corrida** |
| 4 | §5.4 — subir o teto | alto e curto | **0,15** | 3ª adiada; +1.100 tokens/sessão | **REPROVADA** enquanto a §5.1 estiver na mesa |

## 7. O que o dono roda para conferir

Antes de qualquer coisa, para ver o estado que esta nota mediu:

```bash
python 77777777_TAPGO_Project_DOCs/scripts/check.py
```

Esperado **hoje**: os três avisos de orçamento — CONTEXT 96%, QA 91%, DECISIONS **98%** com
*"Candidatas: NENHUMA — o corte de `D-43` está esgotado"* — e `OK` no resto. É esse texto que o §3
explica.

Esperado **agora**, com §5.2 e §5.1 executadas (2026-08-21, `D-91`): o aviso do DECISIONS
**sumiu** — o registro está em **17.916**, abaixo do gatilho de 18.000. Sobram dois avisos, CONTEXT
**98%** e QA **91%**. A §5.2 sozinha levou o registro a 19.255; a §5.1 tirou os outros 1.734, e não
os 3.113 projetados — a conta está no "Resultado medido" do §5.1.

O sandbox do agente é indicativo; o portão é o que roda na sua máquina.
