---
tags: [qa, nota]
status: atual
---
# `QA-26` — quem abre o link vira lado B, sempre

> Nota de evidência de `QA-26`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> Escrita em sessão de **evolução** (auditoria): as portas vivas com custo completo, as mortas
> com o número que as matou, e o **portão escrito antes** do experimento. A partir de
> "`T-23` implementada" a nota passa a registrar o **código** que a porta D virou, medido contra
> esse mesmo portão. As referências de linha acima são as de ANTES da mudança.

## O mecanismo, lido do disco

| onde | o que faz hoje |
|---|---|
| `src/ui/main.ts:162` | `abertura()` dá `ladoLocal: 'B'` a **todo** endereço com `?sala=`, sem exceção |
| `src/ui/tela_convite.ts:64` | `anfitriao = partida.ladoLocal === 'A'` — o lado A só existe para quem veio do MENU |
| `src/ui/convite.ts:79` | `linkDaSala` limpa `search` — o link do anfitrião não carrega marca de lado nenhuma |
| `src/session/index.ts:194` | `first = 'A'` no `online`: com os dois em B, **os dois defendem** a 1ª cobrança |
| `src/ui/derivacao.ts:112` | no `online` o papel não trava a escolha: **quem defende também toca**, e M5 envia |
| `src/session/index.ts:496` | cada aparelho envia `side: localSide` |
| `src/session/index.ts:379` | `if (m.side !== remoteSide) return descartar(...)` — descarte **em silêncio**, só `console.warn` |

A cadeia fecha assim: dois aparelhos em B, os dois enviam `side: 'B'`, os dois têm
`remoteSide = 'A'`, e cada um descarta a jogada do outro na primeira guarda. O canal segue
`'connected'`, o timer de 20 s já foi limpo por `onPeerJoin`, ninguém emite `'failed'` e as duas
telas param em *"Escolha enviada. Esperando o outro jogador…"* — **para sempre**.

**Quando o par espelhado nasce** (três aberturas, todas normais):

1. o anfitrião toca no **próprio link** (mandou para si mesmo, ou testou no segundo aparelho);
2. o link é repassado a **dois convidados** — nenhum dos dois é o anfitrião;
3. o convidado reabre o link depois de o anfitrião ter fechado a aba.

## A lacuna de `D-80`, e por que ela não cobre isto

`D-80` fecha `QA-25` com um discriminador que exige **cobrança fechada**: `seq=0` **com**
`kicks.length > 0`. A própria linha declara o que fica de fora — *"a sessão nova que reentra ANTES
de qualquer cobrança fechar, indistinguível de reconexão legítima"* (`session/index.ts:395`).

`QA-26` mora exatamente lá: no par espelhado **nenhuma jogada atravessa**, logo `kicks.length`
fica em **0 nos dois lados, para sempre**. `D-80` é provadamente inalcançável aqui — não é que
ele falhe, é que a pré-condição dele nunca chega. Os dois discriminadores são **ortogonais** e
nunca disputam o mesmo evento: onde um vale, o outro é impossível.

## Lista-morta varrida (rejeitados vivos em `c_decisions.md`)

| # | por que ela morde esta auditoria |
|---|---|
| `D-39` | mexer na porta congelada de M6 para carregar mais um argumento: precedente que o projeto já recusou comprar |
| `D-40` | exportar mais superfície de M6 abre sala sem o portão do defeito 6 |
| `D-79` | **2º tipo de payload no fio** para o transporte distinguir sessões — mata qualquer "handshake de lado" que invente mensagem nova |
| `D-78` | cobrar o caso comum para pegar o raro é rejeição, não economia |
| `D-76` | teto maior não move o mecanismo — parede mais longe não é conserto |
| `D-06`/`D-07`/`D-08` | fora de assunto (backend v1, marca, engine) |

## As portas, com custo completo e `P(passar)`

Taxa-base de aprovação: **20–30%**. Só sobe com evidência apresentada.

### Porta A — o lado viaja no link (`&l=B`)

`linkDaSala` passa a escrever o lado do destinatário; `abertura()` lê.
**Morta por cobertura, com número: 0 dos 3 casos.** O anfitrião que toca no próprio link lê
`l=B` igual a todo mundo (caso 1); dois convidados leem o **mesmo** link, logo o mesmo `l`
(caso 2); e o caso 3 idem. Custo pago (1 parâmetro, parser, testes de link, mais superfície em
`convite.ts`) por **zero** caso resolvido. `P ≈ 5%` — abaixo da taxa-base, e o que a derruba é
cobertura medida, não gosto.

