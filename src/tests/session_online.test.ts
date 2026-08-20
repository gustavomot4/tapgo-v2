/**
 * Portão de `T-13` — modo `online` de M5 (`b_plan.md` → "M5 — Sessão de disputa").
 *
 * O que este arquivo prova: que os três modos produzem o MESMO `MatchState`, que evento remoto
 * ilegal morre em M5 antes de M2, e que o peer sumindo produz o resultado que `Q-04` definiu
 * (`D-35`: sem vencedor). Tudo isso sobre uma rede falsa de duas salas ligadas pelo `roomId`.
 *
 * O que ele deliberadamente NÃO prova — e nenhum teste aqui pode: se dois aparelhos de verdade
 * conectam em rede de operadora. Esse número é `A-08`, medição do dono. Aqui a rede é perfeita
 * de propósito: o que está sob teste é a regra, não o transporte.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Como em `session.test.ts`: o que se importa de M5 é a porta. `Move` vem de M6 porque a rede
// falsa injeta jogada crua — é o papel do duplo, não da tela.
import { createSession } from '../session/index';
import type { LinkStatus, MatchState, Session, SessionConfig } from '../session/index';
import { setSignalingLoader } from '../net/index';
import type { Move } from '../net/index';
import type { Side, Zone } from '../core/index';

/* ───────────────────────── rede falsa: duas salas que se enxergam ───────────────────────── */

type Acao = {
  send: (d: unknown) => Promise<void>;
  onMessage: ((d: unknown, ctx: unknown) => void) | null;
  onReceiveProgress: null;
};

type SalaFake = {
  roomId: string;
  acao: Acao;
  saiu: boolean;
  onPeerJoin: ((id: string) => void) | null;
  onPeerLeave: ((id: string) => void) | null;
};

const salas: SalaFake[] = [];

/** As outras salas vivas com o mesmo `roomId` — é isto que faz "dois aparelhos" existirem. */
function pares(s: SalaFake): SalaFake[] {
  return salas.filter((o) => o !== s && o.roomId === s.roomId && !o.saiu);
}

type Sinalizacao = Awaited<ReturnType<NonNullable<Parameters<typeof setSignalingLoader>[0]>>>;

/**
 * Duplo da sinalização — mesma razão de `net.test.ts` para não usar `vi.mock`: interceptar o
 * `import()` dinâmico era intermitente e acusava o código de produção por falha de ambiente.
 *
 * A diferença para o duplo de M6 é uma só, e é a que este arquivo precisa: aqui as salas com o
 * mesmo `roomId` são **ligadas**. `send` de um lado vira `onMessage` do outro, entrar avisa os
 * dois, e `leave` avisa quem ficou. Sem isso não há como provar que os dois aparelhos chegam ao
 * mesmo `MatchState` — provaria-se só que um aparelho fala sozinho.
 */
