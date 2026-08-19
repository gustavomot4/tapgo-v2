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

/**
 * A marca da seleção: a bandeira em `<img>`, ou o disco com o código ISO quando não há arquivo.
 *
 * **Quem decide é `ehBandeira`, e é esse o conserto de `QA-19`:** `marcaSelecao().texto` carrega
 * dois formatos, e tratar os dois como texto punha o caminho do SVG dentro do disco de 34px assim
 * que `T-19` entregou os arquivos. O campo existia para esta decisão desde `T-10` e ninguém o lia.
 *
 * **Continua decoração nos dois ramos.** O `aria-hidden="true"` fica no disco e a imagem leva
 * `alt=""`: o nome da seleção está escrito ao lado em todo lugar onde a marca aparece, e trocar
 * texto por imagem não pode transformar decoração em conteúdo anunciado duas vezes.
 */
export function marca(code: CountryCode, grande = false): HTMLElement {
  const m = marcaSelecao(code);

  const classes = ['marca'];
  if (grande) classes.push('marca--grande');
  if (m.ehBandeira) classes.push('marca--bandeira');

  const disco = el('span', {
    classe: classes.join(' '),
    estilo: { '--matiz': String(m.matiz) },
    attrs: { 'aria-hidden': 'true' },
  });

  if (!m.ehBandeira) {
    disco.textContent = m.texto;
    return disco;
  }

  const bandeira = el('img', {
    classe: 'marca__img',
    // `src` é o caminho que o build resolveu (`D-62`), nunca URL: hotlink quebra o jogo offline.
    // `lazy` porque a tela de seleções monta 64 destas de uma vez, 32 por lado, em 360x640.
    attrs: { src: m.texto, alt: '', decoding: 'async', loading: 'lazy' },
  });

  // Estado de ERRO deste pedaço de tela, e ele não tem outro: arquivo que não carrega volta a ser
  // o código ISO, e não o ícone de imagem quebrada do navegador. 64 quadrados partidos na grade
  // seriam a tela gritando defeito onde o dado existe — e o código é informação verdadeira.
  bandeira.addEventListener('error', () => {
    bandeira.remove();
    disco.classList.remove('marca--bandeira');
    disco.textContent = code;
  });

  disco.append(bandeira);
  return disco;
}

/**
 * O confronto: as duas seleções escolhidas, grandes, no topo da tela (`D-65`).
 *
 * **Não custa toque nenhum** — e isso é portão, não detalhe. O fluxo crítico fecha em 2 toques
 * (`tela_inicio.ts`), então uma peça de menu só entra se ESPELHAR uma escolha que já existe. Ela
 * lê as mesmas seleções marcadas nas grades abaixo e se repinta quando elas mudam.
 *
 * **Só dado que o jogo tem:** bandeira e nome. A referência do dono mostra estrela, nota e valor
 * de elenco porque tem base licenciada; aqui isso seria número inventado — e `D-60` deixa a
 * dificuldade constante, então nem "nível da seleção" existe para mostrar (regra 5).
 *
 * `aria-hidden` na caixa inteira: cada nome daqui já está escrito no rádio marcado da grade, e o
 * leitor de tela anunciar as duas seleções duas vezes é ruído, não acessibilidade.
 */
function confronto(times: Readonly<Record<Side, CountryCode>>): {
  node: HTMLElement;
  atualizar: () => void;
} {
  const ladoA = el('span', { classe: 'confronto__lado' });
  const ladoB = el('span', { classe: 'confronto__lado' });

  function pintar(alvo: HTMLElement, code: CountryCode): void {
    limpar(alvo);
    alvo.append(marca(code), el('span', { classe: 'confronto__nome', texto: nomeSelecao(code) }));
  }

  const node = el('div', { classe: 'confronto', attrs: { 'aria-hidden': 'true' } }, [
    ladoA,
    el('span', { classe: 'confronto__vs', texto: '×' }),
    ladoB,
  ]);

  return {
    node,
    atualizar: () => {
      pintar(ladoA, times.A);
      pintar(ladoB, times.B);
    },
  };
}

/**
 * Uma grade de escolha de seleção: 32 rádios com marca e nome.
 *
 * Exportada para a tela de torneio novo (`T-14`), que escolhe UMA seleção com a mesma grade —
 * dois desenhos de cartão para a mesma escolha seriam duas coisas para manter e uma para o
 * dono estranhar. O `name` do rádio sai de `lado`, e por isso duas grades na mesma tela não
 * disputam a marcação.
 */
export function grade(
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
    const duelo = confronto(times);

    function atualizarAvisos(): void {
      duelo.atualizar();
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
          // Disputa avulsa: nada a devolver a M8. A do torneio nasce em `tela_torneio.ts`.
          torneio: false,
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
      duelo.node,
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
