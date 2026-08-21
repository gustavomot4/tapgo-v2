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
import { createRng, newSeed } from '../core/index';
import { listTeams } from '../data/teams';

import { criarDerivacao, outroLado } from '../ui/derivacao';
import {
  FORMATO_SALA,
  PARAM_SALA,
  PARAM_ANFITRIAO,
  anfitriaoDoEndereco,
  linkDaSala,
  salaDoEndereco,
  salaLegivel,
} from '../ui/convite';
import { CONNECT_TIMEOUT_MS, newRoomId } from '../session/index';
import type { Vez } from '../ui/derivacao';
import {
  AVISO_PEER_SUMIU,
  descricaoFase,
  desfecho,
  ehDoCatalogo,
  instrucao,
  instrucaoDoSorteio,
  marcaSelecao,
  nomeSelecao,
  nomeZona,
  placar,
  AVISO_COBRANCA_SORTEADA,
  PRAZO_COBRANCA_MS,
  ZONAS,
  SEGUNDOS_DE_PRESSA,
  avisoDePressa,
  segundosRestantes,
  textoDaEspera,
  textoDoPrazo,
  resultadoUltimaCobranca,
  rotuloZona,
  sorteioDoPrimeiro,
  ESCOLHENDO,
  MINIMO_DA_SERIE,
  partidasDaSerie,
  serieComVencedor,
  textoDaSerie,
} from '../ui/rotulos';
import { SERIE_ZERO } from '../ui/rotas';
import type { Serie } from '../ui/rotas';
import { PADRAO, lerPreferencias, gravarPreferencias, selecaoInicial } from '../ui/preferencias';
import {
  ALFABETO,
  BATEDOR_CHUTE,
  BATEDOR_PARADO,
  BOLA,
  GOLEIRO_MERGULHO,
  GOLEIRO_PARADO,
  CAMISA_NACIONAL,
  CORES_NACIONAIS,
  camisasDaDisputa,
  corDaListra,
  corDoPixel,
  corNacional,
  dimensoes,
  distanciaDeCor,
  DISTANCIA_MINIMA,
  hsl,
  paleta,
} from '../ui/sprites';
import type { Camisa, Cor, Papel, Sprite } from '../ui/sprites';
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
    const cores = paleta(CORES_NACIONAIS.azul);
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

  it('a camisa muda com a cor nacional, e o resto do boneco NÃO', () => {
    // É o pedido "cada goleiro com a cor da sua seleção". Pele, cabelo e chuteira ficam fixos:
    // variar tom de pele por seleção seria inventar identidade onde só existe um código ISO.
    const a = paleta(CORES_NACIONAIS.vermelho);
    const b = paleta(CORES_NACIONAIS.azul);

    expect(a.C).not.toBe(b.C);
    expect(a.M).not.toBe(b.M);
    expect(a.P).toBe(b.P);
    expect(a.K).toBe(b.K);
    expect(a.B).toBe(b.B);
    // A bola não é de time nenhum.
    expect(a.W).toBe(b.W);
    expect(a.D).toBe(b.D);
  });

  // ── `T-29`/`D-88`: a cor nacional, e o padrão como canal de desempate ────────────────

  it('as 32 seleções do catálogo têm cor nacional — nenhuma cai na saída de emergência', () => {
    // O `corNacional` devolve branco para código desconhecido, e essa saída existe para não pôr
    // um retângulo transparente em campo. Mas ela NÃO pode estar cobrindo o catálogo real: se
    // alguém acrescentar uma seleção a M4 e esquecer da tabela, é aqui que isso aparece.
    for (const time of listTeams()) {
      expect(
        Object.prototype.hasOwnProperty.call(CAMISA_NACIONAL, time.code),
        `${time.code} sem linha em CAMISA_NACIONAL`,
      ).toBe(true);
    }
    expect(Object.keys(CAMISA_NACIONAL)).toHaveLength(32);
  });

  it('toda cor nomeada da tabela existe, e nenhuma linha aponta para nome inventado', () => {
    for (const [code, nome] of Object.entries(CAMISA_NACIONAL)) {
      expect(CORES_NACIONAIS[nome], `${code} aponta para cor inexistente: ${nome}`).toBeDefined();
    }
  });

  it('as cores nomeadas são distinguíveis entre si — a menor distância passa do limiar', () => {
    // É o que autoriza o limiar de `DISTANCIA_MINIMA` a decidir "mesma cor" por comparação: se
    // duas cores DIFERENTES da tabela caíssem abaixo dele, o desempate listraria camisas que já
    // eram distintas, e a listra perderia o significado.
    const nomes = Object.keys(CORES_NACIONAIS) as (keyof typeof CORES_NACIONAIS)[];
    for (let i = 0; i < nomes.length; i += 1) {
      for (let j = i + 1; j < nomes.length; j += 1) {
        const a = nomes[i];
        const b = nomes[j];
        if (a === undefined || b === undefined) continue;
        const d = distanciaDeCor(CORES_NACIONAIS[a], CORES_NACIONAIS[b]);
        expect(d, `${a} x ${b} a ${d.toFixed(1)}`).toBeGreaterThanOrEqual(DISTANCIA_MINIMA);
      }
    }
  });

  it('nenhuma cor nacional some no gramado — as 4 faixas do campo, medidas', () => {
    // O verde é o caso que este teste existe para segurar: no tom médio ele ficava a 29,7 do
    // gramado, e cinco seleções vestiriam camisa invisível. As faixas são as de `cena.ts`.
    const GRAMADO: Cor[] = [
      { h: 128, s: 41, l: 41 },
      { h: 127, s: 39, l: 45 },
      { h: 127, s: 36, l: 50 },
      { h: 126, s: 35, l: 54 },
    ];
    for (const [nome, cor] of Object.entries(CORES_NACIONAIS)) {
      for (const faixa of GRAMADO) {
        const d = distanciaDeCor(cor, faixa);
        expect(d, `${nome} a ${d.toFixed(1)} do gramado`).toBeGreaterThanOrEqual(DISTANCIA_MINIMA);
      }
    }
  });

  it('em campo, os dois lados nunca saem com a mesma camisa — as 32x32, sem exceção', () => {
    // A MESMA garantia que `matizDistinto` dava, cobrada do mesmo jeito: o produto cartesiano
    // inteiro, e não os pares de que eu lembrei. O que mudou é o preço — a cor nacional dos DOIS
    // lados sobrevive, e quem cede é o padrão.
    const codigos = listTeams().map((t) => t.code);

    for (const a of codigos) {
      for (const b of codigos) {
        if (a === b) continue; // seleção contra ela mesma é permitido, e aí a camisa igual é honesta
        const { A, B } = camisasDaDisputa(a, b);

        // A cor nacional dos dois lados fica INTACTA. É a diferença entre (B) e a saída (A).
        expect(A.cor, `${a} x ${b}: lado A perdeu a cor nacional`).toEqual(corNacional(a));
        expect(B.cor, `${a} x ${b}: lado B perdeu a cor nacional`).toEqual(corNacional(b));

        // E mesmo assim os dois bonecos saem distinguíveis: ou pela cor, ou pela listra.
        const distintos =
          distanciaDeCor(A.cor, B.cor) >= DISTANCIA_MINIMA || A.padrao !== B.padrao;
        expect(distintos, `${a} x ${b}: mesma cor E mesmo padrão`).toBe(true);
      }
    }
  });

  it('quem cede é sempre o lado B, e o resultado não depende da ordem', () => {
    // Espanha e Croácia são duas das doze vermelhas: quem entra como B é quem ganha listras, nas
    // duas ordens. Sem isso, a mesma disputa sairia diferente conforme quem foi sorteado.
    expect(camisasDaDisputa('ES', 'HR').A.padrao).toBe('liso');
    expect(camisasDaDisputa('ES', 'HR').B.padrao).toBe('listras');
    expect(camisasDaDisputa('HR', 'ES').A.padrao).toBe('liso');
    expect(camisasDaDisputa('HR', 'ES').B.padrao).toBe('listras');
  });

  it('cor diferente não vira listra — Brasil x Argentina saem os dois lisos', () => {
    const { A, B } = camisasDaDisputa('BR', 'AR');
    expect(A.padrao).toBe('liso');
    expect(B.padrao).toBe('liso');
  });

  it('seleção contra ela mesma sai com as duas camisas IGUAIS, e isso é honesto', () => {
    // Listrar um dos dois lados diria que são seleções diferentes, e elas não são.
    const { A, B } = camisasDaDisputa('BR', 'BR');
    expect(A).toEqual(B);
    expect(B.padrao).toBe('liso');
  });

  it('a listra é visível sobre a própria camisa — clara no escuro, escura no claro', () => {
    for (const [nome, cor] of Object.entries(CORES_NACIONAIS)) {
      const d = distanciaDeCor(cor, corDaListra(cor));
      expect(d, `listra de ${nome} a ${d.toFixed(1)} da base`).toBeGreaterThanOrEqual(
        DISTANCIA_MINIMA,
      );
    }
    // O branco é o único que cai no ramo escuro, e o único lugar onde o preto entra no jogo.
    expect(corDaListra(CORES_NACIONAIS.branco).l).toBeLessThan(20);
    expect(corDaListra(CORES_NACIONAIS.azul).l).toBeGreaterThan(80);
  });

  it('a listra pinta SÓ a camisa, e alterna de verdade ao longo do x', () => {
    const camisa: Camisa = { cor: CORES_NACIONAIS.vermelho, padrao: 'listras' };
    const cores = paleta(camisa.cor);

    // Ao longo do tronco, o pixel de camisa alterna entre a base e a listra.
    const aoLongo = [0, 1, 2, 3, 4, 5].map((x) => corDoPixel(camisa, cores, 'C', x));
    expect(new Set(aoLongo).size, 'a listra não alterna').toBe(2);
    expect(aoLongo[0]).toBe(cores.C);
    expect(aoLongo[2]).not.toBe(cores.C);

    // Calção, meião, pele e chuteira ficam lisos: listrar o boneco inteiro a 18px vira ruído.
    for (const papel of ['S', 'M', 'P', 'K', 'B'] as Papel[]) {
      for (const x of [0, 1, 2, 3]) {
        expect(corDoPixel(camisa, cores, papel, x), `papel ${papel} foi listrado`).toBe(
          cores[papel],
        );
      }
    }
  });

  it('camisa lisa ignora o x — nenhum pixel dela muda com a posição', () => {
    const camisa: Camisa = { cor: CORES_NACIONAIS.vermelho, padrao: 'liso' };
    const cores = paleta(camisa.cor);
    for (const x of [0, 1, 2, 3, 4, 5, 6, 7]) {
      expect(corDoPixel(camisa, cores, 'C', x)).toBe(cores.C);
    }
  });

  it('o branco sobrevive à derivação de luva, calção e meião — nada dele sai colorido', () => {
    // Era o defeito da paleta antiga, que cravava `hsl(matiz, 40, 82)`: saturação fixa devolve
    // cor a uma base sem cor, e o kit branco sairia com luva colorida.
    const p = paleta(CORES_NACIONAIS.branco);
    for (const papel of ['C', 'G', 'S', 'M'] as Papel[]) {
      const cor = p[papel];
      const r = (cor >> 16) & 255;
      const g = (cor >> 8) & 255;
      const b = cor & 255;
      expect(Math.max(r, g, b) - Math.min(r, g, b), `papel ${papel} saiu colorido`).toBeLessThan(6);
    }
  });

  it('a chave de textura de `cena.ts` carrega o PADRÃO, e não só a cor', () => {
    // Varredura de fonte porque `cena.ts` importa Phaser e nenhuma tela de M7 é alcançável pelo
    // vitest (Node, sem DOM). O defeito que ela segura é silencioso e caro: sem o padrão na
    // chave, Espanha lisa e Espanha listrada dividem a mesma textura, a segunda sai pelo
    // `textures.exists` e os dois lados voltam a sair com a MESMA camisa — o defeito que o
    // desempate inteiro existe para impedir, reintroduzido por uma string.
    const fonte = readFileSync(fileURLToPath(new URL('../ui/cena.ts', import.meta.url)), 'utf8');
    const corpo = /function chaveDaCamisa\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(fonte)?.[1];
    expect(corpo, 'chaveDaCamisa sumiu de cena.ts').toBeDefined();
    expect(corpo, 'a chave não usa camisa.padrao').toMatch(/camisa\.padrao/);
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

  // ── `QA-21`: a tela inicial não pode contradizer o que o jogo mostra ────────────────────
  it('nenhuma tela promete ao jogador algo que `T-19` já entregou — o texto morto não volta', () => {
    // O defeito era esse: a tela inicial dizia "As bandeiras ainda não entraram: cada seleção
    // aparece pelo código de duas letras do país", e dois toques adiante a grade mostrava as 32
    // bandeiras. Texto de lacuna sobrevive à lacuna porque ninguém varre a tela quando o dado
    // chega — então quem varre é este teste.
    //
    // A varredura é sobre `src/ui/` INTEIRO, não sobre `tela_inicio.ts`: a frase pode reaparecer
    // em qualquer tela, e conferir só onde ela estava provaria o passado.
    const mortos = [/bandeiras ainda não entraram/i, /aparece pelo código de duas letras/i];
    for (const arquivo of readdirSync(DIR_UI).filter((f) => f.endsWith('.ts'))) {
      const fonte = readFileSync(join(DIR_UI, arquivo), 'utf8');
      for (const morto of mortos) {
        expect(morto.test(fonte), `${arquivo} promete bandeira ausente — as 32 vieram em T-19`).toBe(
          false,
        );
      }
    }
  });

  it('as 32 seleções TÊM bandeira — é o fato que torna aquele texto mentira', () => {
    // Sem esta linha, o teste acima ficaria verde por vazio no dia em que uma bandeira sumisse:
    // ele só cobra que a FRASE não volte, não que o dado exista. Aqui é o dado.
    for (const time of listTeams()) {
      expect(time.flag, `${time.code} sem bandeira`).not.toBeNull();
    }
    expect(listTeams()).toHaveLength(32);
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
    // O nome da condição mudou em `T-31` (`const online = modo === 'online'`, porque agora ela
    // decide mais de uma coisa nesta tela), então o padrão cobra as DUAS pontas: que a rota siga
    // condicionada, e que a condição continue saindo do modo — e não de qualquer outra coisa.
    expect(fonte, 'a rota de convite deixou de ser condicionada ao modo online').toMatch(
      /\bonline\s*\?\s*\{\s*nome:\s*'convite'/,
    );
    expect(fonte, 'a condição `online` deixou de sair do modo').toMatch(
      /const online = modo === 'online'/,
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

  // ── `T-28`: os três itens que são PORTÃO, e não gosto ────────────────────────────────────

  it('a sobreposição do sorteio não rouba o toque (item 2 do portão de A-29)', () => {
    // Sobreposição em tela cheia é o defeito clássico: ela cobre os três botões de zona e o dedo
    // bate nela. `pointer-events: none` é a defesa, e é a única que não perde NEM o primeiro
    // toque — "sair ao primeiro toque" ainda comeria esse. Sem esta linha o portão de `A-29`
    // volta a depender de alguém lembrar de conferir no aparelho.
    const regra = regras().find((r) => r.seletor === '.sorteio-cheio');
    expect(regra, '.sorteio-cheio sumiu da folha').toBeDefined();
    expect(regra?.corpo, 'a sobreposição voltou a receber toque').toMatch(
      /pointer-events:\s*none/,
    );
  });

  it('a sobreposição nasce SÓ na transição escondido -> visível (o guarda de D-85)', () => {
    // `desenhar()` roda a cada notificação de M5, e no `online` `aoNotificacaoDeRede()` a chama
    // sem novidade. Chamar `mostrarSorteioCheio` fora do ramo de entrada faria a bandeira voltar
    // a tela cheia várias vezes antes do 1º toque — foi o defeito que `D-85` já pagou uma vez.
    const fonte = readFileSync(join(DIR_UI, 'tela_cobranca.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const chamadas = [...fonte.matchAll(/mostrarSorteioCheio\(/g)];
    expect(chamadas.length, 'mostrarSorteioCheio: definição + uma única chamada').toBe(2);
    expect(fonte, 'a sobreposição saiu de dentro do guarda de entrada').toMatch(
      /if \(entrando\) mostrarSorteioCheio\(/,
    );
    // E o guarda só vale se `entrando` for mesmo a transição, e não uma constante.
    expect(fonte).toMatch(/const entrando = !sorteioNaTela;/);
  });

  it('o papel tem DOIS canais: cor e forma, e a forma não depende da cor', () => {
    // `P-6` traz a própria restrição: cor sozinha reprova em daltonismo. Os dois papéis precisam
    // de uma regra de cor E de uma regra de FORMA — e é o par que este teste cobra, porque
    // apagar o `::before` deixaria a tela verde-contra-amarelo e nada mais.
    const seletores = regras().map((r) => r.seletor);
    for (const papel of ['chutar', 'defender']) {
      expect(seletores, `a cor do papel ${papel} sumiu`).toContain(`.zona[data-papel='${papel}']`);
      expect(seletores, `a FORMA do papel ${papel} sumiu`).toContain(
        `.zona[data-papel='${papel}']::before`,
      );
    }

    // As duas formas têm de ser DIFERENTES entre si: duas regras idênticas passariam no teste
    // acima e não distinguiriam papel nenhum.
    const forma = (papel: string): string =>
      regras().find((r) => r.seletor === `.zona[data-papel='${papel}']::before`)?.corpo ?? '';
    expect(forma('chutar').trim()).not.toBe(forma('defender').trim());

    // E a tela precisa ligar o atributo, senão a folha inteira fica órfã.
    const fonte = readFileSync(join(DIR_UI, 'tela_cobranca.ts'), 'utf8');
    expect(fonte, "tela_cobranca.ts não liga data-papel").toMatch(
      /dataset\['papel'\] = vez\.papel/,
    );
  });

  it('T-28 não trouxe cor nova para a paleta — os dois tons são --acento e --atencao', () => {
    // `T-20` mede contraste sobre o produto cartesiano dos tokens de `.tapgo`. Cor nova ali custa
    // a medição inteira de novo; por isso as bordas de papel repetem os dois hexes que já existem.
    const p = paletaDaFolha();
    const rgb = (hex: string): string => {
      const n = /^#(..)(..)(..)$/.exec(hex);
      return n === null ? '' : `${parseInt(n[1] ?? '0', 16)} ${parseInt(n[2] ?? '0', 16)} ${parseInt(n[3] ?? '0', 16)}`;
    };
    const pares: [string, string][] = [
      ['chutar', 'acento'],
      ['defender', 'atencao'],
    ];
    for (const [papel, token] of pares) {
      const hex = p[token];
      expect(hex, `token --${token} sumiu da paleta`).toBeDefined();
      const corpo = regras().find((r) => r.seletor === `.zona[data-papel='${papel}']`)?.corpo ?? '';
      expect(corpo, `a borda de ${papel} não usa --${token}`).toContain(rgb(hex ?? ''));
    }
  });

  // ── `T-30`: a bola e a luva, no tamanho que o card DECLAROU ─────────────────────────────
  //
  // `T-28` deixou triângulo e arco, que distinguem mas não DIZEM. `T-30` trocou por bola e luva
  // e mandou os dois crescerem — com o número declarado no card antes da primeira linha de CSS,
  // justamente para "maior" não virar gosto de quem implementa. O que se cobra aqui é o que
  // regride em silêncio: o tamanho, o asset e a cor.
  const formaDoPapel = (papel: string): string =>
    regras().find((r) => r.seletor === `.zona[data-papel='${papel}']::before`)?.corpo ?? '';

  it('T-30: os dois símbolos têm o tamanho declarado no card — 24x24', () => {
    for (const papel of ['chutar', 'defender']) {
      const corpo = formaDoPapel(papel);
      expect(/width:\s*24px/.test(corpo), `${papel}: largura fora dos 24px do card`).toBe(true);
      expect(/height:\s*24px/.test(corpo), `${papel}: altura fora dos 24px do card`).toBe(true);
    }
  });

  it('T-30: zero asset novo — a forma não busca arquivo nenhum', () => {
    // A bola sai de `border-radius` e a luva de camadas de `background`. Um `url(...)` aqui seria
    // arquivo em `dist/`, que é exatamente o que o card proibiu — e um `data:image/svg+xml`
    // ainda levaria o `xmlns` de `//www.w3.org` para dentro da varredura de endereço externo.
    for (const papel of ['chutar', 'defender']) {
      expect(formaDoPapel(papel), `${papel}: a forma passou a pedir arquivo`).not.toMatch(/url\(/);
    }
  });

  it('T-30: a forma é `currentColor` e nada mais — cor nova ali custa a medição de T-20', () => {
    // `currentColor` também é o que faz `.zona[disabled] { color: transparent }` apagar o símbolo
    // junto com o rótulo, sem uma linha a mais. Um hex cravado aqui sobreviveria ao botão travado.
    for (const papel of ['chutar', 'defender']) {
      const corpo = formaDoPapel(papel);
      expect(corpo, `${papel}: a forma deixou de usar currentColor`).toMatch(/currentColor/);
      expect(corpo, `${papel}: cor crua na forma`).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    }
  });

  // ── `T-33`/`QA-36`: o símbolo branco sobre as linhas brancas do campo ───────────────────
  //
  // `cena.ts` desenha as marcações em `#f4faf5` e a folha pintava o símbolo com `--texto`
  // (`#eef2f9`) — o mesmo branco. A correção soma DOIS canais de separação (cor de papel e halo
  // escuro) e, ao fazê-lo, tira de graça o `[disabled]` que `T-30` tinha por `currentColor`.
  // Os três testes abaixo são um por peça, porque cada uma regride sozinha e em silêncio.

  it('T-33: o símbolo tem a COR do papel, e ela é token — nunca hex cravado', () => {
    // O `background: currentColor` de `T-30` fica: o que muda é de onde `currentColor` vem. Um
    // hex aqui seria cor fora da paleta e o teste de `T-30` acima já o pegaria; este cobra o
    // outro lado — que a cor exista, e que seja a do papel.
    for (const [papel, token] of [
      ['chutar', 'acento'],
      ['defender', 'atencao'],
    ] as [string, string][]) {
      const corpo = formaDoPapel(papel);
      expect(corpo, `${papel}: o símbolo voltou a herdar o branco de --texto`).toMatch(
        new RegExp(`color:\\s*var\\(--${token}\\)`),
      );
      expect(corpo, `${papel}: a forma deixou de pintar com currentColor`).toMatch(
        /background:[\s\S]*currentColor/,
      );
    }
  });

  it('T-33: o halo escuro é `filter`, e está na regra que vale para os DOIS símbolos', () => {
    // `box-shadow` contorna a CAIXA: na luva, que são três camadas de `background`, recortaria um
    // quadrado em volta e deixaria os quatro dedos de `T-30` sem borda. `drop-shadow` segue o
    // alfa composto. Se um dia isto virar `box-shadow`, o defeito volta só na luva — e só no
    // aparelho do dono, que é o lugar mais caro para descobrir.
    const corpo = regras().find((r) => r.seletor === '.zona::before')?.corpo ?? '';
    expect(corpo, 'o halo de T-33 sumiu da regra compartilhada').toMatch(
      /filter:[\s\S]*drop-shadow\(/,
    );
    expect(corpo, 'o halo deixou de ser escuro — sem preto ele não separa do branco').toMatch(
      /drop-shadow\([^)]*rgb\(0 0 0/,
    );
    expect(corpo, 'o halo virou box-shadow e perdeu a silhueta da luva').not.toMatch(
      /box-shadow/,
    );
  });

  it('T-33: `[disabled]` continua apagando o símbolo — a regra explícita que a cor exigiu', () => {
    // A armadilha declarada no card. Até `T-30` isto era de graça: tudo era `currentColor` e a
    // `.zona[disabled]` punha `color: transparent`, que descia por herança. As regras de papel
    // agora DECLARAM `color`, e declaração vence herança — sem a regra abaixo o símbolo
    // sobreviveria ao botão travado sem reprovar um único teste existente.
    const alvo = regras().find(
      (r) => /\[disabled\]/.test(r.seletor) && /\[data-papel\]/.test(r.seletor) && /::before/.test(r.seletor),
    );
    expect(alvo, 'a regra que apaga o símbolo no botão travado sumiu').toBeDefined();
    expect(alvo?.corpo, 'a regra existe mas não apaga a cor').toMatch(/color:\s*transparent/);

    // E ela tem de VENCER as duas regras de papel, senão existe e não vale nada. Especificidade
    // sem `id` é contar classes e atributos: `.zona[disabled][data-papel]` = 3 contra
    // `.zona[data-papel='chutar']` = 2, e aí a ordem na folha deixa de ser o que segura isto.
    const peso = (seletor: string): number =>
      (seletor.match(/\.[\w-]+/g)?.length ?? 0) + (seletor.match(/\[[^\]]+\]/g)?.length ?? 0);
    for (const papel of ['chutar', 'defender']) {
      expect(
        peso(alvo?.seletor ?? '') > peso(`.zona[data-papel='${papel}']::before`),
        `a regra de travado empatou ou perdeu para o papel ${papel}`,
      ).toBe(true);
    }
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

  // ── `D-90`: UM código no link, o de quem convida (`T-31`) ──────────────────────────────
  // `D-77` levava as DUAS seleções aqui, e era assim que o anfitrião montava o confronto pelos
  // dois. Com o `Pick` no fio, a do convidado nasce no aparelho dele: o que sobra no endereço é
  // o rótulo de quem chamou, para ele ver de quem é o convite ANTES de existir conexão.
  it('a seleção de quem convida vai e volta pelo link', () => {
    const link = linkDaSala(BASE, SALA, 'ES');
    expect(anfitriaoDoEndereco(link, ehDoCatalogo)).toBe('ES');
    // E a sala continua chegando junto: um parâmetro não pode comer o outro.
    expect(salaDoEndereco(link)).toBe(SALA);
  });

  it('o link NÃO leva a seleção do convidado — ela não existe neste aparelho', () => {
    // O portão do formato, e ele é o que separa `D-90` de `D-77`: um código, sem separador. Se
    // um dia voltar a sair com dois, o convidado volta a receber o confronto pronto — que é
    // exatamente o que o dono recusou.
    const link = linkDaSala(BASE, SALA, 'ES');
    const valor = new URL(link).searchParams.get(PARAM_ANFITRIAO);
    expect(valor).toBe('ES');
    expect(valor, 'o link voltou a levar as duas seleções').not.toContain('_');
  });

  it('o código com subdivisão atravessa inteiro (GB-ENG, a exceção de D-52)', () => {
    // O separador do formato antigo é `_` e não `-` justamente por isto: `GB-ENG` tem hífen, e
    // partir por hífen faria a Inglaterra virar "GB" — que não está no catálogo.
    expect(anfitriaoDoEndereco(linkDaSala(BASE, SALA, 'GB-ENG'), ehDoCatalogo)).toBe('GB-ENG');
  });

  it('link de antes de D-90 vale pelo PRIMEIRO código; o segundo é ignorado', () => {
    // O convite antigo é `t=<anfitrião>_<convidado>`. O primeiro continua sendo quem chamou, e
    // vale. O segundo era a seleção que o anfitrião escolhia PELO convidado, e é a que `D-90`
    // desfez: lê-la agora seria uma segunda fonte para o que o `Pick` traz — e a que chega
    // primeiro é a errada.
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=ES_AR`, ehDoCatalogo)).toBe('ES');
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=GB-ENG_BR`, ehDoCatalogo)).toBe('GB-ENG');
    // E o segundo é ignorado mesmo quando é lixo: quem manda é o primeiro.
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=ES_ZZZZ`, ehDoCatalogo)).toBe('ES');
  });

  it('convite sem a seleção, ou com código fora do catálogo, devolve null e não lança', () => {
    // Os três `null`, e todos têm a MESMA saída na tela: "escolhendo…", até o `Pick` chegar.
    expect(anfitriaoDoEndereco(linkDaSala(BASE, SALA), ehDoCatalogo)).toBeNull();
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=ZZ`, ehDoCatalogo)).toBeNull();
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=`, ehDoCatalogo)).toBeNull();
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=_AR`, ehDoCatalogo)).toBeNull();
    expect(anfitriaoDoEndereco('isto não é endereço nenhum', ehDoCatalogo)).toBeNull();
  });

  it('minúsculas do teclado, e espaço colado pelo mensageiro, ainda achatam no código certo', () => {
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=es`, ehDoCatalogo)).toBe('ES');
    expect(anfitriaoDoEndereco(`${BASE}?${PARAM_ANFITRIAO}=%20es%20`, ehDoCatalogo)).toBe('ES');
  });

  it('a seleção do link sai do catálogo de verdade, não de uma lista escrita na tela', () => {
    // O predicado é o de M4. Se o catálogo mudar, o convite muda junto — sem segunda lista.
    const [primeiro] = listTeams();
    expect(primeiro, 'catálogo vazio: o teste passaria por vácuo').toBeDefined();
    if (primeiro === undefined) return;
    const link = linkDaSala(BASE, SALA, primeiro.code);
    expect(anfitriaoDoEndereco(link, ehDoCatalogo)).toBe(primeiro.code);
  });

  it('o código legível quebra de 4 em 4 sem perder nem inventar caractere', () => {
    expect(salaLegivel(SALA).replace(/ /g, '')).toBe(SALA);
    expect(salaLegivel(SALA).split(' ')[0]).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// `T-31` / `D-90` — cada aparelho escolhe a própria seleção
//
// O portão de verdade é do dono, em DOIS aparelhos (o sandbox não compõe quadros, e `document`
// não existe aqui). O que dá para cobrar sem navegador são as duas metades que erram em
// silêncio: os rótulos com o lado do peer ainda `null`, e o que está ESCRITO nas telas — que é
// como o resto deste arquivo já cobre M7 desde `T-20`.
// ═══════════════════════════════════════════════════════════════════════════════════════════
describe('a espera pela seleção do outro aparelho (T-31 / D-90)', () => {
  const VAZIO: Record<Side, string | null> = { A: 'ES', B: null };

  it('sem seleção do outro lado, o rótulo diz "escolhendo…" — nunca vazio nem "null"', () => {
    expect(nomeSelecao(null)).toBe(ESCOLHENDO);
    expect(nomeSelecao(null)).not.toBe('');
    expect(nomeSelecao(null).toLowerCase()).not.toContain('null');
    expect(nomeSelecao(null).toLowerCase()).not.toContain('undefined');
  });

  it('nenhum rótulo que recebe o confronto derrama "null" quando um lado ainda é espera', () => {
    // A regra 1 do cabeçalho de `rotulos.ts`, aplicada ao estado novo: `null` no lado do peer é
    // caminho normal do `online`, e ele atravessa TODAS estas funções antes do primeiro toque.
    const zerado = createSession({
      mode: 'local',
      seed: 7,
      teams: { A: 'ES', B: 'AR' },
      localSide: 'A',
    }).state();

    const saidas = [
      desfecho(zerado, VAZIO),
      textoDaSerie({ A: 2, B: 1 }, VAZIO) ?? '',
      sorteioDoPrimeiro(zerado, VAZIO)?.texto ?? '',
    ];

    for (const texto of saidas) {
      expect(texto).not.toBe('');
      expect(texto.toLowerCase(), texto).not.toContain('null');
      expect(texto.toLowerCase(), texto).not.toContain('undefined');
      expect(texto, texto).not.toContain('NaN');
    }
  });

  it('o sorteio nomeia a espera quando o lado sorteado é o que ainda não escolheu', () => {
    // Ele não some, e não inventa: a tela é quem decide não MOSTRAR o painel nesse estado (ver
    // o gate em `tela_cobranca.ts`, cobrado logo abaixo). Aqui se cobra que o texto seja honesto
    // caso alguém volte a mostrá-lo.
    const sessao = createSession({ mode: 'local', seed: 7, teams: { A: 'ES', B: 'AR' }, localSide: 'A' });
    const anuncio = sorteioDoPrimeiro(sessao.state(), { A: null, B: null });
    expect(anuncio).not.toBeNull();
    expect(anuncio?.texto).toContain(ESCOLHENDO);
  });

  // ── O que está escrito nas telas ────────────────────────────────────────────────────────

  it('a tela de seleções monta UMA grade no online — o anfitrião não escolhe pelos dois', () => {
    const fonte = readFileSync(join(DIR_UI, 'tela_selecoes.ts'), 'utf8');
    // A grade única é a do lado DESTE aparelho, e o outro lado vai `null` para a sessão.
    expect(fonte, 'a grade do online deixou de ser a do lado local').toMatch(
      /grade\(ladoLocal,/,
    );
    expect(fonte, 'o lado do peer deixou de nascer null (D-90)').toMatch(
      /times\[ladoRemoto\] = null/,
    );
  });

  it('a tela de cobrança lê a seleção do peer do 3º argumento de subscribe, e não da rota', () => {
    const fonte = readFileSync(join(DIR_UI, 'tela_cobranca.ts'), 'utf8');
    expect(fonte, 'o 3º argumento de subscribe sumiu da tela').toMatch(
      /subscribe\([\s\S]{0,400}?selecoes:\s*Record<Side, CountryCode \| null>/,
    );
    // E o retrato do começo deixou de ser lido no corpo da disputa: `partida.times` sobrevive
    // apenas onde ele é a CRIAÇÃO da sessão (`configDaPartida`) e no estado vivo que sai dele.
    const corpo = fonte.slice(fonte.indexOf('export const telaCobranca'));
    const leituras = corpo.split('\n').filter((l) => /partida\.times/.test(l) && !/^\s*(\*|\/\/)/.test(l));
    expect(leituras, `a tela voltou a ler o retrato do começo: ${leituras.join(' | ')}`).toEqual([
      '    const times: Record<Side, CountryCode | null> = { A: partida.times.A, B: partida.times.B };',
    ]);
  });

  it('não se cobra sem confronto: o toque, o teclado e o relógio de 15 s param na mesma guarda', () => {
    const fonte = readFileSync(join(DIR_UI, 'tela_cobranca.ts'), 'utf8');
    // O teclado chama `escolher()` direto — um botão `disabled` não tranca a seta. Por isso a
    // guarda mora na função, e não só no `travarZonas`.
    expect(fonte, 'o toque deixou de checar a espera pela seleção').toMatch(
      /function escolher\(zona: Zone\): void \{[\s\S]{0,300}?esperandoSelecao\(\)/,
    );
    // E o relógio de `T-24`: sem esta guarda ele cobraria no escuro por quem nem pode tocar.
    expect(fonte, 'o relógio de 15 s deixou de checar a espera pela seleção').toMatch(
      /function armarRelogio\(\): void \{[\s\S]{0,400}?esperandoSelecao\(\)/,
    );
    expect(fonte, 'a faixa deixou de dizer o que está acontecendo').toMatch(/AVISO_SEM_SELECAO/);
  });

  it('a folha tem o disco de espera, e ele não pede matiz nenhum', () => {
    const folha = readFileSync(fileURLToPath(new URL('../ui/estilo.css', import.meta.url)), 'utf8');
    const regra = /\.marca--vazia\s*\{([^}]*)\}/.exec(folha)?.[1];
    expect(regra, 'a regra `.marca--vazia` sumiu da folha').toBeDefined();
    // Matiz derivado de código nenhum seria a espera parecendo uma seleção.
    expect(regra, 'o disco de espera passou a inventar cor de seleção').not.toContain('--matiz');
  });
});

describe('resumo das cobranças: o número aparece uma vez (QA-23)', () => {
  // O defeito veio das duas fotos do dono: a MESMA disputa saiu "1. 1. Espanha" num aparelho e
  // "1. Brasil" no outro. A causa é `.grupo` deixar o `<ol>` em `display: flex`, e o marcador do
  // `<li>` nesse caso ficar a critério do navegador. Aqui se cobra a correção pelos dois lados,
  // que é a única forma de ela não voltar: o texto numera, e a folha apaga o marcador.
  it('a lista leva a classe que apaga o marcador, e a folha tem a regra', () => {
    const fonte = readFileSync(join(DIR_UI, 'tela_fim.ts'), 'utf8');
    expect(fonte, 'o resumo deixou de marcar a lista com `.resumo`').toMatch(
      /classe:\s*'grupo resumo'/,
    );

    const folha = readFileSync(fileURLToPath(new URL('../ui/estilo.css', import.meta.url)), 'utf8');
    const regra = /\.resumo\s*\{([^}]*)\}/.exec(folha)?.[1];
    expect(regra, '.resumo sumiu da folha').toBeDefined();
    expect(regra, 'o marcador voltou a ser desenhado pelo navegador').toMatch(
      /list-style:\s*none/,
    );
  });

  it('o texto numera — apagar o número do texto deixaria a lista sem número nenhum', () => {
    // Com o marcador desligado, o `${i + 1}.` do texto é a ÚNICA numeração que sobra.
    const fonte = readFileSync(join(DIR_UI, 'tela_fim.ts'), 'utf8');
    expect(fonte).toMatch(/\$\{i \+ 1\}\./);
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

// ── `T-22`: o contador do prazo da espera ──────────────────────────────────────────────────
describe('contador dos segundos que faltam (T-22)', () => {
  it('o prazo vem de M5, e é o MESMO valor que M6 arma — não uma cópia', () => {
    // É a saída (b) do card, e é isto que ela compra: se alguém mudar o prazo em `src/net`, o
    // número da tela muda junto. A cópia local que a saída (a) pediria passaria neste teste
    // no dia em que fosse escrita e mentiria em silêncio no dia seguinte.
    expect(CONNECT_TIMEOUT_MS).toBe(20_000);
    expect(segundosRestantes(CONNECT_TIMEOUT_MS, 0)).toBe(20);
  });

  it('conta para baixo em segundos inteiros, e o primeiro tique mostra o prazo cheio', () => {
    expect(segundosRestantes(20_000, 0)).toBe(20);
    expect(segundosRestantes(20_000, 1)).toBe(20);
    expect(segundosRestantes(20_000, 500)).toBe(20);
    expect(segundosRestantes(20_000, 1_000)).toBe(19);
    expect(segundosRestantes(20_000, 19_999)).toBe(1);
  });

  it('nunca negativo, nunca `NaN` — relógio passado do prazo é zero', () => {
    expect(segundosRestantes(20_000, 20_000)).toBe(0);
    expect(segundosRestantes(20_000, 999_999)).toBe(0);
    expect(segundosRestantes(Number.NaN, 0)).toBe(0);
    expect(segundosRestantes(Number.POSITIVE_INFINITY, 0)).toBe(0);
  });

  it('a frase promete o fim da DISPUTA, e nunca reconexão', () => {
    // A tensão que `D-80`/`D-81` criaram: o `'failed'` que M7 recebe pode ser sintetizado por
    // M5 com o transporte de pé. Um texto sobre "conexão" ou "reconectando" mentiria ali.
    const frases = [textoDaEspera(20), textoDaEspera(1), textoDaEspera(0), AVISO_PEER_SUMIU];
    for (const frase of frases) {
      expect(frase).not.toMatch(/conex[ãa]o|reconect|sinal|rede|internet/i);
      expect(frase).not.toMatch(/undefined|NaN/);
    }
    expect(textoDaEspera(20)).toContain('20 s');
    expect(textoDaEspera(20)).toContain('disputa');
  });

  it('em zero a frase para de contar em vez de congelar "0 s"', () => {
    expect(textoDaEspera(0)).not.toMatch(/\d/);
    expect(textoDaEspera(-3)).toBe(textoDaEspera(0));
  });
});

// ── `T-24`: o prazo de 15 s por cobrança no `online` (`Q-15`/`D-84`) ────────────────────────
describe('prazo da cobrança no online (T-24)', () => {
  it('são os 15 s que o dono decidiu, e o mesmo relógio de `T-22` os conta', () => {
    expect(PRAZO_COBRANCA_MS).toBe(15_000);
    expect(segundosRestantes(PRAZO_COBRANCA_MS, 0)).toBe(15);
  });

  it('vence ANTES do prazo que M6 dá ao peer sumido — senão o sorteio chegaria tarde', () => {
    // O invariante que sustenta a saída (b): aos 15 s este aparelho ainda tem canal para mandar
    // a jogada. Se o prazo passasse de `CONNECT_TIMEOUT_MS`, a disputa já teria acabado por
    // abandono (`D-35`) e o sorteio nunca sairia daqui.
    expect(PRAZO_COBRANCA_MS).toBeLessThan(CONNECT_TIMEOUT_MS);
    expect(SEGUNDOS_DE_PRESSA).toBeLessThan(PRAZO_COBRANCA_MS / 1000);
  });

  it('a frase promete SORTEIO, nunca cobrança perdida nem placar', () => {
    // "Quem demorou perde" é a regra do dono; o que a TELA faz é sortear a zona. Prometer perda
    // aqui seria a UI antecipando um placar que só o motor escreve.
    const frases = [textoDoPrazo(15), textoDoPrazo(1), textoDoPrazo(0), AVISO_COBRANCA_SORTEADA];
    for (const frase of frases) {
      expect(frase).not.toMatch(/undefined|NaN/);
      expect(frase).not.toMatch(/perde|perdeu|perdida|gol|placar|conex[ãa]o|rede/i);
      expect(frase).toMatch(/sorte/i);
    }
    expect(textoDoPrazo(15)).toContain('15 s');
  });

  it('em zero para de contar em vez de congelar um número', () => {
    expect(textoDoPrazo(0)).not.toMatch(/\d/);
    expect(textoDoPrazo(-2)).toBe(textoDoPrazo(0));
  });

  it('o aviso falado sai com segundo inteiro, nunca negativo nem fracionário', () => {
    expect(avisoDePressa(5)).toContain('5 segundos');
    expect(avisoDePressa(4.7)).toContain('4 segundos');
    expect(avisoDePressa(-1)).toContain('0 segundos');
    expect(avisoDePressa(Number.NaN)).not.toMatch(/NaN/);
  });

  it('o sorteio do estouro sai do gerador de M1, e cai sempre numa das três zonas', () => {
    // A zona nasce de `createRng(newSeed()).int(ZONAS.length)` — o mesmo caminho que a tela usa.
    // O que este teste cobra é o índice: `int` inclui o 0 (defeito 3 da v1) e nunca alcança o 3.
    const vistas = new Set<string>();
    for (let i = 0; i < 2_000; i++) {
      const zona = ZONAS[createRng(newSeed()).int(ZONAS.length)];
      expect(zona).toBeDefined();
      vistas.add(String(zona));
    }
    expect(vistas).toEqual(new Set(['L', 'C', 'R']));
  });
});

describe('a série de revanches (T-32)', () => {
  const CONFRONTO = { A: 'BR', B: 'ES' } as const;

  /** Joga a série inteira a partir do zero, como a tela de fim faz a cada revanche. */
  function serieDe(vencedores: readonly (Side | null)[]): Serie {
    return vencedores.reduce<Serie>((s, v) => serieComVencedor(s, v), SERIE_ZERO);
  }

  it('três revanches seguidas devolvem o placar da série, não o da última partida', () => {
    // O portão do card: A, B, A → "2 × 1 em 3 partidas". A tela mostra a série já COM a
    // partida que acabou de terminar, e é essa mesma série que segue para a revanche.
    const serie = serieDe(['A', 'B', 'A']);
    expect(serie).toEqual({ A: 2, B: 1 });
    expect(partidasDaSerie(serie)).toBe(3);

    const frase = textoDaSerie(serie, CONFRONTO);
    expect(frase).not.toBeNull();
    expect(frase).toContain('2 × 1');
    expect(frase).toContain('3 partidas');
    expect(frase).toContain(nomeSelecao('BR'));
    expect(frase).toContain(nomeSelecao('ES'));
  });

  it('a série cresce de UM em UM, e o total é a soma dos dois lados', () => {
    let serie: Serie = SERIE_ZERO;
    for (let i = 1; i <= 6; i++) {
      serie = serieComVencedor(serie, i % 2 === 0 ? 'B' : 'A');
      expect(partidasDaSerie(serie)).toBe(i);
      expect(serie.A + serie.B).toBe(i);
    }
    expect(serie).toEqual({ A: 3, B: 3 });
  });

  it('zerar é começar de novo: SERIE_ZERO não guarda nada da série anterior', () => {
    // "Voltar ao início" e "trocar de seleção" não limpam nada — eles criam uma `Partida` nova,
    // e ela nasce com este valor. O teste cobra que o zero é zero de verdade, e imutável.
    const jogada = serieDe(['A', 'A', 'B']);
    expect(jogada).toEqual({ A: 2, B: 1 });
    expect(SERIE_ZERO).toEqual({ A: 0, B: 0 });
    expect(partidasDaSerie(SERIE_ZERO)).toBe(0);
    expect(textoDaSerie(SERIE_ZERO, CONFRONTO)).toBeNull();
  });

  it('a primeira partida não vira linha de série — ela repetiria o placar de cima', () => {
    expect(MINIMO_DA_SERIE).toBe(2);
    expect(textoDaSerie(serieDe(['A']), CONFRONTO)).toBeNull();
    expect(textoDaSerie(serieDe(['A', 'B']), CONFRONTO)).not.toBeNull();
  });

  it('disputa sem vencedor não entra na conta, nem como vitória nem como partida', () => {
    // `winner` é `Side | null` no tipo, e o estado de erro da tela existe por isso. Contar o
    // `null` faria "em 3 partidas" incluir uma que não terminou.
    const serie = serieDe(['A', null, 'B', null]);
    expect(serie).toEqual({ A: 1, B: 1 });
    expect(partidasDaSerie(serie)).toBe(2);
  });

  it('o número é inteiro e são: nada de NaN, negativo ou casa decimal na tela', () => {
    const torta = { A: Number.NaN, B: -3 } as unknown as Serie;
    expect(serieComVencedor(torta, 'A')).toEqual({ A: 1, B: 0 });
    expect(partidasDaSerie(torta)).toBe(0);
    expect(partidasDaSerie({ A: 2.7, B: 1.2 } as Serie)).toBe(3);

    const frase = textoDaSerie({ A: 2.7, B: 1.2 } as Serie, CONFRONTO);
    expect(frase).not.toBeNull();
    expect(frase).not.toMatch(/NaN|undefined|-\d|\d\.\d/);
  });


  it('a série não grava nada: nenhum armazenamento novo entrou em src/ui/', () => {
    // O escopo do card é série NA MEMÓRIA. Quem toca `localStorage`/`sessionStorage` em M7
    // continua sendo dois arquivos, e só eles — mais um exigiria `D-NN` dizendo o que fica
    // gravado e por quanto tempo.
    const donos = new Set(['preferencias.ts', 'torneio_salvo.ts']);
    const infratores = arquivosDeUi(DIR_UI)
      .filter((a) => /(localStorage|sessionStorage)/.test(readFileSync(a, 'utf8')))
      .map((a) => relative(DIR_UI, a).split(sep).join('/'))
      .filter((nome) => !donos.has(nome));
    expect(infratores).toEqual([]);
  });

  it('a revanche leva a série adiante, e o online a zera — lido da fonte de tela_fim.ts', () => {
    // Nenhuma tela de M7 é alcançável pela suíte (`vitest` roda em Node sem DOM), então o que
    // este teste alcança é o texto do arquivo — o mesmo caminho do portão de camada acima.
    const fonte = readFileSync(join(DIR_UI, 'tela_fim.ts'), 'utf8');

    // "Jogar de novo": semente nova E a série somada seguem na mesma `Partida`.
    expect(fonte).toMatch(/nome: 'cobranca',[\s\S]*?semente: newSeed\(\), serie \}/);
    // "Convidar de novo": sala nova, série zerada, nunca herdada pelo espalhamento.
    expect(fonte).toMatch(/nome: 'convite',[\s\S]*?serie: SERIE_ZERO/);
    // O torneio e o online não contam série nenhuma.
    expect(fonte).toContain("!partida.torneio && partida.modo !== 'online'");
  });

  it('a frase se explica sozinha para quem lê e para quem ouve', () => {
    const frase = textoDaSerie(serieDe(['A', 'B']), CONFRONTO) ?? '';
    // Ela é lida assim como está, inclusive por leitor de tela: não há `aria-label` a manter
    // em dia, e é a própria frase que precisa dizer do que se trata.
    expect(frase).toMatch(/^Série:/);
    // Sem jargão nem termo da lista-morta de licenciamento: nome de país e número, só.
    expect(frase).not.toMatch(/FIFA|Copa do Mundo|match|rematch|score/i);
  });
});
