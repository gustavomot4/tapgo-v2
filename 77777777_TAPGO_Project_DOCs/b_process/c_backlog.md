---
tags: [backlog]
status: atual
---
# BACKLOG.md — quadro de tarefas (fonte única)

> **Só existe UM backlog: este.** Estado numérico mora no [[a_context_source|CONTEXT]]; aqui, só tarefas.
> Todo card com portão: como se sabe que terminou.

## Ações do dono (máquina real)
- [ ] A-42 — **o ar já carrega a CPU de `D-103`? conte os mergulhos do goleiro na SUA zona** (`D-103`/`D-104`/`D-105`) · **Por que é do dono, e são duas causas:** (1) o endereço público só existe fora do sandbox — custo R$ 0 e segredo não versionado, a mesma causa de `A-38`; (2) **a versão não tem onde ser lida no ar**: nenhuma tela do jogo imprime `2.0.0` — a varredura de `src/ui/` e `src/index.html` só acha comentário e chave versionada de `localStorage` [Fonte: src/ui/preferencias.ts:26; src/ui/torneio_salvo.ts:44]. Portão que mandasse "confira a versão no endereço público" não teria onde olhar; por isso este cobra **comportamento** · **O achado desta sessão TROCA O VERBO do card, como em `A-38`:** ele nasceu "publicar `D-103`..`D-105`". Medido: `origin/main` está em **`9c925ff`**, que já contém **`63ff3b7`** — a CPU de `D-103` —, e o workflow publica a cada `push` em `main`, com o portão inteiro antes (`tsc`, `npm test`, checagens de camada, `build`) [Fonte: `git reflog show origin/main`; .github/workflows/pages.yml:14-17 e :50-88]. Faltam ao ar **dois** commits, `8afabb1` e `dab9371`, e os dois são só comentário e documento — `git show 8afabb1 -- src/` não traz uma linha de código, só duas linhas `//`. Então este card **empurra e CONFIRMA**; não existe `dist/` a publicar à mão · **Procedimento, passo 1 — o push:** `git push`. A execução de `pages` que sair dele é a que responde o passo 2 · **Passo 2 — o bundle, e ele NÃO é mais o do CONTEXT:** os **414.974 B** de hoje saíram de um `dist/` de **2026-08-29**, anterior a `D-103`, que somou `complementCounts` a `src/cpu/index.ts` — arquivo do grafo de `index.html`, logo dentro do que o medidor conta (`D-93`) [Fonte: `node src/scripts/bundle-size.mjs` sobre o `dist/` local, que devolve exatamente 414.974 B; `ls -l dist/`]. Leia o número novo no passo **build** do log da execução: é o `dist/` que foi ao ar, não uma cópia local. **Anote os dígitos** — é ele que substitui os 414.974 B no CONTEXT, por substituição · **Passo 3 — o comportamento, e é aqui que mora o inteiro:** abra o endereço público com **recarga forte** (Ctrl+Shift+R), "Contra o computador", nível **Difícil**. Jogue **20 cobranças SUAS**, em quantas disputas forem precisas — cada disputa e cada revanche cria sessão nova e zera o histórico da CPU, e o portão já conta com isso [Fonte: src/ui/tela_cobranca.ts:155]. Em todas elas: **chute sempre na ESQUERDA** e, quando for sua vez de defender, **defenda sempre na DIREITA**. As duas zonas precisam ser diferentes: é o que separa as hipóteses — `D-103` faz o goleiro ler o que você CHUTA, o código anterior lia o que você DEFENDE · **Portão — TRÊS contagens que somam 20**, uma por zona em que o goleiro da CPU mergulhou nas suas 20 cobranças; **esquerda + meio + direita = 20** é a conferência de que nenhuma escapou: **esquerda ≥ 9 APROVA** (o ar carrega `D-103`; esperado ~13 de 20) · **direita ≥ 9 REPROVA** (o goleiro está lendo suas DEFESAS, o ar é anterior a `D-103`) — registre `QA-NN` e não feche o card · **as duas ≤ 8 é inconclusivo**: jogue mais 20 e some as duas séries, com o corte em **18 de 40** · **De onde saem 9 e 18:** simulação da `zoneDistributionPpm` no nível difícil, com o histórico zerando a cada disputa — 20.000 séries por hipótese. Com disputas de 5 cobranças, `≥ 9` acerta 97,2% das séries novas e acusa 0,5% das velhas; encurtando toda disputa para 3 cobranças (o pior caso) ainda são 92,6% e 1,3%. Em 40, o corte 18 dá 96,6% contra 0,07% no pior caso · **O que NÃO se mede aqui, declarado:** `D-104` e `D-105` são testes — não têm face na tela e nenhum toque os verifica; quem os cobra é o passo `suíte` do workflow, que roda antes de publicar. E o inteiro é de **frequência**, não de igualdade: ele separa as duas hipóteses, não prova a distribuição
- [x] A-41 — **o MESMO primeiro cobrador nos dois aparelhos** (`T-17`/`D-98`) · **Por que é do dono:** o sandbox não compõe quadros — o que este card mede é a frase anunciada no topo de DUAS telas —, e não existe aqui um segundo aparelho para convidar; é a razão de `A-22` e `A-39` · **O que mudou:** até ontem o `online` começava sempre com quem convidou (`'A'` fixo); agora o lado sai de sorteio semeado pelo `roomId`, que os dois aparelhos recebem pelo link · **Onde rodar:** no endereço público, com **recarga forte** (Ctrl+Shift+R) nos DOIS aparelhos · **Procedimento:** aparelho 1 abre "Jogar com um amigo", escolhe a seleção e manda o link; aparelho 2 abre o link, escolhe a dele e entra. Quando a disputa começar, LEIA a frase "X cobra primeiro" nas duas telas e confira que é a MESMA seleção — e que quem chuta a 1ª cobrança é ela · **Repita com um link NOVO** (feche e comece de novo) até ver o anúncio cair no convidado pelo menos uma vez: é isso que separa "sorteia" de "voltou a ser sempre quem convida". Em ~4 links, ver os dois lados é o esperado; 6 links no mesmo lado é achado — registre `QA-NN` · **O que reprova:** telas anunciando lados diferentes, ou a 1ª cobrança saindo de um lado numa tela e do outro na outra
  **✔ COM CAMPO em 2026-08-29.** As duas telas anunciaram o MESMO cobrador, e o sorteio caiu nos **dois lados** em links diferentes — que é a metade do portão que separa "sorteia" de "voltou a ser sempre quem convida". Nenhuma divergência de 1ª cobrança · **Lacuna declarada:** o dono não anotou quantos links no total, então não há número para comparar com o "~4 esperado / 6 é achado" do card. Não reprova nada — os dois lados apareceram, que é o que o portão exige —, e nenhum `QA-NN` foi aberto porque não houve sequência suspeita a registrar
