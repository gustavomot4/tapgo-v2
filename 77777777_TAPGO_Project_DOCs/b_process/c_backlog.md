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
- [ ] A-04 — responder Q-03 (Q-01 e Q-02 respondidas em 2026-08-06 → D-09/D-10) · **Portão:** linhas do DECISIONS saem de "aberta"

## A fazer
- [ ] T-03 — conferir consistência CONTEXT/PLANO/BACKLOG/DECISIONS · **Portão:** zero achados críticos; todo módulo com ao menos uma tarefa · **Skill:** consistencia-artefatos

> As tarefas abaixo saem do [[b_plan|PLANO]] e seguem a ordem das etapas E-1..E-6. Uma por módulo; o portão de cada uma é o portão do módulo, e não se repete aqui.

- [ ] T-04 — núcleo: tipos e gerador com semente · **Módulo:** M1 · **Etapa:** E-1 · **Skill:** backend-dominio
- [ ] T-05 — esqueleto de build e publicação no Pages · **Módulo:** M9 · **Etapa:** E-1 (portão completo só em E-6) · **Skill:** iac-docker-terraform
- [ ] T-06 — motor da disputa, com os invariantes como teste · **Módulo:** M2 · **Etapa:** E-2 · **Skill:** backend-dominio
- [ ] T-07 — CPU em 3 níveis, teto de 70% medido por frequência · **Módulo:** M3 · **Etapa:** E-2 · **Skill:** backend-dominio
- [ ] T-08 — catálogo de seleções (lista de fixação até A-04) · **Módulo:** M4 · **Etapa:** E-3 · **Skill:** backend-dominio
- [ ] T-09 — sessão de partida nos modos `cpu` e `local` · **Módulo:** M5 · **Etapa:** E-3 · **Skill:** backend-bff
- [ ] T-10 — telas jogáveis por toque em 360x640 · **Módulo:** M7 · **Etapa:** E-3 · **Skill:** frontend-uiux
- [ ] T-11 — transporte P2P e modo `online` na sessão · **Módulo:** M6 · **Etapa:** E-4, bloqueada por Q-04 · **Skill:** microservice-sync
- [ ] T-12 — torneio e chaveamento · **Módulo:** M8 · **Etapa:** E-5, bloqueada por Q-03 · **Skill:** backend-dominio

## Em andamento (máx 1 — espelha "Em andamento" do [[a_context_source|CONTEXT]])
- [ ] T-02 — PLANO entregue (M1..M9, etapas E-1..E-6); aguardando o portão do dono · **Portão:** outro agente implementa um módulo lendo só o contrato dele · **Skill:** planejador

## Feito (mover para cá; detalhe no [[a_changelog|CHANGELOG]])
- [x] T-00 — Fase 0: CONTEXT, temas de domínio e candidatas a D-NN
- [x] T-01 — Fase 1a: D-01 e D-02 congelados com gatilho de revisão; Q-01→D-09 e Q-02→D-10

## Ideias (não comprometidas)
- Ranking global (exige servidor autoritativo — hoje colide com "custo R$ 0"; ver [[online_p2p]])
- Personalização de escudo pelo jogador (contorna licença e vira conteúdo próprio)
- Modo treino: mesma zona repetida, para medir leitura do goleiro
