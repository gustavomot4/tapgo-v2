---
tags: [qa, nota]
status: atual
---

# `QA-36` — o símbolo do papel é branco, e as linhas do campo também

> Achado de **campo**, devolvido pelo dono em `A-36` junto com o inteiro que fechou `T-30`.
> A linha viva está em [[d_qa|QA]]; aqui ficam a medida e as saídas, por `D-83`.

## O que o dono relatou

Os quatro dedos vieram certos e as duas silhuetas se leem — `T-30` passou no portão. Mas, nas
palavras dele: *"está difícil de ver porque tem linhas brancas e atrapalha a bola"*, e ele pediu
**cor nos símbolos** e **cuidado com onde eles ficam**.

## A causa, lida do código (não é palpite)

`src/ui/estilo.css:719` — `.zona` declara `color: var(--texto)`, e `--texto` é **`#eef2f9`**
(`:41`). As duas regras de símbolo (`:787` e `:798`) pintam **todas** as camadas com
`background: currentColor`. Ou seja: **o símbolo é branco**, nos dois papéis.

`src/ui/cena.ts` desenha o campo em 360x260 e as marcações em **`0xf4faf5`**:

| Marcação | Onde | Alfa |
|---|---|---|
| Linha de fundo, largura inteira, 3px | `y = 152` | 0,90 |
| Travessão e os dois postes | `y = 56..152` | 1,00 |
| Grande área — horizontal, `x = 16..344`, 3px | `y = 198` | 0,90 |
| Grande área — as duas verticais, 3px | `x = 16` e `x = 341`, `y = 198..258` | 0,90 |
| Marca do pênalti, raio 3 | `(180, 244)` | 0,95 |
| Malha da rede, `0xe8f2ea` (o único que não é `0xf4faf5`) | dentro da boca, `y = 62..152` | 0,45 |

**`#eef2f9` contra `#f4faf5`** é diferença de 6, 8 e −4 por canal. Não são duas cores: é o mesmo
branco. Um disco cheio de 24px desse branco por cima de uma linha desse branco não tem borda —
é o que o dono está vendo.

**Onde o símbolo cai.** `.zonas` é `inset: 0` sobre o `.campo` inteiro (`aspect-ratio: 36/26`, os
mesmos 360x260), três colunas com `gap` e `padding` de 4px; `.zona` é `justify-content: flex-end`
com `padding: 8px 4px` e `gap: 6px`. O símbolo mora, portanto, na **faixa de baixo** da zona —
a mesma banda onde correm a horizontal da grande área e as duas verticais das zonas laterais.

> **Declarado:** essa última medida é geometria **derivada da fonte**, não lida de um quadro
> composto — o sandbox tem `visibilityState` em `hidden`. A prova de campo é o relato do dono.

## O que a cor de papel faz hoje

`--acento` e `--atencao` estão só na **borda** da zona (`:784` e `:795`), a 55% de alfa. O canal
de cor de `T-28` existe, mas nunca chegou ao símbolo. O comentário da folha (`:744`) descreve
isso com precisão — "bola + **borda** em `--acento`" —, então não há contradição entre código e
comentário: há uma escolha que o campo agora reprovou.

## Saídas, com o preço de cada uma

**(a) Pintar o símbolo com a cor do papel** — `--acento` no disco, `--atencao` na luva. Não é cor
nova na paleta (são as duas de `T-28`, que o teste cartesiano de `T-20` já mede), então não
custa a medição de contraste de novo. **Preço:** mata o `currentColor`, e com ele o `[disabled]`
de graça (ver a armadilha abaixo).

**(b) Contorno ou sombra escura por baixo**, mantendo `currentColor`. Separa do branco sem tocar
na cor nem no `[disabled]`. **Preço:** a luva são três camadas de `background`, e `box-shadow`
não contorna desenho de gradiente — o contorno teria de ser uma quarta camada, ou um `filter:
drop-shadow()`, que aí sim recorta a silhueta toda de uma vez.

