---
tags: [backlog]
status: atual
---
# BACKLOG.md — quadro de tarefas (fonte única)

> **Só existe UM backlog: este.** Estado numérico mora no [[a_context_source|CONTEXT]]; aqui, só tarefas.
> Todo card com portão: como se sabe que terminou.

## Ações do dono (máquina real)
- [x] A-01 — criar o repositório remoto no GitHub e apontar o local para ele · **Portão:** `origin` = gustavomot4/tapgo-v2; `main` rastreia `origin/main`; push 2a34a40 ✔
- [x] A-02 — `git init` + hook de pre-commit · **Portão:** commit 6ef539b rodou o `check.py` sozinho ✔
- [x] A-03 — ler o CONTEXT inteiro e concordar com cada linha · **Portão:** aprovado integralmente em 2026-08-06 ✔
- [ ] A-04 — responder Q-03: seleções, formato do chaveamento, nome do torneio e origem das bandeiras · **Portão:** linha Q-03 do DECISIONS sai de "aberta"
- [ ] A-05 — responder Q-04: o que acontece quando o peer some no meio da disputa · **Portão:** linha Q-04 sai de "aberta"; sem isso **T-13** não começa (T-11 não depende dela — M6 não sabe o que é gol)
- [ ] A-06 — responder Q-05: o torneio roda também no modo online? · **Portão:** linha Q-05 sai de "aberta"; sem isso o desenho de M8 é suposição
- [x] A-07 — publicar: `Q-06` respondida (repositório público, `D-21`), Source = "GitHub Actions" · **Portão:** `https://gustavomot4.github.io/tapgo-v2/` abre com o veredito verde "asset carregado — sem 404", `base` `/tapgo-v2/` e o asset `base-probe-BWPWGS0k.svg` — o mesmo hash do build local. Conferido no celular do dono em 2026-08-07 ✔ **E-1 fechada**

## A fazer

> O [[b_plan|PLANO]] está **congelado** (`D-13`). As tarefas abaixo saem dele e seguem a ordem das etapas E-1..E-6. O portão de cada uma é o portão do módulo, e não se repete aqui. Mudança de rumo é `D-NN` novo — não replanejamento.

- [ ] T-11 — transporte P2P: canal, ID de sala, timeout e decisão de TURN · **Módulo:** M6 · **Etapa:** E-4, depende só de E-3 fechada · **Skill:** microservice-sync
- [ ] T-13 — modo `online` da sessão, sobre o canal de T-11 · **Módulo:** M5 · **Etapa:** E-4, bloqueada por A-05 · **Skill:** backend-bff
- [ ] T-12 — torneio e chaveamento · **Módulo:** M8 · **Etapa:** E-5, bloqueada por A-04 e A-06 · **Skill:** backend-domain
- [ ] T-14 — telas do torneio: chaveamento, próxima disputa e campeão · **Módulo:** M7 · **Etapa:** E-5, bloqueada por A-04 e A-06 · **Skill:** frontend-uiux

## Em andamento (máx 1 — espelha "Em andamento" do [[a_context_source|CONTEXT]])
_(vazio)_

## Feito (mover para cá; detalhe no [[a_changelog|CHANGELOG]])
- [x] T-00 — Fase 0: CONTEXT, temas de domínio e candidatas a D-NN
- [x] T-01 — Fase 1a: D-01 e D-02 congelados com gatilho de revisão; Q-01→D-09 e Q-02→D-10
- [x] T-10 — M7: telas jogáveis por toque em 360x640 · **Portão:** camada e licença verdes por teste, suíte 178/178, bundle inicial 80.604 B. **Falta a passada no celular real do dono** (toque e fps) para fechar E-3
- [x] T-02 — Fase 1b: PLANO com M1..M9 e etapas E-1..E-6 · **Portão:** aprovado pelo dono em 2026-08-07; congelado em `D-13`
- [x] T-03 — Fase 1c: consistência entre os quatro artefatos · **Portão:** as 4 linhas passam na passagem 2
  · passagem 1 (15:43) **reprovou** — 19 achados: [[a_artifact_consistency_report_260807_1543|relatório 1]]
  · passagem 2 (16:05) **aprovou** — 19/19 fechados e 7 achados novos `AC-20`..`AC-26`, nenhum CRÍTICO, todos fechados no commit do congelamento: [[b_artifact_consistency_report_260807_1605|relatório 2]]