- [x] A-40 — o link truncado nos DOIS aparelhos: conte os segundos que o… · íntegra em [[backlog_archive]]
- [x] A-39 — o MESMO confronto nos dois aparelhos, com a seleção que… · íntegra em [[backlog_archive]]
- [x] A-38 — o ar já é HEAD? conte as bolas de borda inteira no endereço… · íntegra em [[backlog_archive]]
- [x] A-37 — a bola se separa da linha branca? conte as que estão… · íntegra em [[backlog_archive]]
- [x] A-36 — a luva se lê como luva? conte os dedos (T-30) · íntegra em [[backlog_archive]]
- [x] A-35 — a série de revanches no aparelho, e o amarelo no ar (T-32… · íntegra em [[backlog_archive]]
- [x] A-34 — publicar o que já está pronto (T-29/QA-21/A-33) · íntegra em [[backlog_archive]]
- [x] A-33 — o jogo no ar está atrás do repositório? (QA-33/D-72/T-21) · íntegra em [[backlog_archive]]
- [x] A-32 — as camisas na cor nacional, em campo (T-29/D-88) · íntegra em [[backlog_archive]]
- [x] A-31 — a bandeira de tela cheia de T-28, no aparelho… · íntegra em [[backlog_archive]]
- [x] A-30 — as duas colunas do desktop, no monitor de verdade… · íntegra em [[backlog_archive]]
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
- [x] T-17 — **sorteio de quem cobra primeiro** ✔ backend fechado em 2026-08-29 (`D-98`: o `online` semeia pelo `roomId`) · **Módulo:** M2 + M5 + M7 · campo em `A-41` · íntegra em [[backlog_archive]]
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
- [x] T-38 — ✔ COM CAMPO em 2026-08-28 (A-40) — QA-10: a base inválida… · íntegra em [[backlog_archive]]
- [x] T-37 — o portão de marca de M7 vira teste, nas duas metades (fecha… · íntegra em [[backlog_archive]]
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
