---
tags: [qa, nota]
status: atual
---
# `QA-25` — a reentrada dentro da janela de 20 s

> Nota de evidência de `QA-25`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> **Fechado por `D-80`** (porta M5) em 2026-08-20 — a seção final registra o que entrou e o que
> segue declarado de fora. O que vem antes dela é a evidência que levou à decisão, íntegra.

## O mecanismo, lido do disco

| onde | o que faz hoje |
|---|---|
| `src/net/index.ts:390` | `onPeerLeave` emite `'waiting'` e **rearma** os 20 s |
| `src/net/index.ts:379` | `onPeerJoin` guarda só `'closed'`/`'failed'`; em `'waiting'` **aceita** e emite `'connected'` |
| `src/session/index.ts:313` | `aoStatus` só aciona `D-35` em `'failed'`; `'waiting'` passa direto |
| `src/ui/tela_cobranca.ts:395` | pinta "O outro jogador saiu" só em `'failed'` — M5 repassa o `LinkStatus` cru, e M7 nunca ouviu falar de `'waiting'` |

Fora da janela o sistema está correto: aos 20 s o timer converte em `'failed'`, `D-35` chega à
tela e o placar não vira vitória — **medido em campo em `A-22`**.

## Duas medições de campo que estreitam o espaço de saída

1. **Esperar 20 s sem reabrir o link entrega a mensagem certa** (`A-22`). Então `onPeerLeave`
   dispara: o evento existe, o que falta é o que acontece ANTES do prazo.
2. **Queda momentânea de rede se recupera sozinha** — aparelho 2 em modo avião ~5 s durante a
   disputa, e ela seguiu. Então o rearme de `D-31` **carrega peso**: matá-lo (a saída barata,
   que fechava o buraco sem tocar M5 nem M7) custaria essa recuperação, que hoje funciona.

A distinção real não é "o peer saiu". É **quem volta**: aba viva com `seq` e placar intactos
(reconectar é certo) × navegador fechado, sessão zerada vestindo o mesmo `roomId` (reconectar é o
defeito). M6 não distingue os dois — para ele ambos chegam como `onPeerJoin`.

## O que a reentrada de fato causa — e o que ela NÃO causa

O guarda de `aoMove` é igualdade exata: `if (m.seq !== match.kicks.length) return descartar(...)`
(`src/session/index.ts:345`). Com o veterano em `seq=3` e o recém-chegado em `seq=0`, **os dois
lados descartam tudo o que o outro manda**.

- **NÃO há placar mentiroso nem estado corrompido.** As guardas de `D-32`/M5 seguram. A hipótese
  de corrupção que abriu este achado está **refutada pelo código**.
- **Há travamento permanente:** o canal está `'connected'`, o timer foi limpo por `onPeerJoin`, e
  nada mais emite `'failed'`. Os dois ficam em "Esperando o outro jogador…" para sempre, com
  placares divergentes na tela e só "Sair da disputa" como saída.

Isso mantém a severidade ALTO, mas **por outro motivo**: o docstring de M6 diz que tela travada
sem explicação é o que o PLANO proibiu para o módulo. É essa proibição que a janela viola.

## Consequência para o conserto (não é decisão, é o que o dado permite)

Reconciliar estado para **evitar corrupção** é desnecessário: as guardas já evitam. O que falta é
o lado preso **descobrir** que quem voltou é sessão nova, e cair em `D-35`.

O discriminador já chega no fio de graça — `seq=0` contra `kicks.length>0`. O comentário de
`aoMove` registra que `seq` menor "é reenvio legítimo da fila de M6", e era ISSO que tornava o
discriminador suspeito. **Medido, e o reenvio está descartado como fonte** (abaixo). O que sobra
em aberto é pôr identificador de sessão no fio, que custa um segundo tipo de payload — `isMove`
(`net/index.ts:370`) hoje descarta alto e logado o que não for `Move`.

## A lacuna, medida (2026-08-20) — `escoarFila` não é fonte de `seq=0`

A pergunta era: *o reenvio da fila de M6 chega a entregar a M5 um `seq=0` numa disputa já em
andamento?* **Não chega.** Três fatos de código, cada um com teste que reprova se o fato cair:

| fato | onde se lê | teste (`src/tests/net.test.ts`) |
|---|---|---|
| `escoarFila` consome com `shift`: o que escoou some da fila | `net/index.ts:407` | "o segundo escoamento não repete a jogada" |
| com o canal `'connected'`, `send` nem passa pela fila | `net/index.ts:441` | "não há `seq=0` guardado para depois" |
| a fila só anda para a frente: escoa o represado DEPOIS da queda | `net/index.ts:445` | "só o que foi represado DEPOIS da queda" |

