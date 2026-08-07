---
tags: [decisoes]
status: atual
---
# DECISIONS.md — decisões (D-NN), questões abertas (Q-NN) e QA (QA-NN)

> **Append-only:** decisão nova = linha nova; reversão = linha nova com `SUPERSEDE D-XX`, nunca editar a antiga.
> **Teto: 2 frases por linha.** Evidência longa vira nota em `e_qa/<slug>.md` ou tema em `a_context/`.
> **Registre as rejeições.** A lista de rejeitados é o que impede a IA de re-propor o que já morreu.

## Decisões
| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| D-01 | 2026-08-06 | ADOTADO · ARQUIVADO | Forma = SPA estática, sem backend | íntegra em [[decisions_archive]] |
| D-02 | 2026-08-06 | ADOTADO · ARQUIVADO | Stack = TypeScript + Vite + Phaser 3 | íntegra em [[decisions_archive]] |
| D-03 | 2026-08-06 | ADOTADO · ARQUIVADO | Identidade de time = país ISO-3166 + bandeira, zero escudo | íntegra em [[decisions_archive]] |
| D-04 | 2026-08-06 | ADOTADO · ARQUIVADO | Online = P2P WebRTC (Trystero) | íntegra em [[decisions_archive]] |
| D-05 | 2026-08-06 | ADOTADO · ARQUIVADO | Publicação = GitHub Pages + itch.io | íntegra em [[decisions_archive]] |
| D-06 | 2026-08-06 | REJEITADO | Reaproveitar o backend Node/Express/MySQL da v1 | Exigiria host pago e trazia SQL por interpolação e senha em texto puro; conta não é requisito |
| D-07 | 2026-08-06 | REJEITADO | Usar clubes reais, ou seleções com escudo de federação | Colide com Lei Pelé art. 87; trocar clube por seleção troca o titular, não remove o risco |
| D-08 | 2026-08-06 | REJEITADO | Godot 4 como engine | Payload WASM maior que o teto de 8 MB da Poki sem otimização, e custo de aprender GDScript sem ganho para jogo 2D de UI |
| D-09 | 2026-08-06 | ADOTADO | Alternadas = morte súbita em rodadas de 1 cobrança por lado, decidida ao FIM da rodada, sem teto de rodadas | Padrão IFAB; preserva o invariante de cobranças iguais sem critério artificial — ver [[regras_partida]]. Responde Q-01 |
| D-10 | 2026-08-06 | ADOTADO | CPU em 3 níveis por peso do histórico de zonas da sessão: 0% / 50% / 70%, teto absoluto 70% | Os 30% uniformes garantem que o jogador sempre pode enganar a CPU; histórico em memória, nada persistido — ver [[regras_partida]]. Responde Q-02 |
| D-11 | 2026-08-07 | ADOTADO | Runner de teste = Vitest | Todo portão de módulo do [[b_plan\|PLANO]] depende de suíte, e a suíte não tinha dono; é o runner do próprio Vite (`D-02`), sem configuração extra e sem peso no bundle. Fecha AC-06 |
| D-12 | 2026-08-07 | ADOTADO | `index.html` mora em `src/`, com `root: 'src'` e `outDir: '../dist'` no Vite | Mantém a raiz limpa que o padrão do repositório exige sem contrariar a convenção do Vite; é configuração de M9, não exceção ao padrão. Fecha AC-06 |
| D-13 | 2026-08-07 | ADOTADO | **PLANO congelado**: M1..M9 com porta de entrada única, dono de estado declarado e portão objetivo; etapas E-1..E-6 | T-02 aprovado pelo dono e T-03 aprovado na passagem 2 (5/5 restrições com portão, 6/6 critérios com número ou comando) — ver [[b_artifact_consistency_report_260807_1605\|relatório 2]]. Daqui em diante, mudança de rumo é D-NN novo |
| D-14 | 2026-08-07 | ADOTADO | `package.json` e `tsconfig.json` nascem em T-04; `vite.config.ts` e o workflow do Pages continuam de M9 (T-05) | O PLANO põe T-04 antes de T-05, e sem runner instalado o portão de M1 não roda — `D-11` já dera dono à suíte, faltava o arquivo. M9 mantém intacto o que o contrato lhe atribui: `base`, `root`, `outDir` e o número do bundle |
| D-15 | 2026-08-07 | ADOTADO | `createRng` recusa semente que não seja inteiro seguro; semente efetiva é módulo 2^32 | O contrato dizia só `seed: number`, e semente `1.5` ou `NaN` quebraria o determinismo sem erro visível — falha alta é mais barata que sequência silenciosamente errada. Limite declarado: `0` e `2**32` são a mesma semente, e `newSeed()` devolve dentro de `[0, 2^32)` |
| D-16 | 2026-08-07 | ADOTADO | Piso de `vitest` = `^3.2.7`, que resolve `vite@7`; **T-05 declara `vite@^7`** para não abrir uma segunda árvore | `vitest@2.1.8` trazia 5 advisories (1 CRÍTICO, 1 alto) por `vite`/`esbuild` transitivos; com `^3.2.7`, `npm audit` dá 0 e a suíte passa sem tocar em uma linha de teste. Não altera `D-11` — o runner continua Vitest, muda o piso |
| D-17 | 2026-08-07 | ADOTADO | Publicação por GitHub Actions (`.github/workflows/pages.yml`) com `base: '/tapgo-v2/'`; o portão inteiro roda ANTES do deploy e o job que publica não recompila | `base` errado é 404 de todo asset só em produção, a falha que o contrato de M9 manda evitar. O que vai ao ar é o artefato que passou no portão, não um build novo feito em outra máquina |
| D-18 | 2026-08-07 | ADOTADO | O número do bundle sai de `src/scripts/bundle-size.mjs`, que soma bytes do manifesto do Vite e sai com erro em 8.000.000 B; a sonda de asset é forçada a virar arquivo por `assetsInlineLimit` | O Vite embute asset < 4 kB como `data:` no HTML, e **asset embutido nunca dá 404** — o portão de E-1 passaria sozinho. Medido em T-05: inicial 4.599 B, 0,06% do teto |
| D-19 | 2026-08-07 | ADOTADO | `play` reconfere o estado recebido contra o próprio histórico de cobranças e **lança** quando não fecha, em vez de calcular sobre estado torto | `goals`/`taken` deixam de ser um resumo em que se confia e passam a ser total reconferível: é o lugar mais forte disponível sem banco, e cobre o defeito 5 da v1 na raiz. Torna M2 o ponto de validação do estado que chega pela rede em M6 — M5/M6 tratam a exceção, não a duplicam |
| D-20 | 2026-08-07 | ADOTADO | O teto de 70% da CPU é **corte aplicado depois** da mistura de `D-10`, e não o peso dela; distribuição em ppm inteiro, com o excesso repartido proporcionalmente entre as outras zonas | A mistura crua dá `0,70 + 0,30/3 = 80%` no difícil — a armadilha que o contrato de M3 nomeia —, e como corte próprio o teto continua valendo se uma progressão ou torneio mexer nos pesos. Em inteiro ele é conferido por **igualdade** (`zoneDistributionPpm` exportada de propósito), não dentro da tolerância de uma medição por frequência |
| D-21 | 2026-08-07 | ADOTADO | O repositório `gustavomot4/tapgo-v2` é **público** — é o que deixa o Pages publicar no plano Free | Repositório privado e "custo R$ 0" não coexistem (`D-05`). Página no ar com o veredito verde e `base` `/tapgo-v2/` conferidos no celular do dono: fecha E-1. Responde Q-06 |
| D-22 | 2026-08-07 | ADOTADO | `Team.flag` passa a `string \| null`; `null` = bandeira ainda sem arquivo, até `A-04` | Antes de `Q-03` não existe string honesta: caminho inventado fura o portão de procedência e `""` violaria "ausente ≠ zero". Muda contrato de saída de M4, logo é `D-NN` — ver [[m4_catalogo_notas]] |
| D-23 | 2026-08-07 | ADOTADO | `name` derivado por `Intl.DisplayNames` em locale FIXO `pt-BR`; código que não resolve lança | Cumpre "name vem do código" com zero país digitado e zero peso no bundle. Limite declarado: o ICU aceita código retirado (`SU`) e reservado (`UK`, `EU`) — ver [[m4_catalogo_notas]] |

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
| Q-04 | Peer some no meio da disputa online: quem vence, empata ou a disputa é anulada? | antes da etapa E-4 do [[b_plan\|PLANO]] (define o contrato de M5 e M6) |
| Q-05 | O torneio roda também no modo `online`, ou só contra a CPU e no mesmo aparelho? | antes de E-5. Se rodar online, M8 passa a depender de M5 e o chaveamento vira estado compartilhado entre dois aparelhos — muda a camada 3 do PLANO. Fecha AC-07 |
| Q-06 | ~~O repositório `gustavomot4/tapgo-v2` fica **público**?~~ | **RESPONDIDA 2026-08-07 → D-21** |
| Q-07 | Nas alternadas, **quem cobra primeiro em cada rodada**? Segue sempre `A` (o que M2 implementou, leitura literal de [[regras_partida]]), ou alterna a ordem entre rodadas para diluir a vantagem de bater primeiro? | antes de E-4. M2 entregou o padrão `A`-primeiro e o marcou: mudar é trocar uma constante e a ordem em `resolve`, com os testes de rodada já no lugar. Vira `D-NN` — não replanejamento |
| Q-08 | `pick(role)` lê o histograma do **mesmo** papel — é essa a intenção? O portão de M3 exige que encher `shooter` de `'L'` não mexa em `pick('keeper')`, e T-07 implementou exatamente isso; mas quem defende quer prever o **chute** do humano, e o chute mora no histograma `shooter` | antes de E-3, porque M5 (T-09) é quem vai chamar `observe`/`pick` e fixa o significado na prática. Como está, a CPU que defende imita as defesas do humano em vez de ler os chutes dele — leitura literal do portão, e pode ser o desenho pretendido. Trocar é inverter o índice em `pick`, com os testes de isolamento já no lugar |