- [x] T-04 — núcleo: tipos e gerador com semente · **Módulo:** M1 · **Etapa:** E-1 · **Portão:** 16/16 testes, determinismo de 1.000 valores, `int(3)` com o 0 incluso, 1 ocorrência do gerador nativo em `src/` · `D-14`, `D-15`
- [x] T-06 — motor da disputa, com os invariantes como teste · **Módulo:** M2 · **Etapa:** E-2 · **Portão:** 53/53 testes 2x com o mesmo placar, um teste por invariante de [[regras_partida]], regressão dos defeitos 1/2/4/5, `Number.isInteger` em 1.000 cobranças sorteadas · `D-19`, `Q-07`
  · **entregue antes de E-1 fechar** (M2 depende só de M1); a etapa E-2 só é declarada aberta quando A-07 fechar E-1
- [x] T-07 — CPU em 3 níveis, dois histogramas, teto de 70% medido por frequência · **Módulo:** M3 · **Etapa:** E-2 · **Portão:** 35 testes (88/88 na suíte) 2x idênticos, teto conferido por igualdade em 3.000 formatos de histograma e por frequência nos dois papéis, uniforme com histórico vazio, isolamento entre papéis, `grep localStorage src/cpu/` = 0 · `D-20`, `Q-08`
  · **entregue antes de E-1 fechar** (M3 depende só de M1), mesma situação de T-06; com ele o código de E-2 está completo
- [x] T-08 — catálogo de seleções, lista de fixação até A-04 · **Módulo:** M4 · **Etapa:** E-3 · **Portão:** 22 testes (110/110 na suíte), todo `code` casando `^[A-Z]{2}$` e fora das faixas de uso do usuário do ISO 3166-1, `name` conferido contra o ICU e **ausente como literal na fonte**, zero URL e zero termo da lista-morta em `src/data/teams.ts`, catálogo congelado (escrita lança) · `D-22`, `D-23`
  · **a lista é de fixação, não é resposta a `Q-03`:** 4 códigos arbitrários por construção, `flag: null` em todos. `CATALOG_IS_FIXTURE` é exportada e um teste falha de propósito quando ela virar `false`, obrigando a revisitar o portão de licença em `A-04`
  · **limite declarado (`D-23`):** o ICU aceita código retirado (`SU`) e excepcionalmente reservado (`UK`, `EU`) — a lista oficial da ISO é dado curado e entra com o catálogo real. Ver [[m4_catalogo_notas]]
- [x] T-09 — sessão de disputa nos modos `cpu` e `local`, já reexportando os três tipos · **Módulo:** M5 · **Etapa:** E-3 · **Portão:** 30 testes (140/140 na suíte), `cpu` e `local` produzindo `MatchState` idêntico para a mesma sequência de zonas em 3 níveis × 2 lados × 4 sementes, com piso de 6 cobranças e `finished` para a igualdade não passar vazia, zona inválida morrendo em M5 com a mensagem de M5 (nunca a de M2), `dispose()` sem assinante vivo e com `subscribers.clear()` conferido na fonte, `MatchState`/`LinkStatus`/`Level` reexportados e usados pelo próprio teste sem tocar em `engine`/`cpu`/`net` · `D-24`, `D-25`, `D-26`, `Q-09`
  · **o modo `online` NÃO entra aqui:** é `T-13`, e `createSession` o recusa em voz alta em vez de degradar para `local` (`D-25`)
  · **`Q-08` sai intacta:** T-09 chama `observe`/`pick` com a semântica que T-07 entregou; `D-26` só fixa a ordem entre eles, e o teste que a cobre declara que hoje não a distingue
- [x] T-05 — esqueleto de build e publicação no Pages · **Módulo:** M9 · **Etapa:** E-1 (portão completo só em E-6) · **Portão:** `tsc --noEmit`, suíte verde, bundle inicial 4.599 B de 8 MB lido de `dist/`, 1 `Math.random` em `src/` e 0 imports de motor; página no ar por A-07 · `D-16`, `D-17`, `D-18`, `QA-04`

## Ideias (não comprometidas)
- Ranking global (exige servidor autoritativo — hoje colide com "custo R$ 0"; ver [[online_p2p]])
- Personalização de escudo pelo jogador (contorna licença e vira conteúdo próprio)
- Modo treino: mesma zona repetida, para medir leitura do goleiro
