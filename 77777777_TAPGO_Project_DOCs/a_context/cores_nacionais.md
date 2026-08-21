---
tags: [tema, m7, cor]
status: atual
---
# As 32 cores nacionais — a tabela, e o que a medição fez com ela (`P-6`(b) / `T-29`)

> **Nada aqui está no código.** Esta é a tabela **proposta** pela sessão de 2026-08-21, e ela é
> **DADO revisado pelo dono** — foi assim que `P-6` a travou, e é a regra 5 do kit: cor nacional
> não é derivável do catálogo, do código ISO nem da bandeira. Enquanto `Q-16` não fechar, o
> `marcaSelecao` segue com o hash de `T-10` e nenhum byte de produção mudou.

## O que a sessão foi fazer, e o que ela achou

O card mandava: montar a tabela das 32, passar **cada cor** pelo teste de contraste de `T-20`, e
devolver ao dono a que reprovasse. Os três resultados, na ordem em que mudam a decisão:

1. **O contraste não reprova ninguém — e não reprovaria nunca.** Varredura dos **360** matizes:
   o pior par texto/disco é `h=240`, a **7,28:1** contra o limite de 4,5:1. O motivo é estrutural:
   saturação e luminosidade são fixas por papel (`hsl(h 75% 82%)` sobre `hsl(h 40% 22%)` na
   `.marca`; `hsl(h 72% 52%)` na camisa de `sprites.ts`), e o matiz **não é o canal que decide a
   razão de contraste**. O portão que `P-6` ergueu para proteger a paleta é, para uma tabela de
   matizes, um portão que não pode fechar. Ele continua valendo — só não é ele que barra nada aqui.
2. **Duas seleções não têm matiz, e essas voltam ao dono:** `GB-ENG` (branco) e `DE` (branco/preto).
   Branco e preto não são um ângulo no círculo de matiz. Não escolhi cor para elas.
3. **A tabela NÃO fecha `QA-20` — ela piora o número, e isso derruba a premissa do card.** É o
   achado que trava a implementação, e está medido logo abaixo.

## O número que derruba a premissa

`P-6` dizia, e o texto está lá: *"tabela curada não colide por construção"*. Falso, e o motivo não
é a curadoria — é o mundo. **Quatorze** das 32 seleções têm vermelho como cor nacional.

| | tabela proposta | hash de hoje (`T-10`) |
|---|---|---|
| matizes distintos | **15** (para 30 seleções; 2 sem matiz) | **30** (para 32) |
| pares abaixo dos 40° de `SEPARACAO_MINIMA` | **144 de 435 — 33,1%** | 101 de 496 — 20,4% |
| seleções em ao menos uma colisão | **30 de 30** | — |

Ou seja: trocar o hash pela tabela **dobra** a chance de duas camisas nascerem confundíveis. O
`matizDistinto` de `sprites.ts` continuaria salvando cada disputa — mandando o lado B para o
oposto —, e é aí que a troca se morde: em Espanha × Portugal uma das duas camisas deixaria de ser
vermelha para virar ciano. O pedido do dono era o contrário disso.

## A tabela proposta (32 linhas)

`matiz` em grau. **Base** diz de onde a cor vem, e as duas classes não têm o mesmo risco:
`bandeira` é conferível no SVG que já está no repositório (`T-19`/`D-54`); `esporte` é identidade
esportiva que **não está na bandeira** — são as linhas mais prováveis de o dono corrigir.

| # | Código | Seleção | Cor proposta | Matiz | Base | Contraste disco |
|---|---|---|---|---|---|---|
| 1 | `ES` | Espanha | vermelho | 0 | bandeira | 7,32 ✔ |
| 2 | `AR` | Argentina | celeste | 200 | esporte | 7,56 ✔ |
| 3 | `FR` | França | azul | 220 | bandeira | 7,53 ✔ |
| 4 | `GB-ENG` | Inglaterra | branco | — | esporte | **sem matiz** |
| 5 | `BR` | Brasil | amarelo | 48 | bandeira | 7,52 ✔ |
| 6 | `MA` | Marrocos | vermelho | 355 | bandeira | 7,33 ✔ |
| 7 | `PT` | Portugal | vermelho-escuro | 350 | bandeira | 7,34 ✔ |
| 8 | `BE` | Bélgica | vermelho | 0 | bandeira | 7,32 ✔ |
| 9 | `NL` | Holanda | laranja | 24 | esporte | 7,53 ✔ |
| 10 | `MX` | México | verde | 145 | bandeira | 7,44 ✔ |
| 11 | `CO` | Colômbia | amarelo | 45 | bandeira | 7,57 ✔ |
| 12 | `DE` | Alemanha | branco/preto | — | esporte | **sem matiz** |
| 13 | `HR` | Croácia | vermelho | 0 | bandeira | 7,32 ✔ |
| 14 | `CH` | Suíça | vermelho | 0 | bandeira | 7,32 ✔ |
| 15 | `IT` | Itália | azul | 215 | esporte | 7,58 ✔ |
| 16 | `US` | Estados Unidos | azul | 225 | bandeira | 7,50 ✔ |
| 17 | `JP` | Japão | azul | 230 | esporte | 7,44 ✔ |
| 18 | `SN` | Senegal | verde | 150 | bandeira | 7,44 ✔ |
| 19 | `NO` | Noruega | vermelho | 0 | bandeira | 7,32 ✔ |
| 20 | `UY` | Uruguai | celeste | 200 | esporte | 7,56 ✔ |
| 21 | `DK` | Dinamarca | vermelho | 0 | bandeira | 7,32 ✔ |
| 22 | `IR` | Irã | verde | 150 | bandeira | 7,44 ✔ |
| 23 | `AT` | Áustria | vermelho | 0 | bandeira | 7,32 ✔ |
| 24 | `EG` | Egito | vermelho | 0 | bandeira | 7,32 ✔ |
| 25 | `EC` | Equador | amarelo | 48 | bandeira | 7,52 ✔ |
| 26 | `NG` | Nigéria | verde | 140 | bandeira | 7,43 ✔ |
| 27 | `TR` | Turquia | vermelho | 0 | bandeira | 7,32 ✔ |
| 28 | `AU` | Austrália | dourado | 45 | esporte | 7,57 ✔ |
| 29 | `DZ` | Argélia | verde | 150 | bandeira | 7,44 ✔ |
| 30 | `CA` | Canadá | vermelho | 0 | bandeira | 7,32 ✔ |
| 31 | `CI` | Costa do Marfim | laranja | 25 | bandeira | 7,59 ✔ |
| 32 | `KR` | Coreia do Sul | vermelho | 0 | bandeira | 7,32 ✔ |

