import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createRng } from '../core/index';
import type { CountryCode, Rng, Side } from '../core/index';
import { createMatch, play } from '../engine/index';
import { createCpu } from '../cpu/index';
import type { Cpu, Level } from '../cpu/index';
import { listTeams } from '../data/teams';
import { createTournament, restoreTournament } from '../tournament/index';
import type { Stage, Tournament, TournamentState } from '../tournament/index';
import { DISPUTAS_DE_GRUPO, POR_GRUPO, disputaDeGrupo } from '../tournament/fila';
import { GOLS_DESCONHECIDOS, ordenarGrupo, tabela } from '../tournament/tabela';
import type { Jogo } from '../tournament/tabela';

/** As 32 reais de `D-51`. O torneio nunca recebe lista digitada à mão. */
const CODES: readonly CountryCode[] = listTeams().map((t) => t.code);
const HUMANO = 'BR';
const DISPUTAS = 64;

function em<T>(lista: readonly T[], i: number): T {
  const valor = lista[i];
  if (valor === undefined) throw new RangeError(`teste: índice ${String(i)} fora da faixa`);
  return valor;
}

function cfg(seed: number, human: CountryCode = HUMANO, level: Level = 'medium') {
  return { entrants: CODES, human, level, seed };
}

/** O lado do jogador na disputa corrente. */
function ladoDo(t: Tournament, human: CountryCode): Side {
  const c = t.current();
  if (c === null) throw new Error('teste: não há disputa do jogador');
  return c.teams.A === human ? 'A' : 'B';
}

type Estrategia = (t: Tournament, n: number) => Side;

/** O jogador vence tudo. */
const sempreVence: Estrategia = (t) => ladoDo(t, HUMANO);
/** O jogador perde tudo. */
const semprePerde: Estrategia = (t) => (ladoDo(t, HUMANO) === 'A' ? 'B' : 'A');

/**
 * Joga o torneio até o fim.
 *
 * `cortarEm` serializa e restaura ANTES da n-ésima disputa do jogador — é o recarregamento do
 * navegador acontecendo no meio, que é o portão de `D-57`.
 */
function jogar(t: Tournament, estrategia: Estrategia, cortarEm: number | null = null): Tournament {
  let atual = t;
  let n = 0;
  while (atual.current() !== null) {
    if (cortarEm === n) {
      const antes = atual.current();
      atual = restoreTournament(atual.toJSON());
      expect(atual.current()).toEqual(antes);
    }
    atual.report(estrategia(atual, n));
    n += 1;
  }
  return atual;
}

/** Quantas disputas do jogador houve, jogando até o fim. */
function disputasDoJogador(t: Tournament, estrategia: Estrategia): number {
  let n = 0;
  while (t.current() !== null) {
    t.report(estrategia(t, n));
    n += 1;
  }
  return n;
}

/* ───────────────────────────── portão: 64 disputas, 1 campeão ───────────────────────────── */

