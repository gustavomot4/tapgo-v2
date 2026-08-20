import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Este arquivo importa de `../session/index`, `../core/index` e `../data/teams` — e de mais
// NADA. Se um `import` de `../engine`, `../cpu` ou `../net` entrar em `src/ui/`, o teste de
// camada logo abaixo reprova, e reprova por leitura do disco, não por convenção.
import { createSession } from '../session/index';
import type { Level, MatchState, Session } from '../session/index';
import type { Side, Zone } from '../core/index';
import { listTeams } from '../data/teams';

import { criarDerivacao, outroLado } from '../ui/derivacao';
import { FORMATO_SALA, PARAM_SALA, linkDaSala, salaDoEndereco, salaLegivel } from '../ui/convite';
import { newRoomId } from '../session/index';
import type { Vez } from '../ui/derivacao';
import {
  descricaoFase,
  desfecho,
  instrucao,
  instrucaoDoSorteio,
  marcaSelecao,
  nomeSelecao,
  nomeZona,
  placar,
  resultadoUltimaCobranca,
  rotuloZona,
  sorteioDoPrimeiro,
} from '../ui/rotulos';
import { PADRAO, lerPreferencias, gravarPreferencias, selecaoInicial } from '../ui/preferencias';
import {
  ALFABETO,
  BATEDOR_CHUTE,
  BATEDOR_PARADO,
  BOLA,
  GOLEIRO_MERGULHO,
  GOLEIRO_PARADO,
  dimensoes,
  hsl,
  matizDistinto,
  paleta,
  SEPARACAO_MINIMA,
} from '../ui/sprites';
import type { Papel, Sprite } from '../ui/sprites';
import type { Preferencias } from '../ui/preferencias';

const DIR_UI = fileURLToPath(new URL('../ui', import.meta.url));

/**
 * Todo arquivo de código de `src/ui/`, recursivo.
 *
 * Fora dos `describe` porque DOIS portões de M7 leem o disco: o de camada (`D-01`) e o textual de
 * `QA-15`. Cada um com a sua varredura sairiam do ar em silêncio no dia em que uma pasta nova
 * aparecesse em só uma das listas.
 */
function arquivosDeUi(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const alvo = join(dir, item.name);
    if (item.isDirectory()) return arquivosDeUi(alvo);
    return /\.(ts|css)$/.test(item.name) ? [alvo] : [];
  });
}

const BR = 'BR';
const AR = 'AR';
const TIMES: Readonly<Record<Side, string>> = { A: BR, B: AR };

/** Roteiro reproduzível — nenhum gerador nativo dentro de teste. */
function roteiro(n: number, offset: number): Zone[] {
  const zonas: readonly Zone[] = ['L', 'C', 'R'];
  const out: Zone[] = [];
  for (let i = 0; i < n; i += 1) {
    const z = zonas[(i * 5 + offset) % 3];
    if (z === undefined) throw new Error('roteiro: índice fora da faixa');
    out.push(z);
  }
  return out;
}

// ── O portão de camada de M7, cobrado por leitura do disco ─────────────────────────────────
// O contrato de M7 diz: "`grep` por import de `src/engine`, `src/cpu` ou `src/net` dentro de
// `src/ui/` retorna zero (os tipos vêm de M5)". Um portão que só existe no terminal do dono é
// um portão que ninguém roda; aqui ele roda em toda suíte.
describe('portão de camada de M7 (D-01)', () => {
  const arquivos = arquivosDeUi(DIR_UI);

  it('src/ui/ tem arquivo (senão o teste passaria por vazio)', () => {
    expect(arquivos.length).toBeGreaterThan(5);
  });

  // O padrão é COPIADO de `.github/workflows/pages.yml`, caractere por caractere, e é largo de
  // propósito: qualquer linha de `import`/`export` que contenha `engine`, `cpu` ou `net` antes
  // do `;` reprova, mesmo sem haver import de motor.
  //
  // Ele mora aqui porque a primeira versão deste teste usava um padrão MAIS ESTREITO (só o
  // caminho do módulo entre aspas) e passava verde enquanto o CI reprovava a linha
  // `export type ModoJogavel` de `derivacao.ts`. Teste mais frouxo que o portão que diz cobrir
  // não protege nada — ele só adia a descoberta para o CI.
  const PADRAO_DO_CI = /^[ \t]*(import|export)[^;]*(engine|cpu|net)/;

  it.each(arquivos)('%s passa no padrão de camada do CI', (caminho) => {
    const infratoras = readFileSync(caminho, 'utf8')
      .split('\n')
      .filter((l) => PADRAO_DO_CI.test(l));

    expect(infratoras, `${caminho}: linha de import/export alcançada pelo portão`).toEqual([]);
  });

  it('o padrão copiado do CI ainda pega o que deve pegar', () => {
    // Sem esta linha, um erro de digitação no regex acima tornaria o teste anterior vacuamente
    // verde — que é a mesma classe de falha que deixou o CI descobrir isto antes da suíte.
    expect(PADRAO_DO_CI.test("export type M = 'c" + "pu' | 'local';")).toBe(true);
    expect(PADRAO_DO_CI.test("import { play } from '../eng" + "ine/index';")).toBe(true);
    expect(PADRAO_DO_CI.test("import { createSession } from '../session/index';")).toBe(false);
  });

  it('nenhum termo da lista-morta de licenciamento aparece em src/ui/', () => {
    // As agulhas são montadas em tempo de execução, como em `core.test.ts`: escritas por extenso
    // aqui, elas apareceriam na própria varredura de marca do portão de M7 e o reprovariam a
    // partir do arquivo que existe para cobrá-lo. Ver `QA-05`.
    const proibido = new RegExp(
      [
        ['fi', 'fa'].join(''),
        ['copa do', 'mundo'].join(' '),
        ['world', 'cup'].join(' '),
        ['brasileir', '[ãa]o'].join(''),
        ['liberta', 'dores'].join(''),
        ['champions', 'league'].join(' '),
      ].join('|'),
      'i',
    );

    for (const caminho of arquivos) {
      expect(readFileSync(caminho, 'utf8'), caminho).not.toMatch(proibido);
    }
  });
});

