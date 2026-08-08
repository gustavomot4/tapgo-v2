---
tags: [nota, modulo, online]
status: atual
---
# M6 — notas do transporte P2P (T-11)

> Evidência longa das decisões `D-29`..`D-33`, de `QA-06` e de `Q-10`. O registro vivo é
> [[c_decisions|DECISIONS]]; aqui mora o raciocínio que não cabe em duas frases.
> Estado numérico (bundle, contagem de teste) mora só no [[a_context_source|CONTEXT]].

## STEP 0 da skill: isto precisa ser síncrono? (`D-29`)

A skill [[b_process/skills/microservice-sync/SKILL|microservice-sync]] manda responder isto
**antes de codar**. A tabela dela, aplicada a M6:

| Pergunta | Resposta para M6 |
|---|---|
| O chamador precisa da resposta para continuar agora? | **Não.** Quem cobra escolhe a zona e a manda; a zona do outro chega quando chegar. Nada bloqueia. |
| Pode ser feito depois, com o usuário seguindo em frente? | **Sim** — a tela mostra "esperando o outro jogador". |
| A operação escreve nos dois serviços? | **Não há dois serviços.** Cada aparelho aplica a mesma regra pura de M2 sobre o mesmo par de zonas. |
| Chamada em cadeia A→B→C? | **Não existe cadeia.** Um salto, e o orçamento inteiro é o timeout de M6. |

Conclusão: **assíncrono, disparo-e-esquece com callback** — que é exatamente o que a porta
congelada em `D-13` já descrevia (`send(m): void` + `onMove(fn)`, nenhum retorno de resposta).
O STEP 0 não mudou o contrato; confirmou que ele estava certo, e é isso que ele existe para fazer.

**Onde a skill não serve, e por quê.** Ela foi escrita para HTTP/gRPC entre serviços. Três regras
dela não têm objeto aqui, e fingir que têm produziria enfeite:

- **Circuit breaker** — pressupõe muitas chamadas a um serviço compartilhado que se pode poupar.
  Aqui há **um** peer e **uma** partida; "abrir o circuito" é exatamente o que o `'failed'` faz.
- **Retry com backoff** — não há operação a repetir: o que falha é a *conexão*, e reconectar em
  laço contra CGNAT não muda o resultado, só atrasa a mensagem honesta.
- **Contrato versionado com campo opcional** — não há dois lados subindo em tempos diferentes:
  os dois aparelhos carregam o mesmo build da mesma URL. Peer com build velho é tratado pela
  validação de forma (`D-32`), não por versionamento.

O que a skill contribuiu de fato: timeout explícito e documentado, orçamento de tempo declarado,
falha traduzida em vez de repassada crua, identificador de correlação nos logs dos dois lados, e
a exigência de amostra real do contrato de terceiro — que aqui virou leitura dos `.d.mts` da
Trystero 0.25.3 instalada, e não suposição sobre a API.

## ID de sala fora do `Rng` de M1 (`D-30`)

M1 monopoliza o gerador nativo porque o aceite exige "roda 2x com o mesmo resultado". Mas o
gerador de M1 é **determinístico por contrato**, e ID de sala determinístico é ID previsível —
o defeito 6 da v1. Os dois requisitos são opostos, então são dois geradores:

- disputa → `Rng` de M1, com semente, reproduzível;
- ID de sala → `crypto.getRandomValues`, imprevisível, sem semente.

O portão de M1 (`uma ocorrência do gerador nativo em src/`) continua verde: `getRandomValues` é
outra função. **26 caracteres do alfabeto Crockford base32 = 130 bits.** O alfabeto exclui `I`,
`L`, `O` e `U` porque o ID viaja em link que alguém pode ler em voz alta. `b % 32` não enviesa:
256 é múltiplo exato de 32.

Sem `crypto.getRandomValues` (contexto não seguro), `hostRoom` **lança** em vez de cair para um
gerador fraco: trocar "sem online" por "online previsível", calado, seria pior que falhar.

## Máquina de estados, e por que `'failed'` é terminal (`D-31`)

```
idle ──► waiting ──► connected
  │        │  ▲          │
  │        │  └──────────┘   peer saiu: volta a waiting e REARMA o relógio
  ▼        ▼
failed ◄───┘    20 s sem peer · sinalização fora do ar · sala recusada
qualquer ──► closed   (só por close())
```

