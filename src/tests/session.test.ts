import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

// Este arquivo importa de `../session/index` e de mais NADA do motor: se um dos três
// reexports sumir da porta de M5, `npm run typecheck` reprova aqui, no arquivo de teste,
// antes de qualquer asserção rodar. É a metade do portão que só um tipo pode provar.
import { createSession } from '../session/index';
import type { LinkStatus, Level, MatchState, Session, SessionConfig } from '../session/index';

import type { Side, Zone } from '../core/index';

const FONTE_M5 = fileURLToPath(new URL('../session/index.ts', import.meta.url));

const ZONAS: readonly Zone[] = ['L', 'C', 'R'];
const LADOS: readonly Side[] = ['A', 'B'];
const NIVEIS: readonly Level[] = ['easy', 'medium', 'hard'];

/** Códigos da lista de fixação de M4 (`T-08`). */
const BR = 'BR';
const AR = 'AR';

function cfgCpu(seed: number, level: Level, localSide: Side): SessionConfig {
  return { mode: 'cpu', seed, level, teams: { A: BR, B: AR }, localSide };
}

function cfgLocal(seed: number): SessionConfig {
  return { mode: 'local', seed, teams: { A: BR, B: AR }, localSide: 'A' };
}

/** Zona pseudoaleatória SEM gerador nativo: o roteiro do humano tem de ser reproduzível. */
function roteiro(n: number, offset: number): Zone[] {
  const out: Zone[] = [];
  for (let i = 0; i < n; i += 1) {
    const zona = ZONAS[(i * 7 + offset * 3) % 3];
    if (zona === undefined) throw new Error('roteiro: índice fora da faixa');
    out.push(zona);
  }
  return out;
}

/** Joga a sessão `cpu` até o fim (ou até o roteiro acabar) e devolve o estado final. */
function jogarCpu(cfg: SessionConfig, zonas: readonly Zone[]): MatchState {
  const s = createSession(cfg);
  for (const z of zonas) {
    if (s.state().phase === 'finished') break;
    s.choose(z);
  }
  return s.state();
}

/** Repete no modo `local` exatamente os pares (chute, defesa) que chegaram a M2. */
function repetirNoLocal(seed: number, kicks: MatchState['kicks']): MatchState {
  const s = createSession(cfgLocal(seed));
  for (const k of kicks) {
    s.choose(k.shot); // 1a escolha = o chute de quem cobra
    s.choose(k.dive); // 2a escolha = a defesa do outro lado
  }
  return s.state();
}

describe('M5 — reexportação dos tipos da porta (portão de camada de M7)', () => {
  it('a fonte reexporta os TRÊS tipos que a assinatura usa', () => {
    const fonte = readFileSync(FONTE_M5, 'utf8');
    for (const tipo of ['MatchState', 'LinkStatus', 'Level']) {
      expect(
        new RegExp(`export type \\{[^}]*\\b${tipo}\\b[^}]*\\} from`).test(fonte),
        `M5 não reexporta ${tipo} — o portão de camada de M7 fica impossível para esse tipo`,
      ).toBe(true);
    }
  });

  it('os tipos reexportados são usáveis sem tocar em engine, cpu ou net', () => {
    // Se algum destes não viesse por M5, o arquivo não compilaria. O `expect` aqui é só para
    // o teste existir em runtime; a prova de verdade é o `tsc`.
    const estado: MatchState = createSession(cfgLocal(1)).state();
    const status: LinkStatus = 'idle';
    const nivel: Level = 'hard';
    expect(estado.phase).toBe('regular');
    expect(status).toBe('idle');
    expect(nivel).toBe('hard');
  });
});