E a medição ponta a ponta, nos dois aparelhos do duplo (`session_online.test.ts` — "a fila
escoada na reentrada chega EM DIA"): queda só do lado do anfitrião, ele anda uma cobrança
sozinho, o convidado fica para trás, e a reentrada escoa. **Toda jogada que chegou ao convidado
chegou com o `kicks.length` dele batendo** — nenhum `seq=0` com a disputa andada.

O argumento fechado: um lado só passa da cobrança N consumindo o `seq=N` do outro, e a fila
entrega esse `seq=N` **uma vez só**. Logo "peer com `kicks.length>0`" e "`seq=0` ainda por
escoar" são estados mutuamente exclusivos. A fila entrega jogada **atrasada**, nunca **velha**.

Falsificação conferida: com `escoarFila` mutado para reenviar o histórico (a hipótese literal do
comentário), **os 4 testes de medição reprovam**. Não são testes que passariam de qualquer jeito.

**O que continua verdade, e é o outro teste desta rodada:** sessão nova vestindo o mesmo `roomId`
manda `seq=0` contra `kicks.length=1`, M5 descarta "fora de ordem", o canal fica `'connected'` e
nem 120 s depois alguém emite `'failed'`. A trava é essa, e sustenta o ALTO.

**Portanto:** dentro de um canal, `seq=0` depois de `onPeerJoin` com `kicks.length>0` **só** pode
vir de sessão zerada. O discriminador barato deixou de ser palpite. O que ele NÃO cobre segue
declarado: cliente modificado (que mentiria em qualquer identificador, inclusive num de sessão),
e o inverso — sessão nova que reentra ANTES de qualquer cobrança fechar é indistinguível de
reconexão legítima, e nesse caso não há divergência a detectar.

**A saída continua sendo `D-NN` do dono** (regra 6): esta medição tira uma opção da lista de
palpites, não escolhe entre elas.

## As portas vivas, com o portão escrito ANTES do experimento (2026-08-20)

A medição acima não escolhe: ela **tira opções da mesa**. Duas saíram por `D-78` e `D-79`; o que
resta são duas portas e a de não mexer. O portão abaixo vale para as duas, e o extra é por porta.

**Portão comum (5 itens).** (1) O lado preso recebe `'failed'` no **mesmo tick** da chegada do
`seq=0`, sem esperar relógio. (2) O lado que voltou sai da tela travada — hoje ele também fica
preso, porque descarta o `seq=3` do veterano por "fora de ordem". (3) **Nada regride:** os 4
testes de `escoarFila` seguem verdes, e a queda-e-volta que se recupera sozinha (modo avião de
`A-22`, o número que matou `D-78`) continua terminando a disputa. (4) Suíte verde, `tsc` limpo,
bundle relido de `dist/`. (5) Campo, em dois aparelhos: reabrir o link no meio da disputa e os
**dois** saírem da tela travada — sem isso o conserto é de meia tela. Uma mudança por vez: a
porta escolhida entra sozinha, sem carona de `QA-24` nem de `A-21`.

### Porta M5 — `src/session/index.ts` só

M5 lê `m.seq === 0 && match.kicks.length > 0` (a igualdade de `:347` já separa o caso), marca
`abandonada`, **sintetiza** `'failed'` no `link` que M7 já pinta (`tela_cobranca.ts:395`) e chama
`canal.close()`. O item (2) sai de graça: o `leave()` vira `onPeerLeave` no outro lado, que
emite `'waiting'` e rearma os 20 s — e aí `D-35` chega lá também.

- **Custo completo:** guarda + docstring em M5. Zero byte em `src/net` e em `src/ui`, nenhum
  método novo em porta nenhuma, bundle praticamente inalterado, zero migração de dado.
- **O preço que não é código:** `LinkStatus` no vínculo M5→M7 deixa de significar "estado do
  transporte" e passa a significar "estado do **vínculo da disputa**". Isso **tem** de estar
  escrito na porta: a próxima sessão que ler `'failed'` como "M6 desistiu" erra por causa disto.
- **P(passar): 65%** — acima da taxa-base porque a única objeção conhecida (a fila) foi medida e
  caiu, o discriminador chega de graça, e o destino (`D-35`) já existe e já foi visto em campo.

### Porta M6 — `Channel.fail()`, o 5º método

Mesma detecção em M5, mas em vez de sintetizar, M5 pede a M6 que falhe de verdade: `fail()`
público chamando o `falhar()` que já existe (`net/index.ts:310`). `LinkStatus` continua sendo o
que diz ser, e o item (2) sai igual, porque `falhar()` solta a sala.

- **Custo completo:** o 5º método na porta de M6 — parente do precedente que `D-73` recusou
  comprar para `Session`, e que `D-39` recusou antes. `src/net` deixa de ser o "não muda um byte"
  de `D-75`, `net.test.ts` ganha caso de idempotência, e a porta cresce para sempre.
- **P(passar): 25%** — na taxa-base. Compra honestidade de tipo pagando com superfície de porta;
  é a mesma troca que o registro já recusou duas vezes, sem ângulo novo além do conforto.

### Não mexer

- **Custo:** `QA-25` fica ALTO e aberto, com travamento permanente e as duas telas divergentes; e
  a promessa "por link de convite" que `D-72` tirou do Objetivo **não volta**, porque é ela que o
  achado pesa contra.
- **P(passar): 15%** — só se o dono decidir que reabrir o link no meio da disputa é raro o
  bastante para conviver, e aí isso precisa virar lacuna declarada, não silêncio.

## Fechado por `D-80` — a porta M5, implementada em 2026-08-20

O dono declarou `A-23` pela **porta M5**. O que entrou, em `src/session/index.ts` e mais nada:

| onde | o que passou a fazer |
|---|---|
| `aoMove` | `seq=0` com `kicks.length>0` cai em `abandonarPorReentrada()` **antes** do "fora de ordem" |
| `abandonarPorReentrada()` | marca `abandonada`, solta as escolhas represadas, põe `link='failed'` e chama `canal.close()` |
| `aoStatus` | `'failed'` vira **terminal** para M5 — sem isso o `'closed'` do próprio `close()` apagaria o status que M7 pinta |
| `Session.subscribe` | docstring do preço: neste vínculo, `LinkStatus` é o estado da **disputa**, não o do transporte |

**Os 5 itens do portão, um a um.** (1) `'failed'` no mesmo tique do `seq=0`, sem relógio — teste
"portão (1)", que assere **sem** `advanceTimers` entre a escolha e a asserção. (2) O lado que
voltou sai da tela travada: o `close()` solta a sala, o `leave()` vira `onPeerLeave` lá, e os 20 s
rearmados terminam em `'failed'` — teste "portão (2)". (3) Nada regride: os 4 testes de
`escoarFila` seguem verdes em `net.test.ts`, e a queda-e-volta do modo avião de `A-22` **termina a
disputa inteira** sem um `'failed'` — teste "portão (3)", com a disputa jogada até `finished`
contra uma referência do modo `local`. (4) Suíte **563/563**, `tsc` limpo, bundle **415.713 B**
lido de `dist/` pelo `bundle-size.mjs` (+208 B). (5) **Campo em dois aparelhos: `A-24`, do dono.**

**Falsificação conferida:** removida só a guarda de `aoMove`, **5 testes reprovam** (os 4 novos de
`D-80` mais o de `QA-25` que nomeia o descarte). O de regressão do modo avião segue verde sob a
mutação, e isso é o esperado: ele mede o que `D-80` não podia cobrar.

**O que segue declarado e NÃO foi consertado:** cliente modificado (mentiria em qualquer
discriminador — o argumento de `D-79`); sessão nova que reentra ANTES de qualquer cobrança fechar,
indistinguível de reconexão legítima, e onde não há divergência a detectar; e a reentrada em que
o lado que voltou **nunca escolhe** — sem `seq=0` chegando, não há o que detectar, e o veterano
segue esperando até alguém sair. Este último não estava no portão de `A-23`; fica aqui escrito.

## `D-80` — a evidência da linha do registro

Íntegra da evidência de `D-80`, movida do registro pelo corte de [[registro_no_teto]] §5.1.

O discriminador (`seq=0` com `kicks.length>0`) sai **de graça** e já vem medido: `D-78` e `D-79`
morreram com número, não com opinião — as duas medições de campo estão acima nesta nota.

`canal.close()` não é cortesia: é o que tira o **OUTRO** lado da tela travada, pelo caminho que
`A-22` já mediu em campo. Sem ele, quem ficou na disputa antiga continua esperando um peer que não
volta.

Campo em dois aparelhos é `A-24`.
