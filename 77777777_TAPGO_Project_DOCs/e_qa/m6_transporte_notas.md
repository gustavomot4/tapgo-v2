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
