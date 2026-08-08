/**
 * Portão de M6 (`T-11`) — `b_plan.md` → "M6 — Transporte online P2P".
 *
 * Este arquivo prova o que é provável **em sandbox**. O que ele deliberadamente NÃO prova:
 * a taxa de conexão em rede móvel real. Esse número é medição do dono, com dois aparelhos, e
 * está declarado como tal no PLANO — nenhum teste aqui pode substituí-lo, e nenhum finge que
 * substitui. O que os testes cobrem é a máquina de estados, o ID de sala e o comportamento na
 * falha; o que a medição cobre é se a falha acontece em 5% ou em 30% dos casos.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONNECT_TIMEOUT_MS, hostRoom, joinRoom } from '../net/index';
import type { Channel, IceConfig, LinkStatus, Move } from '../net/index';
import { createSession } from '../session/index';
import type { Zone } from '../core/index';

/* ─────────────────────────── duplo de teste da sinalização ─────────────────────────── */

type Acao = {
  send: (d: unknown) => Promise<void>;
  onMessage: ((d: unknown, ctx: unknown) => void) | null;
  onReceiveProgress: null;
};

type SalaFake = {
  cfg: Record<string, unknown>;
  roomId: string;
  enviadas: unknown[];
  saiu: boolean;
  acao: Acao;
  onPeerJoin: ((id: string) => void) | null;
  onPeerLeave: ((id: string) => void) | null;
  onJoinError?: (d: { error: string }) => void;
};

/**
 * Estado do duplo, criado por `vi.hoisted`.
 *
 * `vi.mock` é içado para o topo do arquivo, acima de qualquer `let` declarado aqui embaixo — uma
 * fábrica que feche sobre variável comum lê a TDZ e a biblioteca real acaba carregada no lugar do
 * duplo, com a falha aparecendo longe daqui (`RTCPeerConnection is not defined`, vinda de dentro
 * da Trystero). `vi.hoisted` sobe junto e é o único jeito de a fábrica ver este objeto.
 */
const estado = vi.hoisted(() => ({
  /** Salas criadas pelo teste corrente, na ordem. */
  salas: [] as unknown[],
  /** Quando != null, `joinRoom` da biblioteca lança — é a sinalização fora do ar. */
  falhaAoEntrar: null as Error | null,
}));

const salas = estado.salas as SalaFake[];

vi.mock('trystero', () => ({
  joinRoom: (cfg: Record<string, unknown>, roomId: string, cbs?: { onJoinError?: (d: { error: string }) => void }) => {
    if (estado.falhaAoEntrar !== null) throw estado.falhaAoEntrar;
    const acao: Acao = { send: () => Promise.resolve(), onMessage: null, onReceiveProgress: null };
    const sala: SalaFake = {
      cfg,
      roomId,
      enviadas: [],
      saiu: false,
      acao,
      onPeerJoin: null,
      onPeerLeave: null,
    };
    if (cbs?.onJoinError) sala.onJoinError = cbs.onJoinError;
    acao.send = (d: unknown) => {
      sala.enviadas.push(d);
      return Promise.resolve();
    };
    estado.salas.push(sala);
    return {
      makeAction: () => acao,
      leave: () => {
        sala.saiu = true;
        return Promise.resolve();
      },
      get onPeerJoin() {
        return sala.onPeerJoin;
      },
      set onPeerJoin(fn) {
        sala.onPeerJoin = fn;
      },
      get onPeerLeave() {
        return sala.onPeerLeave;
      },
      set onPeerLeave(fn) {
        sala.onPeerLeave = fn;
      },
    };
  },
}));

/* ─────────────────────────────────── utilidades ─────────────────────────────────── */

