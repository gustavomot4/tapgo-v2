/**
 * M5 — Sessão de disputa: o único caminho da tela até o motor.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M5 — Sessão de disputa".
 *
 * Esta camada **não tem regra de disputa**. Ela recebe uma escolha de zona por vez, providencia
 * a outra zona (CPU em `cpu`, o segundo jogador no mesmo aparelho em `local`, o peer em
 * `online`), chama M2 e notifica os assinantes. Placar, fase, vez e vencedor são de M2 — se um
 * dia aparecer uma soma aqui, é defeito, não otimização.
 *
 * Reexporta os três tipos de fora que a própria assinatura usa (`MatchState`, `LinkStatus`,
 * `Level`): é o que deixa M7 tipar sem importar `src/engine`, `src/cpu` ou `src/net`, que é o
 * que "motor isolado do render" (`D-01`) significa em `grep`.
 *
 * **Modo `online` (`T-13`)** — a outra zona vem do peer pelo canal de M6. Duas coisas que este
 * módulo faz e que nenhum outro faria por ele:
 *
 * 1. **Descartar evento remoto ilegal ANTES de M2.** M6 confere a *forma* do `Move` (`D-32`);
 *    quem confere se ele é *legal agora* — lado certo, `seq` da cobrança corrente, sem repetição
 *    — é esta camada, contra o `MatchState` de M2. Nada descartado chega ao motor.
 * 2. **Traduzir a queda do peer no resultado que `Q-04` definiu** (`D-35`): a disputa morre
 *    **sem vencedor**. M5 não escreve vencedor nenhum — `winner` é de M2, e "quem fica vence"
 *    seria regra de disputa escrita na borda.
 *
 * **Quem cobra primeiro (`T-17` / `D-48`)** — esta camada sorteia, com o `Rng` semeado de M1, e
 * passa o resultado a `createMatch(first)`. M2 não sorteia (ficaria impura) e M7 não sorteia (a
 * tela não é fonte de acaso). Vale nos três modos: em `cpu` e `local` a semente é `cfg.seed`; no
 * `online` é o `roomId` (`D-98`) — ver a justificativa na declaração de `first`.
 *
 * **Como o anfitrião publica o `roomId` (`Q-11`, respondida por `D-73`):** ele não sai daqui —
 * ele ENTRA. M7 sorteia com `newRoomId`, reexportado logo abaixo, monta o link e passa o ID em
 * `cfg.roomId` nos dois aparelhos. A porta congelada de `D-13` segue com quatro métodos, e o
 * quinto que devolveria o ID não foi comprado. `D-98` pega carona nisso: o ID que os DOIS
 * aparelhos já têm em comum vira a semente do sorteio do `online` — sem byte novo no fio, sem
 * método novo na porta e sem tocar `SessionConfig`.
 */

import type { CountryCode, Rng, Side, Zone } from '../core/index';
import { createRng } from '../core/index';
import { createMatch, play } from '../engine/index';
import type { MatchState } from '../engine/index';
import { createCpu } from '../cpu/index';
import type { Cpu, Level, Role } from '../cpu/index';
import { CONNECT_TIMEOUT_MS, hostRoom, joinRoom } from '../net/index';
import type { Channel, LinkStatus, Move, Payload, Pick } from '../net/index';
import { findTeam } from '../data/teams';

// ── Os três reexports que o portão de M5 exige ────────────────────────────────────────────
// A regra é "todo tipo que aparece na assinatura de M5 sai por M5". Esquecer um deles torna o
// portão de camada de M7 impossível de cumprir justamente para o tipo esquecido.
export type { MatchState } from '../engine/index';
export type { LinkStatus } from '../net/index';
export type { Level } from '../cpu/index';

// ── `D-73`: o sorteio do ID de sala sai por M5 (`Q-11` respondida) ─────────────────────────
// M7 precisa do ID **antes** de existir canal — é ele que vira o link do convite, e é o toque
// da pessoa que decide quando a sessão nasce (`D-75`). A porta `Session` continua com os quatro
// métodos de `D-13`: nada aqui devolve o ID depois; ele é sorteado antes e entra por `roomId`.
// Valor, não tipo: `newRoomId` é função, e a tela a chama sem importar `src/net` (portão de M7).
//
// `T-22` põe o prazo na mesma carona, e pela mesma razão: M7 precisa dizer na tela quantos
// segundos faltam antes de M6 desistir do peer, e a alternativa era M7 repetir o `20_000` de
// `src/net/index.ts` como constante local — a cópia que passa a mentir sozinha no dia em que
// alguém revir `D-75`. Reexportar não abre porta nova: `Session` segue com os quatro métodos de
// `D-13`, e o valor é o mesmo que M6 arma no timer, não uma segunda fonte.
export { newRoomId, CONNECT_TIMEOUT_MS } from '../net/index';

export type Mode = 'cpu' | 'local' | 'online';

export interface SessionConfig {
  mode: Mode;
  seed: number;
  level?: Level;
  /**
   * As duas seleções. `null` é **estado de espera**, não valor ausente por descuido (`D-90`).
   *
   * Em `cpu` e `local` os dois lados são deste aparelho e `null` é recusado na criação. Em
   * `online` só o lado do peer pode nascer `null`: a escolha dele nasce depois do link e chega
   * pelo `Pick` do fio. O lado de `localSide` nunca pode ser `null` em modo nenhum — quem
   * escolhe aqui é esta tela, e não haveria o que anunciar ao outro.
   */
  teams: Record<Side, CountryCode | null>;
  localSide: Side;
  roomId?: string;
}

