import { describe, expect, it } from 'vitest';

import { createRng, type Rng, type Side, type Zone } from '../core/index';
import { createMatch, play, type MatchState } from '../engine/index';

const ZONES: readonly Zone[] = ['L', 'C', 'R'];
const SIDES: readonly Side[] = ['A', 'B'];

/** Par de zonas que resulta em gol (zonas diferentes) ou em defesa (mesma zona). */
const GOL: readonly [Zone, Zone] = ['L', 'R'];
const DEFESA: readonly [Zone, Zone] = ['L', 'L'];

/** Joga uma sequência de resultados: `true` = gol, `false` = defesa. */
function jogar(resultados: readonly boolean[], inicial = createMatch('A')): MatchState {
  return resultados.reduce<MatchState>((estado, fezGol) => {
    const [shot, dive] = fezGol ? GOL : DEFESA;
    return play(estado, shot, dive);
  }, inicial);
}

/** Todos os estados intermediários, do inicial ao final. */
function trilha(resultados: readonly boolean[], primeiro: Side = 'A'): MatchState[] {
  const estados = [createMatch(primeiro)];
  for (const fezGol of resultados) {
    const anterior = estados[estados.length - 1]!;
    if (anterior.phase === 'finished') break;
    const [shot, dive] = fezGol ? GOL : DEFESA;
    estados.push(play(anterior, shot, dive));
  }
  return estados;
}

function zonaSorteada(rng: Rng): Zone {
  return ZONES[rng.int(ZONES.length)]!;
}

/** Disputa inteira com entradas sorteadas; devolve todos os estados até o fim. */
function disputaSorteada(rng: Rng, tetoDeCobrancas = 200, primeiro: Side = 'A'): MatchState[] {
  const estados = [createMatch(primeiro)];
  while (estados[estados.length - 1]!.phase !== 'finished' && estados.length <= tetoDeCobrancas) {
    const atual = estados[estados.length - 1]!;
    estados.push(play(atual, zonaSorteada(rng), zonaSorteada(rng)));
  }
  return estados;
}

