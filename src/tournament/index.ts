/**
 * M8 — Torneio: chaveamento, simulação das disputas sem o jogador, e a forma serializada.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M8 — Torneio".
 * Regra:    `a_context/regras_partida.md` → "Torneio (`D-53`)".
 *
 * Importa M1 (tipos e gerador), M2 (motor), M3 (CPU) e M4 (catálogo) — `D-57`. **Não importa
 * M5**: `choose()` é a escolha *deste aparelho*, e numa competição de 64 disputas a maioria não
 * tem ninguém escolhendo. Também **não conhece armazenamento do navegador**: quem persiste o
 * retrato de `toJSON()` é M7 (`D-57`), e o portão varre este diretório para provar isso.
 *
 * **O formato (`D-53`):** 8 grupos de 4 = 48 disputas · mata-mata de 16 = 8+4+2+1 = 15 ·
 * disputa de 3º lugar = 1. Total **64**, com **um** campeão.
 */

import { createMatch, play } from '../engine/index';
import type { MatchState } from '../engine/index';
import { createCpu } from '../cpu/index';
import type { Cpu, Level } from '../cpu/index';
import { createRng } from '../core/index';
import type { CountryCode, Rng, Side } from '../core/index';
import { findTeam } from '../data/teams';
import { GOLS_DESCONHECIDOS, ordenarGrupo, tabelaOrdenada } from './tabela';
import type { Jogo, Standing } from './tabela';
import { DISPUTAS_DE_GRUPO, GRUPOS, POR_GRUPO, disputaDeGrupo } from './fila';

/** Reexporta: M7 monta o config sem importar M3 (portão de camada de M7). */
export type { Level } from '../cpu/index';
export type { Standing } from './tabela';

export type Stage = 'groups' | 'r16' | 'quarter' | 'semi' | 'third' | 'final';

export interface TournamentConfig {
  entrants: readonly CountryCode[]; // 32 (`D-51`)
  human: CountryCode; // a do jogador; as outras disputas são simuladas
  level: Level; // UM valor: sem progressão (`D-60`); teto de 70% (`D-10`)
  seed: number;
}

/**
 * O retrato do torneio, para M7 gravar (`D-57`).
 *
 * **Opaco para quem lê, estável para quem grava.** M7 não interpreta nenhum campo daqui: grava o
 * objeto e devolve para `restoreTournament`. Só **código de país e inteiro** — nem `level` nem
 * `stage` viajam como texto, porque o portão de `T-14` cobra isso por teste sobre o que é gravado.
 */
export interface TournamentState {
  /** Versão do formato. Retrato de versão desconhecida é recusado, nunca adivinhado. */
  readonly v: number;
  readonly seed: number;
  /** Quantos sorteios o gerador já entregou — ver `contador`. */
  readonly consumed: number;
  /** Índice do nível em `LEVELS`; inteiro, não o texto `'hard'`. */
  readonly level: number;
  readonly human: CountryCode;
  /** As 32, **já sorteadas**: cada fatia de 4 é um grupo. É o sorteio cego de `D-59` gravado. */
  readonly entrants: readonly CountryCode[];
  /** As 32 na ordem de classificação, decidida uma vez ao fim dos grupos. Vazio antes disso. */
  readonly groupOrder: readonly CountryCode[];
  /** Um por disputa já jogada, na ordem da fila: `0` = venceu `A`, `1` = venceu `B`. */
  readonly results: readonly number[];
  readonly goalsA: readonly number[];
  readonly goalsB: readonly number[];
  /** Contador de instrumentação: quantas disputas foram registradas. */
  readonly played: number;
}

/**
 * Uma disputa do chaveamento, **como M7 lê** (`D-111`).
 *
 * É o que sai de `chaveamento(state)`: par, fase e resultado já mastigados. M7 não interpreta
 * campo de `TournamentState` para montar isto — o retrato segue opaco (`D-68`), e o portão de
 * camada varre `src/ui/` para provar que ninguém reintroduziu a leitura pela porta dos fundos.
 */
export interface Disputa {
  readonly stage: Stage;
  readonly round: number;
  /** 0..7 na fase de grupos; `-1` no mata-mata. */
  readonly group: number;
  readonly teams: Record<Side, CountryCode>;
  /** `null` = ainda não jogada. */
  readonly winner: Side | null;
  /**
   * `null` = placar **AUSENTE** (`D-67`/`Q-13`), nunca `0`.
   *
   * Ausente nas disputas do jogador — `report(winner)` carrega o vencedor e nada mais (porta
   * congelada, `D-58`) — e nas que ainda não foram jogadas. Nas simuladas o placar é real.
   */
  readonly goals: Record<Side, number> | null;
}

