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
 * **A que este módulo NÃO responde:** como o anfitrião publica o `roomId` que M6 sorteou. A porta
 * congelada em `D-13` tem quatro métodos e nenhum devolve o ID, e M7 não pode importar `src/net`
 * (portão de camada). Está declarado como `Q-11` — não contornado com um quinto método por
 * conta própria.
 */

import type { CountryCode, Side, Zone } from '../core/index';
import { createRng } from '../core/index';
import { createMatch, play } from '../engine/index';
import type { MatchState } from '../engine/index';
import { createCpu } from '../cpu/index';
import type { Cpu, Level, Role } from '../cpu/index';
import { hostRoom, joinRoom } from '../net/index';
import type { Channel, LinkStatus, Move } from '../net/index';
import { findTeam } from '../data/teams';

// ── Os três reexports que o portão de M5 exige ────────────────────────────────────────────
// A regra é "todo tipo que aparece na assinatura de M5 sai por M5". Esquecer um deles torna o
// portão de camada de M7 impossível de cumprir justamente para o tipo esquecido.
export type { MatchState } from '../engine/index';
export type { LinkStatus } from '../net/index';
export type { Level } from '../cpu/index';

export type Mode = 'cpu' | 'local' | 'online';

export interface SessionConfig {
  mode: Mode;
  seed: number;
  level?: Level;
  teams: Record<Side, CountryCode>;
  localSide: Side;
  roomId?: string;
}

export interface Session {
  state(): MatchState;
  /** A escolha DESTE aparelho. Mesma assinatura nos três modos — ver `D-25`. */
  choose(zone: Zone): void;
  subscribe(fn: (s: MatchState, link: LinkStatus) => void): () => void;
  dispose(): void;
}

const ZONES: readonly Zone[] = ['L', 'C', 'R'];
const SIDES: readonly Side[] = ['A', 'B'];
const MODES: readonly Mode[] = ['cpu', 'local', 'online'];

function isZone(value: unknown): value is Zone {
  return (ZONES as readonly unknown[]).includes(value);
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

  // O ÚNICO gerador da sessão. Nasce nos dois modos, ainda que `local` não sorteie nada: é a
  // mesma configuração produzindo a mesma validação nos dois, e é o que deixa o teste de
  // equivalência entre modos comparar sessões criadas do mesmo jeito.
  const rng = createRng(cfg.seed);
  const cpu: Cpu | null =
    mode === 'cpu' && cfg.level !== undefined ? createCpu(cfg.level, rng) : null;

  let match: MatchState = createMatch();

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

  const subscribers = new Set<(s: MatchState, l: LinkStatus) => void>();

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
    for (const fn of [...subscribers]) {
      try {
        fn(match, link);
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

  /** Status do canal chegando de M6. Só traduz — não reconecta, não repete, não desiste sozinho. */
  function aoStatus(s: LinkStatus): void {
    if (disposed) return;
    link = s;

    if (s === 'failed') {
      // `'failed'` é terminal em M6 (`D-31`): a sala já foi solta e nada reconecta. Para M5 isso
      // é a resposta de `Q-04` — sem resultado. Solta as escolhas represadas: elas pertenciam a
      // uma cobrança que nunca vai fechar, e guardá-las só as faria vazar para uma sessão futura.
      abandonada = true;
      pending = null;
      pendenteRemoto = null;
    }

    notificarDaRede('status');
  }

  /**
   * Jogada do peer.
   *
   * Cada guarda abaixo é um evento que **não pode chegar a M2**, e cada uma existe por um caso
   * real: `side` errado é cliente modificado; `seq` menor é reenvio da fila de M6 (que é seguro
   * de repetir justamente porque morre aqui); `seq` maior é jogada de uma cobrança que ainda não
   * começou; segunda jogada na mesma cobrança é duplicata. Descartar é logar e sair — nunca
   * corrigir, nunca "aproveitar o que dá".
   */
  function aoMove(m: Move): void {
    if (disposed || abandonada) return;

    const descartar = (motivo: string): void => {
      console.warn(`[M5] jogada remota descartada — ${motivo}: ${JSON.stringify(m)}`);
    };

    if (m.side !== remoteSide) return descartar(`lado ${String(m.side)} não é o do peer`);
    // M6 já conferiu a forma (`D-32`). M5 confere de novo porque o portão é literal: zona
    // inválida morre em M5. Guarda repetida na fronteira é barata; a que falta, não.
    if (!isZone(m.zone)) return descartar(`zona inválida ${String(m.zone)}`);
    if (match.phase === 'finished') return descartar('a disputa já terminou');
    if (m.seq !== match.kicks.length) {
      return descartar(`seq ${m.seq} fora de ordem (a cobrança corrente é ${match.kicks.length})`);
    }
    if (pendenteRemoto !== null) return descartar('o peer já havia escolhido nesta cobrança');

    pendenteRemoto = m.zone;
    if (pending !== null) resolverOnline();
    notificarDaRede('move');
  }

  if (mode === 'online') {
    // Sem `roomId` este aparelho é o anfitrião e M6 sorteia o ID; com `roomId`, ele entra na sala
    // do link. O ID sorteado **fica aqui dentro** — a porta congelada não tem por onde devolvê-lo,
    // e é exatamente essa a lacuna registrada em `Q-11`. Declarada, não contornada.
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
        // Com o comportamento que T-07 entregou (`pick(role)` lê o histograma do MESMO papel,
        // `Q-08`), a ordem é indiferente: os dois histogramas são disjuntos dentro de uma
        // cobrança. A ordem está fixada assim mesmo porque, se `Q-08` for respondida ao
        // contrário — o goleiro passando a ler o histograma `shooter` —, observar primeiro
        // faria a CPU ler o chute que o humano acabou de dar, nesta mesma cobrança. Isso é
        // vidência, não dificuldade. Escolhendo antes, M5 fica imune à resposta de `Q-08` e
        // o significado de `pick` continua sendo o que T-07 escreveu.
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

    subscribe(fn: (s: MatchState, l: LinkStatus) => void): () => void {
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