- **`idle` tem significado real:** o `import()` da sinalização está em voo. Não é estado morto
  do enum.
- **Rearmar o relógio quando o peer sai** é o que impede "oponente sumiu no meio" de virar tela
  parada em `waiting` para sempre. Ou ele volta, ou vira `failed` com mensagem. **Quem ganha a
  disputa nesse caso é `Q-04`, e M6 não opina** — ele só relata o canal.
- **`'failed'` é terminal:** solta a sala e não reconecta. Um peer que aparecesse depois do
  timeout ressuscitaria a partida **após** a tela já ter dito "não deu" — e o jogador seria
  puxado para uma partida que ele viu falhar. O teste "failed é terminal" cobre isso, e pegou
  este defeito na implementação: o `onPeerJoin` original não checava estado terminal.
- **`onStatus` entrega o status atual na assinatura.** Sem isso, quem assina depois de o canal
  já ter falhado (o `import()` pode falhar antes de M5 assinar) esperaria para sempre um evento
  que já passou.

Os **20 s** são escolha do PLANO, não medição — e é por isso que `CONNECT_TIMEOUT_MS` é
exportada: E-4 pode ajustá-la com o número na mão, e o teste confere o valor **e** o
comportamento nele.

## M6 confere a forma; M5 confere a regra (`D-32`)

A fronteira, em uma linha: **M6 pergunta "isto é um `Move`?"; M5 pergunta "este `Move` é legal
agora?"**

M6 valida forma (`seq` inteiro ≥ 0, `side` em A|B, `zone` em L|C|R) e descarta o resto com log.
Sem essa checagem, M6 entregaria a M5 um objeto **tipado** como `Move` que não é um, e a garantia
do TypeScript viraria mentira na única borda do projeto onde o dado vem de fora do processo.
Ordem, repetição e legalidade continuam inteiras com M5 contra o `MatchState` de M2 (`D-19`) —
M6 não sabe o que é gol.

**Fila com teto de 32.** Jogada enviada antes de `connected` é represada e escoada na ordem ao
conectar. Repetir é seguro porque `Move.seq` deixa M5 descartar duplicata — é a "chave de
idempotência" que a skill exige antes de qualquer reenvio. O teto existe porque fila sem teto é
vazamento de memória com nome de resiliência; o excedente sai com aviso, nunca calado.

**Cifra da sinalização:** o SDP trafega por relay público, e o SDP carrega candidatos ICE. A
sala é aberta com `password` = o próprio `roomId`, que só quem tem o link possui — o relay deixa
de ler os candidatos. Custa uma linha e não muda o contrato.

## Página de medição publicável (`D-33`)

O PLANO declara que o número de E-4 **não sai do sandbox do agente**: é medição do dono, dois
aparelhos, rede de operadora. Faltava o aparelho de medida, e medir em celular exige HTTPS —
que o Pages dá. Daí `src/medicao.html` + `src/medicao.ts` como **segunda entrada** do build.

Isto atravessa o escopo do módulo (mexe em `vite.config.ts`, que é de M9) e **foi autorizado
pelo dono nesta sessão** antes de existir uma linha de código. Não é travessia silenciosa.

Como o instrumento evita sujar o próprio número:

- **Duas medições separadas, nunca somadas** — contador "sem TURN" e contador "vai ao ar",
  escolhidos pelo mesmo botão de TURN. É o que E-4 pede.
- **O veredito é o do próprio M6**, inclusive o timeout de 20 s. Reimplementar o relógio na
  página mediria a página, não o módulo.
- **Uma tentativa por toque, dos dois lados.** Nada de sincronizar relógios entre aparelhos: o
  dono tem os dois na mão, e um protocolo de sincronia inventado aqui poderia corromper
  justamente o número que a medição existe para produzir.
- **ID de cada tentativa por rotação da sala-base.** Rotacionar um ID válido devolve um ID
  válido (mesmo comprimento, mesmo alfabeto), então os dois aparelhos calculam o mesmo ID sem
  trocar mensagem — e é a troca de mensagens que está sob teste.
- **Credencial de TURN digitada em runtime**, some no reload. É o que mantém "nenhum segredo
  versionado" verdadeiro durante a medição com relay. Um teste confere que não há credencial
  nem URL de TURN literal em `src/net/index.ts`.
