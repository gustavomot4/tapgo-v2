/**
 * Portão de M6 (`T-11`) — `b_plan.md` → "M6 — Transporte online P2P".
 *
 * Este arquivo prova o que é provável **em sandbox**. O que ele deliberadamente NÃO prova:
 * a taxa de conexão em rede móvel real. Esse número é medição do dono, com dois aparelhos, e
 * está declarado como tal no PLANO — nenhum teste aqui pode substituí-lo, e nenhum finge que
 * substitui. O que os testes cobrem é a máquina de estados, o ID de sala e o comportamento na
 * falha; o que a medição cobre é se a falha acontece em 5% ou em 30% dos casos.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONNECT_TIMEOUT_MS, hostRoom, joinRoom, newRoomId, opened, setSignalingLoader } from '../net/index';
import type { Channel, IceConfig, LinkStatus, Move, Payload, Pick } from '../net/index';
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

/** Salas criadas pelo teste corrente, na ordem. */
const salas: SalaFake[] = [];

/** Quando != null, entrar na sala lança — é a sinalização fora do ar. */
let falhaAoEntrar: Error | null = null;

/**
 * Duplo da sinalização, entregue a M6 por `setSignalingLoader`.
 *
 * **Não usa `vi.mock`, e é de propósito.** Interceptar o `import()` dinâmico de M6 com o
 * mockador de módulos funcionava quase sempre: sob carga o mock escapava, a Trystero real era
 * carregada, `RTCPeerConnection` estourava e um teste caía a cada tantas execuções — acusando o
 * código de produção por um problema do ambiente. Injetando o carregador, o duplo é uma função
 * comum: determinístico, sem I/O, sem escalonador no meio.
 *
 * O objeto de sala é **parcial** de propósito (M6 usa quatro membros de `Room`); o `as unknown`
 * declara isso em vez de fingir uma implementação inteira. Quem continua conferido contra a
 * biblioteca real é `joinRoom`, pelo tipo de `setSignalingLoader`.
 */
function sinalizacaoFalsa(): Parameters<typeof setSignalingLoader>[0] {
  return () =>
    Promise.resolve({
      joinRoom: ((cfg: unknown, roomId: string, cbs?: { onJoinError?: (d: { error: string }) => void }) => {
        if (falhaAoEntrar !== null) throw falhaAoEntrar;
        const acao: Acao = { send: () => Promise.resolve(), onMessage: null, onReceiveProgress: null };
        const sala: SalaFake = {
          cfg: cfg as Record<string, unknown>,
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
        salas.push(sala);
        return {
          makeAction: () => acao,
          leave: () => {
            sala.saiu = true;
            return Promise.resolve();
          },
          get onPeerJoin() {
            return sala.onPeerJoin;
          },
          set onPeerJoin(fn: ((id: string) => void) | null) {
            sala.onPeerJoin = fn;
          },
          get onPeerLeave() {
            return sala.onPeerLeave;
          },
          set onPeerLeave(fn: ((id: string) => void) | null) {
            sala.onPeerLeave = fn;
          },
        };
      }) as unknown as Sinalizacao['joinRoom'],
    });
}

type Sinalizacao = Awaited<ReturnType<NonNullable<Parameters<typeof setSignalingLoader>[0]>>>;

/* ─────────────────────────────────── utilidades ─────────────────────────────────── */

/**
 * Espera o canal terminar de abrir, **aguardando a promessa que M6 expõe** (`opened`).
 *
 * A primeira versão girava o event loop (`setImmediate` em laço) até o status mudar. Passava no
 * Linux e **reprovava no Windows**, com 17 testes acusando o código de produção: girar o loop
 * deixa o carregador de módulos sem vez. Aguardar não depende de quantas voltas o agendador dá —
 * e, se algo travar, quem reprova é o timeout do Vitest, com o nome do teste, em vez de uma
 * asserção enganosa sobre `'idle'`.
 */
async function assentar(canal: Channel): Promise<LinkStatus> {
  return opened(canal);
}

/**
 * Todo canal aberto por um teste, para o `afterEach` fechar.
 *
 * Canal que sobrevive ao próprio teste continua abrindo e aterrissa dentro do seguinte — foi
 * assim que a sala de um teste apareceu como "a última criada" de outro. Teste que depende do
 * lixo do anterior não mede nada.
 */
const abertos: Channel[] = [];

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
  const status = await assentar(channel);
  const sala = salas.find((s) => s.roomId === roomId);
  if (status !== 'waiting' || sala === undefined) {
    // Falhar AQUI, com o motivo, em vez de devolver `sala: undefined` e deixar a asserção do
    // teste reprovar com "expected undefined to equal [...]" — mensagem que acusa o código de
    // produção por um problema de abertura do canal no ambiente de teste.
    throw new Error(
      `abrirHost: canal abriu como "${status}" (esperado "waiting"), sala ${sala === undefined ? 'AUSENTE' : 'presente'}. ` +
        `Avisos de M6: ${JSON.stringify(avisos)}`,
    );
  }
  return { roomId, channel, log, sala };
}

