/**
 * M7 — tela de fim de disputa.
 *
 * Fecha o laço em um toque: "Jogar de novo" volta direto à cobrança com as MESMAS seleções e
 * semente nova. Mandar de volta ao início a cada partida de um minuto seria cobrar dois toques
 * por algo que quase todo mundo quer. No `online` o mesmo toque leva ao convite, com sala nova —
 * ver a nota em `seguir`.
 *
 * ## A disputa do torneio termina aqui, e é daqui que ela volta para M8 (`T-14`)
 * `partida.torneio` diz que esta disputa é do torneio. Nesse caso a tela **devolve o vencedor**
 * por `report(winner)` e grava o retrato: é o único ponto do jogo onde isso acontece, porque é
 * o único ponto em que a disputa do jogador está de fato encerrada. "Jogar de novo" some — ele
 * repetiria uma disputa que o chaveamento já registrou.
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

/**
 * Uma linha por cobrança: quem cobrou, para onde, e no que deu.
 *
 * **`QA-23`: o número aparece UMA vez.** A lista é `<ol>` com `.grupo`, que é `display: flex` —
 * e aí o marcador do `<li>` fica a critério do navegador: no aparelho do dono um dos dois o
 * desenhou e o outro não, então a mesma disputa saiu "1. 1. Espanha" numa foto e "1. Brasil" na
 * outra. Quem numera é o TEXTO, que renderiza igual em todo lugar; `.resumo` apaga o marcador.
 * A semântica de lista ordenada continua no `<ol>`, para quem ouve a tela.
 */
function resumo(estado: MatchState, partida: Partida): HTMLElement {
  const lista = el('ol', {
    classe: 'grupo resumo',
    attrs: { 'aria-label': 'Cobranças da disputa' },
  });

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

    /*
     * A volta para o torneio (`D-57`). Roda ANTES do desenho porque o rótulo do botão depende
     * dela, e é feita uma vez por montagem da tela — a rota só é alcançada quando a disputa
     * termina, e sair daqui não volta.
     *
     * Sem vencedor não há o que reportar: `report()` recebe um lado, e inventar um seria
     * escrever no chaveamento um resultado que a disputa não deu.
     */
    const emCurso = ctx.torneio();
    let voltouAoTorneio = false;
    if (partida.torneio && emCurso !== null && estado.winner !== null) {
      try {
        emCurso.torneio.report(estado.winner);
        ctx.salvarTorneio();
        voltouAoTorneio = true;
      } catch {
        // M8 recusa `report()` sem disputa esperando — acontece se a mesma disputa for
        // reportada duas vezes. Nada técnico na tela: o torneio segue de onde M8 o deixou.
        voltouAoTorneio = false;
      }
    }

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

    if (partida.torneio && !voltouAoTorneio) {
      // ── Estado de ERRO do torneio ───────────────────────────────────────────────────────
      tela.append(
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', { texto: 'Este resultado não entrou no torneio.' }),
          el('p', { classe: 'sub', texto: 'Volte ao torneio para ver a próxima disputa.' }),
        ]),
      );
    }

    /*
     * "Jogar de novo" não existe no `online` (`T-21`), e a razão não é enfeite: ele recriaria a
     * sessão sozinho, deste lado só, numa sala que M6 já soltou — e o outro aparelho, que
     * também está nesta tela, não seria avisado de nada. O que existe lá é convidar de novo:
     * sala nova, link novo, e este aparelho passando a ser o anfitrião (lado `A`).
     */
    const seguir = partida.torneio
      ? botao('Continuar no torneio', 'botao botao--principal', () => ctx.ir({ nome: 'torneio' }))
      : partida.modo === 'online'
        ? botao('Convidar de novo', 'botao botao--principal', () => {
            ctx.ir({
              nome: 'convite',
              partida: { ...partida, semente: newSeed(), ladoLocal: 'A', sala: null },
            });
          })
        : botao('Jogar de novo', 'botao botao--principal', () => {
            ctx.ir({
              nome: 'cobranca',
              partida: { ...partida, semente: newSeed() },
            });
          });

    tela.append(
      el('div', { classe: 'grupo empurra' }, [
        seguir,
        botao('Voltar ao início', 'botao', () => ctx.ir({ nome: 'inicio' })),
      ]),
    );

    raiz.append(tela);
    focar(seguir);
    return () => undefined;
  };