export interface Tournament {
  current(): { teams: Record<Side, CountryCode>; stage: Stage; round: number } | null;
  report(winner: Side): void; // só a disputa DO JOGADOR entra por aqui
  group(code: CountryCode): readonly Standing[];
  champion(): CountryCode | null;
  toJSON(): TournamentState; // quem PERSISTE é M7 (`D-57`)
}

/* ────────────────────────────── o formato, em número (`D-53`) ────────────────────────────── */

const ENTRANTS = 32;
const DISPUTAS = 64; // 48 + 15 + 1
const FORMATO_V = 1;

/** Posições em que cada fase começa na fila. */
const INICIO_QUARTAS = 56;
const INICIO_SEMIS = 60;
const POSICAO_TERCEIRO = 62;

/** A ordem dos níveis é parte do formato serializado — não reordenar. */
const LEVELS: readonly Level[] = ['easy', 'medium', 'hard'];

const SIDES: readonly Side[] = ['A', 'B'];

/** Cruzamento das oitavas: 1º de um grupo × 2º do grupo vizinho. */
const CRUZAMENTO: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [2, 3],
  [3, 2],
  [4, 5],
  [5, 4],
  [6, 7],
  [7, 6],
];

/**
 * Teto de cobranças numa disputa simulada.
 *
 * As alternadas não têm teto de rodadas (`D-09`), e nem devem ter — a regra do esporte não tem.
 * Este número não é regra: é o limite a partir do qual o laço deixou de ser uma disputa e virou
 * defeito, e ele **lança** em vez de devolver um vencedor inventado. A chance real de alcançá-lo
 * é desprezível — cada rodada alternada empata com probabilidade ~5/9, e 1.000 cobranças são
 * ~495 rodadas empatadas seguidas.
 */
const TETO_COBRANCAS = 1000;

/* ──────────────────────────────────── utilidades ──────────────────────────────────── */

function em<T>(lista: readonly T[], i: number): T {
  const valor = lista[i];
  if (valor === undefined) {
    throw new RangeError(`M8: índice ${String(i)} fora da faixa (${String(lista.length)})`);
  }
  return valor;
}

function outro(side: Side): Side {
  return side === 'A' ? 'B' : 'A';
}

/**
 * Envolve o `Rng` de M1 contando os sorteios entregues.
 *
 * **É a saída de `D-58` para "restaurar o chaveamento não restaura o gerador".** A porta de M1
 * expõe `int()` e mais nada — não há cursor para ler nem para escrever —, então o retrato guarda
 * a semente **e** quantos sorteios foram consumidos, e `restoreTournament` refaz o gerador
 * descartando essa quantidade. Dar cursor a M1 foi a saída **rejeitada** em `D-58`: porta
 * congelada e a mais dependida do projeto, mexida por necessidade de um módulo só.
 *
 * O descarte só é válido porque **um `int()` avança o gerador exatamente um passo, qualquer que
 * seja `maxExclusive`** — propriedade de M1, coberta por teste próprio na suíte de M8.
 */
function contador(base: Rng): { rng: Rng; consumidos: () => number } {
  let n = 0;
  return {
    rng: {
      int(maxExclusive: number): number {
        const valor = base.int(maxExclusive);
        n += 1; // depois da chamada: sorteio recusado por M1 não conta
        return valor;
      },
    },
    consumidos: () => n,
  };
}

function assertEntrants(entrants: readonly CountryCode[], human: CountryCode, onde: string): void {
  if (!Array.isArray(entrants) || entrants.length !== ENTRANTS) {
    throw new TypeError(`${onde}: entrants deve ter ${String(ENTRANTS)} seleções (D-51)`);
  }
  const vistas = new Set<CountryCode>();
  for (const code of entrants) {
    if (vistas.has(code)) throw new TypeError(`${onde}: seleção repetida (${String(code)})`);
    vistas.add(code);
    // M4 é a fonte do catálogo; M8 não conhece país nenhum por conta própria.
    if (findTeam(code) === undefined) {
      throw new TypeError(`${onde}: seleção ${String(code)} não está no catálogo de M4`);
    }
  }
  if (!vistas.has(human)) {
    throw new TypeError(`${onde}: a seleção do jogador (${String(human)}) não está entre as 32`);
  }
}

