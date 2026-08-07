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
 * **Modo `online` não entra aqui** — é `T-13`, e depende de `A-05` (`Q-04`). `createSession`
 * recusa `mode: 'online'` em voz alta; lacuna declarada fica declarada.
 */

import type { CountryCode, Side, Zone } from '../core/index';
import { createRng } from '../core/index';
import { createMatch, play } from '../engine/index';
import type { MatchState } from '../engine/index';
import { createCpu } from '../cpu/index';
import type { Cpu, Level, Role } from '../cpu/index';
import type { LinkStatus } from '../net/index';
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
 * @throws TypeError se a configuração não fecha (ver `assertConfig`).
 * @throws Error se `mode` for `'online'` — é `T-13`, bloqueada por `A-05`.
 */
export function createSession(cfg: SessionConfig): Session {
  assertConfig(cfg);

  if (cfg.mode === 'online') {
    // Recusa em voz alta em vez de degradar para `local` calado. Um fallback silencioso aqui
    // poria dois jogadores em aparelhos diferentes jogando partidas separadas, cada um vendo
    // um placar próprio — exatamente o defeito que "modo online" existe para não ter.
    throw new Error(
      "createSession: modo 'online' ainda não existe — é T-13, e depende de A-05 (Q-04)",
    );
  }

  const mode = cfg.mode;
  const localSide = cfg.localSide;

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

      // Limpa ANTES de qualquer outra coisa e não notifica ninguém: o portão diz "não deixa
      // assinante vivo", e um último aviso de despedida seria exatamente um assinante vivo
      // depois do `dispose()`. Quem chamou `dispose()` sabe que chamou.
      subscribers.clear();

      // Canal: em `cpu` e `local` não existe canal a fechar. Em `online` (T-13) é aqui que
      // `Channel.close()` entra — e é por isso que `link` já vira `'closed'` desde já.
    },
  };
}
