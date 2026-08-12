---
tags: [decisoes]
status: atual
---
# DECISIONS.md — decisões (D-NN) e questões abertas (Q-NN)

> **Append-only:** decisão nova = linha nova; reversão = linha nova com `SUPERSEDE D-XX`, nunca editar a antiga.
> **Teto: 2 frases por linha.** Evidência longa vira nota em `e_qa/<slug>.md` ou tema em `a_context/`.
> **Registre as rejeições.** A lista de rejeitados é o que impede a IA de re-propor o que já morreu.
> **Linha `ARQUIVADO`:** a íntegra está em [[decisions_archive]]. O ponteiro é este, e por isso não se repete em cada linha.
> **Retirados da tabela** (íntegra lá, ID preservado, nada revertido): `D-03` `D-05` `D-11` `D-12` `D-14`..`D-21` `D-23`..`D-26` `D-28`..`D-30` `D-33` `D-34` · `Q-06`.
> **Achados de QA moram em [[d_qa|QA]]** desde `D-50` — este arquivo não define mais `QA-NN`.

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
| D-49 | 2026-08-12 | ADOTADO · VETÁVEL | `T-17b`: o sorteio é **painel dentro da tela de cobrança**, não a "tela da moeda" que o card pedia | Tela própria custaria o 3º toque num fluxo crítico com portão de **2 toques** (`tela_inicio.ts`); detalhe em [[t17b_sorteio_na_tela]] |
| D-50 | 2026-08-12 | ADOTADO | `A-13` saída (a): `QA-NN` sai deste registro para [[d_qa\|QA]], com orçamento próprio de 8.000/6.400, e o `check.py` passa a medir os dois **sem o padding** de alinhamento de tabela | Custo: o `check.py` sai do sha do kit (`604fe5f3…` no `.kit-manifest`) e para de receber correção por upgrade — o caminho limpo é release de kit, em outro repositório; 53 IDs, zero perdido, zero duplicado entre os dois. **Folga a 30 dias NÃO alcançada:** 6.222 contra crescimento projetado de 27.285, ou seja ~7 dias corridos — números em [[a13_estrutura_do_registro]] |

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

## Achados de QA (QA-NN)
> **Mudaram de arquivo em 2026-08-12 (`D-50`, tarefa `A-13`): agora moram em [[d_qa|QA]].**
> Motivo: decisão permanente, questão do dono e achado de QA têm ciclos de vida diferentes e
> dividiam um orçamento só — e era o QA que crescia mais rápido, com 6 dos achados abertos
> (achado aberto não se arquiva). Nenhum ID mudou, nada foi revertido.
