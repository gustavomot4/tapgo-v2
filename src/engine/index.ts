/**
 * M2 — Motor da disputa.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M2 — Motor da disputa".
 * Regras e invariantes: `a_context/regras_partida.md`.
 *
 * Este módulo é a **verdade do placar** — ninguém mais calcula placar. Ele não conhece
 * jogador, CPU, rede nem tela, e importa apenas tipos de M1. Sem `Date.now()`, sem gerador
 * nativo, sem I/O: `play` é pura, e é isso que sustenta "roda 2x com o mesmo resultado".
 *
 * **Ordem de cobrança (`D-48`, `T-17`):** quem cobra primeiro entra por `createMatch(first)` e
 * **não alterna** até o fim — nem entre as 5 regulares, nem nas alternadas. M2 recebe o resultado
 * do sorteio; sortear é de M5, porque gerador dentro deste módulo derrubaria `play` pura.
 */

import type { Side, Zone } from '../core/index';

/** `suddenDeath` = alternadas (`D-09`). */
export type Phase = 'regular' | 'suddenDeath' | 'finished';

/** Uma cobrança já resolvida. `goal` é o resultado DESTA cobrança — nunca o da anterior. */
export interface Kick {
  side: Side;
  shot: Zone;
  dive: Zone;
  goal: boolean;
}

export interface MatchState {
  readonly kicks: readonly Kick[];
  readonly goals: Readonly<Record<Side, number>>;
  readonly taken: Readonly<Record<Side, number>>;
  readonly phase: Phase;
  readonly turn: Side | null;
  readonly winner: Side | null;
}

/** Cobranças de cada lado na fase regular. */
const REGULAR_KICKS = 5;

const ZONES: readonly Zone[] = ['L', 'C', 'R'];
const SIDES: readonly Side[] = ['A', 'B'];

function other(side: Side): Side {
  return side === 'A' ? 'B' : 'A';
}

function isZone(value: unknown): value is Zone {
  return (ZONES as readonly unknown[]).includes(value);
}

/** Congela o estado inteiro: a imutabilidade do contrato passa a valer também em runtime. */
function freeze(state: MatchState): MatchState {
  Object.freeze(state.goals);
  Object.freeze(state.taken);
  Object.freeze(state.kicks);
  return Object.freeze(state);
}

/**
 * Cria a disputa com quem cobra primeiro JÁ decidido.
 *
 * `first` é obrigatório de propósito (`D-48`, autorizado por `T-17`). Um valor padrão `'A'`
 * devolveria em silêncio exatamente o defeito que esta tarefa remove — um lado cobrando primeiro
 * sempre — e o chamador que esquecesse o argumento não ouviria nada. Sem padrão, quem esquece é
 * reprovado pelo `tsc`, que é o lugar mais forte possível para esta regra.
 *
 * **M2 não sorteia.** Este módulo não conhece gerador — nem o de M1, nem o nativo. Quem sorteia é
 * M5, com o `Rng` semeado da sessão; aqui só entra o resultado. É o que mantém `play` pura e o
 * aceite "roda 2x com o mesmo resultado" verdadeiro.
 *
 * **A ordem não alterna** (`D-48`): quem cobra primeiro segue primeiro em toda rodada, inclusive
 * nas alternadas. Isso não custa código — `resolve` alterna a vez a cada cobrança e uma rodada
 * tem exatamente duas, então o primeiro de cada rodada é sempre `first`. Zero linha a mais.
 *
 * @throws RangeError se `first` não for `'A' | 'B'`.
 */
export function createMatch(first: Side): MatchState {
  if (!(SIDES as readonly unknown[]).includes(first)) {
    throw new RangeError(
      `createMatch: quem cobra primeiro deve ser 'A' | 'B'; recebido ${String(first)}`,
    );
  }

  return freeze({
    kicks: [],
    goals: { A: 0, B: 0 },
    taken: { A: 0, B: 0 },
    phase: 'regular',
    turn: first,
    winner: null,
  });
}

/**
 * Recusa estado que não fecha consigo mesmo.
 *
 * `MatchState` atravessa a rede em M6 e volta pela sessão em M5; sem esta porta, um estado
 * forjado ou corrompido entraria no cálculo e o placar mentiria em silêncio. É também a
 * defesa do defeito 5 da v1: aqui, nenhuma decisão de fim de jogo roda sobre estado torto.
 */
