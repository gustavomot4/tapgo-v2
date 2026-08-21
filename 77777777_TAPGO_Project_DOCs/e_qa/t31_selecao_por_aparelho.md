---
tags: [nota, decisao, online]
status: atual
---
# `D-90` — cada aparelho escolhe a própria seleção no online

> Nota de evidência de `D-90`, a decisão de contrato que destrava `T-31`. A linha mora em
> [[c_decisions|DECISIONS]]; aqui fica o que não cabe em 400 caracteres (`D-83`).
> Escrita em sessão de **arquitetura** (`architecture-monolith`): desenha fronteira e porta,
> **não** implementa. Nenhum arquivo de `src/` foi tocado nesta sessão.

## O que existe hoje, lido do disco

| onde | o que faz |
|---|---|
| `src/net/index.ts:60` | `Move { seq, side, zone }` é o **único** tipo que atravessa o fio |
| `src/net/index.ts:188` | `isMove` recusa qualquer payload que não seja isso (`D-32`) |
| `src/net/index.ts` (porta) | `Channel` = `send` · `onMove` · `onStatus` · `close` — 4 métodos, congelados por `D-13` |
| `src/session/index.ts:74` | `SessionConfig.teams: Record<Side, CountryCode>` — as duas seleções nascem com a sessão |
| `src/session/index.ts:91` | `subscribe(fn: (s: MatchState, link: LinkStatus) => void)` — o único empurrão de M5 para M7 |
| `src/ui/tela_selecoes.ts:239` | no `online` **os dois lados** são escolhidos neste aparelho |
| `src/ui/convite.ts:37` | `t=` leva **as duas** seleções no link (`D-77`) |

O que `D-77` consertou foi a **divergência**: sem `t=`, cada aparelho mostrava as suas. O que ele
**não** consertou — e é o pedido do dono de 2026-08-21 — é que o convidado não escolhe nada: ele
recebe o confronto que o anfitrião montou. Os dois aparelhos concordam porque **um** deles decidiu.

## Por que não existe saída de custo zero no fio

A escolha do convidado **nasce depois do link**, e o link é de mão única (anfitrião → convidado).
Não há segundo caminho entre os dois aparelhos além do `DataChannel` de M6. Logo, alguma coisa
tem de viajar — e é por isso que esta é decisão de **contrato**, não de tela.

É também por isso que o argumento que matou `D-79` **não transfere**. Lá, o discriminador de
reconexão já estava no fio de graça (`seq=0` × `kicks.length>0`) e o 2º tipo de payload comprava
o que o fio dava. Aqui o código de país do outro lado **não existe** neste aparelho, em nenhuma
forma, em nenhum momento. Não há o que reaproveitar.

## A porta que `D-90` abre (o delta exato)

**M6 — `src/net/index.ts`**

```ts
export interface Pick { side: Side; team: CountryCode; }   // `CountryCode` é de M1, como `Side`
export type Payload = Move | Pick;

export interface Channel {
  send(p: Payload): void;
  onMove(fn: (p: Payload) => void): void;
  onStatus(fn: (s: LinkStatus) => void): void;
  close(): void;
}
```

Os **4 métodos ficam**. O `Pick` entra pela mesma `onMove`, e é M5 quem discrimina (`'zone' in p`)
— exatamente a divisão que o cabeçalho do módulo já declara: M6 carrega sem interpretar. Um 5º
método (`onPick`) seria o precedente que `D-39` recusou comprar e que `D-73` recusou de novo.

`isMove` ganha um irmão `isPick`, sob o mesmo descarte alto e logado de `D-32`: payload que não
é nem um nem outro morre na borda, com `console.warn`, e nunca vira dado mentiroso rio abaixo.

**M5 — `src/session/index.ts`**

```ts
teams: Record<Side, CountryCode | null>;                                   // em SessionConfig
subscribe(fn: (s: MatchState, link: LinkStatus, teams: Record<Side, CountryCode | null>) => void): () => void;
```

O 3º argumento é a **única** forma de M7 saber a seleção do outro sem um 5º método. `null` em
`teams[remoteSide]` **é** o estado de espera que `T-31` pede: enquanto ele estiver ali, M7 mostra
"escolhendo…" no lugar da marca e **não deixa cobrar**. `assertConfig` recusa `null` em `cpu` e
`local` (os dois lados são deste aparelho) e recusa `null` no `localSide` em qualquer modo.

## As quatro perguntas do card, respondidas

1. **O que viaja:** `CountryCode` — o mesmo alfa-2 (ou alfa-2+subdivisão) de `D-52`, validado por
   `assertCatalogCode` (`D-61`) **em M5**, nunca em M6. M6 não sabe o que é seleção.