/* ─────────────────────────────── o motor do torneio ─────────────────────────────── */

/**
 * O par de uma posição da fila, **sem resultado**.
 *
 * Não é o `Disputa` da porta (`D-111`), que carrega vencedor e placar: este é só o que a fila
 * decide sozinha. O nome interno mudou quando a porta ganhou o dela — dois tipos com o mesmo
 * nome no mesmo arquivo escondem qual dos dois um par de olhos está lendo.
 */
interface Confronto {
  readonly teams: Record<Side, CountryCode>;
  readonly stage: Stage;
  readonly round: number;
  /** Índice do grupo (0..7) na fase de grupos; `-1` no mata-mata. */
  readonly grupo: number;
}

/**
 * O par da posição `i` da fila (0..63), **derivado** do estado cru.
 *
 * A fila não é guardada: os grupos saem do sorteio já gravado em `entrants` (ver `fila.ts`), e
 * cada rodada do mata-mata sai dos resultados da anterior. É o que faz o retrato caber em
 * "código de país e inteiro" sem perder uma disputa sequer.
 *
 * **É função de topo, e não método do fecho de `montar`, desde `D-111`:** `chaveamento(state)`
 * lê o retrato sem construir torneio, e precisa da MESMA derivação que a linha do tempo usa.
 * Duas cópias da regra dariam duas fontes de verdade — e o portão de `D-111` cobra justamente
 * que o `winner` de cada disputa lida bata com `group()` e `champion()` da mesma semente.
 *
 * Não toca gerador, não escreve em nada: as três listas entram como leitura.
 *
 * @throws RangeError se `i` está fora da fila.
 * @throws Error se o mata-mata é pedido antes de a fase de grupos fechar.
 */
function confrontoEm(
  entrants: readonly CountryCode[],
  groupOrder: readonly CountryCode[],
  results: readonly number[],
  i: number,
): Confronto {
  if (!Number.isInteger(i) || i < 0 || i >= DISPUTAS) {
    throw new RangeError(`M8: posição ${String(i)} fora da fila de ${String(DISPUTAS)}`);
  }

  if (i < DISPUTAS_DE_GRUPO) {
    const par = disputaDeGrupo(entrants, i);
    return { teams: { A: par.a, B: par.b }, stage: 'groups', round: par.round, grupo: par.grupo };
  }

  if (groupOrder.length !== ENTRANTS) {
    throw new Error('M8: mata-mata pedido antes de a fase de grupos fechar — defeito de M8');
  }

  const classificado = (g: number, posicao: number): CountryCode =>
    em(groupOrder, g * POR_GRUPO + posicao);
  const vencedorDe = (k: number): CountryCode => {
    const d = confrontoEm(entrants, groupOrder, results, k);
    return em(results, k) === 0 ? d.teams.A : d.teams.B;
  };
  const perdedorDe = (k: number): CountryCode => {
    const d = confrontoEm(entrants, groupOrder, results, k);
    return em(results, k) === 0 ? d.teams.B : d.teams.A;
  };

  if (i < INICIO_QUARTAS) {
    const cruz = em(CRUZAMENTO, i - DISPUTAS_DE_GRUPO);
    return {
      teams: { A: classificado(em(cruz, 0), 0), B: classificado(em(cruz, 1), 1) },
      stage: 'r16',
      round: 4,
      grupo: -1,
    };
  }
  if (i < INICIO_SEMIS) {
    const k = i - INICIO_QUARTAS;
    return {
      teams: {
        A: vencedorDe(DISPUTAS_DE_GRUPO + 2 * k),
        B: vencedorDe(DISPUTAS_DE_GRUPO + 2 * k + 1),
      },
      stage: 'quarter',
      round: 5,
      grupo: -1,
    };
  }
  if (i < POSICAO_TERCEIRO) {
    const k = i - INICIO_SEMIS;
    return {
      teams: { A: vencedorDe(INICIO_QUARTAS + 2 * k), B: vencedorDe(INICIO_QUARTAS + 2 * k + 1) },
      stage: 'semi',
      round: 6,
      grupo: -1,
    };
  }
  if (i === POSICAO_TERCEIRO) {
    // A disputa de 3º lugar vem ANTES da final na fila, como no esporte — e por isso as duas
    // têm `round` distinto. `stage` é o que dá o nome da fase (`D-58`).
    return {
      teams: { A: perdedorDe(INICIO_SEMIS), B: perdedorDe(INICIO_SEMIS + 1) },
      stage: 'third',
      round: 7,
      grupo: -1,
    };
  }
  return {
    teams: { A: vencedorDe(INICIO_SEMIS), B: vencedorDe(INICIO_SEMIS + 1) },
    stage: 'final',
    round: 8,
    grupo: -1,
  };
}

