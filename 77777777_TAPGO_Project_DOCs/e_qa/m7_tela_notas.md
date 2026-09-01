---
tags: [notas, m7]
status: atual
---
# M7 — notas (evidência longa de `D-27`, `D-28`, `QA-05` em `T-10`; `D-67` e `D-68` em `T-14`)

> **Este arquivo não define ID.** As decisões vivem em `a_context/c_decisions.md`; aqui fica só a
> evidência que não cabe no teto de 2 frases por linha daquele registro. Nenhuma sessão precisa
> ler esta página para trabalhar — o raciocínio que um implementador usa está nos comentários de
> `src/ui/`, onde ele vai olhar de verdade.

## `D-27` — por que a tela não é Phaser inteira

`D-02` congelou "Phaser 3" e o contrato de M7 se chama "Tela (Phaser)". O portão da skill
`frontend-uiux`, porém, exige três coisas de toda tela do fluxo crítico: **teclado percorrendo o
fluxo, foco visível e rótulo lido por leitor de tela**. `<canvas>` não entrega nenhuma das três —
`Tab` não alcança nada dentro dele, não há anel de foco, e um leitor de tela vê um retângulo vazio.

Os dois portões não fecham juntos em canvas puro. As três saídas possíveis eram:

| Saída | O que custava |
|---|---|
| Phaser em tudo | acessibilidade vira exceção declarada — e exceção de acessibilidade não volta atrás barato |
| DOM em tudo, Phaser adiado | contraria a letra de `D-02`, e a animação da cobrança teria de ser reescrita depois |
| **DOM + Phaser só na cobrança** | a escolhida: nenhum portão cede |

A fronteira ficou assim: **Phaser desenha, o DOM recebe o toque.** As três zonas são `<button>`
posicionados por cima do canvas (`.zonas` em `estilo.css`), com um terço da largura do campo cada
— em 360 px isso passa de 110 px por alvo, contra o mínimo de 48. Dedo e teclado usam o mesmo
elemento, então não existe um segundo caminho de entrada para manter em dia.

`src/ui/cena.ts` é o **único** arquivo do módulo que importa `phaser`, e entra por `import()`
dinâmico. Consequência medida, não estimada:

```
inicial : 80.604 B  (1,01% do teto de 8 MB)   ← Phaser NÃO está aqui
cena-*.js : 1.210.538 B  (333 KB gzip)        ← chega enquanto a pessoa escolhe as seleções
dist/   : 1.291.994 B
```

O aquecimento é pedido pela tela de seleções (`Contexto.aquecerCena`), não pela de cobrança: assim
a espera cai no intervalo em que a pessoa já está ocupada escolhendo.

**Se o `import()` falhar, a disputa continua jogável.** Os botões são DOM e não dependem do canvas;
o que aparece é "Campo simplificado — o jogo continua igual", sem nada técnico na tela. É o que
impede um pacote que não chegou de derrubar o modo local junto.

## `Q-09` — respondida por `D-107`: a derivação É a resposta, e o gatilho que a revisa

**Respondida em 2026-09-01 (`D-107`).** A saída que a questão carregava desde 2026-08-08 —
`pending(): Side | null` na `Session` — fica **REJEITADA**, e a derivação que T-10 consumiu deixa
de ser lacuna declarada: ela é a resposta. O que a derivação faz continua o mesmo, e o teste de
T-09 continua sendo quem a prende — **notificação com o mesmo `kicks.length` da anterior significa
escolha pendente**, isolada em `src/ui/derivacao.ts`, módulo puro com teste próprio.

### Por que a porta não muda — três razões, na ordem em que pesaram

1. **O precedente já existia, e nasceu citando esta questão.** `D-39` recusou `hostRoom(ice?,
   roomId?)` com a frase "compra o que `D-38` dá de graça, pagando com precedente em porta
   congelada — e `Q-09`/`Q-11` esperam esse precedente". Quem escreveu `D-39` sabia que a próxima
   fila era esta. Adotar `pending()` agora não abriria um precedente: **quebraria um**.
