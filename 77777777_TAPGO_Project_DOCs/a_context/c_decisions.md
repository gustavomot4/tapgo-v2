---
tags: [decisoes]
status: atual
---
# DECISIONS.md — decisões (D-NN), questões abertas (Q-NN) e QA (QA-NN)

> **Append-only:** decisão nova = linha nova; reversão = linha nova com `SUPERSEDE D-XX`, nunca editar a antiga.
> **Teto: 2 frases por linha.** Evidência longa vira nota em `e_qa/<slug>.md` ou tema em `a_context/`.
> **Registre as rejeições.** A lista de rejeitados é o que impede a IA de re-propor o que já morreu.
> **Linha `ARQUIVADO`:** a íntegra está em [[decisions_archive]]. O ponteiro é este, e por isso não se repete em cada linha.
> **Retirados da tabela** (íntegra lá, ID preservado, nada revertido): `D-03` `D-05` `D-11` `D-15`..`D-18` `D-21` `D-23` `D-28` `D-33` `D-34` · `Q-06` · `QA-02`.

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
| D-12 | 2026-08-07 | ADOTADO · ARQUIVADO | `index.html` em `src/`, com `root: 'src'` e `outDir: '../dist'` |  |
| D-13 | 2026-08-07 | ADOTADO · ARQUIVADO | **PLANO congelado**: M1..M9 com porta única, dono de estado e portão objetivo; etapas E-1..E-6. Mudança de rumo é D-NN novo | o plano em si é o [[b_plan\|PLANO]] |
| D-14 | 2026-08-07 | ADOTADO · ARQUIVADO | `package.json` e `tsconfig.json` nascem em T-04; build e workflow seguem de M9 |  |
| D-19 | 2026-08-07 | ADOTADO · ARQUIVADO | `play` reconfere o estado recebido contra o próprio histórico e **lança** quando não fecha |  |
| D-20 | 2026-08-07 | ADOTADO · ARQUIVADO | Teto de 70% da CPU é corte aplicado DEPOIS da mistura de `D-10`, em ppm inteiro |  |
| D-22 | 2026-08-07 | ADOTADO · ARQUIVADO | `Team.flag` passa a `string \| null`; `null` = bandeira sem arquivo, até `A-04` |  |
| D-24 | 2026-08-07 | ADOTADO · ARQUIVADO | `src/net/index.ts` nasce em T-09 com só os tipos de M6 — implementado depois, em T-11 |  |
| D-25 | 2026-08-07 | ADOTADO · ARQUIVADO | M5 recusa na **criação**: `online`, `level` fora de `cpu`, `roomId` fora de `online`, seleção fora de M4 |  |
| D-26 | 2026-08-07 | ADOTADO · ARQUIVADO | No modo `cpu`, M5 chama `pick` antes de `observe` na mesma cobrança |  |
| D-27 | 2026-08-07 | ADOTADO · ARQUIVADO | M7 = DOM no menu/placar/zonas; Phaser só na cobrança, por `import()` |  |
| D-29 | 2026-08-07 | ADOTADO · ARQUIVADO | Troca de jogadas é assíncrona, não request/response |  |
| D-30 | 2026-08-07 | ADOTADO · ARQUIVADO | `roomId` = 26 chars Crockford de `crypto`, fora do `Rng` de M1 |  |
| D-31 | 2026-08-07 | ADOTADO | `'failed'` é **terminal**; peer que sai volta a `waiting` e **rearma** os 20 s; `onStatus` entrega o status atual ao assinar | Peer atrasado ressuscitaria partida já dada como perdida; quem vence segue sendo `Q-04` — [[m6_transporte_notas]] |
| D-32 | 2026-08-07 | ADOTADO | M6 valida a **forma** do `Move` e descarta o resto com log; ordem e legalidade seguem de M5. Fila de envio com teto 32 | Senão M6 entregaria `Move` mentiroso na única borda com dado de fora; `seq` torna reenvio seguro — [[m6_transporte_notas]] |
| D-35 | 2026-08-08 | ADOTADO | `Q-04`: peer que some no meio = disputa **sem resultado**; M5 para de aceitar escolha e `winner` segue `null` | Vencedor por abandono seria regra de disputa na borda; M2 intacto, T-13 fechou sem tocar `regras_partida` — [[m5_sessao_notas]] |
| D-36 | 2026-08-08 | ADOTADO | Notificação vinda da REDE não propaga exceção de assinante (loga); a de `choose()` propaga | Exceção subindo pela pilha de M6 partiria a máquina de estados do canal — [[m5_sessao_notas]] |

## Gatilhos de revisão (o número que reabre a decisão — "vai escalar" não é gatilho)
> IDs em crase aqui de propósito: a coluna 1 desta tabela **não** define ID (`check.py` leria como duplicata).

| Decisão | Reabre quando, medido |
|---|---|
| `D-01` | Conexão P2P medida < 70% em rede móvel real **e** o fallback exigir TURN próprio; ou o dono aprovar requisito com autoridade de servidor (ranking global antifraude, conta) |
| `D-02` | Bundle inicial ≥ 8 MB lido da saída do build (nunca estimado); ou < 30 fps no fluxo crítico em viewport 360x640 no celular real do dono, sem correção dentro do Phaser |

