---
tags: [contexto, tema, estado]
status: atual
---
# Estado por módulo — o que existe hoje, e a tarefa que fechou cada um

> **Saiu do [[a_context_source|CONTEXT]] em 2026-08-19 por `D-74` (`A-20`).** A linha "Pronto"
> custava **460** dos 4.000 caracteres do contexto-fonte — 11,5% do orçamento cobrado em TODA
> sessão — para guardar o histórico de qual tarefa fechou qual módulo, que nenhuma sessão precisa
> ler para decidir o que fazer hoje. O que ficou lá é o estado (módulos completos, etapas
> fechadas, suíte); o que veio para cá é a rastreabilidade.
>
> **Estado numérico continua morando só no CONTEXT** (versão, bundle, contagem da suíte), como o
> [[CLAUDE]] exige. Esta página cita tarefa e módulo, nunca métrica.

| Módulo | O que entrega | Fechado por |
|---|---|---|
| M1 | Núcleo: tipos, `Rng` determinístico | `T-04` |
| M2 | Motor de regras da disputa | `T-06` |
| M3 | CPU em 3 níveis (`D-10`) | `T-07` |
| M4 | Catálogo das 32 seleções e as bandeiras | `T-08` + `T-18` + `T-19` — alterado por `D-51`..`D-62` |
| M5 | Sessão: `cpu`, `local` e `online` | `T-09` + `T-13` (o `online`) + `T-21` (a linha de `newRoomId`, `D-73`) + `T-23` (par espelhado vira falha honesta, `D-81`) + `T-31` (`teams` com `null`, 3º arg de `subscribe` e o prazo do anúncio, `D-90`) |
| M6 | Transporte P2P | `T-11` + `T-31` (`Pick` no fio pelos mesmos 4 métodos, `D-90`) |
| M7 | Telas (DOM) e a cobrança em Phaser | `T-10` + `T-17b` + `T-20` + `T-14` (as 3 telas do torneio) + `T-21` (o convite e o `online` na cobrança) + `T-24` (o prazo de 15 s no `online`) + `T-25` (a coluna "Pts" na tabela) + `T-32` (a série de revanches em `cpu` e `local`) + `T-31` (uma grade no `online`, "escolhendo…" e `t=` com um código, `D-90`) |
| M8 | Torneio: grupos, mata-mata, retrato | `T-12` — alterado por `D-57` |
| M9 | Build, portões e publicação | `T-05` (esqueleto) + `T-34` (`vite.config.ts` dentro do `tsc`, `QA-04`) + `T-36` (o medidor caminha só o grafo de `index.html`, `QA-06`/`D-93`) |
| medição | O experimento de campo de E-4 | `T-15` + `T-16` |

**Etapas:** `E-1`..`E-6` fechadas — a prova de cada critério está em [[entrega_e6]].

**Cards de conferência no aparelho já fechados:** `A-08` (os 17/17 de E-4) · `A-14` (o painel do
sorteio) · `A-17` (o torneio) · `A-18` (a página no ar) · `A-19` (os três comandos verdes).

**`T-17`** (o sorteio de quem cobra primeiro, `D-48`) está em `cpu` e `local`. No `online` ele
segue em `'A'`: semeá-lo pelo `roomId` — hoje possível, porque `D-73` o entrega aos dois aparelhos —
é mudança de regra de M5, e não a linha de export que `T-21` comprou.

> O PLANO congelado é `D-13`, e mora no [[b_plan|PLANO]]. Mudança de rumo é `D-NN` novo, nunca
> edição do plano — é a regra do próprio `D-13`.
