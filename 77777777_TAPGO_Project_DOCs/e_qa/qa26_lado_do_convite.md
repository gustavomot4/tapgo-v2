---
tags: [qa, nota]
status: atual
---
# `QA-26` — quem abre o link vira lado B, sempre

> Nota de evidência de `QA-26`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> Sessão de **evolução** (auditoria), não de código: nada foi implementado. O que esta nota
> entrega são as portas vivas com custo completo, as mortas com o número que as matou, e o
> **portão escrito antes** do experimento.

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
