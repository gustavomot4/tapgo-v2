/**
 * M8 · `chaveamento(state)` — o portão de `D-111` (`T-40`, saída **(c)** de `P-3`).
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "Portão de `chaveamento(state)`".
 *
 * As cinco checagens do portão, uma por bloco: pureza (`consumed` não muda) · comprimento
 * **48 → 56 → 64** · `winner` casando com `group()` e `champion()` na mesma semente · `goals`
 * ausente **só** nas disputas do jogador · e a opacidade de `D-68` varrida no disco de `src/ui/`.
 *
 * Nenhuma delas monta tela: `vitest` roda em Node, sem `document`. Se o chaveamento **cabe** em
 * 360x640 é `A-NN` do dono no aparelho, e está declarado como fora do alcance deste portão.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CountryCode, Side } from '../core/index';
import { listTeams } from '../data/teams';
import { chaveamento, createTournament } from '../tournament/index';
import type { Disputa, Tournament, TournamentState } from '../tournament/index';
import type { Level } from '../cpu/index';
import { DISPUTAS_DE_GRUPO, POR_GRUPO } from '../tournament/fila';

/** As 32 reais de `D-51`. O torneio nunca recebe lista digitada à mão. */
const CODES: readonly CountryCode[] = listTeams().map((t) => t.code);
const HUMANO: CountryCode = 'BR';
const DISPUTAS = 64;
const COM_MATA_MATA = 56; // 48 de grupo + as 8 oitavas

function cfg(seed: number, human: CountryCode = HUMANO, level: Level = 'medium') {
  return { entrants: CODES, human, level, seed };
}

function em<T>(lista: readonly T[], i: number): T {
  const valor = lista[i];
  if (valor === undefined) throw new RangeError(`teste: índice ${String(i)} fora da faixa`);
  return valor;
}

/** O lado do jogador na disputa corrente. */
function ladoDo(t: Tournament): Side {
  const c = t.current();
  if (c === null) throw new Error('teste: não há disputa do jogador');
  return c.teams.A === HUMANO ? 'A' : 'B';
}

/** Joga até o fim com o jogador vencendo tudo. */
function ateOFim(t: Tournament): Tournament {
  while (t.current() !== null) t.report(ladoDo(t));
  return t;
}

/** O retrato logo depois de criado — grupos ainda abertos. */
function noComeco(seed: number): TournamentState {
  return createTournament(cfg(seed)).toJSON();
}

/**
 * Um retrato com a classificação **recém-fechada**: `groupOrder` cheio e nenhum resultado de
 * mata-mata ainda (`results` em exatamente 48).
 *
 * A semente é procurada, não fixada: só serve quando a primeira disputa do jogador no mata-mata
 * é a posição 48 da fila, e uma constante colada aqui sairia do ar em silêncio no dia em que o
 * motor mudasse um sorteio. A varredura é barata — a primeira semente que serve aparece cedo.
 */
function grupoRecemFechado(): TournamentState {
  for (let seed = 0; seed < 400; seed += 1) {
    const t = createTournament(cfg(seed));
    while (t.current() !== null) {
      if (t.toJSON().results.length === DISPUTAS_DE_GRUPO) return t.toJSON();
      t.report(ladoDo(t));
    }
  }
  throw new Error('teste: nenhuma semente em 400 parou com a classificação recém-fechada');
}

/* ─────────────────────────────── portão 1: pureza ─────────────────────────────── */