- `noindex`, e nenhum link do jogo aponta para ela.

Mora em `src/`, **não** em `src/ui/`: o portão de camada de M7 exige zero import de `src/net`
dentro de `src/ui/`, e o instrumento importa M6 direto. Instrumento não é tela de jogo.

## `QA-06` — o medidor de bundle conta entrada demais

`src/scripts/bundle-size.mjs` soma **toda** entrada com `isEntry` no "bundle inicial". Com duas
páginas, o número que o CONTEXT publica e que o gatilho de `D-02` lê passa a incluir uma página
que o jogador nunca abre.

Medido neste build: jogo sozinho **80.748 B**; página de medição **12.775 B**; o que o script
reporta, de-duplicando o compartilhado, **88.888 B**. Longe do teto de 8 MB — o problema é de
definição, não de folga.

**Não consertado aqui de carona** (regra 4 do contrato do agente): `bundle-size.mjs` é de M9 e
mudar o que "bundle inicial" significa é mudar um portão, o que pede `D-NN` do dono de M9.

## `Q-10` — TURN entra ou fica fora de escopo?

Nenhuma das duas saídas é decidível sem as medições, e **o agente não inventa o número**. O
critério, porém, já está escrito, e é isto que E-4 cobra:

| Se a medição disser | Então |
|---|---|
| taxa **sem TURN** ≥ 70% | saída (b) é defensável: TURN fora de escopo, com o percentual exato sem online registrado |
| taxa **sem TURN** < 70% | saída (a): camada gratuita de TURN, com linha própria na tabela de custo de [[stack]] e conferida pelo portão de M9 |
| taxa **na config que vai ao ar** < 70% | E-4 **não fecha**, e o gatilho de revisão de `D-01` está aberto |

O código não precisa mudar em nenhum dos casos: `IceConfig` é parâmetro, e é o que torna a
escolha uma linha de configuração em vez de uma refatoração. O pior caso declarado em
[[online_p2p]] (30% falhando) cai **exatamente** no corte — passa raspando, deixando 30% sem
online. É o cenário em que a decisão precisa de percentual, não de adjetivo.

## O que a suíte prova, e o que ela não prova

Prova: alfabeto, comprimento, não-colisão e não-sequencialidade do ID; recusa de ID malformado;
o timeout no valor exato (não antes, não depois); rearme do relógio na saída do peer; `failed`
terminal; entrega do status na assinatura; descarte de payload sem forma de `Move`; fila com
ordem e com teto; TURN chegando (e não chegando) à sinalização; e — o invariante de arquitetura
— **com a sinalização derrubada, `cpu` e `local` vão até o fim**.

Não prova, e nenhum teste de sandbox provaria: **a taxa de conexão em rede móvel real.** É por
isso que existe a página de medição, e é por isso que T-11 entrega o portão de E-4 pela metade
até o dono medir.

## `D-34` — a sinalização entra por injeção, e não por mock de módulo

Três armadilhas encadeadas custaram esta decisão. As três davam o **mesmo** sintoma — canal preso
em `'idle'` ou em `'failed'`, e a mensagem de erro acusando o código de produção.

1. **Relógio falso total mata o `import()` dinâmico.** `vi.useFakeTimers()` leva junto o
   `setImmediate` de que o carregador de módulos do Vitest depende; o módulo nunca chega.
   Corrigido com `toFake: ['setTimeout', 'clearTimeout']` — falso só o relógio de 20 s, que é o
   objeto do teste.
2. **Girar o event loop para esperar é pior que esperar.** A espera por laço de `setImmediate`
   passava no Linux e **reprovava no Windows do dono**, 17 testes de uma vez: girar o loop deixa
   o carregador sem vez (3.000 voltas em 30 ms, módulo parado). Corrigido com `opened(channel)`,
   a promessa de abertura que M6 passou a expor — aguardar deixa o processo ocioso, que é
   justamente a condição para o carregador andar.
3. **`vi.mock` de módulo escapava sob carga.** Resolvidos 1 e 2, sobrou uma falha **intermitente**
   (≈1 em cada 3 execuções da suíte completa): a Trystero **real** era carregada no lugar do
   duplo, `RTCPeerConnection` estourava em Node, e o canal ia a `'failed'`. Era o mesmo
   `ReferenceError` que aparecia solto desde o início.

