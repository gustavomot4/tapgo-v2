---
tags: [changelog, template]
status: atual
---
# CHANGELOG.md — histórico datado do PROJETO

> O log datado mora AQUI, fora do contexto. **Nenhuma sessão de IA carrega este arquivo** — pode crescer à vontade. O mais recente em cima; resumo curto; o porquê mora em [[c_decisions|DECISIONS]].
> Este arquivo nasceu zerado por `scripts/new_project.py`. O histórico do kit ficou no kit.

## [2026-08-08] — T-16: cada tentativa da medição passa a dizer o que provou (`D-44`, `D-45`)
- **O problema, em uma linha:** o 5/5 Claro×Claro da 1ª ida a campo é ambíguo nos dois sentidos, e `ok`/`ms` não desempata. Se fechou por `srflx↔srflx` com IPs públicos diferentes, houve travessia real de NAT; se os dois aparelhos saem pelo mesmo endereço, é hairpin e **não fala de CGNAT** — que é justamente o risco de 15-30% que [[online_p2p]] declara e o corte de 70% cobra.
- **`D-44` (ADOTADO) — como a leitura chega ao `getStats()` sem M6 mudar um byte.** `Channel` tem quatro métodos e nenhum devolve a `RTCPeerConnection`; abrir a quinta porta é o que `D-39` e `D-40` custaram uma auditoria para recusar. A medição embrulha o **global do navegador** com um `Proxy` sobre `construct`: a Trystero constrói com `new (rtcPolyfill ?? RTCPeerConnection)(...)`, lendo o global no momento da chamada, então quem embrulha antes da primeira tentativa vê toda instância. `Proxy` e não `class extends` porque o `Proxy` intercepta só a construção — `instanceof`, `constructor` e estáticos seguem sendo os do original, e a instância fica indistinguível de uma criada sem instrumento.
- **Só o instrumento paga:** `medicao.ts` é entrada de página separada (`D-33`), inalcançável a partir do `index.html`. O jogo nunca carrega o arquivo e nunca vê o global embrulhado.
- **A contagem por tipo de par é o que responde `A-08`.** Os sucessos são abertos em `travessia real de NAT` (srflx↔srflx, IPs diferentes), `hairpin` (mesmo IP público), `srflx↔srflx sem endereço legível`, `relay` (**não é P2P direto**), `host↔host` (mesma rede local), `misto` e `ausente`. Somados num número só, os três primeiros dizem "100%" e nenhum deles responde a pergunta.
- **`D-45` (ADOTADO):** o texto colável leva o IP com 2 octetos (`189.45.x.x`), inteiro só com a caixa marcada — o repositório é público (`D-21`) e o resumo nasce para virar linha de registro. **A comparação que decide hairpin roda sobre o IP inteiro**, dentro do módulo; comparar máscara diria "hairpin" para dois assinantes do mesmo bloco da operadora, que é o falso negativo mais caro possível aqui. A tela mostra o endereço inteiro, porque ela não sai do aparelho.
- **Ordem que o teste prende, e não a lógica:** o par é lido **antes** de `canal.close()` (fechar solta a sala e o relatório vem vazio — dado perdido com cara de dado ausente), e o cronômetro fecha **antes** da leitura (`getStats()` é assíncrono e entraria na mediana como tempo de conexão).
- **`src/medicao_par.ts`, módulo puro** (sem DOM, sem `src/net`), pelo mesmo motivo de `medicao_sala.ts` em `T-15`: `medicao.ts` é entrada de página e não há por onde o teste entrar. 46 testes novos, **suíte 271 → 317**, verde em 3 rodadas; `tsc` limpo.
- **Bundle 90.929 → 96.547 B (+5.618).** O acréscimo está **inteiro** no chunk da medição (5.436 → 11.054 B); os chunks do jogo saíram do build com o mesmo hash de antes. Soma ao "bundle inicial" só por causa de `QA-06`, que segue aberto.
- **`QA-11` ficou sem objeto:** `src/session/index.ts` e `src/tests/session_online.test.ts` entraram no git em `a227db1` e estão em `origin/main`. Não foi fechado aqui — é do dono confirmar e fechar a linha.
- **Custo declarado no orçamento do registro:** as duas linhas de decisão levaram o `c_decisions.md` de 9.405 a **9.986**, passando o aviso de 9.600 (a FALHA de 12.000 segue longe). Era o previsto por `A-12`, que deixou 195 de folga; **`A-13` deixou de ser planejamento e virou o próximo obstáculo real**.

## [2026-08-08] — A-12: o registro volta a caber, e o critério de `A-09` cai no caminho (`D-43`)
- **11.888 → 9.405 (−2.483), `check.py` sem nenhum aviso.** O aviso dos 9.600 e a FALHA dos 12.000 estavam a 112 um do outro na prática: nenhum `D-NN`/`QA-NN` novo cabia.
- **O portão era inalcançável pelo critério que `A-09` declarou.** Medido *antes* de mexer, o corte máximo honrando o critério 3 (*"fica o que `src/` cita, mesmo antigo"*) dava **10.055** — 455 acima do aviso. Não era questão de caprichar no corte: a soma de tudo que sobrava não chegava lá.
- **`D-43` (ADOTADO):** sai da tabela viva quem nenhum `.md` **vivo** cita — que é exatamente a régua do `check.py` (`d_history/` e `e_qa/` ficam fora por serem históricos). Citação em `src/` deixa de segurar a linha, porque o ID continua resolvendo pelo cabeçalho do `c_decisions.md` e pela íntegra no arquivo. A observação que matou o critério 3 é que **`A-09` já o havia excedido**: retirou `D-33`, que `vite.config.ts` cita.
- **O que saiu:** 11 linhas (`D-12`, `D-14`, `D-19`, `D-20`, `D-24`..`D-26`, `D-29`, `D-30`, `QA-01`, `QA-03`) — as nove primeiras eram ponteiro puro, com a íntegra já no arquivo desde T-08/T-09/T-13, então **nenhum byte de texto se moveu**. Mais: 7 decisões perderam só a coluna de evidência, os 3 QA fechados em `T-15` viraram ponteiro, e a tabela "Gatilhos de revisão" foi para o tema que cada gatilho mede (`D-01` → [[online_p2p]], `D-02` → [[stack]]), ao lado do número que os dispara.
- **O que ficou de propósito:** as seis REJEITADAS (`D-06`..`D-08`, `D-39`..`D-41`), que são a lista-morta varrida pela sessão de evolução — e ela nunca lê `e_qa/`; e `D-42`, que é o portão estatístico de `A-08`, a próxima coisa que o dono roda.
- **Portão do arquivamento conferido por script:** os 11 IDs retirados estão na linha "Retirados" do cabeçalho **e** têm linha de tabela íntegra no arquivo — nenhum virou prosa comprimida. As 20 linhas marcadas `ARQUIVADO` na tabela viva têm íntegra correspondente.
- **A folga é curta e está declarada: 195 até o aviso.** `A-09` deu 9.347, `A-10` deu 8.808, `A-12` deu 9.405 — a curva não mudou, e as linhas baratas de arquivar acabaram. O diagnóstico virou **`A-13`**: o `c_decisions.md` carrega três registros de ciclo de vida diferente num orçamento só, e é a seção de QA que cresce mais rápido (2.992 caracteres, 6 dos 9 achados ainda abertos e portanto não arquiváveis). Separar QA em arquivo próprio exige mexer no `check.py` — é decisão do dono.

