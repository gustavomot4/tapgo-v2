---
tags: [decisoes]
status: atual
---
# DECISIONS.md — decisões (D-NN) e questões abertas (Q-NN)

> **Append-only:** decisão nova = linha nova; reversão = linha nova com `SUPERSEDE D-XX`, nunca editar a antiga.
> **Teto: 2 frases por linha.** Evidência longa vira nota em `e_qa/<slug>.md` ou tema em `a_context/`.
> **Registre as rejeições.** A lista de rejeitados é o que impede a IA de re-propor o que já morreu.
> **`ARQUIVADO`:** íntegra em [[decisions_archive]] — o ponteiro é este, e não se repete por linha.
> **Retirados da tabela** (ID preservado, nada revertido): `D-03` `D-05` `D-11` `D-12` `D-14`..`D-21` `D-23`..`D-26` `D-28`..`D-34` · `Q-06`.
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
| D-35 | 2026-08-08 | ADOTADO · ARQUIVADO | `Q-04`: peer que some no meio = disputa **sem resultado**; M5 para de aceitar escolha e `winner` segue `null` |  |
| D-36 | 2026-08-08 | ADOTADO · ARQUIVADO | Notificação vinda da REDE não propaga exceção de assinante (loga); a de `choose()` propaga |  |
| D-37 | 2026-08-08 | ADOTADO · ARQUIVADO | Critério de aceite sai do CONTEXT e vira [[portao_de_aceite]], lido sob demanda pelo Mapa |  |
| D-38 | 2026-08-08 | ADOTADO · ARQUIVADO | `QA-08`: na medição os DOIS lados entram por `joinRoom(idDaTentativa(base,n))`; a porta de `D-13` não muda um byte |  |
| D-39 | 2026-08-08 | REJEITADO | `hostRoom(ice?, roomId?)` — saída (a) de `QA-08` | Compra o que `D-38` dá de graça, pagando com precedente em porta congelada — e `Q-09`/`Q-11` esperam esse precedente |
| D-40 | 2026-08-08 | REJEITADO | Exportar `createChannel` — saída (b) de `QA-08` | `createChannel` não valida `roomId`: exportá-lo permite abrir sala sem o portão do defeito 6 |
| D-41 | 2026-08-08 | REJEITADO | Uma sala para a medição inteira — saída (c) de `QA-08` | `leave()` é assíncrono: peer da tentativa anterior pode virar `'connected'` sem conexão nova, enviesando a taxa PARA CIMA — [[m6_transporte_notas]] |
| D-42 | 2026-08-08 | ADOTADO | Portão de E-4 é estatístico (limite inferior 95% acima de 70%), não contagem fixa; substitui o piso de 30 de `A-08` | 5/5 garante só 54,9%; tabela e critério em [[m6_transporte_notas]] |
| D-43 | 2026-08-08 | ADOTADO | Como o registro perde peso: sai da tabela quem nenhum `.md` vivo cita (`src/` **não** segura linha, supersedendo o critério 3 de `A-09`); o gatilho de revisão vai para o tema que mede | O critério antigo tornava o corte inalcançável — números no card `A-12`. Gatilho longe do número que o dispara não é lido |
| D-44 | 2026-08-08 | ADOTADO | `T-16`: a medição lê o par de candidatos embrulhando o **global** `RTCPeerConnection`, e abre os sucessos por tipo | M6 intacto, ao contrário de `D-39`/`D-40`; a leitura por tipo de par separa hairpin de travessia real — legenda no card `A-08` |
| D-45 | 2026-08-08 | ADOTADO | O texto colável da medição leva o IP com 2 octetos; inteiro só com a caixa marcada | Repositório público (`D-21`) e o resumo vira linha de registro; quem decide hairpin é o IP inteiro, que a tela mostra |
| D-46 | 2026-08-08 | ADOTADO | `Q-12`: IPv6 fim-a-fim é sucesso, mas E-4 passa a ter **dois contadores** — `IPv6/sem NAT` e `IPv4/com NAT` — e o corte de 70% só é cobrado contra o de IPv4 | O corte nasceu do CGNAT, que é de IPv4 ([[online_p2p]]): medir com IPv6 nos dois lados mede onde o problema não existe. Como separar as rodadas está no card `A-08` |
| D-47 | 2026-08-12 | ADOTADO | `Q-10`: TURN fica **fora de escopo** (saída b); a taxa sem ele já passa o corte, e o fallback é erro honesto | Limite inferior 95% de **83,8%** contra os 70%, números no card `A-08`. Lacuna: até ~16% pode não conectar e fica sem relay |
| D-48 | 2026-08-12 | ADOTADO | `Q-07`: a ordem **não alterna** — quem cobra primeiro segue primeiro até o fim, inclusive nas alternadas; e o primeiro sai de **sorteio** com o `Rng` de M1, não da constante `A` | Regra do esporte (IFAB), escrita em [[regras_partida]]; a não-alternância é o que M2 já faz: zero código |
| D-49 | 2026-08-12 | ADOTADO · VETÁVEL | `T-17b`: o sorteio é **painel dentro da tela de cobrança**, não a "tela da moeda" que o card pedia | Tela própria custaria o 3º toque num fluxo com portão de **2 toques**; detalhe em [[t17b_sorteio_na_tela]] |
| D-50 | 2026-08-12 | ADOTADO | `A-13` saída (a): `QA-NN` sai deste registro para [[d_qa\|QA]], com orçamento próprio, e o `check.py` mede os dois **sem o padding** de tabela | Custo: o `check.py` sai do sha do kit e não recebe mais correção por upgrade. **Folga a 30 dias não alcançada** — números no CONTEXT, método em [[a13_estrutura_do_registro]] |
| D-51 | 2026-08-12 | ADOTADO | `Q-03`: catálogo = as **32 primeiras** do snapshot de 20/07/2026; congela o critério, não a lista | 2 fontes independentes batendo em 21..33; códigos, URLs e data em [[m4_lista_das_32]] |
| D-52 | 2026-08-12 | ADOTADO · CONFIRMADO · SUPERSEDE D-02 no formato de `code` | `code` aceita `GB-ENG` (ISO 3166-2) além da alfa-2, senão a 4ª colocada não entra | Medido: `Intl.DisplayNames.of('GB-ENG')` lança `RangeError` — o nome dela vira o único literal do catálogo, e o custo está em [[m4_lista_das_32]] |
| D-53 | 2026-08-12 | ADOTADO | `Q-03`: 8 grupos de 4 + mata-mata de 16 com 3º lugar = **64 disputas**; desempate confronto direto → saldo → gols → sorteio do `Rng` | 48+15+1=64, o número que o portão de M8 cobra; classifica por vitórias, já que a disputa nunca empata (`D-09`) |
| D-54 | 2026-08-12 | ADOTADO | `Q-03`: bandeiras do **flag-icons** (MIT, © 2013 Panayiotis Lipiridis) — só os 32 SVGs, com a licença | A MIT pede o aviso de copyright, então ele entra antes do 1º SVG; procedência em [[licenciamento]] |
| D-55 | 2026-08-12 | ADOTADO | `Q-03`: o torneio é a **TAP GO Cup** | Candidato de [[licenciamento]], fora da lista-morta que E-5 varre |
| D-56 | 2026-08-12 | ADOTADO | `Q-05`: torneio só em `cpu` e `local`; sala de 8 **adiada** (ideia, não compromisso) | O chaveamento não vira estado compartilhado entre aparelhos, e a camada 3 do PLANO não muda |
| D-57 | 2026-08-12 | ADOTADO · SUPERSEDE D-13 no que M8 exige | Cai o portão "sem par repetido", a porta de M8 **serializa**, e M8 importa **M2/M3** para simular disputa sem o jogador | Grupo e mata-mata reencontram o par; M5 espera a escolha do lado local e não simula CPU×CPU; 64 disputas não cabem numa sessão — desenho no [[b_plan\|PLANO]] |

