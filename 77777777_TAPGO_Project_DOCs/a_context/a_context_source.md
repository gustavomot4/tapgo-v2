---
tags: [contexto, fonte-unica]
status: atual
---
# CONTEXT.md — TAP GO v2

## Objetivo (3 linhas)
Jogo web de disputa de pênaltis, mobile-first, jogável em qualquer navegador sem instalar nada.
Partida de ~1 minuto: contra a CPU ou contra alguém no mesmo aparelho. O online está medido e **não publicado** (`D-72`).
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
- **Versão:** v2.0.0 — entregue em 2026-08-19 (a v1 é baseline morto: reescrita total, nenhum código reaproveitado)
- **Pronto:** M1..M9 e a medição, com **E-1..E-6 fechadas**; suíte **553/553**. Módulo a módulo, e a tarefa que fechou cada um: [[estado_modulos]]
- **Bundle:** **415.505 B** (5,2% de 8 MB) lido de `dist/` no sandbox — o do dono confirma em `A-22`; T-21 somou **+7.411 B**, zero asset novo; 278.646 B são os 32 SVGs de T-19, asset do chunk de M4 (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** `A-22` — a 1ª rodada em campo **conectou e jogou**, e trouxe dois achados já corrigidos (`D-77`, `QA-23`); falta reconferir com o link novo, e aí o Objetivo recupera a promessa que `D-72` tirou · `A-21`: a inclinação do registro
- **Bloqueado/pendente:** registro **15.972/16.000 (99%)** — sobram **28 caracteres**: a próxima decisão do projeto NÃO cabe, e `A-21` deixou de ser dívida para virar bloqueio
- **Questões abertas:** Q-08, Q-09, Q-13, **Q-14** (respondida: 15 s e quem demorou perde — falta o `D-NN` e a sessão de M2) · **QA abertos:** QA-04..QA-07, QA-10, QA-17, QA-20, QA-21 (`QA-22` fechada por `D-75`) · respondidas e fechados: [[decisions_archive]]

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar
- [[entrega_e6]] — o que a entrega de v2.0.0 incluiu, e o que ficou declarado de fora
- [[estado_modulos]] — qual tarefa fechou qual módulo, e quais cards já passaram no aparelho