## [2026-08-08] — A-08 vai a campo: 100% em três redes, e mesmo assim E-4 não fecha (`QA-12`, `D-42`)
- **Os números, todos sem TURN, do aparelho anfitrião:** 4/4 Wi-Fi × Wi-Fi (mediana 689 ms), 4/4 Claro 5G × Wi-Fi (782 ms), 5/5 Claro 5G × Claro 5G (353 ms). **Não fecham E-4**, por dois motivos independentes: o contador "config que vai ao ar" está `0/0` e é ele que o corte de 70% cobra; e 5/5 põe o limite inferior 95% em apenas **54,9%**, longe dos 70%.
- **`QA-12` (novo, CRÍTICO — achado em campo, consertado em `T-15`):** o dono sorteou sala nova sem recarregar e nada mais conectou. O índice da rotação era `contadores[modo].tentativas` — o mesmo número servia de estatística e de endereço de sala —, então sortear sala nova trocava a base sem mexer no contador: anfitrião em `idDaTentativa(salaNova, 4)`, convidado em `idDaTentativa(salaNova, 0)`. Separado em `indice`, que zera ao sortear e ao zerar. **Cai de brinde** o viés que `D-41` recusou: com índice por modo, a tentativa 3 sem TURN e a 3 com TURN caíam na mesma sala.
- **O guarda de `QA-09` funcionou** — as duas telas mostravam `#4 · …` contra `#0 · …`. Foi a única razão de o defeito ser diagnosticável em vez de virar "o P2P é instável".
- **`D-42` (ADOTADO):** o portão de E-4 passa a ser estatístico — parar quando o limite inferior 95% (Clopper-Pearson) passar de 70%: **9 tentativas com 0 falhas**, 14 com 1, 19 com 2, 24 com 3. Substitui o piso fixo de 30 de `A-08`, que fora escrito supondo taxa ambígua. Mais rigoroso quando há falha, mais barato quando não há.
- **A ressalva que os 100% não cobrem:** as duas rodadas móveis foram **Claro com Claro**, possivelmente o mesmo pool de NAT; Wi-Fi × Wi-Fi é controle e nem passa por NAT (candidatos de LAN). Os 15-30% de CGNAT de [[online_p2p]] são sobre redes **diversas** — o caso que quebra é Claro × Vivo. Próxima ida: operadora diferente nos dois. Detalhe e tabelas em [[m6_transporte_notas]].
- **Suíte 265 → 271; bundle 90.835 → 90.929 B.** Registro em 11.888/12.000, a **112** da FALHA: `A-12` agora trava o próximo `D-NN`/`QA-NN` que alguém precisar escrever.

## [2026-08-08] — T-15: a página de medição volta a poder medir (`QA-08` e `QA-09` fechados)
- **`D-38` implementado (`bd68d0f`):** em `tentativa()`, o ternário `papel === 'host' ? hostRoom(ice).channel : joinRoom(id, ice)` virou `joinRoom(id, ice)`. Os dois lados entram na sala rotacionada; `src/net/index.ts` não mudou um byte e `grep -c 'hostRoom(' src/medicao.ts` caiu de 2 para 1 — a que sobrou é a que sorteia a base no botão "Sortear sala".
- **O custo real era importabilidade, não a linha:** `src/medicao.ts` é entrada de página (chama `montar()` no fim, mexe em `document`), então importá-lo de um teste executaria a página. A derivação saiu para `src/medicao_sala.ts`, módulo puro — sem DOM, sem `src/net`, sem estado. É isso que fez `QA-08` virar testável.
- **`QA-09` fechado em commit separado (`31b39d9`):** `rotuloDaTentativa()` põe na tela `#índice · 6 chars do ID`, pintado por `pintar()` (fora do `if (papel === 'guest')`, logo nos dois aparelhos) e acompanhado do modo. O índice vai junto do prefixo **porque só o prefixo não serve**: seis caracteres de duas rotações da mesma base podem coincidir, e o guarda mentiria justamente quando fosse preciso. Mostra o desencontro; **não** ressincroniza — isso mudaria o denominador da medição, que é `D-NN` do dono.
- **Uma correção acima do pedido, declarada:** o rótulo diz também o modo (`sem TURN` / `com TURN`). Os contadores são por modo, então dois aparelhos podem bater no índice e estar em contadores diferentes — mesma sala, configuração medida diferente. Sem a palavra do modo, o guarda de `QA-09` leria "sincronizado" numa medição inválida. **Vetável em uma linha** se o dono quiser o literal de `QA-09`.
- **Suíte 220 → 265** (45 testes novos em `src/tests/medicao.test.ts`), verde em 4 rodadas; `tsc --noEmit` limpo; bundle 90.320 → **90.835 B** (+515). Os portões de origem (`hostRoom` uma vez, derivação vinda do módulo puro, rótulo fora do bloco por papel) são cobrados **por leitura do disco**, como em `ui.test.ts` — portão que só existe no terminal do dono é portão que ninguém roda.
- **O portão pegou o próprio agente:** a primeira versão do comentário de `tentativa()` escrevia `hostRoom()` por extenso na prosa, e o `grep -c` do portão devolveu 2 com uma única chamada real no arquivo. Corrigido tirando os parênteses da prosa. É a mesma armadilha que `core.test.ts` e `ui.test.ts` já resolvem montando as agulhas em tempo de execução.
- **Não consertado, de propósito:** a rotação repete a sala a cada 26 tentativas (`n % 26`), então com o piso de 30 de `A-08` as quatro últimas reentram em salas já usadas. Já estava declarado na auditoria de hoje; fixado agora num teste para que consertá-lo seja decisão visível do dono e não efeito colateral (regra 4). `QA-10` também segue aberto — muda denominador.