describe('M5 — os modos produzem o MESMO MatchState para a mesma sequência de zonas', () => {
  it('cpu e local coincidem em todos os níveis e nos dois lados locais', () => {
    for (const level of NIVEIS) {
      for (const localSide of LADOS) {
        for (const seed of [0, 7, 12345, 999_983]) {
          const doCpu = jogarCpu(cfgCpu(seed, level, localSide), roteiro(40, seed % 3));
          const doLocal = repetirNoLocal(seed, doCpu.kicks);

          // Sem esta linha o teste passaria VAZIO: zero cobrança de um lado é igual a zero
          // cobrança do outro, e a igualdade não teria comparado nada. O piso é 6 porque é o
          // mínimo de cobranças com que a morte matemática pode encerrar uma disputa (3x0).
          expect(doCpu.kicks.length, `seed ${seed}: disputa curta demais`).toBeGreaterThanOrEqual(6);
          expect(doCpu.phase, `seed ${seed}: disputa não terminou`).toBe('finished');

          expect(doLocal, `seed ${seed} · ${level} · lado ${localSide}`).toEqual(doCpu);
          expect(doLocal.goals).toEqual(doCpu.goals);
          expect(doLocal.winner).toBe(doCpu.winner);
        }
      }
    }
  });

  it('a mesma semente roda 2x com o mesmo resultado (critério de aceite do CONTEXT)', () => {
    const zonas = roteiro(40, 1);
    const primeira = jogarCpu(cfgCpu(4242, 'hard', 'A'), zonas);
    const segunda = jogarCpu(cfgCpu(4242, 'hard', 'A'), zonas);
    expect(segunda).toEqual(primeira);
  });

  it('a disputa completa termina com placar inteiro e vencedor', () => {
    const final = jogarCpu(cfgCpu(31, 'medium', 'A'), roteiro(60, 2));
    expect(final.phase).toBe('finished');
    expect(final.winner).not.toBeNull();
    expect(Number.isInteger(final.goals.A)).toBe(true);
    expect(Number.isInteger(final.goals.B)).toBe(true);
    expect(final.goals.A + final.goals.B).toBeLessThanOrEqual(final.kicks.length);
  });
});

/* ───────────── T-17 / D-48 — o sorteio de quem cobra primeiro ───────────── */

