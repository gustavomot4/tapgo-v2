/**
 * M6 — Transporte online P2P.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M6 — Transporte online P2P".
 * Tema: `a_context/online_p2p.md`. Aberto como só-tipos por `D-24` (T-09), implementado em `T-11`.
 *
 * **O que este módulo é:** um canal de mensagens entre dois navegadores, com status explícito
 * — inclusive a falha — e um ID de sala. Nada mais.
 *
 * **O que este módulo NÃO é:** ele não sabe o que é gol, placar, cobrança ou vencedor. Ele
 * carrega `Payload` sem interpretá-lo. Quem decide se uma jogada vale é M5, contra o `MatchState`
 * de M2 (`D-19`). Se você sentir vontade de escrever `if (move.zone === ...)` aqui, o limite
 * entre M6 e M5 está sendo furado.
 *
 * **Dois tipos no fio, quatro métodos na porta (`D-90`)** — desde `T-31` o canal carrega `Move`
 * **ou** `Pick`, pela MESMA `onMove`. M6 não sabe o que é seleção: ele confere a *forma* dos dois
 * e entrega; quem discrimina (`'zone' in p`) e valida o código de país contra o catálogo de M4 é
 * M5. Um 5º método (`onPick`) seria o precedente que `D-39` recusou e `D-73` recusou de novo.
 * O gatilho que reabre isto está escrito em `D-90`: um TERCEIRO tipo não se soma aqui — vira
 * `D-NN` de protocolo, com versão no fio.
 *
 * **Por que tudo é assíncrono:** ver `D-29`. Não existe request/response nesta borda — quem
 * cobra não fica bloqueado esperando o outro. `send` é disparo-e-esquece; a resposta, quando
 * vem, chega por `onMove`.
 */

import type { CountryCode, Side, Zone } from '../core/index';
// `import type` é apagado na compilação (`verbatimModuleSyntax`): checa o contrato real da
// biblioteca sem pôr um grama dela no bundle inicial — o `import()` de valor continua dinâmico.
import type { JsonValue } from 'trystero';

/**
 * Status do canal, **incluindo a falha** — é contrato que a falha seja um estado nomeado, e
 * não uma exceção: tela travada sem explicação foi o que o PLANO proibiu para M6.
 *
 * Máquina de estados real (`D-31`):
 *
 * ```
 *   idle ──► waiting ──► connected
 *     │         │  ▲         │
 *     │         │  └─────────┘  (peer saiu: volta a waiting e o relógio REARMA)
 *     ▼         ▼
 *   failed ◄────┘   (20 s sem peer, sinalização fora do ar, ou sala recusada)
 *
 *   qualquer estado ──► closed   (close(), e só por close())
 * ```
 *
 * - `idle` — canal criado, sinalização ainda não carregada (o `import()` está em voo).
 * - `waiting` — na sala, sem ninguém do outro lado.
 * - `connected` — peer presente; é o único estado em que `send` sai na hora.
 * - `failed` — **terminal para o transporte**: a sala é abandonada e nada mais reconecta.
 * - `closed` — desligado por quem chamou.
 */
export type LinkStatus = 'idle' | 'waiting' | 'connected' | 'failed' | 'closed';

/**
 * Uma jogada serializada — dezenas de bytes.
 *
 * `seq` é o nº de sequência que deixa M5 descartar evento repetido ou fora de ordem. Note que
 * M6 carrega o número mas **não o interpreta**: quem decide o que é jogada válida é M5, contra
 * o `MatchState` de M2. M6 não sabe o que é gol.
 *
 * É `seq` que torna o reenvio **seguro de repetir**: uma jogada que chega duas vezes é
 * descartada por M5 pelo número, não vira duas cobranças. Sem isso, a fila de `send` abaixo
 * seria duplicação de efeito, não resiliência.
 */
export interface Move {
  seq: number;
  side: Side;
  zone: Zone;
}

