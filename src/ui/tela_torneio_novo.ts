/**
 * M7 — começar um torneio: qual seleção é a sua.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)" e
 * "M8 — Torneio". A porta de M8 pede as 32, **qual delas é a do jogador**, o nível e a semente:
 * as 32 são o catálogo de M4 inteiro, o nível é a preferência do aparelho (escolhida na tela de
 * início, sem passo a mais aqui) e a semente é nova. Sobra uma pergunta, e esta tela faz só ela.
 *
 * ## Um toque, e ele é o mesmo da tela de seleções
 * A grade é a de `tela_selecoes.ts`, exportada de lá. Quem já escolheu seleção para uma disputa
 * avulsa reconhece o cartão, e o torneio não estreia um segundo jeito de escolher a mesma coisa.
 *
 * ## Os 4 estados
 * - **carregando** — não há: o catálogo de M4 resolve em build, sem rede.
 * - **vazio** — catálogo sem seleção nenhuma. O botão desliga, com o motivo dito.
 * - **erro** — M8 recusou a configuração (o catálogo não tem as 32 que `D-51` exige, ou a
 *   seleção marcada saiu dele). Frase em português, com o que fazer, e uma saída.
 * - **sucesso** — o torneio criado, e a tela dele.
 */

import type { CountryCode } from '../core/index';
import { newSeed } from '../core/index';
import { createTournament } from '../tournament/index';
import { listTeams } from '../data/teams';
import { botao, el, focar, limpar } from './dom';
import { selecaoInicial } from './preferencias';
import { NOME_TORNEIO } from './rotulos';
import { grade } from './tela_selecoes';
import type { Contexto, Tela } from './rotas';

export const telaTorneioNovo: Tela = (raiz: HTMLElement, ctx: Contexto) => {
  const tela = el('section', { classe: 'tela' });
  raiz.append(tela);

  tela.append(
    el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
    el('p', {
      classe: 'sub',
      texto:
        '32 seleções, 8 grupos de 4 e mata-mata. Você joga as disputas da sua seleção; as outras ' +
        'o jogo resolve sozinho.',
    }),
  );

  const catalogo = listTeams();
  const inicial = selecaoInicial(ctx.prefs());

  if (inicial === null || catalogo.length === 0) {
    // ── Estado VAZIO ──────────────────────────────────────────────────────────────────────
    tela.append(
      el('div', { classe: 'aviso' }, [
        el('p', { texto: 'Ainda não há seleções para disputar o torneio.' }),
        el('p', { classe: 'sub', texto: 'O catálogo do jogo está vazio.' }),
      ]),
      botao('Voltar', 'botao empurra', () => ctx.ir({ nome: 'inicio' })),
    );
    return () => undefined;
  }

  let minha: CountryCode = inicial.A;

  const erro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });
  erro.hidden = true;

  function comecar(): void {
    try {
      // O nível é lido UMA vez, aqui, e viaja com o torneio: trocá-lo na tela de início no meio
      // da competição não muda o que já começou (`D-60`).
      const nivel = ctx.prefs().nivel;
      const torneio = createTournament({
        entrants: catalogo.map((t) => t.code),
        human: minha,
        // O nível é UM valor do começo ao fim (`D-60`): o torneio inteiro roda no que está
        // marcado na tela de início, e nenhuma fase o sobe.
        level: nivel,
        // Semente nova a cada torneio: a mesma daria o mesmo chaveamento e o mesmo campeão
        // toda vez. A reprodutibilidade que os testes de M8 exigem é por semente FIXADA.
        seed: newSeed(),
      });
      ctx.definirTorneio({ torneio, humana: minha, nivel });
      ctx.ir({ nome: 'torneio' });
    } catch {
      // ── Estado de ERRO ────────────────────────────────────────────────────────────────
      // M8 recusa configuração que não fecha (32 seleções, todas no catálogo, a sua entre elas).
      // Nada técnico chega à tela: o motivo interessa ao dono, não a quem quer jogar.
      limpar(erro);
      erro.hidden = false;
      erro.append(
        el('p', { texto: 'Não foi possível começar o torneio.' }),
        el('p', { classe: 'sub', texto: 'Escolha outra seleção, ou volte e jogue uma disputa avulsa.' }),
      );
      focar(erro);
    }
  }

  const iniciar = botao('Começar o torneio', 'botao botao--principal', comecar);

  tela.append(
    grade('A', 'Sua seleção', minha, (code) => {
      minha = code;
    }),
    erro,
    el('div', { classe: 'grupo empurra' }, [
      iniciar,
      botao('Voltar', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })),
    ]),
  );

  focar(iniciar);
  return () => undefined;
};
