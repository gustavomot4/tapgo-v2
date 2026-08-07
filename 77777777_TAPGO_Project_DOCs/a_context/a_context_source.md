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
- **Nenhuma marca de terceiro:** sem escudo de clube ou federação, sem nome/rosto de jogador real, sem "FIFA" nem "Copa do Mundo". Identidade de time = nome de país + bandeira, só. Ver [[licenciamento]].
- Nenhum segredo versionado. Nenhum dado pessoal coletado (sem conta, sem e-mail, sem analytics de terceiro).
- Não inventar dado — lacuna declarada fica declarada.

## Arquitetura (D-01)
- **Forma:** monólito modular — SPA estática, sem backend. Motor de regras puro, isolado do render: é o que faz CPU, 2P local e online compartilharem a mesma regra sem duplicá-la.
- **Frontend:** SPA única · **Borda:** nenhuma · **Auth:** nenhuma (sem conta)
- **Online:** P2P WebRTC, sinalização sobre infraestrutura pública de terceiros. Ver [[online_p2p]].

## Stack + restrições da stack (D-02)
- **Stack:** TypeScript + Vite + Phaser 3 · Trystero (P2P) · GitHub Pages (host) · itch.io (vitrine)
- **Restrições:** build 100% estático, sem SSR nem rota de servidor · `localStorage` é do aparelho e não sincroniza · WebRTC exige HTTPS · P2P falha para 15-30% dos jogadores sem relay TURN · cota grátis de TURN é finita · itch.io derruba conteúdo sob DMCA sem aviso prévio.
- **Representações obrigatórias:** placar e contadores em inteiro (nunca float) · ID de sala opaco e aleatório (nunca sequencial) · datas UTC ISO-8601 · arquivos UTF-8 · país identificado por código ISO-3166 alfa-2, nunca por nome digitado.
- **Quem roda o quê:** agente = código, testes e build indicativo no sandbox · dono = build oficial, `git push`, publicação no GitHub Pages e no itch.io, e o teste em celular real.

## Critério de aceite (o portão)
- `npx tsc --noEmit && npm run build` verdes na máquina do dono.
- Bundle inicial **< 8 MB** — número lido da saída do build, não estimado.
- Teste de sistema: disputa completa (5 cobranças + alternadas) termina com o placar correto e roda 2x com o mesmo resultado.
- Varredura de `assets/`: nenhum arquivo sem origem declarada em [[licenciamento]].
- Fluxo crítico jogável por toque em viewport 360x640.
- Online: taxa de conexão medida em rede móvel real, com fallback declarado quando falha.

## Estado atual (formato fixo — 1 linha por item, SEM prosa corrida)
- **Versão:** v2.0.0-dev (a v1 é baseline morto: reescrita total, nenhum código reaproveitado)
- **Pronto:** nenhum módulo; Fase 0 commitada (6ef539b); Fase 1a — D-01 e D-02 congelados com gatilho de revisão, e D-09/D-10 fecham Q-01 e Q-02
- **Em andamento (máx 1):** nenhum — T-01 fechado
- **Próximo:** T-02 — Fase 1b: PLANO com módulos, contratos e milestones
- **Bloqueado/pendente:** A-01 (repositório remoto no GitHub — `git remote` ainda vazio), A-04 parcial (falta só Q-03)
- **Questões abertas:** Q-03

## Temas de domínio em `a_context/` (o agente lê SOB DEMANDA)
- [[licenciamento]] — ao criar ou alterar asset, nome de time, escudo ou texto de marca
- [[online_p2p]] — ao tocar o módulo de partida online
- [[regras_partida]] — ao mexer no motor de regras da disputa ou na CPU

> Mapa de leitura completo e protocolo do agente: [[CLAUDE]]. Ficam lá, e não aqui, porque a
> ferramenta os carrega sozinha — dentro deste arquivo custariam 20% do orçamento em toda sessão.
