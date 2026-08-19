/**
 * M7 · o portão de `T-14` — o que a tela grava, e o que ela faz com o que leu.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * **Nenhuma tela é montável aqui**: `vitest` roda em Node, `document` não existe. O que este
 * arquivo cobra é a parte de `T-14` que NÃO precisa de navegador, e que é justamente a parte que
 * o portão nomeia por escrito:
 *
 *   1. o que vai para o `localStorage`, conferido contra **lista fechada de chaves**;
 *   2. o registro salvo tendo só **código de país e inteiro** — varrido valor a valor;
 *   3. torneio salvo que **não desserializa** sendo descartado em silêncio, com a chave apagada;
 *   4. **fechar e reabrir continua de onde parou** — gravar e restaurar entre as disputas do
 *      jogador chega ao MESMO campeão de quem não recarregou.
 *
 * O que sobra é do dono no aparelho real (`A-14`): se a tabela cabe em 360x640 e se dá para
 * jogar por toque. Isto aqui prova que a regra está escrita, não que ela pinta.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CountryCode, Side } from '../core/index';
import { createTournament } from '../tournament/index';
import type { Tournament } from '../tournament/index';
import { findTeam, listTeams } from '../data/teams';

import { gravarPreferencias } from '../ui/preferencias';
import { PADRAO } from '../ui/preferencias';
import {
  CHAVES_DE_M7,
  CHAVE_TORNEIO,
  gravarTorneio,
  limparTorneio,
  restaurarTorneio,
} from '../ui/torneio_salvo';
import {
  GOLS_AUSENTES,
  NOME_TORNEIO,
  NOTA_SEM_GOLS,
  golsDaLinha,
  nomeFase,
} from '../ui/rotulos';

/** `localStorage` de mentira, com `removeItem` — o registro do torneio é apagado de verdade. */
function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    removeItem: (k: string) => void dados.delete(k),
    chaves: () => [...dados.keys()],
    ver: (k: string) => dados.get(k) ?? null,
  };
}

function instalar(armazenamento: unknown): void {
  (globalThis as { window?: unknown }).window = { localStorage: armazenamento };
}

const SEMENTE = 9;

function torneioNovo(seed = SEMENTE): { torneio: Tournament; humana: CountryCode } {
  const catalogo = listTeams();
  const primeira = catalogo[0];
  if (primeira === undefined) throw new Error('catálogo vazio — este teste não tem o que montar');

  return {
    torneio: createTournament({
      entrants: catalogo.map((t) => t.code),
      human: primeira.code,
      level: 'medium',
      seed,
    }),
    humana: primeira.code,
  };
}

/** Joga o torneio até o fim reportando sempre o mesmo lado. Devolve o campeão. */
function ateOCampeao(torneio: Tournament, vencedor: Side): CountryCode | null {
  let voltas = 0;
  while (torneio.current() !== null) {
    torneio.report(vencedor);
    voltas += 1;
    if (voltas > 10) throw new Error('mais disputas do jogador que as 7 possíveis');
  }
  return torneio.champion();
}

beforeEach(() => instalar(armazenamentoFalso()));
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