## [2026-08-08] — T-15: as três saídas de QA-08 rejeitadas, uma quarta adotada (auditoria, zero código)
- **`D-38` (ADOTADO):** na página de medição, os **dois** lados entram por `joinRoom(idDaTentativa(base, n), ice)`. A porta congelada de `D-13` **não muda um byte**, `createChannel` continua privado, e a rotação — logo a independência entre tentativas — fica de pé. O conserto é uma linha; o trabalho é o teste.
- **As três saídas registradas na nota foram REJEITADAS**, e nenhuma por gosto: `D-39` (`hostRoom(ice?, roomId?)`) compra o que `D-38` obtém de graça pagando com precedente em porta congelada, com `Q-09` e `Q-11` parados esperando exatamente esse precedente; `D-40` (exportar `createChannel`) alarga a superfície de M6 para atender **um** instrumento, e `createChannel` não valida `roomId` — é a checagem do portão do defeito 6 (`D-30`) que ficaria contornável; `D-41` (uma sala por medição) perde independência já na tentativa 2 e, pior, enviesa **para cima**: `leave()` é assíncrono, então peer da tentativa anterior pode disparar `onPeerJoin` e virar `'connected'` sem conexão nova.
- **O que o STEP 0 observou, e que a leitura anterior não tinha:** `hostRoom` e `joinRoom` diferem só em quem sorteia o ID e na validação de forma — as duas caem na **mesma** chamada `createChannel(roomId, ice)` (`src/net/index.ts:491-511`), e o comentário do próprio módulo já dizia que o transporte é simétrico. Rotação de ID válido passa em `ROOM_ID_RE`: **0 recusas em 1.500.000** IDs rotacionados. E `newRoomId` segue exercitado pela base, então a saída 4 não deixa nada do caminho de conexão sem medir.
- **`QA-09` (novo, CRÍTICO):** o índice da rotação é `contadores[modo].tentativas` — contador **por aparelho e por modo**. Um toque a mais, um erro de configuração ou o checkbox de TURN diferente dessincroniza as salas e **não ressincroniza**; a tela não mostra índice nem ID, então sai como `'failed'` após 20 s, indistinguível de P2P que não conectou. Aprovado pelo dono para dentro de `T-15`, em commit separado de `D-38`.
- **`QA-10` (novo, MÉDIO):** erro de configuração soma tentativa **e** falha (`src/medicao.ts:98-104` + `125-131`). Link `?m=` truncado à mão faria **todas** as tentativas do convidado entrarem como falha de rede sem uma linha de rede exercitada — viés para baixo, a mesma direção do `QA-08`.
- **Custo do próprio registro, declarado:** quatro `D-NN` e dois `QA-NN` levaram o `c_decisions.md` de 9.434 para **11.038** — passou o aviso de 9.600 e ficou a **962 da FALHA de 12.000**. Virou `A-12`; `T-15` ainda vai escrever o fechamento de `QA-08` ali dentro.
- **Rotação só produz 26 IDs distintos** (`n % 26`), então a tentativa 27 reentra na sala da 1: com o piso de 30, o desenho **já** perde independência nas quatro últimas, em silêncio. Não salva `D-41` — perder na 27 e perder na 2 não é a mesma coisa —, mas ficou registrado para não ser vendido como propriedade que a rotação garante.
- **`QA-11` (novo, CRÍTICO — achado ao commitar, nada a ver com a auditoria):** `git status` mostra `src/session/index.ts` com **208 linhas fora do git** e `src/tests/session_online.test.ts` **untracked**, e nenhum commit do repositório cita T-13, `D-35` ou `D-36` — o último commit de código é `2f4f4df` (M6/`D-34`). O CONTEXT lista `online` T-13 como **Pronto** e a suíte como 220/220, mas esse código existe só na árvore de trabalho do dono: `origin/main` não o tem, e `origin/main` é o que o Pages publica. Registrado e **não consertado** (regra 4, e commitar código alheio não é do agente).
- Aberto: `T-15` segue bloqueando `A-08`, que bloqueia E-4. O que mudou é que ele **não espera mais decisão nenhuma** — a saída está escolhida e o portão, escrito. Auditoria completa (lista-morta, tabela valor × P ÷ custo, portões) em [[m6_transporte_notas]].

## [2026-08-08] — QA-08: a página de medição não pode medir (achado, zero código)
- **Achado ao escrever o passo a passo de `A-08`, antes de o dono sair com os dois aparelhos.** Em `src/medicao.ts`, `rodarUma()` calcula o ID rotacionado da tentativa e o entrega a `tentativa(id, ice)`, mas o ramo do anfitrião o descarta: `hostRoom(ice)` sorteia sala nova por `newRoomId()` a cada toque, enquanto o convidado entra em `idDaTentativa(base, n)`. As salas nunca coincidem, toda tentativa vai aos 20 s de `CONNECT_TIMEOUT_MS` e volta `'failed'`.
- **Por que CRÍTICO:** a medição daria **0%** nos dois contadores. 0% aciona as duas piores linhas da tabela de `Q-10` (saída (a) obrigatória, E-4 não fechando) **e** o gatilho de revisão de `D-01`, que reabre a arquitetura abaixo de 70%. Seria decisão de arquitetura tomada sobre aparelho de medida quebrado — e o número pareceria plausível, porque "P2P falha em rede de operadora" é exatamente o medo que a medição existe para testar.
- **Por que a suíte não pegou:** `medicao.ts` é instrumento e nenhum dos 220 testes o cita. A suíte de M6 prova que `hostRoom` sorteia ID opaco e que `joinRoom` recusa ID malformado — as duas coisas certas, sobre a porta certa. O defeito está em quem chama.
- **Confirmado em campo no mesmo dia, pelo dono:** 0% no Wi-Fi com os dois aparelhos na mesma rede (2 e 3 tentativas) e 0% em dados móveis, Claro 5G nos dois (1 tentativa). O run de Wi-Fi virou o **controle** que a leitura de código não produziria: dois aparelhos na mesma rede local conectam por P2P quase sempre, então falhar ali elimina a rede como explicação e sobra o defeito do instrumento. **Nenhum destes números é medição de E-4** — não entram em `Q-10`, não alimentam o gatilho de `D-01` e não aparecem no CONTEXT.
- Aberto: `T-15` (conserto, módulo M6, skill `backend-bff`) **bloqueia `A-08`, que bloqueia E-4**. A correção mexe na porta congelada por `D-13` — `hostRoom` não aceita `roomId` e `createChannel` não é exportado —, então pede `D-NN` do dono antes. Três saídas medidas, com o custo de cada uma, em [[m6_transporte_notas]].

## [2026-08-08] — A-11: o critério de aceite sai do CONTEXT (manutenção, zero código)
- Movido para `a_context/portao_de_aceite.md` (arquivo novo): o bloco "Critério de aceite (o portão)" inteiro, os seis critérios verbatim. CONTEXT **3.983 → 3.542**; o `check.py` avisa em 3.600 e **falha** em 4.000, e o arquivo estava a 17 caracteres da falha. Primeira vez que o `check.py` roda sem nenhum aviso.
- **`D-37`:** a escolha do bloco não foi por tamanho. "Restrições inegociáveis" (528) e "Stack + representações" (446) também cabiam no corte; o critério de aceite ganhou porque é o maior bloco que sai **sem levar estado numérico junto** — limiar (`< 8 MB`) não é medição (`90.320 B`), e a medição fica onde sempre esteve. As "Restrições" ficaram de propósito: são o bloco "violou = inválido", e uma sessão que não as leia pode propor host pago sem saber que invalidou o projeto.
- **Gatilho largo no Mapa de leitura**, para o portão não virar leitura opcional: "antes de fechar tarefa, declarar etapa fechada ou entregar". Os seis critérios foram conferidos um a um no destino, e o `portao_de_aceite.md` declara no cabeçalho que nenhum número medido mora nele.
- **Registro subiu de volta para 9.045** com a linha de `D-37` — 45 acima do alvo de `A-10`, que era o portão daquela tarefa e não um limite permanente. O limite que o `check.py` cobra é 9.600, e sobram 555.
- Aberto: nada trava. Próximo bloco movível, se o CONTEXT voltar a apertar: "Stack + representações" (−408, e `[[stack]]` já está no Mapa).

