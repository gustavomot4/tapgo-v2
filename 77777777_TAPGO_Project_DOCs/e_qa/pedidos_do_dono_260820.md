---
tags: [pedidos, dono, historico]
status: atual
data: 2026-08-20
---
# Pedidos do dono - 2026-08-20 (frontend/M7)

> Integra retirada do [[c_backlog|BACKLOG]] quando o teto do quadro apertou: 11.139
> caracteres de analise que nao sao card nem tarefa. **Nada foi cortado** - o quadro
> guarda um ponteiro por `P-NN` com o destino de cada um.

> Levantados pelo dono depois de `A-24`. **Nenhum deles é card ainda**: cada um traz o que já
> existe, o custo real e o que o trava. Vira `T-NN` quando o dono escolher a direção — a maioria
> é gosto e produto, logo `D-NN` dele (regra 6). Ordem aqui é de leitura, não de prioridade.
> **`T-24` já foi usado** no desempate de `QA-28` (2026-08-20): é o "tempo por cobrança no
> `online`" de `Q-15`, e está em "A fazer". O próximo card destes pedidos é `T-28`, e o dono escolhe entre `P-6` (papel legível sem texto, respondido por ele em 2026-08-21) e `P-8` (sorteio em tela cheia, pedido no mesmo dia): `T-25` é `P-2`, `T-26` é `P-5` e `T-27` é `P-1`+`P-7`, os três fechados — `T-27` com campo em 2026-08-21.
> **ESCOLHIDOS pelo dono em 2026-08-20, nesta ordem:** `P-2` (pontos, quase de graça) · `P-5`
> (moeda animada dentro do painel de `D-49`) · `P-1`+`P-7` **no mesmo card** (desktop e
> seleções disputam a mesma folha) · `P-6` entra junto de `P-1` se couber, senão é card
> próprio. `P-3` (chaveamento) e `P-4` (emoção) ficam para depois: os dois pedem decisão de
> contrato ou reabertura de `D-65`, e a folga do registro não comporta `D-NN` até `A-21` — **destravado por `D-82` em 2026-08-20**.

- **(P-1) Desktop é a tela do celular esticada.** Medido: `.tapgo` tem `max-width: 420px`
  (`src/ui/estilo.css:69`) e o **único** ponto de quebra de layout, `min-width: 480px`
  (`:1122`), não alarga nada — só vira cartão com borda e sombra. Em 1920px sobram ~1500px
  **por construção** · **Não é defeito de CSS, é decisão que nunca houve:** o portão de `T-20`
  cobrava "360x640 **e** no desktop", mas o que ele cobra no desktop é ausência de rolagem
  horizontal, não composição · **Custo:** nenhuma tela de M7 tem teste (`vitest` roda em Node
  sem DOM), então cada layout novo é conferência no aparelho; e `D-65` é a folha herdada, logo
  a direção larga tem de nascer dentro dela · **Trava:** direção de layout é `D-NN` do dono · **✔ VIROU `T-27` (com `P-7`) e está feito (2026-08-20)** — `D-86`: a largura passou a ser declarada pela tela, e as que emparelham vão a 1040px em duas colunas. Falta o campo de `A-30`
- **(P-2) Pontos na tabela da TAP GO Cup.** Hoje `Standing` traz `wins`, `goalsFor`,
  `goalsAgainst` (`src/tournament/tabela.ts:19`) · **É de graça e não muda ordenação:** a
  disputa nunca empata (`D-09`), então **pontos = 3 x vitórias**, exatamente — render puro em
  M7, zero byte em M8 · **O cuidado:** o desempate de `D-53` é confronto direto -> saldo -> gols
  -> sorteio, e uma coluna "Pts" não pode sugerir que empate de pontos se resolve por outra
  regra · **Trava:** nada. É o mais barato da lista · **✔ VIROU `T-25` e está feito (2026-08-20)** — a coluna existe na tela, a nota abaixo dela nomeia a cascata de `D-53` e M8 não mudou um byte