### Porta B — M7 lembra a sala que ele mesmo sorteou

Persistir o `roomId` do anfitrião; quem abrir `?sala=` com esse ID é A.
**Morta por custo, e o custo é o contrato.** `main.ts:132` diz, escrito: *"A disputa em andamento
NUNCA é retomada — ela nunca é gravada, por contrato de privacidade"*. Gravar sala em disco pede
a **3ª exceção nominal** ao portão de privacidade de M9 — e `D-71` mostra o preço de UMA
(isenção que nomeia arquivo e versão, reconferida a cada subida). Cobre 1 dos 3 casos (só o
caso 1, e só no mesmo aparelho), morre em janela anônima. `P ≈ 10%`.

### Porta C — negociar o lado no transporte (`peerId` comparado)

Os dois lados ordenam os identificadores que o Trystero já entrega em `onPeerJoin(peerId)`;
o menor vira A. **É a ÚNICA que faz os 3 casos funcionarem de verdade.**
**Ângulo novo contra `D-79`, declarado:** não é payload novo no fio — é metadado que o
transporte já entrega e que M6 hoje **descarta** (`net/index.ts:379`: `sala.onPeerJoin = () => {…}`,
sem argumento). Isso escapa da letra de `D-79`, e não da de `D-39`: expor `peerId` de M6 é
superfície nova em porta congelada.

**Reprovada NESTA sessão por falta de dado** (regra 3 da skill), não por mérito. Falta medir: o
`peerId` do Trystero é estável e **consistente nos dois lados** o suficiente para dar desempate
determinístico? Sem 10/10 não há tiebreak, e o par pode se auto-atribuir o **mesmo** lado — o
defeito de hoje com mais código. Custo completo se um dia passar: reabre `D-13` (`localSide`
deixa de ser autoridade em M5), reabre `D-77` (as seleções vêm mapeadas por lado no link — trocar
o lado depois troca a bandeira na tela do jogador), e retrabalho de doc em [[online_p2p]] e no
PLANO. `P ≈ 20%` (taxa-base; nenhuma evidência a somar ainda).

### Porta D — M5 trata o par espelhado como falha honesta ✅ recomendada

`aoMove` lê `m.side === localSide` como pareamento espelhado: marca `abandonada`, sintetiza
`'failed'`, fecha o canal — **a forma exata de `D-80`**, que já passou em campo em dois aparelhos
(`A-24`).

O discriminador é **de graça e impossível num par são**, e isto é lido do disco, não lembrado:
`aoMove` só é ligado quando `mode === 'online'` (`session/index.ts:422`, dentro do ramo online —
no `local` não existe canal), e no online cada aparelho envia `side: localSide`. Logo
`m.side === localSide` significa, sem ambiguidade, *"o outro aparelho acha que é o meu lado"*.
Nenhum cliente honesto produz isso; um cliente modificado já mentiria em qualquer discriminador
(o argumento de `D-79`).