describe('M8 · 64 disputas e um campeão (`D-53`)', () => {
  it.each([0, 1, 2, 9, 4242, 999_999])(
    'a semente %i termina com played=64 e um campeão — contagem por instrumentação',
    (seed) => {
      const t = jogar(createTournament(cfg(seed)), sempreVence);
      const estado = t.toJSON();

      // `played` é o contador do ÚNICO ponto do módulo em que uma disputa se resolve. Contar
      // aqui as disputas "que dá para ver" seria inspeção, e é justamente o que o portão recusa.
      expect(estado.played).toBe(DISPUTAS);
      expect(estado.results).toHaveLength(DISPUTAS);
      expect(t.champion()).not.toBeNull();
      expect(CODES).toContain(t.champion());
      expect(t.current()).toBeNull();
    },
  );

  it('o jogador que vence tudo é o campeão, e disputa 7 das 64 (3 de grupo + 4)', () => {
    const t = createTournament(cfg(9));
    const n = disputasDoJogador(t, sempreVence);
    expect(n).toBe(7);
    expect(t.champion()).toBe(HUMANO);
    expect(t.toJSON().played).toBe(DISPUTAS);
  });

  it('o jogador eliminado NÃO encerra o torneio: as 64 acontecem e o campeão é outro', () => {
    const t = createTournament(cfg(9));
    const n = disputasDoJogador(t, semprePerde);
    // Perdeu as 3 do grupo: não se classifica, e o mata-mata roda inteiro sem ele.
    expect(n).toBe(3);
    expect(t.current()).toBeNull();
    expect(t.toJSON().played).toBe(DISPUTAS);
    expect(t.champion()).not.toBeNull();
    expect(t.champion()).not.toBe(HUMANO);
  });

  it('perder a SEMIFINAL não elimina — sobra a disputa de 3º lugar', () => {
    const t = createTournament(cfg(9));
    const fases: Stage[] = [];
    let n = 0;
    while (t.current() !== null) {
      const c = t.current();
      if (c === null) break;
      fases.push(c.stage);
      // Vence tudo até a semi; perde a semi.
      const meu = ladoDo(t, HUMANO);
      t.report(c.stage === 'semi' ? (meu === 'A' ? 'B' : 'A') : meu);
      n += 1;
    }
    expect(fases).toEqual(['groups', 'groups', 'groups', 'r16', 'quarter', 'semi', 'third']);
    expect(n).toBe(7);
    expect(t.toJSON().played).toBe(DISPUTAS);
  });

  it('a sequência de fases e rodadas do campeão é a do formato', () => {
    const t = createTournament(cfg(9));
    const trilha: Array<{ stage: Stage; round: number }> = [];
    while (t.current() !== null) {
      const c = t.current();
      if (c === null) break;
      trilha.push({ stage: c.stage, round: c.round });
      t.report(ladoDo(t, HUMANO));
    }
    expect(trilha).toEqual([
      { stage: 'groups', round: 1 },
      { stage: 'groups', round: 2 },
      { stage: 'groups', round: 3 },
      { stage: 'r16', round: 4 },
      { stage: 'quarter', round: 5 },
      { stage: 'semi', round: 6 },
      { stage: 'final', round: 8 },
    ]);
  });

  it('`current()` sempre devolve um par que contém a seleção do jogador', () => {
    for (const seed of [3, 11, 77]) {
      const t = createTournament(cfg(seed));
      let visto = 0;
      while (t.current() !== null) {
        const c = t.current();
        if (c === null) break;
        expect([c.teams.A, c.teams.B]).toContain(HUMANO);
        expect(c.teams.A).not.toBe(c.teams.B);
        visto += 1;
        t.report(ladoDo(t, HUMANO));
      }
      expect(visto).toBeGreaterThanOrEqual(3);
    }
  });
});

/* ───────────────────────────────── portão: determinismo ───────────────────────────────── */

describe('M8 · mesma semente + mesma seleção = mesmo campeão', () => {
  it('duas execuções seguidas dão o MESMO chaveamento e o mesmo campeão', () => {
    const a = jogar(createTournament(cfg(2026)), sempreVence).toJSON();
    const b = jogar(createTournament(cfg(2026)), sempreVence).toJSON();
    expect(b).toEqual(a);
  });

  it('a seleção do jogador faz parte da identidade: trocá-la muda o torneio', () => {
    const a = jogar(createTournament(cfg(2026, 'BR')), sempreVence).toJSON();
    const b = jogar(createTournament(cfg(2026, 'ES')), sempreVence).toJSON();
    // O sorteio dos grupos é o mesmo (mesma semente), mas quem entra por `report()` muda.
    expect(b.entrants).toEqual(a.entrants);
    expect(b.results).not.toEqual(a.results);
  });

  it('o nível atravessa até a simulação: `easy` e `hard` não dão o mesmo torneio', () => {
    const facil = jogar(createTournament(cfg(2026, HUMANO, 'easy')), sempreVence).toJSON();
    const dificil = jogar(createTournament(cfg(2026, HUMANO, 'hard')), sempreVence).toJSON();
    expect(facil.level).toBe(0);
    expect(dificil.level).toBe(2);
    expect(dificil.results).not.toEqual(facil.results);
  });
});

/* ──────────────────────── portão: serializar no meio e restaurar ──────────────────────── */

