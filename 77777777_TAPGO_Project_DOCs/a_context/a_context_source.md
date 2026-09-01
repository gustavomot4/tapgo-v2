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
- **Versão:** **v2.0.1** (`D-108`) — patch sobre a v2.0.0 de 2026-08-19: só correções e portões; já no ar (`A-42`)
- **Pronto:** M1..M9 e a medição, **E-1..E-6 fechadas**; suíte **679/679**; `D-103` **confirmado no ar** por `A-42` — goleiro em 18 esq / 5 meio / 2 dir, corte de `D-106` em 9; `Q-09` respondida por `D-107`, com o gatilho dela virado portão do CI por `T-39`
- **Bundle:** **415.252 B** (5,19% de 8 MB) lido do `dist/` **que foi ao ar**, só o grafo de `index.html` (`D-93`/`T-36`) — medida de 2026-09-01, já com `D-103`
- **Em andamento (máx 1):** _(vazio)_
- **Próximo:** aliviar registro (**93%**) e CONTEXT (**93%**) por `D-97`; nada do dono trava
- **Bloqueado/pendente:** nada do dono em aberto — `D-97`: registro **18.7k**/20k (**93%**) · BACKLOG **10.9k**/20k, aliviado pelo arquivamento de A-41/A-42/T-17/T-39 · QA **6.5k**/8k; subir teto segue REPROVADO (`D-99`/`D-101`)
- **Questões abertas:** Q-13 · **QA abertos:** QA-17 · respondidas e fechados: [[decisions_archive]]

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