A saída não foi mais uma camada de gambiarra na espera, e sim tirar o carregador de módulos do
caminho: `setSignalingLoader` injeta a sinalização, o duplo vira função comum, e o teste passa a
exercitar M6 em vez do Vitest. `joinRoom` continua conferido contra a assinatura real da
biblioteca, porque o tipo da costura sai de `typeof import('trystero')`.

**Duas regras que ficam do episódio:**

- **Espera de teste tem de falhar alto quando desiste.** Enquanto a minha devolvia em silêncio,
  o erro aparecia como "expected 'idle' to be 'waiting'" e acusava o módulo errado. Hoje
  `abrirHost` reprova com o status real e com os avisos que M6 emitiu — foi essa mensagem que
  finalmente nomeou o `RTCPeerConnection`.
- **Sandbox verde não é portão.** Esta suíte passou no Linux e reprovou 17 testes na máquina do
  dono. A regra 7 do contrato do agente existe por causa exatamente disto.

## `QA-08` — o anfitrião da página de medição abre a sala errada

Achado em 2026-08-08, ao escrever o passo a passo de `A-08`. **A página não pode produzir número
nenhum**, e o número que ela produziria é pior que nenhum: 0%.

O instrumento declara, no próprio comentário de `idDaTentativa`, como os dois aparelhos deveriam se
encontrar sem trocar mensagem:

> sendo determinístico, os dois aparelhos calculam o MESMO ID a partir da mesma base, sem trocar
> mensagem nenhuma — o que importa, já que é justamente a troca de mensagens que está sob teste.

`rodarUma()` calcula esse ID e o entrega a `tentativa(id, ice)`. Só que o ramo do anfitrião o joga
fora:

```ts
canal = papel === 'host' ? hostRoom(ice).channel : joinRoom(id, ice);
```

`hostRoom(ice?: IceConfig)` não recebe sala: ele chama `newRoomId()`, 130 bits de `crypto`. O
convidado entra em `idDaTentativa(base, n)`. As duas salas coincidirem tem probabilidade
desprezível, então **toda** tentativa vai até os 20 s de `CONNECT_TIMEOUT_MS` e volta `'failed'`.

Por que isso é CRÍTICO e não MÉDIO: a taxa medida seria 0% nos dois contadores, e 0% < 70% aciona
as duas linhas piores da tabela de `Q-10` — saída (a) obrigatória e E-4 não fechando —, além do
gatilho de revisão de `D-01`, que reabre a escolha de arquitetura quando a conexão medida fica
abaixo de 70%. Seria uma decisão de arquitetura tomada sobre um aparelho de medida quebrado, com o
agravante de o número parecer plausível: "P2P falha sempre em rede de operadora" é exatamente o
medo que a medição existe para testar.

**Por que nenhum teste pegou:** `medicao.ts` é instrumento, não módulo, e nenhum teste da suíte o
cita. A suíte de M6 prova que `hostRoom` sorteia ID opaco e não sequencial, e prova que `joinRoom`
recusa ID malformado — as duas coisas certas, sobre a porta certa. O defeito está em **quem
chama**, num arquivo que a suíte não olha.

**Não consertado aqui** (regra 4, e regra 2): a correção natural é o anfitrião abrir a sala
rotacionada, e a porta de M6 não oferece isso — `hostRoom` não aceita `roomId`, e `createChannel`
não é exportado. Mudar a porta congelada é `D-13`, logo `D-NN` do dono, e a implementação é sessão
de M6 com a skill `backend-bff`. As saídas aparentes, para a sessão que a pegar avaliar:

- `hostRoom(ice?, roomId?)` — menor mudança de porta, mas acrescenta parâmetro opcional numa
  interface congelada, que foi exatamente o precedente que `Q-09` já pedia (`pending()`).
- exportar `createChannel` — dá ao instrumento o que ele precisa sem tocar em `hostRoom`, mas abre
  a porta de M6 para quem não deveria abrir sala sem passar por `hostRoom`/`joinRoom`.
- o anfitrião sortear a base e o **convidado** não rotacionar: uma sala por medição inteira, em vez
  de uma por tentativa. Não mexe na porta, mas muda o desenho da medição — tentativas repetidas na
  mesma sala não são independentes, e a independência é o que a rotação existia para garantir.

