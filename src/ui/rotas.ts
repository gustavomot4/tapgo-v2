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
import type { TorneioEmCurso } from './torneio_salvo';

/**
 * Tudo que a tela de cobrança precisa para criar a sessão — e nada além.
 *
 * `nivel: null` fora do modo `cpu` é literal: `createSession` **recusa** `level` em `local`
 * ("level só existe no modo cpu"), então a tela não pode carregar um nível "de reserva".
 */
export interface Partida {
  readonly modo: ModoJogavel;
  /**
   * `true` quando esta disputa é uma disputa do torneio (`T-14`).
   *
   * É o que diz à tela de fim para devolver o vencedor a M8 por `report()` em vez de oferecer
   * "jogar de novo": a MESMA tela de cobrança serve os dois casos, e ela não precisa saber de
   * torneio nenhum para isso. Campo obrigatório de propósito — `false` escrito em cada criação
   * é mais barato que descobrir, seis meses depois, qual dos caminhos esqueceu de marcar.
   */
  readonly torneio: boolean;
  readonly nivel: Level | null;
  readonly times: Readonly<Record<Side, CountryCode>>;
  readonly ladoLocal: Side;
  readonly semente: number;
}

export type Rota =
  | { readonly nome: 'inicio' }
  | { readonly nome: 'selecoes'; readonly modo: ModoJogavel; readonly nivel: Level | null }
  | { readonly nome: 'cobranca'; readonly partida: Partida }
  | { readonly nome: 'fim'; readonly partida: Partida; readonly estado: MatchState }
  | { readonly nome: 'torneio_novo' }
  | { readonly nome: 'torneio' }
  | { readonly nome: 'campeao' };

export interface Contexto {
  readonly som: Som;
  prefs(): Preferencias;
  salvarPrefs(p: Preferencias): void;
  ir(rota: Rota): void;
  /**
   * O torneio vivo, ou `null` quando não há nenhum em andamento.
   *
   * Mora no contexto, e não numa tela, porque ele atravessa três delas (chaveamento, cobrança e
   * campeão) e sobrevive à troca de rota. O retrato salvo é assunto de `torneio_salvo.ts`.
   */
  torneio(): TorneioEmCurso | null;
  /**
   * Troca o torneio vivo e ACERTA o salvo na mesma chamada: `null` apaga o retrato.
   *
   * Um só ponto de escrita porque dois donos da mesma verdade é como o torneio salvo passaria a
   * divergir do da memória — e o que a pessoa reabriria seria o divergente.
   */
  definirTorneio(t: TorneioEmCurso | null): void;
  /** Grava o retrato do torneio vivo. Chamado depois de cada `report()`. */
  salvarTorneio(): void;
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

/**
 * O lado do humano no modo `cpu` — o da seleção que ele escolheu como "Sua seleção", e nada além.
 *
 * **Não diz quem cobra primeiro** (`QA-15`, `D-48`). Quem cobra primeiro é sorteado por M5 na
 * criação da sessão e chega às telas em `state().turn`; a versão anterior deste comentário
 * prometia a ordem, e a promessa virou mentira no dia em que o sorteio entrou. Se alguém precisar
 * do primeiro cobrador, é de lá que ele sai — não daqui.
 *
 * No modo `local` os dois lados são deste aparelho e M5 ignora este valor; ele viaja junto só
 * porque `createSession` exige `localSide` nos dois modos.
 */
export const LADO_DO_HUMANO: Side = 'A';
