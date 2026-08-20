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
- **Pronto:** M1..M9 e a medição, com **E-1..E-6 fechadas**; suíte **569/569**. Módulo a módulo, e a tarefa que fechou cada um: [[estado_modulos]]
- **Bundle:** **415.817 B** (5,2% de 8 MB) lido de `dist/` no sandbox — não reconferido na máquina do dono; `D-81` somou **+104 B**, zero asset novo; 278.646 B são os 32 SVGs de T-19, asset do chunk de M4 (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** **`A-25`** — `T-23` entregou `D-81` (569/569, +104 B) e a **metade degenerada passou**: quem RECEBE cai na hora, quem TOCOU sai em ~10 s. Falta o **par são** (5 cobranças) — [[qa26_lado_do_convite]] · `T-22` — contador de segundos · `A-21` — as 2 frases por linha, `D-NN` do dono · a promessa que `D-72` tirou volta ao Objetivo com `A-25` verde, e com a frase honesta junto: o link é de uso único e do convidado
- **Bloqueado/pendente:** **os três orçamentos na parede** — registro **15.982/16.000** (sobram **18**), QA **7.984/8.000** (16), CONTEXT 97%: o corte de `D-43` está **esgotado** (nenhuma candidata) e `A-21` vira bloqueio: a próxima decisão não cabe
- **Questões abertas:** Q-08, Q-09, Q-13, **Q-14** (respondida: 15 s e quem demorou perde — falta o `D-NN` e a sessão de M2) · **QA abertos:** QA-04..QA-07, QA-10, QA-17, QA-20, QA-21, QA-24, **QA-26**, **QA-27**, **QA-28** · respondidas e fechados: [[decisions_archive]]

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar
- [[entrega_e6]] — o que a entrega de v2.0.0 incluiu, e o que ficou declarado de fora
- [[estado_modulos]] — qual tarefa fechou qual módulo, e quais cards já passaram no aparelho