Nenhuma delas é escolha desta sessão. As três precisam do portão escrito antes, e a terceira mexe
no significado do número.

### `QA-08` confirmado em campo (2026-08-08, dono)

O diagnóstico acima foi por leitura de código. O dono rodou a página assim mesmo, e o resultado
fecha com ele — **e com um controle que a leitura de código não teria produzido**:

| Rede | Papel do aparelho colado | Resultado |
|---|---|---|
| Wi-Fi, os dois no mesmo | host | 0/2 no resumo, 3 tentativas na tabela · 0% |
| Dados móveis, Claro 5G nos dois | host | 0/1 · 0% |

**O run de Wi-Fi é o controle, e é ele que fecha o caso.** Dois aparelhos na mesma rede local
conectam por P2P praticamente sempre — é o cenário mais fácil que existe, e é justamente por isso
que o instrumento avisa que Wi-Fi "esconde o defeito". Falhar **também** ali elimina a rede como
explicação: sobra o que a leitura de código já dizia, que as duas pontas abrem salas diferentes.

**Nenhum destes números é medição de E-4.** Não entram no `Q-10`, não alimentam o gatilho de
revisão de `D-01` e não aparecem no CONTEXT. Enquanto `T-15` não fechar, a página não distingue
"P2P falhou" de "as duas pontas nunca se encontraram" — e os dois casos saem como `'failed'` depois
dos mesmos 20 s.

Dois detalhes para a sessão de `T-15` aproveitar:

- **1 a 3 tentativas não decidiriam nada nem com o instrumento bom.** O piso combinado é 30, e
  entre 60% e 80% nem 30 basta. Vale checar se a página deveria dizer isso na tela, em vez de
  depender de o dono lembrar.
- **O resumo colado divergiu da tabela** (`0/2` no texto, `3` na tabela): o `resumo()` foi copiado
  entre o fim de uma tentativa e o fim da seguinte. Inofensivo agora, mas é um número saindo do
  aparelho com contagem diferente da que a tela mostra — e o destino dele é o DECISIONS.

**Rede já escolhida para o re-run, para não se perder:** Claro nos dois aparelhos, 5G nos dois.
Mesma operadora, então o recorte medido será CGNAT da mesma rede — e, pela regra 8 do auditor,
não transfere para operadoras diferentes sem medir de novo.

## `T-15` — auditoria das três saídas (2026-08-08, `evolution-auditor`)

Sessão de evolução convocada para escolher entre as três saídas acima. **Nenhuma das três foi
adotada.** O STEP 0 encontrou uma quarta que as três não consideraram, e que custa menos que
qualquer uma delas — `D-38`. As três viram `D-39`, `D-40` e `D-41`, REJEITADAS.

### Lista-morta percorrida

Os únicos `REJEITADO` do registro são `D-06` (backend Node/Express/MySQL da v1), `D-07` (clubes
reais e escudo de federação) e `D-08` (Godot 4 como engine). Nenhum toca porta congelada nem o
instrumento de medição: **nada nesta sessão é re-proposta de ideia morta.**

Aberto e adjacente — não rejeitado, e por isso citado: `Q-09` (`pending()` na `Session`) e `Q-11`
(`roomId` saindo de M5) são **dois pedidos de mudança em porta congelada já na fila do dono**, e
nenhum dos dois foi decidido. Isto pesa contra a saída (a), e é dito abaixo.

### STEP 0 — fatos observados no sistema real, não citados de memória

1. **`hostRoom` e `joinRoom` diferem em duas coisas, e só:** quem sorteia o ID, e a validação de
   forma. As duas terminam na **mesma** chamada `createChannel(roomId, ice)`
   (`src/net/index.ts:491-511`). O caminho de conexão é idêntico — e o comentário de
   `createChannel` já dizia isso desde T-11: *"`host` só muda quem sorteou o ID; o transporte é
   simétrico"*. A assimetria que o instrumento tentava respeitar **não existe no módulo**.
2. **Rotação de ID válido é sempre aceita por `joinRoom`:** 0 recusas contra `ROOM_ID_RE` em
   1.500.000 IDs rotacionados (50.000 bases × 30 tentativas). E 0 bases com rotações repetidas
   entre si em 200.000 sorteios — base periódica não é risco tratável nesta escala.