/**
 * A seleção que ESTE aparelho escolheu, anunciada ao outro (`D-90` / `T-31`).
 *
 * Existe porque a escolha do convidado nasce **depois** do link, e não há segundo caminho entre
 * os dois aparelhos além deste canal: o código de país do outro lado não existe aqui, em nenhuma
 * forma, em nenhum momento. Note o que ela NÃO tem: `seq`. `Pick` não pertence a cobrança
 * nenhuma — cada lado declara só o **próprio** `side`, os dois mandam ao conectar, sem ordem e
 * sem resposta, e repetir é idempotente porque o valor é o mesmo.
 *
 * `team` é `CountryCode` (`D-52`), e M6 confere dele **só a forma**: quem pergunta se o código
 * está no catálogo de M4 é M5 (`D-61`). M6 não sabe o que é seleção.
 */
export interface Pick {
  side: Side;
  team: CountryCode;
}

/**
 * Tudo que atravessa o fio. União de dois, e dois é o teto declarado em `D-90`.
 *
 * Quem discrimina é M5, em uma linha (`'zone' in p`) — `Move` tem `zone` e `Pick` não tem.
 */
export type Payload = Move | Pick;

/**
 * Configuração de relay. Existe para o TURN ser trocado sem tocar em mais nada.
 *
 * **Nunca preencha isto com credencial versionada.** A restrição "nenhum segredo versionado" do
 * CONTEXT vale aqui: a credencial entra em runtime (a página de medição a pede num campo), e é
 * por isso que ela é parâmetro e não constante deste arquivo.
 */
export interface IceConfig {
  turn?: { urls: string; username: string; credential: string };
}

/**
 * A porta congelada por `D-13`: **quatro** métodos, e `D-90` não comprou um quinto. O que mudou
 * em `T-31` foi o que passa por eles (`Payload` no lugar de `Move`), não quantos são.
 */
export interface Channel {
  send(p: Payload): void;
  onMove(fn: (p: Payload) => void): void;
  onStatus(fn: (s: LinkStatus) => void): void;
  close(): void;
}

/**
 * Orçamento de tempo até `'failed'`, em milissegundos.
 *
 * Os 20 s são **escolha do PLANO, não medição**: longos o bastante para o ICE completar em rede
 * móvel, curtos o bastante para a tela não parecer travada. E-4 pode ajustá-los com o número da
 * medição na mão — e é para esse ajuste ser conferível que a constante é exportada em vez de
 * ficar embutida numa chamada de `setTimeout`.
 *
 * Este é o orçamento **inteiro** desta borda: não há salto seguinte para quem repassar prazo.
 */
export const CONNECT_TIMEOUT_MS = 20_000;

/**
 * Promessa do momento em que cada canal **terminou de abrir** — resolve com o primeiro status
 * que não é `'idle'` (`'waiting'`, `'failed'` ou `'closed'`).
 *
 * Existe porque abrir o canal depende de um `import()` dinâmico, e quem precisa observar o
 * resultado não tem como saber quando ele chegou. A alternativa que eu havia escrito — girar o
 * event loop até o status mudar — **passou no Linux e reprovou no Windows**: girar `setImmediate`
 * em laço deixa o carregador de módulos sem vez (3.000 voltas em 30 ms, módulo parado), e o
 * canal ficava eternamente em `'idle'`. Aguardar uma promessa deixa o processo ocioso, que é
 * exatamente a condição para o carregador andar.
 *
 * **Não altera a porta congelada em `D-13`:** `Channel` continua com os mesmos quatro métodos, e
 * nada em M5 é obrigado a usar isto.
 */
const aberturas = new WeakMap<Channel, Promise<LinkStatus>>();

/** Resolve quando `c` sai de `'idle'`. Canal desconhecido é erro de quem chamou. */
export function opened(c: Channel): Promise<LinkStatus> {
  const p = aberturas.get(c);
  if (p === undefined) throw new TypeError('opened: canal não foi criado por hostRoom/joinRoom');
  return p;
}

/**
 * O pedaço da Trystero que M6 usa. Tipado a partir do módulo REAL, então trocar de versão e
 * quebrar a assinatura reprova em `tsc` — o duplo de teste não pode divergir da biblioteca.
 */
// Escrito à mão, e não com o utilitário `Pick<>` do TypeScript: desde `D-90` `Pick` é um tipo
// DESTE módulo, e ele sombreia o utilitário global dentro deste arquivo. A garantia continua a
// mesma — a assinatura sai do módulo REAL, então trocar de versão e quebrá-la reprova em `tsc`.
type Sinalizacao = { joinRoom: (typeof import('trystero'))['joinRoom'] };

