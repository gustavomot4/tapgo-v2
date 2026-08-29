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
import { CONNECT_TIMEOUT_MS, createSession, newRoomId } from '../session/index';
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

/**
 * Duas salas FIXAS, e o lado que cada uma sorteia (`D-98`: o `roomId` é a semente do `online`).
 *
 * Elas são literais de propósito. Com `newRoomId()` a cada teste, metade das execuções começaria
 * com `'B'` e as asserções de roteiro abaixo — que comparam com uma disputa de referência jogada
 * no modo `local` — passariam a falhar em dias alternados: teste intermitente, não portão. O
 * sorteio em si é medido no seu próprio caso, sobre milhares de salas.
 *
 * Os dois IDs têm a forma que `joinRoom` exige (26 caracteres do Crockford base32 de M6).
 */
const SALA_PRIMEIRO_A = 'H352T699HKN8EV9C0C6CT6SYR8';
const SALA_PRIMEIRO_B = '5DNMP4HF7T4BG0CEY0VGA6TA4N';

function cfgOnline(seed: number, localSide: Side, roomId?: string): SessionConfig {
  const base = { mode: 'online' as const, seed, teams: { A: BR, B: AR }, localSide };
  // `exactOptionalPropertyTypes` está ligado: montar condicionalmente, nunca atribuir undefined.
  return roomId === undefined ? base : { ...base, roomId };
}

/**
 * A configuração de `T-31`: este aparelho escolheu a SUA seleção; a do outro chega pelo fio.
 *
 * É a única forma nova de `SessionConfig` que `D-90` abriu — `null` no lado do peer, e só no
 * `online`. `cfgOnline` acima segue existindo porque é o que a tela mandava antes de `T-31`, e
 * o que ela ainda manda enquanto M7 não for feita: os dois formatos precisam continuar valendo.
 */
function cfgEscolhendo(seed: number, localSide: Side, roomId?: string): SessionConfig {
  const teams: Record<Side, string | null> =
    localSide === 'A' ? { A: BR, B: null } : { A: null, B: AR };
  const base = { mode: 'online' as const, seed, teams, localSide };
  return roomId === undefined ? base : { ...base, roomId };
}

