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

import { PREFIXO_VISIVEL, idDaTentativa, rotuloDaTentativa } from '../medicao_sala';
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

    expect(src).toContain("from './medicao_sala'");
    expect(src).not.toMatch(/^function idDaTentativa/m);
  });
});

/**
 * `QA-09` — o guarda que torna o desencontro **visível**, já que ele não é evitável.
 *
 * O índice da rotação é contador local de cada aparelho. Nada no protocolo os sincroniza, e um
 * toque a mais de um dos lados produz exatamente o sintoma de um NAT simétrico: 20 s e `'failed'`.
 * O conserto de verdade mudaria o denominador da medição, que é `D-NN` do dono; o que cabe em
 * `T-15` é fazer os dois aparelhos mostrarem a mesma linha para o dono comparar.
 */
describe('QA-09 · rótulo de sincronia', () => {
  it('os dois aparelhos escrevem o mesmo rótulo para o mesmo n', () => {
    const base = newRoomId();

    for (let n = 0; n < N_MAX; n += 1) {
      expect(rotuloDaTentativa(base, n)).toBe(rotuloDaTentativa(base, n));
    }
  });

  it('o rótulo traz o índice e o prefixo do ID daquela tentativa', () => {
    const base = newRoomId();

    for (let n = 0; n < N_MAX; n += 1) {
      const esperado = idDaTentativa(base, n).slice(0, PREFIXO_VISIVEL);

      expect(rotuloDaTentativa(base, n)).toBe(`#${n} · ${esperado}`);
    }
  });

  it('índices diferentes dão rótulos diferentes — é o que faz o desencontro aparecer', () => {
    // Precisa valer SEMPRE, e é por isso que o índice está no rótulo: só o prefixo não serve.
    // Seis caracteres de duas rotações da mesma base podem coincidir, e nesse dia duas telas
    // dessincronizadas leriam igual — o guarda mentiria exatamente quando fosse necessário.
    const base = newRoomId();
    const vistos = new Set<string>();

    for (let n = 0; n < N_MAX; n += 1) vistos.add(rotuloDaTentativa(base, n));

    expect(vistos.size).toBe(N_MAX);
  });

  it('o rótulo nunca expõe mais que 6 caracteres do ID', () => {
    // O ID inteiro é a credencial de entrada na sala, e print de tela viaja. Mesmo corte do `tag`
    // de M6, e o teste existe para que "mostrar o ID para depurar" não cresça sozinho depois.
    expect(PREFIXO_VISIVEL).toBe(6);

    for (let i = 0; i < 200; i += 1) {
      const base = newRoomId();
      for (let n = 0; n < N_MAX; n += 1) {
        const id = idDaTentativa(base, n);
        const rotulo = rotuloDaTentativa(base, n);

        expect(rotulo).not.toContain(id);
        expect(rotulo).toContain(id.slice(0, 6));
        expect(rotulo).not.toContain(id.slice(0, 7));
      }
    }
  });

  it('a tela de medição pinta o rótulo nos dois papéis', () => {
    const src = fonte();

    // O elemento existe no HTML montado...
    expect(src).toContain('id="sinc"');
    // ...e é `pintar()` quem o escreve, que roda nos dois papéis e a cada troca de modo.
    expect(src).toMatch(/\$\('sinc'\)\.textContent/);
    expect(src).toContain('rotuloDaTentativa(base,');
  });

  it('o rótulo lê o índice da rotação, não o contador de estatística', () => {
    // Depois de `QA-12` são duas variáveis distintas. Se o rótulo voltasse a ler `tentativas`,
    // ele mostraria um número e a tentativa usaria outro — um guarda que aponta para a sala errada
    // é pior que guarda nenhum.
    const src = fonte();

    expect(src).toContain('rotuloDaTentativa(base, indice)');
    expect(src).not.toContain('rotuloDaTentativa(base, cSinc');
  });

  it('o rótulo é escrito fora do bloco que separa anfitrião de convidado', () => {
    // `montar()` tem um `if (papel === 'guest') … else …` que pinta caixas diferentes. Se o
    // rótulo morasse lá dentro, um dos aparelhos ficaria sem ele — e um guarda que só aparece de
    // um lado não é comparação, é decoração.
    const src = fonte();
    const corpoPintar = src.slice(src.indexOf('function pintar('), src.indexOf('function montar('));

    expect(corpoPintar).toContain("$('sinc').textContent");
    expect(corpoPintar).not.toContain("papel === 'guest'");
  });
});

/**
 * `QA-12` — sortear sala nova sem recarregar não reiniciava a rotação.
 *
 * Achado **em campo**, não em teste, e é o tipo de defeito que teste de unidade não pega: as duas
 * variáveis eram a mesma (`contadores[modo].tentativas`), e uma variável só não tem como zerar em
 * dois momentos diferentes. O anfitrião ficava no índice 4 com a sala nova; o convidado abria o
 * link novo numa página limpa, no índice 0. Vinte segundos, e o resultado entrando na planilha
 * como falha de rede — o viés de `QA-08` por outra porta.
 *
 * O estado mora dentro de `medicao.ts`, que é entrada de página e não exporta nada, então o que
 * dá para cobrar aqui é a **origem**. É de propósito: o defeito era estrutural (um número com dois
 * donos), e é a estrutura que estes testes prendem.
 */
describe('QA-12 · o índice da rotação é separado da estatística', () => {
  it('existe um índice próprio, e a tentativa endereça a sala por ele', () => {
    const src = fonte();

    expect(src).toMatch(/^let indice = 0;$/m);
    expect(src).toContain('idDaTentativa(base, indice)');
    // A forma exata do defeito: endereçar a sala pelo contador de estatística.
    expect(src).not.toContain('idDaTentativa(base, c.tentativas)');
  });

  it('sortear sala nova reinicia a rotação', () => {
    const src = fonte();
    const handler = src.slice(src.indexOf("$('abrir').addEventListener"), src.indexOf("$('tentar').addEventListener"));

    expect(handler).toContain('base = r.roomId');
    expect(handler).toContain('indice = 0');
  });

  it('zerar contadores reinicia a rotação — é a recuperação que a tela manda fazer', () => {
    const src = fonte();
    const handler = src.slice(src.indexOf("$('zerar').addEventListener"), src.indexOf("$('copiar').addEventListener"));

    expect(handler).toContain('indice = 0');
  });

  it('o índice anda mesmo quando a tentativa falha', () => {
    // Se só andasse no sucesso, uma falha de um lado só desencontraria os dois — e falha é
    // justamente o que a medição existe para contar.
    const src = fonte();
    const corpo = src.slice(src.indexOf('async function rodarUma'), src.indexOf('const pct ='));
    const posIncremento = corpo.indexOf('indice += 1');
    const posCondicional = corpo.indexOf('if (ok)');

    expect(posIncremento).toBeGreaterThan(-1);
    expect(posIncremento).toBeLessThan(posCondicional);
  });

  it('o resumo colável traz o índice, para cruzar os dois aparelhos', () => {
    expect(fonte()).toContain('índice: ${indice}');
  });
});
