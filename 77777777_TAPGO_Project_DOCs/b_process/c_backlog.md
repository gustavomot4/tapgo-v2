---
tags: [backlog]
status: atual
---
# BACKLOG.md — quadro de tarefas (fonte única)

> **Só existe UM backlog: este.** Estado numérico mora no [[a_context_source|CONTEXT]]; aqui, só tarefas.
> Todo card com portão: como se sabe que terminou.

## Ações do dono (máquina real)
- [ ] A-40 — **o link truncado nos DOIS aparelhos: conte os segundos que o anfitrião espera** (`T-38`/`D-96`/`QA-10`) · **Por que é do dono:** o sandbox roda a página com base inválida e conta tentativas, mas quem tem dois aparelhos e uma rede de operadora é ele — e o caso "base VÁLIDA ⇒ botão habilitado" não é exercitável aqui sem abrir websocket para infra pública · **Antes de tudo, publicar:** o `medicao.html` que está no ar é o de antes de `D-96` — sem republicar, o aparelho mede a regra velha · **Como fazer:** sortear a sala no anfitrião, colar o link no convidado **apagando o último caractere**, e tentar tocar 9 vezes nos dois ao mesmo tempo · **Portão, em inteiros:** no convidado, `descartadas por configuração: 1` e placar em `0/0` (nunca `0/9`); no anfitrião, **0** toques e **0 s** de espera, porque não há em que tocar do outro lado · **Segundo toque, com o link ÍNTEIRO:** o botão do convidado tem de estar habilitado e a medição seguir normal — sem isto, `T-38` teria fechado a porta de todo mundo e o portão acima passaria mesmo assim
- [x] A-39 — o MESMO confronto nos dois aparelhos, com a seleção que… · íntegra em [[backlog_archive]]
- [x] A-38 — o ar já é HEAD? conte as bolas de borda inteira no endereço… · íntegra em [[backlog_archive]]
- [x] A-37 — a bola se separa da linha branca? conte as que estão… · íntegra em [[backlog_archive]]
- [x] A-36 — a luva se lê como luva? conte os dedos (T-30) · íntegra em [[backlog_archive]]
- [x] A-35 — a série de revanches no aparelho, e o amarelo no ar (T-32… · íntegra em [[backlog_archive]]
- [x] A-34 — publicar o que já está pronto (T-29/QA-21/A-33) · íntegra em [[backlog_archive]]
- [x] A-33 — o jogo no ar está atrás do repositório? (QA-33/D-72/T-21) · íntegra em [[backlog_archive]]
- [x] A-32 — as camisas na cor nacional, em campo (T-29/D-88) · íntegra em [[backlog_archive]]
- [x] A-31 — a bandeira de tela cheia de T-28, no aparelho… · íntegra em [[backlog_archive]]
- [ ] A-30 — **as duas colunas do desktop, no monitor de verdade** (`T-27`/`D-86`) · **Por que é do dono:** o sandbox mediu geometria e estilo computado, e nada mais — a pane do navegador fica escondida e não compõe quadros, então **não houve captura de tela nenhuma** nesta sessão. Se duas colunas de 485px ficam BONITAS, e se a comparação entre as duas seleções realmente se lê melhor assim, é olho humano; e a direção foi escolhida pelo dono, então a conferência também é dele · **Procedimento:** abrir o jogo no navegador do computador, com a janela MAXIMIZADA, e ir em "Contra o computador" · **Portão — UM número, não quatro sins (a lição de `A-25`..`A-29`):** na altura da primeira linha de cartões, **quantos cartões de seleção aparecem lado a lado atravessando a tela inteira?** Responder com o inteiro. **4** é o layout novo funcionando; **2** é o CSS de `D-86` não tendo pegado, e aí o card reprova · **Duas observações a mais, e só duas, cada uma em uma palavra ou frase curta:** (a) as duas grades ficam lado a lado ou empilhadas? (b) em alguma tela apareceu barra de rolagem **horizontal** — a de baixo? · **O que reprova:** 2 cartões por linha; grades empilhadas com a janela maximizada; ou qualquer barra horizontal · **Trava `T-27`:** sem este número, `T-27` fica SEM CAMPO, do mesmo jeito que `T-24`..`T-26` ficaram até `A-27`..`A-29` · **✔ FECHADA em 2026-08-21 — o dono respondeu `4`, e o card PASSOU.** Relato: *"aparecem 4 seleções, duas minhas e duas do adversário"* · **A forma funcionou, e é a primeira vez em seis cards:** pedir UM inteiro em vez de quatro sins devolveu um número verificável, e as duas observações curtas vieram junto — as grades ficaram lado a lado, sem barra horizontal · **E o número trouxe um achado que o sandbox não tinha:** *"já no TAP GO Cup aparecem apenas 2"* — a tela de começar o torneio usa a MESMA `grade()` de 32 cartões e ficou de fora de `D-86`, porque eu só alarguei o que tinha PAR a formar. Corrigido no mesmo dia (a grade sozinha vira `.solo` e passa a 4 colunas, 241px por cartão contra os 238px das emparelhadas) · **Junto veio a foto do `QA-31`**, que esta sessão tinha registrado e não consertado: o "Sair da disputa" de 144px ficou órfão no meio do cartão largo. Consertado — era `grupo` faltando na classe do bloco
- [x] A-29 — a moeda de T-26 EM MOVIMENTO, no aparelho (P-5/D-85) · íntegra em [[backlog_archive]]
- [x] A-28 — a tabela da TAP GO Cup com pontos REAIS, no aparelho… · íntegra em [[backlog_archive]]
- [x] A-27 — o portão de T-24: dois aparelhos reais, um parado de… · íntegra em [[backlog_archive]]
- [x] A-01 — criar o repositório remoto no GitHub e apontar o local para… · íntegra em [[backlog_archive]]
- [x] A-02 — git init + hook de pre-commit · íntegra em [[backlog_archive]]
- [x] A-03 — ler o CONTEXT inteiro e concordar com cada linha · íntegra em [[backlog_archive]]
- [x] A-04 — responder Q-03: seleções, formato do chaveamento, nome do… · íntegra em [[backlog_archive]]
- [x] A-05 — responder Q-04: o que acontece quando o peer some no meio… · íntegra em [[backlog_archive]]
- [x] A-09 — arquivar decisões antigas: cdecisions.md fechou T-13 com 5… · íntegra em [[backlog_archive]]
- [x] A-10 — encolher as questões abertas do cdecisions.md, que é onde… · íntegra em [[backlog_archive]]
- [x] A-11 — o acontextsource.md está a 17 caracteres do teto de 4.000… · íntegra em [[backlog_archive]]
- [x] A-12 — arquivar decisões de novo, e isto é urgente: a sessão de… · íntegra em [[backlog_archive]]
- [x] A-13 — decidir a estrutura do registro, porque o arquivamento… · íntegra em [[backlog_archive]]
- [x] A-16 — o registro de decisões fechou T-14 com 3 caracteres de… · íntegra em [[backlog_archive]]
- [x] A-14 — passar os olhos no painel do sorteio no celular real, nos… · íntegra em [[backlog_archive]]
- [x] A-17 — jogar a TAP GO Cup até o campeão no celular real, e fechar… · íntegra em [[backlog_archive]]
- [x] A-06 — responder Q-05: o torneio roda também no modo online? · íntegra em [[backlog_archive]]
- [x] A-18 — abrir https://gustavomot4.github.io/tapgo-v2/ no celular e… · íntegra em [[backlog_archive]]
- [x] A-19 — subir a versão para 2.0.0 e republicar · íntegra em [[backlog_archive]]
- [x] A-08 — medir a taxa de conexão em /tapgo-v2/medicao.html, dois… · íntegra em [[backlog_archive]]
- [x] A-07 — publicar: Q-06 respondida (repositório público, D-21)… · íntegra em [[backlog_archive]]
- [x] A-20 — decidir o teto dos TRÊS orçamentos, que fecharam juntos… · íntegra em [[backlog_archive]]
- [x] A-22 — jogar uma disputa online pelo link, em DOIS aparelhos reais… · íntegra em [[backlog_archive]]
- [x] T-23 — fechar QA-26 pela porta M5: par espelhado vira falha… · **Módulo:** M5 · íntegra em [[backlog_archive]]
- [x] A-25 — abrir o MESMO link nos dois aparelhos e tocar numa zona… · íntegra em [[backlog_archive]]
- [x] A-26 — ver o contador de T-22 correndo, em DOIS aparelhos reais · íntegra em [[backlog_archive]]
- [x] A-21 — cobrar por script o teto de "2 frases por linha" dos dois… · íntegra em [[backlog_archive]]
- [x] A-23 — declarar a porta que fecha QA-25: M5 ou M6 (ou não mexer) · íntegra em [[backlog_archive]]
- [x] A-24 — reabrir o link no meio de uma disputa online, em DOIS… · íntegra em [[backlog_archive]]
- [x] T-22 — mostrar os segundos que faltam antes de a conexão cair · **Módulo:** M7 · íntegra em [[backlog_archive]]
## A fazer

> O [[b_plan|PLANO]] está **congelado** (`D-13`). As tarefas abaixo saem dele e seguem a ordem das etapas E-1..E-6. O portão de cada uma é o portão do módulo, e não se repete aqui. Mudança de rumo é `D-NN` novo — não replanejamento.

- [x] T-15 — consertar QA-08 e QA-09 na página de medição · íntegra em [[backlog_archive]]
- [x] T-16 — instrumentar a medição: hoje cada tentativa vale 1 bit… · íntegra em [[backlog_archive]]
- [ ] T-17 — **sorteio de quem cobra primeiro** (`D-48`) · **Módulo:** M2 (a constante `FIRST`), M5 (passar o resultado) e M7 (a tela da moeda) · **Skill:** backend-domain, depois frontend-uiux para a tela · **O que entra:** hoje `src/engine/index.ts` tem `const FIRST: Side = 'A'` e `createMatch()` não recebe nada — um dos lados sempre cobra primeiro. Passa a sair de sorteio com o `Rng` de M1 (`rng.int(2)`), **nunca** do gerador nativo, senão cai o portão de M1 e o critério "roda 2x com o mesmo resultado" · **A ordem NÃO alterna** depois de sorteada, nem nas 5 regulares nem nas alternadas — é a regra da IFAB e é o que M2 já faz, então essa metade custa zero · **Custo declarado:** `createMatch()` ganha parâmetro, e isso é porta congelada por `D-13`; `D-48` é o `D-NN` que autoriza · **`online` é o caso difícil e depende de `Q-11`:** os dois aparelhos têm de sortear o MESMO lado, e hoje não compartilham semente (`SessionConfig.seed` é de quem chama). O valor que os dois já têm em comum é o `roomId` — que M5 não recebe, que é exatamente `Q-11`. Ou seja: o sorteio online **não** abre um bloqueio novo, ele pega carona no que já trava a tela de convite · **Portão:** sorteio uniforme sobre milhares de sementes (nenhum lado acima do esperado), mesma semente = mesmo primeiro cobrador, a ordem constante do início ao fim em disputa completa com alternadas, `grep` do gerador nativo em `src/` continuando em 1, e nos modos `cpu`/`local` a tela mostrando o resultado antes da 1ª cobrança

  **◐ METADE BACKEND FEITA em 2026-08-12 (`cpu`/`local`) — falta a tela.** `createMatch(first: Side)`, parâmetro **obrigatório**: um padrão `= 'A'` devolveria em silêncio o defeito que a tarefa remove, e sem padrão quem esquece é reprovado pelo `tsc`. **Quem sorteia é M5**, com `rng.int(2)` sobre o `Rng` de M1 — M2 recebe o resultado e continua sem conhecer gerador, senão `play` deixaria de ser pura. O sorteio é a **primeira** leitura do gerador da sessão, antes de qualquer `pick` da CPU, e é isso que faz `cpu` e `local` tirarem o mesmo primeiro cobrador para a mesma semente · **Portão cumprido:** uniformidade **A=1.998 · B=2.002 em 4.000 sementes** (faixa de ±5%, determinística — o teste reprova regressão, não mede estatística), mesma semente = mesmo cobrador, ordem constante em disputa completa de 12 cobranças com alternadas (e a alternada começando com o sorteado), `grep` do gerador nativo em `src/` = **1** · **Verificado de fato:** revertendo o sorteio para constante à mão, 2 testes reprovam · **Suíte 351/351** (eram 337) em 3 rodadas, `tsc` limpo, bundle 99.442 → **99.590 B** · **A não-alternância custou zero linha**, como `D-48` previa · **`online` NÃO sorteia** e há teste que reprova quem tentar: sem semente compartilhada os dois aparelhos divergiriam na 1ª cobrança — segue em `'A'` até `Q-11` · **Dois testes antigos que fixavam `'A'` foram consertados** (`session.test.ts` lia `k.dive` fixo; `net.test.ts` fixava o vencedor) e a semente `12345` saiu do teste online por sortear `'B'` · **`QA-15` aberto, não consertado de carona:** `src/ui/rotas.ts` ainda promete que `'A'` começa — é a metade `frontend-uiux`, abaixo
- [x] T-17 — b — tela da moeda (QA-15) · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-12 — torneio e chaveamento · **Módulo:** M8 · íntegra em [[backlog_archive]]
- [x] T-20 — identidade visual: o jogo tem de parecer um jogo · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-14 — telas do torneio: chaveamento, próxima disputa e campeão · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-18 — catálogo real: as 32 seleções no lugar da lista de fixação · **Módulo:** M4 · íntegra em [[backlog_archive]]
- [x] T-19 — as 32 bandeiras com a licença · **Módulo:** M4 · íntegra em [[backlog_archive]]
- [x] T-29 — as 32 cores nacionais na camisa ✔ COM CAMPO em 2026-08-21… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] A-15 — dividir o registro pela terceira vez, ou subir o teto: A-13… · íntegra em [[backlog_archive]]
- [x] T-31 — no online, cada aparelho escolhe a PRÓPRIA seleção (pedido… · **Módulo:** M6 · íntegra em [[backlog_archive]]
- [x] T-33 — cor e legibilidade dos símbolos de papel sobre as linhas do… · **Módulo:** M7 · íntegra em [[backlog_archive]]
## Em andamento (máx 1 — espelha "Em andamento" do [[a_context_source|CONTEXT]])
_(vazio)_

## Feito (mover para cá; detalhe no [[a_changelog|CHANGELOG]])
- [x] T-38 — **`QA-10`: a base inválida recusada antes da 1ª tentativa, e as descartadas viram número visível** (`D-96`, saídas (c)+(b)) · **Módulo:** `src/medicao.ts` só · **Skill:** backend-bff · **Feito em 2026-08-28:** o gatilho é a exceção que `joinRoom` já lança — `src/net/index.ts` sem um byte alterado, `ROOM_ID_RE` nem importado nem copiado; `tentativa()` passou a devolver `abriu`, um **booleano**, e não a string do motivo (casar texto de outro módulo quebra na primeira melhoria de mensagem de lá) · **Portão de DOIS números, medido pelo MESMO arquivo de teste** (o "antes" com `medicao.ts` no `git stash`): convidado **9 -> 0** tentativas contadas em 9 toques (`0/9 = 0.0%` -> `0/0 = —`, com `descartadas: 1`), anfitrião **9 -> 0** toques possíveis e **180 s -> 0 s** queimados · **3º item:** `#estado` com base inválida vai de `falhou após 0 ms` para `erro de configuração: …` · **Não-regressão:** a amostra de `e_qa/` segue **43/43 = 100,0%** e limite inferior **93,3%**, calculado por `0,05^(1/n)` e não copiado · **Custo declarado:** com base válida o convidado abre e fecha um canal na entrada da página — mesmo preço que o anfitrião já paga em "Sortear sala", sobre a mesma sala · **Limite do portão automático:** "base válida ⇒ botão habilitado" não roda no sandbox (abriria websocket para infra pública); é `A-40` · **Resíduo declarado:** base de 26 caracteres do alfabeto porém errada segue descoberta · **Suíte 656 -> 665/665** em 2 rodadas, `tsc` limpo, bundle **414.805 B** inalterado · **Evidência:** [[qa10_denominador_da_medicao]]
- [x] T-37 — o portão de marca de M7 vira teste, nas duas metades (fecha `QA-05`, aberto desde 2026-08-07) · **Módulo:** testes (M4/M7/M1 só nos arquivos de teste) · **Skill:** testing · **Feito em 2026-08-28 (`D-95`):** os 6 termos da lista-morta saem por extenso de `teams.test.ts` e de `ui.test.ts` e passam a ser montados em tempo de execução, com fonte única em `src/tests/lista_morta.ts` — três cópias da mesma lista sairiam de sincronia no dia em que um termo entrasse · **Metade 1:** `grep -rniE` da lista-morta em `src/` de **6 para 0** (5 vinham de `teams.test.ts`, 1 de `ui.test.ts`; a 6ª de `teams` escapava do `-E` por acento) · **Metade 2:** `src/tests/marca.test.ts` varre `src/` INTEIRO, sem filtro de extensão (fail-closed), e planta cada um dos 6 termos num arquivo de `src/`, medindo por DELTA e apagando no `finally` · **Verificado de fato:** termo plantado à mão em `src/main.ts` REPROVA 2 casos; plantado em `src/ui/rotulos.ts`, 9 · **Custo declarado:** `core.test.ts` ignora o nome do arquivo plantado — ele varre `src/` inteiro e roda em paralelo com `marca.test.ts`, e sem isso a suíte ficaria instável (regra 10) · **Suíte 638 -> 656/656** em 2 rodadas, `tsc` limpo, bundle **414.805 B** inalterado (nada de `index.html` alcança os arquivos novos)
- [x] T-34 — vite.config.ts dentro do tsc --noEmit (fecha QA-04, aberto… · **Módulo:** M9 · íntegra em [[backlog_archive]]
- [x] T-36 — o bundle medido é só o grafo de index.html (fecha QA-06… · **Módulo:** M9 · íntegra em [[backlog_archive]]
- [x] T-30 — luva e bola no lugar do triângulo e do arco, e maiores… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-32 — contador de vitórias na série de revanches (pedido do dono… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-28 — a bandeira de quem cobra primeiro, grande, e o papel… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-27 — o desktop deixa de ser a coluna de 420px (P-1+P-7 no mesmo… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-26 — a moeda do sorteio animada dentro do painel (P-5, escolhido… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-25 — a coluna "Pts" na tabela da TAP GO Cup (P-2, escolhido pelo… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-24 — tempo por cobrança no online (Q-15 respondida: 15 s, e quem… · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-21 — a tela de convite do modo online · **Módulo:** M7 · íntegra em [[backlog_archive]]
- [x] T-13 — modo online da sessão, sobre o canal de T-11 · **Módulo:** M5 · íntegra em [[backlog_archive]]
- [x] T-00 — Fase 0: CONTEXT, temas de domínio e candidatas a D-NN
- [x] T-01 — Fase 1a: D-01 e D-02 congelados com gatilho de revisão; Q-01→D-09 e Q-02→D-10
- [x] T-11 — transporte P2P: canal, ID de sala, timeout e instrumento da… · **Módulo:** M6 · íntegra em [[backlog_archive]]
- [x] T-10 — M7: telas jogáveis por toque em 360x640 · íntegra em [[backlog_archive]]
- [x] T-02 — Fase 1b: PLANO com M1..M9 e etapas E-1..E-6 · íntegra em [[backlog_archive]]
- [x] T-03 — Fase 1c: consistência entre os quatro artefatos · íntegra em [[backlog_archive]]
- [x] T-04 — núcleo: tipos e gerador com semente · **Módulo:** M1 · íntegra em [[backlog_archive]]
- [x] T-06 — motor da disputa, com os invariantes como teste · **Módulo:** M2 · íntegra em [[backlog_archive]]
- [x] T-07 — CPU em 3 níveis, dois histogramas, teto de 70% medido por… · **Módulo:** M3 · íntegra em [[backlog_archive]]
- [x] T-08 — catálogo de seleções, lista de fixação até A-04 · **Módulo:** M4 · íntegra em [[backlog_archive]]
- [x] T-09 — sessão de disputa nos modos cpu e local, já reexportando os… · **Módulo:** M5 · íntegra em [[backlog_archive]]
- [x] T-05 — esqueleto de build e publicação no Pages · **Módulo:** M9 · íntegra em [[backlog_archive]]
## Pedidos do dono - 2026-08-20 (frontend/M7, ainda SEM compromisso)

> A integra (o que ja existe, o custo real, o que trava, e a resposta do dono) esta em
> [[pedidos_do_dono_260820|pedidos do dono]]. Aqui fica so o destino de cada um.

- **P-1** desktop e a tela esticada - **VIROU `T-27`**, feito 2026-08-20
- **P-2** pontos na tabela da Cup - **VIROU `T-25`**, feito 2026-08-20
- **P-3** ver o chaveamento inteiro - **ABERTO**: `D-NN` do dono, M7 interpreta `TournamentState` ou 6o metodo em M8
- **P-4** emocao (torcida, taca, trilha) - **ABERTO**: reabre `D-65`, `D-NN` do dono
- **P-5** moeda do sorteio animada - **VIROU `T-26`**, feito 2026-08-20
- **P-6** papel lido numa olhada - (a) **VIROU `T-28`**, feito; (b) **VIROU `T-29`, parado em `Q-16`** - a medicao derrubou a premissa
- **P-7** selecao organizada no desktop - **VIROU `T-27`** junto de `P-1`, feito 2026-08-20
- **P-8** sorteio em tela cheia - **ABERTO**: `D-NN` do dono

## Ideias (não comprometidas)
- **Sala de 8 — torneio no modo `online`. Adiada por `D-56`**, não rejeitada: exigiria o chaveamento como estado compartilhado entre aparelhos, o que muda a camada 3 do PLANO. Volta à mesa como `D-NN` novo, nunca como "só ligar o online no torneio"
- Ranking global (exige servidor autoritativo — hoje colide com "custo R$ 0"; ver [[online_p2p]])
- Personalização de escudo pelo jogador (contorna licença e vira conteúdo próprio)
- Modo treino: mesma zona repetida, para medir leitura do goleiro