interface Cru {
  groupOrder: CountryCode[];
  results: number[];
  goalsA: number[];
  goalsB: number[];
}

/**
 * Constrói o torneio a partir do estado cru. É o corpo comum de `createTournament` e
 * `restoreTournament` — um caminho só até o chaveamento, porque dois viram duas regras.
 */
function montar(
  level: Level,
  human: CountryCode,
  entrants: readonly CountryCode[],
  rng: Rng,
  consumidos: () => number,
  seed: number,
  inicial: Cru,
): Tournament {
  const { results, goalsA, goalsB } = inicial;
  let groupOrder: CountryCode[] = inicial.groupOrder;

  /** Instrumentação do portão: incrementada no ÚNICO ponto onde uma disputa se resolve. */
  let disputasContadas = results.length;

  /** A disputa do jogador esperando `report()`. Derivada, nunca serializada. */
  let pendente: Confronto | null = null;

  const classificado = (g: number, posicao: number): CountryCode =>
    em(groupOrder, g * POR_GRUPO + posicao);

  function vencedorDe(i: number): CountryCode {
    const d = disputaEm(i);
    return em(results, i) === 0 ? d.teams.A : d.teams.B;
  }

  function perdedorDe(i: number): CountryCode {
    const d = disputaEm(i);
    return em(results, i) === 0 ? d.teams.B : d.teams.A;
  }

  /** O par da posição `i` da fila, sobre o estado cru de agora. Ver `confrontoEm`. */
  function disputaEm(i: number): Confronto {
    return confrontoEm(entrants, groupOrder, results, i);
  }

  /** Todas as disputas de grupo já resolvidas, na forma que a tabela consome. */
  function jogosDeGrupo(): Jogo[] {
    const saida: Jogo[] = [];
    const ate = Math.min(results.length, DISPUTAS_DE_GRUPO);
    for (let i = 0; i < ate; i += 1) {
      const d = disputaEm(i);
      saida.push({
        a: d.teams.A,
        b: d.teams.B,
        vencedor: vencedorDe(i),
        golsA: em(goalsA, i),
        golsB: em(goalsB, i),
      });
    }
    return saida;
  }

  /**
   * Fecha a fase de grupos: classifica os 8 grupos **uma vez** e grava a ordem.
   *
   * Uma vez, e não a cada leitura, porque o desempate pode chegar ao sorteio (`D-53`) e sorteio
   * consumido duas vezes andaria o gerador — a linha do tempo depois da restauração deixaria de
   * bater com a de antes, que é exatamente o portão que este módulo tem de cumprir.
   */
  function fecharGrupos(): void {
    if (groupOrder.length === ENTRANTS) return;
    const jogos = jogosDeGrupo();
    const ordem: CountryCode[] = [];
    for (let g = 0; g < GRUPOS; g += 1) {
      const codes = entrants.slice(g * POR_GRUPO, g * POR_GRUPO + POR_GRUPO);
      ordem.push(...ordenarGrupo(codes, jogos, rng));
    }
    groupOrder = ordem;
  }

  /** O grupo em que `code` caiu, ou `-1`. */
  function grupoDe(code: CountryCode): number {
    const i = entrants.indexOf(code);
    return i === -1 ? -1 : Math.floor(i / POR_GRUPO);
  }

  /**
   * O jogador está fora?
   *
   * **Derivado dos resultados, nunca guardado.** Um sinalizador a mais no retrato seria um
   * segundo dono da mesma verdade, e o retrato voltando do armazenamento poderia trazê-lo
   * mentindo. Perder a semifinal **não** elimina: sobra a disputa de 3º lugar.
   */
  function jogadorFora(): boolean {
    if (groupOrder.length === ENTRANTS) {
      const g = grupoDe(human);
      if (classificado(g, 0) !== human && classificado(g, 1) !== human) return true;
    }
    for (let i = DISPUTAS_DE_GRUPO; i < results.length; i += 1) {
      if (disputaEm(i).stage === 'semi') continue;
      if (perdedorDe(i) === human) return true;
    }
    return false;
  }

  /**
   * Simula uma disputa sem o jogador: M2 com **duas** CPUs de M3 (`D-57`).
   *
   * **`D-66`: um `Cpu` por disputa, por lado.** Os dois histogramas nascem aqui e morrem no
   * `return` — nenhum atravessa o torneio. Reusar a instância nas disputas seguintes daria a
   * progressão *implícita* que `D-60` recusou: a CPU chegaria à final tendo lido o adversário o
   * torneio inteiro, sem que ninguém tivesse decidido que a dificuldade sobe.
   *
   * O nível é o mesmo do grupo à final (`D-60`), e o teto de 70% de `D-10` continua sendo de M3
   * — este módulo não mexe em peso nenhum.
   */
  function simular(): { vencedor: Side; golsA: number; golsB: number } {
    const first: Side = rng.int(2) === 0 ? 'A' : 'B';
    const cpus: Record<Side, Cpu> = { A: createCpu(level, rng), B: createCpu(level, rng) };

    let estado: MatchState = createMatch(first);
    let cobrancas = 0;

    while (estado.phase !== 'finished') {
      const cobrador = estado.turn;
      if (cobrador === null) {
        throw new Error('M8: disputa simulada sem vez definida fora do fim — defeito de M2 ou M8');
      }
      const goleiro = outro(cobrador);

      // Escolhem ANTES de observar, como M5 faz (`D-26`). Depois de `D-103` (`Q-08` saída C,
      // cada papel lê o histograma do ADVERSÁRIO) a ordem é obrigatória: observar primeiro
      // deixaria o goleiro ler o chute desta mesma cobrança. `D-105` prende isto por teste
      // (`src/tests/tournament_ordem.test.ts`): invertidas, estas linhas dão 1 falha (`QA-44`).
      const chute = cpus[cobrador].pick('shooter');
      const defesa = cpus[goleiro].pick('keeper');
      cpus[cobrador].observe('keeper', defesa);
      cpus[goleiro].observe('shooter', chute);

      estado = play(estado, chute, defesa);

      cobrancas += 1;
      if (cobrancas > TETO_COBRANCAS) {
        throw new Error(
          `M8: disputa simulada passou de ${String(TETO_COBRANCAS)} cobranças — ver TETO_COBRANCAS`,
        );
      }
    }

    const vencedor = estado.winner;
    if (vencedor === null) {
      throw new Error('M8: disputa simulada terminou sem vencedor — defeito de M2');
    }
    return { vencedor, golsA: estado.goals.A, golsB: estado.goals.B };
  }

  /** O ÚNICO ponto em que uma disputa se resolve — e por isso o único que conta. */
  function registrar(vencedor: Side, gols: { a: number; b: number }): void {
    results.push(vencedor === 'A' ? 0 : 1);
    goalsA.push(gols.a);
    goalsB.push(gols.b);
    disputasContadas += 1;
    if (disputasContadas !== results.length) {
      throw new Error('M8: contador de disputas divergiu da fila — defeito de M8');
    }
  }

  /**
   * Anda a fila até parar na disputa do jogador — ou até o campeão, se ele já está fora.
   *
   * **O jogador eliminado não encerra o torneio** (`D-57`): daqui em diante tudo é simulado de
   * uma vez, `current()` passa a devolver `null` e `champion()` responde. 64 disputas é o portão,
   * e um torneio que para na eliminação entrega menos que isso.
   */
  function avancar(): void {
    pendente = null;
    while (results.length < DISPUTAS) {
      if (results.length === DISPUTAS_DE_GRUPO) fecharGrupos();

      const d = disputaEm(results.length);
      const doJogador = d.teams.A === human || d.teams.B === human;

      if (doJogador && !jogadorFora()) {
        pendente = d;
        return;
      }

      const r = simular();
      registrar(r.vencedor, { a: r.golsA, b: r.golsB });
    }
  }

  avancar();

  return {
    current() {
      if (pendente === null) return null;
      return {
        teams: { A: pendente.teams.A, B: pendente.teams.B },
        stage: pendente.stage,
        round: pendente.round,
      };
    },

    report(winner: Side): void {
      if (!SIDES.includes(winner)) {
        throw new RangeError(
          `Tournament.report: vencedor deve ser 'A' | 'B'; recebido ${String(winner)}`,
        );
      }
      if (pendente === null) {
        throw new Error(
          'Tournament.report: não há disputa do jogador esperando resultado — current() devolve null',
        );
      }
      // O placar não vem por aqui (porta congelada, `D-58`): fica declarado como ausente, e
      // ausente não é zero. Ver `GOLS_DESCONHECIDOS` e `Q-13`.
      registrar(winner, { a: GOLS_DESCONHECIDOS, b: GOLS_DESCONHECIDOS });
      avancar();
    },

    group(code: CountryCode): readonly Standing[] {
      const g = grupoDe(code);
      if (g === -1) throw new RangeError(`Tournament.group: ${String(code)} não está no torneio`);

      const jogos = jogosDeGrupo();
      // Fechada a fase, a ordem é a que já foi decidida — reordenar aqui poderia consumir
      // sorteio de novo e mover o gerador. Antes disso a leitura é provisória e **não sorteia**.
      const ordem =
        groupOrder.length === ENTRANTS
          ? groupOrder.slice(g * POR_GRUPO, g * POR_GRUPO + POR_GRUPO)
          : ordenarGrupo(entrants.slice(g * POR_GRUPO, g * POR_GRUPO + POR_GRUPO), jogos, null);

      return Object.freeze(tabelaOrdenada(ordem, jogos).map((l) => Object.freeze(l)));
    },

    champion(): CountryCode | null {
      return results.length === DISPUTAS ? vencedorDe(DISPUTAS - 1) : null;
    },

    toJSON(): TournamentState {
      if (disputasContadas !== results.length) {
        throw new Error('M8: contador de disputas divergiu da fila — defeito de M8');
      }
      return Object.freeze({
        v: FORMATO_V,
        seed,
        consumed: consumidos(),
        level: LEVELS.indexOf(level),
        human,
        entrants: Object.freeze([...entrants]),
        groupOrder: Object.freeze([...groupOrder]),
        results: Object.freeze([...results]),
        goalsA: Object.freeze([...goalsA]),
        goalsB: Object.freeze([...goalsB]),
        played: disputasContadas,
      });
    },
  };
}