2. **O custo que a questão orçava era de um repositório que não existe mais.** A nota dizia
   "qualquer outro consumidor de `Session` teria de reimplementá-la" — verdade sobre um consumidor
   hipotético. Medido em 2026-09-01, os importadores de `src/session/` são **`src/ui/` (10
   arquivos) e `src/tests/` (4)**, e mais nada; o desenho de M5 no [[b_plan|PLANO]] chama a porta
   de "o único caminho da tela até o motor", ou seja, o segundo consumidor não está previsto. É a
   régua de [[d_agent_learnings|LEARNINGS]] de 2026-09-01: estimativa dentro de registro é
   hipótese a reverificar, não fato herdado.
3. **A porta cobriria só metade do problema.** `pending()` daria o lado pendente do modo `local`,
   mas `derivacao.ts` continuaria de pé por causa do `online`: lá chegam notificações com o mesmo
   `kicks.length` que **não** são vez de ninguém — a própria escolha esperando o peer, e cada
   troca de `LinkStatus` (`T-21`). Trocar contrato congelado por meia simplificação é o pior dos
   dois mundos: paga o preço inteiro e deixa o arquivo no lugar.

### O gatilho (`D-43`: mora no que ele mede)

`D-107` não fecha a porta para sempre — fecha enquanto a premissa da razão 2 valer. **Um
importador de `src/session/` fora de `src/ui/` e de `src/tests/` reabre a questão como `D-NN`
novo**, e a saída a reexaminar é a mesma `pending(): Side | null`. A variável é contável de fora,
com a régua das checagens de camada do CI:

```bash
grep -rlE "from '[^']*session" src/ --include=*.ts | grep -v "^src/ui/\|^src/tests/" | wc -l
```

Esperado: **0**. Desde `T-39` (2026-09-01) isto é **portão do CI**, dentro das "checagens de
camada" do `.github/workflows/pages.yml`: acima de 0 o passo reprova, nomeia os arquivos e diz que
`Q-09` reabre como `D-NN` novo. O passo foi visto reprovando com um importador plantado fora de
`src/ui/` e `src/tests/`, e voltando a passar depois de removido — grep nunca visto reprovando é
decoração. Os comentários de `src/` que citavam a questão apontam para cá em vez de repetir o
raciocínio.

### O que a derivação **não** faz (inalterado)

Guardar a zona escolhida. No modo `local` os dois jogadores olham a mesma tela, e uma zona
destacada enquanto o goleiro escolhe tornaria o modo injogável. A zona fica dentro de M5, onde já
estava; a tela só recebe "há escolha pendente" e mostra "passe o aparelho".

## `D-28` — por que o áudio é gerado por script

O portão de licença de M7 é a tabela de procedência de [[licenciamento]], e a diferença entre
"declarei que é autoral" e "é conferível que é autoral" é um script determinístico.
`src/scripts/gen-audio.mjs` gera os três efeitos de senoides e de ruído de um LCG com semente
fixa — sem gerador nativo, sem sample, sem download. Rodar de novo reproduz os mesmos bytes, e a
tabela guarda o SHA-256 de cada um.

Nenhuma imagem entrou em T-10: campo, gol, rede e bola são primitivos de `Graphics`
(`src/ui/cena.ts`), e a identidade de seleção é o código ISO num disco cuja cor sai do próprio
código. Não é bandeira, não imita nenhuma, e sai quando `A-04` entregar as bandeiras de verdade.

## `QA-05` — o portão de marca de M7 não pode retornar zero hoje

O contrato de M7 manda `grep -rniE "fifa|copa do mundo|…"` em `src/` retornar zero. Ele retorna
**6**, todas em `src/tests/teams.test.ts` (T-08), que escreve os termos por extenso para testar
exatamente essa proibição. `src/tests/core.test.ts` já resolvia o mesmo problema montando a agulha
em tempo de execução (`['Math','random'].join('.')`), e o `ui.test.ts` de T-10 seguiu essa
convenção — por isso T-10 não acrescentou nenhuma ocorrência nova.

