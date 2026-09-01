---
tags: [qa, m3, m5, m8]
status: atual
---
# `QA-44` — a ordem "escolher antes de observar" virou carga, e dois comentários dizem o contrário

> Achado em 2026-09-01, na sessão de M3 que aplicou `D-103` (`Q-08` saída C). **Nenhuma linha de
> código está errada** — o defeito é só de comentário, e por isso a severidade é BAIXO. Mas é o
> tipo de comentário que convida ao erro, porque autoriza explicitamente a mudança que quebra.

## O que os dois comentários dizem

`src/session/index.ts`, no bloco `D-26`:

> "Com o comportamento que T-07 entregou (`pick(role)` lê o histograma do MESMO papel, `Q-08`),
> a ordem é indiferente: os dois histogramas são disjuntos dentro de uma cobrança."

`src/tournament/index.ts`, logo antes das duas chamadas:

> "Escolhem ANTES de observar, como M5 faz (`D-26`): observar primeiro deixaria o goleiro ler o
> chute desta mesma cobrança se `Q-08` for respondida ao contrário."

Os dois foram escritos enquanto `Q-08` estava aberta, e os dois estão certos **para o mundo em que
ela ainda estava**. `D-103` respondeu pela saída (C), que é justamente "ao contrário".

## Por que isso deixou de ser verdade

Depois de `D-103`, `pick(role)` lê o histograma do papel ADVERSÁRIO. Numa cobrança:

| Ordem | O que a CPU no gol lê |
|---|---|
| `pick` → `observe` (a de hoje) | o histórico de chutes **anterior** a esta cobrança ✔ |
| `observe` → `pick` | o histórico **incluindo o chute que o humano acabou de dar** ✘ |

A segunda ordem é vidência, não dificuldade: a CPU defenderia a zona exata do chute em curso, com
peso de até 70% no difícil. O código faz a primeira — está correto. O que sumiu foi a folga: a
ordem deixou de ser indiferente e passou a ser **a única correta**, e nenhum teste a prende.

## Correção proposta

Reescrever os dois comentários para dizer que a ordem é obrigatória por causa de `D-103`, e não
opcional enquanto `Q-08` estivesse aberta. Opcionalmente, um teste em M5 que reprove a inversão —
mas isso é decisão de escopo do dono, não deste achado.

**Fora do escopo da sessão que achou:** é M5 e M8, e a sessão era de M3 (regra 2). Nenhuma linha de
código muda em nenhum dos dois arquivos.