/**
 * Cria o torneio: sorteia os grupos e anda até a primeira disputa do jogador.
 *
 * **O sorteio dos grupos é CEGO (`D-59`)** — as 32 caem nos 8 grupos direto pelo `Rng`, sem potes
 * e sem cabeça de chave. 50,2% das sementes põem ao menos duas das quatro primeiras no mesmo
 * grupo: é o comportamento pretendido, e um teste que reprovasse "grupo forte demais" estaria
 * reprovando `D-59`.
 *
 * Recebe a **semente**, não um `Rng` pronto (`D-58`) — ver `contador`.
 *
 * @throws TypeError se a configuração não fecha (32 seleções, todas em M4, sem repetida, com a
 *   do jogador entre elas, nível válido e semente inteira segura).
 */
export function createTournament(cfg: TournamentConfig): Tournament {
  if (cfg === null || typeof cfg !== 'object') {
    throw new TypeError('createTournament: configuração ausente');
  }
  if (!LEVELS.includes(cfg.level)) {
    throw new TypeError(`createTournament: nível inválido; recebido ${String(cfg.level)}`);
  }
  if (!Number.isSafeInteger(cfg.seed)) {
    throw new TypeError(
      `createTournament: seed deve ser inteiro seguro; recebido ${String(cfg.seed)}`,
    );
  }
  assertEntrants(cfg.entrants, cfg.human, 'createTournament');

  const { rng, consumidos } = contador(createRng(cfg.seed));

  // Fisher-Yates: a posição de cada seleção é uniforme, e a fatia de 4 em que ela cai é o grupo.
  const sorteadas = [...cfg.entrants];
  for (let i = sorteadas.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const a = em(sorteadas, i);
    sorteadas[i] = em(sorteadas, j);
    sorteadas[j] = a;
  }

  return montar(cfg.level, cfg.human, sorteadas, rng, consumidos, cfg.seed, {
    groupOrder: [],
    results: [],
    goalsA: [],
    goalsB: [],
  });
}

