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
- **Representações obrigatórias:** placar e contadores em inteiro (nunca float) · ID de sala opaco e aleatório (nunca sequencial) · datas UTC ISO-8601 · arquivos UTF-8 · país identificado por código ISO-3166 alfa-2, nunca por nome digitado.
- **Limites da stack e quem roda o quê:** ver [[stack]].

## Estado atual (formato fixo — 1 linha por item, SEM prosa corrida)
- **Versão:** v2.0.0-dev (a v1 é baseline morto: reescrita total, nenhum código reaproveitado)
- **Pronto:** M1 (T-04) · M9 esqueleto (T-05) · M2 (T-06) · M3 (T-07) · M4 (T-08) · M5 (T-09 + **`online` T-13 — fora do git, `QA-11`**) · M7 (T-10) · M6 (T-11) · medição (T-15) — **E-1, E-2 e E-3 fechadas**, suíte **271/271** verde; PLANO em D-13
- **Bundle:** **90.929 B** (1,14% de 8 MB) lido de `dist/`, **+609 B** em T-15 (derivação, rótulo e índice); Phaser e Trystero seguem fora, por `import()` (D-27). Soma a página de medição — `QA-06`
- **Em andamento (máx 1):** nada
- **Próximo:** **A-08** — campo em 08-08: 4/4, 4/4 e 5/5 **sem TURN**, não fecha ("vai ao ar" 0/0, n pequeno — D-42). Falta **operadora diferente nos dois**; Claro×Claro não fala de CGNAT
- **Bloqueado/pendente:** A-04 trava E-5 e a lista real de M4 (hoje fixação, `flag: null` — D-22) · A-06 trava M8 · Q-11 trava a tela do online · registro a **9.405/12.000** (D-43) — folga de 195, ver A-13
- **Questões abertas:** Q-03, Q-05, Q-07..**Q-11** · Q-04 respondida → D-35 · **QA abertos:** QA-04..QA-07, QA-10, QA-11 · fechados: QA-08, QA-09, QA-12 (T-15)

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