const CARREGADOR_PADRAO = (): Promise<Sinalizacao> => import('trystero');

let carregarSinalizacao: () => Promise<Sinalizacao> = CARREGADOR_PADRAO;

/**
 * Troca o carregador da sinalização; `null` devolve o padrão. **Costura de teste** — a porta de
 * M6 congelada em `D-13` não muda, e nada em produção chama isto.
 *
 * Existe porque testar M6 contra a biblioteca real exigia interceptar um `import()` dinâmico com
 * o mockador de módulos, e esse caminho se mostrou **intermitente**: sob carga o mock escapava,
 * a Trystero de verdade era carregada, `RTCPeerConnection` estourava em Node e o canal ia a
 * `'failed'` — falha que aparecia num teste a cada tantas execuções e acusava o código de
 * produção. Injetando o carregador, o teste não depende do carregador de módulos, e o que sobra
 * sob teste é M6.
 */
export function setSignalingLoader(fn: (() => Promise<Sinalizacao>) | null): void {
  carregarSinalizacao = fn ?? CARREGADOR_PADRAO;
}

/** Namespace da sala na infraestrutura pública. Não é segredo e não identifica ninguém. */
const APP_ID = 'tapgo-v2';

/** Nome do canal de jogadas dentro da sala. */
const ACTION_MOVE = 'move';

/**
 * Alfabeto Crockford base32 — sem `I`, `L`, `O` e `U`, os quatro que se leem errado quando
 * alguém dita ou digita o link. 32 símbolos = 5 bits por caractere.
 */
const ROOM_ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 26 caracteres × 5 bits = 130 bits de entropia. Colisão entre abas não é risco tratável a essa escala. */
const ROOM_ID_LENGTH = 26;

const ROOM_ID_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/**
 * Teto de jogadas represadas enquanto o canal não está `'connected'`.
 *
 * Uma disputa inteira cabe folgado: 5 cobranças regulares deste aparelho, mais uma por rodada
 * de alternadas. O teto existe porque fila sem teto é vazamento de memória disfarçado de
 * resiliência — e o que estoura o teto é descartado **em voz alta**, nunca em silêncio.
 */
const PENDING_LIMIT = 32;

/** Erro de contrato do lado de fora: quem chamou passou algo que não é `Move` nem `Pick`. */
function assertPayload(p: Payload): void {
  if (!isMove(p) && !isPick(p)) {
    throw new TypeError(
      `Channel.send: payload malformado (${JSON.stringify(p)}). ` +
        'Esperado { seq: inteiro >= 0, side: "A"|"B", zone: "L"|"C"|"R" } ' +
        'ou { side: "A"|"B", team: código de país não vazio }.',
    );
  }
}

/**
 * Como um payload aparece no log desta borda.
 *
 * `Pick` não tem `seq`, e escrever `seq=undefined` num aviso é o tipo de linha que faz alguém
 * caçar um defeito de numeração que não existe.
 */
function rotulo(p: Payload): string {
  return isMove(p) ? `jogada seq=${p.seq}` : `escolha de seleção do lado ${p.side}`;
}

/**
 * Validação de **forma**, não de regra.
 *
 * A fronteira é esta: M6 pergunta "isto é um `Move`?"; M5 pergunta "este `Move` é legal agora?".
 * Sem a primeira pergunta, M6 entregaria a M5 um objeto tipado como `Move` que não é um — e a
 * garantia do TypeScript viraria mentira na única borda do projeto onde o dado vem de fora.
 * Ver `D-32`.
 */
function isMove(m: unknown): m is Move {
  if (typeof m !== 'object' || m === null) return false;
  const c = m as Record<string, unknown>;
  return (
    typeof c['seq'] === 'number' &&
    Number.isInteger(c['seq']) &&
    (c['seq'] as number) >= 0 &&
    (c['side'] === 'A' || c['side'] === 'B') &&
    (c['zone'] === 'L' || c['zone'] === 'C' || c['zone'] === 'R')
  );
}

