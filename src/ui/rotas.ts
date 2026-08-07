/**
 * M7 — as quatro telas e o que atravessa todas elas.
 *
 * Arquivo só de tipos e de uma constante, para que `main.ts` e as telas se enxerguem sem que
 * duas delas importem uma à outra.
 */

import type { CountryCode, Side } from '../core/index';
import type { Level, MatchState } from '../session/index';
import type { ModoJogavel } from './derivacao';
import type { Preferencias } from './preferencias';
import type { Som } from './som';

/**
 * Tudo que a tela de cobrança precisa para criar a sessão — e nada além.
 *
 * `nivel: null` fora do modo `cpu` é literal: `createSession` **recusa** `level` em `local`
 * ("level só existe no modo cpu"), então a tela não pode carregar um nível "de reserva".
 */
export interface Partida {
  readonly modo: ModoJogavel;
  readonly nivel: Level | null;
  readonly times: Readonly<Record<Side, CountryCode>>;
  readonly ladoLocal: Side;
  readonly semente: number;
}

export type Rota =
  | { readonly nome: 'inicio' }
  | { readonly nome: 'selecoes'; readonly modo: ModoJogavel; readonly nivel: Level | null }
  | { readonly nome: 'cobranca'; readonly partida: Partida }
  | { readonly nome: 'fim'; readonly partida: Partida; readonly estado: MatchState };

export interface Contexto {
  readonly som: Som;
  prefs(): Preferencias;
  salvarPrefs(p: Preferencias): void;
  ir(rota: Rota): void;
  /**
   * Pede que o pacote da cena Phaser comece a chegar, sem esperar por ele.
   *
   * Chamado pela tela de seleções: enquanto a pessoa escolhe, o `import()` dinâmico anda. Sem
   * isso, a espera inteira apareceria na abertura da cobrança, que é onde ela incomoda.
   */
  aquecerCena(): void;
}

/** Uma tela desenha em `raiz` e devolve o que desfazer quando ela sair. */
export type Tela = (raiz: HTMLElement, ctx: Contexto) => () => void;

/** O lado do humano no modo `cpu`. `'A'` cobra primeiro (`FIRST` de M2), e é o que a tela promete. */
export const LADO_DO_HUMANO: Side = 'A';