/** A configuração torta que `D-90` recusa: `null` no lado DESTE aparelho. */
function cfgOnlineComNull(seed: number, localSide: Side): SessionConfig {
  const teams: Record<Side, string | null> =
    localSide === 'A' ? { A: null, B: AR } : { A: BR, B: null };
  return { mode: 'online', seed, teams, localSide };
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
 * Os DOIS entram por `roomId`, que é como M7 cria a sessão desde `D-73` — e, desde `D-98`, é
 * também o que faz os dois sortearem o MESMO primeiro cobrador. O helper deixou de ler o ID da
 * rede falsa (o contorno que a lacuna `Q-11` exigia) porque agora quem manda o ID é o chamador,
 * exatamente como a tela de convite manda.
 */
async function doisAparelhos(
  seed: number,
  sala: string = SALA_PRIMEIRO_A,
): Promise<{
  a: Session;
  b: Session;
  linkA: LinkStatus[];
  linkB: LinkStatus[];
  salaB: SalaFake;
}> {
  const a = nova(cfgOnline(seed, 'A', sala));
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

/**
 * Os DOIS aparelhos no mesmo link — o par espelhado de `QA-26`.
 *
 * Reproduz o que `abertura()` produz hoje (`src/ui/main.ts:162`): todo endereço com `?sala=`
 * recebe `ladoLocal: 'B'`, sem exceção, então quem abre o mesmo link em dois aparelhos nasce
 * `'B'` nos dois. É a única diferença para `doisAparelhos` — mesma sala, mesmo `seed`, e o
 * `localSide` repetido.
 *
 * Os dois entram pelo mesmo `roomId`, como em `doisAparelhos`. Isso não muda o que está sob
 * teste — o que faz o par ser espelhado é o `localSide` repetido, não quem hospedou.
 *
 * **Desde `T-31` (`D-90`) este helper devolve o par JÁ DESFEITO**, e é de propósito: os dois
 * anunciam a seleção ao conectar, o anúncio de um chega assinado com o lado do outro, e a
 * denúncia acontece antes de qualquer `choose`. Quem recebe primeiro cai no tique; o que sobra
 * volta a `'waiting'` e cai pelo relógio de M6. Nenhum teste abaixo pode, portanto, contar com
 * um `choose` atravessando o fio — `abandonada` já barra na primeira linha de `aoMove`.
 */
async function parEspelhado(seed: number): Promise<{
  b1: Session;
  b2: Session;
  link1: LinkStatus[];
  link2: LinkStatus[];
}> {
  const b1 = nova(cfgOnline(seed, 'B', SALA_PRIMEIRO_A));
  const link1: LinkStatus[] = [];
  b1.subscribe((_s, l) => link1.push(l));

  await ate(() => salas.length === 1, 'a sala do primeiro aparelho abrir');
  const sala1 = salas[0];
  if (sala1 === undefined) throw new Error('D-81: sala do primeiro aparelho ausente');

  const b2 = nova(cfgOnline(seed, 'B', sala1.roomId));
  const link2: LinkStatus[] = [];
  b2.subscribe((_s, l) => link2.push(l));

  await ate(() => salas.length === 2, 'a sala do segundo aparelho abrir');
  await ate(
    () => link1.includes('connected') || link2.includes('connected'),
    'os dois aparelhos conectarem',
  );

  // As duas primeiras previsões que o dono mediu em campo em 2026-08-20, antes de qualquer
  // código: com `first = 'A'` (aqui pela sala escolhida, `D-98`) e `localSide = 'B'` nos dois,
  // `turn !== localSide` dos dois lados, logo os DOIS ficam de defesa e nenhum cobra. A terceira
  // — que o toque acontece e a jogada SAI — é a pré-condição da guarda, e é o que os testes
  // abaixo exercitam.
  expect(b1.state().turn, 'o par espelhado nasce com os dois esperando o lado A cobrar').toBe('A');
  expect(b2.state().turn).toBe('A');
  return { b1, b2, link1, link2 };
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
    // quem cobra primeiro dê `'A'` no modo `local`. A razão não é mais lacuna nenhuma — é que os
    // dois sorteios têm sementes DIFERENTES por desenho (`D-98`): `local` sorteia com `cfg.seed`
    // e `online` com o `roomId`. Para as duas disputas serem comparáveis cobrança a cobrança,
    // este caso combina os dois lados: sementes que dão `'A'` no `local`, e `SALA_PRIMEIRO_A` no
    // `online`. `12345` sorteia `'B'` no `local` e por isso saiu; `99991` entrou no lugar. O caso
    // simétrico — sala que sorteia `'B'` — é medido logo abaixo, no portão do próprio sorteio.
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
        `seed ${seed}: o sorteio de local deu 'B' e a sala deste caso dá 'A' — troque a semente`,
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

  it('T-17/D-98: os dois aparelhos sorteiam o MESMO lado, e é o lado da sala', async () => {
    // O portão do sorteio no `online`, dos dois lados. As sementes de `cfg.seed` são DIFERENTES
    // em cada aparelho de propósito: em produção cada tela chama `createSession` com a sua, e é
    // exatamente por isso que `cfg.seed` não podia semear este sorteio — semeá-lo com ela faria
    // cada aparelho começar com um cobrador e divergir na 1ª cobrança. O que os dois têm em comum
    // é o `roomId`, e é ele que decide (`D-98`).
    for (const [sala, esperado] of [
      [SALA_PRIMEIRO_A, 'A'],
      [SALA_PRIMEIRO_B, 'B'],
    ] as const) {
      for (const [seedA, seedB] of [
        [0, 1],
        [7, 12_345],
        [99_991, 3],
      ] as const) {
        salas.length = 0;

        const a = nova(cfgOnline(seedA, 'A', sala));
        await ate(() => salas.length === 1, 'a sala do anfitrião abrir');
        const b = nova(cfgOnline(seedB, 'B', sala));
        await ate(() => salas.length === 2, 'a sala do convidado abrir');

        const onde = `sala ${sala.slice(0, 4)}…, sementes ${seedA}/${seedB}`;
        expect(a.state().turn, `${onde}: o anfitrião não tirou o lado da sala`).toBe(esperado);
        expect(b.state().turn, `${onde}: o convidado não tirou o lado da sala`).toBe(esperado);
        expect(a.state().turn, `${onde}: os dois aparelhos divergiram`).toBe(b.state().turn);

        a.dispose();
        b.dispose();
        await respirar();
      }
    }
  });

  it('T-17/D-98: a mesma sala dá sempre o mesmo primeiro cobrador', async () => {
    // "Mesma semente = mesmo primeiro cobrador", que no `online` quer dizer mesma SALA. Sem isto,
    // reabrir o mesmo link depois de um `'failed'` (`D-75`) poderia recomeçar com o outro cobrador
    // enquanto o aparelho do outro lado seguisse com o antigo.
    for (const sala of [SALA_PRIMEIRO_A, SALA_PRIMEIRO_B]) {
      salas.length = 0;
      const primeira = nova(cfgOnline(1, 'A', sala)).state().turn;
      for (let i = 0; i < 5; i += 1) {
        expect(nova(cfgOnline(i * 977, 'B', sala)).state().turn, `sala ${sala}: repetição ${i}`).toBe(
          primeira,
        );
      }
      for (const v of vivas) v.dispose();
      vivas.length = 0;
      await respirar();
    }
  });

  it('T-17/D-98: numa sala que sorteia B, a ordem fica em B até o fim das alternadas', async () => {
    // A não-alternância (`D-48`) é regra de M2, e `session.test.ts` já a confere em `cpu`/`local`.
    // Aqui ela é conferida pelo caminho do `online`, e com o sorteio dando o lado que NÃO é o
    // padrão antigo: se algum dia alguém devolver o `'A'` fixo a esta camada, este caso reprova
    // na primeira linha, e não numa asserção de placar 12 cobranças depois.
    const { a, b } = await doisAparelhos(31, SALA_PRIMEIRO_B);
    expect(a.state().turn, 'a sala que sorteia B não começou em B').toBe('B');

    // 10 defesas = 0x0 ao fim da fase regular: o caminho garantido até as alternadas, sem sorte.
    for (let k = 0; k < 10; k += 1) {
      cobrar(a, b, 'L', 'L');
      await respirar();
    }
    expect(a.state().phase).toBe('suddenDeath');
    expect(a.state().turn, 'a alternada não começou com o sorteado').toBe('B');

    // Primeira rodada alternada: gol de quem cobra primeiro, defesa do outro → decide.
    cobrar(a, b, 'L', 'R');
    await respirar();
    cobrar(a, b, 'L', 'L');
    await respirar();

    const fim = a.state();
    expect(fim.phase).toBe('finished');
    expect(fim.kicks.length).toBe(12);
    expect(fim.winner, 'quem cobrou primeiro na alternada fez o gol').toBe('B');
    fim.kicks.forEach((k, i) => {
      expect(k.side, `cobrança ${i}`).toBe(i % 2 === 0 ? 'B' : 'A');
    });
    expect(b.state(), 'os dois aparelhos divergiram').toEqual(fim);
  });

  it('T-17/D-98: sobre milhares de salas, nenhum lado passa do esperado', async () => {
    // Uniformidade. Um `roomId` que caísse quase sempre no mesmo lado devolveria em silêncio o
    // defeito que `D-48` removeu — um lado cobrando primeiro quase sempre —, e nenhum dos casos
    // acima veria isso: eles medem duas salas fixas. Aqui são milhares, sorteadas por `newRoomId`,
    // que é a mesma função que a tela de convite chama.
    //
    // A faixa é 4 desvios-padrão da binomial (σ = √(n)/2 ≈ 22 em 2.000): larga o bastante para
    // não piscar sozinha, estreita o bastante para reprovar viés de 2 pontos percentuais.
    const N = 2_000;
    let ladoA = 0;
    for (let i = 0; i < N; i += 1) {
      salas.length = 0;
      const s = createSession(cfgOnline(i, 'A', newRoomId()));
      if (s.state().turn === 'A') ladoA += 1;
      s.dispose();
    }

    const desvio = Math.abs(ladoA - N / 2);
    expect(desvio, `${ladoA} salas em 'A' de ${N} — sorteio enviesado`).toBeLessThanOrEqual(
      4 * (Math.sqrt(N) / 2),
    );
    expect(ladoA, 'nenhuma sala caiu em B').toBeGreaterThan(0);
    expect(ladoA, 'nenhuma sala caiu em A').toBeLessThan(N);
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

  // O lado DESTE aparelho saiu desta lista em `D-81`: ele deixou de ser descarte silencioso e
  // passou a terminar a disputa (par espelhado, `QA-26`). Deixá-lo aqui mataria a sessão no meio
  // do laço e os itens seguintes passariam sem exercitar guarda nenhuma. Está no bloco de `D-81`.
  it('seq futuro, seq velho, lado inexistente e zona torta são todos descartados', async () => {
    const { s, injetar } = await comAparelhoSozinho();
    const antes = s.state();

    const ilegais: readonly unknown[] = [
      { seq: 5, side: 'B', zone: 'L' }, // fora de ordem: cobrança que não começou
      { seq: 1, side: 'B', zone: 'L' }, // idem, logo à frente
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

  /**
   * Toda JOGADA que chegou a um aparelho, com o nº da cobrança que ele vivia na chegada.
   *
   * O filtro `'zone' in d` não é enfeite desde `D-90`: o fio carrega `Move` **ou** `Pick`, e o
   * anúncio de seleção não tem `seq` nenhum. Sem o filtro, o `Pick` que o rearme de `D-31`
   * reenvia a cada `'connected'` entrava aqui como `seq: undefined` e a medição de `QA-25`
   * passava a falar de um payload que não é de cobrança nenhuma.
   */
  function grampear(sala: SalaFake, quem: Session): Array<{ seq: number; kicksNaChegada: number }> {
    const log: Array<{ seq: number; kicksNaChegada: number }> = [];
    const original = sala.acao.onMessage;
    sala.acao.onMessage = (d: unknown, ctx: unknown) => {
      if (typeof d === 'object' && d !== null && 'zone' in d) {
        log.push({ seq: (d as Move).seq, kicksNaChegada: quem.state().kicks.length });
      }
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

    // Desde `D-80` o descarte tem NOME próprio: não é mais "fora de ordem" genérico. O que este
    // teste mede continua sendo o mesmo — a fonte do `seq=0` é sessão nova, e M5 não a aceita.
    expect(
      avisos.some((m) => m.includes('sessão zerada (D-80)') && m.includes('"seq":0')),
      'o seq=0 da sessão nova devia ter sido descartado por M5',
    ).toBe(true);
    expect(a.state().kicks.length, 'M5 aceitou jogada de sessão zerada').toBe(1);
  });

});

/* ──── `D-80`: a porta M5 que fecha `QA-25` — a reentrada de sessão zerada cai em `D-35` ──── */

describe('D-80 — reentrada de sessão zerada dentro dos 20 s termina a disputa (QA-25)', () => {
  // Antes de `D-80` este bloco media a TRAVA: o canal ficava `'connected'`, o timer de 20 s já
  // tinha sido limpo por `onPeerJoin`, e nem 120 s depois alguém emitia `'failed'` — as duas
  // telas presas em "Esperando o outro jogador…" com placares divergentes. É esse travamento
  // que os testes abaixo agora proíbem, item por item do portão escrito em `A-23`.

  /** O cenário do achado: uma cobrança fechada, o convidado morre, e alguém reabre o link. */
  async function reentrada(): Promise<{
    a: Session;
    c: Session;
    linkA: LinkStatus[];
    linkC: LinkStatus[];
  }> {
    const { a, b, linkA } = await doisAparelhos(77);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-80: sala do anfitrião ausente');

    cobrar(a, b, 'L', 'R');
    await respirar();
    expect(a.state().kicks.length).toBe(1);

    // Navegador fechado. Dentro dos 20 s, o MESMO link é reaberto: sessão zerada, `roomId`
    // idêntico — a distinção que M6 não faz (`net/index.ts:379`).
    b.dispose();
    await respirar();

    const c = nova(cfgOnline(77, 'B', salaA.roomId));
    const linkC: LinkStatus[] = [];
    c.subscribe((_s, l) => linkC.push(l));
    await ate(() => linkA.at(-1) === 'connected', 'a reentrada reconectar o anfitrião');
    expect(linkA, 'antes do seq=0 ninguém desistiu — o canal está de pé').not.toContain('failed');
    expect(c.state().kicks.length, 'a sessão nova devia nascer zerada').toBe(0);
    return { a, c, linkA, linkC };
  }

  it('portão (1): o lado preso vai a `failed` no MESMO tick do seq=0, sem relógio nenhum', async () => {
    const { a, c, linkA } = await reentrada();
    const antes = linkA.length;

    // Sem `advanceTimers` e sem `respirar()` entre a escolha e a asserção: a entrega da rede
    // falsa é síncrona, e o portão exige `'failed'` no tique da chegada — não daqui a 20 s.
    c.choose('C');

    expect(linkA.at(-1), 'D-80: `failed` devia sair no tique do seq=0').toBe('failed');
    expect(linkA.length, 'M7 não foi notificado').toBeGreaterThan(antes);
    expect(
      avisos.some((m) => m.includes('sessão zerada (D-80)')),
      'o descarte devia dizer POR QUE, e não "fora de ordem"',
    ).toBe(true);

    // `D-35` intacto: abandono não escreve vencedor, e nenhuma escolha é aceita depois.
    expect(a.state().winner, 'abandono não pode escrever vencedor (D-35)').toBeNull();
    expect(a.state().kicks.length, 'a jogada de sessão zerada não pode chegar a M2').toBe(1);
    expect(() => a.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('portão (1): o `closed` do próprio `close()` não apaga o `failed` que M7 pinta', async () => {
    const { a, c, linkA } = await reentrada();
    c.choose('C');
    await respirar();
    await vi.advanceTimersByTimeAsync(60_000);
    await respirar();

    // `close()` avisa os assinantes com `'closed'` logo em seguida (`net/index.ts:467`). Se M5
    // deixasse esse status passar, `tela_cobranca.ts:395` — que só pinta em `'failed'` — voltaria
    // a mostrar tela travada, agora sem nem um timer para socorrê-la.
    expect(linkA.at(-1), '`failed` é terminal para M5, venha de M6 ou sintetizado').toBe('failed');
    expect(a.state().winner).toBeNull();
  });

  it('portão (2): o lado que VOLTOU também sai da tela travada, em 20 s', async () => {
    const { c, linkC } = await reentrada();
    c.choose('C');
    await respirar();

    // O `canal.close()` do lado preso solta a sala; o `leave()` vira `onPeerLeave` aqui, que
    // emite `'waiting'` e rearma os 20 s — o caminho que `A-22` mediu em campo.
    expect(linkC.at(-1), 'a saída do veterano devia ter chegado como waiting').toBe('waiting');

    await vi.advanceTimersByTimeAsync(20_000);
    await respirar();

    expect(linkC.at(-1), 'QA-25: o lado que voltou ficaria preso para sempre').toBe('failed');
    expect(c.state().winner, 'nem aqui o abandono escreve vencedor').toBeNull();
    expect(() => c.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('escrita repetida não duplica efeito: o segundo seq=0 não move mais nada', async () => {
    const { a, c, linkA } = await reentrada();
    c.choose('C');
    await respirar();
    const depoisDoPrimeiro = [...linkA];

    // A sessão reentrante insiste (duplo toque, retry da fila, peer teimoso). `abandonada` já
    // barra em `aoMove`, então nada é notificado de novo e nada regride.
    c.dispose();
    await respirar();

    expect(linkA, 'o segundo evento moveu o status de novo').toEqual(depoisDoPrimeiro);
    expect(a.state().kicks.length).toBe(1);
    expect(a.state().winner).toBeNull();
  });

  it('portão (3): a queda-e-volta de `A-22` se recupera sozinha e a disputa TERMINA', async () => {
    // É o número que matou `D-78`: aparelho ~5 s em modo avião no meio da disputa, e ela seguiu.
    // `D-80` não pode cobrar essa recuperação — aqui o `seq` que escoa é `1`, nunca `0`.
    const seed = 7;
    const referencia = createSession({ mode: 'local', seed, teams: { A: BR, B: AR }, localSide: 'A' });
    const ZONAS: readonly Zone[] = ['L', 'C', 'R'];
    const zona = (i: number): Zone => {
      const z = ZONAS[((i % 3) + 3) % 3];
      if (z === undefined) throw new Error('roteiro: índice fora da faixa');
      return z;
    };
    for (let k = 0; referencia.state().phase !== 'finished' && k < 60; k += 1) {
      referencia.choose(zona(k * 5 + seed));
      referencia.choose(zona(k * k + 2 * seed));
    }
    const esperado: MatchState = referencia.state();
    referencia.dispose();
    expect(esperado.phase, 'a referência não terminou').toBe('finished');
    expect(esperado.kicks[0]?.side, "semente com sorteio 'B' — a sala deste caso dá 'A'").toBe('A');

    const { a, b, linkA } = await doisAparelhos(seed);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-80: sala do anfitrião ausente');

    for (let i = 0; i < esperado.kicks.length; i += 1) {
      const k = esperado.kicks[i];
      if (k === undefined) throw new Error('roteiro: cobrança ausente');
      // A queda cai na cobrança 1 e se desfaz logo depois — o anfitrião represa, o convidado
      // fica para trás, e a reentrada escoa `seq=1`.
      if (i === 1) {
        salaA.onPeerLeave?.('peer');
        await respirar();
      }
      cobrar(a, b, k.shot, k.dive);
      await respirar();
      if (i === 1) {
        salaA.onPeerJoin?.('peer');
        await respirar();
      }
    }

    expect(a.state(), 'o anfitrião divergiu depois da queda-e-volta').toEqual(esperado);
    expect(b.state(), 'o convidado divergiu depois da queda-e-volta').toEqual(esperado);
    expect(a.state().phase).toBe('finished');
    expect(
      linkA,
      'a queda que se recupera sozinha não pode virar D-35 — é o número que matou D-78',
    ).not.toContain('failed');
    expect(avisos.filter((m) => m.includes('sessão zerada (D-80)'))).toEqual([]);
  });
});

/* ──── `D-90` (`T-31`): cada aparelho escolhe a PRÓPRIA seleção, e ela viaja no fio ──── */

describe('D-90 — a seleção do outro aparelho chega pelo `Pick`, não pelo link', () => {
  // O que este bloco prova: que `null` em `teams[remoteSide]` é estado de ESPERA com prazo, que
  // ele vira a seleção que o outro escolheu, e que nada disso abriu um 5º método na porta.
  //
  // O que ele deliberadamente NÃO prova, e nenhum teste em sandbox pode: que os dois aparelhos
  // MOSTRAM o mesmo confronto. Isso é `A-NN`, medição do dono em dois aparelhos de verdade — o
  // sandbox não compõe quadros. É o primeiro item do portão de `D-90`, e segue aberto.

  /** Os dois aparelhos escolhendo cada um a sua, com o lado do peer nascendo `null`. */
  async function doisEscolhendo(seed: number): Promise<{
    a: Session;
    b: Session;
    vistoA: Array<Record<Side, string | null>>;
    vistoB: Array<Record<Side, string | null>>;
  }> {
    // Como em `doisAparelhos`: os DOIS entram pelo mesmo `roomId` (`D-73`), que desde `D-98` é
    // também a semente do sorteio de quem cobra primeiro. Com o anfitrião sem `roomId`, os dois
    // sortearam de fontes diferentes e divergiam em metade das execuções — teste intermitente.
    const a = nova(cfgEscolhendo(seed, 'A', SALA_PRIMEIRO_A));
    const vistoA: Array<Record<Side, string | null>> = [];
    a.subscribe((_s, _l, t) => vistoA.push(t));

    await ate(() => salas.length === 1, 'a sala do anfitrião abrir');
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-90: sala do anfitrião ausente');

    const b = nova(cfgEscolhendo(seed, 'B', salaA.roomId));
    const vistoB: Array<Record<Side, string | null>> = [];
    b.subscribe((_s, _l, t) => vistoB.push(t));

    await ate(() => salas.length === 2, 'a sala do convidado abrir');
    await ate(
      () => vistoA.at(-1)?.B !== undefined && vistoA.at(-1)?.B !== null,
      'a seleção do convidado chegar ao anfitrião',
    );
    await ate(
      () => vistoB.at(-1)?.A !== undefined && vistoB.at(-1)?.A !== null,
      'a seleção do anfitrião chegar ao convidado',
    );
    return { a, b, vistoA, vistoB };
  }

  it('portão: os dois aparelhos montam o MESMO confronto, cada um com a sua escolha', async () => {
    const { a, b, vistoA, vistoB } = await doisEscolhendo(77);

    // O confronto é o mesmo dos dois lados — e nenhum dos dois o recebeu pronto: o anfitrião
    // nunca soube o que o convidado ia escolher, e vice-versa.
    expect(vistoA.at(-1), 'o anfitrião não montou o confronto inteiro').toEqual({ A: BR, B: AR });
    expect(vistoB.at(-1), 'o convidado não montou o confronto inteiro').toEqual({ A: BR, B: AR });

    // E a disputa segue normal por cima disso: nada do `Pick` toca `MatchState`.
    cobrar(a, b, 'L', 'R');
    await respirar();
    expect(a.state().kicks.length).toBe(1);
    expect(b.state()).toEqual(a.state());
  });

  it('antes do anúncio o lado do peer é `null` — a tela espera, e não inventa seleção', async () => {
    const a = nova(cfgEscolhendo(3, 'A'));
    const visto: Array<{ link: LinkStatus; teams: Record<Side, string | null> }> = [];
    a.subscribe((_s, link, teams) => visto.push({ link, teams }));

    await ate(() => salas.length === 1, 'a sala abrir');
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-90: sala ausente');

    // Peer presente, anúncio ainda não: é o estado NOVO que `D-90` acrescentou aos quatro de
    // `LinkStatus` que a tela já alcançava.
    salaA.onPeerJoin?.('peer');
    await respirar();

    const conectado = visto.filter((v) => v.link === 'connected').at(-1);
    expect(conectado, 'M7 não foi notificado do `connected`').toBeDefined();
    expect(conectado?.teams, 'conectado com `Pick` pendente: o peer ainda é `null`').toEqual({
      A: BR,
      B: null,
    });
  });

  it('peer que conecta e NUNCA anuncia vira `failed` em 20 s — nunca tela travada', async () => {
    // O peer de versão anterior ao `Pick` no fio: conecta (e com isso apaga o relógio de M6,
    // limpo por `onPeerJoin`) e não declara nada. Sem o rearme de `D-90`, a tela do outro lado
    // ficaria em "escolhendo…" para sempre — a trava que o PLANO proibiu para M6.
    const a = nova(cfgEscolhendo(4, 'A'));
    const link: LinkStatus[] = [];
    a.subscribe((_s, l) => link.push(l));

    await ate(() => salas.length === 1, 'a sala abrir');
    salas[0]?.onPeerJoin?.('peer');
    await respirar();
    expect(link.at(-1), 'o peer entrou: o canal devia estar conectado').toBe('connected');

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS - 1);
    await respirar();
    expect(link.at(-1), 'desistiu ANTES do prazo — o valor é o de M6, sem constante nova').toBe(
      'connected',
    );

    await vi.advanceTimersByTimeAsync(1);
    await respirar();
    expect(link.at(-1), 'D-90: o silêncio do peer tem prazo').toBe('failed');
    expect(
      avisos.some((m) => m.includes('não declarou seleção')),
      'o desfecho devia dizer POR QUE',
    ).toBe(true);
    expect(a.state().winner, 'abandono não escreve vencedor (D-35)').toBeNull();
    expect(() => a.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('anúncio repetido é idempotente: o mesmo valor não notifica M7 de novo', async () => {
    const { vistoA } = await doisEscolhendo(5);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-90: sala do anfitrião ausente');
    const antes = vistoA.length;

    // É o rearme de `D-31`: a cada `'connected'` novo o peer reenvia o anúncio. O valor é o
    // mesmo, então não há nada a contar a M7 — repintar a tela por causa disso seria efeito
    // duplicado de escrita repetida.
    salaA.acao.onMessage?.({ side: 'B', team: AR }, null);
    salaA.acao.onMessage?.({ side: 'B', team: AR }, null);
    await respirar();

    expect(vistoA.length, 'o anúncio repetido notificou de novo').toBe(antes);
    expect(vistoA.at(-1)).toEqual({ A: BR, B: AR });
  });

  it('código fora do catálogo de M4 é descartado, e a espera continua (D-61)', async () => {
    const a = nova(cfgEscolhendo(6, 'A'));
    const visto: Array<Record<Side, string | null>> = [];
    a.subscribe((_s, _l, t) => visto.push(t));

    await ate(() => salas.length === 1, 'a sala abrir');
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-90: sala ausente');
    salaA.onPeerJoin?.('peer');
    await respirar();

    // M6 conferiu a FORMA e deixou passar (é texto); quem pergunta se o código existe é M5.
    salaA.acao.onMessage?.({ side: 'B', team: 'ZZ' }, null);
    await respirar();

    expect(
      avisos.some((m) => m.includes('não está no catálogo de M4') && m.includes('ZZ')),
      'o código inventado devia morrer em M5, em voz alta',
    ).toBe(true);
    expect(visto.at(-1)?.B, 'código inventado não pode virar seleção').toBeNull();

    // E o prazo NÃO foi desarmado por um anúncio que não valeu: a espera segue contando.
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    await respirar();
    expect(a.state().winner).toBeNull();
    expect(() => a.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('anúncio que chega depois do fim não pinta D-35 por cima de um resultado', async () => {
    // Mesma ordem de `aoMove`: a guarda de fase vem ANTES da de `D-81`.
    const { a, b } = await doisAparelhos(3);
    for (let i = 0; i < 10 && a.state().phase !== 'finished'; i += 1) {
      const vez = a.state().turn;
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

    salas[0]?.acao.onMessage?.({ side: 'A', team: BR }, null);
    await respirar();

    expect(a.state(), 'o anúncio atrasado mexeu numa disputa terminada').toEqual(final);
    expect(avisos.some((m) => m.includes('par espelhado (D-81)'))).toBe(false);
  });

  it('a configuração recusa `null` onde ele não é espera: cpu, local e o lado deste aparelho', () => {
    for (const mode of ['cpu', 'local'] as const) {
      expect(
        () =>
          createSession({
            mode,
            seed: 1,
            ...(mode === 'cpu' ? { level: 'easy' as const } : {}),
            teams: { A: BR, B: null },
            localSide: 'A',
          }),
        `${mode}: os dois lados são deste aparelho — null ali é lacuna, não espera`,
      ).toThrowError(/não pode ser null no modo/);
    }

    expect(
      () => createSession(cfgOnlineComNull(1, 'A')),
      'o lado local sem seleção não teria o que anunciar ao outro',
    ).toThrowError(/lado local não pode ser null/);

    // E o que `D-90` abriu continua aberto: `null` no lado do PEER, no `online`, passa.
    expect(() => nova(cfgEscolhendo(1, 'A'))).not.toThrow();
  });
});

/* ──── `D-81`: os dois no MESMO link — o par espelhado vira falha honesta (`QA-26`) ──── */

describe('D-81 — par espelhado: a jogada assinada com o NOSSO lado termina a disputa (QA-26)', () => {
  // Antes de `D-81` este cenário era a TRAVA PERMANENTE do achado: os dois aparelhos em `'B'`,
  // os dois assinando `side: 'B'`, e cada um descartando a jogada do outro na guarda de lado —
  // em silêncio. O canal seguia `'connected'`, o timer de 20 s já tinha sido limpo por
  // `onPeerJoin`, ninguém emitia `'failed'`, e as duas telas paravam em "Esperando o outro
  // jogador…" para sempre. `D-80` é inalcançável aqui: nenhuma jogada atravessa, então
  // `kicks.length` fica em 0 nos dois lados, e a pré-condição dele (`kicks.length > 0`) nunca
  // chega. É esse travamento que os testes abaixo proíbem.

  // O que MUDOU em `T-31` (`D-90`): o par espelhado passou a se denunciar no ANÚNCIO de seleção,
  // e não mais na 1ª jogada. Os dois aparelhos anunciam ao conectar, os dois assinam `side: 'B'`,
  // e o `Pick` chega antes de qualquer toque na tela. O desfecho é o mesmo de `D-81` — falha
  // honesta com saída, nos dois lados —, só que mais cedo: ninguém chega a cobrar. A guarda de
  // `aoMove` continua onde estava, e continua conferida pelos falseamentos abaixo.

  it('portão (1): o par espelhado morre no ANÚNCIO, antes da 1ª cobrança, sem relógio', async () => {
    // `parEspelhado` só conecta os dois — nenhum `choose`, nenhum `advanceTimers`. O desfecho
    // já tem de estar posto quando ele devolve.
    const { b1, link1 } = await parEspelhado(31);

    expect(link1.at(-1), 'D-90: `failed` devia sair no tique do anúncio espelhado').toBe('failed');
    expect(
      avisos.some((m) => m.includes('par espelhado (D-81)') && m.includes('"side":"B"')),
      'o descarte devia dizer POR QUE, e não "lado B não é o do peer"',
    ).toBe(true);
    expect(
      avisos.some((m) => m.includes('seleção remota descartada')),
      'quem denuncia agora é o anúncio, não a jogada',
    ).toBe(true);

    // `D-35` intacto: abandono não escreve vencedor, nada chega a M2, e nenhuma escolha é aceita.
    expect(b1.state().winner, 'abandono não pode escrever vencedor (D-35)').toBeNull();
    expect(b1.state().kicks.length, 'o anúncio espelhado não pode virar cobrança').toBe(0);
    expect(b1.state().phase).not.toBe('finished');
    expect(() => b1.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('portão (1): os DOIS saem da trava — o outro lado pelo relógio, em até 20 s', async () => {
    const { b2, link2 } = await parEspelhado(31);
    await respirar();

    // O `canal.close()` do lado que recebeu solta a sala; o `leave()` de M6 vira `onPeerLeave`
    // aqui, que emite `'waiting'` e rearma os 20 s — o mesmo caminho que `A-22` mediu e que
    // `A-24` confirmou em campo por `D-80`. É a assimetria declarada: quem recebe cai no tique,
    // quem enviou cai pelo relógio. O que NÃO existe mais é o "para sempre".
    expect(link2.at(-1), 'a saída do outro devia ter chegado como waiting').toBe('waiting');

    await vi.advanceTimersByTimeAsync(20_000);
    await respirar();

    expect(link2.at(-1), 'QA-26: o lado que sobrou ficaria preso para sempre').toBe('failed');
    expect(link2, 'ninguém pode passar por failed antes do relógio deste lado').toEqual([
      ...link2.slice(0, -1).filter((l) => l !== 'failed'),
      'failed',
    ]);
    expect(b2.state().winner, 'nem aqui o abandono escreve vencedor').toBeNull();
    expect(b2.state().kicks.length).toBe(0);
    expect(() => b2.choose('L')).toThrowError(/SEM RESULTADO/);
  });

  it('escrita repetida não duplica efeito: o segundo anúncio espelhado não move mais nada', async () => {
    const { b1, link1 } = await parEspelhado(31);
    await respirar();
    const depoisDoPrimeiro = [...link1];
    const sala1 = salas[0];
    if (sala1 === undefined) throw new Error('D-81: sala do primeiro aparelho ausente');

    // O aparelho espelhado insiste — é o rearme de `D-31` reenviando o anúncio a cada
    // `'connected'` novo. `abandonada` já barra na primeira linha de `aoMove`, então nada é
    // notificado de novo e nada regride. Vale para os DOIS tipos do fio.
    sala1.acao.onMessage?.({ side: 'B', team: AR }, null);
    sala1.acao.onMessage?.({ seq: 0, side: 'B', zone: 'C' }, null);
    await respirar();

    expect(link1, 'o segundo evento moveu o status de novo').toEqual(depoisDoPrimeiro);
    expect(b1.state().kicks.length).toBe(0);
    expect(b1.state().winner).toBeNull();
  });

  it('falseamento: `Move` legítimo (`side === remoteSide`) NÃO dispara a guarda', async () => {
    // O portão do falsificador, item 2: sob a mutação `===` → `!==` na guarda de `D-81` é ESTE
    // teste que reprova primeiro — o par são passaria a se matar na 1ª cobrança. Cinco cobranças
    // é o número escrito no portão de campo (`A-25`).
    const { a, b } = await doisAparelhos(77);

    for (let i = 0; i < 5; i += 1) {
      cobrar(a, b, 'L', 'R'); // chute num canto, defesa no outro: gol, e a disputa segue viva
      await respirar();
    }

    expect(a.state().kicks.length, 'o par são não completou as 5 cobranças').toBe(5);
    expect(b.state(), 'os dois aparelhos divergiram').toEqual(a.state());
    expect(
      avisos.filter((m) => m.includes('descartada')),
      'par são não pode ter UM descarte sequer, de lado nenhum',
    ).toEqual([]);
  });

  it('lado de terceiro tipo nem chega a M5: morre na forma, em M6, e não abandona nada', async () => {
    // A guarda de `D-81` é `=== localSide`, e não "≠ remoteSide". A diferença entre as duas só
    // apareceria num `side` de terceiro tipo — e este teste mede que ele **não chega a M5**:
    // `isMove`/`isPick` o derrubam antes, então a guarda repetida de M5 sobre um `side`
    // inexistente é inalcançável pelo fio. Fica declarado: essa borda é coberta em M6, não aqui.
    // O que fecha o alargamento da guarda é o teste do `Move` legítimo, acima.
    //
    // O par aqui é SÃO de propósito: desde `D-90` o par espelhado já morreu no anúncio, e um
    // aparelho abandonado descarta tudo na primeira linha de `aoMove` — mediria a guarda errada.
    const { a, linkA } = await doisAparelhos(31);
    const salaA = salas[0];
    if (salaA === undefined) throw new Error('D-81: sala do anfitrião ausente');

    salaA.acao.onMessage?.({ seq: 0, side: 'C', zone: 'L' }, null);
    salaA.acao.onMessage?.({ side: 'C', team: BR }, null);

    expect(
      avisos.filter((m) => m.includes('payload descartado, não é Move nem Pick')),
      'o lado inexistente devia ter morrido na forma, em M6 — nos DOIS tipos do fio',
    ).toHaveLength(2);
    expect(linkA, 'lado inexistente não pode terminar a disputa').not.toContain('failed');
    expect(avisos.some((m) => m.includes('par espelhado (D-81)'))).toBe(false);
    expect(a.state().kicks.length).toBe(0);
  });

  it('a guarda de `D-81` não rouba o evento da guarda de fase: disputa terminada não abandona', async () => {
    // Ordem importa: `phase === 'finished'` vem ANTES de `D-81`. Se a guarda subisse, uma jogada
    // espelhada chegando depois do fim pintaria `D-35` por cima de um resultado legítimo — o
    // placar mentiroso ao contrário.
    const { a, b } = await doisAparelhos(3);
    for (let i = 0; i < 10 && a.state().phase !== 'finished'; i += 1) {
      const vez = a.state().turn;
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
    sala?.acao.onMessage?.({ seq: final.kicks.length, side: 'A', zone: 'L' }, null);

    expect(a.state(), 'o evento espelhado mexeu no MatchState de uma disputa terminada').toEqual(
      final,
    );
    expect(avisos.some((m) => m.includes('par espelhado (D-81)'))).toBe(false);
    expect(avisos.some((m) => m.includes('a disputa já terminou'))).toBe(true);
  });
});