## [2026-08-08] — A-10: encolhimento das questões abertas (manutenção, zero código)
- Movido para `e_qa/questoes_abertas_notas.md` (arquivo novo): a justificativa longa de `Q-03`, `Q-05`, `Q-07`, `Q-08`, `Q-09` e `QA-04`, na íntegra e verbatim. No registro ficou a **pergunta e o prazo**. Registro **9.347 → 8.808** caracteres; o portão de `A-10` pedia abaixo de 9.000, e o `check.py` só avisa em 9.600.
- **Nenhuma questão saiu de "aberta"** — conferido linha a linha: `Q-03`, `Q-05`, `Q-07`..`Q-11` seguem abertas, `QA-04`..`QA-07` seguem abertos. Encolher não é responder, e responder é do dono.
- **O portão alcançou mais do que os quatro IDs nomeados.** `A-10` citava `Q-07`, `Q-08`, `Q-09` e `QA-04` (as quatro linhas mais longas), mas o portão dizia "toda linha `Q-NN`/`QA-NN` em 2 frases": `Q-03`, `Q-05`, `Q-10`, `Q-11`, `QA-05` e `QA-06` também estouravam. O dono aprovou a extensão na abertura da sessão; as seis foram reescritas sem perder pergunta, prazo nem ponteiro.
- **`QA-07` (novo, BAIXO):** `Q-08` manda decidir "antes de E-3" e `Q-09` "antes de T-10" — E-3 fechou e T-10 está feita, e as duas questões continuam abertas. Prazo é do dono (regra 6), então a data ficou como estava e o vencimento virou achado, marcado na própria linha.
- **Régua ambígua, declarada e não contornada:** "2 frases por linha" não diz o que conta numa tabela de sete colunas. Somando toda célula, `QA-01` (141 caracteres, que ninguém nunca acusou) dá 7 frases; contando só as células de prosa, dá 2. Foi usada a segunda leitura, que é a que o próprio `A-10` já praticava. A redação da regra **não** foi mexida: ela vive em `a_context/c_decisions.md` e em `b_process/templates/a_decision.md`, e o template é do kit, fora do escopo desta sessão (regra 2). Critério de contagem registrado em [[questoes_abertas_notas]].
- Aberto: `A-11` (o CONTEXT segue a 3.990/4.000 — 10 caracteres do teto, que é FALHA e não aviso).

## [2026-08-08] — A-09: arquivamento do registro de decisões (manutenção, zero código)
- Retirado de `a_context/c_decisions.md`: **14 linhas** — `D-03`, `D-05`, `D-11`, `D-15`..`D-18`, `D-21`, `D-23`, `D-28`, `D-33` (todas já `ARQUIVADO`, nenhuma citada por arquivo vivo), `D-34`, `Q-06` (respondida) e `QA-02` (fechado). Registro **11.995 → 9.347** caracteres; o `check.py` para de avisar em 9.600. Nada foi revertido nem reescrito: saiu a linha, e o ID continua resolvendo em [[decisions_archive]].
- Corrigido: o ponteiro `íntegra em [[decisions_archive]]` aparecia **31 vezes** na tabela, sempre idêntico — 716 caracteres para dizer uma frase. Agora é dito uma vez no cabeçalho, válido para toda linha `ARQUIVADO`. Foi a diferença entre passar no portão e ter de retirar decisões que ainda significam alguma coisa.
- **Ficaram de propósito:** as três REJEITADAS `D-06`..`D-08` (a lista-morta que a sessão de evolução varre — e ela nunca lê `e_qa/`), os 19 `D-NN` que `src/` cita, e `D-35`/`D-36`, de ontem.
- Aberto: `A-10` (encolher as questões abertas, que é onde sobrou a gordura: `Q-08` tem 613 caracteres) · `A-11` (o CONTEXT está a 17 caracteres do teto de 4.000, que é FALHA, não aviso).

## [2026-08-08] — T-13: M5 no modo `online`, sobre o canal de T-11
- Adicionado: ramo `online` em `src/session/index.ts`. `roomId` ausente ⇒ este aparelho hospeda (`hostRoom`); presente ⇒ entra na sala (`joinRoom`). Cada aparelho manda **uma** jogada por cobrança, com `seq` = índice da cobrança lido de M2, e os dois montam o mesmo par `(shot, dive)` a partir de `match.turn`: o `MatchState` coincide porque a regra é a mesma, não porque a rede combinou resultado. Nenhum placar trafega no canal.
- Adicionado: `src/tests/session_online.test.ts` — 14 testes; suíte **207 → 220**, verde em 5 rodadas seguidas. O duplo de sinalização daqui **liga** duas salas pelo `roomId` (o de `net.test.ts` não ligava), que é o que torna possível provar dois aparelhos chegando ao mesmo estado.
- **`Q-04` respondida pelo dono (`A-05`) → `D-35`: peer que some = disputa SEM RESULTADO.** M5 não escreve vencedor: `winner` segue `null`, `phase` não vai a `finished`, e `choose()` recusa em voz alta. As outras duas saídas ("quem fica vence", "vale o placar do momento") são regra de disputa e exigiriam entrada nova em M2 e linha nova em `regras_partida.md` — uma sessão de `backend-dominio` antes desta. Também evita que queda de 4G vire derrota registrada, com 15-30% do público sob CGNAT.
- **Evento remoto ilegal morre em M5, nunca em M2 (`D-19`):** lado do próprio aparelho, `seq` fora da cobrança corrente, segunda jogada na mesma cobrança e zona inexistente são descartados com aviso. É o que torna o reenvio da fila de M6 seguro de repetir — a duplicata morre por número, não vira segunda cobrança.
- Adicionado: `D-36` — notificação nascida da REDE loga a exceção do assinante em vez de propagá-la; a nascida de `choose()` continua propagando. Exceção subindo pela pilha de M6 partiria o laço de handlers e deixaria a máquina de estados do canal pela metade.
- **Lacuna declarada, não contornada — `Q-11`:** o `roomId` que `hostRoom()` sorteia não tem por onde sair da porta congelada em `D-13`, e M7 não pode importar `src/net`. Sem resposta não há tela de convite. As duas saídas (M5 reexportar `newRoomId`, ou `Session` ganhar `roomId()`) mexem em contrato congelado, logo são `D-NN` do dono.
- Trocado: `src/tests/session.test.ts` — a asserção "M5 não importa rede em runtime" caducou (era a ausência de T-13, não regra de camada) e foi **substituída**, não apagada: agora cobra que M5 entre em M6 **pela porta** (só `hostRoom` e `joinRoom`, uma ocorrência de cada).
- Bundle: **88.888 → 90.320 B** (1,13% de 8 MB), +1.432 B — M6 passou a entrar no bundle inicial por import estático de M5. Trystero segue fora, por `import()` (`D-27`). `QA-06` continua somando a página de medição.
- Arquivado: `D-06`, `D-07`, `D-08`, `D-21`, `D-29`, `D-30` e `D-33` — íntegra em `e_qa/decisions_archive.md`, IDs preservados. `c_decisions.md` estava a 32 caracteres do teto e as decisões desta sessão não caberiam. **Fechou a 5 de folga: arquivar de novo é `A-09`, antes de qualquer `D-NN` novo.**

