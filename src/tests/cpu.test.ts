import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createRng, type Rng } from '../core/index';
import {
  CEILING_PPM,
  complementCounts,
  createCpu,
  zoneDistributionPpm,
  type Cpu,
  type Level,
  type Role,
} from '../cpu/index';
import type { Zone } from '../core/index';

const ZONAS: readonly Zone[] = ['L', 'C', 'R'];
const NIVEIS: readonly Level[] = ['easy', 'medium', 'hard'];
const PAPEIS: readonly Role[] = ['shooter', 'keeper'];

/** Histograma como o contrato o recebe. */
function counts(l: number, c: number, r: number): Record<Zone, number> {
  return { L: l, C: c, R: r };
}

/** Frequência de cada zona em `n` chamadas de `pick(role)`. */
function frequencias(cpu: Cpu, role: Role, n: number): Record<Zone, number> {
  const contagem: Record<Zone, number> = { L: 0, C: 0, R: 0 };
  for (let i = 0; i < n; i += 1) contagem[cpu.pick(role)] += 1;
  return { L: contagem.L / n, C: contagem.C / n, R: contagem.R / n };
}

/** CPU com `n` observações da mesma zona no papel dado. */
function cpuViciada(level: Level, role: Role, zone: Zone, n: number, rng: Rng): Cpu {
  const cpu = createCpu(level, rng);
  for (let i = 0; i < n; i += 1) cpu.observe(role, zone);
  return cpu;
}

/** O papel do outro lado da cobrança. */
function outroPapel(role: Role): Role {
  return role === 'shooter' ? 'keeper' : 'shooter';
}

/**
 * CPU que vai jogar em `role` e cujo ADVERSÁRIO humano repetiu `zone` `n` vezes.
 *
 * Existe por causa de `D-103` (`Q-08` saída C): `pick(role)` lê o histograma do papel
 * adversário, então semear o próprio papel — o que a suíte de `T-07` fazia — deixaria de
 * medir o que o teste diz medir e passaria a medir o ramo uniforme.
 */
function cpuContraHumanoViciado(
  level: Level,
  role: Role,
  zone: Zone,
  n: number,
  rng: Rng,
): Cpu {
  return cpuViciada(level, outroPapel(role), zone, n, rng);
}

/**
 * Margem de 4 desvios-padrão de uma binomial(n, p).
 *
 * Existe porque no nível difícil, com o histórico concentrado, a probabilidade verdadeira
 * é EXATAMENTE 0,70 — e a frequência medida sobre n sorteios oscila em torno dela, para
 * cima metade das vezes. Exigir `medida <= 0,70` seco reprovaria uma implementação certa
 * em ~50% das execuções. O teto sem tolerância nenhuma é conferido no bloco "exato",
 * sobre a distribuição em ppm; aqui se confere que a frequência bate com essa distribuição.
 */
function margem4Sigma(n: number, p: number): number {
  return 4 * Math.sqrt((p * (1 - p)) / n);
}

describe('M3 · histórico vazio — uniforme em qualquer nível', () => {
  it.each(NIVEIS)('a distribuição de %s é 1/3 exata, sem sorteio nenhum', (level) => {
    // Não sobra unidade fora de lugar: 1.000.000 não divide por 3, e o resto tem de cair
    // num lugar declarado, não onde o arredondamento deixar.
    expect(zoneDistributionPpm(level, counts(0, 0, 0))).toEqual([333_334, 333_333, 333_333]);
  });

  it.each(NIVEIS)('a primeira cobrança de %s sorteia sem viés medido', (level) => {
    const n = 60_000;
    const f = frequencias(createCpu(level, createRng(20260807)), 'shooter', n);
    const margem = margem4Sigma(n, 1 / 3);

    for (const z of ZONAS) expect(Math.abs(f[z] - 1 / 3)).toBeLessThanOrEqual(margem);
  });

  it('as duas primeiras cobranças de níveis diferentes têm a mesma distribuição', () => {
    const facil = zoneDistributionPpm('easy', counts(0, 0, 0));

    for (const level of NIVEIS) {
      expect(zoneDistributionPpm(level, counts(0, 0, 0))).toEqual(facil);
    }
  });
});

