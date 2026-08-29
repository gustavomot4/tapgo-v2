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
>
> **Segunda leva, em 2026-08-29 (mesmo `D-74`):** a linha "Pronto" tinha voltado a carregar a
> rastreabilidade — `T-17` nos três modos (`D-98`/`A-41`), `T-24`..`T-33`, `T-31` e `T-38` — e o
> CONTEXT estava em **92%** do teto. Nenhum ID se mudou: os quatro já estavam nesta página, era
> duplicação. Lá ficou o estado (`M1..M9`, `E-1..E-6`, suíte, o ar **é `HEAD`**); aqui, quem fechou o quê.

| Módulo | O que entrega | Fechado por |
|---|---|---|
| M1 | Núcleo: tipos, `Rng` determinístico | `T-04` |
| M2 | Motor de regras da disputa | `T-06` |
| M3 | CPU em 3 níveis (`D-10`) | `T-07` |
| M4 | Catálogo das 32 seleções e as bandeiras | `T-08` + `T-18` + `T-19` — alterado por `D-51`..`D-62` |
| M5 | Sessão: `cpu`, `local` e `online` | `T-09` + `T-13` (o `online`) + `T-21` (a linha de `newRoomId`, `D-73`) + `T-17` (o sorteio nos três modos, `D-98`) + `T-23` (par espelhado vira falha honesta, `D-81`) + `T-31` (`teams` com `null`, 3º arg de `subscribe` e o prazo do anúncio, `D-90`) |
| M6 | Transporte P2P | `T-11` + `T-31` (`Pick` no fio pelos mesmos 4 métodos, `D-90`) |
| M7 | Telas (DOM) e a cobrança em Phaser | `T-10` + `T-17b` + `T-20` + `T-14` (as 3 telas do torneio) + `T-21` (o convite e o `online` na cobrança) + `T-24` (o prazo de 15 s no `online`) + `T-25` (a coluna "Pts" na tabela) + `T-32` (a série de revanches em `cpu` e `local`) + `T-31` (uma grade no `online`, "escolhendo…" e `t=` com um código, `D-90`) |
| M8 | Torneio: grupos, mata-mata, retrato | `T-12` — alterado por `D-57` |
| M9 | Build, portões e publicação | `T-05` (esqueleto) + `T-34` (`vite.config.ts` dentro do `tsc`, `QA-04`) + `T-36` (o medidor caminha só o grafo de `index.html`, `QA-06`/`D-93`) |
| medição | O experimento de campo de E-4 | `T-15` + `T-16` + `T-38` (a base inválida recusada antes da 1ª tentativa e as descartadas em contador próprio, `D-96`/`QA-10` — campo em `A-40`) |

**Etapas:** `E-1`..`E-6` fechadas — a prova de cada critério está em [[entrega_e6]].

**Cards de conferência no aparelho já fechados:** `A-08` (os 17/17 de E-4) · `A-14` (o painel do
sorteio) · `A-17` (o torneio) · `A-18` (a página no ar) · `A-19` (os três comandos verdes) · e a leva
de M7/online, vinda do [[a_context_source|CONTEXT]] em 2026-08-29 por `D-97`: `A-27`..`A-32` e
`A-35`..`A-37` (as telas de `T-24`..`T-33`, com campo) · `A-38` (`T-30`/`T-32`/`T-33` **no ar**) ·
`A-39` (`T-31` inteira e confirmada, nos 2 aparelhos) · `A-40` (`T-38`, com a de medição já rodando
`D-96`) · `A-41` (o sorteio do `online`, nos 2 aparelhos). O ar **é `HEAD`**: o jogo por `A-38`, a medição por `A-40`.

**`T-17`** (o sorteio de quem cobra primeiro, `D-48`) está nos **três** modos desde 2026-08-29.
Em `cpu` e `local` a semente é `cfg.seed`; no `online` é o **`roomId`** (`D-98`), o único valor que
os dois aparelhos compartilham — `D-73` já o entregava aos dois. **Com campo** desde 2026-08-29
(`A-41`): as duas telas anunciaram o mesmo cobrador, e o sorteio caiu nos dois lados.

> O PLANO congelado é `D-13`, e mora no [[b_plan|PLANO]]. Mudança de rumo é `D-NN` novo, nunca
> edição do plano — é a regra do próprio `D-13`.