describe('M8 · `chaveamento` é pura — ler o chaveamento não move o gerador (`D-111`)', () => {
  it.each([0, 7, 42])('semente %i: duas chamadas dão listas iguais campo a campo', (seed) => {
    const state = noComeco(seed);
    expect(chaveamento(state)).toEqual(chaveamento(state));
  });

  it('o retrato sai idêntico ao que entrou, `consumed` inclusive', () => {
    // `consumed` é o campo que prova que ela não sorteou: fechar grupo pode chegar ao sorteio
    // de desempate (`D-53`), e uma leitura que fechasse grupo andaria o gerador — a linha do
    // tempo depois do recarregamento deixaria de bater com a de antes.
    const state = noComeco(9);
    const copia = structuredClone(state) as TournamentState;
    for (let i = 0; i < 10; i += 1) chaveamento(state);
    expect(state).toEqual(copia);
    expect(state.consumed).toBe(copia.consumed);
  });

  it('ler o chaveamento pelo torneio vivo também não move `consumed`', () => {
    const t = createTournament(cfg(9));
    const antes = t.toJSON().consumed;
    for (let i = 0; i < 10; i += 1) chaveamento(t.toJSON());
    expect(t.toJSON().consumed).toBe(antes);
  });

  it('a lista devolvida é congelada — quem lê não edita o chaveamento de M8', () => {
    const lista = chaveamento(noComeco(9));
    expect(Object.isFrozen(lista)).toBe(true);
    expect(Object.isFrozen(em(lista, 0))).toBe(true);
  });
});

/* ───────────────────── portão 2: só o que M8 já decidiu entra ───────────────────── */

describe('M8 · o comprimento é 48 → 56 → 64, e nunca um par que depende de resultado', () => {
  it('com `groupOrder` vazio são exatamente 48 — o mata-mata ainda não existe', () => {
    for (const seed of [0, 7, 42]) {
      const state = noComeco(seed);
      expect(state.groupOrder).toEqual([]);
      const lista = chaveamento(state);
      expect(lista).toHaveLength(DISPUTAS_DE_GRUPO);
      expect(lista.every((d) => d.stage === 'groups')).toBe(true);
    }
  });

  it('assim que a classificação fecha são exatamente 56 — as 8 oitavas, e nada além', () => {
    const state = grupoRecemFechado();
    expect(state.groupOrder).toHaveLength(32);
    expect(state.results).toHaveLength(DISPUTAS_DE_GRUPO);

    const lista = chaveamento(state);
    expect(lista).toHaveLength(COM_MATA_MATA);
    expect(lista.slice(DISPUTAS_DE_GRUPO).map((d) => d.stage)).toEqual(Array(8).fill('r16'));
  });

  it('com campeão são exatamente 64, na conta de fases de `D-53`', () => {
    const lista = chaveamento(ateOFim(createTournament(cfg(9))).toJSON());
    expect(lista).toHaveLength(DISPUTAS);

    const porFase = new Map<string, number>();
    for (const d of lista) porFase.set(d.stage, (porFase.get(d.stage) ?? 0) + 1);
    expect(Object.fromEntries(porFase)).toEqual({
      groups: 48,
      r16: 8,
      quarter: 4,
      semi: 2,
      third: 1,
      final: 1,
    });
  });

  /**
   * Quantas disputas precisam estar registradas para a posição `i` ter par decidido.
   *
   * Escrito aqui pela via do *esporte*, e não copiado de `index.ts`: as quartas e as semis são
   * decididas pelas duas disputas imediatamente anteriores da fase que as alimenta — daí
   * `2i - 62` —, e a de 3º lugar e a final saem das duas semis, que fecham na posição 62.
   * Um teste que importasse a fórmula do módulo não provaria nada sobre ela.
   */
  function precisaDe(i: number): number {
    if (i < 48) return 0;
    if (i < 56) return 48; // as oitavas dependem da classificação, não de um resultado a mais
    if (i < 62) return 2 * i - 62;
    return 62;
  }

  it('nenhuma disputa lida depende de resultado que ainda não veio', () => {
    // A conferência é sobre a fila inteira, a cada retrato do torneio: uma disputa que
    // aparecesse cedo teria par inventado — "a definir" virando seleção.
    const t = createTournament(cfg(3));
    let passos = 0;
    while (t.current() !== null) {
      const state = t.toJSON();
      const lista = chaveamento(state);
      for (let i = 0; i < lista.length; i += 1) {
        expect(
          state.results.length,
          `disputa ${String(i)} (${em(lista, i).stage}) apareceu antes do que a decide`,
        ).toBeGreaterThanOrEqual(precisaDe(i));
      }
      t.report(ladoDo(t));
      passos += 1;
    }
    expect(passos).toBeGreaterThanOrEqual(3);
  });

  it('a fase de grupos lida traz os 8 grupos, 6 disputas cada, sem par repetido (`D-57`)', () => {
    const lista = chaveamento(noComeco(11)).filter((d) => d.stage === 'groups');
    const pares = new Set<string>();
    const porGrupo = new Map<number, number>();
    for (const d of lista) {
      expect(d.group).toBeGreaterThanOrEqual(0);
      expect(d.group).toBeLessThan(8);
      porGrupo.set(d.group, (porGrupo.get(d.group) ?? 0) + 1);
      pares.add([d.teams.A, d.teams.B].sort().join('-'));
    }
    expect(pares.size).toBe(DISPUTAS_DE_GRUPO);
    expect([...porGrupo.values()]).toEqual(Array(8).fill(6));
  });

  it('no mata-mata `group` é -1 — grupo não é dado de fase eliminatória', () => {
    const lista = chaveamento(ateOFim(createTournament(cfg(9))).toJSON());
    for (const d of lista) {
      expect(d.group === -1).toBe(d.stage !== 'groups');
    }
  });
});

