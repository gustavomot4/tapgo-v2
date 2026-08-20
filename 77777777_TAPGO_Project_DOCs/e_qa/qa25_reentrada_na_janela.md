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

O discriminador já chega no fio de graça — `seq=0` contra `kicks.length>0` — e **não é à prova de
bala**: o comentário de `aoMove` registra que `seq` menor também é reenvio legítimo da fila de M6,
que é seguro de repetir justamente porque morre ali. Distinguir "reenvio velho" de "peer novo"
sem um identificador de sessão no fio é a pergunta aberta, e pôr identificador no fio custa um
segundo tipo de payload, que `isMove` (`net/index.ts:370`) hoje descarta alto e logado.

**Lacuna declarada:** ninguém mediu se o reenvio de fila chega a produzir `seq=0` numa disputa já
em andamento. Sem esse número, a saída barata (tratar `seq=0` pós-conexão como abandono) é
palpite, não conserto.
