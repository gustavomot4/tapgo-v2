/**
 * M8 · a fila da fase de grupos.
 *
 * **Não é a porta do módulo** (a porta é `src/tournament/index.ts`). Está separada pelo mesmo
 * motivo de `tabela.ts`: o portão "nenhum par se repete **dentro da fase de grupos**" (`D-57`)
 * é cobrado aqui, sobre as 48 disputas em si, e não por inspeção de um torneio já jogado — onde
 * um par repetido se esconderia atrás de um resultado.
 *
 * Importa só tipos de M1.
 */

import type { CountryCode } from '../core/index';

export const GRUPOS = 8;
export const POR_GRUPO = 4;
export const DISPUTAS_DE_GRUPO = 48; // 8 grupos × 6 combinações

/**
 * As 3 rodadas de um grupo de 4, por índice dentro do grupo.
 *
 * Cada um dos 6 pares aparece **uma vez** nas 3 rodadas — o portão de par único é cumprido por
 * construção, e o teste confere a construção, não o sintoma.
 */
export const RODADAS_DE_GRUPO: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

export interface ParDeGrupo {
  readonly a: CountryCode;
  readonly b: CountryCode;
  /** 1..3 */
  readonly round: number;
  /** 0..7 */
  readonly grupo: number;
}

function em<T>(lista: readonly T[], i: number): T {
  const valor = lista[i];
  if (valor === undefined) {
    throw new RangeError(`M8/fila: índice ${String(i)} fora da faixa (${String(lista.length)})`);
  }
  return valor;
}

/**
 * A disputa de grupo da posição `i` da fila (0..47).
 *
 * A fase anda **por rodada, depois por grupo** — as 8 primeiras disputas são a rodada 1 dos 8
 * grupos —, e por isso `round` significa a mesma coisa nos 8 grupos.
 *
 * `entrants` são as 32 **já sorteadas**: cada fatia de 4 é um grupo (`D-59`).
 */
export function disputaDeGrupo(entrants: readonly CountryCode[], i: number): ParDeGrupo {
  if (!Number.isInteger(i) || i < 0 || i >= DISPUTAS_DE_GRUPO) {
    throw new RangeError(`M8/fila: posição ${String(i)} fora das ${String(DISPUTAS_DE_GRUPO)}`);
  }
  const porRodada = GRUPOS * 2;
  const rodada = Math.floor(i / porRodada); // 0..2
  const dentro = i % porRodada;
  const grupo = Math.floor(dentro / 2);
  const par = em(em(RODADAS_DE_GRUPO, rodada), dentro % 2);
  return {
    a: em(entrants, grupo * POR_GRUPO + em(par, 0)),
    b: em(entrants, grupo * POR_GRUPO + em(par, 1)),
    round: rodada + 1,
    grupo,
  };
}