describe('M3 · teto absoluto de 70% (D-10) — exato, sem tolerância', () => {
  it('difícil com histórico todo numa zona dá 70%, NÃO os 80% da mistura crua', () => {
    // A armadilha nomeada no contrato de M3: 0,70 + 0,30/3 = 0,80. Se este teste virar
    // 800_000, o teto foi escrito como peso da mistura em vez de corte próprio.
    expect(zoneDistributionPpm('hard', counts(10, 0, 0))).toEqual([700_000, 150_000, 150_000]);
  });

  it('nenhuma zona passa do teto, em 3 níveis × 1.000 formatos de histograma', () => {
    for (const level of NIVEIS) {
      for (let l = 0; l < 10; l += 1) {
        for (let c = 0; c < 10; c += 1) {
          for (let r = 0; r < 10; r += 1) {
            const dist = zoneDistributionPpm(level, counts(l, c, r));

            expect(Math.max(...dist)).toBeLessThanOrEqual(CEILING_PPM);
            expect(dist[0] + dist[1] + dist[2]).toBe(1_000_000);
            for (const p of dist) expect(Number.isInteger(p)).toBe(true);
          }
        }
      }
    }
  });

  it('histórico gigante numa zona só não empurra o teto para cima', () => {
    // 10.000 cobranças na mesma zona é o pior caso do peso: se o teto dependesse do
    // tamanho do histórico em vez de ser corte fixo, apareceria aqui.
    for (const level of NIVEIS) {
      expect(Math.max(...zoneDistributionPpm(level, counts(10_000, 0, 0)))).toBeLessThanOrEqual(
        CEILING_PPM,
      );
    }
  });

  it('duas zonas repetidas em bloco também respeitam o teto', () => {
    expect(Math.max(...zoneDistributionPpm('hard', counts(50, 50, 0)))).toBeLessThanOrEqual(
      CEILING_PPM,
    );
    expect(Math.max(...zoneDistributionPpm('medium', counts(0, 99, 1)))).toBeLessThanOrEqual(
      CEILING_PPM,
    );
  });

  // ── O caminho de quem COBRA (`D-103`) ────────────────────────────────────────────────
  // A varredura acima cobre a mistura. Depois de `Q-08`, quem cobra passa por MAIS uma
  // etapa antes dela — o complemento —, e teto conferido só antes da etapa nova não é teto.

  it('nenhuma zona passa do teto no caminho de quem cobra, em 3 níveis × 1.000 histogramas', () => {
    for (const level of NIVEIS) {
      for (let l = 0; l < 10; l += 1) {
        for (let c = 0; c < 10; c += 1) {
          for (let r = 0; r < 10; r += 1) {
            const dist = zoneDistributionPpm(level, complementCounts(counts(l, c, r)));

            expect(Math.max(...dist)).toBeLessThanOrEqual(CEILING_PPM);
            expect(dist[0] + dist[1] + dist[2]).toBe(1_000_000);
            for (const p of dist) expect(Number.isInteger(p)).toBe(true);
          }
        }
      }
    }
  });

  it('quem cobra nunca passa de 45%: o complemento não alcança o teto, e isso é medido', () => {
    // `c'[z]/total' = (total − c[z])/(2·total) <= 1/2` ⇒ p <= 0,7·0,5 + 0,3/3 = 45%.
    // O +1 é a unidade de resto que o arredondamento pode empurrar para a maior zona.
    for (const level of NIVEIS) {
      for (let l = 0; l < 10; l += 1) {
        for (let c = 0; c < 10; c += 1) {
          for (let r = 0; r < 10; r += 1) {
            const dist = zoneDistributionPpm(level, complementCounts(counts(l, c, r)));
            expect(Math.max(...dist)).toBeLessThanOrEqual(450_001);
          }
        }
      }
    }
  });

  it('o complemento é `total − c[z]`, e o histórico vazio continua vazio', () => {
    expect(complementCounts(counts(10, 0, 0))).toEqual(counts(0, 10, 10));
    expect(complementCounts(counts(0, 0, 0))).toEqual(counts(0, 0, 0));
    expect(complementCounts(counts(5, 3, 2))).toEqual(counts(5, 7, 8));
    // Empatado entra empatado: sem preferência inventada onde o humano não teve nenhuma.
    expect(complementCounts(counts(4, 4, 4))).toEqual(counts(8, 8, 8));
  });

  it('histórico vazio ⇒ quem cobra também sorteia uniforme, em qualquer nível', () => {
    for (const level of NIVEIS) {
      expect(zoneDistributionPpm(level, complementCounts(counts(0, 0, 0)))).toEqual([
        333_334, 333_333, 333_333,
      ]);
    }
  });

  it('complemento recusa contagem que não seja inteiro >= 0', () => {
    expect(() => complementCounts(counts(-1, 0, 0))).toThrow(RangeError);
    expect(() => complementCounts(counts(1.5, 0, 0))).toThrow(RangeError);
    expect(() => complementCounts(counts(Number.NaN, 0, 0))).toThrow(RangeError);
  });
});

