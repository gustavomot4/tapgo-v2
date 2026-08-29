import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createRng, newSeed, type Rng } from '../core/index';
import { NOME_PLANTADO } from './lista_morta';

/** Coleta `n` valores de `int(max)`. */
function draw(rng: Rng, n: number, max: number): number[] {
  return Array.from({ length: n }, () => rng.int(max));
}

describe('M1 · createRng — determinismo', () => {
  it('duas instâncias com a mesma semente dão a mesma sequência de 1.000 valores', () => {
    const a = draw(createRng(7), 1000, 100);
    const b = draw(createRng(7), 1000, 100);

    expect(a).toEqual(b);
    expect(a).toHaveLength(1000);
  });

  it('a segunda leitura da mesma instância avança o cursor (não repete o valor)', () => {
    const rng = createRng(7);
    const serie = draw(rng, 200, 1_000_000);

    expect(new Set(serie).size).toBeGreaterThan(1);
  });

  it('sementes diferentes dão sequências diferentes', () => {
    expect(draw(createRng(7), 100, 1000)).not.toEqual(draw(createRng(8), 100, 1000));
  });

  it('sementes congruentes módulo 2^32 são a mesma semente (limite declarado)', () => {
    expect(draw(createRng(0), 50, 1000)).toEqual(draw(createRng(2 ** 32), 50, 1000));
    expect(draw(createRng(-1), 50, 1000)).toEqual(draw(createRng(2 ** 32 - 1), 50, 1000));
  });
});

describe('M1 · Rng.int — regressão do defeito 3 da v1', () => {
  // v1: `<nativo>() * 7 + 1` nunca sorteava o índice 0 e assumia 8 times fixos.
  it('int(3) sorteia 0, 1 e 2 — com o 0 incluso', () => {
    const sorteados = new Set(draw(createRng(7), 300, 3));

    expect(sorteados).toEqual(new Set([0, 1, 2]));
    expect(sorteados.has(0)).toBe(true);
  });

  it('int(8) cobre os 8 índices, do 0 ao 7', () => {
    const sorteados = new Set(draw(createRng(7), 1000, 8));

    expect([...sorteados].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('o 0 aparece com qualquer semente, não só com a 7', () => {
    for (const seed of [0, 1, 42, 999, 2 ** 31]) {
      expect(draw(createRng(seed), 300, 3)).toContain(0);
    }
  });
});

describe('M1 · Rng.int — faixa e bordas', () => {
  it('o resultado é sempre inteiro dentro de [0, max)', () => {
    const rng = createRng(7);

    for (const max of [1, 2, 3, 5, 8, 100, 1_000_000]) {
      for (const valor of draw(rng, 500, max)) {
        expect(Number.isInteger(valor)).toBe(true);
        expect(valor).toBeGreaterThanOrEqual(0);
        expect(valor).toBeLessThan(max);
      }
    }
  });

  it('int(1) devolve sempre 0', () => {
    expect(new Set(draw(createRng(7), 200, 1))).toEqual(new Set([0]));
  });

  it('max inválido falha alto — nunca devolve 0 nem NaN em silêncio', () => {
    const rng = createRng(7);

    for (const max of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
      expect(() => rng.int(max)).toThrow(RangeError);
    }
  });
});

describe('M1 · createRng — validação da semente', () => {
  it('semente que não é inteiro seguro falha alto', () => {
    for (const seed of [1.5, NaN, Infinity, -Infinity, 2 ** 53]) {
      expect(() => createRng(seed)).toThrow(TypeError);
    }
  });

  it('inteiro seguro é aceito, inclusive negativo e zero', () => {
    for (const seed of [0, -1, 7, 2 ** 32 - 1, Number.MAX_SAFE_INTEGER]) {
      expect(() => createRng(seed)).not.toThrow();
    }
  });
});

describe('M1 · newSeed', () => {
  it('devolve inteiro em [0, 2^32)', () => {
    for (let i = 0; i < 1000; i += 1) {
      const seed = newSeed();

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });

  it('varia entre chamadas', () => {
    const seeds = new Set(Array.from({ length: 100 }, () => newSeed()));

    expect(seeds.size).toBeGreaterThan(1);
  });

  it('o que ele devolve é semente válida para createRng', () => {
    const seed = newSeed();

    expect(draw(createRng(seed), 100, 3)).toEqual(draw(createRng(seed), 100, 3));
  });
});

describe('M1 · checagem de camada (portão de E-1)', () => {
  // A agulha é montada em tempo de execução de propósito: escrita literal aqui, ela
  // apareceria na varredura e o próprio teste reprovaria o portão que verifica.
  const AGULHA = ['Math', 'random'].join('.');
  const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  // `NOME_PLANTADO` é o arquivo que `marca.test.ts` cria e apaga dentro de um caso de teste
  // (`QA-05`). Os dois arquivos rodam em paralelo, e sem ignorá-lo esta varredura poderia listar
  // um caminho e tentar lê-lo depois de apagado — teste instável, não portão. Ele nunca contém
  // agulha de M1, e nunca sobrevive ao caso que o cria.
  const IGNORAR = new Set(['node_modules', 'dist', '.git', NOME_PLANTADO]);

  function varrer(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      if (IGNORAR.has(nome)) return [];
      const caminho = join(dir, nome);
      return statSync(caminho).isDirectory() ? varrer(caminho) : [caminho];
    });
  }

  it('o gerador nativo é chamado exatamente 1 vez em src/, e é dentro de M1', () => {
    const ocorrencias = varrer(SRC).flatMap((caminho) => {
      const n = readFileSync(caminho, 'utf8').split(AGULHA).length - 1;
      return Array.from({ length: n }, () => caminho);
    });

    expect(ocorrencias).toHaveLength(1);
    expect(ocorrencias[0]?.replace(/\\/g, '/')).toMatch(/\/core\/index\.ts$/);
  });
});
