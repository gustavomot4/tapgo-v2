---
tags: [qa, evidencia]
status: atual
---
# `P-3` — o leitor do chaveamento: a medida que escolheu a forma (`D-111`)

> Evidência de `D-111`. A linha do registro guarda a decisão; o como-se-chegou-aqui é isto.

## A premissa que caiu

A nota de 2026-08-20 ([[pedidos_do_dono_260820]], `P-3`) descreveu a saída (a) — M7 interpreta
`TournamentState` — como "barato em código, caro em contrato". Medido no código em 2026-09-01,
ela é cara nos dois: **as 64 disputas não estão guardadas, são derivadas**.

`TournamentState` guarda só `entrants`, `groupOrder`, `results`, `goalsA`, `goalsB`. Quem
reconstrói cada par é `disputaEm(i)` (`src/tournament/index.ts:228`), que precisa de
`CRUZAMENTO`, de `vencedorDe`/`perdedorDe` (recursivos sobre a fase anterior) e de
`disputaDeGrupo`/`RODADAS_DE_GRUPO` (`src/tournament/fila.ts`). Ler o retrato **não** é ler
campo: é reescrever essa derivação — segunda cópia, dentro de `src/ui/`, com o reload como o
caminho em que as duas discordam sem ninguém ver.

## As três saídas, e por que (c)

| | Custo em código | Custo em contrato |
|---|---|---|
| (a) M7 interpreta o retrato | cópia da derivação de M8 em `src/ui/` | mata `D-68` por escrito |
| (b) 6º método `bracket()` | ~nenhum (é projeção de `disputaEm`) | mexe na porta congelada de `D-13`/`D-58` — a superfície que `D-39` recusou e `D-107` reafirmou ontem |
| **(c) `chaveamento(state)`** | **o mesmo de (b)** | **nenhum dos dois**: não é método da interface, e M7 recebe tipo pronto |

(c) ainda ganha o que (b) não tem: como deriva do **retrato**, a tela do chaveamento é legível a
partir do torneio salvo, sem exigir um `Tournament` vivo na memória.

## O que a forma escolhida obriga

- **Pureza.** `fecharGrupos()` consome `Rng` (o desempate de `D-53` pode chegar ao sorteio). Ler
  não pode fechar grupo: por isso a função parte de `groupOrder` **como está no retrato**, e o
  portão cobra `consumed` idêntico antes e depois.
- **Só o decidido entra.** 48 antes de os grupos fecharem, 56 assim que fecham, 64 com campeão.
- **`goals: null` é ausência, não zero.** As disputas do jogador não têm placar (`report(winner)`,
  porta congelada; `Q-13` segue do dono). O dono escolheu em 2026-09-01 repetir o que `D-67` já
  faz na tabela do grupo: mostrar `—`. Isso não abriu `D-NN` próprio porque não muda nada.

## As 2 mortas

- (a) e (b) acima. Reproposta de qualquer uma volta como `D-NN` novo, nunca como "só expor o
  estado".