- **(P-3) Ver o chaveamento inteiro, os resultados das outras disputas e quem passou.**
  **O dado JÁ EXISTE inteiro:** `TournamentState` guarda `entrants` (as 32 já sorteadas, 4 por
  grupo), `groupOrder`, `results`, `goalsA`, `goalsB` — as 64 disputas (`src/tournament/index.ts:47`)
  · **O que falta é um leitor legítimo:** o retrato é declarado **opaco** ("M7 não interpreta
  nenhum campo daqui", `:41`) e `Tournament` expõe 5 métodos, nenhum de leitura de fase ·
  **Duas saídas, as duas `D-NN` do dono:** (a) M7 passa a interpretar `TournamentState` — barato
  em código, caro em contrato, mata a opacidade que `D-68` grava; (b) 6º método em M8, que é o
  precedente de superfície que `D-39` recusou comprar · **Limite a declarar ANTES de desenhar:**
  as disputas **do jogador** não têm placar, só vencedor — `report(winner)` é porta congelada
  (`D-13`/`D-58`) e `Q-13` é exatamente isso; a tela mostraria `—`, como `D-67` já faz
- **(P-4) Emoção: torcida comemorando/lamentando, taça, medalha de 2º e 3º, trilha nos menus.**
  **Precedente bom, e é melhor do que parece:** os 3 efeitos de áudio são **autorais e gerados
  por script** (`src/scripts/gen-audio.mjs`, `src/ui/som.ts:3`), determinísticos e com linha de
  procedência — trilha pelo mesmo caminho **não** compra licença de terceiro · **Bundle não é o
  gargalo:** 415.713 B de 8 MB (5,2%) · **O gargalo é `D-65`**, que é restrição permanente:
  "capa e profundidade feitas só de degradê (**zero asset**)" e "movimento restrito a
  `opacity`/`transform`". Torcida e taça animadas **reabrem `D-65`** -> `D-NN` do dono ·
  **E `prefers-reduced-motion` continua valendo**, e a preferência "som" já existe e desliga
- **(P-5) A moeda do sorteio, animada.** **Atenção à lista-morta:** `D-49` já recusou a
  **tela da moeda** — 3º toque num fluxo com portão de 2 toques —, e o sorteio virou painel
  dentro da cobrança · **Ângulo novo, e ele é legítimo:** animar a moeda **dentro do painel que
  já existe**, sem toque a mais e sem tela nova, não é o que `D-49` matou · **Custo:** só
  `opacity`/`transform` para caber em `D-65`; `A-14` já confirmou no aparelho que o painel
  aparece antes do 1º toque e some depois · **✔ VIROU `T-26` e está feito (2026-08-20)** — a marca gira uma vez
  dentro do painel, só `opacity`/`transform`, e a tela de cobrança continua com os mesmos 4 botões
- **(P-6) O papel (ataca/defende) tem de ser lido numa olhada, sem texto.** **NÃO é `QA-NN`:**
  o dono esclareceu em 2026-08-20 que não chegou a confundir em partida — o defeito é de
  intuição, não de correção. Hoje o papel vem **só de texto**: a faixa (`tela_cobranca.ts:290`)
  e o `aria-label` das zonas (`:265`); o destaque no placar aponta o **lado deste aparelho**,
  não o papel · **O pedido:** cor e/ou imagem carregando o papel, para não ser preciso parar e
  ler · **Duas restrições que a proposta tem de respeitar, e elas são portão, não gosto:**
  (1) **cor não pode ser o único canal** — daltonismo; precisa vir com forma, ícone ou rótulo
  junto; (2) o contraste ≥4,5:1 é **cobrado por teste** sobre o produto cartesiano da paleta
  (`T-20`), então cor nova entra na paleta, não ao lado dela · **Onde encostar sem inventar
  tela:** as três zonas já mudam de `aria-label` por papel, e o painel de `D-49` já existe ·
  **RESPONDIDO pelo dono em 2026-08-21, e ele abriu o pedido:** concorda que cor não pode ser o
  único canal, e propõe — sprites melhores, animação mais fluida, jogadores "seguindo as cores
  corretas dos países" (Brasil amarelo, Espanha vermelho, Holanda laranja), a bandeira de quem
  está batendo, ou uma animação rápida. Pediu recomendação: *"veja o que melhor conecta"* ·
  **O que a checagem de licença devolveu, e ela DESTRAVA metade do pedido:** [[licenciamento]]
  lista "Cores nacionais e padrões genéricos (listras, faixas)" como **livre**, com uma condição —
  "não reproduzir uniforme oficial identificável". Então camisa amarela para o Brasil é permitida;
  o proibido é a camisa RECONHECÍVEL (escudo, gola, patrocínio, listra exata). O comentário de
  `sprites.ts` que diz "o matiz não representa cor nacional nenhuma" descreve uma ESCOLHA de
  `T-10`, não uma proibição — e é bom que fique escrito, porque a próxima sessão leria aquilo
  como portão · **A recomendação, e ela se divide em duas de custo muito diferente:** (a) **a
  bandeira de quem cobra, grande, mais um segundo canal de FORMA** — as 32 bandeiras já estão no
  bundle por `T-19`, já têm licença conferida, e forma+bandeira resolve daltonismo sem cor nova
  na paleta: é o mais barato e o que mais conecta; (b) **a camisa na cor nacional** é legítima mas
  pede tabela curada de 32 cores (dado novo, não derivável — regra 5), muda a marca da seleção em
  TODA tela, e cada cor tem de passar no teste de contraste de `T-20`, que cobre o produto
  cartesiano da paleta · **De quebra, (b) fecharia `QA-20`:** o matiz de hoje é hash e dá 30 cores
  para 32 seleções (`FR`/`NL` e `MA`/`EG` colidem) — tabela curada não colide por construção ·
  **Trava:** as duas são `D-NN` do dono. (a) cabe num card só; (b) é card próprio, com a tabela
  das 32 cores entrando como DADO revisado por ele · **✔ (a) VIROU `T-28` e está feito, com campo
  em `A-31`** · **◐ (b) VIROU `T-29` em 2026-08-21, e a tabela está montada e medida em
  [[cores_nacionais]] — mas o card parou em `Q-16`, porque a MEDIÇÃO derrubou a premissa que este
  pedido escreveu:** "tabela curada não colide por construção" é **falso**. Quatorze das 32 têm
  vermelho como cor nacional, e a tabela dá **15** matizes distintos para 30 seleções contra os
  **30** do hash de hoje — 33,1% dos pares abaixo dos 40° de `SEPARACAO_MINIMA`, contra 20,4%. Ela
  **não fecha `QA-20`; piora o número dele** · **O portão de contraste que este pedido ergueu é
  vazio para uma tabela de matizes:** varredura dos 360 matizes, pior caso 7,28:1 contra o limite
  de 4,5:1 — saturação e luminosidade são fixas por papel, e o matiz não decide contraste ·
  **Duas seleções reprovam e voltaram ao dono sem ajuste meu:** `GB-ENG` e `DE`, que são branco e
  branco/preto, não um ângulo de matiz
- **(P-7) Seleção de time melhor organizada no desktop.** Filha de (P-1): a grade é
  `repeat(2, 1fr)` (`estilo.css:318`) dentro da mesma coluna de 420px. Decidir junto com (P-1),
  senão são duas mudanças disputando a mesma folha · **✔ VIROU `T-27` junto de `P-1` e está feito
  (2026-08-20)** — a grade continua `repeat(2, 1fr)`, mas as DUAS grades ficam lado a lado no
  desktop: 4 cartões por linha e metade da altura
- **(P-8) O sorteio de quem bate primeiro em TELA CHEIA, encolhendo para o painel no fim.**
  Pedido do dono em 2026-08-21: *"devia ser grande e ocupar a tela inteira para ser mais visível
  para todos os usuários, aí quando acabar a animação pode ficar pequeno no canto que já está"* ·
  **NÃO é o que `D-49` matou, e o argumento é o mesmo de `D-85`:** `D-49` recusou a **tela da
  moeda** porque ela custava o 3º toque num fluxo com portão de 2. Uma sobreposição que aparece
  sozinha, roda e sai sozinha não pede toque nenhum — o fluxo continua fechando em 2 · **O que já
  existe e serve de base:** `D-85` gira a marca uma vez dentro do painel, com o guarda de
  transição escondido -> visível que impede recomeço a cada `desenhar()` (o caso do `online`) ·
  **Três restrições que a proposta tem de respeitar, e são portão, não gosto:** (1) só
  `opacity`/`transform`, senão reabre `D-65`; (2) o toque **não pode se perder** durante a
  animação — é o item (2) do portão de `A-29`, e sobreposição em tela cheia é justamente o que
  rouba toque, então ela precisa de `pointer-events: none` ou de saída imediata ao primeiro
  toque; (3) com `prefers-reduced-motion` ligado a sobreposição não pode piscar nem travar a
  tela — o bloco global zera duração E atraso, então o estado final tem de ser "já saiu" ·
  **Trava:** é `D-NN` do dono — muda a primeira coisa que se vê em toda disputa

> **Licenciamento, sobre a imagem de referência que o dono anexou:** o **layout** de chaveamento
> é imitável à vontade. O que **não** entra, por restrição inegociável do CONTEXT e por
> [[licenciamento]]: a **taça** (marca de federação), o nome "Copa do Mundo"/"FIFA" e a marca do
> veículo. O torneio do jogo é a **TAP GO Cup** (`D-55`), e as bandeiras já entraram por `D-54`.