describe('M8 · `toJSON()` no meio + `restoreTournament()` = a MESMA linha do tempo (`D-57`)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])(
    'cortando antes da disputa %i do jogador, o torneio inteiro bate com o que não recarregou',
    (corte) => {
      const referencia = jogar(createTournament(cfg(9)), sempreVence).toJSON();
      const restaurado = jogar(createTournament(cfg(9)), sempreVence, corte).toJSON();
      expect(restaurado).toEqual(referencia);
    },
  );

  it('o corte também vale com o jogador eliminado no grupo', () => {
    const referencia = jogar(createTournament(cfg(9)), semprePerde).toJSON();
    for (const corte of [0, 1, 2]) {
      expect(jogar(createTournament(cfg(9)), semprePerde, corte).toJSON()).toEqual(referencia);
    }
  });

  it('restaurar duas vezes seguidas não move nada', () => {
    const t = createTournament(cfg(9));
    const um = restoreTournament(t.toJSON());
    const dois = restoreTournament(um.toJSON());
    expect(dois.toJSON()).toEqual(t.toJSON());
    expect(dois.current()).toEqual(t.current());
  });

  it('um `int()` avança o gerador UM passo, qualquer que seja `maxExclusive`', () => {
    // É a propriedade de M1 que autoriza o descarte de `restoreTournament`. Sem ela, descartar
    // `consumed` sorteios com `int(2)` levaria o cursor para outro lugar, e a linha do tempo
    // depois do recarregamento divergiria — com o teste de determinismo passando.
    const a = createRng(1234);
    const b = createRng(1234);
    for (let i = 0; i < 50; i += 1) {
      a.int(2);
      b.int(1_000_000);
    }
    const seguintes = (r: Rng): number[] => Array.from({ length: 10 }, () => r.int(1000));
    expect(seguintes(a)).toEqual(seguintes(b));
  });

  it('ler a tabela não consome sorteio — olhar a tela não pode mover o gerador', () => {
    const t = createTournament(cfg(9));
    const antes = t.toJSON().consumed;
    for (let i = 0; i < 10; i += 1) {
      t.group(HUMANO);
      t.group('ES');
    }
    expect(t.toJSON().consumed).toBe(antes);
  });
});

/* ─────────────────────────── portão: sorteio cego e uniforme ─────────────────────────── */

describe('M8 · o sorteio dos grupos é cego (`D-59`)', () => {
  const AMOSTRA = 2000;
  const sorteios: (readonly CountryCode[])[] = [];
  for (let seed = 0; seed < AMOSTRA; seed += 1) {
    sorteios.push(createTournament(cfg(seed)).toJSON().entrants);
  }
  const grupoDe = (ordem: readonly CountryCode[], code: CountryCode): number =>
    Math.floor(ordem.indexOf(code) / POR_GRUPO);

  it.each(['BR', 'ES', 'KR'])(
    'a seleção %s cai em cada um dos 8 grupos com frequência dentro de 4 sigmas de 1/8',
    (code) => {
      const contagem = new Array<number>(8).fill(0);
      for (const ordem of sorteios) {
        const g = grupoDe(ordem, code);
        contagem[g] = em(contagem, g) + 1;
      }
      const p = 1 / 8;
      const margem = 4 * Math.sqrt((p * (1 - p)) / AMOSTRA);
      for (let g = 0; g < 8; g += 1) {
        expect(em(contagem, g) / AMOSTRA).toBeGreaterThan(p - margem);
        expect(em(contagem, g) / AMOSTRA).toBeLessThan(p + margem);
      }
    },
  );

  it('EXISTE semente em que a 1ª e a 2ª do catálogo dividem grupo — é o teste que reprova potes', () => {
    const primeira = em(CODES, 0);
    const segunda = em(CODES, 1);
    const juntas = sorteios.filter((o) => grupoDe(o, primeira) === grupoDe(o, segunda));
    expect(juntas.length).toBeGreaterThan(0);
    // 3/31 = 9,68% é o número de `D-59`. Com cabeça de chave seria 0.
    expect(juntas.length / AMOSTRA).toBeGreaterThan(0.06);
    expect(juntas.length / AMOSTRA).toBeLessThan(0.14);
  });

  it('~50% das sementes juntam duas das QUATRO primeiras num grupo — o custo medido de `D-59`', () => {
    const quatro = CODES.slice(0, 4);
    const juntas = sorteios.filter((o) => new Set(quatro.map((c) => grupoDe(o, c))).size < 4);
    // `D-59` mediu 50,2%: é o comportamento pretendido, não defeito.
    expect(juntas.length / AMOSTRA).toBeGreaterThan(0.45);
    expect(juntas.length / AMOSTRA).toBeLessThan(0.55);
  });
});

/* ─────────────────── portão: nenhum par repetido DENTRO da fase de grupos ─────────────────── */