describe('M5 · T-17 — quem cobra primeiro sai de sorteio com o Rng de M1 (D-48)', () => {
  /** O primeiro cobrador de uma sessão recém-criada. É `match.turn` antes de qualquer escolha. */
  function primeiroCobrador(cfg: SessionConfig): Side {
    const s = createSession(cfg);
    const turn = s.state().turn;
    s.dispose();
    if (turn === null) throw new Error('sessão nova com turn nulo — defeito de M2 ou de M5');
    return turn;
  }

  it('o sorteio é uniforme sobre milhares de sementes — nenhum lado é o padrão disfarçado', () => {
    // 4.000 sementes consecutivas. O teto e o piso são a faixa de ±5% em torno de 2.000; com o
    // mulberry32 de M1 a contagem medida é A=1.998 · B=2.002, e é determinística, então este
    // teste não é estatístico de verdade: ele reprova a REGRESSÃO de alguém devolver uma
    // constante. `const first = 'A'` daria 4.000 e 0, que a faixa recusa em qualquer dos lados.
    const N = 4000;
    const contagem: Record<Side, number> = { A: 0, B: 0 };
    for (let seed = 0; seed < N; seed += 1) contagem[primeiroCobrador(cfgLocal(seed))] += 1;

    expect(contagem.A + contagem.B).toBe(N);
    for (const lado of LADOS) {
      expect(contagem[lado], `lado ${lado} fora da faixa uniforme: ${contagem[lado]} de ${N}`)
        .toBeGreaterThan(N * 0.45);
      expect(contagem[lado]).toBeLessThan(N * 0.55);
    }
  });

  it('mesma semente = mesmo primeiro cobrador (o critério "roda 2x com o mesmo resultado")', () => {
    for (const seed of [0, 1, 7, 31, 4242, 12345, 999_983]) {
      const primeira = primeiroCobrador(cfgLocal(seed));
      const segunda = primeiroCobrador(cfgLocal(seed));
      expect(segunda, `semente ${seed} sorteou lados diferentes em duas criações`).toBe(primeira);
    }
  });

  it('sementes diferentes chegam aos DOIS lados — o sorteio não é decorativo', () => {
    const vistos = new Set<Side>();
    for (let seed = 0; seed < 50; seed += 1) vistos.add(primeiroCobrador(cfgLocal(seed)));
    expect([...vistos].sort()).toEqual(['A', 'B']);
  });

  it('`cpu` e `local` sorteiam o MESMO lado para a mesma semente', () => {
    // O sorteio é a primeira leitura do gerador da sessão nos dois modos. Se algum dia ele passar
    // a acontecer depois do primeiro `pick` da CPU, os dois modos divergem aqui — e a equivalência
    // entre modos, que é portão de T-09, cairia junto sem que nenhum tipo reclamasse.
    for (const seed of [0, 1, 7, 31, 555, 4242, 12345]) {
      for (const level of NIVEIS) {
        for (const localSide of LADOS) {
          expect(
            primeiroCobrador(cfgCpu(seed, level, localSide)),
            `semente ${seed} · ${level} · lado ${localSide}`,
          ).toBe(primeiroCobrador(cfgLocal(seed)));
        }
      }
    }
  });

  it('o lado local NÃO decide quem cobra primeiro — quem decide é a semente', () => {
    // Sem esta linha, "sorteio" poderia significar na prática "o humano sempre começa", que é o
    // defeito de T-17 com outra roupa.
    for (const seed of [0, 1, 7, 31, 555, 4242, 12345, 999_983]) {
      expect(primeiroCobrador(cfgCpu(seed, 'hard', 'A'))).toBe(
        primeiroCobrador(cfgCpu(seed, 'hard', 'B')),
      );
    }
  });

  it('a ordem é constante numa disputa completa com alternadas, pelos dois modos', () => {
    // A não-alternância é regra de M2 (`D-48`), e este teste a confere pelo caminho que a tela
    // usa: sessão de verdade, escolha por escolha, até o fim.
    //
    // No modo `local` uma cobrança custa DUAS chamadas de `choose` (o chute e a defesa), e é por
    // isso que o roteiro é escrito cobrança a cobrança em vez de zona a zona: contar as duas como
    // uma faria a disputa terminar na metade do roteiro, com o teste acusando o código.
    for (const seed of [0, 7, 31, 12345]) {
      const sessao = createSession(cfgLocal(seed));
      const primeiro = sessao.state().turn;
      expect(primeiro).not.toBeNull();
      if (primeiro === null) return;
      const outro: Side = primeiro === 'A' ? 'B' : 'A';

      /** Uma cobrança: mesma zona = defesa, zonas diferentes = gol. */
      const cobrar = (gol: boolean): void => {
        sessao.choose('L');
        sessao.choose(gol ? 'R' : 'L');
      };

      // 10 defesas = 0x0 ao fim da fase regular: o caminho garantido até as alternadas, sem sorte.
      for (let k = 0; k < 10; k += 1) cobrar(false);
      expect(sessao.state().phase, `semente ${seed}`).toBe('suddenDeath');
      // O que a alternância teria quebrado: a fase alternada começa com o MESMO lado sorteado.
      expect(sessao.state().turn, `semente ${seed}: a alternada não começou com o sorteado`).toBe(primeiro);

      // Primeira rodada alternada: gol de quem cobra primeiro, defesa do outro → decide.
      cobrar(true);
      cobrar(false);

      const fim = sessao.state();
      expect(fim.phase, `semente ${seed}`).toBe('finished');
      expect(fim.kicks.length, `semente ${seed}`).toBe(12);
      expect(fim.winner, `semente ${seed}`).toBe(primeiro);

      fim.kicks.forEach((k, i) => {
        expect(k.side, `semente ${seed}, cobrança ${i}`).toBe(i % 2 === 0 ? primeiro : outro);
      });

      sessao.dispose();
    }
  });

  // O modo `online` NÃO sorteia (lacuna de `Q-11`), e isso é conferido em
  // `session_online.test.ts`: criar sessão `online` exige a sinalização falsa, que mora lá.
});

describe('M5 — evento inválido nunca chega a M2', () => {
  const invalidas: readonly unknown[] = ['X', 'l', '', 0, 1, null, undefined, {}, ['L']];

  it('zona inválida morre em M5, com a mensagem de M5 — não a de M2', () => {
    for (const ruim of invalidas) {
      const s = createSession(cfgLocal(3));
      const antes = s.state();

      // A mensagem é a prova: M2 diria "play: zona inválida". Se essa fosse a mensagem, o
      // evento TERIA chegado a M2 e o portão estaria reprovado.
      expect(() => {
        s.choose(ruim as Zone);
      }).toThrowError(/^Session\.choose: zona inválida/);

      expect(s.state()).toBe(antes);
    }
  });

  it('zona inválida no modo cpu também não consome o gerador nem o histórico', () => {
    const s = createSession(cfgCpu(11, 'hard', 'A'));
    expect(() => {
      s.choose('Z' as Zone);
    }).toThrowError(/^Session\.choose: zona inválida/);

    // Se a recusa tivesse acontecido depois do `pick`, o gerador teria andado e a cobrança
    // seguinte sairia diferente da de uma sessão intocada.
    const limpa = createSession(cfgCpu(11, 'hard', 'A'));
    s.choose('L');
    limpa.choose('L');
    expect(s.state()).toEqual(limpa.state());
  });

  it('zona inválida na 2a escolha do modo local não consome a escolha pendente', () => {
    const s = createSession(cfgLocal(5));
    s.choose('L');
    expect(() => {
      s.choose('W' as Zone);
    }).toThrowError(/^Session\.choose: zona inválida/);

    s.choose('C'); // a defesa válida ainda resolve a MESMA cobrança
    const k = s.state().kicks[0];
    expect(s.state().kicks).toHaveLength(1);
    expect(k?.shot).toBe('L');
    expect(k?.dive).toBe('C');
  });

  it('escolha depois do fim é recusada por M5', () => {
    const s = createSession(cfgCpu(31, 'medium', 'A'));
    for (const z of roteiro(60, 2)) {
      if (s.state().phase === 'finished') break;
      s.choose(z);
    }
    expect(s.state().phase).toBe('finished');
    const final = s.state();

    expect(() => {
      s.choose('L');
    }).toThrowError(/^Session\.choose: disputa encerrada/);
    expect(s.state()).toBe(final);
  });
});