**Licença conferida antes da tabela:** [[licenciamento]] lista "Cores nacionais e padrões
genéricos (listras, faixas)" como **livre**, com a condição de não reproduzir uniforme oficial
identificável. Cor chapada na camisa do sprite é cor, não uniforme — não há escudo, gola,
patrocínio nem listra exata. Nenhuma linha desta tabela nomeia clube, competição ou pessoa.

## Um achado de medição que NÃO virou portão, e por que

Medi também a camisa contra o gramado, e o resultado **não discrimina**: pela razão de contraste
WCAG, 29 das 30 camisas propostas ficam abaixo de 1,6:1 contra as quatro faixas de
`cena.ts:211-216` — mas **26 das 32 de hoje também ficam**. A razão de luminância não enxerga
matiz, e é matiz o que separa um boneco do gramado. Pelo critério que o próprio projeto já usa
(`SEPARACAO_MINIMA = 40`, contra o matiz médio do gramado, **126,7°**), a conta muda de figura:

- **tabela proposta:** 5 de 30 dentro dos 40° — `MX`, `SN`, `IR`, `NG`, `DZ` (as cinco verdes)
- **hash de hoje:** 7 de 32 — `ES`, `FR`, `NL`, `DE`, `CH`, `US`, `CA`

A tabela é **ligeiramente melhor** aqui, então isto não é argumento contra ela. Fica registrado
porque as cinco verdes são um caso novo e nomeável: camisa verde em gramado verde, sempre, para
aquelas cinco seleções — o hash acertava nisso por acaso, e a tabela erraria por escolha.

## E `QA-20`? Ele já estava morto no disco, e ninguém tinha notado

`QA-20` descreve o defeito assim: *"os discos delas saem idênticos na grade"*. **Isso não acontece
mais desde `T-19`.** Com as 32 bandeiras entregues, `.marca--bandeira` (`estilo.css:426`) sobrescreve
`background` e `border-color` do matiz e a `<img>` cobre 100% do disco — o matiz fica **invisível**
na marca. O único ramo que ainda o mostra é o estado de erro (arquivo que não carrega volta a ser
o código ISO), e lá o contraste é 7,3:1 em qualquer matiz.

O que sobra de `QA-20` é o **campo**, e o campo já tem conserto: `matizDistinto`, local à disputa.
Fechar `QA-20` não depende desta tabela — depende de alguém escrever isto, e está escrito.

## As três saídas, e a recomendação

- **(A) Tabela fiel, `matizDistinto` continua.** Barata: troca o hash pela tabela e mais nada.
  **Custo:** em ~33% das disputas um dos dois lados sai da cor nacional — e é nos confrontos mais
  icônicos, porque são os vermelhos que colidem. Não fecha `QA-20`; piora o número dele.
- **(B) Tabela fiel + 2º canal de PADRÃO na camisa** (liso · listra vertical · faixa horizontal),
  que [[licenciamento]] libera explicitamente. Vermelho liso ≠ vermelho listrado ≠ vermelho com
  faixa: as duas camisas ficam distintas **sem sair da cor nacional**, e a marca passa a ser o par
  (cor, padrão), injetor por construção — 15 cores × 3 padrões dá 45 lugares para 32 seleções.
  **Custo:** papel novo no `ALFABETO` de `sprites.ts` e os 4 sprites redesenhados. É card maior.
- **(C) Não trocar o hash.** `QA-20` fecha pelo parágrafo acima (a bandeira já apagou o defeito no
  disco), e a cor nacional simplesmente não entra. Custo zero, e o pedido do dono não é atendido.

**Recomendação da sessão: (B)** — é a única que entrega o pedido inteiro (*"jogadores seguindo as
cores corretas dos países"*) sem trocar um defeito por outro maior. **(A) é a que eu não
recomendo**, e é justamente a que o card presumia ser a resposta.

Seja qual for a escolha, **(C) vale de imediato para o `QA-20`**: o defeito que ele descreve não
está mais na tela, e isso independe de `Q-16`.