## [Não lançado]
- **E-3 depende só do dono agora:** todo o código da etapa está em pé; falta a passada no celular real (5 cobranças e alternadas por toque em 360x640, ≥30 fps). Sandbox é indicativo, nunca portão.

## [2026-08-07] — T-10: M7 (telas) nos modos `cpu` e `local`
- Adicionado: `src/ui/` — porta `bootGame(container)` e quatro telas (início, seleções, cobrança, fim). Módulos puros separados de propósito: `derivacao.ts` (a derivação de `Q-09`), `rotulos.ts` (todo texto e toda formatação), `preferencias.ts` (as **três** preferências que o contrato permite: nível, som, última seleção — nada de disputa, nada que identifique a pessoa).
- Adicionado: `src/ui/cena.ts` — único arquivo que importa `phaser`, e entra por `import()` dinâmico. Campo, gol, rede e bola são primitivos de `Graphics`: **zero imagem** em `assets/`.
- Adicionado: `src/assets/audio/{chute,gol,defesa}.wav` e `src/scripts/gen-audio.mjs` que os gera. Determinístico (LCG com semente fixa), então a procedência de [[licenciamento]] se confere por **hash**, não por confiança (`D-28`).
- Adicionado: `src/tests/ui.test.ts` — 38 testes; suíte **140 → 178**, verde. Dois portões de M7 deixaram de ser prosa e viraram teste: o **de camada** (varre `src/ui/` e reprova import de `engine`/`cpu`/`net`) e o **de licença** (varre `src/assets/` e reprova arquivo sem linha em `licenciamento.md`).
- **A tela não é Phaser inteira (`D-27`).** `<canvas>` não dá teclado, foco visível nem leitor de tela, e o portão de `frontend-uiux` exige os três; Phaser ficou só na cena da cobrança e a entrada é sempre `<button>`. Efeito medido no bundle inicial: **4.599 B → 80.604 B** (1,01% do teto), com os 1,21 MB de Phaser **fora** dele.
- **No modo `local` a zona escolhida nunca aparece na tela.** Os dois jogadores olham o mesmo aparelho: destacar o chute enquanto o goleiro escolhe tornaria o modo injogável. A zona fica dentro de M5; a tela só recebe "há escolha pendente" e mostra "passe o aparelho".
- Trocado: a sonda de M9 saiu de `src/main.ts` e do `index.html`, como o contrato de E-1 previa. O 404 de asset em produção continua coberto — agora pelos assets reais.
- Aberto: `QA-05` — `src/tests/teams.test.ts` (T-08) escreve por extenso os 6 termos da lista-morta, então o portão de marca de M7 (`grep` zero em `src/`) devolve 6. Arquivo de outro dono: registrado, não consertado (regra 4). T-10 não acrescentou ocorrência.
- **`Q-09` continua aberta**, e de propósito: T-10 usou a derivação que ela mesma prescreve (notificação com o mesmo `kicks.length` = escolha pendente), isolada em um módulo puro com teste. Resolver de vez é `pending(): Side | null` na porta congelada de M5 — `D-NN` do dono.
- **Corrigido antes de entregar, pelo CI e não pela suíte:** `export type ModoJogavel = 'cpu' | 'local'` em `derivacao.ts` era alcançado pelo padrão de camada do workflow (`^\s*(import|export)[^;]*(engine|cpu|net)`), largo de propósito — a palavra `cpu` numa linha de `export` reprova, mesmo sem import de motor. O tipo passou a ser `Exclude<Mode, 'online'>`, derivado de M5, o que também o mantém em dia se M5 ganhar um modo. **A causa real era o teste:** `ui.test.ts` usava um padrão mais estreito que o portão que dizia cobrir e ficava verde. Agora ele usa o regex COPIADO do workflow, mais um caso que prova que o regex ainda morde. Suíte 178 → 179.
- Decisões: D-27 (DOM + Phaser só na cobrança, por `import()`) · D-28 (áudio sintetizado, determinístico). Evidência em [[m7_tela_notas]].
- Arquivado: o critério da seção de QA saiu de `c_decisions.md` para `e_qa/decisions_archive.md`. **Mesmo assim o registro fechou em 11.993/12.000 — 7 caracteres de folga.** A próxima sessão que registrar um D-NN não cabe sem uma passada de arquivamento de verdade.

## [2026-08-07] — T-09: M5 (sessão de disputa) nos modos `cpu` e `local`
- Adicionado: `src/session/index.ts` — `Mode`, `SessionConfig`, `Session`, `createSession`, mais os **três reexports** que o portão exige (`MatchState`, `LinkStatus`, `Level`). Um único caminho até `play`, nenhuma soma de placar, e um teste de fonte que reprova se as palavras `goals`/`taken`/`winner` aparecerem no módulo.
- Adicionado: `src/net/index.ts` — **só os tipos** de M6 que `D-13` congelou (`LinkStatus`, `Move`, `IceConfig`, `Channel`), zero implementação. Sem ele o portão de M5 era impossível e o de camada de M7 ficaria impossível para `LinkStatus` já em T-10 (`D-24`). `hostRoom`/`joinRoom`, timeout e TURN seguem inteiros em `T-11`.
- Adicionado: `src/tests/session.test.ts` — 30 testes: `cpu` e `local` produzindo `MatchState` idêntico para a mesma sequência de zonas em 3 níveis × 2 lados × 4 sementes, zona inválida morrendo em M5 **com a mensagem de M5** (a de M2 provaria que o evento chegou lá), a mesma semente 2x, `dispose()` sem assinante vivo e `subscribe()` recusado depois dele.
- **Dois furos fechados no próprio teste, e não no código:** a igualdade entre modos passaria vazia se a disputa não acontecesse (piso de 6 cobranças e `phase === 'finished'` agora exigidos — a guarda pegou uma disputa de 6 na semente 7, encerrada por morte matemática); e as asserções de `dispose()` não distinguiam "conjunto limpo" de "conjunto cheio e inalcançável", que é vazamento — fechado por conferência de `subscribers.clear()` na fonte.
- **O modo `online` não entra aqui:** é `T-13`, bloqueada por `A-05`. `createSession` o recusa em voz alta — degradar para `local` calado poria dois aparelhos em partidas separadas, cada um com seu placar (`D-25`).
- **`Q-08` sai intacta.** T-09 chamou `observe`/`pick` com a semântica que T-07 entregou, sem tocar no índice nem nos testes de isolamento. `D-26` fixa só a ORDEM (a CPU escolhe antes de observar) e o teste que a cobre declara que hoje não a distingue — ele é a armadilha que fecha se `Q-08` for invertida.
- Aberto: `Q-09` — no modo `local` a porta congelada não diz de quem é a escolha pendente, e M7 precisa disso em T-10. T-09 não mexeu no contrato: M5 notifica a escolha pendente e M7 deriva por `kicks.length`, com teste. Evidência de tudo em [[m5_sessao_notas]].
- Decisões: D-24 (`src/net` só com tipos) · D-25 (M5 recusa na criação em vez de degradar) · D-26 (`pick` antes de `observe`).
- Arquivado: íntegra de D-11, D-12 e D-16..D-18 em `e_qa/decisions_archive.md`, com as linhas-resumo mantidas. **Mesmo assim `c_decisions.md` ficou em 11.848/12.000 (98%)** — 152 de folga, menos que uma linha. A próxima sessão que registrar D-NN bate na parede: ver o próximo passo.
- Portão verde no sandbox: `tsc --noEmit` limpo e **140/140** testes. **Bundle não medido** — `npm run build` falha no sandbox por permissão do mount em `dist/`, e M5 ainda não é importado por `main.ts`. Compilação conferida com `--outDir` fora do mount: 4 módulos, sem erro.