/** Recusa retrato que não fecha consigo mesmo. */
function assertState(s: TournamentState, onde: string): void {
  const erro = (motivo: string): never => {
    throw new TypeError(`${onde}: ${motivo}`);
  };

  if (s === null || typeof s !== 'object') erro('retrato ausente');
  if (s.v !== FORMATO_V) {
    erro(`versão de formato ${String(s.v)} desconhecida (esperado ${String(FORMATO_V)})`);
  }
  if (!Number.isSafeInteger(s.seed)) erro(`seed inválida (${String(s.seed)})`);
  if (!Number.isInteger(s.consumed) || s.consumed < 0) {
    erro(`consumed inválido (${String(s.consumed)})`);
  }
  if (!Number.isInteger(s.level) || LEVELS[s.level] === undefined) {
    erro(`nível inválido (${String(s.level)})`);
  }

  for (const nome of ['entrants', 'groupOrder', 'results', 'goalsA', 'goalsB'] as const) {
    if (!Array.isArray(s[nome])) erro(`${nome} não é lista`);
  }

  assertEntrants(s.entrants, s.human, onde);

  if (s.results.length > DISPUTAS) {
    erro(`results tem ${String(s.results.length)} disputas (máx ${String(DISPUTAS)})`);
  }
  for (const r of s.results) {
    if (r !== 0 && r !== 1) erro(`resultado inválido (${String(r)}) — só 0 ou 1`);
  }
  if (s.goalsA.length !== s.results.length || s.goalsB.length !== s.results.length) {
    erro('goalsA/goalsB não acompanham results');
  }
  for (const g of [...s.goalsA, ...s.goalsB]) {
    if (!Number.isInteger(g) || g < GOLS_DESCONHECIDOS) erro(`gols inválidos (${String(g)})`);
  }
  if (s.played !== s.results.length) {
    erro(`played (${String(s.played)}) não bate com as ${String(s.results.length)} gravadas`);
  }

  if (s.groupOrder.length === 0) {
    if (s.results.length > DISPUTAS_DE_GRUPO) {
      erro('mata-mata gravado sem a classificação dos grupos');
    }
    return;
  }

  if (s.groupOrder.length !== ENTRANTS) {
    erro(`groupOrder tem ${String(s.groupOrder.length)} códigos (esperado ${String(ENTRANTS)})`);
  }
  // Cada grupo se classifica dentro de si: a ordem não pode misturar seleções de grupos — e
  // conferir grupo a grupo já prova, de quebra, que é permutação das 32.
  for (let g = 0; g < GRUPOS; g += 1) {
    const doGrupo = new Set(s.entrants.slice(g * POR_GRUPO, g * POR_GRUPO + POR_GRUPO));
    const ordenadas = new Set(s.groupOrder.slice(g * POR_GRUPO, g * POR_GRUPO + POR_GRUPO));
    if (ordenadas.size !== POR_GRUPO) erro(`groupOrder repete seleção no grupo ${String(g)}`);
    for (const code of ordenadas) {
      if (!doGrupo.has(code)) {
        erro(`groupOrder mistura grupos (${String(code)} não é do grupo ${String(g)})`);
      }
    }
  }
}