function sinalizacaoFalsa(): Parameters<typeof setSignalingLoader>[0] {
  return () =>
    Promise.resolve({
      joinRoom: ((_cfg: unknown, roomId: string) => {
        const acao: Acao = { send: () => Promise.resolve(), onMessage: null, onReceiveProgress: null };
        const sala: SalaFake = { roomId, acao, saiu: false, onPeerJoin: null, onPeerLeave: null };
        salas.push(sala);

        acao.send = (d: unknown) => {
          // Entrega SÍNCRONA: a rede falsa não tem latência de propósito. Latência que não é o
          // objeto do teste só produz teste lento e intermitente.
          for (const o of pares(sala)) o.acao.onMessage?.(d, null);
          return Promise.resolve();
        };

        // Avisar em MACROTAREFA (`setImmediate`, que o `toFake` não falsifica), e não em
        // microtarefa. Em microtarefa o aviso chegava antes de M6 terminar de abrir a própria
        // sala: o canal ia a `'connected'` e a continuação de `abrirSala` o devolvia a
        // `'waiting'` logo em seguida, deixando o convidado represando toda jogada. Peer que
        // entra no mesmo tique em que a sala abre também não é coisa que aconteça de verdade.
        setImmediate(() => {
          if (sala.saiu) return;
          for (const o of pares(sala)) {
            o.onPeerJoin?.('peer');
            sala.onPeerJoin?.('peer');
          }
        });

        return {
          makeAction: () => acao,
          leave: () => {
            if (sala.saiu) return Promise.resolve();
            const vizinhos = pares(sala);
            sala.saiu = true;
            for (const o of vizinhos) o.onPeerLeave?.('peer');
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

/* ─────────────────────────────────── utilidades ─────────────────────────────────── */

/**
 * Deixa o agendador andar uma volta.
 *
 * `setImmediate` **não** está falsificado (o `toFake` abaixo só pega `setTimeout`), então uma
 * macrotarefa drena as microtarefas da abertura do canal sem depender de quantas voltas o
 * agendador dá. É a lição que `net.test.ts` pagou: girar o loop em laço reprovava no Windows.
 */
const respirar = (): Promise<void> =>
  new Promise((r) => {
    setImmediate(r);
  });

/** Espera `cond`, e falha com o MOTIVO em vez de deixar a asserção seguinte mentir. */
async function ate(cond: () => boolean, oque: string, voltas = 20): Promise<void> {
  for (let i = 0; i < voltas; i += 1) {
    if (cond()) return;
    await respirar();
  }
  throw new Error(`ate: ${oque} não aconteceu em ${voltas} voltas. Salas: ${salas.length}`);
}

const BR = 'BR';
const AR = 'AR';

function cfgOnline(seed: number, localSide: Side, roomId?: string): SessionConfig {
  const base = { mode: 'online' as const, seed, teams: { A: BR, B: AR }, localSide };
  // `exactOptionalPropertyTypes` está ligado: montar condicionalmente, nunca atribuir undefined.
  return roomId === undefined ? base : { ...base, roomId };
}

/** Sessões abertas pelo teste corrente — canal que sobrevive ao teste aterrissa no seguinte. */
const vivas: Session[] = [];

function nova(cfg: SessionConfig): Session {
  const s = createSession(cfg);
  vivas.push(s);
  return s;
}

/**
 * Dois aparelhos na mesma sala, já conectados.
 *
 * O `roomId` é lido **da rede falsa**, e não da sessão anfitriã, porque a porta congelada de M5
 * não devolve o ID que M6 sorteou — é a lacuna registrada em `Q-11`. O teste contorna olhando o
 * duplo; a tela, em produção, não tem esse recurso, e é por isso que a lacuna está declarada.
 */
async function doisAparelhos(seed: number): Promise<{
  a: Session;
  b: Session;
  linkA: LinkStatus[];
  linkB: LinkStatus[];
  salaB: SalaFake;
}> {
  const a = nova(cfgOnline(seed, 'A'));
  const linkA: LinkStatus[] = [];
  a.subscribe((_s, l) => linkA.push(l));

  await ate(() => salas.length === 1, 'a sala do anfitrião abrir');
  const salaA = salas[0];
  if (salaA === undefined) throw new Error('doisAparelhos: sala do anfitrião ausente');

  const b = nova(cfgOnline(seed, 'B', salaA.roomId));
  const linkB: LinkStatus[] = [];
  b.subscribe((_s, l) => linkB.push(l));

  await ate(() => salas.length === 2, 'a sala do convidado abrir');
  await ate(
    () => linkA.includes('connected') || linkB.includes('connected'),
    'os dois aparelhos conectarem',
  );

  const salaB = salas[1];
  if (salaB === undefined) throw new Error('doisAparelhos: sala do convidado ausente');
  return { a, b, linkA, linkB, salaB };
}

/** Toca a cobrança corrente nos dois aparelhos, com o par (chute, defesa) que M2 registrou. */
function cobrar(a: Session, b: Session, shot: Zone, dive: Zone): void {
  // Quem cobra é `match.turn`, de M2 — os dois aparelhos leem o mesmo e derivam a própria zona.
  const vez = a.state().turn;
  if (vez === 'A') {
    a.choose(shot);
    b.choose(dive);
  } else {
    a.choose(dive);
    b.choose(shot);
  }
}

const avisos: string[] = [];
let silenciar: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  setSignalingLoader(sinalizacaoFalsa());
  salas.length = 0;
  avisos.length = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  // Guardados, não descartados: quando algo reprova, o aviso é a causa.
  silenciar = [
    vi.spyOn(console, 'warn').mockImplementation((...x: unknown[]) => {
      avisos.push(x.map(String).join(' '));
    }),
    vi.spyOn(console, 'error').mockImplementation((...x: unknown[]) => {
      avisos.push(x.map(String).join(' '));
    }),
  ];
});

afterEach(async () => {
  await respirar();
  for (const s of vivas) s.dispose();
  vivas.length = 0;
  vi.useRealTimers();
  for (const e of silenciar) e.mockRestore();
  silenciar = [];
  setSignalingLoader(null);
});

/* ───────────────── o portão: os TRÊS modos produzem o mesmo MatchState ───────────────── */

describe('T-13 — o modo online produz o MESMO MatchState que cpu e local', () => {
  it('a disputa inteira coincide, cobrança a cobrança, nos dois aparelhos', async () => {
    // As três sementes têm uma condição a mais desde `T-17`: precisam ser sementes cujo sorteio de
    // quem cobra primeiro dê `'A'` no modo `local`. O motivo é a lacuna `Q-11`: `local` sorteia
    // (`D-48`) e `online` ainda não pode, porque os dois aparelhos não compartilham semente, então
    // `online` segue começando em `'A'`. Com uma semente que sorteasse `'B'`, a referência e os
    // dois aparelhos divergiriam na 1ª cobrança — e a divergência seria a lacuna, não um defeito
    // do transporte, que é justamente o que este teste existe para medir. `12345` sorteia `'B'` e
    // por isso saiu; `99991` entrou no lugar. Quando `Q-11` for respondida, esta restrição cai.
    for (const seed of [0, 7, 99_991]) {
      salas.length = 0;

      // 1) A disputa de referência, jogada no modo `local` (mesma regra, zero rede).
      //
      // As duas zonas de uma cobrança saem de fórmulas DIFERENTES de propósito. Com um passo só
      // — `i * 7 % 3` para chute e defesa alternados — o chute nunca calha de coincidir com a
      // defesa, toda cobrança vira gol e a morte súbita não termina nunca: o roteiro produzia
      // uma disputa infinita e o teste acusava o código de produção. `k * k` quebra o passo
      // constante e faz defesa e chute coincidirem de vez em quando, que é o que fecha a disputa.
      const referencia = createSession({ mode: 'local', seed, teams: { A: BR, B: AR }, localSide: 'A' });
      const ZONAS: readonly Zone[] = ['L', 'C', 'R'];
      const zona = (i: number): Zone => {
        const z = ZONAS[((i % 3) + 3) % 3];
        if (z === undefined) throw new Error('roteiro: índice fora da faixa');
        return z;
      };
      for (let k = 0; referencia.state().phase !== 'finished' && k < 60; k += 1) {
        referencia.choose(zona(k * 5 + seed)); // o chute de quem cobra
        referencia.choose(zona(k * k + 2 * seed)); // a defesa do outro lado
      }
      const esperado: MatchState = referencia.state();
      referencia.dispose();

      // Sem este piso o teste passaria vazio: zero cobrança é igual a zero cobrança.
      expect(esperado.phase, `seed ${seed}: a referência não terminou`).toBe('finished');
      expect(esperado.kicks.length, `seed ${seed}: disputa curta demais`).toBeGreaterThanOrEqual(6);

      // A condição da semente, cobrada em voz alta: se um dia ela deixar de valer, a mensagem
      // aponta a lacuna certa em vez de deixar a divergência parecer defeito do transporte.
      expect(
        esperado.kicks[0]?.side,
        `seed ${seed}: o sorteio de local deu 'B', e online ainda não sorteia (Q-11) — troque a semente ou responda Q-11`,
      ).toBe('A');

      // 2) A MESMA sequência de zonas, agora com os dois lados em aparelhos diferentes.
      const { a, b } = await doisAparelhos(seed);
      for (const k of esperado.kicks) {
        cobrar(a, b, k.shot, k.dive);
        await respirar();
      }

      expect(a.state(), `seed ${seed}: anfitrião divergiu`).toEqual(esperado);
      expect(b.state(), `seed ${seed}: convidado divergiu`).toEqual(esperado);
      expect(a.state().winner).toBe(esperado.winner);
      expect(b.state().winner).toBe(esperado.winner);
    }
  });

  it('T-17: o modo online NÃO sorteia quem cobra primeiro — lacuna de Q-11, conferida', async () => {
    // Protege a lacuna dos DOIS lados. Fazer `online` sortear com `cfg.seed` reprovaria aqui, e
    // com razão: as sementes dos dois aparelhos são independentes (cada tela chama `createSession`
    // com a sua), então cada um começaria com um cobrador diferente e as duas disputas divergiriam
    // na 1ª cobrança — trocar um lado fixo por uma disputa quebrada. Enquanto `Q-11` estiver
    // aberta, `'A'` começa, e é o mesmo comportamento que `T-13` entregou.
    for (const seed of [0, 1, 7, 12_345]) {
      salas.length = 0;
      const { a, b } = await doisAparelhos(seed);

      expect(a.state().turn, `semente ${seed}: o anfitrião sorteou no modo online`).toBe('A');
      expect(b.state().turn, `semente ${seed}: o convidado sorteou no modo online`).toBe('A');

      // O que a lacuna garante e o sorteio ainda não pode garantir: os dois aparelhos concordam.
      expect(a.state().turn).toBe(b.state().turn);
      a.dispose();
      b.dispose();
      await respirar();
    }
  });

  it('a ordem em que as duas escolhas chegam não muda o resultado', async () => {
    const { a, b } = await doisAparelhos(31);

    // Primeira cobrança: o anfitrião escolhe antes. Segunda: o convidado. O `MatchState` de
    // cada cobrança não pode depender de quem tocou a tela primeiro.
    a.choose('L');
    await respirar();
    b.choose('R');
    await respirar();

    b.choose('C');
    await respirar();
    a.choose('C');
    await respirar();

    expect(a.state()).toEqual(b.state());
    expect(a.state().kicks.length).toBe(2);
    expect(a.state().kicks[0]).toEqual({ side: 'A', shot: 'L', dive: 'R', goal: true });
  });
});

/* ─────────────── o portão: evento remoto ilegal NUNCA chega a M2 ─────────────── */

describe('T-13 — evento remoto fora de ordem, repetido ou torto morre em M5', () => {
  /** Injeta uma jogada crua na sala do aparelho — é literalmente o que M6 entrega a M5. */
  async function comAparelhoSozinho(): Promise<{ s: Session; injetar: (m: unknown) => void }> {
    const s = nova(cfgOnline(9, 'A'));
    await ate(() => salas.length === 1, 'a sala abrir');
    const sala = salas[0];
    if (sala === undefined) throw new Error('sala ausente');
    return { s, injetar: (m: unknown) => sala.acao.onMessage?.(m, null) };
  }

  it('seq futuro, seq velho, lado errado e zona torta são todos descartados', async () => {
    const { s, injetar } = await comAparelhoSozinho();
    const antes = s.state();

    const ilegais: readonly unknown[] = [
      { seq: 5, side: 'B', zone: 'L' }, // fora de ordem: cobrança que não começou
      { seq: 1, side: 'B', zone: 'L' }, // idem, logo à frente
      { seq: 0, side: 'A', zone: 'L' }, // o lado DESTE aparelho — cliente modificado
      { seq: 0, side: 'B', zone: 'X' }, // zona que não existe
      { seq: -1, side: 'B', zone: 'L' }, // seq negativo
      { seq: 1.5, side: 'B', zone: 'L' }, // seq não inteiro
      { seq: 0, side: 'C', zone: 'L' }, // lado que não existe
      { zone: 'L' }, // sem seq nem side
      null,
      'L',
    ];

    for (const ruim of ilegais) {
      injetar(ruim);
      // Nada mudou: nem cobrança, nem placar, nem fase. `toEqual` no estado inteiro é o que
      // pega o campo que uma asserção sobre `kicks.length` sozinha deixaria passar.
      expect(s.state(), `evento ilegal virou estado: ${JSON.stringify(ruim)}`).toEqual(antes);
    }
    expect(s.state().kicks.length).toBe(0);
  });

  it('jogada repetida do peer não vira duas cobranças — vale a primeira', async () => {
    const { s, injetar } = await comAparelhoSozinho();

    const valida: Move = { seq: 0, side: 'B', zone: 'L' };
    injetar(valida);
    injetar(valida); // reenvio da fila de M6: seguro de repetir PORQUE morre aqui
    injetar({ seq: 0, side: 'B', zone: 'R' }); // e nem trocar a zona é aceito

    expect(s.state().kicks.length, 'a repetição virou cobrança').toBe(0);

    // Agora a escolha local fecha a cobrança — com a PRIMEIRA zona do peer, não a terceira.
    s.choose('C');
    expect(s.state().kicks.length).toBe(1);
    expect(s.state().kicks[0]?.dive).toBe('L');
  });

  it('depois do fim da disputa, jogada remota não é aceita', async () => {
    const { a, b } = await doisAparelhos(3);
    // 3x0 é a morte matemática mais curta: o anfitrião converte, o convidado erra.
    for (let i = 0; i < 10 && a.state().phase !== 'finished'; i += 1) {
      const vez = a.state().turn;
      // Quem cobra chuta 'L'; quem defende pula para 'R' se for o anfitrião cobrando (gol),
      // e defende em cima se for o convidado (defesa).
      if (vez === 'A') {
        a.choose('L');
        b.choose('R');
      } else {
        b.choose('L');
        a.choose('L');
      }
      await respirar();
    }
    expect(a.state().phase).toBe('finished');

    const final = a.state();
    const sala = salas[0];
    sala?.acao.onMessage?.({ seq: final.kicks.length, side: 'B', zone: 'L' }, null);
    expect(a.state()).toEqual(final);
  });
});

/* ───────────────── o portão: o peer some — Q-04 / D-35 (sem resultado) ───────────────── */

describe('T-13 — peer some no meio: a disputa morre SEM RESULTADO (Q-04/D-35)', () => {
  it('link vai a failed, ninguém vence, e nenhuma escolha é aceita depois', async () => {
    const { a, b, linkA } = await doisAparelhos(77);

    cobrar(a, b, 'L', 'R');
    await respirar();
    expect(a.state().kicks.length).toBe(1);

    const antesDeSumir = a.state();

    // O convidado fecha o canal: é o oponente saindo no meio.
    b.dispose();
    await respirar();
    expect(linkA.at(-1), 'a saída do peer devia voltar o canal para waiting').toBe('waiting');

    // M6 rearma os 20 s (`D-31`); passados eles sem o peer voltar, `'failed'` é terminal.
    await vi.advanceTimersByTimeAsync(20_000);
    await respirar();
    expect(linkA.at(-1)).toBe('failed');

    // O resultado de `Q-04`: a disputa não tem vencedor e não foi encerrada por cobrança.
    expect(a.state().winner, 'M5 inventou vencedor por abandono — isso é regra de M2').toBeNull();
    expect(a.state().phase).not.toBe('finished');
    expect(a.state(), 'o abandono mexeu no MatchState').toEqual(antesDeSumir);

    // E a sessão para de aceitar escolha, em voz alta.
    expect(() => a.choose('C')).toThrowError(/SEM RESULTADO/);
    expect(a.state()).toEqual(antesDeSumir);
  });

  it('peer que nunca chega tem o mesmo desfecho — sem resultado, nunca tela travada', async () => {
    const s = nova(cfgOnline(5, 'A'));
    const link: LinkStatus[] = [];
    s.subscribe((_e, l) => link.push(l));
    await ate(() => salas.length === 1, 'a sala abrir');

    await vi.advanceTimersByTimeAsync(20_000);
    await respirar();

    expect(link.at(-1)).toBe('failed');
    expect(s.state().winner).toBeNull();
    expect(s.state().kicks.length).toBe(0);
    expect(() => s.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('a escolha represada antes da queda não vaza para depois dela', async () => {
    const { a, b, linkA } = await doisAparelhos(11);
    a.choose('L'); // esperando a zona do peer
    b.dispose();
    await vi.advanceTimersByTimeAsync(20_000);
    await respirar();

    expect(linkA.at(-1)).toBe('failed');
    expect(a.state().kicks.length, 'a escolha represada virou cobrança sozinha').toBe(0);
  });
});

/* ─────────────────── o portão: dispose fecha o canal e não deixa assinante ─────────────────── */

describe('T-13 — dispose() fecha o canal', () => {
  it('solta a sala na sinalização e para de notificar', async () => {
    const { a, salaB } = await doisAparelhos(21);
    const salaA = salas[0];

    let depois = 0;
    a.subscribe(() => {
      depois += 1;
    });

    a.dispose();
    await respirar();

    expect(salaA?.saiu, 'dispose() não soltou a sala — o peer fica falando sozinho').toBe(true);
    expect(depois, 'assinante vivo depois do dispose()').toBe(0);
    expect(salaB.saiu).toBe(false); // o outro aparelho não é afetado por este dispose
  });

  it('dispose() é idempotente também no online', async () => {
    const { a } = await doisAparelhos(22);
    a.dispose();
    expect(() => a.dispose()).not.toThrow();
  });

  it('choose() depois de dispose() reclama do encerramento, não da rede', async () => {
    const { a } = await doisAparelhos(23);
    a.dispose();
    expect(() => a.choose('L')).toThrowError(/sessão encerrada/);
  });
});

/* ─────────────────────────── configuração do modo online ─────────────────────────── */

describe('T-13 — a configuração do online é conferida antes de existir sala', () => {
  it('roomId torto é recusado por M6, com a mensagem de M6', () => {
    expect(() => createSession(cfgOnline(1, 'B', 'sala-do-fulano'))).toThrowError(
      /ID de sala inválido/,
    );
    expect(salas.length, 'abriu sala com ID inválido').toBe(0);
  });

  it('level no modo online é recusado — nível é da CPU, e não há CPU aqui', () => {
    expect(() =>
      createSession({
        mode: 'online',
        seed: 1,
        level: 'hard',
        teams: { A: BR, B: AR },
        localSide: 'A',
      }),
    ).toThrowError(/level só existe no modo cpu/);
  });

  it('a segunda escolha na mesma cobrança é recusada — cada aparelho escolhe uma vez', async () => {
    const { a } = await doisAparelhos(41);
    a.choose('L');
    expect(() => a.choose('R')).toThrowError(/uma vez por cobrança/);
  });
});

/* ──── `QA-25`: a fila de M6 chega a entregar `seq=0` numa disputa em andamento? ──── */

describe('QA-25 — de onde vem um `seq=0` que chega com a disputa já andada', () => {
  // A lacuna declarada em `e_qa/qa25_reentrada_na_janela.md`: o comentário de `aoMove` registra
  // que "`seq` menor é reenvio da fila de M6", e ninguém mediu se esse reenvio chega a produzir
  // `seq=0` numa disputa em andamento. É esse número que decide se "tratar `seq=0` pós-conexão
  // como abandono" é conserto ou palpite. Estes testes MEDEM; a saída é `D-NN` do dono.

  /** Toda jogada que chegou a um aparelho, com o nº da cobrança que ele vivia na chegada. */
  function grampear(sala: SalaFake, quem: Session): Array<{ seq: number; kicksNaChegada: number }> {
    const log: Array<{ seq: number; kicksNaChegada: number }> = [];
    const original = sala.acao.onMessage;
    sala.acao.onMessage = (d: unknown, ctx: unknown) => {
      log.push({ seq: (d as Move).seq, kicksNaChegada: quem.state().kicks.length });
      original?.(d, ctx);
    };
    return log;
  }

  it('a fila escoada na reentrada chega EM DIA: nenhum `seq=0` com a disputa andada', async () => {
    const { a, b, salaB, linkA } = await doisAparelhos(77);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('QA-25: sala do anfitrião ausente');
    const recebidasB = grampear(salaB, b);

    // Cobrança 0 jogada com o canal são: o `seq=0` do anfitrião sai DIRETO, sem passar pela
    // fila. É ele que um reenvio indevido ressuscitaria mais adiante.
    cobrar(a, b, 'L', 'R');
    await respirar();
    expect(a.state().kicks.length).toBe(1);
    expect(b.state().kicks.length).toBe(1);

    // A queda momentânea de rede de `A-22`: só o anfitrião percebe. `'waiting'` não é terminal
    // para M5 (`session/index.ts:313`), então a disputa continua deste lado.
    await respirar();
    salaA.onPeerLeave?.('peer');
    await respirar();
    expect(linkA.at(-1), 'a queda devia ter posto o anfitrião em waiting').toBe('waiting');

    // Cobrança 1. `a.choose` vai para a FILA (canal em `'waiting'`); `b.choose` sai na hora,
    // porque o convidado não viu queda nenhuma.
    a.choose('C'); // represada: seq=1
    b.choose('L'); // entregue: o anfitrião fecha a cobrança 1 sozinho
    await respirar();

    // O desencontro que a janela cria: o anfitrião andou, o convidado não.
    expect(a.state().kicks.length, 'o anfitrião devia ter fechado a cobrança 1').toBe(2);
    expect(b.state().kicks.length, 'o convidado não podia andar sem a jogada do anfitrião').toBe(1);

    // A reentrada dentro dos 20 s — o `onPeerJoin` que `escoarFila` atende.
    salaA.onPeerJoin?.('peer');
    await respirar();

    // ── A MEDIÇÃO ────────────────────────────────────────────────────────────────────
    // O escoamento entregou `seq=1`, e só. O `seq=0` chegou uma vez, lá atrás, quando o
    // convidado ainda vivia a cobrança 0: a fila entrega jogada ATRASADA, não jogada VELHA.
    // O convidado só passa de uma cobrança consumindo aquele `seq`, que a fila entrega uma
    // única vez (`shift`) — logo, pela fila, `seq=0` com `kicksNaChegada > 0` é inalcançável.
    expect(recebidasB.map((r) => r.seq)).toEqual([0, 1]);
    expect(
      recebidasB.filter((r) => r.seq === 0 && r.kicksNaChegada > 0),
      'a fila entregou seq=0 numa disputa andada — a lacuna de QA-25 se confirmaria aqui',
    ).toEqual([]);

    // E o desencontro se desfez: nada foi descartado, os dois estão na mesma cobrança.
    expect(avisos.filter((m) => m.includes('fora de ordem'))).toEqual([]);
    expect(b.state().kicks.length).toBe(2);
    expect(b.state()).toEqual(a.state());
  });

  it('o `seq=0` que chega com a disputa andada vem de SESSÃO NOVA, não da fila', async () => {
    const { a, b, linkA } = await doisAparelhos(77);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('QA-25: sala do anfitrião ausente');

    cobrar(a, b, 'L', 'R');
    await respirar();
    expect(a.state().kicks.length).toBe(1);

    // O navegador do convidado fecha. Dentro dos 20 s, alguém reabre o MESMO link: sessão
    // zerada, `roomId` idêntico — a distinção que M6 não faz (`net/index.ts:379`).
    b.dispose();
    await respirar();
    expect(linkA.at(-1)).toBe('waiting');

    const c = nova(cfgOnline(77, 'B', salaA.roomId));
    await ate(() => linkA.at(-1) === 'connected', 'a reentrada reconectar o anfitrião');

    // A sessão nova está na cobrança 0 e manda `seq=0` — o caso que a fila NÃO produz.
    expect(c.state().kicks.length).toBe(0);
    c.choose('C');
    await respirar();

    expect(
      avisos.some((m) => m.includes('fora de ordem') && m.includes('"seq":0')),
      'o seq=0 da sessão nova devia ter sido descartado por M5',
    ).toBe(true);
    expect(a.state().kicks.length, 'M5 aceitou jogada de sessão zerada').toBe(1);
  });

  it('dentro da janela ninguém desiste: o canal fica `connected` e nada mais emite `failed`', async () => {
    const { a, b, linkA } = await doisAparelhos(77);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('QA-25: sala do anfitrião ausente');

    cobrar(a, b, 'L', 'R');
    await respirar();
    b.dispose();
    await respirar();

    const c = nova(cfgOnline(77, 'B', salaA.roomId));
    await ate(() => linkA.at(-1) === 'connected', 'a reentrada reconectar o anfitrião');

    // O timer de 20 s foi limpo por `onPeerJoin`. Passado MUITO mais que a janela, o canal
    // segue `'connected'`: é o travamento que sustenta a severidade ALTO de `QA-25` — e é o
    // fato medido, não a decisão de como sair dele.
    await vi.advanceTimersByTimeAsync(120_000);
    await respirar();

    expect(linkA).not.toContain('failed');
    expect(linkA.at(-1)).toBe('connected');
    expect(a.state().winner, 'placar mentiroso: as guardas de D-32/M5 deviam ter segurado').toBeNull();
    expect(c.state().kicks.length).toBe(0);
    expect(a.state().kicks.length).toBe(1);
  });
});
