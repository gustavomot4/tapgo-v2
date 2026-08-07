---
tags: [notas, m7]
status: arquivado
---
# M7 — notas de T-10 (evidência longa de `D-27`, `D-28` e `QA-05`)

> **Este arquivo não define ID.** As decisões vivem em `a_context/c_decisions.md`; aqui fica só a
> evidência que não cabe no teto de 2 frases por linha daquele registro. Nenhuma sessão precisa
> ler esta página para trabalhar — o raciocínio que um implementador usa está nos comentários de
> `src/ui/`, onde ele vai olhar de verdade.

## `D-27` — por que a tela não é Phaser inteira

`D-02` congelou "Phaser 3" e o contrato de M7 se chama "Tela (Phaser)". O portão da skill
`frontend-uiux`, porém, exige três coisas de toda tela do fluxo crítico: **teclado percorrendo o
fluxo, foco visível e rótulo lido por leitor de tela**. `<canvas>` não entrega nenhuma das três —
`Tab` não alcança nada dentro dele, não há anel de foco, e um leitor de tela vê um retângulo vazio.

Os dois portões não fecham juntos em canvas puro. As três saídas possíveis eram:

| Saída | O que custava |
|---|---|
| Phaser em tudo | acessibilidade vira exceção declarada — e exceção de acessibilidade não volta atrás barato |
| DOM em tudo, Phaser adiado | contraria a letra de `D-02`, e a animação da cobrança teria de ser reescrita depois |
| **DOM + Phaser só na cobrança** | a escolhida: nenhum portão cede |

A fronteira ficou assim: **Phaser desenha, o DOM recebe o toque.** As três zonas são `<button>`
posicionados por cima do canvas (`.zonas` em `estilo.css`), com um terço da largura do campo cada
— em 360 px isso passa de 110 px por alvo, contra o mínimo de 48. Dedo e teclado usam o mesmo
elemento, então não existe um segundo caminho de entrada para manter em dia.

`src/ui/cena.ts` é o **único** arquivo do módulo que importa `phaser`, e entra por `import()`
dinâmico. Consequência medida, não estimada:

```
inicial : 80.604 B  (1,01% do teto de 8 MB)   ← Phaser NÃO está aqui
cena-*.js : 1.210.538 B  (333 KB gzip)        ← chega enquanto a pessoa escolhe as seleções
dist/   : 1.291.994 B
```

O aquecimento é pedido pela tela de seleções (`Contexto.aquecerCena`), não pela de cobrança: assim
a espera cai no intervalo em que a pessoa já está ocupada escolhendo.

**Se o `import()` falhar, a disputa continua jogável.** Os botões são DOM e não dependem do canvas;
o que aparece é "Campo simplificado — o jogo continua igual", sem nada técnico na tela. É o que
impede um pacote que não chegou de derrubar o modo local junto.

## `Q-09` — a derivação que T-10 consumiu, e o que ela ainda não resolve

`Q-09` continua **aberta**: resolvê-la de vez é `pending(): Side | null` na `Session`, e a porta de
M5 está congelada, logo é `D-NN` do dono. T-10 usou a derivação que a própria `Q-09` prescreve e
que o teste de T-09 fixou — **notificação com o mesmo `kicks.length` da anterior significa escolha
pendente** — isolada em `src/ui/derivacao.ts`, que é módulo puro e tem teste próprio.

O que a derivação **não** faz: guardar a zona escolhida. No modo `local` os dois jogadores olham a
mesma tela, e uma zona destacada enquanto o goleiro escolhe tornaria o modo injogável. A zona fica
dentro de M5, onde já estava; a tela só recebe "há escolha pendente" e mostra "passe o aparelho".

Quando `Q-09` for respondida, o arquivo a mudar é um só, e o teste dele já descreve o
comportamento esperado.

## `D-28` — por que o áudio é gerado por script

O portão de licença de M7 é a tabela de procedência de [[licenciamento]], e a diferença entre
"declarei que é autoral" e "é conferível que é autoral" é um script determinístico.
`src/scripts/gen-audio.mjs` gera os três efeitos de senoides e de ruído de um LCG com semente
fixa — sem gerador nativo, sem sample, sem download. Rodar de novo reproduz os mesmos bytes, e a
tabela guarda o SHA-256 de cada um.

Nenhuma imagem entrou em T-10: campo, gol, rede e bola são primitivos de `Graphics`
(`src/ui/cena.ts`), e a identidade de seleção é o código ISO num disco cuja cor sai do próprio
código. Não é bandeira, não imita nenhuma, e sai quando `A-04` entregar as bandeiras de verdade.

## `QA-05` — o portão de marca de M7 não pode retornar zero hoje

O contrato de M7 manda `grep -rniE "fifa|copa do mundo|…"` em `src/` retornar zero. Ele retorna
**6**, todas em `src/tests/teams.test.ts` (T-08), que escreve os termos por extenso para testar
exatamente essa proibição. `src/tests/core.test.ts` já resolvia o mesmo problema montando a agulha
em tempo de execução (`['Math','random'].join('.')`), e o `ui.test.ts` de T-10 seguiu essa
convenção — por isso T-10 não acrescentou nenhuma ocorrência nova.

Corrigir `teams.test.ts` é trocar seis literais por concatenação. Não foi feito de carona porque o
arquivo é de outro dono e a regra 4 manda registrar, não consertar.

## O que T-10 **não** cobriu

- **Fps no celular real.** O gatilho de `D-02` é "< 30 fps no fluxo crítico em 360x640 no celular
  real do dono". O sandbox não mede fps; o número só existe no aparelho, e é do dono.
- **Tela de torneio.** É `T-14`, bloqueada por `A-04` e `A-06`.
- **Modo `online`.** `createSession` o recusa em voz alta; é `T-13`.
- **Bandeiras.** `flag` é `null` em todo o catálogo (`D-22`), e a tela diz isso na abertura em vez
  de fingir que a lacuna não existe.