**(c) Mover o símbolo para fora da banda das linhas** — subir do `flex-end` para uma faixa mais
alta da zona. **Preço:** o rótulo e o símbolo deixam de ser um par colado, e a área do gol tem
travessão e postes em branco **sólido** (alfa 1,00), que é pior que as linhas de alfa 0,90.

**(a) + (b) juntas** é o que eu recomendaria a quem implementar, mas a escolha é da sessão de
código com o número medido, não desta.

## As duas armadilhas que a sessão de código não pode pagar sem ver

1. **`[disabled]` é de graça hoje por causa de `currentColor`.** `T-30` mediu: com o botão
   travado `color` vira `rgba(0, 0, 0, 0)` e **todas** as paradas dos três gradientes viram
   transparente junto. Cor fixa no símbolo quebra isso em silêncio — precisa de regra explícita
   **e** de teste, porque hoje nenhum teste falharia.
2. **Forma continua sendo o segundo canal (`T-28`).** Pôr cor no símbolo é somar canal, nunca
   trocar: se a distinção entre disco e luva passar a depender de cor, o card regride. O dono já
   confirmou em `A-36` que as duas silhuetas se leem — é isso que não pode ser perdido.

## O que este achado NÃO é

Não é regressão de `T-30`. O triângulo e o arco de `T-28` eram do mesmo `--texto` branco e
corriam a mesma banda: o defeito é de `T-28` e apenas **ficou visível** quando a silhueta virou
um disco cheio de 24px, que tem muito mais área branca do que um triângulo sólido de 18x13.

## O que `T-33` fez com isto (2026-08-21)

Escolheu **(a)+(b)** e descartou (c) com motivo: a faixa de cima da zona tem travessão e postes em
branco **sólido** (alfa 1,00), pior que as linhas de alfa 0,90, e o símbolo deixaria de encostar no
rótulo que legenda.

- **(a)** `color: var(--acento)` no disco e `color: var(--atencao)` na luva, **dentro** das regras de
  papel. O `background: currentColor` de `T-30` não mudou — mudou de onde `currentColor` vem, e por
  isso as silhuetas aprovadas em `A-36` estão intactas.
- **(b)** `filter: drop-shadow(0 0 1.5px rgb(0 0 0 / 95%)) drop-shadow(0 1px 2px rgb(0 0 0 / 70%))`
  em `.zona::before`. `filter` e não `box-shadow`: `box-shadow` contorna a CAIXA e deixaria os
  quatro dedos sem borda; `drop-shadow` segue o alfa composto e contorna o vão entre eles.
- **A armadilha 1 foi paga:** `.zona[disabled][data-papel]::before { color: transparent }`, que vence
  as regras de papel por especificidade (3 contra 2) e não por ordem, mais três testes novos.
- **A armadilha 2 continua honrada:** cor é canal SOMADO — disco cheio contra luva de quatro dedos
  segue distinguindo os papéis sem ler cor nenhuma.

## O campo respondeu, e `QA-36` FECHA (2026-08-21, `A-37`)

O portão pedia quantas das três bolas têm a borda inteira, sem linha branca comendo um pedaço.
**Veio `3`** — nas três zonas. O halo de 1,5px sobreviveu ao pixel físico do monitor do dono, e a
cor de papel não precisou do reforço que `0` ou `1` teriam exigido; `2` teria apontado uma zona e
uma linha de alfa específico, e não há zona a apontar.

- **A armadilha 1 se confirma no navegador real:** com uma zona tocada, as outras duas travam e o
  símbolo delas **some por completo** — sem fantasma escuro. A regra de `[disabled]` vence as duas
  de papel por especificidade de fato, e `filter` não projeta halo sobre alfa composto zero.
- **A saída (c) nunca precisou ser tentada** — a (a)+(b) passou no primeiro campo.
- **LACUNA DECLARADA, a mesma de antes:** a **luva** segue sem medição direta em campo. `A-37` a
  excluiu do portão com motivo (o disco CHEIO é o pior caso, e ela é vazada) e o dono não falou
  dela. Não é lacuna nova; é esta, registrada.