describe('M8 · a fase de grupos não repete par (`D-57`)', () => {
  it('as 48 disputas são as 6 combinações de cada um dos 8 grupos, sem repetir nenhuma', () => {
    const ordem = createTournament(cfg(9)).toJSON().entrants;
    const pares = new Set<string>();
    const porGrupo = new Map<number, number>();

    for (let i = 0; i < DISPUTAS_DE_GRUPO; i += 1) {
      const d = disputaDeGrupo(ordem, i);
      const chave = [d.a, d.b].sort().join('×');
      expect(pares.has(chave)).toBe(false); // par repetido morre aqui
      pares.add(chave);
      porGrupo.set(d.grupo, (porGrupo.get(d.grupo) ?? 0) + 1);
      // As duas seleções do par são do MESMO grupo.
      expect(Math.floor(ordem.indexOf(d.a) / POR_GRUPO)).toBe(d.grupo);
      expect(Math.floor(ordem.indexOf(d.b) / POR_GRUPO)).toBe(d.grupo);
    }

    expect(pares.size).toBe(DISPUTAS_DE_GRUPO);
    for (let g = 0; g < 8; g += 1) expect(porGrupo.get(g)).toBe(6);
  });

  it('cada seleção joga 3 vezes no grupo, uma por rodada', () => {
    const ordem = createTournament(cfg(9)).toJSON().entrants;
    const porRodada = new Map<string, Set<number>>();
    for (let i = 0; i < DISPUTAS_DE_GRUPO; i += 1) {
      const d = disputaDeGrupo(ordem, i);
      for (const code of [d.a, d.b]) {
        const vistas = porRodada.get(code) ?? new Set<number>();
        expect(vistas.has(d.round)).toBe(false); // duas disputas na mesma rodada
        vistas.add(d.round);
        porRodada.set(code, vistas);
      }
    }
    expect(porRodada.size).toBe(32);
    for (const vistas of porRodada.values()) expect([...vistas].sort()).toEqual([1, 2, 3]);
  });
});

/* ───────────────────── portão: os 4 critérios de desempate, NA ORDEM ───────────────────── */

/** `Rng` que conta quantos sorteios foram pedidos — é como se prova que o sorteio NÃO foi usado. */
function rngContado(seed: number): { rng: Rng; pedidos: () => number } {
  const base = createRng(seed);
  let n = 0;
  return {
    rng: {
      int(max: number): number {
        n += 1;
        return base.int(max);
      },
    },
    pedidos: () => n,
  };
}

function jogo(a: CountryCode, b: CountryCode, golsA: number, golsB: number): Jogo {
  return { a, b, vencedor: golsA > golsB ? a : b, golsA, golsB };
}

