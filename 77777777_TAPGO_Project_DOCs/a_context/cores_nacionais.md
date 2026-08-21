---
tags: [tema, m7, cor]
status: atual
---
# As 32 cores nacionais — a tabela, e o padrão que a torna legível (`T-29` / `D-88`)

> **Decidido em 2026-08-21.** O dono escolheu a saída **(B)** de `Q-16`, que era a recomendação da
> sessão: cor nacional na camisa **mais** um 2º canal de PADRÃO. `T-29` entregou. Este arquivo é o
> dado — o que está no código é `CORES_NACIONAIS` e `CAMISA_NACIONAL`, em `src/ui/sprites.ts`.
> **Mexer aqui é `D-NN` novo**, nunca efeito colateral de tarefa de arte.

## A regra em uma frase

A camisa em campo é a **cor nacional da seleção**; quando os dois lados de uma disputa têm cores
parecidas demais, o lado B ganha **listras** e **mantém a cor**. Nunca se cede a cor — só o padrão.

## As 8 cores nomeadas

**Uma cor por nome, e essa é a decisão que mais importa.** Doze seleções desta tabela vestem
vermelho, e elas vestem o **mesmo** vermelho — porque vestem mesmo. Inventar doze vermelhos
separados por três pontos de luminosidade seria fingir uma precisão que ninguém enxerga num boneco
de 18 pixels, e ainda fingir que a diferença é dado nacional quando ela seria só minha.

| Nome | HSL | Hex | Distância até o gramado |
|---|---|---|---|
| vermelho | `hsl(0 72% 48%)` | `#d32222` | 192,2 |
| vermelho-escuro | `hsl(350 72% 34%)` | `#95182d` | 154,4 |
| laranja | `hsl(24 85% 55%)` | `#ee792b` | 168,9 |
| amarelo | `hsl(48 85% 55%)` | `#eec72b` | 157,9 |
| verde | `hsl(145 75% 22%)` | `#0e6231` | **72,4** |
| azul | `hsl(222 70% 40%)` | `#1f49ad` | 129,3 |
| celeste | `hsl(200 65% 62%)` | `#5fb3dd` | 120,1 |
| branco | `hsl(0 0% 90%)` | `#e6e6e6` | 194,7 |

**O verde é escuro por medição, não por gosto.** No tom médio (`hsl(145 62% 38%)`) ele ficava a
**29,7** da faixa mais parecida do gramado de `cena.ts` — camisa verde sumindo em campo verde, e
para as **cinco** seleções verdes de uma vez. O hash antigo acertava nisso por acaso; uma tabela
nacional erraria por escolha. Há teste sobre as 4 faixas.

**O `dourado` existiu e foi cortado:** ficava a **38,7** do `amarelo`, abaixo do próprio limiar que
decide "mesma cor". A Austrália entrou em amarelo — um nome a menos e nenhuma perda.

## As 32 seleções

**Base** diz de onde a cor vem, e as duas classes não têm o mesmo risco: `bandeira` é conferível no
SVG que já está no repositório (`T-19`/`D-54`); `esporte` é identidade esportiva que **não está na
bandeira** — são as linhas mais prováveis de precisar de correção um dia.

| # | Código | Seleção | Cor | Base | | # | Código | Seleção | Cor | Base |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ES` | Espanha | vermelho | bandeira | | 17 | `JP` | Japão | azul | esporte |
| 2 | `AR` | Argentina | celeste | esporte | | 18 | `SN` | Senegal | verde | bandeira |
| 3 | `FR` | França | azul | bandeira | | 19 | `NO` | Noruega | vermelho | bandeira |
| 4 | `GB-ENG` | Inglaterra | branco | esporte | | 20 | `UY` | Uruguai | celeste | esporte |
| 5 | `BR` | Brasil | amarelo | bandeira | | 21 | `DK` | Dinamarca | vermelho | bandeira |
| 6 | `MA` | Marrocos | vermelho | bandeira | | 22 | `IR` | Irã | verde | bandeira |
| 7 | `PT` | Portugal | vermelho-escuro | bandeira | | 23 | `AT` | Áustria | vermelho | bandeira |
| 8 | `BE` | Bélgica | vermelho | bandeira | | 24 | `EG` | Egito | vermelho | bandeira |
| 9 | `NL` | Holanda | laranja | esporte | | 25 | `EC` | Equador | amarelo | bandeira |
| 10 | `MX` | México | verde | bandeira | | 26 | `NG` | Nigéria | verde | bandeira |
| 11 | `CO` | Colômbia | amarelo | bandeira | | 27 | `TR` | Turquia | vermelho | bandeira |
| 12 | `DE` | Alemanha | branco | esporte | | 28 | `AU` | Austrália | amarelo | esporte |
| 13 | `HR` | Croácia | vermelho | bandeira | | 29 | `DZ` | Argélia | verde | bandeira |
| 14 | `CH` | Suíça | vermelho | bandeira | | 30 | `CA` | Canadá | vermelho | bandeira |
| 15 | `IT` | Itália | azul | esporte | | 31 | `CI` | Costa do Marfim | laranja | bandeira |
| 16 | `US` | Estados Unidos | azul | bandeira | | 32 | `KR` | Coreia do Sul | vermelho | bandeira |