export interface Session {
  state(): MatchState;
  /** A escolha DESTE aparelho. Mesma assinatura nos três modos — ver `D-25`. */
  choose(zone: Zone): void;
  /**
   * O estado da disputa e o do **vínculo** com o outro aparelho.
   *
   * `D-80`: neste vínculo, `LinkStatus` diz o estado da **disputa**, não o do transporte. M5
   * sintetiza `'failed'` quando a disputa acaba sem resultado mesmo com o canal de pé — é o
   * caso da sessão zerada que reentra no mesmo `roomId` dentro dos 20 s (`QA-25`). Quem ler
   * `'failed'` aqui como "o transporte de M6 desistiu" erra: leia como "não há mais disputa".
   *
   * `D-90` (`T-31`): o 3º argumento é a **única** forma de M7 saber a seleção do OUTRO aparelho
   * sem um 5º método na porta. `null` em `teams[remoteSide]` é o estado de espera — enquanto ele
   * estiver ali, o peer conectou mas ainda não anunciou o que escolheu, e a tela mostra
   * "escolhendo…" no lugar da marca em vez de inventar uma seleção. Nos modos `cpu` e `local`
   * os dois vêm preenchidos desde a criação e nunca mudam.
   */
  subscribe(
    fn: (
      s: MatchState,
      link: LinkStatus,
      teams: Record<Side, CountryCode | null>,
    ) => void,
  ): () => void;
  dispose(): void;
}

const ZONES: readonly Zone[] = ['L', 'C', 'R'];
const SIDES: readonly Side[] = ['A', 'B'];
const MODES: readonly Mode[] = ['cpu', 'local', 'online'];

function isZone(value: unknown): value is Zone {
  return (ZONES as readonly unknown[]).includes(value);
}

/**
 * A semente compartilhada do `online` (`D-98`): o `roomId` virado inteiro de 32 bits.
 *
 * Os dois aparelhos precisam tirar o MESMO primeiro cobrador, e `cfg.seed` não serve para isso —
 * é um por aparelho, sorteado localmente. O único valor que os dois já têm em comum é o ID da
 * sala, que desde `D-73` chega em `cfg.roomId` nos dois. Derivá-lo aqui não custa byte no fio
 * nem método na porta congelada de `D-13`: é função pura sobre um dado que já existe.
 *
 * O algoritmo é FNV-1a de 32 bits, escrito à mão pela razão de M1 (biblioteca a mais é peso no
 * bundle). Ele não precisa ser criptográfico — quem precisa disso é `newRoomId`, e é ele que
 * sorteia o ID com `crypto`. Aqui só se pede que IDs vizinhos caiam em sementes espalhadas, e
 * o `>>> 0` no fim garante inteiro seguro para `createRng`, que recusa qualquer outra coisa.
 */
