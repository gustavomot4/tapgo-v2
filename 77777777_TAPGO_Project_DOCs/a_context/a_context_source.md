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
- **Pronto:** M1 (T-04) · M9 esqueleto (T-05) · M2 (T-06) · M3 (T-07) · M4 (T-08) · M5 (T-09 + `online` T-13) · M7 (T-10) · M6 (T-11) · medição (T-15, T-16) — **E-1, E-2 e E-3 fechadas**, suíte **337/337** verde; PLANO em D-13
- **Bundle:** **99.442 B** (1,2% de 8 MB) lido de `dist/`, **+8.513 B** em T-16, todos no chunk da medição (`QA-06`); Phaser e Trystero fora, por `import()` (D-27)
- **Em andamento (máx 1):** nada
- **Próximo:** **Q-12 é do dono** — em campo o P2P fechou por **IPv6 fim-a-fim, sem NAT** (`QA-14`): conta para o corte de 70%? Depois, A-08 na 3ª ida. Taxa acumulada 13/13 sem TURN; "vai ao ar" segue 0/0
- **Bloqueado/pendente:** A-04 trava E-5 e a lista real de M4 (hoje fixação, `flag: null` — D-22) · A-06 trava M8 · Q-11 trava a tela do online · registro a **11.191/12.000** — **809 até a FALHA, `A-13` agora trava tudo**
- **Questões abertas:** Q-03, Q-05, Q-07..**Q-12** · Q-04 respondida → D-35 · **QA abertos:** QA-04..QA-07, QA-10 · QA-13 fecha na 3ª ida · **QA-11 sem objeto** · fechados: QA-08, QA-09, QA-12, QA-14

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[portao_de_aceite]] — **antes de fechar tarefa, declarar etapa fechada ou entregar**
- [[licenciamento]] — ao criar ou alterar asset, nome de seleção, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de disputa online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU
- [[stack]] — ao escolher biblioteca, mexer no build ou publicar

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