/**
 * Restaura o torneio a partir do retrato de `toJSON()`.
 *
 * **Restaurar o chaveamento não restaura o gerador** — a porta de M1 não tem cursor. Por isso o
 * gerador é refeito da semente e os `consumed` sorteios já entregues são **descartados**, um a
 * um (`D-58`). São alguns milhares de `int()`: custo irrelevante, e a alternativa era mexer na
 * porta mais dependida do projeto.
 *
 * @throws TypeError se o retrato não fecha consigo mesmo. Quem chama é M7, e o portão de `T-14`
 *   diz o que ele faz com o erro: descarta o torneio salvo em silêncio e abre no menu.
 */
export function restoreTournament(state: TournamentState): Tournament {
  assertState(state, 'restoreTournament');

  const { rng, consumidos } = contador(createRng(state.seed));
  for (let i = 0; i < state.consumed; i += 1) rng.int(2);

  const level = LEVELS[state.level];
  if (level === undefined) {
    throw new TypeError(`restoreTournament: nível inválido (${String(state.level)})`);
  }

  return montar(level, state.human, [...state.entrants], rng, consumidos, state.seed, {
    groupOrder: [...state.groupOrder],
    results: [...state.results],
    goalsA: [...state.goalsA],
    goalsB: [...state.goalsB],
  });
}

