import { describe, expect, it } from 'vitest';

// O mesmo padrão de `session_ordem.test.ts`, um módulo adiante: aqui o que está sob teste é a
// ordem `pick` → `observe` de M8, dentro de `simular`. Nada de dublê no caminho — o oráculo
// chama o M2, o M3 e o M1 de verdade, com a mesma semente. O que ele reconstrói é só a ORDEM
// das quatro chamadas por cobrança, que é justamente o que `QA-44` avisou não estar preso.
import { createCpu } from '../cpu/index';
import type { Cpu, Level } from '../cpu/index';
import { createRng } from '../core/index';
import type { CountryCode, Rng, Side } from '../core/index';
import { createMatch, play } from '../engine/index';
import { listTeams } from '../data/teams';
import { createTournament } from '../tournament/index';

/** As 32 reais de `D-51` — a mesma lista que M8 recebe em toda a suíte. */
const CODES: readonly CountryCode[] = listTeams().map((t) => t.code);
const HUMANO: CountryCode = 'BR';

/**
 * `hard` de propósito: é o nível em que o peso do histórico é máximo (`D-10`), e portanto o
 * único em que as duas ordens têm chance de divergir. Em `easy` o peso é 0 e o histograma não
 * é lido — as duas ordens dariam a mesma coisa, e o teste não pegaria nada.
 */
const NIVEL: Level = 'hard';

/**
 * Semente escolhida por dois motivos, ambos conferidos por asserção neste arquivo: ela deixa ao
 * menos uma disputa ser simulada antes da primeira do jogador, e nessa fatia as duas ordens
 * divergem no resultado observável.
 */
const SEED = 7;

/** Quantos `int()` o sorteio cego de `D-59` consome: um Fisher-Yates sobre as 32 (`n − 1`). */
const SORTEIOS_DO_SORTEIO = CODES.length - 1;

/** Teto do laço do oráculo. Mesmo papel do `TETO_COBRANCAS` de M8: separar disputa de defeito. */
const TETO_COBRANCAS = 1000;

function outro(side: Side): Side {
  return side === 'A' ? 'B' : 'A';
}

/** O resultado observável de uma disputa, do jeito que ele aparece no retrato de `toJSON()`. */
interface Placar {
  readonly vencedor: number; // 0 = venceu A, 1 = venceu B — o formato de `results`
  readonly golsA: number;
  readonly golsB: number;
}

/**
 * Simula uma disputa como M8 simula, consumindo o `Rng` na mesma ordem.
 *
 * `invertida = false` é a ordem que `D-103` tornou obrigatória: os dois escolhem, e só depois
 * cada um observa o adversário. `invertida = true` é a armadilha que o comentário de `QA-44`
 * descreve — o goleiro observa o chute DESTA cobrança antes de escolher a defesa.
 *
 * As duas consomem 2 sorteios por cobrança, na mesma ordem (chute, depois defesa), porque `pick`
 * consome exatamente 1 (contrato de M3). O que muda é só o histograma lido na hora do segundo
 * `pick` — e é isso que faz a diferença entre os dois placares ser prova da ordem.
 */
function simular(rng: Rng, invertida: boolean): Placar {
  const first: Side = rng.int(2) === 0 ? 'A' : 'B';
  const cpus: Record<Side, Cpu> = { A: createCpu(NIVEL, rng), B: createCpu(NIVEL, rng) };

  let estado = createMatch(first);
  let cobrancas = 0;

  while (estado.phase !== 'finished') {
    const cobrador = estado.turn;
    if (cobrador === null) throw new Error('teste: disputa sem vez definida fora do fim');
    const goleiro = outro(cobrador);

    const chute = cpus[cobrador].pick('shooter');
    if (invertida) cpus[goleiro].observe('shooter', chute);
    const defesa = cpus[goleiro].pick('keeper');
    cpus[cobrador].observe('keeper', defesa);
    if (!invertida) cpus[goleiro].observe('shooter', chute);

    estado = play(estado, chute, defesa);

    cobrancas += 1;
    if (cobrancas > TETO_COBRANCAS) throw new Error('teste: disputa simulada não terminou');
  }

  const vencedor = estado.winner;
  if (vencedor === null) throw new Error('teste: disputa simulada terminou sem vencedor');
  return { vencedor: vencedor === 'A' ? 0 : 1, golsA: estado.goals.A, golsB: estado.goals.B };
}

/**
 * O oráculo: as disputas que M8 simula ANTES da primeira do jogador, na ordem da fila.
 *
 * O gerador nasce da mesma semente e pula os `SORTEIOS_DO_SORTEIO` do sorteio cego — é o mesmo
 * alinhamento de cursor que o teste de M5 faz com o `int(2)` de `D-48`. Pular assim só vale
 * porque um `int()` avança o gerador exatamente um passo qualquer que seja o argumento
 * (propriedade de M1, com teste próprio na suíte de M8).
 */
function oraculo(quantas: number, invertida: boolean): Placar[] {
  const rng = createRng(SEED);
  for (let i = 0; i < SORTEIOS_DO_SORTEIO; i += 1) rng.int(2);

  const placares: Placar[] = [];
  for (let i = 0; i < quantas; i += 1) placares.push(simular(rng, invertida));
  return placares;
}

/** As disputas já simuladas, lidas do retrato — a única saída observável de `simular`. */
function simuladas(): Placar[] {
  const t = createTournament({ entrants: CODES, human: HUMANO, level: NIVEL, seed: SEED });
  const s = t.toJSON();
  return s.results.map((vencedor, i) => ({
    vencedor,
    golsA: s.goalsA[i] ?? -1,
    golsB: s.goalsB[i] ?? -1,
  }));
}

describe('M8 — a ordem `pick` → `observe` na disputa simulada (`D-103` / `QA-44`)', () => {
  it('o goleiro simulado escolhe pelo histórico ANTERIOR, nunca lendo o chute em curso', () => {
    const real = simuladas();

    // Liga/desliga do próprio teste, parte 1: sem disputa simulada não há nada sob teste, e as
    // asserções de baixo passariam comparando duas listas vazias.
    expect(
      real.length,
      'esta semente não simula nenhuma disputa antes da do jogador',
    ).toBeGreaterThan(0);

    const certa = oraculo(real.length, false);
    const invertida = oraculo(real.length, true);

    // Liga/desliga, parte 2: se um dia as duas ordens virarem indiferentes para esta semente, é
    // esta linha que reprova — em vez de deixar as de baixo passarem para sempre sem pegar nada.
    expect(
      JSON.stringify(certa),
      'as duas ordens dão o mesmo placar nesta semente: as asserções seguintes não reprovariam a inversão',
    ).not.toBe(JSON.stringify(invertida));

    expect(real).toEqual(certa);
    expect(
      JSON.stringify(real),
      'M8 está observando antes de escolher: o goleiro simulado leu o chute desta mesma cobrança (`D-103`)',
    ).not.toBe(JSON.stringify(invertida));
  });
});
