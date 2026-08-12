---
tags: [decisoes]
status: atual
---
# DECISIONS.md — decisões (D-NN), questões abertas (Q-NN) e QA (QA-NN)

> **Append-only:** decisão nova = linha nova; reversão = linha nova com `SUPERSEDE D-XX`, nunca editar a antiga.
> **Teto: 2 frases por linha.** Evidência longa vira nota em `e_qa/<slug>.md` ou tema em `a_context/`.
> **Registre as rejeições.** A lista de rejeitados é o que impede a IA de re-propor o que já morreu.
> **Linha `ARQUIVADO`:** a íntegra está em [[decisions_archive]]. O ponteiro é este, e por isso não se repete em cada linha.
> **Retirados da tabela** (íntegra lá, ID preservado, nada revertido): `D-03` `D-05` `D-11` `D-12` `D-14`..`D-21` `D-23`..`D-26` `D-28`..`D-30` `D-33` `D-34` · `Q-06` · `QA-01`..`QA-03`.

## Decisões
| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| D-01 | 2026-08-06 | ADOTADO · ARQUIVADO | Forma = SPA estática, sem backend |  |
| D-02 | 2026-08-06 | ADOTADO · ARQUIVADO | Stack = TypeScript + Vite + Phaser 3 |  |
| D-04 | 2026-08-06 | ADOTADO · ARQUIVADO | Online = P2P WebRTC (Trystero) |  |
| D-06 | 2026-08-06 | REJEITADO · ARQUIVADO | Reaproveitar o backend Node/Express/MySQL da v1 |  |
| D-07 | 2026-08-06 | REJEITADO · ARQUIVADO | Clubes reais ou escudo de federação |  |
| D-08 | 2026-08-06 | REJEITADO · ARQUIVADO | Godot 4 como engine |  |
| D-09 | 2026-08-06 | ADOTADO · ARQUIVADO | Alternadas = morte súbita em rodadas de 1 cobrança por lado, decidida ao FIM da rodada. Responde Q-01 | regra em [[regras_partida]] |
| D-10 | 2026-08-06 | ADOTADO · ARQUIVADO | CPU em 3 níveis por peso do histórico de zonas: 0% / 50% / 70%, teto absoluto 70%. Responde Q-02 | regra em [[regras_partida]] |
| D-13 | 2026-08-07 | ADOTADO · ARQUIVADO | **PLANO congelado**: M1..M9 com porta única, dono de estado e portão objetivo; etapas E-1..E-6. Mudança de rumo é D-NN novo | o plano em si é o [[b_plan\|PLANO]] |
| D-22 | 2026-08-07 | ADOTADO · ARQUIVADO | `Team.flag` passa a `string \| null`; `null` = bandeira sem arquivo, até `A-04` |  |
| D-27 | 2026-08-07 | ADOTADO · ARQUIVADO | M7 = DOM no menu/placar/zonas; Phaser só na cobrança, por `import()` |  |
| D-31 | 2026-08-07 | ADOTADO · ARQUIVADO | `'failed'` é **terminal**; peer que sai volta a `waiting` e **rearma** os 20 s; `onStatus` entrega o status ao assinar |  |
| D-32 | 2026-08-07 | ADOTADO · ARQUIVADO | M6 valida a **forma** do `Move` e descarta o resto com log; ordem e legalidade seguem de M5. Fila com teto 32 |  |
| D-35 | 2026-08-08 | ADOTADO · ARQUIVADO | `Q-04`: peer que some no meio = disputa **sem resultado**; M5 para de aceitar escolha e `winner` segue `null` |  |
| D-36 | 2026-08-08 | ADOTADO · ARQUIVADO | Notificação vinda da REDE não propaga exceção de assinante (loga); a de `choose()` propaga |  |
| D-37 | 2026-08-08 | ADOTADO · ARQUIVADO | Critério de aceite sai do CONTEXT e vira [[portao_de_aceite]], lido sob demanda pelo Mapa |  |
| D-38 | 2026-08-08 | ADOTADO · ARQUIVADO | `QA-08`: na medição os DOIS lados entram por `joinRoom(idDaTentativa(base,n))`; a porta de `D-13` não muda um byte |  |
| D-39 | 2026-08-08 | REJEITADO | `hostRoom(ice?, roomId?)` — saída (a) de `QA-08` | Compra o que `D-38` obtém de graça, pagando com precedente em porta congelada — e `Q-09` e `Q-11` estão parados esperando esse precedente |
| D-40 | 2026-08-08 | REJEITADO | Exportar `createChannel` — saída (b) de `QA-08` | `createChannel` não valida `roomId`: exportá-lo abre caminho para abrir sala sem a checagem do portão do defeito 6 (`D-30`) |
| D-41 | 2026-08-08 | REJEITADO | Uma sala para a medição inteira — saída (c) de `QA-08` | `leave()` é assíncrono: peer da tentativa anterior pode virar `'connected'` sem conexão nova, enviesando a taxa PARA CIMA — [[m6_transporte_notas]] |
| D-42 | 2026-08-08 | ADOTADO | Portão de E-4 é estatístico (limite inferior 95% acima de 70%), não contagem fixa; substitui o piso de 30 de `A-08` | 5/5 garante só 54,9%; tabela e critério em [[m6_transporte_notas]] |
| D-43 | 2026-08-08 | ADOTADO | Como o registro perde peso: sai da tabela quem nenhum `.md` vivo cita (`src/` **não** segura linha — supersede o critério 3 de `A-09`), e gatilho de revisão vai para o tema que ele mede | Pelo critério 3 o corte máximo dava 10.055, portão de `A-12` inalcançável; `A-09` já o excedera ao retirar `D-33`, citado em `vite.config.ts`. Gatilho longe do número que o dispara não é lido |
| D-44 | 2026-08-08 | ADOTADO | `T-16`: a medição chega ao par de candidatos embrulhando o **global** `RTCPeerConnection` (`Proxy` sobre `construct`), e abre os sucessos por tipo de par | M6 intacto, ao contrário de `D-39`/`D-40`; `relay` não é P2P direto e `srflx↔srflx` com o MESMO IP público é hairpin, que não fala de CGNAT |
| D-45 | 2026-08-08 | ADOTADO | O texto colável da medição leva o IP com 2 octetos; inteiro só com a caixa marcada | Repositório público (`D-21`) e o resumo vira linha de registro; a comparação que decide hairpin usa o IP inteiro, que a tela mostra |
| D-46 | 2026-08-08 | ADOTADO | `Q-12`: IPv6 fim-a-fim é sucesso, mas E-4 passa a ter **dois contadores** — `IPv6/sem NAT` e `IPv4/com NAT` — e o corte de 70% é cobrado só contra o de IPv4 | O corte nasceu dos 15-30% de CGNAT, que é de IPv4: medir com IPv6 nos dois lados mede onde o problema não existe. Zero código — forçar APN IPv4 separa as rodadas |
| D-47 | 2026-08-12 | ADOTADO | `Q-10`: TURN fica **fora de escopo** (saída b); a taxa sem ele já passa o corte, e o fallback é erro honesto | 17/17 em `IPv4/com NAT` (APN forçado, Claro×Claro), limite inferior 95% de **83,8%** contra os 70%. Lacuna: até ~16% pode não conectar e fica sem relay |
| D-48 | 2026-08-12 | ADOTADO | `Q-07`: a ordem de cobrança **não alterna** — quem cobra primeiro segue primeiro até o fim, inclusive nas alternadas; e quem é o primeiro sai de **sorteio** com o gerador de M1, não da constante `A` (`T-17`) | É a regra do esporte: a IFAB responde que a 1ª cobrança de cada nova rodada é do time que cobrou primeiro na anterior. A não-alternância é o que M2 já faz: zero código |

