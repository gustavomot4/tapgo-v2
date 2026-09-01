---
tags: [contexto, fonte-unica]
status: atual
---
# CONTEXT.md — TAP GO v2

## Objetivo (3 linhas)
Jogo web de disputa de pênaltis, mobile-first, jogável em qualquer navegador sem instalar nada.
Partida de ~1 minuto: contra a CPU, contra alguém no mesmo aparelho, ou **por link de convite** — o online está no ar (`D-73`/`T-21`/`A-33`).
**Não-objetivo:** não é simulador de futebol — sem partida completa, elenco ou transferências.

## Restrições inegociáveis (violou = inválido)
- **Custo R$ 0 permanente:** nenhum servidor próprio, host pago ou serviço que peça cartão. Build estático.
- **Nenhuma marca de terceiro:** sem escudo de clube ou federação, sem nome/rosto de jogador real, sem "FIFA" nem "Copa do Mundo". Identidade de seleção = nome de país + bandeira, só. Ver [[licenciamento]].
- Nenhum segredo versionado. Nenhum dado pessoal coletado (sem conta, sem e-mail, sem analytics de terceiro).
- Não inventar dado — lacuna declarada fica declarada.

## Arquitetura (D-01)
- **Forma:** monólito modular — SPA estática, sem backend. Motor de regras puro, isolado do render: é o que faz CPU, 2P local e online compartilharem a mesma regra sem duplicá-la.
- **Frontend:** SPA única · **Borda:** nenhuma · **Auth:** nenhuma (sem conta)
- **Online:** P2P WebRTC, sinalização sobre infraestrutura pública de terceiros. Ver [[online_p2p]].

## Stack + representações obrigatórias (D-02)
- **Stack:** TypeScript + Vite + Phaser 3 · Trystero (P2P) · GitHub Pages (host) · itch.io (vitrine)
- **Representações obrigatórias:** placar e contadores em inteiro (nunca float) · ID de sala opaco e aleatório (nunca sequencial) · datas UTC ISO-8601 · arquivos UTF-8 · país por código ISO-3166: alfa-2, ou alfa-2+subdivisão onde ela não existe (`D-52`); nunca nome digitado.
- **Limites da stack e quem roda o quê:** ver [[stack]].

## Estado atual (formato fixo — 1 linha por item, SEM prosa corrida)
- **Versão:** v2.0.0 — entregue em 2026-08-19
- **Pronto:** M1..M9 e a medição, **E-1..E-6 fechadas**; suíte **679/679**; `HEAD` está **à frente do ar** por 2 commits só de comentário (`D-103` foi ao ar em `9c925ff`)
- **Bundle:** **414.974 B** (5,2% de 8 MB) lido de `dist/`, só o grafo de `index.html` (`D-93`/`T-36`) — **medida de 2026-08-29, anterior a `D-103`**; o novo sai de `A-42`
- **Em andamento (máx 1):** _(vazio)_
- **Próximo:** `A-42` — confirma `D-103` no ar pelos mergulhos do goleiro (`D-106`); depois `Q-09` e `Q-17`
- **Bloqueado/pendente:** `A-42` (do dono) — `D-97`: registro **18.3k**/20k · BACKLOG **16.1k**/20k · QA **6.5k**/8k; subir teto segue REPROVADO (`D-99`/`D-101`)
- **Questões abertas:** Q-09, Q-13, Q-17 · **QA abertos:** QA-07 (parcial), QA-17 · respondidas e fechados: [[decisions_archive]]

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[cores_nacionais]] — ao mexer na cor da camisa em campo (`D-88`: a tabela das 32 e o padrão)
- [[direcao_visual]] — ao mexer em superfície, sombra, degradê, capa ou movimento de tela (`D-65`)
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar
- [[entrega_e6]] — o que a entrega de v2.0.0 incluiu, e o que ficou declarado de fora
- [[estado_modulos]] — qual tarefa fechou qual módulo, e quais cards já passaram no aparelho
- [[d_qa]] — ao registrar, fechar ou consultar um `QA-NN`