/* ────────────── portão 3: `winner` é o MESMO vencedor da linha do tempo ────────────── */

describe('M8 · `winner` bate com `group()` e `champion()` na mesma semente', () => {
  interface Linha {
    wins: number;
    goalsFor: number;
    goalsAgainst: number;
  }

  /** A tabela derivada do que `chaveamento` devolve — a mesma conta de `tabela.ts`. */
  function derivarGrupo(lista: readonly Disputa[], grupo: number): Map<CountryCode, Linha> {
    const linhas = new Map<CountryCode, Linha>();
    const linha = (code: CountryCode): Linha => {
      const atual = linhas.get(code) ?? { wins: 0, goalsFor: 0, goalsAgainst: 0 };
      linhas.set(code, atual);
      return atual;
    };
    for (const d of lista) {
      if (d.stage !== 'groups' || d.group !== grupo || d.winner === null) continue;
      const la = linha(d.teams.A);
      const lb = linha(d.teams.B);
      if (d.winner === 'A') la.wins += 1;
      else lb.wins += 1;
      // Placar ausente não entra no saldo — é a mesma regra de `GOLS_DESCONHECIDOS`.
      if (d.goals !== null) {
        la.goalsFor += d.goals.A;
        la.goalsAgainst += d.goals.B;
        lb.goalsFor += d.goals.B;
        lb.goalsAgainst += d.goals.A;
      }
    }
    return linhas;
  }

  it.each([9, 21])('semente %i: a tabela derivada da leitura é a tabela de `group()`', (seed) => {
    const t = ateOFim(createTournament(cfg(seed)));
    const state = t.toJSON();
    const lista = chaveamento(state);

    for (const code of state.entrants) {
      const grupo = Math.floor(state.entrants.indexOf(code) / POR_GRUPO);
      const derivada = derivarGrupo(lista, grupo);
      for (const oficial of t.group(code)) {
        const minha = derivada.get(oficial.code);
        expect(minha, `${String(oficial.code)} sumiu da leitura do grupo`).toBeDefined();
        expect({ code: oficial.code, ...minha }).toEqual({
          code: oficial.code,
          wins: oficial.wins,
          goalsFor: oficial.goalsFor,
          goalsAgainst: oficial.goalsAgainst,
        });
      }
    }
  });

  it.each([9, 21])('semente %i: o vencedor da final lido é o `champion()`', (seed) => {
    const t = ateOFim(createTournament(cfg(seed)));
    const lista = chaveamento(t.toJSON());
    const final = em(lista, DISPUTAS - 1);

    expect(final.stage).toBe('final');
    expect(final.winner).not.toBeNull();
    expect(final.winner === 'A' ? final.teams.A : final.teams.B).toBe(t.champion());
  });

  it('a leitura no meio já bate com a linha do tempo que veio depois', () => {
    // O retrato do meio e o do fim são o mesmo torneio: as disputas já lidas não podem mudar de
    // vencedor quando as seguintes acontecem.
    const t = createTournament(cfg(5));
    t.report(ladoDo(t));
    const meio = chaveamento(t.toJSON()).filter((d) => d.winner !== null);
    const fim = chaveamento(ateOFim(t).toJSON());

    expect(meio.length).toBeGreaterThan(0);
    for (let i = 0; i < meio.length; i += 1) {
      expect(em(fim, i)).toEqual(em(meio, i));
    }
  });
});

