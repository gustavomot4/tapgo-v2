---
tags: [qa, nota]
status: atual
---
# `QA-25` — a reentrada dentro da janela de 20 s

> Nota de evidência de `QA-25`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> **Nada aqui é decisão.** A saída é `D-NN` do dono: muda a porta entre M5 e M6.

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