2. **Quem manda primeiro:** ninguém. Os **dois** mandam ao entrar em `'connected'`, sem ordem, sem
   resposta e sem aperto de mão — cada lado declara só o **próprio** `side`, então não há conflito
   a resolver. Reenviam a cada `'connected'` novo (o rearme de `D-31`); repetir é idempotente
   porque o valor é o mesmo. `Pick` com `side === localSide` cai na regra espelhada de `D-81`.
3. **O que a tela mostra enquanto o outro não escolheu:** o `null` acima, com o prazo que já
   existe — M5 rearma `CONNECT_TIMEOUT_MS` (20 s, o **mesmo** valor, sem constante nova: `D-76`)
   ao entrar em `'connected'`; peer que conecta e não manda `Pick` em 20 s vira `'failed'`
   sintetizado pelo mecanismo de `D-80`. Sem isso, um peer de versão antiga trava a tela para sempre.
4. **Se o peer sumir no meio:** nada novo. `D-80` e o prazo de `T-22` já respondem.

## O que `D-90` cobra fora das duas portas

`t=` (`D-77`) passa a levar **um** código — o de quem convida, para o convite mostrar quem chamou
antes de conectar. O segundo código de um link antigo é **ignorado**, não lido: com o `Pick` no
fio, ele seria uma segunda fonte para o mesmo dado, e a que chega primeiro é a errada.

## As quatro saídas mortas, com o número que as matou

| saída | por que morreu |
|---|---|
| `Move` ganha `team` obrigatório em toda jogada | a seleção de quem **defende** só chegaria na 2ª cobrança: o confronto ficaria errado **durante** a disputa, não antes dela |
| 5º método (`Channel.onPick` ou `Session.teams()`) | `D-39`, reafirmado por `D-73` — precedente em porta congelada, e `Q-09` o herdaria |
| não mexer no fio e manter `t=` com as duas | é **exatamente o que existe hoje**, e é o que o dono recusou: o convidado não escolhe |
| cada aparelho mostra só a própria seleção | mata o portão do card ("o MESMO confronto nos dois") e o próprio confronto |

## Portão de `D-90` (o que aprova a implementação de `T-31`)

> Marcado na sessão de construção de 2026-08-21 (M6+M5). O que segue aberto depende de M7 e do
> aparelho do dono — ver "O que `T-31` implementou", no fim desta nota.

- [ ] Os dois aparelhos mostram o **mesmo** confronto, com a seleção que **cada um** escolheu,
      medido em dois aparelhos de verdade (`A-NN`, como `A-22`) — o sandbox não compõe quadros.
- [x] Os 4 estados de `LinkStatus` que a tela alcança seguem cobertos, **mais** o novo: conectado
      com `Pick` pendente.
- [x] Teste de contrato do canal: `Pick` malformado é descartado como `Move` malformado é hoje.
- [x] `check.py`, `tsc`, a suíte inteira e o bundle **relido de `dist/`**.

## Gatilho que reabre `D-90`

Um terceiro tipo de payload. Dois tipos são uma união que M5 discrimina em uma linha; três são
um protocolo, e protocolo pede versão no fio — que é o que `D-79` recusou. Se aparecer o terceiro,
a decisão certa não é somar mais um: é `D-NN` de protocolo, com versão e com o custo declarado.

---

## O que `T-31` implementou — M6 + M5 (2026-08-21)

> Sessão de construção, skill `backend-bff`. `src/ui/` **não foi tocado**: a parte de M7 é a
> próxima sessão. O que segue é o delta real no disco, não o desenho — o desenho está acima.

### M6 — `src/net/index.ts`

| o que | como ficou |
|---|---|
| `Pick { side, team }` + `Payload = Move \| Pick` | exportados; `Channel` segue com **4 métodos**, agora tipados em `Payload` |
| `isPick` | irmão de `isMove`, sob o mesmo descarte alto e logado de `D-32`; confere **forma** (texto não vazio, ≤ 16 — `GB-ENG` tem 6), nunca catálogo |
| descarte da borda | a mensagem virou `payload descartado, não é Move nem Pick` |
| fila de `PENDING_LIMIT` | represa e escoa os dois tipos, na ordem |
| aviso de envio | `rotulo(p)` — `Pick` não tem `seq`, e `seq=undefined` num log manda alguém caçar defeito que não existe |