| D-58 | 2026-08-12 | ADOTADO | O dono confirmou as duas vetáveis: o `GB-ENG` de `D-52` fica, e a porta de M8 recebe `seed`, não `Rng` | Sem semente própria M8 não conhece o cursor do gerador, e o torneio restaurado divergiria com o teste de determinismo passando. Cursor em M1 foi a saída **rejeitada**: porta mais dependida do projeto por necessidade de um módulo só |

| D-59 | 2026-08-12 | ADOTADO | O sorteio dos grupos é **cego**: as 32 caem nos 8 grupos direto pelo `Rng`, sem potes nem cabeça de chave | Escolha de variância, com o custo medido: **50,2%** das sementes põem ao menos duas das quatro primeiras no mesmo grupo, e 9,7% juntam a 1ª com a 2ª |

| D-60 | 2026-08-12 | ADOTADO | **Não há progressão de dificuldade**: o torneio inteiro roda no nível escolhido no início, do grupo à final | `D-13` dizia "nenhuma **progressão** passa dos 70%" sem que houvesse decisão de que existisse uma; `TournamentConfig.level` segue **um** valor, agora por escolha e não por omissão |

| D-61 | 2026-08-12 | ADOTADO | `T-18`: a exceção de `D-52` é **lista fechada de tamanho 1** (`NAME_EXCEPTIONS`), e M4 exporta junto o validador que a aplica (`assertCatalogCode`) | Só com o validador exportado o portão "um segundo código fora da alfa-2 reprova" é cobrado na via mais baixa: inspecionar a lista pronta prova a lista de hoje, não a próxima linha errada. Nenhuma assinatura de `D-13` muda |