3. ⇒ **Existe uma quarta saída:** o anfitrião chama `joinRoom(idDaTentativa(base, n), ice)`,
   exatamente como o convidado. Uma linha em `medicao.ts`, porta de `D-13` intacta.
4. **A saída 4 não deixa nada de M6 sem medir.** `newRoomId` continua exercitado — é ele que
   sorteia a base no botão "Sortear sala" — e `hostRoom` é `newRoomId()` + `createChannel`. A
   medição segue cobrindo 100% do caminho de conexão; o que ela deixa de exercitar é o açúcar.
5. **A rotação só produz 26 IDs distintos** (`k = n % b.length`, e `b.length` = 26): a tentativa
   27 reentra na sala da tentativa 1. Com o piso combinado de 30, **o desenho atual já perde
   independência nas 4 últimas, em silêncio.** Isso não salva a saída (c) — ver abaixo —, mas
   impede de vendê-la como "a única que perde independência".
6. **`medicao.ts` é intestável hoje:** não exporta nada e chama `montar()` no topo do módulo
   (`linha 261`), e nenhum teste da suíte o cita. O portão de `T-15` exige um teste provando que
   os dois lados calculam o mesmo ID — logo **qualquer** das quatro saídas paga primeiro o custo
   de tornar a derivação do ID importável. Nenhuma das três estimativas da nota original incluía
   esse custo; declará-lo é a regra 7 do auditor.

### Tabela priorizada — valor × P(passar) ÷ custo

| # | Saída | Valor | P(passar) | Custo declarado | Veredito |
|---|---|---|---|---|---|
| **4** | **`joinRoom` nos dois lados** | destrava `A-08`, que destrava E-4 | **0,85** | 1 linha + tornar o ID testável (custo comum) | **`D-38` ADOTADA** |
| (a) | `hostRoom(ice?, roomId?)` | idem | 0,15 | + muda porta congelada, + precedente para `Q-09`/`Q-11` | `D-39` REJEITADA |
| (b) | exportar `createChannel` | idem | 0,10 | + superfície de M6 sem a validação de `D-30` | `D-40` REJEITADA |
| (c) | uma sala por medição inteira | idem | 0,05 | + independência perdida na tentativa 2, com viés PARA CIMA | `D-41` REJEITADA |

P(passar) da saída 4 acima da taxa-base de 20–30% **por evidência apresentada, não por gosto**:
o mecanismo foi lido no código (fato 1), a aceitação do ID foi conferida em 1,5 M de casos
(fato 2) e a cobertura preservada foi verificada na definição de `hostRoom` (fato 4). As outras
três não sobem da taxa-base porque compram o mesmo resultado por um preço maior — e preço maior
pelo mesmo resultado é a definição de reprovado, não de segunda opção.

### Portões, escritos ANTES de qualquer experimento

**`D-38` (a mudança).** Um teste, em `src/tests/`, prova que anfitrião e convidado derivam o
**mesmo** ID para a tentativa `n` a partir da mesma base, e que esse ID é aceito por `joinRoom`
(hoje `n` = 0..29). Não pode regredir: a suíte inteira segue verde; `grep -c 'hostRoom('
src/medicao.ts` sai de **2 para 1** — sobra a do botão "Sortear sala", nenhuma dentro de
`tentativa()`; `src/net/index.ts` não muda **nenhum byte**. Uma mudança por vez: o guarda de
`QA-09` é commit separado, senão nenhum dos dois fica atribuível.

**`QA-09` (o guarda, aprovado pelo dono para dentro de `T-15`).** A página mostra, nos dois
aparelhos, o índice da próxima tentativa e os 6 primeiros caracteres do ID que ela vai usar. O
portão é operacional e não automatizável: **o dono confere que os dois aparelhos exibem o mesmo
par antes de tocar.** Limiar: se divergirem, a tentativa não conta e os contadores são zerados
nos dois — não se conserta contador dessincronizado por dedução.

**Portão de `A-08`, que nenhuma saída dispensa.** O piso é **30 tentativas por contador**, e
entre 60% e 80% nem 30 basta para separar do corte de 70% — o intervalo de 30 tentativas a 70%
é largo demais para um corte em 70%. Se a taxa cair nessa faixa, o número **não decide `Q-10`**,
e dizer isso é obrigação: evidência insuficiente reprova por falta de dado, não vira
"provavelmente passa".