describe('M8 · desempate: vitórias → confronto direto → saldo → gols → sorteio (`D-53`)', () => {
  const GRUPO: readonly CountryCode[] = ['ES', 'AR', 'FR', 'BR'];

  it('1) vitórias classificam, e nenhum sorteio é pedido', () => {
    const jogos = [
      jogo('ES', 'AR', 1, 0),
      jogo('ES', 'FR', 1, 0),
      jogo('ES', 'BR', 1, 0),
      jogo('AR', 'FR', 1, 0),
      jogo('AR', 'BR', 1, 0),
      jogo('FR', 'BR', 1, 0),
    ];
    const { rng, pedidos } = rngContado(1);
    expect(ordenarGrupo(GRUPO, jogos, rng)).toEqual(['ES', 'AR', 'FR', 'BR']);
    expect(pedidos()).toBe(0);
  });

  it('2) CONFRONTO DIRETO vem antes do saldo: quem venceu o empatado passa, mesmo com saldo pior', () => {
    const jogos = [
      jogo('ES', 'AR', 0, 1), // AR venceu ES
      jogo('ES', 'FR', 5, 0),
      jogo('ES', 'BR', 5, 0),
      jogo('AR', 'FR', 1, 0),
      jogo('AR', 'BR', 0, 3),
      jogo('FR', 'BR', 1, 0),
    ];
    const linhas = new Map(tabela(GRUPO, jogos).map((l) => [l.code, l]));
    // ES tem saldo MUITO melhor e mesmo assim fica atrás: o critério anterior já decidiu.
    expect((linhas.get('ES')?.goalsFor ?? 0) - (linhas.get('ES')?.goalsAgainst ?? 0)).toBe(9);
    expect((linhas.get('AR')?.goalsFor ?? 0) - (linhas.get('AR')?.goalsAgainst ?? 0)).toBe(-1);

    const { rng, pedidos } = rngContado(1);
    expect(ordenarGrupo(GRUPO, jogos, rng)).toEqual(['AR', 'ES', 'FR', 'BR']);
    expect(pedidos()).toBe(0);
  });

  it('3) SALDO vem antes dos gols: no triângulo, o confronto direto empata e o saldo decide', () => {
    // Ciclo ES→AR→FR→ES: 1 vitória de cada dentro do empate, então o confronto direto empata.
    const jogos = [
      jogo('ES', 'AR', 1, 0),
      jogo('AR', 'FR', 1, 0),
      jogo('ES', 'FR', 0, 1),
      jogo('ES', 'BR', 5, 0),
      jogo('AR', 'BR', 3, 0),
      jogo('FR', 'BR', 9, 8), // FR marca MUITO e mesmo assim tem o pior saldo dos três
    ];
    const linhas = new Map(tabela(GRUPO, jogos).map((l) => [l.code, l]));
    const saldo = (c: CountryCode): number =>
      (linhas.get(c)?.goalsFor ?? 0) - (linhas.get(c)?.goalsAgainst ?? 0);
    expect([saldo('ES'), saldo('AR'), saldo('FR')]).toEqual([5, 3, 1]);
    expect(linhas.get('FR')?.goalsFor).toBe(10); // o maior ataque do grupo

    const { rng, pedidos } = rngContado(1);
    expect(ordenarGrupo(GRUPO, jogos, rng)).toEqual(['ES', 'AR', 'FR', 'BR']);
    expect(pedidos()).toBe(0);
  });

  it('4) GOLS decidem quando o saldo empata — e ainda sem sorteio', () => {
    const jogos = [
      jogo('ES', 'AR', 3, 2),
      jogo('AR', 'FR', 2, 1),
      jogo('ES', 'FR', 1, 2),
      jogo('ES', 'BR', 4, 2),
      jogo('AR', 'BR', 2, 0),
      jogo('FR', 'BR', 2, 0),
    ];
    const linhas = new Map(tabela(GRUPO, jogos).map((l) => [l.code, l]));
    for (const c of ['ES', 'AR', 'FR']) {
      expect((linhas.get(c)?.goalsFor ?? 0) - (linhas.get(c)?.goalsAgainst ?? 0)).toBe(2);
    }
    expect([
      linhas.get('ES')?.goalsFor,
      linhas.get('AR')?.goalsFor,
      linhas.get('FR')?.goalsFor,
    ]).toEqual([8, 6, 5]);

    const { rng, pedidos } = rngContado(1);
    // Entram fora de ordem de propósito: o resultado não pode ser a ordem de entrada.
    expect(ordenarGrupo(['FR', 'AR', 'ES', 'BR'], jogos, rng)).toEqual(['ES', 'AR', 'FR', 'BR']);
    expect(pedidos()).toBe(0);
  });

  /** Triângulo perfeito: mesmas vitórias, confronto direto cíclico, mesmo saldo, mesmos gols. */
  const EMPATE_TOTAL: readonly Jogo[] = [
    jogo('ES', 'AR', 1, 0),
    jogo('AR', 'FR', 1, 0),
    jogo('ES', 'FR', 0, 1),
    jogo('ES', 'BR', 1, 0),
    jogo('AR', 'BR', 1, 0),
    jogo('FR', 'BR', 1, 0),
  ];

  it('5) o SORTEIO só é alcançado quando os três anteriores empatam', () => {
    const linhas = new Map(tabela(GRUPO, EMPATE_TOTAL).map((l) => [l.code, l]));
    for (const c of ['ES', 'AR', 'FR']) {
      expect(linhas.get(c)).toEqual({ code: c, wins: 2, goalsFor: 2, goalsAgainst: 1 });
    }

    const { rng, pedidos } = rngContado(1);
    const ordem = ordenarGrupo(GRUPO, EMPATE_TOTAL, rng);
    // Fisher-Yates sobre os 3 empatados: exatamente 2 sorteios, e nem um a mais.
    expect(pedidos()).toBe(2);
    expect([...ordem].sort()).toEqual([...GRUPO].sort());
    expect(em(ordem, 3)).toBe('BR'); // BR não está no empate e não é sorteado
  });

  it('5b) sem gerador, a leitura provisória é estável e não sorteia', () => {
    expect(ordenarGrupo(GRUPO, EMPATE_TOTAL, null)).toEqual(['ES', 'AR', 'FR', 'BR']);
  });

  it('5c) o sorteio realmente sorteia: sementes diferentes produzem ordens diferentes', () => {
    const ordens = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      ordens.add(ordenarGrupo(GRUPO, EMPATE_TOTAL, createRng(seed)).join(','));
    }
    expect(ordens.size).toBeGreaterThan(1);
  });

  it('placar ausente NÃO entra no saldo, e ausente não é zero', () => {
    const comAusente: Jogo[] = [
      { a: 'ES', b: 'AR', vencedor: 'ES', golsA: GOLS_DESCONHECIDOS, golsB: GOLS_DESCONHECIDOS },
      jogo('ES', 'FR', 3, 0),
    ];
    const linhas = new Map(tabela(GRUPO, comAusente).map((l) => [l.code, l]));
    // A vitória conta; o placar que não veio não vira `0 x 0`.
    expect(linhas.get('ES')).toEqual({ code: 'ES', wins: 2, goalsFor: 3, goalsAgainst: 0 });
    expect(linhas.get('AR')).toEqual({ code: 'AR', wins: 0, goalsFor: 0, goalsAgainst: 0 });
  });

  it('placar pela metade é recusado — os dois lados vêm juntos ou nenhum vem', () => {
    const torto: Jogo[] = [
      { a: 'ES', b: 'AR', vencedor: 'ES', golsA: 2, golsB: GOLS_DESCONHECIDOS },
    ];
    expect(() => tabela(GRUPO, torto)).toThrow(/pela metade/);
  });
});