function assertConsistent(state: MatchState): void {
  const erro = (motivo: string): never => {
    throw new Error(`play: estado inconsistente — ${motivo}`);
  };

  for (const side of SIDES) {
    const gols = state.goals[side];
    const cobrancas = state.taken[side];

    if (!Number.isInteger(gols) || !Number.isInteger(cobrancas)) {
      erro(`goals/taken de ${side} não são inteiros (${gols}/${cobrancas})`);
    }
    if (gols < 0 || cobrancas < 0) erro(`goals/taken de ${side} são negativos`);
    if (gols > cobrancas) erro(`gols de ${side} (${gols}) excedem as cobranças (${cobrancas})`);
  }

  if (state.taken.A + state.taken.B !== state.kicks.length) {
    erro(`taken soma ${state.taken.A + state.taken.B}, mas há ${state.kicks.length} cobranças`);
  }

  // O histórico é a prova do placar: `goals` e `taken` não são um resumo em que se confia,
  // são um total reconferível. Sem isto, um estado com placar forjado e histórico honesto
  // passaria — e é exatamente essa a forma que um estado adulterado chega por M6.
  const daHistoria: Record<Side, { gols: number; cobrancas: number }> = {
    A: { gols: 0, cobrancas: 0 },
    B: { gols: 0, cobrancas: 0 },
  };
  for (const k of state.kicks) {
    if (!isZone(k.shot) || !isZone(k.dive)) erro(`cobrança com zona inválida no histórico`);
    if (k.goal !== (k.shot !== k.dive)) erro(`cobrança com goal que não bate com as zonas`);
    const registro = daHistoria[k.side];
    if (registro === undefined) erro(`cobrança com side inválido (${String(k.side)})`);
    else {
      registro.cobrancas += 1;
      if (k.goal) registro.gols += 1;
    }
  }
  for (const side of SIDES) {
    if (daHistoria[side].gols !== state.goals[side]) {
      erro(`goals de ${side} (${state.goals[side]}) não batem com o histórico (${daHistoria[side].gols})`);
    }
    if (daHistoria[side].cobrancas !== state.taken[side]) {
      erro(
        `taken de ${side} (${state.taken[side]}) não bate com o histórico (${daHistoria[side].cobrancas})`,
      );
    }
  }
  if (state.phase !== 'finished' && state.winner !== null) {
    erro('há vencedor fora da fase finished');
  }
}

/** Decide fase, vez e vencedor a partir do estado JÁ completo — nunca no meio da atualização. */
function resolve(
  phase: Exclude<Phase, 'finished'>,
  goals: Record<Side, number>,
  taken: Record<Side, number>,
  justKicked: Side,
): Pick<MatchState, 'phase' | 'turn' | 'winner'> {
  const nextTurn = other(justKicked);

  if (phase === 'regular') {
    const restam: Record<Side, number> = {
      A: REGULAR_KICKS - taken.A,
      B: REGULAR_KICKS - taken.B,
    };

    // Morte matemática: a diferença é maior que o que sobra para o adversário.
    for (const side of SIDES) {
      if (goals[side] > goals[other(side)] + restam[other(side)]) {
        return { phase: 'finished', turn: null, winner: side };
      }
    }

    // Fim da fase regular sem morte matemática só é possível empatado: com 0 cobranças
    // restantes, qualquer diferença já teria decidido acima. Invariante coberto por teste.
    if (taken.A >= REGULAR_KICKS && taken.B >= REGULAR_KICKS) {
      return { phase: 'suddenDeath', turn: nextTurn, winner: null };
    }

    return { phase: 'regular', turn: nextTurn, winner: null };
  }

  // Alternadas (`D-09`): o fim é avaliado SÓ ao fim da rodada — as duas cobranças sempre
  // acontecem. Nada de morte matemática aqui.
  const rodadaCompleta = taken.A === taken.B;
  if (rodadaCompleta && goals.A !== goals.B) {
    return { phase: 'finished', turn: null, winner: goals.A > goals.B ? 'A' : 'B' };
  }

  return { phase: 'suddenDeath', turn: nextTurn, winner: null };
}

/**
 * Aplica uma cobrança e devolve o estado novo. Pura: não muta `state`.
 *
 * Mesma zona = defesa · zonas diferentes = gol.
 *
 * @throws Error se a disputa já terminou, ou se `state` não fecha consigo mesmo.
 * @throws RangeError se `shot` ou `dive` não forem `'L' | 'C' | 'R'`.
 */
export function play(state: MatchState, shot: Zone, dive: Zone): MatchState {
  if (state.phase === 'finished') {
    throw new Error('play: disputa encerrada — nenhuma cobrança é aceita depois do fim');
  }
  if (!isZone(shot) || !isZone(dive)) {
    throw new RangeError(
      `play: zona inválida (shot=${String(shot)}, dive=${String(dive)}); esperado 'L' | 'C' | 'R'`,
    );
  }
  assertConsistent(state);

  const side = state.turn;
  if (side === null) {
    throw new Error('play: estado inconsistente — turn nulo fora da fase finished');
  }

  const goal = shot !== dive;

  // Só o lado que cobrou é tocado. É literalmente a correção do defeito 2 da v1, onde o
  // mesmo resultado era escrito nos dois marcadores.
  const goals: Record<Side, number> = { A: state.goals.A, B: state.goals.B };
  const taken: Record<Side, number> = { A: state.taken.A, B: state.taken.B };
  taken[side] += 1;
  if (goal) goals[side] += 1;

  const kick: Kick = Object.freeze({ side, shot, dive, goal });

  return freeze({
    kicks: [...state.kicks, kick],
    goals,
    taken,
    ...resolve(state.phase, goals, taken, side),
  });
}