const MOVE: Move = { seq: 0, side: 'A', zone: 'L' };

/** O espião que cala o `console.warn`, guardado para ser restaurado sozinho. */
let silenciarWarn: ReturnType<typeof vi.spyOn> | null = null;

/** Tudo que M6 avisou no teste corrente. Guardado, e não descartado: é a causa quando algo falha. */
const avisos: string[] = [];

beforeEach(() => {
  setSignalingLoader(sinalizacaoFalsa());
  salas.length = 0;
  falhaAoEntrar = null;
  avisos.length = 0;
  // Falsificar **só** `setTimeout`/`clearTimeout`: o relógio de 20 s é o objeto do teste, e o
  // resto do agendador não tem por que mentir.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  silenciarWarn = vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    avisos.push(a.map(String).join(' '));
  });
});

afterEach(async () => {
  // Esperar cada canal terminar de abrir ANTES de fechá-lo: `close()` não desfaz a abertura já
  // em voo, e trabalho de um teste que aterrissa dentro do seguinte é a receita do teste que
  // passa sozinho e reprova em conjunto.
  await Promise.all(abertos.map((c) => opened(c)));
  for (const c of abertos) c.close();
  abertos.length = 0;
  vi.useRealTimers();
  silenciarWarn?.mockRestore();
  silenciarWarn = null;
  setSignalingLoader(null);
});

/* ───────────────────────────────── ID de sala ───────────────────────────────── */