/**
 * Espera uma condição virar verdadeira sem deixar o relógio falso andar.
 *
 * Duas armadilhas custaram esta função, e as duas dão o MESMO sintoma — canal preso em `'idle'`,
 * todo teste de status lendo estado errado:
 *
 * 1. `await Promise.resolve()` em laço só drena **microtask**. O `import()` dinâmico de M6
 *    precisa do carregador de módulos, que anda em **macrotask/IO**: girar 200 microtasks não
 *    faz o módulo carregar um passo sequer.
 * 2. `vi.advanceTimersByTimeAsync(0)` uma vez só cede ao event loop uma vez — o módulo chega,
 *    mas o `emitir('waiting')` que vem depois dele ainda não rodou quando a espera termina.
 *
 * Daí `setImmediate` de verdade a cada volta, e esperar pela **condição** em vez de por um número
 * fixo de voltas: é o que impede este arquivo de passar por sorte de escalonamento. Para o
 * `setImmediate` continuar real enquanto o `setTimeout` de 20 s é falso, o `beforeEach` abaixo
 * falsifica **só** o relógio que interessa — ver `toFake`.
 */
const passo = (): Promise<void> => new Promise((r) => setImmediate(r));

async function ate(cond: () => boolean, voltas = 3000): Promise<boolean> {
  for (let i = 0; i < voltas && !cond(); i += 1) await passo();
  return cond();
}

/**
 * Deixa o `import()` dinâmico assentar — e **falha alto** se ele não assentar.
 *
 * Desistir em silêncio devolveria um canal em `'idle'`, e o teste seguinte quebraria com
 * "expected 'idle' to be 'waiting'" — uma mensagem que aponta para o código de produção quando o
 * defeito está na espera do teste. Perdi tempo com exatamente isso; o erro agora se identifica.
 */
async function assentar(log: LinkStatus[]): Promise<void> {
  const ok = await ate(() => log.at(-1) !== 'idle');
  if (!ok) throw new Error('assentar: o canal não saiu de "idle" — a espera do teste desistiu, não o código.');
}

/**
 * Todo canal aberto por um teste, para o `afterEach` fechar.
 *
 * Canal que sobrevive ao próprio teste continua com um `import()` em voo e cai no teste
 * seguinte — foi assim que uma sala de um teste apareceu como "a última criada" de outro. Um
 * teste que depende do lixo do anterior não mede nada.
 */
const abertos: { close: () => void }[] = [];

/** Cria um canal já registrado para limpeza. */
function novoHost(ice?: IceConfig): { roomId: string; channel: Channel } {
  const r = ice === undefined ? hostRoom() : hostRoom(ice);
  abertos.push(r.channel);
  return r;
}

/**
 * Cria um canal e espera a sala existir.
 *
 * A sala é achada **pelo `roomId`**, nunca por "a última do array": salas de canais vazados de
 * outro teste também entram nesse array, e pegar a última é pegar a de outra pessoa.
 */
async function abrirHost(ice?: IceConfig) {
  const { roomId, channel } = novoHost(ice);
  const log: LinkStatus[] = [];
  channel.onStatus((s) => log.push(s));
  await assentar(log);
  return { roomId, channel, log, sala: salas.find((s) => s.roomId === roomId) };
}

const MOVE: Move = { seq: 0, side: 'A', zone: 'L' };

beforeAll(async () => {
  // Tira o custo da primeira carga do módulo de dentro do primeiro teste: daqui em diante todo
  // `import()` resolve do cache. Não é o que conserta a espera (isso é `ate`), é o que a torna
  // barata.
  await import('trystero');
});