describe('M5 — dispose() não deixa assinante vivo', () => {
  it('nenhum assinante é chamado depois do dispose(), nem pelo próprio dispose()', () => {
    const s = createSession(cfgLocal(9));
    const espiao = vi.fn();
    s.subscribe(espiao);

    s.choose('L');
    const antes = espiao.mock.calls.length;
    expect(antes).toBeGreaterThan(0);

    s.dispose();
    expect(espiao.mock.calls.length).toBe(antes); // o dispose() em si não avisa ninguém

    expect(() => {
      s.choose('C');
    }).toThrowError(/^Session\.choose: sessão encerrada/);
    expect(espiao.mock.calls.length).toBe(antes);
  });

  it('dispose() SOLTA a referência, não só torna o assinante inalcançável', () => {
    // As asserções acima provam que nenhum caminho chama o assinante depois do `dispose()`.
    // Elas NÃO distinguem "conjunto limpo" de "conjunto cheio e inalcançável" — e a segunda
    // é vazamento: a sessão morta continuaria segurando a tela viva. Sem `WeakRef` confiável
    // no runner, a diferença só é verificável na fonte.
    const fonte = readFileSync(FONTE_M5, 'utf8');
    const corpoDispose = fonte.slice(fonte.indexOf('dispose(): void {'));
    expect(corpoDispose.includes('subscribers.clear()')).toBe(true);
  });

  it('dispose() é idempotente e a função de cancelar continua segura depois dele', () => {
    const s = createSession(cfgLocal(9));
    const cancelar = s.subscribe(vi.fn());
    s.dispose();
    expect(() => {
      s.dispose();
    }).not.toThrow();
    expect(() => {
      cancelar();
    }).not.toThrow();
  });

  it('subscribe() depois do dispose() é recusado — assinante novo em sessão morta é vazamento', () => {
    const s = createSession(cfgLocal(9));
    s.dispose();
    expect(() => s.subscribe(vi.fn())).toThrowError(/^Session\.subscribe: sessão encerrada/);
  });

  it('state() continua legível depois do dispose(), congelado no último estado', () => {
    const s = createSession(cfgLocal(9));
    s.choose('L');
    s.choose('R');
    const final = s.state();
    s.dispose();
    expect(s.state()).toBe(final);
  });
});