/**
 * O irmão de `isMove`, sob o MESMO descarte alto e logado de `D-32`: payload que não é nem um
 * nem outro morre na borda e nunca vira dado mentiroso rio abaixo.
 *
 * Confere **forma**, não catálogo: `team` precisa ser texto não vazio, e é só. Perguntar se `BR`
 * existe é perguntar o que é seleção, e M6 não sabe — quem pergunta é M5, contra M4 (`D-61`).
 * O teto de tamanho existe pela mesma razão que `PENDING_LIMIT`: dado de fora sem teto é dado de
 * fora sem teto. O maior código real tem 6 caracteres (`GB-ENG`, `D-52`), e 16 dá folga sem
 * abrir espaço para um megabyte de texto entrar como "seleção".
 */
function isPick(p: unknown): p is Pick {
  if (typeof p !== 'object' || p === null) return false;
  const c = p as Record<string, unknown>;
  const team = c['team'];
  return (
    (c['side'] === 'A' || c['side'] === 'B') &&
    typeof team === 'string' &&
    team.length > 0 &&
    team.length <= 16
  );
}

/**
 * Sorteia um ID de sala opaco.
 *
 * **Não usa o `Rng` de M1, e isso é de propósito** (`D-30`): o gerador de M1 é determinístico
 * por contrato — é o que faz a disputa rodar 2x igual —, e ID de sala determinístico é ID de
 * sala previsível, que é exatamente o defeito 6 da v1. Aqui o requisito é o oposto: imprevisível.
 * `crypto.getRandomValues` não é o gerador nativo que M1 monopoliza, então o portão de M1 (uma
 * única ocorrência dele em `src/`) continua verde.
 *
 * `b % 32` não enviesa: 256 é múltiplo exato de 32, então cada símbolo recebe 8 dos 256 valores.
 *
 * **Exportada de propósito**, embora `hostRoom` seja quem a usa: o portão do defeito 6 exige
 * milhares de sorteios, e obtê-los por `hostRoom` significaria abrir milhares de canais — cada
 * um com seu `import()` de sinalização. Feito assim uma vez, o carregador de módulos saturou e
 * um `import()` chegou a rejeitar, derrubando um teste que nada tinha a ver com ID. Propriedade
 * de gerador se testa no gerador.
 */
export function newRoomId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    // Cair para um gerador fraco aqui seria trocar "sem online" por "online inseguro e
    // previsível", calado. Falha alta é mais barata.
    throw new Error(
      'M6: crypto.getRandomValues indisponível — sem ele o ID de sala seria previsível. ' +
        'O modo online exige contexto seguro (HTTPS); os modos cpu e local seguem intactos.',
    );
  }
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) {
    const c = ROOM_ID_ALPHABET[b % 32];
    if (c === undefined) throw new Error('M6: índice fora do alfabeto — impossível por construção');
    out += c;
  }
  return out;
}

/**
 * O canal propriamente dito. `host` só muda quem sorteou o ID; o transporte é simétrico.
 */
