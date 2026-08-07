---
tags: [changelog, template]
status: atual
---
# CHANGELOG.md — histórico datado do PROJETO

> O log datado mora AQUI, fora do contexto. **Nenhuma sessão de IA carrega este arquivo** — pode crescer à vontade. O mais recente em cima; resumo curto; o porquê mora em [[c_decisions|DECISIONS]].
> Este arquivo nasceu zerado por `scripts/new_project.py`. O histórico do kit ficou no kit.

## [Não lançado]
- Fase 1c pendente: conferir consistência entre CONTEXT, PLANO, BACKLOG e DECISIONS (T-03)

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
