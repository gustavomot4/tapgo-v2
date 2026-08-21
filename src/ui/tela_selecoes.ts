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
 * - **sucesso** — as seleções marcadas e o botão de começar ativo.
 *
 * ## No `online`, esta tela escolhe UM lado (`D-90` / `T-31`)
 * Até aqui ela escolhia os dois, inclusive no `online` — o anfitrião montava o confronto inteiro
 * e o convidado recebia pronto (`D-77` levava as duas seleções no link). O dono recusou isso: o
 * convidado não escolhia nada. Com o `Pick` no fio, cada aparelho declara o seu, e a tela reflete
 * a mesma fronteira — **uma** grade, a do lado deste aparelho, e o outro lado como espera.
 *
 * É também por isso que o CONVIDADO passa por aqui: o link deixa de levar direto à espera da
 * conexão. O fluxo dele vai de 1 para 2 toques (escolher e entrar), e é o preço declarado de ele
 * poder escolher — a alternativa era continuar jogando com a seleção que o outro marcou.
 */

import type { CountryCode, Side } from '../core/index';
import { newSeed } from '../core/index';
import type { Level } from '../session/index';
import type { ModoJogavel } from './derivacao';
import { findTeam, listTeams } from '../data/teams';
import { botao, el, focar, limpar } from './dom';
import { marcaSelecao, nomeSelecao } from './rotulos';
import { selecaoInicial } from './preferencias';
import type { Contexto, ConviteRecebido, Tela } from './rotas';
import { LADO_DO_HUMANO, SERIE_ZERO } from './rotas';

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
export function marca(code: CountryCode | null, grande = false): HTMLElement {
  // ── `D-90`/`T-31`: o outro aparelho ainda não anunciou ──────────────────────────────────
  // Disco vazio, sem matiz e sem bandeira. Ele NÃO é o ramo de erro do arquivo que não carrega
  // (esse mostra o código ISO, que é dado verdadeiro): aqui não existe dado nenhum a mostrar,
  // e qualquer marca desenhada seria uma seleção inventada — o defeito de `A-22` de novo.
  if (code === null) {
    const vazio = el('span', {
      classe: grande ? 'marca marca--vazia marca--grande' : 'marca marca--vazia',
      attrs: { 'aria-hidden': 'true' },
    });
    vazio.textContent = '…';
    return vazio;
  }

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
function confronto(times: Readonly<Record<Side, CountryCode | null>>): {
  node: HTMLElement;
  atualizar: () => void;
} {
  const ladoA = el('span', { classe: 'confronto__lado' });
  const ladoB = el('span', { classe: 'confronto__lado' });

  function pintar(alvo: HTMLElement, code: CountryCode | null): void {
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
  (modo: ModoJogavel, nivel: Level | null, convite: ConviteRecebido | null = null): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    ctx.aquecerCena();

    const online = modo === 'online';
    /**
     * O lado DESTE aparelho — e, no `online`, o único que esta tela escolhe (`D-90`).
     *
     * `'B'` quando o jogo abriu por um link: quem convida é o `A` e quem entra é o `B`
     * (`main.ts`, na abertura). Fora do `online` os dois lados são deste aparelho e o valor é o
     * de sempre, `LADO_DO_HUMANO`.
     */
    const ladoLocal: Side = convite === null ? LADO_DO_HUMANO : 'B';
    const ladoRemoto: Side = ladoLocal === 'A' ? 'B' : 'A';

    // `tela--largo` é a declaração de largura de desktop desta tela (`D-86`): acima de 1024px a
    // folha vai a 1040px e `.tela` vira grade de duas colunas. Esta é a tela que mais pedia isso
    // — são 64 cartões, e em 420px eles eram uma rolagem só (`P-7`).
    const tela = el('section', { classe: 'tela tela--largo' });
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

    /**
     * As duas seleções que vão para a sessão. No `online`, o lado do peer é `null` (`D-90`).
     *
     * `null` aqui não é "ainda vou preencher": é o estado de espera que vai VIAJAR para
     * `SessionConfig.teams`, e é ele que faz a tela seguinte mostrar "escolhendo…" em vez de
     * inventar a seleção do outro. A do peer nasce no aparelho dele e chega pelo `Pick`.
     */
    const times: Record<Side, CountryCode | null> = { A: escolha.A, B: escolha.B };
    if (online) times[ladoRemoto] = null;

    /**
     * O que estava marcado ao abrir a tela — a preferência, ou as duas primeiras do catálogo.
     *
     * Existe porque `comecar()` grava a preferência dos DOIS lados e, no `online`, esta tela só
     * escolheu um: o outro tem de voltar ao arquivo como estava, e não como `null`. (É também a
     * cópia que o TypeScript pede: dentro do ouvinte, `escolha` volta a ser `null` possível.)
     */
    const padrao: Record<Side, CountryCode> = { A: escolha.A, B: escolha.B };

    /**
     * O que a tela MOSTRA no confronto — que não é o que a sessão recebe, e a diferença é `D-90`.
     *
     * Para o convidado, o lado do anfitrião aqui é o código que veio em `t=`: rótulo de quem
     * chamou, para ele não escolher às cegas. Ele fica **fora** de `times` de propósito — link
     * velho ou adulterado não pode virar a seleção com que a sessão nasce, e a verdade sobre o
     * outro aparelho é o `Pick`, não o endereço. Para o anfitrião não há nada a mostrar ainda:
     * quem ele convidou nem abriu o link.
     */
    const exibir: Record<Side, CountryCode | null> = { A: times.A, B: times.B };
    if (online) exibir[ladoRemoto] = convite === null ? null : convite.anfitriao;

    const avisoRepetida = el('p', { classe: 'faixa', dados: { tom: 'atencao' } });
    const avisoErro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });
    const duelo = confronto(exibir);

    function atualizarAvisos(): void {
      exibir[ladoLocal] = times[ladoLocal];
      duelo.atualizar();
      // Só faz sentido com os dois lados escolhidos NESTE aparelho: no `online` o outro lado é
      // espera, e "as duas são a mesma" seria comparar uma escolha com uma ausência.
      const repetida = !online && times.A === times.B;
      avisoRepetida.textContent = repetida
        ? 'As duas seleções são a mesma — dá para jogar assim.'
        : '';
      avisoRepetida.hidden = !repetida;
    }

    function comecar(): void {
      // ── Estado de ERRO ──────────────────────────────────────────────────────────────────
      // `null` NÃO entra na conta: no `online` ele é a espera do `Pick`, e M5 o aceita no lado
      // do peer. O que este ramo pega é a seleção marcada que saiu do catálogo entre abrir a
      // tela e tocar no botão — sem ele, `createSession` recusaria a configuração.
      const sumiram = (['A', 'B'] as const).filter((l) => {
        const code = times[l];
        return code !== null && findTeam(code) === undefined;
      });
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

      // O lado que esta tela não escolheu guarda a preferência anterior: no `online` só um dos
      // dois muda, e gravar `null` apagaria a seleção com que a próxima partida de CPU abriria.
      ctx.salvarPrefs({
        ...ctx.prefs(),
        selecao: { A: times.A ?? padrao.A, B: times.B ?? padrao.B },
      });
      const partida = {
        modo,
        nivel,
        times: { A: times.A, B: times.B },
        ladoLocal,
        // Semente nova a cada disputa: mesma semente daria a mesma CPU toda partida. A
        // reprodutibilidade que os testes exigem é por semente FIXADA, não por semente única.
        semente: newSeed(),
        // Disputa avulsa: nada a devolver a M8. A do torneio nasce em `tela_torneio.ts`.
        torneio: false,
        // A sala é sorteada na tela de convite, e só no `online` (`D-73`). Sorteá-la aqui
        // adiantaria o ID para os dois modos que não têm sala — e, no online, sem nenhum ganho:
        // o que importa é que ela nasça antes do canal, não antes desta tela.
        //
        // A exceção é o CONVIDADO: a sala dele veio no link, e é a única que serve. Sortear
        // outra aqui o mandaria para uma sala vazia com o nome certo na tela.
        sala: convite === null ? null : convite.sala,
        // Série zerada: escolher seleção nesta tela COMEÇA uma série (`T-32`). É o que faz
        // "trocar de seleção" recomeçar a conta sem uma linha a mais em lugar nenhum.
        serie: SERIE_ZERO,
      };

      // No `online` a próxima tela é o convite, e é ela que decide QUANDO a sessão nasce
      // (`D-75`). Mandar direto para a cobrança abriria o canal — e armaria o relógio de 20 s —
      // antes de o outro aparelho existir.
      ctx.ir(
        online
          ? { nome: 'convite', partida, anfitriao: convite === null ? null : convite.anfitriao }
          : { nome: 'cobranca', partida },
      );
    }

    // Em `local` os rótulos dizem ONDE cada seleção aparece, não em que ordem ela cobra: com o
    // sorteio de `D-48` a ordem só existe depois que a disputa é criada, e esta tela é anterior a
    // ela. "Quem cobra primeiro" aqui seria uma promessa que a tela seguinte desmentiria em
    // metade das partidas (`QA-15`). Esquerda e direita são as posições do placar da cobrança.
    // Os dois rótulos abaixo são só de `cpu` e `local`: no `online` a grade é uma, e o rótulo
    // dela é escrito no lugar em que ela nasce.
    const rotuloA = modo === 'local' ? 'Seleção da esquerda' : 'Sua seleção';
    const rotuloB = modo === 'local' ? 'Seleção da direita' : 'Adversário (computador)';

    // O convidado ainda tem a tela de convite pela frente ("Entrar na disputa"), então o botão
    // daqui não pode prometer que a disputa começa agora.
    const iniciar = botao(
      convite === null ? 'Começar' : 'Continuar',
      'botao botao--principal',
      comecar,
    );

    // As duas grades são o par de `D-86`: no desktop elas ficam lado a lado, e o confronto acima
    // cai em cima delas — a metade esquerda do confronto sobre a grade da esquerda. A classe
    // `par` fica AQUI e não dentro de `grade()` porque a tela de torneio novo usa a mesma função
    // com UMA grade só, e uma grade sozinha numa das colunas deixaria a outra vazia.
    //
    // **No `online` há UMA grade, e é a mudança que `D-90` pediu à tela** (`T-31`): este
    // aparelho escolhe a própria seleção e mais nada. A do outro nasce no aparelho dele. As duas
    // grades de antes eram o anfitrião escolhendo PELO convidado — o que o dono recusou.
    const grades: HTMLFieldSetElement[] = online
      ? [
          grade(ladoLocal, 'Sua seleção', escolha[ladoLocal], (code) => {
            times[ladoLocal] = code;
            atualizarAvisos();
          }),
        ]
      : [
          grade('A', rotuloA, escolha.A, (code) => {
            times.A = code;
            atualizarAvisos();
          }),
          grade('B', rotuloB, escolha.B, (code) => {
            times.B = code;
            atualizarAvisos();
          }),
        ];
    // `par` só no par: uma grade sozinha numa das colunas de `D-86` deixaria a outra vazia, que
    // é o mesmo motivo pelo qual a classe nunca morou dentro de `grade()`.
    if (grades.length === 2) for (const g of grades) g.classList.add('par');

    avisoErro.hidden = true;

    tela.append(
      el('h1', { classe: 'titulo', texto: online ? 'Sua seleção' : 'Seleções' }),
      el('p', {
        classe: 'sub',
        texto:
          modo === 'cpu'
            ? 'Um sorteio decide quem começa. Você e o computador se revezam a cada cobrança.'
            : modo === 'local'
              ? 'Os dois jogam neste aparelho, revezando o toque. Um sorteio decide quem começa.'
              : convite === null
                ? 'Escolha a SUA seleção e mande o convite na tela seguinte. Quem entrar escolhe a dele.'
                : exibir[ladoRemoto] === null
                  ? 'Escolha a SUA seleção para entrar na disputa. Quem convidou escolhe a dele no aparelho dele.'
                  : `Escolha a SUA seleção para entrar na disputa. Quem convidou joga com ${nomeSelecao(exibir[ladoRemoto])}.`,
      }),
      duelo.node,
      ...grades,
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