beforeEach(() => {
  // **Só** `setTimeout`/`clearTimeout`. Falsificar o relógio inteiro (o padrão) leva junto o
  // `setImmediate`, e sem ele não há como ceder ao event loop para o `import()` dinâmico
  // carregar — o canal ficaria eternamente em `'idle'`. O que precisa ser falso aqui é o
  // relógio de 20 s, e só ele.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  estado.salas.length = 0;
  estado.falhaAoEntrar = null;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(async () => {
  for (const c of abertos) c.close();
  abertos.length = 0;
  // Deixa o que ficou em voo aterrissar ANTES do próximo teste, e não dentro dele. Os testes de
  // ID abrem centenas de canais; sem esta drenagem, os `import()` deles resolvem no meio do
  // teste seguinte e comem as voltas que ELE precisava.
  await ate(() => false, 300);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ───────────────────────────────── ID de sala ───────────────────────────────── */

describe('ID de sala — opaco, aleatório, nunca sequencial (defeito 6 da v1)', () => {
  it('tem 26 caracteres do alfabeto Crockford, sem I, L, O nem U', () => {
    for (let i = 0; i < 100; i += 1) {
      const { roomId, channel } = novoHost();
      expect(roomId).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
      expect(roomId).not.toMatch(/[ILOU]/);
      channel.close();
    }
  });

  it('não colide em 1.000 sorteios', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const { roomId, channel } = novoHost();
      vistos.add(roomId);
      channel.close();
    }
    expect(vistos.size).toBe(1000);
  });

  it('não é sequencial: a ordem de sorteio não é a ordem alfabética', () => {
    // Um contador (o defeito 6 da v1) produziria IDs já ordenados. Com 500 sorteios, a chance
    // de o acaso produzir a ordem crescente é 1/300! — indistinguível de zero.
    const ids: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const { roomId, channel } = novoHost();
      ids.push(roomId);
      channel.close();
    }
    expect(ids).not.toEqual([...ids].sort());
    // E nenhum prefixo comum: um contador compartilharia quase tudo menos o fim.
    const primeiros = new Set(ids.map((s) => s.slice(0, 3)));
    expect(primeiros.size).toBeGreaterThan(80);
  });

  it('joinRoom recusa ID malformado na hora, em vez de esperar 20 s para falhar', () => {
    for (const ruim of ['', 'abc', 'a'.repeat(26), '0'.repeat(25), '0'.repeat(27), 'IIII'.repeat(6) + 'AA']) {
      expect(() => joinRoom(ruim)).toThrow(TypeError);
    }
  });

  it('nenhuma decisão do transporte deriva do ID: salas diferentes, comportamento idêntico', async () => {
    const a = await abrirHost();
    const b = await abrirHost();
    expect(a.roomId).not.toBe(b.roomId);

    for (const { channel, sala } of [a, b]) {
      sala?.onPeerJoin?.('peer');
      channel.send(MOVE);
    }
    expect(a.sala?.enviadas).toEqual(b.sala?.enviadas);
    a.channel.close();
    b.channel.close();
  });
});

/* ───────────────────────────── timeout de 20 s ───────────────────────────── */

describe('timeout — 20 s, honesto, nunca tela travada', () => {
  it('o valor é 20.000 ms, e é o PLANO que o fixa', () => {
    expect(CONNECT_TIMEOUT_MS).toBe(20_000);
  });

  it('sem peer, vira failed EXATAMENTE no valor configurado — não antes', async () => {
    const { log, channel } = await abrirHost();
    expect(log.at(-1)).toBe('waiting');

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS - 1);
    expect(log).not.toContain('failed');

    await vi.advanceTimersByTimeAsync(1);
    expect(log.at(-1)).toBe('failed');
    channel.close();
  });

  it('com peer dentro do prazo, conecta e o relógio não dispara depois', async () => {
    const { log, sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');
    expect(log.at(-1)).toBe('connected');

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS * 3);
    expect(log.at(-1)).toBe('connected');
    channel.close();
  });

  it('peer que some no meio volta a waiting e REARMA o relógio — nunca fica esperando para sempre', async () => {
    const { log, sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');
    expect(log.at(-1)).toBe('connected');

    sala?.onPeerLeave?.('peer');
    expect(log.at(-1)).toBe('waiting');

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS - 1);
    expect(log.at(-1)).toBe('waiting');
    await vi.advanceTimersByTimeAsync(1);
    expect(log.at(-1)).toBe('failed');
    channel.close();
  });

  it('failed é terminal para o transporte: solta a sala e não reconecta sozinho', async () => {
    const { log, sala, channel } = await abrirHost();
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    expect(log.at(-1)).toBe('failed');
    expect(sala?.saiu).toBe(true);

    sala?.onPeerJoin?.('peer-atrasado');
    expect(log.at(-1)).toBe('failed');
    channel.close();
    expect(log.at(-1)).toBe('closed');
  });
});

/* ─────────────────────────────── status ─────────────────────────────── */

