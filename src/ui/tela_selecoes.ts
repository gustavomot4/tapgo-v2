/**
 * M7 — tela de seleções.
 *
 * Segundo e último toque do fluxo crítico: as seleções já vêm marcadas pela preferência, então
 * quem repete a partida de ontem só toca em "Começar".
 *
 * ## Os 4 estados
 * - **carregando** — o pacote da cena Phaser é pedido aqui (`aquecerCena`) e chega enquanto a
 *   pessoa escolhe. Não bloqueia esta tela: ela continua utilizável, e é por isso que o aviso é
 *   uma linha e não um giro no meio do conteúdo.
 * - **vazio** — catálogo de M4 sem seleção nenhuma.
 * - **erro** — a seleção marcada saiu do catálogo entre abrir a tela e tocar em "Começar".
 *   Acontece de verdade quando `A-04` trocar a lista de fixação pela lista real com preferência
 *   antiga gravada; sem este ramo, `createSession` recusaria a configuração e a tela quebraria.
 * - **sucesso** — as duas seleções marcadas e o botão de começar ativo.
 */

import type { CountryCode, Side } from '../core/index';
import { newSeed } from '../core/index';
import type { Level } from '../session/index';
import type { ModoJogavel } from './derivacao';
import { findTeam, listTeams } from '../data/teams';
import { botao, el, focar, limpar } from './dom';
import { marcaSelecao, nomeSelecao } from './rotulos';
import { selecaoInicial } from './preferencias';
import type { Contexto, Tela } from './rotas';
import { LADO_DO_HUMANO } from './rotas';

/** O disco com o código ISO da seleção. Vira bandeira em `A-04`, sem mexer em quem o chama. */
export function marca(code: CountryCode, grande = false): HTMLElement {
  const m = marcaSelecao(code);
  return el('span', {
    classe: grande ? 'marca marca--grande' : 'marca',
    texto: m.texto,
    estilo: { '--matiz': String(m.matiz) },
    // O nome já está escrito ao lado em todo lugar onde a marca aparece, então para o leitor de
    // tela ela é decoração. Repetir "BR, Brasil" a cada cartão é ruído, não acessibilidade.
    attrs: { 'aria-hidden': 'true' },
  });
}

function grade(
  lado: Side,
  rotulo: string,
  escolhido: CountryCode,
  aoEscolher: (code: CountryCode) => void,
): HTMLFieldSetElement {
  const campo = el('fieldset', { classe: 'grupo' });
  campo.append(el('legend', { classe: 'legenda', texto: rotulo }));

  const g = el('div', { classe: 'selecoes' });
  for (const time of listTeams()) {
    const entrada = el('input', {
      attrs: { type: 'radio', name: `tapgo-selecao-${lado}`, value: time.code },
    });
    entrada.checked = time.code === escolhido;
    entrada.addEventListener('change', () => {
      if (entrada.checked) aoEscolher(time.code);
    });

    g.append(
      el('label', { classe: 'cartao' }, [
        entrada,
        marca(time.code),
        el('span', { classe: 'cartao__nome', texto: time.name }),
      ]),
    );
  }

  campo.append(g);
  return campo;
}

export const telaSelecoes =
  (modo: ModoJogavel, nivel: Level | null): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    ctx.aquecerCena();

    const tela = el('section', { classe: 'tela' });
    raiz.append(tela);

    const escolha = selecaoInicial(ctx.prefs());

    if (escolha === null) {
      // ── Estado VAZIO ────────────────────────────────────────────────────────────────────
      tela.append(
        el('h1', { classe: 'titulo', texto: 'Seleções' }),
        el('div', { classe: 'aviso' }, [
          el('p', { texto: 'Ainda não há seleções para escolher.' }),
        ]),
        botao('Voltar', 'botao empurra', () => ctx.ir({ nome: 'inicio' })),
      );
      return () => undefined;
    }

    const times: Record<Side, CountryCode> = { A: escolha.A, B: escolha.B };
    const avisoRepetida = el('p', { classe: 'faixa', dados: { tom: 'atencao' } });
    const avisoErro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });

    function atualizarAvisos(): void {
      const repetida = times.A === times.B;
      avisoRepetida.textContent = repetida
        ? 'As duas seleções são a mesma — dá para jogar assim.'
        : '';
      avisoRepetida.hidden = !repetida;
    }

    function comecar(): void {
      // ── Estado de ERRO ──────────────────────────────────────────────────────────────────
      const sumiram = (['A', 'B'] as const).filter((l) => findTeam(times[l]) === undefined);
      if (sumiram.length > 0) {
        limpar(avisoErro);
        avisoErro.hidden = false;
        avisoErro.append(
          el('p', { texto: 'Não foi possível começar: uma das seleções saiu da lista.' }),
          el('p', { classe: 'sub', texto: 'Escolha as duas de novo e toque em Começar.' }),
        );
        focar(avisoErro);
        return;
      }

      ctx.salvarPrefs({ ...ctx.prefs(), selecao: { A: times.A, B: times.B } });
      ctx.ir({
        nome: 'cobranca',
        partida: {
          modo,
          nivel,
          times: { A: times.A, B: times.B },
          ladoLocal: LADO_DO_HUMANO,
          // Semente nova a cada disputa: mesma semente daria a mesma CPU toda partida. A
          // reprodutibilidade que os testes exigem é por semente FIXADA, não por semente única.
          semente: newSeed(),
        },
      });
    }

    // Em `local` os rótulos dizem ONDE cada seleção aparece, não em que ordem ela cobra: com o
    // sorteio de `D-48` a ordem só existe depois que a disputa é criada, e esta tela é anterior a
    // ela. "Quem cobra primeiro" aqui seria uma promessa que a tela seguinte desmentiria em
    // metade das partidas (`QA-15`). Esquerda e direita são as posições do placar da cobrança.
    const rotuloA = modo === 'cpu' ? 'Sua seleção' : 'Seleção da esquerda';
    const rotuloB = modo === 'cpu' ? 'Adversário (computador)' : 'Seleção da direita';

    const iniciar = botao('Começar', 'botao botao--principal', comecar);

    avisoErro.hidden = true;

    tela.append(
      el('h1', { classe: 'titulo', texto: 'Seleções' }),
      el('p', {
        classe: 'sub',
        texto:
          modo === 'cpu'
            ? 'Um sorteio decide quem começa. Você e o computador se revezam a cada cobrança.'
            : 'Os dois jogam neste aparelho, revezando o toque. Um sorteio decide quem começa.',
      }),
      grade('A', rotuloA, times.A, (code) => {
        times.A = code;
        atualizarAvisos();
      }),
      grade('B', rotuloB, times.B, (code) => {
        times.B = code;
        atualizarAvisos();
      }),
      avisoRepetida,
      avisoErro,
      el('div', { classe: 'grupo empurra' }, [
        iniciar,
        botao('Voltar', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })),
      ]),
    );

    atualizarAvisos();
    focar(iniciar);
    return () => undefined;
  };

/** Reexportado para a tela de fim, que mostra o nome sem repetir a busca no catálogo. */
export { nomeSelecao };