describe('M5 — assinatura e notificação', () => {
  it('cancelar a inscrição para de notificar, e cancelar 2x não quebra', () => {
    const s = createSession(cfgLocal(2));
    const espiao = vi.fn();
    const cancelar = s.subscribe(espiao);
    s.choose('L');
    const antes = espiao.mock.calls.length;

    cancelar();
    cancelar();
    s.choose('C');
    expect(espiao.mock.calls.length).toBe(antes);
  });

  it('o modo local notifica a escolha pendente — é assim que M7 a percebe (Q-09)', () => {
    const s = createSession(cfgLocal(2));
    const vistos: number[] = [];
    s.subscribe((estado: MatchState) => vistos.push(estado.kicks.length));

    s.choose('L'); // pendente: nada chegou a M2 ainda
    s.choose('C'); // resolve a cobrança

    // Duas notificações, e a primeira com o MESMO número de cobranças da anterior: é a
    // derivação que M7 vai usar até `Q-09` ser respondida.
    expect(vistos).toEqual([0, 1]);
  });

  it('o modo cpu notifica uma vez por escolha, já com a cobrança resolvida', () => {
    const s = createSession(cfgCpu(2, 'easy', 'A'));
    const vistos: number[] = [];
    s.subscribe((estado: MatchState) => vistos.push(estado.kicks.length));
    s.choose('L');
    s.choose('C');
    expect(vistos).toEqual([1, 2]);
  });

  it('todo assinante é notificado mesmo quando um deles explode, e a falha sobe', () => {
    const s = createSession(cfgCpu(8, 'easy', 'A'));
    const bom1 = vi.fn();
    const bom2 = vi.fn();
    s.subscribe(bom1);
    s.subscribe(() => {
      throw new Error('defeito de M7');
    });
    s.subscribe(bom2);

    expect(() => {
      s.choose('L');
    }).toThrowError('defeito de M7');
    expect(bom1).toHaveBeenCalledTimes(1);
    expect(bom2).toHaveBeenCalledTimes(1); // não foi engolido nem interrompeu o laço
  });

  it('o status do canal é idle em cpu e local, e closed depois do dispose()', () => {
    for (const cfg of [cfgLocal(1), cfgCpu(1, 'easy', 'A')]) {
      const s: Session = createSession(cfg);
      const status: LinkStatus[] = [];
      s.subscribe((_e: MatchState, l: LinkStatus) => status.push(l));
      s.choose('L');
      expect(status.every((l) => l === 'idle')).toBe(true);
      s.dispose();
    }
  });
});

describe('M5 — a CPU escolhe antes de observar a escolha da cobrança (D-26, Q-08 intacta)', () => {
  it('a zona da CPU na 1a cobrança não depende do que o humano escolheu nela', () => {
    for (const level of NIVEIS) {
      const daCpu = new Set<Zone>();
      for (const humano of ZONAS) {
        const s = createSession(cfgCpu(777, level, 'A'));

        // De qual campo sair a zona da CPU depende de quem cobra a 1ª — e isso passou a ser
        // sorteio em `T-17`/`D-48`, não mais a constante `'A'`. Lido do estado em vez de
        // presumido: com a semente 777 quem começa é `'B'`, ou seja a CPU, e ler `dive` fixo
        // devolveria a zona do HUMANO, fazendo este teste medir a variação da própria entrada.
        const cobrador = s.state().turn;
        s.choose(humano);
        const k = s.state().kicks[0];
        if (k === undefined) throw new Error('cobrança ausente');
        daCpu.add(cobrador === 'A' ? k.dive : k.shot); // o humano é o lado A
      }
      // Três escolhas diferentes do humano, uma única zona da CPU: ela não leu a cobrança
      // corrente.
      //
      // **Honestidade sobre o alcance deste teste:** com a semântica que T-07 entregou
      // (`Q-08`), `observe` e `pick` tocam histogramas de papéis DIFERENTES dentro de uma
      // mesma cobrança, então a ordem entre eles é hoje inobservável e este teste passaria
      // nas duas ordens. Ele não prova `D-26` agora — ele é a armadilha que fecha no dia em
      // que `Q-08` for invertida, quando observar antes viraria vidência e este `size` viraria 3.
      expect(daCpu.size, `nível ${level}`).toBe(1);
    }
  });

  it('a CPU consome exatamente 1 valor do gerador por cobrança', () => {
    // Duas sessões com a mesma semente e roteiros diferentes na 1a cobrança convergem na 2a
    // apenas se o consumo do gerador for igual nas duas — 1 `pick` por cobrança.
    const a = createSession(cfgCpu(55, 'easy', 'A'));
    const b = createSession(cfgCpu(55, 'easy', 'A'));
    a.choose('L');
    b.choose('R');
    a.choose('C');
    b.choose('C');
    expect(a.state().kicks.map((k) => k.dive)).toEqual(b.state().kicks.map((k) => k.dive));
  });
});

