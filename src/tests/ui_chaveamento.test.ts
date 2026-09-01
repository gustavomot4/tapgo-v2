/**
 * M7 · o que a tela do chaveamento DERIVA do que leu (`T-40` / `P-3` / `D-111`).
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * **Nenhuma tela é montável aqui**: `vitest` roda em Node, `document` não existe. Por isso a
 * derivação da tela mora em `src/ui/chave.ts`, módulo puro — é o mesmo arranjo de `derivacao.ts`,
 * e é o que torna testável a única regra que M7 acrescenta ao que M8 já decidiu: **agrupar por
 * fase, na ordem da fila**.
 *
 * O que este arquivo cobra:
 *
 *   1. as seções saem na ordem da competição, e nenhuma disputa se perde nem se repete;
 *   2. os tamanhos são os do formato (`D-53`): 16+16+16 nos grupos, 8+4+2+1+1 no mata-mata;
 *   3. os três estados de uma disputa são distinguidos — e o `'sem-placar'` é **exatamente** o
 *      das disputas do jogador (`D-67`/`Q-13`), enquanto o `'a-jogar'` é o de `D-112`;
 *   4. o rótulo de gols ausentes é o traço, **nunca `0`**.
 *
 * O que fica de fora, e é do dono no aparelho (`A-NN`): se as 64 cabem e se leem em 360x640.
 */

import { describe, expect, it } from 'vitest';

import type { CountryCode, Side } from '../core/index';
import { listTeams } from '../data/teams';
import { chaveamento, createTournament } from '../tournament/index';
import type { Disputa, Tournament } from '../tournament/index';
import { estadoDaDisputa, secoes } from '../ui/chave';
import {
  DISPUTAS_DO_TORNEIO,
  GOLS_AUSENTES,
  golsDaDisputa,
  nomeGrupo,
  resumoDoChaveamento,
} from '../ui/rotulos';

const CODES: readonly CountryCode[] = listTeams().map((t) => t.code);
const HUMANO: CountryCode = 'BR';
const SEMENTE = 9;

function novo(seed = SEMENTE): Tournament {
  return createTournament({ entrants: CODES, human: HUMANO, level: 'medium', seed });
}

/** O lado do jogador na disputa corrente. */
function ladoDo(t: Tournament): Side {
  const c = t.current();
  if (c === null) throw new Error('teste: não há disputa do jogador');
  return c.teams.A === HUMANO ? 'A' : 'B';
}

/** Joga até o fim com o jogador vencendo tudo — é o caminho que chega às 64. */
function ateOFim(t: Tournament): Tournament {
  while (t.current() !== null) t.report(ladoDo(t));
  return t;
}

const RECEM_CRIADO: readonly Disputa[] = chaveamento(novo().toJSON());
const ENCERRADO: readonly Disputa[] = chaveamento(ateOFim(novo()).toJSON());

describe('M7 · `secoes` agrupa por fase sem reordenar nem perder disputa', () => {
  it('a concatenação das seções é a lista que entrou, na mesma ordem', () => {
    const voltou = secoes(ENCERRADO).flatMap((s) => [...s.disputas]);
    expect(voltou).toEqual([...ENCERRADO]);
  });

  it('lista vazia dá nenhuma seção — quem trata isso é o estado de ERRO da tela', () => {
    expect(secoes([])).toEqual([]);
  });

  it('o torneio recém-criado tem só as 3 rodadas de grupo, de 16 disputas cada', () => {
    const s = secoes(RECEM_CRIADO);
    expect(s.map((x) => x.stage)).toEqual(['groups', 'groups', 'groups']);
    expect(s.map((x) => x.round)).toEqual([1, 2, 3]);
    expect(s.map((x) => x.disputas.length)).toEqual([16, 16, 16]);
  });

  it('o torneio encerrado tem as 8 faixas do formato (`D-53`), na ordem da competição', () => {
    const s = secoes(ENCERRADO);
    expect(s.map((x) => x.stage)).toEqual([
      'groups',
      'groups',
      'groups',
      'r16',
      'quarter',
      'semi',
      'third',
      'final',
    ]);
    expect(s.map((x) => x.disputas.length)).toEqual([16, 16, 16, 8, 4, 2, 1, 1]);
  });

  it('cada seção tem uma fase e uma rodada só — é o que dá o título da faixa', () => {
    for (const s of secoes(ENCERRADO)) {
      for (const d of s.disputas) {
        expect(d.stage).toBe(s.stage);
        expect(d.round).toBe(s.round);
      }
    }
  });
});