### Por que cada uma das três morreu

**(a) `hostRoom(ice?, roomId?)` — morreu no preço de governança.** Compra exatamente o que a
saída 4 obtém de graça, e paga com uma alteração na porta congelada de `D-13` num momento em que
`Q-09` e `Q-11` estão os dois parados esperando justamente esse precedente. Aprovar (a) responde
por acidente duas questões que são do dono, numa sessão que não é sobre elas.

**(b) exportar `createChannel` — morreu na superfície.** `createChannel` não valida o `roomId`;
quem valida é `joinRoom`. Exportá-lo dá a qualquer chamador futuro um caminho para abrir sala
sem passar pela checagem que o portão do defeito 6 (`D-30`) existe para garantir. Alargar a porta
de um módulo para atender **um** instrumento é o pior negócio da lista.

**(c) uma sala por medição inteira — morreu no viés, não só na independência.** O portão do dono
dizia que ela só passaria se a perda de independência fosse aceitável e declarada. Ela não é, e
por um motivo pior do que "tentativas correlacionadas": cada tentativa **reentra na sala que a
anterior acabou de largar**, e `leave()` é assíncrono (`soltarSala`, `src/net/index.ts:317-327`).
Peer que ainda não saiu do ponto de vista da sinalização pode disparar `onPeerJoin` na tentativa
seguinte e virar `'connected'` **sem conexão nova** — sucesso contado sem que nada tenha sido
medido. O viés é **para cima**, e para cima é a direção que faz E-4 fechar indevidamente e o TURN
sair de escopo com um número que não existe. É o espelho exato do `QA-08`, que enviesava para
baixo. *(Mecanismo raciocinado a partir do código, não medido — e é por isso que ele reprova a
saída em vez de virar tarefa de investigação: não se compra risco de viés para economizar uma
linha.)*

### `QA-09` — o índice da rotação é contador por aparelho, e a tela não o mostra

Achado nesta sessão, e **não coberto por nenhuma das quatro saídas**. O `id` da tentativa sai de
`idDaTentativa(base, c.tentativas)`, e `c` é `contadores[modo]` — contador **por aparelho e por
modo** (`src/medicao.ts:118-120`). Host em `n=2` e convidado em `n=1` calculam salas diferentes:
20 s de timeout, contados como falha de P2P.

Dessincroniza de três maneiras, todas plausíveis com dois celulares na mão:

- **um toque a mais** em qualquer dos dois aparelhos;
- **erro de configuração**, que resolve `ok:false` e mesmo assim incrementa o contador
  (`src/medicao.ts:99-103` + `125`) — ver também `QA-10`;
- **checkbox de TURN diferente** entre os aparelhos: aí não é só o índice, é outro contador.

O que torna isto grave é o modo de falha, idêntico ao do `QA-08`: **a tela não mostra índice nem
ID**, então a dessincronia sai como `'failed'` depois dos mesmos 20 s e é indistinguível de P2P
que não conectou. O dono já viu o sintoma da família — o resumo colado divergindo da tabela.
Aprovado para dentro de `T-15` como commit separado.

### `QA-10` — erro de configuração entra no denominador como falha de rede

`tentativa()` captura a exceção de `joinRoom` (ID malformado) ou de `newRoomId` (contexto não
seguro) e devolve `{ ok: false, ms: 0 }` (`src/medicao.ts:98-104`); `rodarUma()` então soma **uma
tentativa e uma falha** (`125-131`). O comentário no código assume isso de propósito, mas a
consequência não estava declarada: **erro do operador vira falha de P2P na taxa que decide a
revisão de `D-01`**, e o viés é para baixo — a mesma direção do `QA-08`.

Basta o `?m=` chegar truncado no outro aparelho (link colado à mão, que é o procedimento) para
que **todas** as tentativas do convidado somem como falha de rede sem uma linha de rede ter sido
exercitada. Não consertado aqui (regra 4): é `medicao.ts`, mas é defeito distinto do `QA-08`, e a
correção — não contar tentativa quando o canal nunca chegou a abrir — muda o denominador, que é
um número de portão.
