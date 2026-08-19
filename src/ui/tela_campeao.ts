/**
 * M7 — o campeão: a última tela do torneio.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * Alcançada de dois jeitos, e os dois passam por `champion()` de M8: o jogador venceu a final,
 * ou foi eliminado antes dela — **o jogador eliminado não encerra o torneio** (`D-57`), M8
 * simula o que falta e o campeão existe do mesmo jeito. Por isso a tela não pergunta como se
 * chegou até aqui: ela mostra quem levantou a taça.
 *
 * ## O que esta tela NÃO diz
 * Em que fase a seleção do jogador caiu. A porta de M8 entrega o campeão e a tabela do grupo, e
 * a fase da eliminação não está em nenhuma das duas — derivá-la aqui seria a tela recontando o
 * chaveamento por fora, com uma segunda versão da verdade para manter. Lacuna declarada
 * (`rotulos.ts` → `desfechoDoJogador`), não esquecida.
 *
 * ## Os 4 estados
 * - **carregando** — não há: o torneio está na memória.
 * - **vazio** — não há torneio em andamento (entrada direta na rota).
 * - **erro** — há torneio, e ele não tem campeão nem próxima disputa. M8 não produz isso; se
 *   produzir, a saída é descartar e voltar ao menu, nunca uma tela travada.
 * - **sucesso** — o campeão, grande.
 */

import { botao, el, focar } from './dom';
import { NOME_TORNEIO, desfechoDoJogador, nomeSelecao } from './rotulos';
import { marca } from './tela_selecoes';
import type { Contexto, Tela } from './rotas';

export const telaCampeao: Tela = (raiz: HTMLElement, ctx: Contexto) => {
  const tela = el('section', { classe: 'tela' });
  raiz.append(tela);

  const emCurso = ctx.torneio();
  const campeao = emCurso?.torneio.champion() ?? null;

  /** Ao sair daqui o torneio acabou: o registro salvo vai junto, senão ele reabre encerrado. */
  const encerrar = (destino: 'inicio' | 'torneio_novo'): void => {
    ctx.definirTorneio(null);
    ctx.ir({ nome: destino });
  };

  if (emCurso === null || campeao === null) {
    // ── Estados VAZIO e de ERRO, na mesma caixa: para quem joga, a saída é a mesma ────────
    tela.append(
      el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
      el('div', { classe: 'aviso' }, [
        el('p', { texto: 'Não há torneio encerrado para mostrar.' }),
        el('p', { classe: 'sub', texto: 'Comece um novo para disputar as 64 partidas.' }),
      ]),
      el('div', { classe: 'grupo empurra' }, [
        botao('Começar um torneio', 'botao botao--principal', () => encerrar('torneio_novo')),
        botao('Voltar ao início', 'botao botao--discreto', () => encerrar('inicio')),
      ]),
    );
    return () => undefined;
  }

  /*
   * O pódio é o mesmo da tela de fim de disputa (`D-65`): a bandeira grande e o título embaixo.
   * A pessoa acabou de largar o aparelho na mesa, e o que ela quer saber de relance é quem
   * ganhou — aqui, mais ainda, porque as últimas disputas foram resolvidas sem ela.
   */
  const podio = el('div', { classe: 'resultado' }, [
    marca(campeao, true),
    el('h1', {
      classe: 'titulo resultado__titulo',
      texto: `${nomeSelecao(campeao)} é campeã`,
    }),
  ]);

  const novo = botao('Novo torneio', 'botao botao--principal', () => encerrar('torneio_novo'));

  tela.append(
    podio,
    el('p', { classe: 'sub', texto: `${NOME_TORNEIO} · 64 disputas, uma campeã.` }),
    el('p', {
      classe: 'faixa',
      dados: { tom: campeao === emCurso.humana ? 'bom' : 'neutro' },
      texto: desfechoDoJogador(campeao, emCurso.humana),
    }),
    el('div', { classe: 'grupo empurra' }, [
      novo,
      botao('Voltar ao início', 'botao botao--discreto', () => encerrar('inicio')),
    ]),
  );

  focar(novo);
  return () => undefined;
};