## [2026-08-07] — T-08: M4 (catálogo de seleções) implementado
- Adicionado: `src/data/teams.ts` — `Team`, `listTeams`, `findTeam`, mais `FLAG_PENDENTE` e `CATALOG_IS_FIXTURE`. Importa só M1; sem I/O, sem gerador nativo, sem render. Catálogo construído uma vez no carregamento e congelado.
- Adicionado: `src/tests/teams.test.ts` — 22 testes: formato ISO alfa-2 e faixas de uso do usuário, `name` conferido contra o ICU **e ausente como literal na fonte**, zero URL, zero termo da lista-morta de [[licenciamento]], imutabilidade do catálogo e `findTeam` sem normalização.
- **A lista é de fixação e não responde `Q-03`:** 4 códigos arbitrários por construção, todos com `flag: null`. `CATALOG_IS_FIXTURE` é exportada e um teste falha de propósito quando ela virar `false`, forçando a revisitar o portão de licença em `A-04`.
- `name` **derivado** por `Intl.DisplayNames` em locale fixo `pt-BR`: cumpre "o nome vem do código" sem uma linha de país digitada e sem peso no bundle. Código que não resolve **lança**, em vez de virar uma seleção chamada pelo próprio código.
- Decisões: D-22 (`Team.flag` passa a `string | null`; muda contrato de M4, por isso `D-NN`) · D-23 (`name` do ICU em locale fixo, **com o limite declarado**: o ICU aceita código retirado como `SU` e reservado como `UK`/`EU`). Evidência das duas em [[m4_catalogo_notas]].
- Arquivado: íntegra de QA-01..QA-03 (fechados e verificados) em `e_qa/decisions_archive.md`, com as linhas-resumo mantidas em `c_decisions.md`. Liberou 897 caracteres — sem isso as duas decisões desta sessão não caberiam no teto de 12.000.
- Portão verde no sandbox: `tsc --noEmit` limpo e 110/110 testes. **Bundle não medido nesta sessão** — `npm run build` falha no sandbox por permissão do mount, e M4 ainda não é importado por `main.ts`.

## [2026-08-07] — A-07: publicação no ar, E-1 e E-2 fechadas
- `Q-06` respondida: o repositório é **público** (`D-21`), que é a condição do Pages no plano Free — sem ela, "custo R$ 0" e publicação não coexistiam.
- **E-1 fechada:** `https://gustavomot4.github.io/tapgo-v2/` abre com o veredito verde "asset carregado — sem 404", conferido no celular do dono. `base` resolvido como `/tapgo-v2/` e sonda servida de `assets/base-probe-BWPWGS0k.svg` — **o mesmo hash do build local**, prova de que o deploy consumiu o artefato que passou no portão em vez de recompilar (`D-17`).
- **E-2 fechada na mesma data:** o portão da etapa (um teste por invariante, regressão dos defeitos 1/2/4/5 em M2 e do 3 em M1, `Number.isInteger` em toda transição, frequência da CPU ≤ 70% nos dois papéis, suíte 2x idêntica) já estava verde desde T-07. T-06 e T-07 tinham sido entregues fora da ordem das etapas; a publicação regularizou as duas.
- Arquivado: íntegra de D-01..D-05 em `e_qa/decisions_archive.md`, com as linhas-resumo mantidas em `c_decisions.md` para os IDs continuarem resolvendo. Liberou 353 caracteres do orçamento — folga de 571 antes de `D-21`.

## [2026-08-07] — T-07: M3 (CPU) implementado
- Adicionado: `src/cpu/index.ts` — `Level`, `Role`, `Cpu`, `createCpu` e `zoneDistributionPpm`. Importa só M1; sem relógio, sem gerador nativo, sem armazenamento do navegador, sem render.
- Adicionado: `src/tests/cpu.test.ts` — 35 testes: teto de 70% por igualdade exata **e** medido por frequência nos dois papéis, uniforme com histórico vazio em todos os níveis, isolamento entre os dois histogramas, determinismo por semente e a contagem de sorteios por `pick`.
- Probabilidade em **ppm inteiro**, não float: é o que deixa o teto de `D-10` ser conferido por igualdade em vez de dentro da tolerância de uma medição.
- Decisões: D-20 (teto é corte depois da mistura, não peso dela) · Q-08 aberta (`pick(role)` lê o histograma do mesmo papel — confirmar antes de M5 usar).
- Portão verde no sandbox: `tsc --noEmit` limpo, 88/88 testes em duas execuções idênticas, `grep localStorage src/cpu/` com 0 ocorrências, 1 ocorrência do gerador nativo em `src/`. Bundle inalterado — M3 ainda não é importado por `main.ts`.
- Teste de mutação: desligar o corte do teto reprova 12 testes, entre eles o que fixa `[700_000, 150_000, 150_000]` contra os 80% da mistura crua.

## [2026-08-07] — T-06: M2 (motor da disputa) implementado
- Adicionado: `src/engine/index.ts` — `Phase`, `Kick`, `MatchState`, `createMatch` e `play` pura. Importa só tipos de M1; sem `Date.now()`, sem gerador nativo, sem render.
- Adicionado: `src/tests/engine.test.ts` — 37 testes: um por invariante de `regras_partida.md`, regressão dos defeitos 1, 2, 4 e 5 da v1, `Number.isInteger` sobre 1.000 cobranças sorteadas com semente fixa, e alternadas sem teto de rodadas.
- `MatchState` congelado em runtime (`Object.freeze`): a imutabilidade do contrato deixa de depender só do tipo.
- Decisões: D-19 (`play` recusa estado que não fecha com o histórico) · Q-07 aberta (quem cobra primeiro em cada rodada de alternadas).
- Portão verde no sandbox: `tsc --noEmit` limpo, 53/53 testes em duas execuções idênticas, 1 ocorrência do gerador nativo em `src/`, build com bundle inicial inalterado (4.599 B — M2 não entra na UI).

