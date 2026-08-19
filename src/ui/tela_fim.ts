/**
 * M7 — tela de fim de disputa.
 *
 * Fecha o laço em um toque: "Jogar de novo" volta direto à cobrança com as MESMAS seleções e
 * semente nova. Mandar de volta ao início a cada partida de um minuto seria cobrar dois toques
 * por algo que quase todo mundo quer.
 *
 * ## Os 4 estados
 * - **carregando** e **vazio** — não existem: a tela só é alcançada com um `MatchState` já
 *   encerrado na mão. Lacunas declaradas.
 * - **erro** — a disputa terminou sem vencedor. O motor não produz esse desfecho, mas `winner`
 *   é `Side | null` no tipo, e tela que renderiza `null` mostra "undefined venceu".
 * - **sucesso** — o vencedor, o placar e o resumo das cobranças.
 */

import { newSeed } from '../core/index';
import type { MatchState } from '../session/index';
import { botao, el, focar } from './dom';
import { desfecho, nomeSelecao, nomeZona, placar } from './rotulos';
import { marca } from './tela_selecoes';
import type { Contexto, Partida, Tela } from './rotas';

/** Uma linha por cobrança: quem cobrou, para onde, e no que deu. */
function resumo(estado: MatchState, partida: Partida): HTMLElement {
  const lista = el('ol', { classe: 'grupo', attrs: { 'aria-label': 'Cobranças da disputa' } });

  estado.kicks.forEach((kick, i) => {
    lista.append(
      el('li', { classe: 'sub' }, [
        `${i + 1}. ${nomeSelecao(partida.times[kick.side])} — ${nomeZona(kick.shot)} · ${
          kick.goal ? 'gol' : 'defendeu'
        }`,
      ]),
    );
  });

  return lista;
}

export const telaFim =
  (partida: Partida, estado: MatchState): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    const tela = el('section', { classe: 'tela' });

    const vencedor = estado.winner;
    const titulo =
      vencedor === null ? 'Fim da disputa' : `${nomeSelecao(partida.times[vencedor])} venceu`;

    /*
     * O pódio (`D-65`): a bandeira do vencedor grande, e o título embaixo dela. É a única peça de
     * imagem do jogo pensada para ser lida de longe — a pessoa acabou de largar o aparelho na
     * mesa e o que ela quer saber de relance é quem ganhou.
     *
     * Sem vencedor, a MESMA caixa muda de tom para `erro`: comemorar em verde um desfecho que o
     * motor não produz seria a tela mentindo sobre o próprio estado.
     */
    const podio = el('div', {
      classe: 'resultado',
      ...(vencedor === null ? { dados: { tom: 'erro' } } : {}),
    });

    if (vencedor !== null) podio.append(marca(partida.times[vencedor], true));
    podio.append(el('h1', { classe: 'titulo resultado__titulo', texto: titulo }));

    tela.append(
      podio,
      el('div', { classe: 'placar' }, [
        el('span', { classe: 'placar__lado' }, [
          marca(partida.times.A, true),
          el('span', { texto: nomeSelecao(partida.times.A) }),
        ]),
        el('span', { classe: 'placar__numeros', texto: placar(estado) }),
        el('span', { classe: 'placar__lado placar__lado--direita' }, [
          marca(partida.times.B, true),
          el('span', { texto: nomeSelecao(partida.times.B) }),
        ]),
      ]),
      el('p', { classe: 'faixa', dados: { tom: 'bom' }, texto: desfecho(estado, partida.times) }),
    );

    if (vencedor === null) {
      // ── Estado de ERRO ──────────────────────────────────────────────────────────────────
      tela.append(
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', { texto: 'A disputa terminou sem vencedor.' }),
          el('p', { classe: 'sub', texto: 'Isso não deveria acontecer. Comece uma disputa nova.' }),
        ]),
      );
    } else {
      tela.append(resumo(estado, partida));
    }

    const denovo = botao('Jogar de novo', 'botao botao--principal', () => {
      ctx.ir({
        nome: 'cobranca',
        partida: { ...partida, semente: newSeed() },
      });
    });

    tela.append(
      el('div', { classe: 'grupo empurra' }, [
        denovo,
        botao('Voltar ao início', 'botao', () => ctx.ir({ nome: 'inicio' })),
      ]),
    );

    raiz.append(tela);
    focar(denovo);
    return () => undefined;
  };
