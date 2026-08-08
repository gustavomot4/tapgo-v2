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

## Critério de aceite (o portão)
- `npx tsc --noEmit && npm run build` verdes na máquina do dono.
- Bundle inicial **< 8 MB** — número lido da saída do build, não estimado.
- Teste de sistema: disputa completa (5 cobranças + alternadas) termina com o placar correto e roda 2x com o mesmo resultado.
- Varredura de `assets/`: nenhum arquivo sem origem declarada em [[licenciamento]].
- Fluxo crítico jogável por toque em viewport 360x640.
- Online: taxa de conexão medida em rede móvel real, com fallback declarado quando falha.

## Estado atual (formato fixo — 1 linha por item, SEM prosa corrida)
- **Versão:** v2.0.0-dev (a v1 é baseline morto: reescrita total, nenhum código reaproveitado)
- **Pronto:** M1 (T-04) · M9 esqueleto (T-05) · M2 (T-06) · M3 (T-07) · M4 (T-08) · M5 (T-09 + **`online` T-13**) · M7 (T-10) · M6 (T-11) — **E-1, E-2 e E-3 fechadas**, suíte **220/220** verde em 5 rodadas; PLANO em D-13
- **Bundle:** **90.320 B** (1,13% de 8 MB) lido de `dist/`, **+1.432 B** em T-13 (M6 entrou no inicial via M5); Phaser e Trystero seguem fora, por `import()` (D-27). Soma a página de medição — `QA-06`
- **Em andamento (máx 1):** nada
- **Próximo:** **E-4 só fecha com as DUAS medições do dono** (A-08) — dois aparelhos, rede de operadora, em `/tapgo-v2/medicao.html`: sem TURN e na que vai ao ar. Responde `Q-10`; a tela do online espera `Q-11`
- **Bloqueado/pendente:** A-04 trava E-5 e a lista real de M4 (hoje fixação, `flag: null` — D-22) · A-06 trava M8 · A-08 trava E-4 · Q-11 trava a tela do online · **registro a 9.347/12.000 (A-09), 253 do aviso — A-10**
- **Questões abertas:** Q-03, Q-05, Q-07..**Q-11** · Q-04 respondida → D-35 · **QA:** QA-01..QA-03 fechados · QA-04..QA-06 abertos

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
