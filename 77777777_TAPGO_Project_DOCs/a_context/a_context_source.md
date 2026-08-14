---
tags: [contexto, fonte-unica]
status: atual
---
# CONTEXT.md — TAP GO v2

## Objetivo (3 linhas)
Jogo web de disputa de pênaltis, mobile-first, jogável em qualquer navegador sem instalar nada.
Partida de ~1 minuto: contra a CPU, contra alguém no mesmo aparelho, ou por link de convite.
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
- **Versão:** v2.0.0-dev (a v1 é baseline morto: reescrita total, nenhum código reaproveitado)
- **Pronto:** M1 (T-04) · M9 esqueleto (T-05) · M2 (T-06) · M3 (T-07) · **M4 fechado (T-08 + 32 seleções T-18 + 32 bandeiras T-19)** · M5 (T-09 + `online` T-13) · M7 (T-10 + sorteio na tela T-17b) · M6 (T-11) · medição (T-15, T-16) · A-08 · **T-17 em `cpu`/`local`** — **E-1..E-4 fechadas**, suíte **385/385**; PLANO em D-13 (M4 e M8 alterados por D-51..D-62)
- **Bundle:** **382.402 B** (4,8% de 8 MB) lido de `dist/`, **+281.146 B** em T-19 — 278.646 B são os 32 SVGs, asset do chunk de M4 (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** **E-5** — T-12 (M8), depois T-14. Fora de E-5: A-14, a passada de T-17b no celular real (sandbox não tem navegador; tela de M7 não é coberta por teste)
- **Bloqueado/pendente:** registro **10.600/12.000** (aviso agora em 10.800 — `D-63`) e QA **6.372/8.000**, folga somada **3.028**; esta sessão devolveu 398 · Q-11 trava o online · a bandeira existe mas **não aparece na tela** até M7 (`QA-19`)
- **Questões abertas:** Q-08, Q-09, Q-11 · respondidas: Q-03, Q-04, Q-05, Q-07, Q-10, Q-12 (o D-NN de cada uma está na linha dela) · **QA abertos:** QA-04..QA-07, QA-10, QA-16..QA-19 · fechados: QA-08, QA-09, QA-11..QA-15

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