// ── Q-09: a derivação de quem escolhe ──────────────────────────────────────────────────────
describe('derivação da vez (Q-09)', () => {
  /** Liga a derivação a uma sessão de verdade — é assim que a tela a usa. */
  function comSessao(modo: 'cpu' | 'local', ladoLocal: Side, nivel?: Level) {
    const derivacao = criarDerivacao(modo, ladoLocal);
    const sessao: Session =
      modo === 'cpu' && nivel !== undefined
        ? createSession({ mode: 'cpu', seed: 7, level: nivel, teams: TIMES, localSide: ladoLocal })
        : createSession({ mode: 'local', seed: 7, teams: TIMES, localSide: ladoLocal });

    let estado: MatchState = sessao.state();
    sessao.subscribe((s) => {
      estado = s;
      derivacao.aoNotificar(s);
    });

    return {
      vez: (): Vez | null => derivacao.vez(estado),
      escolher: (z: Zone) => sessao.choose(z),
      estado: () => estado,
      dispose: () => sessao.dispose(),
    };
  }

  it('no modo local, o primeiro toque é chute e o segundo é defesa do OUTRO lado', () => {
    const j = comSessao('local', 'A');

    expect(j.vez()).toEqual({ lado: 'A', papel: 'chutar', pendente: false });

    j.escolher('L');
    // Nenhuma cobrança chegou a M2, e mesmo assim a vez virou: é a derivação por `kicks.length`.
    expect(j.estado().kicks.length).toBe(0);
    expect(j.vez()).toEqual({ lado: 'B', papel: 'defender', pendente: true });

    j.escolher('C');
    expect(j.estado().kicks.length).toBe(1);
    expect(j.vez()).toEqual({ lado: 'B', papel: 'chutar', pendente: false });

    j.dispose();
  });

  it('no modo local, quem defende é sempre o oposto de quem cobra, cobrança após cobrança', () => {
    const j = comSessao('local', 'A');

    for (const zona of roteiro(20, 1)) {
      const estado = j.estado();
      if (estado.phase === 'finished') break;

      const vez = j.vez();
      expect(vez).not.toBeNull();
      if (vez === null) break;

      const cobrador = estado.turn;
      expect(cobrador).not.toBeNull();
      if (cobrador === null) break;

      // A invariante: pendente ⇒ quem escolhe é o oposto do cobrador, e o papel é defender.
      if (vez.pendente) {
        expect(vez.lado).toBe(outroLado(cobrador));
        expect(vez.papel).toBe('defender');
      } else {
        expect(vez.lado).toBe(cobrador);
        expect(vez.papel).toBe('chutar');
      }

      j.escolher(zona);
    }

    j.dispose();
  });

  it('no modo cpu quem escolhe é sempre o lado local, e nunca há escolha pendente', () => {
    for (const ladoLocal of ['A', 'B'] as const) {
      const j = comSessao('cpu', ladoLocal, 'medium');

      for (const zona of roteiro(14, 2)) {
        if (j.estado().phase === 'finished') break;
        const vez = j.vez();
        expect(vez).not.toBeNull();
        if (vez === null) break;

        expect(vez.lado).toBe(ladoLocal);
        expect(vez.pendente).toBe(false);
        expect(vez.papel).toBe(j.estado().turn === ladoLocal ? 'chutar' : 'defender');

        j.escolher(zona);
      }

      j.dispose();
    }
  });

  /**
   * Pares (chute, defesa) que **terminam** a disputa.
   *
   * Um roteiro plano qualquer não serve: com chute sempre diferente da defesa toda cobrança é
   * gol, a fase regular fecha 5×5 e as alternadas empatam para sempre. Aqui a defesa acerta o
   * chute a cada três cobranças, o que garante uma rodada decisiva.
   */
  function paresQueTerminam(cobrancas: number): Zone[] {
    const zonas: readonly Zone[] = ['L', 'C', 'R'];
    const em = (i: number): Zone => {
      const z = zonas[i % 3];
      if (z === undefined) throw new Error('paresQueTerminam: índice fora da faixa');
      return z;
    };
    const out: Zone[] = [];
    for (let k = 0; k < cobrancas; k += 1) out.push(em(k), em(k * 2 + 1));
    return out;
  }

  it('disputa encerrada não tem vez — a tela não pode oferecer um quarto toque', () => {
    const j = comSessao('local', 'A');
    for (const zona of paresQueTerminam(40)) {
      if (j.estado().phase === 'finished') break;
      j.escolher(zona);
    }
    expect(j.estado().phase).toBe('finished');
    expect(j.vez()).toBeNull();
    j.dispose();
  });
});