/* ───────────── portão 4: `goals` ausente SÓ nas disputas do jogador (`D-67`) ───────────── */

describe('M8 · `goals` é `null` exatamente nas disputas do jogador, e nunca `0` (`D-67`/`Q-13`)', () => {
  it.each([9, 21, 33])('semente %i: entre as jogadas, ausente ⇔ o jogador está no par', (seed) => {
    const lista = chaveamento(ateOFim(createTournament(cfg(seed))).toJSON());
    const jogadas = lista.filter((d) => d.winner !== null);
    expect(jogadas).toHaveLength(DISPUTAS);

    let doJogador = 0;
    for (const d of jogadas) {
      const temHumano = d.teams.A === HUMANO || d.teams.B === HUMANO;
      if (temHumano) doJogador += 1;
      expect(d.goals === null, `${String(d.teams.A)}x${String(d.teams.B)} (${d.stage})`).toBe(
        temHumano,
      );
    }
    // A conta do contrato: o jogador disputa de 3 a 7 das 64.
    expect(doJogador).toBeGreaterThanOrEqual(3);
    expect(doJogador).toBeLessThanOrEqual(7);
  });

  it('placar ausente é `null`, não `0` nem o sentinela `-1` vazando', () => {
    const lista = chaveamento(ateOFim(createTournament(cfg(9))).toJSON());
    for (const d of lista) {
      if (d.goals === null) continue;
      expect(d.goals.A).toBeGreaterThanOrEqual(0);
      expect(d.goals.B).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(d.goals.A) && Number.isInteger(d.goals.B)).toBe(true);
    }
    expect(lista.some((d) => d.goals === null)).toBe(true);
  });

  it('disputa ainda não jogada não tem vencedor nem placar inventado', () => {
    const naoJogadas = chaveamento(noComeco(9)).filter((d) => d.winner === null);
    expect(naoJogadas.length).toBeGreaterThan(0);
    for (const d of naoJogadas) expect(d.goals).toBeNull();
  });
});

/* ─────── portão 5: o retrato continua OPACO para M7 (`D-68`), varrido no disco ─────── */

describe('M8 · a opacidade de `D-68` — `src/ui/` não lê campo de `TournamentState`', () => {
  const DIR_UI = fileURLToPath(new URL('../ui', import.meta.url));

  function arquivosDeUi(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
      const alvo = join(dir, item.name);
      if (item.isDirectory()) return arquivosDeUi(alvo);
      return /\.(ts|css)$/.test(item.name) ? [alvo] : [];
    });
  }

  // O padrão é o do portão de `D-111`, copiado do contrato de M8 caractere por caractere.
  const PADRAO = /\.(entrants|groupOrder|results|goalsA|goalsB)\b/;
  const arquivos = arquivosDeUi(DIR_UI);

  it('src/ui/ tem arquivo (senão o teste passaria por vazio)', () => {
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it.each(arquivos)('%s não toca campo do retrato', (caminho) => {
    const infratoras = readFileSync(caminho, 'utf8')
      .split('\n')
      .filter((l) => PADRAO.test(l));
    expect(infratoras, `${caminho}: M7 lendo o retrato por dentro — é a saída (a) de P-3`).toEqual(
      [],
    );
  });

  it('o padrão ainda pega o que deve pegar', () => {
    // Sem esta linha, um erro de digitação acima deixaria o teste anterior vacuamente verde.
    expect(PADRAO.test('const n = state.res' + 'ults.length;')).toBe(true);
    expect(PADRAO.test('for (const c of salvo.entr' + 'ants) {')).toBe(true);
    expect(PADRAO.test('const d = chaveamento(salvo);')).toBe(false);
  });
});