/* ─────────────────── o chaveamento inteiro, LIDO (`D-111` / `P-3`) ─────────────────── */

/**
 * Quantas disputas precisam estar registradas para a posição `i` ter par decidido.
 *
 * O mata-mata é derivado: as quartas saem dos vencedores das oitavas, as semis das quartas, e a
 * de 3º lugar e a final saem das duas semis. Enquanto o requisito não é alcançado, o par
 * **ainda depende de resultado** — e `chaveamento` não inventa par, ela para.
 *
 * As oitavas dependem da classificação, não de um resultado a mais: quem cobra isso é o
 * `groupOrder` fechado, em `chaveamento`.
 */
function requisito(i: number): number {
  if (i < DISPUTAS_DE_GRUPO) return 0;
  if (i < INICIO_QUARTAS) return DISPUTAS_DE_GRUPO;
  if (i < INICIO_SEMIS) return DISPUTAS_DE_GRUPO + 2 * (i - INICIO_QUARTAS) + 2;
  if (i < POSICAO_TERCEIRO) return INICIO_QUARTAS + 2 * (i - INICIO_SEMIS) + 2;
  return POSICAO_TERCEIRO; // 3º lugar e final: as duas semis
}

/**
 * As disputas cujo par M8 já decidiu, na ordem da fila (`D-111`, saída **(c)** de `P-3`).
 *
 * **Pura.** Lê o retrato e não devolve nada além da lista: não constrói torneio, não toca o
 * gerador e não escreve no estado — duas chamadas sobre o mesmo retrato dão listas iguais campo
 * a campo, e o retrato sai idêntico ao que entrou, `consumed` inclusive. Isso não é detalhe de
 * implementação: fechar um grupo consome sorteio (o desempate pode chegar ao sorteio, `D-53`),
 * e uma leitura que fechasse grupo moveria o gerador — a linha do tempo depois do recarregamento
 * deixaria de bater com a de antes.
 *
 * **Só o que já foi decidido entra.** São **48** enquanto a classificação não fechou, **56**
 * assim que ela fecha, e **64** quando há campeão. Um par de fase que ainda depende de
 * resultado não aparece com times "a definir": ele não aparece.
 *
 * **Por que função na porta, e não 6º método em `Tournament`** (`D-111`): M7 lê o chaveamento a
 * partir do retrato que ele mesmo gravou, sem ter de reconstruir o torneio; e as 64 continuam
 * **derivadas** por M8 — a saída rejeitada copiaria a derivação para `src/ui/`.
 *
 * @throws TypeError se o retrato não fecha consigo mesmo (mesma conferência de
 *   `restoreTournament`; ler um retrato corrompido é tão inválido quanto restaurá-lo).
 */
export function chaveamento(state: TournamentState): readonly Disputa[] {
  assertState(state, 'chaveamento');

  const { entrants, groupOrder, results, goalsA, goalsB } = state;
  const gruposFechados = groupOrder.length === ENTRANTS;

  const saida: Disputa[] = [];
  for (let i = 0; i < DISPUTAS; i += 1) {
    if (i >= DISPUTAS_DE_GRUPO && !gruposFechados) break;
    if (results.length < requisito(i)) break;

    const confronto = confrontoEm(entrants, groupOrder, results, i);
    const jogada = i < results.length;

    // Ausente não é zero (`D-67`). O placar da disputa do jogador nunca existiu — `report()`
    // carrega o vencedor e nada mais —, e o da que ainda não foi jogada também não.
    const golsA = jogada ? em(goalsA, i) : GOLS_DESCONHECIDOS;
    const golsB = jogada ? em(goalsB, i) : GOLS_DESCONHECIDOS;
    const conhecido = golsA !== GOLS_DESCONHECIDOS && golsB !== GOLS_DESCONHECIDOS;

    saida.push(
      Object.freeze({
        stage: confronto.stage,
        round: confronto.round,
        group: confronto.grupo,
        teams: Object.freeze({ A: confronto.teams.A, B: confronto.teams.B }),
        winner: jogada ? (em(results, i) === 0 ? 'A' : 'B') : null,
        goals: conhecido ? Object.freeze({ A: golsA, B: golsB }) : null,
      }),
    );
  }

  return Object.freeze(saida);
}
