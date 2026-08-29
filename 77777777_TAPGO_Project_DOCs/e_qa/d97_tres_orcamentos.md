---
tags: [qa, nota, orcamento]
status: atual
---
# `D-97` — os três orçamentos em 97-98% caem por arquivamento (2026-08-29)

> Nota de evidência de `D-97`. A linha viva do [[c_decisions|DECISIONS]] guarda a decisão e o
> ponteiro; os números inteiros ficam aqui, pela régua de `D-91` (§5.1 de [[registro_no_teto]]).

## O que a sessão encontrou

`python scripts/check.py` abriu com **quatro** avisos de orçamento, não três: além dos que o pedido
citava, o próprio [[a_context_source|CONTEXT]] estava em **3.919/4.000 (97%)**.

| Registro | Antes | Depois | % do teto | O que saiu |
|---|---|---|---|---|
| `a_context/c_decisions.md` | 19.715 | 15.605 | 98% -> 78% | 11 `D-NN` que nenhum `.md` vivo cita |
| `b_process/c_backlog.md` | 19.786 | 13.495 | 98% -> 67% | 4 cards fechados viram ponteiro |
| `a_context/d_qa.md` | 7.398 | 3.438 | 92% -> 43% | os 10 `QA-NN` FECHADOS |
| `a_context/a_context_source.md` | 3.919 | 3.578 | 97% -> 89% | a leva de cards `A-NN` da linha "Pronto" |

Medido pela régua do próprio `check.py` (`medida()`, sem o padding de tabela), não por `wc -c`.

## Como cada corte foi feito

- **DECISIONS e BACKLOG:** `python scripts/arquivar.py [--backlog] --aplicar`. Critério de `D-43`:
  sai da tabela quem nenhum `.md` vivo cita. As REJEITADAS ficam por padrão — são a lista-morta que
  a fase de evolução varre (`D-74`), e `--incluir-rejeitadas` não foi usado.
- **QA:** à mão, pelo critério que o cabeçalho do [[d_qa|QA]] já declarava desde `D-74` — *"os
  FECHADOS saem, os abertos ficam"*. Os 10 fechados foram para [[decisions_archive]] íntegros, com
  a seção datada; ficaram vivos `QA-07`, `QA-17`, `QA-27`, `QA-29`, `QA-34` e o novo `QA-38`.
- **CONTEXT:** a leva de cards de conferência (`A-27`..`A-32`, `A-35`..`A-37`, `A-38`, `A-39`,
  `A-40`) saiu da linha "Pronto" para [[estado_modulos]], que é onde `D-74` já pusera o histórico
  de "qual tarefa fechou qual módulo". Nenhum ID sumiu; o estado numérico continua só no CONTEXT.

## O que este corte NÃO fez

- **Não subiu teto nenhum.** `D-94` teve de comprar essa saída para o BACKLOG em 2026-08-28; aqui
  nenhum dos quatro precisou dela, e "subir o teto" segue REPROVADO no CONTEXT.
- **Não podou prosa.** O que saiu da tabela viva está inteiro em `e_qa/`, com o ID preservado.
- **Não fechou `QA-38`.** O QA continua fora do Mapa de leitura do CONTEXT: entrar no Mapa custa
  orçamento do arquivo que esta sessão acabou de encolher, e a escolha é de outra sessão (regra 4).
