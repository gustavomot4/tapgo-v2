/**
 * M7 — as quatro telas e o que atravessa todas elas.
 *
 * Arquivo só de tipos e de uma constante, para que `main.ts` e as telas se enxerguem sem que
 * duas delas importem uma à outra.
 */

import type { CountryCode, Side } from '../core/index';
import type { Level, MatchState, Session } from '../session/index';
import type { ModoJogavel } from './derivacao';
import type { Preferencias } from './preferencias';
import type { Som } from './som';
import type { TorneioEmCurso } from './torneio_salvo';

/**
 * O placar da série de revanches: vitórias de cada lado, em inteiro (`T-32`).
 *
 * Mesmo formato de `times`, e de propósito — os dois são indexados por `Side`, e quem monta a
 * frase da série lê os dois lado a lado.
 */
export type Serie = Readonly<Record<Side, number>>;

/** Série sem nenhuma partida. O valor com que toda `Partida` nasce. */
export const SERIE_ZERO: Serie = { A: 0, B: 0 };

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
  /**
   * O ID da sala do modo `online` (`T-21`), e `null` nos outros dois.
   *
   * Quem o sorteia é a tela de convite, com `newRoomId` de M5 (`D-73`) — **antes** de existir
   * canal, que é o que deixa o link ser mostrado sem que o relógio de 20 s de M6 tenha armado
   * (`D-75`). Ele viaja aqui porque é o mesmo valor nos dois aparelhos: o anfitrião sorteia, o
   * convidado o recebe pelo link, e os dois entram por `roomId`.
   *
   * `null` em `cpu`/`local` é literal, não "ainda não sei": esses modos não têm sala.
   */
  readonly sala: string | null;
  /**
   * A série de revanches deste confronto (`T-32`): quantas o lado `A` venceu, quantas o `B`.
   *
   * **Conta as partidas ANTERIORES a esta**, e só elas — quem soma a que acabou de terminar é a
   * tela de fim, que é o único ponto do jogo onde existe vencedor. Inteiro sempre (`D-02`), e o
   * total de partidas da série é `A + B` porque a disputa nunca empata (`D-09`).
   *
   * **Vive só na memória, de propósito.** Nada disto é gravado: o CONTEXT diz "nenhum dado
   * pessoal coletado", e armazenamento novo pediria um `D-NN` dizendo o que fica e por quanto
   * tempo. Voltar ao início ou trocar de seleção cria uma `Partida` nova, e a série nasce
   * zerada junto — não há o que limpar.
   *
   * `SERIE_ZERO` nos modos que não têm série (`online` e `torneio`): campo obrigatório pelo mesmo
   * motivo de `torneio` acima — escrever o zero em cada criação é mais barato que descobrir,
   * depois, qual dos caminhos esqueceu de zerar.
   */
  readonly serie: Serie;
}

export type Rota =
  | { readonly nome: 'inicio' }
  | { readonly nome: 'selecoes'; readonly modo: ModoJogavel; readonly nivel: Level | null }
  | { readonly nome: 'convite'; readonly partida: Partida }
  /**
   * A cobrança, e — só no `online` — a sessão **já conectada** que a tela de convite criou.
   *
   * Por que a sessão viaja pronta, em vez de a cobrança criá-la como nos outros modos: no
   * `online` a criação É a conexão (é ela que abre o canal e arma o relógio de M6), e os dois
   * portões de `D-75` moram exatamente aí — nenhuma sessão antes do toque que declara o outro
   * lado a postos, e retentar depois de `'failed'` só enquanto o canal nunca conectou. Os dois
   * pertencem à espera, e a espera é a tela de convite. O que chega aqui já conectou; se cair
   * depois disso, é o peer que saiu, e aí `D-35` manda terminar sem resultado — nunca retentar.
   */
  | { readonly nome: 'cobranca'; readonly partida: Partida; readonly sessao?: Session }
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