describe('status — a falha é um estado nomeado, não uma exceção', () => {
  it('onStatus entrega o status atual na hora da assinatura', async () => {
    const { channel } = await abrirHost();
    const tardio: LinkStatus[] = [];
    channel.onStatus((s) => tardio.push(s));
    expect(tardio).toEqual(['waiting']);
    channel.close();
  });

  it('quem assina depois da falha ainda descobre que falhou', async () => {
    const { channel } = await abrirHost();
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);

    const tardio: LinkStatus[] = [];
    channel.onStatus((s) => tardio.push(s));
    expect(tardio).toEqual(['failed']);
    channel.close();
  });

  it('sinalização fora do ar vira failed, sem exceção vazando para quem chamou', async () => {
    estado.falhaAoEntrar = new Error('relay indisponível');
    const { roomId, channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    expect(roomId).toHaveLength(26);

    await assentar(log);
    expect(log.at(-1)).toBe('failed');
    channel.close();
  });

  it('sala recusada pela sinalização (onJoinError) vira failed', async () => {
    const { log, sala, channel } = await abrirHost();
    sala?.onJoinError?.({ error: 'appId inválido' });
    expect(log.at(-1)).toBe('failed');
    channel.close();
  });

  it('close() é terminal e não deixa assinante vivo', async () => {
    const { log, sala, channel } = await abrirHost();
    channel.close();
    expect(log.at(-1)).toBe('closed');
    expect(sala?.saiu).toBe(true);

    const antes = log.length;
    sala?.onPeerJoin?.('peer');
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS * 2);
    expect(log).toHaveLength(antes);
  });
});

/* ─────────────────────── jogadas: forma, ordem, repetição ─────────────────────── */

describe('jogadas — M6 confere a FORMA; a regra é de M5', () => {
  it('payload que não é Move morre em M6 e nunca chega a quem assinou', async () => {
    const { sala, channel } = await abrirHost();
    const recebidas: Move[] = [];
    channel.onMove((m) => recebidas.push(m));
    sala?.onPeerJoin?.('peer');

    for (const lixo of [
      null,
      undefined,
      42,
      'move',
      {},
      { seq: 0, side: 'A' },
      { seq: 0, side: 'C', zone: 'L' },
      { seq: 0, side: 'A', zone: 'X' },
      { seq: -1, side: 'A', zone: 'L' },
      { seq: 1.5, side: 'A', zone: 'L' },
      { seq: Number.NaN, side: 'A', zone: 'L' },
    ]) {
      sala?.acao.onMessage?.(lixo, {});
    }
    expect(recebidas).toEqual([]);

    // e o caminho feliz continua funcionando depois de todo esse lixo
    sala?.acao.onMessage?.({ seq: 3, side: 'B', zone: 'R' }, {});
    expect(recebidas).toEqual([{ seq: 3, side: 'B', zone: 'R' }]);
    channel.close();
  });

  it('send com jogada malformada lança — erro de quem chamou, reportado alto', async () => {
    const { sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');
    expect(() => channel.send({ seq: -1, side: 'A', zone: 'L' })).toThrow(TypeError);
    expect(() => channel.send({ seq: 0, side: 'Z', zone: 'L' } as unknown as Move)).toThrow(TypeError);
    expect(sala?.enviadas).toEqual([]);
    channel.close();
  });

  it('jogada enviada antes de conectar é represada e escoada NA ORDEM ao conectar', async () => {
    const { sala, channel } = await abrirHost();
    channel.send({ seq: 0, side: 'A', zone: 'L' });
    channel.send({ seq: 1, side: 'A', zone: 'C' });
    channel.send({ seq: 2, side: 'A', zone: 'R' });
    expect(sala?.enviadas).toEqual([]);

    sala?.onPeerJoin?.('peer');
    expect(sala?.enviadas).toEqual([
      { seq: 0, side: 'A', zone: 'L' },
      { seq: 1, side: 'A', zone: 'C' },
      { seq: 2, side: 'A', zone: 'R' },
    ]);
    channel.close();
  });

  it('a fila tem teto: o excesso é descartado em voz alta, não vaza memória', async () => {
    const { sala, channel } = await abrirHost();
    for (let i = 0; i < 40; i += 1) channel.send({ seq: i, side: 'A', zone: 'L' });
    expect(console.warn).toHaveBeenCalled();

    sala?.onPeerJoin?.('peer');
    expect(sala?.enviadas).toHaveLength(32);
    expect(sala?.enviadas[0]).toEqual({ seq: 8, side: 'A', zone: 'L' });
    channel.close();
  });

  it('canal fechado descarta o envio em vez de estourar', async () => {
    const { channel } = await abrirHost();
    channel.close();
    expect(() => channel.send(MOVE)).not.toThrow();
  });
});

/* ─────────────────────────── TURN: as DUAS configurações ─────────────────────────── */

describe('TURN — é o parâmetro que separa as duas medições de E-4', () => {
  it('sem IceConfig, nenhum turnConfig chega à sinalização: é a medição "sem TURN"', async () => {
    const { sala, channel } = await abrirHost();
    expect(sala?.cfg['turnConfig']).toBeUndefined();
    channel.close();
  });

  it('com IceConfig, o relay chega inteiro: é a medição "da configuração que vai ao ar"', async () => {
    const ice: IceConfig = {
      turn: { urls: 'turn:exemplo:3478', username: 'u', credential: 'c' },
    };
    const { sala, channel } = await abrirHost(ice);
    expect(sala?.cfg['turnConfig']).toEqual([
      { urls: 'turn:exemplo:3478', username: 'u', credential: 'c' },
    ]);
    channel.close();
  });

  it('nenhuma credencial de TURN é constante deste módulo', async () => {
    const fonte = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../net/index.ts', import.meta.url), 'utf8'),
    );
    expect(fonte).not.toMatch(/turn:[a-z0-9.-]+:\d+/i);
    expect(fonte).not.toMatch(/credential\s*[:=]\s*['"][^'"]+['"]/);
  });
});