// ── 1 e 2: o que M7 grava ──────────────────────────────────────────────────────────────────
describe('o que M7 grava no aparelho (portão de T-14)', () => {
  it('nenhuma chave fora da lista fechada, com as duas coisas gravadas', () => {
    const arm = armazenamentoFalso();
    instalar(arm);

    gravarPreferencias(PADRAO);
    const { torneio, humana } = torneioNovo();
    gravarTorneio({ torneio, humana, nivel: 'medium' });

    // A lista é fechada: o teste falha tanto por chave a mais quanto por chave que sumiu.
    expect(arm.chaves().sort()).toEqual([...CHAVES_DE_M7].sort());
  });

  it('o registro do torneio é só código de país e inteiro — zero texto livre', () => {
    const arm = armazenamentoFalso();
    instalar(arm);

    const { torneio, humana } = torneioNovo();
    torneio.report('A'); // uma disputa do jogador dentro do retrato, com placar ausente
    gravarTorneio({ torneio, humana, nivel: 'hard' });

    const cru = arm.ver(CHAVE_TORNEIO);
    expect(cru).not.toBeNull();

    const conhecidos = new Set(listTeams().map((t) => t.code));
    const problemas: string[] = [];

    const varrer = (valor: unknown, caminho: string): void => {
      if (Array.isArray(valor)) {
        valor.forEach((v, i) => varrer(v, `${caminho}[${String(i)}]`));
        return;
      }
      if (valor !== null && typeof valor === 'object') {
        for (const [k, v] of Object.entries(valor)) varrer(v, `${caminho}.${k}`);
        return;
      }
      if (typeof valor === 'number') {
        // Inteiro, nunca float: "placar e contadores em inteiro" é representação obrigatória.
        if (!Number.isInteger(valor)) problemas.push(`${caminho}: número não inteiro (${String(valor)})`);
        return;
      }
      if (typeof valor === 'string') {
        // Só código de país, e só código que M4 conhece HOJE. Data, nome de fase, nível como
        // texto ou qualquer identificador de aparelho cairiam aqui.
        if (!conhecidos.has(valor) || findTeam(valor) === undefined) {
          problemas.push(`${caminho}: texto que não é código de país (${JSON.stringify(valor)})`);
        }
        return;
      }
      problemas.push(`${caminho}: valor de tipo ${typeof valor}`);
    };

    varrer(JSON.parse(cru ?? 'null'), 'registro');
    expect(problemas).toEqual([]);
  });

  it('nada é gravado quando o armazenamento lança — e o jogo não cai junto', () => {
    instalar({
      getItem: () => null,
      setItem: () => {
        throw new Error('cota estourada');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });

    const { torneio, humana } = torneioNovo();
    expect(() => gravarTorneio({ torneio, humana, nivel: 'easy' })).not.toThrow();
    expect(() => limparTorneio()).not.toThrow();
    expect(restaurarTorneio()).toBeNull();
  });
});

// ── 3: retrato que não desserializa é descartado EM SILÊNCIO ───────────────────────────────
describe('torneio salvo ilegível é descartado em silêncio', () => {
  const LIXO: Readonly<Record<string, string>> = {
    'JSON pela metade': '{"v":1,"humana":"BR"',
    'registro de outra versão': JSON.stringify({ v: 99, humana: 'BR', nivel: 1, estado: {} }),
    'retrato ausente': JSON.stringify({ v: 1, humana: 'BR', nivel: 1 }),
    'nível fora da faixa': JSON.stringify({ v: 1, humana: 'BR', nivel: 7, estado: {} }),
    'retrato que não fecha': JSON.stringify({
      v: 1,
      humana: 'BR',
      nivel: 1,
      estado: { v: 1, seed: 1, consumed: 0, level: 1, human: 'BR', entrants: [] },
    }),
    'texto qualquer': 'nem json isto é',
  };

  it.each(Object.entries(LIXO))('%s: devolve null, não lança, e apaga a chave', (_nome, valor) => {
    const arm = armazenamentoFalso({ [CHAVE_TORNEIO]: valor });
    instalar(arm);

    expect(() => restaurarTorneio()).not.toThrow();
    expect(restaurarTorneio()).toBeNull();
    // Apagada: senão o mesmo lixo seria relido e redescartado em toda abertura do jogo.
    expect(arm.ver(CHAVE_TORNEIO)).toBeNull();
  });

  it('seleção gravada que não é a do torneio derruba o registro inteiro', () => {
    const arm = armazenamentoFalso();
    instalar(arm);

    const { torneio, humana } = torneioNovo();
    gravarTorneio({ torneio, humana, nivel: 'medium' });

    // Troca só a `humana` por outra seleção existente: o retrato continua válido, e é o
    // cruzamento com `current()` que pega a mentira.
    const outra = listTeams().find((t) => t.code !== humana);
    expect(outra).toBeDefined();
    const registro = JSON.parse(arm.ver(CHAVE_TORNEIO) ?? '{}') as Record<string, unknown>;
    const proxima = torneio.current();
    expect(proxima).not.toBeNull();
    const naoEstaNaProxima = listTeams()
      .map((t) => t.code)
      .find((c) => c !== proxima?.teams.A && c !== proxima?.teams.B);
    registro['humana'] = naoEstaNaProxima;
    arm.setItem(CHAVE_TORNEIO, JSON.stringify(registro));

    expect(restaurarTorneio()).toBeNull();
    expect(arm.ver(CHAVE_TORNEIO)).toBeNull();
  });

  it('sem nada gravado é o caminho normal, e ele também é null', () => {
    expect(restaurarTorneio()).toBeNull();
  });
});

// ── 4: fechar e reabrir continua de onde parou ─────────────────────────────────────────────
describe('o torneio sobrevive a fechar e reabrir o navegador (D-57)', () => {
  it('gravar e restaurar a cada disputa do jogador chega ao MESMO campeão', () => {
    const arm = armazenamentoFalso();
    instalar(arm);

    // A referência: um torneio inteiro sem nunca recarregar.
    const semReload = torneioNovo();
    const campeaoEsperado = ateOCampeao(semReload.torneio, 'A');
    expect(campeaoEsperado).not.toBeNull();

    // O mesmo torneio, gravado e restaurado ANTES de cada `report()` — que é exatamente o que
    // acontece quando a pessoa fecha o navegador entre duas disputas.
    let em = torneioNovo();
    gravarTorneio({ torneio: em.torneio, humana: em.humana, nivel: 'medium' });

    let voltas = 0;
    for (;;) {
      const lido = restaurarTorneio();
      expect(lido).not.toBeNull();
      if (lido === null) break;

      expect(lido.humana).toBe(em.humana);
      expect(lido.nivel).toBe('medium');

      if (lido.torneio.current() === null) {
        expect(lido.torneio.champion()).toBe(campeaoEsperado);
        break;
      }

      lido.torneio.report('A');
      gravarTorneio({ torneio: lido.torneio, humana: lido.humana, nivel: lido.nivel });
      em = { torneio: lido.torneio, humana: lido.humana };

      voltas += 1;
      expect(voltas).toBeLessThan(10);
    }
  });

  it('o retrato restaurado é idêntico ao gravado — M7 não interpreta campo nenhum dele', () => {
    const arm = armazenamentoFalso();
    instalar(arm);

    const { torneio, humana } = torneioNovo();
    torneio.report('B');
    gravarTorneio({ torneio, humana, nivel: 'hard' });

    const lido = restaurarTorneio();
    expect(lido).not.toBeNull();
    expect(lido?.torneio.toJSON()).toEqual(torneio.toJSON());
    expect(lido?.nivel).toBe('hard');
  });
});

// ── O texto das telas novas ────────────────────────────────────────────────────────────────
describe('rótulos do torneio', () => {
  it('toda fase tem nome, e nenhuma sai com undefined', () => {
    const fases = [
      nomeFase('groups', 1),
      nomeFase('groups', 3),
      nomeFase('r16', 4),
      nomeFase('quarter', 5),
      nomeFase('semi', 6),
      nomeFase('third', 7),
      nomeFase('final', 8),
    ];
    for (const texto of fases) {
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/undefined|NaN|\[object/);
    }
    // A rodada distingue as três da fase de grupos; as do mata-mata têm nome próprio.
    expect(new Set(fases).size).toBe(fases.length);
  });

  it('a linha do jogador não mostra zero de gols — mostra ausente (Q-13/D-67)', () => {
    const linha = { code: 'BR', wins: 1, goalsFor: 0, goalsAgainst: 0 };

    // O zero de M8 ali é ESTRUTURAL: as três disputas dessa linha são as do jogador, e nenhuma
    // delas tem placar. Mostrá-lo seria a tela dizendo um número que ninguém mediu.
    expect(golsDaLinha(linha, true)).toBe(GOLS_AUSENTES);
    expect(golsDaLinha(linha, true)).not.toMatch(/[0-9]/);

    // As outras três somam o que sabem — e isso é verdade, ainda que parcial.
    expect(golsDaLinha({ code: 'AR', wins: 2, goalsFor: 7, goalsAgainst: 4 }, false)).toBe('7 × 4');
    // Zero legítimo continua zero: quem não fez gol nas disputas medidas mostra 0.
    expect(golsDaLinha({ code: 'PT', wins: 0, goalsFor: 0, goalsAgainst: 5 }, false)).toBe('0 × 5');

    expect(NOTA_SEM_GOLS).toMatch(/gols/i);
    expect(NOTA_SEM_GOLS.length).toBeGreaterThan(20);
  });

  it('o nome da competição não é marca de terceiro', () => {
    // A varredura da lista-morta de `licenciamento` roda sobre `src/ui/` inteiro em `ui.test.ts`.
    // Aqui o alvo é o valor em si, que é o que aparece em três telas.
    expect(NOME_TORNEIO).toBe('TAP GO Cup');
    expect(NOME_TORNEIO).not.toMatch(/mundo|world|fi[fv]a/i);
  });
});
