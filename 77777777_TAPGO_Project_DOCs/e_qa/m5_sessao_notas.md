---
tags: [notas, m5]
status: arquivado
---
# M5 — notas de T-09 e T-13 (evidência longa de `D-24`..`D-26`, `D-35`, `D-36`, `Q-09` e `Q-11`)

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

- **`mode: 'online'`** — ~~é T-13, bloqueada por `A-05` (`Q-04`)~~. **Caducou em T-13** (2026-08-08):
  o modo existe e a recusa saiu. O resto do parágrafo continua valendo como o motivo de nunca
  degradar calado. A alternativa tentadora era cair
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

## `D-35` — o peer some no meio: por que "sem resultado" e não "quem fica vence"

`Q-04` foi respondida pelo dono em 2026-08-08, na abertura de T-13: a disputa **morre sem
vencedor**. O que isso significa em código é menos do que parece, e é esse o ponto.

M5 **não escreve resultado nenhum**. `winner` continua `null` e `phase` continua onde estava,
porque nenhuma cobrança os produziu. O que a resposta liga é uma trava: com o canal em `'failed'`,
`choose()` passa a recusar em voz alta ("terminou SEM RESULTADO"), e as escolhas represadas são
soltas — elas pertenciam a uma cobrança que nunca vai fechar.

As outras duas saídas custavam uma sessão a mais e mexiam noutro módulo. "Quem fica vence" e
"vale o placar do momento" são **regra de disputa**: `MatchState` só chega a `finished` por
cobrança, então M2 precisaria de uma entrada nova (um `forfeit`) e `regras_partida.md` de uma
linha nova — trabalho de `backend-dominio`, não desta camada. A saída escolhida fecha T-13 sem
tocar em M2, e é coerente com o escopo que [[online_p2p]] já declarava: jogo casual entre amigos,
sem ranking e sem prêmio. Com 15-30% dos jogadores atrás de CGNAT, "quem cai perde" também
transformaria queda de 4G em derrota registrada.

Se um dia existir ranking, isto volta à mesa junto com a decisão de anti-trapaça — e aí é `D-NN`
novo, porque a escolha some com o argumento "não há nada em jogo".

## `D-36` — notificação de rede não propaga exceção de assinante

`notify()` de M5 chama todos os assinantes mesmo que um exploda, e no fim relança a primeira
falha: assinante que lança é defeito de M7, e engoli-lo seria `catch` mentiroso.

Isso vale quando existe um chamador para receber a exceção — `choose()`, chamado pela tela. Não
vale quando a notificação nasce de um evento de rede: ali a pilha é de **M6**, no meio do laço de
handlers de status ou do `onMessage` da sinalização. Uma exceção subindo dali interrompe o laço e
deixa a máquina de estados do transporte pela metade — um assinante quebrado da tela passaria a
corromper o canal.

Então: `choose()` propaga, `aoStatus`/`aoMove` logam com origem e contexto (`console.error`) e
morrem ali. Não é `catch` silencioso — é o erro chegando ao console em vez de chegar a um lugar
onde faria estrago. O que não existe em nenhum dos dois caminhos é fallback: nada inventa estado
para "recuperar".

## `Q-11` — o `roomId` do anfitrião não tem por onde sair de M5

Aparece assim que o online precisa de tela: quem hospeda gera um ID de sala e precisa dele para
montar o link de convite. Mas a porta de `Session` está congelada em `D-13` com quatro métodos, e
nenhum devolve o ID; e M7 não pode importar `src/net` — o portão de camada exige `grep` zero.
Então, hoje, o ID que `hostRoom()` sorteia fica dentro de M5 e ninguém o alcança.

T-13 **não contornou isso**: implementou `roomId` ausente ⇒ este aparelho hospeda, `roomId`
presente ⇒ entra na sala. Nenhum quinto método apareceu na porta por conta do agente.

Duas saídas, as duas mexendo em contrato congelado e portanto `D-NN` do dono:

1. **M5 reexporta `newRoomId`** — M7 sorteia o ID, monta o link e **sempre** passa `roomId`. A
   porta `Session` não muda; o que muda é o módulo ganhar um export de valor. O portão de camada
   de M7 continua verde, porque o import passa a ser de `src/session`.
2. **`Session` ganha `roomId(): string | null`** — mais direto de usar na tela, mas é o quinto
   método na interface congelada, e abre precedente para o sexto (`Q-09` já pedia `pending()`).

O teste de T-13 contorna lendo o ID do duplo de sinalização. É recurso de teste, e está comentado
como tal no arquivo: a tela, em produção, não tem esse caminho.

**FECHADA em 2026-08-19 por `D-73`: saída (1).** O que a decisão acrescentou às duas saídas
descritas acima é evidência colhida no disco, não preferência:

- A saída (1) é a forma que **já rodou em campo**. `src/medicao.ts` sorteia o ID antes da sala,
  monta o link e faz os DOIS lados entrarem por `joinRoom` (`D-38`) — os 17/17 de `A-08` saíram
  dessa forma. A única diferença é que a medição obtém o ID chamando `hostRoom()` e **fechando o
  canal na hora** (`src/medicao.ts`, botão "Sortear sala"); com `newRoomId` reexportado, esse
  descarte deixa de ser necessário.
- Ela **não** reabre o que `D-40` fechou: `newRoomId` só sorteia, e já é exportado por M6 de
  propósito (o portão do defeito 6 precisa de milhares de sorteios sem abrir canal). Quem valida
  o ID continua sendo `joinRoom`, na entrada.
- O portão de camada de M7 continua verde, e isso foi **conferido contra o padrão real** do CI
  (`/^[ 	]*(import|export)[^;]*(engine|cpu|net)/`, copiado em `src/tests/ui.test.ts`):
  `import { newRoomId } from '../session/index';` não casa.
- A saída (2) perdeu por dois custos, não por um. O 5º método na interface congelada é o
  precedente que `D-39` recusou comprar — e `Q-09` (`pending()`) seria o 6º. E ela só entrega o
  ID **depois** de `createSession`, isto é, depois de `armarTimer()` ter armado o relógio de 20 s
  dentro de `createChannel`: o anfitrião passaria a ter 20 s para mandar o link e o convidado
  abri-lo. Isso é `QA-22`, e vale para as duas saídas — a (1) só devolve a M7 o controle de
  **quando** o relógio começa.
- O ramo `cfg.roomId === undefined ⇒ hostRoom().channel` (`src/session/index.ts`) **fica onde
  está**. Torná-lo impossível exigiria `roomId` obrigatório no modo `online`, o que é mudar
  `SessionConfig` — porta de `D-13`, e não era o que a saída (1) pedia.

## `D-73` — por que a saída (1), e o que a (2) custaria

Íntegra da evidência de `D-73`, movida do registro pelo corte de [[registro_no_teto]] §5.1.

**A adotada já rodou em campo.** `src/medicao.ts` sorteia o ID **antes** da sala e os dois lados
entram por `joinRoom` (`D-38`) — os **17/17** de `A-08` saíram dessa forma. E `newRoomId` já é
exportado por M6 de propósito, então nada da superfície que `D-40` fechou se reabre.

**A saída (2)** (`roomId()` na porta `Session`) custaria o **5º método** numa interface congelada —
o precedente que `D-39` recusou comprar, e que `Q-09` herdaria. Pior: entregaria o ID **depois** do
canal, logo depois de o relógio de **20 s** já ter armado (`QA-22`).

**Custo completo da adotada:** 1 linha de export em `src/session/index.ts`, **zero byte** em
`src/net`, e bundle inalterado até `T-21` existir.