/** Todos os invariantes estruturais que TODO estado observável deve satisfazer. */
function conferirInvariantes(e: MatchState): void {
  for (const side of SIDES) {
    expect(Number.isInteger(e.goals[side])).toBe(true);
    expect(Number.isInteger(e.taken[side])).toBe(true);
    expect(e.goals[side]).toBeGreaterThanOrEqual(0);
    expect(e.goals[side]).toBeLessThanOrEqual(e.taken[side]);
  }
  expect(e.taken.A + e.taken.B).toBe(e.kicks.length);
  expect(e.goals.A).toBe(e.kicks.filter((k) => k.side === 'A' && k.goal).length);
  expect(e.goals.B).toBe(e.kicks.filter((k) => k.side === 'B' && k.goal).length);

  if (e.phase === 'finished') {
    expect(e.turn).toBeNull();
  } else {
    expect(e.turn).not.toBeNull();
    expect(e.winner).toBeNull();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariantes de regras_partida.md — um teste por frase
// ─────────────────────────────────────────────────────────────────────────────

describe('M2 · invariante: gols <= cobranças para cada lado, sempre', () => {
  it('vale em toda transição de uma disputa sorteada', () => {
    for (const estado of disputaSorteada(createRng(7))) {
      for (const side of SIDES) {
        expect(estado.goals[side]).toBeLessThanOrEqual(estado.taken[side]);
      }
    }
  });
});

describe('M2 · invariante: toda cobrança registra uma zona e um resultado', () => {
  it('cada Kick tem side, shot, dive e goal coerentes entre si', () => {
    const final = disputaSorteada(createRng(11)).at(-1)!;

    expect(final.kicks.length).toBeGreaterThan(0);
    for (const k of final.kicks) {
      expect(SIDES).toContain(k.side);
      expect(ZONES).toContain(k.shot);
      expect(ZONES).toContain(k.dive);
      expect(k.goal).toBe(k.shot !== k.dive);
    }
  });

  it('mesma zona é defesa; zonas diferentes são gol', () => {
    for (const z of ZONES) {
      expect(play(createMatch('A'), z, z).goals.A).toBe(0);
    }
    expect(play(createMatch('A'), 'L', 'C').goals.A).toBe(1);
  });
});

describe('M2 · invariante: morte matemática encerra sem cobrança inútil', () => {
  it('3x0 com 3 cobranças de cada lado encerra na 6ª — as 4 restantes não acontecem', () => {
    const final = jogar([true, false, true, false, true, false]);

    expect(final.phase).toBe('finished');
    expect(final.winner).toBe('A');
    expect(final.turn).toBeNull();
    expect(final.kicks).toHaveLength(6);
    expect(final.taken).toEqual({ A: 3, B: 3 });
  });

  it('não encerra enquanto o adversário ainda alcança', () => {
    // 3x0 com A na 3ª e B na 2ª: restam 3 a B, que empata no limite.
    const parcial = jogar([true, false, true, false, true]);

    expect(parcial.phase).toBe('regular');
    expect(parcial.winner).toBeNull();
  });

  it('encerra com cobranças desiguais quando a diferença decide logo após a cobrança de A', () => {
    // 4x1 na 4ª de A, com B tendo cobrado 3: restam 2 a B, e 4 > 1 + 2.
    const final = jogar([true, true, true, false, true, false, true]);

    expect(final.phase).toBe('finished');
    expect(final.winner).toBe('A');
    expect(final.goals).toEqual({ A: 4, B: 1 });
    expect(final.taken).toEqual({ A: 4, B: 3 });
    expect(final.kicks).toHaveLength(7);
  });
});

describe('M2 · invariante: empate em 5 leva a alternadas, que terminam empatadas em cobranças', () => {
  it('10 cobranças empatadas abrem suddenDeath, com a vez de quem inicia', () => {
    const final = jogar(Array<boolean>(10).fill(false));

    expect(final.phase).toBe('suddenDeath');
    expect(final.taken).toEqual({ A: 5, B: 5 });
    expect(final.goals).toEqual({ A: 0, B: 0 });
    expect(final.turn).toBe('A');
  });

  it('ao entrar em alternadas os gols estão necessariamente empatados', () => {
    for (const seed of [7, 11, 42, 99, 2 ** 20]) {
      const entrada = disputaSorteada(createRng(seed)).find((e) => e.phase === 'suddenDeath');
      if (entrada) expect(entrada.goals.A).toBe(entrada.goals.B);
    }
  });

  it('toda disputa decidida nas alternadas termina com cobranças iguais', () => {
    let decididasNasAlternadas = 0;

    for (let seed = 0; seed < 60; seed += 1) {
      const estados = disputaSorteada(createRng(seed));
      const final = estados.at(-1)!;
      const passouPorAlternadas = estados.some((e) => e.phase === 'suddenDeath');

      if (final.phase === 'finished' && passouPorAlternadas) {
        decididasNasAlternadas += 1;
        expect(final.taken.A).toBe(final.taken.B);
      }
    }

    expect(decididasNasAlternadas).toBeGreaterThan(0);
  });
});

describe('M2 · invariante: nas alternadas o fim só é avaliado ao fim da rodada (D-09)', () => {
  const empate10 = Array<boolean>(10).fill(false);

  it('a rodada é 1 cobrança de cada lado, e a vez alterna', () => {
    const abertura = jogar(empate10);
    const depoisDeA = play(abertura, ...GOL);

    expect(depoisDeA.taken).toEqual({ A: 6, B: 5 });
    expect(depoisDeA.turn).toBe('B');
  });

  it('a morte matemática NÃO se aplica dentro da rodada: A na frente e a rodada segue', () => {
    const depoisDeA = play(jogar(empate10), ...GOL);

    expect(depoisDeA.goals).toEqual({ A: 1, B: 0 });
    expect(depoisDeA.phase).toBe('suddenDeath');
    expect(depoisDeA.winner).toBeNull();
    expect(depoisDeA.turn).toBe('B');
  });

  it('com a rodada completa e diferença de gols, encerra', () => {
    const final = jogar([...empate10, true, false]);

    expect(final.phase).toBe('finished');
    expect(final.winner).toBe('A');
    expect(final.taken).toEqual({ A: 6, B: 6 });
  });

  it('rodada completa e empatada segue para a próxima — sem teto de rodadas', () => {
    const vinteRodadas = [...empate10, ...Array<boolean>(40).fill(true)];
    const final = jogar(vinteRodadas);

    expect(final.phase).toBe('suddenDeath');
    expect(final.taken).toEqual({ A: 25, B: 25 });
    expect(final.goals).toEqual({ A: 20, B: 20 });
  });
});

describe('M2 · invariante: a mesma sequência de entradas produz o mesmo placar', () => {
  it('duas execuções da mesma disputa sorteada dão placar e histórico idênticos', () => {
    const primeira = disputaSorteada(createRng(7)).at(-1)!;
    const segunda = disputaSorteada(createRng(7)).at(-1)!;

    expect(segunda.goals).toEqual(primeira.goals);
    expect(segunda.taken).toEqual(primeira.taken);
    expect(segunda.winner).toBe(primeira.winner);
    expect(segunda.kicks).toEqual(primeira.kicks);
  });
});

describe('M2 · invariante: nenhum estado entra sem validação local', () => {
  const base = jogar([true, false, true]);

  function forjar(patch: Partial<MatchState>): MatchState {
    return { ...base, ...patch } as MatchState;
  }

  it('recusa gols acima das cobranças', () => {
    expect(() => play(forjar({ goals: { A: 99, B: 0 } }), ...GOL)).toThrow(/inconsistente/);
  });

  it('recusa gols não inteiros', () => {
    expect(() => play(forjar({ goals: { A: 1.5, B: 0 } }), ...GOL)).toThrow(/inconsistente/);
  });

  it('recusa contagem negativa', () => {
    expect(() => play(forjar({ goals: { A: -1, B: 0 } }), ...GOL)).toThrow(/inconsistente/);
  });

  it('recusa taken que não bate com o histórico de cobranças', () => {
    expect(() => play(forjar({ taken: { A: 9, B: 9 } }), ...GOL)).toThrow(/inconsistente/);
  });

  it('recusa vencedor declarado fora de finished', () => {
    expect(() => play(forjar({ winner: 'B' }), ...GOL)).toThrow(/inconsistente/);
  });

  it('recusa placar que não bate com o histórico de cobranças', () => {
    expect(() => play(forjar({ goals: { A: 0, B: 0 } }), ...GOL)).toThrow(/histórico/);
  });

  it('recusa cobrança forjada no histórico — goal que não bate com as zonas', () => {
    const torto = forjar({
      kicks: [...base.kicks, { side: 'B', shot: 'L', dive: 'L', goal: true }],
      taken: { A: base.taken.A, B: base.taken.B + 1 },
      goals: { A: base.goals.A, B: base.goals.B + 1 },
    });

    expect(() => play(torto, ...GOL)).toThrow(/não bate com as zonas/);
  });

  it('recusa zona inválida', () => {
    expect(() => play(createMatch('A'), 'X' as Zone, 'L')).toThrow(RangeError);
    expect(() => play(createMatch('A'), 'L', '' as Zone)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Portão do contrato de M2
// ─────────────────────────────────────────────────────────────────────────────

describe('M2 · play sobre disputa encerrada é rejeitada, não ignorada', () => {
  it('lança em vez de devolver o mesmo estado', () => {
    const final = jogar([true, false, true, false, true, false]);

    expect(final.phase).toBe('finished');
    expect(() => play(final, ...GOL)).toThrow(/encerrada/);
  });
});

describe('M2 · Number.isInteger em TODA transição de placar', () => {
  it('vale em 1.000 cobranças sorteadas com semente fixa', () => {
    const rng = createRng(7);
    let cobrancas = 0;

    while (cobrancas < 1000) {
      for (const estado of disputaSorteada(rng)) {
        conferirInvariantes(estado);
      }
      cobrancas += disputaSorteada(rng).length;
    }

    expect(cobrancas).toBeGreaterThanOrEqual(1000);
  });

  it('a suíte de propriedade roda 2x com o mesmo placar', () => {
    const placar = (seed: number): unknown =>
      Array.from({ length: 25 }, (_, i) => {
        const final = disputaSorteada(createRng(seed + i)).at(-1)!;
        return { goals: final.goals, taken: final.taken, winner: final.winner };
      });

    expect(placar(7)).toEqual(placar(7));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Regressão dos defeitos medidos na v1 (1, 2, 4 e 5)
// ─────────────────────────────────────────────────────────────────────────────

describe('M2 · regressão do defeito 1 — resultado da jogada ANTERIOR vazando no placar', () => {
  it('a cobrança 2 registra o próprio resultado, não o da cobrança 1', () => {
    const estados = trilha([true, false]);
    const final = estados.at(-1)!;

    expect(final.kicks[0]?.goal).toBe(true);
    expect(final.kicks[1]?.goal).toBe(false);
    expect(final.goals).toEqual({ A: 1, B: 0 });
  });

  it('não há estado global: a mesma entrada sobre o mesmo estado dá sempre o mesmo resultado', () => {
    const base = jogar([true, false, true]);

    const primeira = play(base, ...GOL);
    const segunda = play(base, ...GOL);
    const terceira = play(base, ...DEFESA);

    expect(segunda).toEqual(primeira);
    expect(terceira.goals).toEqual({ A: 2, B: 0 });
    expect(primeira.goals).toEqual({ A: 2, B: 1 });
  });

  it('play não muta o estado recebido', () => {
    const base = jogar([true, false]);
    const antes = JSON.parse(JSON.stringify(base)) as MatchState;

    play(base, ...GOL);

    expect(JSON.parse(JSON.stringify(base))).toEqual(antes);
  });

  it('o estado devolvido é congelado — mutação silenciosa é impossível em runtime', () => {
    const estado = jogar([true]);

    expect(Object.isFrozen(estado)).toBe(true);
    expect(Object.isFrozen(estado.goals)).toBe(true);
    expect(() => {
      (estado.goals as Record<Side, number>).A = 99;
    }).toThrow(TypeError);
    expect(estado.goals.A).toBe(1);
  });
});

describe('M2 · regressão do defeito 2 — mesmo resultado escrito nos dois marcadores', () => {
  it('gol de A não mexe no marcador de B', () => {
    const depois = play(createMatch('A'), ...GOL);

    expect(depois.goals).toEqual({ A: 1, B: 0 });
    expect(depois.taken).toEqual({ A: 1, B: 0 });
  });

  it('gol de B não mexe no marcador de A', () => {
    const depois = jogar([false, true]);

    expect(depois.goals).toEqual({ A: 0, B: 1 });
    expect(depois.taken).toEqual({ A: 1, B: 1 });
  });

  it('em toda transição, só o lado que cobrou muda', () => {
    const estados = disputaSorteada(createRng(11));

    for (let i = 1; i < estados.length; i += 1) {
      const antes = estados[i - 1]!;
      const depois = estados[i]!;
      const cobrou = depois.kicks.at(-1)!.side;
      const parado = cobrou === 'A' ? 'B' : 'A';

      expect(depois.taken[cobrou]).toBe(antes.taken[cobrou] + 1);
      expect(depois.taken[parado]).toBe(antes.taken[parado]);
      expect(depois.goals[parado]).toBe(antes.goals[parado]);
      expect(depois.goals[cobrou] - antes.goals[cobrou]).toBe(depois.kicks.at(-1)!.goal ? 1 : 0);
    }
  });
});

describe('M2 · regressão do defeito 4 — transição que pode não executar por inteiro', () => {
  it('nenhum estado observável está pela metade: todos passam nos invariantes', () => {
    for (const seed of [7, 11, 42, 99]) {
      for (const estado of disputaSorteada(createRng(seed))) {
        conferirInvariantes(estado);
      }
    }
  });

  it('quando play lança, nada é aplicado — o estado anterior segue intacto', () => {
    const base = jogar([true, false]);
    const antes = JSON.parse(JSON.stringify(base)) as MatchState;

    expect(() => play(base, 'X' as Zone, 'L')).toThrow(RangeError);

    expect(JSON.parse(JSON.stringify(base))).toEqual(antes);
    expect(base.kicks).toHaveLength(2);
  });
});

describe('M2 · regressão do defeito 5 — fim de jogo decidido sobre estado inconsistente', () => {
  it('nas alternadas, nunca encerra com cobranças desiguais', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      for (const estado of disputaSorteada(createRng(seed))) {
        const emAlternadas = estado.taken.A > 5 || estado.taken.B > 5;
        if (emAlternadas && estado.taken.A !== estado.taken.B) {
          expect(estado.phase).not.toBe('finished');
        }
      }
    }
  });

  it('a decisão de fim não roda sobre estado torto: o estado é recusado antes', () => {
    const abertura = jogar(Array<boolean>(10).fill(false));
    const torto = { ...abertura, goals: { A: 3, B: 0 } } as MatchState;

    expect(() => play(torto, ...GOL)).toThrow(/inconsistente/);
  });

  it('vencedor e fase são sempre coerentes entre si', () => {
    for (const estado of disputaSorteada(createRng(42))) {
      if (estado.winner !== null) {
        expect(estado.phase).toBe('finished');
        expect(estado.goals[estado.winner]).toBeGreaterThan(
          estado.goals[estado.winner === 'A' ? 'B' : 'A'],
        );
      }
    }
  });
});

/* ───────────── T-17 / D-48 — quem cobra primeiro entra pela porta, e a ordem não alterna ───────────── */

describe('M2 · T-17 — createMatch recebe quem cobra primeiro (D-48)', () => {
  it('a vez inicial é o lado recebido, nos dois casos', () => {
    for (const primeiro of SIDES) {
      const inicial = createMatch(primeiro);
      expect(inicial.turn, `primeiro=${primeiro}`).toBe(primeiro);

      // O resto da abertura não muda com o sorteio: nada de placar ou histórico pré-carregado.
      expect(inicial.kicks).toHaveLength(0);
      expect(inicial.goals).toEqual({ A: 0, B: 0 });
      expect(inicial.taken).toEqual({ A: 0, B: 0 });
      expect(inicial.phase).toBe('regular');
      expect(inicial.winner).toBeNull();
    }
  });

  it('lado inválido é recusado em voz alta — não corrigido para "A"', () => {
    // A recusa é o que impede um `first` torto (bug de M5, valor de rede, `undefined` de chamador
    // JS sem tipos) de virar em silêncio uma disputa que começa em `'A'`. Cair no padrão antigo
    // seria justamente o defeito que `T-17` remove, agora sem ninguém sabendo.
    const invalidos: readonly unknown[] = ['a', 'b', 'C', '', 'AB', 0, 1, null, undefined, {}, ['A']];
    for (const ruim of invalidos) {
      expect(() => createMatch(ruim as Side), `first=${String(ruim)}`).toThrow(RangeError);
      expect(() => createMatch(ruim as Side)).toThrow(/quem cobra primeiro/);
    }
  });

  it('M2 não sorteia: a mesma entrada devolve a mesma abertura, 2x', () => {
    // Se um gerador tivesse vazado para dentro de M2, duas aberturas iguais divergiriam aqui.
    for (const primeiro of SIDES) {
      expect(createMatch(primeiro)).toEqual(createMatch(primeiro));
    }
    expect(createMatch('A')).not.toEqual(createMatch('B'));
  });
});

describe('M2 · T-17 — a ordem de cobrança NÃO alterna até o fim (D-48)', () => {
  /**
   * O portão, escrito como frase verificável: numa disputa completa, a cobrança de índice PAR é
   * sempre de quem foi sorteado, e a ímpar sempre do outro. Vale nas 5 regulares e nas alternadas,
   * porque uma rodada tem exatamente duas cobranças e a vez alterna a cada uma.
   */
  function conferirOrdemConstante(estado: MatchState, primeiro: Side): void {
    const outro: Side = primeiro === 'A' ? 'B' : 'A';
    estado.kicks.forEach((k, i) => {
      expect(k.side, `cobrança ${i} (primeiro=${primeiro})`).toBe(i % 2 === 0 ? primeiro : outro);
    });
  }

  it('numa disputa completa que chega às alternadas, o primeiro de cada rodada é sempre o sorteado', () => {
    for (const primeiro of SIDES) {
      // 10 defesas = 0x0 depois das 5 regulares: o caminho garantido até as alternadas. Depois,
      // gol de um lado e defesa do outro fecha a primeira rodada alternada com vencedor.
      const estado = trilha([...Array<boolean>(10).fill(false), true, false], primeiro).at(-1);
      expect(estado).toBeDefined();
      if (estado === undefined) return;

      expect(estado.kicks.length, `primeiro=${primeiro}`).toBe(12);
      expect(estado.phase).toBe('finished');
      expect(estado.winner).toBe(primeiro); // quem cobrou primeiro na alternada é quem fez o gol
      conferirOrdemConstante(estado, primeiro);
    }
  });

  it('a fase alternada COMEÇA com o sorteado, e não com quem cobrou por último na regular', () => {
    for (const primeiro of SIDES) {
      const naVirada = trilha(Array<boolean>(10).fill(false), primeiro).at(-1);
      expect(naVirada).toBeDefined();
      if (naVirada === undefined) return;

      expect(naVirada.phase, `primeiro=${primeiro}`).toBe('suddenDeath');
      expect(naVirada.turn).toBe(primeiro);
    }
  });

  it('em disputas sorteadas e longas, a ordem nunca vira — com qualquer dos dois começando', () => {
    for (const primeiro of SIDES) {
      for (let seed = 0; seed < 120; seed += 1) {
        const estados = disputaSorteada(createRng(seed), 200, primeiro);
        const ultimo = estados.at(-1);
        expect(ultimo).toBeDefined();
        if (ultimo === undefined) return;

        conferirOrdemConstante(ultimo, primeiro);

        // Enquanto a disputa não terminou, a vez é do sorteado exatamente nas cobranças pares.
        for (const e of estados) {
          if (e.phase === 'finished') continue;
          expect(e.turn, `seed ${seed} · primeiro=${primeiro}`).toBe(
            e.kicks.length % 2 === 0 ? primeiro : primeiro === 'A' ? 'B' : 'A',
          );
        }
      }
    }
  });

  it('trocar o primeiro cobrador espelha a disputa: mesmos pares de zonas, lados invertidos', () => {
    // Prova que `first` não muda a REGRA, só quem começa: as mesmas entradas produzem o mesmo
    // roteiro de gols, com os papéis trocados. Se `createMatch` tivesse mexido em mais alguma
    // coisa, os dois placares deixariam de ser espelho um do outro.
    const resultados = [true, false, true, true, false, false, true, false, true, true];
    const comA = trilha(resultados, 'A').at(-1);
    const comB = trilha(resultados, 'B').at(-1);
    expect(comA).toBeDefined();
    expect(comB).toBeDefined();
    if (comA === undefined || comB === undefined) return;

    expect(comB.goals).toEqual({ A: comA.goals.B, B: comA.goals.A });
    expect(comB.taken).toEqual({ A: comA.taken.B, B: comA.taken.A });
    expect(comB.kicks.length).toBe(comA.kicks.length);
    expect(comB.phase).toBe(comA.phase);
    expect(comB.winner).toBe(comA.winner === null ? null : comA.winner === 'A' ? 'B' : 'A');
  });
});