describe('M3 · teto de 70% medido por frequência, em cada papel', () => {
  // O portão do PLANO manda MEDIR, e não conferir a fórmula no olho: é a frequência sobre
  // milhares de sorteios que pega uma mistura errada que o código esconde.
  const N = 60_000;

  it.each(PAPEIS)('%s: repetindo a mesma zona, a CPU nunca a acerta acima de 70%%', (role) => {
    for (const level of NIVEIS) {
      const cpu = cpuContraHumanoViciado(level, role, 'L', 200, createRng(11));
      const f = frequencias(cpu, role, N);

      for (const z of ZONAS) expect(f[z]).toBeLessThanOrEqual(0.7 + margem4Sigma(N, 0.7));
    }
  });

  it('keeper: no difícil a frequência medida encosta em 70%, e não em 80%', () => {
    // Quem defende se APROXIMA da zona mais chutada pelo humano (`D-103`): é este lado que
    // alcança o teto, e é aqui que a armadilha 0,70 + 0,30/3 = 0,80 do contrato é cobrada.
    const cpu = cpuContraHumanoViciado('hard', 'keeper', 'C', 200, createRng(12));
    const f = frequencias(cpu, 'keeper', N);

    // 0,80 fica a ~53 desvios daqui: a armadilha do contrato reprova sem ambiguidade.
    expect(Math.abs(f.C - 0.7)).toBeLessThanOrEqual(margem4Sigma(N, 0.7));
  });

  it('shooter: no difícil a CPU FOGE da zona mais defendida — 10%, não 70%', () => {
    // O outro lado de `D-103`, e o motivo de a saída (C) não ser o swap de índice: com o
    // complemento, o humano que sempre defende C vê a CPU chutar C de menos, não de mais.
    // Se este teste medir ~0,70 em `f.C`, o complemento sumiu e a CPU voltou a chutar em
    // cima do goleiro — que é exatamente o defeito da saída (B).
    const cpu = cpuContraHumanoViciado('hard', 'shooter', 'C', 200, createRng(12));
    const f = frequencias(cpu, 'shooter', N);

    // complemento [200,0,200] sobre total' = 400 ⇒ C = 0,3/3 = 0,10; L = R = 0,7·0,5 + 0,10.
    expect(Math.abs(f.C - 0.1)).toBeLessThanOrEqual(margem4Sigma(N, 0.1));
    expect(Math.abs(f.L - 0.45)).toBeLessThanOrEqual(margem4Sigma(N, 0.45));
    expect(Math.abs(f.R - 0.45)).toBeLessThanOrEqual(margem4Sigma(N, 0.45));
  });

  it.each(PAPEIS)('%s: o fácil ignora o histórico e continua uniforme (é a v1)', (role) => {
    const cpu = cpuContraHumanoViciado('easy', role, 'R', 500, createRng(13));
    const f = frequencias(cpu, role, N);

    for (const z of ZONAS) expect(Math.abs(f[z] - 1 / 3)).toBeLessThanOrEqual(margem4Sigma(N, 1 / 3));
  });

  it('keeper: o médio fica entre o fácil e o difícil, medido', () => {
    const medir = (level: Level): number =>
      frequencias(cpuContraHumanoViciado(level, 'keeper', 'L', 200, createRng(14)), 'keeper', N)
        .L;

    const facil = medir('easy');
    const medio = medir('medium');
    const dificil = medir('hard');

    expect(medio).toBeGreaterThan(facil);
    expect(dificil).toBeGreaterThan(medio);
    expect(dificil).toBeLessThanOrEqual(0.7 + margem4Sigma(N, 0.7));
  });

  it('shooter: o médio fica entre o fácil e o difícil — para BAIXO, que é fugir mais', () => {
    // Mesma escada, sentido oposto: subir o nível afasta mais quem cobra da zona defendida.
    // Se as duas escadas apontassem para o mesmo lado, um dos papéis estaria lendo errado.
    const medir = (level: Level): number =>
      frequencias(
        cpuContraHumanoViciado(level, 'shooter', 'L', 200, createRng(14)),
        'shooter',
        N,
      ).L;

    const facil = medir('easy');
    const medio = medir('medium');
    const dificil = medir('hard');

    expect(medio).toBeLessThan(facil);
    expect(dificil).toBeLessThan(medio);
    expect(dificil).toBeGreaterThanOrEqual(0);
  });
});

