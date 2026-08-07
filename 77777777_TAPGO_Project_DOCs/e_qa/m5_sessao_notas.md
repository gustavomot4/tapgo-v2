---
tags: [notas, m5]
status: arquivado
---
# M5 — notas de T-09 (evidência longa de `D-24`, `D-25`, `D-26` e `Q-09`)

> **Este arquivo não define ID.** As decisões vivem em `a_context/c_decisions.md`; aqui fica só a
> evidência que não cabe no teto de 2 frases por linha daquele registro. Nenhuma sessão precisa
> ler esta página para trabalhar — o raciocínio que um implementador usa está nos comentários de
> `src/session/index.ts`, onde ele vai olhar de verdade.

## `D-24` — por que `src/net/index.ts` nasceu numa sessão de M5

A porta que `D-13` congelou para M5 declara, literalmente, `export type { LinkStatus } from '../net'`.
M6 é T-11, em E-4. Sem um `../net` no disco, o portão de T-09 — "os três tipos de fora que a porta
de M5 usa são reexportados por ela" — não era difícil de cumprir: era **impossível**. E o efeito não
parava em T-09: o portão de camada de M7 (`grep` por import de `src/engine`, `src/cpu` ou `src/net`
dentro de `src/ui/` = 0) ficaria impossível de cumprir justamente para `LinkStatus`, já em T-10, que
é a próxima tarefa.

Três saídas foram postas ao dono, que escolheu a primeira:

1. **`src/net/index.ts` só com tipos** — cópia literal do que `D-13` congelou (`LinkStatus`, `Move`,
   `IceConfig`, `Channel`), zero implementação. Nada inventado; T-11 preenche as funções.
2. Entregar M5 sem `LinkStatus` — portão declaradamente parcial, e o problema apenas empurrado
   para T-10.
3. Declarar `LinkStatus` dentro de M5 — inverteria a camada do PLANO (borda = M6, M5) e
   contrariaria a porta congelada.

O que **não** entrou junto, e continua inteiro em T-11: `hostRoom`, `joinRoom`, o relógio de 20 s,
a decisão de TURN e a linha correspondente na tabela de custo de `stack.md`. Um arquivo só de tipo
não alcança host nenhum e por isso não gera linha de custo.

## `D-25` — recusar na criação em vez de degradar

`createSession` recusa quatro coisas antes de existir sessão:

- **`mode: 'online'`** — é T-13, bloqueada por `A-05` (`Q-04`). A alternativa tentadora era cair
  para `local` em silêncio; isso poria dois jogadores em aparelhos diferentes jogando partidas
  separadas, cada um vendo um placar próprio. É exatamente o defeito que o modo online existe para
  não ter, e ele apareceria como "o jogo está estranho", nunca como erro.
- **`level` ausente no modo `cpu`** — preencher com `'medium'` seria dado inventado, e o CONTEXT
  proíbe. Lacuna declarada fica declarada.
- **`level` fora de `cpu` e `roomId` fora de `online`** — campo que a configuração ignora é campo
  que M7 acha que está funcionando. Recusar transforma um mal-entendido silencioso em uma linha
  de erro.
- **Seleção fora do catálogo de M4** — é a única coisa útil que M5 faz com `teams`, já que a porta
  congelada não expõe as seleções em lugar nenhum; é também o que torna real a dependência
  M5 → M4 que o PLANO declara.

**Duas seleções iguais passam de propósito.** Se `BR` contra `BR` é permitido ou não é regra de
disputa, e não há linha em `regras_partida.md` a respeito — decidir isso aqui seria a borda
escrevendo regra de domínio, que é o defeito que a skill `backend-bff` nomeia primeiro.

## `D-26` — a CPU escolhe antes de observar, e `Q-08` sai intacta

Ordem implementada, por cobrança: `cpu.pick(papelDaCpu)` **e só então** `cpu.observe(papelDoHumano, zona)`.

Com a semântica que T-07 entregou — `pick(role)` lê o histograma do **mesmo** papel, que é o que
`Q-08` questiona —, a ordem é hoje **inobservável**: dentro de uma cobrança o humano é observado
num papel e a CPU sorteia no outro, e os dois histogramas são disjuntos. Nenhum teste consegue
distinguir as duas ordens no código atual, e o teste correspondente em `src/tests/session.test.ts`
diz isso com todas as letras em vez de fingir que prova `D-26`.

A ordem está fixada assim mesmo porque ela é a **armadilha** que fecha se `Q-08` for respondida ao
contrário. Se o goleiro passar a ler o histograma `shooter`, observar primeiro faria a CPU sortear
a defesa já sabendo o chute que o humano acabou de dar, na mesma cobrança — vidência, não
dificuldade. Escolhendo antes, M5 fica imune à resposta, e `pick` continua significando o que T-07
escreveu: T-09 não mexeu no índice, não mexeu no teste de isolamento e não fechou `Q-08`.

## `Q-09` — a escolha pendente do modo `local` não é observável pela porta

No modo `local` a mesma sessão recebe **duas** chamadas de `choose()` por cobrança: primeiro o
chute de quem cobra (`MatchState.turn`), depois a defesa do outro lado. Só que `turn` só vira
depois do `play()`, e a porta congelada (`state`, `choose`, `subscribe`, `dispose`) não tem campo
que diga de quem é a vez de **escolher**. M7 precisa disso para escrever "A escolhe o chute" e
depois "B escolhe a defesa" na mesma tela.

O que T-09 fez, sem tocar no contrato congelado: M5 notifica os assinantes **também** quando a
escolha fica pendente. M7 deriva o estado comparando `kicks.length` com o que renderizou por
último — igual ⇒ há escolha pendente ⇒ é a vez do goleiro. Há teste fixando essa sequência
(`[0, 1]` no modo `local` contra `[1, 2]` no modo `cpu`).

A derivação funciona, mas é indireta, e é a tela que paga por ela. Resolver de vez é acrescentar
algo como `pending(): Side | null` à interface `Session` — e isso é mudar contrato congelado em
`D-13`, o que é `D-NN` do dono, não escolha do agente. Decidir antes de T-10.