describe('M5 — configuração recusada antes de existir sessão', () => {
  // O modo `online` NÃO é exercitado neste arquivo: ele abre canal de verdade, e um teste que
  // não injeta a sinalização falsa acabaria carregando a Trystero real dentro do Node. Ele vive
  // inteiro em `session_online.test.ts`, que instala o duplo no `beforeEach`.

  it('modo cpu sem level é recusado — level ausente é lacuna, não padrão medium', () => {
    expect(() =>
      createSession({ mode: 'cpu', seed: 1, teams: { A: BR, B: AR }, localSide: 'A' }),
    ).toThrowError(/modo cpu exige level/);
  });

  it('level fora do modo cpu é recusado', () => {
    expect(() =>
      createSession({
        mode: 'local',
        seed: 1,
        level: 'hard',
        teams: { A: BR, B: AR },
        localSide: 'A',
      }),
    ).toThrowError(/level só existe no modo cpu/);
  });

  it('roomId fora do modo online é recusado', () => {
    expect(() =>
      createSession({
        mode: 'local',
        seed: 1,
        teams: { A: BR, B: AR },
        localSide: 'A',
        roomId: 'abc',
      }),
    ).toThrowError(/roomId só existe no modo online/);
  });

  it('seleção fora do catálogo de M4 é recusada, inclusive por caixa', () => {
    for (const ruim of ['XX', 'br', '', 'BRA']) {
      expect(() => createSession({ ...cfgLocal(1), teams: { A: ruim, B: AR } })).toThrowError(
        /não está no catálogo de M4/,
      );
    }
  });

  it('modo, lado local e semente inválidos são recusados', () => {
    expect(() => createSession({ ...cfgLocal(1), mode: 'p2p' as SessionConfig['mode'] })).toThrowError(
      /modo inválido/,
    );
    expect(() => createSession({ ...cfgLocal(1), localSide: 'C' as Side })).toThrowError(
      /localSide inválido/,
    );
    for (const semente of [1.5, NaN, Infinity, 2 ** 53]) {
      expect(() => createSession({ ...cfgLocal(1), seed: semente })).toThrowError(
        /seed deve ser inteiro seguro/,
      );
    }
  });

  it('duas seleções iguais passam — distinguir isso seria regra de disputa, e não é desta camada', () => {
    expect(() => createSession({ ...cfgLocal(1), teams: { A: BR, B: BR } })).not.toThrow();
  });
});

describe('M5 — a camada não guarda placar (o placar é de M2)', () => {
  it('a fonte de M5 não soma, não conta gol e não decide vencedor', () => {
    const fonte = readFileSync(FONTE_M5, 'utf8');
    const codigo = fonte
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'))
      .join('\n');

    // Nomes do vocabulário de placar. Ausentes até em comentário: se um deles aparecer aqui,
    // é porque M5 começou a olhar para o placar — e o passo seguinte é calculá-lo.
    for (const proibido of ['goals', 'taken', 'winner', 'REGULAR_KICKS']) {
      expect(codigo.includes(proibido), `M5 não pode conter ${proibido}`).toBe(false);
    }
    // Um único caminho até o motor: se `play(` aparecer duas vezes, a regra virou duas.
    expect(codigo.split('play(').length - 1).toBe(1);
  });

  /**
   * Esta asserção MUDOU em `T-13`, e a versão velha está escrita aqui de propósito.
   *
   * Até T-11, M5 importava de M6 só o tipo `LinkStatus`, e o teste cobrava isso ("a rede não
   * existe em runtime"). A premissa era a ausência do modo `online`, não uma regra de camada:
   * o PLANO sempre disse que M5 depende de M6. Com T-13, M5 abre canal, e importar valor de M6
   * passou a ser o contrato — apagar o teste esconderia a mudança; trocá-lo pelo que ainda vale
   * a mantém conferida.
   *
   * O que ainda vale: M5 entra em M6 **pela porta**. Se um dia aparecer aqui um import de
   * `CONNECT_TIMEOUT_MS`, `newRoomId` ou `setSignalingLoader`, é M5 mexendo em relógio, em ID de
   * sala ou em costura de teste — três coisas que têm dono, e o dono é M6.
   */
  it('M5 entra em M6 pela porta: só hostRoom e joinRoom, nada de interno', () => {
    const fonte = readFileSync(FONTE_M5, 'utf8');

    const valor = /^import \{([^}]*)\} from '\.\.\/net\/index';$/m.exec(fonte);
    expect(valor, 'M5 deixou de importar a porta de M6 — o modo online não abriria canal').not.toBeNull();

    const importados = (valor?.[1] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    expect(importados.sort()).toEqual(['hostRoom', 'joinRoom']);

    // Uma só porta de saída para a rede: dois pontos de criação de canal é uma sessão com dois
    // transportes, e o `dispose()` fecharia um só.
    const codigo = fonte
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'))
      .join('\n');
    expect(codigo.split('hostRoom(').length - 1).toBe(1);
    expect(codigo.split('joinRoom(').length - 1).toBe(1);
  });
});