describe('M3 · dois histogramas — cada papel lê o do ADVERSÁRIO, e só ele (D-103)', () => {
  // Este bloco é o que `Q-08` virou de cabeça para baixo. Até `D-103` ele cobrava o oposto
  // ("encher shooter não muda pick(keeper)"), porque `pick` lia o próprio papel. Agora
  // encher `shooter` TEM de mover `pick('keeper')` — é a entrada dele —, e continua não
  // podendo mover `pick('shooter')`. Trocar a leitura sem trocar estes testes deixaria a
  // suíte verde sobre a semântica velha.
  const semear = (
    seed: number,
    papelHumano: Role | null,
    zone: Zone,
    papelCpu: Role,
  ): Record<Zone, number> => {
    const cpu = createCpu('hard', createRng(seed));
    if (papelHumano !== null) {
      for (let i = 0; i < 300; i += 1) cpu.observe(papelHumano, zone);
    }
    return frequencias(cpu, papelCpu, 30_000);
  };

  it('encher shooter de L MUDA a distribuição de pick(keeper)', () => {
    expect(semear(99, 'shooter', 'L', 'keeper')).not.toEqual(semear(99, null, 'L', 'keeper'));
  });

  it('encher shooter de L não muda a distribuição de pick(shooter)', () => {
    // Mesma semente e mesmo número de sorteios: se os histogramas se misturassem, as duas
    // séries divergiriam. Igualdade exata, porque o sorteio é determinístico.
    expect(semear(99, 'shooter', 'L', 'shooter')).toEqual(semear(99, null, 'L', 'shooter'));
  });

  it('encher keeper de R MUDA a distribuição de pick(shooter)', () => {
    expect(semear(98, 'keeper', 'R', 'shooter')).not.toEqual(semear(98, null, 'R', 'shooter'));
  });

  it('encher keeper de R não muda a distribuição de pick(keeper)', () => {
    expect(semear(98, 'keeper', 'R', 'keeper')).toEqual(semear(98, null, 'R', 'keeper'));
  });

  it('humano que sempre chuta L e sempre defende R: a CPU cobre o L e foge do R', () => {
    const cpu = createCpu('hard', createRng(97));
    for (let i = 0; i < 200; i += 1) {
      cpu.observe('shooter', 'L');
      cpu.observe('keeper', 'R');
    }

    const fShooter = frequencias(cpu, 'shooter', 40_000);
    const fKeeper = frequencias(cpu, 'keeper', 40_000);

    // Defendendo: encosta no teto sobre a zona mais chutada.
    expect(Math.abs(fKeeper.L - 0.7)).toBeLessThanOrEqual(margem4Sigma(40_000, 0.7));
    // Cobrando: complemento de [0,0,200] = [200,200,0] ⇒ R cai a 10%, L e C ficam em 45%.
    expect(Math.abs(fShooter.R - 0.1)).toBeLessThanOrEqual(margem4Sigma(40_000, 0.1));
    expect(fShooter.L + fShooter.C).toBeGreaterThan(fShooter.R);
  });
});

describe('M3 · determinismo (mesma semente + mesmas entradas = mesmas escolhas)', () => {
  /** Roteiro fixo: observa e escolhe intercalado, nos dois papéis. */
  function roteiro(semente: number): Zone[] {
    const cpu = createCpu('hard', createRng(semente));
    const saida: Zone[] = [];
    const entradas: Zone[] = ['L', 'L', 'C', 'L', 'R', 'C', 'L', 'L'];

    for (const [i, zona] of entradas.entries()) {
      const papel: Role = i % 2 === 0 ? 'shooter' : 'keeper';
      cpu.observe(papel, zona);
      saida.push(cpu.pick(papel));
      saida.push(cpu.pick(papel === 'shooter' ? 'keeper' : 'shooter'));
    }
    return saida;
  }

  it('duas execuções do mesmo roteiro dão a mesma sequência de escolhas', () => {
    expect(roteiro(2026)).toEqual(roteiro(2026));
  });

  it('sementes diferentes dão sequências diferentes', () => {
    expect(roteiro(2026)).not.toEqual(roteiro(2027));
  });

  it('cada pick consome exatamente 1 valor do Rng', () => {
    // Se `pick` gastasse 2 sorteios, a CPU dessincronizaria do resto do motor quando M5
    // passasse o MESMO Rng para os dois — e o determinismo da disputa cairia junto.
    let chamadas = 0;
    const base = createRng(5);
    const espiao: Rng = {
      int: (max: number) => {
        chamadas += 1;
        return base.int(max);
      },
    };
    const cpu = createCpu('medium', espiao);

    cpu.observe('shooter', 'L');
    for (let i = 0; i < 25; i += 1) cpu.pick('shooter');

    expect(chamadas).toBe(25);
  });

  it('observe não consome sorteio nenhum', () => {
    let chamadas = 0;
    const base = createRng(6);
    const espiao: Rng = {
      int: (max: number) => {
        chamadas += 1;
        return base.int(max);
      },
    };
    const cpu = createCpu('hard', espiao);

    for (let i = 0; i < 50; i += 1) cpu.observe('keeper', 'C');

    expect(chamadas).toBe(0);
  });
});

