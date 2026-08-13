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

import { criarDerivacao, outroLado } from '../ui/derivacao';
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

  it('a marca já sabe que existe bandeira — quem ainda não sabe é a tela (QA-19)', () => {
    // O teste antigo cobrava `ehBandeira === false` e `texto === código`, condição de quando
    // `flag` era `null` para as 32 (`D-22`). `T-19` entregou os SVGs e a condição caiu; ela foi
    // REDIRECIONADA, não apagada, porque o que ela vigiava continua de pé pela metade:
    // `marcaSelecao` já vira a chave, e `marca()` em `tela_selecoes.ts` ainda escreve `texto`
    // como TEXTO — hoje o caminho do arquivo dentro do disco de 34px. Isso é `QA-19`, é de M7 e
    // não foi consertado nesta sessão (regra 4). No dia em que a tela pintar `<img>`, é este
    // teste que tem de ser revisitado.
    const m = marcaSelecao(BR);
    expect(m.ehBandeira).toBe(true);
    expect(m.texto).toMatch(/\.svg$/);
    expect(Number.isInteger(m.matiz)).toBe(true);
    expect(m.matiz).toBeGreaterThanOrEqual(0);
    expect(m.matiz).toBeLessThan(360);
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