Corrigir `teams.test.ts` é trocar seis literais por concatenação. Não foi feito de carona porque o
arquivo é de outro dono e a regra 4 manda registrar, não consertar.

## O que T-10 **não** cobriu

- **Fps no celular real.** O gatilho de `D-02` é "< 30 fps no fluxo crítico em 360x640 no celular
  real do dono". O sandbox não mede fps; o número só existe no aparelho, e é do dono.
- **Tela de torneio.** É `T-14`, bloqueada por `A-04` e `A-06`.
- **Modo `online`.** `createSession` o recusa em voz alta; é `T-13`.
- **Bandeiras.** `flag` é `null` em todo o catálogo (`D-22`), e a tela diz isso na abertura em vez
  de fingir que a lacuna não existe.


## `D-67` — a coluna de gols da tabela do grupo (`T-14`, resposta parcial a `Q-13`)

`report(winner)` carrega o vencedor e nada mais — porta congelada por `D-13`/`D-58`. M8 grava o
placar da disputa do jogador como `GOLS_DESCONHECIDOS` e **não** o soma na tabela. A pergunta que
sobrou para a tela é o que mostrar na coluna de gols, e as três saídas eram:

1. **`0 × 0`** — o que sai de `Standing` se ninguém pensar no assunto. É dado inventado: zero é um
   número, e nenhuma dessas disputas foi medida. Reprova pela regra 5 do kit.
2. **Esconder a coluna** — perde informação verdadeira. As outras três seleções do grupo jogam
   entre si, e esses placares existem.
3. **A escolhida:** a linha do jogador mostra `—`; as outras três mostram a soma do que se sabe; e
   uma nota abaixo da tabela diz o que a coluna deixa de fora.

A assimetria não é gosto, é a forma do dado. **A linha do jogador só contém disputas dele** — as
três do grupo são todas contra ele —, então `goalsFor`/`goalsAgainst` ali são zero **estrutural**,
hoje e sempre, nunca uma medição. Já as outras três têm duas disputas medidas e uma sem placar (a
que jogaram contra o jogador): o número delas é verdadeiro, só que parcial, e é disso que a nota
trata. O traço leva `aria-label` próprio: quem usa leitor de tela ouviria "menos".

O custo em `Q-13` continua de pé e é do dono: o desempate por saldo compara, dentro do grupo do
jogador, quem tem 2 placares com quem tem 0. Fechar isso exige mexer na porta de M8.

## `D-68` — por que o gravado tem uma camada em volta do retrato de M8 (`T-14`)

O plano diz que M7 persiste "o `TournamentState` que M8 devolve por `toJSON()`", e que esse
retrato é **opaco para quem lê**. A tela precisa de dois dados que o retrato tem mas que ela não
pode interpretar sem quebrar essa cláusula — e que, olhados de perto, são **de M7**, não de M8:

- **qual seleção é a da pessoa.** Decide de quem é a tabela de grupo mostrada e de que lado o
  jogador entra na cobrança. Derivá-la de `current()` cobre só parte do torneio: eliminado o
  jogador, `current()` devolve `null` e o dado some justo quando a tela do campeão precisa dele.
- **o nível com que o torneio começou.** A preferência do aparelho muda a qualquer momento; o
  nível dentro de M8 não. Sem guardá-lo, quem trocasse o nível no menu no meio da competição
  jogaria as próprias disputas num nível e as simuladas em outro — a progressão que `D-60` recusa.

Por isso o registro é `{ v, humana, nivel, estado }`: `estado` atravessa sem ser lido, e os dois
campos de M7 ficam do lado de fora. `nivel` é **índice** de `NIVEIS`, nunca o texto `'hard'` — o
portão de `T-14` cobra "só código de país e inteiro" no que vai ao armazenamento.

O preço é a mesma verdade em dois lugares, e ele é pago na leitura: `restaurarTorneio` cruza a
`humana` gravada com `group()` e com `current()` (portão de M8: o par sempre contém o jogador), e
registro que não fecha é descartado em silêncio como qualquer outro lixo.