**O tropeço que valeu comentário no código:** `Pick` é o nome do utilitário de tipos do
TypeScript, e declará-lo aqui o **sombreia no arquivo inteiro**. `type Sinalizacao =
Pick<typeof import('trystero'), 'joinRoom'>` parou de compilar. Reescrito à mão
(`{ joinRoom: (typeof import('trystero'))['joinRoom'] }`), com a mesma garantia: a assinatura
continua saindo do módulo REAL, e trocar de versão da Trystero segue reprovando em `tsc`.

### M5 — `src/session/index.ts`

- `SessionConfig.teams: Record<Side, CountryCode | null>`. `assertConfig` recusa `null` em `cpu` e
  `local` (os dois lados são deste aparelho) e recusa `null` no `localSide` em qualquer modo.
- `subscribe` ganhou o **3º argumento**, e o que sai nele é **cópia** — entregar o objeto vivo
  deixaria um assinante de M7 reescrever o confronto pela tela.
- Ao entrar em `'connected'`: anuncia o próprio `Pick` e **rearma `CONNECT_TIMEOUT_MS`** (o valor
  importado de M6, sem constante nova — `D-76`). Peer que conecta e não anuncia em 20 s cai em
  `D-35` pelo mecanismo de `D-80`.
- `aoMove` discrimina em uma linha (`'zone' in p`) e entrega o `Pick` a `aoPick`, que recusa: par
  espelhado (`D-81`), lado que não é o do peer, código fora do catálogo de M4, e anúncio depois do
  fim (a guarda de fase vem **antes** da de `D-81`, como em `aoMove`).

**Duas coisas que a implementação decidiu e que ficam declaradas:**

1. **O anúncio sai DEPOIS de `notificarDaRede('status')`.** A resposta do outro aparelho pode
   voltar dentro da mesma pilha — é o que o par espelhado faz. Anunciando antes de notificar, o
   `'connected'` que M7 precisa pintar era sobrescrito pelo `'waiting'`/`'failed'` da resposta e
   **nunca chegava à tela**. Medido: `link` do anfitrião saía `['waiting','failed']`, sem o
   `'connected'` no meio.
2. **A validação do código usa `findTeam`, não `assertCatalogCode`.** A porta do PLANO cita
   `D-61`, e a fonte é a mesma (M4); o que muda é que `assertCatalogCode` **lança**, e isto roda
   dentro da pilha de M6 — exceção ali interromperia o laço do transporte. Anúncio com código
   inventado é **descartado e logado**, como todo evento remoto ilegal desta camada.

### O par espelhado mudou de hora (`D-81` / `QA-26`)

Antes de `T-31` a trava de `QA-26` era denunciada pela 1ª **jogada**. Agora ela é denunciada pelo
**anúncio**, que acontece ao conectar — antes de qualquer toque na tela. O desfecho é o mesmo de
`D-81` (falha honesta com saída nos dois lados, `D-35` intacto), só que mais cedo: ninguém chega a
cobrar. A guarda de `aoMove` **continua onde estava** e segue conferida pelos falseamentos.
Quatro testes do bloco `D-81` foram reescritos por isso, e o motivo está no `it` de cada um.

### Portão — o que já está verde e o que falta

- [x] **Teste de contrato do canal:** `Pick` malformado é descartado como `Move` malformado
      (8 formas tortas, uma por descarte logado), `Pick` são atravessa pela mesma `onMove`, fila
      represa os dois, e `Object.keys(channel)` continua sendo **quatro**.
- [x] **Conectado com `Pick` pendente**, o estado novo: coberto, mais o prazo de 20 s que o fecha
      (medido a `CONNECT_TIMEOUT_MS - 1` e a `CONNECT_TIMEOUT_MS`).
- [x] **`check.py`, `tsc`, suíte inteira (628/628) e bundle relido de `dist/`** — 427.442 B, +1.592 B.
- [ ] **Os dois aparelhos mostram o MESMO confronto, com a seleção que CADA um escolheu**, medido
      em dois aparelhos de verdade (`A-NN`). **Depende de M7**, que esta sessão não tocou — e o
      sandbox não compõe quadros.

### O que M7 herda (e que M5 deliberadamente NÃO faz)

`D-90` deu a M7 duas obrigações que M5 não cobra por ela, e não cobra de propósito — quem decide
o que a tela deixa tocar é a tela: mostrar **"escolhendo…"** enquanto `teams[remoteSide]` for
`null`, e **não deixar cobrar** nesse estado. `Session.choose` aceita a escolha com o anúncio
pendente; travá-la aqui seria regra de tela nascendo na sessão. Hoje isso não tem efeito porque
`src/ui/` ainda manda as duas seleções preenchidas (`tela_cobranca.ts:128`) — o `null` só nasce
quando M7 passar a mandá-lo.
