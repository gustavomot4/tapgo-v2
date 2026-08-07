/**
 * M6 — Transporte online P2P: **só a superfície de tipos**.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M6 — Transporte online P2P".
 *
 * **Este arquivo não implementa M6.** Ele existe porque a porta congelada de M5 declara
 * `export type { LinkStatus } from '../net'`, e sem um `../net` o portão de T-09 ("M5 reexporta
 * `MatchState`, `LinkStatus` e `Level`") seria impossível de cumprir — e, atrás dele, o portão
 * de camada de M7 ficaria impossível de cumprir para `LinkStatus` já em T-10.
 *
 * Nada aqui é invenção: cada declaração é cópia literal do contrato que `D-13` congelou.
 * `hostRoom`, `joinRoom`, o relógio de timeout e a decisão de TURN são de **T-11**, e é lá que
 * entram — junto com a linha de custo em `stack.md` que este arquivo, sendo só tipo, não gera.
 *
 * Aberto por `D-24`.
 */

import type { Side, Zone } from '../core/index';

/**
 * Status do canal, **incluindo a falha** — é contrato que a falha seja um estado nomeado, e
 * não uma exceção: tela travada sem explicação foi o que o PLANO proibiu para M6.
 */
export type LinkStatus = 'idle' | 'waiting' | 'connected' | 'failed' | 'closed';

/**
 * Uma jogada serializada — dezenas de bytes.
 *
 * `seq` é o nº de sequência que deixa M5 descartar evento repetido ou fora de ordem. Note que
 * M6 carrega o número mas **não o interpreta**: quem decide o que é jogada válida é M5, contra
 * o `MatchState` de M2. M6 não sabe o que é gol.
 */
export interface Move {
  seq: number;
  side: Side;
  zone: Zone;
}

/** Configuração de relay. Existe para o TURN ser trocado sem tocar em mais nada (T-11). */
export interface IceConfig {
  turn?: { urls: string; username: string; credential: string };
}

export interface Channel {
  send(m: Move): void;
  onMove(fn: (m: Move) => void): void;
  onStatus(fn: (s: LinkStatus) => void): void;
  close(): void;
}