/* ───────────── invariante de arquitetura: online é camada OPCIONAL ───────────── */

describe('invariante — sem sinalização, cpu e local seguem jogáveis', () => {
  it('com a sinalização derrubada, uma disputa contra a CPU vai até o fim', async () => {
    estado.falhaAoEntrar = new Error('toda a infra pública sumiu');

    const { channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    await assentar(log);
    expect(log.at(-1)).toBe('failed');

    const s = createSession({ mode: 'cpu', seed: 7, level: 'hard', teams: { A: 'BR', B: 'AR' }, localSide: 'A' });
    let guarda = 0;
    while (s.state().phase !== 'finished' && guarda < 100) {
      s.choose('L');
      guarda += 1;
    }
    expect(s.state().phase).toBe('finished');
    expect(s.state().winner === 'A' || s.state().winner === 'B').toBe(true);
    channel.close();
  });

  it('com a sinalização derrubada, o modo local também vai até o fim', async () => {
    estado.falhaAoEntrar = new Error('toda a infra pública sumiu');
    const { channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    await assentar(log);
    expect(log.at(-1)).toBe('failed');

    // Roteiro que DECIDE: no modo local as escolhas alternam cobrador/goleiro, então o padrão
    // de período 4 abaixo dá gol a `A` (chute L, defesa C) e defende o de `B` (chute L, defesa
    // L). Zona única para os dois lados empataria 0x0 e giraria nas alternadas para sempre —
    // o teste passaria pelo guarda, não pelo fim da disputa.
    const padrao: Zone[] = ['L', 'C', 'L', 'L'];
    const s = createSession({ mode: 'local', seed: 3, teams: { A: 'BR', B: 'AR' }, localSide: 'A' });
    let guarda = 0;
    while (s.state().phase !== 'finished' && guarda < 200) {
      const z = padrao[guarda % 4];
      if (z === undefined) throw new Error('padrão fora da faixa');
      s.choose(z);
      guarda += 1;
    }
    expect(s.state().phase).toBe('finished');
    expect(s.state().winner).toBe('A');
    channel.close();
  });

  it('M6 não importa motor nem sessão: ele não sabe o que é gol', async () => {
    const fonte = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../net/index.ts', import.meta.url), 'utf8'),
    );
    expect(fonte).not.toMatch(/from\s+['"]\.\.\/(engine|session|cpu|ui|data)/);

    // Agulha montada em tempo de execução, e não escrita por extenso: o portão de M1 conta as
    // ocorrências do gerador nativo em `src/` inteiro, e um teste que o escreve literalmente
    // reprova o portão que ele mesmo defende. É o erro que `QA-05` registrou em `teams.test.ts`.
    const AGULHA = ['Math', 'random'].join('.');
    expect(fonte).not.toContain(AGULHA);
  });
});