> **Gatilhos de revisão** (`D-43`): moram no tema que cada um mede — `D-01` em [[online_p2p]], `D-02` em [[stack]].

## Questões abertas (Q-NN — decisões do DONO, não do agente)
| # | Questão | Decidir quando |
|---|---|---|
| Q-01 | ~~Regra exata das alternadas/morte súbita~~ | **RESPONDIDA 2026-08-06 → D-09** |
| Q-02 | ~~A CPU adapta ao padrão do jogador? Qual o teto de dificuldade?~~ | **RESPONDIDA 2026-08-06 → D-10** |
| Q-03 | Quantas e quais seleções entram, **qual o formato do chaveamento**, qual o nome do torneio (não pode ser "Copa do Mundo") e **de onde vêm as bandeiras** | a parte das bandeiras antes de E-3 (asset sem licença não entra no repositório); o resto antes de E-5, e o histórico do texto em [[questoes_abertas_notas]] |
| Q-04 | ~~Peer some no meio da disputa online: quem vence, empata ou anula?~~ | **RESPONDIDA 2026-08-08 → D-35** |
| Q-05 | O torneio roda também no modo `online`, ou só contra a CPU e no mesmo aparelho? | antes de E-5 — muda a camada 3 do PLANO e fecha AC-07; efeito em [[questoes_abertas_notas]] |
| Q-07 | ~~Nas alternadas, a ordem de cobrança alterna entre rodadas?~~ | **RESPONDIDA 2026-08-12 → D-48** |
| Q-09 | No modo `local`, de quem é a escolha pendente, se a porta congelada de M5 não a expõe? | antes de T-10 (**prazo vencido — `QA-07`**); hoje M7 deriva de `kicks.length` e a saída definitiva está em [[questoes_abertas_notas]] |
| Q-10 | ~~TURN entra como camada gratuita ou fica fora de escopo?~~ | **RESPONDIDA 2026-08-12 → D-47** |
| Q-08 | `pick(role)` lê o histograma do **mesmo** papel — é essa a intenção, ou quem defende deveria ler o histograma `shooter` do humano? | antes de E-3 (**prazo vencido — `QA-07`**); as duas leituras e o custo de inverter em [[questoes_abertas_notas]] |
| Q-12 | ~~IPv6 fim-a-fim conta para o corte de 70% de E-4?~~ | **RESPONDIDA 2026-08-08 → D-46** |
| Q-11 | Como M7 recebe o `roomId` do anfitrião, se a porta de M5 (`D-13`) não o devolve e M7 não pode importar `src/net`? | antes da tela de convite — duas saídas em [[m5_sessao_notas]], as duas mexendo em porta congelada, logo `D-NN` do dono |