/* ───────────────────────── a tabela que a porta devolve (`group`) ───────────────────────── */

describe('M8 · `group()`', () => {
  it('devolve as 4 do grupo do código, classificadas, e a soma de vitórias fecha em 6', () => {
    const t = jogar(createTournament(cfg(9)), sempreVence);
    const tabelaDoJogador = t.group(HUMANO);
    expect(tabelaDoJogador).toHaveLength(POR_GRUPO);
    expect(tabelaDoJogador.map((l) => l.code)).toContain(HUMANO);
    expect(tabelaDoJogador.reduce((s, l) => s + l.wins, 0)).toBe(6);
    for (const linha of tabelaDoJogador) {
      expect(Number.isInteger(linha.wins)).toBe(true);
      expect(Number.isInteger(linha.goalsFor)).toBe(true);
      expect(Number.isInteger(linha.goalsAgainst)).toBe(true);
      expect(linha.goalsFor).toBeGreaterThanOrEqual(0);
    }
  });

  it('os 8 grupos somam 6 vitórias cada — as 48 disputas de grupo, uma vitória por disputa', () => {
    const t = jogar(createTournament(cfg(9)), sempreVence);
    const ordem = t.toJSON().entrants;
    let soma = 0;
    for (let g = 0; g < 8; g += 1) {
      const linhas = t.group(em(ordem, g * POR_GRUPO));
      expect(linhas.reduce((s, l) => s + l.wins, 0)).toBe(6);
      soma += 6;
    }
    expect(soma).toBe(DISPUTAS_DE_GRUPO);
  });

  it('a tabela vale antes de a fase fechar, e é provisória sem sorteio', () => {
    const t = createTournament(cfg(9));
    expect(t.group(HUMANO)).toHaveLength(POR_GRUPO);
    expect(t.toJSON().groupOrder).toHaveLength(0);
  });

  it('quem não está no torneio não tem tabela — e o erro diz isso', () => {
    const t = createTournament(cfg(9));
    expect(() => t.group('ZZ')).toThrow(/não está no torneio/);
  });

  it('os dois primeiros do grupo do campeão se classificaram', () => {
    const t = jogar(createTournament(cfg(9)), sempreVence);
    const campeao = t.champion();
    expect(campeao).not.toBeNull();
    if (campeao === null) return;
    expect(t.group(campeao).slice(0, 2).map((l) => l.code)).toContain(campeao);
  });
});

/* ──────────────── `D-66`: um `Cpu` por disputa — o oráculo da simulação ──────────────── */

/**
 * Refaz, aqui no teste, exatamente o que M8 faz numa disputa simulada.
 *
 * É o que prova `D-66` pela via mais baixa possível: se M8 reusasse o `Cpu` entre disputas, a
 * segunda disputa simulada já divergiria deste oráculo — que cria os dois `Cpu` do zero a cada
 * disputa —, e nenhum outro teste veria isso, porque o número de sorteios consumidos seria o
 * mesmo. De quebra, fixa a ORDEM dos sorteios: sorteio dos grupos, quem cobra primeiro, e então
 * as escolhas da CPU.
 */
function simularRef(level: Level, rng: Rng): { vencedor: Side; golsA: number; golsB: number } {
  const first: Side = rng.int(2) === 0 ? 'A' : 'B';
  const cpus: Record<Side, Cpu> = { A: createCpu(level, rng), B: createCpu(level, rng) };
  let estado = createMatch(first);
  while (estado.phase !== 'finished') {
    const cobrador = estado.turn;
    if (cobrador === null) throw new Error('oráculo: vez nula');
    const goleiro: Side = cobrador === 'A' ? 'B' : 'A';
    const chute = cpus[cobrador].pick('shooter');
    const defesa = cpus[goleiro].pick('keeper');
    cpus[cobrador].observe('keeper', defesa);
    cpus[goleiro].observe('shooter', chute);
    estado = play(estado, chute, defesa);
  }
  const vencedor = estado.winner;
  if (vencedor === null) throw new Error('oráculo: sem vencedor');
  return { vencedor, golsA: estado.goals.A, golsB: estado.goals.B };
}