- E-1 aberta: T-04 e o código de T-05 entregues; falta A-07 (publicar) para fechar a etapa

## [2026-08-07] — T-05: esqueleto de M9 (build e publicação)
- Adicionado: `vite.config.ts` — `base: '/tapgo-v2/'`, `root: 'src'`, `outDir: '../dist'` (`D-12`), `emptyOutDir` e `manifest` ligados.
- Adicionado: `src/index.html`, `src/main.ts`, `src/vite-env.d.ts` e `src/assets/base-probe.svg` — a página do esqueleto exibe o veredito do asset a olho nu, sem DevTools, para o teste no celular.
- Adicionado: `.github/workflows/pages.yml` — `npm ci`, typecheck, suíte, as duas checagens de camada de E-1 e o build; só então publica, e o job de deploy consome o artefato sem recompilar.
- Adicionado: `src/scripts/bundle-size.mjs` — soma os bytes do manifesto do Vite e sai com erro em 8.000.000 B (gatilho de `D-02`). Medido: **inicial 4.599 B**, `dist/` 4.907 B, 0,06% do teto.
- Alterado: `package.json` ganhou só o script `build` e `vite@^7` (`D-16`); `npm audit` com 0. `src/README.md` fechou a lacuna "subir a aplicação".
- Alterado: tabela de custo de `stack.md` ganhou a linha GitHub Pages + Actions — gratuita **com a condição** de repositório público; tabela de procedência de `licenciamento.md` ganhou a linha da sonda.
- Decisões: D-17 (publicação por Actions com o portão antes do deploy) · D-18 (número do bundle e a sonda forçada a virar arquivo).
- Aberto: Q-06 (o repositório fica público?) · QA-04 (`tsc --noEmit` não cobre o `vite.config.ts`).
- Portão no sandbox: `tsc --noEmit` limpo, 16/16 testes, build verde, HTML publicado com `/tapgo-v2/` nos dois `src`, zero `<script>` externo e zero `data:` no HTML. **Não é prova:** o portão de E-1 exige a página no ar (A-07).

## [2026-08-07] — T-04: M1 (núcleo) implementado
- Adicionado: `src/core/index.ts` — `Zone`, `Side`, `CountryCode`, `Rng`, `createRng` (mulberry32 escrito à mão, sem dependência nova) e `newSeed`.
- Adicionado: `src/tests/core.test.ts` — 16 testes: determinismo de 1.000 valores, regressão do defeito 3 da v1 (`int(3)` sorteia 0/1/2), bordas de `int` e da semente, e a checagem de camada do gerador nativo.
- Adicionado: `package.json` + `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`); `npm test` e `npm run typecheck`. `npm run build` fica para T-05.
- Corrigido antes de commitar: `vitest@2.1.8` trazia 5 advisories transitivas (1 CRÍTICO) por `vite`/`esbuild`; piso subiu para `^3.2.7` → `vite@7.3.6`, `esbuild@0.28.1`, `npm audit` com 0 e suíte inalterada.
- Decisões: D-14 (quem é dono de `package.json`/`tsconfig.json`) · D-15 (validação e espaço de semente de `createRng`) · D-16 (piso de `vitest`, e `vite@^7` para T-05).
- Portão de M1 verde no sandbox: `tsc --noEmit` limpo, 16/16 testes em duas execuções idênticas, `grep -rn "Math.random" src/` com 1 ocorrência, dentro de M1.

## [2026-08-07] — Fase 1 fechada: PLANO congelado em D-13
- T-02 aprovado pelo dono e T-03 aprovado na passagem 2 (`e_qa/b_artifact_consistency_report_260807_1605.md`): 19/19 achados da passagem 1 fechados, 5/5 restrições inegociáveis com portão, 6/6 critérios de aceite com número ou comando, zero CRÍTICO.
- D-13 congela o PLANO; `b_plan.md` passou a `status: congelado`. Mudança de rumo daqui em diante é D-NN novo.
- Os 7 achados da passagem 2 (AC-20..AC-26) entraram no mesmo commit, por decisão do dono: congelar com defeito conhecido faria cada conserto custar um D-NN.
- AC-20: M5 reexporta também `Level`, e o portão de M5 passou a cobrar a regra inteira — todo tipo que aparece na assinatura de M5 sai por M5.
- AC-22: T-11 (M6) saiu de "bloqueada por A-05". M6 não sabe o que é gol, então Q-04 não muda uma linha dele; só T-13 continua bloqueada.
- AC-24: o corte de 70% de E-4 passou a dizer qual configuração mede — taxa sem TURN sempre registrada (alimenta o gatilho de D-01), e o corte cobrado sobre o que vai ao ar.
- AC-25: `Role` virou `'shooter' | 'keeper'`; `'kick'` como papel colidia com `Kick`, que é o evento inteiro. Vocabulário atualizado no glossário.
- AC-21: tabela de QA ganhou coluna `Fechado em`, e o CONTEXT deixou de listar como aberto o que já estava verificado.
- AC-23: tabela de custo de `stack.md` preenchida com Trystero e a sinalização pública, que já são endpoint de runtime por D-04; TURN ficou marcado como linha condicional de E-4.
- AC-26: a ressalva do chaveamento (memória × `localStorage`) passou a aparecer também no contrato de M8, não só na tabela de donos de estado.
- Os dois relatórios de consistência deixaram de ser notas órfãs: linkados do card de T-03 e do DECISIONS.

## [2026-08-07] — Fase 1b revisada: os 19 achados de T-03 fechados
- Passagem 1 de consistência (T-03) reprovou o PLANO: 3 CRÍTICOS, 7 ALTOS, 8 MÉDIOS, 1 BAIXO — `e_qa/a_artifact_consistency_report_260807_1543.md`.
- QA-01, QA-02 e QA-03 abertos, um por CRÍTICO, apontando para o relatório (que era nota órfã).
- QA-01: portão de custo em M9 + `IceConfig` no contrato de M6 + tabela de custo por dependência no novo `a_context/stack.md`. TURN deixou de ser prosa e ganhou dono.
- QA-02: portão de licença em M7 com escopo de `assets/` inteiro, uniforme e jogador reais proibidos, `grep` da lista-morta.
- QA-03: portão de privacidade em M9 — zero script externo, zero endpoint fora da sinalização e do relay de M6.
- E-2 voltou a ser fechável: pedia regressão de 6 defeitos da v1 e os portões cobriam 5; o defeito 6 (ID de sala) foi para o portão de M6, em E-4.
- Portão de M7 voltou a ser cumprível: M5 passa a reexportar `MatchState` e `LinkStatus`, senão o `grep` da UI proibia o import que o contrato de M5 exigia.
- Portão de E-4 ganhou número de corte: taxa de conexão < 70% não fecha a etapa (o gatilho de `D-01` continua sendo efeito separado).
- Identificador de código padronizado em inglês, com a citação do padrão do repositório corrigida: `maxExclusive`, `Phase`, `Level` e `LinkStatus` estavam em português.
- D-11 (Vitest) e D-12 (`index.html` em `src/`, `root: 'src'`) congelados — eram propostas soltas de que todo portão de módulo dependia.
- Q-05 aberta (torneio também no modo online?) e Q-03 alargada para o escopo que o PLANO já lhe dava: formato do chaveamento e origem das bandeiras.
- CPU: histograma separado por papel (cobrar × defender), com o teto de 70% valendo para cada um.
- BACKLOG: A-04 dividida em A-04/A-05/A-06 (uma por questão aberta), T-13 (modo online de M5) e T-14 (telas do torneio) criadas, e os nomes de skill corrigidos para o nome real da pasta.
- `a_context/stack.md` criado com os limites da stack e o "quem roda o quê": o CONTEXT saiu de 3.779 para 3.516 caracteres (94% → 88%).
- Vocabulário fixado em `b_process/f_glossary_and_primer.md`: seleção/`Team`, disputa/`Match`. "Identidade de time" virou "de seleção" no CONTEXT e em `licenciamento`.