// ── Rótulos: nada de undefined/NaN, e nenhum float no placar ───────────────────────────────
describe('rótulos', () => {
  function estadoFalso(parcial: Partial<MatchState>): MatchState {
    return {
      kicks: [],
      goals: { A: 0, B: 0 },
      taken: { A: 0, B: 0 },
      phase: 'regular',
      turn: 'A',
      winner: null,
      ...parcial,
    } as MatchState;
  }

  it('nome de seleção fora do catálogo devolve o código, nunca "undefined"', () => {
    expect(nomeSelecao(BR)).not.toContain('undefined');
    expect(nomeSelecao('ZZ')).toBe('ZZ');
  });

  it('a marca é bandeira, e o caminho dela é local — nunca URL (QA-19)', () => {
    // Terceira condição deste mesmo teste, e o teste nunca foi apagado. Cobrava `ehBandeira ===
    // false` e `texto === código`, condição de quando `flag` era `null` para as 32 (`D-22`);
    // `T-19` derrubou isso e ela virou `texto` casando `/\.svg$/`, com a tela ainda escrevendo o
    // caminho como texto. Agora `marca()` lê `ehBandeira` e pinta `<img>`, então o que sobra a
    // vigiar é o CONTEÚDO do campo: que ele seja caminho de arquivo local, e não URL — `D-62` diz
    // que hotlink foi o defeito de licença da v1. Quem cobra a leitura da tela é a varredura de
    // fonte mais abaixo, porque `vitest` roda sem DOM e `marca()` não é chamável aqui.
    const m = marcaSelecao(BR);
    expect(m.ehBandeira).toBe(true);
    expect(m.texto).toMatch(/\.svg$/);
    expect(m.texto).not.toMatch(/^(?:https?:)?\/\//);
    expect(Number.isInteger(m.matiz)).toBe(true);
    expect(m.matiz).toBeGreaterThanOrEqual(0);
    expect(m.matiz).toBeLessThan(360);
  });

  it('nenhuma das 32 cai no ramo do código — inclusive GB-ENG, de 6 caracteres (QA-18)', () => {
    // `QA-18` é o disco de 34px estourado pelo código de 6 caracteres de `D-52`. Ele deixa de
    // acontecer por dois motivos independentes, e os dois são cobrados: nenhuma seleção usa o ramo
    // do código (aqui), e o ramo do código não estoura mais o disco quando for usado (a varredura
    // do CSS, mais abaixo). Um só dos dois seria promessa: o tipo de `flag` ainda admite `null`.
    const times = listTeams();
    expect(times).toHaveLength(32);

    const noRamoDoCodigo = times.filter((t) => !marcaSelecao(t.code).ehBandeira);
    expect(noRamoDoCodigo.map((t) => t.code)).toEqual([]);

    // O caso caro, nomeado: é o único código do catálogo com mais de 2 caracteres.
    const longos = times.filter((t) => t.code.length > 2).map((t) => t.code);
    expect(longos).toEqual(['GB-ENG']);
    expect(marcaSelecao('GB-ENG').ehBandeira).toBe(true);

    for (const time of times) {
      const m = marcaSelecao(time.code);
      expect(m.texto, time.code).toMatch(/\.svg$/);
      expect(m.texto, time.code).not.toMatch(/^(?:https?:)?\/\//);
    }
  });

  it('duas seleções diferentes não abrem com o mesmo matiz', () => {
    expect(marcaSelecao(BR).matiz).not.toBe(marcaSelecao(AR).matiz);
  });

  it('o placar sai em inteiro, sem casa decimal', () => {
    const texto = placar(estadoFalso({ goals: { A: 3, B: 2 } }));
    expect(texto).toBe('3 × 2');
    expect(texto).not.toMatch(/[.,]\d/);
  });

  it('nenhum rótulo devolve texto vazio, "undefined" ou "NaN"', () => {
    const amostras = [
      descricaoFase(estadoFalso({})),
      descricaoFase(estadoFalso({ phase: 'suddenDeath', taken: { A: 6, B: 5 }, turn: 'B' })),
      descricaoFase(estadoFalso({ phase: 'finished', turn: null })),
      desfecho(estadoFalso({ phase: 'finished', turn: null }), TIMES),
      desfecho(estadoFalso({ phase: 'finished', turn: null, winner: 'A' }), TIMES),
      instrucao('chutar'),
      instrucao('defender'),
      nomeZona('L'),
      rotuloZona('R', 'defender'),
    ];

    for (const texto of amostras) {
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('descrição da fase conta a cobrança do lado que cobra, e não o total', () => {
    expect(descricaoFase(estadoFalso({ taken: { A: 2, B: 3 }, turn: 'A' }))).toBe('Cobrança 3 de 5');
    expect(descricaoFase(estadoFalso({ taken: { A: 2, B: 3 }, turn: 'B' }))).toBe('Cobrança 4 de 5');
  });

  it('sem cobrança nenhuma não há resultado a anunciar', () => {
    expect(resultadoUltimaCobranca(estadoFalso({}))).toBeNull();
  });
});

// ── D-48 / QA-15: a tela LÊ o sorteio, não o promete ───────────────────────────────────────
describe('sorteio de quem cobra primeiro (D-48 / QA-15)', () => {
  /**
   * A primeira semente, a partir de 1, que faz M5 sortear `lado`.
   *
   * Procurada em vez de fixada de propósito: semente escrita à mão neste arquivo viraria uma
   * segunda cópia do sorteio de M5, e passaria a mentir no dia em que o gerador mudasse. Aqui o
   * teste pergunta a M5 e usa a resposta.
   */
  function sementeQueSorteia(lado: Side): number {
    for (let semente = 1; semente <= 200; semente += 1) {
      const s = createSession({ mode: 'local', seed: semente, teams: TIMES, localSide: 'A' });
      const sorteado = s.state().turn;
      s.dispose();
      if (sorteado === lado) return semente;
    }
    throw new Error(`nenhuma semente até 200 sorteou ${lado} — o sorteio não é uniforme`);
  }

  it('o anúncio nomeia o lado sorteado — e os DOIS lados acontecem', () => {
    for (const lado of ['A', 'B'] as const) {
      const sessao = createSession({
        mode: 'local',
        seed: sementeQueSorteia(lado),
        teams: TIMES,
        localSide: 'A',
      });
      const anuncio = sorteioDoPrimeiro(sessao.state(), TIMES);
      sessao.dispose();

      // Se a função voltasse a devolver um lado constante, um dos dois giros reprovaria aqui —
      // que é a regressão exata que `QA-15` descreve.
      expect(anuncio?.lado).toBe(lado);
      expect(anuncio?.texto).toBe(`${nomeSelecao(TIMES[lado])} cobra primeiro`);
    }
  });

  it('no modo cpu o anúncio segue o mesmo sorteio, com o mesmo texto', () => {
    for (const lado of ['A', 'B'] as const) {
      const semente = sementeQueSorteia(lado);
      const sessao = createSession({
        mode: 'cpu',
        seed: semente,
        level: 'medium',
        teams: TIMES,
        localSide: 'A',
      });
      const anuncio = sorteioDoPrimeiro(sessao.state(), TIMES);
      sessao.dispose();

      expect(anuncio?.lado).toBe(lado);
    }
  });

  it('a partir da 1ª cobrança resolvida não há mais o que anunciar', () => {
    const sessao = createSession({ mode: 'local', seed: 3, teams: TIMES, localSide: 'A' });
    let estado: MatchState = sessao.state();
    sessao.subscribe((s) => {
      estado = s;
    });

    expect(sorteioDoPrimeiro(estado, TIMES)).not.toBeNull();

    // Modo `local`: chute e defesa da MESMA cobrança. Só o segundo toque resolve o pênalti.
    sessao.choose('L');
    expect(estado.kicks).toHaveLength(0);
    expect(sorteioDoPrimeiro(estado, TIMES)).not.toBeNull();

    sessao.choose('R');
    expect(estado.kicks).toHaveLength(1);
    expect(sorteioDoPrimeiro(estado, TIMES)).toBeNull();

    sessao.dispose();
  });

  it('disputa encerrada não anuncia sorteio nenhum', () => {
    const encerrada = {
      kicks: [],
      goals: { A: 0, B: 0 },
      taken: { A: 0, B: 0 },
      phase: 'finished',
      turn: null,
      winner: 'A',
    } as unknown as MatchState;

    expect(sorteioDoPrimeiro(encerrada, TIMES)).toBeNull();
  });

  it('a frase do sorteio muda com o papel em cpu, e nenhuma delas sai vazia', () => {
    const amostras = [
      instrucaoDoSorteio('cpu', 'chutar'),
      instrucaoDoSorteio('cpu', 'defender'),
      instrucaoDoSorteio('local', 'chutar'),
      instrucaoDoSorteio('local', 'defender'),
    ];

    for (const texto of amostras) {
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/undefined|NaN|\[object/);
    }

    // Em `cpu` a frase é sobre a pessoa, e ela precisa distinguir cobrar de defender.
    expect(amostras[0]).not.toBe(amostras[1]);
    // Em `local` os dois lados são deste aparelho: a frase é a mesma para os dois papéis.
    expect(amostras[2]).toBe(amostras[3]);
  });

  // ── O portão textual de `QA-15`, cobrado por leitura do disco ────────────────────────────
  // "Nenhuma promessa de ordem fixa sobrando em M7" é um portão sobre TEXTO, e texto some do
  // radar assim que a sessão fecha. Aqui ele volta a ser cobrado em toda suíte.
  // O sujeito pode vir cercado de crase e aspas (`'A'`), porque em comentário deste projeto ele
  // quase sempre vem — foi assim que a promessa de `QA-15` estava escrita.
  const PROMESSA_DE_ORDEM_FIXA =
    /\b(?:A|voc[êe]|humano)['"`´]*\s+(?:cobra|come[çc]a|bate)\s+primeir/i;
  const CONSTANTE_DO_MOTOR = /\bFIRST\b/;

  it('o padrão pega a promessa que existia antes (senão o teste seria verde à toa)', () => {
    // A frase abaixo é a que estava em `rotas.ts` e em `tela_selecoes.ts` até T-17b.
    expect(PROMESSA_DE_ORDEM_FIXA.test("`'A'` cobra primeiro (`FIRST` de M2)")).toBe(true);
    expect(PROMESSA_DE_ORDEM_FIXA.test('Você cobra primeiro. O computador defende.')).toBe(true);
    expect(CONSTANTE_DO_MOTOR.test("`'A'` cobra primeiro (`FIRST` de M2)")).toBe(true);

    // E não pega o texto correto, que fala de sorteio sem prometer lado.
    expect(PROMESSA_DE_ORDEM_FIXA.test('Um sorteio decide quem começa.')).toBe(false);
    expect(PROMESSA_DE_ORDEM_FIXA.test('Sorteio: Brasil cobra primeiro.')).toBe(false);
    expect(PROMESSA_DE_ORDEM_FIXA.test('Você começa defendendo.')).toBe(false);
  });

  it.each(arquivosDeUi(DIR_UI))('%s não promete quem cobra primeiro', (caminho) => {
    const conteudo = readFileSync(caminho, 'utf8');
    expect(conteudo, `${caminho}: promessa de ordem fixa`).not.toMatch(PROMESSA_DE_ORDEM_FIXA);
    expect(conteudo, `${caminho}: M7 repetindo a constante de M2`).not.toMatch(CONSTANTE_DO_MOTOR);
  });
});

// ── Preferências: nada aqui lança, e nada aqui inventa dado ────────────────────────────────
describe('preferências do aparelho', () => {
  const CHAVE = 'tapgo.v2.preferencias';

  /** `localStorage` de mentira — o teste roda em Node, e este módulo é o único de M7 que o usa. */
  function armazenamentoFalso(inicial: Record<string, string> = {}) {
    const dados = new Map(Object.entries(inicial));
    return {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      ver: (k: string) => dados.get(k) ?? null,
    };
  }

  function instalar(armazenamento: unknown): void {
    (globalThis as { window?: unknown }).window = { localStorage: armazenamento };
  }

  beforeEach(() => instalar(armazenamentoFalso()));
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('sem nada gravado devolve o padrão, com seleção nula (não inventada)', () => {
    expect(lerPreferencias()).toEqual(PADRAO);
    expect(lerPreferencias().selecao).toBeNull();
  });

  it('JSON corrompido não lança e não contamina — cai no padrão inteiro', () => {
    instalar(armazenamentoFalso({ [CHAVE]: '{"nivel":"hard","som"' }));
    expect(() => lerPreferencias()).not.toThrow();
    expect(lerPreferencias()).toEqual(PADRAO);
  });

  it('campo de tipo errado cai no padrão SÓ naquele campo', () => {
    instalar(armazenamentoFalso({ [CHAVE]: JSON.stringify({ nivel: 42, som: false }) }));
    const p = lerPreferencias();
    expect(p.nivel).toBe(PADRAO.nivel);
    expect(p.som).toBe(false); // este veio válido e foi respeitado
  });

  it('nível fora da faixa vira o padrão em vez de chegar a createSession', () => {
    instalar(armazenamentoFalso({ [CHAVE]: JSON.stringify({ nivel: 'impossivel' }) }));
    expect(lerPreferencias().nivel).toBe(PADRAO.nivel);
  });

  it('seleção salva que saiu do catálogo é descartada, não remendada (A-04)', () => {
    instalar(armazenamentoFalso({ [CHAVE]: JSON.stringify({ selecao: { A: BR, B: 'ZZ' } }) }));
    expect(lerPreferencias().selecao).toBeNull();
  });

  it('meia seleção salva é descartada inteira', () => {
    instalar(armazenamentoFalso({ [CHAVE]: JSON.stringify({ selecao: { A: BR } }) }));
    expect(lerPreferencias().selecao).toBeNull();
  });

  it('armazenamento que lança em getItem não derruba o jogo', () => {
    instalar({
      getItem: () => {
        throw new Error('bloqueado em navegação privada');
      },
      setItem: () => undefined,
    });
    expect(() => lerPreferencias()).not.toThrow();
    expect(lerPreferencias()).toEqual(PADRAO);
  });

  it('armazenamento que lança em setItem não derruba o jogo', () => {
    instalar({
      getItem: () => null,
      setItem: () => {
        throw new Error('cota estourada');
      },
    });
    expect(() => gravarPreferencias(PADRAO)).not.toThrow();
  });

  it('grava só as três preferências que o contrato de M7 permite', () => {
    const arm = armazenamentoFalso();
    instalar(arm);
    const p: Preferencias = { nivel: 'hard', som: false, selecao: { A: BR, B: AR } };
    gravarPreferencias(p);

    const cru = arm.ver(CHAVE);
    expect(cru).not.toBeNull();
    const gravado = JSON.parse(cru ?? '{}') as Record<string, unknown>;
    expect(Object.keys(gravado).sort()).toEqual(['nivel', 'selecao', 'som']);
  });

  it('sem preferência, a seleção inicial vem do catálogo — e são duas seleções válidas', () => {
    const escolha = selecaoInicial(PADRAO);
    expect(escolha).not.toBeNull();
    if (escolha === null) return;
    expect(nomeSelecao(escolha.A)).not.toBe(escolha.A); // achou nome no catálogo
    expect(escolha.A).not.toBe(escolha.B);
  });
});

// ── Assets: o portão de licença de M7 ──────────────────────────────────────────────────────
// ── QA-19 / QA-18 / QA-16: o que só a fonte prova, porque vitest roda sem DOM ──────────────
//
// Nenhuma tela de M7 é montável aqui: `vitest` roda em Node, `document` não existe e `marca()`
// não é chamável. O que dá para cobrar é (1) a função pura, acima, e (2) a fonte — que é o que
// este bloco faz. A terceira passada é a do dono no aparelho real (`A-14`), e ela não é
// substituível por nada daqui: estes testes provam que a regra está escrita, não que ela pinta.
describe('a tela lê a bandeira, e o hidden esconde (QA-19 / QA-18 / QA-16)', () => {
  const FOLHA = fileURLToPath(new URL('../ui/estilo.css', import.meta.url));

  /** A folha sem comentário: senão o texto que EXPLICA um defeito passa por ele. */
  function folha(): string {
    return readFileSync(FOLHA, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /** Regras `seletor { corpo }` da folha. Regra dentro de `@media` sai como regra normal. */
  function regras(): { seletor: string; corpo: string }[] {
    const out: { seletor: string; corpo: string }[] = [];
    for (const m of folha().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ seletor: (m[1] ?? '').trim(), corpo: (m[2] ?? '').trim() });
    }
    return out;
  }

  // ── QA-19: a marca é decidida por `ehBandeira`, não pelo formato do valor ────────────────
  //
  // O padrão é a FORMA EXATA do defeito: `texto` de `marcaSelecao` caindo no `texto:` de um
  // elemento. Não é uma paráfrase do defeito, é a linha que estava em `tela_selecoes.ts`.
  const MARCA_PINTADA_COMO_TEXTO = /texto:\s*\w+\.texto\b/;

  it('o padrão pega a linha que existia antes (senão o teste seria verde à toa)', () => {
    expect(MARCA_PINTADA_COMO_TEXTO.test('    texto: m.texto,')).toBe(true);
    expect(MARCA_PINTADA_COMO_TEXTO.test('texto: marca.texto')).toBe(true);

    // E não pega o que é legítimo: texto vindo de outro campo, ou o valor usado como `src`.
    expect(MARCA_PINTADA_COMO_TEXTO.test('texto: nomeSelecao(code)')).toBe(false);
    expect(MARCA_PINTADA_COMO_TEXTO.test('attrs: { src: m.texto, alt: \'\' }')).toBe(false);
  });

  it.each(arquivosDeUi(DIR_UI).filter((c) => c.endsWith('.ts')))(
    '%s não escreve o caminho da bandeira como texto',
    (caminho) => {
      expect(readFileSync(caminho, 'utf8'), `${caminho}: QA-19 de volta`).not.toMatch(
        MARCA_PINTADA_COMO_TEXTO,
      );
    },
  );

  it('quem monta a marca lê ehBandeira e pinta img com alt vazio', () => {
    // `ehBandeira` deixou de ser campo exportado sem leitor: quem o lê é `marca()`. Se este
    // teste cair, ou a decisão sumiu da tela ou ela mudou de casa — e as duas pedem revisita.
    const fonte = readFileSync(join(DIR_UI, 'tela_selecoes.ts'), 'utf8');
    expect(fonte).toMatch(/\bm\.ehBandeira\b/);
    expect(fonte).toMatch(/src:\s*m\.texto/);
    // Decoração continua decoração: o nome da seleção já está escrito ao lado.
    expect(fonte).toMatch(/alt:\s*''/);
    expect(fonte).toMatch(/'aria-hidden':\s*'true'/);
  });

  it('nenhuma marca aponta para fora do repositório — zero URL na folha e nas telas', () => {
    // `D-62`: `flag` é caminho local resolvido no build. Hotlink foi o defeito de licença da v1,
    // e ele voltaria por um `src` digitado à mão tão fácil quanto por um `url()` no CSS.
    const externo = /(?:https?:)?\/\/[a-z0-9-]+\.[a-z]/i;
    for (const caminho of arquivosDeUi(DIR_UI)) {
      const linhas = readFileSync(caminho, 'utf8')
        .split('\n')
        .filter((l) => externo.test(l) && !/^\s*(?:\*|\/\/|\/\*)/.test(l));
      expect(linhas, `${caminho}: endereço externo fora de comentário`).toEqual([]);
    }
  });

  // ── QA-18: o ramo do código não estoura o disco ──────────────────────────────────────────
  it('o disco da marca não tem largura fixa e corta o que sobrar', () => {
    const base = regras().find((r) => r.seletor === '.marca');
    expect(base, 'a regra `.marca` sumiu da folha — este portão ficaria verde por vazio').toBeDefined();

    const corpo = base?.corpo ?? '';
    // Largura MÍNIMA, não fixa: `GB-ENG` são 6 caracteres num disco desenhado para 2 (`D-52`).
    expect(corpo, '`.marca` voltou a ter largura fixa (QA-18)').not.toMatch(/(^|;)\s*width\s*:/);
    expect(corpo, '`.marca` sem min-width').toMatch(/min-width\s*:/);
    expect(corpo, '`.marca` sem overflow — o código longo volta a invadir o nome').toMatch(
      /overflow\s*:\s*hidden/,
    );
  });

  it('a bandeira é que tem largura fixa — o cartão não muda de largura com o arquivo', () => {
    const bandeira = regras().find((r) => r.seletor === '.marca--bandeira');
    expect(bandeira?.corpo, '.marca--bandeira sem largura fixa').toMatch(/(^|;)\s*width\s*:/);
  });

  // ── QA-16: `[hidden]` volta a vencer a folha do autor ────────────────────────────────────
  it('hidden esconde, e é uma regra só que garante isso', () => {
    const comImportante = regras().filter((r) => /display\s*:[^;]*!important/.test(r.corpo));

    // Uma, e exatamente uma: a lista de `[hidden]` por classe é o que `QA-16` provou que ninguém
    // mantém. Se aparecer uma segunda, ela pode vencer esta pela ordem e o defeito volta.
    expect(comImportante.map((r) => r.seletor)).toEqual(['[hidden]']);
    expect(comImportante[0]?.corpo).toMatch(/display\s*:\s*none\s*!important/);
  });

  it('as classes que o JS esconde estão cobertas — inclusive as que declaram display', () => {
    // As três que o defeito alcançava, nomeadas para que a regra acima não vire abstração solta:
    // `.aviso` (caixa de erro vazia em 3 telas), `.campo__sem-canvas` (durante a disputa) e
    // `.sorteio` (que trazia a própria linha `[hidden]` em `T-17b`, hoje redundante).
    const declaram = ['.aviso', '.campo__sem-canvas', '.sorteio'];
    const todas = regras();

    for (const seletor of declaram) {
      const regra = todas.find((r) => r.seletor === seletor);
      expect(regra, `${seletor} sumiu da folha`).toBeDefined();
      expect(regra?.corpo, `${seletor} deixou de declarar display`).toMatch(/display\s*:/);
      // Nenhuma delas precisa mais da própria linha `[hidden]`: a global cobre. Ter uma não é
      // erro, mas ter uma COM `!important` disputaria com a global — e isso o teste acima pega.
      expect(regra?.corpo, `${seletor} com display !important vence a global`).not.toMatch(
        /display\s*:[^;]*!important/,
      );
    }
  });
});

// ── A arte do campo: grade de pixels, e por isso testável sem navegador ────────────────────
//
// `cena.ts` precisa de Phaser e de canvas, e nenhum dos dois existe aqui. Mas a ARTE não é
// código de cena: é dado puro em `sprites.ts`, e dado puro tem portão. O que sobra para o
// aparelho real é se ela fica bonita — não se ela está bem formada.
describe('sprites do campo (T-20)', () => {
  const TODOS: Readonly<Record<string, Sprite>> = {
    GOLEIRO_PARADO,
    GOLEIRO_MERGULHO,
    BATEDOR_PARADO,
    BATEDOR_CHUTE,
    BOLA,
  };

  it.each(Object.entries(TODOS))('%s é retangular — toda linha do mesmo tamanho', (nome, sprite) => {
    // Uma linha com um caractere a mais desloca a coluna e entorta o boneco, e no canvas isso
    // aparece como "o braço saiu do lugar" — defeito caro de achar olhando.
    const larguras = new Set(sprite.map((l) => l.length));
    expect(larguras.size, `${nome}: linhas de larguras ${[...larguras].join(', ')}`).toBe(1);
    expect(sprite.length).toBeGreaterThan(4);
  });

  it.each(Object.entries(TODOS))('%s só usa caracteres do alfabeto', (nome, sprite) => {
    for (const [i, linha] of sprite.entries()) {
      for (const ch of linha) {
        expect(ALFABETO, `${nome} linha ${i}: caractere ${JSON.stringify(ch)}`).toContain(ch);
      }
    }
  });

  it('todo papel usado nas grades tem cor na paleta — nenhum pixel fica sem cor', () => {
    const cores = paleta(200);
    for (const [nome, sprite] of Object.entries(TODOS)) {
      for (const linha of sprite) {
        for (const ch of linha) {
          if (ch === '.') continue;
          expect(cores[ch as Papel], `${nome}: papel ${ch} sem cor`).toBeTypeOf('number');
        }
      }
    }
  });

  it('dimensoes lê a grade, e não um número escrito ao lado', () => {
    expect(dimensoes(BOLA)).toEqual({ largura: 10, altura: 10 });
    expect(dimensoes(GOLEIRO_PARADO).largura).toBe(GOLEIRO_PARADO[0]?.length);
    expect(dimensoes(GOLEIRO_PARADO).altura).toBe(GOLEIRO_PARADO.length);
  });

  it('a camisa muda com o matiz, e o resto do boneco NÃO', () => {
    // É o pedido "cada goleiro com a cor da sua seleção". Pele, cabelo e chuteira ficam fixos:
    // variar tom de pele por seleção seria inventar identidade onde só existe um código ISO.
    const a = paleta(10);
    const b = paleta(200);

    expect(a.C).not.toBe(b.C);
    expect(a.M).not.toBe(b.M);
    expect(a.P).toBe(b.P);
    expect(a.K).toBe(b.K);
    expect(a.B).toBe(b.B);
    // A bola não é de time nenhum.
    expect(a.W).toBe(b.W);
    expect(a.D).toBe(b.D);
  });

  it('o matiz de M7 NÃO é injetor — 2 pares das 32 colidem, e por isso matizDistinto existe', () => {
    // Este teste documenta o defeito de `QA-20` em vez de fingir que ele não existe: se um dia o
    // hash mudar e as 32 passarem a ser únicas, ele reprova e alguém revisita `matizDistinto`.
    const matizes = listTeams().map((t) => marcaSelecao(t.code).matiz);
    expect(matizes).toHaveLength(32);
    expect(new Set(matizes).size).toBe(30);
  });

  it('em campo, os dois lados nunca saem com a mesma camisa — nem os 3 pares que colidem', () => {
    const codigos = listTeams().map((t) => t.code);

    for (const a of codigos) {
      for (const b of codigos) {
        if (a === b) continue; // seleção contra ela mesma é permitido, e aí a cor igual é honesta
        const mA = marcaSelecao(a).matiz;
        const mB = matizDistinto(mA, marcaSelecao(b).matiz);

        const bruto = Math.abs(mA - mB);
        const distancia = Math.min(bruto, 360 - bruto);
        expect(distancia, `${a} x ${b}: camisas a ${distancia}graus`).toBeGreaterThanOrEqual(
          SEPARACAO_MINIMA,
        );
        expect(paleta(mA).C, `${a} x ${b}`).not.toBe(paleta(mB).C);
      }
    }
  });

  it('matizDistinto não mexe em quem já estava longe, e é determinístico', () => {
    expect(matizDistinto(0, 180)).toBe(180);
    expect(matizDistinto(10, 90)).toBe(90);
    // Colidiu: vai para o oposto, sempre no mesmo lugar.
    expect(matizDistinto(100, 100)).toBe(280);
    expect(matizDistinto(100, 100)).toBe(280);
    // A volta do círculo conta como perto: 350 e 10 estão a 20 graus.
    expect(matizDistinto(350, 10)).toBe(170);
  });

  it('hsl devolve cor dentro da faixa de 24 bits, para qualquer matiz', () => {
    for (let h = 0; h < 360; h += 7) {
      const cor = hsl(h, 72, 52);
      expect(Number.isInteger(cor)).toBe(true);
      expect(cor).toBeGreaterThanOrEqual(0);
      expect(cor).toBeLessThanOrEqual(0xffffff);
    }
    // Âncoras: matiz fora da faixa dá a volta em vez de sair preto.
    expect(hsl(0, 100, 50)).toBe(hsl(360, 100, 50));
    expect(hsl(-120, 100, 50)).toBe(hsl(240, 100, 50));
    // Saturação zero é cinza — os três canais iguais.
    const cinza = hsl(123, 0, 50);
    expect((cinza >> 16) & 0xff).toBe((cinza >> 8) & 0xff);
    expect((cinza >> 8) & 0xff).toBe(cinza & 0xff);
  });

  it('a grade tem desenho: nem tudo transparente, nem tudo cheio', () => {
    // Sem isto, apagar o conteúdo de um sprite passaria por todos os testes acima.
    for (const [nome, sprite] of Object.entries(TODOS)) {
      const total = sprite.join('').length;
      const pintados = sprite.join('').split('').filter((c) => c !== '.').length;
      expect(pintados, `${nome} está vazio`).toBeGreaterThan(total * 0.15);
      expect(pintados, `${nome} é um bloco cheio`).toBeLessThan(total * 0.95);
    }
  });
});

describe('portão de licença de assets (M7)', () => {
  const DIR_ASSETS = fileURLToPath(new URL('../assets', import.meta.url));
  const LICENCIAMENTO = fileURLToPath(
    new URL('../../77777777_TAPGO_Project_DOCs/a_context/licenciamento.md', import.meta.url),
  );

  function todosOsAssets(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
      const alvo = join(dir, item.name);
      return item.isDirectory() ? todosOsAssets(alvo) : [alvo];
    });
  }

  it('todo arquivo de assets/ tem linha na tabela de procedência de licenciamento.md', () => {
    const tabela = readFileSync(LICENCIAMENTO, 'utf8');
    const assets = todosOsAssets(DIR_ASSETS);

    expect(assets.length).toBeGreaterThan(0);
    for (const caminho of assets) {
      // `sep` → `/`: a tabela é escrita com barra, e o dono roda isto no Windows.
      const relativo = relative(DIR_ASSETS, caminho).split(sep).join('/');
      expect(tabela, `src/assets/${relativo} nao tem linha de procedencia`).toContain(
        `src/assets/${relativo}`,
      );
    }
  });

  it('nenhum asset de áudio passa de 64 kB — o bundle inicial os carrega', () => {
    for (const caminho of todosOsAssets(DIR_ASSETS).filter((c) => c.endsWith('.wav'))) {
      expect(statSync(caminho).size, caminho).toBeLessThan(64_000);
    }
  });
});

// ── T-20 fatia 2: a direção visual dos menus (`D-65`) ──────────────────────────────────────
//
// Nenhum destes testes diz que a tela ficou BONITA — isso é do dono, no aparelho dele (`A-14`).
// O que eles cobram é o que o gosto não pode revogar: os portões funcionais de M7 que a folha
// nova poderia ter afrouxado sem ninguém notar, porque redesenho mexe justamente nas linhas onde
// contraste, alvo de toque e privacidade moram.
describe('a direção visual não afrouxa portão de M7 (T-20 fatia 2 / D-65)', () => {
  const FOLHA = fileURLToPath(new URL('../ui/estilo.css', import.meta.url));
  const PAGINA = fileURLToPath(new URL('../index.html', import.meta.url));

  /** A folha sem comentário — senão o texto que EXPLICA uma regra passa por ela. */
  function folha(): string {
    return readFileSync(FOLHA, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  }

  function regras(): { seletor: string; corpo: string }[] {
    const out: { seletor: string; corpo: string }[] = [];
    for (const m of folha().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ seletor: (m[1] ?? '').trim(), corpo: (m[2] ?? '').trim() });
    }
    return out;
  }

  /** Os tokens `--nome: #hex` do bloco `.tapgo` — a paleta, e só ela. */
  function paletaDaFolha(): Record<string, string> {
    const bloco = regras().find((r) => r.seletor === '.tapgo')?.corpo ?? '';
    const out: Record<string, string> = {};
    for (const m of bloco.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
      out[(m[1] ?? '').toLowerCase()] = (m[2] ?? '').toLowerCase();
    }
    return out;
  }

  /** Contraste WCAG entre duas cores `#rrggbb`. */
  function contraste(a: string, b: string): number {
    const luz = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * (canais[0] ?? 0) + 0.7152 * (canais[1] ?? 0) + 0.0722 * (canais[2] ?? 0);
    };
    const ordenadas = [luz(a), luz(b)].sort((x, y) => y - x);
    return ((ordenadas[0] ?? 0) + 0.05) / ((ordenadas[1] ?? 0) + 0.05);
  }

  it('o extrator de paleta acha as cores (senão os testes abaixo ficam verdes por vazio)', () => {
    const p = paletaDaFolha();
    expect(Object.keys(p).length).toBeGreaterThan(10);
    expect(p['fundo']).toMatch(/^#[0-9a-f]{6}$/);
    expect(p['acento']).toMatch(/^#[0-9a-f]{6}$/);
  });

  // ── Privacidade de M9: o visual novo é a hora clássica de uma fonte remota entrar ────────
  it('zero fonte remota, zero @import e zero @font-face — na folha E na página', () => {
    // A tentação é conhecida: metade do "ar" da referência é tipografia, e a saída fácil seria um
    // `@import` de fonte hospedada. Ele buscaria na rede a cada abertura do jogo, que é exatamente
    // o que o portão de privacidade de M9 proíbe. Fonte própria só embarcada em `src/assets/`.
    const alvos: [string, string][] = [
      ['estilo.css', readFileSync(FOLHA, 'utf8')],
      ['index.html', readFileSync(PAGINA, 'utf8')],
    ];
    for (const [nome, texto] of alvos) {
      const limpo = texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
      expect(limpo, `${nome}: @import`).not.toMatch(/@import/);
      expect(limpo, `${nome}: @font-face`).not.toMatch(/@font-face/);
      expect(limpo, `${nome}: folha externa`).not.toMatch(/<link[^>]+stylesheet/i);
      expect(limpo, `${nome}: endereço externo`).not.toMatch(
        /(?:https?:)?\/\/[a-z0-9-]+\.[a-z]/i,
      );
    }
  });

  // ── Contraste: a paleta inteira, não os pares de que eu lembrei ──────────────────────────
  it('todo par cor-de-texto × cor-de-fundo da paleta passa de 4,5:1', () => {
    // A varredura é do PRODUTO CARTESIANO de propósito. Conferir só os pares que a tela usa hoje
    // deixaria o próximo `data-tom` combinar duas cores que nunca foram medidas — e `T-14` traz
    // três telas novas sobre esta mesma paleta.
    const p = paletaDaFolha();
    const fundos = [
      'fundo',
      'fundo-luz',
      'superficie',
      'superficie-alta',
      'acento-escuro',
      'acento-escolhido',
      'perigo-escuro',
      'atencao-escuro',
    ];
    const textos = ['texto', 'texto-apagado', 'acento', 'perigo', 'atencao', 'foco'];

    for (const f of fundos) {
      const corF = p[f];
      expect(corF, `token --${f} sumiu da paleta`).toBeDefined();
      for (const t of textos) {
        const corT = p[t];
        expect(corT, `token --${t} sumiu da paleta`).toBeDefined();
        if (corF === undefined || corT === undefined) continue;
        expect(contraste(corF, corT), `--${t} sobre --${f}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('o texto do botão principal passa de 4,5:1 nas DUAS pontas do degradê', () => {
    // O botão principal deixou de ser cor chapada: o texto escuro tem de aguentar o topo claro e
    // o pé escuro do degradê, e é o pé que aperta.
    const p = paletaDaFolha();
    const regra = regras().find((r) => r.seletor === '.botao--principal');
    const cor = /color:\s*(#[0-9a-f]{6})/i.exec(regra?.corpo ?? '')?.[1];
    expect(cor, '.botao--principal sem cor de texto literal').toBeDefined();
    for (const ponta of ['acento-claro', 'acento-forte']) {
      const fundo = p[ponta];
      expect(fundo, `token --${ponta} sumiu`).toBeDefined();
      if (cor === undefined || fundo === undefined) continue;
      expect(contraste(fundo, cor), `texto do botão sobre --${ponta}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // ── Alvo de toque: o número que o relevo poderia ter comido ──────────────────────────────
  it('tudo que se toca continua com pelo menos 48px de altura', () => {
    const minimos: Record<string, number> = {
      '.botao': 48,
      '.botao--discreto': 48,
      '.segmento': 48,
      '.cartao': 48,
    };
    for (const [seletor, minimo] of Object.entries(minimos)) {
      const regra = regras().find((r) => r.seletor === seletor);
      expect(regra, `${seletor} sumiu da folha`).toBeDefined();
      const px = /min-height:\s*(\d+)px/.exec(regra?.corpo ?? '')?.[1];
      expect(px, `${seletor} sem min-height em px`).toBeDefined();
      expect(Number(px), `${seletor} abaixo do alvo de toque`).toBeGreaterThanOrEqual(minimo);
    }
  });

  // ── prefers-reduced-motion: duração zerada e atraso ESQUECIDO é o defeito clássico ───────
  it('quem pede menos movimento tem duração, atraso e repetição neutralizados', () => {
    const bloco = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\})\s*\}/.exec(
      folha(),
    )?.[1];
    expect(bloco, 'o bloco de prefers-reduced-motion sumiu da folha').toBeDefined();

    // Os quatro juntos, porque três deles sozinhos ainda deixam movimento na tela: com a duração
    // em 0,01ms e o ATRASO de 225ms intacto, o último bloco da cascata fica invisível por um
    // quinto de segundo; e o refletor `infinite` da capa repetiria um ciclo instantâneo para
    // sempre sem a contagem de repetições.
    for (const prop of [
      'animation-duration',
      'transition-duration',
      'animation-delay',
      'animation-iteration-count',
    ]) {
      expect(bloco, `${prop} não é neutralizado com !important`).toMatch(
        new RegExp(`${prop}\\s*:[^;]*!important`),
      );
    }

    // E o pseudoelemento novo entra na lista: a capa desenha com `::before` e `::after`.
    expect(bloco).toMatch(/::after/);
  });

  // ── O fluxo crítico continua em 2 toques (3 no `online`, e por decisão) ──────────────────
  it('o menu não ganhou passo: as telas do fluxo crítico só levam às rotas declaradas', () => {
    // Este é o portão que uma tela mais rica quebra sem querer — "só mais um passo para escolher
    // X" custa o 3º toque, e o número declarado em `tela_inicio.ts` é 2. A varredura pega uma
    // rota nova nas duas telas do fluxo, que é a forma que o passo a mais teria.
    //
    // `convite` entrou em `T-21` e é a ÚNICA rota a mais permitida: ela é o 3º toque do modo
    // `online`, exigido por `D-75` (nenhuma sessão antes do toque que declara o outro lado a
    // postos). O teste seguinte é o que impede esse passo de vazar para `cpu` e `local`.
    const rotas = new Set<string>();
    for (const arquivo of ['tela_inicio.ts', 'tela_selecoes.ts']) {
      const fonte = readFileSync(join(DIR_UI, arquivo), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of fonte.matchAll(/nome:\s*'([a-z]+)'/g)) rotas.add(m[1] ?? '');
    }
    expect([...rotas].sort()).toEqual(['cobranca', 'convite', 'inicio', 'selecoes']);
  });

  it('o passo do convite é só do `online`: cpu e local continuam indo direto à cobrança', () => {
    // Sem esta linha, o teste acima passaria a aceitar o convite no caminho de TODO mundo — que
    // é exatamente o 3º toque que o portão de 2 toques existe para barrar.
    const fonte = readFileSync(join(DIR_UI, 'tela_selecoes.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    expect(fonte, 'a rota de convite deixou de ser condicionada ao modo online').toMatch(
      /modo === 'online'\s*\?\s*\{\s*nome:\s*'convite'/,
    );
  });

  it('o confronto é espelho, não controle: sem rádio, sem botão e fora do leitor de tela', () => {
    // Ele repete uma escolha que já está feita nas grades. Se um dia ganhar `<input>` ou `botao(`,
    // virou um lugar a mais para tocar — e aí o teste acima ainda passaria, porque a rota é a
    // mesma. Este cobre o outro lado.
    const fonte = readFileSync(join(DIR_UI, 'tela_selecoes.ts'), 'utf8');
    const corpo = /\nfunction confronto\([\s\S]*?\n}\n/.exec(fonte)?.[0];
    expect(corpo, 'a função confronto sumiu de tela_selecoes.ts').toBeDefined();
    expect(corpo, 'o confronto ganhou controle').not.toMatch(
      /botao\(|type:\s*'radio'|addEventListener/,
    );
    expect(corpo, 'o confronto deixou de ser decorativo para o leitor de tela').toMatch(
      /'aria-hidden':\s*'true'/,
    );
  });

  it('as peças novas de D-65 estão na folha — capa, confronto e pódio', () => {
    // Sem isto, uma classe que sai do TS e fica órfã na folha (ou o contrário) passa em silêncio,
    // e `T-14` herda uma direção que só existe pela metade.
    const seletores = regras().map((r) => r.seletor);
    for (const classe of ['.capa', '.capa__marca', '.confronto', '.resultado']) {
      expect(seletores, `${classe} sumiu da folha`).toContain(classe);
    }
  });
});


// ── T-21: o link do convite, e a derivação do modo `online` ────────────────────────────────
//
// A tela de convite não é montável aqui (`document` não existe), e a conexão de verdade é do
// dono em dois aparelhos. O que dá para cobrar sem navegador são as duas coisas que erram em
// silêncio: o endereço que o convidado vai abrir, e a derivação de quem escolhe no `online`.
describe('link do convite (T-21 / D-73)', () => {
  const BASE = 'https://gustavomot4.github.io/tapgo-v2/';
  const SALA = 'ABCDEFGHJKMNPQRSTVWXYZ0123';

  it('o formato copiado de M6 aceita o que M6 sorteia, e recusa o que ela recusaria', () => {
    // O elo que impede a cópia de envelhecer: quem gera é M6 de verdade, por `newRoomId` — o
    // reexport de `D-73`, que é a linha que `T-21` comprou em M5.
    for (let i = 0; i < 200; i += 1) expect(newRoomId()).toMatch(FORMATO_SALA);

    // As letras que Crockford base32 não tem, e o tamanho errado dos dois lados.
    expect(FORMATO_SALA.test('ABCDEFGHIJKMNPQRSTVWXYZ012')).toBe(false); // tem I
    expect(FORMATO_SALA.test('ABCDEFGHJKMNPQRSTVWXYZ012')).toBe(false); // 25
    expect(FORMATO_SALA.test(`${SALA}0`)).toBe(false); // 27
  });

  it('o link preserva a subpasta do GitHub Pages — montá-lo da raiz seria 404 no convidado', () => {
    const link = linkDaSala(BASE, SALA);
    expect(link.startsWith('https://gustavomot4.github.io/tapgo-v2/')).toBe(true);
    expect(link).toContain(`${PARAM_SALA}=${SALA}`);
  });

  it('o que foi montado é o que é lido de volta', () => {
    expect(salaDoEndereco(linkDaSala(BASE, SALA))).toBe(SALA);
  });

  it('o link não carrega junto o que estava na barra do anfitrião', () => {
    // Um convite montado a partir de um endereço que já tinha sala (o anfitrião convidando de
    // novo depois de uma partida) não pode sair com as DUAS — a última venceria em silêncio.
    const sujo = `${BASE}?${PARAM_SALA}=0000000000000000000000000&outro=1#topo`;
    const link = linkDaSala(sujo, SALA);
    expect(salaDoEndereco(link)).toBe(SALA);
    expect(link).not.toContain('outro=1');
    expect(link).not.toContain('#topo');
  });

  it('endereço sem convite, ou com convite truncado, devolve null e não lança', () => {
    expect(salaDoEndereco(BASE)).toBeNull();
    expect(salaDoEndereco(`${BASE}?${PARAM_SALA}=`)).toBeNull();
    // Truncado no mensageiro — o caso que a tela traduz para "peça o link de novo".
    expect(salaDoEndereco(`${BASE}?${PARAM_SALA}=${SALA.slice(0, 20)}`)).toBeNull();
    expect(salaDoEndereco('isto não é endereço nenhum')).toBeNull();
  });

  it('minúsculas do teclado do convidado ainda entram na sala certa', () => {
    expect(salaDoEndereco(`${BASE}?${PARAM_SALA}=${SALA.toLowerCase()}`)).toBe(SALA);
  });

  it('o código legível quebra de 4 em 4 sem perder nem inventar caractere', () => {
    expect(salaLegivel(SALA).replace(/ /g, '')).toBe(SALA);
    expect(salaLegivel(SALA).split(' ')[0]).toHaveLength(4);
  });
});

describe('derivação da vez no modo `online` (T-21)', () => {
  // Os estados vêm de uma sessão `cpu` — a única fonte de `MatchState` que não precisa de rede.
  // O que está sob teste é a DERIVAÇÃO, e ela só lê `MatchState`: no `online` cada aparelho
  // escolhe uma vez por cobrança, exatamente como em `cpu`.
  function estados(): MatchState[] {
    const sessao = createSession({
      mode: 'cpu',
      seed: 11,
      level: 'medium',
      teams: TIMES,
      localSide: 'A',
    });
    const vistos: MatchState[] = [];
    sessao.subscribe((s) => void vistos.push(s));
    for (const zona of roteiro(12, 2)) {
      if (sessao.state().phase === 'finished') break;
      sessao.choose(zona);
    }
    sessao.dispose();
    return vistos;
  }

  it('quem escolhe é sempre o lado DESTE aparelho, e o papel sai de quem cobra', () => {
    const derivacao = criarDerivacao('online', 'B');

    for (const estado of estados()) {
      derivacao.aoNotificar(estado);
      const vez = derivacao.vez(estado);
      if (estado.phase === 'finished') {
        expect(vez).toBeNull();
        continue;
      }
      expect(vez?.lado).toBe('B');
      expect(vez?.papel).toBe(estado.turn === 'B' ? 'chutar' : 'defender');
      expect(vez?.pendente).toBe(false);
    }
  });

  it('notificação sem cobrança nova NÃO vira "passe o aparelho"', () => {
    // É a diferença que o `online` tem para o `local`, e a que quebraria em silêncio: lá chegam
    // notificações com o mesmo `kicks.length` — a própria escolha esperando o peer, e cada troca
    // de status do canal. Tratá-las como pendente mandaria passar o aparelho para alguém que
    // está em outra cidade.
    const derivacao = criarDerivacao('online', 'A');
    const primeiro = estados()[0];
    expect(primeiro).toBeDefined();
    if (primeiro === undefined) return;

    derivacao.aoNotificar(primeiro);
    derivacao.aoNotificar(primeiro);
    derivacao.aoNotificar(primeiro);
    expect(derivacao.vez(primeiro)?.pendente).toBe(false);

    // E a prova de que o teste não é vácuo: no `local`, a MESMA sequência é pendente.
    const local = criarDerivacao('local', 'A');
    local.aoNotificar(primeiro);
    local.aoNotificar(primeiro);
    expect(local.vez(primeiro)?.pendente).toBe(true);
  });
});
