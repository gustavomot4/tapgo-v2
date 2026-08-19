/**
 * M7 — tela de início.
 *
 * O fluxo crítico é "começar uma disputa", e ele fecha em **2 toques** com as preferências
 * salvas: um no modo, um em "Começar" na tela seguinte. Esse número é o portão de UX desta tela;
 * qualquer coisa que o aumente (uma confirmação a mais, um passo de nível obrigatório) precisa
 * pagar por si.
 *
 * Por isso o nível da CPU está **aqui**, já marcado pela preferência, e não numa terceira tela:
 * quem não liga para o nível não toca nele, e quem liga muda antes de escolher o modo.
 *
 * ## Os 4 estados
 * - **carregando** — não há: o catálogo de M4 resolve em build, sem rede.
 * - **vazio** — catálogo sem nenhuma seleção. Os dois modos ficam desligados, com o motivo dito.
 * - **erro** — não há erro possível aqui; o erro de configuração aparece na tela de seleções,
 *   que é onde a sessão é criada. Lacuna declarada, não esquecida.
 * - **sucesso** — os dois modos disponíveis.
 */

import type { Level } from '../session/index';
import { listTeams } from '../data/teams';
import { botao, el, focar } from './dom';
import { NOME_TORNEIO, nomeNivel } from './rotulos';
import type { Contexto, Tela } from './rotas';

const NIVEIS: readonly Level[] = ['easy', 'medium', 'hard'];

/**
 * A capa — o campo visto de cima, com o nome do jogo em cima dele (`D-65`).
 *
 * **É o `<h1>` de sempre, dentro de uma moldura.** O nome acessível da tela não muda: "TAP GO"
 * continua sendo o único cabeçalho de nível 1, e o "GO" só troca de cor porque está num `<span>`
 * — `<em>` daria ênfase que nenhum leitor de tela precisa ouvir num logotipo.
 *
 * **Nada aqui é arquivo.** Grama, grande área, círculo e o refletor que passa são degradê e
 * borda em `estilo.css`. É a mesma escolha da fatia 1 (`sprites.ts`): arte como dado, porque
 * ilustração é o que mais cresce bundle e o teto de `D-02` vale para o menu também.
 *
 * O brilho é `<span>` vazio e decorativo, então leva `aria-hidden` — e some sozinho para quem
 * pediu menos movimento, pela regra de `prefers-reduced-motion` que a folha já tem.
 */
function capa(): HTMLElement {
  return el('section', { classe: 'capa' }, [
    el('span', { classe: 'capa__brilho', attrs: { 'aria-hidden': 'true' } }),
    el('h1', { classe: 'titulo capa__marca' }, [
      'TAP ',
      el('span', { classe: 'capa__go', texto: 'GO' }),
    ]),
    el('p', {
      classe: 'sub',
      texto: 'Disputa de pênaltis · 5 cobranças e, se empatar, alternadas.',
    }),
  ]);
}

/** Radios de verdade, num `fieldset` com legenda: é o que o leitor de tela anuncia como grupo. */
function grupoDeNivel(nivelAtual: Level, aoMudar: (n: Level) => void): HTMLFieldSetElement {
  const campo = el('fieldset', { classe: 'grupo' });
  campo.append(el('legend', { classe: 'legenda', texto: 'Nível do computador' }));

  const linha = el('div', { classe: 'segmentos' });
  for (const nivel of NIVEIS) {
    const entrada = el('input', {
      attrs: { type: 'radio', name: 'tapgo-nivel', value: nivel },
    });
    entrada.checked = nivel === nivelAtual;
    entrada.addEventListener('change', () => {
      if (entrada.checked) aoMudar(nivel);
    });

    linha.append(el('label', { classe: 'segmento' }, [entrada, nomeNivel(nivel)]));
  }

  campo.append(linha);
  return campo;
}

