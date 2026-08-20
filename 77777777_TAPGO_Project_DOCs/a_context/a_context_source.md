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
- **Pronto:** M1 (T-04) · M9 esqueleto (T-05) · M2 (T-06) · M3 (T-07) · **M4 fechado (T-08 + T-18 + T-19)** · M5 (T-09 + `online` T-13) · M7 (T-10 + T-17b + QA-19 + T-20 + **T-14: as 3 telas do torneio**) · M6 (T-11) · **M8 (T-12)** · medição (T-15, T-16) · A-08 · **A-14** · **A-17** · **A-18** · **T-17 em `cpu`/`local`** — **E-1..E-6 fechadas** (prova de cada critério em [[entrega_e6]]), suíte **531/531**; PLANO em D-13 (M4 e M8 alterados por D-51..D-62)
- **Bundle:** **408.094 B** (5,1% de 8 MB) lido de `dist/` na máquina do dono; T-14 ligou M8 (+18.750 B, zero asset novo) — 278.646 B são os 32 SVGs de T-19, asset do chunk de M4 (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** `A-19` — subir a versão para v2.0.0 e republicar; depois, `Q-11` (tela de convite), que precisa de `D-NN` seu
- **Bloqueado/pendente:** registro **14.762/16.000** · o **CONTEXT** é o próximo teto, e não tem `A-NN` · QA **7.623/8.000** · `Q-11` trava só a tela de convite, não a entrega
- **Questões abertas:** Q-08, Q-09, Q-11, Q-13 (metade da tela caiu em `D-67`; porta do dono) · respondidas: Q-03, Q-04, Q-05, Q-07, Q-10, Q-12, Q-14 · **QA abertos:** QA-04..QA-07, QA-10, QA-17, QA-20, QA-21 · fechados: QA-08, QA-09, QA-11..QA-16, QA-18, QA-19

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar
- [[entrega_e6]] — o que a entrega de v2.0.0 incluiu, e o que ficou declarado de fora

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
