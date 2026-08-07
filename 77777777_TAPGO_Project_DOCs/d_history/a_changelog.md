---
tags: [changelog, template]
status: atual
---
# CHANGELOG.md — histórico datado do PROJETO

> O log datado mora AQUI, fora do contexto. **Nenhuma sessão de IA carrega este arquivo** — pode crescer à vontade. O mais recente em cima; resumo curto; o porquê mora em [[c_decisions|DECISIONS]].
> Este arquivo nasceu zerado por `scripts/new_project.py`. O histórico do kit ficou no kit.

## [Não lançado]
- T-06 entregue **fora da ordem das etapas**: E-2 abre com E-1 fechada, e E-1 espera A-07 (ação do dono, não código). M2 depende só de M1, então o trabalho não estava travado — mas E-2 só é declarada aberta depois de E-1.

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