function interruptorDeSom(ligado: boolean, aoMudar: (v: boolean) => void): HTMLLabelElement {
  const entrada = el('input', { attrs: { type: 'checkbox' } });
  entrada.checked = ligado;

  // O texto é um nó próprio, trocado no lugar. Redesenhar a tela inteira para acertar o rótulo
  // jogaria o foco de volta ao primeiro botão — quem navega por teclado perderia o lugar a cada
  // vez que ligasse o som.
  const texto = document.createTextNode('');
  const escrever = (v: boolean): void => {
    texto.textContent = v ? 'Som ligado' : 'Som desligado';
  };
  escrever(ligado);

  entrada.addEventListener('change', () => {
    escrever(entrada.checked);
    aoMudar(entrada.checked);
  });

  // O `<input>` está DENTRO do `<label>`: rótulo e controle ficam ligados sem depender de um
  // `id` único, que numa tela remontada a cada rota é justamente o que colide.
  return el('label', { classe: 'segmento' }, [entrada, texto]);
}

export const telaInicio: Tela = (raiz: HTMLElement, ctx: Contexto) => {
  const catalogo = listTeams();
  const semSelecoes = catalogo.length === 0;

  let nivel = ctx.prefs().nivel;

  const tela = el('section', { classe: 'tela' });
  tela.append(capa());

  if (semSelecoes) {
    // ── Estado VAZIO ──────────────────────────────────────────────────────────────────────
    tela.append(
      el('div', { classe: 'aviso' }, [
        el('p', { texto: 'Ainda não há seleções para jogar.' }),
        el('p', {
          classe: 'sub',
          texto: 'O catálogo do jogo está vazio, então não é possível começar uma disputa.',
        }),
      ]),
    );
    raiz.append(tela);
    return () => undefined;
  }

  tela.append(grupoDeNivel(nivel, (n) => {
    nivel = n;
    ctx.salvarPrefs({ ...ctx.prefs(), nivel: n });
  }));

  const contraCpu = botao(
    'Contra o computador',
    'botao botao--principal',
    () => ctx.ir({ nome: 'selecoes', modo: 'cpu', nivel }),
  );

  const doisNoAparelho = botao(
    'Dois no mesmo aparelho',
    'botao',
    () => ctx.ir({ nome: 'selecoes', modo: 'local', nivel: null }),
  );

  /*
   * O torneio (`T-14`). O rótulo muda com o que existe no aparelho: havendo torneio salvo, o
   * botão CONTINUA o que está em andamento — começar um novo por engano apagaria o outro, e a
   * tela não pode oferecer isso com o mesmo texto que oferece continuar.
   */
  const temTorneio = ctx.torneio() !== null;
  const torneio = botao(
    temTorneio ? `Continuar a ${NOME_TORNEIO}` : NOME_TORNEIO,
    'botao',
    () => ctx.ir({ nome: temTorneio ? 'torneio' : 'torneio_novo' }),
  );

  const modos = el('div', { classe: 'grupo' }, [
    el('p', { classe: 'legenda', texto: 'Como jogar' }),
    contraCpu,
    doisNoAparelho,
    torneio,
  ]);

  const rodape = el('div', { classe: 'grupo empurra' }, [
    interruptorDeSom(ctx.som.ligado(), (v) => {
      ctx.som.definirLigado(v);
      ctx.salvarPrefs({ ...ctx.prefs(), som: v });
      // Confirmação audível de que ligar o som funcionou — e nenhum som ao desligar, que seria
      // a piada mais previsível do projeto. Também destrava a reprodução no iOS, que exige um
      // gesto antes do primeiro áudio: aqui o gesto acabou de acontecer.
      if (v) ctx.som.tocar('chute');
    }),
    el('p', {
      classe: 'lacuna',
      texto:
        'As bandeiras ainda não entraram: cada seleção aparece pelo código de duas letras do país.',
    }),
  ]);

  tela.append(modos, rodape);
  raiz.append(tela);

  focar(contraCpu);
  return () => undefined;
};