function seedFromRoomId(roomId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < roomId.length; i += 1) {
    hash ^= roomId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Recusa configuração torta ANTES de existir sessão.
 *
 * Falhar na criação é mais barato que falhar na terceira cobrança: aqui o dono vê a linha
 * errada de M7; lá, veria um placar estranho. Nada aqui ganha valor padrão — `level` ausente
 * no modo `cpu` é lacuna, e lacuna não se preenche com `'medium'` por conveniência.
 */
function assertConfig(cfg: SessionConfig): void {
  const erro = (motivo: string): never => {
    throw new TypeError(`createSession: ${motivo}`);
  };

  if (cfg === null || typeof cfg !== 'object') erro('configuração ausente');
  if (!MODES.includes(cfg.mode)) erro(`modo inválido; recebido ${String(cfg.mode)}`);
  if (!SIDES.includes(cfg.localSide)) {
    erro(`localSide inválido; recebido ${String(cfg.localSide)}`);
  }

  // A semente é conferida por M1 em `createRng`, mas só depois. Aqui a mensagem sabe que o
  // assunto é uma sessão, e é isso que o dono lê no console.
  if (!Number.isSafeInteger(cfg.seed)) {
    erro(`seed deve ser inteiro seguro; recebido ${String(cfg.seed)}`);
  }

  if (cfg.teams === null || typeof cfg.teams !== 'object') erro('teams ausente');
  for (const side of SIDES) {
    const code = cfg.teams[side];
    // ── `D-90`: `null` é o estado de espera do `Pick`, e ele tem endereço ────────────────
    // Só o lado do PEER, e só no `online`, pode nascer sem seleção: é a escolha que ainda vai
    // chegar pelo fio. Em `cpu` e `local` os dois lados são deste aparelho — `null` ali é
    // lacuna de quem chamou, não espera, e vira tela sem marca que nunca preenche. E o lado
    // de `localSide` nunca pode ser `null`: sem ele não há o que anunciar ao outro aparelho.
    if (code === null) {
      if (cfg.mode !== 'online') {
        erro(`seleção do lado ${side} não pode ser null no modo ${cfg.mode} — os dois lados são deste aparelho`);
      }
      if (side === cfg.localSide) {
        erro('a seleção do lado local não pode ser null — é a escolha DESTE aparelho, e é ela que viaja no Pick (D-90)');
      }
      continue;
    }
    // M4 é a fonte do catálogo; M5 não conhece país nenhum por conta própria. Duas seleções
    // IGUAIS passam de propósito: se isso é permitido ou não é regra de disputa, e regra de
    // disputa não é desta camada — não há linha em `regras_partida.md` proibindo.
    if (findTeam(code) === undefined) {
      erro(`seleção ${String(code)} (lado ${side}) não está no catálogo de M4`);
    }
  }

  if (cfg.mode === 'cpu' && cfg.level === undefined) {
    erro('modo cpu exige level — sem ele não há nível a aplicar, e inventar um seria dado falso');
  }
  if (cfg.mode !== 'cpu' && cfg.level !== undefined) {
    erro(`level só existe no modo cpu; recebido no modo ${cfg.mode}`);
  }
  if (cfg.mode !== 'online' && cfg.roomId !== undefined) {
    erro(`roomId só existe no modo online; recebido no modo ${cfg.mode}`);
  }
}

/**
 * Cria a sessão.
 *
 * @throws TypeError se a configuração não fecha (ver `assertConfig`), ou se `roomId` não tem a
 *   forma que M6 exige — quem recusa é `joinRoom`, e a mensagem dele é melhor que uma cópia.
 */
export function createSession(cfg: SessionConfig): Session {
  assertConfig(cfg);

  const mode = cfg.mode;
  const localSide = cfg.localSide;

  /**
   * O lado do peer. Existe para o modo `online` conferir o `side` da jogada que chega: peer que
   * manda jogada assinada com o NOSSO lado é cliente modificado ou versão trocada, e isso morre
   * aqui. Não é anti-trapaça — [[online_p2p]] declara que P2P sem árbitro não tem como ser —,
   * é a diferença entre descartar um evento incoerente e deixá-lo virar cobrança.
   */
  const remoteSide: Side = localSide === 'A' ? 'B' : 'A';

  // O gerador da sessão, semeado por `cfg.seed`. Nasce nos três modos: em `cpu` e `local` ele
  // sorteia quem cobra primeiro (`D-48`, abaixo) e em `cpu` ainda alimenta a CPU; em `online`
  // nasce sem ser lido — lá o sorteio corre num gerador próprio, semeado pelo `roomId` (`D-98`),
  // e é isso que mantém a mesma configuração produzindo a mesma validação nos três modos.
  const rng = createRng(cfg.seed);

  /**
   * Quem cobra primeiro (`D-48` / `T-17`) — sorteio, não mais a constante `'A'` de M2.
   *
   * Quatro coisas que estas linhas decidem e que valem estar escritas:
   *
   * 1. **O gerador é o `Rng` de M1, nunca o nativo do JS** — nos dois ramos. O nativo aqui
   *    derrubaria de uma vez o portão de M1 (uma única chamada nativa em todo o `src/`, conferida
   *    por teste que varre os arquivos) e o aceite "roda 2x com o mesmo resultado": a mesma
   *    semente passaria a produzir disputas diferentes. Note que o nome da função nativa não está
   *    escrito em lugar nenhum deste arquivo de propósito — a varredura conta ocorrências no
   *    texto, comentário incluído.
   * 2. **Em `cpu` e `local` é a PRIMEIRA leitura do gerador da sessão**, antes de qualquer `pick`
   *    da CPU. Por isso os dois tiram o MESMO primeiro cobrador para a mesma semente, que é o que
   *    deixa o teste de equivalência entre modos continuar comparando disputas comparáveis. Mover
   *    esta leitura para depois do primeiro `pick` quebraria a equivalência sem quebrar tipo.
   * 3. **No `online` a semente é o `roomId`** (`D-98`), num gerador próprio: é o único valor que
   *    os dois aparelhos comprovadamente compartilham, e o sorteio precisa dar o MESMO lado nos
   *    dois — sementes independentes fariam cada um começar com um cobrador e divergir já na
   *    primeira cobrança, que é trocar um lado fixo por uma disputa quebrada. O gerador da sessão
   *    segue sem ser lido no `online`, de propósito: se ele entrasse aqui, `cfg.seed` (um por
   *    aparelho) voltaria a decidir o resultado.
   * 4. **`online` sem `roomId` continua em `'A'`, e isso é lacuna declarada, não esquecimento.**
   *    É o ramo que `D-73` deixou de pé sem virar contrato: nele M6 sorteia um ID que a porta
   *    congelada não devolve, então ninguém consegue convidar ninguém para essa sala — sem peer,
   *    não há segundo aparelho de quem divergir. Inventar uma semente a partir de `cfg.seed`
   *    aqui seria o "ausente virou zero" que o kit proíbe. M7 sempre passa `roomId` (`D-73`).
   */
  const primeiroDe = (gerador: Rng): Side => (gerador.int(2) === 0 ? 'A' : 'B');

  const first: Side =
    mode !== 'online'
      ? primeiroDe(rng)
      : cfg.roomId === undefined
        ? 'A'
        : primeiroDe(createRng(seedFromRoomId(cfg.roomId)));

  const cpu: Cpu | null =
    mode === 'cpu' && cfg.level !== undefined ? createCpu(cfg.level, rng) : null;

  let match: MatchState = createMatch(first);

  /**
   * As duas seleções do confronto (`D-90` / `T-31`).
   *
   * Cópia da configuração, e mutável de propósito: no `online` o lado do peer pode nascer `null`
   * e só ganha valor quando o `Pick` dele atravessa o fio. Fora do `online` nasce completa e
   * nunca muda — nenhum dos dois lados vem de fora.
   */
  const teams: Record<Side, CountryCode | null> = { A: cfg.teams.A, B: cfg.teams.B };

  /**
   * O que sai no 3º argumento de `subscribe`: uma CÓPIA, nunca o objeto vivo.
   *
   * Entregar o objeto interno faria um assinante de M7 poder reescrever a seleção do confronto
   * a partir da tela — o caminho mais barato para dois aparelhos mostrarem marcas diferentes.
   */
  const selecoes = (): Record<Side, CountryCode | null> => ({ A: teams.A, B: teams.B });

  // Sem canal, o status é `'idle'` nos dois modos, e vira `'closed'` no `dispose()`. Não é
  // enfeite: M7 lê o mesmo campo nos três modos e não ganha um `if (mode === 'online')`.
  let link: LinkStatus = 'idle';

  /** A escolha do chute esperando a defesa da MESMA cobrança. Estado desta camada, não de M2. */
  let pending: Zone | null = null;

  /**
   * A zona do peer para a cobrança corrente, quando ela chegou antes da nossa (modo `online`).
   *
   * Separada de `pending` de propósito: no modo `local` as duas escolhas entram pela mesma porta
   * e a ordem é a da tela; no `online` elas vêm de fontes diferentes e podem chegar em qualquer
   * ordem. Uma variável só obrigaria a adivinhar de quem é a zona guardada.
   */
  let pendenteRemoto: Zone | null = null;

  /** O canal de M6. `null` fora do modo `online` — não há canal a fechar em `cpu` e `local`. */
  let canal: Channel | null = null;

  /**
   * `Q-04` respondida (`D-35`): o peer sumiu e a disputa **terminou sem resultado**.
   *
   * Note o que esta variável NÃO faz: ela não escreve vencedor, não fecha `phase` e não toca no
   * `MatchState`. O `winner` continua `null` porque nenhuma cobrança o produziu — declarar aqui
   * um vencedor por abandono seria regra de disputa nascendo na borda, e regra de disputa é de
   * M2. O que ela faz é parar de aceitar escolha: a disputa não continua, e também não termina.
   */
  let abandonada = false;

  let disposed = false;

  const subscribers = new Set<
    (s: MatchState, l: LinkStatus, t: Record<Side, CountryCode | null>) => void
  >();

  /**
   * Notifica todo mundo, mesmo que alguém exploda.
   *
   * Assinante que lança é defeito de M7, e engoli-lo seria `catch` mentiroso. Mas deixá-lo
   * interromper o laço deixaria os outros assinantes com estado velho enquanto M5 já andou —
   * dois pedaços de tela discordando do placar. Então: todos são chamados, e a primeira falha
   * sobe depois, inteira.
   */
  function notify(): void {
    let primeiraFalha: unknown = null;
    let falhas = 0;

    // Cópia: assinante que se desinscreve (ou inscreve) durante a notificação não muda o
    // conjunto que está sendo percorrido.
    const t = selecoes();
    for (const fn of [...subscribers]) {
      try {
        fn(match, link, t);
      } catch (e) {
        falhas += 1;
        if (falhas === 1) primeiraFalha = e;
      }
    }

    if (falhas > 0) throw primeiraFalha;
  }

  /**
   * Aplica a cobrança completa em M2 e guarda o estado novo.
   *
   * É a única linha do módulo que chama o motor — de propósito: um segundo caminho até `play`
   * é como uma regra vira duas.
   */
  function resolver(shot: Zone, dive: Zone): void {
    match = play(match, shot, dive);
    pending = null;
  }

  /** O papel do humano deste aparelho NESTA cobrança. Quem cobra é `match.turn` (M2). */
  function papelLocal(): Role {
    return match.turn === localSide ? 'shooter' : 'keeper';
  }

  /* ─────────────────────────── modo `online` (T-13) ─────────────────────────── */

  /**
   * Notificação disparada por evento de **rede**, e não por `choose()`.
   *
   * Aqui a falha de um assinante é logada e morre; em `choose()` ela sobe. A assimetria é
   * deliberada e tem uma causa concreta: esta função roda **dentro da pilha de M6** — no meio do
   * laço de handlers de status ou do `onMessage` da sinalização. Deixar a exceção subir dali
   * interromperia o laço de M6 e deixaria a máquina de estados do transporte pela metade: um
   * assinante quebrado da tela passaria a corromper o canal. Já em `choose()` existe um chamador
   * de verdade (M7) para receber a exceção, e por isso lá ela sobe inteira.
   *
   * Não é `catch` silencioso: o erro vai ao console com origem e contexto. O que não existe é
   * fallback — nada aqui inventa estado para "recuperar".
   */
  function notificarDaRede(origem: string): void {
    try {
      notify();
    } catch (e: unknown) {
      console.error(`[M5 ${origem}] assinante de M7 lançou durante notificação de rede:`, e);
    }
  }

  /**
   * Fecha a cobrança quando as DUAS zonas estão na mão.
   *
   * É aqui que os três modos convergem: `match.turn` é de M2 e vale igual nos dois aparelhos,
   * então os dois montam o mesmo par `(shot, dive)` e chamam o mesmo `play` com os mesmos
   * argumentos. O `MatchState` coincide **porque a regra é a mesma**, não porque a rede
   * combinou um resultado — nenhum placar trafega no canal, só zona e `seq`.
   */
  function resolverOnline(): void {
    if (pending === null || pendenteRemoto === null) return;
    const minha = pending;
    const dela = pendenteRemoto;
    pendenteRemoto = null;
    if (match.turn === localSide) resolver(minha, dela);
    else resolver(dela, minha);
  }

  /**
   * O relógio da espera do `Pick` do peer (`D-90`).
   *
   * É o MESMO prazo de M6 (`CONNECT_TIMEOUT_MS`, 20 s), importado e não copiado: `D-76` proíbe a
   * constante nova, e uma cópia é a que passa a mentir sozinha no dia em que o número mudar. O
   * que ele cobre é o buraco que só existe depois de `D-90`: peer que conecta — e portanto some
   * o relógio de M6, limpo por `onPeerJoin` — e nunca declara seleção, por ser de uma versão
   * anterior ao `Pick` no fio. Sem isto, a tela do outro lado ficaria em "escolhendo…" para
   * sempre, que é exatamente o que o PLANO proibiu para M6.
   */
  let esperaDoPick: ReturnType<typeof setTimeout> | null = null;

  function limparEsperaDoPick(): void {
    if (esperaDoPick !== null) {
      clearTimeout(esperaDoPick);
      esperaDoPick = null;
    }
  }

  /** Rearma o prazo — e não arma nada se a seleção do peer já está na mão. */
  function armarEsperaDoPick(): void {
    limparEsperaDoPick();
    if (teams[remoteSide] !== null) return;
    esperaDoPick = setTimeout(() => {
      esperaDoPick = null;
      if (disposed || abandonada || teams[remoteSide] !== null) return;
      console.warn(
        `[M5] o peer conectou e não declarou seleção em ${CONNECT_TIMEOUT_MS} ms — ` +
          'provável versão anterior ao Pick no fio (D-90).',
      );
      abandonarSemResultado('sem-pick');
    }, CONNECT_TIMEOUT_MS);
  }

  /**
   * Anuncia ao outro aparelho a seleção DESTE (`D-90`).
   *
   * Sem ordem, sem resposta e sem aperto de mão: os dois mandam ao entrar em `'connected'`, cada
   * um declarando só o **próprio** `side`, então não há conflito a resolver. Reenviar a cada
   * `'connected'` novo (o rearme de `D-31`) é idempotente — o valor é o mesmo.
   */
  function anunciarSelecao(): void {
    const minha = teams[localSide];
    // `assertConfig` já recusou `null` no lado local; a guarda é a que sobra para o defeito
    // interno, e calar seria inventar um anúncio que não existe.
    if (minha === null || canal === null) return;
    canal.send({ side: localSide, team: minha });
  }

  /** Status do canal chegando de M6. Só traduz — não reconecta, não repete, não desiste sozinho. */
  function aoStatus(s: LinkStatus): void {
    if (disposed) return;

    // `'failed'` é terminal para M5, venha de M6 ou sintetizado por `D-80`. Sem esta linha o
    // `'closed'` que o próprio `canal.close()` de `D-80` dispara chegaria logo em seguida e
    // apagaria a única informação que M7 pinta — a mensagem de `D-35`. O `'closed'` do
    // `dispose()` não passa por aqui: a porta o escreve direto, com `disposed` já ligado.
    if (link === 'failed') return;

    link = s;

    // Fora de `'connected'` quem cobra o prazo é M6, com o próprio relógio: dois relógios
    // contando o mesmo silêncio produziriam dois desfechos para um evento só.
    if (s !== 'connected') limparEsperaDoPick();

    if (s === 'failed') {
      // `'failed'` é terminal em M6 (`D-31`): a sala já foi solta e nada reconecta. Para M5 isso
      // é a resposta de `Q-04` — sem resultado. Solta as escolhas represadas: elas pertenciam a
      // uma cobrança que nunca vai fechar, e guardá-las só as faria vazar para uma sessão futura.
      abandonada = true;
      pending = null;
      pendenteRemoto = null;
    }

    notificarDaRede('status');

    // ── `D-90`: o anúncio vem DEPOIS de M7 saber que conectou ───────────────────────────────
    // A ordem não é estética. O anúncio sai pelo canal, e a resposta do outro aparelho pode
    // voltar dentro desta mesma pilha (é o que o par espelhado faz: o `Pick` que chega derruba
    // a disputa no tique). Anunciando antes de notificar, o `'connected'` que M7 precisa pintar
    // era sobrescrito pelo `'waiting'`/`'failed'` da resposta e nunca chegava à tela.
    if (s === 'connected' && !disposed) {
      anunciarSelecao();
      // Relido depois do anúncio de propósito: a resposta do peer pode ter mudado tudo acima.
      if (link === 'connected' && !abandonada && !disposed) armarEsperaDoPick();
    }
  }

  /**
   * O desfecho único de `D-80` (`QA-25`) e `D-81` (`QA-26`): a disputa termina SEM RESULTADO no
   * tique do evento que a denunciou — sem esperar relógio nenhum.
   *
   * M5 **sintetiza** `'failed'` no `link`, que é o status que M7 já traduz na mensagem de `D-35`
   * (`src/ui/tela_cobranca.ts:395`), e fecha o canal. Fechar não é enfeite: é o que tira o OUTRO
   * lado da tela travada. O `leave()` de M6 vira `onPeerLeave` lá, que emite `'waiting'` e rearma
   * os 20 s — o mesmo caminho que `A-22` mediu em campo, e que termina em `'failed'` também lá.
   * Logo o lado que RECEBEU o evento cai em `D-35` no tique; o outro, pelo relógio, em até 20 s —
   * a assimetria que `A-24` mediu e aceitou, e que nenhuma mudança só em M5 encurta.
   *
   * Nada aqui toca `MatchState`: `winner` continua `null` pelo motivo de `abandonada`.
   */
  function abandonarSemResultado(origem: string): void {
    abandonada = true;
    limparEsperaDoPick();
    pending = null;
    pendenteRemoto = null;
    link = 'failed';
    canal?.close();
    notificarDaRede(origem);
  }

  /**
   * A seleção que o peer escolheu (`D-90` / `T-31`).
   *
   * Três coisas que esta função faz, e uma que ela não faz.
   *
   * Faz: recusa o par espelhado (`D-81` valendo igual para o `Pick` — os dois aparelhos entraram
   * pelo MESMO lado, e aqui isso aparece no ANÚNCIO, antes de qualquer cobrança); recusa código
   * que não está no catálogo de M4 (`D-61` — M6 conferiu só a forma, `D-32`); e desarma o
   * relógio da espera assim que a seleção chega.
   *
   * Não faz: regra de disputa. Duas seleções iguais passam, pelo mesmo motivo de `assertConfig`
   * — se isso é permitido ou não é regra, e regra não é desta camada.
   *
   * O anúncio repetido (o rearme de `D-31` reenvia a cada `'connected'`) é idempotente **e
   * silencioso**: valor igual ao que já está na mão não notifica ninguém de novo.
   */
  function aoPick(p: Pick): void {
    const descartar = (motivo: string): void => {
      console.warn(`[M5] seleção remota descartada — ${motivo}: ${JSON.stringify(p)}`);
    };

    // Mesma ordem de `aoMove`, e pelo mesmo motivo: a guarda de fase vem ANTES da de `D-81`,
    // para um anúncio atrasado não pintar `D-35` por cima de um resultado legítimo.
    if (match.phase === 'finished') return descartar('a disputa já terminou');

    // ── `D-81` no anúncio: par espelhado, denunciado antes da 1ª cobrança ───────────────────
    // Os dois aparelhos no mesmo link nascem em `'B'` (`src/ui/main.ts:162`), os dois anunciam
    // `side: 'B'`, e sem esta guarda os dois descartariam o anúncio do outro em silêncio: canal
    // `'connected'`, relógio de M6 já limpo por `onPeerJoin`, ninguém emitindo `'failed'`. É a
    // MESMA trava de `QA-26`, só que agora ela aparece no anúncio — mais cedo que a jogada.
    if (p.side === localSide) {
      descartar(`lado ${p.side} é o NOSSO — par espelhado (D-81)`);
      return abandonarSemResultado('espelho');
    }
    if (p.side !== remoteSide) return descartar(`lado ${String(p.side)} não é o do peer`);
    // M6 conferiu que é texto; quem pergunta se o código existe é M5, contra M4 (`D-61`). Sem
    // isto, um código inventado viraria bandeira ausente na tela do outro lado.
    if (findTeam(p.team) === undefined) {
      return descartar(`seleção ${String(p.team)} não está no catálogo de M4`);
    }

    limparEsperaDoPick();
    if (teams[remoteSide] === p.team) return; // reenvio: mesmo valor, nada a notificar
    teams[remoteSide] = p.team;
    notificarDaRede('pick');
  }

  /**
   * Jogada do peer.
   *
   * Cada guarda abaixo é um evento que **não pode chegar a M2**, e cada uma existe por um caso
   * real: `side` errado é cliente modificado; `seq` menor é reenvio da fila de M6 (que é seguro
   * de repetir justamente porque morre aqui); `seq` maior é jogada de uma cobrança que ainda não
   * começou; segunda jogada na mesma cobrança é duplicata. Descartar é logar e sair — nunca
   * corrigir, nunca "aproveitar o que dá".
   *
   * As exceções são `D-80` (`seq=0` com cobrança já fechada) e `D-81` (`side` igual ao NOSSO):
   * também descartados, mas NÃO só isso — são os dois casos em que descartar em silêncio trava
   * as duas telas para sempre. Nunca disputam o mesmo evento: `D-80` exige cobrança fechada e no
   * par espelhado de `D-81` nenhuma jogada atravessa, então `kicks.length` fica em 0 nos dois.
   */
  function aoMove(p: Payload): void {
    if (disposed || abandonada) return;

    // ── `D-90`: o fio carrega DOIS tipos, e a discriminação é esta linha ────────────────────
    // `Move` tem `zone`; `Pick` não tem. M6 carrega sem interpretar (ele nem sabe o que é
    // seleção), então quem separa é esta camada — e separa aqui, na entrada, para que nenhuma
    // guarda de cobrança abaixo receba um payload que não é de cobrança nenhuma.
    if (!('zone' in p)) return aoPick(p);
    const m: Move = p;

    const descartar = (motivo: string): void => {
      console.warn(`[M5] jogada remota descartada — ${motivo}: ${JSON.stringify(m)}`);
    };

    // Lado que não é nem o do peer nem o nosso (versão trocada, payload torto): morre em
    // silêncio, como sempre. O `=== localSide` NÃO morre aqui — ele é o par espelhado de `D-81`,
    // diagnosticado logo abaixo, depois das guardas de forma e de fase.
    if (m.side !== remoteSide && m.side !== localSide) {
      return descartar(`lado ${String(m.side)} não é o do peer`);
    }
    // M6 já conferiu a forma (`D-32`). M5 confere de novo porque o portão é literal: zona
    // inválida morre em M5. Guarda repetida na fronteira é barata; a que falta, não.
    if (!isZone(m.zone)) return descartar(`zona inválida ${String(m.zone)}`);
    if (match.phase === 'finished') return descartar('a disputa já terminou');
    // ── `D-81` (`QA-26`): par espelhado — os dois aparelhos entraram pelo MESMO lado ─────────
    // `abertura()` dá `ladoLocal: 'B'` a TODO endereço com `?sala=` (`src/ui/main.ts:162`), então
    // dois aparelhos no mesmo link nascem os dois em `B`, os dois assinam `side: 'B'`, e a guarda
    // de lado acima descartava tudo em silêncio: canal `'connected'`, o timer de 20 s já limpo
    // por `onPeerJoin`, ninguém emitindo `'failed'` — as duas telas presas em "Esperando o outro
    // jogador…" para sempre. `D-80` é provadamente inalcançável aqui (`kicks.length` fica em 0
    // nos dois lados), e por isso os dois discriminadores nunca disputam o mesmo evento.
    //
    // O discriminador é de graça e impossível num par são: `aoMove` só é ligado no modo `online`
    // (abaixo — em `cpu` e `local` não existe canal), e no `online` cada aparelho assina a jogada
    // com o PRÓPRIO lado. Receber o nosso lado significa, sem ambiguidade, "o outro aparelho acha
    // que é o meu lado". Cliente modificado mentiria em qualquer discriminador — o argumento de
    // `D-79` —, e não é o que esta guarda existe para pegar.
    //
    // O que ela NÃO faz, e fica declarado: não faz a disputa acontecer. Troca *trava permanente*
    // por *falha honesta com saída*, que é a invariante escrita em `a_context/online_p2p.md`.
    // Fazer os dois jogarem exigiria negociar o lado no transporte — a porta reprovada por falta
    // de dado em `e_qa/qa26_lado_do_convite.md`, que reabriria `D-13` e `D-77`.
    if (m.side === localSide) {
      descartar(`lado ${m.side} é o NOSSO — par espelhado (D-81)`);
      return abandonarSemResultado('espelho');
    }
    // ── `D-80` (`QA-25`): sessão zerada vestindo o mesmo `roomId` ───────────────────────────
    // `seq=0` depois de uma cobrança fechada **não** é o reenvio da fila de M6: `escoarFila`
    // consome com `shift` e só anda para a frente, então "peer com `kicks.length>0`" e "`seq=0`
    // ainda por escoar" são estados mutuamente exclusivos — medido em 2026-08-20, com os 4
    // testes de falsificação reprovando sob mutação (`e_qa/qa25_reentrada_na_janela.md`). Sobra
    // uma fonte só: navegador fechado e reaberto no mesmo link dentro dos 20 s em que
    // `onPeerJoin` (`net/index.ts:379`) aceita o peer de volta.
    //
    // Sem esta guarda o `seq=0` cairia no "fora de ordem" logo abaixo: os dois lados descartam
    // tudo do outro, o canal segue `'connected'`, o timer já foi limpo por `onPeerJoin`, e
    // ninguém mais emite `'failed'` — tela travada sem explicação, que é o que o PLANO proibiu
    // para M6. Não há placar mentiroso a consertar: as guardas de `D-32` já seguram isso.
    //
    // O que a guarda NÃO cobre, e fica declarado: cliente modificado (que mentiria em qualquer
    // discriminador, inclusive num identificador de sessão — o argumento de `D-79`), e a sessão
    // nova que reentra ANTES de qualquer cobrança fechar, indistinguível de reconexão legítima
    // — e nesse caso não há divergência a detectar.
    if (m.seq === 0 && match.kicks.length > 0) {
      descartar(`seq 0 com ${match.kicks.length} cobrança(s) fechada(s) — sessão zerada (D-80)`);
      return abandonarSemResultado('reentrada');
    }
    if (m.seq !== match.kicks.length) {
      return descartar(`seq ${m.seq} fora de ordem (a cobrança corrente é ${match.kicks.length})`);
    }
    if (pendenteRemoto !== null) return descartar('o peer já havia escolhido nesta cobrança');

    pendenteRemoto = m.zone;
    if (pending !== null) resolverOnline();
    notificarDaRede('move');
  }

  if (mode === 'online') {
    // Com `roomId`, este aparelho entra na sala do link — e desde `D-73` é por aqui que os DOIS
    // entram: M7 sorteia o ID com `newRoomId` e sempre o passa. O ramo sem `roomId` fica onde
    // está e **não vira contrato**: nele M6 sorteia um ID que a porta congelada não tem por onde
    // devolver, então quem cair aqui abre uma sala que ninguém consegue convidar.
    canal = cfg.roomId === undefined ? hostRoom().channel : joinRoom(cfg.roomId);
    canal.onStatus(aoStatus);
    canal.onMove(aoMove);
  }

  return {
    state(): MatchState {
      return match;
    },

    choose(zone: Zone): void {
      if (disposed) {
        throw new Error('Session.choose: sessão encerrada — dispose() já foi chamado');
      }
      // Zona inválida morre AQUI. O portão diz "nunca chega a M2", e é literal: M2 lançaria a
      // mesma coisa, mas quem valida a entrada da borda é a borda.
      if (!isZone(zone)) {
        throw new RangeError(
          `Session.choose: zona inválida (${String(zone)}); esperado 'L' | 'C' | 'R'`,
        );
      }
      if (match.phase === 'finished') {
        throw new Error('Session.choose: disputa encerrada — nenhuma escolha é aceita depois do fim');
      }

      if (mode === 'cpu') {
        if (cpu === null) throw new Error('Session.choose: modo cpu sem CPU — defeito de M5');

        const meu = papelLocal();
        const dela: Role = meu === 'shooter' ? 'keeper' : 'shooter';

        // ── `D-26`: a CPU escolhe ANTES de observar a escolha desta cobrança ──────────────
        // Esta ordem é OBRIGATÓRIA, não uma preferência. `D-103` respondeu `Q-08` pela saída
        // (C): `pick(role)` lê o histograma do papel ADVERSÁRIO. Observar primeiro faria a CPU
        // no gol ler o chute que o humano acabou de dar, nesta mesma cobrança, e defender a
        // zona exata dele — vidência, não dificuldade. Invertendo estas duas linhas o jogo
        // continua rodando e a suíte continua verde (`QA-44`): a garantia é esta ordem.
        const daCpu = cpu.pick(dela);
        cpu.observe(meu, zone);

        if (meu === 'shooter') resolver(zone, daCpu);
        else resolver(daCpu, zone);

        notify();
        return;
      }

      if (mode === 'online') {
        if (canal === null) throw new Error('Session.choose: modo online sem canal — defeito de M5');

        if (abandonada) {
          // A mensagem diz o que aconteceu com a DISPUTA, não com o socket: "sem resultado" é a
          // resposta de `Q-04`, e é ela que M7 traduz para a pessoa. Note que não há vencedor a
          // anunciar — `state().winner` continua `null`, e isso é o fato, não uma omissão.
          throw new Error(
            'Session.choose: o oponente saiu e a disputa terminou SEM RESULTADO (Q-04) — nenhuma escolha é aceita',
          );
        }

        if (pending !== null) {
          // No `local` a segunda chamada é a defesa do outro jogador; no `online` o outro jogador
          // está no outro aparelho, então segunda chamada na mesma cobrança é defeito de M7 —
          // e defeito de chamador se reporta rápido, em vez de virar jogada trocada.
          throw new Error(
            'Session.choose: já há escolha desta cobrança esperando o peer — no modo online cada aparelho escolhe uma vez por cobrança',
          );
        }

        pending = zone;

        // `seq` é o índice da cobrança corrente, lido de M2 ANTES de resolver. Cada aparelho manda
        // exatamente uma jogada por cobrança, então o número do outro lado é conferível sem
        // combinar nada: é o que deixa o peer descartar reenvio (seq velho) e jogada adiantada
        // (seq futuro). Sem isso, a fila de reenvio de M6 seria duplicação de cobrança.
        canal.send({ seq: match.kicks.length, side: localSide, zone });

        // A jogada do peer pode ter chegado primeiro; então esta escolha fecha a cobrança agora.
        if (pendenteRemoto !== null) resolverOnline();

        // `notify()` cru, e não `notificarDaRede`: aqui existe um chamador (M7) para receber a
        // exceção de um assinante quebrado, e engoli-la seria esconder defeito de tela.
        notify();
        return;
      }

      // ── Modo `local`: os dois jogadores no mesmo aparelho ────────────────────────────────
      // Primeira chamada = o chute de quem cobra (`match.turn`); segunda = a defesa do outro
      // lado. `localSide` não discrimina nada aqui — os dois lados são deste aparelho — e por
      // isso não é lido neste ramo.
      if (pending === null) {
        pending = zone;
        // Notifica mesmo sem cobrança nova: é assim que M7 percebe que há escolha pendente,
        // comparando `kicks.length` com o que renderizou por último. Ver `Q-09` — a porta
        // congelada não expõe de quem é a vez de escolher, e isso é decisão do dono.
        notify();
        return;
      }

      resolver(pending, zone);
      notify();
    },

    subscribe(
      fn: (s: MatchState, l: LinkStatus, t: Record<Side, CountryCode | null>) => void,
    ): () => void {
      if (typeof fn !== 'function') {
        throw new TypeError('Session.subscribe: assinante deve ser função');
      }
      if (disposed) {
        throw new Error('Session.subscribe: sessão encerrada — dispose() já foi chamado');
      }
      subscribers.add(fn);

      // Não emite o estado atual na inscrição: `state()` existe para isso, e emitir aqui faria
      // toda contagem de notificação depender de quando alguém se inscreveu.
      return () => {
        subscribers.delete(fn);
      };
    },

    dispose(): void {
      if (disposed) return; // idempotente: dono de tela chama isso em `unmount`, e chama duas vezes.

      disposed = true;
      link = 'closed';
      limparEsperaDoPick();
      pending = null;
      pendenteRemoto = null;

      // Limpa ANTES de qualquer outra coisa e não notifica ninguém: o portão diz "não deixa
      // assinante vivo", e um último aviso de despedida seria exatamente um assinante vivo
      // depois do `dispose()`. Quem chamou `dispose()` sabe que chamou.
      subscribers.clear();

      // Canal: em `cpu` e `local` não há o que fechar. Em `online`, `close()` solta a sala na
      // sinalização e mata o relógio de 20 s — sem isto, sair da tela deixaria a sala aberta e o
      // peer conversando com ninguém. Vem DEPOIS do `subscribers.clear()` de propósito: `close()`
      // devolve `'closed'` por `aoStatus`, e notificar naquele instante seria exatamente o
      // assinante vivo depois do `dispose()` que o portão proíbe.
      const c = canal;
      canal = null;
      if (c !== null) c.close();
    },
  };
}
