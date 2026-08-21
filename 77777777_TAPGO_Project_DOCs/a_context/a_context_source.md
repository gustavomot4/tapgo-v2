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
- **Pronto:** M1..M9 e a medição, com **E-1..E-6 fechadas**; suíte **582/582**; `T-24`..`T-27` fechados **COM CAMPO** (`A-27`..`A-30`) — `A-30` foi o primeiro card de aparelho a pedir UM número e devolveu **4**, o do desktop em duas colunas. Módulo a módulo: [[estado_modulos]]
- **Bundle:** **419.311 B** (5,2% de 8 MB) lido de `dist/`; `T-27` somou **+785 B** no total — zero asset novo, é CSS e 5 classes; 278.646 B são os 32 SVGs de T-19, asset do chunk de M4 (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** `T-28` — a bandeira de quem cobra primeiro em sobreposição de tela cheia, que resolve `P-8` e `P-6`(a) juntos; **destravado por `D-87`**, nada mais o trava · nenhuma ação de aparelho pendente · portão de `D-83` correndo: **6 de 10** (`QA-30` 390, `D-84` 369, `D-85` 332, `D-86` 390, `QA-31` 397, `D-87` 381) · a promessa que `D-72` tirou volta ao Objetivo quando couber
- **Bloqueado/pendente:** **registro 18.201/20.000** com os TRÊS pools em zero (`D-43`, duplicata, critério de `D-74`) — `D-82` é rejeição adiada: ~4-5 decisões · QA **5.327/8.000** · CONTEXT 97%
- **Questões abertas:** Q-08, Q-09, Q-13 (**Q-15 fechada** por `D-84`) · **QA abertos:** QA-04..QA-07, QA-10, QA-17, QA-20, QA-21, QA-27, QA-29 (**QA-31 fechado**) · respondidas e fechados: [[decisions_archive]]

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar
- [[entrega_e6]] — o que a entrega de v2.0.0 incluiu, e o que ficou declarado de fora
- [[estado_modulos]] — qual tarefa fechou qual módulo, e quais cards já passaram no aparelho
