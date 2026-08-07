/**
 * M3 — CPU: escolhe uma zona ponderando o histórico de zonas do jogador na sessão.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M3 — CPU".
 * Regra:    `77777777_TAPGO_Project_DOCs/a_context/regras_partida.md` → "CPU (`D-10`)".
 *
 * Importa só M1. Sem I/O, sem relógio do sistema, sem gerador nativo e sem armazenamento do
 * navegador: todo acaso entra pelo `Rng` recebido, que é o que sustenta "mesma semente +
 * mesmas entradas = mesmas escolhas". Não conhece placar, cobrança nem M2 — só zonas.
 *
 * As palavras proibidas não aparecem nem em comentário: o portão de E-2 varre este diretório
 * por texto, e uma citação em comentário reprova a varredura tanto quanto uma chamada real.
 */

import type { Rng, Zone } from '../core/index';

/** Nível de dificuldade — peso do histórico: 0% · 50% · 70% (`D-10`). */
export type Level = 'easy' | 'medium' | 'hard';

/** Papel na cobrança: cobrando · defendendo. */
export type Role = 'shooter' | 'keeper';

export interface Cpu {
  /** Registra o que o HUMANO escolheu, no papel dele. */
  observe(role: Role, zone: Zone): void;
  /** Devolve o que a CPU escolhe, no papel dela. Consome exatamente 1 valor do `Rng`. */
  pick(role: Role): Zone;
}

/** As três zonas, em ordem fixa. A ordem é parte do determinismo — não reordenar. */
const ZONES: readonly [Zone, Zone, Zone] = ['L', 'C', 'R'];

const ROLES: readonly Role[] = ['shooter', 'keeper'];

const LEVELS: readonly Level[] = ['easy', 'medium', 'hard'];

/**
 * Toda probabilidade deste módulo vive em partes por milhão, em inteiro.
 *
 * Não é preciosismo: em float, o teto de `D-10` só poderia ser conferido dentro de uma
 * tolerância, e "70,0000001%" passaria calado. Em inteiro, o teste compara por igualdade.
 */
const SCALE = 1_000_000;

/** Teto absoluto de `D-10`: 70%. Nenhum nível, progressão ou torneio passa disso (`D-20`). */
export const CEILING_PPM = 700_000;

/** Peso do histórico por nível, em ppm (`D-10`). */
const LEVEL_WEIGHT_PPM: Readonly<Record<Level, number>> = {
  easy: 0,
  medium: 500_000,
  hard: 700_000,
};

/** Distribuição sobre as três zonas, na ordem de `ZONES`. */
type Triple = [number, number, number];

/** Leitura por índice numérico. `noUncheckedIndexedAccess` exige o guarda — e ele é real. */
function at(triple: Triple, i: number): number {
  const valor = triple[i];
  if (valor === undefined) {
    throw new RangeError(`índice de zona fora da faixa: ${String(i)}`);
  }
  return valor;
}

function assertRole(role: Role, metodo: string): void {
  if (!ROLES.includes(role)) {
    throw new TypeError(`Cpu.${metodo}: papel inválido; recebido ${String(role)}`);
  }
}

function assertZone(zone: Zone, metodo: string): void {
  if (!ZONES.includes(zone)) {
    throw new TypeError(`Cpu.${metodo}: zona inválida; recebido ${String(zone)}`);
  }
}

/**
 * Distribuição de zonas em ppm para um histograma, já com o teto de `D-10` aplicado.
 * Soma exatamente `SCALE`, e nenhuma entrada passa de `CEILING_PPM`.
 *
 * Exportada de propósito, e não só usada por dentro: é o que deixa o teto ser testado por
 * **igualdade exata**, sem tolerância amostral. Medir só por frequência conferiria o teto
 * apenas dentro do ruído do sorteio — e a diferença entre 70% e 71% se esconde nesse ruído.
 *
 * @param level nível de dificuldade
 * @param counts quantas vezes o humano escolheu cada zona, neste papel
 */