## Achados de QA (QA-NN — citados no commit: `fix: QA-NN …`)
> Passagens de revisão: 1. Critério e evidência: [[decisions_archive]].

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-04 | 2026-08-07 | MÉDIO | `tsconfig.json` (`D-14`) × `vite.config.ts` (T-05) | `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de tipo no build só estoura no `vite build` | Acrescentar `"vite.config.ts"` ao `include` — de outro dono, regra 4; porquê em [[questoes_abertas_notas]] | _(aberto)_ |
| QA-06 | 2026-08-07 | MÉDIO | `src/scripts/bundle-size.mjs` (M9) | Soma **toda** entrada `isEntry` no "bundle inicial": com `D-33`, o gatilho de `D-02` lê página que o jogador nunca abre | Medir só o grafo de `index.html` — não feito aqui porque é de M9 e muda um portão (regra 4) | _(aberto)_ |
| QA-08 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Anfitrião sorteava sala nova a cada toque: medição de `A-08` daria 0% | `D-38` | ✔ `T-15` 2026-08-08 (`bd68d0f`) |
| QA-07 | 2026-08-08 | BAIXO | `Q-08` e `Q-09`, no próprio registro | Prazo de decisão vencido com a questão ainda aberta: `Q-08` dizia "antes de E-3" (fechada) e `Q-09` "antes de T-10" (feita) | O dono redata o prazo ou responde a questão — `A-10` não mexe em prazo alheio (regra 6) | _(aberto)_ |
| QA-11 | 2026-08-08 | CRÍTICO | Árvore de trabalho × git | **T-13 nunca foi commitada:** `src/session/index.ts` tem 208 linhas fora do git e `src/tests/session_online.test.ts` é untracked, mas o CONTEXT lista `online` T-13 como Pronto e a suíte como 220/220 | O dono commita e empurra T-13 (`D-35`/`D-36`), ou diz por que está segurando — `origin/main` é o que o Pages publica | _(aberto)_ |
| QA-09 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Índice da rotação por aparelho dessincronizava as salas e não ressincronizava | Índice e 6 chars do ID na tela dos dois | ✔ `T-15` 2026-08-08 (`31b39d9`) |
| QA-12 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Sortear sala nova não zerava a rotação — achado em campo | Índice separado da estatística | ✔ `T-15` 2026-08-08 |
| QA-14 | 2026-08-08 | ALTO | `src/medicao_par.ts` (`D-44`) | `host↔host` era classificado como "mesma rede local" pelo TIPO do candidato, ignorando a FAIXA do endereço: em IPv6 não há NAT e o `host` já é global, então o melhor resultado possível saía rotulado como o mais inútil (`P2P direto em 0 de 1`) | Classificar pela faixa: público × público com prefixos /64 diferentes é `host-direto`; 100.64/10 é `host-cgnat`; privado segue local | ✔ 2026-08-08 |
| QA-13 | 2026-08-08 | CRÍTICO | `src/medicao.ts` (`D-44`) | A Trystero reaproveita um pool de 20 conexões entre salas, e esvaziar a lista observada por tentativa descartava justamente a que conectava: **11 de 12 pares não lidos** em campo (o 12º era leitura boa: IPv6, ver `QA-14`) | Escolher a conexão pelo **estado vivo**, não pela janela de criação; e "par não lido" passa a dizer o que faltou | ✔ 2026-08-12 (17/17 lidos em campo) |
| QA-10 | 2026-08-08 | MÉDIO | `src/medicao.ts` (`D-33`) | Erro de configuração soma tentativa **e** falha: erro do operador entra na taxa que decide a revisão de `D-01`, enviesando para baixo | Não contar tentativa quando o canal nunca abriu — muda denominador de portão, logo `D-NN` (regra 4) | _(aberto)_ |
| QA-05 | 2026-08-07 | MÉDIO | `src/tests/teams.test.ts` | Escreve por extenso os 6 termos da lista-morta: o portão de marca de M7 (`grep` zero em `src/`) devolve 6 | Montar as agulhas em tempo de execução, como `core.test.ts` e `ui.test.ts` — outro dono (regra 4) | _(aberto)_ |
| QA-15 | 2026-08-12 | MÉDIO | `src/ui/rotas.ts` (M7) | Promete que `A` cobra primeiro; com o sorteio de `T-17` o humano pode começar defendendo e a tela mente | Tela da moeda, metade `frontend-uiux` de `T-17` | _(aberto)_ |
