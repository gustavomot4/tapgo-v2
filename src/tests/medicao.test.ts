/**
 * Portão de `T-15` — a página de medição de E-4 (`D-33`).
 *
 * Este arquivo **não** mede taxa de conexão: esse número é do dono, com dois aparelhos e rede de
 * operadora, e está declarado assim no PLANO. O que ele cobre é o degrau anterior — que os dois
 * aparelhos apontem para a MESMA sala. Sem isso a medição roda, produz número, e o número é 0%
 * por defeito do instrumento (`QA-08`), que é o pior resultado possível: falso e crível.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { idDaTentativa } from '../medicao_sala';
import { newRoomId } from '../net/index';

const MEDICAO_TS = fileURLToPath(new URL('../medicao.ts', import.meta.url));
const fonte = (): string => readFileSync(MEDICAO_TS, 'utf8');

/**
 * Copiado de `src/net/index.ts` de propósito, e é a única duplicação aceita aqui: se M6 apertar o
 * formato do ID e a rotação deixar de passar, este teste tem de reprovar — o que ele não pode é
 * importar a constante e passar por construção.
 */
const ROOM_ID_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/** Quantas tentativas o teste cobre. 30 > 26 de propósito: passa pela volta da rotação. */
const N_MAX = 30;

describe('D-38 · os dois aparelhos derivam a mesma sala', () => {
  /**
   * O coração de `QA-08`. Anfitrião e convidado são dois processos que nunca conversam: tudo que
   * compartilham é a base colada do link. Se a derivação não for função apenas de `(base, n)`,
   * eles se perdem — e se perdem em silêncio, com cara de NAT simétrico.
   */
  it.each(Array.from({ length: N_MAX }, (_, n) => n))(
    'anfitrião e convidado chegam ao mesmo ID em n = %i',
    (n) => {
      const base = newRoomId();

      // Duas chamadas independentes, como nos dois aparelhos.
      const noAnfitriao = idDaTentativa(base, n);
      const noConvidado = idDaTentativa(base, n);

      expect(noConvidado).toBe(noAnfitriao);
    },
  );

  it('a mesma base dá a mesma sequência inteira em duas execuções', () => {
    const base = newRoomId();
    const seq = (): string[] => Array.from({ length: N_MAX }, (_, n) => idDaTentativa(base, n));

    expect(seq()).toEqual(seq());
  });

  it('bases diferentes não colidem em nenhum n', () => {
    // Se colidissem, dois pares medindo ao mesmo tempo cairiam na mesma sala e um veria o peer
    // do outro como sucesso. A medição inteira perderia o sentido.
    const a = newRoomId();
    const b = newRoomId();

    for (let n = 0; n < N_MAX; n += 1) {
      expect(idDaTentativa(a, n)).not.toBe(idDaTentativa(b, n));
    }
  });

  it('todo ID derivado ainda é aceito pelo formato de M6', () => {
    // É a premissa que `D-38` comprou: rotação devolve ID válido, então `joinRoom` aceita e a
    // porta congelada de `D-13` não precisa mudar. Se isto cair, `D-38` cai junto.
    for (let i = 0; i < 200; i += 1) {
      const base = newRoomId();
      for (let n = 0; n < N_MAX; n += 1) {
        expect(idDaTentativa(base, n)).toMatch(ROOM_ID_RE);
      }
    }
  });

  it('n = 0 é a própria base, e a rotação só reordena', () => {
    const base = newRoomId();
    const ordenado = (s: string): string => [...s].sort().join('');

    expect(idDaTentativa(base, 0)).toBe(base);
    for (let n = 1; n < N_MAX; n += 1) {
      expect(ordenado(idDaTentativa(base, n))).toBe(ordenado(base));
    }
  });

  it('a rotação repete a sala a cada 26 tentativas — limite declarado, não consertado', () => {
    // Não é o comportamento desejado; é o comportamento REAL. Já estava declarado na auditoria de
    // 2026-08-08 (changelog), que mediu o estrago: com o piso de 30 tentativas de `A-08`, as
    // quatro últimas reentram em salas já usadas. Fica fixado aqui para que consertá-lo seja
    // decisão visível do dono, e não efeito colateral de outra tarefa.
    const base = newRoomId();

    expect(idDaTentativa(base, 26)).toBe(idDaTentativa(base, 0));
    expect(idDaTentativa(base, 29)).toBe(idDaTentativa(base, 3));
  });
});

/**
 * O portão que o dono nomeou, cobrado por leitura do disco.
 *
 * `QA-08` não era um erro de lógica dentro de uma função — era uma função ERRADA sendo chamada.
 * Nenhum teste de unidade da derivação o pegaria: ela já estava certa e já era determinística; o
 * anfitrião simplesmente jogava fora o que ela devolvia. O que pega esse defeito é olhar a linha
 * que abre o canal. É o mesmo recurso que `ui.test.ts` e `core.test.ts` usam para os portões de
 * camada — portão que só existe no terminal do dono é portão que ninguém roda.
 */
describe('D-38 · portão de origem em src/medicao.ts', () => {
  it("grep -c 'hostRoom(' devolve 1", () => {
    const linhas = fonte()
      .split('\n')
      .filter((l) => l.includes('hostRoom('));

    expect(linhas).toHaveLength(1);
  });

  it('a única chamada de hostRoom é a que sorteia a base, e está fora de tentativa()', () => {
    const src = fonte();
    const corpo = src.slice(src.indexOf('function tentativa('), src.indexOf('async function rodarUma'));

    expect(corpo).not.toContain('hostRoom(');
    expect(corpo).toContain('joinRoom(id, ice)');
  });

  it('o papel do aparelho não escolhe mais por qual porta o canal abre', () => {
    const src = fonte();
    const corpo = src.slice(src.indexOf('function tentativa('), src.indexOf('async function rodarUma'));

    // A forma exata do defeito: `papel === 'host' ? hostRoom(...) : joinRoom(...)`.
    expect(corpo).not.toMatch(/papel\s*===\s*'host'\s*\?/);
  });

  it('a derivação vem do módulo puro, não de uma cópia local', () => {
    const src = fonte();

    expect(src).toContain("import { idDaTentativa } from './medicao_sala'");
    expect(src).not.toMatch(/^function idDaTentativa/m);
  });
});