**O que ela NÃO faz, declarado:** não faz a disputa acontecer. Ela troca *trava permanente* por
*falha honesta com saída* — que é a invariante escrita em [[online_p2p]] (*"timeout explícito e
mensagem honesta, nunca tela travada"*). `P ≈ 70%`: custo ~4 linhas num arquivo, zero porta nova,
zero byte em `src/net` e `src/ui`, e precedente idêntico verde em campo.

### Porta E — perguntar na tela ("sou eu quem convidou / entrei pelo link")

**Morta por número de toques.** O convidado passa de **1 para 2 toques em 100% dos convites**
para cobrir um caso que exige abertura degenerada; `D-49` já recusou uma tela por causa do
"3º toque num fluxo com portão de 2 toques". `P ≈ 10%`.

## Prioridade (valor × P ÷ custo)

| porta | valor | P | custo | veredito |
|---|---|---|---|---|
| **D** — falha honesta em M5 | alto (tira a trava permanente) | **70%** | ~4 linhas, 0 porta | **adotar** (`D-81`) |
| C — negociar lado no fio | altíssimo (faz funcionar) | 20% | reabre `D-13` + `D-77` + doc | **reprova por falta de dado** — medir primeiro |
| B — lembrar a sala | baixo (1 de 3 casos) | 10% | 3ª exceção de privacidade | rejeitar |
| E — perguntar na tela | médio | 10% | +1 toque em 100% dos convites | rejeitar |
| A — lado no link | **zero** (0 de 3 casos) | 5% | parâmetro + parser + testes | rejeitar |

## O PORTÃO da porta D — escrito ANTES do experimento

**Uma mudança por vez:** só a guarda em `aoMove`. Zero byte em `src/net`, zero em `src/ui` —
o mesmo isolamento que tornou `D-80` atribuível.

**Passa se, e só se:**

1. **Campo, dois aparelhos, mesmo link** (o caso 1 acima: o anfitrião toca no próprio link): ao
   **primeiro toque em qualquer zona**, os **dois** aparelhos chegam à mensagem de `D-35`
   ("o outro jogador saiu / sem resultado") em **≤ 2 s**, e nenhum fica em *"Esperando o outro
   jogador…"*. Um lado só que sai da trava **reprova**: fechar o canal existe justamente para
   tirar o outro.
2. **Não regride o par são:** anfitrião pelo menu + convidado pelo link completa **5 cobranças**
   sem um único descarte por lado no console.
3. **Não regride a suíte:** os 5 testes de `D-80` e os 4 da fila seguem verdes; o total sai de
   **563/563** para 563+N sem nenhuma reprovação.
4. **Falseamento obrigatório** (o que `A-23` fez por `D-80`): sob mutação `===` → `!==` o teste
   novo tem de **reprovar**; e um `Move` legítimo (`side === remoteSide`) **não** pode disparar
   a guarda.
5. **Orçamento:** `+≤ 150 B` no bundle, **zero asset novo**.

**O que REPROVA a porta D, e isto importa:** se em campo a trava aparecer **antes de qualquer
toque**, nenhum `Move` foi enviado, a guarda nunca é acionada e a porta D não é o conserto — o
defeito é de atribuição em M7 e só a porta **C** resolve. Este é o falsificador barato: anotar
**se tocou antes de travar**.

## O falsificador FOI MEDIDO em campo — 2026-08-20, dois aparelhos

O portão acima declarou o que reprovaria a porta D: *"se a trava aparecer antes de qualquer
toque, nenhum `Move` foi enviado e a guarda nunca roda"*. O dono rodou o procedimento com os
dois aparelhos no MESMO link e relatou, nesta ordem:

1. **os dois aparelhos na mesma seleção** — os dois receberam `ladoLocal: 'B'`, logo `teams.B`
   nos dois. É a 1ª previsão do modelo;
2. **os dois no papel de DEFESA** ("esperando o adversário escolher onde ele quer ir") — com
   `first = 'A'` e `localSide = 'B'` nos dois, `estado.turn !== ladoLocal` dos dois lados, e
   `derivacao.vez()` devolve `papel: 'defender'` em ambos (`derivacao.ts:113`). 2ª previsão;
3. **o toque acontece e leva a "esperando"** — a escolha foi aceita por M5 e o `Move` **saiu**
   (`session/index.ts:496`), que é exatamente a pré-condição da guarda de `D-81`. 3ª previsão.

**A porta D não foi reprovada: a trava exige toque, e o toque acontece.** O que fica declarado
como não cronometrado em campo é só a **permanência** (que nada mais tira os dois daquela tela)
— e essa não é observação nova, é o caminho de código já lido: nenhuma jogada atravessa a guarda
de lado, o timer foi limpo por `onPeerJoin`, e nada mais emite `'failed'`.

**Consequência para `T-23`:** o item "o que REPROVA a porta inteira" do portão está **resolvido
antes do código**, e a porta do `peerId` deixa de ser alternativa desta rodada — segue viva só
como a única que faria os 3 casos funcionarem, ainda sem dado.

## `T-23` implementada — o que entrou, e o item do portão que a medição não pode cobrar

Delta de **um arquivo de produção**, `src/session/index.ts`, e do teste. `git diff --stat` fecha
em `src/session/index.ts` + `src/tests/session_online.test.ts` e mais nada: **zero byte em
`src/net` e em `src/ui`**, como o portão exigiu.

- a guarda de lado passa a deixar o `=== localSide` seguir adiante (`!== remoteSide` sozinho o
  engolia em silêncio); lado de **terceiro** tipo continua descarte mudo;
- **depois** das guardas de forma (`isZone`) e de **fase** (`phase === 'finished'`), o
  `m.side === localSide` marca `abandonada`, sintetiza `'failed'`, chama `canal.close()`;
- o helper de `D-80` deixou de se chamar `abandonarPorReentrada` e virou
  `abandonarSemResultado(origem)` — os dois discriminadores partilham o desfecho, e um só nome
  honesto é melhor que dois corpos idênticos.

**Por que a guarda ficou DEPOIS da de fase, e não antes:** acima dela, uma jogada espelhada
chegando com a disputa já terminada pintaria a mensagem de `D-35` por cima de um resultado
legítimo — o placar mentiroso ao contrário. Há teste só para essa ordem, e ele reprova quando a
guarda sobe uma linha.

### Portão, item por item

| item | resultado |
|---|---|
| suíte 563 → 563+N, sem reprovação | **569/569** (+6), `tsc --noEmit` limpo |
| falseamento `===` → `!==` | **17 testes reprovam**, os 5 do bloco `D-81` entre eles |
| falseamento: guarda inalcançável (volta do `!== remoteSide` sozinho) | **4 reprovam** |
| falseamento: guarda **acima** da de fase | **1 reprova**, a que existe para isso |
| `Move` legítimo (`side === remoteSide`) não dispara | par são completa **5 cobranças**, **zero** descarte |
| bundle `+<=150 B`, zero asset | **+104 B** (415.713 -> **415.817**), lido de `dist/` no sandbox |
| zero byte em `src/net` e `src/ui` | confere |

**Lacuna declarada no teste:** o `side` de terceiro tipo (nem `A` nem `B`) **não chega a M5** —
`isMove` o derruba em M6 (`net/index.ts:370`). A guarda repetida de M5 sobre ele é inalcançável
pelo fio, e o teste correspondente mede a morte em M6, não em M5. Quem fecha o alargamento da
guarda é o teste do `Move` legítimo.

### O item 1 do portão está escrito mais apertado do que o mecanismo entrega

O portão pediu: *"ao primeiro toque em qualquer zona, os **dois** aparelhos chegam à mensagem de
`D-35` em **<= 2 s**, e nenhum fica em 'Esperando o outro jogador…'"*. O mecanismo da porta D dá
isso **de um lado só**, e o motivo é o mesmo caminho que `A-24` já mediu e aceitou:

- **quem RECEBE a jogada espelhada** cai em `D-35` no tique da chegada — sem relógio nenhum;
- **quem ENVIOU** recebe o `leave()` do outro como `onPeerLeave`, que M6 traduz em `'waiting'` e
  **rearma os 20 s** (`net/index.ts:390`). Como M7 pinta "Escolha enviada. Esperando o outro
  jogador…" enquanto há escolha pendente (`tela_cobranca.ts:283`), esse lado **continua nessa
  frase por até 20 s**, e só então vê `D-35`.

Encurtar isso exigiria mexer em `src/net` — que o item 4 do mesmo portão proíbe — ou tratar
`'waiting'` como terminal em M5, que mataria a queda-e-volta de ~5 s do modo avião, o número que
matou `D-78`. Então **não é defeito da implementação: é o item do portão que foi escrito com um
número que a porta D nunca prometeu.** O precedente é literal: o portão de `A-24`, para este
mesmo `close()`, escreveu *"o aparelho 2 sai da tela travada **em até 20 s**"*.

**O que `A-25` deve cobrar, para não reprovar uma porta que funciona:**

1. o aparelho que **recebeu** mostra `D-35` **na hora** do toque do outro (<= 2 s);
2. o aparelho que **tocou** sai da frase "Esperando o outro jogador…" **em até 20 s**, com a mesma
   mensagem — e **nenhum dos dois** fica preso para sempre, que é a invariante de [[online_p2p]];
3. o falsificador de sempre: **anotar se tocou antes de travar** (já medido em 2026-08-20, e
   passou).

Reprova de verdade: algum dos dois seguir em "Esperando o outro jogador…" **passados os 20 s**, ou
qualquer placar aparecer. Essa releitura do item 1 é do dono — o registro está em **15.982/16.000**
e **não cabe** um `D-NN` para ela nesta sessão (`A-21`).

## `A-25` em campo — a metade degenerada PASSOU (2026-08-20)

Dois aparelhos reais, os dois abrindo o **mesmo link**. Relato do dono, na ordem:

1. os dois entram pelo link e a tela dá **"oponente encontrado"**; os dois tocam em iniciar;
2. **um aparelho toca numa zona**. O OUTRO — que não tocou em nada — mostra a mensagem de
   `D-35` inteira: *"O outro jogador saiu da disputa. / A disputa terminou sem resultado — o
   placar até aqui não vale como vitória."*;
3. o aparelho que **tocou** fica esperando a resposta do adversário e, **passados ~10 s**, a
   conexão cai e ele chega à **mesma** mensagem.

**Isto é `D-81` funcionando, e a leitura é literal:** o aparelho 2 nunca tocou em zona nenhuma.
A única coisa que chegou a ele foi o `Move` do aparelho 1 assinado com o lado dele próprio — a
guarda nova. Antes de `T-23` esse aparelho não tinha caminho nenhum até a tela de `D-35` neste
cenário: os dois ficavam em "Esperando o outro jogador…" **para sempre**.

| item do portão (na releitura de `T-23`) | medido |
|---|---|
| quem **recebe** a jogada espelhada cai em `D-35` na hora | **sim**, e sem ter tocado |
| quem **tocou** sai da frase "Esperando…" em até 20 s | **sim, ~10 s** |
| nenhum dos dois fica preso para sempre | **sim** — os dois saíram |
| nenhum placar inventado | **sim** — o texto diz que o placar não vale |
| falsificador: tocou antes de travar? | **sim**, confirmado de novo |

**Sobre os ~10 s:** `armarTimer` arma exatamente `CONNECT_TIMEOUT_MS = 20_000` a partir do
`onPeerLeave` (`net/index.ts:290`), então o número do código é 20 s. O ~10 s é estimativa a olho,
não cronômetro, e provavelmente conta a partir do instante em que o dono olhou de volta para o
aparelho. Não muda veredito nenhum: qualquer valor **≤ 20 s** passa. Quem daria o número exato na
tela é `T-22`.

**O que ainda NÃO foi medido, e `QA-26` não fecha sem isso:** a segunda metade do portão de
`A-25` — **o par são não regride**. Anfitrião entrando pelo **MENU** (não pelo próprio link) e
convidado pelo link, completando **5 cobranças** sem descarte. É o item que prova que `D-81` não
matou a disputa legítima; em sandbox ele está verde (5 cobranças, zero descarte, e a mutação que
o quebraria reprova 17 testes), mas em campo é o que custa caro se estiver errado.

## O que a decisão custa à promessa de `D-72`

`D-72` tirou *"por link de convite"* do Objetivo e escreveu quando ela volta: **quando `Q-11`
tiver `D-NN`**. `Q-11` já tem — é `D-73`. Logo o que segura a promessa hoje é `QA-26`, e não
mais uma tela que falta.

- **Com a porta D sozinha:** o caminho **são** (anfitrião pelo menu → convidado pelo link) fica
  publicável, e as três aberturas degeneradas terminam em mensagem honesta com saída para o
  menu. A promessa **pode voltar ao Objetivo**, mas com uma frase de verdade junto: *o link é de
  uso único e do convidado* — quem convida não abre o próprio link. Isso é lacuna declarada, que
  o projeto aceita, e não maquiagem.
- **Sem D e sem C:** a promessa **não** volta. Devolver *"jogável por link de convite"* ao
  Objetivo com uma trava permanente a um toque de distância seria exatamente o achado de entrega
  que `D-72` recusou cometer: *"objetivo que promete o que o build no ar não faz"*.
- **Só C devolveria a promessa sem asterisco** — e ela custa `D-13`, `D-77` e a doc. É decisão do
  dono, e hoje **não tem dado** para ser tomada.

## O orçamento do registro travou esta auditoria (`A-21`)

Medido nesta sessão: `c_decisions.md` em **15.743/16.000** — sobram **257**, e uma linha de
decisão custa ~360. Coube **uma** (`D-81`, escrita curta). As rejeições A, B, E e a reprova por
falta de dado de C ficam **aqui**, com o número que as matou, e recebem `D-NN` na sessão que
pagar `A-21`.

O pool de corte está **vazio por regra**: dos 37 IDs vivos, o único que nenhum `.md` vivo citava
era `D-76` — e `D-76` é **REJEITADA**, que `D-74` protege de propósito (*"as REJEITADAS ficam, são
a lista-morta"*). Antes desta nota o `check.py` a oferecia como candidata de corte, porque ele
ainda mede pelo critério de `D-43`, que `D-74` supersedeu para as rejeitadas.

**Depois desta nota ele não oferece mais nenhuma** — e não porque a regra mudou, mas porque a
tabela de lista-morta acima passou a citar `D-76`. Uma rejeitada estar protegida por acidente de
citação, e não pelo critério, é o achado: vira `QA-27`. Com o corte de `D-43` esgotado, a única
saída que resta é rever o teto — o que o próprio `check.py` agora escreve na tela.

Estado do registro ao fim desta sessão, medido: **15.982/16.000 — sobram 18 caracteres.** A
próxima decisão de qualquer sessão não cabe.
