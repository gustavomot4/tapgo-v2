/**
 * M7 — o chaveamento, arrumado em seções para a tela (`T-40` / `D-111`).
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)" e
 * "M8 — Torneio", §"Portão de `chaveamento(state)` (`D-111`)".
 *
 * Módulo **puro**: nenhum DOM e nenhum texto. Existe pelo mesmo motivo de `derivacao.ts` — o que
 * a tela deriva do que leu precisa de teste, e `vitest` roda em Node, sem `document`.
 *
 * ## O que ele NÃO faz, e é o ponto de `D-111`
 * Não deriva par, não decide vencedor e não conta disputa que M8 ainda não decidiu. A lista que
 * entra aqui já vem mastigada de `chaveamento(state)`: par, fase, vencedor e placar. O que sobra
 * para M7 é **agrupar na ordem em que a fila já está** — e agrupar não é interpretar o retrato,
 * que segue opaco (`D-68`).
 *
 * A fila de M8 anda por rodada e depois por grupo, então disputas da mesma fase são sempre
 * **vizinhas**: agrupar consecutivo basta, e é isso que mantém a ordem da competição na tela sem
 * reordenar nada. Se um dia a fila mudar de ordem, esta função muda junto — e o teste que fixa
 * "as 3 rodadas antes das oitavas" é o que avisa.
 */

import type { Disputa, Stage } from '../tournament/index';

/** Uma faixa da tela: as disputas de uma fase (nos grupos, de uma rodada dela). */
export interface Secao {
  readonly stage: Stage;
  /** O `round` da fila de M8 — é o que separa as 3 rodadas da fase de grupos. */
  readonly round: number;
  readonly disputas: readonly Disputa[];
}

/**
 * As disputas em seções consecutivas de mesma fase e mesma rodada, na ordem da fila.
 *
 * Lista vazia devolve lista vazia — quem trata isso é a tela, e o estado dela tem nome (ERRO).
 */
export function secoes(disputas: readonly Disputa[]): readonly Secao[] {
  const saida: { stage: Stage; round: number; disputas: Disputa[] }[] = [];

  for (const d of disputas) {
    const atual = saida[saida.length - 1];
    if (atual !== undefined && atual.stage === d.stage && atual.round === d.round) {
      atual.disputas.push(d);
    } else {
      saida.push({ stage: d.stage, round: d.round, disputas: [d] });
    }
  }

  return saida;
}

/**
 * Em que pé está uma disputa — e os três casos são diferentes na tela, de propósito.
 *
 * - `'a-jogar'`  — M8 já decidiu o par, e ninguém jogou ainda. Sem vencedor e sem placar
 *   (`D-112`): placar de disputa que não aconteceu também é ausente.
 * - `'sem-placar'` — jogada, com vencedor, **sem gols**. São exatamente as disputas do jogador:
 *   `report(winner)` carrega o vencedor e nada mais (porta congelada, `D-13`/`D-58`), e é a
 *   ausência que `D-67` manda mostrar em vez do `0` que ninguém mediu.
 * - `'jogada'` — vencedor e placar, que é o caso das simuladas por M8.
 *
 * Os dois primeiros mostram o mesmo traço na tela e **não** dizem a mesma coisa. Por isso são
 * dois valores e não um: o que o leitor de tela ouve muda, e a nota embaixo da lista fala de um
 * só deles.
 */
export type EstadoDaDisputa = 'a-jogar' | 'sem-placar' | 'jogada';

export function estadoDaDisputa(d: Disputa): EstadoDaDisputa {
  if (d.winner === null) return 'a-jogar';
  return d.goals === null ? 'sem-placar' : 'jogada';
}