function createChannel(roomId: string, ice: IceConfig | undefined): Channel {
  let status: LinkStatus = 'idle';
  let room: Awaited<ReturnType<typeof abrirSala>> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const moveHandlers: ((p: Payload) => void)[] = [];
  const statusHandlers: ((s: LinkStatus) => void)[] = [];
  const pending: Payload[] = [];

  /**
   * Leitura do status atrás de função, e não `status` direto.
   *
   * Não é enfeite: o fluxo abaixo lê o status **depois de um `await`**, e a análise de fluxo do
   * TypeScript estreita `status` para o literal `'idle'` da inicialização, sem enxergar que os
   * callbacks assíncronos o mudaram. Lido pela função, o tipo continua sendo `LinkStatus` — que
   * é a verdade.
   */
  const atual = (): LinkStatus => status;

  /** Ver `aberturas`: resolve no primeiro status que não é `'idle'`, uma vez só. */
  let resolverAbertura: ((s: LinkStatus) => void) | null = null;
  const abertura = new Promise<LinkStatus>((res) => {
    resolverAbertura = res;
  });
  const abriu = (s: LinkStatus): void => {
    if (s === 'idle' || resolverAbertura === null) return;
    resolverAbertura(s);
    resolverAbertura = null;
  };

  /**
   * Identificador de correlação: os DOIS aparelhos de uma mesma partida escrevem este mesmo
   * prefixo no console. Sem ele, depurar uma falha que só acontece na rede da operadora do
   * amigo é adivinhação. Truncado a 6 caracteres de propósito — o ID inteiro é a credencial de
   * entrada na sala, e print de tela viaja.
   */
  const tag = `[M6 ${roomId.slice(0, 6)}]`;

  function limparTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * (Re)arma o relógio de 20 s. Rearmar na saída do peer é o que impede o caso "oponente sumiu
   * no meio" de virar tela parada em `'waiting'` para sempre: ou ele volta, ou vira `'failed'`
   * com mensagem. **Quem vence a disputa nesse caso é `Q-04`, e não é decisão deste módulo.**
   */
  function armarTimer(): void {
    limparTimer();
    timer = setTimeout(() => {
      timer = null;
      if (status === 'connected' || status === 'closed' || status === 'failed') return;
      console.warn(
        `${tag} sem peer após ${CONNECT_TIMEOUT_MS} ms — provável NAT simétrico/CGNAT sem TURN.`,
      );
      falhar();
    }, CONNECT_TIMEOUT_MS);
  }

  function emitir(novo: LinkStatus): void {
    if (status === novo || status === 'closed') return;
    status = novo;
    abriu(novo);
    for (const fn of [...statusHandlers]) fn(novo);
  }

  /** `'failed'` é terminal: solta a sala e para de tentar. Só `close()` vem depois. */
  function falhar(): void {
    if (status === 'closed' || status === 'failed') return;
    limparTimer();
    soltarSala();
    emitir('failed');
  }

  function soltarSala(): void {
    const r = room;
    room = null;
    if (r === null) return;
    try {
      // `leave()` devolve Promise; uma rejeição aqui não pode derrubar quem chamou `close()`.
      void Promise.resolve(r.leave()).catch(() => undefined);
    } catch {
      /* sala já solta */
    }
  }

  /**
   * Carrega a sinalização e entra na sala.
   *
   * O `import()` é **dinâmico de propósito**, e é ele que sustenta o portão "com a sinalização
   * derrubada, `cpu` e `local` continuam jogáveis": nada de Trystero entra no bundle inicial e
   * nenhuma falha de carga escapa deste `try`. Mesmo padrão que `D-27` deu ao Phaser.
   */
  async function abrirSala(): Promise<{ leave: () => Promise<void> | void }> {
    const { joinRoom: entrarNaSala } = await carregarSinalizacao();

    // `exactOptionalPropertyTypes` está ligado: montar o objeto condicionalmente em vez de
    // atribuir `undefined` a uma chave opcional.
    const base = {
      appId: APP_ID,
      // Cifra o SDP que trafega pela infra pública de sinalização. A chave é o próprio ID da
      // sala, que só quem tem o link possui — o relay deixa de ler os candidatos ICE.
      password: roomId,
    };
    const cfg = ice?.turn
      ? {
          ...base,
          turnConfig: [
            {
              urls: ice.turn.urls,
              username: ice.turn.username,
              credential: ice.turn.credential,
            },
          ],
        }
      : base;

    const sala = entrarNaSala(cfg, roomId, {
      onJoinError: (d) => {
        console.warn(`${tag} sala recusada pela sinalização: ${d.error}`);
        falhar();
      },
    });

    const acao = sala.makeAction<Record<string, JsonValue>>(ACTION_MOVE);

    acao.onMessage = (d: unknown) => {
      if (!isMove(d) && !isPick(d)) {
        // Erro de contrato do outro lado (peer de versão diferente, cliente modificado, dado
        // corrompido). Morre aqui, alto e logado — nunca vira `Move` nem `Pick` mentiroso rio
        // abaixo. É `D-32` valendo igual para os dois tipos do fio (`D-90`).
        console.warn(`${tag} payload descartado, não é Move nem Pick: ${JSON.stringify(d)}`);
        return;
      }
      for (const fn of [...moveHandlers]) fn(d);
    };

    sala.onPeerJoin = () => {
      // `'failed'` e `'closed'` são terminais: a sala já foi solta e ninguém mais espera este
      // canal. Sem esta guarda, um peer que aparecesse depois do timeout ressuscitaria a
      // conexão **depois** de a tela já ter mostrado "não deu" — e o jogador seria puxado para
      // uma partida que ele já viu falhar.
      if (status === 'closed' || status === 'failed') return;
      limparTimer();
      emitir('connected');
      escoarFila();
    };

    sala.onPeerLeave = () => {
      if (status === 'closed' || status === 'failed') return;
      emitir('waiting');
      armarTimer();
    };

    enviarBruto = (p: Payload) => {
      void acao.send(p as unknown as Record<string, JsonValue>).catch((e: unknown) => {
        console.warn(`${tag} envio de ${rotulo(p)} falhou: ${String(e)}`);
      });
    };

    return sala;
  }

  let enviarBruto: ((p: Payload) => void) | null = null;

  function escoarFila(): void {
    if (enviarBruto === null) return;
    while (pending.length > 0) {
      const p = pending.shift();
      if (p !== undefined) enviarBruto(p);
    }
  }

  armarTimer();

  void (async () => {
    try {
      const sala = await abrirSala();
      if (atual() === 'closed' || atual() === 'failed') {
        // `close()` chegou enquanto o `import()` estava em voo: não deixe sala órfã aberta.
        void Promise.resolve(sala.leave()).catch(() => undefined);
        return;
      }
      room = sala;
      emitir('waiting');
    } catch (e: unknown) {
      console.warn(`${tag} sinalização indisponível: ${String(e)}`);
      falhar();
    }
  })();

  const canal: Channel = {
    send(p: Payload): void {
      assertPayload(p);
      if (status === 'closed' || status === 'failed') {
        console.warn(`${tag} ${rotulo(p)} descartada: canal ${status}.`);
        return;
      }
      if (status === 'connected' && enviarBruto !== null) {
        enviarBruto(p);
        return;
      }
      // Ainda não conectado (ou peer saiu): represa. Repetir é seguro nos dois tipos — `Move`
      // pelo `seq`, `Pick` porque o valor é o mesmo (`D-90`).
      if (pending.length >= PENDING_LIMIT) {
        const velha = pending.shift();
        console.warn(
          `${tag} fila cheia (${PENDING_LIMIT}); descartada a ${velha === undefined ? 'nada' : rotulo(velha)}.`,
        );
      }
      pending.push(p);
    },

    /** Nome de `D-13`, carga de `D-90`: por aqui chega `Move` **ou** `Pick`. Quem discrimina é M5. */
    onMove(fn: (p: Payload) => void): void {
      moveHandlers.push(fn);
    },

    /**
     * Registra e **entrega o status atual na hora**. Sem isso, quem assina depois de o canal já
     * ter falhado (o `import()` pode falhar antes de M5 assinar) nunca saberia — e a tela ficaria
     * esperando um evento que já passou.
     */
    onStatus(fn: (s: LinkStatus) => void): void {
      statusHandlers.push(fn);
      fn(status);
    },

    close(): void {
      if (status === 'closed') return;
      limparTimer();
      soltarSala();
      enviarBruto = null;
      pending.length = 0;
      status = 'closed';
      abriu('closed');
      const ouvintes = [...statusHandlers];
      moveHandlers.length = 0;
      statusHandlers.length = 0;
      for (const fn of ouvintes) fn('closed');
    },
  };

  aberturas.set(canal, abertura);
  return canal;
}

/**
 * Abre uma sala nova e devolve o ID para virar link de convite.
 *
 * O ID é sorteado no cliente porque não há servidor para sorteá-lo (`D-01`) — daí ele precisar
 * ser opaco e imprevisível, e daí **nenhuma decisão de disputa poder derivar dele**.
 */
export function hostRoom(ice?: IceConfig): { roomId: string; channel: Channel } {
  const roomId = newRoomId();
  return { roomId, channel: createChannel(roomId, ice) };
}

/**
 * Entra numa sala existente.
 *
 * ID malformado **lança na hora**, em vez de virar uma espera de 20 s que termina em `'failed'`:
 * link truncado no WhatsApp é erro do chamador, e erro de chamador se reporta rápido e claro
 * (mesma linha de `D-25`, que fez M5 recusar na criação).
 */
export function joinRoom(roomId: string, ice?: IceConfig): Channel {
  if (typeof roomId !== 'string' || !ROOM_ID_RE.test(roomId)) {
    throw new TypeError(
      `joinRoom: ID de sala inválido (${JSON.stringify(roomId)}). ` +
        `Esperado ${ROOM_ID_LENGTH} caracteres do alfabeto Crockford base32.`,
    );
  }
  return createChannel(roomId, ice);
}