Grupos: **vermelho** 12 · **verde** 5 · **azul** 4 · **amarelo** 4 · **celeste** 2 · **branco** 2 ·
**laranja** 2 · **vermelho-escuro** 1.

## Como o desempate funciona

`camisasDaDisputa(a, b)` compara as duas cores por **distância no cubo RGB**. Abaixo de
`DISTANCIA_MINIMA = 40` elas são a mesma camisa para quem joga, e o lado B recebe `padrao:
'listras'`. Quem cede é **sempre** o lado B, para o resultado não depender da ordem em que os dois
chegaram.

**O limiar não é chutado.** Medida contra as 8 cores, a menor distância entre cores **diferentes** é
**63,8** (vermelho × vermelho-escuro); entre cores **iguais** é **0** por construção. Qualquer valor
entre 1 e 63 separa os dois casos, e 40 fica no meio — não depende de ajuste fino se uma cor mudar
de tom um dia. Um teste cobra essa folga, e ele reprova se duas cores nomeadas se aproximarem.

A cor da listra sai da **própria camisa**, não de uma tabela: base clara ganha listra escura, base
escura ganha listra clara. Uma regra, zero dado novo, e o resultado é sempre visível porque é a base
que escolhe. O **branco** é o único que cai no ramo escuro — e é o único lugar onde o preto entra no
jogo, o que por acaso deixa a Alemanha listrada de preto contra a Inglaterra.

**Só a camisa (`C`) recebe listra.** Calção e meião ficam lisos: listrar o boneco inteiro num sprite
de 18 pixels vira ruído, e o que precisa ser lido de longe é o tronco.

## O que a saída (A) teria custado — o registro de por que ela morreu

A sessão de 2026-08-21 mediu a saída (A) (tabela fiel + o `matizDistinto` de `T-20`) antes de
qualquer código, e é isso que derrubou a premissa escrita em `P-6` — *"tabela curada não colide por
construção"*, que é **falsa**:

| | tabela como matiz (saída A) | hash de `T-10` |
|---|---|---|
| matizes distintos | **15** (para 30; 2 sem matiz) | **30** (para 32) |
| pares abaixo dos 40° de separação | **144 de 435 — 33,1%** | 101 de 496 — 20,4% |

Ou seja: (A) **dobrava** a chance de duas camisas nascerem confundíveis, e o `matizDistinto` então
"salvava" a disputa jogando o vermelho de Portugal para o ciano — o contrário do pedido. A (B) paga
o mesmo problema com o padrão, e a cor nacional dos **dois** lados sobrevive.

**Um portão que se revelou vazio, e vale ficar escrito:** `P-6` travava o card em "cada cor tem de
passar no teste de contraste de `T-20`". A varredura dos **360** matizes mostrou pior caso de
**7,28:1** contra um limite de 4,5:1 — saturação e luminosidade eram fixas por papel, então o matiz
nunca decidia contraste. O portão não podia reprovar nada. Quem barrava o card era a premissa não
medida, não o portão anunciado.

## Licença

[[licenciamento]] lista "Cores nacionais e padrões genéricos (listras, faixas)" como **livre**, com
a condição de não reproduzir uniforme oficial identificável. Cor chapada e listra genérica num
boneco de 18 pixels são cor e listra: não há escudo, gola, patrocínio nem desenho de uniforme em
lugar nenhum. Nenhuma linha desta tabela nomeia clube, competição ou pessoa. **Zero asset novo** —
nada disso é arquivo, é dado no código.

## O que continua sem medição

Se as listras **se leem** num tronco de 8 pixels de largura a 2,2x de escala é olho humano, e é
`A-32`. O sandbox não desenha o campo: `document.visibilityState` é `hidden` mesmo com a aba
fronteada, `requestAnimationFrame` não dispara, Phaser não renderiza e não há pixel a ler.
