/**
 * M1 — Núcleo: tipos compartilhados e gerador pseudoaleatório determinístico.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M1 — Núcleo".
 * Sem dependência, sem I/O, sem `Date.now()`, sem render. Todo o resto importa daqui.
 */

/** Zona do gol: esquerda · meio · direita. */
export type Zone = 'L' | 'C' | 'R';

/** Lado da disputa. */
export type Side = 'A' | 'B';

/** Código ISO-3166 alfa-2 — 2 letras maiúsculas. Nunca nome de país digitado. */
export type CountryCode = string;

/** Gerador pseudoaleatório com cursor próprio. */
export interface Rng {
  /**
   * Inteiro em `[0, maxExclusive)` — o **0 é sorteável** (defeito 3 da v1).
   * @throws RangeError se `maxExclusive` não for inteiro >= 1.
   */
  int(maxExclusive: number): number;
}

/** Espaço de sementes do gerador: 2^32. */
const SEED_SPACE = 0x1_0000_0000;

/**
 * Cria um gerador determinístico: a mesma semente produz sempre a mesma sequência.
 *
 * Algoritmo mulberry32 — escrito à mão de propósito: biblioteca a mais é peso no bundle
 * e linha na tabela de custo de `stack.md`.
 *
 * A semente efetiva é `seed` módulo 2^32; sementes congruentes nesse módulo (ex.: `0` e
 * `2**32`) geram a mesma sequência. Limite conhecido do gerador de 32 bits, não defeito.
 *
 * @throws TypeError se `seed` não for inteiro seguro (`1.5`, `NaN`, `Infinity`, `2**53`).
 */
export function createRng(seed: number): Rng {
  if (!Number.isSafeInteger(seed)) {
    throw new TypeError(
      `createRng: semente deve ser inteiro seguro; recebido ${String(seed)}`,
    );
  }

  // O único estado que este módulo possui. Vive em memória e some no reload da página.
  let cursor = seed >>> 0;

  /** Próximo float em [0, 1). */
  const nextFloat = (): number => {
    cursor = (cursor + 0x6d2b79f5) >>> 0;
    let t = cursor;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / SEED_SPACE;
  };

  return {
    int(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
        throw new RangeError(
          `Rng.int: maxExclusive deve ser inteiro >= 1; recebido ${String(maxExclusive)}`,
        );
      }
      return Math.floor(nextFloat() * maxExclusive);
    },
  };
}

/**
 * Sorteia uma semente nova, em `[0, 2^32)`.
 *
 * **Esta linha é a única chamada ao gerador nativo do JS em todo o projeto** — é o que
 * mantém o aceite "roda 2x com o mesmo resultado" verdadeiro. Qualquer outro módulo que
 * precise de acaso recebe um `Rng` pronto; nenhum sorteia por conta própria.
 * Portão de M1, verificado por teste em `src/tests/core.test.ts`.
 */
export function newSeed(): number {
  return Math.floor(Math.random() * SEED_SPACE);
}
