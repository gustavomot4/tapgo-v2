import { describe, expect, it } from 'vitest';

// Este arquivo compara o que M5 FAZ com o que dois oráculos independentes DIRIAM, e por isso
// importa M3 e M1 de verdade — nenhum dublê no caminho. O oráculo não é uma cópia da regra da
// CPU: ele chama a mesma `createCpu`, com o mesmo `Rng` semeado igual. O que ele reconstrói é
// só a ORDEM das duas chamadas, que é justamente o que está sob teste.
import { createCpu } from '../cpu/index';
import type { Role } from '../cpu/index';
import { createRng } from '../core/index';
import type { Side, Zone } from '../core/index';
import { createSession } from '../session/index';
import type { Level, SessionConfig } from '../session/index';

/** Códigos da lista de fixação de M4 (`T-08`) — irrelevantes para a ordem, mas exigidos. */
const BR = 'BR';
const AR = 'AR';

const SEED = 7;
const NIVEL: Level = 'hard';
const LADO: Side = 'A';

/**
 * O roteiro do humano. Fixo e escrito à mão: o que este teste precisa é de um histórico que
 * DESEMPATE as duas ordens, e sorteá-lo deixaria o desempate ao acaso da semente.
 */
const ROTEIRO: readonly Zone[] = ['L', 'L', 'R', 'L', 'C', 'L', 'R', 'L', 'L', 'C'];

function cfg(): SessionConfig {
  return { mode: 'cpu', seed: SEED, level: NIVEL, teams: { A: BR, B: AR }, localSide: LADO };
}

function outro(papel: Role): Role {
  return papel === 'shooter' ? 'keeper' : 'shooter';
}

/**
 * Roda a disputa e devolve, cobrança a cobrança, a zona que a CPU escolheu — e as duas zonas
 * que os oráculos previam.
 *
 * Os dois oráculos consomem exatamente 1 valor do `Rng` por cobrança, como `pick` (contrato de
 * M3), e nascem de sementes iguais. Então o sorteio `r` de cada cobrança é o MESMO nos dois: o
 * que muda entre eles é só o histograma lido na hora do `pick`. É isso que faz a diferença
 * entre as duas listas ser prova da ordem, e não do gerador.
 */
function correr(): { real: Zone[]; certa: Zone[]; invertida: Zone[] } {
  const s = createSession(cfg());

  // Cada oráculo tem gerador próprio, semeado igual. O primeiro `int(2)` é o sorteio de quem
  // cobra primeiro (`D-48`), que M5 faz ANTES de criar a CPU — pular esse valor aqui é o que
  // alinha os cursores dos três geradores.
  const rngCerta = createRng(SEED);
  rngCerta.int(2);
  const cpuCerta = createCpu(NIVEL, rngCerta);

  const rngInvertida = createRng(SEED);
  rngInvertida.int(2);
  const cpuInvertida = createCpu(NIVEL, rngInvertida);

  const real: Zone[] = [];
  const certa: Zone[] = [];
  const invertida: Zone[] = [];

  for (const zona of ROTEIRO) {
    if (s.state().phase === 'finished') break;

    const meu: Role = s.state().turn === LADO ? 'shooter' : 'keeper';
    const dela = outro(meu);

    // A ordem que `D-103` tornou obrigatória: escolher, depois observar.
    certa.push(cpuCerta.pick(dela));
    cpuCerta.observe(meu, zona);

    // A inversão que o comentário de `QA-44` avisa que continuaria rodando: observar o chute
    // desta mesma cobrança e só então escolher.
    cpuInvertida.observe(meu, zona);
    invertida.push(cpuInvertida.pick(dela));

    s.choose(zona);

    const kicks = s.state().kicks;
    const ultima = kicks[kicks.length - 1];
    if (ultima === undefined) throw new Error('M5 não registrou a cobrança');
    real.push(meu === 'shooter' ? ultima.dive : ultima.shot);
  }

  return { real, certa, invertida };
}

describe('M5 — a ordem `pick` → `observe` no modo cpu (`D-103` / `QA-44`)', () => {
  it('a CPU escolhe pelo histórico ANTERIOR à cobrança, nunca incluindo o chute em curso', () => {
    const { real, certa, invertida } = correr();

    // Primeiro o liga/desliga do PRÓPRIO teste: se um dia a regra de M3 mudar e as duas ordens
    // voltarem a ser indiferentes para este roteiro, é esta linha que reprova — em vez de deixar
    // as duas de baixo passarem para sempre sem pegar nada.
    expect(certa.length).toBeGreaterThan(0);
    expect(
      certa.join(''),
      'as duas ordens produzem a mesma sequência neste roteiro: as asserções seguintes não reprovariam a inversão',
    ).not.toBe(invertida.join(''));

    expect(real.join('')).toBe(certa.join(''));
    expect(
      real.join(''),
      'M5 está observando antes de escolher: a CPU no gol leu o chute desta mesma cobrança (`D-103`)',
    ).not.toBe(invertida.join(''));
  });
});
