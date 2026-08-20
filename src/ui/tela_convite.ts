/**
 * M7 — tela de convite do modo `online` (`T-21`). É a tela que faltava para `D-72`.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * ## O que esta tela controla, e por que é ela quem controla
 * **Quando a sessão nasce.** No `online`, criar a sessão É abrir o canal — e abrir o canal arma
 * o relógio de 20 s de M6 (`CONNECT_TIMEOUT_MS`, em `createChannel`). `D-75` decidiu que esse
 * prazo cobre o aperto de mão e nunca a espera humana: os 20 s começam a contar depois do toque
 * que declara o outro lado a postos, e não enquanto a pessoa procura o amigo no mensageiro.
 *
 * É por isso que o ID da sala é sorteado aqui, com `newRoomId` (`D-73`), **antes** de existir
 * canal: o link pode ser mostrado, copiado e colado sem que nada esteja contando. É o mesmo
 * fluxo que rodou em campo em `medicao.ts` e produziu os 17/17 de `A-08`, com mediana de 266 ms
 * de aperto de mão — 75x de folga dentro dos 20 s.
 *
 * **Os dois portões de `D-75`, escritos como código:**
 * 1. `criarSessao()` é o ouvinte do botão "conectar"/"Entrar" e o corpo de `tentarDeNovo()` —
 *    nunca é chamada na montagem da tela. Procure por `criarSessao` neste arquivo: todo caminho
 *    até ela começa num toque.
 * 2. Retentar depois de `'failed'` é sessão NOVA no MESMO `roomId`, e só enquanto o canal nunca
 *    chegou a `'connected'` — a guarda é `conectou`. Depois de conectar, quem cai é peer que
 *    saiu, e aí vale `D-35` (a disputa termina sem resultado); retentar ali seria o peer
 *    fantasma de `D-41`, que é o viés que reprovou a saída (c) de `QA-08`.
 *
 * ## Os 4 estados
 * - **carregando** — "procurando o outro aparelho", entre o toque e o `'connected'`. Tem saída:
 *   quem desiste toca em Cancelar, e o `dispose()` solta a sala em vez de deixá-la aberta.
 * - **vazio** — não há sala: o navegador não tem `crypto` (contexto inseguro, ou seja, endereço
 *   sem `https`) ou o link do convidado chegou truncado. Os dois viram frase com o que fazer.
 * - **erro** — `'failed'`: ninguém do outro lado, ou a conexão não atravessou. É a falha honesta
 *   que `D-47` deixou declarada (até ~1 em 6 pares), e ela aparece com o que fazer, nunca como
 *   tela parada.
 * - **sucesso** — `'connected'`: a tela sai para a cobrança levando a sessão viva.
 *
 * ## Fluxo crítico
 * **Anfitrião:** 1 toque (copiar não conta — é opcional). **Convidado:** 1 toque, e é o portão
 * de UX desta tela. O convidado abre o link, vê de quem é o convite e toca em "Entrar".
 *
 * ## A sessão sai daqui viva
 * A tela de cobrança recebe a sessão já conectada pela rota (`rotas.ts`). Criar uma segunda
 * sessão lá abriria um segundo canal na mesma sala — dois peers deste aparelho conversando com
 * o mesmo convidado. Por isso `entregue` existe: com ela ligada, o desmonte NÃO dá `dispose()`.
 */

import { createSession } from '../session/index';
import type { LinkStatus, Session, SessionConfig } from '../session/index';
import { newRoomId } from '../session/index';
import { botao, el, focar, limpar } from './dom';
import { linkDaSala, salaLegivel, timesDoEndereco } from './convite';
import { ehDoCatalogo } from './rotulos';
import { nomeSelecao } from './rotulos';
import { marca } from './tela_selecoes';
import type { Contexto, Partida, Tela } from './rotas';

/** O endereço desta página, sem parâmetro nenhum — a base do link do convite. */
function enderecoAtual(): string {
  return window.location.href;
}