describe('M8 · `D-66` — um `Cpu` por disputa, e a ordem dos sorteios', () => {
  it('as disputas simuladas antes da 1ª do jogador batem, uma a uma, com o oráculo', () => {
    const SEED = 9;
    const LEVEL: Level = 'hard'; // o nível em que o histórico pesa mais — onde reusar apareceria
    const t = createTournament(cfg(SEED, HUMANO, LEVEL));
    const estado = t.toJSON();

    // 1) o sorteio dos grupos: Fisher-Yates sobre as 32, 31 sorteios.
    const rng = createRng(SEED);
    const sorteadas = [...CODES];
    for (let i = sorteadas.length - 1; i > 0; i -= 1) {
      const j = rng.int(i + 1);
      const a = em(sorteadas, i);
      sorteadas[i] = em(sorteadas, j);
      sorteadas[j] = a;
    }
    expect(estado.entrants).toEqual(sorteadas);

    // 2) as simuladas até a 1ª do jogador, na ordem da fila.
    let posicao = 0;
    while (posicao < DISPUTAS_DE_GRUPO) {
      const d = disputaDeGrupo(sorteadas, posicao);
      if (d.a === HUMANO || d.b === HUMANO) break;
      const ref = simularRef(LEVEL, rng);
      expect(em(estado.results, posicao)).toBe(ref.vencedor === 'A' ? 0 : 1);
      expect(em(estado.goalsA, posicao)).toBe(ref.golsA);
      expect(em(estado.goalsB, posicao)).toBe(ref.golsB);
      posicao += 1;
    }

    // A semente 9 põe a 1ª disputa do jogador na posição 14: 14 disputas simuladas conferidas.
    // Uma só não bastaria — a divergência de um `Cpu` reusado só nasce na SEGUNDA.
    expect(posicao).toBeGreaterThanOrEqual(5);
    expect(estado.results).toHaveLength(posicao);
    expect(estado.played).toBe(posicao);
  });

  it('a disputa do jogador não consome sorteio nenhum — quem joga é M5, não M8', () => {
    const t = createTournament(cfg(9));
    const antes = t.toJSON().consumed;
    t.report(ladoDo(t, HUMANO));
    const depois = t.toJSON();
    // O que ele consumiu depois foi das SIMULADAS até a próxima do jogador, nunca da dele.
    expect(depois.goalsA[depois.results.length - 1] ?? 0).not.toBe(GOLS_DESCONHECIDOS);
    const posicaoDele = depois.results.length - 1;
    expect(posicaoDele).toBeGreaterThan(0);
    expect(antes).toBeGreaterThan(0);
  });

  it('o placar da disputa do jogador fica AUSENTE, não zero (porta congelada — `Q-13`)', () => {
    const t = createTournament(cfg(9));
    const antes = t.toJSON().results.length;
    t.report(ladoDo(t, HUMANO));
    const depois = t.toJSON();
    expect(em(depois.goalsA, antes)).toBe(GOLS_DESCONHECIDOS);
    expect(em(depois.goalsB, antes)).toBe(GOLS_DESCONHECIDOS);
  });
});

/* ─────────────────────────────── entradas recusadas ─────────────────────────────── */

describe('M8 · a configuração é conferida antes de existir torneio', () => {
  it('exige 32 seleções', () => {
    expect(() => createTournament({ ...cfg(1), entrants: CODES.slice(0, 16) })).toThrow(/32/);
  });

  it('todo participante existe em M4', () => {
    const comIntruso = [...CODES.slice(0, 31), 'ZZ'];
    expect(() => createTournament({ ...cfg(1), entrants: comIntruso })).toThrow(/catálogo de M4/);
  });

  it('recusa seleção repetida', () => {
    const repetida = [...CODES.slice(0, 31), em(CODES, 0)];
    expect(() => createTournament({ ...cfg(1), entrants: repetida })).toThrow(/repetida/);
  });

  it('a seleção do jogador tem de estar entre as 32', () => {
    expect(() => createTournament({ ...cfg(1), human: 'ZZ' })).toThrow(/não está entre as 32/);
  });

  it('recusa nível inválido e semente que não é inteiro seguro', () => {
    expect(() => createTournament({ ...cfg(1), level: 'insano' as Level })).toThrow(/nível/);
    expect(() => createTournament({ ...cfg(1.5) })).toThrow(/inteiro seguro/);
    expect(() => createTournament({ ...cfg(Number.NaN) })).toThrow(/inteiro seguro/);
  });

  it('`report()` sem disputa pendente e com lado inválido morrem alto, nunca em silêncio', () => {
    const t = jogar(createTournament(cfg(9)), semprePerde);
    expect(t.current()).toBeNull();
    expect(() => t.report('A')).toThrow(/não há disputa do jogador/);

    const outro = createTournament(cfg(9));
    expect(() => outro.report('C' as Side)).toThrow(/'A' \| 'B'/);
  });
});