## Achados de QA (QA-NN — citados no commit: `fix: QA-NN …`)
> Preenchido pelas sessões de revisão (guardrails-review e artifact-consistency). Passagens executadas: 1.
> Os defeitos da v1 **não** são QA-NN deste projeto: a v1 é baseline morto, e eles estão em [[regras_partida]] como entrada de projeto.
> Evidência completa da passagem 1: [[a_artifact_consistency_report_260807_1543|relatório de consistência 2026-08-07]] (19 achados `AC-NN`; só os CRÍTICOS viram QA-NN).

> **A coluna `Fechado em` é o que separa "corrigido no papel" de "conferido".** Sem ela, a tabela
> descrevia a correção como fato e o CONTEXT listava o mesmo QA como aberto — as duas leituras
> defensáveis, que é o pior estado possível para um registro (AC-21).

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-01 | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — M9/M6 | Custo R$ 0 sem portão | Portão de custo em M9 + `IceConfig` em M6 | 2026-08-07 · íntegra em [[decisions_archive]] |
| QA-02 | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — M7 | Marca de terceiro sem portão fora da bandeira | Portão de licença em M7 sobre `assets/` inteiro | 2026-08-07 · íntegra em [[decisions_archive]] |
| QA-03 | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — M9 | Analytics de terceiro sem portão | Portão de privacidade em M9 | 2026-08-07 · íntegra em [[decisions_archive]] |
| QA-04 | 2026-08-07 | MÉDIO | `tsconfig.json` (de `D-14`) × `vite.config.ts` (de T-05) | `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de tipo na configuração de build não é pego pelo portão, só estoura no `vite build` | Acrescentar `"vite.config.ts"` ao `include`. **Não feito em T-05:** `tsconfig.json` é de outro dono e a regra 4 manda registrar, não consertar de carona | _(aberto)_ |