export function zoneDistributionPpm(
  level: Level,
  counts: Readonly<Record<Zone, number>>,
): Triple {
  if (!LEVELS.includes(level)) {
    throw new TypeError(`zoneDistributionPpm: nível inválido; recebido ${String(level)}`);
  }

  const c: Triple = [counts.L, counts.C, counts.R];
  for (const n of c) {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError(
        `zoneDistributionPpm: contagem deve ser inteiro >= 0; recebido ${String(n)}`,
      );
    }
  }

  const total = c[0] + c[1] + c[2];

  // Histórico vazio ⇒ uniforme em QUALQUER nível (`D-10`). Sem este ramo o termo do
  // histórico seria 0/0; com ele, a primeira cobrança de uma sessão é sempre 1/3.
  const w = total === 0 ? 0 : LEVEL_WEIGHT_PPM[level];
  const t = total === 0 ? 1 : total;

  // p(z) = w·c[z]/total + (1−w)/3, escrita como num[z]/denom para ficar em inteiro.
  // Σ num = 3·w·t + 3·(SCALE−w)·t = denom·SCALE, então a soma fecha por construção.
  const denom = 3 * t;
  const num: Triple = [
    w * c[0] * 3 + (SCALE - w) * t,
    w * c[1] * 3 + (SCALE - w) * t,
    w * c[2] * 3 + (SCALE - w) * t,
  ];

  const dist: Triple = [
    Math.floor(num[0] / denom),
    Math.floor(num[1] / denom),
    Math.floor(num[2] / denom),
  ];
  const resto: Triple = [num[0] % denom, num[1] % denom, num[2] % denom];

  // Cada `floor` perde menos de 1 unidade, então sobram 0, 1 ou 2 unidades. Vão para os
  // maiores restos; empate desempata pelo menor índice — sorteio aqui quebraria a semente.
  const sobra = SCALE - (dist[0] + dist[1] + dist[2]);
  const ordem: Triple = [0, 1, 2];
  ordem.sort((a, b) => at(resto, b) - at(resto, a) || a - b);
  for (let i = 0; i < sobra; i += 1) {
    const alvo = at(ordem, i);
    dist[alvo] = at(dist, alvo) + 1;
  }

  // ── Teto absoluto de `D-10` (`D-20`) ────────────────────────────────────────────────
  // A mistura crua já viola o teto no nível difícil: histórico todo numa zona dá
  // 0,70 + 0,30/3 = 80%. O teto é aplicado DEPOIS da mistura, como corte próprio, e por
  // isso continua valendo se um dia um torneio ou uma progressão mexer nos pesos.
  // Só uma zona pode passar de 70%, porque as três somam 100%.
  const excedente = dist.findIndex((p) => p > CEILING_PPM);
  if (excedente !== -1) {
    const excesso = at(dist, excedente) - CEILING_PPM;
    dist[excedente] = CEILING_PPM;

    const outras = [0, 1, 2].filter((i) => i !== excedente);
    const a = outras[0] ?? 0;
    const b = outras[1] ?? 0;
    const somaOutras = at(dist, a) + at(dist, b);

    // Reparte o excesso na proporção do que cada uma já tinha; se as duas estavam zeradas,
    // meio a meio. O resto ímpar vai para o menor índice — determinístico, nunca sorteado.
    const paraA =
      somaOutras === 0
        ? Math.floor(excesso / 2)
        : Math.floor((excesso * at(dist, a)) / somaOutras);
    dist[a] = at(dist, a) + paraA;
    dist[b] = at(dist, b) + (excesso - paraA);
  }

  // Invariantes no lugar mais forte que existe sem banco: aqui, não no chamador.
  // Falha alta é mais barata que uma CPU sorteando com distribuição torta em silêncio.
  const soma = dist[0] + dist[1] + dist[2];
  if (soma !== SCALE) {
    throw new RangeError(`zoneDistributionPpm: soma ${String(soma)} != ${String(SCALE)}`);
  }
  const maior = Math.max(dist[0], dist[1], dist[2]);
  if (maior > CEILING_PPM) {
    throw new RangeError(
      `zoneDistributionPpm: ${String(maior)} ppm passa do teto de ${String(CEILING_PPM)}`,
    );
  }

  return dist;
}

/** Sorteia uma zona. Consome exatamente 1 valor do `Rng` — a conta do determinismo. */
function sortear(dist: Triple, rng: Rng): Zone {
  const r = rng.int(SCALE);
  let acumulado = 0;
  for (let i = 0; i < ZONES.length; i += 1) {
    acumulado += at(dist, i);
    if (r < acumulado) {
      const zona = ZONES[i];
      if (zona === undefined) break;
      return zona;
    }
  }
  // Inalcançável: `dist` soma SCALE e `r < SCALE`. Se chegar aqui é defeito de soma, e
  // devolver 'L' calado esconderia justamente o defeito que o teto existe para impedir.
  throw new RangeError(`Cpu.pick: sorteio ${String(r)} não caiu em zona nenhuma`);
}

/**
 * Cria a CPU. Os dois histogramas nascem vazios e vivem só nesta instância.
 *
 * @param level nível de dificuldade (`D-10`)
 * @param rng gerador de M1 — a mesma semente reproduz as mesmas escolhas
 */
export function createCpu(level: Level, rng: Rng): Cpu {
  if (!LEVELS.includes(level)) {
    throw new TypeError(`createCpu: nível inválido; recebido ${String(level)}`);
  }
  if (rng === null || typeof rng !== 'object' || typeof rng.int !== 'function') {
    throw new TypeError('createCpu: rng deve ser um Rng de M1 (com int(maxExclusive))');
  }

  // Os DOIS histogramas do contrato, um por papel. A distribuição de quem cobra não é a de
  // quem defende; um histograma só leria as duas como uma e a CPU responderia a um padrão
  // que o jogador nunca teve. Em memória, escopo da instância: somem no reload da página.
  // Persistir isto no navegador é proibido — é estado de partida, não dado do aparelho (`D-10`).
  const historico: Record<Role, Record<Zone, number>> = {
    shooter: { L: 0, C: 0, R: 0 },
    keeper: { L: 0, C: 0, R: 0 },
  };

  return {
    observe(role: Role, zone: Zone): void {
      assertRole(role, 'observe');
      assertZone(zone, 'observe');
      historico[role][zone] += 1;
    },

    pick(role: Role): Zone {
      assertRole(role, 'pick');
      return sortear(zoneDistributionPpm(level, historico[role]), rng);
    },
  };
}