## [2026-08-06] — Fase 1b: PLANO com 9 módulos e 6 etapas
- T-02 entregue: `a_context/b_plan.md` com M1..M9, cada um com porta de entrada única, dono de estado declarado, portão objetivo e o ponto em que a stack dói.
- Regra de arquitetura acrescentada pelo plano: a seta de dependência só aponta para baixo (camadas 0 a 4), o que torna o grafo acíclico por construção. Duas consequências viram `grep`: a tela nunca importa motor/CPU/rede, e `Math.random()` só existe em M1.
- Milestones renomeadas para `E-1..E-6` para não colidir com os IDs de módulo `M1..M9`. E-4 (online) e E-5 (torneio) são paralelas: Q-03 trava o torneio, não o online.
- Desvio de ordem de build declarado: o esqueleto de build/publicação (M9) entra em E-1 porque o subcaminho do GitHub Pages só quebra em produção, e o teto de 8 MB é número lido da saída do build.
- Q-04 aberta: consequência de o peer sumir no meio da disputa online — era lacuna declarada em `regras_partida` e `online_p2p` sem entrada na tabela de Q-NN.
- BACKLOG povoado com T-04..T-12, uma tarefa por módulo, cada uma citando `**Módulo:** M-N`.
- Pendente do dono: rodar o portão de T-02 e, aprovado, registrar o D-NN que congela o plano; decidir o runner de teste e onde mora o `index.html`.

## [2026-08-06] — Fase 1a: arquitetura e stack congeladas
- T-01 fechado. D-01 (SPA estática, sem backend) e D-02 (TypeScript + Vite + Phaser 3) congelados, cada um com gatilho de revisão medido em `a_context/c_decisions.md`.
- Gatilho de D-01: conexão P2P < 70% em rede móvel real com fallback exigindo TURN próprio, ou requisito aprovado que exija autoridade de servidor.
- Gatilho de D-02: bundle inicial >= 8 MB lido da saída do build, ou < 30 fps em 360x640 no celular real do dono.
- D-09 responde Q-01: alternadas = morte súbita em rodadas de 1 cobrança por lado, decidida ao fim da rodada, sem teto.
- D-10 responde Q-02: CPU em 3 níveis por peso do histórico da sessão (0% / 50% / 70%), teto absoluto de 70%.
- `a_context/regras_partida.md` ganhou os invariantes das alternadas e da CPU. Q-03 segue aberta.
- Commit 2a34a40 publicado em gustavomot4/tapgo-v2. A-01 fechada: o remote já existia e o `main` rastreia `origin/main` — o BACKLOG é que estava desatualizado.

## [2026-08-06] — Fase 0 aprovada
- Dono leu o CONTEXT integralmente e aprovou sem ressalva; portão da Fase 0 fechado.
- Commit 6ef539b com o hook de pre-commit rodando o check.py.
- A-02 e A-03 concluídas; A-01 (remote no GitHub) e A-04 (Q-01..Q-03) seguem abertas.
- Lições da sessão registradas em b_process/d_agent_learnings.md.
- QA-14 registrado no kit (repo project-pipeline-kit): projeto novo reprova o portão antes do git init.

## [v2.0.0-dev] — 2026-08-07 — T-11 (M6, transporte P2P)
- **E-3 fechada:** passada no celular real do dono conferida (toque em 360x640 e fps).
- Adicionado: M6 implementado em `src/net/index.ts` — `hostRoom`/`joinRoom`, ID de sala de 130 bits por `crypto.getRandomValues`, timeout de 20 s com relógio rearmado na saída do peer, validação de forma do `Move`, fila de envio com teto, TURN por `IceConfig`. Trystero 0.25.3 entra por `import()` dinâmico, fora do bundle inicial.
- Adicionado: `src/medicao.html` + `src/medicao.ts` — instrumento das duas medições de E-4, publicável no Pages; segunda entrada do build.
- Testes: 29 novos em `src/tests/net.test.ts`; suíte 207/207, verde em 9 execuções seguidas.
- Corrigido: a primeira entrega desta sessão **reprovou 17 testes na máquina do dono** (Windows) tendo passado no sandbox (Linux). Três causas encadeadas, todas no teste: relógio falso total travando o carregador de módulos, espera por giro do event loop, e `vi.mock` de módulo escapando sob carga (a Trystero real caindo no lugar do duplo, intermitente). Ver `D-34`.
- Decisões: D-29 (STEP 0: assíncrono) · D-30 (ID fora do `Rng` de M1) · D-31 (máquina de estados, `failed` terminal) · D-32 (M6 confere forma, M5 confere regra) · D-33 (página de medição) · D-34 (sinalização por injeção; `opened()`).
- Aberto: Q-10 (TURN entra ou fica fora de escopo — depende das medições) · QA-06 (`bundle-size.mjs` soma toda entrada no "bundle inicial").
- Registro: `c_decisions.md` arquivado duas vezes nesta sessão (D-09, D-10, D-13, D-14, D-15, D-19, D-20, D-22, D-23, D-26, D-27, D-28) para caber sob o teto de 12.000.
- **Não entregue de propósito:** o portão de E-4 continua aberto — as duas taxas em rede móvel são `A-08`, do dono.

## [v2.0.0-dev] — 2026-08-06
- Fase 0 concluída: CONTEXT preenchido a partir da leitura integral da v1 (gustavomot4/TAP-GO) e de pesquisa de licenciamento e de plataformas.
- Decisões: D-01 (SPA estática sem backend) · D-02 (TypeScript + Vite + Phaser 3) · D-03 (país + bandeira, sem escudo) · D-04 (online P2P sem servidor) · D-05 (GitHub Pages + itch.io)
- Rejeitados: D-06 (backend da v1) · D-07 (clubes/escudos reais) · D-08 (Godot 4)
- Adicionado: temas de domínio `licenciamento`, `online_p2p` e `regras_partida`.
- Aberto: Q-01 (alternadas) · Q-02 (dificuldade da CPU) · Q-03 (seleções e nome do torneio)

<!-- Modelo:
## [X.Y.Z] — AAAA-MM-DD
- Adicionado: … · Corrigido: QA-NN … · Decisões: D-NN
-->