## Questões abertas (Q-NN — decisões do DONO, não do agente)
| # | Questão | Decidir quando |
|---|---|---|
| Q-01 | ~~Regra exata das alternadas/morte súbita~~ | **RESPONDIDA 2026-08-06 → D-09** |
| Q-02 | ~~A CPU adapta ao padrão do jogador? Qual o teto de dificuldade?~~ | **RESPONDIDA 2026-08-06 → D-10** |
| Q-03 | Quantas e quais seleções entram, **qual o formato do chaveamento**, qual o nome do torneio (não pode ser "Copa do Mundo") e **de onde vêm as bandeiras** | a parte das bandeiras antes de E-3 (asset sem licença não entra no repositório); o resto antes de E-5. Texto alargado em 2026-08-07 para cobrir o que o [[b_plan\|PLANO]] já lhe atribuía — AC-14 |
| Q-04 | ~~Peer some no meio da disputa online: quem vence, empata ou anula?~~ | **RESPONDIDA 2026-08-08 → D-35** |
| Q-05 | O torneio roda também no modo `online`, ou só contra a CPU e no mesmo aparelho? | antes de E-5. Se rodar online, M8 passa a depender de M5 e o chaveamento vira estado compartilhado entre dois aparelhos — muda a camada 3 do PLANO. Fecha AC-07 |
| Q-07 | Nas alternadas, **quem cobra primeiro em cada rodada**? Segue sempre `A` (o que M2 implementou, leitura literal de [[regras_partida]]), ou alterna a ordem entre rodadas para diluir a vantagem de bater primeiro? | antes de E-4. M2 entregou o padrão `A`-primeiro e o marcou: mudar é trocar uma constante e a ordem em `resolve`, com os testes de rodada já no lugar. Vira `D-NN` — não replanejamento |
| Q-09 | No modo `local`, de quem é a escolha pendente? A porta congelada de M5 não expõe isso e `turn` só vira depois do `play()` | antes de T-10. T-09 não tocou na porta: M7 deriva comparando `kicks.length`, com teste. Resolver de vez é `pending(): Side \| null` na `Session` — contrato congelado, logo `D-NN` do dono. Ver [[m5_sessao_notas]] |
| Q-10 | TURN entra como camada gratuita (saída **a**) ou fica fora de escopo com o percentual sem online registrado (saída **b**)? | depois das DUAS medições de E-4 — o agente não inventa o número. Critério de decisão já escrito, com os três cortes, em [[m6_transporte_notas]] |
| Q-08 | `pick(role)` lê o histograma do **mesmo** papel — é essa a intenção? O portão de M3 exige que encher `shooter` de `'L'` não mexa em `pick('keeper')`, e T-07 implementou exatamente isso; mas quem defende quer prever o **chute** do humano, e o chute mora no histograma `shooter` | antes de E-3, porque M5 (T-09) é quem vai chamar `observe`/`pick` e fixa o significado na prática. Como está, a CPU que defende imita as defesas do humano em vez de ler os chutes dele — leitura literal do portão, e pode ser o desenho pretendido. Trocar é inverter o índice em `pick`, com os testes de isolamento já no lugar |
| Q-11 | Como M7 recebe o `roomId` do anfitrião? A porta de M5 (`D-13`) não o devolve e M7 não pode importar `src/net` | antes da tela de convite. Duas saídas em [[m5_sessao_notas]]; as duas mexem em porta congelada, logo `D-NN` do dono |

## Achados de QA (QA-NN — citados no commit: `fix: QA-NN …`)
> Passagens de revisão: 1. Critério e evidência: [[decisions_archive]].

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-01 | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — M9/M6 | Custo R$ 0 sem portão | Portão de custo em M9 + `IceConfig` em M6 | 2026-08-07 |
| QA-03 | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — M9 | Analytics de terceiro sem portão | Portão de privacidade em M9 | 2026-08-07 |
| QA-04 | 2026-08-07 | MÉDIO | `tsconfig.json` (de `D-14`) × `vite.config.ts` (de T-05) | `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de tipo na configuração de build não é pego pelo portão, só estoura no `vite build` | Acrescentar `"vite.config.ts"` ao `include`. **Não feito em T-05:** `tsconfig.json` é de outro dono e a regra 4 manda registrar, não consertar de carona | _(aberto)_ |
| QA-06 | 2026-08-07 | MÉDIO | `src/scripts/bundle-size.mjs` (M9) | Soma **toda** entrada `isEntry` no "bundle inicial": com `D-33`, o gatilho de `D-02` lê página que o jogador nunca abre | Medir só o grafo de `index.html`. Não feito aqui: é de M9 e muda um portão (regra 4) | _(aberto)_ |
| QA-05 | 2026-08-07 | MÉDIO | `src/tests/teams.test.ts` | Escreve por extenso os 6 termos da lista-morta: o portão de marca de M7 (`grep` zero em `src/`) devolve 6 | Montar as agulhas em tempo de execução, como `core.test.ts` e `ui.test.ts`. Outro dono (regra 4) | _(aberto)_ |