> **Gatilhos de revisão** (`D-43`): moram no tema que cada um mede — `D-01` em [[online_p2p]], `D-02` em [[stack]].

## Questões abertas (Q-NN — decisões do DONO, não do agente)
| # | Questão | Decidir quando |
|---|---|---|
| Q-01 | ~~Regra exata das alternadas/morte súbita~~ | **RESPONDIDA 2026-08-06 → D-09** |
| Q-02 | ~~A CPU adapta ao padrão do jogador? Qual o teto de dificuldade?~~ | **RESPONDIDA 2026-08-06 → D-10** |
| Q-03 | ~~Seleções, formato do chaveamento, nome do torneio e origem das bandeiras~~ | **RESPONDIDA 2026-08-12 → D-51, D-53, D-54, D-55** |
| Q-04 | ~~Peer some no meio da disputa online: quem vence, empata ou anula?~~ | **RESPONDIDA 2026-08-08 → D-35** |
| Q-05 | ~~O torneio roda também no modo `online`?~~ | **RESPONDIDA 2026-08-12 → D-56** |
| Q-07 | ~~Nas alternadas, a ordem de cobrança alterna entre rodadas?~~ | **RESPONDIDA 2026-08-12 → D-48** |
| Q-09 | No modo `local`, de quem é a escolha pendente, se a porta congelada de M5 não a expõe? | antes de T-10 (**prazo vencido — `QA-07`**); hoje M7 deriva de `kicks.length` e a saída definitiva está em [[questoes_abertas_notas]] |
| Q-10 | ~~TURN entra como camada gratuita ou fica fora de escopo?~~ | **RESPONDIDA 2026-08-12 → D-47** |
| Q-08 | `pick(role)` lê o histograma do **mesmo** papel — é essa a intenção, ou quem defende deveria ler o histograma `shooter` do humano? | antes de E-3 (**prazo vencido — `QA-07`**); as duas leituras e o custo de inverter em [[questoes_abertas_notas]] |
| Q-12 | ~~IPv6 fim-a-fim conta para o corte de 70% de E-4?~~ | **RESPONDIDA 2026-08-08 → D-46** |
| Q-11 | Como M7 recebe o `roomId` do anfitrião, se a porta de M5 (`D-13`) não o devolve e M7 não pode importar `src/net`? | antes da tela de convite — duas saídas em [[m5_sessao_notas]], as duas mexendo em porta congelada, logo `D-NN` do dono |
