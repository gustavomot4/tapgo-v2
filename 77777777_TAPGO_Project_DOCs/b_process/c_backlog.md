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
- [ ] A-05 — responder Q-04: o que acontece quando o peer some no meio da disputa · **Portão:** linha Q-04 sai de "aberta"; sem isso T-11 e T-13 não começam
- [ ] A-06 — responder Q-05: o torneio roda também no modo online? · **Portão:** linha Q-05 sai de "aberta"; sem isso o desenho de M8 é suposição

## A fazer
- [ ] T-03 — conferir consistência CONTEXT/PLANO/BACKLOG/DECISIONS · **Portão:** zero achados críticos; todo módulo com ao menos uma tarefa; toda restrição inegociável com portão · **Skill:** artifact-consistency
  · passagem 1 (2026-08-07) **reprovou** — 19 achados no [[a_artifact_consistency_report_260807_1543|relatório]]; a passagem 2 lê o relatório junto com os artefatos corrigidos

> As tarefas abaixo saem do [[b_plan|PLANO]] e seguem a ordem das etapas E-1..E-6. O portão de cada uma é o portão do módulo, e não se repete aqui.

- [ ] T-04 — núcleo: tipos e gerador com semente · **Módulo:** M1 · **Etapa:** E-1 · **Skill:** backend-domain
- [ ] T-05 — esqueleto de build e publicação no Pages · **Módulo:** M9 · **Etapa:** E-1 (portão completo só em E-6) · **Skill:** iac-docker-terraform
- [ ] T-06 — motor da disputa, com os invariantes como teste · **Módulo:** M2 · **Etapa:** E-2 · **Skill:** backend-domain
- [ ] T-07 — CPU em 3 níveis, dois histogramas, teto de 70% medido por frequência · **Módulo:** M3 · **Etapa:** E-2 · **Skill:** backend-domain
- [ ] T-08 — catálogo de seleções (lista de fixação até A-04) · **Módulo:** M4 · **Etapa:** E-3 · **Skill:** backend-domain
- [ ] T-09 — sessão de disputa nos modos `cpu` e `local`, já reexportando os tipos · **Módulo:** M5 · **Etapa:** E-3 · **Skill:** backend-bff
- [ ] T-10 — telas jogáveis por toque em 360x640, com o portão de licença de `assets/` · **Módulo:** M7 · **Etapa:** E-3 · **Skill:** frontend-uiux
- [ ] T-11 — transporte P2P: canal, ID de sala, timeout e decisão de TURN · **Módulo:** M6 · **Etapa:** E-4, bloqueada por A-05 · **Skill:** microservice-sync
- [ ] T-13 — modo `online` da sessão, sobre o canal de T-11 · **Módulo:** M5 · **Etapa:** E-4, bloqueada por A-05 · **Skill:** backend-bff
- [ ] T-12 — torneio e chaveamento · **Módulo:** M8 · **Etapa:** E-5, bloqueada por A-04 e A-06 · **Skill:** backend-domain
- [ ] T-14 — telas do torneio: chaveamento, próxima disputa e campeão · **Módulo:** M7 · **Etapa:** E-5, bloqueada por A-04 e A-06 · **Skill:** frontend-uiux

## Em andamento (máx 1 — espelha "Em andamento" do [[a_context_source|CONTEXT]])
- [ ] T-02 — PLANO revisado pelos 19 achados de T-03; aguardando o portão do dono · **Portão:** outro agente implementa um módulo lendo só o contrato dele · **Skill:** planner

## Feito (mover para cá; detalhe no [[a_changelog|CHANGELOG]])
- [x] T-00 — Fase 0: CONTEXT, temas de domínio e candidatas a D-NN
- [x] T-01 — Fase 1a: D-01 e D-02 congelados com gatilho de revisão; Q-01→D-09 e Q-02→D-10

## Ideias (não comprometidas)
- Ranking global (exige servidor autoritativo — hoje colide com "custo R$ 0"; ver [[online_p2p]])
- Personalização de escudo pelo jogador (contorna licença e vira conteúdo próprio)
- Modo treino: mesma zona repetida, para medir leitura do goleiro