describe('M7 · `estadoDaDisputa` separa os três casos que mostram o mesmo traço', () => {
  it('no recém-criado há disputa por jogar, e NENHUMA sem placar', () => {
    // M8 já simulou as disputas que vêm ANTES da primeira do jogador na fila — por isso não são
    // todas `'a-jogar'`. O que não pode existir aqui é `'sem-placar'`: ele é o rastro de um
    // `report()`, e o jogador ainda não jogou nada.
    expect(RECEM_CRIADO.length).toBe(48);
    expect(RECEM_CRIADO.some((d) => estadoDaDisputa(d) === 'a-jogar')).toBe(true);
    expect(RECEM_CRIADO.some((d) => estadoDaDisputa(d) === 'sem-placar')).toBe(false);
  });

  it("a disputa `'a-jogar'` não tem vencedor nem placar inventado (`D-112`)", () => {
    const porJogar = RECEM_CRIADO.filter((d) => estadoDaDisputa(d) === 'a-jogar');
    expect(porJogar.length).toBeGreaterThan(0);
    for (const d of porJogar) {
      expect(d.winner).toBeNull();
      expect(d.goals).toBeNull();
    }
  });

  it('no encerrado, nenhuma está por jogar e todas as 64 estão lá', () => {
    expect(ENCERRADO.length).toBe(DISPUTAS_DO_TORNEIO);
    for (const d of ENCERRADO) expect(estadoDaDisputa(d)).not.toBe('a-jogar');
  });

  it("`'sem-placar'` é EXATAMENTE a disputa do jogador (`D-67`/`Q-13`)", () => {
    const semPlacar = ENCERRADO.filter((d) => estadoDaDisputa(d) === 'sem-placar');
    // 3 de grupo + oitavas, quartas, semi e final: o jogador venceu tudo.
    expect(semPlacar.length).toBe(7);
    for (const d of semPlacar) {
      expect(d.teams.A === HUMANO || d.teams.B === HUMANO).toBe(true);
    }
    for (const d of ENCERRADO) {
      const doJogador = d.teams.A === HUMANO || d.teams.B === HUMANO;
      expect(estadoDaDisputa(d) === 'sem-placar').toBe(doJogador);
    }
  });

  it("o resto é `'jogada'`, com placar de verdade", () => {
    const jogadas = ENCERRADO.filter((d) => estadoDaDisputa(d) === 'jogada');
    expect(jogadas.length).toBe(DISPUTAS_DO_TORNEIO - 7);
    for (const d of jogadas) expect(d.goals).not.toBeNull();
  });
});

describe('M7 · o placar ausente é o traço, nunca `0` (`D-67`/`D-112`)', () => {
  it('sem gols, os dois lados mostram o traço', () => {
    expect(golsDaDisputa(null, 'A')).toBe(GOLS_AUSENTES);
    expect(golsDaDisputa(null, 'B')).toBe(GOLS_AUSENTES);
    expect(golsDaDisputa(null, 'A')).not.toBe('0');
  });

  it('com gols, mostra o número — inclusive o zero que foi MEDIDO', () => {
    expect(golsDaDisputa({ A: 3, B: 1 }, 'A')).toBe('3');
    expect(golsDaDisputa({ A: 3, B: 1 }, 'B')).toBe('1');
    expect(golsDaDisputa({ A: 0, B: 2 }, 'A')).toBe('0');
  });

  it('nenhuma disputa do chaveamento inteiro escreve `0` sem placar', () => {
    for (const d of [...RECEM_CRIADO, ...ENCERRADO]) {
      if (d.goals !== null) continue;
      expect(golsDaDisputa(d.goals, 'A')).toBe(GOLS_AUSENTES);
      expect(golsDaDisputa(d.goals, 'B')).toBe(GOLS_AUSENTES);
    }
  });
});

describe('M7 · os rótulos da tela do chaveamento', () => {
  it('o grupo vira letra, de A a H', () => {
    expect(nomeGrupo(0)).toBe('Grupo A');
    expect(nomeGrupo(7)).toBe('Grupo H');
  });

  it('grupo fora da faixa não vira `undefined` na tela', () => {
    expect(nomeGrupo(8)).toBe('Grupo 9');
    expect(nomeGrupo(-1)).not.toContain('undefined');
  });

  it('todo grupo do chaveamento tem letra, e o mata-mata não tem grupo', () => {
    for (const d of ENCERRADO) {
      if (d.stage === 'groups') {
        expect(d.group).toBeGreaterThanOrEqual(0);
        expect(nomeGrupo(d.group)).toMatch(/^Grupo [A-H]$/);
      } else {
        expect(d.group).toBe(-1);
      }
    }
  });

  it('o resumo diz o denominador — 48 de 64 não é "48 disputas"', () => {
    expect(resumoDoChaveamento(48)).toBe('48 de 64 disputas definidas');
    expect(resumoDoChaveamento(DISPUTAS_DO_TORNEIO)).toBe('64 de 64 disputas definidas');
  });

  it('o total do formato é 64 (`D-53`: 48 + 15 + 1)', () => {
    expect(DISPUTAS_DO_TORNEIO).toBe(64);
  });
});