describe('ID de sala — opaco, aleatório, nunca sequencial (defeito 6 da v1)', () => {
  // Estes quatro chamam `newRoomId` DIRETO, sem abrir canal. Amostrar milhares de IDs por
  // `hostRoom` abriria milhares de canais, cada um com seu `import()` de sinalização — e foi
  // assim que o carregador de módulos saturou e um `import()` rejeitou, derrubando um teste de
  // transporte que nada tinha a ver com ID. Propriedade de gerador se testa no gerador.
  it('tem 26 caracteres do alfabeto Crockford, sem I, L, O nem U', () => {
    for (let i = 0; i < 2000; i += 1) {
      const id = newRoomId();
      expect(id).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
      expect(id).not.toMatch(/[ILOU]/);
    }
  });

  it('não colide em 20.000 sorteios', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 20_000; i += 1) vistos.add(newRoomId());
    expect(vistos.size).toBe(20_000);
  });

  it('não é sequencial: a ordem de sorteio não é a ordem alfabética', () => {
    // Um contador (o defeito 6 da v1) produziria IDs já ordenados. Com 2.000 sorteios, a chance
    // de o acaso produzir a ordem crescente é 1/2000! — indistinguível de zero.
    const ids = Array.from({ length: 2000 }, () => newRoomId());
    expect(ids).not.toEqual([...ids].sort());
    // E nenhum prefixo comum: um contador compartilharia quase tudo menos o fim.
    expect(new Set(ids.map((s) => s.slice(0, 3))).size).toBeGreaterThan(1000);
  });

  it('os 32 símbolos do alfabeto aparecem — nenhum é inalcançável por viés de módulo', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 2000; i += 1) for (const c of newRoomId()) vistos.add(c);
    expect(vistos.size).toBe(32);
  });

  it('`hostRoom` usa esse gerador: o ID que ele devolve tem o mesmo formato', () => {
    const { roomId, channel } = novoHost();
    expect(roomId).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
    channel.close();
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
    falhaAoEntrar = new Error('relay indisponível');
    const { roomId, channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    expect(roomId).toHaveLength(26);

    await assentar(channel);
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
    const recebidas: Payload[] = [];
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

/* ─────────────────── `D-90`: o segundo tipo do fio (`Pick`) ─────────────────── */

describe('Pick — o mesmo fio, a mesma porta de 4 métodos, o mesmo descarte de D-32', () => {
  const PICK: Pick = { side: 'A', team: 'BR' };

  it('a porta continua com QUATRO métodos: `D-90` mudou a carga, não o contrato', async () => {
    const { channel } = await abrirHost();
    // O 5º método (`onPick`) é o precedente que `D-39` recusou e `D-73` recusou de novo. Contar
    // aqui é o que impede alguém de acrescentá-lo "só desta vez" sem passar por uma `D-NN`.
    expect(Object.keys(channel).sort()).toEqual(['close', 'onMove', 'onStatus', 'send']);
    channel.close();
  });

  it('`Pick` bem formado atravessa e chega a quem assinou, pela MESMA onMove', async () => {
    const { sala, channel } = await abrirHost();
    const recebidas: Payload[] = [];
    channel.onMove((p) => recebidas.push(p));
    sala?.onPeerJoin?.('peer');

    sala?.acao.onMessage?.({ side: 'B', team: 'AR' }, {});
    sala?.acao.onMessage?.({ seq: 0, side: 'B', zone: 'L' }, {});

    // Os dois tipos, na ordem, pelo mesmo caminho. Quem discrimina é M5 — M6 não sabe qual é
    // qual, e é isso que o teste declara.
    expect(recebidas).toEqual([
      { side: 'B', team: 'AR' },
      { seq: 0, side: 'B', zone: 'L' },
    ]);
    channel.close();
  });

  it('`Pick` malformado morre em M6, exatamente como `Move` malformado (D-32)', async () => {
    const { sala, channel } = await abrirHost();
    const recebidas: Payload[] = [];
    channel.onMove((p) => recebidas.push(p));
    sala?.onPeerJoin?.('peer');

    for (const lixo of [
      { side: 'A' },
      { side: 'A', team: '' },
      { side: 'A', team: 42 },
      { side: 'A', team: null },
      { side: 'A', team: { code: 'BR' } },
      { side: 'C', team: 'BR' },
      { team: 'BR' },
      // Teto de tamanho: dado de fora sem teto é dado de fora sem teto.
      { side: 'A', team: 'B'.repeat(17) },
    ]) {
      sala?.acao.onMessage?.(lixo, {});
    }

    expect(recebidas, 'payload torto chegou a quem assinou').toEqual([]);
    expect(
      avisos.filter((m) => m.includes('payload descartado, não é Move nem Pick')),
      'cada descarte tem de ser LOGADO — descarte calado é dado mentiroso rio abaixo',
    ).toHaveLength(8);

    // E o caminho feliz continua funcionando depois de todo esse lixo.
    sala?.acao.onMessage?.({ side: 'B', team: 'GB-ENG' }, {});
    expect(recebidas).toEqual([{ side: 'B', team: 'GB-ENG' }]);
    channel.close();
  });

  it('`send` com `Pick` malformado lança — erro de quem chamou, reportado alto', async () => {
    const { sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');
    expect(() => channel.send({ side: 'A', team: '' })).toThrow(TypeError);
    expect(() => channel.send({ side: 'Z', team: 'BR' } as unknown as Pick)).toThrow(TypeError);
    expect(sala?.enviadas).toEqual([]);
    channel.close();
  });

  it('`Pick` enviado antes de conectar é represado e escoado NA ORDEM, junto com as jogadas', async () => {
    const { sala, channel } = await abrirHost();
    channel.send(PICK);
    channel.send({ seq: 0, side: 'A', zone: 'L' });
    expect(sala?.enviadas).toEqual([]);

    sala?.onPeerJoin?.('peer');
    expect(sala?.enviadas).toEqual([PICK, { seq: 0, side: 'A', zone: 'L' }]);
    channel.close();
  });

  it('canal fechado descarta o `Pick` em voz alta, sem falar em `seq` que ele não tem', async () => {
    const { channel } = await abrirHost();
    channel.close();
    expect(() => channel.send(PICK)).not.toThrow();
    expect(avisos.some((m) => m.includes('escolha de seleção do lado A'))).toBe(true);
    expect(
      avisos.some((m) => m.includes('seq=undefined')),
      'o aviso inventou um número de cobrança para um payload que não é de cobrança',
    ).toBe(false);
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
    falhaAoEntrar = new Error('toda a infra pública sumiu');

    const { channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    await assentar(channel);
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
    falhaAoEntrar = new Error('toda a infra pública sumiu');
    const { channel } = novoHost();
    const log: LinkStatus[] = [];
    channel.onStatus((s) => log.push(s));
    await assentar(channel);
    expect(log.at(-1)).toBe('failed');

    // Roteiro que DECIDE: no modo local as escolhas alternam cobrador/goleiro, então o padrão
    // de período 4 abaixo dá gol a quem cobra primeiro (chute L, defesa C) e defende o do outro
    // lado (chute L, defesa L). Zona única para os dois lados empataria 0x0 e giraria nas
    // alternadas para sempre — o teste passaria pelo guarda, não pelo fim da disputa.
    const padrao: Zone[] = ['L', 'C', 'L', 'L'];
    const s = createSession({ mode: 'local', seed: 3, teams: { A: 'BR', B: 'AR' }, localSide: 'A' });

    // Quem cobra primeiro é sorteio desde `T-17`/`D-48` — com a semente 3 é `'B'`. O vencedor é
    // lido daqui em vez de fixado em `'A'`: o que este teste prova é que a disputa **termina** sem
    // sinalização, e amarrá-lo a um lado o faria reprovar por causa do sorteio, não da rede.
    const primeiro = s.state().turn;
    expect(primeiro).not.toBeNull();

    let guarda = 0;
    while (s.state().phase !== 'finished' && guarda < 200) {
      const z = padrao[guarda % 4];
      if (z === undefined) throw new Error('padrão fora da faixa');
      s.choose(z);
      guarda += 1;
    }
    expect(s.state().phase).toBe('finished');
    expect(s.state().winner).toBe(primeiro);
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

/* ─────────── `QA-25`: o que a fila de M6 pode — e não pode — escoar ─────────── */

describe('QA-25 — a fila escoa jogada ATRASADA, não jogada REPETIDA', () => {
  // A nota `e_qa/qa25_reentrada_na_janela.md` declarou a lacuna assim: "ninguém mediu se o
  // reenvio de fila chega a produzir `seq=0` numa disputa já em andamento". Sem esse número,
  // tratar `seq=0` pós-conexão como abandono é palpite. Estes três casos medem a metade de M6
  // da pergunta — a mecânica da fila; a outra metade, a que chega a M5, está em
  // `session_online.test.ts`. Nenhum deles decide nada: a saída de `QA-25` é `D-NN` do dono.

  it('o segundo escoamento não repete a jogada: `shift` esvazia a fila', async () => {
    const { sala, channel } = await abrirHost();

    // Represada com o canal em `'waiting'` — é a única porta de entrada da fila.
    channel.send({ seq: 0, side: 'A', zone: 'L' });
    expect(sala?.enviadas).toEqual([]);

    sala?.onPeerJoin?.('peer');
    expect(sala?.enviadas).toEqual([{ seq: 0, side: 'A', zone: 'L' }]);

    // A queda e o rearme de `D-31`: é exatamente a janela de 20 s de `QA-25`.
    sala?.onPeerLeave?.('peer');
    sala?.onPeerJoin?.('peer');

    // O número que faltava: UM. `escoarFila` consome com `shift`, então a jogada escoada some
    // da fila. A reentrada não fabrica um segundo `seq=0`.
    expect(sala?.enviadas).toEqual([{ seq: 0, side: 'A', zone: 'L' }]);
    expect(sala?.enviadas.filter((m) => (m as Move).seq === 0)).toHaveLength(1);
    channel.close();
  });

  it('com o canal conectado a jogada nem entra na fila — não há `seq=0` guardado para depois', async () => {
    const { sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');

    channel.send({ seq: 0, side: 'A', zone: 'L' });
    expect(sala?.enviadas).toEqual([{ seq: 0, side: 'A', zone: 'L' }]);

    // Toda a janela de `QA-25`, três vezes, sem nenhum `send` no meio: se a fila guardasse
    // cópia do que já saiu, o peer receberia `seq=0` de novo aqui.
    for (let i = 0; i < 3; i += 1) {
      sala?.onPeerLeave?.('peer');
      sala?.onPeerJoin?.('peer');
    }
    expect(sala?.enviadas).toHaveLength(1);
    channel.close();
  });

  it('o que a fila escoa na reentrada é só o que foi represado DEPOIS da queda', async () => {
    const { sala, channel } = await abrirHost();
    sala?.onPeerJoin?.('peer');
    channel.send({ seq: 0, side: 'A', zone: 'L' }); // sai na hora
    channel.send({ seq: 1, side: 'A', zone: 'C' }); // sai na hora

    sala?.onPeerLeave?.('peer');
    channel.send({ seq: 2, side: 'A', zone: 'R' }); // represada: o canal está `'waiting'`

    sala?.onPeerJoin?.('peer');
    expect(sala?.enviadas).toEqual([
      { seq: 0, side: 'A', zone: 'L' },
      { seq: 1, side: 'A', zone: 'C' },
      { seq: 2, side: 'A', zone: 'R' },
    ]);
    // O `seq` que a reentrada entregou é o MAIOR já enviado, não o menor: a fila anda para a
    // frente. Um `seq=0` no fio depois de uma disputa andada não pode ter vindo daqui.
    expect((sala?.enviadas.at(-1) as Move).seq).toBe(2);
    channel.close();
  });
});