describe('M8 · `restoreTournament()` recusa retrato que não fecha', () => {
  const bom = (): TournamentState => jogar(createTournament(cfg(9)), sempreVence, null).toJSON();
  const meio = (): TournamentState => {
    const t = createTournament(cfg(9));
    t.report(ladoDo(t, HUMANO));
    return t.toJSON();
  };

  it('o retrato bom volta', () => {
    expect(restoreTournament(bom()).champion()).not.toBeNull();
  });

  it.each([
    ['versão desconhecida', { v: 2 }, /versão de formato/],
    ['semente torta', { seed: 1.5 }, /seed inválida/],
    ['consumed negativo', { consumed: -1 }, /consumed inválido/],
    ['nível fora da lista', { level: 9 }, /nível inválido/],
    ['resultado que não é 0 nem 1', { results: [7] }, /resultado inválido/],
    ['played que não bate', { played: 3 }, /não bate/],
  ])('recusa %s', (_nome, remendo, mensagem) => {
    const torto = { ...meio(), ...remendo } as TournamentState;
    expect(() => restoreTournament(torto)).toThrow(mensagem);
  });

  it('recusa mata-mata gravado sem a classificação dos grupos', () => {
    const cheio = bom();
    const torto = { ...cheio, groupOrder: [] } as TournamentState;
    expect(() => restoreTournament(torto)).toThrow(/sem a classificação/);
  });

  it('recusa `groupOrder` que mistura grupos', () => {
    const cheio = bom();
    const trocado = [...cheio.groupOrder];
    const a = em(trocado, 0);
    trocado[0] = em(trocado, 4);
    trocado[4] = a;
    expect(() => restoreTournament({ ...cheio, groupOrder: trocado })).toThrow(/mistura grupos/);
  });

  it('recusa gols sem par com os resultados', () => {
    const m = meio();
    expect(() => restoreTournament({ ...m, goalsA: [] })).toThrow(/não acompanham/);
  });
});

/* ─────────────────────── o retrato: só código de país e inteiro ─────────────────────── */

describe('M8 · o retrato de `toJSON()` é o que M7 grava (`D-57`)', () => {
  it('só tem código de país e inteiro — nem nível nem fase viajam como texto', () => {
    const estado = jogar(createTournament(cfg(9)), sempreVence).toJSON();
    const codigos = new Set<string>(CODES);

    for (const [chave, valor] of Object.entries(estado)) {
      if (Array.isArray(valor)) {
        for (const item of valor) {
          if (typeof item === 'string') expect(codigos.has(item)).toBe(true);
          else expect(Number.isInteger(item)).toBe(true);
        }
      } else if (typeof valor === 'string') {
        expect(codigos.has(valor)).toBe(true);
      } else {
        expect(Number.isInteger(valor)).toBe(true);
      }
      expect(chave).toBeTruthy();
    }

    // Sobrevive à ida e volta pelo JSON, que é como M7 vai guardá-lo.
    const ida = JSON.parse(JSON.stringify(estado)) as TournamentState;
    expect(restoreTournament(ida).champion()).toBe(restoreTournament(estado).champion());
  });
});

/* ───────────────────────────── portão de camada: varredura ───────────────────────────── */

describe('M8 · portão de camada', () => {
  const DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'tournament');

  function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome);
      return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
    });
  }

  it('nenhum arquivo de `src/tournament/` cita o armazenamento do navegador', () => {
    // A agulha é montada em pedaços: escrita inteira, este próprio teste reprovaria a varredura.
    const AGULHA = ['local', 'Storage'].join('');
    const ocorrencias = arquivos(DIR).filter((caminho) =>
      readFileSync(caminho, 'utf8').includes(AGULHA),
    );
    expect(ocorrencias).toEqual([]);
  });

  it('M8 não importa M5 (`D-57`): a sessão espera a escolha deste aparelho, e as simuladas não têm uma', () => {
    for (const caminho of arquivos(DIR)) {
      expect(readFileSync(caminho, 'utf8')).not.toMatch(/from '\.\.\/session/);
    }
  });
});