describe('M3 · bordas e entrada inválida', () => {
  it('pick sempre devolve uma das três zonas', () => {
    const cpu = createCpu('hard', createRng(1));
    for (let i = 0; i < 500; i += 1) {
      cpu.observe('shooter', 'L');
      expect(ZONAS).toContain(cpu.pick('shooter'));
    }
  });

  it('nível inválido é recusado na criação, não na primeira escolha', () => {
    expect(() => createCpu('impossivel' as Level, createRng(1))).toThrow(TypeError);
  });

  it('rng ausente ou sem int() é recusado', () => {
    expect(() => createCpu('easy', null as unknown as Rng)).toThrow(TypeError);
    expect(() => createCpu('easy', {} as unknown as Rng)).toThrow(TypeError);
  });

  it('papel inválido é recusado em observe e em pick', () => {
    const cpu = createCpu('easy', createRng(1));

    expect(() => cpu.observe('goleiro' as Role, 'L')).toThrow(TypeError);
    expect(() => cpu.pick('goleiro' as Role)).toThrow(TypeError);
  });

  it('zona inválida é recusada em observe', () => {
    const cpu = createCpu('easy', createRng(1));

    expect(() => cpu.observe('shooter', 'X' as Zone)).toThrow(TypeError);
    expect(() => cpu.observe('shooter', '' as Zone)).toThrow(TypeError);
  });

  it('contagem negativa ou fracionária é recusada pela distribuição', () => {
    expect(() => zoneDistributionPpm('hard', counts(-1, 0, 0))).toThrow(RangeError);
    expect(() => zoneDistributionPpm('hard', counts(1.5, 0, 0))).toThrow(RangeError);
  });

  it('duas instâncias não compartilham histórico', () => {
    const a = createCpu('hard', createRng(3));
    const b = createCpu('hard', createRng(3));
    for (let i = 0; i < 300; i += 1) a.observe('shooter', 'L');

    // `b` nunca observou nada: continua uniforme, e nada nele mudou por causa de `a`.
    const f = frequencias(b, 'shooter', 30_000);
    expect(Math.abs(f.L - 1 / 3)).toBeLessThanOrEqual(margem4Sigma(30_000, 1 / 3));
  });
});

describe('M3 · checagem de camada (portão de E-2)', () => {
  // Agulhas montadas em tempo de execução: escritas literais, apareceriam na varredura e o
  // próprio teste reprovaria o portão que verifica. Mesmo motivo de `core.test.ts`.
  const PROIBIDOS = [
    ['local', 'Storage'].join(''),
    ['session', 'Storage'].join(''),
    ['Date', 'now'].join('.'),
  ];
  const CPU_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'cpu');

  function varrer(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome);
      return statSync(caminho).isDirectory() ? varrer(caminho) : [caminho];
    });
  }

  it.each(PROIBIDOS)('src/cpu/ não contém %s', (agulha) => {
    const fontes = varrer(CPU_DIR).map((caminho) => readFileSync(caminho, 'utf8'));

    expect(fontes.join('\n').split(agulha)).toHaveLength(1);
  });

  it('M3 importa só M1 — nada de M2, de Phaser ou de fora', () => {
    const fontes = varrer(CPU_DIR).map((caminho) => readFileSync(caminho, 'utf8'));
    const imports = fontes.flatMap((src) => [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]));

    expect(imports).toEqual(['../core/index']);
  });
});