export const telaConvite =
  (partida: Partida): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    const anfitriao = partida.ladoLocal === 'A';
    // `D-77`: o convidado só vê o confronto do anfitrião se o link o trouxe. Quem lê o endereço é
    // `main.ts`, na abertura — aqui basta saber se o que está em `partida.times` veio de lá.
    const temTimesDoLink = !anfitriao && timesDoEndereco(enderecoAtual(), ehDoCatalogo) !== null;

    const tela = el('section', { classe: 'tela' });
    raiz.append(tela);

    /**
     * O ID da sala. O anfitrião sorteia aqui; o convidado recebe do link.
     *
     * O sorteio é a única coisa desta montagem que pode falhar, e falha alto de propósito
     * (`newRoomId` lança sem `crypto`): ID de sala previsível foi o defeito 6 da v1, e cair para
     * um gerador fraco em silêncio seria trocar "sem online" por "online inseguro".
     */
    let sala: string | null = partida.sala;
    let semCrypto = false;
    if (sala === null && anfitriao) {
      try {
        sala = newRoomId();
      } catch {
        semCrypto = true;
      }
    }

    // ── Estado VAZIO: não há sala para convidar nem para entrar ───────────────────────────
    if (sala === null) {
      tela.append(
        el('h1', { classe: 'titulo', texto: 'Jogar com um amigo' }),
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', {
            texto: semCrypto
              ? 'Este endereço não permite jogar online com segurança.'
              : 'Este convite não está completo.',
          }),
          el('p', {
            classe: 'sub',
            texto: semCrypto
              ? 'Abra o jogo por um endereço que comece com https e tente de novo.'
              : 'Peça o link de novo a quem te convidou — o que chegou está faltando um pedaço.',
          }),
        ]),
        botao('Voltar ao início', 'botao botao--principal empurra', () =>
          ctx.ir({ nome: 'inicio' }),
        ),
      );
      focar(tela.querySelector<HTMLButtonElement>('button'));
      return () => undefined;
    }

    const daSala: string = sala;
    // As seleções vão no link (`D-77`): é o que faz o convidado ver o MESMO confronto. Só o
    // anfitrião as manda — o link do convidado nunca é montado para ninguém.
    const link = linkDaSala(enderecoAtual(), daSala, partida.times);
    const config: SessionConfig = {
      mode: 'online',
      seed: partida.semente,
      teams: partida.times,
      localSide: partida.ladoLocal,
      // **Sempre** `roomId`, nos dois aparelhos (`D-73`). O ramo sem `roomId` de M5 sortearia um
      // ID lá dentro que ninguém consegue ler de volta — sala aberta e inconvidável.
      roomId: daSala,
    };

    let sessao: Session | null = null;
    let cancelarAssinatura: (() => void) | null = null;
    let entregue = false;
    let vivo = true;
    /** Portão 2 de `D-75`: uma vez `true`, nunca mais há retentativa nesta sala. */
    let conectou = false;

    // ── Esqueleto ─────────────────────────────────────────────────────────────────────────
    const explicacao = el('p', { classe: 'sub' });

    const codigo = el('p', { classe: 'codigo', texto: salaLegivel(daSala) });
    const enderecoDoConvite = el('p', { classe: 'codigo codigo--link', texto: link });

    const aviso = el('p', {
      classe: 'faixa',
      attrs: { role: 'status', 'aria-live': 'polite' },
      dados: { tom: 'neutro' },
    });
    aviso.hidden = true;

    const carregando = el('p', {
      classe: 'carregando',
      attrs: { role: 'status', 'aria-live': 'polite' },
      texto: 'Procurando o outro aparelho…',
    });
    carregando.hidden = true;

    const erro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });
    erro.hidden = true;

    const acoes = el('div', { classe: 'grupo empurra' });

    // ── Copiar: opcional, e com saída quando o navegador recusa ───────────────────────────
    // `navigator.clipboard` não existe fora de contexto seguro e pode ser negado pela pessoa. Os
    // dois casos caem no mesmo lugar: o link continua escrito na tela, inteiro e selecionável.
    function copiar(): void {
      const escrever = navigator.clipboard?.writeText(link);
      if (escrever === undefined) {
        anunciar('Copie o link acima com o dedo — este navegador não deixa copiar sozinho.', 'atencao');
        return;
      }
      escrever.then(
        () => anunciar('Link copiado. Mande para quem vai jogar com você.', 'bom'),
        () => anunciar('Não deu para copiar. Selecione o link acima e copie com o dedo.', 'atencao'),
      );
    }

    function anunciar(texto: string, tom: 'neutro' | 'bom' | 'atencao'): void {
      if (!vivo) return;
      aviso.textContent = texto;
      aviso.dataset['tom'] = tom;
      aviso.hidden = false;
    }

    // ── A sessão: nasce no toque, e só nele (portão 1 de `D-75`) ──────────────────────────

    function encerrarSessao(): void {
      cancelarAssinatura?.();
      cancelarAssinatura = null;
      sessao?.dispose();
      sessao = null;
    }

    function criarSessao(): void {
      erro.hidden = true;
      aviso.hidden = true;
      mostrarEspera(true);

      try {
        const nova = createSession(config);
        sessao = nova;
        // A assinatura vem ANTES de qualquer espera: o `'connected'` pode chegar no mesmo tique
        // em que o canal abre, e um assinante que chega depois perderia a única notificação que
        // importa aqui. `state()` não ajudaria — quem muda é o `link`, não o `MatchState`.
        cancelarAssinatura = nova.subscribe((_estado, status: LinkStatus) => {
          aoStatus(nova, status);
        });
      } catch {
        // M5 recusa configuração inválida, e M6 recusa ID malformado — os dois lançam na hora
        // (`D-25`). Nada técnico na tela: o que a pessoa precisa saber é que este convite não
        // serve e que dá para pedir outro. `encerrarSessao()` porque o lançamento pode ter vindo
        // depois de a sessão existir — e sessão sem tela é canal aberto que ninguém fecha.
        encerrarSessao();
        mostrarEspera(false);
        mostrarErro(
          'Não foi possível abrir a sala.',
          'Volte ao início e comece um convite novo.',
          false,
        );
      }
    }

    function aoStatus(dona: Session, status: LinkStatus): void {
      // Notificação de sessão velha (a que foi cancelada, ou a que falhou antes da retentativa)
      // não manda em tela nenhuma: sem esta guarda, um `'failed'` atrasado apagaria a espera da
      // sessão nova que acabou de nascer.
      if (!vivo || dona !== sessao) return;

      if (status === 'connected') {
        conectou = true;
        // ── Estado de SUCESSO: a sessão sai daqui viva ────────────────────────────────────
        entregue = true;
        ctx.ir({ nome: 'cobranca', partida: { ...partida, sala: daSala }, sessao: dona });
        return;
      }

      if (status === 'failed') {
        // ── Estado de ERRO ───────────────────────────────────────────────────────────────
        // M6 já soltou a sala: `'failed'` é terminal (`D-31`). A sessão morre junto, e a
        // retentativa nasce inteira — mesma sala, canal novo.
        encerrarSessao();
        mostrarEspera(false);
        mostrarErro(
          anfitriao
            ? 'Não foi possível conectar com o outro aparelho.'
            : 'Não foi possível entrar na disputa.',
          anfitriao
            ? 'Confira se a outra pessoa abriu o link e toque em Tentar de novo.'
            : 'Peça para quem convidou ficar na tela do convite e toque em Tentar de novo.',
          !conectou,
        );
      }
    }

    function tentarDeNovo(): void {
      // Portão 2 de `D-75`, literal: sessão nova no MESMO `roomId` **enquanto o canal nunca
      // chegou a `'connected'`. Uma vez conectado, cair é o peer saindo — `D-35` manda terminar
      // sem resultado, e reentrar na sala usada é o peer fantasma que `D-41` rejeitou.
      if (conectou) {
        ctx.ir({ nome: 'inicio' });
        return;
      }
      criarSessao();
    }

    function cancelarEspera(): void {
      encerrarSessao();
      mostrarEspera(false);
      anunciar('Espera cancelada. Toque de novo quando o outro aparelho estiver pronto.', 'neutro');
      focar(pronto);
    }

    // ── Desenho ───────────────────────────────────────────────────────────────────────────

    function mostrarErro(titulo: string, oQueFazer: string, comRetentativa: boolean): void {
      limpar(erro);
      erro.hidden = false;
      erro.append(el('p', { texto: titulo }), el('p', { classe: 'sub', texto: oQueFazer }));

      limpar(acoes);
      if (comRetentativa) acoes.append(botao('Tentar de novo', 'botao botao--principal', tentarDeNovo));
      acoes.append(botao('Voltar ao início', 'botao', () => ctx.ir({ nome: 'inicio' })));
      focar(acoes.querySelector<HTMLButtonElement>('button'));
    }

    function mostrarEspera(esperando: boolean): void {
      carregando.hidden = !esperando;
      pronto.disabled = esperando;

      limpar(acoes);
      if (esperando) {
        acoes.append(botao('Cancelar', 'botao botao--discreto', cancelarEspera));
        focar(acoes.querySelector<HTMLButtonElement>('button'));
        return;
      }
      acoes.append(pronto, botao('Voltar ao início', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })));
    }

    const pronto = botao(
      anfitriao ? 'Já mandei o link — conectar' : 'Entrar na disputa',
      'botao botao--principal',
      criarSessao,
    );

    // ── Montagem ──────────────────────────────────────────────────────────────────────────

    tela.append(
      el('h1', {
        classe: 'titulo',
        texto: anfitriao ? 'Convide quem vai jogar' : 'Você foi convidado',
      }),
      explicacao,
    );

    if (anfitriao) {
      explicacao.textContent =
        'Mande este link para a outra pessoa. Quando ela abrir, toque no botão abaixo — a espera ' +
        'pela conexão dura 20 segundos, então só toque com o outro aparelho já na mão.';
      tela.append(
        el('div', { classe: 'grupo' }, [
          el('p', { classe: 'legenda', texto: 'Link do convite' }),
          enderecoDoConvite,
          botao('Copiar link', 'botao', copiar),
          el('p', { classe: 'legenda', texto: 'Código da sala' }),
          codigo,
        ]),
      );
    } else {
      explicacao.textContent =
        'Toque em Entrar para começar a disputa. Quem convidou precisa estar na tela do convite ' +
        'neste momento.';
      tela.append(
        el('div', { classe: 'grupo' }, [
          el('p', { classe: 'legenda', texto: 'Código da sala' }),
          codigo,
        ]),
      );
    }

    // As seleções deste aparelho, mostradas para que ninguém ache que elas viajaram pelo link.
    // Elas não viajam: o canal de M6 carrega `Move` e nada mais (`D-13`), então cada aparelho
    // mostra as suas. É lacuna declarada, e a frase abaixo é onde ela é declarada à pessoa.
    tela.append(
      el('div', { classe: 'confronto', attrs: { 'aria-hidden': 'true' } }, [
        el('span', { classe: 'confronto__lado' }, [
          marca(partida.times.A),
          el('span', { classe: 'confronto__nome', texto: nomeSelecao(partida.times.A) }),
        ]),
        el('span', { classe: 'confronto__vs', texto: '×' }),
        el('span', { classe: 'confronto__lado' }, [
          marca(partida.times.B),
          el('span', { classe: 'confronto__nome', texto: nomeSelecao(partida.times.B) }),
        ]),
      ]),
      // A ordem das cobranças NÃO é prometida aqui. Quem a anuncia é a tela da cobrança, lendo
      // `state().turn` de M5 — é o portão de `QA-15`, e ele vale para esta tela também: no dia
      // em que o sorteio do `online` for semeado pelo `roomId`, uma promessa escrita aqui viraria
      // mentira sem que ninguém tocasse neste arquivo.
      //
      // A frase sobre as seleções mudou em `D-77`: elas viajam no link, então o confronto acima é
      // o mesmo nos dois aparelhos. O ramo do convidado só existe para o link antigo, sem `t=` —
      // aí ele cai nas seleções do próprio aparelho, e a tela diz isso em vez de fingir.
      el('p', {
        classe: 'lacuna',
        texto: anfitriao
          ? 'O link leva estas duas seleções — o outro aparelho vai ver o mesmo confronto. Quem cobra é anunciado quando a disputa começa.'
          : temTimesDoLink
            ? 'Este é o confronto que quem convidou montou. Quem cobra é anunciado quando a disputa começa.'
            : 'O convite não trouxe as seleções, então estas são as deste aparelho — o outro pode estar vendo outras.',
      }),
      aviso,
      carregando,
      erro,
      acoes,
    );

    mostrarEspera(false);
    focar(pronto);

    return () => {
      vivo = false;
      cancelarAssinatura?.();
      cancelarAssinatura = null;
      // A sessão entregue à cobrança é dela agora — dar `dispose()` aqui fecharia o canal que a
      // disputa acabou de receber, e a partida morreria antes da 1ª cobrança.
      if (!entregue) sessao?.dispose();
      sessao = null;
    };
  };
